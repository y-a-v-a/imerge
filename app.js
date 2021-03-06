var path = require('path');
var fs = require('fs');
var env = process.env.NODE_ENV || "development";

var express = require('express');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var config = require(__dirname + '/conf/config')[env];

var app = module.exports.app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// App specific settings
app.set('artistUrl', config.artistUrl + config.artistApiKey);
app.set('googleUrl', 'https://www.googleapis.com/customsearch/v1?key=' + config.googleApiKey
    + '&cx=' + config.googleCseId + '&alt=json&searchType=image&imgType=photo&q=');
app.set('googleCache', config.googleCache);
app.set('fuzz', 30);

// synchronously load caches
var cache = require('./lib/cache.js');
cache.loadGoogleCache();
cache.loadImageCache();

var routes = require('./routes/index');
var content = require('./routes/content');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/about', content);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
