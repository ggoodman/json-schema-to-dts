import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import { IndentationText, Project } from 'ts-morph';
import { URL } from 'url';
import { AssertionProviderContext } from './AssertionProviderContext';
import { AllOfAssertionProvider } from './providers/AllOfAssertionProvider';
import { AnyOfAssertionProvider } from './providers/AnyOfAssertionProvider';
import { ConstAssertionProvider } from './providers/ConstAssertionProvider';
import { DefinitionsAssertionProvider } from './providers/DefinitionsAssertionProvider';
import { EnumAssertionProvider } from './providers/EnumAssertionProvider';
import { IdAssertionProvider } from './providers/IdAssertionProvider';
import { OneOfAssertionProvider } from './providers/OneOfAssertionProvider';
import { RefAssertionProvider } from './providers/RefAssertionProvider';
import { TypeAssertionProvider } from './providers/TypeAssertionProvider';

export enum ExportKind {
  Declaration = 'Declaration',
  Export = 'Export',
}

export interface CompileOptions {
  exportKind?: ExportKind;
  generateCodecs?: boolean;
}

export class Compiler {
  private readonly schemaByUri = new Map<string, JSONSchema7>();
  private readonly schemaByName = new Map<string, JSONSchema7>();

  addSchema(schema: JSONSchema7Definition, uri?: string) {
    if (typeof schema === 'boolean') {
      schema = {};
    }

    if (!uri) {
      uri = schema.$id;
    }

    if (!uri) {
      throw new Error('Either the schema must have an $id or a uri must be provided, or both.');
    }

    const baseName =
      schema.title ||
      new URL(uri).pathname
        .replace(/^(?:[^/]*\/)?([^/]+)$/, '$1')
        .replace(/\.[\w\.]*$/, '')
        .replace(/[^a-z]/, '') ||
      'Schema';
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

    this.schemaByUri.set(uri, schema);
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
        new IdAssertionProvider(),
        new DefinitionsAssertionProvider(),
        new AllOfAssertionProvider(),
        new AnyOfAssertionProvider(),
        new ConstAssertionProvider(),
        new EnumAssertionProvider(),
        new OneOfAssertionProvider(),
        new TypeAssertionProvider(),
        new RefAssertionProvider(),
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

    while (context.queue.length) {
      const { schema, uri } = context.queue.shift()!;

      if (!context.seen.has(schema)) {
        context.provideAssertionForSchema(schema, { uri });
      }
    }

    for (const [name, assertion] of context.assertionsByName) {
      if (assertion.typeWriter) {
        sourceFile.addTypeAlias({
          name,
          docs: assertion.docsWriter && [{ description: assertion.docsWriter }],
          type: assertion.typeWriter,
          isExported: exportKind === ExportKind.Export && exportedNames.has(name),
          hasDeclareKeyword: exportKind === ExportKind.Declaration && exportedNames.has(name),
        });
      }

      // if (options.generateCodecs && exportKind === ExportKind.Export) {
      //   const ctx = sourceFile.addClass({
      //     name: 'EvaluationContext',
      //   });
      //   const isArray = sourceFile.addFunction({
      //     name: 'isArray',
      //     parameters: [
      //       { name: 'ctx', type: ctx.getName() },
      //       { name: 'arr', type: 'unknown' },
      //       { name: 'predicate', type: '(el: unknown) => el is T', hasQuestionToken: true },
      //     ],
      //     returnType: 'arr is T[]',
      //     typeParameters: [{ name: 'T', default: 'any' }],
      //     statements: (writer) =>
      //       writer.write('return Array.isArray(arr) && (!predicate || arr.every(predicate));'),
      //   });

      //   const codecNamespace = sourceFile.addNamespace({
      //     name: `${name}Codec`,
      //     isExported: true,
      //   });

      //   codecNamespace.addFunction({
      //     isExported: true,
      //     name: 'decode',
      //     parameters: [{ name: 'value', type: 'unknown' }],
      //     returnType: `value is ${name}`,
      //     statements: ['return false;'],
      //   });
      // }
    }

    return {
      diagnostics: context.diagnostics,
      typeDefinitions: sourceFile.print(),
    };
  }
}
