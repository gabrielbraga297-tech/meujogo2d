// Testes de "fiação" (sem navegador): confere o que liga as peças da lojinha única sem rodar o jogo. Uso: node tests/wiring.test.js
//  - index.html carrega os scripts na ordem em que um precisa do outro (js/skins.js antes de js/skins-dog.js, js/skins-cat.js e js/skins-bird.js, e tudo isso, mais js/records.js, js/cat-art.js e js/bird-art.js, antes de js/game.js);
//  - a tela da lojinha (renderShop em js/game.js) sempre passa o JOGO da categoria ao progresso (store.reachedLevel(jogador, jogo)) e decide o bloqueio com Skins.unlocked:
//    esquecer o jogo faria o progresso do Cachorrinho liberar categorias do Gatinho (e o contrário) sem que nenhum teste de Node notasse.
//  - (0.21.0) a música: js/music.js depois de js/sound.js e antes dos arquivos dos temas e de js/game.js; todo método do tocador que js/game.js chama existe em Music.create; e o musicSync() do jogo escolhe o tema, o abafado e a parada de cada estado.
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

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// O contrato js/game.js -> js/bird-art.js (o Passarinho): game.js chama `birdArt("drawNome", ...)`, que cai num desenho de reserva (silenciosamente) se BirdArt.drawNome não existe ou se um campo
// que o jogo passa não é lido pela arte. Sem este teste, um nome ou um campo trocado só apareceria como um passarinho de formas simples, que o jogo "aguenta" sem erro.
const BirdArt = require(path.join(__dirname, "../js/bird-art.js"));
const artSrc = read("js/bird-art.js");
// os argumentos de cada chamada birdArt("nome", a, b, { ... }) de js/game.js (separados no nível de cima, sem cair em strings, parênteses e chaves de dentro)
function birdArtCalls() {
  const out = [];
  for (const m of gameSrc.matchAll(/\bbirdArt\("(\w+)"/g)) {
    let depth = 0, cur = "", args = [], p = m.index + m[0].length;
    for (; p < gameSrc.length; p++) {
      const c = gameSrc[p];
      if (c === '"' || c === "'" || c === "`") { const q = c; cur += c; for (p++; gameSrc[p] !== q; p++) { cur += gameSrc[p]; if (gameSrc[p] === "\\") { p++; cur += gameSrc[p]; } } cur += q; continue; }
      if (c === "(" || c === "[" || c === "{") depth++;
      if (c === ")" || c === "]" || c === "}") { if (depth === 0) break; depth--; }
      if (c === "," && depth === 0) { args.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    if (cur.trim()) args.push(cur.trim());
    out.push({ name: m[1], args: args.filter(Boolean), line: gameSrc.slice(0, m.index).split("\n").length });
  }
  return out;
}
// as chaves de um literal { a, b: 1, c: x.y } escrito no nível de cima (atalhos incluídos)
function literalKeys(src) {
  const body = src.trim().replace(/^\{|\}$/g, ""), keys = [];
  let depth = 0, cur = "";
  const flush = () => { const k = /^\s*(\w+)\s*(?::|$)/.exec(cur); if (k) keys.push(k[1]); cur = ""; };
  for (let p = 0; p < body.length; p++) {
    const c = body[p];
    if (c === '"' || c === "'" || c === "`") { const q = c; cur += c; for (p++; body[p] !== q; p++) { cur += body[p]; if (body[p] === "\\") { p++; cur += body[p]; } } cur += q; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    if (c === ")" || c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) { flush(); continue; }
    cur += c;
  }
  flush();
  return keys;
}
// o campo é lido por js/bird-art.js: `x.campo`, `x?.campo`, ou um { campo, ... } = ... de desestruturação
const artReads = (key) => new RegExp(`\\??\\.${key}\\b|[{,]\\s*${key}\\s*(?:[,}]|=)`).test(artSrc);

test("game.js -> BirdArt: toda função que game.js chama por birdArt(\"...\") existe em BirdArt (e BirdArt.X escrito direto em game.js também)", () => {
  const calls = birdArtCalls(), names = [...new Set(calls.map((c) => c.name))].sort();
  assert.ok(calls.length >= 12 && names.length >= 9, `game.js deveria chamar pelo menos 9 funções de BirdArt em 12 pontos (achou ${names.length} em ${calls.length})`);
  const missing = names.filter((n) => typeof BirdArt[n] !== "function");
  assert.deepStrictEqual(missing, [], `game.js chama birdArt("${missing.join('", "')}") mas BirdArt não tem essa função: o jogo desenharia a peça de reserva (as que existem: ${Object.keys(BirdArt).filter((k) => typeof BirdArt[k] === "function").join(", ")})`);
  const direct = [...new Set([...gameSrc.replace(/\/\/.*$/gm, "").matchAll(/\bBirdArt\.(\w+)/g)].map((m) => m[1]))].sort(); // (sem os comentários, que dizem "BirdArt.nome")
  assert.deepStrictEqual(direct.filter((n) => !(n in BirdArt)), [], "game.js usa BirdArt.X que BirdArt não exporta");
});

test("game.js -> BirdArt: os campos que game.js passa nos literais { ... } de cada chamada são lidos por js/bird-art.js (variant, open, w, h, rim, twig, lining, hidden, kind, look, r, time, calm...)", () => {
  const calls = birdArtCalls(), unread = [], seen = new Set();
  for (const c of calls) for (const a of c.args) if (/^\{[\s\S]*\}$/.test(a)) for (const k of literalKeys(a)) { seen.add(k); if (!artReads(k)) unread.push(`birdArt("${c.name}") na linha ${c.line}: o campo "${k}" que o jogo passa não é lido em js/bird-art.js`); }
  assert.deepStrictEqual(unread, [], "campo passado que a arte não lê (o jogo desenha, mas sem o efeito):\n     " + unread.join("\n     "));
  for (const k of ["variant", "open", "w", "h", "rim", "twig", "lining", "hidden", "kind", "look", "r", "time", "calm"]) assert.ok(seen.has(k), `o teste deveria ter visto o campo "${k}" nas chamadas de game.js (o teste de contrato ficou cego?)`);
});

test("game.js: o birdArt avisa UMA vez por nome (console.warn) quando BirdArt.nome falta, em vez de cair em silêncio no desenho de reserva", () => {
  const body = fnSrc("birdArt");
  assert.ok(/console\.warn\(/.test(body) && /birdMissing/.test(body), "birdArt deve chamar console.warn com um Set de nomes já avisados (birdMissing)");
  assert.ok(/!birdMissing\.has\(name\)/.test(body) && /birdMissing\.add\(name\)/.test(body), "o aviso é um por nome");
  // o comportamento, de verdade: o corpo da função rodando com um BirdArt sem drawHawk
  const run = new Function("BirdArt", "console", "birdFailed", "birdMissing", `${body}\nreturn birdArt;`);
  const warns = [], fake = { drawBird: () => true };
  const birdArt = run(fake, { warn: (m) => warns.push(m), error: () => {} }, new Set(), new Set());
  assert.strictEqual(birdArt("drawHawk", 1), false); assert.strictEqual(birdArt("drawHawk", 1), false); assert.strictEqual(birdArt("drawSeed", 1), false);
  assert.strictEqual(birdArt("drawBird", 1), true);
  assert.strictEqual(warns.length, 2, `um aviso por nome que falta (drawHawk, drawSeed), nenhum para o que existe: ${JSON.stringify(warns)}`);
  assert.ok(/drawHawk/.test(warns[0]) && /drawSeed/.test(warns[1]));
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// A música (0.21.0): o contrato js/game.js -> js/music.js. Um nome de método trocado só apareceria como "o jogo fica mudo", porque toda chamada passa por um try/catch (mus) que nunca deixa o erro escapar.
const Music = require(path.join(__dirname, "../js/music.js"));
const gameCode = gameSrc.replace(/\/\/.*$/gm, ""); // (sem comentários de linha; nenhuma das strings do jogo que importam aqui tem "//")
// o texto de cada chamada mus((m) => ...) de js/game.js, da abertura ao parêntese que a fecha
function musCalls() {
  const out = [];
  for (const m of gameCode.matchAll(/\bmus\(\(m\) =>/g)) {
    let depth = 0, p = m.index + 3;
    for (; p < gameCode.length; p++) { const c = gameCode[p]; if (c === "(") depth++; else if (c === ")" && --depth === 0) break; }
    out.push(gameCode.slice(m.index, p + 1));
  }
  return out;
}

test("index.html: js/music.js vem depois de js/sound.js, depois dele vêm js/music-dog.js, js/music-cat.js e js/music-bird.js (nessa ordem), e tudo antes de js/game.js", () => {
  const scripts = [...read("index.html").matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  const at = (f) => { const i = scripts.indexOf(f); assert.ok(i >= 0, `index.html não carrega ${f}`); return i; };
  assert.ok(at("js/sound.js") < at("js/music.js"), "sound.js antes de music.js");
  assert.ok(at("js/music.js") < at("js/music-dog.js") && at("js/music-dog.js") < at("js/music-cat.js") && at("js/music-cat.js") < at("js/music-bird.js"), "music.js, e depois os temas do Cachorrinho, do Gatinho e do Passarinho");
  for (const f of ["js/music.js", "js/music-dog.js", "js/music-cat.js", "js/music-bird.js"]) { assert.ok(at(f) < at("js/game.js"), `${f} antes de game.js`); assert.ok(fs.existsSync(path.join(__dirname, "..", f)), `${f} existe (senão a página dá 404)`); }
  assert.strictEqual(scripts[scripts.length - 1], "js/game.js");
});

test("js/game.js cria o tocador com Music.create({ sound, storage }) logo depois do Sound, e toda chamada a ele passa por mus(), que não deixa erro nenhum escapar (nem a falta do módulo)", () => {
  assert.ok(/const sound = Sound\.create\([^;]*;\s*sound\.bindUnlock\(\);\s*const music = \(\(\) => \{ try \{ return typeof Music !== "undefined" && Music && typeof Music\.create === "function" \? Music\.create\(\{ sound, storage: safeStorage\(\) \}\) : null; \} catch \{ return null; \} \}\)\(\);/.test(gameSrc.replace(/\/\/[^\n]*/g, "")), "const music = Music.create({ sound, storage: safeStorage() }) dentro de um try/catch, logo depois de sound.bindUnlock()");
  assert.ok(/const mus = \(fn\) => \{ if \(!music\) return; try \{ fn\(music\); \} catch \{[^}]*\} \};/.test(gameCode), "mus(fn) chama fn(music) dentro de try/catch e não faz nada sem music");
  const outside = gameCode.replace(/const mus = [^\n]*\n/, "").split("\n").filter((l) => /\bmusic\.\w+\(/.test(l) && !/\bmus\(\(m\)/.test(l) && !/function (renderMusic|toggleMusic)/.test(l));
  const bad = outside.filter((l) => !/(const has = !!music, isOn = has && music\.isEnabled\(\)|get music\(\))/.test(l));
  assert.deepStrictEqual(bad, [], "chamada direta a music.x() fora do mus(): " + bad.join(" | "));
});

test("js/game.js -> Music: todo método que o jogo chama no tocador existe em Music.create (play, stop, duck, setDuck, pause, resume, toggleEnabled, isEnabled, tick...)", () => {
  const api = Music.create({}), calls = musCalls();
  assert.ok(calls.length >= 8, `o jogo chama o tocador em pelo menos 8 pontos (achou ${calls.length})`);
  const used = new Set();
  for (const c of calls) for (const m of c.matchAll(/\bm\.(\w+)/g)) used.add(m[1]);
  for (const m of gameCode.matchAll(/\bmusic\.(\w+)/g)) used.add(m[1]);
  const missing = [...used].filter((n) => !(n in api));
  assert.deepStrictEqual(missing, [], `game.js usa music.${missing.join(", music.")}, que Music.create não tem (o jogo ficaria mudo em silêncio). Os que existem: ${Object.keys(api).join(", ")}`);
  for (const n of ["play", "stop", "duck", "setDuck", "pause", "resume", "toggleEnabled", "isEnabled", "tick"]) { assert.ok(used.has(n), `o jogo deveria usar music.${n}`); assert.strictEqual(typeof api[n], "function", `music.${n} é função`); }
  assert.strictEqual(typeof Music.create({}).play("tema que não existe"), "boolean", "play devolve true/false (o jogo usa o false para silenciar a fase sem tema)");
});

test("js/game.js: setState e showScreen terminam chamando musicSync(); perder uma vida abaixa a música (0,3 por 0,8 s); o botão de som manda a música conferir o mudo; a tecla N, o botão e a aba escondida estão ligados", () => {
  for (const f of ["setState", "showScreen"]) assert.ok(/musicSync\(\);\s*\}$/.test(fnSrc(f).replace(/\s+$/, "")), `${f} termina com musicSync()`);
  assert.ok(/m\.duck\(0\.3, 0\.8\)/.test(fnSrc("loseLife")) && /sound\.play\("lifelost"/.test(fnSrc("loseLife")), "loseLife pede duck(0.3, 0.8)");
  assert.ok(!/m\.duck\(/.test(fnSrc("gameOver")), "a derrota não pede o abafado curto (só parar)");
  assert.ok(/m\.tick\(\)/.test(fnSrc("toggleSound")), "toggleSound manda a música conferir o mudo na hora");
  assert.ok(/m\.toggleEnabled\(\)/.test(fnSrc("toggleMusic")) && /renderMusic\(\)/.test(fnSrc("toggleMusic")), "toggleMusic liga e desliga a preferência e redesenha os botões");
  assert.ok(/k === "n" && !e\.repeat && !\(e\.target instanceof HTMLInputElement\) && !\(e\.target instanceof HTMLTextAreaElement\)\) \{ toggleMusic\(\); return; \}/.test(gameCode), "a tecla N chama toggleMusic (sem repetir e sem atrapalhar quem digita)");
  assert.ok(/on\("btn-music", toggleMusic\); on\("btn-music-pause", toggleMusic\);/.test(gameCode), "os dois botões chamam toggleMusic");
  assert.ok(/visibilitychange", \(\) => \{ mus\(\(m\) => \(document\.hidden \? m\.pause\(\) : m\.resume\(\)\)\); \}\)/.test(gameCode), "a aba escondida pausa a música e voltar a retoma");
  assert.ok(/addEventListener\("blur", \(\) => \{ mus\(\(m\) => m\.pause\(\)\); \}\)/.test(gameCode) && /addEventListener\("focus", \(\) => \{ if \(!document\.hidden\) mus\(\(m\) => m\.resume\(\)\); \}\)/.test(gameCode), "a janela sem foco pausa a música e o foco a retoma");
  assert.ok(/get music\(\) \{ return music; \}/.test(gameCode), "__game.music expõe o tocador para os testes");
  const html = read("index.html");
  for (const id of ["btn-music", "btn-music-pause"]) assert.ok(html.includes(`id="${id}"`), `o index.html tem #${id}`);
  const open = (gameSrc.match(/^\s*\/\/ ===== MÚSICA: integração =====\s*$/gm) || []).length, close = (gameSrc.match(/^\s*\/\/ ===== fim MÚSICA: integração =====\s*$/gm) || []).length;
  assert.ok(open >= 3 && open === close, `as regiões de bloco de js/game.js abrem e fecham (${open} e ${close})`);
});

test("musicSync() decide o tema de cada estado (rodando o código de js/game.js com um tocador de mentira): menu, fase, pausa, vitória, derrota, recomeço e fase sem tema", () => {
  const body = fnSrc("musicSync");
  const log = [], known = new Set(["menu", "dog1", "dog3", "dog4", "cat2", "bird20"]), fake = { paused: false, play(id, o) { log.push(o === undefined ? ["play", id] : ["play", id, o]); return known.has(id); }, stop(f) { log.push(["stop", f]); }, setDuck(l) { log.push(["setDuck", l]); }, resume() { log.push(["resume"]); this.paused = false; } };
  const doc = { hidden: false };
  const make = new Function("mus", "document", `let state = "menu", gameAnimal = "dog", levelId = 1, musicKey = "";\n${body}\nreturn { sync: musicSync, set(s, a, l) { state = s; gameAnimal = a; levelId = l; }, get key() { return musicKey; } };`);
  const g = make((fn) => fn(fake), doc);
  const step = (s, a, l) => { log.length = 0; g.set(s, a, l); g.sync(); return JSON.stringify(log); };
  assert.strictEqual(step("menu", "dog", 1), '[["setDuck",1],["play","menu"]]', "menu: abafado 1 e tema menu");
  assert.strictEqual(step("menu", "dog", 1), "[]", "o mesmo pedido de novo não faz nada (não reinicia o tema)");
  assert.strictEqual(step("playing", "dog", 3), '[["setDuck",1],["play","dog3"]]', "jogando a Fase 3 do Cachorrinho: dog3");
  assert.strictEqual(step("playing", "dog", 3), "[]");
  assert.strictEqual(step("paused", "dog", 3), '[["play","dog3"],["setDuck",0.25]]', "pausa: o mesmo tema, abafado a 0,25");
  assert.strictEqual(step("playing", "dog", 3), '[["setDuck",1],["play","dog3"]]', "continuar: sem abafar e sem restart");
  assert.strictEqual(step("won", "dog", 3), '[["stop",0.5]]', "vitória: stop(0,5)");
  assert.strictEqual(step("won", "dog", 3), "[]", "tela de reforços e pontuações da vitória: nada de novo");
  assert.strictEqual(step("playing", "dog", 4), '[["setDuck",1],["play","dog4",{"restart":true}]]', "a próxima fase começa depois da vitória: restart");
  assert.strictEqual(step("lost", "dog", 4), '[["stop",0.4]]', "derrota: stop(0,4)");
  assert.strictEqual(step("playing", "dog", 4), '[["setDuck",1],["play","dog4",{"restart":true}]]', "Tentar novamente: restart");
  assert.strictEqual(step("paused", "dog", 4), '[["play","dog4"],["setDuck",0.25]]');
  assert.strictEqual(step("menu", "dog", 4), '[["setDuck",1],["play","menu"]]', "da pausa direto para o menu: sem abafar e sem restart");
  assert.strictEqual(step("playing", "cat", 2), '[["setDuck",1],["play","cat2"]]', "o tema é o do bichinho da partida (gameAnimal), não o do menu");
  assert.strictEqual(step("playing", "bird", 20), '[["setDuck",1],["play","bird20"]]');
  assert.strictEqual(step("playing", "bird", 7), '[["setDuck",1],["play","bird7"],["stop",0.5]]', "fase sem tema registrado: a música anterior não continua (stop)");
  fake.paused = true; doc.hidden = false;
  assert.strictEqual(step("playing", "cat", 2), '[["resume"],["setDuck",1],["play","cat2"]]', "se a música ficou pausada e a aba está visível, começar a fase a retoma");
  fake.paused = true; doc.hidden = true;
  assert.ok(!step("menu", "dog", 1).includes("resume"), "com a aba escondida não retoma");
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes de fiação passaram");
