/**
 * 编译公共包。
 * @author weixiaojun
 * @update jiangjing
 */
'use strict';

var MODULE_REQUIRE
	, crypto = require('crypto')
	, fs = require('fs')
	, path = require('path')
	, yuan = require('yuan')
	, yuancon = require('yuan-console')
	, uglifyJS = require('uglify-js')
	, semver = require('semver')
	, sourceMap = require('source-map')
	;

var LIB_REQUIRE
	, parseConfig = require('./parseConfig')
	, CONFIG = require('./parseConfig')()
	, OPTIONS = require('./parseOptions')()
	, cmdfind = require('./cmdfind')
	, inform = require('./inform')
	, exporter = require('./exporter')
	, template = require('./template')
	;

var _md5 = function(content) {
	var md5sum = crypto.createHash('md5');
	md5sum.update(content);
	return md5sum.digest('base64').replace(/=+$/, '');
};

// 创建公包并及配套的元数据文件。
var _create_common = function(rnversion) {
	var docblock = require('node-haste/lib/DependencyGraph/docblock.js');

	var commonMetaData = [], commonBundleCodes = {};
	var platforms = (OPTIONS.platform == 'cross')
		? [ 'ios', 'android' ]
		: [ OPTIONS.platform ]
		;

	// 创建临时文件夹。
	var TEMP_DIRNAME = '.moles';
	yuancon.fs.mkdirp(path.join(OPTIONS.input, TEMP_DIRNAME));

	// 伪入口文件相对路径（相对于项目根目录）。
	var pesudoEntryPath            = path.join(TEMP_DIRNAME, 'index.common.js');
	var pesudoEntryRealpath        = path.join(OPTIONS.input, pesudoEntryPath);

	// ---------------------------
	// 创建伪入口文件。
	var genPesudoEntry = () => {
		var data = {
			COMMON_MODULES: yuan.ifEmpty(OPTIONS.commonModules, []),
			AMD_CODE: fs.readFileSync(path.join(__dirname, '..', 'resource', 'requireLite.js'), 'utf8')
		};

		var code = template.render('common.swig', data);
		fs.writeFileSync(pesudoEntryRealpath, code);
	};

	// ---------------------------
	// 调用 react-native 原生命令创建公包。
	var runBundle = function(platform, doParse) {
		// 临时公包文件相对路径（相对于项目根目录）。
		var commonBundleTempath        = path.join(TEMP_DIRNAME, `common.${platform}.jsbundle`);
		var commonBundleRealTempath    = path.join(OPTIONS.input, commonBundleTempath);

		// sourceMap 文件临时存放地址。
		var commonSourceMapTempath     = path.join(TEMP_DIRNAME, `common.${platform}.sourcemap.json`);
		var commonSourceMapRealTempath = path.join(OPTIONS.input, commonSourceMapTempath);


		var command = [
			'react-native',
			'bundle',
			'--entry-file', pesudoEntryPath,
			'--bundle-output', commonBundleTempath,
			'--platform ', platform,
			'--sourcemap-output', commonSourceMapTempath
		];

		if (semver.lte(rnversion, '0.30.0')) {
			command.push(
				'--dev false',
				'--verbose true',
				'--minify', OPTIONS.minify
			);
		}
		else {
			command.push(
				'--dev', OPTIONS.minify
			);
		}

		// 执行命令。
		yuancon.run(command.join(' '), { cwd: OPTIONS.input, echo: OPTIONS.verbose });

		if (yuancon.run.exitCode) {
			inform.exit('Failed to create common bundle.');
		}

		// 读取代码。
		var commonBundleCode = fs.readFileSync(commonBundleRealTempath, 'utf8');

		var commonSMC = new sourceMap.SourceMapConsumer(
			JSON.parse(fs.readFileSync(commonSourceMapRealTempath, 'utf8'))
		);

		// e.g.
		// __d(19, function(e,r,n,t){...
		var reDefine = /^__d\((\d+)/;
		var reNewline = /\r\n|\r|\n/;

		var moduleMetas = [];

		// 按行切分代码。
		commonBundleCode.split(reNewline).forEach((line, index) => {
			if (!reDefine.test(line)) return;

			var moduleId = RegExp.$1;
			if ("0" == moduleId) return;

			var pos = { line: index + 1, column: line.indexOf('{') + 1 + 1 };
			var info = commonSMC.originalPositionFor(pos);

			if (!info.source) {
				inform.exit(501);
			}

			var blockInfos = docblock.parse(fs.readFileSync(info.source, 'utf8'));
			var providesModule;
			for (let i = 0; i < blockInfos.length; i++) {
				if (blockInfos[i][0] == 'providesModule') {
					providesModule = blockInfos[i][1];
					break;
				}
			}
			var moduleMeta = cmdfind.parse(info.source);
			moduleMeta[platform] = moduleId;
			if (providesModule) {
				moduleMeta.names.push(providesModule);
				moduleMeta.shortname = providesModule;
			}
			moduleMetas.push(moduleMeta);
		});

		return {
			code: commonBundleCode,
			meta: moduleMetas
		};
	};

	// ---------------------------
	// 首次生成公包，并提取元数据。
	if (1) {
		// 生成入口文件。
		genPesudoEntry();

		platforms.forEach((platform, index) => {
			inform.common(platform, 'Create common bundle');

			var commonBundle = runBundle(platform, true);
			commonBundleCodes[platform] = commonBundle.code;

			if (index == 0) {
				commonMetaData = commonBundle.meta;
			}
			else {
				// 仅保留各平台的交集。
				commonMetaData = commonMetaData.filter((foo) => {
					return commonBundle.meta.find((bar) => {
						if (foo.shortname == bar.shortname) {
							foo[platform] = bar[platform];
							return true;
						}
						else {
							return false;
						}
					});
				});
			}
		});

		commonMetaData.forEach((moduleMeta) => {
			moduleMeta.id = _md5(moduleMeta.shortname + '@' + moduleMeta.version);
		});
	}

	// 修正公包，封装相关模块。
	if (1) {
		platforms.forEach((platform) => {
			inform.common(platform, 'Re-create common bundle');

			commonBundleCodes[platform] += template.render(
				'reDefine.swig',
				{ MODULES: commonMetaData, PLATFORM: platform }
			);

			var jsbundleRealpath = path.join(OPTIONS.commonOutput, CONFIG.path.commonBundle[platform]);

			// 保存公包代码。
			inform.common(platform, 'Minify common bundle');
			exporter.saveCode(jsbundleRealpath, commonBundleCodes[platform]);
			inform.common(platform, `COMMON BUNDLE: ${jsbundleRealpath}`);
		});

		// 保存公包元数据。
		let metaRealpath = path.join(OPTIONS.commonOutput, CONFIG.path.commonMeta[OPTIONS.platform]);
		yuancon.fs.json.saveAs(commonMetaData, metaRealpath);
		inform.common('cross', `COMMON META: ${metaRealpath}`);
	}

	return {
		meta: commonMetaData,
		bundle: commonBundleCodes
	};
};

var _COMMON_INFO;

var _ME = function() {
	if (_COMMON_INFO) return _COMMON_INFO;

	inform.header('Process common bundle');

	// 检查当前项目所使用的 react-native 内核版本
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
				if (line.match(/^react-native: ([0-9.rc]+)/)) {
					REACT_NATIVE_VERSION = RegExp.$1;
				}
			});
		}

		if (!REACT_NATIVE_VERSION) {
			inform.exit(`"${OPTIONS.input}" is not a React Native porject directory.`)
		}
	})();

	if (!semver.satisfies(REACT_NATIVE_VERSION, parseConfig('version-range'))) {
		inform.exit(`react-native v${REACT_NATIVE_VERSION} has not been supported yet. We will try to handle it.`);
	}

	// If OPTIONS.commonBundle exists, OPTIONS.commonMeta MUST also exist.
	// This is ensured by ./parseOptions.
	if (OPTIONS.commonMeta) {
		let meta, code;

		try {
			meta = require(OPTIONS.commonMeta);
		}
		catch (ex) {
			return inform.exit(`${OPTIONS.commonMeta} is illegal common bundle meta file.`)
		}

		_COMMON_INFO = {
			meta: meta,
			bundle: {}
		};

		if (OPTIONS.commonBundle) {
			for (let platform in OPTIONS.commonBundle) {
				_COMMON_INFO.bundle[platform] = fs.readFileSync(OPTIONS.commonBundle[platform], 'utf8');
			}
		}
	}
	else {
		_COMMON_INFO = _create_common(REACT_NATIVE_VERSION);
	}

	inform('Common modules ready.')

	return _COMMON_INFO;
};

module.exports = _ME;
