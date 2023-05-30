'use strict'

const assert = require('assert')

const { Hook } = require('../../')

const hooked = []

// Hook all modules as @opentelemetry/instrumentation does.
const hook = new Hook('*', function (exports, name, basedir) {
  if (['patterns', 'ipp-printer'].indexOf(name) === -1) {
    return exports
  }
  hooked.push(name)
  exports.patched = true
  return exports
})

require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  extensions: ['.js', '.ts']
})

const Patterns = require('./_patterns').default
const { default: Printer, foo } = require('./_ipp-printer.ts')

assert.strictEqual(Patterns.patched, true)
assert.strictEqual(typeof Patterns, 'function')
assert.strictEqual(typeof Patterns.prototype.add, 'function')
assert.strictEqual(Printer.patched, true)
assert.strictEqual(typeof Printer, 'function')
assert.strictEqual(typeof Printer.prototype.start, 'function')
assert.strictEqual(foo, 42)
assert.deepStrictEqual(hooked, ['patterns', 'ipp-printer'])

hook.unhook()
