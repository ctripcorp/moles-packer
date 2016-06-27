;(function(global) {
    var
          react = require('react')
        , reactNative = require('react-native')
        , global = (function() { return this; })()
        ;

    global._MOLES = {};

	{% for name in names %}
	global._MOLES.{{ name | replace('-', '_', 'g') }} = require('{{ name }}');
	{% endfor %}

	var Fake = react.createClass({
		getInitialState: function() {
			var that = this;

			global.changeComponent = function(ComponentClass) {
				that.setState({
					component: react.createElement(ComponentClass)
				});
			};

			return {
				component: lastComponent
			};
		},

		render: function() {
			return this.state.component || react.createElement(reactNative.View);
		}
	});

	var lastComponent = null;

	global.changeComponent = function(component){
		lastComponent = react.createElement(component);
	};

	reactNative.AppRegistry.registerComponent('MOLES', function() { return Fake; });
})(this);
