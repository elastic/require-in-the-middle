'use strict'

const test = require('tape')
const semver = require('semver')
const Module = require('module')
const path = require('path')
const Hook = require('../')

// The use of deepEqual as opposed to deepStrictEqual in these test is not
// ideal since it evaluates {} to be equal to [] etc. But if we wanna use tape
// or assert, this have to do for now.

test('hook.unhook()', function (t) {
  const hook = Hook(['http'], function (exports, name, basedir) {
    t.fail('should not call onrequire')
  })
  hook.unhook()
  require('http')
  t.end()
})

test('all modules', function (t) {
  t.plan(8)

  let n = 1

  const hook = Hook(function (exports, name, basedir) {
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

  const http = require('http')
  const net = require('net')

  t.equal(http.foo, 1)
  t.equal(net.foo, 2)
  t.equal(require('http').foo, 1)
  t.deepEqual(hook.cache.get('http'), http)
  t.deepEqual(hook.cache.get('net'), net)
  t.equal(n, 3)
})

test('whitelisted modules', function (t) {
  t.plan(8)

  let n = 1

  const hook = Hook(['ipp-printer', 'patterns'], function (exports, name, basedir) {
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
  let n = 0

  const hook = Hook(['child_process'], function (exports, name, basedir) {
    exports.foo = ++n
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.deepEqual(Array.from(hook.cache.keys()), [])
  t.equal(require('child_process').foo, 1)

  t.deepEqual(Array.from(hook.cache.keys()), ['child_process'])
  t.equal(require('child_process').foo, 1)

  hook.cache.delete('child_process')
  t.deepEqual(Array.from(hook.cache.keys()), [])

  t.equal(require('child_process').foo, 2)
  t.deepEqual(Array.from(hook.cache.keys()), ['child_process'])

  t.end()
})

test('replacement value', function (t) {
  const replacement = {}

  const hook = Hook(['url'], function (exports, name, basedir) {
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

  const hook = Hook(['circular'], function (exports, name, basedir) {
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

  const expected = {
    foo: 1,
    multiCircular: 4,
    baz: 'buz'
  }

  const hook = Hook(['mid-circular'], function (exports, name, basedir) {
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

  const loadedModules = []
  const hook = Hook(['internal'], {
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

  const hooks = []
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

    const http = require('http')
    const net = require('net')

    t.equal(http.hook1, true)
    t.equal(net.hook2, true)
    t.equal(net.hook3, true)
    t.end()
  }, 50)
})

test('multiple hook.unhook()', function (t) {
  t.plan(2)

  const hook1 = Hook(['http'], function (exports, name, basedir) {
    t.fail('should not call onrequire')
  })

  const hook2 = Hook(['http'], function (exports, name, basedir) {
    t.equal(name, 'http')
    exports.hook2 = true
    return exports
  })

  hook1.unhook()

  const http = require('http')
  t.equal(http.hook2, true)

  hook2.unhook()
  t.end()
})

test('absolute file paths', function (t) {
  t.plan(6)

  const absolutePath = path.join(__dirname, 'absolute', 'absolute-file')

  const hook1 = Hook([absolutePath], function (exports, name, basedir) {
    t.equal(name, 'absolute-file')
    t.equal(basedir, path.join(process.cwd(), 'test', 'absolute'))
    exports.hook1 = true
    return exports
  })

  const absoluteModule1 = require(absolutePath)
  t.equal(absoluteModule1.hook1, true)

  hook1.unhook()

  const hook2 = Hook([absolutePath + '.js'], function (exports, name, basedir) {
    t.equal(name, 'absolute-file')
    t.equal(basedir, path.join(process.cwd(), 'test', 'absolute'))
    exports.hook2 = true
    return exports
  })

  const absoluteModule2 = require(absolutePath)
  t.equal(absoluteModule2.hook2, true)

  hook2.unhook()

  t.end()
})

if (semver.lt(process.version, '12.0.0') && Module.builtinModules) {
  test('builtin core module with slash', function (t) {
    t.plan(5)

    const name = 'v8/tools/splaytree'
    let n = 1

    const hook = Hook(function (exports, _name, basedir) {
      t.equal(_name, name)
      exports.foo = n++
      return exports
    })

    t.on('end', function () {
      hook.unhook()
    })

    const exports = require(name)

    t.equal(exports.foo, 1)
    t.equal(require(name).foo, 1)
    t.deepEqual(hook.cache.get(name), exports)
    t.equal(n, 2)
  })
}
