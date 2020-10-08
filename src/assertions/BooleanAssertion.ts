import { BaseAssertion } from './BaseAssertion';

export class BooleanAssertion extends BaseAssertion {
  constructor(readonly constraint: boolean) {
    super(BooleanAssertion.name, [], {
      typeWriter: (writer) => writer.write(constraint ? 'any' : 'never'),
    });
  }
}
