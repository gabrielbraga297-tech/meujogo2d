// Ambientes das Fases 11 a 20 do Passarinho (0.20.0): 11 Fazenda e galinheiro, 12 Margem do rio, 13 Pântano e vitórias-régias, 14 Dunas e restinga, 15 Falésias e ninhos, 16 Vila de pescadores e redes,
// 17 Campos de altitude, 18 Entardecer nos telhados, 19 Noite na floresta, 20 O grande ninho. Cada um se registra com BirdThemes.register(id, tema) (núcleo em js/bird-themes.js; as Fases 1 a 10 ficam em
// js/bird-themes-1.js). Só desenho: formas simples (retângulos, círculos, polígonos e linhas), cores fixas, nada sorteado (tudo vem de g.h(k), então não pisca); g.time só mexe nas ondas do mar e do rio
// e nas fitas do vento (é 0 com "reduzir movimento"). O contrato (g, floor/wall/muro/crate/high/wind, 40 operações de pintura por tile) e as convenções (# alta e escura, M mais baixa com chão em volta,
// X baixo, G alto com brilho quente) estão nos cabeçalhos de js/bird-themes.js e js/bird-themes-1.js.
//   night (Fases 18 e 19): o jogo escurece em volta do passarinho; por isso esses dois ambientes são mais claros e saturados, com janelas e lanternas acesas, e trazem `halo` (a cor do halo em volta do passarinho).
//   dusk (Fase 18): o entardecer, em que a luz laranja do jogo vai escurecendo; o ambiente já é quente e claro.
(function (root) {
  "use strict";
  const BT = typeof module === "object" && module.exports ? require("./bird-themes.js") : root.BirdThemes;
  if (!BT) throw new Error("js/bird-themes.js precisa ser carregado antes de js/bird-themes-2.js");
  const { dot, circle, pick, block, checker, stroke, polygon, line, lines, contact, longShadow, treeShadow, halo, hedgeM, fenceM, stoneM, netM, twigM } = BT.helpers;
  // retângulos finos de uma cor só, num traço só (x, y, w, h em px do tile): bem mais barato que `lines` (riscar) quando são centenas por quadro
  const slabs = (g, col, arr) => { const c = g.ctx; c.fillStyle = col; c.beginPath(); for (let i = 0; i < arr.length; i += 4) { const x = g.x + arr[i], y = g.y + arr[i + 1], w = arr[i + 2], h = arr[i + 3]; c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); } c.fill(); };
  const T = 32, TAU = Math.PI * 2, hv = BT.hash;
  const all4 = (g) => g.solid(g.c - 1, g.r) && g.solid(g.c + 1, g.r) && g.solid(g.c, g.r - 1) && g.solid(g.c, g.r + 1);
  const soft = (g, x, y, w, h) => { const x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1); dot(g, "rgba(0,0,0,.10)", x0, y0, Math.min(T, x + w + 1) - x0, Math.min(T, y + h + 1) - y0); dot(g, "rgba(0,0,0,.17)", x, y, w, h); };
  const softDisc = (g, cx, cy, rad) => { const k = rad + 1.5, x = Math.min(T - k, Math.max(k, cx)), y = Math.min(T - k, Math.max(k, cy)); circle(g, "rgba(0,0,0,.10)", x, y, k); circle(g, "rgba(0,0,0,.17)", x, y, rad); };
  // mar ou rio em volta do mapa: água em faixas com espuma que se mexe devagar (parada com g.time = 0); `col` = [fundo, topo claro, espuma "r,g,b"]
  function sea(g, col, streak) {
    const t = g.time || 0, s = Math.sin(t * 1.2 + g.c * 0.9 + g.r * 0.7) * 2.5;
    dot(g, col[0], 0, 0, T, T); dot(g, col[1], 0, 0, T, 3); dot(g, col[1], 0, 15 + s * 0.5, T, 1.4);
    dot(g, "rgba(" + col[2] + ",.6)", 3 + s, 7, streak ? 18 : 10, 1.4); dot(g, "rgba(" + col[2] + ",.5)", 13 - s, 19, streak ? 15 : 12, 1.4); dot(g, "rgba(" + col[2] + ",.45)", 5 + s, 27, 9, 1.4);
  }
  // sombra e brilho do alto de um poste fino (mastro, antena, poste)
  const FEATHER = "#fff7e8";

  // ---------------------------------------------------------------------------------------------------------------------------------
  // 11. Fazenda e galinheiro: terra batida cor de tijolo com palha, penas e grãos, paredes de tábuas cinzentas do galinheiro, cercas brancas, cochos, cestos de ovos, cata-vento
  const fazenda = {
    place: "Fazenda e galinheiro", blurb: "a fazenda: terra batida com palha e penas, galinheiro de tábuas, cercas brancas, cochos e cata-vento",
    nest: { rim: "#7a5230", twig: "#c9a060", lining: "#f6e4a8" },
    mover: { wall: ["#3a8a6a", "#62b894", "#1a4a38"], door: ["#c4a03a", "#f0cc6a", "#6a540f"] }, rail: ["#5a4a38", "#16100a"],
    wind: { tint: "rgba(240,220,190,.16)", rgb: "255,244,222" },
    base(g) { checker(g, "#b98c6c", "#b48768"); },
    floor(g) {
      fazenda.base(g);
      if (g.c & 1) dot(g, "rgba(70,40,20,.1)", 0, 12 + ((g.r & 1) * 6), T, 5); // sulco de roda
      if (g.h(1) < 0.4) { g.ctx.strokeStyle = "#e6c85a"; g.ctx.lineWidth = 1.2; g.ctx.beginPath(); const x = 3 + g.h(2) * 18, y = 5 + g.h(3) * 20; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 8, g.y + y + 2); g.ctx.moveTo(g.x + x + 2, g.y + y + 4); g.ctx.lineTo(g.x + x + 9, g.y + y + 1); g.ctx.stroke(); }
      if (g.h(4) < 0.14) { dot(g, FEATHER, 6 + g.h(5) * 18, 6 + g.h(6) * 18, 3, 1.4); dot(g, "#ffffff", 7 + g.h(5) * 18, 5 + g.h(6) * 18, 1.4, 1); }
      if (g.h(7) < 0.2) { dot(g, "#e8c64a", 4 + g.h(8) * 22, 4 + g.h(9) * 22, 1.4, 1.4); dot(g, "#e8c64a", 9 + g.h(8) * 18, 10 + g.h(9) * 14, 1.4, 1.4); }
      contact(g);
    },
    wall(g) {
      block(g, "#9a8a78", "#c4b49e", "#5a4c3e", "#7a6a58");
      g.ctx.fillStyle = "#6e5f4e"; for (let x = 6; x < T; x += 8) g.rect(g.x + x, g.y + 4, 1.2, T - 8);
      if (!g.solid(g.c, g.r - 1)) { dot(g, "#b34a3a", 0, 0, T, 6); dot(g, "#8a3428", 0, 5, T, 1); dot(g, "#d9705a", 0, 0, T, 1.4); }
      else if (g.h(3) < 0.18) { dot(g, "#4e3f30", 8, 10, 16, 11); dot(g, "#d9b84a", 9, 16, 14, 4); dot(g, "#f0d878", 10, 17, 5, 2); } // ninho de galinha com palha
    },
    muro(g) { fenceM(g, fazenda.base, { wood: "#f4f0e6", light: "#ffffff", dark: "#9a9486", post: "#e6e0d0" }, "rail"); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // cocho de madeira com grãos
        soft(g, 3, 14, 27, 14);
        dot(g, "#5e3f22", 3, 12, 26, 14); dot(g, "#a67a46", 4, 13, 24, 9); dot(g, "#d9b84a", 5, 14, 22, 5); dot(g, "#f0d878", 7, 14, 6, 2); dot(g, "#7a5530", 3, 22, 26, 3); dot(g, "#e6c880", 4, 12, 24, 1.4);
      } else if (v < 0.75) { // cesto de ovos
        softDisc(g, 16, 22, 10);
        circle(g, "#7a5226", 16, 19, 10.4); circle(g, "#c4904c", 16, 18, 9); circle(g, "#a8763a", 16, 18, 6.4);
        for (const [ex, ey] of [[12, 16], [18, 15], [15, 20], [21, 20]]) { circle(g, "#fff4e0", ex, ey, 3); circle(g, "#ffffff", ex - 0.8, ey - 0.8, 1); }
      } else { // fardo de feno com o forcado
        soft(g, 4, 12, 24, 17);
        dot(g, "#a88a2a", 4, 11, 24, 17); dot(g, "#e6c64a", 5, 12, 22, 13); dot(g, "#f6dc72", 5, 12, 22, 3); dot(g, "#8a6a2a", 10, 12, 1.6, 13); dot(g, "#8a6a2a", 21, 12, 1.6, 13);
        dot(g, "#8a8f9c", 25, 2, 2, 17); dot(g, "#cfd6e4", 22, 2, 8, 1.6); dot(g, "#cfd6e4", 22, 2, 1.4, 5); dot(g, "#cfd6e4", 28.6, 2, 1.4, 5);
      }
    },
    high(g) {
      fazenda.base(g); halo(g);
      if (g.h(1) < 0.55) { // cata-vento no alto de um poste, com o galo de ferro
        longShadow(g, 5, 4, 22, 25);
        dot(g, "#6a4a2e", 14.4, 11, 3.2, 19); dot(g, "#4a3320", 14.4, 11, 1.2, 19); dot(g, "#6a4a2e", 11, 26, 10, 3);
        dot(g, "#3a3f4c", 15.6, 3, 1.2, 8); dot(g, "#3a3f4c", 6, 6, 20, 1.4); dot(g, "#cf4a3a", 4, 3, 5, 8); polygon(g, "#cf4a3a", [4, 7, 8, 3, 8, 11]); polygon(g, "#3a3f4c", [22, 4, 28, 6.6, 22, 9]); circle(g, "#f2c744", 16, 6.6, 2.6); dot(g, "#3a3f4c", 12, 2, 1.2, 3); dot(g, "#3a3f4c", 19.6, 2, 1.2, 3);
      } else { // árvore velha de copa irregular
        treeShadow(g, 16, 14, 13);
        dot(g, "#5a3d22", 13, 21, 6, 10); dot(g, "#3a2616", 13, 21, 2, 10);
        circle(g, "#3f6e2a", 16, 14, 13); circle(g, "#5a8f3a", 15, 12, 11); circle(g, "#8fc15a", 12, 9, 6.2); circle(g, "#3f6e2a", 6, 18, 5); circle(g, "#3f6e2a", 26, 18, 5); circle(g, "#d9b84a", 20, 8, 1.6);
      }
    },
  };

  // 12. Margem do rio: cascalho cinza-claro com seixos e poças, pedras azuladas na beira, salgueiros e o rio correndo em volta do mapa
  const rio = {
    place: "Margem do rio", blurb: "a margem do rio: cascalho e seixos, pedras molhadas, salgueiros, troncos na areia e o rio correndo em volta",
    nest: { rim: "#6e5238", twig: "#b89e66", lining: "#efe4b8" },
    mover: { wall: ["#c46a3a", "#e8946a", "#6a2e14"], door: ["#5a7ac4", "#8aa4e6", "#2a3a7a"] }, rail: ["#4a5a60", "#10181c"],
    wind: { tint: "rgba(220,240,255,.16)", rgb: "235,248,255" },
    base(g) { checker(g, "#c2bba8", "#bcb5a2"); },
    floor(g) {
      rio.base(g);
      for (let i = 0; i < 3; i++) if (g.h(1 + i) < 0.7) circle(g, i % 2 ? "#9aa4a8" : "#a89f88", 4 + g.h(4 + i) * 24, 4 + g.h(7 + i) * 24, 1.8 + g.h(10 + i) * 1.4);
      if (g.h(14) < 0.12) { dot(g, "#7fb4cc", 6 + g.h(15) * 10, 10 + g.h(16) * 10, 12, 6); dot(g, "#b4dcec", 8 + g.h(15) * 10, 11 + g.h(16) * 10, 6, 1.4); }
      if (g.h(17) < 0.18) dot(g, "#d9cfb0", 4 + g.h(18) * 20, 20 + g.h(19) * 8, 8, 2);
      contact(g);
    },
    wall(g) {
      if (g.border) { sea(g, ["#4a8fc0", "#6fb0dc", "255,255,255"], true); return; }
      block(g, "#7c8794", "#aab6c2", "#4a5560", "#626f7c");
      circle(g, "#8e99a6", 9 + g.h(2) * 6, 10 + g.h(3) * 6, 7.6); circle(g, "#a0abb8", 8 + g.h(2) * 6, 9 + g.h(3) * 6, 4.6); circle(g, "#6a7582", 22 - g.h(4) * 5, 21 - g.h(5) * 5, 6);
      circle(g, "#6f9a7a", 5 + g.h(6) * 20, 6 + g.h(7) * 20, 3); dot(g, "rgba(150,200,230,.4)", 3, 25, 26, 3);
    },
    muro(g) { hedgeM(g, rio.base, { dark: "#3a7a6a", mid: "#58a08a", light: "#8ccab0", dots: ["#ffe27a", "#ffffff"], dotP: 0.35 }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // pedra do rio
        softDisc(g, 16, 22, 10);
        circle(g, "#6a7682", 16, 19, 10); circle(g, "#8794a2", 15, 17.6, 8.6); circle(g, "#b4c0cc", 12, 14, 3.4); dot(g, "#7fb4cc", 6, 25, 20, 2.4);
      } else if (v < 0.75) { // tronco trazido pela correnteza
        soft(g, 3, 14, 27, 13);
        dot(g, "#8a7a62", 3, 13, 26, 11); dot(g, "#b8a88a", 3, 13, 26, 3.4); dot(g, "#6a5a44", 3, 21, 26, 3); circle(g, "#d9c8a4", 26.5, 18.6, 5.2); circle(g, "#b8a88a", 26.5, 18.6, 3); circle(g, "#d9c8a4", 26.5, 18.6, 1.4); dot(g, "#8a7a62", 10, 8, 2, 6);
      } else { // moita de capim da beira
        soft(g, 5, 14, 22, 14);
        g.ctx.fillStyle = "#5f9a5a"; g.ctx.beginPath(); for (let i = 0; i < 6; i++) { const x = 6 + i * 4; g.ctx.moveTo(g.x + x, g.y + 28); g.ctx.lineTo(g.x + x - 2 + (i % 3), g.y + 10 + (i % 2) * 3); g.ctx.lineTo(g.x + x + 3, g.y + 28); g.ctx.closePath(); } g.ctx.fill();
        dot(g, "#8fcf80", 12, 12, 2, 8); dot(g, "#8fcf80", 20, 14, 2, 7); dot(g, "#4a7a46", 6, 26, 20, 2);
      }
    },
    high(g) {
      rio.base(g); halo(g);
      if (g.h(1) < 0.65) { // salgueiro de ramos caídos
        treeShadow(g, 16, 13, 13);
        dot(g, "#6a4a2e", 14, 17, 4, 14); dot(g, "#3f2a16", 14, 17, 1.4, 14);
        circle(g, "#5a9a6a", 16, 13.2, 12.2); circle(g, "#78b884", 15, 11, 10); circle(g, "#a4dca0", 12, 8, 5.6);
        for (const x of [5, 9, 13, 19, 23, 27]) line(g, "#4a8a5a", 1.6, x, 12, x - 1 + (x > 16 ? 2 : 0), 22 + (x % 3) * 2);
      } else { // tronco seco em pé, com um galho
        longShadow(g, 7, 3, 18, 26);
        dot(g, "#7a6a52", 13, 4, 6, 26); dot(g, "#9a8a70", 13, 4, 2, 26); dot(g, "#5a4c3a", 17, 4, 2, 26); dot(g, "#7a6a52", 19, 10, 9, 3); dot(g, "#7a6a52", 6, 15, 8, 3); dot(g, "#b8a88a", 13, 3, 6, 2);
        circle(g, "#6f9a7a", 15, 24, 2.4);
      }
    },
  };

  // 13. Pântano e vitórias-régias: lodo verde-azulado com vitórias-régias, troncos escuros e raízes de mangue, taboas, galhos secos e água parada em volta
  const pantano = {
    place: "Pântano e vitórias-régias", blurb: "o pântano: lodo verde, vitórias-régias, raízes de mangue, galhos secos e água parada em volta",
    nest: { rim: "#5e4a30", twig: "#a8905a", lining: "#e4dcb0" },
    mover: { wall: ["#c47a3a", "#e8a46a", "#6a3a14"], door: ["#b04ac4", "#d08ae6", "#5a1a6a"] }, rail: ["#3a4a40", "#0c120e"],
    wind: { tint: "rgba(230,255,235,.14)", rgb: "240,255,244" },
    base(g) { checker(g, "#587a70", "#52746a"); },
    floor(g) {
      pantano.base(g);
      if (g.h(1) < 0.22) { const x = 6 + g.h(2) * 14, y = 6 + g.h(3) * 14; circle(g, "#2f8a52", x + 5, y + 5, 5.4); circle(g, "#4aae6a", x + 5, y + 4.6, 4.6); if (g.h(4) < 0.4) circle(g, "#ffb8d4", x + 4, y + 4, 1.6); }
      if (g.h(5) < 0.2) { dot(g, "#3f6e8a", 4 + g.h(6) * 14, 12 + g.h(7) * 10, 11, 5); dot(g, "#6aa4c0", 5 + g.h(6) * 14, 13 + g.h(7) * 10, 6, 1.4); }
      if (g.h(8) < 0.5) { dot(g, "#8fc26a", 4 + g.h(9) * 24, 4 + g.h(10) * 24, 1.6, 1.6); dot(g, "#8fc26a", 8 + g.h(9) * 20, 8 + g.h(10) * 18, 1.6, 1.6); }
      contact(g);
    },
    wall(g) {
      if (g.border) { // água parada com lentilha-d'água
        const t = g.time || 0, s = Math.sin(t * 0.9 + g.c * 0.8 + g.r) * 2;
        dot(g, "#2f5a58", 0, 0, T, T); dot(g, "#3f7068", 0, 0, T, 3); dot(g, "rgba(190,240,210,.5)", 5 + s, 9, 8, 1.4); dot(g, "#7ac26a", 4 + g.h(2) * 20, 16 + g.h(3) * 10, 2.4, 2.4); dot(g, "#7ac26a", 9 + g.h(4) * 16, 20, 2.4, 2.4); dot(g, "rgba(190,240,210,.4)", 14 - s, 25, 11, 1.4);
        return;
      }
      block(g, "#4e3c2e", "#7a6046", "#2a1f16", "#3a2c20");
      g.ctx.lineWidth = 2.2; g.ctx.strokeStyle = "#2a1f16"; g.ctx.beginPath(); g.ctx.moveTo(g.x + 4, g.y + 28); g.ctx.lineTo(g.x + 10, g.y + 16); g.ctx.lineTo(g.x + 8, g.y + 4); g.ctx.moveTo(g.x + 20, g.y + 28); g.ctx.lineTo(g.x + 22, g.y + 14); g.ctx.lineTo(g.x + 27, g.y + 6); g.ctx.stroke();
      g.ctx.strokeStyle = "#6a523a"; g.ctx.lineWidth = 1; g.ctx.beginPath(); g.ctx.moveTo(g.x + 11, g.y + 28); g.ctx.lineTo(g.x + 14, g.y + 14); g.ctx.lineTo(g.x + 16, g.y + 4); g.ctx.stroke();
      circle(g, "#5a8a4a", 6 + g.h(2) * 20, 8 + g.h(3) * 16, 3); circle(g, "#7ab06a", 8 + g.h(2) * 20, 9 + g.h(3) * 16, 1.8);
    },
    muro(g) { hedgeM(g, pantano.base, { dark: "#2a5a48", mid: "#3f7a60", light: "#6aa888", dots: ["#ff9ec4", "#ffffff"], dotP: 0.25 }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // vitória-régia grande com flor rosada
        circle(g, "rgba(10,40,40,.28)", 17, 21, 11); circle(g, "#2f8a52", 16, 18, 11); circle(g, "#4aae6a", 16, 17.6, 9.6);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 17); g.ctx.lineTo(g.x + 26, g.y + 14); g.ctx.lineTo(g.x + 26, g.y + 20); g.ctx.closePath(); g.ctx.fillStyle = "#587a70"; g.ctx.fill();
        for (let i = 0; i < 6; i++) { const a = i * 1.05; circle(g, "#ffb8d4", 13 + Math.cos(a) * 3, 16 + Math.sin(a) * 2.4, 1.9); } circle(g, "#ffe27a", 13, 16, 1.5);
      } else if (v < 0.75) { // pedra com musgo
        softDisc(g, 16, 22, 10);
        circle(g, "#5e6a62", 16, 19, 10); circle(g, "#7a887e", 15, 17.6, 8.6); circle(g, "#4a8a4a", 12, 14, 4.6); circle(g, "#6fb060", 20, 17, 3);
      } else { // taboa pequena
        soft(g, 6, 14, 20, 14);
        for (const [x0, x1, y1] of [[10, 8, 6], [16, 16, 4], [22, 24, 7]]) { line(g, "#5f9a5a", 2, x0, 28, x1, y1 + 2); dot(g, "#6a4a2a", x1 - 1.6, y1, 3.2, 7); dot(g, "#8a6a3a", x1 - 1.6, y1, 1.2, 7); }
      }
    },
    high(g) {
      pantano.base(g); halo(g);
      if (g.h(1) < 0.6) { // tronco morto torcido com galhos
        longShadow(g, 4, 3, 24, 26);
        line(g, "#2a1f16", 7, 16, 30, 15, 12); line(g, "#6a523a", 5, 16, 30, 15, 12); line(g, "#6a523a", 3.4, 15, 14, 6, 5); line(g, "#6a523a", 3.4, 15, 12, 25, 4); line(g, "#6a523a", 2.2, 7, 7, 3, 10); line(g, "#8f7452", 1, 15, 28, 15, 13);
        circle(g, "#5a8a4a", 14, 22, 2.4); circle(g, "#7ab06a", 22, 4.6, 1.8);
      } else { // arco de raízes de mangue
        longShadow(g, 3, 8, 26, 21);
        line(g, "#2a1f16", 5.4, 3, 29, 9, 12); line(g, "#6a523a", 3.6, 3, 29, 9, 12); line(g, "#2a1f16", 5.4, 29, 29, 23, 12); line(g, "#6a523a", 3.6, 29, 29, 23, 12); dot(g, "#2a1f16", 8, 9, 16, 5); dot(g, "#6a523a", 8, 9, 16, 3.4); line(g, "#6a523a", 2.6, 16, 14, 16, 29);
        circle(g, "#5a8a4a", 16, 8, 3); circle(g, "#7ab06a", 17, 7, 1.6);
      }
    },
  };

  // 14. Dunas e restinga: areia clara com ondulações, rochas de arenito, restinga baixa, madeira de praia, coqueiros e o mar em volta do mapa
  const dunas = {
    place: "Dunas e restinga", blurb: "as dunas: areia clara com ondulações, arenito, restinga baixa, conchas, madeira de praia, coqueiros e o mar em volta",
    nest: { rim: "#8a6a40", twig: "#cfae72", lining: "#fbeec0" },
    mover: { wall: ["#3a8ac4", "#6ab2e6", "#14447a"], door: ["#c44a6a", "#e67f9a", "#6a1a30"] }, rail: ["#6a5a3a", "#1a140a"],
    wind: { tint: "rgba(255,236,190,.2)", rgb: "255,248,222" },
    base(g) { checker(g, "#ecd8a8", "#e6d29e"); },
    floor(g) {
      dunas.base(g);
      g.ctx.strokeStyle = "#d4bc84"; g.ctx.lineWidth = 1.2; g.ctx.beginPath();
      for (let i = 0; i < 2; i++) { const y = 8 + i * 12 + g.h(1 + i) * 4, x = 2 + g.h(3 + i) * 6; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 8, g.y + y - 2); g.ctx.lineTo(g.x + x + 16, g.y + y); g.ctx.lineTo(g.x + x + 24, g.y + y - 2); }
      g.ctx.stroke();
      if (g.h(6) < 0.12) { circle(g, "#f4a8a0", 8 + g.h(7) * 16, 8 + g.h(8) * 16, 2); circle(g, "#fff3f0", 7.4 + g.h(7) * 16, 7.4 + g.h(8) * 16, 0.9); }
      if (g.h(9) < 0.14) dot(g, "#8fae6a", 6 + g.h(10) * 18, 12 + g.h(11) * 10, 2, 5);
      if (g.c % 5 === 2) dot(g, "rgba(170,130,60,.1)", 0, 16, T, 12);
      contact(g);
    },
    wall(g) {
      if (g.border) { sea(g, ["#3f9fc8", "#7ac8e4", "255,255,255"], true); return; }
      block(g, "#c9a875", "#ecd29e", "#8a6c40", "#a98a58");
      g.ctx.fillStyle = "#b08f5c"; g.rect(g.x, g.y + 9, T, 1.4); g.rect(g.x, g.y + 19, T, 1.4); g.ctx.fillStyle = "#dcc08a"; g.rect(g.x, g.y + 13, T, 1); g.rect(g.x, g.y + 24, T, 1);
      circle(g, "#d9b884", 8 + g.h(2) * 12, 8 + g.h(3) * 14, 5);
      if (g.h(4) < 0.3) dot(g, "#8fae6a", 4 + g.h(5) * 22, 26, 2, 4);
    },
    muro(g) { hedgeM(g, dunas.base, { dark: "#6a8a5a", mid: "#8aa870", light: "#b4cc98", dots: ["#fff3d0", "#ffd870"], dotP: 0.6 }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // madeira trazida pelo mar
        soft(g, 3, 15, 27, 12);
        dot(g, "#a89a84", 3, 14, 26, 9); dot(g, "#d4c8b0", 3, 14, 26, 3); dot(g, "#7a6c56", 3, 21, 26, 2.4); dot(g, "#d4c8b0", 12, 9, 3, 6); circle(g, "#ece2cc", 28, 18.6, 4); circle(g, "#a89a84", 28, 18.6, 2);
      } else if (v < 0.75) { // concha grande
        softDisc(g, 16, 22, 10);
        circle(g, "#f4b8a0", 16, 19, 10); circle(g, "#fde0d0", 16, 18, 8); g.ctx.beginPath(); for (let i = -3; i <= 3; i++) { g.ctx.moveTo(g.x + 16, g.y + 27); g.ctx.lineTo(g.x + 16 + i * 3, g.y + 11 + Math.abs(i)); } stroke(g, "#e8967c", 1); dot(g, "#ffffff", 11, 14, 4, 1.4);
      } else { // pedra de arenito
        soft(g, 5, 14, 22, 14);
        circle(g, "#b8946a", 16, 20, 9.6); circle(g, "#d4b184", 15, 18, 8.2); circle(g, "#ecd2a4", 12, 15, 3.4); dot(g, "#a58058", 8, 22, 16, 1.4);
      }
    },
    high(g) {
      dunas.base(g); halo(g);
      if (g.h(1) < 0.6) { // coqueiro visto de cima: folhas em leque
        treeShadow(g, 16, 15, 12);
        dot(g, "#7a5a36", 14.6, 16, 3.4, 14);
        for (let i = 0; i < 7; i++) { const a = i * (TAU / 7) + 0.3; line(g, "#2f8a4a", 4.4, 16, 14, 16 + Math.cos(a) * 12.4, 14 + Math.sin(a) * 11.4); line(g, "#5fc06a", 2, 16, 14, 16 + Math.cos(a) * 11, 14 + Math.sin(a) * 10); }
        circle(g, "#8a5a2a", 14.4, 15, 2.2); circle(g, "#8a5a2a", 18, 15.6, 2.2);
      } else { // touceira alta de capim de duna
        longShadow(g, 5, 5, 22, 24);
        for (const [x0, x1, y1] of [[10, 5, 5], [13, 11, 3], [16, 16, 2], [19, 22, 3], [22, 27, 6], [14, 8, 9], [18, 25, 10]]) { line(g, "#6a9a4a", 2, x0, 29, x1, y1 + 2); line(g, "#a8cc72", 1, x0 + 0.6, 29, x1 + 0.6, y1 + 3); }
        dot(g, "#8fae6a", 7, 27, 18, 3); dot(g, "#fff3d0", 10, 3, 2, 3); dot(g, "#fff3d0", 22, 2, 2, 3);
      }
    },
  };

  // 15. Falésias e ninhos: topo de falésia de capim e cascalho cinzento, paredões de rocha em camadas, muros de pedra, rochedos com ninhos de gravetos e o mar lá embaixo
  const falesias = {
    place: "Falésias e ninhos", blurb: "as falésias: capim ralo e cascalho, paredões de rocha em camadas, muros de pedra, ninhos de gravetos e o mar lá embaixo",
    nest: { rim: "#6a4a2e", twig: "#b89458", lining: "#f0e2b0" },
    mover: { wall: ["#c4503a", "#e8806a", "#6a2418"], door: ["#3ac4a0", "#6ae6c8", "#146a58"] }, rail: ["#4a5058", "#101418"],
    wind: { tint: "rgba(210,232,255,.2)", rgb: "230,244,255" },
    base(g) { checker(g, "#8f9a82", "#899480"); },
    floor(g) {
      falesias.base(g);
      if (g.h(1) < 0.5) { circle(g, "#a8aca2", 4 + g.h(2) * 24, 5 + g.h(3) * 22, 1.8 + g.h(4)); circle(g, "#788272", 6 + g.h(5) * 20, 8 + g.h(6) * 18, 1.4); }
      if (g.h(7) < 0.3) { const x = 4 + g.h(8) * 22; dot(g, "#68805a", x, 8 + g.h(9) * 10, 1.4, 5); dot(g, "#68805a", x + 3, 9 + g.h(9) * 10, 1.4, 4); }
      if (g.h(10) < 0.1) { dot(g, "#ffd84a", 6 + g.h(11) * 18, 6 + g.h(12) * 18, 2, 2); dot(g, "#ffffff", 14 + g.h(11) * 10, 12 + g.h(12) * 10, 2, 2); }
      contact(g);
    },
    wall(g) {
      if (g.border) { sea(g, ["#2f6fa0", "#5a9acc", "235,248,255"], false); return; }
      block(g, "#7e7266", "#b4a690", "#463e34", "#5c5246");
      g.ctx.fillStyle = "#a8604a"; g.rect(g.x, g.y + 8, T, 1.6); g.rect(g.x, g.y + 24, T, 1.6); g.ctx.fillStyle = "#d4c4a8"; g.rect(g.x, g.y + 16, T, 1.4); g.ctx.fillStyle = "#5a5044"; g.rect(g.x, g.y + 12, T, 1); g.rect(g.x, g.y + 20, T, 1);
      g.ctx.beginPath(); g.ctx.moveTo(g.x + 9 + g.h(2) * 6, g.y + 2); g.ctx.lineTo(g.x + 12 + g.h(2) * 6, g.y + 12); g.ctx.lineTo(g.x + 10 + g.h(2) * 6, g.y + 20); stroke(g, "#3a342c", 1);
      if (g.h(3) < 0.25) dot(g, "#f0ece0", 4 + g.h(4) * 22, 4 + g.h(5) * 20, 3, 2); // guano branco
    },
    muro(g) { stoneM(g, falesias.base, { stone: ["#6a7080", "#5e6474"], mortar: "#383c48", top: "#a8aebe" }); },
    crate(g) {
      if (g.h(4) < 0.55) { // rochedo baixo
        soft(g, 4, 13, 24, 15);
        circle(g, "#6a6e78", 16, 20, 10.4); circle(g, "#8a8e98", 15, 18.4, 8.8); circle(g, "#b4b8c4", 11, 14.6, 3.4); dot(g, "#e8e4d8", 20, 14, 3, 2); dot(g, "#68805a", 8, 25, 14, 2);
      } else { // pedra com um ninho de gravetos
        soft(g, 4, 13, 24, 15);
        circle(g, "#7a7e88", 16, 21, 10); circle(g, "#9a9ea8", 15, 19.6, 8.4);
        circle(g, "#6a4a2e", 16, 14, 7.6); circle(g, "#8a6a3e", 16, 13.4, 6.2); circle(g, "#f0e2b0", 16, 13.6, 3.6); circle(g, "#fff7e8", 15, 13, 1.6); g.ctx.beginPath(); g.ctx.moveTo(g.x + 9, g.y + 12); g.ctx.lineTo(g.x + 14, g.y + 9); g.ctx.moveTo(g.x + 18, g.y + 9); g.ctx.lineTo(g.x + 23, g.y + 12); stroke(g, "#c09858", 1);
      }
    },
    high(g) {
      falesias.base(g); halo(g);
      if (g.h(1) < 0.6) { // coluna de rocha com ninho no alto
        longShadow(g, 7, 3, 18, 26);
        polygon(g, "#50535e", [8, 29, 11, 8, 21, 8, 24, 29]); polygon(g, "#8c8f99", [8, 29, 11, 8, 17, 8, 15, 29]); polygon(g, "#b8bcc8", [11, 8, 21, 8, 20, 5, 12, 5]);
        dot(g, "#6e717c", 9, 15, 14, 1.4); dot(g, "#6e717c", 9, 22, 14, 1.4);
        circle(g, "#6a4a2e", 16, 7, 6.4); circle(g, "#8a6a3e", 16, 6.6, 5); circle(g, "#f0e2b0", 16, 6.8, 2.8); dot(g, "#e8e4d8", 21, 12, 2, 4);
      } else { // pinheirinho torto pelo vento
        treeShadow(g, 15, 14, 12);
        dot(g, "#5a3d22", 12, 18, 4, 12); dot(g, "#5a3d22", 15, 14, 7, 3.4);
        circle(g, "#2a6a48", 20, 11, 9); circle(g, "#3a8a5a", 18, 10, 7); circle(g, "#4aa070", 14, 7, 4.4); circle(g, "#2a6a48", 8, 18, 5.4); circle(g, "#3a8a5a", 7.4, 17, 4);
      }
    },
  };

  // 16. Vila de pescadores e redes: tábuas de pier azul-claras com pregos, casinhas caiadas de telhado azul, redes esticadas, barris, boias, mastros e o mar em volta
  const pescadores = {
    place: "Vila de pescadores e redes", blurb: "a vila de pescadores: tábuas do cais, casinhas caiadas, redes esticadas, barris, boias, mastros e o mar em volta",
    nest: { rim: "#7a5a3a", twig: "#c9a868", lining: "#f6ecc0" },
    mover: { wall: ["#c4503a", "#e8806a", "#6a2418"], door: ["#e0b83a", "#f6d872", "#7a5e10"] }, rail: ["#4a5a68", "#10161c"],
    wind: { tint: "rgba(220,240,255,.2)", rgb: "240,250,255" },
    base(g) { checker(g, "#c2d6e2", "#bbcfdc"); },
    floor(g) {
      pescadores.base(g);
      const o = g.c & 1 ? 12 : 4;
      lines(g, "#9db4c4", 1.2, [0, 10.6, T, 10.6, 0, 21.6, T, 21.6, o, 0, o, 10, (o + 14) % 32, 11, (o + 14) % 32, 21, o, 22, o, T]); dot(g, "rgba(255,255,255,.4)", 0, 0, T, 1.4);
      lines(g, "#6a7e8e", 1.6, [o + 2, 3.6, o + 3.4, 3.6, (o + 16) % 32, 14.6, (o + 16) % 32 + 1.4, 14.6, o + 2, 26.6, o + 3.4, 26.6]);
      if (g.h(1) < 0.1) { circle(g, "#d9b888", 8 + g.h(2) * 16, 8 + g.h(3) * 16, 3.4); circle(g, "#b4946a", 8 + g.h(2) * 16, 8 + g.h(3) * 16, 1.8); } // rolo de corda
      contact(g);
    },
    wall(g) {
      if (g.border) { sea(g, ["#4aa0c8", "#86d0e8", "255,255,255"], true); return; }
      block(g, "#e2d8c2", "#fffaf0", "#8a8270", "#b9ae98");
      if (!g.solid(g.c, g.r - 1)) { dot(g, "#4a74b0", 0, 0, T, 8); dot(g, "#2f5488", 0, 7, T, 1.4); dot(g, "#6f9ad8", 0, 0, T, 2); }
      if (!g.solid(g.c, g.r + 1)) { dot(g, "#5a96d4", 6, 12, 8, 11); dot(g, "#ffffff", 9.6, 12, 1, 11); dot(g, "#8a5a3a", 20, 12, 7, 17); dot(g, "#c4904c", 20, 12, 7, 2); }
      else if (g.h(3) < 0.2) { dot(g, "#5a96d4", 10, 10, 12, 10); dot(g, "#ffffff", 15.5, 10, 1, 10); }
    },
    muro(g) { netM(g, pescadores.base, { pole: "#7a5a3a", net: "#4f6f86", float: "#ff7a5a" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // montinho de rede de pesca
        soft(g, 4, 13, 24, 15);
        circle(g, "#6a8a9a", 16, 20, 10); circle(g, "#a8c4d0", 16, 19, 8.6); g.ctx.beginPath(); for (let i = 0; i < 4; i++) { g.ctx.moveTo(g.x + 8 + i * 4, g.y + 13); g.ctx.lineTo(g.x + 14 + i * 4, g.y + 27); g.ctx.moveTo(g.x + 24 - i * 4, g.y + 13); g.ctx.lineTo(g.x + 18 - i * 4, g.y + 27); } stroke(g, "#e6f0f6", 1); circle(g, "#ff7a5a", 11, 17, 2); circle(g, "#ffd23a", 21, 22, 2);
      } else if (v < 0.75) { // barril
        softDisc(g, 16, 22, 10);
        circle(g, "#5e3f22", 16, 18, 10.4); circle(g, "#a67a46", 16, 17, 9); circle(g, "#c4985a", 16, 17, 6.6); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 9, 0, TAU); stroke(g, "#3a3f4c", 1.4); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 6.6, 0, TAU); stroke(g, "#7a5530", 1);
      } else { // boia de cortiça listrada
        softDisc(g, 16, 22, 9);
        circle(g, "#d9483b", 16, 18, 9.6); circle(g, "#ffffff", 16, 18, 6.4); circle(g, "#d9483b", 16, 18, 3.4); dot(g, "rgba(255,255,255,.55)", 10, 12, 4, 1.4); dot(g, "#5e3f22", 15, 6, 2, 3);
      }
    },
    high(g) {
      pescadores.base(g); halo(g);
      if (g.h(1) < 0.6) { // mastro com a bandeirinha e as cordas
        longShadow(g, 6, 3, 20, 26);
        dot(g, "#7a5530", 14.6, 5, 3, 25); dot(g, "#a07848", 14.6, 5, 1, 25); dot(g, "#4a3320", 10, 27, 12, 3);
        dot(g, "#7a5530", 9, 9, 14, 2.4); polygon(g, "#e8403a", [17.6, 3, 28, 6, 17.6, 9]); polygon(g, "#ffffff", [17.6, 4.6, 24, 6, 17.6, 7.4]);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 5); g.ctx.lineTo(g.x + 3, g.y + 27); g.ctx.moveTo(g.x + 16, g.y + 5); g.ctx.lineTo(g.x + 29, g.y + 27); stroke(g, "#e6f0f6", 1);
      } else { // lampião de cais
        longShadow(g, 10, 3, 12, 26);
        dot(g, "#3a3f4c", 13.4, 27, 5.4, 3); dot(g, "#4a5568", 14.6, 10, 2.8, 18); dot(g, "#8a96aa", 14.6, 10, 0.9, 18);
        dot(g, "#3a3f4c", 10, 5, 12, 2); polygon(g, "#3a3f4c", [10, 5, 22, 5, 19, 1, 13, 1]); dot(g, "#ffe9a0", 11.6, 7, 8.8, 7); dot(g, "#ffffff", 14, 8, 2.4, 4); dot(g, "#3a3f4c", 10, 14, 12, 1.8);
      }
    },
  };

  // 17. Campos de altitude: relva clara de montanha com tufos e flores roxas, rochas cinzentas, urzes roxas, marcos de pedra e pinheiros baixos castigados pelo vento
  const altitude = {
    place: "Campos de altitude", blurb: "os campos de altitude: relva clara com tufos, flores roxas, rochas cinzentas, urzes, marcos de pedra e vento forte",
    nest: { rim: "#6a5238", twig: "#b09a68", lining: "#eee6c0" },
    mover: { wall: ["#c4603a", "#e8906a", "#6a2e14"], door: ["#3a6ac4", "#6a96e6", "#143a7a"] }, rail: ["#4a5a50", "#101812"],
    wind: { tint: "rgba(235,246,255,.22)", rgb: "244,250,255" },
    base(g) { checker(g, "#b9c98a", "#b3c384"); },
    floor(g) {
      altitude.base(g);
      if (g.h(1) < 0.55) { circle(g, "#8fa860", 5 + g.h(2) * 22, 5 + g.h(3) * 22, 3.4); circle(g, "#a0b872", 4 + g.h(2) * 22, 4 + g.h(3) * 22, 1.8); }
      if (g.h(4) < 0.2) { const x = 5 + g.h(5) * 20, y = 6 + g.h(6) * 18; dot(g, "#9a6ac8", x, y, 2, 2); dot(g, "#9a6ac8", x + 3, y + 1, 2, 2); dot(g, "#c8a4e8", x + 1, y + 3, 2, 2); }
      if (g.h(7) < 0.1) { dot(g, "#a8aca2", 6 + g.h(8) * 16, 14 + g.h(9) * 10, 5, 3); dot(g, "#c8ccc2", 7 + g.h(8) * 16, 14 + g.h(9) * 10, 3, 1.2); }
      contact(g);
    },
    wall(g) {
      if (g.border) { dot(g, "#8fa4c0", 0, 0, T, T); dot(g, "#b4c6dc", 0, 0, T, 4); polygon(g, "#e8f0f8", [4, 24, 12, 8, 18, 20, 24, 12, 31, 26, 4, 26]); dot(g, "rgba(255,255,255,.5)", 3 + g.h(2) * 12, 5, 14, 1.4); return; }
      block(g, "#b8b6b0", "#dcdad4", "#78766e", "#98968e");
      circle(g, "#c8c6c0", 9 + g.h(2) * 6, 10 + g.h(3) * 6, 7.6); circle(g, "#d8d6d0", 8 + g.h(2) * 6, 9 + g.h(3) * 6, 4.6); circle(g, "#9a9890", 22 - g.h(4) * 5, 21 - g.h(5) * 5, 6);
      circle(g, "#d4c860", 5 + g.h(6) * 20, 6 + g.h(7) * 20, 2.4); dot(g, "rgba(255,255,255,.2)", 3, 4, 12, 2);
    },
    muro(g) { hedgeM(g, altitude.base, { dark: "#7a5a9a", mid: "#9a7ab8", light: "#c0a4d8", dots: ["#ffffff", "#f0c4e8"], dotP: 0.5 }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // marco de pedras empilhadas
        soft(g, 6, 12, 20, 17);
        circle(g, "#7a7870", 16, 23.4, 8.2); circle(g, "#9a9890", 16, 22.4, 7); circle(g, "#7a7870", 16, 16.4, 6.4); circle(g, "#a8a69e", 15.6, 15.8, 5.4); circle(g, "#8a8880", 16, 10.4, 4.2); circle(g, "#b8b6ae", 15.4, 9.8, 3.2);
      } else if (v < 0.75) { // pedra pequena com capim
        soft(g, 5, 14, 22, 14);
        circle(g, "#8a8880", 16, 20, 9.4); circle(g, "#aaa8a0", 15, 18.4, 8); circle(g, "#cccac2", 12, 15, 3); dot(g, "#8fa860", 6, 22, 1.6, 6); dot(g, "#8fa860", 24, 21, 1.6, 6);
      } else { // tufo de flores roxas
        soft(g, 6, 15, 20, 13);
        circle(g, "#7a9a50", 16, 22, 9); circle(g, "#92b062", 15, 21, 7);
        for (const [fx, fy] of [[11, 17], [17, 14], [22, 18], [14, 22], [20, 23]]) { circle(g, "#9a6ac8", fx, fy, 2.6); circle(g, "#d4b4f0", fx - 0.6, fy - 0.6, 1); }
      }
    },
    high(g) {
      altitude.base(g); halo(g);
      if (g.h(1) < 0.6) { // pinheiro baixo e torto, de copa varrida para um lado
        treeShadow(g, 15, 14, 12);
        dot(g, "#6a4a2e", 12, 17, 4, 13); dot(g, "#6a4a2e", 14, 15, 8, 3);
        circle(g, "#3a6a52", 21, 12, 8.6); circle(g, "#4a8a68", 19, 11, 6.8); circle(g, "#6aaa84", 16, 8, 3.8); circle(g, "#3a6a52", 8, 17, 6); circle(g, "#4a8a68", 7.4, 16, 4.2);
      } else { // poste de madeira com a placa de trilha
        longShadow(g, 5, 3, 22, 26);
        dot(g, "#7a5530", 14.4, 6, 3.4, 24); dot(g, "#4a3320", 14.4, 6, 1.2, 24);
        polygon(g, "#d9b878", [4, 9, 20, 9, 24, 12.6, 20, 16, 4, 16]); dot(g, "#8a6a3a", 6, 11, 11, 1.4); dot(g, "#8a6a3a", 6, 13.6, 8, 1.4);
        polygon(g, "#e8d4a4", [28, 17, 12, 17, 8, 20.6, 12, 24, 28, 24]); dot(g, "#8a6a3a", 14, 19, 11, 1.4); dot(g, "#8a6a3a", 14, 21.6, 7, 1.4);
      }
    },
  };

  // 18. Entardecer nos telhados (luz laranja que escurece): telhas cor de rosa-salmão com reflexos alaranjados, paredes de chaminé com janelas acesas, parapeitos de tijolo e o céu do fim de tarde
  const entardecer = {
    place: "Entardecer nos telhados", blurb: "o entardecer: telhas quentes de luz laranja, chaminés com janelas acesas, parapeitos de tijolo, antenas e o céu rosado",
    night: true, dusk: true, halo: "rgba(255,196,110,.4)",
    nest: { rim: "#7a4a2a", twig: "#d9a060", lining: "#ffe6b0" },
    mover: { wall: ["#3a8ac4", "#6ab2e6", "#14447a"], door: ["#c44f9a", "#e67fbe", "#6a1f4e"] }, rail: ["#4a3a40", "#120c10"],
    wind: { tint: "rgba(255,226,180,.18)", rgb: "255,236,200" },
    base(g) { checker(g, "#d9a284", "#d39c7e"); },
    floor(g) {
      entardecer.base(g);
      const off = g.r & 1 ? 8 : 0, a = (off + 4) % 32 - 0.6, b = (off + 20) % 32 - 0.6, c = (off + 12) % 32 - 0.6, d = (off + 28) % 32 - 0.6;
      // as juntas das telhas e o brilho das fileiras são retângulos finos num traço só (preencher é bem mais barato que riscar linhas finas em todos os tiles da tela)
      slabs(g, "#b87a62", [0, 10, T, 1.2, 0, 21, T, 1.2, a, 0, 1.2, 10, b, 0, 1.2, 10, c, 11, 1.2, 10, d, 11, 1.2, 10, a, 22, 1.2, 10, b, 22, 1.2, 10]);
      if (g.h(1) < 0.14) dot(g, "rgba(255,170,70,.3)", 4 + g.h(2) * 14, 4 + g.h(3) * 18, 12, 5); // reflexo da luz do pôr do sol
      contact(g);
    },
    wall(g) {
      if (g.border) { // o céu do fim de tarde: faixas de laranja a rosa, com uma nuvem
        dot(g, "#e8844a", 0, 0, T, T); dot(g, "#d96a5a", 0, 12, T, 10); dot(g, "#b8586e", 0, 22, T, 10); dot(g, "#f6b070", 0, 0, T, 4);
        if (g.h(2) < 0.5) { dot(g, "rgba(255,230,200,.6)", 3 + g.h(3) * 10, 8 + g.h(4) * 10, 16, 3); dot(g, "rgba(255,230,200,.45)", 8 + g.h(3) * 10, 6 + g.h(4) * 10, 10, 2.4); }
        return;
      }
      block(g, "#8a4a3a", "#d9805a", "#3e1e18", "#5e2e24");
      g.ctx.fillStyle = "#6a3428"; g.rect(g.x, g.y + 7, T, 1); g.rect(g.x, g.y + 15, T, 1); g.rect(g.x, g.y + 23, T, 1); g.rect(g.x + 9, g.y, 1, 7); g.rect(g.x + 21, g.y + 8, 1, 7); g.rect(g.x + 9, g.y + 16, 1, 7);
      if (!g.solid(g.c, g.r + 1) || g.h(3) < 0.3) { dot(g, "#3e1e18", 7, 8, 10, 14); dot(g, "#ffd870", 8, 9, 8, 12); dot(g, "#fff0b0", 9, 10, 3, 4); dot(g, "#8a5a2a", 11.6, 9, 1, 12); dot(g, "rgba(255,200,100,.3)", 20, 8, 8, 14); } // janela acesa
    },
    muro(g) { stoneM(g, entardecer.base, { stone: ["#c0624a", "#b0563e"], mortar: "#6a3a2e", top: "#e89a78", glow: "rgba(255,170,80,.4)" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // vaso de chaminé de barro
        softDisc(g, 16, 22, 10);
        circle(g, "#a8502e", 16, 18, 10); circle(g, "#d9784a", 16, 17, 8.4); circle(g, "#3e1e18", 16, 17, 5.4); circle(g, "#1e0e0c", 16, 17.6, 3.4); dot(g, "rgba(255,230,180,.6)", 10, 11, 5, 1.4);
      } else if (v < 0.75) { // claraboia refletindo o pôr do sol
        soft(g, 5, 9, 23, 20);
        dot(g, "#6a3428", 5, 8, 22, 19); dot(g, "#f6b878", 8, 11, 16, 13); dot(g, "#ffffff", 15.2, 11, 1.6, 13); dot(g, "#ffffff", 8, 16.4, 16, 1.6); dot(g, "rgba(255,255,255,.6)", 9, 12, 5, 2);
      } else { // caixa de ventilação
        soft(g, 6, 12, 21, 17);
        dot(g, "#7a6a72", 6, 11, 20, 16); dot(g, "#a89aa4", 6, 11, 20, 4); dot(g, "#4e424a", 6, 22, 20, 5); g.ctx.fillStyle = "#4e424a"; for (let i = 0; i < 4; i++) g.rect(g.x + 9 + i * 4.4, g.y + 16, 1.6, 5); dot(g, "rgba(255,200,120,.5)", 6, 11, 20, 1.4);
      }
    },
    high(g) {
      entardecer.base(g); halo(g, "rgba(255,200,120,.38)");
      if (g.h(1) < 0.6) { // antena com a lâmpada de alerta acesa
        longShadow(g, 8, 3, 16, 26);
        dot(g, "#5a4a52", 9, 26, 14, 3); dot(g, "#e0d0d4", 14.6, 5, 2.8, 22);
        for (const [y0, hw] of [[7, 11], [12, 9], [17, 7], [22, 5]]) { dot(g, "#a8909a", 16 - hw, y0, hw * 2, 1.8); dot(g, "#f6e8ec", 16 - hw, y0, hw * 2, 0.8); }
        circle(g, "rgba(255,90,70,.45)", 16, 4.6, 4); circle(g, "#ff5a46", 16, 4.6, 2.2);
      } else { // poste com a lanterna acesa
        longShadow(g, 9, 3, 14, 26);
        dot(g, "#5a4a52", 13.4, 26, 5.4, 3); dot(g, "#6a5a62", 14.6, 9, 2.8, 18); dot(g, "#a8909a", 14.6, 9, 0.9, 18);
        circle(g, "rgba(255,200,110,.4)", 16, 8.6, 8); polygon(g, "#5a4a52", [10, 6, 22, 6, 19, 1, 13, 1]); dot(g, "#ffd870", 11.6, 6, 8.8, 7); dot(g, "#fff6c8", 14, 7, 2.4, 4); dot(g, "#5a4a52", 10, 13, 12, 1.8);
      }
    },
  };

  // 19. Noite na floresta: musgo azul-esverdeado sob o luar, vagalumes e cogumelos que brilham, troncos arroxeados, arbustos com vagalumes e árvores altas — claro e saturado, pois o jogo escurece em volta
  const noite = {
    place: "Noite na floresta", blurb: "a noite na floresta: musgo sob o luar, vagalumes, cogumelos que brilham, troncos escuros e lanternas",
    night: true, halo: "rgba(170,220,255,.42)",
    nest: { rim: "#6a5a7a", twig: "#b8a8d0", lining: "#f2eaff" },
    mover: { wall: ["#e0904a", "#f6b878", "#7a420a"], door: ["#4ac4a0", "#7ae6c8", "#146a58"] }, rail: ["#3a4468", "#0a0e22"],
    wind: { tint: "rgba(210,230,255,.2)", rgb: "225,240,255" },
    base(g) { checker(g, "#6db3a6", "#67ada0"); },
    floor(g) {
      noite.base(g);
      if (g.h(1) < 0.4) dot(g, "rgba(220,240,255,.16)", 2 + g.h(2) * 14, 3 + g.h(3) * 18, 13, 6); // luar entre as copas
      if (g.h(4) < 0.45) { const x = 4 + g.h(5) * 22, y = 5 + g.h(6) * 20; dot(g, "#4a9488", x, y, 1.4, 5); dot(g, "#4a9488", x + 3, y + 1, 1.4, 4); }
      if (g.h(7) < 0.28) { const x = 4 + g.h(8) * 24, y = 4 + g.h(9) * 24; circle(g, "rgba(255,250,150,.4)", x, y, 3.4); dot(g, "#fffbb0", x - 1, y - 1, 2, 2); } // vagalume
      if (g.h(10) < 0.07) { dot(g, "#e8f6ff", 14 + g.h(11) * 8, 18, 2, 3); circle(g, "#8fe8ff", 15 + g.h(11) * 8, 17, 3.4); }
      contact(g, "rgba(0,20,40,.2)");
    },
    wall(g) {
      if (g.border) { dot(g, "#1e2a50", 0, 0, T, T); dot(g, "#2e3e70", 0, 0, T, 4); dot(g, "#2a3866", 4 + g.h(2) * 10, 6, 6, 22); dot(g, "#2a3866", 18 + g.h(3) * 8, 3, 6, 25); dot(g, "#fff6c0", 3 + g.h(4) * 24, 6 + g.h(5) * 22, 1.6, 1.6); return; }
      block(g, "#3a4468", "#7a88b8", "#161c34", "#242c4c");
      g.ctx.fillStyle = "#242c4c"; g.rect(g.x + 6 + g.h(2) * 3, g.y, 1.6, T); g.rect(g.x + 15, g.y + 2, 1.6, T - 2); g.rect(g.x + 22 + g.h(3) * 3, g.y, 1.6, T);
      g.ctx.fillStyle = "#566090"; g.rect(g.x + 10, g.y + 3, 1, T - 6); g.rect(g.x + 19, g.y + 5, 1, T - 8);
      circle(g, "#7ad8b8", 4 + g.h(6) * 24, 5 + g.h(7) * 22, 2); dot(g, "rgba(200,220,255,.25)", 3, 3, 8, 2);
    },
    muro(g) { hedgeM(g, noite.base, { dark: "#2a6a6a", mid: "#3f8f8a", light: "#74c8b8", dots: ["#fff6a0", "#c8ffb0"], dotP: 0.9 }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.5) { // cogumelos que brilham
        soft(g, 6, 15, 20, 13); circle(g, "rgba(140,255,230,.3)", 16, 18, 12);
        dot(g, "#e8f6ff", 9, 16, 3, 10); circle(g, "#4ad8c4", 10.5, 15, 6); circle(g, "#bffff0", 8.6, 13.6, 1.3); circle(g, "#bffff0", 12.6, 16, 1);
        dot(g, "#e8f6ff", 19, 19, 2.6, 8); circle(g, "#8a7af0", 20.3, 18, 4.8); circle(g, "#d4ccff", 19, 16.8, 1);
      } else { // pedra com musgo luminoso
        softDisc(g, 16, 22, 10);
        circle(g, "#5a6488", 16, 19, 10); circle(g, "#7a88b4", 15, 17.6, 8.6); circle(g, "#aab8e4", 12, 14, 3.4); circle(g, "#7ad8b8", 20, 17, 3.2); circle(g, "#bffff0", 19.4, 16.4, 1.2);
      }
    },
    high(g) {
      noite.base(g); halo(g, "rgba(180,225,255,.34)");
      if (g.h(1) < 0.6) { // árvore alta de copa escura recortada pelo luar
        treeShadow(g, 16, 14, 13);
        dot(g, "#3a4468", 13, 21, 6, 10); dot(g, "#566090", 13, 21, 1.6, 10);
        circle(g, "#1f4a58", 16, 14, 13.2); circle(g, "#2d6a74", 15, 12, 11); circle(g, "#4a9aa0", 12, 9, 6.4); circle(g, "#bfe8f6", 10, 7, 2.2); circle(g, "#fff6a0", 21, 15, 1.6); circle(g, "#fff6a0", 8, 16, 1.4);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(200,235,255,.6)", 1.6);
      } else { // poste de lanterna acesa
        longShadow(g, 9, 3, 14, 26);
        dot(g, "#3a4468", 13.4, 26, 5.4, 3); dot(g, "#4a5684", 14.6, 9, 2.8, 18); dot(g, "#8a98c8", 14.6, 9, 0.9, 18);
        circle(g, "rgba(255,226,140,.45)", 16, 9, 8.6); polygon(g, "#3a4468", [10, 6, 22, 6, 19, 1, 13, 1]); dot(g, "#ffe27a", 11.6, 6, 8.8, 7); dot(g, "#fffbd0", 14, 7, 2.4, 4); dot(g, "#3a4468", 10, 13, 12, 1.8);
      }
    },
  };

  // 20. O grande ninho (final): palha entrelaçada cor de pêssego com penugem, uma muralha de gravetos, penas gigantes, ovos enormes e galhos grossos — a volta ao lar
  const ninho = {
    place: "O grande ninho", blurb: "o grande ninho: palha trançada e penugem, muralhas de gravetos, ovos enormes, penas gigantes e galhos grossos",
    nest: { rim: "#7a4a24", twig: "#d4a468", lining: "#fff0c8" },
    mover: { wall: ["#4a8ac4", "#7ab2e6", "#1a4a7a"], door: ["#c44a6a", "#e67f9a", "#6a1a30"] }, rail: ["#5a3a24", "#140c06"],
    wind: { tint: "rgba(255,240,226,.18)", rgb: "255,246,236" },
    base(g) { checker(g, "#e5bba8", "#dfb5a2"); },
    floor(g) {
      ninho.base(g);
      g.ctx.strokeStyle = "#c98f6a"; g.ctx.lineWidth = 1.2; g.ctx.beginPath();
      for (let i = 0; i < 3; i++) { const x = 1 + g.h(1 + i) * 12, y = 4 + i * 9 + g.h(4 + i) * 4; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 9, g.y + y + 2 - g.h(7 + i) * 4); g.ctx.lineTo(g.x + x + 18, g.y + y + 1); }
      g.ctx.stroke();
      if (g.h(10) < 0.2) { dot(g, "#fff7e8", 5 + g.h(11) * 18, 6 + g.h(12) * 16, 5, 1.6); dot(g, "#ffffff", 6 + g.h(11) * 18, 5 + g.h(12) * 16, 2, 1); }
      if (g.h(13) < 0.15) dot(g, "#a8703a", 4 + g.h(14) * 20, 8 + g.h(15) * 16, 7, 1.4);
      contact(g);
    },
    wall(g) {
      if (g.border) { // o grande tronco: casca em faixas
        dot(g, "#5a3a20", 0, 0, T, T); dot(g, "#7a5230", 3 + g.h(2) * 4, 0, 5, T); dot(g, "#3e2814", 14 + g.h(3) * 4, 0, 3, T); dot(g, "#7a5230", 22 + g.h(4) * 4, 0, 5, T); dot(g, "#a07848", 0, 0, T, 2);
        return;
      }
      block(g, "#7a5230", "#b8884e", "#3e2814", "#5a3a20");
      g.ctx.lineWidth = 2; g.ctx.strokeStyle = "#d4a468"; g.ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = 3 + g.h(2 + i) * 14, y = 4 + i * 7 + g.h(6 + i) * 3; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 13, g.y + y - 3 + g.h(10 + i) * 6); } g.ctx.stroke();
      g.ctx.lineWidth = 1.6; g.ctx.strokeStyle = "#3e2814"; g.ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = 8 + g.h(14 + i) * 14, y = 6 + i * 7 + g.h(18 + i) * 3; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + Math.max(0.5, x - 11), g.y + Math.min(31, y + 2 + g.h(22 + i) * 4)); } g.ctx.stroke();
      if (g.h(3) < 0.25) { dot(g, "#fff7e8", 6 + g.h(4) * 16, 8 + g.h(5) * 14, 6, 1.6); dot(g, "#ffffff", 7 + g.h(4) * 16, 7 + g.h(5) * 14, 3, 1); }
    },
    muro(g) { twigM(g, ninho.base, { dark: "#8a5e34", a: "#dcb47c", b: "#a8743e" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // ovo enorme de bolinhas
        soft(g, 6, 8, 20, 21);
        circle(g, "#d9c8b0", 16, 19, 10.4); circle(g, "#f2ead8", 16, 18, 9.6); circle(g, "#fff7ea", 13, 14, 4.4); circle(g, "#e8a8a0", 18, 20, 1.6); circle(g, "#e8a8a0", 12, 22, 1.4); circle(g, "#a8c8e8", 20, 15, 1.6); circle(g, "#a8c8e8", 15, 25, 1.4); circle(g, "#e8a8a0", 21, 23, 1.2);
      } else if (v < 0.75) { // pena gigante caída
        soft(g, 4, 13, 24, 13);
        g.ctx.fillStyle = "#fff0d6"; g.ctx.beginPath(); g.ctx.moveTo(g.x + 4, g.y + 24); g.ctx.lineTo(g.x + 12, g.y + 12); g.ctx.lineTo(g.x + 26, g.y + 14); g.ctx.lineTo(g.x + 28, g.y + 20); g.ctx.lineTo(g.x + 14, g.y + 26); g.ctx.closePath(); g.ctx.fill();
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 4, g.y + 24); g.ctx.lineTo(g.x + 27, g.y + 17); stroke(g, "#c4a078", 1.4); dot(g, "#e8c090", 14, 14, 8, 1.2); dot(g, "#e8c090", 12, 20, 9, 1.2);
      } else { // pedrinhas do ninho
        soft(g, 5, 14, 22, 14);
        for (const [cx, cy, r, c1] of [[11, 21, 5.6, "#a89484"], [20, 20, 6.4, "#9a8676"], [16, 15, 5, "#b8a494"]]) { circle(g, c1, cx, cy, r); circle(g, "#d4c4b4", cx - 1.4, cy - 1.6, r * 0.4); }
      }
    },
    high(g) {
      ninho.base(g); halo(g);
      if (g.h(1) < 0.6) { // galho grosso atravessando o tile, com folhas
        longShadow(g, 2, 8, 28, 18);
        line(g, "#3e2814", 11, 1, 21, 31, 14); line(g, "#8a5e34", 9, 1, 20, 31, 13); line(g, "#b8884e", 3, 1, 17.4, 31, 10.4); line(g, "#8a5e34", 4.4, 14, 17, 22, 6);
        line(g, "#3e2814", 1, 4, 24, 28, 17); leaf2(g, 21, 6, "#7ac06a"); leaf2(g, 22, 10, "#5fa050"); dot(g, "#fff7e8", 8, 12, 4, 1.6);
      } else { // torre de gravetos com penas no alto
        longShadow(g, 6, 3, 20, 26);
        polygon(g, "#3e2814", [7, 29, 11, 12, 21, 12, 25, 29]); polygon(g, "#8a5e34", [7, 29, 11, 12, 17, 12, 15, 29]); polygon(g, "#d4a468", [11, 12, 21, 12, 19, 8, 13, 8]);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 9, g.y + 20); g.ctx.lineTo(g.x + 22, g.y + 17); g.ctx.moveTo(g.x + 8, g.y + 25); g.ctx.lineTo(g.x + 24, g.y + 23); stroke(g, "#c09058", 1.4);
        dot(g, "#fff7e8", 12, 3, 2.4, 8); dot(g, "#ffffff", 12.4, 3, 1, 8); dot(g, "#ffe0d0", 18, 4, 2.4, 6); dot(g, "#fff7e8", 15, 6, 2.4, 4);
      }
    },
  };
  function leaf2(g, x, y, col) { g.ctx.fillStyle = col; g.ctx.beginPath(); g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 5, g.y + y - 4); g.ctx.lineTo(g.x + x + 8, g.y + y + 1); g.ctx.lineTo(g.x + x + 3, g.y + y + 4); g.ctx.closePath(); g.ctx.fill(); }

  // ==== FIM DOS TEMAS 11 A 20 ====

  BT.register(11, fazenda);
  BT.register(12, rio);
  BT.register(13, pantano);
  BT.register(14, dunas);
  BT.register(15, falesias);
  BT.register(16, pescadores);
  BT.register(17, altitude);
  BT.register(18, entardecer);
  BT.register(19, noite);
  BT.register(20, ninho);
  if (typeof module === "object" && module.exports) module.exports = { ids: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20] };
})(typeof window !== "undefined" ? window : globalThis);
