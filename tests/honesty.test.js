// Honestidade científica do Gatinho (0.18.0). Uso: node tests/honesty.test.js
// A rede do ambiente de desenvolvimento bloqueou os sites de artigos: NENHUM artigo foi aberto e nada do Gatinho está verificado em fonte. Este teste impede que o projeto volte a parecer o contrário:
//  1. nenhuma citação de artigo (et al., doi, ano entre parênteses) no README, no CHANGELOG, no código, no index.html nem nos documentos de docs/: elas só podem estar em docs/pesquisa-gatinho/ (as pistas, marcadas "não verificado");
//  2. nenhuma pista de docs/pesquisa-gatinho/ marcada "Verificado: SIM";
//  3. a tabela "Biologia por trás do Gatinho" do README diz "escolha de design" em todas as linhas e ninguém diz que TODO traço é "inspirado em literatura" (só algumas linhas têm uma pista, não verificada).
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const list = (dir, re) => fs.readdirSync(path.join(root, dir)).filter((f) => re.test(f)).sort().map((f) => path.join(dir, f));
let failed = 0;
const test = (name, fn) => { try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); } };

const CITATION = /et al\.|doi\.org|10\.\d{4}\/|\((19|20)\d\d\)/g;
// Exceções explícitas: onde o texto MENCIONA o bloqueio dos sites de artigos pelo nome (não é uma citação).
const ALLOWED = [{ file: "README.md", line: /bloqueou todos os sites de artigos/, match: /^doi\.org$/ }];

const FILES = ["README.md", "CHANGELOG.md", "index.html", ...list("js", /\.js$/), ...list("docs", /\.md$/)];

test("há arquivos para conferir (README, CHANGELOG, index.html, js/*.js e docs/*.md) e a pasta de pesquisa existe", () => {
  assert.ok(FILES.length >= 10 && FILES.includes("README.md") && FILES.includes("docs/GATINHO-DESENHO.md") && FILES.includes("js/game.js"), FILES.join(", "));
  assert.ok(fs.existsSync(path.join(root, "docs/pesquisa-gatinho/LEIAME.md")));
});

test("nenhuma citação de artigo (et al., doi.org, 10.xxxx/, ano entre parênteses) fora de docs/pesquisa-gatinho/", () => {
  const bad = [];
  for (const f of FILES) {
    read(f).split("\n").forEach((line, i) => {
      for (const m of line.matchAll(CITATION)) {
        if (ALLOWED.some((a) => a.file === f && a.line.test(line) && a.match.test(m[0]))) continue;
        bad.push(`${f}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`);
      }
    });
  }
  assert.deepStrictEqual(bad, [], "citação fora da pasta de pesquisa (use só as pistas de docs/pesquisa-gatinho/):\n     " + bad.join("\n     "));
});

test("a exceção explícita existe de verdade (README cita doi.org só na lista de sites bloqueados)", () => {
  const hits = read("README.md").split("\n").filter((l) => /doi\.org/.test(l));
  assert.ok(hits.length >= 1 && hits.every((l) => ALLOWED[0].line.test(l)), "a exceção do teste não corresponde a nenhuma linha do README (ou há doi.org em outro lugar)");
});

test("nenhuma pista de docs/pesquisa-gatinho/ está marcada como \"Verificado: SIM\"", () => {
  const files = list("docs/pesquisa-gatinho", /\.md$/);
  assert.ok(files.length >= 6, "faltam arquivos da pesquisa: " + files.join(", "));
  const bad = [];
  for (const f of files) read(f).split("\n").forEach((line, i) => { if (/Verificado: *SIM/i.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`); });
  assert.deepStrictEqual(bad, []);
});

test("a tabela \"Biologia por trás do Gatinho\" do README tem \"escolha de design\" em todas as linhas", () => {
  const readme = read("README.md"), a = readme.indexOf("## Biologia por trás do Gatinho");
  assert.ok(a >= 0, "falta a seção Biologia por trás do Gatinho");
  const rest = readme.slice(a + 5), b = rest.search(/\n## /), sec = b < 0 ? rest : rest.slice(0, b);
  const rows = sec.split("\n").filter((l) => /^\|/.test(l) && !/^\|[-| ]+\|$/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  assert.ok(rows.length >= 9 && /Situação/.test(rows[0].join("|")), "tabela com cabeçalho e pelo menos 8 traços (achou " + rows.length + " linhas)");
  for (const r of rows.slice(1)) assert.ok(/escolha de design/i.test(r[r.length - 1]), `a linha "${r[0]}" não diz "escolha de design" na Situação ("${r[r.length - 1]}")`);
  assert.ok(/nenhum artigo foi aberto/i.test(sec) && /nada abaixo está verificado/i.test(sec), "a seção deve dizer que nenhum artigo foi aberto e nada está verificado");
});

test("ninguém diz que TODO traço do Gatinho é \"inspirado em literatura\" (só há pista, não verificada, onde a tabela do README indica; a arrancada e o pelo molhado não têm nem pista)", () => {
  const bad = [];
  for (const f of [...FILES, ...list("docs/pesquisa-gatinho", /\.md$/)]) read(f).split("\n").forEach((line, i) => { if (/(todo|todos os) (o )?(traço|traços|números?)[^.|]{0,200}inspirad[ao]s? em literatura/i.test(line) || /TODOS OS NÚMEROS[^.]{0,80}INSPIRAD/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 110)}`); });
  assert.deepStrictEqual(bad, [], "afirmação exagerada:\n     " + bad.join("\n     "));
  const r = read("README.md");
  assert.ok(/nada recente achado/.test(r) && /só análogos de outros mamíferos/.test(r), "a tabela deve dizer que a arrancada e o pelo molhado não têm pista");
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de honestidade passaram");
process.exit(failed ? 1 : 0);
