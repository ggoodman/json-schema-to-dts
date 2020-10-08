import { JSONSchema7 } from 'json-schema';
import { RefAssertion } from '../assertions/RefAssertion';
import { DanglingRefDiagnostic } from '../diagnostics/DanglingRefDiagnostic';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';

export class RefAssertionProvider implements IAssertionProvider {
  readonly name = RefAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.$ref) {
      return;
    }

    const resolved = ctx.resolveRef(schema.$ref);

    if (!resolved) {
      ctx.addDiagnostic(new DanglingRefDiagnostic(ctx.uri, schema.$ref));
      return;
    }

    return new RefAssertion(resolved.name);
  }
}
