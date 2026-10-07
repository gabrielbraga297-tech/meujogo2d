(() => {
  "use strict";

  const TILE = 32;
  const TOTAL_ITEMS = 5;
  const SPEED = 180;       // cachorro, pixels do mundo por segundo
  const START_LIVES = 3;   // vidas no começo da fase
  const MAX_LIVES = 5;     // o jogador pode ter de 1 a 5 vidas (uma ração traz 1 vida extra)
  const INVULN = 2;        // segundos de proteção depois de perder uma vida
  const LEVEL_ID = 1;      // fase atual (chave dos recordes)
  const LEVELS = [1];      // fases que aparecem na tela de pontuações
  const MIN_TILE_CSS = 24; // abaixo disso (telas pequenas) a câmera dá zoom e segue o cachorro
  const MAX_BACKING_W = 2400; // limite de resolução interna do canvas (desempenho)
  const AUTOSAVE_EVERY = 5;   // segundos entre salvamentos automáticos
  const RESUME_GRACE = 1.5;   // proteção ao continuar um jogo salvo

  // Configuração dos veterinários da Fase 1: apenas um. Patrulha devagar e raramente decide perseguir,
  // mas, quando aparece o "!", ele acelera e persegue com mais empenho.
  const LEVEL = {
    vets: [{
      speed: 48,        // velocidade ao patrulhar
      chaseSpeed: 100,  // velocidade ao perseguir (o cachorro, a 180, ainda é bem mais rápido)
      sight: 112,       // distância máxima para notar o cachorro (px)
      chaseChance: 0.25,// chance de decidir perseguir a cada "olhada"
      thinkEvery: 0.6,  // intervalo entre "olhadas" (s)
      chaseTime: 3,     // duração mínima de uma perseguição (s)
      chaseMax: 6,      // duração máxima: enquanto vê o cachorro ele não desiste, até este limite (s)
      restTime: 5,      // descanso depois de perseguir (s)
      idleMin: 0.6, idleMax: 1.6, // pausa ao chegar no destino da patrulha (s)
    }],
  };

  // # parede | X caixa | E saída | P início do cachorro | V início do veterinário
  // (as rações são sorteadas em lugares livres a cada jogo novo: veja placeItems)
  const MAP = [
    "#########################",
    "#P......#.........#.....#",
    "#.......#....X....#.....#",
    "#..XX...#....X....#.....#",
    "#..XX.........X.........#",
    "#.......#.....X....##.###",
    "#####.###..........#....#",
    "#.....#....#####...#....#",
    "#.....#....#...#........#",
    "#.....#....#...#...XX...#",
    "#.....X.........#..XX...#",
    "#.....#....#....#.......#",
    "###.###....######.#######",
    "#.V.....#...............#",
    "#..XXX..#...............#",
    "#.......#...XX.......EEE#",
    "#...............XX...EEE#",
    "#########################",
  ];
  const COLS = MAP[0].length, ROWS = MAP.length;
  const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;

  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const fmt = Records.formatTime;
  const calm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function safeStorage() { try { return window.localStorage; } catch { return null; } }
  const store = Records.createStore(safeStorage());

  const keys = {};
  const touch = { left: false, right: false, up: false, down: false };
  let state = "menu"; // menu | playing | paused | won | lost
  let solids, items, vets, exitRect, player, spawn, walk;
  let collected, score, time, lives, livesLost, invuln, hintTimer;
  let rand = Math.random;
  let freezeVets = false; // usado apenas em testes
  let noCatch = false;    // usado apenas em testes
  const view = { k: 1, zoom: 1, camX: 0, camY: 0 };

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const tileOf = (cx, cy) => [Math.floor(cx / TILE), Math.floor(cy / TILE)];
  const centerOf = (c, r) => [c * TILE + TILE / 2, r * TILE + TILE / 2];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Sorteia onde ficam as rações: só em chão alcançável, longe do início do cachorro, do veterinário e da saída,
  // e espalhadas pelo mapa (a distância mínima entre elas diminui só se for preciso).
  function placeItems(spawnTile, vetTiles, exitTiles) {
    const g = bfs(spawnTile), key = (c, r) => r * COLS + c;
    const exitKeys = new Set(exitTiles.map(([c, r]) => key(c, r)));
    const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const cand = shuffle(g.q.filter((t) => !exitKeys.has(key(...t)) && g.dist.get(key(...t)) >= 4 && vetTiles.every((v) => apart(t, v) >= 4)));
    for (const gap of [6, 5, 4, 3, 2, 0]) {
      const picked = [];
      for (const t of cand) {
        if (picked.every((p) => apart(p, t) >= gap)) picked.push(t);
        if (picked.length === TOTAL_ITEMS) return picked;
      }
    }
    return cand.slice(0, TOTAL_ITEMS);
  }

  function reset() {
    solids = []; items = []; vets = [];
    collected = 0; score = 0; time = 0; lives = START_LIVES; livesLost = 0; invuln = 0; hintTimer = 0;
    walk = MAP.map((row) => [...row].map((ch) => ch !== "#" && ch !== "X"));
    let ex1 = COLS, ey1 = ROWS, ex2 = 0, ey2 = 0;
    const exitTiles = [], vetTiles = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c], x = c * TILE, y = r * TILE;
      if (ch === "#" || ch === "X") solids.push({ x, y, w: TILE, h: TILE, kind: ch });
      else if (ch === "E") { exitTiles.push([c, r]); ex1 = Math.min(ex1, c); ey1 = Math.min(ey1, r); ex2 = Math.max(ex2, c); ey2 = Math.max(ey2, r); }
      else if (ch === "P") { spawn = { x: x + 4, y: y + 4 }; player = { x: spawn.x, y: spawn.y, w: 24, h: 24, facing: "right", moving: false }; }
      else if (ch === "V") {
        const cfg = LEVEL.vets[vets.length] || LEVEL.vets[0];
        const [cx, cy] = centerOf(c, r);
        vets.push({ cfg, sx: cx, sy: cy, cx, cy, mode: "patrol", leg: null, route: [], idle: 1, think: cfg.thinkEvery, modeT: 0, chaseAge: 0, cool: 2, dir: 1 });
        vetTiles.push([c, r]);
      }
    }
    exitRect = { x: ex1 * TILE, y: ey1 * TILE, w: (ex2 - ex1 + 1) * TILE, h: (ey2 - ey1 + 1) * TILE };
    items = placeItems(tileOf(spawn.x + 12, spawn.y + 12), vetTiles, exitTiles)
      .map(([c, r]) => ({ x: c * TILE + 8, y: r * TILE + 8, w: 16, h: 16, taken: false, life: false }));
    if (items.length) items[Math.floor(rand() * items.length)].life = true; // uma ração traz uma vida extra
  }

  // ---------- Cachorro ----------
  function moveAxis(dx, dy) {
    player.x += dx; player.y += dy;
    for (const s of solids) {
      if (!overlap(player, s)) continue;
      if (dx > 0) player.x = s.x - player.w;
      else if (dx < 0) player.x = s.x + s.w;
      if (dy > 0) player.y = s.y - player.h;
      else if (dy < 0) player.y = s.y + s.h;
    }
  }

  // ---------- Veterinário (caminha pelo centro dos tiles, sem atravessar paredes) ----------
  function bfs(from) {
    const prev = new Map(), dist = new Map();
    const key = (c, r) => r * COLS + c;
    const q = [from]; dist.set(key(...from), 0); prev.set(key(...from), null);
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i], d = dist.get(key(c, r));
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || !walk[nr][nc] || dist.has(key(nc, nr))) continue;
        dist.set(key(nc, nr), d + 1); prev.set(key(nc, nr), [c, r]); q.push([nc, nr]);
      }
    }
    return { q, dist, prev, key };
  }

  function pathTo(g, to) {
    const out = [];
    for (let cur = to; cur && g.prev.get(g.key(...cur)); cur = g.prev.get(g.key(...cur))) out.unshift(cur);
    return out;
  }

  function canSee(v) {
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const dx = px - v.cx, dy = py - v.cy, dist = Math.hypot(dx, dy);
    if (dist > v.cfg.sight) return false;
    for (let d = 0; d < dist; d += 8) {
      const [c, r] = tileOf(v.cx + (dx * d) / dist, v.cy + (dy * d) / dist);
      if (!walk[r][c]) return false;
    }
    return true;
  }

  function updateVet(v, dt) {
    const cfg = v.cfg;
    v.cool -= dt; v.think -= dt; v.modeT -= dt;
    if (v.mode === "patrol" && v.cool <= 0 && v.think <= 0) {
      v.think = cfg.thinkEvery;
      if (canSee(v) && rand() < cfg.chaseChance) { v.mode = "chase"; v.modeT = cfg.chaseTime; v.chaseAge = 0; }
    }
    if (v.mode === "chase") {
      v.chaseAge += dt;
      if (canSee(v)) v.modeT = Math.max(v.modeT, cfg.chaseTime * 0.4); // enquanto vê o cachorro, não desiste
    }
    if (v.mode === "chase" && (v.modeT <= 0 || v.chaseAge >= cfg.chaseMax)) { v.mode = "patrol"; v.cool = cfg.restTime; v.route = []; v.idle = 0.5; }

    if (!v.leg) { // está exatamente no centro de um tile: decide o próximo passo
      if (v.mode === "chase") {
        const g = bfs(tileOf(v.cx, v.cy));
        const p = pathTo(g, tileOf(player.x + player.w / 2, player.y + player.h / 2));
        v.leg = p[0] || null;
      } else if (v.idle > 0) {
        v.idle -= dt;
      } else {
        if (!v.route.length) {
          const g = bfs(tileOf(v.cx, v.cy));
          const far = g.q.filter(([c, r]) => g.dist.get(g.key(c, r)) >= 5);
          if (far.length) v.route = pathTo(g, far[Math.floor(rand() * far.length)]);
        }
        v.leg = v.route.shift() || null;
        if (!v.leg) v.idle = cfg.idleMin;
      }
    }

    if (v.leg) {
      const [tx, ty] = centerOf(...v.leg);
      const dx = tx - v.cx, dy = ty - v.cy, dist = Math.hypot(dx, dy);
      const step = (v.mode === "chase" ? cfg.chaseSpeed : cfg.speed) * dt;
      if (dx) v.dir = Math.sign(dx);
      if (dist <= step) {
        v.cx = tx; v.cy = ty; v.leg = null;
        if (v.mode === "patrol" && !v.route.length) v.idle = cfg.idleMin + rand() * (cfg.idleMax - cfg.idleMin);
      } else { v.cx += (dx / dist) * step; v.cy += (dy / dist) * step; }
    }
  }

  // ---------- Pontuação e vidas ----------
  // Pontuação corrente: 100 por ração − 50 por vida perdida (o bônus de tempo entra ao terminar a fase).
  const runningScore = () => Math.max(0, collected * Records.RATION_POINTS - livesLost * Records.LIFE_PENALTY);

  function giveLife() {
    if (lives < MAX_LIVES) { lives++; toast("Vida extra! +1 vida", 2.2); }
    else toast(`Esta ração tinha uma vida extra, mas você já está com o máximo (${MAX_LIVES} vidas).`, 2.8);
  }

  function respawn() { // cachorro volta ao início, veterinário volta ao seu posto
    Object.assign(player, { x: spawn.x, y: spawn.y, facing: "right", moving: false });
    for (const v of vets) {
      Object.assign(v, { cx: v.sx, cy: v.sy, mode: "patrol", leg: null, route: [], idle: 2, cool: 3, modeT: 0, chaseAge: 0, think: v.cfg.thinkEvery });
    }
    invuln = INVULN;
  }

  function loseLife() {
    lives--; livesLost++;
    score = runningScore();
    if (lives <= 0) { gameOver(); return; }
    respawn();
    toast(`Perdeu uma vida! −${Records.LIFE_PENALTY} pontos.`, 2);
    saveNow();
  }

  // ---------- Atualização ----------
  function update(dt) {
    time += dt;
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $("toast").classList.remove("show");

    let ix = 0, iy = 0;
    if (keys.ArrowLeft || keys.a || touch.left) ix -= 1;
    if (keys.ArrowRight || keys.d || touch.right) ix += 1;
    if (keys.ArrowUp || keys.w || touch.up) iy -= 1;
    if (keys.ArrowDown || keys.s || touch.down) iy += 1;
    player.moving = !!(ix || iy);
    if (ix) player.facing = ix > 0 ? "right" : "left";
    else if (iy) player.facing = iy > 0 ? "down" : "up";
    if (ix && iy) { ix *= Math.SQRT1_2; iy *= Math.SQRT1_2; }
    const step = Math.min(dt, 0.05) * SPEED;
    moveAxis(ix * step, 0);
    moveAxis(0, iy * step);

    for (const it of items) {
      if (!it.taken && overlap(player, it)) { it.taken = true; collected++; if (it.life) giveLife(); score = runningScore(); saveNow(); }
    }

    if (!freezeVets) for (const v of vets) updateVet(v, Math.min(dt, 0.05));
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    if (invuln > 0) invuln -= dt;
    else if (!noCatch && vets.some((v) => Math.hypot(v.cx - px, v.cy - py) < 22)) { loseLife(); return; }

    if (overlap(player, exitRect)) {
      if (collected >= TOTAL_ITEMS) win();
      else if (hintTimer <= 0) toast("Colete todas as rações antes de sair!", 1.5);
    }
  }

  // ---------- Estados e telas ----------
  const SCREENS = ["menu", "howto", "scores", "name", "confirm", "pause", "win", "lose"].map($);

  function setState(s) {
    state = s;
    document.body.dataset.state = s;
    if (s !== "playing") clearTouch();
  }

  function showScreen(id) {
    for (const el of SCREENS) el.classList.toggle("hidden", el.id !== id);
    document.body.dataset.screen = id || "";
    $("stage").inert = !!id; $("touch").inert = !!id;
    const el = id && $(id);
    if (el) {
      el.scrollTop = 0;
      const visible = (n) => n.offsetParent !== null;
      const f = [...el.querySelectorAll("[data-autofocus]")].find(visible) || [...el.querySelectorAll("button, input")].find(visible);
      if (f) f.focus({ preventScroll: true });
    }
  }

  function toast(text, seconds) {
    $("toast").textContent = text; $("toast").classList.add("show"); hintTimer = seconds;
  }

  function goMenu() {
    setState("menu");
    hintTimer = 0; $("toast").classList.remove("show");
    renderMenu();
    showScreen("menu");
  }

  function beginPlay() {
    for (const k in keys) keys[k] = false;
    hintTimer = 0; $("toast").classList.remove("show");
    autosaveT = 0;
    setState("playing");
    showScreen(null);
    fitCanvas();
    updateHud();
    last = performance.now();
  }

  function startGame() { reset(); beginPlay(); }

  // ---------- Jogo salvo ----------
  let autosaveT = 0, saveFlashTimer = null;

  function snapshot() {
    const r2 = (n) => Math.round(n * 100) / 100;
    return {
      v: 2, l: LEVEL_ID, time: r2(time), lives, lost: livesLost, invuln: r2(Math.max(0, invuln)),
      items: items.map((it) => [(it.x - 8) / TILE, (it.y - 8) / TILE, it.taken ? 1 : 0, it.life ? 1 : 0]),
      p: { x: r2(player.x), y: r2(player.y), f: player.facing },
      vets: vets.map((v) => [r2(v.cx), r2(v.cy)]),
    };
  }

  // Confere um jogo salvo antes de usar (o armazenamento pode ter sido editado ou corrompido).
  function parseSnapshot(sv) {
    try {
      const num = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
      if (!sv || sv.v !== 2 || sv.l !== LEVEL_ID) return null;
      if (!num(sv.time, 0, 86400) || !Number.isInteger(sv.lives) || sv.lives < 1 || sv.lives > MAX_LIVES || !num(sv.invuln, 0, INVULN)) return null;
      if (!Number.isInteger(sv.lost) || sv.lost < 0 || sv.lost > 999) return null;
      if (!Array.isArray(sv.items) || sv.items.length !== TOTAL_ITEMS) return null;
      const seen = new Set();
      let lifeItems = 0;
      for (const it of sv.items) {
        if (!Array.isArray(it) || it.length !== 4) return null;
        const [c, r, t, l] = it;
        if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= COLS || r >= ROWS || !walk[r][c] || (t !== 0 && t !== 1) || (l !== 0 && l !== 1)) return null;
        if (seen.has(r * COLS + c)) return null;
        seen.add(r * COLS + c);
        lifeItems += l;
      }
      if (lifeItems !== 1) return null; // sempre existe exatamente uma ração com vida extra
      const p = sv.p;
      if (!p || !num(p.x, 0, WORLD_W - 24) || !num(p.y, 0, WORLD_H - 24) || !["left", "right", "up", "down"].includes(p.f)) return null;
      if (solids.some((o) => overlap({ x: p.x, y: p.y, w: 24, h: 24 }, o))) return null;
      if (!Array.isArray(sv.vets) || sv.vets.length !== vets.length) return null;
      for (const v of sv.vets) {
        if (!Array.isArray(v) || !num(v[0], 0, WORLD_W - 1) || !num(v[1], 0, WORLD_H - 1)) return null;
        const [c, r] = tileOf(v[0], v[1]);
        if (!walk[r][c]) return null;
      }
      return sv;
    } catch { return null; }
  }

  function savedGame() { // jogo salvo válido do jogador atual, ou null (e limpa um save inválido)
    const me = store.player();
    if (!me) return null;
    const g = store.loadGame(me);
    if (!g) return null;
    const sv = parseSnapshot(g.snap);
    if (!sv) { store.clearGame(me); return null; }
    return { savedAt: g.savedAt, snap: sv };
  }

  function applySnapshot(sv) {
    reset();
    items = sv.items.map(([c, r, t, l]) => ({ x: c * TILE + 8, y: r * TILE + 8, w: 16, h: 16, taken: t === 1, life: l === 1 }));
    time = sv.time; lives = sv.lives; livesLost = sv.lost;
    collected = items.filter((i) => i.taken).length; score = runningScore();
    Object.assign(player, { x: sv.p.x, y: sv.p.y, facing: sv.p.f, moving: false });
    vets.forEach((v, i) => {
      const [c, r] = tileOf(sv.vets[i][0], sv.vets[i][1]);
      [v.cx, v.cy] = centerOf(c, r); // o veterinário volta ao centro do tile mais próximo
      Object.assign(v, { mode: "patrol", leg: null, route: [], idle: 1, cool: 2, modeT: 0, chaseAge: 0 });
    });
    invuln = Math.max(sv.invuln, RESUME_GRACE);
  }

  function continueGame() {
    const g = savedGame();
    if (!g) { renderMenu(); goMenu(); return; }
    applySnapshot(g.snap);
    beginPlay();
    toast("Jogo carregado. Boa sorte!", 2);
  }

  function flashSaved() {
    const e = $("save-status");
    e.textContent = store.persistent ? "✓ salvo" : "salvo só nesta página";
    e.classList.add("on");
    clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => e.classList.remove("on"), 1400);
  }

  function saveNow() {
    const me = store.player();
    if (!me || (state !== "playing" && state !== "paused")) return false;
    const ok = store.saveGame(me, snapshot());
    flashSaved();
    return ok;
  }

  // "Novo jogo": pede nome se ainda não há um e confirma antes de apagar um jogo salvo.
  function requestNewGame() {
    if (!store.player()) { openName(true); return; }
    const g = savedGame();
    if (!g) { startGame(); return; }
    $("confirm-text").textContent = `${store.player()} já tem um jogo salvo (${describeSave(g.snap)}). Se você começar um novo jogo, esse progresso será apagado.`;
    showScreen("confirm");
  }

  function describeSave(sv) {
    const got = sv.items.filter((i) => i[2] === 1).length;
    return `Fase ${sv.l} · ${fmt(sv.time * 1000)} · ${got}/${TOTAL_ITEMS} rações · ${sv.lives} ${sv.lives === 1 ? "vida" : "vidas"}`;
  }

  function pauseGame() {
    if (state !== "playing") return;
    saveNow(); // pausar também salva
    setState("paused");
    $("pause-msg").textContent = "";
    showScreen("pause");
  }
  function resumeGame() { if (state !== "paused") return; setState("playing"); showScreen(null); last = performance.now(); }

  // Tempo oficial: arredondado ao décimo de segundo (é o que aparece na tela e o que conta para o bônus).
  const officialTimeMs = () => Math.round(time * 10) * 100;

  function win() {
    setState("won");
    const timeMs = officialTimeMs();
    const bonus = Records.timeBonus(timeMs);
    const points = Records.levelPoints(collected, timeMs, livesLost); // rações + bônus de tempo − vidas perdidas
    score = points;
    $("win-points").textContent = String(points);
    $("win-breakdown").textContent = `Rações: ${collected * Records.RATION_POINTS} + bônus de tempo: ${bonus}` +
      (livesLost ? ` − vidas perdidas: ${livesLost * Records.LIFE_PENALTY}` : "") + ` · tempo: ${fmt(timeMs)}`;
    $("win-extra").textContent = `Vidas restantes: ${lives} · Vidas perdidas: ${livesLost}`;
    let res = null;
    try {
      res = store.addRun({ level: LEVEL_ID, timeMs, points });
      const me = store.player();
      if (me) { store.completeLevel(me, LEVEL_ID); store.clearGame(me); } // fase concluída: o jogo em andamento termina
    } catch { /* seguem sem registrar */ }
    if (res) {
      const best = res.personalBest.p;
      $("win-personal").textContent = res.first ? "Primeira pontuação desta fase registrada!"
        : res.newPersonal ? (res.gained > 0 ? `Nova melhor pontuação da fase! Antes: ${res.previousPersonal.p}.`
          : `Mesma pontuação da sua melhor (${best}), em menos tempo: novo recorde pessoal!`)
        : `Sua melhor pontuação nesta fase continua ${best}. Na mesma fase não soma: vale a maior.`;
      $("win-general").textContent = res.newGeneral ? "Novo recorde geral!"
        : `Recorde geral: ${res.generalBest.p} pontos (${res.generalBest.n})`;
      $("win-total").textContent = `Pontuação total: ${store.totalScore(store.player(), LEVELS)}${res.gained > 0 ? ` (+${res.gained})` : ""}`;
    } else {
      $("win-personal").textContent = "Escolha um nome de usuário para guardar as suas pontuações.";
      $("win-general").textContent = "";
      $("win-total").textContent = "";
    }
    showScreen("win");
  }

  function gameOver() {
    setState("lost");
    if (store.player()) store.clearGame(store.player()); // acabaram as vidas: não há o que continuar
    $("lose-text").textContent = `Rações coletadas: ${collected}/${TOTAL_ITEMS} · Pontos: ${score}`;
    showScreen("lose");
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderMenu() {
    const me = store.player();
    $("menu-player").textContent = me || "ainda não escolhido";
    const best = me ? store.personalBest(me, LEVEL_ID) : null;
    $("menu-best").textContent = best ? `Sua melhor pontuação na Fase ${LEVEL_ID}: ${best.p}` : "";
    const done = me ? store.progress(me).completed.filter((l) => LEVELS.includes(l)).length : 0;
    $("menu-progress").textContent = me ? `Fases concluídas: ${done}/${LEVELS.length} · Pontuação total: ${store.totalScore(me, LEVELS)}` : "";
    const g = savedGame();
    $("btn-continue").classList.toggle("hidden", !g);
    $("btn-start").classList.toggle("primary", !g);
    $("menu-save").classList.toggle("hidden", !g);
    if (g) $("menu-save").textContent = `Jogo salvo: ${describeSave(g.snap)}`;
  }

  function fmtDate(w) {
    try { return new Date(w).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  }

  function renderScores() {
    const body = $("scores-body"), me = store.player();
    body.replaceChildren();

    const sum = el("section", "score-level");
    sum.append(el("h2", null, "Pontuação total"));
    sum.append(el("p", "big-total", me ? `${store.totalScore(me, LEVELS)} pontos` : "—"));
    sum.append(el("p", null, me ? `${me}: soma da melhor pontuação de cada fase.` : "Escolha um nome de usuário para guardar as suas pontuações."));
    const tr = store.totalRanking(5, LEVELS);
    if (tr.length) {
      sum.append(el("h3", null, "Ranking geral"));
      const ol = el("ol");
      for (const r of tr) ol.append(el("li", me && Records.nameKey(r.n) === Records.nameKey(me) ? "me" : "", `${r.n} — ${r.total} pontos`));
      sum.append(ol);
    }
    body.append(sum);

    for (const lvl of LEVELS) {
      const sec = el("section", "score-level");
      sec.append(el("h2", null, `Fase ${lvl}`));
      const pb = me ? store.personalBest(me, lvl) : null, gb = store.generalBest(lvl);
      const dl = el("dl");
      dl.append(el("dt", null, me ? `Sua melhor pontuação (${me})` : "Sua melhor pontuação"), el("dd", null, pb ? `${pb.p} pts · ${fmt(pb.t)}` : "—"));
      dl.append(el("dt", null, "Recorde geral"), el("dd", null, gb ? `${gb.p} pts — ${gb.n} (${fmt(gb.t)})` : "—"));
      sec.append(dl);

      const rank = store.ranking(lvl, 5);
      if (rank.length) {
        sec.append(el("h3", null, "Ranking da fase"));
        const ol = el("ol");
        for (const r of rank) ol.append(el("li", me && Records.nameKey(r.n) === Records.nameKey(me) ? "me" : "", `${r.n} — ${r.p} pts (${fmt(r.t)})`));
        sec.append(ol);
      }

      sec.append(el("h3", null, "Seu histórico"));
      const hist = me ? store.history(me, lvl, 10) : [];
      if (hist.length) {
        const ul = el("ul");
        let starred = false;
        for (const r of hist) {
          const li = el("li", null, `${fmtDate(r.w)} — ${r.p} pts · ${fmt(r.t)}`);
          if (!starred && pb && r.p === pb.p && r.t === pb.t) { li.append(" ", el("span", "star", "★ melhor")); starred = true; }
          ul.append(li);
        }
        sec.append(ul);
      } else {
        sec.append(el("p", null, me ? "Você ainda não terminou esta fase. Termine para aparecer aqui." : "Escolha um nome de usuário para guardar o seu histórico."));
      }
      body.append(sec);
    }
    $("scores-note").classList.toggle("hidden", store.persistent);
  }

  let nameThenStart = false;
  function openName(thenStart) {
    nameThenStart = !!thenStart;
    $("name-input").value = store.player();
    $("name-error").textContent = "";
    $("name-why").classList.toggle("hidden", !thenStart);
    $("name-note").classList.toggle("hidden", store.persistent);
    const chips = $("name-chips"), list = store.players();
    chips.replaceChildren();
    for (const n of list) {
      const b = el("button", null, n); b.type = "button";
      b.addEventListener("click", () => saveName(n));
      chips.append(b);
    }
    $("name-saved").classList.toggle("hidden", list.length === 0);
    showScreen("name");
    $("name-input").select();
  }

  function saveName(raw) {
    const p = store.setPlayer(raw);
    if (!p) {
      $("name-error").textContent = "Escreva um nome com pelo menos uma letra ou número. Exemplo: Totó.";
      $("name-input").focus();
      return;
    }
    renderMenu();
    if (nameThenStart) requestNewGame(); else goMenu();
  }

  // ---------- Câmera e tamanho (proporcional a cada aparelho) ----------
  function fitCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = clamp(Math.round(r.width * dpr), 200, MAX_BACKING_W), bh = Math.round((bw * WORLD_H) / WORLD_W);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    view.k = bw / WORLD_W;
    view.zoom = clamp(MIN_TILE_CSS / (r.width / COLS), 1, 2); // telas pequenas: aproxima e segue o cachorro
  }

  // ---------- Desenho do mundo ----------
  function ellipse(x, y, rx, ry, color, rot = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  }

  function drawKibble(it) { // tigela de ração
    const cx = it.x + 8, cy = it.y + 8 + (calm ? 0 : Math.sin(time * 4 + it.x) * 2);
    ellipse(cx, cy + 5, 10, 4, "rgba(0,0,0,.25)");
    for (const [dx, dy] of [[-5, 0], [0, -2], [5, 0], [-2, 1], [3, 1], [0, 2]]) ellipse(cx + dx, cy + dy, 3.2, 2.6, "#8b5a2b");
    ellipse(cx - 1, cy - 3, 2.6, 2.2, "#a8703a");
    ctx.fillStyle = "#e5533d"; ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx + 10, cy + 1); ctx.lineTo(cx + 7, cy + 8); ctx.lineTo(cx - 7, cy + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(cx - 8, cy + 3, 16, 1.5);
    if (it.life) { // vida extra: coração vermelho em cima da tigela
      const hy = cy - 12 - (calm ? 0 : Math.abs(Math.sin(time * 5)) * 2);
      ctx.fillStyle = "#ff2d3d"; ctx.beginPath();
      ctx.moveTo(cx, hy + 7); ctx.bezierCurveTo(cx - 9, hy + 1, cx - 5, hy - 5, cx, hy - 1); ctx.bezierCurveTo(cx + 5, hy - 5, cx + 9, hy + 1, cx, hy + 7); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function drawDog(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const wag = calm ? 0 : Math.sin(time * 16) * (p.moving ? 5 : 2);
    const leg = p.moving ? Math.sin(time * 18) * 3 : 0;
    const TAN = "#d9a066", DARK = "#7a4a22", LIGHT = "#f1d2a6";
    ellipse(cx, cy + 10, 12, 4, "rgba(0,0,0,.25)");
    ctx.lineCap = "round";
    if (p.facing === "left" || p.facing === "right") {
      const s = p.facing === "right" ? 1 : -1;
      ctx.strokeStyle = DARK; ctx.lineWidth = 3; // rabo
      ctx.beginPath(); ctx.moveTo(cx - s * 9, cy - 1); ctx.quadraticCurveTo(cx - s * 15, cy - 5 + wag, cx - s * 14, cy - 9 + wag); ctx.stroke();
      ctx.fillStyle = DARK; // patas
      ctx.fillRect(cx - s * 7 - 2 + leg, cy + 4, 4, 7); ctx.fillRect(cx + s * 4 - 2 - leg, cy + 4, 4, 7);
      ellipse(cx - s * 2, cy + 1, 10, 7, TAN);                 // corpo
      ellipse(cx - s * 4, cy - 1, 5, 4, DARK);                 // mancha
      ellipse(cx + s * 8, cy - 3, 7, 6.5, TAN);                // cabeça
      ellipse(cx + s * 13, cy - 1, 4, 3, LIGHT);               // focinho
      ellipse(cx + s * 15.5, cy - 1.5, 1.6, 1.4, "#222");      // nariz
      ellipse(cx + s * 4, cy - 4, 2.6, 5, DARK, s * 0.25);     // orelha
      ellipse(cx + s * 10, cy - 5, 1.4, 1.4, "#222");          // olho
    } else {
      const s = p.facing === "down" ? 1 : -1;
      ctx.strokeStyle = DARK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 6); ctx.lineTo(cx + wag, cy - s * 13); ctx.stroke(); // rabo
      ctx.fillStyle = DARK;
      ctx.fillRect(cx - 8, cy - 2 + leg, 4, 6); ctx.fillRect(cx + 4, cy - 2 - leg, 4, 6);
      ellipse(cx, cy - s * 1, 8, 9, TAN);                      // corpo
      ellipse(cx, cy + s * 8, 7, 6.5, TAN);                    // cabeça
      ellipse(cx - 7, cy + s * 7, 2.6, 5, DARK, -0.2);         // orelhas
      ellipse(cx + 7, cy + s * 7, 2.6, 5, DARK, 0.2);
      if (s === 1) {
        ellipse(cx, cy + 11, 3.6, 2.8, LIGHT);
        ellipse(cx, cy + 12, 1.6, 1.3, "#222");
        ellipse(cx - 3, cy + 7, 1.3, 1.3, "#222"); ellipse(cx + 3, cy + 7, 1.3, 1.3, "#222");
      }
    }
  }

  function drawVet(v) {
    const x = v.cx, y = v.cy + (calm ? 0 : Math.sin(time * 6 + v.cx) * (v.leg ? 1 : 0));
    ellipse(x, y + 12, 11, 4, "rgba(0,0,0,.25)");
    ctx.fillStyle = "#2f4a6b"; ctx.fillRect(x - 6, y + 4, 5, 9); ctx.fillRect(x + 1, y + 4, 5, 9); // calça
    ctx.fillStyle = "#f4f7fa"; ctx.fillRect(x - 10, y - 7, 20, 15); // jaleco
    ctx.fillStyle = "#e1e8ef"; ctx.fillRect(x - 12, y - 6, 3, 10); ctx.fillRect(x + 9, y - 6, 3, 10);   // braços
    ctx.fillStyle = "#18a999"; ctx.fillRect(x - 1.5, y - 4, 3, 9); ctx.fillRect(x - 4.5, y - 1, 9, 3);  // cruz
    ellipse(x, y - 12, 6, 6, "#f0c8a0");                                                                // cabeça
    ctx.fillStyle = "#18a999"; ctx.beginPath(); ctx.arc(x, y - 13, 6.4, Math.PI, 0); ctx.fill();        // touca
    ctx.fillRect(x - 7, y - 13.5, 14, 2);
    ellipse(x - 2.2 + v.dir, y - 11, 1, 1, "#222"); ellipse(x + 2.2 + v.dir, y - 11, 1, 1, "#222");
    if (v.mode === "chase") {
      ctx.fillStyle = "#ff4d4d"; ctx.font = "bold 26px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", x, y - 22 - (calm ? 0 : Math.abs(Math.sin(time * 12)) * 4));
    }
  }

  function draw() {
    if (state === "menu" || !solids) return;
    const sx = view.k * view.zoom;
    const vw = WORLD_W / view.zoom, vh = WORLD_H / view.zoom;
    const camX = Math.round(clamp(player.x + player.w / 2 - vw / 2, 0, WORLD_W - vw) * sx) / sx;
    const camY = Math.round(clamp(player.y + player.h / 2 - vh / 2, 0, WORLD_H - vh) * sx) / sx;
    view.camX = camX; view.camY = camY;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1d2330"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sx, 0, 0, sx, -camX * sx, -camY * sx);

    // retângulos alinhados aos pixels do aparelho: sem frestas entre os blocos em nenhum tamanho
    const snap = (v) => Math.round(v * sx) / sx;
    const rect = (x, y, w, h) => { const x0 = snap(x), y0 = snap(y); ctx.fillRect(x0, y0, snap(x + w) - x0, snap(y + h) - y0); };

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#232a3a" : "#262e40";
      rect(c * TILE, r * TILE, TILE, TILE);
    }
    ctx.fillStyle = collected >= TOTAL_ITEMS ? "#3ddc84" : "#7a4b4b";
    rect(exitRect.x, exitRect.y, exitRect.w, exitRect.h);
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("SAÍDA", exitRect.x + exitRect.w / 2, exitRect.y + exitRect.h / 2 + 5);
    for (const s of solids) {
      if (s.kind === "#") {
        ctx.fillStyle = "#4a5470"; rect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#5d6a8c"; rect(s.x, s.y, s.w, 4);
      } else {
        ctx.fillStyle = "#8a5a2b"; rect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
        ctx.strokeStyle = "#5e3b17"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      }
    }
    for (const it of items) if (!it.taken) drawKibble(it);
    for (const v of vets) drawVet(v);
    if (!(invuln > 0 && Math.floor(time * 10) % 2 === 0)) drawDog(player); // pisca enquanto está protegido
  }

  // ---------- Placar (HTML) ----------
  const hudEl = { items: $("hud-items"), points: $("hud-points"), time: $("hud-time"), bonus: $("hud-bonus"), lives: $("hud-lives"), hearts: [...document.querySelectorAll("#hud-lives .heart")] };
  const hudCache = {};
  function setHud(key, node, value) { if (hudCache[key] !== value) { hudCache[key] = value; node.textContent = value; } }
  function updateHud() {
    if (!solids) return;
    setHud("i", hudEl.items, `${collected}/${TOTAL_ITEMS}`);
    setHud("p", hudEl.points, String(score));
    setHud("t", hudEl.time, fmt(time * 1000));
    setHud("b", hudEl.bonus, `+${Records.timeBonus(officialTimeMs())}`);
    if (hudCache.l !== lives) {
      hudCache.l = lives;
      const slots = Math.max(START_LIVES, lives); // mostra 3 corações no começo; ganhar vidas mostra mais, até 5
      hudEl.hearts.forEach((h, i) => { h.classList.toggle("hidden", i >= slots); h.classList.toggle("lost", i < slots && i >= lives); });
      hudEl.lives.setAttribute("aria-label", `${lives} ${lives === 1 ? "vida" : "vidas"}`);
    }
  }

  // ---------- Loop ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop); // reagenda primeiro: um erro isolado não congela o jogo
    const dt = Math.min((now - last) / 1000, 0.05); last = now; // aba parada não gasta o tempo do recorde
    if (state === "playing") {
      update(dt);
      if (state === "playing" && (autosaveT += dt) >= AUTOSAVE_EVERY) { autosaveT = 0; saveNow(); }
    }
    draw();
    updateHud();
  }

  // ---------- Entrada: teclado ----------
  const CODE_KEYS = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d" }; // posição física: vale em qualquer layout
  const keyName = (e) => CODE_KEYS[e.code] || (e.key.length === 1 ? e.key.toLowerCase() : e.key);

  function onEscape() {
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
    else if (state === "won" || state === "lost") goMenu();
    else if (document.body.dataset.screen && document.body.dataset.screen !== "menu") goMenu();
  }

  function moveFocus(dir) {
    const scope = document.querySelector(".screen:not(.hidden)");
    if (!scope) return;
    const els = [...scope.querySelectorAll("button, input")].filter((e) => !e.disabled && e.offsetParent !== null);
    if (!els.length) return;
    const i = els.indexOf(document.activeElement);
    els[(i + dir + els.length) % els.length].focus();
  }

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // não atrapalha atalhos do navegador
    const k = keyName(e);
    if (k === "Escape") { onEscape(); return; }
    if (state === "playing") {
      keys[k] = true;
      if (k === "p") { pauseGame(); return; }
      if (k.startsWith("Arrow") || k === " ") e.preventDefault(); // não rola a página
    } else if ((k === "ArrowDown" || k === "ArrowUp") && document.body.dataset.screen) {
      e.preventDefault(); moveFocus(k === "ArrowDown" ? 1 : -1); // navega pelos botões das telas
    }
  });
  window.addEventListener("keyup", (e) => { keys[keyName(e)] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; clearTouch(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  window.addEventListener("pagehide", () => saveNow()); // fechar/recarregar a página também salva

  // ---------- Entrada: toque (celular/tablet) ----------
  const pad = $("pad"), knob = $("pad-knob");
  let padPointer = null;
  function clearTouch() {
    padPointer = null;
    touch.left = touch.right = touch.up = touch.down = false;
    knob.style.transform = "";
  }
  function padMove(e) {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    const dead = 0.3;
    touch.left = dx < -dead; touch.right = dx > dead; touch.up = dy < -dead; touch.down = dy > dead;
    knob.style.transform = `translate(${dx * R * 0.5}px, ${dy * R * 0.5}px)`;
  }
  pad.addEventListener("pointerdown", (e) => {
    if (padPointer !== null) return;
    padPointer = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    padMove(e); e.preventDefault();
  });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId === padPointer) padMove(e); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, (e) => { if (e.pointerId === padPointer) clearTouch(); });
  pad.addEventListener("contextmenu", (e) => e.preventDefault());

  const touchCapable = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0 || /[?&]touch=1\b/.test(location.search);
  if (touchCapable) document.body.classList.add("touch");
  window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") document.body.classList.add("touch"); }, { passive: true });

  // ---------- Botões e formulário ----------
  const on = (id, fn) => $(id).addEventListener("click", fn);
  on("btn-start", requestNewGame);
  on("btn-continue", continueGame);
  on("btn-confirm-keep", continueGame);
  on("btn-confirm-new", () => { store.clearGame(store.player()); startGame(); });
  on("btn-confirm-back", goMenu);
  on("btn-save", () => { $("pause-msg").textContent = saveNow() ? "Jogo salvo!" : "Salvo só nesta página: o navegador não permite guardar."; });
  on("btn-howto", () => showScreen("howto"));
  on("btn-howto-back", goMenu);
  on("btn-scores", () => { renderScores(); showScreen("scores"); });
  on("btn-scores-back", goMenu);
  on("btn-name", () => openName(false));
  on("btn-name-back", goMenu);
  $("name-form").addEventListener("submit", (e) => { e.preventDefault(); saveName($("name-input").value); });
  on("btn-pause", pauseGame);
  on("btn-resume", resumeGame);
  on("btn-pause-menu", goMenu);
  on("btn-again", startGame);
  on("btn-win-scores", () => { renderScores(); showScreen("scores"); });
  on("btn-win-menu", goMenu);
  on("btn-retry", startGame);
  on("btn-lose-menu", goMenu);

  // gancho de depuração/testes
  window.__game = {
    get state() { return state; }, get player() { return player; }, get collected() { return collected; },
    get items() { return items; }, get vets() { return vets; }, get exit() { return exitRect; }, get score() { return score; },
    get lives() { return lives; }, get livesLost() { return livesLost; }, get maxLives() { return MAX_LIVES; }, get time() { return time; }, get invuln() { return invuln; }, get view() { return view; },
    set freezeVets(v) { freezeVets = !!v; }, set noCatch(v) { noCatch = !!v; }, setRand(fn) { rand = fn || Math.random; }, tick: update,
    start: startGame, save: saveNow, setLives(n) { lives = clamp(Math.round(n), 1, MAX_LIVES); },
  };

  reset();
  fitCanvas();
  if (typeof ResizeObserver === "function") new ResizeObserver(fitCanvas).observe(canvas);
  else window.addEventListener("resize", fitCanvas);
  goMenu();
  requestAnimationFrame(loop);
})();
