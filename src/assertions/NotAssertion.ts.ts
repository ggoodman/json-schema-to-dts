import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

export class NotAssertion extends BaseAssertion {
  constructor(assertion: IAssertion) {
    super(NotAssertion.name, [...assertion.consumesProperties]);
  }
}
