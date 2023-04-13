'use strict'

// Test that hooking 'http2' works, even for Node.js versions [8.0, 8.8)
// when http2 was flagged behind `--expose-http2`.

const test = require('tape')

const { Hook } = require('../')

var hasHttp2
try {
  require('http2')
  hasHttp2 = true
} catch (_err) {
  hasHttp2 = false
}

test('using http2', { skip: !hasHttp2 }, function (t) {
  let numOnRequireCalls = 0
  const hook = new Hook(['http2'], function (exports, name, basedir) {
    numOnRequireCalls++
    return exports
  })
  const a = require('http2')
  t.equal(numOnRequireCalls, 1)
  const b = require('http2')
  t.equal(numOnRequireCalls, 1)
  t.ok(a === b)
  t.end()
  hook.unhook()
})
