// Folhas de capturas das SKINS DOS OBJETOS DO GATINHO (0.19.0): todas as skins de cada categoria lado a lado, no mostruário da lojinha (PREVIEW) e dentro do jogo de verdade (index.html + js/cat-levels.js).
// Uso (NODE_PATH e CHROMIUM_PATH como nos testes; PREVIEW_LOCK é opcional):
//   NODE_PATH=<pasta-do-playwright>/node_modules CHROMIUM_PATH=/caminho/do/chromium PREVIEW_LOCK=<arquivo> node tools/skin-preview/cat-skins.js <pasta-de-saida> [opções]
// Opções: fase=20 (fase do dia; padrão 20, onde há todos os objetos) · noite=18 (fase noturna; padrão 18) · cats=guard,mouse,yarn,agile,perch,tracker (padrão: todas) · zoom=3 (zoom dos recortes) · vp=1000x700 (tamanho da tela; use 390x780 ou 320x568 para ver como fica no celular) · CALM=1 liga "reduzir movimento".
// Gera, em <pasta>:
//   lojinha.png           os mostruários (PREVIEW) de todas as skins de todas as categorias, uma linha por categoria (a padrão primeiro), com o nome embaixo;
//   jogo-<categoria>.png  o objeto dentro do jogo com cada skin, lado a lado: linha de cima no ambiente da fase do dia, linha de baixo na fase noturna (ratinhos e camundongos precisam aparecer no escuro);
//   novelos.png           os 5 tipos de poder (comum, ouro, gelo, turbo, ímã) em linhas × todas as skins de novelo em colunas: a cor de cada poder tem de ser a mesma em todas.
// Cada recorte sai do próprio canvas do jogo, no mesmo quadro (tests/skins-cat-frame.js). PREVIEW_LOCK=<arquivo>: o script se reexecuta sob `flock` nesse arquivo.
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

if (process.env.PREVIEW_LOCK && !process.env.PREVIEW_LOCKED) {
  const r = spawnSync("flock", [process.env.PREVIEW_LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PREVIEW_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const { chromium } = require("playwright");
const { CAT_FRAME, VIEWPORT, settle } = require(path.join(__dirname, "../../tests/skins-cat-frame.js"));
const arg = (name, def) => { const a = process.argv.slice(3).find((x) => x.startsWith(name + "=")); return a ? a.slice(name.length + 1) : def; };
const root = path.resolve(__dirname, "../..");
const out = path.resolve(process.argv[2] || "skin-preview-out");
const DAY = Number(arg("fase", 20)), NIGHT = Number(arg("noite", 18)), ZOOM = Number(arg("zoom", 3));
const VP = /^(\d+)x(\d+)$/.test(arg("vp", "")) ? { width: +arg("vp").split("x")[0], height: +arg("vp").split("x")[1] } : VIEWPORT; // vp=390x780: o tamanho da tela (celular); os recortes saem do canvas na resolução real dessa tela
const CATS = arg("cats", "guard,mouse,yarn,agile,perch,tracker").split(",");
const SCENE = { guard: "guard", tracker: "tracker", mouse: "mouse", agile: "agile", yarn: "yarn-scare", perch: "T" }; // em que cena de CAT_FRAME aparece cada categoria
const TILES = [3.6, 2.4], DX = -36; // recorte em tiles, em volta do objeto; o gatinho fica 36 px à esquerda dele
const KINDS = [["scare", "comum"], ["gold", "ouro"], ["ice", "gelo"], ["turbo", "turbo"], ["magnet", "ímã"]];

// Roda DENTRO da página: monta a folha (linhas de células com legenda) a partir de imagens (data URLs) e devolve o PNG.
const BUILD = async ({ title, rows, cw, ch }) => {
  const gap = 8, left = 150, lab = 18, ncol = Math.max(...rows.map((r) => r.cells.length));
  const W = left + ncol * (cw + gap) + gap, H = 34 + rows.length * (ch + lab + gap) + gap;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const o = cv.getContext("2d"); o.fillStyle = "#1d2330"; o.fillRect(0, 0, W, H);
  o.fillStyle = "#ffffff"; o.font = "bold 16px system-ui, sans-serif"; o.textBaseline = "top"; o.fillText(title, 10, 8);
  const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error("imagem")); im.src = src; });
  for (const [ri, row] of rows.entries()) {
    const y = 34 + ri * (ch + lab + gap);
    o.fillStyle = "#cfd6e4"; o.font = "bold 13px system-ui, sans-serif"; o.textBaseline = "middle"; o.textAlign = "left"; o.fillText(row.label, 8, y + ch / 2);
    for (const [ci, cell] of row.cells.entries()) {
      const x = left + gap + ci * (cw + gap);
      o.fillStyle = "#2a3246"; o.fillRect(x, y, cw, ch);
      if (cell.src) { const im = await load(cell.src); o.drawImage(im, x, y, cw, ch); }
      else { o.fillStyle = "#7a849a"; o.font = "12px system-ui, sans-serif"; o.textAlign = "center"; o.textBaseline = "middle"; o.fillText("(não existe nesta fase)", x + cw / 2, y + ch / 2); o.textAlign = "left"; }
      o.fillStyle = "#ffffff"; o.font = "12px system-ui, sans-serif"; o.textBaseline = "top"; o.textAlign = "left"; o.fillText(cell.label || "", x + 2, y + ch + 3, cw - 4);
    }
  }
  return cv.toDataURL("image/png");
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: VP, hasTouch: VP.width < 800, reducedMotion: process.env.CALM ? "reduce" : "no-preference" });
  const pg = await ctx.newPage();
  const errs = [];
  pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await pg.goto("file://" + root + "/index.html");
  await pg.evaluate(() => { localStorage.clear(); });
  await pg.reload();
  await pg.evaluate(`window.__frame = ${CAT_FRAME.toString()};`);
  const save = (name, dataUrl) => { fs.writeFileSync(path.join(out, name), Buffer.from(dataUrl.split(",")[1], "base64")); console.log("gerou", path.join(out, name)); };
  const skinsOf = (slot) => pg.evaluate((slot) => Skins.list(slot).map((k) => ({ id: k.id, name: k.name, price: k.price })), slot);
  const lab = (k) => `${k.id || "padrão"}: ${k.name}${k.price ? " · " + k.price : ""}`;
  const crop = async (id, looks, scene) => { await settle(pg, id); return pg.evaluate((a) => { const r = window.__frame(a); return r[a.scenes[0] + ".png"] || null; }, { id, seed: 12345, looks, scenes: [scene], shots: true, crop: ZOOM, tiles: TILES, focus: true, dx: DX }); };

  // 1. lojinha: os mostruários (216 × 156, como os cartões)
  const shop = [];
  for (const slot of CATS) {
    const cells = [];
    for (const k of await skinsOf(slot)) {
      const src = await pg.evaluate(({ slot, id }) => {
        const cv = document.createElement("canvas"); cv.width = 216; cv.height = 156; const c2 = cv.getContext("2d");
        c2.fillStyle = "#f4efe4"; c2.fillRect(0, 0, 216, 156); // (um fundo claro, como o cartão da lojinha)
        return __game.skinPreview(slot, cv, id) ? cv.toDataURL("image/png") : null;
      }, { slot, id: k.id });
      cells.push({ src, label: lab(k) });
    }
    shop.push({ label: slot, cells });
  }
  save("lojinha.png", await pg.evaluate(BUILD, { title: "Lojinha: mostruários (a padrão primeiro)", rows: shop, cw: 216, ch: 156 }));

  // 2. dentro do jogo, dia e noite
  const cw = Math.round(TILES[0] * 32 * ZOOM), ch = Math.round(TILES[1] * 32 * ZOOM);
  for (const slot of CATS) {
    const ks = await skinsOf(slot), rows = [];
    for (const [id, name] of [[DAY, `Fase ${DAY} (dia)`], [NIGHT, `Fase ${NIGHT} (noite)`]]) {
      const cells = [];
      for (const k of ks) cells.push({ src: await crop(id, k.id ? { [slot]: k.id } : {}, SCENE[slot]), label: lab(k) });
      rows.push({ label: name, cells });
    }
    save(`jogo-${slot}.png`, await pg.evaluate(BUILD, { title: `${slot} no jogo`, rows, cw, ch }));
  }

  // 3. novelos: os 5 poderes × todas as skins
  if (CATS.includes("yarn")) {
    const ks = await skinsOf("yarn"), rows = [];
    for (const [kind, name] of KINDS) {
      const cells = [];
      for (const k of ks) cells.push({ src: await crop(DAY, k.id ? { yarn: k.id } : {}, "yarn-" + kind), label: k.id || "padrão" });
      rows.push({ label: `novelo ${name}`, cells });
    }
    save("novelos.png", await pg.evaluate(BUILD, { title: "Novelos: a cor de cada poder é a mesma em todas as skins", rows, cw, ch }));
  }
  console.log(errs.length ? "ERROS JS: " + errs.join(" | ") : "sem erros de JavaScript");
  await ctx.close(); await browser.close();
  if (errs.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
