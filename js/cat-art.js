// Desenhos do Gatinho (0.18.0): o gatinho (12 skins), o cão de guarda e o cão rastreador, o ratinho, o camundongo ágil, o novelo, o posto dos cães e os efeitos curtos.
// Só desenho: nenhuma regra do jogo mora aqui, e nada aqui depende de js/game.js. Cada função recebe o `ctx` do canvas e parâmetros explícitos, não guarda estado
// entre quadros (só paletas já calculadas, que são sempre iguais para os mesmos parâmetros) e é determinística: sem Math.random nem relógio, só a posição, o `idx` e o `time` passado.
// `o.calm` (reduzir movimento) desliga todo balanço, pulso e piscada: com `calm` o mesmo pedido desenha exatamente a mesma imagem em qualquer instante
// (as pernas de quem anda seguem a POSIÇÃO e não o relógio). Nada lança erro com parâmetros ausentes (valores padrão sensatos). Cada função devolve o canvas como o recebeu (save/restore).
//
// Contrato (usado por js/game.js nas fases do Gatinho):
//   CatArt.drawCat(ctx, p, o)        o GATINHO. p = { x, y, w, h, facing: "left"|"right"|"up"|"down", moving }, a mesma caixa do cachorrinho (desenha centrado em p.x + p.w/2, p.y + p.h/2);
//                                    o = { gr: 0..1 (0 filhote, 1 adulto), skin, still (sem balançar), time, calm, wet: 0..1 (molhado), sprint (arrancada), safe (em lugar alto), hiss (pelo eriçado) }
//   CatArt.SKINS, CatArt.skinById    as 12 skins (só visual): { id, name, text, price }
//   CatArt.drawDog(ctx, d, o)        o CÃO INIMIGO. d = { x, y (centro), dir: -1|1, mode: "patrol"|"chase"|"flee"|"search"|"idle", kind: "guard"|"tracker", size: "small"|"medium"|"large", frozen, slow, idx }; o = { time, calm, look }
//   CatArt.drawMouse(ctx, it, o)     o RATINHO (presa parada): it = { x, y (canto do item 16×16), variant: 0..2 }; o = { time, calm, look }
//   CatArt.drawAgileMouse(ctx, b, o) o CAMUNDONGO ÁGIL: b = { x, y (centro), vx, vy, hue }; o = { time, calm, r (raio, 8), look }
//   CatArt.drawYarn(ctx, it, o)      o NOVELO: it = { x, y (canto 16×16), kind: "scare"|"gold"|"ice"|"turbo"|"magnet" }; o = { time, calm, look }
//   CatArt.drawPerch(ctx, x, y, o)   o LUGAR ALTO (T) de uma skin da lojinha: o tile de 32×32 com canto em (x, y); o = { look }; sem `look.style` não desenha nada e devolve false (o jogo usa então o lugar alto do ambiente)
//   CatArt.YARN_KEYS                 as cores-CHAVE de cada tipo de novelo (fill, strand, hi, glow): nenhuma skin as muda; conferidas em tests/skins-cat.test.js e tests/e2e.js
// `o.look` (0.19.0, lojinha única): a skin em uso da categoria (guard, tracker, mouse, agile, yarn, perch), um objeto de js/skins-cat.js; os campos visuais de cada categoria estão documentados no topo de js/skins-cat.js.
//   Sem `look` (ou sem nenhum campo visual) o desenho é EXATAMENTE o de sempre (pixel a pixel); nenhum campo muda tamanho, posição ou o que o objeto é.
//   CatArt.drawPost(ctx, x, y, o)    o POSTO dos cães (centro x, y; ~40 px): o.kind "guard" (casinha) ou "tracker" (almofada com tigela)
//   CatArt.drawFx(ctx, kind, x, y, t, o)  efeitos curtos, t = 0..1: "splash", "shake", "dust", "hiss", "sparkle", "wetdrop" (o.facing: lado para onde o gatinho olhava, usado na poeira)
//   CatArt.growthStage(gr)           "filhote" (< 0,34), "jovem" (< 0,67) ou "adulto" (o mesmo corte do cachorrinho)
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CatArt = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const PI = Math.PI, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, abs = Math.abs, atan2 = Math.atan2, sqrt = Math.sqrt, hypot = Math.hypot, floor = Math.floor;
  const num = (v, d) => (typeof v === "number" && v - v === 0 ? v : d);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const pos = (v) => (v < 0 ? 0 : v);
  const HASH = new Float64Array(32); // números fixos de 0 a 1 (em vez de Math.random): espalham gotas, faíscas e poeira sempre do mesmo jeito
  for (let i = 0; i < 32; i++) { const v = sin((i + 1) * 12.9898) * 43758.5453; HASH[i] = v - floor(v); }
  const mod = (a, n) => ((a % n) + n) % n; // resto sempre positivo (o % do JavaScript dá negativo com tempo negativo)
  const h01 = (i) => HASH[mod(i, 32)];

  let A0 = 1; // globalAlpha com que o jogo chamou (os desenhos só o multiplicam: um efeito de piscar ou esmaecer de fora continua valendo)
  const alphaIn = (c) => { const a = c.globalAlpha; return a >= 0 && a <= 1 ? a : 1; };
  let LINE = "rgba(28,16,8,.5)"; // contorno suave da peça que está sendo desenhada (cada função pública escolhe o seu)

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
  function drop(c, x, y, r, ang, fill) { // gotinha alongada na direção `ang`
    c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, pos(r) * 0.62, pos(r), ang - PI / 2, 0, TAU); c.fill();
  }
  function bodyStart(c, x, y, rx, ry, rot, fill) { // preenche uma elipse e recorta nela: o que vier depois (listras, manchas) não passa da borda
    c.beginPath(); c.ellipse(x, y, pos(rx), pos(ry), rot, 0, TAU); c.fillStyle = fill; c.fill(); c.save(); c.clip();
  }
  function bodyEnd(c, x, y, rx, ry, rot) { c.restore(); c.beginPath(); c.ellipse(x, y, pos(rx), pos(ry), rot, 0, TAU); c.strokeStyle = LINE; c.lineWidth = 1; c.stroke(); }
  function spikes(c, cx, cy, rx, ry, a0, a1, n, len, fill) { // pelo eriçado: dentinhos em volta de uma elipse (de a0 a a1)
    c.fillStyle = fill; c.strokeStyle = LINE; c.lineWidth = 0.8;
    const hw = ((a1 - a0) / n) * 0.52;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * (i + 0.5)) / n, L = len * (i % 2 ? 0.72 : 1);
      c.beginPath(); c.moveTo(cx + cos(a - hw) * rx, cy + sin(a - hw) * ry); c.lineTo(cx + cos(a) * (rx + L), cy + sin(a) * (ry + L)); c.lineTo(cx + cos(a + hw) * rx, cy + sin(a + hw) * ry); c.closePath(); c.fill(); c.stroke();
    }
  }
  const bz = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  function bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, a, b, n) { // acrescenta ao caminho a parte [a, b] de uma curva de Bézier
    c.moveTo(bz(x0, x1, x2, x3, a), bz(y0, y1, y2, y3, a));
    for (let i = 1; i <= n; i++) { const t = a + ((b - a) * i) / n; c.lineTo(bz(x0, x1, x2, x3, t), bz(y0, y1, y2, y3, t)); }
  }

  // ====================================================================================================================
  //  SKINS DO GATINHO (só visual: nenhuma muda tamanho de contato nem atributo)
  // ====================================================================================================================
  const SKIN_LIST = [
    { id: "", name: "Rajado", price: 0, text: "o gatinho de sempre (grátis)" },
    { id: "preto", name: "Preto", price: 10, text: "pelo preto como a noite" },
    { id: "branco", name: "Branco", price: 12, text: "pelo branco como a neve" },
    { id: "cinza", name: "Cinza", price: 14, text: "pelo cinza de gato sossegado" },
    { id: "laranja", name: "Laranja", price: 16, text: "pelo laranja de gato dorminhoco" },
    { id: "siames", name: "Siamês", price: 20, text: "pontas escuras e olhos azuis" },
    { id: "vanturco", name: "Van Turco", price: 22, text: "cabeça e cauda coloridas" },
    { id: "tricolor", name: "Tricolor", price: 25, text: "manchas brancas, laranjas e pretas" },
    { id: "smoking", name: "Smoking", price: 28, text: "preto com peito branco, de gala" },
    { id: "pirata", name: "Pirata", price: 30, text: "bandana vermelha e tapa-olho" },
    { id: "astronauta", name: "Astronauta", price: 40, text: "capacete de astronauta" },
    { id: "supergato", name: "Super-gato", price: 50, text: "capa vermelha de super-herói" },
  ];
  const SKINS = Object.freeze(SKIN_LIST.map((k) => Object.freeze(k)));
  const skinById = (id) => { for (let i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i]; return SKINS[0]; };

  // Aparência de cada skin (privada): cores base e quem usa qual cor (fur/dark/light/orange) em cada parte.
  const LOOK = Object.create(null);
  const look = (id, o) => { LOOK[id] = o; };
  const TABBY = { pat: "tabby", fur: "#b98a5b", dark: "#6a4a2e", light: "#efdcc0", eye: "#9be36e", chest: "light" };
  look("", TABBY);
  look("preto", { pat: "solid", fur: "#363741", dark: "#1b1c23", light: "#575968", eye: "#ffd24a", line: "rgba(214,224,248,.62)" });
  look("branco", { pat: "solid", fur: "#f6f3ed", dark: "#cdc5b8", light: "#ffffff", eye: "#6bb7ff", line: "rgba(46,34,30,.82)" }); // (contorno mais escuro: o gatinho branco aparece sobre a areia e outros chãos claros)
  look("cinza", { pat: "solid", fur: "#9aa3b2", dark: "#6a7381", light: "#d6dbe3", eye: "#7fdc92", chest: "light" });
  look("laranja", { pat: "tabby", fur: "#ee9a3f", dark: "#c0661a", light: "#fbdca6", eye: "#7bd96b", chest: "light" });
  look("siames", { pat: "points", fur: "#efe3cf", dark: "#4b3a33", light: "#faf2e3", eye: "#58a9ff", head: "fur", ear: "dark", tail: "dark", tip: "dark", paw: "dark", muzzle: "dark", nose: "#8a5a60" });
  look("vanturco", { pat: "van", fur: "#f8f4ee", dark: "#c4703a", light: "#ffffff", eye: "#f2bd4c", head: "dark", ear: "dark", tail: "dark", tip: "dark", muzzle: "light" });
  look("tricolor", { pat: "calico", fur: "#f7f2e9", dark: "#2f2f38", light: "#ffffff", orange: "#ec8a35", eye: "#7bd96b", tail: "orange", tip: "dark" });
  look("smoking", { pat: "tux", fur: "#2d2e38", dark: "#17181e", light: "#fbfbfb", eye: "#ffd24a", chest: "light", paw: "light", muzzle: "light", line: "rgba(214,224,248,.62)" });
  look("pirata", { pat: "tabby", fur: "#b98a5b", dark: "#6a4a2e", light: "#efdcc0", eye: "#9be36e", chest: "light", acc: "pirate" });
  look("astronauta", { pat: "solid", fur: "#eef1f6", dark: "#aab4c6", light: "#ffffff", eye: "#4f9ff0", acc: "helmet", line: "rgba(40,48,66,.8)" });
  look("supergato", { pat: "tabby", fur: "#b98a5b", dark: "#6a4a2e", light: "#efdcc0", eye: "#9be36e", chest: "light", acc: "cape" });

  const WET_TINT = "#2a3d5a";
  const CAT_PAL = Object.create(null); // paletas já montadas: [skin][nível de molhado 0..8]
  function catPal(id, q) {
    const arr = CAT_PAL[id] || (CAT_PAL[id] = []);
    if (arr[q]) return arr[q];
    const L = LOOK[id], w = q / 8, m = (cc) => (w > 0 ? mixc(cc, WET_TINT, 0.42 * w) : cc);
    const col = { fur: m(L.fur), dark: m(L.dark), light: m(L.light), orange: L.orange ? m(L.orange) : m(L.fur) };
    const of = (role, d) => col[role || d];
    const P = {
      id, pat: L.pat, acc: L.acc || "", line: L.line || "rgba(28,16,8,.5)", eye: L.eye,
      fur: col.fur, dark: col.dark, light: col.light, orange: col.orange,
      head: of(L.head, "fur"), ear: of(L.ear, "fur"), tail: of(L.tail, "fur"), tip: L.tip ? col[L.tip] : null, ring: L.pat === "tabby" ? col.dark : null,
      paw: of(L.paw, "fur"), chest: of(L.chest, "fur"), muzzle: of(L.muzzle, "light"),
      inner: w > 0 ? mixc("#f2a0ac", "#8b6a8c", 0.4 * w) : "#f2a0ac", nose: L.nose || "#ee8497",
      shade: mixc(col.fur, "#000000", 0.2), pawShade: mixc(of(L.paw, "fur"), "#000000", 0.2), earShade: mixc(of(L.ear, "fur"), "#000000", 0.16),
      sheen: w > 0 ? 0.1 + 0.16 * w : 0.14,
    };
    arr[q] = P;
    return P;
  }

  // ====================================================================================================================
  //  O GATINHO
  // ====================================================================================================================
  const stage = (gr) => (gr < 0.34 ? "filhote" : gr < 0.67 ? "jovem" : "adulto");
  const S = { // valores calculados uma vez por desenho, lidos pelas funções de baixo (um só objeto reaproveitado: nada é alocado por quadro)
    pal: null, gr: 1, sprint: false, hiss: false, wet: 0, time: 0, calm: false, still: false, blink: false, wag: 0, l1: 0, l2: 0, l3: 0, l4: 0, leg2: 0, collar: "#21a89b", flow: 3, flutter: 0, jx: 0,
  };

  function leg(c, hx, top, sw, w, col, paw, ground) { // uma perna: traço redondo do quadril ao pé, com a patinha por cima
    const fx = hx + sw, fy = ground - (sw > 0 ? sw * 0.3 : 0);
    c.lineCap = "round"; c.beginPath(); c.moveTo(hx, top); c.lineTo(fx, fy);
    c.strokeStyle = LINE; c.lineWidth = w + 1.5; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
    oval(c, fx + 0.5, fy + 0.1, w * 0.78, w * 0.52, paw);
  }
  function tail(c, x0, y0, x1, y1, x2, y2, x3, y3, w, P, brush) { // rabo: contorno, cor, anéis (rajado) e ponta
    c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x1, y1, x2, y2, x3, y3);
    c.strokeStyle = LINE; c.lineWidth = w + 1.7; c.stroke(); c.strokeStyle = P.tail; c.lineWidth = w; c.stroke();
    if (P.ring && !brush) {
      c.lineCap = "butt"; c.strokeStyle = P.ring; c.lineWidth = w; c.beginPath();
      bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, 0.36, 0.46, 3); bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, 0.58, 0.68, 3); c.stroke(); c.lineCap = "round";
    }
    if (P.tip) { c.strokeStyle = P.tip; c.lineWidth = w; c.beginPath(); bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, 0.8, 1, 4); c.stroke(); }
    if (brush) { // rabo em escova: mais gordo perto da ponta, com dentinhos dos dois lados
      c.strokeStyle = P.tail; c.lineWidth = w + 1.6; c.beginPath(); bezPart(c, x0, y0, x1, y1, x2, y2, x3, y3, 0.4, 0.97, 5); c.stroke();
      c.fillStyle = P.tail; c.strokeStyle = LINE; c.lineWidth = 0.8;
      for (let i = 0; i < 5; i++) {
        const t = 0.22 + i * 0.17, px = bz(x0, x1, x2, x3, t), py = bz(y0, y1, y2, y3, t), L = i % 2 ? 1.7 : 2.4;
        c.beginPath(); c.moveTo(px - w / 2 + 0.3, py - 1.3); c.lineTo(px - w / 2 - L, py + 0.2); c.lineTo(px - w / 2 + 0.3, py + 1.3); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(px + w / 2 - 0.3, py - 1.3); c.lineTo(px + w / 2 + L, py - 0.1); c.lineTo(px + w / 2 - 0.3, py + 1.3); c.closePath(); c.fill(); c.stroke();
      }
    }
  }
  function earTri(c, x, baseY, ew, ax, ay, fill, inner) { // orelha pontuda: base em (x ± ew, baseY), ponta em (ax, ay)
    tri(c, x - ew, baseY + 1.2, x + ew, baseY + 1.2, ax, ay, fill, true);
    if (inner) {
      const gx = (x - ew + x + ew + ax) / 3, gy = (baseY + 1.2 + baseY + 1.2 + ay) / 3, f = 0.5;
      tri(c, gx + (x - ew - gx) * f, gy + (baseY + 1.2 - gy) * f + 0.6, gx + (x + ew - gx) * f, gy + (baseY + 1.2 - gy) * f + 0.6, gx + (ax - gx) * f, gy + (ay - gy) * f, inner, false);
    }
  }
  function eye(c, x, y, k, P, narrow) { // olho: íris colorida, pupila em fenda (redonda e grande quando eriçado), brilho; piscando vira um traço
    const rx = 1.75 + 0.75 * k, ry = (1.95 + 0.85 * k) * (narrow ? 0.72 : 1) * (S.hiss ? 1.1 : 1);
    if (S.blink) { c.lineCap = "round"; c.strokeStyle = P.dark === P.fur ? "#111" : P.dark; c.lineWidth = 1.1; c.beginPath(); c.moveTo(x - rx, y); c.quadraticCurveTo(x, y + 1.3, x + rx, y); c.stroke(); return; }
    oval(c, x, y, rx, ry, P.eye); c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.6; c.stroke();
    oval(c, x, y, S.hiss ? rx * 0.72 : 0.62 + 0.3 * k, ry * (S.hiss ? 0.8 : 0.9), "#101014");
    dot(c, x + rx * 0.32, y - ry * 0.38, 0.55 + 0.15 * k, "#ffffff");
  }
  function whiskers(c, x, y, dx, dy, spread) { // bigodes (do lado dir: +1 ou -1)
    c.strokeStyle = "rgba(255,255,255,.82)"; c.lineWidth = 0.55; c.lineCap = "round"; c.beginPath();
    for (let i = -1; i <= 1; i++) { c.moveTo(x, y + i * 0.7); c.lineTo(x + dx, y + dy + i * spread); }
    c.stroke();
  }

  function catSide(c, S0) { // de lado, olhando para a direita (para a esquerda o chamador espelha)
    const P = S0.pal, g = S0.gr, k = 1 - g, sp = S0.sprint, hs = S0.hiss, wt = S0.wet;
    const hd = 1.26 - 0.26 * g, ear = 1.3 - 0.3 * g, tl = 0.55 + 0.45 * g, sag = 0.9 * wt;
    const rx = (8.4 + 1.8 * g) * (sp ? 1.11 : 1), ry = (6.8 - 1 * g) * (sp ? 0.9 : 1) * (1 - 0.07 * wt) + (hs ? 0.7 : 0);
    const bx = -1.5, by = 1.6 + (sp ? 1.3 : 0) + sag - (hs ? 0.6 : 0);
    const rxH = 6.2 * hd * (hs ? 1.06 : 1), ryH = 5.4 * hd;
    const hx = bx + rx - 1, hy = -3 + k * 0.4 + (sp ? 2.6 : 0) + sag * 1.3 - (hs ? 0.6 : 0);
    const fH = bx + rx - 3.6, bH = bx - rx + 3.6, lt = by + ry * 0.45, lw = 2.7 + 0.5 * g;
    leg(c, fH + 1.9, lt, S0.l2, lw, P.shade, P.pawShade, 10.7); // pernas do lado de lá (mais escuras)
    leg(c, bH + 1.9, lt, S0.l4, lw, P.shade, P.pawShade, 10.7);
    // rabo (atrás do corpo): em pé e curvo; esticado para trás na arrancada; em escova eriçado; caído e pesado molhado
    const x0 = bx - rx + 1.4, y0 = by - 0.8, wv = S0.wag;
    let c1x = x0 - 4.5, c1y = y0 + 0.5, c2x = x0 - 5.5 - 2 * tl + wv * 0.5, c2y = y0 - 6.2 * tl, ex = x0 - 2.2 - 2.4 * tl + wv, ey = y0 - 11.5 * tl - 1;
    if (hs) { c1x = x0 - 2; c1y = y0 - 1.2; c2x = x0 - 3.6 + wv * 0.3; c2y = y0 - 8 * tl; ex = x0 - 3 + wv * 0.4; ey = y0 - 12.5 * tl - 2.5; }
    else if (sp) { c1x = x0 - 5; c1y = y0 + 0.2; c2x = x0 - 9; c2y = y0 - 0.8 + wv * 0.3; ex = x0 - 4 - 7 * tl; ey = y0 - 2 + wv * 0.9; }
    if (wt > 0 && !hs) { const q = 0.85 * wt; c2x += (x0 - 7 - c2x) * q; c2y += (y0 + 1.5 - c2y) * q; ex += (x0 - 9.5 - ex) * q; ey += (y0 + 6 - ey) * q; }
    if (hs) spikes(c, bx, by, rx, ry, -PI * 0.97, -PI * 0.03, 8, 2.7, P.fur);
    tail(c, x0, y0, c1x, c1y, c2x, c2y, ex, ey, hs ? 6.2 : 3.1 + 0.5 * k, P, hs);
    // corpo
    bodyStart(c, bx, by, rx, ry, 0, P.fur);
    oval(c, bx, by + ry * 0.62, rx * 0.86, ry * 0.4, P.chest === P.fur ? P.fur : P.light); // barriga
    if (P.pat === "tabby") {
      c.lineCap = "round"; c.strokeStyle = P.dark; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 5; i++) { const sx = bx - rx * 0.62 + i * rx * 0.33, u = (sx - bx) / rx, edge = ry * sqrt(1 - u * u); c.moveTo(sx, by - edge - 0.5); c.quadraticCurveTo(sx - 0.7, by - edge + 2, sx + 0.5, by - edge + Math.min(0.85 * edge, 4.2)); }
      c.stroke();
    } else if (P.pat === "calico") {
      oval(c, bx - rx * 0.3, by - ry * 0.25, rx * 0.36, ry * 0.52, P.orange, 0.2);
      oval(c, bx + rx * 0.42, by + ry * 0.05, rx * 0.26, ry * 0.46, P.dark, -0.3);
      oval(c, bx - rx * 0.9, by + ry * 0.25, rx * 0.2, ry * 0.5, P.dark);
    } else if (P.pat === "points") {
      oval(c, bx - rx * 0.1, by - ry * 0.85, rx * 0.95, ry * 0.5, mixc(P.fur, P.dark, 0.2)); // costas um pouco mais escuras
    } else if (P.pat === "tux") {
      oval(c, bx + rx * 0.78, by + ry * 0.35, rx * 0.3, ry * 0.7, P.light);
    }
    if (P.pat === "tabby" || P.pat === "solid" || P.pat === "van") oval(c, bx + rx * 0.74, by + ry * 0.38, rx * 0.2, ry * 0.5, P.chest);
    c.globalAlpha = A0 * (0.1); oval(c, bx, by + ry * 0.72, rx * 0.95, ry * 0.5, "#000000"); // sombreado de baixo
    c.globalAlpha = A0 * (P.sheen); oval(c, bx - 0.8, by - ry * 0.52, rx * 0.62, ry * 0.3, "#ffffff"); c.globalAlpha = A0; // brilho de cima (mais forte molhado)
    if (wt > 0.15) { c.fillStyle = P.fur; for (let i = 0; i < 4; i++) { const px = bx - rx * 0.55 + i * rx * 0.36; c.beginPath(); c.moveTo(px - 1.3, by + ry - 1.2); c.lineTo(px + 0.2, by + ry + 1.9 * wt + 0.4); c.lineTo(px + 1.4, by + ry - 1.2); c.closePath(); c.fill(); } } // pelo colado pingando
    bodyEnd(c, bx, by, rx, ry, 0);
    leg(c, fH, lt, S0.l1, lw, P.fur, P.paw, 10.7); // pernas do lado de cá
    leg(c, bH, lt, S0.l3, lw, P.fur, P.paw, 10.7);
    const nx = hx - rxH * 0.52, ny = hy + ryH * 0.5;
    if (P.acc === "cape") { // capa: presa no pescoço, cobre as costas e termina numa ponta que voa para trás (mais comprida e mais alta correndo)
      const fl = S0.flutter, fw = S0.flow, tx = bx - rx - fw - 1.5, ty = by - ry * (sp ? 0.75 : 0.2) + fl;
      c.fillStyle = "#e02f33"; c.beginPath(); c.moveTo(nx, ny - 2.4);
      c.quadraticCurveTo(bx + rx * 0.05, by - ry - 1.6 - fl * 0.2, tx, ty);
      c.quadraticCurveTo(bx - rx * 0.3, by + ry * 1.05, nx + 0.6, ny + 3.2); c.closePath(); c.fill();
      c.strokeStyle = "#8f1a22"; c.lineWidth = 0.9; c.stroke(); seg(c, nx, ny + 0.2, tx + 1.6, ty + 0.2, "#a81f26", 0.8);
      dot(c, nx, ny - 2.4, 1, "#ffd24a");
    }
    // coleira com sininho (a cor muda com o crescimento; a pirata usa bandana no lugar)
    if (P.acc !== "pirate") { seg(c, nx - 0.5, ny - 3.2, nx + 0.3, ny + 3.2, S0.collar, 2.3); dot(c, nx + 0.6, ny + 3.9, 1.15, "#ffd24a"); }
    else { tri(c, nx - 3, ny - 2.8, nx + 3.4, ny - 1.6, nx + 0.6, ny + 5.8, "#d9342b", true); dot(c, nx + 0.6, ny + 1.4, 0.5, "#fff"); }
    // orelhas (antes da cabeça: a cabeça cobre as bases)
    const eh = 5.6 * ear, ew = 2.5 + 0.5 * ear, lean = sp ? -3.2 : hs ? -5.2 : 0.3, drop0 = sp ? 0.82 : hs ? 0.55 : 1, baseY = hy - ryH * 0.78;
    const fxE = hx + 0.5 * rxH, nxE = hx - 0.34 * rxH, dr = wt * 0.9;
    earTri(c, fxE, baseY, ew, fxE + lean * 0.8 + 0.3, baseY - eh * drop0 * 0.94 + dr, P.pat === "calico" ? P.dark : P.earShade, P.inner);
    earTri(c, nxE, baseY, ew, nxE + lean, baseY - eh * drop0 + dr, P.pat === "calico" ? P.orange : P.ear, P.inner);
    // cabeça
    bodyStart(c, hx, hy, rxH, ryH, 0, P.head);
    if (P.pat === "calico") { oval(c, hx - rxH * 0.2, hy - ryH * 0.75, rxH * 0.62, ryH * 0.55, P.orange); oval(c, hx - rxH * 0.78, hy + ryH * 0.1, rxH * 0.34, ryH * 0.6, P.dark); }
    else if (P.pat === "points") oval(c, hx + rxH * 0.62, hy + ryH * 0.32, rxH * 0.5, ryH * 0.62, P.dark);
    else if (P.pat === "van") seg(c, hx + rxH * 0.2, hy - ryH, hx + rxH * 0.7, hy + ryH * 0.4, P.light, 1.6); // fita branca no focinho
    else if (P.pat === "tabby") { c.strokeStyle = P.dark; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(hx - 1.4 + i * 1.7, hy - ryH + 0.4); c.lineTo(hx - 1.2 + i * 1.7, hy - ryH + 2.9 - (i === 0 ? 0 : 0.6)); } c.stroke(); }
    c.globalAlpha = A0 * (P.sheen); oval(c, hx - rxH * 0.2, hy - ryH * 0.55, rxH * 0.5, ryH * 0.22, "#ffffff"); c.globalAlpha = A0;
    bodyEnd(c, hx, hy, rxH, ryH, 0);
    const mx = hx + rxH * 0.58, my = hy + ryH * 0.34;
    ovalL(c, mx, my, rxH * 0.42, ryH * 0.36, P.muzzle, 0, 0.7); // focinho
    if (P.pat === "points") oval(c, mx, my, rxH * 0.4, ryH * 0.34, P.dark);
    const nsx = hx + rxH - 0.8, nsy = hy + 0.1;
    tri(c, nsx - 1.2, nsy - 0.6, nsx + 0.9, nsy - 0.1, nsx - 0.1, nsy + 1.1, P.nose, false);
    if (hs) { // boca aberta, com dentinhos
      oval(c, nsx - 1.8, nsy + 2.4, 2.1, 1.7, "#6e1424"); tri(c, nsx - 3, nsy + 1.3, nsx - 2.4, nsy + 1.3, nsx - 2.7, nsy + 2.7, "#fff", false); tri(c, nsx - 1, nsy + 1.3, nsx - 0.4, nsy + 1.3, nsx - 0.7, nsy + 2.7, "#fff", false);
    } else seg(c, nsx - 0.1, nsy + 1.1, nsx - 0.9, nsy + 2, "rgba(0,0,0,.45)", 0.6);
    whiskers(c, mx + 1, my - 0.2, 4.8, -1.4, 2);
    const ex0 = hx + rxH * 0.34, ey0 = hy - ryH * 0.12;
    eye(c, ex0, ey0, k, P, sp);
    if (P.acc === "pirate") { // tapa-olho com a tira
      seg(c, ex0 - 1, ey0 - 1.5, hx - rxH * 0.55, hy - ryH * 0.95, "#111", 0.9); dot(c, ex0, ey0, 2.7, "#111");
    }
    if (P.acc === "helmet") helmet(c, hx + 0.3, hy, Math.max(rxH, ryH) * 1.42);
  }

  function helmet(c, x, y, r) { // capacete de astronauta: bolha de vidro com brilho e um aro cinza embaixo
    c.fillStyle = "rgba(170,215,255,.26)"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.strokeStyle = "rgba(235,246,255,.95)"; c.lineWidth = 1.5; c.stroke();
    c.strokeStyle = "#8d99ad"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r + 0.2, PI * 0.18, PI * 0.82); c.stroke();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.3; c.lineCap = "round"; c.beginPath(); c.arc(x, y, r * 0.72, PI * 1.12, PI * 1.45); c.stroke();
  }

  function catVert(c, S0, back) { // de frente (descendo) ou de costas (subindo)
    const P = S0.pal, g = S0.gr, k = 1 - g, sp = S0.sprint, hs = S0.hiss, wt = S0.wet, v = back ? -1 : 1;
    const hd = 1.26 - 0.26 * g, ear = 1.3 - 0.3 * g, tl = 0.55 + 0.45 * g, sag = 0.9 * wt, wv = S0.wag;
    const rx = (6.5 - 0.5 * g) * (sp ? 0.93 : 1) * (hs ? 1.1 : 1), ry = (7.9 - 0.3 * g) * (sp ? 1.12 : 1) * (1 - 0.05 * wt);
    const by = -v * 1.8, hy = v * (6.7 + (sp ? 0.8 : 0) + sag * 0.6);
    const rxH = 6.5 * hd * (hs ? 1.07 : 1), ryH = 5.5 * hd;
    // rabo: atrás do corpo (de frente, sobe e dobra para o lado) ou à frente dele (de costas, desce e dobra para cima)
    let tx0 = 0.6, ty0 = by - v * (ry - 1.5), c1x, c1y, c2x, c2y, ex, ey;
    if (!back) { c1x = 1; c1y = ty0 - 4 - tl; c2x = 6 + wv * 0.3; c2y = ty0 - 5.2 - 2 * tl; ex = 8.2 + wv; ey = ty0 - 1.6 - 4.8 * tl; if (sp) { c1x = 1.5; c1y = ty0 - 5; c2x = 3; c2y = ty0 - 8; ex = 4 + wv; ey = ty0 - 9; } if (hs) { c1x = 0.6; c1y = ty0 - 4; c2x = 1.6; c2y = ty0 - 8; ex = 2 + wv * 0.3; ey = ty0 - 10.5 * tl - 1; } }
    else { c1x = 0.5; c1y = ty0 + 4; c2x = 5 + wv * 0.3; c2y = ty0 + 6.2 + tl; ex = 8.4 + wv; ey = ty0 + 3 - 2.2 * tl; if (sp) { c1x = 0.5; c1y = ty0 + 4; c2x = 1; c2y = ty0 + 8; ex = wv * 0.8; ey = ty0 + 8 + 4 * tl; } if (hs) { c1x = 0.5; c1y = ty0 - 3; c2x = 0.5; c2y = ty0 - 6; ex = 0.8 + wv * 0.3; ey = ty0 - 10 * tl; } }
    if (wt > 0 && !hs && !sp) { const q = 0.7 * wt; ex += ((back ? 4 : 5) - ex) * q; ey += ((back ? ty0 + 9 : ty0 - 3) - ey) * q; }
    const tw = hs ? 6 : 3 + 0.4 * k;
    if (!back) {
      if (P.acc === "cape") { c.fillStyle = "#d92b2b"; c.beginPath(); c.moveTo(-5, -8); c.lineTo(5, -8); c.lineTo(11 + S0.flow * 0.3, 7); c.lineTo(-11 - S0.flow * 0.3, 7); c.closePath(); c.fill(); c.strokeStyle = "#8f1a22"; c.lineWidth = 0.9; c.stroke(); }
      tail(c, tx0, ty0, c1x, c1y, c2x, c2y, ex, ey, tw, P, hs);
    }
    if (hs) { // pelo eriçado: dentinhos em volta do corpo (dos dois lados e em cima)
      spikes(c, 0, by, rx, ry, -PI * 0.98, -PI * 0.02, 6, 2.7, P.fur);
      spikes(c, 0, by, rx, ry, -PI * 0.02, PI * 0.45, 3, 2.4, P.fur);
      spikes(c, 0, by, rx, ry, PI * 0.55, PI * 1.02, 3, 2.4, P.fur);
    }
    // patas: de costas as de trás aparecem embaixo do corpo; de frente as da frente aparecem embaixo do queixo (mais abaixo)
    if (back) {
      for (let s = -1; s <= 1; s += 2) {
        const ly = S0.leg2 * s;
        ovalL(c, s * 4.2, 3.6, 3.3, 4.6, P.fur, 0, 0.9); // coxa
        oval(c, s * 3.9, 10 + ly * 0.5, 2.5, 1.9, P.paw); c.strokeStyle = LINE; c.lineWidth = 0.7; c.stroke();
      }
    }
    // corpo
    bodyStart(c, 0, by, rx, ry, 0, P.fur);
    if (P.pat === "tabby") {
      c.lineCap = "round"; c.strokeStyle = P.dark; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 4; i++) { const yy = by - 4.2 + i * 3.2; c.moveTo(-rx - 0.5, yy); c.quadraticCurveTo(-rx + 1.4, yy + 0.2, -rx + 3.1, yy + 1.1); c.moveTo(rx + 0.5, yy); c.quadraticCurveTo(rx - 1.4, yy + 0.2, rx - 3.1, yy + 1.1); }
      if (back) { c.moveTo(0, by - ry); c.lineTo(0, by + ry * 0.6); }
      c.stroke();
    } else if (P.pat === "calico") {
      oval(c, -rx * 0.45, by - v * ry * 0.35, rx * 0.55, ry * 0.4, P.orange, 0.3); oval(c, rx * 0.5, by + v * ry * 0.3, rx * 0.5, ry * 0.35, P.dark, -0.3);
    } else if (P.pat === "points") oval(c, 0, by - v * ry * 0.5, rx * 0.9, ry * 0.5, mixc(P.fur, P.dark, 0.2));
    if (!back && (P.chest !== P.fur || P.pat === "tux")) oval(c, 0, by + ry * 0.55, rx * (P.pat === "tux" ? 0.6 : 0.42), ry * 0.7, P.pat === "tux" ? P.light : P.chest);
    c.globalAlpha = A0 * (0.1); oval(c, 0, by + ry * 0.5, rx * 0.9, ry * 0.5, "#000000"); c.globalAlpha = A0 * (P.sheen); oval(c, -rx * 0.25, by - ry * 0.45, rx * 0.3, ry * 0.3, "#ffffff"); c.globalAlpha = A0;
    bodyEnd(c, 0, by, rx, ry, 0);
    if (back) {
      if (P.acc === "cape") { c.fillStyle = "#d92b2b"; c.beginPath(); c.moveTo(-5, -4); c.lineTo(5, -4); c.lineTo(9 + S0.flow * 0.25, 9); c.lineTo(-9 - S0.flow * 0.25, 9); c.closePath(); c.fill(); c.strokeStyle = "#8f1a22"; c.lineWidth = 0.9; c.stroke(); star4(c, 0, 3.2, 2.6, "#ffd24a"); }
      tail(c, tx0, ty0, c1x, c1y, c2x, c2y, ex, ey, tw, P, hs);
    } else {
      for (let s = -1; s <= 1; s += 2) { oval(c, s * 3.3, hy + ryH - 0.2 + S0.leg2 * s * 0.5, 2.4, 1.8, P.paw); c.strokeStyle = LINE; c.lineWidth = 0.7; c.stroke(); } // patinhas da frente espiando embaixo do queixo
    }
    // coleira / bandana (de frente: debaixo do queixo; de costas: o laço no pescoço)
    const nyy = hy - v * (ryH - 0.9);
    if (P.acc === "pirate") { if (!back) { tri(c, -4.4, hy + ryH - 1.5, 4.4, hy + ryH - 1.5, 0, hy + ryH + 4.6, "#d9342b", true); dot(c, 0, hy + ryH + 0.6, 0.5, "#fff"); } else { tri(c, -4.2, nyy - 1, 4.2, nyy - 1, 0, nyy + 4.8, "#d9342b", true); } }
    else if (back) { seg(c, -rxH * 0.55, nyy, rxH * 0.55, nyy, S0.collar, 2.2); }
    // orelhas
    const eh = 5.6 * ear, ew = 2.5 + 0.5 * ear, drop0 = sp ? 0.8 : hs ? 0.55 : 1, out = sp ? 1.6 : hs ? 3.6 : 0, baseY = hy - ryH * 0.78, dr = wt * 0.9;
    const ex1 = rxH * 0.62;
    const earCol = P.pat === "calico" ? P.dark : P.ear;
    earTri(c, -ex1, baseY, ew, -ex1 - 0.6 - out, baseY - eh * drop0 + dr, earCol, back ? null : P.inner);
    earTri(c, ex1, baseY, ew, ex1 + 0.6 + out, baseY - eh * drop0 + dr, P.pat === "calico" ? P.orange : P.ear, back ? null : P.inner);
    // cabeça
    bodyStart(c, 0, hy, rxH, ryH, 0, P.head);
    if (P.pat === "calico") { oval(c, -rxH * 0.5, hy - ryH * 0.35, rxH * 0.55, ryH * 0.85, P.dark); oval(c, rxH * 0.55, hy - ryH * 0.3, rxH * 0.5, ryH * 0.7, P.orange); if (!back) seg(c, 0, hy - ryH, 0, hy + ryH * 0.3, P.light, 2.2); }
    else if (P.pat === "points" && !back) oval(c, 0, hy + ryH * 0.5, rxH * 0.5, ryH * 0.6, P.dark);
    else if (P.pat === "van" && !back) seg(c, 0, hy - ryH, 0, hy + ryH * 0.4, P.light, 2.2);
    else if (P.pat === "tabby") { c.strokeStyle = P.dark; c.lineWidth = 1.2; c.lineCap = "round"; c.beginPath(); for (let i = -1; i <= 1; i++) { const x1 = i * 1.8; c.moveTo(x1, hy - v * 0 - ryH + 0.4); c.lineTo(x1 * 0.9, hy - ryH + (i === 0 ? 3.4 : 2.6)); } c.stroke(); }
    c.globalAlpha = A0 * (P.sheen); oval(c, -rxH * 0.25, hy - ryH * 0.55, rxH * 0.45, ryH * 0.22, "#ffffff"); c.globalAlpha = A0;
    bodyEnd(c, 0, hy, rxH, ryH, 0);
    if (!back) {
      for (let s = -1; s <= 1; s += 2) ovalL(c, s * rxH * 0.5, hy + ryH * 0.42, rxH * 0.4, ryH * 0.4, P.pat === "points" ? P.head : P.head, 0, 0.6); // bochechas
      if (P.pat === "points") oval(c, 0, hy + ryH * 0.45, rxH * 0.42, ryH * 0.36, P.dark);
      else ovalL(c, 0, hy + ryH * 0.5, rxH * 0.36, ryH * 0.3, P.muzzle, 0, 0.5);
      if (P.pat === "calico") oval(c, 0, hy + ryH * 0.5, rxH * 0.34, ryH * 0.28, P.light);
      const exx = rxH * 0.4, eyy = hy - ryH * 0.1;
      eye(c, -exx, eyy, k, P, sp); eye(c, exx, eyy, k, P, sp);
      if (P.acc === "pirate") { seg(c, exx + 0.8, eyy - 1.4, -rxH * 0.85, hy - ryH * 0.78, "#111", 0.9); dot(c, exx, eyy, 2.7, "#111"); }
      tri(c, -1.1, hy + ryH * 0.32, 1.1, hy + ryH * 0.32, 0, hy + ryH * 0.32 + 1.5, P.nose, false);
      if (hs) { oval(c, 0, hy + ryH * 0.78, 1.9, 1.5, "#6e1424"); tri(c, -1.5, hy + ryH * 0.6, -0.8, hy + ryH * 0.6, -1.15, hy + ryH * 0.6 + 1.5, "#fff", false); tri(c, 0.8, hy + ryH * 0.6, 1.5, hy + ryH * 0.6, 1.15, hy + ryH * 0.6 + 1.5, "#fff", false); }
      else { c.strokeStyle = "rgba(0,0,0,.45)"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, hy + ryH * 0.32 + 1.5); c.lineTo(0, hy + ryH * 0.32 + 2.2); c.moveTo(-1.6, hy + ryH * 0.32 + 3); c.quadraticCurveTo(0, hy + ryH * 0.32 + 2.2, 1.6, hy + ryH * 0.32 + 3); c.stroke(); }
      whiskers(c, -rxH * 0.4, hy + ryH * 0.5, -5, -0.6, 1.9); whiskers(c, rxH * 0.4, hy + ryH * 0.5, 5, -0.6, 1.9);
      if (P.acc !== "pirate") { c.lineCap = "round"; c.strokeStyle = S0.collar; c.lineWidth = 2.1; c.beginPath(); c.arc(0, hy + ryH * 0.2, ryH * 0.96, PI * 0.28, PI * 0.72); c.stroke(); dot(c, 0, hy + ryH + 1.1, 1.1, "#ffd24a"); }
    }
    if (P.acc === "helmet") helmet(c, 0, hy, Math.max(rxH, ryH) * 1.42);
  }

  function drawCat(ctx, p, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    p = p || {}; o = o || {};
    const w = num(p.w, 24), h = num(p.h, 24), cx = num(p.x, 0) + w / 2, cy = num(p.y, 0) + h / 2;
    const fc = p.facing === "left" || p.facing === "up" || p.facing === "down" ? p.facing : "right";
    const gr = clamp(num(o.gr, 1), 0, 1), calm = !!o.calm, still = !!o.still, moving = !!p.moving && !still;
    const ti = calm ? 0 : num(o.time, 0), wet = clamp(num(o.wet, 0), 0, 1), sprint = !!o.sprint, hiss = !!o.hiss, safe = !!o.safe;
    const id = typeof o.skin === "string" && LOOK[o.skin] ? o.skin : "";
    const P = catPal(id, Math.round(wet * 8));
    LINE = P.line;
    S.pal = P; S.gr = gr; S.sprint = sprint; S.hiss = hiss; S.wet = wet; S.time = ti; S.calm = calm; S.still = still;
    S.collar = id === "supergato" ? "#d4a017" : gr < 0.34 ? "#ef6f9a" : gr < 0.67 ? "#8a63d2" : "#21a89b";
    S.blink = !calm && !still && mod(ti, 4.3) < 0.13 && !hiss;
    const lateral = fc === "left" || fc === "right";
    const travel = lateral ? num(p.x, 0) * (fc === "left" ? -1 : 1) : num(p.y, 0) * (fc === "up" ? -1 : 1);
    // passo: pelo relógio (normal) ou pela POSIÇÃO (reduzir movimento: o corpo só se mexe quando anda de verdade)
    const phase = calm ? travel * 0.0785 : ti * (wet > 0.3 ? 12 : sprint ? 22 : 17);
    const amp = (sprint ? 4.6 : 3.2) * (1 - 0.3 * wet), sw = moving ? sin(phase) * amp : 0;
    if (sprint) { S.l1 = 3 + sw * 1.1; S.l2 = 2.2 + sw * 0.9; S.l3 = -3 - sw * 1.1; S.l4 = -2.4 - sw * 0.9; } else { S.l1 = sw; S.l4 = sw; S.l2 = -sw; S.l3 = -sw; }
    S.leg2 = moving ? sin(phase) * 1.4 : 0;
    S.wag = calm || still ? 0 : sin(ti * (moving ? 9 : 3)) * (hiss ? 0.8 : moving ? 2.4 : 1.8) * (1 - 0.6 * wet);
    S.flow = sprint ? 9 : moving ? 5 : 3;
    S.flutter = calm || still ? 0 : sin(ti * 11) * 1.6;
    const sc = (0.78 + 0.22 * gr) * (safe ? 1.1 : 1), lift = safe ? 4.5 : 0;
    ctx.save();
    ctx.translate(cx, cy + 11); ctx.scale(fc === "left" ? -sc : sc, sc); ctx.translate(0, -11); // os pés ficam no mesmo lugar: o filhote só é menor
    if (safe) { ctx.globalAlpha = A0 * (0.17); oval(ctx, 0, 14.6, 10, 3, "#000000"); ctx.globalAlpha = A0; } // a salvo, no alto: a sombra fica lá embaixo, mais longe e mais fraca
    else { ctx.globalAlpha = A0 * (0.26); oval(ctx, 0, 10.6, 11.5, 3.7, "#000000"); ctx.globalAlpha = A0; }
    S.jx = hiss && !calm && !still ? sin(ti * 55) * 0.55 : 0;
    ctx.translate(S.jx, -lift);
    ctx.lineJoin = "round";
    if (lateral) catSide(ctx, S); else catVert(ctx, S, fc === "up");
    if (wet > 0.05) { // gotinhas caindo do pelo molhado
      const a = Math.min(0.95, 0.5 + wet * 0.5);
      for (let i = 0; i < 3; i++) {
        const ph = calm ? 0.2 + i * 0.3 : mod(ti * 1.5 + i * 0.37, 1), gx = lateral ? -7 + i * 6.5 : -5 + i * 5, gy = 6 + ph * 7.5;
        ctx.globalAlpha = A0 * (a * (1 - ph * 0.55)); drop(ctx, gx, gy, 1.5, PI / 2, "#8fd3ff");
      }
      ctx.globalAlpha = A0;
    }
    ctx.restore();
  }

  function growthStage(gr) { gr = num(gr, 1); return stage(gr); }

  // ====================================================================================================================
  //  OS CÃES INIMIGOS (cão de guarda/de casa e cão rastreador)
  // ====================================================================================================================
  const DOG_COATS = [
    [ // guarda: robustos
      { fur: "#8a5a33", dark: "#4f3118", light: "#d8b283" }, { fur: "#6d727c", dark: "#3a3d45", light: "#c3c7cf" },
      { fur: "#c89a5e", dark: "#7f5528", light: "#efd7a8" }, { fur: "#3d3534", dark: "#1d1918", light: "#b08a63" },
    ],
    [ // rastreador: esguios
      { fur: "#b6713a", dark: "#5e3418", light: "#f0d9b0" }, { fur: "#c49a62", dark: "#7a4e24", light: "#f4e6c8" },
      { fur: "#8f6a47", dark: "#4d3320", light: "#e7cfa8" }, { fur: "#9c4f2a", dark: "#5b2a14", light: "#f1d6b8" },
    ],
  ];
  const DOG_PAL = Object.create(null); // [família][pelagem][0 normal, 1 afugentado, 2 congelado]
  // Skin do cão (0.19.0): campos visuais de `look` (guard/tracker em js/skins-cat.js): collar (cor da coleira ou "rainbow"), tag (cor da plaquinha), acc ("bandana"|"bowtie"|"hat"|"bow"), c1 e c2 (cores do acessório), pat ("dots"|"check": estampa do lenço).
  // As cores da skin passam pelo MESMO tom do cão afugentado/congelado (mixc), então os estados continuam legíveis. Paletas guardadas por skin (WeakMap): nada é montado por quadro.
  const DOG_LOOK_PAL = new WeakMap();
  const RAINBOW = ["#e8403a", "#ffc83d", "#4fb85a", "#3f86e0"];
  const dogLooked = (look) => !!look && typeof look === "object" && !!(look.collar || look.tag || look.acc);
  function dogPal(kind, coat, st, look) {
    const base = dogPal0(kind, coat, st);
    if (!dogLooked(look)) return base;
    let byKey = DOG_LOOK_PAL.get(look);
    if (!byKey) DOG_LOOK_PAL.set(look, (byKey = Object.create(null)));
    const key = kind * 12 + coat * 3 + st;
    if (byKey[key]) return byKey[key];
    const tint = st === 1 ? "#dcdbe6" : "#8fd0ff", w = st === 1 ? 0.3 : st === 2 ? 0.6 : 0, m = (cc) => (w ? mixc(cc, tint, w) : cc), hex = (cc, d) => (typeof cc === "string" && /^#[0-9a-f]{6}$/i.test(cc) ? cc.toLowerCase() : d);
    const P = Object.assign({}, base);
    if (look.collar === "rainbow") { P.rb = RAINBOW.map(m); P.wide = true; }
    else if (look.collar) { P.collar = m(hex(look.collar, "#d6392f")); P.wide = true; }
    if (look.tag) P.tag = m(hex(look.tag, "#ffd24a"));
    P.acc = typeof look.acc === "string" ? look.acc : ""; P.pat = look.pat === "check" ? "check" : "dots";
    P.a1 = m(hex(look.c1, "#e8403a")); P.a2 = m(hex(look.c2, "#ffffff"));
    byKey[key] = P;
    return P;
  }
  function dogPal0(kind, coat, st) {
    const key = kind * 12 + coat * 3 + st;
    if (DOG_PAL[key]) return DOG_PAL[key];
    const C = DOG_COATS[kind][coat], tint = st === 1 ? "#dcdbe6" : "#8fd0ff", w = st === 1 ? 0.3 : st === 2 ? 0.6 : 0;
    const m = (cc) => (w ? mixc(cc, tint, w) : cc);
    const collar = kind === 0 ? "#d6392f" : "#2f6fd6";
    const P = { fur: m(C.fur), dark: m(C.dark), light: m(C.light), collar: m(collar), nose: m("#1c1a1e"), shade: m(mixc(C.fur, "#000000", 0.2)), earCol: m(C.dark), tip: m(kind === 1 ? "#f4ecd8" : C.dark), tag: m("#ffd24a"), line: st === 2 ? "rgba(40,90,140,.55)" : "rgba(28,16,8,.5)", st };
    DOG_PAL[key] = P;
    return P;
  }
  const DS = { pal: null, kind: 0, mode: "patrol", stretch: 1, wag: 0, l1: 0, l2: 0, l3: 0, l4: 0, headA: 0, bob: 0, blink: false, flap: 0, t: 0, calm: false, frozen: false };

  // ---- enfeites das skins dos cães (0.19.0), desenhados no grupo da cabeça (que gira) ----
  function dogNeck(c, D) { // no pescoço, por baixo da cabeça: coleira larga (puxada um pouco para trás, para não ficar escondida pela orelha) e coleira de arco-íris
    const P = D.pal, g = D.kind === 0, sh = g ? 1.3 : 1.9;
    const x0 = (g ? -3 : -1.4) - sh, y0 = (g ? -2 : -3) - 0.4, x1 = (g ? -2.2 : -0.8) - sh, y1 = 6.4, w = (g ? 3.8 : 3) + 1.2;
    if (P.rb) { c.lineCap = "butt"; for (let i = 0; i < 4; i++) seg(c, x0 + ((x1 - x0) * i) / 4, y0 + ((y1 - y0) * i) / 4, x0 + ((x1 - x0) * (i + 1)) / 4, y0 + ((y1 - y0) * (i + 1)) / 4, P.rb[i], w); c.lineCap = "round"; }
    else seg(c, x0, y0, x1, y1, P.collar, w);
    dot(c, (g ? -2 : -0.6) - sh * 0.5, 7.4, 1.6, P.tag); // a plaquinha vai junto
  }
  function dogHead(c, D) { // por cima de tudo (depois da cabeça e da orelha): lenço, gravata-borboleta, chapéu de festa e laço
    const P = D.pal, g = D.kind === 0, ac = P.acc;
    if (ac === "bandana") { // lenço: triângulo que cai embaixo do queixo, de bolinhas ou xadrez
      const ax = g ? 0.2 : 1.1, ty = g ? 3 : 2.6, a = [ax - 4.4, ty], b = [ax + 4.8, ty + 0.5], t = [ax + 0.2, ty + 8.4];
      c.fillStyle = P.a1; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.closePath(); c.fill();
      if (P.pat === "check") { c.save(); c.clip(); c.fillStyle = P.a2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) c.fillRect(ax - 4.6 + i * 2.5, ty - 0.2 + j * 2.4, 2.5, 2.4); c.restore(); }
      else { dot(c, ax - 1.9, ty + 1.9, 0.95, P.a2); dot(c, ax + 1.9, ty + 2.3, 0.95, P.a2); dot(c, ax, ty + 4.6, 0.95, P.a2); dot(c, ax + 0.2, ty + 6.9, 0.65, P.a2); }
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(t[0], t[1]); c.closePath(); c.strokeStyle = LINE; c.lineWidth = 0.9; c.stroke();
    } else if (ac === "bowtie") { // gravata-borboleta embaixo do queixo
      const bx = g ? 0.4 : 1.4, by = g ? 4.9 : 4.4;
      tri(c, bx, by, bx - 5, by - 3.1, bx - 5, by + 3.1, P.a1, true); tri(c, bx, by, bx + 5, by - 3.1, bx + 5, by + 3.1, P.a1, true);
      dot(c, bx, by, 1.5, P.a2); c.strokeStyle = LINE; c.lineWidth = 0.7; c.beginPath(); c.arc(bx, by, 1.5, 0, TAU); c.stroke();
    } else if (ac === "hat") { // cone de festa com bolinhas e pompom
      const bx = g ? 3.2 : 2.6, by = g ? -7.5 : -6.2, H = g ? 9.5 : 8.5;
      tri(c, bx - 3.5, by + 1, bx + 3.5, by + 1, bx + 0.8, by - H, P.a1, true);
      dot(c, bx - 0.5, by - 1.8, 0.9, P.a2); dot(c, bx + 1.4, by - 4.2, 0.8, P.a2); dot(c, bx + 0.4, by - 6.4, 0.6, P.a2);
      dot(c, bx + 0.8, by - H, 1.5, P.a2); c.strokeStyle = LINE; c.lineWidth = 0.7; c.beginPath(); c.arc(bx + 0.8, by - H, 1.5, 0, TAU); c.stroke();
    } else if (ac === "bow") { // laço na cabeça, na base da orelha
      const bx = g ? 0.6 : 0.8, by = g ? -7.4 : -6.2;
      tri(c, bx, by, bx - 3.6, by - 2.8, bx - 3.6, by + 2.4, P.a1, true); tri(c, bx, by, bx + 3.6, by - 2.8, bx + 3.6, by + 2.4, P.a1, true);
      dot(c, bx, by, 1.3, P.a2); c.strokeStyle = LINE; c.lineWidth = 0.7; c.beginPath(); c.arc(bx, by, 1.3, 0, TAU); c.stroke();
    }
  }

  function dogSide(c, D) {
    const P = D.pal, guard = D.kind === 0, mode = D.mode, flee = mode === "flee", chase = mode === "chase", search = mode === "search";
    const st = D.stretch, wg = D.wag;
    const rx = (guard ? 11.2 : 11.2) * st, ry = guard ? 7.3 : 5.3, bx = -1, by = (guard ? 1.7 : 0.6) + (flee ? 1.3 : 0);
    const legW = guard ? 4.5 : 3.1, top = by + ry * 0.45, ground = 10.9;
    const fH = bx + rx - 4.2, bH = bx - rx + 3.8;
    leg(c, fH + 1.8, top, D.l2, legW, P.shade, P.shade, ground); // pernas do lado de lá
    leg(c, bH + 1.8, top, D.l4, legW, P.shade, P.shade, ground);
    // rabo
    const x0 = bx - rx + 0.8, y0 = by - 1.1;
    c.lineCap = "round";
    if (flee) { // entre as pernas
      c.beginPath(); c.moveTo(x0, y0 + 1.5); c.bezierCurveTo(x0 - 3.5, y0 + 4.5, x0 - 1.5, y0 + 8.8, x0 + 3.5, y0 + 8.8);
      c.strokeStyle = LINE; c.lineWidth = (guard ? 3.6 : 2.4) + 1.6; c.stroke(); c.strokeStyle = P.fur; c.lineWidth = guard ? 3.6 : 2.4; c.stroke();
    } else {
      const up = chase ? 1 : search ? -0.55 : 0.2, tl = guard ? 5.2 : 8.2;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(x0 - tl * 0.55, y0 - 1.5 - up * 2, x0 - tl, y0 - 2.5 - up * 5 - (search ? -3 : 0) + wg);
      c.strokeStyle = LINE; c.lineWidth = (guard ? 3.8 : 2.4) + 1.6; c.stroke(); c.strokeStyle = guard ? P.fur : P.fur; c.lineWidth = guard ? 3.8 : 2.4; c.stroke();
      if (!guard) { c.strokeStyle = P.tip; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0 - tl * 0.8, y0 - 2.2 - up * 4 + wg * 0.8); c.lineTo(x0 - tl, y0 - 2.5 - up * 5 + wg); c.stroke(); }
    }
    // corpo
    bodyStart(c, bx, by, rx, ry, 0, P.fur);
    if (guard) { oval(c, bx + 1, by - ry * 0.7, rx * 0.75, ry * 0.4, P.dark); c.globalAlpha = A0 * (0.5); oval(c, bx, by + ry * 0.7, rx * 0.8, ry * 0.4, P.light); c.globalAlpha = A0; }
    else { oval(c, bx - 1.5, by - ry * 0.65, rx * 0.62, ry * 0.5, P.dark); oval(c, bx + 1, by + ry * 0.6, rx * 0.85, ry * 0.4, P.light); } // rastreador: "manta" escura nas costas e barriga clara
    c.globalAlpha = A0 * (0.1); oval(c, bx, by + ry * 0.75, rx * 0.95, ry * 0.5, "#000000"); c.globalAlpha = A0 * (0.14); oval(c, bx - 0.5, by - ry * 0.6, rx * 0.55, ry * 0.25, "#ffffff"); c.globalAlpha = A0;
    bodyEnd(c, bx, by, rx, ry, 0);
    oval(c, bx + rx - 4.6, by + ry * 0.32, guard ? 5.8 : 5, guard ? 6.3 : 5, P.fur); // peito
    c.strokeStyle = LINE; c.lineWidth = 0.9; c.beginPath(); c.ellipse(bx + rx - 4.6, by + ry * 0.32, guard ? 5.8 : 5, guard ? 6.3 : 5, 0, -PI * 0.5, PI * 0.5); c.stroke();
    oval(c, bx + rx - 3.8, by + ry * 0.28, guard ? 4.8 : 4.2, guard ? 5.2 : 4.1, P.fur);
    leg(c, fH, top, D.l1, legW, P.fur, P.fur, ground); // pernas do lado de cá
    leg(c, bH, top, D.l3, legW, P.fur, P.fur, ground);
    // pescoço e cabeça (num grupo que gira: cabeça baixa farejando, erguida parada, esticada perseguindo)
    const nX = bx + rx - 2.4, nY = by - ry * 0.62;
    c.save(); c.translate(nX, nY); c.rotate(D.headA);
    seg(c, guard ? -3 : -1.4, guard ? -2 : -3, guard ? -2.2 : -0.8, 6.2, P.collar, guard ? 3.8 : 3); dot(c, guard ? -2 : -0.6, 7.2, 1.5, P.tag); // coleira (atrás da cabeça) e plaquinha
    if (P.wide) dogNeck(c, D); // (skins da lojinha: coleira larga ou de arco-íris)
    if (guard) { // cabeça robusta de focinho largo e curto, orelhas caídas
      ovalL(c, 3.6, -2.4, 6.8, 6.2, P.fur);
      oval(c, 9.5, 0.6, 4.6, 3.5, P.light); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
      if (chase) { oval(c, 9.8, 3.1, 4.1, 2.1, "#7d1d2a", 0.18); oval(c, 10.4, 4.3, 2.4, 1.4, "#ff8da0"); tri(c, 11.4, 1.7, 12.7, 1.7, 12.1, 3.1, "#fff", false); tri(c, 8.2, 1.7, 9.4, 1.7, 8.8, 3, "#fff", false); }
      else seg(c, 12.6, 1.3, 9.4, 2.9, "rgba(0,0,0,.5)", 0.7);
      oval(c, 13.7, -0.9, 2.1, 1.7, P.nose); dot(c, 13.1, -1.5, 0.5, "rgba(255,255,255,.7)");
      const fl = D.flap, er = flee ? -1.15 : chase ? -0.75 : 0.28; // orelha: caída; para trás ao fugir; balançando ao correr
      oval(c, flee ? 0.4 : 0.9, flee ? -2.4 : 1.2, flee ? 5.4 : 3.2, flee ? 2.4 : 5.6, P.earCol, er + fl, ); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
      const ex = 5.9, ey = -4.1;
      if (flee) { dot(c, ex, ey, 2.2, "#ffffff"); dot(c, ex + 0.4, ey, 1.1, "#111"); } else if (D.blink) seg(c, ex - 1.3, ey, ex + 1.3, ey, "#111", 1) ; else { dot(c, ex, ey, chase ? 1.3 : 1.5, "#111"); dot(c, ex + 0.5, ey - 0.5, 0.5, "#fff"); }
      if (chase) seg(c, 3.6, ey - 3.2, 8, ey - 1.6, P.dark, 1.5); else if (!flee) seg(c, 4, ey - 2.4, 7.4, ey - 2.6, P.dark, 1);
    } else { // cabeça longa e estreita de focinho comprido, orelhas longas caídas
      ovalL(c, 3, -2.2, 5.1, 4.5, P.fur);
      ovalL(c, 9.6, -0.6, 6.3, 2.8, P.fur); oval(c, 9.4, 1.2, 5.4, 1.5, P.light);
      if (chase) { oval(c, 10, 2.9, 4.6, 1.8, "#7d1d2a", 0.14); oval(c, 10.6, 4, 2.6, 1.3, "#ff8da0"); tri(c, 12, 1.6, 13, 1.6, 12.5, 2.8, "#fff", false); }
      oval(c, 15.2, -1.3, 2.1, 1.7, P.nose); dot(c, 14.6, -1.9, 0.5, "rgba(255,255,255,.7)");
      const fl = D.flap, er = flee ? -1.3 : chase ? -0.85 : 0.12;
      oval(c, flee ? 0 : 0.8, flee ? -2.6 : 2.9, flee ? 6.2 : 2.5, flee ? 2.1 : 6.6, P.earCol, er + fl); c.strokeStyle = LINE; c.lineWidth = 0.8; c.stroke();
      const ex = 5.1, ey = -3.8;
      if (flee) { dot(c, ex, ey, 2, "#ffffff"); dot(c, ex + 0.4, ey, 1, "#111"); } else if (D.blink) seg(c, ex - 1.2, ey, ex + 1.2, ey, "#111", 1); else { dot(c, ex, ey, chase ? 1.15 : 1.3, "#111"); dot(c, ex + 0.45, ey - 0.45, 0.45, "#fff"); }
      if (chase) seg(c, 3, ey - 2.8, 7, ey - 1.4, P.dark, 1.4);
    }
    if (P.acc) dogHead(c, D); // (skins da lojinha: lenço, gravata, chapéu ou laço)
    c.restore();
  }

  function drawDog(ctx, d, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    d = d || {}; o = o || {};
    const x = num(d.x, 0), y = num(d.y, 0), dir = d.dir < 0 ? -1 : 1;
    const mode = d.mode === "chase" || d.mode === "flee" || d.mode === "search" || d.mode === "idle" ? d.mode : "patrol";
    const kind = d.kind === "tracker" ? 1 : 0, sz = d.size === "small" ? 0.8 : d.size === "large" ? 1.2 : 1;
    const idx = floor(num(d.idx, 0)), coat = ((idx % 4) + 4) % 4, calm = !!o.calm, frozen = !!d.frozen;
    const ti = calm ? 0 : num(o.time, 0), ph0 = idx * 1.7;
    const flee = mode === "flee", chase = mode === "chase", search = mode === "search", idle = mode === "idle";
    const P = dogPal(kind, coat, frozen ? 2 : flee ? 1 : 0, o.look);
    LINE = P.line;
    DS.pal = P; DS.kind = kind; DS.mode = mode; DS.calm = calm; DS.frozen = frozen;
    DS.stretch = chase ? 1.1 : 1;
    const speed = chase ? 19 : flee ? 22 : search ? 6 : 11, amp = chase ? 5 : flee ? 2.4 : search ? 2 : 3.2;
    const walkish = !frozen && !idle;
    const phase = calm ? (x + y) * 0.0785 * dir + ph0 : ti * speed + ph0;
    const sw = walkish ? sin(phase) * amp : 0;
    if (chase) { DS.l1 = 3 + sw * 1.1; DS.l2 = 2 + sw * 0.9; DS.l3 = -3 - sw * 1.1; DS.l4 = -2.2 - sw * 0.9; } else { DS.l1 = sw; DS.l4 = sw; DS.l2 = -sw; DS.l3 = -sw; }
    DS.wag = calm || frozen ? 0 : sin(ti * (chase ? 14 : idle ? 5 : 8) + ph0) * (chase ? 1.4 : 2);
    DS.headA = chase ? -0.1 : search ? 0.7 + (calm ? 0 : sin(ti * 9 + ph0) * 0.07) : flee ? 0.16 : idle ? -0.1 : 0;
    DS.flap = chase && !calm ? sin(ti * 22 + ph0) * 0.2 : 0;
    DS.blink = !calm && !frozen && (idle || mode === "patrol") && mod(ti + ph0, 4.7) < 0.13;
    const bob = calm || frozen || !walkish ? 0 : sin(phase * 2) * (chase ? 0.9 : 0.5);
    const sc = sz * (kind ? 0.9 : 0.88), a0 = d.slow ? A0 * 0.55 : A0; // já assustado neste poder: esmaecido
    A0 = a0;
    ctx.save();
    ctx.globalAlpha = a0;
    ctx.translate(x, y + 11 * sc); ctx.scale(dir * sc, sc); ctx.translate(0, -11 + bob);
    ctx.lineJoin = "round";
    ctx.globalAlpha = a0 * 0.26; oval(ctx, 0, 11 - bob, 13.5, 3.8, "#000000"); ctx.globalAlpha = a0;
    dogSide(ctx, DS);
    ctx.restore();
    if (flee) { // estrelinhas girando em volta da cabeça (esmaecidas se já foi pego)
      ctx.save(); ctx.globalAlpha = a0;
      for (let k = 0; k < 3; k++) { const a = (calm ? 0 : ti * 5) + k * 2.1; star4(ctx, x + dir * 6 * sc + cos(a) * 9 * sc, y - 14 * sc + sin(a) * 3 * sc, 2.5, "#ffe066"); }
      ctx.restore();
    }
    if (frozen) { ctx.save(); ctx.globalAlpha = A0 * (0.85); star4(ctx, x - 6 * sc, y - 6 * sc, 2.4, "#ffffff"); star4(ctx, x + 8 * sc * dir, y - 11 * sc, 2, "#ffffff"); ctx.restore(); }
  }

  // ====================================================================================================================
  //  OS RATINHOS, O NOVELO, O POSTO E OS EFEITOS
  // ====================================================================================================================
  const MICE = [
    { fur: "#9aa0ab", dark: "#737a86", belly: "#c9cdd4", ear: "#e7a3ad", eye: "#1a1a1f" },
    { fur: "#a8744a", dark: "#7c5232", belly: "#d3ad86", ear: "#e7a3ad", eye: "#1a1a1f" },
    { fur: "#f4efe8", dark: "#d6cec2", belly: "#fffaf3", ear: "#f3a6b4", eye: "#b3263a" },
  ];
  // enfeites das skins do ratinho (0.19.0): `lk.c1` e `lk.c2` = as duas cores do enfeite (corpo do ratinho em coordenadas locais: cabeça em (5.9, 0.2), pescoço em x ≈ 3,5)
  function mouseCap(c, lk) { // gorrinho de tricô em cone, entre as orelhas: faixa clara embaixo e pompom na ponta (que cai para trás)
    const c1 = lk.c1 || "#e8403a", c2 = lk.c2 || "#ffffff";
    tri(c, 2.4, -3.3, 8.6, -3.1, 4.2, -9.8, c1, true);
    c.fillStyle = c2; c.beginPath(); c.moveTo(2.1, -2.5); c.lineTo(8.9, -2.3); c.lineTo(8.4, -4.2); c.lineTo(2.6, -4.4); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.6; c.stroke();
    dot(c, 4.1, -10, 1.6, c2); c.strokeStyle = LINE; c.lineWidth = 0.6; c.beginPath(); c.arc(4.1, -10, 1.6, 0, TAU); c.stroke();
  }
  function mouseScarf(c, lk, ti, calm) { // cachecol de duas cores no pescoço, com a ponta caída atrás
    const c1 = lk.c1 || "#e8403a", c2 = lk.c2 || "#ffffff", fl = calm ? 0 : sin(ti * 6) * 0.4;
    seg(c, 3, 3, 1.3 + fl, 6.8, LINE, 3.6); seg(c, 3, 3, 1.3 + fl, 6.8, c1, 2.4); seg(c, 2.4 + fl * 0.5, 5.2, 0.4 + fl, 5.6, c2, 0.8);
    seg(c, 3.5, -1.8, 3.3, 3.8, LINE, 3.9); seg(c, 3.5, -1.8, 3.3, 3.8, c1, 2.7);
    seg(c, 2.1, -0.2, 4.7, -0.2, c2, 0.9); seg(c, 2.1, 2.2, 4.5, 2.2, c2, 0.9);
  }
  function drawMouse(ctx, it, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    it = it || {}; o = o || {};
    const vr = ((floor(num(it.variant, 0)) % 3) + 3) % 3, lk = o.look, M = lk && lk.coats && lk.coats.length ? lk.coats[vr % lk.coats.length] : MICE[vr]; // (skin da lojinha: outra pelagem e/ou um enfeite)
    const x = num(it.x, 0), y = num(it.y, 0);
    const calm = !!o.calm, ti = calm ? 0 : num(o.time, 0), ph = x * 0.13 + y * 0.07, dir = (floor(x / 16) + floor(y / 16)) & 1 ? -1 : 1;
    const br = sin(ti * 3 + ph) * 0.3, tw = sin(ti * 13 + ph) * 0.35, twitch = !calm && mod(ti + ph, 3.1) < 0.16 ? -0.35 : 0;
    ctx.save(); LINE = "rgba(28,16,8,.5)";
    ctx.globalAlpha = A0 * (0.26); oval(ctx, x + 8, y + 12.2, 10, 3, "#000000"); ctx.globalAlpha = A0;
    ctx.translate(x + 8, y + 7.4); ctx.scale(dir * 0.8, 0.8); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const w1 = sin(ti * 4 + ph) * 1.2, w2 = sin(ti * 4 + ph + 1) * 2, w3 = sin(ti * 4 + ph + 2) * 2.7;
    ctx.beginPath(); ctx.moveTo(-6, 2); ctx.bezierCurveTo(-10, 2 + w1, -12, -1 + w2, -15.5, -0.5 + w3); // rabo fino que se mexe
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.2; ctx.stroke(); ctx.strokeStyle = "#eba7ad"; ctx.lineWidth = 1.3; ctx.stroke();
    oval(ctx, -3.4, 5.2, 2.1, 1.2, "#eba7ad"); oval(ctx, 4.2, 5.4, 1.9, 1.1, "#eba7ad"); // pezinhos
    ovalL(ctx, -2.8, 1.4, 5.2, 4.5, M.fur); // anca
    ovalL(ctx, 0.3, 1.1, 6.7, 4.4 + br, M.fur); // corpo
    oval(ctx, 0.4, 3.9, 4.8, 1.5, M.belly);
    ovalL(ctx, 5.9, 0.2, 4.1, 3.3, M.fur); // cabeça
    tri(ctx, 8.5, -1.7, 12.7, 0.9 + tw * 0.4, 8.5, 2.8, M.fur, true); // focinho pontudo
    ovalL(ctx, 3.8, -3.3 + twitch * 0.5, 2.7, 2.8, M.fur, twitch); oval(ctx, 3.9, -3.1 + twitch * 0.5, 1.6, 1.8, M.ear, twitch); // orelha grande
    ovalL(ctx, 6.9, -3.5, 2.0, 2.2, M.dark, 0.2, 0.7); oval(ctx, 6.9, -3.4, 1.1, 1.3, M.ear);
    if (lk && lk.acc === "cap") mouseCap(ctx, lk);
    if (lk && lk.acc === "scarf") mouseScarf(ctx, lk, ti, calm);
    dot(ctx, 12.4, 0.8 + tw * 0.4, 1.1, "#e57f93");
    dot(ctx, 7.7, -0.5, 1, M.eye); dot(ctx, 8, -0.9, 0.38, "#fff");
    ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 0.55; ctx.beginPath();
    ctx.moveTo(10.6, 1.2); ctx.lineTo(14.8, -0.9 + tw); ctx.moveTo(10.6, 1.8); ctx.lineTo(14.9, 2.4 + tw); ctx.stroke();
    ctx.restore();
  }

  const AGILE = ["#d3d7de", "#f1e2c6", "#f3cfd6", "#cddbe9"];
  // enfeites das skins do camundongo ágil (0.19.0): gorro, laço ou faixa de corredor; `run` = correndo (orelhas para trás) ou parado, sentadinho
  function agileAcc(c, lk, run, ti, calm) {
    const c1 = lk.c1 || "#e8403a", c2 = lk.c2 || "#ffffff", ac = lk.acc, wig = calm ? 0 : sin(ti * 14) * 0.9;
    if (ac === "cap") { // gorro de tricô com pompom
      const cx = run ? 4.8 : 3.1, cy = run ? -1.5 : -2.9, rx = run ? 2.8 : 3.3, ry = run ? 2.1 : 2.5;
      c.fillStyle = c1; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, PI, TAU); c.closePath(); c.fill(); c.strokeStyle = LINE; c.lineWidth = 0.7; c.stroke();
      c.fillStyle = c2; c.fillRect(cx - rx - 0.2, cy - 0.1, 2 * rx + 0.4, 1.4); c.strokeStyle = LINE; c.lineWidth = 0.5; c.strokeRect(cx - rx - 0.2, cy - 0.1, 2 * rx + 0.4, 1.4);
      dot(c, cx - (run ? rx - 0.4 : 0.3), cy - ry - 0.5, 1.15, c2); c.beginPath(); c.arc(cx - (run ? rx - 0.4 : 0.3), cy - ry - 0.5, 1.15, 0, TAU); c.stroke();
    } else if (ac === "bow") { // laço entre as orelhas
      const bx = run ? 4.2 : 3.2, by = run ? -3.6 : -5.2;
      tri(c, bx, by, bx - 3.4, by - 2.5, bx - 3.4, by + 2.3, c1, true); tri(c, bx, by, bx + 3.4, by - 2.5, bx + 3.4, by + 2.3, c1, true);
      dot(c, bx, by, 1.3, c2); c.strokeStyle = LINE; c.lineWidth = 0.6; c.beginPath(); c.arc(bx, by, 1.3, 0, TAU); c.stroke();
    } else if (ac === "band") { // faixa de corredor na testa, com as pontas ao vento
      const ax = run ? 3.4 : 0.4, ay = run ? -2.2 : -2.5, bx = run ? 7.6 : 6.3, by = run ? -0.4 : -2.5;
      seg(c, ax, ay, ax - 4.2, ay - 1 + wig, c1, 1.2); seg(c, ax, ay, ax - 3.8, ay + 1.1 + wig, c1, 1.2);
      seg(c, ax, ay, bx, by, LINE, 2.6); seg(c, ax, ay, bx, by, c1, 1.7); seg(c, (ax + bx) / 2 - 0.4, (ay + by) / 2 - 0.2, (ax + bx) / 2 + 0.4, (ay + by) / 2 + 0.2, c2, 0.9);
    }
  }
  function drawAgileMouse(ctx, b, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    b = b || {}; o = o || {};
    const x = num(b.x, 0), y = num(b.y, 0), vx = num(b.vx, 0), vy = num(b.vy, 0), s = clamp(num(o.r, 8), 2, 40) / 8;
    const calm = !!o.calm, ti = calm ? 0 : num(o.time, 0), hue = floor(num(b.hue, 0)), lk = o.look, hi = ((hue % 4) + 4) % 4, F = lk && lk.coats && lk.coats.length ? lk.coats[hi % lk.coats.length] : AGILE[hi], sp = hypot(vx, vy), run = sp >= 8;
    const side = vx < -0.5 ? -1 : vx > 0.5 ? 1 : hue & 1 ? -1 : 1, ang = run ? atan2(vy, vx * side) : 0;
    ctx.save(); LINE = "rgba(28,16,8,.45)";
    ctx.globalAlpha = A0 * (0.24); oval(ctx, x, y + 6.2 * s, 7.5 * s, 2.3 * s, "#000000"); ctx.globalAlpha = A0;
    ctx.translate(x, y); ctx.scale(side * s, s); ctx.rotate(ang); ctx.lineJoin = "round"; ctx.lineCap = "round";
    const eyec = "#1a1a1f", pink = "#ee9fa8";
    if (run) { // correndo: corpo esticado, orelhas para trás, perninhas em movimento e rastro de velocidade
      const lg = calm ? 0 : sin(ti * 30) * 2.2, tl = calm ? 0 : sin(ti * 18) * 1.8;
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-15, -2); ctx.moveTo(-10, 2.2); ctx.lineTo(-17, 2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5.5, 0.4); ctx.quadraticCurveTo(-9.5, 0.2 + tl * 0.5, -12, tl); ctx.strokeStyle = LINE; ctx.lineWidth = 1.9; ctx.stroke(); ctx.strokeStyle = pink; ctx.lineWidth = 1; ctx.stroke();
      seg(ctx, -2.5, 2.5, -4.5 - lg, 4.4, pink, 1.2); seg(ctx, 3.5, 2.5, 5.2 + lg, 4.4, pink, 1.2);
      ovalL(ctx, -0.5, 0.2, 6.2, 3.2, F, 0, 0.8);
      ovalL(ctx, 5.4, -0.1, 3, 2.4, F, 0, 0.8); tri(ctx, 7.4, -1.4, 10.4, 0.2, 7.4, 1.6, F, true); dot(ctx, 10.2, 0.2, 0.9, "#e57f93");
      ovalL(ctx, 3.1, -2.2, 1.6, 1.8, F, -0.9, 0.7); oval(ctx, 3.0, -2.1, 0.8, 1, "#e7a3ad", -0.9);
      if (lk && lk.acc) agileAcc(ctx, lk, true, ti, calm);
      dot(ctx, 6, -0.7, 0.75, eyec);
    } else { // congelado: sentado, atento, orelhas em pé
      ovalL(ctx, -0.2, 1.7, 4.6, 3.8, F, 0, 0.8); oval(ctx, 0, 3.6, 3.4, 1.2, "rgba(255,255,255,.55)");
      ctx.beginPath(); ctx.moveTo(-3.8, 3.2); ctx.quadraticCurveTo(-8, 3.5, -8.2, 0.2); ctx.strokeStyle = LINE; ctx.lineWidth = 1.9; ctx.stroke(); ctx.strokeStyle = pink; ctx.lineWidth = 1; ctx.stroke();
      oval(ctx, 3.4, 5.3, 1.7, 1, pink); oval(ctx, -2.6, 5.3, 1.7, 1, pink);
      ovalL(ctx, 3.3, -1.3, 3.3, 2.7, F, 0, 0.8); tri(ctx, 5.7, -2, 8.8, -0.4, 5.7, 0.9, F, true); dot(ctx, 8.6, -0.5, 0.85, "#e57f93");
      ovalL(ctx, 1.1, -3.9, 2.1, 2.5, F, -0.1, 0.8); oval(ctx, 1.1, -3.8, 1.2, 1.5, "#e7a3ad", -0.1); ovalL(ctx, 4.7, -3.9, 2.1, 2.5, F, 0.1, 0.8); oval(ctx, 4.7, -3.8, 1.2, 1.5, "#e7a3ad", 0.1);
      if (lk && lk.acc) agileAcc(ctx, lk, false, ti, calm);
      dot(ctx, 5, -1.7, 1.05, eyec); dot(ctx, 5.3, -2.1, 0.4, "#fff");
    }
    ctx.restore();
    if (!run) { // pontinhos de susto em cima da cabecinha
      ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.globalAlpha = A0 * (0.9); ctx.beginPath();
      ctx.moveTo(x - 3.5 * s, y - 9 * s); ctx.lineTo(x - 5 * s, y - 11.5 * s); ctx.moveTo(x, y - 9.6 * s); ctx.lineTo(x, y - 12.4 * s); ctx.moveTo(x + 3.5 * s, y - 9 * s); ctx.lineTo(x + 5 * s, y - 11.5 * s); ctx.stroke(); ctx.restore();
    }
  }

  const YARN = {
    scare: { fill: "#ff8f8a", strand: "#d94b4b", hi: "#ffd0cc", glow: null },
    gold: { fill: "#ffd23f", strand: "#c4900c", hi: "#fff2b0", glow: "rgba(255,210,63,.36)" },
    ice: { fill: "#bfeaff", strand: "#4f9fd0", hi: "#ffffff", glow: "rgba(120,200,255,.36)" },
    turbo: { fill: "#ff9f43", strand: "#c2570c", hi: "#ffd9a8", glow: "rgba(255,120,40,.36)" },
    magnet: { fill: "#cfa8ff", strand: "#8a4fd1", hi: "#efe0ff", glow: "rgba(190,130,255,.4)" },
  };
  const YARN_KEYS = Object.freeze(Object.fromEntries(Object.keys(YARN).map((k) => [k, Object.freeze(Object.assign({}, YARN[k]))]))); // as cores-chave de cada tipo de poder (cópia congelada, para os testes): nenhuma skin as muda
  // estampas das skins do novelo (0.19.0): só ENFEITE em branco ou cores pequenas por cima da cor do tipo (a cor-chave de cada poder, a marquinha e o brilho continuam como são); desenhadas dentro da bola (clip)
  function heart(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * 0.95); c.bezierCurveTo(x - s * 1.7, y - s * 0.1, x - s * 0.7, y - s * 1.5, x, y - s * 0.5); c.bezierCurveTo(x + s * 0.7, y - s * 1.5, x + s * 1.7, y - s * 0.1, x, y + s * 0.95); c.closePath(); c.fill(); }
  function yarnPattern(c, pat) {
    if (pat === "stripes") { c.strokeStyle = "#ffffff"; c.lineWidth = 1.7; c.globalAlpha = A0 * 0.6; c.beginPath(); for (let i = -2; i <= 2; i++) { const k = i * 4.6, x1 = Math.min(7, k + 7), x2 = Math.max(-7, k - 7); c.moveTo(x1, k - x1); c.lineTo(x2, k - x2); } c.stroke(); } // (listras na diagonal "/", dentro do quadrado da bola)
    else if (pat === "dots") { c.fillStyle = "#ffffff"; c.globalAlpha = A0 * 0.9; for (const [px, py] of [[-3.4, -3.6], [1, -4.6], [-5, 0.4], [-0.6, -0.4], [4, -1.8], [-3, 4], [1.6, 3.4], [5, 3.6]]) { c.beginPath(); c.arc(px, py, 1.15, 0, TAU); c.fill(); } }
    else if (pat === "hearts") { c.fillStyle = "#ffffff"; c.globalAlpha = A0 * 0.95; heart(c, -3, -2.4, 2.1); heart(c, 3.2, -0.6, 2.1); heart(c, -1.6, 3.8, 2.1); heart(c, 4, 5, 1.3); }
    else if (pat === "rainbow") { // arquinho de arco-íris (adesivo) embaixo à esquerda
      c.globalAlpha = A0; c.lineCap = "butt"; c.lineWidth = 1.1;
      c.strokeStyle = "#e8403a"; c.beginPath(); c.arc(-3.2, 4.6, 4, PI, TAU); c.stroke(); c.strokeStyle = "#ffc83d"; c.beginPath(); c.arc(-3.2, 4.6, 2.9, PI, TAU); c.stroke(); c.strokeStyle = "#3f86e0"; c.beginPath(); c.arc(-3.2, 4.6, 1.8, PI, TAU); c.stroke();
      c.lineCap = "round"; dot(c, -7.2, 4.8, 1.2, "#ffffff"); dot(c, 0.8, 4.8, 1.2, "#ffffff");
    }
  }
  function drawYarn(ctx, it, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    it = it || {}; o = o || {};
    const x = num(it.x, 0), y = num(it.y, 0), K = YARN[it.kind] || YARN.scare, kind = YARN[it.kind] ? it.kind : "scare";
    const calm = !!o.calm, ti = calm ? 0 : num(o.time, 0);
    const cx = x + 8, cy = y + 8 + (calm ? 0 : sin(ti * 4 + x) * 2), rock = calm ? 0 : sin(ti * 2.3 + x) * 0.22;
    ctx.save(); LINE = "rgba(40,20,20,.55)";
    ctx.globalAlpha = A0 * (0.25); oval(ctx, cx, cy + 7.6, 9.5, 3, "#000000"); ctx.globalAlpha = A0;
    if (K.glow) { oval(ctx, cx, cy, 14, 14, K.glow); }
    ctx.translate(cx, cy); ctx.lineCap = "round"; ctx.lineJoin = "round";
    // fio solto: sai da parte de baixo, faz uma voltinha e termina numa pontinha
    ctx.beginPath(); ctx.moveTo(3.4, 5.6); ctx.bezierCurveTo(7, 9.2, 11, 6.5, 10, 9.4); ctx.bezierCurveTo(9, 11.8, 6.2, 10.6, 7.6, 8.6);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2.6; ctx.stroke(); ctx.strokeStyle = K.strand; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.rotate(rock);
    ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.fillStyle = K.fill; ctx.fill(); ctx.save(); ctx.clip();
    ctx.strokeStyle = K.strand; ctx.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, 8.4, 3.6 + (i % 2) * 0.6, i * 0.8 - 0.2, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = K.hi; ctx.lineWidth = 0.8; ctx.globalAlpha = A0 * (0.7);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-0.6, -0.6, 7.2, 2.6, i * 1.05 + 0.4, 0, TAU); ctx.stroke(); }
    if (o.look && o.look.pat) yarnPattern(ctx, o.look.pat); // (skin da lojinha: estampa por cima da cor do tipo)
    ctx.globalAlpha = A0 * (0.16); oval(ctx, 1.5, 3.2, 7, 4.5, "#000000"); ctx.globalAlpha = A0;
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 7.2, 0, TAU); ctx.strokeStyle = LINE; ctx.lineWidth = 1.2; ctx.stroke();
    oval(ctx, -2.6, -2.8, 2.1, 1.3, "rgba(255,255,255,.75)", -0.6);
    ctx.rotate(-rock);
    // marquinha de cada tipo (ajuda quem não distingue as cores) + brilho que pisca
    const tw = calm ? 1 : 0.65 + 0.35 * sin(ti * 6 + x);
    if (kind === "gold") star4(ctx, 6.4, -6.6, 2.7 * tw, "#fffbe0");
    else if (kind === "ice") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i * PI / 3 + 0.3; ctx.moveTo(6.4 + cos(a) * 2.7 * tw, -6.6 + sin(a) * 2.7 * tw); ctx.lineTo(6.4 - cos(a) * 2.7 * tw, -6.6 - sin(a) * 2.7 * tw); } ctx.stroke(); }
    else if (kind === "turbo") { ctx.fillStyle = "#fff3a0"; ctx.strokeStyle = "#a8420a"; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(7.6, -9.4); ctx.lineTo(4.4, -6); ctx.lineTo(6.4, -6); ctx.lineTo(5, -2.8); ctx.lineTo(8.8, -7); ctx.lineTo(6.8, -7); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    else if (kind === "magnet") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(6.2, -6.2, 2.2 * tw + 0.4, PI * 0.9, PI * 1.9); ctx.stroke(); ctx.beginPath(); ctx.arc(6.2, -6.2, 4.3 * tw + 0.4, PI * 1, PI * 1.8); ctx.stroke(); }
    ctx.restore();
  }

  function shingle(c, x, y, w, h, base, line) { c.fillStyle = base; c.fillRect(x, y, w, h); c.strokeStyle = line; c.lineWidth = 1; c.beginPath(); for (let yy = y + 3.3; yy < y + h - 1; yy += 3.3) { c.moveTo(x, yy); c.lineTo(x + w, yy); } c.stroke(); }
  function drawPost(ctx, x, y, o) {
    if (!ctx) return;
    o = o || {}; x = num(x, 0); y = num(y, 0);
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round";
    if (o.kind === "tracker") { // almofada azul com a tigela
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + 1, y + 14, 19, 6, 0, 0, TAU); ctx.fill();
      rr(ctx, x - 19, y - 14, 38, 28, 9, "#456bc2", "#2f4c93");
      rr(ctx, x - 15, y - 10.5, 30, 21, 7, "#6b92e6", null);
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.setLineDash([2.5, 2.5]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 12, y - 7.5); ctx.lineTo(x + 12, y - 7.5); ctx.lineTo(x + 12, y + 7.5); ctx.lineTo(x - 12, y + 7.5); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, x - 7, y - 1, 3, "rgba(255,255,255,.78)"); for (let i = 0; i < 3; i++) dot(ctx, x - 11 + i * 4.2, y - 6 + (i === 1 ? -1 : 0), 1.2, "rgba(255,255,255,.78)"); // patinha
      dot(ctx, x - 7, y + 2, 0.1, "rgba(255,255,255,.78)");
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(x + 12, y + 11.2, 9, 3.4, 0, 0, TAU); ctx.fill();
      ovalL(ctx, x + 11, y + 7.2, 9, 5.8, "#c9d1db", 0, 1); oval(ctx, x + 11, y + 6.8, 6.8, 4.1, "#7b8594"); oval(ctx, x + 11, y + 6.4, 6.2, 3.6, "#a8703a");
      for (let i = 0; i < 5; i++) dot(ctx, x + 8.4 + i * 1.3, y + 5.2 + (i % 2) * 1.5, 1.1, i % 2 ? "#8b5a2b" : "#c38a4c");
    } else { // casinha de cachorro vista de cima: telhado em duas águas, porta escura em arco
      ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.beginPath(); ctx.ellipse(x + 1, y + 16, 21, 5.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#d3a86f"; ctx.fillRect(x - 16, y + 3, 32, 13); // parede da frente (madeira)
      ctx.strokeStyle = "#a97f4a"; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 8; i++) { ctx.moveTo(x - 16 + i * 4, y + 3); ctx.lineTo(x - 16 + i * 4, y + 16); } ctx.stroke();
      ctx.fillStyle = "#6e4a24"; ctx.fillRect(x - 17, y + 14.5, 34, 2.4);
      ctx.fillStyle = "#2a1a12"; ctx.beginPath(); ctx.moveTo(x - 6.5, y + 16); ctx.lineTo(x - 6.5, y + 9.5); ctx.arc(x, y + 9.5, 6.5, PI, 0); ctx.lineTo(x + 6.5, y + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#4b3223"; ctx.beginPath(); ctx.ellipse(x, y + 14, 4.4, 2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7.2, y + 16); ctx.lineTo(x - 7.2, y + 9.5); ctx.arc(x, y + 9.5, 7.2, PI, 0); ctx.lineTo(x + 7.2, y + 16); ctx.stroke();
      shingle(ctx, x - 19, y - 16, 38, 10, "#a24633", "#7c3022"); // água de trás (mais escura)
      shingle(ctx, x - 20, y - 6, 40, 11, "#cf5f45", "#a94a35"); // água da frente
      ctx.fillStyle = "#7a2f21"; ctx.fillRect(x - 20, y - 6.7, 40, 1.7); // cumeeira
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x - 20, y - 5, 40, 1);
      ctx.strokeStyle = "rgba(28,16,8,.5)"; ctx.lineWidth = 1; ctx.strokeRect(x - 19.5, y - 15.5, 38, 20);
      ctx.fillStyle = "#f4f1e6"; ctx.strokeStyle = "#8d856f"; ctx.lineWidth = 0.8; // ossinho na cumeeira
      ctx.beginPath(); ctx.rect(x - 4, y - 11.2, 8, 2.2); ctx.fill(); ctx.stroke(); for (let s = -1; s <= 1; s += 2) for (let r = -1; r <= 1; r += 2) dot(ctx, x + s * 4.2, y - 10.1 + r * 1.2, 1.3, "#f4f1e6");
    }
    ctx.restore();
  }
  function rr(c, x, y, w, h, r, fill, stroke) { // retângulo de cantos redondos
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
    c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.4; c.stroke(); }
  }

  // ====================================================================================================================
  //  O LUGAR ALTO (T) DAS SKINS DA LOJINHA (0.19.0): o tile de 32×32 inteiro, no lugar do lugar alto do ambiente (js/game.js só chama quando a skin em uso tem `style`)
  // ====================================================================================================================
  // Mesma linguagem dos lugares altos dos ambientes: topo claro com brilho na quina, face da frente mais escura, contorno suave e sombra COMPRIDA para baixo e para a direita, tudo dentro do tile.
  // O topo (o chão onde o gatinho fica de pé) ocupa o meio do tile; campos de `look`: style ("wood"|"cushion"|"castle"|"tree"), top, face, edge, acc1, acc2 (cores; cada estilo tem as suas padrão).
  const hexOr = (v, d) => (typeof v === "string" && (/^#[0-9a-f]{6}$/i.test(v) || /^rgba\(\s*\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+)\s*\)$/i.test(v)) ? v : d);
  function perchShade(c, x, y, ox, oy, w, h, round) { // sombra comprida: o mesmo contorno do objeto, deslocado em dois passos para baixo e para a direita (nunca sai do tile)
    for (const [dx, dy, a] of [[3, 5, ".13"], [6, 9, ".17"]]) {
      const sx = ox + dx, sy = oy + dy, ww = Math.max(0, Math.min(w, 32 - sx)), hh = Math.max(0, Math.min(h, 32 - sy));
      if (ww <= 0 || hh <= 0) continue;
      c.fillStyle = "rgba(0,0,0," + a + ")";
      if (round) { c.beginPath(); c.ellipse(x + sx + ww / 2, y + sy + hh / 2, ww / 2, hh / 2, 0, 0, TAU); c.fill(); } else c.fillRect(x + sx, y + sy, ww, hh);
    }
  }
  const PERCH = {
    wood(c, x, y, L) { // prateleira de madeira: tampo de tábuas, frente escura e dois pezinhos
      const top = hexOr(L.top, "#ecc88f"), face = hexOr(L.face, "#a9753f"), edge = hexOr(L.edge, "rgba(60,36,12,.62)"), grain = hexOr(L.acc1, "#c99a5c"), nail = hexOr(L.acc2, "#6e4a24");
      perchShade(c, x, y, 3, 6, 26, 22);
      c.fillStyle = nail; c.fillRect(x + 5, y + 27, 5, 4); c.fillRect(x + 22, y + 27, 5, 4);
      c.fillStyle = face; c.fillRect(x + 3, y + 22, 26, 6);
      c.fillStyle = top; c.fillRect(x + 3, y + 6, 26, 16);
      c.strokeStyle = grain; c.lineWidth = 1; c.beginPath(); for (const yy of [10, 14, 18]) { c.moveTo(x + 4, y + yy); c.lineTo(x + 28, y + yy); } c.stroke(); // juntas das tábuas
      c.strokeStyle = face; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + 3, y + 25); c.lineTo(x + 29, y + 25); c.stroke(); c.globalAlpha = A0 * 0.35; c.strokeStyle = "#000000"; c.beginPath(); c.moveTo(x + 3, y + 25.5); c.lineTo(x + 29, y + 25.5); c.stroke(); c.globalAlpha = A0;
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x + 3, y + 6, 26, 1.6); c.fillRect(x + 3, y + 6, 1.6, 16); // brilho da quina de cima e da esquerda
      for (const [nx, ny] of [[6.5, 9.5], [25.5, 9.5], [6.5, 19], [25.5, 19]]) dot(c, x + nx, y + ny, 0.9, nail);
      c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect(x + 3.5, y + 6.5, 25, 21.5); c.beginPath(); c.moveTo(x + 3, y + 22); c.lineTo(x + 29, y + 22); c.stroke();
    },
    cushion(c, x, y, L) { // almofadão redondo (pufe): disco de cima fofo, lateral mais escura, cordão e botão
      const top = hexOr(L.top, "#ffc4dc"), face = hexOr(L.face, "#e48ab0"), edge = hexOr(L.edge, "rgba(110,36,76,.55)"), cord = hexOr(L.acc1, "#c8688f"), tuft = hexOr(L.acc2, "rgba(150,60,104,.4)");
      perchShade(c, x, y, 4, 8, 26, 17, true);
      c.fillStyle = face; c.fillRect(x + 3, y + 14, 26, 9); oval(c, x + 16, y + 23, 13, 6, face);
      c.strokeStyle = edge; c.lineWidth = 1; c.beginPath(); c.ellipse(x + 16, y + 23, 13, 6, 0, 0, PI); c.stroke(); c.beginPath(); c.moveTo(x + 3, y + 14); c.lineTo(x + 3, y + 23); c.moveTo(x + 29, y + 14); c.lineTo(x + 29, y + 23); c.stroke();
      oval(c, x + 16, y + 14, 13, 9, top);
      c.strokeStyle = cord; c.lineWidth = 1.4; c.beginPath(); c.ellipse(x + 16, y + 14, 12.4, 8.4, 0, 0, TAU); c.stroke(); // cordão em volta do disco
      c.strokeStyle = tuft; c.lineWidth = 0.9; c.beginPath(); for (let i = 0; i < 6; i++) { const a = i * (PI / 3) + 0.5; c.moveTo(x + 16 + cos(a) * 2.2, y + 14 + sin(a) * 1.5); c.lineTo(x + 16 + cos(a) * 10, y + 14 + sin(a) * 6.6); } c.stroke(); // franzidos até o botão
      dot(c, x + 16, y + 14, 2, cord);
      c.globalAlpha = A0 * 0.5; oval(c, x + 11, y + 9.5, 6, 2.2, "#ffffff", -0.25); c.globalAlpha = A0;
      c.strokeStyle = edge; c.lineWidth = 1; c.beginPath(); c.ellipse(x + 16, y + 14, 13, 9, 0, 0, TAU); c.stroke();
    },
    castle(c, x, y, L) { // castelinho de brinquedo: topo de pedra com ameias, parede da frente com porta e bandeirinha
      const top = hexOr(L.top, "#dde5f6"), face = hexOr(L.face, "#8ea5cf"), edge = hexOr(L.edge, "rgba(30,40,84,.62)"), flag = hexOr(L.acc1, "#e8403a"), door = hexOr(L.acc2, "#3a2f5e");
      perchShade(c, x, y, 3, 6, 26, 22);
      c.fillStyle = face; c.fillRect(x + 3, y + 22, 26, 6.5);
      c.strokeStyle = mixc(face, "#000000", 0.25); c.lineWidth = 0.9; c.beginPath(); c.moveTo(x + 3, y + 25.2); c.lineTo(x + 29, y + 25.2); for (const bx of [6, 12, 20, 26]) { c.moveTo(x + bx, y + 22); c.lineTo(x + bx, y + 25.2); } for (const bx of [9, 23]) { c.moveTo(x + bx, y + 25.2); c.lineTo(x + bx, y + 28.5); } c.stroke();
      c.fillStyle = door; c.beginPath(); c.moveTo(x + 13, y + 28.5); c.lineTo(x + 13, y + 26); c.arc(x + 16, y + 26, 3, PI, 0); c.lineTo(x + 19, y + 28.5); c.closePath(); c.fill();
      c.fillStyle = top; c.fillRect(x + 3, y + 6.5, 26, 15.5);
      c.fillStyle = top; for (let i = 0; i < 5; i++) { const mx = x + 3 + i * 5.5; c.fillRect(mx, y + 2.6, 4, 4.4); c.strokeStyle = edge; c.lineWidth = 0.9; c.strokeRect(mx + 0.4, y + 3, 3.2, 3.8); } // ameias
      c.strokeStyle = mixc(top, "#5c70a8", 0.45); c.lineWidth = 0.9; c.beginPath(); for (const [ax, ay, bx2] of [[5, 11, 14], [17, 11, 27], [5, 16, 10], [12, 16, 22], [24, 16, 27]]) { c.moveTo(x + ax, y + ay); c.lineTo(x + bx2, y + ay); } c.stroke(); // juntas das pedras
      c.fillStyle = "rgba(255,255,255,.6)"; c.fillRect(x + 3, y + 6.5, 26, 1.4); c.fillRect(x + 3, y + 6.5, 1.4, 15.5);
      c.strokeStyle = edge; c.lineWidth = 1; c.strokeRect(x + 3.5, y + 6.5, 25, 22); c.beginPath(); c.moveTo(x + 3, y + 22); c.lineTo(x + 29, y + 22); c.stroke();
      c.fillStyle = "#6b5a3c"; c.fillRect(x + 25.6, y + 0.4, 1, 3.4); tri(c, x + 26.6, y + 0.4, x + 31.2, y + 1.9, x + 26.6, y + 3.4, flag, true); // bandeirinha na ameia da direita
    },
    tree(c, x, y, L) { // torre de arranhar: topo de carpete macio com borda, poste de corda embaixo e bolinha pendurada
      const top = hexOr(L.top, "#e4d6fa"), face = hexOr(L.face, "#9c7fd0"), edge = hexOr(L.edge, "rgba(56,28,98,.58)"), rope = hexOr(L.acc1, "#d9c28c"), ball = hexOr(L.acc2, "#e8403a");
      perchShade(c, x, y, 3, 6, 26, 22);
      c.fillStyle = rope; c.fillRect(x + 12.5, y + 25, 7, 6.6); c.strokeStyle = mixc(rope, "#000000", 0.28); c.lineWidth = 0.9; c.beginPath(); for (const yy of [27, 29, 31]) { c.moveTo(x + 12.5, y + yy); c.lineTo(x + 19.5, y + yy - 1); } c.stroke();
      rr(c, x + 3, y + 6, 26, 20, 5, face, null); // base escura (a borda)
      rr(c, x + 3, y + 6, 26, 16.5, 5, top, null);
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(x + 7, y + 6.5, 18, 1.4);
      c.fillStyle = "rgba(120,92,180,.32)"; for (const [px, py] of [[8, 12], [13, 9.5], [20, 11], [24, 15], [10, 18], [17, 17.5], [6, 15.5], [22, 19]]) c.fillRect(x + px, y + py, 1.4, 1.4); // carpete felpudo
      c.fillStyle = "rgba(130,100,190,.55)"; c.beginPath(); c.ellipse(x + 8.5, y + 18, 1.9, 1.5, 0, 0, TAU); c.fill(); for (const [px, py] of [[6.2, 15.4], [8.4, 14.6], [10.6, 15.4]]) { c.beginPath(); c.arc(x + px, y + py, 0.8, 0, TAU); c.fill(); } // patinha
      rr(c, x + 3, y + 6, 26, 20, 5, "rgba(0,0,0,0)", edge); c.beginPath(); c.moveTo(x + 4, y + 22.5); c.lineTo(x + 28, y + 22.5); c.strokeStyle = edge; c.lineWidth = 0.9; c.stroke();
      seg(c, x + 27, y + 14, x + 29.4, y + 21, edge, 0.9); dot(c, x + 29.4, y + 22.4, 2.2, ball); c.strokeStyle = edge; c.lineWidth = 0.7; c.beginPath(); c.arc(x + 29.4, y + 22.4, 2.2, 0, TAU); c.stroke(); dot(c, x + 28.7, y + 21.7, 0.7, "rgba(255,255,255,.8)");
    },
  };
  function drawPerch(ctx, x, y, o) {
    o = o || {};
    const L = o.look, fn = L && typeof L.style === "string" ? PERCH[L.style] : null;
    if (!ctx || !fn) return false;
    A0 = alphaIn(ctx);
    ctx.save(); ctx.lineJoin = "round"; ctx.lineCap = "round"; LINE = "rgba(28,16,8,.5)";
    fn(ctx, num(x, 0), num(y, 0), L);
    ctx.restore();
    return true;
  }

  // ---------- efeitos curtos (t de 0 a 1) ----------
  function drawFx(ctx, kind, x, y, t, o) {
    if (!ctx) return;
    A0 = alphaIn(ctx);
    o = o || {}; x = num(x, 0); y = num(y, 0); t = clamp(num(t, 0.5), 0, 1);
    const calm = !!o.calm, e = 1 - (1 - t) * (1 - t), fade = 1 - t;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    switch (kind) {
      case "splash": { // pisou na poça: argolas achatadas e gotas que sobem e caem
        for (let r = 0; r < 2; r++) { const tt = clamp(t * 1.25 - r * 0.22, 0, 1); if (tt <= 0) continue; ctx.globalAlpha = A0 * ((1 - tt) * 0.85); ctx.strokeStyle = r ? "#d7f1ff" : "#9fdcff"; ctx.lineWidth = 1.8 - tt; ctx.beginPath(); ctx.ellipse(x, y + 9, 5 + 15 * tt, 2.4 + 6 * tt, 0, 0, TAU); ctx.stroke(); }
        for (let i = 0; i < 9; i++) {
          const a = i * (TAU / 9) + 0.4, rad = (5 + 12 * h01(i)) * (calm ? 0.6 : e), hgt = calm ? 8 : 4 * t * (1 - t) * (14 + 12 * h01(i + 9));
          ctx.globalAlpha = A0 * (fade * 0.95); dot(ctx, x + cos(a) * rad, y + 6 + sin(a) * rad * 0.45 - hgt, 2.1 - 0.7 * t, i % 3 ? "#8fd3ff" : "#d7f1ff");
        }
        break;
      }
      case "shake": { // sacudiu o pelo molhado: gotinhas voam para todos os lados
        if (t < 0.55) { ctx.globalAlpha = A0 * ((0.55 - t) / 0.55 * 0.9); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, 15, PI * 0.8, PI * 1.2); ctx.arc(x, y, 15, -PI * 0.2, PI * 0.2); ctx.stroke(); }
        for (let i = 0; i < 12; i++) {
          const a = i * (TAU / 12) + h01(i) * 0.5, rad = calm ? 20 : 8 + (14 + 12 * h01(i + 3)) * e;
          ctx.globalAlpha = A0 * (fade * 0.95); drop(ctx, x + cos(a) * rad, y + sin(a) * rad * 0.8, 2.2 + h01(i + 6), a, i % 2 ? "#8fd3ff" : "#cdeeff");
        }
        break;
      }
      case "dust": { // poeirinha da arrancada: nuvenzinhas que ficam para trás
        // (bx, by) aponta para TRÁS do gatinho (sem `facing`, a poeira se abre para os dois lados)
        const f = o.facing, bx = f === "left" ? 1 : f === "right" ? -1 : 0, by = f === "up" ? 1 : f === "down" ? -1 : 0;
        for (let i = 0; i < 5; i++) {
          const dist = calm ? 9 : (3 + 5 * i) * (0.4 + e * 0.9), side = (i - 2) * 2.4;
          const px = bx ? x + bx * dist : x + side * (by ? 1 : 1.6) * (by ? 1 : dist / 9), py = (bx ? y + 8 + side * 0.5 : by ? y + 8 + by * dist * 0.8 : y + 8) - 3 * e;
          ctx.globalAlpha = A0 * (fade * 0.7); dot(ctx, px, py, 2.4 + 4 * e * (0.7 + 0.3 * h01(i)), i % 2 ? "#e0d2b4" : "#cdbf9f");
        }
        break;
      }
      case "hiss": { // explosãozinha de linhas
        const r0 = 12 + 3 * t, r1 = 18 + 12 * e;
        ctx.globalAlpha = A0 * (fade);
        ctx.lineWidth = 4.2; ctx.strokeStyle = "rgba(60,20,0,.5)"; ctx.beginPath();
        for (let i = 0; i < 12; i++) { const a = i * (TAU / 12) + 0.26, L = i % 2 ? 0.72 : 1; ctx.moveTo(x + cos(a) * r0, y + sin(a) * r0); ctx.lineTo(x + cos(a) * (r0 + (r1 - r0) * L), y + sin(a) * (r0 + (r1 - r0) * L)); }
        ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = "#fff3b0"; ctx.beginPath();
        for (let i = 0; i < 12; i++) { const a = i * (TAU / 12) + 0.26, L = i % 2 ? 0.72 : 1; ctx.moveTo(x + cos(a) * r0, y + sin(a) * r0); ctx.lineTo(x + cos(a) * (r0 + (r1 - r0) * L), y + sin(a) * (r0 + (r1 - r0) * L)); }
        ctx.stroke();
        break;
      }
      case "sparkle": { // brilho ao pegar
        for (let i = 0; i < 5; i++) {
          const a = i * 1.37 + 0.3, rad = 6 + 9 * h01(i + 12), sz = sin(PI * clamp(t * 1.15 - i * 0.07, 0, 1)) * (2.4 + 2.2 * h01(i + 5));
          if (sz <= 0.05) continue;
          const px = x + cos(a) * rad * (calm ? 1.1 : 0.55 + 0.7 * e), py = y + sin(a) * rad * (calm ? 1.1 : 0.55 + 0.7 * e) - (calm ? 3 : 7 * t);
          ctx.globalAlpha = A0 * (0.95); star4(ctx, px, py, sz + 0.8, "rgba(150,100,0,.6)"); star4(ctx, px, py, sz, i % 2 ? "#fff6c8" : "#ffe27a");
        }
        break;
      }
      case "wetdrop": { // gotinhas caindo do pelo
        for (let i = 0; i < 3; i++) {
          const tt = clamp(t * 1.2 - i * 0.12, 0, 1), gy = calm ? 6 : 14 * tt * tt;
          ctx.globalAlpha = A0 * ((1 - tt * 0.8) * 0.95); drop(ctx, x + (i - 1) * 6, y - 2 + gy + i, 2.5 - tt * 0.6, PI / 2, "#8fd3ff");
          if (tt > 0.85) { ctx.globalAlpha = A0 * Math.min(1, (1 - tt) * 3); ctx.strokeStyle = "#cdeeff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + (i - 1) * 6, y + 12 + i, 3, 1.2, 0, 0, TAU); ctx.stroke(); }
        }
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  return { drawCat, drawDog, drawMouse, drawAgileMouse, drawYarn, drawPost, drawPerch, drawFx, growthStage, SKINS, skinById, YARN_KEYS };
});
