# require-in-the-middle changelog

## Unreleased

- Fix hooking of 'http2' with Node.js versions [8.0, 8.8) where the 'http2'
  built-in module was behind the `--expose-http2` flag. Release v7.0.0
  introduced a bug with this case. The process would crash with:

    ```
    AssertionError [ERR_ASSERTION]: unexpected that there is no Module entry for "http2" in require.cache
      at ExportsCache.set (.../require-in-the-middle4/index.js:72:7)
    ```

## v7.0.0

- Change the suggested require usage to be a `Hook` field on the exports,

  ```js
  const { Hook } = require('require-in-the-middle');  // the new suggested way
  ```

  rather than the default export:

  ```js
  const Hook = require('require-in-the-middle');  // deprecated, still supported for backward compat
  ```

  This is to avoid the need for users to use a [*default* export](https://www.typescriptlang.org/docs/handbook/declaration-files/templates/module-d-ts.html#default-exports)
  which can get confusing or problematic with TypeScript. See
  https://github.com/open-telemetry/opentelemetry-js/issues/3701 for some
  details.

- Change the suggested usage to `new Hook(...)` instead of `Hook(...)`, but
  both are supported.

- Use the Node.js `require.cache` for caching the exports returned from a
  Hook's `onrequire`. This allows users to delete entries from `require.cache`
  to trigger a re-load (and re-run of the hook's `onrequire`) of a module the
  next time it is required -- as mentioned at
  https://nodejs.org/docs/latest/api/all.html#all_modules_requirecache
  (https://github.com/elastic/require-in-the-middle/issues/61)

- (SEMVER-MAJOR) Remove the `hook.cache` field. In earlier versions this was
  available and some tests used it. However it was never a documented field.

- If resolving the filename for a `require(...)` fails, defer to the wrapped
  require implementation rather than failing right away. This allows a
  possibly-monkey-patched `require` to do its own special thing.
  (https://github.com/elastic/require-in-the-middle/pull/59)

## v6.0.0

- Drop Node.js 6 support. New minimum supported Node.js version is 8.6.0.
  (This is the minimum supported Node.js version for elastic-apm-node@3 that uses
  this module.)
- Add testing of Node.js 19.
- Rename default branch from `master` to `main`.
- Should there be a need to do 5.x maintenance releases there is a
  [5.x branch](https://github.com/elastic/require-in-the-middle/tree/5.x).

## v5.2.0

- Add support for hooking into the require of Node core modules prefixed with
  'node:', e.g. `require('node:http')`. See https://nodejs.org/api/modules.html#core-modules
  (https://github.com/elastic/require-in-the-middle/pull/53)

## v5.1.0

- Add support for hooking into require of absolute paths.
  (https://github.com/elastic/require-in-the-middle/issues/43)

## earlier versions

Use the [source](https://github.com/elastic/require-in-the-middle/commits/), Luke.
