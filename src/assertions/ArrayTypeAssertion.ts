import { JSONSchema7 } from 'json-schema';
import { IAssertion } from '../IAssertion';
import { Immutable } from '../typeUtils';
import { BaseAssertion } from './BaseAssertion';

interface ArrayTypeAssertionOptions {
  constraints: Immutable<Pick<JSONSchema7, 'maxItems' | 'minItems' | 'uniqueItems'>>;
  itemsAssertion?: IAssertion;
}

export class ArrayTypeAssertion extends BaseAssertion {
  constructor(options: ArrayTypeAssertionOptions) {
    super(ArrayTypeAssertion.name, ['maxItems', 'minItems', 'type', 'uniqueItems'], {
      typeWriter: (writer) => {
        writer.write('Array<');
        if (options.itemsAssertion?.typeWriter) {
          options.itemsAssertion.typeWriter(writer);
        } else {
          writer.write('any');
        }
        writer.write('>');
      },
    });
  }
}
