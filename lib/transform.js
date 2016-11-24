/**
 * 打包主流程。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
     , fs = require('fs')
     , os = require('os')
     , path = require('path')
     , babel = require('babel-core')
     , UglifyJS = require('uglify-js')
     , yuan = require('yuan')
     , yuancon = require('yuan-console')
     ;

var LIB_REQUIRE
     , OPTIONS = require('./parseOptions')()
     , CONFIG = require('./parseConfig')()
     , assetDealer = require('./assetDealer')
     , cache = require('./cache')
     , cmdfind = require('./cmdfind')
     , common = require('./common')
     , inform = require('./inform')
     , exporter = require('./exporter')
     , packCommon = require('./packCommon')
     , template = require('./template')
     ;

var INTERNAL_VARS
    , _infos
    , _queue
    , _project
    ;

var _ME = () => {
    inform.header('Process business code');

    // Reset registers.
    _infos = [];
    _queue = [];
    _project = {
        execOnRequired: OPTIONS.execOnRequired
    };

    _pushQueue(OPTIONS.entry, 'entry');
    var cursor = 0;
    while (cursor < _queue.length) {
        var item = _queue[cursor++];
        inform.log({ source: item.realpath, type: item.type });
        _one(item);
    }

    // "top" and "bottom" codes depend on info generated while transform normal / entry files.

    _infos.push({
        code: template.render('entry.top.swig', _project),
        type: 'top'
    });

    _infos.push({
        code: template.render('entry.bottom.swig', _project),
        type: 'bottom'
    });

    if (OPTIONS.bundle) {
        _bundle(inform.end);
    }

    // 输出入口文件。
    else {
        let codes = [];
        ['top', 'entry', 'bottom'].forEach((type) => {
            codes.push(yuan.array.find.first(_infos, { type: type }).code);
        });
        let entryCode = codes.join(';' + os.EOL);

        let infoEntry = yuan.array.find.first(_infos, { type: 'entry' });
        let entryRealpath = exporter.name2realpath(infoEntry.name);

        inform.log({ target: entryRealpath, type: 'entry' });

        cache.meta.addModule({
            id: infoEntry.name,
            path: path.relative(OPTIONS.output, entryRealpath)
        });
        exporter.saveCode(entryRealpath, entryCode);

        inform.end();
    }
};

//-----------------------------------------------------------------------------
// 脚本处理流程。
// item { realpath, type }。

var _one = (info) => {
    inform.status('start');

    info.name = _getModuleName(info.realpath);
    info.code = fs.readFileSync(info.realpath, 'utf8');

    if (info.realpath.endsWith('.json')) {
        inform.status('loadJson');
        let jsoncode = fs.readFileSync(info.realpath);
        info.code = `${CONFIG.symbol.define}("${info.name}", ${jsoncode})`;
    }
    else {
        inform.status('react / es2015');
        _transform_react(info);

        inform.status('cmd2amd');
        _transform_cmd2amd(info);

        if (info.type == 'entry') {
            _project.entryName = info.name;
            cache.meta.setEntry(info.name);
        }
    }

    inform.status('save');

    inform.status();
    _save(info);
};

var _getModuleName = (realpath) => {
    var name = path.relative(OPTIONS.input, realpath);

    // @debug
    name = name.replace(/^node_modules/, 'TP_modules');

    return exporter.uniformModuleName(name);
};

var _transform_react = (info) => {
    var result = babel.transform(info.code, {
        'presets': [ require('../node_modules/babel-preset-es2015'), require('../node_modules/babel-preset-stage-0'), require('../node_modules/babel-preset-react') ],
        'plugins': [ require('../node_modules/babel-plugin-transform-es5-property-mutators'), require('../node_modules/babel-plugin-transform-class-properties') ]
    });
    info.code = result.code;
};

var _transform_cmd2amd = (info) => {
    var MODULE_VARNAME_PREFIX = '_MOLES_REQ_';

    var basedir = path.dirname(info.realpath);
    var baseNodeModules = path.resolve(basedir, 'node_modules');

    var modules = [];
    var transformer = new UglifyJS.TreeTransformer(function(node, descend) {
        if (node instanceof UglifyJS.AST_Toplevel) {
            descend(node, this);

            // 构建语法树：。
            // Function(String, [ String, ... ], Function(SymbolFunarg, ...) { body })。

            // 创建“字符串”节点。
            var nodeString = new UglifyJS.AST_String({ value: info.name });

            // 创建“字符串”节点数组。
            var names = [ new UglifyJS.AST_String({ value: 'module' }) ];
            modules.forEach(function(name) {
                // 创建字符串节点，添加到数组中。
                names.push(new UglifyJS.AST_String({ value: name }));
            });

            // 创建“数组”节点。
            var nodeArray = new UglifyJS.AST_Array({
                elements: names
            });

            // 创建“函数参数”节点数组。
            var funargs = [], varnames = [ 'module' ];
            modules.forEach(function(name, index) {
                varnames.push(MODULE_VARNAME_PREFIX + index);
            });
            varnames.forEach(function(varname) {
                // 创建函数参数符号节点，添加到数组中。
                funargs.push(new UglifyJS.AST_SymbolFunarg({ name: varname }));
            });

            // 创建“函数”节点。
            var nodeFunction = new UglifyJS.AST_Function({
                argnames: funargs,
                body: node.body
            });

            // 创建“返回”节点。
            var nodeReturn = new UglifyJS.AST_Return({
                value: new UglifyJS.AST_SymbolRef({ name: 'module.exports' })
            });
            let nodeSemicolon = new UglifyJS.AST_Symbol({ name: ';' });
            nodeFunction.body.push(nodeSemicolon);
            nodeFunction.body.push(nodeReturn);

            // 创建“函数调用”节点。
            var nodeDefine = new UglifyJS.AST_Call({
                expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.define }),
                args: [ nodeString, nodeArray, nodeFunction ]
            });

            return nodeDefine;
        }

        // 捕捉所有的 require() 调用。
        else if (node instanceof UglifyJS.AST_Call && node.expression.name == 'require') {
            // @debug 本段仅供调试
            if (node.start.value != 'require') {
                console.log(exporter.format(node));
                inform.exit('DEV ERROR No. 1');
            }

            // 获取 require 参数字符串值。
            var requireName = node.args[0].value;

            let requireRealpath = cmdfind({
                source : info.realpath,
                name   : requireName,
                root   : OPTIONS.input
            });

            // 判断模块是否为公包预加载模块。
            if (cmdfind.isModuleNameStyle(requireName)) {
                let moduleInfo, moduleId;

                if (requireRealpath) {
                    moduleInfo = cmdfind.parse(requireRealpath);
                }
                else {
                    moduleInfo = {
                        version: null,
                        versionRange: '*'
                    }
                }
                moduleInfo.name = requireName;

                if (moduleId = common.findModuleId(moduleInfo)) {
                    return new UglifyJS.AST_Call({
                        expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.execRequire }),
                        args: [ new UglifyJS.AST_String({ value: moduleId }) ]
                    });
                }
            }

            // 公包预加载模块，替换为公包中的模块名。
            // let preDefinedName = OPTIONS.COMMON_MODULES[requireName];
            // if (preDefinedName) {
            //     return new UglifyJS.AST_Call({
            //         expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.execRequire }),
            //         args: [ new UglifyJS.AST_String({ value: requireName }) ]
            //     });
            // }

            let transformedRequireName;

            // 如果仅对单个文件进行处理，则不分析资源。
            if (OPTIONS.single) {
                transformedRequireName = requireName;
            }

            if (!transformedRequireName) {
                // 如果引用的是一个 Asset。
                transformedRequireName = assetDealer.findRequireName({
                    sourceRealpath: info.realpath,
                    requireName: requireName,
                    node: node
                });
            }

            // @TODO 此块判断逻辑是否可以提前？
            if (!transformedRequireName) {
                // 否则，认为引用的是一个普通模块。
                // 转换成绝对路径。

                if (!requireRealpath) {
                    inform.exit(`Required "${requireName}" not found in "${info.realpath}"`);
                }

                _pushQueue(requireRealpath);
                transformedRequireName = _getModuleName(requireRealpath);
            }

            // 加入到当前模块的依赖列表中。
            modules.push(transformedRequireName);

            if (OPTIONS.execOnRequired) {
                return new UglifyJS.AST_Call({
                    expression: new UglifyJS.AST_SymbolRef({ name: OPTIONS.symbol.execRequire }),
                    args: [ new UglifyJS.AST_String({ value: transformedRequireName }) ]
                });
            }
            else {
                var varname = MODULE_VARNAME_PREFIX + (modules.length - 1);

                // 用“变量引用”节点替代 require() “函数调用”节点。
                return new UglifyJS.AST_SymbolRef({ name: varname });
            }
        }

        /**
         * AppRegistry.registerComponent('registerComponent', () => componentInstanceVarName);
         */
        else if (node instanceof UglifyJS.AST_Statement
            && node.body
            && node.body.expression
            && node.body.expression.property == 'registerComponent'
            && node.body.expression.expression
            && node.body.expression.expression.property == 'AppRegistry'
        ) {
            _project.componentName = node.body.args[0].value;

            let nodeReturn = node.body.args[1].body.pop();

            // info.registerComponentVarname = nodeReturn.value.name;
            /^return (.+);$/.exec(exporter.format(nodeReturn, true));
            info.registerComponentVarname = RegExp.$1;

            // 创建“函数调用”节点，用于“注册（替换）”组件。
            let nodeRegisterComponent = new UglifyJS.AST_Call({
                expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.changeComponent }),
                args: [ new UglifyJS.AST_SymbolRef({ name: info.registerComponentVarname }) ]
            });

            // return nodeRegisterComponent;

            // // 返回空声明，即等同于删除该节点。
            return new UglifyJS.AST_EmptyStatement();
        }

        else {
            descend(node, this);
            return node;
        }
    });

    // AST means Abstract Syntax Tree（抽象语法树）。
    var ast = UglifyJS.parse('var exports = module.exports; ' +info.code);
    ast = ast.transform(transformer);
    inform.status('format');
    info.code = exporter.format(ast) + ';';
};

//-----------------------------------------------------------------------------
// 输出。

var _save = (info) => {
    if (OPTIONS.bundle) {
        _infos.push(info);
    }
    else if (info.type == 'entry') {
        _infos.push(info);
    }
    else {
        let code = template.render('module.swig', { MODULE_CODE: info.code });

        // 写入文件。
        let realpath = exporter.name2realpath(info.name);
        exporter.saveCode(realpath, code);

        inform.log({ target: realpath, type: 'normal' });
        cache.meta.addModule({
            id: info.name,
            path: path.relative(OPTIONS.output, realpath)
        });
    }
};

var _bundle = (() => {
    var saveBundle = (platform, code) => {
        var realpath = path.join(OPTIONS.output, CONFIG.path.bundle[platform]);
        inform.log({ target: realpath, type: 'bundle' });
        exporter.saveCode(realpath, code);
    };

    var run = (callback) => {
        var INDEXES = {
            // common : 0,
            // requireLite : 1,
            top    : 2,
            normal : 3,
            asset  : 4,
            entry  : 5,
            bottom : 6
        };

        var code = _infos
            // Sort codes in order of INDEXES.
            .sort((a, b) => {
                var ret = 0, m = INDEXES[a.type], n = INDEXES[b.type];
                return m == n ? 0 : ( m > n ? 1 : -1);
            })
            // To print a log line for each item to be bundled,
            // then return an array of codes.
            .map( (info) => {
                inform.bundle({ type: info.type, name: info.name });
                return info.code;
            })
            .join(';' + os.EOL);

        if (OPTIONS.standalone) {
            for (let platform in OPTIONS.COMMON.bundle) {
                let newcode = OPTIONS.COMMON.bundle[platform] + ';' + os.EOL + code;
                saveBundle(platform, newcode);
            }
        }
        else {
            saveBundle(OPTIONS.platform, code);
        }

        callback && callback();
    };

    var Fn = (callback) => {
        if (!OPTIONS.bundle) return false;

        // bundle() 在流程最后执行，
        // 若此时无异步操作须等待，则直接执行。
        if (count == 0) run(callback);
        else ongoing = true;
    };

    var count = 0, ongoing = false;

    _ME.waitByModuleName = (moduleName) => {
        count++;
    };

    _ME.setReadyByModuleInfo = (moduleInfo) => {
        count--;
        if (count == 0 && ongoing) run();
    };

    return Fn;
})();

//-----------------------------------------------------------------------------
// 脚本队列管理。

var _pushQueue = function(realpath, type) {
    if (!type) type = 'normal';

    // 仅处理单个文件时，不分析除入口文件以外的其他文件。
    if (OPTIONS.single && type != 'entry') return;

    var nomatch = (item) => {
        return item.realpath != realpath;;
    };
    if (_queue.every(nomatch)) {
        _queue.push({ realpath, type });
    }
};

//-----------------------------------------------------------------------------
// 暴露方法。

_ME.addModule = (info) => {
    _infos.push(info);
};

assetDealer.getTransform(_ME);
module.exports = _ME;
