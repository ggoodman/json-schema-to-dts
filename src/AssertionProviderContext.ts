import { JSONSchema7 } from 'json-schema';
import { AllOfAssertion } from './assertions/AllOfAssertion';
import { BooleanAssertion } from './assertions/BooleanAssertion';
import { SchemaAssertion } from './assertions/SchemaAssertion';
import { UnknownPropertiesDiagnostic } from './diagnostics/UnknownPropertiesDiagnostic';
import { IAssertion } from './IAssertion';
import { IAssertionProvider } from './IAssertionProvider';
import { IAssertionProviderContext } from './IAssertionProviderContext';
import { IDiagnostic } from './IDiagnostic';
import { uriRelative } from './uri';

export interface AssertionProviderContextOptions {
  assertionCache?: Map<JSONSchema7, IAssertion>;
  assertionProviders: IAssertionProvider[];
  schemas: ReadonlyMap<string, JSONSchema7>;
  uri: string;
}

export class AssertionProviderContext implements IAssertionProviderContext {
  readonly assertionCache: Map<JSONSchema7, IAssertion>;
  readonly assertionProviders: IAssertionProvider[];
  readonly diagnostics: IDiagnostic[] = [];
  readonly schemas: ReadonlyMap<string, JSONSchema7>;
  readonly uri: string;

  constructor(options: AssertionProviderContextOptions) {
    this.assertionCache = options.assertionCache || new Map();
    this.assertionProviders = options.assertionProviders;
    this.schemas = options.schemas;
    this.uri = options.uri;
  }

  addDiagnostic(diagnostic: IDiagnostic) {
    this.diagnostics.push(diagnostic);
  }

  provideAssertionForRef(ref: string): IAssertion | undefined {
    // TODO: Major simplification that does no resolution
    const uri = uriRelative(this.uri, ref);
    const schema = this.schemas.get(uri);

    if (!schema) {
      return;
    }

    return this.provideAssertionForSchema(schema, uri);
  }

  provideAssertionForSchema(schema: JSONSchema7, uri?: string): IAssertion {
    let assertion = this.assertionCache.get(schema);

    if (!assertion) {
      const childCtx = new AssertionProviderContext({
        assertionCache: this.assertionCache,
        assertionProviders: this.assertionProviders,
        schemas: this.schemas,
        uri: uri ?? this.uri,
      });
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

      this.diagnostics.push(...childCtx.diagnostics);

      if (!assertions.length) {
        assertion = new BooleanAssertion(true);
      } else {
        assertion = new SchemaAssertion(schema, assertions);
      }

      this.assertionCache.set(schema, assertion);
    }

    return assertion;
  }
}
