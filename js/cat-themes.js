// Ambientes das 20 fases do Gatinho (0.18.0): cada fase é um lugar onde gatos domésticos vivem e caçam (casa, quintal, telhados, feira, porto...).
// Este arquivo é o NÚCLEO (registro + auxiliares de desenho); os ambientes ficam em js/cat-themes-1.js (Fases 1 a 10) e js/cat-themes-2.js (Fases 11 a 20),
// que chamam CatThemes.register(id, tema). Nada aqui mexe nas regras do jogo: só desenho.
//
// Uso (js/game.js, fases do Gatinho): const th = CatThemes.of(idDaFase); a cada tile visível: th.floor(g), th.wall(g), th.crate(g) (X: obstáculo baixo que o gatinho pula),
// th.high(g) (T: lugar alto: árvore, prateleira, muro, contêiner...) ou th.water(g) (~: poça ou água rasa), onde `g` é o mesmo objeto dos ambientes do cachorrinho (js/themes.js):
//   g.ctx, g.rect(x, y, w, h)  retângulo alinhado aos pixels do aparelho
//   g.x, g.y, g.c, g.r         canto de cima à esquerda do tile (px) e a coluna e a linha
//   g.h(k)                     número de 0 a 1 sempre igual para o mesmo tile e o mesmo k (sem piscar)
//   g.solid(c, r)              true se o tile é parede ou está fora do mapa
//   g.kind(c, r)               (novo) o caractere do mapa no tile ("#", ".", "X", "T", "~", "E", "P", "V", "R"; "#" fora do mapa)
//   g.mass(c, r)               (opcional, só no jogo) quantos tiles tem a mancha de paredes (`#` ligadas) daquele tile, sem contar o anel de fora do mapa (0 se não é parede): o Parque (Fase 9) a usa para que a mancha enorme seja o lago
//   g.border                   true no anel de fora do mapa
//   g.time                     (novo) segundos de jogo (para água que brilha e folhas que balançam; 0 quando "reduzir movimento")
// Um tema é { id, place (nome do lugar), blurb (frase curta), night (true: fase noturna), mover: { wall: [3 cores], door: [3 cores] }, rail: [2 cores],
//             floor(g), wall(g), crate(g), high(g), water(g) } (mover e rail são as cores dos blocos e trilhos que se movem, como nos ambientes do cachorrinho).
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CatThemes = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const T = 32;
  const REG = Object.create(null);

  // número de 0 a 1 sempre igual para o mesmo (coluna, linha, k): o mesmo gerador do js/themes.js (sem piscar)
  function hash(c, r, k) {
    let h = (Math.imul(c + 101, 374761393) + Math.imul(r + 211, 668265263) + Math.imul(k + 7, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // ---- auxiliares de desenho (os mesmos do js/themes.js, para os ambientes novos terem o mesmo estilo) ----
  const checker = (g, a, b) => { g.ctx.fillStyle = (g.r + g.c) % 2 ? a : b; g.rect(g.x, g.y, T, T); };
  const dot = (g, color, dx, dy, w, h) => { g.ctx.fillStyle = color; g.rect(g.x + dx, g.y + dy, w, h); };
  const circle = (g, color, cx, cy, rad) => { const c = g.ctx; c.fillStyle = color; c.beginPath(); c.arc(g.x + cx, g.y + cy, rad, 0, Math.PI * 2); c.fill(); };
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
  // água rasa/poça: `base` e `shine` (duas cores) com ondinhas que se mexem devagar (parada com g.time = 0)
  function puddle(g, base, shine, edge) {
    const { ctx } = g, t = g.time || 0;
    g.ctx.fillStyle = base; g.rect(g.x, g.y, T, T);
    if (edge) { for (const [dx, dy, w, h] of [[0, 0, T, 2], [0, T - 2, T, 2], [0, 0, 2, T], [T - 2, 0, 2, T]]) { ctx.fillStyle = edge; g.rect(g.x + dx, g.y + dy, w, h); } }
    ctx.strokeStyle = shine; ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      const y = g.y + 9 + i * 11 + Math.sin(t * 1.6 + g.c * 1.3 + i) * 1.2, x0 = g.x + 4 + g.h(20 + i) * 6;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo(x0 + 6, y - 2.5, x0 + 12, y); ctx.quadraticCurveTo(x0 + 17, y + 2.5, x0 + 22, y); ctx.stroke();
    }
  }

  const REQUIRED = ["floor", "wall", "crate", "high", "water"];
  function register(id, theme) {
    if (!Number.isInteger(id) || id < 1 || id > 20) throw new RangeError("fase do Gatinho inválida: " + id);
    if (!theme || typeof theme !== "object") throw new TypeError("tema inválido");
    for (const k of REQUIRED) if (typeof theme[k] !== "function") throw new TypeError(`tema da fase ${id}: falta ${k}(g)`);
    if (typeof theme.place !== "string" || !theme.place) throw new TypeError(`tema da fase ${id}: falta place`);
    REG[id] = Object.assign({ id, blurb: "", night: false, mover: { wall: ["#777", "#999", "#444"], door: ["#888", "#aaa", "#555"] }, rail: ["#666", "#222"] }, theme, { id });
    return REG[id];
  }
  // sem ambiente próprio (ainda não registrado), devolve o da Fase 1; sem nenhum, null (o jogo cai no ambiente do cachorrinho)
  const of = (id) => REG[id] || REG[1] || null;
  return { register, of, ids: () => Object.keys(REG).map(Number).sort((a, b) => a - b), hash, TILE: T, helpers: { checker, dot, circle, pick, shadowBox, shadowDisc, block, puddle } };
});
