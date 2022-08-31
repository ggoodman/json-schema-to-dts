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

  it('will optionally omit sub schemas', () => {
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
          'x-omit-types': true,
        },
        command: {
          oneOf: [
            {
              const: 'a constant!',
            },
            {
              enum: ['multiple', { options: 'are allowed' }],
              'x-omit-types': true,
            },
          ],
        },
      },
    });

    expect(parser.compile().text).toMatchInlineSnapshot(`
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

    expect(
      parser.compile({
        shouldOmitTypeEmit(node) {
          return typeof node.schema === 'object' && !!node.schema['x-omit-types'];
        },
      }).text
    ).toMatchInlineSnapshot(`
      "type JSONPrimitive = boolean | null | number | string;
      type JSONValue = JSONPrimitive | JSONValue[] | {
          [key: string]: JSONValue;
      };
      export type Test = {
          /** The name of an object */
          name?: string;
          command?: \\"a constant!\\";
      };
      "
    `);
  });

  describe('will produce schemas that reflect the selected anyType', () => {
    it('when anyType is unspecified', () => {
      const parser = new Parser();
      parser.addSchema('file:///test.json', true);

      const result = parser.compile();

      expect(result.text).toMatchInlineSnapshot(`
        "type JSONPrimitive = boolean | null | number | string;
        type JSONValue = JSONPrimitive | JSONValue[] | {
            [key: string]: JSONValue;
        };
        export type Test = JSONValue;
        "
      `);
    });

    it('when anyType is "any"', () => {
      const parser = new Parser();
      parser.addSchema('file:///test.json', true);

      const result = parser.compile({ anyType: 'any' });

      expect(result.text).toMatchInlineSnapshot(`
        "export type Test = any;
        "
      `);
    });

    it('when anyType is "JSONValue"', () => {
      const parser = new Parser();
      parser.addSchema('file:///test.json', true);

      const result = parser.compile({ anyType: 'JSONValue' });

      expect(result.text).toMatchInlineSnapshot(`
        "type JSONPrimitive = boolean | null | number | string;
        type JSONValue = JSONPrimitive | JSONValue[] | {
            [key: string]: JSONValue;
        };
        export type Test = JSONValue;
        "
      `);
    });

    it('when anyType is "unknown"', () => {
      const parser = new Parser();
      parser.addSchema('file:///test.json', true);

      const result = parser.compile({ anyType: 'unknown' });

      expect(result.text).toMatchInlineSnapshot(`
        "export type Test = unknown;
        "
      `);
    });
  });
});
