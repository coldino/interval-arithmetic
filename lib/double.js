/**
 * Created by mauricio on 5/5/15.
 */
'use strict';

//var buffer = new ArrayBuffer(8);
//var dv = new DataView(buffer);
//var array8 = new Uint8Array(buffer);
//var pow2 = [1, 2, 4, 8, 16, 32, 64, 128];

function toIEEE754(v, ebits, fbits) {
  var bias = (1 << (ebits - 1)) - 1;

  // Compute sign, exponent, fraction
  var s, e, f;
  if (isNaN(v)) {
    e = (1 << bias) - 1; f = Math.pow(2, 51); s = 0;
  }
  else if (v === Infinity || v === -Infinity) {
    e = (1 << bias) - 1; f = 0; s = (v < 0) ? 1 : 0;
  }
  else if (v === 0) {
    e = 0; f = 0; s = (1 / v === -Infinity) ? 1 : 0;
  }
  else {
    s = v < 0;
    v = Math.abs(v);

    if (v >= Math.pow(2, 1 - bias)) {
      var ln = Math.min(Math.floor(Math.log(v) / Math.LN2), bias);
      e = ln + bias;
      f = v * Math.pow(2, fbits - ln) - Math.pow(2, fbits);
    }
    else {
      e = 0;
      f = v / Math.pow(2, 1 - bias - fbits);
    }
  }

  // Pack sign, exponent, fraction
  var i, bits = [];
  for (i = fbits; i; i -= 1) { bits.push(f % 2 ? 1 : 0); f = Math.floor(f / 2); }
  for (i = ebits; i; i -= 1) { bits.push(e % 2 ? 1 : 0); e = Math.floor(e / 2); }
  bits.push(s ? 1 : 0);
  bits.reverse();
  var str = bits.join('');

  // Bits to bytes
  var bytes = [];
  while (str.length) {
    bytes.push(parseInt(str.substring(0, 8), 2));
    str = str.substring(8);
  }
  return bytes;
}

function fromIEEE754(bytes, ebits, fbits) {
  // Bytes to bits
  var bits = [];
  for (var i = bytes.length; i; i -= 1) {
    var byte = bytes[i - 1];
    for (var j = 8; j; j -= 1) {
      bits.push(byte % 2 ? 1 : 0); byte = byte >> 1;
    }
  }
  bits.reverse();
  var str = bits.join('');

  // Unpack sign, exponent, fraction
  var bias = (1 << (ebits - 1)) - 1;
  var s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
  var e = parseInt(str.substring(1, 1 + ebits), 2);
  var f = parseInt(str.substring(1 + ebits), 2);

  // Produce number
  if (e === (1 << ebits) - 1) {
    return f !== 0 ? NaN : s * Infinity;
  }
  else if (e > 0) {
    return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
  }
  else if (f !== 0) {
    return s * Math.pow(2, -(bias-1)) * (f / Math.pow(2, fbits));
  }
  else {
    return s * 0;
  }
}

function fromIEEE754Double(b) { return fromIEEE754(b, 11, 52); }
function toIEEE754Double(v) { return toIEEE754(v, 11, 52); }

function add(bytes, n) {
  for (var i = 7; i >= 0; i -= 1) {
    bytes[i] += n;
    if (bytes[i] === 256) {
      n = 1;
      bytes[i] = 0;
    } else if (bytes[i] === -1) {
      n = -1;
      bytes[i] = 255;
    } else {
      n = 0;
    }
  }
}

function solve(a, b) {
  if (a === Number.POSITIVE_INFINITY || a === Number.NEGATIVE_INFINITY || isNaN(a)) {
    return a;
  }

  var bytes = toIEEE754Double(a);
  add(bytes, b);
  return fromIEEE754Double(bytes);
}

exports.doubleToOctetArray = toIEEE754Double;
exports.octetArrayToDouble = fromIEEE754Double;

exports.ieee754NextDouble = function (n) {
  return solve(n, 1);
};

exports.ieee754PrevDouble = function (n) {
  return solve(n, -1);
};
