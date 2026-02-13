const path = require('path');
const webpack = require('webpack');
const FriendlyErrorsWebpackPlugin = require('@soda/friendly-errors-webpack-plugin');
const { flatMap } = require('lodash');

const { toGlobalName, externals } = require('./externals');
const pkg = require(path.join(process.cwd(), 'package.json'));

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

function moduleNameToPath(libName) {
  return path.resolve(__dirname, '..', 'node_modules', libName);
}

function rules() {
  return {
    js: () => ({
      test: /\.(ts|js)x?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          rootMode: 'upward',
        },
      },
    }),
    css: () => [
      {
        test: /\.css$/,
        include: ['ol', 'react-toastify', 'codemirror'].map(moduleNameToPath),
        use: ['to-string-loader', 'css-loader'],
      },
    ],
    svg: () => ({
      test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
      exclude: [/node_modules/],
      use: 'svg-inline-loader',
    }),
    vfile: () => ({
      test: /node_modules\/vfile\/core\.js/,
      use: [
        {
          loader: 'imports-loader',
          options: {
            type: 'commonjs',
            imports: ['single process/browser process'],
          },
        },
      ],
    }),
  };
}

function plugins() {
  return {
    ignoreEsprima: () =>
      new webpack.IgnorePlugin({ resourceRegExp: /^esprima$/, contextRegExp: /js-yaml/ }),
    friendlyErrors: () => new FriendlyErrorsWebpackPlugin(),
    buffer: () =>
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
  };
}

function stats() {
  if (isProduction) {
    return {
      builtAt: false,
      chunks: false,
      colors: true,
      entrypoints: false,
      errorDetails: false,
      hash: false,
      modules: false,
      timings: false,
      version: false,
      warnings: false,
    };
  }
  return {
    all: false,
  };
}

const umdPath = path.resolve(process.cwd(), 'dist');
const umdDirPath = path.resolve(process.cwd(), 'dist/umd');
const cjsPath = path.resolve(process.cwd(), 'dist/cjs');

function targetOutputs() {
  console.log(`Building [${pkg.name}, library: ${toGlobalName(pkg.name)}]`);
  return {
    umd: {
      path: umdPath,
      filename: `${pkg.name}.js`,
      library: toGlobalName(pkg.name),
      libraryTarget: 'umd',
      libraryExport: toGlobalName(pkg.name),
      umdNamedDefine: true,
      globalObject: 'window',
    },
    umddir: {
      path: umdDirPath,
      filename: `index.js`,
      library: toGlobalName(pkg.name),
      libraryTarget: 'umd',
      libraryExport: toGlobalName(pkg.name),
      umdNamedDefine: true,
      globalObject: 'window',
    },
    cjs: {
      path: cjsPath,
      filename: 'index.js',
      library: toGlobalName(pkg.name),
      libraryTarget: 'window',
    },
  };
}

const umdExternals = Object.keys(pkg.peerDependencies || {}).reduce((previous, key) => {
  if (!externals[key]) throw `Missing external [${key}]`;
  previous[key] = externals[key] || null;
  return previous;
}, {});

/**
 * Use [getConfig({ target:'umd' }), getConfig({ target:'cjs' })] for
 *  getting multiple configs and add the new output in targetOutputs if needed.
 * Default: umd
 */
function baseConfig({ target = isProduction ? 'umd' : 'umddir' } = {}) {
  return {
    context: process.cwd(),
    mode: isProduction ? 'production' : 'development',
    entry: './src',
    output: targetOutputs()[target],
    module: {
      rules: flatMap(Object.values(rules()), rule => rule()),
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json'],
      fallback: { stream: require.resolve('stream-browserify') },
      alias: {
        'decap-cms-app': '@pranaysahith/decap-cms-app',
        'decap-cms-core': '@pranaysahith/decap-cms-core',
        'decap-cms-lib-util': '@pranaysahith/decap-cms-lib-util',
        'decap-cms-lib-widgets': '@pranaysahith/decap-cms-lib-widgets',
        'decap-cms-lib-auth': '@pranaysahith/decap-cms-lib-auth',
        'decap-cms-ui-default': '@pranaysahith/decap-cms-ui-default',
        'decap-cms-ui-auth': '@pranaysahith/decap-cms-ui-auth',
        'decap-cms-locales': '@pranaysahith/decap-cms-locales',
        'decap-cms-backend-github': '@pranaysahith/decap-cms-backend-github',
        'decap-cms-backend-aws-cognito-github-proxy': '@pranaysahith/decap-cms-backend-aws-cognito-github-proxy',
        'decap-cms-backend-gitlab': '@pranaysahith/decap-cms-backend-gitlab',
        'decap-cms-backend-gitea': '@pranaysahith/decap-cms-backend-gitea',
        'decap-cms-backend-bitbucket': '@pranaysahith/decap-cms-backend-bitbucket',
        'decap-cms-backend-azure': '@pranaysahith/decap-cms-backend-azure',
        'decap-cms-backend-git-gateway': '@pranaysahith/decap-cms-backend-git-gateway',
        'decap-cms-backend-test': '@pranaysahith/decap-cms-backend-test',
        'decap-cms-backend-proxy': '@pranaysahith/decap-cms-backend-proxy',
        'decap-cms-media-library-cloudinary': '@pranaysahith/decap-cms-media-library-cloudinary',
        'decap-cms-media-library-uploadcare': '@pranaysahith/decap-cms-media-library-uploadcare',
        'decap-cms-editor-component-image': '@pranaysahith/decap-cms-editor-component-image',
        'decap-cms-widget-string': '@pranaysahith/decap-cms-widget-string',
        'decap-cms-widget-number': '@pranaysahith/decap-cms-widget-number',
        'decap-cms-widget-text': '@pranaysahith/decap-cms-widget-text',
        'decap-cms-widget-image': '@pranaysahith/decap-cms-widget-image',
        'decap-cms-widget-file': '@pranaysahith/decap-cms-widget-file',
        'decap-cms-widget-datetime': '@pranaysahith/decap-cms-widget-datetime',
        'decap-cms-widget-list': '@pranaysahith/decap-cms-widget-list',
        'decap-cms-widget-object': '@pranaysahith/decap-cms-widget-object',
        'decap-cms-widget-relation': '@pranaysahith/decap-cms-widget-relation',
        'decap-cms-widget-boolean': '@pranaysahith/decap-cms-widget-boolean',
        'decap-cms-widget-map': '@pranaysahith/decap-cms-widget-map',
        'decap-cms-widget-select': '@pranaysahith/decap-cms-widget-select',
        'decap-cms-widget-markdown': '@pranaysahith/decap-cms-widget-markdown',
        'decap-cms-widget-code': '@pranaysahith/decap-cms-widget-code',
        'decap-cms-widget-colorstring': '@pranaysahith/decap-cms-widget-colorstring',
        'decap-cms-default-exports': '@pranaysahith/decap-cms-default-exports',
      },
    },
    plugins: Object.values(plugins()).map(plugin => plugin()),
    devtool: isTest ? '' : 'source-map',
    target: 'web',

    /**
     * Exclude peer dependencies from package bundles.
     */
    externals:
      target.slice(0, 3) === 'umd'
        ? umdExternals
        : (context, request, cb) => {
            const externals = Object.keys(pkg.peerDependencies || {});

            function isPeerDep(dep) {
              return new RegExp(`^${dep}($|/)`).test(request);
            }

            return externals.some(isPeerDep) ? cb(null, request) : cb();
          },
    stats: stats(),
  };
}

function getConfig({ baseOnly = false } = {}) {
  if (baseOnly) {
    // decap-cms build
    return baseConfig({ target: 'umd' });
  }
  return [baseConfig({ target: 'umd' })];
}

module.exports = {
  getConfig,
  rules: rules(),
  plugins: plugins(),
};
