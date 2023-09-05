const gulp = require('gulp');
const compiler = require('webpack');
const webpack = require('webpack-stream');
const named = require('vinyl-named');
const prefix = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass')(require('node-sass'));

/* ----------------------------------------- */
/*  Compile Sass
/* ----------------------------------------- */

// Small error handler helper function.
function handleError(err) {
    console.log(err.toString());
    this.emit('end');
}

const SYSTEM_SCSS = ["styles/**/*.scss"];
function compileScss() {
    // Configure options for sass output. For example, 'expanded' or 'nested'
    let options = {
        outputStyle: 'expanded'
    };
    return gulp.src(SYSTEM_SCSS)
        .pipe(
            sass(options)
                .on('error', handleError)
        )
        .pipe(prefix({
            cascade: false
        }))
        .pipe(gulp.dest("./build"))
}
const css = gulp.series(compileScss);

/* ----------------------------------------- */
/*  Compile Javascript
/* ----------------------------------------- */

const SYSTEM_JS = ["modules/**/*.js"];
function compileJs() {
    return gulp.src(["modules/main.js", "modules/socket.js"])
        .pipe(named())
        .pipe(webpack({ mode: "production"}, compiler))
        .pipe(gulp.dest('./build'))
}
const js = gulp.series(compileJs);

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
    gulp.watch(SYSTEM_SCSS, css);
    gulp.watch(SYSTEM_JS, js);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
    compileScss,
    compileJs,
    watchUpdates
);
exports.build = gulp.series(
    compileScss,
    compileJs
);
exports.css = css;
exports.js = js;
