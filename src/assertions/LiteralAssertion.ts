import { JSONSchema4Type } from 'json-schema';
import { BaseAssertion } from './BaseAssertion';

export class LiteralAssertion extends BaseAssertion {
  constructor(value: JSONSchema4Type) {
    super(LiteralAssertion.name, [], {
      typeWriter: (writer) => writer.write(JSON.stringify(value)),
    });
  }
}
