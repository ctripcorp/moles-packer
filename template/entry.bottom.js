;(function() {
    // ...
	var global = (function() { return this; })();
	global.requireJs(['MOLES_ENTRY_MODULE_NAME'], function(entry) {
		global.re2('MOLES_ENTRY_MODULE_NAME');
	}, MOLES_EXEC_ON_REQUIRED);
})();
