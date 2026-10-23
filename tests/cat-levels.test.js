// Testes dos 20 mapas e dados das fases do Gatinho (js/cat-levels.js), sem navegador. Uso: node tests/cat-levels.test.js
// Confere, para as 20 fases, as regras de validade do plano (docs/GATINHO-DESENHO.md): tamanhos e números da tabela, anel de #, só a legenda, 1 início,
// postos V/R, saída de 3 tiles na borda e aberta para dentro, grupos de T (1 a 3 tiles) e ~ (2 a 10), os dois grafos (cães: sem X/T; gatinho: com X/T),
// caminhos separados do início à saída, espaço para os itens e para caçar, mapas diferentes entre si e dos do cachorrinho, e o determinismo do gerador.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const A = require(path.join(__dirname, "../tools/catmaze/cat_analysis.js"));

const ROOT = path.join(__dirname, "..");
const LEVELS = require(path.join(ROOT, "js/cat-levels.js"));
const GAME = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
const PLAN = fs.readFileSync(path.join(ROOT, "docs/GATINHO-DESENHO.md"), "utf8");

let failed = 0, total = 0;
function test(name, fn) {
  total++;
  try { const note = fn(); console.log("OK   " + name + (note ? "\n     " + note : "")); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 6).join("\n     ") : e)); }
}
const each = (fn) => { const bad = []; for (const lv of LEVELS) { try { fn(lv); } catch (e) { bad.push(`Fase ${lv.id}: ${e.message}`); } } if (bad.length) throw new Error(bad.slice(0, 8).join("\n")); };

// ---- a tabela do plano (docs/GATINHO-DESENHO.md) e as fases do cachorrinho (js/game.js)
const num = (s) => (/^\s*—\s*$/.test(s) ? 0 : parseInt(s, 10));
const PLAN_ROWS = {};
for (const line of PLAN.split("\n")) {
  const c = line.split("|").map((s) => s.trim());
  if (c.length > 12 && /^\d+$/.test(c[1]) && /^\d+×\d+$/.test(c[3])) {
    const [W, H] = c[3].split("×").map(Number);
    PLAN_ROWS[+c[1]] = { place: c[2], W, H, dogs: num(c[4]), trackers: num(c[5]), rations: num(c[6]), bones: num(c[7]), balls: num(c[8]), T: num(c[9]), water: num(c[10]) };
  }
}
const DOG_MAPS = {}, DOG_ALERT = {};
for (let n = 1; n <= 20; n++) {
  DOG_MAPS[n] = [...GAME.match(new RegExp(`const MAP_${n} = (\\[[\\s\\S]*?\\]);`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const from = GAME.indexOf(`id: ${n}, title: "Fase ${n}"`), to = n < 20 ? GAME.indexOf(`id: ${n + 1}, title: "Fase ${n + 1}"`) : GAME.indexOf("const LEVEL_IDS");
  const m = GAME.slice(from, to).match(/alertTiles: (?:(\d+)|alertTilesFor\((\d+)\))/);
  DOG_ALERT[n] = m[1] ? +m[1] : 2 * +m[2];
}
const KINDS = ["scare", "gold", "ice", "turbo", "magnet"];
const A_ = LEVELS.map((lv) => A.analyze(lv.map));

test("o módulo é UMD: window.CatLevels no navegador e module.exports no Node, com 20 fases em ordem", () => {
  const win = {};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, "js/cat-levels.js"), "utf8"), { window: win });
  assert.ok(Array.isArray(win.CatLevels) && win.CatLevels.length === 20, "window.CatLevels não é uma lista de 20");
  assert.strictEqual(JSON.stringify(win.CatLevels), JSON.stringify(LEVELS), "o navegador e o Node leem dados diferentes");
  assert.deepStrictEqual(LEVELS.map((l) => l.id), Array.from({ length: 20 }, (_, i) => i + 1));
});

test("campos de cada fase: título, lugar, nota, like, ratinhos, novelos (boneMix), camundongos, vidas extras, velocidade e special", () => {
  each((lv) => {
    assert.strictEqual(lv.title, `Fase ${lv.id}`);
    assert.ok(typeof lv.place === "string" && lv.place.length >= 3 && typeof lv.note === "string" && lv.note.length >= 10 && lv.note.length <= 100, "place/note");
    assert.ok(Number.isInteger(lv.like) && lv.like >= 1 && lv.like <= 20, "like");
    for (const k of ["rations", "bones", "balls"]) assert.ok(Number.isInteger(lv[k]) && lv[k] >= 0, k);
    assert.ok(lv.rations >= 1 && lv.balls <= 8, "ratinhos/camundongos");
    assert.ok(Array.isArray(lv.boneMix) && lv.boneMix.length === lv.bones && lv.boneMix.every((k) => KINDS.includes(k)), "boneMix");
    assert.ok(lv.bones === 0 || lv.boneMix.includes("scare"), "o novelo comum tem de estar sempre presente");
    assert.ok(Array.isArray(lv.extraLives) && lv.extraLives.length === 2 && lv.extraLives.every(Number.isInteger) && lv.extraLives[0] <= lv.extraLives[1] && lv.extraLives[1] <= lv.rations + lv.bones, "extraLives");
    assert.ok(lv.catSpeed >= 0.3 && lv.catSpeed <= 1.5, "catSpeed");
    assert.ok(lv.special && Number.isInteger(lv.special.T) && Number.isInteger(lv.special.water), "special");
  });
  assert.deepStrictEqual(LEVELS.map((l) => l.catSpeed), [0.8, 1, 0.9, ...Array(17).fill(1)], "velocidades: 0,8 na Fase 1, 0,9 na 3 e 1 nas outras");
  assert.deepStrictEqual(LEVELS.map((l) => l.like), LEVELS.map((l) => l.id), "like = id");
});

test("os números de cada fase são os da tabela do plano (tamanho, cães, rastreadores, ratinhos, novelos, camundongos, T e poças)", () => {
  assert.strictEqual(Object.keys(PLAN_ROWS).length, 20, "não achei as 20 linhas da tabela em docs/GATINHO-DESENHO.md");
  each((lv) => {
    const p = PLAN_ROWS[lv.id], { W, H } = A.size(lv.map);
    assert.deepStrictEqual([W, H, lv.dogs, lv.trackers, lv.rations, lv.bones, lv.balls, lv.special.T, lv.special.water], [p.W, p.H, p.dogs, p.trackers, p.rations, p.bones, p.balls, p.T, p.water], "diferente da tabela do plano");
    assert.deepStrictEqual(lv.size, [W, H]);
    assert.ok(p.place.toLowerCase().startsWith(lv.place.toLowerCase().split(" ")[0]), `lugar "${lv.place}" x plano "${p.place}"`);
  });
});

test("a configuração copiada do cachorrinho (like) bate com a dele: novelos, camundongos, ratinhos, vidas extras e tipos de novelo", () => {
  each((lv) => {
    const from = GAME.indexOf(`id: ${lv.like}, title: "Fase ${lv.like}"`), to = lv.like < 20 ? GAME.indexOf(`id: ${lv.like + 1}, title: "Fase ${lv.like + 1}"`) : GAME.indexOf("const LEVEL_IDS");
    const t = GAME.slice(from, to), g = (re) => { const m = t.match(re); return m ? m[1] : null; };
    assert.strictEqual(+g(/rations: (\d+)/), lv.rations, "ratinhos x rações do cachorrinho");
    assert.strictEqual(+g(/bones: (\d+)/), lv.bones, "novelos x ossos");
    assert.strictEqual(+(g(/balls: (\d+)/) || 0), lv.balls, "camundongos x bolinhas");
    assert.strictEqual(g(/extraLives: (\[\d+, \d+\])/), JSON.stringify(lv.extraLives).replace(",", ", "), "vidas extras");
    const mix = g(/boneMix: (\[[^\]]*\])/);
    assert.deepStrictEqual(mix ? JSON.parse(mix) : Array(lv.bones).fill("scare"), lv.boneMix, "tipos de novelo");
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

test("só os caracteres da legenda (# . P V R E X T ~)", () => {
  each((lv) => { for (const r of lv.map) for (const c of r) assert.ok(A.LEGEND.has(c), `caractere ${JSON.stringify(c)}`); });
});

test("1 início P; V = coluna Cães; R = coluna Rastr. (só nas Fases 11 a 20); R nunca antes da Fase 11", () => {
  each((lv) => {
    const n = (c) => A.tilesOf(lv.map, c).length;
    assert.strictEqual(n("P"), 1, "P");
    assert.strictEqual(n("V"), lv.dogs, "V");
    assert.strictEqual(n("R"), lv.trackers, "R");
    if (lv.id < 11) assert.strictEqual(lv.trackers, 0);
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
});

test("postos V/R a 8 tiles ou mais do início (e fora do alcance do \"!\" da fase no começo); a saída não fica perto de posto", () => {
  each((lv, i) => {
    const a = A.analyze(lv.map);
    for (const [x, y] of a.posts) {
      assert.ok(Math.max(Math.abs(x - a.P[0]), Math.abs(y - a.P[1])) >= 8, `posto (${x},${y}) a menos de 8 tiles do início`);
      assert.ok(Math.hypot(x - a.P[0], y - a.P[1]) > DOG_ALERT[lv.like], `posto (${x},${y}) já enxerga o início (alcance do "!" ${DOG_ALERT[lv.like]})`);
      for (const [ex, ey] of a.exits) assert.ok(Math.max(Math.abs(x - ex), Math.abs(y - ey)) >= 5, `posto (${x},${y}) colado na saída`);
    }
    // postos distintos e espalhados
    for (let a1 = 0; a1 < a.posts.length; a1++) for (let b = a1 + 1; b < a.posts.length; b++) assert.ok(Math.max(Math.abs(a.posts[a1][0] - a.posts[b][0]), Math.abs(a.posts[a1][1] - a.posts[b][1])) >= 3, "dois postos colados");
  });
});

test("X, T e ~ nunca em cima de P, V, R e E (um caractere por tile) nem na linha de frente da saída; o início tem 2 saídas livres", () => {
  each((lv) => {
    const e = A.exitInfo(lv.map);
    for (const [x, y] of [...A.tilesOf(lv.map, "XT~")]) {
      assert.ok(!e.tiles.some(([a, b]) => a === x && b === y), "em cima da saída");
      assert.ok(!e.front.some(([a, b]) => a === x && b === y), `X/T/~ na frente da saída em (${x},${y})`);
    }
    const [px, py] = A.tilesOf(lv.map, "P")[0];
    assert.ok(A.D4.filter(([dx, dy]) => A.DOG.has(A.at(lv.map, px + dx, py + dy))).length >= 2, "o início está num beco");
  });
});

test("T e ~ nos números da tabela: grupos (4 e 8 vizinhos) de T com 1 a 3 tiles e de ~ com 2 a 10 tiles", () => {
  each((lv) => {
    for (const [ch, key, lo, hi] of [["T", "T", 1, 3], ["~", "water", 2, 10]]) {
      const g4 = A.groups(lv.map, ch, false), g8 = A.groups(lv.map, ch, true);
      assert.strictEqual(g4.length, lv.special[key], `grupos de ${ch}: ${g4.length} (4 vizinhos), esperado ${lv.special[key]}`);
      assert.strictEqual(g8.length, g4.length, `grupos de ${ch} se encostam na diagonal`);
      for (const g of g4) assert.ok(g.length >= lo && g.length <= hi, `grupo de ${ch} com ${g.length} tiles (deve ter ${lo} a ${hi})`);
    }
  });
});

test("grafo dos CÃES (. ~ P V R E; sem # X T): liga P, todos os V/R e E, e não há bolsão de chão que um cão não alcance", () => {
  each((lv) => {
    const { W } = A.size(lv.map), a = A.analyze(lv.map);
    const unreachable = A.tilesOf(lv.map, ".~PVRE").filter(([x, y]) => a.dogReach[y * W + x] < 0);
    assert.strictEqual(unreachable.length, 0, `${unreachable.length} tiles de chão que os cães não alcançam, ex. ${JSON.stringify(unreachable[0])}`);
    for (const d of [...a.postDog, a.peDog]) assert.ok(d > 0);
  });
});

test("grafo do GATINHO (também X e T): tudo o que não é parede se alcança (nenhum X/T/chão isolado)", () => {
  each((lv) => {
    const { W } = A.size(lv.map), a = A.analyze(lv.map);
    const unreachable = A.tilesOf(lv.map, ".~PVRETX").filter(([x, y]) => a.catReach[y * W + x] < 0);
    assert.strictEqual(unreachable.length, 0, `${unreachable.length} tiles que o gatinho não alcança`);
    assert.ok(a.peCat <= a.peDog, "o gatinho nunca tem caminho mais longo que o cão");
  });
});

test("pelo menos 2 caminhos de P a E, no grafo dos cães, sem nenhum tile do meio em comum (pontes só são aceitas nas Fases 1 a 3)", () => {
  each((lv) => {
    const a = A.analyze(lv.map);
    assert.ok(a.disjoint >= 1, "sem caminho");
    if (lv.id >= 4) assert.ok(a.disjoint >= 2, `só ${a.disjoint} caminho(s) sem tile em comum`);
  });
  return "Fases 1 a 3: caminhos separados = " + A_.slice(0, 3).map((a) => a.disjoint).join(", ");
});

test("espaço para os itens: ratinhos + novelos + camundongos ocupam no máximo 35% dos tiles '.' alcançáveis", () => {
  each((lv) => {
    const a = A.analyze(lv.map), { W } = A.size(lv.map);
    const dots = A.tilesOf(lv.map, ".").filter(([x, y]) => a.dogReach[y * W + x] >= 0).length, items = lv.rations + lv.bones + lv.balls;
    assert.ok(items <= 0.35 * dots, `${items} itens para ${dots} tiles '.' (${(100 * items / dots).toFixed(1)}%)`);
  });
});

test("nenhuma X/T fecha um corredor de 1 tile no grafo dos cães sem alternativa (os dois lados continuam ligados por outro caminho)", () => {
  let plugs = 0;
  each((lv) => {
    const { W } = A.size(lv.map);
    for (const [x, y] of A.tilesOf(lv.map, "XT")) {
      for (const [[ax, ay], [bx, by]] of [[[-1, 0], [1, 0]], [[0, -1], [0, 1]]]) {
        const s1 = A.at(lv.map, x + ax, y + ay), s2 = A.at(lv.map, x + bx, y + by);
        const side = (dx, dy) => A.DOG.has(A.at(lv.map, x + dx, y + dy));
        const perp = ax === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        if (A.DOG.has(s1) && A.DOG.has(s2) && perp.every(([dx, dy]) => !side(dx, dy))) {
          plugs++;
          const d = A.bfs(lv.map, [[x + ax, y + ay]], A.DOG);
          assert.ok(d[(y + by) * W + x + bx] >= 0, `X/T em (${x},${y}) fecha um corredor sem alternativa`);
        }
      }
    }
  });
  return `${plugs} tiles X/T ficam no meio de um corredor de 1 tile (todos com alternativa)`;
});

test("espaço para caçar: pelo menos 20% dos tiles livres ('.') a 4 tiles ou mais de qualquer posto", () => {
  const pct = [];
  each((lv) => {
    const a = A.analyze(lv.map), dots = A.tilesOf(lv.map, "."), far = dots.filter(([x, y]) => a.posts.every(([px, py]) => Math.max(Math.abs(x - px), Math.abs(y - py)) >= 4)).length;
    pct.push(Math.round(100 * far / dots.length));
    assert.ok(far >= 0.2 * dots.length, `só ${(100 * far / dots.length).toFixed(0)}%`);
  });
  return "menor fração: " + Math.min(...pct) + "%";
});

test("os 20 mapas são diferentes entre si e dos 20 do cachorrinho (sem o anel de fora: no máximo 60% de tiles iguais na mesma posição; tamanhos diferentes: 80% na janela comum)", () => {
  let worstSame = 0, worstWin = 0, ringWorst = 0;
  const check = (a, b, what) => {
    const same = A.sameSize(a, b), f = A.sameFraction(a, b);
    if (same) { worstSame = Math.max(worstSame, f); ringWorst = Math.max(ringWorst, A.sameFraction(a, b, true)); assert.ok(f <= 0.6, `${what}: ${(100 * f).toFixed(1)}% de tiles iguais`); } else { worstWin = Math.max(worstWin, f); assert.ok(f <= 0.8, `${what}: ${(100 * f).toFixed(1)}% iguais na janela comum`); }
    assert.notDeepStrictEqual(a, b, what + ": mapas idênticos");
  };
  for (let i = 0; i < 20; i++) {
    for (let j = i + 1; j < 20; j++) check(LEVELS[i].map, LEVELS[j].map, `Fase ${i + 1} x Fase ${j + 1} do Gatinho`);
    for (let j = 1; j <= 20; j++) check(LEVELS[i].map, DOG_MAPS[j], `Fase ${i + 1} do Gatinho x Fase ${j} do Cachorrinho`);
  }
  return `pior par do mesmo tamanho: ${(100 * worstSame).toFixed(1)}% (contando o anel: ${(100 * ringWorst).toFixed(1)}%); pior par de tamanhos diferentes: ${(100 * worstWin).toFixed(1)}% na janela comum`;
});

test("cada fase tem um desenho próprio: o desenho (paredes) de uma fase nunca é o de outra deslocado ou espelhado", () => {
  const flip = (m) => m.map((r) => [...r].reverse().join(""));
  const sig = (m) => m.map((r) => r.replace(/[^#]/g, ".")).join("\n");
  for (let i = 0; i < 20; i++) for (let j = i + 1; j < 20; j++) {
    if (!A.sameSize(LEVELS[i].map, LEVELS[j].map)) continue;
    assert.notStrictEqual(sig(LEVELS[i].map), sig(LEVELS[j].map), `Fases ${i + 1} e ${j + 1} têm as mesmas paredes`);
    assert.notStrictEqual(sig(LEVELS[i].map), sig(flip(LEVELS[j].map)), `Fases ${i + 1} e ${j + 1} são espelhos`);
  }
});

test("determinismo: o gerador (python3 tools/catmaze/gen_cat.py --all --json), rodado duas vezes, dá os mesmos 20 mapas de js/cat-levels.js", () => {
  const run = () => spawnSync("python3", [path.join(ROOT, "tools/catmaze/gen_cat.py"), "--all", "--json"], { encoding: "utf8", maxBuffer: 1 << 26, timeout: 280000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }); // (sem gravar __pycache__ dentro de tools/catmaze)
  const r1 = run();
  if (r1.error || r1.status === null) assert.fail("python3 não está disponível (ou demorou demais): o determinismo do gerador NÃO foi conferido. Este teste precisa de python3 (instale-o e rode de novo); sem ele não conta como passou.");
  assert.strictEqual(r1.status, 0, "o gerador falhou: " + (r1.stderr || "").slice(0, 300));
  const r2 = run();
  assert.strictEqual(r1.stdout, r2.stdout, "duas execuções deram mapas diferentes");
  assert.deepStrictEqual(JSON.parse(r1.stdout), LEVELS.map((l) => l.map), "o arquivo js/cat-levels.js não é o que o gerador produz (rode: python3 tools/catmaze/gen_cat.py --all --write)");
});

console.log("\n" + (failed ? `${failed} de ${total} testes FALHARAM` : `${total} de ${total} testes passaram`));
// tabela de distâncias (BFS) para o relatório: node tools/catmaze/cat_sim.js
if (process.argv.includes("--tabela")) require(path.join(__dirname, "../tools/catmaze/cat_sim.js"));
process.exit(failed ? 1 : 0);
