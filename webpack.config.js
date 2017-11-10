const webpackMerge = require('webpack-merge');
const commonPartial = require('./webpack/webpack.common');
const clientPartial = require('./webpack/webpack.client');
const serverPartial = require('./webpack/webpack.server');
const prodPartial = require('./webpack/webpack.prod');
const dllPartial = require('./webpack/webpack.dll');
const testPartial = require('./webpack/webpack.test');
const { getAotPlugin } = require('./webpack/webpack.aot');

module.exports = function (options, webpackOptions) {
     options = options || {};
    webpackOptions = webpackOptions || {};

    const configs = [];

      if (options.aot) {
          console.log(`Running build for ${options.client ? 'client' : 'server'} with AoT Compilation`)
      }

      const serverConfig = webpackMerge({}, commonPartial(options), serverPartial, {
          entry: options.aot ? './src/main.server.aot.ts' : serverPartial.entry, // Temporary
          plugins: [
              getAotPlugin('server', !!options.aot)
          ]
      });

      var clientConfig = webpackMerge({}, commonPartial(options), clientPartial, {
          plugins: [
              getAotPlugin('client', (!!options.aot))
          ]
      });

      if (webpackOptions.p) {
          clientConfig = webpackMerge({}, clientConfig, prodPartial);
      }

      if (options.dll) {
          configs.push(webpackMerge({}, commonPartial(options), dllPartial, {
              plugins: [
                  getAotPlugin('client', true)
              ]
          }));
      }
      if (options.server) {
          configs.push(serverConfig);
      }
      if (options.client) {
          configs.push(clientConfig);
      }
      if (options.test) {
          configs.push(webpackMerge({}, testPartial));
      }
  return configs;
}
