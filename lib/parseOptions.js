/**
 * 参数预处理。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , colors = require('colors')
    , fs = require('fs')
    , os = require('os')
    , path = require('path')
    , minimist = require('minimist')
    , yuancon = require('yuan-console')
    ;

var LIB_REQUIRE
    , CONFIG = require('./parseConfig')()
    , help = require('./help')
    ;

var _OPTIONS;

// WHY inform.exit() NOT USED?
// Module "inform" depends on "parseOptions".
// To avoid recursive dependencies, it is not required here.
var _exit = function(msg) {
    yuancon.print.error('[PACKER] ' + msg);
    process.exit(1);
};

// To judge if the specified pathname(s) exists and is accessible.
// If not, response in unified way and force the process to quit.
var _check_exist = yuan.overload.Function()
    // Return the realpath if exists.
    .overload(String, String, (realpath, title) => {
        _check_exist([ realpath ], title, false);
        return realpath;
    })

    // Return the first one if exists, in form of String.
    .overload(Array, String, (realpaths, title) => {
        var realpath = _check_exist(realpaths, title, false);
        return realpath;
    })

    // Return the first one if exists, in form of Object { keyname: String }.
    .overload(Object, String, (coll, title) => {
        return _check_exist(coll, title, false);
    })
    .overload(Object, String, yuan.overload.Type((p) => p == false), (coll, title) => {
        var realpaths = yuan.object.toArray(coll, (key, value) => value);
        var realpath = _check_exist(realpaths, title, false);
        var ret = {};
        for (let key in coll) {
            if (coll[key] == realpath) ret[key] = realpath;
        }
        return ret;
    })

    // Return the coll if all items exist.
    .overload(Object, String, yuan.overload.Type((p) => p == true), (coll, title) => {
        var realpaths = yuan.object.toArray((key, value) => value);
        _check_exist(realpaths, title, true);
        return coll;
    })

    .overload(Array, String, Boolean, (realpaths, title, noneLeft) => {
        var notfounds = [];
        for (let i = 0; i < realpaths.length; i++) {
            if (!fs.existsSync(realpaths[i])) {
                notfounds.push(realpaths[i]);
            }
            else if (!noneLeft) {
                return realpaths[i];
            }
        }

        // If none exists, ...
        if (notfounds.length) {
            let s = `Failed to load ${colors.bold(title)}, it may not exist or can not be accessed.`;
            notfounds.forEach((pathname) => {
                s += os.EOL + 'Real path: ' +  pathname;
            });
            _exit(s);
        }

        return pathname;
    })

    .overload(() => {
        throw 'Internal Error, _check_exist() parameters mismatched.';
    })
    ;

// If specified parameter does not contain an absolute path,
// try to find it in next locations (in order of priority):
// * _OPIONS.input
// * CWD, current working directory
// While nothing found, process will be forced to quit.
var _find_real_path = function(pathname, title) {
    var realpaths = [];

    if (path.isAbsolute(pathname)) {
        realpaths = [ pathname ];
    }
    else {
        realpaths = [
            path.join(_OPTIONS.input, pathname),
            path.join(_OPTIONS.base, pathname)
        ];
    }
    return _check_exist(realpaths, title);
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

    // 由 run.js 间接调用的时候，需要指定基础目录。
    _OPTIONS.base = path.resolve(argv.base || '.');

    // --common-modules
    // default react,react-native
    if (argv['common-modules']) {
        _OPTIONS.commonModules = argv['common-modules'].split(',');
    }

    // --dev
    // default FALSE
    _OPTIONS.dev = !!argv.dev;

    // --execOnRequired
    // default FALSE
    _OPTIONS.execOnRequired = !!argv['exec-on-required'];

    // 默认以当前目录作为待编译项目根目录。
    _OPTIONS.input = path.resolve(_OPTIONS.base,
        (typeof argv.input == 'string') ? argv.input : '.');

    // --minify
    // default FALSE
    _OPTIONS.minify = !!argv.minify;

    // 默认以 [当前目录]/build 作为输出根目录。
    _OPTIONS.output = path.resolve(_OPTIONS.base,
        typeof argv.output == 'string' ? argv.output : './build');
    yuancon.fs.mkdirp(_OPTIONS.output);
    _OPTIONS.metaOutput = path.join(_OPTIONS.output, 'moles.meta.json');

    // --platform
    // default 'ios'
    _OPTIONS.platform = yuan.ifEmpty(argv['platform'], 'cross');
    if (['cross', 'ios', 'android'].indexOf(_OPTIONS.platform) < 0) {
        _exit(`Invalid platform "${_OPTIONS.platform}".`);
    }

    // --single
    // default FALSE
    _OPTIONS.single = !!argv.single;

    // --standalone
    // default FALSE
    _OPTIONS.standalone = !!argv.standalone;

    // --verbose
    // default FALSE
    _OPTIONS.verbose = !!argv.verbose;

    // -------------------------------------------------------------------------
    // 耦合参数处理。

    // --entry
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

    // --common
    if (argv['common-input']) {
        let realpath = _find_real_path(argv['common-input'], 'common directory');

        // STEP 0. By default, Moles Packer will create a sub directory named with
        // CONFIG.path.common in the output directory. So, supposing that the output
        // directory is used as --common-input next time, Moles Packer will guess
        // that the sub directory named with CONFIG.path.common is the real directory
        // in which common meta file and common bundle file(s) stored.
        let realpathGuessed = path.join(realpath, CONFIG.path.common);
        if (fs.existsSync(realpathGuessed)) {
            realpath = realpathGuessed;
        }

        // STEP 1. Firstly, we should find the meta file.

        let commonMetas;
        commonMetas = [ path.join(realpath, CONFIG.path.commonMeta[_OPTIONS.platform]) ];

        // If you wanna create os-specified bundle(s) and corresponding meta
        // file is not found in the directory specified by --common option,
        // Moles Packer will try the cross-platform one as a replacement if
        // it exists.
        if (_OPTIONS.platform != 'cross') {
            commonMetas.push(path.join(realpath, CONFIG.path.commonMeta['cross']));
        }
        _OPTIONS.commonMeta = _check_exist(commonMetas, 'meta file');

        // STEP 2. Secondly, while option --standalone set, we should find the
        // corresponding common bundle(s).
        // If --platform not specified, both ios and android common bundle are
        // required.

        if (_OPTIONS.standalone) {
            let commonBundle = {};
            if (_OPTIONS.platform == 'cross') {
                for (let platform in CONFIG.path.commonBundle) {
                    commonBundle[platform] = path.join(realpath, CONFIG.path.commonBundle[platform]);
                }
            }
            else {
                commonBundle[_OPTIONS.platform] = path.join(realpath, CONFIG.path.commonBundle[_OPTIONS.platform]);
            }
            _OPTIONS.commonBundle = _check_exist(commonBundle, 'common bundle(s)', true);
        }
    }

    // --common-output
    if (argv['common-output']) {
        if (path.isAbsolute(argv['common-output'])) {
            _OPTIONS.commonOutput = argv['common-output'];
        }
        else if (argv['common-output'].charAt(0) == '.') {
            _OPTIONS.commonOutput = path.resolve(argv['common-output']);
        }
        else {
            _OPTIONS.commonOutput = path.join(_OPTIONS.output , argv['common-output']);
        }
    }
    else {
        _OPTIONS.commonOutput = path.join(_OPTIONS.output, CONFIG.path.common);
    }

    // --bundle
    // default false
    if (argv.bundle) {
        _OPTIONS.bundle = !!argv.bundle;
    }

    // ---------------------------


    if (_OPTIONS.verbose) {
        let rows = [];
        let keys = Object.keys(_OPTIONS).sort();
        let reducePathname = (/*String*/ value) => {
            if (value.startsWith(_OPTIONS.base)) {
                value = colors.gray('BASE') + path.sep + path.relative(_OPTIONS.base, value);
            }
            return value;
        };
        keys.forEach((key) => {
            let value = _OPTIONS[key];
            if (typeof value == 'string') {
                if (key != 'base') value = reducePathname(value);
                value = colors.italic(`"${value}"`);
            }
            else if (typeof value == 'boolean') {
                value = colors.italic.green(value);
            }
            else if (value instanceof Array) {
                let rows = [];
                value.forEach((item) => {
                    rows.push(colors.italic(`"${value}"`));
                });
                value = rows.join(os.EOL);
            }
            else if (typeof value == 'function') {
                value = 'Function() [ ... ]';
            }
            else if (typeof value == 'object') {
                for (let subkey in value) {
                    let subvalue = reducePathname(value[subkey]);
                    rows.push({
                        name: key + '.' + subkey,
                        value: `"${colors.italic(subvalue)}"`
                    });
                }
                return;
            }

            rows.push({ name: key, value: value });
        });
        yuancon.print.em(`[${CONFIG.title}] -- options parsed --`).br();
        yuancon.print.table(rows);
    }

    return _OPTIONS;
};

_ME.set = function(options) {
    _OPTIONS = options;
};

module.exports = _ME;
