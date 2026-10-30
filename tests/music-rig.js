// Ajudas de teste das músicas tema (sem navegador): AudioContext FALSO rigoroso e as conferências estruturais de uma receita.
// Os testes de js/music.js e os dos compositores (tests/music-<animal>.test.js) reaproveitam isto:
//   const rig = require("./music-rig.js");
//   const falhas = rig.checkRecipe(receita);            // lista de textos; vazia = tudo certo
//   const falhasDoGrupo = rig.checkDistinct(receitas);  // ninguém compartilha tom/modo/andamento/solo/baixo; melodias diferentes entre si
//   const falhasDaRampa = rig.checkTempoRamp(receitas, { min: 92, max: 148 });  // receitas na ordem das fases: andamento dentro da faixa e crescente
// O AudioContext falso é rigoroso como o de verdade: lança erro em rampa exponencial para valor <= 0, em tempo negativo ou não numérico,
// em start() duplo, em stop() antes de start() e registra todo nó, conexão e automação.
const fs = require("fs");
const path = require("path");
const MUSIC_PATH = [path.join(__dirname, "../js/music.js"), path.join(__dirname, "../music.js")].find((p) => fs.existsSync(p));
const Music = require(MUSIC_PATH);

// ---------- AudioContext falso ----------
const num = (v, what) => { if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(`${what}: valor não numérico (${v})`); return v; };
const time = (t, what) => { num(t, what); if (t < 0) throw new RangeError(`${what}: tempo negativo (${t})`); return t; };

class FakeParam {
  constructor(owner, name, value = 0) { this.owner = owner; this.name = name; this._v = value; this.events = []; }
  get value() { return this._v; }
  set value(v) { this._v = num(v, this.name + ".value"); }
  setValueAtTime(v, t) { this.events.push({ type: "set", v: num(v, this.name), t: time(t, this.name) }); return this; }
  linearRampToValueAtTime(v, t) { this.events.push({ type: "lin", v: num(v, this.name), t: time(t, this.name) }); return this; }
  exponentialRampToValueAtTime(v, t) {
    if (!(num(v, this.name) > 0)) throw new RangeError(`${this.name}: rampa exponencial precisa de valor > 0 (${v})`);
    this.events.push({ type: "exp", v, t: time(t, this.name) }); return this;
  }
  setTargetAtTime(v, t, tc) { this.events.push({ type: "target", v: num(v, this.name), t: time(t, this.name), tc: num(tc, this.name) }); return this; }
  cancelScheduledValues(t) { time(t, this.name); this.events.push({ type: "cancel", t }); return this; }
}
class FakeNode {
  constructor(ctx, kind) { this.ctx = ctx; this.kind = kind; this.out = []; ctx.nodes.push(this); }
  connect(dest) {
    if (!dest || !(dest instanceof FakeNode || dest instanceof FakeParam)) throw new TypeError("connect: destino inválido");
    this.out.push(dest); return dest;
  }
  disconnect() { this.wasConnectedTo = (this.wasConnectedTo || []).concat(this.out); this.out = []; this.disconnected = true; }
}
class FakeGain extends FakeNode { constructor(c) { super(c, "gain"); this.gain = new FakeParam(this, "gain", 1); } }
class FakeCompressor extends FakeNode {
  constructor(c) { super(c, "compressor"); for (const [k, v] of Object.entries({ threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 })) this[k] = new FakeParam(this, k, v); }
}
class FakeBiquad extends FakeNode {
  constructor(c) { super(c, "biquad"); this._type = "lowpass"; this.frequency = new FakeParam(this, "frequency", 350); this.Q = new FakeParam(this, "Q", 1); this.gain = new FakeParam(this, "gain", 0); }
  get type() { return this._type; }
  set type(v) { if (!["lowpass", "highpass", "bandpass", "notch", "allpass", "peaking", "lowshelf", "highshelf"].includes(v)) return; this._type = v; }
}
class FakeSource extends FakeNode {
  constructor(c, kind) { super(c, kind); this.starts = []; this.stops = []; }
  start(...a) { if (this.starts.length) throw new Error("InvalidStateError: start() duas vezes"); time(a[0] ?? 0, "start"); this.starts.push(a); }
  stop(t) { if (!this.starts.length) throw new Error("InvalidStateError: stop() antes de start()"); this.stops.push(time(t, "stop")); }
}
class FakeOsc extends FakeSource {
  constructor(c) { super(c, "osc"); this._type = "sine"; this.frequency = new FakeParam(this, "frequency", 440); this.detune = new FakeParam(this, "detune", 0); }
  get type() { return this._type; }
  set type(v) { if (!["sine", "square", "sawtooth", "triangle"].includes(v)) return; this._type = v; }
}
class FakeBufferSource extends FakeSource { constructor(c) { super(c, "buffer"); this.buffer = null; this.loop = false; } }

// `opts`: { state ("running"|"suspended"|"closed"), neverRunning, resumeThrows, resumeRejects, throwCtor, failOn (nome do método que lança) }
function makeFake(opts = {}) {
  const f = { instances: [], resumes: 0, failOn: opts.failOn || null };
  class FakeCtx {
    constructor(o) {
      if (opts.throwCtor) throw new Error("o navegador recusou criar o AudioContext");
      f.instances.push(this);
      this.args = o;
      this.nodes = []; this.sampleRate = 44100; this.currentTime = 0; this.state = opts.state || "running";
      this.destination = new FakeNode(this, "destination");
      this.buffers = [];
    }
    _make(name, make) { if (f.failOn === name) throw new Error(name + " falhou"); return make(); }
    createGain() { return this._make("createGain", () => new FakeGain(this)); }
    createOscillator() { return this._make("createOscillator", () => new FakeOsc(this)); }
    createBiquadFilter() { return this._make("createBiquadFilter", () => new FakeBiquad(this)); }
    createBufferSource() { return this._make("createBufferSource", () => new FakeBufferSource(this)); }
    createDynamicsCompressor() { return this._make("createDynamicsCompressor", () => new FakeCompressor(this)); }
    createPeriodicWave(re, im) { return this._make("createPeriodicWave", () => ({ kind: "wave", re, im })); }
    createBuffer(ch, len, rate) {
      return this._make("createBuffer", () => { const b = { numberOfChannels: ch, length: len, sampleRate: rate, data: new Float32Array(len), getChannelData() { return this.data; } }; this.buffers.push(b); return b; });
    }
    resume() {
      f.resumes++;
      if (opts.resumeThrows) throw new Error("resume lançou");
      if (opts.resumeRejects) return Promise.reject(new Error("resume rejeitado"));
      if (!opts.neverRunning) this.state = "running";
      return Promise.resolve();
    }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  f.Ctx = FakeCtx;
  f.last = () => f.instances[f.instances.length - 1];
  return f;
}
const clock = (t = 1000) => { const c = () => t; c.set = (v) => { t = v; }; c.add = (d) => { t += d; }; return c; };
const memStorage = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m };
};
// relógio de timers manual: setInterval/clearInterval injetáveis no tocador; run(ms) avança o tempo disparando os timers na ordem
function makeTimers(now) {
  const timers = new Map();
  let nextId = 1;
  return {
    setInterval(fn, ms) { const id = nextId++; timers.set(id, { fn, ms, next: now() + ms }); return id; },
    clearInterval(id) { timers.delete(id); },
    get count() { return timers.size; },
    // avança `ms` de relógio (e o relógio do áudio `ctx.currentTime`, se `ctx` vier) em passos dos timers
    run(ms, ctx) {
      const end = now() + ms;
      for (;;) {
        let best = null, bestId = null;
        for (const [id, t] of timers) if (t.next <= end && (!best || t.next < best.next)) { best = t; bestId = id; }
        if (!best) break;
        const dt = best.next - now();
        if (dt > 0) { now.add(dt); if (ctx) ctx.currentTime += dt / 1000; }
        best.next += best.ms;
        best.fn();
        if (!timers.has(bestId)) continue;
      }
      const rest = end - now();
      if (rest > 0) { now.add(rest); if (ctx) ctx.currentTime += rest / 1000; }
    },
  };
}

// ---------- Inspeção do grafo ----------
const sourcesOf = (ctx) => ctx.nodes.filter((n) => n.kind === "osc" || n.kind === "buffer");
function reachesDestination(from, seen = new Set()) {
  const node = from instanceof FakeParam ? from.owner : from;
  if (seen.has(node)) return false;
  seen.add(node);
  if (node.kind === "destination") return true;
  return node.out.some((o) => reachesDestination(o, seen));
}

// ---------- Conferências estruturais ----------
const mod = (a, n) => ((a % n) + n) % n;

// Confere o que uma renderização no AudioContext falso agendou; devolve a lista de falhas (vazia = ok).
function checkRender(score, label = "") {
  const fails = [], fail = (m) => fails.push(label + m);
  const f = makeFake(), ctx = new f.Ctx();
  let r;
  try { r = Music.render(score, ctx, ctx.destination, 0); } catch (e) { return [label + "render lançou: " + e.message]; }
  if (r.failed) fail(`${r.failed} nota(s) falharam ao agendar`);
  if (r.count !== score.events.length) fail(`render agendou ${r.count} de ${score.events.length} notas`);
  const src = sourcesOf(ctx);
  if (!src.length) fail("render não criou nenhuma fonte");
  let bad = 0;
  for (const n of src) {
    if (n.starts.length !== 1) { bad++; continue; }
    const st = n.starts[0][0];
    if (n.kind === "osc") {
      if (n.stops.length !== 1 || !(n.stops[0] > st) || !Number.isFinite(n.stops[0])) { bad++; continue; }
    } else if (!(Number.isFinite(n.starts[0][2]) && n.starts[0][2] > 0)) { bad++; continue; } // ruído: start(t, off, duração)
    if (!reachesDestination(n)) { bad++; continue; }
  }
  if (bad) fail(`${bad} fonte(s) sem start/stop válidos ou sem caminho até a saída`);
  let bad2 = 0;
  for (const n of ctx.nodes) {
    if (n.kind !== "gain" || n.out.some((o) => o instanceof FakeParam)) continue; // (os ganhos de vibrato ligados a um parâmetro não são envelopes de nota)
    const ev = n.gain.events.filter((e) => e.type !== "cancel");
    if (!ev.some((e) => e.type === "lin" || e.type === "exp")) continue;
    for (let i = 1; i < ev.length; i++) if (ev[i].t < ev[i - 1].t - 1e-9) bad2++;
    if (ev[0].v !== 0 || ev[ev.length - 1].v !== 0) bad2++;
  }
  if (bad2) fail(`${bad2} envelope(s) que não começam e terminam em 0 ou fora de ordem`);
  // antes do 1º evento o ganho padrão do navegador é 1: um ganho de nota que não nasce em 0 deixa passar a 1ª amostra de uma fonte que começa um pouco antes do evento (clique)
  const loud = ctx.nodes.filter((n) => n.kind === "gain" && n.gain.events.length && n.gain.value !== 0).length;
  if (loud) fail(`${loud} ganho(s) de nota nascem com valor diferente de 0 (a 1ª amostra passaria inteira: clique)`);
  const perEvent = ctx.nodes.length / Math.max(1, score.events.length);
  if (perEvent > 30) fail(`nós demais por nota (${perEvent.toFixed(1)})`);
  return fails;
}

// A lista de todas as conferências estruturais de uma receita (desenho das músicas, "Conferências automáticas"). Devolve [] se tudo passa.
//   opts: { render: false para pular a renderização no contexto falso (mais rápido) }
function checkRecipe(recipe, opts = {}) {
  const id = recipe && recipe.id ? recipe.id : "?";
  const fails = [], fail = (m) => fails.push(`${id}: ${m}`);
  const problems = Music.validate(recipe);
  if (problems.length) return problems.map((p) => `${id}: receita: ${p}`);
  let a, b;
  try { a = Music.score(recipe); b = Music.score(recipe); } catch (e) { return [`${id}: score lançou erro: ${e.message}`]; }
  if (JSON.stringify(a) !== JSON.stringify(b)) fail("a partitura não é determinística (duas gerações diferentes)");
  const sc = Music.scaleInfo(recipe.key === undefined ? "C" : recipe.key, recipe.mode === undefined ? "major" : recipe.mode);
  const ev = a.events;
  if (!ev.length) { fail("partitura vazia"); return fails; }

  // campos
  const voiceKinds = { lead: ["tone", "bass"], counter: ["tone", "bass"], bass: ["tone", "bass"], pad: ["tone", "bass"], arp: ["tone", "bass"], perc: ["perc"], amb: ["amb"] };
  let badField = 0;
  for (const e of ev) {
    const okNum = [e.t, e.d, e.v].every((x) => typeof x === "number" && Number.isFinite(x));
    const okMidi = e.midi === null || (Number.isInteger(e.midi) && e.midi >= 24 && e.midi <= 108);
    const okRange = e.t >= 0 && e.t < a.lengthBeats && e.d > 0 && e.v > 0 && e.v <= 1;
    const okInst = voiceKinds[e.voice] && Music.INSTRUMENTS[e.inst] && voiceKinds[e.voice].includes(Music.INSTRUMENTS[e.inst]);
    const okNull = (e.midi === null) === (e.voice === "perc" || e.voice === "amb");
    if (!okNum || !okMidi || !okRange || !okInst || !okNull || typeof e.kind !== "string") badField++;
  }
  if (badField) fail(`${badField} evento(s) com campo inválido, não finito, fora do laço ou instrumento que não serve à voz`);
  for (const e of ev) if (e.midi !== null && !sc.pcs.has(mod(e.midi, 12))) { fail(`nota fora da escala (${recipe.key || "C"} ${recipe.mode || "major"}): midi ${e.midi} em t=${e.t} (${e.voice})`); break; }

  // âmbito da melodia: no máximo 2 oitavas por instrumento
  const lead = ev.filter((e) => e.voice === "lead");
  if (!lead.length) fail("sem melodia (voz lead vazia)");
  const perInst = {};
  for (const e of lead) { const r = perInst[e.inst] || (perInst[e.inst] = [Infinity, -Infinity]); r[0] = Math.min(r[0], e.midi); r[1] = Math.max(r[1], e.midi); }
  for (const [inst, r] of Object.entries(perInst)) if (r[1] - r[0] > 24) fail(`âmbito da melodia (${inst}) de ${r[1] - r[0]} semitons: mais de 2 oitavas`);

  // duração do laço
  if (!(a.lengthSeconds >= 40 && a.lengthSeconds <= 100)) fail(`laço de ${a.lengthSeconds.toFixed(1)} s (precisa ficar entre 40 e 100 s)`);
  if (Math.abs(a.lengthSeconds - a.bars * a.barBeats * 60 / a.bpm) > 1e-9) fail("lengthSeconds não bate com compassos e andamento");

  // laço: o último compasso é o dominante e a melodia desemboca (a até 3 graus) na primeira nota
  const dominant = mod(sc.pc + 7, 12), lastH = a.harmony[a.harmony.length - 1];
  if (lastH.pcs[0] !== dominant) fail(`o último compasso não é o dominante (raiz ${lastH.pcs[0]}, esperado ${dominant})`);
  const first = lead[0], lastLead = lead[lead.length - 1];
  if (first && first.t >= 1) fail(`a melodia só começa em t=${first.t} (esperado no 1º tempo)`);
  if (first && lastLead && Math.abs(lastLead.deg - first.deg) > 3) fail(`a última nota da melodia (grau ${lastLead.deg}) não conduz à primeira (grau ${first.deg})`);
  if (lastLead && lastLead.t + lastLead.d > a.lengthBeats + 1e-6) fail("a última nota da melodia passa do fim do laço");
  const bassLast = ev.filter((e) => e.voice === "bass" && e.t >= (a.bars - 1) * a.barBeats - 1e-9);
  if (recipe.voices && recipe.voices.bass !== null && bassLast.length && mod(bassLast[0].midi, 12) !== dominant) fail("o baixo do último compasso não toca a raiz do dominante");

  // vozes
  const vc = a.stats.byVoice;
  const want = recipe.voices || {};
  for (const [k, voice] of [["counter", "counter"], ["pad", "pad"], ["arp", "arp"], ["perc", "perc"], ["ambience", "amb"]]) if (want[k] && !vc[voice]) fail(`a voz ${k} está na receita mas não tem nenhuma nota (confira "from"/intensity)`);
  if (want.bass !== null && !vc.bass) fail("a voz bass não tem nenhuma nota");
  // sem sobrecarga de vozes (conta de novo, de forma independente da do gerador)
  const spb = 60 / a.bpm, L = a.lengthBeats * spb;
  const win = ev.map((e) => [e.t * spb, e.t * spb + Music.lifeOf(e.inst, e.d * spb, e.kind)]);
  for (const w of win.slice()) if (w[1] > L) win.push([0, w[1] - L]);
  win.sort((x, y) => x[0] - y[0]);
  let active = [], maxVoices = 0;
  for (const w of win) { active = active.filter((end) => end > w[0] + 1e-9); active.push(w[1]); maxVoices = Math.max(maxVoices, active.length); }
  if (maxVoices > Music.MAX_VOICES) fail(`${maxVoices} vozes ao mesmo tempo (máximo ${Music.MAX_VOICES})`);
  // lacunas: nenhum trecho do laço (contando as caudas e a volta ao começo) fica mudo por mais que `maxSilence` s
  const sorted = win.filter((w) => w[0] < L).sort((x, y) => x[0] - y[0]);
  let reach = 0, gap = 0;
  const maxSil = recipe.maxSilence === undefined ? 3 : recipe.maxSilence;
  for (const w of sorted) { gap = Math.max(gap, w[0] - reach); reach = Math.max(reach, w[1]); }
  gap = Math.max(gap, L - Math.min(reach, L)); // a cauda que volta ao começo cobre parte do início: ignoramos para ser conservador
  if (gap > maxSil) fail(`trecho mudo de ${gap.toFixed(1)} s (máximo ${maxSil} s)`);
  // cada seção da forma tem melodia
  const secBeats = a.sectionBars * a.barBeats;
  for (let s = 0; s < a.form.length; s++) if (!lead.some((e) => e.t >= s * secBeats && e.t < (s + 1) * secBeats)) fail(`a seção ${s + 1} (${a.form[s]}) não tem melodia`);

  if (opts.render !== false) fails.push(...checkRender(a, id + ": "));
  return fails;
}

// ---------- Temas distintos entre si ----------
// n-gramas de (intervalo, duração) da melodia, para medir o quanto duas melodias se parecem (0 = nada em comum, 1 = iguais)
function melodyGrams(score) {
  const lead = score.events.filter((e) => e.voice === "lead");
  const grams = new Set();
  for (let i = 0; i + 3 < lead.length && i < 120; i++) {
    const g = [];
    for (let k = 0; k < 3; k++) g.push((lead[i + k + 1].midi - lead[i + k].midi) + "/" + Math.round(lead[i + k].d * 4));
    grams.add(g.join(","));
  }
  return grams;
}
function melodySimilarity(a, b) {
  const ga = melodyGrams(a), gb = melodyGrams(b);
  if (!ga.size || !gb.size) return 0;
  let inter = 0;
  for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}
// "Assinatura" de um tema: o que não pode se repetir entre dois temas
function signatureOf(recipe) {
  const v = recipe.voices || {};
  return [recipe.key, recipe.mode, recipe.bpm, v.lead && v.lead.inst, v.bass && v.bass.pattern].join("|");
}
// Confere um grupo de receitas: ids únicos, assinaturas (tom, modo, andamento, solo, baixo) diferentes, melodias diferentes (similaridade < maxSim, padrão 0,35).
function checkDistinct(recipes, opts = {}) {
  const maxSim = opts.maxSim === undefined ? 0.35 : opts.maxSim, fails = [];
  const seen = new Map(), scores = [];
  for (const r of recipes) {
    if (seen.has(r.id)) fails.push(`id repetido: ${r.id}`);
    seen.set(r.id, r);
    const sig = signatureOf(r);
    for (const [id2, r2] of seen) if (id2 !== r.id && signatureOf(r2) === sig) fails.push(`${r.id} e ${id2} têm o mesmo tom, modo, andamento, solo e baixo (${sig})`);
    try { scores.push([r.id, Music.score(r)]); } catch (e) { fails.push(`${r.id}: ${e.message}`); }
  }
  for (let i = 0; i < scores.length; i++) for (let j = i + 1; j < scores.length; j++) {
    const s = melodySimilarity(scores[i][1], scores[j][1]);
    if (s >= maxSim) fails.push(`as melodias de ${scores[i][0]} e ${scores[j][0]} são parecidas demais (${s.toFixed(2)} >= ${maxSim})`);
  }
  return fails;
}

// Rampa de andamento de uma lista de temas na ordem das fases (a Fase 1 primeiro): todos dentro de [min, max] bpm, crescendo em tendência (correlação de
// Spearman entre a fase e o andamento >= minCorr, padrão 0,6) e a última pelo menos `minRise` bpm acima da primeira (padrão 20).
function checkTempoRamp(recipes, opts = {}) {
  const min = opts.min === undefined ? 50 : opts.min, max = opts.max === undefined ? 200 : opts.max, minRise = opts.minRise === undefined ? 20 : opts.minRise, minCorr = opts.minCorr === undefined ? 0.6 : opts.minCorr;
  const fails = [];
  for (const r of recipes) if (!(r.bpm >= min && r.bpm <= max)) fails.push(`${r.id}: andamento ${r.bpm} fora de ${min}..${max} bpm`);
  const rank = (v) => v.map((x) => { const less = v.filter((y) => y < x).length, eq = v.filter((y) => y === x).length; return less + (eq - 1) / 2; });
  const a = rank(recipes.map((_, i) => i)), b = rank(recipes.map((r) => r.bpm)), n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
  const corr = da && db ? num / Math.sqrt(da * db) : 0;
  if (n > 2 && corr < minCorr) fails.push(`o andamento não cresce com as fases (correlação ${corr.toFixed(2)} < ${minCorr})`);
  if (n > 1 && recipes[n - 1].bpm - recipes[0].bpm < minRise) fails.push(`a última fase só é ${recipes[n - 1].bpm - recipes[0].bpm} bpm mais rápida que a primeira (mínimo ${minRise})`);
  return fails;
}

module.exports = { Music, makeFake, clock, memStorage, makeTimers, FakeParam, FakeNode, sourcesOf, reachesDestination, checkRecipe, checkRender, checkDistinct, checkTempoRamp, melodySimilarity, signatureOf };
