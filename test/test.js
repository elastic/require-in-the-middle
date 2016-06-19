'use strict'

var assert = require('assert')
var test = require('tape')
var hook = require('../')

test('all modules', function (t) {
  t.plan(8)

  var n = 1

  hook(function (exports, name, basedir) {
    switch (n) {
      case 1:
        t.equal(name, 'http')
        break
      case 2:
        t.equal(name, 'net')
        break
      default:
        t.ok(false)
    }

    exports.foo = n++

    return exports
  })

  var http = require('http')
  var net = require('net')

  t.equal(http.foo, 1)
  t.equal(net.foo, 2)
  t.equal(require('http').foo, 1)
  t.deepEqual(hook.cache['http'], http)
  t.deepEqual(hook.cache['net'], net)
  t.equal(n, 3)
})

test('whitelisted modules', function (t) {
  t.plan(8)

  var n = 1

  hook(['ipp-printer', 'patterns'], function (exports, name, basedir) {
    switch (n) {
      case 1:
        t.equal(name, 'ipp-printer')
        break
      case 2:
        t.equal(name, 'patterns')
        break
      default:
        t.ok(false)
    }

    exports.foo = n++

    return exports
  })

  t.equal(require('dgram').foo, undefined)
  t.equal(require('ipp-printer').foo, 1)
  t.equal(require('patterns').foo, 2)
  t.equal(require('ipp-printer').foo, 1)
  t.equal(require('roundround').foo, undefined)
  t.equal(n, 3)
})

test('cache', function (t) {
  var n = 0

  hook(['child_process'], function (exports, name, basedir) {
    exports.foo = ++n
    return exports
  })

  t.doesNotThrow(function () {
    // tape does not have a deepStrictEqual :(
    assert.deepStrictEqual(hook.cache, {})
  })
  t.equal(require('child_process').foo, 1)

  t.deepEqual(Object.keys(hook.cache), ['child_process'])
  t.equal(require('child_process').foo, 1)

  delete hook.cache['child_process']
  t.doesNotThrow(function () {
    // tape does not have a deepStrictEqual :(
    assert.deepStrictEqual(hook.cache, {})
  })

  t.equal(require('child_process').foo, 2)
  t.deepEqual(Object.keys(hook.cache), ['child_process'])

  t.end()
})

test('circular', function (t) {
  t.plan(2)

  hook(['circular'], function (exports, name, basedir) {
    t.doesNotThrow(function () {
      // tape does not have a deepStrictEqual :(
      assert.deepStrictEqual(exports, { foo: 1 })
    })
    return exports
  })

  t.doesNotThrow(function () {
    // tape does not have a deepStrictEqual :(
    assert.deepStrictEqual(require('./node_modules/circular'), { foo: 1 })
  })
})
