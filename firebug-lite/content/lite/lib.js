/*!*************************************************************
 *
 *    Firebug Lite 1.4.0
 * 
 *      Copyright (c) 2007, Parakey Inc.
 *      Released under BSD license.
 *      More information: http://getfirebug.com/firebuglite
 *  
 **************************************************************/

/*!
 * CSS selectors powered by:
 * 
 * Sizzle CSS Selector Engine - v1.0
 *  Copyright 2009, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */

/** @namespace describe lib */

// FIXME: xxxpedro if we use "var FBL = {}" the FBL won't appear in the DOM Panel in IE 
var FBL = {};

( /** @scope s_lib @this FBL */ function() {
// ************************************************************************************************

// ************************************************************************************************
// Constants
    
var productionDir = "http://getfirebug.com/releases/lite/";
var bookmarkletVersion = 4;

// ************************************************************************************************

var reNotWhitespace = /[^\s]/;
var reSplitFile = /:\/{1,3}(.*?)\/([^\/]*?)\/?($|\?.*)/;

// Globals
this.reJavascript = /\s*javascript:\s*(.*)/;
this.reChrome = /chrome:\/\/([^\/]*)\//;
this.reFile = /file:\/\/([^\/]*)\//;


// ************************************************************************************************
// properties

var userAgent = navigator.userAgent.toLowerCase();
this.isFirefox = /firefox/.test(userAgent);
this.isOpera   = /opera/.test(userAgent);
this.isSafari  = /webkit/.test(userAgent);
this.isIE      = /msie/.test(userAgent) && !/opera/.test(userAgent);
this.isIE6     = /msie 6/i.test(navigator.appVersion);
this.browserVersion = (userAgent.match( /.+(?:rv|it|ra|ie)[\/: ]([\d.]+)/ ) || [0,'0'])[1];
this.isIElt8   = this.isIE && (this.browserVersion-0 < 8); 

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.NS = null;
this.pixelsPerInch = null;


// ************************************************************************************************
// Namespaces

var namespaces = [];

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.ns = function(fn)
{
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

var FBTrace = null;

this.initialize = function()
{
    // Firebug Lite is already running in persistent mode so we just quit
    if (window.firebug && firebug.firebuglite || window.console && console.firebuglite)
        return;
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // initialize environment

    // point the FBTrace object to the local variable
    if (FBL.FBTrace)
        FBTrace = FBL.FBTrace;
    else
        FBTrace = FBL.FBTrace = {};
    
    // check if the actual window is a persisted chrome context
    var isChromeContext = window.Firebug && typeof window.Firebug.SharedEnv == "object";
    
    // chrome context of the persistent application
    if (isChromeContext)
    {
        // TODO: xxxpedro persist - make a better synchronization
        sharedEnv = window.Firebug.SharedEnv;
        delete window.Firebug.SharedEnv;
        
        FBL.Env = sharedEnv;
        FBL.Env.isChromeContext = true;
        FBTrace.messageQueue = FBL.Env.traceMessageQueue;
    }
    // non-persistent application
    else
    {
        FBL.NS = document.documentElement.namespaceURI;
        FBL.Env.browser = window;
        FBL.Env.destroy = destroyEnvironment;

        if (document.documentElement.getAttribute("debug") == "true")
            FBL.Env.Options.startOpened = true;

        // find the URL location of the loaded application
        findLocation();
        
        // TODO: get preferences here...
        // The problem is that we don't have the Firebug object yet, so we can't use 
        // Firebug.loadPrefs. We're using the Store module directly instead.
        var prefs = FBL.Store.get("FirebugLite") || {};
        FBL.Env.DefaultOptions = FBL.Env.Options;
        FBL.Env.Options = FBL.extend(FBL.Env.Options, prefs.options || {});
        
        if (FBL.isFirefox && 
            typeof FBL.Env.browser.console == "object" && 
            FBL.Env.browser.console.firebug &&
            FBL.Env.Options.disableWhenFirebugActive)
                return;
    }
    
    // exposes the FBL to the global namespace when in debug mode
    if (FBL.Env.isDebugMode)
    {
        FBL.Env.browser.FBL = FBL;
    }
    
    // check browser compatibilities
    this.isQuiksMode = FBL.Env.browser.document.compatMode == "BackCompat";
    this.isIEQuiksMode = this.isIE && this.isQuiksMode;
    this.isIEStantandMode = this.isIE && !this.isQuiksMode;
    
    this.noFixedPosition = this.isIE6 || this.isIEQuiksMode;
    
    // after creating/synchronizing the environment, initialize the FBTrace module
    if (FBL.Env.Options.enableTrace) FBTrace.initialize();
    
    if (FBTrace.DBG_INITIALIZE && isChromeContext) FBTrace.sysout("FBL.initialize - persistent application", "initialize chrome context");
        
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // initialize namespaces

    if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL.initialize", namespaces.length/2+" namespaces BEGIN");
    
    for (var i = 0; i < namespaces.length; i += 2)
    {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }
    
    if (FBTrace.DBG_INITIALIZE) {
        FBTrace.sysout("FBL.initialize", namespaces.length/2+" namespaces END");
        FBTrace.sysout("FBL waitForDocument", "waiting document load");
    }
    
    FBL.Ajax.initialize();
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // finish environment initialization
    FBL.Firebug.loadPrefs();
    
    if (FBL.Env.Options.enablePersistent)
    {
        // TODO: xxxpedro persist - make a better synchronization
        if (isChromeContext)
        {
            FBL.FirebugChrome.clone(FBL.Env.FirebugChrome);
        }
        else
        {
            FBL.Env.FirebugChrome = FBL.FirebugChrome;
            FBL.Env.traceMessageQueue = FBTrace.messageQueue;
        }
    }
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // wait document load
    
    waitForDocument();
};

var waitForDocument = function waitForDocument()
{
    // document.body not available in XML+XSL documents in Firefox
    var doc = FBL.Env.browser.document;
    var body = doc.getElementsByTagName("body")[0];
    
    if (body)
    {
        calculatePixelsPerInch(doc, body);
        onDocumentLoad();
    }
    else
        setTimeout(waitForDocument, 50);
};

var onDocumentLoad = function onDocumentLoad()
{
    if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL onDocumentLoad", "document loaded");
    
    // fix IE6 problem with cache of background images, causing a lot of flickering 
    if (FBL.isIE6)
        fixIE6BackgroundImageCache();
        
    // chrome context of the persistent application
    if (FBL.Env.Options.enablePersistent && FBL.Env.isChromeContext)
    {
        // finally, start the application in the chrome context
        FBL.Firebug.initialize();
        
        // if is not development mode, remove the shared environment cache object
        // used to synchronize the both persistent contexts
        if (!FBL.Env.isDevelopmentMode)
        {
            sharedEnv.destroy();
            sharedEnv = null;
        }
    }
    // non-persistent application
    else
    {
        FBL.FirebugChrome.create();
    }
};

// ************************************************************************************************
// Env

var sharedEnv;

this.Env =
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // Env Options (will be transported to Firebug options)
    Options:
    {
        saveCookies: true,
    
        saveWindowPosition: false,
        saveCommandLineHistory: false,
        
        startOpened: false,
        startInNewWindow: false,
        showIconWhenHidden: true,
        
        overrideConsole: true,
        ignoreFirebugElements: true,
        disableWhenFirebugActive: true,
        
        disableXHRListener: false,
        disableResourceFetching: false,
        
        enableTrace: false,
        enablePersistent: false
        
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // Library location
    Location:
    {
        sourceDir: null,
        baseDir: null,
        skinDir: null,
        skin: null,
        app: null
    },

    skin: "xp",
    useLocalSkin: false,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // Env states
    isDevelopmentMode: false,
    isDebugMode: false,
    isChromeContext: false,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    // Env references
    browser: null,
    chrome: null
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var destroyEnvironment = function destroyEnvironment()
{
    setTimeout(function()
    {
        FBL = null;
    }, 100);
};

// ************************************************************************************************
// Library location

var findLocation =  function findLocation() 
{
    var reFirebugFile = /(firebug-lite(?:-\w+)?(?:\.js|\.jgz))(?:#(.+))?$/;
    var reGetFirebugSite = /(?:http|https):\/\/getfirebug.com\//;
    var isGetFirebugSite;
    
    var rePath = /^(.*\/)/;
    var reProtocol = /^\w+:\/\//;
    var path = null;
    var doc = document;
    
    // Firebug Lite 1.3.0 bookmarklet identification
    var script = doc.getElementById("FirebugLite");
    
    var scriptSrc;
    var hasSrcAttribute = true;
    
    // If the script was loaded via bookmarklet, we already have the script tag
    if (script)
    {
        scriptSrc = script.src;
        file = reFirebugFile.exec(scriptSrc);
        
        var version = script.getAttribute("FirebugLite");
        var number = version ? parseInt(version) : 0; 
        
        if (!version || !number || number < bookmarkletVersion)
        {
            FBL.Env.bookmarkletOutdated = true;
        }
    }
    // otherwise we must search for the correct script tag
    else
    {
        for(var i=0, s=doc.getElementsByTagName("script"), si; si=s[i]; i++)
        {
            var file = null;
            if ( si.nodeName.toLowerCase() == "script" )
            {
                if (file = reFirebugFile.exec(si.getAttribute("firebugSrc")))
                {
                    scriptSrc = si.getAttribute("firebugSrc");
                    hasSrcAttribute = false;
                }
                else if (file = reFirebugFile.exec(si.src))
                {
                    scriptSrc = si.src;
                }
                else
                    continue;
                
                script = si;
                break;
            }
        }
    }

    // mark the script tag to be ignored by Firebug Lite
    if (script)
        script.firebugIgnore = true;
    
    if (file)
    {
        var fileName = file[1];
        var fileOptions = file[2];
        
        // absolute path
        if (reProtocol.test(scriptSrc)) {
            path = rePath.exec(scriptSrc)[1];
          
        }
        // relative path
        else
        {
            var r = rePath.exec(scriptSrc);
            var src = r ? r[1] : scriptSrc;
            var backDir = /^((?:\.\.\/)+)(.*)/.exec(src);
            var reLastDir = /^(.*\/)[^\/]+\/$/;
            path = rePath.exec(location.href)[1];
            
            // "../some/path"
            if (backDir)
            {
                var j = backDir[1].length/3;
                var p;
                while (j-- > 0)
                    path = reLastDir.exec(path)[1];

                path += backDir[2];
            }
            
            else if(src.indexOf("/") != -1)
            {
                // "./some/path"
                if(/^\.\/./.test(src))
                {
                    path += src.substring(2);
                }
                // "/some/path"
                else if(/^\/./.test(src))
                {
                    var domain = /^(\w+:\/\/[^\/]+)/.exec(path);
                    path = domain[1] + src;
                }
                // "some/path"
                else
                {
                    path += src;
                }
            }
        }
    }
    
    FBL.Env.isChromeExtension = script && script.getAttribute("extension") == "Chrome"; 
    if (FBL.Env.isChromeExtension)
    {
        path = productionDir;
        FBL.Env.bookmarkletOutdated = false;
        script = {innerHTML: "{showIconWhenHidden:false}"};
    }
    
    isGetFirebugSite = reGetFirebugSite.test(path);
    
    if (isGetFirebugSite && path.indexOf("/releases/lite/") == -1)
    {
        // See Issue 4587 - If we are loading the script from getfirebug.com shortcut, like 
        // https://getfirebug.com/firebug-lite.js, then we must manually add the full path,
        // otherwise the Env.Location will hold the wrong path, which will in turn lead to
        // undesirable effects like the problem in Issue 4587
        path += "releases/lite/" + (fileName == "firebug-lite-beta.js" ? "beta/" : "latest/");
    }
    
    var m = path && path.match(/([^\/]+)\/$/) || null;
    
    if (path && m)
    {
        var Env = FBL.Env;
        
        // Always use the local skin when running in the same domain
        // See Issue 3554: Firebug Lite should use local images when loaded locally
        Env.useLocalSkin = path.indexOf(location.protocol + "//" + location.host + "/") == 0 &&
                // but we cannot use the locan skin when loaded from getfirebug.com, otherwise
                // the bookmarklet won't work when visiting getfirebug.com
                !isGetFirebugSite;
        
        // detecting development and debug modes via file name
        if (fileName == "firebug-lite-dev.js")
        {
            Env.isDevelopmentMode = true;
            Env.isDebugMode = true;
        }
        else if (fileName == "firebug-lite-debug.js")
        {
            Env.isDebugMode = true;
        }
        
        // process the <html debug="true">
        if (Env.browser.document.documentElement.getAttribute("debug") == "true")
        {
            Env.Options.startOpened = true;
        }
        
        // process the Script URL Options
        if (fileOptions)
        {
            var options = fileOptions.split(",");
            
            for (var i = 0, length = options.length; i < length; i++)
            {
                var option = options[i];
                var name, value;
                
                if (option.indexOf("=") != -1)
                {
                    var parts = option.split("=");
                    name = parts[0];
                    value = eval(unescape(parts[1]));
                }
                else
                {
                    name = option;
                    value = true;
                }
                
                if (name == "debug")
                {
                    Env.isDebugMode = !!value;
                }
                else if (name in Env.Options)
                {
                    Env.Options[name] = value;
                }
                else
                {
                    Env[name] = value;
                }
            }
        }
        
        // process the Script JSON Options
        if (hasSrcAttribute)
        {
            var innerOptions = FBL.trim(script.innerHTML);
            if (innerOptions)
            {
                var innerOptionsObject = eval("(" + innerOptions + ")");
                
                for (var name in innerOptionsObject)
                {
                    var value = innerOptionsObject[name];
                    
                    if (name == "debug")
                    {
                        Env.isDebugMode = !!value;
                    }
                    else if (name in Env.Options)
                    {
                        Env.Options[name] = value;
                    }
                    else
                    {
                        Env[name] = value;
                    }
                }
            }
        }
        
        if (!Env.Options.saveCookies)
            FBL.Store.remove("FirebugLite");
        
        // process the Debug Mode
        if (Env.isDebugMode)
        {
            Env.Options.startOpened = true;
            Env.Options.enableTrace = true;
            Env.Options.disableWhenFirebugActive = false;
        }
        
        var loc = Env.Location;
        var isProductionRelease = path.indexOf(productionDir) != -1;
        
        loc.sourceDir = path;
        loc.baseDir = path.substr(0, path.length - m[1].length - 1);
        loc.skinDir = (isProductionRelease ? path : loc.baseDir) + "skin/" + Env.skin + "/"; 
        loc.skin = loc.skinDir + "firebug.html";
        loc.app = path + fileName;
    }
    else
    {
        throw new Error("Firebug Error: Library path not found");
    }
};

// ************************************************************************************************
// Basics

this.bind = function()  // fn, thisObject, args => thisObject.fn(args, arguments);
{
   var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
   return function() { return fn.apply(object, arrayInsert(cloneArray(args), 0, arguments)); };
};

this.bindFixed = function() // fn, thisObject, args => thisObject.fn(args);
{
    var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
    return function() { return fn.apply(object, args); };
};

this.extend = function(l, r)
{
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];
    return newOb;
};

this.descend = function(prototypeParent, childProperties)
{
    function protoSetter() {};
    protoSetter.prototype = prototypeParent;
    var newOb = new protoSetter();
    for (var n in childProperties)
        newOb[n] = childProperties[n];
    return newOb;
};

this.append = function(l, r)
{
    for (var n in r)
        l[n] = r[n];
        
    return l;
};

this.keys = function(map)  // At least sometimes the keys will be on user-level window objects
{
    var keys = [];
    try
    {
        for (var name in map)  // enumeration is safe
            keys.push(name);   // name is string, safe
    }
    catch (exc)
    {
        // Sometimes we get exceptions trying to iterate properties
    }

    return keys;  // return is safe
};

this.values = function(map)
{
    var values = [];
    try
    {
        for (var name in map)
        {
            try
            {
                values.push(map[name]);
            }
            catch (exc)
            {
                // Sometimes we get exceptions trying to access properties
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("lib.values FAILED ", exc);
            }

        }
    }
    catch (exc)
    {
        // Sometimes we get exceptions trying to iterate properties
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("lib.values FAILED ", exc);
    }

    return values;
};

this.remove = function(list, item)
{
    for (var i = 0; i < list.length; ++i)
    {
        if (list[i] == item)
        {
            list.splice(i, 1);
            break;
        }
    }
};

this.sliceArray = function(array, index)
{
    var slice = [];
    for (var i = index; i < array.length; ++i)
        slice.push(array[i]);

    return slice;
};

function cloneArray(array, fn)
{
   var newArray = [];

   if (fn)
       for (var i = 0; i < array.length; ++i)
           newArray.push(fn(array[i]));
   else
       for (var i = 0; i < array.length; ++i)
           newArray.push(array[i]);

   return newArray;
}

function extendArray(array, array2)
{
   var newArray = [];
   newArray.push.apply(newArray, array);
   newArray.push.apply(newArray, array2);
   return newArray;
}

this.extendArray = extendArray;
this.cloneArray = cloneArray;

function arrayInsert(array, index, other)
{
   for (var i = 0; i < other.length; ++i)
       array.splice(i+index, 0, other[i]);

   return array;
}

// ************************************************************************************************

this.createStyleSheet = function(doc, url)
{
    //TODO: xxxpedro
    //var style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
    var style = this.createElement("link");
    style.setAttribute("charset","utf-8");
    style.firebugIgnore = true;
    style.setAttribute("rel", "stylesheet");
    style.setAttribute("type", "text/css");
    style.setAttribute("href", url);
    
    //TODO: xxxpedro
    //style.innerHTML = this.getResource(url);
    return style;
};

this.addStyleSheet = function(doc, style)
{
    var heads = doc.getElementsByTagName("head");
    if (heads.length)
        heads[0].appendChild(style);
    else
        doc.documentElement.appendChild(style);
};

this.appendStylesheet = function(doc, uri)
{
    // Make sure the stylesheet is not appended twice.
    if (this.$(uri, doc))
        return;

    var styleSheet = this.createStyleSheet(doc, uri);
    styleSheet.setAttribute("id", uri);
    this.addStyleSheet(doc, styleSheet);
};

this.addScript = function(doc, id, src)
{
    var element = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:script");
    element.setAttribute("type", "text/javascript");
    element.setAttribute("id", id);
    if (!FBTrace.DBG_CONSOLE)
        FBL.unwrapObject(element).firebugIgnore = true;

    element.innerHTML = src;
    if (doc.documentElement)
        doc.documentElement.appendChild(element);
    else
    {
        // See issue 1079, the svg test case gives this error
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("lib.addScript doc has no documentElement:", doc);
    }
    return element;
};


// ************************************************************************************************

this.getStyle = this.isIE ? 
    function(el, name)
    {
        return el.currentStyle[name] || el.style[name] || undefined;
    }
    :
    function(el, name)
    {
        return el.ownerDocument.defaultView.getComputedStyle(el,null)[name] 
            || el.style[name] || undefined;
    };


// ************************************************************************************************
// Whitespace and Entity conversions

var entityConversionLists = this.entityConversionLists = {
    normal : {
        whitespace : {
            '\t' : '\u200c\u2192',
            '\n' : '\u200c\u00b6',
            '\r' : '\u200c\u00ac',
            ' '  : '\u200c\u00b7'
        }
    },
    reverse : {
        whitespace : {
            '&Tab;' : '\t',
            '&NewLine;' : '\n',
            '\u200c\u2192' : '\t',
            '\u200c\u00b6' : '\n',
            '\u200c\u00ac' : '\r',
            '\u200c\u00b7' : ' '
        }
    }
};

var normal = entityConversionLists.normal,
    reverse = entityConversionLists.reverse;

function addEntityMapToList(ccode, entity)
{
    var lists = Array.prototype.slice.call(arguments, 2),
        len = lists.length,
        ch = String.fromCharCode(ccode);
    for (var i = 0; i < len; i++)
    {
        var list = lists[i];
        normal[list]=normal[list] || {};
        normal[list][ch] = '&' + entity + ';';
        reverse[list]=reverse[list] || {};
        reverse[list]['&' + entity + ';'] = ch;
    }
};

var e = addEntityMapToList,
    white = 'whitespace',
    text = 'text',
    attr = 'attributes',
    css = 'css',
    editor = 'editor';

e(0x0022, 'quot', attr, css);
e(0x0026, 'amp', attr, text, css);
e(0x0027, 'apos', css);
e(0x003c, 'lt', attr, text, css);
e(0x003e, 'gt', attr, text, css);
e(0xa9, 'copy', text, editor);
e(0xae, 'reg', text, editor);
e(0x2122, 'trade', text, editor);

// See http://en.wikipedia.org/wiki/Dash
e(0x2012, '#8210', attr, text, editor); // figure dash
e(0x2013, 'ndash', attr, text, editor); // en dash
e(0x2014, 'mdash', attr, text, editor); // em dash
e(0x2015, '#8213', attr, text, editor); // horizontal bar

e(0x00a0, 'nbsp', attr, text, white, editor);
e(0x2002, 'ensp', attr, text, white, editor);
e(0x2003, 'emsp', attr, text, white, editor);
e(0x2009, 'thinsp', attr, text, white, editor);
e(0x200c, 'zwnj', attr, text, white, editor);
e(0x200d, 'zwj', attr, text, white, editor);
e(0x200e, 'lrm', attr, text, white, editor);
e(0x200f, 'rlm', attr, text, white, editor);
e(0x200b, '#8203', attr, text, white, editor); // zero-width space (ZWSP)

//************************************************************************************************
// Entity escaping

var entityConversionRegexes = {
        normal : {},
        reverse : {}
    };

var escapeEntitiesRegEx = {
    normal : function(list)
    {
        var chars = [];
        for ( var ch in list)
        {
            chars.push(ch);
        }
        return new RegExp('([' + chars.join('') + '])', 'gm');
    },
    reverse : function(list)
    {
        var chars = [];
        for ( var ch in list)
        {
            chars.push(ch);
        }
        return new RegExp('(' + chars.join('|') + ')', 'gm');
    }
};

function getEscapeRegexp(direction, lists)
{
    var name = '', re;
    var groups = [].concat(lists);
    for (i = 0; i < groups.length; i++)
    {
        name += groups[i].group;
    }
    re = entityConversionRegexes[direction][name];
    if (!re)
    {
        var list = {};
        if (groups.length > 1)
        {
            for ( var i = 0; i < groups.length; i++)
            {
                var aList = entityConversionLists[direction][groups[i].group];
                for ( var item in aList)
                    list[item] = aList[item];
            }
        } else if (groups.length==1)
        {
            list = entityConversionLists[direction][groups[0].group]; // faster for special case
        } else {
            list = {}; // perhaps should print out an error here?
        }
        re = entityConversionRegexes[direction][name] = escapeEntitiesRegEx[direction](list);
    }
    return re;
};

function createSimpleEscape(name, direction)
{
    return function(value)
    {
        var list = entityConversionLists[direction][name];
        return String(value).replace(
                getEscapeRegexp(direction, {
                    group : name,
                    list : list
                }),
                function(ch)
                {
                    return list[ch];
                }
               );
    };
};

function escapeGroupsForEntities(str, lists)
{
    lists = [].concat(lists);
    var re = getEscapeRegexp('normal', lists),
        split = String(str).split(re),
        len = split.length,
        results = [],
        cur, r, i, ri = 0, l, list, last = '';
    if (!len)
        return [ {
            str : String(str),
            group : '',
            name : ''
        } ];
    for (i = 0; i < len; i++)
    {
        cur = split[i];
        if (cur == '')
            continue;
        for (l = 0; l < lists.length; l++)
        {
            list = lists[l];
            r = entityConversionLists.normal[list.group][cur];
            // if (cur == ' ' && list.group == 'whitespace' && last == ' ') // only show for runs of more than one space
            //     r = ' ';
            if (r)
            {
                results[ri] = {
                    'str' : r,
                    'class' : list['class'],
                    'extra' : list.extra[cur] ? list['class']
                            + list.extra[cur] : ''
                };
                break;
            }
        }
        // last=cur;
        if (!r)
            results[ri] = {
                'str' : cur,
                'class' : '',
                'extra' : ''
            };
        ri++;
    }
    return results;
};

this.escapeGroupsForEntities = escapeGroupsForEntities;


function unescapeEntities(str, lists)
{
    var re = getEscapeRegexp('reverse', lists),
        split = String(str).split(re),
        len = split.length,
        results = [],
        cur, r, i, ri = 0, l, list;
    if (!len)
        return str;
    lists = [].concat(lists);
    for (i = 0; i < len; i++)
    {
        cur = split[i];
        if (cur == '')
            continue;
        for (l = 0; l < lists.length; l++)
        {
            list = lists[l];
            r = entityConversionLists.reverse[list.group][cur];
            if (r)
            {
                results[ri] = r;
                break;
            }
        }
        if (!r)
            results[ri] = cur;
        ri++;
    }
    return results.join('') || '';
};


// ************************************************************************************************
// String escaping

var escapeForTextNode = this.escapeForTextNode = createSimpleEscape('text', 'normal');
var escapeForHtmlEditor = this.escapeForHtmlEditor = createSimpleEscape('editor', 'normal');
var escapeForElementAttribute = this.escapeForElementAttribute = createSimpleEscape('attributes', 'normal');
var escapeForCss = this.escapeForCss = createSimpleEscape('css', 'normal');

// deprecated compatibility functions
//this.deprecateEscapeHTML = createSimpleEscape('text', 'normal');
//this.deprecatedUnescapeHTML = createSimpleEscape('text', 'reverse');
//this.escapeHTML = deprecated("use appropriate escapeFor... function", this.deprecateEscapeHTML);
//this.unescapeHTML = deprecated("use appropriate unescapeFor... function", this.deprecatedUnescapeHTML);

var escapeForSourceLine = this.escapeForSourceLine = createSimpleEscape('text', 'normal');

var unescapeWhitespace = createSimpleEscape('whitespace', 'reverse');

this.unescapeForTextNode = function(str)
{
    if (Firebug.showTextNodesWithWhitespace)
        str = unescapeWhitespace(str);
    if (!Firebug.showTextNodesWithEntities)
        str = escapeForElementAttribute(str);
    return str;
};

this.escapeNewLines = function(value)
{
    return value.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
};

this.stripNewLines = function(value)
{
    return typeof(value) == "string" ? value.replace(/[\r\n]/g, " ") : value;
};

this.escapeJS = function(value)
{
    return value.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace('"', '\\"', "g");
};

function escapeHTMLAttribute(value)
{
    function replaceChars(ch)
    {
        switch (ch)
        {
            case "&":
                return "&amp;";
            case "'":
                return apos;
            case '"':
                return quot;
        }
        return "?";
    };
    var apos = "&#39;", quot = "&quot;", around = '"';
    if( value.indexOf('"') == -1 ) {
        quot = '"';
        apos = "'";
    } else if( value.indexOf("'") == -1 ) {
        quot = '"';
        around = "'";
    }
    return around + (String(value).replace(/[&'"]/g, replaceChars)) + around;
}


function escapeHTML(value)
{
    function replaceChars(ch)
    {
        switch (ch)
        {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&#39;";
            case '"':
                return "&quot;";
        }
        return "?";
    };
    return String(value).replace(/[<>&"']/g, replaceChars);
}

this.escapeHTML = escapeHTML;

this.cropString = function(text, limit)
{
    text = text + "";

    if (!limit)
        var halfLimit = 50;
    else
        var halfLimit = limit / 2;

    if (text.length > limit)
        return this.escapeNewLines(text.substr(0, halfLimit) + "..." + text.substr(text.length-halfLimit));
    else
        return this.escapeNewLines(text);
};

this.isWhitespace = function(text)
{
    return !reNotWhitespace.exec(text);
};

this.splitLines = function(text)
{
    var reSplitLines2 = /.*(:?\r\n|\n|\r)?/mg;
    var lines;
    if (text.match)
    {
        lines = text.match(reSplitLines2);
    }
    else
    {
        var str = text+"";
        lines = str.match(reSplitLines2);
    }
    lines.pop();
    return lines;
};


// ************************************************************************************************

this.safeToString = function(ob)
{
    if (this.isIE)
    {
        try
        {
            // FIXME: xxxpedro this is failing in IE for the global "external" object
            return ob + "";
        }
        catch(E)
        {
            FBTrace.sysout("Lib.safeToString() failed for ", ob);
            return "";
        }
    }
    
    try
    {
        if (ob && "toString" in ob && typeof ob.toString == "function")
            return ob.toString();
    }
    catch (exc)
    {
        // xxxpedro it is not safe to use ob+""?
        return ob + "";
        ///return "[an object with no toString() function]";
    }
};

// ************************************************************************************************

this.hasProperties = function(ob)
{
    try
    {
        for (var name in ob)
            return true;
    } catch (exc) {}
    return false;
};

// ************************************************************************************************
// String Util

var reTrim = /^\s+|\s+$/g;
this.trim = function(s)
{
    return s.replace(reTrim, "");
};


// ************************************************************************************************
// Empty

this.emptyFn = function(){};



// ************************************************************************************************
// Visibility

this.isVisible = function(elt)
{
    /*
    if (elt instanceof XULElement)
    {
        //FBTrace.sysout("isVisible elt.offsetWidth: "+elt.offsetWidth+" offsetHeight:"+ elt.offsetHeight+" localName:"+ elt.localName+" nameSpace:"+elt.nameSpaceURI+"\n");
        return (!elt.hidden && !elt.collapsed);
    }
    /**/
    
    return this.getStyle(elt, "visibility") != "hidden" &&
        ( elt.offsetWidth > 0 || elt.offsetHeight > 0 
        || elt.tagName in invisibleTags
        || elt.namespaceURI == "http://www.w3.org/2000/svg"
        || elt.namespaceURI == "http://www.w3.org/1998/Math/MathML" );
};

this.collapse = function(elt, collapsed)
{
    // IE6 doesn't support the [collapsed] CSS selector. IE7 does support the selector, 
    // but it is causing a bug (the element disappears when you set the "collapsed" 
    // attribute, but it doesn't appear when you remove the attribute. So, for those
    // cases, we need to use the class attribute.
    if (this.isIElt8)
    {
        if (collapsed)
            this.setClass(elt, "collapsed");
        else
            this.removeClass(elt, "collapsed");
    }
    else
        elt.setAttribute("collapsed", collapsed ? "true" : "false");
};

this.obscure = function(elt, obscured)
{
    if (obscured)
        this.setClass(elt, "obscured");
    else
        this.removeClass(elt, "obscured");
};

this.hide = function(elt, hidden)
{
    elt.style.visibility = hidden ? "hidden" : "visible";
};

this.clearNode = function(node)
{
    var nodeName = " " + node.nodeName.toLowerCase() + " ";
    var ignoreTags = " table tbody thead tfoot th tr td ";
    
    // IE can't use innerHTML of table elements
    if (this.isIE && ignoreTags.indexOf(nodeName) != -1)
        this.eraseNode(node);
    else
        node.innerHTML = "";
};

this.eraseNode = function(node)
{
    while (node.lastChild)
        node.removeChild(node.lastChild);
};

// ************************************************************************************************
// Window iteration

this.iterateWindows = function(win, handler)
{
    if (!win || !win.document)
        return;

    handler(win);

    if (win == top || !win.frames) return; // XXXjjb hack for chromeBug

    for (var i = 0; i < win.frames.length; ++i)
    {
        var subWin = win.frames[i];
        if (subWin != win)
            this.iterateWindows(subWin, handler);
    }
};

this.getRootWindow = function(win)
{
    for (; win; win = win.parent)
    {
        if (!win.parent || win == win.parent || !this.instanceOf(win.parent, "Window"))
            return win;
    }
    return null;
};

// ************************************************************************************************
// Graphics

this.getClientOffset = function(elt)
{
    var addOffset = function addOffset(elt, coords, view)
    {
        var p = elt.offsetParent;

        ///var style = isIE ? elt.currentStyle : view.getComputedStyle(elt, "");
        var chrome = Firebug.chrome;
        
        if (elt.offsetLeft)
            ///coords.x += elt.offsetLeft + parseInt(style.borderLeftWidth);
            coords.x += elt.offsetLeft + chrome.getMeasurementInPixels(elt, "borderLeft");
        if (elt.offsetTop)
            ///coords.y += elt.offsetTop + parseInt(style.borderTopWidth);
            coords.y += elt.offsetTop + chrome.getMeasurementInPixels(elt, "borderTop");

        if (p)
        {
            if (p.nodeType == 1)
                addOffset(p, coords, view);
        }
        else
        {
            var otherView = isIE ? elt.ownerDocument.parentWindow : elt.ownerDocument.defaultView;
            // IE will fail when reading the frameElement property of a popup window.
            // We don't need it anyway once it is outside the (popup) viewport, so we're
            // ignoring the frameElement check when the window is a popup
            if (!otherView.opener && otherView.frameElement)
                addOffset(otherView.frameElement, coords, otherView);
        }
    };

    var isIE = this.isIE;
    var coords = {x: 0, y: 0};
    if (elt)
    {
        var view = isIE ? elt.ownerDocument.parentWindow : elt.ownerDocument.defaultView;
        addOffset(elt, coords, view);
    }

    return coords;
};

this.getViewOffset = function(elt, singleFrame)
{
    function addOffset(elt, coords, view)
    {
        var p = elt.offsetParent;
        coords.x += elt.offsetLeft - (p ? p.scrollLeft : 0);
        coords.y += elt.offsetTop - (p ? p.scrollTop : 0);

        if (p)
        {
            if (p.nodeType == 1)
            {
                var parentStyle = view.getComputedStyle(p, "");
                if (parentStyle.position != "static")
                {
                    coords.x += parseInt(parentStyle.borderLeftWidth);
                    coords.y += parseInt(parentStyle.borderTopWidth);

                    if (p.localName == "TABLE")
                    {
                        coords.x += parseInt(parentStyle.paddingLeft);
                        coords.y += parseInt(parentStyle.paddingTop);
                    }
                    else if (p.localName == "BODY")
                    {
                        var style = view.getComputedStyle(elt, "");
                        coords.x += parseInt(style.marginLeft);
                        coords.y += parseInt(style.marginTop);
                    }
                }
                else if (p.localName == "BODY")
                {
                    coords.x += parseInt(parentStyle.borderLeftWidth);
                    coords.y += parseInt(parentStyle.borderTopWidth);
                }

                var parent = elt.parentNode;
                while (p != parent)
                {
                    coords.x -= parent.scrollLeft;
                    coords.y -= parent.scrollTop;
                    parent = parent.parentNode;
                }
                addOffset(p, coords, view);
            }
        }
        else
        {
            if (elt.localName == "BODY")
            {
                var style = view.getComputedStyle(elt, "");
                coords.x += parseInt(style.borderLeftWidth);
                coords.y += parseInt(style.borderTopWidth);

                var htmlStyle = view.getComputedStyle(elt.parentNode, "");
                coords.x -= parseInt(htmlStyle.paddingLeft);
                coords.y -= parseInt(htmlStyle.paddingTop);
            }

            if (elt.scrollLeft)
                coords.x += elt.scrollLeft;
            if (elt.scrollTop)
                coords.y += elt.scrollTop;

            var win = elt.ownerDocument.defaultView;
            if (win && (!singleFrame && win.frameElement))
                addOffset(win.frameElement, coords, win);
        }

    }

    var coords = {x: 0, y: 0};
    if (elt)
        addOffset(elt, coords, elt.ownerDocument.defaultView);

    return coords;
};

this.getLTRBWH = function(elt)
{
    var bcrect,
        dims = {"left": 0, "top": 0, "right": 0, "bottom": 0, "width": 0, "height": 0};

    if (elt)
    {
        bcrect = elt.getBoundingClientRect();
        dims.left = bcrect.left;
        dims.top = bcrect.top;
        dims.right = bcrect.right;
        dims.bottom = bcrect.bottom;

        if(bcrect.width)
        {
            dims.width = bcrect.width;
            dims.height = bcrect.height;
        }
        else
        {
            dims.width = dims.right - dims.left;
            dims.height = dims.bottom - dims.top;
        }
    }
    return dims;
};

this.applyBodyOffsets = function(elt, clientRect)
{
    var od = elt.ownerDocument;
    if (!od.body)
        return clientRect;

    var style = od.defaultView.getComputedStyle(od.body, null);

    var pos = style.getPropertyValue('position');
    if(pos === 'absolute' || pos === 'relative')
    {
        var borderLeft = parseInt(style.getPropertyValue('border-left-width').replace('px', ''),10) || 0;
        var borderTop = parseInt(style.getPropertyValue('border-top-width').replace('px', ''),10) || 0;
        var paddingLeft = parseInt(style.getPropertyValue('padding-left').replace('px', ''),10) || 0;
        var paddingTop = parseInt(style.getPropertyValue('padding-top').replace('px', ''),10) || 0;
        var marginLeft = parseInt(style.getPropertyValue('margin-left').replace('px', ''),10) || 0;
        var marginTop = parseInt(style.getPropertyValue('margin-top').replace('px', ''),10) || 0;

        var offsetX = borderLeft + paddingLeft + marginLeft;
        var offsetY = borderTop + paddingTop + marginTop;

        clientRect.left -= offsetX;
        clientRect.top -= offsetY;
        clientRect.right -= offsetX;
        clientRect.bottom -= offsetY;
    }

    return clientRect;
};

this.getOffsetSize = function(elt)
{
    return {width: elt.offsetWidth, height: elt.offsetHeight};
};

this.getOverflowParent = function(element)
{
    for (var scrollParent = element.parentNode; scrollParent; scrollParent = scrollParent.offsetParent)
    {
        if (scrollParent.scrollHeight > scrollParent.offsetHeight)
            return scrollParent;
    }
};

this.isScrolledToBottom = function(element)
{
    var onBottom = (element.scrollTop + element.offsetHeight) == element.scrollHeight;
    if (FBTrace.DBG_CONSOLE)
        FBTrace.sysout("isScrolledToBottom offsetHeight: "+element.offsetHeight +" onBottom:"+onBottom);
    return onBottom;
};

this.scrollToBottom = function(element)
{
        element.scrollTop = element.scrollHeight;

        if (FBTrace.DBG_CONSOLE)
        {
            FBTrace.sysout("scrollToBottom reset scrollTop "+element.scrollTop+" = "+element.scrollHeight);
            if (element.scrollHeight == element.offsetHeight)
                FBTrace.sysout("scrollToBottom attempt to scroll non-scrollable element "+element, element);
        }

        return (element.scrollTop == element.scrollHeight);
};

this.move = function(element, x, y)
{
    element.style.left = x + "px";
    element.style.top = y + "px";
};

this.resize = function(element, w, h)
{
    element.style.width = w + "px";
    element.style.height = h + "px";
};

this.linesIntoCenterView = function(element, scrollBox)  // {before: int, after: int}
{
    if (!scrollBox)
        scrollBox = this.getOverflowParent(element);

    if (!scrollBox)
        return;

    var offset = this.getClientOffset(element);

    var topSpace = offset.y - scrollBox.scrollTop;
    var bottomSpace = (scrollBox.scrollTop + scrollBox.clientHeight)
            - (offset.y + element.offsetHeight);

    if (topSpace < 0 || bottomSpace < 0)
    {
        var split = (scrollBox.clientHeight/2);
        var centerY = offset.y - split;
        scrollBox.scrollTop = centerY;
        topSpace = split;
        bottomSpace = split -  element.offsetHeight;
    }

    return {before: Math.round((topSpace/element.offsetHeight) + 0.5),
            after: Math.round((bottomSpace/element.offsetHeight) + 0.5) };
};

this.scrollIntoCenterView = function(element, scrollBox, notX, notY)
{
    if (!element)
        return;

    if (!scrollBox)
        scrollBox = this.getOverflowParent(element);

    if (!scrollBox)
        return;

    var offset = this.getClientOffset(element);

    if (!notY)
    {
        var topSpace = offset.y - scrollBox.scrollTop;
        var bottomSpace = (scrollBox.scrollTop + scrollBox.clientHeight)
            - (offset.y + element.offsetHeight);

        if (topSpace < 0 || bottomSpace < 0)
        {
            var centerY = offset.y - (scrollBox.clientHeight/2);
            scrollBox.scrollTop = centerY;
        }
    }

    if (!notX)
    {
        var leftSpace = offset.x - scrollBox.scrollLeft;
        var rightSpace = (scrollBox.scrollLeft + scrollBox.clientWidth)
            - (offset.x + element.clientWidth);

        if (leftSpace < 0 || rightSpace < 0)
        {
            var centerX = offset.x - (scrollBox.clientWidth/2);
            scrollBox.scrollLeft = centerX;
        }
    }
    if (FBTrace.DBG_SOURCEFILES)
        FBTrace.sysout("lib.scrollIntoCenterView ","Element:"+element.innerHTML);
};


// ************************************************************************************************
// CSS

var cssKeywordMap = null;
var cssPropNames = null;
var cssColorNames = null;
var imageRules = null;

this.getCSSKeywordsByProperty = function(propName)
{
    if (!cssKeywordMap)
    {
        cssKeywordMap = {};

        for (var name in this.cssInfo)
        {
            var list = [];

            var types = this.cssInfo[name];
            for (var i = 0; i < types.length; ++i)
            {
                var keywords = this.cssKeywords[types[i]];
                if (keywords)
                    list.push.apply(list, keywords);
            }

            cssKeywordMap[name] = list;
        }
    }

    return propName in cssKeywordMap ? cssKeywordMap[propName] : [];
};

this.getCSSPropertyNames = function()
{
    if (!cssPropNames)
    {
        cssPropNames = [];

        for (var name in this.cssInfo)
            cssPropNames.push(name);
    }

    return cssPropNames;
};

this.isColorKeyword = function(keyword)
{
    if (keyword == "transparent")
        return false;

    if (!cssColorNames)
    {
        cssColorNames = [];

        var colors = this.cssKeywords["color"];
        for (var i = 0; i < colors.length; ++i)
            cssColorNames.push(colors[i].toLowerCase());

        var systemColors = this.cssKeywords["systemColor"];
        for (var i = 0; i < systemColors.length; ++i)
            cssColorNames.push(systemColors[i].toLowerCase());
    }

    return cssColorNames.indexOf ? // Array.indexOf is not available in IE
            cssColorNames.indexOf(keyword.toLowerCase()) != -1 :
            (" " + cssColorNames.join(" ") + " ").indexOf(" " + keyword.toLowerCase() + " ") != -1;
};

this.isImageRule = function(rule)
{
    if (!imageRules)
    {
        imageRules = [];

        for (var i in this.cssInfo)
        {
            var r = i.toLowerCase();
            var suffix = "image";
            if (r.match(suffix + "$") == suffix || r == "background")
                imageRules.push(r);
        }
    }

    return imageRules.indexOf ? // Array.indexOf is not available in IE
            imageRules.indexOf(rule.toLowerCase()) != -1 :
            (" " + imageRules.join(" ") + " ").indexOf(" " + rule.toLowerCase() + " ") != -1;
};

this.copyTextStyles = function(fromNode, toNode, style)
{
    var view = this.isIE ?
            fromNode.ownerDocument.parentWindow :
            fromNode.ownerDocument.defaultView;
    
    if (view)
    {
        if (!style)
            style = this.isIE ? fromNode.currentStyle : view.getComputedStyle(fromNode, "");

        toNode.style.fontFamily = style.fontFamily;
        
        // TODO: xxxpedro need to create a FBL.getComputedStyle() because IE
        // returns wrong computed styles for inherited properties (like font-*)
        //
        // Also would be good to create a FBL.getStyle() 
        toNode.style.fontSize = style.fontSize;
        toNode.style.fontWeight = style.fontWeight;
        toNode.style.fontStyle = style.fontStyle;

        return style;
    }
};

this.copyBoxStyles = function(fromNode, toNode, style)
{
    var view = this.isIE ?
            fromNode.ownerDocument.parentWindow :
            fromNode.ownerDocument.defaultView;
    
    if (view)
    {
        if (!style)
            style = this.isIE ? fromNode.currentStyle : view.getComputedStyle(fromNode, "");

        toNode.style.marginTop = style.marginTop;
        toNode.style.marginRight = style.marginRight;
        toNode.style.marginBottom = style.marginBottom;
        toNode.style.marginLeft = style.marginLeft;
        toNode.style.borderTopWidth = style.borderTopWidth;
        toNode.style.borderRightWidth = style.borderRightWidth;
        toNode.style.borderBottomWidth = style.borderBottomWidth;
        toNode.style.borderLeftWidth = style.borderLeftWidth;

        return style;
    }
};

this.readBoxStyles = function(style)
{
    var styleNames = {
        "margin-top": "marginTop", "margin-right": "marginRight",
        "margin-left": "marginLeft", "margin-bottom": "marginBottom",
        "border-top-width": "borderTop", "border-right-width": "borderRight",
        "border-left-width": "borderLeft", "border-bottom-width": "borderBottom",
        "padding-top": "paddingTop", "padding-right": "paddingRight",
        "padding-left": "paddingLeft", "padding-bottom": "paddingBottom",
        "z-index": "zIndex"
    };

    var styles = {};
    for (var styleName in styleNames)
        styles[styleNames[styleName]] = parseInt(style.getPropertyCSSValue(styleName).cssText) || 0;
    if (FBTrace.DBG_INSPECT)
        FBTrace.sysout("readBoxStyles ", styles);
    return styles;
};

this.getBoxFromStyles = function(style, element)
{
    var args = this.readBoxStyles(style);
    args.width = element.offsetWidth
        - (args.paddingLeft+args.paddingRight+args.borderLeft+args.borderRight);
    args.height = element.offsetHeight
        - (args.paddingTop+args.paddingBottom+args.borderTop+args.borderBottom);
    return args;
};

this.getElementCSSSelector = function(element)
{
    var label = element.localName.toLowerCase();
    if (element.id)
        label += "#" + element.id;
    if (element.hasAttribute("class"))
        label += "." + element.getAttribute("class").split(" ")[0];

    return label;
};

this.getURLForStyleSheet= function(styleSheet)
{
    //http://www.w3.org/TR/DOM-Level-2-Style/stylesheets.html#StyleSheets-StyleSheet. For inline style sheets, the value of this attribute is null.
    return (styleSheet.href ? styleSheet.href : styleSheet.ownerNode.ownerDocument.URL);
};

this.getDocumentForStyleSheet = function(styleSheet)
{
    while (styleSheet.parentStyleSheet && !styleSheet.ownerNode)
    {
        styleSheet = styleSheet.parentStyleSheet;
    }
    if (styleSheet.ownerNode)
      return styleSheet.ownerNode.ownerDocument;
};

/**
 * Retrieves the instance number for a given style sheet. The instance number
 * is sheet's index within the set of all other sheets whose URL is the same.
 */
this.getInstanceForStyleSheet = function(styleSheet, ownerDocument)
{
    // System URLs are always unique (or at least we are making this assumption)
    if (FBL.isSystemStyleSheet(styleSheet))
        return 0;

    // ownerDocument is an optional hint for performance
    if (FBTrace.DBG_CSS) FBTrace.sysout("getInstanceForStyleSheet: " + styleSheet.href + " " + styleSheet.media.mediaText + " " + (styleSheet.ownerNode && FBL.getElementXPath(styleSheet.ownerNode)), ownerDocument);
    ownerDocument = ownerDocument || FBL.getDocumentForStyleSheet(styleSheet);

    var ret = 0,
        styleSheets = ownerDocument.styleSheets,
        href = styleSheet.href;
    for (var i = 0; i < styleSheets.length; i++)
    {
        var curSheet = styleSheets[i];
        if (FBTrace.DBG_CSS) FBTrace.sysout("getInstanceForStyleSheet: compare href " + i + " " + curSheet.href + " " + curSheet.media.mediaText + " " + (curSheet.ownerNode && FBL.getElementXPath(curSheet.ownerNode)));
        if (curSheet == styleSheet)
            break;
        if (curSheet.href == href)
            ret++;
    }
    return ret;
};

// ************************************************************************************************
// HTML and XML Serialization


var getElementType = this.getElementType = function(node)
{
    if (isElementXUL(node))
        return 'xul';
    else if (isElementSVG(node))
        return 'svg';
    else if (isElementMathML(node))
        return 'mathml';
    else if (isElementXHTML(node))
        return 'xhtml';
    else if (isElementHTML(node))
        return 'html';
};

var getElementSimpleType = this.getElementSimpleType = function(node)
{
    if (isElementSVG(node))
        return 'svg';
    else if (isElementMathML(node))
        return 'mathml';
    else
        return 'html';
};

var isElementHTML = this.isElementHTML = function(node)
{
    return node.nodeName == node.nodeName.toUpperCase();
};

var isElementXHTML = this.isElementXHTML = function(node)
{
    return node.nodeName == node.nodeName.toLowerCase();
};

var isElementMathML = this.isElementMathML = function(node)
{
    return node.namespaceURI == 'http://www.w3.org/1998/Math/MathML';
};

var isElementSVG = this.isElementSVG = function(node)
{
    return node.namespaceURI == 'http://www.w3.org/2000/svg';
};

var isElementXUL = this.isElementXUL = function(node)
{
    return node instanceof XULElement;
};

this.isSelfClosing = function(element)
{
    if (isElementSVG(element) || isElementMathML(element))
        return true;
    var tag = element.localName.toLowerCase();
    return (this.selfClosingTags.hasOwnProperty(tag));
};

this.getElementHTML = function(element)
{
    var self=this;
    function toHTML(elt)
    {
        if (elt.nodeType == Node.ELEMENT_NODE)
        {
            if (unwrapObject(elt).firebugIgnore)
                return;

            html.push('<', elt.nodeName.toLowerCase());

            for (var i = 0; i < elt.attributes.length; ++i)
            {
                var attr = elt.attributes[i];

                // Hide attributes set by Firebug
                if (attr.localName.indexOf("firebug-") == 0)
                    continue;

                // MathML
                if (attr.localName.indexOf("-moz-math") == 0)
                {
                    // just hide for now
                    continue;
                }

                html.push(' ', attr.nodeName, '="', escapeForElementAttribute(attr.nodeValue),'"');
            }

            if (elt.firstChild)
            {
                html.push('>');

                var pureText=true;
                for (var child = element.firstChild; child; child = child.nextSibling)
                    pureText=pureText && (child.nodeType == Node.TEXT_NODE);

                if (pureText)
                    html.push(escapeForHtmlEditor(elt.textContent));
                else {
                    for (var child = elt.firstChild; child; child = child.nextSibling)
                        toHTML(child);
                }

                html.push('</', elt.nodeName.toLowerCase(), '>');
            }
            else if (isElementSVG(elt) || isElementMathML(elt))
            {
                html.push('/>');
            }
            else if (self.isSelfClosing(elt))
            {
                html.push((isElementXHTML(elt))?'/>':'>');
            }
            else
            {
                html.push('></', elt.nodeName.toLowerCase(), '>');
            }
        }
        else if (elt.nodeType == Node.TEXT_NODE)
            html.push(escapeForTextNode(elt.textContent));
        else if (elt.nodeType == Node.CDATA_SECTION_NODE)
            html.push('<![CDATA[', elt.nodeValue, ']]>');
        else if (elt.nodeType == Node.COMMENT_NODE)
            html.push('<!--', elt.nodeValue, '-->');
    }

    var html = [];
    toHTML(element);
    return html.join("");
};

this.getElementXML = function(element)
{
    function toXML(elt)
    {
        if (elt.nodeType == Node.ELEMENT_NODE)
        {
            if (unwrapObject(elt).firebugIgnore)
                return;

            xml.push('<', elt.nodeName.toLowerCase());

            for (var i = 0; i < elt.attributes.length; ++i)
            {
                var attr = elt.attributes[i];

                // Hide attributes set by Firebug
                if (attr.localName.indexOf("firebug-") == 0)
                    continue;

                // MathML
                if (attr.localName.indexOf("-moz-math") == 0)
                {
                    // just hide for now
                    continue;
                }

                xml.push(' ', attr.nodeName, '="', escapeForElementAttribute(attr.nodeValue),'"');
            }

            if (elt.firstChild)
            {
                xml.push('>');

                for (var child = elt.firstChild; child; child = child.nextSibling)
                    toXML(child);

                xml.push('</', elt.nodeName.toLowerCase(), '>');
            }
            else
                xml.push('/>');
        }
        else if (elt.nodeType == Node.TEXT_NODE)
            xml.push(elt.nodeValue);
        else if (elt.nodeType == Node.CDATA_SECTION_NODE)
            xml.push('<![CDATA[', elt.nodeValue, ']]>');
        else if (elt.nodeType == Node.COMMENT_NODE)
            xml.push('<!--', elt.nodeValue, '-->');
    }

    var xml = [];
    toXML(element);
    return xml.join("");
};


// ************************************************************************************************
// CSS classes

this.hasClass = function(node, name) // className, className, ...
{
    // TODO: xxxpedro when lib.hasClass is called with more than 2 arguments?
    // this function can be optimized a lot if assumed 2 arguments only,
    // which seems to be what happens 99% of the time
    if (arguments.length == 2)
        return (' '+node.className+' ').indexOf(' '+name+' ') != -1;
    
    if (!node || node.nodeType != 1)
        return false;
    else
    {
        for (var i=1; i<arguments.length; ++i)
        {
            var name = arguments[i];
            var re = new RegExp("(^|\\s)"+name+"($|\\s)");
            if (!re.exec(node.className))
                return false;
        }

        return true;
    }
};

this.old_hasClass = function(node, name) // className, className, ...
{
    if (!node || node.nodeType != 1)
        return false;
    else
    {
        for (var i=1; i<arguments.length; ++i)
        {
            var name = arguments[i];
            var re = new RegExp("(^|\\s)"+name+"($|\\s)");
            if (!re.exec(node.className))
                return false;
        }

        return true;
    }
};

this.setClass = function(node, name)
{
    if (node && (' '+node.className+' ').indexOf(' '+name+' ') == -1)
    ///if (node && !this.hasClass(node, name))
        node.className += " " + name;
};

this.getClassValue = function(node, name)
{
    var re = new RegExp(name+"-([^ ]+)");
    var m = re.exec(node.className);
    return m ? m[1] : "";
};

this.removeClass = function(node, name)
{
    if (node && node.className)
    {
        var index = node.className.indexOf(name);
        if (index >= 0)
        {
            var size = name.length;
            node.className = node.className.substr(0,index-1) + node.className.substr(index+size);
        }
    }
};

this.toggleClass = function(elt, name)
{
    if ((' '+elt.className+' ').indexOf(' '+name+' ') != -1)
    ///if (this.hasClass(elt, name))
        this.removeClass(elt, name);
    else
        this.setClass(elt, name);
};

this.setClassTimed = function(elt, name, context, timeout)
{
    if (!timeout)
        timeout = 1300;

    if (elt.__setClassTimeout)
        context.clearTimeout(elt.__setClassTimeout);
    else
        this.setClass(elt, name);

    elt.__setClassTimeout = context.setTimeout(function()
    {
        delete elt.__setClassTimeout;

        FBL.removeClass(elt, name);
    }, timeout);
};

this.cancelClassTimed = function(elt, name, context)
{
    if (elt.__setClassTimeout)
    {
        FBL.removeClass(elt, name);
        context.clearTimeout(elt.__setClassTimeout);
        delete elt.__setClassTimeout;
    }
};


// ************************************************************************************************
// DOM queries

this.$ = function(id, doc)
{
    if (doc)
        return doc.getElementById(id);
    else
    {
        return FBL.Firebug.chrome.document.getElementById(id);
    }
};

this.$$ = function(selector, doc)
{
    if (doc || !FBL.Firebug.chrome)
        return FBL.Firebug.Selector(selector, doc);
    else
    {
        return FBL.Firebug.Selector(selector, FBL.Firebug.chrome.document);
    }
};

this.getChildByClass = function(node) // ,classname, classname, classname...
{
    for (var i = 1; i < arguments.length; ++i)
    {
        var className = arguments[i];
        var child = node.firstChild;
        node = null;
        for (; child; child = child.nextSibling)
        {
            if (this.hasClass(child, className))
            {
                node = child;
                break;
            }
        }
    }

    return node;
};

this.getAncestorByClass = function(node, className)
{
    for (var parent = node; parent; parent = parent.parentNode)
    {
        if (this.hasClass(parent, className))
            return parent;
    }

    return null;
};


this.getElementsByClass = function(node, className)
{
    var result = [];
    
    for (var child = node.firstChild; child; child = child.nextSibling)
    {
        if (this.hasClass(child, className))
            result.push(child);
    }

    return result;
};

this.getElementByClass = function(node, className)  // className, className, ...
{
    var args = cloneArray(arguments); args.splice(0, 1);
    for (var child = node.firstChild; child; child = child.nextSibling)
    {
        var args1 = cloneArray(args); args1.unshift(child);
        if (FBL.hasClass.apply(null, args1))
            return child;
        else
        {
            var found = FBL.getElementByClass.apply(null, args1);
            if (found)
                return found;
        }
    }

    return null;
};

this.isAncestor = function(node, potentialAncestor)
{
    for (var parent = node; parent; parent = parent.parentNode)
    {
        if (parent == potentialAncestor)
            return true;
    }

    return false;
};

this.getNextElement = function(node)
{
    while (node && node.nodeType != 1)
        node = node.nextSibling;

    return node;
};

this.getPreviousElement = function(node)
{
    while (node && node.nodeType != 1)
        node = node.previousSibling;

    return node;
};

this.getBody = function(doc)
{
    if (doc.body)
        return doc.body;

    var body = doc.getElementsByTagName("body")[0];
    if (body)
        return body;

    return doc.firstChild;  // For non-HTML docs
};

this.findNextDown = function(node, criteria)
{
    if (!node)
        return null;

    for (var child = node.firstChild; child; child = child.nextSibling)
    {
        if (criteria(child))
            return child;

        var next = this.findNextDown(child, criteria);
        if (next)
            return next;
    }
};

this.findPreviousUp = function(node, criteria)
{
    if (!node)
        return null;

    for (var child = node.lastChild; child; child = child.previousSibling)
    {
        var next = this.findPreviousUp(child, criteria);
        if (next)
            return next;

        if (criteria(child))
            return child;
    }
};

this.findNext = function(node, criteria, upOnly, maxRoot)
{
    if (!node)
        return null;

    if (!upOnly)
    {
        var next = this.findNextDown(node, criteria);
        if (next)
            return next;
    }

    for (var sib = node.nextSibling; sib; sib = sib.nextSibling)
    {
        if (criteria(sib))
            return sib;

        var next = this.findNextDown(sib, criteria);
        if (next)
            return next;
    }

    if (node.parentNode && node.parentNode != maxRoot)
        return this.findNext(node.parentNode, criteria, true);
};

this.findPrevious = function(node, criteria, downOnly, maxRoot)
{
    if (!node)
        return null;

    for (var sib = node.previousSibling; sib; sib = sib.previousSibling)
    {
        var prev = this.findPreviousUp(sib, criteria);
        if (prev)
            return prev;

        if (criteria(sib))
            return sib;
    }

    if (!downOnly)
    {
        var next = this.findPreviousUp(node, criteria);
        if (next)
            return next;
    }

    if (node.parentNode && node.parentNode != maxRoot)
    {
        if (criteria(node.parentNode))
            return node.parentNode;

        return this.findPrevious(node.parentNode, criteria, true);
    }
};

this.getNextByClass = function(root, state)
{
    var iter = function iter(node) { return node.nodeType == 1 && FBL.hasClass(node, state); };
    return this.findNext(root, iter);
};

this.getPreviousByClass = function(root, state)
{
    var iter = function iter(node) { return node.nodeType == 1 && FBL.hasClass(node, state); };
    return this.findPrevious(root, iter);
};

this.isElement = function(o)
{
    try {
        return o && this.instanceOf(o, "Element");
    }
    catch (ex) {
        return false;
    }
};


// ************************************************************************************************
// DOM Modification

// TODO: xxxpedro use doc fragments in Context API 
var appendFragment = null;

this.appendInnerHTML = function(element, html, referenceElement)
{
    // if undefined, we must convert it to null otherwise it will throw an error in IE 
    // when executing element.insertBefore(firstChild, referenceElement)
    referenceElement = referenceElement || null;
    
    var doc = element.ownerDocument;
    
    // doc.createRange not available in IE
    if (doc.createRange)
    {
        var range = doc.createRange();  // a helper object
        range.selectNodeContents(element); // the environment to interpret the html
    
        var fragment = range.createContextualFragment(html);  // parse
        var firstChild = fragment.firstChild;
        element.insertBefore(fragment, referenceElement);
    }
    else
    {
        if (!appendFragment || appendFragment.ownerDocument != doc)
            appendFragment = doc.createDocumentFragment();
        
        var div = doc.createElement("div");
        div.innerHTML = html;
        
        var firstChild = div.firstChild;
        while (div.firstChild)
            appendFragment.appendChild(div.firstChild);

        element.insertBefore(appendFragment, referenceElement);
        
        div = null;
    }
    
    return firstChild;
};


// ************************************************************************************************
// DOM creation

this.createElement = function(tagName, properties)
{
    properties = properties || {};
    var doc = properties.document || FBL.Firebug.chrome.document;
    
    var element = doc.createElement(tagName);
    
    for(var name in properties)
    {
        if (name != "document")
        {
            element[name] = properties[name];
        }
    }
    
    return element;
};

this.createGlobalElement = function(tagName, properties)
{
    properties = properties || {};
    var doc = FBL.Env.browser.document;
    
    var element = this.NS && doc.createElementNS ? 
            doc.createElementNS(FBL.NS, tagName) :
            doc.createElement(tagName); 
            
    for(var name in properties)
    {
        var propname = name;
        if (FBL.isIE && name == "class") propname = "className";
        
        if (name != "document")
        {
            element.setAttribute(propname, properties[name]);
        }
    }
    
    return element;
};

//************************************************************************************************

this.safeGetWindowLocation = function(window)
{
    try
    {
        if (window)
        {
            if (window.closed)
                return "(window.closed)";
            if ("location" in window)
                return window.location+"";
            else
                return "(no window.location)";
        }
        else
            return "(no context.window)";
    }
    catch(exc)
    {
        if (FBTrace.DBG_WINDOWS || FBTrace.DBG_ERRORS)
            FBTrace.sysout("TabContext.getWindowLocation failed "+exc, exc);
            FBTrace.sysout("TabContext.getWindowLocation failed window:", window);
        return "(getWindowLocation: "+exc+")";
    }
};

// ************************************************************************************************
// Events

this.isLeftClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 1 : // IE "click" and "dblclick" button model
            event.button == 0) && // others
        this.noKeyModifiers(event);
};

this.isMiddleClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 4 : // IE "click" and "dblclick" button model
            event.button == 1) && 
        this.noKeyModifiers(event);
};

this.isRightClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 2 : // IE "click" and "dblclick" button model
            event.button == 2) && 
        this.noKeyModifiers(event);
};

this.noKeyModifiers = function(event)
{
    return !event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;
};

this.isControlClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 1 : // IE "click" and "dblclick" button model
            event.button == 0) && 
        this.isControl(event);
};

this.isShiftClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 1 : // IE "click" and "dblclick" button model
            event.button == 0) && 
        this.isShift(event);
};

this.isControl = function(event)
{
    return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;
};

this.isAlt = function(event)
{
    return event.altKey && !event.ctrlKey && !event.shiftKey && !event.metaKey;
};

this.isAltClick = function(event)
{
    return (this.isIE && event.type != "click" && event.type != "dblclick" ? 
            event.button == 1 : // IE "click" and "dblclick" button model
            event.button == 0) && 
        this.isAlt(event);
};

this.isControlShift = function(event)
{
    return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey;
};

this.isShift = function(event)
{
    return event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
};

this.addEvent = function(object, name, handler, useCapture)
{
    if (object.addEventListener)
        object.addEventListener(name, handler, useCapture);
    else
        object.attachEvent("on"+name, handler);
};

this.removeEvent = function(object, name, handler, useCapture)
{
    try
    {
        if (object.removeEventListener)
            object.removeEventListener(name, handler, useCapture);
        else
            object.detachEvent("on"+name, handler);
    }
    catch(e)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("FBL.removeEvent error: ", object, name);
    }
};

this.cancelEvent = function(e, preventDefault)
{
    if (!e) return;
    
    if (preventDefault)
    {
                if (e.preventDefault)
                    e.preventDefault();
                else
                    e.returnValue = false;
    }
    
    if (e.stopPropagation)
        e.stopPropagation();
    else
        e.cancelBubble = true;
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.addGlobalEvent = function(name, handler)
{
    var doc = this.Firebug.browser.document;
    var frames = this.Firebug.browser.window.frames;
    
    this.addEvent(doc, name, handler);
    
    if (this.Firebug.chrome.type == "popup")
        this.addEvent(this.Firebug.chrome.document, name, handler);
  
    for (var i = 0, frame; frame = frames[i]; i++)
    {
        try
        {
            this.addEvent(frame.document, name, handler);
        }
        catch(E)
        {
            // Avoid acess denied
        }
    }
};

this.removeGlobalEvent = function(name, handler)
{
    var doc = this.Firebug.browser.document;
    var frames = this.Firebug.browser.window.frames;
    
    this.removeEvent(doc, name, handler);
    
    if (this.Firebug.chrome.type == "popup")
        this.removeEvent(this.Firebug.chrome.document, name, handler);
  
    for (var i = 0, frame; frame = frames[i]; i++)
    {
        try
        {
            this.removeEvent(frame.document, name, handler);
        }
        catch(E)
        {
            // Avoid acess denied
        }
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.dispatch = function(listeners, name, args)
{
    if (!listeners) return;
    
    try
    {/**/
        if (typeof listeners.length != "undefined")
        {
            if (FBTrace.DBG_DISPATCH) FBTrace.sysout("FBL.dispatch", name+" to "+listeners.length+" listeners");
    
            for (var i = 0; i < listeners.length; ++i)
            {
                var listener = listeners[i];
                if ( listener[name] )
                    listener[name].apply(listener, args);
            }
        }
        else
        {
            if (FBTrace.DBG_DISPATCH) FBTrace.sysout("FBL.dispatch", name+" to listeners of an object");
            
            for (var prop in listeners)
            {
                var listener = listeners[prop];
                if ( listener[name] )
                    listener[name].apply(listener, args);
            }
        }
    }
    catch (exc)
    {
        if (FBTrace.DBG_ERRORS)
        {
            FBTrace.sysout(" Exception in lib.dispatch "+ name, exc);
            //FBTrace.dumpProperties(" Exception in lib.dispatch listener", listener);
        }
    }
    /**/
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var disableTextSelectionHandler = function(event)
{
    FBL.cancelEvent(event, true);
    
    return false;
};

this.disableTextSelection = function(e)
{
    if (typeof e.onselectstart != "undefined") // IE
        this.addEvent(e, "selectstart", disableTextSelectionHandler);
        
    else // others
    {
        e.style.cssText = "user-select: none; -khtml-user-select: none; -moz-user-select: none;";
        
        // canceling the event in FF will prevent the menu popups to close when clicking over 
        // text-disabled elements
        if (!this.isFirefox) 
            this.addEvent(e, "mousedown", disableTextSelectionHandler);
    }
    
    e.style.cursor = "default";
};

this.restoreTextSelection = function(e)
{
    if (typeof e.onselectstart != "undefined") // IE
        this.removeEvent(e, "selectstart", disableTextSelectionHandler);
        
    else // others
    {
        e.style.cssText = "cursor: default;";
            
        // canceling the event in FF will prevent the menu popups to close when clicking over 
        // text-disabled elements
        if (!this.isFirefox)
            this.removeEvent(e, "mousedown", disableTextSelectionHandler);
    }
};

// ************************************************************************************************
// DOM Events

var eventTypes =
{
    composition: [
        "composition",
        "compositionstart",
        "compositionend" ],
    contextmenu: [
        "contextmenu" ],
    drag: [
        "dragenter",
        "dragover",
        "dragexit",
        "dragdrop",
        "draggesture" ],
    focus: [
        "focus",
        "blur" ],
    form: [
        "submit",
        "reset",
        "change",
        "select",
        "input" ],
    key: [
        "keydown",
        "keyup",
        "keypress" ],
    load: [
        "load",
        "beforeunload",
        "unload",
        "abort",
        "error" ],
    mouse: [
        "mousedown",
        "mouseup",
        "click",
        "dblclick",
        "mouseover",
        "mouseout",
        "mousemove" ],
    mutation: [
        "DOMSubtreeModified",
        "DOMNodeInserted",
        "DOMNodeRemoved",
        "DOMNodeRemovedFromDocument",
        "DOMNodeInsertedIntoDocument",
        "DOMAttrModified",
        "DOMCharacterDataModified" ],
    paint: [
        "paint",
        "resize",
        "scroll" ],
    scroll: [
        "overflow",
        "underflow",
        "overflowchanged" ],
    text: [
        "text" ],
    ui: [
        "DOMActivate",
        "DOMFocusIn",
        "DOMFocusOut" ],
    xul: [
        "popupshowing",
        "popupshown",
        "popuphiding",
        "popuphidden",
        "close",
        "command",
        "broadcast",
        "commandupdate" ]
};

this.getEventFamily = function(eventType)
{
    if (!this.families)
    {
        this.families = {};

        for (var family in eventTypes)
        {
            var types = eventTypes[family];
            for (var i = 0; i < types.length; ++i)
                this.families[types[i]] = family;
        }
    }

    return this.families[eventType];
};


// ************************************************************************************************
// URLs

this.getFileName = function(url)
{
    var split = this.splitURLBase(url);
    return split.name;
};

this.splitURLBase = function(url)
{
    if (this.isDataURL(url))
        return this.splitDataURL(url);
    return this.splitURLTrue(url);
};

this.splitDataURL = function(url)
{
    var mark = url.indexOf(':', 3);
    if (mark != 4)
        return false;   //  the first 5 chars must be 'data:'

    var point = url.indexOf(',', mark+1);
    if (point < mark)
        return false; // syntax error

    var props = { encodedContent: url.substr(point+1) };

    var metadataBuffer = url.substr(mark+1, point);
    var metadata = metadataBuffer.split(';');
    for (var i = 0; i < metadata.length; i++)
    {
        var nv = metadata[i].split('=');
        if (nv.length == 2)
            props[nv[0]] = nv[1];
    }

    // Additional Firebug-specific properties
    if (props.hasOwnProperty('fileName'))
    {
         var caller_URL = decodeURIComponent(props['fileName']);
         var caller_split = this.splitURLTrue(caller_URL);

        if (props.hasOwnProperty('baseLineNumber'))  // this means it's probably an eval()
        {
            props['path'] = caller_split.path;
            props['line'] = props['baseLineNumber'];
            var hint = decodeURIComponent(props['encodedContent'].substr(0,200)).replace(/\s*$/, "");
            props['name'] =  'eval->'+hint;
        }
        else
        {
            props['name'] = caller_split.name;
            props['path'] = caller_split.path;
        }
    }
    else
    {
        if (!props.hasOwnProperty('path'))
            props['path'] = "data:";
        if (!props.hasOwnProperty('name'))
            props['name'] =  decodeURIComponent(props['encodedContent'].substr(0,200)).replace(/\s*$/, "");
    }

    return props;
};

this.splitURLTrue = function(url)
{
    var m = reSplitFile.exec(url);
    if (!m)
        return {name: url, path: url};
    else if (!m[2])
        return {path: m[1], name: m[1]};
    else
        return {path: m[1], name: m[2]+m[3]};
};

this.getFileExtension = function(url)
{
    if (!url)
        return null;

    // Remove query string from the URL if any.
    var queryString = url.indexOf("?");
    if (queryString != -1)
        url = url.substr(0, queryString);

    // Now get the file extension.
    var lastDot = url.lastIndexOf(".");
    return url.substr(lastDot+1);
};

this.isSystemURL = function(url)
{
    if (!url) return true;
    if (url.length == 0) return true;
    if (url[0] == 'h') return false;
    if (url.substr(0, 9) == "resource:")
        return true;
    else if (url.substr(0, 16) == "chrome://firebug")
        return true;
    else if (url  == "XPCSafeJSObjectWrapper.cpp")
        return true;
    else if (url.substr(0, 6) == "about:")
        return true;
    else if (url.indexOf("firebug-service.js") != -1)
        return true;
    else
        return false;
};

this.isSystemPage = function(win)
{
    try
    {
        var doc = win.document;
        if (!doc)
            return false;

        // Detect pages for pretty printed XML
        if ((doc.styleSheets.length && doc.styleSheets[0].href
                == "chrome://global/content/xml/XMLPrettyPrint.css")
            || (doc.styleSheets.length > 1 && doc.styleSheets[1].href
                == "chrome://browser/skin/feeds/subscribe.css"))
            return true;

        return FBL.isSystemURL(win.location.href);
    }
    catch (exc)
    {
        // Sometimes documents just aren't ready to be manipulated here, but don't let that
        // gum up the works
        ERROR("tabWatcher.isSystemPage document not ready:"+ exc);
        return false;
    }
};

this.isSystemStyleSheet = function(sheet)
{
    var href = sheet && sheet.href;
    return href && FBL.isSystemURL(href);
};

this.getURIHost = function(uri)
{
    try
    {
        if (uri)
            return uri.host;
        else
            return "";
    }
    catch (exc)
    {
        return "";
    }
};

this.isLocalURL = function(url)
{
    if (url.substr(0, 5) == "file:")
        return true;
    else if (url.substr(0, 8) == "wyciwyg:")
        return true;
    else
        return false;
};

this.isDataURL = function(url)
{
    return (url && url.substr(0,5) == "data:");
};

this.getLocalPath = function(url)
{
    if (this.isLocalURL(url))
    {
        var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
        var file = fileHandler.getFileFromURLSpec(url);
        return file.path;
    }
};

this.getURLFromLocalFile = function(file)
{
    var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler);
    var URL = fileHandler.getURLSpecFromFile(file);
    return URL;
};

this.getDataURLForContent = function(content, url)
{
    // data:text/javascript;fileName=x%2Cy.js;baseLineNumber=10,<the-url-encoded-data>
    var uri = "data:text/html;";
    uri += "fileName="+encodeURIComponent(url)+ ",";
    uri += encodeURIComponent(content);
    return uri;
},

this.getDomain = function(url)
{
    var m = /[^:]+:\/{1,3}([^\/]+)/.exec(url);
    return m ? m[1] : "";
};

this.getURLPath = function(url)
{
    var m = /[^:]+:\/{1,3}[^\/]+(\/.*?)$/.exec(url);
    return m ? m[1] : "";
};

this.getPrettyDomain = function(url)
{
    var m = /[^:]+:\/{1,3}(www\.)?([^\/]+)/.exec(url);
    return m ? m[2] : "";
};

this.absoluteURL = function(url, baseURL)
{
    return this.absoluteURLWithDots(url, baseURL).replace("/./", "/", "g");
};

this.absoluteURLWithDots = function(url, baseURL)
{
    if (url[0] == "?")
        return baseURL + url;

    var reURL = /(([^:]+:)\/{1,2}[^\/]*)(.*?)$/;
    var m = reURL.exec(url);
    if (m)
        return url;

    var m = reURL.exec(baseURL);
    if (!m)
        return "";

    var head = m[1];
    var tail = m[3];
    if (url.substr(0, 2) == "//")
        return m[2] + url;
    else if (url[0] == "/")
    {
        return head + url;
    }
    else if (tail[tail.length-1] == "/")
        return baseURL + url;
    else
    {
        var parts = tail.split("/");
        return head + parts.slice(0, parts.length-1).join("/") + "/" + url;
    }
};

this.normalizeURL = function(url)  // this gets called a lot, any performance improvement welcome
{
    if (!url)
        return "";
    // Replace one or more characters that are not forward-slash followed by /.., by space.
    if (url.length < 255) // guard against monsters.
    {
        // Replace one or more characters that are not forward-slash followed by /.., by space.
        url = url.replace(/[^\/]+\/\.\.\//, "", "g");
        // Issue 1496, avoid #
        url = url.replace(/#.*/,"");
        // For some reason, JSDS reports file URLs like "file:/" instead of "file:///", so they
        // don't match up with the URLs we get back from the DOM
        url = url.replace(/file:\/([^\/])/g, "file:///$1");
        if (url.indexOf('chrome:')==0)
        {
            var m = reChromeCase.exec(url);  // 1 is package name, 2 is path
            if (m)
            {
                url = "chrome://"+m[1].toLowerCase()+"/"+m[2];
            }
        }
    }
    return url;
};

this.denormalizeURL = function(url)
{
    return url.replace(/file:\/\/\//g, "file:/");
};

this.parseURLParams = function(url)
{
    var q = url ? url.indexOf("?") : -1;
    if (q == -1)
        return [];

    var search = url.substr(q+1);
    var h = search.lastIndexOf("#");
    if (h != -1)
        search = search.substr(0, h);

    if (!search)
        return [];

    return this.parseURLEncodedText(search);
};

this.parseURLEncodedText = function(text)
{
    var maxValueLength = 25000;

    var params = [];

    // Unescape '+' characters that are used to encode a space.
    // See section 2.2.in RFC 3986: http://www.ietf.org/rfc/rfc3986.txt
    text = text.replace(/\+/g, " ");

    var args = text.split("&");
    for (var i = 0; i < args.length; ++i)
    {
        try {
            var parts = args[i].split("=");
            if (parts.length == 2)
            {
                if (parts[1].length > maxValueLength)
                    parts[1] = this.$STR("LargeData");

                params.push({name: decodeURIComponent(parts[0]), value: decodeURIComponent(parts[1])});
            }
            else
                params.push({name: decodeURIComponent(parts[0]), value: ""});
        }
        catch (e)
        {
            if (FBTrace.DBG_ERRORS)
            {
                FBTrace.sysout("parseURLEncodedText EXCEPTION ", e);
                FBTrace.sysout("parseURLEncodedText EXCEPTION URI", args[i]);
            }
        }
    }

    params.sort(function(a, b) { return a.name <= b.name ? -1 : 1; });

    return params;
};

// TODO: xxxpedro lib. why loops in domplate are requiring array in parameters
// as in response/request headers and get/post parameters in Net module?
this.parseURLParamsArray = function(url)
{
    var q = url ? url.indexOf("?") : -1;
    if (q == -1)
        return [];

    var search = url.substr(q+1);
    var h = search.lastIndexOf("#");
    if (h != -1)
        search = search.substr(0, h);

    if (!search)
        return [];

    return this.parseURLEncodedTextArray(search);
};

this.parseURLEncodedTextArray = function(text)
{
    var maxValueLength = 25000;

    var params = [];

    // Unescape '+' characters that are used to encode a space.
    // See section 2.2.in RFC 3986: http://www.ietf.org/rfc/rfc3986.txt
    text = text.replace(/\+/g, " ");

    var args = text.split("&");
    for (var i = 0; i < args.length; ++i)
    {
        try {
            var parts = args[i].split("=");
            if (parts.length == 2)
            {
                if (parts[1].length > maxValueLength)
                    parts[1] = this.$STR("LargeData");

                params.push({name: decodeURIComponent(parts[0]), value: [decodeURIComponent(parts[1])]});
            }
            else
                params.push({name: decodeURIComponent(parts[0]), value: [""]});
        }
        catch (e)
        {
            if (FBTrace.DBG_ERRORS)
            {
                FBTrace.sysout("parseURLEncodedText EXCEPTION ", e);
                FBTrace.sysout("parseURLEncodedText EXCEPTION URI", args[i]);
            }
        }
    }

    params.sort(function(a, b) { return a.name <= b.name ? -1 : 1; });

    return params;
};

this.reEncodeURL = function(file, text)
{
    var lines = text.split("\n");
    var params = this.parseURLEncodedText(lines[lines.length-1]);

    var args = [];
    for (var i = 0; i < params.length; ++i)
        args.push(encodeURIComponent(params[i].name)+"="+encodeURIComponent(params[i].value));

    var url = file.href;
    url += (url.indexOf("?") == -1 ? "?" : "&") + args.join("&");

    return url;
};

this.getResource = function(aURL)
{
    try
    {
        var channel=ioService.newChannel(aURL,null,null);
        var input=channel.open();
        return FBL.readFromStream(input);
    }
    catch (e)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("lib.getResource FAILS for "+aURL, e);
    }
};

this.parseJSONString = function(jsonString, originURL)
{
    // See if this is a Prototype style *-secure request.
    var regex = new RegExp(/^\/\*-secure-([\s\S]*)\*\/\s*$/);
    var matches = regex.exec(jsonString);

    if (matches)
    {
        jsonString = matches[1];

        if (jsonString[0] == "\\" && jsonString[1] == "n")
            jsonString = jsonString.substr(2);

        if (jsonString[jsonString.length-2] == "\\" && jsonString[jsonString.length-1] == "n")
            jsonString = jsonString.substr(0, jsonString.length-2);
    }

    if (jsonString.indexOf("&&&START&&&"))
    {
        regex = new RegExp(/&&&START&&& (.+) &&&END&&&/);
        matches = regex.exec(jsonString);
        if (matches)
            jsonString = matches[1];
    }

    // throw on the extra parentheses
    jsonString = "(" + jsonString + ")";

    ///var s = Components.utils.Sandbox(originURL);
    var jsonObject = null;

    try
    {
        ///jsonObject = Components.utils.evalInSandbox(jsonString, s);
        
        //jsonObject = Firebug.context.eval(jsonString);
        jsonObject = Firebug.context.evaluate(jsonString, null, null, function(){return null;});
    }
    catch(e)
    {
        /***
        if (e.message.indexOf("is not defined"))
        {
            var parts = e.message.split(" ");
            s[parts[0]] = function(str){ return str; };
            try {
                jsonObject = Components.utils.evalInSandbox(jsonString, s);
            } catch(ex) {
                if (FBTrace.DBG_ERRORS || FBTrace.DBG_JSONVIEWER)
                    FBTrace.sysout("jsonviewer.parseJSON EXCEPTION", e);
                return null;
            }
        }
        else
        {/**/
            if (FBTrace.DBG_ERRORS || FBTrace.DBG_JSONVIEWER)
                FBTrace.sysout("jsonviewer.parseJSON EXCEPTION", e);
            return null;
        ///}
    }

    return jsonObject;
};

// ************************************************************************************************

this.objectToString = function(object)
{
    try
    {
        return object+"";
    }
    catch (exc)
    {
        return null;
    }
};

// ************************************************************************************************
// Input Caret Position

this.setSelectionRange = function(input, start, length)
{
    if (input.createTextRange)
    {
        var range = input.createTextRange(); 
        range.moveStart("character", start); 
        range.moveEnd("character", length - input.value.length); 
        range.select();
    }
    else if (input.setSelectionRange)
    {
        input.setSelectionRange(start, length);
        input.focus();
    }
};

// ************************************************************************************************
// Input Selection Start / Caret Position

this.getInputSelectionStart = function(input)
{
    if (document.selection)
    {
        var range = input.ownerDocument.selection.createRange();
        var text = range.text;
        
        //console.log("range", range.text);
        
        // if there is a selection, find the start position
        if (text)
        {
            return input.value.indexOf(text);
        }
        // if there is no selection, find the caret position
        else
        {
            range.moveStart("character", -input.value.length);
            
            return range.text.length;
        }
    }
    else if (typeof input.selectionStart != "undefined")
        return input.selectionStart;
    
    return 0;
};

// ************************************************************************************************
// Opera Tab Fix

function onOperaTabBlur(e)
{
    if (this.lastKey == 9)
      this.focus();
};

function onOperaTabKeyDown(e)
{
    this.lastKey = e.keyCode;
};

function onOperaTabFocus(e)
{
    this.lastKey = null;
};

this.fixOperaTabKey = function(el)
{
    el.onfocus = onOperaTabFocus;
    el.onblur = onOperaTabBlur;
    el.onkeydown = onOperaTabKeyDown;
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.Property = function(object, name)
{
    this.object = object;
    this.name = name;

    this.getObject = function()
    {
        return object[name];
    };
};

this.ErrorCopy = function(message)
{
    this.message = message;
};

function EventCopy(event)
{
    // Because event objects are destroyed arbitrarily by Gecko, we must make a copy of them to
    // represent them long term in the inspector.
    for (var name in event)
    {
        try {
            this[name] = event[name];
        } catch (exc) { }
    }
}

this.EventCopy = EventCopy;


// ************************************************************************************************
// Type Checking

var toString = Object.prototype.toString;
var reFunction = /^\s*function(\s+[\w_$][\w\d_$]*)?\s*\(/; 

this.isArray = function(object) {
    return toString.call(object) === '[object Array]'; 
};

this.isFunction = function(object) {
    if (!object) return false;
    
    try
    {
        // FIXME: xxxpedro this is failing in IE for the global "external" object
        return toString.call(object) === "[object Function]" || 
                this.isIE && typeof object != "string" && reFunction.test(""+object);
    }
    catch (E)
    {
        FBTrace.sysout("Lib.isFunction() failed for ", object);
        return false;
    }
};
    

// ************************************************************************************************
// Instance Checking

this.instanceOf = function(object, className)
{
    if (!object || typeof object != "object")
        return false;
    
    // Try to use the native instanceof operator. We can only use it when we know
    // exactly the window where the object is located at
    if (object.ownerDocument)
    {
        // find the correct window of the object
        var win = object.ownerDocument.defaultView || object.ownerDocument.parentWindow;
        
        // if the class is accessible in the window, uses the native instanceof operator
        // if the instanceof evaluates to "true" we can assume it is a instance, but if it
        // evaluates to "false" we must continue with the duck type detection below because
        // the native object may be extended, thus breaking the instanceof result 
        // See Issue 3524: Firebug Lite Style Panel doesn't work if the native Element is extended
        if (className in win && object instanceof win[className])
            return true;
    }
    // If the object doesn't have the ownerDocument property, we'll try to look at
    // the current context's window
    else
    {
        // TODO: xxxpedro context
        // Since we're not using yet a Firebug.context, we'll just use the top window
        // (browser) as a reference
        var win = Firebug.browser.window;
        if (className in win)
            return object instanceof win[className];
    }
    
    // get the duck type model from the cache 
    var cache = instanceCheckMap[className];
    if (!cache)
        return false;

    // starts the hacky duck type detection
    for(var n in cache)
    {
        var obj = cache[n];
        var type = typeof obj;
        obj = type == "object" ? obj : [obj];
        
        for(var name in obj)
        {
            // avoid problems with extended native objects
            // See Issue 3524: Firebug Lite Style Panel doesn't work if the native Element is extended
            if (!obj.hasOwnProperty(name))
                continue;
            
            var value = obj[name];
            
            if( n == "property" && !(value in object) ||
                n == "method" && !this.isFunction(object[value]) ||
                n == "value" && (""+object[name]).toLowerCase() != (""+value).toLowerCase() )
                    return false;
        }
    }
    
    return true;
};

var instanceCheckMap = 
{
    // DuckTypeCheck:
    // {
    //     property: ["window", "document"],
    //     method: "setTimeout",
    //     value: {nodeType: 1}
    // },
    
    Window:
    {
        property: ["window", "document"],
        method: "setTimeout"
    },
    
    Document:
    {
        property: ["body", "cookie"],
        method: "getElementById"
    },
    
    Node:
    {
        property: "ownerDocument",
        method: "appendChild"
    },
    
    Element:
    {
        property: "tagName",
        value: {nodeType: 1}
    },
    
    Location:
    {
        property: ["hostname", "protocol"],
        method: "assign"
    },
    
    HTMLImageElement:
    {
        property: "useMap",
        value:
        {
            nodeType: 1,
            tagName: "img"
        }
    },
    
    HTMLAnchorElement:
    {
        property: "hreflang",
        value:
        {
            nodeType: 1,
            tagName: "a"
        }
    },
    
    HTMLInputElement:
    {
        property: "form",
        value:
        {
            nodeType: 1,
            tagName: "input"
        }
    },
    
    HTMLButtonElement:
    {
        // ?        
    },
    
    HTMLFormElement:
    {
        method: "submit",
        value:
        {
            nodeType: 1,
            tagName: "form"
        }
    },
    
    HTMLBodyElement:
    {
        
    },
    
    HTMLHtmlElement:
    {
        
    },
    
    CSSStyleRule:
    {
        property: ["selectorText", "style"]
    }
    
};


// ************************************************************************************************
// DOM Constants

/*

Problems:

  - IE does not have window.Node, window.Element, etc
  - for (var name in Node.prototype) return nothing on FF

*/


var domMemberMap2 = {};

var domMemberMap2Sandbox = null;

var getDomMemberMap2 = function(name)
{
    if (!domMemberMap2Sandbox)
    {
        var doc = Firebug.chrome.document;
        var frame = doc.createElement("iframe");
        
        frame.id = "FirebugSandbox";
        frame.style.display = "none";
        frame.src = "about:blank";
        
        doc.body.appendChild(frame);
        
        domMemberMap2Sandbox = frame.window || frame.contentWindow;
    }
    
    var props = [];
    
    //var object = domMemberMap2Sandbox[name];
    //object = object.prototype || object;
    
    var object = null;
    
    if (name == "Window")
        object = domMemberMap2Sandbox.window;
    
    else if (name == "Document")
        object = domMemberMap2Sandbox.document;
        
    else if (name == "HTMLScriptElement")
        object = domMemberMap2Sandbox.document.createElement("script");
    
    else if (name == "HTMLAnchorElement")
        object = domMemberMap2Sandbox.document.createElement("a");
    
    else if (name.indexOf("Element") != -1)
    {
        object = domMemberMap2Sandbox.document.createElement("div");
    }
    
    if (object)
    {
        //object = object.prototype || object;
        
        //props  = 'addEventListener,document,location,navigator,window'.split(',');
        
        for (var n in object)
          props.push(n);
    }
    /**/
    
    return props;
    return extendArray(props, domMemberMap[name]);
};

// xxxpedro experimental get DOM members
this.getDOMMembers = function(object)
{
    if (!domMemberCache)
    {
        FBL.domMemberCache = domMemberCache = {};
        
        for (var name in domMemberMap)
        {
            var builtins = getDomMemberMap2(name);
            var cache = domMemberCache[name] = {};
            
            /*
            if (name.indexOf("Element") != -1)
            {
                this.append(cache, this.getDOMMembers("Node"));
                this.append(cache, this.getDOMMembers("Element"));
            }
            /**/
            
            for (var i = 0; i < builtins.length; ++i)
                cache[builtins[i]] = i;
        }
    }
    
    try
    {
        if (this.instanceOf(object, "Window"))
            { return domMemberCache.Window; }
        else if (this.instanceOf(object, "Document") || this.instanceOf(object, "XMLDocument"))
            { return domMemberCache.Document; }
        else if (this.instanceOf(object, "Location"))
            { return domMemberCache.Location; }
        else if (this.instanceOf(object, "HTMLImageElement"))
            { return domMemberCache.HTMLImageElement; }
        else if (this.instanceOf(object, "HTMLAnchorElement"))
            { return domMemberCache.HTMLAnchorElement; }
        else if (this.instanceOf(object, "HTMLInputElement"))
            { return domMemberCache.HTMLInputElement; }
        else if (this.instanceOf(object, "HTMLButtonElement"))
            { return domMemberCache.HTMLButtonElement; }
        else if (this.instanceOf(object, "HTMLFormElement"))
            { return domMemberCache.HTMLFormElement; }
        else if (this.instanceOf(object, "HTMLBodyElement"))
            { return domMemberCache.HTMLBodyElement; }
        else if (this.instanceOf(object, "HTMLHtmlElement"))
            { return domMemberCache.HTMLHtmlElement; }
        else if (this.instanceOf(object, "HTMLScriptElement"))
            { return domMemberCache.HTMLScriptElement; }
        else if (this.instanceOf(object, "HTMLTableElement"))
            { return domMemberCache.HTMLTableElement; }
        else if (this.instanceOf(object, "HTMLTableRowElement"))
            { return domMemberCache.HTMLTableRowElement; }
        else if (this.instanceOf(object, "HTMLTableCellElement"))
            { return domMemberCache.HTMLTableCellElement; }
        else if (this.instanceOf(object, "HTMLIFrameElement"))
            { return domMemberCache.HTMLIFrameElement; }
        else if (this.instanceOf(object, "SVGSVGElement"))
            { return domMemberCache.SVGSVGElement; }
        else if (this.instanceOf(object, "SVGElement"))
            { return domMemberCache.SVGElement; }
        else if (this.instanceOf(object, "Element"))
            { return domMemberCache.Element; }
        else if (this.instanceOf(object, "Text") || this.instanceOf(object, "CDATASection"))
            { return domMemberCache.Text; }
        else if (this.instanceOf(object, "Attr"))
            { return domMemberCache.Attr; }
        else if (this.instanceOf(object, "Node"))
            { return domMemberCache.Node; }
        else if (this.instanceOf(object, "Event") || this.instanceOf(object, "EventCopy"))
            { return domMemberCache.Event; }
        else
            return {};
    }
    catch(E)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("lib.getDOMMembers FAILED ", E);
        
        return {};
    }
};


/*
this.getDOMMembers = function(object)
{
    if (!domMemberCache)
    {
        domMemberCache = {};
        
        for (var name in domMemberMap)
        {
            var builtins = domMemberMap[name];
            var cache = domMemberCache[name] = {};

            for (var i = 0; i < builtins.length; ++i)
                cache[builtins[i]] = i;
        }
    }
    
    try
    {
        if (this.instanceOf(object, "Window"))
            { return domMemberCache.Window; }
        else if (object instanceof Document || object instanceof XMLDocument)
            { return domMemberCache.Document; }
        else if (object instanceof Location)
            { return domMemberCache.Location; }
        else if (object instanceof HTMLImageElement)
            { return domMemberCache.HTMLImageElement; }
        else if (object instanceof HTMLAnchorElement)
            { return domMemberCache.HTMLAnchorElement; }
        else if (object instanceof HTMLInputElement)
            { return domMemberCache.HTMLInputElement; }
        else if (object instanceof HTMLButtonElement)
            { return domMemberCache.HTMLButtonElement; }
        else if (object instanceof HTMLFormElement)
            { return domMemberCache.HTMLFormElement; }
        else if (object instanceof HTMLBodyElement)
            { return domMemberCache.HTMLBodyElement; }
        else if (object instanceof HTMLHtmlElement)
            { return domMemberCache.HTMLHtmlElement; }
        else if (object instanceof HTMLScriptElement)
            { return domMemberCache.HTMLScriptElement; }
        else if (object instanceof HTMLTableElement)
            { return domMemberCache.HTMLTableElement; }
        else if (object instanceof HTMLTableRowElement)
            { return domMemberCache.HTMLTableRowElement; }
        else if (object instanceof HTMLTableCellElement)
            { return domMemberCache.HTMLTableCellElement; }
        else if (object instanceof HTMLIFrameElement)
            { return domMemberCache.HTMLIFrameElement; }
        else if (object instanceof SVGSVGElement)
            { return domMemberCache.SVGSVGElement; }
        else if (object instanceof SVGElement)
            { return domMemberCache.SVGElement; }
        else if (object instanceof Element)
            { return domMemberCache.Element; }
        else if (object instanceof Text || object instanceof CDATASection)
            { return domMemberCache.Text; }
        else if (object instanceof Attr)
            { return domMemberCache.Attr; }
        else if (object instanceof Node)
            { return domMemberCache.Node; }
        else if (object instanceof Event || object instanceof EventCopy)
            { return domMemberCache.Event; }
        else
            return {};
    }
    catch(E)
    {
        return {};
    }
};
/**/

this.isDOMMember = function(object, propName)
{
    var members = this.getDOMMembers(object);
    return members && propName in members;
};

var domMemberCache = null;
var domMemberMap = {};

domMemberMap.Window =
[
    "document",
    "frameElement",

    "innerWidth",
    "innerHeight",
    "outerWidth",
    "outerHeight",
    "screenX",
    "screenY",
    "pageXOffset",
    "pageYOffset",
    "scrollX",
    "scrollY",
    "scrollMaxX",
    "scrollMaxY",

    "status",
    "defaultStatus",

    "parent",
    "opener",
    "top",
    "window",
    "content",
    "self",

    "location",
    "history",
    "frames",
    "navigator",
    "screen",
    "menubar",
    "toolbar",
    "locationbar",
    "personalbar",
    "statusbar",
    "directories",
    "scrollbars",
    "fullScreen",
    "netscape",
    "java",
    "console",
    "Components",
    "controllers",
    "closed",
    "crypto",
    "pkcs11",

    "name",
    "property",
    "length",

    "sessionStorage",
    "globalStorage",

    "setTimeout",
    "setInterval",
    "clearTimeout",
    "clearInterval",
    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "getComputedStyle",
    "captureEvents",
    "releaseEvents",
    "routeEvent",
    "enableExternalCapture",
    "disableExternalCapture",
    "moveTo",
    "moveBy",
    "resizeTo",
    "resizeBy",
    "scroll",
    "scrollTo",
    "scrollBy",
    "scrollByLines",
    "scrollByPages",
    "sizeToContent",
    "setResizable",
    "getSelection",
    "open",
    "openDialog",
    "close",
    "alert",
    "confirm",
    "prompt",
    "dump",
    "focus",
    "blur",
    "find",
    "back",
    "forward",
    "home",
    "stop",
    "print",
    "atob",
    "btoa",
    "updateCommands",
    "XPCNativeWrapper",
    "GeckoActiveXObject",
    "applicationCache"      // FF3
];

domMemberMap.Location =
[
    "href",
    "protocol",
    "host",
    "hostname",
    "port",
    "pathname",
    "search",
    "hash",

    "assign",
    "reload",
    "replace"
];

domMemberMap.Node =
[
    "id",
    "className",

    "nodeType",
    "tagName",
    "nodeName",
    "localName",
    "prefix",
    "namespaceURI",
    "nodeValue",

    "ownerDocument",
    "parentNode",
    "offsetParent",
    "nextSibling",
    "previousSibling",
    "firstChild",
    "lastChild",
    "childNodes",
    "attributes",

    "dir",
    "baseURI",
    "textContent",
    "innerHTML",

    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "cloneNode",
    "appendChild",
    "insertBefore",
    "replaceChild",
    "removeChild",
    "compareDocumentPosition",
    "hasAttributes",
    "hasChildNodes",
    "lookupNamespaceURI",
    "lookupPrefix",
    "normalize",
    "isDefaultNamespace",
    "isEqualNode",
    "isSameNode",
    "isSupported",
    "getFeature",
    "getUserData",
    "setUserData"
];

domMemberMap.Document = extendArray(domMemberMap.Node,
[
    "documentElement",
    "body",
    "title",
    "location",
    "referrer",
    "cookie",
    "contentType",
    "lastModified",
    "characterSet",
    "inputEncoding",
    "xmlEncoding",
    "xmlStandalone",
    "xmlVersion",
    "strictErrorChecking",
    "documentURI",
    "URL",

    "defaultView",
    "doctype",
    "implementation",
    "styleSheets",
    "images",
    "links",
    "forms",
    "anchors",
    "embeds",
    "plugins",
    "applets",

    "width",
    "height",

    "designMode",
    "compatMode",
    "async",
    "preferredStylesheetSet",

    "alinkColor",
    "linkColor",
    "vlinkColor",
    "bgColor",
    "fgColor",
    "domain",

    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "captureEvents",
    "releaseEvents",
    "routeEvent",
    "clear",
    "open",
    "close",
    "execCommand",
    "execCommandShowHelp",
    "getElementsByName",
    "getSelection",
    "queryCommandEnabled",
    "queryCommandIndeterm",
    "queryCommandState",
    "queryCommandSupported",
    "queryCommandText",
    "queryCommandValue",
    "write",
    "writeln",
    "adoptNode",
    "appendChild",
    "removeChild",
    "renameNode",
    "cloneNode",
    "compareDocumentPosition",
    "createAttribute",
    "createAttributeNS",
    "createCDATASection",
    "createComment",
    "createDocumentFragment",
    "createElement",
    "createElementNS",
    "createEntityReference",
    "createEvent",
    "createExpression",
    "createNSResolver",
    "createNodeIterator",
    "createProcessingInstruction",
    "createRange",
    "createTextNode",
    "createTreeWalker",
    "domConfig",
    "evaluate",
    "evaluateFIXptr",
    "evaluateXPointer",
    "getAnonymousElementByAttribute",
    "getAnonymousNodes",
    "addBinding",
    "removeBinding",
    "getBindingParent",
    "getBoxObjectFor",
    "setBoxObjectFor",
    "getElementById",
    "getElementsByTagName",
    "getElementsByTagNameNS",
    "hasAttributes",
    "hasChildNodes",
    "importNode",
    "insertBefore",
    "isDefaultNamespace",
    "isEqualNode",
    "isSameNode",
    "isSupported",
    "load",
    "loadBindingDocument",
    "lookupNamespaceURI",
    "lookupPrefix",
    "normalize",
    "normalizeDocument",
    "getFeature",
    "getUserData",
    "setUserData"
]);

domMemberMap.Element = extendArray(domMemberMap.Node,
[
    "clientWidth",
    "clientHeight",
    "offsetLeft",
    "offsetTop",
    "offsetWidth",
    "offsetHeight",
    "scrollLeft",
    "scrollTop",
    "scrollWidth",
    "scrollHeight",

    "style",

    "tabIndex",
    "title",
    "lang",
    "align",
    "spellcheck",

    "addEventListener",
    "removeEventListener",
    "dispatchEvent",
    "focus",
    "blur",
    "cloneNode",
    "appendChild",
    "insertBefore",
    "replaceChild",
    "removeChild",
    "compareDocumentPosition",
    "getElementsByTagName",
    "getElementsByTagNameNS",
    "getAttribute",
    "getAttributeNS",
    "getAttributeNode",
    "getAttributeNodeNS",
    "setAttribute",
    "setAttributeNS",
    "setAttributeNode",
    "setAttributeNodeNS",
    "removeAttribute",
    "removeAttributeNS",
    "removeAttributeNode",
    "hasAttribute",
    "hasAttributeNS",
    "hasAttributes",
    "hasChildNodes",
    "lookupNamespaceURI",
    "lookupPrefix",
    "normalize",
    "isDefaultNamespace",
    "isEqualNode",
    "isSameNode",
    "isSupported",
    "getFeature",
    "getUserData",
    "setUserData"
]);

domMemberMap.SVGElement = extendArray(domMemberMap.Element,
[
    "x",
    "y",
    "width",
    "height",
    "rx",
    "ry",
    "transform",
    "href",

    "ownerSVGElement",
    "viewportElement",
    "farthestViewportElement",
    "nearestViewportElement",

    "getBBox",
    "getCTM",
    "getScreenCTM",
    "getTransformToElement",
    "getPresentationAttribute",
    "preserveAspectRatio"
]);

domMemberMap.SVGSVGElement = extendArray(domMemberMap.Element,
[
    "x",
    "y",
    "width",
    "height",
    "rx",
    "ry",
    "transform",

    "viewBox",
    "viewport",
    "currentView",
    "useCurrentView",
    "pixelUnitToMillimeterX",
    "pixelUnitToMillimeterY",
    "screenPixelToMillimeterX",
    "screenPixelToMillimeterY",
    "currentScale",
    "currentTranslate",
    "zoomAndPan",

    "ownerSVGElement",
    "viewportElement",
    "farthestViewportElement",
    "nearestViewportElement",
    "contentScriptType",
    "contentStyleType",

    "getBBox",
    "getCTM",
    "getScreenCTM",
    "getTransformToElement",
    "getEnclosureList",
    "getIntersectionList",
    "getViewboxToViewportTransform",
    "getPresentationAttribute",
    "getElementById",
    "checkEnclosure",
    "checkIntersection",
    "createSVGAngle",
    "createSVGLength",
    "createSVGMatrix",
    "createSVGNumber",
    "createSVGPoint",
    "createSVGRect",
    "createSVGString",
    "createSVGTransform",
    "createSVGTransformFromMatrix",
    "deSelectAll",
    "preserveAspectRatio",
    "forceRedraw",
    "suspendRedraw",
    "unsuspendRedraw",
    "unsuspendRedrawAll",
    "getCurrentTime",
    "setCurrentTime",
    "animationsPaused",
    "pauseAnimations",
    "unpauseAnimations"
]);

domMemberMap.HTMLImageElement = extendArray(domMemberMap.Element,
[
    "src",
    "naturalWidth",
    "naturalHeight",
    "width",
    "height",
    "x",
    "y",
    "name",
    "alt",
    "longDesc",
    "lowsrc",
    "border",
    "complete",
    "hspace",
    "vspace",
    "isMap",
    "useMap"
]);

domMemberMap.HTMLAnchorElement = extendArray(domMemberMap.Element,
[
    "name",
    "target",
    "accessKey",
    "href",
    "protocol",
    "host",
    "hostname",
    "port",
    "pathname",
    "search",
    "hash",
    "hreflang",
    "coords",
    "shape",
    "text",
    "type",
    "rel",
    "rev",
    "charset"
]);

domMemberMap.HTMLIFrameElement = extendArray(domMemberMap.Element,
[
    "contentDocument",
    "contentWindow",
    "frameBorder",
    "height",
    "longDesc",
    "marginHeight",
    "marginWidth",
    "name",
    "scrolling",
    "src",
    "width"
]);

domMemberMap.HTMLTableElement = extendArray(domMemberMap.Element,
[
    "bgColor",
    "border",
    "caption",
    "cellPadding",
    "cellSpacing",
    "frame",
    "rows",
    "rules",
    "summary",
    "tBodies",
    "tFoot",
    "tHead",
    "width",

    "createCaption",
    "createTFoot",
    "createTHead",
    "deleteCaption",
    "deleteRow",
    "deleteTFoot",
    "deleteTHead",
    "insertRow"
]);

domMemberMap.HTMLTableRowElement = extendArray(domMemberMap.Element,
[
    "bgColor",
    "cells",
    "ch",
    "chOff",
    "rowIndex",
    "sectionRowIndex",
    "vAlign",

    "deleteCell",
    "insertCell"
]);

domMemberMap.HTMLTableCellElement = extendArray(domMemberMap.Element,
[
    "abbr",
    "axis",
    "bgColor",
    "cellIndex",
    "ch",
    "chOff",
    "colSpan",
    "headers",
    "height",
    "noWrap",
    "rowSpan",
    "scope",
    "vAlign",
    "width"

]);

domMemberMap.HTMLScriptElement = extendArray(domMemberMap.Element,
[
    "src"
]);

domMemberMap.HTMLButtonElement = extendArray(domMemberMap.Element,
[
    "accessKey",
    "disabled",
    "form",
    "name",
    "type",
    "value",

    "click"
]);

domMemberMap.HTMLInputElement = extendArray(domMemberMap.Element,
[
    "type",
    "value",
    "checked",
    "accept",
    "accessKey",
    "alt",
    "controllers",
    "defaultChecked",
    "defaultValue",
    "disabled",
    "form",
    "maxLength",
    "name",
    "readOnly",
    "selectionEnd",
    "selectionStart",
    "size",
    "src",
    "textLength",
    "useMap",

    "click",
    "select",
    "setSelectionRange"
]);

domMemberMap.HTMLFormElement = extendArray(domMemberMap.Element,
[
    "acceptCharset",
    "action",
    "author",
    "elements",
    "encoding",
    "enctype",
    "entry_id",
    "length",
    "method",
    "name",
    "post",
    "target",
    "text",
    "url",

    "reset",
    "submit"
]);

domMemberMap.HTMLBodyElement = extendArray(domMemberMap.Element,
[
    "aLink",
    "background",
    "bgColor",
    "link",
    "text",
    "vLink"
]);

domMemberMap.HTMLHtmlElement = extendArray(domMemberMap.Element,
[
    "version"
]);

domMemberMap.Text = extendArray(domMemberMap.Node,
[
    "data",
    "length",

    "appendData",
    "deleteData",
    "insertData",
    "replaceData",
    "splitText",
    "substringData"
]);

domMemberMap.Attr = extendArray(domMemberMap.Node,
[
    "name",
    "value",
    "specified",
    "ownerElement"
]);

domMemberMap.Event =
[
    "type",
    "target",
    "currentTarget",
    "originalTarget",
    "explicitOriginalTarget",
    "relatedTarget",
    "rangeParent",
    "rangeOffset",
    "view",

    "keyCode",
    "charCode",
    "screenX",
    "screenY",
    "clientX",
    "clientY",
    "layerX",
    "layerY",
    "pageX",
    "pageY",

    "detail",
    "button",
    "which",
    "ctrlKey",
    "shiftKey",
    "altKey",
    "metaKey",

    "eventPhase",
    "timeStamp",
    "bubbles",
    "cancelable",
    "cancelBubble",

    "isTrusted",
    "isChar",

    "getPreventDefault",
    "initEvent",
    "initMouseEvent",
    "initKeyEvent",
    "initUIEvent",
    "preventBubble",
    "preventCapture",
    "preventDefault",
    "stopPropagation"
];

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.domConstantMap =
{
    "ELEMENT_NODE": 1,
    "ATTRIBUTE_NODE": 1,
    "TEXT_NODE": 1,
    "CDATA_SECTION_NODE": 1,
    "ENTITY_REFERENCE_NODE": 1,
    "ENTITY_NODE": 1,
    "PROCESSING_INSTRUCTION_NODE": 1,
    "COMMENT_NODE": 1,
    "DOCUMENT_NODE": 1,
    "DOCUMENT_TYPE_NODE": 1,
    "DOCUMENT_FRAGMENT_NODE": 1,
    "NOTATION_NODE": 1,

    "DOCUMENT_POSITION_DISCONNECTED": 1,
    "DOCUMENT_POSITION_PRECEDING": 1,
    "DOCUMENT_POSITION_FOLLOWING": 1,
    "DOCUMENT_POSITION_CONTAINS": 1,
    "DOCUMENT_POSITION_CONTAINED_BY": 1,
    "DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC": 1,

    "UNKNOWN_RULE": 1,
    "STYLE_RULE": 1,
    "CHARSET_RULE": 1,
    "IMPORT_RULE": 1,
    "MEDIA_RULE": 1,
    "FONT_FACE_RULE": 1,
    "PAGE_RULE": 1,

    "CAPTURING_PHASE": 1,
    "AT_TARGET": 1,
    "BUBBLING_PHASE": 1,

    "SCROLL_PAGE_UP": 1,
    "SCROLL_PAGE_DOWN": 1,

    "MOUSEUP": 1,
    "MOUSEDOWN": 1,
    "MOUSEOVER": 1,
    "MOUSEOUT": 1,
    "MOUSEMOVE": 1,
    "MOUSEDRAG": 1,
    "CLICK": 1,
    "DBLCLICK": 1,
    "KEYDOWN": 1,
    "KEYUP": 1,
    "KEYPRESS": 1,
    "DRAGDROP": 1,
    "FOCUS": 1,
    "BLUR": 1,
    "SELECT": 1,
    "CHANGE": 1,
    "RESET": 1,
    "SUBMIT": 1,
    "SCROLL": 1,
    "LOAD": 1,
    "UNLOAD": 1,
    "XFER_DONE": 1,
    "ABORT": 1,
    "ERROR": 1,
    "LOCATE": 1,
    "MOVE": 1,
    "RESIZE": 1,
    "FORWARD": 1,
    "HELP": 1,
    "BACK": 1,
    "TEXT": 1,

    "ALT_MASK": 1,
    "CONTROL_MASK": 1,
    "SHIFT_MASK": 1,
    "META_MASK": 1,

    "DOM_VK_TAB": 1,
    "DOM_VK_PAGE_UP": 1,
    "DOM_VK_PAGE_DOWN": 1,
    "DOM_VK_UP": 1,
    "DOM_VK_DOWN": 1,
    "DOM_VK_LEFT": 1,
    "DOM_VK_RIGHT": 1,
    "DOM_VK_CANCEL": 1,
    "DOM_VK_HELP": 1,
    "DOM_VK_BACK_SPACE": 1,
    "DOM_VK_CLEAR": 1,
    "DOM_VK_RETURN": 1,
    "DOM_VK_ENTER": 1,
    "DOM_VK_SHIFT": 1,
    "DOM_VK_CONTROL": 1,
    "DOM_VK_ALT": 1,
    "DOM_VK_PAUSE": 1,
    "DOM_VK_CAPS_LOCK": 1,
    "DOM_VK_ESCAPE": 1,
    "DOM_VK_SPACE": 1,
    "DOM_VK_END": 1,
    "DOM_VK_HOME": 1,
    "DOM_VK_PRINTSCREEN": 1,
    "DOM_VK_INSERT": 1,
    "DOM_VK_DELETE": 1,
    "DOM_VK_0": 1,
    "DOM_VK_1": 1,
    "DOM_VK_2": 1,
    "DOM_VK_3": 1,
    "DOM_VK_4": 1,
    "DOM_VK_5": 1,
    "DOM_VK_6": 1,
    "DOM_VK_7": 1,
    "DOM_VK_8": 1,
    "DOM_VK_9": 1,
    "DOM_VK_SEMICOLON": 1,
    "DOM_VK_EQUALS": 1,
    "DOM_VK_A": 1,
    "DOM_VK_B": 1,
    "DOM_VK_C": 1,
    "DOM_VK_D": 1,
    "DOM_VK_E": 1,
    "DOM_VK_F": 1,
    "DOM_VK_G": 1,
    "DOM_VK_H": 1,
    "DOM_VK_I": 1,
    "DOM_VK_J": 1,
    "DOM_VK_K": 1,
    "DOM_VK_L": 1,
    "DOM_VK_M": 1,
    "DOM_VK_N": 1,
    "DOM_VK_O": 1,
    "DOM_VK_P": 1,
    "DOM_VK_Q": 1,
    "DOM_VK_R": 1,
    "DOM_VK_S": 1,
    "DOM_VK_T": 1,
    "DOM_VK_U": 1,
    "DOM_VK_V": 1,
    "DOM_VK_W": 1,
    "DOM_VK_X": 1,
    "DOM_VK_Y": 1,
    "DOM_VK_Z": 1,
    "DOM_VK_CONTEXT_MENU": 1,
    "DOM_VK_NUMPAD0": 1,
    "DOM_VK_NUMPAD1": 1,
    "DOM_VK_NUMPAD2": 1,
    "DOM_VK_NUMPAD3": 1,
    "DOM_VK_NUMPAD4": 1,
    "DOM_VK_NUMPAD5": 1,
    "DOM_VK_NUMPAD6": 1,
    "DOM_VK_NUMPAD7": 1,
    "DOM_VK_NUMPAD8": 1,
    "DOM_VK_NUMPAD9": 1,
    "DOM_VK_MULTIPLY": 1,
    "DOM_VK_ADD": 1,
    "DOM_VK_SEPARATOR": 1,
    "DOM_VK_SUBTRACT": 1,
    "DOM_VK_DECIMAL": 1,
    "DOM_VK_DIVIDE": 1,
    "DOM_VK_F1": 1,
    "DOM_VK_F2": 1,
    "DOM_VK_F3": 1,
    "DOM_VK_F4": 1,
    "DOM_VK_F5": 1,
    "DOM_VK_F6": 1,
    "DOM_VK_F7": 1,
    "DOM_VK_F8": 1,
    "DOM_VK_F9": 1,
    "DOM_VK_F10": 1,
    "DOM_VK_F11": 1,
    "DOM_VK_F12": 1,
    "DOM_VK_F13": 1,
    "DOM_VK_F14": 1,
    "DOM_VK_F15": 1,
    "DOM_VK_F16": 1,
    "DOM_VK_F17": 1,
    "DOM_VK_F18": 1,
    "DOM_VK_F19": 1,
    "DOM_VK_F20": 1,
    "DOM_VK_F21": 1,
    "DOM_VK_F22": 1,
    "DOM_VK_F23": 1,
    "DOM_VK_F24": 1,
    "DOM_VK_NUM_LOCK": 1,
    "DOM_VK_SCROLL_LOCK": 1,
    "DOM_VK_COMMA": 1,
    "DOM_VK_PERIOD": 1,
    "DOM_VK_SLASH": 1,
    "DOM_VK_BACK_QUOTE": 1,
    "DOM_VK_OPEN_BRACKET": 1,
    "DOM_VK_BACK_SLASH": 1,
    "DOM_VK_CLOSE_BRACKET": 1,
    "DOM_VK_QUOTE": 1,
    "DOM_VK_META": 1,

    "SVG_ZOOMANDPAN_DISABLE": 1,
    "SVG_ZOOMANDPAN_MAGNIFY": 1,
    "SVG_ZOOMANDPAN_UNKNOWN": 1
};

this.cssInfo =
{
    "background": ["bgRepeat", "bgAttachment", "bgPosition", "color", "systemColor", "none"],
    "background-attachment": ["bgAttachment"],
    "background-color": ["color", "systemColor"],
    "background-image": ["none"],
    "background-position": ["bgPosition"],
    "background-repeat": ["bgRepeat"],

    "border": ["borderStyle", "thickness", "color", "systemColor", "none"],
    "border-top": ["borderStyle", "borderCollapse", "color", "systemColor", "none"],
    "border-right": ["borderStyle", "borderCollapse", "color", "systemColor", "none"],
    "border-bottom": ["borderStyle", "borderCollapse", "color", "systemColor", "none"],
    "border-left": ["borderStyle", "borderCollapse", "color", "systemColor", "none"],
    "border-collapse": ["borderCollapse"],
    "border-color": ["color", "systemColor"],
    "border-top-color": ["color", "systemColor"],
    "border-right-color": ["color", "systemColor"],
    "border-bottom-color": ["color", "systemColor"],
    "border-left-color": ["color", "systemColor"],
    "border-spacing": [],
    "border-style": ["borderStyle"],
    "border-top-style": ["borderStyle"],
    "border-right-style": ["borderStyle"],
    "border-bottom-style": ["borderStyle"],
    "border-left-style": ["borderStyle"],
    "border-width": ["thickness"],
    "border-top-width": ["thickness"],
    "border-right-width": ["thickness"],
    "border-bottom-width": ["thickness"],
    "border-left-width": ["thickness"],

    "bottom": ["auto"],
    "caption-side": ["captionSide"],
    "clear": ["clear", "none"],
    "clip": ["auto"],
    "color": ["color", "systemColor"],
    "content": ["content"],
    "counter-increment": ["none"],
    "counter-reset": ["none"],
    "cursor": ["cursor", "none"],
    "direction": ["direction"],
    "display": ["display", "none"],
    "empty-cells": [],
    "float": ["float", "none"],
    "font": ["fontStyle", "fontVariant", "fontWeight", "fontFamily"],

    "font-family": ["fontFamily"],
    "font-size": ["fontSize"],
    "font-size-adjust": [],
    "font-stretch": [],
    "font-style": ["fontStyle"],
    "font-variant": ["fontVariant"],
    "font-weight": ["fontWeight"],

    "height": ["auto"],
    "left": ["auto"],
    "letter-spacing": [],
    "line-height": [],

    "list-style": ["listStyleType", "listStylePosition", "none"],
    "list-style-image": ["none"],
    "list-style-position": ["listStylePosition"],
    "list-style-type": ["listStyleType", "none"],

    "margin": [],
    "margin-top": [],
    "margin-right": [],
    "margin-bottom": [],
    "margin-left": [],

    "marker-offset": ["auto"],
    "min-height": ["none"],
    "max-height": ["none"],
    "min-width": ["none"],
    "max-width": ["none"],

    "outline": ["borderStyle", "color", "systemColor", "none"],
    "outline-color": ["color", "systemColor"],
    "outline-style": ["borderStyle"],
    "outline-width": [],

    "overflow": ["overflow", "auto"],
    "overflow-x": ["overflow", "auto"],
    "overflow-y": ["overflow", "auto"],

    "padding": [],
    "padding-top": [],
    "padding-right": [],
    "padding-bottom": [],
    "padding-left": [],

    "position": ["position"],
    "quotes": ["none"],
    "right": ["auto"],
    "table-layout": ["tableLayout", "auto"],
    "text-align": ["textAlign"],
    "text-decoration": ["textDecoration", "none"],
    "text-indent": [],
    "text-shadow": [],
    "text-transform": ["textTransform", "none"],
    "top": ["auto"],
    "unicode-bidi": [],
    "vertical-align": ["verticalAlign"],
    "white-space": ["whiteSpace"],
    "width": ["auto"],
    "word-spacing": [],
    "z-index": [],

    "-moz-appearance": ["mozAppearance"],
    "-moz-border-radius": [],
    "-moz-border-radius-bottomleft": [],
    "-moz-border-radius-bottomright": [],
    "-moz-border-radius-topleft": [],
    "-moz-border-radius-topright": [],
    "-moz-border-top-colors": ["color", "systemColor"],
    "-moz-border-right-colors": ["color", "systemColor"],
    "-moz-border-bottom-colors": ["color", "systemColor"],
    "-moz-border-left-colors": ["color", "systemColor"],
    "-moz-box-align": ["mozBoxAlign"],
    "-moz-box-direction": ["mozBoxDirection"],
    "-moz-box-flex": [],
    "-moz-box-ordinal-group": [],
    "-moz-box-orient": ["mozBoxOrient"],
    "-moz-box-pack": ["mozBoxPack"],
    "-moz-box-sizing": ["mozBoxSizing"],
    "-moz-opacity": [],
    "-moz-user-focus": ["userFocus", "none"],
    "-moz-user-input": ["userInput"],
    "-moz-user-modify": [],
    "-moz-user-select": ["userSelect", "none"],
    "-moz-background-clip": [],
    "-moz-background-inline-policy": [],
    "-moz-background-origin": [],
    "-moz-binding": [],
    "-moz-column-count": [],
    "-moz-column-gap": [],
    "-moz-column-width": [],
    "-moz-image-region": []
};

this.inheritedStyleNames =
{
    "border-collapse": 1,
    "border-spacing": 1,
    "border-style": 1,
    "caption-side": 1,
    "color": 1,
    "cursor": 1,
    "direction": 1,
    "empty-cells": 1,
    "font": 1,
    "font-family": 1,
    "font-size-adjust": 1,
    "font-size": 1,
    "font-style": 1,
    "font-variant": 1,
    "font-weight": 1,
    "letter-spacing": 1,
    "line-height": 1,
    "list-style": 1,
    "list-style-image": 1,
    "list-style-position": 1,
    "list-style-type": 1,
    "quotes": 1,
    "text-align": 1,
    "text-decoration": 1,
    "text-indent": 1,
    "text-shadow": 1,
    "text-transform": 1,
    "white-space": 1,
    "word-spacing": 1
};

this.cssKeywords =
{
    "appearance":
    [
        "button",
        "button-small",
        "checkbox",
        "checkbox-container",
        "checkbox-small",
        "dialog",
        "listbox",
        "menuitem",
        "menulist",
        "menulist-button",
        "menulist-textfield",
        "menupopup",
        "progressbar",
        "radio",
        "radio-container",
        "radio-small",
        "resizer",
        "scrollbar",
        "scrollbarbutton-down",
        "scrollbarbutton-left",
        "scrollbarbutton-right",
        "scrollbarbutton-up",
        "scrollbartrack-horizontal",
        "scrollbartrack-vertical",
        "separator",
        "statusbar",
        "tab",
        "tab-left-edge",
        "tabpanels",
        "textfield",
        "toolbar",
        "toolbarbutton",
        "toolbox",
        "tooltip",
        "treeheadercell",
        "treeheadersortarrow",
        "treeitem",
        "treetwisty",
        "treetwistyopen",
        "treeview",
        "window"
    ],

    "systemColor":
    [
        "ActiveBorder",
        "ActiveCaption",
        "AppWorkspace",
        "Background",
        "ButtonFace",
        "ButtonHighlight",
        "ButtonShadow",
        "ButtonText",
        "CaptionText",
        "GrayText",
        "Highlight",
        "HighlightText",
        "InactiveBorder",
        "InactiveCaption",
        "InactiveCaptionText",
        "InfoBackground",
        "InfoText",
        "Menu",
        "MenuText",
        "Scrollbar",
        "ThreeDDarkShadow",
        "ThreeDFace",
        "ThreeDHighlight",
        "ThreeDLightShadow",
        "ThreeDShadow",
        "Window",
        "WindowFrame",
        "WindowText",
        "-moz-field",
        "-moz-fieldtext",
        "-moz-workspace",
        "-moz-visitedhyperlinktext",
        "-moz-use-text-color"
    ],

    "color":
    [
        "AliceBlue",
        "AntiqueWhite",
        "Aqua",
        "Aquamarine",
        "Azure",
        "Beige",
        "Bisque",
        "Black",
        "BlanchedAlmond",
        "Blue",
        "BlueViolet",
        "Brown",
        "BurlyWood",
        "CadetBlue",
        "Chartreuse",
        "Chocolate",
        "Coral",
        "CornflowerBlue",
        "Cornsilk",
        "Crimson",
        "Cyan",
        "DarkBlue",
        "DarkCyan",
        "DarkGoldenRod",
        "DarkGray",
        "DarkGreen",
        "DarkKhaki",
        "DarkMagenta",
        "DarkOliveGreen",
        "DarkOrange",
        "DarkOrchid",
        "DarkRed",
        "DarkSalmon",
        "DarkSeaGreen",
        "DarkSlateBlue",
        "DarkSlateGray",
        "DarkTurquoise",
        "DarkViolet",
        "DeepPink",
        "DarkSkyBlue",
        "DimGray",
        "DodgerBlue",
        "Feldspar",
        "FireBrick",
        "FloralWhite",
        "ForestGreen",
        "Fuchsia",
        "Gainsboro",
        "GhostWhite",
        "Gold",
        "GoldenRod",
        "Gray",
        "Green",
        "GreenYellow",
        "HoneyDew",
        "HotPink",
        "IndianRed",
        "Indigo",
        "Ivory",
        "Khaki",
        "Lavender",
        "LavenderBlush",
        "LawnGreen",
        "LemonChiffon",
        "LightBlue",
        "LightCoral",
        "LightCyan",
        "LightGoldenRodYellow",
        "LightGrey",
        "LightGreen",
        "LightPink",
        "LightSalmon",
        "LightSeaGreen",
        "LightSkyBlue",
        "LightSlateBlue",
        "LightSlateGray",
        "LightSteelBlue",
        "LightYellow",
        "Lime",
        "LimeGreen",
        "Linen",
        "Magenta",
        "Maroon",
        "MediumAquaMarine",
        "MediumBlue",
        "MediumOrchid",
        "MediumPurple",
        "MediumSeaGreen",
        "MediumSlateBlue",
        "MediumSpringGreen",
        "MediumTurquoise",
        "MediumVioletRed",
        "MidnightBlue",
        "MintCream",
        "MistyRose",
        "Moccasin",
        "NavajoWhite",
        "Navy",
        "OldLace",
        "Olive",
        "OliveDrab",
        "Orange",
        "OrangeRed",
        "Orchid",
        "PaleGoldenRod",
        "PaleGreen",
        "PaleTurquoise",
        "PaleVioletRed",
        "PapayaWhip",
        "PeachPuff",
        "Peru",
        "Pink",
        "Plum",
        "PowderBlue",
        "Purple",
        "Red",
        "RosyBrown",
        "RoyalBlue",
        "SaddleBrown",
        "Salmon",
        "SandyBrown",
        "SeaGreen",
        "SeaShell",
        "Sienna",
        "Silver",
        "SkyBlue",
        "SlateBlue",
        "SlateGray",
        "Snow",
        "SpringGreen",
        "SteelBlue",
        "Tan",
        "Teal",
        "Thistle",
        "Tomato",
        "Turquoise",
        "Violet",
        "VioletRed",
        "Wheat",
        "White",
        "WhiteSmoke",
        "Yellow",
        "YellowGreen",
        "transparent",
        "invert"
    ],

    "auto":
    [
        "auto"
    ],

    "none":
    [
        "none"
    ],

    "captionSide":
    [
        "top",
        "bottom",
        "left",
        "right"
    ],

    "clear":
    [
        "left",
        "right",
        "both"
    ],

    "cursor":
    [
        "auto",
        "cell",
        "context-menu",
        "crosshair",
        "default",
        "help",
        "pointer",
        "progress",
        "move",
        "e-resize",
        "all-scroll",
        "ne-resize",
        "nw-resize",
        "n-resize",
        "se-resize",
        "sw-resize",
        "s-resize",
        "w-resize",
        "ew-resize",
        "ns-resize",
        "nesw-resize",
        "nwse-resize",
        "col-resize",
        "row-resize",
        "text",
        "vertical-text",
        "wait",
        "alias",
        "copy",
        "move",
        "no-drop",
        "not-allowed",
        "-moz-alias",
        "-moz-cell",
        "-moz-copy",
        "-moz-grab",
        "-moz-grabbing",
        "-moz-contextmenu",
        "-moz-zoom-in",
        "-moz-zoom-out",
        "-moz-spinning"
    ],

    "direction":
    [
        "ltr",
        "rtl"
    ],

    "bgAttachment":
    [
        "scroll",
        "fixed"
    ],

    "bgPosition":
    [
        "top",
        "center",
        "bottom",
        "left",
        "right"
    ],

    "bgRepeat":
    [
        "repeat",
        "repeat-x",
        "repeat-y",
        "no-repeat"
    ],

    "borderStyle":
    [
        "hidden",
        "dotted",
        "dashed",
        "solid",
        "double",
        "groove",
        "ridge",
        "inset",
        "outset",
        "-moz-bg-inset",
        "-moz-bg-outset",
        "-moz-bg-solid"
    ],

    "borderCollapse":
    [
        "collapse",
        "separate"
    ],

    "overflow":
    [
        "visible",
        "hidden",
        "scroll",
        "-moz-scrollbars-horizontal",
        "-moz-scrollbars-none",
        "-moz-scrollbars-vertical"
    ],

    "listStyleType":
    [
        "disc",
        "circle",
        "square",
        "decimal",
        "decimal-leading-zero",
        "lower-roman",
        "upper-roman",
        "lower-greek",
        "lower-alpha",
        "lower-latin",
        "upper-alpha",
        "upper-latin",
        "hebrew",
        "armenian",
        "georgian",
        "cjk-ideographic",
        "hiragana",
        "katakana",
        "hiragana-iroha",
        "katakana-iroha",
        "inherit"
    ],

    "listStylePosition":
    [
        "inside",
        "outside"
    ],

    "content":
    [
        "open-quote",
        "close-quote",
        "no-open-quote",
        "no-close-quote",
        "inherit"
    ],

    "fontStyle":
    [
        "normal",
        "italic",
        "oblique",
        "inherit"
    ],

    "fontVariant":
    [
        "normal",
        "small-caps",
        "inherit"
    ],

    "fontWeight":
    [
        "normal",
        "bold",
        "bolder",
        "lighter",
        "inherit"
    ],

    "fontSize":
    [
        "xx-small",
        "x-small",
        "small",
        "medium",
        "large",
        "x-large",
        "xx-large",
        "smaller",
        "larger"
    ],

    "fontFamily":
    [
        "Arial",
        "Comic Sans MS",
        "Georgia",
        "Tahoma",
        "Verdana",
        "Times New Roman",
        "Trebuchet MS",
        "Lucida Grande",
        "Helvetica",
        "serif",
        "sans-serif",
        "cursive",
        "fantasy",
        "monospace",
        "caption",
        "icon",
        "menu",
        "message-box",
        "small-caption",
        "status-bar",
        "inherit"
    ],

    "display":
    [
        "block",
        "inline",
        "inline-block",
        "list-item",
        "marker",
        "run-in",
        "compact",
        "table",
        "inline-table",
        "table-row-group",
        "table-column",
        "table-column-group",
        "table-header-group",
        "table-footer-group",
        "table-row",
        "table-cell",
        "table-caption",
        "-moz-box",
        "-moz-compact",
        "-moz-deck",
        "-moz-grid",
        "-moz-grid-group",
        "-moz-grid-line",
        "-moz-groupbox",
        "-moz-inline-block",
        "-moz-inline-box",
        "-moz-inline-grid",
        "-moz-inline-stack",
        "-moz-inline-table",
        "-moz-marker",
        "-moz-popup",
        "-moz-runin",
        "-moz-stack"
    ],

    "position":
    [
        "static",
        "relative",
        "absolute",
        "fixed",
        "inherit"
    ],

    "float":
    [
        "left",
        "right"
    ],

    "textAlign":
    [
        "left",
        "right",
        "center",
        "justify"
    ],

    "tableLayout":
    [
        "fixed"
    ],

    "textDecoration":
    [
        "underline",
        "overline",
        "line-through",
        "blink"
    ],

    "textTransform":
    [
        "capitalize",
        "lowercase",
        "uppercase",
        "inherit"
    ],

    "unicodeBidi":
    [
        "normal",
        "embed",
        "bidi-override"
    ],

    "whiteSpace":
    [
        "normal",
        "pre",
        "nowrap"
    ],

    "verticalAlign":
    [
        "baseline",
        "sub",
        "super",
        "top",
        "text-top",
        "middle",
        "bottom",
        "text-bottom",
        "inherit"
    ],

    "thickness":
    [
        "thin",
        "medium",
        "thick"
    ],

    "userFocus":
    [
        "ignore",
        "normal"
    ],

    "userInput":
    [
        "disabled",
        "enabled"
    ],

    "userSelect":
    [
        "normal"
    ],

    "mozBoxSizing":
    [
        "content-box",
        "padding-box",
        "border-box"
    ],

    "mozBoxAlign":
    [
        "start",
        "center",
        "end",
        "baseline",
        "stretch"
    ],

    "mozBoxDirection":
    [
        "normal",
        "reverse"
    ],

    "mozBoxOrient":
    [
        "horizontal",
        "vertical"
    ],

    "mozBoxPack":
    [
        "start",
        "center",
        "end"
    ]
};

this.nonEditableTags =
{
    "HTML": 1,
    "HEAD": 1,
    "html": 1,
    "head": 1
};

this.innerEditableTags =
{
    "BODY": 1,
    "body": 1
};

this.selfClosingTags =
{ // End tags for void elements are forbidden http://wiki.whatwg.org/wiki/HTML_vs._XHTML
    "meta": 1,
    "link": 1,
    "area": 1,
    "base": 1,
    "col": 1,
    "input": 1,
    "img": 1,
    "br": 1,
    "hr": 1,
    "param":1,
    "embed":1
};

var invisibleTags = this.invisibleTags =
{
    "HTML": 1,
    "HEAD": 1,
    "TITLE": 1,
    "META": 1,
    "LINK": 1,
    "STYLE": 1,
    "SCRIPT": 1,
    "NOSCRIPT": 1,
    "BR": 1,
    "PARAM": 1,
    "COL": 1,

    "html": 1,
    "head": 1,
    "title": 1,
    "meta": 1,
    "link": 1,
    "style": 1,
    "script": 1,
    "noscript": 1,
    "br": 1,
    "param": 1,
    "col": 1
    /*
    "window": 1,
    "browser": 1,
    "frame": 1,
    "tabbrowser": 1,
    "WINDOW": 1,
    "BROWSER": 1,
    "FRAME": 1,
    "TABBROWSER": 1,
    */
};


if (typeof KeyEvent == "undefined") {
    this.KeyEvent = {
        DOM_VK_CANCEL: 3,
        DOM_VK_HELP: 6,
        DOM_VK_BACK_SPACE: 8,
        DOM_VK_TAB: 9,
        DOM_VK_CLEAR: 12,
        DOM_VK_RETURN: 13,
        DOM_VK_ENTER: 14,
        DOM_VK_SHIFT: 16,
        DOM_VK_CONTROL: 17,
        DOM_VK_ALT: 18,
        DOM_VK_PAUSE: 19,
        DOM_VK_CAPS_LOCK: 20,
        DOM_VK_ESCAPE: 27,
        DOM_VK_SPACE: 32,
        DOM_VK_PAGE_UP: 33,
        DOM_VK_PAGE_DOWN: 34,
        DOM_VK_END: 35,
        DOM_VK_HOME: 36,
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        DOM_VK_PRINTSCREEN: 44,
        DOM_VK_INSERT: 45,
        DOM_VK_DELETE: 46,
        DOM_VK_0: 48,
        DOM_VK_1: 49,
        DOM_VK_2: 50,
        DOM_VK_3: 51,
        DOM_VK_4: 52,
        DOM_VK_5: 53,
        DOM_VK_6: 54,
        DOM_VK_7: 55,
        DOM_VK_8: 56,
        DOM_VK_9: 57,
        DOM_VK_SEMICOLON: 59,
        DOM_VK_EQUALS: 61,
        DOM_VK_A: 65,
        DOM_VK_B: 66,
        DOM_VK_C: 67,
        DOM_VK_D: 68,
        DOM_VK_E: 69,
        DOM_VK_F: 70,
        DOM_VK_G: 71,
        DOM_VK_H: 72,
        DOM_VK_I: 73,
        DOM_VK_J: 74,
        DOM_VK_K: 75,
        DOM_VK_L: 76,
        DOM_VK_M: 77,
        DOM_VK_N: 78,
        DOM_VK_O: 79,
        DOM_VK_P: 80,
        DOM_VK_Q: 81,
        DOM_VK_R: 82,
        DOM_VK_S: 83,
        DOM_VK_T: 84,
        DOM_VK_U: 85,
        DOM_VK_V: 86,
        DOM_VK_W: 87,
        DOM_VK_X: 88,
        DOM_VK_Y: 89,
        DOM_VK_Z: 90,
        DOM_VK_CONTEXT_MENU: 93,
        DOM_VK_NUMPAD0: 96,
        DOM_VK_NUMPAD1: 97,
        DOM_VK_NUMPAD2: 98,
        DOM_VK_NUMPAD3: 99,
        DOM_VK_NUMPAD4: 100,
        DOM_VK_NUMPAD5: 101,
        DOM_VK_NUMPAD6: 102,
        DOM_VK_NUMPAD7: 103,
        DOM_VK_NUMPAD8: 104,
        DOM_VK_NUMPAD9: 105,
        DOM_VK_MULTIPLY: 106,
        DOM_VK_ADD: 107,
        DOM_VK_SEPARATOR: 108,
        DOM_VK_SUBTRACT: 109,
        DOM_VK_DECIMAL: 110,
        DOM_VK_DIVIDE: 111,
        DOM_VK_F1: 112,
        DOM_VK_F2: 113,
        DOM_VK_F3: 114,
        DOM_VK_F4: 115,
        DOM_VK_F5: 116,
        DOM_VK_F6: 117,
        DOM_VK_F7: 118,
        DOM_VK_F8: 119,
        DOM_VK_F9: 120,
        DOM_VK_F10: 121,
        DOM_VK_F11: 122,
        DOM_VK_F12: 123,
        DOM_VK_F13: 124,
        DOM_VK_F14: 125,
        DOM_VK_F15: 126,
        DOM_VK_F16: 127,
        DOM_VK_F17: 128,
        DOM_VK_F18: 129,
        DOM_VK_F19: 130,
        DOM_VK_F20: 131,
        DOM_VK_F21: 132,
        DOM_VK_F22: 133,
        DOM_VK_F23: 134,
        DOM_VK_F24: 135,
        DOM_VK_NUM_LOCK: 144,
        DOM_VK_SCROLL_LOCK: 145,
        DOM_VK_COMMA: 188,
        DOM_VK_PERIOD: 190,
        DOM_VK_SLASH: 191,
        DOM_VK_BACK_QUOTE: 192,
        DOM_VK_OPEN_BRACKET: 219,
        DOM_VK_BACK_SLASH: 220,
        DOM_VK_CLOSE_BRACKET: 221,
        DOM_VK_QUOTE: 222,
        DOM_VK_META: 224
    };
}


// ************************************************************************************************
// Ajax

/**
 * @namespace
 */
this.Ajax =
{
  
    requests: [],
    transport: null,
    states: ["Uninitialized","Loading","Loaded","Interactive","Complete"],
  
    initialize: function()
    {
        this.transport = FBL.getNativeXHRObject();
    },
    
    getXHRObject: function()
    {
        var xhrObj = false;
        try
        {
            xhrObj = new XMLHttpRequest();
        }
        catch(e)
        {
            var progid = [
                    "MSXML2.XMLHTTP.5.0", "MSXML2.XMLHTTP.4.0", 
                    "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"
                ];
              
            for ( var i=0; i < progid.length; ++i ) {
                try
                {
                    xhrObj = new ActiveXObject(progid[i]);
                }
                catch(e)
                {
                    continue;
                }
                break;
            }
        }
        finally
        {
            return xhrObj;
        }
    },
    
    
    /**
     * Create a AJAX request.
     * 
     * @name request
     * @param {Object}   options               request options
     * @param {String}   options.url           URL to be requested
     * @param {String}   options.type          Request type ("get" ou "post"). Default is "get".
     * @param {Boolean}  options.async         Asynchronous flag. Default is "true".   
     * @param {String}   options.dataType      Data type ("text", "html", "xml" or "json"). Default is "text".
     * @param {String}   options.contentType   Content-type of the data being sent. Default is "application/x-www-form-urlencoded".  
     * @param {Function} options.onLoading     onLoading callback
     * @param {Function} options.onLoaded      onLoaded callback
     * @param {Function} options.onInteractive onInteractive callback
     * @param {Function} options.onComplete    onComplete callback
     * @param {Function} options.onUpdate      onUpdate callback
     * @param {Function} options.onSuccess     onSuccess callback
     * @param {Function} options.onFailure     onFailure callback
     */      
    request: function(options)
    {
        // process options
        var o = FBL.extend(
                {
                    // default values
                    type: "get",
                    async: true,
                    dataType: "text",
                    contentType: "application/x-www-form-urlencoded"
                }, 
                options || {}
            );
    
        this.requests.push(o);
    
        var s = this.getState();
        if (s == "Uninitialized" || s == "Complete" || s == "Loaded") 
            this.sendRequest();
    },
    
    serialize: function(data)
    {
        var r = [""], rl = 0;
        if (data) {
            if (typeof data == "string")  r[rl++] = data;
              
            else if (data.innerHTML && data.elements) {
                for (var i=0,el,l=(el=data.elements).length; i < l; i++)
                    if (el[i].name) {
                        r[rl++] = encodeURIComponent(el[i].name); 
                        r[rl++] = "=";
                        r[rl++] = encodeURIComponent(el[i].value);
                        r[rl++] = "&";
                    }
                    
            } else 
                for(var param in data) {
                    r[rl++] = encodeURIComponent(param); 
                    r[rl++] = "=";
                    r[rl++] = encodeURIComponent(data[param]);
                    r[rl++] = "&";
                }
        }
        return r.join("").replace(/&$/, "");
    },
  
    sendRequest: function()
    {
        var t = FBL.Ajax.transport, r = FBL.Ajax.requests.shift(), data;
    
        // open XHR object
        t.open(r.type, r.url, r.async);
    
        //setRequestHeaders();
    
        // indicates that it is a XHR request to the server
        t.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    
        // if data is being sent, sets the appropriate content-type
        if (data = FBL.Ajax.serialize(r.data))
            t.setRequestHeader("Content-Type", r.contentType);
    
        /** @ignore */
        // onreadystatechange handler
        t.onreadystatechange = function()
        { 
            FBL.Ajax.onStateChange(r); 
        }; 
    
        // send the request
        t.send(data);
    },
  
    /**
     * Handles the state change
     */     
    onStateChange: function(options)
    {
        var fn, o = options, t = this.transport;
        var state = this.getState(t); 
    
        if (fn = o["on" + state]) fn(this.getResponse(o), o);
    
        if (state == "Complete")
        {
            var success = t.status == 200, response = this.getResponse(o);
      
            if (fn = o["onUpdate"])
              fn(response, o);
      
            if (fn = o["on" + (success ? "Success" : "Failure")])
              fn(response, o);
      
            t.onreadystatechange = FBL.emptyFn;
      
            if (this.requests.length > 0) 
                setTimeout(this.sendRequest, 10);
        }
    },
  
    /**
     * gets the appropriate response value according the type
     */
    getResponse: function(options)
    {
        var t = this.transport, type = options.dataType;
    
        if      (t.status != 200) return t.statusText;
        else if (type == "text")  return t.responseText;
        else if (type == "html")  return t.responseText;
        else if (type == "xml")   return t.responseXML;
        else if (type == "json")  return eval("(" + t.responseText + ")");
    },
  
    /**
     * returns the current state of the XHR object
     */     
    getState: function()
    {
        return this.states[this.transport.readyState];
    }
  
};


// ************************************************************************************************
// Cookie, from http://www.quirksmode.org/js/cookies.html

this.createCookie = function(name,value,days)
{
    if ('cookie' in document)
    {
        if (days)
        {
            var date = new Date();
            date.setTime(date.getTime()+(days*24*60*60*1000));
            var expires = "; expires="+date.toGMTString();
        }
        else 
            var expires = "";
        
        document.cookie = name+"="+value+expires+"; path=/";
    }
};

this.readCookie = function (name)
{
    if ('cookie' in document)
    {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        
        for(var i=0; i < ca.length; i++)
        {
            var c = ca[i];
            while (c.charAt(0)==' ') c = c.substring(1,c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
        }
    }
    
    return null;
};

this.removeCookie = function(name)
{
    this.createCookie(name, "", -1);
};


// ************************************************************************************************
// http://www.mister-pixel.com/#Content__state=is_that_simple
var fixIE6BackgroundImageCache = function(doc)
{
    doc = doc || document;
    try
    {
        doc.execCommand("BackgroundImageCache", false, true);
    } 
    catch(E)
    {
        
    }
};

// ************************************************************************************************
// calculatePixelsPerInch

var resetStyle = "margin:0; padding:0; border:0; position:absolute; overflow:hidden; display:block;";

var calculatePixelsPerInch = function calculatePixelsPerInch(doc, body)
{
    var inch = FBL.createGlobalElement("div");
    inch.style.cssText = resetStyle + "width:1in; height:1in; position:absolute; top:-1234px; left:-1234px;";
    body.appendChild(inch);
    
    FBL.pixelsPerInch = {
        x: inch.offsetWidth,
        y: inch.offsetHeight
    };
    
    body.removeChild(inch);
};


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.SourceLink = function(url, line, type, object, instance)
{
    this.href = url;
    this.instance = instance;
    this.line = line;
    this.type = type;
    this.object = object;
};

this.SourceLink.prototype =
{
    toString: function()
    {
        return this.href;
    },
    toJSON: function() // until 3.1...
    {
        return "{\"href\":\""+this.href+"\", "+
            (this.line?("\"line\":"+this.line+","):"")+
            (this.type?(" \"type\":\""+this.type+"\","):"")+
                    "}";
    }

};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.SourceText = function(lines, owner)
{
    this.lines = lines;
    this.owner = owner;
};

this.SourceText.getLineAsHTML = function(lineNo)
{
    return escapeForSourceLine(this.lines[lineNo-1]);
};


// ************************************************************************************************
}).apply(FBL);