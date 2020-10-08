import { BaseAssertion } from './BaseAssertion';

export class NullTypeAssertion extends BaseAssertion {
  constructor() {
    super(NullTypeAssertion.name, ['type'], {
      typeWriter: (writer) => writer.write('null'),
    });
  }
}
