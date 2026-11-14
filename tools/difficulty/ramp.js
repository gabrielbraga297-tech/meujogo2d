// RAMPA DE DIFICULDADE (0.22.0): contas sobre as medições de tools/difficulty/run.js e a regra que o jogo promete ao dono.
// A REGRA (pedido de 06/11/2026): em cada bichinho, nenhuma fase anterior é mais difícil que uma posterior (a dificuldade sobe proporcionalmente) e as Fases 18 e 19 ficam
// LEVEMENTE mais difíceis que a 17 e MENOS difíceis que a 20. "Difícil" aqui é o que o robô de tools/difficulty mede, com vidas infinitas (--immortal): em cada partida (uma semente) a taxa de golpes é
// golpes ÷ minutos de jogo (no mínimo 1 minuto); R é a MÉDIA dessas taxas com cada partida limitada a CAP = 6 golpes/min (uma partida em que o robô fica preso apanhando de um inimigo não decide sozinha a fase; sem o limite,
// a Fase 17 do Cachorrinho media 6,6 golpes/min (acima da 20, que media 3,4) só porque uma das 12 partidas teve 22 golpes/min; a mediana dela era 2,7). É uma régua para comparar fases do mesmo bichinho, não o quanto uma pessoa sofre (o robô não enxerga a escuridão das noites).
// Como a medição tem ruído (e as fases iniciais quase não têm golpes), a comparação aceita uma folga: a fase seguinte pode medir até TOL(R) abaixo da anterior, onde TOL(R) = max(0,6; 0,3 × R).
//
// Uso:
//   node tools/difficulty/ramp.js build dog.json cat.json bird.json [--seeds N] > tools/difficulty/ramp.json   (resume as medições de run.js e junta as contagens de inimigos que o jogo tem hoje)
//   node tools/difficulty/ramp.js check [arquivo.json]                                                        (confere a regra e se as contagens gravadas são as do jogo; sai com 1 se falhar)
//   node tools/difficulty/ramp.js table [arquivo.json]                                                        (imprime a tabela legível)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "../..");

const TOL_MIN = 0.6, TOL_FRAC = 0.3, CAP = 6, MIN_SECS = 60; // (CAP: golpes por minuto, no máximo, que uma partida soma ao R; MIN_SECS: uma partida de menos de 1 minuto conta como 1 minuto, senão 1 golpe numa fase de 13 s valeria 4 golpes/min)
const tol = (r) => Math.max(TOL_MIN, TOL_FRAC * r);
const ANIMALS = ["dog", "cat", "bird"];
const KEYS = { dog: ["agents", "cats"], cat: ["dogs", "trackers"], bird: ["cats", "hawks"] };

// ---- as contagens de inimigos que o jogo tem hoje (lidas dos dados, sem navegador)
function countsNow() {
  const out = { dog: {}, cat: {}, bird: {} };
  const game = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
  const parts = game.split(/\n(?: {6}| {4}\{ )id: (\d+), title: "Fase \d+"/); // [antes, id, trecho, id, trecho, ...] (as Fases 1 e 2 vêm numa linha só)
  for (let i = 1; i < parts.length; i += 2) {
    const id = Number(parts[i]); if (id < 1 || id > 20 || out.dog[id]) continue;
    const chunk = parts[i + 1].slice(0, 6000);
    const v = chunk.match(/\bvets: (?:vetsOf\(\d+, (\d+)\)|\[([^\]]*)\])/);
    const agents = v ? (v[1] !== undefined ? Number(v[1]) : v[2].split(",").filter((s) => s.trim()).length) : 0;
    const c = chunk.match(/\bcats: (\[\[[\s\S]*?\]\])/);
    out.dog[id] = { agents, cats: c ? (c[1].match(/\[\s*-?\d+\s*,\s*-?\d+\s*\]/g) || []).length : 0 };
  }
  for (const lv of require(path.join(ROOT, "js/cat-levels.js"))) out.cat[lv.id] = { dogs: lv.dogs, trackers: lv.trackers };
  for (const lv of require(path.join(ROOT, "js/bird-levels.js"))) out.bird[lv.id] = { cats: lv.cats, hawks: lv.hawks };
  return out;
}

// ---- de várias rodadas (uma por semente) para uma linha por fase
function summarize(rows) {
  const byAnimal = {};
  for (const r of rows) {
    if (r.error) continue;
    const a = (byAnimal[r.animal] = byAnimal[r.animal] || {});
    (a[r.id] = a[r.id] || []).push(r);
  }
  const out = {};
  for (const [animal, levels] of Object.entries(byAnimal)) {
    out[animal] = {};
    for (const [id, rs] of Object.entries(levels)) {
      const hits = rs.reduce((n, r) => n + r.hits, 0), secs = rs.reduce((n, r) => n + r.time, 0);
      const lost = rs.map((r) => r.livesLost).sort((x, y) => x - y);
      const rates = rs.map((r) => Math.min(CAP, (r.hits / Math.max(MIN_SECS, r.time)) * 60));
      out[animal][id] = {
        seeds: rs.length, wins: rs.filter((r) => r.state === "won").length, hits,
        R: Math.round((rates.reduce((n, x) => n + x, 0) / rates.length) * 100) / 100,
        pooled: secs > 0 ? Math.round((hits / secs) * 60 * 100) / 100 : 0, // (golpes totais ÷ minutos totais, sem o limite: só para comparar)
        meanHits: Math.round((hits / rs.length) * 100) / 100, medianHits: (lost[(lost.length - 1) >> 1] + lost[lost.length >> 1]) / 2,
        meanSecs: Math.round(secs / rs.length),
      };
    }
  }
  return out;
}

// ---- a regra
function violations(table) {
  const bad = [];
  for (const animal of ANIMALS) {
    const t = table.animals && table.animals[animal];
    if (!t) { bad.push(`${animal}: sem medições`); continue; }
    for (let i = 1; i <= 20; i++) if (!t[i]) bad.push(`${animal}: falta a Fase ${i}`);
    if (bad.length) continue;
    // 1) nenhuma fase anterior é mais difícil que uma posterior (com a folga)
    for (let i = 1; i <= 20; i++) for (let j = i + 1; j <= 20; j++) {
      if (t[j].R < t[i].R - tol(t[i].R)) bad.push(`${animal}: a Fase ${i} (R ${t[i].R}) é mais difícil que a Fase ${j} (R ${t[j].R}) além da folga de ${tol(t[i].R).toFixed(2)}`);
    }
    // 2) a 17 < 18 < 19 < 20 (com a folga) e 18 e 19 não passam da 20 nem ficam abaixo da 17
    for (const [a, b] of [[17, 18], [18, 19], [19, 20], [17, 19], [18, 20], [17, 20]]) {
      if (t[b].R < t[a].R - tol(t[a].R)) bad.push(`${animal}: a Fase ${b} (R ${t[b].R}) ficou abaixo da Fase ${a} (R ${t[a].R})`);
    }
  }
  return bad;
}
function stale(table) { // as contagens gravadas precisam ser as do jogo: mudou inimigo, tem que medir de novo
  const now = countsNow(), bad = [];
  for (const animal of ANIMALS) for (let i = 1; i <= 20; i++) {
    const rec = table.animals && table.animals[animal] && table.animals[animal][i];
    if (!rec) continue;
    for (const k of KEYS[animal]) if (rec.enemies[k] !== now[animal][i][k]) bad.push(`${animal} Fase ${i}: ${k} gravado ${rec.enemies[k]}, no jogo ${now[animal][i][k]} — meça de novo (tools/difficulty/run.js) e refaça tools/difficulty/ramp.json`);
  }
  return bad;
}

module.exports = { MIN_SECS, tol, ANIMALS, KEYS, countsNow, summarize, violations, stale, TOL_MIN, TOL_FRAC, CAP };

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  const file = (a) => a || path.join(__dirname, "ramp.json");
  if (cmd === "build") {
    const sIdx = rest.indexOf("--seeds"), files = rest.filter((x, i) => !x.startsWith("--") && (sIdx < 0 || i !== sIdx + 1));
    const rows = files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8"))), sum = summarize(rows), now = countsNow(), animals = {};
    for (const a of ANIMALS) { animals[a] = {}; for (const [id, s] of Object.entries(sum[a] || {})) animals[a][id] = { enemies: now[a][id], ...s }; }
    process.stdout.write(JSON.stringify({ about: "Medições do robô de tools/difficulty (vidas infinitas): R = média, por partida, de golpes por minuto de jogo (cada partida limitada a 6). Regra e folga em tools/difficulty/ramp.js.", tolerance: { min: TOL_MIN, fraction: TOL_FRAC }, cap: CAP, animals }, null, 1) + "\n");
  } else if (cmd === "check" || cmd === "table") {
    const table = JSON.parse(fs.readFileSync(file(rest[0]), "utf8"));
    if (cmd === "table") {
      for (const a of ANIMALS) {
        console.log(`\n== ${a}   (fase: inimigos ${KEYS[a].join("/")}, R golpes/min, vitórias, média de golpes por partida)`);
        for (let i = 1; i <= 20; i++) { const r = table.animals[a][i]; if (r) console.log(`F${String(i).padStart(2)}: ${KEYS[a].map((k) => r.enemies[k]).join("/").padEnd(5)} R ${String(r.R.toFixed(2)).padStart(5)}  ${r.wins}/${r.seeds}  ${r.meanHits}`); }
      }
    } else {
      const bad = violations(table).concat(stale(table));
      console.log(bad.length ? bad.join("\n") : "rampa ok");
      process.exit(bad.length ? 1 : 0);
    }
  } else { console.error("uso: node tools/difficulty/ramp.js build|check|table ..."); process.exit(2); }
}
