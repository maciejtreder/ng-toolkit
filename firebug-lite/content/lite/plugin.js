/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Globals

var modules = [];
var panelTypes = [];
var panelTypeMap = {};

var parentPanelMap = {};


var registerModule = Firebug.registerModule;
var registerPanel = Firebug.registerPanel;

// ************************************************************************************************
append(Firebug,
{
    extend: function(fn)
    {
        if (Firebug.chrome && Firebug.chrome.addPanel)
        {
            var namespace = ns(fn);
            fn.call(namespace, FBL);
        }
        else
        {
            setTimeout(function(){Firebug.extend(fn);},100);
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Registration

    registerModule: function()
    {
        registerModule.apply(Firebug, arguments);
        
        modules.push.apply(modules, arguments);
        
        dispatch(modules, "initialize", []);

        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.registerModule");
    },

    registerPanel: function()
    {
        registerPanel.apply(Firebug, arguments);
        
        panelTypes.push.apply(panelTypes, arguments);

        for (var i = 0, panelType; panelType = arguments[i]; ++i)
        {
            // TODO: xxxpedro investigate why Dev Panel throws an error
            if (panelType.prototype.name == "Dev") continue;
            
            panelTypeMap[panelType.prototype.name] = arguments[i];
            
            var parentPanelName = panelType.prototype.parentPanel;
            if (parentPanelName)
            {
                parentPanelMap[parentPanelName] = 1;
            }
            else
            {
                var panelName = panelType.prototype.name;
                var chrome = Firebug.chrome;
                chrome.addPanel(panelName);
                
                // tab click handler
                var onTabClick = function onTabClick()
                { 
                    chrome.selectPanel(panelName);
                    return false;
                };
                
                chrome.addController([chrome.panelMap[panelName].tabNode, "mousedown", onTabClick]);                
            }
        }
        
        if (FBTrace.DBG_INITIALIZE)
            for (var i = 0; i < arguments.length; ++i)
                FBTrace.sysout("Firebug.registerPanel", arguments[i].prototype.name);
    }

});




// ************************************************************************************************
}});