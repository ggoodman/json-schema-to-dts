import { URL } from 'url';
import { IParserDiagnostic, ParserDiagnosticKind } from './diagnostics';
import { ISchemaNode } from './nodes';
import { IReference } from './references';
import { CoreSchemaMetaSchema } from './schema';
import { resolveRelativeJSONPath, resolveRelativeUri } from './uris';

export interface IParserContext {
  readonly diagnostics: IParserDiagnostic[];
  readonly baseUri: string;
  readonly uri: string;

  addDiagnostic(info: Pick<IParserDiagnostic, 'code' | 'message'>): void;

  createReference(ref: string): IReference;

  enterPath(
    path: [string, ...string[]],
    schema: CoreSchemaMetaSchema,
    fn: (ctx: IParserContext, schema: CoreSchemaMetaSchema) => ISchemaNode
  ): ISchemaNode;

  enterSchemaNode(schema: CoreSchemaMetaSchema, fn: () => ISchemaNode): ISchemaNode;
}

export class ParserContext implements IParserContext {
  baseUri: string = '';
  uri: string = '';

  readonly diagnostics: IParserDiagnostic[] = [];
  readonly schemasByUri = new Map<string, CoreSchemaMetaSchema>();
  readonly nodesByUri = new Map<string, ISchemaNode>();
  readonly references = new Set<IReference>();

  addDiagnostic(info: Pick<IParserDiagnostic, 'code' | 'message'>) {
    this.diagnostics.push({
      severity: ParserDiagnosticKind.Error,
      baseUri: this.baseUri,
      code: info.code,
      message: info.message,
      uri: this.uri,
    });
  }

  createReference(ref: string): IReference {
    const fromUri = this.uri;
    const fromBaseUri = this.baseUri;
    const toUri = resolveRelativeUri(fromUri, ref);
    const toBaseUri = resolveRelativeUri(fromBaseUri, ref);
    const reference = {
      ref,
      fromUri,
      fromBaseUri,
      toUri,
      toBaseUri,
    };

    this.references.add(reference);

    return reference;
  }

  enterUri(
    enteredUri: string,
    schema: CoreSchemaMetaSchema,
    fn: (ctx: IParserContext, schema: CoreSchemaMetaSchema) => ISchemaNode
  ) {
    const uri = this.uri;
    const baseUri = this.baseUri;

    this.uri = enteredUri;
    this.baseUri = enteredUri;

    const node = fn(this, schema);

    this.schemasByUri.set(this.uri, schema);

    this.uri = uri;
    this.baseUri = baseUri;

    return node;
  }

  enterPath(
    path: [string, ...string[]],
    schema: CoreSchemaMetaSchema,
    fn: (ctx: IParserContext, schema: CoreSchemaMetaSchema) => ISchemaNode
  ): ISchemaNode {
    const uri = this.uri;
    const baseUri = this.baseUri;

    this.uri = resolveRelativeJSONPath(uri, path);
    this.baseUri = resolveRelativeJSONPath(baseUri, path);

    const node = fn(this, schema);

    this.uri = uri;
    this.baseUri = baseUri;

    return node;
  }

  enterSchemaNode(schema: CoreSchemaMetaSchema, fn: () => ISchemaNode): ISchemaNode {
    const uri = this.uri;
    const baseUri = this.baseUri;

    if (typeof schema !== 'boolean' && schema.$id) {
      this.baseUri = resolveRelativeUri(baseUri, schema.$id);

      // The schema indicated that it wants to treat this as a 'location-independent' uri
      this.schemasByUri.set(this.baseUri, schema);
    }

    const node = fn();

    this.nodesByUri.set(this.uri, node);

    if (this.baseUri !== this.uri) {
      this.nodesByUri.set(this.baseUri, node);
    }

    this.uri = uri;
    this.baseUri = baseUri;

    return node;
  }

  getSchemaByReference(ref: IReference) {
    return this.getSchemaByUri(ref.toUri) || this.getSchemaByUri(ref.toBaseUri);
  }

  getSchemaByUri(uri: string) {
    const found = this.schemasByUri.get(uri);

    if (found) {
      return found;
    }

    const url = new URL(uri);
    const path = url.hash.startsWith('#/') ? url.hash.slice(2).split('/') : [];

    url.hash = '';

    const schemaUri = url.href;
    let schema = this.schemasByUri.get(schemaUri);

    while (schema && path.length) {
      const segment = path.shift()!;

      schema = (schema as any)[segment];
    }

    return schema;
  }
}
