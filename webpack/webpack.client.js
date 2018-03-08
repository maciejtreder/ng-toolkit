const { root } = require('./helpers');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ScriptExtPlugin = require('script-ext-html-webpack-plugin');

module.exports = function (options) {

    options = options || {};

    entryFile = options.aot? root('./src/main.browser-aot.ts') : root('./src/main.browser.ts');
    return {
        entry: entryFile,
        output: {
            filename: 'client.js'
        },
        target: 'web',
        devServer: {
            port: 3000,
            historyApiFallback: {
                index: '/'
            }
        },
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
    }
};
