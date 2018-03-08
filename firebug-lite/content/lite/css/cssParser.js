/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

var CssParser = null;

// ************************************************************************************************

// Simple CSS stylesheet parser from:
// https://github.com/sergeche/webkit-css

/**
 * Simple CSS stylesheet parser that remembers rule's lines in file
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */
CssParser = (function(){
    /**
     * Returns rule object
     * @param {Number} start Character index where CSS rule definition starts
     * @param {Number} body_start Character index where CSS rule's body starts
     * @param {Number} end Character index where CSS rule definition ends
     */
    function rule(start, body_start, end) {
        return {
            start: start || 0,
            body_start: body_start || 0,
            end: end || 0,
            line: -1,
            selector: null,
            parent: null,
            
            /** @type {rule[]} */
            children: [],
            
            addChild: function(start, body_start, end) {
                var r = rule(start, body_start, end);
                r.parent = this;
                this.children.push(r);
                return r;
            },
            /**
             * Returns last child element
             * @return {rule}
             */
            lastChild: function() {
                return this.children[this.children.length - 1];
            }
        };
    }
    
    /**
     * Replaces all occurances of substring defined by regexp
     * @param {String} str
     * @return {RegExp} re
     * @return {String}
     */
    function removeAll(str, re) {
        var m;
        while (m = str.match(re)) {
            str = str.substring(m[0].length);
        }
        
        return str;
    }
    
    /**
     * Trims whitespace from the beginning and the end of string
     * @param {String} str
     * @return {String}
     */
    function trim(str) {
        return str.replace(/^\s+|\s+$/g, '');
    }
    
    /**
     * Normalizes CSS rules selector
     * @param {String} selector
     */
    function normalizeSelector(selector) {
        // remove newlines
        selector = selector.replace(/[\n\r]/g, ' ');
        
        selector = trim(selector);
        
        // remove spaces after commas
        selector = selector.replace(/\s*,\s*/g, ',');
        
        return selector;
    }
    
    /**
     * Preprocesses parsed rules: adjusts char indexes, skipping whitespace and
     * newlines, saves rule selector, removes comments, etc.
     * @param {String} text CSS stylesheet
     * @param {rule} rule_node CSS rule node
     * @return {rule[]}
     */
    function preprocessRules(text, rule_node) {
        for (var i = 0, il = rule_node.children.length; i < il; i++) {
            var r = rule_node.children[i],
                rule_start = text.substring(r.start, r.body_start),
                cur_len = rule_start.length;
            
            // remove newlines for better regexp matching
            rule_start = rule_start.replace(/[\n\r]/g, ' ');
            
            // remove @import rules
//            rule_start = removeAll(rule_start, /^\s*@import\s*url\((['"])?.+?\1?\)\;?/g);
            
            // remove comments
            rule_start = removeAll(rule_start, /^\s*\/\*.*?\*\/[\s\t]*/);
            
            // remove whitespace
            rule_start = rule_start.replace(/^[\s\t]+/, '');
            
            r.start += (cur_len - rule_start.length);
            r.selector = normalizeSelector(rule_start);
        }
        
        return rule_node;
    }
    
    /**
     * Saves all lise starting indexes for faster search
     * @param {String} text CSS stylesheet
     * @return {Number[]}
     */
    function saveLineIndexes(text) {
        var result = [0],
            i = 0,
            il = text.length,
            ch, ch2;
            
        while (i < il) {
            ch = text.charAt(i);
            
            if (ch == '\n' || ch == '\r') {
                if (ch == '\r' && i < il - 1 && text.charAt(i + 1) == '\n') {
                    // windows line ending: CRLF. Skip next character 
                    i++;
                }
                
                result.push(i + 1);
            }
            
            i++;
        }
        
        return result;
    }
    
    /**
     * Saves line number for parsed rules
     * @param {String} text CSS stylesheet
     * @param {rule} rule_node Rule node
     * @return {rule[]}
     */
    function saveLineNumbers(text, rule_node, line_indexes, startLine) {
        preprocessRules(text, rule_node);
        
        startLine = startLine || 0;
        
        // remember lines start indexes, preserving line ending characters
        if (!line_indexes)
            var line_indexes = saveLineIndexes(text);

        // now find each rule's line
        for (var i = 0, il = rule_node.children.length; i < il; i++) {
            var r = rule_node.children[i];
            r.line = line_indexes.length + startLine;
            for (var j = 0, jl = line_indexes.length - 1; j < jl; j++) {
                var line_ix = line_indexes[j];
                if (r.start >=  line_indexes[j] && r.start <  line_indexes[j + 1]) {
                    r.line = j + 1 + startLine;
                    break;
                }
            }
            
            saveLineNumbers(text, r, line_indexes);
        }
        
        return rule_node;
    }
    
    return {
        /**
         * Parses text as CSS stylesheet, remembring each rule position inside 
         * text
         * @param {String} text CSS stylesheet to parse
         */
        read: function(text, startLine) {
            var rule_start = [],
                rule_body_start = [],
                rules = [],
                in_comment = 0,
                root = rule(),
                cur_parent = root,
                last_rule = null,
                stack = [],
                ch, ch2;
                
            stack.last = function() {
                return this[this.length - 1];
            };
            
            function hasStr(pos, substr) {
                return text.substr(pos, substr.length) == substr;
            }
                
            for (var i = 0, il = text.length; i < il; i++) {
                ch = text.charAt(i);
                ch2 = i < il - 1 ? text.charAt(i + 1) : '';
                
                if (!rule_start.length)
                    rule_start.push(i);
                    
                switch (ch) {
                    case '@':
                        if (!in_comment) {
                            if (hasStr(i, '@import')) {
                                var m = text.substr(i).match(/^@import\s*url\((['"])?.+?\1?\)\;?/);
                                if (m) {
                                    cur_parent.addChild(i, i + 7, i + m[0].length);
                                    i += m[0].length;
                                    rule_start.pop();
                                }
                                break;
                            }
                        }
                    case '/':
                        // xxxpedro allowing comment inside comment
                        if (!in_comment && ch2 == '*') { // comment start
                            in_comment++;
                        }
                        break;
                        
                    case '*':
                        if (ch2 == '/') { // comment end
                            in_comment--;
                        }
                        break;
                    
                    case '{':
                        if (!in_comment) {
                            rule_body_start.push(i);
                            
                            cur_parent = cur_parent.addChild(rule_start.pop());
                            stack.push(cur_parent);
                        }
                        break;
                        
                    case '}':
                        // found the end of the rule
                        if (!in_comment) {
                            /** @type {rule} */
                            var last_rule = stack.pop();
                            rule_start.pop();
                            last_rule.body_start = rule_body_start.pop();
                            last_rule.end = i;
                            cur_parent = last_rule.parent || root;
                        }
                        break;
                }
                
            }
            
            return saveLineNumbers(text, root, null, startLine);
        },
        
        normalizeSelector: normalizeSelector,
        
        /**
         * Find matched rule by selector.
         * @param {rule} rule_node Parsed rule node
         * @param {String} selector CSS selector
         * @param {String} source CSS stylesheet source code
         * 
         * @return {rule[]|null} Array of matched rules, sorted by priority (most 
         * recent on top)
         */
        findBySelector: function(rule_node, selector, source) {
            var selector = normalizeSelector(selector),
                result = [];
                
            if (rule_node) {
                for (var i = 0, il = rule_node.children.length; i < il; i++) {
                    /** @type {rule} */
                    var r = rule_node.children[i];
                    if (r.selector == selector) {
                        result.push(r);
                    }
                }
            }
            
            if (result.length) {
                return result;
            } else {
                return null;
            }
        }
    };
})();


// ************************************************************************************************

FBL.CssParser = CssParser;

// ************************************************************************************************
}});