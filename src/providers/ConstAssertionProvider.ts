import { JSONSchema7 } from 'json-schema';
import { LiteralAssertion } from '../assertions/LiteralAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';

export class ConstAssertionProvider implements IAssertionProvider {
  readonly name = ConstAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.const) {
      return;
    }

    return new LiteralAssertion(schema.const);
  }
}
