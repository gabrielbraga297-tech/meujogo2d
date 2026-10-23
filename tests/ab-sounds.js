// A/B de SONS do CACHORRINHO (0.18.0, E2b-2): prova que o Cachorrinho toca exatamente os mesmos sons (nomes e atrasos) entre duas versões do código.
// Joga cenas fixas com a mesma semente (Math.random e `setRand` trocados por um gerador fixo): pegar rações, ossos de todos os tipos e bolinhas, ganhar de carteiros e de gatos, o "!" dos agentes, o miado do gato que nota o cachorrinho,
// ser pego, perder todas as vidas e completar a fase (latido). Devolve a lista de pedidos de som: "nome" ou "nome@atraso".
// Uso:  node tests/ab-sounds.js <pasta-do-código>   (CHROMIUM_PATH e NODE_PATH como nos outros testes; use `flock` no trinco do navegador). O tests/e2e.js compara com DOG_SOUNDS_0170,
// tirada do código de antes dos sons do Gatinho (commit ad58681).
const path = require("path");

// Roda dentro da página (1280×720). Cada cena começa com a semente fixa; o espião registra os pedidos de `sound.play` (o gancho `sound.events` não guarda o atraso).
const DOG_SOUNDS = () => {
  const g = window.__game, log = [], scenes = {};
  let seed = 987654321;
  const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const realRandom = Math.random, play = g.sound.play;
  Math.random = rnd;
  g.sound.play = function (n, o) { log.push(n + (o && o.delay ? "@" + o.delay : "")); return play.apply(this, arguments); };
  const scene = (name, fn) => { const from = log.length; try { fn(); } catch (e) { log.push("ERRO " + e.message); } scenes[name] = log.slice(from); };
  const put = (e) => { g.player.x = e.x - 4; g.player.y = e.y - 4; };
  const onTop = (v) => { v.cx = g.player.x + 12; v.cy = g.player.y + 12; };
  try {
    g.setAnimal("dog"); g.setRand(rnd); g.autoStart = true; g.noCatch = true;
    scene("pegar tudo (Fase 11)", () => { // rações, ossos de todos os tipos (a vida extra sorteada toca "life"), bolinhas; com o poder ligado, ganhar de carteiros e de gatos
      g.start(11); g.freezeVets = true; g.catsThaw = false;
      for (const it of g.items) { put(it); g.tick(0.01); }
      for (const b of g.balls) { g.player.x = b.x - 12; g.player.y = b.y - 12; g.tick(0.01); }
      const bone = g.items.find((i) => i.bone && (i.kind || "scare") === "scare");
      g.start(11); g.freezeVets = true; // de novo, com o poder: ossos comuns primeiro
      for (const it of g.items.filter((i) => i.bone && (i.kind || "scare") === "scare")) { put(it); g.tick(0.01); }
      for (const v of g.vets) { onTop(v); g.tick(0.01); }
      for (const c of g.cats) { onTop(c); g.tick(0.01); }
    });
    scene("o gato nota o cachorrinho", () => { // o gato solto: persegue e mia (no máximo um a cada 4 s)
      g.start(11); g.freezeVets = true; g.catsThaw = true; g.noCatch = true;
      const start = g.cats[0];
      g.player.x = start.cx - 12 - 64; g.player.y = start.cy - 12;
      for (let i = 0; i < 400; i++) g.tick(0.05);
      g.catsThaw = false;
    });
    scene("os agentes notam o cachorrinho (o '!')", () => { // nenhum som novo
      g.start(4); g.freezeVets = false; g.noCatch = true;
      for (let i = 0; i < 600; i++) g.tick(0.05);
    });
    scene("ser pego e perder as vidas", () => {
      g.start(3, { lives: 2 }); g.noCatch = false; g.freezeVets = true;
      for (let n = 0; n < 4 && g.state === "playing"; n++) {
        for (const v of g.vets) v.cool = 99;
        for (let i = 0; i < 60 && g.invuln > 0; i++) g.tick(0.05);
        onTop(g.vets[0]); g.tick(0.01);
      }
    });
    scene("completar a fase (latido de filhote)", () => {
      g.noCatch = true; g.start(2); g.freezeVets = true;
      for (let i = 0; i < 200; i++) g.tick(0.05);
      for (const it of g.items) { put(it); g.tick(0.01); }
      for (const b of g.balls) { g.player.x = b.x - 12; g.player.y = b.y - 12; g.tick(0.01); }
      const e = g.exit; g.player.x = e.x + 4; g.player.y = e.y + 4; g.tick(0.01);
    });
    scene("completar uma fase de jovem (latido médio)", () => {
      g.noCatch = true; g.start(6); g.freezeVets = true;
      for (let i = 0; i < 200; i++) g.tick(0.05);
      for (const it of g.items) { put(it); g.tick(0.01); }
      for (const b of g.balls) { g.player.x = b.x - 12; g.player.y = b.y - 12; g.tick(0.01); }
      const e = g.exit; g.player.x = e.x + 4; g.player.y = e.y + 4; g.tick(0.01);
    });
    scene("completar uma fase de adulto (latido grave)", () => {
      g.noCatch = true; g.start(12); g.freezeVets = true;
      for (let i = 0; i < 200; i++) g.tick(0.05);
      for (const it of g.items) { put(it); g.tick(0.01); }
      const e = g.exit; g.player.x = e.x + 4; g.player.y = e.y + 4; g.tick(0.01);
    });
  } finally { Math.random = realRandom; g.sound.play = play; g.setRand(null); g.freezeVets = false; g.catsThaw = false; g.noCatch = false; }
  return { log, scenes };
};
module.exports = { DOG_SOUNDS };

if (require.main === module) {
  const { chromium } = require("playwright");
  (async () => {
    const repo = path.resolve(process.argv[2] || path.join(__dirname, ".."));
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
    try {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
      await ctx.addInitScript(() => { Object.defineProperty(window, "CatLevels", { configurable: true, get: () => undefined, set: () => {} }); }); // (como as seções antigas do e2e: sem os mapas do Gatinho)
      const page = await ctx.newPage();
      const errs = []; page.on("pageerror", (e) => errs.push(e.message));
      await page.goto("file://" + path.join(repo, "index.html"));
      const out = await page.evaluate(DOG_SOUNDS);
      console.log(JSON.stringify(out));
      if (errs.length) { console.log("ERROS:", errs.join(" | ")); process.exitCode = 1; }
    } finally { await b.close(); }
  })();
}
