const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      clean: true,
      // Use relative paths for CEP file:// protocol compatibility
      publicPath: isProd ? './' : '/',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isProd ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
          ],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      ...(isProd ? [
        new MiniCssExtractPlugin({ filename: 'styles.css' }),
        // Copy CSInterface.js to dist for CEP
        new CopyPlugin({
          patterns: [
            { from: 'public/CSInterface.js', to: 'CSInterface.js' },
          ],
        }),
      ] : []),
    ],
    devServer: {
      port: 3000,
      hot: true,
      static: './public',
      // Allow Adobe CEP to connect to dev server
      allowedHosts: 'all',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    devtool: isProd ? false : 'eval-source-map',
  };
};
