import { CoreSchemaMetaSchema, SimpleTypes } from './schema';

type JSONPrimitive = boolean | null | number | string;
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };

export type JSONSchema7Definition = CoreSchemaMetaSchema;
export type JSONSchema7 = Exclude<CoreSchemaMetaSchema, boolean>;
export type JSONSchema7Type = JSONValue;
export type JSONSchema7TypeName = SimpleTypes;
