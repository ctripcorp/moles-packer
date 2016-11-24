var fn = {};

fn.once = function(func) {
	var runtimes = 0, ret;
	return function() {
		if (runtimes == 0) ret = func.apply(null, arguments);
		runtimes++;
		return ret;
	};
};

module.exports = fn;