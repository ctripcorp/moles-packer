'use strict';

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    , inform = require('./inform')
    , packCommon = require('./packCommon')
    , transform = require('./transform')
    ;

// 切换工作目录到脚本所在目录。
// 这是为了编译二进制包的需要。
// process.chdir(__dirname);

var _ME = function() {

    var C =  packCommon();
    OPTIONS.COMMON_MODULES = C.meta;

    transform.pushQueue( OPTIONS.entry, 'entry' );
    transform.run();
};

module.exports = _ME;
