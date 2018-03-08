/* See license.txt for terms of usage */

// move to FBL
(function() { 

// ************************************************************************************************
// XPath

/**
 * Gets an XPath for an element which describes its hierarchical location.
 */
this.getElementXPath = function(element)
{
    try
    {
        if (element && element.id)
            return '//*[@id="' + element.id + '"]';
        else
            return this.getElementTreeXPath(element);
    }
    catch(E)
    {
        // xxxpedro: trying to detect the mysterious error:
        // Security error" code: "1000
        //debugger;
    }
};

this.getElementTreeXPath = function(element)
{
    var paths = [];

    for (; element && element.nodeType == 1; element = element.parentNode)
    {
        var index = 0;
        var nodeName = element.nodeName;
        
        for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
        {
            if (sibling.nodeType != 1) continue;
            
            if (sibling.nodeName == nodeName)
                ++index;
        }

        var tagName = element.nodeName.toLowerCase();
        var pathIndex = (index ? "[" + (index+1) + "]" : "");
        paths.splice(0, 0, tagName + pathIndex);
    }

    return paths.length ? "/" + paths.join("/") : null;
};

this.getElementsByXPath = function(doc, xpath)
{
    var nodes = [];

    try {
        var result = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
        for (var item = result.iterateNext(); item; item = result.iterateNext())
            nodes.push(item);
    }
    catch (exc)
    {
        // Invalid xpath expressions make their way here sometimes.  If that happens,
        // we still want to return an empty set without an exception.
    }

    return nodes;
};

this.getRuleMatchingElements = function(rule, doc)
{
    var css = rule.selectorText;
    var xpath = this.cssToXPath(css);
    return this.getElementsByXPath(doc, xpath);
};


}).call(FBL);




FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************

var toCamelCase = function toCamelCase(s)
{
    return s.replace(reSelectorCase, toCamelCaseReplaceFn);
};

var toSelectorCase = function toSelectorCase(s)
{
  return s.replace(reCamelCase, "-$1").toLowerCase();
  
};

var reCamelCase = /([A-Z])/g;
var reSelectorCase = /\-(.)/g; 
var toCamelCaseReplaceFn = function toCamelCaseReplaceFn(m,g)
{
    return g.toUpperCase();
};

// ************************************************************************************************

var ElementCache = Firebug.Lite.Cache.Element;
var StyleSheetCache = Firebug.Lite.Cache.StyleSheet;

// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************


// ************************************************************************************************
// Constants

//const Cc = Components.classes;
//const Ci = Components.interfaces;
//const nsIDOMCSSStyleRule = Ci.nsIDOMCSSStyleRule;
//const nsIInterfaceRequestor = Ci.nsIInterfaceRequestor;
//const nsISelectionDisplay = Ci.nsISelectionDisplay;
//const nsISelectionController = Ci.nsISelectionController;

// See: http://mxr.mozilla.org/mozilla1.9.2/source/content/events/public/nsIEventStateManager.h#153
//const STATE_ACTIVE  = 0x01;
//const STATE_FOCUS   = 0x02;
//const STATE_HOVER   = 0x04;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
Firebug.SourceBoxPanel = Firebug.Panel;

var reSelectorTag = /(^|\s)(?:\w+)/g;

var domUtils = null;

var textContent = isIE ? "innerText" : "textContent";
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var CSSDomplateBase = {
    isEditable: function(rule)
    {
        return !rule.isSystemSheet;
    },
    isSelectorEditable: function(rule)
    {
        return rule.isSelectorEditable && this.isEditable(rule);
    }
};

var CSSPropTag = domplate(CSSDomplateBase, {
    tag: DIV({"class": "cssProp focusRow", $disabledStyle: "$prop.disabled",
          $editGroup: "$rule|isEditable",
          $cssOverridden: "$prop.overridden", role : "option"},
        A({"class": "cssPropDisable"}, "&nbsp;&nbsp;"),
        SPAN({"class": "cssPropName", $editable: "$rule|isEditable"}, "$prop.name"),
        SPAN({"class": "cssColon"}, ":"),
        SPAN({"class": "cssPropValue", $editable: "$rule|isEditable"}, "$prop.value$prop.important"),
        SPAN({"class": "cssSemi"}, ";")
    )
});

var CSSRuleTag =
    TAG("$rule.tag", {rule: "$rule"});

var CSSImportRuleTag = domplate({
    tag: DIV({"class": "cssRule insertInto focusRow importRule", _repObject: "$rule.rule"},
        "@import &quot;",
        A({"class": "objectLink", _repObject: "$rule.rule.styleSheet"}, "$rule.rule.href"),
        "&quot;;"
    )
});

var CSSStyleRuleTag = domplate(CSSDomplateBase, {
    tag: DIV({"class": "cssRule insertInto",
            $cssEditableRule: "$rule|isEditable",
            $editGroup: "$rule|isSelectorEditable",
            _repObject: "$rule.rule",
            "ruleId": "$rule.id", role : 'presentation'},
        DIV({"class": "cssHead focusRow", role : 'listitem'},
            SPAN({"class": "cssSelector", $editable: "$rule|isSelectorEditable"}, "$rule.selector"), " {"
        ),
        DIV({role : 'group'},
            DIV({"class": "cssPropertyListBox", role : 'listbox'},
                FOR("prop", "$rule.props",
                    TAG(CSSPropTag.tag, {rule: "$rule", prop: "$prop"})
                )
            )
        ),
        DIV({"class": "editable insertBefore", role:"presentation"}, "}")
    )
});

var reSplitCSS =  /(url\("?[^"\)]+?"?\))|(rgb\(.*?\))|(#[\dA-Fa-f]+)|(-?\d+(\.\d+)?(%|[a-z]{1,2})?)|([^,\s]+)|"(.*?)"/;

var reURL = /url\("?([^"\)]+)?"?\)/;

var reRepeat = /no-repeat|repeat-x|repeat-y|repeat/;

//const sothinkInstalled = !!$("swfcatcherKey_sidebar");
var sothinkInstalled = false;
var styleGroups =
{
    text: [
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "color",
        "text-transform",
        "text-decoration",
        "letter-spacing",
        "word-spacing",
        "line-height",
        "text-align",
        "vertical-align",
        "direction",
        "column-count",
        "column-gap",
        "column-width"
    ],

    background: [
        "background-color",
        "background-image",
        "background-repeat",
        "background-position",
        "background-attachment",
        "opacity"
    ],

    box: [
        "width",
        "height",
        "top",
        "right",
        "bottom",
        "left",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "border-top-width",
        "border-right-width",
        "border-bottom-width",
        "border-left-width",
        "border-top-color",
        "border-right-color",
        "border-bottom-color",
        "border-left-color",
        "border-top-style",
        "border-right-style",
        "border-bottom-style",
        "border-left-style",
        "-moz-border-top-radius",
        "-moz-border-right-radius",
        "-moz-border-bottom-radius",
        "-moz-border-left-radius",
        "outline-top-width",
        "outline-right-width",
        "outline-bottom-width",
        "outline-left-width",
        "outline-top-color",
        "outline-right-color",
        "outline-bottom-color",
        "outline-left-color",
        "outline-top-style",
        "outline-right-style",
        "outline-bottom-style",
        "outline-left-style"
    ],

    layout: [
        "position",
        "display",
        "visibility",
        "z-index",
        "overflow-x",  // http://www.w3.org/TR/2002/WD-css3-box-20021024/#overflow
        "overflow-y",
        "overflow-clip",
        "white-space",
        "clip",
        "float",
        "clear",
        "-moz-box-sizing"
    ],

    other: [
        "cursor",
        "list-style-image",
        "list-style-position",
        "list-style-type",
        "marker-offset",
        "user-focus",
        "user-select",
        "user-modify",
        "user-input"
    ]
};

var styleGroupTitles =
{
    text: "Text",
    background: "Background",
    box: "Box Model",
    layout: "Layout",
    other: "Other"
};

Firebug.CSSModule = extend(Firebug.Module,
{
    freeEdit: function(styleSheet, value)
    {
        if (!styleSheet.editStyleSheet)
        {
            var ownerNode = getStyleSheetOwnerNode(styleSheet);
            styleSheet.disabled = true;

            var url = CCSV("@mozilla.org/network/standard-url;1", Components.interfaces.nsIURL);
            url.spec = styleSheet.href;

            var editStyleSheet = ownerNode.ownerDocument.createElementNS(
                "http://www.w3.org/1999/xhtml",
                "style");
            unwrapObject(editStyleSheet).firebugIgnore = true;
            editStyleSheet.setAttribute("type", "text/css");
            editStyleSheet.setAttributeNS(
                "http://www.w3.org/XML/1998/namespace",
                "base",
                url.directory);
            if (ownerNode.hasAttribute("media"))
            {
              editStyleSheet.setAttribute("media", ownerNode.getAttribute("media"));
            }

            // Insert the edited stylesheet directly after the old one to ensure the styles
            // cascade properly.
            ownerNode.parentNode.insertBefore(editStyleSheet, ownerNode.nextSibling);

            styleSheet.editStyleSheet = editStyleSheet;
        }

        styleSheet.editStyleSheet.innerHTML = value;
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("css.saveEdit styleSheet.href:"+styleSheet.href+" got innerHTML:"+value+"\n");

        dispatch(this.fbListeners, "onCSSFreeEdit", [styleSheet, value]);
    },

    insertRule: function(styleSheet, cssText, ruleIndex)
    {
        if (FBTrace.DBG_CSS) FBTrace.sysout("Insert: " + ruleIndex + " " + cssText);
        var insertIndex = styleSheet.insertRule(cssText, ruleIndex);

        dispatch(this.fbListeners, "onCSSInsertRule", [styleSheet, cssText, ruleIndex]);

        return insertIndex;
    },

    deleteRule: function(styleSheet, ruleIndex)
    {
        if (FBTrace.DBG_CSS) FBTrace.sysout("deleteRule: " + ruleIndex + " " + styleSheet.cssRules.length, styleSheet.cssRules);
        dispatch(this.fbListeners, "onCSSDeleteRule", [styleSheet, ruleIndex]);

        styleSheet.deleteRule(ruleIndex);
    },

    setProperty: function(rule, propName, propValue, propPriority)
    {
        var style = rule.style || rule;

        // Record the original CSS text for the inline case so we can reconstruct at a later
        // point for diffing purposes
        var baseText = style.cssText;
        
        // good browsers
        if (style.getPropertyValue)
        {
            var prevValue = style.getPropertyValue(propName);
            var prevPriority = style.getPropertyPriority(propName);
    
            // XXXjoe Gecko bug workaround: Just changing priority doesn't have any effect
            // unless we remove the property first
            style.removeProperty(propName);
    
            style.setProperty(propName, propValue, propPriority);
        }
        // sad browsers
        else
        {
            // TODO: xxxpedro parse CSS rule to find property priority in IE?
            //console.log(propName, propValue);
            style[toCamelCase(propName)] = propValue;
        }

        if (propName) {
            dispatch(this.fbListeners, "onCSSSetProperty", [style, propName, propValue, propPriority, prevValue, prevPriority, rule, baseText]);
        }
    },

    removeProperty: function(rule, propName, parent)
    {
        var style = rule.style || rule;

        // Record the original CSS text for the inline case so we can reconstruct at a later
        // point for diffing purposes
        var baseText = style.cssText;
        
        if (style.getPropertyValue)
        {
    
            var prevValue = style.getPropertyValue(propName);
            var prevPriority = style.getPropertyPriority(propName);
    
            style.removeProperty(propName);
        }
        else
        {
            style[toCamelCase(propName)] = "";
        }

        if (propName) {
            dispatch(this.fbListeners, "onCSSRemoveProperty", [style, propName, prevValue, prevPriority, rule, baseText]);
        }
    }/*,

    cleanupSheets: function(doc, context)
    {
        // Due to the manner in which the layout engine handles multiple
        // references to the same sheet we need to kick it a little bit.
        // The injecting a simple stylesheet then removing it will force
        // Firefox to regenerate it's CSS hierarchy.
        //
        // WARN: This behavior was determined anecdotally.
        // See http://code.google.com/p/fbug/issues/detail?id=2440
        var style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
        style.setAttribute("charset","utf-8");
        unwrapObject(style).firebugIgnore = true;
        style.setAttribute("type", "text/css");
        style.innerHTML = "#fbIgnoreStyleDO_NOT_USE {}";
        addStyleSheet(doc, style);
        style.parentNode.removeChild(style);

        // https://bugzilla.mozilla.org/show_bug.cgi?id=500365
        // This voodoo touches each style sheet to force some Firefox internal change to allow edits.
        var styleSheets = getAllStyleSheets(context);
        for(var i = 0; i < styleSheets.length; i++)
        {
            try
            {
                var rules = styleSheets[i].cssRules;
                if (rules.length > 0)
                    var touch = rules[0];
                if (FBTrace.DBG_CSS && touch)
                    FBTrace.sysout("css.show() touch "+typeof(touch)+" in "+(styleSheets[i].href?styleSheets[i].href:context.getName()));
            }
            catch(e)
            {
                if (FBTrace.DBG_ERRORS)
                    FBTrace.sysout("css.show: sheet.cssRules FAILS for "+(styleSheets[i]?styleSheets[i].href:"null sheet")+e, e);
            }
        }
    },
    cleanupSheetHandler: function(event, context)
    {
        var target = event.target || event.srcElement,
            tagName = (target.tagName || "").toLowerCase();
        if (tagName == "link")
        {
            this.cleanupSheets(target.ownerDocument, context);
        }
    },
    watchWindow: function(context, win)
    {
        var cleanupSheets = bind(this.cleanupSheets, this),
            cleanupSheetHandler = bind(this.cleanupSheetHandler, this, context),
            doc = win.document;

        //doc.addEventListener("DOMAttrModified", cleanupSheetHandler, false);
        //doc.addEventListener("DOMNodeInserted", cleanupSheetHandler, false);
    },
    loadedContext: function(context)
    {
        var self = this;
        iterateWindows(context.browser.contentWindow, function(subwin)
        {
            self.cleanupSheets(subwin.document, context);
        });
    }
    /**/
});

// ************************************************************************************************

Firebug.CSSStyleSheetPanel = function() {};

Firebug.CSSStyleSheetPanel.prototype = extend(Firebug.SourceBoxPanel,
{
    template: domplate(
    {
        tag:
            DIV({"class": "cssSheet insertInto a11yCSSView"},
                FOR("rule", "$rules",
                    CSSRuleTag
                ),
                DIV({"class": "cssSheet editable insertBefore"}, "")
                )
    }),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    refresh: function()
    {
        if (this.location)
            this.updateLocation(this.location);
        else if (this.selection)
            this.updateSelection(this.selection);
    },

    toggleEditing: function()
    {
        if (!this.stylesheetEditor)
            this.stylesheetEditor = new StyleSheetEditor(this.document);

        if (this.editing)
            Firebug.Editor.stopEditing();
        else
        {
            if (!this.location)
                return;

            var styleSheet = this.location.editStyleSheet
                ? this.location.editStyleSheet.sheet
                : this.location;

            var css = getStyleSheetCSS(styleSheet, this.context);
            //var topmost = getTopmostRuleLine(this.panelNode);

            this.stylesheetEditor.styleSheet = this.location;
            Firebug.Editor.startEditing(this.panelNode, css, this.stylesheetEditor);
            //this.stylesheetEditor.scrollToLine(topmost.line, topmost.offset);
        }
    },

    getStylesheetURL: function(rule)
    {
        if (this.location.href)
            return this.location.href;
        else
            return this.context.window.location.href;
    },

    getRuleByLine: function(styleSheet, line)
    {
        if (!domUtils)
            return null;

        var cssRules = styleSheet.cssRules;
        for (var i = 0; i < cssRules.length; ++i)
        {
            var rule = cssRules[i];
            if (rule instanceof CSSStyleRule)
            {
                var ruleLine = domUtils.getRuleLine(rule);
                if (ruleLine >= line)
                    return rule;
            }
        }
    },

    highlightRule: function(rule)
    {
        var ruleElement = Firebug.getElementByRepObject(this.panelNode.firstChild, rule);
        if (ruleElement)
        {
            scrollIntoCenterView(ruleElement, this.panelNode);
            setClassTimed(ruleElement, "jumpHighlight", this.context);
        }
    },

    getStyleSheetRules: function(context, styleSheet)
    {
        var isSystemSheet = isSystemStyleSheet(styleSheet);

        function appendRules(cssRules)
        {
            for (var i = 0; i < cssRules.length; ++i)
            {
                var rule = cssRules[i];
                
                // TODO: xxxpedro opera instanceof stylesheet remove the following comments when 
                // the issue with opera and style sheet Classes has been solved.
                
                //if (rule instanceof CSSStyleRule)
                if (instanceOf(rule, "CSSStyleRule"))
                {
                    var props = this.getRuleProperties(context, rule);
                    //var line = domUtils.getRuleLine(rule);
                    var line = null;
                    
                    var selector = rule.selectorText;
                    
                    if (isIE)
                    {
                        selector = selector.replace(reSelectorTag, 
                                function(s){return s.toLowerCase();});
                    }
                    
                    var ruleId = rule.selectorText+"/"+line;
                    rules.push({tag: CSSStyleRuleTag.tag, rule: rule, id: ruleId,
                                selector: selector, props: props,
                                isSystemSheet: isSystemSheet,
                                isSelectorEditable: true});
                }
                //else if (rule instanceof CSSImportRule)
                else if (instanceOf(rule, "CSSImportRule"))
                    rules.push({tag: CSSImportRuleTag.tag, rule: rule});
                //else if (rule instanceof CSSMediaRule)
                else if (instanceOf(rule, "CSSMediaRule"))
                    appendRules.apply(this, [rule.cssRules]);
                else
                {
                    if (FBTrace.DBG_ERRORS || FBTrace.DBG_CSS)
                        FBTrace.sysout("css getStyleSheetRules failed to classify a rule ", rule);
                }
            }
        }

        var rules = [];
        appendRules.apply(this, [styleSheet.cssRules || styleSheet.rules]);
        return rules;
    },

    parseCSSProps: function(style, inheritMode)
    {
        var props = [];

        if (Firebug.expandShorthandProps)
        {
            var count = style.length-1,
                index = style.length;
            while (index--)
            {
                var propName = style.item(count - index);
                this.addProperty(propName, style.getPropertyValue(propName), !!style.getPropertyPriority(propName), false, inheritMode, props);
            }
        }
        else
        {
            var lines = style.cssText.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g);
            var propRE = /\s*([^:\s]*)\s*:\s*(.*?)\s*(! important)?;?$/;
            var line,i=0;
            // TODO: xxxpedro port to firebug: variable leaked into global namespace
            var m;
            
            while(line=lines[i++]){
                m = propRE.exec(line);
                if(!m)
                    continue;
                //var name = m[1], value = m[2], important = !!m[3];
                if (m[2])
                    this.addProperty(m[1], m[2], !!m[3], false, inheritMode, props);
            };
        }

        return props;
    },

    getRuleProperties: function(context, rule, inheritMode)
    {
        var props = this.parseCSSProps(rule.style, inheritMode);

        // TODO: xxxpedro port to firebug: variable leaked into global namespace 
        //var line = domUtils.getRuleLine(rule);
        var line;
        var ruleId = rule.selectorText+"/"+line;
        this.addOldProperties(context, ruleId, inheritMode, props);
        sortProperties(props);

        return props;
    },

    addOldProperties: function(context, ruleId, inheritMode, props)
    {
        if (context.selectorMap && context.selectorMap.hasOwnProperty(ruleId) )
        {
            var moreProps = context.selectorMap[ruleId];
            for (var i = 0; i < moreProps.length; ++i)
            {
                var prop = moreProps[i];
                this.addProperty(prop.name, prop.value, prop.important, true, inheritMode, props);
            }
        }
    },

    addProperty: function(name, value, important, disabled, inheritMode, props)
    {
        name = name.toLowerCase();
        
        if (inheritMode && !inheritedStyleNames[name])
            return;

        name = this.translateName(name, value);
        if (name)
        {
            value = stripUnits(rgbToHex(value));
            important = important ? " !important" : "";

            var prop = {name: name, value: value, important: important, disabled: disabled};
            props.push(prop);
        }
    },

    translateName: function(name, value)
    {
        // Don't show these proprietary Mozilla properties
        if ((value == "-moz-initial"
            && (name == "-moz-background-clip" || name == "-moz-background-origin"
                || name == "-moz-background-inline-policy"))
        || (value == "physical"
            && (name == "margin-left-ltr-source" || name == "margin-left-rtl-source"
                || name == "margin-right-ltr-source" || name == "margin-right-rtl-source"))
        || (value == "physical"
            && (name == "padding-left-ltr-source" || name == "padding-left-rtl-source"
                || name == "padding-right-ltr-source" || name == "padding-right-rtl-source")))
            return null;

        // Translate these back to the form the user probably expects
        if (name == "margin-left-value")
            return "margin-left";
        else if (name == "margin-right-value")
            return "margin-right";
        else if (name == "margin-top-value")
            return "margin-top";
        else if (name == "margin-bottom-value")
            return "margin-bottom";
        else if (name == "padding-left-value")
            return "padding-left";
        else if (name == "padding-right-value")
            return "padding-right";
        else if (name == "padding-top-value")
            return "padding-top";
        else if (name == "padding-bottom-value")
            return "padding-bottom";
        // XXXjoe What about border!
        else
            return name;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    editElementStyle: function()
    {
        ///var rulesBox = this.panelNode.getElementsByClassName("cssElementRuleContainer")[0];
        var rulesBox = $$(".cssElementRuleContainer", this.panelNode)[0];
        var styleRuleBox = rulesBox && Firebug.getElementByRepObject(rulesBox, this.selection);
        if (!styleRuleBox)
        {
            var rule = {rule: this.selection, inherited: false, selector: "element.style", props: []};
            if (!rulesBox)
            {
                // The element did not have any displayed styles. We need to create the whole tree and remove
                // the no styles message
                styleRuleBox = this.template.cascadedTag.replace({
                    rules: [rule], inherited: [], inheritLabel: "Inherited from" // $STR("InheritedFrom")
                }, this.panelNode);

                ///styleRuleBox = styleRuleBox.getElementsByClassName("cssElementRuleContainer")[0];
                styleRuleBox = $$(".cssElementRuleContainer", styleRuleBox)[0];
            }
            else
                styleRuleBox = this.template.ruleTag.insertBefore({rule: rule}, rulesBox);

            ///styleRuleBox = styleRuleBox.getElementsByClassName("insertInto")[0];
            styleRuleBox = $$(".insertInto", styleRuleBox)[0];
        }

        Firebug.Editor.insertRowForObject(styleRuleBox);
    },

    insertPropertyRow: function(row)
    {
        Firebug.Editor.insertRowForObject(row);
    },

    insertRule: function(row)
    {
        var location = getAncestorByClass(row, "cssRule");
        if (!location)
        {
            location = getChildByClass(this.panelNode, "cssSheet");
            Firebug.Editor.insertRowForObject(location);
        }
        else
        {
            Firebug.Editor.insertRow(location, "before");
        }
    },

    editPropertyRow: function(row)
    {
        var propValueBox = getChildByClass(row, "cssPropValue");
        Firebug.Editor.startEditing(propValueBox);
    },

    deletePropertyRow: function(row)
    {
        var rule = Firebug.getRepObject(row);
        var propName = getChildByClass(row, "cssPropName")[textContent];
        Firebug.CSSModule.removeProperty(rule, propName);

        // Remove the property from the selector map, if it was disabled
        var ruleId = Firebug.getRepNode(row).getAttribute("ruleId");
        if ( this.context.selectorMap && this.context.selectorMap.hasOwnProperty(ruleId) )
        {
            var map = this.context.selectorMap[ruleId];
            for (var i = 0; i < map.length; ++i)
            {
                if (map[i].name == propName)
                {
                    map.splice(i, 1);
                    break;
                }
            }
        }
        if (this.name == "stylesheet")
            dispatch([Firebug.A11yModel], 'onInlineEditorClose', [this, row.firstChild, true]);
        row.parentNode.removeChild(row);

        this.markChange(this.name == "stylesheet");
    },

    disablePropertyRow: function(row)
    {
        toggleClass(row, "disabledStyle");

        var rule = Firebug.getRepObject(row);
        var propName = getChildByClass(row, "cssPropName")[textContent];

        if (!this.context.selectorMap)
            this.context.selectorMap = {};

        // XXXjoe Generate unique key for elements too
        var ruleId = Firebug.getRepNode(row).getAttribute("ruleId");
        if (!(this.context.selectorMap.hasOwnProperty(ruleId)))
            this.context.selectorMap[ruleId] = [];

        var map = this.context.selectorMap[ruleId];
        var propValue = getChildByClass(row, "cssPropValue")[textContent];
        var parsedValue = parsePriority(propValue);
        if (hasClass(row, "disabledStyle"))
        {
            Firebug.CSSModule.removeProperty(rule, propName);

            map.push({"name": propName, "value": parsedValue.value,
                "important": parsedValue.priority});
        }
        else
        {
            Firebug.CSSModule.setProperty(rule, propName, parsedValue.value, parsedValue.priority);

            var index = findPropByName(map, propName);
            map.splice(index, 1);
        }

        this.markChange(this.name == "stylesheet");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onMouseDown: function(event)
    {
        //console.log("onMouseDown", event.target || event.srcElement, event);
        
        // xxxpedro adjusting coordinates because the panel isn't a window yet
        var offset = event.clientX - this.panelNode.parentNode.offsetLeft;
        
        // XXjoe Hack to only allow clicking on the checkbox
        if (!isLeftClick(event) || offset > 20)
            return;

        var target = event.target || event.srcElement;
        if (hasClass(target, "textEditor"))
            return;

        var row = getAncestorByClass(target, "cssProp");
        if (row && hasClass(row, "editGroup"))
        {
            this.disablePropertyRow(row);
            cancelEvent(event);
        }
    },

    onDoubleClick: function(event)
    {
        //console.log("onDoubleClick", event.target || event.srcElement, event);
        
        // xxxpedro adjusting coordinates because the panel isn't a window yet
        var offset = event.clientX - this.panelNode.parentNode.offsetLeft;
        
        if (!isLeftClick(event) || offset <= 20)
            return;

        var target = event.target || event.srcElement;
        
        //console.log("ok", target, hasClass(target, "textEditorInner"), !isLeftClick(event), offset <= 20);
        
        // if the inline editor was clicked, don't insert a new rule
        if (hasClass(target, "textEditorInner"))
            return;
            
        var row = getAncestorByClass(target, "cssRule");
        if (row && !getAncestorByClass(target, "cssPropName")
            && !getAncestorByClass(target, "cssPropValue"))
        {
            this.insertPropertyRow(row);
            cancelEvent(event);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "stylesheet",
    title: "CSS",
    parentPanel: null,
    searchable: true,
    dependents: ["css", "stylesheet", "dom", "domSide", "layout"],
    
    options:
    {
        hasToolButtons: true
    },

    create: function()
    {
        Firebug.Panel.create.apply(this, arguments);
        
        this.onMouseDown = bind(this.onMouseDown, this);
        this.onDoubleClick = bind(this.onDoubleClick, this);

        if (this.name == "stylesheet")
        {
            this.onChangeSelect = bind(this.onChangeSelect, this);
            
            var doc = Firebug.browser.document;
            var selectNode = this.selectNode = createElement("select");
            
            CssAnalyzer.processAllStyleSheets(doc, function(doc, styleSheet)
            {
                var key = StyleSheetCache.key(styleSheet);
                var fileName = getFileName(styleSheet.href) || getFileName(doc.location.href);
                var option = createElement("option", {value: key});
                
                option.appendChild(Firebug.chrome.document.createTextNode(fileName));
                selectNode.appendChild(option);
            });
            
            this.toolButtonsNode.appendChild(selectNode);
        }
        /**/
    },
    
    onChangeSelect: function(event)
    {
        event = event || window.event;
        var target = event.srcElement || event.currentTarget;
        var key = target.value;
        var styleSheet = StyleSheetCache.get(key);
        
        this.updateLocation(styleSheet);
    },
    
    initialize: function()
    {
        Firebug.Panel.initialize.apply(this, arguments);
        
        //if (!domUtils)
        //{
        //    try {
        //        domUtils = CCSV("@mozilla.org/inspector/dom-utils;1", "inIDOMUtils");
        //    } catch (exc) {
        //        if (FBTrace.DBG_ERRORS)
        //            FBTrace.sysout("@mozilla.org/inspector/dom-utils;1 FAILED to load: "+exc, exc);
        //    }
        //}
        
        //TODO: xxxpedro
        this.context = Firebug.chrome; // TODO: xxxpedro css2
        this.document = Firebug.chrome.document; // TODO: xxxpedro css2
        
        this.initializeNode();
        
        if (this.name == "stylesheet")
        {
            var styleSheets = Firebug.browser.document.styleSheets;
            
            if (styleSheets.length > 0)
            {
                addEvent(this.selectNode, "change", this.onChangeSelect);
                
                this.updateLocation(styleSheets[0]);
            }
        }
        
        //Firebug.SourceBoxPanel.initialize.apply(this, arguments);
    },
    
    shutdown: function()
    {
        // must destroy the editor when we leave the panel to avoid problems (Issue 2981)
        Firebug.Editor.stopEditing();
        
        if (this.name == "stylesheet")
        {
            removeEvent(this.selectNode, "change", this.onChangeSelect);
        }
        
        this.destroyNode();
        
        Firebug.Panel.shutdown.apply(this, arguments);
    },

    destroy: function(state)
    {
        //state.scrollTop = this.panelNode.scrollTop ? this.panelNode.scrollTop : this.lastScrollTop;

        //persistObjects(this, state);

        // xxxpedro we are stopping the editor in the shutdown method already
        //Firebug.Editor.stopEditing();
        Firebug.Panel.destroy.apply(this, arguments);
    },

    initializeNode: function(oldPanelNode)
    {
        addEvent(this.panelNode, "mousedown", this.onMouseDown);
        addEvent(this.panelNode, "dblclick", this.onDoubleClick);
        //Firebug.SourceBoxPanel.initializeNode.apply(this, arguments);
        //dispatch([Firebug.A11yModel], 'onInitializeNode', [this, 'css']);
    },

    destroyNode: function()
    {
        removeEvent(this.panelNode, "mousedown", this.onMouseDown);
        removeEvent(this.panelNode, "dblclick", this.onDoubleClick);
        //Firebug.SourceBoxPanel.destroyNode.apply(this, arguments);
        //dispatch([Firebug.A11yModel], 'onDestroyNode', [this, 'css']);
    },

    ishow: function(state)
    {
        Firebug.Inspector.stopInspecting(true);

        this.showToolbarButtons("fbCSSButtons", true);

        if (this.context.loaded && !this.location) // wait for loadedContext to restore the panel
        {
            restoreObjects(this, state);

            if (!this.location)
                this.location = this.getDefaultLocation();

            if (state && state.scrollTop)
                this.panelNode.scrollTop = state.scrollTop;
        }
    },

    ihide: function()
    {
        this.showToolbarButtons("fbCSSButtons", false);

        this.lastScrollTop = this.panelNode.scrollTop;
    },

    supportsObject: function(object)
    {
        if (object instanceof CSSStyleSheet)
            return 1;
        else if (object instanceof CSSStyleRule)
            return 2;
        else if (object instanceof CSSStyleDeclaration)
            return 2;
        else if (object instanceof SourceLink && object.type == "css" && reCSS.test(object.href))
            return 2;
        else
            return 0;
    },

    updateLocation: function(styleSheet)
    {
        if (!styleSheet)
            return;
        if (styleSheet.editStyleSheet)
            styleSheet = styleSheet.editStyleSheet.sheet;
        
        // if it is a restricted stylesheet, show the warning message and abort the update process
        if (styleSheet.restricted)
        {
            FirebugReps.Warning.tag.replace({object: "AccessRestricted"}, this.panelNode);

            // TODO: xxxpedro remove when there the external resource problem is fixed
            CssAnalyzer.externalStyleSheetWarning.tag.append({
                object: "The stylesheet could not be loaded due to access restrictions. ",
                link: "more...",
                href: "http://getfirebug.com/wiki/index.php/Firebug_Lite_FAQ#I_keep_seeing_.22Access_to_restricted_URI_denied.22"
            }, this.panelNode);
            
            return;
        }

        var rules = this.getStyleSheetRules(this.context, styleSheet);

        var result;
        if (rules.length)
            // FIXME xxxpedro chromenew this is making iPad's Safari to crash
            result = this.template.tag.replace({rules: rules}, this.panelNode);
        else
            result = FirebugReps.Warning.tag.replace({object: "EmptyStyleSheet"}, this.panelNode);

        // TODO: xxxpedro need to fix showToolbarButtons function
        //this.showToolbarButtons("fbCSSButtons", !isSystemStyleSheet(this.location));

        //dispatch([Firebug.A11yModel], 'onCSSRulesAdded', [this, this.panelNode]);
    },

    updateSelection: function(object)
    {
        this.selection = null;

        if (object instanceof CSSStyleDeclaration) {
            object = object.parentRule;
        }

        if (object instanceof CSSStyleRule)
        {
            this.navigate(object.parentStyleSheet);
            this.highlightRule(object);
        }
        else if (object instanceof CSSStyleSheet)
        {
            this.navigate(object);
        }
        else if (object instanceof SourceLink)
        {
            try
            {
                var sourceLink = object;

                var sourceFile = getSourceFileByHref(sourceLink.href, this.context);
                if (sourceFile)
                {
                    clearNode(this.panelNode);  // replace rendered stylesheets
                    this.showSourceFile(sourceFile);

                    var lineNo = object.line;
                    if (lineNo)
                        this.scrollToLine(lineNo, this.jumpHighlightFactory(lineNo, this.context));
                }
                else // XXXjjb we should not be taking this path
                {
                    var stylesheet = getStyleSheetByHref(sourceLink.href, this.context);
                    if (stylesheet)
                        this.navigate(stylesheet);
                    else
                    {
                        if (FBTrace.DBG_CSS)
                            FBTrace.sysout("css.updateSelection no sourceFile for "+sourceLink.href, sourceLink);
                    }
                }
            }
            catch(exc) {
                if (FBTrace.DBG_CSS)
                    FBTrace.sysout("css.upDateSelection FAILS "+exc, exc);
            }
        }
    },

    updateOption: function(name, value)
    {
        if (name == "expandShorthandProps")
            this.refresh();
    },

    getLocationList: function()
    {
        var styleSheets = getAllStyleSheets(this.context);
        return styleSheets;
    },

    getOptionsMenuItems: function()
    {
        return [
            {label: "Expand Shorthand Properties", type: "checkbox", checked: Firebug.expandShorthandProps,
                    command: bindFixed(Firebug.togglePref, Firebug, "expandShorthandProps") },
            "-",
            {label: "Refresh", command: bind(this.refresh, this) }
        ];
    },

    getContextMenuItems: function(style, target)
    {
        var items = [];

        if (this.infoTipType == "color")
        {
            items.push(
                {label: "CopyColor",
                    command: bindFixed(copyToClipboard, FBL, this.infoTipObject) }
            );
        }
        else if (this.infoTipType == "image")
        {
            items.push(
                {label: "CopyImageLocation",
                    command: bindFixed(copyToClipboard, FBL, this.infoTipObject) },
                {label: "OpenImageInNewTab",
                    command: bindFixed(openNewTab, FBL, this.infoTipObject) }
            );
        }

        ///if (this.selection instanceof Element)
        if (isElement(this.selection))
        {
            items.push(
                //"-",
                {label: "EditStyle",
                    command: bindFixed(this.editElementStyle, this) }
            );
        }
        else if (!isSystemStyleSheet(this.selection))
        {
            items.push(
                    //"-",
                    {label: "NewRule",
                        command: bindFixed(this.insertRule, this, target) }
                );
        }

        var cssRule = getAncestorByClass(target, "cssRule");
        if (cssRule && hasClass(cssRule, "cssEditableRule"))
        {
            items.push(
                "-",
                {label: "NewProp",
                    command: bindFixed(this.insertPropertyRow, this, target) }
            );

            var propRow = getAncestorByClass(target, "cssProp");
            if (propRow)
            {
                var propName = getChildByClass(propRow, "cssPropName")[textContent];
                var isDisabled = hasClass(propRow, "disabledStyle");

                items.push(
                    {label: $STRF("EditProp", [propName]), nol10n: true,
                        command: bindFixed(this.editPropertyRow, this, propRow) },
                    {label: $STRF("DeleteProp", [propName]), nol10n: true,
                        command: bindFixed(this.deletePropertyRow, this, propRow) },
                    {label: $STRF("DisableProp", [propName]), nol10n: true,
                        type: "checkbox", checked: isDisabled,
                        command: bindFixed(this.disablePropertyRow, this, propRow) }
                );
            }
        }

        items.push(
            "-",
            {label: "Refresh", command: bind(this.refresh, this) }
        );

        return items;
    },

    browseObject: function(object)
    {
        if (this.infoTipType == "image")
        {
            openNewTab(this.infoTipObject);
            return true;
        }
    },

    showInfoTip: function(infoTip, target, x, y)
    {
        var propValue = getAncestorByClass(target, "cssPropValue");
        if (propValue)
        {
            var offset = getClientOffset(propValue);
            var offsetX = x-offset.x;

            var text = propValue[textContent];
            var charWidth = propValue.offsetWidth/text.length;
            var charOffset = Math.floor(offsetX/charWidth);

            var cssValue = parseCSSValue(text, charOffset);
            if (cssValue)
            {
                if (cssValue.value == this.infoTipValue)
                    return true;

                this.infoTipValue = cssValue.value;

                if (cssValue.type == "rgb" || (!cssValue.type && isColorKeyword(cssValue.value)))
                {
                    this.infoTipType = "color";
                    this.infoTipObject = cssValue.value;

                    return Firebug.InfoTip.populateColorInfoTip(infoTip, cssValue.value);
                }
                else if (cssValue.type == "url")
                {
                    ///var propNameNode = target.parentNode.getElementsByClassName("cssPropName").item(0);
                    var propNameNode = getElementByClass(target.parentNode, "cssPropName");
                    if (propNameNode && isImageRule(propNameNode[textContent]))
                    {
                        var rule = Firebug.getRepObject(target);
                        var baseURL = this.getStylesheetURL(rule);
                        var relURL = parseURLValue(cssValue.value);
                        var absURL = isDataURL(relURL) ? relURL:absoluteURL(relURL, baseURL);
                        var repeat = parseRepeatValue(text);

                        this.infoTipType = "image";
                        this.infoTipObject = absURL;

                        return Firebug.InfoTip.populateImageInfoTip(infoTip, absURL, repeat);
                    }
                }
            }
        }

        delete this.infoTipType;
        delete this.infoTipValue;
        delete this.infoTipObject;
    },

    getEditor: function(target, value)
    {
        if (target == this.panelNode
            || hasClass(target, "cssSelector") || hasClass(target, "cssRule")
            || hasClass(target, "cssSheet"))
        {
            if (!this.ruleEditor)
                this.ruleEditor = new CSSRuleEditor(this.document);

            return this.ruleEditor;
        }
        else
        {
            if (!this.editor)
                this.editor = new CSSEditor(this.document);

            return this.editor;
        }
    },

    getDefaultLocation: function()
    {
        try
        {
            var styleSheets = this.context.window.document.styleSheets;
            if (styleSheets.length)
            {
                var sheet = styleSheets[0];
                return (Firebug.filterSystemURLs && isSystemURL(getURLForStyleSheet(sheet))) ? null : sheet;
            }
        }
        catch (exc)
        {
            if (FBTrace.DBG_LOCATIONS)
                FBTrace.sysout("css.getDefaultLocation FAILS "+exc, exc);
        }
    },

    getObjectDescription: function(styleSheet)
    {
        var url = getURLForStyleSheet(styleSheet);
        var instance = getInstanceForStyleSheet(styleSheet);

        var baseDescription = splitURLBase(url);
        if (instance) {
          baseDescription.name = baseDescription.name + " #" + (instance + 1);
        }
        return baseDescription;
    },

    search: function(text, reverse)
    {
        var curDoc = this.searchCurrentDoc(!Firebug.searchGlobal, text, reverse);
        if (!curDoc && Firebug.searchGlobal)
        {
            return this.searchOtherDocs(text, reverse);
        }
        return curDoc;
    },

    searchOtherDocs: function(text, reverse)
    {
        var scanRE = Firebug.Search.getTestingRegex(text);
        function scanDoc(styleSheet) {
            // we don't care about reverse here as we are just looking for existence,
            // if we do have a result we will handle the reverse logic on display
            for (var i = 0; i < styleSheet.cssRules.length; i++)
            {
                if (scanRE.test(styleSheet.cssRules[i].cssText))
                {
                    return true;
                }
            }
        }

        if (this.navigateToNextDocument(scanDoc, reverse))
        {
            return this.searchCurrentDoc(true, text, reverse);
        }
    },

    searchCurrentDoc: function(wrapSearch, text, reverse)
    {
        if (!text)
        {
            delete this.currentSearch;
            return false;
        }

        var row;
        if (this.currentSearch && text == this.currentSearch.text)
        {
            row = this.currentSearch.findNext(wrapSearch, false, reverse, Firebug.Search.isCaseSensitive(text));
        }
        else
        {
            if (this.editing)
            {
                this.currentSearch = new TextSearch(this.stylesheetEditor.box);
                row = this.currentSearch.find(text, reverse, Firebug.Search.isCaseSensitive(text));

                if (row)
                {
                    var sel = this.document.defaultView.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(this.currentSearch.range);
                    scrollSelectionIntoView(this);
                    return true;
                }
                else
                    return false;
            }
            else
            {
                function findRow(node) { return node.nodeType == 1 ? node : node.parentNode; }
                this.currentSearch = new TextSearch(this.panelNode, findRow);
                row = this.currentSearch.find(text, reverse, Firebug.Search.isCaseSensitive(text));
            }
        }

        if (row)
        {
            this.document.defaultView.getSelection().selectAllChildren(row);
            scrollIntoCenterView(row, this.panelNode);
            dispatch([Firebug.A11yModel], 'onCSSSearchMatchFound', [this, text, row]);
            return true;
        }
        else
        {
            dispatch([Firebug.A11yModel], 'onCSSSearchMatchFound', [this, text, null]);
            return false;
        }
    },

    getSearchOptionsMenuItems: function()
    {
        return [
            Firebug.Search.searchOptionMenu("search.Case_Sensitive", "searchCaseSensitive"),
            Firebug.Search.searchOptionMenu("search.Multiple_Files", "searchGlobal")
        ];
    }
});
/**/
// ************************************************************************************************

function CSSElementPanel() {}

CSSElementPanel.prototype = extend(Firebug.CSSStyleSheetPanel.prototype,
{
    template: domplate(
    {
        cascadedTag:
            DIV({"class": "a11yCSSView",  role : 'presentation'},
                DIV({role : 'list', 'aria-label' : $STR('aria.labels.style rules') },
                    FOR("rule", "$rules",
                        TAG("$ruleTag", {rule: "$rule"})
                    )
                ),
                DIV({role : "list", 'aria-label' :$STR('aria.labels.inherited style rules')},
                    FOR("section", "$inherited",
                        H1({"class": "cssInheritHeader groupHeader focusRow", role : 'listitem' },
                            SPAN({"class": "cssInheritLabel"}, "$inheritLabel"),
                            TAG(FirebugReps.Element.shortTag, {object: "$section.element"})
                        ),
                        DIV({role : 'group'},
                            FOR("rule", "$section.rules",
                                TAG("$ruleTag", {rule: "$rule"})
                            )
                        )
                    )
                 )
            ),

        ruleTag:
            isIE ?
            // IE needs the sourceLink first, otherwise it will be rendered outside the panel
            DIV({"class": "cssElementRuleContainer"},
                TAG(FirebugReps.SourceLink.tag, {object: "$rule.sourceLink"}),
                TAG(CSSStyleRuleTag.tag, {rule: "$rule"})                
            )
            :
            // other browsers need the sourceLink last, otherwise it will cause an extra space
            // before the rule representation
            DIV({"class": "cssElementRuleContainer"},
                TAG(CSSStyleRuleTag.tag, {rule: "$rule"}),
                TAG(FirebugReps.SourceLink.tag, {object: "$rule.sourceLink"})
            )
    }),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    updateCascadeView: function(element)
    {
        //dispatch([Firebug.A11yModel], 'onBeforeCSSRulesAdded', [this]);
        var rules = [], sections = [], usedProps = {};
        this.getInheritedRules(element, sections, usedProps);
        this.getElementRules(element, rules, usedProps);

        if (rules.length || sections.length)
        {
            var inheritLabel = "Inherited from"; // $STR("InheritedFrom");
            var result = this.template.cascadedTag.replace({rules: rules, inherited: sections,
                inheritLabel: inheritLabel}, this.panelNode);
            //dispatch([Firebug.A11yModel], 'onCSSRulesAdded', [this, result]);
        }
        else
        {
            var result = FirebugReps.Warning.tag.replace({object: "EmptyElementCSS"}, this.panelNode);
            //dispatch([Firebug.A11yModel], 'onCSSRulesAdded', [this, result]);
        }

        // TODO: xxxpedro remove when there the external resource problem is fixed
        if (CssAnalyzer.hasExternalStyleSheet())
            CssAnalyzer.externalStyleSheetWarning.tag.append({
                object: "The results here may be inaccurate because some " +
                        "stylesheets could not be loaded due to access restrictions. ",
                link: "more...",
                href: "http://getfirebug.com/wiki/index.php/Firebug_Lite_FAQ#I_keep_seeing_.22This_element_has_no_style_rules.22"
            }, this.panelNode);
    },

    getStylesheetURL: function(rule)
    {
        // if the parentStyleSheet.href is null, CSS std says its inline style.
        // TODO: xxxpedro IE doesn't have rule.parentStyleSheet so we must fall back to the doc.location
        if (rule && rule.parentStyleSheet && rule.parentStyleSheet.href)
            return rule.parentStyleSheet.href;
        else
            return this.selection.ownerDocument.location.href;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getInheritedRules: function(element, sections, usedProps)
    {
        var parent = element.parentNode;
        if (parent && parent.nodeType == 1)
        {
            this.getInheritedRules(parent, sections, usedProps);

            var rules = [];
            this.getElementRules(parent, rules, usedProps, true);

            if (rules.length)
                sections.splice(0, 0, {element: parent, rules: rules});
        }
    },

    getElementRules: function(element, rules, usedProps, inheritMode)
    {
        var inspectedRules, displayedRules = {};
        
        inspectedRules = CssAnalyzer.getElementCSSRules(element);

        if (inspectedRules)
        {
            for (var i = 0, length=inspectedRules.length; i < length; ++i)
            {
                var ruleId = inspectedRules[i];
                var ruleData = CssAnalyzer.getRuleData(ruleId);
                var rule = ruleData.rule;
                
                var ssid = ruleData.styleSheetId;
                var parentStyleSheet = StyleSheetCache.get(ssid); 

                var href = parentStyleSheet.externalURL ? parentStyleSheet.externalURL : parentStyleSheet.href;  // Null means inline

                var instance = null;
                //var instance = getInstanceForStyleSheet(rule.parentStyleSheet, element.ownerDocument);

                var isSystemSheet = false;
                //var isSystemSheet = isSystemStyleSheet(rule.parentStyleSheet);
                
                if (!Firebug.showUserAgentCSS && isSystemSheet) // This removes user agent rules
                    continue;
                
                if (!href)
                    href = element.ownerDocument.location.href; // http://code.google.com/p/fbug/issues/detail?id=452

                var props = this.getRuleProperties(this.context, rule, inheritMode);
                if (inheritMode && !props.length)
                    continue;

                //
                //var line = domUtils.getRuleLine(rule);
                // TODO: xxxpedro CSS line number 
                var line = ruleData.lineNo;
                
                var ruleId = rule.selectorText+"/"+line;
                var sourceLink = new SourceLink(href, line, "css", rule, instance);

                this.markOverridenProps(props, usedProps, inheritMode);

                rules.splice(0, 0, {rule: rule, id: ruleId,
                        selector: ruleData.selector, sourceLink: sourceLink,
                        props: props, inherited: inheritMode,
                        isSystemSheet: isSystemSheet});
            }
        }

        if (element.style)
            this.getStyleProperties(element, rules, usedProps, inheritMode);

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("getElementRules "+rules.length+" rules for "+getElementXPath(element), rules);
    },
    /*
    getElementRules: function(element, rules, usedProps, inheritMode)
    {
        var inspectedRules, displayedRules = {};
        try
        {
            inspectedRules = domUtils ? domUtils.getCSSStyleRules(element) : null;
        } catch (exc) {}

        if (inspectedRules)
        {
            for (var i = 0; i < inspectedRules.Count(); ++i)
            {
                var rule = QI(inspectedRules.GetElementAt(i), nsIDOMCSSStyleRule);

                var href = rule.parentStyleSheet.href;  // Null means inline

                var instance = getInstanceForStyleSheet(rule.parentStyleSheet, element.ownerDocument);

                var isSystemSheet = isSystemStyleSheet(rule.parentStyleSheet);
                if (!Firebug.showUserAgentCSS && isSystemSheet) // This removes user agent rules
                    continue;
                if (!href)
                    href = element.ownerDocument.location.href; // http://code.google.com/p/fbug/issues/detail?id=452

                var props = this.getRuleProperties(this.context, rule, inheritMode);
                if (inheritMode && !props.length)
                    continue;

                var line = domUtils.getRuleLine(rule);
                var ruleId = rule.selectorText+"/"+line;
                var sourceLink = new SourceLink(href, line, "css", rule, instance);

                this.markOverridenProps(props, usedProps, inheritMode);

                rules.splice(0, 0, {rule: rule, id: ruleId,
                        selector: rule.selectorText, sourceLink: sourceLink,
                        props: props, inherited: inheritMode,
                        isSystemSheet: isSystemSheet});
            }
        }

        if (element.style)
            this.getStyleProperties(element, rules, usedProps, inheritMode);

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("getElementRules "+rules.length+" rules for "+getElementXPath(element), rules);
    },
    /**/
    markOverridenProps: function(props, usedProps, inheritMode)
    {
        for (var i = 0; i < props.length; ++i)
        {
            var prop = props[i];
            if ( usedProps.hasOwnProperty(prop.name) )
            {
                var deadProps = usedProps[prop.name]; // all previous occurrences of this property
                for (var j = 0; j < deadProps.length; ++j)
                {
                    var deadProp = deadProps[j];
                    if (!deadProp.disabled && !deadProp.wasInherited && deadProp.important && !prop.important)
                        prop.overridden = true;  // new occurrence overridden
                    else if (!prop.disabled)
                        deadProp.overridden = true;  // previous occurrences overridden
                }
            }
            else
                usedProps[prop.name] = [];

            prop.wasInherited = inheritMode ? true : false;
            usedProps[prop.name].push(prop);  // all occurrences of a property seen so far, by name
        }
    },

    getStyleProperties: function(element, rules, usedProps, inheritMode)
    {
        var props = this.parseCSSProps(element.style, inheritMode);
        this.addOldProperties(this.context, getElementXPath(element), inheritMode, props);

        sortProperties(props);
        this.markOverridenProps(props, usedProps, inheritMode);

        if (props.length)
            rules.splice(0, 0,
                    {rule: element, id: getElementXPath(element),
                        selector: "element.style", props: props, inherited: inheritMode});
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "css",
    title: "Style",
    parentPanel: "HTML",
    order: 0,

    initialize: function()
    {
        this.context = Firebug.chrome; // TODO: xxxpedro css2
        this.document = Firebug.chrome.document; // TODO: xxxpedro css2
        
        Firebug.CSSStyleSheetPanel.prototype.initialize.apply(this, arguments);
        
        // TODO: xxxpedro css2
        var selection = ElementCache.get(Firebug.context.persistedState.selectedHTMLElementId);
        if (selection)
            this.select(selection, true);
        
        //this.updateCascadeView(document.getElementsByTagName("h1")[0]);
        //this.updateCascadeView(document.getElementById("build"));
        
        /*
        this.onStateChange = bindFixed(this.contentStateCheck, this);
        this.onHoverChange = bindFixed(this.contentStateCheck, this, STATE_HOVER);
        this.onActiveChange = bindFixed(this.contentStateCheck, this, STATE_ACTIVE);
        /**/
    },

    ishow: function(state)
    {
    },

    watchWindow: function(win)
    {
        if (domUtils)
        {
            // Normally these would not be required, but in order to update after the state is set
            // using the options menu we need to monitor these global events as well
            var doc = win.document;
            ///addEvent(doc, "mouseover", this.onHoverChange);
            ///addEvent(doc, "mousedown", this.onActiveChange);
        }
    },
    unwatchWindow: function(win)
    {
        var doc = win.document;
        ///removeEvent(doc, "mouseover", this.onHoverChange);
        ///removeEvent(doc, "mousedown", this.onActiveChange);

        if (isAncestor(this.stateChangeEl, doc))
        {
            this.removeStateChangeHandlers();
        }
    },

    supportsObject: function(object)
    {
        return object instanceof Element ? 1 : 0;
    },

    updateView: function(element)
    {
        this.updateCascadeView(element);
        if (domUtils)
        {
            this.contentState = safeGetContentState(element);
            this.addStateChangeHandlers(element);
        }
    },

    updateSelection: function(element)
    {
        if ( !instanceOf(element , "Element") ) // html supports SourceLink
            return;

        if (sothinkInstalled)
        {
            FirebugReps.Warning.tag.replace({object: "SothinkWarning"}, this.panelNode);
            return;
        }

        /*
        if (!domUtils)
        {
            FirebugReps.Warning.tag.replace({object: "DOMInspectorWarning"}, this.panelNode);
            return;
        }
        /**/

        if (!element)
            return;

        this.updateView(element);
    },

    updateOption: function(name, value)
    {
        if (name == "showUserAgentCSS" || name == "expandShorthandProps")
            this.refresh();
    },

    getOptionsMenuItems: function()
    {
        var ret = [
            {label: "Show User Agent CSS", type: "checkbox", checked: Firebug.showUserAgentCSS,
                    command: bindFixed(Firebug.togglePref, Firebug, "showUserAgentCSS") },
            {label: "Expand Shorthand Properties", type: "checkbox", checked: Firebug.expandShorthandProps,
                    command: bindFixed(Firebug.togglePref, Firebug, "expandShorthandProps") }
        ];
        if (domUtils && this.selection)
        {
            var state = safeGetContentState(this.selection);

            ret.push("-");
            ret.push({label: ":active", type: "checkbox", checked: state & STATE_ACTIVE,
              command: bindFixed(this.updateContentState, this, STATE_ACTIVE, state & STATE_ACTIVE)});
            ret.push({label: ":hover", type: "checkbox", checked: state & STATE_HOVER,
              command: bindFixed(this.updateContentState, this, STATE_HOVER, state & STATE_HOVER)});
        }
        return ret;
    },

    updateContentState: function(state, remove)
    {
        domUtils.setContentState(remove ? this.selection.ownerDocument.documentElement : this.selection, state);
        this.refresh();
    },

    addStateChangeHandlers: function(el)
    {
      this.removeStateChangeHandlers();

      /*
      addEvent(el, "focus", this.onStateChange);
      addEvent(el, "blur", this.onStateChange);
      addEvent(el, "mouseup", this.onStateChange);
      addEvent(el, "mousedown", this.onStateChange);
      addEvent(el, "mouseover", this.onStateChange);
      addEvent(el, "mouseout", this.onStateChange);
      /**/

      this.stateChangeEl = el;
    },

    removeStateChangeHandlers: function()
    {
        var sel = this.stateChangeEl;
        if (sel)
        {
            /*
            removeEvent(sel, "focus", this.onStateChange);
            removeEvent(sel, "blur", this.onStateChange);
            removeEvent(sel, "mouseup", this.onStateChange);
            removeEvent(sel, "mousedown", this.onStateChange);
            removeEvent(sel, "mouseover", this.onStateChange);
            removeEvent(sel, "mouseout", this.onStateChange);
            /**/
        }
    },

    contentStateCheck: function(state)
    {
        if (!state || this.contentState & state)
        {
            var timeoutRunner = bindFixed(function()
            {
                var newState = safeGetContentState(this.selection);
                if (newState != this.contentState)
                {
                    this.context.invalidatePanels(this.name);
                }
            }, this);

            // Delay exec until after the event has processed and the state has been updated
            setTimeout(timeoutRunner, 0);
        }
    }
});

function safeGetContentState(selection)
{
    try
    {
        return domUtils.getContentState(selection);
    }
    catch (e)
    {
        if (FBTrace.DBG_ERRORS)
            FBTrace.sysout("css.safeGetContentState; EXCEPTION", e);
    }
}

// ************************************************************************************************

function CSSComputedElementPanel() {}

CSSComputedElementPanel.prototype = extend(CSSElementPanel.prototype,
{
    template: domplate(
    {
        computedTag:
            DIV({"class": "a11yCSSView", role : "list", "aria-label" : $STR('aria.labels.computed styles')},
                FOR("group", "$groups",
                    H1({"class": "cssInheritHeader groupHeader focusRow", role : "listitem"},
                        SPAN({"class": "cssInheritLabel"}, "$group.title")
                    ),
                    TABLE({width: "100%", role : 'group'},
                        TBODY({role : 'presentation'},
                            FOR("prop", "$group.props",
                                TR({"class": 'focusRow computedStyleRow', role : 'listitem'},
                                    TD({"class": "stylePropName", role : 'presentation'}, "$prop.name"),
                                    TD({"class": "stylePropValue", role : 'presentation'}, "$prop.value")
                                )
                            )
                        )
                    )
                )
            )
    }),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    updateComputedView: function(element)
    {
        var win = isIE ?
                element.ownerDocument.parentWindow :
                element.ownerDocument.defaultView;
        
        var style = isIE ?
                element.currentStyle :
                win.getComputedStyle(element, "");

        var groups = [];

        for (var groupName in styleGroups)
        {
            // TODO: xxxpedro i18n $STR
            //var title = $STR("StyleGroup-" + groupName);
            var title = styleGroupTitles[groupName];
            var group = {title: title, props: []};
            groups.push(group);

            var props = styleGroups[groupName];
            for (var i = 0; i < props.length; ++i)
            {
                var propName = props[i];
                var propValue = style.getPropertyValue ?
                        style.getPropertyValue(propName) :
                        ""+style[toCamelCase(propName)];
                
                if (propValue === undefined || propValue === null) 
                    continue;
                
                propValue = stripUnits(rgbToHex(propValue));
                if (propValue)
                    group.props.push({name: propName, value: propValue});
            }
        }

        var result = this.template.computedTag.replace({groups: groups}, this.panelNode);
        //dispatch([Firebug.A11yModel], 'onCSSRulesAdded', [this, result]);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "computed",
    title: "Computed",
    parentPanel: "HTML",
    order: 1,

    updateView: function(element)
    {
        this.updateComputedView(element);
    },

    getOptionsMenuItems: function()
    {
        return [
            {label: "Refresh", command: bind(this.refresh, this) }
        ];
    }
});

// ************************************************************************************************
// CSSEditor

function CSSEditor(doc)
{
    this.initializeInline(doc);
}

CSSEditor.prototype = domplate(Firebug.InlineEditor.prototype,
{
    insertNewRow: function(target, insertWhere)
    {
        var rule = Firebug.getRepObject(target);
        var emptyProp = 
        {
            // TODO: xxxpedro - uses charCode(255) to force the element being rendered, 
            // allowing webkit to get the correct position of the property name "span",
            // when inserting a new CSS rule?
            name: "",
            value: "",
            important: ""
        };

        if (insertWhere == "before")
            return CSSPropTag.tag.insertBefore({prop: emptyProp, rule: rule}, target);
        else
            return CSSPropTag.tag.insertAfter({prop: emptyProp, rule: rule}, target);
    },

    saveEdit: function(target, value, previousValue)
    {
        // We need to check the value first in order to avoid a problem in IE8 
        // See Issue 3038: Empty (null) styles when adding CSS styles in Firebug Lite 
        if (!value) return;
        
        target.innerHTML = escapeForCss(value);

        var row = getAncestorByClass(target, "cssProp");
        if (hasClass(row, "disabledStyle"))
            toggleClass(row, "disabledStyle");

        var rule = Firebug.getRepObject(target);

        if (hasClass(target, "cssPropName"))
        {
            if (value && previousValue != value)  // name of property has changed.
            {
                var propValue = getChildByClass(row, "cssPropValue")[textContent];
                var parsedValue = parsePriority(propValue);

                if (propValue && propValue != "undefined") {
                    if (FBTrace.DBG_CSS)
                        FBTrace.sysout("CSSEditor.saveEdit : "+previousValue+"->"+value+" = "+propValue+"\n");
                    if (previousValue)
                        Firebug.CSSModule.removeProperty(rule, previousValue);
                    Firebug.CSSModule.setProperty(rule, value, parsedValue.value, parsedValue.priority);
                }
            }
            else if (!value) // name of the property has been deleted, so remove the property.
                Firebug.CSSModule.removeProperty(rule, previousValue);
        }
        else if (getAncestorByClass(target, "cssPropValue"))
        {
            var propName = getChildByClass(row, "cssPropName")[textContent];
            var propValue = getChildByClass(row, "cssPropValue")[textContent];

            if (FBTrace.DBG_CSS)
            {
                FBTrace.sysout("CSSEditor.saveEdit propName=propValue: "+propName +" = "+propValue+"\n");
               // FBTrace.sysout("CSSEditor.saveEdit BEFORE style:",style);
            }

            if (value && value != "null")
            {
                var parsedValue = parsePriority(value);
                Firebug.CSSModule.setProperty(rule, propName, parsedValue.value, parsedValue.priority);
            }
            else if (previousValue && previousValue != "null")
                Firebug.CSSModule.removeProperty(rule, propName);
        }

        this.panel.markChange(this.panel.name == "stylesheet");
    },

    advanceToNext: function(target, charCode)
    {
        if (charCode == 58 /*":"*/ && hasClass(target, "cssPropName"))
            return true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getAutoCompleteRange: function(value, offset)
    {
        if (hasClass(this.target, "cssPropName"))
            return {start: 0, end: value.length-1};
        else
            return parseCSSValue(value, offset);
    },

    getAutoCompleteList: function(preExpr, expr, postExpr)
    {
        if (hasClass(this.target, "cssPropName"))
        {
            return getCSSPropertyNames();
        }
        else
        {
            var row = getAncestorByClass(this.target, "cssProp");
            var propName = getChildByClass(row, "cssPropName")[textContent];
            return getCSSKeywordsByProperty(propName);
        }
    }
});

//************************************************************************************************
//CSSRuleEditor

function CSSRuleEditor(doc)
{
    this.initializeInline(doc);
    this.completeAsYouType = false;
}
CSSRuleEditor.uniquifier = 0;
CSSRuleEditor.prototype = domplate(Firebug.InlineEditor.prototype,
{
    insertNewRow: function(target, insertWhere)
    {
         var emptyRule = {
                 selector: "",
                 id: "",
                 props: [],
                 isSelectorEditable: true
         };

         if (insertWhere == "before")
             return CSSStyleRuleTag.tag.insertBefore({rule: emptyRule}, target);
         else
             return CSSStyleRuleTag.tag.insertAfter({rule: emptyRule}, target);
    },

    saveEdit: function(target, value, previousValue)
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("CSSRuleEditor.saveEdit: '" + value + "'  '" + previousValue + "'", target);

        target.innerHTML = escapeForCss(value);

        if (value === previousValue)     return;

        var row = getAncestorByClass(target, "cssRule");
        var styleSheet = this.panel.location;
        styleSheet = styleSheet.editStyleSheet ? styleSheet.editStyleSheet.sheet : styleSheet;

        var cssRules = styleSheet.cssRules;
        var rule = Firebug.getRepObject(target), oldRule = rule;
        var ruleIndex = cssRules.length;
        if (rule || Firebug.getRepObject(row.nextSibling))
        {
            var searchRule = rule || Firebug.getRepObject(row.nextSibling);
            for (ruleIndex=0; ruleIndex<cssRules.length && searchRule!=cssRules[ruleIndex]; ruleIndex++) {}
        }

        // Delete in all cases except for new add
        // We want to do this before the insert to ease change tracking
        if (oldRule)
        {
            Firebug.CSSModule.deleteRule(styleSheet, ruleIndex);
        }

        // Firefox does not follow the spec for the update selector text case.
        // When attempting to update the value, firefox will silently fail.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=37468 for the quite
        // old discussion of this bug.
        // As a result we need to recreate the style every time the selector
        // changes.
        if (value)
        {
            var cssText = [ value, "{" ];
            var props = row.getElementsByClassName("cssProp");
            for (var i = 0; i < props.length; i++) {
                var propEl = props[i];
                if (!hasClass(propEl, "disabledStyle")) {
                    cssText.push(getChildByClass(propEl, "cssPropName")[textContent]);
                    cssText.push(":");
                    cssText.push(getChildByClass(propEl, "cssPropValue")[textContent]);
                    cssText.push(";");
                }
            }
            cssText.push("}");
            cssText = cssText.join("");

            try
            {
                var insertLoc = Firebug.CSSModule.insertRule(styleSheet, cssText, ruleIndex);
                rule = cssRules[insertLoc];
                ruleIndex++;
            }
            catch (err)
            {
                if (FBTrace.DBG_CSS || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("CSS Insert Error: "+err, err);

                target.innerHTML = escapeForCss(previousValue);
                row.repObject = undefined;
                return;
            }
        } else {
            rule = undefined;
        }

        // Update the rep object
        row.repObject = rule;
        if (!oldRule)
        {
            // Who knows what the domutils will return for rule line
            // for a recently created rule. To be safe we just generate
            // a unique value as this is only used as an internal key.
            var ruleId = "new/"+value+"/"+(++CSSRuleEditor.uniquifier);
            row.setAttribute("ruleId", ruleId);
        }

        this.panel.markChange(this.panel.name == "stylesheet");
    }
});

// ************************************************************************************************
// StyleSheetEditor

function StyleSheetEditor(doc)
{
    this.box = this.tag.replace({}, doc, this);
    this.input = this.box.firstChild;
}

StyleSheetEditor.prototype = domplate(Firebug.BaseEditor,
{
    multiLine: true,

    tag: DIV(
        TEXTAREA({"class": "styleSheetEditor fullPanelEditor", oninput: "$onInput"})
    ),

    getValue: function()
    {
        return this.input.value;
    },

    setValue: function(value)
    {
        return this.input.value = value;
    },

    show: function(target, panel, value, textSize, targetSize)
    {
        this.target = target;
        this.panel = panel;

        this.panel.panelNode.appendChild(this.box);

        this.input.value = value;
        this.input.focus();

        var command = Firebug.chrome.$("cmd_toggleCSSEditing");
        command.setAttribute("checked", true);
    },

    hide: function()
    {
        var command = Firebug.chrome.$("cmd_toggleCSSEditing");
        command.setAttribute("checked", false);

        if (this.box.parentNode == this.panel.panelNode)
            this.panel.panelNode.removeChild(this.box);

        delete this.target;
        delete this.panel;
        delete this.styleSheet;
    },

    saveEdit: function(target, value, previousValue)
    {
        Firebug.CSSModule.freeEdit(this.styleSheet, value);
    },

    endEditing: function()
    {
        this.panel.refresh();
        return true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onInput: function()
    {
        Firebug.Editor.update();
    },

    scrollToLine: function(line, offset)
    {
        this.startMeasuring(this.input);
        var lineHeight = this.measureText().height;
        this.stopMeasuring();

        this.input.scrollTop = (line * lineHeight) + offset;
    }
});

// ************************************************************************************************
// Local Helpers

var rgbToHex = function rgbToHex(value)
{
    return value.replace(/\brgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)/gi, rgbToHexReplacer);
};

var rgbToHexReplacer = function(_, r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + (b << 0)).toString(16).substr(-6).toUpperCase();
};

var stripUnits = function stripUnits(value)
{
    // remove units from '0px', '0em' etc. leave non-zero units in-tact.
    return value.replace(/(url\(.*?\)|[^0]\S*\s*)|0(%|em|ex|px|in|cm|mm|pt|pc)(\s|$)/gi, stripUnitsReplacer);
};

var stripUnitsReplacer = function(_, skip, remove, whitespace) {
    return skip || ('0' + whitespace);
};

function parsePriority(value)
{
    var rePriority = /(.*?)\s*(!important)?$/;
    var m = rePriority.exec(value);
    var propValue = m ? m[1] : "";
    var priority = m && m[2] ? "important" : "";
    return {value: propValue, priority: priority};
}

function parseURLValue(value)
{
    var m = reURL.exec(value);
    return m ? m[1] : "";
}

function parseRepeatValue(value)
{
    var m = reRepeat.exec(value);
    return m ? m[0] : "";
}

function parseCSSValue(value, offset)
{
    var start = 0;
    var m;
    while (1)
    {
        m = reSplitCSS.exec(value);
        if (m && m.index+m[0].length < offset)
        {
            value = value.substr(m.index+m[0].length);
            start += m.index+m[0].length;
            offset -= m.index+m[0].length;
        }
        else
            break;
    }

    if (m)
    {
        var type;
        if (m[1])
            type = "url";
        else if (m[2] || m[3])
            type = "rgb";
        else if (m[4])
            type = "int";

        return {value: m[0], start: start+m.index, end: start+m.index+(m[0].length-1), type: type};
    }
}

function findPropByName(props, name)
{
    for (var i = 0; i < props.length; ++i)
    {
        if (props[i].name == name)
            return i;
    }
}

function sortProperties(props)
{
    props.sort(function(a, b)
    {
        return a.name > b.name ? 1 : -1;
    });
}

function getTopmostRuleLine(panelNode)
{
    for (var child = panelNode.firstChild; child; child = child.nextSibling)
    {
        if (child.offsetTop+child.offsetHeight > panelNode.scrollTop)
        {
            var rule = child.repObject;
            if (rule)
                return {
                    line: domUtils.getRuleLine(rule),
                    offset: panelNode.scrollTop-child.offsetTop
                };
        }
    }
    return 0;
}

function getStyleSheetCSS(sheet, context)
{
    if (sheet.ownerNode instanceof HTMLStyleElement)
        return sheet.ownerNode.innerHTML;
    else
        return context.sourceCache.load(sheet.href).join("");
}

function getStyleSheetOwnerNode(sheet) {
    for (; sheet && !sheet.ownerNode; sheet = sheet.parentStyleSheet);

    return sheet.ownerNode;
}

function scrollSelectionIntoView(panel)
{
    var selCon = getSelectionController(panel);
    selCon.scrollSelectionIntoView(
            nsISelectionController.SELECTION_NORMAL,
            nsISelectionController.SELECTION_FOCUS_REGION, true);
}

function getSelectionController(panel)
{
    var browser = Firebug.chrome.getPanelBrowser(panel);
    return browser.docShell.QueryInterface(nsIInterfaceRequestor)
        .getInterface(nsISelectionDisplay)
        .QueryInterface(nsISelectionController);
}

// ************************************************************************************************

Firebug.registerModule(Firebug.CSSModule);
Firebug.registerPanel(Firebug.CSSStyleSheetPanel);
Firebug.registerPanel(CSSElementPanel);
Firebug.registerPanel(CSSComputedElementPanel);

// ************************************************************************************************

}});
