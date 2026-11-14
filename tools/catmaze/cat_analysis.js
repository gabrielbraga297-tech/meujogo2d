"use strict";
// Análise dos mapas do Gatinho em JavaScript (BFS nos dois grafos, caminhos separados por fluxo máximo, grupos de T e ~, semelhança entre mapas).
// É escrita de novo, sem olhar o gerador (tools/catmaze/cat_core.py), para o teste (tests/cat-levels.test.js) e o simulador (tools/catmaze/cat_sim.js)
// serem uma segunda opinião sobre os mesmos mapas. Legenda: # parede . chão P início V cão de guarda R cão rastreador E saída X obstáculo baixo T lugar alto ~ poça.
const DOG = new Set(".~PVRE".split(""));        // por onde os cães andam
const CAT = new Set(".~PVRETX".split(""));      // por onde o gatinho anda (também X e T)
const LEGEND = new Set("#.PVREXT~".split(""));
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

// números de um mapa para o simulador e o teste
function analyze(rows) {
  const { W } = size(rows), P = tilesOf(rows, "P")[0], posts = tilesOf(rows, "VR"), es = tilesOf(rows, "E");
  const dd = bfs(rows, [P], DOG), dc = bfs(rows, [P], CAT);
  const pick = (d, ts) => ts.map(([x, y]) => d[y * W + x]);
  const dots = tilesOf(rows, ".").length, free = tilesOf(rows, ".~PVRE").length;
  return {
    P, posts, exits: es,
    peDog: Math.min(...pick(dd, es)), peCat: Math.min(...pick(dc, es)),
    postDog: pick(dd, posts), postCat: pick(dc, posts),
    disjoint: maxDisjoint(rows, [P], es, DOG),
    dots, free, dogReach: dd, catReach: dc,
  };
}

module.exports = { DOG, CAT, LEGEND, D4, D8, size, at, tilesOf, bfs, groups, maxDisjoint, exitInfo, sameFraction, sameSize, analyze };
