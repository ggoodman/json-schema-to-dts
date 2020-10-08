import { JSONSchema7 } from 'json-schema';
import { AnyOfAssertion } from '../assertions/AnyOfAssertion';
import { BooleanAssertion } from '../assertions/BooleanAssertion';
import { LiteralAssertion } from '../assertions/LiteralAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';

export class EnumAssertionProvider implements IAssertionProvider {
  readonly name = EnumAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.enum) {
      return;
    }

    if (!schema.enum.length) {
      return new BooleanAssertion(false);
    }

    return new AnyOfAssertion(schema.enum.map((value) => new LiteralAssertion(value)));
  }
}
