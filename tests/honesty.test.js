// Honestidade científica do Gatinho (0.18.0), do Passarinho (0.20.0) e, desde a 0.24.0, do Cachorrinho. Uso: node tests/honesty.test.js
// ATUALIZAÇÃO 0.24.0: a rede passou a liberar o Europe PMC e o Crossref e as referências de docs/biologia/referencias.json foram conferidas (o RESUMO foi lido; o texto completo, não). Os itens 1 a 5 abaixo
// foram reescritos para o regime novo (veja a seção «Biologia conferida (0.24.0)» do arquivo): citação só de referência da lista, «escolha de design» em todas as linhas, nada fora da lista verificado.
// Texto original (0.18.0/0.20.0, quando nenhum artigo tinha sido aberto), que continua valendo para o que está FORA da lista:
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
// Músicas tema (0.21.0): ninguém ouviu as músicas (o ambiente de desenvolvimento não tem ouvido humano nem placa de som). Só foram medidas propriedades (escala, laço, pico, RMS, emenda...).
//  7. nenhum texto que o dono ou o jogador lê (a seção "Músicas tema (0.21.0)" e as linhas do README que falam de música, o item "Música:" do Como jogar e a ajuda da pausa, a primeira entrada do CHANGELOG se falar de música,
//     docs/MUSICA.md, os comentários de js/music*.js e de tools/music-render/ e de tools/music-table.js) afirma que a música "soa bem" (também no plural e com "tão bem"), é "agradável", "bonita", "belíssima", que "foi ouvida" ou que
//     "fica boa"/"ficam boas", nem diz que ALGUÉM ouviu ("a equipe ouviu", "uma pessoa ouviu", "amigos ouviram", "escutou", "ouvimos"...; "nenhuma pessoa ouviu" e "ninguém ouviu" passam);
//  8. a frase "nenhuma pessoa ouviu" está no README (a seção diz também que só foram medidas propriedades e que ouvir é o teste que falta), na entrada 0.21.0 do CHANGELOG, em docs/MUSICA.md e no comentário de abertura de
//     cada js/music*.js; e nenhum texto de música (README, Como jogar, pausa, perfis, CHANGELOG do topo, docs/MUSICA.md, comentários e ferramentas) traz rótulo interno de trabalho: A5, A6 (palavra inteira), frente, wip, agente de ..., scratchpad,
//     coordenador, compositor (e compositores).
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
const negated = (line, idx, re) => (re || NEG).test(line.slice(0, idx).split(/[.;:|()—,!?]|(?<!\p{L})(?:mas|porém|embora|contudo|e|ou)(?!\p{L})/iu).pop().slice(-NEG_WINDOW));
// nos textos de música "ninguém" também nega ("ninguém ouviu")
const NEG_MUSIC = /(?<!\p{L})(não|nao|nada|nenhum[a]?|nunca|jamais|nem|ningu[ée]m)(?!\p{L})/iu;
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

// ======================================================= Biologia conferida (0.24.0) =======================================================
// A partir da 0.24.0 há referências abertas e conferidas (o RESUMO foi lido; o texto completo, não): ficam em docs/biologia/referencias.json (montado por tools/biology/build_refs.py). As regras:
//  - toda citação de artigo (et al., doi, ano entre parênteses) no README, no CHANGELOG, nos documentos e no código é de uma referência dessa lista (apoio, sem apoio ou não encontrada);
//  - nenhuma tabela «Biologia por trás» diz mais do que a lista: a Situação de cada traço continua «escolha de design» e as seções dizem que só o resumo foi lido e que nada fora da lista está verificado;
//  - as pistas antigas (docs/pesquisa-*) seguem NÃO VERIFICADAS e nunca marcadas «Verificado: SIM».
const REFS_FILE = "docs/biologia/referencias.json";
const refsData = () => JSON.parse(read(REFS_FILE));
const ALL_REFS = () => { const d = refsData(); return [...d.refs, ...d.sem_apoio]; };
const family = (r) => r.authors[0].split(" ")[0];
const NOT_FOUND_MARK = /n[ãa]o (foi |foram )?(encontrad|confirmad)|N[ÃA]O ABERTO/i;

test("docs/biologia/referencias.json: cada referência tem autores, ano de 2021 a 2026, periódico, DOI, nível «resumo», data da conferência, o que sustenta e o que NÃO sustenta", () => {
  const d = refsData();
  assert.ok(d.refs.length >= 10, "esperava pelo menos 10 referências com apoio (achou " + d.refs.length + ")");
  const ids = new Set(), dois = new Set();
  for (const r of d.refs) {
    for (const k of ["id", "journal", "doi", "title", "checked_on", "supports", "limits"]) assert.ok(typeof r[k] === "string" && r[k].length > 3, `${r.id}: falta ${k}`);
    assert.ok(Array.isArray(r.authors) && r.authors.length >= 1, `${r.id}: sem autores`);
    assert.ok(Number.isInteger(r.year) && r.year >= 2021 && r.year <= 2026, `${r.id}: ano ${r.year}`);
    assert.ok(/^10\.\d{4,9}\//.test(r.doi), `${r.id}: DOI ${r.doi}`);
    assert.ok(r.level === "resumo" || r.level === "texto completo", `${r.id}: nível ${r.level}`);
    assert.ok(r.peer_reviewed === true && /^\d{4}-\d{2}-\d{2}$/.test(r.checked_on), `${r.id}: revisado por pares e data`);
    assert.ok(Array.isArray(r.games) && r.games.length >= 1 && r.games.every((g) => ["dog", "cat", "bird"].includes(g)) && Array.isArray(r.traits) && r.traits.length >= 1, `${r.id}: jogos e traços`);
    assert.ok(!ids.has(r.id) && !dois.has(r.doi), `${r.id}: id ou DOI repetido`); ids.add(r.id); dois.add(r.doi);
    if (r.level === "resumo") assert.ok(!/texto completo (foi|foram) lid/i.test(r.supports + r.limits), `${r.id}: nível «resumo» mas o texto diz que leu o texto completo`);
  }
  for (const r of d.sem_apoio) assert.ok(r.id && /^10\./.test(r.doi) && r.why && r.year >= 2021 && r.year <= 2026 && !ids.has(r.id), `sem_apoio ${r.id}`);
  assert.ok(Array.isArray(d.nao_encontradas) && d.nao_encontradas.length >= 1 && d.nao_encontradas.every((x) => /n[ãa]o encontrado/i.test(x)), "nao_encontradas deve listar pistas «não encontrado»");
});

test("toda citação de artigo (et al., doi, 10.xxxx/, ano entre parênteses) no README, CHANGELOG, documentos e código é de uma referência da lista (ou diz «não encontrado»)", () => {
  const refs = ALL_REFS(), fams = refs.map(family), dois = refs.map((r) => r.doi.toLowerCase());
  const bad = [];
  for (const f of FILES) read(f).split("\n").forEach((line, i) => {
    for (const m of line.matchAll(CITATION)) {
      const low = line.toLowerCase();
      if (NOT_FOUND_MARK.test(line) || fams.some((x) => line.includes(x)) || dois.some((x) => low.includes(x))) continue;
      bad.push(`${f}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`);
    }
  });
  assert.deepStrictEqual(bad, [], "citação que não está em docs/biologia/referencias.json:\n     " + bad.join("\n     "));
});

test("o README só cita [id] de referências que existem e cada referência com apoio aparece na seção «Biologia por trás» do jogo dela", () => {
  const d = refsData(), readme = read("README.md"), ids = new Set(d.refs.map((r) => r.id));
  const sec = { cat: section(readme, "Biologia por trás do Gatinho (0.18.0)"), bird: section(readme, "Biologia por trás do Passarinho (0.20.0)"), dog: section(readme, "Biologia por trás do Cachorrinho (0.24.0)") };
  for (const [g, t] of Object.entries(sec)) assert.ok(t, "falta a seção Biologia por trás do jogo " + g);
  for (const [g, t] of Object.entries(sec)) for (const m of t.matchAll(/\[([a-z]+\d{4})\]/g)) assert.ok(ids.has(m[1]), `${g}: [${m[1]}] não existe em referencias.json`);
  for (const r of d.refs) for (const g of r.games) assert.ok(sec[g].includes(`[${r.id}]`), `a referência ${r.id} deveria aparecer como [${r.id}] na seção do jogo ${g}`);
  for (const r of d.sem_apoio) for (const g of r.games) assert.ok(sec[g].includes(family(r)), `a referência sem apoio ${r.id} deveria ser mencionada na seção do jogo ${g}`);
  assert.ok(!/\[[a-z]+\d{4}\]/.test(sec.dog), "o Cachorrinho não tem referência com apoio: a seção dele não pode citar nenhuma");
});

const BIO_RULES = (name, sec) => {
  assert.ok(sec, "falta a seção Biologia por trás do " + name);
  assert.ok(/Em 07\/11\/2026 a rede do ambiente de desenvolvimento passou a liberar o Europe PMC e o Crossref/.test(sec), name + ": a seção deve dizer quando e como as referências foram buscadas");
  assert.ok(/o \*\*resumo\*\* foi aberto e lido/.test(sec) && /\*\*O texto completo não foi lido\*\*/.test(sec), name + ": a seção deve dizer que só o resumo foi lido e que o texto completo não foi lido");
  assert.ok(/\*\*Nada fora dessa lista está verificado\*\*/.test(sec) && /\*\*todo traço continua sendo uma escolha de design\*\*/.test(sec), name + ": a seção deve dizer que nada fora da lista está verificado e que todo traço é escolha de design");
  const rows = sec.split("\n").filter((l) => /^\|/.test(l) && !/^\|[-| ]+\|$/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  assert.ok(rows.length >= 6 && /Base conferida/.test(rows[0].join("|")) && /Situação/.test(rows[0].join("|")), name + ": tabela com «Base conferida» e «Situação» e pelo menos 5 traços (achou " + rows.length + " linhas)");
  for (const r of rows.slice(1)) assert.ok(/^(escolha de design|o poder é pura escolha de design)/i.test(r[r.length - 1]), `${name}: a linha "${r[0]}" não começa com «escolha de design» na Situação ("${r[r.length - 1]}")`);
  return rows;
};
test("a tabela «Biologia por trás do Gatinho» do README: «escolha de design» em todas as linhas, só o resumo lido, nada fora da lista verificado, arrancada e pelo molhado sem base", () => {
  const readme = read("README.md"), sec = section(readme, "Biologia por trás do Gatinho (0.18.0)");
  BIO_RULES("Gatinho", sec);
  assert.ok(/nada recente achado/.test(sec) && /só análogos de outros mamíferos/.test(sec), "a tabela deve dizer que a arrancada e o pelo molhado não têm base");
  assert.ok(/Pistas antigas que não se confirmaram/.test(sec), "a seção deve listar as pistas antigas que não se confirmaram");
});
test("a tabela «Biologia por trás do Passarinho» do README: «escolha de design» em todas as linhas, só o resumo lido, pistas P1 a P5 apontam para arquivos que existem", () => {
  const sec = section(read("README.md"), "Biologia por trás do Passarinho (0.20.0)");
  BIO_RULES("Passarinho", sec);
  const files = BIRD_FILES(), refs = [...new Set([...sec.matchAll(/\(P(\d+)\)/g)].map((m) => m[1]))];
  assert.ok(refs.length >= 4, "a coluna de base deve apontar para P1 a P5 (achou " + refs.join(",") + ")");
  for (const n of refs) assert.ok(files.some((f) => new RegExp(`/P${n}-[^/]+\\.md$`).test(f)), `a tabela cita (P${n}) e o arquivo P${n}-*.md não existe em ${BIRD_DIR}`);
});
test("a seção «Biologia por trás do Cachorrinho»: sem referência com apoio, «escolha de design» em todas as linhas e a busca de 07/11/2026 dita", () => {
  const sec = section(read("README.md"), "Biologia por trás do Cachorrinho (0.24.0)");
  BIO_RULES("Cachorrinho", sec);
  assert.ok(/nenhuma referência foi achada que sustente o que o jogo faz/.test(sec), "a seção deve dizer que nada sustentou o jogo");
});
test("as pistas antigas: docs/pesquisa-gatinho/ e docs/pesquisa-passarinho/ têm o aviso da atualização 0.24.0 em todos os arquivos e nenhum está marcado «Verificado: SIM»", () => {
  const files = [...list("docs/pesquisa-gatinho", /\.md$/), ...BIRD_FILES()];
  assert.ok(files.length >= 12, "faltam arquivos da pesquisa: " + files.join(", "));
  const bad = [];
  for (const f of files) { const t = read(f); if (!/Atualização 0\.24\.0 \(07\/11\/2026\)/.test(t)) bad.push(f + ": sem o aviso da atualização 0.24.0"); if (/Verificad[oa]: *SIM/i.test(t)) bad.push(f + ": marcado Verificado: SIM"); }
  assert.deepStrictEqual(bad, []);
  assert.ok(/Buscas feitas em 07\/11\/2026/.test(read(BIRD_DIR + "/LEIAME.md")) && /Resultado da conferência de 07\/11\/2026/.test(read("docs/pesquisa-gatinho/LEIAME.md")), "os dois LEIAME devem trazer o resultado das buscas de 07/11/2026");
});
test("ninguém diz que TODO traço é «inspirado em literatura» nem que o texto completo foi lido", () => {
  const bad = [];
  for (const f of [...FILES, ...list("docs/pesquisa-gatinho", /\.md$/), ...BIRD_FILES()]) read(f).split("\n").forEach((line, i) => {
    if (/(todo|todos os) (o )?(traço|traços|números?)[^.|]{0,200}inspirad[ao]s? em literatura/i.test(line) || /TODOS OS NÚMEROS[^.]{0,80}INSPIRAD/.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
    if (/texto completo (foi|foram|de todas|das referências) (lid|aberto)/i.test(line) && !/n[ãa]o/i.test(line)) bad.push(`${f}:${i + 1}: diz que leu o texto completo: ${line.trim().slice(0, 100)}`);
  });
  assert.deepStrictEqual(bad, [], "afirmação exagerada:\n     " + bad.join("\n     "));
});
test("Passarinho: nenhuma citação de artigo em docs/pesquisa-passarinho/ (et al., doi.org, 10.xxxx/, ano entre parênteses), a não ser em linha que diga \"NÃO ABERTO\" ou «não encontrado»", () => {
  const bad = [];
  for (const f of BIRD_FILES()) read(f).split("\n").forEach((line, i) => { for (const m of line.matchAll(CIT_BIRD)) if (!NOT_FOUND_MARK.test(line)) bad.push(`${f}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`); });
  assert.deepStrictEqual(bad, [], "citação sem \"NÃO ABERTO\":\n     " + bad.join("\n     "));
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

// ======================================================= Músicas tema (0.21.0) =======================================================
const MUSIC_SECTION = "Músicas tema (0.21.0)";
// Afirmações de qualidade ou de que alguém ouviu. Valem se NÃO vierem negadas coladas ("não mede se soa bem", "ninguém ouviu").
const QUALITY = [
  /\bsoa(?:m)?\s+(?:(?:muito|tão|tao|mesmo|realmente)\s+)?(?:bem|bom|boa|bons|boas|lindamente|agrad\p{L}*|natural\p{L}*)/giu,
  /\bagrad[aá]ve(?:l|is)\b/giu,
  /\b(?:bonit[ao]s?|lind[ao]s?|gostos[ao]s?|delicios[ao]s?|encantador\p{L}*|bel[íi]ssim\p{L}*|maravilhos\p{L}*)(?!\p{L})/giu,
  /\b(?:foi|foram|já foi|já foram|ficou|ficaram) (?:ouvid[oa]s?|escutad[oa]s?|aprovad[oa]s?)\b/giu,
  /(?<!\p{L})(?:(?:ouviu|ouviram|escutou|escutaram|ouvimos|escutamos|escutei)(?!\p{L})|ouvi(?![\p{L}-]))/giu, // ("ouvi-la" é o verbo ouvir com pronome, não conta)
  /\bfica(?:m)? (?:bem|bo(?:a|m|as|ns)|bonit[ao]s?)(?!\p{L})/giu,
  /\b(?:ficou|ficaram) (?:ótim|boa|bom|bem)\p{L}*/giu,
];
// Elogio escondido numa negação ("Nada soa tão bem quanto estas músicas"): vale mesmo com o "nada" colado, porque a frase afirma que soa melhor que tudo
const QUALITY_EVEN_IF_NEGATED = [/(?<!\p{L})nada\s+(?:soa|fica|é|há)\s+(?:t[aã]o|mais)\s+(?:bem|bom|boa|bonit\p{L}*|lind\p{L}*|agrad\p{L}*)/giu];
const qualityHits = (line) => {
  const hits = [];
  for (const re of QUALITY) for (const m of line.matchAll(re)) if (!negated(line, m.index, NEG_MUSIC)) hits.push(m[0]);
  for (const re of QUALITY_EVEN_IF_NEGATED) for (const m of line.matchAll(re)) hits.push(m[0]);
  return hits;
};
// rótulos de trabalho que não podem aparecer em NENHUM texto de música (nem nos comentários de código): o código do trabalho (A6, palavra inteira) e o papel "compositor"
const MUSIC_LABELS = /(?<!\p{L}|\d)(?:A6|compositor(?:es|as?)?)(?![\p{L}\d])/giu;
// a entrada de uma versão do CHANGELOG (do "## 0.21.0" até o próximo "## ") e o comentário de abertura de um arquivo js (as linhas "//" do começo, juntadas)
const changelogEntry = (v) => { const t = read("CHANGELOG.md"), a = t.search(new RegExp("^## " + v.replace(/\./g, "\\.") + "(?![\\d.])", "m")); if (a < 0) return null; const rest = t.slice(a + 3), b = rest.search(/\n## /); return b < 0 ? t.slice(a) : t.slice(a, a + 3 + b); };
const headerComment = (f) => { const out = []; for (const l of read(f).split("\n")) { if (l.startsWith("//")) out.push(l.replace(/^\/\/\s?/, "")); else break; } return out.join(" "); };
// os textos de música: [nome, texto, confereRótulosInternos]
const musicTexts = () => {
  const readme = read("README.md"), out = [], sec = section(readme, MUSIC_SECTION);
  if (sec) out.push({ name: `README.md, seção "${MUSIC_SECTION}"`, text: sec, internal: true });
  const lines = readme.split("\n").filter((l) => /músic/i.test(l) && !sec.includes(l));
  if (lines.length) out.push({ name: "README.md, as outras linhas que falam de música (Menu, Controles, Estrutura, Testes)", text: lines.join("\n"), internal: false });
  const li = (read("index.html").match(/<li><strong>Música:<\/strong>[\s\S]*?<\/li>/) || [""])[0], help = (read("index.html").match(/<p id="pause-help"[^>]*>([\s\S]*?)<\/p>/) || [0, ""])[1];
  out.push({ name: 'index.html, item "Música:" do Como jogar e ajuda da pausa', text: li + "\n" + help, internal: true });
  const prof = read("js/profiles.js").split("\n").filter((l) => /<strong>Música:<\/strong>|pauseHelp: .*música/.test(l));
  out.push({ name: "js/profiles.js, textos de música do Gatinho e do Passarinho", text: prof.join("\n"), internal: true });
  const top = topChangelog(); if (top && /músic/i.test(top)) out.push({ name: "CHANGELOG.md, primeira entrada (fala de música)", text: top, internal: true });
  out.push({ name: "docs/MUSICA.md", text: read("docs/MUSICA.md"), internal: false });
  for (const f of ["js/music.js", "js/music-dog.js", "js/music-cat.js", "js/music-bird.js", "tools/music-table.js", ...list("tools/music-render", /\.js$/)]) if (fs.existsSync(path.join(root, f))) out.push({ name: f, text: read(f), internal: false });
  return out;
};

test("Músicas tema: o README tem a seção, e ela diz que nenhuma pessoa ouviu as músicas, que só foram medidas propriedades e que ouvir é o que falta", () => {
  const sec = section(read("README.md"), MUSIC_SECTION);
  assert.ok(sec, `falta a seção "${MUSIC_SECTION}" no README`);
  assert.ok(/nenhuma pessoa ouviu as músicas durante o desenvolvimento/i.test(sec), "deve dizer: nenhuma pessoa ouviu as músicas durante o desenvolvimento");
  assert.ok(/só foram medidas propriedades/i.test(sec) && /só ouvindo se responde/i.test(sec), "deve dizer que só foram medidas propriedades e que o resto só ouvindo se responde");
  assert.ok(/escolhas de design/i.test(sec), "os números de volume, andamento, instrumentos e forma são escolhas de design");
});

test('Músicas tema: a frase "nenhuma pessoa ouviu" está na entrada 0.21.0 do CHANGELOG, em docs/MUSICA.md e no comentário de abertura de js/music.js, js/music-dog.js, js/music-cat.js e js/music-bird.js', () => {
  const missing = [], phrase = /nenhuma pessoa ouviu/i;
  const entry = changelogEntry("0.21.0");
  if (!entry) missing.push("CHANGELOG.md: não achei a entrada ## 0.21.0"); else if (!phrase.test(entry)) missing.push("CHANGELOG.md, entrada 0.21.0");
  if (!phrase.test(read("docs/MUSICA.md").replace(/\s+/g, " ").replace(/> /g, ""))) missing.push("docs/MUSICA.md");
  for (const f of ["js/music.js", "js/music-dog.js", "js/music-cat.js", "js/music-bird.js"]) if (!phrase.test(headerComment(f))) missing.push(`${f}, comentário de abertura`);
  assert.deepStrictEqual(missing, [], 'falta dizer "nenhuma pessoa ouviu as músicas" em:\n     ' + missing.join("\n     "));
});

test("Músicas tema: nenhum texto de música diz que ela soa bem, é agradável, bonita, foi ouvida ou fica boa, nem que alguém a ouviu (README, Como jogar, pausa, CHANGELOG do topo, docs/MUSICA.md e os comentários dos arquivos de música)", () => {
  const bad = [], texts = musicTexts();
  assert.ok(texts.length >= 8, `há textos de música para conferir (achou ${texts.length})`);
  for (const { name, text } of texts) text.split("\n").forEach((line, i) => { for (const hit of qualityHits(line)) bad.push(`${name}:${i + 1}: "${hit}" em "${line.trim().slice(0, 100)}..."`); });
  assert.deepStrictEqual(bad, [], "afirmação de qualidade que ninguém verificou (nenhuma pessoa ouviu):\n     " + bad.join("\n     "));
});

test("Músicas tema: nenhum rótulo interno de trabalho (A5, A6, compositor, frente, wip, agente de ..., scratchpad, coordenador) no README, no Como jogar, na ajuda da pausa, nas frases do perfil, no CHANGELOG do topo, em docs/MUSICA.md e nos comentários e ferramentas da música", () => {
  const bad = [];
  for (const { name, text, internal } of musicTexts()) text.split("\n").forEach((line, i) => {
    if (internal) for (const m of line.matchAll(INTERNAL)) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`);
    for (const m of line.matchAll(MUSIC_LABELS)) bad.push(`${name}:${i + 1}: "${m[0]}" em "${line.trim().slice(0, 90)}..."`);
  });
  assert.deepStrictEqual(bad, [], "rótulo interno:\n     " + bad.join("\n     "));
});

test("Músicas tema: o detector pega as frases de redator desatento (inclusive no plural, com \"tão bem\", com sujeito qualquer e escondidas numa negação) e deixa passar as negações coladas", () => {
  const caught = (line) => qualityHits(line).length > 0;
  for (const line of ["A música da Fase 3 soa bem.", "Todas as músicas foram ouvidas e aprovadas.", "É uma melodia agradável e bonita.", "A música fica boa no celular.", "Nenhuma pessoa ouviu, mas a música soa muito bem.",
    "As músicas ficam boas.", "Os temas ficam bons.", "As músicas ficam bonitas.", "As músicas soam bem.", "As músicas soam tão bem no celular.", "As músicas são belíssimas.", "As melodias ficaram belíssimas.",
    "A equipe ouviu todos os temas.", "Uma pessoa ouviu estas músicas.", "Alguns amigos ouviram estas músicas.", "A dona escutou os temas.", "Ouvimos os temas.", "Escutaram tudo.", "As músicas ouviram-se bem.",
    "Nada soa tão bem quanto estas músicas.", "Nada fica mais bonito que o tema do menu."]) assert.ok(caught(line), "não pegou: " + line);
  for (const line of ["Nenhuma pessoa ouviu as músicas durante o desenvolvimento.", "A ferramenta não mede se soa bem: só que toca.", "Ninguém ouviu: nada aqui diz que é agradável.", "Nenhuma pessoa ouviu estes temas; as conferências são estruturais.",
    "Para ouvir um tema, basta jogar a fase.", "O dono ainda não ouviu as músicas.", "Ninguém ouviu estes temas nem escutou nenhum.", "As músicas não ficam boas nem ruins: ninguém sabe."]) assert.ok(!caught(line), "pegou um controle legítimo: " + line);
  const labels = (line) => [...line.matchAll(MUSIC_LABELS)].length;
  for (const line of ["escrito pelo compositor", "os compositores seguem este molde", "teste do compositor", "feito na frente A6", "A6-DESIGN.md"]) assert.ok(labels(line), "não pegou o rótulo: " + line);
  for (const line of ["0xA6 é só um número", "o compositor-de-nada" && "feitor", "ré maior e dó", "A62 e xA6x"]) assert.ok(!labels(line), "pegou o que não é rótulo: " + line);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de honestidade passaram");
process.exit(failed ? 1 : 0);
