require.def("lib/event", // module ID
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

console.log("loading lib.event module");

exports.addEvent = function() {
    console.log("calling lib.event.addEvent");
};

exports.removeEvent = function() {
    console.log("calling lib.event.removeEvent");
};

// ************************************************************************************************ 
});
