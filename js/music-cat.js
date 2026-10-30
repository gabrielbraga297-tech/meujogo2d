// Músicas tema do GATINHO: 20 receitas (cat1 a cat20), uma por fase, cada uma com o clima do lugar da fase (o campo `place` é o mesmo de js/cat-levels.js).
// Contrato e molde: docs/MUSICA.md. Cada receita é só dado (tom, modo, andamento, forma, progressão, motivo, vozes, camadas); quem faz a partitura é js/music.js.
// Estilo do bichinho (escolha de design, ninguém ouviu estas músicas): furtivo, elegante e malandro. Modos dórico, menor, menor harmônico, frígio, blues, pentatônicos
// e uns poucos claros (lídio, mixolídio, maior) para os lugares abertos; balanço (swing); contrabaixo pizzicato, escovas, celesta, flauta grave, acordes de sétima;
// melodias com pausas e síncopas. Rampa: o andamento sobe da Fase 1 (84 bpm) à Fase 20 (132 bpm) e as camadas (`intensity`) ficam mais cheias; a Fase 11
// (cães rastreadores), as noites (18 e 19) e a Fase 20 (final grande, "volta ao lar") têm mais camadas e tensão.
// Os temas são distintos entre si: nenhum repete tom e modo, andamento, forma com o mesmo tamanho, nem o par (instrumento do solo, padrão do baixo).
// Registro: o mesmo id registrado depois substitui o tema de exemplo de js/music.js (cat1). `gain` de cada receita foi ajustado com tools/music-render/render.js.
(function (root) {
  const M = root.Music || (typeof require === "function" ? require("./music.js") : null);
  if (!M) return;
  M.register([
    // 1 Sala de estar: simples e aconchegante. Valsa lenta (3/4, 84 bpm) em sol dórico com acordes de sétima e balanço leve. Celesta no solo, baixo de seno
    // ("uum-pá-pá"), escovas só a partir da repetição e um órgão suave; a flauta grave só entra na parte B. Poucas notas, frases que respiram.
    {
      id: "cat1", animal: "cat", place: "Sala de estar", key: "G", mode: "dorian", bpm: 84, beats: 3, swing: 0.3, bars: 32, form: "AABA",
      prog: { A: "I7 IV7 I7 IV7", B: "VII IV7 I7 V" },
      motif: { seed: 6101, bars: 2, contour: "arch", leaps: 0.2, rests: 0.3, density: 0.4, rhythm: ["x--x-x", "x-x---"] },
      voices: {
        lead: { inst: "celesta", oct: 4, vel: 0.7 },
        counter: { inst: "flute", oct: 3, vel: 0.42, from: 0.6 },
        bass: { inst: "bassSine", pattern: "waltz", oct: 2, vel: 0.7 },
        pad: { inst: "organ", oct: 3, vel: 0.3, from: 0.45 },
        perc: { kit: "brush", pattern: "waltz", vel: 0.32, from: 0.45 },
      },
      intensity: 0.5,
    },
    // 2 Cozinha e despensa: ré menor, 88 bpm, balanço. Marimba no solo com ritmo cheio de pausas e síncopas, bloco de madeira marcando os contratempos como um relógio de parede
    // e contrabaixo pizzicato em síncope (tresillo). A flauta entra nas partes B e o arpejo de cordas beliscadas só na última parte.
    {
      id: "cat2", animal: "cat", place: "Cozinha e despensa", key: "D", mode: "minor", bpm: 88, beats: 4, swing: 0.3, bars: 32, form: "ABAB",
      prog: { A: "I IV I V", B: "VI VII I V" },
      motif: { seed: 6202, bars: 2, contour: "hop", leaps: 0.5, rests: 0.3, density: 0.55, rhythm: { A: ["x-.xx-.x", "x--x-x--"], B: ["x.xxx-.x", "x-x-x.x-"] } },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 3, vel: 0.42, from: 0.65 },
        bass: { inst: "contrabass", pattern: "sync", oct: 2, vel: 0.8 },
        arp: { inst: "pluck", rate: 1, shape: "up", oct: 4, vel: 0.4, from: 0.75 },
        perc: { kit: "woodblock", pattern: "offbeat", vel: 0.45, from: 0.3 },
      },
      intensity: 0.55,
    },
    // 3 Quintal dos fundos: lá dórico, 92 bpm, balanço forte. Cordas beliscadas no solo com o ritmo "3+3+2" de quem espreita, contrabaixo pizzicato, escovas "ding, ding-a-ding"
    // e uma flauta grave com cordas macias só na parte B. Mais ar entre as notas do que nos temas seguintes.
    {
      id: "cat3", animal: "cat", place: "Quintal dos fundos", key: "A", mode: "dorian", bpm: 92, beats: 4, swing: 0.4, bars: 32, form: "ABAC",
      prog: { A: "I IV7 I V", B: "VII IV I7 V", C: "II IV7 VII I7" },
      motif: { seed: 6303, bars: 2, contour: "wave", leaps: 0.45, rests: 0.4, density: 0.35, rhythm: ["x--x--x-", "x---x-x-"] },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.6 },
        bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.3, from: 0.6 },
        perc: { kit: "brush", pattern: "brush2", vel: 0.45, from: 0.2 },
      },
      intensity: 0.5,
    },
    // 4 Jardim e varal: dó lídio (a quarta aumentada deixa o tema arejado, como roupa no vento), 95 bpm. Harpa no solo subindo em saltos médios, baixo de triângulo "raiz e quinta",
    // chocalho em colcheias de balanço e uma flauta grave que dobra a harmonia nas partes mais cheias.
    {
      id: "cat4", animal: "cat", place: "Jardim e varal", key: "C", mode: "lydian", bpm: 95, beats: 4, swing: 0.25, bars: 32, form: "AABC",
      prog: { A: "I II I V", B: "VI II V I", C: "IV V VII I" },
      motif: { seed: 6404, bars: 2, contour: "rise", leaps: 0.35, rests: 0.35, density: 0.45, rhythm: ["x-x-x--x", "x---x-x-"] },
      voices: {
        lead: { inst: "harp", oct: 4, vel: 0.75 },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.6 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.75 },
        pad: { inst: "organ", oct: 3, vel: 0.25, from: 0.55 },
        perc: { kit: "shaker", pattern: "shuffle", vel: 0.3, from: 0.3 },
      },
      intensity: 0.5,
    },
    // 5 Telhados e muros: leveza e suspense. Mi menor harmônico (a sensível dá o suspense), 6/8 em 2 a 98 bpm (passos na ponta dos pés), sino no solo com notas esparsas,
    // contrabaixo pizzicato só nos contratempos, bloco de madeira de vez em quando e uma harpa que sobe e desce (em semínimas) nas partes mais cheias; sem cordas longas, vento bem leve.
    {
      id: "cat5", animal: "cat", place: "Telhados e muros", key: "E", mode: "harmMinor", bpm: 98, beats: 6, swing: 0, bars: 48, form: "ABACBA",
      prog: { A: "I VII I V", B: "IV VI V I", C: "VI VII V I" },
      motif: { seed: 6505, bars: 2, contour: "hop", leaps: 0.55, rests: 0.45, density: 0.4, rhythm: { A: ["x--x--", "x-xx--"], B: ["x-xx-x", "x--x--"], C: ["x--xxx", "x-x---"] } },
      voices: {
        lead: { inst: "bell", oct: 4, vel: 0.7 },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.55 },
        bass: { inst: "contrabass", pattern: "offbeat", oct: 2, vel: 0.7 },
        arp: { inst: "harp", rate: 1.5, shape: "updown", oct: 4, vel: 0.35, from: 0.66 },
        perc: { kit: "woodblock", pattern: "sparse", vel: 0.4, from: 0.3 },
        ambience: { kind: "wind", vel: 0.3 },
      },
      intensity: 0.45,
    },
  ]);
})(typeof window !== "undefined" ? window : globalThis);
