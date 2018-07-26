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
}