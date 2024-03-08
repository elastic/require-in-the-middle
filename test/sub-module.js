'use strict'

const test = require('tape')

const { Hook } = require('../')

test('require(\'sub-module/foo\') => sub-module/foo.js', function (t) {
  t.plan(3)

  const hook = new Hook(['sub-module/foo'], function (exports, name, basedir) {
    t.equal(name, 'sub-module/foo')
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module/index.js')
  t.equal(require('./node_modules/sub-module/foo'), 'sub-module/foo.js')
})

test('require(\'sub-module/bar\') => sub-module/bar/index.js', function (t) {
  t.plan(3)

  const hook = new Hook(['sub-module/bar'], function (exports, name, basedir) {
    t.equal(name, 'sub-module/bar')
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module/index.js')
  t.equal(require('./node_modules/sub-module/bar'), 'sub-module/bar/index.js')
})

test('require(\'sub-module/bar/../bar\') => sub-module/bar/index.js', function (t) {
  t.plan(3)

  const hook = new Hook(['sub-module/bar'], function (exports, name, basedir) {
    t.equal(name, 'sub-module/bar')
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module/index.js')
  t.equal(require('./node_modules/sub-module/bar/../bar'), 'sub-module/bar/index.js')
})

test('require(\'sub-module/conflict\') => sub-module/conflict.js', function (t) {
  t.plan(3)

  const hook = new Hook(['sub-module/conflict'], function (exports, name, basedir) {
    t.equal(name, 'sub-module/conflict')
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module/index.js')
  t.equal(require('./node_modules/sub-module/conflict'), 'sub-module/conflict.js')
})

test('require(\'sub-module/conflict/index.js\') => sub-module/conflict/index.js', function (t) {
  t.plan(3)

  const hook = new Hook(['sub-module/conflict'], function (exports, name, basedir) {
    t.equal(name, 'sub-module/conflict')
    return exports
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module/index.js')
  t.equal(require('./node_modules/sub-module/conflict/index.js'), 'sub-module/conflict/index.js')
})

test('require(\'sub-module/foo\') with \'sub-module\'', function (t) {
  t.plan(5)

  const names = []
  const hook = new Hook(['sub-module/foo', 'sub-module'], function (exports, name, basedir) {
    names.push(name)
    if (name === 'sub-module') {
      t.equal(exports, 'sub-module/index.js')
    } else {
      t.equal(exports, 'sub-module/foo.js')
    }
    return name
  })

  t.on('end', function () {
    hook.unhook()
  })

  t.equal(require('./node_modules/sub-module'), 'sub-module')
  t.equal(require('./node_modules/sub-module/foo'), 'sub-module/foo')
  t.same(names, ['sub-module', 'sub-module/foo'])
})
