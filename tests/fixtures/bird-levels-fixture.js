// FIXTURE DE TESTE (0.20.0, motor do Passarinho): 5 fases pequenas e válidas no formato de js/bird-levels.js (window.BirdLevels), só para os testes do motor (tests/e2e-bird-motor.js).
// NÃO é o jogo: as 20 fases de verdade são de js/bird-levels.js (gerado). O teste injeta esta lista como `window.BirdLevels` (newPage({ realBird: true })) e ela vale mesmo que o arquivo de verdade exista.
// Cada fase tem os símbolos do contrato: # parede, M muro voável, . chão, P início, V posto de gato de quintal, H posto de gavião, E saída (3 tiles na borda), X obstáculo baixo, G galho, > < ^ v vento.
//   1: 16×10, só X e 1 gato (regras da Fase 1 do Cachorrinho)         2: 20×11, muros M, galho G, 2 gatos, 2 frutos (voo alto e escudo), 1 minhoca
//   3: 22×12, vento nas 4 direções, X, G, 2 gatos, 2 frutos de voo alto   4: 24×14, gaviões H + gatos V + tudo (like 4: mínimo de 800 pontos)
//   5: 30×16, como as Fases 11 a 20 (like 11: missão "todos os frutos", gato inimigo da Fase 11), 2 gatos, 2 gaviões, 4 frutos de tipos diferentes
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.__BIRD_FIXTURE_LEVELS = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function grid(cols, rows, put) { // borda de parede, chão por dentro; `put` desenha o resto (g[linha][coluna])
    const g = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (r === 0 || c === 0 || r === rows - 1 || c === cols - 1 ? "#" : ".")));
    put(g);
    return g.map((r) => r.join(""));
  }
  const at = (g, pts, ch) => { for (const [c, r] of pts) g[r][c] = ch; };
  const hline = (g, r, c0, c1, ch) => { for (let c = c0; c <= c1; c++) g[r][c] = ch; };
  const vline = (g, c, r0, r1, ch) => { for (let r = r0; r <= r1; r++) g[r][c] = ch; };
  const exitAt = (g, rows) => { const c = g[0].length - 1; for (const r of rows) g[r][c] = "E"; };

  const m1 = grid(16, 10, (g) => { at(g, [[1, 1]], "P"); at(g, [[11, 5]], "V"); at(g, [[5, 3], [6, 3], [5, 7], [6, 7]], "X"); exitAt(g, [4, 5, 6]); });
  const m2 = grid(20, 11, (g) => {
    at(g, [[1, 1]], "P"); at(g, [[9, 4], [14, 8]], "V"); at(g, [[3, 8]], "G"); at(g, [[10, 8], [11, 8]], "X");
    vline(g, 6, 1, 6, "M"); vline(g, 13, 4, 9, "M"); // dois muros, cada um com uma passagem de chão (embaixo do primeiro e em cima do segundo)
    exitAt(g, [4, 5, 6]);
  });
  const m3 = grid(22, 12, (g) => {
    at(g, [[1, 1]], "P"); at(g, [[10, 3], [16, 8]], "V");
    hline(g, 5, 3, 8, ">"); hline(g, 7, 3, 8, "<"); vline(g, 12, 2, 4, "^"); vline(g, 14, 6, 10, "v");
    at(g, [[11, 8], [11, 9]], "X"); at(g, [[18, 3], [4, 9]], "G");
    exitAt(g, [5, 6, 7]);
  });
  const m4 = grid(24, 14, (g) => {
    at(g, [[1, 1]], "P"); at(g, [[10, 5]], "V"); at(g, [[16, 3], [16, 10]], "H");
    vline(g, 8, 1, 9, "M"); vline(g, 15, 4, 12, "M"); hline(g, 7, 17, 21, "M");
    hline(g, 3, 3, 6, ">"); hline(g, 10, 17, 21, "<"); at(g, [[11, 8], [12, 8], [3, 11]], "X"); at(g, [[5, 6], [20, 5]], "G");
    exitAt(g, [5, 6, 7]);
  });
  const m5 = grid(30, 16, (g) => {
    at(g, [[1, 1]], "P"); at(g, [[8, 7], [22, 9]], "V"); at(g, [[14, 3], [24, 12]], "H");
    vline(g, 10, 1, 11, "M"); vline(g, 18, 4, 14, "M"); hline(g, 8, 20, 27, "M");
    hline(g, 3, 3, 8, ">"); vline(g, 13, 6, 12, "v"); hline(g, 13, 20, 26, "<");
    at(g, [[6, 9], [7, 9], [14, 14], [24, 5]], "X"); at(g, [[4, 12], [12, 2], [25, 3], [21, 14]], "G");
    exitAt(g, [7, 8, 9]);
  });
  const L = [
    { id: 1, title: "Fase 1", place: "Jardim de teste", note: "andar, pegar sementes e fugir do gato", like: 1, size: [16, 10], cats: 1, hawks: 0, seeds: 4, fruits: 0, fruitMix: [], worms: 0, extraLives: [1, 1], birdSpeed: 0.8, special: { G: 0, wind: 0, M: false }, seed: 1, map: m1 },
    { id: 2, title: "Fase 2", place: "Pomar de teste", note: "fruto (voo alto) e bater asas", like: 2, size: [20, 11], cats: 2, hawks: 0, seeds: 7, fruits: 2, fruitMix: ["scare", "gold"], worms: 1, extraLives: [1, 2], birdSpeed: 1, special: { G: 1, wind: 0, M: true }, seed: 2, map: m2 },
    { id: 3, title: "Fase 3", place: "Horta de teste", note: "X, galho e vento", like: 3, size: [22, 12], cats: 2, hawks: 0, seeds: 7, fruits: 2, fruitMix: ["scare", "scare"], worms: 1, extraLives: [1, 2], birdSpeed: 0.9, special: { G: 2, wind: 4, M: false }, seed: 3, map: m3 },
    { id: 4, title: "Fase 4", place: "Telhados de teste", note: "gaviões e tudo junto", like: 4, size: [24, 14], cats: 1, hawks: 2, seeds: 10, fruits: 3, fruitMix: ["scare", "ice", "turbo"], worms: 2, extraLives: [3, 3], birdSpeed: 0.945, special: { G: 2, wind: 2, M: true }, seed: 4, map: m4 },
    { id: 5, title: "Fase 5", place: "Fazenda de teste", note: "como as Fases 11 a 20", like: 11, size: [30, 16], cats: 2, hawks: 2, seeds: 20, fruits: 4, fruitMix: ["scare", "gold", "ice", "magnet"], worms: 2, extraLives: [3, 4], birdSpeed: 1, special: { G: 4, wind: 3, M: true }, seed: 5, map: m5 },
  ];
  return L;
});
