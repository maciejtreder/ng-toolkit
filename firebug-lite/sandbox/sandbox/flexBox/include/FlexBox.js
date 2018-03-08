/* See license.txt for terms of usage */

define(["BrowserDetection", "Measure"], function(BrowserDetection, Measure){

// ************************************************************************************************

/*
  xxxpedro notes:
  
    - flexBox dependencies
        - className
        - event (onresize, onunload)
        - BrowserDetection
        - lazyExecution
        - Measure
            - BrowserDetection
        
    - move to chrome/context?
        - lazy
        - event
        - cache?
    
    
    - scrolling
        - getPosition - relative to what?
        - scrolling in-browser iframe Chrome different computation than Splitter

*/

// ************************************************************************************************

// turning debugging on makes CSS3-flexBox-supported browsers to use FlexBox class to resize
// the elements via JavaScript instead of CSS, allowing the FlexBox functions to be debugabe
var debug = false;

// setting debugSplitterFrame to true will make the SplitterFrame element to be visible
// (the invisible element used to cover the whole UI when dragging the splitter in 
// order to capture mouse events)
var debugSplitterFrame = false;

//************************************************************************************************

// debug can also be enabled via URL hash like #debug or #iframe,debug
debug = debug === true ? true : /\bdebug\b/.test(document.location.hash);

//************************************************************************************************

// FIXME: xxxpedro: better browser detection? always use flexBox?
var supportsFlexBox = !document.all && !window.opera;
var isIE6 = BrowserDetection.IE6;

// ************************************************************************************************
// FlexBox Class constructor

function FlexBox(root, listenWindowResize)
{
    var win = root.contentWindow || window;

    this.measure = new Measure(win);

    this.boxObjects = [];

    this.root = root;

    initializeSplitters(this);

    if (supportsFlexBox && !debug)
    {
        this.reflow();
        return;
    }

    setClass(root, "boxFix");

    var self = this;

    this.render = function()
    {
        renderBoxes(this);
    };

    var resizeHandler = this.resizeHandler = isIE6 ?
            // IE6 requires an special resizeHandler to make the rendering smoother
            lazyExecution(self.render, self) :
            // Other browsers can handle
            (function(){ self.render(); });

    if (listenWindowResize)
    {
        var onunload = function()
        {
            removeEvent(win, "resize", resizeHandler);
            removeEvent(win, "unload", onunload);

            self.destroy();
        };

        addEvent(win, "resize", resizeHandler);
        addEvent(win, "unload", onunload);
    }

    self.invalidate();

    if (isIE6)
    {
        fixIE6BackgroundImageCache();
        setTimeout(function delayedFlexBoxReflow(){
            self.invalidate();
        }, 50);
    }
}

//************************************************************************************************
//FlexBox Class members

FlexBox.prototype.boxObjects = null;

FlexBox.prototype.reflow = function()
{
    var root = this.root;

    var object =
    {
        element : root,
        flex : null,
        extra : {}
    };

    this.boxObjects = [ object ];

    reflowBoxes(this);
};

FlexBox.prototype.render = function()
{

};

FlexBox.prototype.invalidate = function()
{
    this.reflow();
    this.render();
};

FlexBox.prototype.resizeHandler = function()
{
};

FlexBox.prototype.destroy = function()
{
    function cleanObject(object)
    {
        delete object.element;
        delete object.extra;
        delete object.orientation;
        delete object.children;
        delete object.layout;
    }
    
    this.root = null;

    var boxObjects = this.boxObjects;
    var boxObject;

    while (boxObject = boxObjects.pop())
    {
        var childBoxObject;
        var children = boxObject.children;
        
        while (childBoxObject = children.pop())
        {
            cleanObject(childBoxObject);
            childBoxObject = null;
        }
        
        cleanObject(boxObject);
        boxObject = null;
        children = null;
    }

    this.boxObjects = null;
};

//************************************************************************************************
// FlexBox helpers

FlexBox.prototype.getBoxOrientation = function(element)
{
    var orient = (element.className.match(/\b(v|h)box\b/) || [ 0, 0 ])[1];

    var type = orient == "v" ? "vertical" : orient == "h" ? "horizontal" : null;

    var orientation = null;

    if (type == "vertical")
    {
        orientation =
        {
            isVertical: true,
            dimension: "height",
            offset: "offsetHeight",
            before: "top",
            after: "bottom",
            mousePosition: "clientY"
        };
    }
    else if (type == "horizontal")
    {
        orientation =
        {
            isHorizontal: true,
            dimension: "width",
            offset: "offsetWidth",
            before: "left",
            after: "right",
            mousePosition: "clientX"
        };
    }

    return orientation;
};

FlexBox.prototype.getBoxObject = function(element)
{
    var boxObject;
    var boxObjects = this.boxObjects;
    
    for (var i = 0; boxObject = boxObjects[i]; i++)
    {
        if (boxObject.element == element)
            return boxObject;
    }

    return null;
};

FlexBox.prototype.getParentBoxObject = function(element)
{
    do
    {
        element = element.parentNode;
    }
    while (element && element.nodeType == 1 && !this.getBoxOrientation(element));
    
    return this.getBoxObject(element);
};

FlexBox.prototype.getChildObject = function(element, boxObject)
{
    var childObject;
    var boxObjectFound = false;
    
    if (this.getBoxOrientation(element))
    {
        return this.getBoxObject(element);
    }
    
    if (!boxObject)
    {
        boxObject = this.getBoxObject(element, true);
    }
    
    if (!boxObject) return null;

    for (var i = 0, children = boxObject.children; childObject = children[i]; i++)
    {
        if (childObject.element == element)
        {
            boxObjectFound = true;
            break;
        }
    }
    
    return boxObjectFound ? childObject : null;
};

//************************************************************************************************
// Splitter

var splitters = [];

function initializeSplitters(flexBox)
{
    var doc = flexBox.root.ownerDocument;
    var elements = flexBox.root.getElementsByTagName("div");
    var element;

    for (var i = 0, l = elements.length; i < l; i++)
    {
        element = elements[i];
        if (hasClass(element, "fbSplitter"))
        {
            var targetId = element.getAttribute("data-target");
            var spacerId = element.getAttribute("data-spacer");

            var target = doc.getElementById(targetId);
            var spacer = doc.getElementById(spacerId);

            splitters.push(new Splitter(flexBox, element, target, spacer));
        }
    }
}

function Splitter(flexBox, splitter, target, spacer)
{
    this.flexBox = flexBox;

    this.splitter = splitter;
    this.target = target;
    this.spacer = spacer;

    this.document = splitter.ownerDocument;
    this.window = this.document.parentWindow || this.document.defaultView;

    this.splitterFrame = this.document.createElement("div");
    this.splitterFrame.className = "splitterFrame";

    var self = this;

    splitter.onmousedown = function(event)
    {
        self.onSplitterMouseDown(event);
    };
};

Splitter.prototype.onSplitterMouseDown = function(e)
{
    cancelEvent(e, true);

    var flexBox = this.flexBox;
    var splitterFrame = this.splitterFrame;

    var root = flexBox.root;
    var measure = flexBox.measure;

    var winSize = measure.getWindowSize();
    var target = this.target;
    var self = this;
    
    var orientation = flexBox.getParentBoxObject(target).orientation;
    var halfSplitterSize = Math.floor(this.splitter[orientation.offset]/2);

    openSplitterFrame(this, orientation);

    this.splitterFrame.onmousemove = function(event)
    {
        event = window.event || event;
        cancelEvent(event, true);

        var boxObject = flexBox.getParentBoxObject(target);
        var orientation = boxObject.orientation;
        
        var fixedSpace = boxObject.layout.fixedSpace;
        var targetSize = target[orientation.offset];
        var maxSize = boxObject.element[orientation.offset] + targetSize - fixedSpace;
        
        var mousePosition = event[orientation.mousePosition];

        var targetPosition = flexBox.measure.getElementPosition(target);
        var positionDiff = mousePosition - targetPosition[orientation.before] + halfSplitterSize;
        
        var size = targetSize - positionDiff;
        size = Math.min(maxSize, size);
        size = Math.max(0, size);
        target.style[orientation.dimension] = size + "px";

        if (isIE6)
        {
            var className = target.className;
            target.className = className + " boxFixIgnoreContents";
            flexBox.invalidate();
            target.className = className;
        }
        else
            flexBox.invalidate();
    };

    this.splitterFrame.onmouseup = function(event)
    {
        event = window.event || event;
        cancelEvent(event, true);

        // IE9 need this timeout otherwise the mouse cursor image will freeze 
        // until the document is clicked again
        setTimeout(function(){
            try
            {
                self.splitter.focus();
            }
            catch (E) {}
            
            closeSplitterFrame(self);
        },0);
    };
};

function openSplitterFrame(splitter, orientation)
{
    var flexBox = splitter.flexBox;
    var root = flexBox.root;
    var splitterFrame = splitter.splitterFrame;
    
    var box = flexBox.measure.getElementBox(root);
    for (var prop in box)
    {
        splitterFrame.style[prop] = box[prop] + "px";
    }

    if (debugSplitterFrame)
    {
        splitterFrame.style.background = "#def";
        splitterFrame.style.opacity = 0.5;
        
        if (isIE6)
            splitterFrame.style.filter = "alpha(opacity=50)";
    }

    splitterFrame.style.cursor = orientation.isVertical ? "n-resize" : "e-resize";

    root.parentNode.insertBefore(splitterFrame, root);
}

function closeSplitterFrame(splitter)
{
    var root = splitter.flexBox.root;
    var splitterFrame = splitter.splitterFrame;

    splitterFrame.style.cursor = "inherit";

    root.parentNode.removeChild(splitterFrame);
}

//************************************************************************************************
// lazy execution

function lazyExecution(_function, _this, _arguments)
{
    var executionTimer;
    var lastExecution = 0;
    var thisObject = _this ? _this : _function.prototype ? _function.prototype : _function;
    
    _arguments = _arguments || [];

    return function()
    {
        if (new Date().getTime() - lastExecution > 50)
        {
            if (executionTimer)
            {
                clearTimeout(executionTimer);
                executionTimer = null;
            }

            _function.apply(thisObject, _arguments);

            lastExecution = new Date().getTime();
        }
        else
        {
            if (executionTimer)
            {
                clearTimeout(executionTimer);
                executionTimer = null;
            }

            executionTimer = setTimeout(function delayedExecution()
            {
                _function.apply(thisObject, _arguments);
            }, 50);
        }
    };
}

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function reflowBoxes(flexBox)
{
    var boxObject;
    var childBoxObject;
    var childElement;

    var flex;
    var space;
    var boxSpace;
    var extraSpace;
    var padding;
    var border;

    var match;

    var measure = flexBox.measure;
    var boxObjects = flexBox.boxObjects;

    for (var index = 0; boxObject = boxObjects[index]; index++)
    {
        var parentElement = boxObject.element;

        var orientation = flexBox.getBoxOrientation(parentElement);
        if (!orientation)
            continue;

        var children = [];
        var layout = {};

        var flexSum = 0;
        var fixedSpace = 0;
        var minimumSpace = 0;

        for (var i = 0, childs = parentElement.childNodes, length = childs.length; i < length; i++)
        {
            childElement = childs[i];

            // ignore non-element nodes
            if (childElement.nodeType != 1)
                continue;

            padding = measure.getMeasureBox(childElement, "padding");
            border = measure.getMeasureBox(childElement, "border");

            extraSpace = padding[orientation.before] + padding[orientation.after] + 
                    border[orientation.before] + border[orientation.after];

            if (match = /\bboxFlex(\d?)\b/.exec(childElement.className))
            {
                flex = match[1] - 0 || 1;
                space = null;

                flexSum += flex;
                minimumSpace += extraSpace;
            }
            else
            {
                boxSpace = childElement[orientation.offset];

                space = boxSpace - extraSpace;
                space = Math.max(space, 0);

                flex = null;

                fixedSpace += boxSpace;
                minimumSpace += boxSpace;
            }

            childBoxObject =
            {
                element : childElement,
                flex : flex,
                extra : {},
                layout : layout
            };

            childBoxObject[orientation.dimension] = space;
            childBoxObject.extra[orientation.dimension] = extraSpace;

            children.push(childBoxObject);

            // if it is a box, then we need to layout it
            if (flexBox.getBoxOrientation(childElement))
            {
                boxObjects.push(childBoxObject);
            }
        }

        layout.flexSum = flexSum;
        layout.minimumSpace = minimumSpace;
        layout.fixedSpace = fixedSpace;

        boxObject.orientation = orientation;
        boxObject.children = children;
        boxObject.layout = layout;
    }
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function renderBoxes(flexBox)
{
    var boxObject;
    var childBoxObject;
    var childElement;
    
    var flex;
    var space;
    var boxSpace;
    var extraSpace;
    var padding;
    var border;

    var totalSpace;
    var freeSpace;

    var _isIE6 = isIE6;
    var measure = flexBox.measure;
    var boxObjects = flexBox.boxObjects;

    // render each box, followed by its children
    for (var index = 0; boxObject = boxObjects[index]; index++)
    {
        var computedSpace = 0;
        var remainingPixels = 0;

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // restore data from the boxObjects cache

        var parentElement = boxObject.element;
        var children = boxObject.children;
        var orientation = flexBox.getBoxOrientation(parentElement);
        
        var flexSum = boxObject.layout.flexSum;
        var fixedSpace = boxObject.layout.fixedSpace;
        var minimumSpace = boxObject.layout.minimumSpace;

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // calculating the total space

        extraSpace = boxObject.extra[orientation.dimension];
        if (!extraSpace)
        {
            padding = measure.getMeasureBox(parentElement, "padding");
            border = measure.getMeasureBox(parentElement, "border");

            extraSpace = padding[orientation.before] + padding[orientation.after] + 
                    border[orientation.before] + border[orientation.after];
        }

        // We are setting the height of horizontal boxes in IE6, so we need to 
        // temporary hide the elements otherwise we will get the wrong measures
        if (_isIE6)
        {
            var className = parentElement.className;
            parentElement.className = className + " boxFixIgnoreContents";
            space = parentElement[orientation.offset];
            parentElement.className = className;
        }
        else
        {
            space = parentElement[orientation.offset];
        }

        totalSpace = space - extraSpace;

        freeSpace = totalSpace - fixedSpace;

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // processing box children

        for (var i = 0, length = children.length; i < length; i++)
        {
            childBoxObject = children[i];

            childElement = childBoxObject.element;
            flex = childBoxObject.flex;
            extraSpace = childBoxObject.extra[orientation.dimension];

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // calculating child size

            // if it is a flexible child, then we need to calculate its space
            if (flex)
            {
                // calculate the base flexible space
                space = Math.floor(freeSpace * flex / flexSum);
                space -= extraSpace;
                space = Math.max(space, 0);

                // calculate the remaining pixels
                remainingPixels = freeSpace * flex % flexSum;

                // distribute remaining pixels
                if (remainingPixels > 0 && computedSpace + space + remainingPixels <= totalSpace)
                {
                    // distribute a proportion of the remaining pixels, or a minimum of 1 pixel
                    space += Math.floor(remainingPixels * flex / flexSum) || 1;
                }

                // save the value
                childBoxObject[orientation.dimension] = space;
            }
            // if it is not a flexible child, then we already have its dimension calculated
            else
            {
                // use the value calculated at the last reflow() operation
                space = childBoxObject[orientation.dimension];
            }

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // resizing child if necessary

            if (orientation.isHorizontal || flex)
            {
                if (orientation.isVertical)
                {
                    // if it's a child of a vertical box, then we only need to adjust the height...
                    childElement.style.height = space + "px";

                    // unless...

                    // xxxpedro 100% width of an iframe with border will exceed the width of 
                    // its offsetParent... don't ask me why. not sure though if this 
                    // is the best way to solve it
                    if (childElement.nodeName.toLowerCase() == "iframe")
                    {
                        border = measure.getMeasureBox(childElement, "border");

                        // in IE6 we need to hide the iframe in order to get the correct 
                        // width of its parentNode
                        if (_isIE6)
                        {
                            childElement.style.display = "none";
                            boxSpace = childElement.parentNode.offsetWidth;
                            childElement.style.display = "block";
                        }
                        else
                        {
                            boxSpace = childElement.parentNode.offsetWidth;
                        }

                        // remove the border space
                        childElement.style.width = 
                                Math.max(0, boxSpace - border.left - border.right) + "px";
                    }
                }
                else
                {
                    setClass(childElement, "boxFixPos");

                    childElement.style.left = computedSpace + "px";
                    childElement.style.width = space + "px";

                    // boxObject.height IE6 only
                    if (_isIE6)
                    {
                        // TODO: figure out how to solve the problem with minimumSpace
                        childBoxObject.height = boxObject.height || parentElement.offsetHeight;
                        childElement.style.height = childBoxObject.height + "px";
                    }
                }
            }

            // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
            // update the computed space sum

            computedSpace += space;
        }

        // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        // Ensuring minimum space

        if (parentElement != flexBox.root && orientation.isVertical)
        {
            // TODO: check for "deeper" parents
            // here we are enforcing that the parent box dimension (height or width) 
            // won't be smaller than the minimum space required, which is the sum 
            // of fixed dimension child boxes
            parentElement.parentNode.style[orientation.dimension] = 
                    Math.max(parentElement.parentNode[orientation.offset], minimumSpace) + "px";
        }
    }

}

//* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

// ************************************************************************************************
// helper functions

function hasClass(node, name)
{
    return (' ' + node.className + ' ').indexOf(' ' + name + ' ') != -1;
}

function setClass(node, name)
{
    if (node && (' ' + node.className + ' ').indexOf(' ' + name + ' ') == -1)
        node.className += " " + name;
}

function addEvent(object, name, handler, useCapture)
{
    if (object.addEventListener)
        object.addEventListener(name, handler, useCapture);
    else
        object.attachEvent("on" + name, handler);
}

function removeEvent(object, name, handler, useCapture)
{
    if (object.removeEventListener)
        object.removeEventListener(name, handler, useCapture);
    else
        object.detachEvent("on" + name, handler);
}

function cancelEvent(e, preventDefault)
{
    if (!e)
        return;

    if (preventDefault)
    {
        if (e.preventDefault)
            e.preventDefault();
        else
            e.returnValue = false;
    }

    if (e.stopPropagation)
        e.stopPropagation();
    else
        e.cancelBubble = true;
}

// ************************************************************************************************
// IE6 background glitch fix
// http://www.mister-pixel.com/#Content__state=is_that_simple

var fixIE6BackgroundImageCache = function(doc)
{
    doc = doc || document;
    try
    {
        doc.execCommand("BackgroundImageCache", false, true);
    }
    catch (E)
    {
    }
};

// ************************************************************************************************

return FlexBox;

// ************************************************************************************************
});