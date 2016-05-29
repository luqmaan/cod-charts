var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');
var precss = require('precss');
var autoprefixer = require('autoprefixer');

module.exports = {
  devtool: 'cheap-eval-source-map',
  entry: __dirname + '/src/app.js',
  output: {
    path: __dirname + '/dist',
    filename: 'bundle.js',
    publicPath: '/',
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
        loaders: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      { test: /\.csv$/, loader: 'raw' },
    ],
  },
  postcss: function() {
    return [precss, autoprefixer];
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: __dirname + '/src/index.tmpl.html',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],

  devServer: {
    colors: true,
    historyApiFallback: true,
    inline: true,
    hot: true,
  },
};
