'use strict'

const test = require('tape')

const { Hook } = require('../')

// The `process.getBuiltinModule(id) function was added in Node.js 22.3.0
const skip = !process.getBuiltinModule

test('process.getBuiltinModule should be patched', { skip }, function (t) {
  let numOnRequireCalls = 0

  const hook = new Hook(['http'], function (exports, name, basedir) {
    numOnRequireCalls++
    return exports
  })

  const a = process.getBuiltinModule('http')
  t.equal(numOnRequireCalls, 1)

  const b = require('http')
  t.equal(numOnRequireCalls, 1)

  t.strictEqual(a, b, 'modules are the same')

  t.end()
  hook.unhook()
})

test('patched process.getBuiltinModule should work with node: prefix', { skip }, function (t) {
  let numOnRequireCalls = 0

  const hook = new Hook(['http'], function (exports, name, basedir) {
    numOnRequireCalls++
    return exports
  })

  process.getBuiltinModule('node:http')
  t.equal(numOnRequireCalls, 1)
  t.end()
  hook.unhook()
})

test('patched process.getBuiltinModule should preserve default behavior for non-builtin modules', { skip }, function (t) {
  const beforePatching = process.getBuiltinModule('ipp-printer')

  const hook = new Hook(['ipp-printer'], function (exports, name, basedir) {
    t.fail('should not call hook')
  })

  const afterPatching = process.getBuiltinModule('ipp-printer')

  t.strictEqual(beforePatching, afterPatching, 'modules are the same')
  t.end()
  hook.unhook()
})

test('hook.unhook() works for process.getBuiltinModule', { skip }, function (t) {
  const hook = new Hook(['http'], function (exports, name, basedir) {
    t.fail('should not call onrequire')
  })
  hook.unhook()
  process.getBuiltinModule('http')
  t.end()
})
