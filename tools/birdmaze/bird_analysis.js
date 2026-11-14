"use strict";
// Análise dos mapas do Passarinho em JavaScript (BFS nos grafos dos gatos, do gavião e do passarinho em voo baixo e em voo alto, caminhos separados por fluxo máximo,
// grupos de G e de vento, economia dos atalhos pelos muros M, tiles onde o motor sorteia itens, semelhança entre mapas).
// É escrita de novo, sem olhar o gerador (tools/birdmaze/bird_core.py), para o teste (tests/bird-levels.test.js) e o simulador (tools/birdmaze/bird_sim.js) serem uma
// segunda opinião sobre os mesmos mapas.
// Legenda: # parede | M muro fino voável | . chão | P início | V posto de gato de quintal | H posto de gavião | E saída | X obstáculo baixo | G galho | > < ^ v vento.
const WIND = "><^v";
const VEC = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], v: [0, 1] };
const CATW = new Set((".PVHE" + WIND).split(""));     // por onde os gatos de quintal andam (chão)
const HAWKW = new Set([...CATW, "X"]);                // o gavião também passa por cima de X
const LOWW = new Set([...CATW, "X", "G"]);            // o passarinho em voo baixo (X e G ele pisa; M e # não)
const HIGHW = new Set([...LOWW, "M"]);                // voo alto: por cima dos muros finos M (nunca #)
const LEGEND = new Set(("#M.PVHEXG" + WIND).split(""));
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const D8 = [...D4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

const size = (rows) => ({ W: rows[0].length, H: rows.length });
const at = (rows, x, y) => (y >= 0 && y < rows.length && x >= 0 && x < rows[0].length ? rows[y][x] : "#");
function tilesOf(rows, chars) {
  const out = [];
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[0].length; x++) if (chars.includes(rows[y][x])) out.push([x, y]);
  return out;
}
// distâncias em passos (Int32Array, -1 = não alcança) a partir de `starts`, andando só por `walk`
function bfs(rows, starts, walk) {
  const { W, H } = size(rows), dist = new Int32Array(W * H).fill(-1), q = [];
  for (const [x, y] of starts) { dist[y * W + x] = 0; q.push([x, y]); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i], d = dist[y * W + x];
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && dist[ny * W + nx] < 0 && walk.has(rows[ny][nx])) { dist[ny * W + nx] = d + 1; q.push([nx, ny]); }
    }
  }
  return dist;
}
// grupos (componentes) de um caractere; diag = vizinhança de 8
function groups(rows, ch, diag) {
  const { W, H } = size(rows), seen = new Set(), out = [], dirs = diag ? D8 : D4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (rows[y][x] !== ch || seen.has(y * W + x)) continue;
    const comp = [], q = [[x, y]];
    seen.add(y * W + x);
    for (let i = 0; i < q.length; i++) {
      const [a, b] = q[i];
      comp.push([a, b]);
      for (const [dx, dy] of dirs) {
        const nx = a + dx, ny = b + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && rows[ny][nx] === ch && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); q.push([nx, ny]); }
      }
    }
    out.push(comp);
  }
  return out;
}
// caminhos de `srcs` a `sinks` que não dividem nenhum tile do meio (fluxo máximo com capacidade 1 em cada tile); para em `cap`
function maxDisjoint(rows, srcs, sinks, walk, cap = 3) {
  const { W, H } = size(rows), N = W * H, SRC = 2 * N, SNK = 2 * N + 1;
  const to = [], capa = [], adj = Array.from({ length: 2 * N + 2 }, () => []);
  const edge = (u, v, c) => { adj[u].push(to.length); to.push(v); capa.push(c); adj[v].push(to.length); to.push(u); capa.push(0); };
  const ends = new Set([...srcs, ...sinks].map(([x, y]) => y * W + x));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!walk.has(rows[y][x])) continue;
    const i = y * W + x;
    edge(2 * i, 2 * i + 1, ends.has(i) ? cap : 1);
    for (const [dx, dy] of D4) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && walk.has(rows[ny][nx])) edge(2 * i + 1, 2 * (ny * W + nx), 1);
    }
  }
  for (const [x, y] of srcs) edge(SRC, 2 * (y * W + x), cap);
  for (const [x, y] of sinks) edge(2 * (y * W + x) + 1, SNK, 1);
  let flow = 0;
  while (flow < cap) {
    const prev = new Map([[SRC, -1]]), q = [SRC];
    for (let i = 0; i < q.length && !prev.has(SNK); i++) for (const e of adj[q[i]]) if (capa[e] > 0 && !prev.has(to[e])) { prev.set(to[e], e); q.push(to[e]); }
    if (!prev.has(SNK)) break;
    for (let v = SNK; v !== SRC;) { const e = prev.get(v); capa[e]--; capa[e ^ 1]++; v = to[e ^ 1]; }
    flow++;
  }
  return flow;
}
// A saída: 3 tiles E em linha, encostados num lado (junto do anel de #). Devolve { tiles, side, front } (front = os 2 tiles à frente de cada E) ou null.
function exitInfo(rows) {
  const { W, H } = size(rows), es = tilesOf(rows, "E");
  if (es.length !== 3) return null;
  const xs = [...new Set(es.map((t) => t[0]))].sort((a, b) => a - b), ys = [...new Set(es.map((t) => t[1]))].sort((a, b) => a - b);
  let side, d;
  if (xs.length === 1 && ys.length === 3 && ys[2] - ys[0] === 2) {
    if (xs[0] === W - 2) { side = "R"; d = [-1, 0]; } else if (xs[0] === 1) { side = "L"; d = [1, 0]; } else return null;
  } else if (ys.length === 1 && xs.length === 3 && xs[2] - xs[0] === 2) {
    if (ys[0] === H - 2) { side = "B"; d = [0, -1]; } else if (ys[0] === 1) { side = "T"; d = [0, 1]; } else return null;
  } else return null;
  const front = [];
  for (const [x, y] of es) for (const k of [1, 2]) front.push([x + d[0] * k, y + d[1] * k]);
  return { tiles: es, side, front };
}
// fração de tiles iguais na mesma posição, na janela comum (canto de cima à esquerda). Por padrão NÃO conta o anel de fora (igual em todos por regra).
function sameFraction(a, b, ring = false) {
  const h = Math.min(a.length, b.length), w = Math.min(a[0].length, b[0].length);
  const [y0, x0, y1, x1] = ring ? [0, 0, h, w] : [1, 1, h - 1, w - 1];
  let eq = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (a[y][x] === b[y][x]) eq++;
  return eq / ((y1 - y0) * (x1 - x0));
}
const sameSize = (a, b) => a.length === b.length && a[0].length === b[0].length;
// só o desenho das paredes (# e M contam igual)
const solidSignature = (rows) => rows.map((r) => r.replace(/[#M]/g, "#").replace(/[^#]/g, "."));

// ---- os atalhos pelos muros M
// origens da amostra determinística: um tile de chão a cada N, na ordem das linhas (k = 48 origens)
function sampleSources(rows, k = 48) {
  const fl = tilesOf(rows, [...CATW].join("")), step = Math.max(1, Math.ceil(fl.length / k));
  return fl.filter((_, i) => i % step === 0);
}
// economia do voo alto sobre o voo baixo: média (em tiles) sobre todos os pares (origem da amostra, tile de chão), fração dos pares com economia >= 4,
// e a economia do caminho de P até a saída
function shortcutSaving(rows) {
  const { W } = size(rows), fl = tilesOf(rows, [...CATW].join(""));
  let tot = 0, cnt = 0, big = 0;
  for (const s of sampleSources(rows)) {
    const dl = bfs(rows, [s], LOWW), dh = bfs(rows, [s], HIGHW);
    for (const [x, y] of fl) {
      const a = dl[y * W + x], b = dh[y * W + x];
      if (a < 0 || b < 0) continue;
      tot += a - b; cnt++;
      if (a - b >= 4) big++;
    }
  }
  const P = tilesOf(rows, "P")[0], es = tilesOf(rows, "E"), dl = bfs(rows, [P], LOWW), dh = bfs(rows, [P], HIGHW);
  const peLow = Math.min(...es.map(([x, y]) => dl[y * W + x])), peHigh = Math.min(...es.map(([x, y]) => dh[y * W + x]));
  return { avg: cnt ? tot / cnt : 0, frac4: cnt ? big / cnt : 0, peLow, peHigh, peSave: peLow - peHigh };
}
// travessias em linha reta de 1 ou 2 tiles de M entre dois tiles do voo baixo; "útil" = o voo baixo precisa de pelo menos 4 passos a mais para ir de um lado ao outro
function crossings(rows) {
  const { W, H } = size(rows);
  let total = 0;
  const useful = new Set(), cache = new Map();
  const dist = (a) => {
    const key = a[1] * W + a[0];
    if (!cache.has(key)) cache.set(key, bfs(rows, [a], LOWW));
    return cache.get(key);
  };
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (rows[y][x] !== "M") continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (at(rows, x - dx, y - dy) === "M") continue;
      let k = 1;
      while (at(rows, x + k * dx, y + k * dy) === "M" && k < 3) k++;
      if (k > 2) continue;
      const a = [x - dx, y - dy], b = [x + k * dx, y + k * dy];
      if (!LOWW.has(at(rows, a[0], a[1])) || !LOWW.has(at(rows, b[0], b[1]))) continue;
      total++;
      const d = dist(a)[b[1] * W + b[0]];
      if (d < 0 || d >= k + 1 + 4) for (let t = 0; t < k; t++) useful.add((y + t * dy) * W + x + t * dx);
    }
  }
  return { total, useful: useful.size };
}
// onde o motor sorteia itens (a mesma regra de placeItems em js/game.js): alcançáveis pelos gatos, a 4 ou mais passos do início, fora da saída e do vento, e a 4 ou mais tiles (reta) dos postos
function engineCandidates(rows) {
  const { W } = size(rows), P = tilesOf(rows, "P")[0], posts = tilesOf(rows, "VH"), d = bfs(rows, [P], CATW);
  return tilesOf(rows, [...CATW].join("")).filter(([x, y]) => !"E><^v".includes(rows[y][x]) && d[y * W + x] >= 4 && posts.every(([a, b]) => Math.hypot(x - a, y - b) >= 4));
}
// quantas paredes M ficam num bloco 3x3 de parede (sem contar o anel de fora): devia ser nenhuma
function thickM(rows) {
  const { W, H } = size(rows), wall = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && "#M".includes(rows[y][x]);
  const bad = new Set();
  for (let y = 1; y < H - 3; y++) for (let x = 1; x < W - 3; x++) {
    let full = true;
    for (let j = 0; j < 3 && full; j++) for (let i = 0; i < 3; i++) if (!wall(x + i, y + j)) { full = false; break; }
    if (full) for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (rows[y + j][x + i] === "M") bad.add((y + j) * W + x + i);
  }
  return bad.size;
}

// números de um mapa para o simulador e o teste
function analyze(rows) {
  const { W } = size(rows), P = tilesOf(rows, "P")[0], posts = tilesOf(rows, "VH"), es = tilesOf(rows, "E");
  const dc = bfs(rows, [P], CATW), dl = bfs(rows, [P], LOWW), dh = bfs(rows, [P], HIGHW), dw = bfs(rows, [P], HAWKW);
  const pick = (d, ts) => ts.map(([x, y]) => d[y * W + x]);
  const nM = tilesOf(rows, "M").length, nHash = tilesOf(rows, "#").length - 2 * (W + rows.length) + 4;
  return {
    P, posts, exits: es,
    peCat: Math.min(...pick(dc, es)), peLow: Math.min(...pick(dl, es)), peHigh: Math.min(...pick(dh, es)),
    postCat: pick(dc, posts), postHawk: pick(dw, posts),
    disjointCat: maxDisjoint(rows, [P], es, CATW), disjointLow: maxDisjoint(rows, [P], es, LOWW),
    catReach: dc, lowReach: dl, highReach: dh, hawkReach: dw,
    nM, nHash, share: nM / (nM + nHash || 1),
  };
}

module.exports = { WIND, VEC, CATW, HAWKW, LOWW, HIGHW, LEGEND, D4, D8, size, at, tilesOf, bfs, groups, maxDisjoint, exitInfo, sameFraction, sameSize, solidSignature, sampleSources, shortcutSaving, crossings, engineCandidates, thickM, analyze };
