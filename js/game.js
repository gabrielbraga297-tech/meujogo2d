(() => {
  const TILE = 32;
  const TOTAL_ITEMS = 5;
  const SPEED = 180; // pixels por segundo

  // # parede | X caixa | I item | E saída | P início do jogador
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
    "#.......#.............I.#",
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
  const winText = document.getElementById("win-text");

  const keys = {};
  let state = "menu";
  let solids, items, exitRect, player, collected, score, time, hint, hintTimer;

  function reset() {
    solids = []; items = []; collected = 0; score = 0; time = 0; hint = ""; hintTimer = 0;
    let ex1 = COLS, ey1 = ROWS, ex2 = 0, ey2 = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c], x = c * TILE, y = r * TILE;
      if (ch === "#" || ch === "X") solids.push({ x, y, w: TILE, h: TILE, kind: ch });
      else if (ch === "I") items.push({ x: x + 8, y: y + 8, w: 16, h: 16, taken: false });
      else if (ch === "E") { ex1 = Math.min(ex1, c); ey1 = Math.min(ey1, r); ex2 = Math.max(ex2, c); ey2 = Math.max(ey2, r); }
      else if (ch === "P") player = { x: x + 4, y: y + 4, w: 24, h: 24 };
    }
    exitRect = { x: ex1 * TILE, y: ey1 * TILE, w: (ex2 - ex1 + 1) * TILE, h: (ey2 - ey1 + 1) * TILE };
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

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

  function update(dt) {
    time += dt;
    if (hintTimer > 0) hintTimer -= dt;
    let ix = 0, iy = 0;
    if (keys.ArrowLeft || keys.a) ix -= 1;
    if (keys.ArrowRight || keys.d) ix += 1;
    if (keys.ArrowUp || keys.w) iy -= 1;
    if (keys.ArrowDown || keys.s) iy += 1;
    if (ix && iy) { ix *= Math.SQRT1_2; iy *= Math.SQRT1_2; }
    const step = Math.min(dt, 0.05) * SPEED;
    moveAxis(ix * step, 0);
    moveAxis(0, iy * step);

    for (const it of items) {
      if (!it.taken && overlap(player, it)) { it.taken = true; collected++; score += 100; }
    }
    if (overlap(player, exitRect)) {
      if (collected >= TOTAL_ITEMS) win();
      else if (hintTimer <= 0) { hint = "Colete todos os itens antes de sair!"; hintTimer = 1.5; }
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

  function start() {
    reset();
    for (const k in keys) keys[k] = false;
    menuEl.classList.add("hidden");
    winEl.classList.add("hidden");
    state = "playing";
  }

  function draw() {
    ctx.fillStyle = "#1d2330"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // chão quadriculado
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? "#232a3a" : "#262e40";
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
    if (!solids) return;
    // saída
    const open = collected >= TOTAL_ITEMS;
    ctx.fillStyle = open ? "#3ddc84" : "#7a4b4b";
    ctx.fillRect(exitRect.x, exitRect.y, exitRect.w, exitRect.h);
    ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
    ctx.fillText("SAÍDA", exitRect.x + exitRect.w / 2, exitRect.y + exitRect.h / 2 + 5);
    // paredes e caixas
    for (const s of solids) {
      if (s.kind === "#") {
        ctx.fillStyle = "#4a5470"; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#5d6a8c"; ctx.fillRect(s.x, s.y, s.w, 4);
      } else {
        ctx.fillStyle = "#8a5a2b"; ctx.fillRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
        ctx.strokeStyle = "#5e3b17"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      }
    }
    // itens
    for (const it of items) {
      if (it.taken) continue;
      const cx = it.x + 8, cy = it.y + 8 + Math.sin(time * 4 + it.x) * 2;
      ctx.fillStyle = "#ffd54a"; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#b8860b"; ctx.lineWidth = 2; ctx.stroke();
    }
    // jogador
    ctx.fillStyle = "#4aa8ff"; ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.strokeStyle = "#1c5fa0"; ctx.lineWidth = 2; ctx.strokeRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x + 5, player.y + 7, 5, 5); ctx.fillRect(player.x + 14, player.y + 7, 5, 5);
    // HUD
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(TILE + 4, TILE + 4, 260, 30);
    ctx.fillStyle = "#fff"; ctx.font = "bold 18px system-ui"; ctx.textAlign = "left";
    ctx.fillText(`ITENS: ${collected}/${TOTAL_ITEMS}   PONTOS: ${score}`, TILE + 12, TILE + 25);
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

  // gancho de depuração/testes
  window.__game = { get state() { return state; }, get player() { return player; }, get collected() { return collected; },
    get items() { return items; }, get exit() { return exitRect; }, get score() { return score; }, tick: update };

  reset();
  requestAnimationFrame(loop);
})();
