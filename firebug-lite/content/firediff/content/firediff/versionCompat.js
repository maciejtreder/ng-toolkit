/* See license.txt for terms of usage */
var FireDiff  = FireDiff || {};

FBL.ns(function() { with (FBL) {

const HTMLLib = Firebug.HTMLLib || {};

//From Firebug.HTMLLib, Firebug version 1.5
function NodeSearch(text, root, panelNode, ioBox, walker)
{
    root = root.documentElement || root;
    walker = walker || new DOMWalker(root);
    var re = new ReversibleRegExp(text, "m");
    var matchCount = 0;

    /**
     * Finds the first match within the document.
     *
     * @param {boolean} revert true to search backward, false to search forward
     * @param {boolean} caseSensitive true to match exact case, false to ignore case
     * @return true if no more matches were found, but matches were found previously.
     */
    this.find = function(reverse, caseSensitive)
    {
        var match = this.findNextMatch(reverse, caseSensitive);
        if (match)
        {
            this.lastMatch = match;
            ++matchCount;

            var node = match.node;
            var nodeBox = this.openToNode(node, match.isValue);

            this.selectMatched(nodeBox, node, match, reverse);
        }
        else if (matchCount)
            return true;
        else
        {
            this.noMatch = true;
            dispatch([Firebug.A11yModel], 'onHTMLSearchNoMatchFound', [panelNode.ownerPanel, text]);
        }
    };

    /**
     * Resets the search to the beginning of the document.
     */
    this.reset = function()
    {
        delete this.lastMatch;
        delete this.lastRange;
    };

    /**
     * Finds the next match in the document.
     *
     * The return value is an object with the fields
     * - node: Node that contains the match
     * - isValue: true if the match is a match due to the value of the node, false if it is due to the name
     * - match: Regular expression result from the match
     *
     * @param {boolean} revert true to search backward, false to search forward
     * @param {boolean} caseSensitive true to match exact case, false to ignore case
     * @return Match object if found
     */
    this.findNextMatch = function(reverse, caseSensitive)
    {
        var innerMatch = this.findNextInnerMatch(reverse, caseSensitive);
        if (innerMatch)
            return innerMatch;
        else
            this.reset();

        function walkNode() { return reverse ? walker.previousNode() : walker.nextNode(); }

        var node;
        while (node = walkNode())
        {
            if (node.nodeType == Node.TEXT_NODE)
            {
                if (isSourceElement(node.parentNode))
                    continue;
            }

            var m = this.checkNode(node, reverse, caseSensitive);
            if (m)
                return m;
        }
    };

    /**
     * Helper util used to scan the current search result for more results
     * in the same object.
     *
     * @private
     */
    this.findNextInnerMatch = function(reverse, caseSensitive)
    {
        if (this.lastRange)
        {
            var lastMatchNode = this.lastMatch.node;
            var lastReMatch = this.lastMatch.match;
            var m = re.exec(lastReMatch.input, reverse, lastReMatch.caseSensitive, lastReMatch);
            if (m)
            {
                return {
                    node: lastMatchNode,
                    isValue: this.lastMatch.isValue,
                    match: m
                };
            }

            // May need to check the pair for attributes
            if (lastMatchNode.nodeType == Node.ATTRIBUTE_NODE
                    && this.lastMatch.isValue == !!reverse)
            {
                return this.checkNode(lastMatchNode, reverse, caseSensitive, 1);
            }
        }
    };

    /**
     * Checks a given node for a search match.
     *
     * @private
     */
    this.checkNode = function(node, reverse, caseSensitive, firstStep)
    {
        var checkOrder;
        if (node.nodeType != Node.TEXT_NODE)
        {
            var nameCheck = { name: "nodeName", isValue: false, caseSensitive: false };
            var valueCheck = { name: "nodeValue", isValue: true, caseSensitive: caseSensitive };
            checkOrder = reverse ? [ valueCheck, nameCheck ] : [ nameCheck, valueCheck ];
        }
        else
        {
            checkOrder = [{name: "nodeValue", isValue: false, caseSensitive: caseSensitive }];
        }

        for (var i = firstStep || 0; i < checkOrder.length; i++) {
            var m = re.exec(node[checkOrder[i].name], reverse, checkOrder[i].caseSensitive);
            if (m)
                return {
                    node: node,
                    isValue: checkOrder[i].isValue,
                    match: m
                };
        }
    };

    /**
     * Opens the given node in the associated IO Box.
     *
     * @private
     */
    this.openToNode = function(node, isValue)
    {
        if (node.nodeType == Node.ELEMENT_NODE)
        {
            var nodeBox = ioBox.openToObject(node);
            return nodeBox.getElementsByClassName("nodeTag")[0];
        }
        else if (node.nodeType == Node.ATTRIBUTE_NODE)
        {
            var nodeBox = ioBox.openToObject(node.ownerElement);
            if (nodeBox)
            {
                var attrNodeBox = findNodeAttrBox(nodeBox, node.nodeName);
                if (isValue)
                    return getChildByClass(attrNodeBox, "nodeValue");
                else
                    return getChildByClass(attrNodeBox, "nodeName");
            }
        }
        else if (node.nodeType == Node.TEXT_NODE)
        {
            var nodeBox = ioBox.openToObject(node);
            if (nodeBox)
                return nodeBox;
            else
            {
                var nodeBox = ioBox.openToObject(node.parentNode);
                if (hasClass(nodeBox, "textNodeBox"))
                    nodeBox = getTextElementTextBox(nodeBox);
                return nodeBox;
            }
        }
    };

    /**
     * Selects the search results.
     *
     * @private
     */
    this.selectMatched = function(nodeBox, node, match, reverse)
    {
        if (FBTrace.DBG_SEARCH) { FBTrace.sysout("NodeSearch.selectMatched match " + match, nodeBox); }
        setTimeout(bindFixed(function()
        {
            var reMatch = match.match;
            this.selectNodeText(nodeBox, node, reMatch[0], reMatch.index, reverse, reMatch.caseSensitive);
            dispatch([Firebug.A11yModel], 'onHTMLSearchMatchFound', [panelNode.ownerPanel, match]);
        }, this));
    };

    /**
     * Select text node search results.
     *
     * @private
     */
    this.selectNodeText = function(nodeBox, node, text, index, reverse, caseSensitive)
    {
        var row, range;
        if (FBTrace.DBG_SEARCH) { FBTrace.sysout("NodeSearch.selectNodeText text: " + text + " index: " + index, nodeBox); }

        // If we are still inside the same node as the last search, advance the range
        // to the next substring within that node
        if (nodeBox == this.lastNodeBox)
        {
            if (FBTrace.DBG_SEARCH) { FBTrace.sysout("NodeSearc.selectNodeText lastRange", this.lastRange); }

            row = this.lastRow = this.textSearch.findNext(false, undefined, reverse, caseSensitive);

        }

        if (!row)
        {
            // Search for the first instance of the string inside the node
            function findRow(node) { return node.nodeType == Node.ELEMENT_NODE ? node : node.parentNode; }
            this.textSearch = new TextSearch(nodeBox, findRow);
            row = this.lastRow = this.textSearch.find(text, reverse, caseSensitive);
            this.lastNodeBox = nodeBox;
        }

        if (row)
        {
            range = this.lastRange = this.textSearch.range;

            var sel = panelNode.ownerDocument.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            scrollIntoCenterView(row, panelNode);
            return true;
        }
    };
}

//From Firebug.HTMLLib, Firebug version 1.5
function findNodeAttrBox(objectNodeBox, attrName)
{
    var child = objectNodeBox.firstChild.lastChild.firstChild;
    for (; child; child = child.nextSibling)
    {
        if (hasClass(child, "nodeAttr") && child.childNodes[1].firstChild
            && child.childNodes[1].firstChild.nodeValue == attrName)
        {
            return child;
        }
    }
}

//From Firebug.HTMLLib, Firebug version 1.5
function getTextElementTextBox(nodeBox)
{
    var nodeLabelBox = nodeBox.firstChild.lastChild;
    return getChildByClass(nodeLabelBox, "nodeText");
}

//From Firebug.HTMLLib, Firebug version 1.5
function isWhitespaceText(node) {
    if (node instanceof HTMLAppletElement)
        return false;
    return node.nodeType == 3 && isWhitespace(node.nodeValue);
}

//From Firebug.HTMLLib, Firebug version 1.5
function isSourceElement(element) {
  var tag = element.localName.toLowerCase();
  return tag == "script" || tag == "link" || tag == "style"
      || (tag == "link" && element.getAttribute("rel") == "stylesheet");
}

/**
 * Defines lib routes that are supported in one version of Firebug but not
 * another. Methods defined in here should be pruned as the minimum Firebug
 * version is updated.
 */
FireDiff.VersionCompat = {
    /**
     * @see Firebug.HTMLLib.NodeSearch
     * @version Firebug 1.5
     */
    NodeSearch: HTMLLib.NodeSearch || NodeSearch,

    /**
     * @see Firebug.HTMLLib.isWhitespaceText
     * @version Firebug 1.5
     */
    isWhitespaceText: HTMLLib.isWhitespaceText || isWhitespaceText,
    
    /**
     * @see Firebug.HTMLLib.isSourceElement
     * @version Firebug 1.5
     */
    isSourceElement: HTMLLib.isSourceElement || isSourceElement
};

}});