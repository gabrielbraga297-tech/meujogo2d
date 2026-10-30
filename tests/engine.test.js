// Testes do MOTOR do Passarinho sem navegador (0.20.0). Uso: node tests/engine.test.js   (~15 s)
// Roda o js/game.js DE VERDADE no Node (tests/engine-rig.js: um `vm` com DOM de mentira, o `__game` de teste, o Records e os mapas reais) e confere as INVARIANTES que um erro de movimento, de pouso, de vento ou de jogo salvo quebraria sem avisar:
//  - o passarinho nunca sai do mundo, nunca fica dentro de `#`, nem de `M` sem voo alto, e o voo alto nunca passa de 18 s; nenhuma exceção em milhares de quadros com teclas aleatórias e quadros de 1/60, 1/30 e 0,05 s;
//  - nem a 20 quadros por segundo, com TUDO empilhado (8 frutos, Asas fortes 4, rajada e bater asas), o passo atravessa uma parede de 1 tile (o passo da Fase 19 passa de 56 px; o motor o fatia em pedaços de até 16 px);
//  - o pouso sempre cai em chão livre, sem perder vida; o vento empurra no voo baixo e NÃO no voo alto; o gato desiste aos ~4 s do voo; o gavião não é detido pelo voo alto em chão livre (só pelo galho);
//  - o jogo salvo: recusa o passarinho sobre muro sem voo, sobre parede, com voo acima do máximo, com `mz` errado e com "gato assustado"; o salvo do Passarinho só tem os campos do Gatinho (nenhum campo novo);
//  - o fruto comum dá 10 s de voo alto e renova (não soma); os pontos e a saída das Fases 4 e 11 (mínimo de pontos e missão).
// Cada invariante tem uma mutação que a derruba (o relatório da versão lista M1 a M6: pouso, voo atravessando parede, vento no voo alto, gavião respeitando o voo, save aceitando voo demais, campo novo no save, mais a do passo sem fatiar).
const assert = require("assert");
const { boot, startBird, TILE, press, releaseAll, lcg } = require("./engine-rig.js");

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.message ? e.message.split("\n").slice(0, 6).join("\n     ") : e)); }
}
const B = boot(), g = B.g;
const tiles = (map, f) => { const o = []; map.forEach((row, r) => [...row].forEach((ch, c) => f(ch, c, r) && o.push([c, r]))); return o; };
const mapOf = (l) => g.levelsOf("bird")[l - 1].map;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const snap = () => { g.save(); return JSON.parse(JSON.stringify(JSON.parse(B.E.mem["cachorrinho.save.v1"]).saves["ana@bird"].snap)); };
// começa uma fase do Passarinho com os ganchos de teste desligados (noCatch, freezeVets, catsThaw e o toque valem até serem desligados; um teste não herda o do anterior)
const start = (lvl, o) => { g.noCatch = false; g.freezeVets = false; g.catsThaw = false; g.touchInput = false; releaseAll(B); return startBird(B, lvl, o); };
const KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

test("o motor carrega no Node: o Passarinho está pronto com as 20 fases e o jogo de teste responde", () => {
  assert.ok(g && typeof g.tick === "function" && typeof g.parseSave === "function", "falta o gancho __game");
  const info = g.games.find((x) => x.id === "bird");
  assert.ok(info && info.ready && info.levels === 20, JSON.stringify(info));
  start(1); assert.strictEqual(g.state, "playing");
});

test("fuzz: nas Fases 2, 3, 7, 11 e 18, com teclas aleatórias e quadros de 1/60, 1/30 e 0,05 s, o passarinho nunca sai do mundo, nunca está em # nem em M sem voo alto e o voo alto nunca passa de 18 s", () => {
  for (const lvl of [2, 3, 7, 11, 18]) {
    const rnd = lcg(lvl * 31);
    start(lvl, { seed: lvl }); g.noCatch = true;
    const L = g.builtOf("bird")[lvl];
    let chg = 0, bad = null;
    for (let i = 0; i < 4200 && !bad; i++) {
      if (--chg <= 0) {
        releaseAll(B); press(B, KEYS[Math.floor(rnd() * 4)]); if (rnd() < 0.5) press(B, KEYS[Math.floor(rnd() * 4)]); if (rnd() < 0.4) press(B, "Shift");
        chg = 10 + Math.floor(rnd() * 60); if (rnd() < 0.2) g.power = 3 + rnd() * 7;
      }
      g.tick([1 / 60, 1 / 30, 0.05][Math.floor(rnd() * 3)]);
      const p = g.player;
      if (p.x < 0 || p.y < 0 || p.x + 24 > L.worldW + 1e-6 || p.y + 24 > L.worldH + 1e-6) bad = "fora do mundo";
      for (const s of L.solids) if (!bad && ov(p, { x: s.x + 1e-6, y: s.y + 1e-6, w: s.w - 2e-6, h: s.h - 2e-6 }) && !(s.high && g.flying)) bad = `dentro de ${s.kind} (voo alto: ${g.flying})`;
      if (g.power > 18.01) bad = "voo alto de " + g.power + " s";
    }
    releaseAll(B);
    assert.ok(!bad, `Fase ${lvl}: ${bad}`);
  }
});

test("passo grande: a 20 quadros por segundo, com tudo empilhado (Fase 19, 8 frutos, Asas fortes 4, rajada e bater asas), o passarinho NÃO atravessa uma parede nem um muro de 1 tile", () => {
  const lvl = 19, L0 = (B0) => B0.g.builtOf("bird")[lvl], crossed = [];
  let biggest = 0, n = 0;
  for (const wall of ["#", "M"]) for (const dir of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
    start(lvl, { seed: 3, start: { upgrades: { speed: 4 } } });
    g.noCatch = true; g.freezeVets = true;
    for (const it of g.items.filter((i) => i.bone)) { g.player.x = it.x - 4; g.player.y = it.y - 4; g.tick(1 / 120); }
    g.fx = { turbo: 50 }; g.power = 0; g.touchInput = true; g.stamina = 1;
    const L = L0(B), map = g.levelsOf("bird")[lvl - 1].map, horiz = dir === "ArrowRight" || dir === "ArrowLeft";
    // uma parede de exatamente 1 tile na direção do passo, com chão livre dos dois lados (2 tiles de cada lado)
    const ok = (c, r, dc, dr) => map[r + dr] && map[r + dr][c + dc] === ".";
    let spot = null;
    for (let r = 3; r < L.rows - 3 && !spot; r++) for (let c = 3; c < L.cols - 3 && !spot; c++) {
      if (map[r][c] !== wall) continue;
      const [dc, dr] = horiz ? [1, 0] : [0, 1];
      if (ok(c, r, -dc, -dr) && ok(c, r, dc, dr) && ok(c, r, -2 * dc, -2 * dr) && ok(c, r, 2 * dc, 2 * dr)) spot = [c, r];
    }
    assert.ok(spot, `não achei uma parede ${wall} de 1 tile na Fase ${lvl} (${dir})`);
    const [c, r] = spot, sign = dir === "ArrowRight" || dir === "ArrowDown" ? 1 : -1;
    // encostado na parede, do lado de onde ele vai andar
    if (horiz) { g.player.x = sign > 0 ? c * TILE - 24 : (c + 1) * TILE; g.player.y = r * TILE + 4; } else { g.player.y = sign > 0 ? r * TILE - 24 : (r + 1) * TILE; g.player.x = c * TILE + 4; }
    press(B, dir); press(B, "Shift");
    g.tick(0.05);
    biggest = Math.max(biggest, g.dogSpeed * 0.05); // (depois do quadro: é nele que o bater asas liga o ×1,35)
    releaseAll(B);
    const p = g.player, through = horiz ? (sign > 0 ? p.x > (c + 1) * TILE - 0.01 : p.x + 24 < c * TILE + 0.01) : (sign > 0 ? p.y > (r + 1) * TILE - 0.01 : p.y + 24 < r * TILE + 0.01);
    if (through) crossed.push(`${wall} ${dir} em ${c},${r}: x ${p.x.toFixed(1)} y ${p.y.toFixed(1)}`);
    n++;
  }
  g.touchInput = false; // (este teste liga o toque; os outros não)
  assert.strictEqual(n, 8);
  assert.ok(biggest > 56, `(sanidade) o passo do teste (${biggest.toFixed(1)} px) precisa ser maior que 56 px (24 + 32) para a travessia ser possível sem o fatiamento`);
  assert.deepStrictEqual(crossed, [], "atravessou:\n     " + crossed.join("\n     "));
});

test("pouso: de cima de cada M (amostra das Fases 3 e 7) o pouso termina fora de qualquer sólido", () => {
  for (const lvl of [3, 7]) {
    start(lvl); const L = g.builtOf("bird")[lvl], Ms = tiles(mapOf(lvl), (ch) => ch === "M");
    let bad = 0;
    for (let i = 0; i < Ms.length; i += 3) { const [c, r] = Ms[i]; g.player.x = c * TILE + 4; g.player.y = r * TILE + 4; g.power = 0; g.landSafe(); if (L.solids.some((s) => ov(g.player, s))) bad++; }
    assert.strictEqual(bad, 0, `Fase ${lvl}: ${bad} pousos terminaram dentro de um sólido`);
  }
});

test("o voo alto acaba em cima de um muro: o passarinho pousa fora de sólidos e NÃO perde vida", () => {
  start(3); g.noCatch = false; const L = g.builtOf("bird")[3];
  for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  const [c, r] = tiles(mapOf(3), (ch) => ch === "M")[5]; g.player.x = c * TILE + 4; g.player.y = r * TILE + 4; g.power = 0.2; const lives = g.lives;
  for (let i = 0; i < 30; i++) g.tick(1 / 60);
  assert.ok(!L.solids.some((s) => ov(g.player, s)) && g.power === 0, `ainda em um sólido: ${g.player.x},${g.player.y}`);
  assert.strictEqual(g.lives, lives, "perdeu vida ao pousar");
});

test("vento: empurra no voo baixo e NÃO empurra no voo alto (o passarinho está acima dele)", () => {
  start(3); g.noCatch = true; for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  const map = mapOf(3), W = tiles(map, (ch) => ">^<v".includes(ch))[0];
  const put = () => { g.player.x = W[0] * TILE + 4; g.player.y = W[1] * TILE + 4; };
  put(); const x0 = g.player.x, y0 = g.player.y; g.power = 0; g.tick(1 / 60);
  const moved = Math.hypot(g.player.x - x0, g.player.y - y0);
  assert.ok(moved > 0.5 && g.windNow !== 0, `no voo baixo o vento empurra (andou ${moved.toFixed(2)} px, windNow ${g.windNow})`);
  put(); g.power = 5; g.tick(1 / 60);
  assert.ok(Math.hypot(g.player.x - x0, g.player.y - y0) < 1e-6 && g.windNow === 0, `no voo alto o vento não empurra (${g.player.x},${g.player.y}, windNow ${g.windNow})`);
});

test("gato de quintal: não pega no voo alto e desiste aos ~4 s ao pé do muro", () => {
  start(2, { seed: 5 }); g.noCatch = false; for (const it of g.items) it.taken = true;
  const map = mapOf(2), [c, r] = tiles(map, (ch, c, r) => ch === "M" && map[r][c - 1] === ".")[0];
  for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  g.player.x = c * TILE + 4; g.player.y = r * TILE + 4; g.power = 9;
  const cat = g.vets[0]; let cc = c - 3; while (cc > 0 && map[r][cc] !== ".") cc--;
  cat.cx = cc * TILE + 16; cat.cy = r * TILE + 16; cat.mode = "chase"; cat.modeT = 99; cat.cool = 0; cat.route = []; cat.leg = null; cat.idle = 0;
  const l0 = g.livesLost; let t = 0, gave = null;
  while (t < 8.5) { g.tick(1 / 60); t += 1 / 60; if (!gave && cat.gaveUp) gave = t; }
  assert.strictEqual(g.livesLost, l0, "o gato pegou o passarinho em voo alto");
  assert.ok(gave && gave > 3.9 && gave < 4.2, "o gato deveria desistir em ~4 s: " + gave);
});

// um chão livre bem aberto da Fase 11, para o gavião vir de frente
const openGround = () => { const map = mapOf(11), fr = tiles(map, (ch, c, r) => ch === "." && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].every(([a, b]) => map[r + b][c + a] === ".")); return fr[Math.floor(fr.length / 2)]; };
test("gavião: o voo alto NÃO o detém em chão livre (ele pega o passarinho mesmo voando)", () => {
  start(11); g.freezeVets = true; g.catsThaw = true; g.noCatch = false; for (const it of g.items) it.taken = true; for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  const h = g.cats[0], [pc, pr] = openGround();
  g.player.x = pc * TILE + 4; g.player.y = pr * TILE + 4; g.power = 10;
  h.cx = (pc - 3) * TILE + 16; h.cy = pr * TILE + 16; h.mode = "chase"; h.modeT = 99; h.cool = 0; h.leg = null; h.route = [];
  const l0 = g.livesLost; let t = 0; while (t < 6 && g.livesLost === l0) { g.tick(1 / 60); t += 1 / 60; }
  assert.ok(g.livesLost > l0, "o gavião deveria pegar o passarinho em voo alto, em chão livre");
});
test("gavião: continua perseguindo durante TODO o voo alto (só o galho o faz desistir)", () => {
  start(11); g.freezeVets = true; g.catsThaw = true; g.noCatch = true; for (const it of g.items) it.taken = true; for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  const h = g.cats[0], [pc, pr] = openGround();
  g.player.x = pc * TILE + 4; g.player.y = pr * TILE + 4; g.power = 9;
  h.cx = (pc - 3) * TILE + 16; h.cy = pr * TILE + 16; h.mode = "chase"; h.modeT = 99; h.cool = 0; h.leg = null; h.route = [];
  let t = 0; while (t < 6) { g.tick(1 / 60); t += 1 / 60; h.modeT = 99; }
  assert.ok(h.mode === "chase" && !h.gaveUp, `o gavião desistiu durante o voo alto (modo ${h.mode}, desistiu ${h.gaveUp})`);
});

test("jogo salvo: recusa o passarinho sobre muro sem voo, sobre parede, voo acima do máximo, mz errado e gato \"assustado\"; aceita o que é possível; e o salvo só tem os campos do Gatinho", () => {
  start(3, { seed: 4 }); g.noCatch = true; for (let i = 0; i < 20; i++) g.tick(1 / 60);
  const base = snap(), mk = (f) => { const s = JSON.parse(JSON.stringify(base)); f(s); return g.parseSave(s, "bird"); };
  const [c, r] = tiles(mapOf(3), (ch) => ch === "M")[4], [wc, wr] = tiles(mapOf(3), (ch) => ch === "#")[3];
  const fails = [], check = (name, cond) => { if (!cond) fails.push(name); };
  check("jogador sobre M sem voo é recusado", !mk((s) => { s.p.x = c * TILE + 4; s.p.y = r * TILE + 4; s.pw = 0; }));
  check("jogador sobre M com voo é aceito", mk((s) => { s.p.x = c * TILE + 4; s.p.y = r * TILE + 4; s.pw = 5; }));
  check("jogador sobre # com voo é recusado", !mk((s) => { s.p.x = wc * TILE + 4; s.p.y = wr * TILE + 4; s.pw = 5; }));
  check("pw acima do máximo (10) é recusado", !mk((s) => { s.pw = 10.5; }));
  check("pw = 10 é aceito", mk((s) => { s.pw = 10; }));
  check("mz errado é recusado", !mk((s) => { s.mz = 2; }) && !mk((s) => { s.mz = 0; }));
  check("gato assustado é recusado no Passarinho", !mk((s) => { s.pw = 5; s.vd = s.vd.map(() => 1); }));
  const bk = Object.keys(base).sort().join(",");
  check("o salvo da Fase 3 só tem os campos do Gatinho: " + bk, bk === "ba,bl,bs,invuln,items,l,lives,lost,mz,p,pk,pw,rs,sta,time,up,v,vd,vets,wet,wnd");
  start(11); g.noCatch = true; for (let i = 0; i < 20; i++) g.tick(1 / 60);
  const k11 = Object.keys(snap()).sort().join(",");
  check("o salvo da Fase 11 só tem os campos do Gatinho (mais cats e cd): " + k11, k11 === "ba,bl,bs,cats,cd,invuln,items,l,lives,lost,mz,p,pk,pw,rs,sta,time,up,v,vd,vets,wet,wnd");
  assert.deepStrictEqual(fails, []);
});

test("fruto comum: 10 s de voo alto, renova ao pegar outro durante o voo (não soma) e o reforço Fruto poderoso 3 dá 16 s", () => {
  start(2, { seed: 8 }); g.noCatch = true; for (const v of g.vets) { v.cx = 48; v.cy = 48; }
  const fr = g.items.filter((i) => i.bone);
  g.player.x = fr[0].x - 4; g.player.y = fr[0].y - 4; g.tick(1 / 120);
  assert.ok(Math.abs(g.power - 10) < 0.05, "fruto comum: voo de 10 s, deu " + g.power);
  for (let i = 0; i < 300; i++) g.tick(1 / 60); const p1 = g.power;
  g.player.x = fr[1].x - 4; g.player.y = fr[1].y - 4; g.tick(1 / 120);
  assert.ok(Math.abs(g.power - 10) < 0.05 && p1 < 6, `o segundo fruto renova para 10 s, não soma (antes ${p1.toFixed(2)}, depois ${g.power.toFixed(2)})`);
  start(2, { seed: 8, start: { upgrades: { bone: 3 } } }); const f2 = g.items.filter((i) => i.bone);
  g.player.x = f2[0].x - 4; g.player.y = f2[0].y - 4; g.tick(1 / 120);
  assert.ok(Math.abs(g.power - 16) < 0.05, "reforço Fruto poderoso 3: 16 s, deu " + g.power);
});

test("pontos e saída: Fase 11 (mínimo 2300 e missão de todos os frutos) e Fase 4 (800 pontos sem pegar tudo)", () => {
  start(11, { seed: 12 }); g.noCatch = true; g.freezeVets = true;
  const seeds = g.items.filter((i) => !i.bone), fruits = g.items.filter((i) => i.bone);
  const pick = (it) => { g.player.x = it.x - 4; g.player.y = it.y - 4; g.tick(1 / 120); };
  const toExit = () => { const e = g.exit; g.player.x = e.x + 4; g.player.y = e.y + 4; g.power = 0; g.tick(1 / 120); return g.state; };
  assert.strictEqual(toExit(), "playing", "F11 nada coletado: a saída deveria estar fechada");
  for (const it of seeds) pick(it); for (const it of fruits.slice(0, fruits.length - 1)) pick(it);
  assert.ok(g.score >= 2300 && toExit() === "playing", "F11 com pontos de sobra mas faltando 1 fruto (missão): a saída deveria estar fechada (" + g.score + " pontos)");
  pick(fruits[fruits.length - 1]);
  assert.strictEqual(g.score, 44 * 100 + 5 * 150, "F11 tudo: 44 sementes de 100 e 5 frutos de 150");
  assert.strictEqual(toExit(), "won", "F11 tudo: a saída deveria abrir");
  start(4, { seed: 2 }); g.noCatch = true; g.freezeVets = true;
  const s4 = g.items.filter((i) => !i.bone); for (let i = 0; i < 7; i++) pick(s4[i]);
  assert.strictEqual(toExit(), "playing", "F4 com 700 pontos: a saída deveria estar fechada (" + g.score + ")");
  pick(s4[7]); assert.strictEqual(toExit(), "won", "F4 com 800 pontos: a saída abre sem pegar tudo (" + g.score + ")");
});

console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes do motor passaram");
process.exit(failed ? 1 : 0);
