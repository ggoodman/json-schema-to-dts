import { DiagnosticSeverity } from './DiagnosticSeverity';

export interface IDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: DiagnosticSeverity;
  readonly uri: string;
}
