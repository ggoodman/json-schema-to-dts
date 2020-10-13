import {
  JSONSchema7,
  JSONSchema7Definition,
  JSONSchema7Type,
  JSONSchema7TypeName,
  JSONSchema7Version,
} from 'json-schema';
import {
  CodeBlockWriter,
  TypeElementMemberedNodeStructure,
  WriterFunction,
  Writers,
} from 'ts-morph';
import { IReference } from './references';

export interface ITypingContext {
  getNameForReference(ref: IReference): string;
}

export interface ICodegenContext {
  getNameForReference(ref: IReference): string;
}

export interface ISchemaNode {
  readonly kind: SchemaNodeKind;
  readonly baseUri: string;
  readonly schema: JSONSchema7Definition;
  readonly uri: string;

  provideWriters(
    ctx: ITypingContext
  ): { typeWriter: WriterFunction; validatorWriter: WriterFunction };
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

abstract class BaseSchemaNode<TSchema, TOptions = undefined> implements ISchemaNode {
  abstract readonly kind: SchemaNodeKind;

  constructor(
    readonly uri: string,
    readonly baseUri: string,
    readonly schema: TSchema,
    protected readonly options: TOptions
  ) {}

  abstract provideWriters(
    ctx: ITypingContext
  ): { typeWriter: WriterFunction; validatorWriter: WriterFunction };
}

export class BooleanSchemaNode extends BaseSchemaNode<boolean> {
  readonly kind = SchemaNodeKind.Boolean;

  provideWriters(
    ctx: ITypingContext
  ): { typeWriter: WriterFunction; validatorWriter: WriterFunction } {
    return {
      typeWriter: createLiteralWriterFunction(this.schema ? 'unknown' : 'never'),
      validatorWriter: createLiteralWriterFunction(
        `new ConstantValidator(${JSON.stringify(this.schema)})`
      ),
    };
  }
}

export class SchemaNode extends BaseSchemaNode<JSONSchema7, SchemaNodeOptions> {
  readonly kind = SchemaNodeKind.Schema;

  provideWriters(
    ctx: ITypingContext
  ): { typeWriter: WriterFunction; validatorWriter: WriterFunction } {
    const typeWriters: WriterFunction[] = [];
    const validatorWriters: WriterFunction[] = [];

    if (this.options.$ref) {
      const targetTypeName = ctx.getNameForReference(this.options.$ref);

      typeWriters.push(createLiteralWriterFunction(targetTypeName));
      validatorWriters.push(
        createLiteralWriterFunction(
          `new DeferredReferenceValidator(() => ${targetTypeName}Codec.validator)`
        )
      );
    }

    if (this.options.anyOf) {
      const unionTypeWriterFns: WriterFunction[] = [];

      for (const node of this.options.anyOf) {
        const { typeWriter } = node.provideWriters(ctx);
        unionTypeWriterFns.push(typeWriter);
      }

      if (unionTypeWriterFns.length) {
        typeWriters.push(createUnionTypeWriterFunction(unionTypeWriterFns));
      }
    }

    if (this.options.allOf) {
      const allOfTypeWriters: WriterFunction[] = [];
      const allOfValidatorWriters: WriterFunction[] = [];

      for (const node of this.options.allOf) {
        const { typeWriter, validatorWriter } = node.provideWriters(ctx);

        allOfTypeWriters.push(typeWriter);
        allOfValidatorWriters.push(validatorWriter);
      }

      typeWriters.push(createIntersectionTypeWriterFunction(allOfTypeWriters));
      validatorWriters.push(createValidatorWriterFunction('AllOfValidator', allOfValidatorWriters));
    }

    if (this.options.oneOf) {
      const oneOfTypeWriters: WriterFunction[] = [];
      const oneOfValidatorWriters: WriterFunction[] = [];

      for (const node of this.options.oneOf) {
        const { typeWriter, validatorWriter } = node.provideWriters(ctx);

        oneOfTypeWriters.push(typeWriter);
        oneOfValidatorWriters.push(validatorWriter);
      }

      typeWriters.push(createUnionTypeWriterFunction(oneOfTypeWriters));
      validatorWriters.push(createValidatorWriterFunction('OneOfValidator', oneOfValidatorWriters));
    }

    if (this.options.items) {
    }

    if (this.schema.enum) {
      const union: WriterFunction[] = [];

      for (const value of this.schema.enum) {
        union.push(createLiteralWriterFunction(JSON.stringify(value)));
      }

      if (union.length) {
        typeWriters.push(
          union.length > 1
            ? Writers.unionType(...(union as [WriterFunction, WriterFunction]))
            : union[0]
        );
      }
    }

    // TODO: Fix this to return a typeWriter and validatorWriter so that alternatives are not treated as an intersection when type is an array
    const writeForTypeName = (typeName: JSONSchema7TypeName) => {
      switch (typeName) {
        case 'array': {
          const { typeWriter, validatorWriter } = this.provideWritersForTypeArray(ctx);
          typeWriters.push(typeWriter);
          validatorWriters.push(validatorWriter);
          break;
        }
        case 'boolean': {
          typeWriters.push(createLiteralWriterFunction('boolean'));
          validatorWriters.push(createLiteralWriterFunction('new BooleanTypeValidator()'));
          break;
        }
        case 'null': {
          typeWriters.push(createLiteralWriterFunction('null'));
          validatorWriters.push(createLiteralWriterFunction('new NullTypeValidator()'));
          break;
        }
        case 'object': {
          const { typeWriter, validatorWriter } = this.provideWritersForTypeObject(ctx);
          typeWriters.push(typeWriter);
          validatorWriters.push(validatorWriter);
          break;
        }
        case 'integer':
        case 'number': {
          typeWriters.push(createLiteralWriterFunction('number'));
          validatorWriters.push(
            createLiteralWriterFunction(
              `new NumberTypeValidator(${JSON.stringify({
                type: this.schema.type,
                multipleOf: this.schema.multipleOf,
                maximum: this.schema.maximum,
                exclusiveMaximum: this.schema.exclusiveMaximum,
                minimum: this.schema.minimum,
                exclusiveMinimum: this.schema.exclusiveMinimum,
              })})`
            )
          );
          break;
        }
        case 'string': {
          typeWriters.push(createLiteralWriterFunction('string'));
          validatorWriters.push(
            createLiteralWriterFunction(
              `new StringTypeValidator(${JSON.stringify({
                maxLength: this.schema.maxLength,
                minLength: this.schema.minLength,
                pattern: this.schema.pattern,
              })})`
            )
          );
          break;
        }
      }
    };

    if (Array.isArray(this.schema.type)) {
      for (const typeName of this.schema.type) {
        writeForTypeName(typeName);
      }
    } else if (this.schema.type) {
      writeForTypeName(this.schema.type);
    }

    if (!typeWriters.length) {
      typeWriters.push(createLiteralWriterFunction('unknown'));
    }

    if (!validatorWriters.length) {
      // TODO: Replace this with an actual implementation
      validatorWriters.push(
        createLiteralWriterFunction(`new ConstantValidator(${JSON.stringify(false)})`)
      );
    }

    return {
      typeWriter: createIntersectionTypeWriterFunction(typeWriters),
      validatorWriter:
        validatorWriters.length > 1
          ? createValidatorWriterFunction('AllOfValidator', validatorWriters)
          : validatorWriters[0],
    };
  }

  private provideWritersForTuple(ctx: ITypingContext, items: ISchemaNode[]) {
    const typeWriterFns: WriterFunction[] = [createLiteralWriterFunction('[')];
    const validatorOptions: {
      items: WriterFunction[];
      additionalItems?: WriterFunction;
    } = {
      items: [],
    };

    for (let i = 0; i < items.length; i++) {
      const enumItem = items[i];
      const { typeWriter, validatorWriter } = enumItem.provideWriters(ctx);

      validatorOptions.items.push(validatorWriter);

      if (i > 0) {
        typeWriterFns.push(createLiteralWriterFunction(','));
      }

      typeWriterFns.push(typeWriter);
    }

    if (this.options.additionalItems) {
      const { typeWriter, validatorWriter } = this.options.additionalItems.provideWriters(ctx);

      typeWriterFns.push(
        createLiteralWriterFunction('...'),
        typeWriter,
        createLiteralWriterFunction('[]')
      );

      validatorOptions.additionalItems = validatorWriter;
    }

    typeWriterFns.push(createLiteralWriterFunction(']'));

    const typeWriter: WriterFunction = (writer) => {
      for (const writerFn of typeWriterFns) {
        writerFn(writer);
      }
    };
    const validatorWriter = createValidatorWriterFunction('TupleValidator', validatorOptions);

    return {
      typeWriter,
      validatorWriter,
    };
  }

  private provideWritersForTypeArray(ctx: ITypingContext) {
    const items = this.options.items;

    if (Array.isArray(items)) {
      return this.provideWritersForTuple(ctx, items);
    }

    let typeWriter = createLiteralWriterFunction('unknown[]');

    const validatorWriterOptions: {
      items?: WriterFunction;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      contains?: WriterFunction;
    } = {
      maxItems: this.schema.maxItems,
      minItems: this.schema.minItems,
      uniqueItems: this.schema.uniqueItems,
    };

    if (items) {
      const {
        typeWriter: itemsTypeWriter,
        validatorWriter: itemsValidatorWriter,
      } = items.provideWriters(ctx);

      typeWriter = (arrayWriter) => {
        arrayWriter.write('Array<');
        itemsTypeWriter(arrayWriter);
        arrayWriter.write('>');
      };

      validatorWriterOptions.items = itemsValidatorWriter;
    }

    if (this.options.contains) {
      const { validatorWriter } = this.options.contains.provideWriters(ctx);

      validatorWriterOptions.contains = validatorWriter;
    }

    const validatorWriter = createValidatorWriterFunction(
      'ArrayTypeValidator',
      validatorWriterOptions
    );

    return {
      typeWriter,
      validatorWriter,
    };
  }

  private provideWritersForTypeObject(ctx: ITypingContext) {
    const required = new Set(this.schema.required);
    const typeElement: TypeElementMemberedNodeStructure = {};
    const objectValidatorOptions: {
      maxProperties?: WriterFunction;
      minProperties?: WriterFunction;
      required?: WriterFunction;
      properties?: {
        [key: string]: WriterFunction;
      };
      patternProperties?: {
        [key: string]: WriterFunction;
      };
      additionalProperties?: WriterFunction;
      dependencies?: {
        [key: string]: WriterFunction;
      };
      propertyNames?: WriterFunction;
    } = {};

    if (typeof this.schema.maxProperties === 'number') {
      objectValidatorOptions.maxProperties = createLiteralWriterFunction(
        JSON.stringify(this.schema.maxProperties)
      );
    }
    if (typeof this.schema.minProperties === 'number') {
      objectValidatorOptions.minProperties = createLiteralWriterFunction(
        JSON.stringify(this.schema.minProperties)
      );
    }
    if (
      Array.isArray(this.schema.required) &&
      this.schema.required.every((item) => typeof item === 'string')
    ) {
      objectValidatorOptions.required = createLiteralWriterFunction(
        JSON.stringify(this.schema.required)
      );
    }

    if (this.options.properties) {
      objectValidatorOptions.properties = {};

      typeElement.properties ??= [];

      for (const name in this.options.properties) {
        const { typeWriter, validatorWriter } = this.options.properties[name].provideWriters(ctx);
        typeElement.properties.push({
          name,
          hasQuestionToken: required.has(name),
          type: typeWriter,
        });

        objectValidatorOptions.properties[name] = validatorWriter;
      }
    }

    if (this.options.additionalProperties) {
      typeElement.indexSignatures ??= [];

      const { typeWriter, validatorWriter } = this.options.additionalProperties.provideWriters(ctx);

      typeElement.indexSignatures.push({
        keyName: 'additionalProperties',
        keyType: 'string',
        returnType: typeWriter,
      });

      objectValidatorOptions.additionalProperties = validatorWriter;
    }

    if (this.options.patternProperties) {
      objectValidatorOptions.patternProperties = {};
      typeElement.indexSignatures ??= [];

      for (const name in this.options.patternProperties) {
        const { typeWriter, validatorWriter } = this.options.patternProperties[name].provideWriters(
          ctx
        );

        typeElement.indexSignatures.push({
          keyName: 'patternProperties',
          keyType: 'string',
          returnType: typeWriter,
        });

        objectValidatorOptions.patternProperties[name] = validatorWriter;
      }
    }

    return {
      typeWriter: Writers.objectType(typeElement),
      validatorWriter: createValidatorWriterFunction('ObjectTypeValidator', objectValidatorOptions),
    };
  }
}

function createIntersectionTypeWriterFunction(options: WriterFunction[]) {
  if (!options.length) {
    throw new Error(`Invariant violation: options should always have length > 0`);
  }

  if (options.length === 1) {
    return options[0];
  }

  return Writers.intersectionType(...(options as [WriterFunction, WriterFunction]));
}
function createLiteralWriterFunction(value: string): WriterFunction {
  return (writer: CodeBlockWriter) => writer.write(value);
}

type ObjectWriter =
  | {
      [key: string]: ObjectWriter | ObjectWriter[] | WriterFunction | undefined;
    }
  | ObjectWriter[]
  | WriterFunction
  | boolean
  | null
  | number
  | string;

function createUnionTypeWriterFunction(options: WriterFunction[]): WriterFunction {
  if (!options.length) {
    throw new Error(`Invariant violation: options should always have length > 0`);
  }

  if (options.length === 1) {
    return options[0];
  }

  return Writers.unionType(...(options as [WriterFunction, WriterFunction]));
}

function createValidatorWriterFunction(
  validatorClass: string,
  options: ObjectWriter
): WriterFunction {
  const flattenedOptions = flattenWriters(options);

  return (writer) => {
    writer.write(`new ${validatorClass}(`);
    flattenedOptions(writer);
    writer.write(`)`);
  };
}

function flattenWriters(options: ObjectWriter): WriterFunction {
  if (typeof options === 'function') {
    return options;
  }

  if (typeof options === 'boolean') {
    return createLiteralWriterFunction(JSON.stringify(options));
  }

  if (options === null) {
    return createLiteralWriterFunction(JSON.stringify(options));
  }

  if (typeof options === 'number') {
    return createLiteralWriterFunction(JSON.stringify(options));
  }

  if (typeof options === 'string') {
    return createLiteralWriterFunction(options);
  }

  if (Array.isArray(options)) {
    const childWriterFns = options.map(flattenWriters);

    return (writer) => {
      writer.write('[');
      for (let i = 0; i < childWriterFns.length; i++) {
        if (i > 0) {
          writer.write(', ');
        }

        childWriterFns[i](writer);
      }
      writer.write(']');
    };
  }

  const childWriterFns: { [key: string]: WriterFunction } = {};

  for (const key in options) {
    const child = options[key];
    if (child) {
      childWriterFns[key] = flattenWriters(child);
    }
  }

  return Writers.object(childWriterFns);
}
