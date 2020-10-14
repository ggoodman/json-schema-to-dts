export enum ParserDiagnosticKind {
  Warn = 'warn',
  Error = 'error',
}

export interface IParserDiagnostic {
  severity: ParserDiagnosticKind;
  code: string;
  message: string;
  uri: string;
  baseUri: string;
}
