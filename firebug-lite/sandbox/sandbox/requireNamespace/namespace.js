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
    
    var namespace = newScope.namespace = function(namespace, source)
    {
        var set = !!source,
            ns = namespace.replace("/", ".").split("."),
            object = newScope;

        for(var i=0, l=ns.length, n; n=ns[i]; i++)
        {
            if(set)
                object[n] = i < l-1 ? object[n] || {} : source;

            else if(!object[n])
                error('Namespace not found: ' + namespace);

            object = object[n];
        }

        return object;
    };

    newScope.include = function(name)
    {
        var m = require(name);
        for (var n in m)
            newScope[n] = m[n];
    };
    
    newScope.imports = function(name)
    {
        namespace(name, require(name));
    };

    return newScope;
};













                    var moduleScope = cjsModule.scope = {
                        include: function(moduleName) {
                            var includedModule = req(moduleName);
                            for (var name in includedModule) {
                                if (includedModule.hasOwnProperty(name)) {
                                    moduleScope[name] = includedModule[name];
                                }
                            }
                        },
                        imports: function(namespace)
                        {
                            NS(namespace, require(namespace), moduleScope);
                        }
                    };





// ************************************************************************************************ 
});
