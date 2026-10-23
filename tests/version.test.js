// Confere a versão do jogo (js/version.js) com o CHANGELOG.md e o README. Uso: node tests/version.test.js
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
let failed = 0;
const test = (name, fn) => { try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); } };

const sandbox = { window: {} };
vm.runInNewContext(read("js/version.js"), sandbox);
const V = sandbox.window.GAME_VERSION;

test("js/version.js define número, data e build", () => {
  assert.ok(V && typeof V === "object");
  assert.match(V.number, /^\d+\.\d+\.\d+$/, "número no formato 1.2.3");
  assert.match(V.date, /^\d{4}-\d{2}-\d{2}$/, "data no formato AAAA-MM-DD");
  assert.ok(!Number.isNaN(Date.parse(V.date)), "data válida");
  assert.strictEqual(V.build, "dev", 'no código o build é "dev" (o workflow carimba o commit)');
  assert.ok(V.stage === undefined || (typeof V.stage === "string" && V.stage.length <= 30), "stage é opcional e curto");
});

test("js/version.js tem a data de fundação (primeiro commit, 06/10/2026), que não é depois da versão", () => {
  assert.match(V.founded, /^\d{4}-\d{2}-\d{2}$/, "founded no formato AAAA-MM-DD");
  assert.ok(!Number.isNaN(Date.parse(V.founded)), "data de fundação válida");
  assert.strictEqual(new Date(V.founded).toISOString().slice(0, 10), V.founded, "o dia existe no calendário");
  assert.strictEqual(V.founded, "2026-10-06", "o jogo foi fundado em 06/10/2026");
  assert.ok(V.founded <= V.date, "o jogo não pode ser fundado depois da versão atual");
});

test("o CHANGELOG marca 'em preparação' na entrada do topo se, e só se, js/version.js tem stage", () => {
  const head = read("CHANGELOG.md").match(/^## .*$/m)[0];
  assert.strictEqual(/\(em preparação\)/.test(head), !!V.stage, `cabeçalho do topo: "${head}" / stage: ${JSON.stringify(V.stage)}`);
});

test("sem stage em js/version.js, nenhuma entrada do CHANGELOG diz '(em preparação)'", () => {
  const marked = [...read("CHANGELOG.md").matchAll(/^## .*\(em preparação\).*$/gm)].map((m) => m[0]);
  if (!V.stage) assert.deepStrictEqual(marked, [], `entradas ainda marcadas: ${marked.join(" | ")}`);
});

test("o CHANGELOG começa pela versão atual, com a mesma data", () => {
  const first = read("CHANGELOG.md").match(/^## (\d+\.\d+\.\d+) — (\d{2})\/(\d{2})\/(\d{4})/m); // aceita " (em preparação)" depois da data
  assert.ok(first, "há uma versão no CHANGELOG");
  assert.strictEqual(first[1], V.number, "versão do topo do CHANGELOG = js/version.js");
  assert.strictEqual(`${first[4]}-${first[3]}-${first[2]}`, V.date, "data do CHANGELOG = js/version.js");
});

test("as versões do CHANGELOG vão da mais nova para a mais antiga", () => {
  const nums = [...read("CHANGELOG.md").matchAll(/^## (\d+)\.(\d+)\.(\d+) —/gm)].map((m) => m.slice(1).map(Number));
  assert.ok(nums.length >= 3);
  for (let i = 1; i < nums.length; i++) {
    const [a, b] = [nums[i - 1], nums[i]];
    assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), `versão ${a.join(".")} deve ser maior que ${b.join(".")}`);
  }
});

test("index.html carrega version.js antes do game.js e tem o lugar da versão no menu", () => {
  const html = read("index.html");
  assert.ok(html.indexOf("js/version.js") !== -1 && html.indexOf("js/version.js") < html.indexOf("js/game.js"));
  assert.ok(/id="menu-version"/.test(html));
  assert.ok(/id="menu-founded"/.test(html), "o menu tem o lugar da data de fundação");
});

test("o workflow do GitHub Pages carimba o commit na versão e confere", () => {
  const wf = read(".github/workflows/pages.yml");
  assert.ok(/js\/version\.js/.test(wf) && /GITHUB_SHA/.test(wf) && /grep -q/.test(wf));
  // simula o carimbo do workflow
  const stamped = read("js/version.js").replace('build: "dev"', 'build: "abc1234"');
  const sb = { window: {} }; vm.runInNewContext(stamped, sb);
  assert.strictEqual(sb.window.GAME_VERSION.build, "abc1234");
});

test("o README fala da versão e do CHANGELOG", () => {
  const readme = read("README.md");
  assert.ok(/CHANGELOG\.md/.test(readme) && /Versão/.test(readme));
  assert.ok(readme.includes(`Versão ${V.number} ·`), `o exemplo do README mostra a versão atual (Versão ${V.number} · ...)`);
  assert.ok(read("CHANGELOG.md").includes(`Versão ${V.number} ·`), `o exemplo do CHANGELOG mostra a versão atual (Versão ${V.number} · ...)`);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de versão passaram");
process.exit(failed ? 1 : 0);
