import { JSONSchema7Definition } from 'json-schema';
import { CompileOptions, Compiler } from './Compiler';
import { IDiagnostic } from './IDiagnostic';

export * from './DiagnosticSeverity';
export * from './IDiagnostic';

export interface CompilationResult {
  diagnostics: IDiagnostic[];
  typeDefinitions: string;
}

export function compile(
  schemas: Array<{ schema: JSONSchema7Definition; uri: string }>,
  options: CompileOptions
): CompilationResult {
  const compiler = new Compiler();

  for (const { schema, uri } of schemas) {
    compiler.addSchema(schema, uri);
  }

  return compiler.compile(options);
}
