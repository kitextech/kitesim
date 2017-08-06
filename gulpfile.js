var gulp = require("gulp")
var browserify = require("browserify")
var source = require('vinyl-source-stream')
var watchify = require("watchify")
var tsify = require("tsify")
var gutil = require("gulp-util")
var livereload = require('gulp-livereload')

var paths = {
    pages: ['src/*.html'],
    images: ['src/images/*.png']
}

var watchedBrowserify = watchify(browserify({
    basedir: '.',
    debug: true,
    entries: ['src/js/main.ts'],
    cache: {},
    packageCache: {}
}).plugin(tsify))

gulp.task("copy-html", function () {
    return gulp.src(paths.pages)
        .pipe(gulp.dest("docs"))
        .pipe(livereload())
})

gulp.task("copy-images", function () {
    return gulp.src(paths.images)
        .pipe(gulp.dest("docs/images"))
        .pipe(livereload())
})

gulp.task("live-reload-listen", function() {
    livereload.listen()
})

function bundle() {
    return watchedBrowserify
        .bundle()
        .on('error', function (error) { console.error(error.toString()); })
        .pipe(source('bundle.js'))
        .pipe(gulp.dest("docs"))
        .pipe(livereload())
}

gulp.task("default", ["copy-html", "copy-images", "live-reload-listen"], function() {
    gulp.watch(paths.pages, ['copy-html'])
    gulp.watch(paths.images, ['copy-images'])
    bundle()
})
watchedBrowserify.on("update", bundle)
watchedBrowserify.on("log", gutil.log)