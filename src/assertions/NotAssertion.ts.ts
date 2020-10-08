import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

export class NotAssertion extends BaseAssertion {
  private readonly assertion: IAssertion;

  constructor(assertion: IAssertion) {
    super(NotAssertion.name, [...assertion.consumesProperties]);

    this.assertion = assertion;
  }
}
