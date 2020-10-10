import { JSONSchema7 } from 'json-schema';
import { IAssertion } from './IAssertion';
import { IDiagnostic } from './IDiagnostic';
import { Immutable } from './typeUtils';

export interface ProvideAssertionForSchemaOptions {
  name?: string;
  // uri?: string;
  shouldDeclare?: boolean;
  shouldExport?: boolean;
}

export interface IAssertionProviderContext {
  readonly assertionsByName: Map<string, IAssertion>;
  readonly diagnostics: ReadonlyArray<IDiagnostic>;
  readonly schemaByUri: ReadonlyMap<string, JSONSchema7>;
  readonly uri: string;
  readonly baseUri: string;

  addDiagnostic(diagnostic: IDiagnostic): void;

  declareReference(ref: string): { name: string; uri: string } | undefined;

  generateDeconflictedName(schema: JSONSchema7, options?: { uri?: string }): string;

  provideAssertionForSchema(
    schema: Immutable<JSONSchema7>,
    options?: ProvideAssertionForSchemaOptions
  ): IAssertion | undefined;

  registerSchema(uri: string, schema: JSONSchema7): void;

  resolveReference(ref: string): string;
}
