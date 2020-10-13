import { JSONSchema7 } from 'json-schema';

abstract class Codec<T> {
  abstract assertValid(value: unknown): asserts value is T;

  protected assertValidInternal(validator: IValidator, value: unknown): asserts value is T {
    //@ts-ignore
    // TODO: Actually make this
    const ctx: IValidatorContext = {};

    validator.assert(ctx, value);
  }
}

interface IValidatorContext {
  applyValidatorToChild(key: string, validator: IValidator): void;

  assertionFailure(
    assertionKey: keyof JSONSchema7,
    value: unknown,
    message: string
  ): AssertionFailure;
}

interface IValidator {
  assert(ctx: IValidatorContext, value: unknown): void;
}

class AssertionFailure {
  private static tag = Symbol('assertionFailure');

  static isAssertionFailure(v: unknown) {
    return v && (v as AssertionFailure).tag === AssertionFailure.tag;
  }

  private readonly tag = AssertionFailure.tag;
}

class AllOfValidator implements IValidator {
  constructor(private readonly validators: IValidator[]) {}

  assert(ctx: IValidatorContext, value: unknown) {
    for (const validator of this.validators) {
      validator.assert(ctx, value);
    }
  }
}

class AnyOfValidator implements IValidator {
  constructor(private readonly validators: IValidator[]) {}

  assert(ctx: IValidatorContext, value: unknown) {
    const failures: AssertionFailure[] = [];

    for (const validator of this.validators) {
      try {
        validator.assert(ctx, value);
        break;
      } catch (e) {
        if (!AssertionFailure.isAssertionFailure(e)) {
          throw e;
        }

        failures.push(e);

        if (failures.length >= this.validators.length) {
          throw ctx.assertionFailure('anyOf', value, `Value did not match any valid sub-schema`);
        }
      }
    }
  }
}

class ArrayTypeValidator implements IValidator {
  constructor(options: any) {}
  assert(ctx: IValidatorContext, value: unknown) {}
}

class BooleanTypeValidator implements IValidator {
  assert(ctx: IValidatorContext, value: unknown) {
    if (typeof value !== 'boolean') {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected value to be of type "boolean", received ${JSON.stringify(typeof value)}`
      );
    }
  }
}

class ConstantValidator implements IValidator {
  constructor(private isValid: boolean) {}
  assert(ctx: IValidatorContext, value: unknown) {
    if (!this.isValid) {
      throw ctx.assertionFailure('true' as any, value, `This schema is never valid`);
    }
  }
}

class DeferredReferenceValidator implements IValidator {
  private validator: IValidator;

  constructor(validatorFactory: () => IValidator) {
    this.validator = validatorFactory();
  }
  assert(ctx: IValidatorContext, value: unknown) {
    this.validator.assert(ctx, value);
  }
}

class OneOfValidator implements IValidator {
  constructor(private readonly validators: IValidator[]) {}

  assert(ctx: IValidatorContext, value: unknown) {
    const failures: AssertionFailure[] = [];

    let validCount = 0;

    for (const validator of this.validators) {
      try {
        validator.assert(ctx, value);

        validCount++;

        if (validCount > 1) {
          throw ctx.assertionFailure(
            'oneOf',
            value,
            `Value matched 2 sub-schemas instead of exactly 1`
          );
        }
      } catch (e) {
        if (!AssertionFailure.isAssertionFailure(e)) {
          throw e;
        }
        failures.push(e);
      }
    }

    if (validCount !== 1) {
      throw ctx.assertionFailure(
        'anyOf',
        value,
        `Value matched ${validCount} sub-schemas instead of exactly 1`
      );
    }
  }
}

class NumberTypeValidator implements IValidator {
  constructor(
    private readonly options: {
      type: 'integer' | 'number';
      multipleOf?: number;
      maximum?: number;
      exclusiveMaximum?: number;
      minimum?: number;
      exclusiveMinimum?: number;
    }
  ) {}

  assert(ctx: IValidatorContext, value: unknown) {
    // First do a typeof check since later checks might actually print the value in an
    // `AssertionFailure`. We don't want to accidentally include large objects in there
    // so we assert first on type such that later we already know we're dealing with a
    // (printable) number.
    if (typeof value !== 'number') {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected value to be "number" but got ${JSON.stringify(typeof value)}}`
      );
    }

    if (!Number.isFinite(value)) {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected value to be finite but got ${String(value)}}`
      );
    }

    const o = this.options;

    if (o.type === 'integer' && !Number.isInteger(value)) {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected value to be an integer but got ${JSON.stringify(value)}`
      );
    }

    if (isInteger(o.multipleOf) && value % o.multipleOf !== 0) {
      throw ctx.assertionFailure(
        'multipleOf',
        value,
        `Expected value to be a multiple of ${JSON.stringify(
          o.multipleOf
        )} but got ${JSON.stringify(value)}`
      );
    }

    if (isInteger(o.maximum) && value > o.maximum) {
      throw ctx.assertionFailure(
        'maximum',
        value,
        `Expected value to be a maximum of ${JSON.stringify(o.maximum)} but got ${JSON.stringify(
          value
        )}`
      );
    }

    if (isInteger(o.exclusiveMaximum) && value >= o.exclusiveMaximum) {
      throw ctx.assertionFailure(
        'exclusiveMaximum',
        value,
        `Expected value to be less than ${JSON.stringify(
          o.exclusiveMaximum
        )} but got ${JSON.stringify(value)}`
      );
    }

    if (isInteger(o.minimum) && value < o.minimum) {
      throw ctx.assertionFailure(
        'minimum',
        value,
        `Expected value to be a minimum of ${JSON.stringify(o.minimum)} but got ${JSON.stringify(
          value
        )}`
      );
    }

    if (isInteger(o.exclusiveMinimum) && value <= o.exclusiveMinimum) {
      throw ctx.assertionFailure(
        'exclusiveMinimum',
        value,
        `Expected value to be greater than ${JSON.stringify(
          o.exclusiveMinimum
        )} but got ${JSON.stringify(value)}`
      );
    }
  }
}

class ObjectTypeValidator implements IValidator {
  constructor(
    private readonly options: {
      maxProperties?: number;
      minProperties?: number;
      required?: string[];
      properties?: {
        [key: string]: IValidator;
      };
      patternProperties?: {
        [key: string]: IValidator;
      };
      additionalProperties?: IValidator;
      dependencies?: {
        [key: string]: IValidator | string[];
      };
      propertyNames?: IValidator;
    }
  ) {}

  assert(ctx: IValidatorContext, value: unknown) {
    if (typeof value !== 'object' || !value) {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected type to be "object", received ${JSON.stringify(typeof value)}`
      );
    }

    const o = this.options;
    const keys = new Set(Object.keys(value));
    const unconsumedKeys = new Set(keys);

    if (isInteger(o.maxProperties) && keys.size <= o.maxProperties) {
      throw ctx.assertionFailure(
        'maxProperties',
        value,
        `Property count of ${JSON.stringify(keys.size)} is greater than maximum of ${
          o.maxProperties
        }`
      );
    }

    if (isInteger(o.minProperties) && keys.size <= o.minProperties) {
      throw ctx.assertionFailure(
        'minProperties',
        value,
        `Property count of ${JSON.stringify(keys.size)} is less than minimum of ${o.minProperties}`
      );
    }

    if (Array.isArray(o.required)) {
      for (const required of o.required) {
        if (!keys.has(required)) {
          throw ctx.assertionFailure(
            'required',
            value,
            `Missing required property ${JSON.stringify(required)}`
          );
        }
      }
    }

    if (o.properties) {
      for (const key in o.properties) {
        const validator = o.properties[key];

        if (key in value) {
          ctx.applyValidatorToChild(key, validator);
          unconsumedKeys.delete(key);
        }
      }
    }

    if (o.patternProperties) {
      for (const pattern in o.patternProperties) {
        const re = new RegExp(pattern);

        for (const key in value) {
          if (re.test(key)) {
            const validator = o.patternProperties[pattern];

            ctx.applyValidatorToChild(key, validator);
            unconsumedKeys.delete(key);
          }
        }
      }
    }

    if (o.dependencies) {
      for (const key in o.dependencies) {
        const dependency = o.dependencies[key];

        if (keys.has(key)) {
          if (Array.isArray(dependency)) {
            for (const required of dependency) {
              if (!keys.has(required)) {
                throw ctx.assertionFailure(
                  'dependencies',
                  value,
                  `The property ${JSON.stringify(
                    required
                  )} is required when the property ${JSON.stringify(key)} is set`
                );
              }
            }
          } else {
            // TODO: Handle SCHEMA dependencies
          }
        }
      }
    }

    if (o.additionalProperties) {
      for (const key of unconsumedKeys) {
        ctx.applyValidatorToChild(key, o.additionalProperties);
      }
    }

    if (o.propertyNames) {
      for (const key of keys) {
        o.propertyNames.assert(ctx, key);
      }
    }
  }
}

class StringTypeValidator implements IValidator {
  constructor(
    private readonly options: {
      maxLength?: number;
      minLength?: number;
      pattern?: string;
    }
  ) {}

  assert(ctx: IValidatorContext, value: unknown) {
    if (typeof value !== 'string') {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected type to be "string", received typeof ${JSON.stringify(typeof value)}`
      );
    }

    const o = this.options;

    if (isInteger(o.maxLength) && value.length > o.maxLength) {
      throw ctx.assertionFailure(
        'maxLength',
        value,
        `Received string whose length of ${JSON.stringify(
          value.length
        )} is longer than the maximum of ${JSON.stringify(o.maxLength)}`
      );
    }

    if (isInteger(o.minLength) && value.length < o.minLength) {
      throw ctx.assertionFailure(
        'minLength',
        value,
        `Received string whose length of ${JSON.stringify(
          value.length
        )} is shorter than the maximum of ${JSON.stringify(o.minLength)}`
      );
    }

    if (typeof o.pattern === 'string' && o.pattern) {
      const rx = new RegExp(o.pattern);

      if (!rx.test(value)) {
        throw ctx.assertionFailure(
          'pattern',
          value,
          `String received did not match the required pattern ${JSON.stringify(o.pattern)}`
        );
      }
    }
  }
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}
