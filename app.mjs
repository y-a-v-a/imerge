import * as path from 'path';
const env = process.env.NODE_ENV || "development";

import express from 'express';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

import mainConfig from './conf/config.js'
var { [env]: config } = mainConfig;

const app = express();

// view engine setup
app.set('views', path.join('./', 'views'));
app.set('view engine', 'ejs');

// App specific settings
app.set('artistUrl', 'https://4ak6678xlh.execute-api.eu-central-1.amazonaws.com/production/v1/getartist');
app.set('googleUrl', 'https://www.googleapis.com/customsearch/v1?key=' + config.googleApiKey
    + '&cx=' + config.googleCseId + '&alt=json&searchType=image&imgType=photo&q=');
app.set('fuzz', 30);

// synchronously load caches
import { loadImageCache } from './lib/cache.mjs';
await loadImageCache();

import routes from './routes/index.js';
import content from './routes/content.js';

import {initGoogleCache} from './routes/index.js';
initGoogleCache();

app.use(favicon( './public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join('.', 'public')));

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
        console.log(err);
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


export default app;
