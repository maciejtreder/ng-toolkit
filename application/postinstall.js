
const fs = require('fs');
const wget = require('node-wget');
const decompress = require('decompress');
const decompressTargz = require('decompress-targz');

if (!fs.existsSync('./firebug-lite.tar.tgz')) {
  console.log('Downloading firebug.');
  wget({url: 'https://getfirebug.com/releases/lite/latest/firebug-lite.tar.tgz', dest: './'}, () => {
    console.log('Downloaded.');
    decompress('firebug-lite.tar.tgz', '.', {
      plugins: [
        decompressTargz()
      ]
    }).then(() => console.log('Decompressed.'));
  });
}/* eslint-disable no-console */

var green = "\u001b[32m";
var white = "\u001b[22m\u001b[39m";
var boldCyan = "\u001b[96m\u001b[1m";
var reset = "\u001b[0m";

var output =
  green +
  "\n\nDo you ❤️ angular-universal-pwa? \n\nStar this repo on GitHub! \n\nBecome a donor:" +
  white +
  "\n > " +
  boldCyan +
  "https://www.angular-universal-pwa.maciejtreder.com/donors\n" +
  reset;

console.log(output);
