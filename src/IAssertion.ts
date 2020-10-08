import { JSONSchema7 } from 'json-schema';
import { WriterFunction } from 'ts-morph';
import { ITypeCreator } from './ITypeCreator';

export interface IAssertion {
  readonly consumesProperties: ReadonlySet<keyof JSONSchema7>;
  readonly name: string;
  readonly typeWriter?: WriterFunction;

  provideTypes(typeCreator: ITypeCreator): void;
}
