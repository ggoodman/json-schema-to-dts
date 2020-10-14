import * as Fs from 'fs';
import { JSONSchema7Definition } from 'json-schema';
import * as Path from 'path';
import { URL } from 'url';
import * as Vm from 'vm';
import { ParserDiagnosticKind } from './diagnostics';
import { Parser } from './parser';

const baseRemoteUrl = new URL('http://localhost:1234/');
const testCasesPackageDir = Path.dirname(require.resolve('json-schema-test-suite/package.json'));
const testCasesDir = Path.join(testCasesPackageDir, 'tests/draft7');
const testCasesEntries = Fs.readdirSync(testCasesDir, { withFileTypes: true });
const suite = testCasesEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('uniqueItems.json'))
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

const matrix: [
  string,
  typeof suite[number]['cases'],
  string
][] = suite.map(({ name, cases, uri }) => [name, cases, uri]);

describe.each(matrix)('%s', (_name, cases, uri) => {
  const matrix: [
    string,
    JSONSchema7Definition,
    typeof suite[number]['cases'][number]['tests']
  ][] = cases.map(({ description, schema, tests }) => [description, schema, tests]);

  describe.each(matrix)('%s', (_name, schema, tests) => {
    const parser = new Parser();

    remoteSchemas.forEach(({ schema, uri }) => parser.addSchema(uri, schema));

    parser.addSchema(uri, schema);

    const result = parser.compile();
    const errorDiagnostics = result.diagnostics.filter(
      (d) => d.severity === ParserDiagnosticKind.Error
    );

    expect(errorDiagnostics).toHaveLength(0);

    const matrix: [string, unknown, boolean][] = tests.map(({ description, data, valid }) => [
      description,
      data,
      valid,
    ]);

    const mod = { exports: {} as any };

    Vm.runInContext(result.javaScript, Vm.createContext({ exports: mod.exports, mod }));

    const exportName = result.schemaRootNames.get(uri);

    expect(typeof exportName).toBe('string');

    const codec: Codec<unknown> = mod.exports[`${exportName}Codec`] as Codec<unknown>;
    const testData = (value: unknown) => {
      try {
        codec.assertValid(value);
        return true;
      } catch {
        return false;
      }
    };

    expect(codec).toBeTruthy();

    it.concurrent.each(matrix)('%s', async (_name, data, valid) => {
      const testResult = testData(data);

      expect(testResult).toBe(valid);
    });
  });
});
