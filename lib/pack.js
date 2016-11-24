'use strict';

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    , cache = require('./cache')
    , inform = require('./inform')
    , packCommon = require('./packCommon')
    , transform = require('./transform')
    ;

// 切换工作目录到脚本所在目录。
// 这是为了编译二进制包的需要。
// process.chdir(__dirname);

var _ME = function() {

    /**
     * {Object(JSON)} OPTIONS.COMMON.meta
     * {String}       OPTIONS.COMMON.bundle.ios
     * {String}       OPTIONS.COMMON.bundle.android
     */
    OPTIONS.COMMON = packCommon();

    cache.reset();
    transform();
};

module.exports = _ME;
