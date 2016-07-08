/**
 * 参数预处理。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , minimist = require('minimist')
    , yuancon = require('yuan-console')
    ;

var LIB_REQUIRE
    , CONFIG = require('./parseConfig')()
    , help = require('./help')
    ;

var _OPTIONS;

var _exit = function(msg) {
    yuancon.print.error('[PACKER] ' + msg);
    process.exit(1);
};

var _find_real_path = function(pathname) {
    var realpath;

    if (path.isAbsolute(realpath = pathname)) {
        // DO NOTHING
    }
    else if (fs.existsSync(realpath = path.join(_OPTIONS.input, pathname))) {
        // DO NOTHING
    }
    else if (fs.existsSync(realpath = path.join(process.cwd(), pathname))) {
        // DO NOTHING
    }
    else {
        realpath = null;
    }

    return realpath;
};

var _check_exist = function(pathname, title) {
    try {
        fs.readFileSync(pathname);
    } catch(ex) {
        _exit(`Failed to load ${title}, it may not exist or can not be accessed.\n Real path: ${pathname}`);
    }
};

var _ME = function(argv, force) {
    if (_OPTIONS && !force) return _OPTIONS;

    if (_OPTIONS) {
        // 清空对象，但保留句柄。
        for (var i in _OPTIONS) delete _OPTIONS[i];
    }
    else {
        _OPTIONS = {};
    }

    // 如果未提供参数，则使用命令行参数。
    if (!argv) {
        argv = minimist(process.argv.slice(2));
        _OPTIONS.isCLI = true;
    }
    else {
        _OPTIONS.isCLI = false;
        _OPTIONS.callback = argv.callback;
        _OPTIONS.ceased = false;
    }

    // -------------------------------------------------------------------------
    // 排他性、指示独立任务的命令行参数处理。
    // API 模式下忽略此环节。

    if (_OPTIONS.isCLI) {

        if (argv.help || argv.h) {
            help();
            process.exit(0);
        }

        if (argv.version || argv.v) {
            yuancon.print
                .line('Moles Packer')
                .em(require('../package').version)
                .br()
                ;
            process.exit(0);
        }

    }

    // -------------------------------------------------------------------------
    // 非耦合参数处理。

    // --platform
    // default 'ios'
    _OPTIONS.platform = yuan.ifEmpty(argv['platform'], 'ios');
    if (['ios', 'android'].indexOf(_OPTIONS.platform) < 0) {
        _exit(`Invalid platform "${_OPTIONS.platform}".`);
    }


    // 由 run.js 间接调用的时候，需要指定基础目录。
    _OPTIONS.base = argv.base || '.';

    // 默认以当前目录作为待编译项目根目录。
    _OPTIONS.input = path.resolve(_OPTIONS.base,
        (typeof argv.input == 'string') ? argv.input : '.');

    // 默认以 [当前目录]/build 作为输出根目录。
    _OPTIONS.output = path.resolve(_OPTIONS.base,
        typeof argv.output == 'string' ? argv.output : './build');

    // --standalone
    // default FALSE
    _OPTIONS.standalone = !!argv.standalone;

    // --common
    // default undefined
    if (argv.common) {
        let realpath = _find_real_path(argv.common);
        _check_exist(realpath, `Common package "${argv.common}"`);
        _OPTIONS.common = realpath;
    }

    // --execOnRequired
    // default FALSE
    _OPTIONS.execOnRequired = !!argv['exec-on-required'];

    // --dev
    // default FALSE
    _OPTIONS.dev = !!argv.dev;

    // --single
    // default FALSE
    _OPTIONS.single = !!argv.single;

    // --verbose
    // default FALSE
    _OPTIONS.verbose = !!argv.verbose;

    // -------------------------------------------------------------------------
    // 耦合参数处理。

    // 默认以 [项目根目录]/index.js 作为入口文件。
    _OPTIONS.entry = path.resolve(_OPTIONS.input,
        typeof argv.entry == 'string' ? argv.entry : CONFIG.path.entry);

    if (!fs.existsSync(_OPTIONS.entry)) {
        // 自动检测入口文 件。

        let pathname = path.join(_OPTIONS.input, `index.${_OPTIONS.platform}.js`);
        if (fs.existsSync(pathname)) {
            _OPTIONS.entry = pathname;
        }
    }
    if (!fs.existsSync(_OPTIONS.entry)) {
        _exit(`Entry file "${_OPTIONS.entry}" not exists or not accessible.`);
    }


    // --common-bundle
    // default undefined
    // 必须是相对路径。
    if (argv['common-bundle']) {
        if (_OPTIONS.common) {
            _exit('Options --common and --common-bundle are incompitable.');
        }

        _OPTIONS.commonBundle = path.join(_OPTIONS.output,
            typeof argv['common-bundle'] == 'string' ? argv['common-bundle'] : CONFIG.path.commonBundle);
    }

    // --common-meta
    // default undefined
    if (argv['common-meta']) {
        if (_OPTIONS.commonBundle) {
            _exit('Options --common-meta and --common-bundle are incompitable.');
        }

        let realpath = _find_real_path(argv['common-meta']);
        _check_exist(realpath, `Common package meta file "${argv['common-meta']}"`);
        _OPTIONS.commonMeta = realpath;
    }
    else if (_OPTIONS.common) {
        let realpath = yuancon.path.trimExtname(_OPTIONS.common) + CONFIG.metaExtname;
        _check_exist(realpath, `Common package meta file`);
        _OPTIONS.commonMeta = realpath;
    }

    // --common-modules
    // default react,react-native
    if (argv['common-modules']) {
        _OPTIONS.commonModules = argv['common-modules'].split(',');
    }

    // --bundle
    // default undefined
    // 必须是相对路径。
    // 该选项应为相对于输出目录的相对路径，如果选项未附带值，则以 entry 的相对路径（相对于项目）取代。
    if (argv.bundle) {
        _OPTIONS.bundle = path.join(_OPTIONS.output,
            typeof argv.bundle == 'string' ? argv.bundle : CONFIG.path.bundle);
    }

    return _OPTIONS;
};

_ME.set = function(options) {
    _OPTIONS = options;
};

module.exports = _ME;
