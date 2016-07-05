/**
 * 打包主流程。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
     , fs = require('fs')
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
     , cmdfind = require('./cmdfind')
     , inform = require('./inform')
     , exporter = require('./exporter')
     , packCommon = require('./packCommon')
     ;

var _ME = {};

_ME.infos = [];
_ME.templates = [];
_ME.asyncQueueCount = 0;

//-----------------------------------------------------------------------------
// 普通脚本处理流程。
// item { realpath, type }。

_ME.one = (info) => {
    info.name = _ME.getModuleName(info.realpath);
    info.code = fs.readFileSync(info.realpath, 'utf8');

    if (info.realpath.endsWith('.json')) {
        inform.status('loadJson');
        let jsoncode = fs.readFileSync(info.realpath);
        info.code = `${CONFIG.symbol.define}("${info.name}", ${jsoncode})`;
    }
    else {
        inform.status('react / es2015');
        _ME.react(info);

        inform.status('cmd2amd');
        _ME.cmd2amd(info);

        // @deprecated?
        if (info.isMain) {
            _ME.main(info);
        }

        if (info.type == 'entry') {
            _ME.entry(info);
        }
    }

    inform.status('save');
    _ME.save(info);
};

_ME.replaceInTempaltes = (PLACEHOLDER, realword) => {
    _ME.templates.forEach((info) => {
        info.code = info.code.replace(PLACEHOLDER, realword);
    });
};

_ME.entry = (info) => {
    _ME.replaceInTempaltes(/MOLES_ENTRY_MODULE_NAME/g, info.name);
};

_ME.main = (info) => {
    _ME.replaceInTempaltes(/MOLES_REGISTER_COMPONENT_NAME/g, info.registerComponentName);
};

_ME.save = (info) => {
    if (OPTIONS.bundle) {
        _ME.infos.push(info);
    }
    else if (info.type == 'entry') {
        _ME.infos.push(info);
        inform.status('suspended');
    }
    else {
        // 写入文件。
        exporter.saveCode(exporter.name2realpath(info.name), info.code);
    }
};

_ME.getModuleName = (realpath) => {
    var name = path.relative(OPTIONS.input, realpath);

    // @debug
    name = name.replace(/^node_modules/, 'TP_modules');

    return exporter.uniformModuleName(name);
};

_ME.react = (info) => {
    var result = babel.transform(info.code, {
        'presets': [ 'es2015', 'stage-0', 'react' ],
        'plugins': [ 'transform-es5-property-mutators', 'transform-class-properties' ]
    });
    info.code = result.code;
};

_ME.cmd2amd = (info) => {
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

            if (info.isMain) {
                // @deprecated
            }

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

            // 公包预加载模块，替换为公包中的模块名。
            let preDefinedName = OPTIONS.COMMON_MODULES[requireName];
            if (preDefinedName) {
                return new UglifyJS.AST_Call({
                    expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.execRequire }),
                    args: [ new UglifyJS.AST_String({ value: requireName }) ]
                });
            }

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

            if (!transformedRequireName) {
                // 否则，认为引用的是一个普通模块。
                // 转换成绝对路径。

                let requireRealpath = cmdfind({
                    source : info.realpath,
                    name   : requireName,
                    root   : OPTIONS.input
                });

                if (!requireRealpath) {
                    // @TODO
                }

                _ME.pushQueue(requireRealpath);
                transformedRequireName = _ME.getModuleName(requireRealpath);
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
            info.isMain = true;
            info.registerComponentName = node.body.args[0].value;
            
            let nodeReturn = node.body.args[1].body.pop();

            // info.registerComponentVarname = nodeReturn.value.name;
            /^return (.+);$/.exec(exporter.format(nodeReturn, true));
            info.registerComponentVarname = RegExp.$1;

            // 创建“函数调用”节点，用于“注册（替换）”组件。
            let nodeRegisterComponent = new UglifyJS.AST_Call({
                expression: new UglifyJS.AST_SymbolRef({ name: CONFIG.symbol.registerComponent }),
                args: [ new UglifyJS.AST_SymbolRef({ name: info.registerComponentVarname }) ]
            });

            return nodeRegisterComponent;

            // // 返回空声明，即等同于删除该节点。
            // return new UglifyJS.AST_EmptyStatement();
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

_ME.bundle = (() => {
    var run = (callback) => {
        var INDEXES = {
            common : 0,
            requireLite : 1,
            top    : 2,
            normal : 3,
            asset  : 4,
            entry  : 5,
            bottom : 6
        };

        var code = _ME.infos
            .sort((a, b) => {
                var ret = 0, m = INDEXES[a.type], n = INDEXES[b.type];
                return m == n ? 0 : ( m > n ? 1 : -1);
            })
            .map( (info) => {
                inform.bundle({ type: info.type, name: info.name });
                return info.code;
            })
            .join(';\n');

        inform.log({ target: OPTIONS.bundle, type: 'bundle' });

        if (OPTIONS.dev) {
            code = [ 'try {', code, '} catch(ex) { console.log(ex); }' ].join('\n');
        }
        yuancon.fs.mkdirp(path.dirname(OPTIONS.bundle));
        exporter.saveCode(OPTIONS.bundle, code);

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
    // 参数 moduleName 保留待用。
    Fn.wait = (moduleName) => {
        count++;
    };
    Fn.come = (moduleName) => {
        count--;
        if (count == 0 && ongoing) run();
    };

    return Fn;
})();

//-----------------------------------------------------------------------------
// 普通脚本队列管理。

_ME.queue = [];
_ME.queueCursor = 0;

_ME.pushQueue = function(realpath, type) {
    if (!type) type = 'normal';

    // 仅处理单个文件时，不分析除入口文件以外的其他文件。
    if (OPTIONS.single && type != 'entry') return;

    var nomatch = (item) => {
        return item.realpath != realpath;;
    };
    if (_ME.queue.every(nomatch)) {
        _ME.queue.push({ realpath, type });
    }
};

_ME.run = () => {
    inform('-- start --');

    var info;
    var templateDirname = path.join(__dirname, '..', 'template');

    if (OPTIONS.standalone) {
        let common = packCommon();
        _ME.infos.push({ code: common.code, type: 'common' });

        // var common = fs.readFileSync(path.join(moles_template, 'common.js'), 'utf8');
        // _ME.infos.push({ code: common, type: 'common' });

        // var requireLite = fs.readFileSync(path.join(templateDirname, 'requireLite.js'), 'utf8');
        // _ME.infos.push({ code: exporter.format(requireLite), type: 'requireLite' });
    }

    var top = fs.readFileSync(path.join(templateDirname, 'entry.top.js'), 'utf8');
    info = { code: exporter.format(top), type: 'top' };
    _ME.infos.push(info);
    _ME.templates.push(info);

    var bottom = fs.readFileSync(path.join(templateDirname, 'entry.bottom.js'), 'utf8');
    info = { code: exporter.format(bottom), type: 'bottom' }
    info.code = info.code.replace('MOLES_EXEC_ON_REQUIRED', OPTIONS.execOnRequired);
    _ME.infos.push(info);
    _ME.templates.push(info);

    var cursor = 0;
    while (cursor < _ME.queue.length) {
        var item = _ME.queue[cursor++];
        inform.log({ source: item.realpath, type: item.type });
        inform.status('start');
        _ME.one(item);
        inform.status();
    }

    if (OPTIONS.bundle) {
        _ME.bundle(OPTIONS.callback);
    }
    // 输出入口文件。
    else {
        let infoEntry = yuan.array.find.first(_ME.infos, { type: 'entry' });

        let getCode = (type) => yuan.array.find.first(_ME.infos, { type: type }).code;

        if (OPTIONS.standalone) {
            infoEntry.code = [
                getCode('common'),
                getCode('requireLite'),
                getCode('top'),
                infoEntry.code,
                getCode('bottom')
            ].join('\n');
        }
        else {
            infoEntry.code = [
                getCode('top'),
                infoEntry.code,
                getCode('bottom')
            ].join('\n');
        }
        inform.log({ target: exporter.name2realpath(infoEntry.name), type: 'entry' });
        exporter.saveCode(exporter.name2realpath(infoEntry.name), infoEntry.code);

        if (!OPTIONS.isCLI) { OPTIONS.callback(); }
    }
};

assetDealer.getTransform(_ME);
module.exports = _ME;
