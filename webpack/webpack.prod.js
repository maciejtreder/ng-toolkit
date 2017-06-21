const UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');
const OptimizeJsPlugin = require('optimize-js-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    plugins: [
        //new OptimizeJsPlugin({
        //    sourceMap: false
        //}),
        //new UglifyJsPlugin({
        //    beautify: false, //prod
        //    sourceMap: true,
        //    output: {
        //        comments: false
        //    }, //prod
        //    mangle: {
        //        screw_ie8: true
        //    }, //prod
        //    compress: {
        //        screw_ie8: true,
        //        warnings: false,
        //        conditionals: true,
        //        unused: true,
        //        comparisons: true,
        //        sequences: true,
        //        dead_code: true,
        //        evaluate: true,
        //        if_return: true,
        //        join_vars: true,
        //        negate_iife: false // we need this for lazy v8
        //    },
        //}),
        new CopyWebpackPlugin([
                { from: 'src/manifest.json', to: './manifest.json' }
            ]
        )
    ]
};
