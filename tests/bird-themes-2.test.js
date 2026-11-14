// Testes unitários dos ambientes das Fases 11 a 20 do Passarinho (js/bird-themes-2.js), sem navegador. Uso: node tests/bird-themes-2.test.js
// Mesma bateria de tests/bird-themes-1.test.js (contexto 2D falso e rigoroso, rasterizador mínimo; veja tests/bird-themes-harness.js), mais: as 20 fases juntas têm chãos, paredes e paletas diferentes entre si,
// as fases noturnas (18 e 19) são claras e saturadas, e as bordas especiais (mar, rio, água parada, céu, floresta, tronco) são o que dizem ser.
const path = require("path");
const BT = require(path.join(__dirname, "../js/bird-themes.js"));
require(path.join(__dirname, "../js/bird-themes-1.js"));
require(path.join(__dirname, "../js/bird-themes-2.js"));
const H = require("./bird-themes-harness.js")(BT);
const PLACES = ["Fazenda e galinheiro", "Margem do rio", "Pântano e vitórias-régias", "Dunas e restinga", "Falésias e ninhos", "Vila de pescadores e redes", "Campos de altitude", "Entardecer nos telhados", "Noite na floresta", "O grande ninho"];
const ALL = Array.from({ length: 20 }, (_, i) => i + 1);
H.run({
  ids: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], places: PLACES, label: "11 a 20", all: ALL,
  extra({ test, paint, theme, floorAvg, wallAvg, luma, hexRgb, open, SAMPLES }) {
    const assert = H.assert;
    test("as 20 fases estão registradas (1 a 10 e 11 a 20), sem buracos, com os 20 lugares diferentes", () => {
      assert.deepStrictEqual(BT.ids(), ALL);
      assert.strictEqual(new Set(ALL.map((id) => theme(id).place)).size, 20);
      assert.strictEqual(BT.of(99).id, 1, "fase sem ambiente próprio usa o da Fase 1");
    });
    test("as fases noturnas (18 e 19) são claras e saturadas: o chão tem brilho médio >= 105 (o jogo escurece em volta do passarinho), a Fase 18 é a única do entardecer, e as janelas e lanternas acesas aparecem", () => {
      for (const id of [18, 19]) {
        const a = floorAvg(id).aberto; assert.ok(luma(a) >= 105, `fase ${id}: chão escuro demais (${luma(a).toFixed(0)})`);
        assert.ok(theme(id).night, "night"); 
      }
      assert.ok(theme(18).dusk && !theme(19).dusk);
      // janelas acesas na parede da 18 (amarelo claro) e lanterna acesa no galho da 18 e da 19
      const lit = (id, what, kind) => { let n = 0; for (let i = 0; i < 60; i++) { const r = paint(id, what, { c: i * 3 + 1, r: i * 5 + 2, kind, raster: true }).raster; for (let p = 0; p < 1024; p++) if (r.cov[p] > 0.9 && r.rgb[p * 3] > 235 && r.rgb[p * 3 + 1] > 200 && r.rgb[p * 3 + 2] < 190) n++; } return n; };
      assert.ok(lit(18, "wall", () => "#") > 200, "a Fase 18 deveria ter janelas acesas nas paredes");
      assert.ok(lit(18, "high", open) > 20 && lit(19, "high", open) > 20, "lanterna acesa no galho");
      for (const id of [18, 19]) for (const k of ["floor", "wall", "muro", "crate", "high"]) { const r = paint(id, k, { c: 12, r: 12, kind: open, raster: true }).raster.average(); assert.ok(luma(r) >= 60, `fase ${id} ${k} escuro demais para a noite (${luma(r).toFixed(0)})`); }
    });
    test("as bordas especiais: rio, mar, água parada, céu, floresta e tronco são o que dizem ser (cor média da parede da borda)", () => {
      const b = (id) => paint(id, "wall", { c: 0, r: 4, border: true, kind: (c) => (c <= 0 ? "#" : "."), raster: true }).raster.average();
      for (const id of [9, 12, 14, 15, 16]) { const a = b(id); assert.ok(a[2] > a[0] + 50 && a[2] > 150, `a borda da fase ${id} deveria ser água azul: ${a.map(Math.round)}`); }
      const sw = b(13); assert.ok(sw[1] > sw[0] && sw[2] > sw[0] && luma(sw) < 110, `pântano: ${sw.map(Math.round)}`);
      const sky = b(18); assert.ok(sky[0] > 200 && sky[0] > sky[2] + 40, `céu do entardecer: ${sky.map(Math.round)}`);
      const forest = b(19); assert.ok(forest[2] > forest[0] && luma(forest) < 70, `floresta à noite: ${forest.map(Math.round)}`);
      const trunk = b(20); assert.ok(trunk[0] > trunk[2] + 30 && luma(trunk) < 110, `tronco: ${trunk.map(Math.round)}`);
      const mt = b(17); assert.ok(mt[2] > mt[0] && luma(mt) > 150, `montanhas: ${mt.map(Math.round)}`);
      // a água em volta do mapa se mexe com o tempo; a parede de dentro não
      for (const id of [9, 12, 13, 14, 15, 16]) assert.notStrictEqual(paint(id, "wall", { c: 0, r: 4, border: true, time: 0 }).ops.join("|"), paint(id, "wall", { c: 0, r: 4, border: true, time: 1.4 }).ops.join("|"), `a água da borda da fase ${id} deveria se mexer`);
    });
  },
});
