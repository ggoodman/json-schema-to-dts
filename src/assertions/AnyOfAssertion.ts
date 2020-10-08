import { JSONSchema7 } from 'json-schema';
import { WriterFunction, Writers } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

export class AnyOfAssertion extends BaseAssertion {
  constructor(assertions: ReadonlyArray<IAssertion>) {
    const writers: WriterFunction[] = [];
    const consumedProperties = new Set<keyof JSONSchema7>();

    for (const assertion of assertions) {
      for (const property of assertion.consumesProperties) {
        consumedProperties.add(property);
      }

      if (assertion.typeWriter) {
        writers.push(assertion.typeWriter);
      }
    }

    super(AnyOfAssertion.name, [...consumedProperties], {
      typeWriter:
        writers.length > 1
          ? (writer) => {
              const options = Writers.unionType(...(writers as [WriterFunction, WriterFunction]));

              writer.write('(');
              options(writer);
              writer.write(')');
            }
          : writers[0],
    });
  }
}
