/* Blackout QR core: QR construction with full control of codeword bits, plus a
   search for data/filler bits whose masked modules (and Reed-Solomon parity) come out dark.
   Runs in a Web Worker, or on the main thread as a fallback. */
const QRCore = (function () {
  "use strict";
  var T = {"rs":{"1":{"L":[[1,26,19]],"M":[[1,26,16]],"Q":[[1,26,13]],"H":[[1,26,9]]},"2":{"L":[[1,44,34]],"M":[[1,44,28]],"Q":[[1,44,22]],"H":[[1,44,16]]},"3":{"L":[[1,70,55]],"M":[[1,70,44]],"Q":[[2,35,17]],"H":[[2,35,13]]},"4":{"L":[[1,100,80]],"M":[[2,50,32]],"Q":[[2,50,24]],"H":[[4,25,9]]},"5":{"L":[[1,134,108]],"M":[[2,67,43]],"Q":[[2,33,15],[2,34,16]],"H":[[2,33,11],[2,34,12]]},"6":{"L":[[2,86,68]],"M":[[4,43,27]],"Q":[[4,43,19]],"H":[[4,43,15]]},"7":{"L":[[2,98,78]],"M":[[4,49,31]],"Q":[[2,32,14],[4,33,15]],"H":[[4,39,13],[1,40,14]]},"8":{"L":[[2,121,97]],"M":[[2,60,38],[2,61,39]],"Q":[[4,40,18],[2,41,19]],"H":[[4,40,14],[2,41,15]]},"9":{"L":[[2,146,116]],"M":[[3,58,36],[2,59,37]],"Q":[[4,36,16],[4,37,17]],"H":[[4,36,12],[4,37,13]]},"10":{"L":[[2,86,68],[2,87,69]],"M":[[4,69,43],[1,70,44]],"Q":[[6,43,19],[2,44,20]],"H":[[6,43,15],[2,44,16]]},"11":{"L":[[4,101,81]],"M":[[1,80,50],[4,81,51]],"Q":[[4,50,22],[4,51,23]],"H":[[3,36,12],[8,37,13]]},"12":{"L":[[2,116,92],[2,117,93]],"M":[[6,58,36],[2,59,37]],"Q":[[4,46,20],[6,47,21]],"H":[[7,42,14],[4,43,15]]},"13":{"L":[[4,133,107]],"M":[[8,59,37],[1,60,38]],"Q":[[8,44,20],[4,45,21]],"H":[[12,33,11],[4,34,12]]},"14":{"L":[[3,145,115],[1,146,116]],"M":[[4,64,40],[5,65,41]],"Q":[[11,36,16],[5,37,17]],"H":[[11,36,12],[5,37,13]]},"15":{"L":[[5,109,87],[1,110,88]],"M":[[5,65,41],[5,66,42]],"Q":[[5,54,24],[7,55,25]],"H":[[11,36,12],[7,37,13]]},"16":{"L":[[5,122,98],[1,123,99]],"M":[[7,73,45],[3,74,46]],"Q":[[15,43,19],[2,44,20]],"H":[[3,45,15],[13,46,16]]},"17":{"L":[[1,135,107],[5,136,108]],"M":[[10,74,46],[1,75,47]],"Q":[[1,50,22],[15,51,23]],"H":[[2,42,14],[17,43,15]]},"18":{"L":[[5,150,120],[1,151,121]],"M":[[9,69,43],[4,70,44]],"Q":[[17,50,22],[1,51,23]],"H":[[2,42,14],[19,43,15]]},"19":{"L":[[3,141,113],[4,142,114]],"M":[[3,70,44],[11,71,45]],"Q":[[17,47,21],[4,48,22]],"H":[[9,39,13],[16,40,14]]},"20":{"L":[[3,135,107],[5,136,108]],"M":[[3,67,41],[13,68,42]],"Q":[[15,54,24],[5,55,25]],"H":[[15,43,15],[10,44,16]]},"21":{"L":[[4,144,116],[4,145,117]],"M":[[17,68,42]],"Q":[[17,50,22],[6,51,23]],"H":[[19,46,16],[6,47,17]]},"22":{"L":[[2,139,111],[7,140,112]],"M":[[17,74,46]],"Q":[[7,54,24],[16,55,25]],"H":[[34,37,13]]},"23":{"L":[[4,151,121],[5,152,122]],"M":[[4,75,47],[14,76,48]],"Q":[[11,54,24],[14,55,25]],"H":[[16,45,15],[14,46,16]]},"24":{"L":[[6,147,117],[4,148,118]],"M":[[6,73,45],[14,74,46]],"Q":[[11,54,24],[16,55,25]],"H":[[30,46,16],[2,47,17]]},"25":{"L":[[8,132,106],[4,133,107]],"M":[[8,75,47],[13,76,48]],"Q":[[7,54,24],[22,55,25]],"H":[[22,45,15],[13,46,16]]},"26":{"L":[[10,142,114],[2,143,115]],"M":[[19,74,46],[4,75,47]],"Q":[[28,50,22],[6,51,23]],"H":[[33,46,16],[4,47,17]]},"27":{"L":[[8,152,122],[4,153,123]],"M":[[22,73,45],[3,74,46]],"Q":[[8,53,23],[26,54,24]],"H":[[12,45,15],[28,46,16]]},"28":{"L":[[3,147,117],[10,148,118]],"M":[[3,73,45],[23,74,46]],"Q":[[4,54,24],[31,55,25]],"H":[[11,45,15],[31,46,16]]},"29":{"L":[[7,146,116],[7,147,117]],"M":[[21,73,45],[7,74,46]],"Q":[[1,53,23],[37,54,24]],"H":[[19,45,15],[26,46,16]]},"30":{"L":[[5,145,115],[10,146,116]],"M":[[19,75,47],[10,76,48]],"Q":[[15,54,24],[25,55,25]],"H":[[23,45,15],[25,46,16]]},"31":{"L":[[13,145,115],[3,146,116]],"M":[[2,74,46],[29,75,47]],"Q":[[42,54,24],[1,55,25]],"H":[[23,45,15],[28,46,16]]},"32":{"L":[[17,145,115]],"M":[[10,74,46],[23,75,47]],"Q":[[10,54,24],[35,55,25]],"H":[[19,45,15],[35,46,16]]},"33":{"L":[[17,145,115],[1,146,116]],"M":[[14,74,46],[21,75,47]],"Q":[[29,54,24],[19,55,25]],"H":[[11,45,15],[46,46,16]]},"34":{"L":[[13,145,115],[6,146,116]],"M":[[14,74,46],[23,75,47]],"Q":[[44,54,24],[7,55,25]],"H":[[59,46,16],[1,47,17]]},"35":{"L":[[12,151,121],[7,152,122]],"M":[[12,75,47],[26,76,48]],"Q":[[39,54,24],[14,55,25]],"H":[[22,45,15],[41,46,16]]},"36":{"L":[[6,151,121],[14,152,122]],"M":[[6,75,47],[34,76,48]],"Q":[[46,54,24],[10,55,25]],"H":[[2,45,15],[64,46,16]]},"37":{"L":[[17,152,122],[4,153,123]],"M":[[29,74,46],[14,75,47]],"Q":[[49,54,24],[10,55,25]],"H":[[24,45,15],[46,46,16]]},"38":{"L":[[4,152,122],[18,153,123]],"M":[[13,74,46],[32,75,47]],"Q":[[48,54,24],[14,55,25]],"H":[[42,45,15],[32,46,16]]},"39":{"L":[[20,147,117],[4,148,118]],"M":[[40,75,47],[7,76,48]],"Q":[[43,54,24],[22,55,25]],"H":[[10,45,15],[67,46,16]]},"40":{"L":[[19,148,118],[6,149,119]],"M":[[18,75,47],[31,76,48]],"Q":[[34,54,24],[34,55,25]],"H":[[20,45,15],[61,46,16]]}},"align":{"1":[],"2":[6,18],"3":[6,22],"4":[6,26],"5":[6,30],"6":[6,34],"7":[6,22,38],"8":[6,24,42],"9":[6,26,46],"10":[6,28,50],"11":[6,30,54],"12":[6,32,58],"13":[6,34,62],"14":[6,26,46,66],"15":[6,26,48,70],"16":[6,26,50,74],"17":[6,30,54,78],"18":[6,30,56,82],"19":[6,30,58,86],"20":[6,34,62,90],"21":[6,28,50,72,94],"22":[6,26,50,74,98],"23":[6,30,54,78,102],"24":[6,28,54,80,106],"25":[6,32,58,84,110],"26":[6,30,58,86,114],"27":[6,34,62,90,118],"28":[6,26,50,74,98,122],"29":[6,30,54,78,102,126],"30":[6,26,52,78,104,130],"31":[6,30,56,82,108,134],"32":[6,34,60,86,112,138],"33":[6,30,58,86,114,142],"34":[6,34,62,90,118,146],"35":[6,30,54,78,102,126,150],"36":[6,24,50,76,102,128,154],"37":[6,28,54,80,106,132,158],"38":[6,32,58,84,110,136,162],"39":[6,26,54,82,110,138,166],"40":[6,30,58,86,114,142,170]},"fmt":{"L":[30660,29427,32170,30877,26159,25368,27713,26998],"M":[21522,20773,24188,23371,17913,16590,20375,19104],"Q":[13663,12392,16177,14854,9396,8579,11994,11245],"H":[5769,5054,7399,6608,1890,597,3340,2107]},"ver":{"1":0,"2":0,"3":0,"4":0,"5":0,"6":0,"7":31892,"8":34236,"9":39577,"10":42195,"11":48118,"12":51042,"13":55367,"14":58893,"15":63784,"16":68472,"17":70749,"18":76311,"19":79154,"20":84390,"21":87683,"22":92361,"23":96236,"24":102084,"25":102881,"26":110507,"27":110734,"28":117786,"29":119615,"30":126325,"31":127568,"32":133589,"33":136944,"34":141498,"35":145311,"36":150283,"37":152622,"38":158308,"39":161089,"40":167017}};

  // ---------- GF(256), primitive 0x11d ----------
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    var x = 1;
    for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b) { return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]; }

  var GEN = {};
  function rsGen(n) {
    if (GEN[n]) return GEN[n];
    var g = [1];
    for (var i = 0; i < n; i++) {
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
      g = ng;
    }
    return (GEN[n] = Uint8Array.from(g));
  }
  function rsEncode(data, n) {
    var g = rsGen(n), k = data.length, rem = new Uint8Array(k + n);
    rem.set(data);
    for (var i = 0; i < k; i++) {
      var c = rem[i];
      if (c) { var lc = LOG[c]; for (var j = 1; j < g.length; j++) if (g[j]) rem[i + j] ^= EXP[LOG[g[j]] + lc]; }
    }
    return rem.slice(k);
  }

  // ---------- tables ----------
  var P_RES = { "1L": 3, "1M": 2, "1Q": 1, "1H": 1, "2L": 2, "3L": 1 };
  function blocksOf(v, lvl) {
    var out = [];
    T.rs[v][lvl].forEach(function (g) { for (var i = 0; i < g[0]; i++) out.push({ k: g[2], e: g[1] - g[2] }); });
    return out;
  }
  function dataCapacity(v, lvl) { return blocksOf(v, lvl).reduce(function (s, b) { return s + b.k; }, 0); }
  function byteCountBits(v) { return v <= 9 ? 8 : 16; }
  function numCountBits(v) { return v <= 9 ? 10 : v <= 26 ? 12 : 14; }
  function correctable(v, lvl, e) { return Math.floor((e - (P_RES[v + lvl] || 0)) / 2); }

  // ---------- layout ----------
  function maskFn(m) {
    switch (m) {
      case 0: return function (i, j) { return (i + j) % 2 === 0; };
      case 1: return function (i) { return i % 2 === 0; };
      case 2: return function (i, j) { return j % 3 === 0; };
      case 3: return function (i, j) { return (i + j) % 3 === 0; };
      case 4: return function (i, j) { return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0; };
      case 5: return function (i, j) { return (i * j) % 2 + (i * j) % 3 === 0; };
      case 6: return function (i, j) { return ((i * j) % 2 + (i * j) % 3) % 2 === 0; };
      default: return function (i, j) { return ((i * j) % 3 + (i + j) % 2) % 2 === 0; };
    }
  }

  var BASE = {};
  function baseLayout(v) {
    if (BASE[v]) return BASE[v];
    var n = 4 * v + 17, F = new Int8Array(n * n).fill(-1);
    function set(r, c, val) { F[r * n + c] = val ? 1 : 0; }
    function probe(row, col) {
      for (var r = -1; r < 8; r++) {
        if (row + r <= -1 || n <= row + r) continue;
        for (var c = -1; c < 8; c++) {
          if (col + c <= -1 || n <= col + c) continue;
          var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          set(row + r, col + c, on);
        }
      }
    }
    probe(0, 0); probe(n - 7, 0); probe(0, n - 7);
    var pos = T.align[v];
    for (var a = 0; a < pos.length; a++) for (var b = 0; b < pos.length; b++) {
      var row = pos[a], col = pos[b];
      if (F[row * n + col] !== -1) continue;
      for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++)
        set(row + r, col + c, r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0));
    }
    for (var i = 8; i < n - 8; i++) {
      if (F[i * n + 6] === -1) set(i, 6, i % 2 === 0);
      if (F[6 * n + i] === -1) set(6, i, i % 2 === 0);
    }
    // reserve format + version areas (values filled per level/mask)
    var fmtCells = [];
    for (var q = 0; q < 15; q++) {
      var vr = q < 6 ? q : q < 8 ? q + 1 : n - 15 + q;
      var hc = q < 8 ? n - q - 1 : q < 9 ? 15 - q : 15 - q - 1;
      fmtCells.push([vr * n + 8, 8 * n + hc]);
      F[vr * n + 8] = 0; F[8 * n + hc] = 0;
    }
    F[(n - 8) * n + 8] = 1;
    if (v >= 7) {
      var vb = T.ver[v];
      for (var t = 0; t < 18; t++) {
        var bit = (vb >> t) & 1;
        set(Math.floor(t / 3), t % 3 + n - 11, bit);
        set(t % 3 + n - 11, Math.floor(t / 3), bit);
      }
    }
    // data module order
    var order = [], inc = -1, row2 = n - 1;
    for (var cstep = n - 1; cstep > 0; cstep -= 2) {
      var col2 = cstep <= 6 ? cstep - 1 : cstep;
      for (;;) {
        for (var cc = 0; cc < 2; cc++) { var c2 = col2 - cc; if (F[row2 * n + c2] === -1) order.push(row2 * n + c2); }
        row2 += inc;
        if (row2 < 0 || row2 >= n) { row2 -= inc; inc = -inc; break; }
      }
    }
    return (BASE[v] = { n: n, F: F, fmtCells: fmtCells, order: Int32Array.from(order) });
  }

  function functionMatrix(v, lvl, mask) {
    var B = baseLayout(v), F = B.F.slice(), bits = T.fmt[lvl][mask];
    for (var q = 0; q < 15; q++) { var on = (bits >> q) & 1; F[B.fmtCells[q][0]] = on; F[B.fmtCells[q][1]] = on; }
    return F;
  }

  function interleave(blks) {
    var out = [], maxk = 0, i, b;
    blks.forEach(function (x) { if (x.k > maxk) maxk = x.k; });
    for (i = 0; i < maxk; i++) for (b = 0; b < blks.length; b++) if (i < blks[b].k) out.push([b, i]);
    for (i = 0; i < blks[0].e; i++) for (b = 0; b < blks.length; b++) out.push([b, blks[b].k + i]);
    return out;
  }

  // target bit (1 = this codeword bit must be 1 for its module to end up dark) per block
  function targets(v, lvl, mask) {
    var B = baseLayout(v), n = B.n, blks = blocksOf(v, lvl), mf = maskFn(mask), il = interleave(blks);
    var Tg = blks.map(function (x) { return new Uint8Array(8 * (x.k + x.e)); });
    for (var cw = 0; cw < il.length; cw++) {
      for (var j = 0; j < 8; j++) {
        var p = B.order[8 * cw + j], r = (p / n) | 0, c = p % n;
        Tg[il[cw][0]][8 * il[cw][1] + j] = mf(r, c) ? 0 : 1;
      }
    }
    return Tg;
  }

  // codewords: array per block of full codeword bytes; painted: array per block of Set(codeword index)
  function assemble(v, lvl, mask, codewords, painted) {
    var B = baseLayout(v), n = B.n, F = functionMatrix(v, lvl, mask), M = new Uint8Array(n * n);
    for (var i = 0; i < n * n; i++) M[i] = F[i] === 1 ? 1 : 0;
    var blks = blocksOf(v, lvl), il = interleave(blks), mf = maskFn(mask);
    for (var j = 0; j < B.order.length; j++) {
      var p = B.order[j], r = (p / n) | 0, c = p % n, cw = j >> 3, bit;
      if (cw < il.length) {
        var b = il[cw][0], idx = il[cw][1];
        if (painted && painted[b] && painted[b].has(idx)) { M[p] = 1; continue; }
        bit = (codewords[b][idx] >> (7 - (j & 7))) & 1;
      } else bit = 0; // remainder bits
      if (mf(r, c)) bit ^= 1;
      M[p] = bit;
    }
    return M;
  }

  // ---------- bitstream plan ----------
  function utf8(s) { return typeof TextEncoder !== "undefined" ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, "utf8")); }

  function pushBits(arr, value, len) { for (var i = len - 1; i >= 0; i--) arr.push((value >> i) & 1); }

  // mode: "hidden" = text + end marker, then free filler bits (ignored by readers)
  //       "fragment" = text + "#" as bytes, then a numeric segment of free digits (fully standard)
  //       "standard" = ordinary QR padding (no freedom; for comparison/tests)
  function fits(text, v, lvl, mode) {
    var bytes = utf8(mode === "fragment" ? text + "#" : text);
    var need = 4 + byteCountBits(v) + 8 * bytes.length;
    if (bytes.length >= (1 << byteCountBits(v))) return false;
    if (mode === "fragment") need += 4 + numCountBits(v) + 10;
    return need <= 8 * dataCapacity(v, lvl);
  }
  function minVersion(text, lvl, mode) { for (var v = 1; v <= 40; v++) if (fits(text, v, lvl, mode)) return v; return 0; }

  function plan(text, v, lvl, mode) {
    var cap = dataCapacity(v, lvl), nbits = 8 * cap;
    var bytes = utf8(mode === "fragment" ? text + "#" : text);
    var fixed = [];
    pushBits(fixed, 4, 4); pushBits(fixed, bytes.length, byteCountBits(v));
    for (var i = 0; i < bytes.length; i++) pushBits(fixed, bytes[i], 8);
    var groups = [], D = 0, tail = [], freeFrom, freeTo, tailStart = 0;
    if (mode === "fragment") {
      pushBits(fixed, 1, 4);
      var cb = numCountBits(v), start = fixed.length + cb, avail = nbits - start;
      D = 3 * Math.floor(avail / 10) + (avail % 10 >= 7 ? 2 : avail % 10 >= 4 ? 1 : 0);
      if (D >= 1 << cb) D = (1 << cb) - 1;
      pushBits(fixed, D, cb);
      var pos = start;
      for (var g = 0; g < Math.floor(D / 3); g++) { groups.push([pos, 10, 1000]); pos += 10; }
      if (D % 3 === 2) { groups.push([pos, 7, 100]); pos += 7; } else if (D % 3 === 1) { groups.push([pos, 4, 10]); pos += 4; }
      freeFrom = start; freeTo = pos;
      tail = standardTail(pos, nbits); tailStart = pos;
    } else if (mode === "hidden") {
      for (var t = 0; t < 4 && fixed.length < nbits; t++) fixed.push(0);
      freeFrom = fixed.length; freeTo = nbits;
    } else {
      freeFrom = freeTo = nbits;
      tail = standardTail(fixed.length, nbits); tailStart = fixed.length;
    }
    // bit status: 0/1 fixed value, 2 = free
    var status = new Uint8Array(nbits).fill(2);
    for (var a = 0; a < fixed.length; a++) status[a] = fixed[a];
    for (var b = 0; b < tail.length; b++) status[tailStart + b] = tail[b];
    if (mode === "standard") for (var s = 0; s < nbits; s++) if (status[s] === 2) status[s] = 0;
    return { v: v, lvl: lvl, mode: mode, text: text, nbits: nbits, status: status, groups: groups, digits: D,
      freeBits: freeTo - freeFrom };
  }
  function standardTail(pos, nbits) {
    var tail = [];
    for (var t = 0; t < 4 && pos + tail.length < nbits; t++) tail.push(0);
    while ((pos + tail.length) % 8 && pos + tail.length < nbits) tail.push(0);
    var pads = [0xec, 0x11], k = 0;
    while (pos + tail.length < nbits) { pushBits(tail, pads[k++ % 2], 8); }
    return tail;
  }

  // ---------- optimisation ----------
  function pc(x) { x = x - ((x >>> 1) & 0x55555555); x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24; }

  var COLS = {};
  function columns(k, e) {
    var key = k + ":" + e;
    if (COLS[key]) return COLS[key];
    var W = (8 * e + 31) >> 5, cols = new Uint32Array(8 * k * W), unit = new Uint8Array(k);
    for (var p = 0; p < k; p++) {
      unit.fill(0); unit[p] = 1;
      var par1 = rsEncode(unit, e);
      for (var j = 0; j < 8; j++) {
        var val = 1 << (7 - j), i = 8 * p + j;
        for (var q = 0; q < e; q++) {
          var byte = gmul(par1[q], val);
          for (var bb = 0; bb < 8; bb++) if ((byte >> (7 - bb)) & 1) { var pb = 8 * q + bb; cols[i * W + (pb >> 5)] |= (1 << (pb & 31)) >>> 0; }
        }
      }
    }
    return (COLS[key] = { W: W, cols: cols });
  }

  function Rng(seed) { var s = seed >>> 0 || 1; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  // shared, cross-block state for numeric digit groups
  function Groups(pl) {
    var gOf = new Int32Array(pl.nbits).fill(-1), gW = new Int32Array(pl.nbits), gMax = new Int32Array(pl.groups.length);
    pl.groups.forEach(function (g, gi) {
      gMax[gi] = g[2];
      for (var j = 0; j < g[1]; j++) { gOf[g[0] + j] = gi; gW[g[0] + j] = 1 << (g[1] - 1 - j); }
    });
    return { gOf: gOf, gW: gW, gMax: gMax, gVal: new Int32Array(pl.groups.length) };
  }

  function Block(ctx, b, off, k, e, tgt, tMax) {
    var C = columns(k, e), W = C.W, cols = C.cols, nD = 8 * k, nP = 8 * e;
    var tdat = tgt.subarray(0, nD), tparBits = tgt.subarray(nD);
    var tpar = new Uint32Array(W);
    for (var j = 0; j < nP; j++) if (tparBits[j]) tpar[j >> 5] |= (1 << (j & 31)) >>> 0;
    var st = ctx.plan.status, G = ctx.G, gOf = G.gOf, gW = G.gW, gVal = G.gVal, gMax = G.gMax;
    var d = new Uint8Array(nD), freeL = [];
    for (var i = 0; i < nD; i++) { var s = st[off + i]; if (s === 2) { d[i] = tdat[i]; freeL.push(i); } else d[i] = s; }
    var free = Int32Array.from(freeL), nf = free.length;
    var wdat = new Uint8Array(nD).fill(1), wmask = new Uint32Array(W), cw = new Uint32Array(nD * W);
    var x = new Uint32Array(W), cost = 0, painted = [];
    var self = { b: b, off: off, k: k, e: e, d: d, tMax: tMax, nf: nf };

    function setWeights(p) {
      painted = p; wdat.fill(1); wmask.fill(0);
      for (var q = 0; q < nP; q++) wmask[q >> 5] |= (1 << (q & 31)) >>> 0;
      p.forEach(function (idx) {
        if (idx < k) for (var j = 0; j < 8; j++) wdat[8 * idx + j] = 0;
        else for (var j2 = 0; j2 < 8; j2++) { var q2 = 8 * (idx - k) + j2; wmask[q2 >> 5] &= ~(1 << (q2 & 31)); }
      });
      for (var i = 0; i < nD; i++) for (var w = 0; w < W; w++) cw[i * W + w] = cols[i * W + w] & wmask[w];
      recompute();
    }
    function recompute() {
      x.set(tpar);
      for (var i = 0; i < nD; i++) if (d[i]) for (var w = 0; w < W; w++) x[w] ^= cols[i * W + w];
      cost = 0;
      for (var w2 = 0; w2 < W; w2++) cost += pc(x[w2] & wmask[w2]);
      for (var i2 = 0; i2 < nD; i2++) if (wdat[i2] && d[i2] !== tdat[i2]) cost++;
    }
    function ddat(i) { return wdat[i] ? (d[i] !== tdat[i] ? -1 : 1) : 0; }
    function flip(i) {
      d[i] ^= 1;
      for (var w = 0; w < W; w++) x[w] ^= cols[i * W + w];
      var g = gOf[off + i]; if (g >= 0) gVal[g] ^= gW[off + i];
    }
    function okSet(a, b2, c) {
      // are the groups touched by flipping bits {a,b2,c} (local indices, -1 = none) still valid?
      var list = [a, b2, c];
      for (var u = 0; u < 3; u++) {
        if (list[u] < 0) continue;
        var g = gOf[off + list[u]]; if (g < 0) continue;
        var v = gVal[g];
        for (var t = 0; t < 3; t++) if (list[t] >= 0 && gOf[off + list[t]] === g) v ^= gW[off + list[t]];
        if (v >= gMax[g]) return false;
      }
      return true;
    }
    function single(i) { var s = ddat(i), o = i * W; for (var w = 0; w < W; w++) { var y = cw[o + w]; s += pc(y) - 2 * pc(y & x[w]); } return s; }

    self.init = function () {
      // repair digit groups that start out invalid (value >= limit), clearing free bits MSB-first
      for (var q = 0; q < nf; q++) {
        var i = free[q], g = gOf[off + i];
        if (g >= 0 && gVal[g] >= gMax[g] && d[i]) { flip(i); }
      }
      setWeights(tMax > 0 ? rangeArr(k + e - tMax, k + e) : []);
    };
    self.cost = function () { return cost; };
    self.painted = function () { return painted; };
    self.tabu = function (iters, rng) {
      if (!nf) return;
      var best = cost, bestD = d.slice(), tabuUntil = new Int32Array(nD), lastImp = 0;
      for (var it = 0; it < iters; it++) {
        if (it - lastImp > 600) break;
        var bi = -1, bd = 1 << 30, cnt = 0;
        for (var q = 0; q < nf; q++) {
          var i = free[q];
          if (!okSet(i, -1, -1)) continue;
          var dd = single(i);
          if (tabuUntil[i] > it && cost + dd >= best) continue;
          if (dd < bd) { bd = dd; bi = i; cnt = 1; } else if (dd === bd) { cnt++; if (rng() * cnt < 1) bi = i; }
        }
        if (bi < 0) break;
        flip(bi); cost += bd;
        tabuUntil[bi] = it + 20 + ((rng() * 60) | 0);
        if (cost < best) { best = cost; bestD.set(d); lastImp = it; }
      }
      // restore best
      for (var i3 = 0; i3 < nD; i3++) if (d[i3] !== bestD[i3]) flip(i3);
      recompute();
    };
    // first-improvement search over 1- and 2-bit moves; returns true if it improved
    self.pairStep = function (rng) {
      if (!nf) return false;
      var start = (rng() * nf) | 0;
      for (var aa = 0; aa < nf; aa++) {
        var i = free[(aa + start) % nf], oi = i * W, di = ddat(i);
        var s1 = single(i);
        if (s1 < 0 && okSet(i, -1, -1)) { flip(i); cost += s1; return true; }
        for (var bb = 0; bb < nf; bb++) {
          var j = free[bb]; if (j <= i) continue;
          var s = di + ddat(j), oj = j * W;
          for (var w = 0; w < W; w++) { var y = cw[oi + w] ^ cw[oj + w]; s += pc(y) - 2 * pc(y & x[w]); }
          if (s < 0 && okSet(i, j, -1)) { flip(i); flip(j); cost += s; return true; }
        }
      }
      return false;
    };
    // first-improvement 3-bit moves, bounded by a time budget; returns "improved" | "none" | "timeout"
    self.tripleStep = function (rng, deadline, now) {
      if (nf < 3) return "none";
      var tmp = new Uint32Array(W), start = (rng() * nf) | 0;
      for (var aa = 0; aa < nf; aa++) {
        if (now() > deadline) return "timeout";
        var i = free[(aa + start) % nf], oi = i * W, di = ddat(i);
        for (var bb = 0; bb < nf; bb++) {
          var j = free[bb]; if (j <= i) continue;
          var oj = j * W, base = di + ddat(j);
          for (var w = 0; w < W; w++) tmp[w] = cw[oi + w] ^ cw[oj + w];
          for (var cc = bb + 1; cc < nf; cc++) {
            var l = free[cc], ol = l * W, s = base + ddat(l);
            for (var w2 = 0; w2 < W; w2++) { var y = tmp[w2] ^ cw[ol + w2]; s += pc(y) - 2 * pc(y & x[w2]); }
            if (s < 0 && okSet(i, j, l)) { flip(i); flip(j); flip(l); cost += s; return "improved"; }
          }
        }
      }
      return "none";
    };
    // paint the worst codewords (they become deliberate, correctable errors)
    self.repaint = function () {
      if (tMax <= 0) return;
      var mism = new Int32Array(k + e);
      for (var i = 0; i < nD; i++) if (d[i] !== tdat[i]) mism[i >> 3]++;
      for (var q = 0; q < nP; q++) if ((x[q >> 5] >>> (q & 31)) & 1) mism[k + (q >> 3)]++;
      var idx = rangeArr(0, k + e).sort(function (a, b2) { return mism[b2] - mism[a] || b2 - a; });
      setWeights(idx.slice(0, tMax));
    };
    self.codeword = function () {
      var data = new Uint8Array(k);
      for (var i = 0; i < nD; i++) if (d[i]) data[i >> 3] |= 1 << (7 - (i & 7));
      var out = new Uint8Array(k + e); out.set(data); out.set(rsEncode(data, e), k);
      return out;
    };
    return self;
  }
  function rangeArr(a, b) { var r = []; for (var i = a; i < b; i++) r.push(i); return r; }

  function chooseMask(pl) {
    var best = 0, bestScore = Infinity;
    var blks = blocksOf(pl.v, pl.lvl);
    for (var m = 0; m < 8; m++) {
      var Tg = targets(pl.v, pl.lvl, m), score = 0, off = 0;
      blks.forEach(function (bl, b) {
        for (var i = 0; i < 8 * bl.k; i++) { var s = pl.status[off + i]; if (s !== 2 && s !== Tg[b][i]) score++; }
        off += 8 * bl.k;
      });
      var fb = T.fmt[pl.lvl][m]; for (var q = 0; q < 15; q++) if (!((fb >> q) & 1)) score += 2;
      if (score < bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  // Generator: yields progress snapshots while it optimises.
  // opts: {text, v, lvl, mode, budget (0..1), seed, tripleMs}
  function* optimize(opts, now) {
    now = now || function () { return Date.now(); };
    var pl = plan(opts.text, opts.v, opts.lvl, opts.mode);
    var mask = opts.mask != null ? opts.mask : chooseMask(pl);
    var Tg = targets(pl.v, pl.lvl, mask), blks = blocksOf(pl.v, pl.lvl);
    var G = Groups(pl), ctx = { plan: pl, G: G };
    // initialise group values from the starting bits
    var blocks = [], off = 0, rng = Rng(opts.seed || 12345);
    blks.forEach(function (bl, b) {
      var tMax = Math.round((opts.budget || 0) * correctable(pl.v, pl.lvl, bl.e));
      blocks.push(Block(ctx, b, off, bl.k, bl.e, Tg[b], tMax)); off += 8 * bl.k;
    });
    // group values need all blocks' starting bits
    G.gVal.fill(0);
    blocks.forEach(function (B) { for (var i = 0; i < B.d.length; i++) { var g = G.gOf[B.off + i]; if (g >= 0 && B.d[i]) G.gVal[g] ^= G.gW[B.off + i]; } });
    blocks.forEach(function (B) { B.init(); });

    function snapshot(phase, progress) {
      var cws = blocks.map(function (B) { return B.codeword(); });
      var painted = blocks.map(function (B) { return new Set(B.painted()); });
      var M = assemble(pl.v, pl.lvl, mask, cws, painted);
      var paintedCount = painted.reduce(function (s, p) { return s + p.size; }, 0);
      return { phase: phase, progress: progress, matrix: M, n: 4 * pl.v + 17, mask: mask, painted: paintedCount,
        decoded: decodedText(pl, blocks), freeBits: pl.freeBits, v: pl.v, lvl: pl.lvl,
        margin: blks.map(function (bl, b) { return correctable(pl.v, pl.lvl, bl.e) - blocks[b].painted().length; })
          .reduce(function (a, b) { return Math.min(a, b); }, 99) };
    }

    yield snapshot("start", 0);
    var nb = blocks.length, t0 = now();
    // phase 1: tabu search per block, re-choosing painted codewords
    for (var b = 0; b < nb; b++) {
      var B = blocks[b];
      B.tabu(1500, rng); B.repaint(); B.tabu(600, rng); B.repaint();
      if (now() - t0 > 120 || b === nb - 1) { t0 = now(); yield snapshot("tune", (b + 1) / nb); }
    }
    // phase 2: 1- and 2-bit descent
    for (var b2 = 0; b2 < nb; b2++) {
      var B2 = blocks[b2];
      for (var rounds = 0; rounds < 3; rounds++) {
        var before = B2.cost();
        while (B2.pairStep(rng)) { if (now() - t0 > 150) { t0 = now(); yield snapshot("pairs", b2 / nb); } }
        B2.repaint();
        if (B2.cost() >= before) break;
      }
      if (now() - t0 > 100 || b2 === nb - 1) { t0 = now(); yield snapshot("pairs", (b2 + 1) / nb); }
    }
    // phase 3: bounded 3-bit search
    var ms = opts.tripleMs != null ? opts.tripleMs : 400;
    for (var b3 = 0; b3 < nb && ms > 0; b3++) {
      var B3 = blocks[b3], deadline = now() + ms;
      for (;;) {
        var r = B3.tripleStep(rng, deadline, now);
        if (r !== "improved") break;
        while (B3.pairStep(rng)) {}
        B3.repaint();
        if (now() - t0 > 150) { t0 = now(); yield snapshot("triples", b3 / nb); }
      }
      if (now() - t0 > 100 || b3 === nb - 1) { t0 = now(); yield snapshot("triples", (b3 + 1) / nb); }
    }
    return snapshot("done", 1);
  }

  function decodedText(pl, blocks) {
    if (pl.mode !== "fragment") return pl.text;
    var bits = new Uint8Array(pl.nbits), off = 0;
    blocks.forEach(function (B) { bits.set(B.d, off); off += B.d.length; });
    var s = "";
    pl.groups.forEach(function (g) {
      var v = 0; for (var j = 0; j < g[1]; j++) v = (v << 1) | bits[g[0] + j];
      s += String(v).padStart(g[1] === 10 ? 3 : g[1] === 7 ? 2 : 1, "0");
    });
    return pl.text + "#" + s;
  }

  // ordinary (standard padding) encode, for tests and comparison
  function standard(text, v, lvl, mask) {
    var pl = plan(text, v, lvl, "standard"), blks = blocksOf(v, lvl), cws = [], off = 0;
    blks.forEach(function (bl) {
      var data = new Uint8Array(bl.k);
      for (var i = 0; i < 8 * bl.k; i++) if (pl.status[off + i]) data[i >> 3] |= 1 << (7 - (i & 7));
      off += 8 * bl.k;
      var cw = new Uint8Array(bl.k + bl.e); cw.set(data); cw.set(rsEncode(data, bl.e), bl.k); cws.push(cw);
    });
    return assemble(v, lvl, mask, cws, null);
  }

  return { setTables: function (t) { T = t; }, optimize: optimize, minVersion: minVersion, fits: fits, standard: standard,
    dataCapacity: dataCapacity, blocksOf: blocksOf, correctable: correctable, plan: plan };
})();

export default QRCore;
