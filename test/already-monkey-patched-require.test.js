'use strict'

const Module = require('module')
const test = require('tape')

const { Hook } = require('../')

// If a monkey-patch of `require` is already in place that attempts to resolve
// non-existant modules (e.g. '@azure/functions-core' in this case), and *then*
// require-in-the-middle is called; then ritm should fallback to the other
// require implementation when it fails to resolve the module path.
test('already monkey-patched require', function (t) {
  // Adapted from https://github.com/Azure/azure-functions-nodejs-worker/blob/v3.5.2/src/setupCoreModule.ts#L46-L54
  Module.prototype.require = new Proxy(Module.prototype.require, {
    apply (target, thisArg, argArray) {
      if (argArray[0] === '@azure/functions-core') {
        return {
          version: '1.0.0',
          registerHook: () => {}
        }
      } else {
        return Reflect.apply(target, thisArg, argArray)
      }
    }
  })

  const hook = new Hook(['http'], function onRequire (exports, name, basedir) {
    exports.foo = 1
    return exports
  })
  t.equal(require('http').foo, 1, 'normal hooking still works')

  const fnCore = require('@azure/functions-core')
  t.ok(fnCore, 'requiring monkey-patched-in module works')
  t.equal(fnCore.version, '1.0.0')
  t.equal(typeof fnCore.registerHook, 'function')

  t.throws(
    () => require('this-package-does-not-exist'),
    { code: 'MODULE_NOT_FOUND' },
    'a failing `require(...)` can still throw as expected'
  )

  hook.unhook()
  t.end()
})
