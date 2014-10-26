var app = require('../app').app;
var fs = require('fs');
var imageCache = [];

exports.loadGoogleCache = function() {
    var cacheFiles = fs.readdirSync(__dirname + '/..' + app.get('googleCache'));
    var memoryStorage = {};

    for (var i = 0; i < cacheFiles.length; i++) {
//        console.log('Reading ' + cacheFiles[i]);
        var filename = __dirname + '/..' + app.get('googleCache') + '/' + cacheFiles[i];
        if (filename.indexOf('.json') !== -1) {
            memoryStorage[cacheFiles[i]] = fs.readFileSync(filename, { encoding: 'utf8' });
        }
    }
    app.set('memoryStorage', memoryStorage);    
};

exports.loadImageCache = function() {
    var files = fs.readdirSync(__dirname + '/../public/images');

    for (var i = 0; i < files.length; i++) {
        if (/^image.*png$/.test(files[i])) {
//            console.log('Loading ' + files[i]);
            imageCache.push('/images/' + files[i]);
        }
    }
};

exports.getRandomImage = function() {
    var fileName, artistName;
    if (Math.round(Math.random() * 2) >= 1) {
        if (imageCache.length === 0) {
            throw new Error('imageCache is empty?');
        }
        var fileName = imageCache[Math.floor(Math.random() * imageCache.length)];
        var artistName = fileName.indexOf('X.png') > -1 ? pretifyName(fileName) : fileName;

        return JSON.stringify({
            image: fileName,
            artist: artistName
        });
    } else {
        return false;
    }
};

/**
 * image12315124Xandy_warholX.png to Andy Warhol
 * image12235245Xharvey_s_2nd_pubX.png to Harvey S 2nd Pub
 */
function pretifyName(string) {
    var value = string.replace(/^.*?X/, '').replace(/X.*/,'').split('_');
    if (value.length > 0) {
        value = value.map(function(el, idx) {
            return el.charAt(0).toUpperCase() + el.slice(1);
        });
    }
    return value.join(' ');
}
