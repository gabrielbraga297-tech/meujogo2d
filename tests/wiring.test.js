// Testes de "fiação" (sem navegador): confere o que liga as peças da lojinha única sem rodar o jogo. Uso: node tests/wiring.test.js
//  - index.html carrega os scripts na ordem em que um precisa do outro (js/skins.js antes de js/skins-dog.js, js/skins-cat.js e js/skins-bird.js, e tudo isso, mais js/records.js, js/cat-art.js e js/bird-art.js, antes de js/game.js);
//  - a tela da lojinha (renderShop em js/game.js) sempre passa o JOGO da categoria ao progresso (store.reachedLevel(jogador, jogo)) e decide o bloqueio com Skins.unlocked:
//    esquecer o jogo faria o progresso do Cachorrinho liberar categorias do Gatinho (e o contrário) sem que nenhum teste de Node notasse.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 5).join("\n     ") : e)); }
}

// recorta o código de uma função de js/game.js (do "function nome(" até a chave que a fecha), sem os comentários
const gameSrc = read("js/game.js");
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

test("index.html: js/skins.js vem antes de js/skins-dog.js, js/skins-cat.js e js/skins-bird.js, e todos vêm antes de js/game.js (que é o último script)", () => {
  const scripts = [...read("index.html").matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  const at = (f) => { const i = scripts.indexOf(f); assert.ok(i >= 0, `index.html não carrega ${f}`); return i; };
  assert.strictEqual(new Set(scripts).size, scripts.length, "nenhum script é carregado duas vezes");
  assert.strictEqual(scripts[scripts.length - 1], "js/game.js", "js/game.js é o último");
  assert.ok(at("js/skins.js") < at("js/skins-dog.js"), "skins.js antes de skins-dog.js");
  assert.ok(at("js/skins.js") < at("js/skins-cat.js"), "skins.js antes de skins-cat.js");
  assert.ok(at("js/skins.js") < at("js/skins-bird.js"), "skins.js antes de skins-bird.js");
  assert.ok(at("js/skins-dog.js") < at("js/game.js") && at("js/skins-cat.js") < at("js/game.js") && at("js/skins-bird.js") < at("js/game.js"), "as skins dos objetos antes de game.js");
  assert.ok(at("js/skins-cat.js") < at("js/skins-bird.js"), "a ordem dos arquivos de skins é a dos jogos: Cachorrinho, Gatinho, Passarinho");
  assert.ok(at("js/records.js") < at("js/game.js") && at("js/cat-art.js") < at("js/game.js") && at("js/bird-art.js") < at("js/game.js"), "records.js, cat-art.js e bird-art.js antes de game.js");
  for (const f of ["js/profiles.js", "js/sound.js", "js/themes.js", "js/version.js"]) assert.ok(at(f) < at("js/game.js"), `${f} antes de game.js`);
});

test("index.html: os arquivos do Passarinho vêm na ordem certa (ambientes depois de themes.js e dos do Gatinho; arte depois de cat-art.js e antes de profiles.js; mapas depois dos do Gatinho; tudo antes de game.js)", () => {
  const scripts = [...read("index.html").matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  const at = (f) => { const i = scripts.indexOf(f); assert.ok(i >= 0, `index.html não carrega ${f}`); return i; };
  assert.ok(at("js/themes.js") < at("js/bird-themes.js"), "themes.js antes de bird-themes.js");
  assert.ok(at("js/cat-themes-2.js") < at("js/bird-themes.js"), "os ambientes do Gatinho antes dos do Passarinho");
  assert.ok(at("js/bird-themes.js") < at("js/bird-themes-1.js") && at("js/bird-themes-1.js") < at("js/bird-themes-2.js"), "o núcleo dos ambientes antes das Fases 1 a 10 e antes das 11 a 20 (eles chamam BirdThemes.register)");
  assert.ok(at("js/cat-art.js") < at("js/bird-art.js"), "cat-art.js antes de bird-art.js");
  assert.ok(at("js/bird-art.js") < at("js/profiles.js"), "bird-art.js antes de profiles.js");
  assert.ok(at("js/cat-levels.js") < at("js/bird-levels.js"), "cat-levels.js antes de bird-levels.js");
  for (const f of ["js/bird-themes.js", "js/bird-themes-1.js", "js/bird-themes-2.js", "js/bird-art.js", "js/bird-levels.js"]) assert.ok(at(f) < at("js/game.js"), `${f} antes de game.js`);
});

test("js/game.js: a lojinha lê o progresso do JOGO da categoria (store.reachedLevel(jogador, jogo)), nunca o do jogo padrão", () => {
  const calls = [...gameSrc.replace(/\/\/.*$/gm, "").matchAll(/\breachedLevel\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ""));
  assert.ok(calls.length >= 1, "o jogo chama reachedLevel");
  assert.deepStrictEqual([...new Set(calls)], ["me,game"], `toda chamada de reachedLevel passa o jogador e o jogo: ${JSON.stringify(calls)}`);
  assert.ok(/reached\s*=\s*\(game\)\s*=>\s*\(me\s*\?\s*store\.reachedLevel\(me,\s*game\)\s*:\s*1\)/.test(gameSrc), "renderShop define reached(jogo) = store.reachedLevel(me, jogo), e 1 sem nome de usuário");
});

test("renderShop: todo reached(...) recebe o jogo da categoria que está sendo mostrada (x.game ou slot.game), e o bloqueio vem de Skins.unlocked", () => {
  const body = fnSrc("renderShop");
  const uses = [...body.matchAll(/\breached\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ""));
  assert.ok(uses.length >= 4, `renderShop usa reached(...) ${uses.length} vezes (aba, painel, texto do bloqueio e cartão)`);
  for (const u of uses.filter((x) => x !== "game")) assert.ok(/^(x|slot)\.game$/.test(u), `reached(${u}): precisa ser o jogo da categoria (x.game ou slot.game)`);
  assert.ok(!/\breached\(\)/.test(body) && !/\breached\((me|name)?\)/.test(body.replace(/\breached\s*=\s*\(game\)/, "")), "nenhum reached() sem o jogo");
  // o bloqueio das abas, do painel e do cartão de cada skin usa a regra única do catálogo
  const unlocked = [...body.matchAll(/Skins\.unlocked\(([^;]*?),\s*reached\((x|slot)\.game\)\)/g)];
  assert.strictEqual(unlocked.length, 3, `renderShop usa Skins.unlocked(categoria, skin, reached(categoria.game)) nos 3 pontos (aba, painel e cartão): ${unlocked.length}`);
  assert.ok(!/\breached\([^)]*\)\s*(<|>=|<=|>)/.test(body), "e não repete a comparação 'alcançou a fase' à mão");
  // a categoria e o jogo vêm do mesmo objeto (x da aba ou slot da categoria aberta)
  for (const m of unlocked) assert.ok(new RegExp(`^${m[2]}\\.id,`).test(m[1]), `Skins.unlocked(${m[1]}, ...): a categoria e o jogo precisam ser do mesmo objeto (${m[2]})`);
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes de fiação passaram");
