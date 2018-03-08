/* See license.txt for terms of usage */

(function(){
// ************************************************************************************************

// TODO: plugin problem with Dev panel
// TODO: Dev panel doesn't work in persistent mode
// TODO: XHR listener breaks Firebug in Chrome when in persistent mode 

// Firebug Lite is already running in persistent mode so we just quit
// TODO: better detection
if (window.Firebug)
    return;

// ************************************************************************************************

var bookmarkletMode = true;

var bookmarkletSkinURL = "https://getfirebug.com/releases/lite/latest/skin/xp/"; // stable
//var bookmarkletSkinURL = "https://getfirebug.com/releases/lite/beta/skin/xp/"; // beta
//var bookmarkletSkinURL = "http://fbug.googlecode.com/svn/lite/branches/firebug1.3/skin/xp/"; // developer
//var bookmarkletSkinURL = "chrome-extension://bmagokdooijbeehmkpknfglimnifench/skin/xp/"; // chrome extension
//var bookmarkletSkinURL = "chrome-extension://mdaojmoeahmmokaflgbannaopagamgoj/skin/xp/"; // chrome beta extension

// ************************************************************************************************

//window.FBL = {}; // force exposure in IE global namespace
window.FBDev =
{
    // ********************************************************************************************
    modules:
    [ 
        // ****************************************************************************************
        // Application Core
        
        "lite/lib.js",
        "lite/i18n.js",
        "lite/firebug.js",
        
        "lite/gui.js",        
        "lite/context.js",
        "lite/chrome.js",
        "lite/chromeSkin.js",
        
        // firebug1.4 experimental
        //"lite/temp/chrome2.js",
        //"firebug/tabContext.js",
        //"firebug/tabWatcher.js",
        
        
        // ****************************************************************************************
        // Lite Core
        
        "lite/lite.js",
        "lite/lite/cache.js",
        "lite/lite/proxy.js",
        "lite/lite/style.js",
        "lite/lite/script.js", // experimental
        "lite/lite/browser.js", // experimental
        
        "lite/store/json.js",
        "lite/store/store.js",
        
        // ****************************************************************************************
        // Firebug Classes
        
        "lite/selector.js",
        "lite/inspector.js",
        
        "firebug/domplate.js",
        "firebug/reps.js",        
        "firebug/editor.js",
        
        // ****************************************************************************************
        // XHR Watcher
        
        "lite/xhr.js",
        "firebug/net.js",
        "firebug/spy.js",
        
        "firebug/jsonViewer.js",
        "firebug/xmlViewer.js",
        
        // ****************************************************************************************
        // Console / CommandLine core
        
        "firebug/console.js",
        "firebug/consoleInjector.js",
        
        "lite/commandLine.js",
        
        // ****************************************************************************************
        // Simple HTML Panel
        
        "lite/html.js",
        
        // ****************************************************************************************
        // Advanced HTML Panel (experimental)
        
        //"firebug/insideOutBox.js", // HTML experimental        
        //"firebug/lib/htmlLib.js", // HTML experimental
        //"lite/temp/html3.js", // HTML experimental
        //"lite/temp/html2.js", // HTML experimental
        
        "firebug/infotip.js",
        
        // ****************************************************************************************
        // CSS Panel
        
        "lite/css/cssParser.js",
        "lite/css/cssAnalyzer.js",
        "firebug/css.js",
        
        // ****************************************************************************************
        // Simple Script Panel
        
        "lite/script.js",
        
        // ****************************************************************************************
        // Script Panel
        
        //"firebug/sourceCache.js", // experimental
        //"firebug/sourceFile.js", // experimental
        //"firebug/sourceBox.js", // experimental
        //"firebug/debugger.js", // experimental
        
        //"lite/eventDelegator.js", // experimental

        "firebug/dom.js",
        
        // ****************************************************************************************
        // Trace Module/Panel
        
        "lite/trace.js",
        "lite/tracePanel.js",
        
        // ****************************************************************************************
        // Firediff
        
        /*
        "firediff/content/firediff/versionCompat.js",
        "firediff/content/firediff/diff.js",
        "firediff/content/firediff/path.js",
        "firediff/content/firediff/cssModel.js",
        "firediff/content/firediff/events.js",
        "firediff/content/firediff/domEvents.js",
        "firediff/content/firediff/cssEvents.js",
        "firediff/content/firediff/domplate.js",
        "firediff/content/firediff/search.js",
        "firediff/content/firediff/pages.js",
        "firediff/content/firediff/diffModule.js",
        "firediff/content/firediff/diffMonitor.js",
        */
        
        // ****************************************************************************************
        // FireRainbow
        
        /*
        "firerainbow/chrome/content/codemirror.js",
        "firerainbow/chrome/content/firerainbow.js",
        */

        // ****************************************************************************************
        // Example Plugin
        
        //"lite/example/helloWorld.js",
        
        // ****************************************************************************************
        // Plugin Interface
        
        "lite/plugin.js", // must be the last module loaded
        
        // ****************************************************************************************
        // Bootstrap
        "lite/boot.js"
    ],
    // ********************************************************************************************

    loadChromeApplication: function(chrome)
    {
        loadModules(chrome.document); return;
        
        FBDev.buildSource(function(source){
            var doc = chrome.document;
            var script = doc.createElement("script");
            doc.getElementsByTagName("head")[0].appendChild(script);
            script.text = source;
        });
    },

    panelBuild: function() {
        var panel = this.getPanel();
        panel.updateOutput("Building Source...");
        
        setTimeout(function(){
            FBDev.buildFullSource(function(source){
                panel.updateOutput(source);
            });
        },0);
    },
    
    panelBuildSkin: function()
    {
        var panel = this.getPanel();
        panel.updateOutput("Building Source...");
        
        setTimeout(function(){
            FBDev.buildSkin(function(source){
                panel.updateOutput(source);
            });
        },0);
    },
    
    build: function() {
        var out = document.createElement("textarea");
        
        FBDev.buildFullSource(function(source){
            out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
            //out.appendChild(document.createTextNode(source));
            
            out.value = source;
            document.body.appendChild(out);
        });
    },
    
    buildFullSource: function(callback)
    {
        var useClosure = true;
        var source = [];
        
        // remove the boot.js from the list of modules to be included
        // because it will be generated bellow
        var modules = FBDev.modules.slice(0,FBDev.modules.length-1);
        var last = modules.length-1;
        
        if (useClosure)
            source.push("(function(){\n\n");
        
        var htmlUrl = skinURL + "firebug.html",
            cssUrl = skinURL + "firebug.css",
            html,
            css,
            injected;
        
        FBL.Ajax.request({
            url: htmlUrl, 
            onComplete:function(r)
            {
                html = FBDev.compressHTML(r);
            }
        });

        FBL.Ajax.request({
            url: cssUrl, 
            onComplete:function(r)
            {
                css = FBDev.compressCSS(r);
                injected = 
                    "\n\nFBL.ns(function() { with (FBL) {\n" +
                    "// ************************************************************************************************\n\n" +
                    "FirebugChrome.Skin = \n" +
                    "{\n" +
                    "    CSS: '" + css + "',\n" +
                    "    HTML: '" + html + "'\n" +
                    "};\n\n" +
                    "// ************************************************************************************************\n" +
                    "}});\n\n" +
                    "// ************************************************************************************************\n" +
                    
                    // this is the bootstrap.js file
                    "FBL.initialize();\n" +
                    
                    "// ************************************************************************************************\n";
            }
        });
        
        for (var i=0, module; module=modules[i]; i++)
        {
            var moduleURL = sourceURL + module;
            
            if (module.indexOf("chromeSkin") != -1) continue;
            
            FBL.Ajax.request({
                url: moduleURL, 
                i: i, 
                onComplete: function(r,o)
                {
                    source.push(r);
                    
                    if (o.i == last)
                    {
                        //alert("ok")
                        source.push(injected);
                        
                        if (useClosure)
                            source.push("\n})();");

                        callback(source.join(""));
                    }
                    else
                        source.push("\n\n");
                }
            });
        }
    },
    
    buildSource: function(callback)
    {
        var useClosure = true;
        var source = [];
        var last = FBDev.modules.length-1;
        
        if (useClosure)
            source.push("(function(){\n\n");
    
        for (var i=0, module; module=FBDev.modules[i]; i++)
        {
            var moduleURL = sourceURL + module;
            
            FBL.Ajax.request({url: moduleURL, i: i, onComplete: function(r,o)
                {
                    source.push(r);
                    
                    if (o.i == last)
                    {
                        if (useClosure)
                            source.push("\n})();");

                        callback(source.join(""));
                    }
                    else
                        source.push("\n\n");
                }
            });
        }        
    },
    
    buildSkin: function(callback)
    {
        var htmlUrl = skinURL + "firebug.html",
            cssUrl = skinURL + "firebug.css",
            html,
            css,
            injected;
        
        FBL.Ajax.request({
            url: htmlUrl, 
            onComplete:function(r)
            {
                html = FBDev.compressHTML(r);
            }
        });

        FBL.Ajax.request({
            url: cssUrl, 
            onComplete:function(r)
            {
                css = FBDev.compressCSS(r);
                injected = 
                    "/* See license.txt for terms of usage */\n\n" +
                    "FBL.ns(function() { with (FBL) {\n" +
                    "// ************************************************************************************************\n\n" +
                    "FirebugChrome.Skin = \n" +
                    "{\n" +
                    "    HTML: '" + html + "',\n" +
                    "    CSS: '" + css + "'\n" +
                    "};\n\n" +
                    "// ************************************************************************************************\n" +
                    "}});";
                
                callback(injected);
            }
        });
    },
    
    compressSkinHTML: function()
    {
        var url = skinURL + "firebug.html";
        
        var out = document.createElement("textarea");
        
        FBL.Ajax.request({url: url, onComplete:function(r)
            {
                var result = FBDev.compressHTML(r);
                
                out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                out.appendChild(document.createTextNode(result));
                document.body.appendChild(out);
            }
        });
    },
    
    compressSkinCSS: function()
    {
        var url = skinURL + "firebug.css";
        
        var out = document.createElement("textarea");
        
        FBL.Ajax.request({url: url, onComplete:function(r)
            {
                var result = FBDev.compressCSS(r);
                
                out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%;";
                out.appendChild(document.createTextNode(result));
                document.body.appendChild(out);
            }
        });
        
    },
    
    compressHTML: function(html)
    {
        var reHTMLComment = /(<!--([^-]|-(?!->))*-->)/g;
        
        return html.replace(/^[\s\S]*<\s*body.*>\s*|\s*<\s*\/body.*>[\s\S]*$/gm, "").
            replace(reHTMLComment, "").
            replace(/\s\s/gm, "").
            replace(/\s+</gm, "<").
            replace(/<\s+/gm, "<").
            replace(/\s+>/gm, ">").
            replace(/>\s+/gm, ">").
            replace(/\s+\/>/gm, "/>");
    },

    compressCSS: function(css)
    {
        var reComment = /(\/\/.*)\n/g;
        var reMultiComment = /(\/\*([^\*]|\*(?!\/))*\*\/)/g;

        return css.replace(reComment, "").
            replace(reMultiComment, "").
            replace(/url\(/gi, "url("+publishedURL).
            replace(/\s\s/gm, "").
            replace(/\s+\{/gm, "{").
            replace(/\{\s+/gm, "{").
            replace(/\s+\}/gm, "}").
            replace(/\}\s+/gm, "}").
            replace(/\s+\:/gm, ":").            
            replace(/\:\s+/gm, ":").            
            replace(/,\s+/gm, ",");            
    },
    
    getPanel: function()
    {
        return Firebug.chrome.getPanel("Dev");
    }
};

// ************************************************************************************************

function findLocation() 
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
                    scriptSrc = si.getAttribute("firebugSrc");
                
                else if (file = reFirebugFile.exec(si.src))
                    scriptSrc = si.src;
                
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

    var m = path.match(/([^\/]+)\/$/);
    
    if (path && m)
    {
        sourceURL = path;
        baseURL = path.substr(0, path.length - m[1].length - 1);
        skinURL = baseURL + "skin/xp/";
        fullURL = path + fileName;
    }
    else
    {
        throw "Firebug error: Library path not found";
    }
};

// ************************************************************************************************

function loadModules(doc) {
    
    findLocation();
    
    publishedURL = bookmarkletMode ? bookmarkletSkinURL : skinURL;
    
    var sufix = isApplicationContext ? "#app" : "";
    
    // FF4 will also load it asynchronously
    var useDocWrite = true;
    //var useDocWrite = isIE || isSafari;
    
    var moduleURL, script;
    var scriptTags = [];
    
    /*
    if (top != window)
    {
        var xhr = getXHRObject();
        var html = "";
        for (var i=0, module; module=FBDev.modules[i]; i++)
        {
            var moduleURL = sourceURL + module + sufix;
            
            xhr.open("get", moduleURL, false);
            xhr.send();
            html = xhr.responseText;
            
            script = doc.createElement("script");
            script.text = html;
            doc.getElementsByTagName("head")[0].appendChild(script);
        }
        return;
    }
    /**/

    // new module loader
    
    var length = FBDev.modules.length;
    var loadModule = function(index){
        if (index == length) return;
    
        var module = FBDev.modules[index];
        var moduleURL = sourceURL + module + sufix;
        var script = doc.createElement("script");
        script.src = moduleURL;
        
        script.onload = function() { 
            if ( !script.onloadDone ) {
                script.onloadDone = true; 
                loadModule(index+1); 
            }
        };
        script.onreadystatechange = function() { 
            if ( ( "loaded" === script.readyState || "complete" === script.readyState ) && !script.onloadDone ) {
                script.onloadDone = true; 
                loadModule(index+1);
            }
        };
        
        doc.getElementsByTagName("head")[0].appendChild(script);
    };
    loadModule(0);
    /**/

    /*
    for (var i=0, module; module=FBDev.modules[i]; i++)
    {
        var moduleURL = sourceURL + module + sufix;
        
        if(useDocWrite)
        {
            scriptTags.push("<script src='", moduleURL, "'><\/script>");
        }
        else
        {
            script = doc.createElement("script");
            script.src = moduleURL;
            
            doc.getElementsByTagName("head")[0].appendChild(script);
            //doc.getElementsByTagName("body")[0].appendChild(script);
        }
    }
    
    if(useDocWrite)
    {
        doc.write(scriptTags.join(""));
    }
    /**/
    
    waitFirebugLoad();
};

var waitFirebugLoad = function()
{
    if (window && "Firebug" in window)
    {
        try
        {
            loadDevPanel();
        }
        catch (E)
        {
        }
    }
    else
        setTimeout(waitFirebugLoad, 0);
};

// ************************************************************************************************

var loadDevPanel = function() { with(FBL) { 

    // ********************************************************************************************
    // FBTrace Panel
    
    function DevPanel(){};
    
    DevPanel.prototype = extend(Firebug.Panel,
    {
        name: "Dev",
        title: "Dev",
        
        options: {
            hasToolButtons: true,
            innerHTMLSync: true
        },
        
        create: function(){
            Firebug.Panel.create.apply(this, arguments);
            
            var doc = Firebug.chrome.document;
            var out = doc.createElement("textarea");
            out.id = "fbDevOutput";
            out.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; padding: 0;";
            
            this.panelNode.appendChild(out);
            this.outputNode = out;
            
            this.buildSourceButton = new Button({
                caption: "Build Source",
                title: "Build full source code",
                owner: FBDev,
                onClick: FBDev.panelBuild
            });
            
            this.buildSkinButton = new Button({
                caption: "Build Skin",
                title: "Build skin source code",
                owner: FBDev,
                onClick: FBDev.panelBuildSkin
            });
            
            this.selfDebugButton = new Button({
                caption: "Self debug",
                title: "Run Firebug Lite inside Firebug Lite",
                owner: FBDev,
                onClick: function()
                {
                    //Firebug.chrome.window.location = "javascript:(function(F,i,r,e,b,u,g,L,I,T,E){if(F.getElementById(b))return;E=F[i+'NS']&&F.documentElement.namespaceURI;E=E?F[i+'NS'](E,'script'):F[i]('script');E[r]('id',b);E[r]('src',I+g+T);E[r](b,u);(F[e]('head')[0]||F[e]('body')[0]).appendChild(E);E=new Image;E[r]('src',I+L);})(document,'createElement','setAttribute','getElementsByTagName','FirebugLite','4','content/firebug-lite-dev.js','skin/xp/sprite.png','" +
                    //    FBL.Env.Location.baseDir + "','#startOpened');";
                    Firebug.chrome.eval( "(function(F,i,r,e,b,u,g,L,I,T,E){if(F.getElementById(b))return;E=F[i+'NS']&&F.documentElement.namespaceURI;E=E?F[i+'NS'](E,'script'):F[i]('script');E[r]('id',b);E[r]('src',I+g+T);E[r](b,u);(F[e]('head')[0]||F[e]('body')[0]).appendChild(E);E=new Image;E[r]('src',I+L);})(document,'createElement','setAttribute','getElementsByTagName','FirebugLite','4','build/firebug-lite-debug.js','skin/xp/sprite.png','" +
                        FBL.Env.Location.baseDir + "','#startOpened,startInNewWindow,showIconWhenHidden=false');" );
                    
                    Firebug.chrome.eval( "setTimeout(function(){console.info('Have fun!')},2000)" );
                }
            });
            
            
        },
        
        updateOutput: function(output)
        {
            var doc = Firebug.chrome.document;
            
            if (isIE)
                this.outputNode.innerText = output;
            else
                this.outputNode.textContent = output;
        },
        
        initialize: function(){
            Firebug.Panel.initialize.apply(this, arguments);
            
            this.containerNode.style.overflow = "hidden";
            this.outputNode = this.panelNode.firstChild;                
            
            this.buildSourceButton.initialize();
            this.buildSkinButton.initialize();
            this.selfDebugButton.initialize();
        },
        
        shutdown: function()
        {
            this.containerNode.style.overflow = "";
        }
        
    });
    
    // ********************************************************************************************
    Firebug.registerPanel(DevPanel);
}};

// ************************************************************************************************

var getXHRObject = function()
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
};

// ************************************************************************************************
var publishedURL = "";
var baseURL = "";
var sourceURL = "";
var skinURL = "";
var fullURL = "";
var isApplicationContext = false;

var isFirefox = navigator.userAgent.indexOf("Firefox") != -1;
var isIE = navigator.userAgent.indexOf("MSIE") != -1;
var isOpera = navigator.userAgent.indexOf("Opera") != -1;
var isSafari = navigator.userAgent.indexOf("AppleWebKit") != -1;

loadModules(document);
// ************************************************************************************************


// ************************************************************************************************
})();