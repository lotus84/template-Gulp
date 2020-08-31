'use strict';

const gulp = require('gulp');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const postcssFocusVisible = require('postcss-focus-visible');
const autoprefixer = require('autoprefixer');
const csso = require('gulp-csso');
const rename = require('gulp-rename');
const rigger = require('gulp-rigger');
const babel = require('gulp-babel');
const terser = require('gulp-terser');
const concat = require('gulp-concat');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const imageminMozjpeg = require('imagemin-mozjpeg');
const webp = require('gulp-webp');
const svgstore = require('gulp-svgstore');
const cheerio = require('gulp-cheerio');
const sync = require('browser-sync').create();
const del = require('del');

const SOURCE_PATH = 'src/';
const BUILD_PATH = 'build/';

// Paths

const paths = {
  html: {
    src: `${SOURCE_PATH}*.html`,
    build: BUILD_PATH,
  },
  styles: {
    src: `${SOURCE_PATH}sass/style.scss`,
    build: `${BUILD_PATH}css/`,
    watch: `${SOURCE_PATH}sass/**/*.scss`,
  },
  scripts: {
    src: `${SOURCE_PATH}js/script.js`,
    build: `${BUILD_PATH}js/`,
    vendor: {
      src: `${SOURCE_PATH}js/vendor/**/*.js`,
    },
    watch: `${SOURCE_PATH}js/**/*.js`,
  },
  images: {
    src: `${SOURCE_PATH}img/**/*.{png,jpg,svg,gif}`,
    build: `${BUILD_PATH}img/`,
    spriteSrc: `${SOURCE_PATH}/img/svg-sprite/*.svg`,
    webpSrc: `${SOURCE_PATH}img/**/*.{png,jpg}`,
  },
  fonts: {
    src: `${SOURCE_PATH}fonts/**/*.{woff,woff2}`,
    build: `${BUILD_PATH}fonts/`,
  },
};

// HTML

const html = () => {
  return gulp
  .src(paths.html.src)
  .pipe(plumber())
  .pipe(gulp.dest(paths.html.build));
};

exports.html = html;

// Styles

const styles = () => {
  return gulp
  .src(paths.styles.src)
  .pipe(plumber())
  .pipe(sourcemaps.init())
  .pipe(sass())
  .pipe(postcss([
    autoprefixer({
      flexbox: 'no-2009',
      grid: false
    }),
    postcssFocusVisible(),
  ]))
  .pipe(csso({restructure: false}))
  .pipe(rename('style.min.css'))
  .pipe(sourcemaps.write(''))
  .pipe(gulp.dest(paths.styles.build))
  .pipe(sync.stream());
};

exports.styles = styles;

// Scripts modules

const jsModules = () => {
  return gulp
  .src(paths.scripts.src, {allowEmpty: true})
  .pipe(plumber())
  .pipe(rigger())
  .pipe(babel({
    presets: ['@babel/preset-env']
  }))
  .pipe(terser())
  .pipe(rename('main.min.js'))
  .pipe(gulp.dest(paths.scripts.build))
  .pipe(sync.stream());
};

exports.jsModules = jsModules;

// Scripts vendor

const jsVendor = () => {
  return gulp
  .src(paths.scripts.vendor.src)
  .pipe(plumber())
  .pipe(terser())
  .pipe(concat('vendor.min.js'))
  .pipe(gulp.dest(paths.scripts.build))
  .pipe(sync.stream());
};

exports.jsVendor = jsVendor;

// Webpimg

const webpimg = () => {
  return gulp
  .src(paths.images.webpSrc)
  .pipe(newer(paths.images.build))
  .pipe(webp({quality: 90}))
  .pipe(gulp.dest(paths.images.build));
};

exports.webpimg = webpimg;

// Images minify

const imagesminify = () => {
  return gulp
  .src([paths.images.src, `!${paths.images.spriteSrc}`])
  .pipe(newer(paths.images.build))
  .pipe(
      imagemin([
        imagemin.optipng({
          optimizationLevel: 2
        }),
        imageminMozjpeg({
          quality: 95,
        }),
        imagemin.svgo({
          plugins: [
            {removeViewBox: false},
            {removeRasterImages: true},
            {removeUselessStrokeAndFill: false},
            {removeUnknownsAndDefaults: false},
          ]
        }),
      ]))
  .pipe(gulp.dest(paths.images.build));
};

exports.imagesminify = imagesminify;

// Sprite

const sprite = () => {
  return gulp
  .src(paths.images.spriteSrc)
  .pipe(
      imagemin([
        imagemin.svgo({
          plugins: [
            {
              removeViewBox: false,
            },
            {
              removeRasterImages: true,
            },
            {
              convertPathData: false,
            },
            {
              removeUselessStrokeAndFill: false
            }
          ],
        }),
      ])
  )
  .pipe(
      cheerio({
        parserOptions: {
          xmlMode: true,
        },
      })
  )
  .pipe(
      svgstore({
        inlineSvg: false,
      })
  )
  .pipe(rename('sprite.svg'))
  .pipe(gulp.dest(paths.images.build));
};

exports.sprite = sprite;

// Copy

const copy = () => {
  return gulp
  .src([
    paths.fonts.src,
  ], {
    base: SOURCE_PATH
  })
  .pipe(gulp.dest(BUILD_PATH))
  .pipe(sync.stream({
    once: true
  }));
};

exports.copy = copy;

// Server

const server = () => {
  sync.init({
    ui: false,
    notify: false,
    server: {
      baseDir: BUILD_PATH
    }
  });
};

exports.server = server;

// Refresh

const refresh = (done) => {
  sync.reload();
  done();
};

exports.refresh = refresh;

// Watch

const watch = () => {
  gulp.watch(paths.html.src, gulp.series(html, refresh));
  gulp.watch(paths.styles.watch, gulp.series(styles));
  gulp.watch(paths.scripts.watch, gulp.series(jsModules, jsVendor, refresh));
  gulp.watch(paths.images.src, gulp.series(webpimg, imagesminify, sprite, refresh));
};

exports.watch = watch;

// Clean

const clean = () => {
  return del(BUILD_PATH);
};

exports.clean = clean;

// Build

const build = gulp.series(
    clean,
    gulp.parallel(
        html,
        copy,
        styles,
        sprite,
        webpimg,
        imagesminify,
        jsVendor,
        jsModules
    )
);

exports.build = build;

// Start

const start = gulp.series(
    build,
    gulp.parallel(
        watch,
        server
    )
);

exports.start = start;
