import { DiagnosticSeverity } from '../DiagnosticSeverity';
import { IDiagnostic } from '../IDiagnostic';
import { BaseDiagnostic } from './BaseDiagnostic';

const diagnosticCode = 'EUNKNOWNPROPERTIES';

export class UnknownPropertiesDiagnostic extends BaseDiagnostic {
  readonly unknownProperties: ReadonlyArray<string>;

  constructor(uri: string, unknownProperties: Iterable<string>) {
    const unknownPropertiesArray = [...unknownProperties];

    super(
      diagnosticCode,
      `Unknown properties encountered at ${JSON.stringify(uri)}: ${unknownPropertiesArray
        .map((p) => JSON.stringify(p))
        .join(', ')}.`,
      DiagnosticSeverity.Warn,
      uri
    );

    this.unknownProperties = unknownPropertiesArray;
  }

  static is(diagnostic: IDiagnostic): diagnostic is UnknownPropertiesDiagnostic {
    return diagnostic.code === diagnosticCode;
  }
}
