#!/usr/bin/env node
// ESPALHA OS PONTOS DE NASCIMENTO DOS INIMIGOS (0.25.0, "mapa livre"). Pedido do dono (13/11/2026): os bonecos "devem nascer em respectivas posições diferentes para não aglomerar numa mesma fase".
// Antes, da Fase 4 em diante todos os agentes (`V` no mapa) nasciam juntos na praça do centro (na Fase 20: 9 agentes num bloco de 3 × 3), colados nas vans.
//
// Como escolhe (determinístico: o mesmo mapa dá sempre a mesma resposta): para cada fase, os tiles candidatos são os alcançáveis a pé a partir do início do cachorrinho, COM FOLGA em volta
// (nenhuma parede, van ou trilho de bloco nos 8 vizinhos), a uma distância mínima do início do cachorrinho (para ninguém notar o cachorrinho já no primeiro instante) e da saída.
// Depois a escolha é uma amostragem UNIFORME: a maior distância mínima entre os pontos com que cabem todos os inimigos da fase (veja `choose`).
// Os gatos (se a fase tiver) ficam com pontos espaçados entre os escolhidos e os agentes com o resto. Os `V` do mapa e a lista `cats:` da fase são reescritos em js/game.js.
//
// Uso:  node tools/spawns/spread.js            mostra o que mudaria (não grava)
//       node tools/spawns/spread.js --write    grava em js/game.js
//       node tools/spawns/spread.js --check    sai com erro se js/game.js não está igual ao que a ferramenta escolheria (o teste tests/free-map.test.js também confere as REGRAS, não esta igualdade)
// Só mexe nas fases do Cachorrinho que têm agentes aglomerados (4 a 20); as Fases 1 a 3 já nascem espalhadas e com folga (conferido pelo teste).
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const rig = require(path.join(ROOT, "tests", "engine-rig.js"));

const FILE = path.join(ROOT, "js", "game.js");
const mode = process.argv.includes("--write") ? "write" : process.argv.includes("--check") ? "check" : "show";
const FIRST = 4, LAST = 20;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function steps(lv, from) { // passos a pé de `from` a cada tile (chão sem contar os blocos)
  const W = lv.cols, d = new Int32Array(W * lv.rows).fill(-1), q = [from];
  d[from[1] * W + from[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const [c, r] = q[i];
    for (const [dc, dr] of DIRS) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= lv.rows || !lv.walk[nr][nc] || d[nr * W + nc] >= 0) continue;
      d[nr * W + nc] = d[r * W + c] + 1; q.push([nc, nr]);
    }
  }
  return d;
}

// os tiles escolhidos para a fase: { vets: [[c, r], ...], cats: [[c, r], ...] }
function choose(lv, nVets, nCats) {
  const W = lv.cols, H = lv.rows, k = nVets + nCats;
  const track = new Set(lv.trackTiles.map(([c, r]) => r * W + c));
  const roomy = (c, r) => {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H || !lv.walk[nr][nc] || track.has(nr * W + nc)) return false;
    }
    return true;
  };
  const start = lv.spawnTile, exits = lv.exitTiles, fromStart = steps(lv, start);
  const minStart = Math.max(lv.alertTiles + 6, 12), minExit = 10; // (a saída tem 3 × 2 tiles: a distância é até o tile dela mais perto)
  const euclid = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const trackNear = (c, r) => lv.trackTiles.some(([tc, tr]) => Math.abs(tc - c) + Math.abs(tr - r) < 4); // a regra das peças móveis (testes): trilhos a 3 ou mais tiles (em passos retos) dos postos; aqui com 1 de folga
  let cands = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (fromStart[r * W + c] < 0 || !roomy(c, r) || euclid([c, r], start) < minStart || exits.some((e) => euclid([c, r], e) < minExit) || trackNear(c, r)) continue;
    cands.push([c, r]);
  }
  if (cands.length < k * 3) throw new Error(`Fase ${lv.id}: poucos tiles com folga (${cands.length}) para ${k} inimigos`);
  // amostragem uniforme (ruído azul): em ordem embaralhada por uma semente da fase, aceita cada candidato que fica a pelo menos D tiles (em linha reta) dos já aceitos; vale a MAIOR distância D (de 40 para baixo,
  // em passos de 0,5) com que cabem todos os pontos. Assim os inimigos ficam bem espaçados e espalhados por TODO o mapa (também no meio), e não só nos cantos e nas ruas da borda.
  let seed = 1234567 + lv.id * 7919;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = cands.map((t) => [rnd(), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  let chosen = null;
  for (let D = 40; D >= 3 && !chosen; D -= 0.5) {
    const acc = [];
    for (const t of order) if (acc.every((a) => euclid(a, t) >= D)) { acc.push(t); if (acc.length === k) break; }
    if (acc.length === k) chosen = acc;
  }
  if (!chosen) throw new Error(`Fase ${lv.id}: não coube ${k} inimigos com 3 tiles de distância`);
  const picks = chosen;
  // os gatos ficam com pontos espaçados entre os escolhidos; os agentes com o resto (na ordem do mapa: linha a linha)
  const catIdx = new Set(Array.from({ length: nCats }, (_, j) => Math.floor(((j + 0.5) * k) / nCats)));
  const cats = [], vets = [];
  picks.forEach((t, i) => (catIdx.has(i) ? cats : vets).push(t));
  vets.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  return { vets, cats };
}

function describe(lv, res) {
  const all = res.vets.concat(res.cats);
  let min = Infinity;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) min = Math.min(min, Math.hypot(all[i][0] - all[j][0], all[i][1] - all[j][1]));
  const fromStart = Math.min(...all.map((t) => Math.hypot(t[0] - lv.spawnTile[0], t[1] - lv.spawnTile[1])));
  return `mín. entre eles ${min.toFixed(1)} tiles · o mais perto do início do cachorrinho ${fromStart.toFixed(1)} tiles`;
}

const B = rig.boot({ mathSeed: 5 });
const g = B.g;
g.setAnimal("dog");
const built = g.builtOf("dog");
let src = fs.readFileSync(FILE, "utf8");
const orig = src;
const report = [];

for (let id = FIRST; id <= LAST; id++) {
  const lv = built[id];
  const nVets = lv.vetSpawns.length, nCats = lv.catSpawns.length;
  const res = choose(lv, nVets, nCats);
  report.push(`Fase ${String(id).padStart(2)}: ${nVets} agentes + ${nCats} gatos · ${describe(lv, res)}`);
  // 1) os `V` do mapa
  const startMap = src.indexOf(`const MAP_${id} = [`);
  const endMap = src.indexOf("];", startMap);
  if (startMap < 0 || endMap < 0) throw new Error(`MAP_${id} não encontrado`);
  const rows = src.slice(startMap, endMap).split("\n");
  const first = rows.findIndex((l) => /^\s*"/.test(l));
  const grid = rows.slice(first).filter((l) => /^\s*"/.test(l)).map((l) => l.match(/^(\s*)"(.*)"(,?)\s*$/));
  if (grid.length !== lv.rows || grid.some((m) => !m || m[2].length !== lv.cols)) throw new Error(`MAP_${id}: linhas fora do formato esperado`);
  const cells = grid.map((m) => [...m[2]]);
  for (const row of cells) for (let c = 0; c < row.length; c++) if (row[c] === "V") row[c] = ".";
  for (const [c, r] of res.vets) { if (cells[r][c] !== ".") throw new Error(`Fase ${id}: (${c},${r}) não é chão livre (${cells[r][c]})`); cells[r][c] = "V"; }
  const newRows = rows.slice(0, first).concat(grid.map((m, i) => `${m[1]}"${cells[i].join("")}"${m[3]}`), rows.slice(first + grid.length));
  src = src.slice(0, startMap) + newRows.join("\n") + src.slice(endMap);
  // 2) a lista `cats:` da fase
  if (nCats) {
    const at = src.indexOf(`id: ${id}, title: "Fase ${id}"`);
    const ci = src.indexOf("cats: [[", at), nextLevel = src.indexOf(`id: ${id + 1}, title:`, at);
    if (at < 0 || ci < 0 || (nextLevel >= 0 && ci > nextLevel)) throw new Error(`Fase ${id}: lista de gatos não encontrada`);
    const ce = src.indexOf("]]", ci) + 2;
    src = src.slice(0, ci) + "cats: [" + res.cats.map((t) => `[${t[0]}, ${t[1]}]`).join(", ") + "]" + src.slice(ce);
  }
}

console.log(report.join("\n"));
if (mode === "write") { fs.writeFileSync(FILE, src); console.log(`\njs/game.js gravado (${src === orig ? "nada mudou" : "mapas e gatos atualizados"}).`); }
else if (mode === "check") { if (src !== orig) { console.error("\njs/game.js não está igual ao que tools/spawns/spread.js escolheria."); process.exit(1); } console.log("\njs/game.js em dia."); }
else console.log(`\n(só mostrou; use --write para gravar${src === orig ? "; já está em dia" : ""})`);
