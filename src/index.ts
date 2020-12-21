import type { CoreSchemaMetaSchema } from './schema';

export * from './parser';
export type { JSONSchema7Type as JSONValue } from './types';
export type { CoreSchemaMetaSchema };
export type JSONSchema = Exclude<CoreSchemaMetaSchema, boolean>;
