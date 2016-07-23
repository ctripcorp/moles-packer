// DON'T REMOVE THIS LINE.
;
{{ SYMBOL.global }}

{{ AMD_CODE }}

// pesudo entry component
;(function() {
    {{ SYMBOL.global }}

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

            {{ SYMBOL.changeComponent }} = function(ComponentClass) {
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

    {{ SYMBOL.changeComponent }} = function(component){
        lastComponent = react.createElement(component);
    };

    var registered = false;
    {{ SYMBOL.registerComponent }} = function(componentName) {
        if (registered) return;
        reactNative.AppRegistry.registerComponent(componentName || 'MOLES', function() { return Fake; });
        registered = true;
    };
})(this);
