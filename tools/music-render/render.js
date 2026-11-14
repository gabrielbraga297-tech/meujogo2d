// Renderiza as músicas tema num OfflineAudioContext REAL do Chromium (Playwright), mede e grava WAVs de 16 bits para ouvir.
// Uso:  node tools/music-render/render.js [ids...] [--out pasta] [--files a.js,b.js] [--tail s] [--loops n] [--no-wav] [--json arquivo] [--resume] [--timeout s]
//   sem ids: todos os temas registrados (js/music.js e, se existirem, js/music-dog.js, js/music-cat.js e js/music-bird.js).
//   --out     pasta dos WAVs e do relatorio.json (padrão: $MUSIC_OUT, ou musicas/wav ao lado do arquivo de trava $MUSIC_LOCK, ou a pasta temporária)
//   --files   scripts a carregar depois de js/music.js, no lugar dos js/music-*.js (separados por vírgula)
//   --tail    segundos de cauda depois do laço (padrão 4)
//   --loops   quantas vezes o laço (em regime, já com a cauda somada ao começo) vai no WAV; 1 = o laço mais a cauda como saiu do render
//   --json    arquivo do relatório (padrão: relatorio.json dentro de --out). É regravado depois de CADA tema, então uma interrupção não perde o que já foi medido
//   --resume  lê o relatório que já existe (o de --json, ou o de --out), pula os temas que já estão nele e continua; os WAVs desses temas ficam como estão
//   --timeout tempo-limite de cada tema, em segundos (padrão 180). Se estoura, o navegador é fechado e aberto de novo e o tema é tentado UMA vez mais;
//             se falha de novo, o tema vai para o relatório como falha (timedOut) e o script segue com os outros
// Cada tema é renderizado sozinho, com ganho 1 e sem o barramento do jogo (44100 Hz, mono): é o "tema puro" cujo nível as medidas abaixo conferem (no jogo ainda há o barramento
// de 0,45 e o volume mestre).
// Mede (tools/music-render/analyze.js): pico, RMS em dBFS, DC, maior silêncio, salto de nível na emenda do laço e clique na emenda.
// Sai com código 1 se algum limite falhar. Variáveis: CHROMIUM_PATH, NODE_PATH (onde está o playwright; MUSIC_PLAYWRIGHT aponta outro módulo no lugar dele, só para os testes), MUSIC_LOCK (ou PREVIEW_LOCK): arquivo de trava;
// se existir, o script se reexecuta sob `flock` nele, para vários processos não abrirem o navegador ao mesmo tempo.
const path = require("path");
const fs = require("fs");
const R = require("./runner.js");

const locked = R.relaunchUnderLock(__filename, process.argv.slice(2), process.env);
if (locked !== null) process.exit(locked);

const A = require("./analyze.js");
const ROOT = path.join(__dirname, "../..");
const SR = R.SR;

const pad = (s, n) => String(s).padEnd(n);
const num = (x, d) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

// Renderiza e mede um tema numa página já aberta; devolve a linha do relatório (os campos de `meta`, as medidas, `fails` e o nome do WAV).
async function renderTheme(page, id, opts) {
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
  return { ...meta, ...m, fails, wav: file ? path.basename(file) : null, ms: Date.now() - t0 };
}

(async () => {
  const parsed = R.parseArgs(process.argv.slice(2), { env: process.env, allowed: ["--out", "--files", "--tail", "--loops", "--no-wav", "--json", "--resume", "--timeout"] });
  if (parsed.error) { console.error(parsed.error); process.exit(2); }
  const opts = parsed.opts, jsonFile = R.reportPath(opts);
  const { chromium } = R.loadPlaywright(process.env);
  const scripts = [path.join(ROOT, "js/music.js")];
  const extra = opts.files ? opts.files.map((f) => path.resolve(f)) : ["music-dog.js", "music-cat.js", "music-bird.js"].map((f) => path.join(ROOT, "js", f)).filter((f) => fs.existsSync(f));
  scripts.push(...extra);
  fs.mkdirSync(opts.out, { recursive: true });

  let bad = 0, session = null;
  const onError = (t) => { bad++; console.log(t); };
  const open = async () => { session = await R.openPage(chromium, scripts, onError); };
  const reopen = async () => { const old = session; session = null; await R.closeBrowser(old && old.browser); await open(); };
  const fresh = new Map(); // linhas desta execução
  let done = new Map();    // linhas já medidas numa execução anterior (--resume)
  let ids = [];
  const save = (partial) => R.writeReportAtomic(jsonFile, { sampleRate: SR, limits: A.LIMITS, partial, themes: R.orderRows(ids, fresh, done) });
  try {
    await open();
    const all = await session.page.evaluate(() => Music.ids());
    ids = opts.ids.length ? opts.ids : all;
    for (const id of ids) if (!all.includes(id)) { console.error(`tema desconhecido: ${id} (registrados: ${all.join(", ")})`); process.exit(2); }
    let todo = ids;
    if (opts.resume) {
      const plan = R.planResume(ids, R.readReport(jsonFile), SR);
      done = plan.done; todo = plan.todo;
      console.log(plan.note || `--resume: ${done.size} tema(s) já medidos em ${jsonFile} (pulados); faltam ${todo.length}`);
    }
    console.log(`Renderizando ${todo.length} tema(s) em ${SR} Hz, mono, ganho 1 (arquivos: ${scripts.map((f) => path.basename(f)).join(", ")}; tempo-limite de ${opts.timeout} s por tema) -> ${opts.out}`);

    for (const id of todo) {
      const t0 = Date.now();
      const res = await R.runWithRetry({ label: id, timeoutMs: opts.timeout * 1000, run: () => renderTheme(session.page, id, opts), recreate: reopen, log: (t) => console.log("  " + t) });
      let row;
      if (res.ok) row = res.value;
      else row = { id, fails: [`não terminou: ${res.error} (${res.attempts} tentativas)`], timedOut: res.timedOut, wav: null };
      fresh.set(id, row);
      save(true); // o que já foi medido fica no arquivo mesmo que o resto trave
      if (res.ok) console.log(`  ${pad(id, 7)} ${num(row.lengthSeconds, 1)} s, ${row.events} notas, pico ${num(row.peak, 3)}, RMS ${num(row.rmsDb, 1)} dBFS  (${((Date.now() - t0) / 1000).toFixed(1)} s)  ${row.fails.length ? "FALHOU" : "ok"}`);
      else console.log(`  ${pad(id, 7)} FALHOU: ${row.fails[0]}`);
    }
  } finally { await R.closeBrowser(session && session.browser); }

  // tabela
  const rows = R.orderRows(ids, fresh, done), measured = rows.filter((r) => Number.isFinite(r.peak));
  console.log("\n" + [pad("tema", 7), pad("tom/modo", 15), pad("bpm", 4), pad("laço s", 7), pad("pico", 6), pad("pico dB", 8), pad("RMS dB", 7), pad("RMS>150Hz", 10), pad("DC", 8), pad("silêncio s", 11), pad("emenda dB", 10), pad("(outros)", 9), pad("clique", 7), pad("ganho sug.", 11), "resultado"].join(" "));
  for (const r of rows) {
    if (!Number.isFinite(r.peak)) { console.log(pad(r.id, 7) + " sem medida (FALHOU)"); continue; }
    console.log([pad(r.id, 7), pad(`${r.key} ${r.mode}`, 15), pad(r.bpm, 4), pad(num(r.lengthSeconds, 1), 7), pad(num(r.peak, 3), 6), pad(num(r.peakDb, 1), 8), pad(num(r.rmsDb, 1), 7), pad(num(r.rmsHPDb, 1), 10), pad(num(r.dc, 4), 8),
      pad(num(r.silence, 2), 11), pad(num(r.seamDb, 1), 10), pad(num(r.otherBarsDb, 1), 9), pad(num(r.click, 2), 7), pad(num(r.suggestedGain, 2), 11), r.fails.length ? "FALHOU" : "ok"].join(" "));
  }
  const rms = measured.map((r) => r.rmsDb);
  if (measured.length) console.log(`\nRMS entre os temas: de ${num(Math.min(...rms), 1)} a ${num(Math.max(...rms), 1)} dBFS (alvo ${A.LIMITS.rmsTargetDb} +- ${A.LIMITS.rmsTol}, do tema sozinho a ganho 1, sem o barramento do jogo); pico máximo ${num(Math.max(...measured.map((r) => r.peak)), 3)} (limite ${A.LIMITS.peak})`);
  const failedRows = rows.filter((r) => r.fails.length);
  for (const r of failedRows) for (const f of r.fails) console.log(`FALHA ${r.id}: ${f}`);
  save(false);
  console.log(failedRows.length || bad ? `\n${failedRows.length} tema(s) fora dos limites` : "\nTodos os temas dentro dos limites");
  process.exit(failedRows.length || bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
