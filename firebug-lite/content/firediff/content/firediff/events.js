/* See license.txt for terms of usage */
FireDiff  = FireDiff || {};

FBL.ns(function() { with (FBL) {

var i18n = document.getElementById("strings_firediff");

var Events = FireDiff.events,
    Path = FireDiff.Path,
    Reps = FireDiff.reps,
    CSSModel = FireDiff.CSSModel;

const CHANGES = "firebug-firediff-changes";
const ATTR_CHANGES = "firebug-firediff-attrChanges";
const REMOVE_CHANGES = "firebug-firediff-removeChanges";

var ChangeSource = {
    APP_CHANGE: "APP_CHANGE",
    FIREBUG_CHANGE: "FIREBUG_CHANGE"
};

function ChangeEvent(changeSource) {
  this.date = new Date();
  this.changeSource = changeSource || ChangeSource.APP_CHANGE;
}
ChangeEvent.prototype = {
    getChangeType: function() { return this.changeType; },
    getSummary: function() {},
    merge: function(candidate, simplifyOnly) {},
    
    /**
     * Determines if a candidate change needs to be reverted or
     * restored in order to revert or restore this change. The implementation
     * should assume that the reverted field has already been set to the correct
     * value for this event when called.
     */
    mergeRevert: function(candidate) {},
    
    /**
     * Determines if a candidate change cancels the effects of this change.
     */
    isCancellation: function(candidate) {},
    
    /**
     * Determines if this change affects the cancellation of another change.
     * 
     * I.e. this change must be reverted to revert the candidate change.
     */
    affectsCancellation: function(candidate) {},
    
    /**
     * Determines if this change negates any effect of a prior change.
     */
    overridesChange: function(prior) {},
    cloneOnXPath: function(xpath) {},
    appliesTo: function(target, cachedXpath) {
      // Any change that is made to the target or a child
      return target && Path.isChildOrSelf(cachedXpath || this.getXpath(target), this.xpath);
    },
    
    /**
     * Determines if a given change is in the same file as this change.
     * The definition of file is up to the implementation, but may mean CSS
     * style sheet, DOM document, etc.
     */
    sameFile: function(otherChange) {},
    getSnapshot: function(context) {},
    getBaseSnapshot: function(context) {},
    getDocumentName: function(context) {},
    
    apply: function() {},
    revert: function() {},

    getMergedXPath: function(prior) {
      var updatedPath;
      if (!prior.isElementRemoved() || this.xpath != prior.xpath) {
        if (this.isElementAdded()) {
          updatedPath = Path.updateForInsert(prior.xpath, this.xpath);
        } else if (this.isElementRemoved()) {
          updatedPath = Path.updateForRemove(prior.xpath, this.xpath);
        }
      }

      if (updatedPath && updatedPath != prior.xpath) {
        return updatedPath;
      }
    },
    getRevertXPath: function(prior) {
      var updatedPath;
      if (this.isElementAdded()) {
        updatedPath = Path.updateForRevertRemove(prior.xpath, this.xpath);
      } else if (this.isElementRemoved()) {
        updatedPath = Path.updateForInsert(prior.xpath, this.xpath);
      }

      if (updatedPath && updatedPath != prior.xpath) {
        return updatedPath;
      }
    },
    
    getXpath: function(target) {},
    xpathLookup: function(xpath, root) {},
    getActionNode: function(target, xpath) {
      try {
        xpath = xpath || this.getXpath(target);
        if (xpath == this.xpath) {
          // Empty string passed to evaluate is bad. 
          return target;
        }
        
        var components = Path.getRelativeComponents(this.xpath, xpath);
        if (!components.right) {
          return this.xpathLookup(components.left, target);
        }
      } catch (err) {
        if (FBTrace.DBG_ERRORS) {
          FBTrace.sysout("getActionNode Error: " + err, err);
          FBTrace.sysout(" - getActionNode: " + this.xpath + " " + xpath, components);
        }
        throw err;
      }
    },
    getInsertActionNode: function(target, xpath) {
      xpath = xpath || this.getXpath(target);
      
      var parentPath = Path.getParentPath(this.xpath);
      var selfId = Path.getIdentifier(this.xpath);
      
      var components = Path.getRelativeComponents(parentPath, xpath);
      var parentEl;
      if (components.left) {
        parentEl = this.xpathLookup(components.left, target);
      } else {
        parentEl = target;
      }
      
      var siblingEl = this.xpathLookup(selfId.tag + "[" + selfId.index + "]", parentEl);
      return {
        parent: parentEl,
        sibling: siblingEl
      };
    },
    
    isElementAdded: function() { return false; },
    isElementRemoved: function() { return false; },
    
    toString: function() {
      return "[object ChangeEvent-" + this.changeType + "-" + this.subType + " " + this.xpath + "]";
    }
};

// Global API
FireDiff.events = {
    ChangeEvent: ChangeEvent,
    
    ChangeSource: ChangeSource,
    AnnotateAttrs: {
      CHANGES: CHANGES,
      ATTR_CHANGES: ATTR_CHANGES,
      REMOVE_CHANGES: REMOVE_CHANGES
    },

    /**
     * Simplifies the given change set to a reduced form, optionally updating
     * all changes to the current point in time.
     * 
     * simplifyOnly:
     *    truthy: Do not merge change xpaths. Change sets merged in this mode can be integrated with
     *        other change sets without xpath corruption.
     *    falsy: Merge change xpaths. This will update all changes so their xpaths reflect the current
     *        state of the document. Change sets merged in this mode can not be merged with other
     *        change sets.
     */
    merge: function(changes, simplifyOnly) {
      if (!changes.length) {
        return changes;
      }

      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("Merge prior simplifyOnly: " + simplifyOnly, changes);
      changes = changes.slice();

      var ret = [];
      for (var i = 0; i < changes.length; i++) {
        var changeMerge = mergeChange(changes, changes[i], i, simplifyOnly);
        if (changeMerge) {
          ret.push(changeMerge);
        }
      }

      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("Merge result", ret);
      return ret;
    },
    
    /**
     * Determines the changes necessary to revert a given change.
     * 
     * Returns an array of events that need to be reverted in order to
     * restore the associated object to the state prior to the given change.
     * These events are defined in reverse order, with change n being dependent
     * upon change n+1. These events will be merged where possible.
     * 
     * The changes array will be modified to remove the reverted events as well
     * as update the xpath of the remaining events to reflect the state of the
     * system after the reverts occur.
     */
    mergeRevert: function(change, changes) {
      var changeIndex = getChangeIndex(changes, change);

      // Merge all relevant changes into this change.
      var reverts = [];
      change = revertChange(changes, change, changeIndex, reverts);

      if (change) {
        reverts.splice(0, 0, change);
      }

      changes[changeIndex] = undefined;
      for (var i = changes.length; i > 0; i--) {
        if (!changes[i-1]) {
          changes.splice(i-1, 1);
        }
      }

      reverts.sort(function(a, b) { return b.xpath.localeCompare(a.xpath); });
      return reverts;
    }
};

function mergeChange(changes, change, changeIndex, simplifyOnly) {
  if (!change) {
    return;
  }

  for (var outerIter = changeIndex + 1; change && outerIter < changes.length; outerIter++) {
    var candidate = changes[outerIter],
        mergeValue;
    if (!candidate || candidate.changeType != change.changeType) {
      continue;
    }

    if (change.isCancellation(candidate)) {
      mergeValue = [];
    } else if (candidate.overridesChange(change)) {
      mergeValue = [undefined, candidate];
    } else {
      mergeValue = change.merge(changes[outerIter], simplifyOnly);
    }
    if (!mergeValue) {
      continue;
    }
    if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("Merge change " + changeIndex + " " + outerIter, mergeValue);

    if (mergeValue.length == 0 && !mergeValue[0]) {
      // Cancellation special case:
      updateXPathFromCancellation(changes, change, changeIndex, outerIter);
    }

    change = mergeValue[0];
    changes[outerIter] = mergeValue[1];
  }

  return change;
}

function revertChange(changes, change, changeIndex, parentDeletes) {
  if (!change) {
    return;
  }

  for (var outerIter = changeIndex + 1; change && outerIter < changes.length; outerIter++) {
    var candidate = changes[outerIter],
        mergeValue = undefined,
        updateXPath;

    if (change.isCancellation(candidate)) {
      mergeValue = [];
    } else if (candidate.isElementRemoved()
        && (Path.isChild(candidate.xpath, change.xpath)
          || (!change.isElementRemoved() && change.xpath == candidate.xpath))) {
      changes[outerIter] = undefined;
      parentDeletes.push(candidate);
    } else if (Path.isChildOrSelf(change.xpath, candidate.xpath)) {
      mergeValue = change.mergeRevert(candidate);
    }
    
    if (mergeValue) {
      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("Merge revert change " + changeIndex + " " + outerIter, mergeValue);
      changes[outerIter] = mergeValue[1];

      if (!mergeValue[0]) {
        // Cancellation special case:
        updateXPathFromCancellation(changes, change, changeIndex, outerIter);

        changeIndex = processRevertCancel(changes, candidate, outerIter, parentDeletes);
        if (changeIndex) {
          outerIter = changeIndex;
          change = changes[changeIndex];
          changes[changeIndex] = undefined;
          continue;
        } else {
          return;
        }
      }

      change = mergeValue[0];
    } else {
      // We are only merging a particular change and do not need to do a full 
      // merge outside of this path, but we do need to make sure that xpaths
      // are up to date
      // Check to see if we update the candidate
      updatedXPath = change.getRevertXPath(candidate);
      
      // Check to see if the candidate updates us
      if (!updatedXPath) {
        updatedXPath = candidate.getMergedXPath(change);
        if (updatedXPath) {
          change = change.cloneOnXPath(updatedXPath);
          changes[changeIndex] = change;
        }
      }
    }
  }

  for (outerIter = changeIndex + 1; outerIter < changes.length; outerIter++) {
    candidate = changes[outerIter];
    if (!candidate) {
      continue;
    }
    updatedXPath = change.getRevertXPath(candidate);
    if (updatedXPath) {
      changes[outerIter] = candidate.cloneOnXPath(updatedXPath);
    }
  }

  return change;
}

/**
 * Lookup the next change that we may have to revert to fully revert the
 * element in question to the previous state.
 */
function processRevertCancel(changes, change, curIndex, parentDeletes) {
  for (; curIndex < changes.length; curIndex++) {
    var candidate = changes[curIndex];
    if (!candidate) {
      continue;
    }
    
    // Check for the applies to case
    if (change.affectsCancellation(candidate)) {
      return curIndex;
    }
    
    // Check for the parent delete case
    if (candidate.isElementRemoved()
        && Path.isChild(candidate.xpath, change.xpath)) {
      changes[curIndex] = undefined;
      parentDeletes.push(candidate);
    }
    
    // Update xpaths as necessary
    var updatedXPath = candidate.getMergedXPath(change);
    if (updatedXPath) {
      change = change.cloneOnXPath(updatedXPath);
    }
  }
};

function updateXPathFromCancellation(changes, change, changeIndex, outerIter) {
  // Update any changes that happened between the current change and the
  // cancellation change so their xpath acts as though these changes
  // never existed
  for (var cancelIter = changeIndex + 1; cancelIter < outerIter; cancelIter++) {
    if (changes[cancelIter]) {
      var updatedXPath = change.getRevertXPath(changes[cancelIter]);
      if (updatedXPath) {
        changes[cancelIter] = changes[cancelIter].cloneOnXPath(updatedXPath);
      }
    }
  }
}
function getChangeIndex(changes, change) {
  if (!change) {
    return 0;
  }
  for (var i = 0; i < changes.length && changes[i] != change; i++) {
    /* NOP */
  }
  return i;
}

}});