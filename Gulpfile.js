// Common
const path = require('path');
const del = require('del');

// Package
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('./package.json'));

// Gulp
const gulp = require('gulp');

// Plugins
const autoprefixer = require('gulp-autoprefixer');
const cleancss = require('gulp-clean-css');
const concat = require('gulp-concat');
const fontAwesome = require('node-font-awesome');
const imagemin = require('gulp-imagemin');
const sass = require('gulp-sass');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const util = require('gulp-util');
const watch = require('gulp-watch');

gulp.task('metalsmith', () => {
	const Metalsmith = require('metalsmith');
	const assets = require('metalsmith-assets');
	const branch = require('metalsmith-branch');
	const collections = require('metalsmith-collections');
	const drafts = require('metalsmith-drafts');
	const htmlMinifier = require('metalsmith-html-minifier');
	const inPlace = require('metalsmith-in-place');
	const markdown = require('metalsmith-markdown');
	const pagination = require('metalsmith-pagination');
	const permalinks = require('metalsmith-permalinks');

	const m = Metalsmith(__dirname)
		.metadata(pkg.settings.meta)
		.source(pkg.settings.src.content)
		.destination(pkg.settings.dist.site)
		.clean(true)
		.use(markdown())
		.use(permalinks({
			relative: false
		}))
		.use(inPlace({}))
		.build((err) => {
			if (err) throw err;
		});
});

gulp.task('scripts', () => {
	return gulp.src([pkg.settings.src.scripts])
		.pipe(sourcemaps.init())
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(path.join(__dirname, pkg.settings.dist.assets)));
});

gulp.task('styles', () => {
	return gulp.src([pkg.settings.src.styles])
		.pipe(sourcemaps.init())
		.pipe(concat('app.min.css'))
		.pipe(sass({
			includePaths: [fontAwesome.scssPath]
		}).on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(cleancss())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(path.join(__dirname, pkg.settings.dist.assets)));
});

// Rebuild when files change.
gulp.task('watch', () => {
	watch(['Gulpfile.js', 'package.json'], ['default']);
	watch([pkg.settings.src.styles + '/**/*'], ['styles']);
	watch([pkg.settings.src.scripts + '/**/*'], ['scripts']);
	watch([
		pkg.settings.src.content + '/**/*',
		pkg.settings.src.layouts + '/**/*',
		pkg.settings.dist.assets + '/**/*'
	], ['metalsmith']);
});

// Serve the built files and ensure that the watch
// task is running so that they are always up-to-date.
gulp.task('server', ['default', 'watch'], (callback) => {
	const http = require('http');
	const serveStatic = require('serve-static');
	const finalhandler = require('finalhandler');

	const serve = serveStatic(pkg.settings.dist.site, {
		"index": ['index.html', 'index.htm']
	});

	const server = http.createServer((req, res) => {
		const done = finalhandler(req, res);
		serve(req, res, done);
	});

	server.listen(8000, () => {
		console.log('Running: http://localhost:8000');
		callback();
	});
});

// By default, just build the website.
gulp.task('default', ['scripts', 'styles', 'metalsmith'])
