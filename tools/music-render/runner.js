// Ajudas das ferramentas de render (tools/music-render/render.js e scale.js): argumentos, tempo-limite com nova tentativa, retomada de um relatório parcial,
// gravação do relatório a cada tema e abertura do navegador. Tudo o que não precisa do navegador é testado em Node (tests/music-render.test.js).
// Por que existe: um render real de 61 temas já travou no meio, sem erro nenhum, com o Chromium parado; sem tempo-limite o script esperava para sempre e o que já tinha sido medido se perdia.
//   - cada tema roda com um tempo-limite (padrão 180 s); se estoura, o navegador é fechado e aberto de novo e o tema é tentado UMA vez mais (2 tentativas no total);
//   - se as duas tentativas falham, o tema entra no relatório como falha (`timedOut: true`) e o script segue com os outros;
//   - o relatório (.json) é regravado depois de cada tema, então um travamento ou uma interrupção não perde o que já foi medido;
//   - `--resume` lê o relatório que já existe, pula os temas que estão nele (menos os que deram tempo-limite) e continua.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SR = 44100;
const DEFAULT_TIMEOUT_S = 180;
const ATTEMPTS = 2;

// Opções de linha de comando. `allowed` diz quais opções a ferramenta aceita. Devolve { opts } ou { error } (nunca encerra o programa: quem chama decide).
//   ids (sem opção), --out pasta, --files a.js,b.js, --tail s, --loops n, --no-wav, --json arquivo, --resume, --timeout s
const OPTION_KINDS = { "--out": "text", "--files": "text", "--tail": "number", "--loops": "integer", "--no-wav": "flag", "--json": "text", "--resume": "flag", "--timeout": "number" };
function lockOf(env) { return (env && (env.MUSIC_LOCK || env.PREVIEW_LOCK)) || ""; }
function parseArgs(argv, o) {
  o = o || {};
  const env = o.env || {}, tmp = o.tmpdir || os.tmpdir(), allowed = o.allowed || Object.keys(OPTION_KINDS);
  const opts = { ids: [], out: null, files: null, tail: 4, loops: 1, wav: true, json: null, resume: false, timeout: DEFAULT_TIMEOUT_S };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { opts.ids.push(a); continue; }
    const kind = OPTION_KINDS[a];
    if (!kind || !allowed.includes(a)) return { error: "opção desconhecida: " + a };
    if (kind === "flag") { if (a === "--no-wav") opts.wav = false; else if (a === "--resume") opts.resume = true; continue; }
    const raw = argv[++i];
    if (raw === undefined || raw === "" || raw.startsWith("--")) return { error: `falta o valor de ${a}` };
    if (kind === "text") {
      if (a === "--out") opts.out = raw; else if (a === "--json") opts.json = raw; else opts.files = raw.split(",").filter(Boolean);
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || (kind === "integer" ? n < 1 : a === "--tail" ? n < 0 : n <= 0)) return { error: `${a} precisa de um número ${kind === "integer" ? "inteiro de 1 em diante" : a === "--tail" ? "de 0 em diante" : "maior que 0"} (veio "${raw}")` };
      if (a === "--tail") opts.tail = n; else if (a === "--loops") opts.loops = Math.round(n); else opts.timeout = n;
    }
  }
  if (!opts.out) { const lock = lockOf(env); opts.out = env.MUSIC_OUT || (lock ? path.join(path.dirname(path.resolve(lock)), "musicas", "wav") : path.join(tmp, "musicas", "wav")); }
  return { opts };
}
// onde o relatório é gravado (e lido pelo --resume)
function reportPath(opts) { return opts.json || path.join(opts.out, "relatorio.json"); }

// ----- retomada -----
function readReport(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; } }
// Dado o relatório de uma execução anterior, separa os temas já medidos dos que faltam. Um tema que deu tempo-limite antes (`timedOut`) não conta como medido: é tentado de novo.
// Devolve { done: Map(id -> linha do relatório), todo: [ids que faltam, na ordem pedida], note: texto para o usuário (vazio se tudo certo) }.
function planResume(ids, report, sampleRate) {
  const done = new Map();
  if (!report || typeof report !== "object" || !Array.isArray(report.themes)) return { done, todo: ids.slice(), note: "não há relatório anterior legível: renderizando tudo" };
  if (report.sampleRate !== sampleRate) return { done, todo: ids.slice(), note: `o relatório anterior é de ${report.sampleRate} Hz e este render é de ${sampleRate} Hz: renderizando tudo de novo` };
  for (const t of report.themes) if (t && typeof t.id === "string" && ids.includes(t.id) && !t.timedOut && !done.has(t.id)) done.set(t.id, t);
  return { done, todo: ids.filter((id) => !done.has(id)), note: "" };
}
// As linhas do relatório na ordem pedida (as já medidas e as novas juntas)
function orderRows(ids, ...maps) {
  const rows = [];
  for (const id of ids) for (const m of maps) if (m.has(id)) { rows.push(m.get(id)); break; }
  return rows;
}
// Grava o relatório por inteiro, sem deixar um arquivo pela metade se o programa for interrompido no meio (grava ao lado e renomeia)
function writeReportAtomic(file, report) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(report, null, 1));
  fs.renameSync(tmp, file);
}

// ----- tempo-limite e nova tentativa -----
function withTimeout(promise, ms, label, timers) {
  const t = timers || { set: setTimeout, clear: clearTimeout };
  let handle;
  const timer = new Promise((_, reject) => {
    handle = t.set(() => { const e = new Error(`${label} passou de ${ms / 1000} s sem terminar`); e.name = "TimeoutError"; reject(e); }, ms);
  });
  return Promise.race([promise, timer]).finally(() => t.clear(handle));
}
// Roda `run(tentativa)` com tempo-limite; se estoura ou dá erro, chama `recreate()` (fecha e reabre o navegador) e tenta de novo, até `attempts` vezes (padrão 2: UMA nova tentativa).
// `recreate` também roda depois da última falha, para os temas seguintes terem um navegador sadio. Devolve { ok: true, value, attempts } ou { ok: false, timedOut, error, attempts }; nunca lança.
async function runWithRetry(o) {
  const attempts = o.attempts || ATTEMPTS, log = o.log || (() => {});
  let last = null;
  for (let k = 1; k <= attempts; k++) {
    try { return { ok: true, value: await withTimeout(o.run(k), o.timeoutMs, o.label, o.timers), attempts: k }; } catch (e) {
      last = e;
      const timed = !!e && e.name === "TimeoutError";
      log(`${o.label}: ${timed ? `não terminou em ${o.timeoutMs / 1000} s (o navegador parece parado)` : "erro: " + String((e && e.message) || e).split("\n")[0]}; ` +
        (k < attempts ? `abrindo o navegador de novo e tentando outra vez (tentativa ${k + 1} de ${attempts})` : `desisto deste tema depois de ${attempts} tentativas e sigo com os outros`));
      try { await o.recreate(); } catch (e2) { log(`${o.label}: não consegui reabrir o navegador: ${String((e2 && e2.message) || e2).split("\n")[0]}`); }
    }
  }
  return { ok: false, timedOut: !!last && last.name === "TimeoutError", error: String((last && last.message) || last), attempts };
}

// ----- navegador (precisa do playwright; não é testado em Node) -----
// Se existir o arquivo de trava (MUSIC_LOCK ou PREVIEW_LOCK), roda de novo o mesmo script sob `flock` nele, para vários processos não abrirem o navegador ao mesmo tempo.
// Devolve o código de saída do processo filho, ou null se não precisa (sem trava, ou já está sob a trava).
function relaunchUnderLock(file, argv, env) {
  const lock = lockOf(env);
  if (!lock || env.MUSIC_LOCKED) return null;
  const r = spawnSync("flock", [lock, process.execPath, file, ...argv], { stdio: "inherit", env: { ...env, MUSIC_LOCKED: "1" } });
  return r.status === null ? 1 : r.status;
}
// O módulo do Playwright. MUSIC_PLAYWRIGHT (caminho de outro módulo) o substitui: serve para os testes de Node usarem um navegador de mentira (tests/fixtures/fake-modules/playwright).
function loadPlaywright(env) { return require((env && env.MUSIC_PLAYWRIGHT) || "playwright"); }
// Abre um navegador com uma página em branco e carrega os `scripts` (caminhos de arquivos) nela. `onError(texto)` é chamado a cada erro da página ou do console.
async function openPage(chromium, scripts, onError) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => onError("ERRO DE PÁGINA: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") onError("ERRO NO CONSOLE: " + m.text()); });
    await page.setContent("<!doctype html><meta charset=utf-8><title>render</title>");
    for (const f of scripts) await page.addScriptTag(typeof f === "string" ? { path: f } : f);
    return { browser, page };
  } catch (e) { try { await browser.close(); } catch { /* ignora */ } throw e; }
}
// Fecha o navegador sem esperar para sempre: se ele não fecha em `ms`, segue em frente (o processo do Chromium termina junto com este programa)
async function closeBrowser(browser, ms) {
  if (!browser) return;
  try { await withTimeout(browser.close(), ms || 10000, "fechar o navegador"); } catch { /* parado: segue */ }
}

module.exports = { SR, DEFAULT_TIMEOUT_S, ATTEMPTS, parseArgs, reportPath, readReport, planResume, orderRows, writeReportAtomic, withTimeout, runWithRetry, relaunchUnderLock, loadPlaywright, openPage, closeBrowser };
