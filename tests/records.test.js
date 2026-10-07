// Testes unitários do módulo de recordes (sem navegador). Uso: node tests/records.test.js
const assert = require("assert");
const R = require("../js/records.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
// pontuação de uma fase concluída: 5 rações (500) + bônus de tempo, a menos que o teste defina `points`
const add = (store, level, timeMs, points) => store.addRun({ level, timeMs, points: points ?? 500 + R.timeBonus(timeMs) });
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
test("addRun: primeira pontuação é recorde pessoal e geral", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  const r = add(s, 1, 20000);
  assert.ok(r.first && r.newPersonal && r.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 20000);
});
test("addRun: pontuação pior não bate recorde; melhor bate", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 20000);
  const worse = add(s, 1, 25000);
  assert.ok(!worse.first && !worse.newPersonal && !worse.newGeneral);
  const better = add(s, 1, 15000);
  assert.ok(better.newPersonal && better.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 15000);
  assert.strictEqual(s.history("Totó", 1).length, 3);
});
test("empate não é novo recorde", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 20000);
  const r = add(s, 1, 20000);
  assert.ok(!r.newPersonal && !r.newGeneral);
});
test("recorde geral considera todos os jogadores; pessoal só o do jogador", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("Totó"); add(s, 1, 20000);
  s.setPlayer("Rex"); const r = add(s, 1, 18000);
  assert.ok(r.first && r.newGeneral);
  assert.strictEqual(s.generalBest(1).n, "Rex");
  s.setPlayer("Totó");
  const t = add(s, 1, 19000);
  assert.ok(t.newPersonal && !t.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).t, 19000);
  assert.strictEqual(s.generalBest(1).t, 18000);
});
test("histórico e recordes são separados por fase", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 20000); add(s, 2, 30000);
  assert.strictEqual(s.history("Totó", 1).length, 1);
  assert.strictEqual(s.personalBest("Totó", 2).t, 30000);
  assert.strictEqual(s.generalBest(3), null);
});
test("history: mais recentes primeiro e respeita limite", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  [1000, 2000, 3000, 4000].forEach((t) => add(s, 1, t));
  assert.deepStrictEqual(s.history("Totó", 1, 2).map((r) => r.t), [4000, 3000]);
});
test("ranking: melhor tempo de cada jogador, do mais rápido ao mais lento", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); add(s, 1, 30000); add(s, 1, 25000);
  s.setPlayer("B"); add(s, 1, 20000);
  s.setPlayer("C"); add(s, 1, 40000);
  assert.deepStrictEqual(s.ranking(1).map((r) => r.n + ":" + r.t), ["B:20000", "A:25000", "C:40000"]);
  assert.strictEqual(s.ranking(1, 2).length, 2);
});
test("addRun rejeita dados inválidos", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  assert.strictEqual(add(s, 1, 0), null);
  assert.strictEqual(add(s, 1, -4), null);
  assert.strictEqual(add(s, 1, NaN), null);
  assert.strictEqual(add(s, 0, 1000), null);
  assert.strictEqual(add(s, 1.5, 1000), null);
  assert.strictEqual(R.createStore(memStorage()).addRun({ level: 1, timeMs: 1000, points: 600 }), null, "sem jogador");
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000 }), null, "sem pontuação");
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: -1 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: 1.5 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: "600" }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: 1e9 }), null);
});
test("dados persistem entre sessões", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó"); add(a, 1, 12345);
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
  s.setPlayer("Totó"); add(s, 1, 9000);
  assert.strictEqual(s.personalBest("Totó", 1).t, 9000);
});
test("armazenamento que lança erro (modo privado/cheio) não derruba", () => {
  const boom = { getItem() { throw new Error("x"); }, setItem() { throw new Error("quota"); }, removeItem() {} };
  const s = R.createStore(boom);
  assert.strictEqual(s.persistent, false);
  assert.doesNotThrow(() => { s.setPlayer("Totó"); add(s, 1, 5000); });
});
test("falha de gravação depois de iniciar vira modo memória sem perder dados", () => {
  const st = memStorage(); let fail = false;
  const flaky = { getItem: st.getItem, removeItem: st.removeItem, setItem(k, v) { if (fail && k === "cachorrinho.v1") throw new Error("quota"); st.setItem(k, v); } };
  const s = R.createStore(flaky); s.setPlayer("Totó");
  fail = true;
  assert.doesNotThrow(() => add(s, 1, 7000));
  assert.strictEqual(s.persistent, false);
  assert.strictEqual(s.personalBest("Totó", 1).t, 7000);
});
test("limite de histórico nunca apaga os recordes", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 1000); // melhor tempo, o mais antigo
  for (let i = 0; i < R.MAX_RUNS + 50; i++) add(s, 1, 5000 + i);
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
  add(s, 1, 9000);
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

test("bônus de tempo: até 20 s = 100; cada 10 s a mais tira 10; mínimo 0", () => {
  const table = [[0, 100], [10000, 100], [19999, 100], [20000, 100], [20001, 90], [25000, 90], [30000, 90], [30001, 80], [40000, 80], [40001, 70],
    [50000, 70], [60000, 60], [70000, 50], [80000, 40], [90000, 30], [100000, 20], [110000, 10], [110001, 0], [120000, 0], [3600000, 0]];
  for (const [ms, pts] of table) assert.strictEqual(R.timeBonus(ms), pts, `${ms} ms`);
  assert.strictEqual(R.timeBonus(NaN), 0);
  assert.strictEqual(R.timeBonus(-5), 0);
  assert.strictEqual(R.timeBonus(Infinity), 0);
  assert.strictEqual(R.BONUS_MAX, 100);
});
test("bônus de tempo: só múltiplos de 10 entre 0 e 100 e nunca aumenta com o tempo", () => {
  let prev = 101;
  for (let ms = 0; ms <= 200000; ms += 100) {
    const b = R.timeBonus(ms);
    assert.ok(b % 10 === 0 && b >= 0 && b <= 100 && b <= prev, `${ms} ms -> ${b}`);
    prev = b;
  }
});
test("mesma fase NÃO soma: duas partidas de 590 continuam valendo 590", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000);              // 500 + 90 = 590
  add(s, 1, 28000);              // 590 de novo
  assert.strictEqual(s.personalBest("Totó", 1).p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590, "não pode virar 1180");
  assert.strictEqual(s.history("Totó", 1).length, 2, "o histórico guarda as duas");
});
test("mesma fase: vale a MAIOR pontuação (a pior depois não derruba a melhor)", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000);              // 590
  const worse = add(s, 1, 55000); // 500 + 60 = 560
  assert.strictEqual(worse.run.p, 560);
  assert.ok(!worse.newPersonal && worse.gained === 0);
  assert.strictEqual(worse.personalBest.p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590);
  const best = add(s, 1, 15000);  // 600
  assert.ok(best.newPersonal && best.gained === 10 && best.previousPersonal.p === 590);
  assert.strictEqual(s.totalScore("Totó"), 600, "a total acompanha a maior (590 → 600), sem somar");
});
test("fases diferentes SOMAM a melhor pontuação de cada uma", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000);              // 590
  add(s, 1, 15000);              // 600 (melhor da fase 1)
  add(s, 2, 45000);              // 500 + 70 = 570
  add(s, 2, 15000, 650);         // 650 (melhor da fase 2)
  add(s, 3, 90000);              // 500 + 30 = 530
  assert.strictEqual(s.totalScore("Totó"), 600 + 650 + 530);
  assert.strictEqual(s.totalScore("Totó", [1, 2]), 1250, "levels limita as fases que contam");
  assert.strictEqual(s.totalScore("Totó", [9]), 0);
  assert.strictEqual(s.totalScore("Rex"), 0);
});
test("empate de pontuação: o menor tempo é o melhor; pontuação maior vence tempo menor", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 28000);               // 590 em 28 s
  const faster = add(s, 1, 22000); // 590 em 22 s
  assert.ok(faster.newPersonal && faster.gained === 0, "mesma pontuação, mais rápido: novo recorde, mas o total não muda");
  assert.strictEqual(s.personalBest("Totó", 1).t, 22000);
  add(s, 1, 50000, 700);          // pontuação maior, tempo pior
  assert.strictEqual(s.personalBest("Totó", 1).p, 700);
  assert.strictEqual(s.totalScore("Totó"), 700);
});
test("recorde geral e ranking por pontuação, com o tempo no desempate", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); add(s, 1, 35000);   // 80+500 = 580
  s.setPlayer("B"); add(s, 1, 25000);   // 590
  s.setPlayer("C"); add(s, 1, 21000);   // 590, mais rápido que B
  s.setPlayer("D"); add(s, 1, 10000);   // 600
  assert.deepStrictEqual(s.ranking(1).map((r) => r.n + ":" + r.p), ["D:600", "C:590", "B:590", "A:580"]);
  assert.strictEqual(s.generalBest(1).n, "D");
  const r = (s.setPlayer("A"), add(s, 1, 9000)); // A vai para 600 em 9 s: mesma pontuação de D, porém mais rápido
  assert.ok(r.newGeneral);
  assert.strictEqual(s.generalBest(1).n, "A");
});
test("ranking geral por pontuação total (soma das melhores de cada fase)", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); add(s, 1, 10000); add(s, 2, 10000);   // 600 + 600
  s.setPlayer("B"); add(s, 1, 10000); add(s, 1, 10000);   // 600 (repetir não soma)
  s.setPlayer("C"); add(s, 2, 70000);                      // 500 + 50 = 550
  assert.deepStrictEqual(s.totalRanking(5).map((x) => x.n + ":" + x.total), ["A:1200", "B:600", "C:550"]);
  assert.deepStrictEqual(s.totalRanking(5, [1]).map((x) => x.n + ":" + x.total), ["A:600", "B:600"]);
});
test("partidas antigas (só com tempo) ganham pontuação equivalente ao carregar", () => {
  const old = JSON.stringify({ player: "Totó", players: ["Totó"], runs: [{ n: "Totó", l: 1, t: 25000, w: 1 }, { n: "Totó", l: 1, t: 90000, w: 2 }] });
  const s = R.createStore(memStorage({ "cachorrinho.v1": old }));
  assert.strictEqual(s.personalBest("Totó", 1).p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590);
});
test("pontuação inválida guardada é descartada ao carregar", () => {
  const bad = JSON.stringify({ runs: [{ n: "A", l: 1, t: 25000, p: -5, w: 1 }, { n: "B", l: 1, t: 25000, p: "x", w: 1 }, { n: "C", l: 1, t: 25000, p: 1e9, w: 1 }, { n: "D", l: 1, t: 25000, p: 590, w: 1 }] });
  const s = R.createStore(memStorage({ "cachorrinho.v1": bad }));
  assert.deepStrictEqual(s.ranking(1).map((r) => r.n), ["D"]);
});
test("nomes que coincidem com propriedades de objeto (constructor, toString) funcionam", () => {
  const st = memStorage();
  const s = R.createStore(st);
  for (const nm of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
    assert.strictEqual(s.setPlayer(nm), nm);
    assert.deepStrictEqual(s.progress(nm), { unlocked: 1, completed: [] });
    assert.strictEqual(s.hasGame(nm), false);
    assert.strictEqual(s.loadGame(nm), null);
    add(s, 1, 25000);
    s.completeLevel(nm, 1);
    assert.strictEqual(s.saveGame(nm, { a: 1 }), true);
    assert.strictEqual(s.loadGame(nm).snap.a, 1);
    assert.strictEqual(s.totalScore(nm), 590);
    assert.deepStrictEqual(s.progress(nm), { unlocked: 2, completed: [1] });
    s.clearGame(nm);
    assert.strictEqual(s.hasGame(nm), false);
  }
  const again = R.createStore(st);
  assert.deepStrictEqual(again.progress("constructor"), { unlocked: 2, completed: [1] });
  assert.strictEqual(again.hasGame("constructor"), false);
});

test("levelPoints: 100 por ração + bônus de tempo − 50 por vida perdida, mínimo 0", () => {
  assert.strictEqual(R.levelPoints(5, 18000, 0), 600);
  assert.strictEqual(R.levelPoints(5, 25000, 0), 590);
  assert.strictEqual(R.levelPoints(5, 25000, 1), 540);
  assert.strictEqual(R.levelPoints(5, 25000, 2), 490);
  assert.strictEqual(R.levelPoints(5, 18000, 4), 400);
  assert.strictEqual(R.levelPoints(5, 999999, 0), 500, "sem bônus, só as rações");
  assert.strictEqual(R.levelPoints(0, 999999, 3), 0, "nunca fica negativa");
  assert.strictEqual(R.levelPoints(1, 999999, 10), 0);
  assert.strictEqual(R.levelPoints(5, 25000, -3), 590, "vidas perdidas inválidas valem 0");
  assert.strictEqual(R.levelPoints(5.5, 25000, 0), 90, "rações inválidas valem 0");
  assert.strictEqual(R.LIFE_PENALTY, 50);
  assert.strictEqual(R.RATION_POINTS, 100);
});
test("pontuação com perdas de vida alimenta recordes e total normalmente", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  s.addRun({ level: 1, timeMs: 25000, points: R.levelPoints(5, 25000, 2) });   // 490
  s.addRun({ level: 1, timeMs: 30000, points: R.levelPoints(5, 30000, 0) });   // 590
  s.addRun({ level: 1, timeMs: 15000, points: R.levelPoints(5, 15000, 1) });   // 550
  assert.strictEqual(s.personalBest("Totó", 1).p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590);
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
process.exit(failed ? 1 : 0);
