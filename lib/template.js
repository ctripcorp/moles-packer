var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    , swig = require('swig')
    ;

var LIB_REQUIRE
    , CONFIG = require('./parseConfig')()
    , OPTIONS = require('./parseOptions')()
    ;

var _TEMPLATE_DIRNAME = path.join(__dirname, '..', 'template');
var _ME = {};

_ME.render = function(name, data) {
    var realpath = path.isAbsolute(name) ? name : path.join(_TEMPLATE_DIRNAME, name);

    if (!data) data = {};
    data.SYMBOL = CONFIG.symbol;

    var options = {
        autoescape: false,
        locals: data
    };

    return swig.render(fs.readFileSync(realpath, 'utf8'), options);
};

module.exports = _ME;
