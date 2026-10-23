// Testes dos desenhos do Gatinho (js/cat-art.js), sem navegador. Uso: node tests/cat-art.test.js
// O contexto 2D é FALSO e rigoroso: só aceita os métodos e propriedades simples do canvas listados abaixo (qualquer outro lança erro), confere que todo número é finito,
// que as cores são válidas, que save/restore fecham certinho e que nenhum raio é negativo; registra cada chamada (para comparar desenhos) e acompanha a matriz de
// transformação para medir a caixa que o desenho ocupa. Também lê o código-fonte: nada de Math.random, relógio nem acesso à página.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const FILE = path.join(__dirname, "../js/cat-art.js");
const CatArt = require(FILE);

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
const realRandom = Math.random, realNow = Date.now;
Math.random = () => { throw new Error("Math.random proibido nos desenhos"); };
Date.now = () => { throw new Error("Date.now proibido nos desenhos"); };
process.on("exit", () => { Math.random = realRandom; Date.now = realNow; });

const DIRS = ["left", "right", "up", "down"];
const KINDS = ["scare", "gold", "ice", "turbo", "magnet"];
const cat = (p, o) => (c) => CatArt.drawCat(c, Object.assign({ x: 100, y: 50, w: 24, h: 24, facing: "right", moving: false }, p), o);
const dog = (d, o) => (c) => CatArt.drawDog(c, Object.assign({ x: 200, y: 120, dir: 1, mode: "patrol", kind: "guard", size: "medium", idx: 0 }, d), o);

// ---------- contrato ----------
test("todas as funções do contrato existem", () => {
  for (const n of ["drawCat", "drawDog", "drawMouse", "drawAgileMouse", "drawYarn", "drawPost", "drawFx", "growthStage", "skinById"]) assert.strictEqual(typeof CatArt[n], "function", n);
  assert.ok(Array.isArray(CatArt.SKINS));
});

test("não lançam erro com `o` vazio, sem parâmetros ou com valores esquisitos", () => {
  const junk = [undefined, null, {}, { x: NaN, y: Infinity, w: "a", h: -5, facing: 7, moving: "sim" }, { dir: 0, mode: "xyz", kind: 3, size: null, idx: NaN, vx: NaN, vy: "z", hue: -9, variant: 99, kind2: 1 }];
  const junkO = [undefined, null, {}, { gr: NaN, skin: 42, wet: "muito", time: Infinity, r: -3, calm: "x" }, { gr: -4, wet: 9, time: -1e9, r: 1e9, skin: "nao-existe" }];
  for (const p of junk) for (const o of junkO) {
    rec((c) => CatArt.drawCat(c, p, o)); rec((c) => CatArt.drawDog(c, p, o)); rec((c) => CatArt.drawMouse(c, p, o)); rec((c) => CatArt.drawAgileMouse(c, p, o)); rec((c) => CatArt.drawYarn(c, p, o));
    rec((c) => CatArt.drawPost(c, p && p.x, p && p.y, o)); for (const k of ["splash", "shake", "dust", "hiss", "sparkle", "wetdrop", "nada", undefined]) rec((c) => CatArt.drawFx(c, k, 5, 5, p && p.t, o));
  }
  for (const f of ["drawCat", "drawDog", "drawMouse", "drawAgileMouse", "drawYarn"]) { rec((c) => CatArt[f](c)); CatArt[f](null); CatArt[f](undefined, {}, {}); }
  rec((c) => CatArt.drawPost(c)); rec((c) => CatArt.drawFx(c)); CatArt.drawPost(null); CatArt.drawFx(null);
  assert.strictEqual(CatArt.growthStage(), "adulto"); assert.strictEqual(CatArt.growthStage(NaN), "adulto"); assert.strictEqual(CatArt.skinById(undefined).id, "");
});

test("o desenho só usa o que o canvas simples tem, com números finitos, cores válidas e save/restore fechados", () => { // (o rec/ctx falso já lança nesses casos; aqui varre muitos pedidos)
  let n = 0;
  for (const d of DIRS) for (const gr of [0, 0.2, 0.5, 0.9, 1]) for (const skin of CatArt.SKINS.map((s) => s.id)) for (const mv of [false, true]) {
    for (const o of [{ gr, skin }, { gr, skin, wet: 1, sprint: true }, { gr, skin, safe: true, hiss: true }, { gr, skin, wet: 0.5, calm: true, still: true }]) { rec(cat({ facing: d, moving: mv }, Object.assign({ time: 1.7 }, o))); n++; }
  }
  assert.ok(n > 1000);
});

test("respeita o globalAlpha com que o jogo chamou (só multiplica; devolve igual)", () => {
  const all = [cat({ moving: true }, { time: 1, wet: 1 }), cat({}, { hiss: true, safe: true }), dog({ mode: "flee" }, { time: 1 }), dog({ slow: true, frozen: true }, {}), (c) => CatArt.drawMouse(c, { x: 5, y: 5 }, { time: 1 }),
    (c) => CatArt.drawAgileMouse(c, { x: 5, y: 5, vx: 99 }, { time: 1 }), (c) => CatArt.drawYarn(c, { x: 5, y: 5, kind: "gold" }, { time: 1 }), (c) => CatArt.drawPost(c, 5, 5, { kind: "tracker" })];
  for (const k of ["splash", "shake", "dust", "hiss", "sparkle", "wetdrop"]) all.push((c) => CatArt.drawFx(c, k, 5, 5, 0.3, {}));
  for (const fn of all) { const r = rec(fn, 0.5); assert.ok((r.st.maxAlpha || 0) <= 0.5 + 1e-9, "usou alpha maior que o recebido: " + r.st.maxAlpha); }
  assert.ok(rec(cat({}, { wet: 1 }), 0.5).st.maxAlpha > 0, "sanidade: o desenho usa alpha");
});

// ---------- reduzir movimento e determinismo ----------
const SCENES = [];
for (const d of DIRS) for (const mv of [false, true]) for (const o of [{}, { gr: 0 }, { wet: 1 }, { sprint: true }, { safe: true }, { hiss: true }, { hiss: true, wet: 0.7, skin: "supergato" }, { skin: "astronauta" }, { skin: "pirata", gr: 0.5 }])
  SCENES.push([`gatinho ${d} ${mv ? "andando" : "parado"} ${JSON.stringify(o)}`, (t, calm) => cat({ facing: d, moving: mv }, Object.assign({ time: t, calm }, o))]);
for (const kind of ["guard", "tracker"]) for (const mode of ["patrol", "chase", "flee", "search", "idle"]) for (const size of ["small", "medium", "large"]) for (const x of [{}, { frozen: true }, { slow: true }])
  SCENES.push([`cão ${kind} ${mode} ${size} ${JSON.stringify(x)}`, (t, calm) => dog(Object.assign({ kind, mode, size, idx: 3 }, x), { time: t, calm })]);
for (let v = 0; v < 3; v++) SCENES.push([`ratinho ${v}`, (t, calm) => (c) => CatArt.drawMouse(c, { x: 64, y: 96, variant: v }, { time: t, calm })]);
for (const [vx, vy] of [[0, 0], [3, 0], [140, 0], [-120, 80], [0, -150]]) SCENES.push([`camundongo ${vx},${vy}`, (t, calm) => (c) => CatArt.drawAgileMouse(c, { x: 300, y: 200, vx, vy, hue: 2 }, { time: t, calm, r: 8 })]);
for (const k of KINDS) SCENES.push([`novelo ${k}`, (t, calm) => (c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: k }, { time: t, calm })]);

test("calm: o mesmo pedido em dois instantes diferentes desenha EXATAMENTE a mesma sequência de chamadas", () => {
  for (const [name, mk] of SCENES) assert.strictEqual(seq(mk(0.37, true)), seq(mk(5.91, true)), "calm mudou o desenho: " + name);
  for (const k of ["splash", "shake", "dust", "hiss", "sparkle", "wetdrop"]) assert.strictEqual(seq((c) => CatArt.drawFx(c, k, 9, 9, 0.4, { calm: true })), seq((c) => CatArt.drawFx(c, k, 9, 9, 0.4, { calm: true })));
  for (const p of ["guard", "tracker"]) assert.strictEqual(seq((c) => CatArt.drawPost(c, 40, 40, { kind: p, calm: true, time: 1 })), seq((c) => CatArt.drawPost(c, 40, 40, { kind: p, calm: true, time: 9 })));
});

test("sem calm o tempo mexe no desenho (o teste acima não é vazio)", () => {
  let moved = 0;
  for (const [, mk] of SCENES) if (seq(mk(0.37, false)) !== seq(mk(0.55, false))) moved++;
  assert.ok(moved > SCENES.length * 0.7, "poucas cenas animadas: " + moved + "/" + SCENES.length);
  // `still` (mostruário) também fica parado, sem calm
  assert.strictEqual(seq(cat({ moving: true }, { still: true, time: 0.3 })), seq(cat({ moving: true }, { still: true, time: 4.4 })));
  assert.notStrictEqual(seq(cat({ moving: true }, { time: 0.3 })), seq(cat({ moving: true }, { time: 0.4 })));
});

test("calm: as pernas de quem anda seguem a POSIÇÃO (andando de verdade as pernas mudam, parado não)", () => {
  const noPos = (l) => { const a = l.split("\n"); a.splice(a.findIndex((x) => x.startsWith("translate(")), 1); return a.join("\n"); }; // tira o 1º translate (a posição), para comparar só o desenho
  assert.notStrictEqual(noPos(seq(cat({ x: 100, moving: true }, { calm: true }))), noPos(seq(cat({ x: 117, moving: true }, { calm: true }))), "andando, as pernas deveriam mudar com a posição");
  assert.strictEqual(noPos(seq(cat({ x: 100, moving: false }, { calm: true }))), noPos(seq(cat({ x: 117, moving: false }, { calm: true }))), "parado, o desenho não depende da posição");
  const v = (y) => noPos(seq(cat({ y, facing: "down", moving: true }, { calm: true })));
  assert.notStrictEqual(v(50), v(67), "descendo, o passo segue o y");
});

test("determinismo: o mesmo pedido, duas vezes, desenha a mesma coisa (e sem Math.random nem relógio)", () => {
  for (const [name, mk] of SCENES) assert.strictEqual(seq(mk(2.5, false)), seq(mk(2.5, false)), name);
  for (const k of ["splash", "shake", "dust", "hiss", "sparkle", "wetdrop"]) for (const t of [0, 0.3, 1]) assert.strictEqual(seq((c) => CatArt.drawFx(c, k, 9, 9, t, {})), seq((c) => CatArt.drawFx(c, k, 9, 9, t, {})));
});

test("o código-fonte não usa Math.random, Date, performance.now, window, document nem localStorage", () => {
  const src = fs.readFileSync(FILE, "utf8").replace(/\/\/[^\n]*/g, "");
  for (const bad of [/Math\.random/, /Date\.now|new Date/, /performance\.now/, /\bdocument\b/, /localStorage/, /requestAnimationFrame/, /\bfetch\(/, /require\(/]) assert.ok(!bad.test(src), "achei " + bad);
  assert.ok(!/window\./.test(src.replace(/typeof window !== "undefined" \? window : globalThis/g, "").replace(/root\.CatArt/g, "")), "usa window");
});

// ---------- skins ----------
test("12 skins: ids únicos, nomes e frases, preços crescentes de 10 a 50 (exceto a padrão) e só campos visuais", () => {
  const S = CatArt.SKINS;
  assert.deepStrictEqual(S.map((s) => s.id), ["", "preto", "branco", "cinza", "laranja", "siames", "vanturco", "tricolor", "smoking", "pirata", "astronauta", "supergato"]);
  assert.deepStrictEqual(S.map((s) => s.name), ["Rajado", "Preto", "Branco", "Cinza", "Laranja", "Siamês", "Van Turco", "Tricolor", "Smoking", "Pirata", "Astronauta", "Super-gato"]);
  assert.strictEqual(new Set(S.map((s) => s.id)).size, 12); assert.strictEqual(new Set(S.map((s) => s.name)).size, 12);
  assert.strictEqual(S[0].price, 0);
  for (let i = 1; i < S.length; i++) { assert.ok(Number.isInteger(S[i].price) && S[i].price >= 10 && S[i].price <= 50, S[i].id + " preço " + S[i].price); assert.ok(S[i].price > S[i - 1].price, "preço não cresce em " + S[i].id); }
  assert.strictEqual(S[S.length - 1].price, 50); assert.strictEqual(S[1].price, 10);
  for (const s of S) {
    assert.deepStrictEqual(Object.keys(s).sort(), ["id", "name", "price", "text"], "campos de " + s.id); // nenhum campo de atributo (velocidade, vida, tamanho...)
    assert.ok(typeof s.text === "string" && s.text.length >= 8 && s.text.length <= 60, "frase de " + s.id);
    assert.ok(!/veloc|rápid|ponto|vidas?\b|poder|bônus|miado|\bsom\b|mais forte|mais lento|atributo/i.test(s.name + " " + s.text), "a frase de " + s.id + " sugere vantagem");
    assert.ok(!/siamese|persa|angor|bengal|maine|sphynx|ragdoll/i.test(s.text), "sem referência a raça na frase");
    assert.strictEqual(CatArt.skinById(s.id), s);
  }
  assert.strictEqual(CatArt.skinById("nao-existe"), S[0]); assert.strictEqual(CatArt.skinById(7), S[0]);
  assert.ok(Object.isFrozen(S), "a lista é só leitura");
});

test("cada skin desenha diferente das outras, em todas as direções e estágios, e nenhuma muda o tamanho de contato (a caixa do desenho)", () => {
  for (const d of DIRS) for (const gr of [0, 0.5, 1]) {
    const seen = new Map();
    for (const s of CatArt.SKINS) {
      const l = seq(cat({ facing: d }, { skin: s.id, gr, still: true }));
      assert.ok(!seen.has(l), `${s.id} desenha igual a ${seen.get(l)} (${d}, gr ${gr})`);
      seen.set(l, s.id);
    }
  }
  for (const s of CatArt.SKINS) { // mesma altura de pés (mesma sombra no chão): as skins não mudam onde o gatinho está
    const a = rec(cat({ facing: "right" }, { skin: "", still: true })).st, b = rec(cat({ facing: "right" }, { skin: s.id, still: true })).st;
    assert.ok(Math.abs(a.maxY - b.maxY) < 2.5, "a skin " + s.id + " muda a base do desenho");
  }
});

// ---------- o gatinho ----------
test("estágios: filhote, jovem e adulto (mesmo corte do cachorrinho) e o desenho cresce", () => {
  assert.strictEqual(CatArt.growthStage(0), "filhote"); assert.strictEqual(CatArt.growthStage(0.33), "filhote"); assert.strictEqual(CatArt.growthStage(0.339), "filhote");
  assert.strictEqual(CatArt.growthStage(0.34), "jovem"); assert.strictEqual(CatArt.growthStage(0.66), "jovem"); assert.strictEqual(CatArt.growthStage(0.669), "jovem");
  assert.strictEqual(CatArt.growthStage(0.67), "adulto"); assert.strictEqual(CatArt.growthStage(1), "adulto");
  const w = (gr) => { const s = rec(cat({ facing: "right" }, { gr, still: true })).st; return s.maxX - s.minX; };
  assert.ok(w(0) < w(0.5) && w(0.5) < w(1), `largura não cresce: ${w(0)} ${w(0.5)} ${w(1)}`);
});

test("estados do gatinho (molhado, arrancada, a salvo, eriçado, andando) desenham diferente do normal, em todas as direções", () => {
  for (const d of DIRS) for (const gr of [0, 1]) {
    const base = seq(cat({ facing: d }, { gr, time: 0.3 })), seen = new Set([base]);
    for (const o of [{ wet: 1 }, { wet: 0.4 }, { sprint: true }, { safe: true }, { hiss: true }]) { const l = seq(cat({ facing: d, moving: o.sprint }, Object.assign({ gr, time: 0.3 }, o))); assert.ok(!seen.has(l), `${JSON.stringify(o)} igual a outro estado (${d})`); seen.add(l); }
    assert.notStrictEqual(seq(cat({ facing: d, moving: true }, { gr, time: 0.3 })), base);
  }
  assert.notStrictEqual(seq(cat({}, { wet: 1 })), seq(cat({}, { wet: 0 })));
});

test("o gatinho é desenhado centrado na caixa e com cerca de 30 a 36 px (até ~44 px com rabo esticado, ~40 px de altura)", () => {
  const out = {};
  for (const d of DIRS) for (const [label, o] of [["parado", {}], ["filhote", { gr: 0 }], ["molhado", { wet: 1 }], ["arrancada", { sprint: true }], ["a salvo", { safe: true }], ["eriçado", { hiss: true }], ["astronauta", { skin: "astronauta" }], ["super-gato", { skin: "supergato", sprint: true }]]) {
    const p = { x: 100, y: 50, w: 24, h: 24, facing: d, moving: label === "arrancada" };
    const s = rec((c) => CatArt.drawCat(c, p, Object.assign({ still: true }, o))).st, cx = 112, cy = 62;
    const w = s.maxX - s.minX, h = s.maxY - s.minY;
    (out[label] = out[label] || []).push([w, h]);
    assert.ok(w >= 16 && w <= 46, `largura ${w.toFixed(1)} fora de 16..46 (${d} ${label})`);
    assert.ok(h >= 20 && h <= (label === "a salvo" ? 46 : 42), `altura ${h.toFixed(1)} fora do limite (${d} ${label})`); // a salvo: maior e com a sombra mais longe
    assert.ok(s.minX > cx - 30 && s.maxX < cx + 30 && s.minY > cy - 28 && s.maxY < cy + 22, `fora do centro (${d} ${label}): ${s.minX - cx} ${s.maxX - cx} ${s.minY - cy} ${s.maxY - cy}`);
    if (label === "parado") assert.ok(Math.abs((s.minX + s.maxX) / 2 - cx) < 9 && Math.abs((s.minY + s.maxY) / 2 - cy) < 9, `desenho descentrado em ${d}: ${(s.minX + s.maxX) / 2 - cx}, ${(s.minY + s.maxY) / 2 - cy}`);
  }
  const rng = (a) => Math.min(...a).toFixed(1) + "–" + Math.max(...a).toFixed(1);
  console.log("     caixa do desenho (largura × altura em px, nas 4 direções): " + Object.entries(out).map(([k, v]) => `${k} ${rng(v.map((x) => x[0]))} × ${rng(v.map((x) => x[1]))}`).join(" | "));
});

test("esquerda é o espelho da direita (mesma caixa) e o desenho acompanha o p.x/p.y", () => {
  const l = rec(cat({ facing: "left" }, { still: true })).st, r = rec(cat({ facing: "right" }, { still: true })).st;
  assert.ok(Math.abs((l.maxX - l.minX) - (r.maxX - r.minX)) < 0.01 && Math.abs((l.maxY - l.minY) - (r.maxY - r.minY)) < 0.01);
  const a = rec(cat({ x: 100, y: 50 }, { still: true })).st, b = rec(cat({ x: 130, y: 80 }, { still: true })).st;
  assert.ok(Math.abs(b.minX - a.minX - 30) < 0.01 && Math.abs(b.minY - a.minY - 30) < 0.01);
  const w = rec(cat({ x: 100, y: 50, w: 30, h: 30 }, { still: true })).st; // outra caixa: centra nela
  assert.ok(Math.abs(w.minX - a.minX - 3) < 0.01);
});

test("a salvo: um pouco maior e a sombra mais longe; molhado e eriçado não mudam a base do desenho", () => {
  const n = rec(cat({}, { still: true })).st, s = rec(cat({}, { safe: true, still: true })).st;
  assert.ok(s.maxY > n.maxY, "a sombra de quem está a salvo deveria ficar mais longe (mais embaixo)");
  assert.ok(s.maxX - s.minX > n.maxX - n.minX, "a salvo deveria ficar um pouco maior");
  for (const o of [{ wet: 1 }, { hiss: true }, { sprint: true }]) assert.ok(Math.abs(rec(cat({}, Object.assign({ still: true }, o))).st.maxY - n.maxY) < 2.5, "base mudou em " + JSON.stringify(o));
});

test("custo por quadro: o gatinho faz poucas chamadas e o gasto de memória não cresce (paletas guardadas)", () => {
  for (const o of [{}, { wet: 1, hiss: true, skin: "supergato" }, { skin: "tricolor", sprint: true }]) for (const d of DIRS) assert.ok(rec(cat({ facing: d, moving: true }, o)).st.calls < 520, `muitas chamadas: ${rec(cat({ facing: d, moving: true }, o)).st.calls} (${d} ${JSON.stringify(o)})`);
  const mem = () => process.memoryUsage().heapUsed;
  for (let i = 0; i < 300; i++) rec(cat({ x: i }, { time: i * 0.016, wet: (i % 9) / 8 })); // aquece as paletas
  const before = mem();
  for (let i = 0; i < 300; i++) rec(cat({ x: i }, { time: i * 0.016, wet: (i % 9) / 8 }));
  assert.ok(mem() - before < 60e6, "memória cresce demais");
});

// ---------- cães ----------
test("os dois tipos de cão × 3 tamanhos × 5 modos desenham diferente, e congelado/esmaecido/olhando para o outro lado também", () => {
  const seen = new Map();
  for (const kind of ["guard", "tracker"]) for (const mode of ["patrol", "chase", "flee", "search", "idle"]) {
    const l = seq(dog({ kind, mode, size: "medium" }, { time: 1.1 }));
    assert.ok(!seen.has(l), `${kind}/${mode} igual a ${seen.get(l)}`); seen.set(l, kind + "/" + mode);
  }
  for (const kind of ["guard", "tracker"]) {
    const base = seq(dog({ kind }, { time: 1.1 }));
    for (const x of [{ frozen: true }, { slow: true }, { dir: -1 }, { size: "small" }, { size: "large" }, { idx: 1 }, { idx: 2 }, { idx: 3 }]) assert.notStrictEqual(seq(dog(Object.assign({ kind }, x), { time: 1.1 })), base, kind + " " + JSON.stringify(x));
  }
  assert.notStrictEqual(seq(dog({ kind: "guard" }, { time: 1 })), seq(dog({ kind: "tracker" }, { time: 1 })));
  assert.notStrictEqual(seq(dog({ idx: 0 }, { time: 1 })), seq(dog({ idx: 1 }, { time: 1 })));
});

test("os cães: tamanhos crescem (pequeno < médio < grande), o rastreador é mais comprido e esguio que o de guarda, centrados em (x, y)", () => {
  const bb = (d) => { const s = rec(dog(d, { time: 0.5, calm: true })).st; return { w: s.maxX - s.minX, h: s.maxY - s.minY, cx: (s.minX + s.maxX) / 2, cy: (s.minY + s.maxY) / 2 }; };
  for (const kind of ["guard", "tracker"]) {
    const a = bb({ kind, size: "small" }), b = bb({ kind, size: "medium" }), c = bb({ kind, size: "large" });
    assert.ok(a.w < b.w && b.w < c.w && a.h < b.h && b.h < c.h, `${kind}: tamanhos fora de ordem`);
    assert.ok(a.w >= 24 && c.w <= 62, `${kind}: larguras ${a.w.toFixed(1)}..${c.w.toFixed(1)}`);
    assert.ok(Math.abs(b.cx - 200) < 9 && Math.abs(b.cy - 120) < 9, `${kind} descentrado: ${b.cx - 200}, ${b.cy - 120}`);
  }
  const g = bb({ kind: "guard", size: "medium" }), t = bb({ kind: "tracker", size: "medium" });
  assert.ok(t.w / t.h > g.w / g.h, "o rastreador deveria ser mais esguio (mais comprido que alto) que o de guarda");
  const l = rec(dog({ dir: -1 }, { calm: true })).st, r = rec(dog({ dir: 1 }, { calm: true })).st;
  assert.ok(Math.abs((l.maxX - l.minX) - (r.maxX - r.minX)) < 0.01, "olhar para o outro lado só espelha");
  console.log("     cão médio: guarda " + g.w.toFixed(1) + "x" + g.h.toFixed(1) + ", rastreador " + t.w.toFixed(1) + "x" + t.h.toFixed(1));
});

// ---------- ratinhos, novelos, posto e efeitos ----------
test("os 3 ratinhos desenham diferente; ~20 px; o corpo fica dentro do item de 16×16 mais a margem", () => {
  const seen = new Set();
  for (let v = 0; v < 3; v++) { const r = rec((c) => CatArt.drawMouse(c, { x: 64, y: 96, variant: v }, { time: 1, calm: true })); assert.ok(!seen.has(r.log)); seen.add(r.log); const w = r.st.maxX - r.st.minX; assert.ok(w >= 16 && w <= 28, "largura do ratinho " + w.toFixed(1)); assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 72) < 8 && Math.abs((r.st.minY + r.st.maxY) / 2 - 104) < 8, "ratinho descentrado"); }
  assert.strictEqual(seq((c) => CatArt.drawMouse(c, { x: 64, y: 96, variant: 3 }, { calm: true })), seq((c) => CatArt.drawMouse(c, { x: 64, y: 96, variant: 0 }, { calm: true })));
});

test("camundongo ágil: correndo (esticado na direção do movimento) e congelado (|v| < 8) são diferentes; mais claro e menor que o ratinho", () => {
  const run = (vx, vy) => rec((c) => CatArt.drawAgileMouse(c, { x: 300, y: 200, vx, vy, hue: 1 }, { time: 0.7, calm: true, r: 8 }));
  const f = run(0, 0), f2 = run(7.9, 0), r1 = run(8, 0), r2 = run(0, 150), r3 = run(-150, 0);
  assert.notStrictEqual(f.log, r1.log); assert.notStrictEqual(r1.log, r2.log); assert.notStrictEqual(r1.log, r3.log); assert.notStrictEqual(f2.log, r1.log, "7,9 ainda é congelado, 8 já corre");
  const wr = r1.st.maxX - r1.st.minX, hr = r2.st.maxY - r2.st.minY;
  assert.ok(Math.abs(wr - hr) < 8, "correndo para a direita e para baixo deveria ocupar o mesmo comprimento");
  assert.ok(wr <= 34, "camundongo grande demais: " + wr.toFixed(1));
  const big = rec((c) => CatArt.drawAgileMouse(c, { x: 300, y: 200, vx: 150, vy: 0, hue: 1 }, { calm: true, r: 16 })).st; assert.ok(big.maxX - big.minX > wr * 1.5, "o raio r deveria escalar o desenho");
  const hues = new Set(); for (let h = 0; h < 4; h++) hues.add(rec((c) => CatArt.drawAgileMouse(c, { x: 300, y: 200, vx: 150, vy: 0, hue: h }, { calm: true })).log); assert.strictEqual(hues.size, 4);
});

test("novelos: 5 tipos diferentes, ~16 px, e os de poder brilham mais que o comum", () => {
  const seen = new Set(), size = {};
  for (const k of KINDS) { const r = rec((c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: k }, { calm: true })); assert.ok(!seen.has(r.log), k + " igual a outro"); seen.add(r.log); size[k] = r.st.maxX - r.st.minX; assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 40) < 6, "novelo descentrado"); }
  for (const k of ["gold", "ice", "turbo", "magnet"]) assert.ok(size[k] > size.scare, k + " deveria ter brilho (caixa maior que o comum)");
  assert.ok(size.scare >= 14 && size.scare <= 26, "novelo comum " + size.scare);
  assert.strictEqual(seq((c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: "nada" }, { calm: true })), seq((c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: "scare" }, { calm: true })));
  // flutua como o osso (±2 px) sem calm
  const ys = []; for (let i = 0; i < 20; i++) ys.push(rec((c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: "gold" }, { time: i * 0.1 })).st.minY);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 1.5 && Math.max(...ys) - Math.min(...ys) <= 4.2, "o novelo deveria flutuar uns 4 px");
});

test("postos: casinha (guard) e almofada com tigela (tracker), ~40 px, centrados", () => {
  const g = rec((c) => CatArt.drawPost(c, 100, 100, { kind: "guard" })), t = rec((c) => CatArt.drawPost(c, 100, 100, { kind: "tracker" }));
  assert.notStrictEqual(g.log, t.log);
  assert.strictEqual(seq((c) => CatArt.drawPost(c, 100, 100, {})), g.log, "sem kind é a casinha");
  for (const r of [g, t]) { const w = r.st.maxX - r.st.minX, h = r.st.maxY - r.st.minY; assert.ok(w >= 36 && w <= 46, "posto largura " + w); assert.ok(h >= 28 && h <= 46, "posto altura " + h); assert.ok(Math.abs((r.st.minX + r.st.maxX) / 2 - 100) < 4 && Math.abs((r.st.minY + r.st.maxY) / 2 - 100) < 7, "posto descentrado"); }
});

test("efeitos: 6 tipos diferentes; mudam com t; somem no fim; sem `kind` válido não desenha nada", () => {
  const kinds = ["splash", "shake", "dust", "hiss", "sparkle", "wetdrop"], seen = new Set();
  for (const k of kinds) {
    const a = seq((c) => CatArt.drawFx(c, k, 50, 50, 0.1, {})), b = seq((c) => CatArt.drawFx(c, k, 50, 50, 0.6, {}));
    assert.ok(a && b && a !== b, k + " não muda com t"); assert.ok(!seen.has(a), k + " igual a outro"); seen.add(a);
    const s = rec((c) => CatArt.drawFx(c, k, 50, 50, 0.5, {})).st; assert.ok(s.maxX - s.minX <= 80 && s.maxY - s.minY <= 80, k + " grande demais");
  }
  assert.strictEqual(seq((c) => CatArt.drawFx(c, "nada", 5, 5, 0.5, {})).split("\n").length <= 4, true);
  assert.notStrictEqual(seq((c) => CatArt.drawFx(c, "dust", 50, 50, 0.4, { facing: "left" })), seq((c) => CatArt.drawFx(c, "dust", 50, 50, 0.4, { facing: "right" })));
  assert.strictEqual(seq((c) => CatArt.drawFx(c, "splash", 50, 50, 0.4, { calm: true })), seq((c) => CatArt.drawFx(c, "splash", 50, 50, 0.4, { calm: true, time: 99 })));
});

if (failed) { console.log("\n" + failed + " teste(s) falharam"); process.exit(1); }
console.log("\nTodos os testes de js/cat-art.js passaram");
