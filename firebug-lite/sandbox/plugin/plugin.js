/* See license.txt for terms of usage */

Firebug.extend(function(FBL) { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Plugin Module

Firebug.Plugin = extend(Firebug.Module,
{
    getPanel: function()
    {
        return Firebug.chrome ? Firebug.chrome.getPanel("Plugin") : null;
    },
    
    clear: function()
    {
        alert("clear button clicked");
        this.getPanel().panelNode.innerHTML = "";
    }
});


// ************************************************************************************************
// Plugin Panel

function PluginPanel(){};

PluginPanel.prototype = extend(Firebug.Panel,
{
    name: "Plugin",
    title: "Plugin",
    
    options: {
        hasToolButtons: true,
        innerHTMLSync: true
    },
    
    create: function(){
        Firebug.Panel.create.apply(this, arguments);
        
        this.clearButton = new Button({
            caption: "Clear",
            title: "Clear Panel",            
            owner: Firebug.Plugin,
            onClick: Firebug.Plugin.clear
        });
    },
    
    initialize: function(){
        Firebug.Panel.initialize.apply(this, arguments);
        
        this.clearButton.initialize();
        
        this.panelNode.innerHTML = "Hello World!";
    }
    
});

Firebug.registerPanel(PluginPanel);
Firebug.registerModule(Firebug.Plugin);

// ************************************************************************************************
}});
