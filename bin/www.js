#!/usr/bin/env node
import debugModule from 'debug';
import app from '../app.mjs';
import mainConfig from '../conf/config.js'

const debug = debugModule('imerge');

const env = process.env.NODE_ENV || "development";
const config = mainConfig[env];

app.set('port', process.env.PORT || config.server.port);

const server = app.listen(app.get('port'), () => {
    if (env === 'development') {
        debug(`Express server listening on port ${server.address().port}`);
    }
});
