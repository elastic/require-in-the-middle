'use strict'

const test = require('tape')

// Test that this default export still works, for backward compat.
const Hook = require('../')

test('legacy default export still works', function (t) {
  // Also test usage of the Hook as a function rather than with `new Hook`.
  const hook = Hook(['semver'], function (exports, name, basedir) {
    exports.foo = 'bar'
    return exports
  })
  const semver = require('semver')
  t.equal(semver.foo, 'bar')

  t.end()
  hook.unhook()
})
