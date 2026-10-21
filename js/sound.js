// Efeitos sonoros do jogo, todos SINTETIZADOS na hora com a Web Audio API (osciladores, envelopes e ruído filtrado).
// Não existe nenhum arquivo de áudio, nenhuma biblioteca e nenhuma rede. Funciona no navegador (window.Sound) e no Node (testes).
//
// Uso no jogo:
//   const som = Sound.create({ storage: window.localStorage });   // storage é opcional: guarda mudo e volume em "cachorrinho.som.v1"
//   som.bindUnlock();                                              // o navegador só libera o som depois de um gesto do jogador
//   som.play("bone");                                              // true se tocou; nunca lança erro
//   som.play("transform", { delay: 0.3 });                         // atraso opcional (s) no relógio do áudio, para encadear sons
//   som.events                                                     // últimos 200 pedidos { name, t (ms), played }: gancho para testes
//
// Cada som é uma função pura (Sound.render) que agenda osciladores num BaseAudioContext qualquer (AudioContext ou
// OfflineAudioContext), por isso os testes podem renderizar tudo offline e conferir pico, duração, cliques etc.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Sound = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const KEY = "cachorrinho.som.v1";   // preferência guardada: {"m":0|1 (mudo),"v":volume 0..1}
  const NAMES = Object.freeze(["ration", "bone", "capture", "lifelost", "transform", "postman", "levelup", "life", "gameover", "pick", "bark1", "bark2", "bark3", "meow"]);
  // Duração máxima de cada som, em segundos (o som audível nunca passa disso).
  const MAX_SECONDS = Object.freeze({ ration: 0.15, bone: 0.5, capture: 0.6, lifelost: 0.7, transform: 0.5, postman: 0.35, levelup: 1.3, life: 0.6, gameover: 1.2, pick: 0.2, bark1: 0.4, bark2: 0.5, bark3: 0.8, meow: 0.45 });
  const DEFAULT_VOLUME = 0.35;        // ganho mestre padrão (baixo e agradável)
  const MIN_GAP_MS = 60;              // o mesmo som não repete antes disso
  const MAX_VOICES = 8;               // no máximo 8 sons ao mesmo tempo
  const MAX_EVENTS = 200;             // pedidos lembrados em `events`
  const LEAD = 0.01;                  // s de folga ao agendar (o ataque nunca fica no passado)
  const RESUME_GRACE_MS = 400;        // depois de pedir `resume()`, o motor liga em alguns milissegundos: sons pedidos nesse intervalo ficam na fila
  const FLOOR = 1e-4;                 // piso das rampas exponenciais (rampa exponencial não chega a zero)
  const NOISE_SECONDS = 1;

  // ---------- Utilidades ----------
  const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // "C#5" -> frequência em Hz (A4 = 440)
  function hz(note) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    const n = SEMITONE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) - 4) * 12 - 9;
    return 440 * Math.pow(2, n / 12);
  }
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  // Ruído branco de 1 s, sempre igual (gerador com semente fixa): o som renderizado é reproduzível. Um por contexto.
  const noiseCache = typeof WeakMap === "function" ? new WeakMap() : null;
  function noiseBuffer(ctx) {
    let buf = noiseCache && noiseCache.get(ctx);
    if (buf) return buf;
    const rate = ctx.sampleRate || 44100, len = Math.round(rate * NOISE_SECONDS);
    buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let s = 0x2f6e2b1; // mulberry32
    for (let i = 0; i < len; i++) {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      data[i] = ((t ^ (t >>> 14)) >>> 0) / 2147483648 - 1;
    }
    if (noiseCache) noiseCache.set(ctx, buf);
    return buf;
  }

  // Onda de pulso (ciclo de trabalho `duty`, ex.: 0,25 = som de videogame antigo) por série de Fourier. Criar a onda é caro (o navegador monta
  // tabelas), então ela é feita uma vez por contexto e por ciclo e reaproveitada por todas as notas.
  const waveCache = typeof WeakMap === "function" ? new WeakMap() : null;
  function pulseWave(ctx, duty) {
    let byDuty = waveCache && waveCache.get(ctx);
    if (!byDuty) { byDuty = new Map(); if (waveCache) waveCache.set(ctx, byDuty); }
    let wave = byDuty.get(duty);
    if (wave) return wave;
    const N = 48, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    for (let n = 1; n <= N; n++) {
      re[n] = (2 / (n * Math.PI)) * Math.sin(2 * Math.PI * n * duty);
      im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(2 * Math.PI * n * duty));
    }
    wave = ctx.createPeriodicWave(re, im);
    byDuty.set(duty, wave);
    return wave;
  }
  function setWave(ctx, osc, type, duty) {
    if (type === "pulse") {
      try { osc.setPeriodicWave(pulseWave(ctx, duty || 0.25)); return; } catch { type = "square"; }
    }
    osc.type = type;
  }

  // Envelope SEM CLIQUE: começa em 0, sobe em `a` s até `peak`, cai exponencialmente até `peak * sus` (sus = 1 mantém a nota; perto de 0 é uma "pancada"
  // que morre) e desce linearmente a 0 nos últimos `r` s. Todo ganho de som começa e termina em 0.
  function envelope(param, t, dur, peak, a, r, sus) {
    const end = t + dur, hold = Math.max(t + a, end - r);
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(Math.max(peak * sus, peak * FLOOR), hold);
    param.linearRampToValueAtTime(0, end);
  }

  // LFO (vibrato/tremolo): oscilador lento que soma `depth` ao parâmetro `param`.
  function lfo(ctx, rate, depth, param, t, dur) {
    const l = ctx.createOscillator(), d = ctx.createGain();
    l.type = "sine";
    l.frequency.setValueAtTime(rate, t);
    d.gain.setValueAtTime(depth, t);
    l.connect(d); d.connect(param);
    l.start(t); l.stop(t + dur + 0.02);
  }

  // Uma cena é um som em construção: `tone`/`noise` agendam as vozes (tempos relativos ao começo do som) e `end` guarda quando a última termina.
  function scene(ctx, out, t0) {
    const sc = { end: 0 };

    // Nota: oscilador -> (filtro passa-baixa) -> envelope -> (tremolo) -> saída.
    // o: { at, dur, f, f2 (glissando exponencial até f2), type ("sine"|"triangle"|"square"|"sawtooth"|"pulse"), duty, gain, a, r, sus,
    //      lp/lp2/q (corte do passa-baixa, para onde varre e ressonância), vib: [Hz, profundidade em Hz], trem: [Hz, profundidade 0..1] }
    sc.tone = (o) => {
      const t = t0 + o.at, dur = o.dur, a = Math.min(o.a ?? 0.01, dur * 0.4), r = Math.min(o.r ?? 0.02, dur * 0.5);
      const osc = ctx.createOscillator();
      setWave(ctx, osc, o.type || "sine", o.duty);
      osc.frequency.setValueAtTime(o.f, t);
      if (o.f2 && o.f2 !== o.f) osc.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      if (o.vib) lfo(ctx, o.vib[0], o.vib[1], osc.frequency, t, dur);
      let node = osc;
      if (o.lp) {
        const f = ctx.createBiquadFilter();
        f.type = "lowpass"; f.Q.value = o.q ?? 0.7;
        f.frequency.setValueAtTime(o.lp, t);
        if (o.lp2) f.frequency.exponentialRampToValueAtTime(o.lp2, t + dur);
        node.connect(f); node = f;
      }
      const g = ctx.createGain();
      envelope(g.gain, t, dur, o.gain ?? 0.5, a, r, o.sus ?? 0.05);
      node.connect(g); node = g;
      if (o.trem) {
        const m = ctx.createGain();
        m.gain.setValueAtTime(1 - o.trem[1] / 2, t);
        lfo(ctx, o.trem[0], o.trem[1] / 2, m.gain, t, dur);
        node.connect(m); node = m;
      }
      node.connect(out);
      osc.start(t); osc.stop(t + dur + 0.02);
      sc.end = Math.max(sc.end, o.at + dur);
    };

    // Ruído filtrado: o: { at, dur, type ("bandpass"|"lowpass"|"highpass"), f, f2 (varredura), q, gain, a, r, sus, off (onde começa no ruído, em s) }
    sc.noise = (o) => {
      const t = t0 + o.at, dur = o.dur, a = Math.min(o.a ?? 0.01, dur * 0.4), r = Math.min(o.r ?? 0.02, dur * 0.5);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      src.buffer = noiseBuffer(ctx);
      f.type = o.type || "bandpass"; f.Q.value = o.q ?? 1;
      f.frequency.setValueAtTime(o.f, t);
      if (o.f2 && o.f2 !== o.f) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
      envelope(g.gain, t, dur, o.gain ?? 0.5, a, r, o.sus ?? 0.05);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(t, o.off ?? 0, dur + 0.02);
      sc.end = Math.max(sc.end, o.at + dur);
    };
    return sc;
  }

  // ---------- Os sons ----------
  // Cada função desenha um som (tempos em segundos, relativos ao começo) e os ajustes de volume ficam em LEVEL.
  const DEFS = {
    // Pegar a ração: "crec" alegre e curto. Dois blips triangulares ascendentes (sol -> dó) + estalo de ruído em cada um.
    ration(s) {
      s.noise({ at: 0, dur: 0.04, type: "bandpass", f: 3400, q: 0.9, gain: 0.5, a: 0.01, r: 0.015, sus: 0.05, off: 0.11 });
      s.tone({ at: 0, dur: 0.065, f: hz("G5"), type: "triangle", gain: 0.8, a: 0.01, sus: 0.2 });
      s.noise({ at: 0.055, dur: 0.035, type: "bandpass", f: 4200, q: 0.9, gain: 0.35, a: 0.01, r: 0.015, sus: 0.05, off: 0.31 });
      s.tone({ at: 0.055, dur: 0.08, f: hz("C6"), type: "triangle", gain: 0.8, a: 0.01, r: 0.03, sus: 0.1 });
    },

    // Pegar o osso: arpejo ascendente de "poder" (dó mi sol dó), quadrada suavizada + triangular.
    bone(s) {
      [["C5", 0], ["E5", 0.07], ["G5", 0.14], ["C6", 0.21]].forEach(([n, at], i) => {
        const last = i === 3, dur = last ? 0.19 : 0.09, f = hz(n);
        s.tone({ at, dur, f, type: "square", lp: 3000, gain: 0.3, a: 0.01, r: last ? 0.06 : 0.02, sus: last ? 0.15 : 0.6 });
        s.tone({ at, dur, f, type: "triangle", gain: 0.35, a: 0.01, r: last ? 0.06 : 0.02, sus: last ? 0.15 : 0.6 });
      });
    },

    // Ser capturado: "rede" (varredura de ruído que cai) + ganido do cachorrinho (dente de serra 900 -> 450 Hz com vibrato) + baque da rede.
    capture(s) {
      s.noise({ at: 0, dur: 0.36, type: "bandpass", f: 4200, f2: 500, q: 1.8, gain: 2.2, a: 0.03, r: 0.08, sus: 0.5, off: 0.2 });
      s.tone({ at: 0.1, dur: 0.32, f: 900, f2: 450, type: "sawtooth", lp: 2600, lp2: 1500, vib: [26, 40], gain: 0.45, a: 0.012, r: 0.06, sus: 0.35 });
      s.tone({ at: 0.38, dur: 0.16, f: 140, f2: 60, type: "sine", gain: 0.5, a: 0.01, r: 0.04, sus: 0.02 });
    },

    // Perder uma vida: três notas descendentes tristes (sol mi dó), triângulo, cada uma "caindo" um pouco, com leve eco.
    lifelost(s) {
      [["G4", 0, 0.19], ["E4", 0.17, 0.19], ["C4", 0.34, 0.24]].forEach(([n, at, dur]) => {
        const f = hz(n);
        s.tone({ at, dur, f, f2: f * 0.97, type: "triangle", lp: 3500, gain: 0.45, a: 0.01, r: 0.05, sus: 0.3 });
        s.tone({ at, dur, f: f * 2, f2: f * 1.94, type: "sine", gain: 0.3, a: 0.01, r: 0.05, sus: 0.2 }); // brilho (a caixinha de celular não reproduz bem o grave)
        s.tone({ at: at + 0.11, dur: Math.min(dur, 0.2), f, f2: f * 0.97, type: "triangle", lp: 3500, gain: 0.17, a: 0.01, r: 0.05, sus: 0.3 }); // eco
      });
    },

    // O agente vira carteiro: transformação de desenho animado. Glissando senoidal de 300 a 1300 Hz com tremolo + dois pings agudos.
    transform(s) {
      s.tone({ at: 0, dur: 0.3, f: 300, f2: 1300, type: "sine", trem: [22, 0.6], gain: 0.5, a: 0.015, r: 0.05, sus: 0.8 });
      s.tone({ at: 0, dur: 0.3, f: 304, f2: 1310, type: "triangle", trem: [22, 0.6], gain: 0.18, a: 0.015, r: 0.05, sus: 0.8 });
      s.tone({ at: 0.28, dur: 0.1, f: hz("C7"), type: "sine", gain: 0.3, a: 0.01, sus: 0.03 });
      s.tone({ at: 0.34, dur: 0.13, f: hz("E7"), type: "sine", gain: 0.3, a: 0.01, sus: 0.03 });
    },

    // O cachorrinho pega o carteiro: "boing" (queda senoidal rápida) + moeda (ding duplo si -> mi).
    postman(s) {
      s.tone({ at: 0, dur: 0.1, f: 620, f2: 170, type: "sine", vib: [35, 25], gain: 0.6, a: 0.01, r: 0.03, sus: 0.3 });
      s.tone({ at: 0.09, dur: 0.08, f: hz("B5"), type: "sine", gain: 0.5, a: 0.01, sus: 0.1 });
      s.tone({ at: 0.09, dur: 0.08, f: hz("B5") * 2, type: "sine", gain: 0.12, a: 0.01, sus: 0.1 });
      s.tone({ at: 0.16, dur: 0.17, f: hz("E6"), type: "sine", gain: 0.5, a: 0.01, r: 0.05, sus: 0.04 });
      s.tone({ at: 0.16, dur: 0.17, f: hz("E6") * 2, type: "sine", gain: 0.12, a: 0.01, r: 0.05, sus: 0.04 });
    },

    // Passar de fase: fanfarra curta (dó mi sol dó mi), a última nota longa com acorde. Dente de serra "de metais" + uma oitava abaixo.
    levelup(s) {
      [["C5", 0], ["E5", 0.12], ["G5", 0.24], ["C6", 0.36]].forEach(([n, at]) => {
        const f = hz(n);
        s.tone({ at, dur: 0.14, f, type: "sawtooth", lp: 3200, gain: 0.28, a: 0.01, r: 0.03, sus: 0.6 });
        s.tone({ at, dur: 0.14, f: f / 2, type: "square", lp: 1800, gain: 0.08, a: 0.01, r: 0.03, sus: 0.6 });
      });
      [["E6", 0.3], ["C6", 0.2], ["G5", 0.2]].forEach(([n, gain]) => {
        s.tone({ at: 0.5, dur: 0.75, f: hz(n), type: "sawtooth", lp: 3200, vib: [6, 5], gain, a: 0.012, r: 0.2, sus: 0.35 });
      });
      s.tone({ at: 0.5, dur: 0.75, f: hz("E6") / 2, type: "square", lp: 1800, gain: 0.07, a: 0.012, r: 0.2, sus: 0.35 });
    },

    // Pegar uma vida nova: "1UP" (mi sol mi' dó' ré' sol'), onda de pulso de videogame antigo.
    life(s) {
      ["E5", "G5", "E6", "C6", "D6", "G6"].forEach((n, i) => {
        const last = i === 5;
        s.tone({ at: i * 0.075, dur: last ? 0.19 : 0.085, f: hz(n), type: "pulse", duty: 0.25, lp: 4500, gain: 0.35, a: 0.01, r: last ? 0.08 : 0.02, sus: last ? 0.1 : 0.6 });
      });
    },

    // Fim de jogo: quatro notas graves descendentes (lá fá ré lá) no estilo "wah-wah-wah-waaah": o filtro abre em cada nota e a última escorrega
    // para baixo, longa, com vibrato.
    gameover(s) {
      [["A3", 0, 0.26], ["F3", 0.28, 0.26], ["D3", 0.56, 0.26], ["A2", 0.84, 0.32]].forEach(([n, at, dur], i) => {
        const f = hz(n), last = i === 3, f2 = last ? f * 0.89 : f;
        s.tone({ at, dur, f, f2, type: "sawtooth", lp: last ? 1800 : 700, lp2: last ? 500 : 1800, q: 3, vib: last ? [5.5, 2] : undefined, gain: 0.5, a: 0.015, r: last ? 0.12 : 0.04, sus: last ? 0.2 : 0.5 });
        s.tone({ at, dur, f, f2, type: "triangle", gain: 0.12, a: 0.015, r: last ? 0.12 : 0.04, sus: last ? 0.2 : 0.5 });
      });
    },

    // Latido do cachorrinho ao completar a fase (0.15.3); o som muda com o tamanho dele.
    // Filhote: dois "ai-ai!" agudos e curtinhos (triangular subindo de 1250 para 1690 Hz, com vibrato e um sopro de ruído agudo).
    bark1(s) {
      [[0, 1250], [0.15, 1350]].forEach(([at, f]) => {
        s.tone({ at, dur: 0.11, f, f2: f * 1.35, type: "triangle", lp: 3600, vib: [28, 45], gain: 0.5, a: 0.008, r: 0.035, sus: 0.3 });
        s.tone({ at, dur: 0.11, f: f * 2, f2: f * 2.5, type: "sine", gain: 0.13, a: 0.008, r: 0.035, sus: 0.2 });
        s.noise({ at, dur: 0.045, type: "bandpass", f: 3400, q: 1.1, gain: 0.18, a: 0.006, r: 0.02, sus: 0.1, off: 0.4 });
      });
    },
    // Jovem: dois "uau!" médios (dente de serra de 540 caindo para 430 Hz, passa-baixa que fecha como a vogal, estalo de ruído no começo).
    bark2(s) {
      [[0, 540], [0.22, 500]].forEach(([at, f]) => {
        s.tone({ at, dur: 0.17, f, f2: f * 0.78, type: "sawtooth", lp: 2200, lp2: 800, q: 2.5, gain: 0.42, a: 0.01, r: 0.06, sus: 0.35 });
        s.tone({ at, dur: 0.17, f: f / 2, f2: f * 0.39, type: "triangle", gain: 0.22, a: 0.01, r: 0.06, sus: 0.3 });
        s.noise({ at, dur: 0.07, type: "bandpass", f: 1500, q: 0.9, gain: 0.25, a: 0.006, r: 0.03, sus: 0.1, off: 0.7 });
      });
    },
    // Adulto: "UÓ-UÓ!" grave e forte (dente de serra de 250 caindo para 135 Hz, quadrada uma oitava abaixo, ruído grave de peito).
    bark3(s) {
      [[0, 250, 1], [0.38, 230, 0.85]].forEach(([at, f, g]) => {
        s.tone({ at, dur: 0.27, f, f2: f * 0.55, type: "sawtooth", lp: 1300, lp2: 450, q: 3, gain: 0.5 * g, a: 0.012, r: 0.1, sus: 0.3 });
        s.tone({ at, dur: 0.27, f: f / 2, f2: f * 0.28, type: "square", lp: 500, gain: 0.2 * g, a: 0.012, r: 0.1, sus: 0.3 });
        s.noise({ at, dur: 0.11, type: "lowpass", f: 1700, f2: 600, q: 0.8, gain: 0.35 * g, a: 0.008, r: 0.05, sus: 0.1, off: 0.9 });
      });
    },

    // O gato nota o cachorrinho: "miau" curto. Dente de serra que sobe (520 -> 880 Hz) e desce (880 -> 480 Hz) por um passa-baixa que abre e fecha como a vogal "iau", com vibrato no fim.
    meow(s) {
      s.tone({ at: 0, dur: 0.15, f: 520, f2: 880, type: "sawtooth", lp: 900, lp2: 2600, q: 4, gain: 0.4, a: 0.02, r: 0.03, sus: 0.8 });
      s.tone({ at: 0.14, dur: 0.26, f: 880, f2: 480, type: "sawtooth", lp: 2600, lp2: 700, q: 4, vib: [18, 12], gain: 0.4, a: 0.02, r: 0.09, sus: 0.45 });
    },

    // Escolher um reforço no menu: "plim" senoidal curto.
    pick(s) {
      s.tone({ at: 0, dur: 0.18, f: hz("G6"), type: "sine", gain: 0.55, a: 0.01, r: 0.04, sus: 0.02 });
      s.tone({ at: 0, dur: 0.1, f: hz("G6") * 2, type: "sine", gain: 0.15, a: 0.01, r: 0.03, sus: 0.02 });
    },
  };

  // Ajuste fino de volume de cada som (para todos soarem com força parecida).
  const LEVEL = { ration: 0.84, bone: 0.67, capture: 0.79, lifelost: 1.4, transform: 1.07, postman: 1.1, levelup: 1.45, life: 1.35, gameover: 1.46, pick: 1.2, bark1: 1.0, bark2: 1.0, bark3: 1.0, meow: 1.0 };

  // Agenda o som `name` em `destination` (um nó de um BaseAudioContext qualquer, real ou offline) a partir do instante `t0` (s).
  // Devolve a duração do som em segundos (0 se o nome não existe). Não depende de nenhum estado: pode ser chamada à vontade.
  function render(name, ctx, destination, t0) {
    if (typeof name !== "string" || !Object.prototype.hasOwnProperty.call(DEFS, name)) return 0;
    if (!ctx || !destination) throw new TypeError("render precisa de um contexto de áudio e de um destino");
    const start = Number.isFinite(t0) ? t0 : Number(ctx.currentTime) || 0;
    const bus = ctx.createGain(); // todas as vozes do som passam por aqui (ajuste de volume do som)
    bus.gain.value = LEVEL[name];
    const sc = scene(ctx, bus, start);
    DEFS[name](sc);
    bus.connect(destination); // só liga no fim: se algo falhar no meio, nada sai pela metade
    return sc.end;
  }

  // Deixa pronto o que é caro de criar (buffer de ruído e onda de pulso), para o primeiro som não engasgar o jogo.
  function prepare(ctx) {
    try { noiseBuffer(ctx); } catch { /* o som que precisar disso falha sozinho */ }
    try { pulseWave(ctx, 0.25); } catch { /* idem (a onda de pulso cai para quadrada) */ }
  }

  // Saída mestre: ganho (volume) -> compressor leve (para somas de sons não estourarem) -> caixas de som.
  function createOutput(ctx, volume) {
    const gain = ctx.createGain(), comp = ctx.createDynamicsCompressor();
    gain.gain.value = volume ?? DEFAULT_VOLUME;
    const set = (p, v) => { try { p.value = v; } catch { /* parâmetro ausente */ } };
    set(comp.threshold, -14); set(comp.knee, 10); set(comp.ratio, 3); set(comp.attack, 0.003); set(comp.release, 0.12);
    gain.connect(comp); comp.connect(ctx.destination);
    return { input: gain, gain, compressor: comp };
  }

  // ---------- O tocador ----------
  // opts: { storage (getItem/setItem, opcional), AudioContextClass (padrão: AudioContext do navegador), now (ms, padrão Date.now) }
  function create(opts) {
    opts = opts || {};
    const storage = opts.storage || null;
    const now = typeof opts.now === "function" ? opts.now : Date.now;
    const Ctor = opts.AudioContextClass !== undefined ? opts.AudioContextClass : (root.AudioContext || root.webkitAudioContext);
    const hasCtor = typeof Ctor === "function";

    let ctx = null, out = null, broken = false, unlocked = false, resumeAt = -Infinity;
    let muted = false, volume = DEFAULT_VOLUME;
    let last = Object.create(null); // nome -> quando (ms) tocou pela última vez
    let voices = [];                // fim (no relógio do áudio) de cada som em andamento
    const events = [];              // os últimos pedidos: { name, t, played }

    // ----- preferência guardada (tudo com try/catch: sem storage, ou com erro, vale só a memória) -----
    function load() {
      if (!storage) return;
      try {
        const raw = storage.getItem(KEY);
        if (raw === "0" || raw === "1") { muted = raw === "1"; return; } // forma simples: só o mudo
        const p = JSON.parse(raw || "null");
        if (!p || typeof p !== "object") return;
        if (p.m === 0 || p.m === 1) muted = p.m === 1;
        if (typeof p.v === "number" && p.v >= 0 && p.v <= 1) volume = p.v;
      } catch { /* preferência ilegível: fica o padrão */ }
    }
    function save() {
      if (!storage) return;
      try { storage.setItem(KEY, JSON.stringify({ m: muted ? 1 : 0, v: Math.round(volume * 1000) / 1000 })); } catch { /* sem espaço ou bloqueado */ }
    }
    load();

    // ----- contexto de áudio -----
    function applyGain() { // muda o volume sem estalo (rampa curta)
      if (!out) return;
      const p = out.gain.gain, g = muted ? 0 : volume;
      try { const t = ctx.currentTime; p.cancelScheduledValues(t); p.setTargetAtTime(g, t, 0.015); } catch { try { p.value = g; } catch { /* nada a fazer */ } }
    }
    function requestResume() {
      resumeAt = now();
      try { const r = ctx.resume(); if (r && typeof r.catch === "function") r.catch(() => {}); } catch { /* o navegador recusou: tenta no próximo gesto */ }
    }
    function ensureContext() {
      if (ctx) return true;
      if (!hasCtor || broken) return false;
      try {
        try { ctx = new Ctor({ latencyHint: "interactive" }); } catch { ctx = new Ctor(); }
        out = createOutput(ctx, muted ? 0 : volume);
        prepare(ctx);
        return true;
      } catch {
        broken = true;
        try { if (ctx && typeof ctx.close === "function") ctx.close().catch(() => {}); } catch { /* ignora */ }
        ctx = null; out = null;
        return false;
      }
    }
    // Pronto para tocar? Suspenso (aba em segundo plano, celular): pede para retomar; sons pedidos logo depois do pedido ficam na fila.
    function ready() {
      if (ctx.state === "closed") { ctx = null; out = null; unlocked = false; return false; }
      if (ctx.state === "running") return true;
      const since = now() - resumeAt;
      if (since >= 0 && since < RESUME_GRACE_MS) return true;
      requestResume();
      return false;
    }

    function record(name, t, played) {
      let label; try { label = String(name).slice(0, 40); } catch { label = "?"; }
      events.push({ name: label, t, played });
      if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    }

    function tryPlay(name, t, o) {
      if (typeof name !== "string" || !Object.prototype.hasOwnProperty.call(DEFS, name)) return false;
      if (muted) return false;
      if (!unlocked || !ctx || !ready()) return false;
      const since = t - (last[name] === undefined ? -Infinity : last[name]);
      if (since >= 0 && since < MIN_GAP_MS) return false;
      const ct = ctx.currentTime;
      voices = voices.filter((end) => end > ct);
      if (voices.length >= MAX_VOICES) return false;
      const delay = o && Number.isFinite(o.delay) ? clamp(o.delay, 0, 5) : 0; // atraso opcional, em s
      const t0 = ct + LEAD + delay, dur = render(name, ctx, out.input, t0);
      if (!(dur > 0)) return false;
      voices.push(t0 + dur);
      last[name] = t;
      return true;
    }

    const api = {
      // true se o navegador tem Web Audio e ele não falhou
      get supported() { return hasCtor && !broken; },
      get events() { return events; },
      get state() { return ctx ? ctx.state : "none"; },

      // Toca o som `name` (um de Sound.NAMES). `o.delay` (s, opcional) adia o som no relógio do áudio. Devolve true se tocou.
      // Nunca lança erro: sem Web Audio, antes do unlock, mudo, nome inválido, repetido em menos de 60 ms ou com 8 sons em andamento devolve false.
      play(name, o) {
        const t = now();
        let ok = false;
        try { ok = !!tryPlay(name, t, o); } catch { ok = false; }
        record(name, t, ok);
        return ok;
      },

      setMuted(v) { muted = !!v; applyGain(); save(); return muted; },
      isMuted() { return muted; },
      toggleMuted() { return api.setMuted(!muted); },
      setVolume(v) {
        const n = typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN;
        if (Number.isFinite(n)) { volume = clamp(n, 0, 1); applyGain(); save(); } // (valor inválido: ignora)
        return volume;
      },
      getVolume() { return volume; },

      // Cria o AudioContext (uma vez só) e o retoma. Chamar no primeiro gesto do usuário (toque, clique, tecla). Devolve true se há som disponível.
      unlock() {
        try {
          if (!ensureContext()) return false;
          unlocked = true;
          if (ctx.state !== "running") requestResume();
          return true;
        } catch { return false; }
      },

      // Liga unlock() aos primeiros gestos de `target` (padrão: a janela). Devolve uma função que desliga. Sozinho se desliga quando o som está rodando.
      bindUnlock(target) {
        target = target || root;
        if (!target || typeof target.addEventListener !== "function") return () => {};
        const types = ["pointerdown", "touchend", "mousedown", "keydown", "click"];
        const off = () => { for (const ty of types) { try { target.removeEventListener(ty, handler, true); } catch { /* ignora */ } } };
        const handler = () => { if (api.unlock() && ctx && ctx.state === "running") off(); };
        for (const ty of types) { try { target.addEventListener(ty, handler, { capture: true, passive: true }); } catch { /* ignora */ } }
        return off;
      },

      // Limpa os pedidos registrados (a MESMA lista `events`, para quem guarda a referência), o limite de taxa e os sons em andamento. Não mexe na preferência.
      reset() { events.length = 0; last = Object.create(null); voices = []; },
    };
    return api;
  }

  return { create, render, createOutput, NAMES, MAX_SECONDS, KEY, DEFAULT_VOLUME, MIN_GAP_MS, MAX_VOICES, MAX_EVENTS, hz };
});
