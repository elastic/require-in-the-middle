'use strict'

const test = require('tape')
const { Hook } = require('../')

test('handles mapped exports', function (t) {
  t.plan(2)

  const hook = new Hook(['mapped-exports/foo'], function (exports, name) {
    t.equal(name, 'mapped-exports/foo')
    const answer = exports.answer
    exports.answer = function wrappedAnswer () {
      return 'wrapped-' + answer()
    }
    return exports
  })

  t.on('end', hook.unhook)

  const foo = require('mapped-exports/foo')
  t.equal(foo.answer(), 'wrapped-42')
})
