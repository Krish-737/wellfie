const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin'); // 1. Import Terser
const webpack = require('webpack');
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile), override: false });

const paths = {
  src: path.resolve(__dirname, 'src'),
  build: path.resolve(__dirname, 'dist'),
  html: path.resolve(__dirname, 'src/index.html'),
  icon: path.resolve(__dirname, 'src/favicon.ico'),
  node_modules: path.resolve(__dirname, 'node_modules'),
};

function common() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    output: {
      publicPath: '/',
    },
    devtool: 'cheap-module-source-map',
    devServer: {
      hot: true,
      port: 8000,
      https: false,
      host: 'localhost',
      disableHostCheck: true,
      historyApiFallback: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      ...(!process.env.BACKEND_URL && {
        proxy: {
          '/auth/oauth': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/login': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/signup': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/me': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/api':      { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/payments': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/reports':  { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/health':   { target: 'http://localhost:8001', secure: false, changeOrigin: true },
        },
      }),
    },
    target: 'web',
    entry: [paths.src],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [paths.node_modules, paths.src],
    },
    experiments: { asyncWebAssembly: true },
    optimization: {
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          parallel: false, // 2. Prevents worker threads from overloading Netlify's RAM
        }),
      ],
    },
    module: {
      rules: [
        { test: /\.tsx?$/, loader: 'ts-loader' },
        {
          test: /\.svg$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'static/assets/[name].[ext]',
                esModule: false,
              },
            },
          ],
          exclude: paths.node_modules,
        },
        {
          test: /\.(png|jpe?g)$/i,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: 'static/assets/[name].[ext]',
                esModule: false,
              },
            },
          ],
          exclude: paths.node_modules,
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.BIOSENSE_LICENSE_KEY': JSON.stringify(process.env.BIOSENSE_LICENSE_KEY || ''),
        'process.env.BACKEND_URL': JSON.stringify(process.env.BACKEND_URL || ''),
      }),
      new HtmlWebpackPlugin({ template: paths.html, favicon: paths.icon }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(paths.node_modules, '@biosensesignal/web-sdk/dist'),
            to: path.resolve(paths.build),
            globOptions: {
             ignore: ['**/main.*', '**/_headers', '**/_redirects']
            },
          },
          { from: path.resolve(paths.src, '_headers'), to: paths.build },
          { from: path.resolve(paths.src, '_redirects'), to: paths.build },
        ],
      }),
    ],
  };
}

module.exports = () => common();
