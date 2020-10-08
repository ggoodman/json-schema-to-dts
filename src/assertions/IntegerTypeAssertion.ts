import { JSONSchema7 } from 'json-schema';
import { Immutable } from '../typeUtils';
import { NumericTypeAssertion } from './NumericTypeAssertion';

export class IntegerTypeAssertion extends NumericTypeAssertion {
  constructor(
    constraints: Immutable<
      Pick<
        JSONSchema7,
        'exclusiveMaximum' | 'exclusiveMinimum' | 'maximum' | 'minimum' | 'multipleOf'
      >
    >
  ) {
    super(IntegerTypeAssertion.name, constraints);
  }
}
