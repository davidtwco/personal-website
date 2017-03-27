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
const runSequence = require('run-sequence');
const uglify = require('gulp-uglify');
const util = require('gulp-util');

// Templates
const nunjucks = require('nunjucks');
nunjucks.configure(pkg.settings.src.layouts, { watch: false });

// Dates
const moment = require('moment');

function formatDate(string) {
	return function(date) {
		return moment(date).utc().format(string);
	};
}

gulp.task('metalsmith', () => {
	const Metalsmith = require('metalsmith');
	const assets = require('metalsmith-assets');
	const branch = require('metalsmith-branch');
	const collections = require('metalsmith-collections');
	const drafts = require('metalsmith-drafts');
	const htmlMinifier = require('metalsmith-html-minifier');
	const layouts = require('metalsmith-layouts');
	const markdown = require('metalsmith-markdown');
	const pagination = require('metalsmith-pagination');
	const permalinks = require('metalsmith-permalinks');

	const m = Metalsmith(__dirname)
		.metadata(pkg.settings.meta)
		.source(pkg.settings.src.content)
		.destination(pkg.settings.dist)
		.clean(true)
		.use(collections({
			projects: {
				pattern: 'projects/**/*.md',
				sortBy: 'date',
				reverse: true
			},
			writings: {
				pattern: 'writings/**/*.md',
				sortBy: 'date',
				reverse: true
			},
			wiki: {
				pattern: 'wiki/**/*.md',
				sortBy: 'title'
			}
		}))
		.use(markdown())
		.use(permalinks({
			relative: false,
			linksets: [{
				match: { collection: 'projects' },
				pattern: 'projects/:title'
			}, {
				match: { collection: 'writings' },
				pattern: 'writings/:date/:title',
				date: formatDate('YYYY')
			}, {
				match: { collection: 'wiki' },
				pattern: 'wiki/:title'
			}]
		}))
		.use(layouts({
			engine: 'nunjucks',
			directory: pkg.settings.src.layouts,
			partials: pkg.settings.src.layouts
		}))
		.use(assets({
			source: pkg.settings.assets,
			dest: '.'
		}))
		.build((err) => {
			if (err) throw err;
		});
});

gulp.task('fonts', function() {
	let outputPath = path.join(__dirname, pkg.settings.assets, 'fonts');
	return gulp.src([
			fontAwesome.fonts,
			pkg.settings.src.fonts + '/**/*'
		])
		.pipe(gulp.dest(outputPath));
});

gulp.task('scripts', () => {
	let outputPath = path.join(__dirname, pkg.settings.assets, 'scripts');
	return gulp.src([
			pkg.settings.src.scripts + '/**/*.js'
		])
		.pipe(sourcemaps.init())
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(outputPath));
});

gulp.task('styles', () => {
	let outputPath = path.join(__dirname, pkg.settings.assets, 'styles');
	return gulp.src([
			'./node_modules/normalize.css/normalize.css',
			pkg.settings.src.styles + '/**/*.scss'
		])
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
		.pipe(gulp.dest(outputPath));
});

// Rebuild when files change.
gulp.task('watch', () => {
	gulp.watch(['Gulpfile.js', 'package.json'], ['default']);
	gulp.watch([pkg.settings.src.fonts + '/**/*'], ['fonts']);
	gulp.watch([pkg.settings.src.styles + '/**/*.scss'], ['styles']);
	gulp.watch([pkg.settings.src.scripts + '/**/*.js'], ['scripts']);
	gulp.watch([
		pkg.settings.src.content + '/**/*.md',
		pkg.settings.src.layouts + '/**/*.njk',
		pkg.settings.assets + '/**/*'
	], ['metalsmith']);
});

// Serve the built files and ensure that the watch
// task is running so that they are always up-to-date.
gulp.task('server', ['default', 'watch'], (callback) => {
	const http = require('http');
	const serveStatic = require('serve-static');
	const finalhandler = require('finalhandler');

	const serve = serveStatic(pkg.settings.dist, {
		"index": ['index.html', 'index.htm']
	});

	const server = http.createServer((req, res) => {
		const done = finalhandler(req, res);
		serve(req, res, done);
	});

	server.listen(8000, () => {
		util.log('Running at http://localhost:8000');
		callback();
	});
});

// By default, just build the website.
gulp.task('default', () => {
	return runSequence(['styles', 'scripts', 'fonts'], 'metalsmith');
});
