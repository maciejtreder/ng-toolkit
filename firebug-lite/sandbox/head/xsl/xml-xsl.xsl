<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
xmlns="http://www.w3.org/1999/xhtml" xmlns:h="http://www.w3.org/1999/xhtml">
<!--
<xsl:output method="html" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN"
doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"/>
-->
<xsl:template match="/">
<html>
<body>
<p>Test HEAD</p>
<script type="text/javascript">
alert(document.getElementsByTagName('head').length);
</script>
</body>
</html> 
</xsl:template>

</xsl:stylesheet>