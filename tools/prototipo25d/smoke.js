// Confere o arquivo único do Teste 01 de adaptação (gerado por build-artifact.py): abre, começa a fase e olha se não deu erro. Uso: node tools/prototipo25d/smoke.js <arquivo.html>
const { chromium } = require("playwright");
(async () => {
  const file = require("path").resolve(process.argv[2]);
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1000, height: 760 } }), errs = [];
  pg.on("pageerror", (e) => errs.push(String(e).slice(0, 200))); pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 200)); });
  await pg.goto("file://" + file); await pg.waitForTimeout(400);
  const title = await pg.title(), screen = await pg.evaluate(() => document.body.dataset.screen);
  await pg.click("#btn-t01-play"); await pg.waitForTimeout(600);
  const st = await pg.evaluate(() => ({ state: __game.state, level: __game.level, vets: __game.vets.length, hud: document.getElementById("hud-level").textContent }));
  await b.close();
  const ok = title === "Teste 01 de adaptação" && screen === "teste01" && st.state === "playing" && st.level === 1 && st.vets === 1 && st.hud === "01" && errs.length === 0;
  console.log(ok ? "smoke ok" : "smoke FALHOU", JSON.stringify({ title, screen, ...st, errs }));
  process.exit(ok ? 0 : 1);
})();
