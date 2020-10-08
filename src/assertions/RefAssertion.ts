import { IAssertion } from '../IAssertion';
import { BaseAssertion } from './BaseAssertion';

export class RefAssertion extends BaseAssertion {
  constructor(private readonly assertion: IAssertion) {
    super(RefAssertion.name, ['$ref']);
  }
}
