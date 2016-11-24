// DON'T REMOVE THIS LINE.
;(function() {
    // ...
	{{ SYMBOL.global }}
	{{ SYMBOL.require }}(['{{ entryName }}'], function(entry) {
	  var ret = {{ SYMBOL.execRequire }}('{{ entryName }}');
    global.molesChange(ret.default);
	}, {{ execOnRequired }});
})();
