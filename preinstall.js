#!/usr/bin/env node

var fs = require('fs');
var os = require('os');
var path = require('path');

var BIN_NAMES = {
	'Darwin': 'bin/output-mac',
	'Windows_NT': 'bin/output-win.exe',
	'Linux': 'bin/output-linux'
};

var BIN_TARGET = 'bin/output';

var ostype = os.type();
for (var type in BIN_NAMES) {
	var source = path.join(__dirname, BIN_NAMES[type]);
	var target = path.join(__dirname, BIN_TARGET) + path.extname(source);
	if (type == ostype) {
		fs.unlinkSync(target);
		fs.renameSync(source, target);
	}
	else {
		fs.unlinkSync(source);
	}
}

console.log('Binary command file ready.');
