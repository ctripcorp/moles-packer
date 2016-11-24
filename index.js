/**
 * API.
 * @author jiangjing
 */

'use strict';

var LIB_REQUIRE
    , cache = require('./lib/cache')
	, parseOptions = require('./lib/parseOptions')
	;

var _ME = {};

_ME.pack = function(options, callback) {
    cache.reset();
    var _resolve, _reject;

    var promise = new Promise((resolve, reject) => {
        _resolve = resolve;
        _reject = reject;
    });

	options.callback = function(err) {
        err ? _reject(err) : _resolve();
        if (callback) callback.apply(null, arguments);
    };
    if (!options.base) {
        options.base = process.cwd();
    }

	parseOptions(options, true);

    var pack = require('./lib/pack');
    try {
        pack();
    } catch(ex) {
        options.callback(ex);
    }

    return promise;
};

module.exports = _ME;
