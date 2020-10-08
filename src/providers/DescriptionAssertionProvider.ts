import { JSONSchema7 } from 'json-schema';
import { DescriptionAssertion } from '../assertions/DescriptionAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { BaseAssertionProvider } from './BaseAssertionProvider';

export class DescriptionAssertionProvider extends BaseAssertionProvider {
  readonly name = DescriptionAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (schema.description) {
      return new DescriptionAssertion(schema.description);
    }
  }
}
