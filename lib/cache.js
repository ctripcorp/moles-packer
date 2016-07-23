'use strict';

var _caches = {};

var _ME = (name) => {
    return _caches[name];
};

_ME.reset = () => {
    _caches.meta = {
        entry: null,
        modules: []
    };
};

_ME.meta = {
    addModule(info) {
        _ME('meta').modules.push(info);
    },

    setEntry(name) {
        _ME('meta').entry = name;
    }
};

module.exports = _ME;
