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
import autoprefixer from 'gulp-autoprefixer';
import babel from 'gulp-babel';
import cleancss from 'gulp-clean-css';
import concat from 'gulp-concat';
import favicons from 'gulp-favicons';
import fontAwesome from 'node-font-awesome';
import imagemin from 'gulp-imagemin';
import sass from 'gulp-sass';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import util from 'gulp-util';

// Metalsmith
import Metalsmith from 'metalsmith';
import assets from 'metalsmith-assets';
import branch from 'metalsmith-branch';
import collections from 'metalsmith-collections';
import drafts from 'metalsmith-drafts';
import htmlMinifier from 'metalsmith-html-minifier';
import layouts from 'metalsmith-layouts';
import markdown from 'metalsmith-markdown';
import pagination from 'metalsmith-pagination';
import permalinks from 'metalsmith-permalinks';

// Nunjucks
import nunjucks from 'nunjucks';
import nunjucksDate from 'nunjucks-date';
nunjucksDate.setDefaultFormat('Do MMMM YYYY');
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
	let environment = new nunjucks.Environment(new nunjucks.FileSystemLoader(pkg.settings.src.layouts));
	environment.addFilter('date', nunjucksDate);

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
			nunjucksEnv: environment
		}))
		.use(assets({
			source: pkg.settings.assets,
			dest: '.'
		}))
		.build((err) => {
			if (err) throw err;
			callback();
		});
}

export function fonts() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'fonts');
	return gulp.src([
			fontAwesome.fonts,
			pkg.settings.src.fonts + '/**/*'
		], {since: gulp.lastRun(fonts)})
		.pipe(gulp.dest(outputPath));
}

export function favicon() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'favicons');
	return gulp.src(pkg.settings.src.favicon, {since: gulp.lastRun(favicon)})
		.pipe(favicons(pkg.settings.favicons))
		.on('error', util.log)
		.pipe(gulp.dest(outputPath));
}

export function scripts() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'scripts');
	return gulp.src([
			pkg.settings.src.scripts + '/**/*.js'
		], {since: gulp.lastRun(scripts)})
		.pipe(sourcemaps.init())
		.pipe(babel({
			presets: ['es2015'],
			plugins: ['transform-runtime']
		}))
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(outputPath));
}

export function styles() {
	const outputPath = path.join(__dirname, pkg.settings.assets, 'styles');
	return gulp.src([pkg.settings.src.styles + '/**/*.scss'],
					{since: gulp.lastRun(styles)})
		.pipe(sourcemaps.init())
		.pipe(concat('app.min.css'))
		.pipe(sass({
			includePaths: [
				fontAwesome.scssPath,
				'./node_modules/normalize.css/'
			]
		}).on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(cleancss())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(outputPath));
}

const build = gulp.series(clean, gulp.parallel(styles, scripts, favicon, fonts), metalsmith);

// Fixes issue with browsersync in Gulp 4 only reloading once.
const reload = (callback) => { browserSync.reload(); callback(); }
export function watch(callback) {
	// Watch for file changes.
	gulp.watch(['gulpfile.babel.js', 'package.json'],
		gulp.series(gulp.parallel(styles, scripts, favicon, fonts), metalsmith, reload));

	gulp.watch([pkg.settings.src.fonts + '/**/*'],
		gulp.series(fonts, metalsmith, reload));

	gulp.watch([pkg.settings.src.favicon],
		gulp.series(favicon, metalsmith, reload));

	gulp.watch([pkg.settings.src.styles + '/**/*.scss'],
		gulp.series(styles, metalsmith, reload));

	gulp.watch([pkg.settings.src.scripts + '/**/*.js'],
		gulp.series(scripts, metalsmith, reload));

	gulp.watch([
		pkg.settings.src.content + '/**/*.md',
		pkg.settings.src.layouts + '/**/*.njk'
	], gulp.series(metalsmith, reload));

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
