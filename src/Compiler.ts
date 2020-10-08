import { JSONSchema7 } from 'json-schema';
import { IndentationText, Project } from 'ts-morph';
import { URL } from 'url';
import { AssertionProviderContext } from './AssertionProviderContext';
import { AllOfAssertionProvider } from './providers/AllOfAssertionProvider';
import { AnyOfAssertionProvider } from './providers/AnyOfAssertionProvider';
import { ConstAssertionProvider } from './providers/ConstAssertionProvider';
import { DescriptionAssertionProvider } from './providers/DescriptionAssertionProvider';
import { EnumAssertionProvider } from './providers/EnumAssertionProvider';
import { OneOfAssertionProvider } from './providers/OneOfAssertionProvider';
import { RefAssertionProvider } from './providers/RefAssertionProvider';
import { TypeAssertionProvider } from './providers/TypeAssertionProvider';

export enum ExportKind {
  Declaration = 'Declaration',
  Export = 'Export',
}

interface CompileOptions {
  exportKind?: ExportKind;
}

export class Compiler {
  private readonly schemaByUri = new Map<string, JSONSchema7>();
  private readonly schemaByName = new Map<string, JSONSchema7>();

  addSchema(schema: JSONSchema7, uri?: string) {
    if (uri) {
      schema.$id = uri;
    }

    if (!schema.$id) {
      throw new Error('Either the schema must have an $id or a uri must be provided, or both.');
    }

    const baseName =
      schema.title ||
      (schema.$id
        ? new URL(schema.$id).pathname
            .replace(/^(?:[^/]*\/)?([^/]+)$/, '$1')
            .replace(/\.[\w\.]*$/, '')
            .replace(/[^a-z]/, '') || 'Schema'
        : 'Schema');
    let name: string | undefined = undefined;

    if (!this.schemaByName.has(baseName)) {
      name = baseName;
    }

    if (!name) {
      let suffix = 0;

      while (true) {
        const candidate = `${baseName}${suffix}`;

        if (!this.schemaByName.has(candidate)) {
          name = candidate;
          break;
        }

        suffix++;
      }
    }

    this.schemaByUri.set(schema.$id, schema);
    this.schemaByName.set(name, schema);
  }

  compile(options: CompileOptions = {}) {
    const exportKind = options.exportKind || ExportKind.Export;
    const project = new Project({
      useInMemoryFileSystem: true,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
      },
    });
    const sourceFile = project.createSourceFile('schema.ts');
    const context = new AssertionProviderContext({
      assertionProviders: [
        new AllOfAssertionProvider(),
        new AnyOfAssertionProvider(),
        new ConstAssertionProvider(),
        new DescriptionAssertionProvider(),
        new EnumAssertionProvider(),
        new OneOfAssertionProvider(),
        new RefAssertionProvider(),
        new TypeAssertionProvider(),
      ],
      schemaByUri: this.schemaByUri,
      uri: '#',
    });
    const exportedNames = new Set<string>();

    for (const [uri, schema] of this.schemaByUri) {
      const name = context.generateDeconflictedName(schema, { uri });

      context.provideAssertionForSchema(schema, { uri });

      exportedNames.add(name);
    }

    for (const [name, assertion] of context.assertionsByName) {
      if (assertion.typeWriter) {
        sourceFile.addTypeAlias({
          name,
          type: assertion.typeWriter,
          isExported: exportKind === ExportKind.Export && exportedNames.has(name),
          hasDeclareKeyword: exportKind === ExportKind.Declaration && exportedNames.has(name),
          docs: assertion.docsWriter ? [{ description: assertion.docsWriter }] : undefined,
        });
      }
    }

    return {
      diagnostics: context.diagnostics,
      typeDefinitions: sourceFile.print(),
    };
  }
}
