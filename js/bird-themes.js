// Ambientes das 20 fases do Passarinho (0.20.0): cada fase é um lugar onde os passarinhos vivem e voam (jardim, pomar, horta, telhados, praça, parque, milharal, trigal, lago, mata,
// fazenda, rio, pântano, dunas, falésias, vila de pescadores, campos de altitude, entardecer, noite na floresta e o grande ninho). Este arquivo é o NÚCLEO (registro + auxiliares de desenho +
// geradores de muros e de vento); os ambientes ficam em js/bird-themes-1.js (Fases 1 a 10) e js/bird-themes-2.js (Fases 11 a 20), que chamam BirdThemes.register(id, tema).
// Nada aqui mexe nas regras do jogo: só desenho. Mesmo contrato de js/cat-themes.js (leia o cabeçalho dele), com três funções a mais (muro, galho, vento):
//
// Uso (js/game.js, fases do Passarinho): const th = BirdThemes.of(idDaFase); a cada tile visível: th.floor(g) em TODOS os tiles (menos sob "#", que cobre o tile inteiro), depois por cima
//   "#" th.wall(g)    parede SÓLIDA SEMPRE (borda do mundo, rochas, troncos, construções altas): bloco alto, escuro, que cobre o tile; as paredes vizinhas se juntam
//   "M" th.muro(g)    MURO voável (sebe, cerca alta, milho, caniço, varal...): mais baixo, com o chão aparecendo em volta e sombra; os muros vizinhos (M e #) se juntam numa fileira só. É "atravessável por cima" no voo alto
//   "X" th.crate(g)   obstáculo baixo (cerca baixa, pedra, arbusto, vaso...): o passarinho passa voando, os gatos não
//   "G" th.high(g)    galho/poleiro (copa de árvore, fio, mastro, espantalho...): o passarinho fica a salvo em cima. Brilho quente em volta e sombra comprida, para ser reconhecido de relance
//   ">" "<" "^" "v" th.wind(g)  corrente de vento: o chão do ambiente com fitas de ar que correm na direção da seta (g.kind(c, r) diz qual) e uma setinha fixa; paradas com g.time = 0 ("reduzir movimento")
//   "~" th.water(g)   (não existe nos mapas do Passarinho; existe por segurança) água rasa
// onde `g` é o mesmo objeto dos ambientes do Gatinho (js/cat-themes.js):
//   g.ctx, g.rect(x, y, w, h)  retângulo alinhado aos pixels do aparelho        g.x, g.y, g.c, g.r  canto de cima à esquerda do tile (px) e a coluna e a linha
//   g.h(k)                     número de 0 a 1 sempre igual para o mesmo tile e o mesmo k (sem piscar)       g.solid(c, r)  true se o tile é parede ou está fora do mapa
//   g.kind(c, r)               o caractere do mapa no tile ("#", ".", "M", "X", "G", ">", "<", "^", "v", "E", "P", "V", "H"; "#" fora do mapa)      g.border  true no anel de fora do mapa
//   g.mass(c, r)               (opcional, só no jogo) quantos tiles tem a mancha de paredes daquele tile      g.time  segundos de jogo (0 quando "reduzir movimento")
// Um tema é { id, place (nome do lugar), blurb (frase curta), night (true: fase noturna; Fases 18 e 19), dusk (true: o entardecer da Fase 18, a luz laranja que escurece), halo (cor do halo em volta do passarinho
//             nas fases noturnas), nest: { rim, twig, lining } (cores do ninho da saída, para BirdArt.drawNest), mover: { wall: [3 cores], door: [3 cores] }, rail: [2 cores] (blocos e trilhos que se movem),
//             floor(g), wall(g), muro(g), crate(g), high(g), wind(g) ou wind: { tint, rgb } (o registro monta a função: o chão + as fitas), water(g) (opcional) }.
// Orçamento (conferido em tests/bird-themes-1.test.js e tests/bird-themes-2.test.js): no máximo 40 operações de pintura (fillRect, fill, stroke, strokeRect) por tile e só os métodos simples do canvas
// (fillStyle, strokeStyle, lineWidth, fillRect, strokeRect, beginPath, moveTo, lineTo, closePath, arc, fill, stroke); o chão é o mais barato (média de poucas operações), pois vai em todos os tiles.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BirdThemes = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const T = 32, TAU = Math.PI * 2, PI = Math.PI;
  const REG = Object.create(null);

  // número de 0 a 1 sempre igual para o mesmo (coluna, linha, k): o mesmo gerador de js/themes.js (sem piscar)
  function hash(c, r, k) {
    let h = (Math.imul(c + 101, 374761393) + Math.imul(r + 211, 668265263) + Math.imul(k + 7, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // ---- auxiliares de desenho (os mesmos de js/cat-themes.js, para os ambientes terem o mesmo estilo) ----
  const checker = (g, a, b) => { g.ctx.fillStyle = (g.r + g.c) % 2 ? a : b; g.rect(g.x, g.y, T, T); };
  const dot = (g, color, dx, dy, w, h) => { g.ctx.fillStyle = color; g.rect(g.x + dx, g.y + dy, w, h); };
  const circle = (g, color, cx, cy, rad) => { const c = g.ctx; c.fillStyle = color; c.beginPath(); c.arc(g.x + cx, g.y + cy, rad, 0, TAU); c.fill(); };
  const pick = (list, v) => list[Math.min(list.length - 1, Math.floor(v * list.length))];
  const shadowBox = (g) => dot(g, "rgba(0,0,0,.25)", 5, 9, 24, 21);
  const shadowDisc = (g, rad) => circle(g, "rgba(0,0,0,.25)", 16, 19, rad);
  // parede com borda só do lado de fora (as paredes vizinhas formam um bloco só)
  function block(g, base, top, shade, side) {
    const { c, r, x, y } = g;
    g.ctx.fillStyle = base; g.rect(x, y, T, T);
    if (!g.solid(c, r - 1)) { g.ctx.fillStyle = top; g.rect(x, y, T, 4); }
    if (!g.solid(c, r + 1)) { g.ctx.fillStyle = shade; g.rect(x, y + T - 4, T, 4); }
    g.ctx.fillStyle = side || shade;
    if (!g.solid(c - 1, r)) g.rect(x, y, 3, T);
    if (!g.solid(c + 1, r)) g.rect(x + T - 3, y, 3, T);
  }
  const kindAt = (g, dc, dr) => (g.kind ? g.kind(g.c + dc, g.r + dr) : ".");
  const stroke = (g, col, lw) => { g.ctx.strokeStyle = col; g.ctx.lineWidth = lw; g.ctx.stroke(); };
  const polygon = (g, col, pts) => {
    const ctx = g.ctx; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.x + pts[0], g.y + pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(g.x + pts[i], g.y + pts[i + 1]);
    ctx.closePath(); ctx.fill();
  };
  const line = (g, col, lw, x1, y1, x2, y2) => { const c = g.ctx; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(g.x + x1, g.y + y1); c.lineTo(g.x + x2, g.y + y2); c.stroke(); };
  // sombra de contato das paredes do norte e do oeste: dá profundidade ao chão junto das paredes
  function contact(g, col) {
    const k = col || "rgba(0,0,0,.14)";
    if (g.solid(g.c, g.r - 1)) dot(g, k, 0, 0, T, 4);
    if (g.solid(g.c - 1, g.r)) dot(g, k, 0, 0, 3, T);
  }
  // sombra comprida de um galho/lugar alto: cai para a direita e para baixo, em duas camadas (x, y, w, h: a pegada do objeto), sempre dentro do tile
  function longShadow(g, x, y, w, h) {
    dot(g, "rgba(0,0,0,.16)", x + 6, y + 7, T - x - 6, T - y - 7);
    dot(g, "rgba(0,0,0,.27)", x + 3, y + 4, Math.min(w + 3, T - x - 3), Math.min(h + 3, T - y - 4));
  }
  function treeShadow(g, cx, cy, rad) {
    circle(g, "rgba(0,0,0,.13)", Math.min(T - rad, cx + 5), Math.min(T - rad, cy + 6), rad);
    circle(g, "rgba(0,0,0,.2)", Math.min(T - rad, cx + 3), Math.min(T - rad, cy + 4), rad);
  }
  // brilho quente sob o galho: o "refúgio" se destaca do chão ao redor (o mesmo sinal em todos os ambientes; com `col` nas fases noturnas a luz é outra)
  const halo = (g, col) => circle(g, col || "rgba(255,240,180,.32)", 16, 16, 15.5);
  const topLight = (g, x, y, w, h, col) => { dot(g, col, x, y, w, 2); dot(g, col, x, y, 2, h); };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // MUROS VOÁVEIS (M): geradores de fileiras que se juntam com os vizinhos (M e #). Cada um pinta antes o chão do ambiente (`base`), para o tile ficar inteiro e o chão aparecer em volta.
  const isWall = (k) => k === "M" || k === "#";
  function joins(g) { const k = (dc, dr) => isWall(kindAt(g, dc, dr)); return [k(-1, 0), k(1, 0), k(0, -1), k(0, 1)]; }
  // sebe / arbusto aparado / moita: corpo escuro com protuberâncias de folhas, miolo mais claro, brilhos e florzinhas
  // o = { dark, mid, light, dots: [cores] | null, dotP, edge (cor da borda de pedra) | null, shade }
  function hedgeM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), x0 = L ? 0 : 3, x1 = R ? T : 29, y0 = U ? 0 : 5, y1 = D ? T : 27;
    dot(g, o.shade || "rgba(0,0,0,.2)", x0 + 2, y0 + 5, Math.min(x1 + 3, T) - x0 - 2, Math.min(y1 + 4, T) - y0 - 5);
    if (o.edge) dot(g, o.edge, x0, y0 + 1, x1 - x0, y1 - y0 - 1);
    const ix = o.edge ? 2 : 0;
    dot(g, o.dark, x0 + ix, y0 + ix, x1 - x0 - 2 * ix, y1 - y0 - 2 * ix);
    g.ctx.fillStyle = o.dark; g.ctx.beginPath(); // protuberâncias nas bordas livres
    const bump = (cx, cy) => { g.ctx.moveTo(g.x + cx + 3.5, g.y + cy); g.ctx.arc(g.x + cx, g.y + cy, 3.5, 0, TAU); };
    if (!U) { bump(9, y0 + 1); bump(21, y0 + 1); }
    if (!D) { bump(12, y1 - 1); bump(24, y1 - 1); }
    if (!L) bump(x0 + 1, 14);
    if (!R) bump(x1 - 1, 18);
    g.ctx.fill();
    dot(g, o.mid, x0 + ix + 2, y0 + ix + 2, x1 - x0 - 2 * ix - 4, y1 - y0 - 2 * ix - 7);
    for (let i = 0; i < 3; i++) circle(g, o.light, x0 + 5 + g.h(60 + i) * (x1 - x0 - 10), y0 + 5 + g.h(63 + i) * (y1 - y0 - 12), 3.2);
    if (o.dots) for (let i = 0; i < 4; i++) if (g.h(70 + i) < (o.dotP == null ? 0.7 : o.dotP)) dot(g, pick(o.dots, g.h(75 + i)), x0 + 4 + g.h(80 + i) * (x1 - x0 - 9), y0 + 4 + g.h(84 + i) * (y1 - y0 - 11), 2.4, 2.4);
  }
  // cerca de madeira: "paling" (ripas verticais pontudas: cerca alta) ou "rail" (postes e duas travessas grossas); o = { wood, light, dark, post, vine, shade }
  function fenceM(g, base, o, style) {
    base(g);
    const [L, R, U, D] = joins(g), horiz = L || R || (!U && !D), x0 = L ? 0 : 3, x1 = R ? T : 29;
    if (horiz) {
      dot(g, o.shade || "rgba(0,0,0,.2)", x0, 21, Math.min(x1 + 3, T) - x0, 9);
      if (style === "rail") {
        dot(g, o.dark, x0, 11, x1 - x0, 4); dot(g, o.wood, x0, 10, x1 - x0, 3); dot(g, o.dark, x0, 20, x1 - x0, 4); dot(g, o.wood, x0, 19, x1 - x0, 3);
        for (const px of [3, 17]) if (px >= x0 - 1 && px + 4 <= x1 + 1) { dot(g, o.dark, px, 5, 5, 22); dot(g, o.post || o.wood, px, 4, 4, 22); dot(g, o.light, px, 4, 1.2, 22); }
        if (o.vine) for (let i = 0; i < 5; i++) circle(g, o.vine, x0 + 3 + g.h(90 + i) * (x1 - x0 - 6), 9 + (i % 2) * 9 + g.h(95 + i) * 3, 2.4);
      } else {
        dot(g, o.dark, x0, 11, x1 - x0, 2.4); dot(g, o.dark, x0, 20, x1 - x0, 2.4);
        g.ctx.fillStyle = o.wood; g.ctx.beginPath();
        for (let i = 0; i < 6; i++) { const px = 2.4 + i * 5.2; if (px < x0 - 1 || px + 4 > x1) continue; g.ctx.moveTo(g.x + px, g.y + 27); g.ctx.lineTo(g.x + px, g.y + 7); g.ctx.lineTo(g.x + px + 2, g.y + 4); g.ctx.lineTo(g.x + px + 4, g.y + 7); g.ctx.lineTo(g.x + px + 4, g.y + 27); g.ctx.closePath(); }
        g.ctx.fill();
        g.ctx.fillStyle = o.light; for (let i = 0; i < 6; i++) { const px = 2.4 + i * 5.2; if (px < x0 - 1 || px + 4 > x1) continue; g.rect(g.x + px, g.y + 7, 1.3, 20); }
        if (o.vine) for (let i = 0; i < 3; i++) circle(g, o.vine, x0 + 5 + g.h(90 + i) * (x1 - x0 - 10), 8 + g.h(94 + i) * 14, 2.6);
      }
    } else { // fileira em pé (de cima para baixo): as ripas ficam deitadas, vistas de frente
      dot(g, o.shade || "rgba(0,0,0,.2)", 12, 3, 20, T - 3);
      dot(g, o.dark, 8, 0, 16, T); dot(g, o.wood, 9, 0, 14, T);
      for (let i = 0; i < 6; i++) { dot(g, o.dark, 9, 4 + i * 5.2, 14, 1.2); }
      dot(g, o.light, 9, 0, 2, T); if (style === "rail") { dot(g, o.post || o.wood, 6, 12, 20, 6); dot(g, o.dark, 6, 18, 20, 1.5); }
      if (o.vine) for (let i = 0; i < 4; i++) circle(g, o.vine, 10 + g.h(90 + i) * 12, 4 + g.h(94 + i) * 24, 2.4);
    }
  }
  // milho, trigal ou caniço: massa de talos em pé com folhas inclinadas e espigas ou pendões
  // o = { kind: "corn"|"wheat"|"reed", dark, stalk: [2 cores], leaf, head, head2, shade }
  function stalkM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), x0 = L ? 0 : 3, x1 = R ? T : 29, y0 = U ? 0 : 3, y1 = D ? T : 29;
    dot(g, o.shade || "rgba(0,0,0,.2)", x0 + 3, y0 + 5, Math.min(x1 + 3, T) - x0 - 3, Math.min(y1 + 3, T) - y0 - 5);
    dot(g, o.dark, x0, y0 + 2, x1 - x0, y1 - y0 - 2);
    const n = 5, sw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const top = y0 + 5 + g.h(10 + i) * 3; dot(g, o.stalk[i % 2], x0 + sw * i + 1, top, Math.max(2, sw - 2.4), y1 - top - 1); }
    g.ctx.strokeStyle = o.leaf; g.ctx.lineWidth = 1.5; g.ctx.beginPath();
    for (let i = 0; i < 6; i++) { const lx = x0 + 2 + g.h(20 + i) * (x1 - x0 - 4), ly = y0 + 8 + g.h(26 + i) * (y1 - y0 - 12), s = i % 2 ? 1 : -1; g.ctx.moveTo(g.x + lx, g.y + ly); g.ctx.lineTo(g.x + Math.min(31.5, Math.max(0.5, lx + s * 7)), g.y + ly - 5); }
    g.ctx.stroke();
    for (let i = 0; i < n; i++) {
      const hx = x0 + sw * i + sw / 2, hy = y0 + 5 + g.h(10 + i) * 3;
      if (o.kind === "corn") { if (i % 2) { dot(g, o.head, hx - 1.5, hy + 5, 3.4, 7); dot(g, o.head2, hx - 1.5, hy + 5, 1.2, 7); } else dot(g, o.head2, hx - 1, hy - 1, 2, 5); }
      else if (o.kind === "wheat") { dot(g, o.head, hx - 1.8, hy - 2, 3.6, 8); dot(g, o.head2, hx - 1.8, hy - 2, 1.2, 8); dot(g, o.head, hx - 0.4, hy - 5, 1, 3); }
      else { if (i % 2 === 0) { dot(g, o.head, hx - 1.5, hy - 1, 3, 8); dot(g, o.head2, hx - 0.4, hy - 4, 0.9, 3); } }
    }
  }
  // muro de pedras secas, baixo; o = { stone: [a, b], mortar, top, shade, glow (cor do brilho de cima) | null }
  function stoneM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), x0 = L ? 0 : 2, x1 = R ? T : 30, y0 = U ? 0 : 6, y1 = D ? T : 27;
    dot(g, o.shade || "rgba(0,0,0,.22)", x0 + 2, y0 + 4, Math.min(x1 + 3, T) - x0 - 2, Math.min(y1 + 4, T) - y0 - 4);
    dot(g, o.mortar, x0, y0, x1 - x0, y1 - y0);
    const rows = Math.max(2, Math.round((y1 - y0) / 7)), rh = (y1 - y0 - 1) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < 4; k++) {
      const sx = x0 + (r % 2 ? -3 : 1) + k * 8.4, sw = 7.4, xa = Math.max(x0, sx), xb = Math.min(x1, sx + sw);
      if (xb - xa < 2) continue;
      dot(g, o.stone[(r + k + (g.c & 1)) % 2], xa, y0 + 1 + r * rh, xb - xa, rh - 1.2);
    }
    dot(g, o.top, x0, y0, x1 - x0, 2.2);
    if (o.glow) dot(g, o.glow, x0, y0 - 1 < 0 ? 0 : y0 - 1, x1 - x0, 3);
  }
  // gradil de ferro: duas travessas e barras com pontas; o = { iron, light, shade }
  function railM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), horiz = L || R || (!U && !D), x0 = L ? 0 : 3, x1 = R ? T : 29;
    if (horiz) {
      dot(g, o.shade || "rgba(0,0,0,.2)", x0, 22, Math.min(x1 + 3, T) - x0, 8);
      dot(g, o.iron, x0, 9, x1 - x0, 2.4); dot(g, o.iron, x0, 21, x1 - x0, 2.4);
      for (let i = 0; i < 8; i++) { const px = 2 + i * 4; if (px < x0 - 1 || px + 1.6 > x1 + 1) continue; dot(g, o.iron, px, 6, 1.7, 20); }
      g.ctx.fillStyle = o.light; g.ctx.beginPath(); for (let i = 0; i < 8; i++) { const px = 2.85 + i * 4; if (px < x0 - 1 || px > x1 + 1 || px + 2 > T) continue; g.ctx.moveTo(g.x + px + 2, g.y + 5); g.ctx.arc(g.x + px, g.y + 5, 2, 0, TAU); } g.ctx.fill();
    } else {
      dot(g, o.shade || "rgba(0,0,0,.2)", 14, 0, 14, T);
      dot(g, o.iron, 10, 0, 12, T); dot(g, "rgba(255,255,255,.18)", 10, 0, 2, T);
      for (let i = 0; i < 6; i++) { dot(g, o.light, 8, 3 + i * 5.2, 16, 1.8); }
    }
  }
  // varal com roupas: duas estacas (nas pontas da fileira), a corda e panos coloridos pendurados; o = { rope, pole, cloths: [cores], shade }
  function lineM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), horiz = L || R || (!U && !D);
    if (horiz) {
      dot(g, o.shade || "rgba(0,0,0,.18)", L ? 0 : 5, 20, (R ? T : 28) - (L ? 0 : 5), 8);
      if (!L) { dot(g, o.pole, 2, 6, 3, 22); dot(g, "rgba(255,255,255,.3)", 2, 6, 1, 22); }
      if (!R) { dot(g, o.pole, 27, 6, 3, 22); dot(g, "rgba(255,255,255,.3)", 27, 6, 1, 22); }
      dot(g, o.rope, L ? 0 : 4, 9, (R ? T : 28) - (L ? 0 : 4), 1.4);
      for (let i = 0; i < 3; i++) { const cx = 2 + i * 10 + g.h(40 + i) * 2, w = 6 + g.h(44 + i) * 3, h = 10 + g.h(48 + i) * 5; if (cx < (L ? 0 : 6) || cx + w > (R ? T : 27) || cx + w + 2 > T) continue; dot(g, "rgba(0,0,0,.16)", cx + 2, 12, w, h); dot(g, pick(o.cloths, g.h(52 + i)), cx, 10, w, h); dot(g, "rgba(255,255,255,.4)", cx, 10, w, 1.6); dot(g, "rgba(0,0,0,.14)", cx + w - 1.6, 11, 1.6, h - 1); }
    } else {
      dot(g, o.shade || "rgba(0,0,0,.18)", 16, 0, 14, T);
      dot(g, o.pole, 14, 0, 3, T); dot(g, o.rope, 9, 0, 1.4, T);
      for (let i = 0; i < 3; i++) dot(g, pick(o.cloths, g.h(52 + i)), 4, 3 + i * 10, 9, 7);
    }
  }
  // rede de pesca esticada entre estacas; o = { pole, net, float, shade }
  function netM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), horiz = L || R || (!U && !D);
    if (horiz) {
      dot(g, o.shade || "rgba(0,0,0,.2)", L ? 0 : 5, 22, (R ? T : 28) - (L ? 0 : 5), 8);
      const xa = L ? 0 : 3, xb = R ? T : 29;
      dot(g, o.back || "rgba(40,80,120,.2)", xa, 8, xb - xa, 18);
      g.ctx.strokeStyle = o.net; g.ctx.lineWidth = 1.1; g.ctx.beginPath();
      for (let i = -3; i < 9; i++) { const a = xa + i * 4; if (a + 18 < xa || a > xb) continue; g.ctx.moveTo(g.x + Math.max(xa, a), g.y + 8 + (Math.max(xa, a) - a)); g.ctx.lineTo(g.x + Math.min(xb, a + 18), g.y + 8 + (Math.min(xb, a + 18) - a)); g.ctx.moveTo(g.x + Math.max(xa, a), g.y + 26 - (Math.max(xa, a) - a)); g.ctx.lineTo(g.x + Math.min(xb, a + 18), g.y + 26 - (Math.min(xb, a + 18) - a)); }
      g.ctx.stroke();
      dot(g, o.net, xa, 7, xb - xa, 1.6); dot(g, o.net, xa, 26, xb - xa, 1.6);
      if (!L) dot(g, o.pole, 2, 3, 3.4, 27); if (!R) dot(g, o.pole, 26.6, 3, 3.4, 27);
      for (let i = 0; i < 3; i++) circle(g, o.float, 6 + i * 10 + g.h(30 + i) * 3, 7.6, 2.2);
    } else {
      dot(g, o.shade || "rgba(0,0,0,.2)", 16, 0, 14, T);
      dot(g, o.net, 8, 0, 16, T); dot(g, "rgba(255,255,255,.2)", 8, 0, 16, T);
      g.ctx.strokeStyle = o.pole; g.ctx.lineWidth = 1.2; g.ctx.beginPath(); for (let i = 0; i < 6; i++) { g.ctx.moveTo(g.x + 8, g.y + i * 5.2); g.ctx.lineTo(g.x + 24, g.y + i * 5.2 + 5.2); g.ctx.moveTo(g.x + 24, g.y + i * 5.2); g.ctx.lineTo(g.x + 8, g.y + i * 5.2 + 5.2); } g.ctx.stroke();
      circle(g, o.float, 12, 10, 2.2); circle(g, o.float, 20, 22, 2.2);
    }
  }
  // muro de gravetos trançados (o grande ninho); o = { dark, a, b, shade }
  function twigM(g, base, o) {
    base(g);
    const [L, R, U, D] = joins(g), x0 = L ? 0 : 3, x1 = R ? T : 29, y0 = U ? 0 : 5, y1 = D ? T : 27;
    dot(g, o.shade || "rgba(0,0,0,.22)", x0 + 3, y0 + 5, Math.min(x1 + 3, T) - x0 - 3, Math.min(y1 + 4, T) - y0 - 5);
    dot(g, o.dark, x0, y0, x1 - x0, y1 - y0);
    g.ctx.lineWidth = 2; g.ctx.strokeStyle = o.a; g.ctx.beginPath();
    for (let i = 0; i < 6; i++) { const t = g.h(100 + i), xa = x0 + 1 + t * (x1 - x0 - 12), ya = y0 + 2 + g.h(106 + i) * (y1 - y0 - 6); g.ctx.moveTo(g.x + xa, g.y + ya); g.ctx.lineTo(g.x + Math.min(x1 - 1, xa + 11), g.y + Math.max(y0 + 1, ya - 5 + g.h(112 + i) * 8)); }
    g.ctx.stroke();
    g.ctx.lineWidth = 1.6; g.ctx.strokeStyle = o.b; g.ctx.beginPath();
    for (let i = 0; i < 6; i++) { const xa = x0 + 1 + g.h(120 + i) * (x1 - x0 - 12), ya = y0 + 3 + g.h(126 + i) * (y1 - y0 - 6); g.ctx.moveTo(g.x + xa, g.y + ya); g.ctx.lineTo(g.x + Math.min(x1 - 1, xa + 10), g.y + Math.min(y1 - 1, ya + 3 + g.h(132 + i) * 5)); }
    g.ctx.stroke();
    dot(g, "rgba(255,255,255,.18)", x0, y0, x1 - x0, 1.6);
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // VENTO: o chão do ambiente por baixo, um véu bem leve e fitas de ar que correm na direção da seta (só se mexem com g.time; paradas com 0) e uma setinha fixa para quem não vê o movimento.
  // o = { tint: cor do véu, rgb: "r,g,b" das fitas }
  function windOverlay(g, o) {
    const ctx = g.ctx, ch = g.kind ? g.kind(g.c, g.r) : ">", t = g.time || 0;
    const dx = ch === ">" ? 1 : ch === "<" ? -1 : 0, dy = ch === "v" ? 1 : ch === "^" ? -1 : 0, ax = dx || dy ? dx : 1, ay = dx || dy ? dy : 0, nx = -ay, ny = ax;
    dot(g, o.tint, 0, 0, T, T);
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.55 + k * 0.33 + g.h(40 + k) * 0.25) % 1, a1 = Math.max(-14, -22 + ph * 44 - 10), a2 = Math.min(14, -22 + ph * 44), u = (k - 1) * 8 + (g.h(44 + k) - 0.5) * 3;
      if (a2 - a1 < 3) continue;
      const al = 0.25 + 0.6 * Math.sin(PI * ph);
      ctx.beginPath();
      for (let i = 0; i <= 3; i++) { const a = a1 + ((a2 - a1) * i) / 3, w = Math.sin(a * 0.45 + t * 3 + k) * 1.8, px = 16 + ax * a + nx * (u + w), py = 16 + ay * a + ny * (u + w); if (i) ctx.lineTo(g.x + px, g.y + py); else ctx.moveTo(g.x + px, g.y + py); }
      ctx.strokeStyle = "rgba(0,40,70," + (al * 0.3).toFixed(2) + ")"; ctx.lineWidth = 3.4; ctx.stroke(); // (um contorno escuro e leve: as fitas aparecem também sobre chão claro)
      ctx.strokeStyle = "rgba(" + o.rgb + "," + al.toFixed(2) + ")"; ctx.lineWidth = 1.7; ctx.stroke();
    }
    // setinha fixa no meio (a direção, sem animação)
    ctx.beginPath();
    ctx.moveTo(g.x + 16 + ax * 7.4, g.y + 16 + ay * 7.4); ctx.lineTo(g.x + 16 - ax * 2.8 + nx * 5.6, g.y + 16 - ay * 2.8 + ny * 5.6); ctx.lineTo(g.x + 16 - ax * 2.8 - nx * 5.6, g.y + 16 - ay * 2.8 - ny * 5.6); ctx.closePath();
    ctx.fillStyle = "rgba(0,40,70,.26)"; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(g.x + 16 + ax * 6, g.y + 16 + ay * 6); ctx.lineTo(g.x + 16 - ax * 2 + nx * 4.5, g.y + 16 - ay * 2 + ny * 4.5); ctx.lineTo(g.x + 16 - ax * 2 - nx * 4.5, g.y + 16 - ay * 2 - ny * 4.5); ctx.closePath();
    ctx.fillStyle = "rgba(" + o.rgb + ",.7)"; ctx.fill();
  }
  // água rasa de segurança (os mapas do Passarinho não têm "~"): ondinhas que usam g.time
  function waterDefault(g, base, edge) {
    base(g);
    const ctx = g.ctx, t = g.time || 0;
    dot(g, "#6db8d8", 3, 3, T - 6, T - 6); dot(g, edge || "#4f95b8", 3, T - 5, T - 6, 2);
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) { const y = g.y + 11 + i * 10 + Math.sin(t * 1.6 + g.c * 1.3 + i) * 1.2, x0 = g.x + 7 + g.h(20 + i) * 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 8, y - 1.5); ctx.lineTo(x0 + 16, y); ctx.stroke(); }
  }

  const REQUIRED = ["floor", "wall", "muro", "crate", "high"];
  function register(id, theme) {
    if (!Number.isInteger(id) || id < 1 || id > 20) throw new RangeError("fase do Passarinho inválida: " + id);
    if (!theme || typeof theme !== "object") throw new TypeError("tema inválido");
    for (const k of REQUIRED) if (typeof theme[k] !== "function") throw new TypeError(`tema da fase ${id}: falta ${k}(g)`);
    if (typeof theme.place !== "string" || !theme.place) throw new TypeError(`tema da fase ${id}: falta place`);
    const t = Object.assign({ id, blurb: "", night: false, dusk: false, halo: "rgba(255,240,180,.35)", nest: { rim: "#8a5e34", twig: "#c29a5e", lining: "#f2d9a0" }, mover: { wall: ["#777", "#999", "#444"], door: ["#888", "#aaa", "#555"] }, rail: ["#666", "#222"] }, theme, { id });
    if (typeof theme.wind !== "function") { // `wind: { tint, rgb }`: o registro monta a função (o chão do ambiente + as fitas de ar)
      const wo = Object.assign({ tint: "rgba(255,255,255,.14)", rgb: "255,255,255" }, theme.wind || {});
      t.wind = (g) => { t.floor(g); windOverlay(g, wo); };
    }
    if (typeof t.water !== "function") t.water = (g) => waterDefault(g, t.floor);
    REG[id] = t;
    return t;
  }
  // sem ambiente próprio (ainda não registrado), devolve o da Fase 1; sem nenhum, null (o jogo cai no ambiente do cachorrinho)
  const of = (id) => REG[id] || REG[1] || null;
  return {
    register, of, ids: () => Object.keys(REG).map(Number).sort((a, b) => a - b), hash, TILE: T,
    helpers: { checker, dot, circle, pick, shadowBox, shadowDisc, block, kindAt, stroke, polygon, line, contact, longShadow, treeShadow, halo, topLight, joins, hedgeM, fenceM, stalkM, stoneM, railM, lineM, netM, twigM, windOverlay },
  };
});
