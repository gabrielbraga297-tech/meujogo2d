// Testes das 20 músicas tema do Cachorrinho (js/music-dog.js), sem navegador, com o AudioContext falso de tests/music-rig.js. Uso: node tests/music-dog.test.js
// Cobre: as 20 receitas registradas (ids, bichinho, lugar igual ao de js/themes.js), as conferências estruturais de cada uma (checkRecipe: escala, âmbito, laço, vozes, nós),
// temas distintos entre si e do menu, rampa de andamento e de densidade, o perfil do bichinho (modos, compassos, solos, baixo e percussão), o clima de cada lugar-chave e o determinismo.
// O que NÃO dá para conferir aqui: como as músicas soam (ninguém as ouviu). A medida de pico, volume, silêncio e emenda do laço é do render real (tools/music-render/render.js).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const rig = require("./music-rig.js");
const { Music } = rig;
const dogFile = require("../js/music-dog.js");
const Themes = require("../js/themes.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const SRC = fs.readFileSync(path.join(__dirname, "../js/music-dog.js"), "utf8");
const N = 20;
const ids = Array.from({ length: N }, (_, i) => "dog" + (i + 1));
const recipes = ids.map((id) => Music.get(id));
const scores = recipes.map((r) => Music.score(r));
const lead = (r) => r.voices.lead.inst;
const bassPat = (r) => (r.voices.bass ? r.voices.bass.pattern : null);
const percPat = (r) => (r.voices.perc ? r.voices.perc.pattern : null);
const count = (arr) => arr.reduce((m, x) => { m[x] = (m[x] || 0) + 1; return m; }, {});
const spearman = (xs, ys) => {
  const rank = (v) => v.map((x) => { const less = v.filter((y) => y < x).length, eq = v.filter((y) => y === x).length; return less + (eq - 1) / 2; });
  const a = rank(xs), b = rank(ys), n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  return num / Math.sqrt(da * db);
};

// ---------- Registro ----------
test("registro: as 20 receitas entram sem erro e substituem o exemplo dog1 do motor", () => {
  assert.deepStrictEqual(dogFile.result.errors, [], "receita inválida: " + JSON.stringify(dogFile.result.errors));
  assert.deepStrictEqual(dogFile.result.ok, ids);
  assert.strictEqual(dogFile.recipes.length, N);
  for (const id of ids) assert.strictEqual(Music.ids().filter((x) => x === id).length, 1, id + " aparece uma vez em Music.ids()");
  assert.ok(recipes.every(Boolean), "Music.get devolve as 20 receitas");
  assert.ok(recipes[0].key === "C" && recipes[0].mode === "major", "dog1 é o tema de verdade (Dó maior), não o exemplo do motor (Sol mixolídio)");
  assert.ok(Music.get("menu") && Music.get("cat1") && Music.get("bird1"), "os outros temas do motor continuam lá");
});
test("registro: id, bichinho e o lugar igual ao de js/themes.js", () => {
  recipes.forEach((r, i) => {
    assert.strictEqual(r.id, "dog" + (i + 1));
    assert.strictEqual(r.animal, "dog", r.id + ": animal");
    const place = Themes.of(i + 1, "dog").place;
    assert.ok(typeof place === "string" && place.length > 0, "a fase " + (i + 1) + " precisa de lugar em themes.js");
    assert.strictEqual(r.place, place, `${r.id}: place "${r.place}" deveria ser "${place}"`);
  });
});
test("cada receita tem um comentário curto logo acima, começando pelo número e pelo lugar", () => {
  const lines = SRC.split("\n");
  recipes.forEach((r, i) => {
    const at = lines.findIndex((l) => l.includes(`id: "${r.id}"`));
    assert.ok(at > 1, r.id + " não achado no arquivo");
    let k = at - 1;
    while (k > 0 && !lines[k].trim().startsWith("//")) k--; // sobe da chave "{" até o último comentário
    let first = k;
    while (first > 0 && lines[first - 1].trim().startsWith("//")) first--;
    assert.ok(lines[first].trim().startsWith(`// ${i + 1} ${r.place}`), `${r.id}: o comentário deveria começar com "// ${i + 1} ${r.place}" (achei "${lines[first].trim().slice(0, 40)}")`);
    assert.ok(k - first >= 1, r.id + ": comentário de pelo menos 2 linhas (lugar, clima e técnica)");
  });
});

// ---------- Conferências estruturais de cada receita ----------
for (const r of recipes) {
  test(`${r.id} (${r.place}): checkRecipe sem falhas`, () => {
    const fails = rig.checkRecipe(r);
    assert.deepStrictEqual(fails, [], fails.join("\n     "));
  });
}
test("laço de 40 a 100 s, até 14 vozes e quase nenhuma nota cortada pelo limite de vozes", () => {
  scores.forEach((s, i) => {
    assert.ok(s.lengthSeconds >= 40 && s.lengthSeconds <= 100, `${ids[i]}: laço de ${s.lengthSeconds.toFixed(1)} s`);
    assert.ok(s.stats.maxPolyphony <= Music.MAX_VOICES, `${ids[i]}: ${s.stats.maxPolyphony} vozes`);
    assert.ok(s.stats.dropped <= Math.ceil(s.stats.count * 0.02), `${ids[i]}: ${s.stats.dropped} de ${s.stats.count} notas cortadas pelo limite de vozes (a receita está carregada demais)`);
  });
});
test("determinismo: duas gerações da mesma receita são idênticas e o arquivo não usa Math.random nem o relógio", () => {
  recipes.forEach((r, i) => assert.strictEqual(JSON.stringify(Music.score(r)), JSON.stringify(scores[i]), r.id));
  assert.ok(!/Math\.random|Date\.now|performance\.now|new Date/.test(SRC), "composição sem aleatório do sistema nem relógio");
});

// ---------- Distinção entre os temas ----------
test("temas distintos: checkDistinct entre os 20 e entre os 20 e o menu", () => {
  assert.deepStrictEqual(rig.checkDistinct(recipes), []);
  const withMenu = rig.checkDistinct(recipes.concat([Music.get("menu")]));
  assert.deepStrictEqual(withMenu, []);
});
test("temas distintos, mais estrito: andamento, sementes e tom+modo nunca se repetem; solo+baixo+percussão também não", () => {
  const uniq = (list, what) => { const c = count(list); const rep = Object.keys(c).filter((k) => c[k] > 1); assert.deepStrictEqual(rep, [], `${what} repetido(s): ${rep.join(", ")}`); };
  uniq(recipes.map((r) => r.bpm), "andamento");
  uniq(recipes.map((r) => r.motif.seed), "semente do motivo");
  uniq(recipes.map((r) => r.key + " " + r.mode), "tom e modo");
  uniq(recipes.map((r) => [lead(r), bassPat(r), voicesKit(r), percPat(r)].join("|")), "solo, baixo e percussão");
  uniq(recipes.map((r) => JSON.stringify(r.motif.rhythm)), "ritmo do motivo");
});
test("fases vizinhas não repetem tom, padrão do baixo nem padrão da percussão", () => {
  for (let i = 1; i < N; i++) {
    const a = recipes[i - 1], b = recipes[i];
    assert.notStrictEqual(a.key, b.key, `${a.id} e ${b.id} no mesmo tom`);
    assert.notStrictEqual(bassPat(a), bassPat(b), `${a.id} e ${b.id} com o mesmo padrão de baixo`);
    assert.notStrictEqual(percPat(a), percPat(b), `${a.id} e ${b.id} com o mesmo padrão de percussão`);
    assert.notStrictEqual(a.mode + a.bpm, b.mode + b.bpm);
  }
});
function voicesKit(r) { return r.voices.perc ? [].concat(r.voices.perc.kit).join("+") : "-"; }

// ---------- Rampa ----------
test("rampa de andamento: de 92 a 148 bpm, crescente em tendência, a 20 é a mais rápida", () => {
  assert.deepStrictEqual(rig.checkTempoRamp(recipes, { min: 92, max: 148 }), []);
  assert.strictEqual(recipes[0].bpm, 92);
  assert.strictEqual(recipes[N - 1].bpm, 148);
  assert.strictEqual(Math.max(...recipes.map((r) => r.bpm)), recipes[N - 1].bpm);
  assert.strictEqual(Math.min(...recipes.map((r) => r.bpm)), recipes[0].bpm);
  // a fase 9 (praia) é leve: não passa do andamento das vizinhas mais lentas
  assert.ok(recipes[8].bpm < recipes[9].bpm && recipes[8].bpm <= recipes[7].bpm, "praia mais calma que a fase seguinte");
});
test("rampa de densidade: notas por segundo crescem com as fases (correlação >= 0,6) e a 20 passa de 2x a 1", () => {
  const dens = scores.map((s) => s.events.filter((e) => e.voice !== "amb").length / s.lengthSeconds);
  const rho = spearman(ids.map((_, i) => i), dens);
  assert.ok(rho >= 0.6, `correlação ${rho.toFixed(2)}`);
  assert.ok(dens[N - 1] >= 2 * dens[0], `fase 20 ${dens[N - 1].toFixed(1)} notas/s contra ${dens[0].toFixed(1)} na fase 1`);
  assert.ok(dens.slice(0, 5).every((d) => d < dens[N - 1]), "as 5 primeiras são mais ralas que a última");
});
test("intensidade das camadas: a fase 1 é a mais leve, a 20 a mais cheia, e a tendência é de alta", () => {
  const inten = recipes.map((r) => r.intensity);
  assert.strictEqual(Math.min(...inten), inten[0]);
  assert.strictEqual(Math.max(...inten), inten[N - 1]);
  assert.ok(spearman(ids.map((_, i) => i), inten) >= 0.5, "intensidade cresce com as fases");
  const nVoices = (r) => Object.keys(r.voices).filter((k) => r.voices[k]).length;
  assert.ok(nVoices(recipes[0]) <= 4, "fase 1 simples: no máximo solo, contramelodia, baixo e percussão");
  assert.ok(nVoices(recipes[N - 1]) >= 5, "fase 20 com muitas camadas");
});

// ---------- Perfil do bichinho ----------
test("perfil: pelo menos 5 modos diferentes, e os modos de urgência estão nas fases de perigo (10, 11, 18 e 20)", () => {
  const modes = new Set(recipes.map((r) => r.mode));
  assert.ok(modes.size >= 5, "modos: " + Array.from(modes).join(", "));
  for (const n of [10, 11, 18, 20]) assert.ok(["minor", "dorian", "phrygian", "harmMinor"].includes(recipes[n - 1].mode), `fase ${n}: ${recipes[n - 1].mode} não é um modo de urgência`);
  const bright = recipes.slice(0, 9).filter((r) => ["major", "mixolydian", "lydian", "pentMajor"].includes(r.mode));
  assert.strictEqual(bright.length, 9, "as 9 primeiras fases ficam em modos alegres (maior, mixolídio, lídio, pentatônica maior)");
});
test("perfil: pelo menos 2 compassos diferentes (4/4, 3/4 e 6/8) e a valsa na Casa (fase 3)", () => {
  const metres = new Set(recipes.map((r) => r.beats));
  assert.ok(metres.size >= 2 && metres.has(3) && metres.has(6) && metres.has(4), "compassos: " + Array.from(metres).join(", "));
  assert.strictEqual(recipes[2].beats, 3, "a Casa é uma valsa em 3/4");
  assert.ok(recipes.filter((r) => r.beats === 4).length >= 14, "a maioria em 4/4");
});
test("perfil: solos variados (pelo menos 7 instrumentos diferentes) e timbres do cachorrinho nas primeiras fases", () => {
  const leads = new Set(recipes.map(lead));
  assert.ok(leads.size >= 7, "solos: " + Array.from(leads).join(", "));
  const all = new Set();
  for (const r of recipes) { all.add(lead(r)); for (const x of r.voices.lead.rotate || []) all.add(x.inst || lead(r)); }
  assert.ok(all.size >= 9, "timbres de solo contando os revezamentos: " + Array.from(all).join(", "));
  for (const r of recipes.slice(0, 8)) assert.ok(["xylo", "marimba", "pluck", "celesta", "flute", "harp", "organ"].includes(lead(r)), `${r.id}: solo ${lead(r)} fora do estilo do cachorrinho`);
  const c = count(recipes.map(lead));
  assert.ok(Math.max(...Object.values(c)) <= 5, "nenhum solo domina (no máximo 5 temas com o mesmo solo): " + JSON.stringify(c));
});
test("perfil: baixo e percussão em todas as fases (inclusive as primeiras), com vários padrões", () => {
  recipes.forEach((r, i) => {
    assert.ok(r.voices.bass, `${r.id}: sem baixo`);
    assert.ok(r.voices.perc, `${r.id}: sem percussão`);
    assert.ok(scores[i].stats.byVoice.bass > 0 && scores[i].stats.byVoice.perc > 0, `${r.id}: baixo ou percussão sem nenhuma nota`);
  });
  assert.ok(new Set(recipes.map(bassPat)).size >= 6, "padrões de baixo: " + Array.from(new Set(recipes.map(bassPat))).join(", "));
  assert.ok(new Set(recipes.map(percPat)).size >= 8, "padrões de percussão: " + Array.from(new Set(recipes.map(percPat))).join(", "));
  assert.ok(recipes.filter((r) => bassPat(r) === "walk").length >= 4, "baixo caminhante em várias fases");
  assert.ok(recipes.some((r) => [].concat(r.voices.perc.kit).includes("woodblock")), "bloco de madeira");
  const kits = new Set(); recipes.forEach((r) => [].concat(r.voices.perc.kit).forEach((k) => kits.add(k)));
  assert.ok(kits.size >= 4, "kits de percussão: " + Array.from(kits).join(", "));
});
test("perfil: formas, tamanhos e vozes variados", () => {
  assert.ok(new Set(recipes.map((r) => r.form)).size >= 8, "formas: " + Array.from(new Set(recipes.map((r) => r.form))).join(", "));
  assert.ok(new Set(recipes.map((r) => r.bars)).size >= 4, "tamanhos (compassos): " + Array.from(new Set(recipes.map((r) => r.bars))).join(", "));
  assert.ok(new Set(recipes.map((r) => r.motif.contour)).size >= 5, "os 5 contornos aparecem");
  assert.ok(new Set(recipes.map((r) => r.swing)).size >= 8, "balanço (swing) variado");
  assert.ok(recipes.filter((r) => r.voices.pad).length >= 4 && recipes.filter((r) => r.voices.arp).length >= 6 && recipes.filter((r) => r.voices.counter).length >= 14, "camadas de fundo, arpejo e contramelodia em várias fases");
  assert.ok(recipes.filter((r) => r.voices.lead.rotate && r.voices.lead.rotate.length > 1).length >= 10, "revezamento de timbres no solo em várias fases");
  assert.ok(new Set(recipes.map((r) => JSON.stringify(r.prog))).size === N, "cada tema tem a sua progressão");
});

// ---------- O clima de cada lugar-chave ----------
test("clima: Quintal simples e suave, Praia ensolarada com vento, Bosque com vento, Lago com água, Telhados à noite com grilos", () => {
  const amb = (n) => (recipes[n - 1].voices.ambience ? recipes[n - 1].voices.ambience.kind : null);
  assert.strictEqual(recipes[0].place, "Quintal");
  assert.ok(recipes[0].intensity <= 0.45 && recipes[0].voices.lead.inst === "marimba" && !recipes[0].voices.pad && !recipes[0].voices.arp && !recipes[0].voices.ambience, "fase 1 só com solo, contramelodia, baixo e percussão");
  assert.ok(recipes[0].motif.leaps <= 0.3, "fase 1: poucos saltos");
  assert.ok(["wind", "water"].includes(amb(9)) && recipes[8].voices.ambience.vel <= 0.4, "praia: vento ou água bem baixos");
  assert.ok(["major", "mixolydian", "lydian", "pentMajor"].includes(recipes[8].mode), "praia num modo claro");
  assert.ok(["crickets", "wind"].includes(amb(14)) && recipes[13].voices.ambience.vel <= 0.4, "bosque: grilos ou vento baixos");
  assert.strictEqual(amb(15), "water", "lago: água");
  assert.strictEqual(amb(18), "crickets", "telhados à noite: grilos");
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 16, 17, 19, 20]) assert.strictEqual(amb(n), null, `fase ${n}: sem ambiência`);
  assert.strictEqual(recipes[17].beats, 3, "telhados à noite em valsa veloz (3/4)");
  assert.strictEqual(recipes[14].beats, 6, "lago em 6/8");
  assert.strictEqual(recipes[5].beats, 6, "praça em 6/8");
});
test("clima: fases de perigo são sérias (menor, frígio ou menor harmônico), mais rápidas que a média das 9 primeiras e com percussão marcante", () => {
  const avgFirst9 = recipes.slice(0, 9).reduce((s, r) => s + r.bpm, 0) / 9;
  for (const n of [10, 11, 18, 20]) {
    const r = recipes[n - 1];
    assert.ok(r.bpm > avgFirst9 + 10, `${r.id}: ${r.bpm} bpm não passa da média das 9 primeiras (${avgFirst9.toFixed(0)}) por 10`);
    assert.ok(r.voices.perc && r.voices.perc.vel >= 0.35, `${r.id}: percussão fraca`);
  }
  assert.strictEqual(recipes[9].voices.perc.pattern, "heartbeat", "central da carrocinha: batida de coração");
  assert.ok(recipes[9].voices.bass.pattern === "pedal" && recipes[10].voices.bass.pattern === "pizz", "central com baixo sustentado e beco com pizzicato");
});
test("clima: a fase 20 é o final grande (a mais rápida, a mais intensa e a que tem mais notas)", () => {
  const r = recipes[N - 1], s = scores[N - 1];
  assert.strictEqual(r.place, "Fortaleza da carrocinha");
  assert.strictEqual(Math.max(...scores.map((x) => x.stats.count)), s.stats.count, "a 20 tem mais notas que qualquer outra");
  assert.ok(r.voices.pad && r.voices.arp && r.voices.perc && r.voices.bass, "todas as camadas de fundo");
  assert.ok(r.voices.lead.rotate && r.voices.lead.rotate.length >= 3, "solo com 3 timbres revezando");
  // cada seção da 20 tem melodia e os níveis das seções passam de 0,6 (todas as camadas)
  const levels = s.harmony.filter((h, i) => i % s.sectionBars === 0).map((h) => h.level);
  assert.ok(levels.every((l) => l >= 0.55), "todas as seções com camadas cheias: " + levels.join(", "));
});
test("camadas: a seção A é mais leve que B e C (nível), e nenhuma voz declarada fica muda", () => {
  recipes.forEach((r, i) => {
    const s = scores[i], level = (l) => s.harmony.find((h) => h.letter === l);
    if (level("A") && level("B")) assert.ok(level("A").level < level("B").level, `${r.id}: A mais leve que B`);
    if (level("A") && level("C")) assert.ok(level("A").level < level("C").level, `${r.id}: A mais leve que C`);
    for (const [k, v] of [["counter", "counter"], ["pad", "pad"], ["arp", "arp"], ["perc", "perc"], ["ambience", "amb"]]) if (r.voices[k]) assert.ok(s.stats.byVoice[v] > 0, `${r.id}: ${k} sem notas`);
  });
});

// ---------- Texto ----------
test("honestidade: o arquivo não promete como a música soa nem cita fontes", () => {
  assert.ok(!/soa bem|soam bem|agrad[aá]vel|foi ouvid|foram ouvid|ficou lind|bonita|maravilhos|et al\.|doi\.org|\((19|20)\d\d\)/i.test(SRC), "texto com promessa de como soa ou citação");
  assert.ok(/ninguém ouviu/i.test(SRC), "o cabeçalho diz que ninguém ouviu os temas");
  assert.ok(!/\b(wip|agente|frente|A6)\b/i.test(SRC), "sem rótulos internos de trabalho");
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes das músicas do Cachorrinho passaram");
process.exit(failed ? 1 : 0);
