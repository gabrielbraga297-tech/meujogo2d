// Conferências que varrem os 61 temas registrados (menu e as 20 fases de cada bichinho), sem navegador. Uso: node tests/music-themes.test.js
// Os testes de cada bichinho (music-dog/cat/bird.test.js) conferem a estrutura e a distinção das receitas; aqui ficam as medidas que atravessam todos os temas.
const assert = require("assert");
const rig = require("./music-rig.js");
const { Music } = rig;
require("../js/music-dog.js"); require("../js/music-cat.js"); require("../js/music-bird.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 5).join("\n     ") : e)); }
}
const IDS = Music.ids();

test("há os 61 temas: menu e 20 fases de cada bichinho", () => {
  assert.strictEqual(IDS.length, 61);
  assert.ok(IDS.includes("menu"));
  for (const a of ["dog", "cat", "bird"]) for (let i = 1; i <= 20; i++) assert.ok(IDS.includes(a + i), a + i);
});

// Baixo no celular. Um alto-falante de celular reproduz pouco abaixo de 150 Hz (valor de ordem de grandeza, não medido aqui) e as notas do baixo vão de 49 a 92 Hz de fundamental na nota mais
// grave de cada tema. A conferência mede, no grafo agendado de cada nota (tests/music-rig.js, `scoreSpectrum`), que fração da energia estimada do baixo cai acima de 150 Hz, somando os
// parciais de cada oscilador com a amplitude deles. É uma estimativa, não uma medida de áudio, e não prova que o baixo "soa bem": só impede que o baixo volte a ser quase só fundamental.
// Os números vêm do resultado medido: antes dos harmônicos o pior tema tinha 0,5% (9 temas abaixo de 4%) e a mediana era 13,6%; depois, o pior tem 4,7% e a mediana é 20,3%.
// Por isso o piso é 4% por tema (9 dos temas antigos não passam) e a mediana precisa de 18% (a antiga não passa). Os harmônicos são moderados de propósito (35% e 15% do fundamental): com 50% e 25%
// a fração subia (piso 9,6%, mediana 29,2%), mas o pico do tema do menu passou de 0,82 para 1,03 no render real (soma em fase no começo das notas), então o piso não é maior.
const BASS_MIN_FRACTION = 0.04, BASS_MEDIAN_FRACTION = 0.18;
test(`baixo: a fração da energia acima de 150 Hz é de pelo menos ${BASS_MIN_FRACTION * 100}% em cada um dos 61 temas e a mediana passa de ${BASS_MEDIAN_FRACTION * 100}%`, () => {
  const frac = {};
  for (const id of IDS) {
    const sc = Music.scoreOf(id);
    assert.ok(sc.events.some((e) => e.voice === "bass"), id + ": sem baixo");
    frac[id] = rig.energyAbove(rig.scoreSpectrum(sc, ["bass"]), 150);
  }
  const bad = IDS.filter((id) => frac[id] < BASS_MIN_FRACTION).map((id) => `${id} ${(frac[id] * 100).toFixed(1)}%`);
  assert.deepStrictEqual(bad, [], "temas com o baixo quase só no grave: " + bad.join(", "));
  const sorted = IDS.map((id) => frac[id]).sort((a, b) => a - b), median = sorted[sorted.length >> 1];
  assert.ok(median >= BASS_MEDIAN_FRACTION, `mediana ${(median * 100).toFixed(1)}%`);
});

// Nunca 3 notas iguais seguidas na melodia, nos 61 temas, contando o que se ouve: a altura (MIDI), não o grau (no revezamento de instrumentos a oitava muda e o grau, não). Três maneiras de olhar:
// a melodia toda em ordem de tempo ("total"), cada trecho seguido de um mesmo instrumento ("por instrumento"; o revezamento passa a frase de um instrumento a outro) e a emenda do laço
// (as duas últimas notas com a primeira e a última com as duas primeiras). Antes do conserto dog14 (final do laço: última nota longa + primeira da escala curta) e bird7 (troca do revezamento) falhavam.
test("melodia: nunca 3 notas iguais (MIDI) seguidas — no total, em cada trecho de um instrumento e na emenda do laço — em nenhum dos 61 temas", () => {
  const bad = [];
  for (const id of IDS) {
    const lead = Music.scoreOf(id).events.filter((e) => e.voice === "lead"), n = lead.length;
    for (let i = 2; i < n + 2; i++) { // total, com a emenda
      const a = lead[(i - 2) % n], b = lead[(i - 1) % n], c = lead[i % n];
      if (a.midi === b.midi && b.midi === c.midi) bad.push(`${id}: total, MIDI ${a.midi} a partir de t=${a.t}${i >= n ? " (emenda do laço)" : ""}`);
    }
    let run = [];
    const flush = () => { for (let i = 2; i < run.length; i++) if (run[i].midi === run[i - 1].midi && run[i - 1].midi === run[i - 2].midi) bad.push(`${id}: ${run[i].inst}, MIDI ${run[i].midi} a partir de t=${run[i - 2].t}`); run = []; };
    for (const e of lead) { if (run.length && run[run.length - 1].inst !== e.inst) flush(); run.push(e); }
    flush();
  }
  assert.deepStrictEqual(bad, []);
});
console.log(failed ? `\n${failed} falha(s)` : "\nTodas as conferências dos 61 temas passaram");
process.exit(failed ? 1 : 0);
