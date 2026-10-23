// Testes unitários dos ambientes das Fases 11 a 20 do Gatinho (js/cat-themes-2.js), sem navegador. Uso: node tests/cat-themes-2.test.js
// O `g` e o contexto 2D são FALSOS e rigorosos (como no tests/themes.test.js): o desenho só pode ler g.ctx, g.rect, g.x/g.y/g.c/g.r, g.h, g.solid, g.kind, g.time e g.border, só pode
// chamar os métodos simples do canvas listados abaixo, tem de definir a cor antes de pintar e não pode usar Math.random, Date.now nem criar variáveis globais.
// Um rasterizador mínimo (retângulos, círculos, polígonos, linhas e curvas) mede as cores médias, a cobertura de cada desenho e o contraste das peles do gato com o chão.
const assert = require("assert");
const path = require("path");
const CT = require(path.join(__dirname, "../js/cat-themes.js"));
require(path.join(__dirname, "../js/cat-themes-2.js"));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}

const T = 32;
const IDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const PLACES = ["Celeiro e curral", "Horta e galinheiro", "Borda da mata", "Riacho e pedras", "Vila de pescadores", "Docas do porto", "Praia e dunas", "Telhados à noite", "Mercado à noite", "A casa grande"];
const KINDS = ["floor", "wall", "crate", "high", "water"];
const SKINS = { preto: "#1b1b1b", branco: "#f5f5f5", laranja: "#e8923a", cinza: "#8b8f99" }; // as quatro peles de referência do gato

// ---------- contexto 2D falso com rasterizador ----------
function parseColor(s) {
  let m;
  if (typeof s === "string" && (m = /^#([0-9a-f]{6})$/i.exec(s))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
  if (typeof s === "string" && (m = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\s*\)$/.exec(s))) {
    assert.ok(+m[4] >= 0 && +m[4] <= 1 && +m[1] <= 255 && +m[2] <= 255 && +m[3] <= 255, "rgba fora da faixa: " + s);
    return [+m[1], +m[2], +m[3], +m[4]];
  }
  throw new Error("cor inválida: " + s);
}
const HEX = /^#[0-9a-f]{6}$/i;
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
  average() { let r = 0, g = 0, b = 0, n = 0; for (let i = 0; i < T * T; i++) if (this.cov[i] > 0) { r += this.rgb[i * 3]; g += this.rgb[i * 3 + 1]; b += this.rgb[i * 3 + 2]; n++; } return n ? [r / n, g / n, b / n] : null; }
  covered(min) { let n = 0; for (let i = 0; i < T * T; i++) if (this.cov[i] >= min) n++; return n; }
  pixel(i) { return [this.rgb[i * 3], this.rgb[i * 3 + 1], this.rgb[i * 3 + 2]]; }
}

const CTX_ALLOWED = new Set(["fillStyle", "strokeStyle", "lineWidth", "fillRect", "strokeRect", "beginPath", "moveTo", "lineTo", "quadraticCurveTo", "closePath", "arc", "fill", "stroke"]);
class FakeCtx {
  constructor(raster) { this.raster = raster; this.ops = []; this.boxes = []; this.sboxes = []; this.shadows = []; this._fill = undefined; this._stroke = undefined; this._lw = undefined; this.path = []; this.cur = null; this.ox = 0; this.oy = 0; this.stroking = false; }
  get fillStyle() { return this._fill; } set fillStyle(v) { parseColor(v); this._fill = v; this.ops.push("fs=" + v); }
  get strokeStyle() { return this._stroke; } set strokeStyle(v) { parseColor(v); this._stroke = v; this.ops.push("ss=" + v); }
  get lineWidth() { return this._lw; } set lineWidth(v) { if (!(typeof v === "number" && v > 0)) throw new Error("lineWidth inválido: " + v); this._lw = v; this.ops.push("lw=" + v); }
  box(x, y, w, h, what, list) {
    if (![x, y, w, h].every(Number.isFinite)) throw new Error("coordenada inválida em " + what);
    (list || this.boxes).push([x - this.ox, y - this.oy, x + w - this.ox, y + h - this.oy]);
  }
  fillRect(x, y, w, h) {
    if (this._fill === undefined) throw new Error("fillRect sem definir a cor antes (herdaria o estado do tile anterior)");
    this.ops.push(`R ${x} ${y} ${w} ${h}`); this.box(x, y, w, h, "fillRect");
    if (/^rgba\(0, ?0, ?0,/.test(this._fill)) this.box(x, y, w, h, "sombra", this.shadows);
    if (this.raster) this.raster.rect(x - this.ox, y - this.oy, w, h, parseColor(this._fill));
  }
  strokeRect() { throw new Error("strokeRect não é usado nos ambientes"); }
  beginPath() { this.ops.push("bp"); this.path = []; this.cur = null; this.pbox = []; }
  moveTo(x, y) { this.ops.push(`M ${x} ${y}`); this.cur = [[x, y]]; this.path.push(this.cur); this.box(x, y, 0, 0, "moveTo", this.pbox = this.pbox || []); }
  lineTo(x, y) { this.ops.push(`L ${x} ${y}`); if (!this.cur) { this.cur = [[x, y]]; this.path.push(this.cur); } else this.cur.push([x, y]); this.box(x, y, 0, 0, "lineTo", this.pbox = this.pbox || []); }
  quadraticCurveTo(cx, cy, x, y) {
    if (!this.cur) throw new Error("quadraticCurveTo sem moveTo");
    this.ops.push(`Q ${cx} ${cy} ${x} ${y}`); const [x0, y0] = this.cur[this.cur.length - 1];
    for (let i = 1; i <= 8; i++) { const t = i / 8; this.cur.push([(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y]); }
    this.box(cx, cy, 0, 0, "quadraticCurveTo", this.pbox = this.pbox || []); this.box(x, y, 0, 0, "quadraticCurveTo", this.pbox);
  }
  closePath() { this.ops.push("cp"); if (this.cur) this.cur.closed = true; }
  arc(cx, cy, r, a0, a1) {
    if (![cx, cy, r, a0, a1].every(Number.isFinite) || r < 0) throw new Error("arc inválido");
    this.ops.push(`A ${cx} ${cy} ${r} ${a0} ${a1}`); this.box(cx - r, cy - r, 2 * r, 2 * r, "arc", this.pbox = this.pbox || []);
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 12)));
    if (!this.cur) { this.cur = []; this.path.push(this.cur); }
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; this.cur.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    if (Math.abs(a1 - a0) >= Math.PI * 2 - 1e-9) this.cur.closed = true;
  }
  fill() {
    if (this._fill === undefined) throw new Error("fill sem definir a cor antes");
    this.ops.push("F"); this.flushPath(this.boxes);
    if (/^rgba\(0, ?0, ?0,/.test(this._fill)) for (const b of this.pbox || []) this.shadows.push(b);
    if (this.raster) this.raster.poly(this.path.map((p) => p.map(([x, y]) => [x - this.ox, y - this.oy])), parseColor(this._fill));
    this.pbox = null;
  }
  stroke() {
    if (this._stroke === undefined || this._lw === undefined) throw new Error("stroke sem estilo");
    this.ops.push("S"); const m = this._lw / 2;
    for (const b of this.pbox || []) this.sboxes.push([b[0] - m, b[1] - m, b[2] + m, b[3] + m]);
    if (this.raster) this.raster.strokePath(this.path.map((p) => p.map(([x, y]) => [x - this.ox, y - this.oy])), this._lw, parseColor(this._stroke));
    this.pbox = null;
  }
  flushPath(list) { for (const b of this.pbox || []) list.push(b); }
}
const strict = (target, allowed, what) => new Proxy(target, {
  get(t, p) { if (typeof p === "symbol") return undefined; if (!allowed.has(p)) throw new Error(`${what}: leitura de "${String(p)}" não permitida`); const v = Reflect.get(t, p, t); return typeof v === "function" ? v.bind(t) : v; },
  set(t, p, v) { if (!allowed.has(p)) throw new Error(`${what}: escrita em "${String(p)}" não permitida`); return Reflect.set(t, p, v, t); },
});
const G_ALLOWED = new Set(["ctx", "rect", "x", "y", "c", "r", "h", "solid", "kind", "time", "border"]);

// mapa de teste: `solid` e `kind` são funções puras da posição (como no jogo); `mode` escolhe o terreno
function terrain(mode) {
  const solid = mode === "none" ? () => false : mode === "all" ? () => true : (c, r) => CT.hash(c * 3 + 1, r * 5 + 2, 99) < 0.5;
  const kind = (c, r) => (solid(c, r) ? "#" : CT.hash(c * 7 + 2, r * 3 + 1, 98) < 0.15 ? "~" : ".");
  return { solid, kind };
}
// desenha UM tile; `time: undefined` deixa g.time ausente (o jogo pode não mandar)
function drawTile(th, kind, { c, r, border = false, mode = "random", solid, kindFn, raster = false, time }) {
  const rs = raster ? new Raster() : null, ctx = new FakeCtx(rs); ctx.ox = c * T; ctx.oy = r * T;
  const sp = strict(ctx, CTX_ALLOWED, "ctx"), tr = terrain(mode);
  const o = { ctx: sp, rect: (x, y, w, h) => sp.fillRect(x, y, w, h), x: c * T, y: r * T, c, r, border, solid: solid || tr.solid, kind: kindFn || tr.kind, h: (k) => CT.hash(c, r, k) };
  if (time !== undefined) o.time = time;
  th[kind](strict(o, G_ALLOWED, "g"));
  return ctx;
}
function pure(fn) { // sem aleatório, relógio nem variáveis globais novas
  const R = Math.random, N = Date.now, P = globalThis.performance && globalThis.performance.now;
  const keys = Object.keys(globalThis).join(",");
  Math.random = () => { throw new Error("Math.random no desenho"); }; Date.now = () => { throw new Error("Date.now no desenho"); };
  if (P) globalThis.performance.now = () => { throw new Error("performance.now no desenho"); };
  try { return fn(); } finally {
    Math.random = R; Date.now = N; if (P) globalThis.performance.now = P;
    assert.strictEqual(Object.keys(globalThis).join(","), keys, "o desenho criou variáveis globais");
  }
}
const th = (id) => CT.of(id);
const SAMPLES = [];
for (let i = 0; i < 300; i++) SAMPLES.push({ c: (i * 7 + 3) % 61, r: (i * 13 + 5) % 43, border: i % 5 === 0, mode: ["random", "none", "all", "random"][i % 4] });
const paints = (ctx) => ctx.ops.filter((o) => /^(R|F|S)\b/.test(o)).length;

// ---------- cores médias ----------
const cache = {};
function avgOf(id, kind, tiles) {
  let R = 0, G = 0, B = 0, n = 0;
  for (const t of tiles) { const a = pure(() => drawTile(th(id), kind, { ...t, raster: true })).raster.average(); if (a) { R += a[0]; G += a[1]; B += a[2]; n++; } }
  return [R / n, G / n, B / n];
}
const openTiles = () => { const t = []; for (let r = 3; r < 15; r++) for (let c = 3; c < 15; c++) t.push({ c, r, solid: () => false }); return t; };
const wallTiles = () => { const t = []; for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 8; dc++) t.push({ c: 10 + dc, r: 10 + dr, solid: (c, r) => c >= 10 && c < 18 && r >= 10 && r < 13 }); return t; };
const floorAvg = (id) => (cache["f" + id] = cache["f" + id] || avgOf(id, "floor", openTiles()));
const wallAvg = (id) => (cache["w" + id] = cache["w" + id] || avgOf(id, "wall", wallTiles()));
const waterAvg = (id) => (cache["a" + id] = cache["a" + id] || avgOf(id, "water", openTiles().slice(0, 40)));
const YELLOW = [242, 194, 48];
const blend = (base, a) => base.map((v, i) => v * (1 - a) + YELLOW[i] * a);
const isWarnYellow = (c) => c[0] > 60 && c[1] > c[2] * 2.4;

// =============================== testes ===============================
test("as 10 fases (11 a 20) estão registradas, cada uma com id certo, lugar, frase, 5 funções de desenho, cores das peças móveis e do trilho", () => {
  for (const id of IDS) assert.ok(CT.ids().includes(id), `fase ${id} não registrada`);
  for (const id of IDS) {
    const t = th(id);
    assert.strictEqual(t.id, id);
    assert.ok(typeof t.place === "string" && t.place.trim().length > 0, `lugar da fase ${id}`);
    assert.ok(typeof t.blurb === "string" && t.blurb.trim().length >= 10 && t.blurb.length <= 120, `frase da fase ${id}`);
    for (const k of KINDS) assert.strictEqual(typeof t[k], "function", `${k} da fase ${id}`);
    for (const part of ["wall", "door"]) assert.ok(Array.isArray(t.mover[part]) && t.mover[part].length === 3 && t.mover[part].every((c) => HEX.test(c)), `mover.${part} da fase ${id}`);
    assert.ok(Array.isArray(t.rail) && t.rail.length === 2 && t.rail.every((c) => HEX.test(c)), `rail da fase ${id}`);
  }
});
test("os 10 lugares são distintos, com os nomes combinados, e as frases também", () => {
  assert.deepStrictEqual(IDS.map((id) => th(id).place), PLACES);
  assert.strictEqual(new Set(IDS.map((id) => th(id).blurb)).size, 10);
});
test("night é true só nas Fases 18 e 19", () => {
  for (const id of IDS) assert.strictEqual(th(id).night, id === 18 || id === 19, `night da fase ${id}`);
});
test("as paletas são diferentes: cores das peças móveis e do trilho de cada fase não se repetem e o chão de cada fase tem cor média própria (>= 24 de distância RGB)", () => {
  assert.strictEqual(new Set(IDS.map((id) => JSON.stringify([th(id).mover.wall, th(id).mover.door, th(id).rail]))).size, 10);
  assert.strictEqual(new Set(IDS.map((id) => th(id).mover.wall[0])).size >= 8, true, "paredes móveis quase iguais");
  let min = { d: 1e9 };
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) { const d = dist(floorAvg(IDS[i]), floorAvg(IDS[j])); if (d < min.d) min = { d, i: IDS[i], j: IDS[j] }; }
  console.log(`     (menor distância entre chãos: ${min.d.toFixed(1)}, ${PLACES[min.i - 11]} x ${PLACES[min.j - 11]})`);
  assert.ok(min.d >= 24, `${PLACES[min.i - 11]} x ${PLACES[min.j - 11]}: ${min.d.toFixed(1)}`);
  let minW = { d: 1e9 };
  for (let i = 0; i < IDS.length; i++) for (let j = i + 1; j < IDS.length; j++) { const d = dist(wallAvg(IDS[i]), wallAvg(IDS[j])); if (d < minW.d) minW = { d, i: IDS[i], j: IDS[j] }; }
  console.log(`     (menor distância entre paredes: ${minW.d.toFixed(1)}, ${PLACES[minW.i - 11]} x ${PLACES[minW.j - 11]})`);
  assert.ok(minW.d >= 24, `paredes ${PLACES[minW.i - 11]} x ${PLACES[minW.j - 11]}: ${minW.d.toFixed(1)}`);
});
test("chão, parede, X, T e poça rodam em 300 tiles variados sem erro, só com o que o contrato permite (ctx, rect, x, y, c, r, h, solid, kind, time, border)", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) pure(() => drawTile(th(id), k, { ...s, time: 1.7 }));
});
test("sem g.time (ausente), com g.time = 0 e com g.time grande: nenhum erro; ausente e 0 desenham exatamente igual", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 80)) {
    const a = pure(() => drawTile(th(id), k, s)).ops.join("|"), b = pure(() => drawTile(th(id), k, { ...s, time: 0 })).ops.join("|");
    assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r}): g.time ausente ≠ 0`);
    pure(() => drawTile(th(id), k, { ...s, time: 98765.4321 }));
  }
});
test("o chão não depende de g.kind (só a poça olha os vizinhos para formar lagoas)", () => {
  for (const id of IDS) for (const s of SAMPLES.slice(0, 40)) {
    const a = pure(() => drawTile(th(id), "floor", { ...s, kindFn: () => "." })).ops.join("|"), b = pure(() => drawTile(th(id), "floor", { ...s, kindFn: () => "~" })).ops.join("|");
    assert.strictEqual(a, b, `o chão da fase ${id} muda com g.kind`);
  }
});
test("cada desenho define a cor antes de pintar e sempre pinta alguma coisa", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 40)) assert.ok(paints(pure(() => drawTile(th(id), k, s))) > 0, `${id} ${k} não pintou nada`);
});
test("o desenho é determinístico: as mesmas chamadas na segunda vez (nada pisca nem sorteia), no mesmo g.time", () => {
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 120)) {
    const a = pure(() => drawTile(th(id), k, { ...s, time: 3.3 })).ops.join("|"), b = pure(() => drawTile(th(id), k, { ...s, time: 3.3 })).ops.join("|");
    assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r})`);
  }
});
test("o desenho é barato: no máximo 40 operações de pintura por tile (chão, parede, X, T ou poça)", () => {
  let max = { n: 0 }; const byKind = {};
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
    const n = paints(pure(() => drawTile(th(id), k, { ...s, time: 1.1 })));
    if (n > max.n) max = { n, id, k };
    byKind[k] = Math.max(byKind[k] || 0, n);
    assert.ok(n <= 40, `${id} ${k}: ${n} operações`);
  }
  console.log(`     (o mais pesado: fase ${max.id} ${max.k} com ${max.n} operações; máximo por tipo: ${Object.entries(byKind).map(([k, v]) => k + " " + v).join(", ")})`);
});
test("nada sai do tile: retângulos, círculos e polígonos ficam dentro de [0, 32]; linhas (com a espessura) até 1 px de folga", () => {
  let worst = 0, worstS = 0;
  for (const id of IDS) for (const k of KINDS) for (const s of SAMPLES) {
    const ctx = pure(() => drawTile(th(id), k, { ...s, time: 2.2 }));
    for (const [x0, y0, x1, y1] of ctx.boxes) { const out = Math.max(-x0, -y0, x1 - T, y1 - T); worst = Math.max(worst, out); assert.ok(out <= 0.001, `${id} ${k}: caixa [${x0}, ${y0}, ${x1}, ${y1}] sai ${out.toFixed(2)} px do tile`); }
    for (const [x0, y0, x1, y1] of ctx.sboxes) { const out = Math.max(-x0, -y0, x1 - T, y1 - T); worstS = Math.max(worstS, out); assert.ok(out <= 1, `${id} ${k}: linha [${x0}, ${y0}, ${x1}, ${y1}] sai ${out.toFixed(2)} px do tile`); }
  }
  console.log(`     (maior saída: pintura ${worst.toFixed(2)} px; linhas ${worstS.toFixed(2)} px)`);
});
test("o chão, a parede e a poça cobrem o tile inteiro (sem frestas por onde apareça o fundo)", () => {
  for (const id of IDS) for (const k of ["floor", "wall", "water"]) for (const s of SAMPLES.slice(0, 60)) {
    const n = pure(() => drawTile(th(id), k, { ...s, raster: true, time: 1.4 })).raster.covered(0.99);
    assert.ok(n >= T * T, `${k} ${id} (${s.c},${s.r}): só ${n} de ${T * T} pixels`);
  }
});
test("X é um objeto baixo (cobre de 12% a 65% do tile, chão aparece em volta) e T é um objeto alto e maior (de 25% a 85%, em média mais que o X, com sombra comprida até a quina de baixo e da direita)", () => {
  const rows = [];
  for (const id of IDS) {
    let sx = 0, st = 0, nx = 0, nt = 0, minT = 1, maxX = 0;
    for (const s of SAMPLES.slice(0, 120)) {
      const cx = pure(() => drawTile(th(id), "crate", { ...s, raster: true })), ct = pure(() => drawTile(th(id), "high", { ...s, raster: true }));
      const fx = cx.raster.covered(0.5) / (T * T), ft = ct.raster.covered(0.5) / (T * T);
      assert.ok(fx >= 0.12 && fx <= 0.65, `X da fase ${id} (${s.c},${s.r}) cobre ${(100 * fx).toFixed(0)}%`);
      assert.ok(ft >= 0.25 && ft <= 0.85, `T da fase ${id} (${s.c},${s.r}) cobre ${(100 * ft).toFixed(0)}%`);
      sx += fx; st += ft; nx++; nt++; minT = Math.min(minT, ft); maxX = Math.max(maxX, fx);
      const reach = ct.shadows.reduce((m, b) => [Math.max(m[0], b[2]), Math.max(m[1], b[3])], [0, 0]);
      assert.ok(reach[0] >= 28 && reach[1] >= 28, `T da fase ${id} (${s.c},${s.r}): sombra só chega a (${reach[0].toFixed(0)}, ${reach[1].toFixed(0)})`);
    }
    assert.ok(st / nt > sx / nx + 0.03, `fase ${id}: T (${(100 * st / nt).toFixed(0)}%) não é maior que X (${(100 * sx / nx).toFixed(0)}%)`);
    rows.push(`${id}: X ${(100 * sx / nx).toFixed(0)}% T ${(100 * st / nt).toFixed(0)}%`);
  }
  console.log(`     (cobertura média: ${rows.join("; ")})`);
});
test("X e T de cada fase têm pelo menos 2 desenhos diferentes (variedade por tile)", () => {
  for (const id of IDS) for (const k of ["crate", "high"]) {
    const set = new Set(); for (let i = 0; i < 80; i++) set.add(pure(() => drawTile(th(id), k, { c: i * 3 + 1, r: i * 5 + 2, mode: "none", time: 0 })).ops.join("|"));
    assert.ok(set.size >= 2, `fase ${id} ${k}: só ${set.size} desenho`);
  }
});

test("contraste do gatinho: as 4 peles de referência (preto, branco, laranja, cinza) se destacam do chão de cada fase (distância da cor média >= 55 e poucos pixels do chão parecidos com a pele)", () => {
  const rows = []; let worst = { d: 1e9 };
  for (const id of IDS) {
    const f = floorAvg(id), tiles = openTiles().slice(0, 60);
    for (const [nome, hex] of Object.entries(SKINS)) {
      const sk = hexRgb(hex), d = dist(sk, f);
      let near = 0, tot = 0;
      for (const t of tiles) { const r = pure(() => drawTile(th(id), "floor", { ...t, raster: true })).raster; for (let i = 0; i < T * T; i++) { tot++; if (dist(sk, r.pixel(i)) < 30) near++; } }
      if (d < worst.d) worst = { d, id, nome };
      assert.ok(d >= 55, `fase ${id}: pele ${nome} só ${d.toFixed(0)} do chão`);
      assert.ok(near / tot <= 0.08, `fase ${id}: ${(100 * near / tot).toFixed(1)}% do chão parece a pele ${nome}`);
    }
    rows.push(id + ": " + Object.entries(SKINS).map(([n, hex]) => n[0] + dist(hexRgb(hex), f).toFixed(0)).join("/"));
  }
  console.log(`     (distância pele x chão, p=preto b=branco l=laranja c=cinza: ${rows.join("; ")}; pior: fase ${worst.id} ${worst.nome} ${worst.d.toFixed(0)})`);
});
test("a poça tem cor própria: >= 40 de distância do chão da própria fase", () => {
  const rows = [];
  for (const id of IDS) { const d = dist(waterAvg(id), floorAvg(id)); rows.push(`${id}: ${d.toFixed(0)}`); assert.ok(d >= 40, `fase ${id}: poça ${waterAvg(id).map(Math.round)} x chão ${floorAvg(id).map(Math.round)}`); }
  console.log(`     (distância poça x chão: ${rows.join(", ")})`);
});
test("a parede tem cor própria: >= 40 de distância do chão da própria fase", () => {
  const rows = [];
  for (const id of IDS) { const d = dist(wallAvg(id), floorAvg(id)); rows.push(`${id}: ${d.toFixed(0)}`); assert.ok(d >= 40, `fase ${id}: parede ${wallAvg(id).map(Math.round)} x chão ${floorAvg(id).map(Math.round)}`); }
  console.log(`     (distância parede x chão: ${rows.join(", ")})`);
});
test("as fases noturnas (18 e 19) são mais claras ou saturadas que o limite: chão com brilho médio >= 70 e janelas/lâmpadas acesas nas paredes", () => {
  for (const id of [18, 19]) {
    const f = floorAvg(id), lum = 0.299 * f[0] + 0.587 * f[1] + 0.114 * f[2];
    assert.ok(lum >= 70, `chão da fase ${id} muito escuro: ${lum.toFixed(0)}`);
    let bright = 0; for (const t of wallTiles()) { const r = pure(() => drawTile(th(id), "wall", { ...t, raster: true })).raster; for (let i = 0; i < T * T; i++) { const p = r.pixel(i); if (p[0] > 230 && p[1] > 190) bright++; } }
    assert.ok(bright > 60, `fase ${id}: poucas luzes acesas nas paredes (${bright} pixels)`);
  }
});
test("o trilho aparece sobre o chão e o aviso amarelo do jogo aparece sobre o trilho", () => {
  const rows = [];
  for (const id of IDS) {
    const t = th(id), f = floorAvg(id), r0 = hexRgb(t.rail[0]), r1 = hexRgb(t.rail[1]);
    assert.ok(dist(r0, f) >= 40, `fase ${id}: o trilho (${t.rail[0]}) quase não se distingue do chão (${dist(r0, f).toFixed(0)})`);
    assert.ok(dist(r1, r0) >= 30, `fase ${id}: o miolo escuro do trilho quase não se distingue da borda (${dist(r1, r0).toFixed(0)})`);
    assert.ok(!isWarnYellow(r0) && !isWarnYellow(r1), `fase ${id}: o trilho já parece amarelo sem aviso`);
    let amin = null; for (let a = 0.05; a <= 1.0001; a += 0.01) if (isWarnYellow(blend(r0, a))) { amin = a; break; }
    assert.ok(amin !== null && amin <= 0.6, `fase ${id}: o aviso só aparece como amarelo com opacidade ${amin}`);
    rows.push(`${id}: ${amin.toFixed(2)}`);
  }
  console.log(`     (opacidade mínima do aviso: ${rows.join(", ")})`);
});
test("a parede móvel e a porta se destacam das paredes e do chão da própria fase (>= 45) e entre si, e não são amarelas", () => {
  const rows = [];
  for (const id of IDS) {
    const t = th(id), w = wallAvg(id), f = floorAvg(id), mw = hexRgb(t.mover.wall[0]), md = hexRgb(t.mover.door[0]);
    const m = Math.min(dist(mw, w), dist(md, w), dist(mw, f), dist(md, f), dist(mw, md));
    assert.ok(dist(mw, w) >= 45, `fase ${id}: a parede móvel é parecida com a parede (${dist(mw, w).toFixed(0)})`);
    assert.ok(dist(md, w) >= 45, `fase ${id}: a porta é parecida com a parede (${dist(md, w).toFixed(0)})`);
    assert.ok(dist(mw, f) >= 45 && dist(md, f) >= 45, `fase ${id}: peça móvel parecida com o chão (${dist(mw, f).toFixed(0)} / ${dist(md, f).toFixed(0)})`);
    assert.ok(dist(mw, md) >= 45, `fase ${id}: a porta é parecida com a parede móvel (${dist(mw, md).toFixed(0)})`);
    assert.ok(dist(mw, YELLOW) >= 60 && dist(md, YELLOW) >= 60, `fase ${id}: peça móvel amarela demais`);
    rows.push(`${id}: ${m.toFixed(0)}`);
  }
  console.log(`     (menor distância entre peça móvel, parede e chão: ${rows.join(", ")})`);
});
test("o Praia tem mar (azul) no anel de fora e o Riacho tem água funda (azul) nas paredes de dentro", () => {
  const sea = pure(() => drawTile(th(17), "wall", { c: 0, r: 0, border: true, mode: "all", raster: true })).raster.average();
  assert.ok(sea[2] > sea[0] + 60, `mar: ${sea.map(Math.round)}`);
  let blue = 0; for (let i = 0; i < 60; i++) { const a = pure(() => drawTile(th(14), "wall", { c: 5 + i, r: 9 + (i % 7) * 2, mode: "all", raster: true })).raster.average(); if (a[2] > a[0] + 50) blue++; }
  assert.ok(blue >= 25, `só ${blue} de 60 paredes do Riacho parecem água`);
});
test("os ambientes só tocam no que o contrato permite: leitura/escrita fora disso, estado do canvas e cor não definida são recusados", () => {
  const bad = { floor(g) { g.ctx.save(); }, wall() {}, crate() {}, high() {}, water() {} };
  assert.throws(() => drawTile(bad, "floor", { c: 1, r: 1 }), /não permitida/);
  assert.throws(() => drawTile({ floor(g) { g.night = 1; } }, "floor", { c: 1, r: 1 }), /não permitida/);
  assert.throws(() => drawTile({ floor(g) { g.free; } }, "floor", { c: 1, r: 1 }), /não permitida/);
  assert.throws(() => drawTile({ floor(g) { g.rect(0, 0, 1, 1); } }, "floor", { c: 1, r: 1 }), /sem definir a cor/);
  assert.throws(() => pure(() => drawTile({ floor(g) { g.ctx.fillStyle = "#ff0000"; Math.random(); } }, "floor", { c: 1, r: 1 })), /Math.random/);
  assert.throws(() => drawTile({ floor(g) { g.ctx.fillStyle = "vermelho"; } }, "floor", { c: 1, r: 1 }), /cor inválida/);
});

console.log(failed ? `\n${failed} teste(s) falharam` : "\ntodos os testes passaram");
process.exit(failed ? 1 : 0);
