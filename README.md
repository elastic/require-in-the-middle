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
function ([modules, ]onrequire) {}
```

You can optionally supply an array of module names as the first argument
to limit which modules will trigger a call of the `onrequire` callback.

Supply a callback function as the last argument. This function will be
called the first time a module is required. The `onrequire` function is
called with three arguments:

- `exports` - The value of the `module.exports` property that would
  normally be exposed by the required module
- `name` - The name of the module being required
- `basedir` - The directory of the where the module is located (will be
  `undefined` if core module)

Return the value you want the module to expose (normally the `exports`
argument).

## License

MIT
