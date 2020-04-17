'use strict'

const assert = require('assert')
const Hook = require('../../')

const hooked = []

Hook(['patterns', 'ipp-printer'], function (exports, name, basedir) {
  hooked.push(name)
  return exports
})

require('@babel/register')({
  presets: ['@babel/preset-env', '@babel/preset-typescript'],
  extensions: ['.js', '.ts']
})

const Patterns = require('./_patterns').default
const Printer = require('./_ipp-printer.ts').default

assert.strictEqual(typeof Patterns, 'function')
assert.strictEqual(typeof Patterns.prototype.add, 'function')
assert.strictEqual(typeof Printer, 'function')
assert.strictEqual(typeof Printer.prototype.start, 'function')
assert.deepStrictEqual(hooked, ['patterns', 'ipp-printer'])
