// Generated by generator-react-flask version 1.0.5 on 2017-02-20
var gulp = require('gulp');
var webpack = require('webpack');
var watch = require('gulp-watch');
var less = require('gulp-less');
var autoprefix = new (require('less-plugin-autoprefix'))({ browsers: ['last 2 versions'] });
var cssMinify = require('gulp-clean-css');

var webpackConfig = require('./webpack.config');

function onBuild (name, done) {
  return function (err, stats) {
    if (err) {
      console.log('Error compiling ' + name, err);
    }

    if (stats) {
      console.log(stats.toString({
        colors: true,
        chunkModules: false
      }));
    }

    if (done) {
      done();
    }
  };
}

gulp.task('js:compile', function (done) {
  webpack(webpackConfig, onBuild('js', done));
});

gulp.task('js:prod', function (done) {
  var prodConfig = Object.create(webpackConfig);
  prodConfig.plugins = prodConfig.plugins.concat(
		new webpack.DefinePlugin({
			'process.env': {
				NODE_ENV: JSON.stringify("production")
			}
		}),
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.UglifyJsPlugin()
	);
  webpack(prodConfig, onBuild('js', done));
});

gulp.task('js:watch', function () {
  webpack(webpackConfig).watch(100, onBuild('js'));
});

gulp.task('css:compile', function () {
  return gulp.src('./src/less/main.less')
    .pipe(less({
      paths: ['.', './node_modules'],
      plugins: [autoprefix]
    }))
    .pipe(cssMinify())
    .pipe(gulp.dest('./static/css'))
});

gulp.task('css:watch', function () {
  return gulp.src('./src/less/main.less')
    .pipe(watch('./src/less/**/*'))
    .pipe(less({
      paths: ['.', './node_modules'],
      plugins: [autoprefix]
    }))
    .pipe(cssMinify())
    .pipe(gulp.dest('./static/css'))
});

gulp.task('compile', ['js:compile', 'css:compile']);
gulp.task('prod',    ['js:prod', 'css:compile']);
gulp.task('watch',   ['js:watch', 'css:watch']);
