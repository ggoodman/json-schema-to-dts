import { JSONSchema7 } from 'json-schema';
import { Compiler } from './Compiler';
import { DiagnosticSeverity } from './DiagnosticSeverity';

function compile(schema: JSONSchema7, uri: string, options: { ignoreDiagnostics?: boolean } = {}) {
  return compileMany([{ schema, uri }], options);
}

function compileMany(
  schemas: Array<{ schema: JSONSchema7; uri: string }>,
  options: { ignoreDiagnostics?: boolean } = {}
) {
  const compiler = new Compiler();

  for (const { schema, uri } of schemas) {
    compiler.addSchema(schema, uri);
  }

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
      "type nonNegativeInteger = number;
      type nonNegativeIntegerDefault0 = (nonNegativeInteger & nonNegativeInteger & nonNegativeInteger);
      type stringArray = Array<string>;
      type schemaArray = Array<schemaArray>;
      export type JSONSchema7 = ({
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
          examples: Array<any>;
          multipleOf: number;
          maximum: number;
          exclusiveMaximum: number;
          minimum: number;
          exclusiveMinimum: number;
          maxLength: nonNegativeInteger;
          minLength: nonNegativeIntegerDefault0;
          pattern: string;
          additionalItems: JSONSchema7;
          items: any;
          maxItems: nonNegativeInteger;
          minItems: nonNegativeIntegerDefault0;
          uniqueItems: boolean;
          contains: JSONSchema7;
          maxProperties: nonNegativeInteger;
          minProperties: nonNegativeIntegerDefault0;
          required: stringArray;
          additionalProperties: JSONSchema7;
          definitions: {
              [additionalProperties: string]: JSONSchema7;
          };
          properties: {
              [additionalProperties: string]: JSONSchema7;
          };
          patternProperties: {
              [additionalProperties: string]: JSONSchema7;
          };
          dependencies: {
              [additionalProperties: string]: any;
          };
          propertyNames: JSONSchema7;
          const: any;
          enum: Array<any>;
          type: any;
          format: string;
          contentMediaType: string;
          contentEncoding: string;
          if: JSONSchema7;
          then: JSONSchema7;
          else: JSONSchema7;
          allOf: schemaArray;
          anyOf: schemaArray;
          oneOf: schemaArray;
          not: JSONSchema7;
      } | boolean);
      "
    `);
  });

  it('will handle some internal use-cases', () => {
    const result = compileMany([
      {
        schema: {
          title: 'User',
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            username: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            givenName: {
              type: 'string',
            },
            familyName: {
              type: 'string',
            },
            nickname: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
            emailVerified: {
              type: 'boolean',
            },
            phoneNumber: {
              type: 'string',
            },
            phoneNumberVerified: {
              type: 'boolean',
            },
            picture: {
              type: 'string',
            },
            permissions: {
              type: 'string',
            },
            userMetadata: {
              type: 'object',
              properties: {},
              additionalProperties: true,
              propertyNames: {
                type: 'string',
              },
            },
            appMetadata: {
              type: 'object',
              properties: {},
              additionalProperties: true,
              propertyNames: {
                type: 'string',
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
            lastPasswordReset: {
              type: 'string',
              format: 'date-time',
            },
            identities: {
              type: 'array',
              items: {
                $ref: 'UserIdentity.json',
              },
            },
          },
          additionalProperties: false,
          required: [
            'id',
            'name',
            'nickname',
            'email',
            'emailVerified',
            'picture',
            'userMetadata',
            'appMetadata',
            'createdAt',
            'updatedAt',
            'identities',
          ],
        },
        uri: 'file:///User.json',
      },
      {
        schema: {
          title: 'UserIdentity',
          type: 'object',
          properties: {
            connection: {
              type: 'string',
            },
            provider: {
              type: 'string',
            },
            userId: {
              type: 'string',
            },
            profileData: {
              type: 'object',
              properties: {},
              additionalProperties: true,
            },
            isSocial: {
              type: 'boolean',
            },
            accessToken: {
              type: 'string',
            },
          },
          additionalProperties: false,
          required: ['connection', 'provider', 'userId', 'isSocial'],
        },
        uri: 'file:///UserIdentity.json',
      },
    ]);

    expect(result.typeDefinitions).toMatchInlineSnapshot(`
      "export type UserIdentity = {
          connection?: string;
          provider?: string;
          userId?: string;
          profileData: {
              [additionalProperties: string]: any;
          };
          isSocial?: boolean;
          accessToken: string;
      };
      export type User = {
          id?: string;
          username: string;
          name?: string;
          givenName: string;
          familyName: string;
          nickname?: string;
          email?: string;
          emailVerified?: boolean;
          phoneNumber: string;
          phoneNumberVerified: boolean;
          picture?: string;
          permissions: string;
          userMetadata?: {
              [additionalProperties: string]: any;
          };
          appMetadata?: {
              [additionalProperties: string]: any;
          };
          createdAt?: string;
          updatedAt?: string;
          lastPasswordReset: string;
          identities?: Array<UserIdentity>;
      };
      "
    `);
  });
});
