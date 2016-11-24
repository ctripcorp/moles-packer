var core = require('./core');
var overload = require('./overload');

var S = function(s) {
	if ( !(this instanceof S) ) return new S(s);
	this._string = s;
};

var _ME = {};

Object.defineProperty(S, 'leftContext', { get: function() { return _ME.leftContext; } });
Object.defineProperty(S, 'rightContext', { get: function() { return _ME.rightContext; } });
Object.defineProperty(S, 'lefteeContext', { get: function() { return _ME.lefteeContext; } });
Object.defineProperty(S, 'righteeContext', { get: function() { return _ME.righteeContext; } });

S.endsWith = overload.Function(
	[
		String,
		RegExp,
		function(s, sub) {
			if (sub.source.substr(-1) != '$') {
				sub = core.extendRegExp(sub, { source : '(' + sub.source + ')$' });
			}
			return sub.test(s);
		}
	],

	[
		String,
		String,
		function(s, sub) {
			return s.substr(-sub.length) == sub;
		}
	],

	function() { return undefined; }
);

var _formats = [

	/**
	 * %m.ns
	 * 字符串截取并补齐。
	 * e.g.
	 *   %5s
	 *   %-5s
	 *   %5.2s
	 *   %-5.2s
	 *   %5.-2s
	 *   %-5.-2s
	 */
	function(format, s) {
		s = s.toString();
		if (format.charAt(0) == 's') {
			return {
				text: s,
				consumed: 1
			};
		}
		else if (/^(-?\d+)(?:\.(-?\d+))?s/.test(format)) {
			var
				  m = parseInt(RegExp.$1)
				, absm = Math.abs(m)
				, n = Math.min(s.length, RegExp.$2 ? parseInt(RegExp.$2) : absm)
				, space

				// 不论是多么复杂的情况，我们都采用先截取字符串，后补齐的策略以简化逻辑。
				, s2 // 用于保存截取后的字符串。
				, s3 // 用于保存补齐后的字符串。
				;

			if (absm < n) return undefined;

			// 截取。
			if (n > 0) s2 = s.substr(0, n);
			else s2 = s.substr(n);

			// 补齐：正数代表右对齐（左侧补空），负数代表左对齐（右侧补空）。
			// 这种设计沿用了数字表示法的习惯。
			space = S.repeat(' ', absm - n);
			if (m < 0) s3 = s2 + space;
			else s3 = space + s2;

			return {
				text: s3,
				consumed: RegExp.lastMatch.length
			}
		}
		return undefined;
	},

	/**
	 * %-md
	 * 整数转换并补齐。
	 * %d
	 * %+d
	 * %3d
	 * %+3d
	 * %-3d
	 * %+-3d
	 */
	function(format, d) {
		if (format.charAt(0) == 'd') {
			return {
				text: '' + d,
				consumed: 1
			};
		}
		else if (/^(\+?)(,?)(-?(0?)\d*)d/.test(format)) {
			var text = '' + Math.abs(parseInt(d));

			// 前导正负号。
			var sign = '';
			if (!!RegExp.$1 || d < 0) {
				sign = (d < 0) ? '-' : '+';
			}

			// 是否显示千分位。
			var thousands = !!RegExp.$2;

			var m = parseInt(RegExp.$3);

			// 格式允许的最大数字长度（不含正负号）。
			var absm = Math.abs(m);
			if (sign) absm -= 1;

			// 对齐方向。
			var align = (m < 0) ? 'left' : 'right';

			var zero = !!RegExp.$4;

			// 如果数字长度超过格式允许的最大长度，则采用科学记数法表示。
			if (absm && text.length > absm) {
				text = '1e' + Math.log10(d);
				// 允许省略指数中的小数位。
				// 如果仍超过格式允许的最大长度，则不显示任何数字。
				var minlen = text.indexOf('.');
				if (minlen < 0) minlen = text.length;
				text = (absm < minlen) ? '' : text.substr(0, absm);
			}
			// 仅当数字长度未达格式允许最大长度时，才允许前置补零或千分位表示法。
			else {
				// 如果未限定长度，则不补零。
				if (absm && zero) {
					text = S.repeat('0', absm - text.length) + text;
				}

				if (thousands) {
					var parts = [], text2 = text;
					do {
						parts.unshift(text2.slice(-3));
						text2 = text2.slice(0, -3);
					} while(text2);
					text2 = parts.join(',');

					// 如果千分位表示法长度超限，则禁用之。
					if (!absm || text2.length <= absm) text = text2;
				}
			}

			// 对齐。
			if (absm) {
				var spaces = '';
				if (text.length < absm) {
					spaces = S.repeat(' ', absm - text.length);
				}
				text = sign + text;
				text = (align == 'right') ? spaces + text : text + spaces;
			}

			return {
				text: text,
				consumed: RegExp.lastMatch.length
			};
		}
		return undefined;
	},

	function(format, s) {
		if (format.charAt(0) == 'n') {
			return {
				text: '' + s,
				consumed: 1
			};
		}
	},

	// // %-5s
	// function(format, s) {
	// 	var s2, ret;
	// 	if (/^-(\d+)s/.test(format)) {
	// 		var n = parseInt(RegExp.$1);
	// 		if (s.length == n)
	// 			s2 = s;
	// 		else if (s.length <= n)
	// 			s2 = s + S.repeat(' ', n - s.length);
	// 		else
	// 			s2 = s.substr(0, n);

	// 		ret = {
	// 			text: s2,
	// 			consumed: RegExp.lastMatch.length
	// 		}
	// 	}
	// 	return ret;
	// },

	// // %5s
	// function(format, s) {
	// 	var s2, ret;
	// 	if (/^(\d+)s/.test(format)) {
	// 		var n = parseInt(RegExp.$1);
	// 		if (s.length == n)
	// 			s2 = s;
	// 		else if (s.length <= n)
	// 			s2 = S.repeat(' ', n - s.length) + s;
	// 		else
	// 			s2 = s.substr(-n);

	// 		ret = {
	// 			text: s2,
	// 			consumed: RegExp.lastMatch.length
	// 		}
	// 	}
	// 	return ret;
	// },

	// // %-5.2s
	// function(format, s) {
	// 	var s2, ret;
	// 	if (/^-(\d+)\.(\d+)s/.test(format)) {
	// 		var m = parseInt(RegExp.$1);
	// 		var n = parseInt(RegExp.$2);
	// 		if (m >= n) {
	// 			if (s.length == n)
	// 				s2 = s;
	// 			else if (s.length <= n)
	// 				s2 = s + S.repeat(' ', n - s.length);
	// 			else
	// 				s2 = s.substr(0, n);

	// 			s2 += S.repeat(' ', m - n);

	// 			ret = {
	// 				text: s2,
	// 				consumed: RegExp.lastMatch.length
	// 			}
	// 		}
	// 	}
	// 	return ret;
	// },

	// // %5.2s
	// function(format, s) {
	// 	var s2, ret;
	// 	if (/^(\d+)\.(\d+)s/.test(format)) {
	// 		var m = parseInt(RegExp.$1);
	// 		var n = parseInt(RegExp.$2);
	// 		if (m >= n) {
	// 			if (s.length == n)
	// 				s2 = s;
	// 			else if (s.length <= n)
	// 				s2 = S.repeat(' ', n - s.length) + s;
	// 			else
	// 				s2 = s.substr(-n);

	// 			s2 = S.repeat(' ', m - n) + s2;

	// 			ret = {
	// 				text: s2,
	// 				consumed: RegExp.lastMatch.length
	// 			}
	// 		}
	// 	}
	// 	return ret;
	// }
];

S.formatT = function(format, words/*, filler_0, filler_1, ... */) {
	var
		  s = ''
		, args = core.toArray(arguments).slice(2)
		, cursor = 0
		, shift = function() { return format.charAt(cursor++); }
		, next = function() { return format.charAt(cursor); }
		, rest = function() { return format.substr(cursor); }
		, c
		, remainder
		;

	do {
		c = shift();
		if (c == '%') {
			if (next() == '%') {
				s += shift();
			}
			else if (next() == '{') {
				var rightBrace = format.indexOf('}', cursor);
				if (rightBrace) {
					var rawf = format.substring(cursor + 1, rightBrace);
					var f, word;

					var sharp = rawf.indexOf('#');
					if (sharp >= 0) {
						word = words[rawf.substr(sharp + 1)];
						// If omitted, the format '%s' will be used.
						f = core.ifEmpty(rawf.substring(0, sharp), 's');
					}
					else {
						word = args[0];
						f = rawf;
					}

					for (var i = 0, formatted; i < _formats.length; i++) {
						formatted = _formats[i](f, word);
						if (formatted && formatted.consumed == f.length) {
							s += formatted.text;
							f = null; // To indicate that f has been consumed.
							break;
						}
					}

					// If f is not consumed.
					if (f) {
						s += rawf;
					}
					else if (sharp < 0) {
						args.shift();
					}

					var offset = 2 + rawf.length; // 2 is the length of '{' and '}'
					cursor += offset;
				}
				else s += c;
			}
			else {
				for (var i = 0, formatted; i < _formats.length; i++) {
					if (formatted = _formats[i](rest(), args[0])) {
						s += formatted.text;
						cursor += formatted.consumed;
						args.shift();
						break;
					}
				}
				if (!formatted) s += c;
			}
		}
		else s += c;
	} while(c);

	// 如参数提前消耗完毕，则剩余的格式视为普通字符串。
	s += rest();

	// 格式化字符串与未处理的参数，以空格为连接符进行合并处理。
	args.unshift(s);
	return args.join(' ');
};

S.format = function(format /*, filler_0, filler_1, ... */) {
	var args = core.toArray(arguments);
	var format = args.shift();
	args.unshift(format, {});
	return S.formatT.apply(S, args);
};

S.getDisplayWidth = function(s) {
	if (!s) return 0;
	var n = 0;
	for (var i = 0, l = s.length, c; i < l; i++) {
		c = s.charCodeAt(i);
		n += (c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f) ? 1 : 2;
	}
	return n;
};

S.has = overload.Function(
	[
		String,
		String,
		function(s, sub) {
			var n = s.indexOf(sub), ret = !~n;
			if (ret) {
				_ME.leftContext = s.substr(0, n);
				_ME.rightContext = s.substr(n + sub.length);

				var m = s.lastIndexOf(sub);
				_ME.lefteeContext = s.substr(0, m);
				_ME.righteeContext = s.substr(m + sub.length);
			}
			return ret;
		}
	],

	[
		String,
		RegExp,
		function(s, sub) {
			var parts = s.split(sub);
		}
	]
);

S.repeat = function(s, times) {
	var S = '';
	if (times > 0) {
		while (times--) {
			S += s;
		}
	}
	return S;
};

S.replace = function(S, s, ns) {
	var parts = S.split(s);
	return parts.join(ns);
};

S.split = function(
	/*String*/ s,
	/*String|RegExp*/ seperator,
	/*String*/ delimiter,
	/*String*/ escaper)
{
	var
		  parts = []
		, l = seperator.length
		, reSeparator
		, pre = ''
		, remainder = s
		, c
		, c2
		, holden = false
		, offset
		;

	if (seperator instanceof RegExp) {
		reSeparator = seperator.source.charAt(0) != '^'
			? core.extendRegExp(seperator, { source : '^(' + seperator.source + ')' })
			: seperator
			;
	}

	do {
		// 处理定界符外的字符串。
		if (!holden) {
			var onSeperator = false;
			if (reSeparator) {
				if (onSeperator = reSeparator.test(remainder)) l = RegExp.lastMatch.length;
			}
			else {
				onSeperator = remainder.substr(0, l) == seperator;
			}

			if (onSeperator) {
				parts.push(pre);
				pre = '';
				offset = l;
			}
			else {
				c = remainder.charAt(0);
				holden = (c == delimiter);
				pre += c;
				offset = 1;
			}
		}

		// 处理定界符内的字符串。
		else {
			c = remainder.charAt(0);
			pre += c;
			if (c == escaper) {
				pre += remainder.charAt(1);
				offset = 2;
			}
			else {
				holden = (c != delimiter);
				offset = 1;
			}
		}

		remainder = remainder.substr(offset);

	} while (remainder);

	parts.push(pre);
	return parts;
};

S.startsWith = overload.Function(
	[
		String,
		RegExp,
		function(s, sub) {
			if (sub.source.charAt(0) != '^') {
				sub = core.extendRegExp(sub, { source : '^(' + sub.source + ')' });
			}
			return sub.test(s);
		}
	],

	[
		String,
		String,
		function(s, sub) {
			return s.substr(0, sub.length) == sub;
		}
	],

	function() { return undefined; }
);

S.trim = function(s, sub) {
	var right = S.trimLeft .apply(null, arguments);
	var left  = S.trimRight.apply(null, arguments);
	if (left.length + right.length <= s.length) {
		s = '';
	}
	else {
		s = left.substr(s.length - right.length);
	}
	return s;
};

S.trimLeft = overload.Function(
	[
		String,
		function(s) {
			return S.trimLeft(s, /\s/);
		}
	],

	[
		String,
		String,
		function(s, sub) {
			if (sub.length) {
				while (S.startsWith(s, sub)) {
					s = s.substr(sub.length);
				}
			}
			return s;
		}
	],

	[
		String,
		RegExp,
		function(s, sub) {
			while (S.startsWith(s, sub)) {
				if (s == (s = RegExp.rightContext)) break;
			}
			return s;
		}
	]
);

S.trimRight = overload.Function(
	[
		String,
		function(s) {
			return S.trimRight(s, /\s/);
		}
	],

	[
		String,
		String,
		function(s, sub) {
			var l = s.length;
			if (sub.length) {
				while (S.endsWith(s, sub)) {
					l -= sub.length;
					s = s.substr(0, l);
				}
			}
			return s;
		}
	],

	[
		String,
		RegExp,
		function(s, sub) {
			while (S.endsWith(s, sub)) {
				if (s == (s = RegExp.leftContext)) break;
			}
			return s;
		}
	]
);

S.prototype.toString = function() {
	return this._string;
};

// Extend S.prototype
for (var fname in S) {
	(function(fname) {
		S.prototype[fname] = function() {
			var args = core.toArray(arguments);
			args.unshift(this._string);
			this._string = S[fname].apply(null, args);
			return this;
		};
	})(fname);
}

module.exports = S;
