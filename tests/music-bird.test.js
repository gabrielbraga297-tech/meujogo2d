// Testes das 20 músicas tema do Passarinho (js/music-bird.js), sem navegador, com o AudioContext falso de tests/music-rig.js. Uso: node tests/music-bird.test.js
// Cobre: as 20 receitas registradas (ids, lugar igual ao de js/bird-levels.js), as conferências estruturais de cada uma (notas na escala, âmbito, laço de 40 a 100 s, laço que fecha,
// vozes <= 14, render no contexto falso), temas distintos entre si e do menu, rampa de andamento, perfil do conjunto (modos, compassos, solos, ambiências, camadas) e determinismo.
// O que NÃO é conferido aqui: como as músicas soam (ninguém as ouviu); o pico, o RMS e a emenda do laço são medidos no render real (tools/music-render/render.js).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const rig = require("./music-rig.js");
const { Music } = rig;
const BIRD_LEVELS = require("../js/bird-levels.js");
require("../js/music-bird.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const SRC = fs.readFileSync(path.join(__dirname, "../js/music-bird.js"), "utf8");
const IDS = Array.from({ length: 20 }, (_, i) => "bird" + (i + 1));
const R = IDS.map((id) => Music.get(id));       // receitas na ordem das fases
const S = {};                                    // partituras por id
for (const id of IDS) if (Music.get(id)) { try { S[id] = Music.score(id); } catch { /* o teste de validade mostra o motivo */ } }
const meterName = (r) => (r.beats === 6 ? "6/8" : r.beats === 3 ? "3/4" : "4/4");
const leadInst = (r) => r.voices.lead.inst;
const ambOf = (r) => (r.voices.ambience ? (typeof r.voices.ambience === "string" ? r.voices.ambience : r.voices.ambience.kind) : null);

// ---------- Registro ----------
test("as 20 receitas bird1 a bird20 estão registradas, na ordem das fases, com animal bird", () => {
  assert.deepStrictEqual(IDS.filter((id) => !Music.get(id)), [], "ids sem receita");
  const mine = Music.ids().filter((id) => /^bird\d+$/.test(id));
  assert.deepStrictEqual(mine, IDS, "os ids bird* registrados são exatamente bird1 a bird20, em ordem");
  for (const r of R) assert.strictEqual(r.animal, "bird", r.id);
});
test("o arquivo registra pelo contrato: sem erro de receita (validate vazio) e sem registrar nada além de bird1 a bird20", () => {
  for (const r of R) assert.deepStrictEqual(Music.validate(r), [], r.id);
  // um registro novo com as mesmas receitas devolve ok = 20 ids e nenhum erro
  const res = Music.register(R.map((r) => JSON.parse(JSON.stringify(r))));
  assert.deepStrictEqual(res.errors, []);
  assert.deepStrictEqual(res.ok, IDS);
});
test("o lugar (place) de cada tema é igual ao de js/bird-levels.js, fase a fase", () => {
  assert.strictEqual(BIRD_LEVELS.length, 20);
  BIRD_LEVELS.forEach((lv, i) => { assert.strictEqual(R[i].place, lv.place, `Fase ${i + 1}`); assert.strictEqual(R[i].id, "bird" + lv.id, "id da fase"); });
});
test("o tema bird1 deste arquivo substitui o de exemplo do motor (mesma posição na lista, receita própria)", () => {
  const motor = fs.readFileSync(path.join(__dirname, "../js/music.js"), "utf8");
  const exemplo = /id: "bird1"[\s\S]*?seed: (\d+)/.exec(motor);
  assert.ok(exemplo, "o exemplo de bird1 existe em js/music.js");
  assert.notStrictEqual(R[0].motif.seed, Number(exemplo[1]), "bird1 deste arquivo tem semente própria");
  assert.ok(Music.ids().indexOf("bird1") >= 0 && Music.ids().indexOf("bird1") < Music.ids().indexOf("bird2"), "bird1 vem antes de bird2");
});

// ---------- Conferências estruturais de cada receita ----------
for (const id of IDS) {
  test(`${id} (${(Music.get(id) || {}).place}): checkRecipe sem falhas (escala, âmbito, laço 40-100 s, fecha o laço, vozes, render falso)`, () => {
    const r = Music.get(id);
    assert.ok(r, "receita registrada");
    const fails = rig.checkRecipe(r);
    assert.deepStrictEqual(fails, []);
  });
}
test("cada tema: laço entre 40 e 100 s, nenhuma nota cortada pelo limite de vozes, no máximo 14 vozes ao mesmo tempo", () => {
  for (const id of IDS) {
    const s = S[id];
    assert.ok(s.lengthSeconds >= 40 && s.lengthSeconds <= 100, `${id}: laço de ${s.lengthSeconds.toFixed(1)} s`);
    assert.strictEqual(s.stats.dropped, 0, `${id}: ${s.stats.dropped} nota(s) cortada(s) pelo limite de vozes`);
    assert.ok(s.stats.maxPolyphony <= Music.MAX_VOICES && Music.polyphony(s) <= Music.MAX_VOICES, `${id}: vozes demais`);
  }
});
test("cada tema: todos os instrumentos pedidos existem e a melodia usa o que a receita pede (o solo e os revezamentos)", () => {
  for (const r of R) {
    const used = new Set(S[r.id].events.filter((e) => e.voice === "lead").map((e) => e.inst));
    const wanted = new Set([leadInst(r), ...((r.voices.lead.rotate || []).map((x) => x.inst || leadInst(r)))]);
    for (const u of used) assert.ok(wanted.has(u), `${r.id}: a melodia usa ${u}, que a receita não pede`);
    assert.ok(used.has(leadInst(r)) || (r.voices.lead.rotate || []).length, `${r.id}: o instrumento do solo não aparece`);
  }
});

// ---------- Distintos, rampa ----------
test("os 20 temas são distintos: ninguém repete (tom, modo, andamento, solo, baixo) e as melodias são diferentes (similaridade < 0,35)", () => {
  assert.deepStrictEqual(rig.checkDistinct(R), []);
});
test("distintos também do tema do menu", () => {
  assert.deepStrictEqual(rig.checkDistinct(R.concat([Music.get("menu")])), []);
});
test("nenhuma dupla de temas tem o mesmo tom E modo, o mesmo andamento ou a mesma semente de motivo", () => {
  const seen = (f) => { const m = new Map(); for (const r of R) { const k = f(r); assert.ok(!m.has(k), `${r.id} e ${m.get(k)} repetem ${k}`); m.set(k, r.id); } };
  seen((r) => r.key + " " + r.mode);
  seen((r) => "andamento " + r.bpm);
  seen((r) => "semente " + r.motif.seed);
});
test("rampa de andamento: de 76 bpm (Fase 1) a 128 bpm (Fase 20), crescente em tendência", () => {
  assert.deepStrictEqual(rig.checkTempoRamp(R, { min: 70, max: 135 }), []);
  assert.strictEqual(R[0].bpm, 76);
  assert.strictEqual(R[19].bpm, 128);
  assert.strictEqual(Math.max(...R.map((r) => r.bpm)), 128, "o final é o tema mais rápido");
  // a rampa quebra de propósito só no entardecer (18) e na noite (19), que desaceleram
  const dips = R.map((r, i) => (i > 0 && r.bpm < R[i - 1].bpm ? i + 1 : 0)).filter(Boolean);
  assert.deepStrictEqual(dips, [18], "a única queda de andamento de uma fase para a seguinte é a Fase 18 (entardecer)");
  assert.ok(R[17].bpm < R[16].bpm - 20 && R[18].bpm < R[16].bpm - 20, "18 e 19 bem mais lentas que a 17");
  const first5 = R.slice(0, 5).map((r) => r.bpm), mid = R.slice(10, 17).map((r) => r.bpm);
  assert.ok(Math.max(...first5) < Math.min(...mid), "as 5 primeiras fases são mais lentas que as fases 11 a 17");
});
test("camadas: a quantidade de camadas (intensity) cresce da Fase 1 à 20 em tendência, com o fim mais cheio e a noite (19) a mais vazia", () => {
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const inten = R.map((r) => r.intensity);
  assert.ok(avg(inten.slice(0, 5)) < avg(inten.slice(5, 10)) && avg(inten.slice(5, 10)) < avg(inten.slice(10, 17)), "médias crescentes por faixa de fases");
  assert.strictEqual(Math.max(...inten), inten[19], "a Fase 20 é a mais cheia");
  assert.strictEqual(Math.min(...inten), inten[18], "a Fase 19 (noite) é a mais vazia");
  // densidade real: notas por segundo da primeira faixa contra a última
  const dens = (r) => S[r.id].events.length / S[r.id].lengthSeconds;
  assert.ok(avg(R.slice(0, 4).map(dens)) < avg(R.slice(14, 17).map(dens)) && dens(R[19]) > avg(R.slice(0, 4).map(dens)) * 1.5, "mais notas por segundo no fim");
});

// ---------- Perfil do conjunto ----------
test("perfil: pelo menos 5 modos diferentes (são 9), com maiores e menores nos lugares certos", () => {
  const modes = new Set(R.map((r) => r.mode));
  assert.ok(modes.size >= 5, "modos: " + [...modes].join(","));
  for (const m of ["pentMajor", "lydian", "major", "mixolydian", "dorian", "minor", "phrygian", "harmMinor", "pentMinor"]) assert.ok(modes.has(m), "falta o modo " + m);
  // tensão a partir da Fase 11 (gaviões): pelo menos 5 das fases 11 a 14 e 16 a 19 em modo escuro
  const dark = new Set(["minor", "dorian", "phrygian", "harmMinor", "pentMinor"]);
  const n = [11, 12, 13, 14, 16, 18, 19].filter((f) => dark.has(R[f - 1].mode)).length;
  assert.ok(n >= 6, "fases escuras entre 11 e 19: " + n);
  assert.strictEqual(R[10].mode, "minor", "11: a chegada dos gaviões é em modo menor");
  assert.strictEqual(R[17].mode, "minor", "18: entardecer em menor");
  assert.strictEqual(R[18].mode, "pentMinor", "19: noite em pentatônica menor");
  assert.strictEqual(R[19].mode, "major", "20: a volta ao ninho é em modo maior");
  assert.ok(["pentMajor", "major", "lydian", "mixolydian"].includes(R[0].mode) && R.slice(0, 10).every((r) => !["minor", "phrygian", "harmMinor", "pentMinor"].includes(r.mode)), "Fases 1 a 10 sem modos menores (dórico só na mata e no trigal)");
});
test("perfil: os três compassos aparecem (4/4, 3/4 e 6/8), com 6/8 e 3/4 em boa parte das fases (mais da metade)", () => {
  const count = {};
  for (const r of R) count[meterName(r)] = (count[meterName(r)] || 0) + 1;
  for (const m of ["4/4", "3/4", "6/8"]) assert.ok(count[m] >= 4, `${m}: ${count[m]} fase(s)`);
  assert.ok(count["3/4"] + count["6/8"] > 10, `compassos soltos: ${count["3/4"] + count["6/8"]} de 20`);
  assert.strictEqual(meterName(R[0]), "6/8", "o jardim começa solto");
  assert.strictEqual(meterName(R[19]), "4/4", "o final é em 4/4");
});
test("perfil: instrumentos do solo variados (pelo menos 7 diferentes, nenhum em mais de 5 fases) e padrões de baixo variados", () => {
  const leads = {}, bass = {};
  for (const r of R) { leads[leadInst(r)] = (leads[leadInst(r)] || 0) + 1; const p = r.voices.bass && r.voices.bass.pattern; bass[p] = (bass[p] || 0) + 1; }
  assert.ok(Object.keys(leads).length >= 7, "solos: " + JSON.stringify(leads));
  assert.ok(Math.max(...Object.values(leads)) <= 5, "solos: " + JSON.stringify(leads));
  assert.ok(Object.keys(bass).length >= 6, "baixos: " + JSON.stringify(bass));
  assert.ok(Math.max(...Object.values(bass)) <= 4, "baixos: " + JSON.stringify(bass));
  // timbres leves do bichinho dominam: flauta, harpa, sino ou celesta fazem o solo ou o revezamento em pelo menos 12 fases
  const airy = R.filter((r) => ["flute", "harp", "bell", "celesta"].some((i) => leadInst(r) === i || (r.voices.lead.rotate || []).some((x) => x.inst === i))).length;
  assert.ok(airy >= 12, "fases com flauta/harpa/sino/celesta na melodia: " + airy);
});
test("perfil: formas e motivos variados (pelo menos 7 formas diferentes; motivos de 1, 2, 3 e 4 compassos; contornos e saltos variados)", () => {
  const forms = new Set(R.map((r) => r.form));
  assert.ok(forms.size >= 7, "formas: " + [...forms].join(","));
  assert.deepStrictEqual([...new Set(R.map((r) => r.motif.bars))].sort(), [1, 2, 3, 4]);
  assert.ok(new Set(R.map((r) => r.motif.contour)).size >= 4, "contornos");
  assert.ok(Math.max(...R.map((r) => r.motif.leaps)) - Math.min(...R.map((r) => r.motif.leaps)) >= 0.3, "saltos variados");
  assert.ok(R.every((r) => r.motif.rhythm), "todos os temas têm ritmo escrito (nada de ritmo sorteado por acaso)");
});
test("perfil: ambiências nos lugares certos (água em 9, 12 e 13; vento em 7, 8 e 17; grilos em 19; vento também nas dunas, falésias e mata)", () => {
  for (const f of [9, 12, 13]) assert.strictEqual(ambOf(R[f - 1]), "water", "Fase " + f);
  for (const f of [7, 8, 17]) assert.strictEqual(ambOf(R[f - 1]), "wind", "Fase " + f);
  for (const f of [14, 15, 10]) assert.strictEqual(ambOf(R[f - 1]), "wind", "Fase " + f);
  assert.strictEqual(ambOf(R[18]), "crickets", "Fase 19");
  assert.ok(R.filter((r) => ambOf(r)).length >= 11, "ambiência em pelo menos 11 fases");
  // nunca duas ambiências ao mesmo tempo e a ambiência aparece na partitura
  for (const r of R) if (ambOf(r)) assert.ok(S[r.id].stats.byVoice.amb > 0, r.id + ": ambiência sem eventos");
});
test("perfil: percussão mínima — poucas fases com percussão cheia; várias sem percussão ou só com 'sparse'/'heartbeat'/escova esparsa", () => {
  const light = R.filter((r) => !r.voices.perc || ["sparse", "heartbeat"].includes(r.voices.perc.pattern));
  assert.ok(light.length >= 8, "fases sem percussão ou esparsa: " + light.map((r) => r.id).join(","));
  const none = R.filter((r) => !r.voices.perc).map((r) => r.id);
  assert.ok(none.length >= 2, "sem percussão: " + none.join(","));
  for (const f of [1, 9]) assert.ok(!R[f - 1].voices.perc, `Fase ${f} sem percussão`);
  const heavy = R.filter((r) => r.voices.perc && ["driving", "polka", "shuffle", "backbeat"].includes(r.voices.perc.pattern)).map((r) => r.id);
  assert.ok(heavy.length <= 5, "percussão cheia só em poucas fases: " + heavy.join(","));
  assert.ok(R[10].voices.perc && R[10].voices.perc.pattern === "driving", "11: a chegada dos gaviões tem percussão em colcheias");
  assert.strictEqual(R[18].voices.perc.pattern, "heartbeat", "19: batida de coração");
});
test("perfil: o entardecer (18) é lento e descendente, a noite (19) é escura (flauta grave, grilos, camadas só nas seções cheias) e o final (20) é grande e maior", () => {
  assert.strictEqual(R[17].motif.contour, "fall");
  assert.ok(R[17].bpm <= 90 && meterName(R[17]) === "6/8");
  const lead = S.bird18.events.filter((e) => e.voice === "lead" && e.kind !== "pickup");
  assert.ok(lead.filter((e) => e.d >= 1).length > lead.length / 4, "notas longas (de um pulso ou mais) em mais de um quarto da melodia");
  assert.strictEqual(leadInst(R[18]), "flute");
  assert.ok(R[18].voices.lead.oct <= 3, "flauta grave na noite");
  assert.strictEqual(ambOf(R[18]), "crickets");
  assert.ok(R[18].voices.pad && R[18].voices.arp && R[18].voices.pad.from >= 0.5 && R[18].voices.arp.from >= 0.5, "pad e harpa esparsos só nas seções mais cheias");
  assert.ok(Math.max(...R.slice(0, 18).map((r) => r.bpm)) < R[19].bpm, "o final é o mais rápido");
  assert.ok(R[19].voices.lead.rotate && R[19].voices.lead.rotate.length >= 4, "20: o solo passa por quatro timbres");
  assert.strictEqual(R[19].form, "ABCBA", "20: a volta do A fecha o laço como 'volta ao ninho'");
  assert.ok(S.bird20.stats.byVoice.perc > 100 && S.bird20.stats.byVoice.arp > 100, "20: percussão e arpejo cheios");
});

// ---------- Determinismo e higiene ----------
test("determinismo: duas gerações da partitura são idênticas e o arquivo não usa Math.random nem Date.now", () => {
  for (const id of IDS) assert.strictEqual(JSON.stringify(Music.score(id)), JSON.stringify(Music.score(id)), id);
  assert.ok(!/Math\.random|Date\.now|performance\.now|new Date/.test(SRC.replace(/\/\/.*$/gm, "")), "sem aleatório do sistema nem relógio");
});
test("o arquivo só mexe em Music.register (nada de efeito colateral): não cria timers, não toca em AudioContext, sem rede, sem arquivo de áudio", () => {
  const code = SRC.replace(/\/\/.*$/gm, "");
  assert.ok(!/setInterval|setTimeout|AudioContext|fetch\(|XMLHttpRequest|new Audio|\.mp3|\.ogg|\.wav|localStorage/.test(code));
  assert.ok((code.match(/Music\.register|M\.register/g) || []).length === 1, "um só registro");
});
test("honestidade e texto: os comentários do arquivo não dizem que a música soa bem nem que foi ouvida", () => {
  assert.ok(!/soa bem|som agradável|agradável|foi ouvid[ao]|bonit[ao] de ouvir/i.test(SRC.replace(/nada aqui foi ouvido por uma pessoa/g, "")), "sem elogio nem 'foi ouvido'");
  assert.ok(!/\bA6\b|\bwip\b|agente|frente de|compositor/i.test(SRC), "sem rótulos internos");
  assert.ok(SRC.split("\n").filter((l) => /^\s*\/\/ \d+ /.test(l)).length === 20, "um comentário acima de cada uma das 20 receitas");
});
test("cada receita tem o comentário com o número e o lugar da fase logo acima dela", () => {
  const lines = SRC.split("\n");
  R.forEach((r, i) => {
    const at = lines.findIndex((l) => l.includes(`id: "${r.id}"`));
    assert.ok(at > 1, r.id);
    const cm = lines[at - 2];
    assert.ok(cm.trim().startsWith(`// ${i + 1} ${r.place}:`), `${r.id}: comentário "${cm.trim().slice(0, 50)}"`);
  });
});
test("cada tema tem vozes que realmente tocam: melodia em todas as seções, baixo, e cada voz declarada com pelo menos uma nota", () => {
  for (const r of R) {
    const s = S[r.id], v = s.stats.byVoice;
    assert.ok(v.lead > 40 && v.bass > 20, `${r.id}: ${JSON.stringify(v)}`);
    for (const [k, voice] of [["counter", "counter"], ["pad", "pad"], ["arp", "arp"], ["perc", "perc"], ["ambience", "amb"]]) if (r.voices[k]) assert.ok(v[voice] > 0, `${r.id}: ${k} sem notas`);
  }
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes das músicas do Passarinho passaram");
process.exit(failed ? 1 : 0);
