type JSONSchema7Key =
  | '$id'
  | '$ref'
  | '$schema'
  | '$comment'
  | 'type'
  | 'enum'
  | 'const'
  | 'multipleOf'
  | 'maximum'
  | 'exclusiveMaximum'
  | 'minimum'
  | 'exclusiveMinimum'
  | 'maxLength'
  | 'minLength'
  | 'pattern'
  | 'items'
  | 'additionalItems'
  | 'maxItems'
  | 'minItems'
  | 'uniqueItems'
  | 'contains'
  | 'maxProperties'
  | 'minProperties'
  | 'required'
  | 'properties'
  | 'patternProperties'
  | 'additionalProperties'
  | 'dependencies'
  | 'propertyNames'
  | 'if'
  | 'then'
  | 'else'
  | 'allOf'
  | 'anyOf'
  | 'oneOf'
  | 'not'
  | 'format'
  | 'contentMediaType'
  | 'contentEncoding'
  | 'definitions'
  | 'title'
  | 'description'
  | 'default'
  | 'readOnly'
  | 'writeOnly'
  | 'examples';

interface IValidatorContext {
  applyValidatorToChild(key: string, validator: IValidator): void;

  assertionFailure(assertionKey: JSONSchema7Key, value: unknown, message: string): AssertionFailure;
}

interface IValidator {
  assert(ctx: IValidatorContext, value: unknown): void;
}

class ValidatorContext implements IValidatorContext {
  private readonly path: string[] = [];

  constructor(private value: unknown) {}

  applyValidatorToChild(key: string, validator: IValidator) {
    const value = this.value;

    if (typeof value === 'undefined') {
      throw new Error(`Invariant violation: Unexpected undefined value in validation context`);
    }

    this.path.push(key);
    this.value = (value as any)[key];

    validator.assert(this, this.value);

    this.path.pop();
    this.value = value;
  }

  assertionFailure(
    assertionKey: JSONSchema7Key,
    value: unknown,
    message: string
  ): AssertionFailure {
    return new AssertionFailure(assertionKey, message, this.path.slice(), value);
  }
}

class Codec<T> {
  /**
   * @internal
   */
  public readonly validator: IValidator;

  constructor(validator: IValidator) {
    this.validator = validator;
  }

  assertValid(value: unknown): asserts value is T {
    const ctx = new ValidatorContext(value);

    this.validator.assert(ctx, value);
  }
}

class AssertionFailure {
  private static tag = Symbol('assertionFailure');

  static isAssertionFailure(v: unknown): v is AssertionFailure {
    return v && (v as AssertionFailure).tag === AssertionFailure.tag;
  }

  private readonly tag = AssertionFailure.tag;

  constructor(
    readonly assertion: JSONSchema7Key,
    readonly message: string,
    readonly path: string[],
    readonly value: unknown
  ) {}
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
  constructor(
    private readonly options: {
      items?: IValidator;
      maxItems?: number;
      minItems?: number;
      uniqueItems?: boolean;
      contains?: IValidator;
    }
  ) {}

  assert(ctx: IValidatorContext, value: unknown) {
    if (!Array.isArray(value)) {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected value to be "array" but got ${JSON.stringify(typeof value)}`
      );
    }

    const o = this.options;

    if (isInteger(o.maxItems) && value.length > o.maxItems) {
      throw ctx.assertionFailure(
        'maxItems',
        value,
        `Array length of ${value.length} must be less than or equal to maximum of ${o.maxItems}`
      );
    }

    if (isInteger(o.minItems) && value.length < o.minItems) {
      throw ctx.assertionFailure(
        'minItems',
        value,
        `Array length of ${value.length} must be greater than or equal to minimum of ${o.minItems}`
      );
    }

    if (o.items) {
      for (let i = 0; i < value.length; i++) {
        try {
          ctx.applyValidatorToChild(String(i), o.items);
        } catch (err) {
          if (!AssertionFailure.isAssertionFailure(err)) {
            throw err;
          }

          throw ctx.assertionFailure(
            'items',
            value,
            `Array item at index ${i} did not match expected schema: ${err.message}`
          );
        }
      }
    }

    if (o.contains) {
      const failures: AssertionFailure[] = [];

      for (let i = 0; i < value.length; i++) {
        try {
          ctx.applyValidatorToChild(String(i), o.contains);

          break;
        } catch (err) {
          if (!AssertionFailure.isAssertionFailure(err)) {
            throw err;
          }

          failures.push(err);
        }
      }

      if (failures.length >= value.length) {
        throw ctx.assertionFailure(
          'contains',
          value,
          `The array did not contain any items matching the required schema`
        );
      }
    }

    if (o.uniqueItems) {
      for (let i = 0; i < value.length; i++) {
        for (let j = i + 1; j < value.length; j++) {
          if (isDeepEqual(value[i], value[j])) {
            throw ctx.assertionFailure(
              'uniqueItems',
              value,
              `Array items must be unique but values at indexes ${i} and ${j} are equal`
            );
          }
        }
      }
    }
  }
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
  private validator: IValidator | undefined;

  constructor(private readonly validatorFactory: () => IValidator) {}
  assert(ctx: IValidatorContext, value: unknown) {
    if (typeof this.validator === 'undefined') {
      this.validator = this.validatorFactory();
    }
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
    if (typeof value !== 'object' || !value || Array.isArray(value)) {
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
            for (const dependentKey in o.dependencies) {
              if (typeof (value as any)[dependentKey] !== 'undefined') {
                const validator = o.dependencies[dependentKey] as IValidator;

                try {
                  validator.assert(ctx, value);
                } catch (err) {
                  if (!AssertionFailure.isAssertionFailure(err)) {
                    throw err;
                  }

                  throw ctx.assertionFailure(
                    'dependencies',
                    value,
                    `The value failed to match the schema imposed by the dependency on the property ${JSON.stringify(
                      dependentKey
                    )}: ${err.message}`
                  );
                }
              }
            }
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

class TupleValidator implements IValidator {
  constructor(
    private readonly options: {
      items?: IValidator[];
      additionalItems?: IValidator;
    }
  ) {}

  assert(ctx: IValidatorContext, value: unknown) {
    if (!Array.isArray(value)) {
      throw ctx.assertionFailure(
        'type',
        value,
        `Expected type to be "array", received typeof ${JSON.stringify(typeof value)}`
      );
    }

    const o = this.options;
    let i = 0;

    if (o.items) {
      for (; i < o.items.length; i++) {
        const v = value[i];

        if (typeof v === 'undefined') {
          throw ctx.assertionFailure('items', value, `Missing required array item at index ${i}`);
        }

        const validator = o.items[i];

        try {
          ctx.applyValidatorToChild(String(i), validator);
        } catch (err) {
          if (!AssertionFailure.isAssertionFailure(err)) {
            throw err;
          }

          throw ctx.assertionFailure(
            'items',
            value,
            `Array item at index ${i} failed validation: ${err.message}`
          );
        }
      }
    }

    if (o.additionalItems) {
      for (; i < value.length; i++) {
        const v = value[i];

        try {
          ctx.applyValidatorToChild(String(i), o.additionalItems);
        } catch (err) {
          if (!AssertionFailure.isAssertionFailure(err)) {
            throw err;
          }

          throw ctx.assertionFailure(
            'additionalItems',
            value,
            `Array item at index ${i} failed validation: ${err.message}`
          );
        }
      }
    }
  }
}

type JSONPrimitive = boolean | null | number | string;
type JSONValue = JSONPrimitive | { [key: string]: JSONValue } | JSONValue[];

function isDeepEqual(l: JSONValue, r: JSONValue): boolean {
  const lType = typeof l;
  const rType = typeof r;

  if (lType !== rType) return false;

  // typeof is equal for both values
  switch (lType) {
    case 'boolean':
    case 'number':
    case 'string':
      return l === r;
    case 'object':
      if (l === null) return l === r;

      if (Array.isArray(l)) {
        if (!Array.isArray(r)) return false;
        if (l.length !== r.length) return false;

        for (let i = 0; i < l.length; i++) {
          if (!isDeepEqual(l[i], r[i])) return false;
        }

        return true;
      }

      for (const key in l as { [key: string]: JSONValue }) {
        if (typeof (r as { [key: string]: JSONValue }) === 'undefined') return false;

        if (
          !isDeepEqual(
            (l as { [key: string]: JSONValue })[key],
            (r as { [key: string]: JSONValue })[key]
          )
        )
          return false;
      }

      return true;
    // Fallback that 'should never be hit'
    default:
      return l === r;
  }
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}
