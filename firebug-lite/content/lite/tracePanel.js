/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// If application isn't in trace mode, the FBTrace panel won't be loaded
if (!Env.Options.enableTrace) return;

// ************************************************************************************************
// FBTrace Module

Firebug.Trace = extend(Firebug.Module,
{
    getPanel: function()
    {
        return Firebug.chrome ? Firebug.chrome.getPanel("Trace") : null;
    },
    
    clear: function()
    {
        this.getPanel().panelNode.innerHTML = "";
    }
});

Firebug.registerModule(Firebug.Trace);


// ************************************************************************************************
// FBTrace Panel

function TracePanel(){};

TracePanel.prototype = extend(Firebug.Panel,
{
    name: "Trace",
    title: "Trace",
    
    options: {
        hasToolButtons: true,
        innerHTMLSync: true
    },
    
    create: function(){
        Firebug.Panel.create.apply(this, arguments);
        
        this.clearButton = new Button({
            caption: "Clear",
            title: "Clear FBTrace logs",            
            owner: Firebug.Trace,
            onClick: Firebug.Trace.clear
        });
    },
    
    initialize: function(){
        Firebug.Panel.initialize.apply(this, arguments);
        
        this.clearButton.initialize();
    },

    shutdown: function()
    {
        this.clearButton.shutdown();

        Firebug.Panel.shutdown.apply(this, arguments);
    }

});

Firebug.registerPanel(TracePanel);

// ************************************************************************************************
}});