var util = require('util');
var core = {
	// 判断两个数组间是否存在交叉。
	crossIn: function(/*Array*/ foo, /*Array*/ bar) {
		for (var i = 0; i < foo.length; i++) {
			if (bar.indexOf(foo[i]) >= 0) {
				return true;
			}
		}
		return false;
	},

	extend: function(dest, source) {
		var output = {};
		for (var i = 0; i < arguments.length; i++) {
			for (var key in arguments[i]) {
				output[key] = arguments[i][key];
			}
		}
		return output;
	},

	expand: function(dest, source) {
		for (var key in source) {
			dest[key] = source[key];
		}
	},

	// @deprecated
	// @see expand()
	extendSelf: function(dest, source) {
		for (var key in source) {
			dest[key] = source[key];
		}
	},

	// 修改正则表达式，生成一个新的正则表达式。
	extendRegExp: function(re, OPT) {
		OPT = core.extend({
			global     : re.global,
			ignoreCase : re.ignoreCase,
			multiline  : re.multiline,
			source     : re.source
		}, OPT);

		var flags = '';
		if (OPT.ignoreCase) flags += 'i';
		if (OPT.multiline ) flags += 'm';
		if (OPT.global    ) flags += 'g';

		return new RegExp(OPT.source, flags);
	},

	// 返回第一个非假的参数值，如均非真，则返回最后一个参数值（比如 0 或 ''）。
	// @defect 如果以表达式为参数，则必须先运行表达式。牺牲性能简化代码，牺牲微不足道，简化亦微不足道，孰是孰非？
	ifEmpty: function() {
		for (var i = 0, args = arguments; i < args.length - 1; i++) if (args[i]) return args[i];
		return args[i];
	},

	// 返回第一个有值（!== undefined）的参数值，如均无值，则返回最后一个参数值（比如 0 或 ''）。
	ifUndefined: function() {
		for (var i = 0, args = arguments; i < args.length - 1; i++) if (args[i] !== undefined) return args[i];
		return args[i];
	},

	// 判断是否标量。
	isScalar: function(n) {
		// return ['undefined', 'string', 'number', 'boolean'].indexOf(typeof n) >= 0;
		return ['object', 'function'].indexOf(typeof n) < 0;
	},

	toArray: function(arrlike) {
		var arr;

		// 如果参数本身就是数组，则克隆该数组对象。
		if (util.isArray(arrlike)) {
			arr = arrlike.slice();
		}
		else if(typeof arrlike.length == 'number' && arrlike.length >= 0) {
			arr = [];
			for (var i = 0; i < arrlike.length; i++) {
				arr.push(arrlike[i]);
			}
		}
		return arr;
	},

	untilOn: function(arr, fn) {
		for (var i = 0, l = arr.length; i < l; i++) {
			if (fn(arr[i])) break;
		}
	}
};

module.exports = core
