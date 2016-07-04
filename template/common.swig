;var global = (function() { return this; }())

{{ AMD_CODE }}

// pesudo entry component
;(function() {
    var global = (function() { return this; })();

    var
          react = require('react')
        , React = react
        , reactNative = require('react-native')
        ;

    {% for name in COMMON_MODULES %}
    require('{{ name }}');
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

    global.molesRegister = function(componentName) {
        reactNative.AppRegistry.registerComponent(componentName || 'MOLES', function() { return Fake; });
    };

    {% for name in REDEFINED_MODULES %}
    global.amd.define('{{ loop.key }}', function() { return require('{{ loop.key }}'); });
    {% endfor %}
})(this);
