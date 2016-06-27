/**
 * 编译公共包。
 * @author weixiaojun
 * @update jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , swig = require('swig')
    , yuancon = require('yuan-console')
    , uglifyJS = require('uglify-js')
    ;

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    , inform = require('./inform')
    ;

// 创建公包并获取元数据。
var _create_common = function() {
    // 创建临时文件夹。
    var TEMP_DIRNAME = '.moles';
    yuancon.fs.mkdirp(path.join(OPTIONS.input, TEMP_DIRNAME));

    // 伪入口文件相对路径（相对于项目根目录）。
    var pesudoEntryPath           = path.join(TEMP_DIRNAME, 'index.common.js');
    var pesudoEntryRealpath       = path.join(OPTIONS.input, pesudoEntryPath);

    var commonBundleTempath       = path.join(TEMP_DIRNAME, 'common.jsbundle');
    var commonBundleRealTempath   = path.join(OPTIONS.input, commonBundleTempath);

    // ---------------------------
    // 创建伪入口文件。

    var MODULE_NAMES = ['react', 'react-native'];
    if (OPTIONS.commonModules) {
        MODULE_NAMES = MODULE_NAMES.concat(OPTIONS.commonModules);
    }

    var tpl = swig.compileFile(path.join(__dirname, '..', 'template', 'common.swig'));
    fs.writeFileSync(pesudoEntryRealpath, tpl({ names: MODULE_NAMES }));

    // ---------------------------
    // 调用 react-native 原生命令创建公包。

    var command = [
        'react-native',
        'bundle',
        '--entry-file',
        pesudoEntryPath,
        '--bundle-output',
        commonBundleTempath,
        '--platform ',
        OPTIONS.platform,
        '--dev true',
        '--minify false',
        '--verbose true'
    ];

    // 执行命令。
    yuancon.run(command.join(' '), { cwd: OPTIONS.input, echo: OPTIONS.verbose });

    if (yuancon.run.exitCode) {
        return inform.exit('Failed to create common bundle.');
    }

    // 获取所有的公共模块信息。
    var code = fs.readFileSync(commonBundleRealTempath, 'utf8');

    // e.g.
    // __d(19 /* ReactCurrentOwner */, function(global, require, module, exports) {'use strict'; ...
    var matches = code.match(/\b__d\(\d+\s+\/\* .+ \*\/,/g);
    var meta = {};

    // 临时替换模块检索路径集。
    var MODULE_PATHS = module.paths;
    var MODULE_BASEDIR = path.join(OPTIONS.input, 'node_modules');
    module.paths = [ MODULE_BASEDIR ];

    matches.forEach(function(text) {
        /^__d\((\d+)\s+\/\* (.+) \*\/,/.exec(text);
        let moduleId = RegExp.$1;
        let modulePath = RegExp.$2;

        if (moduleId == 0) return;

        // react-native bundle 构建结果中，除了 @providedModule 之外，在注释中均使用具体入口文件相对路径指代模块，而非模块名。
        // 以 react 为例：
        //     __d(12 /* react/react.js */, ...
        let moduleName;
        let parts = modulePath.split('/');
        if (parts.length > 1) {
            moduleName = parts[0];
            if (modulePath.charAt(0) == '@') {
                moduleName +='/' + parts[1];
            }
        }

        let moduleEntry;
        if (moduleName
            && (moduleEntry = require.resolve(moduleName))
            && moduleEntry.substr(MODULE_BASEDIR.length + 1) == modulePath
            ) {
            meta[moduleName] = moduleId;
        }

        meta[modulePath] = moduleId;
    });

    var codelines = ['/* module copy */'];
    for (let name in meta) {
        let id = meta[name];
        codelines.push(`__d("${name}", function(global, require, module, exports) { return module.exports = require(${id}) });`);
    }
    code += codelines.join('\n');

    code += fs.readFileSync(path.join(__dirname, '..', 'template', 'requireLite.js'), 'utf8');

    if (OPTIONS.commonBundle) {
        yuancon.fs.mkdirp(path.dirname(OPTIONS.commonBundle));

        fs.writeFileSync(OPTIONS.commonBundle, code, 'utf8');
        inform('COMMON BUNDLE: ' + OPTIONS.commonBundle)

        let realpath = OPTIONS.commonBundle.substring(0, OPTIONS.commonBundle.length - path.extname(OPTIONS.commonBundle).length) + '.meta.json';
        yuancon.fs.json.saveAs(meta, realpath);
        inform('COMMON META: ' + realpath);
    }

    // 恢复模块检索路径集。
    module.paths = MODULE_PATHS;

    return {
        code: code,
        meta: meta
    };
};

var _COMMON_INFO;

var _ME = function() {
    if (_COMMON_INFO) return _COMMON_INFO;

    inform('-- common package --');

    // 检查当前项目所使用的 react-native
    var REACT_NATIVE_VERSION;
    (function() {
        // 检查当前项目的 React Native 版本及 react-native 命令的可用性。
        var ret = yuancon.run('react-native -v', { echo: false, cwd: OPTIONS.input });
        if (yuancon.run.exitCode) {
            return inform.exit('Failed to run command "react-native", try to reinstall module named "react-native-cli".');
        }
        else {
            // 正常情况下，该命令应输出如下内容：
            // react-native-cli: <version>
            // react-native: ...
            ret.split(/\r|\n/).forEach(function(line) {
                if (line.match(/^react-native: ([0-9.]+)/)) {
                    REACT_NATIVE_VERSION = RegExp.$1;
                }
            });
        }
    });

    // If OPTIONS.common exists, OPTIONS.commonMeta MUST also exist.
    // This is ensured by ./parseOptions.
    if (OPTIONS.commonMeta) {
        let meta, code;

        if (OPTIONS.common) {
            code = fs.readFileSync(OPTIONS.common);
        }

        try {
            meta = require(OPTIONS.commonMeta);
        }
        catch (ex) {
            return inform.exit(`${OPTIONS.commonMeta} is illegal common package meta file.`)
        }

        _COMMON_INFO = {
            meta: meta,
            code: code
        };
    }
    else {
        _COMMON_INFO = _create_common();
    }

    inform('Common modules ready.')

    return _COMMON_INFO;
};

module.exports = _ME;
