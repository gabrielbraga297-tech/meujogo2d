// Ambientes das Fases 1 a 10 do Passarinho (0.20.0): 1 Jardim florido, 2 Pomar de macieiras, 3 Horta e cerca, 4 Telhados e chaminés, 5 Praça da vila, 6 Parque e coreto, 7 Milharal,
// 8 Campo de trigo e espantalhos, 9 Lago e juncos, 10 Mata de pinheiros. Cada um se registra com BirdThemes.register(id, tema) (núcleo: js/bird-themes.js, que precisa ser carregado antes;
// no Node este arquivo faz o require sozinho). O contrato (g, as funções floor/wall/muro/crate/high/wind e o orçamento de 40 operações de pintura por tile) está no cabeçalho do núcleo.
// Desenham só com g.ctx/g.rect e retângulos, círculos e polígonos simples, cores fixas e tudo dentro do tile de 32 px, sem Math.random (o sorteio é g.h(k)).
// Convenções que valem para os 20 ambientes (as fases leem igual): "#" é ALTA e escura (cobre o tile); "M" é mais baixa, deixa o chão aparecer e projeta sombra (o voo alto passa por cima);
// X é um objeto BAIXO e pequeno (cerca baixa, pedra, vaso, fardo) com sombra curta; G é um objeto ALTO e redondo ou fino (copa, antena, espantalho), com brilho quente em volta e sombra comprida.
(function (root) {
  "use strict";
  const BT = typeof module === "object" && module.exports ? require("./bird-themes.js") : root.BirdThemes;
  if (!BT) throw new Error("js/bird-themes.js precisa ser carregado antes de js/bird-themes-1.js");
  const { dot, circle, pick, shadowBox, shadowDisc, block, checker, kindAt, stroke, polygon, line, contact, longShadow, treeShadow, halo, hedgeM, fenceM, stalkM, railM, lineM } = BT.helpers;
  const T = 32, TAU = Math.PI * 2, hv = BT.hash;
  const all4 = (g) => g.solid(g.c - 1, g.r) && g.solid(g.c + 1, g.r) && g.solid(g.c, g.r - 1) && g.solid(g.c, g.r + 1); // parede cercada de parede (miolo do bloco)
  const soft = (g, x, y, w, h) => { const x0 = Math.max(0, x - 1), y0 = Math.max(0, y - 1); dot(g, "rgba(0,0,0,.10)", x0, y0, Math.min(T, x + w + 1) - x0, Math.min(T, y + h + 1) - y0); dot(g, "rgba(0,0,0,.17)", x, y, w, h); }; // sombra curta e suave de um objeto baixo
  const softDisc = (g, cx, cy, rad) => { const k = rad + 1.5, x = Math.min(T - k, Math.max(k, cx)), y = Math.min(T - k, Math.max(k, cy)); circle(g, "rgba(0,0,0,.10)", x, y, k); circle(g, "rgba(0,0,0,.17)", x, y, rad); };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // 1. Jardim florido: gramado de um verde bem vivo com flores, muros de pedra cobertos de hera, sebes floridas, vasos, bebedouros de passarinho e cerejeiras
  const FLOWERS = ["#ffffff", "#ff9ec4", "#ffe36a", "#b9d8ff"];
  const jardim = {
    place: "Jardim florido", blurb: "o jardim florido: gramado macio, flores, muros de pedra, sebes e cerejeiras",
    nest: { rim: "#8a5e34", twig: "#c29a5e", lining: "#fbe6b0" },
    mover: { wall: ["#a8648a", "#d18bb2", "#5e2f4c"], door: ["#2f7f8f", "#5fb2c0", "#143e47"] }, rail: ["#6a5a46", "#1e1710"],
    wind: { tint: "rgba(255,255,255,.12)", rgb: "255,255,255" },
    base(g) { checker(g, "#9bd978", "#93d171"); },
    floor(g) {
      jardim.base(g);
      if (g.h(1) < 0.35) { const tx = 5 + ((g.h(2) * 20) | 0), ty = 6 + ((g.h(3) * 16) | 0); dot(g, "#7fbd5e", tx, ty, 1.4, 4.5); dot(g, "#7fbd5e", tx + 3, ty + 1, 1.4, 3.5); }
      if (g.h(4) < 0.3) { const k = pick(FLOWERS, g.h(5)), fx = 6 + ((g.h(6) * 18) | 0), fy = 6 + ((g.h(7) * 18) | 0); dot(g, k, fx - 2, fy, 2, 2); dot(g, k, fx + 2, fy, 2, 2); dot(g, k, fx, fy - 2, 2, 2); dot(g, k, fx, fy + 2, 2, 2); dot(g, "#ffc83d", fx, fy, 2, 2); }
      if (g.h(8) > 0.95) dot(g, "#d9d2b8", 9 + ((g.h(9) * 10) | 0), 12 + ((g.h(10) * 8) | 0), 7, 5);
      contact(g);
    },
    wall(g) {
      const { r } = g, odd = r & 1;
      block(g, "#e6dbbf", "#fff4da", "#a89a78", "#c4b794");
      g.ctx.fillStyle = "#b9aa86"; g.rect(g.x, g.y + 10, T, 1); g.rect(g.x, g.y + 20, T, 1); g.rect(g.x + 8 + odd * 8, g.y + 1, 1, 9); g.rect(g.x + 22 - odd * 8, g.y + 11, 1, 9); g.rect(g.x + 12, g.y + 21, 1, 10);
      if (g.h(3) < 0.4) { circle(g, "#4a8a3e", 4, 15, 2.8); circle(g, "#5a9a4a", 6, 22, 3.6); circle(g, "#6cb35a", 11, 19, 3); circle(g, "#7fc866", 8, 12, 2); }
    },
    muro(g) { hedgeM(g, jardim.base, { dark: "#3f8f46", mid: "#56ad58", light: "#7ccb72", dots: ["#ffffff", "#ff9ec4", "#ffe36a"], dotP: 0.8 }); },
    crate(g) {
      if (g.h(4) < 0.55) { // vaso de barro com gerânios vermelhos
        softDisc(g, 16, 22, 10);
        polygon(g, "#c8674a", [8, 15, 24, 15, 21, 27, 11, 27]); dot(g, "#e08a68", 7, 12, 18, 4); dot(g, "#a8503a", 9, 25, 14, 2); dot(g, "rgba(255,255,255,.28)", 9, 16, 2, 9);
        circle(g, "#4f9a4a", 16, 10, 6); circle(g, "#e8403a", 12, 9, 3); circle(g, "#ff6a5a", 18, 7, 3.2); circle(g, "#e8403a", 20, 12, 2.6); circle(g, "#ffd0c8", 17, 6, 0.9);
      } else { // bebedouro de passarinho: bacia de pedra num pedestal
        softDisc(g, 16, 22, 10);
        dot(g, "#a9a38f", 13, 18, 6, 9); dot(g, "#c9c4b0", 13, 18, 2, 9); circle(g, "#8e8874", 16, 15, 11); circle(g, "#d4cfbb", 16, 14, 10.4); circle(g, "#79c4e0", 16, 14, 7.6); circle(g, "#9bd8ee", 14, 12, 3.4);
        dot(g, "rgba(255,255,255,.7)", 11, 11, 5, 1.4); dot(g, "#ffffff", 20, 16, 2.4, 1.2);
      }
    },
    high(g) {
      jardim.base(g); halo(g);
      if (g.h(1) < 0.55) { // cerejeira em flor
        treeShadow(g, 16, 14, 13);
        dot(g, "#7a5230", 13.5, 21, 5, 10); dot(g, "#4e321a", 13.5, 21, 1.6, 10);
        circle(g, "#e98cb0", 16, 14, 13); circle(g, "#f4a3c0", 15, 12, 11); circle(g, "#f9c4d8", 12, 9, 6.6); circle(g, "#fff0f5", 10, 8, 2.4); circle(g, "#fff0f5", 19, 6, 2); circle(g, "#fff0f5", 21, 14, 1.8); circle(g, "#ffd0e2", 15, 17, 2);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,255,.55)", 1.6);
      } else { // macieira florida, de copa verde com flores brancas
        treeShadow(g, 16, 14, 13);
        dot(g, "#7a5230", 13.5, 21, 5, 10); dot(g, "#4e321a", 13.5, 21, 1.6, 10);
        circle(g, "#3f8f46", 16, 14, 13); circle(g, "#5cb257", 15, 12, 11); circle(g, "#86d07a", 12, 9, 6.6);
        for (const [fx, fy] of [[9, 9], [16, 6], [21, 12], [13, 16], [19, 18], [8, 15]]) { circle(g, "#ffffff", fx, fy, 2); circle(g, "#ffd2e2", fx, fy, 0.9); }
      }
    },
  };

  // 2. Pomar de macieiras: capim oliva em fileiras, maçãs caídas, muros de pedra com musgo, cercas de ripas com trepadeira, caixotes de maçã e macieiras carregadas
  const pomar = {
    place: "Pomar de macieiras", blurb: "o pomar: fileiras de macieiras, maçãs caídas, muros de pedra com musgo e cercas de ripas",
    nest: { rim: "#7a5230", twig: "#b98c54", lining: "#f0dca0" },
    mover: { wall: ["#c4532f", "#e8845f", "#6e2a14"], door: ["#4f7ac4", "#7fa6e6", "#1f3e7a"] }, rail: ["#5e4636", "#1a120c"],
    wind: { tint: "rgba(255,244,200,.12)", rgb: "255,248,220" },
    base(g) { checker(g, "#a6b560", "#9fae59"); },
    floor(g) {
      pomar.base(g);
      if (g.r % 4 === 1) dot(g, "rgba(40,70,20,.14)", 0, 19, T, 9); // sombra da fileira de árvores
      if (g.h(1) < 0.12) { const ax = 6 + ((g.h(2) * 18) | 0), ay = 8 + ((g.h(3) * 14) | 0); circle(g, "#d9483b", ax, ay, 2.6); dot(g, "#ff9a8a", ax - 1.2, ay - 1.4, 1.2, 1.2); dot(g, "#5a8a3a", ax - 0.4, ay - 4, 1, 1.8); }
      if (g.h(4) < 0.3) { dot(g, "#8a9c4a", 4 + ((g.h(5) * 20) | 0), 6 + ((g.h(6) * 18) | 0), 1.4, 4); dot(g, "#8a9c4a", 8 + ((g.h(5) * 20) | 0), 7 + ((g.h(6) * 18) | 0), 1.4, 3); }
      if (g.h(7) < 0.1) dot(g, "#d6c27a", 6 + ((g.h(8) * 14) | 0), 8 + ((g.h(9) * 14) | 0), 8, 3);
      contact(g);
    },
    wall(g) {
      block(g, "#a8a392", "#cdc8b6", "#67634f", "#857f6f");
      g.ctx.fillStyle = "#7d7867"; g.rect(g.x, g.y + 9, T, 1); g.rect(g.x, g.y + 19, T, 1); g.rect(g.x + 11, g.y + 1, 1, 8); g.rect(g.x + 21, g.y + 10, 1, 9); g.rect(g.x + 7, g.y + 20, 1, 11); g.rect(g.x + 26, g.y + 20, 1, 11);
      if (g.h(3) < 0.5) { circle(g, "#6f9a4a", 5 + g.h(4) * 20, 8 + g.h(5) * 16, 3); circle(g, "#86b45a", 7 + g.h(6) * 18, 12 + g.h(7) * 12, 2.2); circle(g, "#5a8a3a", 20, 24, 2.6); }
    },
    muro(g) { fenceM(g, pomar.base, { wood: "#c79a5e", light: "#e8c78e", dark: "#7a5530", post: "#a67a46", vine: "#5fa850" }, "rail"); },
    crate(g) {
      if (g.h(4) < 0.55) { // caixote de maçãs
        soft(g, 4, 10, 25, 19);
        dot(g, "#7a5530", 4, 11, 24, 17); dot(g, "#b98552", 5, 12, 22, 15); dot(g, "#8a6238", 5, 18, 22, 1); dot(g, "#8a6238", 5, 24, 22, 1);
        for (const [ax, ay, k] of [[9, 12, 0], [16, 11, 1], [23, 12, 0], [12, 15, 1], [20, 15, 0]]) { circle(g, k ? "#f0604a" : "#d9483b", ax, ay, 4); circle(g, "#ffb0a0", ax - 1.2, ay - 1.4, 1); }
        dot(g, "#d9a770", 4, 11, 24, 1.4);
      } else { // toco de macieira com um cogumelo
        softDisc(g, 16, 22, 10);
        circle(g, "#7a5230", 16, 19, 10); circle(g, "#d6a368", 16, 17, 9); circle(g, "#e8be88", 16, 17, 6.4); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 3.6, 0, TAU); stroke(g, "#b98552", 1); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 6.8, 0, TAU); stroke(g, "#c9a070", 1);
        dot(g, "#f4efe0", 23, 10, 2.4, 4); circle(g, "#d9483b", 24.2, 9, 3.6); circle(g, "#ffffff", 23, 8, 0.9);
      }
    },
    high(g) {
      pomar.base(g); halo(g);
      treeShadow(g, 16, 14, 13);
      dot(g, "#6a4526", 13.5, 21, 5, 10); dot(g, "#3f2a16", 13.5, 21, 1.6, 10); dot(g, "#6a4526", 10, 28, 4, 3); dot(g, "#6a4526", 18, 28, 4, 3);
      if (g.h(1) < 0.6) { // macieira carregada de maçãs vermelhas
        circle(g, "#2f7a3a", 16, 14, 13); circle(g, "#4a9a48", 15, 12, 11); circle(g, "#7cc66c", 12, 9, 6.4);
        for (const [fx, fy] of [[9, 12], [15, 7], [21, 10], [12, 18], [20, 17], [17, 13]]) { circle(g, "#d9483b", fx, fy, 2.7); circle(g, "#ffb0a0", fx - 0.9, fy - 1, 0.8); }
      } else { // pereira de frutos amarelo-esverdeados
        circle(g, "#3f8a3a", 16, 14, 13); circle(g, "#5fa84a", 15, 12, 11); circle(g, "#92d070", 12, 9, 6.4);
        for (const [fx, fy] of [[9, 13], [16, 7], [22, 11], [12, 18], [20, 18]]) { circle(g, "#d9d94a", fx, fy, 2.5); circle(g, "#f4f08a", fx - 0.8, fy - 0.9, 0.8); }
      }
      g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,220,.5)", 1.6);
    },
  };

  // 3. Horta e cerca: terra revolvida em canteiros com brotos, muros de tijolo do galpão, cercas altas de ripas, cercas baixas, abóboras e repolhos, tutores de feijão
  const horta = {
    place: "Horta e cerca", blurb: "a horta: canteiros de terra com brotos, cerca alta de ripas, cerca baixa, abóboras e feijão no tutor",
    nest: { rim: "#7a5230", twig: "#b98c54", lining: "#efd9a0" },
    mover: { wall: ["#3a8a6a", "#62b894", "#1a4a38"], door: ["#c44f4f", "#e67f7f", "#6a1f1f"] }, rail: ["#6e5a40", "#1c150e"],
    wind: { tint: "rgba(255,240,200,.14)", rgb: "255,244,215" },
    base(g) { checker(g, "#cdb089", "#c8ab83"); },
    floor(g) {
      horta.base(g);
      if (g.r & 1) { dot(g, "#b6916a", 0, 9, T, 6); dot(g, "#dcc3a0", 0, 9, T, 1.2); dot(g, "#9c7a52", 0, 14, T, 1.2); }
      if ((g.r & 1) && g.h(1) < 0.55) { const sx = 4 + ((g.h(2) * 22) | 0); dot(g, "#5fa84a", sx, 5, 1.6, 5); dot(g, "#7ccb5e", sx - 3, 6, 3, 2); dot(g, "#7ccb5e", sx + 1.6, 4, 3, 2); }
      if (g.h(3) < 0.18) dot(g, "#a89478", 4 + ((g.h(4) * 22) | 0), 20 + ((g.h(5) * 8) | 0), 3, 2);
      contact(g);
    },
    wall(g) {
      block(g, "#b5553f", "#e08f70", "#6a2a1e", "#8c3d2b");
      g.ctx.fillStyle = "#8a3a2a"; g.rect(g.x, g.y + 7, T, 1); g.rect(g.x, g.y + 15, T, 1); g.rect(g.x, g.y + 23, T, 1); g.rect(g.x + 9, g.y, 1, 7); g.rect(g.x + 21, g.y + 8, 1, 7); g.rect(g.x + 9, g.y + 16, 1, 7); g.rect(g.x + 21, g.y + 24, 1, 7);
      if (!g.solid(g.c, g.r + 1) && g.h(3) < 0.2) { dot(g, "#f0e8d4", 8, 6, 16, 17); dot(g, "#8fc6e0", 10, 8, 12, 13); dot(g, "#ffffff", 15.2, 8, 1.6, 13); dot(g, "#ffffff", 10, 14.4, 12, 1.6); }
    },
    muro(g) { fenceM(g, horta.base, { wood: "#f6f1e4", light: "#ffffff", dark: "#8a8070", vine: "#6cb55a" }, "paling"); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // cerca baixa de ripas
        soft(g, 3, 17, 26, 11);
        dot(g, "#a07c4a", 3, 16, 26, 2.4); dot(g, "#a07c4a", 3, 22, 26, 2.4);
        g.ctx.fillStyle = "#f2e8cc"; g.ctx.beginPath(); for (let i = 0; i < 5; i++) { const px = 4 + i * 5.2; g.ctx.moveTo(g.x + px, g.y + 27); g.ctx.lineTo(g.x + px, g.y + 14); g.ctx.lineTo(g.x + px + 2, g.y + 12); g.ctx.lineTo(g.x + px + 4, g.y + 14); g.ctx.lineTo(g.x + px + 4, g.y + 27); g.ctx.closePath(); } g.ctx.fill();
        g.ctx.fillStyle = "#ffffff"; for (let i = 0; i < 5; i++) g.rect(g.x + 4 + i * 5.2, g.y + 14, 1.2, 13);
      } else if (v < 0.7) { // abóbora
        softDisc(g, 16, 22, 10);
        circle(g, "#d9701a", 16, 19, 9.6); circle(g, "#f08a2a", 11, 19, 6.4); circle(g, "#f08a2a", 21, 19, 6.4); circle(g, "#ffa64a", 16, 18, 5.8);
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 11); g.ctx.lineTo(g.x + 14, g.y + 27); g.ctx.moveTo(g.x + 16, g.y + 11); g.ctx.lineTo(g.x + 19, g.y + 27); stroke(g, "#c25f12", 1);
        dot(g, "#5a8a2a", 15, 7, 3, 5); dot(g, "#7cc040", 17, 8, 5, 2); dot(g, "rgba(255,255,255,.4)", 9, 14, 3, 1.4);
      } else { // repolho
        softDisc(g, 16, 22, 10);
        circle(g, "#5fa04a", 16, 19, 10); circle(g, "#7ecb6a", 16, 18, 8); circle(g, "#a5e08a", 15, 17, 5.6); circle(g, "#cdf2b0", 14, 16, 2.6);
        g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 18, 8.4, 0.2, 3.1); stroke(g, "#4a8a3a", 1); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 18, 5, 3.4, 6.2); stroke(g, "#5fa04a", 1);
      }
    },
    high(g) {
      horta.base(g); halo(g);
      if (g.h(1) < 0.6) { // tutor de feijão: três varas cruzadas cobertas de folhas e vagens
        longShadow(g, 6, 5, 20, 24);
        dot(g, "rgba(0,0,0,.14)", 7, 27, 20, 3);
        line(g, "#7a5a32", 2.6, 5, 29, 16, 4); line(g, "#8a6a3a", 2.6, 27, 29, 16, 4); line(g, "#6a4a28", 2.4, 16, 30, 16, 3);
        for (const [lx, ly, rd] of [[10, 22, 3.6], [22, 22, 3.6], [13, 15, 3.4], [19, 14, 3.4], [16, 8, 3.2], [8, 27, 3], [24, 27, 3], [16, 21, 3.6]]) circle(g, "#4fa84a", lx, ly, rd);
        for (const [lx, ly] of [[11, 20], [21, 20], [14, 13], [17, 7]]) circle(g, "#86d070", lx, ly, 2);
        dot(g, "#a8d050", 6, 16, 1.6, 6); dot(g, "#a8d050", 25, 15, 1.6, 6); circle(g, "#ff6a8a", 17, 5, 1.8);
      } else { // ameixeira jovem
        treeShadow(g, 16, 14, 12);
        dot(g, "#7a5230", 14, 20, 4, 10);
        circle(g, "#3f8a3a", 16, 14, 12); circle(g, "#5fa84a", 15, 12, 10); circle(g, "#8fd070", 12, 9, 5.6);
        for (const [fx, fy] of [[10, 13], [17, 8], [21, 14], [14, 18]]) circle(g, "#7a3f9a", fx, fy, 2.4);
      }
    },
  };

  // 4. Telhados e chaminés: telhas de ardósia azul-acinzentada, chaminés de tijolo, varais com roupas, claraboias, canos e antenas
  const telhados = {
    place: "Telhados e chaminés", blurb: "os telhados: telhas de ardósia, chaminés de tijolo, varais com roupa, claraboias e antenas",
    nest: { rim: "#6e5238", twig: "#b8935c", lining: "#f2e0b0" },
    mover: { wall: ["#c4532f", "#e8845f", "#6e2a14"], door: ["#e0b03a", "#f6d472", "#7a5a10"] }, rail: ["#3a4256", "#0c1018"],
    wind: { tint: "rgba(255,255,255,.14)", rgb: "255,255,255" },
    base(g) { checker(g, "#7f92b8", "#7a8db3"); },
    floor(g) {
      telhados.base(g);
      const off = g.r & 1 ? 8 : 0;
      dot(g, "#677aa0", 0, 10, T, 1.2); dot(g, "#677aa0", 0, 21, T, 1.2); dot(g, "rgba(255,255,255,.18)", 0, 0, T, 1.4);
      dot(g, "#677aa0", (off + 4) % 16, 0, 1, 10); dot(g, "#677aa0", (off + 20) % 32, 0, 1, 10); dot(g, "#677aa0", (off + 12) % 32, 11, 1, 10); dot(g, "#677aa0", (off + 28) % 32, 11, 1, 10); dot(g, "#677aa0", (off + 4) % 32, 22, 1, 10); dot(g, "#677aa0", (off + 20) % 32, 22, 1, 10);
      if (g.h(1) < 0.12) dot(g, "#8fb08a", 6 + ((g.h(2) * 18) | 0), 12 + ((g.h(3) * 8) | 0), 5, 3); // musgo na telha
      contact(g);
    },
    wall(g) {
      block(g, "#58617c", "#8c98b8", "#2a3046", "#434c66");
      g.ctx.fillStyle = "#3c4560"; g.rect(g.x, g.y + 7, T, 1); g.rect(g.x, g.y + 15, T, 1); g.rect(g.x, g.y + 23, T, 1); g.rect(g.x + 9, g.y, 1, 7); g.rect(g.x + 21, g.y + 8, 1, 7); g.rect(g.x + 9, g.y + 16, 1, 7); g.rect(g.x + 21, g.y + 24, 1, 7);
      if (g.h(5) < 0.1 && all4(g)) { dot(g, "#1e222e", 8, 8, 16, 16); dot(g, "#4a4a58", 10, 10, 12, 12); dot(g, "#14161e", 12, 12, 8, 8); } // a boca da chaminé
      else if (!g.solid(g.c, g.r - 1)) dot(g, "#a4b0cc", 2, 0, 28, 3);
    },
    muro(g) { lineM(g, telhados.base, { rope: "#f0f0f0", pole: "#8a8f9c", cloths: ["#ffffff", "#ff7f9f", "#ffd23a", "#6fb0f0", "#7ed07a"] }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // claraboia
        soft(g, 5, 9, 23, 20);
        dot(g, "#5c6682", 5, 8, 22, 19); dot(g, "#9fd2f0", 8, 11, 16, 13); dot(g, "#ffffff", 15.2, 11, 1.6, 13); dot(g, "#ffffff", 8, 16.4, 16, 1.6); dot(g, "rgba(255,255,255,.55)", 9, 12, 5, 2);
      } else if (v < 0.75) { // cano de ventilação
        softDisc(g, 16, 22, 10);
        circle(g, "#7a8398", 16, 18, 10); circle(g, "#cfd6e4", 16, 17, 8.6); circle(g, "#4a5268", 16, 17, 5.6); circle(g, "#2a2e3a", 16, 17.6, 3.4); dot(g, "rgba(255,255,255,.55)", 10, 12, 5, 1.4);
      } else { // caixa-d'água pequena
        soft(g, 6, 9, 21, 20);
        dot(g, "#3a6fa8", 6, 10, 20, 18); dot(g, "#5a96d4", 6, 10, 20, 5); dot(g, "#2a5588", 6, 24, 20, 4); dot(g, "#1a3f6a", 6, 18, 20, 1.4); dot(g, "#cfe6f8", 12, 6, 8, 5); dot(g, "#ffffff", 13, 6.6, 3, 1.6);
      }
    },
    high(g) {
      telhados.base(g); halo(g);
      if (g.h(1) < 0.6) { // antena de TV: mastro com varetas e fio
        longShadow(g, 8, 3, 16, 26);
        dot(g, "#4a526a", 9, 26, 14, 3); dot(g, "#cfd6e4", 14.6, 5, 2.8, 22);
        for (const [y0, hw] of [[7, 11], [12, 9], [17, 7], [22, 5]]) { dot(g, "#8a93ab", 16 - hw, y0, hw * 2, 1.8); dot(g, "#e8edf6", 16 - hw, y0, hw * 2, 0.8); }
        g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 6); g.ctx.lineTo(g.x + 2, g.y + 3); stroke(g, "#2a2e3a", 1);
      } else { // poste com fios
        longShadow(g, 9, 3, 14, 26);
        dot(g, "#6a4a2e", 14, 6, 4, 23); dot(g, "#4a3320", 14, 6, 1.4, 23); dot(g, "#6a4a2e", 6, 9, 20, 2.6); dot(g, "#8a6a44", 6, 9, 20, 1);
        for (const x of [8, 16, 24]) dot(g, "#d9dde8", x - 1, 6.6, 2, 3.2);
        g.ctx.beginPath(); g.ctx.moveTo(g.x, g.y + 8); g.ctx.lineTo(g.x + 8, g.y + 9.6); g.ctx.lineTo(g.x + 16, g.y + 8.4); g.ctx.lineTo(g.x + 24, g.y + 9.6); g.ctx.lineTo(g.x + T, g.y + 8); stroke(g, "#1e222c", 1);
      }
    },
  };

  // 5. Praça da vila: calçada de pedras claras, casinhas coloridas em volta, gradis de ferro, bancos, canteiros, plátanos e postes de luz
  const PASTEL = [["#d8957a", "#f0b9a0", "#8c5640", "#b57a62"], ["#7fa9c4", "#a8cde2", "#4e7894", "#6a92ac"], ["#d9c060", "#ecd88a", "#9a8434", "#bda548"], ["#a994cc", "#c9b8e6", "#6e5a94", "#8b78b0"]];
  const praca = {
    place: "Praça da vila", blurb: "a praça da vila: calçada de pedras, casinhas coloridas, bancos, gradis de ferro, plátanos e postes de luz",
    nest: { rim: "#7a5230", twig: "#c09a5c", lining: "#f6e2b0" },
    mover: { wall: ["#5a6fd0", "#8aa0f0", "#2a3a80"], door: ["#d07a3a", "#f0a468", "#7a3a10"] }, rail: ["#4a4034", "#14100c"],
    wind: { tint: "rgba(255,255,255,.14)", rgb: "255,255,255" },
    base(g) { checker(g, "#dcd5c3", "#d6cfbc"); },
    floor(g) {
      praca.base(g);
      const o = g.r & 1 ? 8 : 0;
      dot(g, "#bfb69f", 0, 15, T, 1); dot(g, "#bfb69f", 0, T - 1, T, 1); dot(g, "#bfb69f", (o + 8) % 32, 0, 1, 15); dot(g, "#bfb69f", (o + 24) % 32, 0, 1, 15); dot(g, "#bfb69f", (o + 16) % 32, 16, 1, 15);
      if (g.h(1) < 0.2) dot(g, "rgba(255,255,255,.35)", 3 + ((g.h(2) * 20) | 0), 3 + ((g.h(3) * 10) | 0), 6, 2);
      if (g.h(4) > 0.94) { circle(g, "#7fbf5a", 16, 16, 2.4); circle(g, "#ff9ec4", 17, 15, 1.4); } // florzinha que brotou entre as pedras
      contact(g);
    },
    wall(g) {
      const k = PASTEL[Math.min(3, (hv(g.c >> 2, g.r >> 2, 8) * 4) | 0)];
      block(g, k[0], k[1], k[2], k[3]);
      const front = !g.solid(g.c, g.r + 1);
      if (!g.solid(g.c, g.r - 1)) { dot(g, "#b4604d", 0, 0, T, 8); dot(g, "#8f4636", 0, 7, T, 1); dot(g, "#cf7c68", 0, 0, T, 2); }
      if (front) { dot(g, "#f4f0e2", 7, 12, 8, 11); dot(g, "#7fb4d8", 8, 13, 6, 9); dot(g, "#f4f0e2", 18, 12, 8, 11); dot(g, "#7fb4d8", 19, 13, 6, 9); dot(g, "#ffffff", 10.6, 13, 0.8, 9); dot(g, "#ffffff", 21.6, 13, 0.8, 9); }
      else if (g.h(3) < 0.25) { dot(g, "#f4f0e2", 9, 10, 14, 12); dot(g, "#7fb4d8", 11, 12, 10, 8); dot(g, "#ffffff", 15.6, 12, 1, 8); }
    },
    muro(g) { railM(g, praca.base, { iron: "#3a3f4c", light: "#6f7788" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // banco de praça
        soft(g, 3, 13, 26, 15);
        dot(g, "#4a4f5c", 4, 22, 3, 6); dot(g, "#4a4f5c", 25, 22, 3, 6);
        dot(g, "#7a4e26", 3, 11, 26, 4); dot(g, "#b8803f", 3, 11, 26, 2); dot(g, "#8a5a2c", 3, 17, 26, 3); dot(g, "#c8903f", 3, 17, 26, 1.4); dot(g, "#8a5a2c", 3, 21, 26, 3); dot(g, "#c8903f", 3, 21, 26, 1.2);
      } else if (v < 0.75) { // canteiro de flores
        soft(g, 4, 11, 24, 17);
        dot(g, "#8a8a96", 4, 11, 24, 16); dot(g, "#5a3a22", 6, 13, 20, 12);
        for (const [fx, fy, k] of [[10, 17, "#ff6a8a"], [16, 15, "#ffd23a"], [22, 17, "#ffffff"], [13, 22, "#c79bff"], [20, 22, "#ff6a8a"]]) { circle(g, "#4f9a4a", fx, fy + 2, 2.6); circle(g, k, fx, fy, 2.6); }
        dot(g, "#b8b8c4", 4, 11, 24, 1.6);
      } else { // lata de lixo verde
        softDisc(g, 16, 22, 9);
        circle(g, "#3f7a52", 16, 18, 9.4); circle(g, "#5fa878", 16, 17, 8); circle(g, "#2f6a42", 16, 17, 5.4); dot(g, "#8fd0a8", 10, 12, 4, 1.4); dot(g, "#2a4a34", 13, 17, 6, 2);
      }
    },
    high(g) {
      praca.base(g); halo(g);
      if (g.h(1) < 0.6) { // plátano de copa larga
        treeShadow(g, 16, 14, 13);
        dot(g, "#6a4a2e", 13.5, 20, 5, 11); dot(g, "#3f2a16", 13.5, 20, 1.6, 11);
        circle(g, "#2f7d3c", 16, 14, 13.4); circle(g, "#4aa050", 15, 12, 11); circle(g, "#79c868", 11, 9, 6.6); circle(g, "#a6e08a", 9, 7, 2.4); circle(g, "#a6e08a", 18, 6, 1.9);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,220,.5)", 1.6);
      } else { // poste de luz antigo
        longShadow(g, 10, 3, 12, 26);
        dot(g, "#2f3440", 13, 27, 6, 3); dot(g, "#3a3f4c", 14.6, 10, 2.8, 18); dot(g, "#6f7788", 14.6, 10, 0.9, 18);
        dot(g, "#3a3f4c", 9, 8, 14, 2.4); polygon(g, "#3a3f4c", [11, 8, 21, 8, 19, 2, 13, 2]); polygon(g, "#ffe9a0", [12.6, 7.4, 19.4, 7.4, 18, 3.2, 14, 3.2]); dot(g, "#ffffff", 14, 3.6, 2, 3);
      }
    },
  };

  // 6. Parque e coreto: alamedas de saibro entre gramados, canteiros floridos com borda de pedra, sebes de cipreste, bancos e o telhado do coreto
  const parque = {
    place: "Parque e coreto", blurb: "o parque: alamedas de saibro, canteiros floridos, sebes altas, bancos e o coreto",
    nest: { rim: "#7a5230", twig: "#b89458", lining: "#f2deac" },
    mover: { wall: ["#c46a4f", "#e8957c", "#6a2e1e"], door: ["#4f8ac4", "#7fb2e6", "#1f4a7a"] }, rail: ["#5a4a3a", "#1a140e"],
    wind: { tint: "rgba(255,255,255,.12)", rgb: "255,255,255" },
    path: (g) => g.c % 8 === 3 || g.r % 8 === 3,
    base(g) { if (parque.path(g)) checker(g, "#e6d9b4", "#e0d2aa"); else checker(g, "#7fba8c", "#78b585"); },
    floor(g) {
      parque.base(g);
      if (parque.path(g)) { dot(g, "#cfc196", 4 + ((g.h(1) * 22) | 0), 4 + ((g.h(2) * 22) | 0), 2, 2); dot(g, "#cfc196", 6 + ((g.h(3) * 20) | 0), 8 + ((g.h(4) * 18) | 0), 3, 2); if (g.r % 8 === 3 && g.c % 8 !== 3) { dot(g, "rgba(0,0,0,.09)", 0, 0, T, 2); dot(g, "rgba(0,0,0,.09)", 0, T - 2, T, 2); } else if (g.c % 8 === 3 && g.r % 8 !== 3) { dot(g, "rgba(0,0,0,.09)", 0, 0, 2, T); dot(g, "rgba(0,0,0,.09)", T - 2, 0, 2, T); } }
      else {
        if (g.h(1) < 0.35) { const tx = 5 + ((g.h(2) * 20) | 0); dot(g, "#5f9a72", tx, 8, 1.4, 4); dot(g, "#5f9a72", tx + 3, 9, 1.4, 3.5); }
        if (g.h(5) < 0.2) { const fx = 6 + ((g.h(6) * 18) | 0), fy = 6 + ((g.h(7) * 18) | 0), k = pick(["#ff9ec4", "#ffffff", "#ffd23a"], g.h(8)); dot(g, k, fx - 1.5, fy, 3, 1.4); dot(g, k, fx, fy - 1.5, 1.4, 3); }
      }
      contact(g);
    },
    wall(g) {
      block(g, "#2f6f5a", "#52a088", "#1d4538", "#285c4a");
      circle(g, "#3d8a70", 9 + g.h(2) * 6, 10 + g.h(3) * 6, 6.5); circle(g, "#3d8a70", 22 - g.h(4) * 5, 21 - g.h(5) * 6, 6.5); circle(g, "#4a9c80", 14 + g.h(6) * 6, 16, 4.6);
      dot(g, "rgba(255,255,255,.1)", 4, 5, 10, 2);
    },
    muro(g) { hedgeM(g, parque.base, { dark: "#3a8a5a", mid: "#5cae74", light: "#8fd49a", dots: ["#ff7fa8", "#ffd23a", "#ffffff", "#c79bff"], dotP: 0.95, edge: "#d9cfae" }); },
    crate(g) {
      if (g.h(4) < 0.6) { // banco de parque, de lado
        soft(g, 3, 14, 26, 14);
        dot(g, "#4a4f5c", 5, 21, 3, 7); dot(g, "#4a4f5c", 24, 21, 3, 7);
        dot(g, "#7a4e26", 3, 11, 26, 3); dot(g, "#b8803f", 3, 11, 26, 1.4); dot(g, "#8a5a2c", 3, 15, 26, 3); dot(g, "#c8903f", 3, 15, 26, 1.2); dot(g, "#8a5a2c", 3, 19, 26, 3); dot(g, "#4a4f5c", 3, 9, 3, 14); dot(g, "#4a4f5c", 26, 9, 3, 14);
      } else { // marco de pedra com a placa do parque
        soft(g, 6, 10, 20, 19);
        dot(g, "#9a9a9a", 6, 12, 20, 16); dot(g, "#c4c4c0", 6, 12, 20, 3); dot(g, "#6a6a6a", 6, 24, 20, 4); dot(g, "#e8e4d4", 9, 16, 14, 7); dot(g, "#5a8a6a", 11, 18, 10, 1.4); dot(g, "#5a8a6a", 11, 20.6, 7, 1.4);
      }
    },
    high(g) {
      parque.base(g); halo(g);
      if (g.h(1) < 0.55) { // árvore grande de copa redonda
        treeShadow(g, 16, 14, 13);
        dot(g, "#6a4a2e", 13.5, 20, 5, 11); dot(g, "#3f2a16", 13.5, 20, 1.6, 11);
        circle(g, "#2f8a4a", 16, 14, 13); circle(g, "#4aaa60", 15, 12, 11); circle(g, "#7bd08a", 12, 9, 6.4); circle(g, "#b4eebc", 10, 7, 2.2);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,230,.5)", 1.6);
      } else { // telhado do coreto, de cima: cone vermelho com frisos brancos e um pináculo
        treeShadow(g, 16, 15, 13);
        circle(g, "#f4f0e6", 16, 16, 13.4); circle(g, "#c0463a", 16, 16, 12); circle(g, "#d9584a", 15, 15, 9.6); circle(g, "#e8786a", 14, 14, 6); circle(g, "#fff3d6", 16, 16, 2.2);
        g.ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; g.ctx.moveTo(g.x + 16, g.y + 16); g.ctx.lineTo(g.x + 16 + Math.cos(a) * 12, g.y + 16 + Math.sin(a) * 12); } stroke(g, "rgba(255,255,255,.55)", 1.2);
      }
    },
  };

  // 7. Milharal: terra seca em sulcos entre fileiras de milho alto, paredes de celeiro vermelho, fardos de feno, carvalho solitário e poste de espantalho
  const milharal = {
    place: "Milharal", blurb: "o milharal: sulcos de terra seca, milho alto de espigas douradas, celeiro vermelho e fardos de feno",
    nest: { rim: "#7a5230", twig: "#c4a25c", lining: "#f4e2a8" },
    mover: { wall: ["#3a6fc4", "#6a9ae6", "#1a3a7a"], door: ["#c44f9a", "#e67fbe", "#6a1f4e"] }, rail: ["#5a4a30", "#1a140a"],
    wind: { tint: "rgba(255,240,180,.15)", rgb: "255,246,206" },
    base(g) { checker(g, "#c2a96f", "#bda468"); },
    floor(g) {
      milharal.base(g);
      if (g.c & 1) dot(g, "rgba(90,66,24,.16)", 0, 0, 5, T);
      dot(g, "rgba(255,244,200,.14)", 10, 0, 2, T);
      if (g.h(1) < 0.3) dot(g, "#8a9a4a", 4 + ((g.h(2) * 22) | 0), 6 + ((g.h(3) * 18) | 0), 2.4, 3);
      if (g.h(4) < 0.2) { dot(g, "#e8c84a", 7 + ((g.h(5) * 16) | 0), 20 + ((g.h(6) * 8) | 0), 2, 1.4); dot(g, "#e8c84a", 15 + ((g.h(7) * 12) | 0), 12 + ((g.h(8) * 8) | 0), 2, 1.4); }
      contact(g);
    },
    wall(g) {
      block(g, "#a9453a", "#d97a68", "#5e1f18", "#7e2f26");
      g.ctx.fillStyle = "#7e2f26"; for (let x = 5; x < T; x += 7) g.rect(g.x + x, g.y + 4, 1, T - 8);
      if (!g.solid(g.c, g.r + 1) && g.h(3) < 0.35) { dot(g, "#f4efe0", 5, 5, 22, 22); dot(g, "#8a3a2c", 7, 7, 18, 18); g.ctx.beginPath(); g.ctx.moveTo(g.x + 7, g.y + 7); g.ctx.lineTo(g.x + 25, g.y + 25); g.ctx.moveTo(g.x + 25, g.y + 7); g.ctx.lineTo(g.x + 7, g.y + 25); stroke(g, "#f4efe0", 2); }
      else if (g.h(4) < 0.15) { dot(g, "#f4efe0", 9, 8, 14, 10); dot(g, "#3a2a24", 11, 10, 10, 6); }
    },
    muro(g) { stalkM(g, milharal.base, { kind: "corn", dark: "#2f6e2a", stalk: ["#4f9a3a", "#5fb048"], leaf: "#7fcf5a", head: "#f0c43a", head2: "#fff0a0" }); },
    crate(g) {
      if (g.h(4) < 0.6) { // fardo de feno quadrado, amarrado com barbante
        soft(g, 4, 10, 25, 19);
        dot(g, "#a88a2a", 4, 10, 24, 18); dot(g, "#e6c64a", 5, 11, 22, 14); dot(g, "#f6dc72", 5, 11, 22, 3);
        g.ctx.strokeStyle = "#a88a2a"; g.ctx.lineWidth = 1; g.ctx.beginPath(); for (let i = 0; i < 4; i++) { g.ctx.moveTo(g.x + 7 + i * 5, g.y + 13); g.ctx.lineTo(g.x + 9 + i * 5, g.y + 25); } g.ctx.stroke();
        dot(g, "#6a5a2a", 10, 11, 1.6, 14); dot(g, "#6a5a2a", 21, 11, 1.6, 14);
      } else { // cesto de espigas de milho
        softDisc(g, 16, 22, 10);
        polygon(g, "#9a6a36", [6, 14, 26, 14, 23, 28, 9, 28]); dot(g, "#c4904c", 6, 12, 20, 3); g.ctx.fillStyle = "#7a5226"; for (let i = 0; i < 4; i++) g.rect(g.x + 9 + i * 4.4, g.y + 16, 1, 11);
        for (const [cx, cy] of [[10, 10], [16, 8], [22, 10]]) { dot(g, "#f0c43a", cx - 2, cy - 4, 4, 9); dot(g, "#fff0a0", cx - 2, cy - 4, 1.4, 9); dot(g, "#5fb048", cx - 2.4, cy + 3, 5, 3); }
      }
    },
    high(g) {
      milharal.base(g); halo(g);
      if (g.h(1) < 0.55) { // carvalho solitário
        treeShadow(g, 16, 14, 13);
        dot(g, "#5a3d22", 13, 21, 6, 10); dot(g, "#3a2616", 13, 21, 2, 10); dot(g, "#5a3d22", 10, 28, 4, 3); dot(g, "#5a3d22", 18, 28, 4, 3);
        circle(g, "#4a7a2a", 16, 14, 13); circle(g, "#6a9a34", 15, 12, 11); circle(g, "#a0c850", 12, 9, 6.4); circle(g, "#c4e070", 10, 7, 2.2);
        g.ctx.beginPath(); g.ctx.arc(g.x + 15, g.y + 12, 11, Math.PI * 1.05, Math.PI * 1.6); stroke(g, "rgba(255,255,200,.5)", 1.6);
      } else { // poste de cerca com a travessa e o chapéu de palha
        longShadow(g, 7, 4, 18, 25);
        dot(g, "#7a5530", 14, 10, 4, 19); dot(g, "#4a3320", 14, 10, 1.4, 19); dot(g, "#7a5530", 5, 14, 22, 3.4); dot(g, "#a07848", 5, 14, 22, 1.2);
        polygon(g, "#e8c64a", [8, 8, 24, 8, 21, 3, 11, 3]); dot(g, "#f6dc72", 8, 7.4, 16, 1.6); dot(g, "#c4a030", 12, 4, 8, 1);
        dot(g, "#e8c64a", 3, 15, 3, 4); dot(g, "#e8c64a", 26, 15, 3, 4);
      }
    },
  };

  // 8. Campo de trigo e espantalhos: restolho dourado, pedras grandes, trigo alto balançando, fardos redondos e espantalhos de braços abertos
  const trigal = {
    place: "Campo de trigo e espantalhos", blurb: "o campo de trigo: restolho dourado, trigo alto ao vento, fardos redondos, pedras e espantalhos",
    nest: { rim: "#7a5230", twig: "#c9a460", lining: "#f6e6b0" },
    mover: { wall: ["#4a7ac4", "#7aa4e6", "#1f3e7a"], door: ["#c4604a", "#e68f7a", "#6a2a1a"] }, rail: ["#6a5a38", "#1c150a"],
    wind: { tint: "rgba(255,238,170,.18)", rgb: "255,250,220" },
    base(g) { checker(g, "#e0c470", "#dbbf68"); },
    floor(g) {
      trigal.base(g);
      g.ctx.fillStyle = "#c9a64e"; for (let i = 0; i < 4; i++) g.rect(g.x + 2 + g.h(1 + i) * 26, g.y + 3 + g.h(5 + i) * 24, 1.2, 4);
      if (g.h(9) < 0.25) dot(g, "#efd88a", 4 + ((g.h(10) * 14) | 0), 8 + ((g.h(11) * 14) | 0), 10, 2);
      if (g.h(12) > 0.93) circle(g, "#a39a82", 8 + g.h(13) * 16, 8 + g.h(14) * 16, 2.4);
      contact(g);
    },
    wall(g) {
      block(g, "#a8805a", "#d4a878", "#6a4a2e", "#8a6444");
      circle(g, "#b88e66", 9 + g.h(2) * 6, 10 + g.h(3) * 6, 8); circle(g, "#c89e76", 8 + g.h(2) * 6, 9 + g.h(3) * 6, 5); circle(g, "#8a6444", 22 - g.h(4) * 5, 21 - g.h(5) * 5, 6);
      g.ctx.beginPath(); g.ctx.moveTo(g.x + 12, g.y + 6); g.ctx.lineTo(g.x + 15, g.y + 14); g.ctx.lineTo(g.x + 13, g.y + 20); stroke(g, "#5a3d22", 1);
      if (g.h(6) < 0.4) circle(g, "#7a9a4a", 24, 8, 2.6);
    },
    muro(g) { stalkM(g, trigal.base, { kind: "wheat", dark: "#a8821f", stalk: ["#d9b04a", "#e8c565"], leaf: "#c9a03a", head: "#f2d36a", head2: "#fff2b8" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // fardo redondo de palha, visto de frente
        softDisc(g, 16, 22, 10.6);
        circle(g, "#b08a22", 16, 18, 11); circle(g, "#e6c44a", 16, 17.4, 9.6); circle(g, "#f4da72", 16, 17, 6.4); circle(g, "#d9b43a", 16, 17, 3.2);
        g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 8, 0, 4.7); stroke(g, "#b08a22", 1); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 4.6, 1, 5.6); stroke(g, "#b08a22", 1);
      } else if (v < 0.75) { // pedra com tufos de capim
        soft(g, 5, 14, 22, 14);
        circle(g, "#7e7868", 16, 20, 9.4); circle(g, "#a39d8c", 15, 18, 8.2); circle(g, "#c0baa8", 12, 15, 3.4);
        dot(g, "#7a9a3a", 5, 21, 1.6, 6); dot(g, "#7a9a3a", 8, 23, 1.6, 4); dot(g, "#7a9a3a", 24, 22, 1.6, 5);
      } else { // feixe de trigo amarrado
        soft(g, 8, 12, 17, 17);
        g.ctx.fillStyle = "#d9b43a"; g.ctx.beginPath(); for (let i = 0; i < 5; i++) { g.ctx.moveTo(g.x + 10 + i * 3, g.y + 28); g.ctx.lineTo(g.x + 6 + i * 5, g.y + 6); g.ctx.lineTo(g.x + 9 + i * 5, g.y + 6); g.ctx.lineTo(g.x + 13 + i * 3, g.y + 28); g.ctx.closePath(); } g.ctx.fill();
        dot(g, "#f6e08a", 7, 5, 18, 5); dot(g, "#a8821f", 9, 17, 14, 2.4); dot(g, "#c25f4a", 12, 17, 8, 2.4);
      }
    },
    high(g) {
      trigal.base(g); halo(g);
      if (g.h(1) < 0.6) { // espantalho: poste, braços abertos, camisa xadrez e chapéu de palha
        longShadow(g, 4, 3, 24, 26);
        dot(g, "#7a5530", 14.6, 8, 3, 22); dot(g, "#5a3d22", 14.6, 8, 1, 22); dot(g, "#7a5530", 3, 12, 26, 3.4); dot(g, "#a07848", 3, 12, 26, 1.2);
        dot(g, "#c4483a", 9, 11, 14, 11); dot(g, "#e8685a", 9, 11, 14, 2); g.ctx.fillStyle = "#8a2a24"; g.rect(g.x + 12, g.y + 11, 1.4, 11); g.rect(g.x + 17, g.y + 11, 1.4, 11); g.rect(g.x + 9, g.y + 15, 14, 1.4); g.rect(g.x + 9, g.y + 19, 14, 1.4);
        dot(g, "#e8c64a", 2, 11, 4, 3); dot(g, "#e8c64a", 26, 11, 4, 3); dot(g, "#e8c64a", 11, 22, 3, 5); dot(g, "#e8c64a", 18, 22, 3, 5);
        circle(g, "#f2d9a0", 16, 7, 4); dot(g, "#3a2a20", 14, 6, 1.2, 1.2); dot(g, "#3a2a20", 17.6, 6, 1.2, 1.2);
        polygon(g, "#d9b43a", [8, 5, 24, 5, 21, 0.6, 11, 0.6]); dot(g, "#a8821f", 11, 3.6, 10, 1.2);
      } else { // árvore baixa e torta, de copa clara
        treeShadow(g, 16, 14, 12);
        dot(g, "#6a4a2e", 14, 20, 4, 10); dot(g, "#6a4a2e", 11, 17, 4, 3);
        circle(g, "#7a9a2a", 15, 14, 12); circle(g, "#9ab83a", 14, 12, 10); circle(g, "#c4dc60", 11, 9, 5.4); circle(g, "#7a9a2a", 22, 10, 6);
      }
    },
  };

  // 9. Lago e juncos: margem lamacenta azul-esverdeada com seixos, pedras cobertas de musgo, juncos altos, vitórias-régias e o lago em volta do mapa
  const lago = {
    place: "Lago e juncos", blurb: "o lago: margem molhada com seixos, juncos altos, pedras de musgo, vitórias-régias e água em volta",
    nest: { rim: "#6e5238", twig: "#b8a066", lining: "#eee2b4" },
    mover: { wall: ["#c46a3a", "#e8946a", "#6a2e14"], door: ["#7a5ac4", "#a58ae6", "#3a2a7a"] }, rail: ["#4a5a4a", "#101810"],
    wind: { tint: "rgba(220,244,255,.16)", rgb: "235,250,255" },
    base(g) { checker(g, "#8fb5ac", "#89b0a7"); },
    floor(g) {
      lago.base(g);
      if (g.h(1) < 0.4) { circle(g, "#7a9a92", 6 + g.h(2) * 20, 6 + g.h(3) * 20, 2); circle(g, "#a8c8c0", 8 + g.h(4) * 16, 10 + g.h(5) * 14, 1.6); circle(g, "#7a9a92", 20 + g.h(6) * 8, 20 + g.h(7) * 8, 2.2); }
      if (g.h(8) < 0.14) { dot(g, "#5e9ab8", 6 + g.h(9) * 12, 10 + g.h(10) * 10, 10, 6); dot(g, "#8cc4dc", 7 + g.h(9) * 12, 11 + g.h(10) * 10, 5, 1.4); }
      if (g.h(11) < 0.25) { const gx = 4 + ((g.h(12) * 22) | 0); dot(g, "#6a9a6a", gx, 8, 1.4, 5); dot(g, "#6a9a6a", gx + 3, 9, 1.4, 4); }
      contact(g);
    },
    wall(g) {
      if (g.border) { // o lago em volta do mapa
        const t = g.time || 0, s = Math.sin(t * 1.2 + g.c * 0.9 + g.r * 0.7) * 2;
        dot(g, "#3f8fb8", 0, 0, T, T); dot(g, "#5aa8cc", 0, 0, T, 3);
        dot(g, "rgba(255,255,255,.55)", 4 + s, 8, 10, 1.4); dot(g, "rgba(255,255,255,.45)", 14 - s, 17, 12, 1.4); dot(g, "rgba(255,255,255,.4)", 6 + s, 26, 9, 1.4);
        return;
      }
      block(g, "#7b8a82", "#aebdb4", "#4d5a54", "#64736c");
      circle(g, "#8a9a92", 9 + g.h(2) * 6, 10 + g.h(3) * 6, 7.6); circle(g, "#9aaaa2", 8 + g.h(2) * 6, 9 + g.h(3) * 6, 4.6); circle(g, "#6c7b74", 22 - g.h(4) * 5, 21 - g.h(5) * 5, 6);
      circle(g, "#5f8a58", 5 + g.h(6) * 20, 6 + g.h(7) * 20, 3.4); circle(g, "#74a46a", 7 + g.h(6) * 20, 8 + g.h(7) * 20, 2);
    },
    muro(g) { stalkM(g, lago.base, { kind: "reed", dark: "#4a7a52", stalk: ["#7aa85a", "#8ebb6a"], leaf: "#a0cf78", head: "#6a4a2a", head2: "#8a6a3a" }); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // vitória-régia com uma flor
        circle(g, "rgba(20,70,90,.25)", 17, 21, 11); circle(g, "#2f8a52", 16, 18, 11); circle(g, "#4aae6a", 16, 17.6, 9.6); g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 17); g.ctx.lineTo(g.x + 26, g.y + 14); g.ctx.lineTo(g.x + 26, g.y + 20); g.ctx.closePath(); g.ctx.fillStyle = "#7fbfb0"; g.ctx.fill();
        for (let i = 0; i < 6; i++) { const a = i * 1.05; circle(g, "#ffb8d4", 13 + Math.cos(a) * 3, 16 + Math.sin(a) * 2.4, 1.9); } circle(g, "#ffe27a", 13, 16, 1.5);
      } else if (v < 0.75) { // pedra redonda
        softDisc(g, 16, 22, 10);
        circle(g, "#6a7a74", 16, 19, 10); circle(g, "#8c9c94", 15, 17.6, 8.6); circle(g, "#aebdb4", 12, 14, 3.4); dot(g, "#5f8a58", 18, 22, 5, 2.4);
      } else { // tronco caído na margem
        soft(g, 3, 14, 27, 13);
        dot(g, "#6a4a2e", 3, 13, 26, 11); dot(g, "#8f6a44", 3, 13, 26, 3.4); dot(g, "#4e351f", 3, 21, 26, 3); circle(g, "#c4a070", 26.5, 18.6, 5.2); circle(g, "#8f6a44", 26.5, 18.6, 3); circle(g, "#c4a070", 26.5, 18.6, 1.4);
      }
    },
    high(g) {
      lago.base(g); halo(g);
      if (g.h(1) < 0.65) { // tufo de juncos altos com espigas marrons
        longShadow(g, 5, 4, 22, 24);
        const ys = [[8, 28, 6, 4], [14, 28, 12, 3], [20, 28, 24, 5], [11, 28, 3, 7], [24, 28, 28, 8], [17, 28, 17, 2]];
        for (const [x0, y0, x1, y1] of ys) line(g, "#4a8a52", 2.2, x0, y0, x1, y1 + 2);
        for (const [x0, y0, x1, y1] of ys.slice(0, 5)) { dot(g, "#6a4a2a", x1 - 1.6, y1, 3.2, 7); dot(g, "#8a6a3a", x1 - 1.6, y1, 1.2, 7); }
        dot(g, "#a0cf78", 3, 26, 26, 2.4);
      } else { // galho seco de árvore caída
        longShadow(g, 3, 8, 27, 18);
        line(g, "#4e351f", 6, 2, 22, 30, 14); line(g, "#8f6a44", 4, 2, 21, 30, 13); line(g, "#8f6a44", 2.4, 14, 17, 22, 7); line(g, "#8f6a44", 2.4, 22, 14, 28, 20); line(g, "#c4a070", 1, 3, 20, 28, 12);
        circle(g, "#5f8a58", 8, 20, 2.4); circle(g, "#74a46a", 24, 12, 2);
      }
    },
  };

  // 10. Mata de pinheiros: manta de agulhas verde-escura, troncos grossos, cercas de toras, tocos, cogumelos e pinheiros em camadas
  const pinhal = {
    place: "Mata de pinheiros", blurb: "a mata de pinheiros: agulhas no chão, troncos grossos, cercas de toras, tocos, cogumelos e pinheiros altos",
    nest: { rim: "#5e4228", twig: "#a8844e", lining: "#e8d49c" },
    mover: { wall: ["#c47a3a", "#e8a46a", "#6a3a14"], door: ["#3a8ac4", "#6ab2e6", "#14447a"] }, rail: ["#4a3a2a", "#100c08"],
    wind: { tint: "rgba(235,255,235,.12)", rgb: "240,255,240" },
    base(g) { checker(g, "#5f7d4f", "#5a784a"); },
    floor(g) {
      pinhal.base(g);
      g.ctx.strokeStyle = "#47663a"; g.ctx.lineWidth = 1; g.ctx.beginPath(); for (let i = 0; i < 3; i++) { const x = 3 + g.h(1 + i) * 24, y = 4 + g.h(4 + i) * 22; g.ctx.moveTo(g.x + x, g.y + y); g.ctx.lineTo(g.x + x + 5, g.y + y + 2 + g.h(7 + i) * 2); } g.ctx.stroke();
      if (g.h(10) < 0.18) { const cx = 6 + g.h(11) * 18, cy = 8 + g.h(12) * 14; dot(g, "#8a6a3a", cx, cy, 5, 3); dot(g, "#a98a56", cx + 1, cy, 3, 1.2); }
      if (g.h(13) < 0.07) { dot(g, "#f4efe0", 14 + g.h(14) * 8, 18, 2, 3); dot(g, "#d9483b", 12.6 + g.h(14) * 8, 15, 5, 3); }
      contact(g);
    },
    wall(g) {
      block(g, "#6a4a2e", "#9a7448", "#3a2616", "#4e351f");
      g.ctx.fillStyle = "#4e351f"; g.rect(g.x + 6 + g.h(2) * 3, g.y, 1.6, T); g.rect(g.x + 15, g.y + 2, 1.6, T - 2); g.rect(g.x + 22 + g.h(3) * 3, g.y, 1.6, T);
      if (all4(g) || g.h(4) < 0.2) { circle(g, "#4e351f", 16, 16, 9); circle(g, "#c4a070", 16, 16, 7.6); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 16, 4.6, 0, TAU); stroke(g, "#8f6a44", 1); circle(g, "#8f6a44", 16, 16, 1.6); }
    },
    muro(g) { fenceM(g, pinhal.base, { wood: "#8a6a44", light: "#b08a60", dark: "#3e2a18", post: "#6e4e30" }, "rail"); },
    crate(g) {
      const v = g.h(4);
      if (v < 0.4) { // toco de pinheiro
        softDisc(g, 16, 22, 10);
        circle(g, "#5a3d22", 16, 19, 10); circle(g, "#cfa56e", 16, 17, 9); circle(g, "#e2bf88", 16, 17, 6.4); g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 17, 3.8, 0, TAU); stroke(g, "#a88454", 1);
      } else if (v < 0.75) { // pedra coberta de musgo
        soft(g, 5, 14, 22, 14);
        circle(g, "#6a6e68", 16, 20, 9.6); circle(g, "#8a8e86", 15, 18, 8.2); circle(g, "#4a7a3a", 12, 14, 4.6); circle(g, "#5f9a4a", 20, 17, 3);
      } else { // cogumelos vermelhos
        soft(g, 6, 16, 20, 12);
        dot(g, "#f4efe0", 9, 15, 3, 10); circle(g, "#d9483b", 10.5, 14, 6); circle(g, "#ffffff", 8.6, 12.6, 1.2); circle(g, "#ffffff", 12.6, 15, 1);
        dot(g, "#f4efe0", 19, 18, 2.6, 8); circle(g, "#e8685a", 20.3, 17, 4.6); circle(g, "#ffffff", 19, 15.8, 1);
      }
    },
    high(g) {
      pinhal.base(g); halo(g);
      if (g.h(1) < 0.65) { // pinheiro em camadas
        longShadow(g, 4, 3, 24, 26);
        dot(g, "#5a3d22", 14, 26, 4, 5);
        polygon(g, "#1d5a3a", [16, 12, 29, 27, 3, 27]); polygon(g, "#27703f", [16, 7, 28, 21, 4, 21]); polygon(g, "#2f8148", [16, 2, 27, 15, 5, 15]);
        polygon(g, "rgba(150,230,170,.35)", [16, 2, 16, 15, 5, 15]); polygon(g, "rgba(150,230,170,.3)", [16, 7, 16, 21, 4, 21]); polygon(g, "rgba(150,230,170,.25)", [16, 12, 16, 27, 3, 27]);
      } else { // pinheiro velho, de tronco à mostra e galhos em cima
        longShadow(g, 5, 3, 22, 26);
        dot(g, "#5a3d22", 14, 14, 4, 17); dot(g, "#3a2616", 14, 14, 1.4, 17); dot(g, "#5a3d22", 9, 22, 5, 2.4); dot(g, "#5a3d22", 18, 19, 6, 2.4);
        circle(g, "#1d5a3a", 16, 8, 8); circle(g, "#2f8148", 14, 6.6, 6.6); circle(g, "#1d5a3a", 8, 21, 4.6); circle(g, "#2f8148", 7.4, 20, 3.4); circle(g, "#1d5a3a", 25, 19, 4.6); circle(g, "#2f8148", 24.4, 18, 3.4); circle(g, "#7fd09a", 12.6, 5, 1.6);
      }
    },
  };

  // ==== FIM DOS TEMAS 1 A 10 ====

  BT.register(1, jardim);
  BT.register(2, pomar);
  BT.register(3, horta);
  BT.register(4, telhados);
  BT.register(5, praca);
  BT.register(6, parque);
  BT.register(7, milharal);
  BT.register(8, trigal);
  BT.register(9, lago);
  BT.register(10, pinhal);
  if (typeof module === "object" && module.exports) module.exports = { ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] };
})(typeof window !== "undefined" ? window : globalThis);
