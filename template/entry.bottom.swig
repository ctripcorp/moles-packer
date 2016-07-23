// DON'T REMOVE THIS LINE.
;(function() {
    // ...
	{{ SYMBOL.global }}
	{{ SYMBOL.require }}(['{{ entryName }}'], function(entry) {
		{{ SYMBOL.execRequire }}('{{ entryName }}');
	}, {{ execOnRequired }});
})();
