/**
 * 过程信息输出控制方法集。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , path = require('path')
    , yuancon = require('yuan-console')
    ;

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    ;

var _event_id = 0;
var _events = [];

var _ME = (msg) => {
    yuancon.print.line(`[PACKER] ${msg}`);
};

_ME.log = (() => {
    var called = false;
    return (options) => {
        var OPTIONS = require('./parseOptions')();
        if (!called) {
            yuancon.print.dim('[SOURCE] ').em('BASE: ' + OPTIONS.input).br();
            yuancon.print.dim('[TARGET] ').em('BASE: ' + OPTIONS.output).br();
        }
        if (options.source) {
            yuancon.print.dim('[SOURCE] ').em(path.relative(OPTIONS.input, options.source)).dim(` ( ${options.type} )`).br();
        }
        if (options.target) {
            yuancon.print.dim('[TARGET] ').codeInline(path.relative(OPTIONS.output, options.target)).dim(` (${options.type} )`).br();
        }
        called = true;
    };
})();

_ME.status = (word) => {
    if (word) yuancon.print.em(word).dim(' ... ');
    else yuancon.print.clearLine();
};

_ME.warn = (line) => {
    yuancon.print.warning('[PACKER] ' + line);
};

_ME.bundle = (options) => {
    yuancon.print.dim('[BUNDLE] ').em(yuan.ifEmpty(options.name, '-')).dim(` (${options.type})`).br();
};

_ME.genEventId = () => {
    _event_id++;
    _events.push(_event_id);
    return _event_id;
};

_ME.exit = (msg) => {
    if (OPTIONS.isCLI) {
        yuancon.print.error('[PACKER] ' + msg);
        if (OPTIONS.verbose) {
            yuancon.print.error(yuancon.run.exitMessage);
        }
        process.exit(1);
    }
    else {
        OPTIONS.callback(new Error(msg));
    }
};

_ME.end = (id) => {
    // "id" is not necessary.
    _events = yuan.array.without(_events, id);

    if (_events.length == 0) {
        _ME('-- end --');
        _ME(`See ${OPTIONS.output}` );

        if (!OPTIONS.isCLI) {
            OPTIONS.callback();
        }
        else {
            // DO NOTHING.
            // process.exit(0);
        }
    }
};

if (OPTIONS.isCLI) {
    process.on('exit', _ME.end);
}

module.exports = _ME;
