var src = false;
var tab = "    ";
var option = {};
var syntax = {};
var xmode = "script";
var prereg = true;
var jsonmode = false;

var errorAt = function(msg, line, from){console.error(msg, line, from)};
var warningAt = function(msg, line, from){console.warn(msg, line, from)};

function F() {}

if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        F.prototype = o;
        return new F();
    };
}


String.prototype.isAlpha = function () {
    return (this >= 'a' && this <= 'z\uffff') ||
        (this >= 'A' && this <= 'Z\uffff');
};

String.prototype.isDigit = function () {
    return (this >= '0' && this <= '9');
};


function is_own(object, name) {
    return Object.prototype.hasOwnProperty.call(object, name);
}


var

//  xmode is used to adapt to the exceptions in html parsing.
//  It can have these states:
//      false   .js script file
//      html
//      outer
//      script
//      style
//      scriptstring
//      styleproperty

        //xmode,
        xquote,

// unsafe comment or string
        ax = /@cc|<\/?|script|\]*s\]|<\s*!|&lt/i,
// unsafe characters that are silently deleted by one or more browsers
        cx = /[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/,
// token
        tx = /^\s*([(){}\[.,:;'"~\?\]#@]|==?=?|\/(\*(jslint|members?|global)?|=|\/)?|\*[\/=]?|\+(?:=|\++)?|-(?:=|-+)?|%=?|&[&=]?|\|[|=]?|>>?>?=?|<([\/=!]|\!(\[|--)?|<=?)?|\^=?|\!=?=?|[a-zA-Z_$][a-zA-Z0-9_$]*|[0-9]+([xX][0-9a-fA-F]+|\.[0-9]*)?([eE][+\-]?[0-9]+)?)/,
// html token
        hx = /^\s*(['"=>\/&#]|<(?:\/|\!(?:--)?)?|[a-zA-Z][a-zA-Z0-9_\-:]*|[0-9]+|--)/,
// characters in strings that need escapement
        nx = /[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/,
        nxg = /[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
// outer html token
        ox = /[>&]|<[\/!]?|--/,
// star slash
        lx = /\*\/|\/\*/,
// identifier
        ix = /^([a-zA-Z_$][a-zA-Z0-9_$]*)$/,
// javascript url
        jx = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i,
// url badness
        ux = /&|\+|\u00AD|\.\.|\/\*|%[^;]|base64|url|expression|data|mailto/i,
// style
        sx = /^\s*([{:#%.=,>+\[\]@()"';]|\*=?|\$=|\|=|\^=|~=|[a-zA-Z_][a-zA-Z0-9_\-]*|[0-9]+|<\/|\/\*)/,
        ssx = /^\s*([@#!"'};:\-%.=,+\[\]()*_]|[a-zA-Z][a-zA-Z0-9._\-]*|\/\*?|\d+(?:\.\d+)?|<\/)/,
// attributes characters
        qx = /[^a-zA-Z0-9+\-_\/ ]/,
// query characters for ids
        dx = /[\[\]\/\\"'*<>.&:(){}+=#]/,

        rx = {
            outer: hx,
            html: hx,
            style: sx,
            styleproperty: ssx
        };


        var character, from, line, s;
        var lines;

// Private lex methods

        function nextLine() {
            var at;
            if (line >= lines.length) {
                return false;
            }
            character = 1;
            s = lines[line];
            line += 1;
            at = s.search(/ \t/);
            if (at >= 0) {
                warningAt("Mixed spaces and tabs.", line, at + 1);
            }
            s = s.replace(/\t/g, tab);
            at = s.search(cx);
            if (at >= 0) {
                warningAt("Unsafe character.", line, at);
            }
            if (option.maxlen && option.maxlen < s.length) {
                warningAt("Line too long.", line, s.length);
            }
            return true;
        }

// Produce a token object.  The token inherits from a syntax symbol.

        function it(type, value) {
            var i, t;
            if (type === '(color)' || type === '(range)') {
                t = {type: type};
            } else if (type === '(punctuator)' ||
                    (type === '(identifier)' && is_own(syntax, value))) {
                t = syntax[value] || syntax['(error)'];
            } else {
                t = syntax[type];
            }
            
            // xxxpedro
            t = {id:type};
            
            t = Object.create(t);
            if (type === '(string)' || type === '(range)') {
                if (jx.test(value)) {
                    warningAt("Script URL.", line, from);
                }
            }
            if (type === '(identifier)') {
                t.identifier = true;
                if (value === '__iterator__' || value === '__proto__') {
                    errorAt("Reserved name '{a}'.",
                        line, from, value);
                } else if (option.nomen &&
                        (value.charAt(0) === '_' ||
                         value.charAt(value.length - 1) === '_')) {
                    warningAt("Unexpected {a} in '{b}'.", line, from,
                        "dangling '_'", value);
                }
            }
            t.value = value;
            t.line = line;
            t.character = character;
            t.from = from;
            i = t.id;
            if (i !== '(endline)') {
                prereg = i &&
                    (('(,=:[!&|?{};'.indexOf(i.charAt(i.length - 1)) >= 0) ||
                    i === 'return');
            }
            return t;
        }
        
var init = function (source) {
    if (typeof source === 'string') {
        lines = source
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .split('\n');
    } else {
        lines = source;
    }
    line = 0;
    nextLine();
    from = 1;
};
        

var token = function () {
    var b, c, captures, d, depth, high, i, l, low, q, t;

    function match(x) {
        var r = x.exec(s), r1;
        if (r) {
            l = r[0].length;
            r1 = r[1];
            c = r1.charAt(0);
            s = s.substr(l);
            from = character + l - r1.length;
            character += l;
            return r1;
        }
    }

    function string(x) {
        var c, j, r = '';

        if (jsonmode && x !== '"') {
            warningAt("Strings must use doublequote.",
                    line, character);
        }

        if (xquote === x || (xmode === 'scriptstring' && !xquote)) {
            return it('(punctuator)', x);
        }

        function esc(n) {
            var i = parseInt(s.substr(j + 1, n), 16);
            j += n;
            if (i >= 32 && i <= 126 &&
                    i !== 34 && i !== 92 && i !== 39) {
                warningAt("Unnecessary escapement.", line, character);
            }
            character += n;
            c = String.fromCharCode(i);
        }
        j = 0;
        for (;;) {
            while (j >= s.length) {
                j = 0;
                if (xmode !== 'html' || !nextLine()) {
                    errorAt("Unclosed string.", line, from);
                }
            }
            c = s.charAt(j);
            if (c === x) {
                character += 1;
                s = s.substr(j + 1);
                return it('(string)', r, x);
            }
            if (c < ' ') {
                if (c === '\n' || c === '\r') {
                    break;
                }
                warningAt("Control character in string: {a}.",
                        line, character + j, s.slice(0, j));
            } else if (c === xquote) {
                warningAt("Bad HTML string", line, character + j);
            } else if (c === '<') {
                if (option.safe && xmode === 'html') {
                    warningAt("ADsafe string violation.",
                            line, character + j);
                } else if (s.charAt(j + 1) === '/' && (xmode || option.safe)) {
                    warningAt("Expected '<\\/' and instead saw '</'.", line, character);
                } else if (s.charAt(j + 1) === '!' && (xmode || option.safe)) {
                    warningAt("Unexpected '<!' in a string.", line, character);
                }
            } else if (c === '\\') {
                if (xmode === 'html') {
                    if (option.safe) {
                        warningAt("ADsafe string violation.",
                                line, character + j);
                    }
                } else if (xmode === 'styleproperty') {
                    j += 1;
                    character += 1;
                    c = s.charAt(j);
                    if (c !== x) {
                        warningAt("Escapement in style string.",
                                line, character + j);
                    }
                } else {
                    j += 1;
                    character += 1;
                    c = s.charAt(j);
                    switch (c) {
                    case xquote:
                        warningAt("Bad HTML string", line,
                            character + j);
                        break;
                    case '\\':
                    case '\'':
                    case '"':
                    case '/':
                        break;
                    case 'b':
                        c = '\b';
                        break;
                    case 'f':
                        c = '\f';
                        break;
                    case 'n':
                        c = '\n';
                        break;
                    case 'r':
                        c = '\r';
                        break;
                    case 't':
                        c = '\t';
                        break;
                    case 'u':
                        esc(4);
                        break;
                    case 'v':
                        c = '\v';
                        break;
                    case 'x':
                        if (jsonmode) {
                            warningAt("Avoid \\x-.", line, character);
                        }
                        esc(2);
                        break;
                    default:
                        warningAt("Bad escapement.", line, character);
                    }
                }
            }
            r += c;
            character += 1;
            j += 1;
        }
    }

    for (;;) {
        if (!s) {
            return it(nextLine() ? '(endline)' : '(end)', '');
        }
        while (xmode === 'outer') {
            i = s.search(ox);
            if (i === 0) {
                break;
            } else if (i > 0) {
                character += 1;
                s = s.slice(i);
                break;
            } else {
                if (!nextLine()) {
                    return it('(end)', '');
                }
            }
        }
//                     t = match(rx[xmode] || tx);
//                     if (!t) {
//                         if (xmode === 'html') {
//                             return it('(error)', s.charAt(0));
//                         } else {
//                             t = '';
//                             c = '';
//                             while (s && s < '!') {
//                                 s = s.substr(1);
//                             }
//                             if (s) {
//                                 errorAt("Unexpected '{a}'.",
//                                         line, character, s.substr(0, 1));
//                             }
//                         }
        t = match(rx[xmode] || tx);
        if (!t) {
            t = '';
            c = '';
            while (s && s < '!') {
                s = s.substr(1);
            }
            if (s) {
                if (xmode === 'html') {
                    return it('(error)', s.charAt(0));
                } else {
                    errorAt("Unexpected '{a}'.",
                            line, character, s.substr(0, 1));
                }
            }
        } else {

//      identifier

            if (c.isAlpha() || c === '_' || c === '$') {
                return it('(identifier)', t);
            }

//      number

            if (c.isDigit()) {
                if (xmode !== 'style' && !isFinite(Number(t))) {
                    warningAt("Bad number '{a}'.",
                        line, character, t);
                }
                if (xmode !== 'style' &&
                         xmode !== 'styleproperty' &&
                         s.substr(0, 1).isAlpha()) {
                    warningAt("Missing space after '{a}'.",
                            line, character, t);
                }
                if (c === '0') {
                    d = t.substr(1, 1);
                    if (d.isDigit()) {
                        if (token.id !== '.' && xmode !== 'styleproperty') {
                            warningAt("Don't use extra leading zeros '{a}'.",
                                line, character, t);
                        }
                    } else if (jsonmode && (d === 'x' || d === 'X')) {
                        warningAt("Avoid 0x-. '{a}'.",
                                line, character, t);
                    }
                }
                if (t.substr(t.length - 1) === '.') {
                    warningAt(
"A trailing decimal point can be confused with a dot '{a}'.",
                            line, character, t);
                }
                return it('(number)', t);
            }
            
            switch (t) {

//      string

            case '"':
            case "'":
                return string(t);

//      // comment

            case '//':
                if (src || (xmode && xmode !== 'script')) {
                    warningAt("Unexpected comment.", line, character);
                } else if (xmode === 'script' && /<\s*\//i.test(s)) {
                    warningAt("Unexpected <\/ in comment.", line, character);
                } else if ((option.safe || xmode === 'script') && ax.test(s)) {
                    warningAt("Dangerous comment.", line, character);
                }
                s = '';
                token.comment = true;
                break;

//      /* comment

            case '/*':
                if (src || (xmode && xmode !== 'script' && xmode !== 'style' && xmode !== 'styleproperty')) {
                    warningAt("Unexpected comment.", line, character);
                }
                if (option.safe && ax.test(s)) {
                    warningAt("ADsafe comment violation.", line, character);
                }
                for (;;) {
                    i = s.search(lx);
                    if (i >= 0) {
                        break;
                    }
                    if (!nextLine()) {
                        errorAt("Unclosed comment.", line, character);
                    } else {
                        if (option.safe && ax.test(s)) {
                            warningAt("ADsafe comment violation.",
                                    line, character);
                        }
                    }
                }
                character += i + 2;
                if (s.substr(i, 1) === '/') {
                    errorAt("Nested comment.", line, character);
                }
                s = s.substr(i + 2);
                token.comment = true;
                break;

//      /*members /*jslint /*global

            case '/*members':
            case '/*member':
            case '/*jslint':
            case '/*global':
            case '*/':
                return {
                    value: t,
                    type: 'special',
                    line: line,
                    character: character,
                    from: from
                };

            case '':
                break;
//      /
            case '/':
                if (token.id === '/=') {
                    errorAt(
"A regular expression literal can be confused with '/='.", line, from);
                }
                /// xxxpedro
                if (prereg) {
                    depth = 0;
                    captures = 0;
                    l = 0;
                    for (;;) {
                        b = true;
                        c = s.charAt(l);
                        l += 1;
                        switch (c) {
                        case '':
                            errorAt("Unclosed regular expression.",
                                    line, from);
                            return;
                        case '/':
                            if (depth > 0) {
                                warningAt("Unescaped '{a}'.",
                                        line, from + l, '/');
                            }
                            c = s.substr(0, l - 1);
                            q = {
                                g: true,
                                i: true,
                                m: true
                            };
                            while (q[s.charAt(l)] === true) {
                                q[s.charAt(l)] = false;
                                l += 1;
                            }
                            character += l;
                            s = s.substr(l);
                            q = s.charAt(0);
                            if (q === '/' || q === '*') {
                                errorAt("Confusing regular expression.",
                                        line, from);
                            }
                            return it('(regexp)', c);
                        case '\\':
                            c = s.charAt(l);
                            if (c < ' ') {
                                warningAt(
"Unexpected control character in regular expression.", line, from + l);
                            } else if (c === '<') {
                                warningAt(
"Unexpected escaped character '{a}' in regular expression.", line, from + l, c);
                            }
                            l += 1;
                            break;
                        case '(':
                            depth += 1;
                            b = false;
                            if (s.charAt(l) === '?') {
                                l += 1;
                                switch (s.charAt(l)) {
                                case ':':
                                case '=':
                                case '!':
                                    l += 1;
                                    break;
                                default:
                                    warningAt(
"Expected '{a}' and instead saw '{b}'.", line, from + l, ':', s.charAt(l));
                                }
                            } else {
                                captures += 1;
                            }
                            break;
                        case '|':
                            b = false;
                            break;
                        case ')':
                            if (depth === 0) {
                                warningAt("Unescaped '{a}'.",
                                        line, from + l, ')');
                            } else {
                                depth -= 1;
                            }
                            break;
                        case ' ':
                            q = 1;
                            while (s.charAt(l) === ' ') {
                                l += 1;
                                q += 1;
                            }
                            if (q > 1) {
                                warningAt(
"Spaces are hard to count. Use {{a}}.", line, from + l, q);
                            }
                            break;
                        case '[':
                            c = s.charAt(l);
                            if (c === '^') {
                                l += 1;
                                if (option.regexp) {
                                    warningAt("Insecure '{a}'.",
                                            line, from + l, c);
                                } else if (s.charAt(l) === ']') {
                                    errorAt("Unescaped '{a}'.",
                                        line, from + l, '^');
                                }
                            }
                            q = false;
                            if (c === ']') {
                                warningAt("Empty class.", line,
                                        from + l - 1);
                                q = true;
                            }
klass:                                  do {
                                c = s.charAt(l);
                                l += 1;
                                switch (c) {
                                case '[':
                                case '^':
                                    warningAt("Unescaped '{a}'.",
                                            line, from + l, c);
                                    q = true;
                                    break;
                                case '-':
                                    if (q) {
                                        q = false;
                                    } else {
                                        warningAt("Unescaped '{a}'.",
                                                line, from + l, '-');
                                        q = true;
                                    }
                                    break;
                                case ']':
                                    if (!q) {
                                        warningAt("Unescaped '{a}'.",
                                                line, from + l - 1, '-');
                                    }
                                    break klass;
                                case '\\':
                                    c = s.charAt(l);
                                    if (c < ' ') {
                                        warningAt(
"Unexpected control character in regular expression.", line, from + l);
                                    } else if (c === '<') {
                                        warningAt(
"Unexpected escaped character '{a}' in regular expression.", line, from + l, c);
                                    }
                                    l += 1;
                                    q = true;
                                    break;
                                case '/':
                                    warningAt("Unescaped '{a}'.",
                                            line, from + l - 1, '/');
                                    q = true;
                                    break;
                                case '<':
                                    if (xmode === 'script') {
                                        c = s.charAt(l);
                                        if (c === '!' || c === '/') {
                                            warningAt(
"HTML confusion in regular expression '<{a}'.", line, from + l, c);
                                        }
                                    }
                                    q = true;
                                    break;
                                default:
                                    q = true;
                                }
                            } while (c);
                            break;
                        case '.':
                            if (option.regexp) {
                                warningAt("Insecure '{a}'.", line,
                                        from + l, c);
                            }
                            break;
                        case ']':
                        case '?':
                        case '{':
                        case '}':
                        case '+':
                        case '*':
                            warningAt("Unescaped '{a}'.", line,
                                    from + l, c);
                            break;
                        case '<':
                            if (xmode === 'script') {
                                c = s.charAt(l);
                                if (c === '!' || c === '/') {
                                    warningAt(
"HTML confusion in regular expression '<{a}'.", line, from + l, c);
                                }
                            }
                        }
                        if (b) {
                            switch (s.charAt(l)) {
                            case '?':
                            case '+':
                            case '*':
                                l += 1;
                                if (s.charAt(l) === '?') {
                                    l += 1;
                                }
                                break;
                            case '{':
                                l += 1;
                                c = s.charAt(l);
                                if (c < '0' || c > '9') {
                                    warningAt(
"Expected a number and instead saw '{a}'.", line, from + l, c);
                                }
                                l += 1;
                                low = +c;
                                for (;;) {
                                    c = s.charAt(l);
                                    if (c < '0' || c > '9') {
                                        break;
                                    }
                                    l += 1;
                                    low = +c + (low * 10);
                                }
                                high = low;
                                if (c === ',') {
                                    l += 1;
                                    high = Infinity;
                                    c = s.charAt(l);
                                    if (c >= '0' && c <= '9') {
                                        l += 1;
                                        high = +c;
                                        for (;;) {
                                            c = s.charAt(l);
                                            if (c < '0' || c > '9') {
                                                break;
                                            }
                                            l += 1;
                                            high = +c + (high * 10);
                                        }
                                    }
                                }
                                if (s.charAt(l) !== '}') {
                                    warningAt(
"Expected '{a}' and instead saw '{b}'.", line, from + l, '}', c);
                                } else {
                                    l += 1;
                                }
                                if (s.charAt(l) === '?') {
                                    l += 1;
                                }
                                if (low > high) {
                                    warningAt(
"'{a}' should not be greater than '{b}'.", line, from + l, low, high);
                                }
                            }
                        }
                    }
                    c = s.substr(0, l - 1);
                    character += l;
                    s = s.substr(l);
                    return it('(regexp)', c);
                }
                return it('(punctuator)', t);

//      punctuator

            case '<!--':
                l = line;
                c = character;
                for (;;) {
                    i = s.indexOf('--');
                    if (i >= 0) {
                        break;
                    }
                    i = s.indexOf('<!');
                    if (i >= 0) {
                        errorAt("Nested HTML comment.",
                            line, character + i);
                    }
                    if (!nextLine()) {
                        errorAt("Unclosed HTML comment.", l, c);
                    }
                }
                l = s.indexOf('<!');
                if (l >= 0 && l < i) {
                    errorAt("Nested HTML comment.",
                        line, character + l);
                }
                character += i;
                if (s[i + 2] !== '>') {
                    errorAt("Expected -->.", line, character);
                }
                character += 3;
                s = s.slice(i + 3);
                break;
            case '#':
                if (xmode === 'html' || xmode === 'styleproperty') {
                    for (;;) {
                        c = s.charAt(0);
                        if ((c < '0' || c > '9') &&
                                (c < 'a' || c > 'f') &&
                                (c < 'A' || c > 'F')) {
                            break;
                        }
                        character += 1;
                        s = s.substr(1);
                        t += c;
                    }
                    if (t.length !== 4 && t.length !== 7) {
                        warningAt("Bad hex color '{a}'.", line,
                            from + l, t);
                    }
                    return it('(color)', t);
                }
                return it('(punctuator)', t);
            default:
                if (xmode === 'outer' && c === '&') {
                    character += 1;
                    s = s.substr(1);
                    for (;;) {
                        c = s.charAt(0);
                        character += 1;
                        s = s.substr(1);
                        if (c === ';') {
                            break;
                        }
                        if (!((c >= '0' && c <= '9') ||
                                (c >= 'a' && c <= 'z') ||
                                c === '#')) {
                            errorAt("Bad entity", line, from + l,
                            character);
                        }
                    }
                    break;
                }
                return it('(punctuator)', t);
            }
        }
    }
};
