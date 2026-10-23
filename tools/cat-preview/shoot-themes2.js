// Capturas dos ambientes das Fases 11 a 20 do Gatinho (js/cat-themes-2.js) com Playwright.
// Uso (com trava de navegador): NODE_PATH=/opt/node-tools/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium flock <trava> node tools/cat-preview/shoot-themes2.js <pasta-de-saida> [fases...] [cat]
// Gera, para cada fase, th-<id>.png (zoom 2) e, para as noturnas (18 e 19), th-<id>-noite.png (com o escurecimento em volta do gatinho). Com "cat" junta th-<id>-cat.png (fileiras de X, T e ~ com todas as variantes).
// Sem lista de fases, gera também sheet.png (as 10 lado a lado, zoom 1) e catalog.png (as 10 com as fileiras de X, T e ~).
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const args = process.argv.slice(3), out = process.argv[2] || ".", ids = args.map(Number).filter(Boolean), withCat = args.includes("cat");
  const list = ids.length ? ids : [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const url = "file://" + path.join(__dirname, "themes2.html");
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  const page = await b.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1 });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const shoot = async (query, file) => { await page.goto(url + "?" + query); await page.waitForFunction(() => document.title === "pronto"); await (await page.$("#stage")).screenshot({ path: path.join(out, file) }); };
  for (const id of list) {
    await shoot(`id=${id}&scale=2`, `th-${id}.png`);
    if (id === 18 || id === 19) await shoot(`id=${id}&scale=2&night=1`, `th-${id}-noite.png`);
    if (withCat) await shoot(`id=${id}&scale=2&catalog=1`, `th-${id}-cat.png`);
  }
  if (!ids.length) { await shoot("sheet=1", "sheet.png"); await shoot("sheet=1&catalog=1", "catalog.png"); }
  await b.close();
  if (errors.length) { console.log("ERROS na página:\n" + errors.join("\n")); process.exit(1); }
  console.log("ok: " + list.join(", "));
})();
