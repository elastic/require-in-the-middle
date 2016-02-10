'use strict'

var path = require('path')
var Module = require('module')
var resolve = require('resolve')
var parse = require('module-details-from-path')

var orig = Module._load

module.exports = function hook (modules, onrequire) {
  if (typeof modules === 'function') return hook(null, modules)

  var patched = {}

  Module._load = function (request, parent, isMain) {
    var filename = Module._resolveFilename(request, parent)
    var cached = Module._cache[filename]
    var exports = orig.apply(Module, arguments)

    if (cached) return exports // abort if module is already cached by core

    var native = filename.indexOf(path.sep) === -1
    var name, basedir

    if (native) {
      name = filename
    } else {
      var stat = parse(filename)
      if (!stat) return exports // abort if filename could not be parsed
      name = stat.name
      basedir = stat.basedir

      var res = resolve.sync(name, { basedir: basedir })
      if (res !== filename) return exports // abort if not main module file
    }

    if (patched[basedir || name]) return exports // abort if module have already been processed
    patched[basedir || name] = true

    // abort if module name isn't on whitelist
    if (modules && modules.indexOf(name) === -1) return exports

    return onrequire(exports, name, basedir)
  }
}
