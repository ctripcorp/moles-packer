"use strict";

var MODULE_REQUIRE
    , semver = require('semver')
    ;

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    ;

var _ME = {};

/**
 * @param {String} target.name
 * @param {String} target.versionRange
 */
_ME.findModuleId = (target) => {
    var metas = OPTIONS.COMMON.meta;
    var meta;

    for (let i = 0; meta = metas[i]; i++) {
        if (meta.names.indexOf(target.name) >= 0) {
            break;
        }
    }

    return meta ? meta.id : null;
};

module.exports = _ME;
