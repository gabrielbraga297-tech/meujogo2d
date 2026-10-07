// Nome do jogador, pontuação por fase (rações + bônus de tempo), recordes, progresso e jogo salvo, guardados no navegador.
// Sem dependências: funciona no navegador (window.Records) e no Node (testes).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Records = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const KEY = "cachorrinho.v1";
  const SAVE_KEY = "cachorrinho.save.v1"; // jogo salvo (separado: é regravado com frequência)
  const MAX_SAVE_BYTES = 20000;
  const MAX_NAME = 16;
  const MAX_RUNS = 500;     // histórico total guardado (os recordes nunca são apagados)
  const MAX_PLAYERS = 12;   // nomes lembrados
  const MAX_TIME_MS = 24 * 60 * 60 * 1000;
  const MAX_POINTS = 100000;

  // Bônus de tempo: terminou a fase em até 20 s = 100 pontos; cada 10 s a mais tira 10 pontos (até 0).
  // Ex.: até 30 s = 90, até 40 s = 80, ... até 110 s = 10, acima disso = 0.
  const BONUS_MAX = 100, BONUS_FULL_MS = 20000, BONUS_STEP_MS = 10000, BONUS_STEP_PTS = 10;
  const LEGACY_RATION_POINTS = 500; // partidas antigas (só com tempo) valem 5 rações + bônus do tempo
  function timeBonus(ms) {
    if (!Number.isFinite(ms) || ms < 0) return 0;
    const over = Math.round(ms) - BONUS_FULL_MS;
    if (over <= 0) return BONUS_MAX;
    return Math.max(0, BONUS_MAX - BONUS_STEP_PTS * Math.ceil(over / BONUS_STEP_MS));
  }

  // Pontuação da fase: 100 por ração + bônus de tempo − 50 por vida perdida (nunca abaixo de 0).
  const RATION_POINTS = 100, LIFE_PENALTY = 50;
  function levelPoints(rations, timeMs, livesLost) {
    const r = Number.isInteger(rations) && rations > 0 ? rations : 0;
    const l = Number.isInteger(livesLost) && livesLost > 0 ? livesLost : 0;
    return Math.max(0, r * RATION_POINTS + timeBonus(timeMs) - l * LIFE_PENALTY);
  }

  // Maior pontuação vence; em caso de empate, o menor tempo.
  const better = (a, b) => a.p > b.p || (a.p === b.p && a.t < b.t);
  const byBest = (a, b) => b.p - a.p || a.t - b.t || a.w - b.w;

  // Nome válido: letras, números, espaço, hífen e apóstrofo; até 16 caracteres.
  function sanitizeName(raw) {
    if (typeof raw !== "string") return "";
    let s = raw.replace(/[^\p{L}\p{N} '\-]/gu, "").replace(/\s+/g, " ").trim();
    if (s.length > MAX_NAME) s = s.slice(0, MAX_NAME).trim();
    return /[\p{L}\p{N}]/u.test(s) ? s : "";
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

  function validRun(r) {
    return r && typeof r === "object" && typeof r.n === "string" && sanitizeName(r.n) &&
      Number.isInteger(r.l) && r.l >= 1 && r.l <= 999 &&
      Number.isFinite(r.t) && r.t > 0 && r.t <= MAX_TIME_MS && Number.isFinite(r.w) &&
      (r.p === undefined || (Number.isInteger(r.p) && r.p >= 0 && r.p <= MAX_POINTS));
  }

  // `storage` é algo com getItem/setItem (ex.: window.localStorage) ou null (só memória).
  function createStore(storage) {
    // objetos sem protótipo: um nome como "constructor" não pode colidir com Object.prototype
    let data = { v: 1, player: "", players: [], runs: [], progress: Object.create(null) };
    const saves = Object.create(null); // jogo salvo por jogador: { chave: { t, snap } }
    let persistent = false;

    function probe() {
      if (!storage) return false;
      try { storage.setItem(KEY + ".probe", "1"); storage.removeItem(KEY + ".probe"); return true; } catch { return false; }
    }

    function load() {
      persistent = probe();
      if (!persistent) return;
      try {
        const raw = JSON.parse(storage.getItem(KEY) || "null");
        if (!raw || typeof raw !== "object") return;
        const players = Array.isArray(raw.players) ? raw.players.map(sanitizeName).filter(Boolean) : [];
        const runs = Array.isArray(raw.runs) ? raw.runs.filter(validRun).map((r) => ({ n: sanitizeName(r.n), l: r.l, t: Math.round(r.t), p: Number.isInteger(r.p) ? r.p : LEGACY_RATION_POINTS + timeBonus(Math.round(r.t)), w: r.w })) : [];
        const player = sanitizeName(raw.player);
        const progress = Object.create(null);
        if (raw.progress && typeof raw.progress === "object") {
          for (const [k, p] of Object.entries(raw.progress)) {
            const done = p && Array.isArray(p.completed) ? [...new Set(p.completed.filter((n) => Number.isInteger(n) && n >= 1 && n <= 999))].sort((a, b) => a - b) : null;
            if (typeof k === "string" && k && done) progress[k] = { unlocked: Math.max(1, ...done.map((n) => n + 1)), completed: done };
          }
        }
        data = { v: 1, player, players: players.slice(0, MAX_PLAYERS), runs: runs.slice(-MAX_RUNS), progress };
      } catch { /* dados corrompidos: começa do zero */ }
    }

    function loadSaves() {
      if (!persistent) return;
      try {
        const raw = JSON.parse(storage.getItem(SAVE_KEY) || "null");
        if (!raw || typeof raw !== "object" || !raw.saves || typeof raw.saves !== "object") return;
        for (const [k, v] of Object.entries(raw.saves)) {
          if (k && v && Number.isFinite(v.t) && v.snap && typeof v.snap === "object" && JSON.stringify(v.snap).length <= MAX_SAVE_BYTES) saves[k] = { t: v.t, snap: v.snap };
        }
      } catch { /* save corrompido: ignora */ }
    }

    function persistSaves() {
      if (!persistent) return true;
      try { storage.setItem(SAVE_KEY, JSON.stringify({ v: 1, saves })); return true; } catch { persistent = false; return false; }
    }

    function save() {
      if (!persistent) return;
      try { storage.setItem(KEY, JSON.stringify(data)); } catch { persistent = false; }
    }

    function canonical(name) { // usa a grafia já guardada, se o jogador existir
      const clean = sanitizeName(name);
      if (!clean) return "";
      const k = nameKey(clean);
      return data.players.find((p) => nameKey(p) === k) || data.runs.find((r) => nameKey(r.n) === k)?.n || clean;
    }

    function bestOf(runs) {
      return runs.reduce((b, r) => (!b || better(r, b) ? r : b), null);
    }

    function prune() {
      while (data.runs.length > MAX_RUNS) {
        const keep = new Set();
        const seen = new Map();
        for (const r of data.runs) {
          const k = nameKey(r.n) + "|" + r.l, b = seen.get(k);
          if (!b || better(r, b)) seen.set(k, r);
        }
        for (const r of seen.values()) keep.add(r);
        const i = data.runs.findIndex((r) => !keep.has(r));
        data.runs.splice(i === -1 ? 0 : i, 1);
      }
    }

    load();
    loadSaves();

    return {
      get persistent() { return persistent; },
      player() { return data.player; },
      players() { return data.players.slice(); },

      // Define o jogador atual. Devolve o nome guardado, ou "" se o nome for inválido.
      setPlayer(name) {
        const p = canonical(name);
        if (!p) return "";
        data.player = p;
        data.players = [p, ...data.players.filter((x) => nameKey(x) !== nameKey(p))].slice(0, MAX_PLAYERS);
        save();
        return p;
      },

      // Registra uma conclusão de fase (`points` = pontuação da fase: rações + bônus de tempo).
      // Na mesma fase vale só a MAIOR pontuação (as partidas não se somam); fases diferentes somam.
      addRun({ level, timeMs, points, name }) {
        const p = canonical(name || data.player);
        const t = Math.round(timeMs);
        if (!p || !Number.isInteger(level) || level < 1 || !Number.isFinite(t) || t <= 0 || t > MAX_TIME_MS) return null;
        if (!Number.isInteger(points) || points < 0 || points > MAX_POINTS) return null;
        const prevPersonal = this.personalBest(p, level), prevGeneral = this.generalBest(level);
        const run = { n: p, l: level, t, p: points, w: Date.now() };
        data.runs.push(run);
        if (!data.players.some((x) => nameKey(x) === nameKey(p))) data.players = [p, ...data.players].slice(0, MAX_PLAYERS);
        prune();
        save();
        const newPersonal = !prevPersonal || better(run, prevPersonal);
        return {
          run,
          bonus: timeBonus(t),
          first: !prevPersonal,
          newPersonal,
          newGeneral: !prevGeneral || better(run, prevGeneral),
          previousPersonal: prevPersonal,
          personalBest: bestOf(this.history(p, level)),
          generalBest: this.generalBest(level),
          gained: newPersonal ? run.p - (prevPersonal ? prevPersonal.p : 0) : 0, // quanto a pontuação total aumentou
        };
      },

      // Progresso na campanha: fases concluídas e a próxima liberada.
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

      // Jogo salvo (um por jogador). `snap` é qualquer objeto JSON; quem chama valida ao carregar.
      saveGame(name, snap) {
        const k = nameKey(canonical(name));
        if (!k || !snap || typeof snap !== "object") return false;
        let json; try { json = JSON.stringify(snap); } catch { return false; }
        if (json.length > MAX_SAVE_BYTES) return false;
        saves[k] = { t: Date.now(), snap: JSON.parse(json) };
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

      history(name, level, limit) { // mais recentes primeiro
        const k = nameKey(name);
        const list = data.runs.filter((r) => r.l === level && nameKey(r.n) === k).reverse();
        return limit ? list.slice(0, limit) : list;
      },
      personalBest(name, level) { return bestOf(this.history(name, level)); },
      generalBest(level) { return bestOf(data.runs.filter((r) => r.l === level)); },

      // Melhor partida de cada jogador na fase: maior pontuação primeiro (empate: menor tempo).
      ranking(level, n = 5) {
        const best = new Map();
        for (const r of data.runs) {
          if (r.l !== level) continue;
          const k = nameKey(r.n), b = best.get(k);
          if (!b || better(r, b)) best.set(k, r);
        }
        return [...best.values()].sort(byBest).slice(0, n);
      },

      // Pontuação total do jogador: soma da MELHOR pontuação de cada fase (`levels` limita quais fases contam).
      totalScore(name, levels) {
        const k = nameKey(name), best = new Map();
        for (const r of data.runs) {
          if (nameKey(r.n) !== k || (levels && !levels.includes(r.l))) continue;
          const b = best.get(r.l);
          if (!b || better(r, b)) best.set(r.l, r);
        }
        let sum = 0;
        for (const r of best.values()) sum += r.p;
        return sum;
      },

      // Ranking geral: jogadores ordenados pela pontuação total.
      totalRanking(n = 5, levels) {
        const names = new Map();
        for (const r of data.runs) if (!names.has(nameKey(r.n))) names.set(nameKey(r.n), r.n);
        return [...names.values()].map((nm) => ({ n: nm, total: this.totalScore(nm, levels) }))
          .filter((x) => x.total > 0 || !levels).sort((a, b) => b.total - a.total || a.n.localeCompare(b.n)).slice(0, n);
      },
    };
  }

  return { createStore, sanitizeName, nameKey, formatTime, timeBonus, levelPoints, BONUS_MAX, RATION_POINTS, LIFE_PENALTY, MAX_NAME, MAX_RUNS };
});
