/* See license.txt for terms of usage */

FBL.ns( /** @scope s_gui */ function() { with (FBL) {
// ************************************************************************************************

// ************************************************************************************************
// Controller

/**@namespace*/
FBL.Controller = {
        
    controllers: null,
    controllerContext: null,
    
    initialize: function(context)
    {
        this.controllers = [];
        this.controllerContext = context || Firebug.chrome;
    },
    
    shutdown: function()
    {
        this.removeControllers();
        
        //this.controllers = null;
        //this.controllerContext = null;
    },
    
    addController: function()
    {
        for (var i=0, arg; arg=arguments[i]; i++)
        {
            // If the first argument is a string, make a selector query 
            // within the controller node context
            if (typeof arg[0] == "string")
            {
                arg[0] = $$(arg[0], this.controllerContext);
            }
            
            // bind the handler to the proper context
            var handler = arg[2];
            arg[2] = bind(handler, this);
            // save the original handler as an extra-argument, so we can
            // look for it later, when removing a particular controller            
            arg[3] = handler;
            
            this.controllers.push(arg);
            addEvent.apply(this, arg);
        }
    },
    
    removeController: function()
    {
        for (var i=0, arg; arg=arguments[i]; i++)
        {
            for (var j=0, c; c=this.controllers[j]; j++)
            {
                if (arg[0] == c[0] && arg[1] == c[1] && arg[2] == c[3])
                    removeEvent.apply(this, c);
            }
        }
    },
    
    removeControllers: function()
    {
        for (var i=0, c; c=this.controllers[i]; i++)
        {
            removeEvent.apply(this, c);
        }
    }
};


// ************************************************************************************************
// PanelBar

/**@namespace*/
FBL.PanelBar = 
{
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    panelMap: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    selectedPanel: null,
    parentPanelName: null,
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    
    create: function(ownerPanel)
    {
        this.panelMap = {};
        this.ownerPanel = ownerPanel;
        
        if (ownerPanel)
        {
            ownerPanel.sidePanelBarNode = createElement("span");
            ownerPanel.sidePanelBarNode.style.display = "none";
            ownerPanel.sidePanelBarBoxNode.appendChild(ownerPanel.sidePanelBarNode);
        }
        
        var panels = Firebug.panelTypes;
        for (var i=0, p; p=panels[i]; i++)
        {
            if ( // normal Panel  of the Chrome's PanelBar
                !ownerPanel && !p.prototype.parentPanel ||
                // Child Panel of the current Panel's SidePanelBar
                ownerPanel && p.prototype.parentPanel && 
                ownerPanel.name == p.prototype.parentPanel)
            {
                this.addPanel(p.prototype.name);
            }
        }
    },
    
    destroy: function()
    {
        PanelBar.shutdown.call(this);
        
        for (var name in this.panelMap)
        {
            this.removePanel(name);
            
            var panel = this.panelMap[name];
            panel.destroy();
            
            this.panelMap[name] = null;
            delete this.panelMap[name];
        }
        
        this.panelMap = null;
        this.ownerPanel = null;
    },
    
    initialize: function()
    {
        if (this.ownerPanel)
            this.ownerPanel.sidePanelBarNode.style.display = "inline";
        
        for(var name in this.panelMap)
        {
            (function(self, name){
                
                // tab click handler
                var onTabClick = function onTabClick()
                { 
                    self.selectPanel(name);
                    return false;
                };
                
                Firebug.chrome.addController([self.panelMap[name].tabNode, "mousedown", onTabClick]);
                
            })(this, name);
        }
    },
    
    shutdown: function()
    {
        var selectedPanel = this.selectedPanel;
        
        if (selectedPanel)
        {
            removeClass(selectedPanel.tabNode, "fbSelectedTab");
            selectedPanel.hide();
            selectedPanel.shutdown();
        }
        
        if (this.ownerPanel)
            this.ownerPanel.sidePanelBarNode.style.display = "none";        
        
        this.selectedPanel = null;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    addPanel: function(panelName, parentPanel)
    {
        var PanelType = Firebug.panelTypeMap[panelName];
        var panel = this.panelMap[panelName] = new PanelType();
        
        panel.create();
    },
    
    removePanel: function(panelName)
    {
        var panel = this.panelMap[panelName];
        if (panel.hasOwnProperty(panelName))
            panel.destroy();
    },
    
    selectPanel: function(panelName)
    {
        var selectedPanel = this.selectedPanel;
        var panel = this.panelMap[panelName];
        
        if (panel && selectedPanel != panel)
        {
            if (selectedPanel)
            {
                removeClass(selectedPanel.tabNode, "fbSelectedTab");
                selectedPanel.shutdown();
                selectedPanel.hide();
            }
            
            if (!panel.parentPanel)
                Firebug.context.persistedState.selectedPanelName = panelName;
            
            this.selectedPanel = panel;
            
            setClass(panel.tabNode, "fbSelectedTab");
            panel.show();
            panel.initialize();
        }
    },
    
    getPanel: function(panelName)
    {
        var panel = this.panelMap[panelName];
        
        return panel;
    }
   
};

//************************************************************************************************
// Button

/**
 * options.element
 * options.caption
 * options.title
 * 
 * options.owner
 * options.className
 * options.pressedClassName
 * 
 * options.onPress
 * options.onUnpress
 * options.onClick
 * 
 * @class
 * @extends FBL.Controller 
 *  
 */

FBL.Button = function(options)
{
    options = options || {};
    
    append(this, options);
    
    this.state = "unpressed";
    this.display = "unpressed";
    
    if (this.element)
    {
        this.container = this.element.parentNode;
    }
    else
    {
        this.shouldDestroy = true;
        
        this.container = this.owner.getPanel().toolButtonsNode;
        
        this.element = createElement("a", {
            className: this.baseClassName + " " + this.className + " fbHover",
            innerHTML: this.caption
        });
        
        if (this.title)
            this.element.title = this.title;
        
        this.container.appendChild(this.element);
    }
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

Button.prototype = extend(Controller,
/**@extend FBL.Button.prototype*/
{
    type: "normal",
    caption: "caption",
    title: null,
    
    className: "", // custom class
    baseClassName: "fbButton", // control class
    pressedClassName: "fbBtnPressed", // control pressed class
    
    element: null,
    container: null,
    owner: null,
    
    state: null,
    display: null,
    
    destroy: function()
    {
        this.shutdown();
        
        // only remove if it is a dynamically generated button (not pre-rendered)
        if (this.shouldDestroy)
            this.container.removeChild(this.element);
        
        this.element = null;
        this.container = null;
        this.owner = null;
    },
    
    initialize: function()
    {
        Controller.initialize.apply(this);
        
        var element = this.element;
        
        this.addController([element, "mousedown", this.handlePress]);
        
        if (this.type == "normal")
            this.addController(
                [element, "mouseup", this.handleUnpress],
                [element, "mouseout", this.handleUnpress],
                [element, "click", this.handleClick]
            );
    },
    
    shutdown: function()
    {
        Controller.shutdown.apply(this);
    },
    
    restore: function()
    {
        this.changeState("unpressed");
    },
    
    changeState: function(state)
    {
        this.state = state;
        this.changeDisplay(state);
    },
    
    changeDisplay: function(display)
    {
        if (display != this.display)
        {
            if (display == "pressed")
            {
                setClass(this.element, this.pressedClassName);
            }
            else if (display == "unpressed")
            {
                removeClass(this.element, this.pressedClassName);
            }
            this.display = display;
        }
    },
    
    handlePress: function(event)
    {
        cancelEvent(event, true);
        
        if (this.type == "normal")
        {
            this.changeDisplay("pressed");
            this.beforeClick = true;
        }
        else if (this.type == "toggle")
        {
            if (this.state == "pressed")
            {
                this.changeState("unpressed");
                
                if (this.onUnpress)
                    this.onUnpress.apply(this.owner, arguments);
            }
            else
            {
                this.changeState("pressed");
                
                if (this.onPress)
                    this.onPress.apply(this.owner, arguments);
            }
            
            if (this.onClick)
                this.onClick.apply(this.owner, arguments);
        }
        
        return false;
    },
    
    handleUnpress: function(event)
    {
        cancelEvent(event, true);
        
        if (this.beforeClick)
            this.changeDisplay("unpressed");
        
        return false;
    },
    
    handleClick: function(event)
    {
        cancelEvent(event, true);
        
        if (this.type == "normal")
        {
            if (this.onClick)
                this.onClick.apply(this.owner);
            
            this.changeState("unpressed");
        }
        
        this.beforeClick = false;
        
        return false;
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

/**
 * @class
 * @extends FBL.Button 
 */
FBL.IconButton = function()
{
    Button.apply(this, arguments);
};

IconButton.prototype = extend(Button.prototype,
/**@extend FBL.IconButton.prototype*/ 
{
    baseClassName: "fbIconButton",
    pressedClassName: "fbIconPressed"
});


//************************************************************************************************
// Menu

var menuItemProps = {"class": "$item.className", type: "$item.type", value: "$item.value",
        _command: "$item.command"};

if (isIE6)
    menuItemProps.href = "javascript:void(0)";

// Allow GUI to be loaded even when Domplate module is not installed.
if (FBL.domplate)
var MenuPlate = domplate(Firebug.Rep,
{
    tag:
        DIV({"class": "fbMenu fbShadow"},
            DIV({"class": "fbMenuContent fbShadowContent"},
                FOR("item", "$object.items|memberIterator",
                    TAG("$item.tag", {item: "$item"})
                )
            )
        ),
        
    itemTag:
        A(menuItemProps,
            "$item.label"
        ),
        
    checkBoxTag:
        A(extend(menuItemProps, {checked : "$item.checked"}),
           
            "$item.label"
        ),
        
    radioButtonTag:
        A(extend(menuItemProps, {selected : "$item.selected"}),
           
            "$item.label"
        ),
        
    groupTag:
        A(extend(menuItemProps, {child: "$item.child"}),
            "$item.label"
        ),
        
    shortcutTag:
        A(menuItemProps,
            "$item.label",
            SPAN({"class": "fbMenuShortcutKey"},
                "$item.key"
            )
        ),
        
    separatorTag:
        SPAN({"class": "fbMenuSeparator"}),
        
    memberIterator: function(items)
    {
        var result = [];
        
        for (var i=0, length=items.length; i<length; i++)
        {
            var item = items[i];
            
            // separator representation
            if (typeof item == "string" && item.indexOf("-") == 0)
            {
                result.push({tag: this.separatorTag});
                continue;
            }
            
            item = extend(item, {});
            
            item.type = item.type || "";
            item.value = item.value || "";
            
            var type = item.type;
            
            // default item representation
            item.tag = this.itemTag;
            
            var className = item.className || ""; 
            
            className += "fbMenuOption fbHover ";
            
            // specific representations
            if (type == "checkbox")
            {
                className += "fbMenuCheckBox ";
                item.tag = this.checkBoxTag;
            }
            else if (type == "radiobutton")
            {
                className += "fbMenuRadioButton ";
                item.tag = this.radioButtonTag;
            }
            else if (type == "group")
            {
                className += "fbMenuGroup ";
                item.tag = this.groupTag;
            }
            else if (type == "shortcut")
            {
                className += "fbMenuShortcut ";
                item.tag = this.shortcutTag;
            }
            
            if (item.checked)
                className += "fbMenuChecked ";
            else if (item.selected)
                className += "fbMenuRadioSelected ";
            
            if (item.disabled)
                className += "fbMenuDisabled ";
            
            item.className = className;
            
            item.label = $STR(item.label);
            
            result.push(item);
        }
        
        return result;
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

/**
 * options
 * options.element
 * options.id
 * options.items
 * 
 * item.label
 * item.className
 * item.type
 * item.value
 * item.disabled
 * item.checked
 * item.selected
 * item.command
 * item.child
 * 
 * 
 * @class
 * @extends FBL.Controller
 *   
 */
FBL.Menu = function(options)
{
    // if element is not pre-rendered, we must render it now
    if (!options.element)
    {
        if (options.getItems)
            options.items = options.getItems();
        
        options.element = MenuPlate.tag.append(
                {object: options},
                getElementByClass(Firebug.chrome.document, "fbBody"),
                MenuPlate
            );
    }
    
    // extend itself with the provided options
    append(this, options);
    
    if (typeof this.element == "string")
    {
        this.id = this.element;
        this.element = $(this.id);
    }
    else if (this.id)
    {
        this.element.id = this.id;
    }
    
    this.element.firebugIgnore = true;
    this.elementStyle = this.element.style;
    
    this.isVisible = false;
    
    this.handleMouseDown = bind(this.handleMouseDown, this);
    this.handleMouseOver = bind(this.handleMouseOver, this);
    this.handleMouseOut = bind(this.handleMouseOut, this);
    
    this.handleWindowMouseDown = bind(this.handleWindowMouseDown, this);
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

var menuMap = {};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

Menu.prototype =  extend(Controller,
/**@extend FBL.Menu.prototype*/
{
    destroy: function()
    {
        //if (this.element) console.log("destroy", this.element.id);
        
        this.hide();
        
        // if it is a childMenu, remove its reference from the parentMenu
        if (this.parentMenu)
            this.parentMenu.childMenu = null;
        
        // remove the element from the document
        this.element.parentNode.removeChild(this.element);
        
        // clear references
        this.element = null;
        this.elementStyle = null;
        this.parentMenu = null;
        this.parentTarget = null;
    },
    
    initialize: function()
    {
        Controller.initialize.call(this);
        
        this.addController(
                [this.element, "mousedown", this.handleMouseDown],
                [this.element, "mouseover", this.handleMouseOver]
             );
    },
    
    shutdown: function()
    {
        Controller.shutdown.call(this);
    },
    
    show: function(x, y)
    {
        this.initialize();
        
        if (this.isVisible) return;
        
        //console.log("show", this.element.id);
        
        x = x || 0;
        y = y || 0;
        
        if (this.parentMenu)
        {
            var oldChildMenu = this.parentMenu.childMenu;
            if (oldChildMenu && oldChildMenu != this)
            {
                oldChildMenu.destroy();
            }
            
            this.parentMenu.childMenu = this;
        }
        else
            addEvent(Firebug.chrome.document, "mousedown", this.handleWindowMouseDown);
        
        this.elementStyle.display = "block";
        this.elementStyle.visibility = "hidden";
        
        var size = Firebug.chrome.getSize();
        
        x = Math.min(x, size.width - this.element.clientWidth - 10);
        x = Math.max(x, 0);
        
        y = Math.min(y, size.height - this.element.clientHeight - 10);
        y = Math.max(y, 0);
        
        this.elementStyle.left = x + "px";
        this.elementStyle.top = y + "px";
        
        this.elementStyle.visibility = "visible";
        
        this.isVisible = true;
        
        if (isFunction(this.onShow))
            this.onShow.apply(this, arguments);
    },
    
    hide: function()
    {
        this.clearHideTimeout();
        this.clearShowChildTimeout();
        
        if (!this.isVisible) return;
        
        //console.log("hide", this.element.id);
        
        this.elementStyle.display = "none";
        
        if(this.childMenu)
        {
            this.childMenu.destroy();
            this.childMenu = null;
        }
        
        if(this.parentTarget)
            removeClass(this.parentTarget, "fbMenuGroupSelected");
        
        this.isVisible = false;
        
        this.shutdown();
        
        if (isFunction(this.onHide))
            this.onHide.apply(this, arguments);
    },
    
    showChildMenu: function(target)
    {
        var id = target.getAttribute("child");
        
        var parent = this;
        var target = target;
        
        this.showChildTimeout = Firebug.chrome.window.setTimeout(function(){
            
            //if (!parent.isVisible) return;
            
            var box = Firebug.chrome.getElementBox(target);
            
            var childMenuObject = menuMap.hasOwnProperty(id) ?
                    menuMap[id] : {element: $(id)};
            
            var childMenu = new Menu(extend(childMenuObject, 
                {
                    parentMenu: parent,
                    parentTarget: target
                }));
            
            var offsetLeft = isIE6 ? -1 : -6; // IE6 problem with fixed position
            childMenu.show(box.left + box.width + offsetLeft, box.top -6);
            setClass(target, "fbMenuGroupSelected");
            
        },350);
    },
    
    clearHideTimeout: function()
    {
        if (this.hideTimeout)
        {
            Firebug.chrome.window.clearTimeout(this.hideTimeout);
            delete this.hideTimeout;
        }
    },
    
    clearShowChildTimeout: function()
    {
        if(this.showChildTimeout)
        {
            Firebug.chrome.window.clearTimeout(this.showChildTimeout);
            this.showChildTimeout = null;
        }
    },
    
    handleMouseDown: function(event)
    {
        cancelEvent(event, true);
        
        var topParent = this;
        while (topParent.parentMenu)
            topParent = topParent.parentMenu;
        
        var target = event.target || event.srcElement;
        
        target = getAncestorByClass(target, "fbMenuOption");
        
        if(!target || hasClass(target, "fbMenuGroup"))
            return false;
        
        if (target && !hasClass(target, "fbMenuDisabled"))
        {
            var type = target.getAttribute("type");
            
            if (type == "checkbox")
            {
                var checked = target.getAttribute("checked");
                var value = target.getAttribute("value");
                var wasChecked = hasClass(target, "fbMenuChecked");
                
                if (wasChecked)
                {
                    removeClass(target, "fbMenuChecked");
                    target.setAttribute("checked", "");
                }
                else
                {
                    setClass(target, "fbMenuChecked");
                    target.setAttribute("checked", "true");
                }
                
                if (isFunction(this.onCheck))
                    this.onCheck.call(this, target, value, !wasChecked);
            }            
            
            if (type == "radiobutton")
            {
                var selectedRadios = getElementsByClass(target.parentNode, "fbMenuRadioSelected");
                
                var group = target.getAttribute("group");
                
                for (var i = 0, length = selectedRadios.length; i < length; i++)
                {
                    radio = selectedRadios[i];
                    
                    if (radio.getAttribute("group") == group)
                    {
                        removeClass(radio, "fbMenuRadioSelected");
                        radio.setAttribute("selected", "");
                    }
                }
                
                setClass(target, "fbMenuRadioSelected");
                target.setAttribute("selected", "true");
            }            
            
            var handler = null;
             
            // target.command can be a function or a string. 
            var cmd = target.command;
            
            // If it is a function it will be used as the handler
            if (isFunction(cmd))
                handler = cmd;
            // If it is a string it the property of the current menu object 
            // will be used as the handler
            else if (typeof cmd == "string")
                handler = this[cmd];
            
            var closeMenu = true;
            
            if (handler)
                closeMenu = handler.call(this, target) !== false;
            
            if (closeMenu)
                topParent.hide();
        }
        
        return false;
    },
    
    handleWindowMouseDown: function(event)
    {
        //console.log("handleWindowMouseDown");
        
        var target = event.target || event.srcElement;
        
        target = getAncestorByClass(target, "fbMenu");
        
        if (!target)
        {
            removeEvent(Firebug.chrome.document, "mousedown", this.handleWindowMouseDown);
            this.hide();
        }
    },

    handleMouseOver: function(event)
    {
        //console.log("handleMouseOver", this.element.id);
        
        this.clearHideTimeout();
        this.clearShowChildTimeout();
        
        var target = event.target || event.srcElement;
        
        target = getAncestorByClass(target, "fbMenuOption");
        
        if(!target)
            return;
        
        var childMenu = this.childMenu;
        if(childMenu) 
        {
            removeClass(childMenu.parentTarget, "fbMenuGroupSelected");
            
            if (childMenu.parentTarget != target && childMenu.isVisible)
            {
                childMenu.clearHideTimeout(); 
                childMenu.hideTimeout = Firebug.chrome.window.setTimeout(function(){
                    childMenu.destroy();
                },300);
            }
        }
        
        if(hasClass(target, "fbMenuGroup"))
        {
            this.showChildMenu(target);
        }
    }
});

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

append(Menu,
/**@extend FBL.Menu*/
{
    register: function(object)
    {
        menuMap[object.id] = object;
    },
    
    check: function(element)
    {
        setClass(element, "fbMenuChecked");
        element.setAttribute("checked", "true");
    },
    
    uncheck: function(element)
    {
        removeClass(element, "fbMenuChecked");
        element.setAttribute("checked", "");
    },
    
    disable: function(element)
    {
        setClass(element, "fbMenuDisabled");
    },
    
    enable: function(element)
    {
        removeClass(element, "fbMenuDisabled");
    }
});


//************************************************************************************************
// Status Bar

/**@class*/
function StatusBar(){};

StatusBar.prototype = extend(Controller, {
    
});

// ************************************************************************************************


// ************************************************************************************************
}});