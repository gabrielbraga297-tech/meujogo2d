// Testes (sem navegador) da atualização sem cache velho (0.23.0): js/update.js (aviso de versão nova) e tools/publish/cache-bust.py (o selo ?v=<commit> nos endereços). Uso: node tests/update.test.js (precisa de python3)
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const U = require("../js/update.js");
const ROOT = path.join(__dirname, "..");

let failed = 0; const pending = [];
const test = (name, fn) => {
  const bad = (e) => { failed++; console.log("FAIL " + name + "\n     " + (e && e.message)); };
  try { const r = fn(); if (r && r.then) pending.push(r.then(() => console.log("OK   " + name), bad)); else console.log("OK   " + name); } catch (e) { bad(e); }
};
const fakeFetch = (body, ok = true) => async () => ({ ok, text: async () => body });
const V = (b) => `window.GAME_VERSION = { number: "0.23.0", date: "2026-11-07", founded: "2026-10-06", build: "${b}" };`;

test("parseBuild lê o código de commit da build e ignora \"dev\", lixo e texto vazio", () => {
  assert.strictEqual(U.parseBuild(V("abc1234")), "abc1234");
  assert.strictEqual(U.parseBuild(V("0123456789abcdef0123456789abcdef01234567")), "0123456789abcdef0123456789abcdef01234567");
  for (const x of [V("dev"), V("ABC1234"), V("abc12"), "", null, undefined, "<html>404</html>", 42]) assert.strictEqual(U.parseBuild(x), null, String(x));
});
test("isNewer: só com dois códigos de commit diferentes (nunca com \"dev\", nunca iguais)", () => {
  assert.strictEqual(U.isNewer("abc1234", "def5678"), true);
  assert.strictEqual(U.isNewer("abc1234", "abc1234"), false);
  assert.strictEqual(U.isNewer("dev", "def5678"), false);
  assert.strictEqual(U.isNewer("abc1234", null), false);
  assert.strictEqual(U.isNewer(undefined, "def5678"), false);
});
test("check: pergunta sem usar o que está guardado (cache no-store), responde true só com build diferente e NUNCA lança erro", async () => {
  let seen = null;
  const spy = async (url, init) => { seen = { url, init }; return { ok: true, text: async () => V("def5678") }; };
  assert.strictEqual(await U.check({ fetchFn: spy, current: "abc1234", url: "https://x.test/js/version.js?t=1" }), true);
  assert.strictEqual(seen.init.cache, "no-store"); assert.strictEqual(seen.init.credentials, "omit"); assert.ok(/version\.js/.test(seen.url));
  assert.strictEqual(await U.check({ fetchFn: fakeFetch(V("abc1234")), current: "abc1234", url: "u" }), false, "mesma build: sem aviso");
  assert.strictEqual(await U.check({ fetchFn: fakeFetch(V("def5678")), current: "dev", url: "u" }), false, "build dev: nem pergunta");
  assert.strictEqual(await U.check({ fetchFn: fakeFetch("404", false), current: "abc1234", url: "u" }), false, "resposta com erro");
  assert.strictEqual(await U.check({ fetchFn: fakeFetch("<html>pagina de erro</html>"), current: "abc1234", url: "u" }), false, "resposta estranha");
  assert.strictEqual(await U.check({ fetchFn: async () => { throw new Error("sem internet"); }, current: "abc1234", url: "u" }), false, "sem internet");
  assert.strictEqual(await U.check({ current: "abc1234", url: "u" }), false, "sem fetch");
  assert.strictEqual(await U.check(null), false);
});
test("o intervalo mínimo entre perguntas é de 5 minutos", () => assert.strictEqual(U.MIN_GAP_MS, 300000));

const run = (dir, sha) => spawnSync("python3", [path.join(ROOT, "tools/publish/cache-bust.py"), dir, sha], { encoding: "utf8" });
const mkSite = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "cb-")); fs.copyFileSync(path.join(ROOT, "index.html"), path.join(d, "index.html")); return d; };
test("cache-bust.py: todo js/ e css/ do index.html ganha ?v=<commit>; mais nada muda; rodar de novo é igual; trocar o código troca o selo", () => {
  const d = mkSite(), before = fs.readFileSync(path.join(d, "index.html"), "utf8");
  const r = run(d, "abc1234"); assert.strictEqual(r.status, 0, r.stderr);
  const after = fs.readFileSync(path.join(d, "index.html"), "utf8");
  const refs = (h) => [...h.matchAll(/(?:<script src|<link rel="stylesheet" href)="((?:js|css)\/[^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(refs(after).length, refs(before).length); assert.ok(refs(after).length >= 25, "esperava ~29 endereços");
  assert.ok(refs(after).every((u) => u.endsWith("?v=abc1234")), refs(after).filter((u) => !u.endsWith("?v=abc1234")).join(","));
  assert.strictEqual(after.replace(/\?v=abc1234/g, ""), before, "o selo é a única diferença");
  assert.strictEqual(run(d, "abc1234").status, 0); assert.strictEqual(fs.readFileSync(path.join(d, "index.html"), "utf8"), after, "idempotente");
  assert.strictEqual(run(d, "def5678").status, 0); const again = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.strictEqual(again.replace(/\?v=def5678/g, ""), before); assert.ok(!/abc1234/.test(again), "o selo antigo sai");
});
test("cache-bust.py: recusa código que não é de commit e pasta sem index.html", () => {
  const d = mkSite();
  for (const bad of ["dev", "ABC1234", "abc", "abc1234; rm -rf /", ""]) assert.notStrictEqual(run(d, bad).status, 0, `aceitou ${JSON.stringify(bad)}`);
  assert.notStrictEqual(run(os.tmpdir() + "/nao-existe-" + process.pid, "abc1234").status, 0);
});
test("o workflow do GitHub Pages carimba a build E os endereços (e confere que o selo entrou)", () => {
  const y = fs.readFileSync(path.join(ROOT, ".github/workflows/pages.yml"), "utf8");
  assert.ok(/sed -i "s\/build: \\"dev\\"\/build: \\"\$\{GITHUB_SHA::7\}\\"\/" _site\/js\/version\.js/.test(y), "carimbo da build");
  assert.ok(/python3 tools\/publish\/cache-bust\.py _site "\$\{GITHUB_SHA::7\}"/.test(y), "chama o cache-bust");
  assert.ok(/grep -q "js\/game\.js\?v=\$\{GITHUB_SHA::7\}" _site\/index\.html/.test(y), "confere o selo");
  assert.ok(/cp -r index\.html css js _site\//.test(y), "copia index.html, css e js");
});
test("index.html: js/update.js vem depois de version.js e antes de game.js; o botão de atualizar existe e começa escondido", () => {
  const h = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), at = (f) => h.indexOf(`src="${f}"`);
  assert.ok(at("js/version.js") > 0 && at("js/update.js") > at("js/version.js") && at("js/update.js") < at("js/game.js"));
  assert.ok(/<button id="btn-update"[^>]*class="[^"]*\bhidden\b[^"]*"/.test(h));
});

Promise.all(pending).then(() => { console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram"); process.exit(failed ? 1 : 0); });
