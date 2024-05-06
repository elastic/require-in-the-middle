# require-in-the-middle

Hook into the Node.js `require` function. This allows you to modify
modules on-the-fly as they are being required.

[![npm](https://img.shields.io/npm/v/require-in-the-middle.svg)](https://www.npmjs.com/package/require-in-the-middle)
[![Test status](https://github.com/elastic/require-in-the-middle/workflows/Test/badge.svg)](https://github.com/elastic/require-in-the-middle/actions)


## Installation

```
npm install require-in-the-middle --save
```

## Usage

```js
const path = require('path')
const { Hook } = require('require-in-the-middle')

// Hook into the express and mongodb module
new Hook(['express', 'mongodb'], function (exports, name, basedir) {
  const version = require(path.join(basedir, 'package.json')).version

  console.log('loading %s@%s', name, version)

  // expose the module version as a property on its exports object
  exports._version = version

  // whatever you return will be returned by `require`
  return exports
})
```

## API

The require-in-the-middle module exposes a single function:

### `hook = new Hook([modules][, options], onrequire)`

When called a `hook` object is returned.

Arguments:

- `modules` {string[]} An optional array of module names or normalized module
  sub-paths to limit which `require(...)` calls will trigger a call of the
  `onrequire` callback. If specified, this must be the first argument. There
  are a number of forms these entries can take:

  - A package name, e.g., `express` or `@fastify/busboy`.
  - A package [entry-point](https://nodejs.org/api/packages.html#package-entry-points),
    as listed in the "exports" entry in a package's "package.json" file, e.g.
    `some-package/entry-point`.
  - A package sub-module.
    E.g., `express/lib/request` will hook
    `.../node_modules/express/lib/request.js` and `express/lib/router` will hook
    `.../node_modules/express/lib/router/index.js`. (Note: To hook an internal
    package file using the `.cjs` extension you must specify the extension in
    the `modules` entry. E.g. `@langchain/core/dist/callbacks/manager.cjs` is
    required to hook
    `.../node_modules/@langchain/core/dist/callbacks/manager.cjs`.
    This is because []`.cjs` is not handled specially by `require()` the way
    `.js` is](https://nodejs.org/api/modules.html#file-modules).)
  - A package sub-path, *if `options.internals === true`*. Using the `internals`
    option allows hooking raw paths inside a package. The hook arguments for
    these paths **include the file extension**. E.g.,
    `new Hook(['@redis/client/dist/lib/client/index.js'], {internals: true}, ...`
    will hook `.../node_modules/@redis/client/dist/lib/client/index.js`.

- `options` {Object} An optional object to configure Hook behaviour.  If
  specified, this must be the second argument.

  - `options.internals` {boolean} Specifies whether `onrequire` should be called
    when any module-internal files are loaded; defaults to `false`.

- `onrequire` {Function} The function to call when a module is required.

The `onrequire` callback will be called the first time a module is
required. The function is called with three arguments:

- `exports` {Object} The value of the `module.exports` property that would
  normally be exposed by the required module.
- `name` {string} The name of the module being required. If `options.internals`
  was set to `true`, the path of module-internal files that are loaded
  (relative to `basedir`) will be appended to the module name, separated by
  `path.sep`.
- `basedir` {string} The directory where the module is located, or `undefined`
  for core modules.

Return the value you want the module to expose (normally the `exports`
argument).

### `hook.unhook()`

Removes the `onrequire` callback so that it will not be triggerd by
subsequent calls to `require()`.

## License

[MIT](https://github.com/elastic/require-in-the-middle/blob/master/LICENSE)
