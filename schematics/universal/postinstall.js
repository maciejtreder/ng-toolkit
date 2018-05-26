"use strict";
/* eslint-disable no-console */

var green = "\u001b[32m";
var white = "\u001b[22m\u001b[39m";
var boldCyan = "\u001b[96m\u001b[1m";
var reset = "\u001b[0m";

var output =
    green +
    "\n\nDo you ❤️ @ng-toolkit/serverless? \n\nStar it on GitHub!\n" +
    boldCyan +
    "https://github.com/maciejtreder/ng-toolkit\n" +
    green +
    " \n\nBecome a donor:" +
    white +
    "\n > " +
    boldCyan +
    "https://www.angular-universal-pwa.maciejtreder.com/donors\n" +
    reset;

console.log(output);
