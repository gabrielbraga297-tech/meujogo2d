// Resume os resultados de tools/difficulty/run.js (arquivos .json): uma linha por fase com vitórias, vidas perdidas (média e mediana), golpes por minuto e tempo.
// Uso:  node tools/difficulty/summary.js resultado1.json [resultado2.json ...]   (vários arquivos são somados: um por bichinho, por exemplo)
//       node tools/difficulty/summary.js antes.json --vs depois.json   (duas colunas lado a lado: mediana e média de golpes por fase)
const fs = require("fs");
const args = process.argv.slice(2), vs = args.indexOf("--vs");
const load = (files) => files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : NaN; };
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
function stats(rows) {
  const out = {};
  for (const r of rows) if (!r.error) (out[r.animal] ||= {})[r.id] ||= [];
  for (const r of rows) if (!r.error) out[r.animal][r.id].push(r);
  return out;
}
const line = (rs) => {
  const lost = rs.map((r) => r.livesLost), won = rs.filter((r) => r.state === "won").length, t = rs.reduce((s, r) => s + r.time, 0), h = lost.reduce((s, x) => s + x, 0);
  return { n: rs.length, won, mean: mean(lost), median: median(lost), rate: (h / Math.max(1, t)) * 60, time: mean(rs.map((r) => r.time)) };
};
const A = stats(load(vs >= 0 ? args.slice(0, vs) : args)), B = vs >= 0 ? stats(load(args.slice(vs + 1))) : null;
for (const an of ["dog", "cat", "bird"]) {
  if (!A[an]) continue;
  console.log(`\n== ${an}`);
  for (const id of Object.keys(A[an]).map(Number).sort((a, b) => a - b)) {
    const a = line(A[an][id]);
    let s = `F${String(id).padStart(2)}: ${String(a.won).padStart(2)}/${a.n} vit  golpes média ${a.mean.toFixed(2).padStart(6)}  mediana ${String(a.median).padStart(4)}  ${a.rate.toFixed(2)}/min  ${a.time.toFixed(0)} s`;
    if (B && B[an] && B[an][id]) { const b = line(B[an][id]); s += `   →   ${String(b.won).padStart(2)}/${b.n} vit  média ${b.mean.toFixed(2).padStart(6)}  mediana ${String(b.median).padStart(4)}  ${b.rate.toFixed(2)}/min`; }
    console.log(s);
  }
}
