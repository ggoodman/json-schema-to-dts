import { JSONSchema7 } from 'json-schema';
import { WriterFunction } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { Immutable } from '../typeUtils';
import { BaseAssertion } from './BaseAssertion';

interface ArrayTypeAssertionOptions {
  constraints: Immutable<Pick<JSONSchema7, 'maxItems' | 'minItems' | 'uniqueItems'>>;
  itemsAssertion?: IAssertion;
  enumItemsAssertions?: IAssertion[];
  additionalItemsAssertion?: IAssertion | undefined;
}

const anyWriter: WriterFunction = (writer) => writer.write('any');

export class ArrayTypeAssertion extends BaseAssertion {
  constructor(options: ArrayTypeAssertionOptions) {
    super(ArrayTypeAssertion.name, ['maxItems', 'minItems', 'type', 'uniqueItems'], {
      typeWriter: (writer) => {
        if (options.enumItemsAssertions?.length) {
          writer.write('[');
          for (const enumItem of options.enumItemsAssertions) {
            // writer.write('(');
            (enumItem.typeWriter || anyWriter)(writer);
            writer.write(',');
            // writer.write(')');
          }

          if (options.additionalItemsAssertion) {
            writer.write('...');
            (options.additionalItemsAssertion.typeWriter || anyWriter)(writer);
            writer.write('[]');
          }
          writer.write(']');
        } else {
          writer.write('Array<');
          (options.itemsAssertion?.typeWriter || anyWriter)(writer);
          writer.write('>');
        }
      },
    });
  }
}
