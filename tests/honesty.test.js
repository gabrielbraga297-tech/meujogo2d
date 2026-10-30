// Honestidade científica do Gatinho (0.18.0) e do Passarinho (0.20.0). Uso: node tests/honesty.test.js
// A rede do ambiente de desenvolvimento bloqueou os sites de artigos: NENHUM artigo foi aberto e nada do Gatinho nem do Passarinho está verificado em fonte. Este teste impede que o projeto volte a parecer o contrário:
//  1. nenhuma citação de artigo (et al., doi, ano entre parênteses) no README, no CHANGELOG, no código, no index.html nem nos documentos de docs/: elas só podem estar em docs/pesquisa-gatinho/ (as pistas, marcadas "não verificado");
//  2. nenhuma pista de docs/pesquisa-gatinho/ marcada "Verificado: SIM";
//  3. a tabela "Biologia por trás do Gatinho" do README diz "escolha de design" em todas as linhas e ninguém diz que TODO traço é "inspirado em literatura" (só algumas linhas têm uma pista, não verificada).
// Passarinho (0.20.0), regime mais estrito (nenhuma busca foi feita: não há nem pista achada, só temas e palavras-chave):
//  4. docs/pesquisa-passarinho/ (LEIAME e P1 a P5): cada arquivo diz que é NÃO VERIFICADO e que nenhum artigo foi aberto; nenhuma citação de artigo (a menos que a MESMA linha diga "NÃO ABERTO"); nenhum "Verificado: SIM";
//  5. a tabela "Biologia por trás do Passarinho" do README: "escolha de design" em todas as linhas, a seção diz que nenhum artigo foi aberto e que nada está verificado, e toda pista (P1 a P5) aponta para um arquivo que existe;
//  6. em TODO texto do Passarinho (veja `birdTexts()` e `birdCode()`): nenhuma afirmação de verificação ("está verificado", "segundo um estudo", "estudos mostram", "os biólogos explicam", "na vida real ... de fato"...), nenhum artigo citado como aberto,
//     nenhuma espécie ou raça (o Passarinho é genérico; a lista é a de tests/bird-words.js, a mesma de tests/bird-art.test.js) e nenhum rótulo interno de trabalho. O escopo: as seções do Passarinho do README (a história, "Sons do Passarinho",
//     "Skins do Passarinho", a tabela e a biologia), a PRIMEIRA entrada do CHANGELOG (a do topo, seja qual for), docs/LOJINHA.md, docs/PASSARINHO-DESENHO.md, docs/pesquisa-passarinho/, todas as frases do perfil `bird` de js/profiles.js
//     (as funções são chamadas com argumentos de exemplo), os nomes e frases das skins (BirdArt.SKINS e as categorias do Passarinho de js/skins-bird.js) e o texto do código de js/skins-bird.js e do bloco `bird` de js/profiles.js.
//     Uma negação só vale se estiver COLADA à afirmação (até 30 letras antes, na mesma oração): "Nada aqui foi verificado; nenhum estudo mostra isso" passa, "Nenhum artigo foi aberto, mas estudos mostram isso" não.
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
// de um cabeçalho "### ..." até o próximo cabeçalho "##" ou "###"
const subsection = (readme, title) => { const a = readme.indexOf("\n### " + title); if (a < 0) return null; const rest = readme.slice(a + 5), b = rest.search(/\n##+ /); return b < 0 ? rest : rest.slice(0, b); };
// de um rótulo em negrito no começo de uma linha até o fim do parágrafo (a próxima linha em branco)
const paragraph = (readme, label) => { const a = readme.indexOf("\n" + label); if (a < 0) return null; const rest = readme.slice(a + 1), b = rest.search(/\n\s*\n/); return b < 0 ? rest : rest.slice(0, b); };
// a primeira entrada do CHANGELOG (a do topo, seja qual for a versão): de "## " ao próximo "## "
const topChangelog = () => { const t = read("CHANGELOG.md"), a = t.search(/^## /m); if (a < 0) return null; const rest = t.slice(a + 3), b = rest.search(/\n## /); return b < 0 ? t.slice(a) : t.slice(a, a + 3 + b); };
// as frases do perfil `bird` (js/profiles.js): textos soltos e o que as funções devolvem com argumentos de exemplo (números, nomes e objetos vazios; quem não aceita um conjunto de argumentos é pulado)
const profileStrings = () => {
  const P = require(path.join(root, "js/profiles.js")).PROFILES.bird, out = [];
  const take = (v, name) => { if (typeof v === "string") out.push({ name, text: v }); else if (Array.isArray(v)) v.forEach((x, i) => take(x, `${name}[${i}]`)); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) take(x, `${name}.${k}`); };
  const SETS = [[1, 2, 3, 4, 5, 6, 7], [0, 0, 0, 0, 0, 0, 0], [12, 9, 8, 7, 6, 5, 4], ["Totó", "Zeca", "a", "b", "c", "d", "e"], [{}, {}, {}, {}, {}, {}, {}]];
  const walk = (o, name) => { for (const [k, v] of Object.entries(o)) {
    if (typeof v === "function") { for (const set of SETS) { try { take(v(...set.slice(0, Math.max(1, v.length))), `${name}.${k}(...)`); } catch { /* este conjunto de argumentos não serve */ } } }
    else if (v && typeof v === "object" && !Array.isArray(v)) walk(v, `${name}.${k}`); else take(v, `${name}.${k}`);
  } };
  walk(P, "PROFILES.bird");
  return out;
};
// os nomes e as frases das categorias e das skins do Passarinho (a do passarinho vem de BirdArt.SKINS; as dos objetos, de js/skins-bird.js)
const skinStrings = () => {
  global.Skins = global.Skins || require(path.join(root, "js/skins.js"));
  if (!global.Skins.count("seed")) require(path.join(root, "js/skins-bird.js"));
  const S = global.Skins, BirdArt = require(path.join(root, "js/bird-art.js")), out = [];
  for (const k of BirdArt.SKINS) for (const [f, v] of Object.entries(k)) if (typeof v === "string") out.push({ name: `BirdArt.SKINS.${k.id || "padrão"}.${f}`, text: v });
  for (const slot of S.SLOTS.filter((x) => x.game === "bird")) {
    for (const [f, v] of Object.entries(slot)) if (typeof v === "string") out.push({ name: `categoria ${slot.id}.${f}`, text: v });
    if (slot.id !== "bird") for (const k of S.list(slot.id)) for (const [f, v] of Object.entries(k)) if (typeof v === "string") out.push({ name: `skin ${slot.id}.${k.id || "padrão"}.${f}`, text: v });
  }
  return out;
};
// o texto do Passarinho que vale conferir: o README, o CHANGELOG do topo, os documentos, as frases do perfil e das skins
const birdTexts = () => {
  const readme = read("README.md"), out = [];
  for (const t of BIRD_SECTIONS) { const sec = section(readme, t); if (sec) out.push({ name: `README.md, seção "${t}"`, text: sec }); }
  const sons = subsection(readme, "Sons do Passarinho"); if (sons) out.push({ name: 'README.md, seção "Sons do Passarinho"', text: sons });
  const skins = paragraph(readme, "**Skins do Passarinho"); if (skins) out.push({ name: 'README.md, parágrafo "Skins do Passarinho"', text: skins });
  const top = topChangelog(); if (top) out.push({ name: "CHANGELOG.md, primeira entrada (" + top.split("\n")[0].slice(0, 60) + ")", text: top });
  for (const f of BIRD_FILES()) out.push({ name: f, text: read(f) });
  if (fs.existsSync(path.join(root, "docs/PASSARINHO-DESENHO.md"))) out.push({ name: "docs/PASSARINHO-DESENHO.md", text: read("docs/PASSARINHO-DESENHO.md") });
  // docs/LOJINHA.md fala dos três jogos (os nomes das skins do Cachorrinho e do Gatinho podem lembrar raças): afirmações e rótulos valem no arquivo todo, espécie e raça só nas linhas que falam do Passarinho
  if (fs.existsSync(path.join(root, "docs/LOJINHA.md"))) out.push({ name: "docs/LOJINHA.md", text: read("docs/LOJINHA.md"), speciesOnly: /passarinho|gavi[ãa]|semente|minhoca|poleiro|ninho|\bbird|\bseed\b|\bstray\b|\bberry\b|\bbug\b|\broost\b|\bgust\b|\bhawk\b/i });
  for (const { name, text } of profileStrings()) out.push({ name: "js/profiles.js " + name, text });
  for (const { name, text } of skinStrings()) out.push({ name: "js/skins-bird.js " + name, text });
  return out;
};
// o texto de CÓDIGO do Passarinho (comentários e strings): js/skins-bird.js e o bloco `bird` de js/profiles.js
const birdCode = () => {
  const prof = read("js/profiles.js"), a = prof.indexOf("  const bird = {"), b = prof.indexOf("  const PROFILES");
  return [{ name: "js/skins-bird.js", text: read("js/skins-bird.js") }, ...(a >= 0 && b > a ? [{ name: "js/profiles.js (bloco bird)", text: prof.slice(a, b) }] : [])];
};
// uma afirmação só deixa de valer como "afirmação" se vier negada COLADA a ela, na mesma oração ("nada abaixo está verificado", "nenhum artigo foi aberto"): olha só as 30 letras antes dela,
// desde o último . ; : | ( ) — , ! ? ou "mas / porém / embora / contudo / e / ou" ("Nenhum artigo foi aberto, mas estudos mostram isso" NÃO é negada)
// (\b do JavaScript só entende letras sem acento; por isso as bordas das palavras são conferidas com \p{L})
const NEG = /(?<!\p{L})(não|nao|nada|nenhum[a]?|nunca|jamais|nem)(?!\p{L})/iu;
const NEG_WINDOW = 30;
const negated = (line, idx) => NEG.test(line.slice(0, idx).split(/[.;:|()—,!?]|(?<!\p{L})(?:mas|porém|embora|contudo|e|ou)(?!\p{L})/iu).pop().slice(-NEG_WINDOW));
const CLAIMS = [
  /\b(est[áa]|foi|foram|s[ãa]o|ficou|ficaram) (todos? )?(verificad[oa]s?|comprovad[oa]s?|confirmad[oa]s?|testad[oa]s? em (artigo|estudo|literatura))\b/gi,
  /\bverificad[oa]s? (em|por|na|no) (artigo|artigos|estudo|estudos|literatura|fonte|fontes|pesquisa)/gi,
  /\b(segundo|de acordo com|conforme) (um |o |os |uns |a )?(estudo|estudos|artigo|artigos|pesquisa|pesquisas|cientistas|literatura|biólogos?)\b/gi,
  /\b(estudos?|pesquisas?|artigos?|cientistas|biólogos?) (mostra[mn]?|comprova[mn]?|demonstra[mn]?|indica[mn]?|provam?|revela[mn]?|descobriram|mostraram|comprovaram|explica[mn]?|confirma[mn]?|sabem)\b/gi,
  /\bbaseado[as]? em (artigos?|estudos?|literatura|pesquisas? científicas?)\b/gi,
  /\b(artigos?|estudos?) (foi|foram|está|estão) (abert[oa]s?|conferid[oa]s?|lid[oa]s?|verificad[oa]s?)\b/gi,
  /\b(abri|abrimos|li|lemos|conferi|conferimos) (o|um|os|dois|vários) (artigo|artigos|estudo|estudos)\b/gi,
  /\bcomprovado cientificamente\b|\bcientificamente (comprovad|verificad)/gi,
  /\bpassarinhos? de verdade (fazem|têm|tem|voam|comem|fogem)\b/gi,
  // (0.20.0, auditoria) jeitos mais soltos de dizer a mesma coisa
  /\bliteratura científica\b/gi,
  /\b(os )?biólogos?\b/gi,
  /\bcientistas (?:já|também|sabem|concordam|confirmam|descobriram|mostraram)(?=[\s,.;:!?]|$)/gi,
  /\bna vida real\b[^.|]{0,80}\bde fato\b|\bde fato\b[^.|]{0,80}\bna vida real\b/gi,
  /\bconferid[oa]s? (com|em|nos?|nas?) (os |as |um |uma )?(artigos?|estudos?|literatura|fontes?|periódicos?|pesquisas?|biólogos?)\b/gi,
  /\bcomprovad[oa]s?\b|\bcomprovação\b|\bcomprova(m)?\b/gi,
  // ("periódico" sozinho aparece em frases legítimas: a regra de só citar artigo de periódico reconhecido e "nenhum autor, ano, periódico ou DOI é citado"; o que é afirmação é dizer que algo saiu ou foi confirmado em periódico)
  /\b(?:publicad[oa]s?|confirmad[oa]s?|descrit[oa]s?|relatad[oa]s?|documentad[oa]s?|mostrad[oa]s?|saiu|saíram|apareceu|aparece) (?:em|nos?|num|por|pelos?) (?:vários |diversos |muitos |bons |grandes )?periódicos?\b|\bperiódicos? (?:científicos? )?(?:confirma[mn]?|mostra[mn]?|relata[mn]?|indica[mn]?|publica[mn]?|trazem|traz)\b/gi,
];
// espécies e raças: a MESMA lista de tests/bird-art.test.js (tests/bird-words.js)
const SPECIES = require("./bird-words.js").speciesOrBreedRe();
// rótulos internos de trabalho. Nos TEXTOS (README, CHANGELOG, documentos, frases do perfil e das skins) valem também "frentes" (e "frente" fora de "à frente", "de frente", "na frente"...), "wip", "agente de ..." e "fixtures" solta (fora de nomes de pasta e de arquivo);
// no CÓDIGO (js/skins-bird.js e o perfil) esses termos aparecem em comentários e ficam de fora.
const INTERNAL_CODE = /\bA5\b|\bfrentes?\s+[A-Z]\b|\bwip-\d|scratchpad|\bcoordenador\b|\bagente de (mapas|sons|arte|documentação)\b/gi;
const INTERNAL = new RegExp(`${INTERNAL_CODE.source}|(?<!\\p{L})frentes(?!\\p{L})|(?<!\\p{L})frente (?:de|do|da) (?:mapas|sons|arte|documentação|skins|motor|trabalho|testes)(?!\\p{L})|(?<!(?:à|a|de|do|da|na|no|pela|pelo|em|para|ao|à) )(?<!\\p{L})frente(?!\\p{L})|(?<!\\p{L})wip(?!\\p{L})|(?<!\\p{L})agentes? de(?!\\p{L})|(?<![\\w/.-])fixtures?(?![\\w/.-])`, "giu");
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

const ALL_BIRD = () => [...birdTexts().map((x) => ({ ...x, code: false })), ...birdCode().map((x) => ({ ...x, code: true }))];

test("Passarinho: o escopo conferido tem tudo o que o jogador e o leitor veem (README: história, Sons, Skins, tabela e biologia; CHANGELOG do topo; LOJINHA; pesquisa; desenho; frases do perfil; skins; código)", () => {
  const names = ALL_BIRD().map((x) => x.name), has = (re) => names.some((n) => re.test(n));
  for (const re of [/seção "Passarinho \(0\.20\.0\)"/, /seção "Tabela das fases do Passarinho/, /seção "Biologia por trás do Passarinho/, /seção "Sons do Passarinho"/, /parágrafo "Skins do Passarinho"/, /^CHANGELOG\.md, primeira entrada/,
    /docs\/LOJINHA\.md/, /docs\/PASSARINHO-DESENHO\.md/, /docs\/pesquisa-passarinho\/LEIAME\.md/, /^js\/profiles\.js PROFILES\.bird\.say\./, /^js\/profiles\.js PROFILES\.bird\.noun\./, /^js\/skins-bird\.js BirdArt\.SKINS\./, /^js\/skins-bird\.js skin seed\./, /^js\/skins-bird\.js skin hawk\./,
    /^js\/skins-bird\.js$/, /^js\/profiles\.js \(bloco bird\)$/]) assert.ok(has(re), "falta no escopo: " + re);
  const strs = names.filter((n) => /^js\/profiles\.js PROFILES\.bird/.test(n)).length;
  assert.ok(strs >= 100, "as frases do perfil do Passarinho (textos e o que as funções devolvem) deviam ser pelo menos 100; foram " + strs);
  const top = birdTexts().find((x) => /^CHANGELOG/.test(x.name));
  assert.ok(top && /^## \d+\.\d+\.\d+/.test(top.text) && top.text.split("\n").filter((l) => /^## /.test(l)).length === 1, "a primeira entrada do CHANGELOG deve ser UMA entrada (de '## versão' ao próximo '## ')");
});

test("Passarinho: nenhuma afirmação de verificação nem artigo citado como aberto (README, CHANGELOG do topo, documentos, frases do perfil e das skins, código)", () => {
  const bad = [];
  for (const { name, text } of ALL_BIRD()) text.split("\n").forEach((line, i) => {
    for (const re of CLAIMS) for (const m of line.matchAll(re)) if (!negated(line, m.index)) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 100)}..."`);
    if (/inspirad[ao]s? (em|na|nos|nas) (literatura|artigos?|estudos?)/i.test(line) && !/não verificad|sem fonte|pista/i.test(line)) bad.push(`${name}:${i + 1}: "inspirado em literatura" sem dizer que não é verificado`);
  });
  assert.deepStrictEqual(bad, [], "afirmação de verificação:\n     " + bad.join("\n     "));
});

test("Passarinho genérico: nenhuma espécie nem raça (lista de tests/bird-words.js) nos textos, nas frases do perfil, nas skins e no código do Passarinho", () => {
  const bad = [];
  for (const { name, text, speciesOnly } of ALL_BIRD()) text.split("\n").forEach((line, i) => { if (speciesOnly && !speciesOnly.test(line)) return; for (const m of line.matchAll(SPECIES)) if (!/\b(nenhuma|nunca|sem|nada de|não)\b[^.]{0,60}\b(espécie|raça|breed)/i.test(line) || !/^(raça|breed)s?$/i.test(m[0])) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`); });
  assert.deepStrictEqual(bad, [], "nome de espécie ou raça (o Passarinho é genérico):\n     " + bad.join("\n     "));
});

test("Passarinho: nenhum rótulo interno de trabalho (A5, frente, wip, agente de ..., fixtures solta, scratchpad, coordenador) nos textos do Passarinho (e os de código, sem os comentários de teste)", () => {
  const bad = [];
  for (const { name, text, code } of ALL_BIRD()) text.split("\n").forEach((line, i) => { for (const m of line.matchAll(code ? INTERNAL_CODE : INTERNAL)) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`); });
  assert.deepStrictEqual(bad, [], "rótulo interno:\n     " + bad.join("\n     "));
});

// ---- o próprio detector: frases de redator desatento são pegas e os controles legítimos passam (a prova com mutações no repositório inteiro está no relatório da auditoria) ----
test("os detectores pegam as frases de redator desatento e deixam passar os controles legítimos", () => {
  const caught = (line) => { let hit = false; for (const re of CLAIMS) for (const m of line.matchAll(re)) if (!negated(line, m.index)) hit = true; return hit; };
  for (const line of [
    "A literatura científica confirma que o passarinho foge assim.",
    "Os biólogos explicam que as aves voam contra o vento.",
    "Cientistas já mostraram que o voo alto cansa.",
    "Na vida real o passarinho de fato foge do gato assim.",
    "Isso foi conferido com artigos de periódicos.",
    "Está comprovado que o fruto dá energia.",
    "Nenhum artigo foi aberto, mas estudos mostram que isso é verdade.",
    "Nada foi verificado e os biólogos explicam o resto.",
  ]) assert.ok(caught(line), "não pegou: " + line);
  for (const line of [
    "Nada aqui foi verificado; nenhum estudo mostra isso.",
    "Nenhum artigo foi aberto e nada abaixo está verificado.",
    "Nenhuma pista está verificada em fonte.",
    "Nenhum autor, ano, periódico, volume ou DOI é citado.",
  ]) assert.ok(!caught(line), "pegou um controle legítimo: " + line);
  assert.ok("Um cardeal, um azulão, um colibri, uma águia, um corvo, uma gralha, um quero-quero, uma arara, um pato, um curió, um pica-pau, um pinguim".match(SPECIES).length === 12, "a lista de espécies está curta");
  assert.ok("Os pontos cardeais e um patológico".match(SPECIES) === null, "falso positivo de espécie");
  const internal = (w) => new RegExp(INTERNAL.source, INTERNAL.flags).test(w);
  for (const w of ["as frentes de trabalho", "a frente de mapas", "wip", "agentes de arte", "as fixtures do motor", "um agente de teste"]) assert.ok(internal(w), "rótulo interno não pego: " + w);
  for (const w of ["tests/fixtures/ tem as 5 fases", "`tests/fixtures`", "agentes da carrocinha", "o tile à frente de cada seta", "de frente, de costas e de lado", "os pés ficam na frente"]) assert.ok(!internal(w), "falso positivo de rótulo: " + w);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de honestidade passaram");
process.exit(failed ? 1 : 0);
