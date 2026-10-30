// Testes do catálogo das SKINS DOS OBJETOS DO JOGO DO CACHORRINHO (js/skins-dog.js, 0.19.0), sem navegador. Uso: node tests/skins-dog.test.js
// Confere: as 10 categorias registradas (agent, ration, exit, catexit, postman, bone, ball, block, van, foecat) com exatamente 4 skins cada (5 com a padrão), ids, preços (10 a 30, escada crescente), nomes e frases em português e sem repetição,
// "from" nunca abaixo do da categoria, só os campos visuais documentados (com o tipo certo), skins diferentes entre si, a saída do Gatinho com os mesmos campos da saída do Cachorrinho e o desenho (js/game.js) lendo cada campo.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

global.Skins = require(path.join(__dirname, "../js/skins.js"));
require(path.join(__dirname, "../js/skins-dog.js"));
const Skins = global.Skins;
const dogSrc = fs.readFileSync(path.join(__dirname, "../js/skins-dog.js"), "utf8");
const gameSrc = fs.readFileSync(path.join(__dirname, "../js/game.js"), "utf8");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 5).join("\n     ") : e)); }
}

const MINE = ["agent", "ration", "exit", "catexit", "postman", "bone", "ball", "block", "van", "foecat"]; // as categorias de js/skins-dog.js
const COLOR = /^(#[0-9a-f]{6}|rgba?\([0-9., ]+\))$/i;
const col = (v) => typeof v === "string" && COLOR.test(v);
const pal3 = (v) => Array.isArray(v) && v.length === 3 && v.every(col);
// os campos visuais de cada categoria e como conferir o valor (a documentação está no topo de js/skins-dog.js)
const oneOf = (...xs) => (v) => xs.includes(v);
const SCHEMA = {
  agent: { pants: col, boots: col, sleeves: col, vest: col, stripes: (v) => col(v) || v === "rainbow", cap: col, badge: col, pole: col, ring: col, tie: col },
  postman: { pants: col, shirt: col, sleeves: col, bag: col, cap: col, badge: col, deco: oneOf("stripes", "stars"), mark: col },
  ration: { bowl: col, band: col, kibble: col, kibbleHi: col, deco: oneOf("dots", "sparkle"), mark: col },
  bone: { fill: col, stroke: col, pattern: oneOf("stripes", "dots", "bands", "stars"), mark: col },
  ball: { pattern: oneOf("stripes", "dots", "star", "rainbow"), mark: col },
  block: { door: pal3, wall: pal3, warn: col, round: (v) => v === true, deco: oneOf("grain", "glint", "holes"), mark: col },
  van: { body: col, eave: col, cab: col, bars: col, light: col, stripe: (v) => col(v) || v === "rainbow", deco: oneOf("dots", "hearts"), mark: col },
  foecat: { coats: (v) => Array.isArray(v) && v.length === 4 && v.every((c) => ["fur", "dark", "light", "eye"].every((f) => col(c[f]))), acc: oneOf("bell", "bow", "party"), collar: col, bell: col },
  exit: { open: col, closed: col, inkOpen: col, inkClosed: col, deco: oneOf("stripes", "rainbow", "stars", "frame"), mark: col },
};
SCHEMA.catexit = SCHEMA.exit; // a saída do Gatinho: MESMA função de desenho, MESMOS campos
const META = new Set(["id", "name", "text", "price", "from"]);
const visual = (k) => Object.fromEntries(Object.entries(k).filter(([f]) => !META.has(f)));
const mine = (cat) => Skins.list(cat).slice(1); // sem a padrão

test("as 10 categorias dos objetos do Cachorrinho estão registradas, cada uma com exatamente 4 skins além da padrão (5 com a padrão)", () => {
  assert.strictEqual(MINE.length, 10);
  for (const c of MINE) {
    assert.ok(Skins.slot(c), `categoria ${c} não existe em js/skins.js`);
    const n = Skins.count(c);
    assert.strictEqual(n, 4, `${c}: ${n} skins além da padrão (precisam ser 4)`);
    assert.strictEqual(Skins.list(c).length, 5, `${c}: com a padrão são 5`);
  }
  // nada de categoria do Gatinho nem do cachorrinho neste arquivo
  for (const c of ["dog", "cat", "guard", "mouse", "yarn", "agile", "perch", "tracker"]) assert.strictEqual(Skins.count(c), 0, `${c} não é de js/skins-dog.js`);
});

test("cada categoria é do jogo certo: a saída do Gatinho é do jogo cat e as demais do jogo dog", () => {
  for (const c of MINE) assert.strictEqual(Skins.slot(c).game, c === "catexit" ? "cat" : "dog", c);
});

test("ids: letras minúsculas, números e hífen, únicos na categoria; a padrão tem id vazio", () => {
  for (const c of MINE) {
    const l = Skins.list(c);
    assert.strictEqual(l[0].id, "", `${c}: a padrão vem primeiro`);
    assert.strictEqual(new Set(l.map((k) => k.id)).size, l.length, `${c}: id repetido`);
    for (const k of l.slice(1)) assert.ok(/^[a-z0-9-]{1,24}$/.test(k.id), `${c}/${k.id}`);
  }
});

test("preços: inteiros de 10 a 30 petscoin, em escada estritamente crescente dentro da categoria; a padrão é grátis", () => {
  for (const c of MINE) {
    const l = Skins.list(c);
    assert.strictEqual(l[0].price, 0, `${c}: a padrão é grátis`);
    let prev = 0;
    for (const k of l.slice(1)) {
      assert.ok(Number.isInteger(k.price) && k.price >= Skins.MIN_PRICE && k.price >= 10 && k.price <= 30, `${c}/${k.id}: preço ${k.price} fora de 10 a 30`);
      assert.ok(k.price > prev, `${c}/${k.id}: preço ${k.price} não é maior que ${prev}`);
      prev = k.price;
    }
    assert.ok(l[1].price <= 15, `${c}: a primeira da escada custa pouco (${l[1].price})`);
    assert.ok(l[l.length - 1].price >= 20, `${c}: a última da escada custa mais (${l[l.length - 1].price})`);
  }
});

test("nomes e frases: texto em português do Brasil, curtos, sem repetição e sem marca, raça, violência nem inglês", () => {
  const FORBIDDEN = /\b(labrador|poodle|bulldog|pug|husky|beagle|chihuahua|rottweiler|d[aá]lmata|golden|pitbull|vira-lata|siam[eê]s|persa|nike|adidas|lego|disney|pok[eé]mon|mario|mickey|barbie|matar|mata|sangue|arma|morte|morto|bater|soco|chute|briga|guerra|machuc\w*)\b/i;
  const ENGLISH = /\b(the|and|with|dog|cat|bone|ball|skin|agent|block|red|blue|green|gold|golden|star|rainbow|pink|exit|bowl|stripes|dots)\b/i;
  const seenNames = new Set();
  for (const c of MINE) {
    const names = new Set(), texts = new Set();
    for (const k of Skins.list(c)) {
      assert.ok(typeof k.name === "string" && k.name.trim() === k.name && k.name.length >= 4 && k.name.length <= 28, `${c}/${k.id}: nome "${k.name}"`);
      assert.ok(typeof k.text === "string" && k.text.trim() === k.text && k.text.length >= 8 && k.text.length <= 56, `${c}/${k.id}: frase "${k.text}"`);
      assert.ok(/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(k.name), `${c}/${k.id}: o nome começa com maiúscula`);
      assert.ok(/[a-zà-ú]/.test(k.text) && !/[.!?]$/.test(k.text), `${c}/${k.id}: a frase é curta e sem ponto final`);
      for (const s of [k.name, k.text]) { assert.ok(!FORBIDDEN.test(s), `${c}/${k.id}: palavra proibida em "${s}"`); assert.ok(!ENGLISH.test(s), `${c}/${k.id}: palavra em inglês em "${s}"`); assert.ok(!/[<>{}]/.test(s), `${c}/${k.id}: texto com marcação`); }
      assert.ok(!names.has(k.name), `${c}: nome repetido "${k.name}"`); names.add(k.name);
      assert.ok(!texts.has(k.text), `${c}: frase repetida "${k.text}"`); texts.add(k.text);
      if (c !== "catexit") { assert.ok(!seenNames.has(k.name), `nome "${k.name}" já usado em outra categoria`); seenNames.add(k.name); } // (a saída do Gatinho repete a do Cachorrinho de propósito)
    }
  }
  // o exemplo do pedido: a padrão tem nome e frase de verdade, não "Padrão"
  for (const c of MINE) assert.notStrictEqual(Skins.get(c, "").name, "Padrão", `${c}: dê nome à skin padrão`);
  assert.strictEqual(Skins.get("van", "").name, "Carrocinha clássica");
});

test("acentuação: nos textos as palavras são escritas com acento (arco-íris, saída, corações), só os ids ficam sem", () => {
  for (const c of MINE) for (const k of Skins.list(c)) for (const s of [k.name, k.text]) assert.ok(!/\b(arco-iris|saida|coracoes|coracao|estrelinhas? amarela|ate|voce)\b/i.test(s), `${c}/${k.id}: "${s}"`);
});

test('"from": nunca abaixo da fase da categoria (e as categorias abrem nas fases certas)', () => {
  const FROM = { agent: 1, ration: 1, exit: 1, catexit: 1, postman: 2, bone: 2, ball: 2, block: 3, van: 4, foecat: 11 };
  for (const c of MINE) {
    assert.strictEqual(Skins.slot(c).from, FROM[c], `${c}: fase da categoria`);
    for (const k of mine(c)) { if (k.from !== undefined) assert.ok(k.from >= Skins.slot(c).from && k.from <= 20, `${c}/${k.id}: from ${k.from}`); assert.ok(Skins.fromOf(c, k.id) >= Skins.slot(c).from); }
  }
});

test("campos visuais: só os documentados, com o tipo certo, e nenhum campo de regra (velocidade, pontos, tamanho, tempo)", () => {
  for (const c of MINE) for (const k of mine(c)) {
    const v = visual(k);
    assert.ok(Object.keys(v).length >= 1, `${c}/${k.id}: sem nenhum campo visual (seria igual à padrão)`);
    for (const [f, val] of Object.entries(v)) {
      assert.ok(SCHEMA[c][f], `${c}/${k.id}: campo "${f}" não documentado`);
      assert.ok(SCHEMA[c][f](val), `${c}/${k.id}: valor inválido em "${f}": ${JSON.stringify(val)}`);
      assert.ok(!/(speed|vel|score|point|ponto|time|tempo|size|tamanho|hit|range|alcance|sound|som)/i.test(f), `${c}/${k.id}: "${f}" parece campo de regra`);
    }
  }
});

test("a skin padrão de cada categoria não tem nenhum campo visual (o desenho cai no visual de sempre)", () => {
  for (const c of MINE) assert.deepStrictEqual(visual(Skins.get(c, "")), {}, c);
});

test("cada skin é diferente da padrão e de todas as outras da categoria (campos visuais distintos)", () => {
  for (const c of MINE) {
    const seen = new Map();
    for (const k of mine(c)) { const j = JSON.stringify(visual(k)); assert.ok(!seen.has(j), `${c}: ${k.id} tem o mesmo visual de ${seen.get(j)}`); seen.set(j, k.id); }
  }
});

test("catexit e exit: os MESMOS campos visuais, nas mesmas skins (ids, preços e visual iguais)", () => {
  const a = mine("exit"), b = mine("catexit");
  assert.strictEqual(a.length, b.length);
  for (const [i, k] of a.entries()) {
    assert.strictEqual(b[i].id, k.id);
    assert.strictEqual(b[i].price, k.price);
    assert.deepStrictEqual(visual(b[i]), visual(k));
  }
  assert.strictEqual(Skins.slot("exit").game, "dog");
  assert.strictEqual(Skins.slot("catexit").game, "cat");
  assert.strictEqual(Skins.slot("catexit").from, 1);
});

test("a saída das skins continua verde aberta e vermelha fechada: nenhuma skin de saída troca as cores de estado", () => {
  for (const c of ["exit", "catexit"]) for (const k of mine(c)) assert.ok(!("open" in k) && !("closed" in k), `${c}/${k.id}: a cor aberta/fechada é a de sempre`);
});

test("os ossos de tipo novo guardam a cor do efeito: as skins de osso só pintam o osso comum (fill, stroke, mark)", () => {
  for (const k of mine("bone")) assert.ok(k.pattern, `${k.id}: todo osso tem desenho`);
  const body = gameSrc.slice(gameSrc.indexOf("function drawBone("), gameSrc.indexOf("function bonePattern("));
  assert.ok(/plain && k\.fill/.test(body) && /plain && k\.stroke/.test(body), "drawBone só aplica fill e stroke da skin ao osso comum");
});

// O código de cada função de desenho de js/game.js, recortado do "function nome(" até a chave que a fecha (sem os comentários), para conferir o que CADA desenho lê (não o arquivo inteiro).
function fnSrc(name) {
  const i = gameSrc.indexOf("function " + name + "(");
  assert.ok(i >= 0, `js/game.js não tem a função ${name}`);
  let depth = 0;
  for (let p = gameSrc.indexOf("{", gameSrc.indexOf(")", i)); p < gameSrc.length; p++) {
    const c = gameSrc[p], n = gameSrc[p + 1];
    if (c === "/" && n === "/") { p = gameSrc.indexOf("\n", p); continue; }
    if (c === "/" && n === "*") { p = gameSrc.indexOf("*/", p) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") { for (p++; gameSrc[p] !== c; p++) if (gameSrc[p] === "\\") p++; continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return gameSrc.slice(i, p + 1).replace(/\/\/.*$/gm, "");
  }
  assert.fail(`a função ${name} não fecha`);
}
// as funções que desenham cada categoria (a primeira é a que chama lookOf; as outras são os ajudantes que recebem a skin)
const DRAWERS = {
  agent: ["drawVet"], postman: ["drawPostman", "postmanDeco"], ration: ["drawKibble"], bone: ["drawBone", "bonePattern"], ball: ["drawBall", "ballPattern"], block: ["drawMovingWall", "drawMovingBlock", "blockDeco"],
  van: ["drawVan", "vanDeco"], foecat: ["drawCat", "catAccessory"], exit: ["drawExitAt", "exitDeco"], catexit: ["drawExitAt", "exitDeco"],
};

test("o desenho de cada categoria (a função certa de js/game.js) lê cada campo visual com lookOf e cai no visual de sempre sem ele", () => {
  assert.deepStrictEqual(Object.keys(DRAWERS).sort(), [...MINE].sort(), "toda categoria tem as suas funções de desenho listadas");
  for (const c of MINE) {
    if (c === "exit" || c === "catexit") assert.ok(fnSrc("drawExit").includes('lookOf(catDraw ? "catexit" : "exit")'), "drawExit lê a skin de saída do jogo certo");
    else assert.ok(fnSrc(DRAWERS[c][0]).includes(`lookOf("${c}")`), `${c}: ${DRAWERS[c][0]} não chama lookOf("${c}")`);
    const code = DRAWERS[c].map(fnSrc).join("\n");
    const reads = (field) => new RegExp(`\\b(k|lk|look)\\.${field}\\b`).test(code);
    for (const f of Object.keys(SCHEMA[c])) assert.ok(reads(f), `${c}: as funções de desenho (${DRAWERS[c].join(", ")}) não leem o campo "${f}"`);
    // e os campos de skin realmente usados nos catálogos são lidos pelo desenho da PRÓPRIA categoria
    for (const k of mine(c)) for (const f of Object.keys(visual(k))) assert.ok(reads(f), `${c}/${k.id}: o campo "${f}" não é lido pelo desenho de ${c}`);
  }
  // sanidade do recorte: o desenho de uma categoria não lê o campo exclusivo de outra
  assert.ok(!/\b(k|lk|look)\.coats\b/.test(DRAWERS.van.map(fnSrc).join("\n")), "o recorte da van não pode incluir o desenho do gato");
  assert.ok(fnSrc("drawBone").length < 3000 && fnSrc("drawVet").length < 6000, "o recorte é só a função, não o arquivo inteiro");
});

test("PREVIEW existe para cada categoria (js/game.js) e o gancho de capturas também", () => {
  for (const c of MINE) assert.ok(new RegExp(`PREVIEW\\.${c}\\s*=`).test(gameSrc) || (/PREVIEW\.exit = exitPreview\("exit"\)/.test(gameSrc) && /PREVIEW\.catexit = exitPreview\("catexit"\)/.test(gameSrc)), `${c}: sem PREVIEW`);
  assert.ok(/skinPreview\(slot, canvas, id\)/.test(gameSrc));
  assert.ok(!/\bpreview\(slot, c2, k, w, h\)/.test(gameSrc), "só existe o gancho skinPreview (não o preview antigo)");
});

test("o cabeçalho de js/skins-dog.js documenta cada categoria e cada campo visual", () => {
  const head = dogSrc.slice(0, dogSrc.indexOf("(function () {"));
  for (const c of MINE) assert.ok(new RegExp(`\\b${c}\\b`).test(head), `o cabeçalho não cita ${c}`);
  for (const c of MINE) for (const f of Object.keys(SCHEMA[c])) assert.ok(new RegExp(`\\b${f}\\b`).test(head), `o cabeçalho não documenta o campo ${c}.${f}`);
});

test("o catálogo é só texto e números: nada de função, marcação nem endereço nos campos", () => {
  for (const c of MINE) for (const k of Skins.list(c)) for (const [f, v] of Object.entries(k)) {
    const flat = JSON.stringify(v);
    assert.ok(typeof v !== "function" && !/https?:|<|javascript:/i.test(flat), `${c}/${k.id}.${f}`);
  }
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes das skins dos objetos do Cachorrinho passaram");
