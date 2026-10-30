// Renderiza as músicas tema num OfflineAudioContext REAL do Chromium (Playwright), mede e grava WAVs de 16 bits para ouvir.
// Uso:  node tools/music-render/render.js [ids...] [--out pasta] [--files a.js,b.js] [--tail s] [--loops n] [--no-wav] [--json arquivo]
//   sem ids: todos os temas registrados (js/music.js e, se existirem, js/music-dog.js, js/music-cat.js e js/music-bird.js).
//   --out    pasta dos WAVs e do relatorio.json (padrão: $MUSIC_OUT, ou musicas-a6/wav ao lado do arquivo de trava $MUSIC_LOCK, ou a pasta temporária)
//   --files  scripts a carregar depois de js/music.js, no lugar dos js/music-*.js (separados por vírgula)
//   --tail   segundos de cauda depois do laço (padrão 4)
//   --loops  quantas vezes o laço (em regime, já com a cauda somada ao começo) vai no WAV; 1 = o laço mais a cauda como saiu do render
// Cada tema é renderizado sozinho, com ganho 1 e sem o barramento do jogo (44100 Hz, mono): é o "tema puro" que as medidas de A6-DESIGN.md pedem.
// Mede (tools/music-render/analyze.js): pico, RMS em dBFS, DC, maior silêncio, salto de nível na emenda do laço e clique na emenda.
// Sai com código 1 se algum limite falhar. Variáveis: CHROMIUM_PATH, NODE_PATH (onde está o playwright), MUSIC_LOCK (ou PREVIEW_LOCK): arquivo de trava;
// se existir, o script se reexecuta sob `flock` nele, para vários agentes não abrirem o navegador ao mesmo tempo.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");

const LOCK = process.env.MUSIC_LOCK || process.env.PREVIEW_LOCK;
if (LOCK && !process.env.MUSIC_LOCKED) {
  const r = spawnSync("flock", [LOCK, process.execPath, __filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, MUSIC_LOCKED: "1" } });
  process.exit(r.status === null ? 1 : r.status);
}

const A = require("./analyze.js");
const ROOT = path.join(__dirname, "../..");
const SR = 44100;

function parseArgs(argv) {
  const o = { ids: [], out: null, files: null, tail: 4, loops: 1, wav: true, json: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") o.out = argv[++i];
    else if (a === "--files") o.files = argv[++i].split(",").filter(Boolean);
    else if (a === "--tail") o.tail = Number(argv[++i]);
    else if (a === "--loops") o.loops = Math.max(1, Math.round(Number(argv[++i])));
    else if (a === "--no-wav") o.wav = false;
    else if (a === "--json") o.json = argv[++i];
    else if (a.startsWith("--")) { console.error("opção desconhecida: " + a); process.exit(2); }
    else o.ids.push(a);
  }
  if (!o.out) o.out = process.env.MUSIC_OUT || (LOCK ? path.join(path.dirname(path.resolve(LOCK)), "musicas-a6", "wav") : path.join(os.tmpdir(), "musicas-a6", "wav"));
  return o;
}
const pad = (s, n) => String(s).padEnd(n);
const num = (x, d) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

(async () => {
  const opts = parseArgs(process.argv.slice(2));
  const { chromium } = require("playwright");
  const scripts = [path.join(ROOT, "js/music.js")];
  const extra = opts.files ? opts.files.map((f) => path.resolve(f)) : ["music-dog.js", "music-cat.js", "music-bird.js"].map((f) => path.join(ROOT, "js", f)).filter((f) => fs.existsSync(f));
  scripts.push(...extra);
  fs.mkdirSync(opts.out, { recursive: true });

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  let bad = 0;
  const rows = [];
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => { bad++; console.log("ERRO DE PÁGINA:", e.message); });
    page.on("console", (m) => { if (m.type() === "error") { bad++; console.log("ERRO NO CONSOLE:", m.text()); } });
    await page.setContent("<!doctype html><meta charset=utf-8><title>render</title>");
    for (const f of scripts) await page.addScriptTag({ path: f });
    const all = await page.evaluate(() => Music.ids());
    const ids = opts.ids.length ? opts.ids : all;
    for (const id of ids) if (!all.includes(id)) { console.error(`tema desconhecido: ${id} (registrados: ${all.join(", ")})`); process.exit(2); }
    console.log(`Renderizando ${ids.length} tema(s) em ${SR} Hz, mono, ganho 1 (arquivos: ${scripts.map((f) => path.basename(f)).join(", ")}) -> ${opts.out}`);

    for (const id of ids) {
      const t0 = Date.now();
      const meta = await page.evaluate(async ({ id, sr, tail }) => {
        const sc = Music.scoreOf(id);
        const ctx = new OfflineAudioContext(1, Math.ceil((sc.lengthSeconds + tail) * sr), sr);
        const r = Music.render(sc, ctx, ctx.destination, 0);
        const buf = await ctx.startRendering();
        window.__pcm = buf.getChannelData(0);
        const rec = Music.get(id);
        return { id, place: rec.place || "", animal: rec.animal || "", key: sc.key, mode: sc.mode, bpm: sc.bpm, beats: sc.beats, bars: sc.bars, lengthSeconds: sc.lengthSeconds,
          barSeconds: sc.barBeats * 60 / sc.bpm, events: sc.events.length, polyphony: sc.stats.maxPolyphony, maxSilence: sc.maxSilence, failed: r.failed, samples: window.__pcm.length };
      }, { id, sr: SR, tail: opts.tail });
      // traz o áudio em pedaços de 1 Mi amostras (base64), para não estourar o limite de uma mensagem
      const CH = 1 << 20, parts = [];
      for (let off = 0; off < meta.samples; off += CH) {
        const b64 = await page.evaluate(({ off, CH }) => {
          const d = window.__pcm.subarray(off, off + CH), u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
          let s = "";
          for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
          return btoa(s);
        }, { off, CH });
        parts.push(Buffer.from(b64, "base64"));
      }
      const raw = Buffer.concat(parts), x = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
      const L = Math.round(meta.lengthSeconds * SR), loop = A.fold(x, L);
      const m = A.analyze(loop, SR, { barSeconds: meta.barSeconds });
      const fails = A.check(m, { maxSilence: meta.maxSilence });
      if (meta.failed) fails.push(`${meta.failed} nota(s) recusadas pelo navegador`);
      if (meta.polyphony > 14) fails.push(`${meta.polyphony} vozes ao mesmo tempo`);
      let file = "";
      if (opts.wav) {
        let pcm = x;
        if (opts.loops > 1) { pcm = new Float32Array(L * opts.loops); for (let k = 0; k < opts.loops; k++) pcm.set(loop, k * L); }
        file = path.join(opts.out, id + ".wav");
        fs.writeFileSync(file, A.wav16(pcm, SR));
      }
      rows.push({ meta, m, fails, file, ms: Date.now() - t0 });
      console.log(`  ${pad(id, 7)} ${num(meta.lengthSeconds, 1)} s, ${meta.events} notas, pico ${num(m.peak, 3)}, RMS ${num(m.rmsDb, 1)} dBFS  (${((Date.now() - t0) / 1000).toFixed(1)} s)  ${fails.length ? "FALHOU" : "ok"}`);
    }
  } finally { await browser.close(); }

  // tabela
  console.log("\n" + [pad("tema", 7), pad("tom/modo", 15), pad("bpm", 4), pad("laço s", 7), pad("pico", 6), pad("pico dB", 8), pad("RMS dB", 7), pad("RMS>150Hz", 10), pad("DC", 8), pad("silêncio s", 11), pad("emenda dB", 10), pad("(outros)", 9), pad("clique", 7), pad("ganho sug.", 11), "resultado"].join(" "));
  for (const r of rows) {
    const { meta: e, m } = r;
    console.log([pad(e.id, 7), pad(`${e.key} ${e.mode}`, 15), pad(e.bpm, 4), pad(num(e.lengthSeconds, 1), 7), pad(num(m.peak, 3), 6), pad(num(m.peakDb, 1), 8), pad(num(m.rmsDb, 1), 7), pad(num(m.rmsHPDb, 1), 10), pad(num(m.dc, 4), 8),
      pad(num(m.silence, 2), 11), pad(num(m.seamDb, 1), 10), pad(num(m.otherBarsDb, 1), 9), pad(num(m.click, 2), 7), pad(num(m.suggestedGain, 2), 11), r.fails.length ? "FALHOU" : "ok"].join(" "));
  }
  const rms = rows.map((r) => r.m.rmsDb);
  if (rows.length) console.log(`\nRMS entre os temas: de ${num(Math.min(...rms), 1)} a ${num(Math.max(...rms), 1)} dBFS (alvo ${A.LIMITS.rmsTargetDb} +- ${A.LIMITS.rmsTol}); pico máximo ${num(Math.max(...rows.map((r) => r.m.peak)), 3)} (limite ${A.LIMITS.peak})`);
  const failedRows = rows.filter((r) => r.fails.length);
  for (const r of failedRows) for (const f of r.fails) console.log(`FALHA ${r.meta.id}: ${f}`);
  const report = { sampleRate: SR, limits: A.LIMITS, themes: rows.map((r) => ({ ...r.meta, ...r.m, fails: r.fails, wav: r.file ? path.basename(r.file) : null })) };
  fs.writeFileSync(opts.json || path.join(opts.out, "relatorio.json"), JSON.stringify(report, null, 1));
  console.log(failedRows.length || bad ? `\n${failedRows.length} tema(s) fora dos limites` : "\nTodos os temas dentro dos limites");
  process.exit(failedRows.length || bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
