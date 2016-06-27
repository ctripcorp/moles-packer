/**
 * API.
 * @author jiangjing
 */

'use strict';

var LIB_REQUIRE
	, parseOptions = require('./lib/parseOptions')
	;

var _ME = {};

_ME.pack = function(options, callback) {
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
	pack();

    return promise;
};

module.exports = _ME;
