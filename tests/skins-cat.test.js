// Testes das SKINS DOS OBJETOS DO GATINHO (0.19.0), sem navegador. Uso: node tests/skins-cat.test.js
// Confere o catálogo de js/skins-cat.js (6 categorias: guard, mouse, yarn, agile, perch, tracker: 3 a 4 skins cada, preços de 10 a 30 em escada, nomes e frases em português, campos visuais documentados e válidos)
// e o desenho de js/cat-art.js com cada skin (contexto 2D falso e rigoroso, como em tests/cat-art.test.js): o padrão não muda, cada skin desenha diferente, nada passa do tamanho do objeto,
// os 5 poderes do novelo mantêm a cor-chave e a marquinha, e os ratinhos e camundongos continuam claros (legíveis na noite).
const assert = require("assert");
const fs = require("fs");
const path = require("path");

global.Skins = require(path.join(__dirname, "../js/skins.js"));
const CatArt = require(path.join(__dirname, "../js/cat-art.js"));
const FILE = path.join(__dirname, "../js/skins-cat.js");
require(FILE);
const Skins = global.Skins;

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const CATS = ["guard", "mouse", "yarn", "agile", "perch", "tracker"];
const src = fs.readFileSync(FILE, "utf8");
const head = src.slice(0, src.indexOf("(function ()")); // o comentário do topo, onde os campos visuais ficam documentados
const COLOR = /^(#[0-9a-f]{6}|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+)\s*\))$/i; // cor de campo da skin
const CTXCOLOR = /^(#[0-9a-f]{6}|#[0-9a-f]{3}|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+|1\.0+)\s*\))$/i; // cor que o canvas aceita
const HEX = /^#[0-9a-f]{6}$/i;
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; }; // luminância simples (0 a 1)

// ---------- contexto 2D falso e rigoroso ----------
const METHODS = new Set(["save", "restore", "beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arc", "ellipse", "rect", "fill", "stroke", "clip", "fillRect", "strokeRect", "translate", "scale", "rotate", "setLineDash"]);
const PROPS = new Set(["fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "globalAlpha"]);
const f3 = (v) => (typeof v === "number" ? String(Math.round(v * 1000) / 1000) : JSON.stringify(v));
function makeCtx() {
  const log = [];
  const st = { m: [1, 0, 0, 1, 0, 0], stack: [], depth: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxAlpha: 0 };
  const props = { fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, lineCap: "butt", lineJoin: "miter", globalAlpha: 1 };
  const pt = (x, y) => { const m = st.m, X = m[0] * x + m[2] * y + m[4], Y = m[1] * x + m[3] * y + m[5]; st.minX = Math.min(st.minX, X); st.maxX = Math.max(st.maxX, X); st.minY = Math.min(st.minY, Y); st.maxY = Math.max(st.maxY, Y); };
  const box = (x, y, rx, ry) => { pt(x - rx, y - ry); pt(x + rx, y - ry); pt(x - rx, y + ry); pt(x + rx, y + ry); };
  const impl = {
    save() { st.stack.push([st.m.slice(), Object.assign({}, props)]); st.depth++; },
    restore() { assert.ok(st.depth > 0, "restore sem save"); const [m, p] = st.stack.pop(); st.m = m; Object.assign(props, p); st.depth--; },
    translate(x, y) { const m = st.m; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; },
    scale(x, y) { const m = st.m; m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y; },
    rotate(r) { const m = st.m, c = Math.cos(r), s = Math.sin(r), a = m[0], b = m[1], cc = m[2], d = m[3]; m[0] = a * c + cc * s; m[1] = b * c + d * s; m[2] = -a * s + cc * c; m[3] = -b * s + d * c; },
    moveTo(x, y) { pt(x, y); }, lineTo(x, y) { pt(x, y); }, quadraticCurveTo(a, b, x, y) { pt(a, b); pt(x, y); }, bezierCurveTo(a, b, c, d, x, y) { pt(a, b); pt(c, d); pt(x, y); },
    arc(x, y, r) { assert.ok(r >= 0, "arc com raio negativo"); box(x, y, r, r); },
    ellipse(x, y, rx, ry, rot) { assert.ok(rx >= 0 && ry >= 0, "ellipse com raio negativo"); if (rot) { const r = Math.max(rx, ry); box(x, y, r, r); } else box(x, y, rx, ry); },
    rect(x, y, w, h) { pt(x, y); pt(x + w, y + h); }, fillRect(x, y, w, h) { pt(x, y); pt(x + w, y + h); }, strokeRect(x, y, w, h) { pt(x, y); pt(x + w, y + h); },
    beginPath() {}, closePath() {}, fill() {}, stroke() {}, clip() {}, setLineDash(a) { assert.ok(Array.isArray(a)); },
  };
  return new Proxy({}, {
    get(_, k) {
      if (k === "__st") return st;
      if (k === "__log") return log;
      if (METHODS.has(k)) return (...a) => { for (const v of a) if (typeof v === "number") assert.ok(Number.isFinite(v), `${k}: número inválido (${v})`); log.push(k + "(" + a.map(f3).join(",") + ")"); impl[k](...a); };
      if (PROPS.has(k)) return props[k];
      throw new Error("leitura não permitida: " + String(k));
    },
    set(_, k, v) {
      if (!PROPS.has(k)) throw new Error("propriedade não permitida: " + String(k));
      if (k === "fillStyle" || k === "strokeStyle") assert.ok(typeof v === "string" && CTXCOLOR.test(v), "cor inválida: " + v);
      if (k === "lineWidth") assert.ok(typeof v === "number" && Number.isFinite(v) && v > 0, "lineWidth inválido: " + v);
      if (k === "globalAlpha") { assert.ok(typeof v === "number" && v >= 0 && v <= 1.0000001, "globalAlpha fora de 0..1: " + v); st.maxAlpha = Math.max(st.maxAlpha, v); }
      props[k] = v; log.push("=" + k + ":" + f3(v)); return true;
    },
  });
}
function rec(fn) { const c = makeCtx(); fn(c); const st = c.__st; assert.strictEqual(st.depth, 0, "save/restore não fecham"); return { log: c.__log.join("\n"), lines: c.__log, st }; }
const colorsIn = (lines) => new Set(lines.filter((l) => l.startsWith("=fillStyle:") || l.startsWith("=strokeStyle:")).map((l) => JSON.parse(l.slice(l.indexOf(":") + 1)).toLowerCase()));
const look0 = (slot) => Skins.get(slot, "");
const skinsOf = (slot) => Skins.list(slot).filter((k) => k.id !== "");

// desenha o objeto da categoria com a skin `look` (sem look = o desenho de sempre)
const DRAW = {
  guard: (look, o = {}) => (c) => CatArt.drawDog(c, { x: 200, y: 120, dir: 1, mode: o.mode || "patrol", kind: "guard", size: o.size || "medium", idx: o.idx || 0, frozen: !!o.frozen }, { time: 1, calm: true, look }),
  tracker: (look, o = {}) => (c) => CatArt.drawDog(c, { x: 200, y: 120, dir: 1, mode: o.mode || "patrol", kind: "tracker", size: o.size || "medium", idx: o.idx || 0, frozen: !!o.frozen }, { time: 1, calm: true, look }),
  mouse: (look, o = {}) => (c) => CatArt.drawMouse(c, { x: 64, y: 96, variant: o.variant || 0 }, { time: 1, calm: true, look }),
  agile: (look, o = {}) => (c) => CatArt.drawAgileMouse(c, { x: 300, y: 200, vx: o.run === false ? 0 : 150, vy: 0, hue: o.hue || 0 }, { time: 1, calm: true, r: 8, look }),
  yarn: (look, o = {}) => (c) => CatArt.drawYarn(c, { x: 32, y: 64, kind: o.kind || "scare" }, { time: 1, calm: true, look }),
  perch: (look) => (c) => CatArt.drawPerch(c, 96, 64, { look }),
};

// ---------- o catálogo ----------
test("as 6 categorias do Gatinho estão registradas, com 3 a 4 skins além da padrão", () => {
  for (const slot of CATS) {
    assert.ok(Skins.slot(slot) && Skins.slot(slot).game === "cat", slot + ": categoria do jogo do Gatinho");
    const n = Skins.count(slot);
    assert.ok(n >= 3 && n <= 4, `${slot}: ${n} skins (precisa de 3 a 4)`);
    assert.strictEqual(Skins.list(slot)[0].id, "", slot + ": a padrão vem primeiro");
  }
});

test("só as categorias desta frente foram registradas aqui (a catexit é da outra frente, a cat vem do game.js)", () => {
  for (const slot of Skins.SLOTS.filter((s) => s.game === "cat").map((s) => s.id)) {
    if (CATS.includes(slot)) continue;
    assert.strictEqual(Skins.count(slot), 0, `${slot} não é desta frente`);
  }
});

test("preços de 10 a 30 petscoin, inteiros, em escada estritamente crescente; ids únicos e no formato", () => {
  for (const slot of CATS) {
    let prev = 0;
    for (const k of skinsOf(slot)) {
      assert.ok(Number.isInteger(k.price) && k.price >= 10 && k.price <= 30, `${slot}/${k.id}: preço ${k.price}`);
      assert.ok(k.price > prev, `${slot}/${k.id}: preço ${k.price} não é maior que o anterior (${prev})`);
      assert.ok(/^[a-z0-9-]{1,24}$/.test(k.id), `${slot}/${k.id}: id`);
      prev = k.price;
    }
    assert.strictEqual(new Set(skinsOf(slot).map((k) => k.id)).size, skinsOf(slot).length);
  }
});

test("nomes e frases em português do Brasil, simpáticos: nome curto, frase curta, a padrão com nome e frase próprios, sem nome repetido", () => {
  for (const slot of CATS) {
    const all = Skins.list(slot);
    for (const k of all) {
      assert.ok(typeof k.name === "string" && k.name.trim().length >= 3 && k.name.length <= 30, `${slot}/${k.id}: nome "${k.name}"`);
      assert.ok(typeof k.text === "string" && k.text.trim().length >= 10 && k.text.length <= 70, `${slot}/${k.id}: frase "${k.text}"`);
      assert.ok(/[a-zà-ú]/i.test(k.name) && !/[<>{}]/.test(k.name + k.text), `${slot}/${k.id}: texto limpo`);
    }
    assert.notStrictEqual(all[0].name, "Padrão", slot + ": a padrão tem nome próprio");
    assert.ok(/grátis/.test(all[0].text), slot + ": a frase da padrão diz que é grátis");
    assert.strictEqual(new Set(all.map((k) => k.name)).size, all.length, slot + ": nomes repetidos");
  }
});

test("sem nome de raça nas skins de objeto, sem marca e sem violência", () => {
  const banned = /(poodle|labrador|bulldog|pitbull|pit bull|pastor|dálmata|dalmata|chihuahua|husky|golden|beagle|siam[eê]s|persa|angor[aá]|bengal|vira-?lata|pug\b|rottweiler|dachshund|salsicha|boxer|collie|maltês|maltes|yorkshire|shih|terrier|spitz|lulu|schnauzer|akita|fox|mickey|disney|nike|pokémon|pokemon|matar|morte|sangue|arma\b|morde|mordida|bater|violên)/i;
  for (const slot of CATS) for (const k of Skins.list(slot)) assert.ok(!banned.test(k.name + " " + k.text), `${slot}/${k.id}: "${k.name} ${k.text}"`);
});

test("cada campo visual usado está documentado no comentário do topo de js/skins-cat.js, e só aparecem campos de uma lista fechada por categoria", () => {
  const ALLOWED = {
    guard: ["collar", "tag", "acc", "pat", "c1", "c2"], tracker: ["collar", "tag", "acc", "pat", "c1", "c2"],
    mouse: ["coats", "acc", "c1", "c2"], agile: ["coats", "acc", "c1", "c2"], yarn: ["pat"], perch: ["style", "top", "face", "edge", "acc1", "acc2"],
  };
  const STD = new Set(["id", "name", "text", "price", "from"]);
  for (const slot of CATS) for (const k of skinsOf(slot)) for (const f of Object.keys(k)) {
    if (STD.has(f)) continue;
    assert.ok(ALLOWED[slot].includes(f), `${slot}/${k.id}: campo "${f}" fora da lista da categoria`);
    assert.ok(new RegExp(`\\b${f}\\b`).test(head), `${slot}/${k.id}: campo "${f}" não está documentado no topo de js/skins-cat.js`);
  }
  for (const w of ["guard", "mouse", "yarn", "agile", "perch", "tracker"]) assert.ok(new RegExp(`\\b${w}\\b`).test(head), "o topo cita " + w);
});

test("as cores dos campos visuais são válidas (#rrggbb ou rgba) e as listas têm o tamanho certo", () => {
  const colorFields = ["collar", "tag", "c1", "c2", "top", "face", "edge", "acc1", "acc2"];
  for (const slot of CATS) for (const k of skinsOf(slot)) {
    for (const f of colorFields) if (k[f] !== undefined) assert.ok((f === "collar" && k[f] === "rainbow") || COLOR.test(k[f]), `${slot}/${k.id}.${f}: ${k[f]}`);
    if (k.coats) {
      assert.ok(Array.isArray(k.coats) && k.coats.length >= 1 && k.coats.length <= (slot === "agile" ? 4 : 3), `${slot}/${k.id}: tamanho de coats`);
      for (const c of k.coats) {
        if (slot === "agile") assert.ok(HEX.test(c), `${slot}/${k.id}: cor ${c}`);
        else for (const f of ["fur", "dark", "belly", "ear", "eye"]) assert.ok(HEX.test(c[f]), `${slot}/${k.id}.coats.${f}: ${c[f]}`);
      }
    }
  }
  assert.ok(skinsOf("guard").every((k) => k.acc === undefined || ["bandana", "bowtie", "hat", "bow"].includes(k.acc)));
  assert.ok(skinsOf("tracker").every((k) => k.acc === undefined || ["bandana", "bowtie", "hat", "bow"].includes(k.acc)));
  assert.ok(skinsOf("mouse").every((k) => k.acc === undefined || ["scarf", "cap"].includes(k.acc)));
  assert.ok(skinsOf("agile").every((k) => k.acc === undefined || ["cap", "bow", "band"].includes(k.acc)));
  assert.ok(skinsOf("yarn").every((k) => ["stripes", "dots", "hearts", "rainbow"].includes(k.pat)));
  assert.ok(skinsOf("perch").every((k) => ["wood", "cushion", "castle", "tree"].includes(k.style)));
});

test("ratinhos e camundongos ágeis: pelo CLARO em todas as skins (continuam legíveis nos mapas escuros da noite, Fases 18 e 19)", () => {
  const MIN = 0.45; // o ratinho marrom de sempre (#a8744a) tem 0,49 e o cinza 0,6
  for (const k of skinsOf("mouse")) for (const c of k.coats || []) assert.ok(lum(c.fur) >= MIN && lum(c.belly) >= MIN, `mouse/${k.id}: pelo escuro demais (${lum(c.fur).toFixed(2)})`);
  for (const k of skinsOf("agile")) for (const c of k.coats || []) assert.ok(lum(c) >= 0.6, `agile/${k.id}: pelo escuro demais (${lum(c).toFixed(2)})`); // (os de sempre têm 0,8 ou mais)
  assert.ok(lum("#a8744a") >= MIN && lum("#d3d7de") >= 0.6, "sanidade da medida");
});

// ---------- o desenho ----------
test("CatArt: drawPerch e as funções com `look` existem; sem look (ou com a skin padrão) o desenho é EXATAMENTE o de sempre", () => {
  for (const n of ["drawDog", "drawMouse", "drawAgileMouse", "drawYarn", "drawPerch"]) assert.strictEqual(typeof CatArt[n], "function", n);
  for (const slot of ["guard", "tracker", "mouse", "agile", "yarn"]) {
    for (const o of [{}, { mode: "chase" }, { mode: "flee" }, { frozen: true }, { run: false }, { variant: 2 }, { kind: "gold" }, { kind: "magnet" }]) {
      const plain = rec(DRAW[slot](undefined, o)).log;
      assert.strictEqual(rec(DRAW[slot](look0(slot), o)).log, plain, `${slot} ${JSON.stringify(o)}: a skin padrão desenhou diferente`);
      assert.strictEqual(rec(DRAW[slot]({}, o)).log, plain, `${slot}: um look vazio desenhou diferente`);
      assert.strictEqual(rec(DRAW[slot](null, o)).log, plain);
    }
  }
  assert.strictEqual(CatArt.drawPerch(makeCtx(), 0, 0, { look: look0("perch") }), false, "o lugar alto padrão não desenha nada (o ambiente desenha)");
  assert.strictEqual(CatArt.drawPerch(makeCtx(), 0, 0), false);
  assert.strictEqual(CatArt.drawPerch(null, 0, 0, { look: { style: "wood" } }), false);
  assert.strictEqual(CatArt.drawPerch(makeCtx(), 0, 0, { look: { style: "nao-existe" } }), false);
});

test("cada skin desenha diferente da padrão e das outras da mesma categoria (em todas as poses)", () => {
  const POSES = {
    guard: [{}, { mode: "chase" }, { mode: "flee" }, { mode: "search" }, { frozen: true }, { size: "large", idx: 3 }], tracker: [{}, { mode: "chase" }, { mode: "flee" }, { mode: "search" }, { frozen: true }, { size: "small", idx: 2 }],
    mouse: [{ variant: 0 }, { variant: 1 }, { variant: 2 }], agile: [{ run: true, hue: 0 }, { run: false, hue: 0 }, { run: true, hue: 3 }, { run: false, hue: 2 }],
    yarn: [{ kind: "scare" }, { kind: "gold" }, { kind: "ice" }, { kind: "turbo" }, { kind: "magnet" }], perch: [{}],
  };
  for (const slot of CATS) for (const o of POSES[slot]) {
    const base = rec(DRAW[slot](look0(slot), o)).log, seen = new Map([[base, "padrão"]]);
    for (const k of skinsOf(slot)) {
      // (a skin de acessório em ratinho 'variant' ou camundongo de outra cor que só troque a cor pode coincidir em poses sem esse campo: aqui cada skin tem de diferir da padrão)
      const r = rec(DRAW[slot](k, o)).log;
      assert.ok(r !== base || slot === "perch" && base === "", `${slot}/${k.id} ${JSON.stringify(o)}: igual à padrão`);
      assert.ok(!seen.has(r), `${slot}/${k.id} ${JSON.stringify(o)}: igual a ${seen.get(r)}`);
      seen.set(r, k.id);
    }
  }
});

test("o desenho é determinístico e com `calm` não depende do tempo, com qualquer skin", () => {
  for (const slot of CATS) for (const k of skinsOf(slot)) assert.strictEqual(rec(DRAW[slot](k)).log, rec(DRAW[slot](k)).log, `${slot}/${k.id}: duas vezes, resultados diferentes`);
  // calm: o mesmo pedido em dois instantes desenha a mesma coisa
  const sk = { guard: skinsOf("guard")[2], mouse: skinsOf("mouse")[2], agile: skinsOf("agile")[1], yarn: skinsOf("yarn")[0] };
  for (const t of [0, 1.7, 9.3]) {
    assert.strictEqual(rec((c) => CatArt.drawDog(c, { x: 5, y: 5, kind: "guard", mode: "chase" }, { time: t, calm: true, look: sk.guard })).log, rec((c) => CatArt.drawDog(c, { x: 5, y: 5, kind: "guard", mode: "chase" }, { time: 0, calm: true, look: sk.guard })).log);
    assert.strictEqual(rec((c) => CatArt.drawMouse(c, { x: 5, y: 5 }, { time: t, calm: true, look: sk.mouse })).log, rec((c) => CatArt.drawMouse(c, { x: 5, y: 5 }, { time: 0, calm: true, look: sk.mouse })).log);
    assert.strictEqual(rec((c) => CatArt.drawAgileMouse(c, { x: 5, y: 5, vx: 99 }, { time: t, calm: true, look: sk.agile })).log, rec((c) => CatArt.drawAgileMouse(c, { x: 5, y: 5, vx: 99 }, { time: 0, calm: true, look: sk.agile })).log);
    assert.strictEqual(rec((c) => CatArt.drawYarn(c, { x: 5, y: 5, kind: "ice" }, { time: t, calm: true, look: sk.yarn })).log, rec((c) => CatArt.drawYarn(c, { x: 5, y: 5, kind: "ice" }, { time: 0, calm: true, look: sk.yarn })).log);
  }
  // sem calm o tempo mexe (a pose animada continua animada com skin)
  assert.notStrictEqual(rec((c) => CatArt.drawMouse(c, { x: 5, y: 5 }, { time: 0.3, look: sk.mouse })).log, rec((c) => CatArt.drawMouse(c, { x: 5, y: 5 }, { time: 0.9, look: sk.mouse })).log);
});

test("a skin não muda o tamanho do objeto: a caixa do desenho cresce no máximo o enfeite (hat/laço no alto, lenço embaixo), nunca o corpo", () => {
  const GROW = { guard: 16, tracker: 12, mouse: 5, agile: 6, yarn: 0.5 }; // px a mais, no máximo, em cada direção (o chapéu de festa é o maior enfeite)
  for (const slot of Object.keys(GROW)) for (const k of skinsOf(slot)) for (const o of [{}, { mode: "chase" }, { mode: "flee" }, { run: false }]) {
    const a = rec(DRAW[slot](look0(slot), o)).st, b = rec(DRAW[slot](k, o)).st;
    const g = GROW[slot];
    assert.ok(b.minX >= a.minX - g && b.maxX <= a.maxX + g && b.minY >= a.minY - g && b.maxY <= a.maxY + g, `${slot}/${k.id} ${JSON.stringify(o)}: caixa [${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]×[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}] contra a padrão [${a.minX.toFixed(1)},${a.maxX.toFixed(1)}]×[${a.minY.toFixed(1)},${a.maxY.toFixed(1)}]`);
  }
});

test("lugares altos: cada estilo cabe no tile de 32×32, tem topo, sombra e contorno, e nenhum desenha igual a outro", () => {
  const seen = new Set();
  for (const k of skinsOf("perch")) {
    const r = rec(DRAW.perch(k)), st = r.st;
    assert.ok(st.minX >= 96 - 0.01 && st.maxX <= 96 + 32 + 0.01 && st.minY >= 64 - 0.01 && st.maxY <= 64 + 32 + 0.01, `perch/${k.id}: passa do tile (${st.minX - 96}, ${st.minY - 64}) a (${st.maxX - 96}, ${st.maxY - 64})`);
    assert.ok(st.maxX - st.minX >= 24 && st.maxY - st.minY >= 24, `perch/${k.id}: pequeno demais`);
    assert.ok(r.lines.some((l) => /rgba\(0,0,0,\.1[37]\)/.test(l)), `perch/${k.id}: sem a sombra comprida`);
    assert.ok(!seen.has(r.log)); seen.add(r.log);
  }
  // as cores de um campo são aplicadas (o estilo aceita a paleta da skin)
  const custom = rec(DRAW.perch({ style: "wood", top: "#123456", face: "#654321" }));
  assert.ok(colorsIn(custom.lines).has("#123456") && colorsIn(custom.lines).has("#654321"));
  assert.ok(rec(DRAW.perch({ style: "wood", top: "azul" })).lines.length > 10, "cor inválida: usa a de sempre, sem erro");
});

test("os 5 poderes do novelo: a cor-chave é a mesma em qualquer skin (e a tabela de cores não muda)", () => {
  const KEYS = { // escrita aqui à mão, de propósito: mudar uma cor-chave em js/cat-art.js quebra este teste
    scare: { fill: "#ff8f8a", strand: "#d94b4b", hi: "#ffd0cc", glow: null }, gold: { fill: "#ffd23f", strand: "#c4900c", hi: "#fff2b0", glow: "rgba(255,210,63,.36)" },
    ice: { fill: "#bfeaff", strand: "#4f9fd0", hi: "#ffffff", glow: "rgba(120,200,255,.36)" }, turbo: { fill: "#ff9f43", strand: "#c2570c", hi: "#ffd9a8", glow: "rgba(255,120,40,.36)" },
    magnet: { fill: "#cfa8ff", strand: "#8a4fd1", hi: "#efe0ff", glow: "rgba(190,130,255,.4)" },
  };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(CatArt.YARN_KEYS)), KEYS);
  assert.ok(Object.isFrozen(CatArt.YARN_KEYS) && Object.isFrozen(CatArt.YARN_KEYS.gold));
  for (const k of skinsOf("yarn")) for (const bad of ["fill", "strand", "hi", "glow", "kind", "mark", "color", "hue"]) assert.ok(!(bad in k), `yarn/${k.id}: a skin não pode ter "${bad}" (cor-chave do poder)`);
  for (const kind of Object.keys(KEYS)) {
    const def = rec(DRAW.yarn(look0("yarn"), { kind }));
    const cut = (lines) => lines.slice(lines.map((l) => l.startsWith("rotate(")).lastIndexOf(true)).join("\n"); // da última rotação em diante: a marquinha do poder (estrela, floco, raio, ímã)
    if (kind !== "scare") assert.ok(cut(def.lines).length > 20, kind + ": sanidade do corte da marquinha"); // (o novelo comum não tem marquinha)
    for (const k of skinsOf("yarn")) {
      const r = rec(DRAW.yarn(k, { kind }));
      for (const col of [KEYS[kind].fill, KEYS[kind].strand, KEYS[kind].hi, KEYS[kind].glow].filter(Boolean)) assert.ok(colorsIn(r.lines).has(col.toLowerCase()), `yarn/${k.id} ${kind}: sumiu a cor-chave ${col}`);
      assert.strictEqual(cut(r.lines), cut(def.lines), `yarn/${k.id} ${kind}: a marquinha do poder mudou`);
      // as cores do bicho de cada tipo continuam sendo só as do tipo, mais o branco e as cores pequenas da estampa
      const own = new Set([KEYS[kind].fill, KEYS[kind].strand, KEYS[kind].hi, KEYS[kind].glow].filter(Boolean).map((c) => c.toLowerCase()));
      const other = Object.keys(KEYS).filter((x) => x !== kind).flatMap((x) => [KEYS[x].fill, KEYS[x].strand].map((c) => c.toLowerCase()));
      for (const c of other) assert.ok(!colorsIn(r.lines).has(c) || own.has(c), `yarn/${k.id} ${kind}: usa a cor-chave de outro poder (${c})`);
    }
  }
});

test("estados dos cães: afugentado e congelado continuam tingidos com qualquer skin (as cores da skin passam pelo mesmo tom)", () => {
  for (const slot of ["guard", "tracker"]) for (const k of skinsOf(slot)) {
    const normal = rec(DRAW[slot](k, {})).lines, flee = rec(DRAW[slot](k, { mode: "flee" })).lines, ice = rec(DRAW[slot](k, { frozen: true })).lines;
    const baseFlee = colorsIn(rec(DRAW[slot](look0(slot), { mode: "flee" })).lines), baseIce = colorsIn(rec(DRAW[slot](look0(slot), { frozen: true })).lines), baseNormal = colorsIn(rec(DRAW[slot](look0(slot), {})).lines);
    const own = [k.collar, k.c1, k.c2, k.tag].filter((c) => typeof c === "string" && HEX.test(c)).map((c) => c.toLowerCase()).filter((c) => !baseNormal.has(c)); // (cores só da skin: o branco, por exemplo, também aparece nos olhos)
    assert.ok(own.length > 0 || k.collar === "rainbow", `${slot}/${k.id}: sem cor própria para conferir`);
    for (const c of own) { assert.ok(colorsIn(normal).has(c), `${slot}/${k.id}: a cor ${c} não aparece normal`); assert.ok(!colorsIn(ice).has(c) && !baseIce.has(c), `${slot}/${k.id}: a cor ${c} não foi tingida no gelo`); assert.ok(!colorsIn(flee).has(c) && !baseFlee.has(c), `${slot}/${k.id}: a cor ${c} não foi tingida afugentado`); }
    if (k.collar === "rainbow") for (const c of ["#e8403a", "#ffc83d", "#4fb85a", "#3f86e0"]) assert.ok(colorsIn(normal).has(c) && !colorsIn(ice).has(c) && !colorsIn(flee).has(c), `${slot}/${k.id}: faixa ${c}`);
  }
});

test("o código-fonte de js/skins-cat.js: nada de Math.random, relógio nem página; só Skins.register", () => {
  assert.ok(!/Math\.random|Date\.|performance\.|document\.|window\.|localStorage/.test(src.replace(/\/\/.*$/gm, "")));
  assert.strictEqual((src.match(/Skins\.register\(/g) || []).length, 6);
});

console.log(failed ? `\n${failed} teste(s) falharam` : "\nTodos os testes de js/skins-cat.js passaram");
process.exit(failed ? 1 : 0);
