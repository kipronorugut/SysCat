const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Resolve events package for webpack-dev-server HMR client
let eventsFallback = false;
try {
  eventsFallback = require.resolve('events');
} catch (e) {
  try {
    eventsFallback = require.resolve('events/');
  } catch (e2) {
    console.warn('events package not found, webpack-dev-server HMR may not work properly');
  }
}

module.exports = {
  entry: './src/renderer/index.tsx',
  target: 'electron-renderer',
  // Explicitly prevent externalizing 'events' - we want it bundled
  // Use a function to handle this properly
  externals: (context, request, callback) => {
    // Don't externalize 'events' - bundle it instead
    if (request === 'events') {
      return callback(); // No arguments = don't externalize, bundle it
    }
    // For other modules, allow webpack's default behavior for electron-renderer target
    callback();
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: /src/,
        use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.renderer.json' } }],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'index.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // Provide browser-compatible fallbacks for Node.js modules used by webpack-dev-server
    fallback: {
      'events': eventsFallback || require.resolve('events'),
      'util': false,
      'stream': false,
      'buffer': false,
      'path': false,
      'fs': false,
      'crypto': false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
    }),
    // Provide events module globally to prevent externalization issues
    new webpack.ProvidePlugin({
      EventEmitter: ['events', 'EventEmitter'],
    }),
    // Force webpack to bundle events instead of externalizing
    new webpack.NormalModuleReplacementPlugin(
      /^events$/,
      require.resolve('events')
    ),
    // Note: global polyfill is handled via inline script in index.html
    // which runs before any modules load
  ],
  // Prevent Node.js globals from being used in renderer
  node: {
    __dirname: false,
    __filename: false,
    global: false,
  },
  devServer: {
    port: 3000,
    hot: false, // Disable HMR to avoid events module issues
    liveReload: true, // Use live reload instead
    historyApiFallback: true,
    // Disable client overlay to reduce injected code
    client: {
      overlay: false,
      logging: 'warn',
    },
  },
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
};

