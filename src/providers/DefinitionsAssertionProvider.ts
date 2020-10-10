import { JSONSchema7 } from 'json-schema';
import { URL } from 'url';
import { NoopAssertion } from '../assertions/NoopAssertion';
import { DanglingRefDiagnostic } from '../diagnostics/DanglingRefDiagnostic';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';

export class DefinitionsAssertionProvider implements IAssertionProvider {
  readonly name = DefinitionsAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (schema.definitions && typeof schema.definitions === 'object') {
      const baseUrl = new URL(ctx.uri);

      if (!baseUrl.hash) {
        baseUrl.hash = '#';
      }

      const baseUri = baseUrl.href;

      for (const key in schema.definitions) {
        const childUrl = new URL(baseUri);

        childUrl.hash += `/definitions/${key}`;

        const id = childUrl.href;

        // ctx.registerSchema(id, schema.definitions[key] as any);

        const resolved = ctx.declareReference(id);

        if (typeof resolved === 'undefined') {
          ctx.addDiagnostic(new DanglingRefDiagnostic(ctx.uri, id));
        }
      }

      return new NoopAssertion(['definitions']);
    }
  }
}
