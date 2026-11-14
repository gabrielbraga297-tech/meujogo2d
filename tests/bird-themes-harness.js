// Auxiliares dos testes dos ambientes do Passarinho (tests/bird-themes-1.test.js e tests/bird-themes-2.test.js), sem navegador: o `g` e o contexto 2D são FALSOS e rigorosos (só os métodos simples do canvas,
// cor definida antes de pintar, sem Math.random nem relógio nem variáveis globais novas) e um rasterizador mínimo (retângulos, círculos, polígonos e linhas) mede cores médias e cobertura. Copiado do
// estilo dos testes dos ambientes do Gatinho (tests/cat-themes-1.test.js); aqui há também os muros "M" e o vento.
const assert = require("assert");
module.exports = function makeHarness(BT) {
  const T = 32;
// ---------- contexto 2D falso com rasterizador ----------
const HEX = /^#[0-9a-f]{6}$/i;
function parseColor(s) {
  let m;
  if (typeof s === "string" && (m = /^#([0-9a-f]{6})$/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  if (typeof s === "string" && (m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/.exec(s))) {
    assert.ok(+m[4] >= 0 && +m[4] <= 1 && +m[1] <= 255 && +m[2] <= 255 && +m[3] <= 255, "rgba fora da faixa: " + s);
    return [+m[1], +m[2], +m[3], +m[4]];
  }
  throw new Error("cor inválida: " + s);
}
const hexRgb = (h) => parseColor(h).slice(0, 3);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

class Raster {
  constructor() { this.rgb = new Float64Array(T * T * 3); this.cov = new Float64Array(T * T); }
  put(x, y, c) {
    if (x < 0 || y < 0 || x >= T || y >= T) return;
    const i = y * T + x, a = c[3];
    if (this.cov[i] === 0) { for (let k = 0; k < 3; k++) this.rgb[i * 3 + k] = c[k]; this.cov[i] = a; return; }
    for (let k = 0; k < 3; k++) this.rgb[i * 3 + k] = this.rgb[i * 3 + k] * (1 - a) + c[k] * a;
    this.cov[i] += a * (1 - this.cov[i]);
  }
  rect(x, y, w, h, c) { const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h); for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) this.put(i, j, c); }
  poly(polys, c) {
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      const px = i + 0.5, py = j + 0.5; let inside = false;
      for (const p of polys) for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
        const [xa, ya] = p[a], [xb, yb] = p[b];
        if ((ya > py) !== (yb > py) && px < (xb - xa) * (py - ya) / (yb - ya) + xa) inside = !inside;
      }
      if (inside) this.put(i, j, c);
    }
  }
  strokePath(polys, lw, c) {
    for (const p of polys) {
      const segs = []; for (let a = 1; a < p.length; a++) segs.push([p[a - 1], p[a]]); if (p.closed && p.length > 2) segs.push([p[p.length - 1], p[0]]);
      for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
        const px = i + 0.5, py = j + 0.5;
        for (const [[xa, ya], [xb, yb]] of segs) {
          const dx = xb - xa, dy = yb - ya, L = dx * dx + dy * dy; let t = L ? ((px - xa) * dx + (py - ya) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
          if (Math.hypot(px - (xa + t * dx), py - (ya + t * dy)) <= lw / 2) { this.put(i, j, c); break; }
        }
      }
    }
  }
  averageRegion(x0, y0, x1, y1) { let r = 0, g = 0, b = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * T + x; if (this.cov[i] > 0) { r += this.rgb[i * 3]; g += this.rgb[i * 3 + 1]; b += this.rgb[i * 3 + 2]; n++; } } return n ? [r / n, g / n, b / n] : null; }
  // fração dos pixels (cobertos nos dois) cuja cor difere da do outro raster em mais de `thr` (distância RGB)
  diff(o, thr) { let n = 0, tot = 0; for (let i = 0; i < T * T; i++) if (this.cov[i] >= 0.5 && o.cov[i] >= 0.5) { tot++; if (Math.hypot(this.rgb[i * 3] - o.rgb[i * 3], this.rgb[i * 3 + 1] - o.rgb[i * 3 + 1], this.rgb[i * 3 + 2] - o.rgb[i * 3 + 2]) > thr) n++; } return tot ? n / tot : 0; }
  average() { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < T * T; i++) if (this.cov[i] > 0) { r += this.rgb[i * 3]; g += this.rgb[i * 3 + 1]; b += this.rgb[i * 3 + 2]; n++; } return n ? [r / n, g / n, b / n] : null; }
  covered(min) { let n = 0; for (let i = 0; i < T * T; i++) if (this.cov[i] >= min) n++; return n; }
}

const CTX_ALLOWED = new Set(["fillStyle", "strokeStyle", "lineWidth", "fillRect", "strokeRect", "beginPath", "moveTo", "lineTo", "closePath", "arc", "fill", "stroke"]);
class FakeCtx {
  constructor(raster) { this.raster = raster; this.ops = []; this.boxes = []; this._fill = undefined; this._stroke = undefined; this._lw = undefined; this.path = []; this.cur = null; this.ox = 0; this.oy = 0; }
  get fillStyle() { return this._fill; } set fillStyle(v) { parseColor(v); this._fill = v; this.ops.push("fs=" + v); }
  get strokeStyle() { return this._stroke; } set strokeStyle(v) { parseColor(v); this._stroke = v; this.ops.push("ss=" + v); }
  get lineWidth() { return this._lw; } set lineWidth(v) { if (!(typeof v === "number" && v > 0)) throw new Error("lineWidth inválido: " + v); this._lw = v; this.ops.push("lw=" + v); }
  box(x, y, w, h, what) {
    if (![x, y, w, h].every(Number.isFinite)) throw new Error("coordenada inválida em " + what);
    this.boxes.push([x - this.ox, y - this.oy, x + w - this.ox, y + h - this.oy]);
  }
  fillRect(x, y, w, h) {
    if (this._fill === undefined) throw new Error("fillRect sem definir a cor antes (herdaria o estado do tile anterior)");
    this.ops.push(`R ${x} ${y} ${w} ${h}`); this.box(x, y, w, h, "fillRect");
    if (this.raster) this.raster.rect(x - this.ox, y - this.oy, w, h, parseColor(this._fill));
  }
  strokeRect(x, y, w, h) {
    if (this._stroke === undefined || this._lw === undefined) throw new Error("strokeRect sem estilo");
    this.ops.push(`SR ${x} ${y} ${w} ${h}`); this.box(x - this._lw / 2, y - this._lw / 2, w + this._lw, h + this._lw, "strokeRect");
  }
  beginPath() { this.ops.push("bp"); this.path = []; this.cur = null; }
  moveTo(x, y) { this.ops.push(`M ${x} ${y}`); this.cur = [[x, y]]; this.path.push(this.cur); this.box(x, y, 0, 0, "moveTo"); }
  lineTo(x, y) { this.ops.push(`L ${x} ${y}`); if (!this.cur) { this.cur = [[x, y]]; this.path.push(this.cur); } else this.cur.push([x, y]); this.box(x, y, 0, 0, "lineTo"); }
  closePath() { this.ops.push("cp"); if (this.cur) this.cur.closed = true; }
  arc(cx, cy, r, a0, a1) {
    if (![cx, cy, r, a0, a1].every(Number.isFinite) || r < 0) throw new Error("arc inválido");
    this.ops.push(`A ${cx} ${cy} ${r} ${a0} ${a1}`); this.box(cx - r, cy - r, 2 * r, 2 * r, "arc");
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 12)));
    if (!this.cur) { this.cur = []; this.path.push(this.cur); }
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; this.cur.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    if (Math.abs(a1 - a0) >= Math.PI * 2 - 1e-9) this.cur.closed = true;
  }
  fill() {
    if (this._fill === undefined) throw new Error("fill sem definir a cor antes");
    this.ops.push("F"); if (this.raster) this.raster.poly(this.path.map((p) => p.map(([x, y]) => [x - this.ox, y - this.oy])), parseColor(this._fill));
  }
  stroke() {
    if (this._stroke === undefined || this._lw === undefined) throw new Error("stroke sem estilo");
    this.ops.push("S"); if (this.raster) this.raster.strokePath(this.path.map((p) => p.map(([x, y]) => [x - this.ox, y - this.oy])), this._lw, parseColor(this._stroke));
  }
}
const strict = (target, allowed, what) => new Proxy(target, {
  get(t, p) { if (typeof p === "symbol") return undefined; if (!allowed.has(p)) throw new Error(`${what}: leitura de "${String(p)}" não permitida`); const v = Reflect.get(t, p, t); return typeof v === "function" ? v.bind(t) : v; },
  set(t, p, v) { if (!allowed.has(p)) throw new Error(`${what}: escrita em "${String(p)}" não permitida`); return Reflect.set(t, p, v, t); },
});
const G_ALLOWED = new Set(["ctx", "rect", "x", "y", "c", "r", "h", "solid", "kind", "border", "time", "mass", "look"]); // (mass: opcional, só o jogo o passa)

// o terreno de teste é uma função pura da posição (como no jogo): `mode` escolhe o desenho do terreno em volta do tile
function kindFn(mode) {
  if (mode === "none") return () => ".";
  if (mode === "all") return () => "#";
  if (mode === "water") return () => "~";
  if (mode === "murofila") return (c, r) => (r === 5 ? "M" : ".");
  return (c, r) => { const v = BT.hash(c * 3 + 1, r * 5 + 2, 99); return v < 0.3 ? "#" : v < 0.4 ? "M" : v < 0.48 ? "X" : v < 0.55 ? "G" : v < 0.61 ? ">" : v < 0.65 ? "<" : v < 0.69 ? "^" : v < 0.73 ? "v" : v < 0.76 ? "~" : "."; };
}
// opts: { c, r, border, mode, kind (função de terreno), time, noKind (sem g.kind), raster }
function drawTile(th, what, { c, r, border = false, mode = "random", kind, time, noKind = false, raster = false, mass, look }) {
  const rs = raster ? new Raster() : null, ctx = new FakeCtx(rs); ctx.ox = c * T; ctx.oy = r * T;
  const sp = strict(ctx, CTX_ALLOWED, "ctx"), kf = kind || kindFn(mode);
  const target = { ctx: sp, rect: (x, y, w, h) => sp.fillRect(x, y, w, h), x: c * T, y: r * T, c, r, border, solid: (cc, rr) => kf(cc, rr) === "#", h: (k) => BT.hash(c, r, k) };
  if (!noKind) target.kind = kf;
  if (mass) target.mass = mass;
  if (time !== undefined) target.time = time;
  if (look) target.look = look;
  th[what](strict(target, G_ALLOWED, "g"));
  return ctx;
}
// roda sem aleatório, relógio nem variáveis globais novas
function pure(fn) {
  const R = Math.random, N = Date.now, P = globalThis.performance && globalThis.performance.now;
  const keys = Object.keys(globalThis).join(",");
  Math.random = () => { throw new Error("Math.random no desenho"); }; Date.now = () => { throw new Error("Date.now no desenho"); };
  if (P) globalThis.performance.now = () => { throw new Error("performance.now no desenho"); };
  try { return fn(); } finally {
    Math.random = R; Date.now = N; if (P) globalThis.performance.now = P;
    assert.strictEqual(Object.keys(globalThis).join(","), keys, "o desenho criou variáveis globais");
  }
}

  const theme = (id) => BT.of(id);
  const paint = (id, what, o) => pure(() => drawTile(theme(id), what, o));
  const open = () => ".";
  // ---------------------------------------------------------------------------------------------------------------------------------
  // A BATERIA DE TESTES (a mesma para as Fases 1 a 10 e 11 a 20): run({ ids, places, label, all (todos os ids já registrados, para comparar com os outros), extra(ctx) })
  let failed = 0;
  function test(name, fn) {
    try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
  }
  const KINDS = ["floor", "wall", "muro", "crate", "high", "wind"];
  const MAX_OPS = 40; // operações de pintura (fillRect, fill, stroke, strokeRect) por tile
  const PAINT = /^(R|SR|F|S)\b/;
  const SAMPLES = [];
  for (let i = 0; i < 400; i++) SAMPLES.push({ c: (i * 7 + 3) % 61, r: (i * 13 + 5) % 43, border: i % 5 === 0, mode: ["random", "none", "all", "random", "water"][i % 5], time: i % 3 === 0 ? undefined : i * 0.37 });
  const SKIN_COLORS = { marrom: "#b9854f", "marrom-asa": "#8f5d34", amarelo: "#ffd43b", azul: "#4d9bec", vermelho: "#ea4a40", verde: "#55c25f", cinza: "#a0a9b8", branco: "#fcfcf8", preto: "#3b3c4a", laranja: "#f28c30" }; // as cores de corpo das skins do passarinho
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const YELLOW = [242, 194, 48];
  const isWarnYellow = (c) => c[0] > 60 && c[1] > c[2] * 2.4;
  const FLOOR_SCENARIOS = {
    aberto: () => { const t = []; for (let r = 3; r < 15; r++) for (let c = 3; c < 15; c++) t.push({ c, r, kind: open }); return t; },
    canto5x5: () => { const t = []; for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 5; dc++) t.push({ c: 10 + dc, r: 10 + dr, kind: (c, r) => (r < 10 || c < 10 ? "#" : ".") }); return t; },
  };
  const WALL_STRIP = (() => { const t = [], k = (c, r) => (c >= 10 && c < 18 && r >= 10 && r < 13 ? "#" : "."); for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 8; dc++) t.push({ c: 10 + dc, r: 10 + dr, kind: k }); return t; })();
  const MURO_STRIP = (() => { const t = [], k = (c, r) => (r === 12 && c >= 9 && c < 19 ? "M" : "."); for (let dc = 0; dc < 10; dc++) t.push({ c: 9 + dc, r: 12, kind: k }); return t; })();
  const cache = {};
  function avgOf(id, what, tiles) {
    let R = 0, G = 0, B = 0, n = 0;
    for (const t of tiles) { const a = paint(id, what, { ...t, raster: true }).raster.average(); if (a) { R += a[0]; G += a[1]; B += a[2]; n++; } }
    return [R / n, G / n, B / n];
  }
  const floorAvg = (id) => (cache["f" + id] = cache["f" + id] || Object.fromEntries(Object.entries(FLOOR_SCENARIOS).map(([k, f]) => [k, avgOf(id, "floor", f())])));
  const wallAvg = (id) => (cache["w" + id] = cache["w" + id] || avgOf(id, "wall", WALL_STRIP));
  const muroAvg = (id) => (cache["m" + id] = cache["m" + id] || avgOf(id, "muro", MURO_STRIP));
  const OBJ_TILES = Array.from({ length: 24 }, (_, i) => ({ c: 20 + i * 3, r: 8 + (i % 5), kind: open }));
  const changed = (id, what, tiles) => { let s = 0; const L = tiles || OBJ_TILES; for (const t of L) s += paint(id, what, { ...t, raster: true }).raster.diff(paint(id, "floor", { ...t, raster: true }).raster, 40); return s / L.length; };
  const MURO_TILES = Array.from({ length: 24 }, (_, i) => ({ c: 20 + i * 3, r: 8 + (i % 5), kind: (c, r) => (r === 8 + (i % 5) && c >= 19 + i * 3 && c <= 21 + i * 3 ? "M" : ".") }));
  const WINDS = [">", "<", "^", "v"];
  const windTile = (ch, o) => ({ c: 14, r: 9, kind: (c, r) => (c === 14 && r === 9 ? ch : "."), ...o });

  function run({ ids: IDS, places: PLACES, label, all, extra }) {
    const N = IDS.length;
    test(`as ${N} fases (${label}) estão registradas, cada uma com o id certo, o lugar combinado, a frase, as 6 funções, as cores do ninho, das peças móveis e do trilho`, () => {
      for (const id of IDS) assert.ok(BT.ids().includes(id), `fase ${id} não registrada`);
      for (const id of IDS) {
        const th = theme(id);
        assert.strictEqual(th.id, id); assert.strictEqual(th.place, PLACES[IDS.indexOf(id)]);
        for (const k of [...KINDS, "water"]) assert.strictEqual(typeof th[k], "function", `${k} da fase ${id}`);
        assert.ok(th.place.trim().length > 0 && th.blurb.trim().length >= 10 && th.blurb.length <= 160, `lugar/frase da fase ${id}`);
        for (const part of ["wall", "door"]) assert.ok(Array.isArray(th.mover[part]) && th.mover[part].length === 3 && th.mover[part].every((c) => HEX.test(c)), `mover.${part} da fase ${id}`);
        assert.ok(Array.isArray(th.rail) && th.rail.length === 2 && th.rail.every((c) => HEX.test(c)), `rail da fase ${id}`);
        assert.ok(th.nest && ["rim", "twig", "lining"].every((k) => HEX.test(th.nest[k])), `nest da fase ${id}`);
        assert.strictEqual(typeof th.night, "boolean"); assert.strictEqual(typeof th.dusk, "boolean");
        assert.ok(!th.night === !(id === 18 || id === 19), `night só nas Fases 18 e 19 (fase ${id})`); assert.ok(!th.dusk === (id !== 18), `dusk só na Fase 18 (fase ${id})`);
        if (th.night) assert.ok(/^rgba\(\d+,\d+,\d+,(0|1|0?\.\d+)\)$/.test(th.halo), `halo da fase ${id}`);
      }
      assert.strictEqual(new Set(IDS.map((id) => theme(id).place)).size, N); assert.strictEqual(new Set(IDS.map((id) => theme(id).blurb)).size, N);
    });
    test("as 6 funções (chão, parede, muro, X, galho, vento) rodam em 400 tiles variados (com e sem g.time e g.kind) sem erro, só com o que o contrato permite, e pintam algo", () => {
      for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
        assert.ok(paint(id, k, s).ops.some((o) => PAINT.test(o)), `${id} ${k} não pintou nada`);
        if (s.c % 4 === 0) { paint(id, k, { ...s, noKind: true }); paint(id, k, { ...s, time: 0 }); }
      }
      for (const id of IDS) for (const s of SAMPLES.slice(0, 40)) paint(id, "water", s);
    });
    test("g.time ausente não lança e equivale a g.time = 0 (as ondas e o vento ficam parados)", () => {
      for (const id of IDS) for (const k of [...KINDS, "water"]) for (const s of SAMPLES.slice(0, 80)) {
        const a = paint(id, k, { ...s, time: undefined }).ops.join("|"), b = paint(id, k, { ...s, time: 0 }).ops.join("|");
        assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r}): sem g.time difere de g.time = 0`);
      }
    });
    test("o desenho é determinístico: as mesmas chamadas geram a mesma sequência na segunda vez (nada pisca nem sorteia)", () => {
      for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 150)) assert.strictEqual(paint(id, k, s).ops.join("|"), paint(id, k, s).ops.join("|"), `${id} ${k} (${s.c},${s.r})`);
    });
    test("só o vento (e a água em volta do mapa) se mexe com g.time; chão, muro, X e galho ficam iguais", () => {
      for (const id of IDS) {
        let moved = 0;
        for (const ch of WINDS) for (const s of SAMPLES.slice(0, 20)) if (paint(id, "wind", windTile(ch, { ...s, c: s.c + 1, time: 0 })).ops.join("|") !== paint(id, "wind", windTile(ch, { ...s, c: s.c + 1, time: 1.3 })).ops.join("|")) moved++;
        assert.ok(moved > 40, `o vento da fase ${id} quase não se mexe com g.time (${moved}/80)`);
        for (const k of ["floor", "muro", "crate", "high"]) for (const s of SAMPLES.slice(0, 60)) assert.strictEqual(paint(id, k, { ...s, time: 0 }).ops.join("|"), paint(id, k, { ...s, time: 1.3 }).ops.join("|"), `${id} ${k} muda com o tempo`);
        for (const s of SAMPLES.slice(0, 60)) if (!s.border) assert.strictEqual(paint(id, "wall", { ...s, time: 0 }).ops.join("|"), paint(id, "wall", { ...s, time: 1.3 }).ops.join("|"), `${id} parede interna muda com o tempo`);
      }
    });
    test(`o desenho é barato: no máximo ${MAX_OPS} operações de pintura por tile (inclusive com muros vizinhos e vento nos 4 sentidos) e o chão, que vai em todos os tiles, é o mais leve`, () => {
      let max = { n: 0 }; const per = {};
      for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
        const n = paint(id, k, s).ops.filter((o) => PAINT.test(o)).length;
        per[k] = per[k] || { sum: 0, n: 0 }; per[k].sum += n; per[k].n++;
        if (n > max.n) max = { n, id, k };
        assert.ok(n <= MAX_OPS, `${id} ${k}: ${n} operações`);
      }
      for (const id of IDS) for (const ch of WINDS) assert.ok(paint(id, "wind", windTile(ch, { time: 0.7 })).ops.filter((o) => PAINT.test(o)).length <= MAX_OPS, `vento ${ch} da fase ${id}`);
      const avg = (k) => per[k].sum / per[k].n;
      console.log(`     (o mais pesado: fase ${max.id} ${max.k} com ${max.n} operações; média por tile: ${KINDS.map((k) => `${k} ${avg(k).toFixed(1)}`).join(", ")})`);
      assert.ok(avg("floor") <= 14, `o chão é pesado demais: ${avg("floor").toFixed(1)} operações por tile`);
    });
    test("nada sai do tile: retângulos, círculos e linhas ficam dentro de [0, 32] (as linhas têm 1 px de folga pela espessura)", () => {
      for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) for (const [x0, y0, x1, y1] of paint(id, k, s).boxes) {
        const out = Math.max(-x0, -y0, x1 - T, y1 - T);
        assert.ok(out <= 1e-6, `${id} ${k} (${s.c},${s.r}): caixa [${x0.toFixed(1)}, ${y0.toFixed(1)}, ${x1.toFixed(1)}, ${y1.toFixed(1)}] sai ${out.toFixed(2)} px do tile`);
      }
    });
    test("o chão, a parede, o muro, o galho e o vento cobrem o tile inteiro (sem frestas por onde apareça o fundo); o X deixa o chão aparecer (10% a 80% do tile)", () => {
      for (const id of IDS) for (const s of SAMPLES.slice(0, 60)) {
        for (const k of ["floor", "wall", "muro", "high", "wind", "water"]) { const n = paint(id, k, { ...s, raster: true }).raster.covered(0.99); assert.ok(n >= T * T, `${k} ${id} (${s.c},${s.r}): só ${n} de ${T * T} pixels`); }
        const x = paint(id, "crate", { ...s, raster: true }).raster.covered(0.5);
        assert.ok(x >= T * T * 0.1 && x <= T * T * 0.8, `X ${id} (${s.c},${s.r}): cobre ${(100 * x / (T * T)).toFixed(0)}% do tile`);
      }
    });
    test("cada tema tem pelo menos 2 desenhos de X e 2 de galho, e o muro muda com os vizinhos (sozinho, em fileira, em coluna e com uma parede ao lado são quatro desenhos)", () => {
      for (const id of IDS) {
        for (const k of ["crate", "high"]) { const set = new Set(); for (let i = 0; i < 80; i++) set.add(paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: open }).ops.join("|")); assert.ok(set.size >= 2, `fase ${id}: só ${set.size} desenho de ${k}`); }
        const mk = (f) => paint(id, "muro", { c: 7, r: 5, kind: f }).ops.join("|");
        const alone = mk((c, r) => (c === 7 && r === 5 ? "M" : ".")), row = mk((c, r) => (r === 5 && c >= 6 && c <= 8 ? "M" : ".")), col = mk((c, r) => (c === 7 && r >= 4 && r <= 6 ? "M" : ".")), wall = mk((c, r) => (c === 7 && r === 5 ? "M" : c === 6 && r === 5 ? "#" : "."));
        assert.strictEqual(new Set([alone, row, col, wall]).size, 4, `fase ${id}: o muro não muda com os vizinhos`);
      }
    });
    test("os desenhos de X, galho, muro e parede de cada fase são só dela: nenhuma sequência de desenho repete a de outra fase", () => {
      const seen = new Map();
      for (const id of (all || IDS)) for (const k of ["crate", "high", "wall", "muro"]) for (let i = 0; i < 60; i++) {
        const sig = k + paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: i % 2 ? open : (c, r) => (c === i * 3 + 2 ? "M" : ".") }).ops.join("|");
        assert.ok(!seen.has(sig) || seen.get(sig) === id, `${k} da fase ${id} é idêntico ao da fase ${seen.get(sig)}`); seen.set(sig, id);
      }
    });
    const group = all || IDS;
    test("as paletas são diferentes: a cor média do chão de cada fase fica a >= 16 de distância das outras (nas 2 situações), sem amarelo vivo", () => {
      let min = { d: 1e9 };
      for (const i of IDS) for (const j of group) { if (i >= j && group === IDS) continue; if (i === j) continue; for (const a of Object.values(floorAvg(i))) for (const b of Object.values(floorAvg(j))) { const d = dist(a, b); if (d < min.d) min = { d, i, j }; } }
      console.log(`     (menor distância entre chãos: ${min.d.toFixed(1)} entre ${theme(min.i).place} e ${theme(min.j).place})`);
      assert.ok(min.d >= 16, `${theme(min.i).place} x ${theme(min.j).place}: ${min.d.toFixed(1)}`);
      for (const id of IDS) for (const [k, a] of Object.entries(floorAvg(id))) assert.ok(!isWarnYellow(a.map(Math.round)), `chão ${id} (${k}) parece amarelo vivo`);
    });
    test("as paredes também têm cor própria por fase (>= 14 de distância entre as paredes de fases diferentes) e as paletas completas (cores usadas) dividem menos de 40% das cores", () => {
      let min = { d: 1e9 };
      for (const i of IDS) for (const j of group) { if (i >= j && group === IDS) continue; if (i === j) continue; const d = dist(wallAvg(i), wallAvg(j)); if (d < min.d) min = { d, i, j }; }
      console.log(`     (menor distância entre paredes: ${min.d.toFixed(1)} entre ${theme(min.i).place} e ${theme(min.j).place})`);
      assert.ok(min.d >= 14, `${theme(min.i).place} x ${theme(min.j).place}: ${min.d.toFixed(1)}`);
      const pal = (id) => { const s = new Set(); for (const k of KINDS) for (let i = 0; i < 30; i++) for (const o of paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: open }).ops) { const m = /^fs=(#[0-9a-f]{6})$/i.exec(o); if (m) s.add(m[1].toLowerCase()); } return s; };
      const pals = new Map(); for (const id of group) pals.set(id, pal(id));
      for (const i of IDS) for (const j of group) { if (i >= j && group === IDS) continue; if (i === j) continue; const a = pals.get(i), b = pals.get(j), inter = [...a].filter((c) => b.has(c)).length, frac = inter / Math.min(a.size, b.size); assert.ok(frac < 0.4, `${theme(i).place} e ${theme(j).place} dividem ${(100 * frac).toFixed(0)}% das cores`); }
    });
    test("a parede é escura e alta e se destaca do chão (>= 30 de distância); o muro é outra coisa: se distingue do chão (>= 22) e da parede (>= 22)", () => {
      const rows = [];
      for (const id of IDS) {
        const f = floorAvg(id).aberto, w = wallAvg(id), m = muroAvg(id);
        rows.push(`${id}: ${dist(w, f).toFixed(0)}/${dist(m, f).toFixed(0)}/${dist(m, w).toFixed(0)}`);
        assert.ok(dist(w, f) >= 30, `fase ${id}: parede ${w.map(Math.round)} x chão ${f.map(Math.round)}`);
        assert.ok(dist(m, f) >= 22, `fase ${id}: muro ${m.map(Math.round)} x chão ${f.map(Math.round)}`);
        assert.ok(dist(m, w) >= 22, `fase ${id}: muro ${m.map(Math.round)} x parede ${w.map(Math.round)}`);
      }
      console.log(`     (distância parede x chão / muro x chão / muro x parede: ${rows.join(", ")})`);
    });
    test("o muro, o galho e o X se destacam do chão do próprio tile: mudam pelo menos 40%, 45% e 25% dos pixels (diferença de cor > 40)", () => {
      const rows = [];
      for (const id of IDS) {
        const m = changed(id, "muro", MURO_TILES), g2 = changed(id, "high"), x = changed(id, "crate");
        rows.push(`${id}: M ${(100 * m).toFixed(0)}% G ${(100 * g2).toFixed(0)}% X ${(100 * x).toFixed(0)}%`);
        assert.ok(m >= 0.4, `fase ${id}: muro pouco visível (${(100 * m).toFixed(0)}%)`); assert.ok(g2 >= 0.45, `fase ${id}: galho pouco visível (${(100 * g2).toFixed(0)}%)`); assert.ok(x >= 0.25, `fase ${id}: X pouco visível (${(100 * x).toFixed(0)}%)`);
      }
      console.log(`     (pixels que o objeto muda: ${rows.join("; ")})`);
    });
    test("contraste do passarinho: o chão de cada fase se distingue das cores de corpo das skins (marrom, amarelo, azul, vermelho, verde, cinza, branco, preto, laranja) em cada tile aberto (>= 20 de distância da cor média)", () => {
      const rows = [], bad = [];
      for (const id of IDS) {
        let worst = { d: 1e9 };
        for (const t of FLOOR_SCENARIOS.aberto()) { const a = paint(id, "floor", { ...t, raster: true }).raster.average(); for (const [n, s] of Object.entries(SKIN_COLORS)) { const d = dist(a, hexRgb(s)); if (d < worst.d) worst = { d, n }; } }
        rows.push(`${id}: ${worst.d.toFixed(0)} (${worst.n})`);
        if (worst.d < 20) bad.push(`fase ${id}: o chão fica a ${worst.d.toFixed(0)} da skin ${worst.n}`);
      }
      console.log(`     (menor distância tile x skin: ${rows.join(", ")})`);
      assert.deepStrictEqual(bad, []);
    });
    test("vento: os 4 sentidos desenham diferente (também com g.time = 0, pela setinha), as fitas andam com o tempo, e o chão do ambiente aparece por baixo", () => {
      for (const id of IDS) {
        const a = WINDS.map((ch) => paint(id, "wind", windTile(ch, { time: 0 })).ops.join("|"));
        assert.strictEqual(new Set(a).size, 4, `fase ${id}: os 4 sentidos do vento não são todos diferentes`);
        const flo = paint(id, "floor", windTile(">", { time: 0 })).ops.join("|");
        assert.ok(a[0].startsWith(flo.slice(0, 400)), `fase ${id}: o vento deveria começar pelo chão do ambiente`);
        const raster = paint(id, "wind", windTile(">", { time: 0.9, raster: true })).raster, base = paint(id, "floor", windTile(">", { time: 0.9, raster: true })).raster;
        assert.ok(raster.diff(base, 14) >= 0.05, `fase ${id}: o vento quase não aparece sobre o chão (${(100 * raster.diff(base, 14)).toFixed(1)}%)`);
      }
    });
    test("vento com skin (g.look, categoria \"gust\"): sem g.look ou com campos vazios ou inválidos é o de sempre; c1, c2 e style mudam o desenho e continuam dentro do tile", () => {
      for (const id of IDS) for (const ch of WINDS) {
        const base = paint(id, "wind", windTile(ch, { time: 0.7 })).ops.join("|");
        for (const lk of [{}, { c1: "azul" }, { style: "xx" }, { c1: 5 }, null]) assert.strictEqual(paint(id, "wind", windTile(ch, { time: 0.7, look: lk })).ops.join("|"), base, JSON.stringify(lk));
        const seen = new Set([base]);
        for (const lk of [{ c1: "#ff3366" }, { c2: "#33ff66" }, { style: "dashes" }, { style: "puffs", c1: "#3366ff" }]) { const r = paint(id, "wind", windTile(ch, { time: 0.7, look: lk })); const l = r.ops.join("|"); assert.ok(!seen.has(l), `fase ${id} ${ch}: ${JSON.stringify(lk)} igual a outro`); seen.add(l); assert.ok(r.ops.filter((o) => PAINT.test(o)).length <= MAX_OPS); for (const [x0, y0, x1, y1] of r.boxes) assert.ok(Math.max(-x0, -y0, x1 - T, y1 - T) <= 1e-6, `fase ${id} ${ch} ${JSON.stringify(lk)} sai do tile`); }
      }
    });
    test("os ambientes só tocam no que o contrato permite: leituras de g.free, g.night ou ctx.save, cor não definida e Math.random são recusadas pelo contexto falso", () => {
      assert.throws(() => drawTile({ floor(g) { g.ctx.save(); } }, "floor", { c: 1, r: 1 }), /não permitida/);
      assert.throws(() => drawTile({ floor(g) { void g.free; } }, "floor", { c: 1, r: 1 }), /não permitida/);
      assert.throws(() => drawTile({ floor(g) { g.rect(0, 0, 1, 1); } }, "floor", { c: 1, r: 1 }), /sem definir a cor/);
      assert.throws(() => pure(() => drawTile({ floor(g) { g.ctx.fillStyle = "#ff0000"; Math.random(); } }, "floor", { c: 1, r: 1 })), /Math\.random/);
    });
    if (extra) extra({ test, paint, theme, floorAvg, wallAvg, muroAvg, luma, dist, hexRgb, open, IDS, KINDS, SAMPLES, windTile });
    console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
    process.exit(failed ? 1 : 0);
  }

  return { run, assert, T, HEX, Raster, FakeCtx, parseColor, hexRgb, dist, drawTile, pure, paint, theme, open, kindFn, strict, CTX_ALLOWED, G_ALLOWED };
};
