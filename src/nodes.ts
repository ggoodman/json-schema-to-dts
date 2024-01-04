import isValidVariable from 'is-valid-variable';
import {
  CodeBlockWriter,
  IndexSignatureDeclarationStructure,
  JSDocStructure,
  JSDocTagStructure,
  OptionalKind,
  PropertySignatureStructure,
  WriterFunction,
  Writers,
} from 'ts-morph';
import { IReference } from './references';
import { CoreSchemaMetaSchema } from './schema';
import { JSONSchema7, JSONSchema7Definition, JSONSchema7Type, JSONSchema7TypeName } from './types';

export type AnyType = 'any' | 'JSONValue' | 'unknown';

export interface IDocEmitOptions {
  emitSeeDirective?: boolean;
}
export interface ITypingContext {
  anyType: AnyType;
  getNameForReference(ref: IReference): string;
  shouldEmitTypes(
    schema: ISchemaNode<CoreSchemaMetaSchema>,
    parentNode: ISchemaNode<JSONSchema7>
  ): boolean;
}

export interface ISchemaNode<T extends JSONSchema7Definition = JSONSchema7Definition> {
  readonly kind: SchemaNodeKind;
  readonly baseUri: string;
  readonly schema: T;
  readonly uri: string;

  provideWriterFunction(ctx: ITypingContext): WriterFunction;
  provideDocs(options?: IDocEmitOptions): OptionalKind<JSDocStructure> | undefined;
}

export enum SchemaNodeKind {
  Boolean = 'Boolean',
  Schema = 'Schema',
}

export interface SchemaNodeOptions {
  $id?: string;
  $ref?: IReference;
  $schema?: string;
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

abstract class BaseSchemaNode<TSchema extends JSONSchema7Definition, TOptions = undefined>
  implements ISchemaNode<TSchema>
{
  abstract readonly kind: SchemaNodeKind;

  constructor(
    readonly uri: string,
    readonly baseUri: string,
    readonly schema: TSchema,
    protected readonly options: TOptions
  ) {}

  provideDocs(): OptionalKind<JSDocStructure> | undefined {
    return undefined;
  }

  abstract provideWriterFunction(ctx: ITypingContext): WriterFunction;
}

export class BooleanSchemaNode extends BaseSchemaNode<boolean> {
  readonly kind = SchemaNodeKind.Boolean;

  provideWriterFunction(ctx: ITypingContext): WriterFunction {
    return createLiteralWriterFunction(this.schema ? ctx.anyType : 'never');
  }
}

export class SchemaNode extends BaseSchemaNode<JSONSchema7, SchemaNodeOptions> {
  readonly kind = SchemaNodeKind.Schema;

  provideDocs(options?: IDocEmitOptions) {
    const lines: string[] = [];
    const tags: OptionalKind<JSDocTagStructure>[] = [];

    if (this.schema.title) {
      lines.push(this.schema.title);
    }

    if (this.schema.description) {
      lines.push(this.schema.description);
    }

    if (options?.emitSeeDirective && this.schema.$id) {
      tags.push({ tagName: 'see', text: this.schema.$id });
    }

    if (!lines.length && !tags.length) {
      return;
    }

    return {
      description: lines.join('\n\n'),
      tags,
    };
  }

  provideWriterFunction(ctx: ITypingContext): WriterFunction {
    const typeWriters: WriterFunction[] = [];

    if (this.options.$ref) {
      const targetTypeName = ctx.getNameForReference(this.options.$ref);

      typeWriters.push(createLiteralWriterFunction(targetTypeName));
    }

    if (this.options.anyOf) {
      const writerFunctions = this.options.anyOf
        .filter((node) => ctx.shouldEmitTypes(node, this))
        .map((node) => node.provideWriterFunction(ctx));

      if (writerFunctions.length) {
        typeWriters.push(createUnionTypeWriterFunction(writerFunctions));
      }
    }

    if (this.options.allOf) {
      const writerFunctions = this.options.allOf
        .filter((node) => ctx.shouldEmitTypes(node, this))
        .map((node) => node.provideWriterFunction(ctx));

      if (writerFunctions.length) {
        typeWriters.push(createIntersectionTypeWriterFunction(writerFunctions));
      }
    }

    if (this.options.oneOf) {
      const writerFunctions = this.options.oneOf
        .filter((node) => ctx.shouldEmitTypes(node, this))
        .map((node) => node.provideWriterFunction(ctx));

      if (writerFunctions.length) {
        typeWriters.push(createUnionTypeWriterFunction(writerFunctions));
      }
    }

    if (typeof this.schema.const !== 'undefined') {
      typeWriters.push(createLiteralWriterFunction(JSON.stringify(this.schema.const)));
    }

    if (this.schema.enum) {
      const unionWriters: WriterFunction[] = this.schema.enum.map((value) =>
        createLiteralWriterFunction(JSON.stringify(value))
      );

      if (unionWriters.length) {
        typeWriters.push(createUnionTypeWriterFunction(unionWriters));
      }
    }

    const writeForTypeName = (typeName: JSONSchema7TypeName): WriterFunction => {
      switch (typeName) {
        case 'array':
          return this.provideWritersForTypeArray(ctx);
        case 'boolean':
          return createLiteralWriterFunction('boolean');
        case 'null':
          return createLiteralWriterFunction('null');
        case 'object':
          return this.provideWritersForTypeObject(ctx);
        case 'integer':
        case 'number':
          return createLiteralWriterFunction('number');
        case 'string':
          return createLiteralWriterFunction('string');
        default:
          throw new Error(
            `Invariant violation: Unable to handle unknown type name ${JSON.stringify(typeName)}`
          );
      }
    };

    if (Array.isArray(this.schema.type)) {
      const writerFunctions = this.schema.type.map(writeForTypeName);

      typeWriters.push(createUnionTypeWriterFunction(writerFunctions));
    } else if (this.schema.type) {
      const typeWriter = writeForTypeName(this.schema.type);

      typeWriters.push(typeWriter);
    } else {
      // We have no explicit type so we'll infer from assertions
      if (
        typeof this.schema.uniqueItems === 'boolean' ||
        typeof this.schema.maxItems === 'number' ||
        typeof this.schema.minItems === 'number' ||
        this.options.contains
      ) {
        typeWriters.push(writeForTypeName('array'));
      }
    }

    if (!typeWriters.length) {
      typeWriters.push(createLiteralWriterFunction(ctx.anyType));
    }

    return createIntersectionTypeWriterFunction(typeWriters);
  }

  private provideWritersForTuple(ctx: ITypingContext, items: ISchemaNode[]): WriterFunction {
    return (writer) => {
      writer.write('[');

      for (let i = 0; i < items.length; i++) {
        const typeWriter = items[i].provideWriterFunction(ctx);

        if (i > 0) {
          writer.write(',');
        }

        typeWriter(writer);
      }

      if (this.options.additionalItems && ctx.shouldEmitTypes(this.options.additionalItems, this)) {
        const typeWriter = this.options.additionalItems.provideWriterFunction(ctx);

        writer.write('...'), typeWriter(writer);
        writer.write('[]');
      }

      writer.write(']');
    };
  }

  private provideWritersForTypeArray(ctx: ITypingContext): WriterFunction {
    const items = this.options.items;

    if (Array.isArray(items)) {
      return this.provideWritersForTuple(ctx, items);
    }

    let typeWriter = createLiteralWriterFunction('unknown[]');

    if (items && ctx.shouldEmitTypes(items, this)) {
      const writerFunction = items.provideWriterFunction(ctx);

      typeWriter = (writer) => {
        writer.write('(');
        writerFunction(writer);
        writer.write(')[]');
      };
    }

    return typeWriter;
  }

  private provideWritersForTypeObject(ctx: ITypingContext): WriterFunction {
    const required = new Set(this.schema.required);
    const writers: WriterFunction[] = [];

    if (this.options.properties) {
      const properties: OptionalKind<PropertySignatureStructure>[] = [];

      for (const name in this.options.properties) {
        const node = this.options.properties[name];

        if (!ctx.shouldEmitTypes(node, this)) {
          continue;
        }

        const typeWriter = node.provideWriterFunction(ctx);
        const docs = node.provideDocs();
        const safeName = propertyNameRequiresQuoting(name) ? `[${JSON.stringify(name)}]` : name;

        properties.push({
          docs: docs ? [docs] : undefined,
          name: safeName,
          hasQuestionToken: !required.has(name),
          type: typeWriter,
        });
      }

      if (properties.length) {
        writers.push(Writers.objectType({ properties }));
      }
    }

    const indexSignatures: OptionalKind<IndexSignatureDeclarationStructure>[] = [];

    if (
      this.options.additionalProperties &&
      ctx.shouldEmitTypes(this.options.additionalProperties, this)
    ) {
      const typeWriter = this.options.additionalProperties.provideWriterFunction(ctx);

      indexSignatures.push({
        keyName: 'additionalProperties',
        keyType: 'string',
        returnType: typeWriter,
      });
    }

    if (this.options.patternProperties) {
      for (const name in this.options.patternProperties) {
        const node = this.options.patternProperties[name];

        if (!ctx.shouldEmitTypes(node, this)) {
          continue;
        }

        const typeWriter = node.provideWriterFunction(ctx);

        indexSignatures.push({
          keyName: 'patternProperties',
          keyType: 'string',
          returnType: typeWriter,
        });
      }
    }

    if (indexSignatures.length) {
      writers.push(Writers.objectType({ indexSignatures }));
    }

    if (!writers.length) {
      writers.push(createLiteralWriterFunction(`{ [property: string]: ${ctx.anyType} }`));
    }

    return createIntersectionTypeWriterFunction(writers);
  }
}

function createIntersectionTypeWriterFunction(options: WriterFunction[]): WriterFunction {
  if (!options.length) {
    throw new Error(`Invariant violation: options should always have length > 0`);
  }

  if (options.length === 1) {
    return options[0];
  }

  const writerFn = Writers.intersectionType(...(options as [WriterFunction, WriterFunction]));

  return (writer) => {
    writer.write('(');
    writerFn(writer);
    writer.write(')');
  };
}

function createLiteralWriterFunction(value: string): WriterFunction {
  return (writer: CodeBlockWriter) => writer.write(value);
}

function createUnionTypeWriterFunction(options: WriterFunction[]): WriterFunction {
  if (!options.length) {
    throw new Error(`Invariant violation: options should always have length > 0`);
  }

  if (options.length === 1) {
    return options[0];
  }

  const writerFn = Writers.unionType(...(options as [WriterFunction, WriterFunction]));

  return (writer) => {
    writer.write('(');
    writerFn(writer);
    writer.write(')');
  };
}

function propertyNameRequiresQuoting(name: string): boolean {
  return !isValidVariable(name);
}
