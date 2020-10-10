import { JSONSchema7 } from 'json-schema';
import { BaseAssertion } from './BaseAssertion';

export class NoopAssertion extends BaseAssertion {
  constructor(consumesProperties: Array<keyof JSONSchema7>) {
    super(NoopAssertion.name, consumesProperties);
  }
}
