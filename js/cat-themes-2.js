// Ambientes das Fases 11 a 20 do Gatinho (0.18.0): celeiro, horta, borda da mata, riacho, vila de pescadores, docas, praia, telhados à noite, mercado à noite e a casa grande.
// Cada um é registrado com CatThemes.register(id, tema) (núcleo em js/cat-themes.js; as Fases 1 a 10 ficam em js/cat-themes-1.js). Só desenho: formas simples (retângulos e poucos
// círculos), cores fixas, sombras suaves e nada sorteado (tudo vem de g.h(k), então não pisca); g.time só mexe nas ondinhas, no brilho da água e na chuva (é 0 com "reduzir movimento").
//
// Como o jogo desenha (igual aos "caixas" do cachorrinho): o chão (floor) vai em TODOS os tiles; por cima dele vêm a parede (#), o obstáculo baixo (X = crate), o lugar alto (T = high) e a
// poça (~ = water). Por isso X e T são objetos com sombra sobre o chão que aparece em volta, e a poça/água cobre o tile inteiro (cor própria, diferente de qualquer chão).
// Convenções que valem para os 10 ambientes (para as fases lerem igual):
//   X (crate): objeto BAIXO e pequeno (até ~24 px), sombra curta e suave embaixo dele: o gatinho pula.
//   T (high):  objeto ALTO: topo bem claro com brilho na quina, face da frente mais escura, degraus/pilha, e SOMBRA LONGA para baixo e para a direita (sempre dentro do tile).
//   ~ (water): tile inteiro de água com borda, brilho e ondinhas; cada fase tem a cor da sua água.
//   night (Fases 18 e 19): o jogo escurece em volta do gatinho; por isso esses dois ambientes são mais claros e saturados, com janelas e lâmpadas acesas.
(function () {
  "use strict";
  const CT = typeof module === "object" && module.exports ? require("./cat-themes.js") : globalThis.CatThemes;
  const { dot, circle, pick, block, puddle } = CT.helpers;
  const T = 32;
  const hash = CT.hash;

  // ---------------------------------------------------------------------------------------------------------------------------------
  // auxiliares só destes ambientes (tudo dentro do tile de 32 px)
  const poly = (g, color, pts) => { const c = g.ctx; c.fillStyle = color; c.beginPath(); c.moveTo(g.x + pts[0][0], g.y + pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(g.x + pts[i][0], g.y + pts[i][1]); c.closePath(); c.fill(); };
  const ring = (g, color, cx, cy, rad, lw) => { const c = g.ctx; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.arc(g.x + cx, g.y + cy, rad, 0, Math.PI * 2); c.stroke(); };
  // sombra suave de um objeto baixo (duas camadas: borda mais leve e miolo mais forte)
  const soft = (g, x, y, w, h) => { dot(g, "rgba(0,0,0,.10)", x - 1, y - 1, w + 2, h + 2); dot(g, "rgba(0,0,0,.16)", x, y, w, h); };
  const softDisc = (g, cx, cy, rad) => { circle(g, "rgba(0,0,0,.10)", cx, cy, rad + 1.5); circle(g, "rgba(0,0,0,.16)", cx, cy, rad); };
  // poça/água rasa: tiles de água vizinhos formam UMA lagoa só (a borda fina só aparece onde o vizinho não é água; g.kind é o caractere do mapa)
  const wet = (g, dc, dr) => (g.kind ? g.kind(g.c + dc, g.r + dr) === "~" : false);
  function pond(g, base, shine, edge) {
    puddle(g, base, shine);
    if (!wet(g, 0, -1)) dot(g, edge, 0, 0, T, 2);
    if (!wet(g, 0, 1)) dot(g, edge, 0, T - 2, T, 2);
    if (!wet(g, -1, 0)) dot(g, edge, 0, 0, 2, T);
    if (!wet(g, 1, 0)) dot(g, edge, T - 2, 0, 2, T);
  }
  // sombra projetada COMPRIDA de um lugar alto: o mesmo retângulo do objeto, deslocado para baixo e para a direita em dois passos (nunca sai do tile)
  const cast = (g, x, y, w, h) => {
    for (const [dx, dy, a] of [[3, 5, ".13"], [6, 9, ".17"]]) {
      const sx = x + dx, sy = y + dy;
      dot(g, "rgba(0,0,0," + a + ")", sx, sy, Math.max(0, Math.min(w, T - sx)), Math.max(0, Math.min(h, T - sy)));
    }
  };
  const castDisc = (g, cx, cy, rad) => { circle(g, "rgba(0,0,0,.13)", cx + 5, cy + 6, rad); circle(g, "rgba(0,0,0,.16)", cx + 8, cy + 9, rad - 2); };
  // degrau/caixa alta: face de cima clara (com brilho na quina) e face da frente mais escura embaixo
  const raise = (g, x, y, w, h, d, top, front) => {
    dot(g, front, x, y + h, w, d);
    dot(g, top, x, y, w, h);
    dot(g, "rgba(255,255,255,.42)", x, y, w, 1.5);
    dot(g, "rgba(0,0,0,.20)", x, y + h, w, 1.5);
  };

  // ===============================================================================================================================
  // 11. Celeiro e curral: tábuas velhas com palha, baias de madeira vermelha, fardos de feno, pilha alta de fardos e bebedouro derramado
  const PALHA = ["#d9b94e", "#c9a23c", "#e6cf70"];
  CT.register(11, {
    place: "Celeiro e curral",
    blurb: "o celeiro e o curral: tábuas velhas, palha no chão, baias e fardos de feno",
    night: false,
    mover: { wall: ["#3f8f9a", "#74c0c9", "#1d4a52"], door: ["#e9dfc6", "#fff8e6", "#9c8f6e"] },
    rail: ["#4a3624", "#17100a"],
    floor(g) {
      dot(g, pick(["#9a8262", "#97805f", "#9d8565"], g.h(1)), 0, 0, T, T);
      dot(g, "rgba(60,40,20,.09)", 0, 8, T, 8); dot(g, "rgba(60,40,20,.09)", 0, 24, T, 8);                       // tábuas alternadas um pouco mais escuras
      for (const yy of [7, 15, 23, 31]) dot(g, "#6f5a40", 0, yy, T, 1);                                           // juntas das tábuas largas
      dot(g, "#6f5a40", 4 + Math.floor(g.h(2) * 22), 0, 1, 7); dot(g, "#6f5a40", 4 + Math.floor(g.h(3) * 22), 16, 1, 7); // emendas
      if (g.h(4) < 0.6) for (let i = 0; i < 3; i++) dot(g, pick(PALHA, g.h(5 + i)), 1 + Math.floor(g.h(8 + i) * 22), 2 + Math.floor(g.h(11 + i) * 27), 6 + Math.floor(g.h(14 + i) * 5), 1.5); // palha solta
      if (g.h(17) > 0.92) { dot(g, "#d9b94e", 8, 10, 10, 2); dot(g, "#c9a23c", 12, 13, 9, 2); dot(g, "#e6cf70", 7, 16, 11, 2); dot(g, "#c9a23c", 15, 9, 2, 9); } // montinho de palha
    },
    wall(g) { // baias: tábuas verticais de madeira vermelha com travessas e rodapé claro
      const { c, r } = g;
      block(g, "#8f3b2e", "#c05f48", "#4d1b14", "#5f261b");
      for (let i = 8; i < T; i += 8) dot(g, "#5a2218", i - 1, 4, 2, T - 8);
      dot(g, "#ab4b3a", 0, 11, T, 3); dot(g, "#ab4b3a", 0, 21, T, 3);
      dot(g, "#6a2a1e", 0, 14, T, 1); dot(g, "#6a2a1e", 0, 24, T, 1);
      if (!g.solid(c, r + 1)) {
        dot(g, "#e3d8bd", 0, T - 7, T, 2);
        if (g.h(2) < 0.4) { dot(g, "#d9b94e", 3 + Math.floor(g.h(3) * 16), T - 5, 7, 3); dot(g, "#c9a23c", 14 + Math.floor(g.h(4) * 10), T - 4, 5, 2); } // palha saindo da baia
      }
    },
    crate(g) { // X: fardo de feno (deitado ou em pé) ou balde de ração
      const v = g.h(3);
      if (v < 0.45) {
        soft(g, 5, 13, 24, 15);
        dot(g, "#c4a03c", 4, 9, 24, 17); dot(g, "#e7cd6e", 4, 9, 24, 6);
        dot(g, "#8a6a22", 10, 9, 2, 17); dot(g, "#8a6a22", 20, 9, 2, 17);
        dot(g, "#f4e3a0", 6, 11, 5, 1.5); dot(g, "#f4e3a0", 14, 12, 4, 1.5); dot(g, "#a98625", 6, 19, 4, 1.5); dot(g, "#a98625", 14, 21, 5, 1.5); dot(g, "#a98625", 23, 20, 3, 1.5);
      } else if (v < 0.82) {
        soft(g, 9, 9, 17, 21);
        dot(g, "#c4a03c", 8, 5, 17, 22); dot(g, "#e7cd6e", 8, 5, 17, 6);
        dot(g, "#8a6a22", 8, 13, 17, 2); dot(g, "#8a6a22", 8, 21, 17, 2);
        dot(g, "#f4e3a0", 10, 7, 5, 1.5); dot(g, "#f4e3a0", 17, 8, 4, 1.5); dot(g, "#a98625", 10, 17, 5, 1.5); dot(g, "#a98625", 16, 25, 5, 1.5);
      } else {
        softDisc(g, 16, 20, 9);
        circle(g, "#6b4a2b", 16, 17, 9); circle(g, "#8b6238", 16, 17, 7.6); circle(g, "#d9b94e", 16, 17, 5.6); circle(g, "#e6cf70", 14.5, 15.5, 2.4);
        dot(g, "#a98625", 18, 18, 1.5, 1.5); dot(g, "#a98625", 14, 19, 1.5, 1.5); ring(g, "#4e3319", 16, 17, 7.6, 1);
      }
    },
    high(g) { // T: pilha alta de fardos, em degraus
      const s = g.h(3) < 0.5 ? 0 : 4;
      cast(g, 1, 1, 24, 24);
      raise(g, 1, 11, 24, 6, 8, "#e3c65e", "#a98425");                               // fileira de baixo (larga)
      raise(g, 3 + s, 1, 17, 6, 5, "#f8e6a2", "#c9a43a");                           // fileira de cima, mais clara
      for (const xx of [6, 13, 20]) dot(g, "#6e5214", xx, 17, 1.5, 8);
      dot(g, "#8a6a22", 8 + s, 7, 1.5, 5); dot(g, "#8a6a22", 15 + s, 7, 1.5, 5);
      dot(g, "#cfae48", 3, 13, 6, 1.5); dot(g, "#cfae48", 14, 14, 7, 1.5); dot(g, "#e6c870", 6 + s, 3, 6, 1.5); dot(g, "#e6c870", 15 + s, 4, 5, 1.5);
      dot(g, "#d9b94e", 23, 25, 6, 1.5);
    },
    water(g) { // ~: bebedouro derramado
      pond(g, "#6f98ad", "#d6ecf4", "#4e3b28");
      if (g.h(3) < 0.3) { dot(g, "#7a5634", 0, 0, T, 5); dot(g, "#a67c4c", 0, 0, T, 1.5); dot(g, "#4e3b28", 0, 5, T, 1); }   // beira do cocho de madeira
      dot(g, "#d9b94e", 6 + Math.floor(g.h(4) * 10), 14 + Math.floor(g.h(5) * 8), 6, 1.5); dot(g, "#c9a23c", 17 + Math.floor(g.h(6) * 6), 20, 5, 1.5); // palha boiando
    },
  });

  // ===============================================================================================================================
  // 12. Horta e galinheiro: canteiros em fileiras, cercas de arame e tela, cestos e baldes, poleiro alto e espantalho
  const CULTURA = [["#4f9a3c", "#86d160"], ["#e0832e", "#5fae45"], ["#9a3b6a", "#5fae45"]]; // alface, cenoura, beterraba
  CT.register(12, {
    place: "Horta e galinheiro",
    blurb: "a horta e o galinheiro: canteiros, cercas de arame, cestos e poleiros",
    night: false,
    mover: { wall: ["#8a5aa8", "#b88ad0", "#4a2c64"], door: ["#e8e2cc", "#fffaf0", "#a39d84"] },
    rail: ["#3c2e22", "#120d09"],
    floor(g) {
      const { c, r } = g;
      dot(g, (c + r) % 2 ? "#7d573a" : "#805a3c", 0, 0, T, T);
      dot(g, "#694a31", 0, 11, T, 5); dot(g, "#694a31", 0, 27, T, 5);                   // sulcos entre as fileiras
      dot(g, "#936b49", 0, 0, T, 2); dot(g, "#936b49", 0, 16, T, 2);                    // crista iluminada de cada fileira
      const cultura = CULTURA[(r + (c >> 3)) % 3];
      for (let row = 0; row < 2; row++) {
        if (g.h(1 + row) > 0.78) continue;
        const px = 6 + Math.floor(g.h(3 + row) * 6);
        for (let k = 0; k < 2; k++) { const cx = px + k * 14 + (k ? Math.floor(g.h(5 + row) * 4) : 0), cy = 6 + row * 16; circle(g, cultura[0], cx, cy, 3); circle(g, cultura[1], cx - 0.8, cy - 0.8, 1.5); }
      }
      if (g.h(7) > 0.92) dot(g, "#a9a597", 6 + Math.floor(g.h(8) * 18), 12, 4, 3);                                           // pedrinha
      if (g.h(9) > 0.94) { dot(g, "#f4f0e4", 8, 13, 5, 1.5); dot(g, "#e1dccb", 10, 14, 4, 1.5); }                           // pena de galinha
    },
    wall(g) { // cerca de arame (malha em losangos) presa em mourões de madeira; de vez em quando, a parede de tábuas do galinheiro
      const { x, y, c, r } = g;
      if (g.h(4) < 0.14 && g.solid(c, r - 1) && g.solid(c, r + 1)) {
        block(g, "#a9523d", "#cf7a5e", "#5e2a1e", "#6e3326");
        for (let i = 7; i < T; i += 8) dot(g, "#7a3829", i, 4, 1, T - 8);
        circle(g, "#2a1a14", 16, 17, 5.5); circle(g, "#4a3020", 16, 17, 3.6); dot(g, "#f4f0e4", 20, 8, 5, 1.5);   // portinha redonda e uma pena
        return;
      }
      block(g, "#46564a", "#86997f", "#27342b", "#2e3d33");
      const ctx = g.ctx; ctx.strokeStyle = "#c6d1c0"; ctx.lineWidth = 1; ctx.beginPath();
      for (const y0 of [5, 13, 21]) {
        ctx.moveTo(x + 3, y + y0); ctx.lineTo(x + 11, y + y0 + 8); ctx.lineTo(x + 19, y + y0); ctx.lineTo(x + 27, y + y0 + 8);
        ctx.moveTo(x + 3, y + y0 + 8); ctx.lineTo(x + 11, y + y0); ctx.lineTo(x + 19, y + y0 + 8); ctx.lineTo(x + 27, y + y0);
      }
      ctx.stroke();
      if (c % 3 === 0) { dot(g, "#8f6b3e", 13, 4, 5, T - 8); dot(g, "#b88c52", 13, 4, 2, T - 8); }                        // mourão
      if (!g.solid(c, r - 1)) { dot(g, "#a07a48", 0, 3, T, 3); dot(g, "#c49a62", 0, 3, T, 1); }                            // travessa de cima
    },
    crate(g) { // X: cesto de vime com legumes ou balde de metal
      if (g.h(3) < 0.55) {
        softDisc(g, 16, 18, 10);
        circle(g, "#8c5f2e", 16, 16, 10.5); circle(g, "#b98745", 16, 16, 9);
        ring(g, "#7a5326", 16, 16, 6.6, 1); ring(g, "#7a5326", 16, 16, 3.4, 1);
        circle(g, "#d9473a", 12.5, 13.5, 2.6); circle(g, "#79c256", 18.5, 12.5, 2.8); circle(g, "#f08a2a", 17, 19, 2.6); circle(g, "#d9473a", 11.5, 19, 2);
      } else {
        softDisc(g, 16, 18, 10);
        circle(g, "#58707f", 16, 16, 10.5); circle(g, "#8fb0c0", 16, 16, 9); circle(g, "#34444e", 16, 16, 6.6); circle(g, "#7fc2e8", 16, 16, 4.6);
        ring(g, "#d3dde2", 16, 16, 9.6, 1); circle(g, "#ffffff", 14.5, 14.5, 1.2);
      }
    },
    high(g) { // T: poleiro alto de galinheiro (plataforma de tábuas sobre pés) ou espantalho
      if (g.h(3) < 0.62) {
        cast(g, 1, 1, 25, 22);
        dot(g, "#5c3f22", 3, 20, 3, 6); dot(g, "#5c3f22", 20, 20, 3, 6);                          // pés da plataforma
        raise(g, 1, 9, 25, 9, 6, "#d7a96c", "#7a5430");
        dot(g, "#b88a4e", 1, 13, 25, 1); dot(g, "#b88a4e", 1, 16, 25, 1);                         // juntas das tábuas do topo
        dot(g, "#6a4626", 2, 1, 3, 15); dot(g, "#6a4626", 21, 1, 3, 15); dot(g, "#8a5e34", 2, 1, 1, 15);   // dois mourões que sobem
        dot(g, "#8b5a2b", 1, 2, 25, 3); dot(g, "#c28a46", 1, 2, 25, 1);                           // vara do poleiro no alto
        dot(g, "#f6f2e8", 9, 6, 4, 1.5); dot(g, "#e8e2d2", 15, 12, 3, 1.5); dot(g, "#7a5430", 7, 18, 1, 5); dot(g, "#7a5430", 14, 18, 1, 5);
      } else {
        cast(g, 3, 3, 21, 22);
        dot(g, "#7a5230", 12, 5, 4, 21); dot(g, "#a07448", 12, 5, 1.5, 21);                       // poste
        dot(g, "#8b6038", 3, 9, 22, 3); dot(g, "#b88a50", 3, 9, 22, 1);                           // braços
        dot(g, "#c0453a", 8, 12, 12, 9); dot(g, "#f0e8d8", 8, 15, 12, 1); dot(g, "#f0e8d8", 13, 12, 1, 9);   // camisa xadrez
        dot(g, "#e2c25a", 2, 8, 3, 6); dot(g, "#e2c25a", 24, 8, 3, 6); dot(g, "#f2dc84", 3, 8, 1, 6);          // palha nas mãos
        circle(g, "#e8d4a0", 14, 8, 3); circle(g, "#d3a64a", 14, 5, 5); circle(g, "#8a4b2b", 14, 5.4, 2.4); circle(g, "#ecd27a", 12.6, 3.6, 1.6);   // chapéu de palha com fita
      }
    },
    water(g) { // ~: poça da rega
      pond(g, "#5e8fb0", "#cde9f5", "#49341f");
      circle(g, "#7aa8c4", 8 + Math.floor(g.h(3) * 14), 22 + Math.floor(g.h(4) * 4), 1.6);
      if (g.h(5) < 0.4) dot(g, "#5fae45", 20 + Math.floor(g.h(6) * 5), 12, 4, 2);               // folhinha boiando
    },
  });

  // ===============================================================================================================================
  // 13. Borda da mata: musgo e folhas secas, troncos e moitas, troncos caídos e pedras, árvores altas de copa escura, poças de lama
  const FOLHAS = ["#a8622c", "#c28a3a", "#8a4a26", "#b5742f"];
  CT.register(13, {
    place: "Borda da mata",
    blurb: "a borda da mata: musgo, folhas secas, moitas, troncos e árvores altas",
    night: false,
    mover: { wall: ["#b6aa94", "#dbd0ba", "#6e6552"], door: ["#8a5aa8", "#b88ad0", "#4a2c64"] },
    rail: ["#3a2c1f", "#120d08"],
    floor(g) {
      const { c, r } = g;
      dot(g, (c + r) % 2 ? "#5a7a43" : "#567641", 0, 0, T, T);
      if (g.h(1) < 0.55) { const mx = 9 + Math.floor(g.h(2) * 14), my = 9 + Math.floor(g.h(3) * 14); circle(g, "#668c4c", mx, my, 7); circle(g, "#79a05a", mx - 1.5, my - 1.5, 3.4); } // almofada de musgo
      for (let i = 0; i < 3; i++) dot(g, pick(FOLHAS, g.h(4 + i)), 1 + Math.floor(g.h(7 + i) * 26), 1 + Math.floor(g.h(10 + i) * 27), 4, 2.5);                                                           // folhas secas
      if (g.h(13) < 0.3) dot(g, "#4a3a28", 4 + Math.floor(g.h(14) * 16), 6 + Math.floor(g.h(15) * 18), 8, 1);                                                                                      // graveto
      if (g.h(16) > 0.96) { dot(g, "#e8dcc0", 15, 19, 2, 4); circle(g, "#c8473a", 16, 18, 3); circle(g, "#f2e8d0", 15, 17, 0.9); }                                                                  // cogumelo
    },
    wall(g) { // troncos grossos e moitas escuras (juntos em tufos de 2 x 2 tiles)
      const { c, r } = g;
      if ((g.border ? 1 : hash(c >> 1, r >> 1, 13)) < 0.4) {
        block(g, "#4d3624", "#7c593a", "#2b1c11", "#2f2014");
        for (let i = 0; i < 3; i++) { const bx = 5 + i * 9 + Math.floor(g.h(2 + i) * 3); dot(g, "#2f2014", bx, 5, 2, 9 + Math.floor(g.h(5 + i) * 14)); dot(g, "#6d4d32", bx + 3, 7 + Math.floor(g.h(8 + i) * 8), 1, 9); }
        if (g.h(11) < 0.2) { circle(g, "#2b1c11", 16, 16, 3.6); circle(g, "#523a26", 16, 16, 1.9); }
      } else {
        block(g, "#3a5a22", "#6c9a38", "#1b3112", "#27421a");
        for (let i = 0; i < 4; i++) circle(g, i % 2 ? "#4c7a2c" : "#436d28", 7 + (i % 2) * 11 + Math.floor(g.h(2 + i) * 6), 9 + (i >> 1) * 11 + Math.floor(g.h(6 + i) * 4), 6);
        circle(g, "#7aa845", 10 + Math.floor(g.h(10) * 8), 10, 2.6); circle(g, "#7aa845", 18 + Math.floor(g.h(11) * 6), 21, 2.2);
        if (g.h(12) < 0.12) { circle(g, "#c8473a", 12, 16, 1.6); circle(g, "#c8473a", 21, 13, 1.6); circle(g, "#c8473a", 17, 22, 1.6); }
      }
    },
    crate(g) { // X: tronco caído (deitado ou em pé) ou pedras com musgo
      const v = g.h(3);
      if (v < 0.35) {
        soft(g, 6, 15, 24, 12);
        dot(g, "#6b4a2e", 6, 10, 23, 13); dot(g, "#8d6a44", 6, 10, 23, 4); dot(g, "#4a321d", 13, 15, 1.5, 6); dot(g, "#4a321d", 19, 14, 1.5, 7); dot(g, "#4a321d", 25, 16, 1.5, 5);
        circle(g, "#d8b27a", 6.5, 16.5, 6.4); circle(g, "#b98a52", 6.5, 16.5, 4); circle(g, "#d8b27a", 6.5, 16.5, 1.6);
      } else if (v < 0.62) {
        soft(g, 10, 5, 15, 24);
        dot(g, "#6b4a2e", 8, 5, 14, 22); dot(g, "#8d6a44", 8, 5, 4, 22); dot(g, "#4a321d", 14, 8, 1.5, 8); dot(g, "#4a321d", 18, 14, 1.5, 9);
        circle(g, "#d8b27a", 15, 6.5, 6.4); circle(g, "#b98a52", 15, 6.5, 4); circle(g, "#d8b27a", 15, 6.5, 1.6);
      } else {
        softDisc(g, 14, 19, 9); softDisc(g, 23, 22, 5.5);
        circle(g, "#7c8088", 13, 16, 9); circle(g, "#a3a8b0", 11, 13, 5.4); circle(g, "#6a6e76", 23, 20, 5.6); circle(g, "#8a8f98", 22, 18.5, 2.8);
        dot(g, "#5f8a44", 8, 11, 6, 3); dot(g, "#7aa85a", 9, 11, 3, 1.5);
      }
    },
    high(g) { // T: árvore alta de copa escura, de contorno irregular (sombra comprida, luz no alto à esquerda)
      castDisc(g, 13, 13, 12);
      const lobes = [[6, 12], [8, 5.5], [17, 5.5], [22, 11], [20, 21], [11, 23], [5.5, 20]];
      for (const [lx, ly] of lobes) circle(g, "#1b4a44", lx, ly, 5.4);
      circle(g, "#1b4a44", 13, 13, 11); circle(g, "#25645a", 11.5, 11.5, 8.4);
      if (g.h(3) < 0.5) { circle(g, "#3a8a74", 9, 8.5, 4.6); circle(g, "#7fcbaa", 7.5, 7, 1.9); circle(g, "#143c37", 18, 18, 4); circle(g, "#143c37", 9, 19, 2.8); }
      else { circle(g, "#3a8a74", 15, 9, 3.6); circle(g, "#3a8a74", 8, 14, 3.2); circle(g, "#7fcbaa", 14, 8, 1.6); circle(g, "#143c37", 17, 19, 4.4); }
    },
    water(g) { // ~: poça de lama
      pond(g, "#6a4a30", "#a58d6c", "#3b2b1b");
      circle(g, "rgba(255,255,255,.14)", 10 + Math.floor(g.h(8) * 8), 9, 5.5);
      circle(g, "#7a5e3d", 7 + Math.floor(g.h(3) * 18), 24 + Math.floor(g.h(4) * 4), 1.5); circle(g, "#8a6e4a", 10 + Math.floor(g.h(5) * 14), 7 + Math.floor(g.h(6) * 5), 1.1);
      if (g.h(7) < 0.4) dot(g, "#a8622c", 18, 15, 4, 2.5);                                      // folha na lama
    },
  });

  // ===============================================================================================================================
  // 14. Riacho e pedras: cascalho e margem, o riacho de água funda e as pedras são paredes; pedras baixas, pedra grande e tronco alto, travessia rasa e brilhante
  const PEDRINHAS = ["#a39880", "#d6cbad", "#8f8468", "#b3a98f"];
  CT.register(14, {
    place: "Riacho e pedras",
    blurb: "o riacho e as pedras: cascalho na margem, água funda, pedras grandes e uma travessia rasa",
    night: false,
    mover: { wall: ["#c25a5a", "#e68c8c", "#702c2c"], door: ["#f0ead8", "#ffffff", "#a39d84"] },
    rail: ["#3d3328", "#14100b"],
    floor(g) {
      const { c, r } = g;
      dot(g, (c + r) % 2 ? "#bfae8a" : "#bbab87", 0, 0, T, T);
      for (let i = 0; i < 6; i++) dot(g, pick(PEDRINHAS, g.h(1 + i)), 1 + Math.floor(g.h(8 + i) * 27), 1 + Math.floor(g.h(15 + i) * 28), 2 + Math.floor(g.h(22 + i) * 2), 2);   // cascalho
      if (g.h(30) < 0.5) { const px = 6 + Math.floor(g.h(31) * 16), py = 6 + Math.floor(g.h(32) * 16); circle(g, "#9d9279", px, py, 2.6); circle(g, "#cfc5a8", px - 0.8, py - 0.8, 1.2); }   // seixo maior
      if (g.h(33) < 0.07) { dot(g, "#7f9a4f", 12, 14, 1.5, 5); dot(g, "#8fae5a", 15, 12, 1.5, 7); dot(g, "#7f9a4f", 18, 14, 1.5, 5); }                                              // capim da margem
    },
    wall(g) { // água funda do riacho (bancada de espuma onde toca a margem) ou pedras grandes
      const { c, r } = g;
      if (g.border || hash(c >> 1, r >> 1, 17) < 0.3) {
        block(g, "#69727e", "#a4afbc", "#3b424c", "#474f5a");
        circle(g, "#7f8a97", 11 + Math.floor(g.h(2) * 4), 14, 8); circle(g, "#59616d", 21, 21 + Math.floor(g.h(3) * 3), 6);
        circle(g, "#aab5c1", 9 + Math.floor(g.h(2) * 4), 11, 3.4);
        if (g.h(5) < 0.25) dot(g, "#6f9a55", 4 + Math.floor(g.h(6) * 16), 20, 7, 3);
        return;
      }
      const t = g.time || 0;
      dot(g, (c + r) % 2 ? "#2a679b" : "#2d6da2", 0, 0, T, T);
      for (let i = 0; i < 3; i++) dot(g, i === 1 ? "#6fb4e0" : "#a8d6f0", 2 + Math.floor(g.h(2 + i) * 12) + Math.round(Math.sin(t * 0.9 + c + i * 2) * 1.5), 5 + i * 10 + Math.floor(g.h(5 + i) * 3), 7 + Math.floor(g.h(8 + i) * 8), 1.5);
      if (!g.solid(c, r - 1)) { dot(g, "#8cc6e8", 0, 0, T, 5); dot(g, "#eaf7fc", 0, 0, T, 2); }
      if (!g.solid(c, r + 1)) { dot(g, "#8cc6e8", 0, T - 5, T, 5); dot(g, "#eaf7fc", 0, T - 2, T, 2); }
      if (!g.solid(c - 1, r)) { dot(g, "#8cc6e8", 0, 0, 5, T); dot(g, "#eaf7fc", 0, 0, 2, T); }
      if (!g.solid(c + 1, r)) { dot(g, "#8cc6e8", T - 5, 0, 5, T); dot(g, "#eaf7fc", T - 2, 0, 2, T); }
    },
    crate(g) { // X: pedras baixas e lisas do rio
      if (g.h(3) < 0.55) {
        softDisc(g, 16, 19, 10);
        circle(g, "#6c7a88", 16, 16, 10.5); circle(g, "#8b99a7", 16, 15, 8.6); circle(g, "#b4c0cc", 13.5, 12.5, 3.6); ring(g, "#5a6874", 16, 16, 10.5, 1);
      } else {
        softDisc(g, 13, 20, 8); softDisc(g, 23, 22, 5.5);
        circle(g, "#6c7a88", 12, 16, 8.5); circle(g, "#8b99a7", 11.5, 15, 6.8); circle(g, "#b4c0cc", 9.5, 12.5, 2.8); circle(g, "#5f6d7a", 23, 20, 5.8); circle(g, "#7d8b99", 22.5, 19.4, 4.4);
      }
    },
    high(g) { // T: pedra grande e angulosa ou tronco alto em pé (topo claro, lado escuro, sombra comprida)
      if (g.h(3) < 0.6) {
        castDisc(g, 12, 13, 11);
        poly(g, "#4f5a66", [[2, 14], [6, 9], [9, 16], [22, 16], [24, 8], [27, 14], [24, 24], [16, 27], [7, 26], [2, 21]]);
        poly(g, "#c6cfd8", [[6, 9], [11, 2], [19, 2], [24, 8], [22, 16], [9, 16]]);
        dot(g, "#e7edf2", 11, 4, 8, 2); dot(g, "#98a4b0", 14, 9, 7, 2); dot(g, "#3b444e", 9, 19, 1.5, 6); dot(g, "#3b444e", 17, 20, 1.5, 5);
      } else {
        castDisc(g, 12, 15, 10);
        circle(g, "#4f3622", 13, 21, 9); dot(g, "#4f3622", 4, 10, 18, 11); dot(g, "#6e4b2d", 4, 10, 5, 11); dot(g, "#3a2616", 17, 12, 1.5, 8); dot(g, "#3a2616", 12, 14, 1.5, 7);
        circle(g, "#e6c58c", 13, 10, 9); ring(g, "#b98d54", 13, 10, 6, 1); ring(g, "#b98d54", 13, 10, 3, 1); ring(g, "#f6e2b8", 13, 10, 9, 1);
      }
    },
    water(g) { // ~: travessia rasa, clara e brilhante (pedrinhas aparecem no fundo)
      pond(g, "#73cfd8", "#f4ffff", "#e1d8b8");
      for (let i = 0; i < 3; i++) circle(g, "#58aab6", 6 + i * 9 + Math.floor(g.h(3 + i) * 4), 8 + ((i * 7 + Math.floor(g.h(6 + i) * 8)) % 18), 2.6);
      dot(g, "#ffffff", 5 + Math.floor(g.h(10) * 18), 5 + Math.floor(g.h(11) * 20), 2, 2); dot(g, "#ffffff", 8 + Math.floor(g.h(12) * 18), 8 + Math.floor(g.h(13) * 18), 2, 2);
    },
  });

  // ===============================================================================================================================
  // 15. Vila de pescadores: areia batida com passarelas de tábuas, casinhas coloridas, barcos virados e redes, pilha de caixotes de pesca e estaca, poças de maré
  const CASINHAS = [
    ["#c9503f", "#e87f6c", "#7e2a1f", "#fbe9d0"], ["#2f8f9d", "#5cbac8", "#195763", "#fbe9d0"], ["#7a5aa8", "#a68ad2", "#46306c", "#fbe9d0"],
    ["#3f62a8", "#6f92d6", "#223d78", "#fbe9d0"], ["#b8508a", "#dc7fb2", "#6e2a52", "#fbe9d0"], ["#4f9a5a", "#7fcc88", "#2a5e33", "#fbe9d0"],
  ];
  CT.register(15, {
    place: "Vila de pescadores",
    blurb: "a vila de pescadores: areia batida, passarelas de tábuas, casinhas coloridas e redes",
    night: false,
    mover: { wall: ["#2f5f8a", "#5a92c0", "#173553"], door: ["#f0ead8", "#ffffff", "#a39d84"] },
    rail: ["#3f3326", "#150f09"],
    floor(g) {
      const { c, r } = g;
      if (r % 7 === 3) { // passarela de tábuas na horizontal
        dot(g, "#a67f52", 0, 0, T, T); dot(g, "#9a7448", 0, 8, T, 8); dot(g, "#9a7448", 0, 24, T, 8);
        for (const yy of [7, 15, 23, 31]) dot(g, "#664a2d", 0, yy, T, 1);
        dot(g, "#664a2d", 6 + Math.floor(g.h(1) * 20), 0, 1, 7); dot(g, "#664a2d", 6 + Math.floor(g.h(2) * 20), 16, 1, 7);
        dot(g, "#4d3822", 2, 3, 1.5, 1.5); dot(g, "#4d3822", 29, 11, 1.5, 1.5); dot(g, "#c49a68", 0, 0, T, 1);
        return;
      }
      if (c % 9 === 4) { // passarela na vertical
        dot(g, "#a67f52", 0, 0, T, T); dot(g, "#9a7448", 8, 0, 8, T); dot(g, "#9a7448", 24, 0, 8, T);
        for (const xx of [7, 15, 23, 31]) dot(g, "#664a2d", xx, 0, 1, T);
        dot(g, "#664a2d", 0, 6 + Math.floor(g.h(1) * 20), 7, 1); dot(g, "#664a2d", 16, 6 + Math.floor(g.h(2) * 20), 7, 1);
        dot(g, "#4d3822", 3, 2, 1.5, 1.5); dot(g, "#4d3822", 11, 29, 1.5, 1.5); dot(g, "#c49a68", 0, 0, 1, T);
        return;
      }
      dot(g, (c + r) % 2 ? "#caa774" : "#c6a370", 0, 0, T, T);
      for (let i = 0; i < 4; i++) dot(g, i % 2 ? "#aa8a5a" : "#dcc08e", 2 + Math.floor(g.h(1 + i) * 27), 2 + Math.floor(g.h(6 + i) * 27), 2, 1.5);
      if (g.h(12) > 0.93) { circle(g, "#f4e9d8", 9 + Math.floor(g.h(13) * 14), 9 + Math.floor(g.h(14) * 14), 2.4); circle(g, "#e7a0a0", 9 + Math.floor(g.h(13) * 14), 9 + Math.floor(g.h(14) * 14), 1); }  // concha
      if (g.h(15) < 0.14) { dot(g, "#aa8a5a", 10, 14, 6, 3); dot(g, "#aa8a5a", 18, 19, 6, 3); }                                                                                                   // pegadas
    },
    wall(g) { // casinhas coloridas vistas de cima: telhado com cumeeira e, onde dá para a rua, porta e janelas
      const { c, r } = g;
      const h = CASINHAS[Math.floor(hash(c >> 1, r >> 1, 3) * CASINHAS.length)];
      block(g, h[0], h[1], h[2], h[2]);
      dot(g, "rgba(0,0,0,.13)", 0, 9, T, 1.5); dot(g, "rgba(0,0,0,.13)", 0, 23, T, 1.5);
      dot(g, h[1], 0, 15, T, 2); dot(g, "rgba(0,0,0,.18)", 0, 17, T, 1);
      if (!g.solid(c, r + 1)) { dot(g, h[3], 11, T - 15, 10, 11); dot(g, "#5a3a22", 12, T - 14, 8, 10); dot(g, "#cfeaf2", 3, T - 14, 6, 6); dot(g, "#cfeaf2", 23, T - 14, 6, 6); dot(g, h[3], 5, T - 11, 2, 1); }
      else if (g.h(4) < 0.2) { dot(g, "#4a4036", 20, 5, 6, 6); dot(g, "#7a6c5c", 20, 5, 6, 1.5); }                                                    // chaminé
    },
    crate(g) { // X: barco virado de casco colorido ou monte de rede com boias
      if (g.h(3) < 0.55) {
        const col = pick([["#2f6f8c", "#4d93b0"], ["#c4503f", "#e0786a"], ["#3c8a5a", "#5fb07f"]], g.h(4));
        soft(g, 4, 13, 26, 14);
        poly(g, col[0], [[3, 15], [9, 8], [23, 8], [29, 15], [23, 23], [9, 23]]);
        poly(g, col[1], [[6, 15], [10, 10], [22, 10], [26, 15], [22, 20], [10, 20]]);
        dot(g, "#2a3a44", 6, 15, 20, 2); dot(g, "#f2f0e6", 9, 9, 14, 1.5);
      } else {
        softDisc(g, 16, 19, 10);
        circle(g, "#a99262", 16, 16, 10.5); circle(g, "#c9b47c", 16, 16, 9);
        const ctx = g.ctx; ctx.strokeStyle = "#8d7a4c"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 4; i++) { ctx.moveTo(g.x + 8 + i * 4, g.y + 8); ctx.lineTo(g.x + 8 + i * 4, g.y + 24); ctx.moveTo(g.x + 8, g.y + 8 + i * 5); ctx.lineTo(g.x + 24, g.y + 8 + i * 5); }
        ctx.stroke();
        circle(g, "#d9483b", 11, 12, 2.4); circle(g, "#f2f0e6", 21, 20, 2.4); circle(g, "#d9483b", 20, 11, 2);
      }
    },
    high(g) { // T: pilha alta de caixotes de pesca ou estaca de amarrar barcos
      if (g.h(3) < 0.62) {
        cast(g, 1, 1, 24, 24);
        raise(g, 1, 11, 24, 6, 8, "#eef6f6", "#4f86a3");
        raise(g, 4, 1, 18, 6, 5, "#f8fdfd", "#6aa3bf");
        for (const [xx, yy, hh] of [[5, 17, 8], [11, 17, 8], [17, 17, 8], [22, 17, 8], [8, 7, 4], [14, 7, 4], [19, 7, 4]]) dot(g, "#2f627e", xx, yy, 1.5, hh);
        dot(g, "#2f627e", 1, 20, 24, 1); dot(g, "#cfdede", 4, 3, 4, 1.5);
        poly(g, "#aebfc7", [[11, 3], [15, 2], [18, 4], [15, 6], [11, 5]]);  // peixe prateado no topo
        dot(g, "#2f627e", 16, 3, 1.5, 1.5);
      } else {
        cast(g, 3, 2, 22, 22);
        dot(g, "#6a4829", 6, 8, 11, 17); dot(g, "#9a6e42", 6, 8, 4, 17); circle(g, "#6a4829", 11.5, 25, 5.5);
        circle(g, "#c9a56e", 11.5, 8, 6.5); ring(g, "#a0794a", 11.5, 8, 4, 1); circle(g, "#e6c88e", 9.5, 6, 2);
        dot(g, "#efe3c4", 5, 15, 13, 2.5); dot(g, "#d8c9a4", 5, 19, 13, 2.5); dot(g, "#efe3c4", 6, 22, 11, 2);                            // corda enrolada
        circle(g, "#e8683a", 21, 13, 3.4); circle(g, "#f2f0e6", 21, 12, 1.4); dot(g, "#c9a56e", 17, 12, 4, 1);                             // boia pendurada
      }
    },
    water(g) { // ~: poça de maré com espuma e estrela-do-mar
      pond(g, "#6dbccb", "#effcff", "#bda57a");
      circle(g, "#e8fbff", 7 + Math.floor(g.h(3) * 6), 24, 1.4); circle(g, "#e8fbff", 22 + Math.floor(g.h(4) * 5), 8, 1.2);
      if (g.h(5) < 0.3) { const px = 10 + Math.floor(g.h(6) * 10), py = 14 + Math.floor(g.h(7) * 6); dot(g, "#e8725a", px - 3, py - 1, 6, 2); dot(g, "#e8725a", px - 1, py - 3, 2, 6); dot(g, "#f4a58f", px - 1, py - 1, 2, 2); }
    },
  });

  // ===============================================================================================================================
  // 16. Docas do porto: concreto e cais de madeira, contêineres e armazéns, caixotes e cordas, contêineres empilhados, cais molhado e óleo
  const CONTEINERES = [
    ["#c4382a", "#e86a58", "#7a1f16"], ["#2f66b0", "#5e93d8", "#173f74"], ["#2f8a5a", "#58c08a", "#175034"], ["#d9801f", "#f5a850", "#85480c"], ["#d4d9de", "#f2f5f7", "#8c95a0"],
  ];
  CT.register(16, {
    place: "Docas do porto",
    blurb: "as docas do porto: concreto, cais de madeira, contêineres e armazéns",
    night: false,
    mover: { wall: ["#e8e0c8", "#fffaf0", "#9a8f70"], door: ["#a0509a", "#c984c2", "#5a2a56"] },
    rail: ["#2a2118", "#0c0905"],
    floor(g) {
      const { c, r } = g;
      if (hash(c >> 2, r >> 1, 5) < 0.34) { // cais de madeira escura
        dot(g, "#765a3b", 0, 0, T, T); dot(g, "#6a4f32", 0, 8, T, 8); dot(g, "#6a4f32", 0, 24, T, 8);
        for (const yy of [7, 15, 23, 31]) dot(g, "#3f2e1d", 0, yy, T, 1);
        dot(g, "#3f2e1d", 5 + Math.floor(g.h(1) * 22), 0, 1, 7); dot(g, "#3f2e1d", 5 + Math.floor(g.h(2) * 22), 16, 1, 7);
        dot(g, "#2a1f14", 3, 3, 1.5, 1.5); dot(g, "#2a1f14", 28, 18, 1.5, 1.5); dot(g, "#8f7048", 0, 0, T, 1);
        return;
      }
      dot(g, (c + r) % 2 ? "#4f5a66" : "#4d5864", 0, 0, T, T);
      dot(g, "#3b434e", 0, 15, T, 1); dot(g, "#3b434e", 15, 0, 1, T);                                  // juntas das lajes
      if (g.h(1) < 0.25) dot(g, "#3f4852", 3 + Math.floor(g.h(2) * 20), 4 + Math.floor(g.h(3) * 20), 7, 1.5);   // rachadura
      if (g.h(4) < 0.2) { dot(g, "rgba(20,24,30,.28)", 6 + Math.floor(g.h(5) * 12), 18, 11, 8); }                  // mancha de óleo seca
      if (g.h(6) < 0.07) dot(g, "#c4cdd6", 0, 28, T, 2);                                                           // faixa pintada
    },
    wall(g) { // contêineres de várias cores (costelas verticais) e de vez em quando a porta de enrolar de um armazém
      const { c, r } = g;
      const inner = g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1);
      if (inner && g.h(6) < 0.14) {
        block(g, "#7d8793", "#a9b3be", "#4b5560", "#5d6773");
        for (let i = 7; i < T - 4; i += 5) dot(g, "#5d6773", 2, i, T - 4, 1.5);
        dot(g, "#2b2f36", 7, 5, 18, 2); dot(g, "#d44a3a", 14, 14, 4, 4);
        return;
      }
      const k = CONTEINERES[Math.floor(hash(c >> 1, r, 3) * CONTEINERES.length)];
      block(g, k[0], k[1], k[2], k[2]);
      for (let i = 4; i < T - 2; i += 8) dot(g, "rgba(0,0,0,.17)", i, 4, 2, T - 8);
      for (let i = 6; i < T - 2; i += 8) dot(g, "rgba(255,255,255,.12)", i, 4, 1, T - 8);
      if (g.h(7) < 0.2) { dot(g, "#f0ece0", 5, 12, 10, 4); dot(g, k[2], 6, 13, 6, 2); }                    // etiqueta
      if (!g.solid(c - 1, r)) dot(g, "#2b2f36", 3, 4, 1, T - 8);
      if (!g.solid(c + 1, r)) dot(g, "#2b2f36", T - 4, 4, 1, T - 8);
    },
    crate(g) { // X: caixote de madeira ou rolo de corda
      if (g.h(3) < 0.55) {
        soft(g, 6, 13, 22, 16);
        dot(g, "#a47a47", 5, 9, 22, 18); dot(g, "#c9a068", 5, 9, 22, 4);
        dot(g, "#6e4f2a", 5, 16, 22, 1.5); dot(g, "#6e4f2a", 5, 21, 22, 1.5); dot(g, "#6e4f2a", 8, 13, 1.5, 14); dot(g, "#6e4f2a", 23, 13, 1.5, 14);
        dot(g, "#e8dcc0", 12, 18, 8, 3);
      } else {
        softDisc(g, 16, 19, 10);
        circle(g, "#a98a4c", 16, 16, 10.5); circle(g, "#d4b878", 16, 16, 9);
        ring(g, "#8f7440", 16, 16, 6.6, 1.2); ring(g, "#8f7440", 16, 16, 3.8, 1.2); circle(g, "#3b434b", 16, 16, 2);
        dot(g, "#d4b878", 20, 21, 9, 2); dot(g, "#8f7440", 20, 23, 9, 1);
      }
    },
    high(g) { // T: dois contêineres empilhados (o de cima mais claro e recuado)
      const lo = CONTEINERES[Math.floor(g.h(3) * CONTEINERES.length)], hi = CONTEINERES[(Math.floor(g.h(3) * CONTEINERES.length) + 1 + Math.floor(g.h(4) * 3)) % CONTEINERES.length];
      cast(g, 1, 1, 25, 24);
      dot(g, lo[0], 1, 15, 25, 10);                                                                   // frente do contêiner de baixo
      for (let i = 4; i < 25; i += 4) dot(g, "rgba(0,0,0,.28)", i, 15, 1.5, 10);
      dot(g, "#2b2f36", 1, 24, 25, 1.5); dot(g, "#f0ece0", 17, 18, 6, 3);
      dot(g, hi[2], 3, 9, 21, 7);                                                                       // frente do contêiner de cima
      for (let i = 5; i < 23; i += 4) dot(g, "rgba(0,0,0,.2)", i, 9, 1.5, 7);
      raise(g, 3, 1, 21, 8, 0, hi[1], hi[0]);                                                          // topo (claro, com costelas)
      for (let i = 6; i < 23; i += 4) dot(g, "rgba(0,0,0,.14)", i, 2, 1, 6);
      dot(g, "rgba(0,0,0,.30)", 3, 9, 21, 1.5);
    },
    water(g) { // ~: cais molhado com mancha de óleo colorida
      pond(g, "#245a74", "#9fd0e0", "#16303e");
      const oy = 8 + Math.floor(g.h(3) * 8), ctx = g.ctx; ctx.lineWidth = 3;                                         // mancha de óleo: faixas coloridas e curvas (iridescente)
      for (const [col, dy] of [["rgba(170,100,230,.5)", 0], ["rgba(60,215,175,.5)", 3.2], ["rgba(245,130,165,.45)", 6.4], ["rgba(250,220,120,.4)", 9.6]]) {
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(g.x + 4, g.y + oy + dy); ctx.quadraticCurveTo(g.x + 12, g.y + oy + dy - 5, g.x + 20, g.y + oy + dy + 1); ctx.quadraticCurveTo(g.x + 25, g.y + oy + dy + 4, g.x + 29, g.y + oy + dy - 1); ctx.stroke();
      }
    },
  });

  // ===============================================================================================================================
  // 17. Praia e dunas: areia clara com ondinhas de vento, dunas de areia escura (o anel de fora é o mar), pranchas e cadeiras, quiosque e duna alta com capim, faixa molhada
  const PRANCHAS = [["#e8573f", "#fff3c0"], ["#2f86c0", "#f5f0dc"], ["#f5f0dc", "#e8573f"], ["#3ca37a", "#f5f0dc"]];
  CT.register(17, {
    place: "Praia e dunas",
    blurb: "a praia e as dunas: areia clara, capim, pranchas, quiosques e a faixa da maré",
    night: false,
    mover: { wall: ["#2f6f9a", "#5aa0cc", "#173f5e"], door: ["#c4503f", "#e6806e", "#6e2418"] },
    rail: ["#4a3a26", "#16100a"],
    floor(g) {
      const { c, r } = g;
      dot(g, (c + r) % 2 ? "#e8d29c" : "#e5cf98", 0, 0, T, T);
      const o = Math.floor(g.h(1) * 8);
      dot(g, "#d6bd82", 3 + o, 9, 10, 1.5); dot(g, "#d6bd82", 16 + o % 5, 21, 11, 1.5); dot(g, "#f2e2b6", 5 + o, 10.5, 8, 1);     // ondinhas deixadas pelo vento
      for (let i = 0; i < 3; i++) dot(g, "#c9ae70", 2 + Math.floor(g.h(2 + i) * 27), 2 + Math.floor(g.h(6 + i) * 27), 1.5, 1.5);
      if (g.h(10) > 0.94) { circle(g, "#f6ece0", 9 + Math.floor(g.h(11) * 14), 9 + Math.floor(g.h(12) * 14), 2.4); circle(g, "#e7a0a0", 9 + Math.floor(g.h(11) * 14), 9 + Math.floor(g.h(12) * 14), 1); }
      else if (g.h(13) < 0.05) { dot(g, "#8a9a4a", 14, 16, 1.5, 6); dot(g, "#9fb05a", 17, 14, 1.5, 8); dot(g, "#8a9a4a", 20, 16, 1.5, 6); }
    },
    wall(g) { // dunas de areia escura (o anel de fora do mapa é o mar com espuma)
      const { c, r } = g, t = g.time || 0;
      if (g.border) {
        dot(g, (c + r) % 2 ? "#2b84be" : "#2f8ac6", 0, 0, T, T);
        const o = Math.floor(g.h(1) * 10) + Math.round(Math.sin(t * 0.8 + c) * 1.5);
        dot(g, "#eaf6fb", 2 + o, 7, 10, 2); dot(g, "#eaf6fb", 14 + o % 6, 19, 11, 2); dot(g, "#79c2ea", 8, 13, 9, 1.5); dot(g, "#79c2ea", 4 + o % 5, 26, 7, 1.5);
        return;
      }
      block(g, "#b8975a", "#e0c88c", "#8c6d38", "#a1824a");
      const o = Math.floor(g.h(2) * 6);
      dot(g, "#a58546", 4 + o, 10, 14, 1.5); dot(g, "#a58546", 12 + o % 4, 17, 14, 1.5); dot(g, "#a58546", 5 + o, 23, 10, 1.5); dot(g, "#cfae6c", 6 + o, 11.5, 10, 1);
      if (!g.solid(c, r - 1) && g.h(3) < 0.4) { dot(g, "#6f8f3a", 8, 0, 1.5, 7); dot(g, "#86a84a", 11, 0, 1.5, 9); dot(g, "#6f8f3a", 14, 0, 1.5, 6); } // capim na crista
    },
    crate(g) { // X: prancha de surfe deitada ou cadeira de praia listrada
      const v = g.h(3);
      if (v < 0.6) {
        const p = PRANCHAS[Math.floor(g.h(4) * PRANCHAS.length)];
        if (g.h(5) < 0.5) {
          soft(g, 6, 14, 24, 10);
          dot(g, p[0], 6, 11, 21, 9); circle(g, p[0], 6, 15.5, 4.5); circle(g, p[0], 27, 15.5, 4.5);
          dot(g, p[1], 4, 15, 25, 2); dot(g, "#1f3a5a", 25, 12, 3, 7);
        } else {
          soft(g, 13, 6, 10, 24);
          dot(g, p[0], 11, 5, 9, 21); circle(g, p[0], 15.5, 5, 4.5); circle(g, p[0], 15.5, 26, 4.5);
          dot(g, p[1], 15, 3, 2, 25); dot(g, "#1f3a5a", 12, 23, 7, 3);
        }
      } else {
        soft(g, 7, 9, 19, 20);
        dot(g, "#8a5a33", 5, 7, 3, 20); dot(g, "#8a5a33", 25, 7, 3, 20);
        for (let i = 0; i < 6; i++) dot(g, i % 2 ? "#f7f2e4" : (g.h(6) < 0.5 ? "#2f86c0" : "#e8573f"), 8 + i * 3, 7, 3, 20);
        dot(g, "rgba(0,0,0,.18)", 8, 17, 18, 1.5);
      }
    },
    high(g) { // T: quiosque de palha (telhado redondo) ou duna alta com capim
      if (g.h(3) < 0.5) {
        castDisc(g, 12, 12, 11);
        circle(g, "#8a6a2c", 12, 15, 11.5); circle(g, "#c9a24e", 12, 12, 11.5); circle(g, "#e2c26e", 12, 12, 9.4);
        const ctx = g.ctx; ctx.strokeStyle = "#a8823a"; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.2; ctx.moveTo(g.x + 12, g.y + 12); ctx.lineTo(g.x + 12 + Math.cos(a) * 11, g.y + 12 + Math.sin(a) * 11); }
        ctx.stroke();
        circle(g, "#f6e6a8", 9, 9, 3.4); circle(g, "#8a6a2c", 12, 12, 2);
      } else {
        castDisc(g, 12, 13, 11);
        circle(g, "#bd9b5a", 12, 14, 12); circle(g, "#d8bb7c", 12, 12.5, 10); circle(g, "#efdfa8", 10, 9.5, 6.2); circle(g, "#fbf2cc", 8.6, 8, 2.6);
        dot(g, "#6f8f3a", 11, 2, 1.5, 7); dot(g, "#86a84a", 14, 1, 1.5, 8); dot(g, "#6f8f3a", 17, 3, 1.5, 6); dot(g, "#86a84a", 8, 3, 1.5, 5); dot(g, "#6f8f3a", 16, 17, 1.5, 6); dot(g, "#86a84a", 19, 15, 1.5, 7);
      }
    },
    water(g) { // ~: faixa molhada da maré subindo na areia
      pond(g, "#7cc3c8", "#f2fffc", "#d9c58a");
      dot(g, "#ffffff", 3, 4 + Math.floor(g.h(3) * 3), 12 + Math.floor(g.h(4) * 8), 1.5); dot(g, "#cdeff0", 14, 26, 14, 1.5);
      circle(g, "#e8fbf7", 6 + Math.floor(g.h(5) * 18), 18 + Math.floor(g.h(6) * 6), 1.3);
    },
  });

  // ===============================================================================================================================
  // 18. Telhados à noite (NOITE): telhas azul-noite, janelas acesas, antenas e cercas, chaminés e caixas d'água, poças com reflexo de luz
  CT.register(18, {
    place: "Telhados à noite",
    blurb: "os telhados da cidade à noite: telhas azuis, janelas acesas e chaminés",
    night: true,
    mover: { wall: ["#e8e0c8", "#fffaf0", "#9a8f70"], door: ["#d4663a", "#f0905a", "#7a3010"] },
    rail: ["#3a2a1c", "#100a05"],
    floor(g) {
      dot(g, "#3f5890", 0, 0, T, T);
      for (let i = 0; i < 4; i++) {
        const y0 = i * 8;
        dot(g, "#5873b0", 0, y0, T, 1);                                                                 // brilho da borda de cada fileira
        dot(g, "#2c3f72", 0, y0 + 7, T, 1);                                                             // sombra entre as fileiras
        dot(g, "#2c3f72", (i % 2 ? 4 : 12) + Math.floor(g.h(1 + i) * 3), y0 + 1, 1, 6); dot(g, "#2c3f72", (i % 2 ? 20 : 28) - Math.floor(g.h(5 + i) * 3), y0 + 1, 1, 6);   // emendas das telhas
      }
      if (g.h(10) < 0.12) { dot(g, "#4a64a0", 4 + Math.floor(g.h(11) * 12), 9, 12, 7); dot(g, "#6c88c4", 4 + Math.floor(g.h(11) * 12), 9, 12, 1); }   // uma telha mais nova e clara
    },
    wall(g) { // paredes de prédios e águas-furtadas, com janelas acesas
      const { c, r } = g;
      block(g, "#242f58", "#43528a", "#10162e", "#18203f");
      for (const wx of [4, 19]) {
        if (g.h(2 + (wx > 10 ? 1 : 0)) > 0.86) continue;
        const lit = g.h(5 + (wx > 10 ? 1 : 0)) < 0.7;
        if (lit) dot(g, "rgba(255,210,120,.28)", wx - 2, 5, 12, 14);
        dot(g, "#0c1124", wx - 1, 6, 10, 12); dot(g, lit ? "#ffd27a" : "#3a4a7a", wx, 7, 8, 10);
        dot(g, lit ? "#b8863a" : "#2a3560", wx + 3, 7, 1.5, 10); dot(g, lit ? "#b8863a" : "#2a3560", wx, 11, 8, 1.5);
      }
      if (!g.solid(c, r + 1)) dot(g, "#0c1124", 0, T - 6, T, 2);
    },
    crate(g) { // X: antena de TV ou cerca baixa de grade
      if (g.h(3) < 0.5) {
        softDisc(g, 16, 25, 5);
        circle(g, "#42527e", 16, 24, 4.5); dot(g, "#dfe8f8", 15, 4, 2, 21);
        for (const [yy, w] of [[5, 14], [10, 12], [15, 10], [20, 8]]) dot(g, "#dfe8f8", 16 - w / 2, yy, w, 1.5);
        circle(g, "#ff6a5a", 16, 4, 1.5);
      } else {
        soft(g, 4, 21, 26, 6);
        dot(g, "#6b7ca6", 4, 10, 3, 16); dot(g, "#6b7ca6", 15, 10, 3, 16); dot(g, "#6b7ca6", 26, 10, 3, 16);
        dot(g, "#a4b6dc", 2, 12, 28, 3); dot(g, "#a4b6dc", 2, 19, 28, 3); dot(g, "#e2ecff", 2, 12, 28, 1);
      }
    },
    high(g) { // T: chaminé de tijolos ou caixa d'água, bem iluminadas
      if (g.h(3) < 0.5) {
        cast(g, 4, 2, 19, 22);
        raise(g, 4, 2, 19, 11, 10, "#c86a55", "#8a3f35");
        dot(g, "#e49a84", 4, 2, 19, 1.5); dot(g, "#10131f", 8, 5, 11, 5); dot(g, "#2a3350", 8, 5, 11, 1.5); dot(g, "#f2b8a2", 7, 4, 13, 1);
        for (const yy of [15, 19]) dot(g, "#5e271f", 4, yy, 19, 1); dot(g, "#5e271f", 10, 13, 1, 3); dot(g, "#5e271f", 16, 16, 1, 3); dot(g, "#5e271f", 8, 20, 1, 3); dot(g, "#5e271f", 14, 20, 1, 3); dot(g, "#5e271f", 20, 16, 1, 3);
      } else {
        cast(g, 3, 2, 20, 26);
        circle(g, "#3f6a94", 12, 20, 9); dot(g, "#3f6a94", 3, 10, 18, 10); dot(g, "#5a8fc0", 3, 10, 5, 10); dot(g, "#2a4a6a", 3, 14, 18, 1.5); dot(g, "#2a4a6a", 3, 18, 18, 1.5);
        circle(g, "#9fb4c8", 12, 10, 9); circle(g, "#c9d8e6", 9.5, 7.5, 4.4); ring(g, "#5e748c", 12, 10, 9, 1); ring(g, "#5e748c", 12, 10, 5.4, 1); dot(g, "#6f869c", 11, 3, 2, 14); dot(g, "#e8f0f8", 11, 3, 1, 4);
      }
    },
    water(g) { // ~: poça com o reflexo amarelo de uma janela e de um poste
      const t = g.time || 0;
      pond(g, "#1c3260", "#7fa4e0", "#0f1c3c");
      for (let i = 0; i < 8; i++) { const w = Math.max(2, Math.round(12 - i * 1.4 + (g.h(20 + i) * 4 - 2))); dot(g, "rgba(255,216,138,.6)", 16 - w / 2 + Math.round(Math.sin(t * 1.6 + i + g.c) * 1.5), 2 + i * 3.6, w, 2); }    // reflexo de uma janela: faixas que afinam e tremem
      dot(g, "rgba(255,255,255,.35)", 3 + Math.floor(g.h(3) * 6), 22, 5, 1.5);
    },
  });

  // ===============================================================================================================================
  // 19. Mercado à noite e chuva (NOITE): paralelepípedo molhado com reflexos, barracas com lâmpadas, caixotes com lona, pilhas altas de caixas de feira, poças grandes com gotas
  const TOLDOS = [["#c2382f", "#c9b896"], ["#2a8a84", "#c9b896"], ["#d07a22", "#c9b896"], ["#7a4cb0", "#c9b896"]];
  CT.register(19, {
    place: "Mercado à noite",
    blurb: "o mercado à noite, na chuva: barracas com lâmpadas e poças refletindo as luzes",
    night: true,
    mover: { wall: ["#e8e0c8", "#fffaf0", "#9a8f70"], door: ["#40b0a0", "#7adccd", "#1a6a60"] },
    rail: ["#33241a", "#0e0805"],
    floor(g) {
      const { c, r } = g, t = g.time || 0;
      dot(g, (c + r) % 2 ? "#685882" : "#655580", 0, 0, T, T);
      dot(g, "#463a62", 0, 15, T, 2); dot(g, "#463a62", 0, 31, T, 1);
      dot(g, "#463a62", 8 + Math.floor(g.h(1) * 3), 0, 2, 15); dot(g, "#463a62", 21 + Math.floor(g.h(2) * 3), 0, 2, 15);
      dot(g, "#463a62", 3 + Math.floor(g.h(3) * 3), 17, 2, 14); dot(g, "#463a62", 15 + Math.floor(g.h(4) * 3), 17, 2, 14); dot(g, "#463a62", 27, 17, 2, 14);
      if (g.h(5) < 0.3) dot(g, "rgba(255,200,120,.20)", 3 + Math.floor(g.h(6) * 12), 4 + Math.floor(g.h(7) * 18), 10 + Math.floor(g.h(8) * 8), 3);   // reflexo de lâmpada no molhado
      if (g.h(9) < 0.3) ring(g, "rgba(225,238,255,.5)", 6 + Math.floor(g.h(10) * 20), 6 + Math.floor(g.h(11) * 20), 1.6 + ((t * 1.1 + g.h(12) * 5) % 1) * 2.6, 1); // gota de chuva
    },
    wall(g) { // barracas com toldo listrado e fio de lâmpadas acesas
      const { c, r } = g;
      const k = TOLDOS[Math.floor(hash(c >> 1, r >> 1, 3) * TOLDOS.length)];
      block(g, k[1], k[0], "#1a1626", "#1a1626");
      for (let i = 0; i < T; i += 8) dot(g, k[0], i, 4, 4, T - 8);
      for (const [dx, up] of [[3, 0], [11, 1], [19, 0], [27, 1]]) {
        const edge = !g.solid(c, r + 1) ? T - 7 : !g.solid(c, r - 1) ? 2 : -1;
        if (edge < 0) break;
        dot(g, "rgba(255,226,150,.34)", dx - 3, edge - 2 + up, 8, 8); dot(g, "#fff0b8", dx - 1, edge + up, 4, 4);                                      // lâmpada com brilho
      }
    },
    crate(g) { // X: caixotes cobertos com lona (monte com dobras e corda)
      const lona = pick([["#3f7a8f", "#7ab4c8", "#27505e"], ["#4a5fa8", "#8096d8", "#2c3a70"], ["#5a7a3a", "#8cae60", "#38502a"]], g.h(3));
      soft(g, 7, 15, 20, 13);
      circle(g, lona[0], 16, 17, 9.5); dot(g, lona[0], 6, 17, 20, 9); dot(g, lona[2], 6, 25, 20, 2);
      circle(g, lona[1], 13.5, 14, 4.6);
      const ctx = g.ctx; ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(g.x + 16, g.y + 8); ctx.lineTo(g.x + 9, g.y + 25); ctx.moveTo(g.x + 17, g.y + 9); ctx.lineTo(g.x + 21, g.y + 25); ctx.moveTo(g.x + 14, g.y + 12); ctx.lineTo(g.x + 15, g.y + 25); ctx.stroke();
      dot(g, "#e0d2a8", 6, 21, 20, 1.5); dot(g, "rgba(255,255,255,.35)", 10, 10, 5, 1.5);
    },
    high(g) { // T: pilha alta de caixas de feira com frutas e legumes no alto
      const fruta = pick([["#f08a2a", "#ffc070"], ["#d9473a", "#f58a7c"], ["#6cba4a", "#a6e07e"]], g.h(3));
      cast(g, 1, 1, 24, 24);
      raise(g, 1, 11, 24, 6, 8, "#d4aa6c", "#7e5a30");
      raise(g, 4, 1, 18, 6, 5, "#e2bd80", "#946a38");
      for (const xx of [5, 11, 17, 22]) dot(g, "#4e3818", xx, 17, 1.5, 8);
      dot(g, "#4e3818", 1, 21, 24, 1); dot(g, "#4e3818", 4, 7, 18, 1);
      circle(g, fruta[0], 8, 4, 2.5); circle(g, fruta[0], 13, 4.5, 2.5); circle(g, fruta[0], 18, 4, 2.5); circle(g, fruta[1], 7.4, 3.2, 0.9); circle(g, fruta[1], 12.4, 3.7, 0.9);
      circle(g, fruta[0], 7, 14, 2.4); circle(g, fruta[0], 14, 14.5, 2.4); circle(g, fruta[0], 21, 14, 2.2);
    },
    water(g) { // ~: poça grande com reflexo das lâmpadas e círculos de gotas de chuva
      const t = g.time || 0;
      pond(g, "#15295a", "#7ea2e0", "#0c1634");
      circle(g, "rgba(255,214,120,.55)", 6 + Math.floor(g.h(3) * 8), 9 + Math.floor(g.h(4) * 6), 3.4); circle(g, "rgba(240,100,90,.45)", 20 + Math.floor(g.h(5) * 6), 22, 3); circle(g, "rgba(120,230,210,.4)", 22, 8, 2.4);
      for (let i = 0; i < 2; i++) ring(g, "rgba(235,245,255,.75)", 9 + i * 11 + Math.floor(g.h(6 + i) * 4), 10 + i * 9, 1.5 + ((t * 1.2 + g.h(8 + i) * 5 + i * 0.5) % 1) * 5, 1);
    },
  });

  // ===============================================================================================================================
  // 20. A casa grande (final): piso de madeira, azulejo e tapetes por cômodos, paredes de papel, sofás e mesas, estantes altas e arranhador, água derramada. Clara e acolhedora
  const SOFAS = [["#b8566e", "#d9798f", "#8a3a50"], ["#4f8a98", "#78b4c2", "#2f5e6b"], ["#8a9a4a", "#b2c26e", "#5e6c2c"]];
  CT.register(20, {
    place: "A casa grande",
    blurb: "a casa grande: piso de madeira, tapetes, sofás, estantes altas e o arranhador",
    night: false,
    mover: { wall: ["#3f6a9a", "#6e9acc", "#1f3d5e"], door: ["#8a4a9a", "#b278c2", "#4e2658"] },
    rail: ["#3a2a1d", "#120c07"],
    floor(g) { // cada cômodo (blocos de 4 x 4 tiles) tem seu piso: tábua corrida, azulejo ou tapete
      const { c, r } = g, k = hash(c >> 2, r >> 2, 20);
      if (k < 0.52) {
        dot(g, "#a8744b", 0, 0, T, T); dot(g, "#9a6840", 0, 8, T, 8); dot(g, "#9a6840", 0, 24, T, 8);
        for (const yy of [7, 15, 23, 31]) dot(g, "#6e4528", 0, yy, T, 1);
        dot(g, "#6e4528", ((r % 2) * 9 + Math.floor(g.h(1) * 12)) + 5, 0, 1, 7); dot(g, "#6e4528", 9 + Math.floor(g.h(2) * 16), 16, 1, 7);
        if (g.h(3) > 0.8) dot(g, "rgba(255,238,200,.16)", 4, 2, 24, 4);                                       // reflexo do verniz
      } else if (k < 0.78) {
        dot(g, "#a6d0cc", 0, 0, T, T); dot(g, "#8fc0bc", 0, 0, 16, 16); dot(g, "#8fc0bc", 16, 16, 16, 16);
        dot(g, "#7aa9a5", 15, 0, 1, T); dot(g, "#7aa9a5", 0, 15, T, 1); dot(g, "#d6ece9", 3, 3, 4, 1.5);
      } else {
        dot(g, (c + r) % 2 ? "#b8585a" : "#be5e60", 0, 0, T, T); dot(g, "#d9a266", 0, 0, T, 2); dot(g, "#d9a266", 0, 30, T, 2);
        circle(g, "#e8c88a", 8, 8, 2.4); circle(g, "#e8c88a", 24, 24, 2.4); circle(g, "#a04650", 24, 8, 2); circle(g, "#a04650", 8, 24, 2);
      }
    },
    wall(g) { // paredes de cada cômodo (os mesmos blocos do piso): papel listrado na sala, azulejo branco na cozinha, papel rosa de bolinhas no quarto; rodapé, quadros e janelas
      const { c, r } = g, k = hash(c >> 2, r >> 2, 20);
      if (k < 0.52) {
        block(g, "#eee0bf", "#fff6dc", "#a5936c", "#cdbc94");
        for (let i = 6; i < T; i += 8) dot(g, "#e0cfa6", i, 4, 2, T - 8);
      } else if (k < 0.78) {
        block(g, "#e8f1ee", "#ffffff", "#8fa8a4", "#b9cfcb");
        dot(g, "#c4d8d4", 0, 15, T, 1); dot(g, "#c4d8d4", 15, 0, 1, T); dot(g, "#8fc0bc", 0, 20, T, 2);
      } else {
        block(g, "#ecccc6", "#fbe6e1", "#a8827c", "#cfaaa4");
        for (const [dx, dy] of [[8, 9], [24, 9], [16, 20], [4, 24], [28, 24]]) circle(g, "#d9a8a0", dx, dy, 2.2);
      }
      if (!g.solid(c, r + 1)) { dot(g, "#6b4a2b", 0, T - 9, T, 5); dot(g, "#8a6238", 0, T - 9, T, 1.5); }
      if (g.h(3) < 0.1 && g.solid(c, r - 1)) { dot(g, "#8a6238", 7, 8, 18, 14); dot(g, "#cfeaf2", 9, 10, 14, 10); dot(g, "#e8f6fa", 10, 11, 5, 4); dot(g, "#b8566e", 7, 8, 3, 14); dot(g, "#b8566e", 22, 8, 3, 14); }
      else if (g.h(4) < 0.1 && g.solid(c, r - 1)) { dot(g, "#7a5636", 9, 8, 14, 15); dot(g, "#8fb4a0", 11, 10, 10, 11); dot(g, "#c9a24e", 13, 13, 6, 5); dot(g, "#5e8a70", 11, 18, 10, 3); }
    },
    crate(g) { // X: sofá ou mesa redonda com vaso
      if (g.h(3) < 0.55) {
        const s = SOFAS[Math.floor(g.h(4) * SOFAS.length)];
        soft(g, 5, 12, 24, 15);
        dot(g, s[2], 4, 8, 24, 16); dot(g, s[0], 4, 8, 24, 6); dot(g, s[2], 4, 13, 5, 11); dot(g, s[2], 23, 13, 5, 11);
        dot(g, s[1], 9, 15, 7, 8); dot(g, s[1], 16, 15, 7, 8); dot(g, "rgba(255,255,255,.3)", 4, 8, 24, 1.5); dot(g, "#f2e2b6", 10, 10, 4, 4);
      } else {
        softDisc(g, 16, 19, 10);
        circle(g, "#7a4e2c", 16, 16, 10); circle(g, "#b07a4c", 16, 16, 8.6); ring(g, "#d9a870", 16, 16, 8.6, 1);
        circle(g, "#f4ecd8", 16, 16, 3.6); circle(g, "#d9647a", 15, 14.5, 2); circle(g, "#79b25a", 18, 17.5, 1.8);
      }
    },
    high(g) { // T: estante alta cheia de livros ou arranhador de gato (poste de sisal com plataformas)
      if (g.h(3) < 0.55) {
        cast(g, 2, 2, 22, 22);
        dot(g, "#4a2c18", 2, 7, 22, 17); dot(g, "#d9a870", 2, 2, 22, 5); dot(g, "#f2cfa0", 2, 2, 22, 1.5);
        dot(g, "#2c1a0d", 4, 9, 18, 5); dot(g, "#2c1a0d", 4, 16, 18, 6);
        const cores = ["#c0453a", "#3f6fb0", "#e0a82e", "#4f9a5a", "#8a4a9a", "#e8e0c8"];
        let bx = 4; for (let i = 0; i < 5; i++) { const bw = 2 + (i % 2); dot(g, cores[Math.floor(g.h(4 + i) * cores.length)], bx, 9, bw, 5); bx += bw + 1; }
        bx = 4; for (let i = 0; i < 5; i++) { const bw = 3 - (i % 2); dot(g, cores[Math.floor(g.h(9 + i) * cores.length)], bx, 16, bw, 6); bx += bw + 1; }
        dot(g, "#6b4226", 2, 14, 22, 2); dot(g, "#6b4226", 2, 22, 22, 2);
      } else {
        cast(g, 1, 1, 24, 24);
        raise(g, 2, 21, 20, 3, 3, "#cbb89c", "#8a7a62");                                                   // base forrada de carpete
        dot(g, "#d8c08a", 9, 9, 6, 13); dot(g, "#a8905a", 9, 12, 6, 1); dot(g, "#a8905a", 9, 16, 6, 1); dot(g, "#a8905a", 9, 20, 6, 1);   // poste de sisal
        raise(g, 14, 12, 11, 4, 3, "#bdb0e0", "#7d6aa8");                                                  // degrau do lado
        raise(g, 1, 1, 17, 7, 4, "#d6ccf0", "#8f7cc0");                                                    // plataforma de cima, clara
        dot(g, "#d9473a", 22, 17, 1, 5); circle(g, "#d9473a", 22.5, 23, 2.4);                              // bolinha pendurada
      }
    },
    water(g) { // ~: água derramada no piso
      pond(g, "#8fd0f0", "#ffffff", "#6b4a30");
      dot(g, "rgba(255,255,255,.55)", 5, 4, 8, 1.5); circle(g, "#ffffff", 22 + Math.floor(g.h(3) * 4), 22, 1.4);
    },
  });
})();
