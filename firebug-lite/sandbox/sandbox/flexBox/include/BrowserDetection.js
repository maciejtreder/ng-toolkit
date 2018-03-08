/* See license.txt for terms of usage */

define(function() { 
// ************************************************************************************************

// ************************************************************************************************
// Locals

var userAgent = navigator.userAgent.toLowerCase();
var version = (userAgent.match( /.+(?:ox|it|ra|ie)[\/: ]([\d.]+)/ ) || [0,'0'])[1];
var versionNumber = parseInt(version);

//************************************************************************************************
// BrowserDetection

var BrowserDetection =
{
    version : version,
    Firefox : /firefox/.test(userAgent) && versionNumber,
    Opera   : /opera/.test(userAgent) && versionNumber,
    Safari  : /webkit/.test(userAgent) && versionNumber,
    IE      : /msie/.test(userAgent) && !/opera/.test(userAgent) && versionNumber,
    IE6     : /msie 6/i.test(navigator.appVersion)
};

//************************************************************************************************

return BrowserDetection;

// ************************************************************************************************
});