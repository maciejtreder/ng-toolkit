var debug = false;

// TODO: xxxpedro
FileCache = {};

var KeywordNames = {
	"=break":      "BREAK",
	"=case":       "CASE",
	"=catch":      "CATCH",
	"=const":      "VAR",
	"=continue":   "CONTINUE",
	"=default":    "DEFAULT",
	"=delete":     "DELETE",
	"=do":         "DO",
	"=else":       "ELSE",
	"=false":      "FALSE",
	"=finally":    "FINALLY",
	"=for":        "FOR",
	"=function":   "FUNCTION",
	"=if":         "IF",
	"=in":         "IN",
	"=instanceof": "INSTANCEOF",
	"=new":        "NEW",
	"=null":       "NULL",
	"=return":     "RETURN",
	"=switch":     "SWITCH",
	"=this":       "THIS",
	"=throw":      "THROW",
	"=true":       "TRUE",
	"=try":        "TRY",
	"=typeof":     "TYPEOF",
	"=void":       "VOID",
	"=while":      "WHILE",
	"=with":       "WITH",
	"=var":        "VAR"
};

var PunctuationNames = {
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

TokenReader = {
	keepDocs: true,
	keepWhite: false,
	keepComments: false
};

TokenReader.getRelevantTokens = function(srcFile)
{
	var cache = FileCache[srcFile];
	
	if (cache)
		return cache.relevantTokens;
	else
		return TokenReader.parseFile(srcFile);
};

TokenReader.getAllTokens = function(srcFile)
{
	var cache = JSDOC.FileCache[srcFile];
	
	if (cache)
		return cache.tokens;
	else
		return TokenReader.parseFile(srcFile, true);
};

TokenReader.parseFile = function(srcFile, allTokens)
{
	if(debug) console.time("TokenReader.prototype.tokenize()");

	var text;
	
	try
    {
		text = getResource(srcFile);
	}
	catch(e)
    {
		console.log("Can't read source file '"+srcFile+"': "+e.message);
	}

	var cursor = 0;
	var start = 0;
	var line = 1;
	
	var c;
	var str;
	var q;
	var length = text.length;
	
	var varNameChars = "$_.";
	var puncNames = PunctuationNames;
	
	var tokens = [];
	/**@ignore*/
	tokens.last = function() { return this[this.length-1]; };
	/**@ignore*/
	tokens.lastSym = function() {
		for (var i = this.length-1, e; i >= 0 && (e = this[i]); i--) {
			if (!(e.type == "WHIT" || e.type == "COMM")) return e;
		}
	};
	
	var relevantTokens = [];
	relevantTokens.last = tokens.last;
	relevantTokens.lastSym = tokens.lastSym;
	

	var look = function(n, considerWhitespace) {
		if (typeof n == "undefined") n = 0;
		if (typeof considerWhitespace == "undefined") considerWhitespace = false;
		
		if (cursor+n < 0 || cursor+n >= text.length) {
			var result = new String("");
			result.eof = true;
			return result;
		}
		else if ( considerWhitespace ) {
			var count = 0;
			var i = cursor;
	
			while (true) {
				if (text.charAt(n+i).match(/\s/) ) {
					if (n < 0) i--; else i++;
					continue;
				}
				else {
					return text.charAt(n+i);
				}
			}
		}
		else {
			return text.charAt(cursor+n);
		}
	};
	
	var next = function(n) {
		if (typeof n == "undefined") n = 1;
		if (n < 1) return null;
		
		var pulled = "";
		for (var i = 0; i < n; i++) {
			if (cursor+i < text.length) {
			
				// TODO: xxxpedro line number
				if (text.charAt(cursor+i) == "\n") {
					line++;
				}
				
				pulled += text.charAt(cursor+i);
			}
			else {
				var result = new String("");
				result.eof = true;
				return result;
			}
		}
	
		cursor += n;
		return pulled;
	};
	
	var balance = function(/**String*/start, /**String*/stop) {
		if (!stop) stop = JSDOC.Lang.matching(start);
		
		var token;
		var depth = 0;
		var got = [];
		var started = false;
		
		while ((token = look())) {
			if (token.isa == start) {
				depth++;
				started = true;
			}
			
			if (started) {
				got.push(token);
			}
			
			if (token.isa == stop) {
				depth--;
				if (depth == 0) return got;
			}
			if (!next()) break;
		}
	};

	var createToken = function(data, type, name) {
	
		var token = {
			data: data,
			type: type,
			name: name,
			line: start
		};
		
		token.is = function(what) {
			return this.name === what || this.type === what;
		};
		
		tokens.push(token);
		
		if (name == "JSDOC")
		{
			relevantTokens.push(token);
		}
		else if (type != "COMM" && type != "WHIT")
		{
			relevantTokens.push(token);
		}
		
		return token;
	};
	

	c = text.charAt(cursor);
	
	while (cursor < length) {
	
		start = line;
		//stream.line = line;
		//stream.cursor = cursor;
		
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// Whitespace
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		if (c <= " ")
		{
			str = c;
			cursor++;
			
			if (c == "\n") line++;
			
			while (true) {
				c = text.charAt(cursor);
				if (c == "\n") line++;
				
				if (!c || c > " ")
				{
					break;
				}
				str += c;
				cursor++;
			}
			
			//if (this.collapseWhite) str = " ";
			//if (this.keepWhite) createToken(str, "WHIT", "SPACE");
			createToken(str, "WHIT", "SPACE");
			
			continue;
			
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// names
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		} else if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || varNameChars.indexOf(c) != -1) {
				str = c;
				cursor += 1;
				for (;;) {
						c = text.charAt(cursor);
						if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
								(c >= '0' && c <= '9') || varNameChars.indexOf(c) != -1) {
							str += c;
							cursor += 1;
						} else {
							break;
						}
				}
				
				var name;
				if ((name = KeywordNames[str])) createToken(str, "KEYW", name);
				else createToken(str, "NAME", "NAME");
				
				//console.log("name " + str + " : " + line + "  (" + cursor + "/" + length + ")");
				//result.push(make('name', str));
				
				continue;

		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// number
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		// A number cannot start with a decimal point. It must start with a digit,
		// possibly '0'.

		} else if (c >= '0' && c <= '9') {
			str = c;
			cursor += 1;

			// Look for more digits.

			for (;;) {
				c = text.charAt(cursor);
				if (c < '0' || c > '9') {
					break;
				}
				cursor += 1;
				str += c;
			}

			// Look for a decimal fraction part.

			if (c === '.') {
				cursor += 1;
				str += c;
				for (;;) {
					c = text.charAt(cursor);
					if (c < '0' || c > '9') {
						break;
					}
					cursor += 1;
					str += c;
				}
			}

			// Look for an exponent part.

			if (c === 'e' || c === 'E') {
				cursor += 1;
				str += c;
				c = text.charAt(cursor);
				if (c === '-' || c === '+') {
					cursor += 1;
					str += c;
					c = text.charAt(cursor);
				}
				if (c < '0' || c > '9') {
					//make('number', str).error("Bad exponent");
				}
				do {
					cursor += 1;
					str += c;
					c = text.charAt(cursor);
				} while (c >= '0' && c <= '9');
			}

			// Make sure the next character is not a letter.

			if (c >= 'a' && c <= 'z') {
				str += c;
				cursor += 1;
				//make('number', str).error("Bad number");
			}

			// Convert the string value to a number. If it is finite, then it is a good
			// token.

			n = +str;
			if (isFinite(n)) {
				//result.push(make('number', n));
				createToken(str, "NUMB", "DECIMAL"); // TODO: xxxpedro add other types HEX OCTAL
			} else {
				//make('number', str).error("Bad number");
			}

			continue;

		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// multi-line comment
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		} else if (c == "/" && text.charAt(cursor+1) == "*") {
		
			var isJSDOC = text.charAt(cursor+3);
			isJSDOC = text.charAt(cursor+2) == "*" && 
					(isJSDOC != "*" && isJSDOC != "/" || // allow /** but not /** /
					isJSDOC == "*" && text.charAt(cursor+4) != "*"); // allow /*** but not /****
					
			str = "/*";
			cursor += 2;
			
			while (true) {
				c = text.charAt(cursor);
				str += c;
				if (c == "\n") line++;
				
				if ( c == "*" && text.charAt(cursor+1) == "/")
				{
					str += "/";
					cursor += 2;
					c = text.charAt(cursor);
					break;
				}
				cursor++;
			}
			
			// to start doclet we allow /** or /*** but not /** / or /****
			//if (isJSDOC && this.keepDocs) createToken(str, "COMM", "JSDOC");
			//else if (this.keepComments) createToken(str, "COMM", "MULTI_LINE_COMM", stream );
			
			if (isJSDOC) createToken(str, "COMM", "JSDOC");
			else createToken(str, "COMM", "MULTI_LINE_COMM");
			
			continue;
			
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// single-line comment
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		} else if (c === '/' && text.charAt(cursor + 1) === '/') {
			str = c;
			
			for (;;) {
				cursor++;
				c = text.charAt(cursor);
				if (c == "\n") line++;

				if (c === '\n' || c === '\r' || c === '') {
					break;
				}
				str += c;
			}
		
			//if (this.keepComments) createToken(str, "COMM", "SINGLE_LINE_COMM");
			createToken(str, "COMM", "SINGLE_LINE_COMM");
			
			continue;
		}
		
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// string
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		else if (c === '\'' || c === '"') {
			str = c;
			q = c;
			for (;;) {
				cursor += 1;
				c = text.charAt(cursor);
				str += c;
				
				if (c < ' ') {
					//make('string', str).error(c === '\n' || c === '\r' || c === '' ?
					//    "Unterminated string." :
					//    "Control character in string.", make('', str));
				}

				// Look for the closing quote.

				if (c === q) {
					break;
				}

				// Look for escapement.

				if (c === '\\') {
					cursor += 1;
					if (cursor >= length) {
						//make('string', str).error("Unterminated string");
					}
					c = text.charAt(cursor);
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
						if (cursor >= length) {
							//make('string', str).error("Unterminated string");
						}
						c = parseInt(text.substr(cursor + 1, 4), 16);
						if (!isFinite(c) || c < 0) {
							//make('string', str).error("Unterminated string");
						}
						c = String.fromCharCode(c);
						cursor += 4;
						break;
					}
				}
			}
			cursor += 1;
			//result.push(make('string', str));
			createToken(str, "STRN", c === '"' ? "DOUBLE_QUOTE" : "SINGLE_QUOTE");
			c = text.charAt(cursor);
			continue;
		}
		
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// regular expression
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		
		else if (c == "/")
		{
		
			//console.log("LAST "+( !(last = tokens.lastSym()) || !last.isa == "NUMB" && !last.isa == "NAME" && !last.isa == "RIGHT_PAREN" && !last.isa == "RIGHT_BRACKET" ));
			
			if (
				!(last = relevantTokens.lastSym()) || // there is no last, the regex is the first symbol
				!last.is("NUMB") && !last.is("NAME") && !last.is("RIGHT_PAREN") && !last.is("RIGHT_BRACKET")
				)
			{
			
				str = c;
				var lastC = c;
				
				while(true)
				{
					cursor++;
					c = text.charAt(cursor);
					str += c;
					
					if (c == "/" && lastC != "^" && (lastC != "\\" || (lastC == "\\" && cursor > 2 && text.charAt(cursor-2) == "\\")) )
					{
						break;
					}
					lastC = c;
				}
				
				//console.log("REGX " + str);
				createToken(str, "REGX", "REGX");
							
				cursor++;
				c = text.charAt(cursor);
				
				continue;
			}
		}
		
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		// punctuations and/or operators
		// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
		
		if (puncNames[c])
		{
			str = c;
			 
			while (true)
			{
				cursor++;
				c = text.charAt(cursor);
				
				if (!c || !puncNames[str+c])
				{
					break;
				}
				
				str += c;
			}
			 
			//console.log("punc " + str + " : " + line + "  (" + cursor + "/" + length + ")");
			createToken(str, "PUNC", puncNames[str]);
			
			continue;
		}
			
        if (debug)
		    console.log("UNKNOWN_TOKEN " + str + ":" + line + "=" + cursor + "/" + length);
		
		// if execution reaches here then an error has happened
		createToken(next(), "TOKN", "UNKNOWN_TOKEN");
		
	}
	
	// TODO: xxxpedro performance - cache source
	FileCache[srcFile] = {
		text: text,
		lines: line,
		tokens: tokens,
		relevantTokens: relevantTokens
	};
	
	if (debug) console.timeEnd("TokenReader.prototype.tokenize()");
	
	return allTokens ? tokens : relevantTokens;
};

