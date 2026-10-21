// Testes unitários dos ambientes das fases (js/themes.js), sem navegador. Uso: node tests/themes.test.js
// O `g` e o contexto 2D são FALSOS e rigorosos: o desenho só pode usar g.ctx, g.rect, g.x/g.y/g.c/g.r, g.h, g.solid, g.free e g.border (qualquer outra
// leitura ou escrita lança erro), só pode chamar os métodos simples do canvas listados abaixo, tem de definir a cor antes de pintar (não herda o estado
// do tile anterior) e não pode usar Math.random, Date.now nem mexer em variáveis globais. Um rasterizador mínimo (retângulos, círculos, setores e linhas)
// mede as cores médias do chão e das paredes e o quanto cada desenho cobre do tile.
const assert = require("assert");
const path = require("path");
const Themes = require(path.join(__dirname, "../js/themes.js"));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}

const T = 32;
const ALL_IDS = Array.from({ length: 20 }, (_, i) => i + 1);
const NEW_IDS = ALL_IDS.filter((id) => id >= 11);
const PLACES = ["Quintal", "Campo", "Casa", "Rua do bairro", "Condomínio", "Praça", "Parque canino", "Feira", "Praia", "Central da carrocinha",
  "Beco dos gatos", "Pet shop", "Fazenda", "Bosque", "Lago e docas", "Mercadão", "Estacionamento", "Telhados", "Estação de trem", "Fortaleza da carrocinha"];
const KINDS = ["floor", "wall", "crate"];

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
// só deixa passar o que o desenho dos ambientes pode usar
const strict = (target, allowed, what) => new Proxy(target, {
  get(t, p) { if (typeof p === "symbol") return undefined; if (!allowed.has(p)) throw new Error(`${what}: leitura de "${String(p)}" não permitida`); const v = Reflect.get(t, p, t); return typeof v === "function" ? v.bind(t) : v; },
  set(t, p, v) { if (!allowed.has(p)) throw new Error(`${what}: escrita em "${String(p)}" não permitida`); return Reflect.set(t, p, v, t); },
});
const G_ALLOWED = new Set(["ctx", "rect", "x", "y", "c", "r", "h", "solid", "free", "border"]);

// o `solid` do mapa de teste é uma função pura da posição (como no jogo): `mode` escolhe o desenho do terreno
function solidFn(mode) {
  if (mode === "none") return () => false;
  if (mode === "all") return () => true;
  return (c, r) => Themes.hash(c * 3 + 1, r * 5 + 2, 99) < 0.5; // sorteado
}
function drawTile(th, kind, { c, r, free = true, border = false, mode = "random", solid, raster = false }) {
  const rs = raster ? new Raster() : null, ctx = new FakeCtx(rs); ctx.ox = c * T; ctx.oy = r * T;
  const sp = strict(ctx, CTX_ALLOWED, "ctx");
  const g = strict({ ctx: sp, rect: (x, y, w, h) => sp.fillRect(x, y, w, h), x: c * T, y: r * T, c, r, free, border, solid: solid || solidFn(mode), h: (k) => Themes.hash(c, r, k) }, G_ALLOWED, "g");
  th[kind](g);
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

// ---------- 400 tiles variados (colunas, linhas, livre ou não, borda ou não, terreno sorteado) ----------
const SAMPLES = [];
for (let i = 0; i < 400; i++) SAMPLES.push({ c: (i * 7 + 3) % 61, r: (i * 13 + 5) % 43, free: i % 3 !== 0, border: i % 5 === 0, mode: ["random", "none", "all", "random"][i % 4] });

// ---------- cores médias ----------
function avgOf(th, kind, tiles) {
  let R = 0, G = 0, B = 0, n = 0;
  for (const t of tiles) {
    const ctx = pure(() => drawTile(th, kind, { ...t, raster: true })), a = ctx.raster.average();
    if (a) { R += a[0]; G += a[1]; B += a[2]; n++; }
  }
  return [R / n, G / n, B / n];
}
// três situações do chão como no teste do jogo (maior área livre de 5 x 5 ou 3 x 3 tiles, junto de paredes)
const FLOOR_SCENARIOS = {
  aberto: () => { const t = []; for (let r = 3; r < 15; r++) for (let c = 3; c < 15; c++) t.push({ c, r, free: true, solid: () => false }); return t; },
  canto5x5: () => { const t = []; for (let dr = 0; dr < 5; dr++) for (let dc = 0; dc < 5; dc++) t.push({ c: 10 + dc, r: 10 + dr, free: true, solid: (c, r) => r < 10 || c < 10 }); return t; },
  fechado3x3: () => { const t = []; for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) t.push({ c: 10 + dc, r: 10 + dr, free: true, solid: (c, r) => r < 10 || c < 10 || r > 12 || c > 12 }); return t; },
};
// uma faixa de parede de 3 tiles de espessura (como nos mapas)
function wallTiles() { const t = []; for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 8; dc++) t.push({ c: 10 + dc, r: 10 + dr, free: false, solid: (c, r) => c >= 10 && c < 18 && r >= 10 && r < 13 }); return t; }
const cache = {};
const floorAvg = (id) => (cache["f" + id] = cache["f" + id] || Object.fromEntries(Object.entries(FLOOR_SCENARIOS).map(([k, f]) => [k, avgOf(Themes.of(id), "floor", f())])));
const wallAvg = (id) => (cache["w" + id] = cache["w" + id] || avgOf(Themes.of(id), "wall", wallTiles()));
// o aviso do trilho (amarelo translúcido do jogo) sobre uma cor, e o teste de cor do aviso usado no e2e (vermelho > 60 e verde > 2,4 x azul)
const YELLOW = [242, 194, 48];
const blend = (base, a) => base.map((v, i) => v * (1 - a) + YELLOW[i] * a);
const isWarnYellow = (c) => c[0] > 60 && c[1] > c[2] * 2.4;

// =============================== testes ===============================
test("Themes.ids lista as fases 1 a 20 e Themes.of devolve o tema certo de cada uma", () => {
  assert.deepStrictEqual([...Themes.ids].sort((a, b) => a - b), ALL_IDS);
  for (const id of ALL_IDS) assert.strictEqual(Themes.of(id).id, id);
  assert.strictEqual(Themes.TILE, 32);
});
test("fases sem ambiente próprio (0, 21, ids estranhos) usam o da Rua do bairro", () => {
  for (const id of [0, 21, 99, -1, undefined, null, "x"]) assert.strictEqual(Themes.of(id), Themes.of(4), `id ${id}`);
});
test("o hash é estável, fica entre 0 e 1 e muda com a posição e com k", () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) { const h = Themes.hash(i, i * 3 % 17, 5); assert.ok(h >= 0 && h < 1); assert.strictEqual(h, Themes.hash(i, i * 3 % 17, 5)); seen.add(h); }
  assert.ok(seen.size > 150);
  assert.notStrictEqual(Themes.hash(3, 4, 1), Themes.hash(3, 4, 2));
});
test("cada tema tem id, lugar, frase, cores das peças móveis e do trilho", () => {
  for (const id of ALL_IDS) {
    const th = Themes.of(id);
    assert.ok(typeof th.place === "string" && th.place.trim().length > 0, `lugar da fase ${id}`);
    assert.ok(typeof th.blurb === "string" && th.blurb.trim().length >= 10 && th.blurb.length <= 120, `frase da fase ${id}`);
    for (const part of ["wall", "door"]) { assert.ok(Array.isArray(th.mover[part]) && th.mover[part].length === 3 && th.mover[part].every((c) => HEX.test(c)), `mover.${part} da fase ${id}`); }
    assert.ok(Array.isArray(th.rail) && th.rail.length === 2 && th.rail.every((c) => HEX.test(c)), `rail da fase ${id}`);
    for (const k of KINDS) assert.strictEqual(typeof th[k], "function", `${k} da fase ${id}`);
  }
});
test("os 20 lugares são distintos, com os nomes combinados, e as frases também são distintas", () => {
  assert.deepStrictEqual(ALL_IDS.map((id) => Themes.of(id).place), PLACES);
  assert.strictEqual(new Set(PLACES).size, 20);
  assert.strictEqual(new Set(ALL_IDS.map((id) => Themes.of(id).blurb)).size, 20);
});
test("as cores das peças móveis e do trilho dos temas novos não repetem as dos outros temas", () => {
  const keyOf = (th) => JSON.stringify([th.mover.wall, th.mover.door, th.rail]);
  assert.strictEqual(new Set(NEW_IDS.map((id) => keyOf(Themes.of(id)))).size, 10);
  for (const id of NEW_IDS) for (const old of ALL_IDS.filter((o) => o < 11)) assert.notStrictEqual(Themes.of(id).mover.wall[0], Themes.of(old).mover.wall[0], `fase ${id} repete a parede móvel da ${old}`);
});

test("chão, parede e caixa rodam em 400 tiles variados sem erro, só com g.ctx/g.rect (sem ler ou escrever nada além do permitido)", () => {
  for (const id of ALL_IDS) for (const k of KINDS) for (const s of SAMPLES) pure(() => drawTile(Themes.of(id), k, s));
});
test("cada desenho define a cor antes de pintar e só usa cores válidas (hex ou rgba)", () => {
  // (o contexto falso lança erro em fillRect/fill/stroke sem cor e em cor inválida: aqui se confere também que sempre pinta alguma coisa)
  for (const id of ALL_IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 40)) assert.ok(pure(() => drawTile(Themes.of(id), k, s)).ops.some((o) => /^(R|SR|F|S)\b/.test(o)), `${id} ${k} não pintou nada`);
});
test("o desenho é determinístico: as mesmas chamadas na segunda vez (nada pisca nem sorteia)", () => {
  for (const id of ALL_IDS) for (const k of KINDS) for (const s of SAMPLES.slice(0, 120)) {
    const a = pure(() => drawTile(Themes.of(id), k, s)).ops.join("|"), b = pure(() => drawTile(Themes.of(id), k, s)).ops.join("|");
    assert.strictEqual(a, b, `${id} ${k} (${s.c},${s.r})`);
  }
});
test("nada sai do tile: retângulos, círculos e linhas ficam dentro de [-2, 34] (temas novos: [0, 32] exato; os 10 antigos podem passar até 3 px, como as folhinhas de grama do Campo)", () => {
  const worst = {};
  for (const id of ALL_IDS) for (const k of KINDS) for (const s of SAMPLES) for (const [x0, y0, x1, y1] of pure(() => drawTile(Themes.of(id), k, s)).boxes) {
    const out = Math.max(-x0, -y0, x1 - T, y1 - T); worst[id] = Math.max(worst[id] || 0, out);
    const tol = id >= 11 ? 0 : 3;
    assert.ok(out <= tol, `${id} ${k}: caixa [${x0}, ${y0}, ${x1}, ${y1}] sai ${out.toFixed(1)} px do tile`);
  }
  console.log(`     (maior saída: temas novos ${Math.max(...NEW_IDS.map((id) => worst[id])).toFixed(1)} px; temas antigos ${Math.max(...ALL_IDS.filter((id) => id < 11).map((id) => worst[id])).toFixed(1)} px)`);
});
test("o desenho é barato: no máximo 60 operações de pintura por tile (chão, parede ou caixa)", () => {
  let max = { n: 0 };
  for (const id of ALL_IDS) for (const k of KINDS) for (const s of SAMPLES) {
    const n = pure(() => drawTile(Themes.of(id), k, s)).ops.filter((o) => /^(R|SR|F|S)\b/.test(o)).length;
    if (n > max.n) max = { n, id, k };
    assert.ok(n <= 60, `${id} ${k}: ${n} operações`);
  }
  console.log(`     (o mais pesado: tema ${max.id} ${max.k} com ${max.n} operações)`);
});

test("o chão cobre o tile inteiro e a parede também (sem frestas por onde apareça o fundo)", () => {
  for (const id of ALL_IDS) {
    for (const s of SAMPLES.slice(0, 60)) {
      const f = pure(() => drawTile(Themes.of(id), "floor", { ...s, raster: true })).raster.covered(0.99);
      assert.ok(f >= T * T, `chão ${id} (${s.c},${s.r}): só ${f} de ${T * T} pixels`);
      const w = pure(() => drawTile(Themes.of(id), "wall", { ...s, raster: true })).raster.covered(0.99); assert.ok(w >= T * T, `parede ${id} (${s.c},${s.r}): só ${w} de ${T * T} pixels`);
    }
  }
});
test("a caixa é um objeto baixo sobre o chão: cobre entre 15% e 80% do tile e deixa o chão aparecer", () => {
  for (const id of ALL_IDS) for (const s of SAMPLES.slice(0, 60)) {
    const n = pure(() => drawTile(Themes.of(id), "crate", { ...s, raster: true })).raster.covered(0.5);
    assert.ok(n >= T * T * 0.15 && n <= T * T * 0.8, `caixa ${id} (${s.c},${s.r}): cobre ${(100 * n / (T * T)).toFixed(0)}% do tile`);
  }
});
test("cada tema novo tem pelo menos duas caixas diferentes (variedade por tile) e a caixa não é igual à de nenhum outro tema", () => {
  const sig = (id, s) => pure(() => drawTile(Themes.of(id), "crate", { ...s, raster: false })).ops.join("|");
  const all = new Map();
  for (const id of ALL_IDS) {
    const set = new Set(); for (let i = 0; i < 60; i++) set.add(sig(id, { c: i * 3 + 1, r: i * 5 + 2, free: false }));
    if (id >= 11) assert.ok(set.size >= 2, `tema ${id} só tem ${set.size} desenho de caixa`);
    for (const x of set) { assert.ok(!all.has(x) || all.get(x) === id, `a caixa do tema ${id} é idêntica à do ${all.get(x)}`); all.set(x, id); }
  }
});

test("a cor média do chão de cada fase é diferente das outras (>= 18 de distância RGB, em qualquer das 3 situações), sem amarelo vivo", () => {
  let min = { d: 1e9 }, minInterior = { d: 1e9 };
  for (let i = 0; i < ALL_IDS.length; i++) for (let j = i + 1; j < ALL_IDS.length; j++) {
    for (const a of Object.values(floorAvg(ALL_IDS[i]))) for (const b of Object.values(floorAvg(ALL_IDS[j]))) { const d = dist(a, b); if (d < min.d) min = { d, i: ALL_IDS[i], j: ALL_IDS[j] }; }
    const di = dist(floorAvg(ALL_IDS[i]).aberto, floorAvg(ALL_IDS[j]).aberto); if (di < minInterior.d) minInterior = { d: di, i: ALL_IDS[i], j: ALL_IDS[j] };
  }
  console.log(`     (menor distância: ${min.d.toFixed(1)} entre ${PLACES[min.i - 1]} e ${PLACES[min.j - 1]}; só no chão aberto: ${minInterior.d.toFixed(1)} entre ${PLACES[minInterior.i - 1]} e ${PLACES[minInterior.j - 1]})`);
  assert.ok(min.d >= 18, `${PLACES[min.i - 1]} x ${PLACES[min.j - 1]}: ${min.d.toFixed(1)}`);
  for (const id of ALL_IDS) for (const [k, a] of Object.entries(floorAvg(id))) assert.ok(!isWarnYellow(a.map(Math.round)), `chão ${id} (${k}) parece amarelo vivo: ${a.map(Math.round)}`);
});
test("os temas novos têm chão com pelo menos 24 de distância dos outros 19 (folga para a medida do jogo, que usa a tela)", () => {
  const bad = [];
  for (const id of NEW_IDS) for (const o of ALL_IDS) {
    if (o === id) continue;
    let d = 1e9; for (const a of Object.values(floorAvg(id))) for (const b of Object.values(floorAvg(o))) d = Math.min(d, dist(a, b));
    if (d < 24) bad.push(`${PLACES[id - 1]} x ${PLACES[o - 1]}: ${d.toFixed(1)}`);
  }
  assert.deepStrictEqual(bad, []);
});
test("o trilho aparece sobre o chão e o aviso amarelo do jogo aparece sobre o trilho (temas novos)", () => {
  const rows = [];
  for (const id of NEW_IDS) {
    const th = Themes.of(id), f = floorAvg(id).aberto, r0 = hexRgb(th.rail[0]), r1 = hexRgb(th.rail[1]);
    assert.ok(dist(r0, f) >= 40, `fase ${id}: o trilho (${th.rail[0]}) quase não se distingue do chão (${dist(r0, f).toFixed(0)})`);
    assert.ok(dist(r1, r0) >= 30, `fase ${id}: o miolo escuro do trilho quase não se distingue da borda (${dist(r1, r0).toFixed(0)})`);
    assert.ok(!isWarnYellow(r0) && !isWarnYellow(r1), `fase ${id}: o trilho já parece amarelo sem aviso`);
    let amin = null; for (let a = 0.05; a <= 1.0001; a += 0.01) if (isWarnYellow(blend(r0, a))) { amin = a; break; }
    assert.ok(amin !== null && amin <= 0.6, `fase ${id}: o aviso só aparece como amarelo com opacidade ${amin} (o jogo usa de 0,35 a 0,85; calmo 0,8)`);
    rows.push(`${id}: ${amin.toFixed(2)}`);
  }
  console.log(`     (opacidade mínima do aviso para ser lido como amarelo: ${rows.join(", ")})`);
});
test("a parede móvel e a porta se destacam das paredes e do chão do próprio tema (e não são amarelas, como o aviso do jogo)", () => {
  const rows = [];
  for (const id of NEW_IDS) {
    const th = Themes.of(id), w = wallAvg(id), f = floorAvg(id).aberto, mw = hexRgb(th.mover.wall[0]), md = hexRgb(th.mover.door[0]);
    const m = Math.min(dist(mw, w), dist(md, w), dist(mw, f), dist(md, f), dist(mw, md));
    assert.ok(dist(mw, w) >= 45, `fase ${id}: a parede móvel é parecida com a parede (${dist(mw, w).toFixed(0)})`);
    assert.ok(dist(md, w) >= 45, `fase ${id}: a porta é parecida com a parede (${dist(md, w).toFixed(0)})`);
    assert.ok(dist(mw, f) >= 45 && dist(md, f) >= 45, `fase ${id}: peça móvel parecida com o chão`);
    assert.ok(dist(mw, md) >= 45, `fase ${id}: a porta é parecida com a parede móvel (${dist(mw, md).toFixed(0)})`);
    assert.ok(dist(mw, [242, 194, 48]) >= 60 && dist(md, [242, 194, 48]) >= 60, `fase ${id}: peça móvel amarela demais`);
    rows.push(`${id}: ${m.toFixed(0)}`);
  }
  console.log(`     (menor distância entre peça móvel, parede e chão: ${rows.join(", ")})`);
});
test("a parede tem cor própria: nenhuma parede dos temas novos se confunde com o chão do mesmo tema (>= 40 de distância)", () => {
  const rows = [];
  for (const id of NEW_IDS) { const d = dist(wallAvg(id), floorAvg(id).aberto); rows.push(`${id}: ${d.toFixed(0)}`); assert.ok(d >= 40, `fase ${id}: parede ${wallAvg(id).map(Math.round)} x chão ${floorAvg(id).aberto.map(Math.round)}`); }
  console.log(`     (distância parede x chão: ${rows.join(", ")})`);
});
test("a Praia continua tendo mar (azul) no anel de fora e o Quintal e o Campo continuam verdes (o teste do jogo confere isso na tela)", () => {
  const sea = pure(() => drawTile(Themes.of(9), "wall", { c: 0, r: 0, border: true, free: false, solid: () => true, raster: true })).raster.average();
  assert.ok(sea[2] > sea[0] + 60, `mar: ${sea.map(Math.round)}`);
  for (const id of [1, 2]) { const a = floorAvg(id).aberto; assert.ok(a[1] > a[0] && a[1] > a[2]); }
  assert.ok(floorAvg(9).aberto[0] > 190);
});
test("os ambientes só tocam em g.ctx e g.rect: g.ctx.save/restore/fillText/clip e outros métodos são recusados pelo contexto falso", () => {
  const th = { floor(g) { g.ctx.save(); }, wall() {}, crate() {} };
  assert.throws(() => drawTile(th, "floor", { c: 1, r: 1 }), /não permitida/);
  const th2 = { floor(g) { g.night = 1; }, wall() {}, crate() {} };
  assert.throws(() => drawTile(th2, "floor", { c: 1, r: 1 }), /não permitida/);
  const th3 = { floor(g) { g.rect(0, 0, 1, 1); }, wall() {}, crate() {} };
  assert.throws(() => drawTile(th3, "floor", { c: 1, r: 1 }), /sem definir a cor/);
  const th4 = { floor(g) { g.ctx.fillStyle = "#ff0000"; Math.random(); }, wall() {}, crate() {} };
  assert.throws(() => pure(() => drawTile(th4, "floor", { c: 1, r: 1 })), /Math\.random/);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
process.exit(failed ? 1 : 0);
