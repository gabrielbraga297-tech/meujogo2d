// Testes unitários dos ambientes das Fases 1 a 10 do Passarinho (js/bird-themes-1.js), sem navegador. Uso: node tests/bird-themes-1.test.js
// O `g` e o contexto 2D são FALSOS e rigorosos (veja tests/bird-themes-harness.js): o desenho só pode ler/escrever g.ctx, g.rect, g.x, g.y, g.c, g.r, g.h, g.solid, g.kind, g.border, g.time e g.mass,
// só pode chamar os métodos simples do canvas, tem de definir a cor antes de pintar e não pode usar Math.random nem Date.now. Um rasterizador mínimo mede cores médias e cobertura.
const path = require("path");
const BT = require(path.join(__dirname, "../js/bird-themes.js"));
require(path.join(__dirname, "../js/bird-themes-1.js"));
const H = require("./bird-themes-harness.js")(BT);
const PLACES = ["Jardim florido", "Pomar de macieiras", "Horta e cerca", "Telhados e chaminés", "Praça da vila", "Parque e coreto", "Milharal", "Campo de trigo e espantalhos", "Lago e juncos", "Mata de pinheiros"];
H.run({ ids: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], places: PLACES, label: "1 a 10", all: null });
