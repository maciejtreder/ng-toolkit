/* 

TODO: 
    - options:
        - alltokens, relevanttokens 
        - comment/jsdoc/spaces flags
        - custom language keywords

    - html parser
    - cssparser
    - allow multiple instances

*/
var parseFile = function(sourceText, allTokens)
{
    var renderTokens = true;
    var debug = false;


    // normalize line breaks
    sourceText = sourceText.replace(/\r\n/g, "\n");
    
    
    var numOfInterruptions = 0;
    var bufferStart = 0;

    var _sourceTextLength = sourceText.length;
    var _lines = sourceText.split("\n");

    var _continuation = {
        main: {line: -1, lineCursor: -1, lineLength: 0},
        deep: {}
    };

    var _tokens = [];
    
    var _NameFirstChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
    var _NameChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";

    var _Keywords = {
    	"break":      "BREAK",
    	"case":       "CASE",
    	"catch":      "CATCH",
    	"const":      "VAR",
    	"continue":   "CONTINUE",
    	"default":    "DEFAULT",
    	"delete":     "DELETE",
    	"do":         "DO",
    	"else":       "ELSE",
    	"false":      "FALSE",
    	"finally":    "FINALLY",
    	"for":        "FOR",
    	"function":   "FUNCTION",
    	"if":         "IF",
    	"in":         "IN",
    	"instanceof": "INSTANCEOF",
    	"new":        "NEW",
    	"null":       "NULL",
    	"return":     "RETURN",
    	"switch":     "SWITCH",
    	"this":       "THIS",
    	"throw":      "THROW",
    	"true":       "TRUE",
    	"try":        "TRY",
    	"typeof":     "TYPEOF",
    	"void":       "VOID",
    	"while":      "WHILE",
    	"with":       "WITH",
    	"var":        "VAR"
    };

    var _Punctuations = {
        ";":   "SEMICOLON",
        ",":   "COMMA",
        "?":   "HOOK",
        ":":   "COLON",
        "||":  "OR",
        "&&":  "AND",
        "|":   "BITWISE_OR",
        "^":   "BITWISE_XOR",
        "&":   "BITWISE_AND",
        "===": "STRICT_EQ",
        "==":  "EQ",
        "=":   "ASSIGN",
        "!==": "STRICT_NE",
        "!=":  "NE",
        "<<":  "LSH",
        "<=":  "LE",
        "<":   "LT",
        ">>>": "URSH",
        ">>":  "RSH",
        ">=":  "GE",
        ">":   "GT",
        "++":  "INCREMENT",
        "--":  "DECREMENT",
        "+":   "PLUS",
        "-":   "MINUS",
        "*":   "MUL",
        "/":   "DIV",
        "%":   "MOD",
        "!":   "NOT",
        "~":   "BITWISE_NOT",
        ".":   "DOT",
        "[":   "LEFT_BRACKET",
        "]":   "RIGHT_BRACKET",
        "{":   "LEFT_CURLY",
        "}":   "RIGHT_CURLY",
        "(":   "LEFT_PAREN",
        ")":   "RIGHT_PAREN"
    };

    var processing = function()
    {
        var next = function()
        {
            // a line is loaded and the cursor is not at the end, so move the
            // cursor one position and return the character at that position
            if (lineText && lineCursor < lineLength - 1)
            {
                lineCursor++
                return lineText.charAt(lineCursor);
            }

            // cursor have reached the end of the stream
            if (line == numOfLines - 1)
            {
                return "(end)";
            }
            
            // if we are here, cursor have reached the end of the line
            
            // add the length of the last line (or the initialized zero value)
            // plus one newline character. The sum bufferStart + lineCursor
            // guives the exact position of the cursor in the source and in
            // the end bufferStart + lineCursor equals to sourceTextLength
            bufferStart += lineLength + 1; 
            
            // load new line and set the cursor back to the beginning
            line++;
            lineCursor = -1;
            lineText = lines[line];
            lineLength = lineText.length;
            
            // return the the new line indicator
            return "(newline)";
        };

        // references to constants
        var Keywords = _Keywords;
        var Punctuations = _Punctuations;
        var NameFirstChars = _NameFirstChars;
        var NameChars = _NameChars ;
        var sourceTextLength = _sourceTextLength;
        
        // references to objects
        var continuation = _continuation;
        var tokens = _tokens;
        var lines = _lines;
        
        // cache number of lines
        var numOfLines = lines.length;

        // internal variables        
        var q; // aux variable to hold quote character, and number conversion
        var str; // variable to hold the token being constructed 
        var start; // the line in which the token has started
        var focus; // the current focus of the iteration. its value will be the current character 
        // being processed, or if a deep interruption happened (the deep loop which parser an
        // individual token has been interrupted) its value will be the first character that 
        // started the token's processing (eg, if it was during a name processing it will
        // be the first letter of the name). This variable allows remembering which deep loop
        // was being executed before interrupting the execution. 
        
        
        // processing continuation state
        var state = continuation.main;

        var line = state.line;              // current line
        var lineCursor = state.lineCursor;  // current cursor (column) position
        var lineText = state.lineText;      // current line's text
        var lineLength = state.lineLength;  // current line's length
        var lastToken = state.lastToken;    // last relevant token generated
        var lastFocus = state.lastFocus;    // last focus before interrupting
        var interrupted = state.interrupted;// deep loop interruption indication
        
        var c = state.c || next();          // current character being processed

        // start measuring current processing time
        var processingTime = new Date().getTime();

        while (c != "(end)")
        {
        
            if (new Date().getTime() - processingTime > 75)
            {
               setTimeout(processing, 25);
               //console.log("interruption #%d - at line %d/%d - cursor %d/%d ", (++numOfInterruptions), line, numOfLines, lineCursor, lineLength);
               break;
            }

            focus = interrupted ? lastFocus : c;
            
            //console.log("focus %o  cursor %d  interrupted %o ", lastFocus, lineCursor, interrupted);
            
            start = line;


            // ************************************************************************************
            // newline
            // ************************************************************************************
            
            if (focus == '(newline)')
            {
                tokens.push({type: "newline", data: null, line: start});
            }
            
            // ************************************************************************************
            // whitespace
            // ************************************************************************************
            
            else if (focus == ' ')
            {
                state = continuation.deep;

                str = state.str || c;

                for (;;)
                {
                    if (new Date().getTime() - processingTime > 75)
                    {
                        lastFocus = focus;
                        interrupted = true;
                        break;
                    }

                    c = next();

                    if (c == "(end)" || c > " ")
                    {
                        interrupted = false;
                        break;
                    }

                    str += c;
                }

                if (!interrupted && str)
                {
                    continuation.deep = {};
                    tokens.push({type: "space", data: str, line: start});
                    
                    debug && console.log("spaces: "+str.length);
                }
                else
                {
                    continuation.deep = {str: str};
                }

                continue;
            }
            
            // ************************************************************************************
            // name
            // ************************************************************************************
            
            else if (NameFirstChars.indexOf(focus) != -1)
            {
                state = continuation.deep;

                str = state.str || c;

                for (;;)
                {
                    if (new Date().getTime() - processingTime > 75)
                    {
                        lastFocus = focus;
                        interrupted = true;
                        break;
                    }

                    c = next();

                    if (NameChars.indexOf(c) == -1) {
                        interrupted = false;
                        break;
                    }

                    str += c;
                }

                if (!interrupted && str)
                {
                    // success
                    continuation.deep = {};
                    
                    if (Keywords[str])
                        tokens.push(lastToken = {type: "keyw", data: str, line: start});
                    else
                        tokens.push(lastToken = {type: "name", data: str, line: start});
                    
                    debug && console.log("name: "+str);
                }
                else
                {
                    continuation.deep = {str: str};
                }

                continue;

            }
            
            // ************************************************************************************
            // number
            // ************************************************************************************

            // A number cannot start with a decimal point. It must start with a digit,
            // possibly '0'.

            else if (focus >= '0' && focus <= '9')
            {
                str = c;
                lineCursor += 1;

                // Look for more digits.

                for (;;) {
                    c = lineText.charAt(lineCursor);
                    if (c < '0' || c > '9') {
                        break;
                    }
                    lineCursor += 1;
                    str += c;
                }

                // Look for a decimal fraction part.

                if (c === '.') {
                    lineCursor += 1;
                    str += c;
                    for (;;) {
                        c = lineText.charAt(lineCursor);
                        if (c < '0' || c > '9') {
                            break;
                        }
                        lineCursor += 1;
                        str += c;
                    }
                }

                // Look for an exponent part.

                if (c === 'e' || c === 'E') {
                    lineCursor += 1;
                    str += c;
                    c = lineText.charAt(lineCursor);
                    if (c === '-' || c === '+') {
                        lineCursor += 1;
                        str += c;
                        c = lineText.charAt(lineCursor);
                    }
                    //if (c < '0' || c > '9') {
                        //make('number', str).error("Bad exponent");
                    //}
                    do {
                        lineCursor += 1;
                        str += c;
                        c = lineText.charAt(lineCursor);
                    } while (c >= '0' && c <= '9');
                }

                // Make sure the next character is not a letter.

                if (c >= 'a' && c <= 'z') {
                    str += c;
                    lineCursor += 1;
                    //make('number', str).error("Bad number");
                }

                // Convert the string value to a number. If it is finite, then it is a good
                // token.

                q = +str;
                if (isFinite(q)) {
                    //result.push(make('number', n));
                    //createToken(str, "NUMB", "DECIMAL"); // TODO: xxxpedro add other types HEX OCTAL
                    tokens.push(lastToken = {type: "numb", data: str, line: start});
                } else {
                    //make('number', str).error("Bad number");
                }

                continue;
            }

            // ************************************************************************************
            // multi-line comment
            // ************************************************************************************

            else if (focus == "/" && lineText.charAt(lineCursor+1) == "*")
            {

                var isJSDOC = lineText.charAt(lineCursor+3);
                isJSDOC = lineText.charAt(lineCursor+2) == "*" &&
                        (isJSDOC != "*" && isJSDOC != "/" || // allow /** but not /** /
                        isJSDOC == "*" && lineText.charAt(lineCursor+4) != "*"); // allow /*** but not /****

                str = "/*";
                next();
                //lineCursor += 2;

                while (true) {
                    c = next();
                    
                    if (c == "(newline)")
                    {
                        if (str)
                            tokens.push({type: "comm", data: str, line: start});
                        
                        tokens.push({type: "newline", data: null, line: start});
                        str = "";
                        continue;
                    }
                    
                    //c = lineText.charAt(lineCursor);
                    str += c;
                    //if (c == "\n") line++;

                    if ( c == "*" && lineText.charAt(lineCursor+1) == "/")
                    {
                        str += "/";
                        next();
                        c = next();
                        //lineCursor += 2;
                        //c = lineText.charAt(lineCursor);
                        break;
                    }
                    //lineCursor++;
                }
                
                //if (isJSDOC) createToken(str, "COMM", "JSDOC");
                //else createToken(str, "COMM", "MULTI_LINE_COMM");
                tokens.push({type: "comm", data: str, line: start});
                
                continue;
            }

            // ************************************************************************************
            // single-line comment
            // ************************************************************************************

            else if (focus === '/' && lineText.charAt(lineCursor + 1) === '/')
            {
                str = c;

                for (;;) {
                    lineCursor++;
                    c = lineText.charAt(lineCursor);
                    //if (c == "\n") line++;

                    //if (c === '\n' || c === '\r' || c === '') {
                    if (!c) {
                        break;
                    }
                    str += c;
                }

                //if (this.keepComments) createToken(str, "COMM", "SINGLE_LINE_COMM");
                //createToken(str, "COMM", "SINGLE_LINE_COMM");
                tokens.push({type: "comm", data: str, line: start});

                continue;
            }

            // ************************************************************************************
            // string
            // ************************************************************************************

            else if (focus === '\'' || focus === '"')
            {
                state = continuation.deep;

                str = state.str || c;
                q = state.q || c;
                //str = c;
                //q = c;
                
                for (;;)
                {
                    if (new Date().getTime() - processingTime > 75)
                    {
                        lastFocus = focus;
                        interrupted = true;
                        //console.log("interruption processing \"string\" at line %d, cursor %d/%d", line, lineCursor, lineLength);
                        break;

                    }
                    
                    lineCursor += 1;
                    c = lineText.charAt(lineCursor);
                    str += c;
                    
                    //if (c < ' ') {
                        //make('string', str).error(c === '\n' || c === '\r' || c === '' ?
                        //    "Unterminated string." :
                        //    "Control character in string.", make('', str));
                    //}

                    // Look for the closing quote.

                    if (c === q)
                    {
                        interrupted = false;
                        break;
                    }

                    // Look for escapement.

                    if (c === '\\')
                    {
                        lineCursor += 1;
                        //if (lineCursor >= lineLength) {
                            //make('string', str).error("Unterminated string");
                        //}
                        c = lineText.charAt(lineCursor);
                        switch (c) {
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
                            //if (lineCursor >= lineLength) {
                                //make('string', str).error("Unterminated string");
                            //}
                            c = parseInt(lineText.substr(lineCursor + 1, 4), 16);
                            //if (!isFinite(c) || c < 0) {
                                //make('string', str).error("Unterminated string");
                            //}
                            c = String.fromCharCode(c);
                            lineCursor += 4;
                            break;
                        }
                    }
                }
                
                if (!interrupted && str)
                {
                    // success
                    continuation.deep = {};
                    
                    lineCursor += 1;
                    //result.push(make('string', str));
                    //createToken(str, "STRN", c === '"' ? "DOUBLE_QUOTE" : "SINGLE_QUOTE");
                    tokens.push(lastToken = {type: "strn", data: str, line: start});
                    c = lineText.charAt(lineCursor);
                }
                else
                {
                    continuation.deep = {str: str, q: q};
                }
                
                continue;
            }

            // ************************************************************************************
            // regular expression
            // ************************************************************************************

            else if (focus == "/")
            {
                var last = lastToken || {};
                var lastData = last.data;
                var lastType = last.type;
                if (
                        !lastToken || lastData != ")" && lastData != "]" && lastType != "numb" && 
                        (lastType != "name" || lastType == "name" && lastData == "return")
                    )
                {

                    str = c;
                    var escapeNext = false;

                    while(true)
                    {
                        lineCursor++;
                        c = lineText.charAt(lineCursor);
                        str += c;

                        if (escapeNext)
                        {
                           escapeNext = false;
                           continue;
                        }

                        if (c == "\\")
                        {
                           escapeNext = true;
                           continue;
                        }

                        if (c == "/")
                        {
                            var nextC = lineText.charAt(lineCursor+1);
                            if (nextC == "g" || nextC == "i")
                            {
                                lineCursor++;
                                c = lineText.charAt(lineCursor);
                                str += c;
                            }

                            break;
                        }
                    }

                    //console.log("REGX " + str);
                    tokens.push(lastToken = {type: "regx", data: str, line: start});

                    lineCursor++;
                    c = lineText.charAt(lineCursor);

                    continue;
                }
            }

            // ************************************************************************************
            // punctuations and/or operators
            // ************************************************************************************

            if (Punctuations[focus])
            {
                str = c;

                while (true)
                {
                    lineCursor++;
                    c = lineText.charAt(lineCursor);
                    
                    //c = next();

                    if (!c || !Punctuations[str+c])
                    //if (!Punctuations[str+c])
                    {
                        break;
                    }

                    str += c;
                }

                //console.log("punc " + str + " : " + line + "  (" + lineCursor + "/" + lineLength + ")");
                tokens.push(lastToken = {type: "punc", data: str, line: start});

                continue;
            }

            // ************************************************************************************
            // fail
            // ************************************************************************************
            c = next();

        }

        continuation.main = {
            c: c,
            line: line,
            lineCursor: lineCursor,
            lineText: lineText,
            lineLength: lineLength,
            lastToken: lastToken,
            interrupted: interrupted,
            lastFocus: lastFocus
        };


        if (c == "(end)")
        {
            var progress = bufferStart + lineCursor;
            
            updateProgress(progress, sourceTextLength);
            
            processingCallback(progress, sourceTextLength, numOfLines);
            
            if(renderTokens)
                render(tokens);
        }
        else
        {
            updateProgress(bufferStart + lineCursor, sourceTextLength);
            
            if (renderTokens && tokens.length>=1000)
                render(tokens);
        }
    };

    var updateProgress = function(progress, total)
    {
        var value = progress/total;
        
        if (!halfProgressReached && value > 0.5)
        {
            halfProgressReached = true;
            progressText.style.color = "#fff";
        }
        
        progressText.innerHTML = Math.round(value*100)+"%";
        progressFill.style.width = Math.round(value*progressBarWidth)+"px";
    };
    
    var processingCallback = function(progress, total, numOfLines)
    {
        totalTime = new Date().getTime() - totalTime;
        
        var text = "Finished in " + (totalTime/1000).toFixed(2) + " seconds" +
                " (" + (totalTime/numOfLines).toFixed(2) + " ms per line) ";
                
        progressText.innerHTML = text;
        
        if (window.console)
        {
            console.log(text);
        }
    };
    
    var tokensRendered = false;
    var render = function(tokens)
    {
        if (tokensRendered)
            return;
        
        tokensRendered = true;
        
        var html = ['<pre class="line">'];
        for (var i=1, count=1000; i<count; i++)
        {
            var tk = tokens[i];
            
            if (!tk) break;
            
            if (tk.type == "newline")
                html.push(' \n</pre><pre class="line">');
            else
                html.push('<span class="'+tk.type+'">'+tk.data+'</span>');
        }
        html.push(' \n</pre>');
        document.getElementById("source").innerHTML = html.join("");
        
        window.tokens = tokens;
    };

    var callbackTimes = 0;

    var totalTime = new Date().getTime();
    
    var progressText = document.getElementById("progressText");
    var progressFill = document.getElementById("progressFill");
    var progressBar = document.getElementById("progressBar");
    var progressBarWidth = progressBar.clientWidth;
    var halfProgressReached = false;
    
    processing();
};
