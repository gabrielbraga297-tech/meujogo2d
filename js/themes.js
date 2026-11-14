// Ambientes das fases (0.14.0): cada fase é um lugar que o cachorrinho conhece. Cada ambiente diz como desenhar o chão, as paredes (ou prédios, cercas, cercas vivas...)
// e as "caixas" (X) do mapa, tudo com formas simples e cores fixas; nada aqui mexe nas regras do jogo.
//
// Uso (js/game.js): const th = Themes.of(idDaFase, bichinho); a cada tile visível: th.floor(g), th.wall(g) ou th.crate(g), onde `g` traz
//   g.ctx, g.rect(x, y, w, h)  retângulo alinhado aos pixels do aparelho
//   g.x, g.y, g.c, g.r         canto de cima à esquerda do tile (px) e a coluna e a linha
//   g.h(k)                     número de 0 a 1 sempre igual para o mesmo tile e o mesmo k (sem piscar)
//   g.solid(c, r)              true se o tile é parede (prédio, cerca...) ou está fora do mapa
//   g.border                   true no anel de fora do mapa
//   g.night                    reservado
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Themes = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const T = 32;

  function hash(c, r, k) {
    let h = (Math.imul(c + 101, 374761393) + Math.imul(r + 211, 668265263) + Math.imul(k + 7, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  // tinta de duas cores alternadas (xadrez bem suave) para o chão
  const checker = (g, a, b) => { g.ctx.fillStyle = (g.r + g.c) % 2 ? a : b; g.rect(g.x, g.y, T, T); };
  const dot = (g, color, dx, dy, w, h) => { g.ctx.fillStyle = color; g.rect(g.x + dx, g.y + dy, w, h); };
  const circle = (g, color, cx, cy, rad) => { const c = g.ctx; c.fillStyle = color; c.beginPath(); c.arc(g.x + cx, g.y + cy, rad, 0, Math.PI * 2); c.fill(); };

  // Parede com borda só do lado de fora (as paredes vizinhas formam um bloco só): `top` clara em cima, `shade` escura embaixo e uma faixa fina nos lados.
  function block(g, base, top, shade, side) {
    const { c, r, x, y } = g;
    g.ctx.fillStyle = base; g.rect(x, y, T, T);
    if (!g.solid(c, r - 1)) { g.ctx.fillStyle = top; g.rect(x, y, T, 4); }
    if (!g.solid(c, r + 1)) { g.ctx.fillStyle = shade; g.rect(x, y + T - 4, T, 4); }
    g.ctx.fillStyle = side || shade;
    if (!g.solid(c - 1, r)) g.rect(x, y, 3, T);
    if (!g.solid(c + 1, r)) g.rect(x + T - 3, y, 3, T);
  }

  // ---------------------------------------------------------------------------------------------------------------------------------
  // 1. Quintal de casa: grama, cerca de madeira e vasos de planta
  const quintal = {
    id: 1, place: "Quintal", blurb: "o quintal da casa do cachorrinho",
    mover: { wall: ["#8a6a3a", "#b08850", "#4d3820"], door: ["#9c7a44", "#c9a468", "#5a4226"] },
    rail: ["#6b5a3a", "#2b2418"],
    floor(g) {
      checker(g, "#3f7d3b", "#3b7637");
      const h = g.h(1);
      if (h < 0.5) { for (let i = 0; i < 3; i++) { const px = 3 + Math.floor(g.h(2 + i) * 24), py = 4 + Math.floor(g.h(5 + i) * 22); dot(g, "#2f6a2e", px, py, 1.5, 4); dot(g, "#2f6a2e", px + 3, py + 1, 1.5, 3); } }
      if (h > 0.9) { const px = 6 + Math.floor(g.h(9) * 18), py = 6 + Math.floor(g.h(10) * 18); dot(g, g.h(11) < 0.5 ? "#f4f1e6" : "#f2c230", px, py, 3, 3); dot(g, "#d9534f", px + 1, py + 1, 1, 1); }
    },
    wall(g) {
      const { x, y } = g;
      block(g, "#7d5c34", "#b08850", "#4d3820", "#4d3820");
      g.ctx.fillStyle = "#4d3820"; for (let i = 8; i < T; i += 8) g.rect(x + i - 1, y + 4, 1, T - 8); // tábuas
      g.ctx.fillStyle = "#98733f"; g.rect(x, y + 12, T, 2); g.rect(x, y + 22, T, 2);                    // travessas
    },
    crate(g) { // vaso de planta
      circle(g, "rgba(0,0,0,.25)", 16, 19, 11);
      circle(g, "#b5562c", 16, 17, 10); circle(g, "#d9743d", 16, 16, 7.5);
      circle(g, "#2f8f3a", 16, 15, 6); circle(g, "#4cb34b", 14, 13, 3.5); circle(g, "#4cb34b", 19, 16, 3);
      if (g.h(3) < 0.6) circle(g, "#e8576a", 17, 12, 1.8);
    },
  };

  // 2. Campo: pasto claro com florzinhas, muros de pedra e fardos de feno
  const campo = {
    id: 2, place: "Campo", blurb: "o campo aberto, com muros de pedra e fardos de feno",
    mover: { wall: ["#7b6a4a", "#a58d63", "#463b27"], door: ["#8b7a55", "#b9a478", "#4e4230"] },
    rail: ["#6d6a5a", "#2b2a22"],
    floor(g) {
      checker(g, "#6fae52", "#6aa84f");
      const h = g.h(1);
      if (h < 0.4) { const px = 4 + Math.floor(g.h(2) * 22), py = 5 + Math.floor(g.h(3) * 20); dot(g, "#4f8d3d", px, py, 1.5, 4); dot(g, "#4f8d3d", px + 4, py + 2, 1.5, 3); dot(g, "#4f8d3d", px + 8, py, 1.5, 4); }
      if (h > 0.8) { const px = 5 + Math.floor(g.h(4) * 20), py = 5 + Math.floor(g.h(5) * 20); const col = ["#ffffff", "#f7d94c", "#e07be0", "#ff9a4d"][Math.floor(g.h(6) * 4)]; circle(g, col, px, py, 2); circle(g, "#f7d94c", px, py, 0.8); }
      if (h > 0.55 && h < 0.6) { dot(g, "#9a9a92", 8 + Math.floor(g.h(7) * 14), 20, 4, 3); }
    },
    wall(g) {
      const { x, y } = g;
      block(g, "#8e9096", "#b7b9bd", "#5c5e64", "#5c5e64");
      g.ctx.fillStyle = "#6f7177"; // pedras
      const off = Math.floor(g.h(2) * 6);
      for (const [py, ph] of [[5, 8], [14, 8], [23, 6]]) { const o = (py % 2 ? off : 0); g.rect(x + 2 + o, y + py, 12, ph - 1); g.rect(x + 17 + o, y + py, 11, ph - 1); }
      g.ctx.fillStyle = "#a9abb0"; g.rect(x + 3 + off, y + 6, 8, 2); g.rect(x + 18 + off, y + 15, 7, 2);
      if (g.h(8) < 0.25) { g.ctx.fillStyle = "#5e9a4a"; g.rect(x + 4, y + T - 9, 9, 3); }
    },
    crate(g) { // fardo de feno
      circle(g, "rgba(0,0,0,.25)", 16, 19, 12);
      circle(g, "#c99a2e", 16, 16, 12); circle(g, "#e6c65a", 16, 15, 10);
      g.ctx.strokeStyle = "#b58a28"; g.ctx.lineWidth = 1.2;
      for (const rr of [3.5, 6.5, 9]) { g.ctx.beginPath(); g.ctx.arc(g.x + 16, g.y + 15, rr, 0.4, 5.8); g.ctx.stroke(); }
    },
  };

  // 3. Casa: piso de tábua corrida, paredes com papel de parede e pufes
  const casa = {
    id: 3, place: "Casa", blurb: "dentro de casa: sala, cozinha e quartos",
    mover: { wall: ["#8a5a33", "#b27a45", "#4a2f18"], door: ["#a8763f", "#d09a5c", "#5a3a1c"] },
    rail: ["#5f4a35", "#241a12"],
    floor(g) {
      const { x, y, r } = g;
      checker(g, "#b8854f", "#b07e4a");
      g.ctx.fillStyle = "#8f6538";
      g.rect(x, y + 7, T, 1); g.rect(x, y + 15, T, 1); g.rect(x, y + 23, T, 1); g.rect(x, y + 31, T, 1);       // juntas das tábuas
      const j = (r % 2) * 10 + Math.floor(g.h(1) * 8);
      g.rect(x + 8 + j % 16, y, 1, 7); g.rect(x + 20 - j % 12, y + 8, 1, 7); g.rect(x + 6 + j % 14, y + 16, 1, 7); g.rect(x + 22 - j % 10, y + 24, 1, 7);
      if (g.h(2) > 0.93) { g.ctx.fillStyle = "rgba(255,255,255,.12)"; g.rect(x + 4, y + 4, 24, 6); } // reflexo no verniz
    },
    wall(g) {
      const { x, y, c, r } = g;
      block(g, "#e9dec7", "#fbf5e6", "#a99a7c", "#cbbd9f");
      g.ctx.fillStyle = "#dccfb2"; for (let i = 6; i < T; i += 8) g.rect(x + i, y + 4, 2, T - 8);           // listras do papel
      if (!g.solid(c, r + 1)) { g.ctx.fillStyle = "#6b4a2b"; g.rect(x, y + T - 9, T, 5); g.ctx.fillStyle = "#8a6238"; g.rect(x, y + T - 9, T, 1); } // rodapé
      if (g.h(3) < 0.07 && g.solid(c, r + 1) && g.solid(c, r - 1)) { g.ctx.fillStyle = "#cdbb94"; g.rect(x + 9, y + 9, 14, 14); g.ctx.fillStyle = "#7aa6c9"; g.rect(x + 11, y + 11, 10, 10); } // quadro
    },
    crate(g) { // pufe
      const cols = [["#c0504d", "#d9726f"], ["#4f81bd", "#6f9fd8"], ["#8aa83e", "#a6c455"]][Math.floor(g.h(4) * 3)];
      circle(g, "rgba(0,0,0,.25)", 16, 19, 12);
      circle(g, cols[0], 16, 17, 11); circle(g, cols[1], 16, 15, 9); circle(g, cols[0], 16, 15, 2.5);
    },
  };

  // 4. Rua do bairro: asfalto, calçadas e telhados
  const rua = {
    id: 4, place: "Rua do bairro", blurb: "a rua do bairro, entre as casas e os prédios",
    mover: { wall: ["#4a5470", "#5d6a8c", "#2c3347"], door: ["#6b7794", "#aeb8d0", "#3b4663"] },
    rail: ["#3b4663", "#10131c"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#2a2f3c", "#2d3342");
      if (g.free) {
        g.ctx.fillStyle = "#3d4559";
        if (g.solid(c, r - 1)) g.rect(x, y, T, 4);
        if (g.solid(c, r + 1)) g.rect(x, y + T - 4, T, 4);
        if (g.solid(c - 1, r)) g.rect(x, y, 4, T);
        if (g.solid(c + 1, r)) g.rect(x + T - 4, y, 4, T);
        if (g.h(1) > 0.9) { g.ctx.fillStyle = "#222733"; g.rect(x + 6 + Math.floor(g.h(2) * 14), y + 8 + Math.floor(g.h(3) * 12), 6, 2); } // remendo no asfalto
      }
    },
    wall(g) {
      const { x, y, c, r } = g;
      block(g, "#47516f", "#5d6a8c", "#333b55", "#333b55");
      if ((c * 7 + r * 13) % 8 === 0 && g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1)) { g.ctx.fillStyle = "#5a6688"; g.rect(x + 9, y + 9, 14, 14); g.ctx.fillStyle = "#3d4663"; g.rect(x + 12, y + 12, 8, 8); } // claraboia
    },
    crate(g) { // lixeira
      circle(g, "rgba(0,0,0,.25)", 16, 19, 11);
      circle(g, "#2f7d4a", 16, 16, 10.5); circle(g, "#3f9a5d", 16, 15, 8.5); circle(g, "#2f7d4a", 16, 15, 2.6);
    },
  };

  // 5. Condomínio: calçadões de concreto, jardins junto dos blocos e prédios com janelas
  const condominio = {
    id: 5, place: "Condomínio", blurb: "o condomínio: jardins, calçadões e blocos de apartamentos",
    mover: { wall: ["#5d6676", "#7f8a9d", "#2f3541"], door: ["#7a8497", "#b5bfd0", "#3f4757"] },
    rail: ["#5c6270", "#1f232b"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#9097a2", "#9aa0ab");
      g.ctx.fillStyle = "#7c828d"; g.rect(x, y + 15, T, 1); g.rect(x + 15, y, 1, T);                          // juntas das lajes
      if (g.free) {
        g.ctx.fillStyle = "#5c9c4a"; // jardim junto dos prédios
        if (g.solid(c, r - 1)) g.rect(x, y, T, 6);
        if (g.solid(c, r + 1)) g.rect(x, y + T - 6, T, 6);
        if (g.solid(c - 1, r)) g.rect(x, y, 6, T);
        if (g.solid(c + 1, r)) g.rect(x + T - 6, y, 6, T);
        g.ctx.fillStyle = "#3f7d3b";
        if (g.solid(c, r - 1) && g.h(1) < 0.4) g.rect(x + 4 + Math.floor(g.h(2) * 18), y + 1, 4, 3);
      }
    },
    wall(g) {
      const { x, y, c, r } = g;
      block(g, "#cdb99a", "#e7d7b9", "#8a785c", "#a89574");
      const inner = g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1);
      g.ctx.fillStyle = inner ? "#6c8fb5" : "#7a9cc0";                                                          // janelas
      if (inner) { for (const [dx, dy] of [[6, 6], [18, 6], [6, 19], [18, 19]]) g.rect(x + dx, y + dy, 8, 7); } else { g.rect(x + 7, y + 8, 7, 8); g.rect(x + 18, y + 8, 7, 8); }
      g.ctx.fillStyle = "#4e6a8a"; if (inner) { for (const [dx, dy] of [[6, 12], [18, 12], [6, 25], [18, 25]]) g.rect(x + dx, y + dy, 8, 1); }
    },
    crate(g) { // jardineira
      g.ctx.fillStyle = "rgba(0,0,0,.25)"; g.rect(g.x + 5, g.y + 9, 24, 21);
      g.ctx.fillStyle = "#8a5a33"; g.rect(g.x + 4, g.y + 7, 24, 20); g.ctx.fillStyle = "#6c4524"; g.rect(g.x + 4, g.y + 22, 24, 5);
      circle(g, "#3f9a4a", 11, 12, 5); circle(g, "#58b85a", 17, 11, 6); circle(g, "#3f9a4a", 23, 13, 5); circle(g, "#f0b4c8", 16, 9, 1.8);
    },
  };

  // 6. Praça: piso de pedras claras, canteiros (cerca viva) e bancos
  const praca = {
    id: 6, place: "Praça", blurb: "a praça, onde os cachorros se encontram",
    mover: { wall: ["#3a3f48", "#59606c", "#1f2228"], door: ["#4a505b", "#7d8696", "#262a31"] },
    rail: ["#7c7660", "#2b2820"],
    floor(g) {
      const { x, y } = g;
      checker(g, "#d1c4a4", "#cabd9c");
      g.ctx.fillStyle = "#b3a583";
      for (let i = 0; i < 4; i++) { const px = 2 + Math.floor(g.h(1 + i) * 24), py = 2 + Math.floor(g.h(6 + i) * 24); g.rect(x + px, y + py, 5, 3); }
      g.ctx.fillStyle = "#e0d6bb"; g.rect(x + 3 + Math.floor(g.h(11) * 20), y + 3 + Math.floor(g.h(12) * 20), 4, 2);
    },
    wall(g) { // canteiro: cerca viva
      const { x, y } = g;
      block(g, "#2d6a34", "#3d8742", "#1f4a25", "#245a2b");
      g.ctx.fillStyle = "#3e8a45";
      for (let i = 0; i < 4; i++) { const px = 3 + Math.floor(g.h(1 + i) * 22), py = 6 + Math.floor(g.h(5 + i) * 18); g.rect(x + px, y + py, 6, 5); }
      g.ctx.fillStyle = "#245a2b"; g.rect(x + 8, y + 20, 5, 3);
      if (g.h(9) < 0.08) { g.ctx.fillStyle = "#e8576a"; g.rect(x + 10, y + 12, 3, 3); g.rect(x + 20, y + 18, 3, 3); }
    },
    crate(g) { // banco de praça
      g.ctx.fillStyle = "rgba(0,0,0,.25)"; g.rect(g.x + 4, g.y + 11, 26, 18);
      g.ctx.fillStyle = "#6c6f78"; g.rect(g.x + 4, g.y + 8, 3, 18); g.rect(g.x + 25, g.y + 8, 3, 18);
      g.ctx.fillStyle = "#9a6a36"; for (const yy of [8, 13, 18, 23]) g.rect(g.x + 4, g.y + yy, 24, 4);
      g.ctx.fillStyle = "#b98748"; for (const yy of [8, 13, 18, 23]) g.rect(g.x + 4, g.y + yy, 24, 1);
    },
  };

  // 7. Parque canino: grama, canteiros de terra, cercas brancas e cones de agilidade
  const parque = {
    id: 7, place: "Parque canino", blurb: "o parque dos cachorros: cercas, cones e muita grama",
    mover: { wall: ["#6b9a5a", "#93c080", "#2f4a28"], door: ["#7fae6b", "#b4dba0", "#35502d"] },
    rail: ["#5b6e48", "#1f2a1a"],
    floor(g) {
      const { x, y } = g;
      checker(g, "#59a24b", "#559c47");
      if (g.h(1) < 0.16) { g.ctx.fillStyle = "#a98b5e"; g.rect(x + 3 + Math.floor(g.h(2) * 8), y + 4 + Math.floor(g.h(3) * 8), 14 + Math.floor(g.h(4) * 6), 9 + Math.floor(g.h(5) * 6)); g.ctx.fillStyle = "#8f7449"; g.rect(x + 9, y + 12, 5, 2); }
      else if (g.h(1) > 0.7) { g.ctx.fillStyle = "#437f38"; const px = 4 + Math.floor(g.h(6) * 22); g.rect(x + px, y + 8 + Math.floor(g.h(7) * 14), 1.5, 4); g.rect(x + px + 3, y + 9 + Math.floor(g.h(7) * 14), 1.5, 3); }
    },
    wall(g) { // cerca viva com cerca branca por cima
      const { x, y, c, r } = g;
      block(g, "#3a7d3e", "#53a257", "#265a2b", "#2c6a31");
      g.ctx.fillStyle = "#f0f0ea";
      if (!g.solid(c, r - 1) || g.h(2) < 0.5) { g.rect(x, y + 9, T, 3); g.rect(x, y + 19, T, 3); }
      g.ctx.fillStyle = "#d3d3cb"; g.rect(x + 3, y + 5, 3, 22); g.rect(x + 26, y + 5, 3, 22);
    },
    crate(g) { // cone de agilidade
      circle(g, "rgba(0,0,0,.25)", 16, 19, 11);
      circle(g, "#ff7a1a", 16, 16, 10.5); circle(g, "#ffffff", 16, 16, 7); circle(g, "#ff7a1a", 16, 16, 4.5); circle(g, "#d95e0a", 16, 16, 1.5);
    },
  };

  // 8. Feira: paralelepípedo escuro, barracas de toldo listrado e caixas de fruta
  const AWNINGS = [["#d9483b", "#fbf3e4"], ["#2f8f5a", "#fbf3e4"], ["#3b6fc9", "#fbf3e4"], ["#e8a62a", "#fbf3e4"]];
  const feira = {
    id: 8, place: "Feira", blurb: "a feira de rua, entre as barracas e as caixas de frutas",
    mover: { wall: ["#a05a3b", "#c47a55", "#4d281a"], door: ["#b86a45", "#e09a73", "#5a2f1c"] },
    rail: ["#5a4c40", "#1c1612"],
    floor(g) {
      const { x, y } = g;
      checker(g, "#6e5f52", "#726356");
      g.ctx.fillStyle = "#57493f";
      g.rect(x, y + 8, T, 1); g.rect(x, y + 16, T, 1); g.rect(x, y + 24, T, 1);
      const o = Math.floor(g.h(1) * 8); g.rect(x + 6 + o, y, 1, 8); g.rect(x + 20 - o, y + 9, 1, 7); g.rect(x + 12 + o, y + 17, 1, 7); g.rect(x + 4 + o, y + 25, 1, 7);
      if (g.h(2) > 0.92) { g.ctx.fillStyle = "rgba(120,170,210,.3)"; g.rect(x + 5, y + 10, 18, 9); } // poça
    },
    wall(g) {
      const { x, y, c, r } = g;
      const aw = AWNINGS[Math.floor(hash(c >> 1, r >> 1, 3) * AWNINGS.length)];
      block(g, aw[1], aw[0], "#2a2a33", "#2a2a33");
      g.ctx.fillStyle = aw[0]; for (let i = 0; i < T; i += 8) g.rect(x + i, y + 4, 4, T - 8);                       // listras do toldo
      if (!g.solid(c, r + 1)) { g.ctx.fillStyle = aw[0]; for (let i = 0; i < T; i += 8) g.rect(x + i, y + T - 8, 4, 4); }
    },
    crate(g) { // caixa de frutas
      g.ctx.fillStyle = "rgba(0,0,0,.25)"; g.rect(g.x + 5, g.y + 9, 24, 21);
      g.ctx.fillStyle = "#a97b43"; g.rect(g.x + 4, g.y + 7, 24, 22); g.ctx.fillStyle = "#7d5829"; g.rect(g.x + 4, g.y + 13, 24, 2); g.rect(g.x + 4, g.y + 21, 24, 2);
      const fruit = [["#e0452f", "#f2705a"], ["#f2b632", "#f7d467"], ["#6ab04c", "#8bd36a"]][Math.floor(g.h(5) * 3)];
      for (const [dx, dy] of [[9, 11], [16, 10], [22, 12], [11, 18], [19, 18]]) { circle(g, fruit[0], dx, dy, 3.4); circle(g, fruit[1], dx - 1, dy - 1, 1.2); }
    },
  };

  // 9. Praia (calçadão): areia, quiosques de palha e guarda-sóis; o anel de fora do mapa é o mar
  const praia = {
    id: 9, place: "Praia", blurb: "o calçadão da praia, com quiosques e guarda-sóis",
    mover: { wall: ["#b89a62", "#dcc088", "#6a5632"], door: ["#c9ab74", "#ecd6a2", "#6f5b34"] },
    rail: ["#8a7f5c", "#2c2820"],
    floor(g) {
      const { x, y } = g;
      checker(g, "#e8d49b", "#e2cd94");
      g.ctx.fillStyle = "#cdb877";
      for (let i = 0; i < 5; i++) g.rect(x + Math.floor(g.h(1 + i) * 28), y + Math.floor(g.h(6 + i) * 28), 2, 1.5);
      if (g.h(12) > 0.94) { circle(g, "#f4e9d8", 9 + Math.floor(g.h(13) * 14), 9 + Math.floor(g.h(14) * 14), 2.4); circle(g, "#e7a0a0", 9 + Math.floor(g.h(13) * 14), 9 + Math.floor(g.h(14) * 14), 1); }
    },
    wall(g) {
      const { x, y, c, r } = g;
      if (g.border) { // mar
        g.ctx.fillStyle = (c + r) % 2 ? "#2b78b8" : "#2f80c2"; g.rect(x, y, T, T);
        g.ctx.fillStyle = "#e8f4fb";
        const o = Math.floor(g.h(1) * 10);
        g.rect(x + 2 + o, y + 8, 9, 2); g.rect(x + 15 + o % 6, y + 20, 10, 2); g.rect(x + 6, y + 27, 6, 2);
        g.ctx.fillStyle = "#6fb4e8"; g.rect(x + 10, y + 14, 8, 1.5);
        return;
      }
      block(g, "#c9a45a", "#e3c47a", "#7d6330", "#9c7d40"); // quiosque com telhado de palha
      g.ctx.fillStyle = "#a88a45"; for (let i = 5; i < T; i += 6) g.rect(x + i, y + 4, 1.5, T - 8);
      if (g.h(2) < 0.1 && g.solid(c, r + 1) && g.solid(c, r - 1)) { g.ctx.fillStyle = "#d9483b"; g.rect(x + 10, y + 10, 12, 12); g.ctx.fillStyle = "#fbf3e4"; g.rect(x + 14, y + 10, 4, 12); }
    },
    crate(g) { // guarda-sol visto de cima
      circle(g, "rgba(0,0,0,.2)", 17, 19, 13);
      const cols = [["#d9483b", "#fbf3e4"], ["#2f8f5a", "#fbf3e4"], ["#3b6fc9", "#fbf3e4"]][Math.floor(g.h(4) * 3)];
      circle(g, cols[1], 16, 16, 12.5);
      g.ctx.fillStyle = cols[0];
      for (let i = 0; i < 8; i += 2) { g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 16); g.ctx.arc(g.x + 16, g.y + 16, 12.5, i * Math.PI / 4, (i + 1) * Math.PI / 4); g.ctx.closePath(); g.ctx.fill(); }
      circle(g, "#5a4a2e", 16, 16, 1.6);
    },
  };

  // 10. Central da carrocinha: concreto, faixas de alerta, paredes de aço e jaulas
  const central = {
    id: 10, place: "Central da carrocinha", blurb: "a central da carrocinha: concreto, grades e jaulas",
    mover: { wall: ["#4a5470", "#5d6a8c", "#2c3347"], door: ["#6b7794", "#aeb8d0", "#3b4663"] },
    rail: ["#444c5c", "#10131a"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#5a606b", "#555b66");
      g.ctx.fillStyle = "#484d57"; g.rect(x, y + 15, T, 1); g.rect(x + 15, y, 1, T);
      if (g.free) { // faixa de alerta amarela e preta junto das paredes
        const stripe = (sx, sy, sw, sh) => { g.ctx.fillStyle = "#e8c030"; g.rect(sx, sy, sw, sh); g.ctx.fillStyle = "#1b1b1b"; for (let i = 0; i < 32; i += 8) g.rect(sx + (sw > sh ? i : 0), sy + (sw > sh ? 0 : i), sw > sh ? 4 : sw, sw > sh ? sh : 4); };
        if (g.solid(c, r - 1) && g.h(1) < 0.5) stripe(x, y, T, 3);
        if (g.solid(c, r + 1) && g.h(2) < 0.5) stripe(x, y + T - 3, T, 3);
      }
      if (g.h(3) > 0.95) { g.ctx.fillStyle = "#3d424b"; g.rect(x + 8, y + 12, 14, 6); }
    },
    wall(g) {
      const { x, y, c, r } = g;
      block(g, "#3a4150", "#566074", "#232834", "#2c3240");
      g.ctx.fillStyle = "#8a93a5"; for (let i = 6; i < T; i += 6) g.rect(x + i, y + 5, 1.5, T - 10);               // grades
      g.ctx.fillStyle = "#6b7487"; g.rect(x, y + 9, T, 2); g.rect(x, y + 21, T, 2);
      if (g.h(4) < 0.15) { g.ctx.fillStyle = "#c04545"; g.rect(x + 13, y + 13, 5, 5); }
    },
    crate(g) { // jaula
      g.ctx.fillStyle = "rgba(0,0,0,.25)"; g.rect(g.x + 5, g.y + 9, 24, 21);
      g.ctx.fillStyle = "#8a93a5"; g.rect(g.x + 4, g.y + 7, 24, 21); g.ctx.fillStyle = "#2f3541"; g.rect(g.x + 6, g.y + 9, 20, 17);
      g.ctx.fillStyle = "#b9c1d1"; for (let i = 9; i < 26; i += 4) g.rect(g.x + i, g.y + 9, 1.5, 17);
    },
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Fases 11 a 20: mesmas regras de desenho dos temas acima (retângulos e círculos simples, cores fixas, tudo dentro do tile de 32 px, nada pisca)
  const pick = (list, v) => list[Math.min(list.length - 1, Math.floor(v * list.length))];
  const shadowBox = (g) => dot(g, "rgba(0,0,0,.25)", 5, 9, 24, 21);   // sombra de uma "caixa" quadrada
  const shadowDisc = (g, rad) => circle(g, "rgba(0,0,0,.25)", 16, 19, rad);

  // 11. Beco dos gatos: paralelepípedo escuro e molhado, muros de tijolo velho com pichação e caixas de papelão e latões
  const CAT_TAGS = ["rgba(80,200,190,.55)", "rgba(214,96,160,.55)"];
  const beco = {
    id: 11, place: "Beco dos gatos", blurb: "o beco dos gatos: paralelepípedo molhado, muros de tijolo e latões",
    mover: { wall: ["#4f7088", "#7aa2bd", "#1f3442"], door: ["#6c9a3a", "#a4cf6a", "#2c4614"] },
    rail: ["#8a7b52", "#1d1a14"],
    floor(g) {
      const { x, y } = g;
      checker(g, "#544450", "#574753");
      g.ctx.fillStyle = "#231f27";                                                                                 // juntas largas entre as pedras
      g.rect(x, y, T, 2); g.rect(x, y + 16, T, 2);
      g.rect(x, y + 2, 2, 14); g.rect(x + 11, y + 2, 2, 14); g.rect(x + 22, y + 2, 2, 14);
      g.rect(x + 5, y + 18, 2, 14); g.rect(x + 16, y + 18, 2, 14); g.rect(x + 27, y + 18, 2, 14);
      if (g.h(2) < 0.5) dot(g, "rgba(0,0,0,.15)", 2 + 11 * Math.floor(g.h(3) * 2), 2, 9, 14);                      // uma pedra mais escura
      dot(g, "rgba(190,210,235,.16)", 3 + Math.floor(g.h(4) * 14), g.h(5) < 0.5 ? 4 : 20, 6, 1);                   // brilho do molhado
      if (g.h(6) > 0.86) { const px = 9 + Math.floor(g.h(7) * 6), py = 12 + Math.floor(g.h(8) * 6); circle(g, "rgba(70,110,150,.42)", px, py, 7); circle(g, "rgba(70,110,150,.42)", px + 8, py + 2, 5); circle(g, "rgba(205,228,246,.35)", px - 2, py - 2, 2); } // poça
    },
    wall(g) {
      const { x, y, c, r } = g;
      block(g, "#7b4a40", "#a76b57", "#3f2527", "#4a2c2d");
      g.ctx.fillStyle = "#4b2e2b";                                                                                 // argamassa
      g.rect(x, y + 8, T, 1); g.rect(x, y + 16, T, 1); g.rect(x, y + 24, T, 1); if (g.solid(c, r - 1)) g.rect(x, y, T, 1);
      g.rect(x + 15, y + 1, 1, 7); g.rect(x + 7, y + 9, 1, 7); g.rect(x + 23, y + 9, 1, 7); g.rect(x + 15, y + 17, 1, 7); g.rect(x + 7, y + 25, 1, 7); g.rect(x + 23, y + 25, 1, 7);
      const row = Math.floor(g.h(2) * 4), half = g.h(3) < 0.5 ? 0 : 1;                                             // tijolo velho: uns mais escuros, outros mais claros
      dot(g, "rgba(0,0,0,.17)", row % 2 ? (half ? 8 : 1) : (half ? 16 : 1), 1 + 8 * row, 14, 7);
      dot(g, "rgba(255,190,160,.12)", row % 2 ? (half ? 1 : 24) : (half ? 1 : 16), 1 + 8 * ((row + 2) % 4), 6, 7);
      if (g.h(7) < 0.06) { // pichação discreta: carinha de gato
        const tag = pick(CAT_TAGS, g.h(8));
        dot(g, tag, 10, 9, 3, 4); dot(g, tag, 19, 9, 3, 4); circle(g, tag, 16, 17, 6.5); dot(g, "rgba(20,30,30,.85)", 12.5, 15, 2, 2.5); dot(g, "rgba(20,30,30,.85)", 17.5, 15, 2, 2.5);
      }
    },
    crate(g) {
      if (g.h(4) < 0.55) { // caixa de papelão
        shadowBox(g);
        dot(g, "#b88d55", 4, 7, 24, 21); dot(g, "#d7b57c", 4, 7, 24, 3); dot(g, "#8c6a3c", 4, 26, 24, 2);
        dot(g, "#e3d3a8", 12, 10, 8, 16); dot(g, "#8c6a3c", 15, 10, 2, 16);                                         // fita e emenda das abas
        dot(g, "#f5f0e2", 6, 19, 6, 5); dot(g, "#c0392b", 7, 20, 4, 1);                                              // etiqueta
      } else { // latão de lixo visto de cima
        const col = g.h(5) < 0.5 ? ["#5d6873", "#7d8995", "#4a535c"] : ["#46614f", "#678a73", "#364a3d"];
        shadowDisc(g, 11);
        circle(g, col[2], 16, 16, 11); circle(g, col[0], 16, 16, 9.5); circle(g, col[1], 16, 16, 7.2); circle(g, col[0], 16, 16, 5);
        dot(g, col[2], 12, 8, 8, 2);                                                                                 // alça da tampa
      }
    },
  };

  // 12. Pet shop: piso de ladrilho claro com faixas, prateleiras coloridas e caixas de ração e bolinhas
  const PRODUCTS = ["#e8564a", "#3b82d6", "#f2b632", "#58b85a", "#a45ad6", "#f08ac0", "#ff8a3d", "#2fb5b0"];
  const petshop = {
    id: 12, place: "Pet shop", blurb: "o pet shop: prateleiras coloridas e caixas de ração",
    mover: { wall: ["#8a56b8", "#b68ad8", "#43225f"], door: ["#e0589a", "#f58cbf", "#5e1a3b"] },
    rail: ["#5e5440", "#16130c"],
    floor(g) {
      const { x, y, r } = g;
      checker(g, "#cae4e9", "#c5e0e6");
      g.ctx.fillStyle = "#a7cad2"; g.rect(x + 15, y, 1, T); g.rect(x, y + 15, T, 1);                               // juntas dos ladrilhos
      if (r % 3 === 0) { dot(g, "#f3d0dc", 0, 8, T, 8); dot(g, "#e3a6bd", 0, 8, T, 1); dot(g, "#e3a6bd", 0, 15, T, 1); } // faixa rosa
      if (g.h(2) > 0.93) { const px = 8 + Math.floor(g.h(3) * 10), py = 8 + Math.floor(g.h(4) * 10); circle(g, "#a7cad2", px + 4, py + 5, 3.2); circle(g, "#a7cad2", px + 1, py, 1.5); circle(g, "#a7cad2", px + 4, py - 1.5, 1.5); circle(g, "#a7cad2", px + 7, py, 1.5); } // patinha pintada no chão
    },
    wall(g) { // prateleiras cheias de produtos
      const { x, y } = g;
      block(g, "#2f6773", "#5a96a3", "#1c3f48", "#1c3f48");
      g.ctx.fillStyle = "#f1e9d8"; g.rect(x + 2, y + 13, 28, 2); g.rect(x + 2, y + 26, 28, 2);                      // tábuas das prateleiras
      for (let k = 0; k < 6; k++) {
        const col = k % 3, ph = 6 + Math.floor(g.h(10 + k) * 3);
        g.ctx.fillStyle = pick(PRODUCTS, g.h(20 + k)); g.rect(x + 3 + col * 9, y + (k < 3 ? 13 : 26) - ph, 8, ph);
      }
    },
    crate(g) {
      if (g.h(4) < 0.55) { // caixa de ração, com a patinha
        const col = pick(["#d9483b", "#3b82d6", "#e88a2e"], g.h(5));
        shadowBox(g);
        dot(g, col, 4, 7, 24, 21); dot(g, "#fbf3e4", 4, 13, 24, 8);
        circle(g, "#7a5230", 16, 17.5, 2.2); circle(g, "#7a5230", 13.2, 15, 1); circle(g, "#7a5230", 16, 14.2, 1); circle(g, "#7a5230", 18.8, 15, 1);
      } else { // pote de bolinhas
        shadowDisc(g, 11.5);
        circle(g, "#e8edf2", 16, 16, 11.5); circle(g, "#b9c3cf", 16, 16, 9.5);
        for (const [dx, dy, i] of [[11, 12.5, 0], [19, 11.5, 1], [15, 18, 2], [22, 17.5, 3], [10.5, 19, 4]]) circle(g, pick(PRODUCTS, g.h(30 + i)), dx, dy, 3.2);
      }
    },
  };

  // 13. Fazenda: terra batida com palha, celeiro vermelho, fardos e sacos
  const fazenda = {
    id: 13, place: "Fazenda", blurb: "a fazenda: terra batida, celeiro vermelho, fardos e sacos",
    mover: { wall: ["#e9e2cf", "#fffaf0", "#8a7d5f"], door: ["#2f6f95", "#5aa4cc", "#163a50"] },
    rail: ["#4a3322", "#120c07"],
    floor(g) {
      checker(g, "#8e6538", "#8a6234");
      dot(g, "#7a5430", 3 + Math.floor(g.h(2) * 22), 4 + Math.floor(g.h(3) * 22), 4, 2);                          // torrões
      dot(g, "#82592f", 3 + Math.floor(g.h(4) * 22), 4 + Math.floor(g.h(5) * 22), 3, 2);
      if (g.h(1) < 0.45) { const px = 3 + Math.floor(g.h(6) * 18), py = 3 + Math.floor(g.h(7) * 22); dot(g, "#d6bd72", px, py, 6, 1); dot(g, "#d6bd72", px + 2, py + 2, 5, 1); dot(g, "#bfa357", px + 1, py + 4, 6, 1); } // palha
    },
    wall(g) { // celeiro de tábuas vermelhas com friso branco
      const { x, y, c, r } = g;
      block(g, "#9d2f27", "#e9dcc0", "#561814", "#e0d2b4");
      dot(g, "rgba(0,0,0,.12)", 8 * Math.floor(g.h(2) * 4), 4, 8, 24);
      g.ctx.fillStyle = "#7c241f"; for (let i = 8; i < T; i += 8) g.rect(x + i - 1, y + 4, 1.5, T - 8);            // tábuas
      if (g.h(5) < 0.12 && g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1)) {      // porta do celeiro com X
        g.ctx.fillStyle = "#efe3c8";
        g.rect(x + 5, y + 5, 22, 2); g.rect(x + 5, y + 25, 22, 2); g.rect(x + 5, y + 5, 2, 22); g.rect(x + 25, y + 5, 2, 22);
        g.ctx.strokeStyle = "#efe3c8"; g.ctx.lineWidth = 2.5; g.ctx.beginPath(); g.ctx.moveTo(x + 7, y + 7); g.ctx.lineTo(x + 25, y + 25); g.ctx.moveTo(x + 25, y + 7); g.ctx.lineTo(x + 7, y + 25); g.ctx.stroke();
      }
    },
    crate(g) {
      if (g.h(4) < 0.55) { // fardo de palha quadrado
        shadowBox(g);
        dot(g, "#d6b45a", 4, 7, 24, 21); dot(g, "#ead486", 4, 7, 24, 2);
        g.ctx.fillStyle = "#b8923c"; g.rect(g.x + 6, g.y + 12, 14 + Math.floor(g.h(5) * 6), 1); g.rect(g.x + 10, g.y + 16, 16, 1); g.rect(g.x + 6, g.y + 20, 12 + Math.floor(g.h(6) * 8), 1); g.rect(g.x + 12, g.y + 24, 14, 1);
        dot(g, "#6b4f2a", 10, 7, 2, 21); dot(g, "#6b4f2a", 21, 7, 2, 21);                                            // barbantes
      } else { // saco de grãos amarrado
        shadowDisc(g, 11);
        circle(g, "#cdb487", 16, 18, 11); circle(g, "#dcc79c", 15, 17, 8.5);
        dot(g, "#a88f64", 8, 14, 16, 1.5); dot(g, "#a88f64", 10, 20, 12, 1.5);
        circle(g, "#8a6a3a", 16, 8.5, 2.4); dot(g, "#8a6a3a", 14, 10, 4, 2);                                         // amarração
      }
    },
  };

  // 14. Bosque: chão de folhas e terra, copas de árvores e moitas densas, troncos baixos
  const LEAVES = ["#9a5a2a", "#b0752f", "#6d7a38", "#3f3320"];
  const bosque = {
    id: 14, place: "Bosque", blurb: "o bosque: folhas secas, árvores densas e troncos caídos",
    mover: { wall: ["#c8a06a", "#ecd0a0", "#6a4a26"], door: ["#8c93a0", "#c0c6d2", "#41454e"] },
    rail: ["#9a8450", "#0e0b06"],
    floor(g) {
      checker(g, "#50442a", "#53472d");
      for (let i = 0; i < 5; i++) dot(g, pick(LEAVES, g.h(10 + i)), 2 + Math.floor(g.h(20 + i) * 25), 2 + Math.floor(g.h(30 + i) * 26), 3, 2); // folhas caídas
      if (g.h(2) < 0.3) dot(g, "#3a2c18", 4 + Math.floor(g.h(3) * 16), 6 + Math.floor(g.h(4) * 18), 9, 1);        // graveto
      if (g.h(9) > 0.975) { dot(g, "#e8e0cc", 14, 17, 3, 5); circle(g, "#c0392b", 15.5, 16, 4); dot(g, "#f4ead6", 14, 14.5, 1.5, 1.5); } // cogumelo
    },
    wall(g) { // copa de árvore ou moita
      block(g, "#1b4527", "#2f6b3b", "#0d2a17", "#12331e");
      for (let i = 0; i < 3; i++) circle(g, i % 2 ? "#265f33" : "#2d6c3b", 9 + g.h(1 + i) * 14, 9 + g.h(4 + i) * 14, 6 + g.h(7 + i) * 2.5);
      for (let i = 0; i < 2; i++) circle(g, "#3f8a4c", 10 + g.h(10 + i) * 12, 10 + g.h(12 + i) * 12, 2.6);          // folhas claras
      if (g.h(15) < 0.06) { dot(g, "#d9483b", 12, 12, 3, 3); dot(g, "#d9483b", 20, 19, 3, 3); }                     // frutinhas
    },
    crate(g) {
      const k = g.h(4);
      if (k < 0.34) { // toco visto de cima
        shadowDisc(g, 11);
        circle(g, "#5b3c22", 16, 16, 11); circle(g, "#d6ab70", 16, 16, 9); circle(g, "#c39555", 16, 16, 6.3); circle(g, "#d6ab70", 16, 16, 4); circle(g, "#a5763f", 16, 16, 1.6);
      } else { // tronco deitado (na horizontal ou na vertical)
        const v = k > 0.67, P = (col, a, b, w, h) => (v ? dot(g, col, b, a, h, w) : dot(g, col, a, b, w, h)), C = (col, a, b, rad) => (v ? circle(g, col, b, a, rad) : circle(g, col, a, b, rad));
        P("rgba(0,0,0,.25)", 5, 12, 24, 15); P("#6a4526", 8, 10, 21, 14); P("#85603a", 8, 10, 21, 3);
        P("#4b2f19", 14, 13, 1, 8); P("#4b2f19", 20, 12, 1, 6); P("#4b2f19", 25, 15, 1, 7);                          // casca
        C("#5b3c22", 8, 17, 7.5); C("#d6ab70", 8, 17, 6); C("#c39555", 8, 17, 3.6); C("#a5763f", 8, 17, 1.2);       // ponta cortada
      }
    },
  };

  // 15. Lago e docas: tábuas de madeira velha, água com ondinhas e margem, barris e boias
  const lago = {
    id: 15, place: "Lago e docas", blurb: "o lago e as docas: tábuas, água e barris",
    mover: { wall: ["#dfe3e8", "#ffffff", "#5b6772"], door: ["#d9782b", "#f2a468", "#5a2c0c"] },
    rail: ["#3b3228", "#0f0c09"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#a89a82", "#a4967e");
      g.ctx.fillStyle = "#5a4e40"; g.rect(x, y + 7, T, 1); g.rect(x, y + 15, T, 1); g.rect(x, y + 23, T, 1); g.rect(x, y + 31, T, 1); // vão entre as tábuas
      for (let j = 0; j < 4; j++) g.rect(x + 3 + Math.floor(g.h(1 + j) * 24), y + 8 * j, 1, 7);                       // emendas
      g.ctx.fillStyle = "#3a3128"; g.rect(x + 3, y + 3, 2, 2); g.rect(x + 27, y + 19, 2, 2);                                // pregos
      if (g.h(6) > 0.9) dot(g, "rgba(255,255,255,.1)", 4, 8 * Math.floor(g.h(7) * 4) + 1, 24, 3);
      if (g.free) { // viga de borda onde a doca encontra a água
        const up = g.solid(c, r - 1), dn = g.solid(c, r + 1), lf = g.solid(c - 1, r), rt = g.solid(c + 1, r);
        if (up) { dot(g, "#5a452f", 0, 0, T, 6); dot(g, "#2f2418", 0, 0, T, 1); dot(g, "#7d5f3d", 0, 5, T, 1); }
        if (dn) { dot(g, "#5a452f", 0, T - 6, T, 6); dot(g, "#2f2418", 0, T - 1, T, 1); dot(g, "#7d5f3d", 0, T - 6, T, 1); }
        if (lf) { dot(g, "#5a452f", 0, 0, 6, T); dot(g, "#2f2418", 0, 0, 1, T); dot(g, "#7d5f3d", 5, 0, 1, T); }
        if (rt) { dot(g, "#5a452f", T - 6, 0, 6, T); dot(g, "#2f2418", T - 1, 0, 1, T); dot(g, "#7d5f3d", T - 6, 0, 1, T); }
        if ((up || dn) && g.h(8) < 0.14) { dot(g, "#2b2118", 12, up ? 1 : T - 8, 7, 7); dot(g, "#5b4630", 13, up ? 2 : T - 7, 5, 2); } // moirão
      }
    },
    wall(g) { // água do lago
      const { x, y, c, r } = g;
      g.ctx.fillStyle = (c + r) % 2 ? "#1f627d" : "#226780"; g.rect(x, y, T, T);
      const o = Math.floor(g.h(1) * 8);
      g.ctx.fillStyle = "#4b9bb5"; g.rect(x + 3 + o, y + 6, 8, 1.5); g.rect(x + 17 + o % 5, y + 14, 9, 1.5); g.rect(x + 5 + o % 4, y + 24, 7, 1.5); // ondinhas
      g.ctx.fillStyle = "#a9d6e6"; g.rect(x + 20 - o, y + 9, 3, 1); g.rect(x + 8 + o % 3, y + 19, 3, 1);
      const inner = g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1);
      if (!g.solid(c, r - 1)) { dot(g, "#3f93ad", 0, 0, T, 5); dot(g, "#cfeaf3", 0, 0, T, 2); }                      // margem: água rasa e espuma
      if (!g.solid(c, r + 1)) { dot(g, "#3f93ad", 0, T - 5, T, 5); dot(g, "#cfeaf3", 0, T - 2, T, 2); }
      if (!g.solid(c - 1, r)) { dot(g, "#3f93ad", 0, 0, 5, T); dot(g, "#cfeaf3", 0, 0, 2, T); }
      if (!g.solid(c + 1, r)) { dot(g, "#3f93ad", T - 5, 0, 5, T); dot(g, "#cfeaf3", T - 2, 0, 2, T); }
      if (inner && g.h(6) < 0.09) { const px = 10 + Math.floor(g.h(7) * 12), py = 10 + Math.floor(g.h(8) * 12); circle(g, "#3f8f4a", px, py, 4.4); circle(g, "#58ad5f", px - 1, py - 1, 2.2); if (g.h(9) < 0.4) circle(g, "#f0b4c8", px + 1.5, py + 1, 1.3); } // vitória-régia
    },
    crate(g) {
      if (g.h(4) < 0.55) { // barril de madeira com aros de ferro
        shadowDisc(g, 11);
        circle(g, "#7a8590", 16, 16, 11); circle(g, "#7a5232", 16, 16, 9.3);
        dot(g, "#58391f", 11.5, 8, 1, 16); dot(g, "#58391f", 15.5, 7.5, 1, 17); dot(g, "#58391f", 19.5, 8, 1, 16);
        circle(g, "#3d2814", 16, 16, 1.8);
      } else { // boia salva-vidas
        shadowDisc(g, 12);
        circle(g, "#f4f4f2", 16, 16, 12);
        g.ctx.fillStyle = "#d9483b";
        for (let i = 0; i < 8; i += 2) { g.ctx.beginPath(); g.ctx.moveTo(g.x + 16, g.y + 16); g.ctx.arc(g.x + 16, g.y + 16, 12, i * Math.PI / 4, (i + 1) * Math.PI / 4); g.ctx.closePath(); g.ctx.fill(); }
        circle(g, "#cfd3d6", 16, 16, 6.4); circle(g, "#756859", 16, 16, 5);
      }
    },
  };

  // 16. Mercadão: ladrilho quente em xadrez, barracas de toldo (cores diferentes das da Feira) e caixotes de legumes
  const MARKET_AWNINGS = [["#7b4fb0", "#f6efe6"], ["#1c9aa6", "#f6efe6"], ["#d6307f", "#f6efe6"], ["#b5792a", "#f6efe6"]];
  const mercadao = {
    id: 16, place: "Mercadão", blurb: "o mercadão: ladrilho quente, barracas de toldo e caixotes de legumes",
    mover: { wall: ["#3d4552", "#6c7889", "#161a21"], door: ["#5b3a22", "#8b5e38", "#2a1709"] },
    rail: ["#5a3e2a", "#170e08"],
    floor(g) {
      const { x, y } = g;
      g.ctx.fillStyle = "#c9885a"; g.rect(x, y, T, T);
      g.ctx.fillStyle = "#f3e3c5"; g.rect(x, y, 16, 16); g.rect(x + 16, y + 16, 16, 16);                             // xadrez
      g.ctx.fillStyle = "rgba(110,66,40,.28)"; g.rect(x + 15, y, 2, T); g.rect(x, y + 15, T, 2);                     // rejunte
      if (g.h(1) > 0.9) { const px = 4 + Math.floor(g.h(2) * 20), py = 4 + Math.floor(g.h(3) * 20); dot(g, "#7fa44f", px, py, 6, 3); dot(g, "#5c8a3a", px + 1, py + 1, 3, 1); } // folha de repolho no chão
      else if (g.h(1) < 0.05) circle(g, "#e98a2c", 6 + Math.floor(g.h(4) * 20), 6 + Math.floor(g.h(5) * 20), 2.4);
    },
    wall(g) { // toldo de faixas largas, com moldura de madeira e festão na beirada
      const { x, y, c, r } = g;
      const aw = pick(MARKET_AWNINGS, hash(c >> 1, r >> 1, 17));
      g.ctx.fillStyle = aw[1]; g.rect(x, y, T, T);
      g.ctx.fillStyle = aw[0]; g.rect(x, y + 3, T, 10); g.rect(x, y + 19, T, 10);
      g.ctx.fillStyle = "#3a2418";
      if (!g.solid(c, r - 1)) g.rect(x, y, T, 3);
      if (!g.solid(c, r + 1)) g.rect(x, y + T - 3, T, 3);
      if (!g.solid(c - 1, r)) g.rect(x, y, 3, T);
      if (!g.solid(c + 1, r)) g.rect(x + T - 3, y, 3, T);
      if (!g.solid(c, r + 1)) for (let i = 0; i < 4; i++) { g.ctx.fillStyle = i % 2 ? aw[1] : aw[0]; g.ctx.beginPath(); g.ctx.arc(g.x + 4 + i * 8, g.y + T - 4, 4, 0, Math.PI); g.ctx.fill(); }
    },
    crate(g) { // caixote de plástico com legumes
      const body = pick(["#3b8f4a", "#3a78b8", "#e6ebef"], g.h(4)), k = g.h(5);
      shadowBox(g);
      dot(g, body, 4, 7, 24, 21); dot(g, "rgba(0,0,0,.18)", 4, 24, 24, 4);
      g.ctx.fillStyle = "rgba(0,0,0,.28)"; for (let i = 0; i < 4; i++) g.rect(g.x + 6 + i * 6, g.y + 25, 4, 1.5);
      if (k < 0.34) { for (let i = 0; i < 6; i++) { dot(g, "#f08a24", 7 + i * 3.2, 11, 2.4, 11); dot(g, "#4c9a3a", 7 + i * 3.2, 9, 2.4, 3); } } // cenouras
      else if (k < 0.67) { circle(g, "#a9d27a", 11, 15, 5.4); circle(g, "#a9d27a", 21, 15, 5.4); circle(g, "#d9efb8", 11, 15, 3); circle(g, "#d9efb8", 21, 15, 3); } // repolhos
      else { for (const [dx, dy] of [[9, 12], [15, 11], [21, 12], [11, 17.5], [18, 17], [23.5, 17.5]]) { circle(g, "#6a3a8c", dx, dy, 3.3); circle(g, "#9a6ac0", dx - 1, dy - 1, 1.1); } } // berinjelas
    },
  };

  // 17. Estacionamento: asfalto com faixas de vaga, carros vistos de cima e cones
  const CARS = ["#c8372d", "#2f6fb5", "#e6e8ec", "#32363e", "#d9a02e", "#3f9a5f", "#97a1ae", "#d9702a"];
  const estacionamento = {
    id: 17, place: "Estacionamento", blurb: "o estacionamento: asfalto, vagas, carros e cones",
    mover: { wall: ["#1d8f8f", "#52cbc4", "#0b3a3a"], door: ["#9a4fd0", "#c796ee", "#3f1a63"] },
    rail: ["#23242a", "#0c0c0f"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#6b6d73", "#6e7076");
      dot(g, "#3b3d42", 3 + Math.floor(g.h(2) * 22), 4 + Math.floor(g.h(3) * 22), 3, 1.5); dot(g, "#5d6067", 3 + Math.floor(g.h(4) * 22), 4 + Math.floor(g.h(5) * 22), 2, 1.5);
      if (g.h(1) > 0.93) dot(g, "rgba(0,0,0,.22)", 6 + Math.floor(g.h(6) * 8), 8 + Math.floor(g.h(7) * 8), 11, 7);   // mancha de óleo
      if (g.free) { // faixas brancas das vagas, saindo das fileiras de carros
        g.ctx.fillStyle = "#dcdcd8";
        if (c % 2 === 0) { if (g.solid(c, r - 1)) g.rect(x, y, 3, 14); if (g.solid(c, r + 1)) g.rect(x, y + T - 14, 3, 14); }
        if (r % 2 === 0) { if (g.solid(c - 1, r)) g.rect(x, y, 14, 3); if (g.solid(c + 1, r)) g.rect(x + T - 14, y, 14, 3); }
      }
    },
    wall(g) { // um carro visto de cima por tile (de frente para cima ou para o lado)
      const { x, y } = g;
      const v = hash(g.c >> 1, g.r >> 1, 5) < 0.5, col = pick(CARS, g.h(2));
      const R = (a, b, w, h) => (v ? g.rect(x + a, y + b, w, h) : g.rect(x + b, y + a, h, w));
      g.ctx.fillStyle = "#1f2126"; g.rect(x, y, T, T);
      g.ctx.fillStyle = "#0e0f12"; R(2, 6, 3, 7); R(27, 6, 3, 7); R(2, 20, 3, 7); R(27, 20, 3, 7);                  // rodas
      g.ctx.fillStyle = col; R(4, 2, 24, 28);
      g.ctx.fillStyle = "rgba(255,255,255,.2)"; R(7, 10, 18, 13);                                                    // teto
      g.ctx.fillStyle = "#27313f"; R(8, 8, 16, 4); R(8, 22, 16, 3);                                                  // vidros
      g.ctx.fillStyle = "#f5efc8"; R(5, 2, 5, 2); R(22, 2, 5, 2);                                                      // faróis
      g.ctx.fillStyle = "#d12c2c"; R(5, 28, 5, 2); R(22, 28, 5, 2);                                                   // lanternas
    },
    crate(g) {
      if (g.h(4) < 0.65) { // cone de trânsito com base quadrada
        dot(g, "rgba(0,0,0,.25)", 6, 9, 22, 21);
        dot(g, "#2b2d33", 5, 5, 22, 22);
        circle(g, "#ff6a1a", 16, 16, 9.5); circle(g, "#ffffff", 16, 16, 6.2); circle(g, "#ff6a1a", 16, 16, 3.6); circle(g, "#c94a0a", 16, 16, 1.2);
      } else { // barreira de obra listrada
        dot(g, "rgba(0,0,0,.25)", 4, 13, 26, 15);
        dot(g, "#2b2d33", 5, 22, 3, 5); dot(g, "#2b2d33", 24, 22, 3, 5);
        dot(g, "#f4f4f2", 3, 9, 26, 13);
        g.ctx.fillStyle = "#ff6a1a"; for (let i = 0; i < 26; i += 8) g.rect(g.x + 3 + i, g.y + 9, 4, 13);
        dot(g, "rgba(0,0,0,.2)", 3, 20, 26, 2);
      }
    },
  };

  // 18. Telhados: telhas de barro com calhas; a borda do telhado dá no ar azul-noite (parapeitos e chaminés)
  const telhados = {
    id: 18, place: "Telhados", blurb: "os telhados da cidade à noite: calhas, chaminés e antenas",
    mover: { wall: ["#b8c4d2", "#e2eaf3", "#4a5666"], door: ["#47a0cf", "#a4d6f0", "#1b4a66"] },
    rail: ["#3a2a24", "#0f0a08"],
    floor(g) {
      const { x, y, c, r } = g;
      g.ctx.fillStyle = "#9c4a3a"; g.rect(x, y, T, T);
      g.ctx.fillStyle = "#ad5642"; g.rect(x + 8, y, 8, 14); g.rect(x + 24, y, 8, 14); g.rect(x, y + 16, 8, 14); g.rect(x + 16, y + 16, 8, 14);  // capa e canal das telhas
      g.ctx.fillStyle = "#6c3226"; g.rect(x, y + 14, T, 2); g.rect(x, y + 30, T, 2);                                 // sombra de cada fileira
      if (g.h(3) > 0.9) dot(g, "#6e8a55", 2 + Math.floor(g.h(4) * 18), 3 + Math.floor(g.h(5) * 20), 8, 4);            // musgo
      if (g.free) { // calha de metal junto da borda
        if (g.solid(c, r - 1)) { dot(g, "#46556b", 0, 0, T, 3); dot(g, "#9aabc2", 0, 3, T, 3); dot(g, "#c9d6e8", 0, 3, T, 1); }
        if (g.solid(c, r + 1)) { dot(g, "#46556b", 0, T - 3, T, 3); dot(g, "#9aabc2", 0, T - 6, T, 3); dot(g, "#c9d6e8", 0, T - 6, T, 1); }
        if (g.solid(c - 1, r)) { dot(g, "#46556b", 0, 0, 3, T); dot(g, "#9aabc2", 3, 0, 3, T); dot(g, "#c9d6e8", 3, 0, 1, T); }
        if (g.solid(c + 1, r)) { dot(g, "#46556b", T - 3, 0, 3, T); dot(g, "#9aabc2", T - 6, 0, 3, T); dot(g, "#c9d6e8", T - 6, 0, 1, T); }
      }
    },
    wall(g) { // ar da noite com outros telhados ao longe, parapeito de pedra na borda e chaminés
      const { x, y, c, r } = g;
      const up = g.solid(c, r - 1), dn = g.solid(c, r + 1), lf = g.solid(c - 1, r), rt = g.solid(c + 1, r);
      g.ctx.fillStyle = "#0f1830"; g.rect(x, y, T, T);
      const px = 2 + Math.floor(g.h(3) * 10), py = 4 + Math.floor(g.h(4) * 12);
      dot(g, "#17234a", px, py, 14 + Math.floor(g.h(5) * 3), 9);                                                       // telhado vizinho, lá embaixo
      if (g.h(6) < 0.45) { dot(g, "#f4d589", px + 2, py + 2, 2, 2); if (g.h(7) < 0.5) dot(g, "#f4d589", px + 7, py + 4, 2, 2); }   // janelas acesas
      if (g.h(8) < 0.35) dot(g, "#8fb0e0", 20 + Math.floor(g.h(9) * 8), 3 + Math.floor(g.h(10) * 6), 1, 1);              // estrela
      if (up && dn && lf && rt && g.h(11) < 0.13) { // chaminé
        dot(g, "#27345a", 2, 2, 28, 28); dot(g, "rgba(0,0,0,.35)", 10, 11, 14, 14);
        dot(g, "#9a4a3a", 8, 8, 14, 14); dot(g, "#c06a55", 8, 8, 14, 3); dot(g, "#2a1a18", 11, 12, 8, 7); dot(g, "#6e6a68", 8, 21, 14, 1);
      }
      if (!up) { dot(g, "#cfc7b6", 0, 0, T, 5); dot(g, "#8b8373", 0, 5, T, 2); }                                      // parapeito
      if (!dn) { dot(g, "#cfc7b6", 0, T - 5, T, 5); dot(g, "#8b8373", 0, T - 7, T, 2); }
      if (!lf) { dot(g, "#cfc7b6", 0, 0, 5, T); dot(g, "#8b8373", 5, 0, 2, T); }
      if (!rt) { dot(g, "#cfc7b6", T - 5, 0, 5, T); dot(g, "#8b8373", T - 7, 0, 2, T); }
    },
    crate(g) {
      if (g.h(4) < 0.5) { // antena parabólica baixa
        shadowDisc(g, 11);
        circle(g, "#aab2bd", 16, 16, 11); circle(g, "#d9dde3", 16, 16, 9.6); circle(g, "#e8ecf0", 14.5, 14.5, 5.5); circle(g, "#aab2bd", 16, 16, 2.4);
        dot(g, "#6b7380", 16, 6.5, 1.6, 9); circle(g, "#3a414c", 17, 6.5, 2.2);
      } else { // exaustor do telhado
        shadowDisc(g, 11);
        circle(g, "#5a6472", 16, 16, 11); circle(g, "#7b8696", 16, 16, 9.4); circle(g, "#9aa5b3", 16, 16, 6.8);
        dot(g, "#4d5662", 8, 15, 16, 2); dot(g, "#4d5662", 15, 8, 2, 16); circle(g, "#4d5662", 16, 16, 2);
      }
    },
  };

  // 19. Estação de trem: plataforma de pedra com faixa de segurança, vagões azuis e cinza com janelas, malas
  const TRAINS = [["#46688f", "#6a92bd", "#263c58", "#c7463a"], ["#7a8591", "#a3afbc", "#4a5461", "#2e5f9a"]];
  const estacao = {
    id: 19, place: "Estação de trem", blurb: "a estação de trem: plataforma, vagões e malas",
    mover: { wall: ["#b83a2e", "#e2685a", "#5a1812"], door: ["#3a7a55", "#6bbb8a", "#17382a"] },
    rail: ["#4a4234", "#14110b"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#b3aa9b", "#b8afa0");
      g.ctx.fillStyle = "#8e8677"; g.rect(x, y + 15, T, 1); g.rect(x, y + 31, T, 1); g.rect(x + 7, y, 1, 15); g.rect(x + 23, y + 16, 1, 15);
      if (g.h(3) > 0.93) dot(g, "rgba(60,50,40,.14)", 4 + Math.floor(g.h(4) * 14), 5 + Math.floor(g.h(5) * 14), 9, 5);
      if (g.free) { // faixa fina de segurança junto da borda (ocre fechado, de propósito diferente do amarelo do aviso do trilho)
        if (g.solid(c, r - 1)) { dot(g, "#a68b52", 0, 2, T, 3); dot(g, "#6e5a33", 0, 5, T, 1); }
        if (g.solid(c, r + 1)) { dot(g, "#a68b52", 0, T - 5, T, 3); dot(g, "#6e5a33", 0, T - 6, T, 1); }
        if (g.solid(c - 1, r)) { dot(g, "#a68b52", 2, 0, 3, T); dot(g, "#6e5a33", 5, 0, 1, T); }
        if (g.solid(c + 1, r)) { dot(g, "#a68b52", T - 5, 0, 3, T); dot(g, "#6e5a33", T - 6, 0, 1, T); }
      }
    },
    wall(g) { // vagão de trem
      const { x, y, c, r } = g;
      const t = pick(TRAINS, hash(c >> 2, r >> 1, 11)), inner = g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1);
      block(g, t[0], t[1], t[2], t[2]);
      if (inner) { // teto do vagão
        dot(g, t[1], 3, 3, 26, 26); dot(g, t[2], 15, 3, 2, 26);
        dot(g, t[2], 6, 7 + 10 * (c % 2), 6, 6); dot(g, t[2], 20, 9 + 10 * (r % 2), 6, 6);
      } else {
        dot(g, t[3], 0, 19, T, 3);                                                                                  // faixa de pintura do vagão
        if (c % 4 === 1) { dot(g, t[2], 6, 5, 20, 21); dot(g, "#b9d6e8", 10, 8, 12, 9); dot(g, "#e4f1f8", 10, 8, 12, 2); dot(g, t[3], 15, 17, 2, 8); } // porta
        else { dot(g, "#1d2a3c", 4, 6, 11, 10); dot(g, "#b9d6e8", 5, 7, 9, 8); dot(g, "#e4f1f8", 5, 7, 9, 2); dot(g, "#1d2a3c", 17, 6, 11, 10); dot(g, "#b9d6e8", 18, 7, 9, 8); dot(g, "#e4f1f8", 18, 7, 9, 2); } // janelas
        if (c % 4 === 0) dot(g, "#161c27", 0, 0, 2, T);                                                              // emenda entre vagões
        if (!g.solid(c, r + 1)) { dot(g, "#2b323d", 0, T - 8, T, 4); circle(g, "#0e1014", 9, T - 4, 3.5); circle(g, "#0e1014", 23, T - 4, 3.5); } // rodas
      }
    },
    crate(g) {
      const body = pick(["#8a5a33", "#b23a35", "#2f5f9a", "#3a7a55", "#2c2f36"], g.h(5));
      shadowBox(g);
      if (g.h(4) < 0.6) { // mala
        dot(g, body, 6, 7, 20, 21); dot(g, "rgba(255,255,255,.14)", 6, 7, 20, 3); dot(g, "rgba(0,0,0,.28)", 15.5, 10, 1, 18);
        dot(g, "#1b1b1f", 12, 4, 8, 3); dot(g, "#e0d0a0", 9, 11, 3, 2); dot(g, "#e0d0a0", 20, 11, 3, 2);
        dot(g, "rgba(0,0,0,.3)", 6, 25, 3, 3); dot(g, "rgba(0,0,0,.3)", 23, 25, 3, 3);
        if (g.h(6) < 0.6) dot(g, pick(["#f2b632", "#58b85a", "#f08ac0"], g.h(7)), 18, 18, 5, 4);
      } else { // duas mochilas lado a lado
        const b2 = pick(["#d9483b", "#3b82d6", "#58b85a", "#f2a03a"], g.h(8));
        dot(g, body, 4, 9, 11, 19); dot(g, "#1b1b1f", 7, 6, 5, 3); dot(g, "rgba(0,0,0,.25)", 4, 18, 11, 2);
        dot(g, b2, 17, 8, 11, 20); dot(g, "#1b1b1f", 20, 5, 5, 3); dot(g, "rgba(0,0,0,.25)", 17, 18, 11, 2);
      }
    },
  };

  // 20. Fortaleza da carrocinha: aço escuro, rebites, luzes vermelhas, muralhas e torres; jaulas pesadas e barris de metal
  const fortaleza = {
    id: 20, place: "Fortaleza da carrocinha", blurb: "a fortaleza da carrocinha: muralhas de aço, luzes vermelhas e jaulas pesadas",
    mover: { wall: ["#aab4c4", "#dbe2ee", "#3b4352"], door: ["#c0392f", "#ee6e5f", "#4a0f0b"] },
    rail: ["#7a4a34", "#0e0705"],
    floor(g) {
      const { x, y, c, r } = g;
      checker(g, "#1b1b20", "#1e1e24");
      g.ctx.fillStyle = "#2d2d35"; g.rect(x, y + 15, T, 1); g.rect(x + 15, y, 1, T);                                 // emendas das placas
      g.ctx.fillStyle = "#3d3f49"; g.rect(x + 3, y + 3, 2, 2); g.rect(x + 27, y + 3, 2, 2); g.rect(x + 3, y + 27, 2, 2); g.rect(x + 27, y + 27, 2, 2); // rebites
      if (g.h(3) > 0.94) { dot(g, "rgba(196,48,42,.22)", 11, 11, 10, 10); dot(g, "#c4302a", 14, 14, 4, 4); }       // luz vermelha no chão
      if (g.free) { // faixa de alerta vermelha e preta junto das paredes
        const stripe = (sx, sy, sw, sh) => { g.ctx.fillStyle = "#a02a26"; g.rect(sx, sy, sw, sh); g.ctx.fillStyle = "#0f0f12"; for (let i = 0; i < 32; i += 8) g.rect(sx + (sw > sh ? i : 0), sy + (sw > sh ? 0 : i), sw > sh ? 4 : sw, sw > sh ? sh : 4); };
        if (g.solid(c, r - 1) && g.h(1) < 0.5) stripe(x, y, T, 3);
        if (g.solid(c, r + 1) && g.h(2) < 0.5) stripe(x, y + T - 3, T, 3);
      }
    },
    wall(g) { // muralha de aço com ameias, rebites e luzes
      const { x, y, c, r } = g;
      block(g, "#3b3f49", "#656b79", "#15161b", "#1e1f25");
      g.ctx.fillStyle = "#292c34"; g.rect(x, y + 11, T, 1); g.rect(x, y + 22, T, 1);                                  // emendas das chapas
      g.ctx.fillStyle = "#7a8090"; g.rect(x + 5, y + 6, 2, 2); g.rect(x + 25, y + 6, 2, 2); g.rect(x + 5, y + 26, 2, 2); g.rect(x + 25, y + 26, 2, 2); // rebites
      if (!g.solid(c, r - 1)) { g.ctx.fillStyle = "#0b0b0e"; g.rect(x, y, T, 7); g.ctx.fillStyle = "#6b707e"; for (let i = 0; i < T; i += 16) g.rect(x + i, y, 8, 7); g.ctx.fillStyle = "#9096a5"; for (let i = 0; i < T; i += 16) g.rect(x + i, y, 8, 2); } // ameias
      if (!g.solid(c, r + 1) || !g.solid(c - 1, r) || !g.solid(c + 1, r)) { // pontas de aço para fora do muro, junto das bordas de baixo e dos lados (sempre dentro do próprio tile)
        g.ctx.fillStyle = "#8d94a4"; g.ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          if (!g.solid(c, r + 1)) { g.ctx.moveTo(x + i * 8 + 0.5, y + T - 11); g.ctx.lineTo(x + i * 8 + 4, y + T - 1); g.ctx.lineTo(x + i * 8 + 7.5, y + T - 11); g.ctx.closePath(); }
          if (!g.solid(c - 1, r)) { g.ctx.moveTo(x + 11, y + i * 8 + 0.5); g.ctx.lineTo(x + 1, y + i * 8 + 4); g.ctx.lineTo(x + 11, y + i * 8 + 7.5); g.ctx.closePath(); }
          if (!g.solid(c + 1, r)) { g.ctx.moveTo(x + T - 11, y + i * 8 + 0.5); g.ctx.lineTo(x + T - 1, y + i * 8 + 4); g.ctx.lineTo(x + T - 11, y + i * 8 + 7.5); g.ctx.closePath(); }
        }
        g.ctx.fill();
      }
      if (g.h(5) < 0.1 && g.solid(c - 1, r) && g.solid(c + 1, r) && g.solid(c, r - 1) && g.solid(c, r + 1)) { // torre com luz vermelha
        dot(g, "#14151a", 8, 8, 16, 16); dot(g, "#7d1c19", 10, 10, 12, 12); dot(g, "#ff4b3e", 13, 13, 6, 6);
      }
      else if (g.h(6) < 0.12) { dot(g, "#0b0b0e", 14, 12, 4, 10); dot(g, "#b3261e", 15, 13, 2, 8); }                    // seteira iluminada
    },
    crate(g) {
      if (g.h(4) < 0.55) { // jaula pesada de grades grossas
        shadowBox(g);
        dot(g, "#0e0f12", 3, 6, 26, 23); dot(g, "#1d1f24", 6, 9, 20, 17);
        g.ctx.fillStyle = "#6b707d"; for (const bx of [8, 13, 18, 23]) g.rect(g.x + bx, g.y + 9, 2, 17);
        dot(g, "#4a4e5a", 6, 14, 20, 2); dot(g, "#4a4e5a", 6, 21, 20, 2);
        dot(g, "#c43a2f", 14, 25, 4, 4); dot(g, "#3d3f49", 4, 7, 2, 2); dot(g, "#3d3f49", 26, 7, 2, 2);
      } else { // barril de metal com faixa vermelha
        shadowDisc(g, 11);
        circle(g, "#2b2e35", 16, 16, 11); circle(g, "#4a4f5b", 16, 16, 9.5); circle(g, "#3a3e48", 16, 16, 8);
        circle(g, "#a02a22", 16, 16, 6.2); circle(g, "#3a3e48", 16, 16, 4.6); circle(g, "#1c1e23", 16, 16, 1.6);
      }
    },
  };

  const BY_ID = { 1: quintal, 2: campo, 3: casa, 4: rua, 5: condominio, 6: praca, 7: parque, 8: feira, 9: praia, 10: central, 11: beco, 12: petshop, 13: fazenda, 14: bosque, 15: lago, 16: mercadao, 17: estacionamento, 18: telhados, 19: estacao, 20: fortaleza };
  // (0.18.0) Ambientes por bichinho: `of(id, animal)`. O Cachorrinho tem os 20 de cima; um bichinho SEM ambientes próprios usa os do Cachorrinho, e sem o 2º argumento
  // (ou com "dog") a resposta é exatamente a de sempre. Para dar ambientes próprios a outro bichinho, registre aqui `BY_ANIMAL.bird = { 1: ..., 2: ... }` (os que faltarem usam o do Cachorrinho daquela fase). O Gatinho não passa por aqui: os 20 ambientes dele vêm de CatThemes (abaixo).
  const BY_ANIMAL = { dog: BY_ID };
  // Fases sem ambiente próprio (de 21 em diante, se um dia existirem) usam o da Rua do bairro.
  // (0.18.0) O Gatinho tem os 20 ambientes dele em js/cat-themes*.js (window.CatThemes, carregado antes do js/game.js): `of(id, "cat")` devolve o de CatThemes; se o arquivo faltar (ou não tiver a fase), cai no do Cachorrinho.
  const catTheme = (id) => { const CT = typeof CatThemes !== "undefined" ? CatThemes : null; return CT && Number.isInteger(id) && id >= 1 && id <= 20 ? CT.of(id) : null; };
  // (0.20.0) O Passarinho tem os 20 ambientes dele em js/bird-themes*.js (window.BirdThemes, carregado antes do js/game.js): `of(id, "bird")` devolve o de BirdThemes; sem o arquivo (ou no Node, sem BirdThemes) cai no do Cachorrinho.
  const birdTheme = (id) => { const BT = typeof BirdThemes !== "undefined" ? BirdThemes : null; return BT && Number.isInteger(id) && id >= 1 && id <= 20 ? BT.of(id) : null; };
  const of = (id, animal) => {
    if (animal === "cat") { const ct = catTheme(id); if (ct) return ct; }
    else if (animal === "bird") { const bt = birdTheme(id); if (bt) return bt; }
    const own = animal !== undefined && animal !== "dog" && Object.prototype.hasOwnProperty.call(BY_ANIMAL, animal) ? BY_ANIMAL[animal] : null;
    return (own && own[id]) || BY_ID[id] || rua;
  };
  return { of, ids: Object.keys(BY_ID).map(Number), hash, TILE: T, animals: Object.keys(BY_ANIMAL) };
});
