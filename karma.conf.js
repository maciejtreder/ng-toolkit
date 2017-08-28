module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    files: [
      { pattern: './spec-bundle.js', watched: false }
    ],
    exclude: [
    ],
    preprocessors: {
      './spec-bundle.js': ['webpack', 'sourcemap']
    },
    webpack: require('./webpack/webpack.test')({env: 'test'}),
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['Chrome'],
    singleRun: true,
    concurrency: Infinity
  })
}