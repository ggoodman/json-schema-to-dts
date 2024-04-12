// IMPORTANT: Do not edit this file by hand; it is automatically generated

type JSONPrimitive = boolean | null | number | string;
type JSONValue = JSONPrimitive | JSONValue[] | {
    [key: string]: JSONValue;
};
/** Core schema meta-schema */
export type CoreSchemaMetaSchema = (({
    $id?: string;
    $schema?: string;
    $ref?: string;
    $comment?: string;
    title?: string;
    description?: string;
    ["default"]?: JSONValue;
    readOnly?: boolean;
    writeOnly?: boolean;
    examples?: (JSONValue)[];
    multipleOf?: number;
    maximum?: number;
    exclusiveMaximum?: number;
    minimum?: number;
    exclusiveMinimum?: number;
    maxLength?: NonNegativeInteger;
    minLength?: NonNegativeIntegerDefault0;
    pattern?: string;
    additionalItems?: CoreSchemaMetaSchema;
    items?: (CoreSchemaMetaSchema | SchemaArray);
    maxItems?: NonNegativeInteger;
    minItems?: NonNegativeIntegerDefault0;
    uniqueItems?: boolean;
    contains?: CoreSchemaMetaSchema;
    maxProperties?: NonNegativeInteger;
    minProperties?: NonNegativeIntegerDefault0;
    required?: StringArray;
    additionalProperties?: CoreSchemaMetaSchema;
    definitions?: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
    };
    properties?: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
    };
    patternProperties?: {
        [additionalProperties: string]: CoreSchemaMetaSchema;
    };
    dependencies?: {
        [additionalProperties: string]: (CoreSchemaMetaSchema | StringArray);
    };
    propertyNames?: CoreSchemaMetaSchema;
    ["const"]?: JSONValue;
    ["enum"]?: (JSONValue)[];
    type?: (SimpleTypes | (SimpleTypes)[]);
    format?: string;
    contentMediaType?: string;
    contentEncoding?: string;
    ["if"]?: CoreSchemaMetaSchema;
    then?: CoreSchemaMetaSchema;
    ["else"]?: CoreSchemaMetaSchema;
    allOf?: SchemaArray;
    anyOf?: SchemaArray;
    oneOf?: SchemaArray;
    not?: CoreSchemaMetaSchema;
} & {
    [additionalProperties: string]: JSONValue;
}) | boolean);
export type NonNegativeInteger = number;
export type NonNegativeIntegerDefault0 = (NonNegativeInteger & JSONValue);
export type SchemaArray = (CoreSchemaMetaSchema)[];
export type StringArray = (string)[];
export type SimpleTypes = ("array" | "boolean" | "integer" | "null" | "number" | "object" | "string");
