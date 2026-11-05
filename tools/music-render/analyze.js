// Medidas e WAV das músicas renderizadas (módulo puro, sem navegador; usado por tools/music-render/render.js e testado em tests/music.test.js).
// Entrada: o áudio mono de um tema renderizado (1 laço + cauda) em Float32Array. A medida é feita no laço "em regime": a cauda que passa do fim do laço é
// somada ao começo (é o que o tocador faz ao emendar o laço seguinte), então a emenda é medida de verdade.

// Limites do desenho das músicas. rmsTargetDb é o nível-alvo do RMS do tema sozinho (ganho 1, sem o barramento do jogo): todos os temas ficam em alvo ± rmsTol.
const LIMITS = Object.freeze({ peak: 0.9, rmsTargetDb: -22, rmsTol: 4, dc: 0.01, silence: 3, seamExtraDb: 3, click: 1.5, silentLevel: 0.001 });

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

// laço em regime: x[0..L) mais tudo o que passa de L, dando a volta
function fold(x, L) {
  const s = new Float32Array(L);
  for (let i = 0; i < x.length; i++) s[i % L] += x[i];
  return s;
}
function rmsOf(s, from, to) {
  let q = 0;
  const n = s.length;
  for (let i = from; i < to; i++) { const v = s[((i % n) + n) % n]; q += v * v; }
  return Math.sqrt(q / Math.max(1, to - from));
}
// RMS depois de um passa-alta de 1 polo em `fc` Hz (aproxima o que um alto-falante de celular reproduz)
function rmsHighpass(s, sr, fc) {
  const rc = 1 / (2 * Math.PI * fc), dt = 1 / sr, a = rc / (rc + dt);
  let y = 0, px = 0, q = 0;
  for (let i = 0; i < s.length; i++) { y = a * (y + s[i] - px); px = s[i]; q += y * y; }
  return Math.sqrt(q / s.length);
}
// maior trecho (s) em que o sinal fica abaixo de `level` em quadros de 20 ms, contando a volta do laço
function longestSilence(s, sr, level) {
  const frame = Math.round(0.02 * sr), F = Math.floor(s.length / frame);
  const silent = new Array(F);
  for (let f = 0; f < F; f++) { let m = 0; for (let i = f * frame; i < (f + 1) * frame; i++) { const a = Math.abs(s[i]); if (a > m) m = a; } silent[f] = m < level; }
  if (silent.every(Boolean)) return s.length / sr;
  let best = 0, run = 0;
  for (let f = 0; f < 2 * F; f++) { if (silent[f % F]) { run++; if (run > best) best = run; } else run = 0; }
  return Math.min(best, F) * frame / sr;
}
// salto de nível entre as janelas de 250 ms antes e depois de uma batida (dB)
function jumpAt(s, pos, w) { return Math.abs(db(rmsOf(s, pos - w, pos)) - db(rmsOf(s, pos, pos + w))); }

// opts: { barSeconds (para comparar a emenda com as outras divisões de compasso), maxSilence }
function analyze(s, sr, opts) {
  opts = opts || {};
  const n = s.length;
  let peak = 0, sum = 0, sq = 0;
  for (let i = 0; i < n; i++) { const v = s[i], a = Math.abs(v); if (a > peak) peak = a; sum += v; sq += v * v; }
  const rms = Math.sqrt(sq / n);
  const w = Math.round(0.25 * sr), bar = opts.barSeconds ? Math.round(opts.barSeconds * sr) : 0;
  const seamDb = jumpAt(s, 0, w);
  let others = 0;
  if (bar > 2 * w) for (let p = bar; p < n - bar / 2; p += bar) others = Math.max(others, jumpAt(s, p, w));
  // clique: o maior degrau entre amostras vizinhas junto da emenda (+-3 ms) contra o maior degrau do resto
  const near = Math.round(0.003 * sr);
  let seamStep = 0, restStep = 0;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(s[i] - s[(i - 1 + n) % n]), dist = Math.min(i, n - i);
    if (dist <= near) { if (d > seamStep) seamStep = d; } else if (d > restStep) restStep = d;
  }
  return {
    samples: n, seconds: n / sr, peak, peakDb: db(peak), rms, rmsDb: db(rms), rmsHPDb: db(rmsHighpass(s, sr, 150)), dc: sum / n,
    silence: longestSilence(s, sr, LIMITS.silentLevel), seamDb, otherBarsDb: others, click: seamStep / Math.max(restStep, 1e-9),
    suggestedGain: Math.round(Math.min(Math.pow(10, (LIMITS.rmsTargetDb - db(rms)) / 20), LIMITS.peak / Math.max(peak, 1e-9)) * 100) / 100,
  };
}

// Confere as medidas contra os limites; devolve a lista de falhas (vazia = passou). opts: { maxSilence (s) }
function check(m, opts) {
  opts = opts || {};
  const f = [], maxSilence = opts.maxSilence === undefined ? LIMITS.silence : opts.maxSilence;
  if (!(m.peak <= LIMITS.peak)) f.push(`pico ${m.peak.toFixed(3)} > ${LIMITS.peak}`);
  if (!(Math.abs(m.rmsDb - LIMITS.rmsTargetDb) <= LIMITS.rmsTol)) f.push(`RMS ${m.rmsDb.toFixed(1)} dBFS fora de ${LIMITS.rmsTargetDb} +- ${LIMITS.rmsTol}`);
  if (!(Math.abs(m.dc) < LIMITS.dc)) f.push(`DC ${m.dc.toFixed(4)} >= ${LIMITS.dc}`);
  if (!(m.silence < maxSilence)) f.push(`silêncio de ${m.silence.toFixed(1)} s >= ${maxSilence} s`);
  if (!(m.seamDb <= m.otherBarsDb + LIMITS.seamExtraDb)) f.push(`emenda do laço com salto de ${m.seamDb.toFixed(1)} dB (outros compassos: até ${m.otherBarsDb.toFixed(1)} dB)`);
  if (!(m.click <= LIMITS.click)) f.push(`clique na emenda (degrau ${m.click.toFixed(2)}x o maior do resto)`);
  return f;
}

// Detector de ganhos que não escalam (usado por tools/music-render/scale.js). `a` e `b` são o MESMO tema renderizado com dois volumes (ganho g e g / ratio). Se tudo no motor é linear,
// a - ratio * b é zero em toda amostra; uma amostra que não escala (um clique: o ganho de uma nota que começa fora de 0 deixa passar a 1ª amostra da fonte, e isso não muda com o volume)
// aparece como resíduo grande. `tol` é o resíduo (em amplitude, 1 = fundo de escala) a partir do qual a amostra conta como fora de escala (0,01 = -40 dBFS: um clique menor passa).
// Devolve { samples, bad (quantas amostras passam de tol), worst (o maior resíduo), at (índice da pior), peak (maior |a|), lengthMismatch }.
function scaleResidual(a, b, ratio, tol) {
  if (a.length !== b.length) return { samples: Math.min(a.length, b.length), bad: 0, worst: 0, at: 0, peak: 0, lengthMismatch: true };
  let bad = 0, worst = 0, at = 0, peak = 0;
  for (let i = 0; i < a.length; i++) {
    const r = Math.abs(a[i] - ratio * b[i]), v = Math.abs(a[i]);
    if (r > tol) bad++;
    if (r > worst) { worst = r; at = i; }
    if (v > peak) peak = v;
  }
  return { samples: a.length, bad, worst, at, peak, lengthMismatch: false };
}
// As falhas (textos em português) de um resultado de scaleResidual; `sr` é a taxa de amostragem, para dizer em que segundo está a pior amostra
function scaleFails(res, sr) {
  if (res.lengthMismatch) return ["os dois renders têm tamanhos diferentes: não dá para comparar"];
  if (res.bad === 0) return [];
  return [`${res.bad} amostra(s) que não escalam com o volume (a pior: resíduo ${res.worst.toFixed(3)} em ${(res.at / sr).toFixed(3)} s)`];
}

// WAV de 16 bits, mono, a partir de Float32Array (valores fora de -1..1 são cortados). Devolve um Buffer.
function wav16(x, sr) {
  const n = x.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8); buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  return buf;
}

module.exports = { LIMITS, fold, analyze, check, scaleResidual, scaleFails, wav16, db };
