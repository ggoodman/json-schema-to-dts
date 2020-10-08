import { JSONSchema7 } from 'json-schema';
import { WriterFunction } from 'ts-morph';

export interface IAssertion {
  readonly consumesProperties: ReadonlySet<keyof JSONSchema7>;
  readonly name: string;
  readonly docsWriter?: WriterFunction;
  readonly typeWriter?: WriterFunction;
}
