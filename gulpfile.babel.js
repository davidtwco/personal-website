// Common
import path from 'path';
import del from 'del';

// Package
import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('./package.json'));

// BrowserSync
import {create as bsCreate} from 'browser-sync';
const browserSync = bsCreate();

// Gulp
import gulp from 'gulp';

// Plugins
import autoprefixer from 'gulp-autoprefixer';
import cleancss from 'gulp-clean-css';
import concat from 'gulp-concat';
import fontAwesome from 'node-font-awesome';
import imagemin from 'gulp-imagemin';
import sass from 'gulp-sass';
import uglify from 'gulp-uglify';
import util from 'gulp-util';

// Templates
import nunjucks from 'nunjucks';
nunjucks.configure(pkg.settings.src.layouts, { watch: false });

// Dates
import moment from 'moment';

function formatDate(string) {
	return function(date) {
		return moment(date).utc().format(string);
	};
}

const clean = () => del(pkg.settings.clean);
export { clean };

export function metalsmith(callback) {
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
	callback();
}

export function fonts() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'fonts');
	return gulp.src([
			fontAwesome.fonts,
			pkg.settings.src.fonts + '/**/*'
		], {since: gulp.lastRun(fonts)})
		.pipe(gulp.dest(outputPath));
}

export function scripts() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'scripts');
	return gulp.src([
			pkg.settings.src.scripts + '/**/*.js'
		], {since: gulp.lastRun(scripts), sourcemaps:true})
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest(outputPath));
}

export function styles() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'styles');
	return gulp.src([
			'./node_modules/normalize.css/normalize.css',
			pkg.settings.src.styles + '/**/*.scss'
		], {since: gulp.lastRun(styles), sourcemaps:true})
		.pipe(concat('app.min.css'))
		.pipe(sass({
			includePaths: [fontAwesome.scssPath]
		}).on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(cleancss())
		.pipe(gulp.dest(outputPath));
}

const build = gulp.series(clean, gulp.parallel(styles, scripts, fonts), metalsmith);

export function watch(callback) {
	// Watch for file changes.
	gulp.watch(['Gulpfile.js', 'package.json'],
		gulp.series(build, browserSync.reload));

	gulp.watch([pkg.settings.src.fonts + '/**/*'],
		gulp.series(fonts, metalsmith, browserSync.reload));

	gulp.watch([pkg.settings.src.styles + '/**/*.scss'],
		gulp.series(styles, metalsmith, browserSync.reload));

	gulp.watch([pkg.settings.src.scripts + '/**/*.js'],
		gulp.series(scripts, metalsmith, browserSync.reload));

	gulp.watch([
		pkg.settings.src.content + '/**/*.md',
		pkg.settings.src.layouts + '/**/*.njk'
	], gulp.series(metalsmith, browserSync.reload));

	callback();
}

// Serve the built files and ensure that the watch
// task is running so that they are always up-to-date.
function server() {
	browserSync.init({
		server: {
			baseDir: pkg.settings.dist
		},
		ui: {
			port: 8080
		}
	});
}
export const serve = gulp.series(build, watch, server);

// By default, just build the website.
export default build;
