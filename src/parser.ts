import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import { IParserDiagnostic, ParserDiagnosticKind } from './diagnostics';
import { BooleanSchemaNode, ISchemaNode, SchemaNode, SchemaNodeOptions } from './nodes';
import { IParserContext, ParserContext } from './parserContext';

export interface ParseResult {
  diagnostics: IParserDiagnostic[];
  nodes: Map<string, ISchemaNode>;
  schemas: Map<string, JSONSchema7Definition>;
}

export function parse(schemas: { schema: JSONSchema7Definition; uri: string }[]): ParseResult {
  const ctx = new ParserContext();
  const nodes: ISchemaNode[] = [];
  const diagnostics: IParserDiagnostic[] = [];

  for (const { schema, uri } of schemas) {
    nodes.push(ctx.enterUri(uri, schema, parseSchemaDefinition));
  }

  for (const reference of ctx.references) {
    const node = ctx.getSchemaByReference(reference);

    if (typeof node === 'undefined') {
      diagnostics.push({
        code: 'EUNRESOLVED',
        severity: ParserDiagnosticKind.Error,
        message: `Missing schema for the reference ${JSON.stringify(
          reference.ref
        )} at ${JSON.stringify(reference.fromUri)} that resolved to ${JSON.stringify(
          reference.toUri
        )}.`,
        uri: reference.fromUri,
        baseUri: reference.fromBaseUri,
      });
    }
  }

  return {
    diagnostics,
    nodes: ctx.nodesByUri,
    schemas: ctx.schemasByUri,
  };
}

function parseSchemaDefinition(ctx: IParserContext, schema: JSONSchema7Definition): ISchemaNode {
  return ctx.enterSchemaNode(schema, () =>
    typeof schema === 'boolean'
      ? new BooleanSchemaNode(ctx.uri, ctx.baseUri, schema)
      : parseSchema(ctx, schema)
  );
}

function parseSchema(ctx: IParserContext, schema: JSONSchema7): ISchemaNode {
  const o: SchemaNodeOptions = {};
  if (typeof schema.$id !== 'undefined') o.$id = schema.$id;
  if (typeof schema.$ref !== 'undefined') o.$ref = ctx.createReference(schema.$ref);
  if (typeof schema.$schema !== 'undefined') o.$schema = schema.$schema;
  if (typeof schema.$comment !== 'undefined') o.$comment = schema.$comment;
  if (typeof schema.type !== 'undefined') o.type = schema.type;
  if (typeof schema.enum !== 'undefined') o.enum = schema.enum;
  if (typeof schema.const !== 'undefined') o.const = schema.const;
  if (typeof schema.format !== 'undefined') o.format = schema.format;
  if (typeof schema.contentMediaType !== 'undefined') o.contentMediaType = schema.contentMediaType;
  if (typeof schema.contentEncoding !== 'undefined') o.contentEncoding = schema.contentEncoding;
  if (typeof schema.title !== 'undefined') o.title = schema.title;
  if (typeof schema.description !== 'undefined') o.description = schema.description;
  if (typeof schema.default !== 'undefined') o.default = schema.default;
  if (typeof schema.readOnly !== 'undefined') o.readOnly = schema.readOnly;
  if (typeof schema.writeOnly !== 'undefined') o.writeOnly = schema.writeOnly;
  if (typeof schema.examples !== 'undefined') o.examples = schema.examples;

  // 1. Depth-first traversal
  const parseNodeForType = (typeName: JSONSchema7TypeName) => {
    switch (typeName) {
      case 'array': {
        visitAsArray(ctx, schema, o);
        break;
      }
      case 'boolean': {
        // Nothing special
        break;
      }
      case 'integer': {
        visitAsNumber(ctx, schema, o);
        break;
      }
      case 'object': {
        visitAsObject(ctx, schema, o);
        break;
      }
      case 'number': {
        visitAsNumber(ctx, schema, o);
        break;
      }
      case 'null': {
        // Nothing special
        break;
      }
      case 'string': {
        visitAsString(ctx, schema, o);
        break;
      }
    }
  };

  if (Array.isArray(schema.type)) {
    for (const typeName of schema.type) {
      parseNodeForType(typeName);
    }
  } else if (schema.type) {
    parseNodeForType(schema.type);
  }

  if (typeof schema.if !== 'undefined') ctx.enterPath(['if'], schema.if, parseSchemaDefinition);
  if (typeof schema.then !== 'undefined')
    ctx.enterPath(['then'], schema.then, parseSchemaDefinition);
  if (typeof schema.else !== 'undefined')
    ctx.enterPath(['else'], schema.else, parseSchemaDefinition);

  if (typeof schema.allOf !== 'undefined') {
    o.allOf = schema.allOf.map((item, idx) =>
      ctx.enterPath(['allOf', idx.toString()], item, parseSchemaDefinition)
    );
  }

  if (typeof schema.anyOf !== 'undefined') {
    o.anyOf = schema.anyOf.map((item, idx) =>
      ctx.enterPath(['anyOf', idx.toString()], item, parseSchemaDefinition)
    );
  }

  if (typeof schema.oneOf !== 'undefined') {
    o.oneOf = schema.oneOf.map((item, idx) =>
      ctx.enterPath(['oneOf', idx.toString()], item, parseSchemaDefinition)
    );
  }

  // TODO: Need to propagate negation context because of special 'require' semantics
  if (typeof schema.not !== 'undefined')
    o.not = ctx.enterPath(['not'], schema.not, parseSchemaDefinition);

  if (typeof schema.definitions !== 'undefined') {
    o.definitions = {};
    for (const key in schema.definitions) {
      o.definitions[key] = ctx.enterPath(
        ['definitions', key],
        schema.definitions[key],
        parseSchemaDefinition
      );
    }
  }

  return new SchemaNode(ctx.uri, ctx.baseUri, o);
}

function visitAsArray(ctx: IParserContext, schema: JSONSchema7, o: SchemaNodeOptions) {
  if (typeof schema.maxItems !== 'undefined') o.maxItems = schema.maxItems;
  if (typeof schema.minItems !== 'undefined') o.minItems = schema.minItems;
  if (typeof schema.uniqueItems !== 'undefined') o.uniqueItems = schema.uniqueItems;

  const items = schema.items;
  if (typeof items !== 'undefined') {
    if (Array.isArray(items)) {
      o.items = items.map((item, idx) =>
        ctx.enterPath(['items', idx.toString()], item, parseSchemaDefinition)
      );
    } else {
      o.items = ctx.enterPath(['items'], items, parseSchemaDefinition);
    }
  }

  const additionalItems = schema.additionalItems;
  if (typeof additionalItems !== 'undefined') {
    o.additionalItems = ctx.enterPath(['additionalItems'], additionalItems, parseSchemaDefinition);
  }

  const contains = schema.contains;
  if (typeof contains !== 'undefined') {
    o.contains = ctx.enterPath(['contains'], contains, parseSchemaDefinition);
  }
}

function visitAsObject(ctx: IParserContext, schema: JSONSchema7, o: SchemaNodeOptions) {
  if (typeof schema.maxProperties !== 'undefined') o.maxProperties = schema.maxProperties;
  if (typeof schema.minProperties !== 'undefined') o.minProperties = schema.minProperties;
  if (typeof schema.required !== 'undefined') o.required = schema.required;

  const properties = schema.properties;
  if (typeof properties !== 'undefined') {
    o.properties = {};
    for (const key in properties) {
      o.properties[key] = ctx.enterPath(
        ['properties', key],
        properties[key],
        parseSchemaDefinition
      );
    }
  }

  const patternProperties = schema.patternProperties;
  if (typeof patternProperties !== 'undefined') {
    o.patternProperties = {};
    for (const key in patternProperties) {
      o.patternProperties[key] = ctx.enterPath(
        ['patternProperties', key],
        patternProperties[key],
        parseSchemaDefinition
      );
    }
  }

  const additionalProperties = schema.additionalProperties;
  if (typeof additionalProperties !== 'undefined') {
    o.additionalProperties = ctx.enterPath(
      ['additionalProperties'],
      additionalProperties,
      parseSchemaDefinition
    );
  }

  const dependencies = schema.dependencies;
  if (typeof dependencies !== 'undefined') {
    o.dependencies = {};
    for (const key in dependencies) {
      const value = dependencies[key];
      o.dependencies[key] = Array.isArray(value)
        ? value
        : ctx.enterPath(['dependencies', key], value, parseSchemaDefinition);
    }
  }

  const propertyNames = schema.propertyNames;
  if (typeof propertyNames !== 'undefined') {
    o.propertyNames = ctx.enterPath(['propertyNames'], propertyNames, parseSchemaDefinition);
  }
}

function visitAsNumber(_ctx: IParserContext, schema: JSONSchema7, o: SchemaNodeOptions) {
  if (typeof schema.multipleOf !== 'undefined') o.multipleOf = schema.multipleOf;
  if (typeof schema.maximum !== 'undefined') o.maximum = schema.maximum;
  if (typeof schema.exclusiveMaximum !== 'undefined') o.exclusiveMaximum = schema.exclusiveMaximum;
  if (typeof schema.minimum !== 'undefined') o.minimum = schema.minimum;
  if (typeof schema.exclusiveMinimum !== 'undefined') o.exclusiveMinimum = schema.exclusiveMinimum;
}

function visitAsString(_ctx: IParserContext, schema: JSONSchema7, o: SchemaNodeOptions) {
  if (typeof schema.maxLength !== 'undefined') o.maxLength = schema.maxLength;
  if (typeof schema.minLength !== 'undefined') o.minLength = schema.minLength;
  if (typeof schema.pattern !== 'undefined') o.pattern = schema.pattern;
}
