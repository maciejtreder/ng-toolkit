/* See license.txt for terms of usage */

FBL.ns( /**@scope ns-chrome*/ function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Globals

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Window Options

var WindowDefaultOptions = 
    {
        type: "frame",
        id: "FirebugUI"
        //height: 350 // obsolete
    },

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Instantiated objects

    commandLine,

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Interface Elements Cache

    fbTop,
    fbContent,
    fbContentStyle,
    fbBottom,
    fbBtnInspect,

    fbToolbar,

    fbPanelBox1,
    fbPanelBox1Style,
    fbPanelBox2,
    fbPanelBox2Style,
    fbPanelBar2Box,
    fbPanelBar2BoxStyle,

    fbHSplitter,
    fbVSplitter,
    fbVSplitterStyle,

    fbPanel1,
    fbPanel1Style,
    fbPanel2,
    fbPanel2Style,

    fbConsole,
    fbConsoleStyle,
    fbHTML,

    fbCommandLine,
    fbLargeCommandLine, 
    fbLargeCommandButtons,

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Cached size values

    topHeight,
    topPartialHeight,

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    chromeRedrawSkipRate = isIE ? 75 : isOpera ? 80 : 75,

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    lastSelectedPanelName,

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    focusCommandLineState = 0, 
    lastFocusedPanelName, 

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    lastHSplitterMouseMove = 0,
    onHSplitterMouseMoveBuffer = null,
    onHSplitterMouseMoveTimer = null,

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    lastVSplitterMouseMove = 0;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


// ************************************************************************************************
// FirebugChrome

FBL.defaultPersistedState = 
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    isOpen: false,
    height: 300,
    sidePanelWidth: 350,
    
    selectedPanelName: "Console",
    selectedHTMLElementId: null,
    
    htmlSelectionStack: []
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
};

/**@namespace*/
FBL.FirebugChrome = 
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    //isOpen: false,
    //height: 300,
    //sidePanelWidth: 350,
    
    //selectedPanelName: "Console",
    //selectedHTMLElementId: null,
    
    chromeMap: {},
    
    htmlSelectionStack: [],
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    create: function()
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FirebugChrome.create", "creating chrome window");
        
        createChromeWindow();
    },
    
    initialize: function()
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FirebugChrome.initialize", "initializing chrome window");
        
        if (Env.chrome.type == "frame" || Env.chrome.type == "div")
            ChromeMini.create(Env.chrome);
        
        var chrome = Firebug.chrome = new Chrome(Env.chrome);
        FirebugChrome.chromeMap[chrome.type] = chrome;
        
        addGlobalEvent("keydown", onGlobalKeyDown);
        
        if (Env.Options.enablePersistent && chrome.type == "popup")
        {
            // TODO: xxxpedro persist - revise chrome synchronization when in persistent mode
            var frame = FirebugChrome.chromeMap.frame;
            if (frame)
                frame.close();
            
            //chrome.reattach(frame, chrome);
            //TODO: xxxpedro persist synchronize?
            chrome.initialize();
        }
    },
    
    clone: function(FBChrome)
    {
        for (var name in FBChrome)
        {
            var prop = FBChrome[name];
            if (FBChrome.hasOwnProperty(name) && !isFunction(prop))
            {
                this[name] = prop;
            }
        }
    }
};



// ************************************************************************************************
// Chrome Window Creation

var createChromeWindow = function(options)
{
    options = extend(WindowDefaultOptions, options || {});
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Locals

    var browserWin = Env.browser.window;
    var browserContext = new Context(browserWin);
    var prefs = Store.get("FirebugLite");
    var persistedState = prefs && prefs.persistedState || defaultPersistedState;
    
    var chrome = {},
        
        context = options.context || Env.browser,
    
        type = chrome.type = Env.Options.enablePersistent ? 
                "popup" : 
                options.type,
        
        isChromeFrame = type == "frame",
        
        useLocalSkin = Env.useLocalSkin,
        
        url = useLocalSkin ? 
                Env.Location.skin : 
                "about:blank",
        
        // document.body not available in XML+XSL documents in Firefox
        body = context.document.getElementsByTagName("body")[0],
                
        formatNode = function(node)
        {
            if (!Env.isDebugMode)
            {
                node.firebugIgnore = true;
            }
            
            var browserWinSize = browserContext.getWindowSize();
            var height = persistedState.height || 300;
            
            height = Math.min(browserWinSize.height, height);
            height = Math.max(200, height);
            
            node.style.border = "0";
            node.style.visibility = "hidden";
            node.style.zIndex = "2147483647"; // MAX z-index = 2147483647
            node.style.position = noFixedPosition ? "absolute" : "fixed";
            node.style.width = "100%"; // "102%"; IE auto margin bug
            node.style.left = "0";
            node.style.bottom = noFixedPosition ? "-1px" : "0";
            node.style.height = height + "px";
            
            // avoid flickering during chrome rendering
            //if (isFirefox)
            //    node.style.display = "none";
        },
        
        createChromeDiv = function()
        {
            //Firebug.Console.warn("Firebug Lite GUI is working in 'windowless mode'. It may behave slower and receive interferences from the page in which it is installed.");
        
            var node = chrome.node = createGlobalElement("div"),
                style = createGlobalElement("style"),
                
                css = FirebugChrome.Skin.CSS
                        /*
                        .replace(/;/g, " !important;")
                        .replace(/!important\s!important/g, "!important")
                        .replace(/display\s*:\s*(\w+)\s*!important;/g, "display:$1;")*/,
                
                        // reset some styles to minimize interference from the main page's style
                rules = ".fbBody *{margin:0;padding:0;font-size:11px;line-height:13px;color:inherit;}" +
                        // load the chrome styles
                        css +
                        // adjust some remaining styles
                        ".fbBody #fbHSplitter{position:absolute !important;} .fbBody #fbHTML span{line-height:14px;} .fbBody .lineNo div{line-height:inherit !important;}";
            /*
            if (isIE)
            {
                // IE7 CSS bug (FbChrome table bigger than its parent div) 
                rules += ".fbBody table.fbChrome{position: static !important;}";
            }/**/
            
            style.type = "text/css";
            
            if (style.styleSheet)
                style.styleSheet.cssText = rules;
            else
                style.appendChild(context.document.createTextNode(rules));
            
            document.getElementsByTagName("head")[0].appendChild(style);
            
            node.className = "fbBody";
            node.style.overflow = "hidden";
            node.innerHTML = getChromeDivTemplate();
            
            if (isIE)
            {
                // IE7 CSS bug (FbChrome table bigger than its parent div)
                setTimeout(function(){
                node.firstChild.style.height = "1px";
                node.firstChild.style.position = "static";
                },0);
                /**/
            }
            
            formatNode(node);
            
            body.appendChild(node);
            
            chrome.window = window;
            chrome.document = document;
            onChromeLoad(chrome);            
        };
    
    //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    try
    {
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // create the Chrome as a "div" (windowless mode)
        if (type == "div")
        {
            createChromeDiv();
            return;
        }
        
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // cretate the Chrome as an "iframe"
        else if (isChromeFrame)
        {
            // Create the Chrome Frame
            var node = chrome.node = createGlobalElement("iframe");
            node.setAttribute("src", url);
            node.setAttribute("frameBorder", "0");
            
            formatNode(node);
            
            body.appendChild(node);
            
            // must set the id after appending to the document, otherwise will cause an
            // strange error in IE, making the iframe load the page in which the bookmarklet
            // was created (like getfirebug.com), before loading the injected UI HTML,
            // generating an "Access Denied" error.
            node.id = options.id;
        }
        
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // create the Chrome as a "popup"
        else
        {
            var height = persistedState.popupHeight || 300;
            var browserWinSize = browserContext.getWindowSize();
            
            var browserWinLeft = typeof browserWin.screenX == "number" ? 
                    browserWin.screenX : browserWin.screenLeft;
            
            var popupLeft = typeof persistedState.popupLeft == "number" ?
                    persistedState.popupLeft : browserWinLeft;
            
            var browserWinTop = typeof browserWin.screenY == "number" ? 
                    browserWin.screenY : browserWin.screenTop;

            var popupTop = typeof persistedState.popupTop == "number" ?
                    persistedState.popupTop :
                    Math.max(
                            0,
                            Math.min(
                                    browserWinTop + browserWinSize.height - height,
                                    // Google Chrome bug
                                    screen.availHeight - height - 61
                                ) 
                            );
            
            var popupWidth = typeof persistedState.popupWidth == "number" ? 
                    persistedState.popupWidth :
                    Math.max(
                            0,
                            Math.min(
                                    browserWinSize.width,
                                    // Opera opens popup in a new tab if it's too big!
                                    screen.availWidth-10 
                                ) 
                            );

            var popupHeight = typeof persistedState.popupHeight == "number" ?
                    persistedState.popupHeight : 300;
            
            var options = [
                    "true,top=", popupTop,
                    ",left=", popupLeft, 
                    ",height=", popupHeight,
                    ",width=", popupWidth, 
                    ",resizable"          
                ].join(""),
            
                node = chrome.node = context.window.open(
                    url, 
                    "popup", 
                    options
                );
            
            if (node)
            {
                try
                {
                    node.focus();
                }
                catch(E)
                {
                    alert("Firebug Error: Firebug popup was blocked.");
                    return;
                }
            }
            else
            {
                alert("Firebug Error: Firebug popup was blocked.");
                return;
            }
        }
        
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Inject the interface HTML if it is not using the local skin
        
        if (!useLocalSkin)
        {
            var tpl = getChromeTemplate(!isChromeFrame),
                doc = isChromeFrame ? node.contentWindow.document : node.document;
            
            doc.write(tpl);
            doc.close();
        }
        
        //* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Wait the Window to be loaded
        
        var win,
        
            waitDelay = useLocalSkin ? isChromeFrame ? 200 : 300 : 100,
            
            waitForWindow = function()
            {
                if ( // Frame loaded... OR
                     isChromeFrame && (win=node.contentWindow) &&
                     node.contentWindow.document.getElementById("fbCommandLine") ||
                     
                     // Popup loaded
                     !isChromeFrame && (win=node.window) && node.document &&
                     node.document.getElementById("fbCommandLine") )
                {
                    chrome.window = win.window;
                    chrome.document = win.document;
                    
                    // Prevent getting the wrong chrome height in FF when opening a popup 
                    setTimeout(function(){
                        onChromeLoad(chrome);
                    }, useLocalSkin ? 200 : 0);
                }
                else
                    setTimeout(waitForWindow, waitDelay);
            };
        
        waitForWindow();
    }
    catch(e)
    {
        var msg = e.message || e;
        
        if (/access/i.test(msg))
        {
            // Firebug Lite could not create a window for its Graphical User Interface due to
            // a access restriction. This happens in some pages, when loading via bookmarklet.
            // In such cases, the only way is to load the GUI in a "windowless mode".
            
            if (isChromeFrame)
                body.removeChild(node);
            else if(type == "popup")
                node.close();
            
            // Load the GUI in a "windowless mode"
            createChromeDiv();
        }
        else
        {
            alert("Firebug Error: Firebug GUI could not be created.");
        }
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var onChromeLoad = function onChromeLoad(chrome)
{
    Env.chrome = chrome;
    
    if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Chrome onChromeLoad", "chrome window loaded");
    
    if (Env.Options.enablePersistent)
    {
        // TODO: xxxpedro persist - make better chrome synchronization when in persistent mode
        Env.FirebugChrome = FirebugChrome;
        
        chrome.window.Firebug = chrome.window.Firebug || {};
        chrome.window.Firebug.SharedEnv = Env;
        
        if (Env.isDevelopmentMode)
        {
            Env.browser.window.FBDev.loadChromeApplication(chrome);
        }
        else
        {
            var doc = chrome.document;
            var script = doc.createElement("script");
            script.src = Env.Location.app + "#remote,persist";
            doc.getElementsByTagName("head")[0].appendChild(script);
        }
    }
    else
    {
        if (chrome.type == "frame" || chrome.type == "div")
        {
            // initialize the chrome application
            setTimeout(function(){
                FBL.Firebug.initialize();
            },0);
        }
        else if (chrome.type == "popup")
        {
            var oldChrome = FirebugChrome.chromeMap.frame;
            
            var newChrome = new Chrome(chrome);
        
            // TODO: xxxpedro sync detach reattach attach
            dispatch(newChrome.panelMap, "detach", [oldChrome, newChrome]);
        
            newChrome.reattach(oldChrome, newChrome);
        }
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var getChromeDivTemplate = function()
{
    return FirebugChrome.Skin.HTML;
};

var getChromeTemplate = function(isPopup)
{
    var tpl = FirebugChrome.Skin; 
    var r = [], i = -1;
    
    r[++i] = '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/DTD/strict.dtd">';
    r[++i] = '<html><head><title>';
    r[++i] = Firebug.version;
    
    /*
    r[++i] = '</title><link href="';
    r[++i] = Env.Location.skinDir + 'firebug.css';
    r[++i] = '" rel="stylesheet" type="text/css" />';
    /**/
    
    r[++i] = '</title><style>html,body{margin:0;padding:0;overflow:hidden;}';
    r[++i] = tpl.CSS;
    r[++i] = '</style>';
    /**/
    
    r[++i] = '</head><body class="fbBody' + (isPopup ? ' FirebugPopup' : '') + '">';
    r[++i] = tpl.HTML;
    r[++i] = '</body></html>';
    
    return r.join("");
};


// ************************************************************************************************
// Chrome Class
    
/**@class*/
var Chrome = function Chrome(chrome)
{
    var type = chrome.type;
    var Base = type == "frame" || type == "div" ? ChromeFrameBase : ChromePopupBase; 
    
    append(this, Base);   // inherit from base class (ChromeFrameBase or ChromePopupBase)
    append(this, chrome); // inherit chrome window properties
    append(this, new Context(chrome.window)); // inherit from Context class
    
    FirebugChrome.chromeMap[type] = this;
    Firebug.chrome = this;
    Env.chrome = chrome.window;
    
    this.commandLineVisible = false;
    this.sidePanelVisible = false;
    
    this.create();
    
    return this;
};

// ************************************************************************************************
// ChromeBase

/**
 * @namespace
 * @extends FBL.Controller 
 * @extends FBL.PanelBar 
 **/
var ChromeBase = {};
append(ChromeBase, Controller); 
append(ChromeBase, PanelBar);
append(ChromeBase,
/**@extend ns-chrome-ChromeBase*/
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // inherited properties
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // inherited from createChrome function
    
    node: null,
    type: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // inherited from Context.prototype
    
    document: null,
    window: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // value properties
    
    sidePanelVisible: false,
    commandLineVisible: false,
    largeCommandLineVisible: false,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // object properties
    
    inspectButton: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    create: function()
    {
        PanelBar.create.call(this);
        
        if (Firebug.Inspector)
            this.inspectButton = new Button({
                type: "toggle",
                element: $("fbChrome_btInspect"),
                owner: Firebug.Inspector,
                
                onPress: Firebug.Inspector.startInspecting,
                onUnpress: Firebug.Inspector.stopInspecting          
            });
    },
    
    destroy: function()
    {
        if(Firebug.Inspector)
            this.inspectButton.destroy();
        
        PanelBar.destroy.call(this);
        
        this.shutdown();
    },
    
    testMenu: function()
    {
        var firebugMenu = new Menu(
        {
            id: "fbFirebugMenu",
            
            items:
            [
                {
                    label: "Open Firebug",
                    type: "shortcut",
                    key: isFirefox ? "Shift+F12" : "F12",
                    checked: true,
                    command: "toggleChrome"
                },
                {
                    label: "Open Firebug in New Window",
                    type: "shortcut",
                    key: isFirefox ? "Ctrl+Shift+F12" : "Ctrl+F12",
                    command: "openPopup"
                },
                {
                    label: "Inspect Element",
                    type: "shortcut",
                    key: "Ctrl+Shift+C",
                    command: "toggleInspect"
                },
                {
                    label: "Command Line",
                    type: "shortcut",
                    key: "Ctrl+Shift+L",
                    command: "focusCommandLine"
                },
                "-",
                {
                    label: "Options",
                    type: "group",
                    child: "fbFirebugOptionsMenu"
                },
                "-",
                {
                    label: "Firebug Lite Website...",
                    command: "visitWebsite"
                },
                {
                    label: "Discussion Group...",
                    command: "visitDiscussionGroup"
                },
                {
                    label: "Issue Tracker...",
                    command: "visitIssueTracker"
                }
            ],
            
            onHide: function()
            {
                iconButton.restore();
            },
            
            toggleChrome: function()
            {
                Firebug.chrome.toggle();
            },
            
            openPopup: function()
            {
                Firebug.chrome.toggle(true, true);
            },
            
            toggleInspect: function()
            {
                Firebug.Inspector.toggleInspect();
            },
            
            focusCommandLine: function()
            {
                Firebug.chrome.focusCommandLine();
            },
            
            visitWebsite: function()
            {
                this.visit("http://getfirebug.com/lite.html");
            },
            
            visitDiscussionGroup: function()
            {
                this.visit("http://groups.google.com/group/firebug");
            },
            
            visitIssueTracker: function()
            {
                this.visit("http://code.google.com/p/fbug/issues/list");
            },
            
            visit: function(url)
            {
                window.open(url);
            }
            
        });
        
        /**@private*/
        var firebugOptionsMenu =
        {
            id: "fbFirebugOptionsMenu",
            
            getItems: function()
            {
                var cookiesDisabled = !Firebug.saveCookies;
                
                return [
                    {
                        label: "Start Opened",
                        type: "checkbox",
                        value: "startOpened",
                        checked: Firebug.startOpened,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Start in New Window",
                        type: "checkbox",
                        value: "startInNewWindow",
                        checked: Firebug.startInNewWindow,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Show Icon When Hidden",
                        type: "checkbox",
                        value: "showIconWhenHidden",
                        checked: Firebug.showIconWhenHidden,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Override Console Object",
                        type: "checkbox",
                        value: "overrideConsole",
                        checked: Firebug.overrideConsole,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Ignore Firebug Elements",
                        type: "checkbox",
                        value: "ignoreFirebugElements",
                        checked: Firebug.ignoreFirebugElements,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Disable When Firebug Active",
                        type: "checkbox",
                        value: "disableWhenFirebugActive",
                        checked: Firebug.disableWhenFirebugActive,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Disable XHR Listener",
                        type: "checkbox",
                        value: "disableXHRListener",
                        checked: Firebug.disableXHRListener,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Disable Resource Fetching",
                        type: "checkbox",
                        value: "disableResourceFetching",
                        checked: Firebug.disableResourceFetching,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Enable Trace Mode",
                        type: "checkbox",
                        value: "enableTrace",
                        checked: Firebug.enableTrace,
                        disabled: cookiesDisabled
                    },
                    {
                        label: "Enable Persistent Mode (experimental)",
                        type: "checkbox",
                        value: "enablePersistent",
                        checked: Firebug.enablePersistent,
                        disabled: cookiesDisabled
                    },
                    "-",
                    {
                        label: "Reset All Firebug Options",
                        command: "restorePrefs",
                        disabled: cookiesDisabled
                    }
                ];
            },
            
            onCheck: function(target, value, checked)
            {
                Firebug.setPref(value, checked);
            },           
            
            restorePrefs: function(target)
            {
                Firebug.erasePrefs();
                
                if (target)
                    this.updateMenu(target);
            },
            
            updateMenu: function(target)
            {
                var options = getElementsByClass(target.parentNode, "fbMenuOption");
                
                var firstOption = options[0]; 
                var enabled = Firebug.saveCookies;
                if (enabled)
                    Menu.check(firstOption);
                else
                    Menu.uncheck(firstOption);
                
                if (enabled)
                    Menu.check(options[0]);
                else
                    Menu.uncheck(options[0]);
                
                for (var i = 1, length = options.length; i < length; i++)
                {
                    var option = options[i];
                    
                    var value = option.getAttribute("value");
                    var pref = Firebug[value];
                    
                    if (pref)
                        Menu.check(option);
                    else
                        Menu.uncheck(option);
                    
                    if (enabled)
                        Menu.enable(option);
                    else
                        Menu.disable(option);
                }
            }
        };
        
        Menu.register(firebugOptionsMenu);
        
        var menu = firebugMenu;
        
        var testMenuClick = function(event)
        {
            //console.log("testMenuClick");
            cancelEvent(event, true);
            
            var target = event.target || event.srcElement;
            
            if (menu.isVisible)
                menu.hide();
            else
            {
                var offsetLeft = isIE6 ? 1 : -4,  // IE6 problem with fixed position
                    
                    chrome = Firebug.chrome,
                    
                    box = chrome.getElementBox(target),
                    
                    offset = chrome.type == "div" ?
                            chrome.getElementPosition(chrome.node) :
                            {top: 0, left: 0};
                
                menu.show(
                            box.left + offsetLeft - offset.left, 
                            box.top + box.height -5 - offset.top
                        );
            }
            
            return false;
        };
        
        var iconButton = new IconButton({
            type: "toggle",
            element: $("fbFirebugButton"),
            
            onClick: testMenuClick
        });
        
        iconButton.initialize();
        
        //addEvent($("fbToolbarIcon"), "click", testMenuClick);
    },
    
    initialize: function()
    {
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        if (Env.bookmarkletOutdated)
            Firebug.Console.logFormatted([
                  "A new bookmarklet version is available. " +
                  "Please visit http://getfirebug.com/firebuglite#Install and update it."
                ], Firebug.context, "warn");
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        if (Firebug.Console)
            Firebug.Console.flush();
        
        if (Firebug.Trace)
            FBTrace.flush(Firebug.Trace);
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.chrome.initialize", "initializing chrome application");
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // initialize inherited classes
        Controller.initialize.call(this);
        PanelBar.initialize.call(this);
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // create the interface elements cache
        
        fbTop = $("fbTop");
        fbContent = $("fbContent");
        fbContentStyle = fbContent.style;
        fbBottom = $("fbBottom");
        fbBtnInspect = $("fbBtnInspect");
        
        fbToolbar = $("fbToolbar");
      
        fbPanelBox1 = $("fbPanelBox1");
        fbPanelBox1Style = fbPanelBox1.style;
        fbPanelBox2 = $("fbPanelBox2");
        fbPanelBox2Style = fbPanelBox2.style;
        fbPanelBar2Box = $("fbPanelBar2Box");
        fbPanelBar2BoxStyle = fbPanelBar2Box.style;
      
        fbHSplitter = $("fbHSplitter");
        fbVSplitter = $("fbVSplitter");
        fbVSplitterStyle = fbVSplitter.style;
      
        fbPanel1 = $("fbPanel1");
        fbPanel1Style = fbPanel1.style;
        fbPanel2 = $("fbPanel2");
        fbPanel2Style = fbPanel2.style;
      
        fbConsole = $("fbConsole");
        fbConsoleStyle = fbConsole.style;
        fbHTML = $("fbHTML");
      
        fbCommandLine = $("fbCommandLine");
        fbLargeCommandLine = $("fbLargeCommandLine");
        fbLargeCommandButtons = $("fbLargeCommandButtons");
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // static values cache
        topHeight = fbTop.offsetHeight;
        topPartialHeight = fbToolbar.offsetHeight;
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        disableTextSelection($("fbToolbar"));
        disableTextSelection($("fbPanelBarBox"));
        disableTextSelection($("fbPanelBar1"));
        disableTextSelection($("fbPanelBar2"));
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Add the "javascript:void(0)" href attributes used to make the hover effect in IE6
        if (isIE6 && Firebug.Selector)
        {
            // TODO: xxxpedro change to getElementsByClass
            var as = $$(".fbHover");
            for (var i=0, a; a=as[i]; i++)
            {
                a.setAttribute("href", "javascript:void(0)");
            }
        }
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // initialize all panels
        /*
        var panelMap = Firebug.panelTypes;
        for (var i=0, p; p=panelMap[i]; i++)
        {
            if (!p.parentPanel)
            {
                this.addPanel(p.prototype.name);
            }
        }
        /**/
        
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        
        if(Firebug.Inspector)
            this.inspectButton.initialize();
        
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        
        this.addController(
            [$("fbLargeCommandLineIcon"), "click", this.showLargeCommandLine]       
        );
        
        // ************************************************************************************************
        
        // Select the first registered panel
        // TODO: BUG IE7
        var self = this;
        setTimeout(function(){
            self.selectPanel(Firebug.context.persistedState.selectedPanelName);
            
            if (Firebug.context.persistedState.selectedPanelName == "Console" && Firebug.CommandLine)
                Firebug.chrome.focusCommandLine();
        },0);
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        //this.draw();
        
        
        
        
        
        
        

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

        var onPanelMouseDown = function onPanelMouseDown(event)
        {
            //console.log("onPanelMouseDown", event.target || event.srcElement, event);
            
            var target = event.target || event.srcElement;
            
            if (FBL.isLeftClick(event))
            {
                var editable = FBL.getAncestorByClass(target, "editable");
                
                // if an editable element has been clicked then start editing
                if (editable)
                {
                    Firebug.Editor.startEditing(editable);
                    FBL.cancelEvent(event);
                }
                // if any other element has been clicked then stop editing
                else
                {
                    if (!hasClass(target, "textEditorInner"))
                        Firebug.Editor.stopEditing();
                }
            }
            else if (FBL.isMiddleClick(event) && Firebug.getRepNode(target))
            {
                // Prevent auto-scroll when middle-clicking a rep object
                FBL.cancelEvent(event);
            }
        };
        
        Firebug.getElementPanel = function(element)
        {
            var panelNode = getAncestorByClass(element, "fbPanel");
            var id = panelNode.id.substr(2);
            
            var panel = Firebug.chrome.panelMap[id];
            
            if (!panel)
            {
                if (Firebug.chrome.selectedPanel.sidePanelBar)
                    panel = Firebug.chrome.selectedPanel.sidePanelBar.panelMap[id];
            }
            
            return panel;
        };
        
        
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        // TODO: xxxpedro port to Firebug
        
        // Improved window key code event listener. Only one "keydown" event will be attached
        // to the window, and the onKeyCodeListen() function will delegate which listeners
        // should be called according to the event.keyCode fired.
        var onKeyCodeListenersMap = [];
        var onKeyCodeListen = function(event)
        {
            for (var keyCode in onKeyCodeListenersMap)
            {
                var listeners = onKeyCodeListenersMap[keyCode];
                
                for (var i = 0, listener; listener = listeners[i]; i++)
                {
                    var filter = listener.filter || FBL.noKeyModifiers;
        
                    if (event.keyCode == keyCode && (!filter || filter(event)))
                    {
                        listener.listener();
                        FBL.cancelEvent(event, true);
                        return false;
                    }
                }
            }
        };
        
        addEvent(Firebug.chrome.document, "keydown", onKeyCodeListen);

        /**
         * @name keyCodeListen
         * @memberOf FBL.FirebugChrome
         */
        Firebug.chrome.keyCodeListen = function(key, filter, listener, capture)
        {
            var keyCode = KeyEvent["DOM_VK_"+key];
            
            if (!onKeyCodeListenersMap[keyCode])
                onKeyCodeListenersMap[keyCode] = [];
            
            onKeyCodeListenersMap[keyCode].push({
                filter: filter,
                listener: listener
            });
    
            return keyCode;
        };
        
        /**
         * @name keyIgnore
         * @memberOf FBL.FirebugChrome
         */
        Firebug.chrome.keyIgnore = function(keyCode)
        {
            onKeyCodeListenersMap[keyCode] = null;
            delete onKeyCodeListenersMap[keyCode];
        };
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        /**/
        // move to shutdown 
        //removeEvent(Firebug.chrome.document, "keydown", listener[0]);


        /*
        Firebug.chrome.keyCodeListen = function(key, filter, listener, capture)
        {
            if (!filter)
                filter = FBL.noKeyModifiers;
    
            var keyCode = KeyEvent["DOM_VK_"+key];
    
            var fn = function fn(event)
            {
                if (event.keyCode == keyCode && (!filter || filter(event)))
                {
                    listener();
                    FBL.cancelEvent(event, true);
                    return false;
                }
            }
    
            addEvent(Firebug.chrome.document, "keydown", fn);
            
            return [fn, capture];
        };
        
        Firebug.chrome.keyIgnore = function(listener)
        {
            removeEvent(Firebug.chrome.document, "keydown", listener[0]);
        };
        /**/
        
        
        this.addController(
                [fbPanel1, "mousedown", onPanelMouseDown],
                [fbPanel2, "mousedown", onPanelMouseDown]
             );
/**/
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        
        // menus can be used without domplate
        if (FBL.domplate)
            this.testMenu();
        /**/
        
        //test XHR
        /*
        setTimeout(function(){
        
        FBL.Ajax.request({url: "../content/firebug/boot.js"});
        FBL.Ajax.request({url: "../content/firebug/boot.js.invalid"});
        
        },1000);
        /**/
    },
    
    shutdown: function()
    {
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        
        if(Firebug.Inspector)
            this.inspectButton.shutdown();
        
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************
        // ************************************************************************************************

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        // remove disableTextSelection event handlers
        restoreTextSelection($("fbToolbar"));
        restoreTextSelection($("fbPanelBarBox"));
        restoreTextSelection($("fbPanelBar1"));
        restoreTextSelection($("fbPanelBar2"));
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // shutdown inherited classes
        Controller.shutdown.call(this);
        PanelBar.shutdown.call(this);
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Remove the interface elements cache (this must happen after calling 
        // the shutdown method of all dependent components to avoid errors)

        fbTop = null;
        fbContent = null;
        fbContentStyle = null;
        fbBottom = null;
        fbBtnInspect = null;
        
        fbToolbar = null;

        fbPanelBox1 = null;
        fbPanelBox1Style = null;
        fbPanelBox2 = null;
        fbPanelBox2Style = null;
        fbPanelBar2Box = null;
        fbPanelBar2BoxStyle = null;
  
        fbHSplitter = null;
        fbVSplitter = null;
        fbVSplitterStyle = null;
  
        fbPanel1 = null;
        fbPanel1Style = null;
        fbPanel2 = null;
  
        fbConsole = null;
        fbConsoleStyle = null;
        fbHTML = null;
  
        fbCommandLine = null;
        fbLargeCommandLine = null;
        fbLargeCommandButtons = null;
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // static values cache
        
        topHeight = null;
        topPartialHeight = null;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    toggle: function(forceOpen, popup)
    {
        if(popup)
        {
            this.detach();
        }
        else
        {
            if (isOpera && Firebug.chrome.type == "popup" && Firebug.chrome.node.closed)
            {
                var frame = FirebugChrome.chromeMap.frame;
                frame.reattach();
                
                FirebugChrome.chromeMap.popup = null;
                
                frame.open();
                
                return;
            }
                
            // If the context is a popup, ignores the toggle process
            if (Firebug.chrome.type == "popup") return;
            
            var shouldOpen = forceOpen || !Firebug.context.persistedState.isOpen;
            
            if(shouldOpen)
               this.open();
            else
               this.close();
        }       
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    detach: function()
    {
        if(!FirebugChrome.chromeMap.popup)
        {
            this.close();
            createChromeWindow({type: "popup"});
        }
    },
    
    reattach: function(oldChrome, newChrome)
    {
        Firebug.browser.window.Firebug = Firebug;
        
        // chrome synchronization
        var newPanelMap = newChrome.panelMap;
        var oldPanelMap = oldChrome.panelMap;
        
        var panel;
        for(var name in newPanelMap)
        {
            // TODO: xxxpedro innerHTML
            panel = newPanelMap[name]; 
            if (panel.options.innerHTMLSync)
                panel.panelNode.innerHTML = oldPanelMap[name].panelNode.innerHTML;
        }
        
        Firebug.chrome = newChrome;
        
        // TODO: xxxpedro sync detach reattach attach
        //dispatch(Firebug.chrome.panelMap, "detach", [oldChrome, newChrome]);
        
        if (newChrome.type == "popup")
        {
            newChrome.initialize();
            //dispatch(Firebug.modules, "initialize", []);
        }
        else
        {
            // TODO: xxxpedro only needed in persistent
            // should use FirebugChrome.clone, but popup FBChrome
            // isn't acessible 
            Firebug.context.persistedState.selectedPanelName = oldChrome.selectedPanel.name;
        }
        
        dispatch(newPanelMap, "reattach", [oldChrome, newChrome]);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    draw: function()
    {
        var size = this.getSize();
        
        // Height related values
        var commandLineHeight = Firebug.chrome.commandLineVisible ? fbCommandLine.offsetHeight : 0,
            
            y = Math.max(size.height /* chrome height */, topHeight),
            
            heightValue = Math.max(y - topHeight - commandLineHeight /* fixed height */, 0), 
            
            height = heightValue + "px",
            
            // Width related values
            sideWidthValue = Firebug.chrome.sidePanelVisible ? Firebug.context.persistedState.sidePanelWidth : 0,
            
            width = Math.max(size.width /* chrome width */ - sideWidthValue, 0) + "px";
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Height related rendering
        fbPanelBox1Style.height = height;
        fbPanel1Style.height = height;
        
        if (isIE || isOpera)
        {
            // Fix IE and Opera problems with auto resizing the verticall splitter
            fbVSplitterStyle.height = Math.max(y - topPartialHeight - commandLineHeight, 0) + "px";
        }
        //xxxpedro FF2 only?
        /*
        else if (isFirefox)
        {
            // Fix Firefox problem with table rows with 100% height (fit height)
            fbContentStyle.maxHeight = Math.max(y - fixedHeight, 0)+ "px";
        }/**/
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Width related rendering
        fbPanelBox1Style.width = width;
        fbPanel1Style.width = width;
        
        // SidePanel rendering
        if (Firebug.chrome.sidePanelVisible)
        {
            sideWidthValue = Math.max(sideWidthValue - 6, 0);
            
            var sideWidth = sideWidthValue + "px";
            
            fbPanelBox2Style.width = sideWidth;
            
            fbVSplitterStyle.right = sideWidth;
            
            if (Firebug.chrome.largeCommandLineVisible)
            {
                fbLargeCommandLine = $("fbLargeCommandLine");
                
                fbLargeCommandLine.style.height = heightValue - 4 + "px";
                fbLargeCommandLine.style.width = sideWidthValue - 2 + "px";
                
                fbLargeCommandButtons = $("fbLargeCommandButtons");
                fbLargeCommandButtons.style.width = sideWidth;
            }
            else
            {
                fbPanel2Style.height = height;
                fbPanel2Style.width = sideWidth;
                
                fbPanelBar2BoxStyle.width = sideWidth;
            }
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    getSize: function()
    {
        return this.type == "div" ?
            {
                height: this.node.offsetHeight,
                width: this.node.offsetWidth
            }
            :
            this.getWindowSize();
    },
    
    resize: function()
    {
        var self = this;
        
        // avoid partial resize when maximizing window
        setTimeout(function(){
            self.draw();
            
            if (noFixedPosition && (self.type == "frame" || self.type == "div"))
                self.fixIEPosition();
        }, 0);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    layout: function(panel)
    {
        if (FBTrace.DBG_CHROME) FBTrace.sysout("Chrome.layout", "");
        
        var options = panel.options;
        
        changeCommandLineVisibility(options.hasCommandLine);
        changeSidePanelVisibility(panel.hasSidePanel);
        
        Firebug.chrome.draw();
    },
    
    showLargeCommandLine: function(hideToggleIcon)
    {
        var chrome = Firebug.chrome;
        
        if (!chrome.largeCommandLineVisible)
        {
            chrome.largeCommandLineVisible = true;
            
            if (chrome.selectedPanel.options.hasCommandLine)
            {
                if (Firebug.CommandLine)
                    Firebug.CommandLine.blur();
                
                changeCommandLineVisibility(false);
            }
            
            changeSidePanelVisibility(true);
            
            fbLargeCommandLine.style.display = "block";
            fbLargeCommandButtons.style.display = "block";
            
            fbPanel2Style.display = "none";
            fbPanelBar2BoxStyle.display = "none";
            
            chrome.draw();
            
            fbLargeCommandLine.focus();
            
            if (Firebug.CommandLine)
                Firebug.CommandLine.setMultiLine(true);
        }
    },
    
    hideLargeCommandLine: function()
    {
        if (Firebug.chrome.largeCommandLineVisible)
        {
            Firebug.chrome.largeCommandLineVisible = false;
            
            if (Firebug.CommandLine)
                Firebug.CommandLine.setMultiLine(false);
            
            fbLargeCommandLine.blur();
            
            fbPanel2Style.display = "block";
            fbPanelBar2BoxStyle.display = "block";
            
            fbLargeCommandLine.style.display = "none";
            fbLargeCommandButtons.style.display = "none";            
            
            changeSidePanelVisibility(false);
            
            if (Firebug.chrome.selectedPanel.options.hasCommandLine)
                changeCommandLineVisibility(true);
            
            Firebug.chrome.draw();
            
        }
    },    
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    focusCommandLine: function()
    {
        var selectedPanelName = this.selectedPanel.name, panelToSelect;
        
        if (focusCommandLineState == 0 || selectedPanelName != "Console")
        {
            focusCommandLineState = 0;
            lastFocusedPanelName = selectedPanelName;
            
            panelToSelect = "Console";
        }
        if (focusCommandLineState == 1)
        {
            panelToSelect = lastFocusedPanelName;
        }
        
        this.selectPanel(panelToSelect);
        
        try
        {
            if (Firebug.CommandLine)
            {
                if (panelToSelect == "Console")
                    Firebug.CommandLine.focus();
                else
                    Firebug.CommandLine.blur();
            }
        }
        catch(e)
        {
            //TODO: xxxpedro trace error
        }
        
        focusCommandLineState = ++focusCommandLineState % 2;
    }
    
});

// ************************************************************************************************
// ChromeFrameBase

/**
 * @namespace
 * @extends ns-chrome-ChromeBase 
 */ 
var ChromeFrameBase = extend(ChromeBase,
/**@extend ns-chrome-ChromeFrameBase*/
{
    create: function()
    {
        ChromeBase.create.call(this);
        
        // restore display for the anti-flicker trick
        if (isFirefox)
            this.node.style.display = "block";
        
        if (Env.Options.startInNewWindow)
        {
            this.close();
            this.toggle(true, true);
            return;
        }
        
        if (Env.Options.startOpened)
            this.open();
        else
            this.close();
    },
    
    destroy: function()
    {
        var size = Firebug.chrome.getWindowSize();
        
        Firebug.context.persistedState.height = size.height;
        
        if (Firebug.saveCookies)
            Firebug.savePrefs();
        
        removeGlobalEvent("keydown", onGlobalKeyDown);
        
        ChromeBase.destroy.call(this);
        
        this.document = null;
        delete this.document;
        
        this.window = null;
        delete this.window;
        
        this.node.parentNode.removeChild(this.node);
        this.node = null;
        delete this.node;
    },
    
    initialize: function()
    {
        //FBTrace.sysout("Frame", "initialize();")
        ChromeBase.initialize.call(this);
        
        this.addController(
            [Firebug.browser.window, "resize", this.resize],
            [$("fbWindow_btClose"), "click", this.close],
            [$("fbWindow_btDetach"), "click", this.detach],       
            [$("fbWindow_btDeactivate"), "click", this.deactivate]       
        );
        
        if (!Env.Options.enablePersistent)
            this.addController([Firebug.browser.window, "unload", Firebug.shutdown]);
        
        if (noFixedPosition)
        {
            this.addController(
                [Firebug.browser.window, "scroll", this.fixIEPosition]
            );
        }
        
        fbVSplitter.onmousedown = onVSplitterMouseDown;
        fbHSplitter.onmousedown = onHSplitterMouseDown;
        
        this.isInitialized = true;
    },
    
    shutdown: function()
    {
        fbVSplitter.onmousedown = null;
        fbHSplitter.onmousedown = null;
        
        ChromeBase.shutdown.apply(this);
        
        this.isInitialized = false;
    },
    
    reattach: function()
    {
        var frame = FirebugChrome.chromeMap.frame;
        
        ChromeBase.reattach(FirebugChrome.chromeMap.popup, this);
    },
    
    open: function()
    {
        if (!Firebug.context.persistedState.isOpen)
        {
            Firebug.context.persistedState.isOpen = true;
            
            if (Env.isChromeExtension)
                localStorage.setItem("Firebug", "1,1");
            
            var node = this.node;
            
            node.style.visibility = "hidden"; // Avoid flickering
            
            if (Firebug.showIconWhenHidden)
            {
                if (ChromeMini.isInitialized)
                {
                    ChromeMini.shutdown();
                }
                
            }
            else
                node.style.display = "block";
            
            var main = $("fbChrome");
            
            // IE6 throws an error when setting this property! why?
            //main.style.display = "table";
            main.style.display = "";
            
            var self = this;
                /// TODO: xxxpedro FOUC
                node.style.visibility = "visible";
            setTimeout(function(){
                ///node.style.visibility = "visible";
                
                //dispatch(Firebug.modules, "initialize", []);
                self.initialize();
                
                if (noFixedPosition)
                    self.fixIEPosition();
                
                self.draw();
        
            }, 10);
        }
    },
    
    close: function()
    {
        if (Firebug.context.persistedState.isOpen)
        {
            if (this.isInitialized)
            {
                //dispatch(Firebug.modules, "shutdown", []);
                this.shutdown();
            }
            
            Firebug.context.persistedState.isOpen = false;
            
            if (Env.isChromeExtension)
                localStorage.setItem("Firebug", "1,0");
            
            var node = this.node;
            
            if (Firebug.showIconWhenHidden)
            {
                node.style.visibility = "hidden"; // Avoid flickering
                
                // TODO: xxxpedro - persist IE fixed? 
                var main = $("fbChrome", FirebugChrome.chromeMap.frame.document);
                main.style.display = "none";
                        
                ChromeMini.initialize();
                
                node.style.visibility = "visible";
            }
            else
                node.style.display = "none";
        }
    },
    
    deactivate: function()
    {
        // if it is running as a Chrome extension, dispatch a message to the extension signaling
        // that Firebug should be deactivated for the current tab
        if (Env.isChromeExtension)
        {
            localStorage.removeItem("Firebug");
            Firebug.GoogleChrome.dispatch("FB_deactivate");

            // xxxpedro problem here regarding Chrome extension. We can't deactivate the whole
            // app, otherwise it won't be able to be reactivated without reloading the page.
            // but we need to stop listening global keys, otherwise the key activation won't work.
            Firebug.chrome.close();
        }
        else
        {
            Firebug.shutdown();
        }
    },
    
    fixIEPosition: function()
    {
        // fix IE problem with offset when not in fullscreen mode
        var doc = this.document;
        var offset = isIE ? doc.body.clientTop || doc.documentElement.clientTop: 0;
        
        var size = Firebug.browser.getWindowSize();
        var scroll = Firebug.browser.getWindowScrollPosition();
        var maxHeight = size.height;
        var height = this.node.offsetHeight;
        
        var bodyStyle = doc.body.currentStyle;
        
        this.node.style.top = maxHeight - height + scroll.top + "px";
        
        if ((this.type == "frame" || this.type == "div") && 
            (bodyStyle.marginLeft || bodyStyle.marginRight))
        {
            this.node.style.width = size.width + "px";
        }
        
        if (fbVSplitterStyle)
            fbVSplitterStyle.right = Firebug.context.persistedState.sidePanelWidth + "px";
        
        this.draw();
    }

});


// ************************************************************************************************
// ChromeMini

/**
 * @namespace
 * @extends FBL.Controller
 */  
var ChromeMini = extend(Controller,
/**@extend ns-chrome-ChromeMini*/ 
{
    create: function(chrome)
    {
        append(this, chrome);
        this.type = "mini";
    },
    
    initialize: function()
    {
        Controller.initialize.apply(this);
        
        var doc = FirebugChrome.chromeMap.frame.document;
        
        var mini = $("fbMiniChrome", doc);
        mini.style.display = "block";
        
        var miniIcon = $("fbMiniIcon", doc);
        var width = miniIcon.offsetWidth + 10;
        miniIcon.title = "Open " + Firebug.version;
        
        var errors = $("fbMiniErrors", doc);
        if (errors.offsetWidth)
            width += errors.offsetWidth + 10;
        
        var node = this.node;
        node.style.height = "27px";
        node.style.width = width + "px";
        node.style.left = "";
        node.style.right = 0;
        
        if (this.node.nodeName.toLowerCase() == "iframe")
        {
            node.setAttribute("allowTransparency", "true");
            this.document.body.style.backgroundColor = "transparent";
        }
        else
            node.style.background = "transparent";

        if (noFixedPosition)
            this.fixIEPosition();
        
        this.addController(
            [$("fbMiniIcon", doc), "click", onMiniIconClick]       
        );
        
        if (noFixedPosition)
        {
            this.addController(
                [Firebug.browser.window, "scroll", this.fixIEPosition]
            );
        }
        
        this.isInitialized = true;
    },
    
    shutdown: function()
    {
        var node = this.node;
        node.style.height = Firebug.context.persistedState.height + "px";
        node.style.width = "100%";
        node.style.left = 0;
        node.style.right = "";
        
        if (this.node.nodeName.toLowerCase() == "iframe")
        {
            node.setAttribute("allowTransparency", "false");
            this.document.body.style.backgroundColor = "#fff";
        }
        else
            node.style.background = "#fff";
        
        if (noFixedPosition)
            this.fixIEPosition();
        
        var doc = FirebugChrome.chromeMap.frame.document;
        
        var mini = $("fbMiniChrome", doc);
        mini.style.display = "none";
        
        Controller.shutdown.apply(this);
        
        this.isInitialized = false;
    },
    
    draw: function()
    {
    
    },
    
    fixIEPosition: ChromeFrameBase.fixIEPosition
    
});


// ************************************************************************************************
// ChromePopupBase

/**
 * @namespace
 * @extends ns-chrome-ChromeBase
 */  
var ChromePopupBase = extend(ChromeBase,
/**@extend ns-chrome-ChromePopupBase*/
{
    
    initialize: function()
    {
        setClass(this.document.body, "FirebugPopup");
        
        ChromeBase.initialize.call(this);
        
        this.addController(
            [Firebug.chrome.window, "resize", this.resize],
            [Firebug.chrome.window, "unload", this.destroy]
            //[Firebug.chrome.window, "beforeunload", this.destroy]
        );
        
        if (Env.Options.enablePersistent)
        {
            this.persist = bind(this.persist, this);
            addEvent(Firebug.browser.window, "unload", this.persist);
        }
        else
            this.addController(
                [Firebug.browser.window, "unload", this.close]
            );
        
        fbVSplitter.onmousedown = onVSplitterMouseDown;
    },
    
    destroy: function()
    {
        var chromeWin = Firebug.chrome.window; 
        var left = chromeWin.screenX || chromeWin.screenLeft;
        var top = chromeWin.screenY || chromeWin.screenTop;
        var size = Firebug.chrome.getWindowSize();
        
        Firebug.context.persistedState.popupTop = top;
        Firebug.context.persistedState.popupLeft = left;
        Firebug.context.persistedState.popupWidth = size.width;
        Firebug.context.persistedState.popupHeight = size.height;
        
        if (Firebug.saveCookies)
            Firebug.savePrefs();
        
        // TODO: xxxpedro sync detach reattach attach
        var frame = FirebugChrome.chromeMap.frame;
        
        if(frame)
        {
            dispatch(frame.panelMap, "detach", [this, frame]);
            
            frame.reattach(this, frame);
        }
        
        if (Env.Options.enablePersistent)
        {
            removeEvent(Firebug.browser.window, "unload", this.persist);
        }
        
        ChromeBase.destroy.apply(this);
        
        FirebugChrome.chromeMap.popup = null;
        
        this.node.close();
    },
    
    persist: function()
    {
        persistTimeStart = new Date().getTime();
        
        removeEvent(Firebug.browser.window, "unload", this.persist);
        
        Firebug.Inspector.destroy();
        Firebug.browser.window.FirebugOldBrowser = true;
        
        var persistTimeStart = new Date().getTime();
        
        var waitMainWindow = function()
        {
            var doc, head;
        
            try
            {
                if (window.opener && !window.opener.FirebugOldBrowser && (doc = window.opener.document)/* && 
                    doc.documentElement && (head = doc.documentElement.firstChild)*/)
                {
                    
                    try
                    {
                        // exposes the FBL to the global namespace when in debug mode
                        if (Env.isDebugMode)
                        {
                            window.FBL = FBL;
                        }
                        
                        window.Firebug = Firebug;
                        window.opener.Firebug = Firebug;
                
                        Env.browser = window.opener;
                        Firebug.browser = Firebug.context = new Context(Env.browser);
                        Firebug.loadPrefs();                        
                
                        registerConsole();
                
                        // the delay time should be calculated right after registering the 
                        // console, once right after the console registration, call log messages
                        // will be properly handled
                        var persistDelay = new Date().getTime() - persistTimeStart;
                
                        var chrome = Firebug.chrome;
                        addEvent(Firebug.browser.window, "unload", chrome.persist);
                
                        FBL.cacheDocument();
                        Firebug.Inspector.create();
                
                        Firebug.Console.logFormatted(
                            ["Firebug could not capture console calls during " +
                            persistDelay + "ms"],
                            Firebug.context,
                            "info"
                        );
                        
                        setTimeout(function(){
                            var htmlPanel = chrome.getPanel("HTML");
                            htmlPanel.createUI();
                        },50);
                        
                    }
                    catch(pE)
                    {
                        alert("persist error: " + (pE.message || pE));
                    }
                    
                }
                else
                {
                    window.setTimeout(waitMainWindow, 0);
                }
            
            } catch (E) {
                window.close();
            }
        };
        
        waitMainWindow();    
    },
    
    close: function()
    {
        this.destroy();
    }

});


//************************************************************************************************
// UI helpers

var changeCommandLineVisibility = function changeCommandLineVisibility(visibility)
{
    var last = Firebug.chrome.commandLineVisible;
    var visible = Firebug.chrome.commandLineVisible =  
        typeof visibility == "boolean" ? visibility : !Firebug.chrome.commandLineVisible;
    
    if (visible != last)
    {
        if (visible)
        {
            fbBottom.className = "";
            
            if (Firebug.CommandLine)
                Firebug.CommandLine.activate();
        }
        else
        {
            if (Firebug.CommandLine)
                Firebug.CommandLine.deactivate();
            
            fbBottom.className = "hide";
        }
    }
};

var changeSidePanelVisibility = function changeSidePanelVisibility(visibility)
{
    var last = Firebug.chrome.sidePanelVisible;
    Firebug.chrome.sidePanelVisible =  
        typeof visibility == "boolean" ? visibility : !Firebug.chrome.sidePanelVisible;
    
    if (Firebug.chrome.sidePanelVisible != last)
    {
        fbPanelBox2.className = Firebug.chrome.sidePanelVisible ? "" : "hide"; 
        fbPanelBar2Box.className = Firebug.chrome.sidePanelVisible ? "" : "hide";
    }
};


// ************************************************************************************************
// F12 Handler

var onGlobalKeyDown = function onGlobalKeyDown(event)
{
    var keyCode = event.keyCode;
    var shiftKey = event.shiftKey;
    var ctrlKey = event.ctrlKey;
    
    if (keyCode == 123 /* F12 */ && (!isFirefox && !shiftKey || shiftKey && isFirefox))
    {
        Firebug.chrome.toggle(false, ctrlKey);
        cancelEvent(event, true);

        // TODO: xxxpedro replace with a better solution. we're doing this
        // to allow reactivating with the F12 key after being deactivated
        if (Env.isChromeExtension)
        {
            Firebug.GoogleChrome.dispatch("FB_enableIcon");
        }
    }
    else if (keyCode == 67 /* C */ && ctrlKey && shiftKey)
    {
        Firebug.Inspector.toggleInspect();
        cancelEvent(event, true);
    }
    else if (keyCode == 76 /* L */ && ctrlKey && shiftKey)
    {
        Firebug.chrome.focusCommandLine();
        cancelEvent(event, true);
    }
};

var onMiniIconClick = function onMiniIconClick(event)
{
    Firebug.chrome.toggle(false, event.ctrlKey);
    cancelEvent(event, true);
};


// ************************************************************************************************
// Horizontal Splitter Handling

var onHSplitterMouseDown = function onHSplitterMouseDown(event)
{
    addGlobalEvent("mousemove", onHSplitterMouseMove);
    addGlobalEvent("mouseup", onHSplitterMouseUp);
    
    if (isIE)
        addEvent(Firebug.browser.document.documentElement, "mouseleave", onHSplitterMouseUp);
    
    fbHSplitter.className = "fbOnMovingHSplitter";
    
    return false;
};

var onHSplitterMouseMove = function onHSplitterMouseMove(event)
{
    cancelEvent(event, true);
    
    var clientY = event.clientY;
    var win = isIE
        ? event.srcElement.ownerDocument.parentWindow
        : event.target.defaultView || event.target.ownerDocument && event.target.ownerDocument.defaultView;
    
    if (!win)
        return;
    
    if (win != win.parent)
    {
        var frameElement = win.frameElement;
        if (frameElement)
        {
            var framePos = Firebug.browser.getElementPosition(frameElement).top;
            clientY += framePos;
            
            if (frameElement.style.position != "fixed")
                clientY -= Firebug.browser.getWindowScrollPosition().top;
        }
    }
    
    if (isOpera && isQuiksMode && win.frameElement.id == "FirebugUI")
    {
        clientY = Firebug.browser.getWindowSize().height - win.frameElement.offsetHeight + clientY;
    }
    
    /*
    console.log(
            typeof win.FBL != "undefined" ? "no-Chrome" : "Chrome",
            //win.frameElement.id,
            event.target,
            clientY
        );/**/
    
    onHSplitterMouseMoveBuffer = clientY; // buffer
    
    if (new Date().getTime() - lastHSplitterMouseMove > chromeRedrawSkipRate) // frame skipping
    {
        lastHSplitterMouseMove = new Date().getTime();
        handleHSplitterMouseMove();
    }
    else
        if (!onHSplitterMouseMoveTimer)
            onHSplitterMouseMoveTimer = setTimeout(handleHSplitterMouseMove, chromeRedrawSkipRate);
    
    // improving the resizing performance by canceling the mouse event.
    // canceling events will prevent the page to receive such events, which would imply
    // in more processing being expended.
    cancelEvent(event, true);
    return false;
};

var handleHSplitterMouseMove = function()
{
    if (onHSplitterMouseMoveTimer)
    {
        clearTimeout(onHSplitterMouseMoveTimer);
        onHSplitterMouseMoveTimer = null;
    }
    
    var clientY = onHSplitterMouseMoveBuffer;
    
    var windowSize = Firebug.browser.getWindowSize();
    var scrollSize = Firebug.browser.getWindowScrollSize();
    
    // compute chrome fixed size (top bar and command line)
    var commandLineHeight = Firebug.chrome.commandLineVisible ? fbCommandLine.offsetHeight : 0;
    var fixedHeight = topHeight + commandLineHeight;
    var chromeNode = Firebug.chrome.node;
    
    var scrollbarSize = !isIE && (scrollSize.width > windowSize.width) ? 17 : 0;
    
    //var height = !isOpera ? chromeNode.offsetTop + chromeNode.clientHeight : windowSize.height;
    var height =  windowSize.height;
    
    // compute the min and max size of the chrome
    var chromeHeight = Math.max(height - clientY + 5 - scrollbarSize, fixedHeight);
        chromeHeight = Math.min(chromeHeight, windowSize.height - scrollbarSize);

    Firebug.context.persistedState.height = chromeHeight;
    chromeNode.style.height = chromeHeight + "px";
    
    if (noFixedPosition)
        Firebug.chrome.fixIEPosition();
    
    Firebug.chrome.draw();
};

var onHSplitterMouseUp = function onHSplitterMouseUp(event)
{
    removeGlobalEvent("mousemove", onHSplitterMouseMove);
    removeGlobalEvent("mouseup", onHSplitterMouseUp);
    
    if (isIE)
        removeEvent(Firebug.browser.document.documentElement, "mouseleave", onHSplitterMouseUp);
    
    fbHSplitter.className = "";
    
    Firebug.chrome.draw();
    
    // avoid text selection in IE when returning to the document
    // after the mouse leaves the document during the resizing
    return false;
};


// ************************************************************************************************
// Vertical Splitter Handling

var onVSplitterMouseDown = function onVSplitterMouseDown(event)
{
    addGlobalEvent("mousemove", onVSplitterMouseMove);
    addGlobalEvent("mouseup", onVSplitterMouseUp);
    
    return false;
};

var onVSplitterMouseMove = function onVSplitterMouseMove(event)
{
    if (new Date().getTime() - lastVSplitterMouseMove > chromeRedrawSkipRate) // frame skipping
    {
        var target = event.target || event.srcElement;
        if (target && target.ownerDocument) // avoid error when cursor reaches out of the chrome
        {
            var clientX = event.clientX;
            var win = document.all
                ? event.srcElement.ownerDocument.parentWindow
                : event.target.ownerDocument.defaultView;
          
            if (win != win.parent)
                clientX += win.frameElement ? win.frameElement.offsetLeft : 0;
            
            var size = Firebug.chrome.getSize();
            var x = Math.max(size.width - clientX + 3, 6);
            
            Firebug.context.persistedState.sidePanelWidth = x;
            Firebug.chrome.draw();
        }
        
        lastVSplitterMouseMove = new Date().getTime();
    }
    
    cancelEvent(event, true);
    return false;
};

var onVSplitterMouseUp = function onVSplitterMouseUp(event)
{
    removeGlobalEvent("mousemove", onVSplitterMouseMove);
    removeGlobalEvent("mouseup", onVSplitterMouseUp);
    
    Firebug.chrome.draw();
};


// ************************************************************************************************
}});