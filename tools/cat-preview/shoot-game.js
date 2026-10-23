// Capturas do JOGO DO GATINHO de verdade (index.html + js/cat-levels.js + CatArt + CatThemes) com o Playwright: abre cada uma das 20 fases reais e enquadra o gatinho em lugares típicos.
// Uso (sempre com o trinco do navegador, por haver outros agentes):
//   NODE_PATH=/opt/node-tools/node_modules CHROMIUM_PATH=/opt/pw-browsers/chromium PREVIEW_LOCK=<trinco> node tools/cat-preview/shoot-game.js <pasta-de-saida> [opções]
// Opções: fases=1,2,3 (padrão: as 20) · telas=1,9,18,20 (fases que saem também no celular em pé e deitado) · tam=desktop,celular,deitado (padrão: desktop;
//   desktop 1000×700 (folhas de recortes e a tela inteira de TODAS as fases), celular 390×780 em pé com toque e deitado 740×390 com toque: só a tela inteira das fases de `telas`) · escala=1.4 (zoom dos recortes das folhas).
//   CALM=1 liga "reduzir movimento".
// Gera, em <pasta>:
//   folha-NN.png         uma folha por fase com 9 recortes de 9×6 tiles em torno do gatinho: início, perto de um X, em cima de um T (a salvo), entrando na poça (molhado), arrancada,
//                        eriçado (novelo comum), cães perseguindo/afugentados, e as skins preta e branca (contraste com o chão);
//   tela-NN-<tam>.png    a página inteira (placar, botão Correr, noite) com o gatinho molhado perto de X, T e poça;
//   geral-1.png e geral-2.png  folhas de contato com a captura inteira de cada fase (1 a 10 e 11 a 20).
// Os recortes saem do próprio canvas do jogo, no mesmo quadro (o laço do jogo só roda depois): o estado de cada recorte é exato. Os cães ficam congelados (freezeVets).
// PREVIEW_LOCK=<arquivo>: o script se reexecuta sob `flock` nesse arquivo (para vários agentes não abrirem o navegador ao mesmo tempo).
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const { chromium } = require("playwright");
const arg = (name, def) => { const a = process.argv.slice(3).find((x) => x.startsWith(name + "=")); return a ? a.slice(name.length + 1) : def; };
const SIZES = { desktop: { w: 1000, h: 700, touch: false }, celular: { w: 390, h: 780, touch: true }, deitado: { w: 740, h: 390, touch: true } };

// Roda DENTRO da página: monta as 9 cenas de uma fase e devolve a folha como PNG (data URL) e a lista de avisos.
const SHEET = ({ id, scale }) => {
  const g = window.__game, T = 32;
  const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: k === "Shift" ? "ShiftLeft" : "" }));
  const notes = [];
  const begin = () => { g.start(id); g.autoStart = true; g.freezeVets = true; g.catSkin = ""; g.setLives(5); };
  begin();
  const lv = g.builtOf("cat")[id], kinds = lv.kinds, rows = lv.rows, cols = lv.cols;
  const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? "#" : kinds[r][c]);
  const free = (c, r) => at(c, r) === ".";
  const put = (c, r, facing) => { const p = g.player; p.x = c * T + 4; p.y = r * T + 4; p.facing = facing || "right"; p.moving = false; g.tick(0.001); };
  const tiles = (ch) => { const out = []; for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) if (at(c, r) === ch) out.push([c, r]); return out; };
  const near = (c, r, ch, n) => { let k = 0; for (let dr = -n; dr <= n; dr++) for (let dc = -n; dc <= n; dc++) if (at(c + dc, r + dr) === ch) k++; return k; };
  const open = (c, r) => free(c, r) && free(c - 1, r) && free(c + 1, r) && free(c, r - 1) && free(c, r + 1) && free(c + 2, r);
  const sp = lv.spawnTile;
  const cv = document.getElementById("game");
  const crop = (label, w, h) => {
    g.drawNow();
    const v = g.view, k = v.k * v.zoom, p = g.player, cx = p.x + p.w / 2, cy = p.y + p.h / 2, tw = 9, th = 6;
    const out = document.createElement("canvas"); out.width = Math.round(tw * T * scale); out.height = Math.round(th * T * scale);
    const o = out.getContext("2d"); o.fillStyle = "#1d2330"; o.fillRect(0, 0, out.width, out.height);
    o.imageSmoothingEnabled = true;
    const sw = tw * T * k, sh = th * T * k, sx0 = Math.max(0, Math.min(cv.width - sw, (cx - tw * T / 2 - v.camX) * k)), sy0 = Math.max(0, Math.min(cv.height - sh, (cy - th * T / 2 - v.camY) * k)); // (o recorte fica dentro do que o jogo mostra: nas bordas do mapa ele desliza, o gatinho sai do centro)
    o.drawImage(cv, sx0, sy0, sw, sh, 0, 0, out.width, out.height);
    return { label, cv: out };
  };
  const shots = [];
  // 1. início
  shots.push(crop("início (" + lv.place + ")"));
  // 2. perto de um X (vizinho livre à esquerda de um X) — com o X no centro do recorte
  { const xs = tiles("X").filter(([c, r]) => free(c - 1, r) && free(c - 2, r) && free(c - 1, r - 1) && free(c - 1, r + 1)); if (xs.length) { const [c, r] = xs[(xs.length / 3) | 0]; put(c - 1, r, "right"); shots.push(crop("perto do X")); } else { notes.push("sem X com chão livre ao lado"); shots.push(null); } }
  // 3. em cima de um T (a salvo)
  { const ts = tiles("T"); if (ts.length) { const [c, r] = ts[(ts.length / 2) | 0]; put(c, r, "down"); g.tick(0.016); shots.push(crop("no T: a salvo" + (g.safe ? "" : " (ERRO: não ficou a salvo)"))); } else { notes.push("sem T"); shots.push(null); } }
  // 4. entrando na poça (molhado): vem do chão da esquerda, anda para a direita até molhar
  { const ws = tiles("~").filter(([c, r]) => free(c - 1, r) && near(c, r, "~", 1) >= 3); const pool = ws.length ? ws : tiles("~").filter(([c, r]) => free(c - 1, r));
    if (pool.length) { const [c, r] = pool[(pool.length / 2) | 0]; put(c - 1, r, "right"); press("d", true); for (let i = 0; i < 40 && g.wet <= 0; i++) g.tick(1 / 60); for (let i = 0; i < 6; i++) g.tick(1 / 60); press("d", false); shots.push(crop("poça: molhado " + g.wet.toFixed(1) + " s")); }
    else { notes.push("sem poça"); shots.push(null); } }
  // 5. arrancada (Shift + andar para a direita no aberto)
  { begin(); const ops = []; for (let r = 2; r < rows - 2; r++) for (let c = 3; c < cols - 6; c++) if (open(c, r) && free(c + 3, r) && free(c + 4, r) && near(c, r, "#", 3) < 2) ops.push([c, r]); const pick = ops.length ? ops[(ops.length / 2) | 0] : [sp[0], sp[1]];
    put(pick[0], pick[1], "right"); press("Shift", true); press("d", true); for (let i = 0; i < 14; i++) g.tick(1 / 60); press("d", false); press("Shift", false); g.player.moving = true; shots.push(crop("arrancada" + (g.sprinting ? "" : " (ERRO: sem arrancada)"))); }
  // 6. eriçado (pegou um novelo comum)
  { begin(); const y = g.items.find((i) => i.bone && i.kind === "scare");
    if (y) { const p = g.player; p.x = y.x - 4; p.y = y.y - 4; g.tick(0.01); for (let i = 0; i < 8; i++) g.tick(1 / 60); shots.push(crop("novelo: pelo eriçado" + (g.power > 0 ? "" : " (ERRO)"))); } else { notes.push("sem novelo comum"); shots.push(null); } }
  // 7. cães perseguindo e (em seguida) afugentados, ao lado do gatinho
  { begin(); const [c, r] = sp; put(c, r, "right"); const p = g.player, cx = p.x + 12, cy = p.y + 12;
    const spots = [[-52, -30, "chase"], [60, -26, "patrol"], [-40, 44, "search"], [58, 40, "flee"]];
    const foes = g.vets.concat(g.cats);
    foes.slice(0, 4).forEach((v, i) => { v.cx = cx + spots[i][0]; v.cy = cy + spots[i][1]; v.mode = spots[i][2]; v.dir = i % 2 ? -1 : 1; v.leg = i % 2 ? null : v.leg; v.idle = i === 1 ? 1 : 0; });
    shots.push(crop("cães (perseguindo, patrulha, procura, afugentado)")); }
  // 8 e 9. skins preta e branca em lugar típico (o início da fase)
  for (const [skin, name] of [["preto", "skin preta"], ["branco", "skin branca"]]) { begin(); g.catSkin = skin; put(sp[0], sp[1], "right"); shots.push(crop(name)); }
  g.catSkin = "";
  // monta a folha 3 × 3 com legendas
  const cw = shots.find(Boolean).cv.width, ch = shots.find(Boolean).cv.height, pad = 8, cap = 20;
  const sheet = document.createElement("canvas"); sheet.width = 3 * cw + 4 * pad; sheet.height = 3 * (ch + cap) + 4 * pad + 24;
  const s = sheet.getContext("2d"); s.fillStyle = "#101319"; s.fillRect(0, 0, sheet.width, sheet.height);
  s.font = "bold 15px system-ui, sans-serif"; s.fillStyle = "#fff"; s.fillText("Fase " + id + " · " + lv.place + " · " + cols + "×" + rows, pad, 20);
  shots.forEach((sh, i) => {
    const x = pad + (i % 3) * (cw + pad), y = 24 + pad + Math.floor(i / 3) * (ch + cap + pad);
    s.font = "12px system-ui, sans-serif"; s.fillStyle = "#cfd6e4"; s.fillText((i + 1) + ". " + (sh ? sh.label : "(sem cena)"), x, y + 13);
    if (sh) s.drawImage(sh.cv, x, y + cap); else { s.fillStyle = "#222"; s.fillRect(x, y + cap, cw, ch); }
  });
  return { png: sheet.toDataURL("image/png"), notes };
};

// Posição típica para a captura da página inteira: o gatinho perto de um X, de um T e de uma poça, ou na maior concentração deles; molhado se houver poça.
const TYPICAL = ({ id }) => {
  const g = window.__game, T = 32;
  g.start(id); g.autoStart = true; g.freezeVets = true; g.catSkin = ""; g.setLives(5);
  const lv = g.builtOf("cat")[id], kinds = lv.kinds, rows = lv.rows, cols = lv.cols;
  const at = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? "#" : kinds[r][c]);
  let best = null;
  for (let r = 2; r < rows - 2; r++) for (let c = 2; c < cols - 2; c++) {
    if (at(c, r) !== ".") continue;
    let sc = 0, hasT = 0, hasW = 0, hasX = 0;
    for (let dr = -4; dr <= 4; dr++) for (let dc = -5; dc <= 5; dc++) { const k = at(c + dc, r + dr); if (k === "T") { sc += 2; hasT = 1; } else if (k === "~") { sc += 1; hasW = 1; } else if (k === "X") { sc += 1.5; hasX = 1; } }
    sc += (hasT + hasW + hasX) * 12;
    if (!best || sc > best.sc) best = { sc, c, r };
  }
  if (best) { const p = g.player; p.x = best.c * T + 4; p.y = best.r * T + 4; p.facing = "right"; g.tick(0.001); }
  const near = g.vets[0]; if (near && best) { near.cx = best.c * T + 16 + 70; near.cy = best.r * T + 16 - 40; near.mode = "chase"; }
  if (lv.water) g.wet = 3.5;
  g.tick(0.016); g.drawNow();
  return { c: best && best.c, r: best && best.r };
};

(async () => {
  const out = path.resolve(process.argv[2] || path.join(os.tmpdir(), "cat-game"));
  const fases = arg("fases", "") ? arg("fases", "").split(",").map(Number) : Array.from({ length: 20 }, (_, i) => i + 1);
  const telas = arg("telas", "1,9,18,20").split(",").map(Number).filter(Boolean);
  const tams = arg("tam", "desktop").split(",");
  const scale = Number(arg("escala", "1.4"));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  const bad = [];
  const inits = async (tam) => {
    const S = SIZES[tam], ctx = await browser.newContext({ viewport: { width: S.w, height: S.h }, hasTouch: S.touch, isMobile: S.touch, reducedMotion: process.env.CALM === "1" ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => bad.push(`[${tam}] erro de página: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") bad.push(`[${tam}] erro no console: ${m.text()}`); });
    await page.goto("file://" + path.resolve(__dirname, "../../index.html"));
    await page.evaluate(() => { try { localStorage.clear(); const st = Records.createStore(localStorage); st.setPlayer("Mimi"); } catch { /* sem storage */ } __game.setAnimal("cat"); });
    if (!(await page.evaluate(() => __game.animal === "cat"))) throw new Error("o Gatinho não está pronto (js/cat-levels.js não carregou?)");
    return { ctx, page };
  };
  try {
    // folhas de recortes (desktop)
    if (tams.includes("desktop")) {
      const { ctx, page } = await inits("desktop");
      const shots = {};
      for (const id of fases) {
        const r = await page.evaluate(SHEET, { id, scale });
        fs.writeFileSync(path.join(out, `folha-${String(id).padStart(2, "0")}.png`), Buffer.from(r.png.split(",")[1], "base64"));
        if (r.notes.length) console.log(`fase ${id}: ${r.notes.join("; ")}`);
        await page.evaluate(TYPICAL, { id });
        await page.waitForTimeout(40);
        const full = path.join(out, `tela-${String(id).padStart(2, "0")}-desktop.png`);
        await page.screenshot({ path: full });
        shots[id] = full;
      }
      // folhas de contato: a captura do campo inteiro de cada fase
      for (const [name, ids] of [["geral-1", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], ["geral-2", [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]]]) {
        const have = ids.filter((i) => shots[i]);
        if (!have.length) continue;
        const html = `<body style="margin:0;background:#101319;color:#fff;font:13px system-ui"><div style="display:grid;grid-template-columns:repeat(2,500px);gap:6px">${have.map((i) => `<div>Fase ${i}<br><img src="${path.basename(shots[i])}" width="500"></div>`).join("")}</div></body>`;
        const htmlFile = path.join(out, name + ".html");
        fs.writeFileSync(htmlFile, html); // (uma página de verdade: imagens de file:// não carregam em about:blank)
        const p2 = await ctx.newPage();
        await p2.goto("file://" + htmlFile); await p2.waitForLoadState("load");
        await p2.screenshot({ path: path.join(out, name + ".png"), fullPage: true }); await p2.close();
        fs.unlinkSync(htmlFile);
      }
      await ctx.close();
    }
    // capturas inteiras no celular em pé e deitado
    for (const tam of tams.filter((t) => t !== "desktop")) {
      const { ctx, page } = await inits(tam);
      for (const id of telas) {
        if (!fases.includes(id)) continue;
        await page.evaluate(TYPICAL, { id });
        await page.waitForTimeout(80);
        await page.screenshot({ path: path.join(out, `tela-${String(id).padStart(2, "0")}-${tam}.png`) });
      }
      await ctx.close();
    }
  } finally { await browser.close(); }
  if (bad.length) { console.log("ERROS:\n" + [...new Set(bad)].join("\n")); process.exit(1); }
  console.log("capturas em " + out);
})().catch((e) => { console.error(e); process.exit(1); });
