// O ROBÔ do Passarinho (0.20.0): joga uma fase de verdade, quadro a quadro, pelo teclado do jogo (as teclas são eventos de verdade), e devolve o que aconteceu.
// É uma FUNÇÃO DE PÁGINA (roda dentro do navegador, sem usar nada de fora dela): tests/e2e-bird-integracao.js a passa para `page.evaluate`. Não é um módulo do jogo.
// Como ele joga (o que um jogador esperto faz, sem ver nada que o jogador não veja):
//  - planeja por Dijkstra no mapa, com um custo extra perto dos gatos e dos gaviões (quem está em perseguição pesa mais; quem patrulha com o passarinho à vista também) e vai ao item mais barato;
//  - no voo alto (fruto comum) o mapa passa a incluir os muros M (só enquanto o fôlego do voo dá para chegar do outro lado); sem voo, M e # são paredes;
//  - perseguido por perto, corre para o galho G mais próximo (se chega antes do inimigo), espera lá em cima até a ameaça passar, e bate as asas (Shift) quando o inimigo está perto;
//  - sem `collectAll` ele para de pegar itens quando a saída abre (pontos mínimos e missão) e vai ao ninho; com `collectAll` pega TUDO (sementes e frutos) antes.
// Parâmetros (o): { id, live (inimigos soltos; false = congelados), seed, attempts (tentativas com vidas novas, a cada uma custa pontos como no jogo), collectAll, cap (quadros por tentativa),
//   saveEvery (a cada N quadros salva o jogo e confere que o jogo salvo é aceito de volta por `parseSave` e cabe nos 20000 bytes) }.
// Devolve { id, state, attempts, frames, time, lives, livesLost, hits: [{ t, by, tile }], collected, bones, worms, score, minPoints, exitOpenAt, stats, saves: { n, bad, maxSize, firstBad } }.
module.exports = function ROBOT(o) {
  const g = window.__game, { id } = o, live = o.live !== false, attempts = o.attempts || 3, cap = o.cap || 40000, collectAll = !!o.collectAll;
  const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }));
  const held = {};
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; press(k, on); } };
  const releaseAll = () => { for (const k of Object.keys(held)) hold(k, false); };
  const mul = (s) => { let seed = s | 0; return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const lv = g.builtOf("bird")[id], cols = lv.cols, rows = lv.rows, N = cols * rows, kinds = lv.kinds;
  const idx = (c, r) => r * cols + c;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const tileOf = (x, y) => [Math.floor(x / 32), Math.floor(y / 32)];
  const mid = (p) => [p.x + p.w / 2, p.y + p.h / 2];
  const kind = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? "#" : kinds[r][c]);
  const exitSet = new Set(lv.exitTiles.map(([c, r]) => idx(c, r)));
  const isG = (c, r) => kind(c, r) === "G";
  const windAt = (c, r) => !!(lv.wind && lv.wind[r] && lv.wind[r][c]);
  const mission = lv.mission;

  // ---------- fila de prioridade (heap binário) ----------
  const heap = { a: [], push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }, pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } };

  // ---------- perigo: custo extra em cada tile ----------
  const sees = (f, hawk, px, py) => { // o inimigo `f` enxerga o ponto (px, py)? (a mesma conta do jogo: chão do próprio inimigo entre os dois)
    const walkG = hawk ? lv.hawkWalk : lv.walk, dx = px - f.cx, dy = py - f.cy, dist = Math.hypot(dx, dy), [pc, pr] = tileOf(px, py);
    for (let d = 0; d < dist; d += 8) { const [c, r] = tileOf(f.cx + (dx * d) / dist, f.cy + (dy * d) / dist); if (c === pc && r === pr) continue; if (!walkG[r] || !walkG[r][c]) return false; }
    return true;
  };
  function dangerGrid(flying, perched) {
    const D = new Float32Array(N), foes = [];
    for (const v of g.vets) if (!flying && !perched) foes.push({ f: v, hawk: false });
    for (const c of g.cats) if (!perched) foes.push({ f: c, hawk: true });
    for (const { f, hawk } of foes) {
      const chase = f.mode === "chase", flee = f.mode === "flee", alert = Math.min(hawk ? lv.catCfg.sight / 32 : lv.alertTiles, 12);
      const R = chase ? 9 : alert, [fc, fr] = tileOf(f.cx, f.cy);
      for (let r = Math.max(0, fr - R); r <= Math.min(rows - 1, fr + R); r++) for (let c = Math.max(0, fc - R); c <= Math.min(cols - 1, fc + R); c++) {
        const d = Math.hypot(c - fc, r - fr); if (d > R) continue;
        const k = kind(c, r); if (k === "#" || k === "M") continue;
        if (chase) D[idx(c, r)] += 22 * (1 - d / R) + 2;
        else if (!flee && (d <= 2.2 || sees(f, hawk, c * 32 + 16, r * 32 + 16))) D[idx(c, r)] += (hawk ? 7 : 5) * (1 - d / (R + 1)) + (d <= 2.2 ? 4 : 0);
      }
    }
    return D;
  }
  function statueGrid() { // inimigos congelados (testes): ninguém persegue, mas encostar neles ainda custa uma vida; o gavião sobre um X também
    const D = new Float32Array(N);
    for (const f of [...g.vets, ...g.cats]) { const [fc, fr] = tileOf(f.cx, f.cy); for (let r = Math.max(0, fr - 2); r <= Math.min(rows - 1, fr + 2); r++) for (let c = Math.max(0, fc - 2); c <= Math.min(cols - 1, fc + 2); c++) { const d = Math.hypot(c - fc, r - fr); if (d <= 2) D[idx(c, r)] += 40 - 12 * d; } }
    return D;
  }
  // ---------- planejamento ----------
  function plan(src, flyBudget, D, blocked, noExit) { // Dijkstra de `src` (índice) por todo o mapa; flyBudget > 0: o voo alto está ligado e os muros M valem até essa distância (em passos)
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), steps = new Float64Array(N);
    dist[src] = 0; heap.a.length = 0; heap.push(0, src);
    while (heap.a.length) {
      const [d, u] = heap.pop(); if (d > dist[u]) continue;
      const c = u % cols, r = (u / cols) | 0;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const k = kinds[nr][nc]; if (k === "#") continue;
        if (k === "M" && !(flyBudget > 0 && steps[u] + 1 < flyBudget)) continue;
        const v = idx(nc, nr); let w = 1 + D[v] + (windAt(nc, nr) ? 0.6 : 0) + (blocked && blocked.has(v) ? 30 : 0);
        if (k === "M") w += 0.3;
        if (noExit && exitSet.has(v)) w += 600; // pegando tudo: não passa por cima do ninho aberto antes da hora (tocar nele termina a fase)
        if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; steps[v] = steps[u] + 1; heap.push(dist[v], v); }
      }
    }
    return { dist, prev };
  }
  const pathTo = (pl, dst) => { const out = []; for (let k = dst; pl.prev[k] >= 0; k = pl.prev[k]) out.unshift(k); return out; };

  const stats = { flyFrames: 0, flyOnM: 0, perchFrames: 0, windFrames: 0, chaseFrames: 0, sprintFrames: 0, refugeRuns: 0, stuck: 0, fruitsTaken: {}, mTilesCrossed: 0 };
  const hits = [], saves = { n: 0, bad: 0, none: 0, maxSize: 0, firstBad: null };
  const res = { id, state: "?", attempts: 0, frames: 0, time: 0, lives: 0, livesLost: 0, hits, collected: 0, bones: 0, worms: 0, score: 0, minPoints: lv.minPoints, exitOpenAt: null, items: 0, bonesTotal: lv.bones, seedsTotal: lv.rations, stats, mission: mission ? { bones: !!mission.bones, rations: mission.rations || 0 } : null, lastTile: null, saves };
  const exitOpen = () => (lv.minPoints ? g.score >= lv.minPoints : g.collected >= lv.rations && g.bonesGot >= lv.bones) && (!mission || ((!mission.bones || g.bonesGot >= lv.bones) && g.collected >= (mission.rations || 0)));

  for (let attempt = 0; attempt < attempts; attempt++) {
    g.setAnimal("bird"); g.setRand(mul((o.seed || 1) * 1000 + attempt * 77 + id)); g.freezeVets = !live; g.noCatch = false;
    g.start(id, { retries: attempt }); g.autoStart = true;
    res.attempts = attempt + 1;
    let prevInfo = null, frames = 0, target = null, path = [], refuge = null, perchWait = 0, lastPos = null, stillN = 0, lastLost = g.livesLost, prevM = false, plans = 0;
    const blocked = new Map(); // tile -> quadro em que o bloqueio some
    while (g.state === "playing" && frames < (o.cap || cap)) {
      const p = g.player, [px, py] = mid(p), [pc, pr] = tileOf(px, py), me = idx(pc, pr);
      const flying = g.flying, perched = g.perch, safeNow = g.safe;
      // ---- estatísticas ----
      if (flying) { stats.flyFrames++; if (kind(pc, pr) === "M") { stats.flyOnM++; if (!prevM) stats.mTilesCrossed++; } }
      prevM = flying && kind(pc, pr) === "M";
      if (perched) stats.perchFrames++;
      if (g.windNow !== 0) stats.windFrames++;
      if (g.sprinting) stats.sprintFrames++;
      const chasers = [...g.vets, ...g.cats].filter((f) => f.mode === "chase");
      if (chasers.length) stats.chaseFrames++;
      if (g.livesLost > lastLost) { // perdeu vida: o que havia no quadro ANTERIOR (agora o passarinho já voltou ao início)?
        const q = prevInfo || { px, py, pc, pr, flying, perched, refuge: false, sprint: false, sta: 1, winded: 0, chasing: 0, near: [] };
        const nearest = q.near[0];
        hits.push({ attempt, t: +g.time.toFixed(1), by: nearest ? nearest.k : "?", d: nearest ? Math.round(nearest.d * 32) : -1, tile: [q.pc, q.pr], flying: q.flying, perched: q.perched, refuge: q.refuge, sprint: q.sprint, sta: q.sta, winded: q.winded, chasing: q.chasing, near: q.near.slice(0, 3) });
        lastLost = g.livesLost; target = null; path = []; refuge = null; perchWait = 0;
      }
      if (res.exitOpenAt === null && exitOpen()) res.exitOpenAt = +g.time.toFixed(1);
      if (o.saveEvery && frames > 0 && frames % o.saveEvery === 0) { // jogo salvo de verdade no meio da partida: o salvo tem de ser aceito de volta
        g.save(); saves.n++;
        const st = Records.createStore(localStorage), sv = st.game("bird").loadGame(st.player());
        if (!sv || !sv.snap) saves.none++;
        else { const snap = JSON.parse(JSON.stringify(sv.snap)); saves.maxSize = Math.max(saves.maxSize, JSON.stringify(snap).length); if (!g.parseSave(snap, "bird")) { saves.bad++; if (!saves.firstBad) saves.firstBad = { attempt, frames, flying, perched, tile: [pc, pr], snap: JSON.stringify(sv.snap).slice(0, 400) }; } }
      }
      // ---- decisão (a cada 5 quadros; no galho, a cada quadro) ----
      if (frames % 5 === 0 || !path.length) {
        plans++;
        for (const [k, until] of blocked) if (until < frames) blocked.delete(k);
        const D = live ? dangerGrid(flying, perched || safeNow && !flying) : statueGrid(); // (inimigos parados continuam pegando quem encosta neles: o robô dá a volta)
        const flyBudget = flying ? Math.max(0, (g.power - 1.4) * g.dogSpeed / 32) : 0;
        const pl = plan(me, flyBudget, D, blocked, collectAll && g.items.some((i) => !i.taken));
        // perseguição por perto: busca refúgio (galho) se chega antes do inimigo
        const near = chasers.filter((f) => Math.hypot(f.cx - px, f.cy - py) < 9 * 32 && (f.hawk || !flying));
        if (near.length && !perched && !refuge && !(flying && !near.some((f) => f.hawk))) {
          let best = null;
          for (let r = Math.max(0, pr - 9); r <= Math.min(rows - 1, pr + 9); r++) for (let c = Math.max(0, pc - 9); c <= Math.min(cols - 1, pc + 9); c++) {
            if (!isG(c, r)) continue; const k = idx(c, r), mine = pl.dist[k]; if (!isFinite(mine) || mine > 14) continue;
            const foeD = Math.min(...near.map((f) => Math.hypot(f.cx - c * 32 - 16, f.cy - r * 32 - 16) / 32));
            if (foeD * 1.0 > mine * 0.75 && (!best || mine < best.mine)) best = { k, mine };
          }
          if (best) { refuge = { k: best.k, since: frames }; stats.refugeRuns++; }
        }
        if (refuge) {
          if (!isFinite(pl.dist[refuge.k]) || frames - refuge.since > 360) refuge = null;
          else { target = refuge.k; path = pathTo(pl, target); }
        }
        if (!refuge) {
          // escolhe o alvo
          const open = exitOpen(), left = g.items.filter((i) => !i.taken);
          let best = null;
          if (open && !collectAll) { for (const k of exitSet) if (isFinite(pl.dist[k]) && (!best || pl.dist[k] < best.cost)) best = { k, cost: pl.dist[k] }; }
          else if (left.length) {
            const needBones = mission && mission.bones && g.bonesGot < lv.bones;
            for (const it of left) {
              const k = idx(Math.floor((it.x + 8) / 32), Math.floor((it.y + 8) / 32)); if (!isFinite(pl.dist[k])) continue;
              let cost = pl.dist[k] - (it.bone ? (needBones ? 6 : 2) : 0);
              if (target === k) cost -= 3; // não muda de ideia à toa
              if (!best || cost < best.cost) best = { k, cost };
            }
          } else for (const k of exitSet) if (isFinite(pl.dist[k]) && (!best || pl.dist[k] < best.cost)) best = { k, cost: pl.dist[k] };
          if (best) { target = best.k; path = pathTo(pl, target); } else { path = []; }
        }
      }
      // ---- controle ----
      let ix = 0, iy = 0, sprint = false;
      const waiting = perched && chasers.some((f) => Math.hypot(f.cx - px, f.cy - py) < 8 * 32);
      if (perched) {
        const threat = [...g.vets, ...g.cats].some((f) => f.mode !== "flee" && Math.hypot(f.cx - px, f.cy - py) < 6 * 32);
        perchWait = threat ? perchWait + 1 : 0;
        const closeFoe = [...g.vets, ...g.cats].some((f) => f.mode !== "flee" && Math.hypot(f.cx - px, f.cy - py) < 3.5 * 32); // não desce com um inimigo colado no galho
        if (waiting || (threat && perchWait < 600) || (closeFoe && perchWait < 1800)) { path.length = 0; releaseAll(); g.tick(1 / 60); frames++; continue; }
        if (refuge && idx(pc, pr) === refuge.k) refuge = null;
      } else perchWait = 0;
      if (path.length) {
        let [wc, wr] = [path[0] % cols, (path[0] / cols) | 0], tx = wc * 32 + 16, ty = wr * 32 + 16;
        if (Math.abs(tx - px) <= 4 && Math.abs(ty - py) <= 4) { path.shift(); if (path.length) { wc = path[0] % cols; wr = (path[0] / cols) | 0; tx = wc * 32 + 16; ty = wr * 32 + 16; } }
        const dx = tx - px, dy = ty - py;
        ix = dx > 3 ? 1 : dx < -3 ? -1 : 0; iy = dy > 3 ? 1 : dy < -3 ? -1 : 0;
        // com folga lateral grande, primeiro alinha o eixo curto (evita raspar na quina)
        if (ix && iy && Math.abs(dx) > 40 && Math.abs(dy) < 12) iy = 0;
        if (ix && iy && Math.abs(dy) > 40 && Math.abs(dx) < 12) ix = 0;
      }
      const hot = chasers.some((f) => Math.hypot(f.cx - px, f.cy - py) < 5.5 * 32 && (f.hawk || !flying));
      sprint = (ix || iy) && hot && g.stamina > 0.12 && g.winded <= 0;
      hold("d", ix > 0); hold("a", ix < 0); hold("s", iy > 0); hold("w", iy < 0); hold("Shift", sprint);
      // ---- preso? ----
      if (frames % 45 === 0) {
        if (lastPos && Math.hypot(px - lastPos[0], py - lastPos[1]) < 5 && (ix || iy) && !perched) { stillN++; stats.stuck++; if (path.length) blocked.set(path[0], frames + 120); path = []; if (stillN > 6) { const rnd = mul(frames + 3)(); hold("d", rnd < 0.25); hold("a", rnd >= 0.25 && rnd < 0.5); hold("s", rnd >= 0.5 && rnd < 0.75); hold("w", rnd >= 0.75); } }
        else stillN = 0;
        lastPos = [px, py];
      }
      prevInfo = { px, py, pc, pr, flying, perched, refuge: !!refuge, sprint: g.sprinting, sta: +g.stamina.toFixed(2), winded: +g.winded.toFixed(1), chasing: chasers.length, near: [...g.vets.map((f) => ["gato", f]), ...g.cats.map((f) => ["gavião", f])].map(([k, f]) => ({ k, m: f.mode, d: Math.round(Math.hypot(f.cx - px, f.cy - py) / 32 * 10) / 10 })).filter((x) => x.d < 6).sort((a, b) => a.d - b.d) };
      g.tick(1 / 60); frames++;
    }
    releaseAll();
    res.frames += frames; res.state = g.state; res.time = g.time; res.lives = g.lives; res.livesLost = g.livesLost; res.collected = g.collected; res.bones = g.bonesGot; res.worms = g.balls.filter((b) => b.taken).length; res.score = g.score; res.items = g.items.length;
    res.lastTile = tileOf(...mid(g.player));
    if (g.state === "won" || frames >= cap) break;
  }
  releaseAll();
  return res;
};
