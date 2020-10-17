import { Parser } from './';

describe('Definition generation', () => {
  it('will annotate nested object properties with doc comments', () => {
    const parser = new Parser();
    parser.addSchema('file:///test.json', {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of an object',
        },
        not_annotated: {
          type: 'null',
        },
        command: {
          oneOf: [
            {
              const: 'a constant!',
            },
            {
              enum: ['multiple', { options: 'are allowed' }],
            },
          ],
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
          command?: (\\"a constant!\\" | (\\"multiple\\" | {
              \\"options\\": \\"are allowed\\";
          }));
      };
      "
    `);
  });
});
