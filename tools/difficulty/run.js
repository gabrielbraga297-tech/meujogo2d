// Mede a dificuldade das fases com a sonda ingênua (tools/difficulty/probe-page.js): joga cada fase em várias sementes e imprime, por fase, quantas vezes o robô foi pego,
// quanto demorou e quantas vezes ele chegou ao fim. Serve de RÉGUA para comparar fases do mesmo bichinho (não diz o quanto uma pessoa vai sofrer).
// Uso:  node tools/difficulty/run.js [--animals dog,cat,bird] [--levels 1-20] [--seeds 8] [--cap 900] [--out resultado.json]
//   Variáveis: NODE_PATH (onde está o playwright), CHROMIUM_PATH, BROWSER (firefox|webkit), como no tests/e2e.js. Rode sob `flock` se mais de um processo abrir o navegador.
const path = require("path");
const fs = require("fs");
const { chromium, firefox, webkit } = require("playwright");
const PROBE = require("./probe-page.js");

const args = process.argv.slice(2);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const animals = val("--animals", "dog,cat,bird").split(",");
const [lo, hi] = val("--levels", "1-20").split("-").map(Number);
const seeds = Number(val("--seeds", "8")), cap = Number(val("--cap", "900")), out = val("--out", null);
const ENGINE = { chromium, firefox, webkit }[process.env.BROWSER || "chromium"];
const ROOT = path.join(__dirname, "../..");

(async () => {
  const browser = await ENGINE.launch(ENGINE === chromium && process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const all = [];
  for (const animal of animals) {
    console.log(`\n== ${animal}   (fase: pegou/vitórias, vidas perdidas média [mín-máx], 1º golpe médio, tempo médio)`);
    for (let id = lo; id <= hi; id++) {
      const page = await browser.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      await page.goto("file://" + path.join(ROOT, "index.html"));
      await page.waitForTimeout(150);
      const rows = [];
      for (let seed = 1; seed <= seeds; seed++) rows.push(await page.evaluate(PROBE, { animal, id, seed, cap }));
      await page.close();
      all.push(...rows);
      const ok = rows.filter((r) => !r.error), won = ok.filter((r) => r.state === "won").length;
      const lost = ok.map((r) => r.livesLost), mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
      const fh = ok.filter((r) => r.firstHit !== null).map((r) => r.firstHit), tm = ok.map((r) => r.time);
      console.log(`F${String(id).padStart(2)}: ${won}/${ok.length} vitórias, perdeu ${mean(lost).toFixed(2)} vidas [${Math.min(...lost)}-${Math.max(...lost)}], 1º golpe ${fh.length ? mean(fh).toFixed(0) + " s" : "-"}, tempo ${mean(tm).toFixed(0)} s${rows.some((r) => r.error) ? "  ERRO: " + rows.find((r) => r.error).error : ""}${errs.length ? "  (erros de página: " + errs[0] + ")" : ""}`);
    }
  }
  await browser.close();
  if (out) fs.writeFileSync(out, JSON.stringify(all));
})().catch((e) => { console.error(e); process.exit(1); });
