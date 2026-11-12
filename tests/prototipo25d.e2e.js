// "Teste 01 de adaptação" (2,5D), no navegador. Uso: NODE_PATH=... CHROMIUM_PATH=... node tests/prototipo25d.e2e.js
//   Outros navegadores: BROWSER=firefox|webkit PLAYWRIGHT_BROWSERS_PATH=... node tests/prototipo25d.e2e.js
// NÃO faz parte da suíte do jogo (tests/e2e*.js): o teste é uma página à parte (teste-01-adaptacao/). O que se prova aqui:
//  1) as REGRAS são as do jogo: as mesmas jogadas, com o mesmo sorteio e o mesmo relógio, dão o mesmo estado no jogo original e no teste;
//  2) o CHÃO não mudou (mesmas cores nos mesmos pontos longe das paredes) e as PAREDES ganharam relevo (topo levantado, face escura, sombra no chão);
//  3) a tela inicial, a vitória, a derrota, a pausa e jogar de novo funcionam e só existe esta fase; nada é guardado no aparelho; sem erro de JavaScript;
//  4) no celular em pé a câmera mostra o topo das paredes de cima.
const http = require("http");
const fs = require("fs");
const path = require("path");
const pw = require("playwright");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
let total = 0, failed = 0;
const ok = (cond, msg) => { total++; if (cond) console.log("OK   " + msg); else { failed++; console.log("FAIL " + msg); } };

// o relógio do jogo e o sorteio ficam sob controle: sem o laço de quadros, só andam com `__game.tick`; `__reseed(n)` recomeça o sorteio igual nas duas páginas
const FIX = `
  window.requestAnimationFrame = () => 0;
  (() => { let a = 1; window.__reseed = (n) => { a = n; }; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
`;

const server = http.createServer((q, s) => {
  let p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if (p.endsWith(path.sep)) p += "index.html";
  fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { "content-type": (MIME[path.extname(p)] || "application/octet-stream") + "; charset=utf-8" }); s.end(d); });
});

(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await ({ chromium: pw.chromium, firefox: pw.firefox, webkit: pw.webkit }[process.env.BROWSER || "chromium"]).launch();
  const errs = [], outside = [];
  const open = async (url, size = { width: 1000, height: 760 }) => {
    const ctx = await browser.newContext({ viewport: size });
    const pg = await ctx.newPage();
    await pg.addInitScript(FIX);
    pg.on("request", (r) => { if (!/^(http:\/\/127\.0\.0\.1|data:|blob:|about:)/.test(r.url())) outside.push(r.url().slice(0, 100)); });
    pg.on("pageerror", (e) => errs.push(`${url}: ${String(e).slice(0, 160)}`));
    pg.on("console", (m) => { if (m.type() === "error") errs.push(`${url}: console ${m.text().slice(0, 160)}`); });
    await pg.goto(`${base}/${url}`); await pg.waitForTimeout(400);
    return pg;
  };
  const T = "teste-01-adaptacao/index.html", O = "index.html";
  const shown = (pg, id) => pg.evaluate((i) => { const e = document.getElementById(i); return !e.classList.contains("hidden") && getComputedStyle(e).display !== "none"; }, id); // (visível: sem a classe hidden e sem display:none, também o escondido por CSS)
  const screen = (pg) => pg.evaluate(() => document.body.dataset.screen);
  const startTest = async (pg) => { await pg.evaluate(() => window.__reseed(777)); await pg.click("#btn-t01-play"); await pg.waitForTimeout(150); };
  const startOrig = async (pg) => { await pg.evaluate(() => { window.__reseed(777); __game.start(2, { player: "Teste" }); }); }; // (também reinicia a fase do teste quando a partida já está em andamento)
  const pixel = (pg, wx, wy) => pg.evaluate(([x, y]) => { const v = __game.view, sx = v.k * v.zoom, d = document.getElementById("game").getContext("2d").getImageData(Math.round((x - v.camX) * sx), Math.round((y - v.camY) * sx), 1, 1).data; return [d[0], d[1], d[2]]; }, [wx, wy]);
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const gray = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 34;

  // ---------- 1) a tela inicial do teste ----------
  const t = await open(T);
  ok((await screen(t)) === "teste01" && (await shown(t, "teste01")) && !(await shown(t, "menu")), "a página abre direto na tela do Teste 01 de adaptação (sem o menu do jogo)");
  ok((await t.title()) === "Teste 01 de adaptação", "o título da aba é «Teste 01 de adaptação»");
  ok((await t.evaluate(() => __game.levels.length)) >= 2 && (await t.evaluate(() => __game.levels[1].title)) === "Teste 01 de adaptação", "a fase de teste (a Fase 2 do Cachorrinho) se chama «Teste 01 de adaptação»");

  // ---------- 2) as regras: as mesmas jogadas dão o mesmo estado no original e no teste ----------
  const o = await open(O);
  await startTest(t); await startOrig(o);
  ok((await t.evaluate(() => __game.state)) === "playing" && (await t.evaluate(() => __game.level)) === 2, "«Jogar o teste» começa a Fase 2 do Cachorrinho");
  ok((await t.locator("#hud-level").textContent()) === "01", "o placar mostra TESTE 01");
  const asp = await t.evaluate(() => { const c = document.getElementById("game"); return c.width / c.height; });
  ok(Math.abs(asp - 800 / 590) < 0.01, `o campo ganhou os 14 px do topo das paredes (proporção ${asp.toFixed(3)} ≈ ${(800 / 590).toFixed(3)})`);
  const plan = [["ArrowRight", 160], ["ArrowUp", 120], ["ArrowLeft", 200], ["ArrowDown", 240], ["ArrowRight", 300], ["ArrowUp", 200], ["ArrowLeft", 260]];
  const play = (pg) => pg.evaluate((pl) => {
    window.__reseed(4242);
    const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code: k, bubbles: true }));
    const snaps = [];
    for (const [k, n] of pl) { key("keydown", k); for (let i = 0; i < n; i++) __game.tick(1 / 60); key("keyup", k); const p = __game.player; snaps.push([k, __game.time, p.x, p.y, __game.lives, __game.collected, __game.state, __game.vets.map((v) => [v.cx, v.cy, v.mode, v.slow ? 1 : 0])]); }
    return JSON.stringify(snaps);
  }, plan);
  const a = JSON.parse(await play(t)), b = JSON.parse(await play(o));
  ok(a.length === plan.length && a.every((s, i) => JSON.stringify(s) === JSON.stringify(b[i])), `as mesmas ${plan.length} jogadas (${plan.reduce((n, p) => n + p[1], 0)} quadros, com os agentes se movendo) dão o MESMO estado no teste e no jogo original: posição, tempo, vidas, rações, agentes`);
  ok(a[a.length - 1][1] > 10 && a.some((s) => s[2] !== a[0][2]), "(as jogadas foram de verdade: o cachorrinho andou e o tempo passou)");

  // ---------- 3) o chão não mudou; as paredes ganharam relevo ----------
  await startOrig(t); await startOrig(o);
  await t.evaluate(() => __game.drawNow()); await o.evaluate(() => __game.drawNow());
  const floor = [[80, 208], [400, 208], [720, 208], [80, 392], [400, 392], [560, 460]]; // chão aberto, longe das paredes (mapa da Fase 2)
  let same = 0;
  for (const [x, y] of floor) { const c1 = await pixel(t, x, y), c2 = await pixel(o, x, y); if (c1.every((v, i) => Math.abs(v - c2[i]) <= 2)) same++; }
  ok(same === floor.length, `o chão é o mesmo: ${same} de ${floor.length} pontos de chão aberto têm a mesma cor no teste e no original`);
  const capT = await pixel(t, 272, 8 * 32 - 7), capO = await pixel(o, 272, 8 * 32 - 7);
  ok(gray(capT) && lum(capT) > 110 && !gray(capO), `o topo da parede está levantado: 7 px ao norte da parede é pedra no teste (${capT}) e grama no original (${capO})`);
  const faceT = await pixel(t, 272, 9 * 32 + 14), faceO = await pixel(o, 272, 9 * 32 + 14);
  ok(lum(faceT) < lum(faceO) - 25, `a face da frente é mais escura que a parede plana (luminosidade ${lum(faceT).toFixed(0)} contra ${lum(faceO).toFixed(0)})`);
  const shT = await pixel(t, 272, 10 * 32 + 3), shO = await pixel(o, 272, 10 * 32 + 3);
  ok(shT[1] < shO[1] - 8, `há sombra no chão ao sul da parede (verde ${shT[1]} contra ${shO[1]} sem sombra)`);

  // a silhueta: o cachorrinho ao norte da parede do meio (linha 7), com a parte de baixo "atrás" do topo levantado da parede, aparece por cima dela
  await t.evaluate(() => { __game.freezeVets = true; const p = __game.player; p.x = 4.5 * 32 - p.w / 2; p.y = 7 * 32 + 20 - p.h / 2; __game.drawNow(); });
  const tint = await t.evaluate(() => { const v = __game.view, sx = v.k * v.zoom, c = document.getElementById("game").getContext("2d"), x0 = Math.round((4.5 * 32 - 10 - v.camX) * sx), y0 = Math.round((8 * 32 - 12 - v.camY) * sx), w = Math.round(20 * sx), h = Math.round(9 * sx), d = c.getImageData(x0, y0, w, h).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) >= 34) n++; return n; });
  ok(tint >= 8, `atrás da parede o cachorrinho aparece como silhueta por cima do topo de pedra (${tint} pixels coloridos sobre a pedra cinza, que sem a silhueta seria só cinza)`);

  // ---------- 4) vitória, derrota, pausa e jogar de novo ----------
  const startClock = (pg) => pg.evaluate(() => { const k = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: "ArrowRight", code: "ArrowRight", bubbles: true })); k("keydown"); __game.tick(1 / 60); k("keyup"); }); // (o tempo e as pegadas só começam no primeiro passo)
  const place = (pg, x, y) => pg.evaluate(([x, y]) => { const p = __game.player; p.x = x - p.w / 2; p.y = y - p.h / 2; __game.tick(1 / 60); __game.tick(1 / 60); }, [x, y]);
  await startOrig(t); await startClock(t);
  await t.evaluate(() => { __game.freezeVets = true; });
  const n = await t.evaluate(() => __game.items.length);
  for (let i = 0; i < n; i++) { const [x, y] = await t.evaluate((k) => { const it = __game.items[k]; return [it.x + 8, it.y + 8]; }, i); await place(t, x, y); }
  await place(t, 22.5 * 32, 11 * 32);
  ok((await t.evaluate(() => __game.state)) === "won" && (await screen(t)) === "win", "pegando tudo e chegando à saída, o cachorrinho vence a fase (tela de vitória)");
  ok((await t.locator("#win-title").textContent()) === "Teste 01 de adaptação concluída!" && !(await shown(t, "btn-next")) && (await shown(t, "btn-again")), "a vitória não oferece «Próxima fase»: só jogar de novo e voltar");
  ok((await t.evaluate(() => localStorage.length + sessionStorage.length)) === 0, "depois de jogar e vencer, nada foi guardado no aparelho (localStorage e sessionStorage vazios)");
  await t.click("#btn-win-menu"); await t.waitForTimeout(100);
  ok((await screen(t)) === "teste01", "«Menu» volta à tela do teste (e não ao menu do jogo, que tem as outras 19 fases)");
  await startTest(t);
  ok((await t.evaluate(() => __game.state)) === "playing" && (await t.evaluate(() => __game.collected)) === 0, "jogar de novo começa do zero");
  await startClock(t);
  await t.evaluate(() => { __game.setLives(1); __game.freezeVets = false; });
  await t.evaluate(() => { const v = __game.vets[0], p = __game.player; p.x = v.cx - p.w / 2; p.y = v.cy - p.h / 2; for (let i = 0; i < 6; i++) __game.tick(1 / 60); });
  ok((await t.evaluate(() => __game.state)) === "lost" && (await screen(t)) === "lose", "sem vidas, aparece a tela de derrota");
  await t.click("#btn-retry"); await t.waitForTimeout(100);
  ok((await t.evaluate(() => __game.state)) === "playing" && (await t.evaluate(() => __game.level)) === 2, "«Tentar novamente» recomeça a mesma fase");
  await t.keyboard.press("Escape"); await t.waitForTimeout(100);
  ok((await t.evaluate(() => __game.state)) === "paused" && !(await shown(t, "btn-save")) , "Esc pausa (e o botão de salvar do jogo não aparece no teste)");
  await t.click("#btn-pause-menu"); await t.waitForTimeout(100);
  ok((await screen(t)) === "teste01", "«Voltar ao menu» da pausa também volta à tela do teste");
  ok((await t.evaluate(() => localStorage.length + sessionStorage.length)) === 0, "depois da derrota, da pausa e de tudo isso, continua sem guardar nada");

  // ---------- 5) celular em pé: a câmera mostra o topo das paredes de cima ----------
  const m = await open(T, { width: 390, height: 780 });
  await startTest(m);
  await m.evaluate(() => { __game.freezeVets = true; const p = __game.player; p.x = 40; p.y = 40; for (let i = 0; i < 3; i++) __game.tick(1 / 60); __game.drawNow(); });
  const vw = await m.evaluate(() => ({ camY: __game.view.camY, zoom: __game.view.zoom }));
  ok(vw.zoom > 1 && Math.abs(vw.camY + 14) < 1.5, `no celular a tela aproxima (zoom ${vw.zoom.toFixed(2)}) e no canto de cima a câmera sobe até 14 px acima do mapa (camY ${vw.camY.toFixed(1)}, arredondado ao pixel do aparelho)`);
  const topPx = await m.evaluate(() => { const c = document.getElementById("game"), d = c.getContext("2d").getImageData(Math.round(c.width / 2), 2, 1, 1).data; return [d[0], d[1], d[2]]; });
  ok(lum(topPx) > 80, `a primeira linha de pixels do campo é o topo da parede (luminosidade ${lum(topPx).toFixed(0)}), não o fundo escuro`);

  ok(outside.length === 0, `o teste só pede arquivos ao próprio servidor, sem falar com a internet${outside.length ? ": " + outside.join(" | ") : ""}`);
  ok(errs.length === 0, `nenhum erro de JavaScript em nenhuma das páginas${errs.length ? ": " + errs.join(" | ") : ""}`);
  await browser.close(); server.close();
  console.log(`\n${total - failed} de ${total} verificações ok${process.env.BROWSER ? " (" + process.env.BROWSER + ")" : " (chromium)"}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
