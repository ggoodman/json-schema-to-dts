import { JSONSchema7 } from 'json-schema';
import { BooleanAssertion } from '../assertions/BooleanAssertion';
import { OneOfAssertion } from '../assertions/OneOfAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { BaseAssertionProvider } from './BaseAssertionProvider';

export class OneOfAssertionProvider extends BaseAssertionProvider {
  readonly name = OneOfAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7) {
    if (!schema.allOf || !schema.allOf.length) {
      return;
    }

    const assertions: IAssertion[] = [];

    for (const def of schema.allOf) {
      let assertion =
        typeof def === 'boolean' ? new BooleanAssertion(def) : ctx.provideAssertionForSchema(def);

      assertions.push(assertion);
    }

    return new OneOfAssertion(assertions);
  }
}
