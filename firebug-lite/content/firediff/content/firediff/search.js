/* See license.txt for terms of usage */
var FireDiff  = FireDiff || {};

/**
 * Classes used to iterate over DOM content and search Firediff pages.
 */
FireDiff.search = FBL.ns(function() { with (FBL) {

const Events = FireDiff.events,
      VersionCompat = FireDiff.VersionCompat,
      DiffDomplate = FireDiff.domplate,
      Search = this;

/**
 * @class Search for use in pages where all content is available and visible at all times.
 */
this.PageSearch = function() {
  var currentSearch;

  /**
   * Execute the search
   *
   * @param {String} text Search text
   * @param {boolean} reverse true to perform a reverse search
   * @param {Element} panel Panel to search
   */
  this.search = function(text, reverse, panel) {
    var panelNode = panel.panelNode;
    if (!text) {
      currentSearch = undefined;
      return false;
    }

    var row;
    if (currentSearch && text == currentSearch.text) {
      row = currentSearch.findNext(true, false, reverse, Firebug.searchCaseSensitive);
    } else {
      function findRow(node) { return node.nodeType == 1 ? node : node.parentNode; }
      currentSearch = new TextSearch(panelNode, findRow);
      row = currentSearch.find(text, reverse, Firebug.searchCaseSensitive);
    }

    // TODO : What a11y events should this produce?
    if (row) {
      panel.document.defaultView.getSelection().selectAllChildren(row);
      scrollIntoCenterView(row, panelNode);
      return true;
    } else {
      return false;
    }
  };
};

/**
 * Constructs a NodeSearch instance.
 *
 * @class Class used to search a DOM tree for the given text. Will display
 *        the search results in a IO Box.
 *
 * @constructor
 * @param {String} text Text to search for
 * @param {Object} root Root of search. This may be an element or a document
 * @param {Object} panelNode Panel node containing the IO Box representing the DOM tree.
 * @param {Object} ioBox IO Box to display the search results in
 */
this.DOMDiffNodeSearch = function(text, root, panelNode, ioBox) {
  VersionCompat.NodeSearch.call(
      this, text, root, panelNode, ioBox, new Search.DOMDiffWalker(root));
  var re = new ReversibleRegExp(text, "m");

  /**
   * Checks a given node for a search match.
   *
   * @private
   */
  this.checkNode = function(node, reverse, caseSensitive, firstStep) {
    var originalNode = node;
    node = node.clone || node;

    var checkOrder, checkValues = [];
    if (originalNode.attrNode) {
      originalNode = node.attrNode;

      var diff = DiffDomplate.DomUtil.diffAttr(node);
      diff = diff.reduce(function(prev, current) { return prev + current.value; }, "");

      var nameCheck = { value: originalNode.nodeName, isValue: false, caseSensitive: false };
      var valueCheck = { value: diff, isValue: true, caseSensitive: caseSensitive };
      checkOrder = reverse ? [ valueCheck, nameCheck ] : [ nameCheck, valueCheck ];
    } else if (originalNode.subType == "char_data_modified") {
      var diff = DiffDomplate.DomUtil.diffText(originalNode);
      diff = diff.reduce(function(prev, current) { return prev + current.value; }, "");

      checkOrder = [{value: diff, isValue: false, caseSensitive: caseSensitive }];
    } else if (node.nodeType != Node.TEXT_NODE) {
      var nameCheck = { value: node.nodeName, isValue: false, caseSensitive: false };
      var valueCheck = { value: node.nodeValue, isValue: true, caseSensitive: caseSensitive };
      checkOrder = reverse ? [ valueCheck, nameCheck ] : [ nameCheck, valueCheck ];
    } else {
      checkOrder = [{value: node.nodeValue, isValue: false, caseSensitive: caseSensitive }];
    }

    for (var i = firstStep || 0; i < checkOrder.length; i++) {
      var m = re.exec(checkOrder[i].value, reverse, checkOrder[i].caseSensitive);
      if (m) {
        return {
            node: originalNode,
            isValue: checkOrder[i].isValue,
            match: m
        };
      }
    }
  };

  var super_openToNode = this.openToNode;
  this.openToNode = function(node, isValue) {
    var ret = super_openToNode.call(this, node, isValue);
    if (!ret) {
      // Fail over to the node if it's not supported by the base impl
      ret = ioBox.openToObject(node);
    }
    return ret;
  };
};

/**
 * Constructs a DOMDiffWalker instance.
 *
 * @constructor
 * @class Implements an ordered traveral of the document, including diff events,
 *        attributes and iframe contents within the results.
 *
 *        Note that the order for attributes is not defined. This will follow the
 *        same order as the Element.attributes accessor.
 * @param {Element} root Element to traverse
 */
this.DOMDiffWalker = function(root) {
  var stack = [];
  var pastStart, pastEnd;

  function pushStack(currentNode, reverse) {
    if (currentNode) {
      var attrs = Search.getAttributes(currentNode),
          children = [];

      // Precache the child elements to make the logic easier. If this becomes
      // a performance issue then this can be revisited using an inline selection
      // algorithm
      try {
        var baseIter;
        var removeIter = new Search.RemovedIterator(
            new Search.DOMIterator(currentNode.clone || currentNode),
            currentNode[Events.AnnotateAttrs.REMOVE_CHANGES]);
        while (1) {
          children.push(removeIter.next());
        }
      } catch (err) {
        /* NOP */
      }

      stack.unshift({
        node: currentNode,
        attrs: attrs,
        attrIndex: reverse ? attrs.length-1 : -1,
        children: children,
        childIndex: reverse ? children.length-1 : -1
      });
      return stack[0];
    }
  }

  function pushDescendents(el) {
    while (el) {
      pushStack(el, true);
      if (((el.nodeName || "").toUpperCase() == "IFRAME")) {
        el = el.contentDocument.documentElement;
      } else {
        el = stack[0].children[stack[0].children.length-1];
      }
    }
  }

  /**
   * Move to the next node.
   *
   * @return The next node if one exists, otherwise undefined.
   */
  this.nextNode = function() {
    if (pastEnd) {
      return undefined;
    }

    if (!stack.length) {
      // We are working with a new tree walker
      pushStack(root);
    } else {
      var stackEl = stack[0];

      // First check attributes
      if (stackEl.attrIndex < stackEl.attrs.length-1) {
        stackEl.attrIndex++;
      } else if ((stackEl.node.nodeName || "").toUpperCase() == "IFRAME"
          && stackEl.node.contentDocument) {
        // Attributes have completed, check for iframe contents
        pushStack(stackEl.node.contentDocument.documentElement);
      } else {
        while (stack.length) {
          stackEl = stack[0];
          stackEl.childIndex++;
          if (stackEl.childIndex < stackEl.children.length) {
            pushStack(stackEl.children[stackEl.childIndex]);
            break;
          } else {
            // The end, pop
            stack.shift();
          }
        }
      }
    }

    if (!stack.length) {
      pastEnd = true;
    } else {
      pastStart = false;
    }

    return this.currentNode();
  };

  /**
   * Move to the previous node.
   *
   * @return The previous node if one exists, undefined otherwise.
   */
  this.previousNode = function() {
    if (pastStart) {
      return undefined;
    }

    var stackEl = stack[0];
    if (!stackEl) {
      // Generate the stack up to the last element
      pushDescendents(root);
    } else if (stackEl.childIndex >= 0) {
      stackEl.childIndex--;
      pushDescendents(stackEl.children[stackEl.childIndex]);
    } else if (stackEl.attrIndex >= 0) {
      stackEl.attrIndex--;
    } else {
      stack.shift();
      stackEl = stack[0];
      if (stackEl && stackEl.childIndex >= 0) {
        stackEl.childIndex--;
        pushDescendents(stackEl.children[stackEl.childIndex]);
      }
    }

    if (!stack.length) {
      pastStart = true;
    } else {
      pastEnd = false;
    }

    return this.currentNode();
  };

  /**
   * Retrieves the current node.
   *
   * @return The current node, if not past the beginning or end of the iteration.
   */
  this.currentNode = function() {
    var stackEl = stack[0];
    if (stackEl) {
      if (stackEl.attrIndex >= 0) {
        return stackEl.attrs[stackEl.attrIndex];
      } else {
        return stackEl.node;
      }
    }
  };

  /**
   * Resets the walker position back to the initial position.
   */
  this.reset = function() {
    pastStart = false;
    pastEnd = false;
    stack = [];
  };

  this.reset();
};

/**
 * @class Iterates over the contents of an array
 */
this.ArrayIterator = function(array) {
  var index = -1;

  /**
   * Retrieves the next element in the iteration.
   */
  this.next = function() {
    if (++index >= array.length)    $break();
    return array[index];
  };
};

/**
 * @class Iterates over the children of a given node.
 */
this.DOMIterator = function(node) {
  var curNode = node.firstChild;

  /**
   * Retrieves the next element in the iteration.
   */
  this.next = function() {
    var ret = curNode;

    curNode = curNode.nextSibling;
    while (curNode && Firebug.DiffModule.ignoreNode(curNode)) {
      curNode = curNode.nextSibling;
    }

    if (!ret)  $break();
    return ret;
  }
}

/**
 * @class Iterates over a child iterator and a set of removed events, merging
 *        the remove events at the proper location in the iteration.
 */
this.RemovedIterator = function(content, removed, includeFilter) {
  removed = removed || [];

  var nodeIndex = 1, removedIndex = 0,
      lastId;

  /**
   * Retrieves the next element in the iteration.
   */
  this.next = function() {
    // Check for removed at the current position
    while (true) {
      while (removedIndex < removed.length) {
        var curChange = removed[removedIndex];
        lastId = lastId || FireDiff.Path.getIdentifier(curChange.xpath);
        if (lastId.index <= nodeIndex || nodeIndex < 0) {
          removedIndex++;   lastId = undefined;
          if (!includeFilter || includeFilter(curChange)) {
            return curChange;
          }
        } else {
          break;
        }
      }

      // Read the content list
      nodeIndex++;
      if (content) {
        try {
          var ret = content.next();
          if (ret && (!includeFilter || includeFilter(ret))) {
            if (ret.nodeType == Node.TEXT_NODE && ret[Events.AnnotateAttrs.CHANGES]) {
              return ret[Events.AnnotateAttrs.CHANGES];
            } else {
              return ret;
            }
          }
        } catch (err) {
          // Assume this is StopIteration
          content = undefined;
        }
      } else if (removedIndex >= removed.length) {
        // Content and removed exhausted
        $break();
      }
    }
  };
};

/**
 * Retrieves all attributes for a given change or element. This includes all
 * changes and existing attributes.
 */
this.getAttributes = function(change) {
  var attrs = [], attrSeen = {};
  var idAttr, classAttr, changeAttr;
  var el = change.clone || change;

  var changes = el[Events.AnnotateAttrs.ATTR_CHANGES] || {};
  if (change.clone && change.attrName) {
    changes = {};
    changes[change.attrName] = change;
  }

  if (el.attributes) {
    for (var i = 0; i < el.attributes.length; ++i) {
      var attr = el.attributes[i];
      if (attr.localName.indexOf("firebug-") != -1)
         continue;

      // We need to include the change object as domplate does not have an easy way
      // to pass multiple arguments to a processing method
      var curChange = changes[attr.localName];
      if (curChange) {
          changeAttr = {
              localName: attr.localName,
              nodeValue: attr.nodeValue,
              attrNode: attr,
              change: curChange
          };
          attr = changeAttr;
      }

      attrSeen[attr.localName] = true;
      if (attr.localName == "id") {
        idAttr = attr;
      }
      else if (attr.localName == "class") {
       classAttr = attr;
      }
      else {
        attrs.push(attr);
      }
    }
  }
  if (classAttr) {
    attrs.splice(0, 0, classAttr);
  }
  if (idAttr) {
    attrs.splice(0, 0, idAttr);
  }

  // Handle any removed attributes
  for (var i in changes) {
    if (changes.hasOwnProperty(i) && !attrSeen.hasOwnProperty(i)) {
      attrs.push({
          localName: i,
          nodeValue: changes[i].previousValue,
          change: changes[i]
      });
    }
  }

  return attrs;
};

}});