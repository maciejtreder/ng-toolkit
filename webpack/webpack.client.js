const { root } = require('./helpers');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ScriptExtPlugin = require('script-ext-html-webpack-plugin');

module.exports = {
  entry: root('./src/main.browser.ts'),
  output: {
    filename: 'client.js'
  },
  target: 'web',
  plugins: [
    new HtmlWebpackPlugin({
      template: root('./src/index.html'),
      output: root('dist'),
      inject: 'head'
    }),
    new ScriptExtPlugin({
      defaultAttribute: 'defer'
    })
  ]
};
