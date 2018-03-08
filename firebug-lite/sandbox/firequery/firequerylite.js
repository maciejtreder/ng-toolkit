// This source contains copy&pasted various bits from Firebug sources.
Firebug.extend(function(FBL) {
    with(FBL) {
        
        function checkFirebugVersion(minMajor, minMinor, minPatch) {
            if (!minPatch) minPatch = 0;
            if (!minMinor) minMinor = 0;
            if (!minMajor) minMajor = 0;
            var version = Firebug.version;
            if (!version) return false;
            var a = version.split('.');
            if (a.length<2) return false;
            // we want Firebug version 1.3+ (including alphas/betas and other weird stuff)
            var major = parseInt(a[0], 10);
            var minor = parseInt(a[1], 10);
            if (!a[2]) a[2] = "0";
            var patch = parseInt(a[2], 10);
            return (major>minMajor) ||
                   (major==minMajor && minor>minMinor) ||
                   (major==minMajor && minor==minMinor && patch>=minPatch);
        };
        
        if (!Firebug.CommandLine.evaluateInWebPage) {
            // backport from FB1.4
            Firebug.CommandLine.evaluateInWebPage = function(expr, context, targetWindow) {
                var win = targetWindow ? targetWindow : context.window;
                var doc = (win.wrappedJSObject ? win.wrappedJSObject.document : win.document);
                var element = addScript(doc, "_firebugInWebPage", expr);
                element.parentNode.removeChild(element);  // we don't need the script element, result is in DOM object
                return "true";
            };
        }

        //const fireQueryHomepage = "http://firequery.binaryage.com";

        //const Cc = Components.classes;
        //const Ci = Components.interfaces;

        //const nsIPrefBranch = Ci.nsIPrefBranch;
        //const nsIPrefBranch2 = Ci.nsIPrefBranch2;
        //const nsIWindowMediator = Ci.nsIWindowMediator;

        //const highlightCSS = "chrome://firebug/content/highlighter.css";

        //const firequeryPrefService = Cc["@mozilla.org/preferences-service;1"];
        //const firequeryPrefs = firequeryPrefService.getService(nsIPrefBranch2);

        //const MODIFICATION = MutationEvent.MODIFICATION;
        //const ADDITION = MutationEvent.ADDITION;
        //const REMOVAL = MutationEvent.REMOVAL;

        // jQuerify by Karl Swedberg, taken from http://www.learningjquery.com/2009/04/better-stronger-safer-jquerify-bookmarklet and slightly modified styles
        const jQuerifyCode = "\
        (function() {\
            var el = document.createElement('div');\
            var b = document.getElementsByTagName('body')[0];\
            var otherlib = false;\
            var msg = '';\
            el.style.fontFamily = 'Arial, Verdana';\
            el.style.position = 'fixed';\
            el.style.padding = '5px 10px 5px 10px';\
            el.style.margin = '0';\
            el.style.zIndex = 1001;\
            el.style.lineHeight = '46px';\
            el.style.fontSize = '40px';\
            el.style.fontWeight = 'bold';\
            el.style.color = '#444';\
            el.style.backgroundColor = '#FFFB00';\
            el.style.MozBorderRadius = '8px';\
            el.style.opacity = '0.8';\
            el.style.textAlign = 'center';\
            if (typeof jQuery != 'undefined') {\
                msg = 'This page already using jQuery v' + jQuery.fn.jquery;\
                if (typeof $jq == 'function') {\
                    msg += ' and noConflict().<br/>Use $jq(), not $().';\
                }\
                return showMsg();\
            } else if (typeof $ == 'function') {\
                otherlib = true;\
            }\
            function getScript(url, success, failure) {\
                var script = document.createElement('script');\
                script.src = url;\
                var head = document.getElementsByTagName('head')[0],\
                done = false;\
                var timeout = setTimeout(function() { failure(); }, {{jQueryURLTimeout}});\
                script.onload = script.onreadystatechange = function() {\
                    if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {\
                        done = true;\
                        clearTimeout(timeout);\
                        success();\
                    }\
                };\
                head.appendChild(script);\
            }\
            getScript('{{jQueryURL}}', \
            function() {\
                if (typeof jQuery == 'undefined') {\
                    msg = 'Sorry, but jQuery wasn\\'t able to load';\
                    return showMsg(true);\
                } else {\
                    msg = 'This page is now jQuerified with v' + jQuery.fn.jquery;\
                    if (otherlib) {\
                        msg += ' and noConflict().<br/>Use $jq(), not $().';\
                    }\
                }\
                return showMsg();\
            }, function() {\
                msg = 'Unable to load jQuery from:<br/>{{jQueryURL}}';\
                return showMsg(true);\
            });\
            function showMsg(isError) {\
                el.innerHTML = msg;\
                if (isError) el.style.backgroundColor = '#FF4444';\
                b.appendChild(el);\
                el.style.left = Math.floor((window.innerWidth - el.clientWidth) / 2) + 'px';\
                el.style.top = Math.floor((window.innerHeight - el.clientHeight) / 2) + 'px';\
                window.setTimeout(function() {\
                    if (typeof jQuery == 'undefined') {\
                        b.removeChild(el);\
                    } else {\
                        b.removeChild(el);\
                        if (otherlib) {\
                            $jq = jQuery.noConflict();\
                        }\
                    }\
                },\
                2500);\
            }\
        })();\
        ";

        const jQueryWatcherCode = "\
        (function() {\
            var timerId = setInterval(function() {\
                if (window.jQuery) {\
                    clearInterval(timerId);\
                    var event = document.createEvent('Events');\
                    event.initEvent('jQueryDetected', true, false);\
                    document.dispatchEvent(event);\
                }\
            }, {{watcherInterval}});\
        })();\
        ";

        const jQueryLintInjectorCode = "\
        (function() {\
            var el = document.createElement('div');\
            var b = document.getElementsByTagName('body')[0];\
            var otherlib = false;\
            var msg = '';\
            el.style.fontFamily = 'Arial, Verdana';\
            el.style.position = 'fixed';\
            el.style.padding = '5px 10px 5px 10px';\
            el.style.margin = '0';\
            el.style.zIndex = 1001;\
            el.style.lineHeight = '46px';\
            el.style.fontSize = '40px';\
            el.style.fontWeight = 'bold';\
            el.style.color = '#444';\
            el.style.backgroundColor = '#FFFB00';\
            el.style.MozBorderRadius = '8px';\
            el.style.opacity = '0.8';\
            el.style.textAlign = 'center';\
            if (typeof jQuery == 'undefined') {\
                msg = 'No jQuery detected!';\
                return showMsg();\
            }\
            function getScript(url, success, failure) {\
                var script = document.createElement('script');\
                script.src = url;\
                var head = document.getElementsByTagName('head')[0],\
                done = false;\
                var timeout = setTimeout(function() { failure(); }, {{jQueryLintURLTimeout}});\
                script.onload = script.onreadystatechange = function() {\
                    if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {\
                        done = true;\
                        clearTimeout(timeout);\
                        success();\
                    }\
                };\
                head.appendChild(script);\
            }\
            getScript('{{jQueryLintURL}}', \
            function() {\
                if (!jQuery.LINT) {\
                    msg = 'Sorry, but jQuery Lint wasn\\'t able to load';\
                    return showMsg(true);\
                }\
            }, function() {\
                msg = 'Unable to load jQuery Lint from:<br/>{{jQueryLintURL}}';\
                return showMsg(true);\
            });\
            function showMsg(isError) {\
                el.innerHTML = msg;\
                if (isError) el.style.backgroundColor = '#FF4444';\
                b.appendChild(el);\
                el.style.left = Math.floor((window.innerWidth - el.clientWidth) / 2) + 'px';\
                el.style.top = Math.floor((window.innerHeight - el.clientHeight) / 2) + 'px';\
                window.setTimeout(function() {\
                    if (typeof jQuery == 'undefined') {\
                        b.removeChild(el);\
                    } else {\
                        b.removeChild(el);\
                        if (otherlib) {\
                            $jq = jQuery.noConflict();\
                        }\
                    }\
                },\
                2500);\
            }\
        })();\
        ";

        if (Firebug.TraceModule) {
            Firebug.TraceModule.DBG_FIREQUERY = false;
            var type = firequeryPrefs.getPrefType('extensions.firebug.DBG_FIREQUERY');
            if (type != nsIPrefBranch.PREF_BOOL) try {
                firequeryPrefs.setBoolPref('extensions.firebug.DBG_FIREQUERY', false);
            } catch(e) {}
        }
    
        function dbg() {
            if (FBTrace && FBTrace.DBG_FIREQUERY) { 
                FBTrace.sysout.apply(this, arguments);
            }
        }
        
        var OBJECTBOX = this.OBJECTBOX =
            SPAN({'class': "objectBox objectBox-$className"});

        var OBJECTBLOCK = this.OBJECTBLOCK =
            DIV({'class': "objectBox objectBox-$className"});

        var OBJECTLINK = this.OBJECTLINK =
            A({
                'class': "objectLink objectLink-$className a11yFocus",
                _repObject: "$object"
            });

        const edgeSize = 1;

        var generateGuid = function() {
            var S4 = function() {
               return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
            };
            return S4()+S4();
        };

        function getNonFrameBody(elt) {
            var body = getBody(elt.ownerDocument);
            return body.localName.toUpperCase() == "FRAMESET" ? null : body;
        }

        function attachStyles(context, body) {
            var doc = body.ownerDocument;
            if (!context.highlightStyle)
                context.highlightStyle = createStyleSheet(doc, highlightCSS);

            if (!context.highlightStyle.parentNode || context.highlightStyle.ownerDocument != doc)
                addStyleSheet(body.ownerDocument, context.highlightStyle);
        }
        
        function evalJQueryCache(object, context) {
            try {
                var win = object.ownerDocument.defaultView;
                var wrapper = win.wrappedJSObject || win;
                var jQuery = wrapper.jQuery;
                // jQuery 1.4 breaking changes (http://jquery14.com/day-01/jquery-14):
                // jQuery.data(elem) no longer returns an id, it returns the element’s object cache instead.
                var idOrCache = jQuery.data(object.wrappedJSObject || object);
                if (typeof idOrCache == "object") return idOrCache; // jQuery 1.4+ path
                return jQuery.cache[idOrCache]; // jQuery 1.3- path 
            } catch (ex) {}
        }

        function hasJQueryCache(object, context) {
            var cache = evalJQueryCache(object, context);
            for (var x in cache) {
                if (cache.hasOwnProperty(x)) return true;
            }
        }

        function findNodeDataBox(objectNodeBox, attrName)
        {
            var child = objectNodeBox.firstChild.lastChild.firstChild;
            for (; child; child = child.nextSibling)
            {
                if (hasClass(child, "nodeData") && child.childNodes[0].firstChild && child.childNodes[0].firstChild.nodeValue == attrName)
                {
                    return child;
                }
            }
        }
        
        function dataDescriptor(name, data, tag) {
            var rep = {};
            rep[name] = data;
            return {
                name: name,
                data: data,
                tag: tag,
                rep: rep
            };
        }

        function mutateData(target, attrChange, attrName, attrValue)  {
            this.markChange();

            var createBox = Firebug.scrollToMutations || Firebug.expandMutations;
            var objectNodeBox = createBox ? this.ioBox.createObjectBox(target) : this.ioBox.findObjectBox(target);
            if (!objectNodeBox) return;

            if (isVisible(objectNodeBox.repObject))
                removeClass(objectNodeBox, "nodeHidden");
            else
                setClass(objectNodeBox, "nodeHidden");
            var nodeAttr;
            if (attrChange == MODIFICATION || attrChange == ADDITION) {
                var rep = Firebug.getRep(attrValue);
                var tag = rep.shortTag ? rep.shortTag : rep.tag;
                var valRep = Firebug.HTMLPanel.DataNode.tag.replace({
                    attr: dataDescriptor(attrName, attrValue, tag)
                }, this.document);

                nodeAttr = findNodeDataBox(objectNodeBox, attrName);
                if (nodeAttr) {
                    nodeAttr.parentNode.replaceChild(valRep, nodeAttr);
                    this.highlightMutation(valRep, objectNodeBox, "mutated");
                } else {
                    var labelBox = objectNodeBox.firstChild.lastChild;
                    labelBox.insertBefore(valRep, null);
                    this.highlightMutation(valRep, objectNodeBox, "mutated");
                }
            } else if (attrChange == REMOVAL) {
                nodeAttr = findNodeDataBox(objectNodeBox, attrName);
                if (nodeAttr) {
                    nodeAttr.parentNode.removeChild(nodeAttr);
                    this.highlightMutation(objectNodeBox, objectNodeBox, "mutated");
                }
            }
        }
    
        function patchJQuery(jQuery, context) {
            if (jQuery.wrappedJSObject) jQuery = jQuery.wrappedJSObject;
            if (jQuery._patchedByFireQuery) return;
            jQuery._patchedByFireQuery = true;
            jQuery.data_originalReplacedByFireQuery = jQuery.data;
            jQuery.data = function(elem, name, data) {
                var res = this.data_originalReplacedByFireQuery.apply(this, arguments);
                try {
                    if (name && data!==undefined) {
                        mutateData.call(context.getPanel('html'), elem, MODIFICATION, name, data);
                    }
                } catch (ex) {
                    // html panel may not exist yet (also want to be safe, when our highlighter throws for any reason)
                }
                return res;
            };
            jQuery.removeData_originalReplacedByFireQuery = jQuery.removeData;
            jQuery.removeData = function(elem, name) {
                var res = this.removeData_originalReplacedByFireQuery.apply(this, arguments);
                try {
                    if (name) {
                        mutateData.call(context.getPanel('html'), elem, REMOVAL, name);
                    }
                } catch (ex) {
                    // html panel may not exist yet (also want to be safe, when our highlighter throws for any reason)
                }
                return res;
            };

            // apply jquery lint if requested
            if (Firebug.FireQuery.getPref('useLint')) {
                try {
                    var code = Firebug.FireQuery.prepareJQueryLintCode();
                    Firebug.CommandLine.evaluateInWebPage(code, context);
                } catch (ex) {
                    dbg("   ! "+ex, context);
                }
            }
        }

        function installJQueryWatcher(win, context) {
            try {
                var code = jQueryWatcherCode.replace(/\{\{watcherInterval\}\}/g, Firebug.FireQuery.getPref('watcherInterval'));
                Firebug.CommandLine.evaluateInWebPage(code, context);
            } catch (ex) {
                dbg("   ! "+ex, context);
            }
        }
        
        function patchWindow(win, context) {
            try {
                var wrapper = win.wrappedJSObject;
                var jQuery = wrapper.jQuery;
                patchJQuery(jQuery, context);
                dbg(">>>FireQuery: successfully found and patched jQuery in the window ", win);
            } catch (ex) {
                dbg('>>>FireQuery: jQuery not found in the window, running watcher ...', win);
                win.document.wrappedJSObject.addEventListener('jQueryDetected', function() {
                    try {
                        var wrapper = win.wrappedJSObject;
                        var jQuery = wrapper.jQuery;
                        patchJQuery(jQuery, context);
                        dbg(">>>FireQuery: successfully notified and patched late jQuery in the window ", win);
                    } catch (ex) {
                        dbg(">>>FireQuery: fatal error patching late jQuery in the window ", win);
                    }
                }, true);
                installJQueryWatcher(win, context);
            }
        }
        
        ////////////////////////////////////////////////////////////////////////
        // Firebug.FireQuery
        //
        Firebug.FireQuery = extend(Firebug.ActivableModule, {
            version: '0.6',
            /////////////////////////////////////////////////////////////////////////////////////////
            start: function() {
                dbg(">>>FireQuery.start");
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            stop: function() {
                dbg(">>>FireQuery.stop");
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            initialize: function() {
            
                setTimeout(function(){
                    var doc = Firebug.chrome.document;
                    var styleSheet = createStyleSheet(doc, Env.Location.baseDir + "test/firequery/firequery.css");
                    addStyleSheet(doc, styleSheet);
                },0);
        
                dbg(">>>FireQuery.initialize");
                this.panelName = 'FireQuery';
                this.description = "jQuery related enhancements for Firebug.";
                Firebug.Module.initialize.apply(this, arguments);
                this.augumentConsolePanelContextMenu();
                this.start();
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            shutdown: function() {
                dbg(">>>FireQuery.shutdown");
                this.stop();
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            augumentConsolePanelContextMenu: function() {
                dbg(">>>FireQuery.augumentConsolePanelContextMenu");
                if (!Firebug.ConsolePanel.prototype.getOptionsMenuItemsOriginalBeforePatchedByFireQuery) {
                    Firebug.ConsolePanel.prototype.getOptionsMenuItemsOriginalBeforePatchedByFireQuery = Firebug.ConsolePanel.prototype.getOptionsMenuItems;
                    Firebug.ConsolePanel.prototype.getOptionsMenuItems = function() {
                        var items = this.getOptionsMenuItemsOriginalBeforePatchedByFireQuery.apply(this, arguments);
                        if (!items) items = [];
                        items = items.concat(Firebug.FireQuery.getOptionsMenuItems());
                        return items;
                    };
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            initializeUI: function() {
                dbg(">>>FireQuery.initializeUI");
                Firebug.Module.initializeUI.apply(this, arguments);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            onSuspendFirebug: function(context) {
                dbg(">>>FireQuery.onSuspendFirebug");
                this.stop();
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            onResumeFirebug: function(context) {
                dbg(">>>FireQuery.onResumeFirebug");
                this.start();
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            showPanel: function(browser, panel) {
                dbg(">>>FireQuery.showPanel "+panel.name, panel);
                var isConsole = panel.name == "console";
                var isHTML = panel.name == "html";
                if (isConsole || isHTML) {
                    this.applyPanelCSS("chrome://firequery/skin/firequery.css", panel);
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            loadedContext: function(context) {
                dbg(">>>FireQuery.loadedContext ", context);
                patchWindow(context.browser.contentWindow, context);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            prepareJQuerifyCode: function() {
                var jQueryURL = this.getPref('jQueryURL') || 'chrome://firequery-resources/content/jquery.js';
                var jQueryURLTimeout = this.getPref('jQueryURLTimeout') || 5000;

                var code = jQuerifyCode;
                code = code.replace(/\{\{jQueryURL\}\}/g, jQueryURL.replace("'", "\\'"));
                code = code.replace(/\{\{jQueryURLTimeout\}\}/g, jQueryURLTimeout+'');
                return code;
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            prepareJQueryLintCode: function() {
                var jQueryLintURL = this.getPref('jQueryLintURL') || 'chrome://firequery-resources/content/jquery.lint.js';
                var jQueryLintURLTimeout = this.getPref('jQueryLintURLTimeout') || 5000;

                var code = jQueryLintInjectorCode;
                code = code.replace(/\{\{jQueryLintURL\}\}/g, jQueryLintURL.replace("'", "\\'"));
                code = code.replace(/\{\{jQueryLintURLTimeout\}\}/g, jQueryLintURLTimeout+'');
                return code;
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            buttonJQuerify: function(context) {
                dbg(">>>FireQuery.buttonJQuerify ", context);
                try {
                    var code = this.prepareJQuerifyCode();
                    Firebug.CommandLine.evaluateInWebPage(code, context);
                } catch (ex) {
                    dbg("   ! "+ex, context);
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getPref: function(name) {
                var prefName = this.getPrefDomain().toLowerCase() + "." + name;
                var type = firequeryPrefs.getPrefType(prefName);
                if (type == nsIPrefBranch.PREF_STRING)
                return firequeryPrefs.getCharPref(prefName);
                else if (type == nsIPrefBranch.PREF_INT)
                return firequeryPrefs.getIntPref(prefName);
                else if (type == nsIPrefBranch.PREF_BOOL)
                return firequeryPrefs.getBoolPref(prefName);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            setPref: function(name, value) {
                var prefName = this.getPrefDomain().toLowerCase() + "." + name;
                var type = firequeryPrefs.getPrefType(prefName);
                if (type == nsIPrefBranch.PREF_STRING)
                firequeryPrefs.setCharPref(prefName, value);
                else if (type == nsIPrefBranch.PREF_INT)
                firequeryPrefs.setIntPref(prefName, value);
                else if (type == nsIPrefBranch.PREF_BOOL)
                firequeryPrefs.setBoolPref(prefName, value);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            applyPanelCSS: function(url, panel) {
                dbg(">>>FireQuery.applyPanelCSS "+url, panel);
                var links = FBL.getElementsBySelector(panel.document, "link");
                for (var i=0; i < links.length; i++) {
                    var link = links[i];
                    if (link.getAttribute('href')==url) return; // already applied
                }
                var styleElement = panel.document.createElement("link");
                styleElement.setAttribute("type", "text/css");
                styleElement.setAttribute("href", url);
                styleElement.setAttribute("rel", "stylesheet");
                var head = this.getHeadElement(panel.document);
                if (head) head.appendChild(styleElement);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            visitWebsite: function() {
                dbg(">>>FireQuery.visitWebsite", arguments);
                openNewTab(fireQueryHomepage);
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            updateOption: function(name, value) {
                dbg(">>>FireQuery.updateOption: "+name+" -> "+value);
                if (name=='firequery.useLint') {
                    if (value) {
                        Firebug.Console.logFormatted(["jQuery Lint will be available after next refresh"], FirebugContext, "info");
                    } else {
                        Firebug.Console.logFormatted(["jQuery Lint won't be loaded after next refresh"], FirebugContext, "info");
                    }
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getOptionsMenuItems: function() {
                var optionMenu = function(label, option) {
                    return {
                        label: label, 
                        nol10n: true,
                        type: "checkbox", 
                        checked: Firebug.FireQuery.getPref(option), 
                        option: option,
                        command: function() {
                            Firebug.FireQuery.setPref(option, !Firebug.FireQuery.getPref(option)); // toggle
                        }
                    };
                };
                dbg(">>>FireQuery.getOptionsMenuItems", arguments);
                return [
                    '-',
                    optionMenu("Use jQuery Lint", "useLint"),
                    {
                        label: "Visit FireQuery Website...",
                        nol10n: true,
                        command: function() {
                            Firebug.FireQuery.visitWebsite();
                        }
                    }
                ];
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getHeadElement: function(doc) {
                var heads = doc.getElementsByTagName("head");
                if (heads.length == 0) return doc.documentElement;
                return heads[0];
            }
        });
    
        ////////////////////////////////////////////////////////////////////////
        // Firebug.FireQuery.JQueryHighlighter
        //
        Firebug.FireQuery.JQueryHighlighter = function() {
            this.seed = "highlighter-"+generateGuid();
        };

        Firebug.FireQuery.JQueryHighlighter.prototype = {
            /////////////////////////////////////////////////////////////////////////////////////////
            highlight: function(context, element) {
                if (!element) return;
                if (element instanceof XULElement) return;
                var dims, x, y, w, h;
                try {
                    // Firebug 1.3 path
                    dims = getViewOffset(element, true);
                    x = dims.x; y = dims.y;
                    w = element.offsetWidth; h = element.offsetHeight;                
                } catch (ex) {
                    try {
                        // Firebug 1.4 path
                        dims = getRectTRBLWH(element, context);
                        x = dims.left; y = dims.top;
                        w = dims.width; h = dims.height;
                    } catch (ex) {
                        try {
                            // Firebug 1.5+ path
                            dims = getLTRBWH(element, context);
                            x = dims.left; y = dims.top;
                            w = dims.width; h = dims.height;
                        } catch (ex) {
                            dbg(' getLTRBWH failed: '+ex, element);
                            return;
                        }
                    }
                }

                var wacked = isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h);
                if (wacked) return;

                var nodes = this.getNodes(context, element);

                move(nodes.top, x, y-edgeSize);
                resize(nodes.top, w, edgeSize);

                move(nodes.right, x+w, y-edgeSize);
                resize(nodes.right, edgeSize, h+edgeSize*2);

                move(nodes.bottom, x, y+h);
                resize(nodes.bottom, w, edgeSize);

                move(nodes.left, x-edgeSize, y-edgeSize);
                resize(nodes.left, edgeSize, h+edgeSize*2);
                
                move(nodes.content, x, y);
                resize(nodes.content, w, h);
                
                var body = getNonFrameBody(element);
                if (!body)
                    return this.unhighlight(context);

                var needsAppend = !nodes.top.parentNode || nodes.top.ownerDocument != body.ownerDocument;
                if (needsAppend) {
                    attachStyles(context, body);
                    for (var edge in nodes) {
                        try {
                            body.appendChild(nodes[edge]);
                        }
                        catch(exc) {
                        }
                    }
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            unhighlight: function(context) {
                var nodes = this.getNodes(context);
                var body = nodes.top.parentNode;
                if (body) {
                    for (var edge in nodes)
                        body.removeChild(nodes[edge]);
                }
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getNodes: function(context) {
                if (!context[this.seed]) {
                    var doc = context.window.document;
                    function createEdge(name) {
                        var div = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
                        div.firebugIgnore = true;
                        div.className = "firebugHighlight";
                        return div;
                    }
                    function createBox(name) {
                        var div = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
                        div.firebugIgnore = true;
                        div.className = "firebugHighlight";
                        div.style.backgroundColor = "SkyBlue";
                        div.style.opacity="0.4";
                        return div;
                    }
                    context[this.seed] = {
                        content: createBox("Content"),
                        top: createEdge("Top"),
                        right: createEdge("Right"),
                        bottom: createEdge("Bottom"),
                        left: createEdge("Left")
                    };
                }
                return context[this.seed];
            }
        };

        ////////////////////////////////////////////////////////////////////////
        // monkey-patching of Firebug.Inspector.highlightObject
        //
        Firebug.Inspector.originalHighlightObject = Firebug.Inspector.highlightObject;
        Firebug.Inspector.highlightObject = function(element, context, highlightType, boxFrame) {
            if (!this.jQueryHighlighters) this.jQueryHighlighters = [];
            var i, highlighter;
            for (i=0; i<this.jQueryHighlighters.length; i++) {
                highlighter = this.jQueryHighlighters[i];
                highlighter.unhighlight(this.jQueryHighlighterContext);
            }
            this.jQueryHighlighters = [];
            
            if (!element || !element.length) {
                return Firebug.Inspector.originalHighlightObject.call(this, element, context, highlightType, boxFrame);
            } else {
                Firebug.Inspector.originalHighlightObject.call(this, null, context, highlightType, boxFrame);
            }

            if (context && context.window && context.window.document) {
                this.jQueryHighlighterContext = context;
                for (i=0; i<element.length; i++) {
                    highlighter = new Firebug.FireQuery.JQueryHighlighter();
                    highlighter.highlight(context, element[i]);
                    this.jQueryHighlighters.push(highlighter);
                }
            }
        };

        ////////////////////////////////////////////////////////////////////////
        // Firebug.FireQuery.JQueryExpression
        //
        Firebug.FireQuery.JQueryExpression = domplate(Firebug.Rep, {
            /////////////////////////////////////////////////////////////////////////////////////////
            tag:
                OBJECTBOX({},
                    A({
                        'class': "objectLink objectLink-jquery-sign",
                        _repObject: "$object"
                    }, "jQuery"),
                    SPAN({'class': "arrayLeftBracket"}, "("),
                    FOR("item", "$object|arrayIterator",
                        TAG("$item.tag", {object: "$item.object"}),
                        SPAN({'class': "arrayComma"}, "$item.delim")
                    ),
                    SPAN({'class': "arrayRightBracket"}, ")")
                ),
            /////////////////////////////////////////////////////////////////////////////////////////
            arrayIterator: function(array) {
                var items = [];
                for (var i = 0; i < array.length; ++i) {
                    var value = array[i];
                    var rep = Firebug.getRep(value);
                    var tag = rep.shortTag ? rep.shortTag : rep.tag;
                    var delim = (i == array.length-1 ? "" : ", ");

                    items.push({object: value, tag: tag, delim: delim});
                }
                return items;
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            className: "jquery-expression",
            /////////////////////////////////////////////////////////////////////////////////////////
            supportsObject: function(object) {
                if (!object) return;
                return !!object.jquery;
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getRealObject: function(event, context) {
                return null;
            },
            /////////////////////////////////////////////////////////////////////////////////////////
            getContextMenuItems: function(event) {
                return null;
            }
        });
    
        ////////////////////////////////////////////////////////////////////////
        // Firebug.FireQuery.JQueryElement
        //
        Firebug.FireQuery.JQueryElement = domplate(FirebugReps.Element, {
            /////////////////////////////////////////////////////////////////////////////////////////
            tag:
                OBJECTLINK(
                    "&lt;",
                    SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                    FOR("attr", "$object|attrIterator",
                        "&nbsp;$attr.localName=&quot;", SPAN({'class': "nodeValue"}, "$attr.nodeValue"), "&quot;"
                    ),
                    "&gt;"
                 ),
            /////////////////////////////////////////////////////////////////////////////////////////
            shortTag:
                SPAN(
                    OBJECTLINK(
                        SPAN({'class': "$object|getVisible"},
                            SPAN({'class': "selectorTag"}, "$object|getSelectorTag"),
                            SPAN({'class': "selectorId"}, "$object|getSelectorId"),
                            SPAN({'class': "selectorClass"}, "$object|getSelectorClass"),
                            SPAN({'class': "selectorValue"}, "$object|getValue")
                        )
                     ),
                     A({'class': "objectLink objectLink-jquery-data", onclick: "$onDataClick", _objData: "$object" }, "&#9993;") // envelope sign
                ),
            ///////////////////////////////////////////////////////////////////////////////////////////
            onDataClick: function(event) {
                var object = event.currentTarget.objData;
                var cache = evalJQueryCache(object);
                if (!cache) return;
                var rep = Firebug.getRep(cache);
                //rep.inspectObject(cache, Firebug.context);
                Firebug.chrome.selectPanel("DOM");
                Firebug.chrome.getPanel("DOM").select(cache);
            },
            ///////////////////////////////////////////////////////////////////////////////////////////
            dataIterator: function(object) {
                if (!object) return [];
                var cache = evalJQueryCache(object);
                if (!cache) return [];
                var res = [];
                for (var data in cache) {
                    if (cache.hasOwnProperty(data)) {
                        var rep = Firebug.getRep(cache[data]);
                        var tag = rep.shortTag ? rep.shortTag : rep.tag;
                        res.push(dataDescriptor(data, cache[data], tag));
                    }
                }
                return res;
            },
            ///////////////////////////////////////////////////////////////////////////////////////////
            supportsObject: function(object, type) {
                if (!FirebugReps.Element.supportsObject.call(this, object, type)) return false;
                return hasJQueryCache(object);
            }
        });
        
        ////////////////////////////////////////////////////////////////////////
        // patch Firebug.HTMLPanel.*Element
        //
        
        if (checkFirebugVersion(1, 5)) {
            // Firebug 1.5 and later
            
            var AttrTag = Firebug.HTMLPanel.AttrTag;
            var TextTag = Firebug.HTMLPanel.TextTag;
            var DataTag =
                SPAN({"class": "nodeData", _repObject: "$attr.rep"},
                    SPAN({"class": "nodeName"}, "$attr.name"), "=",
                    TAG("$attr.tag", {object: "$attr.data"})
                );

            Firebug.HTMLPanel.DataNode = domplate(FirebugReps.Element, {
                tag: DataTag
            });

            Firebug.HTMLPanel.Element = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({"class": "nodeBox containerNodeBox $object|getHidden repIgnore", _repObject: "$object", role :"presentation"},
                        DIV({"class": "nodeLabel", role: "presentation"},
                            IMG({"class": "twisty", role: "presentation"}),
                            SPAN({"class": "nodeLabelBox repTarget", role : 'treeitem', 'aria-expanded' : 'false'},
                                "&lt;",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({"class": "nodeBracket editable insertBefore"}, "&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        ),
                        DIV({"class": "nodeChildBox", role :"group"}), /* nodeChildBox is special signal in insideOutBox */
                        DIV({"class": "nodeCloseLabel", role : "presentation"},
                            SPAN({"class": "nodeCloseLabelBox repTarget"},
                                "&lt;/",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                "&gt;"
                            )
                        )
                    )
            });

            Firebug.HTMLPanel.CompleteElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({"class": "nodeBox open $object|getHidden repIgnore", _repObject: "$object"},
                        DIV({"class": "nodeLabel"},
                            SPAN({"class": "nodeLabelBox repTarget repTarget"},
                                "&lt;",
                                SPAN({"class": "nodeTag"}, "$object.localName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({"class": "nodeBracket"}, "&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        ),
                        DIV({"class": "nodeChildBox"},
                            FOR("child", "$object|childIterator",
                                TAG("$child|getNodeTag", {object: "$child"})
                            )
                        ),
                        DIV({"class": "nodeCloseLabel"},
                            "&lt;/",
                            SPAN({"class": "nodeTag"}, "$object.localName|toLowerCase"),
                            "&gt;"
                         )
                    ),

                getNodeTag: Firebug.HTMLPanel.CompleteElement.getNodeTag,

                childIterator: Firebug.HTMLPanel.CompleteElement.childIterator
            });

            Firebug.HTMLPanel.EmptyElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({"class": "nodeBox emptyNodeBox $object|getHidden repIgnore", _repObject: "$object", role : 'presentation'},
                        DIV({"class": "nodeLabel", role: "presentation"},
                            SPAN({"class": "nodeLabelBox repTarget", role : 'treeitem'},
                                "&lt;",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({"class": "nodeBracket editable insertBefore"}, "&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        )
                    )
            });

            Firebug.HTMLPanel.XEmptyElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({"class": "nodeBox emptyNodeBox $object|getHidden repIgnore", _repObject: "$object", role : 'presentation'},
                        DIV({"class": "nodeLabel", role: "presentation"},
                            SPAN({"class": "nodeLabelBox repTarget", role : 'treeitem'},
                                "&lt;",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({"class": "nodeBracket editable insertBefore"}, "/&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        )
                    )
            });

            Firebug.HTMLPanel.TextElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({"class": "nodeBox textNodeBox $object|getHidden repIgnore", _repObject: "$object", role : 'presentation'},
                        DIV({"class": "nodeLabel", role: "presentation"},
                            SPAN({"class": "nodeLabelBox repTarget", role : 'treeitem'},
                                "&lt;",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({"class": "nodeBracket editable insertBefore"}, "&gt;"),
                                TextTag,
                                "&lt;/",
                                SPAN({"class": "nodeTag"}, "$object.nodeName|toLowerCase"),
                                "&gt;",
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        )
                    )
            });
        } else {
            // Firebug 1.4 and older
            AttrTag =
                SPAN({'class': "nodeAttr editGroup"},
                    "&nbsp;", SPAN({'class': "nodeName editable"}, "$attr.nodeName"), "=&quot;",
                    SPAN({'class': "nodeValue editable"}, "$attr.nodeValue"), "&quot;"
                );

            DataTag =
                SPAN({'class': "nodeData", _repObject: "$attr.rep"},
                    SPAN({'class': "nodeName"}, "$attr.name"), "=",
                    TAG("$attr.tag", {object: "$attr.data"})
                );

            Firebug.HTMLPanel.DataNode = domplate(FirebugReps.Element, {
                tag: DataTag
            });

            Firebug.HTMLPanel.Element = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({'class': "nodeBox containerNodeBox $object|getHidden repIgnore", _repObject: "$object"},
                        DIV({'class': "nodeLabel"},
                            IMG({'class': "twisty"}),
                            SPAN({'class': "nodeLabelBox repTarget"},
                                "&lt;",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({'class': "nodeBracket editable insertBefore"}, "&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        ),
                        DIV({'class': "nodeChildBox"}),
                        DIV({'class': "nodeCloseLabel"},
                            SPAN({'class': "nodeCloseLabelBox repTarget"},
                                "&lt;/",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                "&gt;"
                            )
                         )
                    )
            });

            Firebug.HTMLPanel.CompleteElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({'class': "nodeBox open $object|getHidden repIgnore", _repObject: "$object"},
                        DIV({'class': "nodeLabel"},
                            SPAN({'class': "nodeLabelBox repTarget repTarget"},
                                "&lt;",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({'class': "nodeBracket"}, "&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        ),
                        DIV({'class': "nodeChildBox"},
                            FOR("child", "$object|childIterator",
                                TAG("$child|getNodeTag", {object: "$child"})
                            )
                        ),
                        DIV({'class': "nodeCloseLabel"},
                            "&lt;/",
                            SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                            "&gt;"
                         )
                    ),

                getNodeTag: function(node) {
                    return getNodeTag(node, true);
                },

                childIterator: function(node) {
                    if (node.contentDocument)
                        return [node.contentDocument.documentElement];

                    if (Firebug.showWhitespaceNodes)
                        return cloneArray(node.childNodes);
                    else {
                        var nodes = [];
                        for (var child = node.firstChild; child; child = child.nextSibling) {
                            if (child.nodeType != 3 || !isWhitespaceText(child))
                                nodes.push(child);
                        }
                        return nodes;
                    }
                }
            });

            Firebug.HTMLPanel.EmptyElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({'class': "nodeBox emptyNodeBox $object|getHidden repIgnore", _repObject: "$object"},
                        DIV({'class': "nodeLabel"},
                            SPAN({'class': "nodeLabelBox repTarget"},
                                "&lt;",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({'class': "nodeBracket editable insertBefore"}, "/&gt;"),
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        )
                    )
            });

            Firebug.HTMLPanel.TextElement = domplate(Firebug.FireQuery.JQueryElement, {
                tag:
                    DIV({'class': "nodeBox textNodeBox $object|getHidden repIgnore", _repObject: "$object"},
                        DIV({'class': "nodeLabel"},
                            SPAN({'class': "nodeLabelBox repTarget"},
                                "&lt;",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                FOR("attr", "$object|attrIterator", AttrTag),
                                SPAN({'class': "nodeBracket editable insertBefore"}, "&gt;"),
                                SPAN({'class': "nodeText editable"}, "$object|getNodeText"),
                                "&lt;/",
                                SPAN({'class': "nodeTag"}, "$object.localName|toLowerCase"),
                                "&gt;",
                                FOR("attr", "$object|dataIterator", DataTag)
                            )
                        )
                    )
            });
        }
        
        Firebug.registerModule(Firebug.FireQuery);
        Firebug.reps.splice(0, 0, Firebug.FireQuery.JQueryExpression); // need to get this before array rep (jQuery expression behaves like array from JQuery 1.3)
        Firebug.reps.splice(0, 0, Firebug.FireQuery.JQueryElement); // need to get this before old Element rep
    }
});