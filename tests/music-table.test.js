// Confere a tabela dos temas do README com a gerada por tools/music-table.js a partir das receitas registradas. Uso: node tests/music-table.test.js
// Se uma receita mudou (ou os temas dos três bichinhos foram registrados), o trecho do README entre <!-- music-table:inicio --> e <!-- music-table:fim --> fica velho: o teste falha e diz o comando que o refaz.
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tool = require(path.join(root, "tools/music-table.js"));
const Music = require(path.join(root, "js/music.js"));
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
let failed = 0;
const test = (name, fn) => { try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e.message).split("\n").slice(0, 12).join("\n     ")); } };

test("a tabela tem uma linha por tema registrado, na ordem menu, Cachorrinho, Gatinho e Passarinho, sem ids repetidos e sem valores vazios", () => {
  const rows = tool.rows(), ids = rows.map((r) => r[0]);
  assert.strictEqual(rows.length, Music.ids().length, "uma linha por tema registrado");
  assert.strictEqual(new Set(ids).size, ids.length, "ids repetidos na tabela");
  assert.strictEqual(ids[0], "menu", "o menu vem primeiro");
  const rank = (id) => ({ menu: 0, dog: 1, cat: 2, bird: 3 }[id.replace(/\d+$/, "")]), num = (id) => Number(id.replace(/\D+/g, "") || 0);
  for (let i = 1; i < ids.length; i++) assert.ok(rank(ids[i - 1]) < rank(ids[i]) || (rank(ids[i - 1]) === rank(ids[i]) && num(ids[i - 1]) < num(ids[i])), `ordem errada: ${ids[i - 1]} antes de ${ids[i]}`);
  for (const r of rows) {
    assert.strictEqual(r.length, tool.HEAD.length, `${r[0]}: número de colunas`);
    for (const c of r) assert.ok(String(c).length > 0 && !/undefined|NaN|null|\[object/.test(String(c)), `${r[0]}: valor vazio ou estranho "${c}"`);
    assert.ok(/^\d+,\d$/.test(r[10]) && Number(r[10].replace(",", ".")) >= 40 && Number(r[10].replace(",", ".")) <= 100, `${r[0]}: duração do laço ${r[10]} fora de 40 a 100 s`);
    assert.ok(["4/4", "3/4", "6/8"].includes(r[5]), `${r[0]}: compasso ${r[5]}`);
  }
});

test("a tabela é determinística (duas gerações dão o mesmo texto) e é uma tabela de Markdown com cabeçalho e separador", () => {
  const a = tool.table(), b = tool.table(), lines = a.split("\n");
  assert.strictEqual(a, b);
  assert.strictEqual(lines.length, tool.rows().length + 2);
  assert.ok(lines[0].startsWith("| Tema |") && /^\|(---\|){11}$/.test(lines[1]), "cabeçalho e separador");
  assert.ok(lines.every((l) => l.startsWith("|") && l.endsWith("|")));
  assert.deepStrictEqual(lines.slice(2).map((l) => l.split(" | ").length), lines.slice(2).map(() => tool.HEAD.length), "cada linha tem as 11 colunas (sem barra solta dentro de uma célula)");
});

test("o README tem a seção Músicas tema (0.21.0) com os marcadores da tabela, uma vez cada", () => {
  assert.ok(readme.includes("\n## Músicas tema (0.21.0)"), "falta a seção");
  assert.strictEqual(readme.split(tool.START).length, 2, "um marcador de início");
  assert.strictEqual(readme.split(tool.END).length, 2, "um marcador de fim");
  assert.ok(readme.indexOf(tool.START) > readme.indexOf("\n## Músicas tema (0.21.0)") && readme.indexOf(tool.END) < readme.indexOf("\n## Vidas"), "os marcadores ficam dentro da seção");
});

test("a tabela do README é igual à gerada pelas receitas registradas (se falhar: node tools/music-table.js --write)", () => {
  const inReadme = tool.inReadme(readme), gen = tool.table();
  assert.ok(inReadme !== null, "o README não tem o trecho da tabela");
  if (inReadme !== gen) {
    const a = inReadme.split("\n"), b = gen.split("\n"), diff = [];
    for (let i = 0; i < Math.max(a.length, b.length) && diff.length < 4; i++) if (a[i] !== b[i]) diff.push(`linha ${i + 1} da tabela:\n       README:  ${(a[i] || "(falta)").slice(0, 150)}\n       gerada:  ${(b[i] || "(falta)").slice(0, 150)}`);
    assert.fail(`a tabela dos temas do README está diferente da gerada (README: ${a.length - 2} temas, gerada: ${b.length - 2}).\n     Para refazer o trecho do README, rode:  ${tool.COMMAND}\n     ${diff.join("\n     ")}`);
  }
});

console.log(failed ? `\n${failed} falha(s)` : "\nA tabela dos temas confere");
process.exit(failed ? 1 : 0);
