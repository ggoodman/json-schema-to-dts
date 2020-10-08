import { JSONSchema7 } from 'json-schema';
import { Immutable } from '../typeUtils';
import { IAssertion } from './IAssertion';
import { IDiagnostic } from './IDiagnostic';

export interface IAssertionProviderContext {
  readonly diagnostics: ReadonlyArray<IDiagnostic>;
  readonly schemas: ReadonlyMap<string, JSONSchema7>;
  readonly uri: string;

  addDiagnostic(diagnostic: IDiagnostic): void;

  provideAssertionForRef(ref: string): IAssertion | undefined;

  provideAssertionForSchema(schema: Immutable<JSONSchema7>, uri?: string): IAssertion;
}
