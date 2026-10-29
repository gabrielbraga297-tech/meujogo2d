#!/usr/bin/env node
"use strict";
// Gera a "Tabela das fases do Passarinho (0.20.0)" do README a partir dos DADOS do jogo, sem digitar nada à mão.
//   - js/bird-levels.js (BirdLevels): ambiente, mapa, gatos de quintal (V), gaviões (H), sementes, frutos, minhocas, tipos de fruto, galhos, ventos e a velocidade do passarinho (252 px/s × birdSpeed);
//   - js/bird-themes*.js (BirdThemes): a luz de cada fase (entardecer na 18, noite na 19);
//   - a tabela "Tabela das fases do Gatinho (0.18.0)" do próprio README: o motor copia do Cachorrinho (fase `like`) as regras que o Passarinho herda, e o Gatinho copia as mesmas. Daí vêm,
//     coluna a coluna, a condição de avançar (pontos mínimos e missão), a velocidade dos gatos de quintal (= a dos cães de guarda: sem ! / com !), a velocidade dos gaviões (= a dos rastreadores:
//     anda / persegue), as vidas máximas, a perda por vida, a missão (com "novelos" -> "frutos" e "ratinhos" -> "sementes") e o bônus da missão.
// Uso:
//   node tools/birdmaze/readme_table.js            imprime a tabela (Markdown) na saída
//   node tools/birdmaze/readme_table.js --write    grava a tabela no README.md (só as linhas da tabela, dentro da seção "Tabela das fases do Passarinho (0.20.0)")
//   node tools/birdmaze/readme_table.js --check    confere se a tabela do README é igual à gerada (sai com código 1 se não for; é o que tests/bird-table.test.js faz)
// Se a tabela do Gatinho mudar (outra velocidade, outra missão), rode --write de novo: o README do Passarinho acompanha.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const README = path.join(ROOT, "README.md");
const H_TABLE = "## Tabela das fases do Passarinho (0.20.0)";
const H_NEXT = "## Biologia por trás do Passarinho (0.20.0)";
const H_CAT = "## Tabela das fases do Gatinho";
const H_CAT_NEXT = "## Biologia por trás do Gatinho";

const BirdLevels = require(path.join(ROOT, "js/bird-levels.js"));
const BirdThemes = require(path.join(ROOT, "js/bird-themes.js"));
require(path.join(ROOT, "js/bird-themes-1.js"));
require(path.join(ROOT, "js/bird-themes-2.js"));

const HEADER = ["Fase", "Ambiente", "Mapa", "Condição para avançar", "Gatos de quintal", "Gaviões", "Sementes", "Frutos", "Minhocas", "Velocidade dos gatos (sem ! / com !)",
  "Velocidade dos gaviões (anda / persegue)", "Velocidade do passarinho", "Vidas máx.", "Perda por vida", "Missão", "Bônus da missão", "Luz", "Galhos (grupos)", "Ventos (grupos)", "Tipos de fruto"];
const FRUIT_NAMES = { scare: "voo alto", gold: "escudo", ice: "ar frio", turbo: "rajada", magnet: "ímã" };
const FRUIT_ORDER = ["scare", "gold", "ice", "turbo", "magnet"];

// "201,6" (vírgula decimal, sem zeros sobrando) a partir de um número
const fmt = (n) => String(Math.round(n * 1e6) / 1e6).replace(".", ",");

// As linhas de dados ("| 12 | ... |") de um trecho de README, cada uma como lista de células.
const dataRows = (text) => text.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

// A tabela do Gatinho: uma entrada por fase, com as células que o Passarinho herda.
function catTable(readme) {
  const a = readme.indexOf(H_CAT), b = readme.indexOf(H_CAT_NEXT);
  if (a < 0 || b < a) throw new Error("não achei a seção da tabela do Gatinho no README");
  const rows = dataRows(readme.slice(a, b));
  if (rows.length !== 20) throw new Error(`a tabela do Gatinho tem ${rows.length} linhas (esperava 20)`);
  const by = {};
  for (const r of rows) {
    if (r.length !== 17) throw new Error(`linha ${r[0]} da tabela do Gatinho com ${r.length} células (esperava 17)`);
    by[Number(r[0])] = { cond: r[3], vets: r[9], trackers: r[10], cap: r[12], pen: r[13], mission: r[14], bonus: r[15], hawks: r[5], vetCount: r[4], seeds: r[6], fruits: r[7], worms: r[8] };
  }
  return by;
}

// "todos os novelos + 40 ratinhos" -> "todos os frutos + 40 sementes"
const missionBird = (s) => s.replace(/novelos/g, "frutos").replace(/ratinhos/g, "sementes");

function rows(readme) {
  const cat = catTable(readme);
  const out = [];
  for (const lv of BirdLevels) {
    const g = cat[lv.id];
    if (!g) throw new Error(`o Gatinho não tem a fase ${lv.id}`);
    const th = BirdThemes.of(lv.id);
    if (!th || th.place !== lv.place) throw new Error(`Fase ${lv.id}: o ambiente de js/bird-themes (${th && th.place}) não é o de js/bird-levels.js (${lv.place})`);
    const mission = g.mission === "—" ? null : missionBird(g.mission);
    // as heranças só valem se a missão cabe nos números do Passarinho (as sementes e os frutos são os mesmos do Gatinho, por desenho)
    const mSeeds = mission && /(\d+) sementes/.exec(mission);
    if (mSeeds && Number(mSeeds[1]) > lv.seeds) throw new Error(`Fase ${lv.id}: a missão pede ${mSeeds[1]} sementes e a fase tem ${lv.seeds}`);
    if (mission && /todos os frutos/.test(mission) && !(lv.fruits > 0)) throw new Error(`Fase ${lv.id}: a missão pede todos os frutos e a fase não tem frutos`);
    const mix = FRUIT_ORDER.map((k) => [k, lv.fruitMix.filter((x) => x === k).length]).filter(([, n]) => n > 0).map(([k, n]) => `${n}× ${FRUIT_NAMES[k]}`);
    if (lv.fruitMix.length !== lv.fruits) throw new Error(`Fase ${lv.id}: fruitMix (${lv.fruitMix.length}) e fruits (${lv.fruits}) não combinam`);
    const light = th.dusk ? "entardecer" : th.night ? "noite" : "—";
    out.push([
      String(lv.id), lv.place, `${lv.size[0]}×${lv.size[1]}`, g.cond,
      String(lv.cats), lv.hawks ? String(lv.hawks) : "—", String(lv.seeds), lv.fruits ? String(lv.fruits) : "—", lv.worms ? String(lv.worms) : "—",
      g.vets, lv.hawks ? g.trackers : "—", fmt(252 * lv.birdSpeed), g.cap, g.pen, mission || "—", mission ? g.bonus : "—", light,
      lv.special.G ? String(lv.special.G) : "—", lv.special.wind ? String(lv.special.wind) : "—", mix.length ? mix.join(", ") : "—",
    ]);
  }
  return out;
}

function render(readme) {
  const line = (cells) => `| ${cells.join(" | ")} |`;
  return [line(HEADER), `|${HEADER.map(() => "---").join("|")}|`, ...rows(readme).map(line)].join("\n");
}

// Troca, dentro da seção do Passarinho, o bloco de linhas "| ... |" (o primeiro, o da tabela) pela tabela gerada.
function splice(readme) {
  const a = readme.indexOf(H_TABLE), b = readme.indexOf(H_NEXT);
  if (a < 0 || b < a) throw new Error(`faltam no README as seções "${H_TABLE}" e "${H_NEXT}" (nessa ordem)`);
  const sec = readme.slice(a, b), lines = sec.split("\n");
  const first = lines.findIndex((l) => /^\| Fase \|/.test(l));
  let last = first;
  while (last >= 0 && last + 1 < lines.length && /^\|/.test(lines[last + 1])) last++;
  if (first < 0) throw new Error("não achei a tabela (linha \"| Fase |\") na seção do Passarinho");
  const next = [...lines.slice(0, first), ...render(readme).split("\n"), ...lines.slice(last + 1)].join("\n");
  return readme.slice(0, a) + next + readme.slice(b);
}

// A tabela que está no README agora (as linhas de dados), para o teste comparar.
function readmeRows(readme) {
  const a = readme.indexOf(H_TABLE), b = readme.indexOf(H_NEXT);
  if (a < 0 || b < a) return null;
  return dataRows(readme.slice(a, b));
}

module.exports = { HEADER, rows, render, splice, readmeRows, catTable, missionBird, H_TABLE, H_NEXT };

if (require.main === module) {
  const readme = fs.readFileSync(README, "utf8");
  const arg = process.argv[2];
  if (arg === "--write") {
    const next = splice(readme);
    if (next === readme) console.log("README.md já tem a tabela do Passarinho igual à gerada");
    else { fs.writeFileSync(README, next); console.log("README.md atualizado com a tabela do Passarinho"); }
  } else if (arg === "--check") {
    const want = rows(readme).map((r) => r.join(" | ")), have = (readmeRows(readme) || []).map((r) => r.join(" | "));
    const bad = want.map((w, i) => (w === have[i] ? null : `fase ${i + 1}:\n  README: ${have[i]}\n  dados:  ${w}`)).filter(Boolean);
    if (have.length !== want.length) bad.push(`o README tem ${have.length} linhas de fase (esperava ${want.length})`);
    if (bad.length) { console.error("A tabela do README não é a gerada:\n" + bad.join("\n")); process.exit(1); }
    console.log("A tabela do Passarinho do README é a gerada pelos dados");
  } else console.log(render(readme));
}
