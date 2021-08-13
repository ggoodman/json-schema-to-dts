# json-schema-to-dts

Convert JSON Schema definitions into accurate (as possible) TypeScript
definitions, specifying how the main schema types and lifted sub-schemas should
be declared / exported.

## Example

Given the schema

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "The name of an object" },
    "not_annotated": { "type": "null" },
    "command": {
      "oneOf": [
        { "const": "a constant!" },
        { "enum": ["multiple", { "options": "are allowed" }] }
      ]
    }
  }
}
```

And these options:

```ts
const options = {
  topLevel: {
    isExported: true,
  },
};
```

We get the following result:

```ts
type JSONPrimitive = boolean | null | number | string;
type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | {
    [key: string]: JSONValue;
  };
export type Test = {
  /** The name of an object */
  name?: string;
  not_annotated?: null;
  command?:
    | "a constant!"
    | (
      | "multiple"
      | {
        options: "are allowed";
      }
    );
};
```

## API

### `new Parser()`

Produce a new `Parser` instance.

#### `.addSchema(uri, schema)`

Add a schema to the parser where:

- `uri` - is a string representing the schema's uri (ie:
  `file:///path/to/schema.json`)
- `schema` - is the json object representation of the schema

#### `.compile(options)`

Compile all added schemas where:

- `topLevel` - options for root schemas
  - `hasDeclareKeyword` - _(optional)_ mark the type declaration as `declare`
  - `isExported` - _(optional)_ `export` the type declaration
- `lifted` - options for sub-schemas that have been lifted during compilation
  - `hasDeclareKeyword` - _(optional)_ mark the type declaration as `declare`
  - `isExported` - _(optional)_ `export` the type declaration
- `sourceFile` - _(optional)_ existing source file to add the types to

Returns an object `{ diagnostics, text }` where:

- `diagnostics` - is an array of diagnostics
- `text` - is the resulting typescript definitions
