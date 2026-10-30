// Músicas tema do jogo, todas SINTETIZADAS na hora com a Web Audio API (osciladores, filtros, envelopes e ruído). Não existe nenhum arquivo de áudio,
// nenhuma biblioteca e nenhuma rede. Funciona no navegador (window.Music) e no Node (testes). O contrato completo (chaves da receita, instrumentos,
// padrões, tocador) está em docs/MUSICA.md.
//
// Uso no jogo:
//   Music.register([...receitas...]);                 // js/music-dog.js etc. chamam isto; o mesmo id registrado depois substitui o anterior
//   const musica = Music.create({ sound: som, storage: window.localStorage });
//   musica.play("dog7");                              // troca de tema com crossfade; o mesmo id não reinicia; só soa depois do primeiro gesto (unlock do Sound)
//   musica.duck(0.25, 0.8);                           // abaixa por 0,8 s e volta
//   musica.stop(0.5);                                 // some em 0,5 s
//   musica.setEnabled(false);                         // botão "Música": guarda a preferência em "cachorrinho.musica.v1"
//
// Como é feito:
//   1. Music.score(receita) é uma função PURA e determinística (gerador com semente por tema): devolve a partitura { bpm, bars, lengthSeconds, events:[...] }.
//   2. Music.render(partitura, ctx, destino, t0, opts) agenda o laço (ou uma janela [from,to) em batidas) em qualquer BaseAudioContext, como Sound.render:
//      o tocador o chama aos pedaços (antecedência curta), os testes e a ferramenta de render o chamam num AudioContext falso ou num OfflineAudioContext real.
//   3. Music.create({...}) é o tocador (barramento próprio, crossfade, duck, pausa, mudo, preferência, agendador por setInterval).
// O gerador nunca usa números aleatórios do sistema nem o relógio: o mesmo tema soa igual toda vez.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Music = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const KEY = "cachorrinho.musica.v1";   // preferência guardada: {"on":0|1}
  const MAX_VOICES = 14;                 // vozes (notas soando) ao mesmo tempo, no máximo
  const MIN_LOOP_SECONDS = 40, MAX_LOOP_SECONDS = 100;
  const FLOOR = 1e-4;                    // piso das rampas exponenciais
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  const round6 = (x) => Math.round(x * 1e6) / 1e6;
  const mod = (a, n) => ((a % n) + n) % n;

  // ---------- Sorteio determinístico ----------
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  const mix = (a, b) => (Math.imul((a >>> 0) ^ Math.imul((b >>> 0) + 0x9e3779b1, 0x85ebca6b), 0xc2b2ae35) ^ (a >>> 7)) >>> 0;
  function makeRng(seed) {
    const next = mulberry32(seed);
    return {
      seed: seed >>> 0,
      next,
      int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },   // inteiro em [lo, hi]
      pick(arr) { return arr[Math.floor(next() * arr.length)]; },
      chance(p) { return next() < p; },
      fork(label) { return makeRng(mix(seed, typeof label === "number" ? label : hashString(String(label)))); },
    };
  }

  // ---------- Escalas ----------
  const MODES = Object.freeze({
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10], pentMajor: [0, 2, 4, 7, 9], pentMinor: [0, 3, 5, 7, 10],
    harmMinor: [0, 2, 3, 5, 7, 8, 11], blues: [0, 3, 5, 6, 7, 10],
  });
  const KEYS = Object.freeze({ C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 });
  // Escala de um tom/modo: { pc (0..11), steps (semitons do modo), len, pcs (classes de altura permitidas) }
  function scaleInfo(key, mode) {
    if (!Object.prototype.hasOwnProperty.call(KEYS, key) || !Object.prototype.hasOwnProperty.call(MODES, mode)) return null;
    const pc = KEYS[key], steps = MODES[mode];
    return { pc, steps, len: steps.length, pcs: new Set(steps.map((s) => (pc + s) % 12)) };
  }
  // grau (inteiro, pode ser negativo ou >= len = oitava acima) -> nota MIDI; `oct` é a oitava (C4 = 60) em que o grau 0 (a tônica) fica
  function degMidi(sc, deg, oct) {
    return 12 * (oct + 1) + sc.pc + 12 * Math.floor(deg / sc.len) + sc.steps[mod(deg, sc.len)];
  }
  // graus [lo, hi] cujas notas ficam a `semLo`..`semHi` semitons da tônica da oitava `oct`
  function degWindow(sc, oct, semLo, semHi) {
    const T = degMidi(sc, 0, oct);
    let lo = null, hi = null;
    for (let d = -3 * sc.len; d <= 4 * sc.len; d++) {
      const m = degMidi(sc, d, oct);
      if (m >= T + semLo && m <= T + semHi) { if (lo === null) lo = d; hi = d; }
    }
    return [lo, hi];
  }
  function foldDeg(d, lo, hi, len) { while (d > hi) d -= len; while (d < lo) d += len; return d; }
  function nearestTone(tones, len, target, lo, hi) { // nota do acorde (em qualquer oitava) mais perto de `target` dentro de [lo, hi]
    let best = null, bestCost = Infinity;
    for (const t of tones) for (let k = -3; k <= 3; k++) {
      const d = t + k * len;
      if (d < lo || d > hi) continue;
      const cost = Math.abs(d - target);
      if (cost < bestCost) { bestCost = cost; best = d; }
    }
    return best === null ? foldDeg(target, lo, hi, len) : best;
  }

  // ---------- Compasso ----------
  // `beats` da receita: 4 (4/4), 3 (3/4) ou 6 (6/8 "em 2"). A unidade do tempo (a "batida") é o pulso do `bpm`: semínima em 4/4 e 3/4, semínima pontuada em 6/8.
  function meterOf(beats) {
    if (beats === 6) return { beats: 6, barBeats: 2, steps: 6, stepBeats: 1 / 3, compound: true, cls: "6" };
    if (beats === 3) return { beats: 3, barBeats: 3, steps: 6, stepBeats: 0.5, compound: false, cls: "3" };
    return { beats: 4, barBeats: 4, steps: 8, stepBeats: 0.5, compound: false, cls: "4" };
  }

  // ---------- Listas aceitas ----------
  const FORM_LETTERS = "ABCDEFGH";
  const CONTOURS = Object.freeze(["arch", "rise", "fall", "wave", "hop"]);
  const BASS_PATTERNS = Object.freeze(["walk", "rootfifth", "pedal", "offbeat", "sync", "pizz", "waltz"]);
  const ARP_SHAPES = Object.freeze(["up", "down", "updown", "broken", "alberti"]);
  const PERC_KITS = Object.freeze(["woodblock", "brush", "shaker", "softkick", "hat"]);
  const PERC_PATTERNS = Object.freeze(["steady", "offbeat", "backbeat", "polka", "shuffle", "driving", "sparse", "heartbeat", "brush2", "waltz"]);
  const AMBIENCES = Object.freeze(["wind", "crickets", "rain", "water"]);
  // instrumento -> papel (para qual voz serve): "tone" melódico, "bass", "perc", "amb"
  const INSTRUMENTS = Object.freeze({
    pluck: "tone", marimba: "tone", xylo: "tone", flute: "tone", bell: "tone", celesta: "tone", harp: "tone", organ: "tone", strings: "tone",
    bass: "bass", bassSine: "bass", bassSaw: "bass", contrabass: "bass",
    woodblock: "perc", softkick: "perc", brush: "perc", shaker: "perc", hat: "perc",
    wind: "amb", crickets: "amb", rain: "amb", water: "amb",
  });
  const isToneInst = (n) => INSTRUMENTS[n] === "tone" || INSTRUMENTS[n] === "bass"; // melodia/acordes podem usar timbres de baixo também

  // ---------- Receita: validação e valores padrão ----------
  const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };
  // "I vi IV V7" -> [{ root (índice do grau, 0 = tônica), seventh }]; null se algum símbolo é inválido. Maiúscula ou minúscula tanto faz: a qualidade vem do modo.
  function parseProg(src) {
    const list = Array.isArray(src) ? src.map(String) : String(src).trim().split(/[\s,]+/).filter(Boolean);
    const out = [];
    for (const tok of list) {
      const m = /^([ivIV]+|[1-7])(7?)$/.exec(tok);
      if (!m) return null;
      const n = /^\d$/.test(m[1]) ? Number(m[1]) : ROMAN[m[1].toUpperCase()];
      if (!n) return null;
      out.push({ root: n - 1, seventh: m[2] === "7" });
    }
    return out.length ? out : null;
  }
  const DEFAULT_PROG = { major: "I vi IV V", lydian: "I II vi V", mixolydian: "I VII IV I", pentMajor: "I V II IV", minor: "I VI VII V", dorian: "I IV I VII",
    phrygian: "I II I VII", pentMinor: "I IV V I", harmMinor: "I IV V I", blues: "I IV I V" };

  // Confere a receita e devolve { problems: [texto...], R: receita normalizada (com todos os padrões) }. R só vale se não houver problemas.
  function check(r) {
    const problems = [], bad = (m) => { problems.push(m); };
    if (!r || typeof r !== "object" || Array.isArray(r)) return { problems: ["a receita precisa ser um objeto"], R: null };
    const num = (v, def, lo, hi, name, int) => {
      if (v === undefined || v === null) return def;
      if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi || (int && !Number.isInteger(v))) {
        bad(`${name} precisa ser ${int ? "um inteiro" : "um número"} entre ${lo} e ${hi}`);
        return def;
      }
      return v;
    };
    const R = { raw: r };
    if (typeof r.id === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,30}$/.test(r.id)) R.id = r.id; else { bad("id precisa ser um texto como \"dog7\""); R.id = "x"; }
    R.animal = ["dog", "cat", "bird", "menu"].includes(r.animal) ? r.animal : (r.animal === undefined ? "menu" : (bad("animal precisa ser dog, cat, bird ou menu"), "menu"));
    R.place = typeof r.place === "string" ? r.place : "";
    const key = r.key === undefined ? "C" : r.key, mode = r.mode === undefined ? "major" : r.mode;
    R.scale = scaleInfo(key, mode);
    if (!R.scale) { bad(`tom/modo desconhecido (${String(key).slice(0, 8)} ${String(mode).slice(0, 12)})`); R.scale = scaleInfo("C", "major"); }
    R.key = key; R.mode = mode;
    R.bpm = num(r.bpm, 100, 50, 200, "bpm");
    R.beatsPerBar = r.beats === undefined ? 4 : r.beats;
    if (![3, 4, 6].includes(R.beatsPerBar)) { bad("beats precisa ser 3, 4 ou 6"); R.beatsPerBar = 4; }
    R.meter = meterOf(R.beatsPerBar);
    R.swing = num(r.swing, 0, 0, 0.6, "swing");
    R.bars = num(r.bars, 32, 8, 64, "bars", true);
    const formSrc = r.form === undefined ? "ABAB" : r.form;
    if (typeof formSrc !== "string" || !/^[A-H]{2,8}$/.test(formSrc)) { bad("form precisa ser letras de A a H, de 2 a 8 seções (ex.: \"AABA\")"); R.form = ["A", "B", "A", "B"]; } else R.form = formSrc.split("");
    R.secBars = R.bars / R.form.length;
    if (!Number.isInteger(R.secBars) || R.secBars < 2) { bad("bars precisa ser divisível pelo número de seções de form, com seções de 2 compassos ou mais"); R.secBars = Math.max(2, Math.floor(R.bars / R.form.length)); }
    R.lengthBeats = R.bars * R.meter.barBeats;
    R.lengthSeconds = R.lengthBeats * 60 / R.bpm;
    if (R.lengthSeconds < MIN_LOOP_SECONDS || R.lengthSeconds > MAX_LOOP_SECONDS) bad(`o laço dura ${R.lengthSeconds.toFixed(1)} s e precisa durar de ${MIN_LOOP_SECONDS} a ${MAX_LOOP_SECONDS} s`);
    R.intensity = num(r.intensity, 0.6, 0, 1, "intensity");
    R.gain = num(r.gain, 1, 0.3, 2, "gain");
    R.maxSilence = num(r.maxSilence, 3, 0.5, 20, "maxSilence");

    // progressões: texto único, ou objeto por letra de seção ({ A: "...", B: "...", default: "..." })
    R.progs = {};
    const pr = r.prog === undefined || r.prog === null ? DEFAULT_PROG[mode] : r.prog;
    const progFor = (letter) => {
      let src = pr;
      if (pr && typeof pr === "object" && !Array.isArray(pr)) src = pr[letter] !== undefined ? pr[letter] : (pr.default !== undefined ? pr.default : pr.A);
      const p = src === undefined ? null : parseProg(src);
      if (!p) { bad(`prog da seção ${letter} inválida (use graus como "I vi IV V7")`); return parseProg(DEFAULT_PROG.major); }
      if (p.length > R.secBars) bad(`prog da seção ${letter} tem mais acordes (${p.length}) que compassos (${R.secBars})`);
      return p;
    };
    for (const l of R.form) if (!R.progs[l]) R.progs[l] = progFor(l);

    // motivo
    const m = r.motif && typeof r.motif === "object" ? r.motif : {};
    R.motif = { seed: 0, bars: num(m.bars, 2, 1, 4, "motif.bars", true), contour: m.contour === undefined ? "arch" : m.contour, leaps: num(m.leaps, 0.3, 0, 1, "motif.leaps"),
      rests: num(m.rests, 0.2, 0, 1, "motif.rests"), density: num(m.density, 0.5, 0, 1, "motif.density"), rhythm: null };
    if (!CONTOURS.includes(R.motif.contour)) { bad("motif.contour precisa ser " + CONTOURS.join(", ")); R.motif.contour = "arch"; }
    R.seed = m.seed === undefined || m.seed === null ? hashString(R.id) : (typeof m.seed === "number" && Number.isFinite(m.seed) ? (m.seed >>> 0) : hashString(String(m.seed)));
    R.motif.seed = R.seed;
    const okPat = (p) => typeof p === "string" && /^[x.\-]+$/.test(p) && (p.length === R.meter.steps || p.length === 2 * R.meter.steps);
    const rh = m.rhythm;
    if (rh !== undefined && rh !== null) {
      const toList = (v) => (Array.isArray(v) ? v : String(v).trim().split(/\s+/));
      const bag = (v, name) => {
        const list = toList(v);
        if (!list.length || !list.every(okPat)) { bad(`${name} precisa ter padrões de ${R.meter.steps} (ou ${2 * R.meter.steps}) caracteres "x" (nota), "-" (segura) e "." (pausa), um por compasso`); return null; }
        return list;
      };
      if (typeof rh === "object" && !Array.isArray(rh)) {
        R.motif.rhythm = {};
        for (const k of Object.keys(rh)) R.motif.rhythm[k] = bag(rh[k], "motif.rhythm." + k);
        if (!R.motif.rhythm.A) bad("motif.rhythm por letra precisa ter a letra A");
      } else R.motif.rhythm = bag(rh, "motif.rhythm");
      const first = Array.isArray(R.motif.rhythm) ? R.motif.rhythm : R.motif.rhythm && R.motif.rhythm.A;
      if (first && first[0][0] !== "x") bad("o primeiro padrão de motif.rhythm precisa começar em \"x\"");
    }

    // vozes
    const v = r.voices && typeof r.voices === "object" ? r.voices : {};
    const inst = (val, def, name, okFn) => { if (val === undefined || val === null) return def; if (typeof val === "string" && Object.prototype.hasOwnProperty.call(INSTRUMENTS, val) && okFn(val)) return val; bad(`${name}: instrumento inválido (${String(val).slice(0, 14)})`); return def; };
    const vox = (spec, name, defInst, defOct, defVel, defFrom, okFn) => {
      const s = spec && typeof spec === "object" ? spec : {};
      return { inst: inst(s.inst, defInst, name + ".inst", okFn), oct: num(s.oct, defOct, 1, 7, name + ".oct", true), vel: num(s.vel, defVel, 0.05, 1, name + ".vel"), from: num(s.from, defFrom, 0, 1, name + ".from"), spec: s };
    };
    const tone = isToneInst;
    R.voices = {};
    const L = vox(v.lead, "lead", "marimba", 4, 0.8, 0, tone);
    if (v.lead === undefined || v.lead === null) bad("voices.lead é obrigatório");
    L.from = 0;
    const rot = Array.isArray(L.spec.rotate) ? L.spec.rotate : null;
    L.rotate = rot ? rot.map((e, i) => { const x = vox(Object.assign({ inst: L.inst, oct: L.oct, vel: L.vel }, e && typeof e === "object" ? e : {}), `lead.rotate[${i}]`, L.inst, L.oct, L.vel, 0, tone); return { inst: x.inst, oct: x.oct, vel: x.vel }; }) : null;
    if (L.rotate && !L.rotate.length) L.rotate = null;
    R.voices.lead = L;
    R.voices.counter = v.counter ? vox(v.counter, "counter", "flute", Math.max(1, L.oct - 1), 0.55, 0.6, tone) : null;
    if (R.voices.counter) R.voices.counter.above = v.counter.above === true; // true: contracanto agudo (descante), sempre acima da melodia
    R.voices.bass = v.bass === null ? null : vox(v.bass, "bass", "bass", 2, 0.8, 0, tone);
    if (R.voices.bass) {
      const p = v.bass && v.bass.pattern !== undefined ? v.bass.pattern : "rootfifth";
      if (!BASS_PATTERNS.includes(p)) { bad("bass.pattern precisa ser " + BASS_PATTERNS.join(", ")); R.voices.bass.pattern = "rootfifth"; } else R.voices.bass.pattern = p;
    }
    R.voices.pad = v.pad ? vox(v.pad, "pad", "strings", 3, 0.5, 0.35, tone) : null;
    if (v.arp) {
      const A = vox(v.arp, "arp", "harp", L.oct, 0.55, 0.5, tone);
      A.rate = num(v.arp.rate, R.meter.compound ? 3 : 2, 0.5, 6, "arp.rate");
      const sh = v.arp.shape === undefined ? "up" : v.arp.shape;
      if (!ARP_SHAPES.includes(sh)) { bad("arp.shape precisa ser " + ARP_SHAPES.join(", ")); A.shape = "up"; } else A.shape = sh;
      if (Math.abs(A.rate * R.meter.barBeats - Math.round(A.rate * R.meter.barBeats)) > 1e-9) bad("arp.rate vezes os tempos do compasso precisa dar um número inteiro de notas");
      R.voices.arp = A;
    } else R.voices.arp = null;
    if (v.perc) {
      const P = { vel: num(v.perc.vel, 0.6, 0.05, 1, "perc.vel"), from: num(v.perc.from, 0.25, 0, 1, "perc.from") };
      const kits = Array.isArray(v.perc.kit) ? v.perc.kit : [v.perc.kit === undefined ? "woodblock" : v.perc.kit];
      if (!kits.length || kits.length > 2 || !kits.every((k) => PERC_KITS.includes(k))) { bad("perc.kit precisa ser " + PERC_KITS.join(", ") + " (ou uma lista [grave, agudo])"); P.kits = ["woodblock", "woodblock"]; } else P.kits = kits.length === 1 ? [kits[0], kits[0]] : kits.slice();
      const pat = v.perc.pattern === undefined ? "steady" : v.perc.pattern;
      if (!PERC_PATTERNS.includes(pat)) { bad("perc.pattern precisa ser " + PERC_PATTERNS.join(", ")); P.pattern = "steady"; } else P.pattern = pat;
      R.voices.perc = P;
    } else R.voices.perc = null;
    if (v.ambience) {
      const a = typeof v.ambience === "string" ? { kind: v.ambience } : v.ambience;
      if (!a || !AMBIENCES.includes(a.kind)) { bad("ambience precisa ser " + AMBIENCES.join(", ")); R.voices.ambience = null; } else R.voices.ambience = { kind: a.kind, vel: num(a.vel, 0.5, 0.05, 1, "ambience.vel") };
    } else R.voices.ambience = null;
    return { problems, R };
  }
  // Lista (vazia se tudo certo) o que está errado numa receita, em português.
  function validate(recipe) { return check(recipe).problems; }

  // ---------- Harmonia ----------
  const SECTION_BOOST = { A: -0.12, B: 0.15, C: 0.25, D: 0.1, E: 0.15, F: 0.15, G: 0.15, H: 0.15 };
  function chordTones(root, seventh) { return seventh ? [root, root + 2, root + 4, root + 6] : [root, root + 2, root + 4]; }
  // Um registro por compasso: { bar, sec, letter, occ, i (compasso dentro da seção), root, seventh, tones, level (0..1: quantas camadas entram), turn (último compasso) }
  function makeHarmony(R) {
    const sc = R.scale, H = [], seen = {};
    const fifth = sc.steps.indexOf(7) >= 0 ? sc.steps.indexOf(7) : Math.min(4, sc.len - 1);
    for (let sec = 0; sec < R.form.length; sec++) {
      const letter = R.form[sec];
      const occ = seen[letter] = seen[letter] === undefined ? 0 : seen[letter] + 1;
      const prog = R.progs[letter], level = clamp(R.intensity + (SECTION_BOOST[letter] ?? 0.1) + (occ > 0 ? 0.1 : 0), 0, 1);
      for (let i = 0; i < R.secBars; i++) {
        const c = prog[Math.min(prog.length - 1, Math.floor(i * prog.length / R.secBars))];
        H.push({ bar: sec * R.secBars + i, sec, letter, occ, i, root: c.root, seventh: c.seventh, level, turn: false });
      }
    }
    const last = H[H.length - 1];
    last.root = fifth; last.seventh = true; last.turn = true; // o último compasso é o dominante: conduz de volta ao começo do laço
    for (const h of H) h.tones = chordTones(h.root, h.seventh);
    return H;
  }

  // ---------- Ritmo e contorno do motivo ----------
  // padrões por compasso: "x" nota, "-" segura a anterior, "." pausa. Passos = colcheias (6/8: 3 por pulso).
  const CELLS = {
    "4": { open: ["x-x-x-x-", "x-xxx-x-", "x--xx-x-", "xx-xx-x-", "x-x-xx-x", "x-xx-xx-", "xxxx-x-x", "x-x-xxxx", "x---x-x-", "x-xxx-xx"],
      close: ["x-x-x---", "x-xx-x--", "x--x-x--", "xx-x----", "x-x-----", "x-xxx---", "x---x---"] },
    "3": { open: ["x-x-x-", "x--x-x", "x-xx-x", "x-x-xx", "xx-x-x", "x-xxx-"], close: ["x-x---", "x--x--", "x-xx--", "xx-x--", "x-----"] },
    "6": { open: ["x--x--", "x-xx-x", "xxxxxx", "x-xxxx", "xx-x-x", "x--xx-", "x-x-x-"], close: ["x--x--", "x-x---", "x-xx--", "x-----", "xx-x--"] },
  };
  const countX = (p) => (p.match(/x/g) || []).length;
  function pickCell(list, density, rng) {
    const sorted = list.slice().sort((a, b) => countX(a) - countX(b) || (a < b ? -1 : 1));
    const i = clamp(Math.round(density * (sorted.length - 1)) + rng.int(-1, 1), 0, sorted.length - 1);
    return sorted[i];
  }
  // muda de leve um padrão dado (para as seções contrastantes): troca de lugar uma nota que não é a primeira
  function mutateCell(p, rng) {
    const a = p.split(""), idx = [];
    for (let i = 1; i < a.length; i++) if (a[i] === "x" && a[i - 1] === "-") idx.push(i);
    if (!idx.length) return p;
    const i = rng.pick(idx);
    if (a[i - 1] === "-" && i + 1 < a.length && a[i + 1] !== "x") { a[i] = "-"; a[i + 1] = "x"; }
    else if (a[i - 1] === "-") { a[i] = "-"; a[i - 1] = "x"; }
    return a.join("");
  }
  function contrast(contour, li) {
    const t = [null, { arch: "wave", rise: "fall", fall: "rise", wave: "arch", hop: "wave" }, { arch: "hop", rise: "arch", fall: "wave", wave: "rise", hop: "fall" }, { arch: "fall", rise: "wave", fall: "hop", wave: "hop", hop: "rise" }];
    return li === 0 ? contour : t[li % 4 === 0 ? 1 : li % 4][contour];
  }
  // Curva desejada (em graus, a partir de 0) de cada contorno
  function contourCurve(contour, n, leaps) {
    const amp = 2 + leaps * 2.5, c = [];
    for (let i = 0; i < n; i++) {
      const x = n > 1 ? i / (n - 1) : 0;
      if (contour === "rise") c.push(amp * 1.4 * x);
      else if (contour === "fall") c.push(-amp * 1.4 * x);
      else if (contour === "wave") c.push(amp * 0.8 * Math.sin(2 * Math.PI * x));
      else if (contour === "hop") c.push((i % 2 ? amp * 0.9 : 0) + x);
      else c.push(amp * Math.sin(Math.PI * x));
    }
    return c;
  }
  // Passeio que segue a curva: a cada nota escolhe, com pesos, o passo (em graus) mais perto do que a curva pede; passos de 2 ou mais (saltos) crescem com `leaps`.
  function walkOffsets(curve, leaps, rng, start) {
    const maxStep = 1 + Math.round(leaps * 3), offs = [start];
    for (let i = 1; i < curve.length; i++) {
      const cur = offs[i - 1], want = curve[i] - cur, w = [];
      let total = 0;
      for (let dlt = -maxStep; dlt <= maxStep; dlt++) {
        let wt = Math.exp(-Math.abs(dlt - want) * 1.1) * (dlt === 0 ? 0.3 : 1) * (Math.abs(dlt) >= 2 ? 0.45 + leaps : 1);
        if (dlt === 0 && i >= 2 && offs[i - 2] === cur) wt = 0; // nunca 3 notas iguais seguidas
        w.push(wt); total += wt;
      }
      let r = rng.next() * total, pick = 0;
      for (let q = 0; q < w.length; q++) { r -= w[q]; if (r <= 0) { pick = q; break; } }
      offs.push(cur + pick - maxStep);
    }
    return offs;
  }
  function contourOffsets(contour, n, leaps, rng) { return n <= 1 ? [0] : walkOffsets(contourCurve(contour, n, leaps), leaps, rng, 0); }
  // O motivo de uma seção: notas { u (batidas desde o começo do motivo), dur, j (passo no compasso), o (grau relativo à âncora) }
  function makeMotif(R, letter, li) {
    const M = R.meter, mb = R.motif.bars, rng = R.rng.fork("motivo" + li);
    let pats = null;
    const given = R.motif.rhythm;
    if (given) {
      if (Array.isArray(given)) pats = given.map((p, i) => (li > 0 && i === given.length - 1 ? mutateCell(p, rng) : p));
      else if (given[letter]) pats = given[letter];
      else pats = given.A.map((p) => mutateCell(p, rng));
    }
    if (!pats) {
      const set = CELLS[M.cls];
      pats = [];
      for (let bi = 0; bi < mb; bi++) pats.push(pickCell(bi === mb - 1 ? set.close : set.open, R.motif.density, rng));
    }
    const notes = [];
    for (let bi = 0; bi < mb; bi++) {
      const p = pats[bi % pats.length], unit = M.barBeats / p.length;
      for (let j = 0; j < p.length;) {
        if (p[j] !== "x") { j++; continue; }
        let k = j + 1;
        while (k < p.length && p[k] === "-") k++;
        notes.push({ u: round6(bi * M.barBeats + j * unit), dur: round6((k - j) * unit), j: Math.round(j * M.steps / p.length * 1000) / 1000, o: 0 });
        j = k;
      }
    }
    const kept = notes.filter((n, i) => i === 0 || n.j === 0 || !rng.chance(R.motif.rests * 0.55)); // pausas: some uma nota que não é do tempo forte
    const offs = contourOffsets(contrast(R.motif.contour, li), kept.length, R.motif.leaps, rng);
    kept.forEach((n, i) => { n.o = offs[i]; });
    return { notes: kept };
  }

  // ---------- Vozes da partitura ----------
  const LEAD_LIFT = [0, 2, 1, 3];
  function genLead(R, H) {
    const sc = R.scale, len = sc.len, M = R.meter, L = R.voices.lead, rot = L.rotate || [L];
    const [dLo, dHi] = degWindow(sc, L.oct, -4, 17);
    const letters = [];
    for (const l of R.form) if (!letters.includes(l)) letters.push(l);
    const motifs = {};
    letters.forEach((l, li) => { motifs[l] = makeMotif(R, l, li); });
    const mb = R.motif.bars, nPhr = Math.ceil(R.secBars / mb), centerBase = Math.round(len * 0.6);
    const events = [];
    let prevEnd = centerBase, pi = 0;
    for (let sec = 0; sec < R.form.length; sec++) {
      const letter = R.form[sec], li = letters.indexOf(letter), motif = motifs[letter], h0 = H[sec * R.secBars];
      const orn = R.rng.fork("orn" + sec);
      for (let p = 0; p < nPhr; p++) {
        const kk = p === nPhr - 1 && nPhr > 1 ? 3 : p % 4;
        const bar0 = sec * R.secBars + p * mb, secEndBeat = (sec + 1) * R.secBars * M.barBeats, tb = bar0 * M.barBeats;
        const phraseEnd = Math.min(tb + mb * M.barBeats, secEndBeat);
        const rng = R.rng.fork(`fraseL${li}-${p}`), entry = rot[pi % rot.length], shiftSemi = 12 * (entry.oct - L.oct);
        const h = H[bar0];
        const target = Math.round(0.6 * (centerBase + LEAD_LIFT[li % 4] + [0, -1, 1, -2][kk]) + 0.4 * prevEnd);
        const anchor = nearestTone(h.tones, len, target, dLo, dHi);
        const seq = motif.notes.filter((n) => tb + n.u < phraseEnd - 1e-9);
        // frase 0 = o motivo; as outras mantêm a primeira metade e refazem o final (resposta: termina aberta; desenvolvimento: sobe; cadência: volta ao grau de repouso)
        let offs = seq.map((n) => n.o);
        if (kk > 0 && seq.length >= 3) {
          const head = Math.ceil(seq.length / 2), last = offs[head - 1], m = seq.length - head;
          const end = kk === 1 ? last + rng.pick([1, 2]) : kk === 2 ? last + (li > 0 ? -2 : 2) : Math.min(last, 0) - 1, curve = [];
          for (let q = 0; q <= m; q++) curve.push(last + (end - last) * q / m);
          offs = offs.slice(0, head).concat(walkOffsets(curve, R.motif.leaps, rng, last).slice(1));
        }
        const degs = offs.map((o) => anchor + o);
        // notas dos tempos fortes vão para uma nota do acorde daquele compasso; a última da frase fecha conforme o tipo da frase
        const barOf = (t) => H[Math.min(H.length - 1, Math.floor((t + 1e-9) / M.barBeats))];
        const isStrong = (t) => { const x = mod(t, M.barBeats); return x < 1e-6 || (M.cls === "4" && Math.abs(x - 2) < 1e-6) || (M.cls === "6" && Math.abs(x - 1) < 1e-6); };
        const lastI = seq.length - 1;
        seq.forEach((n, i) => {
          const t = tb + n.u, hb = barOf(t);
          if (i === lastI) {
            const tones = hb.tones;
            degs[i] = kk === 3 ? nearestTone([hb.root], len, degs[i], dLo, dHi) : nearestTone(kk === 0 ? [tones[1], tones[2]] : kk === 1 ? [tones[2], tones[0]] : tones, len, degs[i], dLo, dHi);
          } else if (isStrong(t)) degs[i] = nearestTone(hb.tones, len, degs[i], dLo, dHi);
          degs[i] = foldDeg(degs[i], dLo, dHi, len);
        });
        for (let i = 1; i < degs.length; i++) {
          if (Math.abs(degs[i] - degs[i - 1]) > len - 1) degs[i] = foldDeg(degs[i] + (degs[i] < degs[i - 1] ? len : -len), dLo, dHi, len); // sem saltos de oitava causados pela dobra da faixa
          if (degs[i] === degs[i - 1] && !rng.chance(0.2)) { // nota repetida: a mais fraca dá um passo na direção do contorno (algumas repetições ficam, como num motivo de verdade)
            const dir = seq[i].o >= seq[i - 1].o ? 1 : -1, strongI = i === lastI || isStrong(tb + seq[i].u);
            if (!strongI) degs[i] = clamp(degs[i] + dir, dLo, dHi);
            else if (i > 1 && !isStrong(tb + seq[i - 1].u)) degs[i - 1] = clamp(degs[i - 1] - dir, dLo, dHi);
          }
        }
        seq.forEach((n, i) => {
          const t = tb + n.u, hb = barOf(t), last = i === seq.length - 1;
          let dur = n.dur;
          if (last) { // a última nota segura até o fim do compasso (com uma pequena respiração se há pausas)
            const barEnd = (Math.floor((t + 1e-9) / M.barBeats) + 1) * M.barBeats;
            dur = Math.max(dur, barEnd - t - (R.motif.rests > 0.3 ? M.stepBeats : 0));
          }
          dur = Math.min(dur, phraseEnd - t);
          const onBeat = Math.abs(t - Math.round(t)) < 1e-6, strong = Math.abs(mod(t, M.barBeats)) < 1e-6;
          const v = clamp(entry.vel * (0.82 + 0.18 * hb.level) * (strong ? 1.08 : onBeat ? 1 : 0.9) + (rng.next() - 0.5) * 0.06, 0.05, 1);
          events.push({ t: round6(t), d: round6(dur), midi: degMidi(sc, degs[i], L.oct) + shiftSemi, v: round6(v), voice: "lead", inst: entry.inst, kind: kk === 3 && last ? "cadence" : kk === 1 ? "answer" : kk === 2 ? "dev" : "motif", deg: degs[i], bar: hb.bar });
        });
        if (degs.length) prevEnd = degs[degs.length - 1];
        pi++;
      }
      // ornamento: nas repetições da mesma seção, algumas notas longas ganham uma nota de passagem no fim
      if (h0.occ > 0) {
        const lo = sec * R.secBars * M.barBeats, hi = lo + R.secBars * M.barBeats;
        for (let i = 0; i < events.length - 1; i++) {
          const e = events[i];
          if (e.t < lo || e.t >= hi || e.d < 1 - 1e-9 || e.kind === "cadence" || !orn.chance(0.3 + 0.2 * h0.level)) continue;
          const nxt = events[i + 1], dir = nxt.deg >= e.deg ? 1 : -1, deg = foldDeg(e.deg + dir, dLo, dHi, len);
          const keep = round6(e.d - M.stepBeats);
          if (keep <= 0 || nxt.t < e.t + e.d - 1e-9) continue;
          events.splice(i + 1, 0, { t: round6(e.t + keep), d: round6(M.stepBeats * 0.95), midi: degMidi(sc, deg, L.oct) + (e.midi - degMidi(sc, e.deg, L.oct)), v: round6(e.v * 0.85), voice: "lead", inst: e.inst, kind: "orn", deg, bar: e.bar });
          e.d = keep; i++;
        }
      }
    }
    // nunca 3 notas iguais seguidas (nem entre uma frase e outra): a do meio dá um passo para o lado
    for (let i = 2; i < events.length; i++) {
      const a = events[i - 2], b = events[i - 1], c = events[i];
      if (a.deg === b.deg && b.deg === c.deg) {
        const d = clamp(b.deg + (b.deg + 1 <= dHi ? 1 : -1), dLo, dHi);
        b.midi += degMidi(sc, d, L.oct) - degMidi(sc, b.deg, L.oct); b.deg = d; b.kind = "orn";
      }
    }
    // último compasso: segura uma nota na primeira metade e termina com uma escala curta que desemboca na primeira nota do laço
    const lastStart = (R.bars - 1) * M.barBeats, half = lastStart + M.barBeats / 2, barEnd = R.bars * M.barBeats;
    const kept = events.filter((e) => e.t < half - 1e-9);
    for (const e of kept) if (e.t + e.d > half) e.d = round6(half - e.t);
    const first = kept[0] || events[0];
    const k = M.compound ? 3 : 2, rng = R.rng.fork("pickup");
    let dir = rng.chance(0.5) ? 1 : -1;
    if (first.deg + dir * k > dHi || first.deg + dir * k < dLo) dir = -dir;
    const entry = rot[(pi - 1 + rot.length) % rot.length], lastInst = kept.length ? kept[kept.length - 1].inst : entry.inst;
    const shift = kept.length ? kept[kept.length - 1].midi - degMidi(sc, kept[kept.length - 1].deg, L.oct) : 0;
    for (let j = 0; j < k; j++) {
      const deg = first.deg + dir * (k - j);
      kept.push({ t: round6(barEnd - (k - j) * M.stepBeats), d: round6(M.stepBeats * 0.95), midi: degMidi(sc, deg, L.oct) + shift, v: round6(clamp(L.vel * 0.85, 0.05, 1)), voice: "lead", inst: lastInst, kind: "pickup", deg, bar: R.bars - 1 });
    }
    return kept;
  }

  function genCounter(R, H, lead, push) {
    const C = R.voices.counter;
    if (!C) return;
    const sc = R.scale, len = sc.len, M = R.meter, rng = R.rng.fork("contra");
    const [lo, hi] = degWindow(sc, C.oct, -6, 9);
    const slotsOf = { "4": [[[0, 4]], [[0, 2], [2, 2]]], "3": [[[0, 3]], [[0, 1.5], [1.5, 1.5]]], "6": [[[0, 2]], [[0, 1], [1, 1]]] }[M.cls];
    let prev = null;
    for (const h of H) {
      if (h.level < C.from) continue;
      const slots = h.turn || !rng.chance(0.35 + 0.4 * h.level) ? slotsOf[0] : slotsOf[1];
      const barStart = h.bar * M.barBeats;
      const inBar = lead.filter((e) => e.t >= barStart - 1e-9 && e.t < barStart + M.barBeats - 1e-9);
      const dirLead = inBar.length > 1 ? Math.sign(inBar[inBar.length - 1].midi - inBar[0].midi) : 0;
      for (const [off, dur] of slots) {
        const t = barStart + off;
        const under = lead.filter((e) => e.t < t + dur - 1e-9 && e.t + e.d > t + 1e-9);
        const leadMin = under.length ? Math.min(...under.map((e) => e.midi)) : Infinity, leadMax = under.length ? Math.max(...under.map((e) => e.midi)) : -Infinity;
        let best = null, bestCost = Infinity;
        for (const tn of h.tones) for (let k = -2; k <= 3; k++) {
          const d = tn + k * len;
          if (d < lo || d > hi) continue;
          const midi = degMidi(sc, d, C.oct);
          if (C.above ? midi < leadMax + 3 : midi > leadMin - 3) continue; // o contracanto fica abaixo da melodia (ou acima, se `above`)
          let cost = prev === null ? Math.abs(d - Math.round(len * 0.4)) : Math.abs(d - prev) + (Math.abs(d - prev) > 3 ? 2 : 0);
          if (prev !== null && dirLead !== 0 && Math.sign(d - prev) === -dirLead) cost -= 0.6;
          if (prev !== null && d === prev) cost += 0.8;
          if (cost < bestCost - 1e-9) { bestCost = cost; best = d; }
        }
        if (best === null) continue;
        prev = best;
        push({ t: round6(t), d: round6(dur * 0.96), midi: degMidi(sc, best, C.oct), v: round6(clamp(C.vel * (0.8 + 0.2 * h.level), 0.05, 1)), voice: "counter", inst: C.inst, kind: "counter", deg: best, bar: h.bar });
      }
    }
  }

  const BASS_TABLE = {
    rootfifth: { "4": [[0, "root", 2, 1], [2, "fifth", 2, 0.8], [4, "root", 2, 0.9], [6, "fifth", 2, 0.8]], "3": [[0, "root", 2, 1], [2, "fifth", 2, 0.8], [4, "fifth", 2, 0.7]], "6": [[0, "root", 3, 1], [3, "fifth", 3, 0.85]] },
    walk: { "4": [[0, "root", 2, 1], [2, "pass", 2, 0.8], [4, "fifth", 2, 0.9], [6, "approach", 2, 0.85]], "3": [[0, "root", 2, 1], [2, "third", 2, 0.8], [4, "approach", 2, 0.85]],
      "6": [[0, "root", 2, 1], [2, "third", 1, 0.75], [3, "fifth", 2, 0.9], [5, "approach", 1, 0.8]] },
    pedal: { "4": [[0, "root", 8, 1]], "3": [[0, "root", 6, 1]], "6": [[0, "root", 6, 1]] },
    offbeat: { "4": [[1, "root", 1, 0.8], [3, "root", 1, 0.7], [5, "fifth", 1, 0.8], [7, "root", 1, 0.7]], "3": [[1, "root", 1, 0.8], [3, "fifth", 1, 0.75], [5, "root", 1, 0.7]],
      "6": [[1, "root", 1, 0.75], [2, "fifth", 1, 0.7], [4, "root", 1, 0.75], [5, "fifth", 1, 0.7]] },
    sync: { "4": [[0, "root", 3, 1], [3, "root8", 2, 0.8], [6, "fifth", 2, 0.85]], "3": [[0, "root", 3, 1], [3, "fifth", 1, 0.8], [4, "third", 2, 0.8]],
      "6": [[0, "root", 2, 1], [2, "third", 1, 0.75], [3, "fifth", 2, 0.9], [5, "root8", 1, 0.7]] },
    pizz: { "4": [[0, "root", 3, 1], [3, "root8", 1, 0.5], [4, "fifth", 3, 0.85], [7, "approach", 1, 0.6]], "3": [[0, "root", 3, 1], [3, "fifth", 2, 0.8], [5, "approach", 1, 0.6]],
      "6": [[0, "root", 2, 1], [3, "fifth", 2, 0.85], [5, "approach", 1, 0.6]] },
    waltz: { "4": [[0, "root", 2, 1], [2, "fifth", 2, 0.8], [4, "root", 2, 0.9], [6, "fifth", 2, 0.8]], "3": [[0, "root", 2, 1], [2, "fifth8", 1, 0.55], [4, "fifth8", 1, 0.5]], "6": [[0, "root", 3, 1], [3, "fifth", 3, 0.8]] },
  };
  function genBass(R, H, push) {
    const B = R.voices.bass;
    if (!B) return;
    const sc = R.scale, len = sc.len, M = R.meter, rng = R.rng.fork("baixo");
    const [rLo, rHi] = degWindow(sc, B.oct, -5, 6), [nLo, nHi] = degWindow(sc, B.oct, -5, 18);
    const rootOf = (h) => foldDeg(h.root, rLo, rHi, len);
    for (let b = 0; b < H.length; b++) {
      const h = H[b];
      if (h.level < B.from) continue;
      const r = rootOf(h), nr = rootOf(H[(b + 1) % H.length]);
      for (const [st, role, ds, vm] of BASS_TABLE[B.pattern][M.cls]) {
        let d;
        switch (role) {
          case "root": d = r; break;
          case "third": d = r + 2; break;
          case "fifth": d = r + 4; break;
          case "root8": d = r + len; break;
          case "fifth8": d = r + 4 + len; break;
          case "pass": d = r + (nr > r ? 1 : nr < r ? -1 : (rng.chance(0.5) ? 1 : -1)); break;
          default: d = nr + (r > nr ? 1 : r < nr ? -1 : (rng.chance(0.5) ? 1 : -1)); // approach: uma nota da escala ao lado da raiz do próximo compasso
        }
        d = foldDeg(d, nLo, nHi, len);
        const t = b * M.barBeats + st * M.stepBeats, dur = ds * M.stepBeats * (B.pattern === "pedal" ? 1 : 0.92);
        push({ t: round6(t), d: round6(dur), midi: degMidi(sc, d, B.oct), v: round6(clamp(B.vel * vm * (0.85 + 0.15 * h.level), 0.05, 1)), voice: "bass", inst: B.inst, kind: role, deg: d, bar: b });
      }
    }
  }

  function genPad(R, H, push) {
    const P = R.voices.pad;
    if (!P) return;
    const sc = R.scale, len = sc.len, M = R.meter;
    const [lo, hi] = degWindow(sc, P.oct, -5, 14);
    let prev = null;
    for (let i = 0; i < H.length;) {
      const h = H[i];
      let j = i + 1;
      while (j < H.length && j - i < 2 && H[j].root === h.root && H[j].seventh === h.seventh && H[j].sec === h.sec) j++;
      if (h.level >= P.from) {
        const n = h.tones.length;
        let best = null, bestCost = Infinity;
        for (let inv = 0; inv < n; inv++) for (let k = -2; k <= 1; k++) {
          const v = h.tones.map((_, q) => h.tones[(inv + q) % n] + (inv + q >= n ? len : 0) + k * len).sort((a, b) => a - b);
          if (v[0] < lo || v[n - 1] > hi) continue;
          let cost;
          if (prev) { cost = 0; for (let q = 0; q < Math.min(n, prev.length); q++) cost += Math.abs(v[q] - prev[q]); } else cost = Math.abs(v[0] - Math.round(len * 0.2)) + inv * 0.1;
          if (cost < bestCost - 1e-9) { bestCost = cost; best = v; }
        }
        if (best) {
          prev = best;
          for (const d of best) push({ t: round6(i * M.barBeats), d: round6((j - i) * M.barBeats), midi: degMidi(sc, d, P.oct), v: round6(clamp(P.vel * (0.7 + 0.3 * h.level), 0.05, 1)), voice: "pad", inst: P.inst, kind: "chord", deg: d, bar: i });
        }
      }
      i = j;
    }
  }

  function genArp(R, H, push) {
    const A = R.voices.arp;
    if (!A) return;
    const sc = R.scale, len = sc.len, M = R.meter, rng = R.rng.fork("arpejo");
    const [lo, hi] = degWindow(sc, A.oct, -3, 17);
    const count = Math.round(A.rate * M.barBeats);
    for (const h of H) {
      if (h.level < A.from) continue;
      const r = mod(h.root, len), shift = r - h.root, tones = h.tones.map((t) => t + shift);
      const pool = tones.concat([tones[0] + len]); // acorde mais a oitava da raiz
      const order = { up: pool.map((_, i) => i), down: pool.map((_, i) => pool.length - 1 - i), updown: pool.map((_, i) => i).concat(pool.map((_, i) => pool.length - 2 - i).filter((i) => i > 0)),
        broken: [0, 2, 1, 2], alberti: [0, 2, 1, 2] }[A.shape];
      const lift = A.shape === "alberti" ? 1 : 0;
      for (let i = 0; i < count; i++) {
        if (i % Math.max(1, Math.round(A.rate)) !== 0 && rng.chance(Math.max(0, 0.45 - h.level * 0.4))) continue; // nos níveis baixos o arpejo tem falhas
        const idx = order[i % order.length];
        let d = pool[Math.min(idx, pool.length - 1)] + (lift && idx === 2 ? len : 0);
        d = foldDeg(d, lo, hi, len);
        const t = h.bar * M.barBeats + i / A.rate;
        push({ t: round6(t), d: round6(0.92 / A.rate), midi: degMidi(sc, d, A.oct), v: round6(clamp(A.vel * (0.75 + 0.25 * h.level) * (i % Math.max(1, Math.round(A.rate)) === 0 ? 1 : 0.8), 0.05, 1)), voice: "arp", inst: A.inst, kind: "arp", deg: d, bar: h.bar });
      }
    }
  }

  // percussão: [passo (colcheias; .5 = semicolcheia), papel, força, fantasma]
  const PERC_TABLE = {
    steady: { "4": [[0, "low", 1], [2, "high", 0.7], [4, "low", 0.9], [6, "high", 0.7]], "3": [[0, "low", 1], [2, "high", 0.65], [4, "high", 0.65]], "6": [[0, "low", 1], [3, "high", 0.8]] },
    offbeat: { "4": [[0, "low", 1], [1, "high", 0.6], [3, "high", 0.6], [4, "low", 0.9], [5, "high", 0.6], [7, "high", 0.6]], "3": [[0, "low", 1], [1, "high", 0.6], [3, "high", 0.6], [5, "high", 0.6]],
      "6": [[0, "low", 1], [1, "high", 0.5], [2, "high", 0.55], [3, "low", 0.8], [4, "high", 0.5], [5, "high", 0.55]] },
    backbeat: { "4": [[0, "low", 0.8], [2, "high", 1], [4, "low", 0.7], [6, "high", 1]], "3": [[0, "low", 0.8], [2, "high", 0.9], [4, "high", 0.9]], "6": [[0, "low", 0.8], [3, "high", 1]] },
    polka: { "4": [[0, "low", 1], [1, "high", 0.55, 1], [2, "low", 0.8], [3, "high", 0.55, 1], [4, "low", 0.9], [5, "high", 0.55, 1], [6, "low", 0.8], [7, "high", 0.55, 1]],
      "3": [[0, "low", 1], [1, "high", 0.55, 1], [2, "low", 0.8], [3, "high", 0.55, 1], [4, "low", 0.8], [5, "high", 0.55, 1]],
      "6": [[0, "low", 1], [1, "high", 0.5, 1], [2, "high", 0.55], [3, "low", 0.8], [4, "high", 0.5, 1], [5, "high", 0.55]] },
    shuffle: { "4": [0, 1, 2, 3, 4, 5, 6, 7].map((s) => [s, "high", s % 2 ? 0.5 : 0.8, s % 2 ? 1 : 0]), "3": [0, 1, 2, 3, 4, 5].map((s) => [s, "high", s % 2 ? 0.5 : 0.8, s % 2 ? 1 : 0]), "6": [0, 1, 2, 3, 4, 5].map((s) => [s, "high", s % 3 ? 0.5 : 0.85, s % 3 ? 1 : 0]) },
    driving: { "4": [[0, "low", 1], [1, "high", 0.45, 1], [2, "high", 0.9], [3, "high", 0.45, 1], [4, "low", 0.9], [5, "high", 0.45, 1], [6, "high", 0.9], [7, "high", 0.45, 1]],
      "3": [[0, "low", 1], [1, "high", 0.45, 1], [2, "high", 0.9], [3, "high", 0.45, 1], [4, "high", 0.9], [5, "high", 0.45, 1]],
      "6": [[0, "low", 1], [1, "high", 0.5, 1], [2, "high", 0.6], [3, "low", 0.9], [4, "high", 0.5, 1], [5, "high", 0.6]] },
    sparse: { "4": [[0, "low", 1], [5, "high", 0.6]], "3": [[0, "low", 1], [3, "high", 0.55]], "6": [[0, "low", 1]] },
    heartbeat: { "4": [[0, "low", 1], [3, "low", 0.7]], "3": [[0, "low", 1], [2.5, "low", 0.7]], "6": [[0, "low", 1], [2, "low", 0.7]] },
    brush2: { "4": [[0, "high", 0.8], [2, "high", 0.8], [3, "high", 0.5, 1], [4, "high", 0.8], [6, "high", 0.8], [7, "high", 0.5, 1]], "3": [[0, "high", 0.8], [2, "high", 0.8], [3, "high", 0.5, 1], [4, "high", 0.8]],
      "6": [[0, "high", 0.8], [2, "high", 0.5, 1], [3, "high", 0.8], [5, "high", 0.5, 1]] },
    waltz: { "4": [[0, "low", 1], [2, "high", 0.7], [4, "low", 0.9], [6, "high", 0.7]], "3": [[0, "low", 1], [2, "high", 0.6], [4, "high", 0.55]], "6": [[0, "low", 1], [3, "high", 0.8]] },
  };
  function genPerc(R, H, push) {
    const P = R.voices.perc;
    if (!P) return;
    const M = R.meter, rng = R.rng.fork("perc");
    const table = PERC_TABLE[P.pattern][M.cls];
    for (const h of H) {
      if (h.level < P.from) continue;
      const fill = h.i === R.secBars - 1 && !h.turn && h.level >= 0.45;
      const fillFrom = M.steps - 2;
      for (const [st, role, vel, ghost] of table) {
        if (ghost && h.level < 0.5) continue;
        if (fill && st >= fillFrom) continue;
        const inst = role === "low" ? P.kits[0] : P.kits[1];
        if (role === "high" && inst === "softkick") continue; // o bumbo só marca o grave
        push({ t: round6(h.bar * M.barBeats + st * M.stepBeats), d: round6(M.stepBeats * 0.5), midi: null, v: round6(clamp(P.vel * vel * (0.85 + 0.15 * h.level) + (rng.next() - 0.5) * 0.05, 0.05, 1)), voice: "perc", inst, kind: ghost ? "ghost" : role, bar: h.bar });
      }
      if (fill) { // virada no fim da seção: duas ou três batidas rápidas subindo de força
        const inst = P.kits[1] === "softkick" ? P.kits[0] : P.kits[1], n = M.compound ? 3 : 4;
        for (let q = 0; q < n; q++) {
          const t = h.bar * M.barBeats + M.barBeats - (n - q) * (2 * M.stepBeats / n);
          push({ t: round6(t), d: round6(M.stepBeats * 0.4), midi: null, v: round6(clamp(P.vel * (0.55 + 0.12 * q), 0.05, 1)), voice: "perc", inst, kind: "fill", bar: h.bar });
        }
      }
    }
  }

  function genAmbience(R, H, push) {
    const A = R.voices.ambience;
    if (!A) return;
    const M = R.meter, rng = R.rng.fork("ambiente"), spb = 60 / R.bpm, total = R.lengthBeats;
    const beats = (s) => s / spb;
    let t = beats(rng.next() * 2);
    const put = (d, v, extra) => push(Object.assign({ t: round6(t), d: round6(d), midi: null, v: round6(clamp(A.vel * v, 0.05, 1)), voice: "amb", inst: A.kind, kind: { wind: "gust", crickets: "chirp", rain: "patter", water: "drop" }[A.kind], bar: Math.floor(t / M.barBeats) }, extra));
    while (t < total - beats(0.5)) {
      let d, gap;
      if (A.kind === "wind") { d = beats(3 + rng.next() * 2.5); gap = beats(2.5 + rng.next() * 3.5); }
      else if (A.kind === "rain") { d = beats(3 + rng.next() * 2); gap = beats(1 + rng.next() * 2); }
      else if (A.kind === "crickets") { d = beats(1.1 + rng.next() * 0.5); gap = beats(1.2 + rng.next() * 2.5); }
      else { d = beats(0.3); gap = beats(0.4 + rng.next() * 1.8); }
      d = Math.min(d, total - t);
      if (d > beats(0.1)) put(d, 0.55 + rng.next() * 0.45, A.kind === "water" ? { f: round6(520 + rng.next() * 900) } : null);
      t += d + gap;
    }
  }

  // ---------- Acabamento: balanço (swing), limite de vozes, ordem ----------
  const VOICE_PRIORITY = { lead: 7, bass: 6, counter: 5, pad: 4, perc: 3, arp: 2, amb: 1 };
  // duração total que a nota soa (s), incluindo a cauda do instrumento: definida junto das vozes (LIFE)
  function limitVoices(all, bpm, lengthBeats, max) {
    const spb = 60 / bpm, L = lengthBeats * spb;
    // a ambiência nunca se sobrepõe a si mesma (uma fonte por vez): reserva uma vaga e não entra na disputa
    const amb = all.filter((e) => e.voice === "amb"), events = all.filter((e) => e.voice !== "amb");
    if (amb.length) max -= 1;
    const win = events.map((e) => ({ e, s: e.t * spb, end: e.t * spb + lifeOf(e.inst, e.d * spb, e.kind) }));
    // as caudas que passam do fim do laço entram no começo do laço seguinte: ocupam vozes como se fossem notas fixas
    const ghosts = win.filter((w) => w.end > L).map((w) => ({ s: 0, end: w.end - L, ghost: true }));
    const items = win.concat(ghosts).sort((a, b) => a.s - b.s || (b.ghost ? 1 : 0) - (a.ghost ? 1 : 0));
    const rank = (x) => (x.ghost ? Infinity : (VOICE_PRIORITY[x.e.voice] || 0) * 10 + x.e.v);
    let active = [], dropped = 0;
    const out = new Set();
    for (const w of items) {
      active = active.filter((a) => a.end > w.s + 1e-9);
      if (!w.ghost) {
        while (active.length >= max) { // sem vaga: sai a voz mais fraca (menor prioridade; na igualdade, a mais antiga) entre as que soam e a nova
          let victim = w, vp = rank(w);
          for (const a of active) { const rk = rank(a); if (rk < vp || (rk === vp && a.s < victim.s)) { vp = rk; victim = a; } }
          if (victim === w) break;
          active.splice(active.indexOf(victim), 1);
          out.add(victim.e); dropped++;
        }
        if (active.length >= max) { out.add(w.e); dropped++; continue; }
      }
      active.push(w);
    }
    return { kept: all.filter((e) => !out.has(e)), dropped };
  }
  // maior número de vozes soando ao mesmo tempo numa partitura (com as caudas que dão a volta no laço)
  function polyphony(score) {
    const spb = 60 / score.bpm, L = score.lengthBeats * spb;
    const w = score.events.map((e) => [e.t * spb, e.t * spb + lifeOf(e.inst, e.d * spb, e.kind)]);
    for (const x of w.slice()) if (x[1] > L) w.push([0, x[1] - L]);
    w.sort((a, b) => a[0] - b[0]);
    let active = [], max = 0;
    for (const x of w) { active = active.filter((end) => end > x[0] + 1e-9); active.push(x[1]); if (active.length > max) max = active.length; }
    return max;
  }

  function buildScore(R) {
    R.rng = makeRng(R.seed);
    const M = R.meter, sc = R.scale, H = makeHarmony(R);
    const raw = [];
    const push = (e) => { raw.push(e); };
    const lead = genLead(R, H);
    for (const e of lead) push(e);
    genCounter(R, H, lead, push);
    genBass(R, H, push);
    genPad(R, H, push);
    genArp(R, H, push);
    genPerc(R, H, push);
    genAmbience(R, H, push);
    // balanço: as colcheias de contratempo (t = ...,5) atrasam; vale para todas as vozes rítmicas
    const sw = R.swing && !M.compound ? R.swing * 0.25 : 0;
    const swung = (t) => (sw && Math.abs(t - Math.floor(t) - 0.5) < 1e-6 ? t + sw : t);
    for (const e of raw) {
      if (sw && e.voice !== "pad" && e.voice !== "amb") {
        const s = swung(e.t), end = swung(round6(e.t + e.d));
        e.t = round6(s); e.d = round6(Math.max(0.02, end - s));
      }
      e.t = round6(e.t); e.d = round6(e.d); e.v = round6(e.v);
    }
    // nada começa antes de 0 nem depois do fim do laço
    const inLoop = raw.filter((e) => e.t >= 0 && e.t < R.lengthBeats - 1e-9 && e.d > 0);
    const order = (a, b) => a.t - b.t || (VOICE_PRIORITY[b.voice] - VOICE_PRIORITY[a.voice]) || ((a.midi || 0) - (b.midi || 0));
    inLoop.sort(order);
    const lim = limitVoices(inLoop, R.bpm, R.lengthBeats, MAX_VOICES);
    const events = lim.kept;
    const byVoice = {};
    for (const e of events) byVoice[e.voice] = (byVoice[e.voice] || 0) + 1;
    const score = {
      id: R.id, animal: R.animal, place: R.place, key: R.key, mode: R.mode, bpm: R.bpm, beats: R.beatsPerBar, barBeats: M.barBeats, swing: R.swing,
      bars: R.bars, form: R.form.join(""), sectionBars: R.secBars, lengthBeats: R.lengthBeats, lengthSeconds: R.lengthSeconds, gain: R.gain, maxSilence: R.maxSilence,
      harmony: H.map((h) => ({ bar: h.bar, section: h.sec, letter: h.letter, level: round6(h.level), root: h.root, seventh: h.seventh, pcs: h.tones.map((d) => mod(sc.pc + sc.steps[mod(d, sc.len)], 12)) })),
      events,
      stats: { count: events.length, dropped: lim.dropped, byVoice },
    };
    score.stats.maxPolyphony = polyphony(score);
    return score;
  }
  // ---------- Vozes: instrumentos sintetizados ----------
  const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const NOISE_SECONDS = 1;

  // Ruído branco de 1 s, sempre igual (semente fixa): a música renderizada é reproduzível. Um por contexto.
  const noiseCache = typeof WeakMap === "function" ? new WeakMap() : null;
  function noiseBuffer(ctx) {
    let buf = noiseCache && noiseCache.get(ctx);
    if (buf) return buf;
    const rate = ctx.sampleRate || 44100, len = Math.round(rate * NOISE_SECONDS);
    buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0), next = mulberry32(0x5eed1234);
    for (let i = 0; i < len; i++) data[i] = next() * 2 - 1;
    if (noiseCache) noiseCache.set(ctx, buf);
    return buf;
  }

  // Envelope SEM CLIQUE (o mesmo de js/sound.js): começa em 0, sobe em `a` s até `peak`, cai exponencialmente até `peak * sus` (sus = 1 mantém a nota) e desce
  // linearmente a 0 nos últimos `r` s. Todo ganho de nota começa e termina em 0.
  function envelope(param, t, dur, peak, a, r, sus) {
    const end = t + dur, hold = Math.max(t + a, end - r), pk = Math.max(peak, 1e-5);
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(pk, t + a);
    param.exponentialRampToValueAtTime(Math.max(pk * sus, pk * FLOOR), hold);
    param.linearRampToValueAtTime(0, end);
  }

  // Ferramentas de uma chamada de render: `tone` e `noise` agendam osciladores e ruído em tempo ABSOLUTO (o.at) ligados a `dest`.
  //   tone: { at, dur, f, f2 (glissando), type, lp/lp2/q (passa-baixa e para onde varre), gain, a, r, sus, vib: [Hz, profundidade em Hz], vibDelay }
  //   noise: { at, dur, type ("bandpass"|"lowpass"|"highpass"), f, f2, q, lp, gain, a, r, sus, off }
  function makeKit(ctx, dest) {
    const kit = { ctx, dest, salt: 0 };
    kit.tone = (o) => {
      const t = o.at, dur = o.dur, a = Math.min(o.a ?? 0.01, dur * 0.4), r = Math.min(o.r ?? 0.03, dur * 0.5);
      const osc = ctx.createOscillator();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f2 && o.f2 !== o.f) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      if (o.vib) {
        const l = ctx.createOscillator(), d = ctx.createGain();
        l.type = "sine";
        l.frequency.setValueAtTime(o.vib[0], t);
        d.gain.setValueAtTime(0, t);
        d.gain.linearRampToValueAtTime(o.vib[1], t + Math.max(0.01, Math.min(o.vibDelay ?? 0.1, dur * 0.8)));
        l.connect(d); d.connect(osc.frequency);
        l.start(t); l.stop(t + dur + 0.02);
      }
      let node = osc;
      if (o.lp) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass"; f.Q.value = o.q ?? 0.7;
        f.frequency.setValueAtTime(o.lp, t);
        if (o.lp2 && o.lp2 !== o.lp) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
        node.connect(f); node = f;
      }
      const g = ctx.createGain();
      envelope(g.gain, t, dur, o.gain ?? 0.5, a, r, o.sus ?? 0.05);
      node.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.02);
    };
    kit.noise = (o) => {
      const t = o.at, dur = o.dur, a = Math.min(o.a ?? 0.01, dur * 0.4), r = Math.min(o.r ?? 0.03, dur * 0.5);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(ctx);
      f.type = o.type || "bandpass"; f.Q.value = o.q ?? 1;
      f.frequency.setValueAtTime(o.f, t);
      if (o.f2 && o.f2 !== o.f) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      envelope(g.gain, t, dur, o.gain ?? 0.5, a, r, o.sus ?? 0.05);
      src.connect(f);
      if (o.lp) {
        const l = ctx.createBiquadFilter();
        l.type = "lowpass"; l.Q.value = 0.7;
        l.frequency.setValueAtTime(o.lp, t);
        f.connect(l); l.connect(g);
      } else f.connect(g);
      g.connect(dest);
      if (dur + 0.02 > NOISE_SECONDS - 0.05) src.loop = true; // mais longo que o buffer de 1 s (ventos e chuva): o ruído se repete
      src.start(t, o.off ?? kit.salt, dur + 0.02);
    };
    return kit;
  }

  // Cada instrumento tem `life(d, kind)` (segundos que a nota soa, contando a cauda; `d` = duração escrita em segundos) e
  // `play(kit, at, d, L, f, g, e)` (L = life já calculada, f = frequência em Hz, g = ganho final, e = o evento).
  // Os números são escolhas de design para um timbre simples (um par de osciladores + filtro + envelope), nenhum medido contra instrumento real.
  const INST = {
    // cordas beliscadas (ukulele/violão de nylon): triângulo com filtro que fecha, mais uma serrilha levemente desafinada
    pluck: { life: (d) => clamp(0.3 + d * 0.6, 0.35, 1.3), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "triangle", lp: Math.min(f * 7, 5200), lp2: Math.max(f * 1.6, 400), q: 0.9, gain: 0.55 * g, a: 0.004, r: 0.05, sus: 0.015 });
      k.tone({ at, dur: L * 0.7, f: f * 1.004, type: "sawtooth", lp: Math.min(f * 4, 3000), lp2: Math.max(f * 1.2, 300), gain: 0.13 * g, a: 0.004, r: 0.04, sus: 0.015 });
    } },
    // marimba: senoide que morre e um harmônico (4x) que morre rápido, o "toc" da baqueta
    marimba: { life: (d) => clamp(0.45 + d * 0.35, 0.5, 1.6), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.62 * g, a: 0.003, r: 0.06, sus: 0.012 });
      k.tone({ at, dur: L * 0.22, f: f * 4, type: "sine", gain: 0.2 * g, a: 0.003, r: 0.02, sus: 0.03 });
    } },
    // xilofone: mais brilhante e curto que a marimba
    xylo: { life: (d) => clamp(0.3 + d * 0.25, 0.3, 0.8), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.5 * g, a: 0.003, r: 0.04, sus: 0.015 });
      k.tone({ at, dur: L * 0.3, f: f * 3, type: "sine", gain: 0.22 * g, a: 0.003, r: 0.02, sus: 0.03 });
      k.tone({ at, dur: L * 0.12, f: f * 6, type: "sine", gain: 0.06 * g, a: 0.003, r: 0.01, sus: 0.05 });
    } },
    // flauta: senoide com vibrato que entra depois, segundo harmônico fraco e um sopro de ruído no começo
    flute: { life: (d) => d + 0.1, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", vib: [5.2, f * 0.006], vibDelay: 0.2, gain: 0.5 * g, a: 0.06, r: 0.1, sus: 0.8 });
      k.tone({ at, dur: L, f: f * 2, type: "sine", gain: 0.07 * g, a: 0.06, r: 0.1, sus: 0.7 });
      k.noise({ at, dur: Math.min(L, 0.25), type: "bandpass", f: Math.min(f * 2, 7000), q: 2, gain: 0.05 * g, a: 0.03, r: 0.08, sus: 0.3 });
    } },
    // sino: parciais que não são múltiplos inteiros (2,76x e 5,4x), os agudos morrem antes
    bell: { life: (d) => clamp(1.2 + d * 0.2, 1.3, 2.4), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.4 * g, a: 0.004, r: 0.15, sus: 0.01 });
      k.tone({ at, dur: L * 0.55, f: f * 2.76, type: "sine", gain: 0.16 * g, a: 0.004, r: 0.1, sus: 0.01 });
      k.tone({ at, dur: L * 0.25, f: f * 5.4, type: "sine", gain: 0.07 * g, a: 0.004, r: 0.05, sus: 0.02 });
    } },
    // celesta: parciais harmônicos (2x e 4x) e ataque macio
    celesta: { life: (d) => clamp(0.9 + d * 0.15, 0.9, 1.6), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.45 * g, a: 0.004, r: 0.1, sus: 0.01 });
      k.tone({ at, dur: L * 0.5, f: f * 2, type: "sine", gain: 0.1 * g, a: 0.004, r: 0.06, sus: 0.02 });
      k.tone({ at, dur: L * 0.25, f: f * 4, type: "sine", gain: 0.1 * g, a: 0.004, r: 0.04, sus: 0.03 });
    } },
    // harpa: triângulo brilhante que escurece devagar, com a oitava
    harp: { life: (d) => clamp(0.6 + d * 0.4, 0.7, 1.5), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "triangle", lp: Math.min(f * 6, 6000), lp2: Math.max(f * 1.5, 400), gain: 0.5 * g, a: 0.004, r: 0.08, sus: 0.01 });
      k.tone({ at, dur: L * 0.5, f: f * 2, type: "sine", gain: 0.15 * g, a: 0.004, r: 0.05, sus: 0.02 });
    } },
    // órgão suave: três harmônicos senoidais, ataque curto, nota sustentada
    organ: { life: (d) => d + 0.12, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.38 * g, a: 0.03, r: 0.1, sus: 1 });
      k.tone({ at, dur: L, f: f * 2, type: "sine", gain: 0.22 * g, a: 0.03, r: 0.1, sus: 1 });
      k.tone({ at, dur: L, f: f * 3, type: "sine", gain: 0.1 * g, a: 0.03, r: 0.1, sus: 1 });
    } },
    // cordas/pad: duas serrilhas desafinadas por um passa-baixa, ataque e saída lentos
    strings: { life: (d) => d + 0.4, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f: f * 0.996, type: "sawtooth", lp: Math.min(f * 3.5, 2200), gain: 0.13 * g, a: 0.35, r: 0.4, sus: 1 });
      k.tone({ at, dur: L, f: f * 1.004, type: "sawtooth", lp: Math.min(f * 3.5, 2200), gain: 0.13 * g, a: 0.35, r: 0.4, sus: 1 });
    } },
    // baixos: triângulo com o 2º harmônico (para o celular), seno puro, e serrilha filtrada com seno
    bass: { life: (d) => clamp(d, 0.1, 8) + 0.06, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "triangle", gain: 0.62 * g, a: 0.01, r: 0.06, sus: 0.6 });
      k.tone({ at, dur: L, f: f * 2, type: "sine", gain: 0.16 * g, a: 0.01, r: 0.06, sus: 0.5 });
    } },
    bassSine: { life: (d) => clamp(d, 0.1, 8) + 0.06, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sine", gain: 0.75 * g, a: 0.012, r: 0.06, sus: 0.7 });
      k.tone({ at, dur: L, f: f * 2, type: "sine", gain: 0.1 * g, a: 0.012, r: 0.06, sus: 0.6 });
    } },
    bassSaw: { life: (d) => clamp(d, 0.1, 8) + 0.06, play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "sawtooth", lp: f * 5, lp2: f * 2.2, q: 1.2, gain: 0.3 * g, a: 0.008, r: 0.06, sus: 0.5 });
      k.tone({ at, dur: L, f, type: "sine", gain: 0.4 * g, a: 0.008, r: 0.06, sus: 0.5 });
    } },
    // contrabaixo pizzicato: nota que morre sozinha e uma batida grave de ruído no começo
    contrabass: { life: (d) => clamp(0.35 + d * 0.25, 0.4, 1.0), play(k, at, d, L, f, g) {
      k.tone({ at, dur: L, f, type: "triangle", gain: 0.8 * g, a: 0.006, r: 0.05, sus: 0.03 });
      k.tone({ at, dur: L * 0.5, f: f * 2, type: "sine", gain: 0.1 * g, a: 0.006, r: 0.04, sus: 0.03 });
      k.noise({ at, dur: 0.04, type: "lowpass", f: 400, q: 0.7, gain: 0.12 * g, a: 0.004, r: 0.02, sus: 0.1 });
    } },
    // percussão (o `kind` do evento é "low" = grave/marcação, "high" = agudo/contratempo, "ghost" = nota fantasma, "fill" = virada)
    woodblock: { life: () => 0.12, play(k, at, d, L, f, g, e) {
      const f0 = e.kind === "low" ? 760 : 1180;
      k.tone({ at, dur: 0.09, f: f0, f2: f0 * 0.8, type: "sine", gain: 0.7 * g, a: 0.003, r: 0.02, sus: 0.02 });
      k.tone({ at, dur: 0.04, f: f0 * 2.35, type: "sine", gain: 0.15 * g, a: 0.003, r: 0.01, sus: 0.03 });
      k.noise({ at, dur: 0.02, type: "bandpass", f: 3000, q: 1.5, gain: 0.12 * g, a: 0.003, r: 0.01, sus: 0.1 });
    } },
    softkick: { life: () => 0.28, play(k, at, d, L, f, g) {
      k.tone({ at, dur: 0.22, f: 135, f2: 48, type: "sine", gain: 0.95 * g, a: 0.004, r: 0.05, sus: 0.02 });
      k.noise({ at, dur: 0.03, type: "lowpass", f: 500, q: 0.7, gain: 0.1 * g, a: 0.004, r: 0.015, sus: 0.1 });
    } },
    brush: { life: (d, kind) => (kind === "low" ? 0.2 : 0.16), play(k, at, d, L, f, g, e) {
      if (e.kind === "low") k.noise({ at, dur: 0.18, type: "bandpass", f: 3200, q: 0.5, gain: 0.28 * g, a: 0.025, r: 0.06, sus: 0.3 });
      else k.noise({ at, dur: 0.14, type: "bandpass", f: 4800, q: 0.5, gain: 0.22 * g, a: 0.02, r: 0.05, sus: 0.35 });
    } },
    shaker: { life: () => 0.1, play(k, at, d, L, f, g, e) {
      k.noise({ at, dur: e.kind === "low" ? 0.09 : 0.07, type: "highpass", f: 5200, q: 0.7, gain: (e.kind === "low" ? 0.36 : 0.28) * g, a: 0.012, r: 0.03, sus: 0.15 });
    } },
    hat: { life: (d, kind) => (kind === "low" ? 0.14 : 0.08), play(k, at, d, L, f, g, e) {
      k.noise({ at, dur: e.kind === "low" ? 0.12 : 0.05, type: "highpass", f: 7500, q: 0.7, lp: 11000, gain: 0.26 * g, a: 0.004, r: 0.02, sus: 0.1 });
    } },
    // ambiências (leves e curtas; `d` é a duração do evento)
    wind: { life: (d) => d, play(k, at, d, L, f, g, e) {
      k.noise({ at, dur: L, type: "bandpass", f: 350, f2: 900, q: 0.6, lp: 1800, gain: 0.25 * g, a: L * 0.4, r: L * 0.4, sus: 0.8 });
    } },
    rain: { life: (d) => d, play(k, at, d, L, f, g, e) {
      k.noise({ at, dur: L, type: "highpass", f: 2200, q: 0.5, lp: 8000, gain: 0.12 * g, a: L * 0.3, r: L * 0.4, sus: 0.8 });
    } },
    crickets: { life: (d) => d, play(k, at, d, L, f, g, e) { // um oscilador agudo ligado e desligado em pulsos, num só ganho
      const ctx = k.ctx, o = ctx.createOscillator(), gn = ctx.createGain(), n = clamp(Math.round(L / 0.17), 2, 8);
      o.type = "sine";
      o.frequency.setValueAtTime(4300, at);
      gn.gain.setValueAtTime(0, at);
      for (let i = 0; i < n; i++) {
        const s = at + i * 0.17;
        if (i > 0) gn.gain.setValueAtTime(0, s);
        gn.gain.linearRampToValueAtTime(0.14 * g, s + 0.012);
        gn.gain.linearRampToValueAtTime(0, s + 0.07);
      }
      o.connect(gn); gn.connect(k.dest);
      o.start(at); o.stop(at + Math.max(L, n * 0.17) + 0.02);
    } },
    water: { life: () => 0.16, play(k, at, d, L, f, g, e) {
      const f0 = e.f || 800;
      k.tone({ at, dur: 0.12, f: f0, f2: f0 * 1.8, type: "sine", gain: 0.3 * g, a: 0.004, r: 0.03, sus: 0.03 });
      k.tone({ at, dur: 0.08, f: f0 * 1.5, f2: f0 * 2.7, type: "sine", gain: 0.08 * g, a: 0.004, r: 0.02, sus: 0.03 });
    } },
  };
  // quanto soa a nota (s) contando a cauda do instrumento
  function lifeOf(inst, dSec, kind) { const I = INST[inst]; return I ? I.life(dSec, kind) : dSec; }

  // Ajuste de volume por instrumento e por voz. Os instrumentos de tom foram calibrados medindo cada um sozinho no Chromium (tools/music-render/calibrate.js:
  // a energia de uma nota padrão igual à da marimba, arredondada); percussão e ambiências usam correção menor que a da energia (o ruído agudo soa mais forte do que a energia
  // sugere): são escolhas de design, sem medida de percepção. TRIM é o ajuste geral que leva o tema típico ao RMS-alvo de tools/music-render (conferido a cada render).
  const TRIM = 0.5;
  const INST_GAIN = Object.freeze({ pluck: 1.2, marimba: 1, xylo: 1.3, flute: 0.55, bell: 1.05, celesta: 1.1, harp: 1.25, organ: 0.55, strings: 1.8, bass: 0.6, bassSine: 0.45, bassSaw: 0.55, contrabass: 1,
    woodblock: 1.7, softkick: 1.1, brush: 3, shaker: 2.8, hat: 3.2, wind: 2.2, crickets: 1.7, rain: 2, water: 2.2 });
  const VOICE_GAIN = Object.freeze({ lead: 1, counter: 0.75, bass: 0.9, pad: 0.55, arp: 0.6, perc: 0.8, amb: 0.6 });

  // Agenda no contexto `ctx`, ligado a `dest`, as notas da partitura `score` que começam em [opts.from, opts.to) batidas do laço (padrão: o laço inteiro);
  // t0 (s, relógio do áudio) é o instante da batida `from`. Notas que passam de `to` continuam soando normalmente (a cauda cai no trecho seguinte).
  //   opts: { from, to, minTime (s: não agenda notas que começariam antes disso), gain (multiplicador), voices (lista de vozes a tocar, para testar camadas) }
  // Devolve { count (notas agendadas), end (s: quando a última cauda acaba), failed (notas que o navegador recusou) }. Não guarda estado.
  function render(score, ctx, dest, t0, opts) {
    if (!score || !Array.isArray(score.events)) throw new TypeError("render precisa de uma partitura (Music.score)");
    if (!ctx || !dest) throw new TypeError("render precisa de um contexto de áudio e de um destino");
    opts = opts || {};
    const spb = 60 / score.bpm, ev = score.events;
    const from = Number.isFinite(opts.from) ? opts.from : 0, to = Number.isFinite(opts.to) ? opts.to : score.lengthBeats;
    const start = Number.isFinite(t0) ? t0 : Number(ctx.currentTime) || 0;
    const minTime = Number.isFinite(opts.minTime) ? opts.minTime : -Infinity;
    const only = Array.isArray(opts.voices) ? opts.voices : null;
    const level = TRIM * (Number.isFinite(opts.gain) ? opts.gain : 1) * (Number.isFinite(score.gain) ? score.gain : 1);
    const kit = makeKit(ctx, dest);
    let lo = 0, hi = ev.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].t < from - 1e-9) lo = m + 1; else hi = m; } // primeiro evento com t >= from
    let count = 0, failed = 0, end = start;
    for (let i = lo; i < ev.length && ev[i].t < to - 1e-9; i++) {
      const e = ev[i];
      if (only && !only.includes(e.voice)) continue;
      const at = start + (e.t - from) * spb;
      if (at < minTime) continue;
      const I = INST[e.inst];
      if (!I) { failed++; continue; }
      const d = e.d * spb, L = I.life(d, e.kind);
      try {
        kit.salt = ((e.t * 0.6180339887) % 1) * 0.6;
        I.play(kit, at, d, L, e.midi === null ? 0 : midiHz(e.midi), e.v * level * INST_GAIN[e.inst] * VOICE_GAIN[e.voice], e);
        count++;
        if (at + L > end) end = at + L;
      } catch { failed++; }
    }
    return { count, end, failed };
  }
  // ---------- O tocador ----------
  const LOOKAHEAD = 0.6;          // s de música agendados à frente do relógio do áudio
  const TICK_MS = 120;            // de quanto em quanto tempo o agendador confere
  const BUS_GAIN = 0.45;          // ganho do barramento de música (relativo ao mestre dos sons)
  const FADE_DEFAULT = 0.7;       // crossfade entre temas (s)
  const START_LEAD = 0.06;        // folga ao começar um tema (s)
  const RESUME_RETRY_MS = 1000;   // de quanto em quanto tempo pede resume() a um contexto suspenso
  const MAX_EVENTS = 200;         // pedidos lembrados em `events`
  const finite = (x) => typeof x === "number" && Number.isFinite(x);

  // opts: { sound (o Sound.create do jogo: dá o contexto de áudio e o mudo), storage (opcional: getItem/setItem; guarda "cachorrinho.musica.v1"),
  //         now (ms, padrão: o relógio do sistema), setInterval/clearInterval (injetáveis para os testes), busGain (padrão 0,45) }
  function create(opts) {
    opts = opts || {};
    const sound = opts.sound || null;
    const storage = opts.storage || null;
    const now = typeof opts.now === "function" ? opts.now : Date.now;
    const setIv = typeof opts.setInterval === "function" ? opts.setInterval : (typeof root.setInterval === "function" ? root.setInterval.bind(root) : null);
    const clrIv = typeof opts.clearInterval === "function" ? opts.clearInterval : (typeof root.clearInterval === "function" ? root.clearInterval.bind(root) : null);
    const busGain = finite(opts.busGain) ? clamp(opts.busGain, 0, 2) : BUS_GAIN;

    let enabled = true, paused = false, broken = false;
    let desired = null;              // o tema pedido: { id, fade, from, volume }
    let cur = null;                  // o tema soando: { id, score, node, live, pos (batida do laço até onde já agendamos), posTime (s do áudio dessa batida) }
    const fading = [];               // nós saindo: { node, endMs }
    let ctx = null, duckNode = null, bus = null, lastAllowed = null;
    let baseDuck = 1, temp = null;   // duck fixo e duck temporário { level, untilMs }
    let timer = null, lastResumeTry = -Infinity, offUnlock = null;
    const events = [];

    // ----- preferência guardada (tudo com try/catch: sem storage, ou com erro, vale só a memória) -----
    function load() {
      if (!storage) return;
      try {
        const raw = storage.getItem(KEY);
        if (raw === "0" || raw === "1") { enabled = raw === "1"; return; }
        const p = JSON.parse(raw || "null");
        if (p && typeof p === "object" && (p.on === 0 || p.on === 1)) enabled = p.on === 1;
      } catch { /* preferência ilegível: fica ligada */ }
    }
    function save() {
      if (!storage) return;
      try { storage.setItem(KEY, JSON.stringify({ on: enabled ? 1 : 0 })); } catch { /* sem espaço ou bloqueado */ }
    }
    load();

    function record(name, extra) {
      let ev;
      try { ev = Object.assign({ name, t: now() }, extra); } catch { ev = { name, t: 0 }; }
      events.push(ev);
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    }

    // ----- ligação com o Sound -----
    const getAudio = () => { try { return sound && typeof sound.audio === "function" ? sound.audio() : null; } catch { return null; } };
    const isMuted = () => { try { return !!(sound && typeof sound.isMuted === "function" && sound.isMuted()); } catch { return false; } };
    const supported = () => !!sound && typeof sound.audio === "function" && sound.supported !== false && !broken;

    function ensureBus(a) { // um barramento por contexto: tema -> duck -> barramento -> entrada mestre do Sound
      if (ctx === a.ctx && bus) return true;
      try {
        const d = a.ctx.createGain(), b = a.ctx.createGain();
        b.gain.value = lastAllowed === false ? 0 : busGain;
        d.gain.value = duckValue();
        d.connect(b); b.connect(a.input);
        ctx = a.ctx; duckNode = d; bus = b;
        cur = null; fading.length = 0; // o que existia era de outro contexto
        return true;
      } catch { broken = true; ctx = null; bus = null; duckNode = null; return false; }
    }
    function duckValue() { const tp = temp && temp.untilMs > now() ? temp : null; return tp ? tp.level : baseDuck; }
    function applyDuck() {
      if (!ctx || !duckNode) return;
      try {
        const t = ctx.currentTime, p = duckNode.gain, tp = temp && temp.untilMs > now() ? temp : null;
        p.cancelScheduledValues(t);
        p.setTargetAtTime(tp ? tp.level : baseDuck, t, 0.04);
        if (tp) p.setTargetAtTime(baseDuck, t + (tp.untilMs - now()) / 1000, 0.25);
      } catch { try { duckNode.gain.value = duckValue(); } catch { /* nada a fazer */ } }
    }
    function applyBus(allowed) {
      if (!ctx || !bus || lastAllowed === allowed) return;
      lastAllowed = allowed;
      try { const t = ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setTargetAtTime(allowed ? busGain : 0, t, allowed ? 0.05 : 0.02); } catch { try { bus.gain.value = allowed ? busGain : 0; } catch { /* nada */ } }
    }

    // ----- temas -----
    function releaseNode(node, fadeSec) { // some em `fadeSec` e depois solta do grafo
      const f = Math.max(0.02, fadeSec);
      try {
        const p = node.gain, t = ctx.currentTime, v = p.value;
        p.cancelScheduledValues(t);
        p.setValueAtTime(v, t);
        p.linearRampToValueAtTime(0, t + f);
      } catch { /* o nó some junto com o desligamento */ }
      fading.push({ node, endMs: now() + (f + 0.15) * 1000 });
    }
    function cleanupFading() {
      for (let i = fading.length - 1; i >= 0; i--) {
        if (now() >= fading[i].endMs) { try { fading[i].node.disconnect(); } catch { /* ignora */ } fading.splice(i, 1); }
      }
    }
    function newNode(volume, fadeIn) {
      const n = ctx.createGain(), t = ctx.currentTime;
      n.gain.setValueAtTime(0, t);
      n.gain.linearRampToValueAtTime(volume, t + Math.max(0.02, fadeIn));
      n.connect(duckNode);
      return n;
    }
    function startTheme(d) {
      const score = scoreOf(d.id);
      if (!score) { desired = null; return; }
      const hadSound = !!(cur && cur.live);
      if (cur && cur.live) releaseNode(cur.node, d.fade);
      cur = null;
      const t = ctx.currentTime;
      cur = { id: d.id, score, node: newNode(d.volume, hadSound ? d.fade : Math.min(d.fade, 0.25)), live: true, pos: mod(d.from, score.lengthBeats), posTime: t + START_LEAD, volume: d.volume, wrapped: false };
    }
    function heardBeat() { // a batida do laço que se ouve agora (o agendado à frente ainda não soou)
      const sc = cur.score, ahead = cur.live && ctx ? Math.max(0, cur.posTime - ctx.currentTime) : 0, raw = cur.pos - ahead / (60 / sc.bpm);
      return raw < 0 && !cur.wrapped ? 0 : mod(raw, sc.lengthBeats); // no começo do tema ainda não houve volta: nada de "fim do laço"
    }
    function silence() { // pausa, mudo ou música desligada: some depressa e guarda o compasso em que estava
      if (!cur || !cur.live) return;
      const sc = cur.score;
      cur.pos = Math.floor(heardBeat() / sc.barBeats + 1e-9) * sc.barBeats; // volta ao começo do compasso, para os sons longos (cordas) entrarem de novo
      cur.wrapped = false;
      releaseNode(cur.node, 0.05);
      cur.node = null; cur.live = false;
    }
    function revive() {
      cur.node = newNode(cur.volume, 0.15);
      cur.posTime = ctx.currentTime + START_LEAD;
      cur.live = true;
    }
    function scheduleAhead() {
      const sc = cur.score, spb = 60 / sc.bpm, t = ctx.currentTime, target = t + LOOKAHEAD;
      if (cur.posTime < t - 0.05) { // ficamos para trás (aba em segundo plano, engasgo): pula o tempo perdido em vez de despejar notas atrasadas
        cur.pos = mod(cur.pos + (t + 0.03 - cur.posTime) / spb, sc.lengthBeats);
        cur.posTime = t + 0.03; cur.wrapped = true;
      }
      for (let guard = 0; cur.posTime < target - 1e-9 && guard < 8; guard++) {
        const span = Math.min((target - cur.posTime) / spb, sc.lengthBeats - cur.pos);
        if (!(span > 1e-9)) { cur.pos = 0; cur.wrapped = true; continue; }
        const to = cur.pos + span;
        render(sc, ctx, cur.node, cur.posTime, { from: cur.pos, to, minTime: t });
        cur.posTime += span * spb;
        if (to >= sc.lengthBeats - 1e-9) { cur.pos = 0; cur.wrapped = true; } else cur.pos = to;
      }
    }

    // ----- o agendador -----
    function ensureTimer() { if (!timer && setIv) { try { timer = setIv(tick, TICK_MS); } catch { timer = null; } } }
    function stopTimer() { if (timer !== null && clrIv) { try { clrIv(timer); } catch { /* ignora */ } } timer = null; }
    function step() {
      cleanupFading();
      const a = getAudio();
      if (a && ensureBus(a)) {
        const c = a.ctx, allowed = enabled && !paused && !isMuted();
        if (c.state !== "running") { // suspenso (aba em segundo plano, celular): pede para retomar de vez em quando, sem agendar nada
          if (now() - lastResumeTry >= RESUME_RETRY_MS) { lastResumeTry = now(); try { const r = c.resume(); if (r && typeof r.catch === "function") r.catch(() => {}); } catch { /* o navegador recusou */ } }
        } else {
          applyBus(allowed);
          if (!allowed) silence();
          else if (!desired) { if (cur) { if (cur.live) releaseNode(cur.node, 0.5); cur = null; } }
          else {
            if (!cur || cur.id !== desired.id) startTheme(desired);
            else if (!cur.live) revive();
            if (cur) scheduleAhead();
          }
        }
      }
      if (!desired && !fading.length) stopTimer();
    }
    function tick() { try { step(); } catch { /* o jogo nunca pode cair por causa da música */ } }

    if (sound && typeof sound.onUnlock === "function") { try { offUnlock = sound.onUnlock(() => tick()); } catch { offUnlock = null; } }

    const api = {
      // Toca o tema `id` (registrado com Music.register). Se já é o tema pedido, não reinicia (devolve true). Troca de tema com crossfade de `o.fade` s (padrão 0,7).
      // o: { fade (s), from (batida do laço), volume (0..1,5; padrão 1), restart (true: recomeça mesmo sendo o mesmo id) }. Id desconhecido: devolve false e nada muda.
      // Antes do unlock do Sound, com a música desligada, no mudo ou em pausa, o pedido fica guardado e o tema entra quando puder. Nunca lança erro.
      play(id, o) {
        let ok = false;
        try {
          o = o || {};
          if (typeof id === "string" && get(id)) {
            ok = true;
            if (!desired || desired.id !== id || o.restart) {
              desired = { id, fade: finite(o.fade) ? clamp(o.fade, 0, 8) : FADE_DEFAULT, from: finite(o.from) ? Math.max(0, o.from) : 0, volume: finite(o.volume) ? clamp(o.volume, 0, 1.5) : 1 };
              if (o.restart && cur) { if (cur.live) releaseNode(cur.node, desired.fade); cur = null; }
            }
            ensureTimer();
            tick();
          }
        } catch { ok = false; }
        record("play", { id: typeof id === "string" ? id.slice(0, 20) : "?", ok });
        return ok;
      },
      // Para a música em `fade` s (padrão 0,5) e esquece o tema pedido.
      stop(fade) {
        try {
          desired = null;
          const f = finite(fade) ? clamp(fade, 0, 8) : 0.5;
          if (cur && cur.live && ctx) releaseNode(cur.node, f);
          cur = null;
          if (fading.length) ensureTimer();
          tick();
        } catch { /* ignora */ }
        record("stop", { fade });
      },
      // Abaixa a música para `level` (0..1) por `seconds` s e volta ao volume de antes. Sem `seconds` fica abaixada até um novo duck/setDuck.
      duck(level, seconds) {
        try {
          const lv = finite(level) ? clamp(level, 0, 1) : 0.25;
          if (finite(seconds) && seconds > 0) temp = { level: lv, untilMs: now() + seconds * 1000 };
          else { baseDuck = lv; temp = null; }
          applyDuck();
        } catch { /* ignora */ }
        record("duck", { level, seconds });
      },
      // Muda o volume fixo (0..1) da música relativo ao normal; usado na pausa do jogo (0,25) e para voltar (1).
      setDuck(level) {
        try { baseDuck = finite(level) ? clamp(level, 0, 1) : 1; applyDuck(); } catch { /* ignora */ }
        record("setDuck", { level });
        return baseDuck;
      },
      // Pausa (aba escondida, janela sem foco): some depressa e não agenda nada; resume() volta do começo do compasso em que parou.
      pause() { paused = true; record("pause"); tick(); },
      resume() { paused = false; record("resume"); tick(); },
      // Botão "Música": liga ou desliga (guarda a preferência). Desligada, nada toca; ao ligar, o tema pedido volta do compasso em que estava.
      setEnabled(v) { enabled = !!v; save(); record("setEnabled", { on: enabled }); tick(); return enabled; },
      isEnabled() { return enabled; },
      toggleEnabled() { return api.setEnabled(!enabled); },
      // Confere o agendador agora (o jogo pode chamar depois de mudar o mudo do Sound, para a música reagir sem esperar o próximo ciclo).
      tick,
      // Para tudo e solta os ganchos.
      dispose() { try { api.stop(0); stopTimer(); if (offUnlock) offUnlock(); offUnlock = null; } catch { /* ignora */ } },
      get current() { return desired ? desired.id : null; },
      get events() { return events; },
      get supported() { return supported(); },
      get paused() { return paused; },
      // Onde a música está: { id, beat (batida do laço que se ouve agora), live (false em pausa/mudo: guarda o compasso em que parou) } ou null.
      get position() { return cur ? { id: cur.id, beat: heardBeat(), live: cur.live } : null; },
      // "stopped" (nada pedido), "unsupported" (sem Web Audio), "off" (música desligada), "muted", "paused", "waiting" (ainda não destravou), "suspended" (contexto suspenso), "playing"
      get state() {
        if (!desired) return "stopped";
        if (!supported()) return "unsupported";
        if (!enabled) return "off";
        if (isMuted()) return "muted";
        if (paused) return "paused";
        const a = getAudio();
        if (!a) return "waiting";
        return a.ctx.state === "running" ? "playing" : "suspended";
      },
    };
    return api;
  }
  // ---------- Registro de temas ----------
  const registry = new Map();     // id -> receita (cópia)
  const scoreCache = new Map();   // id -> partitura (os últimos CACHE_MAX temas pedidos)
  const CACHE_MAX = 4;

  // Registra uma receita ou uma lista de receitas. O mesmo id registrado depois substitui o anterior (mantém a posição em ids()).
  // Receita inválida é ignorada (o jogo segue sem aquele tema) e aparece em `errors`. Devolve { ok: [ids], errors: [{ id, problems }] }. Nunca lança erro.
  function register(recipes) {
    const list = Array.isArray(recipes) ? recipes : (recipes && typeof recipes === "object" ? [recipes] : []);
    const res = { ok: [], errors: [] };
    for (const r of list) {
      try {
        const c = check(r);
        if (c.problems.length) { res.errors.push({ id: r && typeof r.id === "string" ? r.id : "?", problems: c.problems }); continue; }
        registry.set(c.R.id, JSON.parse(JSON.stringify(r)));
        scoreCache.delete(c.R.id);
        res.ok.push(c.R.id);
      } catch (e) { res.errors.push({ id: "?", problems: [String(e && e.message || e)] }); }
    }
    return res;
  }
  function get(id) { return registry.has(id) ? registry.get(id) : null; }
  function ids() { return Array.from(registry.keys()); }

  // Gera a partitura de uma receita (objeto) ou de um id registrado. Função pura e determinística. Lança erro se a receita é inválida.
  function score(recipe) {
    const r = typeof recipe === "string" ? registry.get(recipe) : recipe;
    const c = check(r);
    if (c.problems.length) throw new RangeError("receita inválida: " + c.problems.join("; "));
    return buildScore(c.R);
  }
  // A partitura de um id registrado, guardada em memória (só as últimas CACHE_MAX); null se o id não existe ou a receita falha. Nunca lança erro.
  function scoreOf(id) {
    if (typeof id !== "string" || !registry.has(id)) return null;
    if (scoreCache.has(id)) { const s = scoreCache.get(id); scoreCache.delete(id); scoreCache.set(id, s); return s; }
    let s;
    try { s = score(registry.get(id)); } catch { return null; }
    scoreCache.set(id, s);
    while (scoreCache.size > CACHE_MAX) scoreCache.delete(scoreCache.keys().next().value);
    return s;
  }

  // ---------- tema do menu ----------
  // Acolhedor e curioso: fá maior, 104 bpm, 32 compassos em ABAB (74 s). Marimba, flauta e contrabaixo pizzicato se revezam no motivo (uma frase de 2 compassos cada),
  // sobre contrabaixo pizzicato, cordas, harpa e bloco de madeira que entram conforme a seção (camadas por `intensity`).
  register([{
    id: "menu", animal: "menu", place: "Menu", key: "F", mode: "major", bpm: 104, beats: 4, swing: 0.12, bars: 32, form: "ABAB",
    prog: { A: "I vi IV V", B: "vi IV I V" },
    motif: { seed: 2101, bars: 2, contour: "arch", leaps: 0.35, rests: 0.15, rhythm: ["x-x-xx-x", "x--x-x--"] },
    voices: {
      lead: { inst: "marimba", oct: 4, vel: 0.8, rotate: [{ inst: "marimba" }, { inst: "flute" }, { inst: "contrabass", oct: 3 }] },
      counter: { inst: "celesta", oct: 4, vel: 0.5, from: 0.62 },
      bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.8 },
      pad: { inst: "strings", oct: 3, vel: 0.45, from: 0.35 },
      arp: { inst: "harp", rate: 2, shape: "broken", oct: 4, vel: 0.5, from: 0.6 },
      perc: { kit: "woodblock", pattern: "steady", vel: 0.5, from: 0.3 },
    },
    intensity: 0.55,
  }]);

  // ---------- temas de exemplo (substituídos pelos arquivos dos compositores) ----------
  // Um de cada estilo, para provar o motor: js/music-dog.js, js/music-cat.js e js/music-bird.js registram os temas de verdade com os mesmos ids
  // (dog1, cat1, bird1, ...) e o registro posterior substitui estes.
  register([
    // Cachorrinho: alegre e saltitante. Sol mixolídio, polca (bumbo macio e bloco de madeira), baixo de "uum-pá", xilofone, arpejo de violão (pluck).
    {
      id: "dog1", animal: "dog", place: "Quintal", key: "G", mode: "mixolydian", bpm: 116, beats: 4, swing: 0.1, bars: 32, form: "AABA",
      prog: { A: "I VII IV I", B: "IV I VII I" },
      motif: { seed: 7301, bars: 2, contour: "hop", leaps: 0.5, rests: 0.1, density: 0.7 },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 4, vel: 0.5, from: 0.6 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.8 },
        arp: { inst: "pluck", rate: 2, shape: "broken", oct: 4, vel: 0.5, from: 0.5 },
        perc: { kit: ["softkick", "woodblock"], pattern: "polka", vel: 0.55, from: 0.25 },
      },
      intensity: 0.6,
    },
    // Gatinho: furtivo e elegante. Ré dórico com acordes de 7ª, balanço forte, contrabaixo pizzicato, escovas, celesta e flauta grave, bastante silêncio.
    {
      id: "cat1", animal: "cat", place: "Sala de estar", key: "D", mode: "dorian", bpm: 92, beats: 4, swing: 0.4, bars: 32, form: "AABA",
      prog: { A: "I7 IV7 I7 V7", B: "VII IV7 I7 V7" },
      motif: { seed: 4409, bars: 2, contour: "wave", leaps: 0.5, rests: 0.45, density: 0.35 },
      voices: {
        lead: { inst: "celesta", oct: 5, vel: 0.75 },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.55 },
        bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.8 },
        pad: { inst: "organ", oct: 3, vel: 0.3, from: 0.5 },
        perc: { kit: "brush", pattern: "brush2", vel: 0.5, from: 0.2 },
      },
      intensity: 0.55,
    },
    // Passarinho: leve e arejado. Mi pentatônico maior em 6/8 (dois pulsos por compasso), flauta, arpejos de harpa, sinos, vento suave, sem percussão.
    {
      id: "bird1", animal: "bird", place: "Jardim florido", key: "E", mode: "pentMajor", bpm: 76, beats: 6, swing: 0, bars: 32, form: "AABA",
      prog: { A: "I V II IV", B: "II IV I IV" },
      motif: { seed: 9127, bars: 2, contour: "arch", leaps: 0.4, rests: 0.25, density: 0.45 },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.75 },
        counter: { inst: "bell", oct: 5, vel: 0.4, from: 0.6, above: true },
        bass: { inst: "bassSine", pattern: "waltz", oct: 2, vel: 0.6 },
        pad: { inst: "organ", oct: 3, vel: 0.3, from: 0.4 },
        arp: { inst: "harp", rate: 3, shape: "updown", oct: 5, vel: 0.45, from: 0.45 },
        ambience: "wind",
      },
      intensity: 0.5,
    },
  ]);

  return {
    KEY, MAX_VOICES, MIN_LOOP_SECONDS, MAX_LOOP_SECONDS, MODES, KEYS, CONTOURS, BASS_PATTERNS, ARP_SHAPES, PERC_KITS, PERC_PATTERNS, AMBIENCES, INSTRUMENTS,
    register, get, ids, validate, score, scoreOf, render, create, polyphony, lifeOf, scaleInfo, degMidi, midiHz, mulberry32, hashString,
  };
});
