{% for name in names %}
global.define('{{ name }}', function() { return require('{{ name }}'); });
{% endfor %}
