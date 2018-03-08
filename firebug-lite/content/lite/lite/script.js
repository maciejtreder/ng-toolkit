/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

Firebug.Lite.Script = function(window)
{
    this.fileName = null;
    this.isValid = null;
    this.baseLineNumber = null;
    this.lineExtent = null;
    this.tag = null;
    
    this.functionName = null;
    this.functionSource = null;
};

Firebug.Lite.Script.prototype = 
{
    isLineExecutable: function(){},
    pcToLine: function(){},
    lineToPc: function(){},
    
    toString: function()
    {
        return "Firebug.Lite.Script";
    }
};

// ************************************************************************************************
}});
