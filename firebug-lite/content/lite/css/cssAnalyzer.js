/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// StyleSheet Parser

var CssAnalyzer = {};

// ************************************************************************************************
// Locals

var CSSRuleMap = {};
var ElementCSSRulesMap = {};

var internalStyleSheetIndex = -1;

var reSelectorTag = /(^|\s)(?:\w+)/g;
var reSelectorClass = /\.[\w\d_-]+/g;
var reSelectorId = /#[\w\d_-]+/g;

var globalCSSRuleIndex;

var processAllStyleSheetsTimeout = null;

var externalStyleSheetURLs = [];

var ElementCache = Firebug.Lite.Cache.Element;
var StyleSheetCache = Firebug.Lite.Cache.StyleSheet;

//************************************************************************************************
// CSS Analyzer templates

CssAnalyzer.externalStyleSheetWarning = domplate(Firebug.Rep,
{
    tag:
        DIV({"class": "warning focusRow", style: "font-weight:normal;", role: 'listitem'},
            SPAN("$object|STR"),
            A({"href": "$href", target:"_blank"}, "$link|STR")
        )
});

// ************************************************************************************************
// CSS Analyzer methods

CssAnalyzer.processAllStyleSheets = function(doc, styleSheetIterator)
{
    try
    {
        processAllStyleSheets(doc, styleSheetIterator);
    }
    catch(e)
    {
        // TODO: FBTrace condition
        FBTrace.sysout("CssAnalyzer.processAllStyleSheets fails: ", e);
    }
};

/**
 * 
 * @param element
 * @returns {String[]} Array of IDs of CSS Rules
 */
CssAnalyzer.getElementCSSRules = function(element)
{
    try
    {
        return getElementCSSRules(element);
    }
    catch(e)
    {
        // TODO: FBTrace condition
        FBTrace.sysout("CssAnalyzer.getElementCSSRules fails: ", e);
    }
};

CssAnalyzer.getRuleData = function(ruleId)
{
    return CSSRuleMap[ruleId];
};

// TODO: do we need this?
CssAnalyzer.getRuleLine = function()
{
};

CssAnalyzer.hasExternalStyleSheet = function()
{
    return externalStyleSheetURLs.length > 0;
};

CssAnalyzer.parseStyleSheet = function(href)
{
    var sourceData = extractSourceData(href);
    var parsedObj = CssParser.read(sourceData.source, sourceData.startLine);
    var parsedRules = parsedObj.children;
    
    // See: Issue 4776: [Firebug lite] CSS Media Types
    //
    // Ignore all special selectors like @media and @page
    for(var i=0; i < parsedRules.length; )
    {
        if (parsedRules[i].selector.indexOf("@") != -1)
        {
            parsedRules.splice(i, 1);
        }
        else
            i++;
    }
    
    return parsedRules;
};

//************************************************************************************************
// Internals
//************************************************************************************************

// ************************************************************************************************
// StyleSheet processing

var processAllStyleSheets = function(doc, styleSheetIterator)
{
    styleSheetIterator = styleSheetIterator || processStyleSheet;
    
    globalCSSRuleIndex = -1;
    
    var styleSheets = doc.styleSheets;
    var importedStyleSheets = [];
    
    if (FBTrace.DBG_CSS)
        var start = new Date().getTime();
    
    for(var i=0, length=styleSheets.length; i<length; i++)
    {
        try
        {
            var styleSheet = styleSheets[i];
            
            if ("firebugIgnore" in styleSheet) continue;
            
            // we must read the length to make sure we have permission to read 
            // the stylesheet's content. If an error occurs here, we cannot 
            // read the stylesheet due to access restriction policy
            var rules = isIE ? styleSheet.rules : styleSheet.cssRules;
            rules.length;
        }
        catch(e)
        {
            externalStyleSheetURLs.push(styleSheet.href);
            styleSheet.restricted = true;
            var ssid = StyleSheetCache(styleSheet);
            
            /// TODO: xxxpedro external css
            //loadExternalStylesheet(doc, styleSheetIterator, styleSheet);
        }
        
        // process internal and external styleSheets
        styleSheetIterator(doc, styleSheet);
        
        var importedStyleSheet, importedRules;
        
        // process imported styleSheets in IE
        if (isIE)
        {
            var imports = styleSheet.imports;
            
            for(var j=0, importsLength=imports.length; j<importsLength; j++)
            {
                try
                {
                    importedStyleSheet = imports[j];
                    // we must read the length to make sure we have permission
                    // to read the imported stylesheet's content. 
                    importedRules = importedStyleSheet.rules;
                    importedRules.length;
                }
                catch(e)
                {
                    externalStyleSheetURLs.push(styleSheet.href);
                    importedStyleSheet.restricted = true;
                    var ssid = StyleSheetCache(importedStyleSheet);
                }
                
                styleSheetIterator(doc, importedStyleSheet);
            }
        }
        // process imported styleSheets in other browsers
        else if (rules)
        {
            for(var j=0, rulesLength=rules.length; j<rulesLength; j++)
            {
                try
                {
                    var rule = rules[j];
                    
                    importedStyleSheet = rule.styleSheet;
                    
                    if (importedStyleSheet)
                    {
                        // we must read the length to make sure we have permission
                        // to read the imported stylesheet's content. 
                        importedRules = importedStyleSheet.cssRules;
                        importedRules.length;
                    }
                    else
                        break;
                }
                catch(e)
                {
                    externalStyleSheetURLs.push(styleSheet.href);
                    importedStyleSheet.restricted = true;
                    var ssid = StyleSheetCache(importedStyleSheet);
                }

                styleSheetIterator(doc, importedStyleSheet);
            }
        }
    };
    
    if (FBTrace.DBG_CSS)
    {
        FBTrace.sysout("FBL.processAllStyleSheets", "all stylesheet rules processed in " + (new Date().getTime() - start) + "ms");
    }
};

// ************************************************************************************************

var processStyleSheet = function(doc, styleSheet)
{
    if (styleSheet.restricted)
        return;
    
    var rules = isIE ? styleSheet.rules : styleSheet.cssRules;
    
    var ssid = StyleSheetCache(styleSheet);
    
    var href = styleSheet.href;
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // CSS Parser
    var shouldParseCSS = typeof CssParser != "undefined" && !Firebug.disableResourceFetching;
    if (shouldParseCSS)
    {
        try
        {
            var parsedRules = CssAnalyzer.parseStyleSheet(href); 
        }
        catch(e)
        {
            if (FBTrace.DBG_ERRORS) FBTrace.sysout("processStyleSheet FAILS", e.message || e);
            shouldParseCSS = false;
        }
        finally
        {
            var parsedRulesIndex = 0;
            
            var dontSupportGroupedRules = isIE && browserVersion < 9;
            var group = [];
            var groupItem;
        }
    }
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    for (var i=0, length=rules.length; i<length; i++)
    {
        // TODO: xxxpedro is there a better way to cache CSS Rules? The problem is that
        // we cannot add expando properties in the rule object in IE
        var rid = ssid + ":" + i;
        var rule = rules[i];
        var selector = rule.selectorText || "";
        var lineNo = null;
        
        // See: Issue 4776: [Firebug lite] CSS Media Types
        //
        // Ignore all special selectors like @media and @page
        if (!selector || selector.indexOf("@") != -1)
            continue;
        
        if (isIE)
            selector = selector.replace(reSelectorTag, function(s){return s.toLowerCase();});
        
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // CSS Parser
        if (shouldParseCSS)
        {
            var parsedRule = parsedRules[parsedRulesIndex];
            var parsedSelector = parsedRule.selector;

            if (dontSupportGroupedRules && parsedSelector.indexOf(",") != -1 && group.length == 0)
                group = parsedSelector.split(",");
            
            if (dontSupportGroupedRules && group.length > 0)
            {
                groupItem = group.shift();
                
                if (CssParser.normalizeSelector(selector) == groupItem)
                    lineNo = parsedRule.line;
                
                if (group.length == 0)
                    parsedRulesIndex++;
            }
            else if (CssParser.normalizeSelector(selector) == parsedRule.selector)
            {
                lineNo = parsedRule.line;
                parsedRulesIndex++;
            }
        }
        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        CSSRuleMap[rid] =
        {
            styleSheetId: ssid,
            styleSheetIndex: i,
            order: ++globalCSSRuleIndex,
            specificity: 
                // See: Issue 4777: [Firebug lite] Specificity of CSS Rules
                //
                // if it is a normal selector then calculate the specificity
                selector && selector.indexOf(",") == -1 ? 
                getCSSRuleSpecificity(selector) : 
                // See: Issue 3262: [Firebug lite] Specificity of grouped CSS Rules
                //
                // if it is a grouped selector, do not calculate the specificity
                // because the correct value will depend of the matched element.
                // The proper specificity value for grouped selectors are calculated
                // via getElementCSSRules(element)
                0,
            
            rule: rule,
            lineNo: lineNo,
            selector: selector,
            cssText: rule.style ? rule.style.cssText : rule.cssText ? rule.cssText : ""        
        };
        
        // TODO: what happens with elements added after this? Need to create a test case.
        // Maybe we should place this at getElementCSSRules() but it will make the function
        // a lot more expensive.
        // 
        // Maybe add a "refresh" button?
        var elements = Firebug.Selector(selector, doc);
        
        for (var j=0, elementsLength=elements.length; j<elementsLength; j++)
        {
            var element = elements[j];
            var eid = ElementCache(element);
            
            if (!ElementCSSRulesMap[eid])
                ElementCSSRulesMap[eid] = [];
            
            ElementCSSRulesMap[eid].push(rid);
        }
        
        //console.log(selector, elements);
    }
};

// ************************************************************************************************
// External StyleSheet Loader

var loadExternalStylesheet = function(doc, styleSheetIterator, styleSheet)
{
    var url = styleSheet.href;
    styleSheet.firebugIgnore = true;
    
    var source = Firebug.Lite.Proxy.load(url);
    
    // TODO: check for null and error responses
    
    // remove comments
    //var reMultiComment = /(\/\*([^\*]|\*(?!\/))*\*\/)/g;
    //source = source.replace(reMultiComment, "");
    
    // convert relative addresses to absolute ones  
    source = source.replace(/url\(([^\)]+)\)/g, function(a,name){
    
        var hasDomain = /\w+:\/\/./.test(name);
        
        if (!hasDomain)
        {
            name = name.replace(/^(["'])(.+)\1$/, "$2");
            var first = name.charAt(0);
            
            // relative path, based on root
            if (first == "/")
            {
                // TODO: xxxpedro move to lib or Firebug.Lite.something
                // getURLRoot
                var m = /^([^:]+:\/{1,3}[^\/]+)/.exec(url);
                
                return m ? 
                    "url(" + m[1] + name + ")" :
                    "url(" + name + ")";
            }
            // relative path, based on current location
            else
            {
                // TODO: xxxpedro move to lib or Firebug.Lite.something
                // getURLPath
                var path = url.replace(/[^\/]+\.[\w\d]+(\?.+|#.+)?$/g, "");
                
                path = path + name;
                
                var reBack = /[^\/]+\/\.\.\//;
                while(reBack.test(path))
                {
                    path = path.replace(reBack, "");
                }
                
                //console.log("url(" + path + ")");
                
                return "url(" + path + ")";
            }
        }
        
        // if it is an absolute path, there is nothing to do
        return a;
    });
    
    var oldStyle = styleSheet.ownerNode;
    
    if (!oldStyle) return;
    
    if (!oldStyle.parentNode) return;
    
    var style = createGlobalElement("style");
    style.setAttribute("charset","utf-8");
    style.setAttribute("type", "text/css");
    style.innerHTML = source;

    //debugger;
    oldStyle.parentNode.insertBefore(style, oldStyle.nextSibling);
    oldStyle.parentNode.removeChild(oldStyle);
    
    doc.styleSheets[doc.styleSheets.length-1].externalURL = url;
    
    console.log(url, "call " + externalStyleSheetURLs.length, source);
    
    externalStyleSheetURLs.pop();
    
    if (processAllStyleSheetsTimeout)
    {
        clearTimeout(processAllStyleSheetsTimeout);
    }
    
    processAllStyleSheetsTimeout = setTimeout(function(){
        console.log("processing");
        FBL.processAllStyleSheets(doc, styleSheetIterator);
        processAllStyleSheetsTimeout = null;
    },200);
    
};

//************************************************************************************************
// getElementCSSRules

var getElementCSSRules = function(element)
{
    var eid = ElementCache(element);
    var rules = ElementCSSRulesMap[eid];
    
    if (!rules) return;
    
    var arr = [element];
    var Selector = Firebug.Selector;
    var ruleId, rule;
    
    // for the case of grouped selectors, we need to calculate the highest
    // specificity within the selectors of the group that matches the element,
    // so we can sort the rules properly without over estimating the specificity
    // of grouped selectors
    for (var i = 0, length = rules.length; i < length; i++)
    {
        ruleId = rules[i];
        rule = CSSRuleMap[ruleId];
        
        // check if it is a grouped selector
        if (rule.selector.indexOf(",") != -1)
        {
            var selectors = rule.selector.split(",");
            var maxSpecificity = -1;
            var sel, spec, mostSpecificSelector;
            
            // loop over all selectors in the group
            for (var j, len = selectors.length; j < len; j++)
            {
                sel = selectors[j];
                
                // find if the selector matches the element
                if (Selector.matches(sel, arr).length == 1)
                {
                    spec = getCSSRuleSpecificity(sel);
                    
                    // find the most specific selector that macthes the element
                    if (spec > maxSpecificity)
                    {
                        maxSpecificity = spec;
                        mostSpecificSelector = sel;
                    }
                }
            }
            
            rule.specificity = maxSpecificity;
        }
    }
    
    rules.sort(sortElementRules);
    //rules.sort(solveRulesTied);
    
    return rules;
};

// ************************************************************************************************
// Rule Specificity

var sortElementRules = function(a, b)
{
    var ruleA = CSSRuleMap[a];
    var ruleB = CSSRuleMap[b];
    
    var specificityA = ruleA.specificity;
    var specificityB = ruleB.specificity;
    
    if (specificityA > specificityB)
        return 1;
    
    else if (specificityA < specificityB)
        return -1;
    
    else
        return ruleA.order > ruleB.order ? 1 : -1;
};

var solveRulesTied = function(a, b)
{
    var ruleA = CSSRuleMap[a];
    var ruleB = CSSRuleMap[b];
    
    if (ruleA.specificity == ruleB.specificity)
        return ruleA.order > ruleB.order ? 1 : -1;
        
    return null;
};

var getCSSRuleSpecificity = function(selector)
{
    var match = selector.match(reSelectorTag);
    var tagCount = match ? match.length : 0;
    
    match = selector.match(reSelectorClass);
    var classCount = match ? match.length : 0;
    
    match = selector.match(reSelectorId);
    var idCount = match ? match.length : 0;
    
    return tagCount + 10*classCount + 100*idCount;
};

// ************************************************************************************************
// StyleSheet data

var extractSourceData = function(href)
{
    var sourceData = 
    {
        source: null,
        startLine: 0
    };
    
    if (href)
    {
        sourceData.source = Firebug.Lite.Proxy.load(href);
    }
    else
    {
        // TODO: create extractInternalSourceData(index)
        // TODO: pre process the position of the inline styles so this will happen only once
        // in case of having multiple inline styles
        var index = 0;
        var ssIndex = ++internalStyleSheetIndex;
        var reStyleTag = /\<\s*style.*\>/gi;
        var reEndStyleTag = /\<\/\s*style.*\>/gi;
        
        var source = Firebug.Lite.Proxy.load(Env.browser.location.href);
        source = source.replace(/\n\r|\r\n/g, "\n"); // normalize line breaks
        
        var startLine = 0;
        
        do
        {
            var matchStyleTag = source.match(reStyleTag); 
            var i0 = source.indexOf(matchStyleTag[0]) + matchStyleTag[0].length;
            
            for (var i=0; i < i0; i++)
            {
                if (source.charAt(i) == "\n")
                    startLine++;
            }
            
            source = source.substr(i0);
            
            index++;
        }
        while (index <= ssIndex);
    
        var matchEndStyleTag = source.match(reEndStyleTag);
        var i1 = source.indexOf(matchEndStyleTag[0]);
        
        var extractedSource = source.substr(0, i1);
        
        sourceData.source = extractedSource;
        sourceData.startLine = startLine;
    }
    
    return sourceData;
};

// ************************************************************************************************
// Registration

FBL.CssAnalyzer = CssAnalyzer;

// ************************************************************************************************
}});
