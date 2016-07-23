// DON'T REMOVE THIS LINE.
;(function() {
    var global = (function() { return this; })();

    {% for module in MODULES %}
    global.amd.define('{{ module.id }}', function() { return require({{ module[PLATFORM] }}); });
    {% endfor %}
})(this);
