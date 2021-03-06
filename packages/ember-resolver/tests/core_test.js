/*globals define registry requirejs */

var Resolver, resolver, logCalls, originalLog;

function lookupResolver() {
  return requirejs.entries['ember/resolver'];
}

function resetRegistry() {
  var keeper = lookupResolver();

  requirejs.clear();
  define('ember/resolver', keeper['deps'], keeper['callback']);
}

function setupResolver(options) {
  if (!options) {
    options = { namespace: { modulePrefix: 'appkit' } };
  }

  Resolver = require('ember/resolver')['default'];
  resolver = Resolver.create(options);
}

module("Resolver Tests",{
  setup: function(){
    setupResolver();
  },

  teardown: function() {
    resetRegistry();
    Ember.TEMPLATES = {};
  }
});

test("can access at deprecated 'resolver' module name", function(){
  expect(2);

  expectDeprecation(/Importing\/requiring Ember Resolver as "resolver" is deprecated, please use "ember\/resolver" instead/);

  var ResolverAlias = require('resolver')['default'];

  equal(Resolver, ResolverAlias, "both 'ember/resolver' and 'resolver' return the same Resolver");
});

test("can access Resolver", function(){
  ok(resolver);
});

test('does not require `namespace` to exist at `init` time', function() {
  expect(0);

  resolver = Resolver.create();
});

test("can lookup something", function(){
  expect(2);

  define('appkit/adapters/post', [], function(){
    ok(true, "adapter was invoked properly");

    return Ember.K;
  });

  var adapter = resolver.resolve('adapter:post');

  ok(adapter, 'adapter was returned');

  adapter();
});

test("can lookup something in another namespace", function(){
  expect(2);

  define('other/adapters/post', [], function(){
    ok(true, "adapter was invoked properly");

    return Ember.K;
  });

  var adapter = resolver.resolve('other@adapter:post');

  ok(adapter, 'adapter was returned');

  adapter();
});

test("can lookup something with an @ sign", function(){
  expect(2);

  define('appkit/helpers/@content-helper', [], function(){
    ok(true, "helper was invoked properly");

    return Ember.K;
  });

  var helper = resolver.resolve('helper:@content-helper');

  ok(helper, 'helper was returned');

  helper();
});

test("can lookup something in another namespace with different syntax", function(){
  expect(2);

  define('other/adapters/post', [], function(){
    ok(true, "adapter was invoked properly");

    return Ember.K;
  });

  var adapter = resolver.resolve('adapter:other@post');

  ok(adapter, 'adapter was returned');

  adapter();
});

test("can lookup a view in another namespace", function() {
  expect(2);

  define('other/views/post', [], function(){
    ok(true, "view was invoked properly");

    return Ember.K;
  });

  var view = resolver.resolve('other@view:post');

  ok(view, 'view was returned');

  view();
});

test("can lookup a view in another namespace with different syntax", function() {
  expect(2);

  define('other/views/post', [], function(){
    ok(true, "view was invoked properly");

    return Ember.K;
  });

  var view = resolver.resolve('view:other@post');

  ok(view, 'view was returned');

  view();
});

test("can lookup a view", function() {
  expect(2);

  define('appkit/views/queue-list', [], function(){
    ok(true, "view was invoked properly");

    return Ember.K;
  });

  var view = resolver.resolve('view:queue-list');

  ok(view, 'view was returned');

  view();
});

test("will return the raw value if no 'default' is available", function() {
  define('appkit/fruits/orange', [], function(){
    return 'is awesome';
  });

  equal(resolver.resolve('fruit:orange'), 'is awesome', 'adapter was returned');
});

test("will unwrap the 'default' export automatically", function(){
  define('appkit/fruits/orange', [], function(){
    return {default: 'is awesome'};
  });

  equal(resolver.resolve('fruit:orange'), 'is awesome', 'adapter was returned');
});

test("router:main is hard-coded to prefix/router.js", function() {
  expect(1);

  define('appkit/router', [], function(){
    ok(true, 'router:main was looked up');
    return 'whatever';
  });

  resolver.resolve('router:main');
});

test("store:main is looked up as prefix/store", function() {
  expect(1);

  define('appkit/store', [], function(){
    ok(true, 'store:main was looked up');
    return 'whatever';
  });

  resolver.resolve('store:main');
});

test("store:posts as prefix/stores/post", function() {
  expect(1);

  define('appkit/stores/post', [], function(){
    ok(true, 'store:post was looked up');
    return 'whatever';
  });

  resolver.resolve('store:post');
});

test("will raise error if both dasherized and underscored modules exist", function() {
  define('appkit/big-bands/steve-miller-band', [], function(){
    ok(true, 'dasherized version looked up');
    return 'whatever';
  });

  define('appkit/big_bands/steve_miller_band', [], function(){
    ok(false, 'underscored version looked up');
    return 'whatever';
  });

  try {
    resolver.resolve('big-band:steve-miller-band');
  } catch (e) {
    equal(e.message, 'Ambiguous module names: `appkit/big-bands/steve-miller-band` and `appkit/big_bands/steve_miller_band`', "error with a descriptive value is thrown");
  }
});

test("will lookup an underscored version of the module name when the dasherized version is not found", function() {
  expect(1);

  define('appkit/big_bands/steve_miller_band', [], function(){
    ok(true, 'underscored version looked up properly');
    return 'whatever';
  });

  resolver.resolve('big-band:steve-miller-band');
});

test("can lookup templates with mixed naming moduleName", function(){
  expectDeprecation('Modules should not contain underscores. Attempted to lookup "appkit/bands/-steve-miller-band" which was not found. Please rename "appkit/bands/_steve-miller-band" to "appkit/bands/-steve-miller-band" instead.');

  expect(2);

  define('appkit/bands/_steve-miller-band', [], function(){
    ok(true, 'underscored version looked up properly');
    return 'whatever';
  });

  resolver.resolve('band:-steve-miller-band');
});

test("can lookup templates via Ember.TEMPLATES", function() {
  Ember.TEMPLATES['application'] = function() {
    return '<h1>herp</h1>';
  };

  var template = resolver.resolve('template:application');
  ok(template, 'template should resolve');
});

test('it provides eachForType which invokes the callback for each item found', function() {

  function orange() { }
  define('appkit/fruits/orange', [], function() {
    return { default: orange };
  });

  function apple() { }
  define('appkit/fruits/apple', [], function() {
    return {default: apple };
  });

  function other() {}
  define('appkit/stuffs/other', [], function() {
    return { default: other };
  });

  var items = resolver.knownForType('fruit');

  deepEqual(items, {
    'fruit:orange': true,
    'fruit:apple': true
  });
});

test('eachForType can find both pod and non-pod factories', function() {
  function orange() { }
  define('appkit/fruits/orange', [], function() {
    return { default: orange };
  });

  function lemon() { }
  define('appkit/lemon/fruit', [], function() {
    return { default: lemon };
  });

  var items = resolver.knownForType('fruit');

  deepEqual(items, {
    'fruit:orange': true,
    'fruit:lemon': true
  });
});

test('if shouldWrapInClassFactory returns true a wrapped object is returned', function() {
  resolver.shouldWrapInClassFactory = function(defaultExport, parsedName) {
    equal(defaultExport, 'foo');
    equal(parsedName.fullName, 'string:foo');

    return true;
  };

  define('appkit/strings/foo', [], function() {
    return { default: 'foo' };
  });

  var value = resolver.resolve('string:foo');

  equal(value.create(), 'foo');
});

module("Logging", {
  setup: function() {
    originalLog = Ember.Logger.info;
    logCalls = [];
    Ember.Logger.info = function(arg) { logCalls.push(arg); };
    setupResolver();
  },

  teardown: function() {
    Ember.Logger.info = originalLog;
  }
});

test("logs lookups when logging is enabled", function() {
  define('appkit/fruits/orange', [], function(){
    return 'is logged';
  });

  Ember.ENV.LOG_MODULE_RESOLVER = true;

  resolver.resolve('fruit:orange');

  ok(logCalls.length, "should log lookup");
});

test("doesn't log lookups if disabled", function() {
  define('appkit/fruits/orange', [], function(){
    return 'is not logged';
  });

  Ember.ENV.LOG_MODULE_RESOLVER = false;

  resolver.resolve('fruit:orange');

  equal(logCalls.length, 0, "should not log lookup");
});

module("custom prefixes by type", {
  setup: setupResolver,
  teardown: resetRegistry
});

test("will use the prefix specified for a given type if present", function() {
  setupResolver({ namespace: {
    fruitPrefix: 'grovestand',
    modulePrefix: 'appkit'
  }});

  define('grovestand/fruits/orange', [], function(){
    ok(true, 'custom prefix used');
    return 'whatever';
  });

  resolver.resolve('fruit:orange');
});

module("pods lookup structure", {
  setup: function() {
    setupResolver();
  },

  teardown: resetRegistry
});

test("will lookup modulePrefix/name/type before prefix/type/name", function() {
  define('appkit/controllers/foo', [], function(){
    ok(false, 'appkit/controllers was used');
    return 'whatever';
  });

  define('appkit/foo/controller', [], function(){
    ok(true, 'appkit/foo/controllers was used');
    return 'whatever';
  });

  resolver.resolve('controller:foo');
});

test("will lookup names with slashes properly", function() {
  define('appkit/controllers/foo/index', [], function(){
    ok(false, 'appkit/controllers was used');
    return 'whatever';
  });

  define('appkit/foo/index/controller', [], function(){
    ok(true, 'appkit/foo/index/controller was used');
    return 'whatever';
  });

  resolver.resolve('controller:foo/index');
});

test("specifying a podModulePrefix overrides the general modulePrefix", function() {
  setupResolver({
    namespace: {
      modulePrefix: 'appkit',
      podModulePrefix: 'appkit/pods'
    }
  });

  define('appkit/controllers/foo', [], function(){
    ok(false, 'appkit/controllers was used');
    return 'whatever';
  });

  define('appkit/foo/controller', [], function(){
    ok(false, 'appkit/foo/controllers was used');
    return 'whatever';
  });

  define('appkit/pods/foo/controller', [], function(){
    ok(true, 'appkit/pods/foo/controllers was used');
    return 'whatever';
  });

  // Temporarily disabling podModulePrefix deprecation
  // expectDeprecation(function() {
      resolver.resolve('controller:foo');
  // }, "`podModulePrefix` is deprecated and will be removed from future versions of ember-cli. Please move existing pods from 'app/pods/' to 'app/'.");
});

// Temporarily disabling podModulePrefix deprecation
/*
test("specifying a podModulePrefix is deprecated", function() {
  setupResolver({
    namespace: {
      modulePrefix: 'appkit',
      podModulePrefix: 'appkit/pods'
    }
  });

  expectDeprecation(function() {
    resolver.resolve('foo:bar');
  }, "`podModulePrefix` is deprecated and will be removed from future versions of ember-cli. Please move existing pods from 'app/pods/' to 'app/'.");

  expectNoDeprecation(function() {
    resolver.resolve('foo:bar');
  });
});
*/

test("will not use custom type prefix when using POD format", function() {
  resolver.namespace['controllerPrefix'] = 'foobar';

  define('foobar/controllers/foo', [], function(){
    ok(false, 'foobar/controllers was used');
    return 'whatever';
  });

  define('foobar/foo/controller', [], function(){
    ok(false, 'foobar/foo/controllers was used');
    return 'whatever';
  });

  define('appkit/foo/controller', [], function(){
    ok(true, 'appkit/foo/controllers was used');
    return 'whatever';
  });

  resolver.resolve('controller:foo');
});

test("will lookup a components template without being rooted in `components/`", function() {
  define('appkit/components/foo-bar/template', [], function(){
    ok(false, 'appkit/components was used');
    return 'whatever';
  });

  define('appkit/foo-bar/template', [], function(){
    ok(true, 'appkit/foo-bar/template was used');
    return 'whatever';
  });

  resolver.resolve('template:components/foo-bar');
});

test("will use pods format to lookup components in components/", function() {
  expect(2);

  define('appkit/components/foo-bar/template', [], function(){
    ok(true, 'appkit/components was used');
    return 'whatever';
  });

  define('appkit/components/foo-bar/component', [], function(){
    ok(true, 'appkit/components was used');
    return 'whatever';
  });

  resolver.resolve('template:components/foo-bar');
  resolver.resolve('component:foo-bar');
});

test("will not lookup routes in components/", function() {
  expect(1);

  define('appkit/components/foo-bar/route', [], function(){
    ok(false, 'appkit/components was used');
    return 'whatever';
  });

  define('appkit/routes/foo-bar', [], function(){
    ok(true, 'appkit/routes was used');
    return 'whatever';
  });

  resolver.resolve('route:foo-bar');
});

test("will not lookup non component templates in components/", function() {
  expect(1);

  define('appkit/components/foo-bar/template', [], function(){
    ok(false, 'appkit/components was used');
    return 'whatever';
  });

  define('appkit/templates/foo-bar', [], function(){
    ok(true, 'appkit/templates was used');
    return 'whatever';
  });

  resolver.resolve('template:foo-bar');
});

module("custom pluralization", {
  teardown: resetRegistry
});

test("will use the pluralization specified for a given type", function() {
  expect(1);

  setupResolver({
    namespace: {
      modulePrefix: 'appkit'
    },

    pluralizedTypes: {
      'sheep': 'sheep',
      'octipus': 'octipii'
    }
  });

  define('appkit/sheep/baaaaaa', [], function(){
    ok(true, 'custom pluralization used');
    return 'whatever';
  });

  resolver.resolve('sheep:baaaaaa');
});

test("will pluralize 'config' as 'config' by default", function() {
  expect(1);

  setupResolver();

  define('appkit/config/environment', [], function(){
    ok(true, 'config/environment is found');
    return 'whatever';
  });

  resolver.resolve('config:environment');
});

test("'config' can be overridden", function() {
  expect(1);

  setupResolver({
    namespace: {
      modulePrefix: 'appkit'
    },

    pluralizedTypes: {
      'config': 'super-duper-config'
    }
  });

  define('appkit/super-duper-config/environment', [], function(){
    ok(true, 'super-duper-config/environment is found');
    return 'whatever';
  });

  resolver.resolve('config:environment');
});
