import { JSONSchema7 } from 'json-schema';
import { WriterFunction } from 'ts-morph';
import { IAssertion } from '../IAssertion';
import { ITypeCreator } from '../ITypeCreator';

interface BaseAssertionOptions {
  typeWriter?: WriterFunction;
}

export abstract class BaseAssertion implements IAssertion {
  readonly consumesProperties: ReadonlySet<keyof JSONSchema7>;
  readonly name: string;
  readonly typeWriter?: WriterFunction;

  constructor(
    name: string,
    consumesProperties: Array<keyof JSONSchema7>,
    options: BaseAssertionOptions = {}
  ) {
    this.consumesProperties = new Set(consumesProperties);
    this.name = name;
    this.typeWriter = options.typeWriter;
  }

  provideTypes(typeCreator: ITypeCreator): void {
    return;
  }
}
