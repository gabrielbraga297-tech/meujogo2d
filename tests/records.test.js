// Testes unitários do módulo de recordes (sem navegador). Uso: node tests/records.test.js
const assert = require("assert");
const R = require("../js/records.js");

let failed = 0;
const pending = []; // testes assíncronos: o resultado só conta depois que terminam
function test(name, fn) {
  const fail = (e) => { failed++; console.log("FAIL " + name + "\n     " + (e && e.message)); };
  try {
    const r = fn();
    if (r && typeof r.then === "function") pending.push(r.then(() => console.log("OK   " + name), fail));
    else console.log("OK   " + name);
  } catch (e) { fail(e); }
}
// pontuação de uma fase concluída: 5 rações + bônus de tempo, a menos que o teste defina `points`
const add = (store, level, timeMs, points) => store.addRun({ level, timeMs, points: points ?? R.levelPoints(5, timeMs, 0, 0) });
const memStorage = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m };
};

// ---------- nomes e tempo ----------
test("sanitizeName aceita nomes de cachorrinho (acentos, hífen, espaço)", () => {
  assert.strictEqual(R.sanitizeName("Totó"), "Totó");
  assert.strictEqual(R.sanitizeName("  Mel   Bela "), "Mel Bela");
  assert.strictEqual(R.sanitizeName("Rex-2"), "Rex-2");
});
test("nomes: apóstrofo tipográfico, espaço não separável e acento decomposto são arrumados (não descartados)", () => {
  assert.strictEqual(R.sanitizeName("D\u2019\u00c1vila"), "D'\u00c1vila");
  assert.strictEqual(R.sanitizeName("Sant\u2019Anna"), "Sant'Anna");
  assert.strictEqual(R.sanitizeName("Ana\u00a0Maria"), "Ana Maria");
  assert.strictEqual(R.sanitizeName("Joa\u0303o"), "Jo\u00e3o", "o ã decomposto vira o composto");
  assert.ok(R.isValidName("D\u2019\u00c1vila") && R.isValidName("Ana\u00a0Maria") && R.isValidName("Joa\u0303o"));
  assert.strictEqual(R.nameKey("D\u2019Avila"), R.nameKey("d'avila"), "mesma chave com os dois apóstrofos");
  assert.strictEqual(R.nameKey("Tot\u00f3 "), R.nameKey("toto"), "espaço no fim não muda a chave");
  assert.ok(!R.isValidName("Rex!") && !R.isValidName("<b>"), "o que precisaria ser consertado de verdade continua recusado");
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

// ---------- bônus de tempo (proporcional: 10 pontos para cada 10 segundos, de 0 a 100) ----------
test("bônus de tempo: até 20 s = 100; cada 10 s a mais tira 10 pontos; 0 acima de 110 s", () => {
  const table = [[0, 100], [10000, 100], [19999, 100], [20000, 100], [20001, 90], [25000, 90], [30000, 90], [30001, 80], [40000, 80], [40001, 70],
    [50000, 70], [60000, 60], [70000, 50], [80000, 40], [90000, 30], [100000, 20], [110000, 10], [110001, 0], [120000, 0], [3600000, 0]];
  for (const [ms, pts] of table) assert.strictEqual(R.timeBonus(ms), pts, `${ms} ms`);
  assert.strictEqual(R.timeBonus(NaN), 0);
  assert.strictEqual(R.timeBonus(-5), 0);
  assert.strictEqual(R.timeBonus(Infinity), 0);
  assert.strictEqual(R.BONUS_MAX, 100);
});
test("bônus de tempo: quanto menos tempo, mais pontos (nunca aumenta com o tempo), só múltiplos de 10 de 0 a 100", () => {
  let prev = 101;
  for (let ms = 0; ms <= 200000; ms += 100) {
    const b = R.timeBonus(ms);
    assert.ok(b % 10 === 0 && b >= 0 && b <= 100 && b <= prev, `${ms} ms -> ${b}`);
    prev = b;
  }
  assert.ok(R.timeBonus(15000) > R.timeBonus(45000) && R.timeBonus(45000) > R.timeBonus(95000), "mais rápido = mais pontos");
  for (const [fast, slow] of [[25000, 35000], [40000, 50000], [90000, 100000]]) assert.strictEqual(R.timeBonus(fast) - R.timeBonus(slow), 10, "10 s a mais = 10 pontos a menos");
});

// ---------- pontuação da fase ----------
test("levelPoints: 100 por ração + bônus − 50 por vida perdida − 100 por nova tentativa", () => {
  assert.strictEqual(R.levelPoints(5, 18000, 0, 0), 600);
  assert.strictEqual(R.levelPoints(5, 25000, 0, 0), 590);
  assert.strictEqual(R.levelPoints(5, 25000, 1, 0), 540);
  assert.strictEqual(R.levelPoints(5, 25000, 2, 0), 490);
  assert.strictEqual(R.levelPoints(5, 25000, 0, 1), 490, "uma nova tentativa custa 100");
  assert.strictEqual(R.levelPoints(5, 25000, 0, 3), 290);
  assert.strictEqual(R.levelPoints(5, 25000, 2, 3), 190, "perdas de vida e tentativas somam");
  assert.strictEqual(R.levelPoints(5, 999999, 0, 0), 500, "sem bônus, só as rações");
});
test("levelPoints: a pontuação PODE ficar negativa", () => {
  assert.strictEqual(R.levelPoints(0, 999999, 1, 0), -50, "perder uma vida sem ter pegado nada: −50");
  assert.strictEqual(R.levelPoints(0, 999999, 3, 0), -150);
  assert.strictEqual(R.levelPoints(1, 999999, 4, 3), -400);
  assert.ok(R.levelPoints(2, 130000, 5, 3) < 0);
});
test("levelPoints: 50 por bolinha (0.15.8), que soma com os outros pontos e não conta se for inválida", () => {
  assert.strictEqual(R.BALL_POINTS, 50);
  assert.strictEqual(R.levelPoints(5, 25000, 0, 0, { balls: 1 }), 640);
  assert.strictEqual(R.levelPoints(5, 25000, 0, 0, { balls: 5 }), 840);
  assert.strictEqual(R.levelPoints(5, 25000, 1, 1, { balls: 2, bones: 1, postmen: 1, lifePenalty: 200 }), 500 + 150 + 100 + 100 + 90 - 200 - 100, "bolinhas somam com ossos, carteiros, vidas e tentativas");
  assert.strictEqual(R.levelPoints(0, 999999, 0, 0, { balls: 3 }), 150, "só as bolinhas");
  for (const bad of [-1, 1.5, "2", null, undefined, NaN]) assert.strictEqual(R.levelPoints(5, 25000, 0, 0, { balls: bad }), 590, `balls = ${bad} não conta`);
});
test("levelPoints: entradas inválidas valem 0", () => {
  assert.strictEqual(R.levelPoints(5, 25000, -3, 0), 590);
  assert.strictEqual(R.levelPoints(5, 25000, 0, -2), 590);
  assert.strictEqual(R.levelPoints(5.5, 25000, 0, 0), 90);
  assert.strictEqual(R.levelPoints(5, 25000, "x", null), 590);
  assert.strictEqual(R.LIFE_PENALTY, 50);
  assert.strictEqual(R.RETRY_PENALTY, 100);
  assert.strictEqual(R.MAX_RETRIES, 3);
  assert.strictEqual(R.RATION_POINTS, 100);
});

// ---------- jogador ----------
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
test("lista de jogadores lembrados tem limite e o mais recente vem primeiro", () => {
  const s = R.createStore(memStorage());
  for (let i = 0; i < 20; i++) s.setPlayer("Cao" + i);
  assert.strictEqual(s.players().length, 12);
  assert.strictEqual(s.players()[0], "Cao19");
});

// ---------- só a melhor pontuação de cada jogador em cada fase ----------
test("addRun: primeira pontuação é recorde pessoal e geral", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  const r = add(s, 1, 20000);
  assert.ok(r.first && r.newPersonal && r.newGeneral);
  assert.strictEqual(s.personalBest("Totó", 1).p, 600);
});
test("mesma fase NÃO soma: duas partidas de 590 continuam valendo 590", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000);
  add(s, 1, 25000);
  assert.strictEqual(s.personalBest("Totó", 1).p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590, "não pode virar 1180");
});
test("mesma fase: vale a MAIOR pontuação (a pior depois não derruba a melhor)", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000);                       // 590
  const worse = add(s, 1, 55000);          // 500 + 60 = 560
  assert.strictEqual(worse.run.p, 560);
  assert.ok(!worse.newPersonal && worse.gained === 0);
  assert.strictEqual(worse.personalBest.p, 590);
  assert.strictEqual(s.totalScore("Totó"), 590);
  const best = add(s, 1, 15000);           // 600
  assert.ok(best.newPersonal && best.gained === 10 && best.previousPersonal.p === 590);
  assert.strictEqual(s.totalScore("Totó"), 600, "a total acompanha a maior (590 → 600), sem somar");
});
test("NÃO guarda histórico: só uma pontuação por jogador e fase (a melhor)", () => {
  const st = memStorage(), s = R.createStore(st); s.setPlayer("Totó");
  for (let i = 0; i < 30; i++) add(s, 1, 25000 + i * 1000);
  assert.strictEqual(typeof s.history, "undefined", "a função de histórico não existe mais");
  const saved = JSON.parse(st._m["cachorrinho.v1"]);
  assert.strictEqual(saved.runs, undefined, "não há lista de partidas guardada");
  assert.deepStrictEqual(Object.keys(saved.bests.toto.L), ["1"]);
  assert.strictEqual(saved.bests.toto.L[1].p, 590);
  assert.ok(st._m["cachorrinho.v1"].length < 600, "o armazenamento não cresce com o número de partidas");
});
test("fases diferentes SOMAM a melhor pontuação de cada uma", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 25000); add(s, 1, 15000);       // melhor da fase 1: 600
  add(s, 2, 45000); add(s, 2, 15000, 650);  // 570 e 650: melhor da fase 2: 650
  add(s, 3, 90000);                         // 500 + 30 = 530
  assert.strictEqual(s.totalScore("Totó"), 600 + 650 + 530);
  assert.strictEqual(s.totalScore("Totó", [1, 2]), 1250, "levels limita as fases que contam");
  assert.strictEqual(s.totalScore("Totó", [9]), 0);
  assert.strictEqual(s.totalScore("Rex"), 0);
});
test("pontuação negativa é guardada, comparada e somada normalmente", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  const r = s.addRun({ level: 1, timeMs: 130000, points: -50 });
  assert.ok(r && r.first && r.run.p === -50);
  assert.strictEqual(s.personalBest("Totó", 1).p, -50);
  assert.strictEqual(s.totalScore("Totó"), -50);
  assert.ok(s.addRun({ level: 1, timeMs: 130000, points: -200 }).newPersonal === false, "−200 não supera −50");
  assert.ok(s.addRun({ level: 1, timeMs: 130000, points: -10 }).newPersonal, "−10 supera −50");
  s.addRun({ level: 2, timeMs: 30000, points: 400 });
  assert.strictEqual(s.totalScore("Totó"), 390, "total = −10 + 400");
  const again = R.createStore(s === null ? null : memStorage({ "cachorrinho.v1": JSON.stringify({ player: "Totó", bests: { toto: { n: "Totó", L: { 1: { p: -10, t: 130000, w: 1 } } } } }) }));
  assert.strictEqual(again.personalBest("Totó", 1).p, -10, "negativos sobrevivem a recarregar");
});
test("empate de pontuação: o menor tempo é o melhor; pontuação maior vence tempo menor", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  add(s, 1, 28000, 590);
  const faster = add(s, 1, 22000, 590);
  assert.ok(faster.newPersonal && faster.gained === 0, "mesma pontuação, mais rápido: novo recorde, mas o total não muda");
  assert.strictEqual(s.personalBest("Totó", 1).t, 22000);
  add(s, 1, 50000, 700);
  assert.strictEqual(s.personalBest("Totó", 1).p, 700);
  assert.strictEqual(s.totalScore("Totó"), 700);
});
test("recorde geral e ranking da fase: uma linha por jogador, maior pontuação primeiro, tempo desempata", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); add(s, 1, 35000);   // 580
  s.setPlayer("B"); add(s, 1, 25000);   // 590
  s.setPlayer("C"); add(s, 1, 21000);   // 590, mais rápido que B
  s.setPlayer("D"); add(s, 1, 10000);   // 600
  s.setPlayer("B"); add(s, 1, 90000);   // pior: não cria outra linha
  assert.deepStrictEqual(s.ranking(1).map((r) => r.n + ":" + r.p), ["D:600", "C:590", "B:590", "A:580"]);
  assert.strictEqual(s.generalBest(1).n, "D");
  assert.strictEqual(s.ranking(1, 2).length, 2);
  s.setPlayer("A"); const r = add(s, 1, 9000);
  assert.ok(r.newGeneral && s.generalBest(1).n === "A", "600 em menos tempo supera o recorde geral");
});
test("ranking geral por pontuação total (soma das melhores de cada fase)", () => {
  const s = R.createStore(memStorage());
  s.setPlayer("A"); add(s, 1, 10000); add(s, 2, 10000);   // 600 + 600
  s.setPlayer("B"); add(s, 1, 10000); add(s, 1, 10000);   // 600 (repetir não soma)
  s.setPlayer("C"); add(s, 2, 70000);                      // 500 + 50 = 550
  assert.deepStrictEqual(s.totalRanking(5).map((x) => x.n + ":" + x.total), ["A:1200", "B:600", "C:550"]);
  assert.deepStrictEqual(s.totalRanking(5, [1]).map((x) => x.n + ":" + x.total), ["A:600", "B:600"]);
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
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: 1.5 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: "600" }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: 1e9 }), null);
  assert.strictEqual(s.addRun({ level: 1, timeMs: 1000, points: -1e9 }), null);
});
test("dados persistem entre sessões", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó"); add(a, 1, 12345);
  const b = R.createStore(st);
  assert.strictEqual(b.personalBest("Totó", 1).t, 12345);
  assert.strictEqual(b.generalBest(1).n, "Totó");
});

// ---------- dados antigos e corrompidos ----------
test("histórico antigo (lista de partidas) vira só a melhor de cada jogador e fase", () => {
  const old = JSON.stringify({ player: "Totó", players: ["Totó"], runs: [
    { n: "Totó", l: 1, t: 25000, w: 1 }, { n: "Totó", l: 1, t: 90000, w: 2 }, { n: "Totó", l: 1, t: 30000, p: 800, w: 3 }, { n: "toto", l: 2, t: 20000, w: 4 }] });
  const s = R.createStore(memStorage({ "cachorrinho.v1": old }));
  assert.strictEqual(s.personalBest("Totó", 1).p, 800, "usa a pontuação gravada quando existe");
  assert.strictEqual(s.personalBest("Totó", 2).p, 600, "sem pontuação gravada: 500 + bônus do tempo");
  assert.strictEqual(s.totalScore("Totó"), 1400);
  assert.strictEqual(s.ranking(1).length, 1);
});
test("JSON corrompido ou com lixo não quebra", () => {
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "{not json" })));
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "null" })));
  assert.doesNotThrow(() => R.createStore(memStorage({ "cachorrinho.v1": "123" })));
  const bad = JSON.stringify({ player: 5, players: "x", bests: { a: null, b: 5, c: { n: "<>", L: {} }, dd: { n: "Dd", L: { 1: { p: "x", t: 5 }, 2: { p: 5, t: -1 }, 3: { p: 1e9, t: 5 }, x: { p: 5, t: 5 }, 4: { p: -30, t: 7000, w: 1 } } } },
    runs: [null, 1, { n: "A", l: 1, t: -1, w: 1 }, { n: "<>", l: 1, t: 5, w: 1 }, { n: "Ok", l: 1, t: 1500.4, w: 2 }] });
  const s = R.createStore(memStorage({ "cachorrinho.v1": bad }));
  assert.strictEqual(s.player(), "");
  assert.strictEqual(s.generalBest(1).t, 1500);
  assert.strictEqual(s.ranking(1).length, 1);
  assert.strictEqual(s.personalBest("Dd", 4).p, -30, "o registro bom (negativo) é mantido");
  assert.strictEqual(s.personalBest("Dd", 1), null);
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
test("nomes que coincidem com propriedades de objeto (constructor, toString) funcionam", () => {
  const st = memStorage();
  const s = R.createStore(st);
  for (const nm of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
    assert.strictEqual(s.setPlayer(nm), nm);
    assert.deepStrictEqual(s.progress(nm), { unlocked: 1, completed: [] });
    assert.strictEqual(s.hasGame(nm), false);
    assert.strictEqual(s.loadGame(nm), null);
    assert.strictEqual(s.personalBest(nm, 1), null);
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
  assert.strictEqual(again.personalBest("constructor", 1).p, 590);
});

// ---------- progresso ----------
test("progresso: começa na fase 1, concluir libera a próxima e persiste", () => {
  const st = memStorage();
  const a = R.createStore(st); a.setPlayer("Totó");
  assert.deepStrictEqual(a.progress("Totó"), { unlocked: 1, completed: [] });
  assert.deepStrictEqual(a.completeLevel("Totó", 1), { unlocked: 2, completed: [1] });
  a.completeLevel("toto", 1);
  assert.deepStrictEqual(a.progress("Totó"), { unlocked: 2, completed: [1] });
  a.completeLevel("Totó", 3);
  assert.deepStrictEqual(R.createStore(st).progress("TOTÓ"), { unlocked: 4, completed: [1, 3] });
  assert.deepStrictEqual(a.progress("Rex"), { unlocked: 1, completed: [] });
});
test("completeLevel rejeita fase inválida", () => {
  const s = R.createStore(memStorage()); s.setPlayer("Totó");
  assert.strictEqual(s.completeLevel("Totó", 0), null);
  assert.strictEqual(s.completeLevel("Totó", 1.5), null);
  assert.strictEqual(s.completeLevel("???", 1), null);
});
test("progresso corrompido não quebra", () => {
  const bad = JSON.stringify({ player: "A", progress: { a: { completed: "x" }, b: null, c: { completed: [1, "2", -3, 2] } } });
  const s = R.createStore(memStorage({ "cachorrinho.v1": bad }));
  assert.deepStrictEqual(s.progress("c"), { unlocked: 3, completed: [1, 2] });
  assert.deepStrictEqual(s.progress("a"), { unlocked: 1, completed: [] });
});

// ---------- jogo salvo ----------
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
test("jogo salvo é separado por jogador e não mexe nas pontuações", () => {
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
test("falha ao gravar o save vira memória sem perder o jogo atual", () => {
  const st = memStorage(); let fail = false;
  const flaky = { getItem: st.getItem, removeItem: st.removeItem, setItem(k, v) { if (fail && k.includes("save")) throw new Error("quota"); st.setItem(k, v); } };
  const s = R.createStore(flaky); s.setPlayer("Totó");
  fail = true;
  assert.strictEqual(s.saveGame("Totó", { a: 1 }), false);
  assert.strictEqual(s.persistent, false);
  assert.strictEqual(s.loadGame("Totó").snap.a, 1);
});
test("falha ao gravar só o jogo salvo não desliga a gravação das pontuações e dos petscoin (0.16.0)", () => {
  const st = memStorage(); let fail = false;
  const flaky = { getItem: st.getItem, removeItem: st.removeItem, setItem(k, v) { if (fail && k.includes("save")) throw new Error("quota"); st.setItem(k, v); } };
  const s = R.createStore(flaky); s.setPlayer("Totó");
  fail = true;
  assert.strictEqual(s.saveGame("Totó", { a: 1 }), false);
  assert.strictEqual(s.saveGame("Totó", { a: 2 }), false, "depois da primeira falha o jogo salvo fica só na memória");
  add(s, 1, 7000);
  s.addTreats("Totó", 2);
  const s2 = R.createStore(flaky); // outra aba / depois de recarregar: as pontuações e a carteira foram para o armazenamento
  assert.strictEqual(s2.personalBest("Totó", 1).t, 7000);
  assert.strictEqual(s2.wallet("Totó").treats, 2);
});
test("limite de saves: guarda no máximo um por jogador lembrado", () => {
  const s = R.createStore(memStorage());
  for (let i = 0; i < 20; i++) { s.setPlayer("Cao" + i); s.saveGame("Cao" + i, { i }); }
  let n = 0; for (let i = 0; i < 20; i++) if (s.hasGame("Cao" + i)) n++;
  assert.ok(n <= 12, "mais saves que jogadores lembrados: " + n);
  assert.ok(s.hasGame("Cao19"));
});

// ---------- Fase 3: ossos e bônus de tempo de 20 pontos por degrau ----------
test("timeBonus com 20 pontos por degrau de 10 s: de 0 a 200", () => {
  const table = [5, 20, 20.1, 30, 30.1, 40, 60, 80, 100, 110, 110.1, 300].map((s) => R.timeBonus(s * 1000, 20));
  assert.deepStrictEqual(table, [200, 200, 180, 180, 160, 160, 120, 80, 40, 20, 0, 0]);
  assert.strictEqual(R.timeBonus(15000), 100, "sem o parâmetro vale o padrão (10 por degrau)");
  assert.strictEqual(R.timeBonus(15000, 10), 100);
  for (const bad of [0, -5, 1.5, NaN, "20", null, 5000]) assert.strictEqual(R.timeBonus(25000, bad), 90, `degrau inválido (${bad}) cai no padrão`);
});

test("levelPoints com ossos (150 pontos cada: 50 + 100 de bônus), carteiros (100 cada) e bônus de 20 por degrau", () => {
  assert.strictEqual(R.BONE_POINTS, 150);
  assert.strictEqual(R.POSTMAN_POINTS, 100);
  assert.strictEqual(R.levelPoints(7, 25000, 0, 0, { bones: 2, bonusStep: 20 }), 700 + 300 + 180);
  assert.strictEqual(R.levelPoints(7, 25000, 2, 1, { bones: 2, bonusStep: 20 }), 700 + 300 + 180 - 100 - 100);
  assert.strictEqual(R.levelPoints(7, 25000, 2, 1, { bones: 2, postmen: 3, bonusStep: 20, lifePenalty: 200 }), 700 + 300 + 300 + 180 - 400 - 100, "cada carteiro vale 100 e a vida perdida pode custar 200");
  assert.strictEqual(R.levelPoints(5, 25000, 0, 0), 500 + 90, "fases sem ossos e sem parâmetros seguem como antes");
  assert.strictEqual(R.levelPoints(7, 25000, 0, 0, { bones: -3, postmen: -1, bonusStep: 20 }), 700 + 180, "ossos e carteiros inválidos valem 0");
  assert.strictEqual(R.levelPoints(7, 500000, 0, 0, { bones: 2, bonusStep: 20 }), 1000, "sem bônus de tempo");
});

test("levelPoints com o bônus da missão (0.15.6, Fases 11 a 20): soma ao total, entra no recorde e nunca é negativo", () => {
  // Fase 11 (44 rações, 5 ossos, bônus de tempo de 10 por degrau, 5 + 2 sustos, perda de 300 por vida, missão de +200)
  const base = { bones: 5, postmen: 3, bonusStep: 10, lifePenalty: 300 };
  const noMission = R.levelPoints(44, 60000, 1, 0, base);
  assert.strictEqual(noMission, 4400 + 750 + 300 + R.timeBonus(60000, 10) - 300, "sem missionBonus tudo segue como antes");
  assert.strictEqual(R.levelPoints(44, 60000, 1, 0, { ...base, missionBonus: 200 }), noMission + 200, "missionBonus 200 soma 200");
  assert.strictEqual(R.levelPoints(44, 60000, 1, 0, { ...base, missionBonus: 0 }), noMission, "missionBonus 0 não muda nada");
  // o bônus de cada fase (200 na Fase 11, mais 50 por fase, 650 na Fase 20)
  for (let n = 11; n <= 20; n++) {
    const b = 200 + 50 * (n - 11);
    assert.strictEqual(R.levelPoints(10, 25000, 0, 0, { bones: 2, postmen: 1, bonusStep: 20, missionBonus: b }), 1000 + 300 + 100 + R.timeBonus(25000, 20) + b, `Fase ${n}: +${b}`);
  }
  assert.strictEqual(200 + 50 * 9, 650, "o bônus da Fase 20 é 650");
  // o bônus soma aos outros termos e não elimina as perdas (vidas e tentativas)
  assert.strictEqual(R.levelPoints(0, 999999, 2, 3, { lifePenalty: 400, missionBonus: 650 }), 650 - 800 - 300, "a perda de vidas e tentativas continua descontando (pode ficar negativa)");
  assert.strictEqual(R.levelPoints(62, 999999, 0, 0, { bones: 8, postmen: 5, bonusStep: 20, lifePenalty: 400, missionBonus: 650 }), 6200 + 1200 + 500 + 650, "Fase 20 perfeita sem bônus de tempo");
  // entradas inválidas valem 0 (como ossos e carteiros)
  for (const bad of [-200, 1.5, "200", null, undefined, NaN, Infinity, {}, [], true]) assert.strictEqual(R.levelPoints(5, 999999, 0, 0, { missionBonus: bad }), 500, `missionBonus ${JSON.stringify(bad) ?? String(bad)} vale 0`);
  // o bônus da missão faz diferença no ranking: mesma partida, com e sem a missão
  const s = R.createStore(null);
  s.addRun({ level: 11, timeMs: 60000, points: noMission, name: "Ana" });
  s.addRun({ level: 11, timeMs: 60000, points: noMission + 200, name: "Bia" });
  assert.deepStrictEqual(s.ranking(11).map((r) => r.n), ["Bia", "Ana"], "quem cumpriu a missão (+200) fica na frente");
  assert.strictEqual(s.personalBest("Bia", 11).p, noMission + 200, "o recorde pessoal guarda o total com o bônus");
});

test("a Fase 3 pode guardar e somar pontuação como as outras fases", () => {
  const s = R.createStore(null);
  s.addRun({ level: 1, timeMs: 20000, points: 600, name: "Ana" });
  s.addRun({ level: 3, timeMs: 30000, points: R.levelPoints(7, 30000, 0, 0, { bones: 2, bonusStep: 20 }), name: "Ana" });
  assert.strictEqual(s.personalBest("Ana", 3).p, 700 + 300 + 180);
  assert.strictEqual(s.totalScore("Ana", [1, 2, 3]), 600 + 1180);
  s.completeLevel("Ana", 2); s.completeLevel("Ana", 3);
  assert.deepStrictEqual(s.progress("Ana").completed, [2, 3]);
  assert.strictEqual(s.progress("Ana").unlocked, 4);
});

// ---------- duas abas no mesmo armazenamento ----------
test("duas abas: o que uma grava a outra enxerga e nada se perde (pontuações, progresso e jogos salvos)", () => {
  const st = memStorage();
  const a = R.createStore(st), b = R.createStore(st); // b nasceu antes de a Ana existir: é uma cópia "velha"
  a.addRun({ level: 1, timeMs: 20000, points: 600, name: "Ana" });
  b.addRun({ level: 1, timeMs: 25000, points: 590, name: "Bia" }); // grava depois, sem ter visto a Ana
  const c = R.createStore(st);
  assert.deepStrictEqual(c.ranking(1).map((r) => r.n), ["Ana", "Bia"], "as duas pontuações estão guardadas");
  assert.deepStrictEqual(a.ranking(1).map((r) => r.n), ["Ana", "Bia"], "a aba que gravou primeiro enxerga a outra sem recarregar");
  a.completeLevel("Ana", 1); b.completeLevel("Bia", 1);
  assert.ok(c.progress("Ana").completed.includes(1) && c.progress("Bia").completed.includes(1), "o progresso das duas ficou");
  a.saveGame("Ana", { x: 1 }); b.saveGame("Bia", { x: 2 });
  assert.ok(c.hasGame("Ana") && c.hasGame("Bia"), "os jogos salvos das duas ficaram");
  b.clearGame("Ana");
  assert.ok(!a.hasGame("Ana") && a.hasGame("Bia"), "apagar um jogo salvo numa aba vale na outra, sem apagar os demais");
  assert.strictEqual(a.totalScore("Bia"), 590);
});

test("duas abas: uma melhor pontuação gravada em outra aba nunca é rebaixada por uma aba velha", () => {
  const st = memStorage();
  const a = R.createStore(st), b = R.createStore(st);
  a.addRun({ level: 1, timeMs: 20000, points: 600, name: "Ana" });
  b.addRun({ level: 1, timeMs: 60000, points: 500, name: "Ana" }); // aba velha com uma partida pior
  assert.strictEqual(R.createStore(st).personalBest("Ana", 1).p, 600);
  b.addRun({ level: 1, timeMs: 10000, points: 600, name: "Ana" }); // mesma nota, menos tempo
  assert.strictEqual(a.personalBest("Ana", 1).t, 10000);
});

test("armazenamento apagado por fora: a cópia em memória começa do zero em vez de ressuscitar dados", () => {
  const st = memStorage();
  const a = R.createStore(st);
  a.addRun({ level: 1, timeMs: 20000, points: 600, name: "Ana" });
  st.removeItem("cachorrinho.v1");
  assert.deepStrictEqual(a.ranking(1), []);
  a.addRun({ level: 1, timeMs: 21000, points: 590, name: "Bia" });
  assert.deepStrictEqual(R.createStore(st).ranking(1).map((r) => r.n), ["Bia"]);
});

test("sem armazenamento (só memória) tudo continua funcionando", () => {
  const a = R.createStore(null);
  a.addRun({ level: 1, timeMs: 20000, points: 600, name: "Ana" });
  a.saveGame("Ana", { x: 1 });
  assert.strictEqual(a.persistent, false);
  assert.ok(a.hasGame("Ana") && a.personalBest("Ana", 1).p === 600);
});


// ---------- petiscos, petscoin e skins (0.15.9) ----------
test("levelPoints: 50 por bolinha e bônus da missão (0.15.7/0.15.8)", () => {
  assert.strictEqual(R.BALL_POINTS, 50);
  assert.strictEqual(R.levelPoints(5, 18000, 0, 0, { balls: 2 }), 700);
  assert.strictEqual(R.levelPoints(5, 18000, 0, 0, { balls: 2, missionBonus: 200 }), 900);
  assert.strictEqual(R.levelPoints(5, 18000, 0, 0, { balls: -3, missionBonus: 1.5 }), 600, "valores inválidos não contam");
});

test("carteira: começa vazia, 1 petisco por fase completada e só para quem tem nome", () => {
  const st = R.createStore(memStorage());
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 0, owned: [], equipped: "" });
  assert.strictEqual(st.addTreats("", 1), null, "sem nome não guarda");
  assert.strictEqual(st.addTreats("Totó", 0), null);
  assert.strictEqual(st.addTreats("Totó", 1.5), null);
  assert.strictEqual(st.addTreats("Totó", 1).treats, 1);
  assert.strictEqual(st.addTreats("totó", 2).treats, 3, "o nome não distingue maiúsculas");
  assert.strictEqual(st.wallet("TOTÓ").treats, 3);
  assert.strictEqual(R.MIN_SKIN_PRICE, 10);
});

test("comprar skin: preço mínimo de 10 petscoin, saldo, já tem, usar e guardar", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.addTreats("Totó", 9);
  assert.deepStrictEqual(st.buySkin("Totó", "cinza", 10), { ok: false, error: "funds" }, "9 petscoin não bastam");
  assert.deepStrictEqual(st.buySkin("Totó", "barata", 9), { ok: false, error: "invalid" }, "o preço mínimo é 10");
  assert.deepStrictEqual(st.buySkin("Totó", "cinza", 0), { ok: false, error: "invalid" });
  assert.deepStrictEqual(st.buySkin("Totó", "Cinza Prata!", 10), { ok: false, error: "invalid" }, "id inválido");
  assert.strictEqual(st.wallet("Totó").treats, 9, "recusar não gasta nada");
  st.addTreats("Totó", 5);
  const r = st.buySkin("Totó", "cinza", 10);
  assert.ok(r.ok && r.wallet.treats === 4 && r.wallet.owned.join() === "cinza");
  assert.deepStrictEqual(st.buySkin("Totó", "cinza", 10), { ok: false, error: "owned" });
  assert.strictEqual(st.equipSkin("Totó", "dalmata"), null, "não dá para usar o que não é seu");
  assert.strictEqual(st.equipSkin("Totó", "cinza").equipped, "cinza");
  assert.strictEqual(st.equipSkin("Totó", "").equipped, "", "'' volta à skin padrão");
  st.equipSkin("Totó", "cinza");
  const again = R.createStore(mem); // outra aba/recarregou: tudo guardado
  assert.deepStrictEqual(again.wallet("Totó"), { treats: 4, owned: ["cinza"], equipped: "cinza" });
});

test("carteira: dados adulterados no armazenamento são limpos e apagar a conta apaga a carteira", () => {
  const raw = JSON.stringify({ v: 2, player: "Totó", players: ["Totó"], bests: {}, progress: {}, accounts: {}, wallet: {
    "toto": { t: 12, own: ["cinza", "cinza", "<img>", 5, "dalmata"], eq: "nao-tenho" },
    "ana": { t: -4, own: "x", eq: 7 }, "": { t: 3 }, "bia": { t: 1e12, own: [], eq: "" } } });
  const st = R.createStore(memStorage({ "cachorrinho.v1": raw }));
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 12, owned: ["cinza", "dalmata"], equipped: "" });
  assert.strictEqual(st.wallet("Ana").treats, 0);
  assert.strictEqual(st.wallet("Bia").treats, R.MAX_TREATS, "petiscos acima do limite são cortados no máximo (99999)");
  st.deleteAccount("Totó");
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 0, owned: [], equipped: "" });
});

// ---------- a carteira como a tela da lojinha a usa (0.15.9): tipos errados, duas abas, limites ----------
const KEY = "cachorrinho.v1";
const rewrite = (mem, fn) => { const raw = JSON.parse(mem._m[KEY]); fn(raw); mem._m[KEY] = JSON.stringify(raw); }; // adultera os dados guardados
const EMPTY = { treats: 0, owned: [], equipped: "" };

test("carteira: o formato guardado é { t, own, eq } por jogador (chave sem acento e em minúsculas), junto dos recordes", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); add(st, 1, 20000); st.addTreats("Totó", 12); st.buySkin("Totó", "cinza", 10); st.equipSkin("Totó", "cinza");
  const raw = JSON.parse(mem._m[KEY]);
  assert.deepStrictEqual(raw.wallet, { toto: { t: 2, own: ["cinza"], eq: "cinza" } });
  assert.ok(raw.bests.toto && raw.v === 2, "a carteira não mexe nos recordes nem na versão do formato");
});

test("dados de antes da lojinha (sem o campo wallet) continuam valendo e a carteira começa vazia", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); add(st, 1, 20000); st.completeLevel("Totó", 1);
  rewrite(mem, (raw) => { delete raw.wallet; });
  const again = R.createStore(mem);
  assert.deepStrictEqual(again.wallet("Totó"), EMPTY);
  assert.ok(again.personalBest("Totó", 1) && again.progress("Totó").completed.includes(1) && again.player() === "Totó", "recordes, progresso e jogador atual continuam");
  assert.strictEqual(again.addTreats("Totó", 3).treats, 3);
  assert.strictEqual(R.createStore(mem).wallet("Totó").treats, 3, "e a carteira nova é guardada");
});

test("carteira adulterada: o campo wallet com outro tipo (texto, lista, número, null) é ignorado sem derrubar o resto", () => {
  for (const bad of ["abc", [1, 2, 3], 5, null, true, [{ t: 5 }]]) {
    const mem = memStorage(), st = R.createStore(mem);
    st.setPlayer("Totó"); add(st, 1, 20000); st.addTreats("Totó", 4);
    rewrite(mem, (raw) => { raw.wallet = bad; });
    const again = R.createStore(mem);
    assert.deepStrictEqual(again.wallet("Totó"), EMPTY, `wallet = ${JSON.stringify(bad)}`);
    assert.ok(again.personalBest("Totó", 1) && again.player() === "Totó", "os recordes e o jogador continuam");
    assert.strictEqual(again.addTreats("Totó", 2).treats, 2, "dá para voltar a juntar petiscos");
    assert.deepStrictEqual(JSON.parse(mem._m[KEY]).wallet, { toto: { t: 2, own: [], eq: "" } }, "e o formato guardado volta ao certo");
  }
});

test("carteira adulterada: cada entrada com tipos errados é limpa (texto, lista, decimal, skins demais, skin em uso que não é do jogador)", () => {
  const ids = Array.from({ length: 100 }, (_, i) => "s" + i);
  const mem = memStorage(), st0 = R.createStore(mem);
  st0.setPlayer("Totó");
  rewrite(mem, (raw) => {
    raw.wallet = {
      toto: "x", ana: [1, 2], bia: { t: "5", own: { a: 1 }, eq: ["x"] }, cris: { t: 3.5, own: ["cinza"], eq: "cinza" }, dede: { t: 7, own: ids, eq: "s80" }, edu: { t: NaN, own: [null, 3, "", "A B", "ok-1"], eq: "ok-1" },
      fabi: { t: -1, own: [], eq: "cinza" }, gil: { t: 5, own: ["cinza"], eq: 0 }, hugo: { t: Infinity },
    };
  });
  const st = R.createStore(mem);
  assert.deepStrictEqual(st.wallet("Toto"), EMPTY, "entrada que é texto");
  assert.deepStrictEqual(st.wallet("Ana"), EMPTY, "entrada que é lista");
  assert.deepStrictEqual(st.wallet("Bia"), EMPTY, "petiscos em texto, skins em objeto, skin em uso em lista");
  assert.deepStrictEqual(st.wallet("Cris"), { treats: 0, owned: ["cinza"], equipped: "cinza" }, "petiscos decimais viram 0, mas as skins válidas ficam");
  const dede = st.wallet("Dede");
  assert.strictEqual(dede.treats, 7);
  assert.strictEqual(dede.owned.length, 60, "no máximo 60 skins por jogador");
  assert.strictEqual(dede.equipped, "", "a skin em uso que ficou fora das 60 não vale");
  assert.deepStrictEqual(st.wallet("Edu"), { treats: 0, owned: ["ok-1"], equipped: "ok-1" }, "ids inválidos (nulo, número, vazio, com espaço) saem");
  assert.deepStrictEqual(st.wallet("Fabi"), EMPTY, "petiscos negativos e skin em uso que não é dela");
  assert.deepStrictEqual(st.wallet("Gil"), { treats: 5, owned: ["cinza"], equipped: "" }, "skin em uso que não é texto");
  assert.strictEqual(st.wallet("Hugo").treats, 0, "petiscos infinitos");
});

test("carteira: nomes como constructor, toString e __proto__ não colidem com o protótipo dos objetos", () => {
  const mem = memStorage(), st = R.createStore(mem);
  for (const n of ["constructor", "toString", "hasOwnProperty", "valueOf"]) {
    assert.deepStrictEqual(st.wallet(n), EMPTY, n);
    assert.strictEqual(st.addTreats(n, 2).treats, 2, n);
  }
  assert.strictEqual(st.wallet("constructor").treats, 2);
  mem._m[KEY] = JSON.stringify({ v: 2, player: "", players: [], bests: {}, progress: {}, accounts: {}, wallet: JSON.parse('{"__proto__": {"t": 9, "own": ["cinza"], "eq": ""}, "toto": {"t": 1, "own": [], "eq": ""}}') });
  const again = R.createStore(mem);
  assert.strictEqual(again.wallet("Toto").treats, 1);
  assert.strictEqual({}.t, undefined, "nada vaza para o Object.prototype");
  assert.strictEqual(again.addTreats("Toto", 1).treats, 2);
});

test("carteira: duas abas (duas cópias do store no mesmo armazenamento): comprar na A e ver o saldo na B", () => {
  const mem = memStorage(), A = R.createStore(mem), B = R.createStore(mem);
  A.setPlayer("Totó"); A.addTreats("Totó", 30);
  assert.strictEqual(B.wallet("Totó").treats, 30, "a B vê os petiscos que a A guardou");
  const r = B.buySkin("Totó", "cinza", 10);
  assert.ok(r.ok && r.wallet.treats === 20);
  assert.deepStrictEqual(A.buySkin("Totó", "cinza", 10), { ok: false, error: "owned" }, "a A (com a tela velha) não compra a skin que a B já comprou");
  assert.deepStrictEqual(A.wallet("Totó"), { treats: 20, owned: ["cinza"], equipped: "" }, "e a A vê o saldo certo (20), não 30");
  A.addTreats("Totó", 5); B.addTreats("Totó", 5); A.addTreats("Totó", 5);
  assert.strictEqual(B.wallet("Totó").treats, 35, "ganhos alternados nas duas abas somam (nenhum se perde)");
  assert.ok(A.buySkin("Totó", "dourado", 20).ok, "a A gasta 20");
  assert.deepStrictEqual(B.buySkin("Totó", "chocolate", 20), { ok: false, error: "funds" }, "a B (que achava que tinha 35) só tem 15");
  assert.strictEqual(B.buySkin("Totó", "dalmata", 12).wallet.treats, 3, "e compra o que ainda dá (12 de 15)");
  A.equipSkin("Totó", "dourado");
  assert.strictEqual(B.wallet("Totó").equipped, "dourado", "a skin em uso muda nas duas abas");
  assert.deepStrictEqual(R.createStore(mem).wallet("Totó"), { treats: 3, owned: ["cinza", "dourado", "dalmata"], equipped: "dourado" }, "e o que está guardado é o estado final");
});

test("carteira: apagar a conta em uma aba zera a carteira na outra, que não a ressuscita", () => {
  const mem = memStorage(), A = R.createStore(mem), B = R.createStore(mem);
  A.setPlayer("Totó"); A.addTreats("Totó", 15); A.buySkin("Totó", "cinza", 10); A.setPlayer("Ana"); A.addTreats("Ana", 4);
  B.deleteAccount("Totó");
  assert.deepStrictEqual(A.wallet("Totó"), EMPTY, "a A vê a carteira vazia");
  assert.deepStrictEqual(A.buySkin("Totó", "cinza", 10), { ok: false, error: "funds" }, "e não compra com o saldo que a tela velha mostrava");
  assert.strictEqual(A.wallet("Ana").treats, 4, "a carteira dos outros jogadores fica");
  assert.strictEqual(A.addTreats("Totó", 1).treats, 1, "recomeça do zero (1), não de 5");
  assert.strictEqual(R.createStore(mem).wallet("Totó").treats, 1);
});

test("carteira: limites (1000 por vez, 99999 no total, 60 skins), argumentos que não são números e jogador inexistente", () => {
  const st = R.createStore(memStorage());
  assert.strictEqual(st.addTreats("Totó", 1000).treats, 1000);
  for (const bad of [0, -1, 1001, 1.5, NaN, Infinity, "1", null, [1], {}]) assert.strictEqual(st.addTreats("Totó", bad), null, `addTreats(${JSON.stringify(bad)})`);
  assert.strictEqual(st.addTreats("Totó", undefined).treats, 1001, "sem número vale 1 (um petisco por fase)");
  for (let i = 0; i < 100; i++) st.addTreats("Totó", 1000);
  assert.strictEqual(st.wallet("Totó").treats, R.MAX_TREATS, "a carteira para em 99999");
  assert.strictEqual(R.MAX_TREATS, 99999);
  assert.deepStrictEqual(st.buySkin("Totó", "x1", R.MAX_TREATS + 1), { ok: false, error: "invalid" }, "preço acima do máximo");
  for (let i = 0; i < 60; i++) assert.ok(st.buySkin("Totó", "s" + i, 10).ok, "skin " + i);
  assert.deepStrictEqual(st.buySkin("Totó", "s60", 10), { ok: false, error: "invalid" }, "a 61ª skin não cabe");
  assert.strictEqual(st.wallet("Totó").owned.length, 60);
  assert.strictEqual(st.wallet("Totó").treats, R.MAX_TREATS - 600, "e a recusa não cobrou nada");
  for (const n of ["", "   ", "!!!", undefined, null, 5, {}]) {
    assert.deepStrictEqual(st.wallet(n), EMPTY, `wallet(${JSON.stringify(n)})`);
    assert.strictEqual(st.addTreats(n, 1), null, `addTreats(${JSON.stringify(n)})`);
    assert.deepStrictEqual(st.buySkin(n, "cinza", 10), { ok: false, error: "invalid" }, `buySkin(${JSON.stringify(n)})`);
    assert.strictEqual(st.equipSkin(n, ""), null, `equipSkin(${JSON.stringify(n)})`);
  }
  assert.strictEqual(st.equipSkin("Totó", 5), null);
  assert.strictEqual(st.equipSkin("Totó", "Cinza"), null, "id inválido");
  assert.strictEqual(st.equipSkin("Totó", null), null);
});

test("carteira: quem chama não consegue mexer na carteira guardada mudando o que recebeu", () => {
  const st = R.createStore(memStorage());
  st.addTreats("Totó", 20); const bought = st.buySkin("Totó", "cinza", 10);
  bought.wallet.treats = 9999; bought.wallet.owned.push("super");
  const w = st.wallet("Totó"); w.owned.push("pirata"); w.treats = 5000; w.equipped = "pirata";
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 10, owned: ["cinza"], equipped: "" });
  const e = st.equipSkin("Totó", "cinza"); e.owned.length = 0;
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 10, owned: ["cinza"], equipped: "cinza" });
});

test("carteira só em memória (sem armazenamento ou com armazenamento que falha) funciona e não gruda em outro store", () => {
  const broken = { getItem() { throw new Error("sem acesso"); }, setItem() { throw new Error("cheio"); }, removeItem() { throw new Error("sem acesso"); } };
  for (const storage of [null, undefined, broken]) {
    const st = R.createStore(storage);
    assert.strictEqual(st.addTreats("Totó", 12).treats, 12);
    assert.ok(st.buySkin("Totó", "cinza", 10).ok && st.equipSkin("Totó", "cinza").equipped === "cinza");
    assert.deepStrictEqual(st.wallet("Totó"), { treats: 2, owned: ["cinza"], equipped: "cinza" });
    assert.deepStrictEqual(R.createStore(storage).wallet("Totó"), EMPTY, "um store novo não vê a carteira da memória do outro");
  }
});

test("carteira: ganhar petiscos não mexe nas pontuações, e trocar de jogador ou sair não mexe na carteira de ninguém", () => {
  const st = R.createStore(memStorage());
  st.setPlayer("Totó"); add(st, 1, 20000); const before = st.totalScore("Totó", [1]);
  for (let i = 0; i < 5; i++) st.addTreats("Totó", 1);
  assert.strictEqual(st.totalScore("Totó", [1]), before, "5 petiscos não valem pontos");
  st.setPlayer("Ana"); assert.deepStrictEqual(st.wallet(st.player()), EMPTY);
  st.logout(); assert.strictEqual(st.wallet("Totó").treats, 5);
  st.setPlayer("totó"); assert.strictEqual(st.wallet(st.player()).treats, 5, "o nome em outra caixa é o mesmo jogador");
});

// ---------- (0.17.0) um jogo por bichinho: pontos, recordes, progresso e jogo salvo independentes ----------
const runOf = (st, animal, level, points, timeMs = 30000) => st.game(animal).addRun({ level, timeMs, points });
test("animais: recorde, ranking e pontuação total de um animal não aparecem no outro (e o cachorrinho é o formato de sempre)", () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  add(st, 1, 20000, 600);                       // cachorrinho (método solto = game("dog"))
  runOf(st, "cat", 1, 900); runOf(st, "cat", 2, 400);
  assert.strictEqual(st.personalBest("Totó", 1).p, 600, "o cachorrinho não mudou");
  assert.strictEqual(st.game("dog").personalBest("Totó", 1).p, 600, "game(\"dog\") é o mesmo cachorrinho");
  assert.strictEqual(st.game("cat").personalBest("Totó", 1).p, 900);
  assert.strictEqual(st.personalBest("Totó", 2), null, "a fase 2 só foi jogada pelo gato");
  assert.strictEqual(st.totalScore("Totó"), 600);
  assert.strictEqual(st.game("cat").totalScore("Totó"), 1300);
  assert.strictEqual(st.game("bird").totalScore("Totó"), 0);
  assert.strictEqual(st.ranking(1)[0].p, 600);
  assert.strictEqual(st.game("cat").ranking(1)[0].p, 900);
  assert.strictEqual(st.game("cat").generalBest(1).n, "Totó");
  assert.strictEqual(st.game("bird").ranking(1).length, 0);
  assert.deepStrictEqual(st.totalRanking().map((r) => r.total), [600]);
  assert.deepStrictEqual(st.game("cat").totalRanking().map((r) => r.total), [1300]);
});
test("animais: melhor pontuação por animal (a pior não substitui) e a mesma fase de animais diferentes não soma", () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  const a = runOf(st, "cat", 3, 500); assert.ok(a.first && a.newPersonal && a.gained === 500);
  const b = runOf(st, "cat", 3, 300); assert.ok(!b.newPersonal && b.gained === 0 && st.game("cat").personalBest("Totó", 3).p === 500);
  add(st, 3, 25000, 800);
  assert.strictEqual(st.game("cat").totalScore("Totó"), 500, "a fase 3 do cachorrinho não soma na do gato");
  assert.strictEqual(st.totalScore("Totó"), 800);
});
test("animais: progresso independente (qualquer animal pode ser jogado; a fase N só abre ao concluir a N−1 do MESMO animal)", () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  for (let l = 1; l <= 9; l++) st.completeLevel("Totó", l);
  assert.strictEqual(st.progress("Totó").unlocked, 10, "o cachorrinho chegou à Fase 10");
  assert.deepStrictEqual(st.game("cat").progress("Totó"), { unlocked: 1, completed: [] }, "o gato começa na Fase 1, não importa o cachorrinho");
  const c = st.game("cat").completeLevel("Totó", 1);
  assert.deepStrictEqual(c, { unlocked: 2, completed: [1] });
  st.game("cat").completeLevel("Totó", 2); st.game("cat").completeLevel("Totó", 3);
  assert.strictEqual(st.game("cat").progress("Totó").unlocked, 4);
  assert.strictEqual(st.progress("Totó").unlocked, 10, "concluir fases do gato não mexe no cachorrinho");
  assert.deepStrictEqual(st.game("bird").progress("Totó"), { unlocked: 1, completed: [] });
  st.completeLevel("Totó", 10); assert.strictEqual(st.game("cat").progress("Totó").unlocked, 4, "e o contrário também");
});
test("animais: jogo salvo é um por jogador E por animal (salvar, continuar e apagar não se misturam)", () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  assert.ok(st.saveGame("Totó", { l: 5, who: "dog" }));
  assert.ok(st.game("cat").saveGame("Totó", { l: 2, who: "cat" }));
  assert.strictEqual(st.loadGame("Totó").snap.who, "dog");
  assert.strictEqual(st.game("cat").loadGame("Totó").snap.who, "cat");
  assert.ok(st.hasGame("Totó") && st.game("cat").hasGame("Totó") && !st.game("bird").hasGame("Totó"));
  st.game("cat").clearGame("Totó");
  assert.ok(st.hasGame("Totó") && !st.game("cat").hasGame("Totó"), "apagar o jogo do gato não apaga o do cachorrinho");
  st.clearGame("Totó"); assert.ok(!st.hasGame("Totó"));
  st.setPlayer("Ana"); assert.ok(!st.game("cat").hasGame("Ana"), "outro jogador não vê o jogo salvo do Totó");
});
test("animais: tudo isso é guardado e relido; formato antigo (só cachorrinho) continua valendo e não ganha campos novos", () => {
  const mem = memStorage(); const st = R.createStore(mem); st.setPlayer("Totó");
  add(st, 1, 20000, 600); st.completeLevel("Totó", 1);
  const legacy = JSON.parse(mem._m["cachorrinho.v1"]);
  assert.ok(!("animal" in legacy) && !("G" in legacy.bests.toto) && !("G" in legacy.progress.toto), "sem outro animal, o formato guardado é o de sempre");
  runOf(st, "cat", 1, 900); st.game("cat").completeLevel("Totó", 1); st.game("cat").saveGame("Totó", { l: 2 }); st.setAnimal("Totó", "cat");
  const st2 = R.createStore(mem);
  assert.strictEqual(st2.game("cat").personalBest("Totó", 1).p, 900);
  assert.deepStrictEqual(st2.game("cat").progress("Totó"), { unlocked: 2, completed: [1] });
  assert.strictEqual(st2.game("cat").loadGame("Totó").snap.l, 2);
  assert.strictEqual(st2.animal("Totó"), "cat");
  assert.strictEqual(st2.personalBest("Totó", 1).p, 600, "o cachorrinho continua igual");
});
test("animais: o animal escolhido é por jogador, o padrão é o cachorrinho e valores inválidos são recusados", () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  assert.strictEqual(st.animal("Totó"), "dog"); assert.strictEqual(st.animal("Ana"), "dog");
  assert.strictEqual(st.setAnimal("Totó", "bird"), "bird"); assert.strictEqual(st.animal("Totó"), "bird"); assert.strictEqual(st.animal("Ana"), "dog");
  assert.strictEqual(st.setAnimal("Totó", "Gato!"), null); assert.strictEqual(st.setAnimal("Totó", ""), null); assert.strictEqual(st.setAnimal("", "cat"), null);
  assert.strictEqual(st.animal("Totó"), "bird", "pedido inválido não muda nada");
  st.setAnimal("Totó", "dog"); assert.strictEqual(st.animal("Totó"), "dog");
  assert.throws(() => st.game("Gato!"), /animal inválido/); assert.throws(() => st.game(""), /animal inválido/); assert.throws(() => st.game(undefined), /animal inválido/);
});
test("animais: dados adulterados dos outros animais são limpos sem derrubar nada (e o cachorrinho fica intacto)", () => {
  const raw = { v: 2, player: "Totó", players: ["Totó"],
    bests: { toto: { n: "Totó", L: { 1: { p: 600, t: 20000, w: 1 } }, G: { cat: { 1: { p: 700, t: 15000, w: 2 }, 2: { p: "x", t: 1 }, 1000: { p: 1, t: 1 }, "-3": { p: 1, t: 1 } }, "Gato!": { 1: { p: 9, t: 9 } }, dog: { 1: { p: 5, t: 5 } }, bird: [1, 2], rato: "x" } } },
    progress: { toto: { unlocked: 2, completed: [1], G: { cat: { completed: [1, 1, "a", -1, 2] }, "Gato!": { completed: [1] }, dog: { completed: [9] }, bird: "x" } } },
    animal: { toto: "cat", ana: "Gato!", rex: "dog", "": "cat" }, accounts: {}, wallet: {} };
  const st = R.createStore(memStorage({ "cachorrinho.v1": JSON.stringify(raw) }));
  assert.strictEqual(st.personalBest("Totó", 1).p, 600);
  assert.strictEqual(st.game("cat").personalBest("Totó", 1).p, 700);
  assert.strictEqual(st.game("cat").personalBest("Totó", 2), null);
  assert.strictEqual(st.game("cat").personalBest("Totó", 1000), null);
  assert.strictEqual(st.game("bird").totalScore("Totó"), 0);
  assert.deepStrictEqual(st.game("cat").progress("Totó"), { unlocked: 3, completed: [1, 2] });
  assert.deepStrictEqual(st.progress("Totó"), { unlocked: 2, completed: [1] }, "G.dog e `dog` dentro de G não mexem no cachorrinho");
  assert.strictEqual(st.animal("Totó"), "cat"); assert.strictEqual(st.animal("ana"), "dog"); assert.strictEqual(st.animal("rex"), "dog");
  const st2 = R.createStore(memStorage({ "cachorrinho.v1": JSON.stringify({ v: 2, player: "", players: [], bests: { toto: { n: "Totó", L: {}, G: [1, 2] } }, progress: { toto: { G: { cat: { completed: [3] } } } }, animal: [1], accounts: {}, wallet: {} }) }));
  assert.deepStrictEqual(st2.game("cat").progress("Totó"), { unlocked: 4, completed: [3] }, "quem só jogou o gato tem progresso do gato sem ter o do cachorrinho");
  assert.deepStrictEqual(st2.progress("Totó"), { unlocked: 1, completed: [] });
  assert.strictEqual(st2.animal("Totó"), "dog");
});
test("animais: apagar a conta apaga o jogo de TODOS os animais (recordes, progresso, jogos salvos, escolha); carteira é única e compartilhada", async () => {
  const st = R.createStore(memStorage()); st.setPlayer("Totó");
  runOf(st, "cat", 1, 900); st.game("cat").completeLevel("Totó", 1); st.game("cat").saveGame("Totó", { l: 2 }); st.setAnimal("Totó", "cat"); st.saveGame("Totó", { l: 3 });
  st.addTreats("Totó", 3); // a carteira é única: 1 petisco por fase concluída em qualquer animal
  assert.strictEqual(st.wallet("Totó").treats, 3);
  const r = await st.register("Totó", "senha1"); assert.ok(r.ok, "(a conta foi criada de verdade antes de apagar)");
  assert.ok(st.deleteAccount("Totó"));
  assert.strictEqual(st.game("cat").personalBest("Totó", 1), null);
  assert.deepStrictEqual(st.game("cat").progress("Totó"), { unlocked: 1, completed: [] });
  assert.ok(!st.game("cat").hasGame("Totó") && !st.hasGame("Totó"));
  assert.strictEqual(st.animal("Totó"), "dog"); assert.strictEqual(st.wallet("Totó").treats, 0);
});
test("animais: apagar a conta regrava os jogos salvos mesmo depois de uma falha de gravação (o jogo salvo da conta apagada não volta ao recarregar)", () => {
  const mem = memStorage(); let failSaves = false;
  const flaky = { ...mem, setItem: (k, v) => { if (failSaves && k === "cachorrinho.save.v1") throw new Error("cheio"); mem.setItem(k, v); } };
  const st = R.createStore(flaky);
  st.setPlayer("Ana"); st.saveGame("Ana", { l: 1 }); st.game("cat").saveGame("Ana", { l: 2 });
  assert.ok(st.hasGame("Ana") && st.game("cat").hasGame("Ana"));
  failSaves = true; st.setPlayer("Bia"); st.saveGame("Bia", { l: 3 }); // a gravação dos jogos salvos falha (armazenamento cheio)
  failSaves = false;
  assert.ok(st.deleteAccount("Ana"));
  const st2 = R.createStore(flaky); // outra aba / depois de recarregar
  assert.ok(!st2.hasGame("Ana") && !st2.game("cat").hasGame("Ana"), "o jogo salvo da Ana (cachorrinho e gato) não voltou");
});
test("animais: apagar o jogador também apaga, NO ARMAZENAMENTO, a escolha de bichinho e os dados dos outros animais (uma cópia nova da loja não os vê)", () => {
  // (versão síncrona, sem conta com senha: deleteAccount apaga os dados do nome com ou sem senha)
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); runOf(st, "cat", 1, 900); st.game("cat").completeLevel("Totó", 1); st.game("cat").saveGame("Totó", { l: 2 }); st.setAnimal("Totó", "cat");
  st.setPlayer("Ana"); st.setAnimal("Ana", "bird");
  assert.strictEqual(R.createStore(mem).animal("Totó"), "cat", "(antes: a escolha está guardada)");
  assert.ok(st.deleteAccount("Totó"));
  const novo = R.createStore(mem); // outra cópia lendo o que ficou guardado
  assert.strictEqual(novo.animal("Totó"), "dog", "a escolha do Totó não ficou guardada");
  assert.ok(!JSON.parse(mem.getItem("cachorrinho.v1")).animal.toto, "nem no texto guardado");
  assert.strictEqual(novo.animal("Ana"), "bird", "a escolha de quem não foi apagado continua");
  assert.strictEqual(novo.game("cat").personalBest("Totó", 1), null);
  assert.ok(!novo.game("cat").hasGame("Totó"));
  const mem2 = memStorage(), so = R.createStore(mem2); so.setPlayer("Rex"); so.setAnimal("Rex", "cat"); so.deleteAccount("Rex"); // (o único jogador com escolha: o campo some do armazenamento)
  assert.ok(!("animal" in JSON.parse(mem2.getItem("cachorrinho.v1"))), "sem nenhuma escolha guardada o campo `animal` some");
});
test("animais: o limite de jogos salvos vale por animal (o cachorrinho continua como sempre)", () => {
  const st = R.createStore(memStorage());
  const names = Array.from({ length: 16 }, (_, i) => "Jog" + i); // (o limite é de 12 jogos salvos por animal)
  names.forEach((n, i) => { st.saveGame(n, { i }); st.game("cat").saveGame(n, { i }); });
  const dogSaves = names.filter((n) => st.hasGame(n)).length, catSaves = names.filter((n) => st.game("cat").hasGame(n)).length;
  assert.strictEqual(dogSaves, 12, `cachorrinho: ${dogSaves} jogos salvos`); assert.strictEqual(catSaves, 12, `gato: ${catSaves} jogos salvos (o limite do cachorrinho não come os do gato)`);
  assert.ok(!st.hasGame("Jog0") && st.hasGame("Jog15"), "saem os mais antigos");
});

test("DEFAULT_ANIMAL (0.18.0): js/records.js exporta o bichinho padrão e é o que a loja usa; board.js e game.js não repetem o texto", () => {
  assert.strictEqual(R.DEFAULT_ANIMAL, "dog");
  const st = R.createStore(memStorage());
  assert.strictEqual(st.animal("Totó"), R.DEFAULT_ANIMAL, "sem escolha guardada vale o padrão");
  st.setPlayer("Totó"); st.setAnimal("Totó", "cat"); st.setAnimal("Totó", R.DEFAULT_ANIMAL);
  assert.strictEqual(st.animal("Totó"), R.DEFAULT_ANIMAL, "escolher o padrão apaga a escolha guardada");
  const fs = require("fs"), path = require("path");
  for (const f of ["board.js", "game.js"]) assert.ok(!/const DEFAULT_ANIMAL = "dog"/.test(fs.readFileSync(path.join(__dirname, "../js", f), "utf8")), `js/${f} não repete a constante`);
  assert.strictEqual((fs.readFileSync(path.join(__dirname, "../js/records.js"), "utf8").match(/const DEFAULT_ANIMAL = "dog"/g) || []).length, 1, "só records.js define a constante");
});

// ---------- skins POR BICHINHO na carteira única (0.18.0) ----------
test("skins por bichinho: o Gatinho compra e usa com o mesmo saldo, o preço mínimo e ids que não colidem com os do Cachorrinho", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); st.addTreats("Totó", 100);
  assert.deepStrictEqual(st.buySkin("Totó", "preto", 9, "cat"), { ok: false, error: "invalid" }, "o preço mínimo (10) vale para o Gatinho");
  assert.deepStrictEqual(st.buySkin("Totó", "Preto!", 10, "cat"), { ok: false, error: "invalid" }, "id inválido");
  assert.deepStrictEqual(st.buySkin("Totó", "preto", 10, "Cat"), { ok: false, error: "invalid" }, "bichinho inválido");
  assert.deepStrictEqual(st.buySkin("Totó", "preto", 10, ""), { ok: false, error: "invalid" });
  assert.strictEqual(st.wallet("Totó").treats, 100, "recusar não gasta nada");
  const r = st.buySkin("Totó", "preto", 10, "cat");
  assert.ok(r.ok && r.wallet.treats === 90 && r.wallet.owned.join() === "preto" && r.wallet.equipped === "", "devolve a carteira do Gatinho: saldo único, ids puros");
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 90, owned: [], equipped: "" }, "a carteira do Cachorrinho NÃO vê a skin do gato (mesmo saldo, nenhuma skin)");
  assert.deepStrictEqual(st.wallet("Totó", "cat"), { treats: 90, owned: ["preto"], equipped: "" });
  assert.deepStrictEqual(st.buySkin("Totó", "preto", 10, "cat"), { ok: false, error: "owned" });
  assert.ok(st.buySkin("Totó", "preto", 10, "dog").ok, "o mesmo id no Cachorrinho é outra skin (o Cachorrinho não tem 'preto', mas o id não colide)");
  // ids repetidos entre os dois bichinhos: cinza, pirata, astronauta
  for (const id of ["cinza", "pirata", "astronauta"]) {
    assert.ok(st.buySkin("Totó", id, 10, "cat").ok, "Gatinho: " + id);
    assert.deepStrictEqual(st.buySkin("Totó", id, 10, "cat"), { ok: false, error: "owned" });
    assert.ok(st.buySkin("Totó", id, 10).ok, "Cachorrinho: " + id + " (não é 'owned' só porque o gato já tem)");
  }
  assert.deepStrictEqual(st.wallet("Totó", "cat").owned, ["preto", "cinza", "pirata", "astronauta"]);
  assert.deepStrictEqual(st.wallet("Totó").owned, ["preto", "cinza", "pirata", "astronauta"], "as do Cachorrinho são outras, com os mesmos ids");
  assert.strictEqual(st.wallet("Totó").treats, 20, "o saldo é um só: 8 compras de 10");
});

test("skins por bichinho: equipar e ler a skin em uso de cada um (equipSkin/equippedSkin), sem misturar", () => {
  const st = R.createStore(memStorage());
  st.addTreats("Totó", 100);
  assert.ok(st.buySkin("Totó", "cinza", 10).ok && st.buySkin("Totó", "pirata", 10, "cat").ok && st.buySkin("Totó", "preto", 10, "cat").ok);
  assert.strictEqual(st.equippedSkin("Totó"), "", "o padrão");
  assert.strictEqual(st.equippedSkin("Totó", "cat"), "");
  assert.strictEqual(st.equipSkin("Totó", "pirata"), null, "o Cachorrinho não tem a skin pirata (só o gato)");
  assert.strictEqual(st.equipSkin("Totó", "cinza", "cat"), null, "o Gatinho não tem a skin cinza (só o cachorro)");
  assert.strictEqual(st.equipSkin("Totó", "x", "Cat"), null, "bichinho inválido");
  assert.strictEqual(st.equipSkin("Totó", "Cinza", "cat"), null, "id inválido");
  assert.strictEqual(st.equipSkin("", "preto", "cat"), null, "sem nome");
  assert.strictEqual(st.equipSkin("Totó", "pirata", "cat").equipped, "pirata");
  assert.strictEqual(st.equippedSkin("Totó", "cat"), "pirata");
  assert.strictEqual(st.equippedSkin("Totó"), "", "usar uma skin do gato não muda a do cachorro");
  assert.strictEqual(st.equipSkin("Totó", "cinza").equipped, "cinza");
  assert.strictEqual(st.equippedSkin("Totó", "cat"), "pirata", "e usar uma do cachorro não muda a do gato");
  assert.strictEqual(st.equipSkin("Totó", "preto", "cat").equipped, "preto");
  assert.strictEqual(st.equipSkin("Totó", "", "cat").equipped, "", "'' volta à skin padrão do gato");
  assert.strictEqual(st.equippedSkin("Totó"), "cinza");
  assert.strictEqual(st.equippedSkin("Ninguém", "cat"), "");
  assert.strictEqual(st.equippedSkin("", "cat"), "");
  assert.strictEqual(st.equippedSkin("Totó", "Cat"), "", "bichinho inválido: padrão");
  assert.strictEqual(st.equippedSkin("Totó", "bird"), "", "um bichinho que ainda não tem skins");
});

test("skins por bichinho: o que fica guardado — Cachorrinho IDÊNTICO ao de antes; os campos do gato só aparecem quando ele compra ou usa algo", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); add(st, 1, 20000); st.addTreats("Totó", 100); st.buySkin("Totó", "cinza", 10); st.equipSkin("Totó", "cinza");
  const before = JSON.stringify(JSON.parse(mem._m[KEY]).wallet);
  assert.strictEqual(before, JSON.stringify({ toto: { t: 90, own: ["cinza"], eq: "cinza" } }), "só o formato de sempre");
  // consultar a carteira do gato e equipar o padrão não grava nada novo
  st.wallet("Totó", "cat"); st.equippedSkin("Totó", "cat"); st.equipSkin("Totó", "", "cat");
  assert.strictEqual(JSON.stringify(JSON.parse(mem._m[KEY]).wallet), before, "nenhum campo do gato aparece sem compra nem uso");
  st.buySkin("Totó", "pirata", 30, "cat");
  assert.strictEqual(JSON.stringify(JSON.parse(mem._m[KEY]).wallet), JSON.stringify({ toto: { t: 60, own: ["cinza", "cat:pirata"], eq: "cinza" } }), "comprada: o id do gato fica com o prefixo, o resto igual");
  st.equipSkin("Totó", "pirata", "cat");
  assert.strictEqual(JSON.stringify(JSON.parse(mem._m[KEY]).wallet), JSON.stringify({ toto: { t: 60, own: ["cinza", "cat:pirata"], eq: "cinza", eqa: { cat: "pirata" } } }), "em uso: eqa.cat");
  st.equipSkin("Totó", "", "cat");
  assert.strictEqual(JSON.stringify(JSON.parse(mem._m[KEY]).wallet), JSON.stringify({ toto: { t: 60, own: ["cinza", "cat:pirata"], eq: "cinza" } }), "volta ao padrão: eqa some");
  // e o que está guardado volta igual ao recarregar
  st.equipSkin("Totó", "pirata", "cat");
  const again = R.createStore(mem);
  assert.deepStrictEqual(again.wallet("Totó"), { treats: 60, owned: ["cinza"], equipped: "cinza" });
  assert.deepStrictEqual(again.wallet("Totó", "cat"), { treats: 60, owned: ["pirata"], equipped: "pirata" });
  assert.strictEqual(again.equippedSkin("Totó", "cat"), "pirata");
});

test("skins por bichinho: o jogador que só tem coisas do Cachorrinho guarda exatamente o JSON de sempre, mesmo usando a lojinha e o jogo do Gatinho", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); st.addTreats("Totó", 3); st.game("cat").completeLevel("Totó", 1); st.setAnimal("Totó", "cat"); st.setAnimal("Totó", "dog");
  assert.deepStrictEqual(JSON.parse(mem._m[KEY]).wallet, { toto: { t: 3, own: [], eq: "" } });
});

test("skins por bichinho: dados adulterados (ids desconhecidos, tipos errados, 'cat:' sem skin, prefixo do cachorro) são ignorados sem derrubar nada", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); st.addTreats("Totó", 7);
  rewrite(mem, (raw) => {
    raw.wallet = {
      a: { t: 5, own: ["cat:preto", "cat:", "cat:Preto", "cat: x", ":preto", "dog:cinza", "CAT:preto", "cat:cat:x", "cat", "gato-demais-" + "x".repeat(30), "cat:" + "y".repeat(30), "cat:preto", "bird:pena"], eq: "cat:preto", eqa: { cat: "preto" } },
      b: { t: 5, own: ["cat:preto"], eq: "", eqa: { cat: "branco" } },
      c: { t: 5, own: ["cat:preto"], eq: "", eqa: ["preto"] },
      d: { t: 5, own: ["cat:preto"], eq: "", eqa: "preto" },
      e: { t: 5, own: ["cat:preto"], eq: "", eqa: { cat: 5, dog: "preto", Cat: "preto", "": "preto", c: "preto" } },
      f: { t: 5, own: ["cat:preto", "cinza"], eq: "", eqa: { cat: ["preto"] } },
      g: { t: 5, own: ["cat:preto"], eq: "", eqa: null },
      h: { t: 5, own: ["cat:a-b-1"], eq: "", eqa: { cat: "a-b-1", bird: "x" } },
    };
  });
  const again = R.createStore(mem);
  assert.deepStrictEqual(again.wallet("a"), { treats: 5, owned: ["cat"], equipped: "" }, "a skin em uso do cachorro não pode ser 'cat:preto' (e 'cat' sem os dois-pontos é só um id puro do cachorro)");
  assert.deepStrictEqual(again.wallet("a", "cat"), { treats: 5, owned: ["preto"], equipped: "preto" }, "só a 'cat:preto' válida fica; as outras caem");
  assert.deepStrictEqual(again.wallet("a", "bird"), { treats: 5, owned: ["pena"], equipped: "" }, "um bichinho futuro com id certo fica guardado");
  assert.deepStrictEqual(again.wallet("b", "cat"), { treats: 5, owned: ["preto"], equipped: "" }, "skin em uso que o jogador não tem");
  assert.strictEqual(again.equippedSkin("c", "cat"), "", "eqa em lista");
  assert.strictEqual(again.equippedSkin("d", "cat"), "", "eqa em texto");
  assert.strictEqual(again.equippedSkin("e", "cat"), "", "eqa com tipos errados e bichinhos inválidos");
  assert.strictEqual(again.equippedSkin("f", "cat"), "");
  assert.strictEqual(again.equippedSkin("g", "cat"), "");
  assert.deepStrictEqual(again.wallet("f"), { treats: 5, owned: ["cinza"], equipped: "" });
  assert.deepStrictEqual(again.wallet("h", "cat"), { treats: 5, owned: ["a-b-1"], equipped: "a-b-1" });
  assert.strictEqual(again.wallet("h", "bird").equipped, "", "'bird' em uso sem a skin bird:x");
  // o resto continua funcionando e regrava o formato certo
  assert.strictEqual(again.addTreats("a", 1).treats, 6);
  assert.strictEqual(again.addTreats("c", 1).treats, 6);
  const raw = JSON.parse(mem._m[KEY]);
  assert.deepStrictEqual(raw.wallet.a, { t: 6, own: ["cat:preto", "cat", "bird:pena"], eq: "", eqa: { cat: "preto" } });
  assert.deepStrictEqual(raw.wallet.c, { t: 6, own: ["cat:preto"], eq: "" });
  // eqa com texto, número, lista ou null no lugar do mapa inteiro de carteiras, e carteira de bichinho em jogador sem nada
  for (const bad of ["x", 5, [1], null]) {
    rewrite(mem, (r) => { r.wallet = { toto: { t: 2, own: ["cat:preto"], eq: "", eqa: bad } }; });
    const s2 = R.createStore(mem);
    assert.deepStrictEqual(s2.wallet("Totó", "cat"), { treats: 2, owned: ["preto"], equipped: "" }, `eqa = ${JSON.stringify(bad)}`);
  }
});

test("skins por bichinho: nomes perigosos (__proto__, constructor) não viram skin nem bichinho", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.addTreats("Totó", 50);
  for (const a of ["__proto__", "constructor", "toString", "hasOwnProperty"]) {
    const r = st.buySkin("Totó", "preto", 10, a);
    if (a === "constructor") { assert.ok(r.ok, "'constructor' é um nome de bichinho válido (letras minúsculas): fica guardado com prefixo"); assert.deepStrictEqual(st.wallet("Totó", a).owned, ["preto"]); assert.strictEqual(st.equipSkin("Totó", "preto", a).equipped, "preto"); }
    else assert.deepStrictEqual(r, { ok: false, error: "invalid" }, a);
  }
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 40, owned: [], equipped: "" });
  const again = R.createStore(mem);
  assert.strictEqual(again.equippedSkin("Totó", "constructor"), "preto", "e volta certo ao recarregar");
  assert.strictEqual(({}).preto, undefined, "o protótipo de objetos não foi sujo");
});

test("skins por bichinho: limite de 60 skins por jogador vale para o total (Cachorrinho + Gatinho)", () => {
  const st = R.createStore(memStorage());
  st.addTreats("Totó", 1000); st.addTreats("Totó", 1000);
  for (let i = 0; i < 30; i++) assert.ok(st.buySkin("Totó", "s" + i, 10).ok);
  for (let i = 0; i < 30; i++) assert.ok(st.buySkin("Totó", "s" + i, 10, "cat").ok, "o mesmo id no gato é outra skin: " + i);
  assert.deepStrictEqual(st.buySkin("Totó", "s30", 10, "cat"), { ok: false, error: "invalid" }, "a 61ª não cabe, de qualquer bichinho");
  assert.deepStrictEqual(st.buySkin("Totó", "s30", 10), { ok: false, error: "invalid" });
  assert.strictEqual(st.wallet("Totó").owned.length, 30);
  assert.strictEqual(st.wallet("Totó", "cat").owned.length, 30);
});

test("skins por bichinho: duas abas continuam consistentes (saldo único, compras e skin em uso do gato aparecem nas duas)", () => {
  const mem = memStorage(), A = R.createStore(mem), B = R.createStore(mem);
  A.setPlayer("Totó"); A.addTreats("Totó", 40);
  assert.strictEqual(B.wallet("Totó", "cat").treats, 40, "a B vê os petiscos da A");
  assert.ok(B.buySkin("Totó", "preto", 10, "cat").ok);
  assert.deepStrictEqual(A.buySkin("Totó", "preto", 10, "cat"), { ok: false, error: "owned" }, "a A (tela velha) não compra de novo a skin do gato que a B comprou");
  assert.deepStrictEqual(A.wallet("Totó", "cat"), { treats: 30, owned: ["preto"], equipped: "" }, "e vê o saldo certo (30)");
  assert.ok(A.buySkin("Totó", "preto", 10).ok, "a mesma id no Cachorrinho ainda é comprável");
  A.equipSkin("Totó", "preto", "cat");
  assert.strictEqual(B.equippedSkin("Totó", "cat"), "preto", "a skin em uso do gato muda nas duas abas");
  assert.strictEqual(B.equippedSkin("Totó"), "", "e a do cachorro não");
  B.equipSkin("Totó", "preto");
  assert.strictEqual(A.equippedSkin("Totó"), "preto");
  assert.strictEqual(A.equippedSkin("Totó", "cat"), "preto");
  assert.deepStrictEqual(R.createStore(mem).wallet("Totó", "cat"), { treats: 20, owned: ["preto"], equipped: "preto" });
  // uma aba apaga a conta: a outra vê tudo (inclusive o gato) apagado
  B.deleteAccount("Totó");
  assert.deepStrictEqual(A.wallet("Totó", "cat"), EMPTY);
  assert.deepStrictEqual(A.wallet("Totó"), EMPTY);
  assert.deepStrictEqual(A.buySkin("Totó", "preto", 10, "cat"), { ok: false, error: "funds" });
});

test("skins por bichinho: apagar a conta apaga as skins do gato junto (não sobra campo no armazenamento)", () => {
  const mem = memStorage(), st = R.createStore(mem);
  st.setPlayer("Totó"); st.addTreats("Totó", 50); st.buySkin("Totó", "preto", 10, "cat"); st.equipSkin("Totó", "preto", "cat"); st.addTreats("Ana", 9);
  assert.ok(JSON.stringify(JSON.parse(mem._m[KEY]).wallet).includes("cat:preto"));
  st.deleteAccount("Totó");
  assert.ok(!/preto/.test(mem._m[KEY]), "nenhuma skin do gato fica guardada");
  assert.deepStrictEqual(Object.keys(JSON.parse(mem._m[KEY]).wallet), ["ana"], "a carteira dos outros fica");
  assert.deepStrictEqual(st.wallet("Totó", "cat"), EMPTY);
});

test("skins por bichinho: quem chama não mexe na carteira guardada mudando o que recebeu (também a do gato)", () => {
  const st = R.createStore(memStorage());
  st.addTreats("Totó", 30); const b = st.buySkin("Totó", "preto", 10, "cat");
  b.wallet.owned.push("branco"); b.wallet.treats = 999; b.wallet.equipped = "branco";
  const w = st.wallet("Totó", "cat"); w.owned.length = 0; w.equipped = "x";
  assert.deepStrictEqual(st.wallet("Totó", "cat"), { treats: 20, owned: ["preto"], equipped: "" });
  const e = st.equipSkin("Totó", "preto", "cat"); e.owned.length = 0;
  assert.deepStrictEqual(st.wallet("Totó", "cat"), { treats: 20, owned: ["preto"], equipped: "preto" });
});

test("skins por bichinho: com armazenamento ausente ou quebrado funciona só na memória", () => {
  const broken = { getItem() { throw new Error("sem acesso"); }, setItem() { throw new Error("cheio"); }, removeItem() { throw new Error("sem acesso"); } };
  for (const storage of [null, undefined, broken]) {
    const st = R.createStore(storage);
    st.addTreats("Totó", 20);
    assert.ok(st.buySkin("Totó", "preto", 10, "cat").ok && st.equipSkin("Totó", "preto", "cat").equipped === "preto");
    assert.deepStrictEqual(st.wallet("Totó", "cat"), { treats: 10, owned: ["preto"], equipped: "preto" });
    assert.deepStrictEqual(R.createStore(storage).wallet("Totó", "cat"), EMPTY);
  }
});

test("skins por bichinho: a carteira do cachorrinho de dados antigos (sem eqa nem prefixos) continua igual, com ou sem o campo animal", () => {
  const raw = JSON.stringify({ v: 2, player: "Totó", players: ["Totó"], bests: {}, progress: {}, accounts: {}, wallet: { toto: { t: 12, own: ["cinza", "dalmata"], eq: "dalmata" } } });
  const st = R.createStore(memStorage({ [KEY]: raw }));
  assert.deepStrictEqual(st.wallet("Totó"), { treats: 12, owned: ["cinza", "dalmata"], equipped: "dalmata" });
  assert.deepStrictEqual(st.wallet("Totó", "dog"), { treats: 12, owned: ["cinza", "dalmata"], equipped: "dalmata" });
  assert.deepStrictEqual(st.wallet("Totó", "cat"), { treats: 12, owned: [], equipped: "" });
  assert.strictEqual(st.equippedSkin("Totó"), "dalmata");
});

Promise.all(pending).then(() => {
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes unitários passaram");
  process.exit(failed ? 1 : 0);
});
