'use strict'

// Test support for triggering a reload/re-patch of a module by deleting it
// from `require.cache`.
// (https://github.com/elastic/require-in-the-middle/pull/63)

const test = require('tape')

const { Hook } = require('../')

test('reload/re-patch via `delete require.cache[name]`', function (t) {
  let numOnRequireCalls = 0
  const hook = new Hook(['semver'], function (exports, name, basedir) {
    numOnRequireCalls++
    return exports
  })
  const semver1 = require('semver')
  t.equal(numOnRequireCalls, 1)
  const semver2 = require('semver')
  t.equal(numOnRequireCalls, 1)
  t.ok(semver2 === semver1)

  delete require.cache[require.resolve('semver')]
  const semver3 = require('semver')
  t.equal(numOnRequireCalls, 2, 'onrequire was called again')
  t.ok(semver3 !== semver1)

  t.end()
  hook.unhook()
})

// An originating issue that led to this RITM functionality was
// https://github.com/open-telemetry/opentelemetry-js/issues/3655
// where RITM didn't work with 'stealthy-require', which swaps `Module` values
// from `require.cache` in and out. This test case tests that.
test('stealty-require swap in/out Module values from require.cache', function (t) {
  let numOnRequireCalls = 0
  const hook = new Hook(['semver'], function (exports, name, basedir) {
    numOnRequireCalls++
    return exports
  })
  const semver1 = require('semver')
  t.equal(numOnRequireCalls, 1)
  t.ok(semver1.parse)

  // Swap out cached 'semver' Module.
  const semverPath = require.resolve('semver')
  const mod = require.cache[semverPath]
  delete require.cache[semverPath]

  const semver2 = require('semver')
  t.equal(numOnRequireCalls, 2, 'onrequire was called again after swap out')
  t.ok(semver2.parse)
  t.ok(semver2 !== semver1)

  // Swap 'semver' Module cache back in.
  require.cache[semverPath] = mod

  const semver3 = require('semver')
  t.equal(numOnRequireCalls, 2, 'onrequire was *not* called again after swap in')
  t.ok(semver3.parse)
  t.ok(semver3 === semver1)

  t.end()
  hook.unhook()
})
