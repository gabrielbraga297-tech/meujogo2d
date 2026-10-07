// Nome do jogador, contas, pontuação por fase, melhores pontuações, progresso e jogo salvo, guardados no navegador.
// Só a MELHOR pontuação de cada jogador em cada fase é guardada (não há histórico de partidas).
// Sem dependências: funciona no navegador (window.Records) e no Node (testes).
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Records = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const KEY = "cachorrinho.v1";
  const SAVE_KEY = "cachorrinho.save.v1"; // jogo salvo (separado: é regravado com frequência)
  const MAX_SAVE_BYTES = 20000;
  const MAX_NAME = 16;
  const MAX_PLAYERS = 12;   // nomes lembrados neste aparelho
  const MAX_TIME_MS = 24 * 60 * 60 * 1000;
  const MAX_POINTS = 100000;
  const LOCK_AFTER = 5, LOCK_MS = 30000; // depois de 5 senhas erradas seguidas, espera 30 s (dobra a cada nova rodada)
  const defaultAuth = () => (typeof module === "object" && module.exports ? require("./auth.js") : root.Auth);

  // Bônus de tempo (proporcional, de 0 a 100 pontos): quanto menos tempo, mais pontos. Cada 10 segundos valem 10 pontos.
  // Até 20 s = 100; até 30 s = 90; até 40 s = 80; ... até 110 s = 10; acima de 110 s = 0.
  const BONUS_MAX = 100, BONUS_FULL_MS = 20000, BONUS_STEP_MS = 10000, BONUS_STEP_PTS = 10;
  const LEGACY_RATION_POINTS = 500; // partidas antigas (só com tempo) valem 5 rações + bônus do tempo
  function timeBonus(ms) {
    if (!Number.isFinite(ms) || ms < 0) return 0;
    const over = Math.round(ms) - BONUS_FULL_MS;
    if (over <= 0) return BONUS_MAX;
    return Math.max(0, BONUS_MAX - BONUS_STEP_PTS * Math.ceil(over / BONUS_STEP_MS)); // cada bloco de 10 s (começado) a mais tira 10
  }

  // Pontuação da fase = 100 por ração + bônus de tempo − 50 por vida perdida − 100 por cada nova tentativa
  // (reinício depois de perder todas as vidas). PODE FICAR NEGATIVA.
  const RATION_POINTS = 100, LIFE_PENALTY = 50, RETRY_PENALTY = 100, MAX_RETRIES = 3;
  const count = (n) => (Number.isInteger(n) && n > 0 ? n : 0);
  function levelPoints(rations, timeMs, livesLost, retries) {
    return count(rations) * RATION_POINTS + timeBonus(timeMs) - count(livesLost) * LIFE_PENALTY - count(retries) * RETRY_PENALTY;
  }

  // Maior pontuação vence; em caso de empate, o menor tempo. (a e b: { p, t })
  const isBetter = (a, b) => a.p > b.p || (a.p === b.p && a.t < b.t);
  const byBest = (a, b) => b.p - a.p || a.t - b.t || (a.w || 0) - (b.w || 0);

  // Nome válido: letras, números, espaço, hífen e apóstrofo; até 16 caracteres.
  function sanitizeName(raw) {
    if (typeof raw !== "string") return "";
    let s = raw.replace(/[^\p{L}\p{N} '\-]/gu, "").replace(/\s+/g, " ").trim();
    if (s.length > MAX_NAME) s = s.slice(0, MAX_NAME).trim();
    return /[\p{L}\p{N}]/u.test(s) ? s : "";
  }

  // Nome aceito como está (cadastro/entrada não "consertam" o que foi digitado em silêncio).
  function isValidName(raw) {
    return typeof raw === "string" && sanitizeName(raw) !== "" && sanitizeName(raw) === raw.trim().replace(/\s+/g, " ");
  }

  // "Totó", "toto" e "TOTÓ" são o mesmo jogador.
  function nameKey(name) {
    return String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  // 18432 -> "18,4 s" | 65300 -> "1:05,3"
  function formatTime(ms) {
    if (!Number.isFinite(ms) || ms < 0) return "—";
    const tenths = Math.round(ms / 100);
    const m = Math.floor(tenths / 600), s = (tenths % 600) / 10;
    if (m === 0) return `${s.toFixed(1).replace(".", ",")} s`;
    return `${m}:${s.toFixed(1).replace(".", ",").padStart(4, "0")}`;
  }

  // Uma melhor pontuação válida: { p (inteiro, pode ser negativo), t (ms), w (quando) }.
  function cleanBest(b) {
    if (!b || typeof b !== "object") return null;
    if (!Number.isInteger(b.p) || b.p < -MAX_POINTS || b.p > MAX_POINTS) return null;
    if (!Number.isFinite(b.t) || b.t <= 0 || b.t > MAX_TIME_MS) return null;
    return { p: b.p, t: Math.round(b.t), w: Number.isFinite(b.w) ? b.w : 0 };
  }

  // `storage` é algo com getItem/setItem (ex.: window.localStorage) ou null (só memória).
  // `opts` (testes): { auth, authOptions: { iterations, forceJs }, now }
  function createStore(storage, opts = {}) {
    const auth = opts.auth || defaultAuth();
    const now = opts.now || Date.now;
    const failures = new Map(); // chave do jogador -> { n, until } (só em memória)

    // objetos sem protótipo: um nome como "constructor" não pode colidir com Object.prototype
    const emptyData = () => ({ v: 2, player: "", players: [], bests: Object.create(null), progress: Object.create(null), accounts: Object.create(null) });
    let data = emptyData();
    const saves = Object.create(null); // jogo salvo por jogador: { chave: { t, snap } }
    let persistent = false;
    // Várias abas (ou uma aba esquecida aberta) usam o mesmo armazenamento: cada operação primeiro relê o que está guardado,
    // se outra aba mudou, para nunca apagar o que ela gravou (ver sync()). `lastRaw`: o texto que esta cópia conhece.
    let lastRaw = null, lastSavesRaw = null;

    function probe() {
      if (!storage) return false;
      try { storage.setItem(KEY + ".probe", "1"); storage.removeItem(KEY + ".probe"); return true; } catch { return false; }
    }

    // guarda `best` para (jogador, fase) se for melhor que a atual; devolve true se mudou
    function putBest(map, name, level, best) {
      const k = nameKey(name);
      const rec = map[k] || (map[k] = { n: name, L: Object.create(null) });
      const cur = rec.L[level];
      if (cur && !isBetter(best, cur)) return false;
      rec.L[level] = best;
      return true;
    }

    function load() {
      persistent = probe();
      if (persistent) readData();
    }

    function readData() {
      let text;
      try { text = storage.getItem(KEY); } catch { return; }
      lastRaw = text;
      data = emptyData();
      try {
        const raw = JSON.parse(text || "null");
        if (!raw || typeof raw !== "object") return;
        const players = Array.isArray(raw.players) ? raw.players.map(sanitizeName).filter(Boolean) : [];
        const player = sanitizeName(raw.player);

        const bests = Object.create(null);
        if (raw.bests && typeof raw.bests === "object") { // formato atual
          for (const [k, rec] of Object.entries(raw.bests)) {
            const n = rec && sanitizeName(rec.n);
            if (!n || nameKey(n) !== k || !rec.L || typeof rec.L !== "object") continue;
            for (const [lv, b] of Object.entries(rec.L)) {
              const level = Number(lv), best = cleanBest(b);
              if (Number.isInteger(level) && level >= 1 && level <= 999 && best) putBest(bests, n, level, best);
            }
          }
        }
        if (Array.isArray(raw.runs)) { // formato antigo (histórico de partidas): fica só a melhor de cada jogador
          for (const r of raw.runs) {
            const n = r && sanitizeName(r.n);
            if (!n || !Number.isInteger(r.l) || r.l < 1 || r.l > 999 || !Number.isFinite(r.t) || r.t <= 0 || r.t > MAX_TIME_MS) continue;
            const p = Number.isInteger(r.p) ? r.p : LEGACY_RATION_POINTS + timeBonus(Math.round(r.t));
            const best = cleanBest({ p, t: Math.round(r.t), w: r.w });
            if (best) putBest(bests, n, r.l, best);
          }
        }

        const progress = Object.create(null);
        if (raw.progress && typeof raw.progress === "object") {
          for (const [k, p] of Object.entries(raw.progress)) {
            const done = p && Array.isArray(p.completed) ? [...new Set(p.completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= 999))].sort((a, b) => a - b) : null;
            if (typeof k === "string" && k && done) progress[k] = { unlocked: Math.max(1, ...done.map((n) => n + 1)), completed: done };
          }
        }
        const accounts = Object.create(null);
        if (raw.accounts && typeof raw.accounts === "object") {
          for (const [k, a] of Object.entries(raw.accounts)) {
            const n = a && sanitizeName(a.n);
            if (n && nameKey(n) === k && a.a === "pbkdf2-sha256" && Number.isInteger(a.i) && a.i >= 1000 && a.i <= 5000000 &&
                typeof a.s === "string" && /^[0-9a-f]{32}$/.test(a.s) && typeof a.h === "string" && /^[0-9a-f]{64}$/.test(a.h)) {
              accounts[k] = { n, a: a.a, i: a.i, s: a.s, h: a.h, c: Number.isFinite(a.c) ? a.c : 0 };
            }
          }
        }
        data = { v: 2, player, players: players.slice(0, MAX_PLAYERS), bests, progress, accounts };
      } catch { /* dados corrompidos: começa do zero */ }
    }

    function loadSaves() {
      if (!persistent) return;
      let text;
      try { text = storage.getItem(SAVE_KEY); } catch { return; }
      lastSavesRaw = text;
      for (const k of Object.keys(saves)) delete saves[k];
      try {
        const raw = JSON.parse(text || "null");
        if (!raw || typeof raw !== "object" || !raw.saves || typeof raw.saves !== "object") return;
        for (const [k, v] of Object.entries(raw.saves)) {
          if (k && v && Number.isFinite(v.t) && v.snap && typeof v.snap === "object" && JSON.stringify(v.snap).length <= MAX_SAVE_BYTES) saves[k] = { t: v.t, snap: v.snap };
        }
      } catch { /* save corrompido: ignora */ }
    }

    function persistSaves() {
      if (!persistent) return true;
      try { const text = JSON.stringify({ v: 1, saves }); storage.setItem(SAVE_KEY, text); lastSavesRaw = text; return true; } catch { persistent = false; return false; }
    }

    function save() {
      if (!persistent) return;
      try { const text = JSON.stringify(data); storage.setItem(KEY, text); lastRaw = text; } catch { persistent = false; }
    }

    // Se outra aba mudou os dados guardados desde a última vez, relê antes de continuar (barato: só compara textos).
    function sync() {
      if (!persistent) return;
      let a, b;
      try { a = storage.getItem(KEY); b = storage.getItem(SAVE_KEY); } catch { return; }
      if (a !== lastRaw) readData();
      if (b !== lastSavesRaw) loadSaves();
    }

    function canonical(name) { // usa a grafia já guardada, se o jogador existir
      const clean = sanitizeName(name);
      if (!clean) return "";
      const k = nameKey(clean);
      return data.accounts[k]?.n || data.players.find((p) => nameKey(p) === k) || data.bests[k]?.n || clean;
    }

    load();
    loadSaves();

    const api = {
      get persistent() { return persistent; },
      player() { return data.player; },
      players() { return data.players.slice(); },

      // Define o jogador atual. Devolve o nome guardado, ou "" se o nome for inválido.
      setPlayer(name) {
        const p = canonical(name);
        if (!p) return "";
        if (data.accounts[nameKey(p)] && nameKey(data.player) !== nameKey(p)) return ""; // nome com senha: só entrando com a senha
        data.player = p;
        data.players = [p, ...data.players.filter((x) => nameKey(x) !== nameKey(p))].slice(0, MAX_PLAYERS);
        save();
        return p;
      },

      // ---------- Contas (cadastro simples, só neste navegador) ----------
      hasAccount(name) { return !!data.accounts[nameKey(name)]; },
      accountNames() { return Object.values(data.accounts).map((a) => a.n); },
      isLoggedIn() { return !!data.player && !!data.accounts[nameKey(data.player)]; },

      // Cria a conta e já entra. Um nome que já tem pontuações (sem senha) pode ser "adotado" por uma conta.
      async register(name, password) {
        if (!isValidName(name)) return { ok: false, error: "name" };
        const reason = auth.validatePassword(password);
        if (reason) return { ok: false, error: "password", reason };
        const clean = sanitizeName(name), k = nameKey(clean);
        if (data.accounts[k]) return { ok: false, error: "taken" };
        let hash;
        try { hash = await auth.hashPassword(password, opts.authOptions); } catch { return { ok: false, error: "crypto" }; }
        sync();
        if (data.accounts[k]) return { ok: false, error: "taken" }; // outro cadastro igual terminou antes
        const display = canonical(clean);
        data.accounts[k] = { n: display, a: hash.a, i: hash.i, s: hash.s, h: hash.h, c: now() };
        data.player = display;
        data.players = [display, ...data.players.filter((x) => nameKey(x) !== k)].slice(0, MAX_PLAYERS);
        save();
        return { ok: true, name: display, persistent };
      },

      // Entra com usuário e senha. Erros: "wrong" (usuário ou senha errados, sem dizer qual) ou "locked" (muitas tentativas).
      async login(name, password) {
        const k = nameKey(typeof name === "string" ? name : ""), f = failures.get(k);
        if (f && f.until > now()) return { ok: false, error: "locked", waitMs: f.until - now() };
        let acc = data.accounts[k];
        let good = !!acc && await auth.verifyPassword(password, acc, opts.authOptions);
        if (good) { sync(); acc = data.accounts[k]; good = !!acc; } // a conta pode ter sido apagada em outra aba durante a espera
        if (!good) {
          const n = (f ? f.n : 0) + 1;
          failures.set(k, { n, until: n % LOCK_AFTER === 0 ? now() + LOCK_MS * 2 ** (n / LOCK_AFTER - 1) : 0 });
          const locked = failures.get(k).until > now();
          return locked ? { ok: false, error: "locked", waitMs: failures.get(k).until - now() } : { ok: false, error: "wrong" };
        }
        failures.delete(k);
        data.player = acc.n;
        data.players = [acc.n, ...data.players.filter((x) => nameKey(x) !== k)].slice(0, MAX_PLAYERS);
        save();
        return { ok: true, name: acc.n, persistent };
      },

      logout() { data.player = ""; save(); },

      // "Esqueci a senha": sem servidor não há recuperação; a saída é apagar a conta e os dados dela neste aparelho.
      deleteAccount(name) {
        const k = nameKey(name);
        if (!k) return false;
        delete data.accounts[k];
        delete data.progress[k];
        delete data.bests[k];
        data.players = data.players.filter((x) => nameKey(x) !== k);
        if (nameKey(data.player) === k) data.player = "";
        failures.delete(k);
        save();
        if (k in saves) { delete saves[k]; persistSaves(); }
        return true;
      },

      // ---------- Pontuação ----------
      // Registra o resultado de uma fase (`points` = rações + bônus de tempo − vidas perdidas − tentativas extras;
      // pode ser negativo). Só a MELHOR pontuação de cada jogador em cada fase fica guardada: uma partida pior não
      // muda nada e a pontuação da mesma fase nunca se soma. Fases diferentes somam (totalScore).
      addRun({ level, timeMs, points, name }) {
        const p = canonical(name || data.player);
        const t = Math.round(timeMs);
        if (!p || !Number.isInteger(level) || level < 1 || level > 999 || !Number.isFinite(t) || t <= 0 || t > MAX_TIME_MS) return null;
        if (!Number.isInteger(points) || points < -MAX_POINTS || points > MAX_POINTS) return null;
        const prevPersonal = this.personalBest(p, level), prevGeneral = this.generalBest(level);
        const run = { p: points, t, w: now() };
        const newPersonal = !prevPersonal || isBetter(run, prevPersonal);
        if (newPersonal) putBest(data.bests, p, level, run);
        if (!data.players.some((x) => nameKey(x) === nameKey(p))) data.players = [p, ...data.players].slice(0, MAX_PLAYERS);
        save();
        return {
          run: { n: p, l: level, ...run },
          bonus: timeBonus(t),
          first: !prevPersonal,
          newPersonal,
          newGeneral: !prevGeneral || isBetter(run, prevGeneral),
          previousPersonal: prevPersonal,
          personalBest: this.personalBest(p, level),
          generalBest: this.generalBest(level),
          gained: newPersonal ? run.p - (prevPersonal ? prevPersonal.p : 0) : 0, // quanto a pontuação total aumentou
        };
      },

      personalBest(name, level) {
        const rec = data.bests[nameKey(name)], b = rec && rec.L[level];
        return b ? { n: rec.n, l: level, ...b } : null;
      },
      generalBest(level) { return this.ranking(level, 1)[0] || null; },

      // Melhor pontuação de cada jogador na fase: maior pontuação primeiro (empate: menor tempo).
      ranking(level, n = 10) {
        const rows = [];
        for (const rec of Object.values(data.bests)) { const b = rec.L[level]; if (b) rows.push({ n: rec.n, l: level, ...b }); }
        return rows.sort(byBest).slice(0, n);
      },

      // Pontuação total do jogador: soma da MELHOR pontuação de cada fase (`levels` limita quais fases contam).
      totalScore(name, levels) {
        const rec = data.bests[nameKey(name)];
        if (!rec) return 0;
        let sum = 0;
        for (const [lv, b] of Object.entries(rec.L)) if (!levels || levels.includes(Number(lv))) sum += b.p;
        return sum;
      },

      // Ranking geral: jogadores ordenados pela pontuação total.
      totalRanking(n = 10, levels) {
        const rows = [];
        for (const rec of Object.values(data.bests)) {
          const lvs = Object.keys(rec.L).map(Number).filter((l) => !levels || levels.includes(l));
          if (lvs.length) rows.push({ n: rec.n, total: lvs.reduce((s, l) => s + rec.L[l].p, 0) });
        }
        return rows.sort((a, b) => b.total - a.total || a.n.localeCompare(b.n)).slice(0, n);
      },

      // ---------- Progresso na campanha: fases concluídas e a próxima liberada ----------
      progress(name) {
        const p = data.progress[nameKey(name)];
        return p ? { unlocked: p.unlocked, completed: p.completed.slice() } : { unlocked: 1, completed: [] };
      },
      completeLevel(name, level) {
        const k = nameKey(canonical(name));
        if (!k || !Number.isInteger(level) || level < 1 || level > 999) return null;
        const p = data.progress[k] || { unlocked: 1, completed: [] };
        if (!p.completed.includes(level)) p.completed = [...p.completed, level].sort((a, b) => a - b);
        p.unlocked = Math.max(p.unlocked, level + 1);
        data.progress[k] = p;
        save();
        return this.progress(name);
      },

      // ---------- Jogo salvo (um por jogador). `snap` é qualquer objeto JSON; quem chama valida ao carregar ----------
      saveGame(name, snap) {
        const k = nameKey(canonical(name));
        if (!k || !snap || typeof snap !== "object") return false;
        let json; try { json = JSON.stringify(snap); } catch { return false; }
        if (json.length > MAX_SAVE_BYTES) return false;
        saves[k] = { t: now(), snap: JSON.parse(json) };
        const keys = Object.keys(saves);
        if (keys.length > MAX_PLAYERS) delete saves[keys.sort((a, b) => saves[a].t - saves[b].t)[0]];
        return persistSaves();
      },
      loadGame(name) {
        const s = saves[nameKey(name)];
        return s ? { savedAt: s.t, snap: JSON.parse(JSON.stringify(s.snap)) } : null;
      },
      hasGame(name) { return !!saves[nameKey(name)]; },
      clearGame(name) { const k = nameKey(name); if (k in saves) { delete saves[k]; persistSaves(); } },
    };

    // Toda operação começa sincronizando com o armazenamento (outras abas). Os métodos assíncronos (register/login) sincronizam de novo depois da espera.
    for (const name of Object.keys(api)) {
      const fn = api[name];
      if (typeof fn !== "function") continue;
      api[name] = function (...args) { sync(); return fn.apply(this, args); };
    }
    return api;
  }

  return { createStore, sanitizeName, isValidName, nameKey, formatTime, timeBonus, levelPoints, isBetter, byBest, cleanBest,
    BONUS_MAX, RATION_POINTS, LIFE_PENALTY, RETRY_PENALTY, MAX_RETRIES, MAX_NAME, MAX_POINTS };
});
