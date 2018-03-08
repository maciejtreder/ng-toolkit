require.def("Firebug/Panel", // module ID
// ************************************************************************************************ 
[
    // list of dependencies
    "require", 
    "exports", 
    "module",
    "Lib",
    "Lib/Event"
],
// ************************************************************************************************ 
function(require, exports, module) { with (module.scope) {
// ************************************************************************************************ 

include("Lib"); // Lib.extend avaiable as extend
include("Lib/Event"); // Lib.Event.addEvent avaiable as addEvent

console.log("loading Firebug.Panel module");

var Panel =
{
    panelNode: null,
    
    initialize: function()
    {
        console.log("calling Firebug.Panel.initialize");
        
        // dummy call just to demonstrate loading small pieces of Lib
        addEvent(this.panelNode, "click");
    },
    
    show: function() {
        console.log("calling Firebug.Panel.show");
    },
    
    hide: function() {
        console.log("calling Firebug.Panel.hide");
    }
};

return Panel;

// ************************************************************************************************ 
}});
