
var promise = function(callbacks) {
	return new Promise(function(resolve, reject) {
		callbacks.onsuccess = resolve;
		callbacks.onerror   = reject;
	});
};

module.exports = promise;
