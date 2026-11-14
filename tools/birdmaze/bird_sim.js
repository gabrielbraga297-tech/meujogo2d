#!/usr/bin/env node
"use strict";
// Simulador simples dos mapas do Passarinho (BFS): para cada fase imprime as distâncias de P até E e até os postos nos três grafos e a economia dos atalhos pelos muros M.
//  - grafo dos GATOS: andam por . P V H E e vento (não por # M X G);  - grafo do GAVIÃO: também por X;  - passarinho em VOO BAIXO: também X e G;  - VOO ALTO: também M (nunca #).
// Uso: node tools/birdmaze/bird_sim.js
const path = require("path");
const A = require("./bird_analysis.js");
const LEVELS = require(path.join(__dirname, "../../js/bird-levels.js"));

const pad = (s, n) => String(s).padStart(n);
const rng = (a) => (a.length ? `${Math.min(...a)}-${Math.max(...a)}` : "—");
const lines = [];
lines.push("Fase | tamanho | gatos gav. | P→E gato | P→E voo baixo | P→E voo alto | econ. P→E | econ. média | pares ≥4 | travessias úteis | P→postos (gato) | caminhos sem tile em comum | M | #  | itens/tiles");
for (const lv of LEVELS) {
  const a = A.analyze(lv.map), s = A.shortcutSaving(lv.map), c = A.crossings(lv.map), { W, H } = A.size(lv.map), cand = A.engineCandidates(lv.map);
  const items = lv.seeds + lv.fruits + lv.worms;
  lines.push([
    pad(lv.id, 4), pad(`${W}x${H}`, 7), pad(`${lv.cats}   ${lv.hawks}`, 10), pad(a.peCat, 8), pad(a.peLow, 13), pad(a.peHigh, 12), pad(s.peSave, 9), pad(s.avg.toFixed(2), 11),
    pad((100 * s.frac4).toFixed(1) + "%", 8), pad(c.useful, 16), pad(rng(a.postCat), 15), pad(a.disjointCat, 26), pad(a.nM, 3), pad(a.nHash, 3), pad(`${(100 * items / cand.length).toFixed(1)}%`, 11),
  ].join(" | "));
}
console.log(lines.join("\n"));
