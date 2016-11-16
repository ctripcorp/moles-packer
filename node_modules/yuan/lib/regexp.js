var core = require('./core');

var regexp = {};

regexp.extend = core.extendRegExp.bind(null);

module.exports = regexp;