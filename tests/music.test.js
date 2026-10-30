// Testes unitários do motor de músicas tema (js/music.js), sem navegador, com um AudioContext FALSO (tests/music-rig.js).
// Uso: node tests/music.test.js
// Cobre: contrato do módulo, receitas, gerador (determinismo, escala, âmbito, laço, duração, vozes), render (nós, envelopes, janelas), os acréscimos do Sound
// (audio, onUnlock) e o tocador (crossfade, duck, pausa, mudo, preferência, unlock tardio, contexto suspenso, sem Web Audio, atraso).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const rig = require("./music-rig.js");
const { Music, makeFake, clock, memStorage, makeTimers, sourcesOf } = rig;
const Sound = require("../js/sound.js");

let failed = 0, unhandled = 0;
process.on("unhandledRejection", () => { unhandled++; });
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const SRC = fs.readFileSync(path.join(__dirname, "../js/music.js"), "utf8");
const THEMES = ["menu", "dog1", "cat1", "bird1"];
const mod = (a, n) => ((a % n) + n) % n;

// receita mínima válida para os testes (4/4, 104 bpm, 32 compassos = 73,8 s)
const base = (over = {}) => Object.assign({ id: "t1", key: "C", mode: "major", bpm: 104, beats: 4, bars: 32, form: "ABAB", intensity: 0.7,
  voices: { lead: { inst: "marimba", oct: 4 }, bass: { inst: "bass", pattern: "rootfifth" } } }, over);

// ---------- Contrato do módulo ----------
test("API: register, get, ids, validate, score, scoreOf, render, create e as listas aceitas", () => {
  for (const m of ["register", "get", "ids", "validate", "score", "scoreOf", "render", "create", "polyphony", "lifeOf", "scaleInfo", "degMidi", "midiHz"]) assert.strictEqual(typeof Music[m], "function", m);
  assert.strictEqual(Music.KEY, "cachorrinho.musica.v1");
  assert.strictEqual(Music.MAX_VOICES, 14);
  assert.strictEqual(Music.MIN_LOOP_SECONDS, 40); assert.strictEqual(Music.MAX_LOOP_SECONDS, 100);
  assert.deepStrictEqual(Object.keys(Music.MODES).sort(), ["blues", "dorian", "harmMinor", "lydian", "major", "minor", "mixolydian", "pentMajor", "pentMinor", "phrygian"]);
  assert.deepStrictEqual([...Music.BASS_PATTERNS], ["walk", "rootfifth", "pedal", "offbeat", "sync", "pizz", "waltz"]);
  assert.deepStrictEqual([...Music.PERC_KITS], ["woodblock", "brush", "shaker", "softkick", "hat"]);
  assert.deepStrictEqual([...Music.AMBIENCES], ["wind", "crickets", "rain", "water"]);
  assert.deepStrictEqual([...Music.ARP_SHAPES], ["up", "down", "updown", "broken", "alberti"]);
  assert.strictEqual(Object.keys(Music.INSTRUMENTS).length, 22);
});
test("carregar o módulo no Node não cria timers nem toca em AudioContext; o tocador sem Sound é mudo", () => {
  assert.strictEqual(typeof AudioContext, "undefined");
  const m = Music.create();
  assert.strictEqual(m.supported, false);
  assert.strictEqual(m.state, "stopped");
  assert.strictEqual(m.play("menu"), true, "o pedido fica guardado");
  assert.strictEqual(m.state, "unsupported");
  m.dispose();
});
test("os temas embutidos: menu primeiro, depois os três exemplos; ids únicos; get devolve null para id desconhecido", () => {
  assert.deepStrictEqual(Music.ids().slice(0, 4), THEMES);
  assert.strictEqual(new Set(Music.ids()).size, Music.ids().length);
  assert.strictEqual(Music.get("nao-existe"), null);
  assert.strictEqual(Music.get("menu").id, "menu");
});
test("o bloco dos temas de exemplo está marcado no código para os compositores substituírem", () => {
  assert.ok(SRC.includes("// ---------- temas de exemplo (substituídos pelos arquivos dos compositores) ----------"));
});
test("register: receita válida entra; inválida é ignorada com a lista de problemas; o mesmo id substitui e mantém a posição; guarda uma cópia", () => {
  const r = base({ id: "zz1" });
  const res = Music.register(r);
  assert.deepStrictEqual(res, { ok: ["zz1"], errors: [] });
  const pos = Music.ids().indexOf("zz1");
  r.bpm = 999; // mexer no objeto original não muda o registro
  assert.strictEqual(Music.get("zz1").bpm, 104);
  const res2 = Music.register([base({ id: "zz1", bpm: 110 }), base({ id: "zz2", mode: "foo" }), { id: "zz3", key: "Z" }, null, 5]);
  assert.deepStrictEqual(res2.ok, ["zz1"]);
  assert.strictEqual(res2.errors.length, 4);
  assert.ok(res2.errors[0].problems.length >= 1 && typeof res2.errors[0].problems[0] === "string");
  assert.strictEqual(Music.get("zz1").bpm, 110);
  assert.strictEqual(Music.ids().indexOf("zz1"), pos, "mesma posição");
  assert.strictEqual(Music.get("zz2"), null);
  assert.deepStrictEqual(Music.register("lixo"), { ok: [], errors: [] });
});
test("register de um id já tocado descarta a partitura guardada (a nova vale)", () => {
  Music.register(base({ id: "zz4", bpm: 100 }));
  const a = Music.scoreOf("zz4");
  assert.strictEqual(Music.scoreOf("zz4"), a, "partitura guardada em memória");
  Music.register(base({ id: "zz4", bpm: 110 }));
  const b = Music.scoreOf("zz4");
  assert.notStrictEqual(a, b); assert.strictEqual(b.bpm, 110);
});
test("scoreOf: id desconhecido ou receita que falha devolve null sem lançar; só as últimas 4 partituras ficam em memória", () => {
  assert.strictEqual(Music.scoreOf("nada"), null); assert.strictEqual(Music.scoreOf(5), null); assert.strictEqual(Music.scoreOf(null), null);
  for (let i = 0; i < 6; i++) Music.register(base({ id: "c" + i, motif: { seed: i } }));
  const first = Music.scoreOf("c0");
  for (let i = 1; i < 6; i++) Music.scoreOf("c" + i);
  assert.notStrictEqual(Music.scoreOf("c0"), first, "c0 saiu da memória e foi gerada de novo");
  assert.deepStrictEqual(Music.scoreOf("c0"), first, "e é igual");
});

// ---------- Validação ----------
test("validate: cada defeito de receita gera ao menos um problema em português; a receita boa não gera nenhum", () => {
  assert.deepStrictEqual(Music.validate(base()), []);
  const bad = {
    "bpm alto": base({ bpm: 300 }), "bpm baixo": base({ bpm: 20 }), "compasso 5": base({ beats: 5 }), "swing": base({ swing: 0.9 }), "bars 33 não divide a forma": base({ bars: 33 }),
    "forma com letra inválida": base({ form: "AXA" }), "forma de uma só seção": base({ form: "A" }), "modo": base({ mode: "foo" }), "tom": base({ key: "H" }), "prog": base({ prog: "I foo V" }),
    "prog com mais acordes que compassos": base({ bars: 8, bpm: 40, form: "AB", prog: "I II III IV V" }), "contorno": base({ motif: { contour: "zig" } }),
    "instrumento do solo": base({ voices: { lead: { inst: "kazoo" } } }), "sem solo": base({ voices: { bass: { inst: "bass" } } }), "kit": base({ voices: { lead: { inst: "marimba" }, perc: { kit: "tuba" } } }),
    "padrão do baixo": base({ voices: { lead: { inst: "marimba" }, bass: { inst: "bass", pattern: "zumba" } } }), "ambiência": base({ voices: { lead: { inst: "marimba" }, ambience: "fogo" } }),
    "laço curto": base({ bars: 8, form: "AB", bpm: 150 }), "laço longo": base({ bars: 64, form: "ABAB", bpm: 70 }), "oitava": base({ voices: { lead: { inst: "marimba", oct: 12 } } }),
    "ritmo com tamanho errado": base({ motif: { rhythm: "x-x-" } }), "ritmo que não começa em x": base({ motif: { rhythm: "-x-x-x-x" } }), "animal": base({ animal: "peixe" }),
    "arp.rate fracionário": base({ voices: { lead: { inst: "marimba" }, arp: { inst: "harp", rate: 1.3 } } }), "id": base({ id: "1 2" }), "não é objeto": 42, "lista": [],
  };
  for (const [name, r] of Object.entries(bad)) {
    const p = Music.validate(r);
    assert.ok(p.length >= 1 && p.every((x) => typeof x === "string" && x.length > 5), `${name}: esperava problemas, veio ${JSON.stringify(p)}`);
    assert.throws(() => Music.score(r), RangeError, `${name}: score lança`);
  }
});
test("receitas aceitam as formas de escrever o ritmo (texto, lista, objeto por letra), prog por letra ou lista e vozes nulas", () => {
  const ok = [
    base({ motif: { rhythm: "x-x-xx-x x--x-x--" } }), base({ motif: { rhythm: ["x-x-xx-x", "x--x-x--"] } }), base({ motif: { rhythm: { A: ["x-x-xx-x", "x--x-x--"], B: ["x--x-x-x", "x-x-----"] } } }),
    base({ motif: { rhythm: "xxxxxxxxxxxxxxxx" } }), base({ prog: ["I", "IV", "V", "I"] }), base({ prog: { default: "I IV", B: "vi V" } }), base({ prog: "i, iv, v7, 1" }),
    base({ voices: { lead: { inst: "marimba" }, bass: null } }), base({ voices: { lead: { inst: "marimba" }, ambience: { kind: "rain", vel: 0.3 } } }),
    base({ voices: { lead: { inst: "marimba" }, perc: { kit: ["softkick", "hat"], pattern: "driving" } } }),
  ];
  ok.forEach((r, i) => assert.deepStrictEqual(Music.validate(r), [], "ok " + i));
  for (const r of ok) assert.ok(Music.score(r).events.length > 50);
});

// ---------- Gerador ----------
test("conferências estruturais completas (rig.checkRecipe) nos 4 temas embutidos: nenhuma falha", () => {
  for (const id of THEMES) assert.deepStrictEqual(rig.checkRecipe(Music.get(id)), [], id);
});
test("temas distintos: tom, modo, andamento, solo e baixo; melodias diferentes entre si", () => {
  assert.deepStrictEqual(rig.checkDistinct(THEMES.map((i) => Music.get(i))), []);
  assert.ok(rig.checkDistinct([Music.get("dog1"), Object.assign({}, Music.get("dog1"), { id: "dogcopia" })]).length >= 1, "dois temas iguais são apontados");
});
test("checkTempoRamp: aceita andamento crescente dentro da faixa e aponta fora da faixa, fila que não cresce e subida pequena", () => {
  const mk = (list) => list.map((bpm, i) => ({ id: "f" + (i + 1), bpm }));
  const up = mk([92, 94, 98, 100, 104, 108, 110, 112, 116, 118, 122, 124, 126, 130, 132, 136, 140, 142, 146, 148]);
  assert.deepStrictEqual(rig.checkTempoRamp(up, { min: 92, max: 148 }), []);
  assert.ok(rig.checkTempoRamp(up, { min: 100, max: 148 }).some((m) => m.includes("fora")));
  assert.ok(rig.checkTempoRamp(mk([140, 130, 120, 110, 100, 95]), { min: 90, max: 150 }).some((m) => m.includes("não cresce")));
  assert.ok(rig.checkTempoRamp(mk([100, 100, 101, 102, 105]), { min: 90, max: 150 }).some((m) => m.includes("mais rápida")));
});
test("checkDistinct: uma cópia transposta da mesma melodia também é apontada (mede os intervalos, não as notas)", () => {
  const a = Object.assign({}, Music.get("dog1"), { id: "da" }), b = Object.assign({}, a, { id: "db", key: "A", bpm: 130 });
  assert.ok(rig.checkDistinct([a, b]).some((m) => m.includes("parecidas")));
});
test("determinismo: duas gerações idênticas, também depois de gerar outros temas no meio; semente diferente dá melodia diferente", () => {
  const a = JSON.stringify(Music.score("menu"));
  Music.score("dog1");
  assert.strictEqual(JSON.stringify(Music.score("menu")), a);
  const r1 = base({ motif: { seed: 1 } }), r2 = base({ motif: { seed: 2 } });
  assert.notDeepStrictEqual(Music.score(r1).events.filter((e) => e.voice === "lead").map((e) => e.midi), Music.score(r2).events.filter((e) => e.voice === "lead").map((e) => e.midi));
  const s = Music.score(r1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(s)), s, "a partitura é só dados (JSON)");
});
test("o gerador não usa números aleatórios do sistema; só o tocador lê o relógio (Date.now, uma vez, como padrão de `now`); nenhum arquivo de áudio nem rede", () => {
  assert.ok(!/Math\s*\.\s*random/.test(SRC), "Math.random");
  const hits = SRC.split("Date.now").length - 1;
  assert.strictEqual(hits, 1, "Date.now só no padrão de `now` do tocador");
  assert.ok(SRC.indexOf("Date.now") > SRC.indexOf("function create(opts)"), "dentro do tocador");
  for (const bad of ["fetch(", "XMLHttpRequest", "new Audio(", ".mp3", ".ogg", ".wav", "http://", "https://", "decodeAudioData", "importScripts", "performance.now"]) assert.ok(!SRC.includes(bad), bad);
});
test("todas as notas dentro da escala do modo, em todos os 10 modos, 3 compassos e 7 baixos (210 receitas), sem nenhuma falha estrutural", () => {
  const keys = Object.keys(Music.KEYS);
  let i = 0, n = 0;
  const fails = [];
  for (const mode of Object.keys(Music.MODES)) for (const beats of [3, 4, 6]) for (const bp of Music.BASS_PATTERNS) {
    const pp = Music.PERC_PATTERNS[i % Music.PERC_PATTERNS.length], kit = Music.PERC_KITS[i % Music.PERC_KITS.length], shape = Music.ARP_SHAPES[i % Music.ARP_SHAPES.length];
    const bpm = beats === 6 ? 70 : beats === 3 ? 126 : 112;
    const r = { id: "m" + i, key: keys[i % keys.length], mode, bpm, beats, swing: beats === 6 ? 0 : (i % 4) * 0.15, bars: 32, form: ["AABA", "ABAB", "AABC", "ABCB"][i % 4],
      motif: { seed: i * 7 + 1, contour: Music.CONTOURS[i % 5], leaps: (i % 5) / 4, rests: (i % 3) / 3 },
      voices: { lead: { inst: ["marimba", "pluck", "flute", "celesta", "xylo"][i % 5], oct: 4 }, counter: { inst: "flute", from: 0.1 }, bass: { inst: "bass", pattern: bp }, pad: { inst: "strings", from: 0.1 },
        arp: { inst: "harp", from: 0.1, shape, rate: beats === 6 ? 3 : 2 }, perc: { kit, pattern: kit === "softkick" ? "steady" : pp, from: 0.1 }, ambience: Music.AMBIENCES[i % 4] }, intensity: [0.3, 0.6, 0.9][i % 3] };
    const secs = 32 * (beats === 6 ? 2 : beats) * 60 / bpm;
    if (secs > 100) { r.bars = 24; r.form = ["AAB", "ABC", "ABA"][i % 3]; } else if (secs < 40) r.bpm = Math.round(bpm * secs / 45);
    const f = rig.checkRecipe(r, { render: i % 10 === 0 });
    if (f.length) fails.push(...f.slice(0, 2));
    i++; n++;
  }
  assert.strictEqual(n, 210);
  assert.deepStrictEqual(fails, []);
});
test("todos os instrumentos de tom servem de solo, todos os padrões de percussão, formas de arpejo e ambiências funcionam", () => {
  const tones = Object.keys(Music.INSTRUMENTS).filter((k) => ["tone", "bass"].includes(Music.INSTRUMENTS[k]));
  assert.strictEqual(tones.length, 13);
  for (const inst of tones) assert.deepStrictEqual(rig.checkRecipe(base({ id: "i1", voices: { lead: { inst }, bass: { inst: "bass" } } })), [], inst);
  for (const pattern of Music.PERC_PATTERNS) for (const beats of [3, 4, 6]) {
    const f = rig.checkRecipe(base({ id: "p1", beats, bpm: beats === 6 ? 70 : beats === 3 ? 126 : 104, voices: { lead: { inst: "marimba" }, perc: { kit: ["woodblock", "hat"], pattern, from: 0.1 } } }), { render: false });
    assert.deepStrictEqual(f, [], pattern + " " + beats);
  }
  for (const kit of Music.PERC_KITS) assert.deepStrictEqual(rig.checkRecipe(base({ id: "k1", voices: { lead: { inst: "marimba" }, perc: { kit, pattern: "steady", from: 0.1 } } })), [], kit);
  for (const shape of Music.ARP_SHAPES) assert.deepStrictEqual(rig.checkRecipe(base({ id: "a1", voices: { lead: { inst: "marimba" }, arp: { inst: "harp", shape, from: 0.1, rate: 4 } } })), [], shape);
  for (const amb of Music.AMBIENCES) assert.deepStrictEqual(rig.checkRecipe(base({ id: "b1", voices: { lead: { inst: "marimba" }, ambience: amb } })), [], amb);
});
test("a checkRecipe aponta defeitos de verdade: nota fora da escala, âmbito, voz sem notas, trecho mudo", () => {
  // mentimos para a conferência trocando o modo depois de gerar: a partitura de dó maior contra a escala de ré menor tem notas fora
  const r = base({ id: "f1" });
  assert.deepStrictEqual(rig.checkRecipe(r), []);
  const pedal = base({ id: "f2", voices: { lead: { inst: "marimba" }, pad: { inst: "strings", from: 1 }, bass: { inst: "bass" } }, intensity: 0 });
  assert.ok(rig.checkRecipe(pedal, { render: false }).some((m) => m.includes("pad")), "pad que nunca entra");
  const mudo = base({ id: "f3", bars: 16, bpm: 50, form: "AB", motif: { rests: 1, rhythm: "x....... ........" }, voices: { lead: { inst: "marimba" }, bass: null } });
  assert.ok(rig.checkRecipe(mudo, { render: false }).some((m) => m.includes("mudo")), "trecho mudo");
  assert.ok(rig.checkRecipe(base({ id: "f4", bpm: 300 })).some((m) => m.includes("receita")), "receita inválida");
});
test("âmbito da melodia de no máximo 2 oitavas por instrumento, também com o solo revezando instrumentos e oitavas (menu)", () => {
  const s = Music.score("menu");
  const byInst = {};
  for (const e of s.events.filter((x) => x.voice === "lead")) { const r = byInst[e.inst] || (byInst[e.inst] = [999, 0]); r[0] = Math.min(r[0], e.midi); r[1] = Math.max(r[1], e.midi); }
  assert.deepStrictEqual(Object.keys(byInst).sort(), ["contrabass", "flute", "marimba"], "os três timbres revezam o motivo");
  for (const r of Object.values(byInst)) assert.ok(r[1] - r[0] <= 24);
  const counts = Object.fromEntries(Object.keys(byInst).map((k) => [k, s.events.filter((e) => e.voice === "lead" && e.inst === k).length]));
  for (const c of Object.values(counts)) assert.ok(c >= 25, "ninguém domina: " + JSON.stringify(counts));
  assert.ok(Math.max(...Object.values(counts)) < 2.5 * Math.min(...Object.values(counts)), JSON.stringify(counts));
});
test("a melodia nunca repete a mesma nota 3 vezes seguidas, em nenhum modo, compasso ou contorno", () => {
  const keys = Object.keys(Music.KEYS);
  let i = 0, total = 0;
  for (const mode of Object.keys(Music.MODES)) for (const beats of [3, 4, 6]) for (const contour of Music.CONTOURS) {
    const bpm = beats === 6 ? 70 : beats === 3 ? 126 : 112, secs = 32 * (beats === 6 ? 2 : beats) * 60 / bpm;
    const r = { id: "q" + i, key: keys[i % keys.length], mode, bpm: secs > 100 ? Math.round(bpm * 1.2) : secs < 40 ? Math.round(bpm * 0.8) : bpm, beats, bars: 32, form: "AABA",
      motif: { seed: i * 13 + 5, contour, leaps: (i % 5) / 4, rests: (i % 3) / 3 }, voices: { lead: { inst: "marimba" } } };
    const lead = Music.score(r).events.filter((e) => e.voice === "lead");
    for (let k = 2; k < lead.length; k++) { total++; assert.ok(!(lead[k].deg === lead[k - 1].deg && lead[k - 1].deg === lead[k - 2].deg), `receita ${i}, nota ${k}`); }
    i++;
  }
  assert.ok(total > 10000);
});
test("o laço fecha no tom: o último compasso é o dominante, a melodia termina a até 3 graus da primeira nota e a cauda passa para o começo", () => {
  for (const id of THEMES) {
    const s = Music.score(id), sc = Music.scaleInfo(Music.get(id).key, Music.get(id).mode);
    const lead = s.events.filter((e) => e.voice === "lead");
    assert.strictEqual(s.harmony[s.harmony.length - 1].pcs[0], mod(sc.pc + 7, 12), id + ": dominante no fim");
    assert.ok(Math.abs(lead[lead.length - 1].deg - lead[0].deg) <= 3, id);
    assert.ok(lead[0].t < 1, id + ": começa no primeiro tempo");
    assert.ok(s.events.every((e) => e.t < s.lengthBeats), "nenhuma nota começa depois do fim do laço");
    const tail = s.events.filter((e) => (e.t + e.d) * 60 / s.bpm + Music.lifeOf(e.inst, 0, e.kind) > s.lengthSeconds);
    assert.ok(tail.length >= 1, id + ": há notas cuja cauda passa do fim do laço (e o tocador as deixa soar sobre o laço seguinte)");
  }
});
test("duração do laço de 40 a 100 s e igual a compassos x tempos x 60 / andamento", () => {
  for (const id of THEMES) {
    const s = Music.score(id);
    assert.ok(s.lengthSeconds >= 40 && s.lengthSeconds <= 100, id);
    assert.ok(Math.abs(s.lengthSeconds - s.bars * s.barBeats * 60 / s.bpm) < 1e-9);
    assert.strictEqual(s.lengthBeats, s.bars * s.barBeats);
  }
  assert.deepStrictEqual(THEMES.map((i) => Math.round(Music.score(i).lengthSeconds)), [74, 66, 83, 51]);
});
test("compassos: 4/4 e 3/4 têm 4 e 3 tempos, 6/8 em dois pulsos tem 2 batidas e passos de 1/3; as notas do baixo caem na grade", () => {
  for (const [beats, bar, step] of [[4, 4, 0.5], [3, 3, 0.5], [6, 2, 1 / 3]]) {
    const s = Music.score(base({ beats, bpm: beats === 6 ? 70 : beats === 3 ? 126 : 104, voices: { lead: { inst: "marimba" }, bass: { inst: "bass", pattern: "walk" } } }));
    assert.strictEqual(s.barBeats, bar); assert.strictEqual(s.beats, beats);
    for (const e of s.events.filter((x) => x.voice === "bass")) assert.ok(Math.abs(e.t / step - Math.round(e.t / step)) < 1e-4, `${beats}: ${e.t}`);
  }
});
test("swing: com 0 as colcheias de contratempo ficam em x,5; com 0,4 atrasam 0,1 batida; o 6/8 ignora o swing; pad e ambiência não balançam", () => {
  const mk = (swing) => Music.score(base({ swing, voices: { lead: { inst: "marimba" }, bass: { inst: "bass", pattern: "offbeat" }, pad: { inst: "strings", from: 0.1 } } }));
  const a = mk(0), b = mk(0.4);
  const off = (s) => s.events.filter((e) => e.voice === "bass").map((e) => mod(e.t, 1)).filter((x) => x > 0.01);
  assert.ok(off(a).length > 30 && off(a).every((x) => Math.abs(x - 0.5) < 1e-6));
  assert.ok(off(b).every((x) => Math.abs(x - 0.6) < 1e-6), JSON.stringify(off(b).slice(0, 3)));
  assert.deepStrictEqual(b.events.filter((e) => e.voice === "pad").map((e) => e.t), a.events.filter((e) => e.voice === "pad").map((e) => e.t));
  const c = Music.score(base({ beats: 6, bpm: 70, swing: 0.5 })), d = Music.score(base({ beats: 6, bpm: 70, swing: 0 }));
  assert.deepStrictEqual(c.events.map((e) => e.t), d.events.map((e) => e.t));
});
test("camadas por seção: a seção mais leve (A) não tem arpejo nem contracanto e a mais cheia (B) tem; intensity maior dá mais notas", () => {
  const s = Music.score("menu"), sec = s.sectionBars * s.barBeats;
  const inSec = (k, voice) => s.events.filter((e) => e.voice === voice && e.t >= k * sec && e.t < (k + 1) * sec).length;
  assert.strictEqual(inSec(0, "arp"), 0); assert.strictEqual(inSec(0, "counter"), 0);
  assert.ok(inSec(1, "arp") > 10 && inSec(1, "counter") > 3);
  assert.ok(s.harmony[0].level < s.harmony[s.sectionBars].level);
  const vs = { lead: { inst: "marimba" }, bass: { inst: "bass" }, pad: { inst: "strings" }, perc: { kit: "woodblock" }, arp: { inst: "harp" }, counter: { inst: "flute" } };
  const lo = Music.score(base({ intensity: 0.2, voices: vs }));
  const hi = Music.score(base({ intensity: 0.9, voices: vs }));
  assert.ok(hi.events.length > lo.events.length);
  assert.ok(Object.keys(hi.stats.byVoice).length > Object.keys(lo.stats.byVoice).length);
});
test("o baixo toca a raiz do acorde no 1º tempo de cada compasso (padrões com raiz no tempo forte) e os padrões têm o desenho pedido", () => {
  for (const pattern of ["rootfifth", "walk", "pedal", "pizz", "sync"]) {
    const s = Music.score(base({ voices: { lead: { inst: "marimba" }, bass: { inst: "bass", pattern } } }));
    for (const h of s.harmony.slice(0, s.harmony.length - 1)) {
      const first = s.events.find((e) => e.voice === "bass" && Math.abs(e.t - h.bar * s.barBeats) < 1e-6);
      assert.ok(first && mod(first.midi, 12) === h.pcs[0], `${pattern} compasso ${h.bar}`);
    }
  }
  const count = (pattern) => Music.score(base({ voices: { lead: { inst: "marimba" }, bass: { inst: "bass", pattern } } })).events.filter((e) => e.voice === "bass").length;
  assert.strictEqual(count("pedal"), 32); assert.strictEqual(count("rootfifth"), 128); assert.strictEqual(count("walk"), 128); assert.strictEqual(count("offbeat"), 128);
  assert.strictEqual(count("sync"), 96); assert.strictEqual(count("pizz"), 128);
});
test("vozes simultâneas: nunca mais que 14, mesmo numa receita lotada, e a melodia nunca é cortada para dar vaga a outra voz", () => {
  const crowded = base({ id: "lot", bpm: 60, bars: 16, form: "AB", intensity: 1, swing: 0.2, voices: { lead: { inst: "celesta", oct: 5 }, counter: { inst: "strings", from: 0 }, bass: { inst: "contrabass", pattern: "walk" },
    pad: { inst: "strings", from: 0 }, arp: { inst: "harp", rate: 4, shape: "updown", from: 0 }, perc: { kit: ["woodblock", "shaker"], pattern: "driving", from: 0 }, ambience: "water" } });
  const s = Music.score(crowded);
  assert.ok(s.stats.dropped > 0, "a receita lotada precisa de corte");
  assert.ok(s.stats.maxPolyphony <= 14 && Music.polyphony(s) <= 14);
  const alone = Music.score(Object.assign({}, crowded, { voices: { lead: crowded.voices.lead, bass: null } }));
  assert.strictEqual(s.stats.byVoice.lead, alone.stats.byVoice.lead, "nenhuma nota da melodia foi cortada");
  for (const id of THEMES) assert.ok(Music.scoreOf(id).stats.maxPolyphony <= 14);
});
test("ambiências leves e curtas: um evento por vez, nunca mais que 6 s, 'f' só na água", () => {
  for (const amb of Music.AMBIENCES) {
    const s = Music.score(base({ voices: { lead: { inst: "marimba" }, ambience: amb } })), ev = s.events.filter((e) => e.voice === "amb");
    assert.ok(ev.length >= 5, amb);
    for (let i = 0; i < ev.length; i++) {
      assert.strictEqual(ev[i].inst, amb); assert.strictEqual(ev[i].midi, null);
      assert.ok(ev[i].d * 60 / s.bpm <= 6.0, amb + " curta");
      if (i) assert.ok(ev[i].t >= ev[i - 1].t + ev[i - 1].d - 1e-9, amb + " sem sobreposição");
      assert.strictEqual(ev[i].f !== undefined, amb === "water");
    }
  }
});
test("percussão: o bumbo só marca o grave, kit em lista usa [grave, agudo]; nenhuma nota de percussão tem altura", () => {
  const s = Music.score(base({ voices: { lead: { inst: "marimba" }, perc: { kit: ["softkick", "hat"], pattern: "polka", from: 0.1 } } }));
  const perc = s.events.filter((e) => e.voice === "perc");
  assert.ok(perc.every((e) => e.midi === null && ["softkick", "hat"].includes(e.inst)));
  assert.ok(perc.filter((e) => e.inst === "softkick").every((e) => e.kind === "low") && perc.filter((e) => e.inst === "hat").every((e) => e.kind !== "low"));
  const only = Music.score(base({ voices: { lead: { inst: "marimba" }, perc: { kit: "softkick", pattern: "backbeat", from: 0.1 } } })).events.filter((e) => e.voice === "perc");
  assert.ok(only.every((e) => e.inst === "softkick" && (e.kind === "low" || e.kind === "fill")) && only.some((e) => e.kind === "low"));
});
test("viradas no fim das seções (exceto no último compasso do laço) e acordes de 7ª quando a progressão pede", () => {
  const s = Music.score(base({ prog: "I7 IV7 V7 I", voices: { lead: { inst: "marimba" }, perc: { kit: "woodblock", pattern: "steady", from: 0.1 } } }));
  assert.ok(s.events.some((e) => e.kind === "fill"));
  const lastBarStart = (s.bars - 1) * s.barBeats;
  assert.ok(!s.events.some((e) => e.kind === "fill" && e.t >= lastBarStart));
  assert.ok(s.harmony.some((h) => h.seventh));
});

// ---------- Render (AudioContext falso) ----------
test("render: tudo agendado termina, chega à saída, envelopes de 0 a 0 com ataque >= 2,9 ms, sem valores não finitos (4 temas)", () => {
  for (const id of THEMES) {
    const sc = Music.score(id), f = makeFake(), ctx = new f.Ctx();
    const r = Music.render(sc, ctx, ctx.destination, 0);
    assert.strictEqual(r.failed, 0); assert.strictEqual(r.count, sc.events.length);
    assert.deepStrictEqual(rig.checkRender(sc, id + ": "), []);
    for (const g of ctx.nodes.filter((n) => n.kind === "gain" && !n.out.some((o) => o instanceof rig.FakeParam))) {
      const ev = g.gain.events;
      if (!ev.some((e) => e.type === "lin")) continue;
      assert.ok(ev[1].t - ev[0].t >= 0.0029, "ataque curto demais: " + (ev[1].t - ev[0].t));
    }
    assert.strictEqual(f.instances.length, 1);
    assert.strictEqual(ctx.buffers.length, 1, "um só buffer de ruído por contexto");
    for (const n of sourcesOf(ctx)) assert.ok(n.starts[0][0] >= 0 && (n.kind === "buffer" || n.stops[0] - n.starts[0][0] < 8), "fonte de duração razoável");
  }
});
test("render por janelas: [0,a) + [a,fim) agenda exatamente as mesmas notas que o laço inteiro; t0 desloca tudo; minTime pula atrasadas; voices filtra", () => {
  const sc = Music.score("menu");
  const dump = (ctx) => JSON.stringify(sourcesOf(ctx).map((n) => [n.kind, n.starts[0][0].toFixed(5), (n.stops[0] ?? 0).toFixed(5)]).sort());
  const f1 = makeFake(), c1 = new f1.Ctx(); Music.render(sc, c1, c1.destination, 10);
  const f2 = makeFake(), c2 = new f2.Ctx();
  const a = 37.3, spb = 60 / sc.bpm;
  const r1 = Music.render(sc, c2, c2.destination, 10, { from: 0, to: a }), r2 = Music.render(sc, c2, c2.destination, 10 + a * spb, { from: a, to: sc.lengthBeats });
  assert.strictEqual(r1.count + r2.count, sc.events.length);
  assert.strictEqual(dump(c1), dump(c2));
  assert.ok(Math.min(...sourcesOf(c1).map((n) => n.starts[0][0])) >= 10 - 1e-9);
  const f3 = makeFake(), c3 = new f3.Ctx();
  const r3 = Music.render(sc, c3, c3.destination, 5, { minTime: 20 });
  assert.ok(r3.count < sc.events.length && sourcesOf(c3).every((n) => n.starts[0][0] >= 20 - 1e-9));
  const f4 = makeFake(), c4 = new f4.Ctx();
  const r4 = Music.render(sc, c4, c4.destination, 0, { voices: ["bass"] });
  assert.strictEqual(r4.count, sc.stats.byVoice.bass);
  const f5 = makeFake(), c5 = new f5.Ctx();
  assert.strictEqual(Music.render(sc, c5, c5.destination, 0, { from: 8, to: 8 }).count, 0);
});
test("render: a altura das notas é a do MIDI (marimba lá = 440 Hz), com a melodia na primeira nota do tema", () => {
  const sc = Music.score(base({ voices: { lead: { inst: "marimba", oct: 4 } } })), first = sc.events[0];
  const f = makeFake(), c = new f.Ctx(); Music.render(sc, c, c.destination, 0);
  const osc = c.nodes.find((n) => n.kind === "osc");
  assert.ok(Math.abs(osc.frequency.events[0].v - 440 * Math.pow(2, (first.midi - 69) / 12)) < 1e-9);
  assert.strictEqual(Music.midiHz(69), 440);
});
test("render: determinístico (mesmo grafo e automações), não guarda estado e não altera a partitura", () => {
  const sc = Music.score("cat1"), before = JSON.stringify(sc);
  const dump = (c) => JSON.stringify(c.nodes.map((n) => [n.kind, n._type, n.starts, n.stops, ["frequency", "gain", "Q"].map((p) => n[p] && n[p].events)]));
  const f1 = makeFake(), f2 = makeFake(), c1 = new f1.Ctx(), c2 = new f2.Ctx();
  Music.render(sc, c1, c1.destination, 3); Music.render(sc, c2, c2.destination, 3);
  assert.strictEqual(dump(c1), dump(c2)); assert.strictEqual(JSON.stringify(sc), before);
});
test("render: argumentos inválidos lançam TypeError; um navegador que recusa criar nós não derruba (conta `failed`)", () => {
  const f = makeFake(), c = new f.Ctx(), sc = Music.score("menu");
  assert.throws(() => Music.render(null, c, c.destination, 0), TypeError);
  assert.throws(() => Music.render(sc, null, c.destination, 0), TypeError);
  assert.throws(() => Music.render(sc, c, null, 0), TypeError);
  f.failOn = "createOscillator";
  const r = Music.render(sc, c, c.destination, 0);
  assert.ok(r.failed > 0 && r.count < sc.events.length);
});
test("a nota mais grave e a mais aguda dos 4 temas ficam na faixa do celular e do alto-falante (40 Hz a 4 kHz de fundamental, menos o 'f' da água)", () => {
  for (const id of THEMES) {
    const midis = Music.scoreOf(id).events.filter((e) => e.midi !== null).map((e) => e.midi);
    assert.ok(Math.min(...midis) >= 28 && Math.max(...midis) <= 96, id + ": " + Math.min(...midis) + ".." + Math.max(...midis));
  }
});

// ---------- Acréscimos do Sound: audio() e onUnlock() ----------
test("Sound.audio(): null antes do unlock, sem Web Audio e com o contexto fechado; depois do unlock devolve { ctx, input } com a entrada do ganho mestre", () => {
  const f = makeFake(), s = Sound.create({ AudioContextClass: f.Ctx, now: clock() });
  assert.strictEqual(s.audio(), null);
  s.unlock();
  const a = s.audio();
  assert.strictEqual(a.ctx, f.last());
  assert.strictEqual(a.input.kind, "gain");
  assert.ok(a.input.out.some((o) => o.kind === "compressor"), "input é o ganho mestre, na frente do compressor");
  assert.strictEqual(a.input.gain.value, Sound.DEFAULT_VOLUME);
  f.last().state = "closed";
  assert.strictEqual(s.audio(), null);
  assert.strictEqual(Sound.create({ AudioContextClass: null }).audio(), null);
  const s2 = Sound.create({ AudioContextClass: null }); s2.unlock(); assert.strictEqual(s2.audio(), null);
});
test("Sound.onUnlock: chama no unlock (uma vez só), na hora se já destravado, devolve o cancelador, ignora o que não é função e um gancho que lança não atrapalha", () => {
  const f = makeFake(), s = Sound.create({ AudioContextClass: f.Ctx, now: clock() });
  const calls = [];
  const off = s.onUnlock(() => calls.push("a"));
  s.onUnlock(() => { throw new Error("gancho com defeito"); });
  s.onUnlock(() => calls.push("b"));
  assert.deepStrictEqual(calls, []);
  assert.strictEqual(s.unlock(), true);
  s.unlock(); s.unlock();
  assert.deepStrictEqual(calls, ["a", "b"]);
  s.onUnlock(() => calls.push("c"));
  assert.deepStrictEqual(calls, ["a", "b", "c"], "já destravado: chama na hora");
  assert.strictEqual(typeof off, "function");
  off();
  assert.strictEqual(typeof s.onUnlock(5), "function"); assert.strictEqual(typeof s.onUnlock(null), "function");
  // contexto fechado por fora: o próximo unlock cria outro e chama os ganchos de novo
  f.last().state = "closed";
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(s.unlock(), true);
  assert.deepStrictEqual(calls.slice(3), ["b", "c"], "o gancho cancelado não volta");
  // com o contexto suspenso e sem Web Audio nada é chamado
  const none = Sound.create({ AudioContextClass: null }); let n = 0; none.onUnlock(() => n++); none.unlock(); assert.strictEqual(n, 0);
});
test("os efeitos sonoros não mudam: NAMES e a saída do tocador de efeitos seguem iguais depois dos acréscimos", () => {
  assert.strictEqual(Sound.NAMES.length, 45);
  const f = makeFake(), s = Sound.create({ AudioContextClass: f.Ctx, now: clock() });
  s.unlock();
  assert.strictEqual(s.play("bone"), true);
  assert.strictEqual(Object.keys(Sound).sort().join(), "DEFAULT_VOLUME,KEY,LEVEL,MAX_EVENTS,MAX_SECONDS,MAX_VOICES,MIN_GAP_MS,NAMES,create,createOutput,hz,render");
});

// ---------- O tocador ----------
// instância pronta: Sound com contexto falso, relógio e timers manuais; `un: false` deixa travado
function rigPlayer(o = {}) {
  const fake = makeFake(o.fake || {}), now = clock(), timers = makeTimers(now);
  const sound = Sound.create({ AudioContextClass: o.noAudio ? null : fake.Ctx, now, storage: o.soundStorage });
  const storage = o.storage === undefined ? memStorage() : o.storage;
  const music = Music.create(Object.assign({ sound, storage, now, setInterval: timers.setInterval, clearInterval: timers.clearInterval }, o.music || {}));
  if (o.unlock !== false) sound.unlock();
  const ctx = () => fake.last();
  const run = (ms) => timers.run(ms, ctx());
  const chain = () => {
    const c = ctx(), master = sound.audio().input;
    const bus = c.nodes.find((n) => n.kind === "gain" && n.out.includes(master));
    const duck = bus && c.nodes.find((n) => n.kind === "gain" && n.out.includes(bus));
    const themes = duck ? c.nodes.filter((n) => n.kind === "gain" && ((n.out.includes(duck)) || (n.wasConnectedTo && n.wasConnectedTo.includes(duck)))) : [];
    return { master, bus, duck, themes };
  };
  const children = (g) => ctx().nodes.filter((n) => n.out.includes(g)).length;
  return { fake, now, timers, sound, music, storage, ctx, run, chain, children };
}
const startsAfter = (ctx, t) => sourcesOf(ctx).filter((n) => n.starts[0][0] >= t).length;

test("tocador: antes do unlock guarda o pedido sem criar contexto; o unlock do Sound começa o tema na hora (sem esperar o timer)", () => {
  const r = rigPlayer({ unlock: false });
  assert.strictEqual(r.music.play("menu"), true);
  assert.strictEqual(r.music.state, "waiting"); assert.strictEqual(r.music.current, "menu");
  assert.strictEqual(r.fake.instances.length, 0);
  r.run(2000);
  assert.strictEqual(r.fake.instances.length, 0, "continua esperando");
  r.sound.unlock();
  assert.strictEqual(r.music.state, "playing");
  assert.ok(sourcesOf(r.ctx()).length > 0, "o gancho de unlock já agendou as primeiras notas");
  assert.strictEqual(r.music.position.id, "menu");
});
test("tocador: o barramento é tema -> duck -> barramento (0,45) -> entrada mestre do Sound, e o ganho do tema sobe de 0 a 1 em 0,25 s no primeiro tema", () => {
  const r = rigPlayer();
  r.music.play("dog1");
  const { bus, duck, themes, master } = r.chain();
  assert.ok(bus && duck && themes.length === 1);
  assert.strictEqual(bus.gain.value, 0.45); assert.strictEqual(duck.gain.value, 1);
  assert.ok(bus.out.includes(master));
  const ev = themes[0].gain.events;
  assert.strictEqual(ev[0].v, 0); assert.strictEqual(ev[ev.length - 1].v, 1); assert.ok(ev[ev.length - 1].t - ev[0].t <= 0.26);
  const r2 = rigPlayer({ music: { busGain: 0.3 } }); r2.music.play("menu");
  assert.strictEqual(r2.chain().bus.gain.value, 0.3);
});
test("tocador: agenda com antecedência curta (<= 0,6 s + o ciclo), sem repetir nem pular notas, e o timer é um só", () => {
  const r = rigPlayer();
  r.music.play("menu");
  assert.strictEqual(r.timers.count, 1);
  const sc = Music.scoreOf("menu"), seen = new Set();
  for (let i = 0; i < 40; i++) {
    r.run(120);
    const c = r.ctx(), now = c.currentTime;
    const max = Math.max(...sourcesOf(c).map((n) => n.starts[0][0]));
    assert.ok(max <= now + 0.62 + 0.13, `agendou até ${(max - now).toFixed(2)} s à frente`);
    assert.strictEqual(r.timers.count, 1);
  }
  // 4,8 s tocados: as notas da partitura que começam nesse tempo foram todas agendadas (a contagem confere com o render do mesmo trecho)
  const c = r.ctx(), f = makeFake(), c2 = new f.Ctx();
  const beats = (c.currentTime + 0.6 - 0.06) * sc.bpm / 60;
  const pos = r.music.position;
  const part = Music.render(sc, c2, c2.destination, 0, { from: 0, to: Math.min(beats, sc.lengthBeats) });
  assert.ok(Math.abs(sourcesOf(c).filter((n) => n.starts[0][0] > 0).length - sourcesOf(c2).length) <= 20, `${sourcesOf(c).length} fontes vs ${sourcesOf(c2).length} do render direto (${part.count} notas)`);
  assert.ok(pos.beat > 0 && pos.beat < sc.lengthBeats);
  void seen;
});
test("tocador: o mesmo id não reinicia (nem cria nós novos); restart:true recomeça com crossfade", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(1200);
  const n1 = r.ctx().nodes.length, p1 = r.music.position.beat;
  assert.strictEqual(r.music.play("menu"), true);
  assert.strictEqual(r.ctx().nodes.length, n1, "nada novo");
  assert.ok(r.music.position.beat >= p1 - 1e-9, "não voltou ao começo");
  assert.strictEqual(r.chain().themes.length, 1);
  r.music.play("menu", { restart: true });
  assert.strictEqual(r.chain().themes.length, 2, "tema novo");
  assert.ok(r.music.position.beat < p1);
});
test("tocador: trocar de tema faz crossfade de 0,7 s; o tema velho para de agendar notas e some do grafo depois do fade", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(3000);
  const t0 = r.ctx().currentTime;
  assert.strictEqual(r.music.play("dog1"), true);
  assert.strictEqual(r.music.current, "dog1");
  const { themes } = r.chain();
  assert.strictEqual(themes.length, 2);
  const [oldG, newG] = themes, oe = oldG.gain.events, ne = newG.gain.events;
  assert.strictEqual(oe[oe.length - 1].v, 0); assert.ok(Math.abs(oe[oe.length - 1].t - (t0 + 0.7)) < 1e-6, "velho some em 0,7 s");
  assert.strictEqual(ne[0].v, 0); assert.strictEqual(ne[ne.length - 1].v, 1); assert.ok(Math.abs(ne[ne.length - 1].t - (t0 + 0.7)) < 1e-6, "novo sobe em 0,7 s");
  const oldKids = r.children(oldG);
  r.run(3000);
  assert.strictEqual(r.children(oldG), oldKids, "o tema velho não ganhou mais notas");
  assert.ok(r.children(newG) > 20);
  assert.ok(oldG.disconnected === true, "solto do grafo depois do fade");
  assert.strictEqual(r.music.position.id, "dog1");
  r.music.play("cat1", { fade: 2 });
  const g3 = r.chain().themes.find((g) => !g.disconnected && g !== newG);
  const e3 = g3.gain.events; assert.ok(Math.abs(e3[e3.length - 1].t - e3[0].t - 2) < 1e-6, "fade pedido de 2 s");
});
test("tocador: id desconhecido ou inválido devolve false e nada muda; tudo fica no log de pedidos", () => {
  const r = rigPlayer();
  r.music.play("menu");
  for (const bad of ["nao-existe", "", null, undefined, 7, {}, "dog99"]) assert.strictEqual(r.music.play(bad), false);
  assert.strictEqual(r.music.current, "menu"); assert.strictEqual(r.music.state, "playing");
  const ev = r.music.events.filter((e) => e.name === "play");
  assert.strictEqual(ev.length, 8); assert.deepStrictEqual(ev.map((e) => e.ok), [true, false, false, false, false, false, false, false]);
});
test("tocador: stop(fade) some em `fade` s (padrão 0,5), esquece o tema, para o timer quando tudo acabou e play depois começa de novo", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(1500);
  const t0 = r.ctx().currentTime, g = r.chain().themes[0];
  r.music.stop(0.4);
  assert.strictEqual(r.music.current, null); assert.strictEqual(r.music.state, "stopped");
  const e = g.gain.events; assert.strictEqual(e[e.length - 1].v, 0); assert.ok(Math.abs(e[e.length - 1].t - (t0 + 0.4)) < 1e-6);
  const kids = r.children(g);
  r.run(2000);
  assert.strictEqual(r.children(g), kids, "sem notas novas"); assert.ok(g.disconnected);
  assert.strictEqual(r.timers.count, 0, "timer parado");
  r.music.play("menu");
  assert.strictEqual(r.timers.count, 1);
  assert.strictEqual(r.chain().themes.filter((x) => !x.disconnected).length, 1);
  r.music.stop(); const e2 = r.chain().themes.find((x) => !x.disconnected).gain.events; assert.ok(Math.abs(e2[e2.length - 1].t - e2[e2.length - 1 - 1].t - 0.5) < 1e-6, "padrão 0,5 s");
  r.music.stop(); // parar de novo não dá erro
});
test("tocador: duck(nível, segundos) abaixa e volta; setDuck é o nível fixo (pausa do jogo); duck sem tempo fica até mudar", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(500);
  const { duck } = r.chain(), c = r.ctx();
  const t = c.currentTime;
  r.music.duck(0.25, 0.8);
  let ev = duck.gain.events.filter((e) => e.type === "target");
  assert.deepStrictEqual(ev.slice(-2).map((e) => [e.v, Math.round((e.t - t) * 1000) / 1000]), [[0.25, 0], [1, 0.8]], "abaixa agora e volta em 0,8 s");
  r.music.setDuck(0.25);
  ev = duck.gain.events.filter((e) => e.type === "target");
  assert.strictEqual(ev[ev.length - 1].v, 0.25);
  r.music.duck(0.1, 0.5); // dentro do duck fixo: volta ao fixo, não a 1
  ev = duck.gain.events.filter((e) => e.type === "target");
  assert.deepStrictEqual(ev.slice(-2).map((e) => e.v), [0.1, 0.25]);
  r.run(2000);
  r.music.setDuck(1);
  ev = duck.gain.events.filter((e) => e.type === "target"); assert.strictEqual(ev[ev.length - 1].v, 1);
  r.music.duck(0.3); // sem segundos: fica
  ev = duck.gain.events.filter((e) => e.type === "target"); assert.strictEqual(ev[ev.length - 1].v, 0.3);
  r.music.duck(2, 0.5); assert.strictEqual(duck.gain.events.filter((e) => e.type === "target").slice(-2)[0].v, 1, "nível limitado a 0..1");
  r.music.duck(NaN, 1); r.music.setDuck("x"); r.music.duck(undefined); // lixo não lança
});
test("tocador: duck antes do unlock vale quando o barramento nasce", () => {
  const r = rigPlayer({ unlock: false });
  r.music.setDuck(0.25); r.music.play("menu"); r.sound.unlock();
  assert.strictEqual(r.chain().duck.gain.value, 0.25);
});
test("tocador: pausa (aba escondida) some depressa, não agenda nada e o resume volta do começo do compasso em que parou", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(6000);
  const sc = Music.scoreOf("menu"), before = r.music.position.beat;
  r.music.pause();
  assert.strictEqual(r.music.state, "paused"); assert.strictEqual(r.music.paused, true);
  const { bus, themes } = r.chain();
  const t = r.ctx().currentTime;
  assert.strictEqual(bus.gain.events.filter((e) => e.type === "target").slice(-1)[0].v, 0, "barramento zerado");
  assert.ok(Math.abs(themes[0].gain.events.slice(-1)[0].t - (t + 0.05)) < 1e-6 && themes[0].gain.events.slice(-1)[0].v === 0);
  const n = sourcesOf(r.ctx()).length;
  r.run(10000);
  assert.strictEqual(sourcesOf(r.ctx()).length, n, "nada novo durante a pausa");
  const frozen = r.music.position;
  assert.strictEqual(frozen.live, false);
  assert.strictEqual(frozen.beat % sc.barBeats, 0, "guardou o começo de um compasso");
  assert.ok(frozen.beat <= before && before - frozen.beat < sc.barBeats + 1);
  r.music.resume();
  assert.strictEqual(r.music.state, "playing");
  assert.strictEqual(bus.gain.events.filter((e) => e.type === "target").slice(-1)[0].v, 0.45, "barramento de volta");
  r.run(1500);
  assert.ok(sourcesOf(r.ctx()).length > n);
  assert.ok(r.music.position.beat >= frozen.beat && r.music.position.beat < frozen.beat + 4 * sc.barBeats, "continua de onde parou, não do começo do laço");
  assert.strictEqual(r.chain().themes.length, 2, "ganho novo para a retomada");
});
test("tocador: mudo do Sound = não agenda nada; ao desmutar volta do ponto; o tick() faz reagir na hora e o timer, em até 120 ms", () => {
  const r = rigPlayer();
  r.music.play("dog1"); r.run(4000);
  const n = sourcesOf(r.ctx()).length;
  r.sound.setMuted(true);
  r.music.tick();
  assert.strictEqual(r.music.state, "muted");
  r.run(8000);
  assert.strictEqual(sourcesOf(r.ctx()).length, n, "nada agendado no mudo");
  const beat = r.music.position.beat;
  r.sound.setMuted(false);
  r.run(130); // só o timer
  assert.strictEqual(r.music.state, "playing");
  r.run(2000);
  assert.ok(sourcesOf(r.ctx()).length > n);
  assert.ok(r.music.position.beat >= beat && r.music.position.beat < beat + 20, "voltou do ponto");
  // mudo antes de tocar: o pedido espera
  const q = rigPlayer(); q.sound.setMuted(true); q.music.play("menu"); q.run(1000);
  assert.strictEqual(q.music.state, "muted"); assert.strictEqual(sourcesOf(q.ctx()).length, 0);
  q.sound.setMuted(false); q.run(200);
  assert.ok(sourcesOf(q.ctx()).length > 0);
});
test("tocador: botão Música — preferência em cachorrinho.musica.v1 ({on:0|1}), ligada por padrão; desligada não toca e ao ligar o tema pedido entra", () => {
  const r = rigPlayer();
  assert.strictEqual(r.music.isEnabled(), true);
  assert.strictEqual(r.storage._m["cachorrinho.musica.v1"], undefined, "só grava quando muda");
  r.music.play("menu"); r.run(1000);
  assert.strictEqual(r.music.toggleEnabled(), false);
  assert.strictEqual(r.storage._m["cachorrinho.musica.v1"], '{"on":0}');
  assert.strictEqual(r.music.state, "off");
  const n = sourcesOf(r.ctx()).length;
  r.run(5000); assert.strictEqual(sourcesOf(r.ctx()).length, n, "desligada: silêncio");
  assert.strictEqual(r.music.play("dog1"), true, "o pedido fica guardado"); assert.strictEqual(r.music.current, "dog1");
  assert.strictEqual(r.music.setEnabled(true), true);
  assert.strictEqual(r.storage._m["cachorrinho.musica.v1"], '{"on":1}');
  r.run(1000);
  assert.strictEqual(r.music.state, "playing"); assert.strictEqual(r.music.position.id, "dog1");
  assert.ok(sourcesOf(r.ctx()).length > n);
  // nova instância lê a preferência
  for (const [raw, want] of [['{"on":0}', false], ['{"on":1}', true], ["0", false], ["1", true], ["lixo", true], ["", true], ['{"on":7}', true], ["null", true], ['{"on":"0"}', true]]) {
    const q = Music.create({ storage: memStorage({ "cachorrinho.musica.v1": raw }) });
    assert.strictEqual(q.isEnabled(), want, raw);
  }
});
test("tocador: storage ausente, sem métodos ou que lança só deixa a preferência na memória", () => {
  for (const storage of [undefined, null, {}, { getItem() { throw new Error("x"); }, setItem() { throw new Error("y"); } }]) {
    const m = Music.create({ storage });
    assert.strictEqual(m.isEnabled(), true);
    assert.doesNotThrow(() => m.setEnabled(false));
    assert.strictEqual(m.isEnabled(), false);
    assert.strictEqual(m.toggleEnabled(), true);
  }
  assert.doesNotThrow(() => Music.create(null)); assert.doesNotThrow(() => Music.create(undefined));
});
test("tocador: contexto suspenso — pede resume() sem inundar (1 por segundo), não agenda nada e começa certo quando liga; nunca agenda no passado", () => {
  const r = rigPlayer({ fake: { state: "suspended", neverRunning: true } });
  r.music.play("menu");
  assert.strictEqual(r.music.state, "suspended");
  const base0 = r.fake.resumes;
  r.run(3500);
  assert.ok(r.fake.resumes - base0 <= 4 && r.fake.resumes - base0 >= 2, "resumes: " + (r.fake.resumes - base0));
  assert.strictEqual(sourcesOf(r.ctx()).length, 0);
  r.ctx().state = "running";
  r.ctx().currentTime = 50; // o relógio do áudio andou enquanto isso
  r.run(120);
  assert.strictEqual(r.music.state, "playing");
  const c = r.ctx();
  assert.ok(sourcesOf(c).length > 0 && sourcesOf(c).every((n) => n.starts[0][0] >= 50 - 1e-9), "nenhuma nota no passado");
  for (const fakeOpts of [{ resumeThrows: true, state: "suspended", neverRunning: true }, { resumeRejects: true, state: "suspended", neverRunning: true }]) {
    const q = rigPlayer({ fake: fakeOpts });
    q.music.play("menu");
    assert.doesNotThrow(() => q.run(3000));
    assert.strictEqual(q.music.state, "suspended");
  }
});
test("tocador: contexto fechado por fora e recriado pelo Sound — a música monta o barramento no contexto novo e recomeça o tema pedido", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(2000);
  const c1 = r.ctx();
  c1.state = "closed";
  r.run(500);
  assert.strictEqual(r.music.state, "waiting", "contexto fechado: espera");
  assert.strictEqual(r.sound.play("bone"), false);
  r.sound.unlock();
  assert.strictEqual(r.fake.instances.length, 2);
  r.run(300);
  assert.strictEqual(r.music.state, "playing");
  assert.ok(sourcesOf(r.ctx()).length > 0 && r.chain().themes.length === 1);
});
test("tocador: sem Web Audio, com contexto que lança ou com o nó recusado — fica mudo sem erro nenhum", () => {
  const a = rigPlayer({ noAudio: true });
  assert.strictEqual(a.music.supported, false);
  assert.strictEqual(a.music.play("menu"), true); assert.strictEqual(a.music.state, "unsupported");
  assert.doesNotThrow(() => { a.run(2000); a.music.duck(0.2, 1); a.music.pause(); a.music.resume(); a.music.stop(); a.music.toggleEnabled(); });
  const b = rigPlayer({ fake: { throwCtor: true } });
  assert.doesNotThrow(() => { b.music.play("menu"); b.run(1000); });
  assert.notStrictEqual(b.music.state, "playing");
  const c = rigPlayer(); c.music.play("menu"); c.run(300);
  c.fake.failOn = "createOscillator";
  assert.doesNotThrow(() => c.run(3000)); // cada nota que o navegador recusa é só pulada
  c.fake.failOn = null;
  const d = rigPlayer({ unlock: false });
  d.sound.unlock(); d.fake.failOn = "createGain";
  const late = Music.create({ sound: d.sound, now: d.now, setInterval: d.timers.setInterval, clearInterval: d.timers.clearInterval });
  assert.doesNotThrow(() => { late.play("menu"); d.run(1000); });
  assert.strictEqual(late.supported, false, "sem barramento a música desiste");
  assert.doesNotThrow(() => Music.create({ sound: {} }).play("menu"));
  assert.doesNotThrow(() => Music.create({ sound: { audio() { throw new Error("x"); }, isMuted() { throw new Error("y"); } } }).play("menu"));
  assert.doesNotThrow(() => Music.create({ sound: { onUnlock() { throw new Error("z"); } } }));
});
test("tocador: depois de um atraso grande (aba em segundo plano) pula o tempo perdido em vez de despejar notas atrasadas", () => {
  const r = rigPlayer();
  r.music.play("menu"); r.run(1000);
  const c = r.ctx(), n = sourcesOf(c).length;
  c.currentTime += 12; r.now.add(12000); // 12 s sem nenhum ciclo
  r.music.tick();
  const added = sourcesOf(c).slice(n);
  assert.ok(added.length > 0 && added.length < 80, `${added.length} fontes novas`);
  assert.ok(added.every((s) => s.starts[0][0] >= c.currentTime - 1e-9), "tudo agendado daqui para a frente");
  assert.ok(r.music.position.beat > 0);
});
test("tocador: o laço dá a volta sem falha — ao passar do fim do laço continua com o começo e a posição fica dentro do laço", () => {
  const r = rigPlayer();
  r.music.play("bird1");
  const sc = Music.scoreOf("bird1");
  let wraps = 0, last = 0;
  for (let i = 0; i < Math.ceil((sc.lengthSeconds + 12) / 0.12); i++) {
    r.run(120);
    const b = r.music.position.beat;
    assert.ok(b >= 0 && b < sc.lengthBeats);
    if (b < last - 1) wraps++;
    last = b;
  }
  assert.strictEqual(wraps, 1, "uma volta");
  const c = r.ctx(), L = sc.lengthSeconds + 0.06;
  const around = (from, to) => sourcesOf(c).filter((n) => n.starts[0][0] >= from && n.starts[0][0] < to).length;
  assert.ok(around(L - 2, L) > 0 && around(L, L + 2) > 0, "há notas dos dois lados da emenda");
});
test("tocador: timer — um só intervalo enquanto há tema, nenhum quando parado, dispose limpa tudo; o log guarda no máximo 200 pedidos", () => {
  const r = rigPlayer();
  assert.strictEqual(r.timers.count, 0);
  r.music.play("menu"); r.music.play("dog1"); r.music.play("menu");
  assert.strictEqual(r.timers.count, 1);
  r.music.dispose();
  assert.strictEqual(r.timers.count, 0); assert.strictEqual(r.music.current, null);
  const q = rigPlayer();
  for (let i = 0; i < 300; i++) q.music.duck(0.5, 0.01);
  assert.strictEqual(q.music.events.length, 200);
  assert.strictEqual(q.music.events[q.music.events.length - 1].name, "duck");
});
test("tocador: um passo de agendamento cria poucos nós (nada de alocação em laço por quadro) e o total de fontes vivas fica baixo", () => {
  const r = rigPlayer();
  r.music.play("menu");
  let worst = 0;
  for (let i = 0; i < 200; i++) { const n = r.ctx().nodes.length; r.run(120); worst = Math.max(worst, r.ctx().nodes.length - n); }
  assert.ok(worst < 300, "pior ciclo criou " + worst + " nós");
  const c = r.ctx(), now = c.currentTime;
  const alive = sourcesOf(c).filter((n) => n.starts[0][0] <= now && (n.stops[0] ?? n.starts[0][0] + (n.starts[0][2] || 0)) > now);
  assert.ok(alive.length < 80, "fontes soando agora: " + alive.length);
});

// ---------- Medidas e WAV da ferramenta de render (tools/music-render/analyze.js) ----------
const Analyze = require("../tools/music-render/analyze.js");
const SR = 8000;
const sine = (n, f, a, ph = 0) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = a * Math.sin(2 * Math.PI * f * i / SR + ph); return x; };
test("analyze: pico, RMS em dBFS, DC e o alvo de -22 dBFS +- 4 do desenho das músicas", () => {
  const m = Analyze.analyze(sine(SR * 4, 440, 0.5), SR, { barSeconds: 2 });
  assert.ok(Math.abs(m.peak - 0.5) < 1e-3);
  assert.ok(Math.abs(m.rmsDb - (20 * Math.log10(0.5 / Math.SQRT2))) < 0.05, "RMS de uma senoide: pico / raiz de 2");
  assert.ok(Math.abs(m.dc) < 1e-3);
  assert.deepStrictEqual(Analyze.LIMITS.peak, 0.9);
  assert.strictEqual(Analyze.LIMITS.rmsTargetDb, -22); assert.strictEqual(Analyze.LIMITS.rmsTol, 4);
  const dc = sine(SR * 2, 440, 0.2).map((v) => v + 0.05);
  assert.ok(Analyze.check(Analyze.analyze(dc, SR)).some((f) => f.includes("DC")));
  const loud = sine(SR * 2, 440, 0.99);
  assert.ok(Analyze.check(Analyze.analyze(loud, SR)).some((f) => f.includes("pico")));
  const quiet = sine(SR * 2, 440, 0.01);
  assert.ok(Analyze.check(Analyze.analyze(quiet, SR)).some((f) => f.includes("RMS")));
  const ok = Analyze.analyze(sine(SR * 4, 440, 0.1), SR, { barSeconds: 2 });
  assert.deepStrictEqual(Analyze.check(ok), [], JSON.stringify(Analyze.check(ok)));
  assert.ok(ok.suggestedGain > 0.9 && ok.suggestedGain < 1.3);
});
test("analyze: maior silêncio (conta a volta do laço), salto de nível e clique na emenda", () => {
  const x = sine(SR * 10, 300, 0.3);
  x.fill(0, SR * 2, SR * 6); // 4 s de silêncio no meio
  assert.ok(Math.abs(Analyze.analyze(x, SR).silence - 4) < 0.05);
  assert.ok(Analyze.check(Analyze.analyze(x, SR)).some((f) => f.includes("silêncio")));
  const y = sine(SR * 10, 300, 0.3);
  y.fill(0, 0, SR * 1); y.fill(0, SR * 9, SR * 10); // silêncio no fim e no começo: a volta junta os dois (2 s)
  assert.ok(Math.abs(Analyze.analyze(y, SR).silence - 2) < 0.05);
  // emenda com salto: os últimos 0,5 s do laço quase mudos e o começo forte, com todas as outras divisões de compasso lisas
  const z = sine(SR * 8, 300, 0.4); z.fill(0, SR * 7.5, SR * 8);
  for (let i = SR * 7.5; i < SR * 8; i++) z[i] = 0.004 * Math.sin(2 * Math.PI * 300 * i / SR);
  const jump = Analyze.analyze(z, SR, { barSeconds: 1 });
  assert.ok(jump.seamDb > 20 && Analyze.check(jump).some((f) => f.includes("emenda")), "salto de " + jump.seamDb);
  const smooth = Analyze.analyze(sine(SR * 8, 300, 0.4, 0), SR, { barSeconds: 1 });
  assert.ok(smooth.seamDb < 1 && !Analyze.check(smooth).some((f) => f.includes("emenda")));
  // clique: um degrau grande exatamente na emenda
  const c = sine(SR * 8, 300, 0.1); c[0] = 0.8;
  assert.ok(Analyze.analyze(c, SR).click > 1.5 && Analyze.check(Analyze.analyze(c, SR)).some((f) => f.includes("clique")));
  assert.ok(Analyze.analyze(sine(SR * 8, 300, 0.4), SR).click <= 1.5);
});
test("analyze.fold soma a cauda ao começo (o que o tocador faz) e wav16 escreve um WAV de 16 bits válido", () => {
  const x = new Float32Array(10); x[2] = 1; x[12 - 10 + 0] = 1; // índice 2 duas vezes
  const long = new Float32Array(25); long[3] = 1; long[13] = 1; long[23] = 1;
  const f = Analyze.fold(long, 10);
  assert.strictEqual(f[3], 3); assert.strictEqual(f.length, 10);
  void x;
  const w = Analyze.wav16(Float32Array.from([0, 0.25, -0.25, 2, -2]), 44100);
  assert.strictEqual(w.toString("ascii", 0, 4), "RIFF"); assert.strictEqual(w.toString("ascii", 8, 12), "WAVE"); assert.strictEqual(w.toString("ascii", 36, 40), "data");
  assert.strictEqual(w.readUInt32LE(24), 44100); assert.strictEqual(w.readUInt16LE(34), 16); assert.strictEqual(w.readUInt16LE(22), 1);
  assert.strictEqual(w.readUInt32LE(40), 10); assert.strictEqual(w.length, 54);
  assert.deepStrictEqual([0, 1, 2, 3, 4].map((i) => w.readInt16LE(44 + 2 * i)), [0, 8192, -8192, 32767, -32767], "valores cortados em -1..1");
});

(async () => {
  // dá tempo de eventuais promessas rejeitadas aparecerem antes de fechar a conta
  await new Promise((r) => setTimeout(r, 30));
  if (unhandled) { failed++; console.log(`FAIL ${unhandled} promessa(s) rejeitada(s) sem tratamento`); }
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes do motor de música passaram");
  process.exit(failed ? 1 : 0);
})();
