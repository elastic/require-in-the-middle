'use strict'

var path = require('path')
var Module = require('module')
var resolve = require('resolve')
var parse = require('module-details-from-path')

var orig = Module._load

module.exports = function hook (modules, options, onrequire) {
  if (typeof modules === 'function') return hook(null, {}, modules)
  if (typeof options === 'function') return hook(modules, {}, options)

  if (typeof Module._resolveFilename !== 'function') {
    console.error('Error: Expected Module._resolveFilename to be a function (was: %s) - aborting!', typeof Module._resolveFilename)
    console.error('Please report this error as an issue related to Node.js %s at %s', process.version, require('./package.json').bugs.url)
    return
  }

  options = options || {}

  hook.cache = {}

  Module._load = function (request, parent, isMain) {
    var exports = orig.apply(Module, arguments)

    // Ugly hack to make sure we don't process modules that haven't been
    // completely evaluated yet. This happens for circular dependencies.
    if (exports !== null &&
        typeof exports === 'object' &&
        !Array.isArray(exports) &&
        Object.keys(exports).length === 0) return exports

    var filename = Module._resolveFilename(request, parent)
    var core = filename.indexOf(path.sep) === -1
    var name, basedir

    if (core) {
      if (modules && modules.indexOf(filename) === -1) return exports // abort if module name isn't on whitelist
      name = filename
    } else {
      var stat = parse(filename)
      if (!stat) return exports // abort if filename could not be parsed
      name = stat.name
      basedir = stat.basedir

      if (modules && modules.indexOf(name) === -1) return exports // abort if module name isn't on whitelist

      // figure out if this is the main module file, or a file inside the module
      try {
        var res = resolve.sync(name, { basedir: basedir })
      } catch (e) {
        return exports // abort if module could not be resolved (e.g. no main in package.json and no index.js file)
      }
      if (res !== filename) {
        // this is a module-internal file
        if (options.internals) {
          // use the module-relative path to the file, prefixed by original module name
          name = name + path.sep + path.relative(basedir, filename)
        } else return exports // abort if not main module file
      }
    }

    // only call onrequire the first time a module is loaded
    if (!hook.cache.hasOwnProperty(filename)) {
      // ensure that the cache entry is assigned a value before calling
      // onrequire, in case calling onrequire requires the same module.
      hook.cache[filename] = exports
      hook.cache[filename] = onrequire(exports, name, basedir)
    }

    return hook.cache[filename]
  }
}
