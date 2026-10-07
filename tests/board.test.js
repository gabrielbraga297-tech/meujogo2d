// Testes unitários do ranking compartilhado (js/board.js), sem navegador. Uso: node tests/board.test.js
const assert = require("assert");
const http = require("http");
const R = require("../js/records.js");
const Board = require("../js/board.js");

let failed = 0;
const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (cond, ms = 2000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Error("tempo esgotado esperando a condição"); await sleep(10); } };

const LEVELS = [1, 2];
const mkStore = () => R.createStore(null);
const addRun = (store, name, level, points, timeMs) => { store.setPlayer(name); return store.addRun({ level, points, timeMs }); };
const row = (n, l, p, t) => ({ n, l, p, t, w: 1 });

// ---------- servidor REST no estilo Firebase Realtime Database ----------
function startServer({ fail = false } = {}) {
  const db = { scores: null };
  const log = [];
  const srv = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
    if (srv.fail) { res.writeHead(500).end("erro"); return; }
    const path = decodeURIComponent(req.url.split("?")[0]).replace(/^\/rank\//, "").replace(/\.json$/, "").split("/").filter(Boolean);
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      log.push(`${req.method} ${path.join("/")}`);
      let node = db;
      if (req.method === "PUT") {
        for (let i = 0; i < path.length - 1; i++) node = node[path[i]] || (node[path[i]] = {});
        node[path[path.length - 1]] = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" }).end(body);
        return;
      }
      for (const k of path) node = node && typeof node === "object" ? node[k] : undefined;
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(node === undefined ? null : node));
    });
  });
  srv.fail = fail;
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve({ srv, db, log, url: `http://127.0.0.1:${srv.address().port}/rank`, close: () => new Promise((r) => srv.close(r)) })));
}

// ---------- banco compartilhado do Claude (falso) ----------
function fakeClaude({ uid = "u1", dbNull = false, docs = {}, delay = 0 } = {}) {
  const state = { docs, sets: [], busy: 0, maxBusy: 0 };
  const snapOf = (id, d) => ({ id, exists: d !== undefined, data: () => d });
  const db = {
    collection: (c) => ({ get: async () => ({ docs: Object.entries(state.docs).filter(([p]) => p.startsWith(c + "/")).map(([p, d]) => snapOf(p.split("/")[1], d)) }) }),
    doc: (p) => ({
      get: async () => snapOf(p.split("/")[1], state.docs[p]),
      set: async (d) => {
        state.busy++; state.maxBusy = Math.max(state.maxBusy, state.busy);
        await sleep(delay);
        state.docs[p] = JSON.parse(JSON.stringify(d)); state.sets.push(p);
        state.busy--;
      },
    }),
  };
  const user = { id: async () => uid };
  return { state, use: async (n) => (n === "db" ? (dbNull ? null : db) : n === "user" ? user : null) };
}

// ---------- validação e resumo ----------
test("cleanRow aceita linhas válidas (inclusive pontuação negativa) e recusa lixo", () => {
  const set = new Set(LEVELS);
  assert.deepStrictEqual(Board.cleanRow(set, 1, { n: "Totó", p: -50, t: 12345, w: 9 }), { n: "Totó", l: 1, p: -50, t: 12345, w: 9 });
  assert.strictEqual(Board.cleanRow(set, 3, row("Totó", 3, 100, 1000)), null, "fase desconhecida");
  assert.strictEqual(Board.cleanRow(set, 1, row("<b>Rex</b>", 1, 100, 1000)), null, "nome com símbolos");
  assert.strictEqual(Board.cleanRow(set, 1, row("A".repeat(40), 1, 100, 1000)), null, "nome comprido demais");
  assert.strictEqual(Board.cleanRow(set, 1, row("Rex", 1, 1.5, 1000)), null, "pontos não inteiros");
  assert.strictEqual(Board.cleanRow(set, 1, row("Rex", 1, 10 ** 9, 1000)), null, "pontos absurdos");
  assert.strictEqual(Board.cleanRow(set, 1, row("Rex", 1, 100, 0)), null, "tempo zero");
  assert.strictEqual(Board.cleanRow(set, 1, row("Rex", 1, 100, 10 ** 12)), null, "tempo absurdo");
  assert.strictEqual(Board.cleanRow(set, 1, null), null);
  assert.strictEqual(Board.cleanRow(set, 1, "texto"), null);
});

test("summarize: só a melhor de cada jogador em cada fase; fases diferentes somam", () => {
  const rows = [row("Ana", 1, 500, 30000), row("Ana", 1, 590, 25000), row("ana", 1, 590, 20000), row("Ana", 2, 700, 50000), row("Bia", 1, 600, 18000), row("Cid", 2, -50, 99000)];
  const s = Board.summarize(rows, LEVELS);
  assert.deepStrictEqual(s.levels[1].map((r) => `${r.n}:${r.p}:${r.t}`), ["Bia:600:18000", "ana:590:20000"], "uma linha por jogador, a melhor (empate: menor tempo)");
  assert.deepStrictEqual(s.levels[2].map((r) => `${r.n}:${r.p}`), ["Ana:700", "Cid:-50"], "pontuação negativa entra no ranking");
  assert.deepStrictEqual(s.totals.map((r) => `${r.n.toLowerCase()}:${r.total}`), ["ana:1290", "bia:600", "cid:-50"], "total = melhor de cada fase somada");
});

test("summarize: no máximo 10 linhas por ranking", () => {
  const rows = Array.from({ length: 25 }, (_, i) => row("Jogador" + i, 1, 100 + i, 10000));
  const s = Board.summarize(rows, LEVELS);
  assert.strictEqual(s.levels[1].length, 10);
  assert.strictEqual(s.totals.length, 10);
  assert.strictEqual(s.levels[1][0].p, 124);
});

// ---------- só neste aparelho ----------
test("sem servidor: localAll mostra só o aparelho e submit/fetchAll não fazem nada de rede", async () => {
  const st = mkStore();
  addRun(st, "Totó", 1, 590, 22000);
  const b = Board.create({ store: st, levels: LEVELS, config: {}, claude: null, fetch: null });
  assert.strictEqual(b.hasServer, false);
  const l = b.localAll();
  assert.strictEqual(l.shared, false);
  assert.strictEqual(l.levels[1][0].n, "Totó");
  assert.strictEqual(await b.submit({ name: "Totó", level: 1, points: 590, timeMs: 22000 }), false);
  const f = await b.fetchAll();
  assert.strictEqual(f.shared, false);
  assert.strictEqual(f.levels[1].length, 1);
});

// ---------- servidor REST ----------
test("REST: submit grava só se for melhor (nunca piora a melhor do servidor)", async () => {
  const S = await startServer();
  try {
    const b = Board.create({ store: mkStore(), levels: LEVELS, config: { rankingUrl: S.url }, claude: null });
    assert.strictEqual(b.hasServer, true);
    assert.strictEqual(await b.submit({ name: "Ana", level: 1, points: 590, timeMs: 25000 }), true);
    assert.strictEqual(S.db.scores[1].ana.p, 590);
    const puts = () => S.log.filter((x) => x.startsWith("PUT")).length;
    assert.strictEqual(puts(), 1);
    await b.submit({ name: "Ana", level: 1, points: 500, timeMs: 10000 });
    assert.strictEqual(puts(), 1, "pior: não grava");
    await b.submit({ name: "ana", level: 1, points: 590, timeMs: 25000 });
    assert.strictEqual(puts(), 1, "igual: não grava");
    await b.submit({ name: "Ana", level: 1, points: 590, timeMs: 20000 });
    assert.strictEqual(S.db.scores[1].ana.t, 20000, "mesma pontuação em menos tempo vale");
    await b.submit({ name: "Ana", level: 1, points: 600, timeMs: 30000 });
    assert.strictEqual(S.db.scores[1].ana.p, 600);
    assert.deepStrictEqual(Object.keys(S.db.scores[1]), ["ana"], "uma única entrada por jogador e fase (sem histórico)");
    await b.submit({ name: "Ana", level: 2, points: -50, timeMs: 80000 });
    assert.strictEqual(S.db.scores[2].ana.p, -50, "pontuação negativa também é registrada");
  } finally { await S.close(); }
});

test("REST: jogadores de aparelhos diferentes veem o mesmo ranking (só a melhor de cada um)", async () => {
  const S = await startServer();
  try {
    const cfg = { rankingUrl: S.url };
    const stA = mkStore(), stB = mkStore();
    addRun(stA, "Ana", 1, 590, 25000);
    const A = Board.create({ store: stA, levels: LEVELS, config: cfg, claude: null });
    const Bd = Board.create({ store: stB, levels: LEVELS, config: cfg, claude: null });
    await A.submit({ name: "Ana", level: 1, points: 590, timeMs: 25000 });
    addRun(stB, "Bia", 1, 600, 18000);
    await Bd.submit({ name: "Bia", level: 1, points: 600, timeMs: 18000 });
    const vb = await Bd.fetchAll();
    assert.strictEqual(vb.shared, true);
    assert.ok(/127\.0\.0\.1/.test(vb.label));
    assert.deepStrictEqual(vb.levels[1].map((r) => r.n), ["Bia", "Ana"], "o aparelho B vê a Ana, que jogou no aparelho A");
    const va = await A.fetchAll();
    assert.deepStrictEqual(va.levels[1].map((r) => r.n), ["Bia", "Ana"], "e o A vê a Bia");
    assert.deepStrictEqual(va.totals.map((r) => `${r.n}:${r.total}`), ["Bia:600", "Ana:590"]);
    // o aparelho A não passa a ter dados da Bia no próprio armazenamento (só o ranking compartilhado mostra)
    assert.strictEqual(stA.personalBest("Bia", 1), null);
  } finally { await S.close(); }
});

test("REST: fetchAll envia ao servidor as melhores pontuações locais que ele ainda não tem", async () => {
  const S = await startServer();
  try {
    const st = mkStore();
    addRun(st, "Rex", 1, 500, 40000); addRun(st, "Mel", 2, 610, 30000);
    S.db.scores = { 1: { rex: { n: "Rex", p: 700, t: 20000, w: 1 } } }; // o servidor já tem uma pontuação melhor do Rex
    const b = Board.create({ store: st, levels: LEVELS, config: { rankingUrl: S.url }, claude: null });
    const f = await b.fetchAll();
    assert.strictEqual(f.levels[1][0].p, 700, "vale a melhor (a do servidor)");
    await until(() => S.db.scores[2] && S.db.scores[2].mel);
    assert.strictEqual(S.db.scores[2].mel.p, 610, "a da Mel (só local) foi enviada");
    assert.strictEqual(S.db.scores[1].rex.p, 700, "a pior local não sobrescreve");
  } finally { await S.close(); }
});

test("REST: linhas inválidas do servidor são ignoradas", async () => {
  const S = await startServer();
  try {
    S.db.scores = {
      1: { ok: { n: "Boa", p: 300, t: 9000, w: 1 }, x1: { n: "<script>", p: 999, t: 1000, w: 1 }, x2: { n: "Hack", p: 10 ** 9, t: 1000, w: 1 }, x3: "lixo", x4: null, x5: { n: "SemTempo", p: 5 } },
      9: { z: { n: "FaseFalsa", p: 100, t: 1000, w: 1 } },
      abc: "lixo",
    };
    const b = Board.create({ store: mkStore(), levels: LEVELS, config: { rankingUrl: S.url }, claude: null });
    const f = await b.fetchAll();
    assert.deepStrictEqual(f.levels[1].map((r) => r.n), ["Boa"]);
    assert.deepStrictEqual(f.totals.map((r) => r.n), ["Boa"]);
  } finally { await S.close(); }
});

test("REST: servidor com erro ou fora do ar → volta ao ranking do aparelho, sem lançar erro", async () => {
  const st = mkStore();
  addRun(st, "Totó", 1, 590, 22000);
  const S = await startServer({ fail: true });
  const b = Board.create({ store: st, levels: LEVELS, config: { rankingUrl: S.url }, claude: null });
  let f = await b.fetchAll();
  assert.strictEqual(f.shared, false);
  assert.strictEqual(f.levels[1][0].n, "Totó");
  assert.strictEqual(await b.submit({ name: "Totó", level: 1, points: 590, timeMs: 22000 }), false);
  await S.close();
  f = await Board.create({ store: st, levels: LEVELS, config: { rankingUrl: S.url }, claude: null }).fetchAll(); // porta fechada
  assert.strictEqual(f.shared, false);
  assert.strictEqual(f.levels[1].length, 1);
});

test("REST: endereço inválido na configuração é ignorado", () => {
  for (const url of ["", "javascript:alert(1)", "ftp://x", "  ", null, 5]) {
    const b = Board.create({ store: mkStore(), levels: LEVELS, config: { rankingUrl: url }, claude: null });
    assert.strictEqual(b.hasServer, false, String(url));
  }
});

test("REST: nome com espaço/apóstrofo/acento vira um caminho seguro", async () => {
  const S = await startServer();
  try {
    const b = Board.create({ store: mkStore(), levels: LEVELS, config: { rankingUrl: S.url + "/" }, claude: null });
    await b.submit({ name: "D'Ávila Júnior", level: 1, points: 300, timeMs: 5000 });
    assert.deepStrictEqual(Object.keys(S.db.scores[1]), ["d'avila junior"]);
    assert.strictEqual(S.db.scores[1]["d'avila junior"].n, "D'Ávila Júnior");
  } finally { await S.close(); }
});

// ---------- banco compartilhado do Claude ----------
test("Claude db: submit grava um documento por visitante, só com a melhor de cada fase", async () => {
  const c = fakeClaude({ uid: "u1" });
  const b = Board.create({ store: mkStore(), levels: LEVELS, config: {}, claude: c });
  assert.strictEqual(b.hasServer, true);
  assert.strictEqual(await b.submit({ name: "Ana", level: 1, points: 590, timeMs: 25000 }), true);
  assert.deepStrictEqual(Object.keys(c.state.docs), ["scores/u1"]);
  await b.submit({ name: "Ana", level: 1, points: 500, timeMs: 1000 });
  assert.strictEqual(c.state.sets.length, 1, "pior: não grava de novo");
  await b.submit({ name: "Ana", level: 1, points: 600, timeMs: 30000 });
  await b.submit({ name: "Ana", level: 2, points: 700, timeMs: 60000 });
  const entries = c.state.docs["scores/u1"].entries;
  assert.deepStrictEqual(Object.keys(entries).sort(), ["1|ana", "2|ana"]);
  assert.strictEqual(entries["1|ana"].p, 600);
});

test("Claude db: fetchAll junta os documentos de todos os visitantes e ignora lixo", async () => {
  const c = fakeClaude({
    uid: "u1",
    docs: {
      "scores/u2": { entries: { "1|bia": { n: "Bia", l: 1, p: 650, t: 15000, w: 1 }, "1|x": { n: "<b>", l: 1, p: 1, t: 1, w: 1 }, "7|y": { n: "Y", l: 7, p: 1, t: 1000, w: 1 } } },
      "scores/u3": "lixo",
      "scores/u4": { entries: "lixo" },
    },
  });
  const st = mkStore();
  addRun(st, "Ana", 1, 590, 25000);
  const b = Board.create({ store: st, levels: LEVELS, config: {}, claude: c });
  const f = await b.fetchAll();
  assert.strictEqual(f.shared, true);
  assert.deepStrictEqual(f.levels[1].map((r) => r.n), ["Bia", "Ana"]);
  await until(() => c.state.docs["scores/u1"]);
  assert.strictEqual(c.state.docs["scores/u1"].entries["1|ana"].p, 590, "a pontuação local foi publicada no documento do visitante");
});

test("Claude db: gravações do mesmo documento não se sobrepõem", async () => {
  const c = fakeClaude({ uid: "u1", delay: 20 });
  const b = Board.create({ store: mkStore(), levels: LEVELS, config: {}, claude: c });
  await Promise.all([1, 2, 3, 4].map((i) => b.submit({ name: "Ana", level: 1, points: 100 * i, timeMs: 1000 * i })));
  assert.strictEqual(c.state.maxBusy, 1);
  assert.strictEqual(c.state.docs["scores/u1"].entries["1|ana"].p, 400);
});

test("Claude db: sem id de visitante só lê; sem banco volta ao aparelho", async () => {
  const c = fakeClaude({ uid: "", docs: { "scores/u2": { entries: { "1|bia": { n: "Bia", l: 1, p: 650, t: 15000, w: 1 } } } } });
  const b = Board.create({ store: mkStore(), levels: LEVELS, config: {}, claude: c });
  assert.deepStrictEqual((await b.fetchAll()).levels[1].map((r) => r.n), ["Bia"]);
  await b.submit({ name: "Ana", level: 1, points: 590, timeMs: 25000 });
  assert.strictEqual(c.state.sets.length, 0);

  const st = mkStore(); addRun(st, "Totó", 1, 590, 22000);
  const nb = Board.create({ store: st, levels: LEVELS, config: {}, claude: fakeClaude({ dbNull: true }) });
  const f = await nb.fetchAll();
  assert.strictEqual(f.shared, false);
  assert.strictEqual(f.levels[1][0].n, "Totó");
  assert.strictEqual(await nb.submit({ name: "Totó", level: 1, points: 590, timeMs: 22000 }), false);
});

test("REST + Claude juntos: os dois são consultados", async () => {
  const S = await startServer();
  try {
    S.db.scores = { 1: { rex: { n: "Rex", p: 400, t: 9000, w: 1 } } };
    const c = fakeClaude({ uid: "u1", docs: { "scores/u2": { entries: { "1|bia": { n: "Bia", l: 1, p: 650, t: 15000, w: 1 } } } } });
    const f = await Board.create({ store: mkStore(), levels: LEVELS, config: { rankingUrl: S.url }, claude: c }).fetchAll();
    assert.deepStrictEqual(f.levels[1].map((r) => r.n), ["Bia", "Rex"]);
    assert.ok(/127\.0\.0\.1/.test(f.label) && /Claude/.test(f.label));
  } finally { await S.close(); }
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
  }
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes do ranking passaram");
  process.exit(failed ? 1 : 0);
})();
