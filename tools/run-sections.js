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

// Seções que NÃO são comparáveis fora do Chromium (conferido em 06/11/2026 no Firefox 155): comparam hashes de pixels tirados no Chromium (cada motor desenha com o seu antialiasing), usam o protocolo do Chrome (CDP)
// ou dependem de a IA dos rastreadores e gaviões andar exatamente igual (a precisão de Math.hypot/atan2 muda de um motor para outro e, em 10 s de jogo, 3 de 12 fases testadas já divergem). O executor as lista à parte
// ("diferença esperada de motor") e só conta como falha as demais.
const ENGINE_DIFFERENCES = [
  ["0.18.0 · Gatinho: desenho e ambientes", "hashes de pixels do Cachorrinho tirados no Chromium"],
  ["0.18.0 · Gatinho: sons e skins", "os pedidos de som das cenas dependem do andar dos inimigos"],
  ["0.18.0 · Gatinho: correções da auditoria 3", "usa o protocolo do Chrome (CDP) para simular toque"],
  ["0.19.0 · skins dos objetos do Cachorrinho: com todas as categorias no padrão", "hashes de pixels tirados no Chromium"],
  ["0.19.0 · Skins do Gatinho: com TODAS as categorias no padrão", "hashes de pixels tirados no Chromium"],
  ["0.19.0 · Skins do Gatinho: as skins do Gatinho não aparecem no Cachorrinho", "hashes de pixels tirados no Chromium"],
  ["0.20.0 · Passarinho (integração): robô", "o resultado do robô depende do andar dos gaviões"],
  ["0.20.0 · Skins do Passarinho: as skins do Passarinho não aparecem no Cachorrinho", "hashes de pixels tirados no Chromium"],
];
const engineNote = (title) => (process.env.BROWSER && process.env.BROWSER !== "chromium" ? (ENGINE_DIFFERENCES.find(([t]) => title.startsWith(t)) || [])[1] : undefined);

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
const failed = rows.filter((r) => r.fail || r.exit !== 0), expected = failed.filter((r) => engineNote(r.title)), bad = failed.filter((r) => !engineNote(r.title));
console.log(`\n${rows.length} de ${all.length} seções registradas; ${rows.reduce((s, r) => s + r.ok, 0)} verificações ok; ${bad.length} seção(ões) com falha${expected.length ? ` e ${expected.length} com diferença esperada de motor` : ""}`);
for (const r of expected) console.log(`~ diferença esperada de motor: ${r.title.slice(0, 100)} (${engineNote(r.title)})`);
for (const r of bad) { console.log(`- ${r.title.slice(0, 120)} (saída ${r.exit}, ${r.fail} falha(s))`); for (const f of r.fails) console.log("    " + f); }
process.exit(bad.length ? 1 : 0);
