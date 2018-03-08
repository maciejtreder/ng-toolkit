/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// HelloWorld Panel

function HelloWorldPanel() {}

HelloWorldPanel.prototype = extend(Firebug.Panel,
{
    name: "HelloWorld",
    title: "Hello World!",
    
    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
    }
});

Firebug.registerPanel(HelloWorldPanel);

// ************************************************************************************************
}});