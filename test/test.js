'use strict'

var test = require('tape')
var Hook = require('../')

// The use of deepEqual as opposed to deepStrictEqual in these test is not
// ideal since it evaluates {} to be equal to [] etc. But if we wanna use tape
// or assert, this have to do for now.

test('hook.unhook()', function (t) {
  var hook = Hook(['http'], function (exports, name, basedir) {
    t.fail('should not call onrequire')
  })
  hook.unhook()
  require('http')
  t.end()
})

test('all modules', function (t) {
  t.plan(8)

  var n = 1

  var hook = Hook(function (exports, name, basedir) {
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

  t.on('end', function () {
    hook.unhook()
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

  var hook = Hook(['ipp-printer', 'patterns'], function (exports, name, basedir) {
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

  t.on('end', function () {
    hook.unhook()
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

  var hook = Hook(['child_process'], function (exports, name, basedir) {
    exports.foo = ++n
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.deepEqual(hook.cache, {})
  t.equal(require('child_process').foo, 1)

  t.deepEqual(Object.keys(hook.cache), ['child_process'])
  t.equal(require('child_process').foo, 1)

  delete hook.cache['child_process']
  t.deepEqual(hook.cache, {})

  t.equal(require('child_process').foo, 2)
  t.deepEqual(Object.keys(hook.cache), ['child_process'])

  t.end()
})

test('replacement value', function (t) {
  var replacement = {}

  var hook = Hook(['url'], function (exports, name, basedir) {
    return replacement
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.deepEqual(require('url'), replacement)
  t.deepEqual(require('url'), replacement)
  t.end()
})

test('circular', function (t) {
  t.plan(2)

  var hook = Hook(['circular'], function (exports, name, basedir) {
    t.deepEqual(exports, { foo: 1 })
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.deepEqual(require('./node_modules/circular'), { foo: 1 })
})

test('mid circular applies to completed module', function (t) {
  t.plan(2)

  var expected = {
    foo: 1,
    multiCircular: 4,
    baz: 'buz'
  }

  var hook = Hook(['mid-circular'], function (exports, name, basedir) {
    t.deepEqual(exports, expected)
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.deepEqual(require('./node_modules/mid-circular'), expected)
})

test('internal', function (t) {
  t.plan(8)

  var loadedModules = []
  var hook = Hook(['internal'], {
    internals: true
  }, function (exports, name, basedir) {
    t.true(name.match(/^internal/))
    t.true(basedir.match(/test\/node_modules\/internal$/))
    loadedModules.push(name)
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/internal'), 'Hello world, world')
  t.deepEqual(loadedModules, ['internal/lib/b.js', 'internal/lib/a.js', 'internal'])
})

test('multiple hooks', function (t) {
  t.plan(6)

  var hooks = []
  t.on('end', function () {
    hooks.forEach(function (hook) {
      hook.unhook()
    })
  })

  hooks.push(Hook(['http'], function (exports, name, basedir) {
    t.equal(name, 'http')
    exports.hook1 = true
    return exports
  }))

  // in the same tick
  hooks.push(Hook(['net'], function (exports, name, basedir) {
    t.equal(name, 'net')
    exports.hook2 = true
    return exports
  }))

  setTimeout(function () {
    // at a later tick
    hooks.push(Hook(['net'], function (exports, name, basedir) {
      t.equal(name, 'net')
      exports.hook3 = true
      return exports
    }))

    var http = require('http')
    var net = require('net')

    t.equal(http.hook1, true)
    t.equal(net.hook2, true)
    t.equal(net.hook3, true)
    t.end()
  }, 50)
})

test('multiple hook.unhook()', function (t) {
  t.plan(2)

  var hook1 = Hook(['http'], function (exports, name, basedir) {
    t.fail('should not call onrequire')
  })

  var hook2 = Hook(['http'], function (exports, name, basedir) {
    t.equal(name, 'http')
    exports.hook2 = true
    return exports
  })

  hook1.unhook()

  var http = require('http')
  t.equal(http.hook2, true)

  hook2.unhook()
  t.end()
})
