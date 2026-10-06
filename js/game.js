(() => {
  const TILE = 32;
  const TOTAL_ITEMS = 5;
  const SPEED = 180; // cachorro, pixels por segundo

  // Configuração dos veterinários da Fase 1: apenas um, lento e pouco insistente.
  const LEVEL = {
    vets: [{
      speed: 48,        // velocidade ao patrulhar
      chaseSpeed: 64,   // velocidade ao perseguir (bem menor que a do cachorro)
      sight: 112,       // distância máxima para notar o cachorro (px)
      chaseChance: 0.25,// chance de decidir perseguir a cada "olhada"
      thinkEvery: 0.6,  // intervalo entre "olhadas" (s)
      chaseTime: 1.8,   // duração máxima de uma perseguição (s)
      restTime: 5,      // descanso depois de perseguir (s)
      idleMin: 0.6, idleMax: 1.6, // pausa ao chegar no destino da patrulha (s)
    }],
  };

  // # parede | X caixa | I ração | E saída | P início do cachorro | V início do veterinário
  const MAP = [
    "#########################",
    "#P......#.........#.....#",
    "#.......#....X....#..I..#",
    "#..XX...#....X....#.....#",
    "#..XX.........X.........#",
    "#.......#.....X....##.###",
    "#####.###..........#....#",
    "#.....#....#####...#....#",
    "#.I...#....#...#........#",
    "#.....#....#.I.#...XX...#",
    "#.....X.........#..XX...#",
    "#.....#....#....#.......#",
    "###.###....######.#######",
    "#.V.....#.............I.#",
    "#..XXX..#....I..........#",
    "#.......#...XX.......EEE#",
    "#...............XX...EEE#",
    "#########################",
  ];
  const COLS = MAP[0].length, ROWS = MAP.length;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menuEl = document.getElementById("menu");
  const winEl = document.getElementById("win");
  const loseEl = document.getElementById("lose");
  const winText = document.getElementById("win-text");
  const loseText = document.getElementById("lose-text");

  const keys = {};
  let state = "menu";
  let solids, items, vets, exitRect, player, walk, collected, score, time, hint, hintTimer;
  let rand = Math.random;
  let freezeVets = false; // usado apenas em testes

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const tileOf = (cx, cy) => [Math.floor(cx / TILE), Math.floor(cy / TILE)];
  const centerOf = (c, r) => [c * TILE + TILE / 2, r * TILE + TILE / 2];

  function reset() {
    solids = []; items = []; vets = []; collected = 0; score = 0; time = 0; hint = ""; hintTimer = 0;
    walk = MAP.map((row) => [...row].map((ch) => ch !== "#" && ch !== "X"));
    let ex1 = COLS, ey1 = ROWS, ex2 = 0, ey2 = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c], x = c * TILE, y = r * TILE;
      if (ch === "#" || ch === "X") solids.push({ x, y, w: TILE, h: TILE, kind: ch });
      else if (ch === "I") items.push({ x: x + 8, y: y + 8, w: 16, h: 16, taken: false });
      else if (ch === "E") { ex1 = Math.min(ex1, c); ey1 = Math.min(ey1, r); ex2 = Math.max(ex2, c); ey2 = Math.max(ey2, r); }
      else if (ch === "P") player = { x: x + 4, y: y + 4, w: 24, h: 24, facing: "right", moving: false };
      else if (ch === "V") {
        const cfg = LEVEL.vets[vets.length] || LEVEL.vets[0];
        const [cx, cy] = centerOf(c, r);
        vets.push({ cfg, cx, cy, mode: "patrol", leg: null, route: [], idle: 1, think: cfg.thinkEvery, modeT: 0, cool: 2, dir: 1 });
      }
    }
    exitRect = { x: ex1 * TILE, y: ey1 * TILE, w: (ex2 - ex1 + 1) * TILE, h: (ey2 - ey1 + 1) * TILE };
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
      if (canSee(v) && rand() < cfg.chaseChance) { v.mode = "chase"; v.modeT = cfg.chaseTime; }
    }
    if (v.mode === "chase" && v.modeT <= 0) { v.mode = "patrol"; v.cool = cfg.restTime; v.route = []; v.idle = 0.5; }

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

  // ---------- Atualização ----------
  function update(dt) {
    time += dt;
    if (hintTimer > 0) hintTimer -= dt;
    let ix = 0, iy = 0;
    if (keys.ArrowLeft || keys.a) ix -= 1;
    if (keys.ArrowRight || keys.d) ix += 1;
    if (keys.ArrowUp || keys.w) iy -= 1;
    if (keys.ArrowDown || keys.s) iy += 1;
    player.moving = !!(ix || iy);
    if (ix) player.facing = ix > 0 ? "right" : "left";
    else if (iy) player.facing = iy > 0 ? "down" : "up";
    if (ix && iy) { ix *= Math.SQRT1_2; iy *= Math.SQRT1_2; }
    const step = Math.min(dt, 0.05) * SPEED;
    moveAxis(ix * step, 0);
    moveAxis(0, iy * step);

    for (const it of items) {
      if (!it.taken && overlap(player, it)) { it.taken = true; collected++; score += 100; }
    }

    if (!freezeVets) for (const v of vets) updateVet(v, Math.min(dt, 0.05));
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    if (vets.some((v) => Math.hypot(v.cx - px, v.cy - py) < 22)) { lose(); return; }

    if (overlap(player, exitRect)) {
      if (collected >= TOTAL_ITEMS) win();
      else if (hintTimer <= 0) { hint = "Colete todas as rações antes de sair!"; hintTimer = 1.5; }
    }
  }

  function win() {
    state = "won";
    const bonus = Math.max(0, Math.round(300 - time * 5));
    score += bonus;
    winText.textContent = `Pontuação: ${score} (bônus de tempo: ${bonus}) — Tempo: ${time.toFixed(1)}s`;
    winEl.classList.remove("hidden");
    winEl.querySelector("button").focus();
  }

  function lose() {
    state = "lost";
    loseText.textContent = `Rações coletadas: ${collected}/${TOTAL_ITEMS} — Pontuação: ${score}`;
    loseEl.classList.remove("hidden");
    loseEl.querySelector("button").focus();
  }

  function start() {
    reset();
    for (const k in keys) keys[k] = false;
    menuEl.classList.add("hidden");
    winEl.classList.add("hidden");
    loseEl.classList.add("hidden");
    state = "playing";
  }

  // ---------- Desenho ----------
  function ellipse(x, y, rx, ry, color, rot = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  }

  function drawKibble(it) { // tigela de ração
    const cx = it.x + 8, cy = it.y + 8 + Math.sin(time * 4 + it.x) * 2;
    ellipse(cx, cy + 5, 10, 4, "rgba(0,0,0,.25)");
    for (const [dx, dy] of [[-5, 0], [0, -2], [5, 0], [-2, 1], [3, 1], [0, 2]]) ellipse(cx + dx, cy + dy, 3.2, 2.6, "#8b5a2b");
    ellipse(cx - 1, cy - 3, 2.6, 2.2, "#a8703a");
    ctx.fillStyle = "#e5533d"; ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx + 10, cy + 1); ctx.lineTo(cx + 7, cy + 8); ctx.lineTo(cx - 7, cy + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(cx - 8, cy + 3, 16, 1.5);
  }

  function drawDog(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const wag = Math.sin(time * 16) * (p.moving ? 5 : 2);
    const leg = p.moving ? Math.sin(time * 18) * 3 : 0;
    const TAN = "#d9a066", DARK = "#7a4a22", LIGHT = "#f1d2a6";
    ellipse(cx, cy + 10, 12, 4, "rgba(0,0,0,.25)");
    if (p.facing === "left" || p.facing === "right") {
      const s = p.facing === "right" ? 1 : -1;
      ctx.strokeStyle = DARK; ctx.lineWidth = 3; ctx.lineCap = "round"; // rabo
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
      ctx.strokeStyle = DARK; ctx.lineWidth = 3; ctx.lineCap = "round";
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
    const x = v.cx, y = v.cy + Math.sin(time * 6 + v.cx) * (v.leg ? 1 : 0);
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
      ctx.fillStyle = "#ff4d4d"; ctx.font = "bold 20px system-ui"; ctx.textAlign = "center";
      ctx.fillText("!", x, y - 22);
    }
  }

  function draw() {
    ctx.fillStyle = "#1d2330"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#232a3a" : "#262e40";
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
    if (!solids) return;
    const open = collected >= TOTAL_ITEMS;
    ctx.fillStyle = open ? "#3ddc84" : "#7a4b4b";
    ctx.fillRect(exitRect.x, exitRect.y, exitRect.w, exitRect.h);
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
    ctx.fillText("SAÍDA", exitRect.x + exitRect.w / 2, exitRect.y + exitRect.h / 2 + 5);
    for (const s of solids) {
      if (s.kind === "#") {
        ctx.fillStyle = "#4a5470"; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#5d6a8c"; ctx.fillRect(s.x, s.y, s.w, 4);
      } else {
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
        ctx.strokeStyle = "#5e3b17"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      }
    }
    for (const it of items) if (!it.taken) drawKibble(it);
    for (const v of vets) drawVet(v);
    drawDog(player);
    // HUD
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(TILE, 2, 300, 28);
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "left";
    ctx.fillText(`RAÇÕES: ${collected}/${TOTAL_ITEMS}   PONTOS: ${score}`, TILE + 8, 22);
    if (hintTimer > 0) {
      ctx.textAlign = "center"; ctx.fillStyle = "#ffd54a"; ctx.font = "bold 20px system-ui";
      ctx.fillText(hint, canvas.width / 2, canvas.height - 45);
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;
    if (state === "playing") update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  const normKey = (k) => (k.length === 1 ? k.toLowerCase() : k);
  window.addEventListener("keydown", (e) => {
    const k = normKey(e.key);
    keys[k] = true;
    if (k.startsWith("Arrow") || k === " ") e.preventDefault();
  });
  window.addEventListener("keyup", (e) => { keys[normKey(e.key)] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });
  document.getElementById("btn-play").addEventListener("click", start);
  document.getElementById("btn-again").addEventListener("click", start);
  document.getElementById("btn-retry").addEventListener("click", start);

  // gancho de depuração/testes
  window.__game = {
    get state() { return state; }, get player() { return player; }, get collected() { return collected; },
    get items() { return items; }, get vets() { return vets; }, get exit() { return exitRect; }, get score() { return score; },
    set freezeVets(v) { freezeVets = !!v; }, setRand(fn) { rand = fn || Math.random; }, tick: update,
  };

  reset();
  requestAnimationFrame(loop);
})();
