'use strict';

const gulp         = require('gulp');
const sass         = require('gulp-sass');
const babel        = require('gulp-babel');
const pug          = require('gulp-pug');
const plumber      = require('gulp-plumber');
const browsersync  = require('browser-sync').create();

function catche() {
	return plumber({
		errorHandler(err) {
			console.log(`${err.message}${err.codeFrame || ''}`);
			this.emit('end');
		}
	})
}

const config = {
	pug: {
		src: './site/**/*.{pug,jade}',
		dest: './_site',
		options: {
			pretty: true
		}
	},
	js: {
		src: './_resources/javascripts/**/*.js',
		dest: './_site/assets/javascripts'
	},
	sass: {
		src: './_resources/sass/**.{scss,sass}',
		dest: './_site/assets/stylesheets'
	},
	html: {
		src: './site/**/*.{html,htm}',
		dest: './_site'
	},
	browsersync: {
		server: '_site',
		port: 4000,
		reloadDelay: 400,
		reloadDebounce: 400,
		notify: false,
		open: false,
	}
};

gulp.task('default', ['html', 'sass', 'js', 'watch', 'browsersync']);

gulp.task('watch', function () {
	gulp.watch(config.sass.src, ['sass']);
	gulp.watch(config.js.src, ['js']);
	gulp.watch(config.pug.src, ['pug']);
});

gulp.task('browsersync', function () {
	browsersync.init(config.browsersync);
});

gulp.task('html', function () {
	return gulp.src(config.html.src)
		.pipe(catche())
		.pipe(browsersync.stream({ once: true }))
		.pipe(gulp.dest(config.html.dest))
});

gulp.task('sass', function () {
	return gulp.src(config.sass.src)
		.pipe(catche())
		.pipe(sass())
		.pipe(browsersync.stream({ once: true }))
		.pipe(gulp.dest(config.sass.dest))
});

gulp.task('js', function () {
	return gulp.src(config.js.src)
		.pipe(catche())
		.pipe(babel())
		.pipe(browsersync.stream({ once: true }))
		.pipe(gulp.dest(config.js.dest))
});

gulp.task('pug', function () {
	return gulp.src(config.pug.src)
		.pipe(catche())
		.pipe(pug(config.pug.options))
		.pipe(browsersync.stream({ once: true }))
		.pipe(gulp.dest(config.pug.dest))
});
