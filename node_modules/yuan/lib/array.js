var core = require('./core');
var overload = require('./overload');

var _genJudgerByAnalog = function(analog) {
	return function(item) {
		for (var key in analog) {
			if (item[key] != analog[key]) return false;
		}
		return true;
	};
};

var array = core.toArray.bind(null);

/**
 * 复合计算。
 * @param {Array}    arr      待计算的数据数组
 * @param {String}   iteratee 数据单元中“作为最终计算单元的属性”的属性名
 * @param {Function} iteratee 数据单元计算方法
 * @param {Function} operator 最终计算方法
 */
array.compute  = function(arr, iteratee, operator) {
	var numbers = array.map(arr, iteratee), ret;

	// 如果最终计算函数仅有一个形参，则将最终计算单元数组作为其参数。
	if (operator.length == 1)
		ret = operator(numbers);
	else
		ret = operator.apply(null, numbers);

	return ret;
};

// 排除数组中经指定函数运算结果为真的元素，返回由剩余元素组成的新数组。
array.excludeOn = overload.Function(
	[
		Array,
		Object,
		function(arr, analog) {
			return array.excludeOn(arr, _genJudgerByAnalog(analog));
		}
	],

	[
		Array,
		Function,
		function(arr, fn) {
			var arr2 = [];
			arr.forEach(function(item) {
				if (!fn(item)) arr2.push(item);
			});
			return arr2;
		}
	]
);

array.equal = function(foo, bar) {
	if (foo.length != bar.length) return false;

	for (var i = 0; i < foo.length; i++) {
		if (foo[i] != bar[i]) return false;
	}

	return true;
};

array.exists = function(arr, judger) {
	return array.find.firstIndex(arr, judger) >= 0;
};

// @TODO
array.fill = function(arr, filler, condition) {
};

array.find = overload.Function(
	[
		Array,
		Object,
		function(arr, analog) {
			return array.find(arr, _genJudgerByAnalog(analog));
		}
	],

	[
		Array,
		Function,
		function(arr, judger) {
			var arr2 = [];
			arr.forEach(function(item) {
				if (judger(item)) arr2.push(item);
			});
			return arr2;
		}
	]
);

array.find.all = array.find.bind(null);

array.find.first = function(arr, judger) {
	var index = array.find.firstIndex(arr, judger);
	return (index >= 0) ? arr[index] : undefined;
};

array.find.firstIndex = overload.Function(
	[
		Array,
		Object,
		function(arr, analog) {
			return array.find.firstIndex(arr, _genJudgerByAnalog(analog));
		}
	],

	[
		Array,
		Function,
		function(arr, judger) {
			for (var i = 0; i < arr.length; i++) {
				if (judger(arr[i])) return i;
			}
			return -1;
		}
	]
);

array.last = function(arr) {
	return arr[arr.length - 1];
};

/**
 * 将数组元素逐个映射（一一转换）得到一个新的数组。
 */
array.map = function(arr, iteratee) {
	var arr2 = [];
	arr.forEach(function(item, index) {
		if (typeof iteratee == 'string')
			arr2.push(item[iteratee]);
		else
			arr2.push(iteratee(item, index));
	});
	return arr2;
};

array.uniq = function(arr, equal) {
	var arr2 = [];
	if (!equal) {
		equal = function(foo, bar) {
			return foo == bar;
		}
	}
	if (arr.length) {
		arr = arr.slice();
		arr2.push(arr[0]);
		for (var i = 1, item = arr[0]; i < arr.length; i++) {
			if (equal(arr[i], item)) continue;
			item = arr[i];
			arr2.push(item);
		}
	}
	return arr2;
};

array.untilOn = core.untilOn;

array.without = function(arr, value) {
	var arr2 = [];
	for (var i = 0, found; i < arr.length; i++) {
		for (var j = 1; j < arguments.length; j++) {
			if (found = (arr[i] == arguments[j])) break;
		}
		if (!found) arr2.push(arr[i]);
	}
	return arr2;
};

module.exports = array;
