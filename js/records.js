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
  // Fases com bônus maior (Fase 3) valem 20 pontos por degrau de 10 s: de 0 a 200.
  const BONUS_MAX = 100, BONUS_FULL_MS = 20000, BONUS_STEP_MS = 10000, BONUS_STEP_PTS = 10, BONUS_STEPS = 10;
  const LEGACY_RATION_POINTS = 500; // partidas antigas (só com tempo) valem 5 rações + bônus do tempo
  // `stepPts` = pontos por degrau de 10 s (10 na maioria das fases, 20 na Fase 3).
  function timeBonus(ms, stepPts = BONUS_STEP_PTS) {
    const step = Number.isInteger(stepPts) && stepPts > 0 && stepPts <= 1000 ? stepPts : BONUS_STEP_PTS, max = step * BONUS_STEPS;
    if (!Number.isFinite(ms) || ms < 0) return 0;
    const over = Math.round(ms) - BONUS_FULL_MS;
    if (over <= 0) return max;
    return Math.max(0, max - step * Math.ceil(over / BONUS_STEP_MS)); // cada bloco de 10 s (começado) a mais tira um degrau
  }

  // Pontuação da fase = 100 por ração + bônus de tempo − 50 por vida perdida − 100 por cada nova tentativa
  // (reinício depois de perder todas as vidas). PODE FICAR NEGATIVA.
  // Petiscos (0.15.9): 1 petisco por fase completada = 1 PETSCOIN; as skins da lojinha custam no mínimo MIN_SKIN_PRICE petscoin.
  const MIN_SKIN_PRICE = 10, MAX_TREATS = 99999, MAX_OWNED = 60;
  const isSkinId = (id) => typeof id === "string" && /^[a-z0-9-]{1,24}$/.test(id);
  // (0.17.0) cada BICHINHO tem o seu jogo: pontos, recordes, progresso e jogo salvo independentes. "dog" (o cachorrinho) guarda no formato de sempre (campos L, unlocked/completed, save sem sufixo);
  // os outros animais ficam em campos novos (G) e nos saves com sufixo "@animal". Carteira, contas e jogadores são de todos os animais.
  const DEFAULT_ANIMAL = "dog", MAX_ANIMALS = 12;
  const isAnimal = (a) => typeof a === "string" && /^[a-z]{2,12}$/.test(a);
  const RATION_POINTS = 100, BONE_POINTS = 150 /* 50 do osso + 100 de bônus */, POSTMAN_POINTS = 100, BALL_POINTS = 50 /* bolinha (0.15.8) */, LIFE_PENALTY = 50, RETRY_PENALTY = 100, MAX_RETRIES = 3;
  const count = (n) => (Number.isInteger(n) && n > 0 ? n : 0);
  // `extra` (opcional): { bones: ossos pegos (150 pontos cada), postmen: carteiros atingidos (100 cada), balls: bolinhas pegas (50 cada), bonusStep: pontos por degrau do bônus de tempo (padrão 10),
  // lifePenalty: pontos perdidos por vida perdida (padrão 50; a Fase 4 e a Fase 5 descontam 200), missionBonus: pontos por cumprir a missão da fase (Fases 11 a 20; padrão 0) }
  function levelPoints(rations, timeMs, livesLost, retries, extra = {}) {
    const lifePenalty = Number.isInteger(extra.lifePenalty) && extra.lifePenalty >= 0 && extra.lifePenalty <= 10000 ? extra.lifePenalty : LIFE_PENALTY;
    return count(rations) * RATION_POINTS + count(extra.bones) * BONE_POINTS + count(extra.postmen) * POSTMAN_POINTS + count(extra.balls) * BALL_POINTS + timeBonus(timeMs, extra.bonusStep) + count(extra.missionBonus) - count(livesLost) * lifePenalty - count(retries) * RETRY_PENALTY;
  }

  // Maior pontuação vence; em caso de empate, o menor tempo. (a e b: { p, t })
  const isBetter = (a, b) => a.p > b.p || (a.p === b.p && a.t < b.t);
  const byBest = (a, b) => b.p - a.p || a.t - b.t || (a.w || 0) - (b.w || 0);

  // Arruma o que foi digitado ou colado: letras acentuadas na forma composta, apóstrofos tipográficos (’ ‘ ʼ ´ `) viram o apóstrofo comum,
  // qualquer espaço (inclusive o não separável) vira espaço comum, sem espaços sobrando no começo, no fim ou no meio.
  const tidyName = (raw) => String(raw).normalize("NFC").replace(/[\u2018\u2019\u02BC\u00B4`]/g, "'").replace(/\s+/g, " ").trim();

  // Nome válido: letras, números, espaço, hífen e apóstrofo; até 16 caracteres.
  function sanitizeName(raw) {
    if (typeof raw !== "string") return "";
    let s = tidyName(raw).replace(/[^\p{L}\p{N} '\-]/gu, "").replace(/\s+/g, " ").trim();
    if (s.length > MAX_NAME) s = s.slice(0, MAX_NAME).trim();
    return /[\p{L}\p{N}]/u.test(s) ? s : "";
  }

  // Nome aceito como está (cadastro/entrada não "consertam" o que foi digitado em silêncio).
  function isValidName(raw) {
    return typeof raw === "string" && sanitizeName(raw) !== "" && sanitizeName(raw) === tidyName(raw);
  }

  // "Totó", "toto" e "TOTÓ" são o mesmo jogador.
  function nameKey(name) {
    return tidyName(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
    const emptyData = () => ({ v: 2, player: "", players: [], bests: Object.create(null), progress: Object.create(null), accounts: Object.create(null), wallet: Object.create(null) });
    let data = emptyData();
    const saves = Object.create(null); // jogo salvo por jogador: { chave: { t, snap } }
    let persistent = false;
    let savesOk = true; // (0.16.0) falhar ao gravar só o JOGO SALVO (grande) não desliga a gravação das pontuações, do progresso, das contas e dos petscoin: o jogo salvo fica só na memória e o menu avisa
    // Várias abas (ou uma aba esquecida aberta) usam o mesmo armazenamento: cada operação primeiro relê o que está guardado,
    // se outra aba mudou, para nunca apagar o que ela gravou (ver sync()). `lastRaw`: o texto que esta cópia conhece.
    let lastRaw = null, lastSavesRaw = null;

    function probe() {
      if (!storage) return false;
      try { storage.setItem(KEY + ".probe", "1"); storage.removeItem(KEY + ".probe"); return true; } catch { return false; }
    }

    // guarda `best` para (jogador, fase) se for melhor que a atual; devolve true se mudou
    function putBest(map, name, level, best, animal = DEFAULT_ANIMAL) {
      const k = nameKey(name);
      const rec = map[k] || (map[k] = { n: name, L: Object.create(null) });
      const L = bestsOf(rec, animal, true);
      const cur = L[level];
      if (cur && !isBetter(best, cur)) return false;
      L[level] = best;
      return true;
    }
    // o mapa fase → melhor pontuação de um jogador num animal (o cachorrinho fica em `rec.L`, como sempre; os outros em `rec.G[animal]`); `create`: cria se não existir
    function bestsOf(rec, animal, create = false) {
      if (!rec) return null;
      if (animal === DEFAULT_ANIMAL) return rec.L;
      if (!isAnimal(animal)) return null;
      if (!rec.G) { if (!create) return null; rec.G = Object.create(null); }
      return rec.G[animal] || (create ? (rec.G[animal] = Object.create(null)) : null);
    }
    // o progresso de um jogador num animal: { unlocked, completed } (o cachorrinho fica na raiz do registro, os outros em `p.G[animal]`)
    function progressOf(p, animal) {
      if (!p) return null;
      if (animal === DEFAULT_ANIMAL) return p;
      return p.G && p.G[animal] ? p.G[animal] : null;
    }
    const cleanDone = (list) => (Array.isArray(list) ? [...new Set(list.filter((n) => Number.isInteger(n) && n >= 1 && n <= 999))].sort((a, b) => a - b) : null);

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
            if (rec.G && typeof rec.G === "object" && !Array.isArray(rec.G)) { // recordes dos outros animais (0.17.0)
              for (const [animal, map] of Object.entries(rec.G).slice(0, MAX_ANIMALS)) {
                if (!isAnimal(animal) || animal === DEFAULT_ANIMAL || !map || typeof map !== "object" || Array.isArray(map)) continue;
                for (const [lv, b] of Object.entries(map)) {
                  const level = Number(lv), best = cleanBest(b);
                  if (Number.isInteger(level) && level >= 1 && level <= 999 && best) putBest(bests, n, level, best, animal);
                }
              }
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
            const G = Object.create(null); // progresso dos outros animais (0.17.0)
            if (p && p.G && typeof p.G === "object" && !Array.isArray(p.G)) {
              for (const [animal, q] of Object.entries(p.G).slice(0, MAX_ANIMALS)) {
                const dn = q && cleanDone(q.completed);
                if (isAnimal(animal) && animal !== DEFAULT_ANIMAL && dn) G[animal] = { unlocked: Math.max(1, ...dn.map((n) => n + 1)), completed: dn };
              }
            }
            if (typeof k === "string" && k && (done || Object.keys(G).length)) {
              progress[k] = { unlocked: done ? Math.max(1, ...done.map((n) => n + 1)) : 1, completed: done || [] };
              if (Object.keys(G).length) progress[k].G = G;
            }
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
        const wallet = Object.create(null); // carteira de petiscos por jogador: { t: petiscos, own: skins compradas, eq: skin em uso ("" = a padrão) }
        if (raw.wallet && typeof raw.wallet === "object" && !Array.isArray(raw.wallet)) { // (uma lista no lugar do mapa seria lida como jogadores "0", "1"...)
          for (const [k, w] of Object.entries(raw.wallet)) {
            if (!k || !w || typeof w !== "object") continue;
            const own = Array.isArray(w.own) ? [...new Set(w.own.filter(isSkinId))].slice(0, MAX_OWNED) : [];
            const eq = typeof w.eq === "string" && own.includes(w.eq) ? w.eq : "";
            wallet[k] = { t: Number.isInteger(w.t) && w.t >= 0 ? Math.min(w.t, MAX_TREATS) : 0, own, eq };
          }
        }
        data = { v: 2, player, players: players.slice(0, MAX_PLAYERS), bests, progress, accounts, wallet };
        if (raw.animal && typeof raw.animal === "object" && !Array.isArray(raw.animal)) { // o bichinho escolhido por jogador (0.17.0; só existe quando não é o cachorrinho)
          const animal = Object.create(null);
          for (const [k, a] of Object.entries(raw.animal)) if (typeof k === "string" && k && isAnimal(a) && a !== DEFAULT_ANIMAL) animal[k] = a;
          if (Object.keys(animal).length) data.animal = animal;
        }
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
      if (!savesOk) return false;
      try { const text = JSON.stringify({ v: 1, saves }); storage.setItem(SAVE_KEY, text); lastSavesRaw = text; return true; } catch { savesOk = false; return false; }
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

    // ---------- (0.17.0) o jogo de UM bichinho ----------
    // Pontuação, recordes, ranking, progresso e jogo salvo só daquele animal; jogar um nunca mexe nos dados do outro. `game("dog")` é o cachorrinho (o formato de sempre, o mesmo dos métodos
    // soltos da loja: store.addRun, store.progress...). Dentro do mesmo animal a fase N só abre ao concluir a N−1 (completeLevel). Carteira, contas e jogadores são compartilhados.
    function game(animal) {
      if (!isAnimal(animal)) throw new Error("animal inválido");
      const saveKey = (name) => (animal === DEFAULT_ANIMAL ? nameKey(name) : nameKey(name) + "@" + animal);
      const g = {
        // Registra o resultado de uma fase (`points` = rações + bônus de tempo − vidas perdidas − tentativas extras;
        // pode ser negativo). Só a MELHOR pontuação de cada jogador em cada fase fica guardada: uma partida pior não
        // muda nada e a pontuação da mesma fase nunca se soma. Fases diferentes somam (totalScore).
        addRun({ level, timeMs, points, name }) {
          const p = canonical(name || data.player);
          const t = Math.round(timeMs);
          if (!p || !Number.isInteger(level) || level < 1 || level > 999 || !Number.isFinite(t) || t <= 0 || t > MAX_TIME_MS) return null;
          if (!Number.isInteger(points) || points < -MAX_POINTS || points > MAX_POINTS) return null;
          const prevPersonal = g.personalBest(p, level), prevGeneral = g.generalBest(level);
          const run = { p: points, t, w: now() };
          const newPersonal = !prevPersonal || isBetter(run, prevPersonal);
          if (newPersonal) putBest(data.bests, p, level, run, animal);
          if (!data.players.some((x) => nameKey(x) === nameKey(p))) data.players = [p, ...data.players].slice(0, MAX_PLAYERS);
          save();
          return {
            run: { n: p, l: level, ...run },
            bonus: timeBonus(t),
            first: !prevPersonal,
            newPersonal,
            newGeneral: !prevGeneral || isBetter(run, prevGeneral),
            previousPersonal: prevPersonal,
            personalBest: g.personalBest(p, level),
            generalBest: g.generalBest(level),
            gained: newPersonal ? run.p - (prevPersonal ? prevPersonal.p : 0) : 0, // quanto a pontuação total aumentou
          };
        },

        personalBest(name, level) {
          const rec = data.bests[nameKey(name)], L = bestsOf(rec, animal), b = L && L[level];
          return b ? { n: rec.n, l: level, ...b } : null;
        },
        generalBest(level) { return g.ranking(level, 1)[0] || null; },

        // Melhor pontuação de cada jogador na fase: maior pontuação primeiro (empate: menor tempo).
        ranking(level, n = 10) {
          const rows = [];
          for (const rec of Object.values(data.bests)) { const L = bestsOf(rec, animal), b = L && L[level]; if (b) rows.push({ n: rec.n, l: level, ...b }); }
          return rows.sort(byBest).slice(0, n);
        },

        // Pontuação total do jogador: soma da MELHOR pontuação de cada fase (`levels` limita quais fases contam).
        totalScore(name, levels) {
          const L = bestsOf(data.bests[nameKey(name)], animal);
          if (!L) return 0;
          let sum = 0;
          for (const [lv, b] of Object.entries(L)) if (!levels || levels.includes(Number(lv))) sum += b.p;
          return sum;
        },

        // Ranking geral: jogadores ordenados pela pontuação total.
        totalRanking(n = 10, levels) {
          const rows = [];
          for (const rec of Object.values(data.bests)) {
            const L = bestsOf(rec, animal) || {};
            const lvs = Object.keys(L).map(Number).filter((l) => !levels || levels.includes(l));
            if (lvs.length) rows.push({ n: rec.n, total: lvs.reduce((s, l) => s + L[l].p, 0) });
          }
          return rows.sort((a, b) => b.total - a.total || a.n.localeCompare(b.n)).slice(0, n);
        },

        // ---------- Progresso na campanha: fases concluídas e a próxima liberada (a fase N só abre ao concluir a N−1 DO MESMO animal) ----------
        progress(name) {
          const p = progressOf(data.progress[nameKey(name)], animal);
          return p ? { unlocked: p.unlocked, completed: p.completed.slice() } : { unlocked: 1, completed: [] };
        },
        completeLevel(name, level) {
          const k = nameKey(canonical(name));
          if (!k || !Number.isInteger(level) || level < 1 || level > 999) return null;
          const root = data.progress[k] || { unlocked: 1, completed: [] };
          let p;
          if (animal === DEFAULT_ANIMAL) p = root;
          else { if (!root.G) root.G = Object.create(null); p = root.G[animal] || { unlocked: 1, completed: [] }; root.G[animal] = p; }
          if (!p.completed.includes(level)) p.completed = [...p.completed, level].sort((a, b) => a - b);
          p.unlocked = Math.max(p.unlocked, level + 1);
          data.progress[k] = root;
          save();
          return g.progress(name);
        },

        // ---------- Jogo salvo (um por jogador E por animal). `snap` é qualquer objeto JSON; quem chama valida ao carregar ----------
        saveGame(name, snap) {
          const k = saveKey(canonical(name));
          if (!nameKey(canonical(name)) || !snap || typeof snap !== "object") return false;
          let json; try { json = JSON.stringify(snap); } catch { return false; }
          if (json.length > MAX_SAVE_BYTES) return false;
          saves[k] = { t: now(), snap: JSON.parse(json) };
          const mine = Object.keys(saves).filter((x) => (animal === DEFAULT_ANIMAL ? !x.includes("@") : x.endsWith("@" + animal)));
          if (mine.length > MAX_PLAYERS) delete saves[mine.sort((a, b) => saves[a].t - saves[b].t)[0]];
          return persistSaves();
        },
        loadGame(name) {
          const s = saves[saveKey(name)];
          return s ? { savedAt: s.t, snap: JSON.parse(JSON.stringify(s.snap)) } : null;
        },
        hasGame(name) { return !!saves[saveKey(name)]; },
        clearGame(name) { const k = saveKey(name); if (k in saves) { delete saves[k]; persistSaves(); } },
      };
      return g;
    }

    const api = {
      get persistent() { return persistent && savesOk; },
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
        delete data.wallet[k];
        data.players = data.players.filter((x) => nameKey(x) !== k);
        if (nameKey(data.player) === k) data.player = "";
        failures.delete(k);
        if (data.animal) { delete data.animal[k]; if (!Object.keys(data.animal).length) delete data.animal; } // (a escolha de bichinho sai ANTES de gravar: senão ela ficaria no armazenamento)
        save();
        const mine = Object.keys(saves).filter((x) => x === k || x.startsWith(k + "@"));
        if (mine.length) { for (const x of mine) delete saves[x]; savesOk = true; persistSaves(); } // (savesOk: uma falha antiga de gravação não pode deixar o jogo salvo de uma conta apagada voltar ao recarregar; apagar encolhe o texto)
        return true;
      },

      ...game(DEFAULT_ANIMAL), // pontuação, progresso e jogo salvo do cachorrinho (os métodos soltos da loja são os do cachorrinho)
      // (0.17.0) o jogo de outro bichinho: store.game("cat").addRun(...), .progress(...), .saveGame(...)...; o objeto tem os mesmos métodos
      game(animal) {
        const g = game(animal);
        for (const name of Object.keys(g)) { const fn = g[name]; g[name] = (...args) => { sync(); return fn.apply(g, args); }; } // (como os outros: relê o armazenamento antes)
        return g;
      },
      // o bichinho que o jogador escolheu no menu ("dog" = o cachorrinho, se nunca escolheu); fica guardado por jogador
      animal(name) { const a = data.animal && data.animal[nameKey(name)]; return isAnimal(a) ? a : DEFAULT_ANIMAL; },
      setAnimal(name, animal) {
        const k = nameKey(canonical(name));
        if (!k || !isAnimal(animal)) return null;
        if (animal === DEFAULT_ANIMAL) { if (data.animal) { delete data.animal[k]; if (!Object.keys(data.animal).length) delete data.animal; } }
        else { if (!data.animal) data.animal = Object.create(null); data.animal[k] = animal; }
        save();
        return animal;
      },

      // ---------- Petiscos e skins (0.15.9): carteira de cada jogador ----------
      wallet(name) {
        const w = data.wallet[nameKey(name)];
        return w ? { treats: w.t, owned: w.own.slice(), equipped: w.eq } : { treats: 0, owned: [], equipped: "" };
      },
      // +n petiscos (1 por fase completada); devolve a carteira ou null (sem jogador ou n inválido)
      addTreats(name, n = 1) {
        const k = nameKey(canonical(name));
        if (!k || !Number.isInteger(n) || n < 1 || n > 1000) return null;
        const w = data.wallet[k] || (data.wallet[k] = { t: 0, own: [], eq: "" });
        w.t = Math.min(MAX_TREATS, w.t + n);
        save();
        return this.wallet(name);
      },
      // compra uma skin: o preço tem de ser de pelo menos MIN_SKIN_PRICE; { ok:false, error } se faltam petiscos, já tem ou o pedido é inválido
      buySkin(name, id, price) {
        const k = nameKey(canonical(name));
        if (!k || !isSkinId(id) || !Number.isInteger(price) || price < MIN_SKIN_PRICE || price > MAX_TREATS) return { ok: false, error: "invalid" };
        const w = data.wallet[k] || (data.wallet[k] = { t: 0, own: [], eq: "" });
        if (w.own.includes(id)) return { ok: false, error: "owned" };
        if (w.t < price) return { ok: false, error: "funds" };
        if (w.own.length >= MAX_OWNED) return { ok: false, error: "invalid" };
        w.t -= price; w.own = [...w.own, id];
        save();
        return { ok: true, wallet: this.wallet(name) };
      },
      // usa uma skin que já é do jogador ("" = a padrão)
      equipSkin(name, id) {
        const k = nameKey(canonical(name));
        if (!k || (id !== "" && !isSkinId(id))) return null;
        const w = data.wallet[k] || (data.wallet[k] = { t: 0, own: [], eq: "" });
        if (id !== "" && !w.own.includes(id)) return null;
        w.eq = id;
        save();
        return this.wallet(name);
      },

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
    BONUS_MAX, RATION_POINTS, BONE_POINTS, POSTMAN_POINTS, BALL_POINTS, MIN_SKIN_PRICE, MAX_TREATS, LIFE_PENALTY, RETRY_PENALTY, MAX_RETRIES, MAX_NAME, MAX_POINTS,
    DEFAULT_ANIMAL }; // (0.18.0) DEFAULT_ANIMAL: o bichinho padrão ("dog"); board.js e game.js usam este, em vez de repetir o texto
});
