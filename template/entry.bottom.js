(function() {
	var global = (function() { return this; })();
	global.requireJs(['CRN_ENTRY_MODULE_NAME'], function(entry) {
		global.re2('CRN_ENTRY_MODULE_NAME');
	}, CRN_STRICT_CMD);
})();
