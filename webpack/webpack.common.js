const { root } = require('./helpers');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const UglifyJS = require("uglify-es");

const extractSass = new ExtractTextPlugin({
  filename: "[name].[contenthash].css",
});

module.exports = {
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: root('dist')
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: '@ngtools/webpack' },
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
  plugins: [
    new CopyWebpackPlugin([
        { from: 'src/assets', to: 'assets', ignore: "*.ttf" },
        { from: 'src/service-workers/manifest.json', to: './manifest.json' },
        { from: 'src/service-workers/worker-basic.js', to: './worker-basic.min.js', transform: (content, path) => {
          return UglifyJS.minify(content.toString()).code;
        } },
      ]
    ),
      extractSass
  ]
};
