/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

var saveTimeout = 400;
var pageAmount = 10;

// ************************************************************************************************
// Globals

var currentTarget = null;
var currentGroup = null;
var currentPanel = null;
var currentEditor = null;

var defaultEditor = null;

var originalClassName = null;

var originalValue = null;
var defaultValue = null;
var previousValue = null;

var invalidEditor = false;
var ignoreNextInput = false;

// ************************************************************************************************

Firebug.Editor = extend(Firebug.Module,
{
    supportsStopEvent: true,

    dispatchName: "editor",
    tabCharacter: "    ",

    startEditing: function(target, value, editor)
    {
        this.stopEditing();

        if (hasClass(target, "insertBefore") || hasClass(target, "insertAfter"))
            return;

        var panel = Firebug.getElementPanel(target);
        if (!panel.editable)
            return;

        if (FBTrace.DBG_EDITOR)
            FBTrace.sysout("editor.startEditing " + value, target);

        defaultValue = target.getAttribute("defaultValue");
        if (value == undefined)
        {
            var textContent = isIE ? "innerText" : "textContent";
            value = target[textContent];
            if (value == defaultValue)
                value = "";
        }

        originalValue = previousValue = value;

        invalidEditor = false;
        currentTarget = target;
        currentPanel = panel;
        currentGroup = getAncestorByClass(target, "editGroup");

        currentPanel.editing = true;

        var panelEditor = currentPanel.getEditor(target, value);
        currentEditor = editor ? editor : panelEditor;
        if (!currentEditor)
            currentEditor = getDefaultEditor(currentPanel);

        var inlineParent = getInlineParent(target);
        var targetSize = getOffsetSize(inlineParent);

        setClass(panel.panelNode, "editing");
        setClass(target, "editing");
        if (currentGroup)
            setClass(currentGroup, "editing");

        currentEditor.show(target, currentPanel, value, targetSize);
        //dispatch(this.fbListeners, "onBeginEditing", [currentPanel, currentEditor, target, value]);
        currentEditor.beginEditing(target, value);
        if (FBTrace.DBG_EDITOR)
            FBTrace.sysout("Editor start panel "+currentPanel.name);
        this.attachListeners(currentEditor, panel.context);
    },

    stopEditing: function(cancel)
    {
        if (!currentTarget)
            return;

        if (FBTrace.DBG_EDITOR)
            FBTrace.sysout("editor.stopEditing cancel:" + cancel+" saveTimeout: "+this.saveTimeout);

        clearTimeout(this.saveTimeout);
        delete this.saveTimeout;

        this.detachListeners(currentEditor, currentPanel.context);

        removeClass(currentPanel.panelNode, "editing");
        removeClass(currentTarget, "editing");
        if (currentGroup)
            removeClass(currentGroup, "editing");

        var value = currentEditor.getValue();
        if (value == defaultValue)
            value = "";

        var removeGroup = currentEditor.endEditing(currentTarget, value, cancel);

        try
        {
            if (cancel)
            {
                //dispatch([Firebug.A11yModel], 'onInlineEditorClose', [currentPanel, currentTarget, removeGroup && !originalValue]);
                if (value != originalValue)
                    this.saveEditAndNotifyListeners(currentTarget, originalValue, previousValue);

                if (removeGroup && !originalValue && currentGroup)
                    currentGroup.parentNode.removeChild(currentGroup);
            }
            else if (!value)
            {
                this.saveEditAndNotifyListeners(currentTarget, null, previousValue);

                if (removeGroup && currentGroup)
                    currentGroup.parentNode.removeChild(currentGroup);
            }
            else
                this.save(value);
        }
        catch (exc)
        {
            //throw exc.message;
            //ERROR(exc);
        }

        currentEditor.hide();
        currentPanel.editing = false;

        //dispatch(this.fbListeners, "onStopEdit", [currentPanel, currentEditor, currentTarget]);
        //if (FBTrace.DBG_EDITOR)
        //    FBTrace.sysout("Editor stop panel "+currentPanel.name);
        
        currentTarget = null;
        currentGroup = null;
        currentPanel = null;
        currentEditor = null;
        originalValue = null;
        invalidEditor = false;

        return value;
    },

    cancelEditing: function()
    {
        return this.stopEditing(true);
    },

    update: function(saveNow)
    {
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);

        invalidEditor = true;

        currentEditor.layout();

        if (saveNow)
            this.save();
        else
        {
            var context = currentPanel.context;
            this.saveTimeout = context.setTimeout(bindFixed(this.save, this), saveTimeout);
            if (FBTrace.DBG_EDITOR)
                FBTrace.sysout("editor.update saveTimeout: "+this.saveTimeout);
        }
    },

    save: function(value)
    {
        if (!invalidEditor)
            return;

        if (value == undefined)
            value = currentEditor.getValue();
        if (FBTrace.DBG_EDITOR)
            FBTrace.sysout("editor.save saveTimeout: "+this.saveTimeout+" currentPanel: "+(currentPanel?currentPanel.name:"null"));
        try
        {
            this.saveEditAndNotifyListeners(currentTarget, value, previousValue);

            previousValue = value;
            invalidEditor = false;
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("editor.save FAILS "+exc, exc);
        }
    },

    saveEditAndNotifyListeners: function(currentTarget, value, previousValue)
    {
        currentEditor.saveEdit(currentTarget, value, previousValue);
        //dispatch(this.fbListeners, "onSaveEdit", [currentPanel, currentEditor, currentTarget, value, previousValue]);
    },

    setEditTarget: function(element)
    {
        if (!element)
        {
            dispatch([Firebug.A11yModel], 'onInlineEditorClose', [currentPanel, currentTarget, true]);
            this.stopEditing();
        }
        else if (hasClass(element, "insertBefore"))
            this.insertRow(element, "before");
        else if (hasClass(element, "insertAfter"))
            this.insertRow(element, "after");
        else
            this.startEditing(element);
    },

    tabNextEditor: function()
    {
        if (!currentTarget)
            return;

        var value = currentEditor.getValue();
        var nextEditable = currentTarget;
        do
        {
            nextEditable = !value && currentGroup
                ? getNextOutsider(nextEditable, currentGroup)
                : getNextByClass(nextEditable, "editable");
        }
        while (nextEditable && !nextEditable.offsetHeight);

        this.setEditTarget(nextEditable);
    },

    tabPreviousEditor: function()
    {
        if (!currentTarget)
            return;

        var value = currentEditor.getValue();
        var prevEditable = currentTarget;
        do
        {
            prevEditable = !value && currentGroup
                ? getPreviousOutsider(prevEditable, currentGroup)
                : getPreviousByClass(prevEditable, "editable");
        }
        while (prevEditable && !prevEditable.offsetHeight);

        this.setEditTarget(prevEditable);
    },

    insertRow: function(relative, insertWhere)
    {
        var group =
            relative || getAncestorByClass(currentTarget, "editGroup") || currentTarget;
        var value = this.stopEditing();

        currentPanel = Firebug.getElementPanel(group);

        currentEditor = currentPanel.getEditor(group, value);
        if (!currentEditor)
            currentEditor = getDefaultEditor(currentPanel);

        currentGroup = currentEditor.insertNewRow(group, insertWhere);
        if (!currentGroup)
            return;

        var editable = hasClass(currentGroup, "editable")
            ? currentGroup
            : getNextByClass(currentGroup, "editable");

        if (editable)
            this.setEditTarget(editable);
    },

    insertRowForObject: function(relative)
    {
        var container = getAncestorByClass(relative, "insertInto");
        if (container)
        {
            relative = getChildByClass(container, "insertBefore");
            if (relative)
                this.insertRow(relative, "before");
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    attachListeners: function(editor, context)
    {
        var win = isIE ?
                currentTarget.ownerDocument.parentWindow :
                currentTarget.ownerDocument.defaultView;
        
        addEvent(win, "resize", this.onResize);
        addEvent(win, "blur", this.onBlur);

        var chrome = Firebug.chrome;

        this.listeners = [
            chrome.keyCodeListen("ESCAPE", null, bind(this.cancelEditing, this))
        ];

        if (editor.arrowCompletion)
        {
            this.listeners.push(
                chrome.keyCodeListen("UP", null, bindFixed(editor.completeValue, editor, -1)),
                chrome.keyCodeListen("DOWN", null, bindFixed(editor.completeValue, editor, 1)),
                chrome.keyCodeListen("PAGE_UP", null, bindFixed(editor.completeValue, editor, -pageAmount)),
                chrome.keyCodeListen("PAGE_DOWN", null, bindFixed(editor.completeValue, editor, pageAmount))
            );
        }

        if (currentEditor.tabNavigation)
        {
            this.listeners.push(
                chrome.keyCodeListen("RETURN", null, bind(this.tabNextEditor, this)),
                chrome.keyCodeListen("RETURN", isControl, bind(this.insertRow, this, null, "after")),
                chrome.keyCodeListen("TAB", null, bind(this.tabNextEditor, this)),
                chrome.keyCodeListen("TAB", isShift, bind(this.tabPreviousEditor, this))
            );
        }
        else if (currentEditor.multiLine)
        {
            this.listeners.push(
                chrome.keyCodeListen("TAB", null, insertTab)
            );
        }
        else
        {
            this.listeners.push(
                chrome.keyCodeListen("RETURN", null, bindFixed(this.stopEditing, this))
            );

            if (currentEditor.tabCompletion)
            {
                this.listeners.push(
                    chrome.keyCodeListen("TAB", null, bind(editor.completeValue, editor, 1)),
                    chrome.keyCodeListen("TAB", isShift, bind(editor.completeValue, editor, -1))
                );
            }
        }
    },

    detachListeners: function(editor, context)
    {
        if (!this.listeners)
            return;

        var win = isIE ?
                currentTarget.ownerDocument.parentWindow :
                currentTarget.ownerDocument.defaultView;
        
        removeEvent(win, "resize", this.onResize);
        removeEvent(win, "blur", this.onBlur);

        var chrome = Firebug.chrome;
        if (chrome)
        {
            for (var i = 0; i < this.listeners.length; ++i)
                chrome.keyIgnore(this.listeners[i]);
        }

        delete this.listeners;
    },

    onResize: function(event)
    {
        currentEditor.layout(true);
    },

    onBlur: function(event)
    {
        if (currentEditor.enterOnBlur && isAncestor(event.target, currentEditor.box))
            this.stopEditing();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Module

    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        this.onResize = bindFixed(this.onResize, this);
        this.onBlur = bind(this.onBlur, this);
    },

    disable: function()
    {
        this.stopEditing();
    },

    showContext: function(browser, context)
    {
        this.stopEditing();
    },

    showPanel: function(browser, panel)
    {
        this.stopEditing();
    }
});

// ************************************************************************************************
// BaseEditor

Firebug.BaseEditor = extend(Firebug.MeasureBox,
{
    getValue: function()
    {
    },

    setValue: function(value)
    {
    },

    show: function(target, panel, value, textSize, targetSize)
    {
    },

    hide: function()
    {
    },

    layout: function(forceAll)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Support for context menus within inline editors.

    getContextMenuItems: function(target)
    {
        var items = [];
        items.push({label: "Cut", commandID: "cmd_cut"});
        items.push({label: "Copy", commandID: "cmd_copy"});
        items.push({label: "Paste", commandID: "cmd_paste"});
        return items;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Editor Module listeners will get "onBeginEditing" just before this call

    beginEditing: function(target, value)
    {
    },

    // Editor Module listeners will get "onSaveEdit" just after this call
    saveEdit: function(target, value, previousValue)
    {
    },

    endEditing: function(target, value, cancel)
    {
        // Remove empty groups by default
        return true;
    },

    insertNewRow: function(target, insertWhere)
    {
    }
});

// ************************************************************************************************
// InlineEditor

// basic inline editor attributes
var inlineEditorAttributes = {
    "class": "textEditorInner",
    
    type: "text", 
    spellcheck: "false",
    
    onkeypress: "$onKeyPress",
    
    onoverflow: "$onOverflow",
    oncontextmenu: "$onContextMenu"
};

// IE does not support the oninput event, so we're using the onkeydown to signalize
// the relevant keyboard events, and the onpropertychange to actually handle the
// input event, which should happen after the onkeydown event is fired and after the 
// value of the input is updated, but before the onkeyup and before the input (with the 
// new value) is rendered
if (isIE)
{
    inlineEditorAttributes.onpropertychange = "$onInput";
    inlineEditorAttributes.onkeydown = "$onKeyDown";
}
// for other browsers we use the oninput event
else
{
    inlineEditorAttributes.oninput = "$onInput";
}

Firebug.InlineEditor = function(doc)
{
    this.initializeInline(doc);
};

Firebug.InlineEditor.prototype = domplate(Firebug.BaseEditor,
{
    enterOnBlur: true,
    outerMargin: 8,
    shadowExpand: 7,

    tag:
        DIV({"class": "inlineEditor"},
            DIV({"class": "textEditorTop1"},
                DIV({"class": "textEditorTop2"})
            ),
            DIV({"class": "textEditorInner1"},
                DIV({"class": "textEditorInner2"},
                    INPUT(
                        inlineEditorAttributes
                    )
                )
            ),
            DIV({"class": "textEditorBottom1"},
                DIV({"class": "textEditorBottom2"})
            )
        ),

    inputTag :
        INPUT({"class": "textEditorInner", type: "text",
            /*oninput: "$onInput",*/ onkeypress: "$onKeyPress", onoverflow: "$onOverflow"}
        ),

    expanderTag:
        IMG({"class": "inlineExpander", src: "blank.gif"}),

    initialize: function()
    {
        this.fixedWidth = false;
        this.completeAsYouType = true;
        this.tabNavigation = true;
        this.multiLine = false;
        this.tabCompletion = false;
        this.arrowCompletion = true;
        this.noWrap = true;
        this.numeric = false;
    },

    destroy: function()
    {
        this.destroyInput();
    },

    initializeInline: function(doc)
    {
        if (FBTrace.DBG_EDITOR)
            FBTrace.sysout("Firebug.InlineEditor initializeInline()");
        
        //this.box = this.tag.replace({}, doc, this);
        this.box = this.tag.append({}, doc.body, this);
        
        //this.input = this.box.childNodes[1].firstChild.firstChild;  // XXXjjb childNode[1] required
        this.input = this.box.getElementsByTagName("input")[0];
        
        if (isIElt8)
        {
            this.input.style.top = "-8px";
        }
        
        this.expander = this.expanderTag.replace({}, doc, this);
        this.initialize();
    },

    destroyInput: function()
    {
        // XXXjoe Need to remove input/keypress handlers to avoid leaks
    },

    getValue: function()
    {
        return this.input.value;
    },

    setValue: function(value)
    {
        // It's only a one-line editor, so new lines shouldn't be allowed
        return this.input.value = stripNewLines(value);
    },

    show: function(target, panel, value, targetSize)
    {
        //dispatch([Firebug.A11yModel], "onInlineEditorShow", [panel, this]);
        this.target = target;
        this.panel = panel;

        this.targetSize = targetSize;
        
        // TODO: xxxpedro editor
        //this.targetOffset = getClientOffset(target);
        
        // Some browsers (IE, Google Chrome and Safari) will have problem trying to get the 
        // offset values of invisible elements, or empty elements. So, in order to get the 
        // correct values, we temporary inject a character in the innerHTML of the empty element, 
        // then we get the offset values, and next, we restore the original innerHTML value.
        var innerHTML = target.innerHTML;
        var isEmptyElement = !innerHTML;
        if (isEmptyElement)
            target.innerHTML = ".";
        
        // Get the position of the target element (that is about to be edited)
        this.targetOffset = 
        {
            x: target.offsetLeft,
            y: target.offsetTop
        };
        
        // Restore the original innerHTML value of the empty element
        if (isEmptyElement)
            target.innerHTML = innerHTML;
        
        this.originalClassName = this.box.className;

        var classNames = target.className.split(" ");
        for (var i = 0; i < classNames.length; ++i)
            setClass(this.box, "editor-" + classNames[i]);

        // Make the editor match the target's font style
        copyTextStyles(target, this.box);

        this.setValue(value);

        if (this.fixedWidth)
            this.updateLayout(true);
        else
        {
            this.startMeasuring(target);
            this.textSize = this.measureInputText(value);

            // Correct the height of the box to make the funky CSS drop-shadow line up
            var parent = this.input.parentNode;
            if (hasClass(parent, "textEditorInner2"))
            {
                var yDiff = this.textSize.height - this.shadowExpand;
                
                // IE6 height offset
                if (isIE6)
                    yDiff -= 2;
                
                parent.style.height = yDiff + "px";
                parent.parentNode.style.height = yDiff + "px";
            }

            this.updateLayout(true);
        }

        this.getAutoCompleter().reset();

        if (isIElt8)
            panel.panelNode.appendChild(this.box);
        else
            target.offsetParent.appendChild(this.box);        
        
        //console.log(target);
        //this.input.select(); // it's called bellow, with setTimeout
        
        if (isIE)
        {
            // reset input style
            this.input.style.fontFamily = "Monospace";
            this.input.style.fontSize = "11px";
        }

        // Insert the "expander" to cover the target element with white space
        if (!this.fixedWidth)
        {
            copyBoxStyles(target, this.expander);

            target.parentNode.replaceChild(this.expander, target);
            collapse(target, true);
            this.expander.parentNode.insertBefore(target, this.expander);
        }

        //TODO: xxxpedro
        //scrollIntoCenterView(this.box, null, true);
        
        // Display the editor after change its size and position to avoid flickering
        this.box.style.display = "block";
        
        // we need to call input.focus() and input.select() with a timeout, 
        // otherwise it won't work on all browsers due to timing issues 
        var self = this;
        setTimeout(function(){
            self.input.focus();
            self.input.select();
        },0);
    },

    hide: function()
    {
        this.box.className = this.originalClassName;
        
        if (!this.fixedWidth)
        {
            this.stopMeasuring();

            collapse(this.target, false);

            if (this.expander.parentNode)
                this.expander.parentNode.removeChild(this.expander);
        }

        if (this.box.parentNode)
        {
            ///setSelectionRange(this.input, 0, 0);
            this.input.blur();
            
            this.box.parentNode.removeChild(this.box);
        }

        delete this.target;
        delete this.panel;
    },

    layout: function(forceAll)
    {
        if (!this.fixedWidth)
            this.textSize = this.measureInputText(this.input.value);

        if (forceAll)
            this.targetOffset = getClientOffset(this.expander);

        this.updateLayout(false, forceAll);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    beginEditing: function(target, value)
    {
    },

    saveEdit: function(target, value, previousValue)
    {
    },

    endEditing: function(target, value, cancel)
    {
        // Remove empty groups by default
        return true;
    },

    insertNewRow: function(target, insertWhere)
    {
    },

    advanceToNext: function(target, charCode)
    {
        return false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getAutoCompleteRange: function(value, offset)
    {
    },

    getAutoCompleteList: function(preExpr, expr, postExpr)
    {
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getAutoCompleter: function()
    {
        if (!this.autoCompleter)
        {
            this.autoCompleter = new Firebug.AutoCompleter(null,
                bind(this.getAutoCompleteRange, this), bind(this.getAutoCompleteList, this),
                true, false);
        }

        return this.autoCompleter;
    },

    completeValue: function(amt)
    {
        //console.log("completeValue");
        
        var selectRangeCallback = this.getAutoCompleter().complete(currentPanel.context, this.input, true, amt < 0); 
        
        if (selectRangeCallback)
        {
            Firebug.Editor.update(true);
            
            // We need to select the editor text after calling update in Safari/Chrome,
            // otherwise the text won't be selected
            if (isSafari)
                setTimeout(selectRangeCallback,0);
            else
                selectRangeCallback();
        }
        else
            this.incrementValue(amt);
    },

    incrementValue: function(amt)
    {
        var value = this.input.value;
        
        // TODO: xxxpedro editor
        if (isIE)
            var start = getInputSelectionStart(this.input), end = start;
        else
            var start = this.input.selectionStart, end = this.input.selectionEnd;

        //debugger;
        var range = this.getAutoCompleteRange(value, start);
        if (!range || range.type != "int")
            range = {start: 0, end: value.length-1};

        var expr = value.substr(range.start, range.end-range.start+1);
        preExpr = value.substr(0, range.start);
        postExpr = value.substr(range.end+1);

        // See if the value is an integer, and if so increment it
        var intValue = parseInt(expr);
        if (!!intValue || intValue == 0)
        {
            var m = /\d+/.exec(expr);
            var digitPost = expr.substr(m.index+m[0].length);

            var completion = intValue-amt;
            this.input.value = preExpr + completion + digitPost + postExpr;
            
            setSelectionRange(this.input, start, end);

            Firebug.Editor.update(true);

            return true;
        }
        else
            return false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onKeyPress: function(event)
    {
        //console.log("onKeyPress", event);
        if (event.keyCode == 27 && !this.completeAsYouType)
        {
            var reverted = this.getAutoCompleter().revert(this.input);
            if (reverted)
                cancelEvent(event);
        }
        else if (event.charCode && this.advanceToNext(this.target, event.charCode))
        {
            Firebug.Editor.tabNextEditor();
            cancelEvent(event);
        }
        else
        {
            if (this.numeric && event.charCode && (event.charCode < 48 || event.charCode > 57)
                && event.charCode != 45 && event.charCode != 46)
                FBL.cancelEvent(event);
            else
            {
                // If the user backspaces, don't autocomplete after the upcoming input event
                this.ignoreNextInput = event.keyCode == 8;
            }
        }
    },

    onOverflow: function()
    {
        this.updateLayout(false, false, 3);
    },

    onKeyDown: function(event)
    {
        //console.log("onKeyDown", event.keyCode);
        if (event.keyCode > 46 || event.keyCode == 32 || event.keyCode == 8)
        {
            this.keyDownPressed = true;
        }
    },
    
    onInput: function(event)
    {
        //debugger;
        
        // skip not relevant onpropertychange calls on IE
        if (isIE)
        {
            if (event.propertyName != "value" || !isVisible(this.input) || !this.keyDownPressed) 
                return;
            
            this.keyDownPressed = false;
        }
        
        //console.log("onInput", event);
        //console.trace();
        
        var selectRangeCallback;
        
        if (this.ignoreNextInput)
        {
            this.ignoreNextInput = false;
            this.getAutoCompleter().reset();
        }
        else if (this.completeAsYouType)
            selectRangeCallback = this.getAutoCompleter().complete(currentPanel.context, this.input, false);
        else
            this.getAutoCompleter().reset();

        Firebug.Editor.update();
        
        if (selectRangeCallback)
        {
            // We need to select the editor text after calling update in Safari/Chrome,
            // otherwise the text won't be selected
            if (isSafari)
                setTimeout(selectRangeCallback,0);
            else
                selectRangeCallback();
        }
    },

    onContextMenu: function(event)
    {
        cancelEvent(event);

        var popup = $("fbInlineEditorPopup");
        FBL.eraseNode(popup);

        var target = event.target || event.srcElement;
        var menu = this.getContextMenuItems(target);
        if (menu)
        {
            for (var i = 0; i < menu.length; ++i)
                FBL.createMenuItem(popup, menu[i]);
        }

        if (!popup.firstChild)
            return false;

        popup.openPopupAtScreen(event.screenX, event.screenY, true);
        return true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    updateLayout: function(initial, forceAll, extraWidth)
    {
        if (this.fixedWidth)
        {
            this.box.style.left = (this.targetOffset.x) + "px";
            this.box.style.top = (this.targetOffset.y) + "px";

            var w = this.target.offsetWidth;
            var h = this.target.offsetHeight;
            this.input.style.width = w + "px";
            this.input.style.height = (h-3) + "px";
        }
        else
        {
            if (initial || forceAll)
            {
                this.box.style.left = this.targetOffset.x + "px";
                this.box.style.top = this.targetOffset.y + "px";
            }

            var approxTextWidth = this.textSize.width;
            var maxWidth = (currentPanel.panelNode.scrollWidth - this.targetOffset.x)
                - this.outerMargin;

            var wrapped = initial
                ? this.noWrap && this.targetSize.height > this.textSize.height+3
                : this.noWrap && approxTextWidth > maxWidth;

            if (wrapped)
            {
                var style = isIE ?
                        this.target.currentStyle :
                        this.target.ownerDocument.defaultView.getComputedStyle(this.target, "");
                
                targetMargin = parseInt(style.marginLeft) + parseInt(style.marginRight);

                // Make the width fit the remaining x-space from the offset to the far right
                approxTextWidth = maxWidth - targetMargin;

                this.input.style.width = "100%";
                this.box.style.width = approxTextWidth + "px";
            }
            else
            {
                // Make the input one character wider than the text value so that
                // typing does not ever cause the textbox to scroll
                var charWidth = this.measureInputText('m').width;

                // Sometimes we need to make the editor a little wider, specifically when
                // an overflow happens, otherwise it will scroll off some text on the left
                if (extraWidth)
                    charWidth *= extraWidth;

                var inputWidth = approxTextWidth + charWidth;

                if (initial)
                {
                    if (isIE)
                    {
                        // TODO: xxxpedro
                        var xDiff = 13;
                        this.box.style.width = (inputWidth + xDiff) + "px";
                    }
                    else
                        this.box.style.width = "auto";
                }
                else
                {
                    // TODO: xxxpedro
                    var xDiff = isIE ? 13: this.box.scrollWidth - this.input.offsetWidth;
                    this.box.style.width = (inputWidth + xDiff) + "px";
                }

                this.input.style.width = inputWidth + "px";
            }

            this.expander.style.width = approxTextWidth + "px";
            this.expander.style.height = Math.max(this.textSize.height-3,0) + "px";
        }

        if (forceAll)
            scrollIntoCenterView(this.box, null, true);
    }
});

// ************************************************************************************************
// Autocompletion

Firebug.AutoCompleter = function(getExprOffset, getRange, evaluator, selectMode, caseSensitive)
{
    var candidates = null;
    var originalValue = null;
    var originalOffset = -1;
    var lastExpr = null;
    var lastOffset = -1;
    var exprOffset = 0;
    var lastIndex = 0;
    var preParsed = null;
    var preExpr = null;
    var postExpr = null;

    this.revert = function(textBox)
    {
        if (originalOffset != -1)
        {
            textBox.value = originalValue;
            
            setSelectionRange(textBox, originalOffset, originalOffset);

            this.reset();
            return true;
        }
        else
        {
            this.reset();
            return false;
        }
    };

    this.reset = function()
    {
        candidates = null;
        originalValue = null;
        originalOffset = -1;
        lastExpr = null;
        lastOffset = 0;
        exprOffset = 0;
    };

    this.complete = function(context, textBox, cycle, reverse)
    {
        //console.log("complete", context, textBox, cycle, reverse);
        // TODO: xxxpedro important port to firebug (variable leak)
        //var value = lastValue = textBox.value;
        var value = textBox.value;
        
        //var offset = textBox.selectionStart;
        var offset = getInputSelectionStart(textBox);
        
        // The result of selectionStart() in Safari/Chrome is 1 unit less than the result
        // in Firefox. Therefore, we need to manually adjust the value here.
        if (isSafari && !cycle && offset >= 0) offset++;
        
        if (!selectMode && originalOffset != -1)
            offset = originalOffset;

        if (!candidates || !cycle || offset != lastOffset)
        {
            originalOffset = offset;
            originalValue = value;

            // Find the part of the string that will be parsed
            var parseStart = getExprOffset ? getExprOffset(value, offset, context) : 0;
            preParsed = value.substr(0, parseStart);
            var parsed = value.substr(parseStart);

            // Find the part of the string that is being completed
            var range = getRange ? getRange(parsed, offset-parseStart, context) : null;
            if (!range)
                range = {start: 0, end: parsed.length-1 };

            var expr = parsed.substr(range.start, range.end-range.start+1);
            preExpr = parsed.substr(0, range.start);
            postExpr = parsed.substr(range.end+1);
            exprOffset = parseStart + range.start;

            if (!cycle)
            {
                if (!expr)
                    return;
                else if (lastExpr && lastExpr.indexOf(expr) != 0)
                {
                    candidates = null;
                }
                else if (lastExpr && lastExpr.length >= expr.length)
                {
                    candidates = null;
                    lastExpr = expr;
                    return;
                }
            }

            lastExpr = expr;
            lastOffset = offset;

            var searchExpr;

            // Check if the cursor is at the very right edge of the expression, or
            // somewhere in the middle of it
            if (expr && offset != parseStart+range.end+1)
            {
                if (cycle)
                {
                    // We are in the middle of the expression, but we can
                    // complete by cycling to the next item in the values
                    // list after the expression
                    offset = range.start;
                    searchExpr = expr;
                    expr = "";
                }
                else
                {
                    // We can't complete unless we are at the ridge edge
                    return;
                }
            }

            var values = evaluator(preExpr, expr, postExpr, context);
            if (!values)
                return;

            if (expr)
            {
                // Filter the list of values to those which begin with expr. We
                // will then go on to complete the first value in the resulting list
                candidates = [];

                if (caseSensitive)
                {
                    for (var i = 0; i < values.length; ++i)
                    {
                        var name = values[i];
                        if (name.indexOf && name.indexOf(expr) == 0)
                            candidates.push(name);
                    }
                }
                else
                {
                    var lowerExpr = caseSensitive ? expr : expr.toLowerCase();
                    for (var i = 0; i < values.length; ++i)
                    {
                        var name = values[i];
                        if (name.indexOf && name.toLowerCase().indexOf(lowerExpr) == 0)
                            candidates.push(name);
                    }
                }

                lastIndex = reverse ? candidates.length-1 : 0;
            }
            else if (searchExpr)
            {
                var searchIndex = -1;

                // Find the first instance of searchExpr in the values list. We
                // will then complete the string that is found
                if (caseSensitive)
                {
                    searchIndex = values.indexOf(expr);
                }
                else
                {
                    var lowerExpr = searchExpr.toLowerCase();
                    for (var i = 0; i < values.length; ++i)
                    {
                        var name = values[i];
                        if (name && name.toLowerCase().indexOf(lowerExpr) == 0)
                        {
                            searchIndex = i;
                            break;
                        }
                    }
                }

                // Nothing found, so there's nothing to complete to
                if (searchIndex == -1)
                    return this.reset();

                expr = searchExpr;
                candidates = cloneArray(values);
                lastIndex = searchIndex;
            }
            else
            {
                expr = "";
                candidates = [];
                for (var i = 0; i < values.length; ++i)
                {
                    if (values[i].substr)
                        candidates.push(values[i]);
                }
                lastIndex = -1;
            }
        }

        if (cycle)
        {
            expr = lastExpr;
            lastIndex += reverse ? -1 : 1;
        }

        if (!candidates.length)
            return;

        if (lastIndex >= candidates.length)
            lastIndex = 0;
        else if (lastIndex < 0)
            lastIndex = candidates.length-1;

        var completion = candidates[lastIndex];
        var preCompletion = expr.substr(0, offset-exprOffset);
        var postCompletion = completion.substr(offset-exprOffset);

        textBox.value = preParsed + preExpr + preCompletion + postCompletion + postExpr;
        var offsetEnd = preParsed.length + preExpr.length + completion.length;
        
        // TODO: xxxpedro remove the following commented code, if the lib.setSelectionRange()
        // is working well.
        /*
        if (textBox.setSelectionRange)
        {
            // we must select the range with a timeout, otherwise the text won't
            // be properly selected (because after this function executes, the editor's
            // input will be resized to fit the whole text)
            setTimeout(function(){
                if (selectMode)
                    textBox.setSelectionRange(offset, offsetEnd);
                else
                    textBox.setSelectionRange(offsetEnd, offsetEnd);
            },0);
        }
        /**/
        
        // we must select the range with a timeout, otherwise the text won't
        // be properly selected (because after this function executes, the editor's
        // input will be resized to fit the whole text)
        /*
        setTimeout(function(){
            if (selectMode)
                setSelectionRange(textBox, offset, offsetEnd);
            else
                setSelectionRange(textBox, offsetEnd, offsetEnd);
        },0);
                
        return true;
        /**/
        
        // The editor text should be selected only after calling the editor.update() 
        // in Safari/Chrome, otherwise the text won't be selected. So, we're returning
        // a function to be called later (in the proper time for all browsers).
        //
        // TODO: xxxpedro see if we can move the editor.update() calls to here, and avoid
        // returning a closure. the complete() function seems to be called only twice in
        // editor.js. See if this function is called anywhere else (like css.js for example).
        return function(){
            //console.log("autocomplete ", textBox, offset, offsetEnd);
            
            if (selectMode)
                setSelectionRange(textBox, offset, offsetEnd);
            else
                setSelectionRange(textBox, offsetEnd, offsetEnd);
        };
        /**/
    };
};

// ************************************************************************************************
// Local Helpers

var getDefaultEditor = function getDefaultEditor(panel)
{
    if (!defaultEditor)
    {
        var doc = panel.document;
        defaultEditor = new Firebug.InlineEditor(doc);
    }

    return defaultEditor;
}

/**
 * An outsider is the first element matching the stepper element that
 * is not an child of group. Elements tagged with insertBefore or insertAfter
 * classes are also excluded from these results unless they are the sibling
 * of group, relative to group's parent editGroup. This allows for the proper insertion
 * rows when groups are nested.
 */
var getOutsider = function getOutsider(element, group, stepper)
{
    var parentGroup = getAncestorByClass(group.parentNode, "editGroup");
    var next;
    do
    {
        next = stepper(next || element);
    }
    while (isAncestor(next, group) || isGroupInsert(next, parentGroup));

    return next;
}

var isGroupInsert = function isGroupInsert(next, group)
{
    return (!group || isAncestor(next, group))
        && (hasClass(next, "insertBefore") || hasClass(next, "insertAfter"));
}

var getNextOutsider = function getNextOutsider(element, group)
{
    return getOutsider(element, group, bind(getNextByClass, FBL, "editable"));
}

var getPreviousOutsider = function getPreviousOutsider(element, group)
{
    return getOutsider(element, group, bind(getPreviousByClass, FBL, "editable"));
}

var getInlineParent = function getInlineParent(element)
{
    var lastInline = element;
    for (; element; element = element.parentNode)
    {
        //var s = element.ownerDocument.defaultView.getComputedStyle(element, "");
        var s = isIE ?
                element.currentStyle :
                element.ownerDocument.defaultView.getComputedStyle(element, "");
        
        if (s.display != "inline")
            return lastInline;
        else
            lastInline = element;
    }
    return null;
}

var insertTab = function insertTab()
{
    insertTextIntoElement(currentEditor.input, Firebug.Editor.tabCharacter);
}

// ************************************************************************************************

Firebug.registerModule(Firebug.Editor);

// ************************************************************************************************

}});
