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
    webpack: require('./webpack.config')({test: true}),
    reporters: ['progress'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['PhantomJS'],
    singleRun: false,
    concurrency: Infinity
  })
}