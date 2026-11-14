// Capturas das SKINS DOS OBJETOS DO CACHORRINHO (0.19.0) com o jogo de verdade (index.html) no Playwright.
// Uso (NODE_PATH e CHROMIUM_PATH como nos testes; PREVIEW_LOCK é opcional):
//   NODE_PATH=<pasta-do-playwright>/node_modules CHROMIUM_PATH=/caminho/do/chromium PREVIEW_LOCK=<arquivo> node tools/skin-preview/shoot.js <pasta-de-saida> [categorias separadas por vírgula] [modo]
//   categorias: agent, ration, exit, catexit, postman, bone, ball, block, van, foecat (padrão: todas)
//   modo: "lojinha" (padrão) = o mostruário que a lojinha desenha (PREVIEW de js/game.js, canvas de 216 × 156 como no jogo), todas as skins de cada categoria lado a lado, a padrão primeiro;
//         "jogo" = o objeto no jogo de verdade (a fase onde ele aparece, com o desenho do canvas do jogo) ampliado 4×, uma linha por categoria, cada skin ao lado das outras;
//         "tudo" = os dois.
// Escreve <pasta>/lojinha-<categoria>.png, <pasta>/lojinha-todas.png e <pasta>/jogo-<categoria>.png / jogo-todas.png. Variáveis: ESC (escala dos mostruários, padrão 1.3), ZOOM (ampliação do modo jogo, padrão 4).
// PREVIEW_LOCK=<arquivo>: o script se reexecuta sob `flock` nesse arquivo (para não abrir dois navegadores ao mesmo tempo).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const { chromium } = require("playwright");
const ALL = ["agent", "postman", "ration", "bone", "ball", "block", "van", "foecat", "exit", "catexit"];

// Roda DENTRO da página: monta a folha dos mostruários da lojinha das categorias pedidas (um canvas só) e devolve um PNG (data URL) por categoria e o conjunto.
const SHOP_SHEET = ({ slots, scale }) => {
  const W = 216, H = 156, PAD = 14, LAB = 44, out = {};
  const mk = (slot) => {
    const list = Skins.list(slot), s = Skins.slot(slot), cw = Math.round(W * scale), ch = Math.round(H * scale);
    const cv = document.createElement("canvas"), width = PAD + list.length * (cw + PAD), height = 34 + ch + LAB + PAD;
    cv.width = width; cv.height = height;
    const c = cv.getContext("2d");
    c.fillStyle = "#12161f"; c.fillRect(0, 0, width, height);
    c.fillStyle = "#e8ecf4"; c.font = "bold 16px system-ui, sans-serif"; c.textAlign = "left"; c.fillText(`${slot} (${s.name}, jogo ${s.game}, a partir da Fase ${s.from})`, PAD, 22);
    list.forEach((k, i) => {
      const x = PAD + i * (cw + PAD), y = 34;
      c.fillStyle = "#1d2330"; c.fillRect(x, y, cw, ch); c.fillStyle = "rgba(255,255,255,.08)"; c.fillRect(x, y, cw, ch); // o fundo do cartão da lojinha
      const cell = document.createElement("canvas"); cell.width = W; cell.height = H; // o mostruário do jogo: 216 × 156 pixels, transparente
      const ok = window.__game.skinPreview(slot, cell, k.id);
      if (!ok) { c.fillStyle = "#f66"; c.fillText("sem PREVIEW", x + 10, y + 20); }
      c.imageSmoothingEnabled = true; c.drawImage(cell, x, y, cw, ch);
      c.fillStyle = "#e8ecf4"; c.font = "bold 13px system-ui, sans-serif"; c.textAlign = "center"; c.fillText(`${k.id || "(padrão)"} · ${k.name}`, x + cw / 2, y + ch + 18);
      c.fillStyle = "#aab3c4"; c.font = "12px system-ui, sans-serif"; c.fillText(`${k.price ? k.price + " petscoin" : "grátis"} · ${k.text}`, x + cw / 2, y + ch + 35);
    });
    return cv;
  };
  const cvs = slots.map(mk);
  for (const [i, s] of slots.entries()) out[s] = cvs[i].toDataURL("image/png");
  const tw = Math.max(...cvs.map((c) => c.width)), th = cvs.reduce((a, c) => a + c.height, 0), all = document.createElement("canvas");
  all.width = tw; all.height = th; const a = all.getContext("2d"); a.fillStyle = "#12161f"; a.fillRect(0, 0, tw, th);
  let y = 0; for (const c of cvs) { a.drawImage(c, 0, y); y += c.height; }
  out.__all = all.toDataURL("image/png");
  return out;
};

// Roda DENTRO da página: para cada skin da categoria, abre a fase certa e recorta o objeto do canvas do jogo (no mesmo quadro: o recorte é exato), ampliado `zoom` vezes.
// `phase` (opcional) escolhe a fase (o bloco aparece na 3, a parede que se move na 5).
const GAME_SHEET = ({ slot, zoom, phase }) => {
  const g = window.__game, list = Skins.list(slot);
  const cv = document.getElementById("game");
  const catGame = slot === "catexit";
  phase = phase || { agent: 1, ration: 1, exit: 1, catexit: 1, postman: 2, bone: 2, ball: 2, block: 3, van: 4, foecat: 11 }[slot];
  g.setAnimal(catGame ? "cat" : "dog");
  g.allBlocks = true; g.autoStart = true; g.noCatch = true; g.start(phase); g.freezeVets = true; g.setLives(5);
  const notes = [];
  if (slot === "postman") { // pega um osso: os agentes viram carteiros
    const b = g.items.find((i) => i.bone && !i.taken); g.player.x = b.x; g.player.y = b.y; g.tick(1 / 60); g.tick(1 / 60);
    if (!(g.power > 0)) notes.push("o poder do osso não ligou");
  }
  if (slot === "block") for (let i = 0; i < 4; i++) g.tick(1 / 60);
  const find = () => { // o retângulo (em pixels do mundo) que enquadra o objeto
    if (slot === "agent" || slot === "postman") { const v = g.vets[0]; return { x: v.cx - 26, y: v.cy - 36, w: 52, h: 56 }; }
    if (slot === "foecat") { const v = g.cats[0]; return { x: v.cx - 26, y: v.cy - 30, w: 52, h: 50 }; }
    if (slot === "ration") { const it = g.items.find((i) => !i.bone); return { x: it.x - 14, y: it.y - 18, w: 44, h: 44 }; }
    if (slot === "bone") { const it = g.items.find((i) => i.bone); return { x: it.x - 14, y: it.y - 18, w: 44, h: 44 }; }
    if (slot === "ball") { const b = g.balls[0]; return { x: b.x - 32, y: b.y - 20, w: 64, h: 40 }; }
    if (slot === "block") { const b = g.blocks[0], d = b.def; return { x: b.x - 16, y: b.y - 16, w: d.w + 32, h: d.h + 32 }; }
    if (slot === "van") { // as vans ficam nas caixas X de uma posição fixa do pátio (Fase 4 em diante)
      const lv = g.builtOf("dog")[phase];
      for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) if (lv.crate[r] && lv.crate[r][c] && Math.abs(c - (lv.cols >> 1)) === 3 && Math.abs(r - (lv.rows >> 1)) === 2) return { x: c * 32 - 8, y: r * 32 - 4, w: 48, h: 44 };
      throw new Error("sem van");
    }
    const e = g.exit; return { x: e.x - 8, y: e.y - 8, w: e.w + 16, h: e.h + 16 };
  };
  const box = find();
  const pl = g.player; pl.x = box.x + box.w / 2 - 12 + (box.w > 100 ? 0 : 110); pl.y = box.y + box.h / 2 - 12 + (box.w > 100 ? box.h : 0); // o jogador fora do recorte (a câmera segue ele: o objeto precisa estar na tela)
  const crops = [];
  for (const k of list) {
    g.setLook(slot, k.id);
    g.drawNow();
    const v = g.view, kk = v.k * v.zoom, out = document.createElement("canvas");
    out.width = Math.round(box.w * zoom); out.height = Math.round(box.h * zoom);
    const o = out.getContext("2d"); o.fillStyle = "#1d2330"; o.fillRect(0, 0, out.width, out.height); o.imageSmoothingEnabled = false;
    o.drawImage(cv, (box.x - v.camX) * kk, (box.y - v.camY) * kk, box.w * kk, box.h * kk, 0, 0, out.width, out.height);
    crops.push({ k, cv: out, inView: box.x - v.camX >= -1 && box.y - v.camY >= -1 && (box.x + box.w - v.camX) * kk <= cv.width + 1 && (box.y + box.h - v.camY) * kk <= cv.height + 1 });
  }
  g.setLook(slot, "");
  const w = crops[0].cv.width, h = crops[0].cv.height, PAD = 10, LAB = 30, sheet = document.createElement("canvas");
  sheet.width = PAD + list.length * (w + PAD); sheet.height = 30 + h + LAB + PAD;
  const c = sheet.getContext("2d"); c.fillStyle = "#12161f"; c.fillRect(0, 0, sheet.width, sheet.height);
  c.fillStyle = "#e8ecf4"; c.font = "bold 15px system-ui, sans-serif"; c.textAlign = "left"; c.fillText(`${slot} no jogo (Fase ${phase}, ampliado ${zoom}×, ${g.theme.place})`, PAD, 20);
  crops.forEach((q, i) => { const x = PAD + i * (w + PAD); c.drawImage(q.cv, x, 30); c.fillStyle = q.inView ? "#e8ecf4" : "#f66"; c.font = "bold 12px system-ui, sans-serif"; c.textAlign = "center"; c.fillText(`${q.k.id || "(padrão)"} · ${q.k.name}${q.inView ? "" : " (fora da tela!)"}`, x + w / 2, 30 + h + 18); });
  return { png: sheet.toDataURL("image/png"), notes, phase };
};

(async () => {
  const out = process.argv[2] || path.join(os.tmpdir(), "skin-preview");
  const slots = process.argv[3] && process.argv[3] !== "todas" ? process.argv[3].split(",") : ALL, mode = process.argv[4] || "lojinha";
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  let bad = 0;
  try {
    const page = await b.newPage({ viewport: { width: 1000, height: 700 } });
    page.on("pageerror", (e) => { bad++; console.log("ERRO DE PÁGINA:", e.message); });
    page.on("console", (m) => { if (m.type() === "error") { bad++; console.log("ERRO NO CONSOLE:", m.text()); } });
    await page.goto("file://" + path.join(__dirname, "../../index.html"));
    await page.waitForFunction(() => window.__game && typeof window.__game.skinPreview === "function", null, { timeout: 15000 });
    const save = (file, url) => { fs.writeFileSync(file, Buffer.from(url.replace(/^data:image\/png;base64,/, ""), "base64")); console.log("ok", file); };
    if (mode === "lojinha" || mode === "tudo") {
      const r = await page.evaluate(SHOP_SHEET, { slots, scale: Number(process.env.ESC) || 1.3 });
      for (const s of slots) save(path.join(out, `lojinha-${s}.png`), r[s]);
      save(path.join(out, "lojinha-todas.png"), r.__all);
    }
    if (mode === "jogo" || mode === "tudo") {
      for (const s of slots) {
        for (const [suffix, phase] of s === "block" ? [["", 3], ["-parede", 5]] : [["", 0]]) { // (o bloco aparece na Fase 3; a parede que se move, na 5)
          await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 80)))));
          const r = await page.evaluate(GAME_SHEET, { slot: s, zoom: Number(process.env.ZOOM) || 4, phase });
          if (r.notes.length) console.log(s, "avisos:", r.notes.join("; "));
          save(path.join(out, `jogo-${s}${suffix}.png`), r.png);
        }
      }
    }
  } finally { await b.close(); }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
