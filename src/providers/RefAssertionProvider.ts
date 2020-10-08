import { JSONSchema7 } from 'json-schema';
import { RefAssertion } from '../assertions/RefAssertion';
import { DanglingRefDiagnostic } from '../diagnostics/DanglingRefDiagnostic';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { uriAppendFragmentPath } from '../uri';

export class RefAssertionProvider implements IAssertionProvider {
  readonly name = RefAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.$ref) {
      return;
    }

    const assertion = ctx.provideAssertionForRef(schema.$ref);

    if (!assertion) {
      ctx.addDiagnostic(new DanglingRefDiagnostic(ctx.uri, schema.$ref));
      return;
    }

    return new RefAssertion(assertion);
  }
}
