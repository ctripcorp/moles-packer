#!/usr/bin/env node

'use strict';

var MODULE_REQUIRE
	, fs = require('fs')
	, path = require('path')
	, babel = require('babel-core')
	, UglifyJS = require('uglify-js')
	, minimist = require('minimist')
	, yuan = require('yuan')
	, yuancon = require('yuan-console')
	;

var MODULE_PRELOADED = {
	  'react'            : 'global.react'
	, 'react-native'     : 'global.reactNative'
	};

var SYMBOL_DEFINE = 'global.define';
var SYMBOL_REQUIRE_AND_RETURN = 'global.re2';
var SYMBOL_REGISTER_COMPONENT = 'global.changeComponent';

var argv, transform;
var OPTIONS = {};
global.J2 = {};


//-----------------------------------------------------------------------------
var help = function() {
	yuancon.print
		.br()
		.indent(4)
		// .markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/')
		// .br()
		// .markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/ /em:--dev/')
		// .br()
		// .markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/ /em:--standalone/')
		// .br()
		.markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/ /em:--common/')
		// .br()
		// .markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/ /em:--strict-cmd/')
		// .br()
		// .markup('packer /em:--input/ /param:SOURCE_DIRNAME/ /em:--output/ /param:BUILDED_DIRNAME/ /em:--bundle/ /param:FILENAME/')
		// .br()
		// .markup('packer /em:--entry/ /param:ENTRY_FILENAME/ /em:--output/ /param:BUILDED_DIRNAME/')
		.br()
		.markup('packer /em:--entry/ /param:ENTRY_FILENAME/ /em:--bundle/ /param:FILENAME/')
		.br()
		.markup('packer /em:--help/')
		.br()
		.markup('packer /em:--version/')
		.br()
		.indent(0)
		.br()
		;
};

//-----------------------------------------------------------------------------
// 其他内部函数。
var inform = (msg) => {
	yuancon.print.line(`[PACKER] ${msg}`);
};
global.J2.inform = inform;

inform.log = (options) => {
	if (!inform.log.called) {
		yuancon.print.dim('[SOURCE] ').em('BASE: ' + OPTIONS.input).br();
		yuancon.print.dim('[TARGET] ').em('BASE: ' + OPTIONS.output).br();
	}
	if (options.source) {
		yuancon.print.dim('[SOURCE] ').em(path.relative(OPTIONS.input, options.source)).dim(` ( ${options.type} )`).br();
	}
	if (options.target) {
		yuancon.print.dim('[TARGET] ').codeInline(path.relative(OPTIONS.output, options.target)).dim(` (${options.type} )`).br();
	}
	inform.log.called = true;
};
inform.log.called = false;

inform.status = (word) => {
	if (word) yuancon.print.em(word).dim(' ... ');
	else yuancon.print.clearLine();
};

inform.warn = (line) => {
	yuancon.print.warning('[PACKER] ' + line);
};

inform.bundle = (options) => {
	yuancon.print.dim('[BUNDLE] ').em(yuan.ifEmpty(options.name, '-')).dim(` (${options.type})`).br();
}

inform.exit = (msg) => {

	yuancon.print.error('[PACKER] ' + msg);
	process.exit(1);
};

//-----------------------------------------------------------------------------
// 参数处理。
argv = minimist(process.argv.slice(2));

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

// 由 run.js 间接调用的时候，需要指定基础目录。
OPTIONS.base = argv.base || '.';

// 默认以当前目录作为待编译项目根目录。
OPTIONS.input = path.resolve(OPTIONS.base, argv.input || '.');

// 默认以 [项目根目录]/index.js 作为入口文件。
OPTIONS.entry = path.resolve(OPTIONS.input, argv.entry || 'index.js');
if (!fs.existsSync(OPTIONS.entry)) {
	inform.exit('Entry file not found.\n' + OPTIONS.entry)
}

// 默认以 [当前目录]/build 作为输出根目录。
OPTIONS.output = path.resolve(argv.output || 'build');

// standalone
// default FALSE
OPTIONS.standalone = !!argv.standalone;



var moles_template = path.join(OPTIONS.input, '.moles_template');


// bundle
// default undefined
// 该选项应为相对于输出目录的相对路径，如果选项未附带值，则以 entry 的相对路径（相对于项目）取代。
if (argv.bundle) {
	OPTIONS.bundle = (typeof argv.bundle == 'boolean')
		? path.relative(OPTIONS.input, OPTIONS.entry)
		: argv.bundle
		;
}

// strictCmd
// default FALSE
OPTIONS.strictCmd = !!argv['strict-cmd'];

// dev
// default FALSE
OPTIONS.dev = !!argv.dev;

// 切换工作目录到脚本所在目录。
process.chdir(__dirname);

//-----------------------------------------------------------------------------
// require 寻址逻辑。
var BASE_NODE_PATH = path.join(OPTIONS.input, 'node_modules');

// 分析在脚本文件 sourceRealpath 中的 require(requireName) 语句，。
// 获取 requireName 指代的脚本文件的绝对路径。
var getRequireRealpath = (/*String*/ sourceRealpath, /*String*/ requireName) => {
	var sourceDirname = path.dirname(sourceRealpath);
	var requireRealpath;

	// 如果参数值以 ./ ../ 或斜杠起始，则代表这是一个路径而非模块名。
	// 注意，即使在 windows 系统中，require() 的引用路径中也必须使用斜杠 / 而非反斜杠 \。
	if (requireName.substr(0,1) == '/' || requireName.substr(0,2) == './' || requireName.substr(0,3) == '../') {
		requireRealpath = path.join(sourceDirname, requireName);

		// 校正后缀名。
		if (!fs.existsSync(requireRealpath)) {
			requireRealpath += '.js';
		}

		if (!fs.existsSync(requireRealpath)) {
			requireRealpath = null;
		}
	}

	else {
		// 如果参数值包含斜杠，代表引用的是模块内部的具体脚本。
		// 否则，代表引用的是模块的入口文件。
		// 注意，即使在 windows 系统中，require() 的引用路径中也必须使用斜杠 / 而非反斜杠 \。
		// 在判断前，先剔除私有域前缀。
		var isEntry = (requireName.replace(/^@[^\/]+\//, '').indexOf('/') == -1);

		// 起始的寻址目录。
		var nodePath = path.join(sourceDirname, 'node_modules');

		var found = false;
		do {
			if (nodePath.substr(0, OPTIONS.input.length) != OPTIONS.input) {
				// 路径溢出。
				break;
			}
			if (fs.existsSync(nodePath)) {
				requireRealpath = path.join(nodePath, requireName);
				found = fs.existsSync(requireRealpath);

				if (isEntry) {
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

						if (!fs.existsSync(requireRealpath)) {
							inform.exit(`Entry of module "${requireRealpath}" not found.`);
						}
					}
				}
				else {
					// 尝试取脚本文件本身。
					if (!found) {
						requireRealpath += '.js';
						found = fs.existsSync(requireRealpath);
					}
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

var uniformModuleName = (name) => {
	// 统一路径分隔符。
	return name.replace(/\\/g, '/');
};

//-----------------------------------------------------------------------------
// 输出处理。

var outputer = {};






outputer.name2realpath = (name) => {
	// 输出结果。
	var outputRealpath = path.join(OPTIONS.output, name.replace('\\', '/'));

	// 创建目录。
	yuancon.fs.mkdirp(path.dirname(outputRealpath));

	return outputRealpath;
};

outputer.format = (code) => {
	var ast;
	if (typeof code == 'string') {
		ast = UglifyJS.parse(code);
 	}
	else {
		ast = code;
	}

	if (1 || OPTIONS.dev) {
		var stream = UglifyJS.OutputStream({
			indent_start  : 0,     // start indentation on every line (only when `beautify`)。
			indent_level  : 4,     // indentation level (only when `beautify`)。
			quote_keys    : false, // quote all keys in object literals?。
			space_colon   : true,  // add a space after colon signs?。
			ascii_only    : false, // output ASCII-safe? (encodes Unicode characters as ASCII)。
			inline_script : false, // escape "</script"?。
			width         : 80,    // informative maximum line width (for beautified output)。
			max_line_len  : 32000, // maximum line length (for non-beautified output)。
			beautify      : true, // beautify output?。
			source_map    : null,  // output a source map。
			bracketize    : false, // use brackets every time?。
			comments      : false, // output comments?。
		});
		ast.print(stream);
		code = stream.toString();
	}

	if (!OPTIONS.dev) {
		if (!(ast instanceof UglifyJS.AST_Toplevel)) {
			ast = UglifyJS.parse(code);
		}
		ast.figure_out_scope();
		var compressor = UglifyJS.Compressor({
			sequences     : true,  // join consecutive statemets with the “comma operator”
			properties    : true,  // optimize property access: a["foo"] → a.foo
			dead_code     : true,  // discard unreachable code
			drop_debugger : true,  // discard “debugger” statements
			unsafe        : false, // some unsafe optimizations (see below)
			conditionals  : true,  // optimize if-s and conditional expressions
			comparisons   : true,  // optimize comparisons
			evaluate      : true,  // evaluate constant expressions
			booleans      : true,  // optimize boolean expressions
			loops         : true,  // optimize loops
			unused        : true,  // drop unused variables/functions
			hoist_funs    : true,  // hoist function declarations
			hoist_vars    : false, // hoist variable declarations
			if_return     : true,  // optimize if-s followed by return/continue
			join_vars     : true,  // join var declarations
			cascade       : true,  // try to cascade `right` into `left` in sequences
			side_effects  : true,  // drop side-effect-free statements
			warnings      : true,  // warn about potentially dangerous optimizations/code
			global_defs   : {}     // global def
		});
		ast = ast.transform(compressor);
		code = ast.print_to_string();
	}

	return code;
};

//-----------------------------------------------------------------------------
// 处理流程。
var transform = {};

transform.infos = [];
transform.templates = [];
transform.asyncQueueCount = 0;

//-----------------------------------------------------------------------------
// 普通脚本处理流程。
// item { realpath, type }。

transform.one = (info) => {
	info.name = transform.getModuleName(info.realpath);
	info.code = fs.readFileSync(info.realpath, 'utf8');

	inform.status('react / es2015');
	transform.react(info);

	inform.status('cmd2amd');
	transform.cmd2amd(info);

	if (info.isMain) {
		transform.main(info);
	}

	if (info.type == 'entry') {
		transform.entry(info);
	}

	inform.status('save');
	transform.save(info);
};

transform.replaceInTempaltes = (PLACEHOLDER, realword) => {
	transform.templates.forEach((info) => {
		info.code = info.code.replace(PLACEHOLDER, realword);
	});
};

transform.entry = (info) => {
	transform.replaceInTempaltes(/CRN_ENTRY_MODULE_NAME/g, info.name);
};

transform.main = (info) => {
	transform.replaceInTempaltes(/CRN_REGISTER_COMPONENT_NAME/g, info.registerComponentName);
};

transform.save = (info) => {
	if (OPTIONS.bundle) {
		transform.infos.push(info);
	}
	else if (info.type == 'entry') {
		transform.infos.push(info);
		inform.status('suspended');
	}
	else {
		// 写入文件。
		fs.writeFileSync(outputer.name2realpath(info.name), info.code);
	}
};

transform.getModuleName = (realpath) => {
	var name = path.relative(OPTIONS.input, realpath);

	// @debug
	name = name.replace(/^node_modules/, 'TP_modules');

	return uniformModuleName(name);
};

transform.react = (info) => {
	var result = babel.transform(info.code, {
		'presets': [ 'stage-0', 'react', 'es2015' ],
		'plugins': [ 'transform-es5-property-mutators' ]
	});
	info.code = result.code;
};

transform.cmd2amd = (info) => {
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
				// // 创建“函数调用”节点，用于“注册（替换）”组件。
				// let nodeRegisterComponent = new UglifyJS.AST_Call({
				// 	expression: new UglifyJS.AST_SymbolRef({ name: SYMBOL_REGISTER_COMPONENT }),
				// 	args: [ new UglifyJS.AST_SymbolRef({ name: info.registerComponentVarname }) ]
				// });
				//
				// let nodeSemicolon = new UglifyJS.AST_Symbol({ name: ';' });
				//
				// nodeFunction.body.push(nodeRegisterComponent, nodeSemicolon);
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
				expression: new UglifyJS.AST_SymbolRef({ name: SYMBOL_DEFINE }),
				args: [ nodeString, nodeArray, nodeFunction ]
			});

			return nodeDefine;
		}

		// 捕捉所有的 require() 调用。
		else if (node instanceof UglifyJS.AST_Call && node.start.value == 'require') {
			// 获取 require 参数字符串值。
			var requireName = node.args[0].value;

			// 公包预加载模块，直接返回其引用。
			if (MODULE_PRELOADED.hasOwnProperty(requireName)) {
				return new UglifyJS.AST_SymbolRef({ name: MODULE_PRELOADED[requireName] });
			}

			// 公包预包含模块，保留原加载方式。

			var COMMON_MODULES = require(path.join(moles_template,'COMMON_MODULES'));
			if (COMMON_MODULES.indexOf(requireName) + 1) {
				return;
			}

			// 如果引用的是一个 Asset。
			var name = assetDealer.findRequireName({
				sourceRealpath: info.realpath,
				requireName: requireName,
				node: node
			});

			if (name) {
				// DO NOTHING.
			}
			// else if (['.jpg', '.jpeg', '.png'].indexOf(path.extname(requireRealpath)) + 1) {
			// 	var componentName = 'Image';
			// 	name = assetDealer.getRequireName({
			// 		realpath: requireRealpath,
			// 		componentName: componentName,
			// 		requireName: requireName
			// 	});
			// }

			// 否则，认为引用的是一个普通模块。
			else {
				// 转换成绝对路径。
				let requireRealpath = getRequireRealpath(info.realpath, requireName);

				transform.pushQueue(requireRealpath);
				name = transform.getModuleName(requireRealpath);
			}

			// 加入到当前模块的依赖列表中。
			modules.push(name);

			if (OPTIONS.strictCmd) {
				return new UglifyJS.AST_Call({
					expression: new UglifyJS.AST_SymbolRef({ name: SYMBOL_REQUIRE_AND_RETURN }),
					args: [ new UglifyJS.AST_String({ value: name }) ]
				});
			}
			else {
				var varname = MODULE_VARNAME_PREFIX + (modules.length - 1);

				// 用“变量引用”节点替代 require() “函数调用”节点。
				return new UglifyJS.AST_SymbolRef({ name: varname });
			}
		}
		else {
			/**
			 * AppRegistry.registerComponent('registerComponent', () => componentInstanceVarName);
			 */
			if (node instanceof UglifyJS.AST_Statement
				&& node.body
				&& node.body.expression
				&& node.body.expression.property == 'registerComponent'
				&& node.body.expression.expression
				&& node.body.expression.expression.property == 'AppRegistry'
			) {
				info.isMain = true;
				info.registerComponentName = node.body.args[0].value;

				let nodeReturn = node.body.args[1].body.pop();
				info.registerComponentVarname = nodeReturn.value.name;

				// 创建“函数调用”节点，用于“注册（替换）”组件。
				let nodeRegisterComponent = new UglifyJS.AST_Call({
					expression: new UglifyJS.AST_SymbolRef({ name: SYMBOL_REGISTER_COMPONENT }),
					args: [ new UglifyJS.AST_SymbolRef({ name: info.registerComponentVarname }) ]
				});

				return nodeRegisterComponent;

				// // 返回空声明，即等同于删除该节点。
				// return new UglifyJS.AST_EmptyStatement();
			}

			descend(node, this);
	    	return node;
		}
		return null;
	});

	// AST means Abstract Syntax Tree（抽象语法树）。
	var ast = UglifyJS.parse('var exports = module.exports; ' + info.code);
	ast = ast.transform(transformer);
	info.code = outputer.format(ast);
};

transform.bundle = (() => {
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

		var code = transform.infos
			.sort((a, b) => {
				var ret = 0, m = INDEXES[a.type], n = INDEXES[b.type];
				return m == n ? 0 : ( m > n ? 1 : -1);
			})
			.map( (info) => {
				inform.bundle({ type: info.type, name: info.name });
				return info.code;
			})
			.join(';\n');

		var outputRealpath = path.resolve(OPTIONS.output, OPTIONS.bundle);
		inform.log({ target: outputRealpath, type: 'bundle' });

		if (OPTIONS.dev) {
			code = [ 'try {', code, '} catch(ex) { console.log(ex); }' ].join('\n');
		}
		fs.writeFileSync(outputRealpath, code);

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
// 资源文件处理。

// 保存资源文件。
var assetDealer = {};

// 获取目前所支持的所有模块。
assetDealer.PLUGINS = {};
fs.readdirSync(path.join(__dirname, './AssetsPlugin')).forEach((name) => {
	assetDealer.PLUGINS[name] = require('./AssetsPlugin/' + name);
});

assetDealer.registered = [];

assetDealer.findComponentName = () => {
	var ComponentName;

	return ComponentName;
};

/**
 * options.node
 * options.sourceRealpath
 * options.requireName
 *
 * asset.componentName
 */
assetDealer.getRequireName = (options, asset) => {
	var ComponentName = asset.componentName;

	var relapth = path.relative(OPTIONS.input, path.join(options.sourceRealpath, '..', options.requireName));
	// 获取模块的注册名称。
	// 以 / 起始代表这是一个特殊模块（不同于基于真实脚本的模块）。
	var moduleName = uniformModuleName(path.join('/', '_ASSETJS_', ComponentName, relapth + '.js'));

	// 如果模块尚未注册，则：
	// 0. 调用插件，拷贝相关资源文件，并生成注册脚本代码；
	// 1. 创建注脚脚本文件；
	if (assetDealer.registered.indexOf(moduleName) < 0) {

		// 注册脚本文件的真实路径。
		let jsRealpath = outputer.name2realpath(moduleName);

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
		assetDealer.PLUGINS[ComponentName].generateCode(options, (err, code) => {
			if (err) {
				inform.exit(err);
			}

			code = outputer.format(code);

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
		});

		// 登记为已注册。
		assetDealer.registered.push(moduleName);
	}

	return moduleName;
};

/**
 * options.node
 * options.sourceRealpath
 * options.requireName
 */
assetDealer.findRequireName = (options) => {
	for (var name in assetDealer.PLUGINS) {
		var asset = assetDealer.PLUGINS[name].match(options);
		if (asset) {
			asset.componentName = name;
			/**
			 * asset.componentName
			 */
			return assetDealer.getRequireName(options, asset);
		}
	}
};

//-----------------------------------------------------------------------------
// 普通脚本队列管理。

transform.queue = [];
transform.queueCursor = 0;

transform.pushQueue = function(realpath, type) {
	if (!type) type = 'normal';

	var nomatch = (item) => {
		return item.realpath != realpath;;
	};
	if (transform.queue.every(nomatch)) {
		transform.queue.push({ realpath, type });
	}
};

transform.run = () => {
	inform('-- start --');

	var info;
	var templateDirname = path.join(__dirname, 'template');

	if (OPTIONS.standalone) {
		var common = fs.readFileSync(path.join(moles_template,'common.js'), 'utf8');
		transform.infos.push({ code: common, type: 'common' });

		var requireLite = fs.readFileSync(path.join(templateDirname, 'requireLite.js'), 'utf8');
		transform.infos.push({ code: outputer.format(requireLite), type: 'requireLite' });
	}

	var top = fs.readFileSync(path.join(templateDirname, 'entry.top.js'), 'utf8');
	info = { code: outputer.format(top), type: 'top' };
	transform.infos.push(info);
	transform.templates.push(info);

	var bottom = fs.readFileSync(path.join(templateDirname, 'entry.bottom.js'), 'utf8');
	info = { code: outputer.format(bottom), type: 'bottom' }
	info.code = info.code.replace('CRN_STRICT_CMD', OPTIONS.strictCmd);
	transform.infos.push(info);
	transform.templates.push(info);

	var cursor = 0;
	while (cursor < transform.queue.length) {
		var item = transform.queue[cursor++];
		inform.log({ source: item.realpath, type: item.type });
		inform.status('start');
		transform.one(item);
		inform.status();
	}

	if (OPTIONS.bundle) {
		transform.bundle();
	}
	// 输出入口文件。
	else {
		let infoEntry = yuan.array.find.first(transform.infos, { type: 'entry' });

		let getCode = (type) => yuan.array.find.first(transform.infos, { type: type }).code;

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
		inform.log({ target: outputer.name2realpath(infoEntry.name), type: 'entry' });
		fs.writeFileSync(outputer.name2realpath(infoEntry.name), infoEntry.code);
	}
};

transform.pushQueue( OPTIONS.entry, 'entry' );
//

/*
处理common
*/
OPTIONS.common = !!argv.common;


function doCommon(){
	var path = require('path');
	var fs = require('fs');
	var yuancon = require('yuan-console')

	if (!fs.existsSync(OPTIONS.output)) {
		yuancon.fs.mkdirp(OPTIONS.output);
	}

	 var folder_exists = fs.existsSync(moles_template);
	 if(!folder_exists){
		//  console.log(moles_template)
		 	fs.mkdirSync(moles_template);
	 }

	var packagePath = path.join(OPTIONS.input,"node_modules","react-native","package.json");


	var uglifyJS = require('uglify-js');
	var __moles_common_path = path.join(moles_template,"__moles_common.js");
	var otemplateDirname = path.join(__dirname, 'template');
	// var ooutputCommon = path.join(templateDirname, 'common.js');

	var newtemplateDirname = path.join(moles_template);
	var newoutputCommon = path.join(newtemplateDirname, 'common.js');
	var versionPath = path.join(newtemplateDirname,"version.js");

	var outCOMMON_MODULES = path.join(newtemplateDirname, 'COMMON_MODULES.json');

	var requireLite = fs.readFileSync(path.join(otemplateDirname, 'requireLite.js'), 'utf8');


	try{
			fs.readFileSync(packagePath)
	}catch(e){

			yuancon.print.dim('[Error] ').em('MESSAGE: ' + e.message).br();
			process.exit(0)
	}


	var version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;

	try{
			var curversion = fs.readFileSync(versionPath, 'utf8');
	}catch(e){
			var curversion = null;
	}
	/*
	处理version相等的情形
	*/
	if(version==curversion){
		if(OPTIONS.common){
			/* 将common文件输出到指定目录*/
			// fs.writeFileSync(outputCommon,"["+names.join(",\n")+"]");
			// console.log('---------',outputCommon)
			yuancon.print.dim('[COMMONBUNDLE] ').em('MESSAGE: ' + version+" common bundle is exist").br();
			fs.writeFileSync(path.join(OPTIONS.output,"common.jsbundle"), fs.readFileSync(newoutputCommon,'utf-8'));
		}
		transform.run();
		return;
	}
	/*
	处理version不相等的情形
	*/
	// transform.run();
	var platform = "ios";
	if(OPTIONS.entry.indexOf("android")!=-1){
		platform = "android";
	}





	fs.writeFileSync(__moles_common_path,[
		';(function(){',
		'		global = (function (){return this;})();',
	  '  	global.react = require("react");',
	  '  	global.reactNative = require("react-native");',
		'})();',
		';(function() {',
		'    var global = (function() { return this; })();',
		'    var Fake = global.react.createClass({',
		'        getInitialState: function() {',
		'            var that = this;',

		'            	global.changeComponent = function(ComponentClass) {',
		'                that.setState({',
		'                    component: global.react.createElement(ComponentClass)',
		'                });',
		'            };',

		'            return {',
		'                component: lastComponent',
		'            };',
		'        },',

		'        render: function() {',
		'            return this.state.component || global.react.createElement(global.reactNative.View);',
		'        }',
		'    });',

		'    var lastComponent = null;',

		'    global.changeComponent = function(component){',
		'        lastComponent = global.react.createElement(component);',
		'    };',

		'    global.reactNative.AppRegistry.registerComponent("moles", function() { return Fake; });',
		'})();',
		requireLite
	].join("\n"));

	// console.log(path.join(__dirname, 'template','common.js'));
	var execStr = ('react-native bundle --entry-file '+__moles_common_path+' --bundle-output '+newoutputCommon+' --platform '+platform+' --dev true --minify false --verbose true');
	yuancon.print.dim('[COMMONPACKER] ').em('-- start --').br();
	// yuancon.print.dim('[EXECSTR] ').em('MESSAGE: ' + execStr).br();
	var exec = require('child_process').exec,
	    last = exec(execStr,{
		    encoding: 'utf8',
		    timeout: 1000*10000, /*子进程最长执行时间 */
		    maxBuffer: 20000*1024,  /*stdout和stderr的最大长度*/
		    killSignal: 'SIGTERM',
		    cwd: OPTIONS.input,
		    env: null
		  });
	    // last = exec('react-native bundle --entry-file ./index0.ios.js --bundle-output ./test/main.'+platform+'.jsbundle --platform '+platform+' --assets-dest ./test --dev true --minify false');

			// exec(cmd, function callback(error, stdout, stderr) {
			// console.log(stdout);
			//
			// })
			last.stdout.on('data', function (data) {

			 yuancon.print.dim('[STDOUT ] ').em( data).br();
		 });


		 last.stderr.on('data', function (data) {

			  yuancon.print.dim('[STDERR ] ').em(data).br();
		 });

		last.on('exit', function (code) {
			fs.unlinkSync(__moles_common_path);
			yuancon.print.dim('[EXIT ] ').em('MESSAGE: process exit code is ' + code).br();
			var output = path.join(newoutputCommon);

			fs.readFile(output,"utf-8", function (err,bytesRead) {
				if (err) throw err;


				var map = {};
				var str = bytesRead;//"__d(43 /* NativeMethodsMixin */, function(global, require, module, exports) {'use strict';";
				//  console.log(str);
				 var names = [];
				 var wraps = []

					str.replace(/__d\(([0-9]+) \/\*\s+([^*]+)\s+\*\//g, function(a1,a2,a3){
							map[a2] = a3;
							wraps.push(warp(a2,a3))

							names.push('"'+a3.replace(/\.js$/i,"")+'"')
					})
					names.shift();
					// console.log(names);

					fs.writeFileSync(outCOMMON_MODULES,"["+names.join(",\n")+"]");

					function warp(id,name){
							var _wrap= '__d("'+name.replace(/\.js$/i,"")+'", function(global, require, module, exports) {'+
									'return module.exports=require('+id+')'+
							'});';
							return _wrap;
					}


					// global.__d=define;
					// global.require=_require
					var time = new Date();
					var ret =  "global=(function(){return this;})();"+"\n"+bytesRead+"\n"+wraps.join("\n");
					if(OPTIONS.dev){
						var newRet = {
							code:ret
						}
						ret = newRet;
					}else{
						ret = uglifyJS.minify(ret, {
								fromString: true,
								mangle: true,
								compress: {
										sequences: true,
										dead_code: true,
										conditionals: true,
										booleans: true,
										unused: true,
										if_return: true,
										join_vars: true,
										drop_console: true
								}
						});
					}


					var commonStr = "/*"+time+"---"+platform+"*/ \n"+"try{"+ret.code+"}catch(e){console.log(e);};";

					if(OPTIONS.common){
						fs.writeFileSync(path.join(OPTIONS.output,"common.jsbundle"), commonStr);
					}

					fs.writeFileSync(newoutputCommon, commonStr);
					fs.writeFileSync(versionPath,version,'utf8');
					yuancon.print.dim('[COMMONPACKER ] ').em('-- end --').br();
					transform.run();
			});

		});

}

doCommon();
process.on('exit', function() {
	inform('-- end --');
	inform(`See ${OPTIONS.output}` );
});
