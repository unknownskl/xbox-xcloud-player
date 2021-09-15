const path = require('path');

module.exports = {
  entry: {
    xCloudPlayer: './src/Library.ts',
    opusWorker: './src/Worker/Opus.js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.wasm?$/,
        use: 'wasm-loader'
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'dist/assets'),
    // libraryTarget: 'var',
    library: '[name]'
  },
  experiments: {
    asyncWebAssembly: true,
  }
};