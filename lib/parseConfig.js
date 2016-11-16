/**
 * 软件配图和用户配置处理。
 * @author jiangjing
 */


var _CONFIG = require('../config');

var _ME = function(name) {
	switch (name) {
		case 'version-range':
			return _CONFIG[name];
		default:
	}

    return _CONFIG;
}

module.exports = _ME;
