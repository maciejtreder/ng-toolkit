/* See license.txt for terms of usage */

FBL.ns( /**@scope s_context*/ function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Globals

var refreshDelay = 300;

// Opera and some versions of webkit returns the wrong value of document.elementFromPoint()
// function, without taking into account the scroll position. Safari 4 (webkit/531.21.8) 
// still have this issue. Google Chrome 4 (webkit/532.5) does not. So, we're assuming this 
// issue was fixed in the 532 version
var shouldFixElementFromPoint = isOpera || isSafari && browserVersion < "532";

var evalError = "___firebug_evaluation_error___";
var pixelsPerInch;

var resetStyle = "margin:0; padding:0; border:0; position:absolute; overflow:hidden; display:block;";
var offscreenStyle = resetStyle + "top:-1234px; left:-1234px;";


// ************************************************************************************************
// Context

/** @class */
FBL.Context = function(win)
{
    this.window = win.window;
    this.document = win.document;
    
    this.browser = Env.browser;
    
    // Some windows in IE, like iframe, doesn't have the eval() method
    if (isIE && !this.window.eval)
    {
        // But after executing the following line the method magically appears!
        this.window.execScript("null");
        // Just to make sure the "magic" really happened
        if (!this.window.eval)
            throw new Error("Firebug Error: eval() method not found in this window");
    }
    
    // Create a new "black-box" eval() method that runs in the global namespace
    // of the context window, without exposing the local variables declared
    // by the function that calls it
    this.eval = this.window.eval("new Function('" +
            "try{ return window.eval.apply(window,arguments) }catch(E){ E."+evalError+"=true; return E }" +
        "')");
};

FBL.Context.prototype =
{  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // partial-port of Firebug tabContext.js
    
    browser: null,
    loaded: true,
    
    setTimeout: function(fn, delay)
    {
        var win = this.window;
        
        if (win.setTimeout == this.setTimeout)
            throw new Error("setTimeout recursion");
        
        var timeout = win.setTimeout.apply ? // IE doesn't have apply method on setTimeout
                win.setTimeout.apply(win, arguments) :
                win.setTimeout(fn, delay);

        if (!this.timeouts)
            this.timeouts = {};

        this.timeouts[timeout] = 1;

        return timeout;
    },

    clearTimeout: function(timeout)
    {
        clearTimeout(timeout);

        if (this.timeouts)
            delete this.timeouts[timeout];
    },

    setInterval: function(fn, delay)
    {
        var win = this.window;
        
        var timeout = win.setInterval.apply ? // IE doesn't have apply method on setTimeout
                win.setInterval.apply(win, arguments) :
                win.setInterval(fn, delay);

        if (!this.intervals)
            this.intervals = {};

        this.intervals[timeout] = 1;

        return timeout;
    },

    clearInterval: function(timeout)
    {
        clearInterval(timeout);

        if (this.intervals)
            delete this.intervals[timeout];
    },

    invalidatePanels: function()
    {
        if (!this.invalidPanels)
            this.invalidPanels = {};

        for (var i = 0; i < arguments.length; ++i)
        {
            var panelName = arguments[i];
            
            // avoid error. need to create a better getPanel() function as explained below
            if (!Firebug.chrome || !Firebug.chrome.selectedPanel)
                return;
            
            //var panel = this.getPanel(panelName, true);
            //TODO: xxxpedro context how to get all panels using a single function?
            // the current workaround to make the invalidation works is invalidating
            // only sidePanels. There's also a problem with panel name (LowerCase in Firebug Lite)
            var panel = Firebug.chrome.selectedPanel.sidePanelBar ?
                    Firebug.chrome.selectedPanel.sidePanelBar.getPanel(panelName, true) :
                    null;
            
            if (panel && !panel.noRefresh)
                this.invalidPanels[panelName] = 1;
        }

        if (this.refreshTimeout)
        {
            this.clearTimeout(this.refreshTimeout);
            delete this.refreshTimeout;
        }

        this.refreshTimeout = this.setTimeout(bindFixed(function()
        {
            var invalids = [];

            for (var panelName in this.invalidPanels)
            {
                //var panel = this.getPanel(panelName, true);
                //TODO: xxxpedro context how to get all panels using a single function?
                // the current workaround to make the invalidation works is invalidating
                // only sidePanels. There's also a problem with panel name (LowerCase in Firebug Lite)
                var panel = Firebug.chrome.selectedPanel.sidePanelBar ?
                        Firebug.chrome.selectedPanel.sidePanelBar.getPanel(panelName, true) :
                        null;

                if (panel)
                {
                    if (panel.visible && !panel.editing)
                        panel.refresh();
                    else
                        panel.needsRefresh = true;

                    // If the panel is being edited, we'll keep trying to
                    // refresh it until editing is done
                    if (panel.editing)
                        invalids.push(panelName);
                }
            }

            delete this.invalidPanels;
            delete this.refreshTimeout;

            // Keep looping until every tab is valid
            if (invalids.length)
                this.invalidatePanels.apply(this, invalids);
        }, this), refreshDelay);
    },
    
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Evalutation Method
    
    /**
     * Evaluates an expression in the current context window.
     * 
     * @param {String}   expr           expression to be evaluated
     * 
     * @param {String}   context        string indicating the global location
     *                                  of the object that will be used as the
     *                                  context. The context is referred in
     *                                  the expression as the "this" keyword.
     *                                  If no context is informed, the "window"
     *                                  context is used.
     *                                  
     * @param {String}   api            string indicating the global location
     *                                  of the object that will be used as the
     *                                  api of the evaluation.
     *                                  
     * @param {Function} errorHandler(message) error handler to be called
     *                                         if the evaluation fails.
     */
    evaluate: function(expr, context, api, errorHandler)
    {
        // the default context is the "window" object. It can be any string that represents
        // a global accessible element as: "my.namespaced.object"
        context = context || "window";
        
        var isObjectLiteral = trim(expr).indexOf("{") == 0,
            cmd,
            result;
        
        // if the context is the "window" object, we don't need a closure
        if (context == "window")
        {
            // If it is an object literal, then wrap the expression with parenthesis so we can 
            // capture the return value
            if (isObjectLiteral)
            {
                cmd = api ?
                    "with("+api+"){ ("+expr+") }" :
                    "(" + expr + ")";
            }
            else
            {
                cmd = api ?
                    "with("+api+"){ "+expr+" }" :
                    expr;
            }
        }
        else
        {
            cmd = api ?
                // with API and context, no return value
                "(function(arguments){ with(" + api + "){ " +
                    expr + 
                " } }).call(" + context + ",undefined)"
                :
                // with context only, no return value
                "(function(arguments){ " + 
                    expr + 
                " }).call(" + context + ",undefined)";
        }
        
        result = this.eval(cmd);
        
        if (result && result[evalError])
        {
            var msg = result.name ? (result.name + ": ") : "";
            msg += result.message || result;
            
            if (errorHandler)
                result = errorHandler(msg);
            else
                result = msg;
        }
        
        return result;
    },
    

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Window Methods
    
    getWindowSize: function()
    {
        var width=0, height=0, el;
        
        if (typeof this.window.innerWidth == "number")
        {
            width = this.window.innerWidth;
            height = this.window.innerHeight;
        }
        else if ((el=this.document.documentElement) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        else if ((el=this.document.body) && (el.clientHeight || el.clientWidth))
        {
            width = el.clientWidth;
            height = el.clientHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollSize: function()
    {
        var width=0, height=0, el;

        // first try the document.documentElement scroll size
        if (!isIEQuiksMode && (el=this.document.documentElement) && 
           (el.scrollHeight || el.scrollWidth))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        
        // then we need to check if document.body has a bigger scroll size value
        // because sometimes depending on the browser and the page, the document.body
        // scroll size returns a smaller (and wrong) measure
        if ((el=this.document.body) && (el.scrollHeight || el.scrollWidth) &&
            (el.scrollWidth > width || el.scrollHeight > height))
        {
            width = el.scrollWidth;
            height = el.scrollHeight;
        }
        
        return {width: width, height: height};
    },
    
    getWindowScrollPosition: function()
    {
        var top=0, left=0, el;
        
        if(typeof this.window.pageYOffset == "number")
        {
            top = this.window.pageYOffset;
            left = this.window.pageXOffset;
        }
        else if((el=this.document.body) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        else if((el=this.document.documentElement) && (el.scrollTop || el.scrollLeft))
        {
            top = el.scrollTop;
            left = el.scrollLeft;
        }
        
        return {top:top, left:left};
    },
    

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Element Methods

    getElementFromPoint: function(x, y)
    {
        if (shouldFixElementFromPoint)
        {
            var scroll = this.getWindowScrollPosition();
            return this.document.elementFromPoint(x + scroll.left, y + scroll.top);
        }
        else
            return this.document.elementFromPoint(x, y);
    },
    
    getElementPosition: function(el)
    {
        var left = 0;
        var top = 0;
        
        do
        {
            left += el.offsetLeft;
            top += el.offsetTop;
        }
        while (el = el.offsetParent);
            
        return {left:left, top:top};      
    },
    
    getElementBox: function(el)
    {
        var result = {};
        
        if (el.getBoundingClientRect)
        {
            var rect = el.getBoundingClientRect();
            
            // fix IE problem with offset when not in fullscreen mode
            var offset = isIE ? this.document.body.clientTop || this.document.documentElement.clientTop: 0;
            
            var scroll = this.getWindowScrollPosition();
            
            result.top = Math.round(rect.top - offset + scroll.top);
            result.left = Math.round(rect.left - offset + scroll.left);
            result.height = Math.round(rect.bottom - rect.top);
            result.width = Math.round(rect.right - rect.left);
        }
        else 
        {
            var position = this.getElementPosition(el);
            
            result.top = position.top;
            result.left = position.left;
            result.height = el.offsetHeight;
            result.width = el.offsetWidth;
        }
        
        return result;
    },
    

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Measurement Methods
    
    getMeasurement: function(el, name)
    {
        var result = {value: 0, unit: "px"};
        
        var cssValue = this.getStyle(el, name);
        
        if (!cssValue) return result;
        if (cssValue.toLowerCase() == "auto") return result;
        
        var reMeasure = /(\d+\.?\d*)(.*)/;
        var m = cssValue.match(reMeasure);
        
        if (m)
        {
            result.value = m[1]-0;
            result.unit = m[2].toLowerCase();
        }
        
        return result;        
    },
    
    getMeasurementInPixels: function(el, name)
    {
        if (!el) return null;
        
        var m = this.getMeasurement(el, name);
        var value = m.value;
        var unit = m.unit;
        
        if (unit == "px")
            return value;
          
        else if (unit == "pt")
            return this.pointsToPixels(name, value);
          
        else if (unit == "em")
            return this.emToPixels(el, value);
          
        else if (unit == "%")
            return this.percentToPixels(el, value);
        
        else if (unit == "ex")
            return this.exToPixels(el, value);
        
        // TODO: add other units. Maybe create a better general way
        // to calculate measurements in different units.    
    },

    getMeasurementBox1: function(el, name)
    {
        var sufixes = ["Top", "Left", "Bottom", "Right"];
        var result = [];
        
        for(var i=0, sufix; sufix=sufixes[i]; i++)
            result[i] = Math.round(this.getMeasurementInPixels(el, name + sufix));
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    },
    
    getMeasurementBox: function(el, name)
    {
        var result = [];
        var sufixes = name == "border" ?
                ["TopWidth", "LeftWidth", "BottomWidth", "RightWidth"] :
                ["Top", "Left", "Bottom", "Right"];
        
        if (isIE)
        {
            var propName, cssValue;
            var autoMargin = null;
            
            for(var i=0, sufix; sufix=sufixes[i]; i++)
            {
                propName = name + sufix;
                
                cssValue = el.currentStyle[propName] || el.style[propName]; 
                
                if (cssValue == "auto")
                {
                    if (!autoMargin)
                        autoMargin = this.getCSSAutoMarginBox(el);
                    
                    result[i] = autoMargin[sufix.toLowerCase()];
                }
                else
                    result[i] = this.getMeasurementInPixels(el, propName);
                      
            }
        
        }
        else
        {
            for(var i=0, sufix; sufix=sufixes[i]; i++)
                result[i] = this.getMeasurementInPixels(el, name + sufix);
        }
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    }, 
    
    getCSSAutoMarginBox: function(el)
    {
        if (isIE && " meta title input script link a ".indexOf(" "+el.nodeName.toLowerCase()+" ") != -1)
            return {top:0, left:0, bottom:0, right:0};
            /**/
            
        if (isIE && " h1 h2 h3 h4 h5 h6 h7 ul p ".indexOf(" "+el.nodeName.toLowerCase()+" ") == -1)
            return {top:0, left:0, bottom:0, right:0};
            /**/
            
        var offsetTop = 0;
        if (false && isIEStantandMode)
        {
            var scrollSize = Firebug.browser.getWindowScrollSize();
            offsetTop = scrollSize.height;
        }
        
        var box = this.document.createElement("div");
        //box.style.cssText = "margin:0; padding:1px; border: 0; position:static; overflow:hidden; visibility: hidden;";
        box.style.cssText = "margin:0; padding:1px; border: 0; visibility: hidden;";
        
        var clone = el.cloneNode(false);
        var text = this.document.createTextNode("&nbsp;");
        clone.appendChild(text);
        
        box.appendChild(clone);
    
        this.document.body.appendChild(box);
        
        var marginTop = clone.offsetTop - box.offsetTop - 1;
        var marginBottom = box.offsetHeight - clone.offsetHeight - 2 - marginTop;
        
        var marginLeft = clone.offsetLeft - box.offsetLeft - 1;
        var marginRight = box.offsetWidth - clone.offsetWidth - 2 - marginLeft;
        
        this.document.body.removeChild(box);
        
        return {top:marginTop+offsetTop, left:marginLeft, bottom:marginBottom-offsetTop, right:marginRight};
    },
    
    getFontSizeInPixels: function(el)
    {
        var size = this.getMeasurement(el, "fontSize");
        
        if (size.unit == "px") return size.value;
        
        // get font size, the dirty way
        var computeDirtyFontSize = function(el, calibration)
        {
            var div = this.document.createElement("div");
            var divStyle = offscreenStyle;

            if (calibration)
                divStyle +=  " font-size:"+calibration+"px;";
            
            div.style.cssText = divStyle;
            div.innerHTML = "A";
            el.appendChild(div);
            
            var value = div.offsetHeight;
            el.removeChild(div);
            return value;
        };
        
        /*
        var calibrationBase = 200;
        var calibrationValue = computeDirtyFontSize(el, calibrationBase);
        var rate = calibrationBase / calibrationValue;
        /**/
        
        // the "dirty technique" fails in some environments, so we're using a static value
        // based in some tests.
        var rate = 200 / 225;
        
        var value = computeDirtyFontSize(el);

        return value * rate;
    },
    
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Unit Funtions
  
    pointsToPixels: function(name, value, returnFloat)
    {
        var axis = /Top$|Bottom$/.test(name) ? "y" : "x";
        
        var result = value * pixelsPerInch[axis] / 72;
        
        return returnFloat ? result : Math.round(result);
    },
    
    emToPixels: function(el, value)
    {
        if (!el) return null;
        
        var fontSize = this.getFontSizeInPixels(el);
        
        return Math.round(value * fontSize);
    },
    
    exToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get ex value, the dirty way
        var div = this.document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "ex;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
      
    percentToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get % value, the dirty way
        var div = this.document.createElement("div");
        div.style.cssText = offscreenStyle + "width:"+value + "%;";
        
        el.appendChild(div);
        var value = div.offsetWidth;
        el.removeChild(div);
        
        return value;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    getStyle: isIE ? function(el, name)
    {
        return el.currentStyle[name] || el.style[name] || undefined;
    }
    : function(el, name)
    {
        return this.document.defaultView.getComputedStyle(el,null)[name] 
            || el.style[name] || undefined;
    }

};


// ************************************************************************************************
}});