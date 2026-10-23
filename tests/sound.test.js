// Testes unitários do módulo de efeitos sonoros (sem navegador, com um AudioContext FALSO). Uso: node tests/sound.test.js
// O AudioContext falso é rigoroso como o de verdade: lança erro em rampa exponencial para valor <= 0, em tempo negativo ou não numérico,
// em start() duplo, em tipo de onda inválido, e registra todo nó, conexão e automação para as conferências.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
// no jogo o módulo fica em js/sound.js; na pasta de trabalho, ao lado de tests/
const SOUND_PATH = [path.join(__dirname, "../js/sound.js"), path.join(__dirname, "../sound.js")].find((p) => fs.existsSync(p));
const Sound = require(SOUND_PATH);

let failed = 0, unhandled = 0;
process.on("unhandledRejection", () => { unhandled++; });
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}
async function atest(name, fn) {
  try { await fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}

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
  disconnect() { this.out = []; }
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
  constructor(c) { super(c, "osc"); this._type = "sine"; this.wave = null; this.frequency = new FakeParam(this, "frequency", 440); this.detune = new FakeParam(this, "detune", 0); }
  get type() { return this._type; }
  set type(v) { if (!["sine", "square", "sawtooth", "triangle"].includes(v)) return; this._type = v; this.wave = null; }
  setPeriodicWave(w) { if (!(w && w.kind === "wave")) throw new TypeError("setPeriodicWave: onda inválida"); this.wave = w; }
}
class FakeBufferSource extends FakeSource { constructor(c) { super(c, "buffer"); this.buffer = null; } }

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
    createPeriodicWave(re, im) { return this._make("createPeriodicWave", () => { if (re.length !== im.length || re.length < 2) throw new Error("tamanhos diferentes"); return { kind: "wave", re, im }; }); }
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
const sources = (ctx) => ctx.nodes.filter((n) => n.kind === "osc" || n.kind === "buffer");
const ramped = (ctx) => ctx.nodes.filter((n) => n.kind === "gain" && n.gain.events.some((e) => e.type === "lin" || e.type === "exp"));
// o ganho mestre é o que está ligado ao compressor
const masterOf = (ctx) => ctx.nodes.find((n) => n.kind === "gain" && n.out.some((o) => o.kind === "compressor"));
// nova instância já destravada, com relógio manual
function ready(extra = {}, fakeOpts = {}) {
  const fake = makeFake(fakeOpts), now = clock(), s = Sound.create({ AudioContextClass: fake.Ctx, now, ...extra });
  s.unlock();
  return { fake, now, s, ctx: fake.last() };
}

// ---------- Contrato do módulo ----------
const OLD_NAMES = ["ration", "bone", "capture", "lifelost", "transform", "postman", "levelup", "life", "gameover", "pick", "bark1", "bark2", "bark3", "meow"];
// 0.18.0 (Gatinho): miados por fase da vida, ronronar, chiado, guincho, novelo, cão inimigo (latido e rosnado), susto e 5 sons de ação
const NEW_NAMES = ["cmeow1", "cmeow2", "cmeow3", "purr", "hiss", "squeak", "yarn", "woof", "growl", "yowl", "splash", "shake", "jump", "dash", "pant"];
const ACTION_NAMES = ["splash", "shake", "jump", "dash", "pant"];
test("Sound.NAMES tem os 14 eventos antigos (10 pedidos + 3 latidos por tamanho + o miau do gato) e os 15 do Gatinho (0.18.0), e MAX_SECONDS os limites de cada um", () => {
  assert.deepStrictEqual([...Sound.NAMES], [...OLD_NAMES, ...NEW_NAMES], "os nomes antigos continuam na mesma ordem e os novos vêm depois");
  assert.deepStrictEqual({ ...Sound.MAX_SECONDS }, { ration: 0.15, bone: 0.5, capture: 0.6, lifelost: 0.7, transform: 0.5, postman: 0.35, levelup: 1.3, life: 0.6, gameover: 1.2, pick: 0.2, bark1: 0.4, bark2: 0.5, bark3: 0.8, meow: 0.45,
    cmeow1: 0.4, cmeow2: 0.5, cmeow3: 0.8, purr: 1.8, hiss: 0.55, squeak: 0.16, yarn: 0.45, woof: 0.4, growl: 0.6, yowl: 0.4, splash: 0.35, shake: 0.45, jump: 0.18, dash: 0.22, pant: 0.4 });
  assert.deepStrictEqual(Object.keys(Sound.LEVEL), [...Sound.NAMES], "LEVEL tem o ajuste de volume de todos os sons, na mesma ordem");
  assert.ok(Object.values(Sound.LEVEL).every((v) => Number.isFinite(v) && v > 0 && v <= 2), "ajustes entre 0 e 2");
  assert.strictEqual(Sound.DEFAULT_VOLUME, 0.35);
  assert.strictEqual(Sound.KEY, "cachorrinho.som.v1");
  assert.strictEqual(typeof Sound.create, "function");
  assert.strictEqual(typeof Sound.render, "function");
});
test("API do objeto criado: play, setMuted, isMuted, toggleMuted, setVolume, getVolume, unlock, supported, events, reset", () => {
  const s = Sound.create({ AudioContextClass: null });
  for (const m of ["play", "setMuted", "isMuted", "toggleMuted", "setVolume", "getVolume", "unlock", "reset"]) assert.strictEqual(typeof s[m], "function", m);
  assert.strictEqual(typeof s.supported, "boolean");
  assert.ok(Array.isArray(s.events));
});
test("carregar o módulo no Node não cria nada global nem toca em AudioContext", () => {
  assert.strictEqual(typeof AudioContext, "undefined");
  assert.strictEqual(Sound.create().supported, false, "sem Web Audio (Node): supported = false");
});

// ---------- Cada som ----------
for (const name of Sound.NAMES) {
  test(`${name}: toca, agenda nós, respeita a duração máxima (${Sound.MAX_SECONDS[name]} s) e tudo chega à saída`, () => {
    const { s, ctx } = ready();
    const before = ctx.nodes.length;
    ctx.currentTime = 5;
    assert.strictEqual(s.play(name), true);
    const src = sources(ctx);
    assert.ok(src.length >= 1 && ctx.nodes.length > before, "agendou nós");
    assert.ok(src.length <= 40 && ctx.nodes.length <= 200, `sem explosão de nós (${src.length} fontes, ${ctx.nodes.length} nós)`);
    const t0 = 5 + 0.01;
    for (const n of src) {
      assert.strictEqual(n.starts.length, 1, "start uma vez");
      assert.strictEqual(n.stops.length === 1 || n.kind === "buffer", true, "oscilador com stop");
      assert.ok(n.starts[0][0] >= 5 - 1e-9, "nada agendado no passado");
      const stop = n.kind === "buffer" ? n.starts[0][0] + n.starts[0][2] : n.stops[0];
      assert.ok(stop > n.starts[0][0], "stop depois do start");
      assert.ok(stop <= t0 + Sound.MAX_SECONDS[name] + 0.021, `${name}: fonte termina em ${(stop - t0).toFixed(3)} s (máximo ${Sound.MAX_SECONDS[name]})`);
    }
    // todo nó fonte chega ao destino (nenhum fio solto)
    const reach = (from, seen = new Set()) => {
      const node = from instanceof FakeParam ? from.owner : from;
      if (seen.has(node)) return false; seen.add(node);
      if (node.kind === "destination") return true;
      return node.out.some((o) => reach(o, seen));
    };
    for (const n of src) assert.ok(reach(n), `${name}: ${n.kind} sem caminho até a saída`);
  });
  test(`${name}: todo envelope começa e termina em 0, com ataque >= 3 ms (sem clique), valores finitos`, () => {
    const { ctx } = (() => { const r = ready(); r.ctx.currentTime = 2; r.s.play(name); return r; })();
    const env = ramped(ctx);
    assert.ok(env.length >= 1);
    for (const g of env) {
      const ev = g.gain.events;
      assert.strictEqual(ev[0].type, "set"); assert.strictEqual(ev[0].v, 0, "começa em 0");
      const lastEv = ev[ev.length - 1];
      assert.strictEqual(lastEv.type, "lin"); assert.strictEqual(lastEv.v, 0, "termina em 0");
      assert.ok(ev[1].t - ev[0].t >= 0.003, `ataque de ${((ev[1].t - ev[0].t) * 1000).toFixed(1)} ms`);
      assert.ok(lastEv.t - ev[ev.length - 2].t >= 0.005, "liberação rampada");
      for (let i = 1; i < ev.length; i++) assert.ok(ev[i].t >= ev[i - 1].t, "eventos em ordem");
      assert.ok(g.out.length >= 1);
    }
  });
  test(`${name}: Sound.render devolve a duração (0 < d <= máximo) e é determinístico`, () => {
    const a = makeFake(), b = makeFake(); const ca = new a.Ctx(), cb = new b.Ctx();
    const da = Sound.render(name, ca, ca.destination, 1), db = Sound.render(name, cb, cb.destination, 1);
    assert.ok(da > 0 && da <= Sound.MAX_SECONDS[name], `duração ${da}`);
    assert.strictEqual(da, db);
    const dump = (c) => JSON.stringify(c.nodes.map((n) => [n.kind, n._type, n.starts, n.stops, ["frequency", "gain", "Q"].map((p) => n[p] && n[p].events)]));
    assert.strictEqual(dump(ca), dump(cb), "mesma sequência de nós e automações");
    for (const buf of ca.buffers) assert.ok(buf.data.every((v) => v >= -1 && v <= 1));
  });
}

// frequências iniciais (e finais, quando há glissando) dos osciladores que fazem o som (os LFO de vibrato/tremolo, mais lentos que 30 Hz, ficam de fora)
function pitchesOf(name) {
  const f = makeFake(), ctx = new f.Ctx();
  Sound.render(name, ctx, ctx.destination, 0);
  const start = new Set(), end = new Set();
  for (const n of ctx.nodes) {
    if (n.kind !== "osc") continue;
    const ev = n.frequency.events.filter((e) => e.type === "set" || e.type === "exp");
    if (ev[0].v < 30) continue;
    start.add(Math.round(ev[0].v)); if (ev.length > 1) end.add(Math.round(ev[ev.length - 1].v));
  }
  return { start: [...start].sort((a, b) => a - b), end: [...end].sort((a, b) => a - b) };
}
test("as notas pedidas estão nos osciladores (dó mi sol dó, sol mi dó, mi sol mi dó ré sol, lá fá ré lá, si mi, sol...)", () => {
  const hz = Sound.hz, r = (x) => Math.round(x);
  const has = (name, notes) => { const p = pitchesOf(name).start; for (const n of notes) assert.ok(p.includes(r(hz(n))), `${name} sem a nota ${n} (${r(hz(n))} Hz); tem ${p.join(", ")}`); };
  has("bone", ["C5", "E5", "G5", "C6"]);
  has("lifelost", ["G4", "E4", "C4"]);
  has("life", ["E5", "G5", "E6", "C6", "D6", "G6"]);
  has("levelup", ["C5", "E5", "G5", "C6", "E6"]);
  has("gameover", ["A3", "F3", "D3", "A2"]);
  has("postman", ["B5", "E6"]);
  has("pick", ["G6"]);
  has("transform", ["C7", "E7"]);
  // glissandos pedidos: transform 300 -> 1300 Hz; capture (ganido) 900 -> 450 Hz
  const t = pitchesOf("transform"); assert.ok(t.start.includes(300) && t.end.includes(1300), "transform 300 -> 1300 Hz");
  const c = pitchesOf("capture"); assert.ok(c.start.includes(900) && c.end.includes(450), "capture 900 -> 450 Hz");
});
test("latidos por tamanho: filhote agudo e curtinho, jovem médio, adulto grave e forte (e dois latidos de cada)", () => {
  const info = (name) => { const f = makeFake(), ctx = new f.Ctx(); const dur = Sound.render(name, ctx, ctx.destination, 0); const p = pitchesOf(name); return { dur, p, osc: ctx.nodes.filter((n) => n.kind === "osc").length, types: new Set(ctx.nodes.filter((n) => n.kind === "osc").map((n) => n.type)) }; };
  const b1 = info("bark1"), b2 = info("bark2"), b3 = info("bark3");
  assert.ok(b1.p.start.includes(1250) && b1.p.start.includes(1350) && b1.p.end.some((x) => x > 1500), "filhote: 'ai-ai' agudo (1250 e 1350 Hz subindo)");
  assert.ok(b2.p.start.includes(540) && b2.p.start.includes(500) && b2.p.end.every((x) => x < 540), "jovem: 'uau-uau' médio (540 e 500 Hz caindo)");
  assert.ok(b3.p.start.includes(250) && b3.p.start.includes(230) && b3.p.end.every((x) => x < 150), "adulto: 'uó-uó' grave (250 e 230 Hz caindo até menos de 150 Hz)");
  const top = (b) => Math.max(...b.p.start);
  assert.ok(top(b1) > top(b2) && top(b2) > top(b3) && Math.min(...b1.p.start) > Math.max(...b3.p.start), "cada tamanho é mais agudo que o seguinte: filhote > jovem > adulto (o filhote inteiro acima do adulto inteiro)");
  assert.ok(b1.dur < b2.dur && b2.dur < b3.dur && b1.dur <= Sound.MAX_SECONDS.bark1 && b2.dur <= Sound.MAX_SECONDS.bark2 && b3.dur <= Sound.MAX_SECONDS.bark3, `quanto maior o cachorro, mais longo o latido (${b1.dur.toFixed(2)} < ${b2.dur.toFixed(2)} < ${b3.dur.toFixed(2)} s)`);
  assert.ok(b1.types.has("triangle") && b2.types.has("sawtooth") && b3.types.has("sawtooth") && b3.types.has("square"), "timbres: filhote triangular, jovem e adulto de dente de serra (adulto com quadrada grave)");
  for (const n of ["bark1", "bark2", "bark3"]) { const f = makeFake(), ctx = new f.Ctx(); Sound.render(n, ctx, ctx.destination, 0); assert.ok(ctx.nodes.some((x) => x.kind === "buffer"), n + " sem o ruído do latido"); }
});
test("tipos de onda pedidos: ração/lifelost triângulo, bone quadrada+triângulo, capture dente de serra, transform/pick/postman senoidal, life pulso", () => {
  const types = (name) => { const f = makeFake(), ctx = new f.Ctx(); Sound.render(name, ctx, ctx.destination, 0); return new Set(ctx.nodes.filter((n) => n.kind === "osc").map((n) => (n.wave ? "pulse" : n.type))); };
  assert.ok(types("ration").has("triangle")); assert.ok(types("lifelost").has("triangle"));
  assert.ok(types("bone").has("square") && types("bone").has("triangle"));
  assert.ok(types("capture").has("sawtooth")); assert.ok(types("transform").has("sine") && types("pick").has("sine") && types("postman").has("sine"));
  assert.ok(types("life").has("pulse")); assert.ok(types("levelup").has("sawtooth"));
  // ração: ruído (estalo) além dos blips; capture: varredura de ruído
  for (const n of ["ration", "capture"]) { const f = makeFake(), ctx = new f.Ctx(); Sound.render(n, ctx, ctx.destination, 0); assert.ok(ctx.nodes.some((x) => x.kind === "buffer"), n + " sem ruído"); }
  // pulso: criado uma vez por contexto (cache), mesmo com 6 notas e dois toques
  const f = makeFake(), ctx = new f.Ctx(); let made = 0; const orig = ctx.createPeriodicWave.bind(ctx); ctx.createPeriodicWave = (a, b) => { made++; return orig(a, b); };
  Sound.render("life", ctx, ctx.destination, 0); Sound.render("life", ctx, ctx.destination, 2);
  assert.strictEqual(made, 1, "onda de pulso reaproveitada");
});
test("unlock deixa pronto o buffer de ruído e a onda de pulso (o 1º som não engasga)", () => {
  const fake = makeFake(), s = Sound.create({ AudioContextClass: fake.Ctx });
  s.unlock();
  assert.strictEqual(fake.last().buffers.length, 1, "ruído já criado");
});

// ---------- Sons do Gatinho (0.18.0) ----------
// Auxiliares: leem o que o som agendou no AudioContext falso (osciladores, ganhos, filtros) sem precisar tocar de verdade.
function build(name) { const f = makeFake(), ctx = new f.Ctx(); const dur = Sound.render(name, ctx, ctx.destination, 0); return { ctx, dur }; }
const isMod = (n) => n.out.some((d) => d.out && d.out.some((x) => x instanceof FakeParam)); // oscilador que mexe em outro parâmetro (vibrato, tremolo, trem de pulsos)
function oscList(ctx) {
  return ctx.nodes.filter((n) => n.kind === "osc").map((n) => {
    const ev = n.frequency.events.filter((e) => e.type === "set" || e.type === "exp");
    return { n, mod: isMod(n), t: n.starts[0][0], end: n.stops[0] - 0.02, f: ev[0].v, f2: ev[ev.length - 1].v, type: n.wave ? "pulse" : n.type };
  });
}
const audioOscs = (ctx) => oscList(ctx).filter((o) => !o.mod);
const modOscs = (ctx) => oscList(ctx).filter((o) => o.mod);
const freqAt = (o, t) => (o.end > o.t ? o.f * Math.pow(o.f2 / o.f, Math.min(1, Math.max(0, (t - o.t) / (o.end - o.t)))) : o.f);
// contorno da F0: a MENOR frequência entre as vozes tonais ativas a cada 5 ms (harmônicos são sempre mais agudos que a fundamental)
function f0Contour(name) {
  const { ctx, dur } = build(name), osc = audioOscs(ctx), pts = [];
  for (let t = 0; t < dur - 0.004; t += 0.005) {
    const act = osc.filter((o) => t >= o.t - 1e-9 && t < o.end);
    if (act.length) pts.push([t, Math.min(...act.map((o) => freqAt(o, t)))]);
  }
  return pts;
}
// o ganho de envelope de cada voz (fonte): { peak, t0, t1 }, seguindo os fios da fonte até o primeiro ganho com rampa
function envelopesOf(ctx) {
  const out = [];
  for (const src of sources(ctx)) {
    if (isMod(src)) continue;
    const seen = new Set(), queue = [src];
    let env = null;
    while (queue.length && !env) {
      const nd = queue.shift();
      if (!(nd instanceof FakeNode) || seen.has(nd)) continue;
      seen.add(nd);
      if (nd.kind === "gain" && nd.gain.events.some((e) => e.type === "lin" || e.type === "exp")) { env = nd; break; }
      queue.push(...nd.out);
    }
    assert.ok(env, "voz sem envelope");
    const ev = env.gain.events;
    out.push({ peak: ev[1].v, t0: ev[0].t, t1: ev[ev.length - 1].t, kind: src.kind, src });
  }
  return out;
}
// GANHO AGREGADO de um som: o maior valor da soma dos ganhos de pico das vozes que soam ao mesmo tempo, vezes o ajuste de volume (LEVEL) do som.
// É uma medida de projeto (não considera filtros): serve para comparar sons entre si; o volume de verdade é medido renderizando o áudio.
function aggGain(name) {
  const { ctx } = build(name), envs = envelopesOf(ctx);
  let best = 0;
  for (const e of envs) { const sum = envs.filter((x) => x.t0 <= e.t0 + 1e-9 && x.t1 > e.t0 + 1e-9).reduce((a, x) => a + x.peak, 0); best = Math.max(best, sum); }
  return best * Sound.LEVEL[name];
}
// filtros ligados a uma fonte de ruído: { type, f, f2 (para onde varre), q }
function filtersOf(buf) {
  const out = []; let nd = buf.out[0];
  while (nd && nd.kind === "biquad") {
    const ev = nd.frequency.events.filter((e) => e.type === "set" || e.type === "exp");
    out.push({ type: nd._type, f: ev[0].v, f2: ev[ev.length - 1].v, q: nd.Q.value }); nd = nd.out[0];
  }
  return out;
}
const buffersOf = (ctx) => ctx.nodes.filter((n) => n.kind === "buffer");
// duty (ciclo de trabalho) de uma onda de pulso criada por createPeriodicWave, lido dos coeficientes da série de Fourier
const dutyOf = (w) => Math.atan2(w.im[1], w.re[1]) / Math.PI;

// Os números dos sons novos são ESCOLHAS DE DESIGN INSPIRADAS EM LITERATURA RECENTE, AINDA NÃO VERIFICADAS (a rede estava bloqueada para artigos): os
// testes abaixo conferem que o som escrito em sound.js cumpre o desenho pedido, não que o desenho copie um artigo.
test("Gatinho: os 15 sons novos existem, tocam e cada um conta como UMA voz (8 ao mesmo tempo, o 9º é recusado)", () => {
  const { s } = ready();
  assert.strictEqual(NEW_NAMES.length, 15);
  const res = NEW_NAMES.slice(0, 9).map((n) => s.play(n));
  assert.deepStrictEqual(res, [true, true, true, true, true, true, true, true, false]);
  assert.ok(NEW_NAMES.every((n) => Sound.NAMES.includes(n) && typeof Sound.MAX_SECONDS[n] === "number" && typeof Sound.LEVEL[n] === "number"));
});
test("Gatinho: pico de pior caso (soma dos ganhos de pico simultâneos x ajuste x volume padrão) abaixo de 1 em todos os sons, em especial purr e cmeow3", () => {
  for (const n of Sound.NAMES) {
    const worst = aggGain(n) * Sound.DEFAULT_VOLUME;
    assert.ok(worst < 1, `${n}: pior caso ${worst.toFixed(2)}`);
  }
  assert.ok(aggGain("purr") * Sound.DEFAULT_VOLUME < 0.9 && aggGain("cmeow3") * Sound.DEFAULT_VOLUME < 0.9, "purr e cmeow3 com folga");
});
test("Gatinho: o ruído tem 1 s de buffer; só o ronronar (1,5 s) usa laço (nenhum som antigo mudou) e os outros sons novos cabem no buffer sem cortar", () => {
  for (const n of Sound.NAMES) {
    const { ctx } = build(n);
    for (const b of buffersOf(ctx)) {
      const [, off, dur] = b.starts[0];
      if (n === "purr") assert.strictEqual(b.loop, true, "purr: ruído em laço (dura mais que o buffer)");
      else assert.ok(!b.loop, n + ": sem laço");
      if (NEW_NAMES.includes(n) && n !== "purr") assert.ok(off + dur <= 1 + 1e-9, `${n}: ruído de ${off.toFixed(2)} a ${(off + dur).toFixed(2)} s passa do buffer de 1 s`);
    }
  }
});
test("Gatinho: tudo sintetizado, sem arquivo de áudio, biblioteca nem rede (nenhum decodeAudioData, mp3/wav/ogg, fetch, <audio>)", () => {
  const src = fs.readFileSync(SOUND_PATH, "utf8");
  assert.ok(!/decodeAudioData|\.(mp3|wav|ogg|m4a)\b|fetch\(|XMLHttpRequest|new Audio\(|<audio|\brequire\(/.test(src));
});

// ----- miados por fase da vida -----
test("miados por fase da vida: cmeow1 (filhote) > cmeow2 (jovem) > cmeow3 (adulto) na F0 inicial e na máxima; mais longo quanto maior o gato", () => {
  const info = {};
  for (const n of ["cmeow1", "cmeow2", "cmeow3"]) {
    const pts = f0Contour(n), fs_ = pts.map((p) => p[1]), max = Math.max(...fs_);
    info[n] = { init: pts[0][1], max, tmax: pts[fs_.indexOf(max)][0], final: pts[pts.length - 1][1], dur: build(n).dur };
  }
  const { cmeow1: a, cmeow2: b, cmeow3: c } = info;
  assert.ok(a.init > b.init && b.init > c.init, `F0 inicial ${a.init.toFixed(0)} > ${b.init.toFixed(0)} > ${c.init.toFixed(0)} Hz`);
  assert.ok(a.max > b.max && b.max > c.max, "F0 máxima na mesma ordem");
  assert.ok(a.dur < b.dur && b.dur < c.dur, `duração ${a.dur.toFixed(2)} < ${b.dur.toFixed(2)} < ${c.dur.toFixed(2)} s`);
  assert.ok(a.init >= 1300 && a.init <= 1500, "filhote: F0 inicial de 1,3 a 1,5 kHz");
  assert.ok(b.init >= 800 && b.init <= 1000, "jovem: F0 inicial de 0,8 a 1,0 kHz");
  assert.ok(c.max >= 400 && c.max <= 600, "adulto: F0 máxima de 0,4 a 0,6 kHz");
  assert.ok(a.dur >= 0.25 && a.dur <= 0.4 && b.dur >= 0.35 && b.dur <= 0.5 && c.dur >= 0.6 && c.dur <= 0.8, "durações: filhote 0,25-0,4 s, jovem ~0,4 s, adulto 0,6-0,8 s");
  assert.ok(a.final < a.init * 0.8 && b.final < b.init * 0.85, "filhote e jovem terminam mais graves do que começam (caindo)");
  assert.ok(c.max > c.init * 1.3 && c.max > c.final * 1.3 && c.tmax > 0.1 && c.tmax < c.dur - 0.2, `adulto: contorno sobe-e-desce (começa em ${c.init.toFixed(0)}, máximo ${c.max.toFixed(0)} Hz em ${c.tmax.toFixed(2)} s, termina em ${c.final.toFixed(0)})`);
});
test("miados: dente de serra com passa-baixa que ABRE e FECHA (formantes de \"miau\") em todas as fases; sopro de ruído leve no filhote", () => {
  for (const n of ["cmeow1", "cmeow2", "cmeow3"]) {
    const { ctx } = build(n);
    assert.ok(audioOscs(ctx).some((o) => o.type === "sawtooth"), n + ": dente de serra");
    const lp = ctx.nodes.filter((x) => x.kind === "biquad" && x._type === "lowpass").map((x) => x.frequency.events.filter((e) => e.type === "set" || e.type === "exp"));
    assert.ok(lp.some((ev) => ev.length > 1 && ev[1].v > ev[0].v * 1.5), n + ": o filtro abre");
    assert.ok(lp.some((ev) => ev.length > 1 && ev[1].v < ev[0].v * 0.6), n + ": o filtro fecha");
  }
  const k = build("cmeow1").ctx;
  assert.ok(buffersOf(k).length >= 1, "filhote com sopro");
  const sopro = filtersOf(buffersOf(k)[0])[0];
  assert.ok(sopro.f >= 4000, "sopro agudo");
  assert.strictEqual(buffersOf(build("cmeow3").ctx).length, 0, "adulto sem ruído");
});

// ----- ronronar -----
test("purr: trem de pulsos de 20 a 35 Hz (ciclo < 50%) modulando portadoras graves de 90 a 180 Hz, inspiração mais fraca que a expiração, 1,2 a 1,8 s", () => {
  const { ctx, dur } = build("purr");
  assert.ok(dur >= 1.2 && dur <= 1.8, `duração ${dur}`);
  const mods = modOscs(ctx);
  assert.strictEqual(mods.length, 1, "um único trem de pulsos compartilhado (todas as vozes pulsam juntas)");
  const m = mods[0];
  assert.ok(m.f >= 20 && m.f <= 35 && m.f === m.f2, `taxa de modulação ${m.f} Hz`);
  assert.strictEqual(m.type, "pulse");
  const duty = dutyOf(m.n.wave);
  assert.ok(duty > 0.2 && duty < 0.5, `ciclo dos pulsos ${duty.toFixed(2)}`);
  // ganho do barramento: 1 durante o pulso e cai para ~0,3 entre os pulsos (ainda audível, mas bem pulsado)
  const depthGain = m.n.out[0], bus = depthGain.out[0].owner;
  const amp = depthGain.gain.events[0].v, base = bus.gain.events[0].v;
  const high = base + amp, low = base - (amp * duty) / (1 - duty);
  assert.ok(Math.abs(high - 1) < 1e-9 && low > 0.2 && low < 0.5, `ganho entre pulsos ${low.toFixed(2)} e durante ${high.toFixed(2)}`);
  // portadoras
  const carriers = audioOscs(ctx).filter((o) => o.type === "sawtooth");
  assert.ok(carriers.length >= 2 && carriers.every((c) => c.f >= 90 && c.f <= 180 && c.f2 >= 90), "portadoras graves de dente de serra entre 90 e 180 Hz");
  assert.ok(carriers.every((c) => (c.t * m.f) % 1 < 1e-9 || (c.t * m.f) % 1 > 1 - 1e-9), "cada portadora entra no começo de um pulso (travada na fase)");
  assert.ok(audioOscs(ctx).every((o) => o.n.starts[0][0] >= 0), "nada no passado");
  // todas as vozes passam pelo barramento pulsado
  for (const e of envelopesOf(ctx)) {
    let node = e.src, hit = false; const seen = new Set(), q = [node];
    while (q.length && !hit) { const nd = q.shift(); if (!(nd instanceof FakeNode) || seen.has(nd)) continue; seen.add(nd); if (nd === bus) hit = true; q.push(...nd.out); }
    assert.ok(hit, "voz do ronronar fora do trem de pulsos");
  }
  // respiração: a portadora que começa em 0 (inspiração) é mais fraca que a que começa depois (expiração)
  const env = envelopesOf(ctx).filter((e) => e.kind === "osc" && e.src.type !== "triangle" && !e.src.wave && e.src._type === "sawtooth");
  const insp = env.find((e) => e.t0 === 0), expi = env.find((e) => e.t0 > 0.4);
  assert.ok(insp && expi && expi.peak > insp.peak * 1.25, "expiração mais forte que a inspiração");
  assert.ok(expi.t0 > insp.t0 && expi.t0 < insp.t1 && expi.t1 > insp.t1, "a expiração começa antes da inspiração acabar (sem buraco) e termina depois");
  assert.ok(buffersOf(ctx).length === 1, "sopro grave de ruído");
});

// ----- chiado -----
test("hiss: só ruído de banda larga (nenhum oscilador), filtros de Q baixo, passa-alta entre 2 e 8 kHz, ataque seco e queda, ~0,5 s", () => {
  const { ctx, dur } = build("hiss");
  assert.strictEqual(ctx.nodes.filter((n) => n.kind === "osc").length, 0, "nenhum oscilador: nenhuma componente tonal");
  const bufs = buffersOf(ctx);
  assert.ok(bufs.length >= 2);
  assert.ok(dur >= 0.4 && dur <= 0.55, `duração ${dur}`);
  const hp = [];
  for (const b of bufs) for (const f of filtersOf(b)) {
    assert.ok(f.q <= 1, `Q ${f.q}: filtro estreito deixaria o chiado tonal`);
    if (f.type === "highpass") hp.push(f);
    if (f.type === "lowpass") assert.ok(f.f >= 6000, "o passa-baixa só limita a banda lá em cima");
    assert.ok(f.type === "highpass" || f.type === "lowpass", "sem passa-banda estreito");
  }
  assert.ok(hp.length >= 2 && hp.every((f) => f.f >= 2000 && f.f <= 8000), "passa-alta entre 2 e 8 kHz");
  const body = envelopesOf(ctx).sort((a, b) => b.t1 - a.t1)[0];
  // ataque seco (<= 15 ms) e queda forte (o nível cai a 30% ou menos antes do fim) em todas as camadas
  for (const b of bufs) {
    let nd = b; while (nd && !(nd.kind === "gain" && nd.gain.events.some((x) => x.type === "lin"))) nd = nd.out[0];
    const ev = nd.gain.events;
    assert.ok(ev[1].t - ev[0].t <= 0.015, "ataque seco");
    assert.ok(ev[2].v <= ev[1].v * 0.31, "queda");
  }
  assert.ok(body.t1 - body.t0 >= 0.4, "o sopro principal dura ~0,5 s");
});

// ----- guincho do ratinho -----
test("squeak: fundamental entre 3 e 4,5 kHz com leve queda e harmônicos, 80 a 160 ms, baixo e pode tocar dezenas de vezes por fase", () => {
  const { ctx, dur } = build("squeak");
  assert.ok(dur >= 0.08 && dur <= 0.16, `duração ${dur}`);
  const osc = audioOscs(ctx), fund = osc.reduce((a, b) => (a.f <= b.f ? a : b));
  assert.ok(fund.f >= 3000 && fund.f <= 4500, `fundamental ${fund.f} Hz`);
  assert.ok(fund.f2 < fund.f && fund.f2 > fund.f * 0.75 && fund.f2 >= 3000, `leve queda de ${fund.f} para ${fund.f2} Hz`);
  assert.ok(osc.every((o) => o.f >= fund.f * 0.999), "nenhuma voz abaixo da fundamental");
  assert.ok(osc.some((o) => Math.abs(o.f / fund.f - 2) < 0.05) && osc.some((o) => Math.abs(o.f / fund.f - 3) < 0.05), "2º e 3º harmônicos");
  assert.ok(modOscs(ctx).length >= 1, "vibrato rápido");
  const { s, ctx: c2, now } = ready();
  for (let i = 0; i < 40; i++) { c2.currentTime = i * 0.1; now.set(1000 + i * 100); assert.strictEqual(s.play("squeak"), true, "pedido " + i); }
  assert.strictEqual(s.events.length, 40);
});

// ----- novelo -----
test("yarn: \"boing\" de mola (senoide que sobe e assenta) com farfalhar de papel; sem arpejo, sem quadrada e sem as notas do bone", () => {
  const { ctx, dur } = build("yarn");
  assert.ok(dur >= 0.3 && dur <= 0.45, `duração ${dur}`);
  const osc = audioOscs(ctx);
  assert.ok(osc.every((o) => o.type === "sine" || o.type === "triangle"), "só senoide e triangular (nada de quadrada/serra/pulso)");
  assert.ok(osc.some((o) => o.type === "sine" && o.f2 >= o.f * 2.5), "o boing sobe ao menos 2,5 vezes");
  assert.ok(osc.some((o) => o.type === "sine" && o.f2 < o.f), "e assenta caindo");
  assert.ok(buffersOf(ctx).length >= 1, "farfalhar de papel (ruído)");
  const bone = pitchesOf("bone").start, mine = pitchesOf("yarn").start;
  assert.ok(!mine.some((f) => bone.some((b) => Math.abs(f / b - 1) < 0.02)), `yarn ${mine.join(",")} não usa as notas do bone ${bone.join(",")}`);
  assert.ok(mine.length <= 3 + 1 && osc.filter((o) => o.f < 400 && o.type === "sine").length === 1, "um só glissando, não um arpejo");
});

// ----- cão inimigo -----
test("woof: latido curto do cão inimigo (0,25 a 0,4 s, F0 de 0,5 a 0,8 kHz caindo, dente de serra com formante e ruído)", () => {
  const { ctx, dur } = build("woof");
  assert.ok(dur >= 0.25 && dur <= 0.4, `duração ${dur}`);
  const saw = audioOscs(ctx).filter((o) => o.type === "sawtooth");
  assert.ok(saw.length >= 1 && saw.every((o) => o.f >= 500 && o.f <= 800 && o.f2 < o.f * 0.8), "F0 de 0,5 a 0,8 kHz, caindo");
  const lp = ctx.nodes.filter((x) => x.kind === "biquad" && x._type === "lowpass" && x.Q.value >= 2);
  assert.ok(lp.length >= 1, "formante: passa-baixa ressonante");
  const ev = lp[0].frequency.events.filter((e) => e.type === "set" || e.type === "exp");
  assert.ok(ev[1].v < ev[0].v * 0.5, "o formante fecha (\"uóf\")");
  assert.ok(buffersOf(ctx).length >= 1);
});
test("growl: rosnado de ~0,5 s com dentes de serra graves de 90 a 145 Hz, modulação de amplitude de ~30 Hz (20 a 40 Hz) e ruído grave", () => {
  const { ctx, dur } = build("growl");
  assert.ok(dur >= 0.4 && dur <= 0.6, `duração ${dur}`);
  const saw = audioOscs(ctx).filter((o) => o.type === "sawtooth");
  assert.ok(saw.length >= 2 && saw.every((o) => o.f >= 90 && o.f <= 145 && o.f2 >= 90), "serras graves");
  const mods = modOscs(ctx);
  assert.ok(mods.length >= 3 && mods.every((m) => m.f >= 20 && m.f <= 40), `taxas de modulação ${mods.map((m) => m.f).join(", ")} Hz`);
  assert.ok(new Set(mods.map((m) => m.f)).size >= 2, "taxas um pouco diferentes (rosnado irregular)");
  assert.ok(mods.some((m) => Math.abs(m.f - 30) <= 1), "uma delas em ~30 Hz");
  const b = buffersOf(ctx);
  assert.ok(b.length >= 1 && filtersOf(b[0])[0].type === "lowpass" && filtersOf(b[0])[0].f <= 2000, "ruído grave");
});
test("yowl: miado de susto/dor agudo e caindo (~0,35 s, F0 inicial >= 1 kHz, queda de mais da metade), duas serras desafinadas e ruído áspero", () => {
  const { ctx, dur } = build("yowl");
  assert.ok(dur >= 0.3 && dur <= 0.4, `duração ${dur}`);
  const saw = audioOscs(ctx).filter((o) => o.type === "sawtooth");
  assert.ok(saw.length >= 2 && saw.every((o) => o.f >= 1000 && o.f2 < o.f * 0.55), "agudo e caindo");
  const r = Math.max(...saw.map((o) => o.f)) / Math.min(...saw.map((o) => o.f));
  assert.ok(r > 1.01 && r < 1.06, `desafinadas ${(100 * (r - 1)).toFixed(1)}% (aspereza)`);
  assert.ok(buffersOf(ctx).length >= 1);
  assert.ok(f0Contour("yowl")[0][1] > f0Contour("cmeow3")[0][1] * 2, "bem mais agudo que o miado do adulto");
});

// ----- sons de ação -----
test("sons de ação (splash, shake, jump, dash, pant) e squeak são DISCRETOS: ganho agregado menor que o de qualquer som de evento e <= 0,75 da mediana", () => {
  const repeated = [...ACTION_NAMES, "squeak"];
  const events = Sound.NAMES.filter((n) => !repeated.includes(n)), aggs = events.map(aggGain).sort((a, b) => a - b);
  const min = aggs[0], median = aggs[Math.floor(aggs.length / 2)];
  assert.strictEqual(events.length, 23);
  for (const n of repeated) {
    const g = aggGain(n);
    assert.ok(g < min, `${n}: ganho agregado ${g.toFixed(2)} deve ser menor que o do menor som de evento (${min.toFixed(2)})`);
    assert.ok(g <= 0.75 * median, `${n}: ${g.toFixed(2)} <= 0,75 x mediana ${median.toFixed(2)}`);
  }
  for (const n of ["shake", "splash"]) assert.ok(aggGain(n) < aggGain("bone") && aggGain(n) < aggGain("ration") && aggGain(n) < aggGain("meow"), n + " mais baixo que ração, osso e miau");
});
test("splash: pancada de ruído, respingo que cai e bolha senoidal que sobe (~0,3 s)", () => {
  const { ctx, dur } = build("splash");
  assert.ok(dur >= 0.25 && dur <= 0.35, `duração ${dur}`);
  const b = buffersOf(ctx).map(filtersOf);
  assert.ok(b.length >= 2 && b.some((f) => f[0].type === "bandpass" && f[0].f2 < f[0].f), "respingo passa-banda que cai");
  assert.ok(audioOscs(ctx).some((o) => o.type === "sine" && o.f2 > o.f * 2 && o.end - o.t <= 0.12), "bolha curta que sobe");
});
test("shake: 8 rajadas rápidas de ruído passa-banda (~0,4 s), cada uma mais fraca que a anterior", () => {
  const { ctx, dur } = build("shake");
  assert.ok(dur >= 0.35 && dur <= 0.45, `duração ${dur}`);
  const bufs = buffersOf(ctx);
  assert.strictEqual(bufs.length, 8);
  assert.ok(bufs.every((b) => filtersOf(b)[0].type === "bandpass"));
  const env = envelopesOf(ctx).sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < env.length; i++) { assert.ok(env[i].t0 - env[i - 1].t0 >= 0.04 && env[i].t0 - env[i - 1].t0 <= 0.07, "rajadas a cada ~50 ms"); assert.ok(env[i].peak < env[i - 1].peak, "cada rajada mais fraca"); assert.ok(env[i].t0 >= env[i - 1].t1 - 1e-9 - 0.01, "sem emendar"); }
});
test("jump: \"tum\" curtíssimo (seno grave caindo) e sopro que sobe, ~0,15 s", () => {
  const { ctx, dur } = build("jump");
  assert.ok(dur >= 0.1 && dur <= 0.18, `duração ${dur}`);
  assert.ok(audioOscs(ctx).some((o) => o.type === "sine" && o.f <= 200 && o.f2 < o.f && o.end - o.t <= 0.08), "tum grave e curtíssimo");
  assert.ok(buffersOf(ctx).some((b) => { const f = filtersOf(b)[0]; return f.type === "bandpass" && f.f2 > f.f * 2; }), "sopro que sobe");
});
test("dash: arrancada de ~0,2 s com sopro passa-banda que SOBE (600 -> 3600 Hz)", () => {
  const { ctx, dur } = build("dash");
  assert.ok(dur >= 0.15 && dur <= 0.22, `duração ${dur}`);
  assert.ok(buffersOf(ctx).some((b) => { const f = filtersOf(b)[0]; return f.type === "bandpass" && f.f2 >= f.f * 4; }), "sopro que sobe");
});
test("pant: respiração de ~0,35 s em DUAS ondas de ruído passa-banda, a segunda mais fraca", () => {
  const { ctx, dur } = build("pant");
  assert.ok(dur >= 0.3 && dur <= 0.4, `duração ${dur}`);
  const bufs = buffersOf(ctx), env = envelopesOf(ctx).sort((a, b) => a.t0 - b.t0);
  assert.strictEqual(bufs.length, 2);
  assert.ok(bufs.every((b) => filtersOf(b)[0].type === "bandpass"));
  assert.ok(env[1].t0 >= env[0].t1 && env[1].peak < env[0].peak, "duas ondas separadas, a segunda mais fraca");
  assert.strictEqual(ctx.nodes.filter((n) => n.kind === "osc").length, 0, "só respiração");
});

// ----- contrato com o README -----
test("README: a subseção \"Sons do Gatinho (0.18.0)\" lista os 15 sons, diz quando tocar cada um e avisa que os números ainda não foram verificados", () => {
  const rp = path.join(__dirname, "../README.md");
  if (!fs.existsSync(rp)) return; // (a pasta de trabalho pode não ter o README)
  const readme = fs.readFileSync(rp, "utf8"), i = readme.indexOf("### Sons do Gatinho (0.18.0)");
  assert.ok(i >= 0, "subseção não encontrada");
  const rest = readme.slice(i + 10), j = rest.search(/\n##+ /), sec = j < 0 ? rest : rest.slice(0, j);
  for (const n of NEW_NAMES) assert.ok(sec.includes("`" + n + "`"), "README sem o som " + n);
  assert.ok(sec.includes("escolha de design inspirada em literatura, ainda não verificada"), "frase de honestidade");
  assert.ok(/Quando tocar/i.test(sec));
  assert.ok(!/\bet al\b|doi\.org|\(\s*(19|20)\d\d\s*\)/.test(sec), "nenhum artigo citado como fonte verificada (sem et al., doi nem ano entre parênteses)");
  const src = fs.readFileSync(SOUND_PATH, "utf8");
  assert.ok(/INSPIRADAS EM LITERATURA RECENTE, AINDA NÃO VERIFICADAS/.test(src), "aviso também no código");
});

test("render: nome inexistente devolve 0 e não cria nó; sem contexto ou destino lança TypeError", () => {
  const f = makeFake(), ctx = new f.Ctx();
  for (const n of ["", "xyz", null, undefined, 3, {}, "constructor", "__proto__", "toString", "hasOwnProperty"]) assert.strictEqual(Sound.render(n, ctx, ctx.destination, 0), 0, String(n));
  assert.strictEqual(ctx.nodes.length, 1, "só o destino");
  assert.throws(() => Sound.render("bone", null, null, 0), TypeError);
  assert.throws(() => Sound.render("bone", ctx, null, 0), TypeError);
});
test("render: sem t0 usa o instante atual do contexto; t0 inválido (NaN) também", () => {
  const f = makeFake(), ctx = new f.Ctx(); ctx.currentTime = 3.5;
  Sound.render("pick", ctx, ctx.destination);
  assert.ok(sources(ctx).every((n) => n.starts[0][0] >= 3.5 - 1e-9));
  const c2 = new f.Ctx(); c2.currentTime = 1;
  Sound.render("pick", c2, c2.destination, NaN);
  assert.ok(sources(c2).every((n) => n.starts[0][0] >= 1 - 1e-9));
});
test("render: o ruído é um buffer de 1 s com semente fixa, criado uma vez por contexto (cache) e igual em contextos diferentes", () => {
  const f = makeFake(), c1 = new f.Ctx(), c2 = new f.Ctx();
  Sound.render("ration", c1, c1.destination, 0); Sound.render("ration", c1, c1.destination, 1); Sound.render("capture", c1, c1.destination, 2);
  Sound.render("ration", c2, c2.destination, 0);
  assert.strictEqual(c1.buffers.length, 1, "um buffer só no contexto 1");
  assert.strictEqual(c1.buffers[0].length, 44100);
  assert.ok(Buffer.from(c1.buffers[0].data.buffer).equals(Buffer.from(c2.buffers[0].data.buffer)), "mesmo ruído sempre");
  const d = c1.buffers[0].data; let sum = 0; for (const v of d) sum += v;
  assert.ok(Math.abs(sum / d.length) < 0.02, "média perto de zero");
});
test("render: sem createPeriodicWave (navegador antigo) a onda de pulso cai para quadrada", () => {
  const f = makeFake({ failOn: "createPeriodicWave" }), ctx = new f.Ctx();
  assert.ok(Sound.render("life", ctx, ctx.destination, 0) > 0);
  assert.ok(sources(ctx).some((n) => n.kind === "osc" && n.type === "square"));
});

// ---------- Tocador: mudo, taxa, vozes ----------
test("todos os nomes tocam (true) e ficam registrados como played", () => {
  const { s, ctx } = ready();
  for (const name of Sound.NAMES) { assert.strictEqual(s.play(name), true, name); ctx.currentTime += 3; }
  assert.deepStrictEqual(s.events.map((e) => e.name), [...Sound.NAMES]);
  assert.ok(s.events.every((e) => e.played === true));
});
test("mudo: nada toca, nada é agendado, os pedidos continuam registrados (played=false) e desmutar volta a tocar", () => {
  const { s, ctx } = ready();
  const nodesBefore = ctx.nodes.length;
  assert.strictEqual(s.setMuted(true), true);
  assert.strictEqual(s.isMuted(), true);
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(ctx.nodes.length, nodesBefore, "nenhum nó novo");
  assert.deepStrictEqual(s.events.map((e) => [e.name, e.played]), [["bone", false]]);
  assert.strictEqual(s.toggleMuted(), false);
  assert.strictEqual(s.isMuted(), false);
  assert.strictEqual(s.play("bone"), true, "o pedido barrado pelo mudo não conta para o limite de taxa");
});
test("limite de taxa: o mesmo som não repete antes de 60 ms; outros sons não são afetados", () => {
  const { s, now } = ready();
  now.set(1000);
  assert.strictEqual(s.play("ration"), true);
  now.set(1030); assert.strictEqual(s.play("ration"), false, "30 ms depois");
  assert.strictEqual(s.play("pick"), true, "outro som, no mesmo instante");
  now.set(1059); assert.strictEqual(s.play("ration"), false, "59 ms");
  now.set(1060); assert.strictEqual(s.play("ration"), true, "60 ms");
  now.set(1061); assert.strictEqual(s.play("ration"), false, "o pedido barrado não renova o relógio");
  now.set(1120); assert.strictEqual(s.play("ration"), true);
  now.set(500); assert.strictEqual(s.play("ration"), true, "relógio do sistema voltou para trás: não trava");
  assert.deepStrictEqual(s.events.map((e) => e.played), [true, false, true, false, true, false, true, true]);
});
test("no máximo 8 sons ao mesmo tempo; quando terminam, volta a tocar", () => {
  const { s, ctx, fake, now } = ready();
  const res = [];
  // todos os nomes diferentes no mesmo instante: do 9º em diante são recusados
  for (const n of Sound.NAMES) res.push(s.play(n));
  assert.deepStrictEqual(res, Sound.NAMES.map((_, i) => i < 8));
  ctx.currentTime = 0.5; // ration, bone, transform e postman já acabaram: sobram 4 vozes
  assert.strictEqual(s.play("gameover"), true, "há vaga depois que sons curtos terminam");
  ctx.currentTime = 10; now.add(1000);
  assert.strictEqual(s.play("levelup"), true, "tudo terminou");
  assert.strictEqual(fake.instances.length, 1, "sempre o mesmo contexto");
});
test("atraso opcional: play(nome, { delay }) agenda mais tarde no relógio do áudio (limitado a 0..5 s)", () => {
  const { s, ctx } = ready();
  ctx.currentTime = 2;
  assert.strictEqual(s.play("pick", { delay: 0.5 }), true);
  assert.ok(Math.min(...sources(ctx).map((n) => n.starts[0][0])) >= 2.5 - 1e-9);
  ctx.currentTime = 20;
  const n0 = sources(ctx).length;
  s.play("bone", { delay: 100 });
  assert.ok(Math.min(...sources(ctx).slice(n0).map((n) => n.starts[0][0])) <= 25.02, "limitado a 5 s");
  const n1 = sources(ctx).length;
  ctx.currentTime = 30;
  s.play("capture", { delay: -3 }); s.play("lifelost", { delay: NaN });
  assert.ok(Math.min(...sources(ctx).slice(n1).map((n) => n.starts[0][0])) >= 30 - 1e-9);
});
test("nomes inválidos devolvem false, não lançam erro, não agendam nada e ficam em events", () => {
  const { s, ctx } = ready();
  const nodes = ctx.nodes.length;
  const bad = ["", "foo", "BONE", " bone", null, undefined, 42, {}, [], true, "constructor", "__proto__", "toString", "hasOwnProperty", Symbol("x"), { toString() { throw new Error("x"); } }];
  for (const n of bad) assert.strictEqual(s.play(n), false);
  assert.strictEqual(ctx.nodes.length, nodes);
  assert.strictEqual(s.events.length, bad.length);
  assert.ok(s.events.every((e) => e.played === false && typeof e.name === "string"));
});
test("events: guarda { name, t, played }, no máximo os 200 últimos, e reset() limpa a MESMA lista e o limite de taxa", () => {
  const { s, now } = ready();
  const ref = s.events;
  now.set(5000);
  s.play("pick"); s.play("nope");
  assert.deepStrictEqual(ref.map((e) => ({ ...e })), [{ name: "pick", t: 5000, played: true }, { name: "nope", t: 5000, played: false }]);
  for (let i = 0; i < 250; i++) { now.add(100); s.play("zzz" + i); }
  assert.strictEqual(ref.length, 200);
  assert.strictEqual(ref[0].name, "zzz50");
  assert.strictEqual(ref[199].name, "zzz249");
  s.reset();
  assert.strictEqual(s.events, ref, "mesma referência");
  assert.strictEqual(ref.length, 0);
  now.set(9000); assert.strictEqual(s.play("ration"), true);
  assert.strictEqual(s.play("ration"), false, "limite de taxa vale de novo");
  s.reset();
  assert.strictEqual(s.play("ration"), true, "reset zera o limite de taxa");
});
test("o pedido é registrado com um nome comprido cortado (sem estourar memória)", () => {
  const { s } = ready();
  s.play("x".repeat(10000));
  assert.ok(s.events[0].name.length <= 40);
});

// ---------- Robustez ----------
test("sem Web Audio (AudioContextClass null): supported=false, unlock e play devolvem false sem erro; mudo e volume ainda funcionam", () => {
  const s = Sound.create({ AudioContextClass: null });
  assert.strictEqual(s.supported, false);
  assert.strictEqual(s.unlock(), false);
  for (const n of Sound.NAMES) assert.strictEqual(s.play(n), false);
  assert.strictEqual(s.events.length, Sound.NAMES.length);
  s.setMuted(true); assert.strictEqual(s.isMuted(), true);
  s.setVolume(0.2); assert.strictEqual(s.getVolume(), 0.2);
});
test("AudioContext que lança no construtor: unlock false, supported vira false, play false, nunca lança", () => {
  const fake = makeFake({ throwCtor: true }), s = Sound.create({ AudioContextClass: fake.Ctx });
  assert.strictEqual(s.supported, true, "antes de tentar, parece suportado");
  assert.strictEqual(s.unlock(), false);
  assert.strictEqual(s.supported, false);
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(s.unlock(), false);
  assert.strictEqual(s.setMuted(true), true);
});
test("construtor com opções recusadas: tenta de novo sem opções", () => {
  const made = [];
  class Picky { constructor(o) { if (o) throw new TypeError("sem opções, por favor"); made.push(this); this.state = "running"; this.currentTime = 0; this.sampleRate = 44100; const f = makeFake(); this.inner = new f.Ctx(); this.destination = this.inner.destination; for (const k of ["createGain", "createOscillator", "createBiquadFilter", "createBufferSource", "createDynamicsCompressor", "createPeriodicWave", "createBuffer"]) this[k] = (...a) => this.inner[k](...a); this.resume = () => Promise.resolve(); } }
  const s = Sound.create({ AudioContextClass: Picky });
  assert.strictEqual(s.unlock(), true);
  assert.strictEqual(made.length, 1);
  assert.strictEqual(s.play("pick"), true);
});
test("erro no meio do agendamento (createBiquadFilter falha): play devolve false, nada sai pela metade e os outros sons continuam", () => {
  const { s, ctx, fake } = ready({}, { failOn: "createBiquadFilter" });
  const master = masterOf(ctx);
  assert.ok(master);
  assert.strictEqual(s.play("bone"), false, "bone usa filtro");
  assert.strictEqual(s.play("ration"), false, "ration usa filtro de ruído");
  const linked = ctx.nodes.filter((n) => n.out.includes(master));
  assert.strictEqual(linked.length, 0, "nenhum som parcial ligado à saída");
  fake.failOn = null;
  assert.strictEqual(s.play("pick"), true);
  assert.strictEqual(s.play("bone"), true);
  assert.deepStrictEqual(s.events.map((e) => e.played), [false, false, true, true]);
});
test("erro ao criar a saída (createDynamicsCompressor falha): unlock false e supported false, sem lançar", () => {
  const fake = makeFake({ failOn: "createDynamicsCompressor" }), s = Sound.create({ AudioContextClass: fake.Ctx });
  assert.strictEqual(s.unlock(), false);
  assert.strictEqual(s.supported, false);
  assert.strictEqual(s.play("bone"), false);
});
test("currentTime que lança erro: play devolve false", () => {
  const { s, ctx } = ready();
  Object.defineProperty(ctx, "currentTime", { get() { throw new Error("contexto morreu"); } });
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(s.setMuted(true), true);
  assert.strictEqual(s.setVolume(0.5), 0.5);
});
test("resume() que lança ou é rejeitado não gera erro nem 'unhandled rejection'", async () => {
  const before = unhandled;
  const a = makeFake({ resumeThrows: true, state: "suspended", neverRunning: true }), sa = Sound.create({ AudioContextClass: a.Ctx });
  assert.doesNotThrow(() => sa.unlock());
  const b = makeFake({ resumeRejects: true, state: "suspended", neverRunning: true }), sb = Sound.create({ AudioContextClass: b.Ctx });
  assert.doesNotThrow(() => sb.unlock());
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(unhandled, before, "nenhuma promessa rejeitada sem tratamento");
  assert.strictEqual(sb.play("bone"), true, "dentro do prazo logo após o pedido, o som fica na fila");
});
test("contexto fechado por fora: play devolve false e o próximo unlock cria outro", () => {
  const { s, fake, ctx } = ready();
  ctx.state = "closed";
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(s.unlock(), true);
  assert.strictEqual(fake.instances.length, 2);
  assert.strictEqual(s.play("bone"), true);
});

// ---------- unlock ----------
test("antes do unlock nada toca e nenhum AudioContext é criado; unlock cria UM contexto só, mesmo chamado várias vezes", () => {
  const fake = makeFake(), s = Sound.create({ AudioContextClass: fake.Ctx, now: clock() });
  assert.strictEqual(s.supported, true);
  assert.strictEqual(s.play("bone"), false, "ainda travado");
  assert.strictEqual(fake.instances.length, 0, "play não cria contexto");
  assert.strictEqual(s.unlock(), true);
  assert.strictEqual(s.unlock(), true); s.unlock(); s.unlock();
  assert.strictEqual(fake.instances.length, 1);
  assert.strictEqual(s.play("bone"), true);
  assert.deepStrictEqual(s.events.map((e) => e.played), [false, true]);
});
test("contexto suspenso: unlock pede resume(); sons logo depois ficam na fila; passado o prazo, volta a pedir e recusa até rodar", () => {
  const { s, fake, now, ctx } = ready({}, { state: "suspended", neverRunning: true });
  assert.strictEqual(fake.resumes, 1, "unlock pediu resume");
  now.set(1100); assert.strictEqual(s.play("bone"), true, "100 ms depois do pedido: entra na fila");
  now.set(1600); assert.strictEqual(s.play("capture"), false, "passou o prazo e continua suspenso");
  assert.strictEqual(fake.resumes, 2, "pediu de novo");
  now.set(1700); assert.strictEqual(s.play("capture"), true, "logo depois do novo pedido, na fila");
  ctx.state = "running";
  now.set(5000); assert.strictEqual(s.play("lifelost"), true, "rodando");
  assert.strictEqual(fake.resumes, 2, "rodando: não pede mais");
});
test("contexto que nasce suspenso e liga ao resume(): unlock deixa tudo pronto", () => {
  const { s, ctx } = ready({}, { state: "suspended" });
  assert.strictEqual(ctx.state, "running");
  assert.strictEqual(s.play("pick"), true);
});
test("saída: ganho mestre 0,35 por padrão -> compressor leve -> destino; AudioContext criado com latencyHint", () => {
  const { ctx } = ready();
  const master = masterOf(ctx);
  assert.strictEqual(master.gain.value, 0.35);
  const comp = master.out.find((o) => o.kind === "compressor");
  assert.ok(comp.out.some((o) => o.kind === "destination"));
  assert.ok(comp.threshold.value >= -20 && comp.threshold.value <= -6, "limiar do compressor");
  assert.ok(comp.ratio.value >= 2 && comp.ratio.value <= 6, "razão leve");
  assert.deepStrictEqual(ctx.args, { latencyHint: "interactive" });
});
test("bindUnlock: o primeiro gesto destrava e os ouvintes saem sozinhos; a função devolvida também desliga", () => {
  const listeners = new Map();
  const target = {
    addEventListener(t, fn, o) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); },
    removeEventListener(t, fn) { listeners.get(t)?.delete(fn); },
  };
  const fake = makeFake(), s = Sound.create({ AudioContextClass: fake.Ctx, now: clock() });
  const off = s.bindUnlock(target);
  assert.ok(listeners.get("pointerdown").size === 1 && listeners.get("keydown").size === 1);
  assert.strictEqual(fake.instances.length, 0);
  for (const fn of [...listeners.get("keydown")]) fn({});
  assert.strictEqual(fake.instances.length, 1);
  assert.strictEqual(s.play("bone"), true);
  assert.ok([...listeners.values()].every((set) => set.size === 0), "ouvintes removidos");
  const s2 = Sound.create({ AudioContextClass: makeFake().Ctx });
  const off2 = s2.bindUnlock(target); off2();
  assert.ok([...listeners.values()].every((set) => set.size === 0));
  assert.doesNotThrow(() => Sound.create({ AudioContextClass: null }).bindUnlock({}));
  assert.doesNotThrow(() => off());
});

// ---------- Preferência (mudo e volume) ----------
test("volume: padrão 0,35; setVolume limita a 0..1, ignora lixo e vale no ganho mestre sem estalo (rampa)", () => {
  const { s, ctx } = ready();
  assert.strictEqual(s.getVolume(), 0.35);
  assert.strictEqual(s.setVolume(0.8), 0.8);
  assert.strictEqual(s.setVolume(1.7), 1);
  assert.strictEqual(s.setVolume(-3), 0);
  assert.strictEqual(s.setVolume("0.5"), 0.5);
  for (const bad of [NaN, undefined, null, "abc", "", {}, [], true, Infinity]) assert.strictEqual(s.setVolume(bad), 0.5, String(bad));
  const ev = masterOf(ctx).gain.events;
  assert.ok(ev.some((e) => e.type === "target" && e.v === 0.8), "rampa até o novo volume");
  assert.ok(ev.every((e) => e.type !== "set"), "nunca troca de uma vez");
});
test("mudo corta o que está tocando com uma rampa curta no ganho mestre (e desmutar volta ao volume)", () => {
  const { s, ctx } = ready();
  s.setVolume(0.6);
  s.setMuted(true);
  s.setMuted(false);
  const targets = masterOf(ctx).gain.events.filter((e) => e.type === "target");
  assert.deepStrictEqual(targets.map((e) => e.v), [0.6, 0, 0.6]);
  assert.ok(targets.every((e) => e.tc > 0 && e.tc <= 0.05), "constante de tempo curta");
});
test("volume 0 não é mudo: play ainda devolve true", () => {
  const { s } = ready();
  s.setVolume(0);
  assert.strictEqual(s.isMuted(), false);
  assert.strictEqual(s.play("bone"), true);
});
test("storage: guarda mudo e volume na chave cachorrinho.som.v1 e outra instância lê de volta", () => {
  const st = memStorage();
  const a = Sound.create({ AudioContextClass: null, storage: st });
  assert.strictEqual(a.isMuted(), false); assert.strictEqual(a.getVolume(), 0.35);
  assert.strictEqual(st.getItem("cachorrinho.som.v1"), null, "não escreve só por existir");
  a.setMuted(true); a.setVolume(0.2);
  assert.deepStrictEqual(Object.keys(st._m), ["cachorrinho.som.v1"]);
  assert.deepStrictEqual(JSON.parse(st._m["cachorrinho.som.v1"]), { m: 1, v: 0.2 });
  const b = Sound.create({ AudioContextClass: null, storage: st });
  assert.strictEqual(b.isMuted(), true); assert.strictEqual(b.getVolume(), 0.2);
  b.toggleMuted();
  assert.strictEqual(Sound.create({ AudioContextClass: null, storage: st }).isMuted(), false);
  assert.strictEqual(Sound.create({ AudioContextClass: null, storage: st }).getVolume(), 0.2, "o volume sobrevive ao mudo");
});
test("storage: mudo guardado vale no primeiro play (nada toca) e o volume guardado vai para o ganho mestre", () => {
  const st = memStorage({ "cachorrinho.som.v1": JSON.stringify({ m: 1, v: 0.5 }) });
  const { s, ctx } = ready({ storage: st });
  assert.strictEqual(s.play("bone"), false);
  assert.strictEqual(masterOf(ctx).gain.value, 0, "mudo desde o começo: ganho 0");
  const st2 = memStorage({ "cachorrinho.som.v1": JSON.stringify({ m: 0, v: 0.5 }) });
  const r = ready({ storage: st2 });
  assert.strictEqual(masterOf(r.ctx).gain.value, 0.5);
});
test("storage: formato simples \"0\"/\"1\" (só o mudo) é aceito; lixo e valores fora da faixa viram o padrão", () => {
  assert.strictEqual(Sound.create({ AudioContextClass: null, storage: memStorage({ "cachorrinho.som.v1": "1" }) }).isMuted(), true);
  assert.strictEqual(Sound.create({ AudioContextClass: null, storage: memStorage({ "cachorrinho.som.v1": "0" }) }).isMuted(), false);
  for (const raw of ["abc", "{", "null", "[]", "42", '{"m":2,"v":7}', '{"m":"1","v":"x"}', '{"v":-1}', "", "undefined"]) {
    const s = Sound.create({ AudioContextClass: null, storage: memStorage({ "cachorrinho.som.v1": raw }) });
    assert.strictEqual(s.isMuted(), false, raw); assert.strictEqual(s.getVolume(), 0.35, raw);
  }
  const half = Sound.create({ AudioContextClass: null, storage: memStorage({ "cachorrinho.som.v1": '{"m":1,"v":7}' }) });
  assert.strictEqual(half.isMuted(), true); assert.strictEqual(half.getVolume(), 0.35, "volume inválido não derruba o mudo válido");
});
test("storage que lança erro (getItem e setItem) não quebra: tudo funciona só na memória", () => {
  const bad = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };
  const s = Sound.create({ AudioContextClass: makeFake().Ctx, storage: bad, now: clock() });
  assert.strictEqual(s.isMuted(), false);
  assert.doesNotThrow(() => s.setMuted(true));
  assert.strictEqual(s.isMuted(), true);
  assert.doesNotThrow(() => s.setVolume(0.9));
  assert.strictEqual(s.getVolume(), 0.9);
  assert.strictEqual(s.toggleMuted(), false);
  s.unlock();
  assert.strictEqual(s.play("bone"), true);
  const noop = Sound.create({ storage: {} });  // objeto sem getItem/setItem
  assert.doesNotThrow(() => { noop.setMuted(true); noop.setVolume(0.1); });
  assert.strictEqual(noop.isMuted(), true);
});
test("sem storage (ou storage null) funciona só na memória", () => {
  for (const storage of [undefined, null]) {
    const s = Sound.create({ AudioContextClass: null, storage });
    s.setMuted(true); s.setVolume(0.4);
    assert.strictEqual(s.isMuted(), true); assert.strictEqual(s.getVolume(), 0.4);
  }
  assert.doesNotThrow(() => Sound.create(null));
  assert.doesNotThrow(() => Sound.create(undefined));
});
test("setMuted/toggleMuted/setVolume devolvem o valor novo", () => {
  const s = Sound.create({ AudioContextClass: null });
  assert.strictEqual(s.setMuted(1), true); assert.strictEqual(s.setMuted(0), false);
  assert.strictEqual(s.toggleMuted(), true); assert.strictEqual(s.toggleMuted(), false);
  assert.strictEqual(typeof s.play("bone"), "boolean");
});

(async () => {
  // dá tempo de eventuais promessas rejeitadas aparecerem antes de fechar a conta
  await new Promise((r) => setTimeout(r, 30));
  if (unhandled) { failed++; console.log(`FAIL ${unhandled} promessa(s) rejeitada(s) sem tratamento`); }
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
  process.exit(failed ? 1 : 0);
})();
