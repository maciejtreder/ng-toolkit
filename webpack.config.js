const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = function () {
   return {
       entry: './src/main.ts',
       output: {
           path: __dirname + '/dist',
           filename: 'app.js'
       },

       plugins: [
           new HtmlWebpackPlugin({
               template: __dirname + '/src/index.html',
               output: __dirname + '/dist',
               inject: 'head'
           }),
           new CopyWebpackPlugin([
               { from: 'src/assets', to: 'assets'}
           ])
       ]
   };
}

