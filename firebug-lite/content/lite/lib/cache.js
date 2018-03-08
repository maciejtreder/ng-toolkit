/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************


// ************************************************************************************************

/**
 * TODO: if a cached element is cloned, the expando property will be cloned too in IE
 * which will result in a bug. Firebug Lite will think the new cloned node is the old
 * one.
 */
 
var id = "firebug" + new Date().getTime();
var uniqueKey = 0;
var cacheMap = {};

function Cache()
{
    this._ref = {};
}

Cache.id = id;

Cache.prototype =
{
    // load    
    get: function(key)
    {
        return this._ref.hasOwnProperty(key) ?
                cacheMap[key].object :
                null;
    },
    
    // save
    set: function(object)
    {
        var key = this._getValidatedKey(object);
        
        if (!key)
        {
            key = ++uniqueKey;
            object[id] = key;
        }
        
        if (this._ref.hasOwnProperty(key))
            this._ref[key]++;
        else
            this._ref[key] = 1;

        if (cacheMap.hasOwnProperty(key))
            cacheMap[key].ref++;
        else
            cacheMap[key] = {object: object, data: {}, ref: 1};
        
        return key;
    },
    
    // delete?
    unset: function(object)
    {
        var key = this._getValidatedKey(object);
        
        if (!key) return;
        
        var amount = this._ref[key];
        
        this._ref[key] -= amount;
        cacheMap[key].ref -= amount;
        
        this.free(object);
    },
    
    free: function(object)
    {
        var key = this._getValidatedKey(object);
        
        if (!key) return;
        
        if (!this._ref.hasOwnProperty(key)) return;
        
        if (--this._ref[key] <= 0)
            delete this._ref[key];
        
        var cache = cacheMap[key];
        if (--cache.ref <= 0)
        {
            unmarkObject(object);
            
            cache = cache.object = cache.data = cacheMap[key] = null;
            delete cacheMap[key];
        }
    },
    
    key: function(object)
    {
        return this._getValidatedKey(object);
    },
    
    has: function(object)
    {
        var key = this._getValidatedKey(object);
        return key && this._ref.hasOwnProperty(key);
    },
    
    each: function(callback)
    {
        var map = this._ref;
        
        for (var key in map)
        {
            if (map.hasOwnProperty(key))
            {
                callback.call(this, key, this.get(key));
            }
        }
    },
    
    data: function(object, name, value)
    {
        var key, data;
        
        if (!name) return null;
        
        // set data
        if (value)
        {
            key = this.key(object);
            
            if (!key) return null;
            
            return cacheMap[key].data[name] = value;
        }
        // get data
        else
        {
            key = this.key(object);
            
            if (!key) return null;
            
            data = cacheMap[key].data;

            return data.hasOwnProperty(name) ? data[name] : null;
        }
    },
    
    clear: function()
    {
        this.each(function(key, object){
            this.unset(object);
        });
    },
    
    _getValidatedKey: function(object)
    {
        var key = object[id];
        
        // If a cached element is cloned in IE, the expando property id will be also 
        // cloned (differently than other browsers) resulting in a bug: Firebug Lite 
        // will think the new cloned node is the old one. To prevent this problem we're 
        // checking if the cached element matches the given element.
        if (
            //!supportsDeleteExpando &&  // the problem happens when supportsDeleteExpando is false
            key &&                           // the element has the expando property 
            cacheMap.hasOwnProperty(key) && // there is a cached element with the same key
            cacheMap[key].object !== object // but it is a different element than the current one
            )
        {
            // remove the problematic property
            unmarkObject(object);
    
            key = null;
        }
        
        return key;
    }
};


function unmarkObject(object)
{
    try
    {
        delete object[id];
    }
    catch(e)
    {
        if (object.removeAttribute)
            object.removeAttribute(id);
        else
            object[id] = null;
    }
}

// ************************************************************************************************

// xxxpedro exposing variables for debugging
window.cacheMap = cacheMap ;
window.Cache = Cache;

// ************************************************************************************************
}});
