// Mede a dificuldade das fases com robôs (tools/difficulty/probe-page.js no Cachorrinho e no Gatinho; tests/bird-robot-page.js no Passarinho): joga cada fase em várias sementes e imprime,
// por fase, quantas vezes o robô foi pego, quanto demorou e quantas vezes chegou ao fim. Serve de RÉGUA para comparar fases do mesmo bichinho (não diz o quanto uma pessoa vai sofrer).
// O jogo anda por quadros simulados (1/60 s), então o resultado não depende do relógio da máquina: a mesma semente dá o mesmo resultado.
// Uso:  node tools/difficulty/run.js [--animals dog,cat,bird] [--levels 1-20] [--seeds 8] [--cap 900] [--immortal] [--out resultado.json]
//   --immortal  o robô recupera as vidas a cada golpe: assim ele sempre termina a fase (ou estoura o tempo) e a medida é "quantos golpes até terminar", sem o teto do número de vidas.
//   Variáveis: NODE_PATH (onde está o playwright), CHROMIUM_PATH, BROWSER (firefox|webkit), como no tests/e2e.js. Rode sob `flock` se mais de um processo abrir o navegador.
const path = require("path");
const fs = require("fs");
const { chromium, firefox, webkit } = require("playwright");
const PROBE = require("./probe-page.js");              // Cachorrinho e Gatinho
const BIRD_ROBOT = require("../../tests/bird-robot-page.js"); // Passarinho (o robô que conhece voo, galhos e vento)

const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const animals = val("--animals", "dog,cat,bird").split(",");
const [lo, hi] = val("--levels", "1-20").split("-").map(Number);
const immortal = args.includes("--immortal"), seeds = Number(val("--seeds", "8")), cap = Number(val("--cap", "900")), out = val("--out", null);
const ENGINE = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const ROOT = path.join(__dirname, "../..");

(async () => {
  const browser = await ENGINE.launch(ENGINE === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const all = [];
  for (const animal of animals) {
    console.log(`\n== ${animal}   (fase: vitórias, vidas perdidas média [mín-máx], 1º golpe médio, golpes por minuto, tempo médio)`);
    for (let id = lo; id <= hi; id++) {
      const page = await browser.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      await page.goto("file://" + path.join(ROOT, "index.html"));
      await page.waitForTimeout(150);
      if (immortal) await page.evaluate(() => { const g = window.__game; if (!g.__orig) { g.__orig = g.tick; g.tick = (dt) => { g.__orig(dt); if (g.state === "playing" && g.lives < 2) g.setLives(g.maxLives); }; } });
      const rows = [];
      for (let seed = 1; seed <= seeds; seed++) {
        if (animal === "bird") {
          const r = await page.evaluate(BIRD_ROBOT, { id, live: true, seed, attempts: 1, cap: cap * 60 });
          rows.push({ animal, id, seed, state: r.state, time: Math.round(r.time * 10) / 10, livesLost: r.livesLost, hits: r.livesLost, firstHit: r.hits.length ? r.hits[0].t : null, frames: r.frames });
        } else rows.push(await page.evaluate(PROBE, { animal, id, seed, cap }));
      }
      await page.close();
      all.push(...rows);
      const ok = rows.filter((r) => !r.error), won = ok.filter((r) => r.state === "won").length;
      const lost = ok.map((r) => r.livesLost), mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
      const fh = ok.filter((r) => r.firstHit !== null).map((r) => r.firstHit), tm = ok.map((r) => r.time);
      const rate = ok.reduce((n, r) => n + r.hits, 0) / Math.max(1, ok.reduce((n, r) => n + r.time, 0)) * 60; // golpes por minuto de jogo
      console.log(`F${String(id).padStart(2)}: ${won}/${ok.length} vitórias, perdeu ${mean(lost).toFixed(2)} vidas [${Math.min(...lost)}-${Math.max(...lost)}], 1º golpe ${fh.length ? mean(fh).toFixed(0) + " s" : "-"}, ${rate.toFixed(2)} golpes/min, tempo ${mean(tm).toFixed(0)} s${rows.some((r) => r.error) ? "  ERRO: " + rows.find((r) => r.error).error : ""}${errs.length ? "  (erros de página: " + errs[0] + ")" : ""}`);
    }
  }
  await browser.close();
  if (out) fs.writeFileSync(out, JSON.stringify(all));
})().catch((e) => { console.error(e); process.exit(1); });
