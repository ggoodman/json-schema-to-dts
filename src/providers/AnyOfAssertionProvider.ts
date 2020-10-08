import { JSONSchema7 } from 'json-schema';
import { AnyOfAssertion } from '../assertions/AnyOfAssertion';
import { BooleanAssertion } from '../assertions/BooleanAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { BaseAssertionProvider } from './BaseAssertionProvider';

export class AnyOfAssertionProvider extends BaseAssertionProvider {
  readonly name = AnyOfAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7) {
    if (!schema.allOf || !schema.allOf.length) {
      return;
    }

    const assertions: IAssertion[] = [];

    for (const def of schema.allOf) {
      const assertion =
        typeof def === 'boolean' ? new BooleanAssertion(def) : ctx.provideAssertionForSchema(def);

      if (assertion) {
        assertions.push(assertion);
      }
    }

    return new AnyOfAssertion(assertions);
  }
}
