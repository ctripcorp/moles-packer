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
    , ERRORS = require('../errors')
    , cache = require('./cache')
    ;

var _event_id = 0;
var _events = [];

var _ME = (msg) => {
    yuancon.print.line(`[MOLES_PACKER] ${msg}`);
};

_ME.header = (msg) => {
    yuancon.print.em(`[MOLES_PACKER] -- ${msg} --`).br();
};

_ME.log = (options) => {
    if (!OPTIONS.verbose) return;
    if (options.source) {
        yuancon.print.dim('[SOURCE] ').em(path.relative(OPTIONS.input, options.source)).dim(` ( ${options.type} )`).br();
    }
    if (options.target) {
        yuancon.print.dim('[TARGET] ').codeInline(path.relative(OPTIONS.output, options.target)).dim(` ( ${options.type} )`).br();
    }
};

_ME.status = (word) => {
    if (!OPTIONS.verbose) return;
    if (word) yuancon.print.em(word).dim(' ... ');
    else yuancon.print.clearLine();
};

_ME.warn = (line) => {
    yuancon.print.warning('[MOLES_PACKER] ' + line);
};

_ME.bundle = (options) => {
    if (!OPTIONS.verbose) return;
    yuancon.print.dim('[BUNDLE] ').em(yuan.ifEmpty(options.name, '-')).dim(` ( ${options.type} )`).br();
};

_ME.common = (platform, msg) => {
    if (!OPTIONS.verbose) return;
    yuancon.print.dim('[COMMON] ').text(msg).dim(` ( ${platform} )`).br();
};

_ME.genEventId = () => {
    _event_id++;
    _events.push(_event_id);
    return _event_id;
};

_ME.exit = (msg, errno) => {
    if (typeof msg == 'number') {
        errno = msg;
        msg = ERRORS[errno];
    }

    if (!errno) errno = 1;

    yuancon.print.error('[MOLES_PACKER] ' + msg);
    if (OPTIONS.verbose) {
        yuancon.print.error(yuancon.run.exitMessage);
    }
    yuancon.print.warning('[MOLES_PACKER] Terminated with error.');
    if (OPTIONS.isCLI) {
        process.exit(errno);
    }
    else {
        var err = new Error(msg);
        err.code = errno;
        throw err;
    }
};

_ME.end = (id) => {
    // "id" is not necessary.
    if (arguments.length) {
        _events = yuan.array.without(_events, id);
    }

    if (_events.length == 0) {
        _ME.log({
            target: OPTIONS.metaOutput,
            type: 'meta'
        });
        yuancon.fs.json.saveAs(cache('meta'), OPTIONS.metaOutput);

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

module.exports = _ME;
