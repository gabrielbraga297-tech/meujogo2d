// Testes dos 20 mapas e dados das fases do Passarinho (js/bird-levels.js), sem navegador. Uso: node tests/bird-levels.test.js
// Confere, para as 20 fases, as regras de validade do desenho (docs/PASSARINHO-DESENHO.md): tamanhos e números da tabela, anel de #, só a legenda, 1 início,
// postos V (gatos de quintal) e H (gaviões, Fases 11 a 20), saída de 3 tiles na borda e aberta para dentro, grupos de galho G (1 a 3 tiles) e de vento (2 a 8 tiles em linha,
// numa direção, sem seta apontando para parede), os grafos (gatos: sem X, M, #, G; passarinho em voo baixo: com X e G; voo alto: com M), caminhos separados do início à saída,
// espaço para os itens e para caçar, os muros finos M e a economia dos atalhos (voo alto x voo baixo), mapas diferentes entre si e dos do Gatinho e do Cachorrinho, e o determinismo do gerador.
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const A = require(path.join(__dirname, "../tools/birdmaze/bird_analysis.js"));

const ROOT = path.join(__dirname, "..");
const LEVELS = require(path.join(ROOT, "js/bird-levels.js"));
const CAT = require(path.join(ROOT, "js/cat-levels.js"));
const GAME = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
const PLAN = fs.readFileSync(path.join(ROOT, "docs/PASSARINHO-DESENHO.md"), "utf8");
const CATPLAN = fs.readFileSync(path.join(ROOT, "docs/GATINHO-DESENHO.md"), "utf8");

let failed = 0, total = 0;
function test(name, fn) {
  total++;
  try { const note = fn(); console.log("OK   " + name + (note ? "\n     " + note : "")); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 6).join("\n     ") : e)); }
}
const each = (fn) => { const bad = []; for (const lv of LEVELS) { try { fn(lv); } catch (e) { bad.push(`Fase ${lv.id}: ${e.message}`); } } if (bad.length) throw new Error(bad.slice(0, 8).join("\n")); };

// ---- a tabela do desenho (docs/PASSARINHO-DESENHO.md): [colunas, linhas, gatos, gaviões, sementes, frutos, minhocas, grupos de G, grupos de vento]
const EXPECTED = {
  1: [25, 18, 1, 0, 5, 0, 0, 0, 0], 2: [25, 18, 2, 0, 7, 2, 1, 0, 0], 3: [25, 18, 2, 0, 7, 2, 1, 1, 2], 4: [41, 29, 3, 0, 15, 2, 2, 2, 3], 5: [41, 29, 3, 0, 20, 2, 2, 4, 0],
  6: [49, 33, 3, 0, 24, 3, 3, 2, 2], 7: [49, 37, 4, 0, 28, 3, 3, 2, 3], 8: [55, 39, 5, 0, 32, 4, 3, 3, 5], 9: [55, 39, 5, 0, 36, 4, 3, 5, 6], 10: [55, 41, 6, 0, 40, 5, 3, 4, 2],
  11: [57, 41, 5, 2, 44, 5, 4, 4, 4], 12: [57, 41, 5, 3, 46, 5, 4, 4, 4], 13: [57, 43, 6, 3, 48, 6, 4, 7, 3], 14: [57, 43, 6, 4, 50, 6, 4, 4, 8], 15: [59, 43, 6, 4, 52, 6, 4, 4, 5],
  16: [59, 45, 7, 5, 54, 7, 5, 5, 7], 17: [61, 45, 7, 5, 56, 7, 5, 3, 8], 18: [61, 45, 7, 6, 58, 7, 5, 8, 0], 19: [61, 45, 8, 6, 60, 8, 5, 5, 6], 20: [63, 47, 8, 7, 62, 8, 5, 6, 6],
};
// mínimos do desenho (os mesmos de bird_core.py): parte de M entre as paredes de dentro e economia média dos atalhos
const MSHARE_MIN = { 7: 0.85, 8: 0.45, 9: 0.3, 10: 0.35, 13: 0.3, 15: 0.25, 16: 0.3, 17: 0.5, 19: 0.35 }, MSHARE_DEFAULT = 0.4;
const MSAVE_MIN = { 5: 1.0, 16: 1.2 }, MSAVE_DEFAULT = 1.5;

// ---- a tabela do documento (docs/PASSARINHO-DESENHO.md) e a do Gatinho (para a condição de avanço)
const num = (s) => (/^\s*—\s*$/.test(s) ? 0 : parseInt(s, 10));
const rowsOf = (text) => text.split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((c) => c.length > 12);
const PLAN_ROWS = {};
for (const c of rowsOf(PLAN)) {
  if (/^\d+$/.test(c[1]) && /^\d+×\d+$/.test(c[3])) {
    const [W, H] = c[3].split("×").map(Number);
    PLAN_ROWS[+c[1]] = { place: c[2], W, H, cats: num(c[4]), hawks: num(c[5]), seeds: num(c[6]), fruits: num(c[7]), worms: num(c[8]), G: num(c[9]), wind: num(c[10]), cond: c[11], M: c[12] };
  }
}
const CAT_COND = {};
for (const c of rowsOf(CATPLAN)) if (/^\d+$/.test(c[1]) && /^\d+×\d+$/.test(c[3])) CAT_COND[+c[1]] = c[11];
const DOG_MAPS = {}, DOG_ALERT = {};
for (let n = 1; n <= 20; n++) {
  DOG_MAPS[n] = [...GAME.match(new RegExp(`const MAP_${n} = (\\[[\\s\\S]*?\\]);`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const from = GAME.indexOf(`id: ${n}, title: "Fase ${n}"`), to = n < 20 ? GAME.indexOf(`id: ${n + 1}, title: "Fase ${n + 1}"`) : GAME.indexOf("const LEVEL_IDS");
  const m = GAME.slice(from, to).match(/alertTiles: (?:(\d+)|alertTilesFor\((\d+)\))/);
  DOG_ALERT[n] = m[1] ? +m[1] : 2 * +m[2];
}
const KINDS = ["scare", "gold", "ice", "turbo", "magnet"];
const ANALYSIS = LEVELS.map((lv) => A.analyze(lv.map));
const SAVING = LEVELS.map((lv) => A.shortcutSaving(lv.map));
const CROSS = LEVELS.map((lv) => A.crossings(lv.map));

test("o módulo é UMD: window.BirdLevels no navegador e module.exports no Node, com 20 fases em ordem", () => {
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "js/bird-levels.js"), "utf8"), { window: win });
  assert.ok(Array.isArray(win.BirdLevels) && win.BirdLevels.length === 20, "window.BirdLevels não é uma lista de 20");
  assert.strictEqual(JSON.stringify(win.BirdLevels), JSON.stringify(LEVELS), "o navegador e o Node leem dados diferentes");
  assert.deepStrictEqual(LEVELS.map((l) => l.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

test("campos de cada fase: título, lugar, nota, like, sementes, frutos (fruitMix), minhocas, vidas extras, velocidade, semente do gerador e special { G, wind, M }", () => {
  each((lv) => {
    assert.strictEqual(lv.title, `Fase ${lv.id}`);
    assert.ok(typeof lv.place === "string" && lv.place.length >= 3 && typeof lv.note === "string" && lv.note.length >= 10 && lv.note.length <= 100, "place/note");
    assert.ok(Number.isInteger(lv.like) && lv.like >= 1 && lv.like <= 20, "like");
    for (const k of ["seeds", "fruits", "worms", "cats", "hawks"]) assert.ok(Number.isInteger(lv[k]) && lv[k] >= 0, k);
    assert.ok(lv.seeds >= 1 && lv.worms <= 8, "sementes/minhocas");
    assert.ok(Array.isArray(lv.fruitMix) && lv.fruitMix.length === lv.fruits && lv.fruitMix.every((k) => KINDS.includes(k)), "fruitMix");
    assert.ok(lv.fruits === 0 || lv.fruitMix.includes("scare"), "o fruto comum (voo alto) tem de estar sempre presente");
    assert.ok(Array.isArray(lv.extraLives) && lv.extraLives.length === 2 && lv.extraLives.every(Number.isInteger) && lv.extraLives[0] <= lv.extraLives[1] && lv.extraLives[1] <= lv.seeds + lv.fruits, "extraLives");
    assert.ok(lv.birdSpeed >= 0.3 && lv.birdSpeed <= 1.5, "birdSpeed");
    assert.ok(Number.isInteger(lv.seed) && lv.seed >= 0 && lv.seed < 100000, "seed do gerador");
    assert.ok(lv.special && Number.isInteger(lv.special.G) && Number.isInteger(lv.special.wind) && typeof lv.special.M === "boolean", "special");
    assert.strictEqual(lv.special.M, lv.map.some((r) => r.includes("M")), "special.M x muros no mapa");
    assert.deepStrictEqual(Object.keys(lv), ["id", "title", "place", "note", "like", "size", "cats", "hawks", "seeds", "fruits", "fruitMix", "worms", "extraLives", "birdSpeed", "special", "seed", "map"], "ordem e nomes dos campos");
  });
  assert.deepStrictEqual(LEVELS.map((l) => l.birdSpeed), [0.8, 1, 0.9, ...Array(17).fill(1)], "velocidades: 0,8 na Fase 1, 0,9 na 3 e 1 nas outras");
  assert.deepStrictEqual(LEVELS.map((l) => l.like), LEVELS.map((l) => l.id), "like = id");
});

test("os números de cada fase são os da tabela do desenho: tamanho, gatos, gaviões, sementes, frutos, minhocas, grupos de G e de vento", () => {
  assert.strictEqual(Object.keys(PLAN_ROWS).length, 20, "não achei as 20 linhas da tabela em docs/PASSARINHO-DESENHO.md");
  each((lv) => {
    const { W, H } = A.size(lv.map), p = PLAN_ROWS[lv.id], e = EXPECTED[lv.id];
    assert.deepStrictEqual([W, H, lv.cats, lv.hawks, lv.seeds, lv.fruits, lv.worms, lv.special.G, lv.special.wind], e, "diferente da tabela do desenho");
    assert.deepStrictEqual([p.W, p.H, p.cats, p.hawks, p.seeds, p.fruits, p.worms, p.G, p.wind], e, "a tabela de docs/PASSARINHO-DESENHO.md está diferente da esperada neste teste");
    assert.deepStrictEqual(lv.size, [W, H]);
    assert.strictEqual(p.M, lv.special.M ? "sim" : "não", "coluna M da tabela do documento");
    assert.ok(p.place.toLowerCase().startsWith(lv.place.toLowerCase().split(" ")[0]), `lugar "${lv.place}" x documento "${p.place}"`);
    assert.strictEqual(p.cond, CAT_COND[lv.id], "a condição de avanço é a mesma do Gatinho");
    if (lv.id < 11) assert.strictEqual(lv.hawks, 0, "gavião antes da Fase 11");
  });
});

test("a configuração copiada do Gatinho bate com a dele: like, vidas extras, velocidade (catSpeed), tipos de fruto (boneMix) e contagens de ratinhos, novelos e camundongos", () => {
  each((lv) => {
    const c = CAT[lv.id - 1];
    assert.strictEqual(lv.like, c.like, "like");
    assert.deepStrictEqual(lv.extraLives, c.extraLives, "vidas extras");
    assert.strictEqual(lv.birdSpeed, c.catSpeed, "velocidade");
    assert.deepStrictEqual(lv.fruitMix, c.boneMix, "tipos de fruto");
    assert.deepStrictEqual([lv.cats, lv.hawks, lv.seeds, lv.fruits, lv.worms], [c.dogs, c.trackers, c.rations, c.bones, c.balls], "mesmos números do Gatinho (cães/rastreadores/ratinhos/novelos/camundongos)");
  });
});

test("dimensões de 8 a 64 linhas e de 8 a 100 colunas (limites da buildLevel), linhas do mesmo tamanho e anel de # inteiro", () => {
  each((lv) => {
    const { W, H } = A.size(lv.map);
    assert.ok(H >= 8 && H <= 64 && W >= 8 && W <= 100 && lv.map.every((r) => r.length === W), "tamanho");
    for (let x = 0; x < W; x++) assert.ok(lv.map[0][x] === "#" && lv.map[H - 1][x] === "#", "anel de cima/baixo");
    for (let y = 0; y < H; y++) assert.ok(lv.map[y][0] === "#" && lv.map[y][W - 1] === "#", "anel dos lados");
  });
});

test("só os caracteres da legenda (# M . P V H E X G > < ^ v)", () => {
  each((lv) => { for (const r of lv.map) for (const c of r) assert.ok(A.LEGEND.has(c), `caractere ${JSON.stringify(c)}`); });
});

test("1 início P; V = coluna Gatos; H = coluna Gaviões (só nas Fases 11 a 20)", () => {
  each((lv) => {
    const n = (c) => A.tilesOf(lv.map, c).length;
    assert.strictEqual(n("P"), 1, "P");
    assert.strictEqual(n("V"), lv.cats, "V");
    assert.strictEqual(n("H"), lv.hawks, "H");
  });
});

test("saída: 1 grupo E de 3 tiles em linha, encostado na borda e aberto para dentro (os 2 tiles à frente de cada E são chão '.')", () => {
  each((lv) => {
    const e = A.exitInfo(lv.map);
    assert.ok(e, "a saída não são 3 tiles em linha encostados na borda");
    for (const [x, y] of e.front) assert.strictEqual(A.at(lv.map, x, y), ".", `frente da saída (${x},${y}) não é chão`);
  });
  const sides = new Set(LEVELS.map((lv) => A.exitInfo(lv.map).side));
  assert.ok(sides.size >= 3, "a saída devia mudar de lado entre as fases");
  return "lados da saída: " + LEVELS.map((lv) => A.exitInfo(lv.map).side).join("");
});

test("postos V/H a 8 tiles ou mais do início (e fora do alcance do \"!\" da fase no começo); nenhum posto colado na saída nem em outro posto", () => {
  each((lv, i) => {
    const a = ANALYSIS[lv.id - 1];
    for (const [x, y] of a.posts) {
      assert.ok(Math.max(Math.abs(x - a.P[0]), Math.abs(y - a.P[1])) >= 8, `posto (${x},${y}) a menos de 8 tiles do início`);
      assert.ok(Math.hypot(x - a.P[0], y - a.P[1]) > DOG_ALERT[lv.like], `posto (${x},${y}) já enxerga o início (alcance do "!" ${DOG_ALERT[lv.like]})`);
      for (const [ex, ey] of a.exits) assert.ok(Math.max(Math.abs(x - ex), Math.abs(y - ey)) >= 5, `posto (${x},${y}) colado na saída`);
    }
    for (let a1 = 0; a1 < a.posts.length; a1++) for (let b = a1 + 1; b < a.posts.length; b++) assert.ok(Math.max(Math.abs(a.posts[a1][0] - a.posts[b][0]), Math.abs(a.posts[a1][1] - a.posts[b][1])) >= 3, "dois postos colados");
  });
});

test("G e vento nunca em cima de P, V, H e E (um caractere por tile), nem na frente da saída, nem a menos de 2 tiles do início, da saída e dos postos; o início tem 2 saídas livres", () => {
  each((lv) => {
    const e = A.exitInfo(lv.map), a = ANALYSIS[lv.id - 1];
    const special = [...A.tilesOf(lv.map, "G"), ...A.tilesOf(lv.map, A.WIND)];
    for (const [x, y] of special) {
      assert.ok(!e.front.some(([fx, fy]) => fx === x && fy === y), `G/vento na frente da saída em (${x},${y})`);
      for (const [px, py] of [...e.tiles, a.P, ...a.posts]) assert.ok(Math.max(Math.abs(x - px), Math.abs(y - py)) >= 2, `G/vento a menos de 2 tiles de P/E/posto em (${x},${y})`);
    }
    const [px, py] = a.P;
    assert.ok(A.D4.filter(([dx, dy]) => A.CATW.has(A.at(lv.map, px + dx, py + dy))).length >= 2, "o início está num beco");
  });
});

test("galhos G: grupos (4 e 8 vizinhos) de 1 a 3 tiles, na quantidade da tabela", () => {
  each((lv) => {
    const g4 = A.groups(lv.map, "G", false), g8 = A.groups(lv.map, "G", true);
    assert.strictEqual(g4.length, lv.special.G, `grupos de G: ${g4.length}, esperado ${lv.special.G}`);
    assert.strictEqual(g8.length, g4.length, "galhos se encostam na diagonal");
    for (const g of g4) assert.ok(g.length >= 1 && g.length <= 3, `grupo de G com ${g.length} tiles (deve ter 1 a 3)`);
  });
});

test("vento: grupos de 2 a 8 tiles em linha reta numa direção, na quantidade da tabela, sem se encostar (nem na diagonal) e SEM seta apontando para # ou M (o tile à frente é chão ou o próprio vento)", () => {
  let groups = 0, tiles = 0;
  each((lv) => {
    const all = [];
    for (const c of A.WIND) {
      const g4 = A.groups(lv.map, c, false), g8 = A.groups(lv.map, c, true);
      assert.strictEqual(g8.length, g4.length, `ventos ${c} se encostam na diagonal`);
      all.push(...g4.map((g) => ({ c, g })));
    }
    assert.strictEqual(all.length, lv.special.wind, `grupos de vento: ${all.length}, esperado ${lv.special.wind}`);
    const where = new Map();
    all.forEach(({ g }, i) => g.forEach(([x, y]) => where.set(x + "," + y, i)));
    for (const { c, g } of all) {
      groups++; tiles += g.length;
      assert.ok(g.length >= 2 && g.length <= 8, `grupo de vento com ${g.length} tiles (deve ter 2 a 8)`);
      const xs = new Set(g.map((t) => t[0])), ys = new Set(g.map((t) => t[1]));
      assert.ok(xs.size === 1 || ys.size === 1, "grupo de vento fora de linha reta");
      assert.ok(c === "<" || c === ">" ? ys.size === 1 : xs.size === 1, `a linha de vento ${c} não está na direção da seta`);
      const [dx, dy] = A.VEC[c], mine = new Set(g.map((t) => t[0] + "," + t[1]));
      for (const [x, y] of g) {
        const nx = x + dx, ny = y + dy, nxt = A.at(lv.map, nx, ny);
        assert.ok(nxt === "." || mine.has(nx + "," + ny), `a seta ${c} em (${x},${y}) aponta para ${JSON.stringify(nxt)}`);
        assert.ok(!"#M".includes(nxt));
      }
    }
    // vento só em chão '.': os 4 vizinhos de cada ponta não podem ser E, P, V, H
    for (const [x, y] of A.tilesOf(lv.map, A.WIND.split("").join(""))) for (const [dx, dy] of A.D4) assert.ok(!"EPVH".includes(A.at(lv.map, x + dx, y + dy)), `vento encostado em P/V/H/E em (${x},${y})`);
  });
  return `${groups} grupos de vento, ${tiles} tiles de seta`;
});

test("grafo dos GATOS (. P V H E e vento; sem # M X G): liga P, todos os V/H e E, e não há bolsão de chão que um gato não alcance (nem o gavião, que também passa por X)", () => {
  each((lv) => {
    const { W } = A.size(lv.map), a = ANALYSIS[lv.id - 1];
    const unreachable = A.tilesOf(lv.map, [...A.CATW].join("")).filter(([x, y]) => a.catReach[y * W + x] < 0);
    assert.strictEqual(unreachable.length, 0, `${unreachable.length} tiles de chão que os gatos não alcançam, ex. ${JSON.stringify(unreachable[0])}`);
    for (const d of [...a.postCat, a.peCat]) assert.ok(d > 0);
    for (const d of a.postHawk) assert.ok(d > 0, "posto fora do grafo do gavião");
  });
});

test("grafo do PASSARINHO em voo baixo (também X e G): tudo o que não é # nem M se alcança; o gato alcança TODO o chão que o passarinho alcança; a saída se alcança por voo baixo", () => {
  each((lv) => {
    const { W } = A.size(lv.map), a = ANALYSIS[lv.id - 1];
    const low = A.tilesOf(lv.map, [...A.LOWW].join(""));
    const missLow = low.filter(([x, y]) => a.lowReach[y * W + x] < 0);
    assert.strictEqual(missLow.length, 0, `${missLow.length} tiles (X/G/chão) que o passarinho não alcança no voo baixo, ex. ${JSON.stringify(missLow[0])}`);
    const missCat = low.filter(([x, y]) => A.CATW.has(lv.map[y][x]) && a.lowReach[y * W + x] >= 0 && a.catReach[y * W + x] < 0);
    assert.strictEqual(missCat.length, 0, `${missCat.length} tiles de chão que o passarinho alcança e o gato não`);
    assert.ok(a.peLow > 0 && a.peLow <= a.peCat, "no voo baixo o passarinho nunca tem caminho mais longo que o gato");
    assert.ok(a.peHigh <= a.peLow, "o voo alto nunca é mais longo que o voo baixo");
  });
});

test("pelo menos 2 caminhos de P a E, no grafo dos gatos, sem nenhum tile do meio em comum (pontes só são aceitas nas Fases 1 a 3); idem no voo baixo", () => {
  each((lv) => {
    const a = ANALYSIS[lv.id - 1];
    assert.ok(a.disjointCat >= 1 && a.disjointLow >= a.disjointCat, "sem caminho");
    if (lv.id >= 4) assert.ok(a.disjointCat >= 2, `só ${a.disjointCat} caminho(s) sem tile em comum`);
  });
  return "caminhos separados (gatos): " + ANALYSIS.map((a) => a.disjointCat).join(",");
});

// ---- espaço para os itens: a mesma regra de placeItems (js/game.js ~1708): os candidatos são os tiles alcançáveis pelos gatos, a 4 ou mais passos de P, fora de E e do vento,
// a 4 ou mais tiles de qualquer posto; as sementes e os frutos são sorteados juntos, longe uns dos outros (distância mínima 6, 5, 4, 3, 2 ou 0, a primeira que couber); depois as minhocas
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function placeSim(cand, count, used, rnd) {
  const c = cand.filter(([x, y]) => !used.some(([a, b]) => a === x && b === y));
  for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
  for (const gap of [6, 5, 4, 3, 2, 0]) {
    const picked = [];
    for (const t of c) { if (picked.every((p) => Math.hypot(p[0] - t[0], p[1] - t[1]) >= gap)) picked.push(t); if (picked.length === count) return { picked, gap }; }
  }
  return { picked: c.slice(0, count), gap: -1 };
}
test("espaço para os itens: sementes + frutos + minhocas ocupam no máximo 35% dos tiles onde o motor sorteia (regra de placeItems) e, em 12 sorteios, cabem com distância mínima de 3 tiles", () => {
  const pct = [], gaps = [];
  each((lv) => {
    const cand = A.engineCandidates(lv.map), items = lv.seeds + lv.fruits + lv.worms;
    pct.push(Math.round(100 * items / cand.length));
    assert.ok(items <= 0.35 * cand.length, `${items} itens para ${cand.length} tiles possíveis (${(100 * items / cand.length).toFixed(1)}%)`);
    let worst = 9;
    for (let s = 0; s < 12; s++) {
      const rnd = mulberry32(lv.id * 1000 + s), first = placeSim(cand, lv.seeds + lv.fruits, [], rnd), second = placeSim(cand, lv.worms, first.picked, rnd);
      assert.strictEqual(first.picked.length, lv.seeds + lv.fruits, "faltou chão para sementes e frutos");
      assert.strictEqual(second.picked.length, lv.worms, "faltou chão para as minhocas");
      worst = Math.min(worst, first.gap);
    }
    gaps.push(worst);
    assert.ok(worst >= 3, `distância mínima só ${worst} entre os itens`);
  });
  return `maior fração: ${Math.max(...pct)}% (itens/tiles possíveis); menor distância mínima entre sementes: ${Math.min(...gaps)}`;
});

test("espaço para caçar: pelo menos 20% dos tiles livres ('.') a 4 tiles ou mais de qualquer posto", () => {
  const pct = [];
  each((lv) => {
    const a = ANALYSIS[lv.id - 1], dots = A.tilesOf(lv.map, "."), far = dots.filter(([x, y]) => a.posts.every(([px, py]) => Math.max(Math.abs(x - px), Math.abs(y - py)) >= 4)).length;
    pct.push(Math.round(100 * far / dots.length));
    assert.ok(far >= 0.2 * dots.length, `só ${(100 * far / dots.length).toFixed(0)}%`);
  });
  return "menor fração: " + Math.min(...pct) + "%";
});

test("muros M: nunca em bloco 3x3 de parede (são finos: até 2 tiles de espessura); as Fases 1 a 3 têm pelo menos 4; em cada fase a parte de M entre as paredes de dentro bate o mínimo e, nas Fases 4 a 20, a média é de pelo menos 50%", () => {
  const shares = [];
  each((lv) => {
    assert.strictEqual(A.thickM(lv.map), 0, "há M dentro de um bloco 3x3 de parede");
    const a = ANALYSIS[lv.id - 1];
    assert.ok(a.nM >= (lv.id <= 3 ? 4 : 6), `poucos M (${a.nM})`);
    assert.ok(a.share >= (MSHARE_MIN[lv.id] ?? MSHARE_DEFAULT), `só ${(100 * a.share).toFixed(0)}% das paredes de dentro são M (mínimo ${100 * (MSHARE_MIN[lv.id] ?? MSHARE_DEFAULT)}%)`);
    if (lv.id >= 4) shares.push(a.share);
  });
  const mean = shares.reduce((s, v) => s + v, 0) / shares.length;
  assert.ok(mean >= 0.5, `média da parte de M nas Fases 4 a 20: ${(100 * mean).toFixed(0)}%`);
  return `M entre as paredes de dentro: ${ANALYSIS.map((a, i) => (i + 1) + ":" + Math.round(100 * a.share) + "%").join(" ")} (média das Fases 4 a 20: ${(100 * mean).toFixed(0)}%)`;
});

test("atalhos: o voo alto realmente encurta caminhos. Fases 4 a 20: economia média (voo baixo menos voo alto, em tiles, nas 48 origens da amostra) acima do mínimo e pelo menos 3 tiles M em travessias úteis (o voo baixo precisa de 4 passos a mais)", () => {
  each((lv) => {
    const s = SAVING[lv.id - 1], c = CROSS[lv.id - 1];
    assert.ok(s.peHigh <= s.peLow, "voo alto mais longo que o baixo");
    if (lv.id >= 4) {
      assert.ok(s.avg >= (MSAVE_MIN[lv.id] ?? MSAVE_DEFAULT), `economia média só ${s.avg.toFixed(2)} tiles (mínimo ${MSAVE_MIN[lv.id] ?? MSAVE_DEFAULT})`);
      assert.ok(c.useful >= 3, `só ${c.useful} tiles M em travessias úteis`);
    }
  });
  const live = SAVING.slice(3), mean = live.reduce((x, s) => x + s.avg, 0) / live.length;
  return `economia média por fase (tiles): ${SAVING.map((s, i) => (i + 1) + ":" + s.avg.toFixed(1)).join(" ")} · média das Fases 4 a 20: ${mean.toFixed(2)} tiles · P→E: ${SAVING.map((s) => s.peSave).join(",")}`;
});

test("o documento registra a economia dos atalhos (docs/PASSARINHO-DESENHO.md, seção 'Muros voáveis e atalhos') com os mesmos números que o teste calcula", () => {
  const sec = PLAN.slice(PLAN.indexOf("## Muros voáveis e atalhos"));
  assert.ok(sec.length > 100, "não achei a seção 'Muros voáveis e atalhos'");
  const rows = sec.split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((c) => c.length >= 11 && /^\d+$/.test(c[1]));
  assert.strictEqual(rows.length, 20, "a tabela de atalhos devia ter 20 linhas");
  for (const c of rows) {
    const id = +c[1], a = ANALYSIS[id - 1], s = SAVING[id - 1], cr = CROSS[id - 1];
    assert.strictEqual(+c[2], a.nM, `Fase ${id}: tiles M`);
    assert.strictEqual(+c[3], a.nHash, `Fase ${id}: tiles # de dentro`);
    assert.ok(Math.abs(parseFloat(c[4]) - 100 * a.share) <= 0.6, `Fase ${id}: % de M`);
    assert.strictEqual(+c[5], s.peLow, `Fase ${id}: P→E voo baixo`);
    assert.strictEqual(+c[6], s.peHigh, `Fase ${id}: P→E voo alto`);
    assert.strictEqual(+c[7], s.peSave, `Fase ${id}: economia P→E`);
    assert.ok(Math.abs(parseFloat(c[8].replace(",", ".")) - s.avg) <= 0.006, `Fase ${id}: economia média (${c[8]} x ${s.avg.toFixed(2)})`);
    assert.ok(Math.abs(parseFloat(c[9].replace(",", ".")) - 100 * s.frac4) <= 0.06, `Fase ${id}: pares com economia >= 4`);
    assert.strictEqual(+c[10], cr.useful, `Fase ${id}: tiles M úteis`);
  }
});

// ---- mapas diferentes. O Gatinho exigia no máximo 60% de tiles iguais na mesma posição; os mapas do Passarinho são mais abertos (muito chão), e dois mapas abertos quaisquer já têm bem mais de
// 60% de chão em comum. Vale a sobreposição (Jaccard) de PAREDES e PEÇAS (# e M contam igual; X; G e o T do Gatinho contam igual), sem o anel de fora: no máximo 35% entre mapas do mesmo tamanho
// e 45% na janela comum de tamanhos diferentes; e, relaxada, a regra antiga dos tiles iguais (85% / 90%: pega cópias).
const FEAT = { "#": "#", M: "#", X: "X", G: "G", T: "G" };
function overlap(a, b) {
  const h = Math.min(a.length, b.length), w = Math.min(a[0].length, b[0].length);
  let inter = 0, union = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const ca = FEAT[a[y][x]], cb = FEAT[b[y][x]];
    if (ca === undefined && cb === undefined) continue;
    union++;
    if (ca === cb) inter++;
  }
  return union ? inter / union : 0;
}
test("os 20 mapas são diferentes entre si, dos 20 do Gatinho e dos 20 do Cachorrinho (sobreposição de paredes e peças e tiles iguais: limites acima)", () => {
  let worstFeat = 0, worstRaw = 0, worstName = "";
  const check = (a, b, what) => {
    const same = A.sameSize(a, b), f = overlap(a, b), r = A.sameFraction(a, b);
    const lim = same ? 0.35 : 0.45;
    if (f / lim > worstFeat) { worstFeat = f / lim; worstName = `${what} ${(100 * f).toFixed(0)}%`; }
    worstRaw = Math.max(worstRaw, r);
    assert.ok(f <= lim, `${what}: ${(100 * f).toFixed(1)}% de paredes e peças iguais (limite ${100 * lim}%)`);
    assert.ok(r <= (same ? 0.85 : 0.9), `${what}: ${(100 * r).toFixed(1)}% de tiles iguais`);
    assert.notDeepStrictEqual(a, b, what + ": mapas idênticos");
  };
  for (let i = 0; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) check(LEVELS[i].map, LEVELS[j].map, `Fase ${i + 1} x Fase ${j + 1} do Passarinho`);
    for (let j = 0; j < 20; j++) check(LEVELS[i].map, CAT[j].map, `Fase ${i + 1} do Passarinho x Fase ${j + 1} do Gatinho`);
    for (let j = 1; j <= 20; j++) check(LEVELS[i].map, DOG_MAPS[j], `Fase ${i + 1} do Passarinho x Fase ${j} do Cachorrinho`);
  }
  return `pior par: ${worstName} (${(100 * worstFeat).toFixed(0)}% do limite); maior fração de tiles iguais: ${(100 * worstRaw).toFixed(1)}%`;
});

test("cada fase tem um desenho próprio: as paredes de uma fase nunca são as de outra (do mesmo tamanho) deslocadas ou espelhadas", () => {
  const flip = (m) => m.map((r) => [...r].reverse().join(""));
  const sig = (m) => A.solidSignature(m).join("\n");
  for (let i = 0; i < 20; i++) for (let j = i + 1; j < 20; j++) {
    if (!A.sameSize(LEVELS[i].map, LEVELS[j].map)) continue;
    assert.notStrictEqual(sig(LEVELS[i].map), sig(LEVELS[j].map), `Fases ${i + 1} e ${j + 1} têm as mesmas paredes`);
    assert.notStrictEqual(sig(LEVELS[i].map), sig(flip(LEVELS[j].map)), `Fases ${i + 1} e ${j + 1} são espelhos`);
  }
});

test("determinismo: o gerador (python3 tools/birdmaze/gen_bird.py --all --json), rodado duas vezes, dá os mesmos 20 mapas de js/bird-levels.js; e `--all --write --out` dá o mesmo arquivo, byte a byte (idempotente, com as sementes registradas)", () => {
  const env = { ...process.env, PYTHONDONTWRITEBYTECODE: "1" };           // (sem gravar __pycache__ dentro de tools/birdmaze)
  const run = (args) => spawnSync("python3", [path.join(ROOT, "tools/birdmaze/gen_bird.py"), ...args], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 280000, env });
  const r1 = run(["--all", "--json"]);
  if (r1.error || r1.status === null) assert.fail("python3 não está disponível (ou demorou demais): o determinismo do gerador NÃO foi conferido. Este teste precisa de python3 (instale-o e rode de novo); sem ele não conta como passou.");
  assert.strictEqual(r1.status, 0, "o gerador falhou: " + (r1.stderr || "").slice(0, 300));
  const r2 = run(["--all", "--json"]);
  assert.strictEqual(r1.stdout, r2.stdout, "duas execuções deram mapas diferentes");
  assert.deepStrictEqual(JSON.parse(r1.stdout), LEVELS.map((l) => l.map), "o arquivo js/bird-levels.js não é o que o gerador produz (rode: python3 tools/birdmaze/gen_bird.py --all --write)");
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "bird-levels-")), "bird-levels.js");
  const r3 = run(["--all", "--write", "--out", tmp]);
  assert.strictEqual(r3.status, 0, "o gerador falhou ao escrever: " + (r3.stderr || "").slice(0, 300));
  assert.strictEqual(fs.readFileSync(tmp, "utf8"), fs.readFileSync(path.join(ROOT, "js/bird-levels.js"), "utf8"), "js/bird-levels.js não é idêntico ao que o gerador escreve (rode: python3 tools/birdmaze/gen_bird.py --all --write)");
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  return "sementes: " + LEVELS.map((l) => l.seed).join(",");
});

console.log("\n" + (failed ? `${failed} de ${total} testes FALHARAM` : `${total} de ${total} testes passaram`));
// tabela de distâncias (BFS) para o relatório: node tests/bird-levels.test.js --tabela
if (process.argv.includes("--tabela")) require(path.join(__dirname, "../tools/birdmaze/bird_sim.js"));
process.exit(failed ? 1 : 0);
