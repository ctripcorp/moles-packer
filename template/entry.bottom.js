;(function() {
    // ...
	var global = (function() { return this; })();
	global.amd.require(['MOLES_ENTRY_MODULE_NAME'], function(entry) {
		global.amd.re2('MOLES_ENTRY_MODULE_NAME');
	}, MOLES_EXEC_ON_REQUIRED);
})();
