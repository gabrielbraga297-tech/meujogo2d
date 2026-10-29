// Testes do catálogo único da lojinha (js/skins.js), sem navegador. Uso: node tests/skins.test.js
// Confere o contrato das categorias (quem aparece em que jogo e a partir de que fase), do registro das skins e das regras de liberação.
const assert = require("assert");
const path = require("path");
const Skins = require(path.join(__dirname, "../js/skins.js"));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 4).join("\n     ") : e)); }
}
const k = (id, extra = {}) => ({ id, name: `Skin ${id}`, text: "só visual", price: 10, ...extra });

test("as categorias: ids únicos, minúsculos, com jogo e fase de 1 a 20", () => {
  const ids = Skins.SLOTS.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const s of Skins.SLOTS) {
    assert.ok(/^[a-z]{2,12}$/.test(s.id), s.id);
    assert.ok(Skins.GAMES.some((g) => g.id === s.game), `${s.id}: jogo ${s.game}`);
    assert.ok(Number.isInteger(s.from) && s.from >= 1 && s.from <= 20, `${s.id}: from ${s.from}`);
    assert.ok(s.name && s.singular, s.id);
  }
});

test("cada jogo pronto tem exatamente uma categoria do jogador e ela abre na Fase 1", () => {
  for (const g of Skins.GAMES.filter((x) => x.ready)) {
    const own = Skins.slotsOf(g.id).filter((s) => s.player);
    assert.strictEqual(own.length, 1, g.id);
    assert.strictEqual(own[0].from, 1);
    assert.strictEqual(own[0].id, g.id); // "dog" e "cat": a mesma chave de quem joga
  }
});

test("o Passarinho ainda não tem categorias (aparece desligado, em breve)", () => {
  assert.strictEqual(Skins.GAMES.find((g) => g.id === "bird").ready, false);
  assert.strictEqual(Skins.slotsOf("bird").length, 0);
});

test("liberação por fase do jogo: gatos só a partir da Fase 11, vans da 4, blocos da 3", () => {
  assert.strictEqual(Skins.slot("foecat").from, 11);
  assert.strictEqual(Skins.slot("tracker").from, 11);
  assert.strictEqual(Skins.slot("van").from, 4);
  assert.strictEqual(Skins.slot("block").from, 3);
  assert.ok(!Skins.unlocked("foecat", "", 10) && Skins.unlocked("foecat", "", 11));
  assert.ok(!Skins.unlocked("agent", "", 0) && Skins.unlocked("agent", "", 1));
  assert.ok(!Skins.unlocked("agent", "", undefined) && !Skins.unlocked("agent", "", "5"));
  assert.strictEqual(Skins.fromOf("nao-existe", ""), 99);
});

test("register: valida categoria, id, nome, frase, preço (mínimo 10) e from", () => {
  assert.throws(() => Skins.register("nao-existe", []), /desconhecida/);
  assert.throws(() => Skins.register("agent", "x"), /array/);
  assert.throws(() => Skins.register("agent", [null]), /inválida/);
  assert.throws(() => Skins.register("agent", [k("Maiúscula")]), /id inválido/);
  assert.throws(() => Skins.register("agent", [k("a"), k("a")]), /repetido/);
  assert.throws(() => Skins.register("agent", [k("")]), /id inválido/); // "" é só a padrão
  assert.throws(() => Skins.register("agent", [k("a", { name: " " })]), /sem nome/);
  assert.throws(() => Skins.register("agent", [k("a", { text: "" })]), /sem frase/);
  assert.throws(() => Skins.register("agent", [k("a", { price: 9 })]), /preço mínimo/);
  assert.throws(() => Skins.register("agent", [k("a", { price: 10.5 })]), /preço mínimo/);
  assert.throws(() => Skins.register("foecat", [k("a", { from: 5 })]), /from/); // nunca mais baixa que a da categoria
  assert.throws(() => Skins.register("foecat", [k("a", { from: 21 })]), /from/);
  assert.strictEqual(Skins.count("agent"), 0); // nada foi registrado pelas tentativas com erro
});

test("register guarda as skins congeladas, list põe a padrão primeiro e get cai na padrão", () => {
  const r = Skins.register("ration", [k("azul", { pal: { bowl: "#4fc3ff" } }), k("rosa", { from: 6 })]);
  assert.strictEqual(r.length, 2);
  assert.ok(Object.isFrozen(r[0]));
  const l = Skins.list("ration");
  assert.deepStrictEqual(l.map((x) => x.id), ["", "azul", "rosa"]);
  assert.strictEqual(l[0].price, 0);
  assert.strictEqual(Skins.get("ration", "azul").pal.bowl, "#4fc3ff");
  assert.strictEqual(Skins.get("ration", "nao-existe").id, "");
  assert.ok(Skins.has("ration", "") && Skins.has("ration", "rosa") && !Skins.has("ration", "nao-existe"));
  assert.strictEqual(Skins.fromOf("ration", "azul"), 1);
  assert.strictEqual(Skins.fromOf("ration", "rosa"), 6);
  assert.ok(!Skins.unlocked("ration", "rosa", 5) && Skins.unlocked("ration", "rosa", 6));
  assert.throws(() => Skins.register("ration", []), /já registrada/);
  assert.deepStrictEqual(Skins.list("nao-existe"), []);
});

test("register aceita o nome e a frase da skin padrão da categoria", () => {
  assert.throws(() => Skins.register("bone", [], { name: 3 }), /padrão inválida/);
  assert.strictEqual(Skins.list("bone")[0].name, "Padrão"); // (a tentativa com erro não registrou nada)
  Skins.register("bone", [k("dourado")], { name: "Osso comum", text: "o osso de sempre" });
  assert.strictEqual(Skins.list("bone")[0].name, "Osso comum");
  assert.strictEqual(Skins.get("bone", "").text, "o osso de sempre");
  assert.strictEqual(Skins.get("bone", "").price, 0);
});

test('os exemplos "Fase N do jogo" dos textos de ajuda (index.html e js/profiles.js) batem com a fase de liberação do catálogo', () => {
  const fs = require("fs"), read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const gameName = (id) => Skins.GAMES.find((g) => g.id === id).name;
  const phrase = (txt, re) => { const m = txt.match(re); assert.ok(m, `não achei ${re} no texto`); return m; };
  // a ajuda do Cachorrinho (index.html) cita os gatos, a do Gatinho (js/profiles.js) cita os lugares altos
  const idx = read("index.html"), prof = read("js/profiles.js");
  const dogHelp = phrase(idx, /\(as dos gatos, por exemplo, só na Fase (\d+) do (\w+)\)/), catHelp = phrase(prof, /\(os lugares altos, por exemplo, só na Fase (\d+) do (\w+)\)/);
  assert.strictEqual(Number(dogHelp[1]), Skins.slot("foecat").from, `index.html diz Fase ${dogHelp[1]} para os gatos, o catálogo diz ${Skins.slot("foecat").from}`);
  assert.strictEqual(dogHelp[2], gameName(Skins.slot("foecat").game));
  assert.strictEqual(Number(catHelp[1]), Skins.slot("perch").from, `js/profiles.js diz Fase ${catHelp[1]} para os lugares altos, o catálogo diz ${Skins.slot("perch").from}`);
  assert.strictEqual(catHelp[2], gameName(Skins.slot("perch").game));
  // e não sobra nenhum outro "Fase N do Cachorrinho/Gatinho" sem conferência nesses dois textos
  assert.strictEqual((idx.match(/Fase \d+ do (Cachorrinho|Gatinho)/g) || []).length, 1, "index.html: um só exemplo de fase");
  assert.strictEqual((prof.match(/Fase \d+ do (Cachorrinho|Gatinho)/g) || []).length, 1, "js/profiles.js: um só exemplo de fase");
});

test("a API pública é só o que alguém usa (a chave da skin na carteira, ownKey, é de js/records.js)", () => {
  assert.deepStrictEqual(Object.keys(Skins).sort(), ["GAMES", "MIN_PRICE", "SLOTS", "count", "fromOf", "get", "has", "list", "register", "slot", "slotsOf", "unlocked"]);
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes do catálogo da lojinha passaram");
