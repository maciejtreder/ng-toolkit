const {DllPlugin} = require('webpack');
const { root } = require('./helpers');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const extractSass = new ExtractTextPlugin({
    filename: "[name].[contenthash].css",
});

module.exports = {
    entry: {
        vendor: [
            '@angular/animations',
            '@angular/app-shell',
            '@angular/cdk',
            '@angular/common',
            '@angular/compiler',
            '@angular/core',
            '@angular/forms',
            '@angular/http',
            '@angular/material',
            '@angular/platform-browser',
            '@angular/platform-browser-dynamic',
            '@angular/platform-server',
            '@angular/router',
            '@angular/service-worker',
            'rxjs'
        ],
        polyfills: [
            'sockjs-client',
            'core-js/client/shim.js',
            'core-js/es6/reflect.js',
            'core-js/es7/reflect.js',
            'querystring-es3',
            'strip-ansi',
            'url',
            'punycode',
            'events',
            'webpack-dev-server/client/socket.js',
            'webpack/hot/emitter.js',
            'zone.js/dist/long-stack-trace-zone.js'
        ],
        app_assets: [root('./src/main.browser')]
    },
    output: {
        filename: '[name].dll.js',
        path: root('dll'),
        library: '[name]'
    },
    plugins: [
        new DllPlugin({
            path: root('dll/[name]-manifest.json'),
            name: '[name]'
        }),
    ]
}