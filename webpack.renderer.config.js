const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Resolve events package for webpack-dev-server HMR client
let eventsPath = false;
try {
  eventsPath = require.resolve('events');
  console.log('[Webpack] events package found at:', eventsPath);
} catch (e) {
  console.warn('[Webpack] events package not found, using shim');
}

module.exports = {
  // Entry must include polyfills first to ensure EventEmitter is available before webpack-dev-server client
  entry: {
    main: ['./src/renderer/polyfills-entry.ts', './src/renderer/index.tsx'],
  },
  target: 'electron-renderer',
  // Explicitly prevent externalization of events - we need it bundled for webpack-dev-server client
  externals: [],
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
    publicPath: '/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    // Use the actual events package if available, otherwise fall back to shim
    // This ensures webpack-dev-server client can find EventEmitter
    alias: {
      'events': eventsPath || path.resolve(__dirname, 'src/renderer/events-shim.ts'),
    },
    // Provide browser-compatible fallbacks for Node.js modules
    fallback: {
      'events': eventsPath || path.resolve(__dirname, 'src/renderer/events-shim.ts'),
      'util': false,
      'stream': false,
      'buffer': false,
      'path': false,
      'fs': false,
      'crypto': false,
      'http': false,
      'https': false,
      'net': false,
      'tls': false,
      'zlib': false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: 'body',
      // Don't defer - we need scripts to execute in order for polyfills to work
      scriptLoading: 'blocking',
    }),
    // Provide EventEmitter globally - use actual events package if available, otherwise shim
    new webpack.ProvidePlugin({
      EventEmitter: eventsPath 
        ? [eventsPath, 'EventEmitter']
        : [path.resolve(__dirname, 'src/renderer/events-shim.ts'), 'EventEmitter'],
      'events': eventsPath 
        ? eventsPath
        : [path.resolve(__dirname, 'src/renderer/events-shim.ts'), 'EventEmitter'],
    }),
    // Replace all require('events') calls - use actual events package if available
    // This is critical for webpack-dev-server client code and webpack's internal HMR code
    new webpack.NormalModuleReplacementPlugin(
      /^events$/,
      eventsPath || path.resolve(__dirname, 'src/renderer/events-shim.ts')
    ),
    // Define global for webpack-dev-server
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  // Prevent Node.js globals from being used in renderer
  node: {
    __dirname: false,
    __filename: false,
    global: false,
  },
  // Ensure events module is bundled, not externalized
  optimization: {
    minimize: process.env.NODE_ENV === 'production', // Enable minification in production
    // Code splitting for better performance
    splitChunks: process.env.NODE_ENV === 'production' ? {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    } : false,
  },
  devServer: {
    port: 3000,
    hot: true, // Enable HMR now that EventEmitter is properly configured
    liveReload: true,
    historyApiFallback: true,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self' http://localhost:* ws://localhost:* 'unsafe-inline' 'unsafe-eval';",
        "script-src 'self' http://localhost:* ws://localhost:* 'unsafe-inline' 'unsafe-eval';",
        "style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com;",
        "font-src 'self' https://fonts.gstatic.com;",
        "connect-src 'self' http://localhost:* ws://localhost:* https://graph.microsoft.com https://login.microsoftonline.com;",
      ].join(' '),
    },
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'warn',
      webSocketURL: {
        hostname: 'localhost',
        pathname: '/ws',
        port: 3000,
      },
    },
  },
  mode: process.env.NODE_ENV || 'development',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  // Performance hints
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 512000, // 500KB
    maxAssetSize: 512000,
  },
};

