var express = require('express');
var router = express.Router();
var http = require("http");
var https = require("https");
var stream = require('stream');
var gd = require('node-gd');
var fs = require('fs');
var crypto = require('crypto');
var path = require('path');

function md5(str) {
    return crypto
    .createHash('md5')
    .update(str)
    .digest('hex');
}

router.get('/', function(req, res) {
    res.render('index', { title: 'iMerge' });
});

// middleware to get an artist name
router.use('/image', function(req, res, next) {
    getJSON(req.app.get('artistUrl'), function(err, obj) {
        if (err) {
            next(err);
        }
        if (obj && obj.code === 200) {
            req.artist = obj.artist;
            console.log('artist: ' + req.artist);
            next();
        }
    });
});

// middleware to get an array of three iamge URLs
router.use('/image', function(req, res, next) {
    var URL = req.app.get('googleUrl') + encodeURIComponent(req.artist);

    getJSON(URL, function(err, obj) {
        if (err) {
            next(err);
        }
        var imageUrls = drainUrlsFrom(obj);
        var i = 0;
        var localNames = [];

        function retrieve(image, callback) {
            getImage(image, function(err, name) {
                if (err) {
                    console.log(err); // silently fail
                } else {
                    console.log(name);
                    localNames.push(name);
                }
                if (i < imageUrls.length - 1) {
                    callback.call(null, imageUrls[++i], retrieve);
                    return;
                }
                if (i === imageUrls.length - 1) {
                    console.log('all images retrieved');
                    if (localNames.length === 0) {
                        res.send(200, '/images/loading.gif');
                    }
                    req.localNames = localNames;
                    next();
                }
            });
        }
        retrieve(imageUrls[i], retrieve);
    });
});

// call to process images
router.get('/image', function(req, res) {
    processImages(req.localNames, req, res);
});

function getJSON(URL, callback) {
    var protocol = /^https/.test(URL) ? https : http;
    protocol.get(URL, function(response) {
        var converter = getConverter();
        response.on('data', function (chunk) {
            converter.write(chunk);
        });

        response.on("end", function() {
            var buffer = Buffer.concat(converter.data);
            var json = buffer.toString();

            var obj = JSON.parse(json);
            callback(null, obj);
        });
    }).on('error', function(e) {
        callback(e);
    });
}

function getImage(URL, callback) {
    var protocol = /^https/.test(URL) ? https : http;
    protocol.get(URL, function(response) {
        var converter = getConverter();
        response.on('data', function (chunk) {
            converter.write(chunk);
        });

        response.on("end", function() {
            var buffer = Buffer.concat(converter.data);
            var img = gd.createFromJpegPtr(buffer);
            if (img === null) {
                callback(new Error('No image!'));
                return false;
            }
            var data = new Buffer(img.jpegPtr(100), 'binary');
            var newName = path.normalize(__dirname + '/../cache/' + md5(data.toString('ascii')) + '.jpg');
            fs.exists(newName, function(exists) {
                if (!exists) {
                    img.saveJpeg(newName, 50);
                }
                callback(null, newName);
            });
        });
    }).on('error', function(e) {
        callback(e);
    });
}

function drainUrlsFrom(obj) {
    var result = [];
    if (obj.items.length > 0) {
        while (result.length < 3) {
            item = obj.items[Math.floor(Math.random() * obj.items.length)].link;
            if (result.indexOf(item) === -1) {
                result.push(item);
            }
        }
    }
    return result;
}

function processImages(images, req, res) {
    var target = path.normalize(__dirname + '/../public');
    var output = gd.createTrueColor(800, 600);
    output.saveAlpha(1);

    var white = output.colorAllocate(255, 255, 255, 100);
    output.fill(0, 0, white);
    
    var i = 0;

    function modify(image, callback) {
        gd.openJpeg(image, function(err, input) {
            if (err) {
                console.log(err);
            }
            var temp = gd.createTrueColor(800, 600);
            input.copyResized(temp, 0, 0, 0, 0, 800, 600, input.width, input.height);

            var randomX = Math.floor(Math.random() * input.width);
            var randomY = Math.floor(Math.random() * input.height);
            var color = input.getTrueColorPixel(randomX, randomY);

            setTransparentFuzzy.call(temp, color, req.app.get('fuzz'));

            var colorArray = colorAsRGB(color);
            var alpha = temp.colorExact.apply(temp, colorArray);

            temp.colorTransparent(alpha);

            temp.copyMerge(output, 0, 0, 0, 0, 800, 600, 100);

            var newRelativeFile = '/images/image' + Date.now() + '.png';
            var newFile = target + newRelativeFile;
            output.savePng(newFile, 9, function(err) {
                if (err) {
                    console.log(err);
                }
                if (i < images.length - 1) {
                    var next = images[++i];
                    callback.call({}, next, modify);
                    return;
                }
                if (i === images.length - 1) {
                    console.log("sending result");
                    res.send(200, newRelativeFile);
                }
            });
        });
    };

    modify(images[i], modify);
}

module.exports = router;

function getConverter() {
    var converter = new stream.Writable({ highWaterMark: 65536 }); // 64kb
    converter.data = [];
    converter._write = function (chunk, encoding, callback) {
        var curr = this.data.push(chunk);
        if (curr !== this.data.length) {
            cb(new Error('Error pushing buffer to stack'));
        } else {
            callback(null);
        }
    };
    return converter;
}

function colorAsRGB(color) {
    var res = [];
    for(var i = 4; i > 0; i--) {
        res.push(color & 255);
        color >>= 8;
    }

    res.pop(); // remove alpha
    return res.reverse();
}

function rgbAsColor(r,g,b) {
    return (r << 16) + (g << 8) + b;
}

function setTransparentFuzzy(color, fuzz) {
    var arr = colorAsRGB(color);
    var bottomLimit = arr.map(function(colorVal, idx) {
        return Math.max(0, colorVal - fuzz); // dont get below 0
    });
    var topLimit = arr.map(function(colorVal, idx) {
        return Math.min(255, colorVal + fuzz); // dont go above 255
    });
    bottomLimitColor = rgbAsColor.apply({}, bottomLimit);
    topLimitColor = rgbAsColor.apply({}, topLimit);

    for(var i = 0; i < this.width; i++) {
        for (var j = 0; j < this.height; j++) {
            var val = this.getPixel(i, j);
            if (val <= topLimitColor && val >= bottomLimitColor) {
                this.setPixel(i, j, color);
            }
        }
    }
}
