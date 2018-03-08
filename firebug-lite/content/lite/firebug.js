/* See license.txt for terms of usage */

FBL.ns( /** @scope s_firebug */ function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Globals

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Internals

var modules = [];
var panelTypes = [];
var panelTypeMap = {};
var reps = [];

var parentPanelMap = {};


// ************************************************************************************************
// Firebug

/**
 * @namespace describe Firebug
 * @exports FBL.Firebug as Firebug
 */
FBL.Firebug = 
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    version:  "Firebug Lite 1.4.0",
    revision: "$Revision: 11967 $",
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    modules: modules,
    panelTypes: panelTypes,
    panelTypeMap: panelTypeMap,
    reps: reps,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Initialization
    
    initialize: function()
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.initialize", "initializing application");
        
        Firebug.browser = new Context(Env.browser);
        Firebug.context = Firebug.browser;
        
        Firebug.loadPrefs();
        Firebug.context.persistedState.isOpen = false;
        
        // Document must be cached before chrome initialization
        cacheDocument();
        
        if (Firebug.Inspector && Firebug.Inspector.create)
            Firebug.Inspector.create();
        
        if (FBL.CssAnalyzer && FBL.CssAnalyzer.processAllStyleSheets)
            FBL.CssAnalyzer.processAllStyleSheets(Firebug.browser.document);
        
        FirebugChrome.initialize();
        
        dispatch(modules, "initialize", []);
        
        if (Firebug.disableResourceFetching)
            Firebug.Console.logFormatted(["Some Firebug Lite features are not working because " +
            		"resource fetching is disabled. To enabled it set the Firebug Lite option " +
            		"\"disableResourceFetching\" to \"false\". More info at " +
            		"http://getfirebug.com/firebuglite#Options"], 
            		Firebug.context, "warn");
        
        if (Env.onLoad)
        {
            var onLoad = Env.onLoad;
            delete Env.onLoad;
            
            setTimeout(onLoad, 200);
        }
    },
  
    shutdown: function()
    {
        if (Firebug.saveCookies)
            Firebug.savePrefs();
        
        if (Firebug.Inspector)
            Firebug.Inspector.destroy();
        
        dispatch(modules, "shutdown", []);
        
        var chromeMap = FirebugChrome.chromeMap;
        
        for (var name in chromeMap)
        {
            if (chromeMap.hasOwnProperty(name))
            {
                try
                {
                    chromeMap[name].destroy();
                }
                catch(E)
                {
                    if (FBTrace.DBG_ERRORS) FBTrace.sysout("chrome.destroy() failed to: " + name);
                }
            }
        }
        
        Firebug.Lite.Cache.Element.clear();
        Firebug.Lite.Cache.StyleSheet.clear();
        
        Firebug.browser = null;
        Firebug.context = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Registration

    registerModule: function()
    {
        modules.push.apply(modules, arguments);

        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.registerModule");
    },

    registerPanel: function()
    {
        panelTypes.push.apply(panelTypes, arguments);

        for (var i = 0, panelType; panelType = arguments[i]; ++i)
        {
            panelTypeMap[panelType.prototype.name] = arguments[i];
            
            if (panelType.prototype.parentPanel)
                parentPanelMap[panelType.prototype.parentPanel] = 1;
        }
        
        if (FBTrace.DBG_INITIALIZE)
            for (var i = 0; i < arguments.length; ++i)
                FBTrace.sysout("Firebug.registerPanel", arguments[i].prototype.name);
    },
    
    registerRep: function()
    {
        reps.push.apply(reps, arguments);
    },

    unregisterRep: function()
    {
        for (var i = 0; i < arguments.length; ++i)
            remove(reps, arguments[i]);
    },

    setDefaultReps: function(funcRep, rep)
    {
        FBL.defaultRep = rep;
        FBL.defaultFuncRep = funcRep;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Reps

    getRep: function(object)
    {
        var type = typeof object;
        if (isIE && isFunction(object))
            type = "function";
        
        for (var i = 0; i < reps.length; ++i)
        {
            var rep = reps[i];
            try
            {
                if (rep.supportsObject(object, type))
                {
                    if (FBTrace.DBG_DOM)
                        FBTrace.sysout("getRep type: "+type+" object: "+object, rep);
                    return rep;
                }
            }
            catch (exc)
            {
                if (FBTrace.DBG_ERRORS)
                {
                    FBTrace.sysout("firebug.getRep FAILS: ", exc.message || exc);
                    FBTrace.sysout("firebug.getRep reps["+i+"/"+reps.length+"]: Rep="+reps[i].className);
                    // TODO: xxxpedro add trace to FBTrace logs like in Firebug
                    //firebug.trace();
                }
            }
        }

        return (type == 'function') ? defaultFuncRep : defaultRep;
    },

    getRepObject: function(node)
    {
        var target = null;
        for (var child = node; child; child = child.parentNode)
        {
            if (hasClass(child, "repTarget"))
                target = child;

            if (child.repObject)
            {
                if (!target && hasClass(child, "repIgnore"))
                    break;
                else
                    return child.repObject;
            }
        }
    },

    getRepNode: function(node)
    {
        for (var child = node; child; child = child.parentNode)
        {
            if (child.repObject)
                return child;
        }
    },

    getElementByRepObject: function(element, object)
    {
        for (var child = element.firstChild; child; child = child.nextSibling)
        {
            if (child.repObject == object)
                return child;
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Preferences
    
    getPref: function(name)
    {
        return Firebug[name];
    },
    
    setPref: function(name, value)
    {
        Firebug[name] = value;
        
        Firebug.savePrefs();
    },
    
    setPrefs: function(prefs)
    {
        for (var name in prefs)
        {
            if (prefs.hasOwnProperty(name))
                Firebug[name] = prefs[name];
        }
        
        Firebug.savePrefs();
    },
    
    restorePrefs: function()
    {
        var Options = Env.DefaultOptions;
        
        for (var name in Options)
        {
            Firebug[name] = Options[name];
        }
    },
    
    loadPrefs: function()
    {
        this.restorePrefs();
        
        var prefs = Store.get("FirebugLite") || {};
        var options = prefs.options;
        var persistedState = prefs.persistedState || FBL.defaultPersistedState;
        
        for (var name in options)
        {
            if (options.hasOwnProperty(name))
                Firebug[name] = options[name];
        }
        
        if (Firebug.context && persistedState)
            Firebug.context.persistedState = persistedState;
    },
    
    savePrefs: function()
    {
        var prefs = {
            options: {}
        };
        
        var EnvOptions = Env.Options;
        var options = prefs.options;
        for (var name in EnvOptions)
        {
            if (EnvOptions.hasOwnProperty(name))
            {
                options[name] = Firebug[name];
            }
        }
        
        var persistedState = Firebug.context.persistedState;
        if (!persistedState)
        {
            persistedState = Firebug.context.persistedState = FBL.defaultPersistedState;
        }
        
        prefs.persistedState = persistedState;
        
        Store.set("FirebugLite", prefs);
    },
    
    erasePrefs: function()
    {
        Store.remove("FirebugLite");
        this.restorePrefs();
    }
};

Firebug.restorePrefs();

// xxxpedro should we remove this?
window.Firebug = FBL.Firebug;

if (!Env.Options.enablePersistent ||
     Env.Options.enablePersistent && Env.isChromeContext || 
     Env.isDebugMode)
        Env.browser.window.Firebug = FBL.Firebug; 


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Other methods

FBL.cacheDocument = function cacheDocument()
{
    var ElementCache = Firebug.Lite.Cache.Element;
    var els = Firebug.browser.document.getElementsByTagName("*");
    for (var i=0, l=els.length, el; i<l; i++)
    {
        el = els[i];
        ElementCache(el);
    }
};

// ************************************************************************************************

/**
 * @class
 *  
 * Support for listeners registration. This object also extended by Firebug.Module so,
 * all modules supports listening automatically. Notice that array of listeners
 * is created for each intance of a module within initialize method. Thus all derived
 * module classes must ensure that Firebug.Module.initialize method is called for the
 * super class.
 */
Firebug.Listener = function()
{
    // The array is created when the first listeners is added.
    // It can't be created here since derived objects would share
    // the same array.
    this.fbListeners = null;
};

Firebug.Listener.prototype =
{
    addListener: function(listener)
    {
        if (!this.fbListeners)
            this.fbListeners = []; // delay the creation until the objects are created so 'this' causes new array for each module

        this.fbListeners.push(listener);
    },

    removeListener: function(listener)
    {
        remove(this.fbListeners, listener);  // if this.fbListeners is null, remove is being called with no add
    }
};

// ************************************************************************************************


// ************************************************************************************************
// Module

/**
 * @module Base class for all modules. Every derived module object must be registered using
 * <code>Firebug.registerModule</code> method. There is always one instance of a module object
 * per browser window.
 * @extends Firebug.Listener 
 */
Firebug.Module = extend(new Firebug.Listener(),
/** @extend Firebug.Module */
{
    /**
     * Called when the window is opened.
     */
    initialize: function()
    {
    },
  
    /**
     * Called when the window is closed.
     */
    shutdown: function()
    {
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    /**
     * Called when a new context is created but before the page is loaded.
     */
    initContext: function(context)
    {
    },
  
    /**
     * Called after a context is detached to a separate window;
     */
    reattachContext: function(browser, context)
    {
    },
  
    /**
     * Called when a context is destroyed. Module may store info on persistedState for reloaded pages.
     */
    destroyContext: function(context, persistedState)
    {
    },
  
    // Called when a FF tab is create or activated (user changes FF tab)
    // Called after context is created or with context == null (to abort?)
    showContext: function(browser, context)
    {
    },
  
    /**
     * Called after a context's page gets DOMContentLoaded
     */
    loadedContext: function(context)
    {
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    showPanel: function(browser, panel)
    {
    },
  
    showSidePanel: function(browser, panel)
    {
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
  
    updateOption: function(name, value)
    {
    },
  
    getObjectByURL: function(context, url)
    {
    }
});

// ************************************************************************************************
// Panel

/**
 * @panel Base class for all panels. Every derived panel must define a constructor and
 * register with "Firebug.registerPanel" method. An instance of the panel
 * object is created by the framework for each browser tab where Firebug is activated.
 */
Firebug.Panel =
{
    name: "HelloWorld",
    title: "Hello World!",
    
    parentPanel: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    options: {
        hasCommandLine: false,
        hasStatusBar: false,
        hasToolButtons: false,
        
        // Pre-rendered panels are those included in the skin file (firebug.html)
        isPreRendered: false,
        innerHTMLSync: false
        
        /*
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // To be used by external extensions
        panelHTML: "",
        panelCSS: "",
        
        toolButtonsHTML: ""
        /**/
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    tabNode: null,
    panelNode: null,
    sidePanelNode: null,
    statusBarNode: null,
    toolButtonsNode: null,

    panelBarNode: null,
    
    sidePanelBarBoxNode: null,
    sidePanelBarNode: null,            
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    sidePanelBar: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    searchable: false,
    editable: true,
    order: 2147483647,
    statusSeparator: "<",
    
    create: function(context, doc)
    {
        this.hasSidePanel = parentPanelMap.hasOwnProperty(this.name); 
        
        this.panelBarNode = $("fbPanelBar1");
        this.sidePanelBarBoxNode = $("fbPanelBar2");
        
        if (this.hasSidePanel)
        {
            this.sidePanelBar = extend({}, PanelBar);
            this.sidePanelBar.create(this);
        }
        
        var options = this.options = extend(Firebug.Panel.options, this.options);
        var panelId = "fb" + this.name;
        
        if (options.isPreRendered)
        {
            this.panelNode = $(panelId);
            
            this.tabNode = $(panelId + "Tab");
            this.tabNode.style.display = "block";
            
            if (options.hasToolButtons)
            {
                this.toolButtonsNode = $(panelId + "Buttons");
            }
            
            if (options.hasStatusBar)
            {
                this.statusBarBox = $("fbStatusBarBox");
                this.statusBarNode = $(panelId + "StatusBar");
            }
        }
        else
        {
            var containerSufix = this.parentPanel ? "2" : "1";
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Create Panel
            var panelNode = this.panelNode = createElement("div", {
                id: panelId,
                className: "fbPanel"
            });

            $("fbPanel" + containerSufix).appendChild(panelNode);
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Create Panel Tab
            var tabHTML = '<span class="fbTabL"></span><span class="fbTabText">' +
                    this.title + '</span><span class="fbTabR"></span>';            
            
            var tabNode = this.tabNode = createElement("a", {
                id: panelId + "Tab",
                className: "fbTab fbHover",
                innerHTML: tabHTML
            });
            
            if (isIE6)
            {
                tabNode.href = "javascript:void(0)";
            }
            
            var panelBarNode = this.parentPanel ? 
                    Firebug.chrome.getPanel(this.parentPanel).sidePanelBarNode :
                    this.panelBarNode;
            
            panelBarNode.appendChild(tabNode);
            tabNode.style.display = "block";
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // create ToolButtons
            if (options.hasToolButtons)
            {
                this.toolButtonsNode = createElement("span", {
                    id: panelId + "Buttons",
                    className: "fbToolbarButtons"
                });
                
                $("fbToolbarButtons").appendChild(this.toolButtonsNode);
            }
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // create StatusBar
            if (options.hasStatusBar)
            {
                this.statusBarBox = $("fbStatusBarBox");
                
                this.statusBarNode = createElement("span", {
                    id: panelId + "StatusBar",
                    className: "fbToolbarButtons fbStatusBar"
                });
                
                this.statusBarBox.appendChild(this.statusBarNode);
            }
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // create SidePanel
        }
        
        this.containerNode = this.panelNode.parentNode;
        
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.Panel.create", this.name);
        
        // xxxpedro contextMenu
        this.onContextMenu = bind(this.onContextMenu, this);
        
        /*
        this.context = context;
        this.document = doc;

        this.panelNode = doc.createElement("div");
        this.panelNode.ownerPanel = this;

        setClass(this.panelNode, "panelNode panelNode-"+this.name+" contextUID="+context.uid);
        doc.body.appendChild(this.panelNode);

        if (FBTrace.DBG_INITIALIZE)
            FBTrace.sysout("firebug.initialize panelNode for "+this.name+"\n");

        this.initializeNode(this.panelNode);
        /**/
    },

    destroy: function(state) // Panel may store info on state
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.Panel.destroy", this.name);
        
        if (this.hasSidePanel)
        {
            this.sidePanelBar.destroy();
            this.sidePanelBar = null;
        }
        
        this.options = null;
        this.name = null;
        this.parentPanel = null;
        
        this.tabNode = null;
        this.panelNode = null;
        this.containerNode = null;
        
        this.toolButtonsNode = null;
        this.statusBarBox = null;
        this.statusBarNode = null;
        
        //if (this.panelNode)
        //    delete this.panelNode.ownerPanel;

        //this.destroyNode();
    },
    
    initialize: function()
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.Panel.initialize", this.name);
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        if (this.hasSidePanel)
        {
            this.sidePanelBar.initialize();
        }
        
        var options = this.options = extend(Firebug.Panel.options, this.options);
        var panelId = "fb" + this.name;
        
        this.panelNode = $(panelId);
        
        this.tabNode = $(panelId + "Tab");
        this.tabNode.style.display = "block";
        
        if (options.hasStatusBar)
        {
            this.statusBarBox = $("fbStatusBarBox");
            this.statusBarNode = $(panelId + "StatusBar");
        }
        
        if (options.hasToolButtons)
        {
            this.toolButtonsNode = $(panelId + "Buttons");
        }
            
        this.containerNode = this.panelNode.parentNode;
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // restore persistent state
        this.containerNode.scrollTop = this.lastScrollTop;
        
        // xxxpedro contextMenu
        addEvent(this.containerNode, "contextmenu", this.onContextMenu);
        
        
        /// TODO: xxxpedro infoTip Hack
        Firebug.chrome.currentPanel = 
                Firebug.chrome.selectedPanel && Firebug.chrome.selectedPanel.sidePanelBar ?
                Firebug.chrome.selectedPanel.sidePanelBar.selectedPanel : 
                Firebug.chrome.selectedPanel;
        
        Firebug.showInfoTips = true;
        if (Firebug.InfoTip)
            Firebug.InfoTip.initializeBrowser(Firebug.chrome);
    },
    
    shutdown: function()
    {
        if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("Firebug.Panel.shutdown", this.name);
        
        /// TODO: xxxpedro infoTip Hack
        if (Firebug.InfoTip)
            Firebug.InfoTip.uninitializeBrowser(Firebug.chrome);
        
        if (Firebug.chrome.largeCommandLineVisible)
            Firebug.chrome.hideLargeCommandLine();
            
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        if (this.hasSidePanel)
        {
            // TODO: xxxpedro firebug1.3a6 
            // new PanelBar mechanism will need to call shutdown to hide the panels (so it 
            // doesn't appears in other panel's sidePanelBar. Therefore, we need to implement 
            // a "remember selected panel" feature in the sidePanelBar
            //this.sidePanelBar.shutdown();
        }
        
        // store persistent state
        this.lastScrollTop = this.containerNode.scrollTop;
        
        // xxxpedro contextMenu
        removeEvent(this.containerNode, "contextmenu", this.onContextMenu);
    },

    detach: function(oldChrome, newChrome)
    {
        if (oldChrome && oldChrome.selectedPanel && oldChrome.selectedPanel.name == this.name)
            this.lastScrollTop = oldChrome.selectedPanel.containerNode.scrollTop;
    },

    reattach: function(doc)
    {
        if (this.options.innerHTMLSync)
            this.synchronizeUI();
    },
    
    synchronizeUI: function()
    {
        this.containerNode.scrollTop = this.lastScrollTop || 0;
    },

    show: function(state)
    {
        var options = this.options;
        
        if (options.hasStatusBar)
        {
            this.statusBarBox.style.display = "inline";
            this.statusBarNode.style.display = "inline";
        }
        
        if (options.hasToolButtons)
        {
            this.toolButtonsNode.style.display = "inline";
        }
        
        this.panelNode.style.display = "block";
        
        this.visible = true;
        
        if (!this.parentPanel)
            Firebug.chrome.layout(this);
    },

    hide: function(state)
    {
        var options = this.options;
        
        if (options.hasStatusBar)
        {
            this.statusBarBox.style.display = "none";
            this.statusBarNode.style.display = "none";
        }
        
        if (options.hasToolButtons)
        {
            this.toolButtonsNode.style.display = "none";
        }
        
        this.panelNode.style.display = "none";
        
        this.visible = false;
    },

    watchWindow: function(win)
    {
    },

    unwatchWindow: function(win)
    {
    },

    updateOption: function(name, value)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Toolbar helpers
     */
    showToolbarButtons: function(buttonsId, show)
    {
        try
        {
            if (!this.context.browser) // XXXjjb this is bug. Somehow the panel context is not FirebugContext.
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("firebug.Panel showToolbarButtons this.context has no browser, this:", this);

                return;
            }
            var buttons = this.context.browser.chrome.$(buttonsId);
            if (buttons)
                collapse(buttons, show ? "false" : "true");
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
            {
                FBTrace.dumpProperties("firebug.Panel showToolbarButtons FAILS", exc);
                if (!this.context.browser)FBTrace.dumpStack("firebug.Panel showToolbarButtons no browser");
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    /**
     * Returns a number indicating the view's ability to inspect the object.
     *
     * Zero means not supported, and higher numbers indicate specificity.
     */
    supportsObject: function(object)
    {
        return 0;
    },

    hasObject: function(object)  // beyond type testing, is this object selectable?
    {
        return false;
    },

    select: function(object, forceUpdate)
    {
        if (!object)
            object = this.getDefaultSelection(this.context);

        if(FBTrace.DBG_PANELS)
            FBTrace.sysout("firebug.select "+this.name+" forceUpdate: "+forceUpdate+" "+object+((object==this.selection)?"==":"!=")+this.selection);

        if (forceUpdate || object != this.selection)
        {
            this.selection = object;
            this.updateSelection(object);

            // TODO: xxxpedro
            // XXXjoe This is kind of cheating, but, feh.
            //Firebug.chrome.onPanelSelect(object, this);
            //if (uiListeners.length > 0)
            //    dispatch(uiListeners, "onPanelSelect", [object, this]);  // TODO: make Firebug.chrome a uiListener
        }
    },

    updateSelection: function(object)
    {
    },

    markChange: function(skipSelf)
    {
        if (this.dependents)
        {
            if (skipSelf)
            {
                for (var i = 0; i < this.dependents.length; ++i)
                {
                    var panelName = this.dependents[i];
                    if (panelName != this.name)
                        this.context.invalidatePanels(panelName);
                }
            }
            else
                this.context.invalidatePanels.apply(this.context, this.dependents);
        }
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    startInspecting: function()
    {
    },

    stopInspecting: function(object, cancelled)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    search: function(text, reverse)
    {
    },

    /**
     * Retrieves the search options that this modules supports.
     * This is used by the search UI to present the proper options.
     */
    getSearchOptionsMenuItems: function()
    {
        return [
            Firebug.Search.searchOptionMenu("search.Case Sensitive", "searchCaseSensitive")
        ];
    },

    /**
     * Navigates to the next document whose match parameter returns true.
     */
    navigateToNextDocument: function(match, reverse)
    {
        // This is an approximation of the UI that is displayed by the location
        // selector. This should be close enough, although it may be better
        // to simply generate the sorted list within the module, rather than
        // sorting within the UI.
        var self = this;
        function compare(a, b) {
            var locA = self.getObjectDescription(a);
            var locB = self.getObjectDescription(b);
            if(locA.path > locB.path)
                return 1;
            if(locA.path < locB.path)
                return -1;
            if(locA.name > locB.name)
                return 1;
            if(locA.name < locB.name)
                return -1;
            return 0;
        }
        var allLocs = this.getLocationList().sort(compare);
        for (var curPos = 0; curPos < allLocs.length && allLocs[curPos] != this.location; curPos++);

        function transformIndex(index) {
            if (reverse) {
                // For the reverse case we need to implement wrap around.
                var intermediate = curPos - index - 1;
                return (intermediate < 0 ? allLocs.length : 0) + intermediate;
            } else {
                return (curPos + index + 1) % allLocs.length;
            }
        };

        for (var next = 0; next < allLocs.length - 1; next++)
        {
            var object = allLocs[transformIndex(next)];

            if (match(object))
            {
                this.navigate(object);
                return object;
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    // Called when "Options" clicked. Return array of
    // {label: 'name', nol10n: true,  type: "checkbox", checked: <value>, command:function to set <value>}
    getOptionsMenuItems: function()
    {
        return null;
    },

    /*
     * Called by chrome.onContextMenu to build the context menu when this panel has focus.
     * See also FirebugRep for a similar function also called by onContextMenu
     * Extensions may monkey patch and chain off this call
     * @param object: the 'realObject', a model value, eg a DOM property
     * @param target: the HTML element clicked on.
     * @return an array of menu items.
     */
    getContextMenuItems: function(object, target)
    {
        return [];
    },

    getBreakOnMenuItems: function()
    {
        return [];
    },

    getEditor: function(target, value)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getDefaultSelection: function()
    {
        return null;
    },

    browseObject: function(object)
    {
    },

    getPopupObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    getTooltipObject: function(target)
    {
        return Firebug.getRepObject(target);
    },

    showInfoTip: function(infoTip, x, y)
    {

    },

    getObjectPath: function(object)
    {
        return null;
    },

    // An array of objects that can be passed to getObjectLocation.
    // The list of things a panel can show, eg sourceFiles.
    // Only shown if panel.location defined and supportsObject true
    getLocationList: function()
    {
        return null;
    },

    getDefaultLocation: function()
    {
        return null;
    },

    getObjectLocation: function(object)
    {
        return "";
    },

    // Text for the location list menu eg script panel source file list
    // return.path: group/category label, return.name: item label
    getObjectDescription: function(object)
    {
        var url = this.getObjectLocation(object);
        return FBL.splitURLBase(url);
    },

    /*
     *  UI signal that a tab needs attention, eg Script panel is currently stopped on a breakpoint
     *  @param: show boolean, true turns on.
     */
    highlight: function(show)
    {
        var tab = this.getTab();
        if (!tab)
            return;

        if (show)
            tab.setAttribute("highlight", "true");
        else
            tab.removeAttribute("highlight");
    },

    getTab: function()
    {
        var chrome = Firebug.chrome;

        var tab = chrome.$("fbPanelBar2").getTab(this.name);
        if (!tab)
            tab = chrome.$("fbPanelBar1").getTab(this.name);
        return tab;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Support for Break On Next

    /**
     * Called by the framework when the user clicks on the Break On Next button.
     * @param {Boolean} armed Set to true if the Break On Next feature is
     * to be armed for action and set to false if the Break On Next should be disarmed.
     * If 'armed' is true, then the next call to shouldBreakOnNext should be |true|.
     */
    breakOnNext: function(armed)
    {
    },

    /**
     * Called when a panel is selected/displayed. The method should return true
     * if the Break On Next feature is currently armed for this panel.
     */
    shouldBreakOnNext: function()
    {
        return false;
    },

    /**
     * Returns labels for Break On Next tooltip (one for enabled and one for disabled state).
     * @param {Boolean} enabled Set to true if the Break On Next feature is
     * currently activated for this panel.
     */
    getBreakOnNextTooltip: function(enabled)
    {
        return null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    // xxxpedro contextMenu
    onContextMenu: function(event)
    {
        if (!this.getContextMenuItems)
            return;
        
        cancelEvent(event, true);

        var target = event.target || event.srcElement;
        
        var menu = this.getContextMenuItems(this.selection, target);
        if (!menu) 
            return;
        
        var contextMenu = new Menu(
        {
            id: "fbPanelContextMenu",
            
            items: menu
        });
        
        contextMenu.show(event.clientX, event.clientY);
        
        return true;
        
        /*
        // TODO: xxxpedro move code to somewhere. code to get cross-browser
        // window to screen coordinates
        var box = Firebug.browser.getElementPosition(Firebug.chrome.node);
        
        var screenY = 0;
        
        // Firefox
        if (typeof window.mozInnerScreenY != "undefined")
        {
            screenY = window.mozInnerScreenY; 
        }
        // Chrome
        else if (typeof window.innerHeight != "undefined")
        {
            screenY = window.outerHeight - window.innerHeight;
        }
        // IE
        else if (typeof window.screenTop != "undefined")
        {
            screenY = window.screenTop;
        }
        
        contextMenu.show(event.screenX-box.left, event.screenY-screenY-box.top);
        /**/
    }
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
};


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

/**
 * MeasureBox
 * To get pixels size.width and size.height:
 * <ul><li>     this.startMeasuring(view); </li>
 *     <li>     var size = this.measureText(lineNoCharsSpacer); </li>
 *     <li>     this.stopMeasuring(); </li>
 * </ul>
 *  
 * @namespace
 */
Firebug.MeasureBox =
{
    startMeasuring: function(target)
    {
        if (!this.measureBox)
        {
            this.measureBox = target.ownerDocument.createElement("span");
            this.measureBox.className = "measureBox";
        }

        copyTextStyles(target, this.measureBox);
        target.ownerDocument.body.appendChild(this.measureBox);
    },

    getMeasuringElement: function()
    {
        return this.measureBox;
    },

    measureText: function(value)
    {
        this.measureBox.innerHTML = value ? escapeForSourceLine(value) : "m";
        return {width: this.measureBox.offsetWidth, height: this.measureBox.offsetHeight-1};
    },

    measureInputText: function(value)
    {
        value = value ? escapeForTextNode(value) : "m";
        if (!Firebug.showTextNodesWithWhitespace)
            value = value.replace(/\t/g,'mmmmmm').replace(/\ /g,'m');
        this.measureBox.innerHTML = value;
        return {width: this.measureBox.offsetWidth, height: this.measureBox.offsetHeight-1};
    },

    getBox: function(target)
    {
        var style = this.measureBox.ownerDocument.defaultView.getComputedStyle(this.measureBox, "");
        var box = getBoxFromStyles(style, this.measureBox);
        return box;
    },

    stopMeasuring: function()
    {
        this.measureBox.parentNode.removeChild(this.measureBox);
    }
};


// ************************************************************************************************
if (FBL.domplate) Firebug.Rep = domplate(
{
    className: "",
    inspectable: true,

    supportsObject: function(object, type)
    {
        return false;
    },

    inspectObject: function(object, context)
    {
        Firebug.chrome.select(object);
    },

    browseObject: function(object, context)
    {
    },

    persistObject: function(object, context)
    {
    },

    getRealObject: function(object, context)
    {
        return object;
    },

    getTitle: function(object)
    {
        var label = safeToString(object);

        var re = /\[object (.*?)\]/;
        var m = re.exec(label);
        
        ///return m ? m[1] : label;
        
        // if the label is in the "[object TYPE]" format return its type
        if (m)
        {
            return m[1];
        }
        // if it is IE we need to handle some special cases
        else if (
                // safeToString() fails to recognize some objects in IE
                isIE && 
                // safeToString() returns "[object]" for some objects like window.Image 
                (label == "[object]" || 
                // safeToString() returns undefined for some objects like window.clientInformation 
                typeof object == "object" && typeof label == "undefined")
            )
        {
            return "Object";
        }
        else
        {
            return label;
        }
    },

    getTooltip: function(object)
    {
        return null;
    },

    getContextMenuItems: function(object, target, context)
    {
        return [];
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Convenience for domplates

    STR: function(name)
    {
        return $STR(name);
    },

    cropString: function(text)
    {
        return cropString(text);
    },

    cropMultipleLines: function(text, limit)
    {
        return cropMultipleLines(text, limit);
    },

    toLowerCase: function(text)
    {
        return text ? text.toLowerCase() : text;
    },

    plural: function(n)
    {
        return n == 1 ? "" : "s";
    }
});

// ************************************************************************************************


// ************************************************************************************************
}});