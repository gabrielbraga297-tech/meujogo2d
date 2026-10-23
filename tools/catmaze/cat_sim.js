#!/usr/bin/env node
"use strict";
// Simulador simples dos mapas do Gatinho (BFS): para cada fase imprime, nos DOIS grafos, a distância de P até E e de P até cada posto V/R.
//  - grafo dos CÃES: andam por . ~ P V R E (não por # nem por X e T);  - grafo do GATINHO: anda também por X (pula) e T (sobe).
// Uso: node tools/catmaze/cat_sim.js
const path = require("path");
const A = require("./cat_analysis.js");
const LEVELS = require(path.join(__dirname, "../../js/cat-levels.js"));

const pad = (s, n) => String(s).padStart(n);
const rng = (a) => (a.length ? `${Math.min(...a)}-${Math.max(...a)}` : "—");
const lines = [];
lines.push("Fase | tamanho | cães rastr. | P→E cão | P→E gato | atalho gato | P→postos (cão) | P→postos (gato) | rotas sem tile em comum | chão livre | itens/chão");
for (const lv of LEVELS) {
  const a = A.analyze(lv.map), { W, H } = A.size(lv.map);
  const items = lv.rations + lv.bones + lv.balls;
  lines.push([
    pad(lv.id, 4), pad(`${W}x${H}`, 7), pad(`${lv.dogs}   ${lv.trackers}`, 11), pad(a.peDog, 7), pad(a.peCat, 8), pad(a.peDog - a.peCat, 11),
    pad(rng(a.postDog), 14), pad(rng(a.postCat), 15), pad(a.disjoint, 23), pad(`${Math.round(100 * a.free / (W * H))}%`, 10), pad(`${(100 * items / a.dots).toFixed(1)}%`, 10),
  ].join(" | "));
}
console.log(lines.join("\n"));
