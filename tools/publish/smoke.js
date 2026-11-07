// Abre a página montada por build-artifact.py no Chromium e confere o básico: sem erro de página, jogo carregado, versão e build no menu, uma fase de cada bichinho anda alguns quadros.
// Uso: NODE_PATH=/opt/node-tools/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/publish/smoke.js <pagina.html>
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const file = path.resolve(process.argv[2]);
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto("file://" + file); await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const g = window.__game, v = window.GAME_VERSION, out = { version: v.number, build: v.build, stage: v.stage || "", menu: document.body.dataset.screen, text: (document.getElementById("version") || {}).textContent || "" };
    out.ran = {};
    for (const a of ["dog", "cat", "bird"]) { g.setAnimal(a); g.autoStart = true; g.start(1); for (let i = 0; i < 60; i++) g.tick(1 / 60); out.ran[a] = [g.state, Math.round(g.time * 10) / 10, g.vets.length]; }
    return out;
  });
  console.log(JSON.stringify(r));
  const ok = errs.length === 0 && r.build !== "dev" && Object.values(r.ran).every(([st, t]) => st === "playing" && t > 0.9);
  console.log(ok ? "OK   página montada: sem erros e as três fases andam" : "FAIL " + JSON.stringify(errs.slice(0, 5)));
  await browser.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
