'use strict'

// This tests that sub-module files using the `.cjs` extension are *not*
// hookable via a normalized module path. Instead one must use the .cjs
// extension on the hook arg.
//
// E.g., a Hook arg of `cjs-sub-module/foo` will **not** hook
// `./node_modules/cjs-sub-module/foo.cjs`. This is different compared to `.js`
// file extension usage. The difference is that Node.js's `require()` treats
// `.js` and `.cjs` differently.
// See https://nodejs.org/api/modules.html#file-modules

const test = require('tape')

const { Hook } = require('../')

test('require("cjs-sub-module/foo") does NOT hook cjs-sub-module/foo.cjs', function (t) {
  const hook = new Hook(['cjs-sub-module/foo'], function (exports) {
    t.fail('should not get here')
    return exports
  })

  t.equal(require('./node_modules/cjs-sub-module'), 'cjs-sub-module/index.js')
  t.equal(require('./node_modules/cjs-sub-module/foo.cjs'), 'cjs-sub-module/foo.cjs')

  try {
    require('./node_modules/cjs-sub-module/foo')
    t.fail('the previous require should throw')
  } catch (err) {
    t.ok(/Cannot find module/.test(err.message), 'got expected exception')
  }

  hook.unhook()
  t.end()
})

test('require("cjs-sub-module/bar") does NOT hook cjs-sub-module/bar/index.cjs', function (t) {
  const hook = new Hook(['cjs-sub-module/bar'], function (exports) {
    t.fail('should not get here')
    return exports
  })

  t.equal(require('./node_modules/cjs-sub-module'), 'cjs-sub-module/index.js')
  t.equal(require('./node_modules/cjs-sub-module/bar/index.cjs'), 'cjs-sub-module/bar/index.cjs')

  try {
    require('./node_modules/cjs-sub-module/bar')
    t.fail('the previous require should throw')
  } catch (err) {
    t.ok(/Cannot find module/.test(err.message), 'got expected exception')
  }

  hook.unhook()
  t.end()
})

test('require("cjs-sub-module/foo.cjs") DOES hook cjs-sub-module/foo.cjs', function (t) {
  const hookedNames = []
  const hook = new Hook(['cjs-sub-module/foo.cjs'], function (exports, name) {
    hookedNames.push(name)
    return exports
  })

  t.equal(require('./node_modules/cjs-sub-module'), 'cjs-sub-module/index.js')
  t.equal(require('./node_modules/cjs-sub-module/foo.cjs'), 'cjs-sub-module/foo.cjs')
  t.deepEqual(hookedNames, ['cjs-sub-module/foo.cjs'])

  hook.unhook()
  t.end()
})

test('require("cjs-sub-module/bar/index.cjs") DOES hook cjs-sub-module/bar/index.cjs', function (t) {
  const hookedNames = []
  const hook = new Hook(['cjs-sub-module/bar/index.cjs'], function (exports, name) {
    hookedNames.push(name)
    return exports
  })

  t.equal(require('./node_modules/cjs-sub-module'), 'cjs-sub-module/index.js')
  t.equal(require('./node_modules/cjs-sub-module/bar/index.cjs'), 'cjs-sub-module/bar/index.cjs')
  t.deepEqual(hookedNames, ['cjs-sub-module/bar/index.cjs'])

  hook.unhook()
  t.end()
})
