/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
var sourceMap = {};

// ************************************************************************************************
Firebug.Lite.Proxy = 
{
    // jsonp callbacks
    _callbacks: {},
    
    /**
     * Load a resource, either locally (directly) or externally (via proxy) using 
     * synchronous XHR calls. Loading external resources requires the proxy plugin to
     * be installed and configured (see /plugin/proxy/proxy.php).
     */
    load: function(url)
    {
        var resourceDomain = getDomain(url);
        var isLocalResource =
            // empty domain means local URL
            !resourceDomain ||
            // same domain means local too
            resourceDomain ==  Firebug.context.window.location.host; // TODO: xxxpedro context
        
        return isLocalResource ? fetchResource(url) : fetchProxyResource(url);
    },
    
    /**
     * Load a resource using JSONP technique.
     */
    loadJSONP: function(url, callback)
    {
        var script = createGlobalElement("script"),
            doc = Firebug.context.document,
            
            uid = "" + new Date().getTime(),
            callbackName = "callback=Firebug.Lite.Proxy._callbacks." + uid,
            
            jsonpURL = url.indexOf("?") != -1 ? 
                    url + "&" + callbackName :
                    url + "?" + callbackName;
            
        Firebug.Lite.Proxy._callbacks[uid] = function(data)
        {
            if (callback)
                callback(data);
            
            script.parentNode.removeChild(script);
            delete Firebug.Lite.Proxy._callbacks[uid];
        };
        
        script.src = jsonpURL;
        
        if (doc.documentElement)
            doc.documentElement.appendChild(script);
    },
    
    /**
     * Load a resource using YQL (not reliable).
     */
    YQL: function(url, callback)
    {
        var yql = "http://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%20url%3D%22" +
                encodeURIComponent(url) + "%22&format=xml";
        
        this.loadJSONP(yql, function(data)
        {
            var source = data.results[0];
            
            // clean up YQL bogus elements
            var match = /<body>\s+<p>([\s\S]+)<\/p>\s+<\/body>$/.exec(source);
            if (match)
                source = match[1];
            
            console.log(source);
        });
    }
};

// ************************************************************************************************

Firebug.Lite.Proxy.fetchResourceDisabledMessage = 
    "/* Firebug Lite resource fetching is disabled.\n" +
    "To enabled it set the Firebug Lite option \"disableResourceFetching\" to \"false\".\n" +
    "More info at http://getfirebug.com/firebuglite#Options */";

var fetchResource = function(url)
{
    if (Firebug.disableResourceFetching)
    {
        var source = sourceMap[url] = Firebug.Lite.Proxy.fetchResourceDisabledMessage;
        return source;
    }

    if (sourceMap.hasOwnProperty(url))
        return sourceMap[url];

    // Getting the native XHR object so our calls won't be logged in the Console Panel
    var xhr = FBL.getNativeXHRObject();
    xhr.open("get", url, false);
    xhr.send();
    
    var source = sourceMap[url] = xhr.responseText; 
    return source;
};

var fetchProxyResource = function(url)
{
    if (sourceMap.hasOwnProperty(url))
        return sourceMap[url];

    var proxyURL = Env.Location.baseDir + "plugin/proxy/proxy.php?url=" + encodeURIComponent(url);
    var response = fetchResource(proxyURL);
    
    try
    {
        var data = eval("(" + response + ")");
    }
    catch(E)
    {
        return "ERROR: Firebug Lite Proxy plugin returned an invalid response.";
    }
    
    var source = data ? data.contents : ""; 
    return source;
};
    

// ************************************************************************************************
}});
