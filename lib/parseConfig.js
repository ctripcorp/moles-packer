/**
 * 软件配图和用户配置处理。
 * @author jiangjing
 */


var _CONFIG;

var _ME = function() {
    if (_CONFIG) return _CONFIG;

    _CONFIG = require('../config');

    return _CONFIG;
}

module.exports = _ME;
