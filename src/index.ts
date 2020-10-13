import { promises as Fs } from 'fs';
import * as Path from 'path';
import { Parser } from './parser';

async function main() {
  const schemaPath = Path.resolve(__dirname, '../spec/json-schema-draft-07.json');
  const schemaData = await Fs.readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaData);
  const parser = new Parser();

  parser.addSchema(`file://${schemaPath}`, schema);

  const { typeDefinitions } = parser.compile();

  await Fs.writeFile(Path.resolve(__dirname, './schema.ts'), typeDefinitions);
}

main().catch((err) => {
  console.trace(err);
  process.exit(1);
});
