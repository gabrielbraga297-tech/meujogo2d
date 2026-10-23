// Testes unitários dos ambientes das Fases 1 a 10 do Gatinho (js/cat-themes-1.js), sem navegador. Uso: node tests/cat-themes-1.test.js
// O `g` e o contexto 2D são FALSOS e rigorosos (como em tests/themes.test.js): o desenho só pode ler/escrever g.ctx, g.rect, g.x, g.y, g.c, g.r, g.h, g.solid,
// g.kind, g.border e g.time; só pode chamar os métodos simples do canvas listados abaixo; tem de definir a cor antes de pintar (não herda o estado do tile
// anterior); e não pode usar Math.random nem Date.now. Um rasterizador mínimo (retângulos, círculos, polígonos e linhas) mede cores médias e cobertura.
const assert = require("assert");
const path = require("path");
const CT = require(path.join(__dirname, "../js/cat-themes.js"));
require(path.join(__dirname, "../js/cat-themes-1.js"));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}

const T = 32;
const IDS = Array.from({ length: 10 }, (_, i) => i + 1);
const KINDS = ["floor", "wall", "crate", "high", "water"];
const PLACES = ["Sala de estar", "Cozinha e despensa", "Quintal dos fundos", "Jardim e varal", "Telhados e muros", "Beco da cidade", "Feira livre", "Peixaria e mercado", "Parque e lago", "Armazém de grãos"];
const MAX_OPS = 40; // operações de pintura (fillRect, fill, stroke, strokeRect) por tile

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
const G_ALLOWED = new Set(["ctx", "rect", "x", "y", "c", "r", "h", "solid", "kind", "border", "time"]);

// o terreno de teste é uma função pura da posição (como no jogo): `mode` escolhe o desenho do terreno em volta do tile
function kindFn(mode) {
  if (mode === "none") return () => ".";
  if (mode === "all") return () => "#";
  if (mode === "water") return () => "~";
  return (c, r) => { const v = CT.hash(c * 3 + 1, r * 5 + 2, 99); return v < 0.4 ? "#" : v < 0.5 ? "X" : v < 0.58 ? "T" : v < 0.7 ? "~" : "."; };
}
// opts: { c, r, border, mode, kind (função de terreno), time, noKind (sem g.kind), raster }
function drawTile(th, what, { c, r, border = false, mode = "random", kind, time, noKind = false, raster = false }) {
  const rs = raster ? new Raster() : null, ctx = new FakeCtx(rs); ctx.ox = c * T; ctx.oy = r * T;
  const sp = strict(ctx, CTX_ALLOWED, "ctx"), kf = kind || kindFn(mode);
  const target = { ctx: sp, rect: (x, y, w, h) => sp.fillRect(x, y, w, h), x: c * T, y: r * T, c, r, border, solid: (cc, rr) => kf(cc, rr) === "#", h: (k) => CT.hash(c, r, k) };
  if (!noKind) target.kind = kf;
  if (time !== undefined) target.time = time;
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
const theme = (id) => CT.of(id);
const paint = (id, what, o) => pure(() => drawTile(theme(id), what, o));

// ---------- 400 tiles variados ----------
const SAMPLES = [];
for (let i = 0; i < 400; i++) SAMPLES.push({ c: (i * 7 + 3) % 61, r: (i * 13 + 5) % 43, border: i % 5 === 0, mode: ["random", "none", "all", "random", "water"][i % 5], time: i % 3 === 0 ? undefined : i * 0.37 });
const PAINT = /^(R|SR|F|S)\b/;

// ---------- cores médias (chão em 3 situações; parede em faixa de 3 tiles) ----------
function avgOf(id, what, tiles) {
  let R = 0, G = 0, B = 0, n = 0;
  for (const t of tiles) { const a = paint(id, what, { ...t, raster: true }).raster.average(); if (a) { R += a[0]; G += a[1]; B += a[2]; n++; } }
  return [R / n, G / n, B / n];
}
const open = (c, r) => ".";
const FLOOR_SCENARIOS = {
  aberto: () => { const t = []; for (let r = 3; r < 15; r++) for (let c = 3; c < 15; c++) t.push({ c, r, kind: open }); return t; },
  canto5x5: () => { const t = []; for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 5; dc++) t.push({ c: 10 + dc, r: 10 + dr, kind: (c, r) => (r < 10 || c < 10 ? "#" : ".") }); return t; },
  fechado3x3: () => { const t = []; for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) t.push({ c: 10 + dc, r: 10 + dr, kind: (c, r) => (r < 10 || c < 10 || r > 12 || c > 12 ? "#" : ".") }); return t; },
};
const WALL_STRIP = (() => { const t = [], k = (c, r) => (c >= 10 && c < 18 && r >= 10 && r < 13 ? "#" : "."); for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 8; dc++) t.push({ c: 10 + dc, r: 10 + dr, kind: k }); return t; })();
const cache = {};
const floorAvg = (id) => (cache["f" + id] = cache["f" + id] || Object.fromEntries(Object.entries(FLOOR_SCENARIOS).map(([k, f]) => [k, avgOf(id, "floor", f())])));
const wallAvg = (id) => (cache["w" + id] = cache["w" + id] || avgOf(id, "wall", WALL_STRIP));
// objetos (X, T, ~) sobre terreno aberto, vários tiles, com vizinhos de água para a poça
const OBJ_TILES = Array.from({ length: 24 }, (_, i) => ({ c: 20 + i * 3, r: 8 + (i % 5), kind: open }));
// cor do corpo da poça (centro do tile) e fração dos pixels que o objeto muda em relação ao chão do mesmo tile
const waterBody = (id) => (cache["wb" + id] = cache["wb" + id] || (() => { let R = 0, G = 0, B = 0; for (const t of OBJ_TILES) { const a = paint(id, "water", { ...t, raster: true }).raster.averageRegion(11, 11, 21, 21); R += a[0]; G += a[1]; B += a[2]; } const n = OBJ_TILES.length; return [R / n, G / n, B / n]; })());
const changed = (id, what) => { let s = 0; for (const t of OBJ_TILES) s += paint(id, what, { ...t, raster: true }).raster.diff(paint(id, "floor", { ...t, raster: true }).raster, 40); return s / OBJ_TILES.length; };
const YELLOW = [242, 194, 48];
const blend = (base, a) => base.map((v, i) => v * (1 - a) + YELLOW[i] * a);
const isWarnYellow = (c) => c[0] > 60 && c[1] > c[2] * 2.4;
// peles do gatinho (só para medir o contraste do chão): preto, branco, laranja, cinza, rajado
const SKINS = { preto: [43, 43, 47], branco: [244, 241, 234], laranja: [224, 144, 58], cinza: [141, 146, 156], rajado: [138, 111, 77] };

// =============================== testes ===============================
test("as 10 fases estão registradas em CatThemes, cada uma com o id certo e o lugar combinado", () => {
  for (const id of IDS) assert.ok(CT.ids().includes(id), `fase ${id} não registrada`);
  for (const id of IDS) { assert.strictEqual(theme(id).id, id); assert.strictEqual(theme(id).place, PLACES[id - 1]); }
});
test("cada tema tem as 5 funções, o lugar, a frase, as cores das peças móveis e do trilho, e não é noturno", () => {
  for (const id of IDS) {
    const th = theme(id);
    for (const k of KINDS) assert.strictEqual(typeof th[k], "function", `${k} da fase ${id}`);
    assert.ok(th.place.trim().length > 0 && th.blurb.trim().length >= 10 && th.blurb.length <= 120, `lugar/frase da fase ${id}`);
    for (const part of ["wall", "door"]) assert.ok(Array.isArray(th.mover[part]) && th.mover[part].length === 3 && th.mover[part].every((c) => HEX.test(c)), `mover.${part} da fase ${id}`);
    assert.ok(Array.isArray(th.rail) && th.rail.length === 2 && th.rail.every((c) => HEX.test(c)), `rail da fase ${id}`);
    assert.ok(!th.night, `fase ${id} não é noturna`);
  }
});
test("os 10 lugares e as 10 frases são diferentes", () => {
  assert.strictEqual(new Set(IDS.map((id) => theme(id).place)).size, 10);
  assert.strictEqual(new Set(IDS.map((id) => theme(id).blurb)).size, 10);
});
test("as 5 funções rodam em 400 tiles variados (com e sem g.time e g.kind) sem erro, só com o que o contrato permite, e pintam algo", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
    assert.ok(paint(id, k, s).ops.some((o) => PAINT.test(o)), `${id} ${k} não pintou nada`);
    if (s.c % 4 === 0) { paint(id, k, { ...s, noKind: true }); paint(id, k, { ...s, time: 0 }); }
  }
});
test("g.time ausente não lança e equivale a g.time = 0 (a água fica parada)", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 80)) {
    const a = paint(id, k, { ...s, time: undefined }).ops.join("|"), b = paint(id, k, { ...s, time: 0 }).ops.join("|");
    assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r}): sem g.time difere de g.time = 0`);
  }
});
test("o desenho é determinístico: as mesmas chamadas geram a mesma sequência na segunda vez (nada pisca nem sorteia)", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 150)) {
    const a = paint(id, k, s).ops.join("|"), b = paint(id, k, s).ops.join("|");
    assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r})`);
  }
});
test("a água se mexe com g.time (ondinhas) em todas as fases, e só ela e a lagoa/chaminé mudam com o tempo", () => {
  for (const id of IDS) {
    let moved = 0;
    for (const s of SAMPLES.slice(0, 40)) if (paint(id, "water", { ...s, time: 0 }).ops.join("|") !== paint(id, "water", { ...s, time: 1.3 }).ops.join("|")) moved++;
    assert.ok(moved > 0, `a água da fase ${id} não se mexe com g.time`);
    for (const k of ["floor", "crate"]) for (const s of SAMPLES.slice(0, 60)) assert.strictEqual(paint(id, k, { ...s, time: 0 }).ops.join("|"), paint(id, k, { ...s, time: 1.3 }).ops.join("|"), `${id} ${k} muda com o tempo`);
  }
});
test(`o desenho é barato: no máximo ${MAX_OPS} operações de pintura por tile (inclusive com poças vizinhas e água em volta)`, () => {
  let max = { n: 0 }; const per = {};
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
    const n = paint(id, k, s).ops.filter((o) => PAINT.test(o)).length;
    per[k] = per[k] || { sum: 0, n: 0 }; per[k].sum += n; per[k].n++;
    if (n > max.n) max = { n, id, k };
    assert.ok(n <= MAX_OPS, `${id} ${k}: ${n} operações`);
  }
  console.log(`     (o mais pesado: fase ${max.id} ${max.k} com ${max.n} operações; média por tile: ${KINDS.map((k) => `${k} ${(per[k].sum / per[k].n).toFixed(1)}`).join(", ")})`);
});
test("nada sai do tile: retângulos, círculos e linhas ficam dentro de [0, 32] exato", () => {
  let worst = 0;
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) for (const [x0, y0, x1, y1] of paint(id, k, s).boxes) {
    const out = Math.max(-x0, -y0, x1 - T, y1 - T); worst = Math.max(worst, out);
    assert.ok(out <= 1e-6, `${id} ${k} (${s.c},${s.r}): caixa [${x0}, ${y0}, ${x1}, ${y1}] sai ${out.toFixed(2)} px do tile`);
  }
});
test("o chão cobre o tile inteiro e a parede também (sem frestas por onde apareça o fundo); a água e o lugar alto também, pois pintam a própria base", () => {
  for (const id of IDS) for (const s of SAMPLES.slice(0, 60)) {
    for (const k of ["floor", "wall", "high", "water"]) { const n = paint(id, k, { ...s, raster: true }).raster.covered(0.99); assert.ok(n >= T * T, `${k} ${id} (${s.c},${s.r}): só ${n} de ${T * T} pixels`); }
  }
});
test("o obstáculo baixo (X) cobre de 15% a 80% do tile e deixa o chão aparecer", () => {
  for (const id of IDS) for (const s of SAMPLES.slice(0, 60)) {
    const n = paint(id, "crate", { ...s, raster: true }).raster.covered(0.5);
    assert.ok(n >= T * T * 0.15 && n <= T * T * 0.8, `X ${id} (${s.c},${s.r}): cobre ${(100 * n / (T * T)).toFixed(0)}% do tile`);
  }
});
test("cada tema tem pelo menos 2 desenhos de X, 2 de T e a água se junta com a vizinha (poça de 3 tiles diferente de poça isolada)", () => {
  for (const id of IDS) {
    for (const k of ["crate", "high"]) { const set = new Set(); for (let i = 0; i < 80; i++) set.add(paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: open }).ops.join("|")); assert.ok(set.size >= 2, `fase ${id}: só ${set.size} desenho de ${k}`); }
    const alone = paint(id, "water", { c: 7, r: 5, kind: open }).ops.join("|"), joined = paint(id, "water", { c: 7, r: 5, kind: (c, r) => (c === 6 || c === 7 || c === 8 || r === 5 ? "~" : ".") }).ops.join("|");
    assert.notStrictEqual(alone, joined, `fase ${id}: a poça isolada e a poça com vizinhas saem iguais`);
  }
});
test("X, T e ~ de cada fase têm desenhos próprios: nenhuma sequência de desenho de X, T ou ~ repete a de outra fase", () => {
  const all = new Map();
  for (const id of IDS) for (const k of ["crate", "high", "water", "wall"]) for (let i = 0; i < 60; i++) {
    const sig = k + paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: open }).ops.join("|");
    assert.ok(!all.has(sig) || all.get(sig) === id, `${k} da fase ${id} é idêntico ao da fase ${all.get(sig)}`); all.set(sig, id);
  }
});

test("as paletas são diferentes: a cor média do chão de cada fase fica a >= 24 de distância das outras (em qualquer das 3 situações), sem amarelo vivo", () => {
  let min = { d: 1e9 };
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) for (const a of Object.values(floorAvg(IDS[i]))) for (const b of Object.values(floorAvg(IDS[j]))) { const d = dist(a, b); if (d < min.d) min = { d, i: IDS[i], j: IDS[j] }; }
  console.log(`     (menor distância entre chãos: ${min.d.toFixed(1)} entre ${PLACES[min.i - 1]} e ${PLACES[min.j - 1]})`);
  assert.ok(min.d >= 24, `${PLACES[min.i - 1]} x ${PLACES[min.j - 1]}: ${min.d.toFixed(1)}`);
  for (const id of IDS) for (const [k, a] of Object.entries(floorAvg(id))) assert.ok(!isWarnYellow(a.map(Math.round)), `chão ${id} (${k}) parece amarelo vivo`);
});
test("as paredes também têm cor própria por fase (>= 20 de distância entre as paredes de fases diferentes) e as paletas completas (cores usadas) são todas diferentes", () => {
  let min = { d: 1e9 };
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) { const d = dist(wallAvg(IDS[i]), wallAvg(IDS[j])); if (d < min.d) min = { d, i: IDS[i], j: IDS[j] }; }
  console.log(`     (menor distância entre paredes: ${min.d.toFixed(1)} entre ${PLACES[min.i - 1]} e ${PLACES[min.j - 1]})`);
  assert.ok(min.d >= 20, `${PLACES[min.i - 1]} x ${PLACES[min.j - 1]}: ${min.d.toFixed(1)}`);
  const pal = (id) => { const s = new Set(); for (const k of KINDS) for (let i = 0; i < 30; i++) for (const o of paint(id, k, { c: i * 3 + 1, r: i * 5 + 2, kind: open }).ops) { const m = /^fs=(#[0-9a-f]{6})$/i.exec(o); if (m) s.add(m[1].toLowerCase()); } return s; };
  const pals = IDS.map(pal);
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) { const inter = [...pals[i]].filter((c) => pals[j].has(c)).length, frac = inter / Math.min(pals[i].size, pals[j].size); assert.ok(frac < 0.35, `${PLACES[i]} e ${PLACES[j]} dividem ${(100 * frac).toFixed(0)}% das cores`); }
});
test("contraste: o chão de cada fase se distingue das peles do gatinho (preto, branco, laranja, cinza, rajado) em cada tile do chão aberto (>= 40 de distância)", () => {
  const rows = [], bad = [];
  for (const id of IDS) {
    let worst = { d: 1e9 };
    for (const t of FLOOR_SCENARIOS.aberto()) { const a = paint(id, "floor", { ...t, raster: true }).raster.average(); for (const [n, s] of Object.entries(SKINS)) { const d = dist(a, s); if (d < worst.d) worst = { d, n }; } }
    rows.push(`${id}: ${worst.d.toFixed(0)} (${worst.n})`);
    if (worst.d < 40) bad.push(`fase ${id}: o chão fica a ${worst.d.toFixed(0)} da pele ${worst.n}`);
  }
  console.log(`     (menor distância tile x pele: ${rows.join(", ")})`);
  assert.deepStrictEqual(bad, []);
});
test("o lugar alto (T), o obstáculo (X) e a poça (~) se destacam do chão do próprio tile: mudam pelo menos 50%, 30% e 45% dos pixels (as árvores são redondas e deixam o chão aparecer nos cantos) (diferença de cor > 40)", () => {
  const rows = [];
  for (const id of IDS) {
    const x = changed(id, "crate"), t = changed(id, "high"), w = changed(id, "water");
    rows.push(`${id}: X ${(100 * x).toFixed(0)}% T ${(100 * t).toFixed(0)}% ~ ${(100 * w).toFixed(0)}%`);
    assert.ok(x >= 0.3, `fase ${id}: X pouco visível (${(100 * x).toFixed(0)}%)`); assert.ok(t >= 0.5, `fase ${id}: T pouco visível (${(100 * t).toFixed(0)}%)`); assert.ok(w >= 0.45, `fase ${id}: ~ pouco visível (${(100 * w).toFixed(0)}%)`);
  }
  console.log(`     (pixels que o objeto muda: ${rows.join("; ")})`);
});
test("a poça é azulada no centro (azul > vermelho) e se distingue (>= 25 de distância) do chão de qualquer das 10 fases", () => {
  for (const id of IDS) {
    const w = waterBody(id); assert.ok(w[2] > w[0] + 10, `a poça da fase ${id} não é azulada: ${w.map(Math.round)}`);
    for (const o of IDS) { const d = dist(w, floorAvg(o).aberto); assert.ok(d >= 25, `a poça da fase ${id} se parece com o chão da fase ${o} (${d.toFixed(0)})`); }
  }
});
test("o trilho aparece sobre o chão e o aviso amarelo do jogo aparece sobre o trilho", () => {
  const rows = [];
  for (const id of IDS) {
    const th = theme(id), f = floorAvg(id).aberto, r0 = hexRgb(th.rail[0]), r1 = hexRgb(th.rail[1]);
    assert.ok(dist(r0, f) >= 40, `fase ${id}: o trilho (${th.rail[0]}) quase não se distingue do chão (${dist(r0, f).toFixed(0)})`);
    assert.ok(dist(r1, r0) >= 30, `fase ${id}: o miolo escuro do trilho quase não se distingue da borda (${dist(r1, r0).toFixed(0)})`);
    assert.ok(!isWarnYellow(r0) && !isWarnYellow(r1), `fase ${id}: o trilho já parece amarelo sem aviso`);
    let amin = null; for (let a = 0.05; a <= 1.0001; a += 0.01) if (isWarnYellow(blend(r0, a))) { amin = a; break; }
    assert.ok(amin !== null && amin <= 0.6, `fase ${id}: o aviso só aparece como amarelo com opacidade ${amin}`);
    rows.push(`${id}: ${amin.toFixed(2)}`);
  }
  console.log(`     (opacidade mínima do aviso para ser lido como amarelo: ${rows.join(", ")})`);
});
test("a parede móvel e a porta se destacam da parede e do chão do tema (>= 45) e entre si, e não são amarelas", () => {
  const rows = [];
  for (const id of IDS) {
    const th = theme(id), w = wallAvg(id), f = floorAvg(id).aberto, mw = hexRgb(th.mover.wall[0]), md = hexRgb(th.mover.door[0]);
    const m = Math.min(dist(mw, w), dist(md, w), dist(mw, f), dist(md, f), dist(mw, md)); rows.push(`${id}: ${m.toFixed(0)}`);
    assert.ok(dist(mw, w) >= 45 && dist(md, w) >= 45, `fase ${id}: peça móvel parecida com a parede`);
    assert.ok(dist(mw, f) >= 45 && dist(md, f) >= 45, `fase ${id}: peça móvel parecida com o chão`);
    assert.ok(dist(mw, md) >= 45, `fase ${id}: a porta é parecida com a parede móvel`);
    assert.ok(dist(mw, YELLOW) >= 60 && dist(md, YELLOW) >= 60, `fase ${id}: peça móvel amarela demais`);
  }
  console.log(`     (menor distância entre peça móvel, parede e chão: ${rows.join(", ")})`);
});
test("a parede tem cor própria: nenhuma parede se confunde com o chão do mesmo tema (>= 40 de distância)", () => {
  const rows = [];
  for (const id of IDS) { const d = dist(wallAvg(id), floorAvg(id).aberto); rows.push(`${id}: ${d.toFixed(0)}`); assert.ok(d >= 40, `fase ${id}: parede ${wallAvg(id).map(Math.round)} x chão ${floorAvg(id).aberto.map(Math.round)}`); }
  console.log(`     (distância parede x chão: ${rows.join(", ")})`);
});
test("Telhados e muros: a borda do mapa é céu escuro; Parque e lago: o lago é azul e a borda é arbusto verde", () => {
  const sky = paint(5, "wall", { c: 0, r: 4, border: true, kind: (c, r) => (c <= 0 ? "#" : "."), raster: true }).raster.average();
  assert.ok(sky[0] < 90 && sky[1] < 90 && sky[2] < 120 && sky[2] > sky[0], `céu: ${sky.map(Math.round)}`);
  const hedge = paint(9, "wall", { c: 0, r: 4, border: true, kind: open, raster: true }).raster.average();
  assert.ok(hedge[1] > hedge[0] && hedge[1] > hedge[2], `arbusto da borda: ${hedge.map(Math.round)}`);
  let lakes = 0, hedges = 0;
  for (let c = 0; c < 40; c++) for (let r = 0; r < 20; r++) {
    const a = paint(9, "wall", { c: 10 + c, r: 10 + r, kind: () => "#", raster: true }).raster.average();
    if (a[2] > a[1] + 25 && a[2] > a[0] + 60) lakes++; else if (a[1] > a[2] && a[1] > a[0]) hedges++;
  }
  console.log(`     (em 800 tiles de parede sólida do parque: ${lakes} de lago e ${hedges} de arbusto)`);
  assert.ok(lakes > 100 && hedges > 100, "o parque precisa ter lago e arbusto");
});
test("os ambientes só tocam no que o contrato permite: leituras de g.free, g.night ou ctx.save são recusadas pelo contexto falso", () => {
  assert.throws(() => drawTile({ floor(g) { g.ctx.save(); } }, "floor", { c: 1, r: 1 }), /não permitida/);
  assert.throws(() => drawTile({ floor(g) { void g.free; } }, "floor", { c: 1, r: 1 }), /não permitida/);
  assert.throws(() => drawTile({ floor(g) { g.rect(0, 0, 1, 1); } }, "floor", { c: 1, r: 1 }), /sem definir a cor/);
  assert.throws(() => pure(() => drawTile({ floor(g) { g.ctx.fillStyle = "#ff0000"; Math.random(); } }, "floor", { c: 1, r: 1 })), /Math\.random/);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
process.exit(failed ? 1 : 0);
