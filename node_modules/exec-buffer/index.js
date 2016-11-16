'use strict';
const fs = require('fs');
const execa = require('execa');
const pify = require('pify');
const tempfile = require('tempfile');
const fsP = pify(fs);
const input = Symbol('inputPath');
const output = Symbol('outputPath');

module.exports = opts => {
	opts = Object.assign({}, opts);

	if (!Buffer.isBuffer(opts.input)) {
		return Promise.reject(new Error('Input is required'));
	}

	if (typeof opts.bin !== 'string') {
		return Promise.reject(new Error('Binary is required'));
	}

	if (!Array.isArray(opts.args)) {
		return Promise.reject(new Error('Arguments are required'));
	}

	const inputPath = tempfile();
	const outputPath = tempfile();

	opts.args = opts.args.map(x => x === input ? inputPath : x === output ? outputPath : x);

	return fsP.writeFile(inputPath, opts.input)
		.then(() => execa(opts.bin, opts.args))
		.then(() => fsP.readFile(outputPath));
};

module.exports.input = input;
module.exports.output = output;
