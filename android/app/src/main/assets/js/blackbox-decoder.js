/* Betaflight/Cleanflight Blackbox v2 binary log decoder.
 * Header-driven: field names, predictors and encodings are read from the log
 * header, so it works across firmware versions as long as the encoding set
 * matches the v2 spec (encodings 0,1,3,6,7,8,9,10).
 * Semantics follow blackbox-log-viewer / blackbox-tools.
 */
var BBL = (function () {
  'use strict';

  var MARKER = 'H Product:Blackbox flight data recorder by Nicholas Sherlock';

  // ---- encodings ----
  var ENC_SIGNED_VB = 0,
    ENC_UNSIGNED_VB = 1,
    ENC_NEG_14BIT = 3,
    ENC_TAG8_8SVB = 6,
    ENC_TAG2_3S32 = 7,
    ENC_TAG8_4S16 = 8,
    ENC_NULL = 9,
    ENC_TAG2_3SVARIABLE = 10;

  // ---- predictors ----
  var PRED_0 = 0,
    PRED_PREVIOUS = 1,
    PRED_STRAIGHT_LINE = 2,
    PRED_AVERAGE_2 = 3,
    PRED_MINTHROTTLE = 4,
    PRED_MOTOR_0 = 5,
    PRED_INC = 6,
    PRED_HOME_COORD = 7,
    PRED_1500 = 8,
    PRED_VBATREF = 9,
    PRED_LAST_MAIN_FRAME_TIME = 10,
    PRED_MINMOTOR = 11;

  function EOFError() { this.eof = true; }

  function Stream(u8, start, end) {
    this.u8 = u8;
    this.pos = start;
    this.end = end;
  }
  Stream.prototype.eof = function () { return this.pos >= this.end; };
  Stream.prototype.readByte = function () {
    if (this.pos >= this.end) throw new EOFError();
    return this.u8[this.pos++];
  };
  Stream.prototype.peekByte = function () {
    if (this.pos >= this.end) return -1;
    return this.u8[this.pos];
  };
  Stream.prototype.readUnsignedVB = function () {
    var result = 0, shift = 0;
    for (var i = 0; i < 5; i++) {
      var b = this.readByte();
      result = (result | ((b & 0x7f) << shift)) >>> 0;
      if (!(b & 0x80)) return result;
      shift += 7;
    }
    return result;
  };
  Stream.prototype.readSignedVB = function () {
    var u = this.readUnsignedVB();
    return ((u >>> 1) ^ -(u & 1)) | 0;
  };

  function signExtend2Bit(n) { return n & 0x02 ? n - 4 : n; }
  function signExtend4Bit(n) { return n & 0x08 ? n - 16 : n; }
  function signExtend5Bit(n) { return n & 0x10 ? n - 32 : n; }
  function signExtend6Bit(n) { return n & 0x20 ? n - 64 : n; }
  function signExtend7Bit(n) { return n & 0x40 ? n - 128 : n; }
  function signExtend8Bit(n) { return n & 0x80 ? n - 256 : n; }
  function signExtend14Bit(n) { return n & 0x2000 ? n - 16384 : n; }
  function signExtend16Bit(n) { return (n << 16) >> 16; }
  function signExtend24Bit(n) { return (n << 8) >> 8; }

  function readTag2_3S32(s, out) {
    var lead = s.readByte(), b1, b2, b3, b4, i;
    switch (lead >> 6) {
      case 0: // 2-bit fields
        out[0] = signExtend2Bit((lead >> 4) & 0x03);
        out[1] = signExtend2Bit((lead >> 2) & 0x03);
        out[2] = signExtend2Bit(lead & 0x03);
        break;
      case 1: // 4-bit fields
        out[0] = signExtend4Bit(lead & 0x0f);
        b1 = s.readByte();
        out[1] = signExtend4Bit(b1 >> 4);
        out[2] = signExtend4Bit(b1 & 0x0f);
        break;
      case 2: // 6-bit fields
        out[0] = signExtend6Bit(lead & 0x3f);
        b1 = s.readByte();
        out[1] = signExtend6Bit(b1 & 0x3f);
        b2 = s.readByte();
        out[2] = signExtend6Bit(b2 & 0x3f);
        break;
      case 3: // per-field byte counts from 2-bit tags (field 0 in lowest bits)
        for (i = 0; i < 3; i++) {
          switch (lead & 0x03) {
            case 0:
              out[i] = signExtend8Bit(s.readByte());
              break;
            case 1:
              b1 = s.readByte(); b2 = s.readByte();
              out[i] = signExtend16Bit(b1 | (b2 << 8));
              break;
            case 2:
              b1 = s.readByte(); b2 = s.readByte(); b3 = s.readByte();
              out[i] = signExtend24Bit(b1 | (b2 << 8) | (b3 << 16));
              break;
            case 3:
              b1 = s.readByte(); b2 = s.readByte(); b3 = s.readByte(); b4 = s.readByte();
              out[i] = (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)) | 0;
              break;
          }
          lead >>= 2;
        }
        break;
    }
  }

  function readTag2_3SVariable(s, out) {
    var lead = s.readByte(), b1, b2, b3, b4, i;
    switch (lead >> 6) {
      case 0: // 2-bit fields
        out[0] = signExtend2Bit((lead >> 4) & 0x03);
        out[1] = signExtend2Bit((lead >> 2) & 0x03);
        out[2] = signExtend2Bit(lead & 0x03);
        break;
      case 1: // 5/5/4 bits: ss11 111x  2222 3333 with x = top bit of field 2
        out[0] = signExtend5Bit((lead >> 1) & 0x1f);
        b1 = s.readByte();
        out[1] = signExtend5Bit(((lead & 0x01) << 4) | (b1 >> 4));
        out[2] = signExtend4Bit(b1 & 0x0f);
        break;
      case 2: // 8/7/7 bits: ss11 1111  1122 2222  2333 3333
        b1 = s.readByte();
        out[0] = signExtend8Bit(((lead & 0x3f) << 2) | (b1 >> 6));
        b2 = s.readByte();
        out[1] = signExtend7Bit(((b1 & 0x3f) << 1) | (b2 >> 7));
        out[2] = signExtend7Bit(b2 & 0x7f);
        break;
      case 3: // per-field byte counts, same layout as TAG2_3S32 case 3
        for (i = 0; i < 3; i++) {
          switch (lead & 0x03) {
            case 0:
              out[i] = signExtend8Bit(s.readByte());
              break;
            case 1:
              b1 = s.readByte(); b2 = s.readByte();
              out[i] = signExtend16Bit(b1 | (b2 << 8));
              break;
            case 2:
              b1 = s.readByte(); b2 = s.readByte(); b3 = s.readByte();
              out[i] = signExtend24Bit(b1 | (b2 << 8) | (b3 << 16));
              break;
            case 3:
              b1 = s.readByte(); b2 = s.readByte(); b3 = s.readByte(); b4 = s.readByte();
              out[i] = (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)) | 0;
              break;
          }
          lead >>= 2;
        }
        break;
    }
  }

  function readTag8_4S16v2(s, out) {
    var selector = s.readByte();
    var nibbleIndex = 0, buffer = 0, c1, c2, value, i;
    for (i = 0; i < 4; i++) {
      switch (selector & 0x03) {
        case 0:
          value = 0;
          break;
        case 1: // 4 bit
          if (nibbleIndex === 0) {
            buffer = s.readByte();
            value = signExtend4Bit(buffer >> 4);
            nibbleIndex = 1;
          } else {
            value = signExtend4Bit(buffer & 0x0f);
            nibbleIndex = 0;
          }
          break;
        case 2: // 8 bit
          if (nibbleIndex === 0) {
            value = signExtend8Bit(s.readByte());
          } else {
            c1 = (buffer & 0x0f) << 4;
            buffer = s.readByte();
            c1 |= buffer >> 4;
            value = signExtend8Bit(c1);
          }
          break;
        case 3: // 16 bit
          if (nibbleIndex === 0) {
            c1 = s.readByte();
            c2 = s.readByte();
            value = signExtend16Bit((c1 << 8) | c2);
          } else {
            c1 = s.readByte();
            c2 = s.readByte();
            value = signExtend16Bit(((buffer & 0x0f) << 12) | (c1 << 4) | (c2 >> 4));
            buffer = c2;
          }
          break;
      }
      out[i] = value;
      selector >>= 2;
    }
  }

  function readTag8_8SVB(s, out, count) {
    if (count === 1) {
      out[0] = s.readSignedVB();
    } else {
      var header = s.readByte();
      for (var i = 0; i < count; i++, header >>= 1) {
        out[i] = header & 0x01 ? s.readSignedVB() : 0;
      }
    }
  }

  var g3 = [0, 0, 0], g4 = [0, 0, 0, 0], g8 = [0, 0, 0, 0, 0, 0, 0, 0];

  function decodeFrameFields(s, def, dest) {
    var i = 0, count = def.count, enc = def.encoding, j, g;
    while (i < count) {
      switch (enc[i]) {
        case ENC_SIGNED_VB:
          dest[i++] = s.readSignedVB();
          break;
        case ENC_UNSIGNED_VB:
          dest[i++] = s.readUnsignedVB();
          break;
        case ENC_NEG_14BIT:
          dest[i++] = -signExtend14Bit(s.readUnsignedVB());
          break;
        case ENC_TAG8_8SVB:
          g = i + 1;
          while (g < count && g < i + 8 && enc[g] === ENC_TAG8_8SVB) g++;
          readTag8_8SVB(s, g8, g - i);
          for (j = i; j < g; j++) dest[j] = g8[j - i];
          i = g;
          break;
        case ENC_TAG2_3S32:
          readTag2_3S32(s, g3);
          for (j = 0; j < 3 && i + j < count; j++) dest[i + j] = g3[j];
          i += 3;
          break;
        case ENC_TAG8_4S16:
          readTag8_4S16v2(s, g4);
          for (j = 0; j < 4 && i + j < count; j++) dest[i + j] = g4[j];
          i += 4;
          break;
        case ENC_NULL:
          dest[i++] = 0;
          break;
        case ENC_TAG2_3SVARIABLE:
          readTag2_3SVariable(s, g3);
          for (j = 0; j < 3 && i + j < count; j++) dest[i + j] = g3[j];
          i += 3;
          break;
        default:
          throw new Error('Unsupported field encoding ' + enc[i]);
      }
    }
  }

  function applyPredictors(def, cur, prev, prev2, ctx, skipped) {
    var count = def.count, pred = def.predictor;
    for (var i = 0; i < count; i++) {
      var v = cur[i];
      switch (pred[i]) {
        case PRED_0:
          break;
        case PRED_PREVIOUS:
          if (prev) v += prev[i];
          break;
        case PRED_STRAIGHT_LINE:
          if (prev) v += 2 * prev[i] - prev2[i];
          break;
        case PRED_AVERAGE_2:
          if (prev) v += Math.trunc((prev[i] + prev2[i]) / 2);
          break;
        case PRED_MINTHROTTLE:
          v += ctx.minthrottle;
          break;
        case PRED_MOTOR_0:
          if (ctx.motor0Index >= 0) v += cur[ctx.motor0Index];
          break;
        case PRED_INC:
          v += skipped + 1;
          if (prev) v += prev[i];
          break;
        case PRED_HOME_COORD:
          if (ctx.home) v += ctx.home[i % ctx.home.length] || 0;
          break;
        case PRED_1500:
          v += 1500;
          break;
        case PRED_VBATREF:
          v += ctx.vbatref;
          break;
        case PRED_LAST_MAIN_FRAME_TIME:
          v += ctx.lastMainFrameTime;
          break;
        case PRED_MINMOTOR:
          v += ctx.minMotor;
          break;
      }
      cur[i] = v;
    }
  }

  function hexToFloat(str) {
    var n = parseInt(str, 16);
    if (!isFinite(n)) return NaN;
    var buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, n >>> 0);
    return new DataView(buf).getFloat32(0);
  }

  function decodeLatin1(u8, start, end) {
    var out = '';
    for (var i = start; i < end; i++) out += String.fromCharCode(u8[i]);
    return out;
  }

  function findLogStarts(u8) {
    var m = MARKER, starts = [], i, j, n = u8.length, m0 = m.charCodeAt(0);
    outer: for (i = 0; i <= n - m.length; i++) {
      if (u8[i] !== m0) continue;
      for (j = 1; j < m.length; j++) {
        if (u8[i + j] !== m.charCodeAt(j)) continue outer;
      }
      starts.push(i);
      i += m.length - 1;
    }
    return starts;
  }

  function parseHeaders(u8, start, end) {
    var pos = start, headers = {};
    while (pos < end - 1) {
      if (u8[pos] !== 0x48 /*H*/ || u8[pos + 1] !== 0x20 /*space*/) break;
      var nl = pos;
      while (nl < end && u8[nl] !== 0x0a) nl++;
      var line = decodeLatin1(u8, pos + 2, nl);
      var ci = line.indexOf(':');
      if (ci >= 0) headers[line.slice(0, ci)] = line.slice(ci + 1);
      pos = nl + 1;
      if (nl >= end) break;
    }
    return { headers: headers, dataStart: pos };
  }

  function buildFrameDef(headers, letter, inheritNames) {
    var nameStr = headers['Field ' + letter + ' name'];
    var names = nameStr ? nameStr.split(',') : inheritNames || null;
    var predStr = headers['Field ' + letter + ' predictor'];
    var encStr = headers['Field ' + letter + ' encoding'];
    if (!names || !predStr || !encStr) return null;
    var def = {
      count: names.length,
      names: names,
      predictor: predStr.split(',').map(Number),
      encoding: encStr.split(',').map(Number),
      nameToIndex: {},
    };
    for (var i = 0; i < names.length; i++) def.nameToIndex[names[i]] = i;
    if (def.predictor.length < def.count || def.encoding.length < def.count) return null;
    return def;
  }

  function parsePInterval(headers) {
    var v = headers['P interval'] || '1/1';
    var m = /^(\d+)\/(\d+)$/.exec(v.trim());
    if (m) return { num: +m[1], denom: +m[2] };
    var d = parseInt(v, 10);
    return { num: 1, denom: isFinite(d) && d > 0 ? d : 1 };
  }

  function shouldHaveFrame(idx, iInterval, pNum, pDenom) {
    return ((idx % iInterval) + pNum - 1) % pDenom < pNum;
  }

  function countSkipped(lastIter, iInterval, pNum, pDenom) {
    if (lastIter < 0) return 0;
    var count = 0;
    for (var idx = lastIter + 1; !shouldHaveFrame(idx, iInterval, pNum, pDenom); idx++) {
      count++;
      if (count > 512) break;
    }
    return count;
  }

  var VALID_FRAME_TYPES = { 0x49: 1, 0x50: 1, 0x53: 1, 0x45: 1, 0x47: 1, 0x48: 1 };

  var END_OF_LOG = 'End of log';

  var MAX_TIME_JUMP = 10 * 1000 * 1000; // 10 s, like the reference viewer
  var MAX_ITER_JUMP = 500 * 10;

  /* Parse one log's binary section.
   * Returns { headers, meta, frames: {time,sp0..2,gy0..2,motorMax,motorMin,count}, stats } */
  function parseLog(u8, start, end) {
    var hp = parseHeaders(u8, start, end);
    var headers = hp.headers;

    if ((headers['Data version'] || '2').trim() !== '2') {
      throw new Error('Only Blackbox data version 2 is supported (found ' + headers['Data version'] + ')');
    }

    var iDef = buildFrameDef(headers, 'I');
    if (!iDef) throw new Error('Log has no I-frame field definitions (truncated header?)');
    var pDef = buildFrameDef(headers, 'P', iDef.names);
    var sDef = buildFrameDef(headers, 'S');
    var gDef = buildFrameDef(headers, 'G');
    var hDef = buildFrameDef(headers, 'H');

    var timeIdx = iDef.nameToIndex['time'];
    var loopIdx = iDef.nameToIndex['loopIteration'];
    if (timeIdx === undefined) throw new Error('Log has no time field');

    var spIdx = [iDef.nameToIndex['setpoint[0]'], iDef.nameToIndex['setpoint[1]'], iDef.nameToIndex['setpoint[2]']];
    var gyIdx = [iDef.nameToIndex['gyroADC[0]'], iDef.nameToIndex['gyroADC[1]'], iDef.nameToIndex['gyroADC[2]']];
    var motorIdx = [];
    for (var mi = 0; mi < 8; mi++) {
      var ix = iDef.nameToIndex['motor[' + mi + ']'];
      if (ix === undefined) break;
      motorIdx.push(ix);
    }

    var hasSetpoint = spIdx[0] !== undefined && spIdx[1] !== undefined && spIdx[2] !== undefined;
    var hasGyro = gyIdx[0] !== undefined && gyIdx[1] !== undefined && gyIdx[2] !== undefined;

    // gyro scale: Betaflight/Cleanflight store deg/s per LSB; Baseflight stores rad/us per LSB
    var gsStr = headers['gyro_scale'] || headers['gyro.scale'];
    var gyroScale = gsStr ? hexToFloat(gsStr.trim()) : 1;
    if (!isFinite(gyroScale) || gyroScale === 0) gyroScale = 1;
    if (gyroScale < 1e-6) gyroScale = gyroScale * 1e6 * (180 / Math.PI);

    var motorLo = 1000, motorHi = 2000;
    if (headers['motorOutput']) {
      var mo = headers['motorOutput'].split(',').map(Number);
      if (mo.length === 2 && isFinite(mo[0]) && isFinite(mo[1]) && mo[1] > mo[0]) {
        motorLo = mo[0];
        motorHi = mo[1];
      }
    } else {
      if (isFinite(+headers['minthrottle'])) motorLo = +headers['minthrottle'];
      if (isFinite(+headers['maxthrottle'])) motorHi = +headers['maxthrottle'];
    }
    var motorRange = motorHi - motorLo;

    var ctx = {
      minthrottle: isFinite(+headers['minthrottle']) ? +headers['minthrottle'] : 1150,
      vbatref: isFinite(+headers['vbatref']) ? +headers['vbatref'] : 0,
      minMotor: motorLo,
      motor0Index: motorIdx.length ? motorIdx[0] : -1,
      lastMainFrameTime: 0,
      home: null,
    };

    var pInt = parsePInterval(headers);
    var iInterval = parseInt(headers['I interval'], 10);
    if (!isFinite(iInterval) || iInterval < 1) iInterval = 32;

    var s = new Stream(u8, hp.dataStart, end);

    var cur = new Array(iDef.count).fill(0);
    var prev = new Array(iDef.count).fill(0);
    var prev2 = new Array(iDef.count).fill(0);
    var sTmp = sDef ? new Array(sDef.count).fill(0) : null;
    var gTmp = gDef ? new Array(gDef.count).fill(0) : null;
    var hTmp = hDef ? new Array(hDef.count).fill(0) : null;

    var historyValid = false;
    var lastIter = -1, lastTime = -1;

    var times = [], sp0 = [], sp1 = [], sp2 = [], gy0 = [], gy1 = [], gy2 = [], mMax = [], mMin = [];
    var stats = { iFrames: 0, pFrames: 0, sFrames: 0, eFrames: 0, gFrames: 0, hFrames: 0, corrupt: 0, endMarker: false };

    function nextByteOk() {
      var b = s.peekByte();
      return b === -1 || VALID_FRAME_TYPES[b] === 1;
    }

    function commitMain() {
      var t = cur[timeIdx];
      times.push(t);
      if (hasSetpoint) {
        sp0.push(cur[spIdx[0]]);
        sp1.push(cur[spIdx[1]]);
        sp2.push(cur[spIdx[2]]);
      } else {
        sp0.push(0); sp1.push(0); sp2.push(0);
      }
      if (hasGyro) {
        gy0.push(cur[gyIdx[0]] * gyroScale);
        gy1.push(cur[gyIdx[1]] * gyroScale);
        gy2.push(cur[gyIdx[2]] * gyroScale);
      } else {
        gy0.push(0); gy1.push(0); gy2.push(0);
      }
      if (motorIdx.length) {
        var mx = -Infinity, mn = Infinity;
        for (var k = 0; k < motorIdx.length; k++) {
          var mv = (cur[motorIdx[k]] - motorLo) / motorRange;
          if (mv > mx) mx = mv;
          if (mv < mn) mn = mv;
        }
        mMax.push(mx);
        mMin.push(mn);
      } else {
        mMax.push(0);
        mMin.push(0);
      }
      lastIter = loopIdx !== undefined ? cur[loopIdx] : lastIter + 1;
      lastTime = t;
      ctx.lastMainFrameTime = t;
      // rotate history
      var tmpArr = prev2;
      prev2 = prev;
      prev = tmpArr;
      for (var q = 0; q < iDef.count; q++) prev[q] = cur[q];
    }

    while (!s.eof()) {
      var frameStart = s.pos;
      var type;
      try {
        type = s.readByte();
        if (type === 0x49 && iDef) {
          // I frame: intra, no history-based predictors
          decodeFrameFields(s, iDef, cur);
          applyPredictors(iDef, cur, null, null, ctx, 0);
          if (nextByteOk() && (lastTime < 0 || cur[timeIdx] >= lastTime - 1000000)) {
            stats.iFrames++;
            commitMain();
            // after an I frame both history slots point at it
            for (var q2 = 0; q2 < iDef.count; q2++) prev2[q2] = prev[q2];
            historyValid = true;
          } else {
            stats.corrupt++;
            s.pos = frameStart + 1;
          }
        } else if (type === 0x50 && pDef) {
          if (!historyValid) {
            s.pos = frameStart + 1;
            continue;
          }
          var skipped = countSkipped(lastIter, iInterval, pInt.num, pInt.denom);
          decodeFrameFields(s, pDef, cur);
          applyPredictors(pDef, cur, prev, prev2, ctx, skipped);
          var dt = cur[timeIdx] - lastTime;
          var dIter = loopIdx !== undefined ? cur[loopIdx] - lastIter : 1;
          if (nextByteOk() && dt >= 0 && dt < MAX_TIME_JUMP && dIter >= 0 && dIter < MAX_ITER_JUMP) {
            stats.pFrames++;
            commitMain();
          } else {
            stats.corrupt++;
            historyValid = false;
            s.pos = frameStart + 1;
          }
        } else if (type === 0x53 && sDef) {
          decodeFrameFields(s, sDef, sTmp);
          applyPredictors(sDef, sTmp, null, null, ctx, 0);
          if (nextByteOk()) {
            stats.sFrames++;
          } else {
            stats.corrupt++;
            s.pos = frameStart + 1;
          }
        } else if (type === 0x45) {
          var ev = s.readByte();
          if (ev === 255) {
            // check for "End of log" marker
            var ok = true;
            for (var c = 0; c < END_OF_LOG.length; c++) {
              if (s.readByte() !== END_OF_LOG.charCodeAt(c)) { ok = false; break; }
            }
            if (ok) {
              stats.endMarker = true;
              break;
            } else {
              stats.corrupt++;
              s.pos = frameStart + 1;
            }
          } else if (ev === 0) {
            s.readUnsignedVB();
            stats.eFrames++;
          } else if (ev === 13) {
            var fb = s.readByte();
            if (fb & 0x80) { s.readByte(); s.readByte(); s.readByte(); s.readByte(); }
            else s.readSignedVB();
            stats.eFrames++;
          } else if (ev === 14) {
            var rIter = s.readUnsignedVB();
            var rTime = s.readUnsignedVB();
            lastIter = rIter - 1;
            lastTime = rTime;
            ctx.lastMainFrameTime = rTime;
            historyValid = false;
            stats.eFrames++;
          } else if (ev === 15) {
            s.readUnsignedVB();
            stats.eFrames++;
          } else if (ev === 30) {
            s.readUnsignedVB();
            s.readUnsignedVB();
            stats.eFrames++;
          } else {
            // unknown event: cannot know its length, resync
            stats.corrupt++;
            s.pos = frameStart + 1;
          }
        } else if (type === 0x48 && hDef) {
          decodeFrameFields(s, hDef, hTmp);
          if (nextByteOk()) {
            stats.hFrames++;
            ctx.home = hTmp.slice(0, 2);
          } else {
            stats.corrupt++;
            s.pos = frameStart + 1;
          }
        } else if (type === 0x47 && gDef) {
          decodeFrameFields(s, gDef, gTmp);
          applyPredictors(gDef, gTmp, null, null, ctx, 0);
          if (nextByteOk()) stats.gFrames++;
          else {
            stats.corrupt++;
            s.pos = frameStart + 1;
          }
        } else {
          // not a recognizable frame start: scan forward
          s.pos = frameStart + 1;
        }
      } catch (e) {
        if (e && e.eof) break;
        stats.corrupt++;
        s.pos = frameStart + 1;
        if (s.pos >= end) break;
      }
    }

    var n = times.length;
    var frames = {
      count: n,
      time: Float64Array.from(times),
      sp: [Float32Array.from(sp0), Float32Array.from(sp1), Float32Array.from(sp2)],
      gy: [Float32Array.from(gy0), Float32Array.from(gy1), Float32Array.from(gy2)],
      motorMax: Float32Array.from(mMax),
      motorMin: Float32Array.from(mMin),
    };

    var durationS = n > 1 ? (frames.time[n - 1] - frames.time[0]) / 1e6 : 0;
    var medianDt = 0;
    if (n > 10) {
      var sample = [];
      var step = Math.max(1, Math.floor(n / 2000));
      for (var d = step; d < n; d += step) sample.push(frames.time[d] - frames.time[d - step]);
      sample.sort(function (a, b) { return a - b; });
      medianDt = sample[Math.floor(sample.length / 2)] / step;
    }

    return {
      headers: headers,
      frames: frames,
      stats: stats,
      meta: {
        firmware: headers['Firmware revision'] || headers['Firmware type'] || 'unknown',
        craft: headers['Craft name'] || '',
        durationS: durationS,
        sampleRateHz: medianDt > 0 ? 1e6 / medianDt : 0,
        motorCount: motorIdx.length,
        motorLo: motorLo,
        motorHi: motorHi,
        hasSetpoint: hasSetpoint,
        hasGyro: hasGyro,
        gyroScale: gyroScale,
        debugMode: headers['debug_mode'] || '',
      },
    };
  }

  /* Top level: split a file into logs and parse each.
   * Returns array of { index, start, end, result | error } */
  function parseFile(u8) {
    var starts = findLogStarts(u8);
    if (!starts.length) throw new Error('No Blackbox log header found in this file. Is it a .bbl / .bfl export from Betaflight?');
    var logs = [];
    for (var i = 0; i < starts.length; i++) {
      var start = starts[i];
      var end = i + 1 < starts.length ? starts[i + 1] : u8.length;
      var entry = { index: i, start: start, end: end };
      try {
        entry.result = parseLog(u8, start, end);
      } catch (e) {
        entry.error = e.message || String(e);
      }
      logs.push(entry);
    }
    return logs;
  }

  return {
    parseFile: parseFile,
    parseLog: parseLog,
    findLogStarts: findLogStarts,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = BBL;
