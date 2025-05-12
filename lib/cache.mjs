import * as fs from 'fs/promises';
import path from 'path';
import EventEmitter from "events";
import debugModule from 'debug';

import mainConfig from '../conf/config.js'

const debug = debugModule('imerge');

const env = process.env.NODE_ENV || "development";
var { [env]: config } = mainConfig;

const imageCache = [];

/**
 * Read Google JSON results for later use
 */
export async function loadGoogleCache() {
  const cachePath = path.resolve(config.googleCache);
  debug(`Reading ${cachePath}`);
  const cacheFiles = await fs.readdir(cachePath);
  const memoryStorage = {};

  for (var i = 0; i < cacheFiles.length; i++) {
    var filename = config.googleCache + '/' + cacheFiles[i];
    if (filename.endsWith('.json')) {
      memoryStorage[cacheFiles[i]] = await fs.readFile(filename, { encoding: 'utf8' });
    }
  }

  return memoryStorage;
};

export function watchGoogleCache() {
  const watchCacheEmitter = new EventEmitter();
  const fileStorage = path.resolve(config.googleCache);

  // watch cache dir for changes
  // in case of a change, read file and add to memory
  fs.watch(fileStorage, function(event, filename) {
    if (event === 'rename' && filename.endsWith('.json')) {
      fs.readFile(`${fileStorage}/${filename}`, { encoding: 'utf8' }, function(err, data) {
        if (err) {
          debug(`Unable to read file ${filename}`)
          return;
        }

        memoryStorage[filename] = data;
        debug(`Added to memoryStorage ${filename}`);

        watchCacheEmitter.emit('update', memoryStorage);
      });
    }
  });

  return watchCacheEmitter;
}

export async function loadImageCache() {
  var files = await fs.readdir('./public/images');

  for (var i = 0; i < files.length; i++) {
    if (files[i]?.endsWith('.png')) {
//      console.log('Loading ' + files[i]);
      imageCache.push('/images/' + files[i]);
    }
  }
};

export function getRandomImage() {
  return false; // @TODO just done so to force real retrieval
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
