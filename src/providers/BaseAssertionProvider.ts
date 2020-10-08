import { IAssertionProvider } from '../IAssertionProvider';
import { IAssertion } from '../IAssertion';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { JSONSchema7 } from 'json-schema';

export abstract class BaseAssertionProvider implements IAssertionProvider {
  abstract readonly name: string;

  abstract provideAssertion(
    ctx: IAssertionProviderContext,
    schema: JSONSchema7
  ): IAssertion | undefined;
}
