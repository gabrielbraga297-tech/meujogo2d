// Teste de ponta a ponta no navegador (Chromium headless).
// Uso: npm i playwright && node tests/e2e.js   (CHROMIUM_PATH opcional)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const MAP = eval(src.match(/const MAP = (\[[\s\S]*?\]);/)[1]);
const R = MAP.length, C = MAP[0].length;
const free = (c, r) => MAP[r][c] !== "#" && MAP[r][c] !== "X";
const find = (ch) => MAP.flatMap((row, r) => [...row].map((x, c) => (x === ch ? [c, r] : null)).filter(Boolean));

function bfs(from, to) {
  const key = (c, r) => r * C + c, prev = new Map([[key(...from), null]]), q = [from];
  for (let i = 0; i < q.length; i++) {
    const [c, r] = q[i];
    if (c === to[0] && r === to[1]) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= C || nr >= R || !free(nc, nr) || prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]); q.push([nc, nr]);
    }
  }
  if (!prev.has(key(...to))) return null;
  const out = []; for (let cur = to; cur; cur = prev.get(key(...cur))) out.unshift(cur);
  return out;
}

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); if (!cond) failed++; };

// Roda dentro da página: simula teclado + tempo de forma síncrona e determinística.
const PAGE_HELPERS = () => {
  const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k }));
  window.__t = {
    hold(k, frames, dt = 1 / 60) { press(k, true); for (let i = 0; i < frames; i++) __game.tick(dt); press(k, false); },
    run(frames, dt = 1 / 60) { for (let i = 0; i < frames; i++) __game.tick(dt); },
    walk(path) {
      for (const [c, r] of path) {
        const tx = c * 32 + 16, ty = r * 32 + 16;
        for (let i = 0; i < 600; i++) {
          if (__game.state !== "playing") return;
          const p = __game.player, dx = tx - (p.x + 12), dy = ty - (p.y + 12);
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) break;
          press("d", dx > 3); press("a", dx < -3); press("s", dy > 3); press("w", dy < -3);
          __game.tick(1 / 60);
        }
      }
      for (const k of "wasd") press(k, false);
    },
  };
};

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  await page.goto("file://" + path.join(root, "index.html"));
  await page.evaluate(PAGE_HELPERS);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const start = async () => { await page.reload(); await page.evaluate(PAGE_HELPERS); await page.click("#btn-play"); };

  const dogStart = find("P")[0], items = find("I"), exit = find("E")[0], vetStarts = find("V");
  ok(await ev(() => __game.state) === "menu", "começa no menu");
  ok(items.length === 5, "5 rações no mapa");
  ok(vetStarts.length === 1, "Fase 1 tem exatamente 1 veterinário");
  ok(items.every((i) => bfs(dogStart, i)) && bfs(dogStart, exit), "rações e saída alcançáveis");
  ok(bfs(dogStart, vetStarts[0]).length > 12, "veterinário começa longe do cachorro");

  // --- movimento e paredes (veterinário congelado) ---
  await start(); await ev(() => { __game.freezeVets = true; });
  ok(await ev(() => __game.state) === "playing", "Jogar inicia a partida");
  ok(await ev(() => __game.vets.length) === 1, "1 veterinário em jogo");
  let x0 = await ev(() => __game.player.x);
  await ev(() => __t.hold("d", 20)); ok(await ev(() => __game.player.x) > x0 + 30, "D move para a direita");
  x0 = await ev(() => __game.player.x);
  await ev(() => __t.hold("ArrowLeft", 10)); ok(await ev(() => __game.player.x) < x0 - 15, "seta esquerda move");
  await ev(() => __t.hold("w", 120)); ok(await ev(() => __game.player.y) >= 32, "parede superior bloqueia");
  await ev(() => __t.hold("a", 200)); ok(await ev(() => __game.player.x) >= 32, "parede esquerda bloqueia");

  // --- coleta, pontuação, saída e vitória ---
  await start(); await ev(() => { __game.freezeVets = true; });
  const cur = () => ev(() => [Math.floor((__game.player.x + 12) / 32), Math.floor((__game.player.y + 12) / 32)]);
  await ev((p) => __t.walk(p), bfs(await cur(), exit));
  ok(await ev(() => __game.state) === "playing", "saída sem as 5 rações não vence");
  for (let n = 1; n <= 5; n++) {
    const left = await ev(() => __game.items.filter((i) => !i.taken).map((i) => [Math.floor(i.x / 32), Math.floor(i.y / 32)]));
    const here = await cur();
    left.sort((a, b) => bfs(here, a).length - bfs(here, b).length);
    await ev((p) => __t.walk(p), bfs(here, left[0]));
    ok(await ev(() => __game.collected) === n && await ev(() => __game.score) === n * 100, `ração ${n} coletada (contador ${n}/5, ${n * 100} pontos)`);
  }
  await ev((p) => __t.walk(p), bfs(await cur(), exit));
  ok(await ev(() => __game.state) === "won" && await page.isVisible("#win"), "vitória ao chegar na saída com 5 rações");
  ok(await ev(() => __game.score) >= 500, "pontuação final inclui as 5 rações (500) mais o bônus de tempo");
  await page.click("#btn-again");
  ok(await ev(() => __game.state) === "playing" && await ev(() => __game.collected) === 0 && await ev(() => __game.items.every((i) => !i.taken)), "reinício zera a partida");

  // --- veterinário: patrulha (sem perseguir), colisão com paredes e velocidade ---
  await start();
  const cfg = await ev(() => __game.vets[0].cfg);
  ok(cfg.chaseSpeed < 180 * 0.5 && cfg.speed <= cfg.chaseSpeed, "veterinário é bem mais lento que o cachorro");
  ok(cfg.sight <= 4 * 32 && cfg.chaseChance <= 0.3, "veterinário enxerga pouco e persegue raramente");
  const patrol = await ev((dtMax) => {
    const v = __game.vets[0]; v.cfg.chaseChance = 0; // isola a patrulha
    const seen = new Set(); let maxSpeed = 0, chased = 0, px = v.cx, py = v.cy;
    for (let i = 0; i < 4000; i++) { // ~133 s de jogo
      __game.tick(1 / 30);
      const tx = Math.floor(v.cx / 32), ty = Math.floor(v.cy / 32); seen.add(tx + "," + ty);
      maxSpeed = Math.max(maxSpeed, Math.hypot(v.cx - px, v.cy - py) * 30); px = v.cx; py = v.cy;
      if (v.mode === "chase") chased++;
    }
    return { tiles: seen.size, maxSpeed, chased };
  });
  ok(patrol.tiles >= 25, `veterinário percorre o mapa (${patrol.tiles} tiles distintos)`);
  ok(patrol.maxSpeed <= cfg.speed + 1, `velocidade de patrulha respeitada (${patrol.maxSpeed.toFixed(1)} px/s)`);
  ok(patrol.chased === 0, "sem chance de perseguir → nunca persegue");
  const wallHits = await ev((MAPSTR) => {
    // reexecuta a patrulha checando paredes com o mapa real
    const M = MAPSTR; __game.setRand(null);
    const v = __game.vets[0]; let hits = 0;
    for (let i = 0; i < 3000; i++) {
      __game.tick(1 / 30);
      for (const [ox, oy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
        const ch = M[Math.floor((v.cy + oy) / 32)][Math.floor((v.cx + ox) / 32)];
        if (ch === "#" || ch === "X") hits++;
      }
    }
    return hits;
  }, MAP);
  ok(wallHits === 0, "veterinário nunca atravessa paredes nem caixas");

  // --- perseguição só acontece raramente e é curta ---
  await start();
  const place = (dogTile, vetTile) => ev(([d, v]) => {
    __game.player.x = d[0] * 32 + 4; __game.player.y = d[1] * 32 + 4;
    const vet = __game.vets[0]; vet.cx = v[0] * 32 + 16; vet.cy = v[1] * 32 + 16; vet.leg = null; vet.route = []; vet.mode = "patrol"; vet.cool = 0; vet.think = 0;
  }, [dogTile, vetTile]);
  await place([20, 4], [22, 4]); // 2 tiles de distância, corredor aberto
  await ev(() => __game.setRand(() => 0.99)); // nunca decide perseguir
  let chasedCount = await ev(() => { let n = 0; for (let i = 0; i < 20; i++) { __game.vets[0].cool = 0; __game.tick(0.6); if (__game.vets[0].mode === "chase") n++; if (__game.state !== "playing") break; } return n; });
  ok(chasedCount === 0, "com sorte baixa o veterinário vê o cachorro e não persegue");
  await start(); await place([20, 4], [22, 4]);
  await ev(() => __game.setRand(() => 0)); // sempre decide perseguir
  const chase = await ev(() => {
    const v = __game.vets[0]; v.cfg.chaseTime = 1.8; let started = false, maxChase = 0, t = 0, endedAt = null;
    __game.player.x = 20 * 32 + 4; __game.player.y = 4 * 32 + 4;
    __game.tick(0.7);
    started = v.mode === "chase";
    const dist0 = Math.hypot(v.cx - (__game.player.x + 12), v.cy - (__game.player.y + 12));
    __game.setRand(() => 0.99);
    for (let i = 0; i < 400 && __game.state === "playing"; i++) { __game.tick(0.05); t += 0.05; if (v.mode === "chase") maxChase = t; }
    return { started, dist0, maxChase, coolAfter: v.cool };
  });
  ok(chase.started, "com sorte alta e cachorro à vista, o veterinário inicia a perseguição");
  ok(chase.maxChase <= 1.8 + 0.2 || chase.maxChase === 0, "perseguição dura no máximo ~1,8 s");

  // --- derrota e reinício ---
  await start(); await ev(() => { __game.freezeVets = false; });
  await ev(() => { const v = __game.vets[0]; v.cx = __game.player.x + 12; v.cy = __game.player.y + 12; __game.tick(1 / 60); });
  ok(await ev(() => __game.state) === "lost" && await page.isVisible("#lose"), "veterinário encosta no cachorro → fim de jogo");
  const xl = await ev(() => __game.player.x);
  await page.keyboard.down("d"); await page.waitForTimeout(250); await page.keyboard.up("d");
  ok(await ev(() => __game.player.x) === xl, "movimento interrompido na derrota");
  await page.click("#btn-retry");
  ok(await ev(() => __game.state) === "playing" && !(await page.isVisible("#lose")) && await ev(() => __game.collected) === 0, "Tentar novamente reinicia a partida");
  const sp = await ev(() => ({ dx: __game.player.x, vx: __game.vets[0].cx }));
  ok(sp.dx === dogStart[0] * 32 + 4 && Math.abs(sp.vx - (vetStarts[0][0] * 32 + 16)) < 40, "posições iniciais restauradas");

  console.log("erros JS:", errs);
  if (errs.length) failed++;
  await browser.close();
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram");
  process.exit(failed ? 1 : 0);
})();
