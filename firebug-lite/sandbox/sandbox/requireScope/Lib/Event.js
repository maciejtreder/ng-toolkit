require.def("Lib/Event", // module ID
// ************************************************************************************************ 
[
    // list of dependencies
    "require", 
    "exports", 
    "module"
],
// ************************************************************************************************ 
function(require, exports, module) { // no scope needed once lib is a "top-level" module
// ************************************************************************************************ 

console.log("loading Lib.Event module");

exports.addEvent = function() {
    console.log("calling Lib.Event.addEvent");
};

exports.removeEvent = function() {
    console.log("calling Lib.Event.removeEvent");
};

// ************************************************************************************************ 
});
