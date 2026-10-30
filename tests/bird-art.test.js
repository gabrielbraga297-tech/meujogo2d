// Testes dos desenhos do Passarinho (js/bird-art.js), sem navegador. Uso: node tests/bird-art.test.js
// O contexto 2D é FALSO e rigoroso: só aceita os métodos e propriedades simples do canvas listados abaixo (qualquer outro lança erro), confere que todo número é finito,
// que as cores são válidas, que save/restore fecham certinho e que nenhum raio é negativo; registra cada chamada (para comparar desenhos) e acompanha a matriz de
// transformação para medir a caixa que o desenho ocupa. Também lê o código-fonte: nada de Math.random, relógio nem acesso à página.
const BIRD_WORDS = require("./bird-words.js"); // a lista de espécies e raças que o Passarinho não pode usar (a mesma de tests/honesty.test.js)
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "../js/bird-art.js");
const BirdArt = require(FILE);

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}

// ---------- contexto 2D falso ----------
const METHODS = new Set(["save", "restore", "beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arc", "ellipse", "rect", "fill", "stroke", "clip", "fillRect", "strokeRect", "translate", "scale", "rotate", "setLineDash"]);
const PROPS = new Set(["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha"]);
const COLOR = /^(#[0-9a-f]{6}|#[0-9a-f]{3}|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+|1\.0+)\s*\))$/i;
const f3 = (v) => (typeof v === "number" ? String(Math.round(v * 1000) / 1000) : JSON.stringify(v));

function makeCtx() {
  const log = [];
  const st = { m: [1, 0, 0, 1, 0, 0], stack: [], alphaStack: [], depth: 0, maxDepth: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, calls: 0, alpha: 1 };
  const pt = (x, y) => { const m = st.m, X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; if (X < st.minX) st.minX = X; if (X > st.maxX) st.maxX = X; if (Y < st.minY) st.minY = Y; if (Y > st.maxY) st.maxY = Y; };
  const box = (x, y, rx, ry) => { pt(x - rx, y - ry); pt(x + rx, y - ry); pt(x - rx, y + ry); pt(x + rx, y + ry); };
  const props = { fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", globalAlpha: 1 };
  const impl = {
    save() { st.stack.push(st.m.slice()); st.alphaStack.push(Object.assign({}, props)); st.depth++; st.maxDepth = Math.max(st.maxDepth, st.depth); }, // (como o canvas de verdade, save/restore guardam também cores, largura e alpha)
    restore() { assert.ok(st.depth > 0, "restore sem save"); st.m = st.stack.pop(); Object.assign(props, st.alphaStack.pop()); st.depth--; },
    translate(x, y) { const m = st.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; },
    scale(x, y) { const m = st.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; },
    rotate(r) { const m = st.m, c = Math.cos(r), s = Math.sin(r), a = m[0], b = m[1], cc = m[2], d = m[3]; m[0] = a * c + cc * s; m[1] = b * c + d * s; m[2] = -a * s + cc * c; m[3] = -b * s + d * c; },
    moveTo(x, y) { pt(x, y); }, lineTo(x, y) { pt(x, y); },
    quadraticCurveTo(a, b, x, y) { pt(a, b); pt(x, y); }, bezierCurveTo(a, b, c, d, x, y) { pt(a, b); pt(c, d); pt(x, y); },
    arc(x, y, r) { assert.ok(r >= 0, "arc com raio negativo"); box(x, y, r, r); },
    ellipse(x, y, rx, ry, rot) { assert.ok(rx >= 0 && ry >= 0, "ellipse com raio negativo"); if (rot) { const r = Math.max(rx, ry); box(x, y, r, r); } else box(x, y, rx, ry); },
    rect(x, y, w, h) { pt(x, y); pt(x + w, y + h); }, fillRect(x, y, w, h) { pt(x, y); pt(x + w, y + h); }, strokeRect(x, y, w, h) { pt(x, y); pt(x + w, y + h); },
    beginPath() {}, closePath() {}, fill() {}, stroke() {}, clip() {}, setLineDash(a) { assert.ok(Array.isArray(a)); },
  };
  const ctx = new Proxy({}, {
    get(_, k) {
      if (k === "__st") return st;
      if (k === "__log") return log;
      if (METHODS.has(k)) return (...a) => { st.calls++; for (const v of a) if (typeof v === "number") assert.ok(Number.isFinite(v), `${k}: número inválido (${v})`); log.push(k + "(" + a.map(f3).join(",") + ")"); impl[k](...a); };
      if (PROPS.has(k)) return props[k];
      throw new Error("leitura não permitida: " + String(k));
    },
    set(_, k, v) {
      if (!PROPS.has(k)) throw new Error("propriedade não permitida: " + String(k));
      if (k === "fillStyle" || k === "strokeStyle") assert.ok(typeof v === "string" && COLOR.test(v), "cor inválida: " + v);
      if (k === "lineWidth") assert.ok(typeof v === "number" && Number.isFinite(v) && v > 0, "lineWidth inválido: " + v);
      if (k === "globalAlpha") { assert.ok(typeof v === "number" && v >= 0 && v <= 1.0000001, "globalAlpha fora de 0..1: " + v); st.alpha = v; st.maxAlpha = Math.max(st.maxAlpha || 0, v); }
      props[k] = v; log.push("=" + k + ":" + f3(v)); return true;
    },
  });
  return ctx;
}
function rec(fn, alpha) { const c = makeCtx(); if (alpha !== undefined) c.globalAlpha = alpha; fn(c); if (alpha !== undefined) assert.strictEqual(c.globalAlpha, alpha, "o desenho deixou o globalAlpha diferente do que recebeu"); const st = c.__st; assert.strictEqual(st.depth, 0, "save/restore não fecham (profundidade " + st.depth + ")"); return { log: c.__log.join("\n"), st }; }
const seq = (fn) => rec(fn).log;

// Nada de Math.random nem relógio durante os testes: se o desenho usar, lança.

// Nada de Math.random nem relógio durante os testes: se o desenho usar, lança.
const realRandom = Math.random, realNow = Date.now;
Math.random = () => { throw new Error("Math.random proibido nos desenhos"); };
Date.now = () => { throw new Error("Date.now proibido nos desenhos"); };
process.on("exit", () => { Math.random = realRandom; Date.now = realNow; });

const DIRS = ["left", "right", "up", "down"];
const KINDS = ["scare", "gold", "ice", "turbo", "magnet"];
const MODES = ["patrol", "chase", "flee", "search", "idle"];
const FX = ["flap", "dust", "feather", "sparkle", "gust", "land", "peck", "shadow"];
const bird = (p, o) => (c) => BirdArt.drawBird(c, Object.assign({ x: 100, y: 50, w: 24, h: 24, facing: "right", moving: false }, p), o);
const foe = (d, o) => (c) => BirdArt.drawFoeCat(c, Object.assign({ x: 200, y: 120, dir: 1, mode: "patrol", size: "medium", idx: 0 }, d), o);
const hawk = (d, o) => (c) => BirdArt.drawHawk(c, Object.assign({ x: 200, y: 120, dir: 1, mode: "patrol", idx: 0 }, d), o);
const seed = (v, o) => (c) => BirdArt.drawSeed(c, { x: 64, y: 96, variant: v }, o);
const worm = (b, o) => (c) => BirdArt.drawWorm(c, Object.assign({ x: 300, y: 200, vx: 0, vy: 0, hue: 0 }, b), o);
const fruit = (k, o) => (c) => BirdArt.drawFruit(c, { x: 32, y: 64, kind: k }, o);

// ---------- contrato ----------
test("todas as funções do contrato existem", () => {
  for (const n of ["drawBird", "drawFoeCat", "drawHawk", "drawSeed", "drawWorm", "drawFruit", "drawRoost", "drawPost", "drawNest", "drawFx", "growthStage", "skinById"]) assert.strictEqual(typeof BirdArt[n], "function", n);
  assert.ok(Array.isArray(BirdArt.SKINS)); assert.ok(BirdArt.FRUIT_KEYS && typeof BirdArt.FRUIT_KEYS === "object");
});

test("não lançam erro com `o` vazio, sem parâmetros ou com valores esquisitos", () => {
  const junk = [undefined, null, {}, { x: NaN, y: Infinity, w: "a", h: -5, facing: 7, moving: "sim" }, { dir: 0, mode: "xyz", kind: 3, size: null, idx: NaN, vx: NaN, vy: "z", hue: -9, variant: 99, open: 1, w: -4 }];
  const junkO = [undefined, null, {}, { gr: NaN, skin: 42, flying: "muito", time: Infinity, r: -3, calm: "x", look: 7 }, { gr: -4, flying: 9, time: -1e9, r: 1e9, skin: "nao-existe", look: { style: 3, coats: "x", pat: {}, deco: 5, acc: [] } }, { look: { style: "branch", coats: [null], collar: 5, c1: "x" }, hidden: true, open: true, w: 1e9, h: -1 }];
  for (const p of junk) for (const o of junkO) {
    rec((c) => BirdArt.drawBird(c, p, o)); rec((c) => BirdArt.drawFoeCat(c, p, o)); rec((c) => BirdArt.drawHawk(c, p, o)); rec((c) => BirdArt.drawSeed(c, p, o)); rec((c) => BirdArt.drawWorm(c, p, o)); rec((c) => BirdArt.drawFruit(c, p, o));
    rec((c) => BirdArt.drawPost(c, p && p.x, p && p.y, o)); rec((c) => BirdArt.drawRoost(c, p && p.x, p && p.y, o)); rec((c) => BirdArt.drawNest(c, p && p.x, p && p.y, o));
    for (const k of [...FX, "nada", undefined]) rec((c) => BirdArt.drawFx(c, k, 5, 5, p && p.t, o));
  }
  for (const f of ["drawBird", "drawFoeCat", "drawHawk", "drawSeed", "drawWorm", "drawFruit"]) { rec((c) => BirdArt[f](c)); BirdArt[f](null); BirdArt[f](undefined, {}, {}); }
  rec((c) => BirdArt.drawPost(c)); rec((c) => BirdArt.drawFx(c)); rec((c) => BirdArt.drawNest(c)); BirdArt.drawPost(null); BirdArt.drawFx(null); BirdArt.drawNest(null); BirdArt.drawRoost(null);
  assert.strictEqual(BirdArt.growthStage(), "adulto"); assert.strictEqual(BirdArt.growthStage(NaN), "adulto"); assert.strictEqual(BirdArt.skinById(undefined).id, "");
});

test("o desenho só usa o que o canvas simples tem, com números finitos, cores válidas e save/restore fechados", () => { // (o rec/ctx falso já lança nesses casos; aqui varre muitos pedidos)
  let n = 0;
  for (const d of DIRS) for (const gr of [0, 0.2, 0.5, 0.9, 1]) for (const skin of BirdArt.SKINS.map((s) => s.id)) for (const mv of [false, true]) {
    for (const o of [{ gr, skin }, { gr, skin, flap: true, flying: 0 }, { gr, skin, flying: 1, blink: true }, { gr, skin, safe: true }, { gr, skin, flying: 0.4, calm: true, still: true }]) { rec(bird({ facing: d, moving: mv }, Object.assign({ time: 1.7 }, o))); n++; }
  }
  assert.ok(n > 1000);
  for (const mode of MODES) for (const size of ["small", "medium", "large"]) for (let idx = 0; idx < 5; idx++) for (const x of [{}, { frozen: true }, { slow: true }, { dir: -1 }]) { rec(foe(Object.assign({ mode, size, idx }, x), { time: 2.2 })); rec(hawk(Object.assign({ mode, idx }, x), { time: 2.2 })); n += 2; }
  for (const x of [{}, { diving: true }, { diving: true, frozen: true }]) for (let idx = 0; idx < 3; idx++) rec(hawk(Object.assign({ idx }, x), { time: 0.9 }));
});

test("respeita o globalAlpha com que o jogo chamou (só multiplica; devolve igual)", () => {
  const all = [bird({ moving: true }, { time: 1, flap: true }), bird({}, { safe: true }), bird({}, { flying: 1, blink: true, time: 0.2 }), bird({}, { flying: 0.5, skin: "astronauta" }), foe({ mode: "flee" }, { time: 1 }), foe({ slow: true, frozen: true }, {}), hawk({ mode: "chase" }, { time: 1 }), hawk({ slow: true, frozen: true }, {}), hawk({ diving: true }, {}),
    seed(0, { time: 1 }), seed(1, {}), seed(2, {}), worm({ vx: 100 }, { time: 1 }), worm({}, { hidden: true }), (c) => BirdArt.drawPost(c, 5, 5, { kind: "cat" }), (c) => BirdArt.drawPost(c, 5, 5, { kind: "hawk" }),
    (c) => BirdArt.drawNest(c, 5, 5, { open: true }), (c) => BirdArt.drawNest(c, 5, 5, { open: false, look: { deco: "rainbow" } }), (c) => BirdArt.drawRoost(c, 5, 5, { look: { style: "swing" } })];
  for (const k of KINDS) all.push(fruit(k, { time: 1 }));
  for (const k of FX) all.push((c) => BirdArt.drawFx(c, k, 5, 5, 0.3, {}));
  for (const fn of all) { const r = rec(fn, 0.5); assert.ok((r.st.maxAlpha || 0) <= 0.5 + 1e-9, "usou alpha maior que o recebido: " + r.st.maxAlpha); }
  assert.ok(rec(bird({}, { flying: 1 }), 0.5).st.maxAlpha > 0, "sanidade: o desenho usa alpha");
});

// ---------- reduzir movimento e determinismo ----------
const SCENES = [];
for (const d of DIRS) for (const mv of [false, true]) for (const o of [{}, { gr: 0 }, { flap: true }, { flying: 1 }, { flying: 0.5, gr: 0.5 }, { safe: true }, { flying: 1, blink: true }, { skin: "astronauta" }, { skin: "pirata", gr: 0.5 }, { skin: "arco-iris", flap: true }])
  SCENES.push([`passarinho ${d} ${mv ? "andando" : "parado"} ${JSON.stringify(o)}`, (t, calm) => bird({ facing: d, moving: mv }, Object.assign({ time: t, calm }, o))]);
for (const mode of MODES) for (const size of ["small", "medium", "large"]) for (const x of [{}, { frozen: true }, { slow: true }]) SCENES.push([`gato ${mode} ${size} ${JSON.stringify(x)}`, (t, calm) => foe(Object.assign({ mode, size, idx: 3 }, x), { time: t, calm })]);
for (const mode of ["patrol", "chase", "search", "idle", "flee"]) for (const x of [{}, { frozen: true }, { slow: true }, { diving: true }]) SCENES.push([`gavião ${mode} ${JSON.stringify(x)}`, (t, calm) => hawk(Object.assign({ mode, idx: 1 }, x), { time: t, calm })]);
for (let v = 0; v < 3; v++) SCENES.push([`semente ${v}`, (t, calm) => seed(v, { time: t, calm })]);
for (const b of [{}, { vx: 3 }, { vx: 140 }, { vx: -120, vy: 80 }, { vy: -150 }]) { SCENES.push([`minhoca ${JSON.stringify(b)}`, (t, calm) => worm(Object.assign({ hue: 2 }, b), { time: t, calm, r: 8 })]); }
SCENES.push(["minhoca enterrada", (t, calm) => worm({}, { time: t, calm, hidden: true })]);
for (const k of KINDS) SCENES.push([`fruto ${k}`, (t, calm) => fruit(k, { time: t, calm })]);
for (const open of [true, false]) SCENES.push([`ninho ${open}`, (t, calm) => (c) => BirdArt.drawNest(c, 40, 40, { open, time: t, calm })]);

test("calm: o mesmo pedido em dois instantes diferentes desenha EXATAMENTE a mesma sequência de chamadas", () => {
  for (const [name, mk] of SCENES) assert.strictEqual(seq(mk(0.37, true)), seq(mk(5.91, true)), "calm mudou o desenho: " + name);
  for (const k of FX) assert.strictEqual(seq((c) => BirdArt.drawFx(c, k, 9, 9, 0.4, { calm: true })), seq((c) => BirdArt.drawFx(c, k, 9, 9, 0.4, { calm: true })));
  for (const p of ["cat", "hawk"]) assert.strictEqual(seq((c) => BirdArt.drawPost(c, 40, 40, { kind: p, calm: true, time: 1 })), seq((c) => BirdArt.drawPost(c, 40, 40, { kind: p, calm: true, time: 9 })));
});

test("sem calm o tempo mexe no desenho (o teste acima não é vazio)", () => {
  let moved = 0;
  for (const [, mk] of SCENES) if (seq(mk(0.37, false)) !== seq(mk(0.55, false))) moved++;
  assert.ok(moved > SCENES.length * 0.6, "poucas cenas animadas: " + moved + "/" + SCENES.length);
  assert.strictEqual(seq(bird({ moving: true }, { still: true, time: 0.3 })), seq(bird({ moving: true }, { still: true, time: 4.4 })), "`still` fica parado");
  assert.notStrictEqual(seq(bird({ moving: true }, { time: 0.3 })), seq(bird({ moving: true }, { time: 0.4 })));
  assert.notStrictEqual(seq(bird({}, { flying: 1, time: 0.3 })), seq(bird({}, { flying: 1, time: 0.4 })), "as asas batem no voo alto");
});

test("calm: as perninhas de quem anda seguem a POSIÇÃO (andando de verdade mudam, parado não); a sombra do gavião não pulsa", () => {
  const noPos = (l) => { const a = l.split("\n"); a.splice(a.findIndex((x) => x.startsWith("translate(")), 1); return a.join("\n"); };
  assert.notStrictEqual(noPos(seq(bird({ x: 100, moving: true }, { calm: true }))), noPos(seq(bird({ x: 117, moving: true }, { calm: true }))), "andando, as pernas deveriam mudar com a posição");
  assert.strictEqual(noPos(seq(bird({ x: 100, moving: false }, { calm: true }))), noPos(seq(bird({ x: 117, moving: false }, { calm: true }))), "parado, o desenho não depende da posição");
  const v = (y) => noPos(seq(bird({ y, facing: "down", moving: true }, { calm: true })));
  assert.notStrictEqual(v(50), v(67), "descendo, o passo segue o y");
  const shadow = (t) => seq(hawk({}, { calm: true, time: t })).split("\n").filter((l) => l.startsWith("ellipse(")).slice(0, 1).join();
  assert.strictEqual(shadow(0.2), shadow(3.3), "com calm a sombra do gavião não pulsa");
});

test("determinismo: o mesmo pedido, duas vezes, desenha a mesma coisa (e sem Math.random nem relógio)", () => {
  for (const [name, mk] of SCENES) assert.strictEqual(seq(mk(2.5, false)), seq(mk(2.5, false)), name);
  for (const k of FX) for (const t of [0, 0.3, 1]) assert.strictEqual(seq((c) => BirdArt.drawFx(c, k, 9, 9, t, {})), seq((c) => BirdArt.drawFx(c, k, 9, 9, t, {})));
});

test("o código-fonte não usa Math.random, Date, performance.now, window, document nem localStorage", () => {
  const src = fs.readFileSync(FILE, "utf8").replace(/\/\/[^\n]*/g, "");
  for (const bad of [/Math\.random/, /Date\.now|new Date/, /performance\.now/, /\bdocument\b/, /localStorage/, /requestAnimationFrame/, /\bfetch\(/, /require\(/]) assert.ok(!bad.test(src), "achei " + bad);
  assert.ok(!/window\./.test(src.replace(/typeof window !== "undefined" \? window : globalThis/g, "").replace(/root\.BirdArt/g, "")), "usa window");
});

// ---------- skins ----------
test("12 skins: ids únicos, nomes e frases, preços crescentes de 10 a 50 (exceto a padrão), só campos visuais e nada de espécie", () => {
  const S = BirdArt.SKINS;
  assert.deepStrictEqual(S.map((s) => s.id), ["", "amarelo", "azul", "vermelho", "verde", "cinza", "branco", "preto", "laranja", "arco-iris", "pirata", "astronauta"]);
  assert.deepStrictEqual(S.map((s) => s.name), ["Marrom", "Amarelo", "Azul", "Vermelho", "Verde", "Cinza", "Branco", "Preto", "Laranja", "Arco-íris", "Pirata", "Astronauta"]);
  assert.strictEqual(new Set(S.map((s) => s.id)).size, 12); assert.strictEqual(new Set(S.map((s) => s.name)).size, 12);
  assert.strictEqual(S[0].price, 0);
  for (let i = 1; i < S.length; i++) { assert.ok(Number.isInteger(S[i].price) && S[i].price >= 10 && S[i].price <= 50, S[i].id + " preço " + S[i].price); assert.ok(S[i].price > S[i - 1].price, "preço não cresce em " + S[i].id); assert.ok(/^[a-z0-9-]{1,24}$/.test(S[i].id)); }
  assert.strictEqual(S[S.length - 1].price, 50); assert.strictEqual(S[1].price, 10);
  for (const s of S) {
    assert.deepStrictEqual(Object.keys(s).sort(), ["id", "name", "price", "text"], "campos de " + s.id);
    assert.ok(typeof s.text === "string" && s.text.length >= 8 && s.text.length <= 60, "frase de " + s.id);
    assert.ok(!/veloc|rápid|ponto|vidas?\b|poder|bônus|piado|\bsom\b|mais forte|mais lento|atributo/i.test(s.name + " " + s.text), "a frase de " + s.id + " sugere vantagem");
    assert.ok(!BIRD_WORDS.speciesOrBreedRe().test(s.name + " " + s.text) && !/\bespécie/i.test(s.name + " " + s.text), "sem espécie ou raça (a lista de tests/bird-words.js, a mesma de tests/honesty.test.js): " + s.id);
    assert.strictEqual(BirdArt.skinById(s.id), s);
  }
  assert.strictEqual(BirdArt.skinById("nao-existe"), S[0]); assert.strictEqual(BirdArt.skinById(7), S[0]);
  assert.ok(Object.isFrozen(S), "a lista é só leitura");
});

test("cada skin desenha diferente das outras, em todas as direções e estágios, e nenhuma muda o tamanho de contato (a base do desenho)", () => {
  for (const d of DIRS) for (const gr of [0, 0.5, 1]) {
    const seen = new Map();
    for (const s of BirdArt.SKINS) {
      const l = seq(bird({ facing: d }, { skin: s.id, gr, still: true }));
      assert.ok(!seen.has(l), `${s.id} desenha igual a ${seen.get(l)} (${d}, gr ${gr})`);
      seen.set(l, s.id);
    }
  }
  for (const s of BirdArt.SKINS) {
    const a = rec(bird({ facing: "right" }, { skin: "", still: true })).st, b = rec(bird({ facing: "right" }, { skin: s.id, still: true })).st;
    assert.ok(Math.abs(a.maxY - b.maxY) < 2.5, "a skin " + s.id + " muda a base do desenho");
  }
});

test("as skins claras e escuras têm contorno próprio (branco: escuro; preto: claro), para aparecerem em qualquer chão", () => {
  const stroke = (skin) => { const m = seq(bird({}, { skin, still: true })).match(/=strokeStyle:"?([^"\n]+)"?/g) || []; return new Set(m.map((x) => x.replace(/=strokeStyle:"?|"$/g, ""))); };
  assert.ok([...stroke("branco")].some((c) => /^rgba\(52,40,44/.test(c)), "o branco usa contorno escuro");
  assert.ok([...stroke("preto")].some((c) => /^rgba\(214,224,248/.test(c)), "o preto usa contorno claro");
});

// ---------- o passarinho ----------
test("estágios: filhote, jovem e adulto (mesmo corte do cachorrinho e do gatinho) e o desenho cresce", () => {
  assert.strictEqual(BirdArt.growthStage(0), "filhote"); assert.strictEqual(BirdArt.growthStage(0.33), "filhote"); assert.strictEqual(BirdArt.growthStage(0.339), "filhote");
  assert.strictEqual(BirdArt.growthStage(0.34), "jovem"); assert.strictEqual(BirdArt.growthStage(0.66), "jovem"); assert.strictEqual(BirdArt.growthStage(0.669), "jovem");
  assert.strictEqual(BirdArt.growthStage(0.67), "adulto"); assert.strictEqual(BirdArt.growthStage(1), "adulto");
  const w = (gr) => { const s = rec(bird({ facing: "right" }, { gr, still: true, noShadow: true })).st; return s.maxX - s.minX; };
  assert.ok(w(0) < w(0.5) && w(0.5) < w(1), `largura não cresce: ${w(0)} ${w(0.5)} ${w(1)}`);
});

test("estados do passarinho (bater asas, voo alto, fim do voo, a salvo, andando) desenham diferente do normal, em todas as direções", () => {
  for (const d of DIRS) for (const gr of [0, 1]) {
    const base = seq(bird({ facing: d }, { gr, time: 0.3 })), seen = new Set([base]);
    for (const o of [{ flap: true }, { flying: 1 }, { flying: 0.4 }, { flying: 1, blink: true, time: 0.05 }, { safe: true }]) { const l = seq(bird({ facing: d, moving: !!o.flap }, Object.assign({ gr, time: 0.3 }, o))); assert.ok(!seen.has(l), `${JSON.stringify(o)} igual a outro estado (${d})`); seen.add(l); }
    assert.notStrictEqual(seq(bird({ facing: d, moving: true }, { gr, time: 0.3 })), base);
  }
});

test("o passarinho é desenhado centrado na caixa e cabe na caixa do gatinho (~24 px de corpo, até ~44 px de largura com asas abertas)", () => {
  const out = {};
  for (const d of DIRS) for (const [label, o] of [["parado", {}], ["filhote", { gr: 0 }], ["bater asas", { flap: true }], ["a salvo", { safe: true }], ["voo alto", { flying: 1 }], ["astronauta", { skin: "astronauta" }], ["pirata", { skin: "pirata" }], ["arco-íris", { skin: "arco-iris", flap: true }]]) {
    const p = { x: 100, y: 50, w: 24, h: 24, facing: d, moving: label === "bater asas" };
    const s = rec((c) => BirdArt.drawBird(c, p, Object.assign({ still: true }, o))).st, cx = 112, cy = 62;
    const w = s.maxX - s.minX, h = s.maxY - s.minY;
    (out[label] = out[label] || []).push([w, h]);
    const big = label === "voo alto" || label === "bater asas" || label === "arco-íris";
    assert.ok(w >= 14 && w <= (big ? 50 : 38), `largura ${w.toFixed(1)} fora do limite (${d} ${label})`);
    assert.ok(h >= 18 && h <= (label === "voo alto" ? 58 : label === "a salvo" ? 46 : 40), `altura ${h.toFixed(1)} fora do limite (${d} ${label})`);
    assert.ok(s.minX > cx - 34 && s.maxX < cx + 34 && s.minY > cy - 44 && s.maxY < cy + 22, `fora do centro (${d} ${label}): ${s.minX - cx} ${s.maxX - cx} ${s.minY - cy} ${s.maxY - cy}`);
    if (label === "parado") assert.ok(Math.abs((s.minX + s.maxX) / 2 - cx) < 9 && Math.abs((s.minY + s.maxY) / 2 - cy) < 9, `desenho descentrado em ${d}: ${(s.minX + s.maxX) / 2 - cx}, ${(s.minY + s.maxY) / 2 - cy}`);
  }
  const rng = (a) => Math.min(...a).toFixed(1) + "–" + Math.max(...a).toFixed(1);
  console.log("     caixa do desenho (largura × altura em px, nas 4 direções): " + Object.entries(out).map(([k, v]) => `${k} ${rng(v.map((x) => x[0]))} × ${rng(v.map((x) => x[1]))}`).join(" | "));
});

test("esquerda é o espelho da direita (mesma caixa) e o desenho acompanha o p.x/p.y", () => {
  const l = rec(bird({ facing: "left" }, { still: true })).st, r = rec(bird({ facing: "right" }, { still: true })).st;
  assert.ok(Math.abs((l.maxX - l.minX) - (r.maxX - r.minX)) < 0.01 && Math.abs((l.maxY - l.minY) - (r.maxY - r.minY)) < 0.01);
  const a = rec(bird({ x: 100, y: 50 }, { still: true })).st, b = rec(bird({ x: 130, y: 80 }, { still: true })).st;
  assert.ok(Math.abs(b.minX - a.minX - 30) < 0.01 && Math.abs(b.minY - a.minY - 30) < 0.01);
  const w = rec(bird({ x: 100, y: 50, w: 30, h: 30 }, { still: true })).st;
  assert.ok(Math.abs(w.minX - a.minX - 3) < 0.01);
});

test("voo alto: o sprite fica maior e MAIS ALTO e a sombra fica no chão (por baixo), afastada; `noShadow` tira a sombra do chão", () => {
  const n = rec(bird({}, { still: true, noShadow: true })).st, f = rec(bird({}, { flying: 1, still: true, noShadow: true })).st, fs = rec(bird({}, { flying: 1, still: true })).st;
  assert.ok(f.minY < n.minY - 8, "o voo alto deveria subir o desenho (minY " + f.minY + " x " + n.minY + ")");
  assert.ok((f.maxX - f.minX) * (f.maxY - f.minY) > (n.maxX - n.minX) * (n.maxY - n.minY) * 1.5, "o voo alto abre as asas e fica maior");
  assert.ok(fs.maxY > f.maxY + 5, "a sombra no chão fica bem abaixo do passarinho que voa");
  const sh = rec(bird({}, { still: true })).st, shf = rec(bird({}, { still: true, flying: 1 })).st;
  assert.ok(shf.maxY >= sh.maxY - 2 && shf.maxY <= sh.maxY + 6, "a sombra do voo continua no chão (mesma base): " + shf.maxY + " x " + sh.maxY);
  assert.ok(rec(bird({}, { still: true })).st.calls > rec(bird({}, { still: true, noShadow: true })).st.calls, "noShadow tira desenho");
  // fim do voo: pisca (alpha diferente) e com `calm` fica um pouco esmaecido, constante
  const a1 = rec(bird({}, { flying: 1, blink: true, time: 0.05 })).log, a2 = rec(bird({}, { flying: 1, blink: true, time: 0.15 })).log;
  assert.notStrictEqual(a1, a2, "o aviso do fim do voo deveria piscar");
  assert.notStrictEqual(a1, rec(bird({}, { flying: 1, time: 0.05 })).log, "o aviso difere do voo normal no mesmo instante");
  assert.ok(rec(bird({}, { flying: 1, blink: true, calm: true })).st.maxAlpha < 1 || /=globalAlpha:0\.\d+/.test(rec(bird({}, { flying: 1, blink: true, calm: true })).log), "com calm o aviso é um esmaecido constante");
});

test("a salvo: um pouco maior e a sombra mais longe", () => {
  const n = rec(bird({}, { still: true })).st, s = rec(bird({}, { safe: true, still: true })).st;
  assert.ok(s.maxY > n.maxY, "a sombra de quem está a salvo deveria ficar mais longe (mais embaixo)");
  assert.ok(s.maxX - s.minX > n.maxX - n.minX, "a salvo deveria ficar um pouco maior");
  for (const o of [{ flap: true }]) assert.ok(Math.abs(rec(bird({}, Object.assign({ still: true }, o))).st.maxY - n.maxY) < 2.5, "base mudou em " + JSON.stringify(o));
});

test("custo por quadro: o passarinho faz poucas chamadas e o gasto de memória não cresce (paletas guardadas)", () => {
  for (const o of [{}, { skin: "arco-iris", flying: 1 }, { skin: "pirata", flap: true }, { skin: "astronauta", safe: true }]) for (const d of DIRS) assert.ok(rec(bird({ facing: d, moving: true }, o)).st.calls < 520, `muitas chamadas: ${rec(bird({ facing: d, moving: true }, o)).st.calls} (${d} ${JSON.stringify(o)})`);
  const mem = () => process.memoryUsage().heapUsed;
  for (let i = 0; i < 300; i++) rec(bird({ x: i }, { time: i * 0.016, gr: (i % 9) / 8, flying: (i % 3) / 2 }));
  const before = mem();
  for (let i = 0; i < 300; i++) rec(bird({ x: i }, { time: i * 0.016, gr: (i % 9) / 8, flying: (i % 3) / 2 }));
  assert.ok(mem() - before < 60e6, "memória cresce demais");
});

// ---------- o gato de quintal e o gavião ----------
test("o gato de quintal: 5 modos desenham diferente; congelado, esmaecido, para o outro lado, tamanhos e as 4 pelagens também", () => {
  const seen = new Map();
  for (const mode of MODES) { const l = seq(foe({ mode }, { time: 1.1 })); assert.ok(!seen.has(l), `${mode} igual a ${seen.get(l)}`); seen.set(l, mode); }
  const base = seq(foe({}, { time: 1.1 }));
  for (const x of [{ frozen: true }, { slow: true }, { dir: -1 }, { size: "small" }, { size: "large" }, { idx: 1 }, { idx: 2 }, { idx: 3 }]) assert.notStrictEqual(seq(foe(x, { time: 1.1 })), base, JSON.stringify(x));
  const fills = (fn) => (seq(fn).match(/=fillStyle:"[^"]+"/g) || []).join();
  assert.strictEqual(fills(foe({ idx: 4 }, { calm: true })), fills(foe({ idx: 0 }, { calm: true })), "a pelagem é idx % 4"); assert.notStrictEqual(fills(foe({ idx: 1 }, { calm: true })), fills(foe({ idx: 0 }, { calm: true })));
});

test("os gatos: tamanhos crescem (pequeno < médio < grande), centrados em (x, y), o espelho tem a mesma caixa", () => {
  const bb = (d) => { const s = rec(foe(d, { time: 0.5, calm: true })).st; return { w: s.maxX - s.minX, h: s.maxY - s.minY, cx: (s.minX + s.maxX) / 2, cy: (s.minY + s.maxY) / 2 }; };
  const a = bb({ size: "small" }), b = bb({ size: "medium" }), c = bb({ size: "large" });
  assert.ok(a.w < b.w && b.w < c.w && a.h < b.h && b.h < c.h, "tamanhos fora de ordem");
  assert.ok(a.w >= 22 && c.w <= 62, `larguras ${a.w.toFixed(1)}..${c.w.toFixed(1)}`);
  assert.ok(Math.abs(b.cx - 200) < 9 && Math.abs(b.cy - 120) < 9, `descentrado: ${b.cx - 200}, ${b.cy - 120}`);
  const l = rec(foe({ dir: -1 }, { calm: true })).st, r = rec(foe({ dir: 1 }, { calm: true })).st;
  assert.ok(Math.abs((l.maxX - l.minX) - (r.maxX - r.minX)) < 0.01, "olhar para o outro lado só espelha");
  console.log("     gato médio: " + b.w.toFixed(1) + "x" + b.h.toFixed(1) + ", pequeno " + a.w.toFixed(1) + "x" + a.h.toFixed(1) + ", grande " + c.w.toFixed(1) + "x" + c.h.toFixed(1));
});

test("o gavião: modos, mergulho, congelado e esmaecido desenham diferente; a sombra elíptica fica por baixo, no chão, e o mergulho a encolhe", () => {
  const seen = new Map();
  for (const mode of ["patrol", "chase", "search", "idle", "flee"]) { const l = seq(hawk({ mode }, { time: 1.1 })); if (mode === "flee") continue; assert.ok(!seen.has(l), `${mode} igual a ${seen.get(l)}`); seen.set(l, mode); }
  const base = seq(hawk({}, { time: 1.1 }));
  for (const x of [{ diving: true }, { frozen: true }, { slow: true }, { dir: -1 }, { idx: 1 }, { idx: 2 }]) assert.notStrictEqual(seq(hawk(x, { time: 1.1 })), base, JSON.stringify(x));
  const st = rec(hawk({}, { time: 0.5, calm: true })).st;
  assert.ok(st.maxY > 120 + 9 && st.maxY < 120 + 16, "a sombra do gavião fica no chão, abaixo do centro: " + st.maxY);
  assert.ok(st.minY < 120 - 8, "o gavião fica acima da sombra: " + st.minY);
  const w = st.maxX - st.minX; assert.ok(w >= 28 && w <= 52, "largura do gavião " + w.toFixed(1));
  assert.ok(Math.abs((st.minX + st.maxX) / 2 - 200) < 10, "gavião descentrado");
  const ell = (d) => seq(hawk(d, { calm: true })).split("\n").find((l) => l.startsWith("ellipse(")).replace(/^ellipse\(([^,]+),([^,]+),([^,]+),([^,]+).*$/, "$3,$4");
  assert.ok(+ell({ diving: true }).split(",")[0] < +ell({}).split(",")[0], "o mergulho encolhe a sombra");
});

test("as 4 pelagens do gato e os 3 gaviões são CLAROS o bastante para a noite (cor média do corpo com brilho >= 120)", () => {
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  const fillsOf = (fn) => (seq(fn).match(/=fillStyle:"(#[0-9a-f]{6})"/gi) || []).map((x) => x.slice(-8, -1));
  for (let i = 0; i < 4; i++) { const f = fillsOf(foe({ idx: i }, { calm: true })).filter((c) => lum(c) > 60); const avg = f.reduce((s, c) => s + lum(c), 0) / f.length; assert.ok(avg >= 120, `gato ${i}: brilho médio ${avg.toFixed(0)}`); }
  for (let i = 0; i < 3; i++) { const f = fillsOf(hawk({ idx: i }, { calm: true })).filter((c) => lum(c) > 40); const avg = f.reduce((s, c) => s + lum(c), 0) / f.length; assert.ok(avg >= 100, `gavião ${i}: brilho médio ${avg.toFixed(0)}`); }
  for (const s of BirdArt.SKINS.filter((x) => x.id !== "preto")) { const f = fillsOf(bird({}, { skin: s.id, still: true, noShadow: true })).filter((c) => lum(c) > 40); const avg = f.reduce((a, c) => a + lum(c), 0) / f.length; assert.ok(avg >= 95, `${s.id}: brilho médio ${avg.toFixed(0)}`); }
});

// ---------- sementes, minhocas, frutos ----------
test("as 3 sementes desenham diferente, cabem no item de 16×16 (mais o brilho em volta) e ficam centradas", () => {
  const seen = new Set();
  for (let v = 0; v < 3; v++) { const r = rec(seed(v, { time: 1, calm: true })); assert.ok(!seen.has(r.log)); seen.add(r.log); const w = r.st.maxX - r.st.minX, h = r.st.maxY - r.st.minY; assert.ok(w >= 14 && w <= 24 && h >= 14 && h <= 26, `semente ${v} ${w.toFixed(1)}x${h.toFixed(1)}`); assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 72) < 4, "descentrada"); }
  assert.strictEqual(seq(seed(3, { calm: true })), seq(seed(0, { calm: true })));
  const ys = []; for (let i = 0; i < 20; i++) ys.push(rec(seed(0, { time: i * 0.1 })).log); assert.ok(new Set(ys).size > 4, "a semente balança de leve sem calm");
});

test("minhoca: 4 cores, correndo (|v| >= 8) e parada diferentes, enterrada é só o montinho (menor e sem rosto); r escala o desenho", () => {
  const hues = new Set(); for (let h = 0; h < 4; h++) hues.add(rec(worm({ hue: h }, { calm: true })).log); assert.strictEqual(hues.size, 4);
  const f = rec(worm({}, { calm: true })), f2 = rec(worm({ vx: 7.9 }, { calm: true })), r1 = rec(worm({ vx: 8 }, { calm: true })), r2 = rec(worm({ vy: 150 }, { calm: true })), hid = rec(worm({}, { calm: true, hidden: true }));
  assert.notStrictEqual(f.log, r1.log); assert.notStrictEqual(r1.log, r2.log); assert.notStrictEqual(f2.log, r1.log, "7,9 ainda é parada, 8 já foge"); assert.notStrictEqual(hid.log, f.log);
  assert.ok(hid.st.calls < f.st.calls / 2, "enterrada desenha bem menos: " + hid.st.calls + " x " + f.st.calls);
  const wf = f.st.maxX - f.st.minX; assert.ok(wf >= 14 && wf <= 34, "largura da minhoca " + wf.toFixed(1));
  const big = rec(worm({ vx: 150 }, { calm: true, r: 16 })).st; assert.ok(big.maxX - big.minX > wf * 1.5, "o raio r deveria escalar o desenho");
  assert.ok(Math.abs((hid.st.minX + hid.st.maxX) / 2 - 300) < 6, "montinho descentrado");
});

test("frutos: 5 tipos diferentes, ~16 px, os de poder brilham mais que o comum; as cores-CHAVE estão congeladas, são todas diferentes e aparecem no desenho de cada tipo", () => {
  const seen = new Set(), size = {};
  for (const k of KINDS) { const r = rec(fruit(k, { calm: true })); assert.ok(!seen.has(r.log), k + " igual a outro"); seen.add(r.log); size[k] = r.st.maxX - r.st.minX; assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 40) < 6, "fruto descentrado"); }
  for (const k of ["gold", "ice", "turbo", "magnet"]) assert.ok(size[k] > size.scare, k + " deveria ter brilho (caixa maior que o comum)");
  assert.ok(size.scare >= 12 && size.scare <= 26, "fruto comum " + size.scare);
  assert.strictEqual(seq(fruit("nada", { calm: true })), seq(fruit("scare", { calm: true })));
  const K = BirdArt.FRUIT_KEYS;
  assert.deepStrictEqual(Object.keys(K), KINDS);
  assert.strictEqual(JSON.stringify(K), '{"scare":{"fill":"#ff5a52","strand":"#b82a2e","hi":"#ffd1c6","glow":null},"gold":{"fill":"#ffd23f","strand":"#c4900c","hi":"#fff2b0","glow":"rgba(255,210,63,.36)"},"ice":{"fill":"#a7e4ff","strand":"#3f8fc8","hi":"#ffffff","glow":"rgba(120,200,255,.4)"},"turbo":{"fill":"#ff9f43","strand":"#c2570c","hi":"#ffd9a8","glow":"rgba(255,120,40,.36)"},"magnet":{"fill":"#b98cf5","strand":"#7a3fc8","hi":"#eadcff","glow":"rgba(180,120,255,.4)"}}', "as cores-chave mudaram");
  assert.ok(Object.isFrozen(K) && KINDS.every((k) => Object.isFrozen(K[k])), "as cores-chave são só leitura");
  assert.strictEqual(new Set(KINDS.map((k) => K[k].fill)).size, 5);
  const hue = (h) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return 0; let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (hh * 60 + 360) % 360; };
  const hs = KINDS.map((k) => hue(K[k].fill)).sort((a, b) => a - b); for (let i = 1; i < hs.length; i++) assert.ok(hs[i] - hs[i - 1] >= 14, "as cores-chave são parecidas demais: " + hs.join());
  for (const k of KINDS) { const log = seq(fruit(k, { calm: true })); assert.ok(log.includes(`"${K[k].fill}"`), k + ": a cor-chave não aparece"); assert.ok(log.includes(`"${K[k].hi}"`), k + ": o brilho não aparece"); }
  // a marquinha: cada tipo tem uma além da cor (as chamadas depois da última elipse do fruto diferem mesmo se a cor fosse a mesma)
  const marks = new Set(KINDS.map((k) => { const l = seq(fruit(k, { calm: true })).split("\n"); const i = l.lastIndexOf("rotate(0)"); return l.slice(i).join("|").replace(/"#[0-9a-f]{6}"/gi, ""); })); assert.strictEqual(marks.size, 5, "cada fruto tem a sua marquinha");
  const ys = []; for (let i = 0; i < 20; i++) ys.push(rec(fruit("gold", { time: i * 0.1 })).st.minY);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 1.5 && Math.max(...ys) - Math.min(...ys) <= 5, "o fruto deveria flutuar uns 3 px");
});

// ---------- poleiro, postos, ninho e efeitos ----------
test("poleiro (skin da lojinha): sem look.style devolve false e não desenha; cada estilo desenha diferente dentro do tile de 32×32; estilo desconhecido vira galho", () => {
  assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0, {}), false); assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0, { look: {} }), false); assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0, { look: { style: "" } }), false);
  const c0 = makeCtx(); BirdArt.drawRoost(c0, 0, 0, {}); assert.strictEqual(c0.__log.length, 0, "não desenha nada sem estilo");
  const seen = new Set(), L = (s, extra) => (c) => assert.strictEqual(BirdArt.drawRoost(c, 64, 96, { look: Object.assign({ style: s }, extra) }), true);
  for (const s of ["branch", "bamboo", "swing", "house"]) { const r = rec(L(s)); assert.ok(!seen.has(r.log), s + " igual a outro"); seen.add(r.log); assert.ok(r.st.minX >= 64 - 0.5 && r.st.maxX <= 96 + 0.5 && r.st.minY >= 96 - 0.5 && r.st.maxY <= 128 + 0.5, `${s} sai do tile: ${r.st.minX - 64} ${r.st.maxX - 64} ${r.st.minY - 96} ${r.st.maxY - 96}`); }
  assert.strictEqual(seq(L("nada")), seq(L("branch")));
  assert.notStrictEqual(seq(L("branch", { top: "#112233" })), seq(L("branch")), "as cores da skin valem");
  assert.strictEqual(seq(L("branch", { top: "azul" })), seq(L("branch")), "cor inválida é ignorada");
});

test("postos: moita do gato e galho alto do gavião, ~40 px, centrados e diferentes", () => {
  const g = rec((c) => BirdArt.drawPost(c, 100, 100, { kind: "cat" })), t = rec((c) => BirdArt.drawPost(c, 100, 100, { kind: "hawk" }));
  assert.notStrictEqual(g.log, t.log);
  assert.strictEqual(seq((c) => BirdArt.drawPost(c, 100, 100, {})), g.log, "sem kind é a moita do gato");
  for (const r of [g, t]) { const w = r.st.maxX - r.st.minX, h = r.st.maxY - r.st.minY; assert.ok(w >= 34 && w <= 50, "posto largura " + w); assert.ok(h >= 28 && h <= 48, "posto altura " + h); assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 100) < 6 && Math.abs((r.st.minY + r.st.maxY) / 2 - 100) < 8, "posto descentrado"); }
  assert.notStrictEqual(seq((c) => BirdArt.drawPost(c, 100, 100, { kind: "cat", time: 0.05 })), seq((c) => BirdArt.drawPost(c, 100, 100, { kind: "cat", time: 0.5 })), "o gato pisca na moita");
});

test("ninho da saída: aberto e fechado diferentes, em pé também, ocupam o retângulo da saída (sem sair dele) e as cores do ambiente e as skins valem", () => {
  const nest = (o, x = 40, y = 70) => rec((c) => BirdArt.drawNest(c, x, y, Object.assign({ calm: true }, o)));
  const a = nest({ open: true }), f = nest({ open: false });
  assert.notStrictEqual(a.log, f.log);
  for (const [r, w, h] of [[a, 96, 32], [f, 96, 32], [nest({ open: true, w: 32, h: 96 }), 32, 96], [nest({ open: false, w: 32, h: 96 }), 32, 96], [nest({ open: true, w: 64, h: 32 }), 64, 32]]) {
    assert.ok(r.st.minX >= 40 - 0.6 && r.st.maxX <= 40 + w + 0.6 && r.st.minY >= 70 - 0.6 && r.st.maxY <= 70 + h + 0.6, `ninho ${w}x${h} sai do retângulo: ${r.st.minX - 40} ${r.st.maxX - 40} ${r.st.minY - 70} ${r.st.maxY - 70}`);
    assert.ok((r.st.maxX - r.st.minX) >= w * 0.85 && (r.st.maxY - r.st.minY) >= h * 0.85, `ninho ${w}x${h} pequeno demais`);
  }
  assert.notStrictEqual(nest({ open: true, w: 32, h: 96 }).log, a.log, "em pé é outro desenho");
  assert.strictEqual(seq((c) => BirdArt.drawNest(c, 40, 70, { open: true, calm: true, w: 96, h: 32 })), a.log, "96×32 é o padrão");
  assert.notStrictEqual(nest({ open: true, rim: "#112233", twig: "#445566", lining: "#778899" }).log, a.log, "as cores do ambiente valem");
  const seen = new Set([a.log]); for (const deco of ["stripes", "rainbow", "stars", "frame"]) { const l = nest({ open: true, look: { deco } }).log; assert.ok(!seen.has(l), deco + " igual a outro"); seen.add(l); }
  assert.notStrictEqual(nest({ open: true, look: { open: "#2244ff" } }).log, a.log, "a cor do brilho aberto da skin vale");
  assert.ok(a.log.includes('"#3ddc84"') && f.log.includes('"#e0605a"'), "verde aberto, vermelho fechado");
  assert.strictEqual(seq((c) => BirdArt.drawNest(c, 40, 70, { open: true, look: {} })), seq((c) => BirdArt.drawNest(c, 40, 70, { open: true })), "look vazio = de sempre");
});

test("efeitos: 8 tipos diferentes; mudam com t; sem `kind` válido não desenha nada; poeira e vento mudam com o lado", () => {
  const seen = new Set();
  for (const k of FX) {
    const a = seq((c) => BirdArt.drawFx(c, k, 50, 50, 0.1, {})), b = seq((c) => BirdArt.drawFx(c, k, 50, 50, 0.6, {}));
    assert.ok(a && b && a !== b, k + " não muda com t"); assert.ok(!seen.has(a), k + " igual a outro"); seen.add(a);
    const s = rec((c) => BirdArt.drawFx(c, k, 50, 50, 0.5, {})).st; assert.ok(s.maxX - s.minX <= 80 && s.maxY - s.minY <= 80, k + " grande demais");
    assert.ok(rec((c) => BirdArt.drawFx(c, k, 50, 50, 0.5, {})).st.calls > 2, k + " não desenha nada");
  }
  assert.strictEqual(seq((c) => BirdArt.drawFx(c, "nada", 5, 5, 0.5, {})).split("\n").length <= 4, true);
  assert.notStrictEqual(seq((c) => BirdArt.drawFx(c, "dust", 50, 50, 0.4, { facing: "left" })), seq((c) => BirdArt.drawFx(c, "dust", 50, 50, 0.4, { facing: "right" })));
  assert.notStrictEqual(seq((c) => BirdArt.drawFx(c, "gust", 50, 50, 0.4, { dx: 1, dy: 0 })), seq((c) => BirdArt.drawFx(c, "gust", 50, 50, 0.4, { dx: 0, dy: -1 })), "o vento segue a direção");
  assert.notStrictEqual(seq((c) => BirdArt.drawFx(c, "feather", 50, 50, 0.4, { color: "#ff0000" })), seq((c) => BirdArt.drawFx(c, "feather", 50, 50, 0.4, {})), "a cor da pena");
  const sh = (t) => rec((c) => BirdArt.drawFx(c, "shadow", 50, 50, t, {})).st; assert.ok(sh(1).maxX - sh(1).minX > sh(0).maxX - sh(0).minX, "a sombra do voo alto fica mais larga quanto mais alto");
});

// ---------- skins da lojinha (o.look) ----------
test("`look` vazio, ausente ou sem campos visuais desenha EXATAMENTE o de sempre; com campos, muda só o que deve", () => {
  const same = (fn) => { const base = seq(fn(undefined)); for (const lk of [{}, null, 5, { nada: 1 }, { coats: [] }]) assert.strictEqual(seq(fn(lk)), base, JSON.stringify(lk)); return base; };
  const b1 = same((lk) => foe({ idx: 1 }, { time: 1, look: lk })), b2 = same((lk) => hawk({}, { time: 1, look: lk })), b3 = same((lk) => seed(0, { time: 1, look: lk })), b4 = same((lk) => worm({ hue: 1 }, { time: 1, look: lk })), b5 = same((lk) => fruit("gold", { time: 1, look: lk })), b6 = same((lk) => (c) => BirdArt.drawNest(c, 1, 1, { open: true, look: lk }));
  assert.notStrictEqual(seq(foe({ idx: 1 }, { time: 1, look: { collar: "#2f9ad8", tag: "#e3e9f0" } })), b1, "coleira");
  for (const acc of ["bandana", "bowtie", "hat", "bow"]) assert.notStrictEqual(seq(foe({ idx: 1 }, { time: 1, look: { acc, c1: "#e8403a", c2: "#ffffff" } })), b1, acc);
  assert.notStrictEqual(seq(foe({ idx: 1 }, { time: 1, look: { collar: "rainbow" } })), b1, "arco-íris");
  assert.notStrictEqual(seq(foe({ idx: 1 }, { time: 1, look: { coats: [{ fur: "#ffccee", dark: "#aa6688", light: "#ffffff", eye: "#3366ff" }] } })), b1, "pelagem");
  for (const acc of ["scarf", "hat", "bow", "band"]) assert.notStrictEqual(seq(hawk({}, { time: 1, look: { acc, c1: "#e8403a" } })), b2, acc);
  assert.notStrictEqual(seq(hawk({}, { time: 1, look: { coats: [{ fur: "#eeeeee", dark: "#555555", light: "#ffffff", wing: "#999999" }] } })), b2, "penas do gavião");
  assert.notStrictEqual(seq(seed(0, { time: 1, look: { coats: [{ body: "#ffaa00", stripe: "#222222", hi: "#ffffff" }] } })), b3); assert.notStrictEqual(seq(seed(0, { time: 1, look: { glow: "#ff00ff" } })), b3);
  for (const acc of ["cap", "bow", "scarf"]) assert.notStrictEqual(seq(worm({ hue: 1 }, { time: 1, look: { acc, c1: "#3f86e0" } })), b4, acc);
  assert.notStrictEqual(seq(worm({ hue: 1 }, { time: 1, look: { coats: [{ body: "#88ccff", belly: "#ffffff", band: "#2244aa" }] } })), b4, "cor da minhoca");
  for (const pat of ["stripes", "dots", "hearts", "rainbow", "stars"]) { const l = seq(fruit("gold", { time: 1, look: { pat } })); assert.notStrictEqual(l, b5, pat); assert.ok(l.includes('"#ffd23f"') && l.includes('"#fff2b0"'), "a cor-chave continua com a estampa " + pat); }
  assert.strictEqual(seq(fruit("gold", { time: 1, look: { fill: "#000000", strand: "#000000", kind: "ice", glow: "#000000" } })), b5, "nenhuma skin muda a cor-chave nem o tipo do fruto");
  assert.notStrictEqual(b6, seq((c) => BirdArt.drawNest(c, 1, 1, { open: true, look: { deco: "stars" } })));
});

if (failed) { console.log("\n" + failed + " teste(s) falharam"); process.exit(1); }
console.log("\nTodos os testes de js/bird-art.js passaram");
