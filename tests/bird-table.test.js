// Confere a "Tabela das fases do Passarinho (0.20.0)" do README (a cópia técnica da tabela entregue ao dono) com os DADOS do jogo, sem navegador. Uso: node tests/bird-table.test.js
//  - a tabela é a que tools/birdmaze/readme_table.js gera (js/bird-levels.js + js/bird-themes*.js + a tabela do Gatinho do README): para regerar, `node tools/birdmaze/readme_table.js --write`;
//  - uma segunda conferência, escrita de outro jeito, célula a célula: ambiente, mapa, gatos, gaviões, sementes, frutos, minhocas, tipos de fruto, galhos, ventos e a velocidade do passarinho (252 × birdSpeed)
//    vêm de BirdLevels; a condição, as velocidades dos inimigos, as vidas, a perda por vida, a missão e o bônus são os da tabela do Gatinho (o motor copia as mesmas regras da fase `like` do Cachorrinho);
//  - as seções do README ficam na ordem certa (a do Gatinho, "Passarinho (0.20.0)", a tabela, a biologia, "Conta com senha"), porque o e2e fatia o README entre cabeçalhos.
// O QUE ESTE TESTE COBRE (e o que não): as colunas que vêm de js/bird-levels.js (ambiente, mapa, gatos, gaviões, sementes, frutos, minhocas, tipos de fruto, galhos, ventos, velocidade do passarinho) são comparadas com os DADOS do jogo;
// as colunas HERDADAS (condição, velocidades dos inimigos, vidas, perda por vida, missão e bônus) são comparadas aqui só com a tabela do Gatinho do PRÓPRIO README, ou seja, este teste prova que as duas tabelas do README combinam entre si.
// Que esses números valem no jogo é provado pela seção "tabela das fases do Passarinho" do e2e (tests/e2e-bird-tabela.js), que compara cada célula com as fases MONTADAS no navegador (a fase `like` do Cachorrinho que o motor copia).
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const T = require(path.join(root, "tools/birdmaze/readme_table.js"));
const LEVELS = require(path.join(root, "js/bird-levels.js"));
let failed = 0;
const test = (name, fn) => { try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); } };

const between = (a, b) => { const i = readme.indexOf(a), j = readme.indexOf(b); assert.ok(i >= 0 && j > i, `faltam "${a}" e "${b}" no README (nessa ordem)`); return readme.slice(i, j); };
const rowsOf = (txt) => txt.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
const num = (s) => Number(String(s).replace(",", "."));
const comma = (n) => String(Math.round(n * 1e6) / 1e6).replace(".", ",");

const sec = between("## Tabela das fases do Passarinho (0.20.0)", "## Biologia por trás do Passarinho (0.20.0)");
const rows = rowsOf(sec);
const cat = rowsOf(between("## Tabela das fases do Gatinho", "## Biologia por trás do Gatinho"));
const COL = Object.fromEntries(T.HEADER.map((h, i) => [h, i]));

test("as seções do Passarinho estão na ordem que o e2e espera: Gatinho, Passarinho, tabela, biologia, Conta com senha", () => {
  const at = (h) => readme.indexOf("\n" + h);
  const order = ["## Biologia por trás do Gatinho (0.18.0)", "## Passarinho (0.20.0)", "## Tabela das fases do Passarinho (0.20.0)", "## Biologia por trás do Passarinho (0.20.0)", "## Conta com senha (opcional)"];
  order.forEach((h) => assert.ok(at(h) >= 0, `falta "${h}" no README`));
  assert.deepStrictEqual(order.map(at), order.map(at).slice().sort((a, b) => a - b), "as seções estão fora de ordem");
  // nada entre a tabela do Gatinho e a biologia do Gatinho (o e2e fatia o README ali)
  assert.ok(!/\n## /.test(between("## Tabela das fases do Gatinho", "## Biologia por trás do Gatinho").slice(5)), "há uma seção ## entre a tabela do Gatinho e a biologia do Gatinho");
  // a tabela vem logo antes da biologia (o e2e fatia de um cabeçalho ao outro)
  assert.ok(!/\n## /.test(sec.slice(5)), "há uma seção ## entre a tabela do Passarinho e a biologia do Passarinho");
});

test("a tabela do README tem a linha de cabeçalho do script e uma linha por fase (20 colunas)", () => {
  assert.ok(sec.includes("| " + T.HEADER.join(" | ") + " |"), "o cabeçalho da tabela não é o do script");
  assert.strictEqual(T.HEADER.length, 20);
  assert.strictEqual(rows.length, 20, "linhas de fase: " + rows.length);
  rows.forEach((r, i) => { assert.strictEqual(r.length, 20, `fase ${i + 1} com ${r.length} células`); assert.strictEqual(Number(r[0]), i + 1); });
});

test("a tabela do README é exatamente a gerada por tools/birdmaze/readme_table.js (a partir dos dados)", () => {
  const want = T.rows(readme).map((r) => r.join(" | "));
  const have = rows.map((r) => r.join(" | "));
  assert.deepStrictEqual(have, want, "rode: node tools/birdmaze/readme_table.js --write");
  assert.strictEqual(T.splice(readme), readme, "o README muda se a tabela for regerada");
});

test("segunda conferência, célula a célula: o que vem de js/bird-levels.js", () => {
  const MIX = { scare: "voo alto", gold: "escudo", ice: "ar frio", turbo: "rajada", magnet: "ímã" };
  LEVELS.forEach((lv, i) => {
    const r = rows[i], c = (h) => r[COL[h]], tag = `Fase ${lv.id}`;
    assert.strictEqual(Number(c("Fase")), lv.id, tag);
    assert.strictEqual(c("Ambiente"), lv.place, tag + ": ambiente");
    assert.strictEqual(c("Mapa"), `${lv.size[0]}×${lv.size[1]}`, tag + ": mapa");
    assert.strictEqual(c("Gatos de quintal"), String(lv.cats), tag + ": gatos");
    assert.strictEqual(c("Gaviões"), lv.hawks ? String(lv.hawks) : "—", tag + ": gaviões");
    assert.strictEqual(c("Sementes"), String(lv.seeds), tag + ": sementes");
    assert.strictEqual(c("Frutos"), lv.fruits ? String(lv.fruits) : "—", tag + ": frutos");
    assert.strictEqual(c("Minhocas"), lv.worms ? String(lv.worms) : "—", tag + ": minhocas");
    assert.strictEqual(c("Velocidade do passarinho"), comma(252 * lv.birdSpeed), tag + ": velocidade do passarinho");
    assert.strictEqual(c("Galhos (grupos)"), lv.special.G ? String(lv.special.G) : "—", tag + ": galhos");
    assert.strictEqual(c("Ventos (grupos)"), lv.special.wind ? String(lv.special.wind) : "—", tag + ": ventos");
    const kinds = {}; lv.fruitMix.forEach((k) => { kinds[k] = (kinds[k] || 0) + 1; });
    assert.strictEqual(Object.values(kinds).reduce((a, b) => a + b, 0), lv.fruits, tag + ": fruitMix");
    const cell = c("Tipos de fruto");
    if (!lv.fruits) assert.strictEqual(cell, "—", tag);
    else { for (const [k, n] of Object.entries(kinds)) assert.ok(cell.includes(`${n}× ${MIX[k]}`), `${tag}: tipos de fruto "${cell}" sem ${n}× ${MIX[k]}`); assert.strictEqual(cell.split(", ").length, Object.keys(kinds).length, tag + ": tipos de fruto repetidos"); }
    assert.strictEqual(c("Luz"), lv.id === 18 ? "entardecer" : lv.id === 19 ? "noite" : "—", tag + ": luz");
  });
});

test("segunda conferência: o que o Passarinho herda (a tabela do Gatinho: condição, velocidades dos inimigos, vidas, perda por vida, missão e bônus)", () => {
  assert.strictEqual(cat.length, 20);
  LEVELS.forEach((lv, i) => {
    const g = cat[i], r = rows[i], c = (h) => r[COL[h]], tag = `Fase ${lv.id}`;
    assert.strictEqual(lv.like, lv.id, tag + ": o Passarinho imita a fase de mesmo número do Cachorrinho");
    assert.strictEqual(c("Condição para avançar"), g[3], tag + ": condição");
    assert.strictEqual(c("Velocidade dos gatos (sem ! / com !)"), g[9], tag + ": velocidade dos gatos");
    assert.strictEqual(c("Velocidade dos gaviões (anda / persegue)"), lv.hawks ? g[10] : "—", tag + ": velocidade dos gaviões");
    assert.strictEqual(lv.hawks, g[10] === "—" ? 0 : Number(g[5]), tag + ": gaviões = rastreadores do Gatinho");
    assert.strictEqual(lv.cats, Number(g[4]), tag + ": gatos = cães de guarda do Gatinho");
    assert.strictEqual(lv.seeds, Number(g[6]), tag + ": sementes = ratinhos do Gatinho");
    assert.strictEqual(c("Vidas máx."), g[12], tag);
    assert.strictEqual(c("Perda por vida"), g[13], tag);
    if (g[14] === "—") { assert.strictEqual(c("Missão"), "—", tag); assert.strictEqual(c("Bônus da missão"), "—", tag); }
    else {
      assert.strictEqual(c("Missão"), g[14].replace("novelos", "frutos").replace("ratinhos", "sementes"), tag + ": missão");
      assert.strictEqual(c("Bônus da missão"), g[15], tag + ": bônus");
      assert.ok(/missão/.test(c("Condição para avançar")), tag + ": a condição fala da missão");
    }
  });
  // a rampa que o desenho promete
  assert.deepStrictEqual(rows.slice(0, 3).map((r) => r[COL["Condição para avançar"]]), ["pegar tudo", "pegar tudo", "pegar tudo"]);
  assert.deepStrictEqual(rows.slice(10).map((r) => num(r[COL["Bônus da missão"]])), [200, 250, 300, 350, 400, 450, 500, 550, 600, 650]);
  assert.deepStrictEqual(rows.map((r) => r[COL["Velocidade do passarinho"]]).filter((v) => v !== "252"), ["201,6", "226,8"]);
});

test("a tabela e o texto em volta não trazem rótulos internos de trabalho", () => {
  const bad = (sec + readme.slice(readme.indexOf("\n## Passarinho (0.20.0)"), readme.indexOf("\n## Tabela das fases do Passarinho"))).match(/\bA5\b|\bfrentes?\b|\bwip-\d|\bagente (de|da) (mapas|sons|arte)|\bcoordenador\b/gi);
  assert.strictEqual(bad, null, "rótulo interno no README: " + (bad || []).join(", "));
});

console.log(failed ? `\n${failed} falha(s)` : "\nA tabela das fases do Passarinho confere");
process.exit(failed ? 1 : 0);
