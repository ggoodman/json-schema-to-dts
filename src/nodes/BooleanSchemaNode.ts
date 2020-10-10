import { INode } from '../INode';

export class BooleanSchemaNode implements INode {
  constructor(public schema: boolean) {}
}
