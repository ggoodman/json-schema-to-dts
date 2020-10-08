import { BaseAssertion } from './BaseAssertion';

export class BooleanTypeAssertion extends BaseAssertion {
  constructor() {
    super(BooleanTypeAssertion.name, ['type'], {
      typeWriter: (codeBlockWriter) => codeBlockWriter.write('boolean'),
    });
  }
}
