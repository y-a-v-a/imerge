var app = require('../app').app;
var fs = require('fs');

exports.loadGoogleCache = function() {
    var cacheFiles = fs.readdirSync(__dirname + '/..' + app.get('googleCache'));
    var memoryStorage = {};

    for (var i = 0; i < cacheFiles.length; i++) {
        console.log('Reading ' + cacheFiles[i]);
        var filename = __dirname + '/..' + app.get('googleCache') + '/' + cacheFiles[i];
        if (filename.indexOf('.json') !== -1) {
            memoryStorage[cacheFiles[i]] = fs.readFileSync(filename, { encoding: 'utf8' });
        }
    }
    app.set('memoryStorage', memoryStorage);    
};

exports.loadImageCache = function() {
    var imageCache = [];
    var files = fs.readdirSync(__dirname + '/../public/images');

    for (var i = 0; i < files.length; i++) {
        if (/^image.*png$/.test(files[i])) {
            imageCache.push('/images/' + files[i]);
        }
    }
    app.set('imageCache', imageCache);
};
