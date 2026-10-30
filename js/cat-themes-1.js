// Ambientes das Fases 1 a 10 do Gatinho (0.18.0): 1 Sala de estar, 2 Cozinha e despensa, 3 Quintal dos fundos, 4 Jardim e varal, 5 Telhados e muros,
// 6 Beco da cidade, 7 Feira livre, 8 Peixaria e mercado, 9 Parque e lago, 10 Armazém de grãos. Cada um se registra com CatThemes.register(id, tema)
// (núcleo: js/cat-themes.js, que precisa ser carregado antes; no Node este arquivo faz o require sozinho).
//
// Cada tema desenha só com g.ctx/g.rect (retângulos e círculos simples, cores fixas, tudo dentro do tile de 32 px, sem Math.random: o sorteio é g.h(k)):
//   floor(g)  chão (com variação discreta)         wall(g)  parede "#" (blocos juntos pelas bordas, como os do cachorrinho)
//   crate(g)  X: obstáculo baixo (móveis, vasos, caixotes...) que o gatinho pula
//   high(g)   T: lugar alto (estante, árvore, chaminé, pilha...): sombra comprida, tampo claro e brilho de borda para ser reconhecido de relance
//   water(g)  ~: poça ou água rasa (anel molhado, reflexo e ondinhas que usam g.time; com g.time ausente ou 0 ficam paradas)
// high e water desenham antes uma base simples do chão do próprio ambiente (assim não dependem de o jogo ter pintado o chão por baixo); poças vizinhas
// (g.kind(c, r) === "~") se juntam numa poça só. Nenhum tema usa g.free (o contrato do núcleo não o lista); g.kind é opcional (sem ele não há junção).
// Orçamento: no máximo 40 operações de pintura (fillRect, fill e stroke) por tile, conferido em tests/cat-themes-1.test.js.
(function (root) {
  "use strict";
  const CT = typeof module === "object" && module.exports ? require("./cat-themes.js") : root.CatThemes;
  if (!CT) throw new Error("js/cat-themes.js precisa ser carregado antes de js/cat-themes-1.js");
  const { dot, circle, pick, shadowBox, shadowDisc, block, checker } = CT.helpers;
  const T = 32, TAU = Math.PI * 2, hv = CT.hash;

  // ---------------------------------------------------------------------------------------------------------------------------------
  // auxiliares próprios
  const kindAt = (g, dc, dr) => (g.kind ? g.kind(g.c + dc, g.r + dr) : ".");
  const AO = "rgba(0,0,0,.17)";
  // sombra de contato das paredes do norte e do oeste: dá profundidade ao chão junto das paredes
  function contact(g, col) {
    const k = col || AO;
    if (g.solid(g.c, g.r - 1)) dot(g, k, 0, 0, T, 4);
    if (g.solid(g.c - 1, g.r)) dot(g, k, 0, 0, 3, T);
  }
  // sombra comprida de um lugar alto: cai para a direita e para baixo, em duas camadas (x, y, w, h: a pegada do objeto)
  function longShadow(g, x, y, w, h) {
    dot(g, "rgba(0,0,0,.16)", x + 6, y + 7, T - x - 6, T - y - 7);
    dot(g, "rgba(0,0,0,.27)", x + 3, y + 4, Math.min(w + 3, T - x - 3), Math.min(h + 3, T - y - 4));
  }
  // sombra comprida de uma copa redonda (círculos), sempre dentro do tile
  function treeShadow(g, cx, cy, rad) {
    circle(g, "rgba(0,0,0,.13)", Math.min(T - rad, cx + 5), Math.min(T - rad, cy + 6), rad);
    circle(g, "rgba(0,0,0,.2)", Math.min(T - rad, cx + 3), Math.min(T - rad, cy + 4), rad);
  }
  // brilho de borda do tampo (cima e esquerda): o "topo claro" que indica um lugar alto
  function topLight(g, x, y, w, h, col) { dot(g, col, x, y, w, 2); dot(g, col, x, y, 2, h); }
  // brilho quente sob o lugar alto: o "refúgio" se destaca do chão ao redor (o mesmo sinal em todos os ambientes)
  const halo = (g) => circle(g, "rgba(255,240,180,.32)", 16, 16, 15.5);
  const stroke = (g, col, lw) => { g.ctx.strokeStyle = col; g.ctx.lineWidth = lw; g.ctx.stroke(); };
  const polygon = (g, col, pts) => {
    const ctx = g.ctx; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(g.x + pts[0], g.y + pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(g.x + pts[i], g.y + pts[i + 1]);
    ctx.closePath(); ctx.fill();
  };
  // poça redonda sobre o chão do ambiente: anel molhado, corpo d'água, fundo, reflexos e duas ondinhas; poças vizinhas se juntam
  // o = { wet, body, deep, rip ("r,g,b" das ondinhas), extra(g, cx, cy, rad) opcional }
  function pool(g, base, o) {
    base(g);
    const L = kindAt(g, -1, 0) === "~", R = kindAt(g, 1, 0) === "~", U = kindAt(g, 0, -1) === "~", D = kindAt(g, 0, 1) === "~";
    const rad = 11.5 + g.h(30) * 1.5, cx = 16 + (g.h(31) - 0.5) * 2, cy = 16 + (g.h(32) - 0.5) * 2, wr = rad + 2;
    circle(g, o.wet, cx, cy, wr);
    if (L) dot(g, o.wet, 0, cy - wr, cx, 2 * wr);
    if (R) dot(g, o.wet, cx, cy - wr, T - cx, 2 * wr);
    if (U) dot(g, o.wet, cx - wr, 0, 2 * wr, cy);
    if (D) dot(g, o.wet, cx - wr, cy, 2 * wr, T - cy);
    circle(g, o.body, cx, cy, rad);
    if (L) dot(g, o.body, 0, cy - rad, cx, 2 * rad);
    if (R) dot(g, o.body, cx, cy - rad, T - cx, 2 * rad);
    if (U) dot(g, o.body, cx - rad, 0, 2 * rad, cy);
    if (D) dot(g, o.body, cx - rad, cy, 2 * rad, T - cy);
    circle(g, o.deep, cx + 1, cy + 1.5, rad * 0.62);
    dot(g, "rgba(255,255,255,.62)", cx - 7, cy - 6, 7, 1.5); dot(g, "rgba(255,255,255,.45)", cx - 5, cy - 3.5, 4, 1.5);
    if (o.extra) o.extra(g, cx, cy, rad);
    const t = g.time || 0, ctx = g.ctx;
    for (let i = 0; i < 2; i++) {
      const ph = (t * 0.45 + g.h(33) + i * 0.5) % 1;
      ctx.strokeStyle = "rgba(" + o.rip + "," + (0.7 * (1 - ph)).toFixed(2) + ")"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(g.x + cx + (i ? 3.5 : -3), g.y + cy + (i ? -2.5 : 2.5), 1.5 + ph * 6, 0, TAU); ctx.stroke();
    }
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // 1. Sala de estar: parquet de tacos e tapetes, paredes verde-sálvia com rodapé, sofás, estantes altas e arranhadores
  const BOOKS = ["#b8433a", "#2f6d9a", "#e0b33a", "#4f9a62", "#7a4fa0", "#e3dccb", "#d9783a"];
  const rug1 = (c, r) => hv(c >> 2, r >> 2, 41) < 0.2; // tapetes de 4 x 4 tiles
  const sala = {
    place: "Sala de estar", blurb: "a sala de estar: parquet, tapetes, sofás e estantes altas",
    mover: { wall: ["#7a3f63", "#a8648a", "#3d1d31"], door: ["#2f7f8f", "#5fb2c0", "#143e47"] },
    rail: ["#5a4636", "#1c140e"],
    base(g) { checker(g, "#dcb067", "#d5a960"); },
    floor(g) {
      const { c, r } = g;
      if (rug1(c, r)) { // tapete com franja dourada nas bordas livres
        dot(g, "#7f2b45", 0, 0, T, T);
        dot(g, "#b06a5e", 14, 9, 4, 14); dot(g, "#b06a5e", 10, 14, 12, 4); dot(g, "#4d1527", 14, 14, 4, 4);
        if (!rug1(c - 1, r)) { dot(g, "#d9b66f", 0, 0, 3, T); dot(g, "#4d1527", 3, 0, 1, T); }
        if (!rug1(c + 1, r)) { dot(g, "#d9b66f", T - 3, 0, 3, T); dot(g, "#4d1527", T - 4, 0, 1, T); }
        if (!rug1(c, r - 1)) { dot(g, "#d9b66f", 0, 0, T, 3); dot(g, "#4d1527", 0, 3, T, 1); }
        if (!rug1(c, r + 1)) { dot(g, "#d9b66f", 0, T - 3, T, 3); dot(g, "#4d1527", 0, T - 4, T, 1); }
      } else { // parquet de tacos: blocos de 16 px com a veia da madeira alternando entre horizontal e vertical
        sala.base(g);
        dot(g, "#a67c47", 15, 0, 1, T); dot(g, "#a67c47", 0, 15, T, 1);
        g.ctx.fillStyle = "#c29a58";
        for (let q = 0; q < 4; q++) {
          const bx = (q & 1) * 16, by = (q >> 1) * 16;
          if ((q & 1) ^ (q >> 1)) { g.rect(g.x + bx + 2, g.y + by + 4, 12, 1); g.rect(g.x + bx + 2, g.y + by + 9, 12, 1); }
          else { g.rect(g.x + bx + 4, g.y + by + 2, 1, 12); g.rect(g.x + bx + 9, g.y + by + 2, 1, 12); }
        }
        if (g.h(1) < 0.25) dot(g, "rgba(90,50,10,.08)", (g.h(3) < 0.5 ? 0 : 16), (g.h(4) < 0.5 ? 0 : 16), 15, 15);
        if (g.h(2) > 0.94) dot(g, "rgba(255,255,255,.16)", 3, 3, 26, 5); // reflexo no verniz
      }
      contact(g);
    },
    wall(g) {
      const { c, r } = g, front = !g.solid(c, r + 1), t = g.h(3);
      block(g, "#83a597", "#b9d4c8", "#456a5e", "#5c8173");
      g.ctx.fillStyle = "rgba(255,255,255,.09)"; for (let i = 4; i < T; i += 8) g.rect(g.x + i, g.y + 4, 3, T - 8); // listras do papel de parede
      if (front) { dot(g, "#f1e8d3", 3, 20, 26, 7); dot(g, "#cfc3a8", 3, 20, 26, 1); } // rodapé
      if (!front && t < 0.07) { // janela com cortinas
        dot(g, "#f4efe4", 6, 4, 20, 22); dot(g, "#cfe8f3", 8, 6, 16, 18); dot(g, "#ffffff", 15, 6, 2, 18); dot(g, "#ffffff", 8, 14, 16, 2);
        dot(g, "#c8664a", 3, 3, 6, 24); dot(g, "#c8664a", 23, 3, 6, 24); dot(g, "#a24f38", 8, 3, 1, 24); dot(g, "#a24f38", 23, 3, 1, 24);
      } else if (!front && t < 0.14) { // quadro
        dot(g, "#6b4527", 8, 7, 16, 13); dot(g, "#ead9a6", 10, 9, 12, 9); dot(g, "#6f9a62", 10, 14, 12, 4); circle(g, "#e8a23a", 17, 12, 2);
      } else { // moldura em relevo
        const mh = front ? 11 : 18;
        g.ctx.fillStyle = "rgba(255,255,255,.2)";
        g.rect(g.x + 6, g.y + 6, 20, 1); g.rect(g.x + 6, g.y + 6 + mh, 20, 1); g.rect(g.x + 6, g.y + 6, 1, mh); g.rect(g.x + 25, g.y + 6, 1, mh + 1);
      }
    },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // sofá
        const s = pick([["#b9573a", "#d57a58", "#8f3f28"], ["#4f7aa0", "#74a0c6", "#38597a"], ["#6b8a4a", "#8fb06a", "#4f6a34"]], g.h(5));
        shadowBox(g);
        dot(g, s[2], 2, 6, 28, 21); dot(g, s[0], 2, 6, 28, 7); dot(g, s[1], 4, 7, 24, 2);
        dot(g, s[0], 2, 13, 6, 14); dot(g, s[0], 24, 13, 6, 14); dot(g, s[1], 8, 14, 16, 12); dot(g, s[2], 15, 14, 1, 12);
        dot(g, s[1], 2, 13, 6, 2); dot(g, s[1], 24, 13, 6, 2);
      } else if (v < 0.7) { // mesinha de centro
        shadowBox(g);
        dot(g, "#5a3a22", 4, 7, 24, 21); dot(g, "#8b5e38", 5, 8, 22, 17); dot(g, "#a67448", 5, 8, 22, 2);
        dot(g, "#e3dccb", 8, 12, 9, 7); dot(g, "#c0392b", 9, 13, 7, 2);
        circle(g, "#c4683a", 22, 16, 4); circle(g, "#4cb34b", 22, 15, 3);
      } else { // pufe
        const k = pick([["#d58a2e", "#eaa94d"], ["#3a9aa5", "#5cbcc6"], ["#b8446c", "#d8658c"]], g.h(5));
        shadowDisc(g, 12);
        circle(g, k[0], 16, 17, 11.5); circle(g, k[1], 16, 15.5, 9.5); circle(g, k[0], 16, 15.5, 2.2);
        dot(g, k[0], 15.5, 7, 1, 5); dot(g, k[0], 15.5, 19, 1, 5); dot(g, k[0], 7, 15, 5, 1); dot(g, k[0], 20, 15, 5, 1);
      }
    },
    high(g) {
      sala.base(g); halo(g);
      if (g.h(1) < 0.55) { // estante alta cheia de livros
        longShadow(g, 3, 3, 25, 26);
        dot(g, "#4a2f1a", 3, 3, 25, 26); dot(g, "#cf9a62", 3, 3, 25, 9); topLight(g, 3, 3, 25, 9, "#f0c994");
        dot(g, "#2d1b0e", 5, 13, 21, 14);
        for (let row = 0; row < 2; row++) {
          const by = 14 + row * 7;
          for (let k = 0; k < 6; k++) { g.ctx.fillStyle = pick(BOOKS, g.h(10 + row * 6 + k)); const bh = 4 + ((g.h(30 + row * 6 + k) * 3) | 0); g.rect(g.x + 6 + k * 3.5, g.y + by + 5 - bh + 1, 3, bh); }
          dot(g, "#8a5a35", 5, by + 6, 21, 1);
        }
        dot(g, "rgba(0,0,0,.26)", 24, 12, 4, 17);
      } else { // arranhador de pelúcia: plataforma redonda em cima e poste de sisal
        treeShadow(g, 14, 14, 12);
        dot(g, "#b58a4a", 11, 22, 7, 9); dot(g, "#8c6a35", 11, 24, 7, 1); dot(g, "#8c6a35", 11, 27, 7, 1);
        circle(g, "#9b7f55", 15, 16, 12.5); circle(g, "#d9c39b", 14, 13, 11.5); circle(g, "#ecdcb9", 13, 12, 8.5);
        g.ctx.beginPath(); g.ctx.arc(g.x + 14, g.y + 13, 9.5, 0, TAU); stroke(g, "#bfa77c", 1);
        circle(g, "#e87fa0", 12, 11, 2.4); circle(g, "#f6b6c8", 11.4, 10.4, 0.9);
        g.ctx.beginPath(); g.ctx.arc(g.x + 14, g.y + 13, 11.5, Math.PI * 1.05, Math.PI * 1.55); stroke(g, "rgba(255,255,255,.65)", 1.5);
      }
    },
    water(g) { pool(g, sala.base, { wet: "rgba(60,35,15,.3)", body: "#8cc3d6", deep: "#6aa6bd", rip: "255,255,255" }); },
  };

  // 2. Cozinha e despensa: azulejo xadrez creme e verde, balcões azul-petróleo com tampo de madeira, caixas, cestos, geladeira e prateleira alta
  const JARS = ["#e0a030", "#9a2f4a", "#6f9a3a", "#7a4a2a", "#efe9d8", "#d9783a"];
  const cozinha = {
    place: "Cozinha e despensa", blurb: "a cozinha e a despensa: azulejo xadrez, balcões, caixas e cestos",
    mover: { wall: ["#c4532f", "#e8845f", "#6e2a14"], door: ["#6a4a9a", "#9a7fcb", "#2f1f4f"] },
    rail: ["#5e4f40", "#1b140e"],
    base(g) { checker(g, "#9dbfa6", "#e6d8b4"); },
    floor(g) {
      cozinha.base(g);
      dot(g, "#b5ad8c", 0, T - 1, T, 1); dot(g, "#b5ad8c", T - 1, 0, 1, T);
      dot(g, "rgba(255,255,255,.3)", 2, 2, 10, 2); dot(g, "rgba(255,255,255,.3)", 2, 2, 2, 8);
      if (!((g.r + g.c) & 1)) { g.ctx.fillStyle = "#d4c69f"; g.rect(g.x + 4, g.y + 4, 3, 3); g.rect(g.x + 25, g.y + 4, 3, 3); g.rect(g.x + 4, g.y + 25, 3, 3); g.rect(g.x + 25, g.y + 25, 3, 3); g.rect(g.x + 14, g.y + 14, 4, 4); }
      if (g.h(1) > 0.93) dot(g, "rgba(0,0,0,.13)", 8 + ((g.h(2) * 14) | 0), 10 + ((g.h(3) * 12) | 0), 5, 2);
      contact(g);
    },
    wall(g) {
      const { c, r } = g, front = !g.solid(c, r + 1), t = g.h(3);
      if (front) { // frente dos armários: duas portas com puxador
        block(g, "#3e7c83", "#d8b987", "#25494e", "#2e5f65");
        dot(g, "#4a8f97", 4, 6, 11, 17); dot(g, "#4a8f97", 17, 6, 11, 17);
        dot(g, "#2f666d", 4, 22, 11, 1); dot(g, "#2f666d", 17, 22, 11, 1); dot(g, "#6aa9b0", 4, 6, 11, 1); dot(g, "#6aa9b0", 17, 6, 11, 1);
        dot(g, "#e5c46b", 12, 13, 2, 4); dot(g, "#e5c46b", 18, 13, 2, 4);
      } else { // tampo de madeira visto de cima
        block(g, "#c19a62", "#e0c08a", "#8a6a3c", "#a37e48");
        dot(g, "#a98250", 3, 9, 20, 1); dot(g, "#a98250", 8, 17, 21, 1); dot(g, "#a98250", 3, 25, 17, 1);
        if (t < 0.1) { dot(g, "#aab4bb", 5, 6, 22, 19); dot(g, "#7e8a93", 7, 8, 18, 14); circle(g, "#dfe5e8", 16, 10, 2.2); dot(g, "#dfe5e8", 15, 6, 2, 4); } // pia
        else if (t < 0.18) { // fogão
          dot(g, "#2b2d31", 4, 5, 24, 22);
          for (const [bx, by] of [[10, 11], [22, 11], [10, 22], [22, 22]]) { circle(g, "#69707a", bx, by, 4.6); circle(g, "#1a1b1e", bx, by, 3); }
          dot(g, "#d9483b", 14, 26, 4, 2);
        } else if (t < 0.26) { // fruteira
          circle(g, "#e9e2d0", 16, 16, 9); circle(g, "#d9483b", 13, 14, 3.4); circle(g, "#f2a03a", 19, 14, 3.4); circle(g, "#7bbf4a", 16, 19, 3.4);
        } else if (t < 0.32) { dot(g, "#e8dcc0", 6, 9, 14, 10); dot(g, "#c6b894", 6, 9, 14, 1); dot(g, "#c9ced4", 21, 12, 7, 2); dot(g, "#5a3a22", 26, 12, 3, 2); } // tábua e faca
      }
    },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // caixa de madeira com legumes
        const pr = pick([["#b98a52", "#d7ab6c"], ["#b8332b", "#e0584a"], ["#9fb04a", "#c4d46c"]], g.h(5));
        shadowBox(g);
        dot(g, "#8a5f30", 4, 7, 24, 21); dot(g, "#b4824a", 4, 7, 24, 3); dot(g, "#5e3f1f", 4, 25, 24, 3);
        for (const [dx, dy] of [[9, 15], [16, 14], [23, 15], [12, 21], [20, 20]]) { circle(g, pr[0], dx, dy, 3.6); circle(g, pr[1], dx - 1, dy - 1, 1.4); }
      } else if (v < 0.7) { // cesto de vime com maçãs
        shadowDisc(g, 12);
        circle(g, "#8a5e2c", 16, 17, 11.5); circle(g, "#c49a56", 16, 16, 9.8); circle(g, "#e9e2d0", 16, 16, 7);
        circle(g, "#d9483b", 13.5, 14.5, 3.2); circle(g, "#e8604a", 18.5, 14.5, 3.2); circle(g, "#c93a30", 16, 19, 3.2);
        g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 16, 10.6, 0, TAU); stroke(g, "#a87c3e", 1.2);
      } else { // pilha de caixas de papelão
        shadowBox(g);
        dot(g, "#b88d55", 3, 13, 15, 15); dot(g, "#d7b57c", 3, 13, 15, 3); dot(g, "#8c6a3c", 3, 26, 15, 2); dot(g, "#e3d3a8", 9, 13, 3, 15);
        dot(g, "#c19a62", 15, 7, 14, 21); dot(g, "#dfc08a", 15, 7, 14, 3); dot(g, "#8c6a3c", 15, 26, 14, 2); dot(g, "#e3d3a8", 20, 7, 4, 21); dot(g, "#f5f0e2", 16, 16, 4, 5);
      }
    },
    high(g) {
      cozinha.base(g); halo(g);
      if (g.h(1) < 0.55) { // geladeira
        const k = pick([["#e9eef0", "#f9fcfd", "#8d98a0"], ["#9fd4c4", "#c6ece0", "#4f8f7e"]], g.h(5));
        longShadow(g, 4, 3, 23, 26);
        dot(g, k[2], 4, 3, 23, 26); dot(g, k[1], 4, 3, 23, 9); topLight(g, 4, 3, 23, 9, "#ffffff");
        dot(g, k[0], 5, 12, 21, 16); dot(g, k[2], 5, 18, 21, 1);
        dot(g, "#5b6670", 19, 13, 2, 4); dot(g, "#5b6670", 19, 20, 2, 6); dot(g, "rgba(0,0,0,.26)", 23, 12, 4, 17);
        dot(g, "#d9483b", 8, 21, 3, 3); dot(g, "#3b82d6", 12, 22, 3, 3); dot(g, "#f2b632", 9, 15, 3, 2);
      } else { // prateleira alta da despensa, cheia de potes
        longShadow(g, 3, 3, 25, 26);
        dot(g, "#6b4a2a", 3, 3, 25, 26); dot(g, "#d6b07c", 3, 3, 25, 9); topLight(g, 3, 3, 25, 9, "#f2d6a8");
        dot(g, "#2d2014", 5, 13, 21, 14);
        for (let row = 0; row < 2; row++) {
          const by = 14 + row * 7;
          for (let k = 0; k < 4; k++) { dot(g, pick(JARS, g.h(10 + row * 4 + k)), 6 + k * 5, by + 1, 4, 5); dot(g, "#3a2a1a", 6 + k * 5, by, 4, 1.5); }
          dot(g, "#a67448", 5, by + 6, 21, 1);
        }
        dot(g, "rgba(0,0,0,.26)", 24, 12, 4, 17);
      }
    },
    water(g) { pool(g, cozinha.base, { wet: "rgba(70,60,40,.28)", body: "#9fdbe8", deep: "#5fb6d6", rip: "255,255,255" }); },
  };

  // 3. Quintal dos fundos: gramado cortado em faixas, cerca branca de ripas, vasos e carrinho de mão, árvore baixa de copa redonda
  const quintal = {
    place: "Quintal dos fundos", blurb: "o quintal dos fundos: gramado, cerca branca, vasos e uma árvore baixa",
    mover: { wall: ["#c0533d", "#e8826a", "#6a2418"], door: ["#8a5fb0", "#b995dc", "#3d2556"] },
    rail: ["#4d4636", "#14110a"],
    base(g) { dot(g, g.r & 1 ? "#7cb257" : "#74aa50", 0, 0, T, T); },
    floor(g) {
      quintal.base(g);
      const h = g.h(1);
      if (h < 0.55) for (let i = 0; i < 3; i++) { const px = 3 + ((g.h(2 + i) * 24) | 0), py = 4 + ((g.h(5 + i) * 22) | 0); dot(g, "#5f9331", px, py, 1.5, 4); dot(g, "#5f9331", px + 3, py + 1, 1.5, 3); }
      else if (h > 0.9) { const px = 6 + ((g.h(9) * 18) | 0), py = 6 + ((g.h(10) * 18) | 0); dot(g, g.h(11) < 0.5 ? "#f6f3e8" : "#f2c230", px, py, 3, 3); dot(g, "#d9534f", px + 1, py + 1, 1, 1); }
      else if (h > 0.55 && h < 0.62) { circle(g, "#5f9331", 10, 12, 2.6); circle(g, "#5f9331", 14, 11, 2.6); circle(g, "#5f9331", 12, 15, 2.6); }
      else if (h > 0.62 && h < 0.66) { circle(g, "#b9b4a4", 16, 18, 5); circle(g, "#d3cebd", 15, 17, 3.4); } // pedra do caminho
      contact(g, "rgba(20,40,10,.2)");
    },
    wall(g) {
      const { c, r } = g, top = !g.solid(c, r - 1);
      block(g, "#d9cfb4", "#f6efd9", "#8a7e60", "#a99d7e");
      g.ctx.fillStyle = "#a89c80"; for (let i = 8; i < T; i += 8) g.rect(g.x + i - 1, g.y + 4, 1.5, T - 8); // ripas
      dot(g, "#c3b798", 0, 11, T, 3); dot(g, "#c3b798", 0, 22, T, 3); dot(g, "#fffaf0", 0, 11, T, 1);
      if (top) { dot(g, "#8a7e60", 7, 0, 2, 4); dot(g, "#8a7e60", 15, 0, 2, 4); dot(g, "#8a7e60", 23, 0, 2, 4); }
      if (g.h(5) < 0.14) { circle(g, "#4f8a3a", 9, 18, 3.4); circle(g, "#5fa04a", 13, 15, 3); circle(g, "#4f8a3a", 11, 21, 2.6); circle(g, "#f06fa0", 14, 17, 1.4); } // trepadeira
    },
    crate(g) {
      if (g.h(4) < 0.55) { // vaso de barro com planta (visto de frente)
        const k = pick([["#c4683a", "#d9804d", "#a34f2a"], ["#3f78b5", "#5f98d0", "#2c5a8c"], ["#d8d2c2", "#efe9da", "#b0a995"]], g.h(6)), fl = pick(["#e8576a", "#f2b632", "#b66ad6", "#ffffff"], g.h(5));
        dot(g, "rgba(0,0,0,.25)", 6, 25, 23, 6);
        polygon(g, k[0], [8, 18, 24, 18, 22, 29, 10, 29]); dot(g, k[1], 7, 16, 18, 4); dot(g, k[2], 20, 20, 2, 9);
        circle(g, "#2f8f3a", 16, 11, 9); circle(g, "#4cb34b", 13, 9, 4.6); circle(g, "#6fcf5f", 12, 7.5, 2); circle(g, "#3f9a45", 20, 13, 4);
        circle(g, fl, 18, 8, 2.2); circle(g, fl, 12, 14, 1.8);
      } else { // carrinho de mão com terra
        const col = g.h(7) < 0.5 ? ["#cf4a2f", "#ee7757"] : ["#3f8a52", "#66b57a"];
        dot(g, "rgba(0,0,0,.25)", 3, 24, 27, 6);
        dot(g, "#8a6a3c", 1, 16, 9, 2); dot(g, "#444a52", 9, 20, 2, 9);
        polygon(g, col[0], [4, 8, 25, 8, 21, 22, 8, 22]); dot(g, col[1], 4, 8, 21, 2);
        polygon(g, "#5a3a22", [6, 10, 23, 10, 22, 14, 7, 14]); circle(g, "#6f4a2a", 12, 11, 3.4); circle(g, "#6f4a2a", 18, 11, 3);
        circle(g, "#23262b", 27, 24, 5); circle(g, "#a0a6ad", 27, 24, 2);
      }
    },
    high(g) { // árvore baixa de copa redonda, com o tronco aparecendo e frutinhas
      quintal.base(g); halo(g);
      treeShadow(g, 15, 14, 13);
      dot(g, "#6b4a2a", 13, 22, 6, 9); dot(g, "#4d341c", 13, 22, 2, 9);
      circle(g, "#2a6e33", 15, 14, 13); circle(g, "#3f8f40", 14, 12.5, 11); circle(g, "#58ad4c", 11.5, 10, 6.6); circle(g, "#7ccf64", 10, 8.5, 2.8);
      if (g.h(6) < 0.7) { circle(g, "#e8573a", 19, 14, 1.8); circle(g, "#e8573a", 13, 18, 1.8); circle(g, "#e8573a", 21, 9, 1.8); }
      g.ctx.beginPath(); g.ctx.arc(g.x + 14, g.y + 12.5, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,220,.55)", 1.6);
    },
    water(g) {
      pool(g, quintal.base, { wet: "rgba(70,48,24,.45)", body: "#79b6cf", deep: "#5b97b3", rip: "255,255,255", extra: (g2, cx, cy) => { dot(g2, "#4f8a3a", cx - 11, cy + 8, 1.5, 4); dot(g2, "#4f8a3a", cx + 10, cy - 9, 1.5, 4); } });
    },
  };

  // 4. Jardim e varal: caminho de terra batida, canteiros de flores como paredes, varal com roupa e regadores, ameixeira
  const FLOWERS = [["#f06fa0", "#fbd0e0"], ["#f2d03a", "#fff3a0"], ["#b567e0", "#e6c6f5"], ["#ff8a3d", "#ffd0a0"], ["#ffffff", "#f5e6a0"]];
  const jardim = {
    place: "Jardim e varal", blurb: "o jardim: caminho de terra, canteiros de flores, varal e uma ameixeira",
    mover: { wall: ["#3a6fb0", "#6a9ad8", "#1b365a"], door: ["#c04a7a", "#e87fa8", "#5a1a36"] },
    rail: ["#4a3a2a", "#150f09"],
    base(g) { checker(g, "#b9a083", "#b39b7e"); },
    floor(g) {
      jardim.base(g);
      dot(g, "#9c8265", 3 + ((g.h(2) * 20) | 0), 5 + ((g.h(3) * 18) | 0), 5, 3); dot(g, "#9c8265", 4 + ((g.h(4) * 20) | 0), 6 + ((g.h(5) * 18) | 0), 4, 2);
      dot(g, "#e2d6bd", 3 + ((g.h(6) * 24) | 0), 4 + ((g.h(7) * 24) | 0), 3, 2); dot(g, "#d8cbb0", 3 + ((g.h(8) * 24) | 0), 4 + ((g.h(9) * 24) | 0), 2, 2);
      if (g.h(1) > 0.82) { const px = 5 + ((g.h(10) * 20) | 0), py = 8 + ((g.h(11) * 16) | 0); dot(g, "#5f9331", px, py, 1.5, 5); dot(g, "#5f9331", px + 3, py + 1, 1.5, 4); dot(g, "#6fa83c", px + 6, py + 2, 1.5, 3); }
      if (g.solid(g.c, g.r - 1)) { circle(g, "#c9c0b0", 6, 3, 2.2); circle(g, "#b5ac9c", 14, 3, 2); circle(g, "#c9c0b0", 23, 3, 2.2); } // pedras de borda do canteiro
      contact(g, "rgba(40,20,0,.2)");
    },
    wall(g) { // canteiro com flores
      const { c, r } = g, front = !g.solid(c, r + 1), pal = FLOWERS[(hv(c >> 1, r >> 1, 50) * FLOWERS.length) | 0];
      block(g, "#3f7a3b", "#5fa650", "#25501f", "#2f6a2d");
      circle(g, "#356f31", 8 + g.h(1) * 6, 10 + g.h(2) * 6, 6); circle(g, "#4c9144", 21 + g.h(3) * 4, 17 + g.h(4) * 5, 6); circle(g, "#356f31", 12 + g.h(5) * 8, 21 + g.h(6) * 3, 5);
      for (let i = 0; i < 5; i++) { const px = 5 + g.h(10 + i) * 22, py = 7 + g.h(20 + i) * 16; circle(g, pal[0], px, py, 2.7); circle(g, pal[1], px, py, 1.1); }
      if (front) { dot(g, "#8a6238", 0, 21, T, 7); dot(g, "#a47a46", 0, 21, T, 1); dot(g, "#5c4024", 0, 27, T, 1); }
    },
    crate(g) {
      if (g.h(4) < 0.5) { // varal: dois postes, a corda e as roupas penduradas
        const a = pick(["#d9483b", "#3b82d6", "#58b85a", "#f08ac0"], g.h(5)), b = pick(["#3b82d6", "#f2a03a", "#a45ad6"], g.h(6));
        dot(g, "rgba(0,0,0,.22)", 3, 25, 27, 5);
        dot(g, "#7c5a34", 2, 3, 3, 27); dot(g, "#5c4024", 2, 3, 1, 27); dot(g, "#7c5a34", 27, 3, 3, 27); dot(g, "#5c4024", 27, 3, 1, 27);
        dot(g, "#f2efe2", 4, 5, 24, 1.5);
        dot(g, a, 7, 6, 9, 13); dot(g, a, 5, 6, 13, 4); dot(g, "rgba(0,0,0,.16)", 7, 15, 9, 4);
        dot(g, b, 19, 6, 7, 16); dot(g, "#ffffff", 19, 13, 7, 3); dot(g, "rgba(0,0,0,.16)", 19, 19, 7, 3);
      } else { // regador
        const k = pick([["#4a8fb5", "#6db0d4", "#356f8e"], ["#d9534f", "#ee7b77", "#a03532"], ["#4a9a5a", "#6dbb7c", "#33703f"]], g.h(5));
        dot(g, "rgba(0,0,0,.25)", 6, 23, 24, 7);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 22, g.y + 20); g.ctx.lineTo(g.x + 29, g.y + 9); stroke(g, k[2], 3);
        circle(g, "#9fc7dd", 29, 9, 2.6);
        dot(g, k[0], 8, 12, 15, 14); dot(g, k[1], 8, 12, 15, 3); dot(g, k[2], 8, 24, 15, 2);
        dot(g, k[2], 9, 5, 12, 2); dot(g, k[2], 9, 5, 2, 7); dot(g, k[2], 19, 5, 2, 7);
      }
    },
    high(g) { // ameixeira: copa de vários gomos com ameixas roxas
      jardim.base(g); halo(g);
      treeShadow(g, 15, 14, 12);
      dot(g, "#5e4026", 12, 20, 5, 11); dot(g, "#44301a", 12, 20, 2, 11); dot(g, "#5e4026", 16, 18, 6, 3);
      circle(g, "#3d7d46", 11, 13, 8.5); circle(g, "#3d7d46", 21, 13, 8); circle(g, "#3d7d46", 16, 18, 8); circle(g, "#3d7d46", 16, 8, 8);
      circle(g, "#5aa05a", 10, 10, 5.5); circle(g, "#5aa05a", 20, 9, 5); circle(g, "#5aa05a", 15, 14, 4.5); circle(g, "#7cc27a", 9, 8.5, 2.2);
      for (const [px, py] of [[8, 15], [14, 11], [20, 15], [23, 11], [17, 20], [11, 19]]) { circle(g, "#6a2a62", px, py, 2.1); circle(g, "#a064a0", px - 0.7, py - 0.7, 0.8); }
    },
    water(g) {
      pool(g, jardim.base, { wet: "rgba(80,56,32,.42)", body: "#82b9cf", deep: "#609ab5", rip: "255,255,255", extra: (g2, cx, cy) => { dot(g2, "#f06fa0", cx + 4, cy + 4, 2.5, 2); dot(g2, "#fbd0e0", cx - 6, cy - 1, 2, 2); } });
    },
  };

  // 5. Telhados e muros: telhas de barro, muros de tijolo aparente com argamassa clara, céu escuro do fim de tarde nas bordas
  const SKY = "#1f2745";
  const telhados = {
    place: "Telhados e muros", blurb: "os telhados e muros da cidade: telhas de barro, tijolos, chaminés e antenas",
    mover: { wall: ["#4a8f8a", "#7cc2bc", "#1f4a46"], door: ["#d9d2c0", "#f5f1e6", "#7a7466"] },
    rail: ["#3a3030", "#120d0d"],
    base(g) { dot(g, "#a8482f", 0, 0, T, T); },
    floor(g) { // telhas de barro (canal e capa): nervuras verticais claras e escuras, com a emenda de cada fileira
      telhados.base(g);
      g.ctx.fillStyle = "#c2623f"; for (let i = 0; i < 4; i++) g.rect(g.x + i * 8 + 1, g.y, 3, T);
      g.ctx.fillStyle = "#6e2f1f"; for (let i = 0; i < 4; i++) g.rect(g.x + i * 8 + 5, g.y, 2, T);
      g.ctx.fillStyle = "#873a26"; for (let i = 0; i < 4; i++) g.rect(g.x + i * 8, g.y + (i & 1 ? 8 : 24), 8, 2);
      if (g.h(1) < 0.2) dot(g, "#d27d57", 8 * ((g.h(2) * 4) | 0) + 1, 2 + ((g.h(3) * 22) | 0), 3, 6);
      if (g.h(4) > 0.9) { circle(g, "#5f7a45", 8 + g.h(5) * 14, 10 + g.h(6) * 12, 3); circle(g, "#7a9658", 9 + g.h(5) * 14, 9 + g.h(6) * 12, 1.6); } // musgo
      contact(g, "rgba(30,10,5,.22)");
    },
    wall(g) {
      const { c, r } = g;
      if (g.border) { // o céu: fim de tarde escuro, nuvens, estrelas e, às vezes, a lua; o parapeito só do lado do telhado
        dot(g, SKY, 0, 0, T, T);
        { const sy = 20 + ((g.h(1) * 6) | 0); dot(g, "#2a3358", 0, sy, T, T - sy); }
        if (g.h(2) < 0.5) dot(g, "rgba(140,120,190,.35)", 2 + ((g.h(3) * 12) | 0), 8 + ((g.h(4) * 8) | 0), 14, 3);
        if (g.h(5) > 0.35) { dot(g, "#f4f1d8", 4 + ((g.h(6) * 22) | 0), 3 + ((g.h(7) * 12) | 0), 1.5, 1.5); dot(g, "#f4f1d8", 6 + ((g.h(8) * 20) | 0), 14 + ((g.h(9) * 10) | 0), 1, 1); }
        if (g.h(10) > 0.97) { circle(g, "#f4efd0", 18, 12, 5); circle(g, SKY, 20.5, 10.5, 4.4); }
        if (!g.solid(c, r + 1)) { dot(g, "#8c7f73", 0, T - 6, T, 6); dot(g, "#c4b8a8", 0, T - 6, T, 1.5); }
        if (!g.solid(c, r - 1)) { dot(g, "#8c7f73", 0, 0, T, 6); dot(g, "#5e544b", 0, 5, T, 1); }
        if (!g.solid(c - 1, r)) { dot(g, "#8c7f73", 0, 0, 6, T); dot(g, "#c4b8a8", 0, 0, 1.5, T); }
        if (!g.solid(c + 1, r)) { dot(g, "#8c7f73", T - 6, 0, 6, T); dot(g, "#5e544b", T - 6, 0, 1, T); }
        return;
      }
      block(g, "#683a38", "#a8786a", "#321a1b", "#4a2626");
      g.ctx.fillStyle = "#a8957c";
      g.rect(g.x, g.y + 8, T, 1); g.rect(g.x, g.y + 16, T, 1); g.rect(g.x, g.y + 24, T, 1);
      g.rect(g.x + 15, g.y, 1, 8); g.rect(g.x + 7, g.y + 9, 1, 7); g.rect(g.x + 23, g.y + 9, 1, 7); g.rect(g.x + 15, g.y + 17, 1, 7); g.rect(g.x + 7, g.y + 25, 1, 7); g.rect(g.x + 23, g.y + 25, 1, 7);
      const row = (g.h(2) * 4) | 0;
      dot(g, "rgba(0,0,0,.2)", row & 1 ? 8 : 0, row * 8 + 1, 14, 7); dot(g, "rgba(255,190,150,.14)", row & 1 ? 24 : 16, ((row + 2) & 3) * 8 + 1, 7, 7);
      if (g.h(6) < 0.1) { circle(g, "#3f7a3a", 7, 20, 4); circle(g, "#4f9446", 12, 24, 3.2); circle(g, "#3f7a3a", 6, 26, 2.6); }
    },
    crate(g) {
      if (g.h(4) < 0.5) { // cerca baixa de ripas
        const w = pick(["#b8a888", "#a89878", "#c4b494"], g.h(5));
        dot(g, "rgba(0,0,0,.25)", 3, 24, 27, 6);
        dot(g, "#6b5a40", 3, 12, 26, 3); dot(g, "#6b5a40", 3, 21, 26, 3);
        for (let i = 0; i < 5; i++) { dot(g, w, 3 + i * 5.6, 6, 4, 22); dot(g, "#ded2b4", 3 + i * 5.6, 6, 4, 2); }
      } else { // antena de TV no tripé
        dot(g, "rgba(0,0,0,.25)", 7, 25, 20, 5);
        dot(g, "#8d8478", 10, 22, 12, 7); dot(g, "#a89e90", 10, 22, 12, 2);
        dot(g, "#d5dae0", 15, 5, 2, 18);
        g.ctx.fillStyle = "#d5dae0";
        for (const [bx, by, bw] of [[5, 7, 22], [7, 11, 18], [9, 15, 14], [11, 19, 10]]) g.rect(g.x + bx, g.y + by, bw, 1.5);
        dot(g, "#8c939c", 15, 5, 1, 18);
      }
    },
    high(g) {
      telhados.base(g); halo(g);
      if (g.h(1) < 0.6) { // chaminé de tijolo com tampa de concreto
        longShadow(g, 5, 3, 21, 26);
        dot(g, "#5a2f28", 5, 3, 21, 26); dot(g, "#cbbfae", 4, 2, 23, 11); dot(g, "#e6dccb", 4, 2, 23, 2); dot(g, "#1d1614", 9, 5, 14, 6); dot(g, "#3a2c28", 9, 5, 14, 1.5);
        dot(g, "#9a4a3b", 5, 13, 21, 15);
        dot(g, "#c9b79b", 5, 18, 21, 1); dot(g, "#c9b79b", 5, 23, 21, 1); dot(g, "#c9b79b", 15, 13, 1, 5); dot(g, "#c9b79b", 10, 19, 1, 4); dot(g, "#c9b79b", 20, 19, 1, 4); dot(g, "#c9b79b", 15, 24, 1, 4);
        dot(g, "rgba(0,0,0,.25)", 22, 13, 4, 15);
        circle(g, "rgba(235,235,245,.5)", 16 + Math.sin((g.time || 0) * 0.8) * 1.5, 6, 3.4);
      } else { // muro alto: tampa clara em cima e tijolos na frente
        longShadow(g, 3, 3, 25, 26);
        dot(g, "#3d1f1b", 3, 3, 25, 26); dot(g, "#d8cbb4", 3, 3, 25, 10); topLight(g, 3, 3, 25, 10, "#f2e9d8"); dot(g, "#b5a78f", 3, 12, 25, 1);
        dot(g, "#8e4d3e", 4, 13, 23, 14);
        dot(g, "#c9b79b", 4, 18, 23, 1); dot(g, "#c9b79b", 4, 23, 23, 1); dot(g, "#c9b79b", 11, 13, 1, 5); dot(g, "#c9b79b", 21, 13, 1, 5); dot(g, "#c9b79b", 16, 19, 1, 4); dot(g, "#c9b79b", 8, 24, 1, 3); dot(g, "#c9b79b", 24, 24, 1, 3);
        circle(g, "#3f7a3a", 8, 24, 3.4); circle(g, "#4f9446", 13, 26, 2.6); dot(g, "rgba(0,0,0,.22)", 24, 13, 4, 14);
      }
    },
    water(g) {
      pool(g, telhados.base, { wet: "rgba(35,18,14,.45)", body: "#6f93bb", deep: "#4f739b", rip: "255,255,255", extra: (g2, cx, cy) => { dot(g2, "rgba(240,160,90,.6)", cx - 6, cy + 3, 10, 2); } });
    },
  };

  // 6. Beco da cidade: asfalto e lajes de pedra azul-acinzentados, fachadas de prédios com janelas e pichação sutil, lixeiras, escada de incêndio e caçamba
  const FACADES = [["#a98f6a", "#cdb48c", "#6a583b", "#8a7352"], ["#a8766f", "#cf9a92", "#6a4440", "#8a5c57"], ["#7f9086", "#a4b8ac", "#46544c", "#617268"], ["#8d8aa3", "#b3b0c9", "#524f66", "#6e6b84"]];
  const GLASS = ["#26344b", "#26344b", "#2c3d58", "#f2d36b", "#7fb2e0"];
  const beco = {
    place: "Beco da cidade", blurb: "o beco da cidade: asfalto, prédios com janelas, lixeiras e escadas de incêndio",
    mover: { wall: ["#2fa59a", "#66d1c6", "#12504a"], door: ["#c24a8a", "#ee86bb", "#5a1738"] },
    rail: ["#4a4038", "#15120f"],
    base(g) { checker(g, "#5c616d", "#575c68"); },
    floor(g) {
      const h = g.h(1);
      beco.base(g);
      if (h > 0.68) { // laje de pedra
        dot(g, "#6a6f7b", 1, 1, 30, 30); dot(g, "#4a4e59", 15, 0, 1, T); dot(g, "#4a4e59", 0, 15, T, 1); dot(g, "rgba(255,255,255,.07)", 3, 3, 10, 10);
        if (g.h(2) < 0.4) dot(g, "#3f434d", 6 + ((g.h(3) * 14) | 0), 19 + ((g.h(4) * 8) | 0), 6, 1);
      } else {
        g.ctx.fillStyle = "#767b87"; for (let i = 0; i < 3; i++) g.rect(g.x + 2 + g.h(5 + i) * 27, g.y + 2 + g.h(8 + i) * 27, 1.5, 1.5);
        g.ctx.fillStyle = "#4b4f5a"; for (let i = 0; i < 3; i++) g.rect(g.x + 2 + g.h(11 + i) * 27, g.y + 2 + g.h(14 + i) * 27, 2, 1.5);
        if (h < 0.1) { dot(g, "#3f434d", 6, 8, 8, 1); dot(g, "#3f434d", 13, 9, 6, 1); dot(g, "#3f434d", 18, 10, 5, 1); dot(g, "#3f434d", 22, 11, 1, 6); } // rachadura
        else if (h > 0.6 && h < 0.64) dot(g, "rgba(150,170,200,.09)", 4, 6, 24, 14);
      }
      if (g.h(7) > 0.985) { circle(g, "#4a4e59", 16, 16, 11); circle(g, "#6a6e7a", 16, 16, 9.2); dot(g, "#3a3e48", 8, 15, 16, 2); dot(g, "#3a3e48", 15, 8, 2, 16); } // bueiro
      contact(g, "rgba(0,0,0,.22)");
    },
    wall(g) {
      const { c, r } = g, k = FACADES[(hv(c >> 2, r >> 2, 60) * FACADES.length) | 0], front = !g.solid(c, r + 1), t = g.h(3);
      block(g, k[0], k[1], k[2], k[3]);
      if (front) {
        if (t < 0.5) { // porta de enrolar
          dot(g, "#6b707a", 3, 6, 26, 21); g.ctx.fillStyle = "#4e535d"; for (let y = 10; y < 26; y += 4) g.rect(g.x + 3, g.y + y, 26, 1);
          dot(g, "#2a2d33", 14, 24, 4, 2);
        } else { // porta de madeira com lâmpada
          dot(g, "#3d2f2a", 9, 5, 14, 22); dot(g, "#5a463d", 11, 7, 10, 18); circle(g, "#d9b45a", 19, 17, 1.2); circle(g, "#f2d36b", 16, 3.5, 2);
        }
      } else {
        for (let i = 0; i < 2; i++) {
          const wx = 4 + i * 14;
          dot(g, k[2], wx - 1, 4, 12, 15); dot(g, pick(GLASS, g.h(10 + i)), wx, 5, 10, 13); dot(g, "rgba(255,255,255,.18)", wx, 5, 10, 2); dot(g, k[2], wx + 4.5, 5, 1, 13); dot(g, "#3a3f4a", wx - 1, 19, 12, 2);
        }
        if (g.h(7) < 0.08) { g.ctx.fillStyle = pick(["rgba(214,96,160,.6)", "rgba(80,200,190,.6)"], g.h(8)); g.rect(g.x + 4, g.y + 24, 6, 2); g.rect(g.x + 9, g.y + 22, 6, 2); g.rect(g.x + 14, g.y + 24, 6, 2); g.rect(g.x + 19, g.y + 22, 8, 2); } // pichação
        if (g.h(9) < 0.16) { dot(g, "#4a4f58", 27, 0, 3, T); dot(g, "#2f333a", 26, 8, 5, 2); dot(g, "#2f333a", 26, 22, 5, 2); } // cano de queda
      }
    },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // lixeira de rodinhas
        const k = pick([["#2f7d4a", "#4aa066", "#1d5a33"], ["#3a5f9a", "#5a83c0", "#27426e"], ["#6a6f78", "#8c929c", "#4a4e56"]], g.h(5));
        shadowBox(g);
        dot(g, k[2], 7, 8, 19, 19); dot(g, k[0], 7, 12, 19, 14); dot(g, k[1], 5, 6, 22, 7); dot(g, k[2], 5, 12, 22, 1); dot(g, "#1d1f24", 13, 8, 8, 2);
        dot(g, "rgba(255,255,255,.18)", 9, 15, 2, 9); circle(g, "#1d1f24", 10, 28, 2.2); circle(g, "#1d1f24", 23, 28, 2.2);
      } else if (v < 0.7) { // caixote de madeira
        shadowBox(g);
        dot(g, "#b98d55", 4, 6, 24, 22); dot(g, "#d7b57c", 4, 6, 24, 3);
        g.ctx.fillStyle = "#8a6232"; g.rect(g.x + 4, g.y + 13, 24, 2); g.rect(g.x + 4, g.y + 20, 24, 2); g.rect(g.x + 4, g.y + 26, 24, 2);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 5, g.y + 27); g.ctx.lineTo(g.x + 27, g.y + 8); stroke(g, "#9a7340", 2);
      } else { // sacos de lixo
        shadowDisc(g, 12);
        circle(g, "#23262b", 11, 20, 7.5); circle(g, "#3a3e46", 9.5, 18, 3); circle(g, "#23262b", 22, 19, 7); circle(g, "#3a3e46", 20.5, 17, 2.6);
        circle(g, "#e6e9ee", 16, 12, 6.8); circle(g, "#ffffff", 14.5, 10.5, 2.6); dot(g, "#b9bec7", 15, 4.5, 2, 3);
      }
    },
    high(g) {
      beco.base(g); halo(g);
      if (g.h(1) < 0.5) { // escada de incêndio de ferro
        longShadow(g, 3, 3, 25, 25);
        dot(g, "#1b1e24", 3, 3, 25, 25); dot(g, "#343a45", 5, 5, 21, 21);
        g.ctx.fillStyle = "#59616f"; for (let y = 8; y < 24; y += 3.5) g.rect(g.x + 5, g.y + y, 21, 1);
        dot(g, "#0e1013", 17, 14, 8, 11); g.ctx.fillStyle = "#aab3c2"; for (let y = 15; y < 25; y += 3) g.rect(g.x + 17, g.y + y, 8, 1.5);
        topLight(g, 3, 3, 25, 25, "#9aa4b6"); dot(g, "#9aa4b6", 3, 26, 25, 2);
      } else { // caçamba azul
        longShadow(g, 3, 4, 26, 25);
        dot(g, "#1f3a5e", 3, 4, 26, 25); dot(g, "#26211d", 5, 5, 22, 10); circle(g, "#5a5048", 10, 11, 3.6); circle(g, "#8a6a4a", 17, 10, 3.2); circle(g, "#3b3f46", 23, 11, 3.2); circle(g, "#d9d2c0", 14, 8.5, 1.8);
        dot(g, "#2f5f93", 3, 15, 26, 14); dot(g, "#244a73", 3, 19, 26, 1.5); dot(g, "#244a73", 3, 24, 26, 1.5); dot(g, "#5b8fc9", 3, 15, 26, 1.5);
        dot(g, "#e8c030", 5, 26, 6, 2); dot(g, "#e8c030", 21, 26, 6, 2); topLight(g, 3, 4, 26, 11, "#6fa0d8"); dot(g, "rgba(0,0,0,.22)", 25, 15, 4, 14);
      }
    },
    water(g) {
      pool(g, beco.base, { wet: "rgba(8,10,18,.5)", body: "#5f8fb8", deep: "#436e96", rip: "215,235,255", extra: (g2, cx, cy) => { dot(g2, "rgba(255,111,165,.75)", cx + 1, cy + 4, 8, 2); dot(g2, "rgba(111,214,255,.7)", cx - 8, cy + 1, 6, 2); } });
    },
  };

  // 7. Feira livre: paralelepípedo cinza-quente com restos de fruta, barracas de toldos listrados e franjados, caixotes de frutas e uma pilha alta
  const AWN = [["#d6453d", "#fbf3e4", "#8e2a25"], ["#2e8f8a", "#fbf3e4", "#17504d"], ["#e59a2b", "#fbf3e4", "#8f5a12"], ["#7a4fb0", "#f4eefb", "#432a6a"], ["#3d78c4", "#fbf3e4", "#1f467a"], ["#5aa045", "#fbf3e4", "#2f5f22"]];
  const feira = {
    place: "Feira livre", blurb: "a feira livre: paralelepípedo, barracas de toldos coloridos e caixotes de frutas",
    mover: { wall: ["#4455c8", "#7887f0", "#1c2578"], door: ["#2aa08a", "#5cd2bc", "#0e4a3f"] },
    rail: ["#3a342c", "#100e0b"],
    base(g) { checker(g, "#625c55", "#5d5750"); },
    floor(g) {
      feira.base(g);
      g.ctx.fillStyle = "#37332f"; g.rect(g.x, g.y + 7, T, 1); g.rect(g.x, g.y + 15, T, 1); g.rect(g.x, g.y + 23, T, 1); g.rect(g.x, g.y + 31, T, 1);
      const o = (g.h(1) * 6) | 0;
      g.rect(g.x + 6 + o, g.y, 1, 7); g.rect(g.x + 20 - o, g.y + 8, 1, 7); g.rect(g.x + 12 + o, g.y + 16, 1, 7); g.rect(g.x + 4 + o, g.y + 24, 1, 7); g.rect(g.x + 24 - o, g.y + 24, 1, 7);
      dot(g, "rgba(255,255,255,.1)", 8 + ((g.h(2) * 14) | 0), 1 + 8 * ((g.h(3) * 4) | 0), 9, 5); dot(g, "rgba(255,255,255,.07)", 2 + ((g.h(12) * 14) | 0), 1 + 8 * ((g.h(13) * 4) | 0), 8, 5);
      const h = g.h(4);
      if (h > 0.93) { circle(g, "#b8332b", 11 + g.h(5) * 10, 11 + g.h(6) * 10, 2.4); dot(g, "#4f8a3a", 14 + g.h(5) * 10, 10 + g.h(6) * 10, 3, 2); } // resto de tomate
      else if (h > 0.87) { dot(g, "#d9c07a", 6 + g.h(7) * 14, 9 + g.h(8) * 12, 6, 1); dot(g, "#c7ae62", 9 + g.h(7) * 14, 12 + g.h(8) * 12, 5, 1); } // palha
      else if (h < 0.06) { dot(g, "#6f8a45", 3 + g.h(9) * 20, 7, 4, 1.5); } // musgo na junta
      contact(g);
    },
    wall(g) {
      const { c, r } = g, aw = AWN[(hv(c >> 1, r >> 1, 70) * AWN.length) | 0], front = !g.solid(c, r + 1);
      block(g, aw[1], aw[1], aw[2], aw[2]);
      g.ctx.fillStyle = aw[0]; for (let i = 0; i < T; i += 16) g.rect(g.x + i, g.y, 8, T);
      dot(g, "rgba(0,0,0,.1)", 15, 4, 1, T - 8); dot(g, "rgba(255,255,255,.18)", 0, 0, T, 2);
      if (front) { for (let i = 0; i < 4; i++) circle(g, i & 1 ? aw[1] : aw[0], 4 + i * 8, 22, 4); dot(g, aw[2], 0, 24, T, 2); dot(g, "rgba(0,0,0,.18)", 0, 26, T, 2); }
      if (!g.solid(c - 1, r)) dot(g, "#6b4a2a", 0, 0, 3, T);
      if (!g.solid(c + 1, r)) dot(g, "#6b4a2a", T - 3, 0, 3, T);
    },
    crate(g) {
      const v = g.h(4), pr = v < 0.4 ? ["#f08a24", "#f6a845"] : v < 0.7 ? ["#4f9a3a", "#8fd46a"] : ["#2d6a34", "#7fcf8a"];
      shadowBox(g);
      dot(g, "#b4824a", 4, 15, 24, 13); dot(g, "#d1a063", 4, 15, 24, 2); dot(g, "#6e4a24", 4, 20, 24, 1.5); dot(g, "#6e4a24", 4, 25, 24, 1.5); dot(g, "#f5f0e2", 20, 21, 6, 3);
      if (v < 0.7) { for (const [dx, dy] of [[8, 11], [16, 11], [24, 11], [12, 6.5], [20, 6.5]]) { circle(g, pr[0], dx, dy, 4); circle(g, pr[1], dx - 1.2, dy - 1.2, 1.5); } }
      else { circle(g, pr[0], 11, 9, 6.5); circle(g, pr[1], 9, 7, 2); circle(g, pr[0], 22, 9, 6.5); circle(g, pr[1], 20, 7, 2); dot(g, "#1f4a26", 8, 9, 6, 1); dot(g, "#1f4a26", 19, 9, 6, 1); }
    },
    high(g) { // pilha alta de caixotes (de madeira e de plástico)
      feira.base(g); halo(g);
      const cols = g.h(1) < 0.5 ? [["#b4824a", "#6e4a24"], ["#c6945a", "#6e4a24"], ["#b4824a", "#6e4a24"]] : [["#3f7fc0", "#1f4a7a"], ["#b4824a", "#6e4a24"], ["#4aa055", "#256a30"]];
      longShadow(g, 3, 2, 25, 27);
      dot(g, "#4a3018", 3, 2, 25, 27); dot(g, "#e0b87c", 3, 2, 25, 7); topLight(g, 3, 2, 25, 7, "#f6dcaa");
      circle(g, "#f08a24", 10, 6, 2.4); circle(g, "#f08a24", 16, 5.6, 2.4); circle(g, "#d6453d", 22, 6, 2.4);
      for (let i = 0; i < 3; i++) { const y = 10 + i * 6.5; dot(g, cols[i][0], 4, y, 23, 5.5); dot(g, cols[i][1], 4, y + 2.4, 23, 1); dot(g, "#f5f0e2", 20, y + 1, 5, 3); }
      dot(g, "rgba(0,0,0,.25)", 24, 10, 4, 19);
    },
    water(g) {
      pool(g, feira.base, { wet: "rgba(30,26,22,.42)", body: "#8fd6de", deep: "#55adbe", rip: "255,255,255", extra: (g2, cx, cy) => { circle(g2, "rgba(255,255,255,.8)", cx + 5, cy + 3, 2); circle(g2, "rgba(255,255,255,.8)", cx - 6, cy - 2, 1.5); circle(g2, "rgba(255,255,255,.8)", cx + 1, cy - 6, 1.2); } });
    },
  };

  // 8. Peixaria e mercado: azulejo branco e azul de 16 px, balcões refrigerados de aço e vidro com gelo e peixes, caixas de gelo, estante alta de latas, piso molhado
  const FISH = [["#b9c4cf", "#dde5eb"], ["#f08d72", "#f9bba8"], ["#6f8fb0", "#a7bfd6"]];
  function fish(g, x, y, k) { // peixe de lado: corpo em losango, cauda e olho
    polygon(g, k[0], [x, y + 3, x + 5, y, x + 11, y + 3, x + 5, y + 6]); polygon(g, k[0], [x + 10, y + 3, x + 14, y, x + 14, y + 6]);
    dot(g, k[1], x + 4, y + 4, 5, 1.5); dot(g, "#1a1a1a", x + 2, y + 2, 1.2, 1.2);
  }
  const CANS = ["#d94f3f", "#3c7dc4", "#f0c64a", "#4aa365", "#f4f4ee", "#e8833a"];
  const peixaria = {
    place: "Peixaria e mercado", blurb: "a peixaria e o mercado: azulejo branco e azul, balcões refrigerados e piso molhado",
    mover: { wall: ["#d9632f", "#f19662", "#6e2a0e"], door: ["#7a4fb0", "#a584d8", "#34205a"] },
    rail: ["#3b3a38", "#121212"],
    base(g) { dot(g, "#cfdde6", 0, 0, T, T); dot(g, "#5f8fb4", 0, 0, 16, 16); dot(g, "#5f8fb4", 16, 16, 16, 16); },
    floor(g) {
      peixaria.base(g);
      dot(g, "#9db4c4", 15, 0, 1, T); dot(g, "#9db4c4", 0, 15, T, 1);
      dot(g, "rgba(255,255,255,.22)", 2, 2, 8, 2); dot(g, "rgba(255,255,255,.22)", 18, 18, 8, 2);
      if (g.h(1) > 0.7) { dot(g, "#e8f3fa", 18 + ((g.h(2) * 8) | 0), 4 + ((g.h(3) * 8) | 0), 2, 2); dot(g, "#e8f3fa", 4 + ((g.h(4) * 8) | 0), 20 + ((g.h(5) * 8) | 0), 2, 2); } // escamas
      if (g.h(6) > 0.975) { circle(g, "#8da2b2", 16, 16, 7); circle(g, "#5d6e7c", 16, 16, 5.2); dot(g, "#8da2b2", 11, 15, 10, 1.5); dot(g, "#8da2b2", 15, 11, 1.5, 10); } // ralo
      contact(g, "rgba(10,30,50,.2)");
    },
    wall(g) {
      const { c, r } = g, front = !g.solid(c, r + 1), t = g.h(3);
      if (front) { // vitrine refrigerada: vidro com gelo e peixes
        block(g, "#5b6b79", "#e7f0f5", "#2f3b46", "#46535f");
        dot(g, "#cfeaf5", 3, 5, 26, 14); dot(g, "#f2fafd", 3, 5, 26, 3);
        dot(g, "#ffffff", 3, 14, 8, 5); dot(g, "#e1f2fa", 12, 15, 9, 4); dot(g, "#ffffff", 22, 14, 7, 5);
        fish(g, 5, 9, pick(FISH, g.h(10))); fish(g, 15, 10, pick(FISH, g.h(11)));
        g.ctx.fillStyle = "#6f8394"; for (let y = 22; y < 27; y += 2) g.rect(g.x + 6, g.y + y, 20, 1);
        dot(g, "#f6f0d0", 24, 20, 5, 3);
      } else { // tampo de aço
        block(g, "#66798a", "#d4e1ea", "#33414d", "#4d5c69");
        dot(g, "#52626f", 15, 4, 1, T - 8); dot(g, "#52626f", 3, 15, 26, 1); dot(g, "rgba(255,255,255,.12)", 3, 4, 12, 2);
        if (t < 0.15) { circle(g, "#7f909e", 16, 18, 7); dot(g, "#e8f0f4", 8, 8, 16, 3); dot(g, "#2d3943", 14, 9, 4, 1); } // balança
        else if (t < 0.3) { dot(g, "#3f7fc0", 7, 7, 18, 18); dot(g, "#6aa0d6", 7, 7, 18, 3); dot(g, "#dff3fb", 10, 12, 12, 10); }  // balde de gelo
        else if (t < 0.4) { dot(g, "#e8dcc0", 5, 7, 22, 17); fish(g, 8, 12, pick(FISH, g.h(12))); dot(g, "#c9ced4", 5, 21, 10, 1.5); }
      }
    },
    crate(g) {
      const v = g.h(4);
      shadowBox(g);
      if (v < 0.55) { // caixa de isopor com gelo e peixes
        dot(g, "#e6ecf0", 4, 7, 24, 21); dot(g, "#c3ccd3", 4, 24, 24, 4); dot(g, "#ffffff", 4, 7, 24, 3); dot(g, "#9fb0bc", 4, 11, 24, 1);
        dot(g, "#cfeaf5", 7, 13, 18, 9); g.ctx.fillStyle = "#ffffff"; for (const [ix, iy] of [[8, 14], [14, 15], [20, 14], [10, 19], [17, 19], [22, 19]]) g.rect(g.x + ix, g.y + iy, 4, 3);
        polygon(g, "#b9c4cf", [10, 14, 4, 11, 4, 17]); polygon(g, "#f08d72", [22, 15, 28, 12, 28, 18]);
      } else { // caixa azul com gelo e camarões
        dot(g, "#3f7fc0", 4, 7, 24, 21); dot(g, "#6aa0d6", 4, 7, 24, 3); dot(g, "#27578a", 4, 24, 24, 4); dot(g, "#f5f0e2", 20, 24, 6, 3);
        dot(g, "#dff3fb", 7, 12, 18, 11); g.ctx.fillStyle = "#bfe3f1"; g.rect(g.x + 8, g.y + 13, 5, 4); g.rect(g.x + 16, g.y + 14, 6, 4); g.rect(g.x + 11, g.y + 18, 6, 3);
        circle(g, "#f08d72", 12, 17, 2.2); circle(g, "#f08d72", 20, 19, 2.2); circle(g, "#f9bba8", 11.4, 16.4, 0.8);
      }
    },
    high(g) { // estante de metal alta, cheia de latas
      peixaria.base(g); halo(g);
      longShadow(g, 3, 3, 25, 26);
      dot(g, "#4a5560", 3, 3, 25, 26); dot(g, "#c3ccd4", 3, 3, 25, 8); topLight(g, 3, 3, 25, 8, "#eef3f6");
      circle(g, "#d6dde3", 9, 6.5, 2.4); circle(g, "#d94f3f", 16, 6.5, 2.4); circle(g, "#d6dde3", 22, 6.5, 2.4);
      dot(g, "#232a31", 5, 12, 21, 15);
      for (let row = 0; row < 2; row++) {
        const by = 13 + row * 7;
        dot(g, "#d6dde3", 6, by, 19, 1.5);
        for (let k = 0; k < 5; k++) dot(g, pick(CANS, g.h(10 + row * 5 + k)), 6 + k * 4, by + 1.5, 3.4, 4);
        dot(g, "#7b8793", 5, by + 6, 21, 1);
      }
      dot(g, "rgba(0,0,0,.26)", 24, 12, 4, 17);
    },
    water(g) { // piso molhado em faixas, com brilho
      peixaria.base(g);
      const t = g.time || 0;
      dot(g, "#5ec4e0", 0, 0, T, T);
      dot(g, "#9fe0f2", 0, 3, T, 6); dot(g, "#9fe0f2", 0, 13, T, 6); dot(g, "#9fe0f2", 0, 23, T, 6);
      dot(g, "rgba(40,120,160,.35)", 15, 0, 1, T); dot(g, "rgba(40,120,160,.35)", 0, 15, T, 1);
      const L = kindAt(g, -1, 0) !== "~", R = kindAt(g, 1, 0) !== "~", U = kindAt(g, 0, -1) !== "~", D = kindAt(g, 0, 1) !== "~";
      if (U) dot(g, "#2f8fb5", 0, 0, T, 2); if (D) dot(g, "#2f8fb5", 0, T - 2, T, 2); if (L) dot(g, "#2f8fb5", 0, 0, 2, T); if (R) dot(g, "#2f8fb5", T - 2, 0, 2, T);
      const s = Math.sin(t * 1.2 + g.c) * 2;
      dot(g, "rgba(255,255,255,.75)", 5 + s, 5, 10, 2); dot(g, "rgba(255,255,255,.6)", 16 - s, 15, 11, 2); dot(g, "rgba(255,255,255,.7)", 7 + s, 25, 9, 2);
    },
  };

  // 9. Parque e lago: gramado verde-azulado com trilhas de cascalho, arbustos e o lago de água funda com margens, bancos e troncos, árvores grandes e pinheiros
  const trail9 = (c, r) => (r + 36) % 9 < 2 || (c + 39) % 13 < 2;
  // O jogo passa g.mass(c, r) = quantos tiles tem a mancha de paredes (`#` ligadas) daquele tile (sem o anel de fora do mapa): a mancha enorme do meio do mapa é o LAGO (inteiro, sem retalhos);
  // as outras são arbustos. Sem g.mass (a prévia e os testes de Node) vale o sorteio por regiões de 5 x 5 tiles.
  const LAKE_MIN = 200;
  const lakeAt = (g, c, r) => g.solid(c, r) && (g.mass ? g.mass(c, r) >= LAKE_MIN : hv(Math.floor(c / 5), Math.floor(r / 5), 80) < 0.5);
  const parque = {
    place: "Parque e lago", blurb: "o parque e o lago: trilhas, arbustos, bancos e árvores grandes",
    mover: { wall: ["#c0623a", "#e8946a", "#6a2e14"], door: ["#a04bb0", "#cf86dc", "#4a1a52"] },
    rail: ["#5a4a36", "#17110a"],
    base(g) { checker(g, "#4f9a62", "#4b945c"); },
    floor(g) {
      const { c, r } = g;
      if (trail9(c, r)) { // trilha de cascalho com bordas de terra
        dot(g, "#d9cba5", 0, 0, T, T);
        dot(g, "#bfb08a", 4 + ((g.h(2) * 20) | 0), 5 + ((g.h(3) * 20) | 0), 3, 2); dot(g, "#bfb08a", 4 + ((g.h(4) * 20) | 0), 5 + ((g.h(5) * 20) | 0), 2, 2); dot(g, "#efe4c4", 3 + ((g.h(6) * 22) | 0), 4 + ((g.h(7) * 22) | 0), 2, 2);
        if (!trail9(c, r - 1)) { dot(g, "#8f7f5a", 0, 0, T, 3); dot(g, "#a69a6e", 0, 3, T, 1); }
        if (!trail9(c, r + 1)) { dot(g, "#8f7f5a", 0, T - 3, T, 3); dot(g, "#a69a6e", 0, T - 4, T, 1); }
        if (!trail9(c - 1, r)) { dot(g, "#8f7f5a", 0, 0, 3, T); dot(g, "#a69a6e", 3, 0, 1, T); }
        if (!trail9(c + 1, r)) { dot(g, "#8f7f5a", T - 3, 0, 3, T); dot(g, "#a69a6e", T - 4, 0, 1, T); }
      } else {
        parque.base(g);
        const h = g.h(1);
        if (h < 0.5) for (let i = 0; i < 3; i++) { const px = 3 + ((g.h(2 + i) * 24) | 0), py = 4 + ((g.h(5 + i) * 22) | 0); dot(g, "#3a7d4c", px, py, 1.5, 4); dot(g, "#3a7d4c", px + 3, py + 1, 1.5, 3); }
        else if (h > 0.9) { const px = 6 + ((g.h(9) * 18) | 0), py = 6 + ((g.h(10) * 18) | 0); dot(g, pick(["#f6f3e8", "#f2c230", "#f08ac0"], g.h(11)), px, py, 3, 3); dot(g, "#3a7d4c", px + 1, py + 3, 1, 3); }
        contact(g, "rgba(10,40,30,.2)");
      }
    },
    wall(g) {
      const { c, r } = g;
      if (!g.border && lakeAt(g, c, r)) { // lago: água funda com margem rasa e espuma onde encosta na terra
        const t = g.time || 0, s = Math.sin(t * 0.9 + c) * 2;
        dot(g, (c + r) & 1 ? "#1d5a80" : "#1f5f86", 0, 0, T, T);
        dot(g, "#3f8fb5", 3 + s + 4, 7, 9, 1.5); dot(g, "#3f8fb5", 16 - s, 15, 10, 1.5); dot(g, "#3f8fb5", 5 + s, 24, 8, 1.5); dot(g, "#8fcfe6", 20 - s, 10, 3, 1); dot(g, "#8fcfe6", 9 + s, 20, 3, 1);
        if (!lakeAt(g, c, r - 1)) { dot(g, "#4aa0c0", 0, 0, T, 5); dot(g, "#cfeaf3", 0, 0, T, 2); }
        if (!lakeAt(g, c, r + 1)) { dot(g, "#4aa0c0", 0, T - 5, T, 5); dot(g, "#cfeaf3", 0, T - 2, T, 2); }
        if (!lakeAt(g, c - 1, r)) { dot(g, "#4aa0c0", 0, 0, 5, T); dot(g, "#cfeaf3", 0, 0, 2, T); }
        if (!lakeAt(g, c + 1, r)) { dot(g, "#4aa0c0", T - 5, 0, 5, T); dot(g, "#cfeaf3", T - 2, 0, 2, T); }
        if (g.h(6) < 0.09 && lakeAt(g, c - 1, r) && lakeAt(g, c + 1, r) && lakeAt(g, c, r - 1) && lakeAt(g, c, r + 1)) { const px = 10 + ((g.h(7) * 12) | 0), py = 10 + ((g.h(8) * 12) | 0); circle(g, "#3f8f4a", px, py, 4.4); circle(g, "#58ad5f", px - 1, py - 1, 2.2); if (g.h(9) < 0.4) circle(g, "#f0b4c8", px + 1.5, py + 1, 1.3); } // vitória-régia
        return;
      }
      block(g, "#2d6a34", "#3d8742", "#1f4a25", "#245a2b"); // arbusto
      for (let i = 0; i < 4; i++) circle(g, i & 1 ? "#3e8a45" : "#357a3c", 8 + g.h(1 + i) * 16, 8 + g.h(5 + i) * 16, 5 + g.h(9 + i) * 2.5);
      circle(g, "#5aad5c", 8 + g.h(14) * 14, 9 + g.h(15) * 12, 2.4); circle(g, "#5aad5c", 12 + g.h(16) * 14, 12 + g.h(17) * 10, 2);
      if (g.h(18) < 0.1) { dot(g, "#d9483b", 10, 12, 3, 3); dot(g, "#d9483b", 20, 19, 3, 3); dot(g, "#d9483b", 22, 9, 3, 3); }
    },
    crate(g) {
      if (g.h(4) < 0.5) { // banco de parque pintado de verde
        shadowBox(g);
        dot(g, "#3a3f46", 5, 17, 3, 11); dot(g, "#3a3f46", 24, 17, 3, 11);
        dot(g, "#4f7f45", 4, 5, 24, 4); dot(g, "#6aa05a", 4, 5, 24, 1.5); dot(g, "#4f7f45", 4, 10, 24, 4); dot(g, "#6aa05a", 4, 10, 24, 1.5);
        dot(g, "#3a6a35", 4, 16, 24, 4); dot(g, "#7cb56a", 4, 16, 24, 1.5); dot(g, "#3a6a35", 4, 21, 24, 4); dot(g, "#7cb56a", 4, 21, 24, 1.5);
      } else { // pilha de troncos vistos de ponta
        shadowDisc(g, 13);
        for (const [cx, cy] of [[9.5, 21.5], [22.5, 21.5], [16, 11.5]]) { circle(g, "#6a4526", cx, cy, 6.6); circle(g, "#d6ab70", cx, cy, 5.4); circle(g, "#c39555", cx, cy, 3.3); circle(g, "#a5763f", cx, cy, 1.1); }
      }
    },
    high(g) {
      parque.base(g); halo(g);
      if (g.h(1) < 0.6) { // árvore grande, de copa larga e escura
        treeShadow(g, 16, 14, 13);
        dot(g, "#5a3d22", 13, 22, 6, 9); dot(g, "#3f2a16", 13, 22, 2, 9); dot(g, "#5a3d22", 10, 28, 4, 3); dot(g, "#5a3d22", 18, 28, 4, 3);
        circle(g, "#1f5a2e", 16, 14, 13); circle(g, "#2f7d3c", 15, 12, 11); circle(g, "#4aa050", 12, 9, 7.2);
        circle(g, "#7cc77a", 9, 8, 2.2); circle(g, "#7cc77a", 17, 6, 1.8); circle(g, "#7cc77a", 20, 14, 1.6);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,220,.5)", 1.6);
      } else { // pinheiro em camadas
        longShadow(g, 4, 3, 24, 26);
        dot(g, "#5a3d22", 14, 26, 4, 5);
        polygon(g, "#1d5a3a", [16, 12, 29, 27, 3, 27]); polygon(g, "#27703f", [16, 7, 28, 21, 4, 21]); polygon(g, "#2f8148", [16, 2, 27, 15, 5, 15]);
        polygon(g, "rgba(150,230,170,.35)", [16, 2, 16, 15, 5, 15]); polygon(g, "rgba(150,230,170,.3)", [16, 7, 16, 21, 4, 21]); polygon(g, "rgba(150,230,170,.25)", [16, 12, 16, 27, 3, 27]);
      }
    },
    water(g) { // margem rasa: água turquesa com a areia aparecendo, areia molhada onde encosta na terra
      const { c, r } = g, t = g.time || 0, s = Math.sin(t * 1.1 + c) * 2;
      dot(g, "#6cc3c9", 0, 0, T, T);
      circle(g, "rgba(214,199,154,.55)", 7 + g.h(1) * 4, 10 + g.h(2) * 6, 2); circle(g, "rgba(214,199,154,.55)", 20 + g.h(3) * 6, 18 + g.h(4) * 6, 2.4); circle(g, "rgba(214,199,154,.45)", 14, 24, 1.6);
      dot(g, "rgba(255,255,255,.55)", 5 + s, 8, 9, 1.5); dot(g, "rgba(255,255,255,.5)", 15 - s, 17, 10, 1.5); dot(g, "rgba(255,255,255,.45)", 7 + s, 26, 8, 1.5);
      const shore = (dc, dr) => { const k = kindAt(g, dc, dr); return k !== "~" && !lakeAt(g, c + dc, r + dr); };
      const deepSide = (dc, dr) => lakeAt(g, c + dc, r + dr);
      if (shore(0, -1)) { dot(g, "#e0d3a8", 0, 0, T, 3); dot(g, "#c9ba8a", 0, 3, T, 1); } else if (deepSide(0, -1)) dot(g, "#3f9fbd", 0, 0, T, 5);
      if (shore(0, 1)) { dot(g, "#e0d3a8", 0, T - 3, T, 3); dot(g, "#c9ba8a", 0, T - 4, T, 1); } else if (deepSide(0, 1)) dot(g, "#3f9fbd", 0, T - 5, T, 5);
      if (shore(-1, 0)) { dot(g, "#e0d3a8", 0, 0, 3, T); dot(g, "#c9ba8a", 3, 0, 1, T); } else if (deepSide(-1, 0)) dot(g, "#3f9fbd", 0, 0, 5, T);
      if (shore(1, 0)) { dot(g, "#e0d3a8", T - 3, 0, 3, T); dot(g, "#c9ba8a", T - 4, 0, 1, T); } else if (deepSide(1, 0)) dot(g, "#3f9fbd", T - 5, 0, 5, T);
    },
  };

  // 10. Armazém de grãos: concreto claro com grãos espalhados, paredes de tijolo aparente e prateleiras de aço com sacos, paletes, pilhas altas de sacos
  const SACKS = [["#d2b98a", "#e6d3a8", "#a88f62"], ["#d2b98a", "#e6d3a8", "#a88f62"], ["#ece6d4", "#fbf8ee", "#bdb6a0"], ["#c9ae7a", "#dcc48f", "#9a8052"]];
  const armazem = {
    place: "Armazém de grãos", blurb: "o armazém de grãos: concreto, tijolo aparente, prateleiras, paletes e pilhas de sacos",
    mover: { wall: ["#2f8f6a", "#5cc79d", "#124a36"], door: ["#c0463a", "#ee7a6c", "#5a1510"] },
    rail: ["#4a443a", "#12100c"],
    base(g) { checker(g, "#bdb5a3", "#b9b19f"); },
    floor(g) {
      armazem.base(g);
      if (g.r & 1) dot(g, "#9a9282", 0, T - 1, T, 1);
      if (g.c & 1) dot(g, "#9a9282", T - 1, 0, 1, T);
      const h = g.h(1);
      if (h < 0.1) { dot(g, "#8a8272", 5, 9, 7, 1); dot(g, "#8a8272", 11, 10, 6, 1); dot(g, "#8a8272", 16, 11, 1, 7); dot(g, "#8a8272", 16, 17, 7, 1); } // rachadura
      else if (h < 0.2) { circle(g, "rgba(60,50,40,.16)", 14, 17, 7); circle(g, "rgba(60,50,40,.12)", 20, 13, 5); } // mancha de óleo
      else if (h > 0.93) { dot(g, "rgba(50,45,40,.13)", 0, 8, T, 3); dot(g, "rgba(50,45,40,.13)", 0, 20, T, 3); } // marca de pneu
      g.ctx.fillStyle = "#dcc27a"; for (let i = 0; i < 3; i++) g.rect(g.x + 2 + g.h(5 + i) * 27, g.y + 2 + g.h(8 + i) * 27, 1.5, 1.5);
      dot(g, "#c7a95a", 3 + ((g.h(11) * 24) | 0), 3 + ((g.h(12) * 24) | 0), 2, 1.5);
      contact(g, "rgba(40,30,20,.2)");
    },
    wall(g) {
      const { c, r } = g, exposed = !g.solid(c, r - 1) || !g.solid(c, r + 1) || !g.solid(c - 1, r) || !g.solid(c + 1, r), t = g.h(3);
      if (exposed) { // tijolo aparente, argamassa escura
        block(g, "#b98a52", "#d9aa70", "#5a3a1e", "#7a5430");
        g.ctx.fillStyle = "#7a5430"; g.rect(g.x, g.y + 7, T, 1); g.rect(g.x, g.y + 15, T, 1); g.rect(g.x, g.y + 23, T, 1);
        g.rect(g.x + 9, g.y, 1, 7); g.rect(g.x + 19, g.y + 8, 1, 7); g.rect(g.x + 9, g.y + 16, 1, 7); g.rect(g.x + 19, g.y + 24, 1, 7); g.rect(g.x + 29, g.y, 1, 7); g.rect(g.x + 29, g.y + 16, 1, 7);
        dot(g, "rgba(0,0,0,.14)", ((g.h(2) * 3) | 0) * 10, ((g.h(4) * 4) | 0) * 8 + 1, 9, 6);
        if (!g.solid(c, r + 1) && t < 0.12) { dot(g, "#8a5a30", 3, 5, 26, 22); dot(g, "#5a3a1e", 3, 5, 26, 2); dot(g, "#5a3a1e", 15, 5, 2, 22); g.ctx.beginPath(); g.ctx.moveTo(g.x + 4, g.y + 6); g.ctx.lineTo(g.x + 28, g.y + 26); g.ctx.moveTo(g.x + 28, g.y + 6); g.ctx.lineTo(g.x + 4, g.y + 26); stroke(g, "#5a3a1e", 2); } // portão
      } else { // prateleira de aço vista de cima, com sacos
        dot(g, "#2d4a63", 0, 0, T, T);
        dot(g, "#d9702a", 0, 14, T, 3); dot(g, "#d9702a", 14, 0, 3, T);
        for (let i = 0; i < 4; i++) {
          const k = pick(SACKS, g.h(10 + i)), sx = (i & 1) * 17 + 1, sy = (i >> 1) * 17 + 1;
          dot(g, k[0], sx, sy, 13, 13); dot(g, k[1], sx, sy, 13, 3); dot(g, k[2], sx, sy + 11, 13, 2); dot(g, "#6a5836", sx + 5, sy + 5, 3, 2);
        }
      }
    },
    crate(g) {
      const v = g.h(4), k = pick(SACKS, g.h(5));
      shadowBox(g);
      if (v < 0.5) { // palete com dois sacos
        dot(g, "#9a7140", 3, 10, 26, 18); g.ctx.fillStyle = "#c19a62"; for (const y of [11, 17, 23]) g.rect(g.x + 3, g.y + y, 26, 4);
        dot(g, k[0], 5, 5, 13, 15); dot(g, k[1], 5, 5, 13, 3); dot(g, k[2], 5, 17, 13, 3); dot(g, "#6a5836", 10, 9, 3, 2);
        dot(g, SACKS[2][0], 16, 8, 12, 14); dot(g, SACKS[2][1], 16, 8, 12, 3); dot(g, SACKS[2][2], 16, 19, 12, 3); dot(g, "#6a5836", 21, 12, 3, 2);
      } else if (v < 0.8) { // palete vazio e um saco encostado
        dot(g, "#9a7140", 3, 7, 26, 21); g.ctx.fillStyle = "#c19a62"; for (const y of [8, 14, 20, 25]) g.rect(g.x + 3, g.y + y, 26, 3);
        dot(g, "#5e4326", 3, 7, 26, 1); dot(g, k[0], 14, 12, 13, 14); dot(g, k[1], 14, 12, 13, 3); dot(g, k[2], 14, 24, 13, 2); dot(g, "#6a5836", 19, 17, 3, 2);
      } else { // montinho de sacos
        dot(g, k[0], 3, 15, 13, 13); dot(g, k[1], 3, 15, 13, 3); dot(g, k[2], 3, 26, 13, 2);
        dot(g, SACKS[3][0], 16, 15, 13, 13); dot(g, SACKS[3][1], 16, 15, 13, 3); dot(g, SACKS[3][2], 16, 26, 13, 2);
        dot(g, SACKS[2][0], 9, 6, 14, 12); dot(g, SACKS[2][1], 9, 6, 14, 3); dot(g, SACKS[2][2], 9, 16, 14, 2); dot(g, "#6a5836", 15, 10, 3, 2);
      }
    },
    high(g) { // pilha alta de sacos em pirâmide
      armazem.base(g); halo(g);
      longShadow(g, 3, 3, 25, 26);
      dot(g, "#4a3a22", 3, 3, 25, 26);
      const sack = (x, y, w, h, k) => { dot(g, k[0], x, y, w, h); dot(g, k[1], x, y, w, 2.5); dot(g, k[2], x, y + h - 2, w, 2); };
      sack(4, 19, 7.5, 9, SACKS[0]); sack(12.5, 19, 7.5, 9, SACKS[3]); sack(21, 19, 6.5, 9, SACKS[0]);
      sack(7.5, 11, 8, 7, SACKS[3]); sack(16.5, 11, 8, 7, SACKS[0]);
      sack(12, 4, 8, 6, SACKS[2]);
      dot(g, "#6a5836", 15, 6, 3, 1.5);
    },
    water(g) {
      pool(g, armazem.base, { wet: "rgba(50,45,40,.38)", body: "#7aa7bd", deep: "#5a87a0", rip: "255,255,255", extra: (g2, cx, cy) => { dot(g2, "#d9c07a", cx + 5, cy + 5, 3, 1.5); dot(g2, "#d9c07a", cx - 7, cy - 3, 2, 1.5); } });
    },
  };

  // ==== FIM DOS TEMAS 6 A 10 ====

  CT.register(1, sala);
  CT.register(2, cozinha);
  CT.register(3, quintal);
  CT.register(4, jardim);
  CT.register(5, telhados);
  CT.register(6, beco);
  CT.register(7, feira);
  CT.register(8, peixaria);
  CT.register(9, parque);
  CT.register(10, armazem);
  if (typeof module === "object" && module.exports) module.exports = { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
})(typeof window !== "undefined" ? window : globalThis);
