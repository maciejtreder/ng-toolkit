/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var ElementCache = Firebug.Lite.Cache.Element;

var insertSliceSize = 18;
var insertInterval = 40;

var ignoreVars =
{
    "__firebug__": 1,
    "eval": 1,

    // We are forced to ignore Java-related variables, because
    // trying to access them causes browser freeze
    "java": 1,
    "sun": 1,
    "Packages": 1,
    "JavaArray": 1,
    "JavaMember": 1,
    "JavaObject": 1,
    "JavaClass": 1,
    "JavaPackage": 1,
    "_firebug": 1,
    "_FirebugConsole": 1,
    "_FirebugCommandLine": 1
};

if (Firebug.ignoreFirebugElements)
    ignoreVars[Firebug.Lite.Cache.ID] = 1;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var memberPanelRep =
    isIE6 ?
    {"class": "memberLabel $member.type\\Label", href: "javacript:void(0)"}
    :
    {"class": "memberLabel $member.type\\Label"};

var RowTag =
    TR({"class": "memberRow $member.open $member.type\\Row", $hasChildren: "$member.hasChildren", role : 'presentation',
        level: "$member.level"},
        TD({"class": "memberLabelCell", style: "padding-left: $member.indent\\px", role : 'presentation'},
            A(memberPanelRep,
                SPAN({}, "$member.name")
            )
        ),
        TD({"class": "memberValueCell", role : 'presentation'},
            TAG("$member.tag", {object: "$member.value"})
        )
    );

var WatchRowTag =
    TR({"class": "watchNewRow", level: 0},
        TD({"class": "watchEditCell", colspan: 2},
            DIV({"class": "watchEditBox a11yFocusNoTab", role: "button", 'tabindex' : '0',
                'aria-label' : $STR('press enter to add new watch expression')},
                    $STR("NewWatch")
            )
        )
    );

var SizerRow =
    TR({role : 'presentation'},
        TD({width: "30%"}),
        TD({width: "70%"})
    );

var domTableClass = isIElt8 ? "domTable domTableIE" : "domTable";
var DirTablePlate = domplate(Firebug.Rep,
{
    tag:
        TABLE({"class": domTableClass, cellpadding: 0, cellspacing: 0, onclick: "$onClick", role :"tree"},
            TBODY({role: 'presentation'},
                SizerRow,
                FOR("member", "$object|memberIterator", RowTag)
            )
        ),
        
    watchTag:
        TABLE({"class": domTableClass, cellpadding: 0, cellspacing: 0,
               _toggles: "$toggles", _domPanel: "$domPanel", onclick: "$onClick", role : 'tree'},
            TBODY({role : 'presentation'},
                SizerRow,
                WatchRowTag
            )
        ),

    tableTag:
        TABLE({"class": domTableClass, cellpadding: 0, cellspacing: 0,
            _toggles: "$toggles", _domPanel: "$domPanel", onclick: "$onClick", role : 'tree'},
            TBODY({role : 'presentation'},
                SizerRow
            )
        ),

    rowTag:
        FOR("member", "$members", RowTag),

    memberIterator: function(object, level)
    {
        return getMembers(object, level);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onClick: function(event)
    {
        if (!isLeftClick(event))
            return;
        
        var target = event.target || event.srcElement;

        var row = getAncestorByClass(target, "memberRow");
        var label = getAncestorByClass(target, "memberLabel");
        if (label && hasClass(row, "hasChildren"))
        {
            var row = label.parentNode.parentNode;
            this.toggleRow(row);
        }
        else
        {
            var object = Firebug.getRepObject(target);
            if (typeof(object) == "function")
            {
                Firebug.chrome.select(object, "script");
                cancelEvent(event);
            }
            else if (event.detail == 2 && !object)
            {
                var panel = row.parentNode.parentNode.domPanel;
                if (panel)
                {
                    var rowValue = panel.getRowPropertyValue(row);
                    if (typeof(rowValue) == "boolean")
                        panel.setPropertyValue(row, !rowValue);
                    else
                        panel.editProperty(row);

                    cancelEvent(event);
                }
            }
        }
        
        return false;
    },

    toggleRow: function(row)
    {
        var level = parseInt(row.getAttribute("level"));
        var toggles = row.parentNode.parentNode.toggles;

        if (hasClass(row, "opened"))
        {
            removeClass(row, "opened");

            if (toggles)
            {
                var path = getPath(row);

                // Remove the path from the toggle tree
                for (var i = 0; i < path.length; ++i)
                {
                    if (i == path.length-1)
                        delete toggles[path[i]];
                    else
                        toggles = toggles[path[i]];
                }
            }

            var rowTag = this.rowTag;
            var tbody = row.parentNode;

            setTimeout(function()
            {
                for (var firstRow = row.nextSibling; firstRow; firstRow = row.nextSibling)
                {
                    if (parseInt(firstRow.getAttribute("level")) <= level)
                        break;

                    tbody.removeChild(firstRow);
                }
            }, row.insertTimeout ? row.insertTimeout : 0);
        }
        else
        {
            setClass(row, "opened");

            if (toggles)
            {
                var path = getPath(row);

                // Mark the path in the toggle tree
                for (var i = 0; i < path.length; ++i)
                {
                    var name = path[i];
                    if (toggles.hasOwnProperty(name))
                        toggles = toggles[name];
                    else
                        toggles = toggles[name] = {};
                }
            }

            var value = row.lastChild.firstChild.repObject;
            var members = getMembers(value, level+1);

            var rowTag = this.rowTag;
            var lastRow = row;

            var delay = 0;
            //var setSize = members.length;
            //var rowCount = 1;
            while (members.length)
            {
                with({slice: members.splice(0, insertSliceSize), isLast: !members.length})
                {
                    setTimeout(function()
                    {
                        if (lastRow.parentNode)
                        {
                            var result = rowTag.insertRows({members: slice}, lastRow);
                            lastRow = result[1];
                            //dispatch([Firebug.A11yModel], 'onMemberRowSliceAdded', [null, result, rowCount, setSize]);
                            //rowCount += insertSliceSize;
                        }
                        if (isLast)
                            row.removeAttribute("insertTimeout");
                    }, delay);
                }

                delay += insertInterval;
            }

            row.insertTimeout = delay;
        }
    }
});



// ************************************************************************************************

Firebug.DOMBasePanel = function() {};

Firebug.DOMBasePanel.prototype = extend(Firebug.Panel,
{
    tag: DirTablePlate.tableTag,

    getRealObject: function(object)
    {
        // TODO: Move this to some global location
        // TODO: Unwrapping should be centralized rather than sprinkling it around ad hoc.
        // TODO: We might be able to make this check more authoritative with QueryInterface.
        if (!object) return object;
        if (object.wrappedJSObject) return object.wrappedJSObject;
        return object;
    },

    rebuild: function(update, scrollTop)
    {
        //dispatch([Firebug.A11yModel], 'onBeforeDomUpdateSelection', [this]);
        var members = getMembers(this.selection);
        expandMembers(members, this.toggles, 0, 0);

        this.showMembers(members, update, scrollTop);
        
        //TODO: xxxpedro statusbar
        if (!this.parentPanel)
            updateStatusBar(this);
    },

    showMembers: function(members, update, scrollTop)
    {
        // If we are still in the midst of inserting rows, cancel all pending
        // insertions here - this is a big speedup when stepping in the debugger
        if (this.timeouts)
        {
            for (var i = 0; i < this.timeouts.length; ++i)
                this.context.clearTimeout(this.timeouts[i]);
            delete this.timeouts;
        }

        if (!members.length)
            return this.showEmptyMembers();

        var panelNode = this.panelNode;
        var priorScrollTop = scrollTop == undefined ? panelNode.scrollTop : scrollTop;

        // If we are asked to "update" the current view, then build the new table
        // offscreen and swap it in when it's done
        var offscreen = update && panelNode.firstChild;
        var dest = offscreen ? panelNode.ownerDocument : panelNode;

        var table = this.tag.replace({domPanel: this, toggles: this.toggles}, dest);
        var tbody = table.lastChild;
        var rowTag = DirTablePlate.rowTag;

        // Insert the first slice immediately
        //var slice = members.splice(0, insertSliceSize);
        //var result = rowTag.insertRows({members: slice}, tbody.lastChild);
        
        //var setSize = members.length;
        //var rowCount = 1;
        
        var panel = this;
        var result;
        
        //dispatch([Firebug.A11yModel], 'onMemberRowSliceAdded', [panel, result, rowCount, setSize]);
        var timeouts = [];
        
        var delay = 0;
        
        // enable to measure rendering performance
        var renderStart = new Date().getTime();
        while (members.length)
        {
            with({slice: members.splice(0, insertSliceSize), isLast: !members.length})
            {
                timeouts.push(this.context.setTimeout(function()
                {
                    // TODO: xxxpedro can this be a timing error related to the
                    // "iteration number" approach insted of "duration time"?
                    // avoid error in IE8
                    if (!tbody.lastChild) return;
                    
                    result = rowTag.insertRows({members: slice}, tbody.lastChild);
                    
                    //rowCount += insertSliceSize;
                    //dispatch([Firebug.A11yModel], 'onMemberRowSliceAdded', [panel, result, rowCount, setSize]);
    
                    if ((panelNode.scrollHeight+panelNode.offsetHeight) >= priorScrollTop)
                        panelNode.scrollTop = priorScrollTop;
                    
                    
                    // enable to measure rendering performance
                    //if (isLast) alert(new Date().getTime() - renderStart + "ms");
                    
                    
                }, delay));
    
                delay += insertInterval;
            }
        }

        if (offscreen)
        {
            timeouts.push(this.context.setTimeout(function()
            {
                if (panelNode.firstChild)
                    panelNode.replaceChild(table, panelNode.firstChild);
                else
                    panelNode.appendChild(table);

                // Scroll back to where we were before
                panelNode.scrollTop = priorScrollTop;
            }, delay));
        }
        else
        {
            timeouts.push(this.context.setTimeout(function()
            {
                panelNode.scrollTop = scrollTop == undefined ? 0 : scrollTop;
            }, delay));
        }
        this.timeouts = timeouts;
    },

    /*
    // new
    showMembers: function(members, update, scrollTop)
    {
        // If we are still in the midst of inserting rows, cancel all pending
        // insertions here - this is a big speedup when stepping in the debugger
        if (this.timeouts)
        {
            for (var i = 0; i < this.timeouts.length; ++i)
                this.context.clearTimeout(this.timeouts[i]);
            delete this.timeouts;
        }

        if (!members.length)
            return this.showEmptyMembers();

        var panelNode = this.panelNode;
        var priorScrollTop = scrollTop == undefined ? panelNode.scrollTop : scrollTop;

        // If we are asked to "update" the current view, then build the new table
        // offscreen and swap it in when it's done
        var offscreen = update && panelNode.firstChild;
        var dest = offscreen ? panelNode.ownerDocument : panelNode;

        var table = this.tag.replace({domPanel: this, toggles: this.toggles}, dest);
        var tbody = table.lastChild;
        var rowTag = DirTablePlate.rowTag;

        // Insert the first slice immediately
        //var slice = members.splice(0, insertSliceSize);
        //var result = rowTag.insertRows({members: slice}, tbody.lastChild);
        
        //var setSize = members.length;
        //var rowCount = 1;
        
        var panel = this;
        var result;
        
        //dispatch([Firebug.A11yModel], 'onMemberRowSliceAdded', [panel, result, rowCount, setSize]);
        var timeouts = [];
        
        var delay = 0;
        var _insertSliceSize = insertSliceSize;
        var _insertInterval = insertInterval;

        // enable to measure rendering performance
        var renderStart = new Date().getTime();
        var lastSkip = renderStart, now;
        
        while (members.length)
        {
            with({slice: members.splice(0, _insertSliceSize), isLast: !members.length})
            {
                var _tbody = tbody;
                var _rowTag = rowTag;
                var _panelNode = panelNode;
                var _priorScrollTop = priorScrollTop;
                
                timeouts.push(this.context.setTimeout(function()
                {
                    // TODO: xxxpedro can this be a timing error related to the
                    // "iteration number" approach insted of "duration time"?
                    // avoid error in IE8
                    if (!_tbody.lastChild) return;
                    
                    result = _rowTag.insertRows({members: slice}, _tbody.lastChild);
                    
                    //rowCount += _insertSliceSize;
                    //dispatch([Firebug.A11yModel], 'onMemberRowSliceAdded', [panel, result, rowCount, setSize]);
    
                    if ((_panelNode.scrollHeight + _panelNode.offsetHeight) >= _priorScrollTop)
                        _panelNode.scrollTop = _priorScrollTop;
                    
                    
                    // enable to measure rendering performance
                    //alert("gap: " + (new Date().getTime() - lastSkip)); 
                    //lastSkip = new Date().getTime();
                    
                    //if (isLast) alert("new: " + (new Date().getTime() - renderStart) + "ms");
                    
                }, delay));
    
                delay += _insertInterval;
            }
        }

        if (offscreen)
        {
            timeouts.push(this.context.setTimeout(function()
            {
                if (panelNode.firstChild)
                    panelNode.replaceChild(table, panelNode.firstChild);
                else
                    panelNode.appendChild(table);

                // Scroll back to where we were before
                panelNode.scrollTop = priorScrollTop;
            }, delay));
        }
        else
        {
            timeouts.push(this.context.setTimeout(function()
            {
                panelNode.scrollTop = scrollTop == undefined ? 0 : scrollTop;
            }, delay));
        }
        this.timeouts = timeouts;
    },
    /**/
    
    showEmptyMembers: function()
    {
        FirebugReps.Warning.tag.replace({object: "NoMembersWarning"}, this.panelNode);
    },

    findPathObject: function(object)
    {
        var pathIndex = -1;
        for (var i = 0; i < this.objectPath.length; ++i)
        {
            // IE needs === instead of == or otherwise some objects will
            // be considered equal to different objects, returning the
            // wrong index of the objectPath array
            if (this.getPathObject(i) === object)
                return i;
        }

        return -1;
    },

    getPathObject: function(index)
    {
        var object = this.objectPath[index];
        
        if (object instanceof Property)
            return object.getObject();
        else
            return object;
    },

    getRowObject: function(row)
    {
        var object = getRowOwnerObject(row);
        return object ? object : this.selection;
    },

    getRowPropertyValue: function(row)
    {
        var object = this.getRowObject(row);
        object = this.getRealObject(object);
        if (object)
        {
            var propName = getRowName(row);

            if (object instanceof jsdIStackFrame)
                return Firebug.Debugger.evaluate(propName, this.context);
            else
                return object[propName];
        }
    },
    /*
    copyProperty: function(row)
    {
        var value = this.getRowPropertyValue(row);
        copyToClipboard(value);
    },

    editProperty: function(row, editValue)
    {
        if (hasClass(row, "watchNewRow"))
        {
            if (this.context.stopped)
                Firebug.Editor.startEditing(row, "");
            else if (Firebug.Console.isAlwaysEnabled())  // not stopped in debugger, need command line
            {
                if (Firebug.CommandLine.onCommandLineFocus())
                    Firebug.Editor.startEditing(row, "");
                else
                    row.innerHTML = $STR("warning.Command line blocked?");
            }
            else
                row.innerHTML = $STR("warning.Console must be enabled");
        }
        else if (hasClass(row, "watchRow"))
            Firebug.Editor.startEditing(row, getRowName(row));
        else
        {
            var object = this.getRowObject(row);
            this.context.thisValue = object;

            if (!editValue)
            {
                var propValue = this.getRowPropertyValue(row);

                var type = typeof(propValue);
                if (type == "undefined" || type == "number" || type == "boolean")
                    editValue = propValue;
                else if (type == "string")
                    editValue = "\"" + escapeJS(propValue) + "\"";
                else if (propValue == null)
                    editValue = "null";
                else if (object instanceof Window || object instanceof jsdIStackFrame)
                    editValue = getRowName(row);
                else
                    editValue = "this." + getRowName(row);
            }


            Firebug.Editor.startEditing(row, editValue);
        }
    },

    deleteProperty: function(row)
    {
        if (hasClass(row, "watchRow"))
            this.deleteWatch(row);
        else
        {
            var object = getRowOwnerObject(row);
            if (!object)
                object = this.selection;
            object = this.getRealObject(object);

            if (object)
            {
                var name = getRowName(row);
                try
                {
                    delete object[name];
                }
                catch (exc)
                {
                    return;
                }

                this.rebuild(true);
                this.markChange();
            }
        }
    },

    setPropertyValue: function(row, value)  // value must be string
    {
        if(FBTrace.DBG_DOM)
        {
            FBTrace.sysout("row: "+row);
            FBTrace.sysout("value: "+value+" type "+typeof(value), value);
        }

        var name = getRowName(row);
        if (name == "this")
            return;

        var object = this.getRowObject(row);
        object = this.getRealObject(object);
        if (object && !(object instanceof jsdIStackFrame))
        {
             // unwrappedJSObject.property = unwrappedJSObject
             Firebug.CommandLine.evaluate(value, this.context, object, this.context.getGlobalScope(),
                 function success(result, context)
                 {
                     if (FBTrace.DBG_DOM)
                         FBTrace.sysout("setPropertyValue evaluate success object["+name+"]="+result+" type "+typeof(result), result);
                     object[name] = result;
                 },
                 function failed(exc, context)
                 {
                     try
                     {
                         if (FBTrace.DBG_DOM)
                              FBTrace.sysout("setPropertyValue evaluate failed with exc:"+exc+" object["+name+"]="+value+" type "+typeof(value), exc);
                         // If the value doesn't parse, then just store it as a string.  Some users will
                         // not realize they're supposed to enter a JavaScript expression and just type
                         // literal text
                         object[name] = String(value);  // unwrappedJSobject.property = string
                     }
                     catch (exc)
                     {
                         return;
                     }
                  }
             );
        }
        else if (this.context.stopped)
        {
            try
            {
                Firebug.CommandLine.evaluate(name+"="+value, this.context);
            }
            catch (exc)
            {
                try
                {
                    // See catch block above...
                    object[name] = String(value); // unwrappedJSobject.property = string
                }
                catch (exc)
                {
                    return;
                }
            }
        }

        this.rebuild(true);
        this.markChange();
    },

    highlightRow: function(row)
    {
        if (this.highlightedRow)
            cancelClassTimed(this.highlightedRow, "jumpHighlight", this.context);

        this.highlightedRow = row;

        if (row)
            setClassTimed(row, "jumpHighlight", this.context);
    },/**/

    onMouseMove: function(event)
    {
        var target = event.srcElement || event.target;
        
        var object = getAncestorByClass(target, "objectLink-element");
        object = object ? object.repObject : null;
        
        if(object && instanceOf(object, "Element") && object.nodeType == 1)
        {
            if(object != lastHighlightedObject)
            {
                Firebug.Inspector.drawBoxModel(object);
                object = lastHighlightedObject;
            }
        }
        else
            Firebug.Inspector.hideBoxModel();
        
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    create: function()
    {
        // TODO: xxxpedro
        this.context = Firebug.browser;
        
        this.objectPath = [];
        this.propertyPath = [];
        this.viewPath = [];
        this.pathIndex = -1;
        this.toggles = {};

        Firebug.Panel.create.apply(this, arguments);
        
        this.panelNode.style.padding = "0 1px";
    },
    
    initialize: function(){
        Firebug.Panel.initialize.apply(this, arguments);
        
        addEvent(this.panelNode, "mousemove", this.onMouseMove);
    },
    
    shutdown: function()
    {
        removeEvent(this.panelNode, "mousemove", this.onMouseMove);
        
        Firebug.Panel.shutdown.apply(this, arguments);
    },

    /*
    destroy: function(state)
    {
        var view = this.viewPath[this.pathIndex];
        if (view && this.panelNode.scrollTop)
            view.scrollTop = this.panelNode.scrollTop;

        if (this.pathIndex)
            state.pathIndex = this.pathIndex;
        if (this.viewPath)
            state.viewPath = this.viewPath;
        if (this.propertyPath)
            state.propertyPath = this.propertyPath;

        if (this.propertyPath.length > 0 && !this.propertyPath[1])
            state.firstSelection = persistObject(this.getPathObject(1), this.context);

        Firebug.Panel.destroy.apply(this, arguments);
    },
    /**/
    
    ishow: function(state)
    {
        if (this.context.loaded && !this.selection)
        {
            if (!state)
            {
                this.select(null);
                return;
            }
            if (state.viewPath)
                this.viewPath = state.viewPath;
            if (state.propertyPath)
                this.propertyPath = state.propertyPath;

            var defaultObject = this.getDefaultSelection(this.context);
            var selectObject = defaultObject; 

            if (state.firstSelection)
            {
                var restored = state.firstSelection(this.context);
                if (restored)
                {
                    selectObject = restored;
                    this.objectPath = [defaultObject, restored];
                }
                else
                    this.objectPath = [defaultObject];
            }
            else
                this.objectPath = [defaultObject];

            if (this.propertyPath.length > 1)
            {
                for (var i = 1; i < this.propertyPath.length; ++i)
                {
                    var name = this.propertyPath[i];
                    if (!name)
                        continue;

                    var object = selectObject;
                    try
                    {
                        selectObject = object[name];
                    }
                    catch (exc)
                    {
                        selectObject = null;
                    }

                    if (selectObject)
                    {
                        this.objectPath.push(new Property(object, name));
                    }
                    else
                    {
                        // If we can't access a property, just stop
                        this.viewPath.splice(i);
                        this.propertyPath.splice(i);
                        this.objectPath.splice(i);
                        selectObject = this.getPathObject(this.objectPath.length-1);
                        break;
                    }
                }
            }

            var selection = state.pathIndex <= this.objectPath.length-1
                ? this.getPathObject(state.pathIndex)
                : this.getPathObject(this.objectPath.length-1);

            this.select(selection);
        }
    },
    /*
    hide: function()
    {
        var view = this.viewPath[this.pathIndex];
        if (view && this.panelNode.scrollTop)
            view.scrollTop = this.panelNode.scrollTop;
    },
    /**/

    supportsObject: function(object)
    {
        if (object == null)
            return 1000;

        if (typeof(object) == "undefined")
            return 1000;
        else if (object instanceof SourceLink)
            return 0;
        else
            return 1; // just agree to support everything but not agressively.
    },

    refresh: function()
    {
        this.rebuild(true);
    },

    updateSelection: function(object)
    {
        var previousIndex = this.pathIndex;
        var previousView = previousIndex == -1 ? null : this.viewPath[previousIndex];

        var newPath = this.pathToAppend;
        delete this.pathToAppend;

        var pathIndex = this.findPathObject(object);
        if (newPath || pathIndex == -1)
        {
            this.toggles = {};

            if (newPath)
            {
                // Remove everything after the point where we are inserting, so we
                // essentially replace it with the new path
                if (previousView)
                {
                    if (this.panelNode.scrollTop)
                        previousView.scrollTop = this.panelNode.scrollTop;

                    var start = previousIndex + 1, 
                        // Opera needs the length argument in splice(), otherwise
                        // it will consider that only one element should be removed
                        length = this.objectPath.length - start;
                    
                    this.objectPath.splice(start, length);
                    this.propertyPath.splice(start, length);
                    this.viewPath.splice(start, length);
                }

                var value = this.getPathObject(previousIndex);
                if (!value)
                {
                    if (FBTrace.DBG_ERRORS)
                        FBTrace.sysout("dom.updateSelection no pathObject for "+previousIndex+"\n");
                    return;
                }

                for (var i = 0, length = newPath.length; i < length; ++i)
                {
                    var name = newPath[i];
                    var object = value;
                    try
                    {
                        value = value[name];
                    }
                    catch(exc)
                    {
                        if (FBTrace.DBG_ERRORS)
                                FBTrace.sysout("dom.updateSelection FAILS at path_i="+i+" for name:"+name+"\n");
                        return;
                    }

                    ++this.pathIndex;
                    this.objectPath.push(new Property(object, name));
                    this.propertyPath.push(name);
                    this.viewPath.push({toggles: this.toggles, scrollTop: 0});
                }
            }
            else
            {
                this.toggles = {};

                var win = Firebug.browser.window;
                //var win = this.context.getGlobalScope();
                if (object === win)
                {
                    this.pathIndex = 0;
                    this.objectPath = [win];
                    this.propertyPath = [null];
                    this.viewPath = [{toggles: this.toggles, scrollTop: 0}];
                }
                else
                {
                    this.pathIndex = 1;
                    this.objectPath = [win, object];
                    this.propertyPath = [null, null];
                    this.viewPath = [
                        {toggles: {}, scrollTop: 0},
                        {toggles: this.toggles, scrollTop: 0}
                    ];
                }
            }

            this.panelNode.scrollTop = 0;
            this.rebuild();
        }
        else
        {
            this.pathIndex = pathIndex;

            var view = this.viewPath[pathIndex];
            this.toggles = view.toggles;

            // Persist the current scroll location
            if (previousView && this.panelNode.scrollTop)
                previousView.scrollTop = this.panelNode.scrollTop;

            this.rebuild(false, view.scrollTop);
        }
    },

    getObjectPath: function(object)
    {
        return this.objectPath;
    },

    getDefaultSelection: function()
    {
        return Firebug.browser.window;
        //return this.context.getGlobalScope();
    }/*,

    updateOption: function(name, value)
    {
        const optionMap = {showUserProps: 1, showUserFuncs: 1, showDOMProps: 1,
            showDOMFuncs: 1, showDOMConstants: 1};
        if ( optionMap.hasOwnProperty(name) )
            this.rebuild(true);
    },

    getOptionsMenuItems: function()
    {
        return [
            optionMenu("ShowUserProps", "showUserProps"),
            optionMenu("ShowUserFuncs", "showUserFuncs"),
            optionMenu("ShowDOMProps", "showDOMProps"),
            optionMenu("ShowDOMFuncs", "showDOMFuncs"),
            optionMenu("ShowDOMConstants", "showDOMConstants"),
            "-",
            {label: "Refresh", command: bindFixed(this.rebuild, this, true) }
        ];
    },

    getContextMenuItems: function(object, target)
    {
        var row = getAncestorByClass(target, "memberRow");

        var items = [];

        if (row)
        {
            var rowName = getRowName(row);
            var rowObject = this.getRowObject(row);
            var rowValue = this.getRowPropertyValue(row);

            var isWatch = hasClass(row, "watchRow");
            var isStackFrame = rowObject instanceof jsdIStackFrame;

            if (typeof(rowValue) == "string" || typeof(rowValue) == "number")
            {
                // Functions already have a copy item in their context menu
                items.push(
                    "-",
                    {label: "CopyValue",
                        command: bindFixed(this.copyProperty, this, row) }
                );
            }

            items.push(
                "-",
                {label: isWatch ? "EditWatch" : (isStackFrame ? "EditVariable" : "EditProperty"),
                    command: bindFixed(this.editProperty, this, row) }
            );

            if (isWatch || (!isStackFrame && !isDOMMember(rowObject, rowName)))
            {
                items.push(
                    {label: isWatch ? "DeleteWatch" : "DeleteProperty",
                        command: bindFixed(this.deleteProperty, this, row) }
                );
            }
        }

        items.push(
            "-",
            {label: "Refresh", command: bindFixed(this.rebuild, this, true) }
        );

        return items;
    },

    getEditor: function(target, value)
    {
        if (!this.editor)
            this.editor = new DOMEditor(this.document);

        return this.editor;
    }/**/
});

// ************************************************************************************************

// TODO: xxxpedro statusbar
var updateStatusBar = function(panel)
{
    var path = panel.propertyPath;
    var index = panel.pathIndex;
    
    var r = [];
    
    for (var i=0, l=path.length; i<l; i++)
    {
        r.push(i==index ? '<a class="fbHover fbButton fbBtnSelected" ' : '<a class="fbHover fbButton" ');
        r.push('pathIndex=');
        r.push(i);
        
        if(isIE6)
            r.push(' href="javascript:void(0)"');
        
        r.push('>');
        r.push(i==0 ? "window" : path[i] || "Object");
        r.push('</a>');
        
        if(i < l-1)
            r.push('<span class="fbStatusSeparator">&gt;</span>');
    }
    panel.statusBarNode.innerHTML = r.join("");
};


var DOMMainPanel = Firebug.DOMPanel = function () {};

Firebug.DOMPanel.DirTable = DirTablePlate;

DOMMainPanel.prototype = extend(Firebug.DOMBasePanel.prototype,
{
    onClickStatusBar: function(event)
    {
        var target = event.srcElement || event.target;
        var element = getAncestorByClass(target, "fbHover");
        
        if(element)
        {
            var pathIndex = element.getAttribute("pathIndex");
            
            if(pathIndex)
            {
                this.select(this.getPathObject(pathIndex));
            }
        }
    },
    
    selectRow: function(row, target)
    {
        if (!target)
            target = row.lastChild.firstChild;

        if (!target || !target.repObject)
            return;

        this.pathToAppend = getPath(row);

        // If the object is inside an array, look up its index
        var valueBox = row.lastChild.firstChild;
        if (hasClass(valueBox, "objectBox-array"))
        {
            var arrayIndex = FirebugReps.Arr.getItemIndex(target);
            this.pathToAppend.push(arrayIndex);
        }

        // Make sure we get a fresh status path for the object, since otherwise
        // it might find the object in the existing path and not refresh it
        //Firebug.chrome.clearStatusPath();

        this.select(target.repObject, true);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onClick: function(event)
    {
        var target = event.srcElement || event.target;
        var repNode = Firebug.getRepNode(target);
        if (repNode)
        {
            var row = getAncestorByClass(target, "memberRow");
            if (row)
            {
                this.selectRow(row, repNode);
                cancelEvent(event);
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "DOM",
    title: "DOM",
    searchable: true,
    statusSeparator: ">",
    
    options: {
        hasToolButtons: true,
        hasStatusBar: true
    },    

    create: function()
    {
        Firebug.DOMBasePanel.prototype.create.apply(this, arguments);
        
        this.onClick = bind(this.onClick, this);
        
        //TODO: xxxpedro
        this.onClickStatusBar = bind(this.onClickStatusBar, this);
        
        this.panelNode.style.padding = "0 1px";
    },

    initialize: function(oldPanelNode)
    {
        //this.panelNode.addEventListener("click", this.onClick, false);
        //dispatch([Firebug.A11yModel], 'onInitializeNode', [this, 'console']);
        
        Firebug.DOMBasePanel.prototype.initialize.apply(this, arguments);
        
        addEvent(this.panelNode, "click", this.onClick);
        
        // TODO: xxxpedro dom 
        this.ishow();
        
        //TODO: xxxpedro
        addEvent(this.statusBarNode, "click", this.onClickStatusBar);        
    },

    shutdown: function()
    {
        //this.panelNode.removeEventListener("click", this.onClick, false);
        //dispatch([Firebug.A11yModel], 'onDestroyNode', [this, 'console']);
        
        removeEvent(this.panelNode, "click", this.onClick);
        
        Firebug.DOMBasePanel.prototype.shutdown.apply(this, arguments);
    }/*,

    search: function(text, reverse)
    {
        if (!text)
        {
            delete this.currentSearch;
            this.highlightRow(null);
            return false;
        }

        var row;
        if (this.currentSearch && text == this.currentSearch.text)
            row = this.currentSearch.findNext(true, undefined, reverse, Firebug.searchCaseSensitive);
        else
        {
            function findRow(node) { return getAncestorByClass(node, "memberRow"); }
            this.currentSearch = new TextSearch(this.panelNode, findRow);
            row = this.currentSearch.find(text, reverse, Firebug.searchCaseSensitive);
        }

        if (row)
        {
            var sel = this.document.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.currentSearch.range);

            scrollIntoCenterView(row, this.panelNode);

            this.highlightRow(row);
            dispatch([Firebug.A11yModel], 'onDomSearchMatchFound', [this, text, row]);
            return true;
        }
        else
        {
            dispatch([Firebug.A11yModel], 'onDomSearchMatchFound', [this, text, null]);
            return false;
        }
    }/**/
});

Firebug.registerPanel(DOMMainPanel);


// ************************************************************************************************



// ************************************************************************************************
// Local Helpers

var getMembers = function getMembers(object, level)  // we expect object to be user-level object wrapped in security blanket
{
    if (!level)
        level = 0;

    var ordinals = [], userProps = [], userClasses = [], userFuncs = [],
        domProps = [], domFuncs = [], domConstants = [];

    try
    {
        var domMembers = getDOMMembers(object);
        //var domMembers = {}; // TODO: xxxpedro
        //var domConstantMap = {};  // TODO: xxxpedro

        if (object.wrappedJSObject)
            var insecureObject = object.wrappedJSObject;
        else
            var insecureObject = object;

        // IE function prototype is not listed in (for..in)
        if (isIE && isFunction(object))
            addMember("user", userProps, "prototype", object.prototype, level);            
            
        for (var name in insecureObject)  // enumeration is safe
        {
            if (ignoreVars[name] == 1)  // javascript.options.strict says ignoreVars is undefined.
                continue;

            var val;
            try
            {
                val = insecureObject[name];  // getter is safe
            }
            catch (exc)
            {
                // Sometimes we get exceptions trying to access certain members
                if (FBTrace.DBG_ERRORS && FBTrace.DBG_DOM)
                    FBTrace.sysout("dom.getMembers cannot access "+name, exc);
            }

            var ordinal = parseInt(name);
            if (ordinal || ordinal == 0)
            {
                addMember("ordinal", ordinals, name, val, level);
            }
            else if (isFunction(val))
            {
                if (isClassFunction(val) && !(name in domMembers))
                    addMember("userClass", userClasses, name, val, level);
                else if (name in domMembers)
                    addMember("domFunction", domFuncs, name, val, level, domMembers[name]);
                else
                    addMember("userFunction", userFuncs, name, val, level);
            }
            else
            {
                //TODO: xxxpedro
                /*
                var getterFunction = insecureObject.__lookupGetter__(name),
                    setterFunction = insecureObject.__lookupSetter__(name),
                    prefix = "";

                if(getterFunction && !setterFunction)
                    prefix = "get ";
                /**/
                
                var prefix = "";

                if (name in domMembers && !(name in domConstantMap))
                    addMember("dom", domProps, (prefix+name), val, level, domMembers[name]);
                else if (name in domConstantMap)
                    addMember("dom", domConstants, (prefix+name), val, level);
                else
                    addMember("user", userProps, (prefix+name), val, level);
            }
        }
    }
    catch (exc)
    {
        // Sometimes we get exceptions just from trying to iterate the members
        // of certain objects, like StorageList, but don't let that gum up the works
        throw exc;
        if (FBTrace.DBG_ERRORS && FBTrace.DBG_DOM)
            FBTrace.sysout("dom.getMembers FAILS: ", exc);
        //throw exc;
    }

    function sortName(a, b) { return a.name > b.name ? 1 : -1; }
    function sortOrder(a, b) { return a.order > b.order ? 1 : -1; }

    var members = [];

    members.push.apply(members, ordinals);

    Firebug.showUserProps = true; // TODO: xxxpedro
    Firebug.showUserFuncs = true; // TODO: xxxpedro
    Firebug.showDOMProps = true;
    Firebug.showDOMFuncs = true;
    Firebug.showDOMConstants = true;
    
    if (Firebug.showUserProps)
    {
        userProps.sort(sortName);
        members.push.apply(members, userProps);
    }

    if (Firebug.showUserFuncs)
    {
        userClasses.sort(sortName);
        members.push.apply(members, userClasses);

        userFuncs.sort(sortName);
        members.push.apply(members, userFuncs);
    }

    if (Firebug.showDOMProps)
    {
        domProps.sort(sortName);
        members.push.apply(members, domProps);
    }

    if (Firebug.showDOMFuncs)
    {
        domFuncs.sort(sortName);
        members.push.apply(members, domFuncs);
    }

    if (Firebug.showDOMConstants)
        members.push.apply(members, domConstants);

    return members;
};

function expandMembers(members, toggles, offset, level)  // recursion starts with offset=0, level=0
{
    var expanded = 0;
    for (var i = offset; i < members.length; ++i)
    {
        var member = members[i];
        if (member.level > level)
            break;

        if ( toggles.hasOwnProperty(member.name) )
        {
            member.open = "opened";  // member.level <= level && member.name in toggles.

            var newMembers = getMembers(member.value, level+1);  // sets newMembers.level to level+1

            var args = [i+1, 0];
            args.push.apply(args, newMembers);
            members.splice.apply(members, args);
            
            /*
            if (FBTrace.DBG_DOM)
            {
                FBTrace.sysout("expandMembers member.name", member.name);
                FBTrace.sysout("expandMembers toggles", toggles);
                FBTrace.sysout("expandMembers toggles[member.name]", toggles[member.name]);
                FBTrace.sysout("dom.expandedMembers level: "+level+" member", member);
            }
            /**/

            expanded += newMembers.length;
            i += newMembers.length + expandMembers(members, toggles[member.name], i+1, level+1);
        }
    }

    return expanded;
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


function isClassFunction(fn)
{
    try
    {
        for (var name in fn.prototype)
            return true;
    } catch (exc) {}
    return false;
}

// FIXME: xxxpedro This function is already defined in Lib. If we keep this definition here, it
// will crash IE9 when not running the IE Developer Tool with JavaScript Debugging enabled!!!
// Check if this function is in fact defined in Firebug for Firefox. If so, we should remove
// this from here. The only difference of this function is the IE hack to show up the prototype
// of functions, but Firebug no longer shows the prototype for simple functions.
//var hasProperties = function hasProperties(ob)
//{
//    try
//    {
//        for (var name in ob)
//            return true;
//    } catch (exc) {}
//    
//    // IE function prototype is not listed in (for..in)
//    if (isFunction(ob)) return true;
//    
//    return false;
//};

FBL.ErrorCopy = function(message)
{
    this.message = message;
};

var addMember = function addMember(type, props, name, value, level, order)
{
    var rep = Firebug.getRep(value);    // do this first in case a call to instanceof reveals contents
    var tag = rep.shortTag ? rep.shortTag : rep.tag;

    var ErrorCopy = function(){}; //TODO: xxxpedro
    
    var valueType = typeof(value);
    var hasChildren = hasProperties(value) && !(value instanceof ErrorCopy) &&
        (isFunction(value) || (valueType == "object" && value != null)
        || (valueType == "string" && value.length > Firebug.stringCropLength));

    props.push({
        name: name,
        value: value,
        type: type,
        rowClass: "memberRow-"+type,
        open: "",
        order: order,
        level: level,
        indent: level*16,
        hasChildren: hasChildren,
        tag: tag
    });
};

var getWatchRowIndex = function getWatchRowIndex(row)
{
    var index = -1;
    for (; row && hasClass(row, "watchRow"); row = row.previousSibling)
        ++index;
    return index;
};

var getRowName = function getRowName(row)
{
    var node = row.firstChild;
    return node.textContent ? node.textContent : node.innerText;
};

var getRowValue = function getRowValue(row)
{
    return row.lastChild.firstChild.repObject;
};

var getRowOwnerObject = function getRowOwnerObject(row)
{
    var parentRow = getParentRow(row);
    if (parentRow)
        return getRowValue(parentRow);
};

var getParentRow = function getParentRow(row)
{
    var level = parseInt(row.getAttribute("level"))-1;
    for (row = row.previousSibling; row; row = row.previousSibling)
    {
        if (parseInt(row.getAttribute("level")) == level)
            return row;
    }
};

var getPath = function getPath(row)
{
    var name = getRowName(row);
    var path = [name];

    var level = parseInt(row.getAttribute("level"))-1;
    for (row = row.previousSibling; row; row = row.previousSibling)
    {
        if (parseInt(row.getAttribute("level")) == level)
        {
            var name = getRowName(row);
            path.splice(0, 0, name);

            --level;
        }
    }

    return path;
};

// ************************************************************************************************


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


// ************************************************************************************************
// DOM Module

Firebug.DOM = extend(Firebug.Module,
{
    getPanel: function()
    {
        return Firebug.chrome ? Firebug.chrome.getPanel("DOM") : null;
    }
});

Firebug.registerModule(Firebug.DOM);


// ************************************************************************************************
// DOM Panel

var lastHighlightedObject;

function DOMSidePanel(){};

DOMSidePanel.prototype = extend(Firebug.DOMBasePanel.prototype,
{
    selectRow: function(row, target)
    {
        if (!target)
            target = row.lastChild.firstChild;

        if (!target || !target.repObject)
            return;

        this.pathToAppend = getPath(row);

        // If the object is inside an array, look up its index
        var valueBox = row.lastChild.firstChild;
        if (hasClass(valueBox, "objectBox-array"))
        {
            var arrayIndex = FirebugReps.Arr.getItemIndex(target);
            this.pathToAppend.push(arrayIndex);
        }

        // Make sure we get a fresh status path for the object, since otherwise
        // it might find the object in the existing path and not refresh it
        //Firebug.chrome.clearStatusPath();

        var object = target.repObject;
        
        if (instanceOf(object, "Element"))
        {
            Firebug.HTML.selectTreeNode(ElementCache(object));
        }
        else
        {
            Firebug.chrome.selectPanel("DOM");
            Firebug.chrome.getPanel("DOM").select(object, true);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onClick: function(event)
    {
        /*
        var target = event.srcElement || event.target;
        
        var object = getAncestorByClass(target, "objectLink");
        object = object ? object.repObject : null;
        
        if(!object) return;
        
        if (instanceOf(object, "Element"))
        {
            Firebug.HTML.selectTreeNode(ElementCache(object));
        }
        else
        {
            Firebug.chrome.selectPanel("DOM");
            Firebug.chrome.getPanel("DOM").select(object, true);
        }
        /**/
        
        
        var target = event.srcElement || event.target;
        var repNode = Firebug.getRepNode(target);
        if (repNode)
        {
            var row = getAncestorByClass(target, "memberRow");
            if (row)
            {
                this.selectRow(row, repNode);
                cancelEvent(event);
            }
        }
        /**/
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: "DOMSidePanel",
    parentPanel: "HTML",
    title: "DOM",
    
    options: {
        hasToolButtons: true
    },
    
    isInitialized: false,
    
    create: function()
    {
        Firebug.DOMBasePanel.prototype.create.apply(this, arguments);
        
        this.onClick = bind(this.onClick, this);
    },
    
    initialize: function(){
        Firebug.DOMBasePanel.prototype.initialize.apply(this, arguments);
        
        addEvent(this.panelNode, "click", this.onClick);
        
        // TODO: xxxpedro css2
        var selection = ElementCache.get(Firebug.context.persistedState.selectedHTMLElementId);
        if (selection)
            this.select(selection, true);
    },
    
    shutdown: function()
    {
        removeEvent(this.panelNode, "click", this.onClick);
        
        Firebug.DOMBasePanel.prototype.shutdown.apply(this, arguments);
    },
    
    reattach: function(oldChrome)
    {
        //this.isInitialized = oldChrome.getPanel("DOM").isInitialized;
        this.toggles = oldChrome.getPanel("DOMSidePanel").toggles;
    }
    
});

Firebug.registerPanel(DOMSidePanel);


// ************************************************************************************************
}});