// Mede, no navegador, quanto custa desenhar um quadro de tiles de cada ambiente do Passarinho (e dos 20 do Gatinho, para comparar): chão em todos os tiles menos sob "#", depois #, M, X, G, vento e o ninho,
// num mapa de 40 x 25 tiles (a tela cheia de um monitor de 1280 x 800 px) com a mistura de tiles de um mapa de verdade, uma câmera que anda um tile a cada quadro (o sorteio de cada tile é fixo).
// Uso: NODE_PATH=<pasta-do-playwright>/node_modules CHROMIUM_PATH=/caminho/do/chromium flock <arquivo> node tools/bird-preview/bench.js [quadros]
const path = require("path");
const { chromium } = require("playwright");
(async () => {
  const frames = +process.argv[2] || 120;
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("file://" + path.resolve(__dirname, "themes.html") + "?manual=1");
    await page.addScriptTag({ path: path.resolve(__dirname, "../../js/cat-themes.js") }); await page.addScriptTag({ path: path.resolve(__dirname, "../../js/cat-themes-1.js") }); await page.addScriptTag({ path: path.resolve(__dirname, "../../js/cat-themes-2.js") });
    const res = await page.evaluate((N) => {
      const COLS = 40, ROWS = 25, TILE = 32, out = {};
      const cv = document.createElement("canvas"); cv.width = COLS * TILE; cv.height = ROWS * TILE; const ctx = cv.getContext("2d");
      const rect = (x, y, w, h) => ctx.fillRect(x, y, w, h);
      // um mapa de 140 x 90 com a mistura de um mapa grande: ~28% de paredes, 4% de muros, 3% de X, 2% de galhos, 3% de vento
      const MW = 140, MH = 90, map = [];
      for (let r = 0; r < MH; r++) { let row = ""; for (let c = 0; c < MW; c++) { const v = BirdThemes.hash(c, r, 5); row += c === 0 || r === 0 || c === MW - 1 || r === MH - 1 ? "#" : v < 0.28 ? "#" : v < 0.32 ? "M" : v < 0.35 ? "X" : v < 0.37 ? "G" : v < 0.4 ? ">^<v"[(c + r) & 3] : "."; } map.push(row); }
      const kindAt = (c, r) => (c < 0 || r < 0 || c >= MW || r >= MH ? "#" : map[r][c]);
      const run = (draw) => {
        const times = [];
        for (let f = 0; f < N + 20; f++) {
          const t0 = performance.now(), cx = 10 + (f % 60), cy = 10 + ((f >> 1) % 40);
          for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) draw(cx + c, cy + r, f * 0.016, c * TILE, r * TILE);
          if (f >= 20) times.push(performance.now() - t0);
        }
        times.sort((a, b) => a - b); return { med: times[times.length >> 1], p95: times[Math.floor(times.length * 0.95)], max: times[times.length - 1] };
      };
      const g = { ctx, rect, x: 0, y: 0, c: 0, r: 0, border: false, time: 0, solid: (c, r) => kindAt(c, r) === "#", kind: kindAt, h: (k) => BirdThemes.hash(g.c, g.r, k) };
      for (let id = 1; id <= 20; id++) {
        const th = BirdThemes.of(id);
        out["passarinho " + id] = run((c, r, t, px, py) => { const k = kindAt(c, r); g.c = c; g.r = r; g.x = px; g.y = py; g.time = t; g.border = c === 0 || r === 0 || c === MW - 1 || r === MH - 1; if (k !== "#") th.floor(g); if (k === "#") th.wall(g); else if (k === "X") th.crate(g); else if (k === "G") th.high(g); else if (k === "M") th.muro(g); else if (">^<v".includes(k)) th.wind(g); });
      }
      for (let id = 1; id <= 20; id++) {
        const th = CatThemes.of(id), gc = { ctx, rect, x: 0, y: 0, c: 0, r: 0, border: false, time: 0, solid: (c, r) => kindAt(c, r) === "#", kind: (c, r) => { const k = kindAt(c, r); return k === "M" || k === "G" || ">^<v".includes(k) ? "." : k; }, h: (k) => CatThemes.hash(gc.c, gc.r, k) };
        out["gatinho " + id] = run((c, r, t, px, py) => { const k = kindAt(c, r); gc.c = c; gc.r = r; gc.x = px; gc.y = py; gc.time = t; gc.border = c === 0 || r === 0 || c === MW - 1 || r === MH - 1; if (k !== "#") th.floor(gc); if (k === "#") th.wall(gc); else if (k === "X" || k === "M") th.crate(gc); else if (k === "G") th.high(gc); });
      }
      return out;
    }, frames);
    if (errors.length) console.log("ERROS:", errors.join("\n"));
    const rows = Object.entries(res), avg = (pre) => { const a = rows.filter(([k]) => k.startsWith(pre)).map(([, v]) => v.med); return a.reduce((s, x) => s + x, 0) / a.length; };
    for (const [k, v] of rows) console.log(k.padEnd(14), "mediana", v.med.toFixed(2), "ms · p95", v.p95.toFixed(2), "ms · máx", v.max.toFixed(2), "ms");
    console.log(`média das medianas: Passarinho ${avg("passarinho").toFixed(2)} ms, Gatinho ${avg("gatinho").toFixed(2)} ms por quadro de 40 x 25 tiles (1000 tiles)`);
  } finally { await browser.close(); }
})();
