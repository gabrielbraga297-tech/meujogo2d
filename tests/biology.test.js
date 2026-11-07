// Testes (sem rede) da ferramenta de referências da «Biologia por trás» (0.24.0). Uso: node tests/biology.test.js (precisa de python3)
// A conferência com a rede (DOI x título x ano no Crossref e no Europe PMC) é `python3 tools/biology/build_refs.py`; aqui só se confere que o JSON gravado é o que a lista do script manda e que as regras de forma valem.
const assert = require("assert");
const path = require("path");
const { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, "..");
let failed = 0;
const test = (n, fn) => { try { fn(); console.log("OK   " + n); } catch (e) { failed++; console.log("FAIL " + n + "\n     " + e.message); } };

test("build_refs.py --offline: docs/biologia/referencias.json é o que a lista do script manda (ids, DOIs e listas de sem apoio e não encontradas)", () => {
  const r = spawnSync("python3", [path.join(ROOT, "tools/biology/build_refs.py"), "--offline"], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.ok(/ok: \d+ referências com apoio, \d+ sem apoio, \d+ não encontradas/.test(r.stdout), r.stdout);
});
test("lookup.py sem argumentos mostra o uso e sai com erro (sem tocar na rede)", () => {
  const r = spawnSync("python3", [path.join(ROOT, "tools/biology/lookup.py")], { encoding: "utf8" });
  assert.notStrictEqual(r.status, 0); assert.ok(/Uso:/.test(r.stdout + r.stderr));
});
test("o JSON de referências não traz nenhuma data futura nem fora da janela (2021 a 2026) e todo DOI começa com 10.", () => {
  const d = require(path.join(ROOT, "docs/biologia/referencias.json"));
  for (const r of [...d.refs, ...d.sem_apoio]) { assert.ok(r.year >= 2021 && r.year <= 2026, r.id); assert.ok(r.doi.startsWith("10."), r.id); }
});
console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram");
process.exit(failed ? 1 : 0);
