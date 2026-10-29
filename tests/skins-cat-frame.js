// Quadros fixos do JOGO DO GATINHO para conferir as skins dos objetos (0.19.0, frente C): roda DENTRO da página (index.html + js/cat-levels.js) e devolve o hash de pixels do canvas de cada cena.
// Usado pelo tests/e2e.js (seção "0.19.0 · Skins do Gatinho") e por tools/skin-preview/cat-skins.js. As cenas são sempre as mesmas: semente fixa, cães congelados, o gatinho teletransportado perto de cada objeto
// e UM quadro desenhado (sem andar o jogo, exceto 1 ms na cena do lugar alto, para o gatinho ficar a salvo em cima dele).
// Os valores de referência (HASHES_0180_CAT no tests/e2e.js) saíram do código da 0.18.0 (commit de partida ed7e2f7, sem nenhuma skin) com o Chromium desta máquina, viewport 1000×700, com `settle` antes de cada fase.
//   CAT_FRAME({ id, seed, looks: { categoria: "idSkin" }, scenes: [...], shots, crop (zoom), tiles: [largura, altura] do recorte, focus (recorte em volta do objeto), dx (distância do gatinho ao objeto, px) })  ->  { cena: hash | null }  (null = o objeto não existe na fase)
// Cenas: spawn (início), T (em cima do 1º lugar alto), foes (4 cães em 4 modos), guard, tracker, mouse, yarn-scare|gold|ice|turbo|magnet, agile.
// Com `shots: true` devolve também o recorte PNG (data URL) de cada cena em volta do gatinho (9 × 6 tiles), para as folhas de capturas.
const CAT_FRAME = ({ id, seed, looks, scenes, shots, crop, tiles: tsz, dx: dxo, focus: onObject }) => {
  const g = window.__game, T = 32;
  const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const realRandom = Math.random, cv = document.getElementById("game");
  const hash = () => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, u = new Uint32Array(d.buffer, d.byteOffset, d.byteLength >> 2); let h = 2166136261 >>> 0; for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 16777619) >>> 0; return h.toString(16); };
  let fp = null; // (ponto em volta do qual sai o recorte quando `focus` está ligado: o centro do objeto da cena; sem ele, o gatinho)
  const png = (w, h) => { // recorte em volta do gatinho (ou do objeto, com `focus`), no mesmo quadro
    const v = g.view, k = v.k * v.zoom, p = g.player, cx = onObject && fp ? fp[0] : p.x + p.w / 2, cy = onObject && fp ? fp[1] : p.y + p.h / 2, tw = w || (tsz && tsz[0]) || 9, th = h || (tsz && tsz[1]) || 6, sc = crop || 1.4;
    const out = document.createElement("canvas"); out.width = Math.round(tw * T * sc); out.height = Math.round(th * T * sc);
    const o = out.getContext("2d"); o.fillStyle = "#1d2330"; o.fillRect(0, 0, out.width, out.height);
    const sw = tw * T * k, sh = th * T * k, sx0 = Math.max(0, Math.min(cv.width - sw, (cx - tw * T / 2 - v.camX) * k)), sy0 = Math.max(0, Math.min(cv.height - sh, (cy - th * T / 2 - v.camY) * k));
    o.drawImage(cv, sx0, sy0, sw, sh, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  };
  const out = {};
  Math.random = mul(seed * 7919 + 13); g.setRand(mul(seed));
  try {
    g.setAnimal("cat"); g.autoStart = true; g.noCatch = true; g.start(id); g.freezeVets = true;
    for (const [slot, sk] of Object.entries(looks || {})) g.setLook(slot, sk);
    for (let i = 0; i < 30; i++) g.tick(1 / 60);
    const lv = g.builtOf("cat")[id], p = g.player;
    const tiles = (ch) => { const o = []; for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) if (lv.kinds[r][c] === ch) o.push([c, r]); return o; };
    const near = (x, y, dx = -56, dy = 0) => { fp = [x, y]; if (dxo !== undefined) dx = dxo; p.x = x + dx - 12; p.y = y + dy - 12; p.facing = "right"; p.moving = false; };
    const done = (name) => { g.drawNow(); out[name] = hash(); if (shots) out[name + ".png"] = png(); };
    const none = (name) => { out[name] = null; };
    const spawn = [p.x, p.y];
    for (const name of scenes) {
      fp = null;
      if (name === "spawn") { p.x = spawn[0]; p.y = spawn[1]; p.moving = false; done(name); }
      else if (name === "T") { const t = tiles("T"); if (!t.length) { none(name); continue; } const [c, r] = t[(t.length / 2) | 0]; fp = [c * T + 16, r * T + 16]; p.x = c * T + 4; p.y = r * T + 4; p.facing = "down"; g.tick(0.001); done(name); }
      else if (name === "foes") {
        const foes = g.vets.concat(g.cats); if (foes.length < 2) { none(name); continue; }
        const modes = ["chase", "patrol", "search", "flee"], cx = spawn[0] + 12, cy = spawn[1] + 12, spots = [[-52, -30], [60, -26], [-40, 44], [58, 40]];
        p.x = spawn[0]; p.y = spawn[1]; p.moving = false;
        foes.slice(0, 4).forEach((v, i) => { v.cx = cx + spots[i][0]; v.cy = cy + spots[i][1]; v.mode = modes[i]; v.dir = i % 2 ? -1 : 1; v.idle = 0; });
        done(name);
      } else if (name === "guard") { const v = g.vets[0]; if (!v) { none(name); continue; } near(v.cx, v.cy); done(name); }
      else if (name === "tracker") { const v = g.cats[0]; if (!v) { none(name); continue; } near(v.cx, v.cy); done(name); }
      else if (name === "mouse") { const it = g.items.find((i) => !i.bone && !i.taken); if (!it) { none(name); continue; } near(it.x + 8, it.y + 8, -50); done(name); }
      else if (name.startsWith("yarn-")) { const it = g.items.find((i) => i.bone && !i.taken && i.kind === name.slice(5)); if (!it) { none(name); continue; } near(it.x + 8, it.y + 8, -50); done(name); }
      else if (name === "agile") { const b = g.balls.find((x) => !x.taken); if (!b) { none(name); continue; } near(b.x, b.y, -70); done(name); }
      else throw new Error("cena desconhecida: " + name);
    }
  } finally { Math.random = realRandom; g.setRand(null); for (const slot of Object.keys(looks || {})) g.setLook(slot, ""); }
  return out;
};
const SCENES_ALL = ["spawn", "T", "foes", "guard", "tracker", "mouse", "yarn-scare", "yarn-gold", "yarn-ice", "yarn-turbo", "yarn-magnet", "agile"];
// Do lado do Node: começa a fase e espera o leiaute assentar (a altura do placar muda o tamanho do canvas, e muda de uma fase para outra: sem esperar, o tamanho do quadro depende da pressa da máquina).
// Só espera quando a fase é outra que a do último quadro desta página.
async function settle(pg, id) {
  if (pg.__skcLevel === id) return;
  await pg.evaluate((id) => { const g = window.__game; g.setAnimal("cat"); g.autoStart = true; g.start(id); }, id);
  await pg.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 150))))));
  pg.__skcLevel = id;
}
module.exports = { CAT_FRAME, SCENES_ALL, settle, VIEWPORT: { width: 1000, height: 700 } };
