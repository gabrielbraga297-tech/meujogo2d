// "playwright" de mentira para tests/music-render.test.js: um navegador que responde como o render.js espera (ids dos temas, uma renderização e os pedaços do áudio em base64),
// sem abrir navegador nenhum. Variáveis: FAKE_IDS (temas registrados, separados por vírgula), FAKE_HANG_ID (o tema que trava) e FAKE_HANG_LAUNCHES (em quais navegadores abertos,
// contados de 1, ele trava: o `evaluate` nunca responde), FAKE_LOG (arquivo onde cada abertura e cada tema renderizado é anotado).
const fs = require("fs");
const ids = (process.env.FAKE_IDS || "aa,bb,cc").split(",");
const hangId = process.env.FAKE_HANG_ID || "", hangLaunches = (process.env.FAKE_HANG_LAUNCHES || "").split(",").filter(Boolean).map(Number);
const log = (line) => { if (process.env.FAKE_LOG) fs.appendFileSync(process.env.FAKE_LOG, line + "\n"); };
const SECONDS = 2, SR = 44100;
let launches = 0;
const pcmFor = (n) => { const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.05 * Math.sin(2 * Math.PI * 440 * i / SR); return x; };
exports.chromium = {
  async launch() {
    const n = ++launches;
    log("launch " + n);
    let current = "";
    const page = {
      on() {}, async setContent() {}, async addScriptTag() {},
      async evaluate(fn, arg) {
        if (arg === undefined) return ids;
        if (arg.sr) { // a renderização de um tema
          current = arg.id;
          log(`render ${arg.id} no navegador ${n}`);
          if (arg.id === hangId && hangLaunches.includes(n)) return new Promise(() => {}); // trava para sempre
          const samples = Math.ceil((SECONDS + arg.tail) * arg.sr);
          return { id: arg.id, place: "Lugar " + arg.id, animal: "dog", key: "C", mode: "major", bpm: 120, beats: 4, bars: 4, lengthSeconds: SECONDS, barSeconds: 0.5, events: 10, polyphony: 3, maxSilence: 3, failed: 0, samples };
        }
        const total = Math.ceil((SECONDS + 4) * SR), x = pcmFor(total), d = x.subarray(arg.off, arg.off + arg.CH);
        return Buffer.from(d.buffer, d.byteOffset, d.byteLength).toString("base64");
      },
    };
    return { async newPage() { return page; }, async close() { log("close " + n); } };
  },
};
