import { BaseAssertion } from './BaseAssertion';

export class DescriptionAssertion extends BaseAssertion {
  constructor(private readonly description: string) {
    super(DescriptionAssertion.name, ['description']);
  }
}
