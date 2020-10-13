declare type JSONSchema7Key =
  | "$id"
  | "$ref"
  | "$schema"
  | "$comment"
  | "type"
  | "enum"
  | "const"
  | "multipleOf"
  | "maximum"
  | "exclusiveMaximum"
  | "minimum"
  | "exclusiveMinimum"
  | "maxLength"
  | "minLength"
  | "pattern"
  | "items"
  | "additionalItems"
  | "maxItems"
  | "minItems"
  | "uniqueItems"
  | "contains"
  | "maxProperties"
  | "minProperties"
  | "required"
  | "properties"
  | "patternProperties"
  | "additionalProperties"
  | "dependencies"
  | "propertyNames"
  | "if"
  | "then"
  | "else"
  | "allOf"
  | "anyOf"
  | "oneOf"
  | "not"
  | "format"
  | "contentMediaType"
  | "contentEncoding"
  | "definitions"
  | "title"
  | "description"
  | "default"
  | "readOnly"
  | "writeOnly"
  | "examples";
declare class Codec<T> {
  readonly validator: IValidator;
  constructor(validator: IValidator);
  assertValid(value: unknown): asserts value is T;
}
interface IValidatorContext {
  applyValidatorToChild(key: string, validator: IValidator): void;
  assertionFailure(
    assertionKey: JSONSchema7Key,
    value: unknown,
    message: string
  ): AssertionFailure;
}
interface IValidator {
  assert(ctx: IValidatorContext, value: unknown): void;
}
declare class AssertionFailure {
  private static tag;
  static isAssertionFailure(v: unknown): v is AssertionFailure;
  private readonly tag;
  readonly assertion: JSONSchema7Key;
  readonly message: string;
  readonly path: string[];
  readonly value: JSONValue;
}
declare type JSONPrimitive = boolean | null | number | string;
declare type JSONValue =
  | JSONPrimitive
  | {
      [key: string]: JSONValue;
    }
  | JSONValue[];
export declare type CoreSchemaMetaSchema =
  | {
      $id: string;
      $schema: string;
      $ref: string;
      $comment: string;
      title: string;
      description: string;
      default: unknown;
      readOnly: boolean;
      writeOnly: boolean;
      examples: unknown[];
      multipleOf: number;
      maximum: number;
      exclusiveMaximum: number;
      minimum: number;
      exclusiveMinimum: number;
      maxLength: NonNegativeInteger;
      minLength: NonNegativeIntegerDefault0;
      pattern: string;
      additionalItems: CoreSchemaMetaSchema;
      items: CoreSchemaMetaSchema | SchemaArray;
      maxItems: NonNegativeInteger;
      minItems: NonNegativeIntegerDefault0;
      uniqueItems: boolean;
      contains: CoreSchemaMetaSchema;
      maxProperties: NonNegativeInteger;
      minProperties: NonNegativeIntegerDefault0;
      required: StringArray;
      additionalProperties: CoreSchemaMetaSchema;
      definitions: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
      };
      properties: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
      };
      patternProperties: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
      };
      dependencies: {
        [additionalProperties: string]: CoreSchemaMetaSchema | StringArray;
      };
      propertyNames: CoreSchemaMetaSchema;
      const: unknown;
      enum: unknown[];
      type: SimpleTypes | SimpleTypes[];
      format: string;
      contentMediaType: string;
      contentEncoding: string;
      if: CoreSchemaMetaSchema;
      then: CoreSchemaMetaSchema;
      else: CoreSchemaMetaSchema;
      allOf: SchemaArray;
      anyOf: SchemaArray;
      oneOf: SchemaArray;
      not: CoreSchemaMetaSchema;
    }
  | boolean;
export declare const CoreSchemaMetaSchemaCodec: Codec<CoreSchemaMetaSchema>;
declare type NonNegativeInteger = number;
export declare const NonNegativeIntegerCodec: Codec<NonNegativeInteger>;
declare type NonNegativeIntegerDefault0 = NonNegativeInteger & unknown;
export declare const NonNegativeIntegerDefault0Codec: Codec<NonNegativeIntegerDefault0>;
declare type SchemaArray = CoreSchemaMetaSchema[];
export declare const SchemaArrayCodec: Codec<SchemaArray>;
declare type StringArray = string[];
export declare const StringArrayCodec: Codec<StringArray>;
declare type SimpleTypes =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";
export declare const SimpleTypesCodec: Codec<SimpleTypes>;
export {};
