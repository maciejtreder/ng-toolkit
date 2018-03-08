require.def("Firebug/Script", // module ID
// ************************************************************************************************ 
[
    // list of dependencies
    "require", 
    "exports", 
    "module",
    "Lib",
    "Firebug/Panel"
],
// ************************************************************************************************ 
function(require, exports, module) { with (module.scope) {
// ************************************************************************************************ 

include("Lib"); // Lib.extend avaiable as extend

imports("Firebug/Panel"); // Add Firebug.Panel to the module scope

console.log("loading Firebug.Script module");

var Script = extend(Firebug.Panel,
{
    initialize: function() {
        Firebug.Panel.initialize.apply(this, arguments);
        
        console.log("calling Firebug.Script.initialize");
    },
    
    helper: function() {
        console.log("calling Firebug.Script.helper");
    }
});

return Script;

// ************************************************************************************************ 
}});
