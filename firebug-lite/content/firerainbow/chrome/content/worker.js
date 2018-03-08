// import codemirror
importScripts("chrome://firerainbow/content/codemirror.js");

function run(lines) {
    var nextLine = null;

    var firstLine = "";
    var lineNo = 0;
    while (lineNo<lines.length) {
        firstLine = lines[lineNo];
        firstLine = firstLine.replace(/^\s*|\s*$/g,"");
        if (firstLine!="") break;
        lineNo++;
    }
    // determine what parser to use
    var parserClass = codemirror.JSParser;
    // use HTML mixed parser if you encounter these substrings on first line
    if (firstLine.indexOf('<!DOCTYPE')!=-1 || firstLine.indexOf("<html")!=-1 || firstLine.indexOf("<body")!=-1 || firstLine.indexOf("<head")!=-1) {
        parserClass = codemirror.HTMLMixedParser;
    }
    var parser = parserClass.make(codemirror.stringStream({
        next: function() {
            if (nextLine===null) throw codemirror.StopIteration;
            var result = nextLine;
            nextLine = null;
            return result;
        }
    }));

    var styleLibrary = {};

    var lineToBeColorized = 0;
    while (lineToBeColorized < lines.length) {
        // extract line code from node
        // note: \n is important to simulate multi line text in stream (for example multi-line comments depend on this)
        nextLine = lines[lineToBeColorized]+"\n";

        parsedLine = [];

        codemirror.forEach(parser,
            function(token) {
                // colorize token
                var val = token.value;
                parsedLine.push([token.style, val]);
                styleLibrary[token.style] = true;
            }
        );

        // apply coloring to the line
        postMessage({msg: 'progress', line: lineToBeColorized, stream: parsedLine});

        // move for next line
        lineToBeColorized++;
    }    
    postMessage({msg: 'done', styleLibrary: styleLibrary});
}

onmessage = function(e) {
    switch (e.data.command) {
        case 'run': run(e.data.lines); break;
        default: throw "Unkwnown command for worker!";
    }
};