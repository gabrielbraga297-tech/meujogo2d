// Testes das ferramentas de render das músicas (tools/music-render), sem navegador: argumentos, tempo-limite com nova tentativa, retomada do relatório, gravação do relatório a cada tema e o
// detector de ganhos que não escalam. O render.js roda de ponta a ponta contra um "playwright" de mentira (tests/fixtures/fake-modules/playwright) que sabe travar.
// Uso: node tests/music-render.test.js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const R = require("../tools/music-render/runner.js");
const A = require("../tools/music-render/analyze.js");

let failed = 0;
const queue = [];
function test(name, fn) { queue.push([name, fn]); }

test("parseArgs: ids, opções com valor, bandeiras e os padrões (--out vem de MUSIC_OUT, da trava ou da pasta temporária; tempo-limite de 180 s)", () => {
  const { opts } = R.parseArgs(["dog1", "cat2", "--tail", "2.5", "--loops", "3", "--no-wav", "--json", "x.json", "--resume", "--timeout", "30", "--files", "a.js,b.js"], { env: {}, tmpdir: "/tmp/t" });
  assert.deepStrictEqual(opts.ids, ["dog1", "cat2"]);
  assert.strictEqual(opts.tail, 2.5); assert.strictEqual(opts.loops, 3); assert.strictEqual(opts.wav, false); assert.strictEqual(opts.json, "x.json"); assert.strictEqual(opts.resume, true);
  assert.strictEqual(opts.timeout, 30); assert.deepStrictEqual(opts.files, ["a.js", "b.js"]);
  const d = R.parseArgs([], { env: {}, tmpdir: "/tmp/t" }).opts;
  assert.deepStrictEqual([d.tail, d.loops, d.wav, d.json, d.resume, d.timeout, d.files], [4, 1, true, null, false, 180, null]);
  assert.strictEqual(d.out, path.join("/tmp/t", "musicas", "wav"));
  assert.strictEqual(R.parseArgs([], { env: { MUSIC_OUT: "/o" } }).opts.out, "/o");
  assert.strictEqual(R.parseArgs([], { env: { MUSIC_LOCK: "/w/browser.lock" } }).opts.out, path.join("/w", "musicas", "wav"));
  assert.strictEqual(R.parseArgs(["--out", "/x"], { env: { MUSIC_OUT: "/o" } }).opts.out, "/x");
  assert.strictEqual(R.reportPath({ out: "/o", json: null }), path.join("/o", "relatorio.json")); assert.strictEqual(R.reportPath({ out: "/o", json: "/r.json" }), "/r.json");
});
test("parseArgs: opção desconhecida, valor que falta ou inválido e opção que a ferramenta não aceita viram erro em português (sem encerrar o programa)", () => {
  const err = (argv, allowed) => R.parseArgs(argv, { env: {}, allowed }).error;
  assert.match(err(["--foo"]), /opção desconhecida: --foo/);
  assert.match(err(["--tail"]), /falta o valor de --tail/); assert.match(err(["--out", "--resume"]), /falta o valor de --out/); assert.match(err(["--json", ""]), /falta o valor de --json/);
  assert.match(err(["--timeout", "0"]), /--timeout precisa de um número maior que 0/); assert.match(err(["--timeout", "abc"]), /--timeout/);
  assert.match(err(["--loops", "0"]), /inteiro/); assert.match(err(["--tail", "-1"]), /--tail precisa/);
  assert.match(err(["--loops", "2"], ["--out"]), /opção desconhecida: --loops/, "scale.js não aceita --loops");
});
test("planResume: pula os temas que já estão no relatório, refaz os que deram tempo-limite, ignora relatório ilegível ou de outra taxa de amostragem; mantém a ordem pedida", () => {
  const ids = ["a", "b", "c", "d"];
  const report = { sampleRate: 44100, themes: [{ id: "a", peak: 0.5 }, { id: "c", timedOut: true, fails: ["x"] }, { id: "zz", peak: 1 }, null, { id: "d", peak: 0.2 }] };
  const p = R.planResume(ids, report, 44100);
  assert.deepStrictEqual([...p.done.keys()], ["a", "d"]); assert.deepStrictEqual(p.todo, ["b", "c"]); assert.strictEqual(p.note, "");
  for (const bad of [null, {}, { themes: "x", sampleRate: 44100 }, 5]) { const q = R.planResume(ids, bad, 44100); assert.strictEqual(q.done.size, 0); assert.deepStrictEqual(q.todo, ids); assert.ok(q.note.length > 10); }
  const other = R.planResume(ids, { sampleRate: 48000, themes: [{ id: "a" }] }, 44100);
  assert.strictEqual(other.done.size, 0); assert.ok(/48000/.test(other.note));
  assert.deepStrictEqual(R.orderRows(["b", "a", "c"], new Map([["a", { id: "a" }]]), new Map([["b", { id: "b" }], ["a", { id: "velho" }]])).map((r) => r.id), ["b", "a"], "a linha nova vale mais que a antiga e quem não tem linha some");
});
test("writeReportAtomic: grava o relatório inteiro, cria a pasta e não deixa arquivo pela metade (o temporário some)", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mrender-")), file = path.join(dir, "sub", "r.json");
  R.writeReportAtomic(file, { sampleRate: 44100, themes: [{ id: "a" }] });
  assert.deepStrictEqual(R.readReport(file), { sampleRate: 44100, themes: [{ id: "a" }] });
  assert.ok(!fs.existsSync(file + ".tmp"));
  assert.strictEqual(R.readReport(path.join(dir, "nao-existe.json")), null);
  fs.writeFileSync(file, "{pela metade"); assert.strictEqual(R.readReport(file), null);
  fs.rmSync(dir, { recursive: true });
});
test("withTimeout: devolve o resultado a tempo, rejeita com TimeoutError (e mensagem clara) se estoura, repassa o erro da tarefa e limpa o relógio", async () => {
  assert.strictEqual(await R.withTimeout(Promise.resolve(7), 1000, "tarefa"), 7);
  await assert.rejects(R.withTimeout(new Promise(() => {}), 20, "bird8"), (e) => e.name === "TimeoutError" && /bird8 passou de 0.02 s sem terminar/.test(e.message));
  await assert.rejects(R.withTimeout(Promise.reject(new Error("falhou")), 1000, "x"), /falhou/);
  const cleared = [];
  await R.withTimeout(Promise.resolve(1), 50, "y", { set: (f, ms) => { return setTimeout(f, ms); }, clear: (h) => { cleared.push(h); clearTimeout(h); } });
  assert.strictEqual(cleared.length, 1, "o relógio foi limpo");
});
test("runWithRetry: trava na 1ª tentativa -> recria o navegador e a 2ª dá certo; trava nas duas -> ok:false com timedOut, sem lançar; erro comum também ganha uma nova tentativa", async () => {
  const logs = [];
  let recreated = 0;
  const base = { label: "bird8", timeoutMs: 30, recreate: async () => { recreated++; }, log: (t) => logs.push(t) };
  const a = await R.runWithRetry({ ...base, run: (k) => (k === 1 ? new Promise(() => {}) : Promise.resolve("pronto " + k)) });
  assert.deepStrictEqual([a.ok, a.value, a.attempts, recreated], [true, "pronto 2", 2, 1]);
  assert.ok(logs[0].includes("bird8") && logs[0].includes("não terminou em 0.03 s") && logs[0].includes("tentativa 2 de 2"), logs[0]);
  logs.length = 0; recreated = 0;
  const b = await R.runWithRetry({ ...base, run: () => new Promise(() => {}) });
  assert.deepStrictEqual([b.ok, b.timedOut, b.attempts, recreated], [false, true, 2, 2], "recria também depois da última falha, para os temas seguintes");
  assert.ok(/desisto deste tema depois de 2 tentativas/.test(logs[1]), logs[1]);
  recreated = 0;
  const c = await R.runWithRetry({ ...base, run: (k) => (k === 1 ? Promise.reject(new Error("Target closed\n  em ...")) : Promise.resolve("ok")) });
  assert.deepStrictEqual([c.ok, c.value], [true, "ok"]);
  const d = await R.runWithRetry({ ...base, run: () => Promise.reject(new Error("sempre")), attempts: 3 });
  assert.deepStrictEqual([d.ok, d.timedOut, d.attempts, d.error], [false, false, 3, "sempre"]);
  const e = await R.runWithRetry({ ...base, run: () => new Promise(() => {}), recreate: async () => { throw new Error("sem navegador"); } });
  assert.strictEqual(e.ok, false, "recreate que falha não derruba");
  assert.ok(logs.some((t) => t.includes("não consegui reabrir o navegador: sem navegador")));
});

// ---- render.js de ponta a ponta, contra o playwright de mentira ----
const RENDER = path.join(__dirname, "../tools/music-render/render.js"), FAKE_MODULES = path.join(__dirname, "fixtures/fake-modules");
function runRender(args, extraEnv) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mrender-"));
  const env = { ...process.env, MUSIC_PLAYWRIGHT: path.join(FAKE_MODULES, "playwright"), MUSIC_LOCK: "", PREVIEW_LOCK: "", MUSIC_OUT: "", FAKE_LOG: path.join(dir, "fake.log"), ...extraEnv };
  const run = (more, env2) => spawnSync(process.execPath, [RENDER, "--no-wav", "--tail", "1", "--json", path.join(dir, "r.json"), "--out", dir, ...args, ...(more || [])], { env: { ...env, ...env2 }, encoding: "utf8", timeout: 60000 });
  return { dir, env, run, log: () => (fs.existsSync(path.join(dir, "fake.log")) ? fs.readFileSync(path.join(dir, "fake.log"), "utf8").trim().split("\n") : []), report: () => R.readReport(path.join(dir, "r.json")) };
}
test("render.js sem travamento: mede os 3 temas do navegador de mentira, grava o relatório (partial:false) e avisa o nível a ganho 1 sem o barramento do jogo", () => {
  const t = runRender([]);
  const r = t.run();
  assert.ok(r.stdout.includes("Renderizando 3 tema(s)") && r.stdout.includes("tempo-limite de 180 s"), r.stdout + r.stderr);
  const rep = t.report();
  assert.strictEqual(rep.partial, false); assert.deepStrictEqual(rep.themes.map((x) => x.id), ["aa", "bb", "cc"]);
  assert.ok(rep.themes.every((x) => Number.isFinite(x.peak) && Number.isFinite(x.rmsDb)));
  assert.ok(/sem o barramento do jogo/.test(r.stdout));
  assert.deepStrictEqual(t.log().filter((l) => l.startsWith("launch")), ["launch 1"]);
  fs.rmSync(t.dir, { recursive: true });
});
test("render.js: um tema que trava na 1ª tentativa é tentado de novo num navegador novo (mensagem clara) e o relatório sai completo", () => {
  const t = runRender(["--timeout", "1"], { FAKE_HANG_ID: "bb", FAKE_HANG_LAUNCHES: "1" });
  const r = t.run();
  assert.ok(r.stdout.includes("bb: não terminou em 1 s (o navegador parece parado); abrindo o navegador de novo e tentando outra vez (tentativa 2 de 2)"), r.stdout);
  const rep = t.report();
  assert.deepStrictEqual(rep.themes.map((x) => [x.id, Number.isFinite(x.peak), !!x.timedOut]), [["aa", true, false], ["bb", true, false], ["cc", true, false]]);
  const log = t.log();
  assert.deepStrictEqual(log.filter((l) => l.startsWith("launch")), ["launch 1", "launch 2"]);
  assert.ok(log.includes("close 1"), "o navegador parado foi fechado");
  assert.ok(log.includes("render bb no navegador 1") && log.includes("render bb no navegador 2") && log.includes("render cc no navegador 2"));
  fs.rmSync(t.dir, { recursive: true });
});
test("render.js: se as duas tentativas travam, o tema vira falha (timedOut), o script segue com os outros, sai com código 1; --resume mede só o que faltou", () => {
  const t = runRender(["--timeout", "1"], { FAKE_HANG_ID: "bb", FAKE_HANG_LAUNCHES: "1,2" });
  const r = t.run();
  assert.strictEqual(r.status, 1, r.stdout + r.stderr);
  assert.ok(r.stdout.includes("desisto deste tema depois de 2 tentativas e sigo com os outros"));
  let rep = t.report();
  assert.deepStrictEqual(rep.themes.map((x) => [x.id, Number.isFinite(x.peak), !!x.timedOut]), [["aa", true, false], ["bb", false, true], ["cc", true, false]]);
  assert.ok(rep.themes[1].fails[0].includes("não terminou") && rep.themes[1].fails[0].includes("2 tentativas"));
  assert.deepStrictEqual(t.log().filter((l) => l.startsWith("render cc")), ["render cc no navegador 3"], "o tema seguinte roda num terceiro navegador, sadio");
  // segunda execução (agora sem travar nada): --resume pula aa e cc e refaz só o bb
  fs.writeFileSync(path.join(t.dir, "fake.log"), "");
  const r2 = t.run(["--resume"], { FAKE_HANG_LAUNCHES: "" });
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.ok(r2.stdout.includes("--resume: 2 tema(s) já medidos") && r2.stdout.includes("faltam 1") && r2.stdout.includes("Renderizando 1 tema(s)"), r2.stdout);
  assert.deepStrictEqual(t.log().filter((l) => l.startsWith("render")).map((l) => l.split(" ")[1]), ["bb"], "só o que faltou foi renderizado");
  rep = t.report();
  assert.deepStrictEqual(rep.themes.map((x) => [x.id, Number.isFinite(x.peak), !!x.timedOut]), [["aa", true, false], ["bb", true, false], ["cc", true, false]]);
  fs.rmSync(t.dir, { recursive: true });
});
test("render.js: o relatório é gravado depois de cada tema (partial:true) — se o programa é interrompido no meio (aqui: morto com o tema bb travado) o que já foi medido fica, e --resume continua dali", async () => {
  const { spawn } = require("child_process");
  const t = runRender(["--timeout", "120"], { FAKE_HANG_ID: "bb", FAKE_HANG_LAUNCHES: "1" });
  const file = path.join(t.dir, "r.json");
  const child = spawn(process.execPath, [RENDER, "--no-wav", "--tail", "1", "--json", file, "--out", t.dir, "--timeout", "120"], { env: t.env, stdio: "ignore" });
  const exited = new Promise((res) => child.on("exit", res));
  let rep = null;
  for (let i = 0; i < 400 && !(rep && rep.themes.length >= 1); i++) { await new Promise((r) => setTimeout(r, 50)); rep = R.readReport(file); }
  child.kill("SIGKILL"); await exited; // o tema bb está travado: não há como terminar sozinho
  rep = R.readReport(file);
  assert.ok(rep, "o arquivo existia e estava inteiro (nada pela metade) depois da interrupção");
  assert.strictEqual(rep.partial, true); assert.deepStrictEqual(rep.themes.map((x) => x.id), ["aa"]); assert.ok(Number.isFinite(rep.themes[0].peak));
  const r2 = t.run(["--resume"], { FAKE_HANG_LAUNCHES: "" }); // a nova execução não trava nada
  assert.strictEqual(r2.status, 0, r2.stdout + r2.stderr);
  assert.ok(r2.stdout.includes("--resume: 1 tema(s) já medidos") && r2.stdout.includes("faltam 2"), r2.stdout);
  const done = t.report();
  assert.strictEqual(done.partial, false); assert.deepStrictEqual(done.themes.map((x) => [x.id, Number.isFinite(x.peak)]), [["aa", true], ["bb", true], ["cc", true]]);
  fs.rmSync(t.dir, { recursive: true });
});
test("render.js: opção desconhecida ou inválida sai com código 2 e mensagem, sem abrir navegador", () => {
  const t = runRender([]);
  for (const [args, msg] of [[["--foo"], "opção desconhecida: --foo"], [["--timeout", "0"], "--timeout precisa"], [["--out"], "falta o valor de --out"]]) {
    const r = spawnSync(process.execPath, [RENDER, ...args], { env: t.env, encoding: "utf8", timeout: 30000 });
    assert.strictEqual(r.status, 2, args.join(" ")); assert.ok(r.stderr.includes(msg), r.stderr);
  }
  assert.deepStrictEqual(t.log(), [], "nenhum navegador aberto");
  fs.rmSync(t.dir, { recursive: true });
});

// ---- detector de ganhos que não escalam (tools/music-render/scale.js usa A.scaleResidual dentro da página) ----
test("scaleResidual: sinal que escala com o ganho dá resíduo zero; um clique que não escala (1 amostra) é achado com a posição e o tamanho; tolerância e razão são ajustáveis", () => {
  const n = 1000, a = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = 0.3 * Math.sin(i / 7); a[i] = v; b[i] = v * 0.25; }
  const ok = A.scaleResidual(a, b, 4, 0.01);
  assert.strictEqual(ok.bad, 0); assert.ok(ok.worst < 1e-6 && ok.samples === n && Math.abs(ok.peak - 0.3) < 1e-3 && ok.lengthMismatch === false);
  a[500] += 0.4; // um clique que o outro render não tem na mesma proporção
  const click = A.scaleResidual(a, b, 4, 0.01);
  assert.strictEqual(click.bad, 1); assert.strictEqual(click.at, 500); assert.ok(Math.abs(click.worst - 0.4) < 1e-6);
  assert.strictEqual(A.scaleResidual(a, b, 4, 0.5).bad, 0, "tolerância maior");
  assert.ok(A.scaleResidual(a, b, 2, 0.01).bad > 100, "razão errada: quase tudo falha");
  const short = A.scaleResidual(a, b.subarray(0, 10), 4, 0.01);
  assert.strictEqual(short.lengthMismatch, true);
  assert.deepStrictEqual(A.scaleFails(ok, 44100), []);
  const f = A.scaleFails(click, 1000);
  assert.strictEqual(f.length, 1); assert.ok(f[0].includes("1 amostra") && f[0].includes("0.400") && f[0].includes("0.500 s"), f[0]);
  assert.ok(A.scaleFails(short, 44100)[0].includes("tamanhos"));
});
test("pageScriptFor: o analyze.js embrulhado para a página entrega a mesma conta (window.__Analyze.scaleResidual) que o Node", () => {
  const vm = require("vm"), ctx = { window: {} };
  vm.runInNewContext(R.pageScriptFor(path.join(__dirname, "../tools/music-render/analyze.js"), "__Analyze").content, ctx);
  assert.deepStrictEqual(Object.keys(ctx.window.__Analyze).sort(), Object.keys(A).sort());
  const a = Float32Array.from([0, 0.4, 0.8]), b = Float32Array.from([0, 0.1, 0.1]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.window.__Analyze.scaleResidual(a, b, 4, 0.01))), JSON.parse(JSON.stringify(A.scaleResidual(a, b, 4, 0.01))));
});
const SCALE = path.join(__dirname, "../tools/music-render/scale.js");
function runScale(args, extraEnv) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mscale-"));
  const env = { ...process.env, MUSIC_PLAYWRIGHT: path.join(FAKE_MODULES, "playwright"), MUSIC_LOCK: "", PREVIEW_LOCK: "", MUSIC_OUT: "", FAKE_LOG: path.join(dir, "fake.log"), ...extraEnv };
  const r = spawnSync(process.execPath, [SCALE, "--json", path.join(dir, "e.json"), "--out", dir, ...args], { env, encoding: "utf8", timeout: 60000 });
  return { dir, r, report: R.readReport(path.join(dir, "e.json")) };
}
test("scale.js contra o navegador de mentira: tudo escala -> código 0 e relatório; um clique em bb -> código 1 com o tema, a amostra e o segundo; um tema que trava é tentado de novo", () => {
  const ok = runScale([]);
  assert.strictEqual(ok.r.status, 0, ok.r.stdout + ok.r.stderr);
  assert.ok(ok.r.stdout.includes("ganho 1 e 0,25") && /Todos os 3 temas escalam/.test(ok.r.stdout), ok.r.stdout);
  assert.deepStrictEqual(ok.report.themes.map((x) => [x.id, x.bad, x.fails.length]), [["aa", 0, 0], ["bb", 0, 0], ["cc", 0, 0]]);
  assert.strictEqual(ok.report.partial, false); assert.strictEqual(ok.report.ratio, 4); assert.strictEqual(ok.report.tolerance, 0.01);
  const click = runScale([], { FAKE_CLICK_ID: "bb" });
  assert.strictEqual(click.r.status, 1, click.r.stdout);
  assert.ok(click.r.stdout.includes("FALHA bb: 1 amostra(s) que não escalam com o volume (a pior: resíduo 0.400 em 0.028 s)"), click.r.stdout);
  assert.deepStrictEqual(click.report.themes.map((x) => x.fails.length), [0, 1, 0]);
  const hang = runScale(["--timeout", "1"], { FAKE_HANG_ID: "cc", FAKE_HANG_LAUNCHES: "1" });
  assert.strictEqual(hang.r.status, 0, hang.r.stdout + hang.r.stderr);
  assert.ok(hang.r.stdout.includes("cc: não terminou em 1 s") && hang.report.themes.length === 3);
  assert.strictEqual(runScale(["--loops", "2"]).r.status, 2, "scale.js não aceita --loops");
  for (const x of [ok, click, hang]) fs.rmSync(x.dir, { recursive: true });
});

(async () => {
  for (const [name, fn] of queue) {
    try { await fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 6).join("\n     ") : e)); }
  }
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes das ferramentas de render passaram");
  process.exit(failed ? 1 : 0);
})();
