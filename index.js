'use strict'

const path = require('path')
const Module = require('module')
const resolve = require('resolve')
const debug = require('debug')('require-in-the-middle')
const moduleDetailsFromPath = require('module-details-from-path')

// Using the default export is discouraged, but kept for backward compatibility.
// Use this instead:
//    const { Hook } = require('require-in-the-middle')
module.exports = Hook
module.exports.Hook = Hook

/**
 * Is the given module a "core" module?
 * https://nodejs.org/api/modules.html#core-modules
 *
 * @type {(moduleName: string) => boolean}
 */
let isCore
if (Module.isBuiltin) { // Added in node v18.6.0, v16.17.0
  isCore = Module.isBuiltin
} else {
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major === 8 && minor < 8) {
    // For node versions `[8.0, 8.8)` the "http2" module was built-in but
    // behind the `--expose-http2` flag. `resolve` only considers unflagged
    // modules to be core: https://github.com/browserify/resolve/issues/139
    // However, for `ExportsCache` to work for "http2" we need it to be
    // considered core.
    isCore = moduleName => {
      if (moduleName === 'http2') {
        return true
      }
      // Prefer `resolve.core` lookup to `resolve.isCore(moduleName)` because
      // the latter is doing version range matches for every call.
      return !!resolve.core[moduleName]
    }
  } else {
    isCore = moduleName => {
      // Prefer `resolve.core` lookup to `resolve.isCore(moduleName)` because
      // the latter is doing version range matches for every call.
      return !!resolve.core[moduleName]
    }
  }
}

// 'foo/bar.js' or 'foo/bar/index.js' => 'foo/bar'
const normalize = /([/\\]index)?(\.js)?$/

// Cache `onrequire`-patched exports for modules.
//
// Exports for built-in (a.k.a. "core") modules are stored in an internal Map.
//
// Exports for non-core modules are stored on a private field on the `Module`
// object in `require.cache`. This allows users to delete from `require.cache`
// to trigger a re-load (and re-run of the hook's `onrequire`) of a module the
// next time it is required.
// https://nodejs.org/docs/latest/api/all.html#all_modules_requirecache
//
// In some special cases -- e.g. some other `require()` hook swapping out
// `Module._cache` like `@babel/register` -- a non-core module won't be in
// `require.cache`. In that case this falls back to caching on the internal Map.
class ExportsCache {
  constructor () {
    this._localCache = new Map() // <module filename or id> -> <exports>
    this._kRitmExports = Symbol('RitmExports')
  }

  has (filename, isBuiltin) {
    if (this._localCache.has(filename)) {
      return true
    } else if (!isBuiltin) {
      const mod = require.cache[filename]
      return !!(mod && this._kRitmExports in mod)
    } else {
      return false
    }
  }

  get (filename, isBuiltin) {
    const cachedExports = this._localCache.get(filename)
    if (cachedExports !== undefined) {
      return cachedExports
    } else if (!isBuiltin) {
      const mod = require.cache[filename]
      return (mod && mod[this._kRitmExports])
    }
  }

  set (filename, exports, isBuiltin) {
    if (isBuiltin) {
      this._localCache.set(filename, exports)
    } else if (filename in require.cache) {
      require.cache[filename][this._kRitmExports] = exports
    } else {
      debug('non-core module is unexpectedly not in require.cache: "%s"', filename)
      this._localCache.set(filename, exports)
    }
  }
}

function Hook (modules, options, onrequire) {
  if ((this instanceof Hook) === false) return new Hook(modules, options, onrequire)
  if (typeof modules === 'function') {
    onrequire = modules
    modules = null
    options = null
  } else if (typeof options === 'function') {
    onrequire = options
    options = null
  }

  if (typeof Module._resolveFilename !== 'function') {
    console.error('Error: Expected Module._resolveFilename to be a function (was: %s) - aborting!', typeof Module._resolveFilename)
    console.error('Please report this error as an issue related to Node.js %s at %s', process.version, require('./package.json').bugs.url)
    return
  }

  this._cache = new ExportsCache()

  this._unhooked = false
  this._origRequire = Module.prototype.require

  const self = this
  const patching = new Set()
  const internals = options ? options.internals === true : false
  const hasWhitelist = Array.isArray(modules)

  debug('registering require hook')

  this._require = Module.prototype.require = function (id) {
    if (self._unhooked === true) {
      // if the patched require function could not be removed because
      // someone else patched it after it was patched here, we just
      // abort and pass the request onwards to the original require
      debug('ignoring require call - module is soft-unhooked')
      return self._origRequire.apply(this, arguments)
    }

    const core = isCore(id)
    let filename // the string used for caching
    if (core) {
      filename = id
      // If this is a builtin module that can be identified both as 'foo' and
      // 'node:foo', then prefer 'foo' as the caching key.
      if (id.startsWith('node:')) {
        const idWithoutPrefix = id.slice(5)
        if (isCore(idWithoutPrefix)) {
          filename = idWithoutPrefix
        }
      }
    } else {
      try {
        filename = Module._resolveFilename(id, this)
      } catch (resolveErr) {
        // If someone *else* monkey-patches before this monkey-patch, then that
        // code might expect `require(someId)` to get through so it can be
        // handled, even if `someId` cannot be resolved to a filename. In this
        // case, instead of throwing we defer to the underlying `require`.
        //
        // For example the Azure Functions Node.js worker module does this,
        // where `@azure/functions-core` resolves to an internal object.
        // https://github.com/Azure/azure-functions-nodejs-worker/blob/v3.5.2/src/setupCoreModule.ts#L46-L54
        debug('Module._resolveFilename("%s") threw %j, calling original Module.require', id, resolveErr.message)
        return self._origRequire.apply(this, arguments)
      }
    }

    let moduleName, basedir

    debug('processing %s module require(\'%s\'): %s', core === true ? 'core' : 'non-core', id, filename)

    // return known patched modules immediately
    if (self._cache.has(filename, core) === true) {
      debug('returning already patched cached module: %s', filename)
      return self._cache.get(filename, core)
    }

    // Check if this module has a patcher in-progress already.
    // Otherwise, mark this module as patching in-progress.
    const isPatching = patching.has(filename)
    if (isPatching === false) {
      patching.add(filename)
    }

    const exports = self._origRequire.apply(this, arguments)

    // If it's already patched, just return it as-is.
    if (isPatching === true) {
      debug('module is in the process of being patched already - ignoring: %s', filename)
      return exports
    }

    // The module has already been loaded,
    // so the patching mark can be cleaned up.
    patching.delete(filename)

    if (core === true) {
      if (hasWhitelist === true && modules.includes(filename) === false) {
        debug('ignoring core module not on whitelist: %s', filename)
        return exports // abort if module name isn't on whitelist
      }
      moduleName = filename
    } else if (hasWhitelist === true && modules.includes(filename)) {
      // whitelist includes the absolute path to the file including extension
      const parsedPath = path.parse(filename)
      moduleName = parsedPath.name
      basedir = parsedPath.dir
    } else {
      const stat = moduleDetailsFromPath(filename)
      if (stat === undefined) {
        debug('could not parse filename: %s', filename)
        return exports // abort if filename could not be parsed
      }
      moduleName = stat.name
      basedir = stat.basedir

      const fullModuleName = resolveModuleName(stat)

      debug('resolved filename to module: %s (id: %s, resolved: %s, basedir: %s)', moduleName, id, fullModuleName, basedir)

      // Ex: require('foo/lib/../bar.js')
      // moduleName = 'foo'
      // fullModuleName = 'foo/bar'
      if (hasWhitelist === true && modules.includes(moduleName) === false) {
        if (modules.includes(fullModuleName) === false) return exports // abort if module name isn't on whitelist

        // if we get to this point, it means that we're requiring a whitelisted sub-module
        moduleName = fullModuleName
      } else {
        // figure out if this is the main module file, or a file inside the module
        let res
        try {
          res = resolve.sync(moduleName, { basedir })
        } catch (e) {
          debug('could not resolve module: %s', moduleName)
          self._cache.set(filename, exports, core)
          return exports // abort if module could not be resolved (e.g. no main in package.json and no index.js file)
        }

        if (res !== filename) {
          // this is a module-internal file
          if (internals === true) {
            // use the module-relative path to the file, prefixed by original module name
            moduleName = moduleName + path.sep + path.relative(basedir, filename)
            debug('preparing to process require of internal file: %s', moduleName)
          } else {
            debug('ignoring require of non-main module file: %s', res)
            self._cache.set(filename, exports, core)
            return exports // abort if not main module file
          }
        }
      }
    }

    // ensure that the cache entry is assigned a value before calling
    // onrequire, in case calling onrequire requires the same module.
    self._cache.set(filename, exports, core)
    debug('calling require hook: %s', moduleName)
    const patchedExports = onrequire(exports, moduleName, basedir)
    self._cache.set(filename, patchedExports, core)

    debug('returning module: %s', moduleName)
    return patchedExports
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
