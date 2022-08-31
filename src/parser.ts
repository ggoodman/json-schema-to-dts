import {
  IndentationText,
  ModuleKind,
  NewLineKind,
  Project,
  QuoteKind,
  ScriptTarget,
} from 'ts-morph';
import { URL } from 'url';
import { IParserDiagnostic, ParserDiagnosticKind } from './diagnostics';
import {
  AnyType,
  BooleanSchemaNode,
  ISchemaNode,
  ITypingContext,
  SchemaNode,
  SchemaNodeOptions,
} from './nodes';
import { IParserContext, ParserContext } from './parserContext';
import { IReference } from './references';
import { CoreSchemaMetaSchema } from './schema';
import { JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from './types';

interface ParserCompileOptions {
  /**
   * The type name for schemas that are functionally equivalent to TypeScript's `any`
   * or `unknown` type.
   */
  anyType?: AnyType;

  /**
   * Skip emitting a `@see` directive when generating doc comments on schemas having
   * an `$id` property.
   */
  omitIdComments?: boolean;

  /**
   * Declaration options for the top-level schemas in each added schema file.
   */
  topLevel?: ParserCompileTypeOptions;

  /**
   * Declaration options for the sub-schemas depended-upon by the top-level schemas.
   */
  lifted?: ParserCompileTypeOptions;

  shouldOmitTypeEmit?(
    node: ISchemaNode<CoreSchemaMetaSchema>,
    parentNode: ISchemaNode<CoreSchemaMetaSchema>
  ): boolean;
}

interface ParserCompileTypeOptions {
  hasDeclareKeyword?: boolean;
  isExported?: boolean;
}

interface AddSchemaOptions {
  preferredName?: string;
}

interface GenerateDeconflictedNameOptions {
  preferredName?: string;
}

const alwaysEmit = () => true;

export class Parser {
  private readonly ctx = new ParserContext();
  private readonly uriToTypeName = new Map<string, string>();
  private readonly uriByTypeName = new Map<string, string>();
  private readonly rootNodes = new Map<string, ISchemaNode>();

  addSchema(uri: string, schema: JSONSchema7Definition, options: AddSchemaOptions = {}) {
    const node = this.ctx.enterUri(uri, schema, parseSchemaDefinition);
    const name = this.generateDeconflictedName(node, { preferredName: options.preferredName });
    this.rootNodes.set(uri, node);

    return name;
  }

  compile(options: ParserCompileOptions = {}) {
    const diagnostics = this.checkReferences();
    const text = this.generateTypings(options);

    return {
      diagnostics,
      text,
    };
  }

  private checkReferences(): IParserDiagnostic[] {
    const diagnostics: IParserDiagnostic[] = [];

    for (const reference of this.ctx.references) {
      const node = this.ctx.getSchemaByReference(reference);

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

    return diagnostics;
  }

  private generateDeconflictedName(
    node: ISchemaNode,
    options: GenerateDeconflictedNameOptions = {}
  ): string {
    const cached = this.uriToTypeName.get(node.uri);

    if (cached) {
      return cached;
    }

    let candidate: string = options.preferredName ? toSafeString(options.preferredName) : '';

    if (!candidate) {
      if (typeof node.schema !== 'boolean' && node.schema.title) {
        candidate = toSafeString(node.schema.title);
      } else {
        const url = new URL(node.uri);
        const matches = url.hash.match(/^#\/(?:\w+\/)*(\w+)$/);

        if (matches && matches[1]) {
          candidate = toSafeString(matches[1]);
        } else {
          candidate = toSafeString(
            new URL((node.schema as JSONSchema7).$id || node.uri).pathname.replace(/\.[\w\.]*$/, '')
          );
        }
      }
    }

    if (!candidate) {
      candidate = 'AnonymousSchema';
    }

    if (this.uriByTypeName.has(candidate)) {
      let suffix = 0;
      const baseName = candidate;

      for (
        candidate = `${baseName}${suffix++}`;
        this.uriByTypeName.has(candidate);
        candidate = `${baseName}${suffix++}`
      );
    }

    this.uriToTypeName.set(node.uri, candidate);
    this.uriByTypeName.set(candidate, node.uri);

    return candidate;
  }

  private getNodeByReference(ref: IReference): ISchemaNode {
    let node = this.ctx.nodesByUri.get(ref.toUri) || this.ctx.nodesByUri.get(ref.toBaseUri);

    if (!node) {
      const schema = this.ctx.getSchemaByReference(ref);

      if (schema) {
        node = this.ctx.enterUri(ref.toUri, schema, parseSchemaDefinition);
      }
    }

    if (!node) {
      throw new Error(
        `Missing schema for the reference ${JSON.stringify(ref.ref)} at ${JSON.stringify(
          ref.fromUri
        )} that resolved to ${JSON.stringify(ref.toUri)}.`
      );
    }

    return node;
  }

  private generateTypings(options: ParserCompileOptions) {
    const liftedTypes = new Map<string, ISchemaNode>();
    const shouldOmitTypeEmit = options.shouldOmitTypeEmit;
    const ctx: ITypingContext = {
      anyType: options.anyType || 'JSONValue',
      getNameForReference: (ref: IReference) => {
        const node = this.getNodeByReference(ref);
        const name = this.generateDeconflictedName(node);

        liftedTypes.set(name, node);

        return name;
      },
      shouldEmitTypes: shouldOmitTypeEmit
        ? (node, parentNode) => !shouldOmitTypeEmit(node, parentNode)
        : alwaysEmit,
    };

    const project = new Project({
      compilerOptions: {
        alwaysStrict: true,
        declaration: true,
        downlevelIteration: true,
        esModuleInterop: true,
        isolatedModules: true,
        lib: ['esnext'],
        module: ModuleKind.CommonJS,
        removeComments: true,
        strict: true,
        suppressExcessPropertyErrors: true,
        target: ScriptTarget.ES2018,
      },
      useInMemoryFileSystem: true,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        useTrailingCommas: true,
        newLineKind: NewLineKind.LineFeed,
        quoteKind: QuoteKind.Single,
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
      },
    });
    const sourceFile = project.createSourceFile(
      'schema.ts',
      ctx.anyType === 'JSONValue'
        ? `
type JSONPrimitive = boolean | null | number | string;
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };
      `.trim() + '\n'
        : ''
    );
    const printed = new Set<ISchemaNode>();

    for (const node of this.rootNodes.values()) {
      // Exported schemas should get first pick
      const name = this.generateDeconflictedName(node);
      const writerFunction = node.provideWriterFunction(ctx);
      const docs = node.provideDocs();

      sourceFile.addTypeAlias({
        name,
        docs: docs ? [docs] : undefined,
        type: writerFunction,
        isExported: options.topLevel?.isExported ?? true,
        hasDeclareKeyword: options.topLevel?.hasDeclareKeyword ?? false,
      });

      printed.add(node);
    }

    for (const [name, node] of liftedTypes) {
      if (!printed.has(node)) {
        printed.add(node);

        const writerFunction = node.provideWriterFunction(ctx);
        const docs = node.provideDocs();

        sourceFile.addTypeAlias({
          name,
          docs: docs ? [docs] : undefined,
          type: writerFunction,
          isExported: options.lifted?.isExported ?? options.topLevel?.isExported ?? true,
          hasDeclareKeyword:
            options.lifted?.hasDeclareKeyword ?? options.topLevel?.hasDeclareKeyword ?? false,
        });
      }
    }

    return sourceFile.print();
  }
}

function hasAnyProperty<T, K extends keyof T>(value: T, ...keys: K[]): boolean {
  for (const key of keys) {
    if (key in value) return true;
  }

  return false;
}

function parseSchemaDefinition(ctx: IParserContext, schema: JSONSchema7Definition): ISchemaNode {
  return ctx.enterSchemaNode(schema, () =>
    typeof schema === 'boolean'
      ? new BooleanSchemaNode(ctx.uri, ctx.baseUri, schema, undefined)
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
  } else {
    if (hasAnyProperty(schema, 'maxItems', 'minItems', 'uniqueItems', 'contains')) {
      parseNodeForType('array');
    }
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

  return new SchemaNode(ctx.uri, ctx.baseUri, schema, o);
}

function toSafeString(str: string) {
  return (
    str
      .replace(/(^\s*[^a-zA-Z_$])|([^a-zA-Z_$\d])/g, ' ')
      // uppercase leading underscores followed by lowercase
      .replace(/^_[a-z]/g, (match) => match.toUpperCase())
      // remove non-leading underscores followed by lowercase (convert snake_case)
      .replace(/_[a-z]/g, (match) => match.substr(1, match.length).toUpperCase())
      // uppercase letters after digits, dollars
      .replace(/([\d$]+[a-zA-Z])/g, (match) => match.toUpperCase())
      // uppercase first letter after whitespace
      .replace(/\s+([a-zA-Z])/g, (match) => match.toUpperCase())
      // remove remaining whitespace
      .replace(/\s/g, '')
      .replace(/^[a-z]/, (match) => match.toUpperCase())
  );
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
  if (typeof additionalProperties !== 'undefined' && additionalProperties !== false) {
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
