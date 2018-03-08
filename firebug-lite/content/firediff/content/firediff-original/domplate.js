/* See license.txt for terms of usage */
var FireDiff = FireDiff || {};
FireDiff.domplate = {};

FBL.ns(function() {
(function () { with(FBL) {

var i18n = document.getElementById("strings_firediff");
const Events = FireDiff.events,
      Path = FireDiff.Path,
      CSSModel = FireDiff.CSSModel,
      VersionCompat = FireDiff.VersionCompat,
      Search = FireDiff.search;

var DomUtil = {
  diffText: function(change) {
    function getText(value) {
      return Firebug.showWhitespaceNodes ? value : value.replace(/(?:^\s+)|(?:\s+$)/g, "");
    }

    var diffChanges = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
    if (diffChanges.changeType) {
      return JsDiff.diffWords(getText(diffChanges.previousValue), getText(diffChanges.value));
    } else {
      return [{ value: getText(change.nodeValue) }];
    }
  },
  diffAttr: function(attr) {
    if (attr.change) {
      if (attr.localName == "style") {
        return JsDiff.diffCss(attr.change.previousValue, attr.change.value);
      } else {
        return JsDiff.diffWords(attr.change.previousValue, attr.change.value);
      }
    } else {
        return [ { value: attr.nodeValue } ];
    }
  },
  isEmptyElement: function(element) {
    return !element.firstChild && !element[Events.AnnotateAttrs.REMOVE_CHANGES];
  },

  isPureText: function(element) {
    for (var child = element.firstChild; child; child = child.nextSibling) {
      if (child.nodeType == Node.ELEMENT_NODE) {
        return false;
      }
    }
    var removeChanges = element[Events.AnnotateAttrs.REMOVE_CHANGES] || [];
    for (var i = 0; i < removeChanges.length; i++) {
      if (removeChanges[i].clone.nodeType == Node.ELEMENT_NODE) {
        return false;
      }
    }
    return true;
  },

  isWhitespaceText: function(node) {
    return VersionCompat.isWhitespaceText(node.clone || node);
  },

  isSourceElement: VersionCompat.isSourceElement
};
this.DomUtil = DomUtil;

// Common Domplates
/**
 * Pretty print attribute list.
 * 
 * Represents a list of attributes as well as any changes that have been applies
 * to these attributes.
 * 
 * Parameter:
 *   change: Change object that we are displaying
 */
var attributeList = domplate({
  tag: FOR("attr", "$change|attrIterator", TAG("$attr|getAttrTag", {attr: "$attr"})),
  attributeDiff:
      SPAN({class: "nodeAttr", $removedClass: "$attr|isAttrRemoved", $addedClass: "$attr|isAttrAdded",
        $firebugDiff: "$attr|isFirebugDiff", $appDiff: "$attr|isAppDiff"},
          "&nbsp;",
          SPAN({class: "nodeName"}, "$attr.localName"), "=&quot;",
          SPAN({class: "nodeValue"}, 
              FOR("block", "$attr|diffAttr",
                      SPAN({$removedClass: "$block.removed", $addedClass: "$block.added"}, "$block.value"))
          ),
          "&quot;"
     ),
  
  getAttrTag: function(attr) {
      return this.attributeDiff;
  },

  attrIterator: function(change) {
    return Search.getAttributes(change);
  },

  isAttrAdded: function(attr) {
      return attr.change && attr.change.isAddition();
  },
  isAttrRemoved: function(attr) {
      return attr.change && attr.change.isRemoval();
  },
  isFirebugDiff: function(attr) {
    return attr.change && attr.change.changeSource == Events.ChangeSource.FIREBUG_CHANGE;
  },
  isAppDiff: function(attr) {
    return attr.change && attr.change.changeSource == Events.ChangeSource.APP_CHANGE;
  },
  diffAttr: function(attr) {
    return DomUtil.diffAttr(attr);
  }
});

var propertyDefinition = domplate({
  tag: 
    DIV({class: "cssPropDiff"},
      SPAN({$removedClass: "$change|isPropRemoved", $addedClass: "$change|isPropAdded"},
        SPAN({class: "cssPropName"}, "$change.propName"),
        SPAN({class: "cssColon"}, ":"),
        SPAN({class: "cssPropValue"},
          FOR("block", "$change|diffProp",
            SPAN({$removedClass: "$block.removed", $addedClass: "$block.added"}, "$block.value")),
          SPAN({$removedClass: "$change|isPriorityRemoved", $addedClass: "$change|isPriorityAdded"},
            "$change|getPriorityText")
        ),
        SPAN({class: "cssSemi"}, ";")
    )),
  
  diffProp: function(change) {
      return JsDiff.diffCss(change.prevValue, change.propValue);
  },
  isPropAdded: function(change) { return !change.prevValue; },
  isPropRemoved: function(change) { return !change.propValue; },
  
  getPriorityText: function(change) {
    var important = change.propPriority || change.prevPriority;
    return important ? (" !" + important) : "";
  },
  isPriorityAdded: function(change) { return !change.prevPriority; },
  isPriorityRemoved: function(change) { return !change.propPriority; }
});

// Diff Monitor Domplates
// TODO : Allow replink in the monitor case
var textChanged = domplate(FirebugReps.TextNode, {
  tag: SPAN(
      {class: "textDiff", $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded"},
        FOR("block", "$change|diffText",
            SPAN({$removedClass: "$block.removed", $addedClass: "$block.added"}, "$block.value")
        )),
  diffText: function(change) {
    return DomUtil.diffText(change);
  },
  isElementAdded: function(change) {
    change = change || change[FireDiff.events.AnnotateAttrs.CHANGES];
    return change && change.isElementAdded && change.isElementAdded();
  },
  isElementRemoved: function(change) {
    change = change || change[FireDiff.events.AnnotateAttrs.CHANGES];
    return change && change.isElementRemoved && change.isElementRemoved();
  }
});

this.TextChanged = textChanged;

// Displays a rep link to an element that has changed.
// 
// These changes are primarily attribute and insertion changes
// TODO : Attempt to merge this with the domplate defined below
this.ElementChanged = domplate(FirebugReps.Element, {
    tag: FirebugReps.OBJECTLINK(
        {$removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded"},
        "&lt;",
        SPAN({class: "nodeTag"}, "$change.clone.localName|toLowerCase"),
        TAG(attributeList.tag, {change: "$change"}),
        "&gt;"
    ),
    isElementAdded: function(change) {
        return change.isElementAdded();
    },
    isElementRemoved: function(change) {
        return change.isElementRemoved();
    }
});

// All Changes Domplates
var ChangeElement = extend(FirebugReps.Element, {
  removedChanges: function(node) {
    return node[FireDiff.events.AnnotateAttrs.REMOVE_CHANGES] || [];
  },
  
  getElementName: function(change) {
    // TODO : XML Handling
    change = change.clone || change;
    return (change.localName || "").toLowerCase();
  },
  isElementAdded: function(change) {
    change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
    return change && change.isElementAdded && change.isElementAdded();
  },
  isElementRemoved: function(change) {
    change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
    return change && change.isElementRemoved && change.isElementRemoved();
  },
  isFirebugDiff: function(change) {
    change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
    return change.changeSource == Events.ChangeSource.FIREBUG_CHANGE;
  },
  isAppDiff: function(change) {
    change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
    return change.changeSource == Events.ChangeSource.APP_CHANGE;
  }
});

var ParentChangeElement = extend(ChangeElement, {
  childIterator: function(node) {
    node = node.clone || node;
    if (node.contentDocument)
      // TODO : Should this use contentDocument.childNodes?
      return [node.contentDocument.documentElement];
    
    function includeChild(child) {
      return Firebug.showWhitespaceNodes || !DomUtil.isWhitespaceText(child);
    }
    return new Search.RemovedIterator(new Search.DOMIterator(node), this.removedChanges(node), includeChild);
  }
});

var allChanges = {
    getNodeTag: function(node, inline) {
      if (node instanceof Element) {
        if (node instanceof HTMLAppletElement)
          return allChanges.EmptyElement.tag;
        else if (node.firebugIgnore)
          return null;
        else if (DomUtil.isEmptyElement(node))
          return allChanges.EmptyElement.tag;
        else if (!DomUtil.isSourceElement(node) && DomUtil.isPureText(node))
          return allChanges.TextElement.tag;
        else
          return allChanges.Element.tag;
      }
      else if (node instanceof CDATASection)  // Must occur before instanceof Text
        return allChanges.CDATANode.tag;
      else if (node instanceof Text)
        return inline ? allChanges.InlineTextNode.tag : allChanges.TextNode.tag;
      else if (node instanceof ProcessingInstruction)
        return allChanges.ProcessingInstruction.tag;
      else if (node instanceof Comment && Firebug.showCommentNodes)
        return allChanges.CommentNode.tag;
      else if (node instanceof SourceText)
        return FirebugReps.SourceText.tag;
      else if (node instanceof Document)
        return allChanges.Document.tag;
      else if (node instanceof DocumentType)
        return allChanges.DocType.tag;
      else if (node instanceof DocumentFragment)
        return allChanges.Document.tag;
      else
        return FirebugReps.Nada.tag;
    },

    Document: domplate(ParentChangeElement, {
      tag:
        DIV({class: "nodeBox containerNodeBox repIgnore", _repObject: "$change" }, DIV({class: "nodeChildBox"}))
    }),

    DocType: domplate(ChangeElement, {
      tag: DIV({class: "nodeBox emptyNodeBox repIgnore", _repObject: "$change",
        $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
        $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
      DIV({class: "nodeLabel"},
        SPAN({class: "nodeLabelBox repTarget"},
          "&lt;!DOCTYPE&nbsp;",
          SPAN({class: "nodeTag"}, "$change|getDocTypeName"),

          SPAN({$collapsed: "$change|hidePublicId"}, "&nbsp;PUBLIC&nbsp;"),
          SPAN({class: "nodeValue", $collapsed: "$change|hidePublicId"}, "&quot;", "$change|getPublicId", "&quot;"),

          SPAN({$collapsed: "$change|hideSystemIdTag"}, "&nbsp;SYSTEM&nbsp;"),
          SPAN({class: "nodeValue", $collapsed: "$change|hideSystemId"}, "&quot;", "$change|getSystemId", "&quot;"),

          SPAN({class: "nodeInternalSubset", $collapsed: "$change|hideInternalSubset"},
              "&nbsp;[", "$change|getInternalSubset", "]"),
          SPAN({class: "nodeBracket"}, "&gt;")
          )
        )
      ),

      getDocTypeName: function(change) {
        // TODO : XML Handling
        var docType = change.clone || change;
        return (docType.name || docType).toLowerCase();
      },

      hidePublicId: function(change) {
        return !this.getPublicId(change);
      },
      getPublicId: function(change) {
        var docType = change.clone || change;
        return docType.publicId;
      },

      hideSystemId: function(change) {
        return !this.getSystemId(change);
      },
      hideSystemIdTag: function(change) {
        return this.hideSystemId(change) || !this.hidePublicId(change);
      },
      getSystemId: function(change) {
        var docType = change.clone || change;
        return docType.systemId;
      },

      hideInternalSubset: function(change) {
        return !this.getInternalSubset(change);
      },
      getInternalSubset: function(change) {
        var docType = change.clone || change;
        return docType.internalSubset;
      }
    }),

    ProcessingInstruction: domplate(ChangeElement, {
      tag: DIV({class: "nodeBox emptyNodeBox repIgnore", _repObject: "$change",
        $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
        $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
      DIV({class: "nodeLabel"},
        SPAN({class: "nodeLabelBox repTarget"},
          "&lt;?",
          SPAN({class: "nodeTag"}, "xslt-param"),
          SPAN({class: "nodeValue", $collapsed: "$change|hideContent"}, "&nbsp;", "$change|getContent"),
          SPAN({class: "nodeBracket"}, "?&gt;")
          )
        )
      ),

      hideContent: function(change) {
        return !this.getContent(change);
      },
      getContent: function(change) {
        var instruct = change.clone || change;
        return instruct.nodeValue;
      }
    }),

    Element: domplate(ChangeElement, {
      tag:
        DIV({class: "nodeBox containerNodeBox repIgnore", _repObject: "$change",
          $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
          $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
          DIV({class: "nodeLabel nodeContainerLabel"},
            IMG({class: "twisty"}),
            SPAN({class: "nodeLabelBox repTarget"},
              "&lt;",
              SPAN({class: "nodeTag"}, "$change|getElementName"),
              TAG(attributeList.tag, {change: "$change"}),
              SPAN({class: "nodeBracket"}, "&gt;")
            )
          ),
          DIV({class: "nodeChildBox"}),
          DIV({class: "nodeCloseLabel"},
            SPAN({class: "nodeCloseLabelBox repTarget"},
              "&lt;/", SPAN({class: "nodeTag"}, "$change|getElementName"), "&gt;"
            )
          )
        )
    }),

    TextElement: domplate(ParentChangeElement, {
      tag:
        DIV({class: "nodeBox textNodeBox open repIgnore", _repObject: "$change",
            $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
            $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
          SPAN({class: "nodeLabel"},
            SPAN({class: "nodeLabelBox repTarget"},
              "&lt;",
              SPAN({class: "nodeTag"}, "$change|getElementName"),
              TAG(attributeList.tag, {change: "$change"}),
              SPAN({class: "nodeBracket"}, "&gt;"))),
          SPAN({class: "nodeChildBox"},
            FOR("child", "$change|childIterator",
              TAG("$child|getNodeTag", {change: "$child"})
            )),
          SPAN(
            "&lt;/",
            SPAN({class: "nodeTag"}, "$change|getElementName"),
            "&gt;"
          )
        ),
        getNodeTag: function(node) {
          return allChanges.getNodeTag(node.clone || node, true);
        }
    }),

    EmptyElement: domplate(ChangeElement, {
      tag: DIV({class: "nodeBox emptyNodeBox repIgnore", _repObject: "$change",
          $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
          $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
        DIV({class: "nodeLabel"},
          SPAN({class: "nodeLabelBox repTarget"},
            "&lt;",
            SPAN({class: "nodeTag"}, "$change|getElementName"),
            TAG(attributeList.tag, {change: "$change"}),
            SPAN({class: "nodeBracket"}, "/&gt;")
            )
          )
        )
    }),

    TextNode: domplate(ChangeElement, {
      tag:
        DIV({class: "nodeBox", _repObject: "$change",
            $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
            $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
          SPAN({class: "nodeText"}, TAG(textChanged.tag, {change: "$change"}))
        )
    }),
    InlineTextNode: domplate(ChangeElement, {
      tag:
        SPAN({_repObject: "$change",
            $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
            $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
          SPAN({class: "nodeText"}, TAG(textChanged.tag, {change: "$change"}))
        )
    }),

    CDATANode: domplate(ChangeElement, {
      tag: DIV({class: "nodeBox", _repObject: "$change",
          $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
          $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
        "&lt;![CDATA[",
        SPAN({class: "nodeText"}, TAG(textChanged.tag, {change: "$change"})),
        "]]&gt;"
        )
    }),

    CommentNode: domplate(ChangeElement, {
      tag: DIV({class: "nodeBox", _repObject: "$change",
          $removedClass: "$change|isElementRemoved", $addedClass: "$change|isElementAdded",
          $firebugDiff: "$change|isFirebugDiff", $appDiff: "$change|isAppDiff"},
        DIV({class: "nodeComment"},
          "&lt;!--", TAG(textChanged.tag, {change: "$change"}), "--&gt;"
          )
        )
    })
};

this.HtmlSnapshotView = function(tree, rootXPath, panelNode) {
  this.tree = tree;
  this.rootXPath = rootXPath;
  this.panelNode = panelNode;
}
this.HtmlSnapshotView.prototype = {
  childIterator: function(parent) {
    return new Search.RemovedIterator(
        new Search.DOMIterator(parent.clone || parent),
        parent[FireDiff.events.AnnotateAttrs.REMOVE_CHANGES],
        this.includeChild);
  },
  includeChild: function(child) {
    return Firebug.showWhitespaceNodes || !DomUtil.isWhitespaceText(child);
  },
  
  /* InsideOutBox View Interface */
  getParentObject: function(child) {
    if (child.parentNode) {
      return child.parentNode.change || child.parentNode;
    }
    if (child.change) {
      return child.change;
    }
    
    if (child.xpath) {
      var components = Path.getRelativeComponents(Path.getParentPath(child.xpath), this.rootXPath);
      if (!components.right) {
        var iterate = (this.tree.ownerDocument || this.tree).evaluate(components.left, this.tree, null, XPathResult.ANY_TYPE, null);
        var ret = iterate.iterateNext();
        return ret;
      }
    }
  },
  getChildObject: function(parent, index, prevSibling) {
    if (!parent)    return;

    var iter = parent._diffIter || this.childIterator(parent.clone || parent);
    var diffCache = parent._diffCache || [];
    // Read in more elements if the this is a cache miss
    while (diffCache.length <= index && !parent._diffIterExhausted) {
      try {
        diffCache.push(iter.next());
      } catch (err) {
        // Assume this is StopIterator
        parent._diffIterExhausted = true;
      }
    }
    
    parent._diffIter = iter;
    parent._diffCache = diffCache;
    
    return diffCache[index];
  },
  createObjectBox: function(object, isRoot) {
    var tag = allChanges.getNodeTag(object.clone || object, false);
    return tag.replace({change: object}, this.panelNode.document);
  }
};

var CSSChangeElement = {
  getCSSRules: function(change) {
    var removed = change[FireDiff.events.AnnotateAttrs.REMOVE_CHANGES] || [];
    return new Search.RemovedIterator(new Search.ArrayIterator(change.cssRules), removed);
  },
  
  getNodeTag: function(cssRule) {
    var CSSChanges = FireDiff.domplate.CSSChanges;
    
    cssRule = cssRule.changeType ? cssRule.clone : cssRule;
    if (cssRule instanceof CSSStyleSheet || cssRule instanceof CSSModel.StyleSheetClone) {
      return CSSChanges.CSSList.tag;
    } else if (cssRule instanceof CSSStyleRule || cssRule instanceof CSSModel.CSSStyleRuleClone
        || cssRule instanceof CSSFontFaceRule || cssRule instanceof CSSModel.CSSFontFaceRuleClone) {
      return CSSChanges.CSSStyleRule.tag;
    } else if (cssRule instanceof CSSMediaRule || cssRule instanceof CSSModel.CSSMediaRuleClone) {
      return CSSChanges.CSSMediaRule.tag;
    } else if (cssRule instanceof CSSImportRule || cssRule instanceof CSSModel.CSSImportRuleClone) {
      return CSSChanges.CSSImportRule.tag;
    } else if (cssRule instanceof CSSCharsetRule || cssRule instanceof CSSModel.CSSCharsetRuleClone) {
      return CSSChanges.CSSCharsetRule.tag;
    }
  }
};
this.CSSChanges = {
  CSSList: domplate(CSSChangeElement, {
    tag: FOR("rule", "$change|getCSSRules",
      TAG("$rule|getNodeTag", {change: "$rule"})
    )
  }),
  CSSImportRule: domplate(CSSChangeElement, {
    tag: DIV({
          class: "cssRuleDiff firebugDiff",
          _repObject: "$change"},
      "@import &quot;$change.href&quot;;")
  }),
  CSSCharsetRule: domplate(CSSChangeElement, {
    tag: DIV({
          class: "cssRuleDiff firebugDiff",
          _repObject: "$change"
        }, "@charset &quot;$change.encoding&quot;;")
  }),
  CSSMediaRule: domplate(CSSChangeElement, {
    tag: DIV({
          class: "cssMediaRuleDiff firebugDiff",
          _repObject: "$change"
        },
        DIV({class: "cssSelector"}, "@media $change|getMediaList {"),
        DIV({class: "cssMediaRuleContent"},
          FOR("rule", "$change|getCSSRules",
              TAG("$rule|getNodeTag", {change: "$rule"}))),
        DIV("}")
    ),
    getMediaList: function(change) {
      var content = [],
          media = change.media;
      for (var i = 0; i < media.length; i++) {
        content.push(media.item ? media.item(i) : media[i]);
      }
      return content.join(", ");
    }
  }),
  CSSStyleRule: domplate(CSSChangeElement, {
    tag: DIV({
        class: "cssRuleDiff firebugDiff",
        _repObject: "$change",
        $removedClass: "$change|isRemoved", $addedClass: "$change|isAdded"
      },
      DIV({class: "cssHead"},
        SPAN({class: "cssSelector"}, "$change|getSelectorText"), " {"),
          FOR("prop", "$change|getRemovedProps",
            TAG(propertyDefinition.tag, {change: "$prop"})),
          FOR("prop", "$change|getCurrentProps",
            TAG(propertyDefinition.tag, {change: "$prop"})),
        DIV("}")
      ),
    getSelectorText: function(change) {
      return change.selectorText || (change.clone || change.style).selectorText;
    },
    isAdded: function(change) {
      change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
      return change.subType == "insertRule";
    },
    isRemoved: function(change) {
      change = change[FireDiff.events.AnnotateAttrs.CHANGES] || change;
      return change.subType == "removeRule";
    },
    getRemovedProps: function(change) {
      if (!change.propChanges) {
        if (change.subType == "removeProp") {
          return [change];
        } else {
          return [];
        }
      }
      
      var ret = [];
      for (var i = 0; i < change.propChanges.length; i++) {
        var prop = change.propChanges[i];
        if (prop.subType == "removeProp") {
          ret.push(prop);
        }
      }
      return ret;
    },
    getCurrentProps: function(change) {
      if (change.subType == "setProp") {
        return [change];
      } else if (change.subType == "removeProp") {
        return [];
      }
      
      var propList = {},
          i = 0, index = 0,
          style = (change.clone || change.style).style || change.style;
      for (i = 0; i < style.length; i++) {
        var propName = style[i],
            propValue = style.getPropertyValue(propName),
            propPriority = style.getPropertyPriority(propName);
        propList[propName] = {
          propName: propName,
          propValue: propValue, propPriority: propPriority,
          prevValue: propValue, prevPriority: propPriority
        };
      }
      if (change.propChanges) {
        for (i = 0; i < change.propChanges.length; i++) {
          var prop = change.propChanges[i];
          if (prop.subType == "setProp") {
            propList[prop.propName] = prop;
          }
        }
      }
      return {
        next: function() {
          if (index >= style.length)   $break();
          return propList[style[index++]];
        }
      }
    }
  })
};

}}).apply(FireDiff.domplate);
});