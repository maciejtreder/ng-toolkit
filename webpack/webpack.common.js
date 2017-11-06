const { root } = require('./helpers');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const {DllReferencePlugin} = require('webpack');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');

const extractSass = new ExtractTextPlugin({
  filename: "[name].[contenthash].css",
});

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
            new AddAssetHtmlPlugin({ filepath: require.resolve('../dll/polyfills.dll') })
        )
    }

    plugins.push(
        extractSass,
        new CopyWebpackPlugin([
                { from: 'src/assets', to: 'assets', ignore: ".DS_Store" }, //ignore system-specific files
            ]
        )
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
                { test: /\.ts$/, loaders: (!!options.aot || !!options.dll)?['@ngtools/webpack']: [
                    '@angularclass/hmr-loader',
                    'awesome-typescript-loader?{configFileName: "tsconfig.browser.json"}',
                    'angular2-template-loader',
                    'angular-router-loader?loader=system&genDir=compiled&aot=false'
                ] },
                { test: /\.css$/, loader: 'raw-loader' },
                { test: /\.html$/, loader: 'raw-loader' },
                {
                    test: /\.s[ca]ss$/,
                    exclude: [/node_modules/, /src\/styles/],
                    loaders: ['raw-loader', 'sass-loader']
                },
                {
                    test: /\.s[ac]ss$/,
                    use: extractSass.extract({
                        use: [{
                            loader: "css-loader"
                        }, {
                            loader: "sass-loader"
                        }],
                        fallback: "style-loader"
                    }),
                    include: [/src\/styles/]
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
