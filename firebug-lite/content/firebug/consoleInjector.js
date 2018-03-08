/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

//const Cc = Components.classes;
//const Ci = Components.interfaces;
    
var frameCounters = {};
var traceRecursion = 0;

Firebug.Console.injector =
{
    install: function(context)
    {
        var win = context.window;
        
        var consoleHandler = new FirebugConsoleHandler(context, win);
        
        var properties = 
        [
            "log",
            "debug",
            "info",
            "warn",
            "error",
            "assert",
            "dir",
            "dirxml",
            "group",
            "groupCollapsed",
            "groupEnd",
            "time",
            "timeEnd",
            "count",
            "trace",
            "profile",
            "profileEnd",
            "clear",
            "open",
            "close"
        ];
        
        var Handler = function(name)
        {
            var c = consoleHandler;
            var f = consoleHandler[name];
            return function(){return f.apply(c,arguments);};
        };
        
        var installer = function(c)
        {
            for (var i=0, l=properties.length; i<l; i++)
            {
                var name = properties[i];
                c[name] = new Handler(name);
                c.firebuglite = Firebug.version;
            }
        };
        
        var sandbox;
        
        if (win.console)
        {
            if (Env.Options.overrideConsole)
                sandbox = new win.Function("arguments.callee.install(window.console={})");
            else
                // if there's a console object and overrideConsole is false we should just quit
                return;
        }
        else
        {
            try
            {
                // try overriding the console object
                sandbox = new win.Function("arguments.callee.install(window.console={})");
            }
            catch(E)
            {
                // if something goes wrong create the firebug object instead
                sandbox = new win.Function("arguments.callee.install(window.firebug={})");
            }
        }
        
        sandbox.install = installer;
        sandbox();
    },
    
    isAttached: function(context, win)
    {
        if (win.wrappedJSObject)
        {
            var attached = (win.wrappedJSObject._getFirebugConsoleElement ? true : false);
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("Console.isAttached:"+attached+" to win.wrappedJSObject "+safeGetWindowLocation(win.wrappedJSObject));

            return attached;
        }
        else
        {
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("Console.isAttached? to win "+win.location+" fnc:"+win._getFirebugConsoleElement);
            return (win._getFirebugConsoleElement ? true : false);
        }
    },

    attachIfNeeded: function(context, win)
    {
        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("Console.attachIfNeeded has win "+(win? ((win.wrappedJSObject?"YES":"NO")+" wrappedJSObject"):"null") );

        if (this.isAttached(context, win))
            return true;

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("Console.attachIfNeeded found isAttached false ");

        this.attachConsoleInjector(context, win);
        this.addConsoleListener(context, win);

        Firebug.Console.clearReloadWarning(context);

        var attached =  this.isAttached(context, win);
        if (attached)
            dispatch(Firebug.Console.fbListeners, "onConsoleInjected", [context, win]);

        return attached;
    },

    attachConsoleInjector: function(context, win)
    {
        var consoleInjection = this.getConsoleInjectionScript();  // Do it all here.

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("attachConsoleInjector evaluating in "+win.location, consoleInjection);

        Firebug.CommandLine.evaluateInWebPage(consoleInjection, context, win);

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("attachConsoleInjector evaluation completed for "+win.location);
    },

    getConsoleInjectionScript: function() {
        if (!this.consoleInjectionScript)
        {
            var script = "";
            script += "window.__defineGetter__('console', function() {\n";
            script += " return (window._firebug ? window._firebug : window.loadFirebugConsole()); })\n\n";

            script += "window.loadFirebugConsole = function() {\n";
            script += "window._firebug =  new _FirebugConsole();";

            if (FBTrace.DBG_CONSOLE)
                script += " window.dump('loadFirebugConsole '+window.location+'\\n');\n";

            script += " return window._firebug };\n";

            var theFirebugConsoleScript = getResource("chrome://firebug/content/consoleInjected.js");
            script += theFirebugConsoleScript;


            this.consoleInjectionScript = script;
        }
        return this.consoleInjectionScript;
    },

    forceConsoleCompilationInPage: function(context, win)
    {
        if (!win)
        {
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("no win in forceConsoleCompilationInPage!");
            return;
        }

        var consoleForcer = "window.loadFirebugConsole();";

        if (context.stopped)
            Firebug.Console.injector.evaluateConsoleScript(context);  // todo evaluate consoleForcer on stack
        else
            Firebug.CommandLine.evaluateInWebPage(consoleForcer, context, win);

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("forceConsoleCompilationInPage "+win.location, consoleForcer);
    },

    evaluateConsoleScript: function(context)
    {
        var scriptSource = this.getConsoleInjectionScript(); // TODO XXXjjb this should be getConsoleInjectionScript
        Firebug.Debugger.evaluate(scriptSource, context);
    },

    addConsoleListener: function(context, win)
    {
        if (!context.activeConsoleHandlers)  // then we have not been this way before
            context.activeConsoleHandlers = [];
        else
        {   // we've been this way before...
            for (var i=0; i<context.activeConsoleHandlers.length; i++)
            {
                if (context.activeConsoleHandlers[i].window == win)
                {
                    context.activeConsoleHandlers[i].detach();
                    if (FBTrace.DBG_CONSOLE)
                        FBTrace.sysout("consoleInjector addConsoleListener removed handler("+context.activeConsoleHandlers[i].handler_name+") from _firebugConsole in : "+win.location+"\n");
                    context.activeConsoleHandlers.splice(i,1);
                }
            }
        }

        // We need the element to attach our event listener.
        var element = Firebug.Console.getFirebugConsoleElement(context, win);
        if (element)
            element.setAttribute("FirebugVersion", Firebug.version); // Initialize Firebug version.
        else
            return false;

        var handler = new FirebugConsoleHandler(context, win);
        handler.attachTo(element);

        context.activeConsoleHandlers.push(handler);

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("consoleInjector addConsoleListener attached handler("+handler.handler_name+") to _firebugConsole in : "+win.location+"\n");
        return true;
    },

    detachConsole: function(context, win)
    {
        if (win && win.document)
        {
            var element = win.document.getElementById("_firebugConsole");
            if (element)
                element.parentNode.removeChild(element);
        }
    }
};

var total_handlers = 0;
var FirebugConsoleHandler = function FirebugConsoleHandler(context, win)
{
    this.window = win;

    this.attachTo = function(element)
    {
        this.element = element;
        // When raised on our injected element, callback to Firebug and append to console
        this.boundHandler = bind(this.handleEvent, this);
        this.element.addEventListener('firebugAppendConsole', this.boundHandler, true); // capturing
    };

    this.detach = function()
    {
        this.element.removeEventListener('firebugAppendConsole', this.boundHandler, true);
    };

    this.handler_name = ++total_handlers;
    this.handleEvent = function(event)
    {
        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("FirebugConsoleHandler("+this.handler_name+") "+event.target.getAttribute("methodName")+", event", event);
        if (!Firebug.CommandLine.CommandHandler.handle(event, this, win))
        {
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("FirebugConsoleHandler", this);

            var methodName = event.target.getAttribute("methodName");
            Firebug.Console.log($STRF("console.MethodNotSupported", [methodName]));
        }
    };

    this.firebuglite = Firebug.version;    

    this.init = function()
    {
        var consoleElement = win.document.getElementById('_firebugConsole');
        consoleElement.setAttribute("FirebugVersion", Firebug.version);
    };

    this.log = function()
    {
        logFormatted(arguments, "log");
    };

    this.debug = function()
    {
        logFormatted(arguments, "debug", true);
    };

    this.info = function()
    {
        logFormatted(arguments, "info", true);
    };

    this.warn = function()
    {
        logFormatted(arguments, "warn", true);
    };

    this.error = function()
    {
        //TODO: xxxpedro console error
        //if (arguments.length == 1)
        //{
        //    logAssert("error", arguments);  // add more info based on stack trace
        //}
        //else
        //{
            //Firebug.Errors.increaseCount(context);
            logFormatted(arguments, "error", true);  // user already added info
        //}
    };

    this.exception = function()
    {
        logAssert("error", arguments);
    };

    this.assert = function(x)
    {
        if (!x)
        {
            var rest = [];
            for (var i = 1; i < arguments.length; i++)
                rest.push(arguments[i]);
            logAssert("assert", rest);
        }
    };

    this.dir = function(o)
    {
        Firebug.Console.log(o, context, "dir", Firebug.DOMPanel.DirTable);
    };

    this.dirxml = function(o)
    {
        ///if (o instanceof Window)
        if (instanceOf(o, "Window"))
            o = o.document.documentElement;
        ///else if (o instanceof Document)
        else if (instanceOf(o, "Document"))
            o = o.documentElement;

        Firebug.Console.log(o, context, "dirxml", Firebug.HTMLPanel.SoloElement);
    };

    this.group = function()
    {
        //TODO: xxxpedro;
        //var sourceLink = getStackLink();
        var sourceLink = null;
        Firebug.Console.openGroup(arguments, null, "group", null, false, sourceLink);
    };

    this.groupEnd = function()
    {
        Firebug.Console.closeGroup(context);
    };

    this.groupCollapsed = function()
    {
        var sourceLink = getStackLink();
        // noThrottle true is probably ok, openGroups will likely be short strings.
        var row = Firebug.Console.openGroup(arguments, null, "group", null, true, sourceLink);
        removeClass(row, "opened");
    };

    this.profile = function(title)
    {
        logFormatted(["console.profile() not supported."], "warn", true);
        
        //Firebug.Profiler.startProfiling(context, title);
    };

    this.profileEnd = function()
    {
        logFormatted(["console.profile() not supported."], "warn", true);
        
        //Firebug.Profiler.stopProfiling(context);
    };

    this.count = function(key)
    {
        // TODO: xxxpedro console2: is there a better way to find a unique ID for the coun() call?
        var frameId = "0";
        //var frameId = FBL.getStackFrameId();
        if (frameId)
        {
            if (!frameCounters)
                frameCounters = {};

            if (key != undefined)
                frameId += key;

            var frameCounter = frameCounters[frameId];
            if (!frameCounter)
            {
                var logRow = logFormatted(["0"], null, true, true);

                frameCounter = {logRow: logRow, count: 1};
                frameCounters[frameId] = frameCounter;
            }
            else
                ++frameCounter.count;

            var label = key == undefined
                ? frameCounter.count
                : key + " " + frameCounter.count;

            frameCounter.logRow.firstChild.firstChild.nodeValue = label;
        }
    };

    this.trace = function()
    {
        var getFuncName = function getFuncName (f)
        {
            if (f.getName instanceof Function)
            {
                return f.getName();
            }
            if (f.name) // in FireFox, Function objects have a name property...
            {
                return f.name;
            }
            
            var name = f.toString().match(/function\s*([_$\w\d]*)/)[1];
            return name || "anonymous";
        };
        
        var wasVisited = function(fn)
        {
            for (var i=0, l=frames.length; i<l; i++)
            {
                if (frames[i].fn == fn)
                {
                    return true;
                }
            }
            
            return false;
        };
        
        traceRecursion++;
        
        if (traceRecursion > 1)
        {
            traceRecursion--;
            return;
        }
    
        var frames = [];
        
        for (var fn = arguments.callee.caller.caller; fn; fn = fn.caller)
        {
            if (wasVisited(fn)) break;
            
            var args = [];
            
            for (var i = 0, l = fn.arguments.length; i < l; ++i)
            {
                args.push({value: fn.arguments[i]});
            }

            frames.push({fn: fn, name: getFuncName(fn), args: args});
        }
        
        
        // ****************************************************************************************
        
        try
        {
            (0)();
        }
        catch(e)
        {
            var result = e;
            
            var stack = 
                result.stack || // Firefox / Google Chrome 
                result.stacktrace || // Opera
                "";
            
            stack = stack.replace(/\n\r|\r\n/g, "\n"); // normalize line breaks
            var items = stack.split(/[\n\r]/);
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // Google Chrome
            if (FBL.isSafari)
            {
                //var reChromeStackItem = /^\s+at\s+([^\(]+)\s\((.*)\)$/;
                //var reChromeStackItem = /^\s+at\s+(.*)((?:http|https|ftp|file):\/\/.*)$/;
                var reChromeStackItem = /^\s+at\s+(.*)((?:http|https|ftp|file):\/\/.*)$/;
                
                var reChromeStackItemName = /\s*\($/;
                var reChromeStackItemValue = /^(.+)\:(\d+\:\d+)\)?$/;
                
                var framePos = 0;
                for (var i=4, length=items.length; i<length; i++, framePos++)
                {
                    var frame = frames[framePos];
                    var item = items[i];
                    var match = item.match(reChromeStackItem);
                    
                    //Firebug.Console.log("["+ framePos +"]--------------------------");
                    //Firebug.Console.log(item);
                    //Firebug.Console.log("................");
                    
                    if (match)
                    {
                        var name = match[1];
                        if (name)
                        {
                            name = name.replace(reChromeStackItemName, "");
                            frame.name = name; 
                        }
                        
                        //Firebug.Console.log("name: "+name);
                        
                        var value = match[2].match(reChromeStackItemValue);
                        if (value)
                        {
                            frame.href = value[1];
                            frame.lineNo = value[2];
                            
                            //Firebug.Console.log("url: "+value[1]);
                            //Firebug.Console.log("line: "+value[2]);
                        }
                        //else
                        //    Firebug.Console.log(match[2]);
                        
                    }                
                }
            }
            /**/
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            else if (FBL.isFirefox)
            {
                // Firefox
                var reFirefoxStackItem = /^(.*)@(.*)$/;
                var reFirefoxStackItemValue = /^(.+)\:(\d+)$/;
                
                var framePos = 0;
                for (var i=2, length=items.length; i<length; i++, framePos++)
                {
                    var frame = frames[framePos] || {};
                    var item = items[i];
                    var match = item.match(reFirefoxStackItem);
                    
                    if (match)
                    {
                        var name = match[1];
                        
                        //Firebug.Console.logFormatted("name: "+name);
                        
                        var value = match[2].match(reFirefoxStackItemValue);
                        if (value)
                        {
                            frame.href = value[1];
                            frame.lineNo = value[2];
                            
                            //Firebug.Console.log("href: "+ value[1]);
                            //Firebug.Console.log("line: " + value[2]);
                        }
                        //else
                        //    Firebug.Console.logFormatted([match[2]]);
                    }                
                }
            }
            /**/
            
            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            /*
            else if (FBL.isOpera)
            {
                // Opera
                var reOperaStackItem = /^\s\s(?:\.\.\.\s\s)?Line\s(\d+)\sof\s(.+)$/;
                var reOperaStackItemValue = /^linked\sscript\s(.+)$/;
                
                for (var i=0, length=items.length; i<length; i+=2)
                {
                    var item = items[i];
                    
                    var match = item.match(reOperaStackItem);
                    
                    if (match)
                    {
                        //Firebug.Console.log(match[1]);
                        
                        var value = match[2].match(reOperaStackItemValue);
                        
                        if (value)
                        {
                            //Firebug.Console.log(value[1]);
                        }
                        //else
                        //    Firebug.Console.log(match[2]);
                        
                        //Firebug.Console.log("--------------------------");
                    }                
                }
            }
            /**/
        }
        
        //console.log(stack);
        //console.dir(frames);
        Firebug.Console.log({frames: frames}, context, "stackTrace", FirebugReps.StackTrace);
        
        traceRecursion--;
    };
    
    this.trace_ok = function()
    {
        var getFuncName = function getFuncName (f)
        {
            if (f.getName instanceof Function)
                return f.getName();
            if (f.name) // in FireFox, Function objects have a name property...
                return f.name;
            
            var name = f.toString().match(/function\s*([_$\w\d]*)/)[1];
            return name || "anonymous";
        };
        
        var wasVisited = function(fn)
        {
            for (var i=0, l=frames.length; i<l; i++)
            {
                if (frames[i].fn == fn)
                    return true;
            }
            
            return false;
        };
    
        var frames = [];
        
        for (var fn = arguments.callee.caller; fn; fn = fn.caller)
        {
            if (wasVisited(fn)) break;
            
            var args = [];
            
            for (var i = 0, l = fn.arguments.length; i < l; ++i)
            {
                args.push({value: fn.arguments[i]});
            }

            frames.push({fn: fn, name: getFuncName(fn), args: args});
        }
        
        Firebug.Console.log({frames: frames}, context, "stackTrace", FirebugReps.StackTrace);
    };
    
    this.clear = function()
    {
        Firebug.Console.clear(context);
    };

    this.time = function(name, reset)
    {
        if (!name)
            return;

        var time = new Date().getTime();

        if (!this.timeCounters)
            this.timeCounters = {};

        var key = "KEY"+name.toString();

        if (!reset && this.timeCounters[key])
            return;

        this.timeCounters[key] = time;
    };

    this.timeEnd = function(name)
    {
        var time = new Date().getTime();

        if (!this.timeCounters)
            return;

        var key = "KEY"+name.toString();

        var timeCounter = this.timeCounters[key];
        if (timeCounter)
        {
            var diff = time - timeCounter;
            var label = name + ": " + diff + "ms";

            this.info(label);

            delete this.timeCounters[key];
        }
        return diff;
    };

    // These functions are over-ridden by commandLine
    this.evaluated = function(result, context)
    {
        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("consoleInjector.FirebugConsoleHandler evalutated default called", result);

        Firebug.Console.log(result, context);
    };
    this.evaluateError = function(result, context)
    {
        Firebug.Console.log(result, context, "errorMessage");
    };

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    function logFormatted(args, className, linkToSource, noThrottle)
    {
        var sourceLink = linkToSource ? getStackLink() : null;
        return Firebug.Console.logFormatted(args, context, className, noThrottle, sourceLink);
    }

    function logAssert(category, args)
    {
        Firebug.Errors.increaseCount(context);

        if (!args || !args.length || args.length == 0)
            var msg = [FBL.$STR("Assertion")];
        else
            var msg = args[0];

        if (Firebug.errorStackTrace)
        {
            var trace = Firebug.errorStackTrace;
            delete Firebug.errorStackTrace;
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("logAssert trace from errorStackTrace", trace);
        }
        else if (msg.stack)
        {
            var trace = parseToStackTrace(msg.stack);
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("logAssert trace from msg.stack", trace);
        }
        else
        {
            var trace = getJSDUserStack();
            if (FBTrace.DBG_CONSOLE)
                FBTrace.sysout("logAssert trace from getJSDUserStack", trace);
        }

        var errorObject = new FBL.ErrorMessage(msg, (msg.fileName?msg.fileName:win.location), (msg.lineNumber?msg.lineNumber:0), "", category, context, trace);


        if (trace && trace.frames && trace.frames[0])
           errorObject.correctWithStackTrace(trace);

        errorObject.resetSource();

        var objects = errorObject;
        if (args.length > 1)
        {
            objects = [errorObject];
            for (var i = 1; i < args.length; i++)
                objects.push(args[i]);
        }

        var row = Firebug.Console.log(objects, context, "errorMessage", null, true); // noThrottle
        row.scrollIntoView();
    }

    function getComponentsStackDump()
    {
        // Starting with our stack, walk back to the user-level code
        var frame = Components.stack;
        var userURL = win.location.href.toString();

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("consoleInjector.getComponentsStackDump initial stack for userURL "+userURL, frame);

        // Drop frames until we get into user code.
        while (frame && FBL.isSystemURL(frame.filename) )
            frame = frame.caller;

        // Drop two more frames, the injected console function and firebugAppendConsole()
        if (frame)
            frame = frame.caller;
        if (frame)
            frame = frame.caller;

        if (FBTrace.DBG_CONSOLE)
            FBTrace.sysout("consoleInjector.getComponentsStackDump final stack for userURL "+userURL, frame);

        return frame;
    }

    function getStackLink()
    {
        // TODO: xxxpedro console2
        return;
        //return FBL.getFrameSourceLink(getComponentsStackDump());
    }

    function getJSDUserStack()
    {
        var trace = FBL.getCurrentStackTrace(context);

        var frames = trace ? trace.frames : null;
        if (frames && (frames.length > 0) )
        {
            var oldest = frames.length - 1;  // 6 - 1 = 5
            for (var i = 0; i < frames.length; i++)
            {
                if (frames[oldest - i].href.indexOf("chrome:") == 0) break;
                var fn = frames[oldest - i].fn + "";
                if (fn && (fn.indexOf("_firebugEvalEvent") != -1) ) break;  // command line
            }
            FBTrace.sysout("consoleInjector getJSDUserStack: "+frames.length+" oldest: "+oldest+" i: "+i+" i - oldest + 2: "+(i - oldest + 2), trace);
            trace.frames = trace.frames.slice(2 - i);  // take the oldest frames, leave 2 behind they are injection code

            return trace;
        }
        else
            return "Firebug failed to get stack trace with any frames";
    }
};

// ************************************************************************************************
// Register console namespace

FBL.registerConsole = function()
{
    var win = Env.browser.window;
    Firebug.Console.injector.install(win);
};

registerConsole();

}});
