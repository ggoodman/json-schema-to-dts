# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- The type used for open-ended schemas can be passed via the `anyType` option in the Partser's `generateTypings` method.
  
  Some use-cases may demand strict typing for values whose shape cannot be known a priori, in which case `"unknown"` would be a good fit. In other cases, a consumer of an object typed using this library might find it helpful to know that only JSON-serializable values can be present. In that case, the `"JSONValue"` option would be suitable. Finally, in cases where consumers of the type definitions may want minimal friction from the type-checker, `"any"` might be the best choice.

## 1.3.0 - 2021-01-22
### Added
- Add support for passing a `preferredName` for the generated type when calling `.addSchema` in a new `options` argument. If the preferred name is already taken, the returned type name will be `<preferredName><ordinalCounterValue>`. [#2]

[#2]: https://github.com/ggoodman/json-schema-to-dts/issues/2

[Unreleased]: https://github.com/ggoodman/json-schema-to-dts/compare/v1.3.0...HEAD
