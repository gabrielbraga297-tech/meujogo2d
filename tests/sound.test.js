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
test("Sound.NAMES tem os 11 eventos (os 10 pedidos + o miau do gato) e MAX_SECONDS os limites de cada um", () => {
  assert.deepStrictEqual([...Sound.NAMES], ["ration", "bone", "capture", "lifelost", "transform", "postman", "levelup", "life", "gameover", "pick", "meow"]);
  assert.deepStrictEqual({ ...Sound.MAX_SECONDS }, { ration: 0.15, bone: 0.5, capture: 0.6, lifelost: 0.7, transform: 0.5, postman: 0.35, levelup: 1.3, life: 0.6, gameover: 1.2, pick: 0.2, meow: 0.45 });
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
  // 11 nomes diferentes no mesmo instante: do 9º em diante são recusados
  for (const n of Sound.NAMES) res.push(s.play(n));
  assert.deepStrictEqual(res, [true, true, true, true, true, true, true, true, false, false, false]);
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
  assert.strictEqual(s.events.length, 11);
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
