/**
 * 资源处理方法集。
 * @author jiangjing
 */
'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , yuancon = require('yuan-console')
    ;

var LIB_REQUIRE
    , CONFIG = require('./parseConfig')()
    , OPTIONS = require('./parseOptions')()
    , exporter = require('./exporter')
    , inform = require('./inform')
    ;

var _ME = {};

// 获取目前所支持的所有模块。
_ME.PLUGINS = {};
fs.readdirSync(path.join(__dirname, './AssetsPlugin')).forEach((name) => {
    _ME.PLUGINS[name] = require('./AssetsPlugin/' + name);
});

_ME.registered = [];

/**
 * @param {object}  options
 * @param {UglifyJS.AST_Node}
 *                  options.node
 * @param {String}  options.sourceRealpath
 * @param {String}  options.requireName
 *
 * @param {object}  asset
 * @param {String}  asset.componentName
 */
_ME.getRequireName = (options, asset) => {
    var ComponentName = asset.componentName;

    var relapth = path.relative(OPTIONS.input, path.join(options.sourceRealpath, '..', options.requireName));
    // 获取模块的注册名称。
    // 以 / 起始代表这是一个特殊模块（不同于基于真实脚本的模块）。
    var moduleName = exporter.uniformModuleName(path.join('/', CONFIG.path.assetModules, ComponentName, relapth + '.js'));

    // 如果模块尚未注册，则：
    // 0. 调用插件，拷贝相关资源文件，并生成注册脚本代码；
    // 1. 创建注脚脚本文件；
    if (_ME.registered.indexOf(moduleName) < 0) {

        // 注册脚本文件的真实路径。
        let jsRealpath = exporter.name2realpath(moduleName);

        // 由于生成注册脚本代码的过程是异步的，
        // 故，如果需要捆绑输出代码，则需要先预留该信息（表明相关模块脚本正在创建中）。
        if (OPTIONS.bundle) {
            transform.bundle.wait(moduleName);
        }

        // 创建 Asset 模块脚本。
        // 注意：这是一个异步调用。
        options.sourceRoot = OPTIONS.input;
        options.moduleName = moduleName;
        options.outputRoot = OPTIONS.output;

        // 创建事务序列号，默认注册该事务。
        var eventId = inform.genEventId();

        _ME.PLUGINS[ComponentName].generateCode(options, (err, code) => {
            if (err) {
                return inform.exit(err);
            }
            inform.waiting

            code = exporter.format(code);

            // 通知主流程，模块脚本创建完成。
            if (OPTIONS.bundle) {
                transform.infos.push({
                    name: moduleName,
                    type: 'asset',
                    code: code
                });
                transform.bundle.come(moduleName);
            }
            else {
                inform.log({ target: jsRealpath , type: 'asset' });
                // 写入脚本文件。
                fs.writeFileSync(jsRealpath, code, 'utf8');
            }

            // 通知主流程该项事务完成。
            inform.end(eventId);
        });

        // 登记为已注册。
        _ME.registered.push(moduleName);
    }

    return moduleName;
};

/**
 * options.node
 * options.sourceRealpath
 * options.requireName
 */
_ME.findRequireName = (options) => {
    for (var name in _ME.PLUGINS) {
        var asset = _ME.PLUGINS[name].match(options);
        if (asset) {
            asset.componentName = name;
            /**
             * asset.componentName
             */
            return _ME.getRequireName(options, asset);
        }
    }
};

module.exports = _ME;
