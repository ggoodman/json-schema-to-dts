import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';
import { AnyOfAssertion } from '../assertions/AnyOfAssertion';
import { ArrayTypeAssertion } from '../assertions/ArrayTypeAssertion';
import { BooleanAssertion } from '../assertions/BooleanAssertion';
import { BooleanTypeAssertion } from '../assertions/BooleanTypeAssertion';
import { IntegerTypeAssertion } from '../assertions/IntegerTypeAssertion';
import { NullTypeAssertion } from '../assertions/NullTypeAssertion';
import { NumberTypeAssertion } from '../assertions/NumberTypeAssertion';
import { ObjectTypeAssertion } from '../assertions/ObjectTypeAssertion';
import { StringTypeAssertion } from '../assertions/StringTypeAssertion';
import { IAssertion } from '../IAssertion';
import { IAssertionProviderContext } from '../IAssertionProviderContext';
import { BaseAssertionProvider } from './BaseAssertionProvider';

export class TypeAssertionProvider extends BaseAssertionProvider {
  readonly name = TypeAssertionProvider.name;

  provideAssertion(ctx: IAssertionProviderContext, schema: JSONSchema7): IAssertion | undefined {
    if (!schema.type) {
      return;
    }

    if (Array.isArray(schema.type)) {
      const options: IAssertion[] = [];

      for (const type of schema.type) {
        options.push(this.provideAssertionForSingleType(ctx, schema, type));
      }

      if (options.length > 1) {
        return new AnyOfAssertion(options);
      } else {
        return options[0];
      }
    }

    return this.provideAssertionForSingleType(ctx, schema, schema.type);
  }

  private provideAssertionForSingleType(
    ctx: IAssertionProviderContext,
    schema: JSONSchema7,
    typeName: JSONSchema7TypeName
  ) {
    switch (typeName) {
      case 'array':
        return this.provideAssertionForArray(ctx, schema);
      case 'boolean':
        return new BooleanTypeAssertion();
      case 'integer':
        return new IntegerTypeAssertion(schema);
      case 'null':
        return new NullTypeAssertion();
      case 'number':
        return new NumberTypeAssertion(schema);
      case 'object':
        return this.provideAssertionForObject(ctx, schema);
      case 'string':
        return new StringTypeAssertion(schema);
    }

    throw new Error(`Unexpected value for "schema.type": ${JSON.stringify(schema.type)}`);
  }

  private provideAssertionForArray(ctx: IAssertionProviderContext, schema: JSONSchema7) {
    let itemsAssertion: IAssertion | undefined = undefined;
    let enumItemsAssertions: IAssertion[] = [];
    let additionalItemsAssertion: IAssertion | undefined = undefined;

    if (schema.items) {
      if (typeof schema.items === 'boolean') {
        itemsAssertion = new BooleanAssertion(schema.items);
      } else if (Array.isArray(schema.items)) {
        for (const item of schema.items) {
          if (typeof item === 'boolean') {
            enumItemsAssertions.push(new BooleanAssertion(item));
          } else {
            const assertion = ctx.provideAssertionForSchema(item);

            if (assertion) {
              enumItemsAssertions.push(assertion);
            }
          }
        }

        if (typeof schema.additionalItems === 'boolean') {
          additionalItemsAssertion = new BooleanAssertion(schema.additionalItems);
        } else if (schema.additionalItems) {
          additionalItemsAssertion = ctx.provideAssertionForSchema(schema.additionalItems);
        }
      } else {
        itemsAssertion = ctx.provideAssertionForSchema(schema.items) || new BooleanAssertion(true);
      }
    }

    return new ArrayTypeAssertion({
      additionalItemsAssertion,
      constraints: schema,
      enumItemsAssertions,
      itemsAssertion,
    });
  }

  private provideAssertionForObject(ctx: IAssertionProviderContext, schema: JSONSchema7) {
    const knownPropertyAssertions: { [propertyName: string]: IAssertion } = {};
    const patternPropertyAssertions: { [pattern: string]: IAssertion } = {};
    let additionalPropertyAssertion: IAssertion | undefined = undefined;

    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === 'boolean') {
        additionalPropertyAssertion = new BooleanAssertion(schema.additionalProperties);
      } else {
        additionalPropertyAssertion = ctx.provideAssertionForSchema(schema.additionalProperties);
      }
    }

    if (schema.properties) {
      const properties = schema.properties;

      for (const propertyName in properties) {
        const def = properties[propertyName];
        let assertion: IAssertion | undefined;

        if (typeof def === 'boolean') {
          assertion = new BooleanAssertion(def);
        } else {
          assertion = ctx.provideAssertionForSchema(def) || new BooleanAssertion(true);
        }

        knownPropertyAssertions[propertyName] = assertion;
      }
    }

    if (schema.patternProperties) {
      const patternProperties = schema.patternProperties;

      for (const pattern in patternProperties) {
        const def = patternProperties[pattern];
        let assertion: IAssertion;

        if (typeof def === 'boolean') {
          assertion = new BooleanAssertion(def);
        } else {
          assertion = ctx.provideAssertionForSchema(def) || new BooleanAssertion(true);
        }

        patternPropertyAssertions[pattern] = assertion;
      }
    }

    return new ObjectTypeAssertion({
      additionalPropertyAssertion,
      requiredProperties: schema.required || [],
      allowAdditionalProperties: schema.additionalProperties !== false,
      knownPropertyAssertions,
    });
  }
}
