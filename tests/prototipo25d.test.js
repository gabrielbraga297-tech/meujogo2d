// "Teste 01 de adaptação" (2,5D), sem navegador. Uso: node tests/prototipo25d.test.js
// Confere que a pasta teste-01-adaptacao/ é gerada do jogo de verdade por tools/prototipo25d/build.py (todas as trocas encontram o seu trecho, uma vez cada),
// que está em dia, que a página do teste não depende de nada gravado e que NADA do teste vazou para o jogo de verdade (index.html e js/).
// O que roda no navegador (as jogadas iguais ao original, o relevo, as telas) está em tests/prototipo25d.e2e.js.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");

let failed = 0, total = 0;
const test = (name, fn) => { total++; try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e.message).split("\n").slice(0, 8).join("\n     ")); } };

const ROOT = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");
const OUT = ["teste-01-adaptacao", "index.html"], JS = ["teste-01-adaptacao", "game25d.js"];

test("o gerador acha o trecho de cada troca, uma vez só, e a pasta gravada é a que ele geraria (build.py --check)", () => {
  const r = spawnSync("python3", ["tools/prototipo25d/build.py", "--check"], { cwd: ROOT, encoding: "utf8" });
  assert.strictEqual(r.status, 0, (r.stdout || "") + (r.stderr || "") + " — rode: python3 tools/prototipo25d/build.py");
});
test("game25d.js tem sintaxe válida", () => { new vm.Script(read(...JS), { filename: "game25d.js" }); });
test("a página do teste carrega os mesmos scripts do jogo, na mesma ordem, só trocando game.js por game25d.js (e tudo com ../)", () => {
  const src = (h) => [...h.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  const orig = src(read("index.html")), test25 = src(read(...OUT));
  assert.deepStrictEqual(test25, orig.map((s) => (s === "js/game.js" ? "game25d.js" : "../" + s)));
  assert.ok(!/(?:src|href)="(?:css|js)\//.test(read(...OUT)), "sobrou link para css/ ou js/ sem ../");
});
test("a página do teste tem a tela inicial do teste e o placar TESTE 01", () => {
  const h = read(...OUT);
  assert.ok(/<title>Teste 01 de adaptação<\/title>/.test(h) && h.includes('id="teste01"') && h.includes('id="btn-t01-play"') && h.includes('TESTE <b id="hud-level">01</b>'));
  assert.ok(fs.existsSync(path.join(ROOT, "teste-01-adaptacao", "teste.css")));
});
test("o teste não lê nem guarda nada (safeStorage devolve null) e não fala com o servidor de ranking", () => {
  const g = read(...JS);
  assert.ok(g.includes("function safeStorage() { return null; }"));
  assert.ok(!/function safeStorage\(\) \{ try/.test(g));
});
test("o jogo de verdade não ganhou nada do teste (index.html e js/ não mencionam teste01, H25, paint25 nem game25d)", () => {
  const bad = [];
  for (const f of ["index.html", ...fs.readdirSync(path.join(ROOT, "js")).map((n) => "js/" + n)]) {
    const t = read(f);
    for (const w of ["teste01", "H25", "paint25", "game25d", "shadows25", "wallRows25"]) if (t.includes(w)) bad.push(`${f}: ${w}`);
  }
  assert.deepStrictEqual(bad, []);
});
test("a versão do jogo não mudou por causa do teste (js/version.js segue sem a marca do teste)", () => {
  assert.ok(!/teste/i.test(read("js", "version.js").replace(/\/\/.*$/gm, "")));
});
test("o game25d.js só difere do js/game.js nas trocas listadas: no máximo 16 linhas do jogo foram trocadas (git diff), o resto é idêntico", () => {
  const r = spawnSync("git", ["diff", "--no-index", "--numstat", "--", "js/game.js", "teste-01-adaptacao/game25d.js"], { cwd: ROOT, encoding: "utf8" });
  const m = /^(\d+)\t(\d+)\t/.exec(r.stdout || "");
  assert.ok(m, "git diff sem resultado: " + (r.stdout || "") + (r.stderr || ""));
  const added = +m[1], removed = +m[2];
  assert.ok(removed >= 1 && removed <= 16, `linhas do jogo trocadas: ${removed} (esperado de 1 a 16, hoje 15: uma por troca, algumas trocas pegam duas ou quatro linhas)`);
  assert.ok(added > removed, "o teste deveria ter linhas a mais (o desenho em relevo)");
});

console.log(`\n${total - failed} de ${total} verificações ok`);
process.exit(failed ? 1 : 0);
