// Folhas de capturas das SKINS DO JOGO DO PASSARINHO (0.20.0): todas as skins de cada categoria lado a lado, no mostruário da lojinha (PREVIEW de js/game.js, canvas de 216 × 156 como os cartões).
// Uso (NODE_PATH e CHROMIUM_PATH como nos testes; PREVIEW_LOCK é opcional):
//   NODE_PATH=<pasta-do-playwright>/node_modules CHROMIUM_PATH=/caminho/do/chromium PREVIEW_LOCK=<arquivo> node tools/skin-preview/bird-skins.js <pasta-de-saida> [opções]
// Opções: cats=bird,seed,stray,birdexit,berry,bug,roost,gust,hawk (padrão: todas) · esc=1 (escala dos mostruários) · fundo=escuro|claro (o cartão da lojinha é escuro; "claro" ajuda a ver o contorno) ·
//         themes=<pasta> (só enquanto o index.html não carrega os ambientes do Passarinho: carrega js/bird-themes.js, bird-themes-1.js e bird-themes-2.js dessa pasta, para o galho e o vento de sempre aparecerem)
// Gera, em <pasta>:
//   lojinha.png           os mostruários de todas as skins de todas as categorias, uma linha por categoria (a padrão primeiro), com nome, preço e frase embaixo;
//   lojinha-<categoria>.png  a mesma folha de cada categoria sozinha (maior, para ler os detalhes).
// PREVIEW_LOCK=<arquivo>: o script se reexecuta sob `flock` nesse arquivo (para não abrir dois navegadores ao mesmo tempo).
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const { chromium } = require("playwright");
const arg = (name, def) => { const a = process.argv.slice(3).find((x) => x.startsWith(name + "=")); return a ? a.slice(name.length + 1) : def; };
const root = path.resolve(__dirname, "../..");
const out = path.resolve(process.argv[2] || "skin-preview-out");
const CATS = arg("cats", "bird,seed,stray,birdexit,berry,bug,roost,gust,hawk").split(",");
const ESC = Number(arg("esc", 1)), LIGHT = arg("fundo", "escuro") === "claro", THEMES = arg("themes", "");

// Roda DENTRO da página: monta a folha dos mostruários das categorias pedidas (um canvas por categoria e um com todas) e devolve PNGs (data URLs).
const SHEET = ({ slots, scale, light }) => {
  const W = 216, H = 156, PAD = 12, LAB = 50, out = {};
  const mk = (slot) => {
    const list = Skins.list(slot), s = Skins.slot(slot), cw = Math.round(W * scale), ch = Math.round(H * scale);
    const cv = document.createElement("canvas"), width = PAD + list.length * (cw + PAD), height = 32 + ch + LAB + PAD;
    cv.width = width; cv.height = height;
    const c = cv.getContext("2d");
    c.fillStyle = light ? "#e9e4d6" : "#12161f"; c.fillRect(0, 0, width, height);
    c.fillStyle = light ? "#222" : "#e8ecf4"; c.font = "bold 16px system-ui, sans-serif"; c.textAlign = "left"; c.fillText(`${slot} (${s.name}, jogo ${s.game}, a partir da Fase ${s.from})`, PAD, 22);
    list.forEach((k, i) => {
      const x = PAD + i * (cw + PAD), y = 32;
      c.fillStyle = light ? "#f7f3e8" : "#222a3a"; c.fillRect(x, y, cw, ch); // o fundo do cartão da lojinha
      const cell = document.createElement("canvas"); cell.width = W; cell.height = H; // o mostruário do jogo: 216 × 156 pixels, transparente
      const ok = window.__game.skinPreview(slot, cell, k.id);
      if (!ok) { c.fillStyle = "#f66"; c.font = "13px system-ui, sans-serif"; c.fillText("sem PREVIEW", x + 10, y + 20); }
      c.imageSmoothingEnabled = true; c.drawImage(cell, x, y, cw, ch);
      c.fillStyle = light ? "#222" : "#e8ecf4"; c.font = "bold 13px system-ui, sans-serif"; c.textAlign = "center"; c.fillText(`${k.id || "(padrão)"} · ${k.name}`, x + cw / 2, y + ch + 18, cw - 6);
      c.fillStyle = light ? "#555" : "#aab3c4"; c.font = "12px system-ui, sans-serif"; c.fillText(`${k.price ? k.price + " petscoin" : "grátis"} · ${k.text}`, x + cw / 2, y + ch + 36, cw - 6);
    });
    return cv;
  };
  const cvs = slots.map(mk);
  for (const [i, s] of slots.entries()) out[s] = cvs[i].toDataURL("image/png");
  const tw = Math.max(...cvs.map((c) => c.width)), th = cvs.reduce((a, c) => a + c.height, 0), all = document.createElement("canvas");
  all.width = tw; all.height = th; const a = all.getContext("2d"); a.fillStyle = light ? "#e9e4d6" : "#12161f"; a.fillRect(0, 0, tw, th);
  let y = 0; for (const c of cvs) { a.drawImage(c, 0, y); y += c.height; }
  out.__all = all.toDataURL("image/png");
  return out;
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await pg.goto("file://" + root + "/index.html");
  if (THEMES && !(await pg.evaluate(() => typeof BirdThemes !== "undefined"))) for (const f of ["bird-themes.js", "bird-themes-1.js", "bird-themes-2.js"]) await pg.addScriptTag({ path: path.resolve(THEMES, f) });
  const sheets = await pg.evaluate(SHEET, { slots: CATS, scale: ESC, light: LIGHT });
  const save = (name, dataUrl) => { fs.writeFileSync(path.join(out, name), Buffer.from(dataUrl.split(",")[1], "base64")); console.log("gerou", path.join(out, name)); };
  for (const slot of CATS) save(`lojinha-${slot}.png`, sheets[slot]);
  save("lojinha.png", sheets.__all);
  console.log(errs.length ? "ERROS JS: " + errs.join(" | ") : "sem erros de JavaScript");
  await ctx.close(); await browser.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
