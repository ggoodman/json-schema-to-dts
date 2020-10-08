import { JSONSchema7 } from 'json-schema';
import { Compiler } from './Compiler';
import { DiagnosticSeverity } from './DiagnosticSeverity';

function compile(schema: JSONSchema7, uri: string, options: { ignoreDiagnostics?: boolean } = {}) {
  const compiler = new Compiler();

  compiler.addSchema(schema, uri);

  const result = compiler.compile();
  const errorDiagnostics = result.diagnostics.filter(
    (diagnostic) => diagnostic.severity === DiagnosticSeverity.Error
  );

  if (!options.ignoreDiagnostics) {
    for (const diagnostic of errorDiagnostics) {
      console.log('%s [%s]: %s', diagnostic.severity, diagnostic.uri, diagnostic.message);
    }

    expect(errorDiagnostics).toHaveLength(0);
  }

  return result;
}

describe('Compiler', () => {
  describe('type=enum', () => {
    it('minimal schema', () => {
      const result = compile(
        {
          enum: ['hello', 'world'],
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = (\\"hello\\" | \\"world\\");
        "
      `);
    });

    it('minimal schema, heterogenous types', () => {
      const result = compile(
        {
          enum: ['hello', 1, true, { goodnight: 'moon' }, [null]],
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = (\\"hello\\" | 1 | true | {
            \\"goodnight\\": \\"moon\\";
        } | [
            null
        ]);
        "
      `);
    });
  });

  describe('type=object', () => {
    it('minimal schema', () => {
      const result = compile(
        {
          type: 'object',
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = {
            [additionalProperties: string]: any;
        };
        "
      `);
    });

    it('only `.additionalProperties == true`', () => {
      const result = compile(
        {
          type: 'object',
          additionalProperties: true,
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = {
            [additionalProperties: string]: any;
        };
        "
      `);
    });

    it('makes a locked object when empty and `.additionalProperties === false`', () => {
      const result = compile(
        {
          type: 'object',
          additionalProperties: false,
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = {
            [additionalProperties: string]: never;
        };
        "
      `);
    });

    it('produces the same type when there are `.properties` whether `.additionalProperties` is explicitly true or not', () => {
      const result = compile(
        {
          type: 'object',
          additionalProperties: true,
          properties: {
            hello: { type: 'string' },
          },
        },
        'file:///test.json'
      );
      const comparison = compile(
        {
          type: 'object',
          properties: {
            hello: { type: 'string' },
          },
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = {
            [additionalProperties: string]: any;
            hello: string;
        };
        "
      `);
      expect(comparison.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = {
            [additionalProperties: string]: any;
            hello: string;
        };
        "
      `);
      expect(result.typeDefinitions).toEqual(comparison.typeDefinitions);
    });
  });

  describe('type=string', () => {
    it('minimal schema', () => {
      const result = compile(
        {
          type: 'string',
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = string;
        "
      `);
    });

    it('will print a schema that is an enum with type of string', () => {
      const result = compile(
        {
          type: 'string',
          enum: ['hello', 'world'],
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = ((\\"hello\\" | \\"world\\") & string);
        "
      `);
    });

    it('will print a schema that is an enum whose members are numbers but whose type is string', () => {
      const result = compile(
        {
          title: 'Protocol',
          type: 'string',
          enum: [1, 2],
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type Protocol = ((1 | 2) & string);
        "
      `);
    });
  });

  describe('type=boolean', () => {
    it('minimal schema', () => {
      const result = compile(
        {
          type: 'boolean',
        },
        'file:///test.json'
      );

      expect(result.typeDefinitions).toMatchInlineSnapshot(`
        "export type test = boolean;
        "
      `);
    });
  });

  it('JSONSchema7', () => {
    const result = compile(
      {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'http://json-schema.org/draft-07/schema#',
        title: 'JSONSchema7',
        definitions: {
          schemaArray: {
            type: 'array',
            minItems: 1,
            items: { $ref: '#' },
          },
          nonNegativeInteger: {
            type: 'integer',
            minimum: 0,
          },
          nonNegativeIntegerDefault0: {
            allOf: [{ $ref: '#/definitions/nonNegativeInteger' }, { default: 0 }],
          },
          simpleTypes: {
            enum: ['array', 'boolean', 'integer', 'null', 'number', 'object', 'string'],
          },
          stringArray: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            default: [],
          },
        },
        type: ['object', 'boolean'],
        properties: {
          $id: {
            type: 'string',
            format: 'uri-reference',
          },
          $schema: {
            type: 'string',
            format: 'uri',
          },
          $ref: {
            type: 'string',
            format: 'uri-reference',
          },
          $comment: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          default: true,
          readOnly: {
            type: 'boolean',
            default: false,
          },
          writeOnly: {
            type: 'boolean',
            default: false,
          },
          examples: {
            type: 'array',
            items: true,
          },
          multipleOf: {
            type: 'number',
            exclusiveMinimum: 0,
          },
          maximum: {
            type: 'number',
          },
          exclusiveMaximum: {
            type: 'number',
          },
          minimum: {
            type: 'number',
          },
          exclusiveMinimum: {
            type: 'number',
          },
          maxLength: { $ref: '#/definitions/nonNegativeInteger' },
          minLength: { $ref: '#/definitions/nonNegativeIntegerDefault0' },
          pattern: {
            type: 'string',
            format: 'regex',
          },
          additionalItems: { $ref: '#' },
          items: {
            anyOf: [{ $ref: '#' }, { $ref: '#/definitions/schemaArray' }],
            default: true,
          },
          maxItems: { $ref: '#/definitions/nonNegativeInteger' },
          minItems: { $ref: '#/definitions/nonNegativeIntegerDefault0' },
          uniqueItems: {
            type: 'boolean',
            default: false,
          },
          contains: { $ref: '#' },
          maxProperties: { $ref: '#/definitions/nonNegativeInteger' },
          minProperties: { $ref: '#/definitions/nonNegativeIntegerDefault0' },
          required: { $ref: '#/definitions/stringArray' },
          additionalProperties: { $ref: '#' },
          definitions: {
            type: 'object',
            additionalProperties: { $ref: '#' },
            default: {},
          },
          properties: {
            type: 'object',
            additionalProperties: { $ref: '#' },
            default: {},
          },
          patternProperties: {
            type: 'object',
            additionalProperties: { $ref: '#' },
            propertyNames: { format: 'regex' },
            default: {},
          },
          dependencies: {
            type: 'object',
            additionalProperties: {
              anyOf: [{ $ref: '#' }, { $ref: '#/definitions/stringArray' }],
            },
          },
          propertyNames: { $ref: '#' },
          const: true,
          enum: {
            type: 'array',
            items: true,
            minItems: 1,
            uniqueItems: true,
          },
          type: {
            anyOf: [
              { $ref: '#/definitions/simpleTypes' },
              {
                type: 'array',
                items: { $ref: '#/definitions/simpleTypes' },
                minItems: 1,
                uniqueItems: true,
              },
            ],
          },
          format: { type: 'string' },
          contentMediaType: { type: 'string' },
          contentEncoding: { type: 'string' },
          if: { $ref: '#' },
          then: { $ref: '#' },
          else: { $ref: '#' },
          allOf: { $ref: '#/definitions/schemaArray' },
          anyOf: { $ref: '#/definitions/schemaArray' },
          oneOf: { $ref: '#/definitions/schemaArray' },
          not: { $ref: '#' },
        },
        default: true,
      },
      'file:///test.json',
      { ignoreDiagnostics: true }
    );

    expect(result.typeDefinitions).toMatchInlineSnapshot(`
      "export type JSONSchema7 = ({
          [additionalProperties: string]: any;
          $id: string;
          $schema: string;
          $ref: string;
          $comment: string;
          title: string;
          description: string;
          default: any;
          readOnly: boolean;
          writeOnly: boolean;
          examples: ([
          ] & any);
          multipleOf: number;
          maximum: number;
          exclusiveMaximum: number;
          minimum: number;
          exclusiveMinimum: number;
          maxLength: any;
          minLength: any;
          pattern: string;
          additionalItems: any;
          items: any;
          maxItems: any;
          minItems: any;
          uniqueItems: boolean;
          contains: any;
          maxProperties: any;
          minProperties: any;
          required: any;
          additionalProperties: any;
          definitions: {
              [additionalProperties: string]: any;
          };
          properties: {
              [additionalProperties: string]: any;
          };
          patternProperties: {
              [additionalProperties: string]: any;
          };
          dependencies: {
              [additionalProperties: string]: any;
          };
          propertyNames: any;
          const: any;
          enum: ([
          ] & any);
          type: any;
          format: string;
          contentMediaType: string;
          contentEncoding: string;
          if: any;
          then: any;
          else: any;
          allOf: any;
          anyOf: any;
          oneOf: any;
          not: any;
      } | boolean);
      "
    `);
  });
});
