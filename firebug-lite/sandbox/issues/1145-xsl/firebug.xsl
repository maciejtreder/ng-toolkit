<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns="http://www.w3.org/1999/xhtml" xmlns:h="http://www.w3.org/1999/xhtml">

<xsl:template match="/">
<html>
  <body>
    <h1>Test console...</h1>
    <!-- Change the location of the Firebug Lite source below if needed -->
    <script type="text/javascript" src="../../../build/firebug-lite-debug.js#startOpened"></script>
    
    <!--
    <script type="text/javascript">
    var script = document.createElementNS(document.documentElement.namespaceURI, "script");
    script.setAttribute("type", "text/javascript");
    script.setAttribute("src", "../../../build/firebug.uncompressed.js#startOpened");
    var body = document.getElementsByTagName("body")[0];
    body.appendChild(script);
    //body.insertBefore(script, body.firstChild);
    </script>
    -->
    <script type="text/javascript">
    /*
    setTimeout(function(){
        console.log("Hello, World.");
    },500);
    /**/
    </script>
  </body>
</html>   
</xsl:template>

</xsl:stylesheet>