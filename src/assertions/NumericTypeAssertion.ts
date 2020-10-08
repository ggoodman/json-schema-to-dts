import { JSONSchema7 } from 'json-schema';
import { Immutable } from '../typeUtils';
import { BaseAssertion } from './BaseAssertion';

export class NumericTypeAssertion extends BaseAssertion {
  constructor(
    name: string,
    private readonly constraints: Immutable<
      Pick<
        JSONSchema7,
        'exclusiveMaximum' | 'exclusiveMinimum' | 'maximum' | 'minimum' | 'multipleOf'
      >
    >
  ) {
    super(
      name,
      ['exclusiveMaximum', 'exclusiveMinimum', 'maximum', 'minimum', 'multipleOf', 'type'],
      {
        typeWriter: (codeBlockWriter) => codeBlockWriter.write('number'),
      }
    );
  }

  // provideTypes(typeCreator: ITypeCreator) {
  //   // typeCreator.
  // }
}
