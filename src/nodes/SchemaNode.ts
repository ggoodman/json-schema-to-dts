import { JSONSchema7 } from 'json-schema';
import { INode } from '../INode';

export class SchemaNode implements INode {
  protected constructor(readonly schema: JSONSchema7) {}
}
