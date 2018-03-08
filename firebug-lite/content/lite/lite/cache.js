/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

Firebug.Lite.Cache = 
{
    ID: "firebug-" + new Date().getTime()
};

// ************************************************************************************************

/**
 * TODO: if a cached element is cloned, the expando property will be cloned too in IE
 * which will result in a bug. Firebug Lite will think the new cloned node is the old
 * one.
 * 
 * TODO: Investigate a possibility of cache validation, to be customized by each 
 * kind of cache. For ElementCache it should validate if the element still is 
 * inserted at the DOM.
 */ 
var cacheUID = 0;
var createCache = function()
{
    var map = {};
    var data = {};
    
    var CID = Firebug.Lite.Cache.ID;
    
    // better detection
    var supportsDeleteExpando = !document.all;
    
    var cacheFunction = function(element)
    {
        return cacheAPI.set(element);
    };
    
    var cacheAPI =  
    {
        get: function(key)
        {
            return map.hasOwnProperty(key) ?
                    map[key] :
                    null;
        },
        
        set: function(element)
        {
            var id = getValidatedKey(element);
            
            if (!id)
            {
                id = ++cacheUID;
                element[CID] = id;
            }
            
            if (!map.hasOwnProperty(id))
            {
                map[id] = element;
                data[id] = {};
            }
            
            return id;
        },
        
        unset: function(element)
        {
            var id = getValidatedKey(element);
            
            if (!id) return;
            
            if (supportsDeleteExpando)
            {
                delete element[CID];
            }
            else if (element.removeAttribute)
            {
                element.removeAttribute(CID);
            }

            delete map[id];
            delete data[id];
            
        },
        
        key: function(element)
        {
            return getValidatedKey(element);
        },
        
        has: function(element)
        {
            var id = getValidatedKey(element);
            return id && map.hasOwnProperty(id);
        },
        
        each: function(callback)
        {
            for (var key in map)
            {
                if (map.hasOwnProperty(key))
                {
                    callback(key, map[key]);
                }
            }
        },
        
        data: function(element, name, value)
        {
            // set data
            if (value)
            {
                if (!name) return null;
                
                var id = cacheAPI.set(element);
                
                return data[id][name] = value;
            }
            // get data
            else
            {
                var id = cacheAPI.key(element);

                return data.hasOwnProperty(id) && data[id].hasOwnProperty(name) ?
                        data[id][name] :
                        null;
            }
        },
        
        clear: function()
        {
            for (var id in map)
            {
                var element = map[id];
                cacheAPI.unset(element);                
            }
        }
    };
    
    var getValidatedKey = function(element)
    {
        var id = element[CID];
        
        // If a cached element is cloned in IE, the expando property CID will be also 
        // cloned (differently than other browsers) resulting in a bug: Firebug Lite 
        // will think the new cloned node is the old one. To prevent this problem we're 
        // checking if the cached element matches the given element.
        if (
            !supportsDeleteExpando &&   // the problem happens when supportsDeleteExpando is false
            id &&                       // the element has the expando property 
            map.hasOwnProperty(id) &&   // there is a cached element with the same id
            map[id] != element          // but it is a different element than the current one
            )
        {
            // remove the problematic property
            element.removeAttribute(CID);

            id = null;
        }
        
        return id;
    };
    
    FBL.append(cacheFunction, cacheAPI);
    
    return cacheFunction;
};

// ************************************************************************************************

// TODO: xxxpedro : check if we need really this on FBL scope
Firebug.Lite.Cache.StyleSheet = createCache();
Firebug.Lite.Cache.Element = createCache();

// TODO: xxxpedro
Firebug.Lite.Cache.Event = createCache();


// ************************************************************************************************
}});
