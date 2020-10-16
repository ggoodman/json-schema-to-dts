import { Parser } from './';

describe('Definition generation', () => {
  it('will annotate nested object properties with doc comments', () => {
    const parser = new Parser();
    parser.addSchema('file:///test.json', {
      type: 'object',
      properties: {
        //@ts-ignore
        name: {
          type: 'string',
          description: 'The name of an object',
        },
        //@ts-ignore
        not_annotated: {
          type: 'null',
        },
      },
    });

    const result = parser.compile();

    expect(result.text).toMatchInlineSnapshot(`
      "type JSONPrimitive = boolean | null | number | string;
      type JSONValue = JSONPrimitive | JSONValue[] | {
          [key: string]: JSONValue;
      };
      export type Test = {
          /** The name of an object */
          name?: string;
          not_annotated?: null;
      };
      "
    `);
  });
});
