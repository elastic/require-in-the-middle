# require-in-the-middle

Hook into the Node.js `require` function. This allows you to modify
modules on-the-fly as they are being required.

[![Build status](https://travis-ci.org/opbeat/require-in-the-middle.svg?branch=master)](https://travis-ci.org/opbeat/require-in-the-middle)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Installation

```
npm install require-in-the-middle --save
```

## Usage

```js
var path = require('path')
var hook = require('require-in-the-middle')

// Hook into the express and mongodb module
hook(['express', 'mongodb'], function (exports, name, basedir) {
  var version = require(path.join(basedir, 'package.json')).version

  console.log('loading %s@%s', name, version)

  // expose the module version as a property on its exports object
  exports._version = version

  // whatever you return will be returned by `require`
  return exports
})
```

## API

The require-in-the-middle module exposes a single function:

```js
function ([modules][, options], onrequire) {}
```

- `modules` <string[]> An optional array of module names to limit which modules
  trigger a call of the `onrequire` callback. If specified, this must be the
  first argument.
- `options` <Object> An optional object containing fields that change when the
  `onrequire` callback is called. If specified, this must be the second
  argument.
  - `options.internals` <boolean> Specifies whether `onrequire` should be called
    when module-internal files are loaded; defaults to `false`.
- `onrequire` <Function> The function to call when a module is required.

Supply a callback function as the last argument. This function will be
called the first time a module is required. The `onrequire` function is
called with three arguments:

- `exports` <Object> The value of the `module.exports` property that would
  normally be exposed by the required module.
- `name` <string> The name of the module being required. If `options.internals`
  was set to `true`, the path of module-internal files that are loaded
  (relative to `basedir`) will be appended to the module name, separated by
  `path.sep`.
- `basedir` <string> The directory where the module is located, or `undefined`
  for core modules.

Return the value you want the module to expose (normally the `exports`
argument).

## License

MIT
