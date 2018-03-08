/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************


Firebug.Lite.Browser = function(window)
{
    this.contentWindow = window;
    this.contentDocument = window.document;
    this.currentURI = 
    {
        spec: window.location.href
    };
};

Firebug.Lite.Browser.prototype = 
{
    toString: function()
    {
        return "Firebug.Lite.Browser";
    }
};


// ************************************************************************************************
}});
