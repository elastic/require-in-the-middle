# require-in-the-middle changelog

## v6.0.0

- Drop node v6 support.
- Add testing of node v19.
- Rename default branch from "master" to "main".
- Should there be a need to do 5.x maintenance releases there is a
  [5.x branch](https://github.com/elastic/require-in-the-middle/tree/5.x).


## v5.2.0

- Add support for hooking into the require of Node core modules prefixed with
  'node:', e.g. `require('node:http')`. See https://nodejs.org/api/modules.html#core-modules
  https://github.com/elastic/require-in-the-middle/pull/53

## v5.1.0

- Add support for hooking into require of absolute paths.
  https://github.com/elastic/require-in-the-middle/issues/43

## earlier versions

Use the [source](https://github.com/elastic/require-in-the-middle/commits/), Luke.
