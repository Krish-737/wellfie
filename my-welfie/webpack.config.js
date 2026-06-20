const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const paths = {
  src: path.resolve(__dirname, 'src'),
  build: path.resolve(__dirname, 'dist'),
  html: path.resolve(__dirname, 'src/index.html'),
  icon: path.resolve(__dirname, 'src/favicon.ico'),
  node_modules: path.resolve(__dirname, 'node_modules'),
  sdkDist: path.resolve(__dirname, 'node_modules/@biosensesignal/web-sdk/dist'),
};

function common() {
  return {
    mode: 'development',
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
      historyApiFallback: true,// SPA routes (/auth/callback, /dashboard, …)
      
      contentBase: [
        paths.build, // default — serve from dist/ when it exists
        paths.sdkDist, // serve SDK assets (a.wasm.gz, a.worker.js, models/) from /
      ],

      before: (app) => {
        // ── SDK asset URL rewriter ────────────────────────────────────────────
        // The BioSense SDK's internal webpack sets publicPath = "./" so every
        // chunk / model / WASM request resolves relative to the current page
        // URL.  When the page is at /kiosk/:id/scan the browser asks for
        //   /kiosk/:id/scan/a.wasm.gz
        //   /kiosk/:id/scan/models/hemoglobin_60_fps_8bit.model.ios.bin
        // instead of the root-level paths where contentBase actually serves
        // them.  This middleware rewrites those requests to the root.
        const SDK_ASSET_RE = /\/(a\.wasm\.gz|a\.worker\.js|a\.js|799\.js|models\/[^?#]+)(\?.*)?$/;
        app.use((req, res, next) => {
          const match = req.url.match(SDK_ASSET_RE);
          if (match) {
            req.url = '/' + match[1] + (match[2] || '');
          }
          next();
        });

        // Serve .gz files with correct Content-Encoding so the browser
        // automatically decompresses the WASM binary.
        app.get('*.gz', (req, res, next) => {
          res.set('Content-Encoding', 'gzip');
          if (req.url.endsWith('.wasm.gz')) {
            res.set('Content-Type', 'application/wasm');
          } else if (req.url.endsWith('.js.gz')) {
            res.set('Content-Type', 'application/javascript');
          }
          next();
        });
      },

      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      // Proxy API calls to the backend so HTTPS→HTTP mixed-content is avoided.
      // Only active in local dev (no BACKEND_URL set); ngrok mode uses BACKEND_URL directly.
      ...(!process.env.BACKEND_URL && {
        proxy: {
          // Proxy only backend auth routes — NOT /auth/callback (frontend OAuth landing).
          '/auth/oauth': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/login': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/signup': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/auth/me': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/api':      { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/payments': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/reports':  { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          
          '/health':   { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/kiosk/session': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
          '/kiosk/webhook': { target: 'http://localhost:8001', secure: false, changeOrigin: true },
        },
      }),
    },
    target: 'web',
    entry: [paths.src],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      modules: [paths.node_modules, paths.src],
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    experiments: { asyncWebAssembly: true },
    module: {
      rules: [
        { test: /\.tsx?$/, loader: 'ts-loader' },
        {
          test: /\.css$/,
          exclude: /node_modules/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 0,
              },
            },
          ],
        },
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
        'process.env.GROQ_API_KEY': JSON.stringify(process.env.GROQ_API_KEY || ''),
      }),
      new HtmlWebpackPlugin({ template: paths.html, favicon: paths.icon }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(paths.node_modules, '@biosensesignal/web-sdk/dist'),
            to: path.resolve(paths.build),
            globOptions: {
              ignore: ['**/main.*'],
            },
          },
          {
            from: path.resolve(__dirname, '_headers'),
            to: path.resolve(paths.build, '_headers'),
            toType: 'file',
          },
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(paths.build),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
  };
}

module.exports = () => common();
