import { DiagnosticSeverity } from '../DiagnosticSeverity';
import { IDiagnostic } from '../IDiagnostic';

export abstract class BaseDiagnostic implements IDiagnostic {
  constructor(
    readonly code: string,
    readonly message: string,
    readonly severity: DiagnosticSeverity,
    readonly uri: string
  ) {}
}
