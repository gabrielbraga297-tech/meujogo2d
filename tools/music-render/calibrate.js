// Mede cada instrumento SOZINHO num OfflineAudioContext real do Chromium e imprime o ajuste de volume (INST_GAIN de js/music.js) que iguala a energia de uma nota padrão
// à da marimba. Foi assim que a tabela INST_GAIN foi calibrada; rode de novo se mudar o timbre de algum instrumento.
// Uso:  node tools/music-render/calibrate.js     (mesmas variáveis de ambiente de render.js: CHROMIUM_PATH, NODE_PATH, MUSIC_LOCK)
// A nota padrão: velocidade 0,8, duração escrita de 0,5 s, uma por segundo, em 16 alturas do registro natural do instrumento (percussão: 16 batidas; ambiências: eventos de 2 s).
// Medida: energia (soma dos quadrados) por nota, em banda cheia, relativa à da marimba. Não mede "quão alto soa": isso depende do ouvido e do alto-falante.
const path = require("path");
const { spawnSync } = require("child_process");
const LOCK = process.env.MUSIC_LOCK || process.env.PREVIEW_LOCK;
if (LOCK && !process.env.MUSIC_LOCKED) {
  const r = spawnSync("flock", [LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, MUSIC_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}
(async () => {
  const { chromium } = require("playwright");
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("ERRO DE PÁGINA:", e.message));
    await page.setContent("<!doctype html><meta charset=utf-8>");
    await page.addScriptTag({ path: path.join(__dirname, "../../js/music.js") });
    const res = await page.evaluate(async () => {
      const SR = 44100, out = {};
      const range = { pluck: [60, 84], marimba: [60, 84], xylo: [72, 96], flute: [64, 88], bell: [72, 96], celesta: [72, 96], harp: [60, 84], organ: [48, 72], strings: [48, 72], bass: [36, 55], bassSine: [36, 55], bassSaw: [36, 55], contrabass: [36, 55] };
      for (const inst of Object.keys(Music.INSTRUMENTS)) {
        const kind = Music.INSTRUMENTS[inst], events = [];
        for (let i = 0; i < 16; i++) {
          if (kind === "tone" || kind === "bass") { const [lo, hi] = range[inst]; events.push({ t: i * 2, d: 1, midi: Math.round(lo + (hi - lo) * i / 15), v: 0.8, voice: "lead", inst, kind: "motif" }); }
          else if (kind === "perc") events.push({ t: i * 2, d: 0.25, midi: null, v: 0.8, voice: "lead", inst, kind: i % 2 ? "high" : "low" });
          else events.push({ t: i * 4, d: 4, midi: null, v: 0.8, voice: "lead", inst, kind: "x", f: 500 + 40 * i });
        }
        const bpm = 120, last = events[events.length - 1], secs = (last.t + last.d) * 0.5 + 4;
        const sc = { bpm, lengthBeats: 99999, gain: 1, events };
        const ctx = new OfflineAudioContext(1, Math.ceil(secs * SR), SR);
        Music.render(sc, ctx, ctx.destination, 0);
        const d = (await ctx.startRendering()).getChannelData(0);
        let e = 0, pk = 0;
        for (let i = 0; i < d.length; i++) { e += d[i] * d[i]; if (Math.abs(d[i]) > pk) pk = Math.abs(d[i]); }
        out[inst] = { energyPerNote: e / events.length / SR, peak: pk };
      }
      return out;
    });
    const ref = res.marimba.energyPerNote, tab = {};
    console.log("instrumento   energia/nota relativa à marimba   pico (ganho 1)   ajuste");
    for (const [k, v] of Object.entries(res)) {
      const g = Math.sqrt(ref / v.energyPerNote);
      tab[k] = Math.round(g * 100) / 100;
      console.log(`${k.padEnd(12)}  ${(10 * Math.log10(v.energyPerNote / ref)).toFixed(1).padStart(6)} dB   ${v.peak.toFixed(3).padStart(14)}   ${tab[k]}`);
    }
    console.log("\nINST_GAIN (relativo; multiplique por um ganho geral):\n" + JSON.stringify(tab));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
