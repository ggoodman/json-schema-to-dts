import { JSONSchema7 } from 'json-schema';
import { WriterFunction, Writers } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

export class AllOfAssertion extends BaseAssertion {
  private readonly assertions: ReadonlyArray<IAssertion>;

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

    super(AllOfAssertion.name, [...consumedProperties], {
      typeWriter:
        writers.length > 1
          ? (writer) => {
              const intersection = Writers.intersectionType(
                ...(writers as [WriterFunction, WriterFunction])
              );

              writer.write('(');
              intersection(writer);
              writer.write(')');
            }
          : writers[0],
    });

    this.assertions = assertions;
  }
}
