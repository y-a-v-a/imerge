var fs = require('fs');
var gm = require('gm');
var gd = require('node-gd');

var fuzz = 20;

// libgd2
var target = __dirname + '/public/images';

// set canvas with base size and white background
var output = gd.createTrueColor(800, 600);
output.saveAlpha(1);

var white = output.colorAllocate(255, 255, 255, 100);
output.fill(0, 0, white);

var imgs = ['aaa2.jpg', 'aaa.jpg', 'aaa1.jpg'];
var i = 0;

function modify(image, callback) {
    gd.openJpeg(image, function(err, input) {
        if (!!err) {
            console.log(err);
        }
        var temp = gd.createTrueColor(800, 600);
        input.copyResized(temp, 0, 0, 0, 0, 800, 600, input.width, input.height);

        var randomX = Math.floor(Math.random() * input.width);
        var randomY = Math.floor(Math.random() * input.height);
        var color = input.getTrueColorPixel(randomX, randomY);

        setTransparentFuzzy.call(temp, color, fuzz);

        var colorArray = colorAsRGB(color);
        var alpha = temp.colorExact.apply(temp, colorArray);

        temp.colorTransparent(alpha);

        temp.copyMerge(output, 0, 0, 0, 0, 800, 600, 100);

        var newFile = target + '/image' + Date.now() + '.png';
        output.savePng(newFile, 0, function(err) {
            if (!!err) {
                console.log(err);
            }
            if (i < imgs.length - 1) {
                var next = imgs[++i];
                callback.call({}, next, modify);
            }
        });
    });
};

modify(imgs[i], modify);

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
        return Math.max(0, colorVal - fuzz);
    });
    var topLimit = arr.map(function(colorVal, idx) {
        return Math.min(255, colorVal + fuzz);
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