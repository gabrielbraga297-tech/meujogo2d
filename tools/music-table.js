// Tabela das músicas tema: lê as receitas registradas (js/music.js e js/music-dog.js, js/music-cat.js e js/music-bird.js) e gera a tabela em Markdown do README.
// Uso:
//   node tools/music-table.js            imprime a tabela
//   node tools/music-table.js --write    troca, no README.md, o trecho entre <!-- music-table:inicio --> e <!-- music-table:fim --> pela tabela gerada
// O teste tests/music-table.test.js confere que o trecho do README é igual ao gerado. Nada aqui é aleatório: a mesma lista de receitas dá sempre a mesma tabela.
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const Music = require(path.join(root, "js/music.js"));
for (const f of ["js/music-dog.js", "js/music-cat.js", "js/music-bird.js"]) if (fs.existsSync(path.join(root, f))) require(path.join(root, f));

const START = "<!-- music-table:inicio -->", END = "<!-- music-table:fim -->";
const ANIMAL = { menu: "Menu", dog: "Cachorrinho", cat: "Gatinho", bird: "Passarinho" };
const KEY = { C: "Dó", "C#": "Dó#", Db: "Réb", D: "Ré", "D#": "Ré#", Eb: "Mib", E: "Mi", F: "Fá", "F#": "Fá#", Gb: "Solb", G: "Sol", "G#": "Sol#", Ab: "Láb", A: "Lá", "A#": "Lá#", Bb: "Sib", B: "Si" };
const MODE = { major: "maior", minor: "menor", dorian: "dórico", mixolydian: "mixolídio", lydian: "lídio", phrygian: "frígio", pentMajor: "pentatônica maior", pentMinor: "pentatônica menor", harmMinor: "menor harmônica", blues: "blues" };
const INST = { pluck: "cordas beliscadas", marimba: "marimba", xylo: "xilofone", flute: "flauta", bell: "sino", celesta: "celesta", harp: "harpa", organ: "órgão", strings: "cordas", bass: "baixo", bassSine: "baixo senoidal", bassSaw: "baixo serrilha", contrabass: "contrabaixo pizzicato" };
const KIT = { woodblock: "bloco de madeira", brush: "escova", shaker: "chocalho", softkick: "bumbo macio", hat: "prato leve" };
const METER = { 4: "4/4", 3: "3/4", 6: "6/8" };
const HEAD = ["Tema", "Bichinho", "Lugar", "Tom e modo", "Andamento (bpm)", "Compasso", "Forma", "Solo", "Baixo", "Percussão", "Laço (s)"];

const inst = (n) => INST[n] || n;
const cell = (s) => String(s).replace(/\|/g, "/").replace(/\s+/g, " ").trim();
function order(a, b) { // o menu primeiro; depois Cachorrinho, Gatinho e Passarinho, cada um da Fase 1 à 20
  const rank = (r) => ({ menu: 0, dog: 1, cat: 2, bird: 3 }[r.animal] ?? 4), num = (r) => Number((/(\d+)$/.exec(r.id) || [0, 0])[1]);
  return rank(a) - rank(b) || num(a) - num(b) || (a.id < b.id ? -1 : 1);
}
function solo(r) {
  const lead = r.voices.lead, list = [lead.inst, ...((lead.rotate || []).map((x) => x.inst || lead.inst))];
  return [...new Set(list)].map(inst).join(" / ");
}
function bass(r) { return r.voices.bass === null ? "—" : `${inst((r.voices.bass || {}).inst || "bass")} (${(r.voices.bass || {}).pattern || "rootfifth"})`; }
function perc(r) {
  const p = r.voices.perc;
  if (!p) return "—";
  const kit = [].concat(p.kit || "woodblock");
  return `${[...new Set(kit)].map((k) => KIT[k] || k).join(" + ")} (${p.pattern || "steady"})`;
}
function rows() {
  return Music.ids().map((id) => Music.get(id)).filter(Boolean).sort(order).map((r) => {
    const sc = Music.scoreOf(r.id);
    return [r.id, ANIMAL[r.animal] || r.animal, r.place || "—", `${KEY[r.key || "C"] || r.key} ${MODE[r.mode || "major"] || r.mode}`, r.bpm, METER[r.beats || 4], r.form || "ABAB", solo(r), bass(r), perc(r), sc ? sc.lengthSeconds.toFixed(1).replace(".", ",") : "?"].map(cell);
  });
}
function table() {
  const body = rows();
  return [`| ${HEAD.join(" | ")} |`, `|${HEAD.map(() => "---").join("|")}|`, ...body.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}
// o trecho do README entre os marcadores (sem os marcadores), ou null
function inReadme(text) { const a = text.indexOf(START), b = text.indexOf(END); return a >= 0 && b > a ? text.slice(a + START.length, b).replace(/^\n+|\n+$/g, "") : null; }
function writeReadme(file) {
  const text = fs.readFileSync(file, "utf8"), a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < a) throw new Error(`faltam os marcadores ${START} e ${END} no README`);
  fs.writeFileSync(file, `${text.slice(0, a + START.length)}\n${table()}\n${text.slice(b)}`);
}

module.exports = { table, rows, inReadme, START, END, HEAD, COMMAND: "node tools/music-table.js --write" };
if (require.main === module) {
  if (process.argv.includes("--write")) { writeReadme(path.join(root, "README.md")); console.log(`README.md atualizado: ${rows().length} temas na tabela`); }
  else console.log(table());
}
