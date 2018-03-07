const { root } = require('./helpers');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {DllReferencePlugin} = require('webpack');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');
const webpack = require('webpack');

module.exports = function(options) {
    const plugins = [];
    if (!options.dll && !options.aot && options.client) {
        plugins.push(
            new DllReferencePlugin({
                context: '.',
                manifest: require('../dll/vendor-manifest.json')
            }),
            new DllReferencePlugin({
                context: '.',
                manifest: require('../dll/polyfills-manifest.json')
            }),
            new AddAssetHtmlPlugin({ filepath: require.resolve('../dll/vendor.dll') }),
            new AddAssetHtmlPlugin({ filepath: require.resolve('../dll/polyfills.dll') }),
            new CopyWebpackPlugin( [{from: 'src/ngsw-worker.js', to: '.'}])
        )
    }

    plugins.push(
        new CopyWebpackPlugin([
                { from: 'src/assets', to: 'assets', ignore: ".DS_Store" }, //ignore system-specific files
                { from: 'src/styles', ignore: "*.scss" }, //ignore system-specific files
            ]
        ),
        new webpack.DefinePlugin({
            FIREBUG: !!options.firebug
        })
    );

  return {
        devtool: 'source-map',
            resolve: {
        extensions: ['.ts', '.js']
    },
        output: {
            path: root('dist')
        },
        module: {
            rules: [
                {
                    test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ngfactory|\.ts)$/, loaders: (!!options.aot || !!options.dll )?['@ngtools/webpack']:[
                        '@angularclass/hmr-loader',
                        options.server?'awesome-typescript-loader?{configFileName: "tsconfig.server.json"}': 'awesome-typescript-loader?{configFileName: "tsconfig.browser.json"}',
                        'angular2-template-loader',
                        'angular-router-loader?loader=system&genDir=compiled&aot=false'
                    ]},
                { test: /\.css$/, loader: 'raw-loader' },
                { test: /\.html$/, loader: 'raw-loader' },
                {
                    test: /\.s[ca]ss$/,
                    exclude: [/node_modules/, /src\/styles/],
                    loaders: ['raw-loader', 'sass-loader']
                },
                {
                    test: /\.(jpg|png|gif|ttf)$/,
                    use: 'file-loader'
                }
            ]
        },
        plugins: plugins
    };
}
