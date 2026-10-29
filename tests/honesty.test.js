// Honestidade científica do Gatinho (0.18.0) e do Passarinho (0.20.0). Uso: node tests/honesty.test.js
// A rede do ambiente de desenvolvimento bloqueou os sites de artigos: NENHUM artigo foi aberto e nada do Gatinho nem do Passarinho está verificado em fonte. Este teste impede que o projeto volte a parecer o contrário:
//  1. nenhuma citação de artigo (et al., doi, ano entre parênteses) no README, no CHANGELOG, no código, no index.html nem nos documentos de docs/: elas só podem estar em docs/pesquisa-gatinho/ (as pistas, marcadas "não verificado");
//  2. nenhuma pista de docs/pesquisa-gatinho/ marcada "Verificado: SIM";
//  3. a tabela "Biologia por trás do Gatinho" do README diz "escolha de design" em todas as linhas e ninguém diz que TODO traço é "inspirado em literatura" (só algumas linhas têm uma pista, não verificada).
// Passarinho (0.20.0), regime mais estrito (nenhuma busca foi feita: não há nem pista achada, só temas e palavras-chave):
//  4. docs/pesquisa-passarinho/ (LEIAME e P1 a P5): cada arquivo diz que é NÃO VERIFICADO e que nenhum artigo foi aberto; nenhuma citação de artigo (a menos que a MESMA linha diga "NÃO ABERTO"); nenhum "Verificado: SIM";
//  5. a tabela "Biologia por trás do Passarinho" do README: "escolha de design" em todas as linhas, a seção diz que nenhum artigo foi aberto e que nada está verificado, e toda pista (P1 a P5) aponta para um arquivo que existe;
//  6. nas seções do Passarinho do README e nos arquivos de docs/pesquisa-passarinho/: nenhuma afirmação de verificação ("está verificado", "segundo um estudo", "estudos mostram"...), nenhum artigo citado como aberto,
//     nenhuma espécie ou raça (o Passarinho é genérico) e nenhum rótulo interno de trabalho.
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

// ---- Passarinho (0.20.0) ----
const BIRD_DIR = "docs/pesquisa-passarinho";
const BIRD_FILES = () => (fs.existsSync(path.join(root, BIRD_DIR)) ? list(BIRD_DIR, /\.md$/) : []);
// as seções do Passarinho no README (a história, a tabela e a biologia), cada uma de um cabeçalho "## " ao próximo
const section = (readme, title) => { const a = readme.indexOf("\n## " + title); if (a < 0) return null; const rest = readme.slice(a + 5), b = rest.search(/\n## /); return b < 0 ? rest : rest.slice(0, b); };
const BIRD_SECTIONS = ["Passarinho (0.20.0)", "Tabela das fases do Passarinho (0.20.0)", "Biologia por trás do Passarinho (0.20.0)"];
// o texto do Passarinho que vale conferir: as seções do README + os arquivos de pesquisa + o desenho dos mapas
const birdTexts = () => {
  const readme = read("README.md"), out = [];
  for (const t of BIRD_SECTIONS) { const sec = section(readme, t); if (sec) out.push({ name: `README.md, seção "${t}"`, text: sec }); }
  for (const f of BIRD_FILES()) out.push({ name: f, text: read(f) });
  if (fs.existsSync(path.join(root, "docs/PASSARINHO-DESENHO.md"))) out.push({ name: "docs/PASSARINHO-DESENHO.md", text: read("docs/PASSARINHO-DESENHO.md") });
  return out;
};
// uma afirmação só deixa de valer como "afirmação" se vier negada na MESMA oração ("nada abaixo está verificado", "nenhum artigo foi aberto"): olha o trecho antes dela, desde o último . ; : | ( ) —
// (\b do JavaScript só entende letras sem acento; por isso as bordas das palavras são conferidas com \p{L})
const NEG = /(?<!\p{L})(não|nao|nada|nenhum[a]?|nunca|jamais|nem)(?!\p{L})/iu;
const negated = (line, idx) => NEG.test(line.slice(Math.max(0, idx - 70), idx).split(/[.;:|()—]/).pop());
const CLAIMS = [
  /\b(est[áa]|foi|foram|s[ãa]o|ficou|ficaram) (todos? )?(verificad[oa]s?|comprovad[oa]s?|confirmad[oa]s?|testad[oa]s? em (artigo|estudo|literatura))\b/gi,
  /\bverificad[oa]s? (em|por|na|no) (artigo|artigos|estudo|estudos|literatura|fonte|fontes|pesquisa)/gi,
  /\b(segundo|de acordo com|conforme) (um |o |os |uns )?(estudo|estudos|artigo|artigos|pesquisa|pesquisas|cientistas)\b/gi,
  /\b(estudos?|pesquisas?|artigos?|cientistas) (mostra[mn]?|comprova[mn]?|demonstra[mn]?|indica[mn]?|provam?|revela[mn]?|descobriram|mostraram|comprovaram)\b/gi,
  /\bbaseado[as]? em (artigos?|estudos?|literatura|pesquisas? científicas?)\b/gi,
  /\b(artigos?|estudos?) (foi|foram|está|estão) (abert[oa]s?|conferid[oa]s?|lid[oa]s?|verificad[oa]s?)\b/gi,
  /\b(abri|abrimos|li|lemos|conferi|conferimos) (o|um|os|dois|vários) (artigo|artigos|estudo|estudos)\b/gi,
  /\bcomprovado cientificamente\b|\bcientificamente (comprovad|verificad)/gi,
  /\bpassarinhos? de verdade (fazem|têm|tem|voam|comem|fogem)\b/gi,
];
const SPECIES = /(?<!\p{L})(sabiá|sabia|bem-te-vi|pardal|canário|canario|beija-flor|andorinha|pombo|pomba|papagaio|periquito|tucano|coruja|falcão|falcao|harpia|carcará|carcara|joão-de-barro|tico-tico|rolinha|gaivota|sanhaço|passer|columba|sparrow\w*|robin|pigeon|finch|blackbird|wren|starling|swallow|hummingbird|parrot|owl|falcon|kestrel|eagle|great tit|blue tit|raça|breed)(?!\p{L})/giu;
const INTERNAL = /\bA5\b|\bfrentes?\s+[A-Z]\b|\bwip-\d|scratchpad|\bcoordenador\b|\bagente de (mapas|sons|arte|documentação)\b/gi;
const CIT_BIRD = /et al\.|doi\.org|10\.\d{4}\/|\((19|20)\d\d\)/g;

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
  for (const f of [...FILES, ...list("docs/pesquisa-gatinho", /\.md$/), ...BIRD_FILES()]) read(f).split("\n").forEach((line, i) => { if (/(todo|todos os) (o )?(traço|traços|números?)[^.|]{0,200}inspirad[ao]s? em literatura/i.test(line) || /TODOS OS NÚMEROS[^.]{0,80}INSPIRAD/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 110)}`); });
  assert.deepStrictEqual(bad, [], "afirmação exagerada:\n     " + bad.join("\n     "));
  const r = read("README.md");
  assert.ok(/nada recente achado/.test(r) && /só análogos de outros mamíferos/.test(r), "a tabela deve dizer que a arrancada e o pelo molhado não têm pista");
});

// ======================================================= Passarinho (0.20.0) =======================================================
test("Passarinho: docs/pesquisa-passarinho/ existe, com o LEIAME e P1 a P5, e cada arquivo diz que é NÃO VERIFICADO e que nenhum artigo foi aberto", () => {
  const files = BIRD_FILES();
  assert.ok(files.includes(BIRD_DIR + "/LEIAME.md"), "falta " + BIRD_DIR + "/LEIAME.md");
  for (const n of [1, 2, 3, 4, 5]) assert.ok(files.some((f) => new RegExp(`/P${n}-[^/]+\\.md$`).test(f)), `falta o arquivo P${n}-*.md em ${BIRD_DIR}`);
  assert.ok(files.length >= 6, "faltam arquivos da pesquisa: " + files.join(", "));
  for (const f of files) {
    const t = read(f);
    assert.ok(/N[ÃA]O VERIFICAD[OA]/i.test(t), `${f}: deve dizer que é NÃO VERIFICADO`);
    assert.ok(/nenhum artigo (foi|foram)? ?aberto|nenhum artigo foi aberto|esta página não cita nenhum/i.test(t), `${f}: deve dizer que nenhum artigo foi aberto`);
  }
  assert.ok(/nenhuma busca foi feita|nenhuma busca/i.test(read(BIRD_DIR + "/LEIAME.md")), "o LEIAME deve dizer que nenhuma busca foi feita (não há pista achada, só temas)");
});

test("Passarinho: nenhuma citação de artigo em docs/pesquisa-passarinho/ (et al., doi.org, 10.xxxx/, ano entre parênteses), a não ser em linha que diga \"NÃO ABERTO\"", () => {
  const bad = [];
  for (const f of BIRD_FILES()) read(f).split("\n").forEach((line, i) => { for (const m of line.matchAll(CIT_BIRD)) if (!/N[ÃA]O ABERTO/.test(line)) bad.push(`${f}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`); });
  assert.deepStrictEqual(bad, [], "citação sem \"NÃO ABERTO\":\n     " + bad.join("\n     "));
});

test("Passarinho: nenhum arquivo de pesquisa está marcado como \"Verificado: SIM\"", () => {
  const bad = [];
  for (const f of BIRD_FILES()) read(f).split("\n").forEach((line, i) => { if (/Verificad[oa]: *SIM/i.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`); });
  assert.deepStrictEqual(bad, []);
});

test("Passarinho: a tabela \"Biologia por trás do Passarinho\" do README tem \"escolha de design\" em todas as linhas e a seção diz que nenhum artigo foi aberto e que nada está verificado", () => {
  const sec = section(read("README.md"), "Biologia por trás do Passarinho (0.20.0)");
  assert.ok(sec, "falta a seção Biologia por trás do Passarinho (0.20.0)");
  const rows = sec.split("\n").filter((l) => /^\|/.test(l) && !/^\|[-| ]+\|$/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  assert.ok(rows.length >= 11 && /Situação/.test(rows[0].join("|")), "tabela com cabeçalho e pelo menos 10 traços (achou " + rows.length + " linhas)");
  for (const r of rows.slice(1)) assert.ok(/^escolha de design/i.test(r[r.length - 1]), `a linha "${r[0]}" não começa com "escolha de design" na Situação ("${r[r.length - 1]}")`);
  assert.ok(/nenhum artigo foi aberto/i.test(sec) && /nada abaixo está verificado/i.test(sec), "a seção deve dizer que nenhum artigo foi aberto e nada abaixo está verificado");
  assert.ok(/nenhum autor, ano, periódico, volume ou DOI é citado/i.test(sec), "a seção deve dizer que a coluna de pistas não cita autor, ano, periódico, volume nem DOI");
  // as pistas apontam para arquivos que existem (P1 a P5)
  const files = BIRD_FILES(), refs = [...new Set([...sec.matchAll(/\(P(\d+)\)/g)].map((m) => m[1]))];
  assert.ok(refs.length >= 4, "a coluna de pistas deve apontar para P1 a P5 (achou " + refs.join(",") + ")");
  for (const n of refs) assert.ok(files.some((f) => new RegExp(`/P${n}-[^/]+\\.md$`).test(f)), `a tabela cita (P${n}) e o arquivo P${n}-*.md não existe em ${BIRD_DIR}`);
});

test("Passarinho: nenhuma afirmação de verificação nem artigo citado como aberto (README do Passarinho, docs/pesquisa-passarinho/ e docs/PASSARINHO-DESENHO.md)", () => {
  const bad = [];
  for (const { name, text } of birdTexts()) text.split("\n").forEach((line, i) => {
    for (const re of CLAIMS) for (const m of line.matchAll(re)) if (!negated(line, m.index)) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 100)}..."`);
    if (/inspirad[ao]s? (em|na|nos|nas) (literatura|artigos?|estudos?)/i.test(line) && !/não verificad|sem fonte|pista/i.test(line)) bad.push(`${name}:${i + 1}: "inspirado em literatura" sem dizer que não é verificado`);
  });
  assert.deepStrictEqual(bad, [], "afirmação de verificação:\n     " + bad.join("\n     "));
});

test("Passarinho genérico: nenhuma espécie nem raça nos textos do Passarinho (README do Passarinho, docs/pesquisa-passarinho/ e docs/PASSARINHO-DESENHO.md)", () => {
  const bad = [];
  for (const { name, text } of birdTexts()) text.split("\n").forEach((line, i) => { for (const m of line.matchAll(SPECIES)) if (!/\b(nenhuma|nunca|sem|nada de|não)\b[^.]{0,60}\b(espécie|raça|breed)/i.test(line) || !/^(raça|breed)$/i.test(m[0])) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`); });
  assert.deepStrictEqual(bad, [], "nome de espécie ou raça (o Passarinho é genérico):\n     " + bad.join("\n     "));
});

test("Passarinho: nenhum rótulo interno de trabalho (A5, frente X, wip-N, scratchpad, coordenador) nos textos do Passarinho", () => {
  const bad = [];
  for (const { name, text } of birdTexts()) text.split("\n").forEach((line, i) => { for (const m of line.matchAll(INTERNAL)) bad.push(`${name}:${i + 1}: "${m[0]}"`); });
  assert.deepStrictEqual(bad, [], "rótulo interno:\n     " + bad.join("\n     "));
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de honestidade passaram");
process.exit(failed ? 1 : 0);
