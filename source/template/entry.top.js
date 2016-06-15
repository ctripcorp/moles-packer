// ;(function() {
//     var global = (function() { return this; })();
//     var Fake = global.react.createClass({
//         getInitialState: function() {
//             var that = this;
//
//             global.changeComponent = function(ComponentClass) {
//                 that.setState({
//                     component: global.react.createElement(ComponentClass)
//                 });
//             };
//
//             return {
//                 component: lastComponent
//             };
//         },
//
//         render: function() {
//             return this.state.component || global.react.createElement(global.reactNative.View);
//         }
//     });
//
//     var lastComponent = null;
//
//     global.changeComponent = function(component){
//         lastComponent = global.react.createElement(component);
//     };
//
//     global.reactNative.AppRegistry.registerComponent('bar', function() { return Fake; });
// })();
