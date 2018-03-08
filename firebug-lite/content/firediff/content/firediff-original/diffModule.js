/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

var Events = FireDiff.events,
    Path = FireDiff.Path;

function revertChange(curChange, context) {
  var ownerDoc, rootPath;
  if (curChange.changeType == "CSS") {
    rootPath = Path.getTopPath(curChange.xpath);
    ownerDoc = Path.evaluateStylePath(rootPath, context.window.document);
  } else {
    ownerDoc = context.window.document.documentElement;
    rootPath = Path.getElementPath(ownerDoc);
  }

  if (FBTrace.DBG_FIREDIFF) FBTrace.sysout("Revert change", curChange);
  curChange.revert(ownerDoc, rootPath);
}

Firebug.DiffModule = extend(Firebug.ActivableModule, {
    panelName: "firediff",
    
    supportsFirebugEdits: Firebug.Editor.supportsStopEvent,
    
    initialize: function() {
        Firebug.ActivableModule.initialize.apply(this, arguments);
        
        if (Firebug.CSSModule) {
            // Maintain support for older versions of firebug that do not
            // have the CSS change event implementation
            Firebug.CSSModule.addListener(this);
        }
        if (Firebug.HTMLModule) {
          Firebug.HTMLModule.addListener(this);
        }
        if (Firebug.Editor.supportsStopEvent) {
          Firebug.Editor.addListener(this);
        }
    },

    loadedContext: function(context) {
      if (this.isAlwaysEnabled()) {
        this.monitorContext(context);
      }
    },
    onEnabled: function(context) {
      this.monitorContext(context);
    },
    onDisabled: function(context) {
      this.unmonitorContext(context);
    },
    
    //////////////////////////////////////////////
    // Actions
    revertAllChanges: function(change, context) {
      var diffContext = this.getDiffContext(context);
      var changes = diffContext.changes;

      // Revert means everything, not just those that are filtered.
      // Keeping the change model in sync for arbitrary changes is
      // currently out of scope
      //
      // We also rely on filter to be designed such that the model's
      // integrity remains.
      for (var i = changes.length; i > 0; i--) {
        var curChange = changes[i-1];

        revertChange(curChange, context);
        changes.splice(i-1, 1);

        if (change == curChange) {
          break;
        }
      }
    },
    revertChange: function(change, context, force) {
      var diffContext = this.getDiffContext(context);
      var changes = diffContext.changes;
      
      var tempChanges = changes.slice();
      var revert = Events.mergeRevert(change, tempChanges);
      if ((revert.length > 1 || changes.length - tempChanges.length > 1) && !force) {
        return false; 
      }
      
      // Perform the revert
      for (var i = revert.length; i > 0; i--) {
        var curChange = revert[i-1];

        revertChange(curChange, context);
      }
      
      diffContext.changes = tempChanges;
      return revert;
    },
    
    //////////////////////////////////////////////
    // Editor Listener
    onBeginEditing: function(panel, editor, target, value) {
      this.onBeginFirebugChange(target);
      this.onSaveEdit(panel, editor, target, value);
    },
    onSaveEdit: function(panel, editor, target, value, previousValue) {
      // Update the data store used for the HTML editor monitoring
      var diffContext = this.getDiffContext();
      diffContext.htmlEditPath = this.getHtmlEditorPaths(editor);
    },
    onStopEdit: function(panel, editor, target) {
      this.onEndFirebugChange(target);
    },
    
    //////////////////////////////////////////////
    // CSSModule Listener
    onCSSInsertRule: function(styleSheet, cssText, ruleIndex) {
      styleSheet.source = "dispatch";
      this.recordChange(
          new Events.css.CSSInsertRuleEvent(
              styleSheet.cssRules[ruleIndex],
              Events.ChangeSource.FIREBUG_CHANGE));
    },
    onCSSDeleteRule: function(styleSheet, ruleIndex) {
      styleSheet.source = "dispatch";
      this.recordChange(
          new Events.css.CSSRemoveRuleEvent(
              styleSheet.cssRules[ruleIndex],
              Events.ChangeSource.FIREBUG_CHANGE));
    },
    onCSSSetProperty: function(style, propName, propValue, propPriority, prevValue, prevPriority, parent, baseText) {
      if (!style.parentRule) {
        // If we are dealing with an older version of firebug, protect ourselves from this failure and
        // just drop the change completely
        if (!parent)
          return;
        
        // This is a change to the inline style of a particular element, handle this.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=338679
        this.recordChange(
            new Events.dom.DOMAttrChangedEvent(
                parent, MutationEvent.MODIFICATION, "style", style.cssText, baseText,
                undefined, undefined, Events.ChangeSource.FIREBUG_CHANGE));
      } else {
        this.recordChange(
            new Events.css.CSSSetPropertyEvent(
                style.parentRule, propName, propValue, propPriority, prevValue, prevPriority, Events.ChangeSource.FIREBUG_CHANGE));
      }
    },
    
    onCSSRemoveProperty: function(style, propName, prevValue, prevPriority, parent, baseText) {
      if (!style.parentRule) {
        // If we are dealing with an older version of firebug, protect ourselves from this failure and
        // just drop the change completely
        if (!parent)
          return;
        
        // This is a change to the inline style of a particular element, handle this.
        // See: https://bugzilla.mozilla.org/show_bug.cgi?id=338679
        this.recordChange(
            new Events.dom.DOMAttrChangedEvent(
                parent, MutationEvent.MODIFICATION, "style", style.cssText, baseText,
                undefined, undefined, Events.ChangeSource.FIREBUG_CHANGE));
      } else {
        this.recordChange(
            new Events.css.CSSRemovePropertyEvent(
                style.parentRule, propName, prevValue, prevPriority, Events.ChangeSource.FIREBUG_CHANGE));
      }
    },
    
    //////////////////////////////////////////////
    // HTMLModule Listener
    onBeginFirebugChange: function(node, context) {
      var diffContext = this.getDiffContext(context);
      
      diffContext.editTarget = node;
      
      var rep = Firebug.getRepObject(node) || node;
      if (rep instanceof Node) {
        diffContext.editTargetXpath = Path.getElementPath(rep);
      } else if (rep instanceof CSSRule || rep instanceof StyleSheet) {
        diffContext.editTargetXpath = Path.getStylePath(rep);
      } else {
        diffContext.editTargetXpath = undefined;
      }

      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule.onBeginFirebugChange", diffContext.editTarget);
      
      diffContext.editEvents = [];
    },
    
    onEndFirebugChange: function(node, context) {
      var diffContext = this.getDiffContext(context);
      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModile.onEndFirebugChange: " + node, diffContext.editEvents);
      
      var editEvents = diffContext.editEvents;
      if (editEvents.length) {
        editEvents = Events.merge(editEvents, true);
        
        for (var i = 0; i < editEvents.length; i++) {
          var change = editEvents[i];
          // Special case for HTML free edit. It's not pretty but it gets the
          // job done. In the future we may want to consider executing changes
          // in the Firebug editors within ignore blocks, and generating events
          // for the final states, but for now we want to keep the coupling
          // low
          function htmlEditChange() {
            return diffContext.htmlEditPath
                && diffContext.htmlEditPath[0] <= change.xpath
                && change.xpath <= diffContext.htmlEditPath[1];
          }
          function changeApplies() {
            return change.appliesTo(Firebug.getRepObject(diffContext.editTarget) || diffContext.editTarget, diffContext.editTargetXpath);
          }
          if (htmlEditChange() || changeApplies()) {
            change.changeSource = Events.ChangeSource.FIREBUG_CHANGE;
          }
          this.dispatchChange(change);
        }
      }
      
      delete diffContext.editTarget;
      delete diffContext.editTargetXpath;
      delete diffContext.editEvents;
      delete diffContext.htmlEditPath;
    },
    
    //////////////////////////////////////////////
    // Self
    domEventLogger: function(ev, context) {
      if (!this.ignoreNode(ev.target)) {
        var diffContext = this.getDiffContext(context);
        this.recordChange(
            Events.dom.createDOMChange(ev, diffContext.changeSource),
            context);
      }
    },
    charDataChangedEventLogger: function(ev, context) {
      // Filter out char data events whose parents are a firebug object
      var filterNode = ev.target.parentNode;
      if (!this.ignoreNode(ev.target.parentNode)) {
        this.domEventLogger(ev, context);
      }
    },
    attributeChangedEventLogger: function(ev, context) {
        // We only care about attributes that actually change or are created or deleted
        if (ev.attrChange != MutationEvent.MODIFICATION
                || ev.newValue != ev.prevValue) {
            this.domEventLogger(ev, context);
        }
    },
    
    monitorContext: function(context) {
      if (FBTrace.DBG_ACTIVATION || FBTrace.DBG_FIREDIFF) { FBTrace.sysout("DiffModule.monitorContext", context); }
      var diffContext = this.getDiffContext(context);
      if (diffContext.eventLogger)    return;

      diffContext.eventLogger = bind(this.domEventLogger, this, context);
      diffContext.attrEventLogger = bind(this.attributeChangedEventLogger, this, context);
      diffContext.charDataEventLogger = bind(this.charDataChangedEventLogger, this, context);
      
      context.window.addEventListener("DOMNodeInserted", diffContext.eventLogger, true);
      context.window.addEventListener("DOMNodeRemoved", diffContext.eventLogger, true);
      context.window.addEventListener("DOMAttrModified", diffContext.attrEventLogger, true);
      context.window.addEventListener("DOMCharacterDataModified", diffContext.charDataEventLogger, true);
    },
    unmonitorContext: function(context) {
        if (FBTrace.DBG_ACTIVATION || FBTrace.DBG_FIREDIFF) { FBTrace.sysout("DiffModule.unmonitorContext", context); }
        var diffContext = this.getDiffContext(context);
        if (!diffContext.eventLogger)    return;
        
        context.window.removeEventListener("DOMNodeInserted", diffContext.eventLogger, true);
        context.window.removeEventListener("DOMNodeRemoved", diffContext.eventLogger, true);
        context.window.removeEventListener("DOMAttrModified", diffContext.attrEventLogger, true);
        context.window.removeEventListener("DOMCharacterDataModified", diffContext.charDataEventLogger, true);
        
        delete diffContext.eventLogger;
        delete diffContext.attrEventLogger;
        delete diffContext.charDataEventLogger;
    },
    
    ignoreNode: function(node) {
      // Ignore firebug elements and any top level elements that are not the doc element
      return node.firebugIgnore
          || unwrapObject(node).firebugIgnore
          || (node.className || "").indexOf("firebug") > -1
          ||        (node.id || "").indexOf("firebug") > -1
          || (node.hasAttribute && node.hasAttribute("firebugIgnore"));
    },
    
    getHtmlEditorPaths: function(editor) {
      // Select the xpath update range. This is from the first to after the
      // last element in the range (or '}' if there is no sibling after that
      // to simplify the match test)
      //
      // This is not 100%, erroring on the side marking app changes as Firebug changes
      // To fully resolve this, deeper integration with Firebug will be required,
      // most likely in the form of changes to the editors to use diff ignore
      // blocks and generate custom events.
      var elements = editor.editingElements;
      if (elements) {
        var nextEl = getNextElement((elements[1] || elements[0]).nextSibling);
        return [
                Path.getElementPath(elements[0]),
                Path.getElementPath(nextEl) || '}'
            ];
      }
    },
    
    clearChanges: function(context) {
      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule.clearChanges", context);
      
      var diffContext = this.getDiffContext(context);
      diffContext.changes = [];
      
      dispatch(this.fbListeners, "onClearChanges", [context || FirebugContext]);
    },
    
    navNextChange: function(context) {
      dispatch(this.fbListeners, "onNavNextChange", [context || FirebugContext]);
    },
    navPrevChange: function(context) {
      dispatch(this.fbListeners, "onNavPrevChange", [context || FirebugContext]);
    },
    
    ignoreChanges: function(worker, context) {
      // If no context is available failover. This failover is mostly for testing merges.
      var diffContext = this.getDiffContext(context) || {};
      try {
        if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule: Set ignore changes", context);
        diffContext.ignore = true;
        
        worker();
      } finally {
        if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule: Reset ignore changes", context);
        diffContext.ignore = false;
      }
    },
    firebugChanges: function(worker, context) {
      // If no context is available failover. This failover is mostly for testing merges.
      var diffContext = this.getDiffContext(context) || {};
      try {
        if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule: Set firebug changes", context);
        diffContext.changeSource = Events.ChangeSource.FIREBUG_CHANGE;
        
        worker();
      } finally {
        if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule: Reset firebug changes", context);
        delete diffContext.changeSource;
      }
    },
    
    recordChange: function(change, context) {
        if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule.recordChange", change);
        var diffContext = this.getDiffContext(context);
        
        // Ignore if a context does not exist, we are in ignore mode, or the context is not attached
        if (!diffContext || diffContext.ignore || !diffContext.eventLogger)   return;
        
        if (!diffContext.editTarget) {
          this.dispatchChange(change, context);
        } else {
          diffContext.editEvents.push(change);
        }
    },
    dispatchChange: function(change, context) {
      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("DiffModule.dispatchChange", change);
      
      var diffContext = this.getDiffContext(context);
      diffContext.changes.push(change);
      
      dispatch(this.fbListeners, "onDiffChange", [change, context || FirebugContext]);
    },
    
    getChanges: function(context) {
      var diffContext = this.getDiffContext(context);
      return (diffContext && diffContext.changes) || [];
    },
    
    getDiffContext: function(context) {
      context = context || FirebugContext;
      if (!context) {
        return null;
      }
      
      context.diffContext = context.diffContext || { changes: [] };
      return context.diffContext;
    }
});

Firebug.registerActivableModule(Firebug.DiffModule);

}});