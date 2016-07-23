/**
 * 编译结果输出控制方法集。
 * @author jiangjing
 */

'use strict';

var MODULE_REQUIRE
    , fs = require('fs')
    , os = require('os')
    , path = require('path')
    , yuancon = require('yuan-console')
    , UglifyJS = require('uglify-js')
    ;

var LIB_REQUIRE
    , OPTIONS = require('./parseOptions')()
    ;

var _ME = {};

// 将模块名称映射至模块文件输出路径。
_ME.name2realpath = (name) => {
    // 输出结果。
    var outputRealpath = path.join(OPTIONS.output, name.replace('\\', '/'));

    // 创建目录。
    yuancon.fs.mkdirp(path.dirname(outputRealpath));

    return outputRealpath;
};

// 代码优化处理。
// 视情形进行格式化、混淆和压缩。
_ME.format = (code, donotCompress) => {
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

    return code;
};

_ME.saveCode = function(pathname, code) {
    if (OPTIONS.dev) {
        code = [ 'try {', code, '} catch(ex) { console.log(ex); }' ].join(os.EOL);
    }

    if (OPTIONS.minify) {
        code = UglifyJS.minify(code, {
            fromString: true,
            mangle: false
        }).code;
    }

    yuancon.fs.mkdirp(path.dirname(pathname));
    fs.writeFileSync(pathname, code);
};

_ME.uniformModuleName = (name) => {
    // 统一路径分隔符。
    return name.replace(/\\/g, '/');
};

module.exports = _ME;
