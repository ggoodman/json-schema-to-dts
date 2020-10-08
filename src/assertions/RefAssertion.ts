import { BaseAssertion } from './BaseAssertion';

export class RefAssertion extends BaseAssertion {
  constructor(name: string) {
    super(RefAssertion.name, ['$ref'], {
      typeWriter: (writer) => writer.write(name),
    });
  }
}
