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

test("o Passarinho agora é um jogo pronto do catálogo: 9 categorias (a do jogador e 8 de objetos), com o jogador abrindo na Fase 1 e o ranking de fases de cada objeto", () => {
  assert.strictEqual(Skins.GAMES.find((g) => g.id === "bird").ready, true);
  assert.deepStrictEqual(Skins.slotsOf("bird").map((s) => [s.id, s.from]), [["bird", 1], ["seed", 1], ["stray", 1], ["birdexit", 1], ["berry", 2], ["bug", 2], ["roost", 3], ["gust", 3], ["hawk", 11]]);
  assert.deepStrictEqual(Skins.slotsOf("bird").filter((s) => s.player).map((s) => s.id), ["bird"]);
  assert.strictEqual(Skins.SLOTS.length, 27, "10 do Cachorrinho, 8 do Gatinho e 9 do Passarinho");
  assert.deepStrictEqual(Skins.GAMES.map((g) => Skins.slotsOf(g.id).length), [10, 8, 9]);
  assert.ok(!Skins.unlocked("hawk", "", 10) && Skins.unlocked("hawk", "", 11), "os gaviões só a partir da Fase 11 do Passarinho");
  assert.ok(!Skins.unlocked("berry", "", 1) && Skins.unlocked("berry", "", 2) && !Skins.unlocked("roost", "", 2) && Skins.unlocked("gust", "", 3));
});

test("a skin do Passarinho entra na carteira com a chave `bird:` e as outras categorias do jogo com a própria chave (ownKey de js/records.js)", () => {
  const R = require(path.join(__dirname, "../js/records.js")), mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
  const st = R.createStore(mem());
  st.setPlayer("Totó"); st.addTreats("Totó", 500);
  for (let n = 1; n <= 10; n++) st.game("bird").completeLevel("Totó", n); // (alcançou a Fase 11 do Passarinho)
  assert.strictEqual(st.reachedLevel("Totó", "bird"), 11);
  assert.strictEqual(st.reachedLevel("Totó", "dog"), 1, "o progresso é de cada jogo");
  const bought = st.buySkin("Totó", "amarelo", 10, "bird");
  assert.ok(bought.ok && bought.wallet.treats === 490 && bought.wallet.owned.join() === "amarelo", "comprou a skin Amarelo do passarinho por 10 petscoin");
  assert.deepStrictEqual(st.wallet("Totó", "bird").owned, ["amarelo"]);
  assert.deepStrictEqual(st.wallet("Totó").owned, [], "o Cachorrinho não recebe a skin do Passarinho");
  assert.deepStrictEqual(st.wallet("Totó", "cat").owned, []);
  st.equipSkin("Totó", "amarelo", "bird");
  assert.strictEqual(st.equippedSkin("Totó", "bird"), "amarelo");
  assert.strictEqual(st.equippedSkin("Totó", "dog"), "");
  assert.ok(st.buySkin("Totó", "x", 12, "hawk").ok === true, "os gaviões, a partir da Fase 11 do Passarinho");
  const poor = R.createStore(mem()); poor.setPlayer("Bia"); poor.addTreats("Bia", 500);
  assert.deepStrictEqual(poor.buySkin("Bia", "x", 12, "hawk"), { ok: false, error: "locked" }, "sem chegar à Fase 11 do Passarinho a categoria dos gaviões está travada");
  for (let n = 1; n <= 10; n++) poor.game("dog").completeLevel("Bia", n);
  assert.deepStrictEqual(poor.buySkin("Bia", "x", 12, "hawk"), { ok: false, error: "locked" }, "e o progresso do Cachorrinho não libera");
});

test("os limites da carteira (200 skins e 40 categorias por jogador) comportam o catálogo inteiro: 126 skins pagas em 27 categorias", () => {
  const R = require(path.join(__dirname, "../js/records.js"));
  assert.strictEqual(R.MAX_OWNED, 200);
  assert.strictEqual(R.MAX_SLOTS, 40);
  assert.ok(126 <= R.MAX_OWNED && Skins.SLOTS.length <= R.MAX_SLOTS, "8 + 36 do Cachorrinho, 11 + 28 do Gatinho e 11 + 32 do Passarinho (a contagem de verdade está em tests/skins-bird.test.js)");
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
  assert.throws(() => Skins.register("agent", [k("a", { price: 100000 })]), /preço máximo é 99999 petscoin/); // mais caro que o maior saldo possível: nunca poderia ser comprada
  assert.throws(() => Skins.register("agent", [k("a", { price: 1e9 })]), /preço máximo/);
  assert.throws(() => Skins.register("agent", [k("a", { price: Infinity })]), /preço mínimo/);
  assert.throws(() => Skins.register("agent", [k("a", { price: "20" })]), /preço mínimo/);
  assert.throws(() => Skins.register("foecat", [k("a", { from: 5 })]), /from/); // nunca mais baixa que a da categoria
  assert.throws(() => Skins.register("foecat", [k("a", { from: 21 })]), /from/);
  assert.strictEqual(Skins.count("agent"), 0); // nada foi registrado pelas tentativas com erro
});

test("o preço máximo da skin é o saldo máximo da carteira (records.js MAX_TREATS), e o preço de 99999 ainda vale", () => {
  assert.strictEqual(Skins.MAX_PRICE, require(path.join(__dirname, "../js/records.js")).MAX_TREATS);
  assert.strictEqual(Skins.MIN_PRICE, require(path.join(__dirname, "../js/records.js")).MIN_SKIN_PRICE);
  assert.strictEqual(Skins.register("exit", [k("caro", { price: Skins.MAX_PRICE })])[0].price, 99999, "99999 é aceito"); // (a categoria "exit" é só para este teste: depois dela, nada mais registra "exit" neste processo)
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
  assert.deepStrictEqual(Object.keys(Skins).sort(), ["GAMES", "MAX_PRICE", "MIN_PRICE", "SLOTS", "count", "fromOf", "get", "has", "list", "register", "slot", "slotsOf", "unlocked"]);
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes do catálogo da lojinha passaram");
