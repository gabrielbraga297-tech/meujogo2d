// Testes unitários do cadastro simples (usuário e senha), sem navegador. Uso: node tests/accounts.test.js
const assert = require("assert");
const R = require("../js/records.js");

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
const memStorage = (init = {}) => {
  const m = { ...init };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, _m: m };
};
const fast = { authOptions: { iterations: 2000 } };            // poucas iterações: testes rápidos
const mk = (st = memStorage(), o = {}) => R.createStore(st, { ...fast, ...o });

(async () => {
  await test("isValidName: aceita o nome como está; recusa o que precisaria ser 'consertado'", () => {
    for (const ok of ["Totó", "Rex", "Mel Bela", "Rex-2", "D'Artagnan", "a", "A".repeat(16)]) assert.ok(R.isValidName(ok), ok);
    for (const bad of ["", " ", "Totó!", "<b>Rex</b>", "A".repeat(17), "---", "Rex_1", "Re\nx", 5, null]) assert.ok(!R.isValidName(bad), String(bad));
    assert.ok(R.isValidName("  Rex  "), "espaços nas pontas são ignorados");
  });

  await test("cadastro: cria a conta, já entra e guarda só sal e impressão (nunca a senha)", async () => {
    const st = memStorage(), s = mk(st);
    const r = await s.register("Totó", "Segredo#Forte-20");
    assert.deepStrictEqual({ ok: r.ok, name: r.name }, { ok: true, name: "Totó" });
    assert.ok(s.hasAccount("totó") && s.hasAccount("TOTO") && s.isLoggedIn());
    assert.strictEqual(s.player(), "Totó");
    for (const v of Object.values(st._m)) assert.ok(!v.includes("Segredo"), "a senha apareceu no armazenamento");
    const acc = JSON.parse(st._m["cachorrinho.v1"]).accounts.toto;
    assert.deepStrictEqual(Object.keys(acc).sort(), ["a", "c", "h", "i", "n", "s"]);
    assert.strictEqual(acc.a, "pbkdf2-sha256");
  });
  await test("cadastro: a conta e o login sobrevivem a recarregar", async () => {
    const st = memStorage();
    await mk(st).register("Totó", "Senha123");
    const again = mk(st);
    assert.ok(again.hasAccount("Totó"));
    assert.strictEqual(again.player(), "Totó");
    assert.deepStrictEqual(again.accountNames(), ["Totó"]);
  });
  await test("cadastro: recusa nome inválido, senha curta/longa/inválida e nome já usado", async () => {
    const s = mk();
    assert.deepStrictEqual(await s.register("Totó!", "Senha123"), { ok: false, error: "name" });
    assert.deepStrictEqual(await s.register("", "Senha123"), { ok: false, error: "name" });
    assert.deepStrictEqual(await s.register("Totó", "abc"), { ok: false, error: "password", reason: "short" });
    assert.deepStrictEqual(await s.register("Totó", "x".repeat(21)), { ok: false, error: "password", reason: "long" });
    assert.deepStrictEqual(await s.register("Totó", "abc\ndef"), { ok: false, error: "password", reason: "invalid" });
    assert.deepStrictEqual(await s.register("Totó", ""), { ok: false, error: "password", reason: "empty" });
    assert.ok(!s.hasAccount("Totó"), "nada foi criado");
    assert.ok((await s.register("Totó", "Senha123")).ok);
    assert.deepStrictEqual(await s.register("toto", "Outra1234"), { ok: false, error: "taken" }, "Totó = toto = TOTÓ");
    assert.deepStrictEqual(await s.register("TOTÓ", "Outra1234"), { ok: false, error: "taken" });
  });
  await test("senhas variadas são aceitas (minúsculas, MAIÚSCULAS, números e símbolos, com ou sem eles) e entram depois", async () => {
    const s = mk();
    const pws = ["somenteminusculas", "SOMENTEMAIUSCULAS", "AbCdEfGh", "12345678", "ab12cd34", "!@#$%^&*()", "Com Espaço 1", "çãõ-ÉÜ#9", "x".repeat(20), "ab!!"];
    for (let i = 0; i < pws.length; i++) {
      const name = "Cao" + i;
      assert.ok((await s.register(name, pws[i])).ok, pws[i]);
      s.logout();
      assert.ok((await s.login(name, pws[i])).ok, "entrar com " + pws[i]);
    }
  });
  await test("cadastro de nomes que parecem propriedades de objeto (constructor, toString)", async () => {
    const s = mk();
    for (const nm of ["constructor", "toString", "hasOwnProperty"]) {
      assert.ok((await s.register(nm, "Senha123")).ok, nm);
      assert.ok(s.hasAccount(nm));
      s.logout();
      assert.ok((await s.login(nm, "Senha123")).ok, nm);
      assert.strictEqual((await s.login(nm, "errada1")).ok, false);
    }
  });
  await test("cadastros simultâneos do mesmo nome: só um vence", async () => {
    const s = mk();
    const [a, b] = await Promise.all([s.register("Rex", "Senha123"), s.register("rex", "Outra1234")]);
    assert.strictEqual([a, b].filter((r) => r.ok).length, 1);
    assert.strictEqual([a, b].find((r) => !r.ok).error, "taken");
    assert.strictEqual(s.accountNames().length, 1);
  });

  await test("entrar: senha certa entra; errada, usuário inexistente e senha vazia dão o mesmo erro", async () => {
    const s = mk(); await s.register("Totó", "Senha123"); s.logout();
    assert.strictEqual(s.player(), "");
    assert.deepStrictEqual(await s.login("Totó", "errada1"), { ok: false, error: "wrong" });
    assert.deepStrictEqual(await s.login("Fantasma", "Senha123"), { ok: false, error: "wrong" });
    assert.deepStrictEqual(await s.login("Totó", ""), { ok: false, error: "wrong" });
    assert.deepStrictEqual(await s.login("Totó", "senha123"), { ok: false, error: "wrong" }, "senha diferencia maiúsculas e minúsculas");
    assert.strictEqual(s.player(), "", "nada de entrar por engano");
    const ok = await s.login("TOTO", "Senha123");
    assert.deepStrictEqual({ ok: ok.ok, name: ok.name }, { ok: true, name: "Totó" });
    assert.strictEqual(s.player(), "Totó");
  });
  await test("bloqueio: 5 senhas erradas seguidas travam por 30 s (até com a senha certa); depois libera; a próxima rodada dobra", async () => {
    let t = 1000000;
    const s = mk(memStorage(), { now: () => t });
    await s.register("Totó", "Senha123"); s.logout();
    for (let i = 1; i <= 4; i++) assert.strictEqual((await s.login("Totó", "errada" + i)).error, "wrong");
    const fifth = await s.login("Totó", "errada5");
    assert.strictEqual(fifth.error, "locked");
    assert.ok(fifth.waitMs > 29000 && fifth.waitMs <= 30000);
    t += 10000;
    const during = await s.login("Totó", "Senha123");
    assert.strictEqual(during.error, "locked", "durante o bloqueio nem a senha certa entra");
    assert.ok(during.waitMs > 19000 && during.waitMs <= 20000);
    t += 20001;
    assert.ok((await s.login("Totó", "Senha123")).ok, "passado o tempo, a senha certa entra");
    s.logout();
    // sem acertar no meio, a rodada seguinte de erros trava por mais tempo (60 s)
    const u = mk(memStorage(), { now: () => t });
    await u.register("Rex", "Senha456"); u.logout();
    for (let i = 1; i <= 5; i++) await u.login("Rex", "e" + i);
    t += 30001;
    for (let i = 6; i <= 9; i++) assert.strictEqual((await u.login("Rex", "e" + i)).error, "wrong");
    const tenth = await u.login("Rex", "e10");
    assert.strictEqual(tenth.error, "locked");
    assert.ok(tenth.waitMs > 59000 && tenth.waitMs <= 60000, "segunda rodada: 60 s");
  });
  await test("bloqueio: acertar zera a contagem; o bloqueio é por jogador", async () => {
    const s = mk();
    await s.register("Totó", "Senha123"); await s.register("Rex", "Senha456"); s.logout();
    for (let i = 0; i < 4; i++) await s.login("Totó", "x" + i);
    assert.ok((await s.login("Totó", "Senha123")).ok); s.logout();
    for (let i = 0; i < 4; i++) assert.strictEqual((await s.login("Totó", "y" + i)).error, "wrong", "contagem recomeçou");
    for (let i = 0; i < 5; i++) await s.login("Rex", "z" + i);
    assert.strictEqual((await s.login("Rex", "Senha456")).error, "locked");
    assert.ok((await s.login("Totó", "Senha123")).ok, "Totó não é afetado pelo bloqueio do Rex");
  });

  await test("nome com senha só é usado depois de entrar: setPlayer é recusado", async () => {
    const s = mk(); await s.register("Totó", "Senha123");
    assert.strictEqual(s.setPlayer("Totó"), "Totó", "já está logado como Totó");
    s.logout();
    assert.strictEqual(s.setPlayer("Totó"), "", "sem entrar, não pode");
    assert.strictEqual(s.setPlayer("toto"), "");
    assert.strictEqual(s.player(), "");
    assert.strictEqual(s.setPlayer("Rex"), "Rex", "nomes sem senha continuam livres");
    assert.strictEqual(s.setPlayer("Totó"), "", "e trocar de Rex para Totó também pede a senha");
  });
  await test("sair mantém a conta, os recordes e o jogo salvo", async () => {
    const s = mk(); await s.register("Totó", "Senha123");
    s.addRun({ level: 1, timeMs: 25000, points: 590 }); s.saveGame("Totó", { a: 1 }); s.completeLevel("Totó", 1);
    s.logout();
    assert.ok(!s.isLoggedIn() && s.hasAccount("Totó"));
    assert.ok((await s.login("Totó", "Senha123")).ok);
    assert.strictEqual(s.personalBest("Totó", 1).p, 590);
    assert.strictEqual(s.loadGame("Totó").snap.a, 1);
    assert.deepStrictEqual(s.progress("Totó").completed, [1]);
  });
  await test("uma conta pode 'adotar' um nome que já tinha pontuações sem senha", async () => {
    const s = mk(); s.setPlayer("Rex"); s.addRun({ level: 1, timeMs: 20000, points: 600 }); s.logout();
    assert.ok((await s.register("rex", "Senha123")).ok);
    assert.strictEqual(s.player(), "Rex", "mantém a grafia que já existia");
    assert.strictEqual(s.personalBest("Rex", 1).p, 600);
  });

  await test("esqueci a senha: apagar a conta remove conta, pontuações, progresso e jogo salvo só desse jogador", async () => {
    const st = memStorage(), s = mk(st);
    await s.register("Totó", "Senha123"); s.addRun({ level: 1, timeMs: 25000, points: 590 }); s.saveGame("Totó", { a: 1 }); s.completeLevel("Totó", 1); s.logout();
    s.setPlayer("Rex"); s.addRun({ level: 1, timeMs: 20000, points: 600 }); s.saveGame("Rex", { a: 2 });
    assert.ok(s.deleteAccount("Totó"));
    assert.ok(!s.hasAccount("Totó") && !s.hasGame("Totó"));
    assert.strictEqual(s.personalBest("Totó", 1), null);
    assert.deepStrictEqual(s.progress("Totó"), { unlocked: 1, completed: [] });
    assert.ok(!s.players().includes("Totó"));
    assert.strictEqual(s.personalBest("Rex", 1).p, 600, "Rex não é afetado");
    assert.ok(s.hasGame("Rex"));
    assert.ok(!mk(st).hasAccount("Totó"), "e continua apagado depois de recarregar");
    assert.ok((await s.register("Totó", "NovaSenha1")).ok, "o nome pode ser usado de novo");
    assert.strictEqual(s.personalBest("Totó", 1), null, "começa do zero");
  });
  await test("apagar a conta do jogador atual também o desconecta", async () => {
    const s = mk(); await s.register("Totó", "Senha123");
    s.deleteAccount("Totó");
    assert.strictEqual(s.player(), "");
  });

  await test("a versão em JS e a nativa são intercambiáveis entre cadastro e entrada", async () => {
    const st = memStorage();
    const a = R.createStore(st, { authOptions: { iterations: 3000, forceJs: true } });
    await a.register("Totó", "Compat#1"); a.logout();
    const b = R.createStore(st, { authOptions: { iterations: 3000 } });
    assert.ok((await b.login("Totó", "Compat#1")).ok, "criada em JS, usada com WebCrypto");
    await b.register("Rex", "Compat#2"); b.logout();
    const c = R.createStore(st, { authOptions: { forceJs: true } });
    assert.ok((await c.login("Rex", "Compat#2")).ok, "criada com WebCrypto, usada em JS");
  });
  await test("contas adulteradas ou corrompidas no armazenamento são descartadas sem quebrar", async () => {
    const good = (() => { const st = memStorage(); return mk(st).register("Totó", "Senha123").then(() => JSON.parse(st._m["cachorrinho.v1"]).accounts.toto); })();
    const acc = await good;
    const mkData = (accounts) => JSON.stringify({ player: "Totó", accounts });
    for (const bad of [{ toto: { ...acc, s: "zz" } }, { toto: { ...acc, h: "00" } }, { toto: { ...acc, i: 5 } }, { toto: { ...acc, a: "md5" } }, { rex: acc }, { toto: null }, { toto: "x" }, "texto", 5, [acc]]) {
      const s = mk(memStorage({ "cachorrinho.v1": mkData(bad) }));
      assert.ok(!s.hasAccount("Totó"), JSON.stringify(bad).slice(0, 40));
    }
    assert.ok(mk(memStorage({ "cachorrinho.v1": mkData({ toto: acc }) })).hasAccount("Totó"), "o registro bom é mantido");
    assert.doesNotThrow(() => mk(memStorage({ "cachorrinho.v1": "{x" })));
  });
  await test("sem armazenamento persistente: a conta existe só na sessão (e avisa pelo retorno)", async () => {
    const s = R.createStore(null, fast);
    const r = await s.register("Totó", "Senha123");
    assert.ok(r.ok && r.persistent === false);
    s.logout();
    assert.ok((await s.login("Totó", "Senha123")).ok);
  });
  await test("senha nunca aparece no armazenamento nem depois de várias operações", async () => {
    const st = memStorage(), s = mk(st);
    await s.register("Totó", "UmaSenhaBemSecreta!"); s.addRun({ level: 1, timeMs: 25000, points: 590 }); s.saveGame("Totó", { a: 1 }); s.logout();
    await s.login("Totó", "UmaSenhaBemSecreta!"); await s.login("Totó", "erradaErrada");
    for (const [k, v] of Object.entries(st._m)) assert.ok(!v.includes("BemSecreta") && !k.includes("BemSecreta"), k);
  });

  // ---------- duas abas ----------
  await test("duas abas: contas criadas em abas diferentes convivem; apagar numa vale na outra; entrar com conta já apagada falha", async () => {
    const st = memStorage();
    const a = mk(st), b = mk(st);
    assert.ok((await a.register("Ana", "SenhaAna1")).ok);
    assert.ok((await b.register("Bia", "SenhaBia1")).ok, "a aba velha não apaga a conta que a outra criou");
    const c = mk(st);
    assert.deepStrictEqual(c.accountNames().sort(), ["Ana", "Bia"]);
    assert.ok(a.hasAccount("Bia") && b.hasAccount("Ana"), "cada aba enxerga a conta da outra");
    assert.deepStrictEqual((await b.register("Ana", "OutraSenha1")).error, "taken", "o nome já tem conta (criada em outra aba)");
    a.deleteAccount("Ana");
    assert.ok(!b.hasAccount("Ana") && !mk(st).hasAccount("Ana"), "conta apagada numa aba some nas outras");
    assert.strictEqual((await b.login("Ana", "SenhaAna1")).ok, false, "entrar numa conta apagada falha");
    assert.ok((await b.login("Bia", "SenhaBia1")).ok && mk(st).hasAccount("Bia"));
  });
  await test("duas abas: login já em andamento é descartado se a conta for apagada durante a espera da senha", async () => {
    const st = memStorage();
    const a = mk(st), b = mk(st);
    await a.register("Ana", "SenhaAna1"); a.logout();
    const p = b.login("Ana", "SenhaAna1"); // aguardando o cálculo da senha...
    a.deleteAccount("Ana");               // ...e outra aba apaga a conta
    assert.strictEqual((await p).ok, false);
    assert.strictEqual(mk(st).player(), "");
  });

  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de contas passaram");
  process.exit(failed ? 1 : 0);
})();
