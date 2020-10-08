import { JSONSchema7 } from 'json-schema';
import { IndentationText, Project } from 'ts-morph';
import { URL } from 'url';
import { AssertionProviderContext } from './AssertionProviderContext';
import { IAssertion } from './IAssertion';
import { AllOfAssertionProvider } from './providers/AllOfAssertionProvider';
import { AnyOfAssertionProvider } from './providers/AnyOfAssertionProvider';
import { DescriptionAssertionProvider } from './providers/DescriptionAssertionProvider';
import { EnumAssertionProvider } from './providers/EnumAssertionProvider';
import { OneOfAssertionProvider } from './providers/OneOfAssertionProvider';
import { RefAssertionProvider } from './providers/RefAssertionProvider';
import { TypeAssertionProvider } from './providers/TypeAssertionProvider';

interface SchemaMetadata {
  name?: string;
}

export class Compiler {
  private readonly schemas = new Map<string, JSONSchema7>();
  private readonly schemaMetadata = new Map<JSONSchema7, SchemaMetadata>();
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

    this.schemas.set(schema.$id, schema);
    this.schemaByName.set(name, schema);
    this.schemaMetadata.set(schema, { name });
  }

  getSchema(uri: string) {
    return this.schemas.get(uri);
  }

  getSchemaMetadata(ref: string | JSONSchema7) {
    if (typeof ref === 'string') {
      const schema = this.schemas.get(ref);

      if (!schema) {
        return;
      }

      ref = schema;
    }

    return this.schemaMetadata.get(ref);
  }

  compile() {
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
        new DescriptionAssertionProvider(),
        new EnumAssertionProvider(),
        new OneOfAssertionProvider(),
        new RefAssertionProvider(),
        new TypeAssertionProvider(),
      ],
      schemaByUri: this.schemas,
      uri: '#',
    });
    const assertionsByUri = new Map<string, IAssertion>();
    const usedNames = new Set();

    const generateDeconflictedName = (baseName: string) => {
      if (!usedNames.has(baseName)) {
        usedNames.add(baseName);
        return baseName;
      }

      let suffix = 0;

      while (true) {
        const name = `${baseName}${suffix}`;

        if (!usedNames.has(name)) {
          usedNames.add(name);
          return name;
        }

        suffix++;
      }
    };

    const exportedNames = new Set<string>();

    for (const [uri, schema] of this.schemas) {
      const name = context.generateDeconflictedName(schema, { uri });

      context.provideAssertionForSchema(schema, { uri });

      exportedNames.add(name);
    }

    for (const [name, assertion] of context.assertionsByName) {
      if (assertion.typeWriter) {
        sourceFile.addTypeAlias({
          name,
          type: assertion.typeWriter,
          isExported: exportedNames.has(name),
        });
      }
    }

    return {
      assertionsByUri,
      diagnostics: context.diagnostics,
      typeDefinitions: sourceFile.print(),
    };
  }
}
