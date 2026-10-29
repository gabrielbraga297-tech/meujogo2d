// Testes das SKINS DOS OBJETOS DO PASSARINHO (0.20.0), sem navegador. Uso: node tests/skins-bird.test.js
// Confere o catálogo de js/skins-bird.js (8 categorias: seed, stray, birdexit, berry, bug, roost, gust, hawk: exatamente 4 skins cada, além da padrão, preços de 10 a 30 em escada, nomes e frases em português,
// campos visuais documentados e válidos) e o desenho de js/bird-art.js com cada skin (contexto 2D falso e rigoroso, como em tests/skins-cat.test.js): o padrão não muda, cada skin desenha diferente,
// nada passa do tamanho do objeto, os 5 frutos mantêm a cor-chave e a marquinha, o ninho continua verde aberto e vermelho fechado, e as sementes, as minhocas, os gatos e os gaviões continuam claros (legíveis na noite).
// A categoria do jogador ("bird": as 12 skins de BirdArt.SKINS) é registrada em js/game.js; os ventos (gust) são desenhados pelos ambientes (js/bird-themes.js): aqui se confere os campos deles e, quando o arquivo existe, o desenho.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

global.Skins = require(path.join(__dirname, "../js/skins.js"));
const BirdArt = require(path.join(__dirname, "../js/bird-art.js"));
const FILE = path.join(__dirname, "../js/skins-bird.js");
require(FILE);
const Skins = global.Skins;

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const CATS = ["seed", "stray", "birdexit", "berry", "bug", "roost", "gust", "hawk"];
const src = fs.readFileSync(FILE, "utf8");
const head = src.slice(0, src.indexOf("(function ()")); // o comentário do topo, onde os campos visuais ficam documentados
const COLOR = /^#[0-9a-f]{6}$/i; // cor de campo da skin (só #rrggbb: é o que a arte e os ambientes leem)
const CTXCOLOR = /^(#[0-9a-f]{6}|#[0-9a-f]{3}|rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+|1\.0+)\s*\))$/i; // cor que o canvas aceita
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
  stray: (look, o = {}) => (c) => BirdArt.drawFoeCat(c, { x: 200, y: 120, dir: 1, mode: o.mode || "patrol", size: o.size || "medium", idx: o.idx || 0, frozen: !!o.frozen }, { time: 1, calm: true, look }),
  hawk: (look, o = {}) => (c) => BirdArt.drawHawk(c, { x: 200, y: 120, dir: 1, mode: o.mode || "patrol", idx: o.idx || 0, frozen: !!o.frozen, diving: !!o.diving }, { time: 1, calm: true, look }),
  seed: (look, o = {}) => (c) => BirdArt.drawSeed(c, { x: 32, y: 64, variant: o.variant || 0 }, { time: 1, calm: true, look }),
  bug: (look, o = {}) => (c) => BirdArt.drawWorm(c, { x: 64, y: 96, vx: o.run ? 150 : o.vx || 1, vy: 0, hue: o.hue || 0 }, { time: 1, calm: true, r: 8, hidden: !!o.hidden, look }),
  berry: (look, o = {}) => (c) => BirdArt.drawFruit(c, { x: 32, y: 64, kind: o.kind || "scare" }, { time: 1, calm: true, look }),
  roost: (look) => (c) => BirdArt.drawRoost(c, 96, 64, { look }),
  birdexit: (look, o = {}) => (c) => BirdArt.drawNest(c, 96, 64, { open: o.open !== false, w: o.w || 96, h: o.h || 32, time: 1, calm: true, look }),
};

// ---------- o catálogo ----------
test("as 8 categorias de objetos do Passarinho estão registradas, cada uma com exatamente 4 skins além da padrão (5 com a padrão)", () => {
  for (const slot of CATS) {
    assert.ok(Skins.slot(slot) && Skins.slot(slot).game === "bird", slot + ": categoria do jogo do Passarinho");
    const n = Skins.count(slot);
    assert.strictEqual(n, 4, `${slot}: ${n} skins além da padrão (precisam ser 4)`);
    assert.strictEqual(Skins.list(slot).length, 5, `${slot}: com a padrão são 5`);
    assert.strictEqual(Skins.list(slot)[0].id, "", slot + ": a padrão vem primeiro");
  }
  assert.strictEqual(CATS.reduce((a, s) => a + Skins.count(s), 0), 32, "8 categorias × 4 = 32 skins");
});

test("js/skins-bird.js registra só as 8 categorias dos objetos (a categoria do jogador, bird, vem do game.js com as skins de BirdArt.SKINS)", () => {
  for (const slot of Skins.SLOTS.filter((s) => s.game === "bird").map((s) => s.id)) {
    if (CATS.includes(slot)) continue;
    assert.strictEqual(slot, "bird");
    assert.strictEqual(Skins.count(slot), 0, `${slot} não é registrada por js/skins-bird.js`);
  }
  assert.deepStrictEqual(Skins.slotsOf("bird").map((s) => s.id), ["bird", "seed", "stray", "birdexit", "berry", "bug", "roost", "gust", "hawk"], "as 9 categorias do jogo, na ordem do catálogo");
  assert.strictEqual(Skins.slotsOf("bird").filter((s) => s.player).length, 1, "uma só categoria do jogador");
  assert.strictEqual(Skins.slot("bird").from, 1);
  assert.strictEqual(Skins.slot("bird").player, true);
  assert.strictEqual(Skins.GAMES.find((g) => g.id === "bird").ready, true);
});

test("a categoria do jogador (BirdArt.SKINS) tem 11 skins pagas, de 10 a 50, em escada, que o game.js registra tal como a arte as define", () => {
  const S = BirdArt.SKINS;
  assert.strictEqual(S.length, 12);
  assert.strictEqual(S[0].id, "");
  Skins.register("bird", S.slice(1), { name: S[0].name, text: S[0].text }); // (o mesmo que js/game.js faz: sem erro = dentro do contrato do catálogo)
  assert.strictEqual(Skins.count("bird"), 11);
  let prev = 0;
  for (const k of S.slice(1)) { assert.ok(k.price >= 10 && k.price <= 50 && k.price > prev, `bird/${k.id}: preço ${k.price}`); prev = k.price; }
  assert.strictEqual(Skins.list("bird")[0].name, "Marrom");
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
    assert.strictEqual(new Set(all.map((k) => k.text)).size, all.length, slot + ": frases repetidas");
  }
});

test("os nomes das categorias, no singular e no plural, estão em português certo", () => {
  const want = { bird: ["Passarinho", "o passarinho"], seed: ["Sementes", "as sementes"], stray: ["Gatos de jardim", "os gatos de jardim"], birdexit: ["Ninho (saída)", "o ninho da saída"], berry: ["Frutos", "os frutos"], bug: ["Minhocas", "as minhocas"], roost: ["Poleiros", "os poleiros"], gust: ["Ventos", "os ventos"], hawk: ["Gaviões", "os gaviões"] };
  for (const [id, [name, singular]] of Object.entries(want)) { assert.strictEqual(Skins.slot(id).name, name, id); assert.strictEqual(Skins.slot(id).singular, singular, id); }
  assert.ok(/^[a-z]{2,12}$/.test("birdexit") && new Set(Skins.SLOTS.map((s) => s.id)).size === Skins.SLOTS.length, "ids únicos no catálogo inteiro");
});

test("sem nome de espécie nem de raça nas skins (o Passarinho é genérico), sem marca e sem violência", () => {
  const banned = /(poodle|labrador|bulldog|pitbull|pit bull|pastor|dálmata|dalmata|chihuahua|husky|golden|beagle|siam[eê]s|persa|angor[aá]|bengal|vira-?lata|rottweiler|collie|terrier|bem-te-vi|sabi[aá]|can[aá]rio|tucano|beija-flor|pardal|arara|papagaio|periquito|calopsita|coruj|[aá]guia|falc[aã]o|carcar[aá]|harpia|gavi[aã]o-|pomb|andorinha|joão-de-barro|mickey|disney|nike|pokémon|pokemon|matar|morte|sangue|arma\b|morde|mordida|bater|ataca|violên|ca[cç]a)/i;
  for (const slot of CATS) for (const k of Skins.list(slot)) assert.ok(!banned.test(k.name + " " + k.text), `${slot}/${k.id}: "${k.name} ${k.text}"`);
});

test("cada campo visual usado está documentado no comentário do topo de js/skins-bird.js, e só aparecem campos de uma lista fechada por categoria", () => {
  const ALLOWED = {
    seed: ["coats", "glow"], stray: ["coats", "collar", "tag", "acc", "pat", "c1", "c2"], birdexit: ["deco", "mark"], berry: ["pat"], bug: ["coats", "acc", "c1", "c2"],
    roost: ["style", "top", "face", "edge", "acc1", "acc2"], gust: ["style", "c1", "c2"], hawk: ["coats", "acc", "c1", "c2"],
  };
  const STD = new Set(["id", "name", "text", "price", "from"]);
  for (const slot of CATS) for (const k of skinsOf(slot)) for (const f of Object.keys(k)) {
    if (STD.has(f)) continue;
    assert.ok(ALLOWED[slot].includes(f), `${slot}/${k.id}: campo "${f}" fora da lista da categoria`);
    assert.ok(new RegExp(`\\b${f}\\b`).test(head), `${slot}/${k.id}: campo "${f}" não está documentado no topo de js/skins-bird.js`);
  }
  for (const w of CATS) assert.ok(new RegExp(`\\b${w}\\b`).test(head), "o topo cita " + w);
  for (const slot of CATS) for (const f of ALLOWED[slot]) assert.ok(new RegExp(`\\b${f}\\b`).test(head), `o topo documenta ${slot}.${f}`);
});

test("a skin padrão de cada categoria não tem campo visual nenhum, e as skins são só texto e números (nada de função, marcação ou endereço)", () => {
  for (const slot of CATS) assert.deepStrictEqual(Object.keys(look0(slot)).sort(), ["id", "name", "price", "text"], `${slot}: a padrão só tem id, nome, frase e preço`);
  const walk = (v, where) => {
    if (typeof v === "function") assert.fail(`${where}: função`);
    if (typeof v === "string") assert.ok(!/<|>|https?:|javascript:|url\(/i.test(v), `${where}: "${v}"`);
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${where}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  for (const slot of CATS) for (const k of skinsOf(slot)) walk(k, `${slot}/${k.id}`);
});

test("as cores dos campos visuais são válidas (#rrggbb) e as listas e os valores fechados têm o tamanho e o conteúdo certos", () => {
  const colorFields = ["collar", "tag", "c1", "c2", "top", "face", "edge", "acc1", "acc2", "glow", "mark"];
  for (const slot of CATS) for (const k of skinsOf(slot)) {
    for (const f of colorFields) if (k[f] !== undefined) assert.ok((f === "collar" && k[f] === "rainbow") || COLOR.test(k[f]), `${slot}/${k.id}.${f}: ${k[f]}`);
    if (k.coats) {
      const FIELDS = { seed: ["body", "stripe", "hi"], stray: ["fur", "dark", "light", "eye"], bug: ["body", "belly", "band"], hawk: ["fur", "dark", "light", "wing"] }[slot], MAX = { seed: 3, stray: 4, bug: 4, hawk: 3 }[slot];
      assert.ok(Array.isArray(k.coats) && k.coats.length >= 1 && k.coats.length <= MAX, `${slot}/${k.id}: tamanho de coats`);
      for (const c of k.coats) { assert.deepStrictEqual(Object.keys(c).sort(), [...FIELDS].sort(), `${slot}/${k.id}: campos de cada pelagem`); for (const f of FIELDS) assert.ok(COLOR.test(c[f]), `${slot}/${k.id}.coats.${f}: ${c[f]}`); }
    }
  }
  const only = (slot, f, list) => assert.ok(skinsOf(slot).every((k) => k[f] === undefined || list.includes(k[f])), `${slot}.${f}`);
  only("stray", "acc", ["bandana", "bowtie", "hat", "bow"]); only("stray", "pat", ["dots", "check"]); only("hawk", "acc", ["scarf", "hat", "bow", "band"]); only("bug", "acc", ["cap", "bow", "scarf"]);
  only("birdexit", "deco", ["stripes", "rainbow", "stars", "frame"]); only("berry", "pat", ["stripes", "dots", "hearts", "stars"]); only("roost", "style", ["branch", "bamboo", "swing", "house"]); only("gust", "style", ["ribbons", "dashes", "puffs"]);
  assert.ok(skinsOf("berry").every((k) => k.pat), "toda skin de fruto tem estampa");
  assert.ok(skinsOf("roost").every((k) => k.style), "todo poleiro tem estilo (sem estilo o jogo usa o galho do ambiente)");
  assert.ok(skinsOf("gust").every((k) => k.style && k.c1 && k.c2), "todo vento tem estilo e as duas cores");
  assert.deepStrictEqual(skinsOf("roost").map((k) => k.style).sort(), ["bamboo", "branch", "house", "swing"], "os 4 estilos de poleiro, um em cada skin");
  assert.deepStrictEqual(skinsOf("birdexit").map((k) => k.deco).sort(), ["frame", "rainbow", "stars", "stripes"], "as 4 ideias das saídas dos outros jogos, no ninho");
});

test("sementes, minhocas, gatos e gaviões: pelo e penas CLAROS em todas as skins (continuam legíveis nos mapas escuros da noite, Fases 18 e 19)", () => {
  // as medidas de sempre: sementes 0,69 a 0,93 · minhocas 0,70 a 0,84 · gatos de quintal 0,69 a 0,95 · gaviões (pelagem) 0,47 e asa 0,37 (a pena escura de propósito é a ponta, `dark`)
  for (const k of skinsOf("seed")) for (const c of k.coats) assert.ok(lum(c.body) >= 0.6 && lum(c.hi) >= 0.8, `seed/${k.id}: semente escura demais (${lum(c.body).toFixed(2)})`);
  for (const k of skinsOf("bug")) for (const c of k.coats || []) assert.ok(lum(c.body) >= 0.6 && lum(c.belly) >= 0.75, `bug/${k.id}: minhoca escura demais (${lum(c.body).toFixed(2)})`);
  for (const k of skinsOf("stray")) for (const c of k.coats || []) assert.ok(lum(c.fur) >= 0.6 && lum(c.light) >= 0.85, `stray/${k.id}: gato escuro demais (${lum(c.fur).toFixed(2)})`);
  for (const k of skinsOf("hawk")) for (const c of k.coats || []) assert.ok(lum(c.fur) >= 0.45 && lum(c.light) >= 0.85 && lum(c.wing) >= 0.35, `hawk/${k.id}: gavião escuro demais (${lum(c.fur).toFixed(2)})`);
  assert.ok(lum("#a1714a") >= 0.45 && lum("#82583a") >= 0.35 && lum("#f1a652") >= 0.6, "sanidade da medida");
});

// ---------- o desenho ----------
test("BirdArt: as funções com `look` existem; sem look (ou com a skin padrão) o desenho é EXATAMENTE o de sempre", () => {
  for (const n of ["drawFoeCat", "drawHawk", "drawSeed", "drawWorm", "drawFruit", "drawRoost", "drawNest"]) assert.strictEqual(typeof BirdArt[n], "function", n);
  for (const slot of ["stray", "hawk", "seed", "bug", "berry", "birdexit"]) {
    for (const o of [{}, { mode: "chase" }, { mode: "flee" }, { frozen: true }, { hidden: true }, { run: true }, { variant: 2 }, { hue: 3 }, { kind: "gold" }, { kind: "magnet" }, { open: false }, { w: 32, h: 96 }]) {
      const plain = rec(DRAW[slot](undefined, o)).log;
      assert.strictEqual(rec(DRAW[slot](look0(slot), o)).log, plain, `${slot} ${JSON.stringify(o)}: a skin padrão desenhou diferente`);
      assert.strictEqual(rec(DRAW[slot]({}, o)).log, plain, `${slot}: um look vazio desenhou diferente`);
      assert.strictEqual(rec(DRAW[slot](null, o)).log, plain);
    }
  }
  assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0, { look: look0("roost") }), false, "o poleiro padrão não desenha nada (o ambiente desenha o galho)");
  assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0), false);
  assert.strictEqual(BirdArt.drawRoost(null, 0, 0, { look: { style: "branch" } }), false);
  assert.strictEqual(BirdArt.drawRoost(makeCtx(), 0, 0, { look: { style: "nao-existe" } }), true, "um estilo desconhecido desenha o galho de sempre da arte");
});

test("cada skin desenha diferente da padrão e das outras da mesma categoria (em todas as poses em que ela aparece)", () => {
  const POSES = {
    stray: [{}, { mode: "chase" }, { mode: "flee" }, { mode: "search" }, { frozen: true }, { size: "large", idx: 3 }], hawk: [{}, { mode: "chase" }, { mode: "search" }, { frozen: true }, { diving: true }, { idx: 2 }],
    seed: [{ variant: 0 }, { variant: 1 }, { variant: 2 }], bug: [{ hue: 0 }, { hue: 1 }, { hue: 2 }, { hue: 3 }, { run: true, hue: 1 }],
    berry: [{ kind: "scare" }, { kind: "gold" }, { kind: "ice" }, { kind: "turbo" }, { kind: "magnet" }], roost: [{}], birdexit: [{ open: true }, { open: false }, { w: 32, h: 96 }],
  };
  for (const slot of Object.keys(POSES)) for (const o of POSES[slot]) {
    const base = rec(DRAW[slot](look0(slot), o)).log, seen = new Map([[base, "padrão"]]);
    for (const k of skinsOf(slot)) {
      const r = rec(DRAW[slot](k, o)).log;
      assert.ok(r !== base || (slot === "roost" && base === ""), `${slot}/${k.id} ${JSON.stringify(o)}: igual à padrão`);
      assert.ok(!seen.has(r), `${slot}/${k.id} ${JSON.stringify(o)}: igual a ${seen.get(r)}`);
      seen.set(r, k.id);
    }
  }
});

test("a minhoca enterrada (só o montinho de terra) é a mesma com qualquer skin: a skin só aparece com a minhoca fora da terra", () => {
  const plain = rec(DRAW.bug(undefined, { hidden: true })).log;
  for (const k of skinsOf("bug")) assert.strictEqual(rec(DRAW.bug(k, { hidden: true })).log, plain, `bug/${k.id}: a minhoca enterrada mudou`);
});

test("o desenho é determinístico e com `calm` não depende do tempo, com qualquer skin", () => {
  for (const slot of Object.keys(DRAW)) for (const k of skinsOf(slot)) assert.strictEqual(rec(DRAW[slot](k)).log, rec(DRAW[slot](k)).log, `${slot}/${k.id}: duas vezes, resultados diferentes`);
  const at = (t, slot, k, d) => rec((c) => DRAW_T[slot](c, k, t, d)).log;
  const DRAW_T = {
    stray: (c, k, t) => BirdArt.drawFoeCat(c, { x: 5, y: 5, dir: 1, mode: "chase", size: "medium", idx: 1 }, { time: t, calm: true, look: k }),
    hawk: (c, k, t) => BirdArt.drawHawk(c, { x: 5, y: 5, dir: 1, mode: "chase", idx: 1 }, { time: t, calm: true, look: k }),
    seed: (c, k, t) => BirdArt.drawSeed(c, { x: 5, y: 5, variant: 1 }, { time: t, calm: true, look: k }),
    bug: (c, k, t) => BirdArt.drawWorm(c, { x: 5, y: 5, vx: 99, vy: 0, hue: 2 }, { time: t, calm: true, r: 8, look: k }),
    berry: (c, k, t) => BirdArt.drawFruit(c, { x: 5, y: 5, kind: "ice" }, { time: t, calm: true, look: k }),
    birdexit: (c, k, t) => BirdArt.drawNest(c, 5, 5, { open: true, time: t, calm: true, look: k }),
  };
  const pick = { stray: skinsOf("stray")[1], hawk: skinsOf("hawk")[1], seed: skinsOf("seed")[1], bug: skinsOf("bug")[2], berry: skinsOf("berry")[0], birdexit: skinsOf("birdexit")[2] };
  for (const slot of Object.keys(pick)) for (const t of [0, 1.7, 9.3]) assert.strictEqual(at(t, slot, pick[slot]), at(0, slot, pick[slot]), `${slot}: com calm o tempo ${t} mudou o desenho`);
  // sem calm o tempo mexe (a pose animada continua animada com skin)
  assert.notStrictEqual(rec((c) => BirdArt.drawWorm(c, { x: 5, y: 5, vx: 99, vy: 0, hue: 2 }, { time: 0.3, r: 8, look: pick.bug })).log, rec((c) => BirdArt.drawWorm(c, { x: 5, y: 5, vx: 99, vy: 0, hue: 2 }, { time: 0.9, r: 8, look: pick.bug })).log);
  assert.notStrictEqual(rec((c) => BirdArt.drawHawk(c, { x: 5, y: 5, dir: 1, mode: "chase", idx: 1 }, { time: 0.3, look: pick.hawk })).log, rec((c) => BirdArt.drawHawk(c, { x: 5, y: 5, dir: 1, mode: "chase", idx: 1 }, { time: 0.9, look: pick.hawk })).log);
});

test("a skin não muda o tamanho do objeto: a caixa do desenho só cresce o enfeite (chapéu, laço, gorro ou faixa), nunca o corpo", () => {
  // px a mais, no máximo, em cada direção, POR ENFEITE (medido nas poses abaixo). Toda skin sem um destes enfeites (coleira, lenço, gravata-borboleta, cachecol, pelagem, cores, estampa) não pode passar nem de 0,01 do corpo de sempre.
  const GROW = { stray: { hat: 6.5 }, hawk: { hat: 5 }, bug: { cap: 5, bow: 1.5, scarf: 1.5 } }; // (medido: chapéu do gato 5,95 · chapéu do gavião 4,52 · gorrinho da minhoca 4,16 · laço 1,06 · cachecol 1,01; lenço, coleira e faixa 0)
  const POSES = [{}, { mode: "chase" }, { mode: "flee" }, { mode: "search" }, { frozen: true }, { run: true }, { hidden: true }, { size: "large", idx: 3 }, { size: "small", idx: 2 }, { variant: 2 }, { hue: 1 }, { hue: 3 }, { kind: "gold" }, { kind: "magnet" }, { diving: true }];
  const mx = {};
  for (const slot of ["stray", "hawk", "seed", "bug"]) for (const k of skinsOf(slot)) for (const o of POSES) {
    const a = rec(DRAW[slot](look0(slot), o)).st, b = rec(DRAW[slot](k, o)).st;
    const g = ((GROW[slot] || {})[k.acc]) || 0, grew = Math.max(a.minX - b.minX, b.maxX - a.maxX, a.minY - b.minY, b.maxY - a.maxY);
    if (k.acc) mx[slot + "/" + k.acc] = Math.max(mx[slot + "/" + k.acc] || 0, grew);
    assert.ok(grew <= g + 0.01, `${slot}/${k.id} ${JSON.stringify(o)}: a caixa cresceu ${grew.toFixed(2)} px (o enfeite ${k.acc || "(nenhum)"} aceita ${g}): [${b.minX.toFixed(1)},${b.maxX.toFixed(1)}]×[${b.minY.toFixed(1)},${b.maxY.toFixed(1)}] contra a padrão [${a.minX.toFixed(1)},${a.maxX.toFixed(1)}]×[${a.minY.toFixed(1)},${a.maxY.toFixed(1)}]`);
  }
  // (os frutos ficam de fora: a estampa é desenhada dentro de um clip do fruto, que o contexto falso não recorta; o teste dos frutos confere que ela só acontece dentro do clip)
  // o limite de cada enfeite que algum skin usa é apertado de verdade: uma folga de 1,5 px a menos já reprovaria o enfeite mais largo
  for (const [key, m] of Object.entries(mx)) { const [slot, acc] = key.split("/"), lim = GROW[slot][acc] || 0; assert.ok(m > lim - 1.5 || lim <= 1, `${key}: o limite ${lim} está folgado demais (o enfeite cresce só ${m.toFixed(2)} px)`); }
});

test("poleiros: cada estilo cabe no tile de 32×32, tem topo, sombra e contorno, e nenhum desenha igual a outro", () => {
  const seen = new Set();
  for (const k of skinsOf("roost")) {
    const r = rec(DRAW.roost(k)), st = r.st;
    assert.ok(st.minX >= 96 - 0.5 && st.maxX <= 96 + 32 + 0.5 && st.minY >= 64 - 0.5 && st.maxY <= 64 + 32 + 0.5, `roost/${k.id}: passa do tile (${st.minX - 96}, ${st.minY - 64}) a (${st.maxX - 96}, ${st.maxY - 64})`);
    assert.ok(st.maxX - st.minX >= 24 && st.maxY - st.minY >= 24, `roost/${k.id}: pequeno demais`);
    assert.ok(r.lines.some((l) => /rgba\(0,0,0,\.1[37]\)/.test(l)), `roost/${k.id}: sem a sombra comprida`);
    assert.ok(r.lines.some((l) => /rgba\(255,240,180,\.32\)/.test(l)), `roost/${k.id}: sem o brilho quente do refúgio`);
    assert.ok(!seen.has(r.log)); seen.add(r.log);
  }
  // as cores de um campo são aplicadas (o estilo aceita a paleta da skin)
  const custom = rec(DRAW.roost({ style: "swing", top: "#123456", face: "#654321" }));
  assert.ok(colorsIn(custom.lines).has("#123456") && colorsIn(custom.lines).has("#654321"));
  const cherry = skinsOf("roost").find((k) => k.id === "cerejeira");
  assert.ok(colorsIn(rec(DRAW.roost(cherry)).lines).has(cherry.acc2) && colorsIn(rec(DRAW.roost(cherry)).lines).has(cherry.face), "a cerejeira usa as cores dela");
  assert.ok(rec(DRAW.roost({ style: "bamboo", top: "azul" })).lines.length > 10, "cor inválida: usa a de sempre, sem erro");
});

test("ninho da saída: continua verde aberto e vermelho fechado com qualquer skin (o enfeite só acompanha) e cabe no retângulo da saída", () => {
  for (const k of skinsOf("birdexit")) for (const bad of ["open", "closed", "fill", "glow"]) assert.ok(!(bad in k), `birdexit/${k.id}: a skin não pode ter "${bad}" (o brilho verde/vermelho é sempre o de sempre)`);
  const openGlow = (lines) => lines.filter((l) => l.startsWith("=fillStyle:")).map((l) => JSON.parse(l.slice(l.indexOf(":") + 1)).toLowerCase());
  const base = { open: openGlow(rec(DRAW.birdexit(look0("birdexit"), { open: true })).lines), closed: openGlow(rec(DRAW.birdexit(look0("birdexit"), { open: false })).lines) };
  assert.ok(base.open.includes("#3ddc84") && !base.open.includes("#e0605a") && base.closed.includes("#e0605a") && !base.closed.includes("#3ddc84"), "sanidade: o ninho de sempre é verde aberto e vermelho fechado");
  for (const k of skinsOf("birdexit")) {
    const a = openGlow(rec(DRAW.birdexit(k, { open: true })).lines), b = openGlow(rec(DRAW.birdexit(k, { open: false })).lines);
    assert.ok(a.includes("#3ddc84") && !a.includes("#e0605a"), `birdexit/${k.id}: aberto precisa ser verde`);
    assert.ok(b.includes("#e0605a") && !b.includes("#3ddc84"), `birdexit/${k.id}: fechado precisa ser vermelho`);
    for (const [w, h] of [[96, 32], [32, 96]]) for (const open of [true, false]) {
      const p = rec(DRAW.birdexit(look0("birdexit"), { open, w, h })).st, s = rec(DRAW.birdexit(k, { open, w, h })).st;
      assert.ok(s.minX >= 96 - 0.5 && s.maxX <= 96 + w + 0.5 && s.minY >= 64 - 0.5 && s.maxY <= 64 + h + 0.5, `birdexit/${k.id} ${w}×${h}: passa do retângulo da saída`);
      assert.ok(Math.abs(s.maxX - p.maxX) < 0.01 && Math.abs(s.minX - p.minX) < 0.01 && Math.abs(s.maxY - p.maxY) < 0.01 && Math.abs(s.minY - p.minY) < 0.01, `birdexit/${k.id} ${w}×${h}: a caixa do ninho mudou`);
    }
  }
});

test("estados dos gatos e dos gaviões: congelado continua tingido com qualquer skin (as cores da skin passam pelo mesmo tom)", () => {
  const IDX = [0, 1, 2, 3]; // (a pelagem de cada gato ou gavião é a de índice idx % tamanho: junta as cores de todos)
  const all = (slot, k, o) => IDX.flatMap((idx) => rec(DRAW[slot](k, { ...o, idx })).lines);
  for (const slot of ["stray", "hawk"]) for (const k of skinsOf(slot)) {
    const normal = colorsIn(all(slot, k, {})), ice = colorsIn(all(slot, k, { frozen: true }));
    const baseIce = colorsIn(all(slot, look0(slot), { frozen: true })), baseNormal = colorsIn(all(slot, look0(slot), {}));
    const own = [k.collar, k.c1, k.c2, k.tag, ...(k.coats || []).flatMap((c) => [c.fur, c.dark, c.light, c.wing])].filter((c) => typeof c === "string" && COLOR.test(c)).map((c) => c.toLowerCase()).filter((c) => !baseNormal.has(c) && c !== "#ffffff"); // (cores só da skin: o branco, por exemplo, também aparece nos olhos)
    assert.ok(own.length > 0 || k.collar === "rainbow", `${slot}/${k.id}: sem cor própria para conferir`);
    for (const c of own) { assert.ok(normal.has(c), `${slot}/${k.id}: a cor ${c} não aparece normal`); assert.ok(!ice.has(c) && !baseIce.has(c), `${slot}/${k.id}: a cor ${c} não foi tingida no gelo`); }
  }
});

test("os 5 frutos: a cor-chave é a mesma em qualquer skin (e a tabela de cores não muda)", () => {
  const KEYS = { // escrita aqui à mão, de propósito: mudar uma cor-chave em js/bird-art.js quebra este teste
    scare: { fill: "#ff5a52", strand: "#b82a2e", hi: "#ffd1c6", glow: null }, gold: { fill: "#ffd23f", strand: "#c4900c", hi: "#fff2b0", glow: "rgba(255,210,63,.36)" },
    ice: { fill: "#a7e4ff", strand: "#3f8fc8", hi: "#ffffff", glow: "rgba(120,200,255,.4)" }, turbo: { fill: "#ff9f43", strand: "#c2570c", hi: "#ffd9a8", glow: "rgba(255,120,40,.36)" },
    magnet: { fill: "#b98cf5", strand: "#7a3fc8", hi: "#eadcff", glow: "rgba(180,120,255,.4)" },
  };
  assert.deepStrictEqual(JSON.parse(JSON.stringify(BirdArt.FRUIT_KEYS)), KEYS);
  assert.ok(Object.isFrozen(BirdArt.FRUIT_KEYS) && Object.isFrozen(BirdArt.FRUIT_KEYS.gold));
  for (const k of skinsOf("berry")) for (const bad of ["fill", "strand", "hi", "glow", "kind", "mark", "color", "hue", "coats"]) assert.ok(!(bad in k), `berry/${k.id}: a skin não pode ter "${bad}" (cor-chave do poder)`);
  for (const kind of Object.keys(KEYS)) { // a estampa só é pintada dentro do clip do fruto (nunca por fora dele): tudo o que a skin acrescenta fica entre `clip()` e o `restore()` seguinte
    const A = rec(DRAW.berry(look0("berry"), { kind })).lines;
    for (const k of skinsOf("berry")) {
      const B = rec(DRAW.berry(k, { kind })).lines;
      let i = 0; while (i < A.length && A[i] === B[i]) i++;
      let j = 0; while (j < A.length - i && A[A.length - 1 - j] === B[B.length - 1 - j]) j++;
      const clip = B.indexOf("clip()"), rest = B.indexOf("restore()", clip);
      assert.ok(clip >= 0 && i >= clip && B.length - j <= rest + 1 && B.length > A.length, `berry/${k.id} ${kind}: a estampa precisa ficar dentro do clip do fruto (diferença nas linhas ${i} a ${B.length - j}, clip em ${clip}, restore em ${rest})`);
    }
  }
  for (const kind of Object.keys(KEYS)) {
    const def = rec(DRAW.berry(look0("berry"), { kind }));
    const cut = (lines) => lines.slice(lines.map((l) => l.startsWith("rotate(")).lastIndexOf(true)).join("\n"); // da última rotação em diante: a marquinha do poder (asinha, estrela, floco, raio, ímã)
    assert.ok(cut(def.lines).length > 20, kind + ": sanidade do corte da marquinha");
    for (const k of skinsOf("berry")) {
      const r = rec(DRAW.berry(k, { kind }));
      for (const col of [KEYS[kind].fill, KEYS[kind].strand, KEYS[kind].hi, KEYS[kind].glow].filter(Boolean)) assert.ok(colorsIn(r.lines).has(col.toLowerCase()), `berry/${k.id} ${kind}: sumiu a cor-chave ${col}`);
      assert.strictEqual(cut(r.lines), cut(def.lines), `berry/${k.id} ${kind}: a marquinha do poder mudou`);
      // as cores de cada tipo continuam sendo só as do tipo, mais o branco e as cores pequenas da estampa
      const own = new Set([KEYS[kind].fill, KEYS[kind].strand, KEYS[kind].hi, KEYS[kind].glow].filter(Boolean).map((c) => c.toLowerCase()));
      const other = Object.keys(KEYS).filter((x) => x !== kind).flatMap((x) => [KEYS[x].fill, KEYS[x].strand].map((c) => c.toLowerCase()));
      for (const c of other) assert.ok(!colorsIn(r.lines).has(c) || own.has(c), `berry/${k.id} ${kind}: usa a cor-chave de outro poder (${c})`);
    }
  }
});

test("ventos: só estilo e cor de fitas, tracinhos ou bolinhas; os ambientes (js/bird-themes.js), quando existem, desenham cada skin diferente e o vento de sempre sem skin", () => {
  assert.deepStrictEqual(skinsOf("gust").map((k) => k.style).filter((x, i, a) => a.indexOf(x) === i).sort(), ["dashes", "puffs", "ribbons"], "os 3 estilos que o ambiente sabe desenhar");
  for (const k of skinsOf("gust")) for (const bad of ["dx", "dy", "speed", "force", "dir", "kind", "push"]) assert.ok(!(bad in k), `gust/${k.id}: a skin não pode ter "${bad}" (direção e força são do jogo)`);
  const file = path.join(__dirname, "../js/bird-themes.js");
  if (!fs.existsSync(file)) { console.log("     (js/bird-themes.js ainda não existe nesta árvore: só os campos foram conferidos)"); return; }
  const BT = require(file); // (os ambientes registram os 20 em js/bird-themes-1.js e -2.js; aqui basta o desenho do vento: helpers.windOverlay)
  const wind = (look, kind) => rec((c) => BT.helpers.windOverlay({ ctx: c, x: 64, y: 64, c: 2, r: 2, time: 0, look, h: (n) => BT.hash(2, 2, n), kind: () => kind || ">", rect: (a, b, w, h) => c.fillRect(a, b, w, h) }, { tint: "rgba(255,255,255,.14)", rgb: "255,255,255" }));
  const base = wind(undefined).log;
  assert.strictEqual(wind(look0("gust")).log, base, "a skin padrão é o vento de sempre");
  const seen = new Set([base]);
  for (const k of skinsOf("gust")) for (const kind of [">", "v"]) { const r = wind(k, kind).log; if (kind === ">") { assert.ok(!seen.has(r), `gust/${k.id}: igual a outro vento`); seen.add(r); } assert.notStrictEqual(r, wind(undefined, kind).log, `gust/${k.id} ${kind}: igual ao vento de sempre`); }
});

test("`from` de cada categoria = a primeira fase dos mapas de js/bird-levels.js em que o objeto existe (e ele continua nas seguintes)", () => {
  const LEVELS = require(path.join(__dirname, "../js/bird-levels.js"));
  assert.strictEqual(LEVELS.length, 20);
  const has = (lv, ch) => lv.map.join("").includes(ch);
  const CRIT = { bird: () => true, seed: (l) => l.seeds > 0, stray: (l) => l.cats > 0, birdexit: (l) => has(l, "E"), berry: (l) => l.fruits > 0, bug: (l) => l.worms > 0, roost: (l) => !!l.special && l.special.G > 0 && has(l, "G"), gust: (l) => !!l.special && l.special.wind > 0 && /[<>^v]/.test(l.map.join("")), hawk: (l) => l.hawks > 0 && has(l, "H") };
  const first = (f) => LEVELS.find(f).id;
  const want = Object.fromEntries(Object.entries(CRIT).map(([s, f]) => [s, first(f)]));
  for (const s of Skins.slotsOf("bird")) assert.ok(CRIT[s.id], `${s.id}: toda categoria tem o critério escrito neste teste`);
  for (const s of Skins.slotsOf("bird")) assert.strictEqual(s.from, want[s.id], `${s.id}: from ${s.from}, mapas ${want[s.id]}`);
  assert.deepStrictEqual(want, { bird: 1, seed: 1, stray: 1, birdexit: 1, berry: 2, bug: 2, roost: 3, gust: 3, hawk: 11 });
  // a partir da fase `from` o objeto aparece em todas as seguintes; a única exceção é o vento, que o desenho do jogo tira de propósito das Fases 5 e 18 (campo aberto sem corrente)
  const GAPS = { gust: [5, 18] };
  for (const s of Skins.slotsOf("bird")) {
    const gone = LEVELS.filter((l) => l.id >= s.from && !CRIT[s.id](l)).map((l) => l.id);
    assert.deepStrictEqual(gone, GAPS[s.id] || [], `${s.id}: fases a partir da ${s.from} sem o objeto`);
  }
  for (const slot of CATS) for (const k of skinsOf(slot)) assert.ok(k.from === undefined || k.from >= Skins.slot(slot).from, `${slot}/${k.id}: from`);
});

test("cabe na carteira: 126 skins pagas e 27 categorias de todos os jogos ficam dentro dos limites de js/records.js (200 skins e 40 categorias)", () => {
  const R = require(path.join(__dirname, "../js/records.js"));
  require(path.join(__dirname, "../js/skins-dog.js")); // (registram no catálogo global)
  require(path.join(__dirname, "../js/skins-cat.js"));
  // o que js/game.js registra: o Cachorrinho (8 skins pagas), o Gatinho (11) e o Passarinho (11, registradas acima neste teste)
  const objects = Skins.SLOTS.filter((s) => !s.player).reduce((a, s) => a + Skins.count(s.id), 0), players = 8 + 11 + Skins.count("bird");
  assert.strictEqual(objects, 9 * 4 + 7 * 4 + 8 * 4, "36 do Cachorrinho, 28 do Gatinho e 32 do Passarinho");
  assert.strictEqual(objects + players, 126);
  assert.strictEqual(Skins.SLOTS.length, 27);
  assert.ok(objects + players <= R.MAX_OWNED && Skins.SLOTS.length <= R.MAX_SLOTS, `${objects + players} skins (limite ${R.MAX_OWNED}) em ${Skins.SLOTS.length} categorias (limite ${R.MAX_SLOTS})`);
});

test("o código-fonte de js/skins-bird.js: nada de Math.random, relógio nem página; só Skins.register", () => {
  assert.ok(!/Math\.random|Date\.|performance\.|document\.|window\.|localStorage/.test(src.replace(/\/\/.*$/gm, "")));
  assert.strictEqual((src.match(/Skins\.register\(/g) || []).length, 8);
});

console.log(failed ? `\n${failed} teste(s) falharam` : "\nTodos os testes de js/skins-bird.js passaram");
process.exit(failed ? 1 : 0);
