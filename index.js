'use strict'

var path = require('path')
var Module = require('module')
var resolve = require('resolve')
var debug = require('debug')('require-in-the-middle')
var parse = require('module-details-from-path')

module.exports = Hook

// 'foo/bar.js' or 'foo/bar/index.js' => 'foo/bar'
var normalize = /([/\\]index)?(\.js)?$/

function Hook (modules, options, onrequire) {
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
  this._unhooked = false
  this._origRequire = Module.prototype.require

  var self = this
  var patching = {}

  debug('registering require hook')

  this._require = Module.prototype.require = function (request) {
    if (self._unhooked) {
      // if the patched require function could not be removed because
      // someone else patched it after it was patched here, we just
      // abort and pass the request onwards to the original require
      debug('ignoring require call - module is soft-unhooked')
      return self._origRequire.apply(this, arguments)
    }

    var filename = Module._resolveFilename(request, this)
    var core = filename.indexOf(path.sep) === -1
    var moduleName, basedir

    debug('processing %s module require(\'%s\'): %s', core ? 'core' : 'non-core', request, filename)

    // return known patched modules immediately
    if (self.cache.hasOwnProperty(filename)) {
      debug('returning already patched cached module: %s', filename)
      return self.cache[filename]
    }

    // Check if this module has a patcher in-progress already.
    // Otherwise, mark this module as patching in-progress.
    var patched = patching[filename]
    if (!patched) {
      patching[filename] = true
    }

    var exports = self._origRequire.apply(this, arguments)

    // If it's already patched, just return it as-is.
    if (patched) {
      debug('module is in the process of being patched already - ignoring: %s', filename)
      return exports
    }

    // The module has already been loaded,
    // so the patching mark can be cleaned up.
    delete patching[filename]

    if (core) {
      if (modules && modules.indexOf(filename) === -1) {
        debug('ignoring core module not on whitelist: %s', filename)
        return exports // abort if module name isn't on whitelist
      }
      moduleName = filename
    } else {
      var stat = parse(filename)
      if (!stat) {
        debug('could not parse filename: %s', filename)
        return exports // abort if filename could not be parsed
      }
      moduleName = stat.name
      basedir = stat.basedir

      var fullModuleName = resolveModuleName(stat)

      debug('resolved filename to module: %s (request: %s, resolved: %s, basedir: %s)', moduleName, request, fullModuleName, basedir)

      // Ex: require('foo/lib/../bar.js')
      // moduleName = 'foo'
      // fullModuleName = 'foo/bar'
      if (modules && modules.indexOf(moduleName) === -1) {
        if (modules.indexOf(fullModuleName) === -1) return exports // abort if module name isn't on whitelist

        // if we get to this point, it means that we're requiring a whitelisted sub-module
        moduleName = fullModuleName
      } else {
        // figure out if this is the main module file, or a file inside the module
        try {
          var res = resolve.sync(moduleName, { basedir: basedir })
        } catch (e) {
          debug('could not resolve module: %s', moduleName)
          return exports // abort if module could not be resolved (e.g. no main in package.json and no index.js file)
        }

        if (res !== filename) {
          // this is a module-internal file
          if (options.internals) {
            // use the module-relative path to the file, prefixed by original module name
            moduleName = moduleName + path.sep + path.relative(basedir, filename)
            debug('preparing to process require of internal file: %s', moduleName)
          } else {
            debug('ignoring require of non-main module file: %s', res)
            return exports // abort if not main module file
          }
        }
      }
    }

    // only call onrequire the first time a module is loaded
    if (!self.cache.hasOwnProperty(filename)) {
      // ensure that the cache entry is assigned a value before calling
      // onrequire, in case calling onrequire requires the same module.
      self.cache[filename] = exports
      debug('calling require hook: %s', moduleName)
      self.cache[filename] = onrequire(exports, moduleName, basedir)
    }

    debug('returning module: %s', moduleName)
    return self.cache[filename]
  }
}

Hook.prototype.unhook = function () {
  this._unhooked = true
  if (this._require === Module.prototype.require) {
    Module.prototype.require = this._origRequire
    debug('unhook successful')
  } else {
    debug('unhook unsuccessful')
  }
}

function resolveModuleName (stat) {
  const normalizedPath = path.sep !== '/' ? stat.path.split(path.sep).join('/') : stat.path
  return path.posix.join(stat.name, normalizedPath).replace(normalize, '')
}
