/* See license.txt for terms of usage */

define(["BrowserDetection"], function(BrowserDetection) { 
// ************************************************************************************************

// ************************************************************************************************
// Globals

// Opera and some versions of webkit returns the wrong value of document.elementFromPoint()
// function, without taking into account the scroll position. Safari 4 (webkit/531.21.8) 
// still have this issue. Google Chrome 4 (webkit/532.5) does not. So, we're assuming this 
// issue was fixed in the 532 version
var shouldFixElementFromPoint = BrowserDetection.Safari || 
        BrowserDetection.Safari && BrowserDetection.version < "532";
// ************************************************************************************************

// ************************************************************************************************
// Measure

function Measure(win)
{
    this.window = win.window;
    this.document = win.document;
};

Measure.prototype =
{  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Window Measure methods
    
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
    // Element methods

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
            var offset = BrowserDetection.IE ? 
                    this.document.body.clientTop || 
                    this.document.documentElement.clientTop: 0;
            
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
    // Measure Methods
    
    getMeasure: function(el, name)
    {
        var result = {value: 0, unit: "px"};
        
        var cssValue = getStyle(el, name);
        
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
    
    getMeasureInPixels: function(el, name)
    {
        if (!el) return null;
        
        var m = this.getMeasure(el, name);
        var value = m.value;
        var unit = m.unit;
        
        if (unit == "px")
        {
            return value;
        }
        else
        {
            return getPixelValue(el.parentNode, value + unit);
        }
    },

    getMeasureBox: function(el, name)
    {
        var result = [];
        var sufixes = name == "border" ?
                ["TopWidth", "LeftWidth", "BottomWidth", "RightWidth"] :
                ["Top", "Left", "Bottom", "Right"];
        
        if (BrowserDetection.IE)
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
                        autoMargin = getCSSAutoMarginBox(el);
                    
                    result[i] = autoMargin[sufix.toLowerCase()];
                }
                else
                    result[i] = this.getMeasureInPixels(el, propName);
            }
        
        }
        else
        {
            for(var i=0, sufix; sufix=sufixes[i]; i++)
                result[i] = this.getMeasureInPixels(el, name + sufix);
        }
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    } 

};

// ************************************************************************************************
// Internals

function getCSSAutoMarginBox(el)
{
    /*
    // the following elements will fail
    if (BrowserDetection.IE && 
            " meta title input script link a ".indexOf(" "+el.nodeName.toLowerCase()+" ") != -1)
                return {top:0, left:0, bottom:0, right:0};
    /**/

    // the following elements are safe
    // which other elements may have auto margin?
    if (BrowserDetection.IE && 
            " h1 h2 h3 h4 h5 h6 h7 ul p ".indexOf(" "+el.nodeName.toLowerCase()+" ") == -1)
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
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var getStyle = BrowserDetection.IE ? function(el, name)
{
    return el.currentStyle[name] || el.style[name] || undefined;
}
: function(el, name)
{
    return this.document.defaultView.getComputedStyle(el,null)[name] 
        || el.style[name] || undefined;
};

// From Dean Edwards:
// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

var PIXEL = /^\d+(px)?$/i;
function getPixelValue(element, value)
{
    if (!element || !element.runtimeStyle) return 0;
    
    if (PIXEL.test(value))
        return parseInt(value);
    
    var style = element.style.left;
    var runtimeStyle = element.runtimeStyle.left;
    
    element.runtimeStyle.left = element.currentStyle.left;
    element.style.left = value || 0;
    
    value = element.style.pixelLeft;
    
    element.style.left = style;
    element.runtimeStyle.left = runtimeStyle;
    
    return value;
};


// ************************************************************************************************

return Measure;

// ************************************************************************************************
});