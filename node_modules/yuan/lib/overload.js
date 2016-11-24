
// var underscore = require('underscore');
var util = require('util');
var core = require('./core');

// 根据实参查找匹配的方法，并执行之。
// 这是函数（类）多态的一个轻量级实现，暂不支持参数可选、特殊参数（如 undefined）等功能。
// @example
// overload([
//     [
//         Number,
//         function(n) { // ...
//         }
//     ],
//     [
//         String,
//         function(s) { // ...
//         }
//     ],
//     [
//         Array,
//         function(arr) { // ...
//         }
//     ],
//     function() { // 缺省函数放末尾
//     }
// ], args, scope)

// 自定义数据类型。
var Type = function(judger) {
	if (!(this instanceof Type)) return new Type(judger);

	if (judger instanceof RegExp)
		this.match = function(value) { return judger.test(value); }
	else
		// this.match = function(value) { return judger(value); };
		this.match = judger;
};

Type.Char = function() {
	return new Type(function(value) { return typeof value == 'string' && value.length == 1} );
};

Type.Defined = function() {
	return new Type(function(value) { return typeof value != 'undefined'; });
};

Type.Enum = function() {
	var args = [];
	for (var i = 0; i < arguments.length; i++) {
		args.push(arguments[i]);
	}

	return new Type(function(value) { return args.indexOf(value) >= 0; });
};

Type.Scalar = function() {
	return new Type(function(value) { return core.isScalar(value); });
};

Type.nullable = function(type) {
	return new Type(function(arg) {
		return (
			   util.isNull(arg)
			|| util.isUndefined(arg)
			|| test(type, arg)
		);
	});
};

var ERR = new Error('Incorrect overload defintion.');

// 判断参数值是否匹配数据类型。
function test(type, arg) {
	// 如果形式参数表中该位置是 Type 实例，则执行判别方法。
	if (type instanceof Type)
		try { return type.match(arg); } catch(ex) { return false; }

	// 如果形参为一个构造函数，则比较实参的构造函数是否与其相同
	else if (type.constructor == Function)
		return (
			   !util.isNull(arg)
			&& !util.isUndefined(arg)
			&& arg.constructor == type
		);

	// for UC ONLY, in UC:
	// HTMLElement.constructor != Function
	// HTMLElement.constructor == Object
	else if (typeof f == 'function')
		return (arg instanceof type);

	// 如果形参为一个数组，则比较实参是否与数组中的任意一个形参匹配。
	else if (type instanceof Array) {
		var found = false;
		// underscore.find(type, function(type) {
		// 	return found = test(type, arg);
		// });
		core.untilOn(type, function(type) {
			return found = test(type, arg);
		});
		return found;
	}

	// 如果形参为一个标量，则比较实参的值与形参是否相同
	else if (core.isScalar(type))
		return arg === type;

	else
		throw ERR;
}

// 从多态定义（definitions）中，选取与参数组（args）匹配的函数，并在指定的上下文（scope）中运行。
var run = function(/*Array[Array]*/ definitions, /*Object ARGUMENTS*/ args, /*Object POINTER*/ scope) {
	var ret;
	core.untilOn(definitions, function(def) {
		var fn, match = true;

		// 允许定义缺省函数，该函数应当放在定义的末尾。
		if (util.isFunction(def)) fn = def;

		// 普通的方法定义应当是一个数组
		else if (util.isArray(def)) {

			fn = def[def.length - 1];

			var l = def.length - 1;

			// 参数表长度检查
			if (args.length != l) return false;

			// 参数类型核对
			for (var i = 0; i < l && match; i++) match = test(def[i], args[i]);
		}

		else throw ERR;

		// 如果实参与形参全部匹配，则执行该函数，并返回 true 以终止后续的匹配操作。
		if (match) return ret = fn.apply(scope, args), true;
	});

	// @todo 若没有匹配的多态方法，这里应抛出一个异常。

	return ret;
};

var _isDef = function(def) {
	return (typeof def == 'function')
		|| (def instanceof Array && typeof def[def.length-1] == 'function');
};

// 根据多态定义，创建一个多态函数。
var createFunction = function(definitions) {
	// [ [DEF], [DEF], ... ]
	// [DEF], [DEF], ...
	var DEFs = (arguments.length == 1) ? core.toArray(definitions) : core.toArray(arguments);

	var fn = function() {
		return run(DEFs, arguments, this);
	};

	// 已创建的多态函数，仍可通过 overload() 方法扩展其多态定义。
	fn.overload = function(/* Type, Type, ..., Function */) {
		DEFs.push(core.toArray(arguments));
		return fn;
	};

	return fn;
};

/**
 * 将参数（args）逐一套用于多态定义（definitions），如匹配，则解析为以形参为键、实参为值的键值对。
 *
 */
var parseArgs = function(definitions, args) {
	var DEFs = [];
	definitions.forEach(function(def) {
		var DEF = [], names = Object.keys(def);

		for (var name in def) {
			DEF.push(def[name]);
		}

		var fn = function() {
			var ret = {};
			for (var i = 0; i < arguments.length; i++) {
				ret[names[i]] = arguments[i];
			}
			return ret;
		};
		DEF.push(fn);

		DEFs.push(DEF);
	});
	return run(DEFs, args);
};

module.exports = {
	/**
	 * @param {Array}     definitions
	 * @param {ARGUMENTS} args
	 * @param {POINTER}   scope
	 */
	run: run,

	parseArgs: parseArgs,

	/**
	 * @param {Array} definitions
	 */

	/**
	 * @param          {Array} definition_0
	 * @param OPTIONAL {Array} definition_1
	 * ...
	 */
	Function:  createFunction,

	/**
	 * @param {Function} judger
	 */
	Type: Type
};
