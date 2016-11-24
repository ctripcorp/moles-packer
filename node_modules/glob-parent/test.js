'use strict';

var gp = require('./');
var assert = require('assert');

describe('glob-parent', function() {
  it('should strip glob magic to return parent path', function() {
    assert.equal(gp('path/to/*.js'), 'path/to');
    assert.equal(gp('/root/path/to/*.js'), '/root/path/to');
    assert.equal(gp('/*.js'), '/');
    assert.equal(gp('*.js'), '.');
    assert.equal(gp('**/*.js'), '.');
    assert.equal(gp('path/{to,from}'), 'path');
    assert.equal(gp('path/!(to|from)'), 'path');
    assert.equal(gp('path/?(to|from)'), 'path');
    assert.equal(gp('path/+(to|from)'), 'path');
    assert.equal(gp('path/*(to|from)'), 'path');
    assert.equal(gp('path/@(to|from)'), 'path');
    assert.equal(gp('path/**/*'), 'path');
    assert.equal(gp('path/**/subdir/foo.*'), 'path');
  });

  it('should return parent dirname from non-glob paths', function() {
    assert.equal(gp('path/foo/bar.js'), 'path/foo');
    assert.equal(gp('path/foo/'), 'path/foo');
    assert.equal(gp('path/foo'), 'path');
  });
});

describe('glob2base test patterns', function() {
  it('should get a base name', function() {
    assert.equal(gp('js/*.js') + '/', 'js/');
  });

  it('should get a base name from a nested glob', function() {
    assert.equal(gp('js/**/test/*.js') + '/', 'js/');
  });

  it('should get a base name from a flat file', function() {
    assert.equal(gp('js/test/wow.js') + '/', 'js/test/');
  });

  it('should get a base name from character class pattern', function() {
    assert.equal(gp('js/t[a-z]st}/*.js') + '/', 'js/');
  });

  it('should get a base name from brace , expansion', function() {
    assert.equal(gp('js/{src,test}/*.js') + '/', 'js/');
  });

  it('should get a base name from brace .. expansion', function() {
    assert.equal(gp('js/test{0..9}/*.js') + '/', 'js/');
  });

  it('should get a base name from extglob', function() {
    assert.equal(gp('js/t+(wo|est)/*.js') + '/', 'js/');
  });

  it('should get a base name from a complex brace glob', function() {
    assert.equal(gp('lib/{components,pages}/**/{test,another}/*.txt') + '/', 'lib/');

    assert.equal(gp('js/test/**/{images,components}/*.js') + '/', 'js/test/');

    assert.equal(gp('ooga/{booga,sooga}/**/dooga/{eooga,fooga}') + '/', 'ooga/');
  });
});
