/**
 * @author youngoat@163.com
 * (c) 2013-2015
 */

'use strict';

var core = require('./lib/core');
var yuan = {
	VERSION  : '0.1.0',
	array    : require('./lib/array'),
	Char     : require('./lib/Char'),
	fn       : require('./lib/fn'),
	object   : require('./lib/object'),
	overload : require('./lib/overload'),
	promise  : require('./lib/promise'),
	string   : require('./lib/string')
};
core.extendSelf(yuan, core);

module.exports = yuan;

if (global == global.window) {

	// 保留全局环境下原有的 yuan 变量。
	var _global_yuan = global.yuan;

	// 占用全局变量 yuan。
	global.yuan = yuan;

	// 防止冲突：将全局变量 yuan 置回原有状态，同时返回本包对象。
	yuan.noConflict = function() {
		global.yuan = _global_yuan;
		return yuan;
	};
}

// ...
