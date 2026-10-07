// Ranking do jogo (visível a todos): só a MELHOR pontuação de cada jogador em cada fase, sem histórico.
// Reúne o que há neste aparelho com o que vem de um servidor de ranking, para jogadores de aparelhos
// e logins diferentes verem a mesma tabela. Servidores aceitos:
//   1. REST no estilo Firebase Realtime Database (config.rankingUrl): GET .../scores.json e PUT .../scores/<fase>/<jogador>.json
//   2. Banco compartilhado do Claude (só dentro de uma página publicada no Claude, para quem tem permissão de escrita)
// Sem nenhum dos dois, o ranking mostra só os jogadores deste aparelho.
// Sem dependências do jogo: funciona no navegador (window.Board) e no Node (testes).
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Board = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const Records = typeof module === "object" && module.exports ? require("./records.js") : root.Records;
  const { isBetter, byBest, nameKey, sanitizeName, cleanBest } = Records;

  const TOP = 10;            // linhas mostradas em cada ranking
  const MAX_ROWS = 5000;     // o que passar disso, de um servidor, é ignorado
  const TIMEOUT_MS = 6000;   // espera máxima por uma resposta do servidor
  const MAX_PUSH = 40;       // máximo de pontuações enviadas por sincronização

  const rowKey = (l, n) => `${l}|${nameKey(n)}`;
  const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what}: tempo esgotado`)), ms))]);

  // Uma linha válida de ranking vinda de fora (o servidor é "terra de ninguém": tudo é conferido).
  function cleanRow(levelSet, level, o) {
    if (!o || typeof o !== "object" || !levelSet.has(level)) return null;
    const n = typeof o.n === "string" ? sanitizeName(o.n) : "";
    if (!n || n !== o.n) return null;
    const b = cleanBest(o);
    return b ? { n, l: level, p: b.p, t: b.t, w: b.w } : null;
  }

  // Fica só com a melhor linha de cada jogador em cada fase.
  function bestPerPlayer(rows) {
    const best = new Map();
    for (const r of rows) {
      const k = rowKey(r.l, r.n), cur = best.get(k);
      if (!cur || isBetter(r, cur)) best.set(k, r);
    }
    return best;
  }

  // Monta o que a tela mostra: ranking de cada fase e ranking geral (soma da melhor pontuação de cada fase).
  function summarize(rows, levels) {
    const best = bestPerPlayer(rows);
    const out = { levels: {}, totals: [] };
    for (const l of levels) out.levels[l] = [...best.values()].filter((r) => r.l === l).sort(byBest).slice(0, TOP);
    const totals = new Map();
    for (const r of best.values()) {
      const k = nameKey(r.n), cur = totals.get(k);
      if (cur) cur.total += r.p; else totals.set(k, { n: r.n, total: r.p });
    }
    out.totals = [...totals.values()].sort((a, b) => b.total - a.total || a.n.localeCompare(b.n)).slice(0, TOP);
    return out;
  }

  // ---------- Servidor REST (Firebase Realtime Database) ----------
  function restBackend(url, fetchFn, levelSet) {
    const base = String(url).trim().replace(/\/+$/, "");
    let label = base;
    try { label = new URL(base).host; } catch { /* usa o texto como está */ }
    const ep = (path) => `${base}/${path}.json`;
    async function call(method, path, body) {
      const ctl = typeof AbortController === "function" ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
      try {
        const res = await fetchFn(ep(path), {
          method, signal: ctl ? ctl.signal : undefined, cache: "no-store",
          ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } finally { if (timer) clearTimeout(timer); }
    }
    return {
      label,
      async read() { // -> linhas válidas
        const tree = await call("GET", "scores");
        const rows = [];
        if (tree && typeof tree === "object") {
          for (const [lv, players] of Object.entries(tree)) {
            const level = Number(lv);
            if (!players || typeof players !== "object") continue;
            for (const o of Object.values(players)) {
              if (rows.length >= MAX_ROWS) return rows;
              const r = cleanRow(levelSet, level, o);
              if (r) rows.push(r);
            }
          }
        }
        return rows;
      },
      async push(rows) { // só grava se for melhor do que o que já está lá
        for (const r of rows.slice(0, MAX_PUSH)) {
          const path = `scores/${r.l}/${encodeURIComponent(nameKey(r.n))}`;
          const cur = cleanRow(levelSet, r.l, await call("GET", path));
          if (cur && !isBetter(r, cur)) continue;
          await call("PUT", path, { n: r.n, p: r.p, t: r.t, w: r.w });
        }
      },
    };
  }

  // ---------- Banco compartilhado do Claude (um documento por visitante: scores/<id>) ----------
  function claudeBackend(claude, levelSet) {
    let ready = null;
    const open = () => ready || (ready = (async () => {
      const [db, user] = await Promise.all([withTimeout(claude.use("db"), TIMEOUT_MS, "db"), withTimeout(claude.use("user"), TIMEOUT_MS, "user")]);
      if (!db) throw new Error("banco indisponível");
      const uid = user && typeof user.id === "function" ? await user.id() : null;
      return { db, uid: typeof uid === "string" && uid ? uid : null };
    })());
    const rowsOf = (entries) => {
      const rows = [];
      if (entries && typeof entries === "object") {
        for (const o of Object.values(entries)) {
          if (rows.length >= MAX_ROWS) break;
          const r = o && typeof o === "object" ? cleanRow(levelSet, Number(o.l), o) : null;
          if (r) rows.push(r);
        }
      }
      return rows;
    };
    let queue = Promise.resolve(); // uma gravação de cada vez
    return {
      label: "banco compartilhado do Claude",
      async read() {
        const { db } = await open();
        const snap = await withTimeout(db.collection("scores").get(), TIMEOUT_MS, "leitura");
        const rows = [];
        for (const d of snap.docs) { const data = d.data(); if (data) rows.push(...rowsOf(data.entries)); }
        return rows;
      },
      push(rows) {
        const run = async () => {
          const { db, uid } = await open();
          if (!uid) return;
          const ref = db.doc(`scores/${uid}`);
          const cur = await withTimeout(ref.get(), TIMEOUT_MS, "leitura");
          const mine = bestPerPlayer(rowsOf(cur.exists ? (cur.data() || {}).entries : null));
          let changed = false;
          for (const r of rows.slice(0, MAX_PUSH)) {
            const k = rowKey(r.l, r.n), old = mine.get(k);
            if (!old || isBetter(r, old)) { mine.set(k, r); changed = true; }
          }
          if (!changed) return;
          const entries = {};
          for (const [k, r] of mine) entries[k] = { n: r.n, l: r.l, p: r.p, t: r.t, w: r.w };
          await withTimeout(ref.set({ entries }), TIMEOUT_MS, "gravação");
        };
        const next = queue.then(run, run);
        queue = next.catch(() => {});
        return next;
      },
    };
  }

  // `opts`: { store, levels: [ids], config: { rankingUrl }, fetch, claude } (fetch/claude: só para testes)
  function create(opts) {
    const { store } = opts;
    const levels = opts.levels.slice();
    const levelSet = new Set(levels);
    const cfg = opts.config || {};
    const fetchFn = opts.fetch || (typeof fetch === "function" ? fetch.bind(root) : null);
    const claude = opts.claude !== undefined ? opts.claude : root.claude;

    const backends = [];
    if (typeof cfg.rankingUrl === "string" && /^https?:\/\//i.test(cfg.rankingUrl.trim()) && fetchFn) backends.push(restBackend(cfg.rankingUrl, fetchFn, levelSet));
    if (claude && typeof claude.use === "function") backends.push(claudeBackend(claude, levelSet));

    const localRows = () => levels.flatMap((l) => store.ranking(l, Infinity));

    return {
      get hasServer() { return backends.length > 0; },

      // O que há neste aparelho (na hora).
      localAll() { return { shared: false, label: "este aparelho", ...summarize(localRows(), levels) }; },

      // Envia a melhor pontuação de um jogador (chamado só quando ela é um novo recorde pessoal). Nunca lança erro.
      async submit({ name, level, points, timeMs }) {
        const r = cleanRow(levelSet, level, { n: name, p: points, t: Math.round(timeMs), w: Date.now() });
        if (!r || !backends.length) return false;
        const results = await Promise.allSettled(backends.map((b) => b.push([r])));
        return results.some((x) => x.status === "fulfilled");
      },

      // Junta este aparelho com os servidores e manda para eles o que for melhor do que têm. Nunca lança erro.
      async fetchAll() {
        const local = localRows();
        const results = await Promise.allSettled(backends.map((b) => withTimeout(b.read(), TIMEOUT_MS * 2, "leitura")));
        const used = [];
        let remote = [];
        results.forEach((x, i) => { if (x.status === "fulfilled") { used.push(backends[i]); remote = remote.concat(x.value); } });
        if (!used.length) return { shared: false, label: "este aparelho", ...summarize(local, levels) };

        const known = bestPerPlayer(remote);
        const toSend = local.filter((r) => { const cur = known.get(rowKey(r.l, r.n)); return !cur || isBetter(r, cur); });
        if (toSend.length) Promise.allSettled(used.map((b) => b.push(toSend))).catch(() => {});
        return { shared: true, label: used.map((b) => b.label).join(" + "), ...summarize(local.concat(remote), levels) };
      },
    };
  }

  return { create, summarize, cleanRow, TOP };
});
