/* See license.txt for terms of usage */
FireDiff  = FireDiff || {};

FBL.ns(function() { with (FBL) {

var i18n = document.getElementById("strings_firediff");

var Path = FireDiff.Path,
  Reps = FireDiff.reps,
  CSSModel = FireDiff.CSSModel,
  ChangeEvent = FireDiff.events.ChangeEvent,
  
  CHANGES = FireDiff.events.AnnotateAttrs.CHANGES,
  REMOVE_CHANGES = FireDiff.events.AnnotateAttrs.REMOVE_CHANGES;

function CSSChangeEvent(style, changeSource, xpath) {
    ChangeEvent.call(this, changeSource);
    
    this.style = style;
    this.xpath = xpath || Path.getStylePath(style);
}
CSSChangeEvent.prototype = extend(ChangeEvent.prototype, {
    changeType: "CSS",

    isPropSet: function() {},
    isPropRemoval: function() {},

    getXpath: function(target) { return Path.getStylePath(target); },
    xpathLookup: function(xpath, root) {
      return Path.evaluateStylePath(xpath, root);
    },
    sameFile: function(target) {
      var targetXpath = target && (target.xpath || this.getXpath(target));
      return targetXpath && Path.getTopPath(targetXpath) == Path.getTopPath(this.xpath);
    },
    getSnapshot: function(context) {
      return new Reps.CSSSnapshot(this, context);
    },
    getBaseSnapshot: function(context) {
      var rootPath = Path.getTopPath(this.xpath);
      var sheet = Path.evaluateStylePath(rootPath, context.window.document);
      return new Reps.CSSSnapshot(sheet, context);
    },
    getDocumentName: function(context) {
      var rootPath = Path.getTopPath(this.xpath);
      var sheet = Path.evaluateStylePath(rootPath, context.window.document);

      return sheet.href;
    }
});

function CSSRuleEvent(style, changeSource, xpath, clone) {
  CSSChangeEvent.call(this, style, changeSource, xpath);
  
  this.clone = clone || CSSModel.cloneCSSObject(style);
}
CSSRuleEvent.prototype = extend(CSSChangeEvent.prototype, {
  // This is a little bit of a hack. The rule editor does not always have a
  // valid rep object and as a consequence we can't key on the target.
  //
  // Since rule insert and remove events always come from Firebug we assume
  // that this change applies to the current editor
  appliesTo: function(target) { return target; },

  mergeRevert: function(candidate) {
    if (Path.isChildOrSelf(this.xpath, candidate.xpath)
        && this.subType != candidate.subType) {
      return this.merge(candidate);
    }
  }
});

function CSSInsertRuleEvent(style, changeSource, xpath, clone) {
  CSSRuleEvent.call(this, style, changeSource, xpath, clone);
}
CSSInsertRuleEvent.prototype = extend(CSSRuleEvent.prototype, {
  subType: "insertRule",
  getSummary: function() {
    return i18n.getString("summary.CSSInsertRule");
  },
  isElementAdded: function() { return true; },

  annotateTree: function(tree, root) {
    var parent = this.getInsertActionNode(tree, root).parent;
    var identifier = Path.getIdentifier(this.xpath);
    
    if (!parent && FBTrace.DBG_ERRORS) {
      FBTrace.sysout("CSSRuleEvent.annotateTree: Failed to lookup parent " + this.xpath + " " + root, tree);
    }
    var rule = parent.cssRules[identifier.index-1];
    if (!rule && FBTrace.DBG_ERRORS) {
      FBTrace.sysout("CSSRuleEvent.annotateTree: Failed to lookup rule: " + identifier.index + " " + parent, unwrapObject(parent));
    }
    rule[CHANGES] = this;
    rule.xpath = this.xpath;
    return rule;
  },
  merge: function(candidate, simplifyOnly) {
    if (candidate.isElementRemoved() && this.xpath == candidate.xpath) {
      return;
    }
    
    var updateXpath = candidate.getMergedXPath(this);
    if (!simplifyOnly && updateXpath) {
      return [
          this.cloneOnXPath(updateXpath),
          candidate
        ];
    } else if (Path.isChildOrSelf(this.xpath, candidate.xpath)
        && (candidate.isPropSet() || candidate.isPropRemoval())){
      // TODO : Handle @media nested changes?
      var clone = this.clone.clone();
      candidate.apply(clone, this.xpath);
      
      return [ new CSSInsertRuleEvent(this.style, this.changeSource, this.xpath, clone) ];
    }
  },
  isCancellation: function(candidate) {
    return candidate.isElementRemoved()
        && this.xpath == candidate.xpath
        && this.clone.equals(candidate.clone);
  },
  affectsCancellation: function(candidate) {
    return Path.isChildOrSelf(this.xpath, candidate.xpath);
  },
  cloneOnXPath: function(xpath) {
    return new CSSInsertRuleEvent(this.style, this.changeSource, xpath, this.clone);
  },
  
  apply: function(style, xpath) {
    Firebug.DiffModule.ignoreChanges(bindFixed(
        function() {
          var actionNode = this.getInsertActionNode(style, xpath);
          var identifier = Path.getIdentifier(this.xpath);
          identifier.index--;
          
          if (actionNode.parent instanceof CSSStyleSheet
              || actionNode.parent instanceof CSSMediaRule) {
            Firebug.CSSModule.insertRule(actionNode.parent, this.clone.cssText, identifier.index);
          } else {
            actionNode.parent.cssRules.splice(identifier.index, 0, CSSModel.cloneCSSObject(this.clone));
          }
        }, this));
  },
  revert: function(style, xpath) {
    Firebug.DiffModule.ignoreChanges(bindFixed(
        function() {
          var actionNode = this.getInsertActionNode(style, xpath);
          var identifier = Path.getIdentifier(this.xpath);
          identifier.index--;
          
          if (actionNode.parent instanceof CSSStyleSheet
              || actionNode.parent instanceof CSSMediaRule) {
            Firebug.CSSModule.deleteRule(actionNode.parent, identifier.index);
          } else {
            actionNode.parent.cssRules.splice(identifier.index, 1);
          }
        }, this));
  }
});

function CSSRemoveRuleEvent(style, changeSource, xpath, clone, styleSheet) {
  CSSRuleEvent.call(this, style, changeSource, xpath, clone);
  this.styleSheet = styleSheet || style.parentStyleSheet;
}
CSSRemoveRuleEvent.prototype = extend(CSSRuleEvent.prototype, {
  subType: "removeRule",
  getSummary: function() {
    return i18n.getString("summary.CSSRemoveRule");
  },
  isElementRemoved: function() { return true; },

  annotateTree: function(tree, root) {
    var actionNode = this.getInsertActionNode(tree, root).parent;
    var list = actionNode[REMOVE_CHANGES] || [];
    list.push(this);
    actionNode[REMOVE_CHANGES] = list;
    // TODO : Verify this is UTed
    actionNode.xpath = this.xpath;
    
    return this;
  },
  merge: function(candidate, simplifyOnly) {
    if (candidate.isElementAdded() && this.xpath == candidate.xpath) {
      return;
    }
    
    var updateXpath = candidate.getMergedXPath(this);
    if (!simplifyOnly && updateXpath) {
      return [
          this.cloneOnXPath(updateXpath),
          candidate
        ];
    }
  },
  mergeRevert: function(candidate) {
    if (this.isCancellation(candidate)) {
      return [];
    }
  },
  overridesChange: function(prior) {
    return !prior.isElementRemoved() && this.xpath == prior.xpath;
  },
  isCancellation: function(candidate) {
    return this.xpath == candidate.xpath
        && candidate.isElementAdded()
        && this.clone.equals(candidate.clone);
  },
  affectsCancellation: function(candidate) {
    return this.isCancellation(candidate);
  },
  cloneOnXPath: function(xpath) {
    return new CSSRemoveRuleEvent(this.style, this.changeSource, xpath, this.clone, this.styleSheet);
  },
  
  apply: CSSInsertRuleEvent.prototype.revert,
  revert: CSSInsertRuleEvent.prototype.apply
});

function CSSPropChangeEvent(style, propName, changeSource, xpath) {
  CSSChangeEvent.call(this, style, changeSource, xpath);
  
  this.propName = propName;
}
CSSPropChangeEvent.prototype = extend(CSSChangeEvent.prototype, {
  annotateTree: function(tree, root) {
    var parent = this.getActionNode(tree, root);
    
    if (!parent && FBTrace.DBG_ERRORS) {
      FBTrace.sysout("CSSRuleEvent.annotateTree: Failed to lookup parent " + this.xpath, tree);
    }
    var changes = parent.propChanges || [];
    changes.push(this);
    parent.propChanges = changes;
    parent.xpath = this.xpath;
    return parent;
  },
  
  merge: function(candidate, simplifyOnly) {
    var updateXpath = candidate.getMergedXPath(this);
    if (!simplifyOnly && updateXpath) {
      return [
          this.cloneOnXPath(updateXpath),
          candidate
        ];
    }
    if (this.xpath != candidate.xpath
        || this.propName != candidate.propName) {
      return;
    }

    if (candidate.isPropSet()) {
      return [
        new CSSSetPropertyEvent(
              this.style, this.propName,
              candidate.propValue, candidate.propPriority,
              this.prevValue, this.prevPriority, this.changeSource,
              this.xpath)
      ];
    } else {
      return [
        new CSSRemovePropertyEvent(
              this.style, this.propName,
              this.prevValue, this.prevPriority,
              this.changeSource, this.xpath)
      ];
    }
  },
  mergeRevert: function(candidate) {
    if (this.xpath == candidate.xpath
        && this.propName == candidate.propName) {
      return this.merge(candidate);
    }
  },
  affectsCancellation: function(candidate) {
    return this.xpath == candidate.xpath
        && this.propName == candidate.propName;
  }
});

function CSSSetPropertyEvent(style, propName, propValue, propPriority, prevValue, prevPriority, changeSource, xpath) {
  CSSPropChangeEvent.call(this, style, propName, changeSource, xpath);
  
  this.propValue = propValue;
  this.propPriority = propPriority;
  this.prevValue = prevValue;
  this.prevPriority = prevPriority;
}
CSSSetPropertyEvent.prototype = extend(CSSPropChangeEvent.prototype, {
    subType: "setProp",
    
    getSummary: function() {
        return i18n.getString("summary.CSSSetProperty");
    },
    isPropSet: function() { return true; },
    isCancellation: function(candidate) {
      return this.xpath == candidate.xpath
          && this.propName == candidate.propName
          && this.prevValue == candidate.propValue
          && this.prevPriority == candidate.propPriority;
    },
    cloneOnXPath: function(xpath) {
      return new CSSSetPropertyEvent(
          this.style, this.propName,
          this.propValue, this.propPriority,
          this.prevValue, this.prevPriority,
          this.changeSource,
          xpath);
    },
    
    apply: function(style, xpath) {
      Firebug.DiffModule.ignoreChanges(bindFixed(
          function() {
            var actionNode = this.getActionNode(style, xpath);
            Firebug.CSSModule.setProperty(actionNode.style, this.propName, this.propValue, this.propPriority);
          }, this));
    },
    revert: function(style, xpath) {
      Firebug.DiffModule.ignoreChanges(bindFixed(
          function() {
            var actionNode = this.getActionNode(style, xpath);
            if (this.prevValue) {
              Firebug.CSSModule.setProperty(actionNode.style, this.propName, this.prevValue, this.prevPriority);
            } else {
              Firebug.CSSModule.removeProperty(actionNode.style, this.propName);
            }
          }, this));
    }
});

function CSSRemovePropertyEvent(style, propName, prevValue, prevPriority, changeSource, xpath) {
  CSSPropChangeEvent.call(this, style, propName, changeSource, xpath);

  // Seed empty values for the current state. This makes the domplate
  // display much easier
  this.propValue = "";
  this.propPriority = "";
  
  this.prevValue = prevValue;
  this.prevPriority = prevPriority;
}
CSSRemovePropertyEvent.prototype = extend(CSSPropChangeEvent.prototype, {
    subType: "removeProp",
    
    getSummary: function() {
        return i18n.getString("summary.CSSRemoveProperty");
    },
    isPropRemoval: function() { return true; },
    isCancellation: function(candidate) {
      return this.xpath == candidate.xpath
          && this.subType != candidate.subType
          && this.propName == candidate.propName
          && this.prevValue == candidate.propValue
          && this.prevPriority == candidate.propPriority;
    },
    cloneOnXPath: function(xpath) {
      return new CSSRemovePropertyEvent(
          this.style, this.propName,
          this.prevValue, this.prevPriority,
          this.changeSource,
          xpath);
    },
    apply: function(style, xpath) {
      Firebug.DiffModule.ignoreChanges(bindFixed(
          function() {
            var actionNode = this.getActionNode(style, xpath);
            Firebug.CSSModule.removeProperty(actionNode.style, this.propName);
          }, this));
    },
    revert: function(style, xpath) {
      Firebug.DiffModule.ignoreChanges(bindFixed(
          function() {
            var actionNode = this.getActionNode(style, xpath);
            Firebug.CSSModule.setProperty(actionNode.style, this.propName, this.prevValue, this.prevPriority);
          }, this));
    }
});

FireDiff.events.css = {
  CSSInsertRuleEvent: CSSInsertRuleEvent,
  CSSRemoveRuleEvent: CSSRemoveRuleEvent,
  CSSSetPropertyEvent: CSSSetPropertyEvent,
  CSSRemovePropertyEvent: CSSRemovePropertyEvent
};

}});