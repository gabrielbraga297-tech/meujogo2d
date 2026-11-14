// Desenhos do Passarinho (0.20.0): o passarinho (12 skins), o gato de quintal, o gavião, a semente, a minhoca, o fruto, o poleiro, os postos, o ninho e os efeitos curtos.
// Só desenho: nenhuma regra do jogo mora aqui, e nada aqui depende de js/game.js. Cada função recebe o `ctx` do canvas e parâmetros explícitos, não guarda estado
// entre quadros (só paletas já calculadas, que são sempre iguais para os mesmos parâmetros) e é determinística: sem Math.random nem relógio, só a posição, o `idx` e o `time` passado.
// `o.calm` (reduzir movimento) desliga todo balanço, bater de asas, pulso e piscada: com `calm` o mesmo pedido desenha exatamente a mesma imagem em qualquer instante
// (as pernas de quem anda seguem a POSIÇÃO e não o relógio). Nada lança erro com parâmetros ausentes (valores padrão sensatos). Cada função devolve o canvas como o recebeu (save/restore).
// É o mesmo estilo e o mesmo contrato de js/cat-art.js: fofo, contornos suaves, cores vivas e legíveis também à noite (Fases 18 e 19): penas e pelos CLAROS no passarinho e nos inimigos.
//
// Contrato (usado por js/game.js nas fases do Passarinho):
//   BirdArt.drawBird(ctx, p, o)      o PASSARINHO. p = { x, y, w, h, facing: "left"|"right"|"up"|"down", moving }, a mesma caixa do gatinho (~24×24; desenha centrado em p.x + p.w/2, p.y + p.h/2);
//                                    o = { gr: 0..1 (0 filhote, 1 adulto), skin, still (sem balançar), time, calm, flap (bater asas = arrancada), flying: 0..1 (voo alto: sprite maior e elevado,
//                                    asas abertas, sombra afastada no chão), safe (a salvo no galho), blink (aviso de fim do voo: pisca), noShadow (não desenha a sombra do chão) }
//   BirdArt.SKINS, BirdArt.skinById  as 12 skins (só visual): { id, name, text, price } (Marrom [padrão], Amarelo, Azul, Vermelho, Verde, Cinza, Branco, Preto, Laranja, Arco-íris, Pirata, Astronauta)
//   BirdArt.drawFoeCat(ctx, d, o)    o GATO DE QUINTAL. d = { x, y (centro), dir: -1|1, mode: "patrol"|"chase"|"flee"|"search"|"idle", size: "small"|"medium"|"large", frozen, slow, idx }; o = { time, calm, look }
//   BirdArt.drawHawk(ctx, d, o)      o GAVIÃO. d = { x, y (centro), dir: -1|1, mode: "patrol"|"chase"|"search"|"idle"|"flee", frozen, slow, idx, diving }; o = { time, calm, look }. Voa sobre (x, y) e a SOMBRA elíptica fica no chão, por baixo (a sombra não pulsa com `calm`)
//   BirdArt.drawSeed(ctx, it, o)     a SEMENTE (parada): it = { x, y (canto do item 16×16), variant: 0..2 }; o = { time, calm, look }
//   BirdArt.drawWorm(ctx, b, o)      a MINHOCA: b = { x, y (centro), vx, vy, hue }; o = { time, calm, r (raio, 8), hidden (enterrada: só o montinho de terra), look }
//   BirdArt.drawFruit(ctx, it, o)    o FRUTO: it = { x, y (canto 16×16), kind: "scare"|"gold"|"ice"|"turbo"|"magnet" }; o = { time, calm, look }
//   BirdArt.FRUIT_KEYS               as cores-CHAVE de cada tipo de fruto (fill, strand, hi, glow): nenhuma skin as muda; cada tipo tem também a sua marquinha (asa, estrela, floco, raio, ímã)
//   BirdArt.drawRoost(ctx, x, y, o)  o GALHO/POLEIRO de uma skin da lojinha: o tile de 32×32 com canto em (x, y); o = { look }; sem `look.style` não desenha nada e devolve false (o jogo usa então o galho do ambiente)
//   BirdArt.drawPost(ctx, x, y, o)   o POSTO (centro x, y; ~40 px): o.kind "cat" (a moita do gato de quintal) ou "hawk" (o galho alto do gavião)
//   BirdArt.drawNest(ctx, x, y, o)   o NINHO da saída: o canto de cima à esquerda em (x, y); o = { open (true: aberto), w, h (o retângulo da saída; padrão 96×32; vale também em pé, com h > w), look,
//                                    rim, twig, lining (cores do ambiente: BirdThemes.of(fase).nest), time, calm }
//   BirdArt.drawFx(ctx, kind, x, y, t, o)  efeitos curtos, t = 0..1: "flap", "dust", "feather", "sparkle", "gust", "land", "peck" e "shadow" (a sombra do voo alto no chão: t = o quanto voa, 0..1; (x, y) = onde o passarinho pisa)
//                                    (o.facing: lado para onde o passarinho olhava; o.dx, o.dy: direção do vento no "gust"; o.color: cor da pena)
//   BirdArt.growthStage(gr)          "filhote" (< 0,34), "jovem" (< 0,67) ou "adulto" (o mesmo corte do cachorrinho e do gatinho)
// `o.look` (lojinha única): a skin em uso da categoria de cada objeto (um objeto de js/skins-bird.js). Sem `look` (ou sem nenhum campo visual) o desenho é EXATAMENTE o de sempre (pixel a pixel);
//   nenhum campo muda tamanho, posição ou o que o objeto é. Campos visuais por categoria (todas as cores "#rrggbb"; o que está entre aspas é uma lista fechada):
//   stray (gatos de quintal)   collar (cor da coleira ou "rainbow"), tag, acc ("bandana"|"bowtie"|"hat"|"bow"), c1, c2 (cores do enfeite), pat ("dots"|"check"), coats (1 a 4 pelagens { fur, dark, light, eye })
//   hawk (gaviões)             coats (1 a 3 { fur, dark, light, wing }), acc ("scarf"|"hat"|"bow"|"band"), c1, c2
//   seed (sementes)            coats (1 a 3 { body, stripe, hi }: a semente nº i usa a de índice i % tamanho), glow (cor de um brilhinho em volta)
//   bug (minhocas)             coats (1 a 4 { body, belly, band }: a minhoca de `hue` h usa a de índice h % tamanho), acc ("cap"|"bow"|"scarf"), c1, c2
//   berry (frutos)             pat ("stripes"|"dots"|"hearts"|"rainbow"|"stars"): só ENFEITE por cima; a cor-CHAVE do tipo (BirdArt.FRUIT_KEYS) e a marquinha nunca mudam
//   roost (poleiros)           style ("branch"|"bamboo"|"swing"|"house"; outro nome desenha "branch"), top, face, edge, acc1, acc2 (cores do topo, da frente, do contorno e dos detalhes)
//   birdexit (ninho da saída)  open, closed (cor do brilho aberto/fechado), deco ("stripes"|"rainbow"|"stars"|"frame"), mark (cor do enfeite)
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BirdArt = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const PI = Math.PI, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, atan2 = Math.atan2, sqrt = Math.sqrt, hypot = Math.hypot, floor = Math.floor;
  const num = (v, d) => (typeof v === "number" && v - v === 0 ? v : d);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pos = (v) => (v < 0 ? 0 : v);
  const HASH = new Float64Array(32); // números fixos de 0 a 1 (em vez de Math.random): espalham penas, faíscas e poeira sempre do mesmo jeito
  for (let i = 0; i < 32; i++) { const v = sin((i + 1) * 12.9898) * 43758.5453; HASH[i] = v - floor(v); }
  const mod = (a, n) => ((a % n) + n) % n; // resto sempre positivo (o % do JavaScript dá negativo com tempo negativo)
  const h01 = (i) => HASH[mod(i, 32)];

  let A0 = 1; // globalAlpha com que o jogo chamou (os desenhos só o multiplicam: um efeito de piscar ou esmaecer de fora continua valendo)
  const alphaIn = (c) => { const a = c.globalAlpha; return a >= 0 && a <= 1 ? a : 1; };
  let LINE = "rgba(40,22,10,.52)"; // contorno suave da peça que está sendo desenhada (cada função pública escolhe o seu)
  const hexOr = (v, d) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d);
  const look = (o) => (o && o.look && typeof o.look === "object" ? o.look : null);

  // ---------- cores ----------
  const mixCache = Object.create(null);
  function mixc(a, b, t) { // mistura duas cores "#rrggbb" (t de 0 a 1); só roda na hora de montar uma paleta, que fica guardada
    if (t <= 0) return a;
    if (t >= 1) return b;
    const key = a + b + Math.round(t * 64);
    let r = mixCache[key];
    if (r) return r;
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => { const va = (pa >> sh) & 255, vb = (pb >> sh) & 255; return Math.round(va + (vb - va) * t); };
    r = "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
    mixCache[key] = r;
    return r;
  }

  // ---------- peças simples ----------
  function oval(c, x, y, rx, ry, fill, rot) { c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, pos(rx), pos(ry), rot || 0, 0, TAU); c.fill(); }
  function ovalL(c, x, y, rx, ry, fill, rot, lw) { // com contorno suave
    c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, pos(rx), pos(ry), rot || 0, 0, TAU); c.fill();
    c.strokeStyle = LINE; c.lineWidth = lw || 1; c.stroke();
  }
  function dot(c, x, y, r, fill) { c.fillStyle = fill; c.beginPath(); c.arc(x, y, pos(r), 0, TAU); c.fill(); }
  function seg(c, x1, y1, x2, y2, color, w) { c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function tri(c, x1, y1, x2, y2, x3, y3, fill, outline) {
    c.fillStyle = fill; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill();
    if (outline) { c.strokeStyle = LINE; c.lineWidth = 0.9; c.stroke(); }
  }
  function star4(c, x, y, r, fill) { // estrelinha de 4 pontas
    c.fillStyle = fill; c.beginPath();
    c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
    c.closePath(); c.fill();
  }
  function rr(c, x, y, w, h, r, fill, stroke) { // retângulo de cantos redondos
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke(); }
  }
  function sil(c, parts, lw) { // silhueta única de várias elipses [x, y, rx, ry, rot, cor]: 1º o contorno de todas, depois os preenchimentos (sem linha no meio, p. ex. entre a cabeça e o corpo)
    c.strokeStyle = LINE; c.lineWidth = lw || 2.2;
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; c.beginPath(); c.ellipse(p[0], p[1], pos(p[2]), pos(p[3]), p[4] || 0, 0, TAU); c.stroke(); }
    for (let i = 0; i < parts.length; i++) { const p = parts[i]; oval(c, p[0], p[1], p[2], p[3], p[5], p[4]); }
  }
  function clipOval(c, x, y, rx, ry, rot) { c.save(); c.beginPath(); c.ellipse(x, y, pos(rx), pos(ry), rot || 0, 0, TAU); c.clip(); }
  function spikes(c, cx, cy, rx, ry, a0, a1, n, len, fill) { // penugem arrepiada: dentinhos em volta de uma elipse (de a0 a a1)
    c.fillStyle = fill; c.strokeStyle = LINE; c.lineWidth = 0.7;
    const hw = ((a1 - a0) / n) * 0.52;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n, L = len * (i % 2 ? 0.72 : 1);
      c.beginPath(); c.moveTo(cx + cos(a - hw) * rx, cy + sin(a - hw) * ry); c.lineTo(cx + cos(a) * (rx + L), cy + sin(a) * (ry + L)); c.lineTo(cx + cos(a + hw) * rx, cy + sin(a + hw) * ry); c.closePath(); c.fill(); c.stroke();
    }
  }
  function leaf(c, x, y, len, ang, fill, vein) { // folhinha: elipse pontuda a partir de (x, y) na direção `ang`, com nervura
    c.fillStyle = fill; c.beginPath(); c.ellipse(x + cos(ang) * len / 2, y + sin(ang) * len / 2, pos(len) / 2, pos(len) * 0.27, ang, 0, TAU); c.fill();
    c.strokeStyle = LINE; c.lineWidth = 0.6; c.stroke();
    if (vein) seg(c, x, y, x + cos(ang) * len * 0.92, y + sin(ang) * len * 0.92, vein, 0.6);
  }

  // ====================================================================================================================
  //  SKINS DO PASSARINHO (só visual: nenhuma muda tamanho de contato nem atributo)
  // ====================================================================================================================
  const SKIN_LIST = [
    { id: "", name: "Marrom", price: 0, text: "o passarinho de sempre (grátis)" },
    { id: "amarelo", name: "Amarelo", price: 10, text: "penas amarelas como o sol" },
    { id: "azul", name: "Azul", price: 12, text: "penas azuis como o céu" },
    { id: "vermelho", name: "Vermelho", price: 14, text: "penas vermelhas e topetinho" },
    { id: "verde", name: "Verde", price: 16, text: "penas verdes como folhas" },
    { id: "cinza", name: "Cinza", price: 18, text: "penas cinzentas de dia nublado" },
    { id: "branco", name: "Branco", price: 20, text: "penas brancas como nuvens" },
    { id: "preto", name: "Preto", price: 22, text: "penas pretas e bico amarelo" },
    { id: "laranja", name: "Laranja", price: 26, text: "penas cor de laranja" },
    { id: "arco-iris", name: "Arco-íris", price: 32, text: "penas de todas as cores" },
    { id: "pirata", name: "Pirata", price: 40, text: "tapa-olho e chapéu de pirata" },
    { id: "astronauta", name: "Astronauta", price: 50, text: "capacete de astronauta" },
  ];
  const SKINS = Object.freeze(SKIN_LIST.map((k) => Object.freeze(k)));
  const skinById = (id) => { for (let i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i]; return SKINS[0]; };

  // Aparência de cada skin (privada): body (costas), belly (barriga), head (cabeça, se outra), chest (peito, se outro), wing, tip (pontas das penas), tail, beak, leg, mask (máscara em volta do bico), crest (topete),
  // eyeRing (anel claro em volta do olho), pat ("rainbow": asas e cauda de várias cores), acc ("pirate"|"helmet"), line (contorno).
  const LOOK = Object.create(null);
  const skin = (id, o) => { LOOK[id] = o; };
  skin("", { body: "#b9854f", belly: "#f3dfb8", wing: "#8f5d34", tip: "#5d3a1f", tail: "#7b4d2b", beak: "#f4a53c", leg: "#e8903d" });
  skin("amarelo", { body: "#ffd43b", belly: "#fff2a8", wing: "#f2b01e", tip: "#d98a0f", tail: "#e8a31a", beak: "#f08a2a", leg: "#f08a2a" });
  skin("azul", { body: "#4d9bec", belly: "#d8ecff", wing: "#2e69c2", tip: "#1f4a96", tail: "#2d5fb4", beak: "#2f3544", leg: "#6a7080" });
  skin("vermelho", { body: "#ea4a40", belly: "#ff9a8c", wing: "#bf2a2a", tip: "#8f1a1f", tail: "#b22626", beak: "#f6b04a", leg: "#d07a44", mask: "#2a1c1f", crest: true });
  skin("verde", { body: "#55c25f", belly: "#e6f29a", wing: "#2f9a50", tip: "#1f6f38", tail: "#2f9a50", beak: "#ee5a4a", leg: "#c8b090" });
  skin("cinza", { body: "#a0a9b8", belly: "#e8ecf2", wing: "#6f7a8c", tip: "#4c5666", tail: "#5d6677", beak: "#e4a84a", leg: "#d98a8a" });
  skin("branco", { body: "#fcfcf8", belly: "#ffffff", wing: "#e2e6f0", tip: "#bcc4d6", tail: "#d4d9e6", beak: "#f4a53c", leg: "#f0a050", line: "rgba(52,40,44,.78)" });
  skin("preto", { body: "#3b3c4a", belly: "#55576a", wing: "#272833", tip: "#1b1c25", tail: "#20212b", beak: "#ffc43a", leg: "#c8903a", eyeRing: "#ffe27a", line: "rgba(214,224,248,.62)" });
  skin("laranja", { body: "#f28c30", belly: "#ffd8a0", wing: "#cf6a1a", tip: "#9e4a0e", tail: "#b5560f", beak: "#ffe08a", leg: "#e07a3a" });
  skin("arco-iris", { body: "#43b86a", belly: "#f4dc4a", head: "#4aa3ef", chest: "#ffab3a", wing: "#2f9bea", tip: "#8f5be8", tail: "#e8453c", beak: "#ff8a3a", leg: "#e8a05a", pat: "rainbow" });
  skin("pirata", { body: "#b9854f", belly: "#f3dfb8", wing: "#8f5d34", tip: "#5d3a1f", tail: "#7b4d2b", beak: "#f4a53c", leg: "#e8903d", acc: "pirate" });
  skin("astronauta", { body: "#eef1f6", belly: "#ffffff", wing: "#c7cfdd", tip: "#9aa6bb", tail: "#aeb8cb", beak: "#f4a53c", leg: "#f0a050", acc: "helmet", line: "rgba(40,48,66,.8)" });
  const WING_RAINBOW = ["#2f9bea", "#43b86a", "#ffc83d", "#ff8a3a", "#e8453c"]; // as penas da asa e da cauda do arco-íris (da frente para trás)
  const TAIL_RAINBOW = ["#e8453c", "#ffa23a", "#ffe03a"];

  const BIRD_PAL = Object.create(null); // paletas já montadas: [skin][nível de filhote 0..4]
  function birdPal(id, q) {
    const key = id + "|" + q;
    if (BIRD_PAL[key]) return BIRD_PAL[key];
    const L = LOOK[id], c = q / 4, fz = (col, t) => mixc(col, "#fff3c4", t * c); // o filhote é mais claro e fofinho (mistura com creme)
    const P = {
      id, pat: L.pat || "", acc: L.acc || "", line: L.line || "rgba(40,22,10,.52)", crest: !!L.crest, mask: L.mask || null, eyeRing: L.eyeRing || null,
      body: fz(L.body, 0.42), belly: fz(L.belly, 0.3), head: fz(L.head || L.body, 0.42), chest: fz(L.chest || L.belly, 0.3), wing: fz(L.wing, 0.34), tip: fz(L.tip, 0.3), tail: fz(L.tail, 0.34),
      beak: q ? mixc(L.beak, "#ffc040", 0.5 * c) : L.beak, leg: L.leg, cheek: "#ff8f8a",
      shade: mixc(L.body, "#000000", 0.2), wcols: L.pat === "rainbow" ? WING_RAINBOW.map((x) => fz(x, 0.3)) : null, tcols: L.pat === "rainbow" ? TAIL_RAINBOW.map((x) => fz(x, 0.3)) : null,
      farWing: mixc(L.wing, "#000000", 0.18), farTail: mixc(L.tail, "#000000", 0.12),
    };
    BIRD_PAL[key] = P;
    return P;
  }

  // ====================================================================================================================
  //  O PASSARINHO
  // ====================================================================================================================
  const stage = (gr) => (gr < 0.34 ? "filhote" : gr < 0.67 ? "jovem" : "adulto");
  const S = { // valores calculados uma vez por desenho, lidos pelas funções de baixo (um só objeto reaproveitado: nada é alocado por quadro)
    pal: null, gr: 1, fly: 0, flap: false, safe: false, still: false, calm: false, time: 0, blink: false, wa: 0, l1: 0, l2: 0, u1: 0, u2: 0, breath: 0, headX: 0, headY: 0, wag: 0, moving: false, beakOpen: 0,
  };

  function legB(c, x, top, dx, up, col, ground, tuck) { // uma perninha: traço fino do corpo ao pé, com os dedinhos (recolhida para trás no voo)
    c.lineCap = "round";
    if (tuck) { const fx = x - 3.4, fy = top + 3; seg(c, x, top, fx, fy, LINE, 2.5); seg(c, x, top, fx, fy, col, 1.3); seg(c, fx - 1.5, fy, fx + 1.5, fy + 0.3, col, 1.2); return; }
    const fx = x + dx, fy = ground - up;
    seg(c, x, top, fx, fy, LINE, 2.5); seg(c, x, top, fx, fy, col, 1.3);
    seg(c, fx - 1.6, fy, fx + 2.8, fy, LINE, 2.4); seg(c, fx - 1.6, fy, fx + 2.8, fy, col, 1.3);
  }
  function wingFan(c, P, x0, y0, ang, len, wd, far) { // asa aberta: um leque de penas longas a partir do ombro (x0, y0), apontando para `ang`
    c.save(); c.translate(x0, y0); c.rotate(ang);
    const n = 5;
    for (let i = n - 1; i >= 0; i--) {
      const a = (i - 2) * 0.25, col = P.wcols ? P.wcols[i] : far ? mixc(i > 2 ? P.tip : P.farWing, "#000000", 0.05) : mixc(P.wing, P.tip, i / (n - 1));
      c.fillStyle = col; c.beginPath(); c.ellipse(cos(a) * len * 0.55, sin(a) * len * 0.55, len * 0.5, wd * 0.25, a, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
    }
    const cov = far ? P.farWing : mixc(P.wing, P.body, 0.3);
    oval(c, len * 0.17, 0, len * 0.24, wd * 0.3, cov); c.strokeStyle = LINE; c.lineWidth = 0.8; c.beginPath(); c.ellipse(len * 0.17, 0, len * 0.24, wd * 0.3, 0, 0, TAU); c.stroke();
    c.restore();
  }
  function tailFan(c, P, x0, y0, base, len, spread, tcol) { // cauda: leque de penas pontudas a partir de (x0, y0) na direção `base`
    for (let i = 0; i < 3; i++) {
      const a = base + (i - 1) * spread, L = len * (i === 1 ? 1 : 0.86);
      c.fillStyle = P.tcols ? P.tcols[i] : tcol; c.beginPath(); c.ellipse(x0 + cos(a) * L * 0.5, y0 + sin(a) * L * 0.5, L * 0.5, 1.9, a, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
    }
  }
  function pirateHat(c, x, y, r, tilt) { // chapéu de pirata (tricórnio) sobre a cabeça em (x, y)
    c.save(); c.translate(x, y - r * 0.62); c.rotate(tilt);
    c.fillStyle = "#2a2a36"; c.beginPath(); c.moveTo(-r * 1.55, 1.7); c.quadraticCurveTo(-r * 0.95, -1.2, -r * 0.5, -r * 0.62); c.quadraticCurveTo(0, -r * 1.05, r * 0.5, -r * 0.62); c.quadraticCurveTo(r * 0.95, -1.2, r * 1.55, 1.7);
    c.quadraticCurveTo(0, 3.2, -r * 1.55, 1.7); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
    seg(c, -r * 1.4, 1.5, r * 1.4, 1.5, "#e6b84a", 0.9); dot(c, 0, -r * 0.2, 1.05, "#ffffff"); dot(c, -0.4, -r * 0.24, 0.28, "#2a2a36"); dot(c, 0.4, -r * 0.24, 0.28, "#2a2a36");
    c.restore();
  }
  function helmetB(c, x, y, r) { // capacete de astronauta: bolha de vidro com brilho e um aro cinza embaixo
    c.fillStyle = "rgba(170,215,255,.26)"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = "rgba(235,246,255,.95)"; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = "#8d99ad"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 0.2, PI * 0.2, PI * 0.8); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); c.arc(x, y, r * 0.72, PI * 1.1, PI * 1.45); c.stroke();
  }
  function eyeB(c, x, y, k, P, blink) { // olho grande e brilhante; piscando vira um traço
    const r = 1.35 + 0.4 * k;
    if (blink) { c.lineCap = "round"; c.strokeStyle = "#1c1218"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - r, y); c.quadraticCurveTo(x, y + 1.2, x + r, y); c.stroke(); return; }
    if (P.eyeRing) dot(c, x, y, r + 0.9, P.eyeRing);
    dot(c, x, y, r, "#1a1218"); dot(c, x + r * 0.34, y - r * 0.4, 0.5 + 0.12 * k, "#ffffff");
  }
  function beakSide(c, x, y, L, open, col) { // bico curtinho de lado, apontando para a direita
    const lo = open * 1.7;
    tri(c, x, y + 0.5, x + L * 0.8, y + 1.2 + lo, x, y + 1.9 + lo * 0.4, mixc(col, "#000000", 0.12), true); // de baixo
    tri(c, x, y - 1.2, x + L, y + 0.35, x, y + 1.0, col, true); // de cima
  }

  function birdSide(c, S0) { // de lado, olhando para a direita (para a esquerda o chamador espelha)
    const P = S0.pal, g = S0.gr, k = 1 - g, f = S0.fly, open = f > 0.05 || S0.flap, safe = S0.safe;
    const rx = 7.1 - 0.4 * k, ry = 5.7 + 1.3 * k, bx = -1.3, by = 2.3 + S0.breath;
    const hr = 4.3 + 1.2 * k, hx = bx + rx * 0.72 + S0.headX - 0.4 * k, hy = by - ry * 0.95 + S0.headY;
    const ground = 10.7, lt = by + ry - 1.6, wing = open ? (f > 0.05 ? 8.8 + 2.4 * g : 7.5 + 2 * g) : 0;
    // pernas do lado de lá, cauda e asa do lado de lá
    if (!(f > 0.05)) legB(c, bx + 2.4, lt, S0.l2, S0.u2, P.leg, ground, false);
    const tl = 5 + 3.8 * g, tb = open ? PI + 0.22 : safe ? PI - 0.55 : S0.moving ? PI + 0.12 : PI + 0.26 + S0.wag * 0.05;
    tailFan(c, P, bx - rx + 1.6, by - 0.6, tb + (open ? 0 : S0.wag * 0.03), tl, 0.24, P.tail);
    if (open) wingFan(c, P, bx + 2.2, by - ry * 0.6, S0.wa - 2.0, wing * 0.9, 6.4, true);
    // corpo e cabeça numa silhueta só
    if (k > 0.45) spikes(c, bx, by, rx, ry, -PI * 0.9, -PI * 0.15, 4, 1.5, P.body);
    sil(c, [[bx, by, rx, ry, 0, P.body], [hx, hy, hr, hr * 0.96, 0, P.head]]);
    clipOval(c, bx, by, rx, ry, 0); // barriga clara
    oval(c, bx + 1.8, by + ry * 0.55, rx * 0.9, ry * 0.62, P.belly);
    if (P.pat === "rainbow") { oval(c, bx + rx * 0.55, by + ry * 0.05, rx * 0.34, ry * 0.7, P.chest); oval(c, bx - rx * 0.1, by - ry * 0.9, rx * 0.95, ry * 0.5, P.body); }
    c.globalAlpha = A0 * 0.1; oval(c, bx, by + ry * 0.75, rx * 0.95, ry * 0.5, "#000000"); c.globalAlpha = A0 * 0.14; oval(c, bx - 0.8, by - ry * 0.55, rx * 0.6, ry * 0.26, "#ffffff"); c.globalAlpha = A0;
    c.restore();
    if (!(f > 0.05)) legB(c, bx + 0.2, lt, S0.l1, S0.u1, P.leg, ground, false);
    // asa
    if (open) wingFan(c, P, bx + 1.4, by - ry * 0.52, S0.wa - 2.3, wing, 7.2, false);
    else { // asa dobrada sobre o corpo: a ponta passa um pouquinho da cauda
      c.save(); c.translate(bx - 0.5, by - 0.5); c.rotate(-0.1);
      c.fillStyle = P.wing; c.beginPath(); c.moveTo(rx * 0.66, -ry * 0.12); c.quadraticCurveTo(rx * 0.4, -ry * 0.7, -rx * 0.3, -ry * 0.55); c.quadraticCurveTo(-rx * 0.92, -ry * 0.34, -rx * 1.3, ry * 0.3);
      c.quadraticCurveTo(-rx * 0.5, ry * 0.66, rx * 0.12, ry * 0.52); c.quadraticCurveTo(rx * 0.66, ry * 0.34, rx * 0.66, -ry * 0.12); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.9; c.stroke();
      if (P.wcols) { c.save(); c.clip(); for (let i = 0; i < 5; i++) oval(c, -rx * 0.9 + i * rx * 0.36, ry * 0.1, rx * 0.2, ry * 0.9, P.wcols[i]); c.restore(); }
      else { c.strokeStyle = P.tip; c.lineWidth = 0.9; c.lineCap = "round"; c.beginPath(); c.moveTo(-rx * 0.3, -ry * 0.05); c.lineTo(-rx * 0.95, ry * 0.2); c.moveTo(-rx * 0.1, ry * 0.2); c.lineTo(-rx * 0.8, ry * 0.4); c.moveTo(rx * 0.1, -ry * 0.28); c.lineTo(-rx * 0.5, -ry * 0.18); c.stroke(); }
      c.restore();
    }
    // cabeça: topete, máscara, bochecha, olho e bico
    const hs = P.crest ? 1 : 0;
    if (k > 0.4) { tri(c, hx - 1.4, hy - hr + 0.5, hx - 0.4, hy - hr + 0.6, hx - 2.3 + S0.wag * 0.1, hy - hr - 2.7, P.head, true); tri(c, hx - 0.4, hy - hr + 0.2, hx + 0.8, hy - hr + 0.6, hx - 0.2, hy - hr - 3.1, P.head, true); }
    if (hs) { tri(c, hx - 3.6, hy - hr + 1.2, hx - 0.4, hy - hr + 0.3, hx - 6.2, hy - hr - 2.2, P.head, true); tri(c, hx - 1.6, hy - hr + 0.6, hx + 1.2, hy - hr + 0.6, hx - 3.8, hy - hr - 3.9, P.head, true); }
    if (P.mask) { clipOval(c, hx, hy, hr, hr * 0.96, 0); oval(c, hx + hr * 0.78, hy + hr * 0.3, hr * 0.62, hr * 0.62, P.mask); c.restore(); }
    c.globalAlpha = A0 * 0.5; oval(c, hx + hr * 0.1, hy + hr * 0.5, 1.9, 1.3, P.cheek); c.globalAlpha = A0;
    eyeB(c, hx + hr * 0.38, hy - hr * 0.12, k, P, S0.blink);
    beakSide(c, hx + hr * 0.86, hy + 0.1, 3.5 - 0.7 * k, S0.beakOpen, P.beak);
    if (P.acc === "pirate") { seg(c, hx + hr * 0.38 - 1, hy - hr * 0.12 - 1.2, hx - hr * 0.9, hy - hr * 0.7, "#15151c", 0.9); dot(c, hx + hr * 0.38, hy - hr * 0.12, 2.2, "#15151c"); pirateHat(c, hx - 0.2, hy - hr * 0.35, hr, -0.12); }
    if (P.acc === "helmet") helmetB(c, hx + 0.2, hy + 0.3, hr * 1.5);
  }

  function birdFront(c, S0, back) { // de frente (descendo) ou de costas (subindo)
    const P = S0.pal, g = S0.gr, k = 1 - g, f = S0.fly, open = f > 0.05 || S0.flap, v = back ? -1 : 1;
    const rx = 6.5 - 0.2 * k, ry = 7.2 - 0.2 * g + 0.4 * k, by = 1.6 + S0.breath;
    const hr = 5.6 + 1.0 * k, hy = by - ry + (back ? 1.4 : 0.6) + S0.headY, hw = hr * 1.04, hh = hr * 0.92;
    const wing = open ? (f > 0.05 ? 9 + 2.4 * g : 8 + 2.5 * g) : 0;
    if (back) tailFan(c, P, 0, by + ry - 2.4, PI / 2, 5 + 4.5 * g, 0.3, P.tail); // a cauda aparece embaixo do corpo
    if (open) { for (let s = -1; s <= 1; s += 2) wingFan(c, P, s * (rx - 1.2), by - ry * 0.4, s > 0 ? -0.1 + S0.wa * -1 + 0.32 : PI + 0.1 + S0.wa + -0.32, wing, 7.6, false); }
    if (!(f > 0.05)) { // pezinhos laranja
      for (let s = -1; s <= 1; s += 2) { const fy = 10.5 - (s > 0 ? S0.u1 : S0.u2), fx = s * 2.7 + (s > 0 ? S0.l1 : S0.l2) * 0.25; seg(c, fx, by + ry - 1.2, fx, fy, LINE, 2.4); seg(c, fx, by + ry - 1.2, fx, fy, P.leg, 1.3); for (let t = -1; t <= 1; t++) { seg(c, fx, fy, fx + t * 1.9, fy + 0.6, LINE, 2.2); seg(c, fx, fy, fx + t * 1.9, fy + 0.6, P.leg, 1.2); } }
    }
    if (k > 0.45) spikes(c, 0, by, rx, ry, -PI * 0.92, -PI * 0.08, 5, 1.4, P.body);
    sil(c, [[0, by, rx, ry, 0, P.body], [0, hy, hw, hh, 0, P.head]]);
    if (!back) {
      clipOval(c, 0, by, rx, ry, 0); oval(c, 0, by + ry * 0.35, rx * 0.74, ry * 0.8, P.belly); if (P.pat === "rainbow") oval(c, 0, by - ry * 0.05, rx * 0.8, ry * 0.4, P.chest); c.restore();
    } else {
      clipOval(c, 0, by, rx, ry, 0); oval(c, 0, by + 0.6, rx * 0.8, ry * 0.8, P.wing); seg(c, 0, by - ry * 0.5, 0, by + ry * 0.9, P.tip, 0.9);
      if (P.wcols) for (let i = 0; i < 5; i++) seg(c, (i - 2) * 1.6, by - ry * 0.3, (i - 2) * 2.3, by + ry * 0.95, P.wcols[i], 1.3);
      c.restore();
    }
    c.globalAlpha = A0 * 0.1; oval(c, 0, by + ry * 0.7, rx * 0.9, ry * 0.4, "#000000"); c.globalAlpha = A0 * 0.14; oval(c, -1.2, hy - hh * 0.5, hw * 0.45, hh * 0.22, "#ffffff"); c.globalAlpha = A0;
    if (!open) { // asas dobradas dos lados
      for (let s = -1; s <= 1; s += 2) { ovalL(c, s * (rx - 0.9), by + 0.8, 2.3, ry * 0.68, P.wing, s * 0.08, 0.9); if (P.wcols) oval(c, s * (rx - 0.9), by + 4, 1.4, 2.2, P.wcols[(s > 0 ? 2 : 3)], s * 0.08); }
    }
    if (k > 0.4) { tri(c, -1.8, hy - hh + 0.6, -0.4, hy - hh + 0.4, -2.6, hy - hh - 2.8, P.head, true); tri(c, -0.2, hy - hh + 0.3, 1.5, hy - hh + 0.6, 0.6, hy - hh - 3.3, P.head, true); tri(c, 1.2, hy - hh + 0.5, 2.6, hy - hh + 1, 3.2, hy - hh - 2.3, P.head, true); }
    if (P.crest) { tri(c, -2.2, hy - hh + 0.8, 2.2, hy - hh + 0.8, 0.6 + S0.wag * 0.1, hy - hh - 5, P.head, true); tri(c, -0.8, hy - hh + 0.6, 2.8, hy - hh + 1, 2.6, hy - hh - 3.2, mixc(P.head, "#000000", 0.1), true); }
    if (!back) {
      if (P.mask) { clipOval(c, 0, hy, hw, hh, 0); oval(c, 0, hy + hh * 0.55, hw * 0.52, hh * 0.52, P.mask); c.restore(); }
      for (let s = -1; s <= 1; s += 2) { c.globalAlpha = A0 * 0.5; oval(c, s * hw * 0.62, hy + hh * 0.38, 1.7, 1.2, P.cheek); c.globalAlpha = A0; }
      eyeB(c, -hw * 0.42, hy - hh * 0.1, k, P, S0.blink); eyeB(c, hw * 0.42, hy - hh * 0.1, k, P, S0.blink);
      const bo = S0.beakOpen * 1.2; // bico de frente: um losango pequeno
      tri(c, -1.9, hy + hh * 0.18, 1.9, hy + hh * 0.18, 0, hy + hh * 0.18 + 2.2, P.beak, true);
      tri(c, -1.5, hy + hh * 0.18 + 1.6, 1.5, hy + hh * 0.18 + 1.6, 0, hy + hh * 0.18 + 3 + bo, mixc(P.beak, "#000000", 0.14), true);
      if (P.acc === "pirate") { seg(c, hw * 0.42 + 0.8, hy - hh * 0.1 - 1.3, -hw * 0.9, hy - hh * 0.62, "#15151c", 0.9); dot(c, hw * 0.42, hy - hh * 0.1, 2.3, "#15151c"); }
    }
    if (P.acc === "pirate") pirateHat(c, 0, hy - hh * 0.38, hr * 1.02, back ? 0.05 : 0.1);
    if (P.acc === "helmet") helmetB(c, 0, hy + 0.4, hr * 1.42);
  }

  function drawBird(ctx, p, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    p = p || {}; o = o || {};
    const w = num(p.w, 24), h = num(p.h, 24), cx = num(p.x, 0) + w / 2, cy = num(p.y, 0) + h / 2;
    const fc = p.facing === "left" || p.facing === "up" || p.facing === "down" ? p.facing : "right";
    const gr = clamp(num(o.gr, 1), 0, 1), calm = !!o.calm, still = !!o.still, fly = clamp(num(o.flying, 0), 0, 1), flap = !!o.flap, safe = !!o.safe && fly <= 0.05, blink = !!o.blink;
    const moving = !!p.moving && !still, ti = calm ? 0 : num(o.time, 0);
    const id = typeof o.skin === "string" && LOOK[o.skin] ? o.skin : "";
    const P = birdPal(id, Math.round((1 - gr) * 4));
    LINE = P.line;
    S.pal = P; S.gr = gr; S.fly = fly; S.flap = flap; S.safe = safe; S.still = still; S.calm = calm; S.time = ti; S.moving = moving;
    const lateral = fc === "left" || fc === "right";
    const travel = lateral ? num(p.x, 0) * (fc === "left" ? -1 : 1) : num(p.y, 0) * (fc === "up" ? -1 : 1);
    // passo: pelo relógio (normal) ou pela POSIÇÃO (reduzir movimento: o corpo só se mexe quando anda de verdade)
    const phase = calm ? travel * 0.105 : ti * (flap ? 26 : 16);
    const sw = moving ? sin(phase) * (flap ? 2.6 : 2.2) : 0, hop = moving && !safe ? abs(sin(phase)) : 0;
    S.l1 = sw; S.l2 = -sw; S.u1 = moving ? pos(cos(phase)) * 1.6 : 0; S.u2 = moving ? pos(-cos(phase)) * 1.6 : 0;
    S.breath = calm || still ? 0 : sin(ti * 2.6) * 0.22;
    S.wag = calm || still ? 0 : sin(ti * (moving ? 10 : 3)) * (moving ? 1.6 : 1.2);
    S.headX = moving ? sin(phase) * 0.55 : 0; S.headY = moving ? -hop * 0.3 : 0;
    S.blink = blink ? false : !calm && !still && mod(ti, 3.9) < 0.12;
    S.beakOpen = fly > 0.05 || flap ? 0.7 : 0;
    // asas abertas: o ângulo balança com o relógio; com `calm` ficam paradas no meio da batida
    S.wa = (calm ? 0 : sin(ti * (flap ? 30 : 20)) * (flap ? 0.42 : 0.56)) + (flap && !(fly > 0.05) ? 0.1 : 0);
    const sc = (0.8 + 0.2 * gr) * 1.08 * (safe ? 1.08 : 1) * (1 + 0.25 * fly), lift = (safe ? 4.5 : 0) + 9 * fly + (flap && !(fly > 0.05) ? 1.2 + (calm ? 0 : abs(sin(ti * 15))) * 1.4 : 0) + hop * 1.3;
    let a1 = A0;
    if (blink) a1 = A0 * (calm ? 0.6 : mod(ti * 6, 1) < 0.5 ? 0.42 : 1); // aviso do fim do voo: pisca (com `calm`, fica sempre um pouco esmaecido, sem piscar)
    ctx.save();
    ctx.translate(cx, cy + 11); ctx.scale(fc === "left" ? -sc : sc, sc); ctx.translate(0, -11); // os pés ficam no mesmo lugar: o filhote só é menor
    if (!o.noShadow) {
      if (fly > 0.05) { ctx.globalAlpha = A0 * 0.22; oval(ctx, 0, 11, 9 + 2 * fly, 2.7, "#000000"); }
      else if (safe) { ctx.globalAlpha = A0 * 0.17; oval(ctx, 0, 14.6, 8.5, 2.6, "#000000"); }
      else { ctx.globalAlpha = A0 * 0.26; oval(ctx, 0, 10.8, 8.6, 2.9, "#000000"); }
    }
    ctx.globalAlpha = a1; A0 = a1;
    ctx.translate(0, -lift);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (lateral) birdSide(ctx, S); else birdFront(ctx, S, fc === "up");
    ctx.restore();
    A0 = alphaIn(ctx);
  }

  function growthStage(gr) { gr = num(gr, 1); return stage(gr); }

  // ====================================================================================================================
  //  O GATO DE QUINTAL (o inimigo que persegue de verdade) E O GAVIÃO
  // ====================================================================================================================
  // Os pelos e as penas são CLAROS (legíveis na noite das Fases 18 e 19); o gato de quintal não usa coleira (a skin da lojinha pode pôr).
  const FOE_COATS = [
    { pat: "tabby", fur: "#f1a652", dark: "#c46c20", light: "#ffe4ba", eye: "#7bdc5a" }, // laranja rajado
    { pat: "tabby", fur: "#c8cfdb", dark: "#8d97ab", light: "#f4f6fa", eye: "#ffd24a" }, // cinza-claro rajado
    { pat: "patch", fur: "#f7f0e4", dark: "#f0a55a", light: "#ffffff", dark2: "#b9a58a", eye: "#6bb9ff" }, // branco com manchas laranja e cinza
    { pat: "points", fur: "#eadcc2", dark: "#8a6a50", light: "#fbf3e0", eye: "#58b0ff" }, // creme de pontas escuras
  ];
  const FOE_PAL = Object.create(null); // [pelagem][0 normal, 1 congelado]
  const FOE_LOOK_PAL = new WeakMap(); // paletas por skin (objeto de js/skins-bird.js): nada é montado por quadro
  const RAINBOW = ["#e8403a", "#ffc83d", "#4fb85a", "#3f86e0"];
  function foePal0(src, frozen, key, cache) {
    const k = key + (frozen ? "f" : "n");
    if (cache[k]) return cache[k];
    const w = frozen ? 0.55 : 0, tint = "#8fd0ff", m = (cc) => (w ? mixc(cc, tint, w) : cc);
    const P = { pat: src.pat || "tabby", fur: m(src.fur), dark: m(src.dark), light: m(src.light), dark2: m(src.dark2 || src.dark), eye: frozen ? mixc(src.eye, "#d8f2ff", 0.5) : src.eye, shade: m(mixc(src.fur, "#000000", 0.2)), pawShade: m(mixc(src.fur, "#000000", 0.14)),
      inner: m("#f6a6b2"), nose: m("#ee8497"), line: frozen ? "rgba(40,90,140,.6)" : "rgba(40,22,10,.52)", collar: null, tag: null, acc: "", a1: "#e8403a", a2: "#ffffff", rb: null, apat: "dots", frozen };
    cache[k] = P;
    return P;
  }
  function foePal(idx, frozen, lk) {
    const coats = lk && Array.isArray(lk.coats) && lk.coats.length ? lk.coats : null, ci = ((idx % (coats ? coats.length : 4)) + (coats ? coats.length : 4)) % (coats ? coats.length : 4);
    let base;
    if (coats) {
      const c = coats[ci] || {};
      let byKey = FOE_LOOK_PAL.get(lk.coats); if (!byKey) FOE_LOOK_PAL.set(lk.coats, (byKey = Object.create(null)));
      base = foePal0({ pat: "tabby", fur: hexOr(c.fur, "#e8c9a0"), dark: hexOr(c.dark, "#b58a5a"), light: hexOr(c.light, "#fff3dc"), eye: hexOr(c.eye, "#7bdc5a") }, frozen, "c" + ci, byKey);
    } else base = foePal0(FOE_COATS[ci], frozen, "c" + ci, FOE_PAL);
    if (!lk || !(lk.collar || lk.tag || lk.acc)) return base;
    let byKey = FOE_LOOK_PAL.get(lk); if (!byKey) FOE_LOOK_PAL.set(lk, (byKey = Object.create(null)));
    const key = (coats ? "x" : "c") + ci + (frozen ? "f" : "n");
    if (byKey[key]) return byKey[key];
    const w = frozen ? 0.5 : 0, tint = "#8fd0ff", m = (cc) => (w ? mixc(cc, tint, w) : cc);
    const P = Object.assign({}, base);
    if (lk.collar === "rainbow") P.rb = RAINBOW.map(m); else if (lk.collar) P.collar = m(hexOr(lk.collar, "#d6392f"));
    if (lk.tag) P.tag = m(hexOr(lk.tag, "#ffd24a"));
    P.acc = typeof lk.acc === "string" ? lk.acc : ""; P.apat = lk.pat === "check" ? "check" : "dots"; P.a1 = m(hexOr(lk.c1, "#e8403a")); P.a2 = m(hexOr(lk.c2, "#ffffff"));
    byKey[key] = P;
    return P;
  }
  function limb(c, hx, top, sw, w, col, paw, ground) { // uma pata: traço redondo do quadril ao pé, com a patinha por cima
    const fx = hx + sw, fy = ground - (sw > 0 ? sw * 0.3 : 0);
    c.lineCap = "round"; c.beginPath(); c.moveTo(hx, top); c.lineTo(fx, fy);
    c.strokeStyle = LINE; c.lineWidth = w + 1.5; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    oval(c, fx + 0.5, fy + 0.1, w * 0.78, w * 0.52, paw);
  }
  const FS = { pal: null, mode: "patrol", st: 1, wag: 0, l1: 0, l2: 0, l3: 0, l4: 0, headA: 0, blink: false, flap: 0, t: 0, calm: false, frozen: false };
  function foeAcc(c, P, ac, cr) { // enfeites da skin, no grupo da cabeça (cabeça centrada em (3.6, -3.4))
    if (ac === "bandana") {
      const ax = 2.8, ty = 0.9, a = [ax - 4.2, ty], b = [ax + 4.8, ty + 0.4], t = [ax + 0.3, ty + 8];
      c.fillStyle = P.a1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.closePath(); c.fill();
      if (P.apat === "check") { c.save(); c.clip(); c.fillStyle = P.a2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) c.fillRect(ax - 4.4 + i * 2.4, ty - 0.2 + j * 2.3, 2.4, 2.3); c.restore(); }
      else { dot(c, ax - 1.8, ty + 1.8, 0.9, P.a2); dot(c, ax + 1.8, ty + 2.2, 0.9, P.a2); dot(c, ax, ty + 4.4, 0.9, P.a2); }
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.closePath(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
    } else if (ac === "bowtie") {
      const bx = 3, by = 2.2; tri(c, bx, by, bx - 4.6, by - 2.8, bx - 4.6, by + 2.8, P.a1, true); tri(c, bx, by, bx + 4.6, by - 2.8, bx + 4.6, by + 2.8, P.a1, true); dot(c, bx, by, 1.4, P.a2);
    } else if (ac === "hat") {
      const bx = 3.4, by = -8.2; tri(c, bx - 3.3, by + 1, bx + 3.3, by + 1, bx + 0.6, by - 8.6, P.a1, true); dot(c, bx - 0.4, by - 1.8, 0.8, P.a2); dot(c, bx + 1.2, by - 4.2, 0.7, P.a2); dot(c, bx + 0.6, by - 8.6, 1.4, P.a2);
    } else if (ac === "bow") {
      const bx = 1.2, by = -7.6; tri(c, bx, by, bx - 3.4, by - 2.6, bx - 3.4, by + 2.2, P.a1, true); tri(c, bx, by, bx + 3.4, by - 2.6, bx + 3.4, by + 2.2, P.a1, true); dot(c, bx, by, 1.2, P.a2);
    }
  }
  function foeSide(c, D) {
    const P = D.pal, mode = D.mode, chase = mode === "chase", flee = mode === "flee", search = mode === "search", idle = mode === "idle", st = D.st, wg = D.wag;
    const rx = 9.6 * st, ry = 6.1, bx = -1.4, by = 1.9 + (chase ? 1.7 : flee ? 1.3 : 0);
    const lw = 3.1, top = by + ry * 0.45, ground = 10.9, fH = bx + rx - 3.4, bH = bx - rx + 3.4;
    limb(c, fH + 1.8, top, D.l2, lw, P.shade, P.pawShade, ground); limb(c, bH + 1.8, top, D.l4, lw, P.shade, P.pawShade, ground);
    // rabo
    const x0 = bx - rx + 1, y0 = by - 1.3;
    c.lineCap = "round"; c.lineJoin = "round";
    let c1x = x0 - 4.5, c1y = y0 + 0.3, c2x = x0 - 6.4 + wg * 0.4, c2y = y0 - 6.5, ex = x0 - 2.6 + wg, ey = y0 - 12.4;
    if (chase) { c1x = x0 - 4; c1y = y0 - 0.4; c2x = x0 - 8; c2y = y0 - 1.2 + wg * 0.3; ex = x0 - 13; ey = y0 - 2.6 + wg * 0.8; }
    else if (flee) { c1x = x0 - 2.6; c1y = y0 + 3; c2x = x0 - 1; c2y = y0 + 8; ex = x0 + 4; ey = y0 + 9.2; }
    else if (search) { c1x = x0 - 4; c1y = y0 + 1; c2x = x0 - 8; c2y = y0 + 3.5; ex = x0 - 11 + wg * 0.4; ey = y0 + 3.2; }
    const tw = chase ? 4.4 : 3.2;
    c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    c.strokeStyle = LINE; c.lineWidth = tw + 1.6; c.stroke(); c.strokeStyle = P.pat === "points" ? P.dark : P.fur; c.lineWidth = tw; c.stroke();
    if (P.pat === "tabby") { c.lineCap = "butt"; c.strokeStyle = P.dark; c.lineWidth = tw; c.beginPath(); bezPart(c, x0, y0, c1x, c1y, c2x, c2y, ex, ey, 0.5, 0.62, 3); bezPart(c, x0, y0, c1x, c1y, c2x, c2y, ex, ey, 0.82, 1, 3); c.stroke(); c.lineCap = "round"; }
    // corpo
    clipOval(c, bx, by, rx, ry, 0); oval(c, bx, by, rx, ry, P.fur);
    oval(c, bx, by + ry * 0.62, rx * 0.88, ry * 0.42, P.light);
    if (P.pat === "tabby") { c.lineCap = "round"; c.strokeStyle = P.dark; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i < 5; i++) { const sx = bx - rx * 0.62 + i * rx * 0.3; c.moveTo(sx, by - ry - 0.5); c.quadraticCurveTo(sx - 0.8, by - ry + 2.4, sx + 0.4, by - ry + 4.6); } c.stroke(); }
    else if (P.pat === "patch") { oval(c, bx - rx * 0.28, by - ry * 0.3, rx * 0.36, ry * 0.52, P.dark, 0.2); oval(c, bx + rx * 0.42, by - ry * 0.55, rx * 0.26, ry * 0.4, P.dark2, -0.3); }
    else if (P.pat === "points") oval(c, bx - rx * 0.1, by - ry * 0.9, rx * 0.95, ry * 0.5, mixc(P.fur, P.dark, 0.25));
    c.globalAlpha = A0 * 0.1; oval(c, bx, by + ry * 0.72, rx * 0.95, ry * 0.5, "#000000"); c.globalAlpha = A0 * 0.16; oval(c, bx - 0.6, by - ry * 0.58, rx * 0.55, ry * 0.24, "#ffffff"); c.globalAlpha = A0;
    c.restore();
    c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.ellipse(bx, by, rx, ry, 0, 0, TAU); c.stroke();
    limb(c, fH, top, D.l1, lw, P.fur, P.pat === "points" ? P.dark : P.light, ground); limb(c, bH, top, D.l3, lw, P.fur, P.pat === "points" ? P.dark : P.light, ground);
    // pescoço e cabeça num grupo que gira (cabeça baixa farejando, esticada perseguindo)
    const nX = bx + rx - 2.4, nY = by - ry * 0.58;
    c.save(); c.translate(nX, nY); c.rotate(D.headA);
    if (P.rb) { c.lineCap = "butt"; for (let i = 0; i < 4; i++) seg(c, -1 - 0.1 * i, -3.6 + i * 2.1, -0.9 - 0.1 * i, -3.6 + (i + 1) * 2.1, P.rb[i], 3.2); c.lineCap = "round"; }
    else if (P.collar) { seg(c, -1.4, -4, -0.8, 5, P.collar, 3.2); if (P.tag) dot(c, -0.4, 5.8, 1.4, P.tag); }
    const hx = 3.4, hy = -3.2, rxH = 6.3, ryH = 5.5, back = chase ? 0.9 : flee ? 0.7 : 0, fwd = search ? 0.6 : 0;
    // orelhas pontudas (deitadas para trás ao perseguir ou fugir)
    const eT = (ex2, bx2, lean, fill, inn) => { tri(c, bx2 - 2.6, hy - ryH * 0.6, bx2 + 2.6, hy - ryH * 0.6, ex2 + lean, hy - ryH - 5.4 + back * 2.4, fill, true); if (inn) tri(c, bx2 - 1.2, hy - ryH * 0.56, bx2 + 1.2, hy - ryH * 0.56, ex2 + lean * 0.9, hy - ryH - 3 + back * 1.8, inn, false); };
    eT(hx + 3.2, hx + 2.3, -back * 5 + fwd, P.pat === "points" ? P.dark : P.shade, P.inner); eT(hx - 2.2, hx - 1.8, -back * 5.4, P.pat === "points" ? P.dark : P.fur, P.inner);
    clipOval(c, hx, hy, rxH, ryH, 0); oval(c, hx, hy, rxH, ryH, P.fur);
    if (P.pat === "tabby") { c.strokeStyle = P.dark; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(hx - 1.2 + i * 1.8, hy - ryH + 0.3); c.lineTo(hx - 1 + i * 1.8, hy - ryH + 3 - (i === 0 ? 0 : 0.6)); } c.stroke(); }
    else if (P.pat === "patch") oval(c, hx - rxH * 0.3, hy - ryH * 0.7, rxH * 0.55, ryH * 0.5, P.dark);
    else if (P.pat === "points") oval(c, hx + rxH * 0.7, hy + ryH * 0.32, rxH * 0.5, ryH * 0.62, P.dark);
    c.globalAlpha = A0 * 0.16; oval(c, hx - rxH * 0.2, hy - ryH * 0.55, rxH * 0.5, ryH * 0.22, "#ffffff"); c.globalAlpha = A0;
    c.restore();
    c.strokeStyle = LINE; c.lineWidth = 1; c.beginPath(); c.ellipse(hx, hy, rxH, ryH, 0, 0, TAU); c.stroke();
    const mx = hx + rxH * 0.6, my = hy + ryH * 0.36;
    ovalL(c, mx, my, rxH * 0.42, ryH * 0.36, P.pat === "points" ? P.dark : P.light, 0, 0.7);
    tri(c, hx + rxH - 1.3, hy - 0.5, hx + rxH + 0.9, hy, hx + rxH - 0.2, hy + 1.2, P.nose, false);
    if (chase) { oval(c, mx - 0.4, my + 1.9, 2.3, 1.7, "#6e1424"); tri(c, mx - 1.8, my + 0.9, mx - 1, my + 0.9, mx - 1.4, my + 2.4, "#ffffff", false); tri(c, mx + 0.4, my + 0.9, mx + 1.2, my + 0.9, mx + 0.8, my + 2.4, "#ffffff", false); }
    else seg(c, hx + rxH - 0.4, hy + 1.1, hx + rxH - 1.3, hy + 2.1, "rgba(0,0,0,.45)", 0.6);
    whisk(c, mx + 1, my - 0.2, 5, -1.2);
    // olho: com fenda (normal), estreito e bravo (perseguindo) ou arregalado (fugindo)
    const ex0 = hx + rxH * 0.36, ey0 = hy - ryH * 0.12;
    if (D.blink) { c.lineCap = "round"; c.strokeStyle = "#241810"; c.lineWidth = 1.1; c.beginPath(); c.moveTo(ex0 - 1.9, ey0); c.quadraticCurveTo(ex0, ey0 + 1.2, ex0 + 1.9, ey0); c.stroke(); }
    else if (flee) { dot(c, ex0, ey0, 2.5, "#ffffff"); dot(c, ex0 + 0.5, ey0, 1.2, "#101014"); c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.6; c.beginPath(); c.arc(ex0, ey0, 2.5, 0, TAU); c.stroke(); }
    else {
      const ry2 = chase ? 1.25 : 2.1; oval(c, ex0, ey0, 2, ry2, P.eye); c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.6; c.stroke();
      oval(c, ex0 + 0.1, ey0, chase ? 0.6 : 0.8, ry2 * 0.9, "#101014"); if (!chase) dot(c, ex0 + 0.8, ey0 - 0.8, 0.5, "#ffffff");
      if (chase) seg(c, ex0 - 2.8, ey0 - 2.7, ex0 + 2, ey0 - 1.1, P.dark, 1.5);
    }
    foeAcc(c, P, P.acc, 0);
    c.restore();
  }
  function whisk(c, x, y, dx, dy) { c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 0.55; c.lineCap = "round"; c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(x, y + i * 0.7); c.lineTo(x + dx, y + dy + i * 2); } c.stroke(); }
  const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  function bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, a, b, n) { // acrescenta ao caminho a parte [a, b] de uma curva de Bézier
    c.moveTo(bz(x0, x1, x2, x3, a), bz(y0, y1, y2, y3, a));
    for (let i = 1; i <= n; i++) { const t = a + ((b - a) * i) / n; c.lineTo(bz(x0, x1, x2, x3, t), bz(y0, y1, y2, y3, t)); }
  }

  function drawFoeCat(ctx, d, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    d = d || {}; o = o || {};
    const x = num(d.x, 0), y = num(d.y, 0), dir = d.dir < 0 ? -1 : 1;
    const mode = d.mode === "chase" || d.mode === "flee" || d.mode === "search" || d.mode === "idle" ? d.mode : "patrol";
    const sz = d.size === "small" ? 0.8 : d.size === "large" ? 1.2 : 1;
    const idx = floor(num(d.idx, 0)), calm = !!o.calm, frozen = !!d.frozen, ti = calm ? 0 : num(o.time, 0), ph0 = idx * 1.7;
    const flee = mode === "flee", chase = mode === "chase", search = mode === "search", idle = mode === "idle";
    const P = foePal(idx, frozen, look(o));
    LINE = P.line;
    FS.pal = P; FS.mode = mode; FS.calm = calm; FS.frozen = frozen;
    FS.st = chase ? 1.1 : 1;
    const speed = chase ? 20 : flee ? 22 : search ? 6 : 11, amp = chase ? 5 : flee ? 2.4 : search ? 2 : 3.2, walkish = !frozen && !idle;
    const phase = calm ? (x + y) * 0.0785 * dir + ph0 : ti * speed + ph0, sw = walkish ? sin(phase) * amp : 0;
    if (chase) { FS.l1 = 3 + sw * 1.1; FS.l2 = 2 + sw * 0.9; FS.l3 = -3 - sw * 1.1; FS.l4 = -2.2 - sw * 0.9; } else { FS.l1 = sw; FS.l4 = sw; FS.l2 = -sw; FS.l3 = -sw; }
    FS.wag = calm || frozen ? 0 : sin(ti * (chase ? 14 : idle ? 4 : 7) + ph0) * (chase ? 1.4 : 2.2);
    FS.headA = chase ? -0.12 : search ? 0.62 + (calm ? 0 : sin(ti * 9 + ph0) * 0.06) : flee ? 0.1 : idle ? -0.08 : 0;
    FS.blink = !calm && !frozen && (idle || mode === "patrol") && mod(ti + ph0, 4.4) < 0.13;
    const bob = calm || frozen || !walkish ? 0 : sin(phase * 2) * (chase ? 0.9 : 0.5);
    const sc = sz * 0.9, a0 = d.slow ? A0 * 0.55 : A0; // já devagar (reforço): esmaecido
    A0 = a0;
    ctx.save();
    ctx.globalAlpha = a0;
    ctx.translate(x, y + 11 * sc); ctx.scale(dir * sc, sc); ctx.translate(0, -11 + bob);
    ctx.lineJoin = "round";
    ctx.globalAlpha = a0 * 0.26; oval(ctx, 0, 11 - bob, 13, 3.6, "#000000"); ctx.globalAlpha = a0;
    foeSide(ctx, FS);
    ctx.restore();
    if (flee) { // estrelinhas girando em volta da cabeça
      ctx.save(); ctx.globalAlpha = a0;
      for (let k = 0; k < 3; k++) { const a = (calm ? 0 : ti * 5) + k * 2.1; star4(ctx, x + dir * 6 * sc + cos(a) * 9 * sc, y - 15 * sc + sin(a) * 3 * sc, 2.5, "#ffe066"); }
      ctx.restore();
    }
    if (frozen) { ctx.save(); ctx.globalAlpha = A0 * 0.85; star4(ctx, x - 6 * sc, y - 6 * sc, 2.4, "#ffffff"); star4(ctx, x + 8 * sc * dir, y - 11 * sc, 2, "#ffffff"); ctx.restore(); }
    A0 = alphaIn(ctx);
  }

  // ---------- o gavião ----------
  const HAWK_COATS = [
    { fur: "#a1714a", dark: "#5e3d26", light: "#f6e9d2", wing: "#82583a" }, // pardo
    { fur: "#9aa5b6", dark: "#4f5868", light: "#f0f3f8", wing: "#74808f" }, // cinzento
    { fur: "#bf7b46", dark: "#6e4020", light: "#faebd0", wing: "#9a5e34" }, // ruivo
  ];
  const HAWK_PAL = Object.create(null), HAWK_LOOK_PAL = new WeakMap();
  function hawkPal0(src, frozen, key, cache) {
    const k = key + (frozen ? "f" : "n");
    if (cache[k]) return cache[k];
    const w = frozen ? 0.55 : 0, tint = "#8fd0ff", m = (cc) => (w ? mixc(cc, tint, w) : cc);
    const P = { fur: m(src.fur), dark: m(src.dark), light: m(src.light), wing: m(src.wing), shade: m(mixc(src.fur, "#000000", 0.2)), beak: m("#f3c34a"), tipb: m("#3a3a44"), eye: frozen ? "#e4f6ff" : "#ffd83a", talon: m("#f0c040"), line: frozen ? "rgba(40,90,140,.6)" : "rgba(40,22,10,.55)", acc: "", a1: "#e8403a", a2: "#ffffff", frozen };
    cache[k] = P;
    return P;
  }
  function hawkPal(idx, frozen, lk) {
    const coats = lk && Array.isArray(lk.coats) && lk.coats.length ? lk.coats : null, n = coats ? coats.length : 3, ci = ((idx % n) + n) % n;
    let base;
    if (coats) {
      const c = coats[ci] || {};
      let byKey = HAWK_LOOK_PAL.get(lk.coats); if (!byKey) HAWK_LOOK_PAL.set(lk.coats, (byKey = Object.create(null)));
      base = hawkPal0({ fur: hexOr(c.fur, "#a1714a"), dark: hexOr(c.dark, "#5e3d26"), light: hexOr(c.light, "#f6e9d2"), wing: hexOr(c.wing, "#82583a") }, frozen, "c" + ci, byKey);
    } else base = hawkPal0(HAWK_COATS[ci], frozen, "c" + ci, HAWK_PAL);
    if (!lk || !lk.acc) return base;
    let byKey = HAWK_LOOK_PAL.get(lk); if (!byKey) HAWK_LOOK_PAL.set(lk, (byKey = Object.create(null)));
    const key = (coats ? "x" : "c") + ci + (frozen ? "f" : "n");
    if (byKey[key]) return byKey[key];
    const w = frozen ? 0.5 : 0, m = (cc) => (w ? mixc(cc, "#8fd0ff", w) : cc);
    const P = Object.assign({}, base); P.acc = typeof lk.acc === "string" ? lk.acc : ""; P.a1 = m(hexOr(lk.c1, "#e8403a")); P.a2 = m(hexOr(lk.c2, "#ffffff"));
    byKey[key] = P;
    return P;
  }
  function hawkWing(c, P, x0, y0, ang, len, wd, far) { // asa larga de gavião: leque de seis penas, as de trás mais escuras e com a ponta preta
    c.save(); c.translate(x0, y0); c.rotate(ang);
    const n = 6;
    for (let i = n - 1; i >= 0; i--) {
      const a = (i - 2.5) * 0.14, col = mixc(far ? mixc(P.wing, "#000000", 0.2) : P.wing, P.dark, i / (n - 1) * 0.75);
      c.fillStyle = col; c.beginPath(); c.ellipse(cos(a) * len * 0.55, sin(a) * len * 0.55, len * 0.5, wd * 0.22, a, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = P.dark; c.beginPath(); c.ellipse(cos(a) * len * 0.94, sin(a) * len * 0.94, len * 0.1, wd * 0.16, a, 0, TAU); c.fill();
    }
    const cov = far ? mixc(P.fur, "#000000", 0.18) : P.fur;
    oval(c, len * 0.2, 0, len * 0.27, wd * 0.28, cov); c.strokeStyle = LINE; c.lineWidth = 0.8; c.beginPath(); c.ellipse(len * 0.2, 0, len * 0.27, wd * 0.28, 0, 0, TAU); c.stroke();
    if (!far) { dot(c, len * 0.32, -wd * 0.06, 0.8, P.light); dot(c, len * 0.2, wd * 0.12, 0.7, P.light); }
    c.restore();
  }
  const HS = { pal: null, mode: "patrol", wa: 0, tilt: 0, diving: false, calm: false, frozen: false, beak: 0, blink: false, fan: 0 };
  function hawkBody(c, D) {
    const P = D.pal, chase = D.mode === "chase", search = D.mode === "search", idle = D.mode === "idle", dv = D.diving;
    c.save(); c.rotate(D.tilt);
    const rx = 9.6, ry = 5, hx = rx - 0.4 + (chase || dv ? 1.2 : 0), hy = -2.6 + (dv ? 1.4 : 0) + (search ? 1.6 : 0), hr = 3.9;
    // cauda em leque, listrada
    const tb = PI + (idle ? -0.5 : 0.1) + (dv ? 0.1 : 0);
    for (let i = 0; i < 3; i++) { const a = tb + (i - 1) * 0.2, L = i === 1 ? 10.5 : 9; c.fillStyle = mixc(P.fur, P.dark, 0.25 + 0.15 * (i === 1 ? 1 : 0)); c.beginPath(); c.ellipse(-rx + 1.4 + cos(a) * L * 0.5, 0.8 + sin(a) * L * 0.5, L * 0.5, 2.3, a, 0, TAU); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke(); }
    c.strokeStyle = P.light; c.lineWidth = 0.9; c.lineCap = "round"; c.beginPath(); c.moveTo(-rx - 4.2, 0.9); c.lineTo(-rx - 4.2, 3.6); c.moveTo(-rx - 7.5, 0.5); c.lineTo(-rx - 7.5, 3.4); c.stroke();
    // asa do lado de lá (atrás do corpo)
    if (dv) hawkWing(c, P, 2, -1.2, PI - 0.3, 13, 6, true); else hawkWing(c, P, 2.2, -2.4, D.wa - 1.95, 19, 9, true);
    // pernas com garras (recolhidas; esticadas para a frente no mergulho)
    const lg = dv ? 1 : 0;
    for (let s = 0; s < 2; s++) { const lx = 0.5 + s * 2.2 + lg * 3, ly = ry - 0.8; seg(c, lx, ly, lx + 0.6 + lg * 4, ly + 3.2 - lg * 1.5, LINE, 2.6); seg(c, lx, ly, lx + 0.6 + lg * 4, ly + 3.2 - lg * 1.5, P.talon, 1.5); seg(c, lx + 0.6 + lg * 4, ly + 3.2 - lg * 1.5, lx + 2.8 + lg * 5, ly + 3.8 - lg * 1.8, P.talon, 1.2); }
    sil(c, [[0, 0, rx, ry, 0, P.fur], [hx, hy, hr, hr * 0.95, 0, P.fur]]);
    clipOval(c, 0, 0, rx, ry, 0); oval(c, 1.5, ry * 0.55, rx * 0.92, ry * 0.66, P.light);
    c.strokeStyle = P.dark; c.lineWidth = 0.9; c.lineCap = "round"; c.beginPath(); for (let i = 0; i < 4; i++) { const sx = -3.6 + i * 2.7; c.moveTo(sx, 1.2 + (i % 2) * 0.6); c.lineTo(sx + 1.2, 1.6 + (i % 2) * 0.6); c.moveTo(sx - 0.2, 3.3); c.lineTo(sx + 1.1, 3.6); } c.stroke();
    c.globalAlpha = A0 * 0.16; oval(c, -0.8, -ry * 0.55, rx * 0.6, ry * 0.26, "#ffffff"); c.globalAlpha = A0;
    c.restore();
    // cabeça: sobrancelha brava, olho amarelo e bico curvo
    clipOval(c, hx, hy, hr, hr * 0.95, 0); oval(c, hx - 1, hy - 1.6, hr, hr * 0.65, mixc(P.fur, P.dark, 0.3)); c.restore();
    const ex0 = hx + 1.5, ey0 = hy - 0.5;
    if (D.blink) seg(c, ex0 - 1.4, ey0, ex0 + 1.4, ey0, "#241810", 1);
    else { dot(c, ex0, ey0, 1.65, P.eye); dot(c, ex0 + 0.35, ey0, 0.85, "#15100c"); dot(c, ex0 + 0.6, ey0 - 0.5, 0.3, "#ffffff"); }
    seg(c, ex0 - 2.4, ey0 - 2.2, ex0 + 2.2, ey0 - 0.9, P.dark, 1.3);
    const bx2 = hx + hr * 0.7, by2 = hy + 0.1, op = D.beak;
    c.fillStyle = P.beak; c.beginPath(); c.moveTo(bx2, by2 - 1.6); c.quadraticCurveTo(bx2 + 4.2, by2 - 1.5, bx2 + 4.7, by2 + 2.1); c.quadraticCurveTo(bx2 + 3.3, by2 + 0.5, bx2, by2 + 0.9 + op * 0.4); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = P.tipb; c.beginPath(); c.moveTo(bx2 + 3.3, by2 - 0.7); c.quadraticCurveTo(bx2 + 4.5, by2 - 0.2, bx2 + 4.7, by2 + 2.1); c.quadraticCurveTo(bx2 + 3.9, by2 + 1, bx2 + 3.3, by2 + 0.7); c.closePath(); c.fill();
    if (op > 0) { tri(c, bx2, by2 + 1.2 + op * 0.4, bx2 + 3, by2 + 1.6 + op * 1.6, bx2, by2 + 2.4 + op * 1.2, mixc(P.beak, "#000000", 0.15), true); }
    if (P.acc === "scarf") { seg(c, hx - 2.4, hy + hr * 0.78, hx + 1.9, hy + hr * 0.95, P.a1, 2.8); seg(c, hx - 1.3, hy + hr * 0.92, hx - 2.6, hy + hr * 0.92 + 3, P.a1, 2.2); seg(c, hx - 1, hy + hr * 0.8, hx + 0.6, hy + hr * 0.9, P.a2, 0.9); }
    else if (P.acc === "hat") { tri(c, hx - 2.9, hy - hr * 0.8, hx + 2.3, hy - hr * 0.8, hx - 0.3, hy - hr - 6.6, P.a1, true); dot(c, hx - 0.5, hy - hr - 1.6, 0.7, P.a2); dot(c, hx - 0.3, hy - hr - 6.6, 1.2, P.a2); }
    else if (P.acc === "bow") { const bx3 = hx - 1.8, by3 = hy - hr * 0.8; tri(c, bx3, by3, bx3 - 3, by3 - 2.3, bx3 - 3, by3 + 2, P.a1, true); tri(c, bx3, by3, bx3 + 3, by3 - 2.3, bx3 + 3, by3 + 2, P.a1, true); dot(c, bx3, by3, 1.1, P.a2); }
    else if (P.acc === "band") { seg(c, hx - 3.2, hy - hr * 0.52, hx + 3.2, hy - hr * 0.6, P.a1, 1.9); dot(c, hx - 0.2, hy - hr * 0.56, 0.7, P.a2); }
    // asa do lado de cá (por cima do corpo)
    if (dv) hawkWing(c, P, 1.4, -1.8, PI - 0.1, 14, 6.5, false); else hawkWing(c, P, 1.4, -2.8, D.wa - 2.2, 21, 9.5, false);
    c.restore();
  }
  function drawHawk(ctx, d, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    d = d || {}; o = o || {};
    const x = num(d.x, 0), y = num(d.y, 0), dir = d.dir < 0 ? -1 : 1;
    const mode = d.mode === "chase" || d.mode === "search" || d.mode === "idle" || d.mode === "flee" ? d.mode : "patrol", dv = !!d.diving, frozen = !!d.frozen;
    const idx = floor(num(d.idx, 0)), calm = !!o.calm, ti = calm ? 0 : num(o.time, 0), ph0 = idx * 1.3;
    const P = hawkPal(idx, frozen, look(o));
    LINE = P.line;
    HS.pal = P; HS.mode = mode; HS.diving = dv; HS.calm = calm; HS.frozen = frozen;
    // batida das asas: o ângulo balança com o relógio (congelado e `calm` ficam parados no meio da batida)
    const rate = mode === "chase" ? 14 : mode === "idle" ? 10 : mode === "search" ? 3.2 : mode === "flee" ? 16 : 7.5, amp = mode === "search" ? 0.2 : mode === "idle" ? 0.5 : mode === "chase" ? 0.5 : 0.62;
    const bias = mode === "chase" ? -0.3 : mode === "flee" ? -0.35 : mode === "search" ? 0.28 : mode === "idle" ? -0.15 : 0;
    HS.wa = frozen || dv ? bias * 0.5 : (calm ? 0 : sin(ti * rate + ph0) * amp) + bias;
    HS.tilt = dv ? 0.95 : mode === "chase" ? 0.16 : mode === "search" ? 0.1 + (calm ? 0 : sin(ti * 1.6 + ph0) * 0.05) : mode === "idle" ? -0.38 : 0;
    HS.beak = mode === "chase" || dv ? 1 : 0;
    HS.blink = !calm && !frozen && mode !== "chase" && !dv && mod(ti + ph0, 5.1) < 0.12;
    const alt = dv ? 3 : 8, bobY = calm || frozen || dv ? 0 : sin(ti * (mode === "idle" ? 5 : 2.2) + ph0) * 0.9;
    const sc = 0.95, a0 = d.slow ? A0 * 0.55 : A0;
    ctx.save();
    // sombra elíptica no chão (maior quando voa alto; o mergulho a encolhe e escurece)
    ctx.globalAlpha = a0 * (dv ? 0.36 : 0.26); oval(ctx, x, y + 11.5, dv ? 7.5 : 12 - (calm ? 0 : 0.8 * sin(ti * rate + ph0)) * (frozen ? 0 : 1), dv ? 2.6 : 3.7, "#000000");
    A0 = a0; ctx.globalAlpha = a0;
    ctx.translate(x, y - alt + bobY); ctx.scale(dir * sc, sc);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    hawkBody(ctx, HS);
    ctx.restore();
    if (dv) { ctx.save(); ctx.globalAlpha = a0 * 0.5; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { const sx = x - dir * (8 + i * 3), sy = y - alt - 12 - i * 3; ctx.moveTo(sx, sy); ctx.lineTo(sx - dir * 4, sy - 7); } ctx.stroke(); ctx.restore(); }
    if (frozen) { ctx.save(); ctx.globalAlpha = A0 * 0.85; star4(ctx, x - 8 * sc, y - 12, 2.4, "#ffffff"); star4(ctx, x + 9 * sc * dir, y - 17, 2, "#ffffff"); ctx.restore(); }
    A0 = alphaIn(ctx);
  }

  // ====================================================================================================================
  //  A SEMENTE, A MINHOCA E O FRUTO
  // ====================================================================================================================
  const SEEDS = [
    { body: "#f5eed9", stripe: "#3b3340", hi: "#ffffff" }, // girassol, listrada
    { body: "#f2c244", stripe: "#b9841c", hi: "#fff0a8" }, // painço dourado
    { body: "#d6a468", stripe: "#8a5a2b", hi: "#f6dcb0" }, // redonda, com broto
  ];
  function drawSeed(ctx, it, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    it = it || {}; o = o || {};
    const vr = ((floor(num(it.variant, 0)) % 3) + 3) % 3, lk = look(o), cs = lk && Array.isArray(lk.coats) && lk.coats.length ? lk.coats : null, src = cs ? cs[vr % cs.length] || {} : {};
    const S0 = SEEDS[vr], body = hexOr(src.body, S0.body), stripe = hexOr(src.stripe, S0.stripe), hi = hexOr(src.hi, S0.hi), glow = lk && lk.glow ? hexOr(lk.glow, null) : null;
    const x = num(it.x, 0), y = num(it.y, 0), calm = !!o.calm, ti = calm ? 0 : num(o.time, 0);
    const cx = x + 8, cy = y + 8 + (calm ? 0 : sin(ti * 3.4 + x * 0.37) * 0.9);
    ctx.save(); LINE = "rgba(40,22,10,.55)"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.globalAlpha = A0 * 0.28; oval(ctx, cx, y + 13.4, 6.4, 2, "#000000"); ctx.globalAlpha = A0 * 0.3; dot(ctx, cx, cy, 9, glow || "#ffffff"); ctx.globalAlpha = A0; // (um brilho claro por baixo: a semente aparece em qualquer chão, também à noite)
    ctx.translate(cx, cy);
    if (vr === 0) { // semente de girassol: gota listrada
      ctx.rotate(-0.6);
      ctx.beginPath(); ctx.moveTo(0, -6.8); ctx.bezierCurveTo(4.6, -2.6, 4.2, 3.4, 0, 6.2); ctx.bezierCurveTo(-4.2, 3.4, -4.6, -2.6, 0, -6.8); ctx.closePath();
      ctx.fillStyle = body; ctx.fill(); ctx.save(); ctx.clip();
      ctx.strokeStyle = stripe; ctx.lineWidth = 1.2; ctx.beginPath(); for (const sx of [-2.4, 0, 2.4]) { ctx.moveTo(sx * 0.5, -7); ctx.quadraticCurveTo(sx * 1.6, 0, sx * 0.8, 7); } ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, -6.8); ctx.bezierCurveTo(4.6, -2.6, 4.2, 3.4, 0, 6.2); ctx.bezierCurveTo(-4.2, 3.4, -4.6, -2.6, 0, -6.8); ctx.closePath(); ctx.strokeStyle = LINE; ctx.lineWidth = 1.1; ctx.stroke();
      oval(ctx, -1.5, -2.4, 0.9, 2, hi, 0.2);
    } else if (vr === 1) { // pendão de painço: talo curvo com cinco grãos dourados
      ctx.strokeStyle = LINE; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-3, 7); ctx.quadraticCurveTo(-2, -1, 4, -7); ctx.stroke(); ctx.strokeStyle = "#9a8a3c"; ctx.lineWidth = 1.2; ctx.stroke();
      const gr = [[-2.8, 4.6, -0.6], [-1.3, 0.8, -0.8], [2.2, -3.8, -0.9], [-2.6, -1.4, 0.5], [0.8, -5.4, 0.3]];
      for (let i = 0; i < gr.length; i++) { const g = gr[i]; ovalL(ctx, g[0] + (g[2] > 0 ? 1.4 : -1.4), g[1], 1.9, 3.1, body, g[2], 0.9); oval(ctx, g[0] + (g[2] > 0 ? 1.4 : -1.4) - 0.5, g[1] - 0.8, 0.5, 1.2, hi, g[2]); }
      ctx.strokeStyle = stripe; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(4.6, -7.6); ctx.lineTo(6.2, -9.4); ctx.moveTo(5.2, -6.8); ctx.lineTo(7.2, -8); ctx.stroke();
    } else { // semente redonda com um brotinho
      ovalL(ctx, 0, 2, 4.8, 4.5, body, 0, 1.1); ctx.strokeStyle = stripe; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 2.2, 2.9, PI * 0.15, PI * 0.8); ctx.stroke();
      oval(ctx, -1.6, 0.4, 1.3, 1.9, hi, 0.5);
      seg(ctx, 0, -2.2, 0.4, -4.6, "#4f9a3c", 1.2);
      leaf(ctx, 0.4, -4.4, 5.2, -2.45, "#6fd06a", "#3f8a3a"); leaf(ctx, 0.4, -4.4, 5.2, -0.7, "#8fe07a", "#3f8a3a");
    }
    ctx.restore();
  }

  const WORMS = [
    { body: "#f2a0a6", belly: "#fbd2d4", band: "#dd7a88" }, // rosa
    { body: "#e8a27c", belly: "#f6d0b8", band: "#cf7b52" }, // salmão
    { body: "#d6a0d8", belly: "#efd0f0", band: "#b878bb" }, // lilás
    { body: "#e9bd84", belly: "#f8dfb8", band: "#c98d4c" }, // ocre
  ];
  function wormAcc(c, lk, ti, calm) { // enfeites da skin: gorrinho, laço ou cachecol (em coordenadas da cabeça: a origem é o centro dela e o rosto olha para a direita)
    const c1 = hexOr(lk.c1, "#e8403a"), c2 = hexOr(lk.c2, "#ffffff"), ac = lk.acc;
    if (ac === "cap") { tri(c, -2.8, -2.2, 3.4, -1.8, 0.4, -7.4, c1, true); c.fillStyle = c2; c.fillRect(-3, -3, 6.8, 1.3); dot(c, 0.4, -7.6, 1.3, c2); }
    else if (ac === "bow") { const bx = -0.6, by = -3.4; tri(c, bx, by, bx - 3.2, by - 2.4, bx - 3.2, by + 2.2, c1, true); tri(c, bx, by, bx + 3.2, by - 2.4, bx + 3.2, by + 2.2, c1, true); dot(c, bx, by, 1.2, c2); }
    else if (ac === "scarf") { seg(c, -2.2, -3.6, -2.2, 3.6, LINE, 3.6); seg(c, -2.2, -3.6, -2.2, 3.6, c1, 2.4); seg(c, -3.2, -1, -1.2, -1, c2, 0.8); seg(c, -3.2, 1.4, -1.2, 1.4, c2, 0.8); const fl = calm ? 0 : sin(ti * 6) * 0.5; seg(c, -2.2, 3.2, -3.6 + fl, 6.6, LINE, 3); seg(c, -2.2, 3.2, -3.6 + fl, 6.6, c1, 1.9); }
  }
  function drawWorm(ctx, b, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    b = b || {}; o = o || {};
    const x = num(b.x, 0), y = num(b.y, 0), vx = num(b.vx, 0), vy = num(b.vy, 0), s = clamp(num(o.r, 8), 2, 40) / 8, calm = !!o.calm, ti = calm ? 0 : num(o.time, 0), hue = floor(num(b.hue, 0));
    const lk = look(o), cs = lk && Array.isArray(lk.coats) && lk.coats.length ? lk.coats : null, hi = ((hue % 4) + 4) % 4, src = cs ? cs[hi % cs.length] || {} : {}, W = WORMS[hi];
    const body = hexOr(src.body, W.body), belly = hexOr(src.belly, W.belly), band = hexOr(src.band, W.band);
    ctx.save(); LINE = "rgba(60,24,24,.55)"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (o.hidden) { // enterrada: só o montinho de terra com o buraquinho
      const jig = calm ? 0 : sin(ti * 5 + hue) * 0.3;
      ctx.globalAlpha = A0 * 0.28; oval(ctx, x + 0.6 * s, y + 4.8 * s, 8.4 * s, 2.4 * s, "#000000"); ctx.globalAlpha = A0;
      ovalL(ctx, x, y + 2.4 * s, 7.6 * s, 4.6 * s + jig, "#9a6a43", 0, 1); oval(ctx, x - 1.5 * s, y + 0.8 * s, 4.6 * s, 2.2 * s, "#b98458");
      oval(ctx, x + 0.4 * s, y + 0.2 * s, 2.3 * s, 1.1 * s, "#4e2f1c");
      for (const [dx, dy, r] of [[-5, 3.8, 0.7], [4.6, 3.2, 0.8], [6.6, 4.6, 0.5], [-2.4, 5.2, 0.6]]) dot(ctx, x + dx * s, y + dy * s, r * s, "#7a4e2c");
      ctx.restore(); return;
    }
    const sp = hypot(vx, vy), run = sp >= 8, side = vx < -0.5 ? -1 : vx > 0.5 ? 1 : hue & 1 ? -1 : 1, ang = run ? atan2(vy, vx * side) * 0.6 : 0;
    ctx.globalAlpha = A0 * 0.24; oval(ctx, x, y + 5.6 * s, 8 * s, 2 * s, "#000000"); ctx.globalAlpha = A0;
    ctx.translate(x, y); ctx.scale(side * s, s); ctx.rotate(ang);
    const N = 9, amp = run ? 2.4 : 1.3, rate = run ? 11 : 3.2, pts = [];
    for (let i = 0; i < N; i++) { const u = i / (N - 1), px = -7.6 + u * 14, py = 1.6 + (calm ? (run ? sin(i * 1.1 + 0.5) * amp : sin(i * 0.9) * amp) : sin(ti * rate - i * 0.95) * amp) * (0.4 + 0.6 * (1 - u)) - (run ? 0 : 0.3 * sin(u * PI) * 2); pts.push(px, py, 1.9 + u * 1.15); }
    ctx.strokeStyle = LINE; ctx.lineWidth = 1.1; for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2] + 0.5, 0, TAU); ctx.stroke(); }
    for (let i = 0; i < N; i++) dot(ctx, pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], i === 6 || i === 7 ? band : body);
    ctx.globalAlpha = A0 * 0.85; for (let i = 0; i < N; i++) oval(ctx, pts[i * 3] - 0.2, pts[i * 3 + 1] + pts[i * 3 + 2] * 0.45, pts[i * 3 + 2] * 0.78, pts[i * 3 + 2] * 0.32, belly); ctx.globalAlpha = A0;
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 0.7; ctx.beginPath(); for (let i = 1; i < N - 1; i++) { ctx.moveTo(pts[i * 3] - 0.8, pts[i * 3 + 1] - pts[i * 3 + 2] * 0.6); ctx.lineTo(pts[i * 3] + 0.6, pts[i * 3 + 1] - pts[i * 3 + 2] * 0.64); } ctx.stroke();
    const hx = pts[(N - 1) * 3], hy = pts[(N - 1) * 3 + 1];
    ctx.save(); ctx.translate(hx, hy);
    dot(ctx, 1.1, -1.3, 0.85, "#1a1014"); dot(ctx, 1.4, -1.6, 0.3, "#ffffff"); dot(ctx, 2.7, -0.3, 0.55, "#1a1014");
    ctx.strokeStyle = "rgba(90,30,40,.7)"; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(1.4, 0.9, 1.1, PI * 0.15, PI * 0.85); ctx.stroke();
    if (lk && lk.acc) wormAcc(ctx, lk, ti, calm);
    ctx.restore();
    ctx.restore();
  }

  const FRUITS = {
    scare: { fill: "#ff5a52", strand: "#b82a2e", hi: "#ffd1c6", glow: null },
    gold: { fill: "#ffd23f", strand: "#c4900c", hi: "#fff2b0", glow: "rgba(255,210,63,.36)" },
    ice: { fill: "#a7e4ff", strand: "#3f8fc8", hi: "#ffffff", glow: "rgba(120,200,255,.4)" },
    turbo: { fill: "#ff9f43", strand: "#c2570c", hi: "#ffd9a8", glow: "rgba(255,120,40,.36)" },
    magnet: { fill: "#b98cf5", strand: "#7a3fc8", hi: "#eadcff", glow: "rgba(180,120,255,.4)" },
  };
  const FRUIT_KEYS = Object.freeze(Object.fromEntries(Object.keys(FRUITS).map((k) => [k, Object.freeze(Object.assign({}, FRUITS[k]))]))); // as cores-chave de cada tipo de poder (cópia congelada, para os testes): nenhuma skin as muda
  const LEAFS = { scare: "#58b85a", gold: "#9ad84a", ice: "#7fd6c0", turbo: "#6cc04a", magnet: "#5fb86a" };
  function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.95); c.bezierCurveTo(x - s * 1.7, y - s * 0.1, x - s * 0.7, y - s * 1.5, x, y - s * 0.5); c.bezierCurveTo(x + s * 0.7, y - s * 1.5, x + s * 1.7, y - s * 0.1, x, y + s * 0.95); c.closePath(); c.fill(); }
  function fruitPattern(c, pat) { // estampas das skins do fruto: só ENFEITE em branco ou cores pequenas por cima da cor do tipo (a cor-chave, a marquinha e o brilho continuam); desenhadas dentro do fruto (clip)
    if (pat === "stripes") { c.strokeStyle = "#ffffff"; c.lineWidth = 1.5; c.globalAlpha = A0 * 0.55; c.beginPath(); for (let i = -2; i <= 2; i++) { c.moveTo(i * 3.4 - 2, -8); c.lineTo(i * 3.4 + 2.4, 10); } c.stroke(); }
    else if (pat === "dots") { c.fillStyle = "#ffffff"; c.globalAlpha = A0 * 0.85; for (const [px, py] of [[-3.6, -1], [1, -3], [-1.2, 3], [3.8, 2.6], [-4.8, 4], [1.6, 5.6]]) { c.beginPath(); c.arc(px, py, 1, 0, TAU); c.fill(); } }
    else if (pat === "hearts") { c.fillStyle = "#ffffff"; c.globalAlpha = A0 * 0.9; heart(c, -3, 1, 1.9); heart(c, 2.6, 3.4, 1.9); heart(c, -0.4, -2.6, 1.3); }
    else if (pat === "stars") { c.globalAlpha = A0 * 0.95; star4(c, -3.2, 1, 1.9, "#ffffff"); star4(c, 2.4, 4, 1.7, "#ffffff"); star4(c, -0.6, -2.8, 1.2, "#ffffff"); }
    else if (pat === "rainbow") { c.globalAlpha = A0; c.lineCap = "butt"; c.lineWidth = 1.1; c.strokeStyle = "#e8403a"; c.beginPath(); c.arc(-2.6, 5.6, 4, PI, TAU); c.stroke(); c.strokeStyle = "#ffc83d"; c.beginPath(); c.arc(-2.6, 5.6, 2.9, PI, TAU); c.stroke(); c.strokeStyle = "#3f86e0"; c.beginPath(); c.arc(-2.6, 5.6, 1.8, PI, TAU); c.stroke(); c.lineCap = "round"; }
  }
  function drawFruit(ctx, it, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    it = it || {}; o = o || {};
    const x = num(it.x, 0), y = num(it.y, 0), kind = FRUITS[it.kind] ? it.kind : "scare", K = FRUITS[kind];
    const calm = !!o.calm, ti = calm ? 0 : num(o.time, 0), lk = look(o);
    const cx = x + 8, cy = y + 8.6 + (calm ? 0 : sin(ti * 3.6 + x) * 1.6), rock = calm ? 0 : sin(ti * 2.1 + x) * 0.14;
    ctx.save(); LINE = "rgba(50,20,20,.55)"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.globalAlpha = A0 * 0.25; oval(ctx, cx, y + 14.2, 6.8, 2.2, "#000000"); ctx.globalAlpha = A0;
    if (K.glow) dot(ctx, cx, cy, 13.5, K.glow);
    ctx.translate(cx, cy); ctx.rotate(rock);
    // talo e folha
    seg(ctx, 0, -4.2, 1, -8, LINE, 2.4); seg(ctx, 0, -4.2, 1, -8, "#7a5230", 1.3);
    leaf(ctx, 1, -7, 6, -0.55, LEAFS[kind], "#2f7a3a");
    // fruto: duas bochechas em cima e uma barriga redonda embaixo (uma só silhueta)
    sil(ctx, [[-2.5, -0.4, 4.9, 4.7, 0, K.fill], [2.5, -0.4, 4.9, 4.7, 0, K.fill], [0, 2.1, 6.3, 5, 0, K.fill]], 2.1);
    clipOval(ctx, 0, 2.1, 6.3, 5, 0); // sombreado de baixo e estampa da skin, dentro do fruto
    ctx.globalAlpha = A0 * 0.42; oval(ctx, 1.2, 5.6, 7.6, 3.6, K.strand); ctx.globalAlpha = A0;
    if (lk && lk.pat) fruitPattern(ctx, lk.pat);
    ctx.globalAlpha = A0; ctx.restore();
    oval(ctx, -3.2, -1.2, 1.9, 1.2, K.hi, -0.7); // brilho
    oval(ctx, -4.6, 1.3, 0.6, 0.6, K.hi);
    ctx.rotate(-rock);
    // marquinha de cada tipo (ajuda quem não distingue as cores) + brilho que pisca
    const tw = calm ? 1 : 0.65 + 0.35 * sin(ti * 6 + x);
    if (kind === "scare") { // asinha branca: o fruto que dá o voo alto
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(120,30,30,.7)"; ctx.lineWidth = 0.6;
      for (const [wx, wy, rt, L] of [[3.2, -4.2, -0.15, 5.2], [3.6, -5.2, -0.65, 5.4], [4.4, -6.2, -1.15, 5]]) { ctx.beginPath(); ctx.ellipse(wx + cos(rt) * L * 0.5, wy + sin(rt) * L * 0.5, L * 0.5 * (0.8 + 0.2 * tw), 1.15, rt, 0, TAU); ctx.fill(); ctx.stroke(); }
    } else if (kind === "gold") star4(ctx, 6.2, -6.2, 2.9 * tw, "#fffbe0");
    else if (kind === "ice") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * PI / 3 + 0.3; ctx.moveTo(6.2 + cos(a) * 2.9 * tw, -6.2 + sin(a) * 2.9 * tw); ctx.lineTo(6.2 - cos(a) * 2.9 * tw, -6.2 - sin(a) * 2.9 * tw); } ctx.stroke(); }
    else if (kind === "turbo") { ctx.fillStyle = "#fff3a0"; ctx.strokeStyle = "#a8420a"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7.8, -9.2); ctx.lineTo(4.6, -5.8); ctx.lineTo(6.6, -5.8); ctx.lineTo(5.2, -2.6); ctx.lineTo(9, -6.8); ctx.lineTo(7, -6.8); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (kind === "magnet") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(6.2, -6, 2.2 * tw + 0.4, PI * 0.9, PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(6.2, -6, 4.3 * tw + 0.4, PI * 1, PI * 1.8); ctx.stroke(); }
    ctx.restore();
  }


  // ====================================================================================================================
  //  O GALHO/POLEIRO DAS SKINS DA LOJINHA: o tile de 32×32 inteiro, no lugar do galho do ambiente (js/game.js só chama quando a skin em uso tem `style`)
  // ====================================================================================================================
  // Mesma linguagem dos galhos dos ambientes: topo claro com brilho, face da frente mais escura, contorno suave, brilho quente em volta (o "refúgio") e sombra COMPRIDA para baixo e para a direita, tudo dentro do tile.
  // Campos de `look`: style ("branch"|"bamboo"|"swing"|"house"; outro nome desenha "branch"), top, face, edge, acc1, acc2 (cada estilo tem as suas cores de sempre).
  function roostShade(c, x, y, ox, oy, w, h, round) { // sombra comprida: o mesmo contorno do objeto, deslocado em dois passos para baixo e para a direita (nunca sai do tile)
    for (const [dx, dy, a] of [[3, 5, ".13"], [6, 9, ".17"]]) {
      const sx = ox + dx, sy = oy + dy, ww = Math.max(0, Math.min(w, 32 - sx)), hh = Math.max(0, Math.min(h, 32 - sy));
      if (ww <= 0 || hh <= 0) continue;
      c.fillStyle = "rgba(0,0,0," + a + ")";
      if (round) { c.beginPath(); c.ellipse(x + sx + ww / 2, y + sy + hh / 2, ww / 2, hh / 2, 0, 0, TAU); c.fill(); } else c.fillRect(x + sx, y + sy, ww, hh);
    }
  }
  const ROOST = {
    branch(c, x, y, L) { // galho grosso atravessando o tile, com folhas e florzinhas
      const top = hexOr(L.top, "#b98552"), face = hexOr(L.face, "#7a5230"), edge = hexOr(L.edge, "rgba(50,28,10,.6)"), lf = hexOr(L.acc1, "#5fb85a"), fl = hexOr(L.acc2, "#ffb7d1");
      roostShade(c, x, y, 2, 12, 28, 10, true);
      c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(x + 5, y + 21); c.bezierCurveTo(x + 12, y + 19, x + 20, y + 22, x + 27.5, y + 17);
      c.strokeStyle = edge; c.lineWidth = 9; c.stroke(); c.strokeStyle = face; c.lineWidth = 7; c.stroke(); c.strokeStyle = top; c.lineWidth = 3.4; c.beginPath(); c.moveTo(x + 6, y + 19.4); c.bezierCurveTo(x + 12, y + 17.4, x + 20, y + 20.4, x + 26.6, y + 15.6); c.stroke();
      c.strokeStyle = face; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x + 12, y + 18); c.quadraticCurveTo(x + 11, y + 12, x + 8, y + 9); c.stroke(); // raminho
      c.strokeStyle = edge; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + 22, y + 21.5); c.lineTo(x + 24, y + 19.2); c.moveTo(x + 9, y + 22.4); c.lineTo(x + 11, y + 20.4); c.stroke();
      leaf(c, x + 8, y + 9.4, 7, -2.5, lf, "#2f7a3a"); leaf(c, x + 8, y + 9.4, 7, -1.2, mixc(lf, "#ffffff", 0.2), "#2f7a3a"); leaf(c, x + 23, y + 17, 6, -0.9, lf, "#2f7a3a"); leaf(c, x + 23, y + 17, 5, 0.5, mixc(lf, "#000000", 0.1), "#2f7a3a");
      for (const [fx, fy] of [[6.5, 7.4], [26, 12.4], [14, 13]]) { for (let i = 0; i < 5; i++) dot(c, x + fx + cos(i * 1.2566) * 1.7, y + fy + sin(i * 1.2566) * 1.7, 1.2, fl); dot(c, x + fx, y + fy, 0.9, "#ffe27a"); }
    },
    bamboo(c, x, y, L) { // dois gomos de bambu na horizontal, com nós e folhas
      const top = hexOr(L.top, "#a8d86e"), face = hexOr(L.face, "#5f9a3c"), edge = hexOr(L.edge, "rgba(30,60,20,.6)"), nodeC = hexOr(L.acc1, "#3f7d2e"), lf = hexOr(L.acc2, "#7dc24f");
      roostShade(c, x, y, 2, 11, 28, 12, true);
      rr(c, x + 2, y + 10, 28, 11, 5, face, edge); rr(c, x + 3, y + 10.5, 26, 6, 3, top, null);
      c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x + 6, y + 11.2, 18, 1.4);
      for (const nx of [10, 21]) { c.fillStyle = nodeC; c.fillRect(x + nx, y + 9.6, 2.6, 12); c.fillStyle = "rgba(255,255,255,.25)"; c.fillRect(x + nx, y + 9.6, 1, 12); }
      leaf(c, x + 22, y + 11.5, 7, -0.7, lf, "#2f7a3a"); leaf(c, x + 22, y + 11.5, 6.4, -1.4, mixc(lf, "#ffffff", 0.15), "#2f7a3a"); leaf(c, x + 9, y + 11, 6, -2.4, lf, "#2f7a3a");
    },
    swing(c, x, y, L) { // balanço de passarinho: poleiro de madeira pendurado por duas cordas
      const top = hexOr(L.top, "#e8c48a"), face = hexOr(L.face, "#b88a50"), edge = hexOr(L.edge, "rgba(60,36,12,.62)"), rope = hexOr(L.acc1, "#d9c28c"), cap = hexOr(L.acc2, "#e8403a");
      roostShade(c, x, y, 3, 16, 26, 11, true);
      c.lineCap = "round";
      for (const rx of [8, 24]) { seg(c, x + rx, y, x + rx, y + 17, edge, 2.6); seg(c, x + rx, y, x + rx, y + 17, rope, 1.5); }
      c.fillStyle = face; c.fillRect(x + 3, y + 17, 26, 6.4); c.fillStyle = top; c.fillRect(x + 3, y + 15.4, 26, 5);
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x + 3, y + 15.4, 26, 1.3);
      c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect(x + 3.5, y + 15.9, 25, 7);
      dot(c, x + 3.5, y + 19.4, 2.6, cap); dot(c, x + 28.5, y + 19.4, 2.6, cap); c.strokeStyle = edge; c.lineWidth = 0.8; c.beginPath(); c.arc(x + 3.5, y + 19.4, 2.6, 0, TAU); c.moveTo(x + 31.1, y + 19.4); c.arc(x + 28.5, y + 19.4, 2.6, 0, TAU); c.stroke();
      for (const rx of [8, 24]) dot(c, x + rx, y + 1.4, 1.6, "#6b5a3c");
    },
    house(c, x, y, L) { // casinha de passarinho: o telhado é o poleiro
      const top = hexOr(L.top, "#e8664a"), face = hexOr(L.face, "#e8c48a"), edge = hexOr(L.edge, "rgba(60,30,12,.62)"), hole = hexOr(L.acc1, "#3a2a20"), trim = hexOr(L.acc2, "#ffffff");
      roostShade(c, x, y, 3, 8, 26, 22);
      c.fillStyle = face; c.fillRect(x + 5, y + 16, 22, 13); c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect(x + 5.5, y + 16.5, 21, 12);
      c.strokeStyle = mixc(face, "#000000", 0.2); c.lineWidth = 0.8; c.beginPath(); for (const bx of [10, 16, 22]) { c.moveTo(x + bx, y + 17); c.lineTo(x + bx, y + 28.5); } c.stroke();
      dot(c, x + 16, y + 22, 3.4, hole); c.strokeStyle = trim; c.lineWidth = 1.1; c.beginPath(); c.arc(x + 16, y + 22, 3.7, 0, TAU); c.stroke(); seg(c, x + 16, y + 26.6, x + 16, y + 28.6, "#6b5a3c", 1.2); seg(c, x + 13.5, y + 26.2, x + 18.5, y + 26.2, "#6b5a3c", 1.2);
      c.fillStyle = top; c.beginPath(); c.moveTo(x + 2, y + 17.5); c.lineTo(x + 6, y + 6); c.lineTo(x + 26, y + 6); c.lineTo(x + 30, y + 17.5); c.closePath(); c.fill(); c.strokeStyle = edge; c.lineWidth = 1; c.stroke();
      c.strokeStyle = mixc(top, "#000000", 0.22); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 4, y + 11.8); c.lineTo(x + 28, y + 11.8); c.stroke();
      c.fillStyle = "rgba(255,255,255,.5)"; c.fillRect(x + 6, y + 6.4, 20, 1.4); c.fillStyle = trim; c.fillRect(x + 2, y + 16.6, 28, 1.4);
    },
  };
  function drawRoost(ctx, x, y, o) {
    o = o || {};
    const L = look(o);
    if (!ctx || !L || typeof L.style !== "string" || !L.style) return false;
    A0 = alphaIn(ctx);
    x = num(x, 0); y = num(y, 0);
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; LINE = "rgba(40,22,10,.5)";
    ctx.fillStyle = "rgba(255,240,180,.32)"; ctx.beginPath(); ctx.arc(x + 16, y + 16, 15.5, 0, TAU); ctx.fill(); // (o brilho quente do refúgio, como nos galhos dos ambientes)
    (ROOST[L.style] || ROOST.branch)(ctx, x, y, L);
    ctx.restore();
    return true;
  }

  // ====================================================================================================================
  //  OS POSTOS: a moita do gato de quintal e o galho alto do gavião
  // ====================================================================================================================
  function drawPost(ctx, x, y, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    o = o || {}; x = num(x, 0); y = num(y, 0);
    const calm = !!o.calm, ti = calm ? 0 : num(o.time, 0);
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; LINE = "rgba(20,40,20,.55)";
    if (o.kind === "hawk") { // galho alto: tronco seco com dois ramos em Y, folhas e um ninho de gravetos
      ctx.fillStyle = "rgba(0,0,0,.26)"; ctx.beginPath(); ctx.ellipse(x + 7, y + 15.5, 18, 4.4, 0, 0, TAU); ctx.fill();
      LINE = "rgba(50,28,10,.6)";
      seg(ctx, x - 4, y + 15, x - 6.4, y + 17, "#6a4526", 3); seg(ctx, x + 4, y + 15, x + 6.6, y + 17, "#6a4526", 3);
      seg(ctx, x, y + 15, x, y - 5, LINE, 8.2); seg(ctx, x, y + 15, x, y - 5, "#8a5e34", 6.4); seg(ctx, x - 1.6, y + 14, x - 1.6, y - 4, "#a9784a", 1.6);
      seg(ctx, x, y - 4, x - 13, y - 14, LINE, 5.4); seg(ctx, x, y - 4, x - 13, y - 14, "#8a5e34", 3.8); seg(ctx, x, y - 6, x + 12, y - 16, LINE, 5.4); seg(ctx, x, y - 6, x + 12, y - 16, "#8a5e34", 3.8);
      seg(ctx, x - 9, y - 10.5, x - 16, y - 10, "#8a5e34", 1.8); seg(ctx, x + 8, y - 12.5, x + 15, y - 11, "#8a5e34", 1.8);
      ctx.fillStyle = "#6a4526"; ctx.beginPath(); ctx.ellipse(x, y - 7.6, 6.4, 2.3, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = LINE; ctx.lineWidth = 0.8; ctx.stroke(); // ninho de gravetos
      ctx.strokeStyle = "#c9a066"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - 5, y - 7.4); ctx.lineTo(x - 1, y - 9); ctx.moveTo(x + 1, y - 9); ctx.lineTo(x + 5, y - 7.2); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 3, y - 6.2); ctx.stroke();
      leaf(ctx, x - 13, y - 14, 7, -2.6, "#6fbf5a", "#2f7a3a"); leaf(ctx, x - 13, y - 14, 6, -1.4, "#8fd36a", "#2f7a3a"); leaf(ctx, x + 12, y - 16, 7, -0.6, "#6fbf5a", "#2f7a3a"); leaf(ctx, x + 12, y - 16, 6, -1.8, "#8fd36a", "#2f7a3a");
      leaf(ctx, x + 1, y - 8.6, 6, -1.1, "#ffffff", "#c9c2b0");
    } else { // moita do gato: arbusto fofo com uma toca escura de onde espiam dois olhos amarelos
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + 1, y + 15.5, 21, 5.4, 0, 0, TAU); ctx.fill();
      const blobs = [[-11, 4, 9.5], [11, 4, 9.5], [0, 1, 12], [-7, -7, 8.6], [8, -8, 8.6], [0, -9, 8]];
      ctx.strokeStyle = "rgba(15,50,25,.6)"; ctx.lineWidth = 2.2; for (const b of blobs) { ctx.beginPath(); ctx.arc(x + b[0], y + b[1], b[2], 0, TAU); ctx.stroke(); }
      for (const b of blobs) dot(ctx, x + b[0], y + b[1], b[2], "#2f8a46");
      for (const b of blobs) dot(ctx, x + b[0] - 1.6, y + b[1] - 2, b[2] * 0.7, "#43a85a");
      for (const [lx, ly, r] of [[-6, -10, 2.2], [3, -13, 2], [10, -6, 2.1], [-13, -2, 1.9], [13, 3, 1.8], [-1, -4, 1.8]]) dot(ctx, x + lx, y + ly, r, "#8ede7e");
      for (const [fx, fy] of [[-9, -6], [6, -12], [12, -1]]) { dot(ctx, x + fx, y + fy, 1.4, "#ffb7d1"); dot(ctx, x + fx, y + fy, 0.5, "#ffe27a"); }
      ctx.fillStyle = "#14281a"; ctx.beginPath(); ctx.ellipse(x, y + 8.4, 8.6, 5.2, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(15,50,25,.7)"; ctx.lineWidth = 1; ctx.stroke(); // a toca
      const blink = !calm && mod(ti, 4.2) < 0.14;
      for (const ex of [-3.4, 3.4]) { if (blink) seg(ctx, x + ex - 1.5, y + 8.4, x + ex + 1.5, y + 8.4, "#ffe14a", 0.9); else { oval(ctx, x + ex, y + 8.4, 1.7, 1.5, "#ffe14a"); oval(ctx, x + ex, y + 8.4, 0.5, 1.2, "#101014"); } }
    }
    ctx.restore();
  }

  // ====================================================================================================================
  //  O NINHO DA SAÍDA (aberto: ovinhos e brilho verde; fechado: tampado de gravetos, brilho vermelho)
  // ====================================================================================================================
  const EGGS = [["#e6f4ff", "#9ac4e8"], ["#fff4de", "#e0b88a"], ["#eaf7dd", "#9fcf86"]];
  function drawNest(ctx, x, y, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    o = o || {}; x = num(x, 0); y = num(y, 0);
    const w = clamp(num(o.w, 96), 12, 4000), h = clamp(num(o.h, 32), 12, 4000), vertical = h > w, Ln = vertical ? h : w, Wd = vertical ? w : h;
    const open = !!o.open, lk = look(o), calm = !!o.calm, ti = calm ? 0 : num(o.time, 0);
    const rim = hexOr(o.rim, "#8a5e34"), twig = hexOr(o.twig, "#c29a5e"), lining = hexOr(o.lining, "#f2d9a0");
    const glow = open ? hexOr(lk && lk.open, "#3ddc84") : hexOr(lk && lk.closed, "#e0605a"), a = Ln / 2, b = Wd / 2;
    ctx.save(); LINE = "rgba(50,28,10,.6)"; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.translate(x + w / 2, y + h / 2); if (vertical) ctx.rotate(PI / 2); // desenha na horizontal (comprimento Ln × espessura Wd) e gira se a saída for em pé
    ctx.globalAlpha = A0 * (open ? 0.34 + (calm ? 0 : 0.1 * sin(ti * 3)) : 0.42); oval(ctx, 0, 0, a, b, glow); ctx.globalAlpha = A0; // brilho: verde aberto, vermelho fechado
    ctx.globalAlpha = A0 * 0.24; oval(ctx, 1.5, b * 0.18, a - 3, b - 2.6, "#000000"); ctx.globalAlpha = A0;
    const ra = a - 3, rb = b - 2.4;
    ovalL(ctx, 0, 0, ra, rb, rim, 0, 1.2); // anel de gravetos
    ctx.lineWidth = 1.3; const N = Math.max(16, floor(Ln / 4.4));
    for (let i = 0; i < N; i++) { const t = (i / N) * TAU, d = 0.34 + 0.2 * h01(i), s1 = 0.74 + 0.1 * h01(i + 3); ctx.strokeStyle = i % 3 ? twig : mixc(rim, "#000000", 0.25); ctx.beginPath(); ctx.moveTo(cos(t) * ra * s1, sin(t) * rb * s1); ctx.lineTo(cos(t + d) * ra * 0.99, sin(t + d) * rb * 0.99); ctx.stroke(); }
    const ia = ra - Math.min(8, rb * 0.5) * 1.1, ib = rb - Math.min(6.4, rb * 0.42); // o fundo forrado de palha e penugem
    ovalL(ctx, 0, 0, ia, ib, lining, 0, 1);
    ctx.strokeStyle = mixc(lining, "#8a5e34", 0.35); ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 6; i++) { const t = i * 1.05 + 0.3; ctx.moveTo(cos(t) * ia * 0.6, sin(t) * ib * 0.6); ctx.lineTo(cos(t + 0.5) * ia * 0.86, sin(t + 0.5) * ib * 0.86); } ctx.stroke();
    if (open) { // ovinhos
      const n = Ln > 60 ? 3 : 2, sp = Math.min(ia * 0.62, 17), er = Math.min(ib * 0.82, 7.2);
      for (let i = 0; i < n; i++) { const ex = (i - (n - 1) / 2) * sp, e = EGGS[i % 3], bob = calm ? 0 : sin(ti * 2 + i * 1.7) * 0.25;
        ovalL(ctx, ex, bob + 0.5, er * 0.76, er, e[0], 0, 0.9); oval(ctx, ex - er * 0.25, bob - er * 0.25, er * 0.2, er * 0.34, "rgba(255,255,255,.85)", 0.4); dot(ctx, ex + er * 0.25, bob + er * 0.35, 0.8, e[1]); dot(ctx, ex - er * 0.1, bob + er * 0.62, 0.6, e[1]); }
    } else { // tampa de gravetos cruzados sobre o fundo
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, pos(ia + 0.5), pos(ib + 0.5), 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = mixc(rim, "#000000", 0.3); ctx.lineWidth = 2.4; ctx.beginPath(); for (let i = -4; i <= 4; i++) { ctx.moveTo(i * ia * 0.26 - ib, -ib); ctx.lineTo(i * ia * 0.26 + ib, ib); } ctx.stroke();
      ctx.strokeStyle = twig; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = -4; i <= 4; i++) { ctx.moveTo(i * ia * 0.26 + ib, -ib); ctx.lineTo(i * ia * 0.26 - ib, ib); } ctx.stroke();
      ctx.restore(); ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, pos(ia), pos(ib), 0, 0, TAU); ctx.stroke();
    }
    const dc = lk && typeof lk.deco === "string" ? lk.deco : "", mark = hexOr(lk && lk.mark, dc === "frame" ? "#d4a017" : "#ffe066");
    if (dc === "stripes") { ctx.strokeStyle = mark; ctx.globalAlpha = A0 * 0.5; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < N; i += 2) { const t = (i / N) * TAU; ctx.moveTo(cos(t) * ra * 0.8, sin(t) * rb * 0.8); ctx.lineTo(cos(t + 0.18) * ra * 0.98, sin(t + 0.18) * rb * 0.98); } ctx.stroke(); ctx.globalAlpha = A0; }
    else if (dc === "rainbow") { ctx.lineWidth = 1.3; for (let i = 0; i < 4; i++) { ctx.strokeStyle = RAINBOW[i]; ctx.beginPath(); ctx.ellipse(0, 0, pos(ra - 0.4 - i * 1.25), pos(rb - 0.4 - i * 1.25), 0, 0, TAU); ctx.stroke(); } }
    else if (dc === "stars") { for (let i = 0; i < 5; i++) star4(ctx, (i - 2) * Ln * 0.2, i % 2 ? -b + 4.2 : b - 4.2, i % 2 ? 2.2 : 2.7, mark); }
    else if (dc === "frame") { ctx.strokeStyle = mark; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, pos(a - 1.2), pos(b - 1.2), 0, 0, TAU); ctx.stroke(); for (const s of [-1, 1]) dot(ctx, s * (a - 3), 0, 2.2, mark); }
    ctx.restore();
  }

  // ====================================================================================================================
  //  EFEITOS CURTOS (t de 0 a 1)
  // ====================================================================================================================
  function drawFx(ctx, kind, x, y, t, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    o = o || {}; x = num(x, 0); y = num(y, 0); t = clamp(num(t, 0.5), 0, 1);
    const calm = !!o.calm, e = 1 - (1 - t) * (1 - t), fade = 1 - t;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (kind) {
      case "flap": { // bater asas: arcos de ar que saem dos dois lados e algumas penugens
        for (let s = -1; s <= 1; s += 2) for (let r = 0; r < 3; r++) {
          const tt = clamp(t * 1.3 - r * 0.16, 0, 1); if (tt <= 0) continue;
          ctx.globalAlpha = A0 * ((1 - tt) * 0.85); ctx.strokeStyle = r ? "#e8f4ff" : "#ffffff"; ctx.lineWidth = 1.7 - tt * 0.7;
          ctx.beginPath(); ctx.arc(x + s * (4 + 7 * tt), y + 2 + 3 * tt, 5 + 8 * tt + r * 2, s > 0 ? -PI * 0.4 : PI * 0.6, s > 0 ? PI * 0.4 : PI * 1.4); ctx.stroke();
        }
        for (let i = 0; i < 3; i++) { const px = x + (i - 1) * 7, py = y + 8 + (calm ? 3 : 10 * e) + i; ctx.globalAlpha = A0 * (fade * 0.8); seg(ctx, px, py, px, py + 3, "#ffffff", 1.3); }
        break;
      }
      case "dust": { // poeirinha do arranque: nuvenzinhas que ficam para trás
        const f = o.facing, bx = f === "left" ? 1 : f === "right" ? -1 : 0, by = f === "up" ? 1 : f === "down" ? -1 : 0;
        for (let i = 0; i < 5; i++) {
          const dist = calm ? 9 : (3 + 5 * i) * (0.4 + e * 0.9), side = (i - 2) * 2.4;
          const px = bx ? x + bx * dist : x + side * (by ? 1 : 1.6) * (by ? 1 : dist / 9), py = (bx ? y + 8 + side * 0.5 : by ? y + 8 + by * dist * 0.8 : y + 8) - 3 * e;
          ctx.globalAlpha = A0 * (fade * 0.7); dot(ctx, px, py, 2.2 + 3.6 * e * (0.7 + 0.3 * h01(i)), i % 2 ? "#e6dabb" : "#d2c5a5");
        }
        break;
      }
      case "feather": { // penas que flutuam e caem balançando
        const col = hexOr(o.color, ""), cols = col ? [col] : ["#fff1d0", "#e8c88a", "#ffffff", "#d9a56a", "#f6dfb4"];
        for (let i = 0; i < 5; i++) {
          const ph = calm ? 0.55 : t, px = x + (h01(i) - 0.5) * 16 + (calm ? 0 : sin(ph * 6 + i * 1.9) * 4), py = y - 6 + ph * (12 + 10 * h01(i + 4)), rot = (calm ? 0 : ph * 3) + i * 1.3;
          ctx.globalAlpha = A0 * (calm ? 0.85 : (1 - ph * ph) * 0.95); const cc = cols[i % cols.length];
          ctx.save(); ctx.translate(px, py); ctx.rotate(rot);
          ctx.fillStyle = cc; ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 1.7, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "rgba(90,60,30,.55)"; ctx.lineWidth = 0.7; ctx.stroke();
          seg(ctx, -4.2, 0, 4, 0, "rgba(90,60,30,.5)", 0.6); ctx.restore();
        }
        break;
      }
      case "sparkle": { // brilho ao pegar
        for (let i = 0; i < 5; i++) {
          const a = i * 1.37 + 0.3, rad = 6 + 9 * h01(i + 12), sz = sin(PI * clamp(t * 1.15 - i * 0.07, 0, 1)) * (2.4 + 2.2 * h01(i + 5));
          if (sz <= 0.05) continue;
          const px = x + cos(a) * rad * (calm ? 1.1 : 0.55 + 0.7 * e), py = y + sin(a) * rad * (calm ? 1.1 : 0.55 + 0.7 * e) - (calm ? 3 : 7 * t);
          ctx.globalAlpha = A0 * 0.95; star4(ctx, px, py, sz + 0.8, "rgba(150,100,0,.6)"); star4(ctx, px, py, sz, i % 2 ? "#fff6c8" : "#ffe27a");
        }
        break;
      }
      case "gust": { // rajada de vento: fitas de ar que correm na direção `dx, dy` (padrão: para a direita) e duas folhinhas
        let dx = num(o.dx, 1), dy = num(o.dy, 0); const L = hypot(dx, dy) || 1; dx /= L; dy /= L;
        const nx = -dy, ny = dx;
        for (let i = 0; i < 3; i++) {
          const off = (i - 1) * 6, run = calm ? 0.45 : mod(t * 1.1 + i * 0.3, 1), cx0 = x + nx * off + dx * (run * 22 - 11), cy0 = y + ny * off + dy * (run * 22 - 11);
          ctx.globalAlpha = A0 * (calm ? 0.8 : sin(PI * run) * 0.9); ctx.strokeStyle = i === 1 ? "#ffffff" : "#d9efff"; ctx.lineWidth = 1.8 - i * 0.2;
          ctx.beginPath(); ctx.moveTo(cx0 - dx * 8 - nx * 2, cy0 - dy * 8 - ny * 2); ctx.quadraticCurveTo(cx0 + nx * 3, cy0 + ny * 3, cx0 + dx * 8 + nx * 0.5, cy0 + dy * 8 + ny * 0.5); ctx.stroke();
        }
        for (let i = 0; i < 2; i++) { const run = calm ? 0.6 : mod(t * 1.2 + i * 0.5, 1); ctx.globalAlpha = A0 * (calm ? 0.8 : sin(PI * run)); leaf(ctx, x + dx * (run * 26 - 13) + nx * (i ? 8 : -7), y + dy * (run * 26 - 13) + ny * (i ? 8 : -7) - 2, 4.4, atan2(dy, dx) + (calm ? 0 : run * 4), "#8fd36a", "#3f8a3a"); }
        break;
      }
      case "land": { // pouso no galho: anel de ar achatado, folhinhas que caem e uma nuvenzinha
        for (let r = 0; r < 2; r++) { const tt = clamp(t * 1.25 - r * 0.2, 0, 1); if (tt <= 0) continue; ctx.globalAlpha = A0 * ((1 - tt) * 0.8); ctx.strokeStyle = r ? "#ffffff" : "#d8f0c8"; ctx.lineWidth = 1.7 - tt; ctx.beginPath(); ctx.ellipse(x, y + 8, 4 + 14 * tt, 1.8 + 5 * tt, 0, 0, TAU); ctx.stroke(); }
        for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.55, rad = calm ? 10 : 4 + 12 * e, py = y + 4 + (calm ? 4 : 12 * t * t * (0.7 + h01(i)) - 3 * sin(PI * t)); ctx.globalAlpha = A0 * (calm ? 0.9 : fade * 0.95); leaf(ctx, x + sin(a) * rad, py, 4, 1.2 + i * 0.9 + (calm ? 0 : t * 3), i % 2 ? "#7fcf62" : "#a8e07a", "#3f8a3a"); }
        break;
      }
      case "peck": { // bicada na semente: estalinhos e migalhas
        ctx.globalAlpha = A0 * (fade * 0.95); ctx.strokeStyle = "#fff6c8"; ctx.lineWidth = 1.3; ctx.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * (TAU / 6) + 0.3, r0 = 5 + 3 * e, r1 = 8 + 6 * e; ctx.moveTo(x + cos(a) * r0, y + sin(a) * r0 * 0.8); ctx.lineTo(x + cos(a) * r1, y + sin(a) * r1 * 0.8); }
        ctx.stroke();
        for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.5, rad = calm ? 7 : 3 + 9 * e, hgt = calm ? 3 : 4 * t * (1 - t) * (6 + 6 * h01(i)); ctx.globalAlpha = A0 * (fade * 0.95); dot(ctx, x + cos(a) * rad, y + sin(a) * rad * 0.5 - hgt, 1.3 - 0.4 * t, i % 2 ? "#f2c244" : "#f5eed9"); }
        break;
      }
      case "shadow": { // a sombra do voo alto no chão: t é o quanto ele voa (mais alto = sombra mais larga e mais fraca)
        const q = clamp(t, 0, 1);
        ctx.globalAlpha = A0 * (0.4 - 0.1 * q); oval(ctx, x, y + 11.5, 9 + 4.6 * q, 3 + 0.7 * q, "#000000"); // (forte o bastante para aparecer também sobre um muro escuro)
        break;
      }
      default: break;
    }
    ctx.restore();
  }


  return { drawBird, drawFoeCat, drawHawk, drawSeed, drawWorm, drawFruit, drawRoost, drawPost, drawNest, drawFx, growthStage, SKINS, skinById, FRUIT_KEYS };
});
