'use strict'

var path = require('path')
var Module = require('module')
var resolve = require('resolve')
var parse = require('module-details-from-path')

module.exports = function Hook (modules, options, onrequire) {
  if (!(this instanceof Hook)) return new Hook(modules, options, onrequire)
  if (typeof modules === 'function') {
    onrequire = modules
    modules = null
    options = {}
  } else if (typeof options === 'function') {
    onrequire = options
    options = {}
  }

  if (typeof Module._resolveFilename !== 'function') {
    console.error('Error: Expected Module._resolveFilename to be a function (was: %s) - aborting!', typeof Module._resolveFilename)
    console.error('Please report this error as an issue related to Node.js %s at %s', process.version, require('./package.json').bugs.url)
    return
  }

  options = options || {}

  this.cache = {}

  var self = this
  var patching = {}
  var orig = Module.prototype.require

  Module.prototype.require = function (request) {
    var filename = Module._resolveFilename(request, this)
    var core = filename.indexOf(path.sep) === -1
    var name, basedir

    // return known patched modules immediately
    if (self.cache.hasOwnProperty(filename)) {
      return self.cache[filename]
    }

    // Check if this module has a patcher in-progress already.
    // Otherwise, mark this module as patching in-progress.
    var patched = patching[filename]
    if (!patched) {
      patching[filename] = true
    }

    var exports = orig.apply(this, arguments)

    // If it's already patched, just return it as-is.
    if (patched) return exports

    // The module has already been loaded,
    // so the patching mark can be cleaned up.
    delete patching[filename]

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
    if (!self.cache.hasOwnProperty(filename)) {
      // ensure that the cache entry is assigned a value before calling
      // onrequire, in case calling onrequire requires the same module.
      self.cache[filename] = exports
      self.cache[filename] = onrequire(exports, name, basedir)
    }

    return self.cache[filename]
  }
}
