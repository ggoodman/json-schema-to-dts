import { JSONSchema7 } from 'json-schema';
import { WriterFunction, Writers } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { ITypeCreator } from '../ITypeCreator';
import { BaseAssertion } from './BaseAssertion';

export class SchemaAssertion extends BaseAssertion {
  private readonly assertions: ReadonlyArray<IAssertion>;
  private readonly schema: JSONSchema7;

  constructor(schema: JSONSchema7, assertions: ReadonlyArray<IAssertion>) {
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

    super(SchemaAssertion.name, [...consumedProperties], {
      docsWriter: schema.description
        ? (writer) => writer.writeLine(schema.description!)
        : undefined,
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
    this.schema = schema;
  }

  provideTypes(typeCreator: ITypeCreator) {
    const name = typeCreator.generateDeconflictedName(
      this.schema.title || this.schema.$id?.replace(/\/^.*([^#\/]+[^/]*$)/, '$1') || 'Schema'
    );
    typeCreator.sourceFile.addTypeAlias({
      name,
      type: this.typeWriter!,
    });
  }
}
