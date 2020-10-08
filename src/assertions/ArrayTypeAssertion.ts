import { JSONSchema7 } from 'json-schema';
import { Immutable } from '../typeUtils';
import { BaseAssertion } from './BaseAssertion';

export class ArrayTypeAssertion extends BaseAssertion {
  constructor(
    private readonly constraints: Immutable<
      Pick<JSONSchema7, 'maxItems' | 'minItems' | 'uniqueItems'>
    >
  ) {
    super(ArrayTypeAssertion.name, ['maxItems', 'minItems', 'type', 'uniqueItems'], {
      typeWriter: (writer) => {
        writer.write('[]');
      },
    });
  }
}
