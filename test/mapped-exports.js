'use strict'

const test = require('tape')
const { Hook } = require('../')

test('handles mapped exports: mapped-exports/foo', function (t) {
  t.plan(2)

  const hook = new Hook(['mapped-exports/foo'], function (exports, name) {
    t.equal(name, 'mapped-exports/foo')
    const answer = exports.answer
    exports.answer = function wrappedAnswer () {
      return 'wrapped-' + answer()
    }
    return exports
  })

  const foo = require('mapped-exports/foo')
  t.equal(foo.answer(), 'wrapped-42')

  hook.unhook()
})

test('handles mapped exports: mapped-exports/bar', function (t) {
  t.plan(2)

  const hook = new Hook(['mapped-exports/bar'], function (exports, name) {
    t.equal(name, 'mapped-exports/bar')
    const answer = exports.answer
    exports.answer = function wrappedAnswer () {
      return 'wrapped-' + answer()
    }
    return exports
  })

  const bar = require('mapped-exports/bar')
  t.equal(bar.answer(), 'wrapped-42')

  hook.unhook()
})
