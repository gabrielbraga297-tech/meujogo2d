// Executor PROVISÓRIO das seções de navegador das skins do Passarinho (tests/e2e-bird-skins.js) enquanto tests/e2e.js não tem o gancho que carrega tests/e2e-bird-*.js (ele vem do motor do Passarinho).
// Monta as mesmas ferramentas que o gancho passa (`{ browser, newPage, fresh, ev, ok, section, errs, URL, root }`) e roda o arquivo. Depois que o gancho existir, rode com `node tests/e2e.js "Skins do Passarinho"` e apague este arquivo.
// Uso: NODE_PATH=... CHROMIUM_PATH=... node tests/_run-bird-skins.js ["trecho do título da seção"]      BIRD_THEMES_DIR=<pasta com js/bird-themes*.js> (opcional): carrega os ambientes do Passarinho antes dos scripts da página.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const URL = "file://" + path.join(root, "index.html");
const only = process.argv[2];
let failed = 0, sectionsRun = 0;
const ok = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); if (!cond) failed++; };
async function section(title, fn) {
  if (only && !title.includes(only)) return;
  sectionsRun++;
  try { await fn(); } catch (e) { failed++; console.log(`FAIL (erro em "${title}"): ${String(e.message).split("\n")[0]}`); }
}
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errs = [];
  const watch = (page) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => m.type() === "error" && errs.push(m.text())); };
  async function newPage(opts = {}) {
    const { realCat, realBird, ...o } = opts; // (as opções do gancho de verdade; aqui a página já carrega o que existe)
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...o });
    if (process.env.BIRD_THEMES_DIR) for (const f of ["bird-themes.js", "bird-themes-1.js", "bird-themes-2.js"]) await ctx.addInitScript({ path: path.join(process.env.BIRD_THEMES_DIR, f) });
    const page = await ctx.newPage();
    watch(page);
    await page.addInitScript(() => { try { const k = sessionStorage.getItem("keepSave"); if (!k && (k !== null || !/[?&]keepsave=1\b/.test(location.search))) localStorage.removeItem("cachorrinho.save.v1"); } catch { /* sem storage */ } });
    return page;
  }
  async function fresh(page, { name = "Totó", done = [] } = {}) {
    await page.goto(URL);
    await page.evaluate(([name, done]) => { sessionStorage.setItem("keepSave", ""); localStorage.clear(); const st = Records.createStore(localStorage); if (name) { st.setPlayer(name); for (const l of done) st.completeLevel(name, l); } }, [name, done]);
    await page.reload();
    await page.evaluate(() => { if (window.__game) { __game.allBlocks = true; __game.autoStart = true; __game.offerFixed = ["shield", "speed", "bone"]; } });
  }
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  await require("./e2e-bird-skins.js")({ browser, newPage, fresh, ev, ok, section, errs, URL, root, watch });
  console.log("erros JS:", errs);
  if (errs.length) failed++;
  if (only && sectionsRun === 0) { failed++; console.log(`FAIL nenhuma seção tem "${only}" no título`); }
  await browser.close();
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram");
  process.exit(failed ? 1 : 0);
})();
