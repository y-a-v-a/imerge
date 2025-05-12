const env = process.env.NODE_ENV || "development";
import express from 'express';
const router = express.Router();
import http from "http";
import https from "https";
import stream from 'stream';
import gd from 'node-gd';
import fs from 'fs';
import path from 'path';
import EventEmitter from "events";
import * as cache from '../lib/cache.mjs';
import mainConfig from '../conf/config.js'
import {slugifyName, colorAsRGB, rgbAsColor, drainUrlsFrom, md5} from '../lib/utils.mjs';
import debugModule from 'debug';

const debug = debugModule('imerge');
const config = mainConfig[env];

const RESULT_WIDTH = 1920;
const RESULT_HEIGHT = 1080;

let fileStorage = path.resolve(config.googleCache);
let memoryStorage = {};
let artist;

export async function initGoogleCache() {
  await cache.loadGoogleCache();
  const watchCacheEmitter = cache.watchGoogleCache();

  watchCacheEmitter.on('update', function(data) {
    memoryStorage = {...memoryStorage, ...data};
  });
}

router.get('/', function(req, res) {
  res.render('index', { title: 'iMerge' });
});

// middleware to get an artist name
router.use('/image', function(req, res, next) {
  const json = cache.getRandomImage();

  if (json !== false) {
    res.send(200, json);
    return;
  }

  const artistURL = req.app.get('artistUrl');
  getJSON(artistURL, false, function(err, obj) {
    if (err) {
      debug('Is artist API running?!');
      next(err);
    }
    if (obj && obj.code === 200) {
      req.artist = obj.artist;
      artist = obj.artist;
      debug('Artist name from API is ' + req.artist);
      next();
    }
  });
});

// middleware to get an array of three image URLs
router.use('/image', function(req, res, next) {
  var URL = req.app.get('googleUrl') + encodeURIComponent(req.artist);

  debug(`Google custom search URL ${URL}`)

  getJSON(URL, true, function(err, obj) {
    var error;
    // console.log(obj.error);
    if (err || obj.error) {
      error = err || obj.error;
      next(error);
    }
    var imageUrls = drainUrlsFrom(obj);
    var i = 0;
    var localNames = [];

    function retrieve(image, callback) {
      getImage(image, function(err, name) {
        if (err) {
          debug(err); // silently fail
        } else {
          debug(`Retrieved ${name}`);
          localNames.push(name);
        }
        if (imageUrls.length > 0) {
          debug(`Trying to retrieve next image`);
          callback.call(null, imageUrls.pop(), retrieve);
          return;
        }
        if (imageUrls.length === 0) {
          debug('All images retrieved:');
          debug(localNames);

          req.localNames = localNames;
          next();
        }
      });
    }
    retrieve(imageUrls.pop(), retrieve);
  });
});

// call to process images
router.get('/image', function(req, res) {
  if (req.localNames.length === 0) {
    return res.send(200, JSON.stringify({image:'/images/loading.gif', artist: ''}));
  }
  return processImages(req.localNames, req, res);
});

function getJSON(URL, shouldCache, callback) {
  const protocol = /^https/.test(URL) ? https : http;
  var key = md5(URL) + '.json';
  var filename = fileStorage + '/' + key;

  if (typeof memoryStorage[key] !== 'undefined') {
    debug('Found JSON data in cache.');
    callback(null, JSON.parse(memoryStorage[key]));
    return;
  }

  protocol.get(URL, function(response) {
    debug('Consulting Google CSE URL...');
    var converter = getConverter();
    response.on('data', function (chunk) {
      converter.write(chunk);
    });

    response.on("end", function() {
      var buffer = Buffer.concat(converter.data);
      var json = buffer.toString();

      var obj = JSON.parse(json);
      if (shouldCache) {
        if (!fs.existsSync(filename)) {
          fs.appendFile(filename, json, function(err) {
            if (err) throw err;
            debug('Storing Google CSE response in json file');
            callback(null, obj);
          });
        } else {
          debug('File exists ' + filename);
          callback(null, obj);
        }
      } else {
        callback(null, obj);
      }
      converter = null;
    });
  }).on('error', function(e) {
    callback(e);
  });
}

function getImage(URL, callback) {
  var protocol = /^https/.test(URL) ? https : http;

  debug(`Retrieving ${URL}`);

  protocol.get(URL, {agent:false}, function(response) {
    var extension;
    var regex = /image\/(jpg|jpeg|png|gif)/g;
    var matches = regex.exec(response.headers['content-type']);
    var converter;

    if (matches !== null) {
      extension = matches[1].replace('e', '');
    } else {
      debug(response.headers['content-type']);
      return callback('Not a good MIME-type!');
    }
    var fileName = path.normalize('./cache/' + md5(URL) + '.' + extension);

    if (extension === 'jpg') {
      converter = getConverter();
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
        fs.exists(fileName, async function(exists) {
          if (!exists) {
            debug(`Saving ${fileName}`)
            await img.saveJpeg(fileName, 70, function(error) {
              if (error) {
                return callback('Could not save Jpeg');
              }
              img.destroy();
              converter = null;
              debug('Done saving');
            });
            callback(null, fileName);
          } else {
            img.destroy();
            converter = null;
            callback(null, fileName);
          }
        });
      });
    } else {
      fs.exists(fileName, function(exists) {
        var wstream;
        if (!exists) {
          wstream = fs.createWriteStream(fileName);
          response.on('data', function(chunk) {
            wstream.write(chunk);
          });
          response.on('end', function() {
            wstream.end();
            debug(`Written ${fileName}`);
            callback(null, fileName);
          });
        } else {
          callback(null, fileName);
        }
      });
    }

  }).on('error', function(e) {
    callback(e);
  });
}

async function processImages(images, req, res) {
  if (!images.length) {
    return;
  }
  var target = path.normalize('./public');
  var output = await gd.createTrueColor(RESULT_WIDTH, RESULT_HEIGHT);
  output.saveAlpha(1);
  var cache = [];

  var white = output.colorAllocate(255, 255, 255, 100);
  output.fill(0, 0, white);

  var i = 0;

  async function modify(image, callback) {
    debug(`About to open ${image}`);
    var next = images[++i];

    var input = await gd.openFile(image);//, function(err, input) {
    if (!input) {
      if (i < images.length) {
        return callback.call({}, next, modify);
      } else {
        output.destroy();

        return res.send(200, JSON.stringify({
          image: '/images/loading.gif',
          artist: ''
        }));
      }
    }

    var temp = await gd.createTrueColor(RESULT_WIDTH, RESULT_HEIGHT);
    input.copyResized(temp, 0, 0, 0, 0, RESULT_WIDTH, RESULT_HEIGHT, input.width, input.height);

    var randomX = Math.floor(Math.random() * input.width);
    var randomY = Math.floor(Math.random() * input.height);
    var color = input.getTrueColorPixel(randomX, randomY);

    setTransparentFuzzy(temp, color, req.app.get('fuzz'));

    var colorArray = colorAsRGB(color);
    var alpha = temp.colorExact.apply(temp, colorArray);

    temp.colorTransparent(alpha);

    temp.copyMerge(output, 0, 0, 0, 0, RESULT_WIDTH, RESULT_HEIGHT, 100);

    var newRelativeFile = '/images/image' + Date.now() + 'X' + slugifyName(artist) + 'X.jpg';
    var newFile = target + newRelativeFile;

    input.destroy();
    temp.destroy();

    await output.saveJpeg(newFile, 51);
    if (i < images.length) {
      cache.push(newFile);
      return callback.call({}, next, modify);
    }
    if (i === images.length) {
      output.destroy();
      debug("Sending result");
      deleteMergeCache.emit('delete', cache);

      return res.status(200).send(JSON.stringify({
        image: newRelativeFile,
        artist: artist
      }));
    }
  }

  return modify(images[i], modify);
}

export default router;

function getConverter() {
  const converter = new stream.Writable({ highWaterMark: 65536 }); // 64kb
  converter.data = [];

  converter._write = function (chunk, encoding, callback) {
    const curr = this.data.push(chunk);
    if (curr !== this.data.length) {
      callback(new Error('Error pushing buffer to stack'));
    } else {
      callback(null);
    }
  };

  return converter;
}

function setTransparentFuzzy(image, color, fuzz) {
  debug('Set transparent fuzzy')
  var arr = colorAsRGB(color);
  var limit = arr.map(function(colorVal, idx) {
    var direction = Math.round(Math.random()) === 0 ? -1 : 1;
    return Math.min(255, colorVal + (fuzz * direction)); // dont go above 255
  });
  let limitColor = rgbAsColor.apply(null, limit);

  image.colorReplaceThreshold(limitColor, color, 8);
}

// use custom event to unlink unused files asynchronously
var deleteMergeCache = new EventEmitter();

deleteMergeCache.on('delete', function (files) {
  while(files.length > 0) {
    fs.unlink(files.shift(), function(err) {
      if (err) debug(err);
    });
  }
});
