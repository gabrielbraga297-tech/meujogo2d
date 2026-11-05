// Músicas tema do CACHORRINHO: 20 receitas, uma por fase (dog1 a dog20), registradas em Music (js/music.js). O contrato da receita está em docs/MUSICA.md.
// Escolhas de design (nenhuma pessoa ouviu estes temas; os testes conferem só estrutura e medidas): alegre e saltitante nas primeiras fases (maiores, mixolídio e lídio,
// marcha, polca e balanço leve, xilofone, marimba e cordas beliscadas, baixo caminhante, bloco de madeira); o andamento sobe da Fase 1 (92 bpm) à 20 (148 bpm), as camadas
// entram aos poucos e as fases de perigo (Central da carrocinha, Beco dos gatos, Telhados, Fortaleza) ganham urgência com modos menor (Central da carrocinha e Telhados), frígio (Beco dos gatos) e menor harmônico (Fortaleza); o único dórico do Cachorrinho é o do Bosque (Fase 14).
// O `place` de cada receita é o lugar da fase em js/themes.js. Nos comentários, o balanço (`swing`) é leve até 0,2, médio de 0,25 a 0,3 e forte de 0,4 em diante. Cada tema tem tom, modo, andamento, semente do motivo e combinação de solo, baixo e percussão próprios.
(function (root) {
  const M = root.Music || (typeof require === "function" ? require("./music.js") : null);
  if (!M) return;

  const RECIPES = [
    // 1 Quintal: o mais simples e suave. Dó maior, 92 bpm, AABA em 32 compassos (83 s). Marimba sobre baixo de raiz e quinta e um bloco de madeira esparso;
    // a contramelodia de flauta grave só entra na seção B. Ritmo de semínimas, contorno em arco, poucos saltos.
    {
      id: "dog1", animal: "dog", place: "Quintal", key: "C", mode: "major", bpm: 92, beats: 4, swing: 0, bars: 32, form: "AABA",
      prog: { A: "I vi IV V", B: "IV I II V" },
      motif: { seed: 61017, bars: 2, contour: "arch", leaps: 0.2, rests: 0.05, density: 0.3, rhythm: ["x-x-x-x-", "x-x-x---"] },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.75 },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.5 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.7 },
        perc: { kit: "woodblock", pattern: "sparse", vel: 0.4, from: 0.25 },
      },
      intensity: 0.4, gain: 1.25,
    },
    // 2 Campo: céu aberto, passo largo. Ré mixolídio, 96 bpm, ABAB (80 s), balanço leve. Cordas beliscadas (violão) com baixo caminhante, bumbo macio e chocalho
    // marcando os tempos 2 e 4 ("boom-chá"); um descante de flauta aguda aparece na seção B. Ritmo sincopado de violão (3+3+2).
    {
      id: "dog2", animal: "dog", place: "Campo", key: "D", mode: "mixolydian", bpm: 96, beats: 4, swing: 0.12, bars: 32, form: "ABAB",
      prog: { A: "I VII IV I", B: "IV VI VII I" },
      motif: { seed: 52139, bars: 2, contour: "wave", leaps: 0.45, rests: 0.15, density: 0.5, rhythm: ["x--x--x-", "x-x-xx--"] },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 5, vel: 0.45, from: 0.6, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.75 },
        perc: { kit: ["softkick", "shaker"], pattern: "backbeat", vel: 0.5, from: 0.25 },
      },
      intensity: 0.5, gain: 1.07,
    },
    // 3 Casa: a valsa da sala de estar. Fá maior em 3/4, 100 bpm, AABA (58 s). Celesta e marimba se revezam no motivo (uma frase cada), baixo de valsa
    // ("uum-pá-pá"), órgão suave de fundo e escovas leves; contramelodia grave de flauta na seção B. Ritmo de semínima, colcheias e dois pulsos pontuados.
    {
      id: "dog3", animal: "dog", place: "Casa", key: "F", mode: "major", bpm: 100, beats: 3, swing: 0, bars: 32, form: "AABA",
      prog: { A: "I vi IV V", B: "II V I VI" },
      motif: { seed: 33071, bars: 2, contour: "arch", leaps: 0.3, rests: 0.15, density: 0.45, rhythm: ["x-x-xx", "x--x--"] },
      voices: {
        lead: { inst: "celesta", oct: 4, vel: 0.75, rotate: [{ inst: "celesta" }, { inst: "marimba" }] },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.6 },
        bass: { inst: "bass", pattern: "waltz", oct: 2, vel: 0.65 },
        pad: { inst: "organ", oct: 3, vel: 0.35, from: 0.35 },
        perc: { kit: "brush", pattern: "waltz", vel: 0.4, from: 0.3 },
      },
      intensity: 0.5, gain: 1.15,
    },
    // 4 Rua do bairro: marcha de passeio. Si bemol maior, 104 bpm, AABC (74 s). Xilofone em ritmo pontuado de marcha, baixo de raiz e quinta, bumbo macio e bloco
    // de madeira nos tempos; a flauta de contramelodia entra nas seções B e C. O motivo salta (contorno saltitante, saltos médios).
    {
      id: "dog4", animal: "dog", place: "Rua do bairro", key: "Bb", mode: "major", bpm: 104, beats: 4, swing: 0, bars: 32, form: "AABC",
      prog: { A: "I IV V I", B: "VI IV II V", C: "IV V I I" },
      motif: { seed: 74243, bars: 2, contour: "hop", leaps: 0.5, rests: 0.1, density: 0.55, rhythm: ["x--xx-x-", "xx-x-x--"] },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.8 },
        counter: { inst: "flute", oct: 4, vel: 0.5, from: 0.65 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.8 },
        perc: { kit: ["softkick", "woodblock"], pattern: "steady", vel: 0.6, from: 0.25 },
      },
      intensity: 0.55, gain: 1,
    },
    // 5 Condomínio: calçadão e jardins, balanço de tarde. Sol lídio, 107 bpm, ABAC (72 s), balanço médio (0,3). Flauta e marimba se revezam no motivo sincopado, contrabaixo
    // caminhante, escova em "ding, ding-a-ding" e celesta aguda de descante nas seções B e C.
    {
      id: "dog5", animal: "dog", place: "Condomínio", key: "G", mode: "lydian", bpm: 107, beats: 4, swing: 0.3, bars: 32, form: "ABAC",
      prog: { A: "I II vi V", B: "III vi II V", C: "I III vi II" },
      motif: { seed: 25301, bars: 2, contour: "wave", leaps: 0.55, rests: 0.3, density: 0.45, rhythm: ["x--x-x--", "x-x---x-"] },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.8, rotate: [{ inst: "flute" }, { inst: "marimba" }] },
        counter: { inst: "celesta", oct: 5, vel: 0.4, from: 0.62, above: true },
        bass: { inst: "contrabass", pattern: "walk", oct: 2, vel: 0.75 },
        perc: { kit: "brush", pattern: "brush2", vel: 0.45, from: 0.25 },
      },
      intensity: 0.55, gain: 1.07,
    },
    // 6 Praça: encontro de cachorros, giga em 6/8. Lá maior, 111 bpm (pulso de semínima pontuada), 48 compassos em ABACAB (52 s). Harpa e xilofone se revezam, baixo de raiz e quinta
    // em dois pulsos, polca de bumbo e bloco; um arpejo de cordas beliscadas entra só na seção C (a mais cheia).
    {
      id: "dog6", animal: "dog", place: "Praça", key: "A", mode: "major", bpm: 111, beats: 6, swing: 0, bars: 48, form: "ABACAB",
      prog: { A: "I V vi IV", B: "IV I V I", C: "VI IV I V" },
      motif: { seed: 86117, bars: 2, contour: "hop", leaps: 0.5, rests: 0.1, density: 0.6, rhythm: ["x-xx-x", "x--x--"] },
      voices: {
        lead: { inst: "harp", oct: 4, vel: 0.8, rotate: [{ inst: "harp" }, { inst: "xylo" }] },
        counter: { inst: "flute", oct: 3, vel: 0.45, from: 0.65 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.75 },
        arp: { inst: "pluck", rate: 3, shape: "up", oct: 4, vel: 0.45, from: 0.78 },
        perc: { kit: ["softkick", "woodblock"], pattern: "polka", vel: 0.5, from: 0.25 },
      },
      intensity: 0.55, gain: 0.87,
    },
    // 7 Parque canino: correria na grama. Mi mixolídio, 114 bpm, AABA (67 s), balanço leve. Marimba e cordas beliscadas se revezam, motivo cheio de saltos, baixo em
    // tresillo (raiz, oitava, quinta), prato leve em colcheias de balanço e arpejo "alberti" de cordas beliscadas a partir da repetição da seção A.
    {
      id: "dog7", animal: "dog", place: "Parque canino", key: "E", mode: "mixolydian", bpm: 114, beats: 4, swing: 0.15, bars: 32, form: "AABA",
      prog: { A: "I VII IV I", B: "IV VII I I" },
      motif: { seed: 17333, bars: 2, contour: "hop", leaps: 0.65, rests: 0.1, density: 0.75, rhythm: ["xx-xx-x-", "x-xx-xx-"] },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8, rotate: [{ inst: "marimba" }, { inst: "pluck" }] },
        counter: { inst: "flute", oct: 5, vel: 0.45, from: 0.7, above: true },
        bass: { inst: "bass", pattern: "sync", oct: 2, vel: 0.8 },
        arp: { inst: "pluck", rate: 2, shape: "alberti", oct: 4, vel: 0.45, from: 0.55 },
        perc: { kit: ["softkick", "hat"], pattern: "shuffle", vel: 0.45, from: 0.3 },
      },
      intensity: 0.6, gain: 0.99,
    },
    // 8 Feira: barracas e pregões, polca. Mi bemol maior, 118 bpm, rondó ABACA em 40 compassos (81 s). Órgão suave e cordas beliscadas se revezam (acordeão e violão de feira),
    // baixo de raiz e quinta "uum-pá", polca de bumbo e bloco de madeira, marimba grave de contramelodia.
    {
      id: "dog8", animal: "dog", place: "Feira", key: "Eb", mode: "major", bpm: 118, beats: 4, swing: 0.1, bars: 40, form: "ABACA",
      prog: { A: "I IV I V", B: "VI II V I", C: "IV I V I" },
      motif: { seed: 48871, bars: 2, contour: "arch", leaps: 0.35, rests: 0.1, density: 0.65, rhythm: ["x-xxx-xx", "x-x-x---"] },
      voices: {
        lead: { inst: "organ", oct: 4, vel: 0.65, rotate: [{ inst: "organ" }, { inst: "pluck", vel: 0.8 }] },
        counter: { inst: "marimba", oct: 3, vel: 0.45, from: 0.62 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.85 },
        perc: { kit: ["softkick", "woodblock"], pattern: "polka", vel: 0.55, from: 0.25 },
      },
      intensity: 0.55, gain: 0.93,
    },
    // 9 Praia: leve e ensolarada. Ré pentatônico maior, 110 bpm, ABAB (70 s), balanço leve. Xilofone e marimba (som de panela de aço), baixo senoidal só nos contratempos,
    // bumbo macio e chocalho em contratempo, arpejo de violãozinho (sobe e desce) a partir da repetição e uma brisa de vento bem baixa.
    {
      id: "dog9", animal: "dog", place: "Praia", key: "D", mode: "pentMajor", bpm: 110, beats: 4, swing: 0.2, bars: 32, form: "ABAB",
      prog: { A: "I V II IV", B: "IV II V I" },
      motif: { seed: 93191, bars: 2, contour: "wave", leaps: 0.4, rests: 0.25, density: 0.5, rhythm: ["x--x-xx-", "x-x--x--"] },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.7, rotate: [{ inst: "xylo" }, { inst: "marimba", vel: 0.8 }] },
        counter: { inst: "bell", oct: 5, vel: 0.35, from: 0.6, above: true },
        bass: { inst: "bassSine", pattern: "offbeat", oct: 2, vel: 0.65 },
        arp: { inst: "pluck", rate: 2, shape: "updown", oct: 4, vel: 0.4, from: 0.5 },
        perc: { kit: ["softkick", "shaker"], pattern: "offbeat", vel: 0.45, from: 0.25 },
        ambience: { kind: "wind", vel: 0.3 },
      },
      intensity: 0.45, gain: 1.28,
    },
    // 10 Central da carrocinha: concreto, grades e perigo. Lá menor, 124 bpm, AABA (62 s). Serrilha grave de solo (revezando com xilofone), baixo sustentado, batida de
    // coração no bumbo, cordas de fundo e arpejo grave de cordas beliscadas que desce; contorno descendente, saltos médios, poucas pausas.
    {
      id: "dog10", animal: "dog", place: "Central da carrocinha", key: "A", mode: "minor", bpm: 124, beats: 4, swing: 0, bars: 32, form: "AABA",
      prog: { A: "I VI VII I", B: "IV VI VII V" },
      motif: { seed: 10409, bars: 2, contour: "fall", leaps: 0.35, rests: 0.1, density: 0.6, rhythm: ["x-x-xxxx", "x-xx-x--"] },
      voices: {
        lead: { inst: "bassSaw", oct: 3, vel: 0.6, rotate: [{ inst: "bassSaw", oct: 3 }, { inst: "xylo", oct: 4, vel: 0.75 }] },
        bass: { inst: "bass", pattern: "pedal", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.45, from: 0.35 },
        arp: { inst: "pluck", rate: 2, shape: "down", oct: 3, vel: 0.4, from: 0.55 },
        perc: { kit: "softkick", pattern: "heartbeat", vel: 0.7, from: 0.25 },
      },
      intensity: 0.6, gain: 0.9,
    },
    // 11 Beco dos gatos: esgueirar-se com cuidado. Mi frígio, 130 bpm, ABAB (59 s). Contrabaixo em oitava grave de solo (revezando com cordas beliscadas), baixo em pizzicato,
    // bloco de madeira em colcheias seguidas, descante de celesta; motivo com pausas (respirações) e contorno que desce.
    {
      id: "dog11", animal: "dog", place: "Beco dos gatos", key: "E", mode: "phrygian", bpm: 130, beats: 4, swing: 0.1, bars: 32, form: "ABAB",
      prog: { A: "I II I VII", B: "IV VII II I" },
      motif: { seed: 11587, bars: 2, contour: "fall", leaps: 0.3, rests: 0.35, density: 0.4, rhythm: ["x.x.xx.x", "x--x-.x-"] },
      voices: {
        lead: { inst: "contrabass", oct: 3, vel: 0.8, rotate: [{ inst: "contrabass", oct: 3 }, { inst: "pluck", oct: 4, vel: 0.75 }] },
        counter: { inst: "celesta", oct: 5, vel: 0.35, from: 0.7, above: true },
        bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.8 },
        perc: { kit: ["softkick", "woodblock"], pattern: "driving", vel: 0.5, from: 0.3 },
      },
      intensity: 0.6, gain: 1.02,
    },
    // 12 Pet shop: prateleiras coloridas e brinquedos. Dó lídio, 120 bpm, AABC (64 s), balanço médio (0,28). Marimba com campainhas (sino) no revezamento, baixo caminhante,
    // pratinho de escova, descante de flauta e arpejo de celesta que sobe e brilha nas seções B e C. Contorno ascendente, muitos saltos.
    {
      id: "dog12", animal: "dog", place: "Pet shop", key: "C", mode: "lydian", bpm: 120, beats: 4, swing: 0.28, bars: 32, form: "AABC",
      prog: { A: "I II I V", B: "VI III II V", C: "II V III I" },
      motif: { seed: 12641, bars: 2, contour: "rise", leaps: 0.5, rests: 0.15, density: 0.6, rhythm: ["xx-x-xx-", "x-xx-x--"] },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8, rotate: [{ inst: "marimba" }, { inst: "bell", vel: 0.6 }] },
        counter: { inst: "flute", oct: 5, vel: 0.4, from: 0.65, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.75 },
        arp: { inst: "celesta", rate: 2, shape: "up", oct: 5, vel: 0.35, from: 0.7 },
        perc: { kit: "hat", pattern: "brush2", vel: 0.45, from: 0.25 },
      },
      intensity: 0.55, gain: 1.04,
    },
    // 13 Fazenda: dança de celeiro. Sol mixolídio, 126 bpm, AABB (61 s), como uma música de dança dupla. Cordas beliscadas (banjo) com marimba, baixo de raiz e quinta, bumbo e bloco
    // nos tempos 2 e 4, contramelodia de flauta; ritmo de galope. O contorno sobe e desce em arco.
    {
      id: "dog13", animal: "dog", place: "Fazenda", key: "G", mode: "mixolydian", bpm: 126, beats: 4, swing: 0.15, bars: 32, form: "AABB",
      prog: { A: "I IV I VII", B: "VI VII I I" },
      motif: { seed: 13709, bars: 2, contour: "arch", leaps: 0.4, rests: 0.1, density: 0.7, rhythm: ["xxx-xx-x", "x-xxx---"] },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8, rotate: [{ inst: "pluck" }, { inst: "marimba", vel: 0.75 }] },
        counter: { inst: "flute", oct: 4, vel: 0.45, from: 0.65 },
        bass: { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.85 },
        perc: { kit: ["softkick", "woodblock"], pattern: "backbeat", vel: 0.55, from: 0.25 },
      },
      intensity: 0.55, gain: 0.9,
    },
    // 14 Bosque: sombras entre as árvores, passo contido. Si dórico, 122 bpm, ABAC (63 s). Flauta e cordas beliscadas se revezam em notas mais longas, baixo sustentado e senoidal,
    // cordas de fundo, chocalho de folhas, arpejo lento de harpa e vento bem baixo. Contorno que desce, pausas.
    {
      id: "dog14", animal: "dog", place: "Bosque", key: "B", mode: "dorian", bpm: 122, beats: 4, swing: 0.05, bars: 32, form: "ABAC",
      prog: { A: "I IV I VII", B: "IV I VII I", C: "III IV I VII" },
      motif: { seed: 14783, bars: 2, contour: "fall", leaps: 0.3, rests: 0.3, density: 0.4, rhythm: ["x--x-xx-", "x-x-x---"] },
      voices: {
        lead: { inst: "flute", oct: 4, vel: 0.8, rotate: [{ inst: "flute" }, { inst: "pluck", vel: 0.75 }] },
        bass: { inst: "bassSine", pattern: "pedal", oct: 2, vel: 0.7 },
        pad: { inst: "strings", oct: 3, vel: 0.4, from: 0.35 },
        arp: { inst: "harp", rate: 1, shape: "updown", oct: 4, vel: 0.4, from: 0.5 },
        perc: { kit: ["softkick", "shaker"], pattern: "steady", vel: 0.4, from: 0.3 },
        ambience: { kind: "wind", vel: 0.3 },
      },
      intensity: 0.5, gain: 0.88,
    },
    // 15 Lago e docas: barcarola, balanço de barco. Fá sustenido pentatônico menor em 6/8, 128 bpm, rondó ABACABA em 56 compassos (53 s). Cordas beliscadas e flauta, baixo
    // senoidal de valsa (raiz e quinta), batida esparsa, arpejo de harpa que sobe e desce como ondas, sino de descante e gotas de água.
    {
      id: "dog15", animal: "dog", place: "Lago e docas", key: "F#", mode: "pentMinor", bpm: 128, beats: 6, swing: 0, bars: 56, form: "ABACABA",
      prog: { A: "I IV V I", B: "II V III I", C: "IV II V I" },
      motif: { seed: 15859, bars: 2, contour: "wave", leaps: 0.35, rests: 0.2, density: 0.5, rhythm: ["x--xx-", "x--x--"] },
      voices: {
        lead: { inst: "pluck", oct: 4, vel: 0.8, rotate: [{ inst: "pluck" }, { inst: "flute", vel: 0.7 }] },
        counter: { inst: "bell", oct: 5, vel: 0.35, from: 0.7, above: true },
        bass: { inst: "bassSine", pattern: "waltz", oct: 2, vel: 0.65 },
        arp: { inst: "harp", rate: 3, shape: "updown", oct: 4, vel: 0.4, from: 0.5 },
        perc: { kit: ["softkick", "woodblock"], pattern: "sparse", vel: 0.35, from: 0.3 },
        ambience: { kind: "water", vel: 0.35 },
      },
      intensity: 0.5, gain: 0.96,
    },
    // 16 Mercadão: barracas lotadas, calor e pressa. Lá bemol maior, 132 bpm, AABC (58 s). Xilofone com marimba, baixo caminhante, percussão em colcheias seguidas, arpejo "alberti" de cordas
    // beliscadas a partir da repetição e descante de flauta nas seções B e C. Contorno ascendente, ritmo bem cheio.
    {
      id: "dog16", animal: "dog", place: "Mercadão", key: "Ab", mode: "major", bpm: 132, beats: 4, swing: 0.08, bars: 32, form: "AABC",
      prog: { A: "I V vi IV", B: "II V I VI", C: "IV I V I" },
      motif: { seed: 16931, bars: 2, contour: "rise", leaps: 0.45, rests: 0.05, density: 0.8, rhythm: ["x-x-xxx-", "xx-xx-x-"] },
      voices: {
        lead: { inst: "xylo", oct: 4, vel: 0.8, rotate: [{ inst: "xylo" }, { inst: "marimba", vel: 0.85 }] },
        counter: { inst: "flute", oct: 5, vel: 0.45, from: 0.65, above: true },
        bass: { inst: "bass", pattern: "walk", oct: 2, vel: 0.8 },
        arp: { inst: "pluck", rate: 2, shape: "alberti", oct: 4, vel: 0.45, from: 0.6 },
        perc: { kit: ["softkick", "woodblock"], pattern: "driving", vel: 0.55, from: 0.25 },
      },
      intensity: 0.6, gain: 0.85,
    },
    // 17 Estacionamento: asfalto, buzinas e cones, ritmo travado. Fá mixolídio, 136 bpm, ABAC (56,5 s). Marimba seca, baixo de serrilha em tresillo, bumbo macio com prato leve nos contratempos,
    // órgão grave de contramelodia (como buzina) e arpejo que desce. Ritmo quebrado, contorno que desce.
    {
      id: "dog17", animal: "dog", place: "Estacionamento", key: "F", mode: "mixolydian", bpm: 136, beats: 4, swing: 0, bars: 32, form: "ABAC",
      prog: { A: "I VII VI VII", B: "IV VII I I", C: "VI VII IV I" },
      motif: { seed: 17047, bars: 2, contour: "fall", leaps: 0.5, rests: 0.2, density: 0.55, rhythm: ["x-xx-x-x", "x--x-xx-"] },
      voices: {
        lead: { inst: "marimba", oct: 4, vel: 0.8 },
        counter: { inst: "organ", oct: 3, vel: 0.4, from: 0.68 },
        bass: { inst: "bassSaw", pattern: "sync", oct: 2, vel: 0.75 },
        arp: { inst: "pluck", rate: 2, shape: "down", oct: 4, vel: 0.4, from: 0.6 },
        perc: { kit: ["softkick", "hat"], pattern: "offbeat", vel: 0.5, from: 0.25 },
      },
      intensity: 0.6, gain: 0.96,
    },
    // 18 Telhados (noite): valsa veloz e sombria. Dó sustenido menor em 3/4, 140 bpm, 48 compassos em ABABCA (62 s). Celesta e harpa no solo, contrabaixo em pizzicato, batida de valsa
    // de bumbo e bloco, cordas de fundo, flauta grave de contramelodia e grilos baixos. Pausas no motivo; sem arpejo, para a textura não ficar carregada.
    {
      id: "dog18", animal: "dog", place: "Telhados", key: "C#", mode: "minor", bpm: 140, beats: 3, swing: 0, bars: 48, form: "ABABCA",
      prog: { A: "I IV VII V", B: "VI VII I V", C: "IV V I I" },
      motif: { seed: 18119, bars: 2, contour: "wave", leaps: 0.45, rests: 0.3, density: 0.45, rhythm: ["x-xx-x", "x-x---"] },
      voices: {
        lead: { inst: "celesta", oct: 4, vel: 0.8, rotate: [{ inst: "celesta" }, { inst: "harp", vel: 0.7 }] },
        counter: { inst: "flute", oct: 3, vel: 0.4, from: 0.65 },
        bass: { inst: "contrabass", pattern: "pizz", oct: 2, vel: 0.8 },
        pad: { inst: "strings", oct: 3, vel: 0.4, from: 0.35 },
        perc: { kit: ["softkick", "woodblock"], pattern: "waltz", vel: 0.45, from: 0.25 },
        ambience: { kind: "crickets", vel: 0.3 },
      },
      intensity: 0.55, gain: 0.93,
    },
    // 19 Estação de trem: o trem que chega, balanço de blues. Sol blues, 144 bpm, AABA (53 s), balanço forte (0,45). Órgão no solo (revezando com flauta), baixo caminhante de contrabaixo,
    // prato leve em colcheias de balanço marcando o "tchuc-tchuc" do trem e bumbo macio nos tempos. Ritmo em síncopa.
    {
      id: "dog19", animal: "dog", place: "Estação de trem", key: "G", mode: "blues", bpm: 144, beats: 4, swing: 0.45, bars: 32, form: "AABA",
      prog: { A: "I III I V", B: "III I V I" },
      motif: { seed: 19207, bars: 2, contour: "wave", leaps: 0.4, rests: 0.15, density: 0.6, rhythm: ["x--xx-x-", "x-x--xx-"] },
      voices: {
        lead: { inst: "organ", oct: 4, vel: 0.65, rotate: [{ inst: "organ" }, { inst: "flute", vel: 0.8 }] },
        bass: { inst: "contrabass", pattern: "walk", oct: 2, vel: 0.8 },
        perc: { kit: ["softkick", "hat"], pattern: "shuffle", vel: 0.5, from: 0.25 },
      },
      intensity: 0.6, gain: 1.01,
    },
    // 20 Fortaleza da carrocinha: o final grande. Ré menor harmônico, 148 bpm, 48 compassos em ABACBC (78 s). Cordas no solo (revezando com marimba e órgão), baixo de serrilha em tresillo,
    // percussão em colcheias, cordas de fundo e arpejo "alberti" de xilofone (sem contramelodia, para as vozes caberem no limite de 14); as camadas entram cedo e as seções B e C são as mais cheias. Contorno ascendente, saltos largos.
    {
      id: "dog20", animal: "dog", place: "Fortaleza da carrocinha", key: "D", mode: "harmMinor", bpm: 148, beats: 4, swing: 0, bars: 48, form: "ABACBC",
      prog: { A: "I IV V I", B: "VI IV V I", C: "IV VI V I" },
      motif: { seed: 20287, bars: 2, contour: "rise", leaps: 0.6, rests: 0.05, density: 0.75, rhythm: ["x-xxx-xx", "x--xx-x-"] },
      voices: {
        lead: { inst: "strings", oct: 4, vel: 0.75, rotate: [{ inst: "strings" }, { inst: "marimba", vel: 0.85 }, { inst: "organ", vel: 0.6 }] },
        bass: { inst: "bassSaw", pattern: "sync", oct: 2, vel: 0.85 },
        pad: { inst: "strings", oct: 3, vel: 0.5, from: 0.35 },
        arp: { inst: "xylo", rate: 2, shape: "alberti", oct: 4, vel: 0.45, from: 0.5 },
        perc: { kit: ["softkick", "woodblock"], pattern: "driving", vel: 0.65, from: 0.25 },
      },
      intensity: 0.7, gain: 0.78,
    },
  ];

  const result = M.register(RECIPES);
  if (typeof module === "object" && module.exports) module.exports = { recipes: RECIPES, result };
})(typeof window !== "undefined" ? window : globalThis);
