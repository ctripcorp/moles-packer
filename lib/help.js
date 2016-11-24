/**
 * 打印在线帮助信息。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , yuancon = require('yuan-console')
    ;

var _ME = function() {
    yuancon.clear();
    yuancon.print.pauseOnScreen(true);
    yuancon.print.markup(fs.readFileSync(path.join(__dirname, '..', 'help.yuan'), 'utf8'));
};

module.exports = _ME;
