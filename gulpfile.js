var gulp = require("gulp");
var browserify = require("browserify");
var source = require('vinyl-source-stream');
var watchify = require("watchify");
var tsify = require("tsify");
var gutil = require("gulp-util");
var livereload = require('gulp-livereload');

var paths = {
    pages: ['src/*.html']
};

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: ['src/main.ts'],
    cache: {},
    packageCache: {}
}).plugin(tsify));

gulp.task("copy-html", function () {
    return gulp.src(paths.pages)
        .pipe(gulp.dest("docs"));
});

gulp.task("live-reload-listen", function() {
    livereload.listen();
})

function bundle() {
    return watchedBrowserify
        .bundle()
        .pipe(source('bundle.js'))
        .pipe(gulp.dest("docs"))
        .pipe(livereload());
}

gulp.task("default", ["copy-html", "live-reload-listen"], bundle);
watchedBrowserify.on("update", bundle);
watchedBrowserify.on("log", gutil.log);