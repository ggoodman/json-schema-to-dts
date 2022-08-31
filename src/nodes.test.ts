import { SchemaNode, SchemaNodeOptions } from './nodes';
import type { CoreSchemaMetaSchema } from './schema';

describe('SchemaNode', () => {
  it('will only emit a `@see` directive when requested', () => {
    const schema: CoreSchemaMetaSchema = {
      type: 'boolean',
      $id: 'file://path',
    };

    const node = new SchemaNode('file://path', 'file://path', schema, schema as SchemaNodeOptions);

    expect(node.provideDocs({ emitSeeDirective: false })).toMatchInlineSnapshot(`undefined`);
    expect(node.provideDocs({ emitSeeDirective: true })).toMatchInlineSnapshot(`
      Object {
        "description": "",
        "tags": Array [
          Object {
            "tagName": "see",
            "text": "file://path",
          },
        ],
      }
    `);
  });
});
