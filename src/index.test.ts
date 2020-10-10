import * as Fs from 'fs';
import { JSONSchema7Definition } from 'json-schema';
import * as Path from 'path';
import { URL } from 'url';
import { CompilationResult, compile, DiagnosticSeverity } from '.';
import { IDiagnostic } from './IDiagnostic';

describe('json-schema test suite', () => {
  const baseRemoteUrl = new URL('http://localhost:1234/');
  const testCasesPackageDir = Path.dirname(require.resolve('json-schema-test-suite/package.json'));
  const testCasesDir = Path.join(testCasesPackageDir, 'tests/draft7');
  const testCasesEntries = Fs.readdirSync(testCasesDir, { withFileTypes: true });
  const suite = testCasesEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const contents = Fs.readFileSync(Path.join(testCasesDir, entry.name), 'utf-8');
      const cases = JSON.parse(contents) as Array<{
        description: string;
        schema: JSONSchema7Definition;
        tests: Array<{ description: string; data: unknown; valid: boolean }>;
      }>;

      return {
        name: Path.basename(entry.name),
        cases,
        uri: new URL(entry.name, baseRemoteUrl).href,
      };
    });
  const draft07Schema = JSON.parse(
    Fs.readFileSync(Path.join(__dirname, '../spec/json-schema-draft-07.json'), 'utf-8')
  ) as JSONSchema7Definition;
  const remoteDir = Path.join(testCasesPackageDir, 'remotes');
  const remoteSchemas: Array<{ schema: JSONSchema7Definition; uri: string }> = [
    {
      schema: draft07Schema,
      uri: 'http://json-schema.org/draft-07/schema',
    },
  ];

  const addRemotesAtPath = (relPath: string) => {
    const entries = Fs.readdirSync(Path.join(remoteDir, relPath), { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        addRemotesAtPath(Path.join(relPath, entry.name));
        continue;
      }

      if (entry.isFile()) {
        const relPathName = Path.join(relPath, entry.name);
        const content = Fs.readFileSync(Path.join(remoteDir, relPathName), 'utf-8');
        const schema = JSON.parse(content) as JSONSchema7Definition;

        remoteSchemas.push({ schema, uri: new URL(relPathName, baseRemoteUrl).href });
      }
    }
  };

  addRemotesAtPath('');

  for (const { name, cases, uri } of suite) {
    describe(name, () => {
      for (const { description, schema, tests } of cases) {
        let result: CompilationResult = { diagnostics: [], typeDefinitions: '' };
        let errorDiagnostics: IDiagnostic[] = [];

        describe(description, () => {
          beforeAll(() => {
            result = compile([...remoteSchemas, { schema, uri }], { generateCodecs: true });
            errorDiagnostics = result.diagnostics.filter(
              (d) => d.severity === DiagnosticSeverity.Error
            );

            expect(typeof result.typeDefinitions).toBe('string');
            expect(result.typeDefinitions.length).toBeGreaterThan(0);
            expect(errorDiagnostics).toHaveLength(0);
          });

          for (const { description, data, valid } of tests) {
            it.todo(description);
          }
        });
      }
    });
  }
});
