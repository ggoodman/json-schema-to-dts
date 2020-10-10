import { JSONSchema7Type, JSONSchema7TypeName, JSONSchema7Version } from 'json-schema';
import { IReference } from './references';

export interface ISchemaNode {
  readonly kind: SchemaNodeKind;
  readonly baseUri: string;
  readonly uri: string;
}

export enum SchemaNodeKind {
  Boolean = 'Boolean',
  Schema = 'Schema',
}

export interface SchemaNodeOptions {
  $id?: string;
  $ref?: IReference;
  $schema?: JSONSchema7Version;
  $comment?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
   */
  type?: JSONSchema7TypeName | JSONSchema7TypeName[];
  enum?: JSONSchema7Type[];
  const?: JSONSchema7Type;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number;
  minLength?: number;
  pattern?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: ISchemaNode | ISchemaNode[];
  additionalItems?: ISchemaNode;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: ISchemaNode;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: {
    [key: string]: ISchemaNode;
  };
  patternProperties?: {
    [key: string]: ISchemaNode;
  };
  additionalProperties?: ISchemaNode;
  dependencies?: {
    [key: string]: ISchemaNode | string[];
  };
  propertyNames?: ISchemaNode;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: ISchemaNode;
  then?: ISchemaNode;
  else?: ISchemaNode;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: ISchemaNode[];
  anyOf?: ISchemaNode[];
  oneOf?: ISchemaNode[];
  not?: ISchemaNode;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
   */
  format?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
   */
  contentMediaType?: string;
  contentEncoding?: string;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  definitions?: {
    [key: string]: ISchemaNode;
  };

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  title?: string;
  description?: string;
  default?: JSONSchema7Type;
  readOnly?: boolean;
  writeOnly?: boolean;
  examples?: JSONSchema7Type;
}

abstract class BaseSchemaNode<T> implements ISchemaNode {
  abstract readonly kind: SchemaNodeKind;

  constructor(readonly uri: string, readonly baseUri: string, readonly schema: T) {}
}

export class BooleanSchemaNode extends BaseSchemaNode<boolean> {
  readonly kind = SchemaNodeKind.Boolean;
}

export class SchemaNode extends BaseSchemaNode<SchemaNodeOptions> {
  readonly kind = SchemaNodeKind.Schema;
}
