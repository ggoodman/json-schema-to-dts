import { JSONSchema7 } from 'json-schema';
import { IAssertion } from './IAssertion';
import { IAssertionProviderContext } from './IAssertionProviderContext';

export interface IAssertionProvider {
  readonly name: string;
  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined;
}
