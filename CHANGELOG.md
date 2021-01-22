# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Add support for passing a `preferredName` for the generated type when calling `.addSchema` in a new `options` argument. If the preferred name is already taken, the returned type name will be `<preferredName><ordinalCounterValue>`. #2

[unreleased]: https://github.com/Author/Repository/compare/v1.2.0...HEAD
