/* See license.txt for terms of usage */
var FireDiff = FireDiff || {};

FBL.ns(function() { with (FBL) {
var Path = {};
FireDiff.Path = Path;

const PATH_COMPONENT = /\/?([^\/\[\]]*(?:\[(?:\d+|@.+?='.*?')\]))/g;

function getSheetId(sheet) {
  if (sheet.href) {
    return "@href='" + sheet.href + "'";
  }
  if (sheet.ownerNode && sheet.ownerNode.id) {
    return "@id='" + sheet.ownerNode.id + "'"
  }
  return getSheetIndex(sheet);
}
function getSheetIndex(sheet) {
  if (!sheet || !sheet.ownerNode)     return;
  var styleSheets = sheet.ownerNode.ownerDocument.styleSheets;
  for (var i = 0; i < styleSheets.length; i++) {
    if (styleSheets[i] == sheet) {
      return i+1;
    }
  }
}
function getRuleIndex(style, parent) {
  if (!style)     return;
  for (var i = 0; i < parent.cssRules.length; i++) {
    if (parent.cssRules[i] == style
        || parent.cssRules[i].styleSheet == style) {
      return i+1;
    }
  }
}
var styleLookups = {
  "style()" : function(current, index) {
    var fieldLookup = /@(.*?)='(.*?)'/;
    var match = fieldLookup.exec(index);
    if (match) {
      function checkSheet(sheet) {
        if (sheet[match[1]] == match[2]
            || (sheet.ownerNode && sheet.ownerNode[match[1]] == match[2])) {
          return sheet;
        }
        for (var i = 0; i < sheet.cssRules.length; i++) {
          if (sheet.cssRules[i] instanceof CSSImportRule) {
            var ret = checkSheet(sheet.cssRules[i].styleSheet);
            if (ret) {
              return ret;
            }
          }
        }
      }
      for (var i = current.styleSheets.length; i > 0; i--) {
        var ret = checkSheet(current.styleSheets[i-1]);
        if (ret) {
          return ret;
        }
      }
    } else {
      return current.styleSheets[index-1];
    }
  },
  "rule()" : function(current, index) {
    return current.cssRules[index-1];
  }
};

function extractComponents(path) {
  var ret = path.indexOf("/") === 0 ? [""] : [],
      match;
  while ((match = PATH_COMPONENT.exec(path))) {
    ret.push(match[1]);
  }
  return ret;
}

function updateForMutate(pathUpdate, pathChanged, offset, destroyAncestor) {
  var components = Path.getRelativeComponents(pathUpdate, pathChanged);
  var changeParent = Path.getParentPath(pathChanged);
  
  if (destroyAncestor && components.common == pathChanged) {
    // Path to update is the same or child of the one being removed
    return undefined;
  } else if (components.common == pathChanged) {
    // Parent or identity case
    return components.common.replace(
            /([^\/]+?)\[(\d+)\]$/,
            function(total, tag, index) {
              return tag + "[" + (parseInt(index)+offset) + "]";
            })
        + (components.left ? "/" : "")
        + components.left;
  } else if (components.left && components.common == changeParent) {
    // The removed path was the child of the common path element.
    // If the modified element was of the same type as our ancestor
    // at this level, then we will need to update our path
    var pathExtract = /^([^\/]+?)\[(\d+|@.+?='.*?')\]/;
    var ancestor = pathExtract.exec(components.left);
    var changed = pathExtract.exec(components.right);

    if (ancestor[1] == changed[1]
        && parseInt(ancestor[2]) > parseInt(changed[2])) {
      return components.common
          + (components.common != "/" ? "/" : "")
          + components.left.replace(
              pathExtract,
              function(total, tag, index) {
                return tag + "[" + (parseInt(index)+offset) + "]";
              })
    }
  }
  
  // No effect on the path
  return pathUpdate;
};

/**
 * Updates pathUpdate as if pathInserted was just inserted into the
 * document.
 */
FireDiff.Path.updateForInsert = function(pathUpdate, pathInsert) {
  return updateForMutate(pathUpdate, pathInsert, 1, false);
};

/**
 * Updates pathUpdate as if pathRemoved was just removed from the
 * document.
 */
FireDiff.Path.updateForRemove = function(pathUpdate, pathRemoved) {
  return updateForMutate(pathUpdate, pathRemoved, -1, true);
};

/**
 * Updates pathUpdate as if pathRemoved was just removed from the
 * document due to a revert.
 */
FireDiff.Path.updateForRevertRemove = function(pathUpdate, pathRemoved) {
  return updateForMutate(pathUpdate, pathRemoved, -1, false);
};

FireDiff.Path.getIdentifier = function(path) {
  var match = path.match(/^.*\/([^/\[\]]+?)(?:\[(\d+|@.+?='.*?')\])?$/);
  if (match) {
    var index = parseInt(match[2]);
    return { tag: match[1], index: isNaN(index) ? match[2] : index };
  }
};
FireDiff.Path.getParentPath = function(path) {
  return (path.match(/^(.+)\/([^\/\[\]]+?)(?:\[(\d+|@.+?='.*?')\])?$/) || ["", "/"])[1];
};
FireDiff.Path.getTopPath = function(path) {
  return (path.match(/^\/?[^\/\[\]]*(?:\[(?:\d+|@.+?='.*?')\])?/) || ["", ""])[0];
};
FireDiff.Path.isNextSibling = function(first, second) {
  var parent = Path.getParentPath(first);
  var identifier = Path.getIdentifier(first);
  
  return (parent + "/" + identifier.tag + "[" + (parseInt(identifier.index)+1) + "]") == second;
};

FireDiff.Path.isChildOrSelf = function(parent, child) {
  return parent == child || Path.isChild(parent, child);
};
FireDiff.Path.isChild = function(parent, child) {
  return child.indexOf(parent + "/") === 0;
};

FireDiff.Path.getRelativeComponents = function(path1, path2) {
  path1 = extractComponents(path1);
  path2 = extractComponents(path2);
  
  var common = [];
  for (var i = 0; i < path1.length && i < path2.length && path1[i] == path2[i]; i++) {
    common.push(path1[i]);
  }
  
  path1.splice(0, common.length);
  path2.splice(0, common.length);
  
  return {
    common: common.join("/") || (common.length == 1 ? "/" : ""),
    left: path1.join("/"),
    right: path2.join("/")
  };
};

FireDiff.Path.compareXPaths = function(path1, path2) {
  var components = Path.getRelativeComponents(path1, path2);
  var leftTop = Path.getIdentifier("/" + Path.getTopPath(components.left));
  var rightTop = Path.getIdentifier("/" + Path.getTopPath(components.right));
  if (!leftTop) {
    return rightTop ? -1 : 0;
  }
  if (!rightTop) {
    return 1;
  }
  
  var tagCompare = leftTop.tag.localeCompare(rightTop.tag);
  if (tagCompare) {
    return tagCompare;
  }
  
  if (leftTop.index < rightTop.index) {
    return -1;
  } else if (leftTop.index == rightTop.index) {
    return 0;
  } else {
    return 1;
  }
};

FireDiff.Path.getElementPath = function(element, useTagNames, rootPath) {
  var nameLookup = [];
  nameLookup[Node.COMMENT_NODE] = "comment()";
  nameLookup[Node.TEXT_NODE] = "text()";
  nameLookup[Node.PROCESSING_INSTRUCTION_NODE] = "processing-instruction()";

  var paths = [];
  for (; element && element.nodeType != Node.DOCUMENT_NODE; element = element.parentNode) {
    var tagName = element.localName || nameLookup[element.nodeType];
    var index = 0;
    for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
      var siblingTagName = sibling.localName || nameLookup[sibling.nodeType];
      if (!useTagNames || tagName == siblingTagName || !tagName) {
        ++index;
      }
    }

    var pathIndex = "[" + (index+1) + "]";
    paths.splice(0, 0, (useTagNames && tagName ? tagName.toLowerCase() : "node()") + pathIndex);
  }

  var prefix = "/";
  if (rootPath && paths.length) {
    prefix = "";
    paths[0] = rootPath;
  }

  return prefix + paths.join("/");
};

FireDiff.Path.getStylePath = function(style) {
  var paths = [];
  
  // Style declarations are not part of the path
  if (style instanceof CSSStyleDeclaration)     style = style.parentRule;
  if (!style)     return undefined;
  
  var parent = style;
  while ((parent = style.parentRule || style.parentStyleSheet)) {
    if (style instanceof CSSStyleSheet)    break;
    
    var index = getRuleIndex(style, parent);
    if (!index)    break;
    
    paths.splice(0, 0, "rule()[" + index + "]");
    style = parent;
  }
  
  // At this point we should be at the sheet object, if we aren't, the style
  // isn't in the doc
  var sheetId = getSheetId(style);
  if (!sheetId)     return undefined;
  
  paths.splice(0, 0, "/style()[" + sheetId+ "]");
  return paths.join("/");
};

FireDiff.Path.evaluateStylePath = function(path, document) {
  var parser = /\/?(.*?)\[(.*?)\]/g;
  var component, current;
  
  // The regex appears to maintain state (due to an optimizer?) meaning that
  // any situation where the entire string is not processed, such as an error
  // case, could cause future calls to fail.
  parser.lastIndex = 0;
  while (component = parser.exec(path)) {
    var lookup = styleLookups[component[1]];
    if (!lookup) {
      return undefined;
    }
    
    current = lookup(current || document, component[2]);
    if (!current) {
      return undefined;
    }
  }
  
  return current;
};

}});