// Músicas tema do GATINHO: 20 receitas (cat1 a cat20), uma por fase, cada uma com o clima do lugar da fase (o campo `place` é o mesmo de js/cat-levels.js).
// Contrato e molde: docs/MUSICA.md. Cada receita é só dado (tom, modo, andamento, forma, progressão, motivo, vozes, camadas); quem faz a partitura é js/music.js.
// Estilo do bichinho (escolha de design; nenhuma pessoa ouviu estas músicas): furtivo, elegante e malandro. Modos dórico, menor, menor harmônico, frígio, blues, pentatônicos
// e uns poucos claros (lídio, mixolídio, maior) para os lugares abertos; balanço (swing); contrabaixo pizzicato, escovas, celesta, flauta grave, acordes de sétima;
// melodias com pausas e síncopas. Rampa: o andamento sobe da Fase 1 (84 bpm) à Fase 20 (132 bpm) e as camadas (`intensity`) ficam mais cheias; a Fase 11
// (cães rastreadores), as noites (18 e 19) e a Fase 20 (final grande, "volta ao lar") têm mais camadas e tensão.
// Os temas são distintos entre si: nenhum repete tom e modo, andamento, forma com o mesmo tamanho, nem o par (instrumento do solo, padrão do baixo).
// Registro: o mesmo id registrado depois substitui o tema de exemplo de js/music.js (cat1). `gain` de cada receita foi ajustado com tools/music-render/render.js (RMS perto de -22 dBFS do tema sozinho, a ganho 1 e sem o barramento do jogo).
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
      gain: 1.33,
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
      gain: 1.13,
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
      gain: 1.17,
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
      gain: 1.16,
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
      gain: 1.12,
    },
    // 6 Beco da cidade: si bemol blues (escala de blues: a nota "azul" dá o ar de esquina escura), 101 bpm, balanço forte. Flauta grave no solo (às vezes cordas beliscadas),
    // contrabaixo caminhando (walk), escovas em shuffle, órgão suave nas partes mais cheias e celesta aguda em contracanto nos trechos finais. Harmonia de 8 acordes por parte.
    {
      id: "cat6", animal: "cat", place: "Beco da cidade", key: "Bb", mode: "blues", bpm: 101, beats: 4, swing: 0.45, bars: 32, form: "ABCB",
      prog: { A: "I I III I I III I V", B: "III I V I III I V I", C: "V III I V III I V III" },
      motif: { seed: 6606, bars: 2, contour: "fall", leaps: 0.35, rests: 0.4, density: 0.5, rhythm: ["x.x-x-x.", "x---.xx-"] },
      voices: {
        lead: { inst: "flute", oct: 3, vel: 0.75, rotate: [{ inst: "flute" }, { inst: "flute" }, { inst: "pluck", oct: 3 }] },
        counter: { inst: "celesta", oct: 5, vel: 0.35, from: 0.75, above: true },
        bass: { inst: "contrabass", pattern: "walk", oct: 2, vel: 0.85 },
        pad: { inst: "organ", oct: 3, vel: 0.25, from: 0.65 },
        perc: { kit: "brush", pattern: "shuffle", vel: 0.4, from: 0.3 },
      },
      intensity: 0.55,
      gain: 1.06,
    },
    // 7 Feira livre: mi bemol mixolídio, 104 bpm, balanço leve. Xilofone no solo em ritmo cheio de notas rápidas (a feira em movimento), baixo de triângulo em síncope (tresillo),
    // bumbo macio e chocalho em polca, arpejo de cordas beliscadas só na parte B (as barracas cheias). O baixo e a melodia se cruzam sem brigar: o solo fica duas oitavas acima.
    {
      id: "cat7", animal: "cat", place: "Feira livre", key: "Eb", mode: "mixolydian", bpm: 104, beats: 4, swing: 0.2, bars: 32, form: "AABB",
      prog: { A: "I VII IV I", B: "IV I V I" },
      motif: { seed: 6707, bars: 2, contour: "hop", leaps: 0.6, rests: 0.25, density: 0.7, rhythm: ["xxx-xx-x", "x-xxx-xx"] },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.65 },
        bass: { inst: "bass", pattern: "sync", oct: 2, vel: 0.85 },
        arp: { inst: "pluck", rate: 2, shape: "alberti", oct: 4, vel: 0.4, from: 0.7 },
        perc: { kit: ["softkick", "shaker"], pattern: "polka", vel: 0.5, from: 0.3 },
      },
      intensity: 0.6,
      gain: 0.94,
    },
    // 8 Peixaria e mercado: fá sustenido dórico, 106 bpm, balanço. Marimba grave no solo (gotas no balcão molhado: a ambiência "água" cai entre as frases), contrabaixo caminhando,
    // escovas nos contratempos, celesta em contracanto e cordas só nas partes B (que se repetem). Frase de forma ABBA: a parte B volta mais cheia.
    {
      id: "cat8", animal: "cat", place: "Peixaria e mercado", key: "F#", mode: "dorian", bpm: 106, beats: 4, swing: 0.4, bars: 32, form: "ABBA",
      prog: { A: "I7 IV7 I7 V", B: "II IV7 VII I7" },
      motif: { seed: 6808, bars: 2, contour: "wave", leaps: 0.4, rests: 0.35, density: 0.5, rhythm: ["x-xx-x--", "x--.xx-x"] },
      voices: {
        lead: { inst: "marimba", oct: 3, vel: 0.8 },
        counter: { inst: "celesta", oct: 4, vel: 0.35, from: 0.7, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.85 },
        pad: { inst: "strings", oct: 3, vel: 0.25, from: 0.7 },
        perc: { kit: "brush", pattern: "offbeat", vel: 0.4, from: 0.3 },
        ambience: { kind: "water", vel: 0.5 },
      },
      intensity: 0.55,
      gain: 1.01,
    },
    // 9 Parque e lago: valsa (3/4, 108 bpm) em ré bemol pentatônico maior, o tema mais aberto e calmo da primeira metade. Flauta no solo, contrabaixo "uum-pá-pá", chocalho em valsa,
    // cordas macias, arpejo de harpa de três notas por compasso nas partes B e C e um sino agudo em descante na parte C.
    {
      id: "cat9", animal: "cat", place: "Parque e lago", key: "Db", mode: "pentMajor", bpm: 108, beats: 3, swing: 0.15, bars: 32, form: "ABCA",
      prog: { A: "I II V IV", B: "IV I II V", C: "V IV II I" },
      motif: { seed: 6909, bars: 2, contour: "arch", leaps: 0.3, rests: 0.25, density: 0.45, rhythm: ["x-x-xx", "x---x-"] },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.75 },
        counter: { inst: "bell", oct: 5, vel: 0.3, from: 0.72, above: true },
        bass: { inst: "contrabass", pattern: "waltz", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.3, from: 0.4 },
        arp: { inst: "harp", rate: 1, shape: "up", oct: 4, vel: 0.45, from: 0.6 },
        perc: { kit: "shaker", pattern: "waltz", vel: 0.3, from: 0.45 },
      },
      intensity: 0.5,
      gain: 1.07,
    },
    // 10 Armazém de grãos: si frígio (a segunda menor dá o ar sombrio), 110 bpm, forma curta ABA de 24 compassos. Órgão grave no solo com notas longas e muitas pausas,
    // baixo de serrilha em pedal (a raiz sustentada), batida de coração no bumbo macio, cordas, e um sino agudo em contracanto só na parte B. Pouco movimento, bastante espaço.
    {
      id: "cat10", animal: "cat", place: "Armazém de grãos", key: "B", mode: "phrygian", bpm: 110, beats: 4, swing: 0.15, bars: 24, form: "ABA",
      prog: { A: "I II I VII", B: "VI VII II I" },
      motif: { seed: 7010, bars: 2, contour: "fall", leaps: 0.25, rests: 0.5, density: 0.25, rhythm: ["x---x-x-", "x-----x-"] },
      voices: {
        lead: { inst: "organ", oct: 3, vel: 0.7 },
        counter: { inst: "bell", oct: 5, vel: 0.3, from: 0.7, above: true },
        bass: { inst: "bassSaw", pattern: "pedal", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.3, from: 0.4 },
        perc: { kit: "softkick", pattern: "heartbeat", vel: 0.6, from: 0.3 },
      },
      intensity: 0.6,
      gain: 0.9,
    },
    // 11 Celeiro e curral: a chegada dos cães rastreadores, o primeiro pico de tensão. Sol sustenido menor harmônico (a sensível e a segunda aumentada), 116 bpm, quase sem pausas
    // e quase sem balanço. Marimba grave martelando o motivo que sobe, baixo de serrilha em "raiz e quinta" (uma pancada por tempo), bumbo macio e prato leve em colcheias,
    // cordas agudas em descante e arpejo de cordas beliscadas em colcheias a partir da parte B (a parte C vem duas vezes, a segunda mais forte); sem acordes longos, para o tema ficar seco e nervoso.
    {
      id: "cat11", animal: "cat", place: "Celeiro e curral", key: "G#", mode: "harmMinor", bpm: 116, beats: 4, swing: 0.1, bars: 32, form: "ABCC",
      prog: { A: "I IV V I", B: "VI VII I V", C: "I VII VI V" },
      motif: { seed: 7111, bars: 2, contour: "rise", leaps: 0.5, rests: 0.1, density: 0.8, rhythm: ["xx-xxx-x", "x-xx-xx-"] },
      voices: {
        lead: { inst: "marimba", oct: 3, vel: 0.85 },
        counter: { inst: "strings", oct: 4, vel: 0.35, from: 0.75, above: true },
        bass: { inst: "bassSaw", pattern: "rootfifth", oct: 2, vel: 0.85 },
        arp: { inst: "pluck", rate: 2, shape: "broken", oct: 4, vel: 0.45, from: 0.8 },
        perc: { kit: ["softkick", "hat"], pattern: "driving", vel: 0.6, from: 0.3 },
      },
      intensity: 0.72,
      gain: 0.83,
    },
    // 12 Horta e galinheiro: lá bemol mixolídio, 112 bpm, balanço leve, forma curta AAB (24 compassos). Um respiro cômico depois da tensão da Fase 11: cordas beliscadas alternando
    // com marimba num ritmo de "cacarejo" (notas rápidas e curtas), baixo de triângulo só nos contratempos, bumbo macio e bloco de madeira nos tempos 2 e 4, flauta grave no final.
    {
      id: "cat12", animal: "cat", place: "Horta e galinheiro", key: "Ab", mode: "mixolydian", bpm: 112, beats: 4, swing: 0.25, bars: 24, form: "AAB",
      prog: { A: "I IV I V", B: "IV VII I V" },
      motif: { seed: 7212, bars: 2, contour: "hop", leaps: 0.55, rests: 0.3, density: 0.65, rhythm: ["xx-x-xx-", "x-x-x---"] },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8, rotate: [{ inst: "pluck" }, { inst: "marimba" }] },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.65 },
        bass: { inst: "bass", pattern: "offbeat", oct: 2, vel: 0.8 },
        perc: { kit: ["softkick", "woodblock"], pattern: "backbeat", vel: 0.5, from: 0.25 },
      },
      intensity: 0.55,
      gain: 1.21,
    },
    // 13 Borda da mata: mi frígio, 115 bpm, forma de duas partes longas (AB, 16 compassos cada) com harmonia lenta (um acorde a cada 4 compassos). Celesta no solo com um motivo de
    // 4 compassos, pausas longas, baixo de seno em pedal, cordas, flauta grave e uma harpa bem devagar (uma nota a cada dois tempos) na segunda parte, chocalho esparso. Mais escuro e mais parado que a fase anterior.
    {
      id: "cat13", animal: "cat", place: "Borda da mata", key: "E", mode: "phrygian", bpm: 115, beats: 4, swing: 0.05, bars: 32, form: "AB",
      prog: { A: "I II I VII", B: "VI VII II I" },
      motif: { seed: 7313, bars: 4, contour: "wave", leaps: 0.35, rests: 0.45, density: 0.3, rhythm: ["x---x---", "x-x-----", "x--x-x--", "x-------"] },
      voices: {
        lead: { inst: "celesta", oct: 4, vel: 0.7 },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.7 },
        bass: { inst: "bassSine", pattern: "pedal", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.3, from: 0.4 },
        arp: { inst: "harp", rate: 0.5, shape: "up", oct: 4, vel: 0.4, from: 0.7 },
        perc: { kit: "shaker", pattern: "sparse", vel: 0.35, from: 0.2 },
      },
      intensity: 0.6,
      gain: 0.95,
    },
    // 14 Riacho e pedras: ré pentatônico maior em 6/8 (118 bpm, 48 compassos, ABCABC), a água corre em colcheias. Harpa aguda no solo com notas ligadas em grupos de três,
    // gotas da ambiência "água", baixo de seno em pizzicato, chocalho nos contratempos, arpejo de cordas beliscadas que sobe e desce e uma flauta em contracanto (sem cordas longas).
    {
      id: "cat14", animal: "cat", place: "Riacho e pedras", key: "D", mode: "pentMajor", bpm: 118, beats: 6, swing: 0, bars: 48, form: "ABCABC",
      prog: { A: "I II V IV", B: "IV V II I", C: "V IV I II" },
      motif: { seed: 7414, bars: 2, contour: "wave", leaps: 0.3, rests: 0.15, density: 0.6, rhythm: ["x-xx-x", "xx-xx-"] },
      voices: {
        lead: { inst: "harp", oct: 5, vel: 0.7 },
        counter: { inst: "flute", oct: 4, vel: 0.4, from: 0.65 },
        bass: { inst: "bassSine", pattern: "pizz", oct: 2, vel: 0.75 },
        arp: { inst: "pluck", rate: 1.5, shape: "updown", oct: 4, vel: 0.35, from: 0.7 },
        perc: { kit: "shaker", pattern: "offbeat", vel: 0.3, from: 0.3 },
        ambience: { kind: "water", vel: 0.55 },
      },
      intensity: 0.5,
      gain: 0.94,
    },
    // 15 Vila de pescadores: dó menor em 6/8 (120 bpm, 48 compassos, AABCAB), uma barcarola de balanço sem swing. Órgão (sanfona simulada) no solo, às vezes trocado pela flauta,
    // contrabaixo pizzicato em "raiz e quinta", bumbo macio e escova (grave nos tempos, agudo no meio), órgão macio em acordes longos, harpa em arpejo quebrado e flauta grave nas partes mais cheias.
    {
      id: "cat15", animal: "cat", place: "Vila de pescadores", key: "C", mode: "minor", bpm: 120, beats: 6, swing: 0, bars: 48, form: "AABCAB",
      prog: { A: "I VI VII I", B: "III VII VI V", C: "IV VII III VI" },
      motif: { seed: 7515, bars: 2, contour: "arch", leaps: 0.4, rests: 0.2, density: 0.5, rhythm: ["x--x-x", "x-xx--"] },
      voices: {
        lead: { inst: "organ", oct: 4, vel: 0.7, rotate: [{ inst: "organ" }, { inst: "flute" }] },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.8 },
        bass: { inst: "contrabass", pattern: "rootfifth", oct: 2, vel: 0.8 },
        pad: { inst: "organ", oct: 3, vel: 0.3, from: 0.5 },
        arp: { inst: "harp", rate: 1, shape: "broken", oct: 4, vel: 0.4, from: 0.7 },
        perc: { kit: ["softkick", "brush"], pattern: "steady", vel: 0.45, from: 0.3 },
      },
      intensity: 0.6,
      gain: 0.9,
    },
    // 16 Docas do porto: fá blues, 123 bpm, balanço forte (quase tercina), forma de 12 compassos por parte (ABC, 36 compassos no total) com a progressão em "pergunta e resposta" do blues
    // (os numerais apontam as notas da escala de blues). Cordas beliscadas graves no solo, baixo de serrilha caminhando, bumbo macio e prato leve em shuffle, órgão a partir da parte B
    // e uma flauta aguda em descante nos trechos finais. Pesado e gingado: o porto com os guindastes.
    {
      id: "cat16", animal: "cat", place: "Docas do porto", key: "F", mode: "blues", bpm: 123, beats: 4, swing: 0.5, bars: 36, form: "ABC",
      prog: { A: "I I I I III III I I V III I V", B: "III III I I V V III III I V I V", C: "I III I III V III I I V III I V" },
      motif: { seed: 7616, bars: 2, contour: "fall", leaps: 0.4, rests: 0.3, density: 0.6, rhythm: ["x--x-xx-", "x-x--x--"] },
      voices: {
        lead: { inst: "pluck", oct: 3, vel: 0.8 },
        counter: { inst: "flute", oct: 4, vel: 0.4, from: 0.75, above: true },
        bass: { inst: "bassSaw", pattern: "walk", oct: 2, vel: 0.85 },
        pad: { inst: "organ", oct: 3, vel: 0.25, from: 0.55 },
        perc: { kit: ["softkick", "hat"], pattern: "shuffle", vel: 0.45, from: 0.3 },
      },
      intensity: 0.65,
      gain: 0.96,
    },
    // 17 Praia e dunas: sol pentatônico menor em 3/4 (119 bpm, 40 compassos, ABABA), aberto e espaçado, com vento. Marimba no solo (som seco de madeira, quase de tambor de aço),
    // baixo de triângulo em pizzicato, harpa subindo três notas por compasso, sino agudo em descante, prato leve nos contratempos. Sem cordas longas; frases longas com pausas.
    {
      id: "cat17", animal: "cat", place: "Praia e dunas", key: "G", mode: "pentMinor", bpm: 119, beats: 3, swing: 0.2, bars: 40, form: "ABABA",
      prog: { A: "I III IV V", B: "IV III V I" },
      motif: { seed: 7717, bars: 2, contour: "rise", leaps: 0.35, rests: 0.35, density: 0.4, rhythm: ["x-x--x", "x----x"] },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.7 },
        counter: { inst: "bell", oct: 5, vel: 0.3, from: 0.7, above: true },
        bass: { inst: "bass", pattern: "pizz", oct: 2, vel: 0.75 },
        arp: { inst: "harp", rate: 1, shape: "up", oct: 4, vel: 0.4, from: 0.6 },
        perc: { kit: ["softkick", "hat"], pattern: "offbeat", vel: 0.3, from: 0.3 },
        ambience: { kind: "wind", vel: 0.5 },
      },
      intensity: 0.5,
      gain: 1.11,
    },
    // 18 Telhados à noite: dó sustenido menor, 126 bpm, balanço médio, ABBC (a parte B volta mais cheia e a C fecha no ponto mais alto). Mais tensão que o dia: o solo é o contrabaixo
    // pizzicato em oitava média (o gato que anda sem fazer barulho) sobre baixo de serrilha em síncope, escova na caixa dos tempos 2 e 4, sino agudo em descante, arpejo de celesta
    // a partir da parte B e grilos ao fundo (sem cordas longas, para as notas ficarem nítidas).
    {
      id: "cat18", animal: "cat", place: "Telhados à noite", key: "C#", mode: "minor", bpm: 126, beats: 4, swing: 0.3, bars: 32, form: "ABBC",
      prog: { A: "I IV VI V", B: "VI VII I III", C: "IV V I V" },
      motif: { seed: 7818, bars: 2, contour: "wave", leaps: 0.5, rests: 0.3, density: 0.6, rhythm: ["x-.x-.x-", "xx.x-x--"] },
      voices: {
        lead: { inst: "contrabass", oct: 3, vel: 0.85 },
        counter: { inst: "bell", oct: 5, vel: 0.35, from: 0.8, above: true },
        bass: { inst: "bassSaw", pattern: "sync", oct: 2, vel: 0.8 },
        arp: { inst: "celesta", rate: 1, shape: "broken", oct: 4, vel: 0.4, from: 0.82 },
        perc: { kit: ["softkick", "brush"], pattern: "backbeat", vel: 0.5, from: 0.25 },
        ambience: { kind: "crickets", vel: 0.5 },
      },
      intensity: 0.7,
      gain: 0.98,
    },
    // 19 Mercado à noite (chuva): fá sustenido menor harmônico, 129 bpm, AABAC (40 compassos, a parte C fecha no ponto mais alto). Celesta no solo, baixo de serrilha em pizzicato lento,
    // bumbo macio e chocalho em colcheias nervosas, flauta grave e arpejo de cordas beliscadas nas partes mais fortes (sem acordes longos), e a ambiência de chuva por cima de tudo.
    {
      id: "cat19", animal: "cat", place: "Mercado à noite", key: "F#", mode: "harmMinor", bpm: 129, beats: 4, swing: 0.2, bars: 40, form: "AABAC",
      prog: { A: "I VI V I", B: "IV V VI VII", C: "VI V I V" },
      motif: { seed: 7919, bars: 2, contour: "fall", leaps: 0.55, rests: 0.25, density: 0.65, rhythm: ["x.xx-x.x", "x--x.x-x"] },
      voices: {
        lead: { inst: "celesta", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.85 },
        bass: { inst: "bassSaw", pattern: "pizz", oct: 2, vel: 0.8 },
        arp: { inst: "pluck", rate: 1, shape: "alberti", oct: 4, vel: 0.4, from: 0.85 },
        perc: { kit: ["softkick", "shaker"], pattern: "driving", vel: 0.55, from: 0.3 },
        ambience: { kind: "rain", vel: 0.5 },
      },
      intensity: 0.75,
      gain: 0.97,
    },
    // 20 A casa grande: o final e a "volta ao lar". Sol maior (o mesmo centro da Sala de estar, agora no modo maior), 132 bpm, ABABC (40 compassos) que cresce até o ponto mais cheio.
    // Xilofone no solo, que se reveza com celesta, flauta e harpa (os timbres da casa), baixo de triângulo caminhando, harpa em arpejo (oito notas por compasso), flauta em descante,
    // bumbo macio e chocalho. É o tema com mais notas por segundo junto com o 19; sem cordas longas, para as notas caberem no limite de vozes.
    {
      id: "cat20", animal: "cat", place: "A casa grande", key: "G", mode: "major", bpm: 132, beats: 4, swing: 0.2, bars: 40, form: "ABABC",
      prog: { A: "I vi IV V", B: "IV I V vi", C: "vi IV I V" },
      motif: { seed: 8020, bars: 2, contour: "rise", leaps: 0.5, rests: 0.1, density: 0.7, rhythm: ["x-xx-xx-", "x-x-xxx-"] },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.85, rotate: [{ inst: "xylo" }, { inst: "celesta" }, { inst: "flute" }, { inst: "harp" }] },
        counter: { inst: "flute", oct: 5, vel: 0.5, from: 0.6, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.85 },
        arp: { inst: "harp", rate: 2, shape: "updown", oct: 4, vel: 0.5, from: 0.7 },
        perc: { kit: ["softkick", "shaker"], pattern: "steady", vel: 0.5, from: 0.25 },
      },
      intensity: 0.7,
      gain: 0.78,
    },
  ]);
})(typeof window !== "undefined" ? window : globalThis);
