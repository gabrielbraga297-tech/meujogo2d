// SONDA DE DIFICULDADE (0.22.0): um jogador-robô que desvia dos inimigos e é IGUAL em todas as fases do Cachorrinho e do Gatinho, para comparar a dificuldade de uma fase com a de outra.
// (Para o Passarinho a régua é o robô de tests/bird-robot-page.js, que conhece o voo, os galhos e o vento; tools/difficulty/run.js escolhe o certo.)
// É uma FUNÇÃO DE PÁGINA (roda dentro do navegador, só com o que há nela): tools/difficulty/run.js a passa para `page.evaluate`. Não faz parte do jogo.
// Como joga: com os inimigos SOLTOS e podendo pegar o jogador, planeja por Dijkstra o caminho de menor custo até o item mais perto (e, sem itens, até a saída); o custo de cada casa sobe perto dos inimigos
// (muito perto de quem está em perseguição, um pouco perto de quem enxerga a casa), então ele dá a volta; no Gatinho corre (Shift) quando um inimigo em perseguição está perto e há fôlego.
// Não usa lugares altos, poças nem reforços de propósito: é uma régua, não um bom jogador. A mesma régua em todas as fases mede o quanto cada uma castiga quem presta atenção só em parte.
// Parâmetros (o): { animal: "dog"|"cat", id: 1..20, seed, cap (segundos de jogo; padrão 600) }.
// Devolve { animal, id, seed, state, time, livesLost, score, minPoints, itemsTaken, itemsTotal, firstHit (s do primeiro golpe, ou null), hits (quantos golpes), stuck, frames }.
module.exports = function PROBE(o) {
  const g = window.__game, id = o.id, animal = o.animal, cap = o.cap || 600;
  const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }));
  const held = {};
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; press(k, on); } };
  const releaseAll = () => { for (const k of Object.keys(held)) hold(k, false); };
  const mul = (s) => { let a = s | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  g.setAnimal(animal); g.freezeVets = false; g.noCatch = false; g.setRand(mul((o.seed || 1) * 1000 + id)); Math.random = mul(((o.seed || 1) * 1000 + id) ^ 0x5bd1e995); g.start(id); g.autoStart = true;
  const lv = g.builtOf(animal)[id], cols = lv.cols, rows = lv.rows, N = cols * rows;
  const idx = (c, r) => r * cols + c;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const mid = (p) => [p.x + p.w / 2, p.y + p.h / 2];
  const tileOf = (x, y) => [Math.floor(x / 32), Math.floor(y / 32)];
  const solid = (c, r) => c < 0 || r < 0 || c >= cols || r >= rows || !!lv.bld[r][c];
  const exitSet = new Set(lv.exitTiles.map(([c, r]) => idx(c, r)));
  const sprintOk = () => animal === "cat" && typeof g.stamina === "number";

  // fila de prioridade (heap binário)
  const heap = { a: [], push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } },
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } };

  // perigo: custo extra em cada casa perto de um inimigo (mesma ideia do robô do Passarinho)
  const sees = (f, walkG, px, py) => {
    const dx = px - f.cx, dy = py - f.cy, dist = Math.hypot(dx, dy), [pc, pr] = tileOf(px, py);
    for (let d = 0; d < dist; d += 8) { const [c, r] = tileOf(f.cx + (dx * d) / dist, f.cy + (dy * d) / dist); if (c === pc && r === pr) continue; if (!walkG[r] || !walkG[r][c]) return false; }
    return true;
  };
  function dangerGrid() {
    const D = new Float32Array(N);
    const foes = [...g.vets.map((f) => ({ f, strong: false })), ...g.cats.map((f) => ({ f, strong: true }))];
    for (const { f, strong } of foes) {
      const walkG = strong ? lv.catWalk || lv.walk : lv.walk;
      const chase = f.mode === "chase", flee = f.mode === "flee", alert = Math.min(strong ? (lv.catCfg ? lv.catCfg.sight / 32 : 8) : lv.alertTiles, 12);
      const R = chase ? 9 : alert, [fc, fr] = tileOf(f.cx, f.cy);
      for (let r = Math.max(0, fr - R); r <= Math.min(rows - 1, fr + R); r++) for (let c = Math.max(0, fc - R); c <= Math.min(cols - 1, fc + R); c++) {
        const d = Math.hypot(c - fc, r - fr); if (d > R || solid(c, r)) continue;
        if (chase) D[idx(c, r)] += 22 * (1 - d / R) + 2;
        else if (!flee && (d <= 2.2 || sees(f, walkG, c * 32 + 16, r * 32 + 16))) D[idx(c, r)] += (strong ? 7 : 5) * (1 - d / (R + 1)) + (d <= 2.2 ? 4 : 0);
      }
    }
    return D;
  }
  function plan(src, D, blocked, noExit) {
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
    dist[src] = 0; heap.a.length = 0; heap.push(0, src);
    while (heap.a.length) {
      const [d, u] = heap.pop(); if (d > dist[u]) continue;
      const c = u % cols, r = (u / cols) | 0;
      for (const [dc, dr] of DIRS) {
        const nc = c + dc, nr = r + dr; if (solid(nc, nr)) continue;
        const v = idx(nc, nr); let w = 1 + D[v] + (blocked && blocked.has(v) ? 30 : 0);
        if (noExit && exitSet.has(v)) w += 600; // a saída aberta termina a fase: só depois de pegar tudo
        if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; heap.push(dist[v], v); }
      }
    }
    return { dist, prev };
  }
  const pathTo = (pl, dst) => { const out = []; for (let k = dst; pl.prev[k] >= 0; k = pl.prev[k]) out.unshift(k); return out; };

  const itemsTotal = g.items.length, maxFrames = Math.round(cap * 60);
  let frames = 0, target = null, path = [], lastLost = g.livesLost, hits = 0, firstHit = null, stuck = 0, lastPos = null, stillN = 0;
  const blocked = new Map();
  while (g.state === "playing" && frames < maxFrames) {
    const p = g.player, [px, py] = mid(p), [pc, pr] = tileOf(px, py), me = idx(pc, pr);
    if (g.livesLost > lastLost) { hits += g.livesLost - lastLost; lastLost = g.livesLost; if (firstHit === null) firstHit = Math.round(g.time * 10) / 10; target = null; path = []; }
    if (frames % 5 === 0 || !path.length) {
      for (const [k, until] of blocked) if (until < frames) blocked.delete(k);
      const left = g.items.filter((it) => !it.taken);
      const pl = plan(me, dangerGrid(), blocked, left.length > 0);
      let best = null;
      if (left.length) {
        for (const it of left) {
          const k = idx(Math.floor((it.x + (it.w || 16) / 2) / 32), Math.floor((it.y + (it.h || 16) / 2) / 32)); if (!isFinite(pl.dist[k])) continue;
          let cost = pl.dist[k]; if (target === k) cost -= 3; // não muda de ideia à toa
          if (!best || cost < best.cost) best = { k, cost };
        }
      } else for (const k of exitSet) if (isFinite(pl.dist[k]) && (!best || pl.dist[k] < best.cost)) best = { k, cost: pl.dist[k] };
      if (best) { target = best.k; path = pathTo(pl, target); } else { path = []; }
    }
    let ix = 0, iy = 0;
    if (path.length) {
      let [wc, wr] = [path[0] % cols, (path[0] / cols) | 0], tx = wc * 32 + 16, ty = wr * 32 + 16;
      if (Math.abs(tx - px) <= 4 && Math.abs(ty - py) <= 4) { path.shift(); if (path.length) { wc = path[0] % cols; wr = (path[0] / cols) | 0; tx = wc * 32 + 16; ty = wr * 32 + 16; } }
      const dx = tx - px, dy = ty - py;
      ix = dx > 3 ? 1 : dx < -3 ? -1 : 0; iy = dy > 3 ? 1 : dy < -3 ? -1 : 0;
      if (ix && iy && Math.abs(dx) > 40 && Math.abs(dy) < 12) iy = 0; // com folga lateral grande, primeiro alinha o eixo curto (evita raspar na quina)
      if (ix && iy && Math.abs(dy) > 40 && Math.abs(dx) < 12) ix = 0;
    }
    const hot = [...g.vets, ...g.cats].some((f) => f.mode === "chase" && Math.hypot(f.cx - px, f.cy - py) < 5.5 * 32);
    hold("d", ix > 0); hold("a", ix < 0); hold("s", iy > 0); hold("w", iy < 0);
    if (sprintOk()) hold("Shift", (ix || iy) && hot && g.stamina > 0.12 && g.winded <= 0);
    if (frames % 45 === 0) { // ficou parado (porta fechada, peça móvel, quina)? bloqueia a casa e refaz o caminho
      if (lastPos && Math.hypot(px - lastPos[0], py - lastPos[1]) < 5 && (ix || iy)) { stillN++; stuck++; if (path.length) blocked.set(path[0], frames + 120); path = []; if (stillN > 6) { const rnd = mul(frames + 7); hold("d", rnd() < 0.5); hold("a", rnd() < 0.5); hold("w", rnd() < 0.5); hold("s", rnd() < 0.5); } } else stillN = 0;
      lastPos = [px, py];
    }
    g.tick(1 / 60); frames++;
  }
  releaseAll();
  return {
    animal, id, seed: o.seed, state: g.state, time: Math.round(g.time * 10) / 10, livesLost: g.livesLost, score: g.score, minPoints: lv.minPoints,
    itemsTaken: itemsTotal - g.items.filter((it) => !it.taken).length, itemsTotal, firstHit, hits, stuck, frames,
  };
};
