// SONDA DE DIFICULDADE (0.22.0): um jogador-robô ingênuo e IGUAL em todas as fases, para comparar a dificuldade de uma fase com a de outra no mesmo bichinho.
// É uma FUNÇÃO DE PÁGINA (roda dentro do navegador, só com o que há nela): tools/difficulty/run.js a passa para `page.evaluate`. Não faz parte do jogo.
// Como joga: com os inimigos SOLTOS e podendo pegar o jogador, vai sempre ao item mais perto pelo caminho mais curto do mapa (sem olhar para os inimigos, sem poderes, sem fugir)
// e, quando acabam os itens, à saída; anda pelas teclas do jogo, quadro a quadro (1/60 s). Quando é pego, o jogo faz o que faz (perde vida e pontos, volta ao jogo) e o robô segue.
// Ele NÃO é um bom jogador (um jogador de verdade foge, usa ossos, galhos, voo...); serve como régua: a mesma régua em todas as fases. Mede o quanto cada fase "castiga" quem não presta atenção.
// Parâmetros (o): { animal: "dog"|"cat"|"bird", id: 1..20, seed, cap (segundos de jogo; padrão 900) }.
// Devolve { animal, id, seed, state, time, livesLost, retries, score, minPoints, itemsTaken, itemsTotal, firstHit (s do primeiro golpe, ou null), hits (quantos golpes), stuck (vezes que ficou parado) }.
module.exports = function PROBE(o) {
  const g = window.__game, id = o.id, animal = o.animal, cap = o.cap || 900;
  const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: "Key" + k.toUpperCase() }));
  const held = {};
  const hold = (k, on) => { if (!!held[k] !== on) { held[k] = on; press(k, on); } };
  const releaseAll = () => { for (const k of Object.keys(held)) hold(k, false); };
  const mul = (s) => { let a = s | 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  g.setAnimal(animal); g.freezeVets = false; g.noCatch = false; g.setRand(mul(o.seed || 1)); g.start(id);
  const lv = g.builtOf(animal)[id], C = lv.cols, R = lv.rows;
  const blocked = (c, r) => c < 0 || r < 0 || c >= C || r >= R || !!lv.bld[r][c];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const center = (p) => [p.x + 12, p.y + 12];
  const tileOf = (p) => { const [x, y] = center(p); return [Math.floor(x / 32), Math.floor(y / 32)]; };

  // caminho mais curto (largura) da casa de partida até a casa mais próxima que satisfaz `goal`
  function path(from, goal) {
    const key = (c, r) => r * C + c, prev = new Map([[key(from[0], from[1]), null]]), q = [from];
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i];
      if (goal(c, r)) { const out = []; for (let cur = [c, r]; cur && prev.get(key(cur[0], cur[1])); cur = prev.get(key(cur[0], cur[1]))) out.unshift(cur); return out; }
      for (const [dc, dr] of DIRS) { const nc = c + dc, nr = r + dr; if (!blocked(nc, nr) && !prev.has(key(nc, nr))) { prev.set(key(nc, nr), [c, r]); q.push([nc, nr]); } }
    }
    return null;
  }

  const exitSet = new Set(lv.exitTiles.map(([c, r]) => c + "," + r));
  const itemsTotal = g.items.length;
  let lastLives = g.lives, lastLost = g.livesLost, firstHit = null, hits = 0, stuck = 0, ticks = 0, still = 0, lastPos = null, plan = null, planAt = -1;
  const maxTicks = Math.round(cap * 60);

  while (g.state === "playing" && ticks < maxTicks) {
    // pega o que falta; sem itens, vai à saída
    const left = g.items.filter((it) => !it.taken);
    const here = tileOf(g.player);
    if (!plan || !plan.length || ticks - planAt > 30) {
      const want = new Set(left.map((it) => Math.floor((it.x + (it.w || 16) / 2) / 32) + "," + Math.floor((it.y + (it.h || 16) / 2) / 32)));
      plan = want.size ? path(here, (c, r) => want.has(c + "," + r)) : path(here, (c, r) => exitSet.has(c + "," + r));
      planAt = ticks;
      if (!plan) { releaseAll(); return { animal, id, seed: o.seed, error: "sem caminho", itemsTotal }; }
    }
    // anda até o centro da próxima casa do caminho
    while (plan.length && Math.abs(plan[0][0] * 32 + 16 - center(g.player)[0]) <= 4 && Math.abs(plan[0][1] * 32 + 16 - center(g.player)[1]) <= 4) plan.shift();
    if (plan.length) {
      const [tx, ty] = [plan[0][0] * 32 + 16, plan[0][1] * 32 + 16], [cx, cy] = center(g.player), dx = tx - cx, dy = ty - cy;
      hold("d", dx > 4); hold("a", dx < -4); hold("s", dy > 4); hold("w", dy < -4);
    } else releaseAll();
    g.tick(1 / 60); ticks++;
    // ficou parado (porta fechada, peça móvel...)? refaz o caminho
    const pos = center(g.player).map(Math.round).join(",");
    if (pos === lastPos) { if (++still > 90) { stuck++; still = 0; plan = null; } } else { still = 0; lastPos = pos; }
    if (g.livesLost > lastLost) { hits += g.livesLost - lastLost; lastLost = g.livesLost; if (firstHit === null) firstHit = Math.round(g.time * 10) / 10; plan = null; }
    lastLives = g.lives;
  }
  releaseAll();
  return {
    animal, id, seed: o.seed, state: g.state, time: Math.round(g.time * 10) / 10, livesLost: g.livesLost, retries: g.retries, score: g.score, minPoints: lv.minPoints,
    itemsTaken: itemsTotal - g.items.filter((it) => !it.taken).length, itemsTotal, firstHit, hits, stuck, ticks, lastLives,
  };
};
