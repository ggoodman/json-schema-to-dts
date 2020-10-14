"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleTypesCodec = exports.StringArrayCodec = exports.SchemaArrayCodec = exports.NonNegativeIntegerDefault0Codec = exports.NonNegativeIntegerCodec = exports.CoreSchemaMetaSchemaCodec = void 0;
class ValidatorContext {
    constructor(value) {
        this.value = value;
        this.path = [];
    }
    applyValidatorToChild(key, validator) {
        const value = this.value;
        if (typeof value === 'undefined') {
            throw new Error(`Invariant violation: Unexpected undefined value in validation context`);
        }
        this.path.push(key);
        this.value = value[key];
        validator.assert(this, this.value);
        this.path.pop();
        this.value = value;
    }
    assertionFailure(assertionKey, value, message) {
        return new AssertionFailure(assertionKey, message, this.path.slice(), value);
    }
}
class Codec {
    constructor(validator) {
        this.validator = validator;
    }
    assertValid(value) {
        const ctx = new ValidatorContext(value);
        this.validator.assert(ctx, value);
    }
}
class AssertionFailure {
    constructor(assertion, message, path, value) {
        this.assertion = assertion;
        this.message = message;
        this.path = path;
        this.value = value;
        this.tag = AssertionFailure.tag;
    }
    static isAssertionFailure(v) {
        return v && v.tag === AssertionFailure.tag;
    }
}
AssertionFailure.tag = Symbol('assertionFailure');
class AllOfValidator {
    constructor(validators) {
        this.validators = validators;
    }
    assert(ctx, value) {
        for (const validator of this.validators) {
            validator.assert(ctx, value);
        }
    }
}
class AnyOfValidator {
    constructor(validators) {
        this.validators = validators;
    }
    assert(ctx, value) {
        const failures = [];
        for (const validator of this.validators) {
            try {
                validator.assert(ctx, value);
                break;
            }
            catch (e) {
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
class ArrayTypeValidator {
    constructor(options) {
        this.options = options;
    }
    assert(ctx, value) {
        if (!Array.isArray(value)) {
            throw ctx.assertionFailure('type', value, `Expected value to be "array" but got ${JSON.stringify(typeof value)}`);
        }
        const o = this.options;
        if (isInteger(o.maxItems) && value.length > o.maxItems) {
            throw ctx.assertionFailure('maxItems', value, `Array length of ${value.length} must be less than or equal to maximum of ${o.maxItems}`);
        }
        if (isInteger(o.minItems) && value.length < o.minItems) {
            throw ctx.assertionFailure('minItems', value, `Array length of ${value.length} must be greater than or equal to minimum of ${o.minItems}`);
        }
        if (o.items) {
            for (let i = 0; i < value.length; i++) {
                try {
                    ctx.applyValidatorToChild(String(i), o.items);
                }
                catch (err) {
                    if (!AssertionFailure.isAssertionFailure(err)) {
                        throw err;
                    }
                    throw ctx.assertionFailure('items', value, `Array item at index ${i} did not match expected schema: ${err.message}`);
                }
            }
        }
        if (o.contains) {
            const failures = [];
            for (let i = 0; i < value.length; i++) {
                try {
                    ctx.applyValidatorToChild(String(i), o.contains);
                    break;
                }
                catch (err) {
                    if (!AssertionFailure.isAssertionFailure(err)) {
                        throw err;
                    }
                    failures.push(err);
                }
            }
            if (failures.length >= value.length) {
                throw ctx.assertionFailure('contains', value, `The array did not contain any items matching the required schema`);
            }
        }
        if (o.uniqueItems) {
            for (let i = 0; i < value.length; i++) {
                for (let j = i + 1; j < value.length; j++) {
                    if (isDeepEqual(value[i], value[j])) {
                        throw ctx.assertionFailure('uniqueItems', value, `Array items must be unique but values at indexes ${i} and ${j} are equal`);
                    }
                }
            }
        }
    }
}
class BooleanTypeValidator {
    assert(ctx, value) {
        if (typeof value !== 'boolean') {
            throw ctx.assertionFailure('type', value, `Expected value to be of type "boolean", received ${JSON.stringify(typeof value)}`);
        }
    }
}
class ConstantValidator {
    constructor(isValid) {
        this.isValid = isValid;
    }
    assert(ctx, value) {
        if (!this.isValid) {
            throw ctx.assertionFailure('true', value, `This schema is never valid`);
        }
    }
}
class DeferredReferenceValidator {
    constructor(validatorFactory) {
        this.validatorFactory = validatorFactory;
    }
    assert(ctx, value) {
        if (typeof this.validator === 'undefined') {
            this.validator = this.validatorFactory();
        }
        this.validator.assert(ctx, value);
    }
}
class OneOfValidator {
    constructor(validators) {
        this.validators = validators;
    }
    assert(ctx, value) {
        const failures = [];
        let validCount = 0;
        for (const validator of this.validators) {
            try {
                validator.assert(ctx, value);
                validCount++;
                if (validCount > 1) {
                    throw ctx.assertionFailure('oneOf', value, `Value matched 2 sub-schemas instead of exactly 1`);
                }
            }
            catch (e) {
                if (!AssertionFailure.isAssertionFailure(e)) {
                    throw e;
                }
                failures.push(e);
            }
        }
        if (validCount !== 1) {
            throw ctx.assertionFailure('anyOf', value, `Value matched ${validCount} sub-schemas instead of exactly 1`);
        }
    }
}
class NumberTypeValidator {
    constructor(options) {
        this.options = options;
    }
    assert(ctx, value) {
        if (typeof value !== 'number') {
            throw ctx.assertionFailure('type', value, `Expected value to be "number" but got ${JSON.stringify(typeof value)}}`);
        }
        if (!Number.isFinite(value)) {
            throw ctx.assertionFailure('type', value, `Expected value to be finite but got ${String(value)}}`);
        }
        const o = this.options;
        if (o.type === 'integer' && !Number.isInteger(value)) {
            throw ctx.assertionFailure('type', value, `Expected value to be an integer but got ${JSON.stringify(value)}`);
        }
        if (isInteger(o.multipleOf) && value % o.multipleOf !== 0) {
            throw ctx.assertionFailure('multipleOf', value, `Expected value to be a multiple of ${JSON.stringify(o.multipleOf)} but got ${JSON.stringify(value)}`);
        }
        if (isInteger(o.maximum) && value > o.maximum) {
            throw ctx.assertionFailure('maximum', value, `Expected value to be a maximum of ${JSON.stringify(o.maximum)} but got ${JSON.stringify(value)}`);
        }
        if (isInteger(o.exclusiveMaximum) && value >= o.exclusiveMaximum) {
            throw ctx.assertionFailure('exclusiveMaximum', value, `Expected value to be less than ${JSON.stringify(o.exclusiveMaximum)} but got ${JSON.stringify(value)}`);
        }
        if (isInteger(o.minimum) && value < o.minimum) {
            throw ctx.assertionFailure('minimum', value, `Expected value to be a minimum of ${JSON.stringify(o.minimum)} but got ${JSON.stringify(value)}`);
        }
        if (isInteger(o.exclusiveMinimum) && value <= o.exclusiveMinimum) {
            throw ctx.assertionFailure('exclusiveMinimum', value, `Expected value to be greater than ${JSON.stringify(o.exclusiveMinimum)} but got ${JSON.stringify(value)}`);
        }
    }
}
class ObjectTypeValidator {
    constructor(options) {
        this.options = options;
    }
    assert(ctx, value) {
        if (typeof value !== 'object' || !value || Array.isArray(value)) {
            throw ctx.assertionFailure('type', value, `Expected type to be "object", received ${JSON.stringify(typeof value)}`);
        }
        const o = this.options;
        const keys = new Set(Object.keys(value));
        const unconsumedKeys = new Set(keys);
        if (isInteger(o.maxProperties) && keys.size <= o.maxProperties) {
            throw ctx.assertionFailure('maxProperties', value, `Property count of ${JSON.stringify(keys.size)} is greater than maximum of ${o.maxProperties}`);
        }
        if (isInteger(o.minProperties) && keys.size <= o.minProperties) {
            throw ctx.assertionFailure('minProperties', value, `Property count of ${JSON.stringify(keys.size)} is less than minimum of ${o.minProperties}`);
        }
        if (Array.isArray(o.required)) {
            for (const required of o.required) {
                if (!keys.has(required)) {
                    throw ctx.assertionFailure('required', value, `Missing required property ${JSON.stringify(required)}`);
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
                                throw ctx.assertionFailure('dependencies', value, `The property ${JSON.stringify(required)} is required when the property ${JSON.stringify(key)} is set`);
                            }
                        }
                    }
                    else {
                        for (const dependentKey in o.dependencies) {
                            if (typeof value[dependentKey] !== 'undefined') {
                                const validator = o.dependencies[dependentKey];
                                try {
                                    validator.assert(ctx, value);
                                }
                                catch (err) {
                                    if (!AssertionFailure.isAssertionFailure(err)) {
                                        throw err;
                                    }
                                    throw ctx.assertionFailure('dependencies', value, `The value failed to match the schema imposed by the dependency on the property ${JSON.stringify(dependentKey)}: ${err.message}`);
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
class StringTypeValidator {
    constructor(options) {
        this.options = options;
    }
    assert(ctx, value) {
        if (typeof value !== 'string') {
            throw ctx.assertionFailure('type', value, `Expected type to be "string", received typeof ${JSON.stringify(typeof value)}`);
        }
        const o = this.options;
        if (isInteger(o.maxLength) && value.length > o.maxLength) {
            throw ctx.assertionFailure('maxLength', value, `Received string whose length of ${JSON.stringify(value.length)} is longer than the maximum of ${JSON.stringify(o.maxLength)}`);
        }
        if (isInteger(o.minLength) && value.length < o.minLength) {
            throw ctx.assertionFailure('minLength', value, `Received string whose length of ${JSON.stringify(value.length)} is shorter than the maximum of ${JSON.stringify(o.minLength)}`);
        }
        if (typeof o.pattern === 'string' && o.pattern) {
            const rx = new RegExp(o.pattern);
            if (!rx.test(value)) {
                throw ctx.assertionFailure('pattern', value, `String received did not match the required pattern ${JSON.stringify(o.pattern)}`);
            }
        }
    }
}
class TupleValidator {
    constructor(options) {
        this.options = options;
    }
    assert(ctx, value) {
        if (!Array.isArray(value)) {
            throw ctx.assertionFailure('type', value, `Expected type to be "array", received typeof ${JSON.stringify(typeof value)}`);
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
                }
                catch (err) {
                    if (!AssertionFailure.isAssertionFailure(err)) {
                        throw err;
                    }
                    throw ctx.assertionFailure('items', value, `Array item at index ${i} failed validation: ${err.message}`);
                }
            }
        }
        if (o.additionalItems) {
            for (; i < value.length; i++) {
                const v = value[i];
                try {
                    ctx.applyValidatorToChild(String(i), o.additionalItems);
                }
                catch (err) {
                    if (!AssertionFailure.isAssertionFailure(err)) {
                        throw err;
                    }
                    throw ctx.assertionFailure('additionalItems', value, `Array item at index ${i} failed validation: ${err.message}`);
                }
            }
        }
    }
}
function isDeepEqual(l, r) {
    const lType = typeof l;
    const rType = typeof r;
    if (lType !== rType)
        return false;
    switch (lType) {
        case 'boolean':
        case 'number':
        case 'string':
            return l === r;
        case 'object':
            if (l === null)
                return l === r;
            if (Array.isArray(l)) {
                if (!Array.isArray(r))
                    return false;
                if (l.length !== r.length)
                    return false;
                for (let i = 0; i < l.length; i++) {
                    if (!isDeepEqual(l[i], r[i]))
                        return false;
                }
                return true;
            }
            for (const key in l) {
                if (typeof r === 'undefined')
                    return false;
                if (!isDeepEqual(l[key], r[key]))
                    return false;
            }
            return true;
        default:
            return l === r;
    }
}
function isInteger(value) {
    return Number.isInteger(value);
}
exports.CoreSchemaMetaSchemaCodec = new Codec(new AnyOfValidator([new ObjectTypeValidator({
        properties: {
            $id: new StringTypeValidator({}),
            $schema: new StringTypeValidator({}),
            $ref: new StringTypeValidator({}),
            $comment: new StringTypeValidator({}),
            title: new StringTypeValidator({}),
            description: new StringTypeValidator({}),
            default: new ConstantValidator(true),
            readOnly: new BooleanTypeValidator(),
            writeOnly: new BooleanTypeValidator(),
            examples: new ArrayTypeValidator({
                items: new ConstantValidator(true)
            }),
            multipleOf: new NumberTypeValidator({ "type": "number", "exclusiveMinimum": 0 }),
            maximum: new NumberTypeValidator({ "type": "number" }),
            exclusiveMaximum: new NumberTypeValidator({ "type": "number" }),
            minimum: new NumberTypeValidator({ "type": "number" }),
            exclusiveMinimum: new NumberTypeValidator({ "type": "number" }),
            maxLength: new DeferredReferenceValidator(() => exports.NonNegativeIntegerCodec.validator),
            minLength: new DeferredReferenceValidator(() => exports.NonNegativeIntegerDefault0Codec.validator),
            pattern: new StringTypeValidator({}),
            additionalItems: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            items: new AnyOfValidator([new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator), new DeferredReferenceValidator(() => exports.SchemaArrayCodec.validator)]),
            maxItems: new DeferredReferenceValidator(() => exports.NonNegativeIntegerCodec.validator),
            minItems: new DeferredReferenceValidator(() => exports.NonNegativeIntegerDefault0Codec.validator),
            uniqueItems: new BooleanTypeValidator(),
            contains: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            maxProperties: new DeferredReferenceValidator(() => exports.NonNegativeIntegerCodec.validator),
            minProperties: new DeferredReferenceValidator(() => exports.NonNegativeIntegerDefault0Codec.validator),
            required: new DeferredReferenceValidator(() => exports.StringArrayCodec.validator),
            additionalProperties: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            definitions: new ObjectTypeValidator({
                additionalProperties: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator)
            }),
            properties: new ObjectTypeValidator({
                additionalProperties: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator)
            }),
            patternProperties: new ObjectTypeValidator({
                additionalProperties: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator)
            }),
            dependencies: new ObjectTypeValidator({
                additionalProperties: new AnyOfValidator([new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator), new DeferredReferenceValidator(() => exports.StringArrayCodec.validator)])
            }),
            propertyNames: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            const: new ConstantValidator(true),
            enum: new ArrayTypeValidator({
                minItems: 1,
                uniqueItems: true,
                items: new ConstantValidator(true)
            }),
            type: new AnyOfValidator([new DeferredReferenceValidator(() => exports.SimpleTypesCodec.validator), new ArrayTypeValidator({
                    minItems: 1,
                    uniqueItems: true,
                    items: new DeferredReferenceValidator(() => exports.SimpleTypesCodec.validator)
                })]),
            format: new StringTypeValidator({}),
            contentMediaType: new StringTypeValidator({}),
            contentEncoding: new StringTypeValidator({}),
            if: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            then: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            else: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator),
            allOf: new DeferredReferenceValidator(() => exports.SchemaArrayCodec.validator),
            anyOf: new DeferredReferenceValidator(() => exports.SchemaArrayCodec.validator),
            oneOf: new DeferredReferenceValidator(() => exports.SchemaArrayCodec.validator),
            not: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator)
        }
    }), new BooleanTypeValidator()]));
exports.NonNegativeIntegerCodec = new Codec(new NumberTypeValidator({ "type": "integer", "minimum": 0 }));
exports.NonNegativeIntegerDefault0Codec = new Codec(new AllOfValidator([new DeferredReferenceValidator(() => exports.NonNegativeIntegerCodec.validator), new ConstantValidator(true)]));
exports.SchemaArrayCodec = new Codec(new ArrayTypeValidator({
    minItems: 1,
    items: new DeferredReferenceValidator(() => exports.CoreSchemaMetaSchemaCodec.validator)
}));
exports.StringArrayCodec = new Codec(new ArrayTypeValidator({
    uniqueItems: true,
    items: new StringTypeValidator({})
}));
exports.SimpleTypesCodec = new Codec(new ConstantValidator(true));
