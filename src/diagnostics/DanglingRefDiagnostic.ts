import { DiagnosticSeverity } from '../DiagnosticSeverity';
import { IDiagnostic } from '../IDiagnostic';
import { BaseDiagnostic } from './BaseDiagnostic';

const diagnosticCode = 'EDANGLINGREF';

export class DanglingRefDiagnostic extends BaseDiagnostic {
  constructor(readonly uri: string, readonly ref: string) {
    super(
      diagnosticCode,
      `Unable to resolve the $ref ${JSON.stringify(ref)} from ${JSON.stringify(uri)}`,
      DiagnosticSeverity.Error,
      uri
    );
  }

  static is(diagnostic: IDiagnostic): diagnostic is DanglingRefDiagnostic {
    return diagnostic.code === diagnosticCode;
  }
}
