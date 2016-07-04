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

var _exists = function(pathname) {
    return fs.existsSync(pathname);
    try {
        fs.readFileSync(pathname);
        return true;
    } catch(ex) {
        return false;
    }
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

    // 如果参数值以 ./ ../ 或斜杠起始，则代表这是一个路径而非模块名。
    // 注意，即使在 windows 系统中，require() 的引用路径中也必须使用斜杠 / 而非反斜杠 \。
    if (requireName.substr(0,1) == '/' || requireName.substr(0,2) == './' || requireName.substr(0,3) == '../') {
        requireRealpath = path.join(sourceDirname, requireName);

        if (yuancon.fs.isDir(requireRealpath)) {
            requireRealpath = path.join(requireRealpath, 'index.js');
        }
        else {
            // 校正后缀名，尝试 *.js 文件
            if (!_exists(requireRealpath)) {
                requireRealpath += '.js';
            }

            // 校正后缀名，尝试 *.json 文件
            if (!_exists(requireRealpath)) {
                requireRealpath = requireRealpath.replace(/\.js$/, '.json');
            }
        }

        if (!_exists(requireRealpath)) {
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
            if (options.root && nodePath.substr(0, options.root.length) != options.root) {
                // 路径溢出。
                break;
            }
            if (_exists(nodePath)) {
                requireRealpath = path.join(nodePath, requireName);
                found = _exists(requireRealpath);

                if (isModuleEntry) {
                    // 尝试取模块入口文件。
                    if (found) {
                        // 获取 package.json 数据。
                        var packageJson = JSON.parse(fs.readFileSync(path.join(requireRealpath, 'package.json')));
                        // 为什么不用 require() 直接获取呢？。
                        // 因为在 windows 系统中，系统路径中使用反斜杠作为目录分隔符，故不得作为 require() 方法参数。

                        if (packageJson.main) {
                            // 取指定入口文件。
                            requireRealpath = path.join(requireRealpath, packageJson.main);
                        }
                        else {
                            // 取默认入口文件。
                            requireRealpath = path.join(requireRealpath, 'index.js');
                        }

                        if (!_exists(requireRealpath)) {
                            return inform.exit(`Entry of module "${requireRealpath}" not found.`);
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
                    found = _exists(requireRealpath);
                }
            }
            if (!found) {
                nodePath = path.join(nodePath, '../../node_modules');
            }
        } while (!found)

        if (!found) requireRealpath = null;
    }

    // 如果未找到脚本，强制退出。
    if (!requireRealpath) {
        inform.exit(`Required "${requireName}" not found in "${sourceRealpath}"`);
    }

    return requireRealpath;
};

_ME.foundType = null;

module.exports = _ME;
