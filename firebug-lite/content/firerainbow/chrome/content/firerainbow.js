FBL.ns(function() {
    with (FBL) {
    
Firebug.uiListeners = [];
var extensions = [];
append(Firebug, {
    registerExtension: function()  // TODO remove
    {
        extensions.push.apply(extensions, arguments);

        for (var i = 0; i < arguments.length; ++i)
            TabWatcher.addListener(arguments[i]);

        for (var j = 0; j < arguments.length; j++)
            Firebug.uiListeners.push(arguments[j]);
    },

    unregisterExtension: function()  // TODO remove
    {
        for (var i = 0; i < arguments.length; ++i)
        {
            TabWatcher.removeListener(arguments[i]);
            remove(Firebug.uiListeners, arguments[i]);
            remove(extensions, arguments[i])
        }
    }
});


        // some people reported that rainbow was initialised twice
        // see http://getsatisfaction.com/xrefresh/topics/too_many_recursions_problem_with_rainbow
        // this is a hack how to prevent it
        if (!FBL.rainbowInitialised) {
            FBL.rainbowInitialised = true;
            
            var rainbowPrefService = {getService:function(){}};
            var Components = {};
            
            var MAX_LINE_LENGTH = 500;

            var Cc = {};
            var Ci = {};

            // test for feature added in r686 (http://code.google.com/p/fbug/source/detail?r=686)
            // note: previous rainbow did break firebug without this test
            var cssPanelAvailable = !!Firebug.CSSStyleSheetPanel;
            if (!cssPanelAvailable) {
                var consoleService = Cc['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
                consoleService.logStringMessage("FireRainbow requires Firebug 1.3+ (your have "+Firebug.getVersion()+").");
                consoleService.logStringMessage('Please update your Firebug extension to the latest version (http://getfirebug.com).');
            } else {
//                 const nsIPrefBranch = Ci.nsIPrefBranch;
//                 const nsIPrefBranch2 = Ci.nsIPrefBranch2;
// 
//                 const rainbowPrefService = Cc["@mozilla.org/preferences-service;1"];
//                 const rainbowPrefs = rainbowPrefService.getService(nsIPrefBranch2);
// 
//                 const rainbowWebsite = "http://firerainbow.binaryage.com";
//                 const rainbowPrefDomain = "extensions.rainbow";

                var currentCodeVersion = 2;

                if (Firebug.TraceModule) {
                    Firebug.TraceModule.DBG_FIRERAINBOW = false;
                    var type = rainbowPrefs.getPrefType('extensions.firebug.DBG_FIRERAINBOW');
                    if (type!=nsIPrefBranch.PREF_BOOL) try {
                        rainbowPrefs.setBoolPref('extensions.firebug.DBG_FIRERAINBOW', false);
                    } catch(e) {}
                }

                var dbg = function() {
                    if (FBTrace && FBTrace.DBG_FIRERAINBOW) { 
                        FBTrace.sysout.apply(this, arguments);
                    }
                };
                
                var buildToken = function(style, val) {
                    return '<span class="' + style + '">' + escapeForSourceLine(val) + '</span>';
                };
                
                var processTokenStream = function(stream) {
                    // stream is array of pairs
                    // apply coloring to the line
                    var pieces = [];
                    for(var i=0; i<stream.length; i++) {
                        var token = stream[i];
                        pieces.push(buildToken(token[0], token[1]));
                    }
                    
                    var output = pieces.join('').replace(/\n/g, '');
                    // if the pref says so, replace tabs by corresponding number of spaces.
                    if (Firebug.replaceTabs > 0) {
                        var space = new Array(Firebug.replaceTabs + 1).join(" ");
                        output = output.replace(/\t/g, space);
                    }
                    
                    return output;
                };

                ////////////////////////////////////////////////////////////////////////
                // Firebug.FireRainbowExtension
                //
                Firebug.FireRainbowExtension = extend(Firebug.Extension, {
                    // this is called whenever script viewport is about to be rendered
                    onApplyDecorator: function(sourceBox) {
                        // patch sourcebox render functionality
                        if (!sourceBox.rainbowPatched) {
                            sourceBox.rainbowPatched = true;
                            
                            if (sourceBox.getLineAsHTML) { // Firebug 1.3 and 1.4 path
                                // 1. I use Firebug.Extension.onApplyDecorator mechanism to get called
                                // for every sourceBox which is about be displayed
                                // 2. first time a source box is seen, I patch sourceBox.getLineAsHTML
                                // with my "slightly smarter" version
                                // 3. for given sourceBox I trigger "daemon process", which starts
                                // coloring off-screen buffer of all lines (not just visible ones) =>
                                // sourceBox.colorizedLines
                                // 
                                // Every time Firebug needs to render lines, it calls getLineAsHTML on
                                // sourceBox, so it calls my version of that function and I return
                                // colorized line in case I have it ready.
                                // 
                                // Note: In the case daemon just crossed actual viewport, I'm trying to
                                // force source panel to refresh it's content calling
                                // scriptPanel.reView(sourceBox);.
                                // This is tricky, because reView has implemented several layers of
                                // caching, continuously being added with newer versions, which makes my
                                // life harder :-)
                                // If anyone knows better a function to call, I would be happy to make
                                // this more robust.
                                if (!sourceBox._rainbowOriginalGetLineAsHTML) {
                                    sourceBox._rainbowOriginalGetLineAsHTML = sourceBox.getLineAsHTML;
                                    sourceBox.getLineAsHTML = function(lineNo) {
                                        if (this.colorizedLines) {
                                            var line = this.colorizedLines[lineNo];
                                            if (line!==undefined) return line;
                                        }
                                        return this._rainbowOriginalGetLineAsHTML(lineNo);
                                    };
                                }
                            }
                            
                            if (sourceBox.decorator) { // Firebug 1.5 path
                                // here I patch getLineHTML and using similar technique like for Firebug 1.3 and 1.4
                                // when firebug needs to render lines it asks getLineHTML to provide HTML version of every line
                                // this is quite fast and reasonably smooth when scrolling
                                
                                // Note: In Firebug 1.5 call to scriptPanel.reView(sourceBox, true) invalidates cache, so it is guaranteed to redraw the view
                                if (!sourceBox.decorator._rainbowOriginalGetLineHTML) {
                                    sourceBox.decorator._rainbowOriginalGetLineHTML = sourceBox.decorator.getLineHTML;
                                    sourceBox.decorator.getLineHTML = function(sourceBox, lineNo) {
                                        if (sourceBox.colorizedLines) {
                                            var line = sourceBox.colorizedLines[lineNo-1];
                                            if (line!==undefined) return line;
                                        }
                                        return this._rainbowOriginalGetLineHTML(sourceBox, lineNo);
                                    };
                                }
                            }
                        }
                        // prevent recursion in case we call reView
                        if (sourceBox.preventRainbowRecursion) {
                            sourceBox.preventRainbowRecursion = undefined;
                            return;
                        }
                        // start coloring (if not already in progress or done)
                        Firebug.FireRainbowModule.colorizeSourceBox(sourceBox);
                    }
                });
                
                ////////////////////////////////////////////////////////////////////////
                // Firebug.FireRainbowModule
                //
                Firebug.FireRainbowModule = extend(Firebug.Module, {
                    valid: false,
                    pings: 0,
                    styleLibrary: {},
                    defaultTheme: ".panelNode-script{background-color:#FFFFFF;color:black;font-family:Monaco,Monospace,Courier New !important;font-size:11px;} .sourceRow.hovered{background-color:#EEEEEE;} .sourceLine{background:#EEEEEE none no-repeat scroll 2px 0;border-bottom:1px solid #EEEEEE;border-right:1px solid #CCCCCC;color:#888888;} .sourceLine:hover{text-decoration:none;} .scriptTooltip{background:LightYellow none repeat scroll 0 0;border:1px solid #CBE087;color:#000000;} .sourceRow[exeline=\"true\"]{background-color:lightgoldenrodyellow;outline-color:#D9D9B6;outline-style:solid;outline-width:1px;} .xml-text{color:black;} .whitespace{color:black;} .xml-punctuation{color:gray;} .xml-tagname{color:blue;} .xml-attname{color:darkred;} .xml-attribute{color:darkgreen;} .css-at{color:darkred;} .css-string{color:red;} .css-punctuation{color:midnightblue;} .js-keyword{color:blue;} .js-variable{color:black;} .js-operator{color:black;} .js-punctuation{color:darkBlue;} .js-variabledef{color:darkslategray;} .js-localvariable{color:darkslateBlue;} .js-property{color:teal;} .js-string{color:darkgreen;} .js-atom{color:saddleBrown;} .xml-comment{color:gray;} .css-identifier{color:midnightBlue;} .css-select-op{color:cadetblue;} .css-unit{color:orangered;} .css-value{color:black;} .css-colorcode{color:magenta;} .js-comment{color:gray;} .js-regexp{color:magenta;} .xml-entity{color:darkgoldenrod;} .xml-error{color:orangered;} .css-comment{color:gray;}",

                    /////////////////////////////////////////////////////////////////////////////////////////
                    initialize: function() {
                        
                        this.actualScriptPanel = Firebug.chrome.getPanel("script2");
                        
                        /*
                        var doc = Firebug.chrome.document;
                        //var url = Env.Location.baseDir + "content/firerainbow/chrome/skin/rainbow.css";
                        var url = Env.Location.baseDir + "content/firerainbow/themes/codemirror.css";
                        var style = createStyleSheet(doc, url);
                        addStyleSheet(doc, style);
                        /**/
                        
                        var doc = Firebug.chrome.document;
                        var style = createElement("style");
                        var rules = document.createTextNode(this.defaultTheme);

                        style.type = "text/css";
                        if(style.styleSheet)
                        {
                            style.styleSheet.cssText = rules.nodeValue;
                        }
                        else
                        {
                            style.appendChild(rules);
                        }
                        addStyleSheet(doc, style);
                        /**/
                        
                        return Firebug.Module.initialize.apply(this, arguments);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    showPanel: function(browser, panel) {
                        if (!this.valid) return;
                        dbg("Rainbow: showPanel", panel);
                        var isScriptPanel = panel && panel.name == "script";
                        this.actualScriptPanel = isScriptPanel?panel:undefined;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    initContext: function(context) {
                        dbg("Rainbow: initContext", context);
                        Firebug.Module.initContext.apply(this, arguments);
                        this.hookPanel(context);
                        this.valid = true;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    reattachContext: function(browser, context) {
                        Firebug.Module.reattachContext.apply(this, arguments);
                        this.hookPanel(context);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // convert old code to be compatible with current rainbow
                    convertOldCode: function(code, version) {
                        switch (version) {
                            case 1: return code.replace(/\.(\w+)\s*\{/g, ".js-$1 {"); // conversion for mixed html coloring
                        }
                        return code;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    getCodeVersion: function(code) {
                        var vc = code.match(/\/\* version:(.*) \*\//);
                        if (!vc) return 1;
                        return parseInt(vc[1], 10);
                    },
                    colorizeSourceBox: function(sourceBox) {
                        dbg("Rainbow: colorizeSourceBox", sourceBox);
                        this.pingDaemon(sourceBox);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    hookPanel: function(context) {
                        dbg("Rainbow: hookPanel", context);
                        var chrome = context ? context.chrome : FirebugChrome;
                        var code = this.getPref('coloring');
                        var version = this.getCodeVersion(code);
                        if (version<currentCodeVersion) {
                            // backward compatibility with old rainbow versions
                            code = this.convertOldCode(code, version);
                            this.storeCode(code);
                        }
                        this.panelBar1 = chrome.$("fbPanelBar1");
                        this.initSyntaxColoring(this.panelBar1);
                        this.applySyntaxColoring(code, this.panelBar1);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    storeCode: function(code) {
                        code = "/* version:"+currentCodeVersion+" */\n"+code;
                        this.setPref('coloring', code);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    startDaemon: function(sourceBox) {
                        dbg("Rainbow: startDaemon", sourceBox);
                        //var webWorkersEnabled = !this.getPref('disableWebWorkers', false);
                        var webWorkersEnabled = false;
                        if (webWorkersEnabled && typeof Worker !== "undefined") {
                            this.startDaemonAsWorkerThread(sourceBox);
                        } else {
                            this.startDaemonOnUIThread(sourceBox);
                        }
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    stopDaemon: function() {
                        dbg("Rainbow: stopDaemon");
                        if (this.parserWorker) {
                            dbg("Rainbow: stopDaemonAsWorkerThread");
                            this.parserWorker.terminate();
                            this.parserWorker = undefined;
                        }
                        if (this.daemonTimer) {
                            dbg("Rainbow: stopDaemonOnUIThread");
                            clearInterval(this.daemonTimer);
                            this.daemonTimer = undefined;
                            this.currentSourceBox = undefined;
                        }
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    startDaemonAsWorkerThread: function(sourceBox) {
                        // daemon is here to perform colorization in background
                        // this is origianl daemon rewrite using web workers
                        if (this.currentSourceBox===sourceBox) return;

                        this.stopDaemon(); // never let run two or more daemons concruently!

                        // find active source box - here we will keep daemon state (parser state)
                        if (!sourceBox) return;
                        if (!sourceBox.lines) return;
                        if (sourceBox.colorized) return; // already colorized
                        
                        dbg("Rainbow: startDaemonAsWorkerThread", sourceBox);
                        
                        this.currentSourceBox = sourceBox;
                        if (sourceBox.lineToBeColorized==undefined) sourceBox.lineToBeColorized = 0;
                        if (!sourceBox.colorizedLines) sourceBox.colorizedLines = [];
                        
                        var refresh = function() {
                            // do review to be sure actual view gets finaly colorized
                            if (that.actualScriptPanel) {
                                sourceBox.preventRainbowRecursion = true;
                                dbg("Rainbow: reView!", sourceBox);
                                that.actualScriptPanel.lastScrollTop = that.actualScriptPanel.lastScrollTop || 0;
                                that.actualScriptPanel.lastScrollTop -= 1; // fight reView's "reView no change to scrollTop" optimization
                                sourceBox.firstViewableLine = -1; // overcome another layer of reView optimization added in Firebug 1.4
                                that.actualScriptPanel.reView(sourceBox, true);
                            }
                        };
                        
                        var that = this;
                        var worker = new Worker('chrome://firerainbow/content/worker.js');
                        worker.onmessage = function(e) {
                            dbg("Rainbow: got worker message "+e.data.msg, e.data);
                            switch (e.data.msg) {
                                case 'progress':
                                    sourceBox.colorizedLines[e.data.line] = processTokenStream(e.data.stream);
                                    if (e.data.line==sourceBox.lastViewableLine) {
                                        // just crossed actual view, force refresh!
                                        refresh();
                                    }
                                    break;
                                case 'done': 
                                    that.parserWorker = undefined;
                                    sourceBox.colorized = true;
                                    that.styleLibrary = e.data.styleLibrary;
                                    refresh();
                                    break;
                            }
                        };
                        worker.onerror = function(e) {
                            dbg("Rainbow: worker error", e);
                            // stop daemon in this exceptional case
                            that.stopDaemon();
                            sourceBox.colorized = true;
                            sourceBox.colorizationFailed = true;
                            return;
                        };
                        worker.postMessage({
                            command: 'run',
                            lines: sourceBox.lines
                        });
                        this.parserWorker = worker;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    startDaemonOnUIThread: function(sourceBox) {
                        // daemon is here to perform colorization in background
                        // the goal is not to block Firebug functionality and don't hog CPU for too long
                        // daemonInterval and tokensPerCall properties define how intensive this background process should be
                        if (this.currentSourceBox===sourceBox) return;

                        this.stopDaemon(); // never let run two or more daemons concruently!

                        // find active source box - here we will keep daemon state (parser state)
                        if (!sourceBox) return;
                        if (!sourceBox.lines) return;
                        if (sourceBox.colorized) return; // already colorized

                        dbg("Rainbow: startDaemonOnUIThread", sourceBox);
                        var that = this;
                        
                        this.currentSourceBox = sourceBox;
                        if (sourceBox.lineToBeColorized==undefined) sourceBox.lineToBeColorized = 0;
                        if (!sourceBox.colorizedLines) sourceBox.colorizedLines = [];

                        // init daemon state
                        var nextLine = null;

                        if (!sourceBox.parser) {
                            var firstLine = "";
                            var lineNo = 0;
                            while (lineNo<sourceBox.lines.length) {
                                firstLine = sourceBox.lines[lineNo];
                                firstLine = firstLine.replace(/^\s*|\s*$/g,"");
                                if (firstLine!="") break;
                                lineNo++;
                            }
                            // determine what parser to use
                            var parser = codemirror.JSParser;
                            // use HTML mixed parser if you encounter these substrings on first line
                            if (firstLine.indexOf('<!DOCTYPE')!=-1 || firstLine.indexOf("<html")!=-1 || 
                                firstLine.indexOf("<body")!=-1 || firstLine.indexOf("<head")!=-1) parser = codemirror.HTMLMixedParser;
                            sourceBox.parser = parser.make(codemirror.stringStream({
                                next: function() {
                                    if (nextLine===null) throw codemirror.StopIteration;
                                    var result = nextLine;
                                    nextLine = null;
                                    return result;
                                }
                            }));
                        }

                        var tokensPerCall = this.getPref('tokensPerCall', 500);
                        var daemonInterval = this.getPref('daemonInterval', 100);
                        
                        var refresh = function() {
                            // do review to be sure actual view gets finaly colorized
                            if (that.actualScriptPanel) {
                                sourceBox.preventRainbowRecursion = true;
                                dbg("Rainbow: reView!", sourceBox);
                                that.actualScriptPanel.lastScrollTop = that.actualScriptPanel.lastScrollTop || 0;
                                that.actualScriptPanel.lastScrollTop -= 1; // fight reView's "reView no change to scrollTop" optimization
                                sourceBox.firstViewableLine = -1; // overcome another layer of reView optimization added in Firebug 1.4
                                that.actualScriptPanel.reView(sourceBox, true);
                            }
                        };

                        var finish = function() {
                            refresh();
                            that.stopDaemon();
                            sourceBox.colorized = true;
                            // free up memory
                            sourceBox.parser = undefined;
                        };

                        // run daemon
                        this.daemonTimer = setInterval(
                            function() {
                                try {
                                    var tokenQuota = tokensPerCall;
                                    var startLine = sourceBox.lineToBeColorized;
                                    while (true) {
                                        if (!sourceBox.hasLine) {
                                            // finish if no more lines
                                            if (sourceBox.lineToBeColorized >= sourceBox.lines.length) {
                                                return finish();
                                            }
                                            
                                            // extract line code from node
                                            // note: \n is important to simulate multi line text in stream (for example multi-line comments depend on this)
                                            nextLine = sourceBox.lines[sourceBox.lineToBeColorized]+"\n";

                                            sourceBox.parsedLine = [];
                                            sourceBox.hasLine = true;
                                        }
                                        
                                        codemirror.forEach(sourceBox.parser,
                                            function(token) {
                                                // colorize token
                                                var val = token.value;
                                                sourceBox.parsedLine.push([token.style, val]);
                                                that.styleLibrary[token.style] = true;
                                                if (--tokenQuota==0) {
                                                    throw StopIteration;
                                                }
                                            }
                                        );
                                        
                                        if (!tokenQuota) {
                                            return;
                                        }
                                    
                                        sourceBox.colorizedLines.push(processTokenStream(sourceBox.parsedLine));

                                        if (sourceBox.lineToBeColorized==sourceBox.lastViewableLine) {
                                            // just crossed actual view, force refresh!
                                            refresh();
                                            startLine = null;
                                        }
    
                                        // move for next line
                                        sourceBox.lineToBeColorized++;
                                        sourceBox.hasLine = false;
                                    }
                                } catch (ex) {
                                    dbg("Rainbow: exception", ex);
                                    // stop daemon in this exceptional case
                                    that.stopDaemon();
                                    sourceBox.colorized = true;
                                    sourceBox.colorizationFailed = true;
                                    // free up memory
                                    sourceBox.parser = undefined;
                                    return;
                                }
                            },
                        daemonInterval);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    pingDaemon: function(sourceBox) {
                        this.valid = true;
                        
                        if (!this.valid) return;
                        
                        // trivial implementation of buffered deferred triggering of daemon
                        this.pings++;
                        var pingMarker = this.pings;
                        var that = this;
                        setTimeout(function(){
                            if (that.pings!=pingMarker) return;
                            that.startDaemon(sourceBox);
                        }, 200);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // initializes syntax coloring helpers for panel
                    initSyntaxColoring: function(panelBar) {
                        // here we append <style id='rainbow-style-sheet' type='text/css'>/* Syntax coloring */</style> into head element
                        // this style element we will use to apply coloring rules to all script boxes in the panel
                        if (this.lookupStyleElement(panelBar)) return; // already done

                        var browser = panelBar.browser;
                        var doc = browser.contentDocument;

                        var styleElement = doc.createElement("style");
                        styleElement.setAttribute("id", "rainbow-style-sheet");
                        styleElement.setAttribute("type", "text/css");
                        styleElement.appendChild(doc.createTextNode('/* Syntax coloring */'));

                        var headElement;
                        var headElementList = doc.getElementsByTagName("head");
                        if (headElementList.length) headElement = headElementList[0]; else headElement = doc.documentElement;
                        headElement.appendChild(styleElement);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // returns our rainbow-style-sheet element from given panel
                    lookupStyleElement: function(panelBar) {
                        var browser = panelBar.browser;
                        var doc = browser.contentDocument;
                        var styleElement = doc.getElementById('rainbow-style-sheet');
                        return styleElement;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // applies new coloring rules to given panel
                    applySyntaxColoring: function(code, panelBar) {
                        var styleElement = this.lookupStyleElement(panelBar);
                        if (!styleElement) return;
                        styleElement.innerHTML = '';
                        var browser = panelBar.browser;
                        var doc = browser.contentDocument;
                        styleElement.appendChild(doc.createTextNode(code));
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // serializes CSS rules and stores them into coloring property (save)
                    saveSyntaxColoring: function(rules) {
                        var code = rules;
                        if (typeof code != 'string') {
                            var s = [];
                            for (var i=0; i<rules.length; i++) {
                                var rule = rules[i];
                                s.push(rule.selector);
                                s.push('{');
                                for (var j=0; j<rule.props.length; j++) {
                                    var prop = rule.props[j];
                                    if (prop.disabled) continue;
                                    s.push(prop.name);
                                    s.push(':');
                                    s.push(prop.value);
                                    if (prop.important) s.push(' !important');
                                    s.push(';');
                                }
                                s.push('}');
                            }
                            code = s.join('');
                        }
                        this.storeCode(code);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // opens dialog to import color theme (color theme is just a piece of CSS)
                    importTheme: function() {
                        var params = {
                            out:null
                        };
                        window.openDialog("chrome://firerainbow/content/import.xul", "", "chrome, dialog, modal, resizable=yes", params).focus();
                        if (params.out) {
                            var code = params.out.code;
                            this.applySyntaxColoring(code, this.panelBar1);
                            this.saveSyntaxColoring(code);
                            this.invalidatePanels();
                        }
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    generateCodeFromLibrary: function() {
                        var niceColors = ["red", "blue", "magenta", "brown", "black", 
                                          "darkgreen", "blueviolet", "cadetblue", "crimson", "darkgoldenrod",
                                          "darkgrey", "darkslateblue", "firebrick", "midnightblue", "orangered", "navy"];
                        var code = ".panelNode-script { font-family: Monaco, Monospace, Courier New !important; font-size: 11px; background-color: #fff; color: black; }";
                        code += " .sourceRow.hovered { background-color: #EEEEEE; }";
                        code += " .sourceLine { border-bottom: 1px solid #EEEEEE; border-right: 1px solid #CCCCCC; background: #EEEEEE no-repeat 2px 0px; color: #888888; }";
                        code += " .sourceLine:hover { text-decoration: none; }";
                        code += " .scriptTooltip { border: 1px solid #CBE087; background: LightYellow; color: #000000; }";
                        code += " .sourceRow[exeLine=\"true\"] { outline: 1px solid #D9D9B6; background-color: lightgoldenrodyellow; }";

                        for (var x in this.styleLibrary) {
                            if (this.styleLibrary.hasOwnProperty(x)) {
                                var color = niceColors[Math.floor(Math.random()*niceColors.length)];
                                code += " ."+x+" { color: "+color+"; }";
                            }
                        }
                        return code;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // generates template color theme based on visited scripts
                    randomizeTheme: function() {
                        var code = this.generateCodeFromLibrary();
                        this.applySyntaxColoring(code, this.panelBar1);
                        this.saveSyntaxColoring(code);
                        this.invalidatePanels();
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // resets to default rainbow coloring theme
                    resetToDefaultTheme: function() {
                        var code = this.defaultTheme;
                        this.applySyntaxColoring(code, this.panelBar1);
                        this.saveSyntaxColoring(code);
                        this.invalidatePanels();
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    // opens rainbow website in a new tab
                    visitWebsite: function() {
                        openNewTab(rainbowWebsite);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    getPref: function(name, def) {
                        return def || 0;
                        var prefName = rainbowPrefDomain + "." + name;

                        var type = rainbowPrefs.getPrefType(prefName);
                        if (type == nsIPrefBranch.PREF_STRING)
                            return rainbowPrefs.getCharPref(prefName);
                        else if (type == nsIPrefBranch.PREF_INT)
                            return rainbowPrefs.getIntPref(prefName);
                        else if (type == nsIPrefBranch.PREF_BOOL)
                            return rainbowPrefs.getBoolPref(prefName);
                        return def;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    setPref: function(name, value) {
                        var prefName = rainbowPrefDomain + "." + name;

                        var type = rainbowPrefs.getPrefType(prefName);
                        if (type == nsIPrefBranch.PREF_STRING)
                            rainbowPrefs.setCharPref(prefName, value);
                        else if (type == nsIPrefBranch.PREF_INT)
                            rainbowPrefs.setIntPref(prefName, value);
                        else if (type == nsIPrefBranch.PREF_BOOL)
                            rainbowPrefs.setBoolPref(prefName, value);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    clearPref: function(name) {
                        var prefName = rainbowPrefDomain + "." + name;
                        return rainbowPrefs.clearUserPref(prefName);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    invalidatePanels: function() {
                        for (var i = 0; i < TabWatcher.contexts.length; ++i) {
                            var panel = TabWatcher.contexts[i].getPanel("script", true);
                            if (!panel) continue;
                            panel.context.invalidatePanels("rainbow");
                            panel.refresh();
                        }
                    }
                });

                /////////////////////////////////////////////////////////////////////////////////////////
                /////////////////////////////////////////////////////////////////////////////////////////
                /////////////////////////////////////////////////////////////////////////////////////////

                Firebug.FireRainbowSyntaxColoringEditorPanel = function() {};
                Firebug.FireRainbowSyntaxColoringEditorPanel.prototype = extend(Firebug.CSSStyleSheetPanel.prototype,{
                    name: "rainbow",
                    title: "Colors",
                    parentPanel: "script",
                    order: 1000,

                    /////////////////////////////////////////////////////////////////////////////////////////
                    initialize: function() {
                        Firebug.CSSStyleSheetPanel.prototype.initialize.apply(this, arguments);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    destroy: function(state) {
                        Firebug.CSSStyleSheetPanel.prototype.destroy.apply(this, arguments);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    lookupStyleSheet: function(browser) {
                        var doc = browser.contentDocument;
                        var styleElement = doc.getElementById('rainbow-style-sheet');
                        if (!styleElement) return;
                        return styleElement.sheet;
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    markChange: function() {
                        Firebug.CSSStyleSheetPanel.prototype.markChange.apply(this, arguments);
                        var that = this;
                        setTimeout(function () {
                            var browser = that.context.chrome.getPanelBrowser(that.parentPanel);
                            var sheet = that.lookupStyleSheet(browser);
                            if (!sheet) return;
                            var rules = that.getStyleSheetRules(that.context, sheet);
                            Firebug.FireRainbowModule.saveSyntaxColoring(rules);
                        }, 1000);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    refresh: function() {
                        this.show();
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    show: function() {
                        var browser = this.context.chrome.getPanelBrowser(this.parentPanel);
                        var sheet = this.lookupStyleSheet(browser);
                        if (!sheet) return;
                        this.updateLocation(sheet);
                    },
                    /////////////////////////////////////////////////////////////////////////////////////////
                    getOptionsMenuItems: function() {
                        return [
                            {
                                label: 'Import Color Theme ...',
                                nol10n: true,
                                command: bind(Firebug.FireRainbowModule.importTheme, Firebug.FireRainbowModule)
                            },{
                                label: 'Randomize Color Theme',
                                nol10n: true,
                                command: bind(Firebug.FireRainbowModule.randomizeTheme, Firebug.FireRainbowModule)
                            },{
                                label: 'Reset to default Color Theme',
                                nol10n: true,
                                command: bind(Firebug.FireRainbowModule.resetToDefaultTheme, Firebug.FireRainbowModule)
                            },'-',{
                                label: 'Visit FireRainbow Website ...',
                                nol10n: true,
                                command: bind(Firebug.FireRainbowModule.visitWebsite, Firebug.FireRainbowModule)
                            }
                        ];
                    }
                });

                Firebug.registerModule(Firebug.FireRainbowModule);
                Firebug.registerExtension(Firebug.FireRainbowExtension);
                Firebug.registerPanel(Firebug.FireRainbowSyntaxColoringEditorPanel);
            }
        }
    }
});