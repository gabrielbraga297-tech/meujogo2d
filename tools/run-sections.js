// Roda a suíte do navegador (tests/e2e.js) UMA SEÇÃO POR VEZ e guarda o resultado de cada uma num arquivo de linhas JSON.
// Serve para: (1) retomar de onde parou se a máquina reiniciar no meio (--resume pula as seções já registradas); (2) saber exatamente QUAL seção falha em outro navegador;
// (3) repetir só as que falharam (--redo-failed).
// Uso:  node tools/run-sections.js --out resultado.jsonl [--resume] [--redo-failed] [--lock arquivo-de-trava] [--only trecho] [--list]
//   Variáveis: BROWSER=firefox|webkit (padrão chromium), PLAYWRIGHT_BROWSERS_PATH, NODE_PATH, CHROMIUM_PATH: as mesmas do tests/e2e.js.
//   --lock    cada seção roda sob `flock arquivo` (um navegador por vez na máquina)
//   --only    só as seções cujo título contém este texto
//   --list    só imprime os títulos que achou
// O título de cada seção é lido dos arquivos tests/e2e*.js (as chamadas `await section("...")`); o tests/e2e.js recebe o título como filtro e, com SECTION_EXACT=1 (que este script define), roda só a seção de título idêntico.
// Termina com código 1 se alguma seção registrada tiver falha. Não toca em nenhum arquivo do jogo.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

function titles() {
  const out = [];
  for (const f of fs.readdirSync(path.join(ROOT, "tests")).filter((x) => /^e2e.*\.js$/.test(x)).sort((a, b) => (a === "e2e.js" ? -1 : b === "e2e.js" ? 1 : a.localeCompare(b)))) {
    const src = fs.readFileSync(path.join(ROOT, "tests", f), "utf8");
    for (const m of src.matchAll(/await section\(\s*"((?:[^"\\]|\\.)*)"/g)) {
      let t; try { t = JSON.parse('"' + m[1] + '"'); } catch { t = m[1]; }
      if (!out.includes(t)) out.push(t);
    }
  }
  return out;
}

const all = titles().filter((t) => !val("--only") || t.includes(val("--only")));
if (flag("--list")) { console.log(all.join("\n")); console.log(`\n${all.length} seção(ões)`); process.exit(0); }

const outFile = val("--out");
if (!outFile) { console.error("falta --out arquivo.jsonl"); process.exit(2); }
const lock = val("--lock");
const done = new Map();
if (fs.existsSync(outFile)) {
  for (const line of fs.readFileSync(outFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); done.set(r.title, r); } catch { /* linha quebrada por um reinício: a seção é refeita */ }
  }
}

function runOne(title) {
  const cmd = lock ? "flock" : process.execPath;
  const a = lock ? [lock, process.execPath, "tests/e2e.js", title] : ["tests/e2e.js", title];
  const t0 = Date.now();
  const r = spawnSync(cmd, a, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 25 * 60 * 1000, env: { ...process.env, SECTION_EXACT: "1" } });
  const text = (r.stdout || "") + (r.stderr || "");
  const lines = text.split("\n");
  const fails = lines.filter((l) => /^FAIL/.test(l)).map((l) => l.slice(0, 300));
  return {
    title, ok: lines.filter((l) => /^OK/.test(l)).length, fail: fails.length, exit: r.status === null ? "timeout" : r.status,
    secs: Math.round((Date.now() - t0) / 100) / 10, jsErrors: (text.match(/erros JS: (\[.*\])/) || [])[1] || "?", fails: fails.slice(0, 6),
    engine: process.env.BROWSER || "chromium",
  };
}

let n = 0;
for (const t of all) {
  n++;
  const prev = done.get(t);
  if (prev && (flag("--resume") || flag("--redo-failed")) && !(flag("--redo-failed") && (prev.fail || prev.exit !== 0))) continue;
  const r = runOne(t);
  done.set(t, r);
  fs.appendFileSync(outFile, JSON.stringify(r) + "\n");
  console.log(`[${n}/${all.length}] ${r.fail || r.exit !== 0 ? "FALHA" : "ok   "} ${String(r.ok).padStart(4)} ok ${r.secs}s  ${t.slice(0, 110)}`);
}

const rows = all.map((t) => done.get(t)).filter(Boolean);
const bad = rows.filter((r) => r.fail || r.exit !== 0);
console.log(`\n${rows.length} de ${all.length} seções registradas; ${rows.reduce((s, r) => s + r.ok, 0)} verificações ok; ${bad.length} seção(ões) com falha`);
for (const r of bad) { console.log(`- ${r.title.slice(0, 120)} (saída ${r.exit}, ${r.fail} falha(s))`); for (const f of r.fails) console.log("    " + f); }
process.exit(bad.length ? 1 : 0);
