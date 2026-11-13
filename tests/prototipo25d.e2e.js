// "Teste 01 de adaptação" (2,5D), no navegador. Uso: NODE_PATH=... CHROMIUM_PATH=... node tests/prototipo25d.e2e.js
//   Outros navegadores: BROWSER=firefox|webkit PLAYWRIGHT_BROWSERS_PATH=... node tests/prototipo25d.e2e.js
// NÃO faz parte da suíte do jogo (tests/e2e*.js): o teste é uma página à parte (teste-01-adaptacao/). O que se prova aqui:
//  1) as REGRAS são as do jogo: as mesmas jogadas, com o mesmo sorteio e o mesmo relógio, dão o mesmo estado no jogo original e no teste;
//  2) o CHÃO não mudou (mesmas cores nos mesmos pontos longe das paredes) e as PAREDES ganharam relevo (topo levantado, face escura, sombra no chão);
//     ração e osso aparecem INTEIROS (nem cortados nem transparentes) mesmo colados ao sul de uma parede, e quem encosta numa parede pelo norte fica atrás dela;
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
  const open = async (url, size = { width: 832, height: 900 }) => { // (832 de largura dá ao campo 800 px: um pixel do jogo = um pixel da tela, então as contagens de pixels são exatas)
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
  const startOrig = async (pg) => { await pg.evaluate(() => { window.__reseed(777); __game.start(1, { player: "Teste" }); }); }; // (também reinicia a fase do teste quando a partida já está em andamento)
  const pixel = (pg, wx, wy) => pg.evaluate(([x, y]) => { const v = __game.view, sx = v.k * v.zoom, d = document.getElementById("game").getContext("2d").getImageData(Math.round((x - v.camX) * sx), Math.round((y - v.camY) * sx), 1, 1).data; return [d[0], d[1], d[2]]; }, [wx, wy]);
  const startClock = (pg) => pg.evaluate(() => { const k = (type) => window.dispatchEvent(new KeyboardEvent(type, { key: "ArrowRight", code: "ArrowRight", bubbles: true })); k("keydown"); __game.tick(1 / 60); k("keyup"); }); // (o tempo e as pegadas só começam no primeiro passo)
  const place = (pg, x, y) => pg.evaluate(([x, y]) => { const p = __game.player; p.x = x - p.w / 2; p.y = y - p.h / 2; __game.tick(1 / 60); __game.tick(1 / 60); }, [x, y]);
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const gray = (c) => Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) < 34;

  // ---------- 1) a tela inicial do teste ----------
  const t = await open(T);
  ok((await screen(t)) === "teste01" && (await shown(t, "teste01")) && !(await shown(t, "menu")), "a página abre direto na tela do Teste 01 de adaptação (sem o menu do jogo)");
  ok((await t.title()) === "Teste 01 de adaptação", "o título da aba é «Teste 01 de adaptação»");
  ok((await t.evaluate(() => __game.levels.length)) >= 2 && (await t.evaluate(() => __game.levels[0].title)) === "Teste 01 de adaptação", "a fase de teste (a Fase 1 do Cachorrinho, a mais simples) se chama «Teste 01 de adaptação»");

  // ---------- 2) as regras: as mesmas jogadas dão o mesmo estado no original e no teste ----------
  const o = await open(O);
  await startTest(t); await startOrig(o);
  ok((await t.evaluate(() => __game.state)) === "playing" && (await t.evaluate(() => __game.level)) === 1, "«Jogar o teste» começa a Fase 1 do Cachorrinho");
  ok((await t.locator("#hud-level").textContent()) === "01", "o placar mostra TESTE 01");
  const asp = await t.evaluate(() => { const c = document.getElementById("game"); return c.width / c.height; });
  ok(Math.abs(asp - 800 / 582) < 0.01, `o campo ganhou os 6 px do topo das paredes (proporção ${asp.toFixed(3)} ≈ ${(800 / 582).toFixed(3)})`);
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
  const floor = [[100, 72], [400, 72], [720, 72], [400, 300], [560, 220], [300, 512]]; // chão aberto, longe das paredes (mapa da Fase 1)
  let same = 0;
  for (const [x, y] of floor) { const c1 = await pixel(t, x, y), c2 = await pixel(o, x, y); if (c1.every((v, i) => Math.abs(v - c2[i]) <= 2)) same++; }
  ok(same === floor.length, `o chão é o mesmo: ${same} de ${floor.length} pontos de chão aberto têm a mesma cor no teste e no original`);
  const green = (c) => c[1] > c[0] + 15 && c[1] > c[2] + 15; // grama (a cerca do Quintal é marrom, não verde)
  const capT = await pixel(t, 272, 4 * 32 - 3), capO = await pixel(o, 272, 4 * 32 - 3); // a parede da linha 4 sobe 6 px para dentro da linha 3 (grama)
  ok(!green(capT) && lum(capT) > 90 && green(capO), `o topo da parede está levantado: 3 px ao norte da cerca é madeira no teste (${capT}) e grama no original (${capO})`);
  const faceT = await pixel(t, 272, 5 * 32 - 2), faceO = await pixel(o, 272, 5 * 32 - 2);
  ok(lum(faceT) < lum(capT) - 50 && lum(faceT) <= lum(faceO), `a face da frente é bem mais escura que o topo (luminosidade ${lum(faceT).toFixed(0)} contra ${lum(capT).toFixed(0)}) e não mais clara que a parede plana (${lum(faceO).toFixed(0)})`);
  const shT = await pixel(t, 272, 5 * 32 + 3), shO = await pixel(o, 272, 5 * 32 + 3);
  ok(shT[1] < shO[1] - 8, `há sombra no chão ao sul da parede (verde ${shT[1]} contra ${shO[1]} sem sombra)`);

  // ração e osso INTEIROS: o item é posto ao norte de uma parede (a parede da linha 4, coluna 10) e em chão aberto (linha 2), no ponto mais baixo e no mais alto do balanço; o mesmo
  // desenho tem de ter os MESMOS pixels de cor própria nos dois lugares (se a parede cortasse ou cobrisse o item, faltariam pixels junto da parede). Escala 1: contagem exata.
  await startOrig(t); await startClock(t);
  await t.evaluate(() => { __game.freezeVets = true; });
  const BODY = { ration: ["r > 215 && g < 110 && b < 95", false, null, 8], gold: ["r > 235 && g > 195 && g < 225 && b < 110", true, "gold", 10.5], plain: ["r > 235 && g > 230 && b > 205", true, "scare", 10.5] }; // [cor do corpo, osso?, tipo, quanto o corpo desce abaixo do centro]
  const measure = (pg, c, r, spec, low, ext) => pg.evaluate(([c, r, [pred, bone, kind], low, ext]) => { // (ext = null: o jogo desenha sozinho; ext = número: o teste aplica à mão a regra «o corpo não passa de 32 − 6 = 26 px do quadrado», para ter o desenho esperado em chão aberto)
    const it = Object.assign({}, __game.items[0], { x: c * 32 + 8, y: r * 32 + 8, taken: false, bone, kind });
    __game.items.length = 0; __game.items.push(it);
    let n = 0; while (n++ < 900 && (low ? Math.sin(__game.time * 4 + it.x) < 0.995 : Math.sin(__game.time * 4 + it.x) > -0.995)) __game.tick(1 / 60);
    const bob = Math.sin(__game.time * 4 + it.x) * 2;
    if (ext !== null) it.y -= Math.max(0, 16 + bob + ext - 26);
    const p = __game.player; p.x = 40; p.y = 70; __game.drawNow();
    const f = new Function("r", "g", "b", "return " + pred), v = __game.view, sx = v.k * v.zoom, cv = document.getElementById("game").getContext("2d");
    const hw = 24, x0 = Math.round((c * 32 + 16 - hw - v.camX) * sx), y0 = Math.round((r * 32 + 16 - hw - v.camY) * sx), w = Math.round(2 * hw * sx), d = cv.getImageData(x0, y0, w, w).data;
    let k = 0; for (let i = 0; i < d.length; i += 4) if (f(d[i], d[i + 1], d[i + 2])) k++;
    return { k, found: n < 900, bob, scale: sx };
  }, [c, r, spec, low, ext]);
  let itemsOk = 0, itemsTried = 0, lines = [];
  for (const [name, spec] of Object.entries(BODY)) for (const low of [true, false]) {
    const near = await measure(t, 10, 3, spec, low, null), open = await measure(t, 10, 2, spec, low, spec[3]);
    itemsTried++;
    // (em `near` o jogo é que levanta o desenho; em `open` o jogo não levanta nada, sem parede embaixo, e o teste aplica a regra à mão)
    if (near.found && open.found && near.scale === 1 && near.k === open.k && near.k > 60) itemsOk++; else lines.push(`${name} ${low ? "baixo" : "alto"}: junto da parede ${near.k} px, em chão aberto ${open.k} px (tempo achado ${near.found}/${open.found}, escala ${near.scale})`);
  }
  ok(itemsOk === itemsTried, `ração, osso comum e osso dourado aparecem inteiros colados ao sul de uma parede, no ponto mais baixo e no mais alto do balanço: ${itemsOk} de ${itemsTried} casos têm exatamente os mesmos pixels que em chão aberto${lines.length ? " — " + lines.join("; ") : ""}`);
  // quem encosta numa parede pelo norte fica ATRÁS do topo dela: o cachorrinho e o agente, com os pés na linha da parede (y = 4 × 32), não pintam nada por cima do topo
  await startOrig(t); await startClock(t);
  for (const who of ["o cachorrinho", "o agente"]) {
    const behind = await t.evaluate((dog) => {
      __game.freezeVets = true; __game.items.length = 0;
      const v = __game.view, sx = v.k * v.zoom, c = document.getElementById("game").getContext("2d"), p = __game.player, vet = __game.vets[0];
      const read = () => { const d = c.getImageData(Math.round((9 * 32 - v.camX) * sx), Math.round((4 * 32 - 5 - v.camY) * sx), Math.round(14 * sx), 4).data; return Array.from(d).join(","); }; // os 4 pixels de cima do topo da parede, onde ficam os pés
      const put = (feetY) => { if (dog) { p.x = 9 * 32 - 4; p.y = feetY - p.h; vet.cx = 20 * 32; vet.cy = 2 * 32; } else { vet.cx = 9 * 32 + 8; vet.cy = feetY - 12; p.x = 20 * 32; p.y = 2 * 32; } __game.drawNow(); };
      put(4 * 32); const touching = read(); put(2 * 32); const away = read();
      return touching === away;
    }, who === "o cachorrinho");
    ok(behind, `${who} encostado no norte da parede fica atrás do topo dela (os pixels do topo são os mesmos com e sem ele ali)`);
  }

  // ---------- 4) vitória, derrota, pausa e jogar de novo ----------
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
  ok((await t.evaluate(() => __game.state)) === "playing" && (await t.evaluate(() => __game.level)) === 1, "«Tentar novamente» recomeça a mesma fase");
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
  ok(vw.zoom > 1 && Math.abs(vw.camY + 6) < 1.5, `no celular a tela aproxima (zoom ${vw.zoom.toFixed(2)}) e no canto de cima a câmera sobe até 6 px acima do mapa (camY ${vw.camY.toFixed(1)}, arredondado ao pixel do aparelho)`);
  const topPx = await m.evaluate(() => { const c = document.getElementById("game"), d = c.getContext("2d").getImageData(Math.round(c.width / 2), 2, 1, 1).data; return [d[0], d[1], d[2]]; });
  ok(lum(topPx) > 80, `a primeira linha de pixels do campo é o topo da parede (luminosidade ${lum(topPx).toFixed(0)}), não o fundo escuro`);

  ok(outside.length === 0, `o teste só pede arquivos ao próprio servidor, sem falar com a internet${outside.length ? ": " + outside.join(" | ") : ""}`);
  ok(errs.length === 0, `nenhum erro de JavaScript em nenhuma das páginas${errs.length ? ": " + errs.join(" | ") : ""}`);
  await browser.close(); server.close();
  console.log(`\n${total - failed} de ${total} verificações ok${process.env.BROWSER ? " (" + process.env.BROWSER + ")" : " (chromium)"}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
