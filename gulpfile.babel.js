// Common
import child_process from 'child-process-promise';
import del from 'del';
import path from 'path';
import process from 'process';
import util from 'util';

const spawn = child_process.spawn;

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
import uglify from 'gulp-uglify-es';

// LaTeX
import pandoc from 'simple-pandoc';
import tmp from 'tmp';

// Metalsmith
import Metalsmith from 'metalsmith';
import addMeta from 'metalsmith-collections-addmeta';
import alias from 'metalsmith-alias';
import ancestry from 'metalsmith-ancestry';
import branch from 'metalsmith-branch';
import codeHighlight from 'metalsmith-code-highlight';
import collections from 'metalsmith-collections';
import copyAssets from 'metalsmith-assets';
import drafts from 'metalsmith-drafts';
import excerpts from 'metalsmith-excerpts';
import feed from 'metalsmith-feed';
import headingsIdentifier from 'metalsmith-headings-identifier';
import htmlMinifier from 'metalsmith-html-minifier';
import layouts from 'metalsmith-layouts';
import markdown from 'metalsmith-markdown';
import relativeLinks from 'metalsmith-relative-links';
import pagination from 'metalsmith-pagination';
import paths from 'metalsmith-paths';
import permalinks from 'metalsmith-permalinks';
import untemplatize from 'metalsmith-untemplatize';
import wordCount from 'metalsmith-word-count';

// Misc
import escaper from 'true-html-escape';
import log from 'fancy-log';

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

const markdownToLaTeX = pandoc('markdown', 'latex');

const addFilters = (environment) => {
    environment.addFilter('date', nunjucksDate);
    environment.addFilter('unescape', escaper.unescape);
    environment.addFilter('evaluate', (obj, fn) => { return fn(obj); });
    environment.addFilter('filter', (objs, fn, negate = false) => {
        if (objs.constructor !== Array) return objs;

        if (negate)
            return objs.filter((obj) => !fn(obj));
        return objs.filter(fn);
    });
    environment.addFilter('split', (str, delimiter = ' ') => { return str.split(delimiter); });
    environment.addFilter('groupbysort', (items, groupAttr, reverse) => {
        const groups = {};
        for (let item of items) {
            const key = item[groupAttr];
            (groups[key] = groups[key] || []).push(item);
        }

        let pairs = [];
        for (let key of Object.keys(groups)) {
            pairs.push([key, groups[key]]);
        }

        pairs.sort((kv1, kv2) => {
            if (reverse) {
                return kv2[1].length - kv1[1].length;
            } else {
                return kv1[1].length - kv2[1].length;
            }
        });

        let reconstructed = {};
        for (let kv of pairs) {
            reconstructed[kv[0]] = kv[1];
        }

        return reconstructed;
    });
};

const cvGeneration = () => {
    let loader = new nunjucks.FileSystemLoader(pkg.settings.src.layouts);
    let environment = new nunjucks.Environment(loader, {
        // Replace the tags that Nunjucks uses so that it conflicts with LaTeX less.
        tags: {
            blockStart: '<!',
            blockEnd: '!>',
            variableStart: '<=',
            variableEnd: '=>',
            commentStart: '<#',
            commentEnd: '#>'
        }
    });
    addFilters(environment);

    return async (files, metalsmith, done) => {
        try {
            log('Starting generation of CV from site content');
            let copy = JSON.parse(JSON.stringify(files, (k, v) => {
                if (k === 'paths' || k === 'next' || k === 'previous') { return v['path']; }
                else { return v; }
            }));

            let categories = [];
            log('Starting conversion of markdown to LaTeX');
            for (let filename of Object.keys(copy)) {
                let item = copy[filename];
                if (!item.hasOwnProperty('category')) { continue; }

                const category = item['category']['key'];
                log('Converting file \'' + item['path'] + '\'');
                item['contents'] = await markdownToLaTeX(Buffer.from(item['contents']['data']));

                (categories[category] = categories[category] || []).push(item);
            }
            log('Finished conversion of markdown to LaTeX');

            // Render the Nunjucks template into the raw LaTeX with the content in it.
            log('Starting rendering of LaTeX file with Nunjucks');
            const template = path.join(__dirname, pkg.settings.src.cv.main);
            const context = Object.assign(pkg.settings.meta, categories);
            const rendered = environment.render(template, context);

            const tempDir = tmp.dirSync();
            const tempFile = `${tempDir.name}/${pkg.settings.out.cv.replace("pdf", "tex")}`;
            log('Writing rendered LaTeX to file \'' + tempFile + '\'');

            const stream = fs.createWriteStream(tempFile);
            stream.write(rendered);
            stream.end();
            log('Finished rendering of LaTeX file with Nunjucks');

            // Build the PDF with texlive.
            log('Started building PDF with LaTeX');
            const output = path.join(__dirname, pkg.settings.out.assets);
            const command = 'xelatex';
            const args = ['--halt-on-error', '--interaction=nonstopmode', '--output-directory',
                          output, tempFile];
            log('Executing command \'' + command + ' ' + args.join(' ') + '\'');
            await spawn(command, args, {
                cwd: path.join(__dirname, pkg.settings.src.cv.resources),
                stdio: 'inherit'
            });
            log('Finished building PDF with LaTeX');

            log('Started cleaning up CV generation');
            fs.unlink(tempFile, (err) => {
                if (err) throw err;
                log('Deleted temporary file \'' + tempFile + '\'');
            });
            tempDir.removeCallback();
            log('Finished cleaning up CV generation');

            // Signal to metalsmith that this plugin has finished.
            done();
            log('Finished generation of CV from site content');
        } catch (error) {
            log.error('An error occured while generating CV from site content \'' + error + '\'');
            process.exitCode = 1;
        }
    };
};

export function metalsmith(callback) {
    let loader = new nunjucks.FileSystemLoader(pkg.settings.src.layouts);
    let environment = new nunjucks.Environment(loader);
    addFilters(environment);

    log('Starting building of static site')
    Metalsmith(__dirname)
        .metadata(pkg.settings.meta)
        .source(pkg.settings.src.content)
        .destination(pkg.settings.out.dist)
        .clean(true)
        .use(drafts())
        .use(collections({
            projects: {
                pattern: 'projects/**/*.md',
                sortBy: 'startDate',
                reverse: true
            },
            writings: {
                pattern: 'writings/**/*.md',
                sortBy: 'date',
                reverse: true
            },
            oss: {
                pattern: 'oss/**/*.md',
                sortBy: 'date',
                reverse: true
            }
        }))
        .use(addMeta({
            writings: {
                layout: 'writing.njk',
                headerLinks: true
            }
        }))
        .use(paths({ property: 'paths' }))
        .use(cvGeneration())
        .use(relativeLinks())
        .use(ancestry())
        .use(markdown({
            gfm: true,
            tables: true
        }))
        .use(untemplatize({ key: 'content' }))
        .use(headingsIdentifier({
            allow: 'headerLinks'
        }))
        .use(excerpts())
        .use(feed({
            site_url: pkg.settings.meta.url,
            collection: 'writings',
            limit: false
        }))
        .use(wordCount())
        .use(alias())
        .use(permalinks({
            relative: false,
            linksets: [{
                match: { collection: 'writings' },
                pattern: 'writings/:date/:title',
                date: formatDate('YYYY')
            }]
        }))
        .use(layouts({
            engine: 'nunjucks',
            directory: pkg.settings.src.layouts,
            nunjucksEnv: environment
        }))
        .use(codeHighlight())
        .use(copyAssets({
            source: pkg.settings.out.assets,
            dest: '.'
        }))
        .build((err) => {
            if (err) throw err;
            log('Finished building of static site')
            callback();
        });
}

export function fonts() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets, 'fonts');
    return gulp.src([
        fontAwesome.fonts,
        pkg.settings.src.fonts + '/**/*'
    ], { since: gulp.lastRun(fonts) })
        .pipe(gulp.dest(outputPath));
}

export function faviconGeneration() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets, 'favicons');
    return gulp.src(pkg.settings.src.favicon, { since: gulp.lastRun(faviconGeneration) })
        .pipe(favicons(pkg.settings.favicons))
        .on('error', log.error)
        .pipe(gulp.dest(outputPath));
}

export function faviconCopy() {
    const faviconPath = path.join(__dirname, pkg.settings.out.assets, 'favicons/favicon.ico');
    const outputPath = path.join(__dirname, pkg.settings.out.dist, 'favicon.ico');
    return fs.createReadStream(faviconPath).pipe(fs.createWriteStream(outputPath));
}

export function images() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets);
    return gulp.src([
        pkg.settings.src.images + '**/*'
    ], { since: gulp.lastRun(images) })
        .pipe(imagemin())
        .pipe(gulp.dest(outputPath));
}

export function media() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets);
    return gulp.src([
        pkg.settings.src.media + '**/*'
    ], { since: gulp.lastRun(media) })
        .pipe(gulp.dest(outputPath));
}

export function scripts() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets, 'scripts');
    return gulp.src([
        pkg.settings.src.scripts + '/**/*.js'
    ], { since: gulp.lastRun(scripts) })
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: [
                ['env', {
                    targets: { 'node': 'current' }
                }]
            ]
        }))
        .pipe(concat('app.min.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(outputPath));
}

export function styles() {
    const outputPath = path.join(__dirname, pkg.settings.out.assets, 'styles');
    return gulp.src([pkg.settings.src.styles + '/**/*.scss'])
        .pipe(sourcemaps.init())
        .pipe(concat('app.min.css'))
        .pipe(sass({
            includePaths: [
                fontAwesome.scssPath,
                './node_modules/bootstrap/scss/',
                './node_modules/highlight.js/styles/'
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

export const assets = gulp.parallel(
    images,
    media,
    styles,
    scripts,
    faviconGeneration,
    fonts
);

export const build = gulp.series(
    clean,
    assets,
    metalsmith,
    faviconCopy
);

// Fixes issue with browsersync in Gulp 4 only reloading once.
const reload = (callback) => { browserSync.reload(); callback(); }
export function watch(callback) {
    // Watch for file changes.
    gulp.watch(['gulpfile.babel.js', 'package.json'],
        gulp.series(
            gulp.parallel(styles, scripts, faviconGeneration, fonts),
            metalsmith,
            faviconCopy,
            reload
        ));

    gulp.watch([pkg.settings.src.fonts + '/**/*'],
        gulp.series(fonts, metalsmith, reload));

    gulp.watch([pkg.settings.src.images + '**/*'],
        gulp.series(images, metalsmith, reload));

    gulp.watch([pkg.settings.src.media + '**/*'],
        gulp.series(media, metalsmith, reload));

    gulp.watch([pkg.settings.src.favicon],
        gulp.series(faviconGeneration, metalsmith, faviconCopy, reload));

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
const server = () => {
    browserSync.init({
        server: {
            baseDir: pkg.settings.out.dist
        },
        ui: {
            port: 8080
        }
    });
};
export const serve = gulp.series(build, watch, server);

// By default, just build the website.
export default build;
