// Confere, num OfflineAudioContext REAL do Chromium (Playwright), que o volume de cada música tema escala de forma linear: renderiza o tema duas vezes (ganho 1 e ganho 0,25) e compara.
// Se tudo no motor é linear, o render a ganho 1 é igual a 4 vezes o render a ganho 0,25 em TODAS as amostras. Uma amostra que não escala é um clique: por exemplo o ganho de uma nota
// que começa fora de 0 deixa passar a 1ª amostra da fonte inteira, e isso não muda com o volume (foi assim que se achou o clique do cat9, já consertado no motor: o ganho de cada nota nasce em 0).
// Uso:  node tools/music-render/scale.js [ids...] [--files a.js,b.js] [--tail s] [--json arquivo] [--resume] [--timeout s] [--out pasta]
//   sem ids: todos os temas registrados (js/music.js e, se existirem, js/music-dog.js, js/music-cat.js e js/music-bird.js); --files, --tail, --resume e --timeout como em render.js.
//   --json    arquivo do relatório (padrão: escala.json dentro de --out, a mesma pasta de render.js); regravado depois de cada tema.
// O que mede: quantas amostras têm resíduo |a - 4 b| acima de 0,01 (-40 dBFS; um clique menor que isso passa) e onde está a pior. NÃO mede se o tema "soa bem": só acha o que não escala.
// Sai com código 1 se algum tema tiver amostra fora de escala (ou não terminar). Variáveis: CHROMIUM_PATH, NODE_PATH (onde está o playwright), MUSIC_LOCK (ou PREVIEW_LOCK): arquivo de trava;
// se existir, o script se reexecuta sob `flock` nele, para vários processos não abrirem o navegador ao mesmo tempo (como render.js).
const path = require("path");
const fs = require("fs");
const R = require("./runner.js");

const locked = R.relaunchUnderLock(__filename, process.argv.slice(2), process.env);
if (locked !== null) process.exit(locked);

const A = require("./analyze.js");
const ROOT = path.join(__dirname, "../..");
const SR = R.SR, RATIO = 4, TOL = 0.01;
const pad = (s, n) => String(s).padEnd(n);

// O detector roda dentro da página: analyze.js (módulo de Node) é carregado lá como `window.__Analyze`, para a conta ser exatamente a testada em Node.
async function checkTheme(page, id, tail) {
  const t0 = Date.now();
  const res = await page.evaluate(async ({ id, sr, tail, ratio, tol }) => {
    const sc = Music.scoreOf(id), n = Math.ceil((sc.lengthSeconds + tail) * sr);
    const run = async (gain) => { const ctx = new OfflineAudioContext(1, n, sr); Music.render(sc, ctx, ctx.destination, 0, { gain }); return (await ctx.startRendering()).getChannelData(0); };
    const a = await run(1), b = await run(1 / ratio);
    return Object.assign({ id, lengthSeconds: sc.lengthSeconds }, window.__Analyze.scaleResidual(a, b, ratio, tol));
  }, { id, sr: SR, tail, ratio: RATIO, tol: TOL });
  return { ...res, fails: A.scaleFails(res, SR), ms: Date.now() - t0 };
}

(async () => {
  const parsed = R.parseArgs(process.argv.slice(2), { env: process.env, allowed: ["--out", "--files", "--tail", "--json", "--resume", "--timeout"] });
  if (parsed.error) { console.error(parsed.error); process.exit(2); }
  const opts = parsed.opts, jsonFile = opts.json || path.join(opts.out, "escala.json");
  const { chromium } = R.loadPlaywright(process.env);
  const scripts = [path.join(ROOT, "js/music.js")];
  const extra = opts.files ? opts.files.map((f) => path.resolve(f)) : ["music-dog.js", "music-cat.js", "music-bird.js"].map((f) => path.join(ROOT, "js", f)).filter((f) => fs.existsSync(f));
  scripts.push(...extra, R.pageScriptFor(path.join(__dirname, "analyze.js"), "__Analyze"));

  let bad = 0, session = null, ids = [];
  const onError = (t) => { bad++; console.log(t); };
  const open = async () => { session = await R.openPage(chromium, scripts, onError); };
  const reopen = async () => { const old = session; session = null; await R.closeBrowser(old && old.browser); await open(); };
  const fresh = new Map();
  let done = new Map();
  const save = (partial) => R.writeReportAtomic(jsonFile, { sampleRate: SR, ratio: RATIO, tolerance: TOL, partial, themes: R.orderRows(ids, fresh, done) });
  try {
    await open();
    const all = await session.page.evaluate(() => Music.ids());
    ids = opts.ids.length ? opts.ids : all;
    for (const id of ids) if (!all.includes(id)) { console.error(`tema desconhecido: ${id} (registrados: ${all.join(", ")})`); process.exit(2); }
    let todo = ids;
    if (opts.resume) {
      const plan = R.planResume(ids, R.readReport(jsonFile), SR);
      done = plan.done; todo = plan.todo;
      console.log(plan.note || `--resume: ${done.size} tema(s) já conferidos em ${jsonFile} (pulados); faltam ${todo.length}`);
    }
    console.log(`Conferindo ${todo.length} tema(s): cada um é renderizado com ganho 1 e 0,25 (${SR} Hz, mono) e a diferença a - ${RATIO} b não pode passar de ${TOL} em nenhuma amostra (tempo-limite de ${opts.timeout} s por tema)`);
    for (const id of todo) {
      const res = await R.runWithRetry({ label: id, timeoutMs: opts.timeout * 1000, run: () => checkTheme(session.page, id, opts.tail), recreate: reopen, log: (t) => console.log("  " + t) });
      const row = res.ok ? res.value : { id, fails: [`não terminou: ${res.error} (${res.attempts} tentativas)`], timedOut: res.timedOut };
      fresh.set(id, row);
      save(true);
      console.log(`  ${pad(id, 7)} ${res.ok ? `${row.samples} amostras, pico ${row.peak.toFixed(3)}, pior resíduo ${row.worst.toExponential(1)}` : "sem medida"}  ${row.fails.length ? "FALHOU" : "ok"}`);
    }
  } finally { await R.closeBrowser(session && session.browser); }

  const rows = R.orderRows(ids, fresh, done), failedRows = rows.filter((r) => r.fails.length);
  for (const r of failedRows) for (const f of r.fails) console.log(`FALHA ${r.id}: ${f}`);
  save(false);
  console.log(failedRows.length || bad ? `\n${failedRows.length} tema(s) com amostras que não escalam (ou sem medida)` : `\nTodos os ${rows.length} temas escalam com o volume (resíduo até ${TOL})`);
  process.exit(failedRows.length || bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
