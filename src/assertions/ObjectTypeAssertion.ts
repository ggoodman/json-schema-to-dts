import { TypeElementMemberedNodeStructure, Writers } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

interface ObjectTypeAssertionOptions {
  knownPropertyAssertions?: { [propertyName: string]: IAssertion };
  additionalPropertyAssertion?: IAssertion;
  allowAdditionalProperties?: boolean;
  patternPropertyAssertions?: { [pattern: string]: IAssertion };
  requiredProperties: string[];
}

export class ObjectTypeAssertion extends BaseAssertion {
  constructor(options: ObjectTypeAssertionOptions) {
    const structure: Required<TypeElementMemberedNodeStructure> = {
      callSignatures: [],
      constructSignatures: [],
      indexSignatures: [],
      methods: [],
      properties: [],
    };

    if (options.additionalPropertyAssertion) {
      structure.indexSignatures.push({
        keyName: 'additionalProperties',
        keyType: 'string',
        returnType: options.additionalPropertyAssertion.typeWriter,
      });
    }

    if (options.knownPropertyAssertions) {
      for (const propertyName in options.knownPropertyAssertions) {
        const assertion = options.knownPropertyAssertions[propertyName];

        structure.properties.push({
          name: propertyName,
          type: assertion.typeWriter || ((writer) => writer.write('any')),
          hasQuestionToken: options.requiredProperties.includes(propertyName),
        });
      }
    }

    if (options.patternPropertyAssertions) {
      let i = 0;

      for (const propertyName in options.knownPropertyAssertions) {
        const assertion = options.knownPropertyAssertions[propertyName];

        structure.indexSignatures.push({
          keyName: `patternProperty${i++}`,
          keyType: 'string',
          docs: [`Pattern ${propertyName}`],
          returnType: assertion.typeWriter || ((writer) => writer.write('any')),
        });
      }
    }

    if (options.allowAdditionalProperties && !options.additionalPropertyAssertion) {
      structure.indexSignatures.push({
        keyName: 'additionalProperties',
        keyType: 'string',
        returnType: 'any',
      });
    }

    if (
      !options.allowAdditionalProperties &&
      !structure.indexSignatures.length &&
      !structure.properties.length
    ) {
      structure.indexSignatures.push({
        keyName: 'additionalProperties',
        keyType: 'string',
        returnType: 'never',
      });
    }

    super(
      ObjectTypeAssertion.name,
      ['additionalProperties', 'patternProperties', 'properties', 'required'],
      {
        typeWriter: Writers.objectType(structure),
      }
    );
  }

  // provideTypes(typeCreator: ITypeCreator): void {
  // }
}
