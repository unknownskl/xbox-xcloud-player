const path = require('path');

module.exports = {
  entry: './src/Library.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'xcloud-player.min.js',
    path: path.resolve(__dirname, 'dist/assets'),
    libraryTarget: 'var',
    library: 'xCloudPlayer'
  },
};