/* See license.txt for terms of usage */
var FireDiff = FireDiff || {};

/*
 * Implements the logic necessary to deep clone as CSS object.
 * 
 * Note that this does not clone the CSS value types, so this could
 * introduce some inconsistencies with the stored data model
 */
FireDiff.CSSModel = FBL.ns(function() { with (FBL) {
  function elementEquals(left, right, i) {
    if (left && left.equals) {
      if (!left.equals(right)) {
        if (FBTrace.DBG_FIREDIFF) {
          FBTrace.sysout("Not Equal equals: " + i + " '" + left + "' '" + right + "'");
          FBTrace.sysout("Not Equal", left);
          FBTrace.sysout("Not Equal", right);
        }
        return false;
      }
    } else {
      if (left != right) {
        if (FBTrace.DBG_FIREBUG) {
          FBTrace.sysout("Not Equal ==: " + i + " '" + left + "' '" + right + "'", left);
          FBTrace.sysout("Not Equal", left);
          FBTrace.sysout("Not Equal", right);
        }
        return false;
      }
    }
    return true;
  }
  
  function CloneObject() {}
  CloneObject.prototype = {
    equals: function(test) {
      if (!test)    return false;
      
      var tested = { cssText: true },
          i;
      for (i in this) {
        if (this.hasOwnProperty(i) && !tested[i]) {
          var left = this[i], right = test[i];
          if (!elementEquals(this[i], test[i], i))    return false;
          tested[i] = true;
        }
      }
      for (i in test) {
        if (test.hasOwnProperty(i) && !tested[i]) {
          // We haven't seen it before, so it must not equal
          return false;
        }
      }
      return true;
    },
    isEqualNode: function(node) {
      return this.equals(node);
    },
    clone: function() {
      return cloneCSSObject(this);
    },
    cloneNode: function() {
      return this.clone();
    }
  }
  function ArrayCloneObject(array) {
    this.length = 0;
    for (var i = 0; i < array.length; i++) {
      this.push(cloneCSSObject(array[i]));
    }
  }
  ArrayCloneObject.prototype = {
    // for in interation does not work on built in types, thus we have to
    // selectively extend the array prototype
    push: Array.prototype.push,
    splice: Array.prototype.splice,
    equals: function arrayEquals(right) {
      if (!right || this.length != right.length)    return false;
      for (var i = 0; i < this.length; i++) {
        if (!elementEquals(this[i], right[i], i))    return false;
      }
      return true;
    }
  };
  
  function StyleDeclarationClone(style) {
    this.cssText = style.cssText;
    this.properties = {};
    this.length = 0;

    // Copied from CSS Panel's getRuleProperties implementation
    // TODO : Attempt to unify these as a lib method?
    var lines = this.cssText.match(/(?:[^;\(]*(?:\([^\)]*?\))?[^;\(]*)*;?/g);
    var propRE = /\s*([^:\s]*)\s*:\s*(.*?)\s*(! important)?;?$/;
    var line,i=0;
    while(line=lines[i++]){
      m = propRE.exec(line);
      if(!m)    continue;
      //var name = m[1], value = m[2], important = !!m[3];
      if (m[2]) {
        this.setProperty(m[1], m[2], m[3]);
      }
    }
    
    this.__defineGetter__("cssText", this.generateCSSText);
  }
  StyleDeclarationClone.prototype = extend(CloneObject.prototype, {
    push: Array.prototype.push,
    splice: Array.prototype.splice,
    
    getPropertyValue: function(propertyName) {
      var prop = this.properties[propertyName];
      return prop && prop.value;
    },
    getPropertyPriority: function(propertyName) {
      var prop = this.properties[propertyName];
      return prop && prop.priority;
    },
    setProperty: function(propertyName, value, priority) {
      this.properties[propertyName] = {
          value: value,
          priority: priority || "",
          
          equals: function(right) {
            return right && this.value == right.value && this.priority == right.priority;
          }
      };
      if (this.getPropIndex(propertyName) < 0) {
        this.push(propertyName);
      }
    },
    removeProperty: function(propertyName) {
      var propIndex = this.getPropIndex(propertyName);
      if (propIndex >= 0) {
        this.splice(propIndex, 1);
        delete this.properties[propertyName];
      }
    },
    equals: function(test) {
      return CloneObject.prototype.equals.call(this.properties, test.properties);
    },
    
    generateCSSText: function() {
      var out = [];
      for (var i = 0; i < this.length; i++) {
        out.push(this[i]);
        out.push(": ");
        out.push(this.getPropertyValue(this[i]));
        
        var priority = this.getPropertyPriority(this[i]);
        if (priority) {
          out.push(" ");
          out.push(priority);
        }
        out.push("; ");
      }
      return out.join("");
    },
    getPropIndex: function(propName) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] == propName) {
          return i;
        }
      }
      return -1;
    }
  });

  function MediaListClone(media) {
    ArrayCloneObject.call(this, []);
    
    // To comment on my own confusion, even though my expected is not really spec:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=492925
    for (var i = 0; i < media.length; i++) {
      this.push(media.item(i));
    }
    this.mediaText = media.mediaText;
  }
  MediaListClone.prototype = ArrayCloneObject.prototype;
  
  var RulesClone = ArrayCloneObject;
  
  function StyleSheetClone(sheet) {
    this.type = sheet.type;
    this.disabled = sheet.disabled;
    this.href = sheet.href;
    this.title = sheet.title;
    this.media = new MediaListClone(sheet.media);
    
    this.cssRules = new RulesClone(sheet.cssRules);
  }
  StyleSheetClone.prototype = extend(CloneObject.prototype, {
    insertRule: function(rule, index) {
      // Note: This does not match the CSS object API. Parsing of this will
      //    be overly complicated, so this function differs from the CSS spec
      //    in that it will only accept a pre-parsed CSS clone object
      if (FBTrace.DBG_FIREDIFF)   FBTrace.sysout("StyleSheetClone.insertRule: " + index + " " + rule, this.cssRules);
      this.cssRules.splice(index, 0, rule);
    },
    deleteRule: function(index) {
      this.cssRules.splice(index, 1);
    }
  });
  
  function CSSRuleClone(rule) {
    this.type = rule.type;
    this.cssText = rule.cssText;
  }
  CSSRuleClone.prototype = CloneObject.prototype;
  
  function CSSStyleRuleClone(rule) {
    CSSRuleClone.call(this, rule);
    this.selectorText = rule.selectorText;
    this.style = new StyleDeclarationClone(rule.style);

    this.__defineGetter__("cssText", function() { return this.selectorText + " { " + this.style.cssText + "}" });
  }
  CSSStyleRuleClone.prototype = extend(CSSRuleClone.prototype, {});
  
  function CSSMediaRuleClone(rule) {
    CSSRuleClone.call(this, rule);
    this.cssRules = new RulesClone(rule.cssRules);
    this.media = new MediaListClone(rule.media);
  }
  CSSMediaRuleClone.prototype = extend(CSSRuleClone.prototype, {
    insertRule: StyleSheetClone.prototype.insertRule,
    deleteRule: StyleSheetClone.prototype.deleteRule
  });
  function CSSFontFaceRuleClone(rule) {
    CSSStyleRuleClone.call(this, rule);
    this.selectorText = "@font-face";
  }
  CSSFontFaceRuleClone.prototype = extend(CSSRuleClone.prototype, {});
  
  function CSSImportRuleClone(rule) {
    CSSRuleClone.call(this, rule);
    
    this.href = rule.href;
    this.media = new MediaListClone(rule.media);
    this.styleSheet = new StyleSheetClone(rule.styleSheet);
  }
  CSSImportRuleClone.prototype = extend(CSSRuleClone.prototype, {});
  
  function CSSCharsetRuleClone(rule) {
    CSSRuleClone.call(this, rule);
    this.encoding = rule.encoding;
  }
  CSSCharsetRuleClone.prototype = extend(CSSRuleClone.prototype, {});
  

  function cloneCSSObject(cssRule) {
    if (cssRule instanceof CSSStyleSheet || cssRule instanceof StyleSheetClone) {
      return new StyleSheetClone(cssRule);
    } else if (cssRule instanceof CSSStyleRule || cssRule instanceof CSSStyleRuleClone) {
      return new CSSStyleRuleClone(cssRule);
    } else if (cssRule instanceof CSSMediaRule || cssRule instanceof CSSMediaRuleClone) {
      return new CSSMediaRuleClone(cssRule);
    } else if (cssRule instanceof CSSFontFaceRule || cssRule instanceof CSSFontFaceRuleClone) {
      return new CSSFontFaceRuleClone(cssRule);
    } else if (cssRule instanceof CSSImportRule || cssRule instanceof CSSImportRuleClone) {
      return new CSSImportRuleClone(cssRule);
    } else if (cssRule instanceof CSSCharsetRule || cssRule instanceof CSSCharsetRuleClone) {
      return new CSSCharsetRuleClone(cssRule);
    } else if (cssRule instanceof CSSUnknownRule || cssRule instanceof CSSRuleClone) {
      return new CSSRuleClone(cssRule);
    } else if (cssRule instanceof CSSStyleDeclaration || cssRule instanceof StyleDeclarationClone) {
      return new StyleDeclarationClone(cssRule);
    }
  }
  
  this.StyleSheetClone = StyleSheetClone;
  this.CSSStyleRuleClone = CSSStyleRuleClone;
  this.CSSMediaRuleClone = CSSMediaRuleClone;
  this.CSSFontFaceRuleClone = CSSFontFaceRuleClone;
  this.CSSImportRuleClone = CSSImportRuleClone;
  this.CSSCharsetRuleClone = CSSCharsetRuleClone;
  this.CSSRuleClone = CSSRuleClone;
  this.StyleDeclarationClone = StyleDeclarationClone;
  this.cloneCSSObject = cloneCSSObject;
}});