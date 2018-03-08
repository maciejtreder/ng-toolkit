require.def("Lib", // module ID
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

console.log("loading Lib module");

exports.extend = function(l, r)
{
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];
    return newOb;
};

exports.append = function(l, r)
{
    for (var n in r)
        l[n] = r[n];
        
    return l;
};

// ************************************************************************************************ 
});
