// Capturas dos ambientes das Fases 1 a 10 do Gatinho (js/cat-themes-1.js) com o Playwright.
// Uso (sempre com o trinco do navegador, por haver outros agentes):
//   NODE_PATH=/opt/node-tools/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium flock <trinco> node tools/cat-preview/shoot-themes1.js <pasta-de-saida> [fases, ex.: 1,2,3]
// Gera <pasta>/fase-N.png (recorte 12 x 8 em escala 2, com o gatinho verde de 24 px e as quatro peles para ver o contraste),
// <pasta>/folha.png (as 10 fases em escala 1) e <pasta>/folha-075.png (as 10 em escala 0,75: o menor tamanho de tile na tela, 24 px).
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const out = path.resolve(process.argv[2] || "cat-preview-out");
  const only = process.argv[3] ? process.argv[3].split(",").map(Number) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 900, height: 1500 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("file://" + path.resolve(__dirname, "themes1.html") + "?manual=1");
    for (const id of only) {
      await page.evaluate((n) => single(n, { scale: 2, skins: true, time: 1.3 }), id);
      await (await page.$("#stage")).screenshot({ path: path.join(out, `fase-${id}.png`) });
    }
    for (const [sc, name] of [[1, "folha.png"], [0.75, "folha-075.png"]]) {
      await page.evaluate((s) => sheet({ scale: s, skins: false, time: 0 }), sc);
      await (await page.$("#sheet")).screenshot({ path: path.join(out, name) });
    }
    if (errors.length) { console.log("ERROS NA PÁGINA:\n" + errors.join("\n")); process.exitCode = 1; }
    else console.log("capturas em " + out);
  } finally { await browser.close(); }
})();
