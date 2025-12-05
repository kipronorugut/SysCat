const path = require('path');

module.exports = [
  // Main process
  {
    entry: './src/main/index.ts',
    target: 'electron-main',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.main.json' } }],
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'index.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    mode: process.env.NODE_ENV || 'development',
    devtool: 'source-map',
  },
  // Preload script
  {
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: /src/,
          use: [{ loader: 'ts-loader', options: { configFile: 'tsconfig.main.json' } }],
        },
      ],
    },
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'preload.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: {
      __dirname: false,
      __filename: false,
    },
    mode: process.env.NODE_ENV || 'development',
    devtool: 'source-map',
  },
];
