import { JSONSchema7 } from 'json-schema';
import { NoopAssertion } from '../assertions/NoopAssertion';
import { DanglingRefDiagnostic } from '../diagnostics/DanglingRefDiagnostic';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';

export class IdAssertionProvider implements IAssertionProvider {
  readonly name = IdAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.$id) {
      return;
    }

    const id = ctx.resolveReference(schema.$id);

    ctx.registerSchema(id, schema);

    const resolved = ctx.declareReference(id);

    if (typeof resolved === 'undefined') {
      ctx.addDiagnostic(new DanglingRefDiagnostic(ctx.uri, id));
    }

    return new NoopAssertion(['$id']);
  }
}
