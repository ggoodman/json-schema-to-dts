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

// class TypeCreator implements ITypeCreator {
//   private commentChunks: string[] = [];
//   private topLevelNames = new Set<string>();
//   readonly project = new Project({ useInMemoryFileSystem: true });
//   readonly sourceFile = this.project.createSourceFile('schema.ts');

//   appendDescription(description: string) {
//     this.commentChunks.push(description);
//   }

//   // forSchema(schema: JSONSchema7, cb: (childCreator: ITypeCreator) => void) {
//   //   const name = this.nameForSchema(schema);

//   //   return name;
//   // }

//   toString() {
//     const lines: string[] = [];

//     if (this.commentChunks.length) {
//       lines.push('/**');

//       this.commentChunks.forEach((chunk, i) => {
//         lines.push(...chunk.split('\n').map((line) => ` * ${line}`));

//         if (i !== this.commentChunks.length - 1) {
//           lines.push(' *');
//         }
//       });

//       lines.push(' */');
//     }

//     return lines.join('\n');
//   }

//   generateDeconflictedName(baseName: string): string {
//     if (!usedNames.has(baseName)) {
//       usedNames.add(baseName);
//       return baseName;
//     }

//     let suffix = 0;

//     while (true) {
//       const name = `${baseName}${suffix}`;

//       if (!usedNames.has(name)) {
//         usedNames.add(name);
//         return name;
//       }

//       suffix++;
//     }
//   }
// }

export class Compiler {
  private readonly schemas = new Map<string, JSONSchema7>();

  addSchema(schema: JSONSchema7, uri?: string) {
    if (uri) {
      schema.$id = uri;
    }

    if (!schema.$id) {
      throw new Error('Either the schema must have an $id or a uri must be provided, or both.');
    }

    this.schemas.set(schema.$id, schema);
  }

  getSchema(uri: string) {
    return this.schemas.get(uri);
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
      schemas: this.schemas,
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

    for (const [uri, schema] of this.schemas) {
      const assertion = context.provideAssertionForSchema(schema, uri);
      const name = generateDeconflictedName(
        schema.title ||
          (schema.$id
            ? new URL(schema.$id).pathname
                .replace(/^(?:[^/]*\/)?([^/]+)$/, '$1')
                .replace(/\.[\w\.]*$/, '')
                .replace(/[^a-z]/, '') || 'Schema'
            : 'Schema')
      );

      if (assertion.typeWriter) {
        sourceFile.addTypeAlias({
          name,
          type: assertion.typeWriter,
          isExported: true,
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
