// Testes unitários do módulo de recordes (sem navegador). Uso: node tests/records.test.js
const assert = require("assert");
const R = require("../js/records.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
const memStorage = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m };
};

test("sanitizeName aceita nomes de cachorrinho (acentos, hífen, espaço)", () => {
  assert.strictEqual(R.sanitizeName("Totó"), "Totó");
  assert.strictEqual(R.sanitizeName("  Mel   Bela "), "Mel Bela");
  assert.strictEqual(R.sanitizeName("Rex-2"), "Rex-2");
});
test("sanitizeName remove símbolos/HTML, limita a 16 e rejeita vazio", () => {
  assert.strictEqual(R.sanitizeName("<b>Rex</b>"), "bRexb");
  assert.strictEqual(R.sanitizeName("A".repeat(40)).length, 16);
  assert.strictEqual(R.sanitizeName("   "), "");
  assert.strictEqual(R.sanitizeName("!!!"), "");
  assert.strictEqual(R.sanitizeName("---"), "");
  assert.strictEqual(R.sanitizeName(null), "");
  assert.strictEqual(R.sanitizeName(42), "");
});
test("nameKey ignora acento e caixa", () => {
  assert.strictEqual(R.nameKey("Totó"), R.nameKey("toto"));
  assert.strictEqual(R.nameKey("TOTÓ"), R.nameKey("Toto"));
  assert.notStrictEqual(R.nameKey("Totó"), R.nameKey("Tata"));
});
test("formatTime", () => {
  assert.strictEqual(R.formatTime(18432), "18,4 s");
  assert.strictEqual(R.formatTime(940), "0,9 s");
  assert.strictEqual(R.formatTime(950), "1,0 s");
  assert.strictEqual(R.formatTime(65300), "1:05,3");
  assert.strictEqual(R.formatTime(600000), "10:00,0");
  assert.strictEqual(R.formatTime(NaN), "—");
  assert.strictEqual(R.formatTime(-5), "—");
});
test("setPlayer salva e sobrevive a recarregar", () => {
  const st = memStorage();
  const a = R.createStore(st);
  assert.strictEqual(a.setPlayer(" Totó "), "Totó");
  const b = R.createStore(st);
  assert.strictEqual(b.player(), "Totó");
  assert.deepStrictEqual(b.players(), ["Totó"]);
});
test("setPlayer inválido devolve vazio e não troca o jogador", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("Rex");
  assert.strictEqual(s.setPlayer("???"), "");
  assert.strictEqual(s.player(), "Rex");
});
test("mesmo jogador com outra grafia reaproveita o nome guardado", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("Totó");
  assert.strictEqual(s.setPlayer("toto"), "Totó");
  assert.strictEqual(s.players().length, 1);
});
test("addRun: primeiro tempo é recorde pessoal e geral", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  const r = s.addRun({ level: 1, timeMs: 20000 });
  assert.ok(r.first && r.newPersonal && r.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 20000);
});
test("addRun: tempo pior não bate recorde; melhor bate", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  s.addRun({ level: 1, timeMs: 20000 });
  const worse = s.addRun({ level: 1, timeMs: 25000 });
  assert.ok(!worse.first && !worse.newPersonal && !worse.newGeneral);
  const better = s.addRun({ level: 1, timeMs: 15000 });
  assert.ok(better.newPersonal && better.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 15000);
  assert.strictEqual(s.history("Totó", 1).length, 3);
});
test("empate não é novo recorde", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  s.addRun({ level: 1, timeMs: 20000 });
  const r = s.addRun({ level: 1, timeMs: 20000 });
  assert.ok(!r.newPersonal && !r.newGeneral);
});
test("recorde geral considera todos os jogadores; pessoal só o do jogador", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("Totó"); s.addRun({ level: 1, timeMs: 20000 });
  s.setPlayer("Rex"); const r = s.addRun({ level: 1, timeMs: 18000 });
  assert.ok(r.first && r.newGeneral);
  assert.strictEqual(s.generalBest(1).n, "Rex");
  s.setPlayer("Totó");
  const t = s.addRun({ level: 1, timeMs: 19000 });
  assert.ok(t.newPersonal && !t.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 19000);
  assert.strictEqual(s.generalBest(1).t, 18000);
});
test("histórico e recordes são separados por fase", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  s.addRun({ level: 1, timeMs: 20000 }); s.addRun({ level: 2, timeMs: 30000 });
  assert.strictEqual(s.history("Totó", 1).length, 1);
  assert.strictEqual(s.personalBest("Totó", 2).t, 30000);
  assert.strictEqual(s.generalBest(3), null);
});
test("history: mais recentes primeiro e respeita limite", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  [1000, 2000, 3000, 4000].forEach((t) => s.addRun({ level: 1, timeMs: t }));
  assert.deepStrictEqual(s.history("Totó", 1, 2).map((r) => r.t), [4000, 3000]);
});
test("ranking: melhor tempo de cada jogador, do mais rápido ao mais lento", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); s.addRun({ level: 1, timeMs: 30000 }); s.addRun({ level: 1, timeMs: 25000 });
  s.setPlayer("B"); s.addRun({ level: 1, timeMs: 20000 });
  s.setPlayer("C"); s.addRun({ level: 1, timeMs: 40000 });
  assert.deepStrictEqual(s.ranking(1).map((r) => r.n + ":" + r.t), ["B:20000", "A:25000", "C:40000"]);
  assert.strictEqual(s.ranking(1, 2).length, 2);
});
test("addRun rejeita dados inválidos", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  assert.strictEqual(s.addRun({ level: 1, timeMs: 0 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: -4 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: NaN }), null);
  assert.strictEqual(s.addRun({ level: 0, timeMs: 1000 }), null);
  assert.strictEqual(s.addRun({ level: 1.5, timeMs: 1000 }), null);
  assert.strictEqual(R.createStore(memStorage()).addRun({ level: 1, timeMs: 1000 }), null, "sem jogador");
});
test("dados persistem entre sessões", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó"); a.addRun({ level: 1, timeMs: 12345 });
  const b = R.createStore(st);
  assert.strictEqual(b.personalBest("Totó", 1).t, 12345);
  assert.strictEqual(b.generalBest(1).n, "Totó");
});
test("JSON corrompido ou com lixo não quebra", () => {
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "{not json" })));
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "null" })));
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "123" })));
  const bad = JSON.stringify({ player: 5, players: "x", runs: [null, 1, { n: "A", l: 1, t: -1, w: 1 }, { n: "<>", l: 1, t: 5, w: 1 }, { n: "Ok", l: 1, t: 1500.4, w: 2 }] });
  const s = R.createStore(memStorage({ "cachorrinho.v1": bad }));
  assert.strictEqual(s.player(), "");
  assert.strictEqual(s.generalBest(1).t, 1500);
  assert.strictEqual(s.ranking(1).length, 1);
});
test("sem armazenamento (null) funciona só em memória", () => {
  const s = R.createStore(null);
  assert.strictEqual(s.persistent, false);
  s.setPlayer("Totó"); s.addRun({ level: 1, timeMs: 9000 });
  assert.strictEqual(s.personalBest("Totó", 1).t, 9000);
});
test("armazenamento que lança erro (modo privado/cheio) não derruba", () => {
  const boom = { getItem() { throw new Error("x"); }, setItem() { throw new Error("quota"); }, removeItem() {} };
  const s = R.createStore(boom);
  assert.strictEqual(s.persistent, false);
  assert.doesNotThrow(() => { s.setPlayer("Totó"); s.addRun({ level: 1, timeMs: 5000 }); });
});
test("falha de gravação depois de iniciar vira modo memória sem perder dados", () => {
  const st = memStorage(); let fail = false;
  const flaky = { getItem: st.getItem, removeItem: st.removeItem, setItem(k, v) { if (fail && k === "cachorrinho.v1") throw new Error("quota"); st.setItem(k, v); } };
  const s = R.createStore(flaky); s.setPlayer("Totó");
  fail = true;
  assert.doesNotThrow(() => s.addRun({ level: 1, timeMs: 7000 }));
  assert.strictEqual(s.persistent, false);
  assert.strictEqual(s.personalBest("Totó", 1).t, 7000);
});
test("limite de histórico nunca apaga os recordes", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  s.addRun({ level: 1, timeMs: 1000 }); // melhor tempo, o mais antigo
  for (let i = 0; i < R.MAX_RUNS + 50; i++) s.addRun({ level: 1, timeMs: 5000 + i });
  assert.strictEqual(s.history("Totó", 1).length, R.MAX_RUNS);
  assert.strictEqual(s.personalBest("Totó", 1).t, 1000);
  assert.strictEqual(s.generalBest(1).t, 1000);
});
test("lista de jogadores lembrados tem limite e o mais recente vem primeiro", () => {
  const s = R.createStore(memStorage());
  for (let i = 0; i < 20; i++) s.setPlayer("Cao" + i);
  assert.strictEqual(s.players().length, 12);
  assert.strictEqual(s.players()[0], "Cao19");
});

test("progresso: começa na fase 1, concluir libera a próxima e persiste", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó");
  assert.deepStrictEqual(a.progress("Totó"), { unlocked: 1, completed: [] });
  assert.deepStrictEqual(a.completeLevel("Totó", 1), { unlocked: 2, completed: [1] });
  a.completeLevel("toto", 1); // repetir não duplica
  assert.deepStrictEqual(a.progress("Totó"), { unlocked: 2, completed: [1] });
  a.completeLevel("Totó", 3);
  assert.deepStrictEqual(R.createStore(st).progress("TOTÓ"), { unlocked: 4, completed: [1, 3] });
  assert.deepStrictEqual(a.progress("Rex"), { unlocked: 1, completed: [] }, "outro jogador não herda");
});
test("completeLevel rejeita fase inválida", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  assert.strictEqual(s.completeLevel("Totó", 0), null);
  assert.strictEqual(s.completeLevel("Totó", 1.5), null);
  assert.strictEqual(s.completeLevel("???", 1), null);
});
test("jogo salvo: salvar, carregar, limpar e persistir", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó");
  assert.strictEqual(a.hasGame("Totó"), false);
  assert.strictEqual(a.saveGame("Totó", { l: 1, time: 12.5, lives: 2 }), true);
  assert.ok(a.hasGame("toto"));
  const b = R.createStore(st);
  const g = b.loadGame("Totó");
  assert.deepStrictEqual(g.snap, { l: 1, time: 12.5, lives: 2 });
  assert.ok(Number.isFinite(g.savedAt));
  b.clearGame("Totó");
  assert.strictEqual(R.createStore(st).hasGame("Totó"), false);
});
test("jogo salvo é separado por jogador e não mexe nos recordes", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("Totó"); s.saveGame("Totó", { a: 1 });
  s.setPlayer("Rex"); s.saveGame("Rex", { a: 2 });
  assert.strictEqual(s.loadGame("Totó").snap.a, 1);
  assert.strictEqual(s.loadGame("Rex").snap.a, 2);
  s.addRun({ level: 1, timeMs: 9000 });
  assert.strictEqual(s.loadGame("Rex").snap.a, 2);
});
test("saveGame rejeita lixo e snapshots enormes; loadGame devolve cópia", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  assert.strictEqual(s.saveGame("Totó", null), false);
  assert.strictEqual(s.saveGame("Totó", "x"), false);
  assert.strictEqual(s.saveGame("Totó", { big: "x".repeat(30000) }), false);
  assert.strictEqual(s.saveGame("???", { a: 1 }), false);
  const circ = {}; circ.self = circ;
  assert.strictEqual(s.saveGame("Totó", circ), false);
  s.saveGame("Totó", { a: { b: 1 } });
  const g = s.loadGame("Totó"); g.snap.a.b = 99;
  assert.strictEqual(s.loadGame("Totó").snap.a.b, 1);
});
test("save corrompido ou com lixo é ignorado", () => {
  const mk = (v) => R.createStore(memStorage({ "cachorrinho.save.v1": v }));
  assert.doesNotThrow(() => mk("{oops"));
  assert.strictEqual(mk("null").hasGame("a"), false);
  assert.strictEqual(mk(JSON.stringify({ saves: { toto: { t: "x", snap: {} } } })).hasGame("toto"), false);
  assert.strictEqual(mk(JSON.stringify({ saves: { toto: { t: 5, snap: "str" } } })).hasGame("toto"), false);
  assert.strictEqual(mk(JSON.stringify({ saves: { toto: { t: 5, snap: { ok: 1 } } } })).hasGame("toto"), true);
});
test("progresso corrompido não quebra", () => {
  const bad = JSON.stringify({ player: "A", progress: { a: { completed: "x" }, b: null, c: { completed: [1, "2", -3, 2] } } });
  const s = R.createStore(memStorage({ "cachorrinho.v1": bad }));
  assert.deepStrictEqual(s.progress("c"), { unlocked: 3, completed: [1, 2] });
  assert.deepStrictEqual(s.progress("a"), { unlocked: 1, completed: [] });
});
test("falha ao gravar o save vira memória sem perder o jogo atual", () => {
  const st = memStorage(); let fail = false;
  const flaky = { getItem: st.getItem, removeItem: st.removeItem, setItem(k, v) { if (fail && k.includes("save")) throw new Error("quota"); st.setItem(k, v); } };
  const s = R.createStore(flaky); s.setPlayer("Totó");
  fail = true;
  assert.strictEqual(s.saveGame("Totó", { a: 1 }), false);
  assert.strictEqual(s.persistent, false);
  assert.strictEqual(s.loadGame("Totó").snap.a, 1);
});
test("limite de saves: guarda no máximo um por jogador lembrado", () => {
  const s = R.createStore(memStorage());
  for (let i = 0; i < 20; i++) { s.setPlayer("Cao" + i); s.saveGame("Cao" + i, { i }); }
  let n = 0; for (let i = 0; i < 20; i++) if (s.hasGame("Cao" + i)) n++;
  assert.ok(n <= 12, "mais saves que jogadores lembrados: " + n);
  assert.ok(s.hasGame("Cao19"));
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
process.exit(failed ? 1 : 0);
