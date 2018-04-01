const decompress = require('decompress');
const decompressTargz = require('decompress-targz');

decompress('firebug-lite.tar.tgz', '.', {
    plugins: [
        decompressTargz()
    ]
}).then(() => {
    console.log('Files decompressed');
});