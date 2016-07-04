var MODULE_REQUIRE
    , fs = require('fs')
    , path = require('path')
    ;

var _ME = function(name) {
    var realpath = path.join(__dirname, '..', 'template', name);
    return fs.readFileSync(realpath, 'utf8');
};

module.exports = _ME;
