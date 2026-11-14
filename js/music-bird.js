// Músicas tema do PASSARINHO: 20 receitas (bird1 a bird20), uma por fase, com o clima do lugar da fase (o campo `place` repete js/bird-levels.js).
// Contrato das receitas: docs/MUSICA.md. Este arquivo só registra receitas em `Music` (js/music.js vem antes no navegador); o registro posterior substitui o tema de exemplo `bird1` do motor.
// Escolhas de design (nenhuma pessoa ouviu estes temas; as conferências são estruturais e medidas, ver tests/music-bird.test.js):
//   * Estilo do bichinho: leve e arejado; pentatônicas, lídio, maior e mixolídio no começo, modos menores a partir da Fase 11 (chegada dos gaviões); arpejos de harpa/celesta/sino,
//     flauta e compassos soltos (13 das 20 fases em 6/8 ou 3/4; 4/4 nas outras 7: Horta e cerca (3), Parque e coreto (6), Mata de pinheiros (10), Fazenda e galinheiro (11), Dunas e restinga (14), Campos de altitude (17) e o final (20)); vento, água e grilos como ambiência;
//     motivos curtos e ritmados, como cantos de pássaro, sem imitar nenhuma espécie.
//   * Rampa: o andamento sobe de 76 (Fase 1) a 128 bpm (Fase 20) e a quantidade de camadas (`intensity`) também; as fases 18 (entardecer) e 19 (noite) desaceleram de propósito.
//     No 6/8 o `bpm` é o pulso pontuado (dois por compasso), por isso as fases em 6/8 mais rápidas têm mais compassos para o laço durar o mesmo.
//   * Ninguém repete (tom, modo, andamento, instrumento do solo, padrão do baixo): os testes conferem; as melodias nascem de sementes, ritmos e contornos próprios.
(function (root) {
  const M = root.Music || (typeof require === "function" ? require("./music.js") : null);
  if (!M) return;
  M.register([
    // 1 Jardim florido: sol pentatônico maior em 6/8 bem lento (76), flauta que passa a frase a um sino, arpejo de harpa só nas seções que se repetem, baixo de senoide e nenhuma percussão.
    {
      id: "bird1", animal: "bird", place: "Jardim florido", key: "G", mode: "pentMajor", bpm: 76, beats: 6, swing: 0, bars: 32, form: "AABA",
      prog: { A: "I II V IV", B: "V IV II I" },
      motif: { seed: 6101, bars: 2, contour: "arch", leaps: 0.35, rests: 0.25, density: 0.4, rhythm: ["x-xx-x", "x--x--"] },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.75, rotate: [{ inst: "flute" }, { inst: "flute" }, { inst: "bell", oct: 5, vel: 0.5 }] },
        counter: { inst: "celesta", oct: 5, vel: 0.36, from: 0.55, above: true },
        bass: { inst: "bassSine", pattern: "waltz", oct: 2, vel: 0.5 },
        arp: { inst: "harp", rate: 3, shape: "updown", oct: 3, vel: 0.4, from: 0.38 },
      },
      intensity: 0.42, gain: 1.2,
    },
    // 2 Pomar de macieiras: ré lídio em valsa (3/4, 80), harpa que se alterna com a flauta, contracanto grave de flauta, violão (pluck) quebrado e escova só nas seções cheias (sem cordas, para ficar leve).
    {
      id: "bird2", animal: "bird", place: "Pomar de macieiras", key: "D", mode: "lydian", bpm: 80, beats: 3, swing: 0, bars: 32, form: "ABAB",
      prog: { A: "I II VI V", B: "VI III II V" },
      motif: { seed: 6202, bars: 2, contour: "rise", leaps: 0.4, rests: 0.15, density: 0.5, rhythm: { A: ["x-x-xx", "x--x--"], B: ["x-xx-x", "x-----"] } },
      voices: {
        lead: { inst: "harp", oct: 4, vel: 0.72, rotate: [{ inst: "harp" }, { inst: "harp" }, { inst: "flute", vel: 0.65 }] },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.6 },
        bass: { inst: "bass", pattern: "waltz", oct: 2, vel: 0.6 },
        arp: { inst: "pluck", rate: 2, shape: "broken", oct: 3, vel: 0.38, from: 0.42 },
        perc: { kit: "brush", pattern: "waltz", vel: 0.32, from: 0.55 },
      },
      intensity: 0.46, gain: 1.35,
    },
    // 3 Horta e cerca: dó maior em 4/4 (84), motivos saltitantes de marimba (que passa para o violão), baixo caminhante, bloco de madeira esparso e leve balanço; seções de 6 compassos (AABC).
    {
      id: "bird3", animal: "bird", place: "Horta e cerca", key: "C", mode: "major", bpm: 84, beats: 4, swing: 0.08, bars: 24, form: "AABC",
      prog: { A: "I vi IV", B: "IV I V", C: "vi IV V" },
      motif: { seed: 6303, bars: 2, contour: "hop", leaps: 0.55, rests: 0.1, density: 0.6, rhythm: { A: ["x-xx-x-x", "x---x-x-"], B: ["x--x-xx-", "x-x-----"], C: ["xx-x-x--", "x---x---"] } },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8, rotate: [{ inst: "marimba" }, { inst: "pluck", vel: 0.7 }] },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.6 },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.7 },
        arp: { inst: "harp", rate: 2, shape: "up", oct: 4, vel: 0.36, from: 0.7 },
        perc: { kit: "woodblock", pattern: "sparse", vel: 0.4, from: 0.3 },
      },
      intensity: 0.5, gain: 1.14,
    },
    // 4 Telhados e chaminés: si bemol mixolídio em 6/8 (88), celesta e violão, baixo sincopado, arpejo alberti de harpa (três notas por compasso), escova leve; forma AABAC com uma seção final mais cheia.
    {
      id: "bird4", animal: "bird", place: "Telhados e chaminés", key: "Bb", mode: "mixolydian", bpm: 88, beats: 6, swing: 0, bars: 40, form: "AABAC",
      prog: { A: "I VII IV I", B: "VI VII IV I", C: "IV VII I V" },
      motif: { seed: 6404, bars: 2, contour: "wave", leaps: 0.45, rests: 0.2, density: 0.55, rhythm: { A: ["xx-x-x", "x-xx--"], B: ["x--xx-", "x-x---"], C: ["x-xxxx", "x--x--"] } },
      voices: {
        lead: { inst: "celesta", oct: 5, vel: 0.7, rotate: [{ inst: "celesta" }, { inst: "pluck", oct: 4, vel: 0.62 }] },
        counter: { inst: "flute", oct: 4, vel: 0.42, from: 0.62 },
        bass: { inst: "bass", pattern: "sync", oct: 2, vel: 0.6 },
        arp: { inst: "harp", rate: 1.5, shape: "alberti", oct: 3, vel: 0.4, from: 0.45 },
        perc: { kit: "brush", pattern: "steady", vel: 0.3, from: 0.4 },
      },
      intensity: 0.5, gain: 1.19,
    },
    // 5 Praça da vila: lá maior em valsa de coreto (3/4, 92), órgão suave que alterna com flauta e xilofone, baixo "uum-pá-pá" com bumbo macio e bloco de madeira, sino agudo no contracanto; forma ABAC.
    {
      id: "bird5", animal: "bird", place: "Praça da vila", key: "A", mode: "major", bpm: 92, beats: 3, swing: 0, bars: 32, form: "ABAC",
      prog: { A: "I vi IV V", B: "IV I V vi", C: "vi IV I V" },
      motif: { seed: 6505, bars: 2, contour: "wave", leaps: 0.3, rests: 0.12, density: 0.55, rhythm: { A: ["x--xx-", "x-x-x-"], B: ["x-xx-x", "x-----"], C: ["xx-x-x", "x--x--"] } },
      voices: {
        lead: { inst: "organ", oct: 4, vel: 0.62, rotate: [{ inst: "organ" }, { inst: "flute", oct: 5, vel: 0.6 }, { inst: "xylo", oct: 5, vel: 0.55 }] },
        counter: { inst: "bell", oct: 5, vel: 0.34, from: 0.62, above: true },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.7 },
        pad: { inst: "strings", oct: 3, vel: 0.25, from: 0.4 },
        perc: { kit: ["softkick", "woodblock"], pattern: "waltz", vel: 0.38, from: 0.3 },
      },
      intensity: 0.52, gain: 1.2,
    },
    // 6 Parque e coreto: mi mixolídio em 4/4 (96), marcha leve com "uum-pá" (baixo nos contratempos, bumbo macio e bloco de madeira), xilofone com a flauta nas respostas, sino agudo e violão nas seções B; forma ABBA, trio no meio.
    {
      id: "bird6", animal: "bird", place: "Parque e coreto", key: "E", mode: "mixolydian", bpm: 96, beats: 4, swing: 0.1, bars: 32, form: "ABBA",
      prog: { A: "I IV VII I", B: "VI VII IV I" },
      motif: { seed: 6606, bars: 2, contour: "arch", leaps: 0.5, rests: 0.1, density: 0.7, rhythm: { A: ["x-x-xx-x", "x-xx-x--"], B: ["x--x-x-x", "x-x-x---"] } },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.78, rotate: [{ inst: "xylo" }, { inst: "xylo" }, { inst: "flute", oct: 5, vel: 0.6 }] },
        counter: { inst: "bell", oct: 5, vel: 0.34, from: 0.62, above: true },
        bass: { inst: "bass", pattern: "offbeat", oct: 2, vel: 0.6 },
        arp: { inst: "pluck", rate: 2, shape: "up", oct: 3, vel: 0.34, from: 0.55 },
        perc: { kit: ["softkick", "woodblock"], pattern: "steady", vel: 0.5, from: 0.3 },
      },
      intensity: 0.55, gain: 1.38,
    },
    // 7 Milharal: fá pentatônico maior em 6/8 (99), motivos de um compasso que a marimba e a flauta trocam como chamados, bordão de senoide, arpejo de violão, chocalho (o farfalhar das folhas) e vento; forma ABABAC.
    {
      id: "bird7", animal: "bird", place: "Milharal", key: "F", mode: "pentMajor", bpm: 99, beats: 6, swing: 0, bars: 48, form: "ABABAC",
      prog: { A: "I III V IV", B: "II IV I V", C: "IV V II I" },
      motif: { seed: 6707, bars: 1, contour: "hop", leaps: 0.45, rests: 0.2, density: 0.5, rhythm: { A: ["xx-x-x"], B: ["x-xxx-"], C: ["x--x--"] } },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.72, rotate: [{ inst: "marimba" }, { inst: "flute", oct: 5, vel: 0.55 }] },
        counter: { inst: "harp", oct: 5, vel: 0.34, from: 0.6, above: true },
        bass: { inst: "bassSine", pattern: "pedal", oct: 2, vel: 0.55 },
        arp: { inst: "pluck", rate: 3, shape: "up", oct: 3, vel: 0.32, from: 0.5 },
        perc: { kit: "shaker", pattern: "offbeat", vel: 0.3, from: 0.4 },
        ambience: { kind: "wind", vel: 0.45 },
      },
      intensity: 0.5, gain: 1.08,
    },
    // 8 Campo de trigo e espantalhos: si dórico em 3/4 (102), sino e marimba com muitas pausas (um quê de estranho e brincalhão), baixo sincopado de senoide, arpejo lento de celesta, bloco de madeira esparso e vento.
    {
      id: "bird8", animal: "bird", place: "Campo de trigo e espantalhos", key: "B", mode: "dorian", bpm: 102, beats: 3, swing: 0, bars: 40, form: "AABAB",
      prog: { A: "I IV I VII", B: "III IV VII I" },
      motif: { seed: 6808, bars: 2, contour: "wave", leaps: 0.5, rests: 0.35, density: 0.35, rhythm: { A: ["x-----", "x--x-x"], B: ["x-x---", "x--x--"] } },
      voices: {
        lead: { inst: "bell", oct: 5, vel: 0.6, rotate: [{ inst: "bell" }, { inst: "marimba", oct: 4, vel: 0.75 }] },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.6 },
        bass: { inst: "bassSine", pattern: "sync", oct: 2, vel: 0.6 },
        arp: { inst: "celesta", rate: 1, shape: "up", oct: 4, vel: 0.3, from: 0.45 },
        perc: { kit: "woodblock", pattern: "sparse", vel: 0.35, from: 0.3 },
        ambience: { kind: "wind", vel: 0.5 },
      },
      intensity: 0.5, gain: 1.19,
    },
    // 9 Lago e juncos: ré bemol maior em 6/8 (105), notas longas de harpa e flauta como numa barcarola, gotas de celesta em três notas por compasso, baixo "raiz-quinta" e gotas de água; sem percussão; forma ABABCB.
    {
      id: "bird9", animal: "bird", place: "Lago e juncos", key: "Db", mode: "major", bpm: 105, beats: 6, swing: 0, bars: 48, form: "ABABCB",
      prog: { A: "I vi IV V", B: "IV V iii vi", C: "vi IV I V" },
      motif: { seed: 6909, bars: 2, contour: "arch", leaps: 0.3, rests: 0.3, density: 0.3, rhythm: { A: ["x--x--", "x-----"], B: ["x-xx--", "x--x-x"], C: ["x-----", "x-x-x-"] } },
      voices: {
        lead: { inst: "harp", oct: 4, vel: 0.7, rotate: [{ inst: "harp" }, { inst: "harp" }, { inst: "flute", vel: 0.7 }] },
        counter: { inst: "flute", oct: 3, vel: 0.42, from: 0.6 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.55 },
        arp: { inst: "celesta", rate: 1.5, shape: "updown", oct: 5, vel: 0.3, from: 0.45 },
        ambience: { kind: "water", vel: 0.5 },
      },
      intensity: 0.46, gain: 1.15,
    },
    // 10 Mata de pinheiros: mi dórico em 4/4 (108), melodia de cordas que passa à flauta, baixo caminhante, arpejo lento de harpa nas seções cheias, escova esparsa e vento fraco entre as árvores; forma AABC com três contornos diferentes.
    {
      id: "bird10", animal: "bird", place: "Mata de pinheiros", key: "E", mode: "dorian", bpm: 108, beats: 4, swing: 0, bars: 32, form: "AABC",
      prog: { A: "I IV I VII", B: "III VII IV I", C: "II IV VII I" },
      motif: { seed: 7010, bars: 2, contour: "fall", leaps: 0.4, rests: 0.15, density: 0.45, rhythm: { A: ["x---x-x-", "x-xx----"], B: ["x-x-x---", "x--x-x--"], C: ["xx-x-x--", "x---x---"] } },
      voices: {
        lead: { inst: "strings", oct: 4, vel: 0.6, rotate: [{ inst: "strings" }, { inst: "flute", vel: 0.75 }, { inst: "strings" }] },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.6 },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.7 },
        arp: { inst: "harp", rate: 1, shape: "broken", oct: 3, vel: 0.34, from: 0.55 },
        perc: { kit: "brush", pattern: "sparse", vel: 0.35, from: 0.3 },
        ambience: { kind: "wind", vel: 0.3 },
      },
      intensity: 0.58, gain: 1.12,
    },
    // 11 Fazenda e galinheiro: chegam os gaviões; mi menor em 4/4 (112), violão (pluck) seco e saltitante com a flauta nas respostas, baixo de serrilha sincopado, marimba em arpejo e bumbo com bloco de madeira em colcheias; primeira fase de clima tenso.
    {
      id: "bird11", animal: "bird", place: "Fazenda e galinheiro", key: "E", mode: "minor", bpm: 112, beats: 4, swing: 0, bars: 32, form: "ABAB",
      prog: { A: "I VI VII I", B: "IV VII III VI" },
      motif: { seed: 7111, bars: 2, contour: "hop", leaps: 0.6, rests: 0.1, density: 0.75, rhythm: { A: ["x-xx-xx-", "x-x-xxx-"], B: ["xx-xx-xx", "x---x-x-"] } },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8, rotate: [{ inst: "pluck" }, { inst: "pluck" }, { inst: "flute", oct: 5, vel: 0.6 }] },
        counter: { inst: "flute", oct: 5, vel: 0.38, from: 0.6, above: true },
        bass: { inst: "bassSaw", pattern: "sync", oct: 2, vel: 0.55 },
        arp: { inst: "marimba", rate: 2, shape: "up", oct: 3, vel: 0.34, from: 0.5 },
        perc: { kit: ["softkick", "woodblock"], pattern: "driving", vel: 0.5, from: 0.25 },
      },
      intensity: 0.66, gain: 1.08,
    },
    // 12 Margem do rio: lá dórico em valsa corrida (3/4, 114), celesta e flauta, arpejo de harpa que sobe e desce sem parar (a correnteza), baixo de valsa, chocalho esparso e gotas de água.
    {
      id: "bird12", animal: "bird", place: "Margem do rio", key: "A", mode: "dorian", bpm: 114, beats: 3, swing: 0, bars: 40, form: "ABABA",
      prog: { A: "I VII IV I", B: "II III IV V" },
      motif: { seed: 7212, bars: 2, contour: "wave", leaps: 0.35, rests: 0.15, density: 0.6, rhythm: { A: ["x-xx-x", "x-x-xx"], B: ["x--x-x", "xx-x--"] } },
      voices: {
        lead: { inst: "celesta", oct: 5, vel: 0.7, rotate: [{ inst: "celesta" }, { inst: "flute", oct: 4, vel: 0.7 }] },
        counter: { inst: "flute", oct: 4, vel: 0.4, from: 0.6 },
        bass: { inst: "bass", pattern: "waltz", oct: 2, vel: 0.6 },
        arp: { inst: "harp", rate: 2, shape: "updown", oct: 3, vel: 0.4, from: 0.35 },
        perc: { kit: "shaker", pattern: "sparse", vel: 0.3, from: 0.5 },
        ambience: { kind: "water", vel: 0.45 },
      },
      intensity: 0.56, gain: 1.19,
    },
    // 13 Pântano e vitórias-régias: sol frígio em 6/8 (116) com notas longas e muitas pausas, órgão grave e sino, bordão de serrilha, gotas de harpa, batida de coração (bumbo macio) e água; forma ABACAB.
    {
      id: "bird13", animal: "bird", place: "Pântano e vitórias-régias", key: "G", mode: "phrygian", bpm: 116, beats: 6, swing: 0, bars: 48, form: "ABACAB",
      prog: { A: "I II I VII", B: "I VII VI VII", C: "II I VII I" },
      motif: { seed: 7313, bars: 2, contour: "fall", leaps: 0.3, rests: 0.45, density: 0.25, rhythm: { A: ["x-----", "x--x--"], B: ["x-----", "x-x---"], C: ["x--x--", "x-----"] } },
      voices: {
        lead: { inst: "organ", oct: 3, vel: 0.5, rotate: [{ inst: "organ" }, { inst: "bell", oct: 5, vel: 0.45 }] },
        bass: { inst: "bassSaw", pattern: "pedal", oct: 2, vel: 0.45 },
        arp: { inst: "harp", rate: 1.5, shape: "up", oct: 4, vel: 0.3, from: 0.5 },
        perc: { kit: "softkick", pattern: "heartbeat", vel: 0.35, from: 0.3 },
        ambience: { kind: "water", vel: 0.55 },
      },
      intensity: 0.5, gain: 1.52,
    },
    // 14 Dunas e restinga: dó menor harmônico em 4/4 (118), violão seco (a 2ª aumentada dá o ar de deserto) que passa à flauta, baixo de pizzicato, bumbo nos tempos e bloco de madeira nos contratempos (padrão `offbeat`), cordas nas seções cheias e vento; forma ABCB.
    {
      id: "bird14", animal: "bird", place: "Dunas e restinga", key: "C", mode: "harmMinor", bpm: 118, beats: 4, swing: 0, bars: 32, form: "ABCB",
      prog: { A: "I IV V I", B: "VI IV V I", C: "IV VI V I" },
      motif: { seed: 7414, bars: 2, contour: "wave", leaps: 0.55, rests: 0.2, density: 0.55, rhythm: { A: ["x--x-x--", "x-x-x---"], B: ["x-xx-x-x", "x---x-x-"], C: ["xx-x-xx-", "x-----x-"] } },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8, rotate: [{ inst: "pluck" }, { inst: "flute", oct: 5, vel: 0.6 }] },
        bass: { inst: "bass", pattern: "pizz", oct: 2, vel: 0.65 },
        pad: { inst: "strings", oct: 3, vel: 0.24, from: 0.5 },
        perc: { kit: ["softkick", "woodblock"], pattern: "offbeat", vel: 0.4, from: 0.3 },
        ambience: { kind: "wind", vel: 0.45 },
      },
      intensity: 0.6, gain: 1.12,
    },
    // 15 Falésias e ninhos: lá bemol lídio em 3/4 (120), frases de três compassos subindo na flauta e no sino, contracanto agudo de celesta, arpejo lento de harpa nas seções cheias, bumbo macio com chocalho e vento forte; forma ABABC.
    {
      id: "bird15", animal: "bird", place: "Falésias e ninhos", key: "Ab", mode: "lydian", bpm: 120, beats: 3, swing: 0, bars: 40, form: "ABABC",
      prog: { A: "I VII II V", B: "VI II I V", C: "III VI II V" },
      motif: { seed: 7515, bars: 3, contour: "rise", leaps: 0.6, rests: 0.25, density: 0.6, rhythm: { A: ["x-x-xx", "x--x-x", "x-----"], B: ["xx-x-x", "x-x---", "x-----"], C: ["x--xx-", "x-x-x-", "x-----"] } },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.7, rotate: [{ inst: "flute" }, { inst: "bell", oct: 5, vel: 0.5 }] },
        counter: { inst: "celesta", oct: 5, vel: 0.34, from: 0.6, above: true },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.65 },
        arp: { inst: "harp", rate: 1, shape: "broken", oct: 3, vel: 0.38, from: 0.5 },
        perc: { kit: ["softkick", "shaker"], pattern: "steady", vel: 0.4, from: 0.4 },
        ambience: { kind: "wind", vel: 0.5 },
      },
      intensity: 0.6, gain: 1.16,
    },
    // 16 Vila de pescadores e redes: sol dórico em 6/8 (122), uma giga de marimba e flauta com baixo caminhante, violão em arpejo lento, sino agudo, bumbo e bloco de madeira em polca e brisa do mar; seções de 12 compassos (AABA).
    {
      id: "bird16", animal: "bird", place: "Vila de pescadores e redes", key: "G", mode: "dorian", bpm: 122, beats: 6, swing: 0, bars: 48, form: "AABA",
      prog: { A: "I IV I VII IV I", B: "III IV VII III IV I" },
      motif: { seed: 7616, bars: 2, contour: "hop", leaps: 0.5, rests: 0.1, density: 0.75, rhythm: { A: ["x-xx-x", "xx-x-x"], B: ["x--x--", "xxxxxx"] } },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8, rotate: [{ inst: "marimba" }, { inst: "flute", vel: 0.7 }] },
        counter: { inst: "bell", oct: 5, vel: 0.33, from: 0.6, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.7 },
        arp: { inst: "pluck", rate: 1.5, shape: "up", oct: 3, vel: 0.34, from: 0.6 },
        perc: { kit: ["softkick", "woodblock"], pattern: "polka", vel: 0.5, from: 0.25 },
        ambience: { kind: "wind", vel: 0.35 },
      },
      intensity: 0.64, gain: 0.87,
    },
    // 17 Campos de altitude: ré mixolídio em 4/4 (124), frases longas de quatro compassos (harpa e flauta), bordão de senoide, arpejo de celesta, flauta aguda no contracanto, chocalho e muito vento; leve balanço.
    {
      id: "bird17", animal: "bird", place: "Campos de altitude", key: "D", mode: "mixolydian", bpm: 124, beats: 4, swing: 0.06, bars: 32, form: "AABA",
      prog: { A: "I IV VII IV", B: "VI VII I V" },
      motif: { seed: 7717, bars: 4, contour: "rise", leaps: 0.35, rests: 0.2, density: 0.4, rhythm: { A: ["x-----x-", "x---x-x-", "x-x-x---", "x-------"], B: ["x--x-x--", "x-----x-", "xx-x----", "x---x---"] } },
      voices: {
        lead: { inst: "harp", oct: 4, vel: 0.72, rotate: [{ inst: "harp" }, { inst: "flute", vel: 0.7 }] },
        counter: { inst: "flute", oct: 5, vel: 0.34, from: 0.62, above: true },
        bass: { inst: "bassSine", pattern: "pedal", oct: 2, vel: 0.6 },
        arp: { inst: "celesta", rate: 2, shape: "alberti", oct: 4, vel: 0.3, from: 0.5 },
        perc: { kit: "shaker", pattern: "offbeat", vel: 0.3, from: 0.5 },
        ambience: { kind: "wind", vel: 0.5 },
      },
      intensity: 0.62, gain: 1.02,
    },
    // 18 Entardecer nos telhados: si menor em 6/8 lento (82), flauta quente que desce em notas longas e passa a frase às cordas, harpa grave no contracanto, contrabaixo em pizzicato, arpejo de harpa descendo, escova rara e brisa; forma ABACA, volta ao começo.
    {
      id: "bird18", animal: "bird", place: "Entardecer nos telhados", key: "B", mode: "minor", bpm: 82, beats: 6, swing: 0, bars: 40, form: "ABACA",
      prog: { A: "I VI III VII", B: "IV VI VII I", C: "III VII VI VII" },
      motif: { seed: 7818, bars: 2, contour: "fall", leaps: 0.25, rests: 0.3, density: 0.3, rhythm: { A: ["x--x--", "x-----"], B: ["x-x---", "x--x-x"], C: ["x-----", "x--x--"] } },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.7, rotate: [{ inst: "flute" }, { inst: "flute" }, { inst: "strings", vel: 0.5 }] },
        counter: { inst: "harp", oct: 3, vel: 0.4, from: 0.6 },
        bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.6 },
        arp: { inst: "harp", rate: 1.5, shape: "down", oct: 4, vel: 0.32, from: 0.45 },
        perc: { kit: "brush", pattern: "sparse", vel: 0.3, from: 0.4 },
        ambience: { kind: "wind", vel: 0.3 },
      },
      intensity: 0.5, gain: 1.22,
    },
    // 19 Noite na floresta: fá sustenido pentatônico menor em 3/4 (90), flauta grave com muitas pausas, baixo de senoide nos contratempos, órgão baixo e harpa esparsa só nas seções cheias, batida de coração e grilos; o tema mais escuro e vazio.
    {
      id: "bird19", animal: "bird", place: "Noite na floresta", key: "F#", mode: "pentMinor", bpm: 90, beats: 3, swing: 0, bars: 32, form: "ABCA",
      prog: { A: "I IV I V", B: "III IV V I", C: "V IV I III" },
      motif: { seed: 7919, bars: 2, contour: "wave", leaps: 0.3, rests: 0.5, density: 0.2, rhythm: { A: ["x-----", "x---x-"], B: ["x-----", "x-x---"], C: ["x--x--", "x-----"] } },
      voices: {
        lead: { inst: "flute", oct: 3, vel: 0.68 },
        bass: { inst: "bassSine", pattern: "offbeat", oct: 2, vel: 0.45 },
        pad: { inst: "organ", oct: 3, vel: 0.22, from: 0.5 },
        arp: { inst: "harp", rate: 1, shape: "up", oct: 4, vel: 0.3, from: 0.5 },
        perc: { kit: "softkick", pattern: "heartbeat", vel: 0.35, from: 0.3 },
        ambience: { kind: "crickets", vel: 0.5 },
      },
      intensity: 0.38, gain: 1.24,
    },
    // 20 O grande ninho: ré maior em 4/4 (128), o final: a flauta passa a frase à harpa, ao sino e às cordas, contracanto de celesta, arpejo alberti de harpa, baixo caminhante, bumbo e chocalho; forma ABCBA, em que a volta do A é a "volta ao ninho".
    {
      id: "bird20", animal: "bird", place: "O grande ninho", key: "D", mode: "major", bpm: 128, beats: 4, swing: 0.08, bars: 40, form: "ABCBA",
      prog: { A: "I vi IV V", B: "IV V iii vi", C: "vi IV I V" },
      motif: { seed: 8020, bars: 2, contour: "arch", leaps: 0.5, rests: 0.1, density: 0.7, rhythm: { A: ["x--x-xx-", "x-x-x---"], B: ["x-xx-x-x", "x---x-x-"], C: ["xx-x-x--", "x-x-----"] } },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.8, rotate: [{ inst: "flute" }, { inst: "harp" }, { inst: "bell", oct: 5, vel: 0.55 }, { inst: "strings", vel: 0.55 }] },
        counter: { inst: "celesta", oct: 5, vel: 0.36, from: 0.55, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.75 },
        arp: { inst: "harp", rate: 2, shape: "alberti", oct: 3, vel: 0.42, from: 0.4 },
        perc: { kit: ["softkick", "shaker"], pattern: "polka", vel: 0.5, from: 0.2 },
      },
      intensity: 0.72, gain: 0.96,
    },
  ]);
})(typeof window !== "undefined" ? window : globalThis);
