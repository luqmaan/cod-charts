var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var precss = require('precss');
var autoprefixer = require('autoprefixer');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: __dirname + '/src/app.js',
  output: {
    path: __dirname + '/dist',
    filename: '[name]-[hash].js',
  },
  resolve: {
    root: path.resolve(__dirname, 'src'),
    extensions: ['', '.js'],
  },
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json' },
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel' },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader', 'postcss-loader'),
      },
      { test: /\.csv$/, loader: 'raw' },
    ],
  },
  postcss: function() {
    return [precss, autoprefixer];
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"',
      },
    }),
    new HtmlWebpackPlugin({
      template: __dirname + '/src/index.tmpl.html',
    }),
    // new webpack.optimize.OccurenceOrderPlugin(),
    // new webpack.optimize.UglifyJsPlugin({
    //   compress: {
    //     unused: true,
    //     dead_code: true,
    //   },
    // }),
    new ExtractTextPlugin('[name]-[hash].css'),
  ],
};
