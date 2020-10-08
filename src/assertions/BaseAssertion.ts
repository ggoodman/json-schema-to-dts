import { JSONSchema7 } from 'json-schema';
import { WriterFunction } from 'ts-morph';
import { IAssertion } from '../IAssertion';

interface BaseAssertionOptions {
  docsWriter?: WriterFunction;
  typeWriter?: WriterFunction;
}

export abstract class BaseAssertion implements IAssertion {
  readonly consumesProperties: ReadonlySet<keyof JSONSchema7>;
  readonly name: string;
  readonly docsWriter?: WriterFunction;
  readonly typeWriter?: WriterFunction;

  constructor(
    name: string,
    consumesProperties: Array<keyof JSONSchema7>,
    options: BaseAssertionOptions = {}
  ) {
    this.consumesProperties = new Set(consumesProperties);
    this.name = name;
    this.docsWriter = options.docsWriter;
    this.typeWriter = options.typeWriter;
  }
}
