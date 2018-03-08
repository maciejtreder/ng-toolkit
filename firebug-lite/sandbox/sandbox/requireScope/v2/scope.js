require.def("scope", // module ID
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

console.log("loading Scope module");

exports.create = function()
{
    var newScope = {};
    newScope.include = function(name)
    {
        var m = require(name);
        for (var n in m)
            newScope[n] = m[n];
    };
    return newScope;
};

// ************************************************************************************************ 
});
