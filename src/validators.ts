interface IContext {
  readonly path: ReadonlyArray<string>;

  diagnostic(code: string, assertionMessage: string): IDiagnostic;

  enter(pathSegment: string, fn: () => void): void;
}

interface IDiagnostic {
  code: string;
  path: string;
}

type Validator = (ctx: IContext, v: unknown) => true | IDiagnostic;
type ValidatorFactory = (...args: any[]) => Validator;

const makeAllOf: ValidatorFactory = (validators: Validator[]) => (ctx, v) => {
  for (const validator of validators) {
    if (validator(ctx, v) !== true) {
      return ctx.diagnostic('EALLOF', 'value did not all required schemas');
    }
  }

  return true;
};

const makeAnyOf: ValidatorFactory = (validators: Validator[]) => (ctx, v) => {
  let lastResult: true | IDiagnostic = true;

  for (const validator of validators) {
    lastResult = validator(ctx, v);

    if (lastResult === true) {
      return true;
    }
  }

  return ctx.diagnostic('EANYOF', 'value did not match any allowed alternatives');
};

const makeOneOf: ValidatorFactory = (validators: Validator[]) => (ctx, v) => {
  let validCount = 0;

  for (const validator of validators) {
    const result = validator(ctx, v);

    if (result === true) {
      validCount += 1;

      if (validCount > 1) break;
    }
  }

  return (
    validCount === 1 ||
    ctx.diagnostic('EONEOF', `value matched ${validCount} alternatives instead of exactly 1`)
  );
};

const isString = (v: unknown) => typeof v === 'string';
const isNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const isTruthy = (v: unknown) => !!v;

const makeType: ValidatorFactory = (typeName: string, typePred: (v: unknown) => boolean) => (
  ctx,
  v
) => typePred(v) || ctx.diagnostic('ETYPE', `value is a ${typeName}`);

const makeMinLength: ValidatorFactory = (minLength: number) => (ctx, v) =>
  (v as string).length >= minLength ||
  ctx.diagnostic('EMINLENGTH', `value has minimum length of ${minLength}`);

const makeMaxLength: ValidatorFactory = (maxLength: number) => (ctx, v) =>
  (v as string).length <= maxLength ||
  ctx.diagnostic('EMAXLENGTH', `value has maximum length of ${maxLength}`);

const makePattern: ValidatorFactory = (pattern: string) => (ctx, v) => {
  switch (pattern) {
    default:
      return ctx.diagnostic('EPATTERN', `unknown pattern ${JSON.stringify(pattern)}`);
  }
};

interface ObjectValidatorOptions {
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  properties?: { [key: string]: Validator };
  patternProperties?: { [key: string]: Validator };
  additionalProperties?: Validator;
  dependencies?: { [key: string]: string[] | Validator };
  propertyNames?: Validator;
}

const makeObject: ValidatorFactory = (options: ObjectValidatorOptions) => (ctx, v) => {
  const required = new Map<string, Array<(key: string, value: unknown) => boolean>>();

  // Step 1: Apply dependencies
  if (options.dependencies) {
    for (const key in options.dependencies) {
      const constraint = options.dependencies[key];

      if (Array.isArray(constraint)) {
        for (const dependentProperty of constraint) {
          let dependentPropertyConstraints = required.get(dependentProperty);

          if (!dependentPropertyConstraints) {
            dependentPropertyConstraints = [];
            required.set(dependentProperty, dependentPropertyConstraints);
          }

          dependentPropertyConstraints.push(isTruthy);
        }
      } else {
        // TODO: Handle dependent schemas
      }
    }
  }

  if (options.r) return true;
};
