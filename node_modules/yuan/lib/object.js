var
	  core = require('./core')
	, overload = require('./overload')
	;

var object = {};

// 判断两个对象的局部（部分属性）是否相同。
object.equalAt = function(foo, bar, props) {
	var equal = true;
	props.forEach(function(prop) {
		equal = equal && foo[prop] === bar[prop];
	});
	return equal;
};

// object.extend = core.extend.bind(null);
object.extend = function(dest, source) {
	var output = {};
	for (var i = 0; i < arguments.length; i++) {
		var item = arguments[i];
		for (var key in item) {
			if (item.hasOwnProperty(key)) output[key] = item[key];
		}
	}
	return output;
};

// 2016.01.08
// 将 extendOwn() 更名为 expand()
object.expand = function(foo, bar) {
	for (var name in bar) {
		if (bar.hasOwnProperty(name)) foo[name] = bar[name];
	}
};
// 保留原方法名以向前兼容。
object.extendOwn = object.expand.bind(object);

object.has = function(foo, keyname) {
	for (var name in foo) {
		if (name == keyname) return true;
	}
	return false;
};

object.pick = function(foo, keynames) {
	var bar = {};
	keynames.forEach(function(keyname) {
		bar[keyname] = foo[keyname];
	});
	return bar;
};

object.omit = function(foo, keynames) {
	var bar = {};
	for (var keyname in foo) {
		if (keynames.indexOf(keyname) < 0) bar[keyname] = foo[keynames];
	}
	return bar;
};

object.toArray = overload.Function()
	.overload(
		Object,
		function(foo) {
			var arr = [];
			for (var name in foo) {
				arr.push([ name, foo[name] ]);
			}
			return arr;
		}
	)
	.overload(
		Object, String, String,
		function(foo, keyname, valuename) {
			var arr = [], item;
			for (var name in foo) {
				item = {};
				item[keyname] = name;
				item[valuename] = foo[name];
				arr.push(item);
			}
			return arr;
		}
	)
	.overload(
		Object,
		/* function(keyname, value) { return arrayItem; } */
		Function,
		function(foo, fn) {
			var arr = [];
			for (var name in foo) {
				arr.push(fn(name, foo[name]));
			}
			return arr;
		}
	)
	;

module.exports = object;
