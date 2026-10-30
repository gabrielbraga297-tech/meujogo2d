// Testes das 20 músicas tema do GATINHO (js/music-cat.js), sem navegador. Uso: node tests/music-cat.test.js
// Confere a ESTRUTURA das receitas e das partituras com as ajudas de tests/music-rig.js (notas na escala, âmbito, laço, vozes, determinismo, temas distintos, rampa de andamento)
// e o perfil do bichinho (modos, compassos, solos, baixo e percussão, ambiências, camadas). Ninguém ouviu estas músicas: nada aqui mede se uma música "fica boa".
// O nível sonoro (RMS, pico, silêncio, emenda do laço) é conferido no render real: tools/music-render/render.js (veja docs/MUSICA.md).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const rig = require("./music-rig.js");
const { Music } = rig;
const CatLevels = require("../js/cat-levels.js");
require("../js/music-cat.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 5).join("\n     ") : e)); }
}
const SRC = fs.readFileSync(path.join(__dirname, "../js/music-cat.js"), "utf8");
const ids = Array.from({ length: 20 }, (_, i) => "cat" + (i + 1));
const recipes = ids.map((id) => Music.get(id));
const scores = recipes.map((r) => (r ? Music.score(r) : null));
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const distinct = (a) => new Set(a).size;
// correlação de Spearman entre a fase (1..n) e os valores (com empates pela média dos postos)
function spearman(values) {
  const rank = (v) => v.map((x) => v.filter((y) => y < x).length + (v.filter((y) => y === x).length - 1) / 2);
  const a = rank(values.map((_, i) => i)), b = rank(values), n = a.length, ma = mean(a), mb = mean(b);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
}
const perSecond = (s) => s.stats.count / s.lengthSeconds;
const meanLevel = (s) => mean(s.harmony.map((h) => h.level));
const sigBass = (r) => (r.voices.bass ? r.voices.bass.pattern : "nenhum");
const kitsOf = (r) => [].concat(r.voices.perc.kit === undefined ? "woodblock" : r.voices.perc.kit);   // a receita guardada é a escrita (kit pode ser um texto ou [grave, agudo])
// vozes que tocam em cada seção da forma
function layersBySection(s) {
  const per = Array.from({ length: s.form.length }, () => new Set());
  for (const e of s.events) per[Math.min(per.length - 1, Math.floor(e.t / (s.sectionBars * s.barBeats)))].add(e.voice);
  return per;
}

// ---------- Registro ----------
test("as 20 receitas cat1 a cat20 estão registradas, são válidas e são do gatinho", () => {
  assert.strictEqual(CatLevels.length, 20);
  for (const id of ids) {
    const r = Music.get(id);
    assert.ok(r, id + " não registrada");
    assert.strictEqual(r.id, id);
    assert.strictEqual(r.animal, "cat", id);
    assert.deepStrictEqual(Music.validate(r), [], id);
  }
  assert.strictEqual(new Set(Music.ids()).size, Music.ids().length, "ids únicos");
});
test("o lugar (place) de cada tema é exatamente o da fase em js/cat-levels.js", () => {
  recipes.forEach((r, i) => assert.strictEqual(r.place, CatLevels[i].place, `${r.id}: "${r.place}" x "${CatLevels[i].place}"`));
  assert.deepStrictEqual(recipes.map((r) => r.place), CatLevels.map((l) => l.place));
});
test("cat1 substitui o tema de exemplo de js/music.js (mesmo id, mesma posição) e o menu continua o primeiro", () => {
  const all = Music.ids();
  assert.strictEqual(all[0], "menu");
  assert.deepStrictEqual(all.slice(0, 4), ["menu", "dog1", "cat1", "bird1"].slice(0, 4).map((x) => (all.includes(x) ? x : "?")), "o registro posterior mantém a posição do exemplo");
  const c1 = Music.get("cat1");
  assert.strictEqual(c1.key, "G");
  assert.strictEqual(c1.beats, 3, "a Sala de estar é a valsa lenta");
  for (const id of ids) assert.ok(all.includes(id));
});
test("no navegador (sem require): music.js e depois music-cat.js registram os 20 temas em window.Music", () => {
  const ctx = vm.createContext({});
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../js/music.js"), "utf8"), ctx, { filename: "music.js" });
  vm.runInContext(SRC, ctx, { filename: "music-cat.js" });
  for (const id of ids) assert.strictEqual(ctx.Music.get(id).place, CatLevels[Number(id.slice(3)) - 1].place, id);
  assert.strictEqual(ctx.Music.get("cat1").key, "G", "o registro posterior substituiu o exemplo");
});
test("cada receita tem um comentário curto logo acima, com o número e o lugar da fase", () => {
  recipes.forEach((r, i) => {
    const m = new RegExp(`// ${i + 1} ${r.place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[:\\s][^\\n]*\\n(?:    //[^\\n]*\\n)*    \\{\\n      id: "${r.id}"`).exec(SRC);
    assert.ok(m, `${r.id}: falta o comentário "// ${i + 1} ${r.place}: ..." logo acima da receita`);
    assert.ok(m[0].split("\n").length >= 3, r.id + ": comentário curto demais");
  });
});

// ---------- Conferências estruturais (tests/music-rig.js) ----------
test("checkRecipe: nenhuma falha em nenhuma das 20 receitas (escala, âmbito, laço, vozes, silêncio, render no contexto falso)", () => {
  for (const r of recipes) assert.deepStrictEqual(rig.checkRecipe(r), [], r.id);
});
test("laço de 40 a 100 s em todos; compassos, andamento e duração batem com a partitura", () => {
  scores.forEach((s, i) => {
    assert.ok(s.lengthSeconds >= 40 && s.lengthSeconds <= 100, `${ids[i]}: ${s.lengthSeconds.toFixed(1)} s`);
    assert.ok(Math.abs(s.lengthSeconds - s.bars * s.barBeats * 60 / s.bpm) < 1e-9, ids[i]);
  });
});
test("determinismo: duas gerações iguais, e scoreOf devolve a mesma partitura; o código não usa Math.random nem relógio", () => {
  recipes.forEach((r, i) => {
    assert.strictEqual(JSON.stringify(Music.score(r)), JSON.stringify(scores[i]), r.id);
    assert.strictEqual(JSON.stringify(Music.scoreOf(r.id)), JSON.stringify(scores[i]), r.id);
  });
  for (const bad of ["Math.random", "Date.now", "performance.now", "new Date", "crypto"]) assert.ok(!SRC.includes(bad), bad);
});
test("no máximo 14 vozes ao mesmo tempo e quase nenhuma nota cortada pelo limite (<= 2%)", () => {
  scores.forEach((s, i) => {
    assert.ok(s.stats.maxPolyphony <= Music.MAX_VOICES, `${ids[i]}: ${s.stats.maxPolyphony} vozes`);
    assert.ok(s.stats.dropped <= 0.02 * (s.stats.count + s.stats.dropped), `${ids[i]}: ${s.stats.dropped} notas cortadas de ${s.stats.count + s.stats.dropped}`);
  });
});
test("todos os valores da partitura são finitos e as notas ficam em 24..108 (MIDI)", () => {
  for (const s of scores) for (const e of s.events) {
    assert.ok([e.t, e.d, e.v].every(Number.isFinite), s.id);
    if (e.midi !== null) assert.ok(Number.isInteger(e.midi) && e.midi >= 24 && e.midi <= 108, `${s.id} midi ${e.midi}`);
  }
});

// ---------- Temas distintos ----------
test("checkDistinct entre os 20 e também com o tema do menu: ninguém repete (tom, modo, andamento, solo, baixo) e as melodias diferem", () => {
  assert.deepStrictEqual(rig.checkDistinct(recipes), []);
  assert.deepStrictEqual(rig.checkDistinct(recipes.concat([Music.get("menu")])), []);
});
test("distinção mais estrita que a do rig: andamentos, (tom, modo), sementes, (solo, baixo) e formas com tamanho todos diferentes", () => {
  assert.strictEqual(distinct(recipes.map((r) => r.bpm)), 20, "andamentos repetidos");
  assert.strictEqual(distinct(recipes.map((r) => r.key + "|" + r.mode)), 20, "tom e modo repetidos");
  assert.strictEqual(distinct(recipes.map((r) => r.motif.seed)), 20, "sementes repetidas");
  assert.strictEqual(distinct(recipes.map((r) => r.voices.lead.inst + "|" + sigBass(r))), 20, "solo e baixo repetidos");
  assert.strictEqual(distinct(recipes.map((r) => r.form + "/" + r.bars)), 20, "formas repetidas");
  assert.ok(distinct(recipes.map((r) => r.form)) >= 18, "formas pouco variadas");
  const m = Music.get("menu");
  for (const r of recipes) assert.ok(!(r.key === m.key && r.mode === m.mode && r.bpm === m.bpm), r.id + " igual ao menu");
});
test("melodias: a maior semelhança entre dois temas (n-gramas de intervalo e duração) fica bem abaixo do limite de 0,35", () => {
  let worst = 0, who = "";
  for (let i = 0; i < 20; i++) for (let j = i + 1; j < 20; j++) {
    const s = rig.melodySimilarity(scores[i], scores[j]);
    if (s > worst) { worst = s; who = `${ids[i]}-${ids[j]}`; }
  }
  assert.ok(worst < 0.2, `${who} ${worst.toFixed(2)}`);
});

// ---------- Rampa ----------
test("checkTempoRamp: de 84 a 132 bpm, crescente em tendência (correlação >= 0,9) e a última 40 bpm acima da primeira", () => {
  assert.deepStrictEqual(rig.checkTempoRamp(recipes, { min: 80, max: 135, minRise: 40, minCorr: 0.9 }), []);
  assert.strictEqual(recipes[0].bpm, 84);
  assert.strictEqual(recipes[19].bpm, 132);
  assert.ok(mean(recipes.slice(15).map((r) => r.bpm)) - mean(recipes.slice(0, 5).map((r) => r.bpm)) >= 25);
});
test("densidade: notas por segundo e nível médio das camadas sobem das primeiras para as últimas fases", () => {
  const dens = scores.map(perSecond), lev = scores.map(meanLevel);
  assert.ok(spearman(dens) >= 0.5, "notas por segundo x fase: " + spearman(dens).toFixed(2));
  assert.ok(spearman(lev) >= 0.5, "nível médio x fase: " + spearman(lev).toFixed(2));
  assert.ok(mean(dens.slice(15)) >= 1.4 * mean(dens.slice(0, 5)), "últimas 5 fases pelo menos 40% mais densas que as 5 primeiras");
  assert.ok(mean(lev.slice(15)) >= mean(lev.slice(0, 5)) + 0.15, "nível médio");
});
test("fases-chave: 11 (cães rastreadores), 18 e 19 (noite) e 20 (final) têm as camadas mais cheias; a Sala de estar é das mais simples", () => {
  const lev = recipes.map((r) => r.intensity);
  for (const n of [11, 18, 19, 20]) assert.ok(lev[n - 1] >= 0.7, `fase ${n}: intensity ${lev[n - 1]}`);
  const sorted = lev.slice().sort((a, b) => a - b);
  for (const n of [11, 18, 19, 20]) assert.ok(lev[n - 1] >= sorted[12], `fase ${n} entre as mais cheias`);
  assert.ok(lev[0] <= sorted[3], "a Fase 1 está entre as 4 mais leves");
  assert.ok(Object.keys(scores[0].stats.byVoice).length <= 5, "Sala de estar sem arpejo nem ambiência");
  assert.ok(perSecond(scores[0]) < mean(scores.map(perSecond)), "Sala de estar mais rala que a média");
  for (const n of [11, 18, 19]) assert.ok(perSecond(scores[n - 1]) > perSecond(scores[0]), "fase " + n);
  // os temas de perigo terminam no ponto mais cheio: a última seção tem nível maior ou igual ao da primeira
  for (const n of [11, 18, 19, 20]) { const h = scores[n - 1].harmony; assert.ok(h[h.length - 2].level > h[0].level + 0.2, "fase " + n); }
});

// ---------- Perfil do gatinho ----------
test("modos variados (>= 5, entre eles dórico, menor, blues e frígio), tons variados e nenhum modo domina", () => {
  const modes = recipes.map((r) => r.mode);
  assert.ok(distinct(modes) >= 7, "modos: " + [...new Set(modes)].join(","));
  for (const m of ["dorian", "minor", "blues", "phrygian", "harmMinor"]) assert.ok(modes.includes(m), m);
  assert.ok(distinct(recipes.map((r) => r.key)) >= 10, "tons");
  const count = {};
  for (const m of modes) count[m] = (count[m] || 0) + 1;
  assert.ok(Math.max(...Object.values(count)) <= 4, "um modo aparece mais de 4 vezes: " + JSON.stringify(count));
  // a maioria do gatinho está em modos dórico/menor/blues/frígio/menor harmônico/pentatônica menor
  const dark = modes.filter((m) => ["dorian", "minor", "blues", "phrygian", "harmMinor", "pentMinor"].includes(m)).length;
  assert.ok(dark >= 12, "modos escuros/ambíguos: " + dark);
});
test("compassos: maioria 4/4 com swing, e também 3/4 (valsa) e 6/8", () => {
  const m = recipes.map((r) => r.beats);
  assert.ok(m.filter((b) => b === 4).length >= 12 && m.includes(3) && m.includes(6));
  assert.deepStrictEqual([1, 9, 17].map((n) => recipes[n - 1].beats), [3, 3, 3], "valsas: Sala, Parque e Praia");
  assert.deepStrictEqual([5, 14, 15].map((n) => recipes[n - 1].beats), [6, 6, 6], "6/8: Telhados, Riacho e Vila de pescadores");
  const sw = recipes.filter((r) => r.beats === 4 && r.swing >= 0.2).length;
  assert.ok(sw >= 10, "temas em 4/4 com swing >= 0,2: " + sw);
  assert.ok(distinct(recipes.map((r) => r.swing)) >= 8, "swing variado");
});
test("solos variados: >= 8 instrumentos de solo, vários timbres de gatinho (celesta, flauta, cordas beliscadas, contrabaixo) e alguns solos revezados", () => {
  const leads = recipes.map((r) => r.voices.lead.inst);
  assert.ok(distinct(leads) >= 8, [...new Set(leads)].join(","));
  for (const i of ["celesta", "flute", "pluck", "contrabass", "marimba"]) assert.ok(leads.includes(i), i);
  assert.ok(recipes.filter((r) => r.voices.lead.rotate).length >= 3, "solos revezados");
  assert.ok(distinct(recipes.map((r) => r.voices.lead.oct)) >= 3, "oitavas do solo");
});
test("baixo e percussão em todas as fases (inclusive nas 3 primeiras); contrabaixo pizzicato em vários temas; >= 6 padrões de baixo; >= 10 combinações de percussão", () => {
  for (const r of recipes) {
    assert.ok(r.voices.bass, r.id + " sem baixo");
    assert.ok(r.voices.perc, r.id + " sem percussão");
  }
  scores.forEach((s, i) => { assert.ok(s.stats.byVoice.bass > 0 && s.stats.byVoice.perc > 0, ids[i] + " baixo/percussão sem notas"); });
  assert.ok(recipes.filter((r) => r.voices.bass.inst === "contrabass").length >= 6, "contrabaixo pizzicato");
  assert.ok(distinct(recipes.map(sigBass)) >= 6, "padrões de baixo: " + [...new Set(recipes.map(sigBass))].join(","));
  const kits = recipes.map((r) => JSON.stringify(kitsOf(r)) + r.voices.perc.pattern);
  assert.ok(distinct(kits) >= 10, "combinações de percussão: " + distinct(kits));
  assert.ok(recipes.filter((r) => kitsOf(r).includes("brush")).length >= 4, "escovas");
});
test("síncopas e silêncios: os motivos têm pausas (rests) e ritmo próprio; as primeiras frases respiram mais que as do final", () => {
  for (const r of recipes) assert.ok(r.motif.rests >= 0.1, r.id);
  assert.ok(recipes.filter((r) => r.motif.rhythm).length === 20, "ritmos escritos à mão");
  assert.ok(mean(recipes.slice(0, 10).map((r) => r.motif.rests)) >= mean(recipes.slice(10).map((r) => r.motif.rests)) - 0.05);
  // existe síncope: algum padrão com pausa "." ou nota depois de segurar fora do tempo forte
  const patterns = recipes.flatMap((r) => [].concat(Array.isArray(r.motif.rhythm) ? r.motif.rhythm : Object.values(r.motif.rhythm).flat()));
  assert.ok(patterns.filter((p) => p.includes(".")).length >= 4, "padrões com pausa escrita");
});
test("lugares: ambiências certas (Peixaria e Riacho com água, Praia com vento, Noite com grilos, Mercado à noite com chuva) e instrumentos do clima", () => {
  const amb = (n) => (recipes[n - 1].voices.ambience ? recipes[n - 1].voices.ambience.kind : null);
  assert.strictEqual(amb(8), "water"); assert.strictEqual(amb(14), "water");
  assert.strictEqual(amb(17), "wind"); assert.strictEqual(amb(18), "crickets"); assert.strictEqual(amb(19), "rain");
  assert.ok(["wind", null].includes(amb(5)), "Telhados: vento leve ou nada");
  for (const n of [8, 14, 17, 18, 19]) assert.ok(scores[n - 1].stats.byVoice.amb > 0, "fase " + n + " sem ambiência tocando");
  assert.strictEqual(distinct(recipes.map((r) => amb(Number(r.id.slice(3))))), 5, "ambiências: nenhuma, água, vento, grilos, chuva");
  // Cozinha: bloco de madeira e síncope
  assert.ok(kitsOf(recipes[1]).includes("woodblock") && recipes[1].voices.bass.pattern === "sync");
  // Telhados: leveza (sino, 6/8, percussão esparsa) e suspense (menor harmônico)
  assert.ok(recipes[4].voices.lead.inst === "bell" && recipes[4].mode === "harmMinor" && recipes[4].voices.perc.pattern === "sparse");
  // Fase 20: maior, calorosa, solo que revezando os timbres da casa
  assert.ok(recipes[19].mode === "major" && recipes[19].voices.lead.rotate && recipes[19].voices.lead.rotate.length >= 3);
  // Fase 11 e noites: sem vento nem grilos fora do clima (grilos só na Fase 18)
  assert.deepStrictEqual(recipes.filter((r) => r.voices.ambience && r.voices.ambience.kind === "crickets").map((r) => r.id), ["cat18"]);
});
test("formas variadas (>= 15 diferentes, 2 a 6 seções), seções de 8 a 16 compassos e todas as camadas declaradas tocam em algum trecho", () => {
  assert.ok(distinct(recipes.map((r) => r.form)) >= 15);
  for (const s of scores) { assert.ok(s.form.length >= 2 && s.form.length <= 6, s.id); assert.ok(s.sectionBars >= 8 && s.sectionBars <= 16, s.id + " seção de " + s.sectionBars); }
  assert.ok(scores.some((s) => s.form.length === 6) && scores.some((s) => s.form.length === 2) && scores.some((s) => s.form.length === 3));
  scores.forEach((s, i) => {
    const v = recipes[i].voices;
    for (const [k, voice] of [["counter", "counter"], ["pad", "pad"], ["arp", "arp"], ["perc", "perc"], ["ambience", "amb"]]) if (v[k]) assert.ok(s.stats.byVoice[voice] > 0, `${ids[i]}: ${k} nunca toca`);
  });
  // camadas por seção: a seção mais cheia tem mais vozes que a primeira (A, a mais leve) na maioria dos temas, e nunca menos
  let grows = 0;
  for (const s of scores) {
    const per = layersBySection(s).map((x) => x.size);
    assert.ok(Math.max(...per) >= per[0], s.id);
    if (Math.max(...per) > per[0]) grows++;
  }
  assert.ok(grows >= 15, "camadas crescem nas seções em " + grows + " temas");
});
test("honestidade: o código e os comentários não afirmam que a música foi ouvida nem que soa bem", () => {
  for (const bad of [/soa bem/i, /agrad[aá]vel/i, /foi ouvid/i, /ouvimos/i, /ficou (lindo|bonito|bom)/i, /\bA6\b/, /\bwip\b/i, /\bagente\b/i, /\bfrente\b/i]) assert.ok(!bad.test(SRC), String(bad));
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes das músicas do gatinho passaram");
process.exit(failed ? 1 : 0);
