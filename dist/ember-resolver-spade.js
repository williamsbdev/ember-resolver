// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: Copyright 2013 Stefan Penner and Ember App Kit Contributors
// License:   Licensed under MIT license
//            See https://raw.github.com/stefanpenner/ember-jj-abrams-resolver/master/LICENSE
// ==========================================================================


minispade.register('ember-resolver/container-debug-adapter', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/container-debug-adapter\",\n  [],\n  function() {\n    \"use strict\";\n\n  // Support Ember < 1.5-beta.4\n  // TODO: Remove this after 1.5.0 is released\n  if (typeof Ember.ContainerDebugAdapter === 'undefined') {\n    return null;\n  }\n  /*\n   * This module defines a subclass of Ember.ContainerDebugAdapter that adds two\n   * important features:\n   *\n   *  1) is able provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  var ContainerDebugAdapter = Ember.ContainerDebugAdapter.extend({\n    /**\n      The container of the application being debugged.\n      This property will be injected\n      on creation.\n\n      @property container\n      @default null\n    */\n    // container: null, LIVES IN PARENT\n\n    /**\n      The resolver instance of the application\n      being debugged. This property will be injected\n      on creation.\n\n      @property resolver\n      @default null\n    */\n    // resolver: null,  LIVES IN PARENT\n    /**\n      Returns true if it is possible to catalog a list of available\n      classes in the resolver for a given type.\n\n      @method canCatalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {boolean} whether a list is available for this type.\n    */\n    canCatalogEntriesByType: function(type) {\n      return true;\n    },\n\n    /**\n      Returns the available classes a given type.\n\n      @method catalogEntriesByType\n      @param {string} type The type. e.g. \"model\", \"controller\", \"route\"\n      @return {Array} An array of classes.\n    */\n    catalogEntriesByType: function(type) {\n      var entries = requirejs.entries,\n          module,\n          types = Ember.A();\n\n      var makeToString = function(){\n        return this.shortname;\n      };\n\n      for(var key in entries) {\n        if(entries.hasOwnProperty(key) && key.indexOf(type) !== -1)\n        {\n          // // TODO return the name instead of the module itself\n          // module = require(key, null, null, true);\n\n          // if (module && module['default']) { module = module['default']; }\n          // module.shortname = key.split(type +'s/').pop();\n          // module.toString = makeToString;\n\n          // types.push(module);\n          types.push(key.split(type +'s/').pop());\n        }\n      }\n\n      return types;\n    }\n  });\n\n  ContainerDebugAdapter['default'] = ContainerDebugAdapter;\n  return ContainerDebugAdapter;\n});\n\n})();\n//@ sourceURL=ember-resolver/container-debug-adapter");minispade.register('ember-resolver/core', "(function() {/*globals define registry requirejs */\n\ndefine(\"ember/resolver\",\n  [],\n  function() {\n    \"use strict\";\n\n    if (typeof requirejs.entries === 'undefined') {\n      requirejs.entries = requirejs._eak_seen;\n    }\n\n  /*\n   * This module defines a subclass of Ember.DefaultResolver that adds two\n   * important features:\n   *\n   *  1) The resolver makes the container aware of es6 modules via the AMD\n   *     output. The loader's _moduleEntries is consulted so that classes can be\n   *     resolved directly via the module loader, without needing a manual\n   *     `import`.\n   *  2) is able provide injections to classes that implement `extend`\n   *     (as is typical with Ember).\n   */\n\n  function classFactory(klass) {\n    return {\n      create: function (injections) {\n        if (typeof klass.extend === 'function') {\n          return klass.extend(injections);\n        } else {\n          return klass;\n        }\n      }\n    };\n  }\n\n  var underscore = Ember.String.underscore;\n  var classify = Ember.String.classify;\n  var get = Ember.get;\n\n  function parseName(fullName) {\n    /*jshint validthis:true */\n\n    var nameParts = fullName.split(\":\"),\n        type = nameParts[0], fullNameWithoutType = nameParts[1],\n        name = fullNameWithoutType,\n        namespace = get(this, 'namespace'),\n        root = namespace;\n\n    return {\n      fullName: fullName,\n      type: type,\n      fullNameWithoutType: fullNameWithoutType,\n      name: name,\n      root: root,\n      resolveMethodName: \"resolve\" + classify(type)\n    };\n  }\n\n  function chooseModuleName(moduleEntries, moduleName) {\n    var underscoredModuleName = Ember.String.underscore(moduleName);\n\n    if (moduleName !== underscoredModuleName && moduleEntries[moduleName] && moduleEntries[underscoredModuleName]) {\n      throw new TypeError(\"Ambiguous module names: `\" + moduleName + \"` and `\" + underscoredModuleName + \"`\");\n    }\n\n    if (moduleEntries[moduleName]) {\n      return moduleName;\n    } else if (moduleEntries[underscoredModuleName]) {\n      return underscoredModuleName;\n    } else {\n      // workaround for dasherized partials:\n      // something/something/-something => something/something/_something\n      var partializedModuleName = moduleName.replace(/\\/-([^\\/]*)$/, '/_$1');\n\n      if (moduleEntries[partializedModuleName]) {\n        Ember.deprecate('Modules should not contain underscores. ' +\n                        'Attempted to lookup \"'+moduleName+'\" which ' +\n                        'was not found. Please rename \"'+partializedModuleName+'\" '+\n                        'to \"'+moduleName+'\" instead.', false);\n\n        return partializedModuleName;\n      } else {\n        return moduleName;\n      }\n    }\n  }\n\n  function resolveOther(parsedName) {\n    /*jshint validthis:true */\n\n    Ember.assert('module prefix must be defined', this.namespace.modulePrefix);\n\n    var normalizedModuleName = this.findModuleName(parsedName);\n\n    if (normalizedModuleName) {\n      var module = require(normalizedModuleName, null, null, true /* force sync */);\n\n      if (module && module['default']) { module = module['default']; }\n\n      if (module === undefined) {\n        throw new Error(\" Expected to find: '\" + parsedName.fullName + \"' within '\" + normalizedModuleName + \"' but got 'undefined'. Did you forget to `export default` within '\" + normalizedModuleName + \"'?\");\n      }\n\n      if (this.shouldWrapInClassFactory(module, parsedName)) {\n        module = classFactory(module);\n      }\n\n      return module;\n    } else {\n      return this._super(parsedName);\n    }\n  }\n  // Ember.DefaultResolver docs:\n  //   https://github.com/emberjs/ember.js/blob/master/packages/ember-application/lib/system/resolver.js\n  var Resolver = Ember.DefaultResolver.extend({\n    resolveOther: resolveOther,\n    resolveTemplate: resolveOther,\n\n    makeToString: function(factory, fullName) {\n      return '' + this.namespace.modulePrefix + '@' + fullName + ':';\n    },\n    parseName: parseName,\n    shouldWrapInClassFactory: function(module, parsedName){\n      return false;\n    },\n    normalize: function(fullName) {\n      // replace `.` with `/` in order to make nested controllers work in the following cases\n      // 1. `needs: ['posts/post']`\n      // 2. `{{render \"posts/post\"}}`\n      // 3. `this.render('posts/post')` from Route\n      var split = fullName.split(':');\n      if (split.length > 1) {\n        return split[0] + ':' + Ember.String.dasherize(split[1].replace(/\\./g, '/'));\n      } else {\n        return fullName;\n      }\n    },\n\n    podBasedModuleName: function(parsedName) {\n      var podPrefix = this.namespace.podModulePrefix || this.namespace.modulePrefix;\n\n      return podPrefix + '/' + parsedName.fullNameWithoutType + '/' + parsedName.type;\n    },\n\n    mainModuleName: function(parsedName) {\n      // if router:main or adapter:main look for a module with just the type first\n      var tmpModuleName = this.prefix(parsedName) + '/' + parsedName.type;\n\n      if (parsedName.fullNameWithoutType === 'main') {\n        return tmpModuleName;\n      }\n    },\n\n    defaultModuleName: function(parsedName) {\n      return this.prefix(parsedName) + '/' +  parsedName.type + 's/' + parsedName.fullNameWithoutType;\n    },\n\n    prefix: function(parsedName) {\n      var tmpPrefix = this.namespace.modulePrefix;\n\n      if (this.namespace[parsedName.type + 'Prefix']) {\n        tmpPrefix = this.namespace[parsedName.type + 'Prefix'];\n      }\n\n      return tmpPrefix;\n    },\n\n    /** \n\n      A listing of functions to test for moduleName's based on the provided\n      `parsedName`. This allows easy customization of additional module based\n      lookup patterns.\n\n      @property moduleNameLookupPatterns\n      @returns {Ember.Array}\n    */\n    moduleNameLookupPatterns: Ember.computed(function(){\n      return Ember.A([\n        this.podBasedModuleName,\n        this.mainModuleName,\n        this.defaultModuleName\n      ]);\n    }),\n\n    findModuleName: function(parsedName, loggingDisabled){\n      var self = this;\n      var moduleName;\n\n      this.get('moduleNameLookupPatterns').find(function(item) {\n        var moduleEntries = requirejs.entries;\n        var tmpModuleName = item.call(self, parsedName);\n\n        // allow treat all dashed and all underscored as the same thing\n        // supports components with dashes and other stuff with underscores.\n        if (tmpModuleName) {\n          tmpModuleName = chooseModuleName(moduleEntries, tmpModuleName);\n        }\n\n        if (tmpModuleName && moduleEntries[tmpModuleName]) {\n          self._logLookup(true, parsedName, tmpModuleName);\n\n          moduleName = tmpModuleName;\n        }\n\n        if (!loggingDisabled && (Ember.ENV.LOG_MODULE_RESOLVER || parsedName.root.LOG_RESOLVER)) {\n          self._logLookup(moduleName, parsedName, tmpModuleName);\n        }\n\n        return moduleName;\n      });\n\n      return moduleName;\n    },\n\n    // used by Ember.DefaultResolver.prototype._logLookup\n    lookupDescription: function(fullName) {\n      var parsedName = this.parseName(fullName);\n\n      var moduleName = this.findModuleName(parsedName, true);\n\n      return moduleName;\n    },\n\n    // only needed until 1.6.0-beta.2 can be required\n    _logLookup: function(found, parsedName, description) {\n      var symbol, padding;\n\n      if (found) { symbol = '[✓]'; }\n      else       { symbol = '[ ]'; }\n\n      if (parsedName.fullName.length > 60) {\n        padding = '.';\n      } else {\n        padding = new Array(60 - parsedName.fullName.length).join('.');\n      }\n\n      if (!description) {\n        description = this.lookupDescription(parsedName);\n      }\n\n      Ember.Logger.info(symbol, parsedName.fullName, padding, description);\n    }\n  });\n\n  Resolver['default'] = Resolver;\n  return Resolver;\n});\n\ndefine(\"resolver\",\n  [\"ember/resolver\"],\n  function (Resolver) {\n    Ember.deprecate('Importing/requiring Ember Resolver as \"resolver\" is deprecated, please use \"ember/resolver\" instead');\n    return Resolver;\n  });\n\n})();\n//@ sourceURL=ember-resolver/core");minispade.register('ember-resolver/initializers', "(function() {(function() {\n  \"use strict\";\n\n  Ember.Application.initializer({\n    name: 'container-debug-adapter',\n\n    initialize: function(container) {\n      var ContainerDebugAdapter = require('ember/container-debug-adapter');\n      var Resolver = require('ember/resolver');\n\n      container.register('container-debug-adapter:main', ContainerDebugAdapter);\n    }\n  });\n}());\n\n})();\n//@ sourceURL=ember-resolver/initializers");minispade.register('ember-resolver', "(function() {minispade.require('ember-resolver/core');\nminispade.require('ember-resolver/container-debug-adapter');\nminispade.require('ember-resolver/initializers');\n\n})();\n//@ sourceURL=ember-resolver");