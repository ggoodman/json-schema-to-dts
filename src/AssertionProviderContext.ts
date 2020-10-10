import { JSONSchema7 } from 'json-schema';
import { URL } from 'url';
import { SchemaAssertion } from './assertions/SchemaAssertion';
import { UnknownPropertiesDiagnostic } from './diagnostics/UnknownPropertiesDiagnostic';
import { DiagnosticSeverity } from './DiagnosticSeverity';
import { IAssertion } from './IAssertion';
import { IAssertionProvider } from './IAssertionProvider';
import {
  IAssertionProviderContext,
  ProvideAssertionForSchemaOptions,
} from './IAssertionProviderContext';
import { IDiagnostic } from './IDiagnostic';
import { uriRelative } from './uri';

export interface AssertionProviderContextOptions {
  baseUri: string;
  uri: string;
  assertionCache?: Map<JSONSchema7, IAssertion>;
  assertionsToName?: Map<IAssertion, string>;
  assertionsByName?: Map<string, IAssertion>;
  schemaToName?: Map<JSONSchema7, string>;
  schemaByName?: Map<string, JSONSchema7>;
  assertionProviders?: IAssertionProvider[];
  queue?: Array<{ schema: JSONSchema7; uri: string }>;
  diagnostics?: IDiagnostic[];
  schemaByUri: ReadonlyMap<string, JSONSchema7>;
}

export class AssertionProviderContext implements IAssertionProviderContext {
  private readonly assertionCache: Map<JSONSchema7, IAssertion>;
  private readonly assertionsToName: Map<IAssertion, string>;
  readonly assertionsByName: Map<string, IAssertion>;
  private readonly schemaToName: Map<JSONSchema7, string>;
  private readonly schemaByName: Map<string, JSONSchema7>;
  private readonly assertionProviders: IAssertionProvider[];
  readonly baseUri: string;
  readonly queue: Array<{ schema: JSONSchema7; uri: string }>;
  readonly seen = new Set<JSONSchema7>();
  readonly diagnostics: IDiagnostic[];
  readonly schemaByUri: Map<string, JSONSchema7>;
  readonly uri: string;

  constructor(options: AssertionProviderContextOptions) {
    this.baseUri = options.baseUri;
    this.uri = options.uri;
    this.assertionCache = options.assertionCache || new Map();
    this.assertionsToName = options.assertionsToName || new Map();
    this.assertionsByName = options.assertionsByName || new Map();
    this.schemaToName = options.schemaToName || new Map();
    this.schemaByName = options.schemaByName || new Map();
    this.assertionProviders = options.assertionProviders || [];
    this.queue = options.queue || [];
    this.diagnostics = options.diagnostics || [];
    this.schemaByUri = (options.schemaByUri as Map<string, JSONSchema7>) || new Map();
  }

  addDiagnostic(diagnostic: IDiagnostic) {
    this.diagnostics.push(diagnostic);
  }

  forUri(uri: string) {
    return new AssertionProviderContext({
      baseUri: this.baseUri,
      uri,
      assertionCache: this.assertionCache,
      assertionsToName: this.assertionsToName,
      assertionsByName: this.assertionsByName,
      schemaToName: this.schemaToName,
      schemaByName: this.schemaByName,
      assertionProviders: this.assertionProviders,
      queue: this.queue,
      diagnostics: this.diagnostics,
      schemaByUri: this.schemaByUri,
    });
  }

  declareReference(ref: string): { name: string; uri: string } | undefined {
    const uri = uriRelative(this.uri, ref);
    const url = new URL(uri);
    const hash = url.hash;

    url.hash = '';

    const baseUri = url.href;

    let schema = this.schemaByUri.get(baseUri);

    if (!schema) {
      return;
    }

    if (hash) {
      const path = hash.startsWith('#/') ? hash.slice(2).split('/') : hash.split('/');

      while (path.length) {
        const segment = path.shift()!;
        const child = (schema as any)[segment] as JSONSchema7 | undefined;

        if (typeof child === 'undefined') {
          return;
        }

        schema = child;
      }
    }

    this.queue.push({ schema, uri });

    const name = this.generateDeconflictedName(schema, { uri });

    return { name, uri };
  }

  provideAssertionForSchema(
    schema: JSONSchema7,
    options: ProvideAssertionForSchemaOptions = {}
  ): IAssertion | undefined {
    let assertion = this.assertionCache.get(schema);

    if (!assertion) {
      this.seen.add(schema);

      const uri = this.uri;
      const childCtx = uri === this.uri ? this : this.forUri(uri);
      const assertions: IAssertion[] = [];
      const unconsumedFields = new Set<string>(Object.keys(schema));

      for (const assertionProvider of this.assertionProviders) {
        const assertion = assertionProvider.provideAssertion(childCtx, schema);

        if (assertion) {
          for (const consumedField of assertion.consumesProperties) {
            unconsumedFields.delete(consumedField);
          }

          assertions.push(assertion);
        }
      }

      if (unconsumedFields.size) {
        childCtx.addDiagnostic(new UnknownPropertiesDiagnostic(childCtx.uri, unconsumedFields));
      }

      if (!assertions.length) {
        return;
      } else {
        assertion = new SchemaAssertion(schema, assertions);
      }

      this.assertionCache.set(schema, assertion);

      if (options.uri) {
        const name = this.generateDeconflictedName(schema, options);

        this.assertionsByName.set(name, assertion);
        this.assertionsToName.set(assertion, name);
      }
    }

    return assertion;
  }

  generateDeconflictedName(schema: JSONSchema7, options: { uri?: string } = {}) {
    const cached = this.schemaToName.get(schema);

    if (cached) {
      return cached;
    }

    let baseName: string;

    if (schema.title) {
      baseName = toSafeString(schema.title);
    } else {
      const uri = options.uri || schema.$id;

      if (uri) {
        const url = new URL(uri);
        const matches = url.hash.match(/^#\/(?:\w+\/)*(\w+)$/);

        if (matches && matches[1]) {
          baseName = toSafeString(matches[1]);
        } else {
          baseName = toSafeString(new URL(schema.$id || uri).pathname.replace(/\.[\w\.]*$/, ''));
        }
      } else {
        baseName = 'Schema';
      }
    }

    if (!this.schemaByName.has(baseName)) {
      this.schemaByName.set(baseName, schema);
      this.schemaToName.set(schema, baseName);

      return baseName;
    }

    let suffix = 0;

    while (true) {
      const name = `${baseName}${suffix}`;

      if (!this.schemaByName.has(name)) {
        this.schemaByName.set(name, schema);
        this.schemaToName.set(schema, name);

        return name;
      }

      suffix++;
    }
  }

  registerSchema(uri: string, schema: JSONSchema7) {
    const existingSchema = this.schemaByUri.get(uri);

    if (typeof existingSchema !== 'undefined' && existingSchema !== schema) {
      this.addDiagnostic({
        code: 'ESCHEMACONFLICT',
        message: `A second, different schema was registered at ${JSON.stringify(uri)}.`,
        severity: DiagnosticSeverity.Error,
        uri,
      });
      return;
    }

    this.schemaByUri.set(uri, schema);
  }

  resolveReference(ref: string) {
    return uriRelative(this.uri, ref);
  }
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
  );
}
