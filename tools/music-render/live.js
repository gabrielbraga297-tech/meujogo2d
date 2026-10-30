// Confere o TOCADOR num AudioContext REAL do Chromium (em tempo real, com o relógio de verdade): começa o menu, troca de tema com crossfade, abaixa (duck), pausa,
// muta e para, medindo o nível do sinal que sai do Sound por um AnalyserNode e contando erros de página. Não mede se "soa bem": só que toca, que o nível acompanha
// cada comando e que nada lança erro no navegador de verdade.
// Uso:  node tools/music-render/live.js       (variáveis: CHROMIUM_PATH, NODE_PATH, MUSIC_LOCK como em render.js). Sai com código 1 se algo falhar. Leva ~30 s.
const path = require("path");
const { spawnSync } = require("child_process");
const LOCK = process.env.MUSIC_LOCK || process.env.PREVIEW_LOCK;
if (LOCK && !process.env.MUSIC_LOCKED) {
  const r = spawnSync("flock", [LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, MUSIC_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
  let errors = 0;
  const failures = [];
  const expect = (cond, msg) => { console.log((cond ? "ok    " : "FALHA ") + msg); if (!cond) failures.push(msg); };
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => { errors++; console.log("ERRO DE PÁGINA:", e.message); });
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") { errors++; console.log("CONSOLE:", m.type(), m.text()); } });
    await page.setContent("<!doctype html><meta charset=utf-8>");
    await page.addScriptTag({ path: path.join(__dirname, "../../js/sound.js") });
    await page.addScriptTag({ path: path.join(__dirname, "../../js/music.js") });
    await page.evaluate(() => {
      const mem = {}; // a página em branco não tem localStorage: um armazenamento em memória com a mesma interface
      window.store = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
      window.som = Sound.create({ storage: window.store });
      window.musica = Music.create({ sound: window.som, storage: window.store });
      window.__ok = window.musica.play("menu");
    });
    const st0 = await page.evaluate(() => window.musica.state);
    expect(st0 === "waiting", "antes do unlock o pedido fica esperando (estado " + st0 + ")");
    await page.evaluate(() => {
      window.som.unlock();
      const a = window.som.audio();
      window.an = a.ctx.createAnalyser(); window.an.fftSize = 2048;
      a.input.connect(window.an);
      window.buf = new Float32Array(window.an.fftSize);
      window.peakNow = () => { window.an.getFloatTimeDomainData(window.buf); let p = 0; for (const v of window.buf) p = Math.max(p, Math.abs(v)); return p; };
      window.maxFor = (ms) => new Promise((res) => { let m = 0; const t0 = performance.now(); const id = setInterval(() => { m = Math.max(m, window.peakNow()); if (performance.now() - t0 > ms) { clearInterval(id); res(m); } }, 20); });
    });
    const state1 = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 300)); return { state: window.musica.state, ctx: window.som.audio().ctx.state }; });
    expect(state1.state === "playing" && state1.ctx === "running", `depois do unlock toca (${JSON.stringify(state1)})`);
    const lvMenu = await page.evaluate(() => window.maxFor(3000));
    expect(lvMenu > 0.002, `sai sinal do menu (pico no master ${lvMenu.toFixed(4)})`);
    expect(lvMenu < 0.5, "o nível de saída fica baixo (pico no master < 0,5)");
    // duck
    const lvNormal = await page.evaluate(() => window.maxFor(2500));
    await page.evaluate(() => window.musica.setDuck(0.1));
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));
    const lvDuck = await page.evaluate(() => window.maxFor(2500));
    expect(lvDuck < lvNormal * 0.5, `duck 0,1 abaixa o nível (${lvNormal.toFixed(4)} -> ${lvDuck.toFixed(4)})`);
    await page.evaluate(() => window.musica.setDuck(1));
    // crossfade
    const cross = await page.evaluate(async () => { const ok = window.musica.play("dog1"); await new Promise((r) => setTimeout(r, 400)); const mid = await window.maxFor(500); await new Promise((r) => setTimeout(r, 1500)); const after = await window.maxFor(2000); return { ok, mid, after, cur: window.musica.current, pos: window.musica.position }; });
    expect(cross.ok && cross.cur === "dog1" && cross.mid > 0.002 && cross.after > 0.002, `crossfade para dog1 sem silêncio (${JSON.stringify(cross)})`);
    // pausa e retomada
    const pa = await page.evaluate(async () => { window.musica.pause(); await new Promise((r) => setTimeout(r, 700)); const quiet = await window.maxFor(800); const st = window.musica.state; window.musica.resume(); await new Promise((r) => setTimeout(r, 300)); const back = await window.maxFor(2500); return { quiet, st, back, st2: window.musica.state }; });
    expect(pa.st === "paused" && pa.quiet < 0.0005, `pausa silencia (nível ${pa.quiet.toFixed(5)})`);
    expect(pa.st2 === "playing" && pa.back > 0.002, `retomada volta a tocar (nível ${pa.back.toFixed(4)})`);
    // mudo do Sound
    const mu = await page.evaluate(async () => { window.som.setMuted(true); window.musica.tick(); await new Promise((r) => setTimeout(r, 500)); const q = await window.maxFor(800); const st = window.musica.state; window.som.setMuted(false); await new Promise((r) => setTimeout(r, 400)); const b = await window.maxFor(2500); return { q, st, b }; });
    expect(mu.st === "muted" && mu.q < 0.0005, `mudo silencia (nível ${mu.q.toFixed(5)})`);
    expect(mu.b > 0.002, `desmutar volta (nível ${mu.b.toFixed(4)})`);
    // botão Música
    const en = await page.evaluate(async () => { window.musica.setEnabled(false); await new Promise((r) => setTimeout(r, 600)); const q = await window.maxFor(800); const raw = window.store.getItem("cachorrinho.musica.v1"); window.musica.setEnabled(true); await new Promise((r) => setTimeout(r, 400)); const b = await window.maxFor(2500); return { q, raw, b }; });
    expect(en.raw === '{"on":0}', "preferência gravada em cachorrinho.musica.v1 ao desligar (" + en.raw + ")");
    expect(en.q < 0.0005 && en.b > 0.002, `música desligada silencia (${en.q.toFixed(5)}) e ligada volta (${en.b.toFixed(4)})`);
    // efeitos continuam junto da música
    const fx = await page.evaluate(async () => { const ok = window.som.play("bone"); await new Promise((r) => setTimeout(r, 50)); return { ok, p: await window.maxFor(300) }; });
    expect(fx.ok, "um efeito sonoro toca junto com a música");
    // parar
    const sp = await page.evaluate(async () => { window.musica.stop(0.3); await new Promise((r) => setTimeout(r, 900)); const q = await window.maxFor(800); return { q, st: window.musica.state, cur: window.musica.current }; });
    expect(sp.st === "stopped" && sp.cur === null && sp.q < 0.0005, `stop(0,3) some (nível ${sp.q.toFixed(5)})`);
    // laço inteiro do tema mais curto, na hora: troca de tema rápida repetida não acumula nós nem erros
    const churn = await page.evaluate(async () => { for (let i = 0; i < 12; i++) { window.musica.play(["menu", "dog1", "cat1", "bird1"][i % 4], { fade: 0.2 }); await new Promise((r) => setTimeout(r, 250)); } return window.musica.state; });
    expect(churn === "playing", "12 trocas de tema seguidas (estado " + churn + ")");
    expect(errors === 0, `nenhum erro nem aviso no console (${errors})`);
  } finally { await browser.close(); }
  console.log(failures.length ? `\n${failures.length} falha(s)` : "\nO tocador funciona num AudioContext real");
  process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
