var Char = function(number) {
	return String.fromCharCode(number);
};

Char.space = function(number) {
	var s = '';
	while (number--) s += Char.SPACE;
	return s;
};

var CHARS = {
	BACKSPACE :   8,
	NEWLINE   :  10,
	SPACE     :  32
};

for (var name in CHARS) {
	Char[name] = Char(CHARS[name]);
}

module.exports = Char;
