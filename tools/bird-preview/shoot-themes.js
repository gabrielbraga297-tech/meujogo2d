// Capturas dos ambientes do Passarinho (js/bird-themes*.js) com o Playwright.
// Uso (NODE_PATH e CHROMIUM_PATH como nos testes; use `flock <arquivo>` na frente para não abrir dois navegadores juntos):
//   NODE_PATH=<pasta-do-playwright>/node_modules CHROMIUM_PATH=/caminho/do/chromium flock <arquivo> node tools/bird-preview/shoot-themes.js <pasta-de-saida> [fases, ex.: 1,2,3]
// Gera <pasta>/fase-N.png (o recorte de 14 x 9 tiles em escala 2, com o passarinho, gato, gavião, semente, fruto e minhoca para escala; nas Fases 18 e 19 também a luz da noite simulada, em fase-N-noite.png),
// <pasta>/folha-A.png e folha-B.png (as Fases 1 a 10 e 11 a 20 em escala 1), <pasta>/folha-075-A.png e folha-075-B.png (em escala 0,75: o menor tamanho de tile na tela, 24 px) e
// <pasta>/vento-N.png (as quatro setas de vento animadas em 4 instantes, só com SEQ=1).
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}
const { chromium } = require("playwright");

(async () => {
  const out = path.resolve(process.argv[2] || "bird-themes-out");
  const only = process.argv[3] ? process.argv[3].split(",").map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
    await page.goto("file://" + path.resolve(__dirname, "themes.html") + "?manual=1");
    const have = await page.evaluate(() => BirdThemes.ids());
    for (const id of only) {
      if (!have.includes(id)) continue;
      await page.evaluate((n) => single(n, { scale: 2, time: 1.3 }), id);
      await (await page.$("#stage")).screenshot({ path: path.join(out, `fase-${id}.png`) });
      if (await page.evaluate((n) => BirdThemes.of(n).night || BirdThemes.of(n).dusk, id)) {
        await page.evaluate((n) => single(n, { scale: 2, time: 1.3, sim: true }), id);
        await (await page.$("#stage")).screenshot({ path: path.join(out, `fase-${id}-noite.png`) });
      }
    }
    for (const [sc, tag] of [[1, ""], [0.75, "-075"]]) for (const [ids, name] of [[[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "A"], [[11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "B"]]) {
      const list = ids.filter((i) => have.includes(i) && only.includes(i));
      if (!list.length) continue;
      await page.evaluate(([s, l]) => sheet({ scale: s, time: 0, ids: l }), [sc, list]);
      await (await page.$("#sheet")).screenshot({ path: path.join(out, `folha${tag}-${name}.png`) });
    }
    if (process.env.SEQ) for (const id of only.filter((i) => have.includes(i)).slice(0, 4)) {
      const files = [];
      for (const t of [0.2, 0.5, 0.8, 1.1]) { await page.evaluate(([n, tt]) => single(n, { scale: 2, time: tt, birds: false }), [id, t]); const f = path.join(out, `vento-${id}-${t}.png`); await (await page.$("#stage")).screenshot({ path: f }); files.push(f); }
    }
    if (errors.length) { console.log("ERROS NA PÁGINA:\n" + errors.join("\n")); process.exitCode = 1; }
    else console.log("capturas em " + out);
  } finally { await browser.close(); }
})();
