/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Inspector Module

var ElementCache = Firebug.Lite.Cache.Element;

var inspectorTS, inspectorTimer, isInspecting;

Firebug.Inspector =
{
    create: function()
    {
        offlineFragment = Env.browser.document.createDocumentFragment();
        
        createBoxModelInspector();
        createOutlineInspector();
    },
    
    destroy: function()
    {
        destroyBoxModelInspector();
        destroyOutlineInspector();
        
        offlineFragment = null;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Inspect functions
    
    toggleInspect: function()
    {
        if (isInspecting)
        {
            this.stopInspecting();
        }
        else
        {
            Firebug.chrome.inspectButton.changeState("pressed");
            this.startInspecting();
        }
    },
    
    startInspecting: function()
    {
        isInspecting = true;
        
        Firebug.chrome.selectPanel("HTML");
        
        createInspectorFrame();
        
        var size = Firebug.browser.getWindowScrollSize();
        
        fbInspectFrame.style.width = size.width + "px";
        fbInspectFrame.style.height = size.height + "px";
        
        //addEvent(Firebug.browser.document.documentElement, "mousemove", Firebug.Inspector.onInspectingBody);
        
        addEvent(fbInspectFrame, "mousemove", Firebug.Inspector.onInspecting);
        addEvent(fbInspectFrame, "mousedown", Firebug.Inspector.onInspectingClick);
    },
    
    stopInspecting: function()
    {
        isInspecting = false;
        
        if (outlineVisible) this.hideOutline();
        removeEvent(fbInspectFrame, "mousemove", Firebug.Inspector.onInspecting);
        removeEvent(fbInspectFrame, "mousedown", Firebug.Inspector.onInspectingClick);
        
        destroyInspectorFrame();
        
        Firebug.chrome.inspectButton.restore();
        
        if (Firebug.chrome.type == "popup")
            Firebug.chrome.node.focus();
    },
    
    onInspectingClick: function(e)
    {
        fbInspectFrame.style.display = "none";
        var targ = Firebug.browser.getElementFromPoint(e.clientX, e.clientY);
        fbInspectFrame.style.display = "block";

        // Avoid inspecting the outline, and the FirebugUI
        var id = targ.id;
        if (id && /^fbOutline\w$/.test(id)) return;
        if (id == "FirebugUI") return;

        // Avoid looking at text nodes in Opera
        while (targ.nodeType != 1) targ = targ.parentNode;
        
        //Firebug.Console.log(targ);
        Firebug.Inspector.stopInspecting();
    },
    
    onInspecting: function(e)
    {
        if (new Date().getTime() - lastInspecting > 30)
        {
            fbInspectFrame.style.display = "none";
            var targ = Firebug.browser.getElementFromPoint(e.clientX, e.clientY);
            fbInspectFrame.style.display = "block";
    
            // Avoid inspecting the outline, and the FirebugUI
            var id = targ.id;
            if (id && /^fbOutline\w$/.test(id)) return;
            if (id == "FirebugUI") return;
            
            // Avoid looking at text nodes in Opera
            while (targ.nodeType != 1) targ = targ.parentNode;
    
            if (targ.nodeName.toLowerCase() == "body") return;
    
            //Firebug.Console.log(e.clientX, e.clientY, targ);
            Firebug.Inspector.drawOutline(targ);
            
            if (ElementCache(targ))
            {
                var target = ""+ElementCache.key(targ);
                var lazySelect = function()
                {
                    inspectorTS = new Date().getTime();
                    
                    if (Firebug.HTML)
                        Firebug.HTML.selectTreeNode(""+ElementCache.key(targ));
                };
                
                if (inspectorTimer)
                {
                    clearTimeout(inspectorTimer);
                    inspectorTimer = null;
                }
                
                if (new Date().getTime() - inspectorTS > 200)
                    setTimeout(lazySelect, 0);
                else
                    inspectorTimer = setTimeout(lazySelect, 300);
            }
            
            lastInspecting = new Date().getTime();
        }
    },
    
    // TODO: xxxpedro remove this?
    onInspectingBody: function(e)
    {
        if (new Date().getTime() - lastInspecting > 30)
        {
            var targ = e.target;
    
            // Avoid inspecting the outline, and the FirebugUI
            var id = targ.id;
            if (id && /^fbOutline\w$/.test(id)) return;
            if (id == "FirebugUI") return;
            
            // Avoid looking at text nodes in Opera
            while (targ.nodeType != 1) targ = targ.parentNode;
    
            if (targ.nodeName.toLowerCase() == "body") return;
    
            //Firebug.Console.log(e.clientX, e.clientY, targ);
            Firebug.Inspector.drawOutline(targ);
            
            if (ElementCache.has(targ))
                FBL.Firebug.HTML.selectTreeNode(""+ElementCache.key(targ));
            
            lastInspecting = new Date().getTime();
        }
    },
    
    /**
     * 
     *   llttttttrr
     *   llttttttrr
     *   ll      rr
     *   ll      rr
     *   llbbbbbbrr
     *   llbbbbbbrr
     */
    drawOutline: function(el)
    {
        var border = 2;
        var scrollbarSize = 17;
        
        var windowSize = Firebug.browser.getWindowSize();
        var scrollSize = Firebug.browser.getWindowScrollSize();
        var scrollPosition = Firebug.browser.getWindowScrollPosition();
        
        var box = Firebug.browser.getElementBox(el);
        
        var top = box.top;
        var left = box.left;
        var height = box.height;
        var width = box.width;
        
        var freeHorizontalSpace = scrollPosition.left + windowSize.width - left - width - 
                (!isIE && scrollSize.height > windowSize.height ? // is *vertical* scrollbar visible
                 scrollbarSize : 0);
        
        var freeVerticalSpace = scrollPosition.top + windowSize.height - top - height -
                (!isIE && scrollSize.width > windowSize.width ? // is *horizontal* scrollbar visible
                scrollbarSize : 0);
        
        var numVerticalBorders = freeVerticalSpace > 0 ? 2 : 1;
        
        var o = outlineElements;
        var style;
        
        style = o.fbOutlineT.style;
        style.top = top-border + "px";
        style.left = left + "px";
        style.height = border + "px";  // TODO: on initialize()
        style.width = width + "px";
  
        style = o.fbOutlineL.style;
        style.top = top-border + "px";
        style.left = left-border + "px";
        style.height = height+ numVerticalBorders*border + "px";
        style.width = border + "px";  // TODO: on initialize()
        
        style = o.fbOutlineB.style;
        if (freeVerticalSpace > 0)
        {
            style.top = top+height + "px";
            style.left = left + "px";
            style.width = width + "px";
            //style.height = border + "px"; // TODO: on initialize() or worst case?
        }
        else
        {
            style.top = -2*border + "px";
            style.left = -2*border + "px";
            style.width = border + "px";
            //style.height = border + "px";
        }
        
        style = o.fbOutlineR.style;
        if (freeHorizontalSpace > 0)
        {
            style.top = top-border + "px";
            style.left = left+width + "px";
            style.height = height + numVerticalBorders*border + "px";
            style.width = (freeHorizontalSpace < border ? freeHorizontalSpace : border) + "px";
        }
        else
        {
            style.top = -2*border + "px";
            style.left = -2*border + "px";
            style.height = border + "px";
            style.width = border + "px";
        }
        
        if (!outlineVisible) this.showOutline();        
    },
    
    hideOutline: function()
    {
        if (!outlineVisible) return;
        
        for (var name in outline)
            offlineFragment.appendChild(outlineElements[name]);

        outlineVisible = false;
    },
    
    showOutline: function()
    {
        if (outlineVisible) return;
        
        if (boxModelVisible) this.hideBoxModel();
        
        for (var name in outline)
            Firebug.browser.document.getElementsByTagName("body")[0].appendChild(outlineElements[name]);
        
        outlineVisible = true;
    },
  
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Box Model
    
    drawBoxModel: function(el)
    {
        // avoid error when the element is not attached a document
        if (!el || !el.parentNode)
            return;
        
        var box = Firebug.browser.getElementBox(el);
        
        var windowSize = Firebug.browser.getWindowSize();
        var scrollPosition = Firebug.browser.getWindowScrollPosition();
        
        // element may be occluded by the chrome, when in frame mode
        var offsetHeight = Firebug.chrome.type == "frame" ? Firebug.context.persistedState.height : 0;
        
        // if element box is not inside the viewport, don't draw the box model
        if (box.top > scrollPosition.top + windowSize.height - offsetHeight ||
            box.left > scrollPosition.left + windowSize.width ||
            scrollPosition.top > box.top + box.height ||
            scrollPosition.left > box.left + box.width )
            return;
        
        var top = box.top;
        var left = box.left;
        var height = box.height;
        var width = box.width;
        
        var margin = Firebug.browser.getMeasurementBox(el, "margin");
        var padding = Firebug.browser.getMeasurementBox(el, "padding");
        var border = Firebug.browser.getMeasurementBox(el, "border");
        
        boxModelStyle.top = top - margin.top + "px";
        boxModelStyle.left = left - margin.left + "px";
        boxModelStyle.height = height + margin.top + margin.bottom + "px";
        boxModelStyle.width = width + margin.left + margin.right + "px";
      
        boxBorderStyle.top = margin.top + "px";
        boxBorderStyle.left = margin.left + "px";
        boxBorderStyle.height = height + "px";
        boxBorderStyle.width = width + "px";
        
        boxPaddingStyle.top = margin.top + border.top + "px";
        boxPaddingStyle.left = margin.left + border.left + "px";
        boxPaddingStyle.height = height - border.top - border.bottom + "px";
        boxPaddingStyle.width = width - border.left - border.right + "px";
      
        boxContentStyle.top = margin.top + border.top + padding.top + "px";
        boxContentStyle.left = margin.left + border.left + padding.left + "px";
        boxContentStyle.height = height - border.top - padding.top - padding.bottom - border.bottom + "px";
        boxContentStyle.width = width - border.left - padding.left - padding.right - border.right + "px";
        
        if (!boxModelVisible) this.showBoxModel();
    },
  
    hideBoxModel: function()
    {
        if (!boxModelVisible) return;
        
        offlineFragment.appendChild(boxModel);
        boxModelVisible = false;
    },
    
    showBoxModel: function()
    {
        if (boxModelVisible) return;
            
        if (outlineVisible) this.hideOutline();
        
        Firebug.browser.document.getElementsByTagName("body")[0].appendChild(boxModel);
        boxModelVisible = true;
    }

};

// ************************************************************************************************
// Inspector Internals


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Shared variables



// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// Internal variables

var offlineFragment = null;

var boxModelVisible = false;

var boxModel, boxModelStyle, 
    boxMargin, boxMarginStyle,
    boxBorder, boxBorderStyle,
    boxPadding, boxPaddingStyle, 
    boxContent, boxContentStyle;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var resetStyle = "margin:0; padding:0; border:0; position:absolute; overflow:hidden; display:block;";
var offscreenStyle = resetStyle + "top:-1234px; left:-1234px;";

var inspectStyle = resetStyle + "z-index: 2147483500;";
var inspectFrameStyle = resetStyle + "z-index: 2147483550; top:0; left:0; background:url(" +
                        Env.Location.skinDir + "pixel_transparent.gif);";

//if (Env.Options.enableTrace) inspectFrameStyle = resetStyle + "z-index: 2147483550; top: 0; left: 0; background: #ff0; opacity: 0.05; _filter: alpha(opacity=5);";

var inspectModelOpacity = isIE ? "filter:alpha(opacity=80);" : "opacity:0.8;";
var inspectModelStyle = inspectStyle + inspectModelOpacity;
var inspectMarginStyle = inspectStyle + "background: #EDFF64; height:100%; width:100%;";
var inspectBorderStyle = inspectStyle + "background: #666;";
var inspectPaddingStyle = inspectStyle + "background: SlateBlue;";
var inspectContentStyle = inspectStyle + "background: SkyBlue;";


var outlineStyle = { 
    fbHorizontalLine: "background: #3875D7;height: 2px;",
    fbVerticalLine: "background: #3875D7;width: 2px;"
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var lastInspecting = 0;
var fbInspectFrame = null;


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var outlineVisible = false;
var outlineElements = {};
var outline = {
  "fbOutlineT": "fbHorizontalLine",
  "fbOutlineL": "fbVerticalLine",
  "fbOutlineB": "fbHorizontalLine",
  "fbOutlineR": "fbVerticalLine"
};


var getInspectingTarget = function()
{
    
};

// ************************************************************************************************
// Section

var createInspectorFrame = function createInspectorFrame()
{
    fbInspectFrame = createGlobalElement("div");
    fbInspectFrame.id = "fbInspectFrame";
    fbInspectFrame.firebugIgnore = true;
    fbInspectFrame.style.cssText = inspectFrameStyle;
    Firebug.browser.document.getElementsByTagName("body")[0].appendChild(fbInspectFrame);
};

var destroyInspectorFrame = function destroyInspectorFrame()
{
    if (fbInspectFrame)
    {
        Firebug.browser.document.getElementsByTagName("body")[0].removeChild(fbInspectFrame);
        fbInspectFrame = null;
    }
};

var createOutlineInspector = function createOutlineInspector()
{
    for (var name in outline)
    {
        var el = outlineElements[name] = createGlobalElement("div");
        el.id = name;
        el.firebugIgnore = true;
        el.style.cssText = inspectStyle + outlineStyle[outline[name]];
        offlineFragment.appendChild(el);
    }
};

var destroyOutlineInspector = function destroyOutlineInspector()
{
    for (var name in outline)
    {
        var el = outlineElements[name];
        el.parentNode.removeChild(el);
    }
};

var createBoxModelInspector = function createBoxModelInspector()
{
    boxModel = createGlobalElement("div");
    boxModel.id = "fbBoxModel";
    boxModel.firebugIgnore = true;
    boxModelStyle = boxModel.style;
    boxModelStyle.cssText = inspectModelStyle;
    
    boxMargin = createGlobalElement("div");
    boxMargin.id = "fbBoxMargin";
    boxMarginStyle = boxMargin.style;
    boxMarginStyle.cssText = inspectMarginStyle;
    boxModel.appendChild(boxMargin);
    
    boxBorder = createGlobalElement("div");
    boxBorder.id = "fbBoxBorder";
    boxBorderStyle = boxBorder.style;
    boxBorderStyle.cssText = inspectBorderStyle;
    boxModel.appendChild(boxBorder);
    
    boxPadding = createGlobalElement("div");
    boxPadding.id = "fbBoxPadding";
    boxPaddingStyle = boxPadding.style;
    boxPaddingStyle.cssText = inspectPaddingStyle;
    boxModel.appendChild(boxPadding);
    
    boxContent = createGlobalElement("div");
    boxContent.id = "fbBoxContent";
    boxContentStyle = boxContent.style;
    boxContentStyle.cssText = inspectContentStyle;
    boxModel.appendChild(boxContent);
    
    offlineFragment.appendChild(boxModel);
};

var destroyBoxModelInspector = function destroyBoxModelInspector()
{
    boxModel.parentNode.removeChild(boxModel);
};

// ************************************************************************************************
// Section




// ************************************************************************************************
}});