// Ambientes das fases (0.14.0): cada fase é um lugar que o cachorrinho conhece. Cada ambiente diz como desenhar o chão, as paredes (ou prédios, cercas, cercas vivas...)
// e as "caixas" (X) do mapa, tudo com formas simples e cores fixas; nada aqui mexe nas regras do jogo.
//
// Uso (js/game.js): const th = Themes.of(idDaFase); a cada tile visível: th.floor(g), th.wall(g) ou th.crate(g), onde `g` traz
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

  const BY_ID = { 1: quintal, 2: campo, 3: casa, 4: rua, 5: condominio, 6: praca, 7: parque, 8: feira, 9: praia, 10: central };
  // Fases sem ambiente próprio (as que virão depois) usam o da Rua do bairro.
  return { of: (id) => BY_ID[id] || rua, ids: Object.keys(BY_ID).map(Number), hash, TILE: T };
});
