/**
 * 过程信息输出控制方法集。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , yuancon = require('yuan-console')
    ;

var LIB_REQUIRE
    , inform = require('./inform')
    ;

var _outOfRoot = (realpath, rootpath) => {
    return (realpath.substr(0, rootpath.length) != rootpath);
};

/**
 * 获取模块文件的绝对路径。
 * 分析在脚本文件 sourceRealpath 中的 require(requireName) 语句，获取 requireName 指代的脚本文件的绝对路径。
 *
 * @param {object}    options
 * @param {String}    options.source - 源文件路径。
 * @param {String}    options.name   - 模块名称，require() 函数实参。
 * @param {String[]} [options.paths] - 指定模块搜索目录，相当于运行时的 module.paths 。
 *                                     [该参数暂不支持]
 * @param {String}   [options.root]  - 指定向上搜索 node_modules 目录的终止目录。
 *                                     如未指定该参数，则一直向上检索直到根目录。
 */
var _ME = (options) => {
    var sourceRealpath = options.source;
    var requireName = options.name;

    var sourceDirname = path.dirname(sourceRealpath);
    var requireRealpath;

    if (!_ME.isModuleNameStyle(requireName)) {
        requireRealpath = path.resolve(sourceDirname, requireName);
        if (options.root && _outOfRoot(requireRealpath, options.root)) {
            requireRealpath = null;
        }
        else if (yuancon.fs.isDir(requireRealpath)) {
            requireRealpath = path.join(requireRealpath, 'index.js');
        }
        else {
            // 校正后缀名，尝试 *.js 文件
            if (!fs.existsSync(requireRealpath)) {
                requireRealpath += '.js';
            }

            // 校正后缀名，尝试 *.json 文件
            if (!fs.existsSync(requireRealpath)) {
                requireRealpath = requireRealpath.replace(/\.js$/, '.json');
            }
        }

        // 两次检验路径真实性。
        if (requireRealpath && !fs.existsSync(requireRealpath)) {
            requireRealpath = null;
        }
    }

    else {
        // @todo
        // 预生成 paths 再进入循环，以支持 options.paths 参数。
        // 虽然效率略差，但逻辑清晰。代码简单。

        // 否则，代表引用的是模块的入口文件。
        // 注意，即使在 windows 系统中，require() 的引用路径中也必须使用斜杠 / 而非反斜杠 \。
        // 在判断前，先剔除私有域前缀。
        var isModuleEntry = (requireName.replace(/^@[^\/]+\//, '').indexOf('/') == -1);

        // 起始的寻址目录。
        var nodePath = path.join(sourceDirname, 'node_modules');

        var found = false;
        do {
            if (options.root && _outOfRoot(nodePath, options.root)) {
                // 路径溢出。
                break;
            }
            if (fs.existsSync(nodePath)) {
                requireRealpath = path.join(nodePath, requireName);
                found = fs.existsSync(requireRealpath);

                if (isModuleEntry) {
                    // 尝试取模块入口文件。
                    if (found) {
                        // 获取 package.json 数据。
                        var packageJson = JSON.parse(fs.readFileSync(path.join(requireRealpath, 'package.json')));
                        // 为什么不用 require() 直接获取呢？。
                        // 因为在 windows 系统中，系统路径中使用反斜杠作为目录分隔符，故不得作为 require() 方法参数。
                        // @TODO 如果是完整路径，windows 系统也没问题。

                        if (packageJson.main) {
                            // 取指定入口文件。
                            requireRealpath = path.join(requireRealpath, packageJson.main);
                        }

                        // 如果指定入口文件不存在，应继续尝试默认入口文件。
                        if (!fs.existsSync(requireRealpath)) {
                            requireRealpath = path.join(requireRealpath, 'index.js');
                        }

                        if (!fs.existsSync(requireRealpath)) {
                            // 如果在当前模块中未找到入口文件，应继续上溯。
                            found = false;
                            // return inform.exit(`Entry of module "${requireRealpath}" not found.`);
                        }
                    }
                }
                else {
                    if (yuancon.fs.isDir(requireRealpath)) {
                        // 尝试获取目录下的缺省文件 index.js
                        requireRealpath = path.join(requireRealpath, 'index.js');
                    }
                    else {
                        // 尝试取脚本文件本身。
                        requireRealpath += '.js';
                    }
                    found = fs.existsSync(requireRealpath);
                }
            }
            if (!found) {
                nodePath = path.join(nodePath, '../../node_modules');
            }
        } while (!found)

        if (!found) requireRealpath = null;
    }

    return requireRealpath;
};

_ME.foundType = null;

// @TODO 异常处理
// 此处假设 sourceRealpath 是一个合法安装的 npm 模块中的脚本。
_ME.parse = function(sourceRealpath) {
    var parts = sourceRealpath.split(path.sep);
    var index = parts.lastIndexOf('node_modules');

    if (index < 0) return null;

    // 获取模块名称。
    var moduleName = parts[ ++index ];
    if (moduleName.startsWith('@')) {
        moduleName += '/' + parts[ ++index ];
    }

    // 获取模块 package.json 数据。
    var packageJson = require(parts.slice(0, ++index).concat('package.json').join(path.sep));

    // 获取脚本在模块内的相对路径。
    var relapath = parts.slice(index).join('/');

    // 获取脚本在模块内的相对路径（省略文件名后缀）。
    var relapathWithoutPostfix = relapath.substr(0, relapath.length - path.extname(relapath).length);

    var shortname = moduleName + '/' + relapathWithoutPostfix;
    var fullname  = moduleName + '/' + relapath;

    var names = [
        fullname,
        shortname
    ];

    var main = yuan.ifEmpty(packageJson.main, 'index.js');
    // 如果脚本文件为模块入口文件，则模块名亦可直接作为引用名。
    if (main == relapath || main == relapathWithoutPostfix) {
        names.push(shortname = moduleName);
    }

    return {
        version: packageJson.version,

        // @TODO 获取脚本所属模块的版本范围信息。
        versionRange: null,

        names: names,
        shortname: shortname
    }
};

_ME.isModuleNameStyle = function(pathname) {
    // 如果参数值是绝对路径，或以 ./ 或 ../ 或斜杠起始，则代表这是一个路径而非模块名。
    // 注意，即使在 windows 系统中，require() 的引用路径中也必须使用斜杠 / 而非反斜杠 \。
    return !path.isAbsolute(pathname)
        && !(pathname.substr(0,2) == './' || pathname.substr(0,3) == '../')
        ;
};

module.exports = _ME;
