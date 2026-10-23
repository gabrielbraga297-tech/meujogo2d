// A/B de pixels do CACHORRINHO (0.18.0, E2b-1): prova que o desenho do cachorrinho não mudou nem um pixel entre duas versões do código.
// Para cada fase pedida, abre o jogo, joga os mesmos passos com a mesma semente (Math.random e `setRand` trocados por um gerador fixo), desenha UM quadro e devolve o hash do canvas inteiro.
// Uso:  node tests/ab-dog.js <pasta-do-código> [fases separadas por vírgula, padrão 1,4,11,20]   (CHROMIUM_PATH e NODE_PATH como nos outros testes; use `flock` no trinco do navegador)
// Se a pasta tem um js/game.js sem o gancho `drawNow` (código antigo), o script injeta o gancho ao carregar (o gancho só chama draw(): não muda o desenho).
// O tests/e2e.js usa DOG_HASH e compara com os valores de referência (HASHES_0170), tirados do código da 0.18.0 antes do desenho do Gatinho (commit 40e8f96) com o Chromium desta máquina.
const path = require("path");

// Roda dentro da página (viewport 1000×700), em dois passos: DOG_START começa a fase com a semente fixa (e o jogo espera o primeiro passo, então nada anda sozinho) e o chamador espera o leiaute assentar
// (a altura do placar muda o tamanho do canvas); DOG_HASH joga os passos fixos, desenha UM quadro e devolve o hash do canvas inteiro.
const DOG_START = (id) => {
  let seed = 123456789 + id * 7919;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__abRealRandom = Math.random;
  Math.random = rnd; // (o jogo sorteia as bolinhas com Math.random à parte)
  const g = window.__game;
  g.setAnimal("dog");
  g.setRand(rnd);
  g.autoStart = false; g.noCatch = true;
  g.start(id);
};
const DOG_HASH = () => {
  try {
    const g = window.__game;
    const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k }));
    const plan = [["d", 50], ["s", 40], ["a", 30], ["w", 25], ["d", 45], ["s", 20]];
    for (const [k, n] of plan) { press(k, true); for (let i = 0; i < n; i++) g.tick(1 / 60); press(k, false); }
    g.tick(1 / 60);
    g.drawNow();
    const cv = document.getElementById("game"), d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, u = new Uint32Array(d.buffer, d.byteOffset, d.byteLength >> 2);
    let h = 2166136261 >>> 0, nz = 0;
    for (let i = 0; i < u.length; i++) { h = Math.imul(h ^ u[i], 16777619) >>> 0; if (u[i] !== 0xff1d2330 && u[i] !== 0) nz++; }
    return { hash: h.toString(16), w: cv.width, h: cv.height, nonEmpty: nz };
  } finally { Math.random = window.__abRealRandom; window.__game.setRand(null); }
};
module.exports = { DOG_START, DOG_HASH, VIEWPORT: { width: 1000, height: 700 } };

if (require.main === module) {
  const { chromium } = require("playwright");
  (async () => {
    const repo = path.resolve(process.argv[2] || path.join(__dirname, ".."));
    const ids = process.argv[3] ? process.argv[3].split(",").map(Number) : [1, 4, 11, 20];
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
    try {
      const ctx = await b.newContext({ viewport: module.exports.VIEWPORT });
      await ctx.route("**/js/game.js", async (route) => { // código antigo: injeta o gancho `drawNow`
        let body = require("fs").readFileSync(path.join(repo, "js/game.js"), "utf8");
        if (!body.includes("drawNow")) body = body.replace("window.__game = {", "window.__game = { drawNow() { draw(); },");
        await route.fulfill({ body, contentType: "application/javascript; charset=utf-8" });
      });
      await ctx.addInitScript(() => { Object.defineProperty(window, "CatLevels", { configurable: true, get: () => undefined, set: () => {} }); }); // (como as seções antigas do e2e: sem os mapas do Gatinho)
      const page = await ctx.newPage();
      const errs = []; page.on("pageerror", (e) => errs.push(e.message));
      await page.goto("file://" + path.join(repo, "index.html"));
      const out = {};
      for (const id of ids) {
        await page.evaluate(DOG_START, id);
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))))));
        out[id] = await page.evaluate(DOG_HASH);
      }
      console.log(JSON.stringify(out));
      if (errs.length) { console.log("ERROS:", errs.join(" | ")); process.exitCode = 1; }
    } finally { await b.close(); }
  })();
}
