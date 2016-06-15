;(function() {
	var global = (function() { return this; })();

	var Module =  function() {
		this.exports = {};
		return this;
	};

	var MODULE_INFOS = [];

	var loadScript = function(pathname, callback) {
		global.reactNative.NativeModules.RequireLocal.loadPath(pathname, callback);
	};

	global.requireJs = function REQUIRE(deps, callback, defer) {
		// @TODO 参数规范化
		var modules = new Array(deps.length), loaded = 0;

		var checkAvailable = function() {
			// 检查是否所有模块都已加载完成。
			if (loaded == deps.length) {
				callback.apply(null, modules);
			}
		};

		checkAvailable();
		deps.forEach(function(dep, index) {
			var name = dep;
			var info = MODULE_INFOS[name];
			var onload = function() {
				modules[index] = (name == 'module') ? new Module() : info.exports;
				loaded++;
				checkAvailable();
			};

			var doRequireJs = function() {
				REQUIRE(info.deps, function() {
					if (defer) {
						info.args = arguments;
					}
					else {
						info.exports = info.callback.apply(null, arguments);
					}
					info.status = 'required';
					onload();
				}, defer);
			}

			if (!info) {
				info = { status: 'loading', listeners: [] };
				MODULE_INFOS[name] = info;
				loadScript(name, function(err, code) {
					if (err) throw 'Failed to load script text of module "' + name + '"';

					var listeners = info.listeners;

					global.eval('var global = (function() { return this; })(); ' + code);
					info = MODULE_INFOS[name];
					doRequireJs();

					listeners.forEach(function(listener) {
						listener();
					});
				});
			}
			else if (info.status == 'required') {
				onload();
			}
			else if (info.status == 'loading') {
				info.listeners.push(onload);
			}
			else {
				doRequireJs();
			}
		});
	};

	// re2 means Require and Return.
	global.re2 = function REQUIRE_AND_RETURN(name) {
		if (name == 'module') return new Module();

		var info = MODULE_INFOS[name];
        if (info.status != 'required') {
            throw 'Unexpected invoking before required (' + name + ')';
        }
		if (!info.hasOwnProperty('exports')) {
			info.exports = info.callback.apply(null, info.args);
		}
		return info.exports;
	};

	// status: [loading] ... [defined] ... [required]
	global.define = function(name, deps, callback) {
		// @TODO 参数规范化

		if (!MODULE_INFOS[name] || MODULE_INFOS[name].status == 'loading') {
			MODULE_INFOS[name] = {
				name: name,
				deps: deps,
				callback: callback,
				status: 'defined'
			};
		}
	};

	// This is just a placeholder.
	// Anytime "module" is required, a new instance of global.Module will be returned.
	global.define('module', [], function() {
		return null;
	});
})();
