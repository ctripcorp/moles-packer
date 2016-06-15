'use strict';

var MODULE_REQUIRE
	, fs = require('fs')
	, path = require('path')
	, imagemin = require('imagemin')
	, imageminPngquant = require('imagemin-pngquant')
	, imageSize = require('image-size')
	, swig = require('swig')
	, yuan = require('yuan')
	, yuancon = require('yuan-console')
	;

var IMAGE_POSTFIXES = [
	  '.jpg'
	, '.jpeg'
	, '.png'
	];

/**
 * OPTIONS:
 *     moduleName
 *     outputRoot
 *     node
 *     sourceRoot
 *     sourceRealpath
 *     requireName
 *
 * Image Asset 可能的资源文件形如：
 *     foo.png
 *     foo@2x.png
 *     foo@3x.png
 *     foo@4x.png
 */
module.exports.generateCode = function(OPTIONS, callback) {
	var data = {
		moduleName: OPTIONS.moduleName,
		asset: {}
	};

	// 获取相关资源文件。
	var filepaths = [], scales = [];

	// 获取文件后缀名。
	var extname = path.extname(OPTIONS.requireName);

	// 获取文件基础名。
	var realpathBase = yuan.string.trimRight(
		path.join(OPTIONS.sourceRealpath, '..', OPTIONS.requireName),
		extname);

	// 获取资源文件的相对目录名。
	// 注意：这个相对目录在项目源代码目录和编译输出目录中是一致的。
	var relaDirname = 'assets/' + path.relative(OPTIONS.sourceRoot, path.dirname(realpathBase));

	// 获取文件输出目录。
	var outputDirname = path.join(OPTIONS.outputRoot, relaDirname);

	// 1x（见上）
	var realpath = realpathBase + extname;
	if (fs.existsSync(realpath)) {
		filepaths.push(realpath);
		scales.push(1);
	}

	// 2x, 3x, ...
	[2,3,4].forEach((n) => {
		let realpath = `${realpathBase}@${n}x${extname}`;
		if (fs.existsSync(realpath)) {
			filepaths.push(realpath);
			scales.push(n);
		}
	});

	// 如果未找到资源文件，则返回“失败”信息。
	if (filepaths.length == 0) {
		return callback(`Resources related to "Image.Asset, ${OPTIONS.requireName}" required by "${OPTIONS.sourceRealpath}" not found.`);
	}

	// 复制资源文件
	filepaths.forEach((filepath) => {

		// 获取最终路径。
		let outputRealpath = path.join(outputDirname, path.basename(filepath));

		// 复制资源文件。
		process.nextTick(() => {
			// 如果目标文件已存在，则给出警告（但仍然覆盖）。
			if (fs.existsSync(outputRealpath)) {
				global.J2.inform.warn(`Target file "${outputRealpath}" has already existed.`);
			}

			// 执行图片压缩。
			if (extname == '.png') {
				// @TODO 如果输出路径文件名和原始文件名不同，则还需要执行一次文件移动。
				imagemin([ filepath ], path.dirname(outputRealpath), {
					plugins: [
						imageminPngquant({ quality: '50-70' })
					]
				});
			}
			else {
				yuancon.fs.copy(filepath, outputRealpath);
			}

			global.J2.inform.log({ target: outputRealpath, type: 'webresource' });
		});
	});

	data.asset.httpServerLocation = './' + relaDirname.replace(/\\/g, '/');

	// 拆解资源名称和后缀。
	// 注意：不是真正的资源文件名称，即不含 @x 。
	var basename = path.basename(OPTIONS.requireName);
	var dotIndex = basename.lastIndexOf('.');
	if (dotIndex + 1) {
		data.asset.name = basename.substr(0, dotIndex);
		data.asset.type = basename.substr(dotIndex + 1);
	}
	else {
		data.asset.name = basename;
		data.asset.type = '';
	}

	data.asset.scales = scales;
	imageSize(filepaths[0], function(err, meta) {
		data.asset.height = meta.height / scales[0];
		data.asset.width = meta.width / scales[0];

		var tpl = swig.compileFile(path.join(__dirname, 'Asset.swig'));
		var code = tpl(data);
		callback(null, code);
	});
};

/**
 * OPTIONS:
 *     node
 *     requireRelapath
 *     requireName
 */
module.exports.match = function(OPTIONS) {
	var asset = {}, found = false;

	// 根据后缀名判断。
	if (IMAGE_POSTFIXES.indexOf(path.extname(OPTIONS.requireName)) >= 0) {
		found = true;
	}

	return found && asset;
};
