<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns="http://www.w3.org/1999/xhtml" xmlns:h="http://www.w3.org/1999/xhtml">

<xsl:template match="/">
<html>
  <body>
    <h1>Test console...</h1>
    <!-- Change the location of the Firebug Lite source below if needed -->
    <script type="text/javascript">
    (function(F,i,r,e,b,u,g,L,I,T,E){
        if(F.getElementById(b))return;
        E=F.documentElement.namespaceURI;
        E=E?F[i+'NS'](E,'script'):F[i]('script');
        //E=F[i]('script');
        E[r]('id',b);
        E[r]('src',I+g+T);
        E[r](b,u);
        (F[e]('head')[0]||F[e]('body')[0]).appendChild(E);
        E=new Image;
        E[r]('src',I+L);
    })(
        document,
        'createElement',
        'setAttribute',
        'getElementsByTagName',
        'FirebugLite',
        '1.3.0.3',
        'firebug-lite-beta.js',
        'releases/lite/latest/skin/xp/sprite.png',
        'https://getfirebug.com/',
        '#startOpened'
    );
    </script>
  </body>
</html>   
</xsl:template>

</xsl:stylesheet>