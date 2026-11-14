// Seções da música tema (0.21.0): a INTEGRAÇÃO entre o jogo (js/game.js) e as músicas (js/music.js). Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só estas: node tests/e2e.js "música:"      (NODE_PATH e CHROMIUM_PATH como nos outros testes; sob `flock` se mais de um processo abrir o navegador)
// Ninguém OUVE nada aqui: as seções conferem o que o jogo PEDE à música (tema por estado, abafar, parar, recomeçar, mudo, botão) e o que a música faz no grafo de áudio (ganhos, temas soando).
//  - Quase todas as páginas usam um AudioContext FALSO injetado antes do jogo carregar (FAKE_CTX): ele anda no relógio real, registra os ganhos do barramento da música (o do duck, o do mudo e o de cada tema)
//    e conta os osciladores agendados, de modo que dá para conferir "abafou a 25%", "o barramento zerou" e "só um tema soa" sem depender de placa de som.
//  - Uma seção usa o AudioContext REAL do Chromium (headless, com um gesto simulado) para provar que o tocador roda também nele, sem erro nem aviso.
//  - Os temas registrados hoje podem ser só os de exemplo: o teste usa `Music.get(id)` para saber se um tema existe e, quando os 60 temas das fases estão registrados, exige todos.
const fs = require("fs");
const path = require("path");

// Roda ANTES do jogo: um AudioContext falso, no relógio real, que guarda o que importa da cadeia da música (identificada pelo nome da função de js/music.js que cria cada nó).
const FAKE_CTX = `(() => {
  const F = window.__fake = { ctxs: [], oscs: 0, resumes: 0 };
  class Param { constructor(v) { this.value = v; this.ev = []; }
    setValueAtTime(v, t) { this.ev.push(["set", v, t]); return this; } linearRampToValueAtTime(v, t) { this.ev.push(["lin", v, t]); return this; }
    exponentialRampToValueAtTime(v, t) { this.ev.push(["exp", v, t]); return this; } setTargetAtTime(v, t, c) { this.ev.push(["target", v, t, c]); return this; }
    cancelScheduledValues(t) { this.ev.push(["cancel", t]); return this; } }
  class Node { constructor(c, kind) { this.ctx = c; this.kind = kind; this.out = []; }
    connect(d) { this.out.push(d); return d; } disconnect() { this.out = []; this.gone = true; } }
  const stackTag = () => { const s = new Error().stack || ""; return s.includes("ensureBus") ? "bus" : s.includes("newNode") ? "theme" : ""; };
  class Ctx {
    constructor() { F.ctxs.push(this); this.nodes = []; this.t0 = performance.now(); this.state = "running"; this.sampleRate = 44100; this.destination = new Node(this, "destination"); this.busMade = 0; }
    get currentTime() { return (performance.now() - this.t0) / 1000; }
    createGain() { const n = new Node(this, "gain"); n.gain = new Param(1); n.tag = stackTag(); if (n.tag === "bus") n.tag = ++this.busMade === 1 ? "duck" : "bus"; if (n.tag) this.nodes.push(n); return n; }
    createDynamicsCompressor() { const n = new Node(this, "compressor"); for (const k of ["threshold", "knee", "ratio", "attack", "release"]) n[k] = new Param(0); this.nodes.push(n); return n; }
    createOscillator() { F.oscs++; const n = new Node(this, "osc"); n.frequency = new Param(440); n.detune = new Param(0); n.type = "sine"; n.start = () => {}; n.stop = () => {}; n.setPeriodicWave = () => {}; return n; }
    createBiquadFilter() { const n = new Node(this, "biquad"); n.frequency = new Param(350); n.Q = new Param(1); n.gain = new Param(0); n.type = "lowpass"; return n; }
    createBufferSource() { F.oscs++; const n = new Node(this, "buffer"); n.buffer = null; n.loop = false; n.playbackRate = new Param(1); n.start = () => {}; n.stop = () => {}; return n; }
    createPeriodicWave() { return {}; }
    createBuffer(ch, len, rate) { return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData() { return this._d || (this._d = new Float32Array(len)); } }; }
    resume() { F.resumes++; this.state = "running"; return Promise.resolve(); }
    close() { this.state = "closed"; return Promise.resolve(); }
  }
  window.AudioContext = Ctx; window.webkitAudioContext = undefined;
  // o que a música está fazendo no grafo agora: o nível do duck (alvos depois do último cancelamento), o do barramento (0 = mudo/desligada), quantos temas soam e os osciladores já agendados
  window.__fakeInfo = () => {
    const c = F.ctxs[F.ctxs.length - 1];
    if (!c) return { ctxs: 0, oscs: F.oscs };
    const duck = c.nodes.find((n) => n.tag === "duck"), bus = c.nodes.find((n) => n.tag === "bus");
    const after = (p) => { const e = p.ev; let i = e.length - 1; while (i >= 0 && e[i][0] !== "cancel") i--; return e.slice(i + 1).filter((x) => x[0] === "target").map((x) => ({ v: x[1], t: x[2] })); };
    const level = (p) => { for (let i = p.ev.length - 1; i >= 0; i--) { const x = p.ev[i]; if (x[0] === "lin" || x[0] === "target" || x[0] === "set") return x[1]; } return p.value; };
    const themes = c.nodes.filter((n) => n.tag === "theme" && !n.gone);
    return { ctxs: F.ctxs.length, state: c.state, oscs: F.oscs, duck: duck && { value: duck.gain.value, targets: after(duck.gain) }, bus: bus && { level: level(bus.gain) }, themes: themes.map((n) => level(n.gain)), sounding: themes.filter((n) => level(n.gain) > 0).length, count: themes.length };
  };
})();`;

// espia os pedidos que o jogo faz ao tocador (nome e argumentos), sem mudar o que eles fazem
const SPY = () => {
  window.__mc = [];
  for (const n of ["play", "stop", "duck", "setDuck", "pause", "resume", "setEnabled", "toggleEnabled", "tick"]) {
    const f = __game.music[n];
    __game.music[n] = function (...a) { if (n !== "tick") __mc.push([n, ...a]); return f.apply(this, a); };
  }
};

module.exports = async function (T) {
  const { browser, newPage, fresh, ev, ok, section, errs, PAGE_HELPERS, root, URL } = T;
  const wait = (pg, ms) => pg.waitForTimeout(ms);
  // página do jogo com os mapas de verdade do Gatinho e do Passarinho e (por padrão) o AudioContext falso; `warns` junta os avisos do console
  async function mpage({ fake = true, noAudio = false, ...opts } = {}) {
    const pg = await newPage({ realCat: true, realBird: "real", ...opts });
    if (fake) await pg.addInitScript(FAKE_CTX);
    if (noAudio) await pg.addInitScript(() => { window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    pg.warns = [];
    pg.on("console", (m) => { if (m.type() === "warning") pg.warns.push(m.text()); });
    return pg;
  }
  const gesture = (pg) => pg.mouse.click(300, 400); // o primeiro toque do jogador (num lugar vazio do menu em 1280×720): libera o som e, com ele, a música
  const info = (pg) => ev(pg, () => window.__fakeInfo());
  const music = (pg) => ev(pg, () => ({ cur: __game.music.current, st: __game.music.state, key: __game.musicKey, paused: __game.music.paused, on: __game.music.isEnabled(), beat: __game.music.position && __game.music.position.beat, game: __game.state }));
  const calls = (pg) => ev(pg, () => window.__mc.map((c) => JSON.stringify(c)));
  const startedOk = (pg) => pg.waitForFunction(() => __game.music.state === "playing", null, { timeout: 4000 }).then(() => true, () => false);
  const finishNow = (pg, seconds = 10) => ev(pg, (n) => { // termina a fase: pega tudo e vai à saída (como o e2e.js)
    __game.freezeVets = true;
    for (let i = 0; i < n; i++) __game.tick(0.05);
    for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
    const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01);
    return __game.state;
  }, Math.round(seconds / 0.05));
  const catchOnce = (pg) => ev(pg, () => { // um agente encosta no jogador: perde uma vida (ou termina o jogo, se era a última)
    for (const v of __game.vets) v.cool = 99;
    __game.items.forEach((it) => { it.life = false; });
    for (let k = 0; k < 45 || (k < 200 && __game.invuln > 0); k++) __game.tick(0.05);
    const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01);
    return [__game.lives, __game.state];
  });
  const registered = (pg) => ev(pg, () => Music.ids());
  const THEMES = (ids) => ids.filter((i) => /^(dog|cat|bird)\d+$/.test(i));

  // =====================================================================
  await section("música: o menu toca `menu` só depois do primeiro gesto; cada fase do Cachorrinho, do Gatinho e do Passarinho (1 a 20) pede o tema do seu id; as telas do menu e Voltar ao menu ficam no `menu`", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    const pre = await ev(pg, () => ({ cur: __game.music.current, st: __game.music.state, key: __game.musicKey, ctxs: window.__fake.ctxs.length, on: __game.music.isEnabled(), sup: __game.music.supported }));
    ok(pre.cur === "menu" && pre.st === "waiting" && pre.key === "menu" && pre.ctxs === 0 && pre.on && pre.sup, `ao abrir o jogo o menu já pediu o tema "menu", mas nada soa e nenhum contexto de áudio existe antes do primeiro gesto (${JSON.stringify(pre)})`);
    await gesture(pg);
    ok(await startedOk(pg), "depois do primeiro gesto a música do menu começa (estado playing)");
    await wait(pg, 700);
    const i1 = await info(pg);
    ok(i1.count === 1 && i1.sounding === 1 && i1.bus && Math.abs(i1.bus.level - 0.45) < 1e-9 && i1.duck.targets.length === 0 && i1.duck.value === 1 && i1.oscs > 20, `no menu soa um tema só, com o barramento em 0,45, sem abafar e com notas agendadas (${JSON.stringify({ count: i1.count, sounding: i1.sounding, bus: i1.bus, duck: i1.duck, oscs: i1.oscs })})`);
    // as telas do menu (Como jogar, Pontuações, Lojinha, Bichinho, Nome) não trocam nem reiniciam o tema
    const b0 = (await music(pg)).beat;
    const seen = [];
    for (const [open, back] of [["btn-howto", "btn-howto-back"], ["btn-scores", "btn-scores-back"], ["btn-shop", "btn-shop-back"], ["btn-animal", "btn-animals-back"], ["btn-name", "btn-name-back"]]) {
      await pg.click("#" + open);
      const a = await music(pg);
      await pg.click("#" + back);
      const b = await music(pg);
      seen.push(`${open}:${a.cur}/${a.key}→${b.cur}/${b.key}`);
    }
    const b1 = await music(pg);
    ok(seen.every((s) => /:menu\/menu→menu\/menu$/.test(s)) && b1.beat >= b0 && b1.cur === "menu", `Como jogar, Pontuações, Lojinha, Bichinho e Nome ficam no tema "menu" sem reiniciá-lo (a batida foi de ${b0.toFixed(1)} a ${b1.beat.toFixed(1)}) — ${seen.join(" · ")}`);
    // cada fase de cada bichinho
    const ids = await registered(pg);
    const rows = await ev(pg, () => {
      const out = [];
      for (const a of ["dog", "cat", "bird"]) { __game.setAnimal(a); for (let id = 1; id <= 20; id++) { __game.start(id); out.push({ a, id, cur: __game.music.current, key: __game.musicKey, reg: !!Music.get(a + id), ga: __game.gameAnimal, lv: __game.level, state: __game.state }); } }
      return out;
    });
    const wrong = rows.filter((r) => !(r.state === "playing" && r.ga === r.a && r.lv === r.id && r.key === `play:${r.a}${r.id}` && r.cur === (r.reg ? r.a + r.id : null)));
    ok(rows.length === 60 && wrong.length === 0, `entrar em cada uma das 60 fases pede o tema "<bichinho><fase>" (dog1 a dog20, cat1 a cat20, bird1 a bird20); fase sem tema registrado fica em silêncio${wrong.length ? " — problemas: " + JSON.stringify(wrong.slice(0, 5)) : ""}`);
    const fases = THEMES(ids);
    console.log(`   (temas de fase registrados: ${fases.length} de 60; ids: ${ids.length})`);
    if (fases.length > 3) ok(fases.length === 60 && ids.includes("menu"), `os temas das fases estão registrados: 60 de 60 e o do menu (${fases.length})`);
    await wait(pg, 1300);
    const i2 = await info(pg);
    ok(i2.sounding <= 1 && i2.count <= 1, `depois de tantas trocas de fase só um tema soa e os temas antigos foram soltos do grafo (${JSON.stringify({ sounding: i2.sounding, count: i2.count })})`);
    // Voltar ao menu (pela pausa): volta o tema do menu e não fica abafado
    await ev(pg, () => { __game.setAnimal("dog"); __game.start(1); });
    await pg.keyboard.press("Escape");
    await pg.click("#btn-pause-menu");
    const m2 = await music(pg), i3 = await info(pg);
    ok(m2.cur === "menu" && m2.key === "menu" && m2.game === "menu" && (i3.duck.targets.length === 0 || i3.duck.targets[i3.duck.targets.length - 1].v === 1), `Voltar ao menu (da pausa) pede o tema "menu" e tira o abafado (${JSON.stringify({ m2: [m2.cur, m2.key], duck: i3.duck.targets })})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: a pausa abafa a música a 25% sem reiniciar o tema e continuar volta ao volume; janela sem foco e aba escondida param a música e ela volta", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    await gesture(pg);
    await startedOk(pg);
    await ev(pg, () => { __game.start(1); });
    await ev(pg, SPY);
    await wait(pg, 1600);
    const before = await music(pg), ib = await info(pg);
    ok(before.cur === "dog1" && before.st === "playing" && before.beat > 2 && ib.sounding === 1 && ib.bus.level === 0.45, `jogando a Fase 1 do Cachorrinho toca dog1 (batida ${before.beat.toFixed(1)}), com o barramento aberto (${JSON.stringify({ cur: before.cur, st: before.st, sounding: ib.sounding })})`);
    await pg.keyboard.press("Escape");
    const p1 = await music(pg), ip = await info(pg), cp = await calls(pg);
    ok(p1.game === "paused" && p1.cur === "dog1" && p1.key === "pause:dog1" && p1.st === "playing" && ip.duck.targets.length === 1 && ip.duck.targets[0].v === 0.25 && cp.includes('["setDuck",0.25]'), `na pausa o tema continua (dog1) e é abafado a 0,25 (setDuck(0.25); alvo do ganho: ${JSON.stringify(ip.duck.targets)})`);
    await wait(pg, 300);
    await pg.keyboard.press("Escape");
    const p2 = await music(pg), ir = await info(pg), cr = await calls(pg);
    ok(p2.game === "playing" && p2.cur === "dog1" && ir.duck.targets.length === 1 && ir.duck.targets[0].v === 1 && cr.filter((c) => c.startsWith('["play"') && /restart/.test(c)).length === 0 && p2.beat >= p1.beat, `continuar volta ao volume cheio (alvo 1) e o tema segue de onde estava, sem restart (batida ${p1.beat.toFixed(2)} → ${p2.beat.toFixed(2)}; pedidos: ${cr.join(" ")})`);
    // pausa pela tecla P e pelo botão de pausa do jogo: o mesmo
    await pg.keyboard.press("p");
    ok((await music(pg)).key === "pause:dog1" && (await info(pg)).duck.targets[0].v === 0.25, "a tecla P também abafa");
    await pg.keyboard.press("p");
    ok((await info(pg)).duck.targets[0].v === 1, "e P de novo desabafa");
    // janela sem foco: o jogo pausa e a música para (barramento zerado); o foco traz a música de volta (ainda abafada, pois o jogo segue pausado)
    await ev(pg, () => window.dispatchEvent(new Event("blur")));
    await wait(pg, 150);
    const bl = await music(pg), ibl = await info(pg);
    ok(bl.game === "paused" && bl.paused && bl.st === "paused" && ibl.bus.level === 0, `sem foco a janela pausa o jogo e a música para (estado ${bl.st}, barramento ${ibl.bus.level})`);
    await ev(pg, () => window.dispatchEvent(new Event("focus")));
    await wait(pg, 200);
    const fo = await music(pg), ifo = await info(pg);
    ok(!fo.paused && fo.st === "playing" && ifo.bus.level === 0.45 && fo.key === "pause:dog1" && ifo.duck.targets[ifo.duck.targets.length - 1].v === 0.25, `com o foco de volta a música volta, ainda abafada atrás da pausa (${JSON.stringify({ st: fo.st, bus: ifo.bus.level, duck: ifo.duck.targets })})`);
    await pg.keyboard.press("Escape");
    // aba escondida (visibilitychange com document.hidden)
    await ev(pg, () => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
    await wait(pg, 150);
    const hi = await music(pg), ihi = await info(pg);
    ok(hi.game === "paused" && hi.paused && hi.st === "paused" && ihi.bus.level === 0, `aba escondida: o jogo pausa e a música para (${hi.st}, barramento ${ihi.bus.level})`);
    const cHidden = await calls(pg);
    ok(cHidden.filter((c) => c === '["pause"]').length >= 2, `a música recebeu pause() da janela sem foco e da aba escondida (${cHidden.filter((c) => /pause|resume/.test(c) && !/setDuck/.test(c)).join(" ")})`);
    await ev(pg, () => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
    await wait(pg, 200);
    const vi = await music(pg), ivi = await info(pg);
    ok(!vi.paused && vi.st === "playing" && ivi.bus.level === 0.45 && ivi.sounding === 1, `aba visível de novo: a música volta (resume), com um tema só soando (${JSON.stringify({ st: vi.st, bus: ivi.bus.level, sounding: ivi.sounding })})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: vitória para a música em 0,5 s e a tela de reforços fica em silêncio; a próxima fase toca o tema novo; derrota para em 0,4 s; Jogar novamente e Tentar novamente recomeçam o tema do começo", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    await gesture(pg);
    await startedOk(pg);
    await ev(pg, () => { __game.start(1); });
    await ev(pg, SPY);
    await wait(pg, 800);
    ok(await finishNow(pg) === "won", "a Fase 1 termina (estado won)");
    const w = await music(pg), cw = await calls(pg);
    ok(w.cur === null && w.key === "won" && cw.filter((c) => c.startsWith('["stop"')).join() === '["stop",0.5]', `vencer pede stop(0,5) e esquece o tema (${cw.join(" ")})`);
    await wait(pg, 900);
    const iw = await info(pg);
    ok(iw.sounding === 0 && iw.count === 0, `meio segundo depois nenhum tema soa e o nó do tema saiu do grafo (${JSON.stringify({ sounding: iw.sounding, count: iw.count })})`);
    // a tela de reforços e as pontuações abertas da vitória continuam em silêncio
    await pg.click("#btn-next");
    const rf = await music(pg), irf = await info(pg);
    ok(await pg.isVisible("#reinforce") && rf.cur === null && rf.key === "won" && irf.sounding === 0, `na tela de reforços a música está parada (${JSON.stringify({ cur: rf.cur, key: rf.key, sounding: irf.sounding })})`);
    await pg.click("#btn-reinforce-back");
    await pg.click("#btn-win-scores");
    ok(await pg.isVisible("#scores") && (await music(pg)).cur === null, "as Pontuações abertas da vitória também ficam sem música");
    await pg.click("#btn-scores-back");
    ok(await pg.isVisible("#win") && (await music(pg)).cur === null, "e voltar delas à vitória continua em silêncio");
    // a próxima fase
    await pg.click("#btn-next");
    await pg.click('#reinforce-list button[data-id="shield"]');
    await ev(pg, () => { window.__mc.length = 0; });
    await pg.click("#btn-reinforce-go");
    const nx = await music(pg), cn = await calls(pg);
    const dog2 = await ev(pg, () => !!Music.get("dog2"));
    ok(nx.game === "playing" && nx.key === "play:dog2" && nx.cur === (dog2 ? "dog2" : null) && cn.some((c) => c === '["play","dog2",{"restart":true}]') && cn.some((c) => c === '["setDuck",1]'), `começar a Fase 2 pede o tema dog2 do começo (restart) e sem abafar (${cn.join(" ")})`);
    // Jogar novamente (depois de vencer) recomeça o tema da mesma fase
    await ev(pg, () => { __game.start(1); });
    await wait(pg, 600);
    await finishNow(pg);
    await ev(pg, () => { window.__mc.length = 0; });
    await pg.click("#btn-again");
    const ag = await music(pg), ca = await calls(pg);
    ok(ag.game === "playing" && ag.cur === "dog1" && ca.some((c) => c === '["play","dog1",{"restart":true}]'), `Jogar novamente recomeça o dog1 do começo (${ca.join(" ")})`);
    // derrota: a última vida
    await ev(pg, () => { __game.setLives(1); window.__mc.length = 0; });
    const lost = await catchOnce(pg);
    const lo = await music(pg), cl = await calls(pg);
    ok(lost[1] === "lost" && lo.cur === null && lo.key === "lost" && cl.filter((c) => c.startsWith('["stop"')).join() === '["stop",0.4]' && !cl.some((c) => c.startsWith('["duck"')), `perder a última vida pede stop(0,4), esquece o tema e não pede o abafado curto (${cl.join(" ")})`);
    await wait(pg, 800);
    ok((await info(pg)).sounding === 0, "e a música da fase some");
    await ev(pg, () => { window.__mc.length = 0; });
    await pg.click("#btn-retry");
    const rt = await music(pg), cr = await calls(pg);
    ok(rt.game === "playing" && rt.cur === "dog1" && rt.key === "play:dog1" && cr.some((c) => c === '["play","dog1",{"restart":true}]'), `Tentar novamente recomeça o dog1 do começo (${cr.join(" ")})`);
    // o mesmo nos outros dois bichinhos: vencer e perder param a música
    const others = [];
    for (const a of ["cat", "bird"]) {
      await ev(pg, (a) => { __game.setAnimal(a); __game.start(1); window.__mc.length = 0; }, a);
      const s = await finishNow(pg);
      const c1 = await calls(pg), m1 = await music(pg);
      await ev(pg, (a) => { __game.setAnimal(a); __game.start(1); __game.setLives(1); window.__mc.length = 0; }, a);
      const l = await catchOnce(pg);
      const c2 = await calls(pg), m2 = await music(pg);
      others.push(`${a}: ${s}/${c1.filter((c) => c.startsWith('["stop"')).join("")}/${m1.cur} · ${l[1]}/${c2.filter((c) => c.startsWith('["stop"')).join("")}/${m2.cur}`);
    }
    ok(others.every((o) => /won\/\["stop",0\.5\]\/null · lost\/\["stop",0\.4\]\/null$/.test(o.replace(/^\w+: /, ""))), `no Gatinho e no Passarinho vencer para em 0,5 s e perder para em 0,4 s (${others.join(" | ")})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: perder uma vida abaixa a música a 0,3 por 0,8 s e ela volta sozinha; perder a última vida não faz o abafado", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    await gesture(pg);
    await startedOk(pg);
    await ev(pg, () => { __game.start(1); });
    await ev(pg, SPY);
    await wait(pg, 400);
    const r = await catchOnce(pg);
    const c = await calls(pg), i = await info(pg);
    ok(r[0] === 2 && r[1] === "playing" && c.filter((x) => x.startsWith('["duck"')).join() === '["duck",0.3,0.8]', `uma vida a menos (${r[0]} vidas) pede duck(0,3, 0,8) uma vez (${c.join(" ")})`);
    const t = i.duck.targets;
    ok(t.length === 2 && t[0].v === 0.3 && t[1].v === 1 && Math.abs(t[1].t - t[0].t - 0.8) < 0.2, `no grafo o ganho do duck desce para 0,3 e volta para 1 cerca de 0,8 s depois (${JSON.stringify(t)})`);
    await ev(pg, () => { window.__mc.length = 0; });
    const r2 = await catchOnce(pg), r3 = (await ev(pg, () => { __game.setLives(1); window.__mc.length = 0; return 1; }), await catchOnce(pg));
    const c3 = await calls(pg);
    ok(r2[0] === 1 && r3[1] === "lost" && !c3.some((x) => x.startsWith('["duck"')) && c3.filter((x) => x.startsWith('["stop"')).join() === '["stop",0.4]', `a última vida só pede stop(0,4), sem duck (${c3.join(" ")})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: o mudo (tecla M e botões de som) silencia a música na hora e desmudar a traz de volta; o botão Música e a tecla N ligam e desligam só a música, lembram depois de recarregar e não atrapalham quem digita", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    await gesture(pg);
    await startedOk(pg);
    await ev(pg, () => { __game.start(1); });
    await wait(pg, 400);
    // M: na mesma chamada em que o som é mudado o barramento da música já zera (sem esperar o ciclo de 120 ms do tocador)
    const m1 = await ev(pg, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" })); const i = window.__fakeInfo(); return { muted: __game.sound.isMuted(), st: __game.music.state, bus: i.bus.level }; });
    ok(m1.muted && m1.st === "muted" && m1.bus === 0, `M muda o som e a música silencia na hora (${JSON.stringify(m1)})`);
    await ev(pg, () => window.dispatchEvent(new KeyboardEvent("keyup", { key: "m" })));
    const m2 = await ev(pg, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "m" })); const i = window.__fakeInfo(); return { muted: __game.sound.isMuted(), st: __game.music.state, bus: i.bus.level }; });
    ok(!m2.muted && m2.st === "playing" && m2.bus === 0.45, `M de novo desmuda e a música volta (${JSON.stringify(m2)})`);
    await wait(pg, 400);
    ok((await info(pg)).sounding === 1, "e um tema soa de novo");
    // botão de som da pausa
    await pg.keyboard.press("Escape");
    await pg.click("#btn-sound-pause");
    const m3 = await music(pg);
    ok((await ev(pg, () => __game.sound.isMuted())) && m3.st === "muted" && (await info(pg)).bus.level === 0 && m3.on, `o botão Som da pausa silencia a música sem desligar a preferência da música (${JSON.stringify([m3.st, m3.on])})`);
    await pg.click("#btn-sound-pause");
    ok((await music(pg)).st === "playing", "e liga de volta");
    await pg.keyboard.press("Escape");
    // N e o botão Música
    const pref = () => ev(pg, () => ({ music: localStorage.getItem("cachorrinho.musica.v1"), sound: localStorage.getItem("cachorrinho.som.v1"), muted: __game.sound.isMuted() }));
    const sound0 = (await pref()).sound;
    const n1 = await ev(pg, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "n" })); const i = window.__fakeInfo(); return { on: __game.music.isEnabled(), st: __game.music.state, bus: i.bus.level }; });
    ok(!n1.on && n1.st === "off" && n1.bus === 0, `N desliga a música na hora (${JSON.stringify(n1)})`);
    const p1 = await pref();
    ok(p1.music === '{"on":0}' && p1.sound === sound0 && !p1.muted, `a preferência fica em cachorrinho.musica.v1 = {"on":0}; a do som não muda (${JSON.stringify(p1)})`);
    await wait(pg, 150);
    const fx = await ev(pg, () => { const played = __game.sound.play("ration"); const last = __game.sounds[__game.sounds.length - 1]; return { played, last: last && last.name, lastPlayed: last && last.played, muted: __game.sound.isMuted(), state: __game.sound.state }; });
    ok(fx.played && fx.last === "ration" && fx.lastPlayed, `os efeitos sonoros continuam tocando com a música desligada (${JSON.stringify(fx)})`);
    await pg.keyboard.press("Escape");
    ok((await pg.textContent("#btn-music-pause")) === "Música: desligada" && (await pg.getAttribute("#btn-music-pause", "aria-pressed")) === "false" && (await pg.getAttribute("#btn-music", "aria-label")) === "Música: desligada" && (await pg.getAttribute("#btn-music", "aria-pressed")) === "false" && (await pg.getAttribute("#btn-music", "title")) === "Música: desligada (tecla N)", "o botão da pausa e o ícone do menu mostram Música: desligada (texto, aria-pressed, aria-label e título)");
    await pg.click("#btn-music-pause");
    const n2 = await music(pg), p2 = await pref();
    ok(n2.on && n2.st === "playing" && p2.music === '{"on":1}' && (await pg.textContent("#btn-music-pause")) === "Música: ligada" && (await pg.getAttribute("#btn-music-pause", "aria-pressed")) === "true", `o botão da pausa liga a música de novo (${JSON.stringify([n2.st, p2.music])}), ainda abafada atrás da pausa`);
    ok((await info(pg)).duck.targets.slice(-1)[0].v === 0.25, "e continua abafada a 0,25 enquanto o jogo está pausado");
    await pg.keyboard.press("Escape");
    // N repetido (tecla segurada) não liga e desliga sem parar
    const rep = await ev(pg, () => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", repeat: true })); window.dispatchEvent(new KeyboardEvent("keydown", { key: "n", repeat: true })); return __game.music.isEnabled(); });
    ok(rep === true, "segurar o N não repete o liga e desliga");
    // do menu: o ícone e a tecla N; a preferência fica depois de recarregar
    await ev(pg, () => { document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); });
    ok((await music(pg)).cur === "menu" && await pg.isVisible("#btn-music"), "no menu o ícone Música está à vista");
    await pg.click("#btn-music");
    const c1 = await music(pg);
    ok(!c1.on && c1.st === "off" && (await pg.getAttribute("#btn-music", "aria-pressed")) === "false" && await pg.evaluate(() => document.querySelector("#btn-music .mus-off").hidden === false && document.querySelector("#btn-music .mus-on").hidden === true), `o ícone do menu desliga a música e troca o desenho (${JSON.stringify([c1.on, c1.st])})`);
    await pg.reload();
    await pg.evaluate(PAGE_HELPERS);
    const rl = await music(pg);
    ok(!rl.on && (await pg.getAttribute("#btn-music", "aria-pressed")) === "false" && (await pg.getAttribute("#btn-music", "aria-label")) === "Música: desligada" && rl.cur === "menu", `depois de recarregar a música continua desligada e o botão mostra isso (${JSON.stringify(rl)})`);
    await gesture(pg);
    await wait(pg, 500);
    const rl2 = await music(pg), irl = await info(pg);
    ok(rl2.st === "off" && irl.bus.level === 0 && irl.sounding === 0, `e, mesmo depois do primeiro gesto, nada soa (${rl2.st})`);
    await pg.keyboard.press("n");
    await wait(pg, 400);
    const rl3 = await music(pg), irl3 = await info(pg);
    ok(rl3.on && rl3.st === "playing" && irl3.sounding === 1 && (await ev(pg, () => localStorage.getItem("cachorrinho.musica.v1"))) === '{"on":1}', `N liga a música de novo, que começa a soar na hora (${JSON.stringify([rl3.st, irl3.sounding])})`);
    // quem digita não liga nem desliga nada
    await pg.click("#btn-name");
    await pg.fill("#name-input", "");
    await pg.focus("#name-input");
    await pg.keyboard.type("Nina Mana", { delay: 10 });
    const typed = await ev(pg, () => ({ v: document.getElementById("name-input").value, on: __game.music.isEnabled(), muted: __game.sound.isMuted() }));
    ok(typed.v === "Nina Mana" && typed.on && !typed.muted, `digitar um nome com N e M não liga nem desliga música nem som (${JSON.stringify(typed)})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: M e N valem com o foco numa caixa de marcar (Mostrar senha) mas não em campos de texto, o leitor de tela recebe o novo estado pelas teclas e o título do menu não fica sob os ícones em tela muito estreita", async () => {
    const e0 = errs.length;
    const pg = await mpage();
    await fresh(pg);
    await gesture(pg);
    await wait(pg, 300);
    await pg.click("#btn-name");
    await pg.click("#btn-open-register");
    await pg.focus("#reg-show");
    const f0 = await ev(pg, () => ({ id: document.activeElement.id, type: document.activeElement.type, on: __game.music.isEnabled(), muted: __game.sound.isMuted() }));
    await pg.keyboard.press("n");
    const a = await ev(pg, () => ({ on: __game.music.isEnabled(), live: document.getElementById("toggle-live").textContent, checked: document.getElementById("reg-show").checked }));
    ok(f0.id === "reg-show" && f0.type === "checkbox" && f0.on && a.on === false && a.live === "Música desligada" && a.checked === false, `com o foco em "Mostrar senha", N desliga a música, o leitor de tela recebe "Música desligada" e a caixa não muda (${JSON.stringify([f0, a])})`);
    await pg.keyboard.press("n");
    const b = await ev(pg, () => ({ on: __game.music.isEnabled(), live: document.getElementById("toggle-live").textContent }));
    ok(b.on === true && b.live === "Música ligada", `N de novo liga e o aviso muda para "Música ligada" (${JSON.stringify(b)})`);
    await pg.keyboard.press("m");
    const c = await ev(pg, () => ({ muted: __game.sound.isMuted(), live: document.getElementById("toggle-live").textContent }));
    await pg.keyboard.press("m");
    const d = await ev(pg, () => ({ muted: __game.sound.isMuted(), live: document.getElementById("toggle-live").textContent }));
    ok(c.muted === true && c.live === "Som desligado" && d.muted === false && d.live === "Som ligado", `M liga e desliga o som com o foco na caixa e o aviso diz "Som desligado" e "Som ligado" (${JSON.stringify([c, d])})`);
    // nos campos de texto e de senha continua tudo como estava: digitar não liga nem desliga nada e não fala nada
    await ev(pg, () => { document.getElementById("toggle-live").textContent = ""; });
    await pg.focus("#reg-pass");
    await pg.keyboard.type("nNmM", { delay: 10 });
    const t = await ev(pg, () => ({ v: document.getElementById("reg-pass").value, on: __game.music.isEnabled(), muted: __game.sound.isMuted(), live: document.getElementById("toggle-live").textContent }));
    ok(t.v === "nNmM" && t.on && !t.muted && t.live === "", `no campo de senha digitar nNmM só escreve o texto (${JSON.stringify(t)})`);
    // o botão não repete o aviso: quem clica já ouve o novo rótulo do próprio botão
    await ev(pg, () => { document.getElementById("toggle-live").textContent = ""; });
    await pg.click("#btn-register-back");
    await pg.click("#btn-name-back");
    await pg.click("#btn-music");
    const bt = await ev(pg, () => ({ on: __game.music.isEnabled(), live: document.getElementById("toggle-live").textContent }));
    ok(bt.on === false && bt.live === "", `o clique no botão Música não escreve na região falada (${JSON.stringify(bt)})`);
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
    // o título do menu ganha espaço dos dois lados abaixo de 240 px de largura (zoom de 200% num celular pequeno), para os ícones dos cantos não o cobrirem
    const pads = [];
    for (const w of [195, 220, 240, 241, 320]) {
      const q = await mpage({ viewport: { width: w, height: 422 }, hasTouch: true, isMobile: true });
      await fresh(q);
      pads.push([w, await ev(q, () => { const cs = getComputedStyle(document.getElementById("menu-title")); return [cs.paddingLeft, cs.paddingRight]; })]);
      await q.context().close();
    }
    const narrow = pads.filter(([w]) => w <= 240).every(([, p]) => p[0] === "52px" && p[1] === "52px"), wide = pads.filter(([w]) => w > 240).every(([, p]) => p[0] !== "52px");
    ok(narrow && wide, `o título do menu tem 52 px de cada lado até 240 px de largura e volta ao normal depois (${JSON.stringify(pads)})`);
  });

  // =====================================================================
  await section("música: sem Web Audio o jogo segue (menu, fases, pausa, vitória, derrota, M e N), sem erro nem aviso, e o botão Música continua funcionando", async () => {
    const e0 = errs.length;
    const pg = await mpage({ fake: false, noAudio: true });
    await fresh(pg);
    await gesture(pg);
    await wait(pg, 300);
    const a = await ev(pg, () => ({ ctor: typeof window.AudioContext, cur: __game.music.current, st: __game.music.state, sup: __game.music.supported, sndSup: __game.sound.supported, on: __game.music.isEnabled() }));
    ok(a.ctor === "undefined" && a.cur === "menu" && a.st === "unsupported" && a.sup === false && a.sndSup === false, `sem AudioContext a música do menu fica pedida, mas "unsupported" (${JSON.stringify(a)})`);
    await pg.click("#btn-music");
    ok(!(await ev(pg, () => __game.music.isEnabled())) && (await pg.getAttribute("#btn-music", "aria-label")) === "Música: desligada", "o botão Música continua ligando e desligando a preferência");
    await pg.click("#btn-music");
    await ev(pg, () => { __game.start(1); });
    const g1 = await music(pg);
    ok(g1.game === "playing" && g1.cur === "dog1" && g1.st === "unsupported", `a fase começa normalmente e pede dog1 (${JSON.stringify([g1.game, g1.cur, g1.st])})`);
    await ev(pg, () => { __game.tick(0.5); });
    await pg.keyboard.press("Escape"); await pg.keyboard.press("m"); await pg.keyboard.press("n"); await pg.keyboard.press("n"); await pg.keyboard.press("Escape");
    ok((await music(pg)).game === "playing", "pausa, continuar, M e N funcionam sem Web Audio");
    ok(await finishNow(pg) === "won" && (await music(pg)).cur === null, "vencer funciona (e a música pedida some)");
    await pg.click("#btn-again");
    await ev(pg, () => { __game.setLives(1); });
    const l = await catchOnce(pg);
    ok(l[1] === "lost", "perder funciona");
    await pg.click("#btn-lose-menu");
    ok((await music(pg)).cur === "menu" && await pg.isVisible("#menu"), "e voltar ao menu pede o tema do menu de novo");
    for (const an of ["cat", "bird"]) { const s = await ev(pg, (an) => { __game.setAnimal(an); __game.start(1); return [__game.state, __game.music.current, __game.music.state]; }, an); ok(s[0] === "playing" && s[1] === an + "1" && s[2] === "unsupported", `${an}: a fase começa sem Web Audio e pede ${an}1 (${s.join("/")})`); }
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: sem o módulo de música, com Music.create que falha ou com um tocador que lança erro em tudo, o jogo segue sem erro (botões Música escondidos quando não há módulo)", async () => {
    const e0 = errs.length;
    const MUSIC = fs.readFileSync(path.join(root, "js/music.js"), "utf8"), SITE = "function create(opts) {\n    opts = opts || {};";
    ok(MUSIC.split(SITE).length === 2, "(o ponto de Music.create em js/music.js existe, para o teste forçar a falha)");
    const play = async (pg, label) => {
      await fresh(pg);
      await gesture(pg);
      await ev(pg, () => { __game.start(1); });
      await pg.keyboard.press("Escape"); await pg.keyboard.press("Escape");
      await pg.keyboard.press("n"); await pg.keyboard.press("m"); await pg.keyboard.press("m");
      await ev(pg, () => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
      await catchOnce(pg);
      const w = await finishNow(pg);
      await pg.click("#btn-win-menu");
      return `${label}: ${w}/${await ev(pg, () => __game.state)}`;
    };
    // (a) sem js/music.js
    let pg = await mpage({ fake: false });
    await pg.context().route("**/js/music.js", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    const ra = await play(pg, "sem módulo");
    const sa = await ev(pg, () => ({ M: typeof Music, music: __game.music, hid: [document.getElementById("btn-music").classList.contains("hidden"), document.getElementById("btn-music-pause").classList.contains("hidden")] }));
    ok(sa.M === "undefined" && sa.music === null && sa.hid.join() === "true,true" && ra === "sem módulo: won/menu", `sem Music o jogo roda do menu à vitória e de volta, os dois botões Música ficam escondidos (${ra}; ${JSON.stringify(sa)})`);
    await pg.context().close();
    // (b) Music.create lança
    pg = await mpage({ fake: false });
    await pg.context().route("**/js/music.js", (r) => r.fulfill({ contentType: "text/javascript", body: MUSIC.replace(SITE, SITE.replace("opts = opts || {};", 'throw new Error("falha de teste");')) }));
    const rb = await play(pg, "create falha");
    const sb = await ev(pg, () => ({ M: typeof Music, music: __game.music }));
    ok(sb.M === "object" && sb.music === null && rb === "create falha: won/menu", `com Music.create lançando o jogo roda inteiro (${rb}; music=${sb.music})`);
    await pg.context().close();
    // (c) o tocador lança em todo método
    pg = await mpage();
    await fresh(pg);
    await ev(pg, () => { for (const n of ["play", "stop", "duck", "setDuck", "pause", "resume", "setEnabled", "toggleEnabled", "isEnabled", "tick"]) __game.music[n] = () => { throw new Error("tocador quebrado: " + n); }; });
    await gesture(pg);
    await ev(pg, () => { __game.start(1); });
    await pg.keyboard.press("Escape"); await pg.keyboard.press("Escape"); await pg.keyboard.press("n"); await pg.keyboard.press("m"); await pg.keyboard.press("m");
    await ev(pg, () => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });
    const l = await catchOnce(pg), w = await finishNow(pg);
    await pg.click("#btn-win-menu");
    const sc = await ev(pg, () => ({ state: __game.state, label: document.getElementById("btn-music").getAttribute("aria-label") }));
    ok(l[0] === 2 && w === "won" && sc.state === "menu", `com o tocador lançando erro em todos os métodos o jogo perde vida, vence e volta ao menu (${JSON.stringify([l, w, sc])})`);
    ok(errs.length === e0, `nenhum erro de JavaScript chegou à página (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: no AudioContext real do Chromium (com um gesto simulado) o tema do menu e os das fases tocam, abafam, pausam e silenciam sem erro nem aviso", async () => {
    const e0 = errs.length;
    const pg = await mpage({ fake: false });
    await fresh(pg);
    await gesture(pg);
    const ready = await pg.waitForFunction(() => __game.sound.state === "running", null, { timeout: 4000 }).then(() => true, () => false);
    console.log(`   (AudioContext real: estado ${await ev(pg, () => __game.sound.state)})`);
    if (!ready) { ok(errs.length === e0 && pg.warns.length === 0, "o contexto real não ficou 'running' neste ambiente: só se confere que não houve erro nem aviso"); await pg.context().close(); return; }
    ok(await startedOk(pg), "o tema do menu começa no contexto real (estado playing)");
    const b1 = (await music(pg)).beat;
    await wait(pg, 900);
    const b2 = (await music(pg)).beat;
    ok(b2 > b1 + 0.5, `o relógio da música anda no contexto real (batida ${b1.toFixed(2)} → ${b2.toFixed(2)})`);
    await ev(pg, () => { __game.setAnimal("cat"); __game.start(1); });
    await wait(pg, 400);
    ok((await music(pg)).cur === "cat1" && (await music(pg)).st === "playing", "entrar na Fase 1 do Gatinho toca cat1");
    await pg.keyboard.press("Escape"); await wait(pg, 200);
    ok((await music(pg)).key === "pause:cat1" && (await music(pg)).st === "playing", "a pausa abafa sem parar a música (contexto real)");
    await pg.keyboard.press("Escape");
    await ev(pg, () => { window.dispatchEvent(new Event("blur")); });
    await wait(pg, 150);
    ok((await music(pg)).st === "paused", "sem foco a música pausa");
    await ev(pg, () => { window.dispatchEvent(new Event("focus")); });
    await pg.keyboard.press("Escape"); // (o blur pausou o jogo: Esc continua)
    await pg.keyboard.press("m"); await wait(pg, 150);
    ok((await music(pg)).st === "muted", "M silencia");
    await pg.keyboard.press("m"); await wait(pg, 150);
    ok((await music(pg)).st === "playing" || (await music(pg)).st === "paused", "e desmudar volta");
    await catchOnce(pg);
    await pg.keyboard.press("Escape");
    ok(await pg.isVisible("#pause"), "a pausa abre");
    await pg.click("#btn-pause-menu");
    await wait(pg, 400);
    const e = await music(pg);
    ok(e.cur === "menu", "voltar ao menu pede o tema do menu");
    ok(errs.length === e0 && pg.warns.length === 0, `nenhum erro nem aviso no console (${errs.slice(e0).join(" | ")} ${pg.warns.join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================
  await section("música: o botão Música (ícone do menu e botão da pausa) tem pelo menos 44 px de alvo no ícone e a mesma altura do botão Som na pausa, não sobrepõe nada e não faz a tela rolar, em 7 tamanhos de tela (menu com jogo salvo; pausa dos três bichinhos)", async () => {
    const e0 = errs.length;
    const VPS = [{ width: 320, height: 568 }, { width: 360, height: 640 }, { width: 390, height: 780 }, { width: 568, height: 320 }, { width: 740, height: 390 }, { width: 1000, height: 700 }, { width: 1280, height: 720 }];
    const menuProblems = [], pauseProblems = [], rows = [], menuRows = [];
    for (const vp of VPS) {
      const small = vp.width < 800, label = `${vp.width}x${vp.height}`;
      const pg = await mpage({ viewport: vp, hasTouch: small, isMobile: small });
      await fresh(pg, { done: [1, 2, 3, 4], keepSave: true });
      await ev(pg, () => { Records.createStore(localStorage).addRun({ level: 1, timeMs: 30000, points: 700, name: "Totó" }); });
      await ev(pg, () => { __game.start(1); __game.freezeVets = true; __game.tick(5); __game.save(); document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); }); // o menu mais alto: jogo salvo e recorde
      const m = await ev(pg, () => {
        const sc = document.getElementById("menu"), icon = document.getElementById("btn-music"), snd = document.getElementById("btn-sound"), R = (e) => e.getBoundingClientRect();
        const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        const things = [];
        const walker = document.createTreeWalker(sc, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { if (!n.nodeValue.trim() || n.parentElement.closest("#btn-music, #btn-sound")) continue; const r = document.createRange(); r.selectNodeContents(n); for (const q of r.getClientRects()) if (q.width > 0 && q.height > 0) things.push({ r: q, what: "texto «" + n.nodeValue.trim().slice(0, 20) + "»" }); }
        for (const b of sc.querySelectorAll("button")) if (b.offsetParent && b !== icon && b !== snd) things.push({ r: R(b), what: "botão " + b.id });
        const ri = R(icon), rs = R(snd);
        const over = sc.scrollHeight - sc.clientHeight;
        icon.style.display = "none"; const overWithout = sc.scrollHeight - sc.clientHeight; icon.style.display = ""; // (a rolagem do menu sem o ícone: ele não pode mudá-la)
        return { w: ri.width, h: ri.height, l: ri.left, t: ri.top, r: ri.right, b: ri.bottom, vw: innerWidth, vh: innerHeight, hits: things.filter((x) => inter(ri, x.r) > 0).map((x) => x.what), apart: inter(ri, rs), over, overWithout, hs: document.documentElement.scrollWidth - innerWidth, cont: !document.getElementById("btn-continue").classList.contains("hidden"), pressed: icon.getAttribute("aria-pressed") };
      });
      menuRows.push(`${label}: ${m.over}/${m.overWithout}`);
      if (!(m.w >= 44 && m.h >= 44 && m.l >= 0 && m.t >= 0 && m.r <= m.vw && m.b <= m.vh && m.hits.length === 0 && m.apart === 0 && m.over === m.overWithout && m.hs <= 0 && m.cont)) menuProblems.push(`${label} menu: ${JSON.stringify(m)}`);
      // a pausa dos três bichinhos
      for (const an of ["dog", "cat", "bird"]) {
        await ev(pg, (an) => { __game.setAnimal(an); __game.start(1); }, an);
        await pg.keyboard.press("Escape");
        const p = await ev(pg, () => {
          const sc = document.getElementById("pause"), R = (e) => e.getBoundingClientRect(), inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          const bs = [...sc.querySelectorAll("button")].filter((b) => b.offsetParent), mb = R(document.getElementById("btn-music-pause")), sb = R(document.getElementById("btn-sound-pause"));
          let overlap = 0; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) overlap += inter(R(bs[i]), R(bs[j]));
          return { n: bs.length, mh: mb.height, mw: mb.width, sh: sb.height, l: Math.min(...bs.map((b) => R(b).left)), r: Math.max(...bs.map((b) => R(b).right)), last: Math.max(...bs.map((b) => R(b).bottom)), overlap, over: sc.scrollHeight - sc.clientHeight, hs: document.documentElement.scrollWidth - innerWidth, vw: innerWidth, vh: innerHeight, text: document.getElementById("btn-music-pause").textContent, help: /N liga e desliga a música/.test(document.getElementById("pause-help").textContent) };
        });
        const want = p.vh <= 640 ? 40 : 44; // (o mesmo critério dos outros botões do menu e da pausa: 40 px nas telas baixas, 44 px nas outras)
        if (!(p.n === 5 && p.mh >= want && Math.abs(p.mh - p.sh) < 1 && p.mw >= 80 && p.l >= 0 && p.r <= p.vw && p.last <= p.vh && p.overlap === 0 && p.over <= 1 && p.hs <= 0 && p.text === "Música: ligada" && p.help)) pauseProblems.push(`${label} pausa ${an}: ${JSON.stringify(p)}`);
        rows.push(`${label}/${an}: ${p.mh.toFixed(0)}px rolagem ${p.over}`);
        await pg.keyboard.press("Escape");
      }
      await pg.context().close();
    }
    console.log("   (pausa)", rows.join(" · "));
    console.log("   (menu: sobra de rolagem com e sem o ícone)", menuRows.join(" · "));
    ok(menuProblems.length === 0, `o ícone Música do menu (44×44 px, no canto de cima à esquerda) fica dentro da tela, não toca em nenhum texto nem botão do menu com jogo salvo e recorde, não toca no ícone de som e o ícone não muda a rolagem do menu (o menu com jogo salvo e recorde já rola 36 px em 568×320, com ou sem ele, como na 0.20.0) em ${VPS.map((v) => v.width + "x" + v.height).join(", ")}${menuProblems.length ? " — problemas: " + menuProblems.join(" ; ") : ""}`);
    ok(pauseProblems.length === 0, `na pausa do Cachorrinho, do Gatinho e do Passarinho os 5 botões ficam dentro da tela, sem sobrepor, com o Música da mesma altura do Som (40 px nas telas baixas, 44 px ou mais nas outras), sem rolar e com a tecla N na ajuda${pauseProblems.length ? " — problemas: " + pauseProblems.join(" ; ") : ""}`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
  });

  // =====================================================================
  await section("música: os textos do jogo (Como jogar e ajuda da pausa dos três bichinhos) falam da música e da tecla N, e o README tem a seção Músicas tema com a honestidade do que foi medido", async () => {
    const pg = await mpage({ fake: false });
    await fresh(pg);
    const T3 = [];
    for (const an of ["dog", "cat", "bird"]) {
      await ev(pg, (an) => { __game.setAnimal(an); }, an);
      await pg.click("#btn-howto");
      const how = await ev(pg, () => { const lis = [...document.querySelectorAll("#howto-steps li")]; const m = lis.find((li) => li.querySelector("strong") && li.querySelector("strong").textContent === "Música:"), t = lis.find((li) => li.querySelector("strong") && li.querySelector("strong").textContent === "Teclado:"), s = lis.find((li) => li.querySelector("strong") && li.querySelector("strong").textContent === "Som:"); return { music: m ? m.textContent : "", keyN: !!t && /N<\/kbd> liga e desliga a música/.test(t.innerHTML), after: !!(m && s && s.nextElementSibling === m) }; });
      await pg.click("#btn-howto-back");
      await ev(pg, (an) => { __game.setAnimal(an); __game.start(1); }, an);
      await pg.keyboard.press("Escape");
      const help = await pg.textContent("#pause-help");
      await pg.click("#btn-pause-menu");
      T3.push([an, how, help]);
    }
    ok(T3.every(([, h]) => /^Música: /.test(h.music) && /tecla N/.test(h.music) && /tecla M/.test(h.music) && /sem arquivos de áudio/.test(h.music) && h.keyN && h.after), `o Como jogar dos três bichinhos tem o item "Música:" logo depois do "Som:" e a tecla N no item "Teclado:" (${T3.map(([a, h]) => a + ":" + (h.after && h.keyN)).join(" ")})`);
    ok(T3.every(([, , help]) => /M liga e desliga o som · N liga e desliga a música\./.test(help)), "a ajuda da pausa dos três bichinhos diz \"M liga e desliga o som · N liga e desliga a música.\"");
    ok(T3.every(([, h]) => !/soa bem|agrad[aá]vel|bonita|linda|gostosa/i.test(h.music)), "o texto do Como jogar não diz que a música é bonita nem agradável");
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8"), a = readme.indexOf("\n## Músicas tema (0.21.0)");
    ok(a >= 0, "o README tem a seção \"Músicas tema (0.21.0)\"");
    const rest = readme.slice(a + 5), b = rest.search(/\n## /), sec = b < 0 ? rest : rest.slice(0, b);
    ok(/cachorrinho\.musica\.v1/.test(sec) && /tecla \*\*N\*\*/.test(sec) && /Música: ligada/.test(sec) && /ligada por padrão/.test(sec), "a seção diz o que toca quando, o botão Música (ligada por padrão), a tecla N e a chave cachorrinho.musica.v1");
    ok(/nenhuma pessoa ouviu|ninguém ouviu/i.test(sec) && /medid/.test(sec) && !/soa bem|agrad[aá]vel|ficou bonit/i.test(sec), "a seção diz que ninguém ouviu as músicas e só descreve o que foi medido");
    await pg.context().close();
  });
};
