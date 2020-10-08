import { JSONSchema7 } from 'json-schema';
import { Immutable } from '../typeUtils';
import { BaseAssertion } from './BaseAssertion';

export class StringTypeAssertion extends BaseAssertion {
  constructor(constraints: Immutable<Pick<JSONSchema7, 'maxLength' | 'minLength' | 'pattern'>>) {
    super(StringTypeAssertion.name, ['maxLength', 'minLength', 'pattern', 'type'], {
      typeWriter: (writer) => writer.write('string'),
    });
  }
}
