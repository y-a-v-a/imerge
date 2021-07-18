import crypto from 'crypto';

/**
 * Vincent Bruijn to vincent_bruijn
 * Harvey's 2nd Pub tp harvey_s_2nd_pub
 */
export function slugifyName(string) {
  return string.toLowerCase().trim().replace(/[^a-z0-9]/g,'_').replace(/_+/g, '_');
}

export function colorAsRGB(color) {
  const res = [];
  for(let i = 4; i > 0; i--) {
    res.push(color & 255);
    color >>= 8;
  }

  res.pop(); // remove alpha
  return res.reverse();
}

export function rgbAsColor(r,g,b) {
  return (r << 16) + (g << 8) + b;
}

export function drainUrlsFrom(obj) {
  let item;
  var result = [];
  if (obj.items && obj.items.length > 0) {
    while (result.length < 4) {
      item = obj.items[(Math.random() * obj.items.length) | 0].link;
      if (item && result.indexOf(item) === -1) {
        result.push(item);
      }
    }
  }
  return result;
}

export function md5(str) {
  return crypto
  .createHash('md5')
  .update(str)
  .digest('hex');
}
