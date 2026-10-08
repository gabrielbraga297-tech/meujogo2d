// Teste de ponta a ponta no navegador (Chromium headless).
// Uso: npm i playwright && node tests/e2e.js   (CHROMIUM_PATH opcional)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const URL = "file://" + path.join(root, "index.html");
const src = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const mapOf = (n) => eval(src.match(new RegExp(`const MAP_${n} = (\\[[\\s\\S]*?\\]);`))[1]);
const R = 18, C = 25;

// Ferramentas de um mapa: chão livre, posições de um caractere, caminho mais curto e distâncias a partir de um tile.
function grid(MAP) {
  const R = MAP.length, C = MAP[0].length;
  const free = (c, r) => MAP[r][c] !== "#" && MAP[r][c] !== "X";
  const find = (ch) => MAP.flatMap((row, r) => [...row].map((x, c) => (x === ch ? [c, r] : null)).filter(Boolean));
  function bfs(from, to) {
    const key = (c, r) => r * C + c, prev = new Map([[key(...from), null]]), q = [from];
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i];
      if (to && c === to[0] && r === to[1]) break;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R || !free(nc, nr) || prev.has(key(nc, nr))) continue;
        prev.set(key(nc, nr), [c, r]); q.push([nc, nr]);
      }
    }
    if (!to) return { prev, key, q };
    if (!prev.has(key(...to))) return null;
    const out = []; for (let cur = to; cur; cur = prev.get(key(...cur))) out.unshift(cur);
    return out;
  }
  // distância (em passos) de `from` até todos os tiles alcançáveis
  function distances(from) {
    const d = new Map([[from + "", 0]]), q = [from];
    for (let i = 0; i < q.length; i++) {
      const cur = q[i], [c, r] = cur;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= C || nr >= R || !free(nc, nr) || d.has([nc, nr] + "")) continue;
        d.set([nc, nr] + "", d.get(cur + "") + 1); q.push([nc, nr]);
      }
    }
    return d;
  }
  return { MAP, free, find, bfs, distances };
}
const G1 = grid(mapOf(1)), G2 = grid(mapOf(2)), G3 = grid(mapOf(3)), G4 = grid(mapOf(4)), G5 = grid(mapOf(5));
const { MAP, free, find, bfs, distances } = G1; // as seções antigas usam a Fase 1

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); if (!cond) failed++; };
const only = process.argv[2]; // opcional: roda só as seções cujo título contém este texto
let sectionsRun = 0;
async function section(title, fn) {
  if (only && !title.includes(only)) return;
  sectionsRun++;
  try { await fn(); } catch (e) { failed++; console.log(`FAIL (erro em "${title}"): ${String(e.message).split("\n")[0]}`); }
}

// Roda dentro da página: simula teclado + tempo de forma síncrona e determinística.
const PAGE_HELPERS = () => {
  if (window.__game) { __game.allBlocks = true; __game.autoStart = true; } // os testes jogam com TODAS as peças móveis (o sorteio da quantidade tem testes próprios) e com o relógio contando desde o início (a espera pelo primeiro passo tem testes próprios)
  const press = (k, on, code = "") => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code }));
  window.__t = {
    press,
    hold(k, frames, dt = 1 / 60, code = "") { press(k, true, code); for (let i = 0; i < frames; i++) __game.tick(dt); press(k, false, code); },
    run(frames, dt = 1 / 60) { for (let i = 0; i < frames; i++) __game.tick(dt); },
    walk(path) {
      for (const [c, r] of path) {
        const tx = c * 32 + 16, ty = r * 32 + 16;
        for (let i = 0; i < 600; i++) {
          if (__game.state !== "playing") return;
          const p = __game.player, dx = tx - (p.x + 12), dy = ty - (p.y + 12);
          if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) break;
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
  const errs = [];
  const watch = (page) => {
    page.on("pageerror", (e) => errs.push(e.message));
    page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
  };
  async function newPage(opts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...opts });
    const page = await ctx.newPage();
    watch(page);
    // o jogo salva ao sair da página; entre cenários o save é descartado, exceto quando o teste pede para manter
    await page.addInitScript(() => { try { if (!sessionStorage.getItem("keepSave")) localStorage.removeItem("cachorrinho.save.v1"); } catch { /* sem storage */ } });
    return page;
  }
  // Abre o jogo limpo, com (ou sem) nome salvo e recordes de outros jogadores já existentes.
  async function fresh(page, { name = "Totó", keepSave = false, runs = [], query = "", done = [] } = {}) {
    await page.goto(URL + query);
    await page.evaluate(([name, keep, runs, done]) => {
      sessionStorage.setItem("keepSave", keep ? "1" : "");
      localStorage.clear();
      const st = Records.createStore(localStorage);
      for (const r of runs) { st.setPlayer(r.name); st.addRun({ level: r.level || 1, timeMs: r.timeMs, points: r.points ?? 500 + Records.timeBonus(r.timeMs) }); }
      if (name) { st.setPlayer(name); for (const l of done) st.completeLevel(name, l); } // `done`: fases já concluídas (libera as seguintes)
    }, [name, keepSave, runs, done]);
    await page.reload();
    await page.evaluate(PAGE_HELPERS);
  }
  const play = async (page, opts) => { await fresh(page, opts); await page.click("#btn-start"); };
  // começa direto numa fase (sem passar pelo menu), com as vidas e tentativas pedidas
  const playLevel = async (page, id, opts, o) => { await fresh(page, opts); await page.evaluate(([id, o]) => __game.start(id, o), [id, o]); };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const tileOfPlayer = (page) => ev(page, () => [Math.floor((__game.player.x + 12) / 32), Math.floor((__game.player.y + 12) / 32)]);
  // o placar é atualizado no próximo quadro de animação: espera o valor esperado em vez de ler na hora
  const hudIs = (page, sel, text) => page.waitForFunction(([sel, text]) => document.querySelector(sel).textContent === text, [sel, text], { timeout: 2000 }).then(() => true, () => false);
  const lostHearts = (page, n) => page.waitForFunction((n) => document.querySelectorAll("#hud-lives .heart.lost").length === n, n, { timeout: 2000 }).then(() => true, () => false);
  const itemTiles = (page) => ev(page, () => __game.items.map((i) => [(i.x - 8) / 32, (i.y - 8) / 32, i.taken]));
  // joga `seconds` s de relógio (sem veterinários) e termina a fase teletransportando o cachorro para as rações e depois para a saída
  const finishNow = (page, seconds = 10) => ev(page, (n) => {
    __game.freezeVets = true;
    for (let i = 0; i < n; i++) __game.tick(0.05);
    for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
    const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01);
  }, Math.round(seconds / 0.05));
  // o veterinário `i` encosta no cachorro (perde 1 vida, se não estiver protegido); espera a proteção passar antes
  const catchOnce = (page, i = 0) => ev(page, (i) => {
    for (const v of __game.vets) v.cool = 99; // sem perseguição por conta própria
    for (let k = 0; k < 45; k++) __game.tick(0.05); // passa a proteção
    const v = __game.vets[i], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01);
    return [__game.lives, __game.state];
  }, i);

  const page = await newPage();
  const dogStart = find("P")[0], exit = find("E")[0], vetStarts = find("V");

  // =====================================================================
  await section("mapa", async () => {
    ok(find("I").length === 0, "o mapa não tem rações fixas (elas são sorteadas)");
    ok(vetStarts.length === 1, "Fase 1 tem exatamente 1 veterinário");
    const d = distances(dogStart);
    ok(d.size > 250 && [...find("E"), ...vetStarts].every((t) => d.has(t + "")), "todo o chão é alcançável a partir do cachorro, incluindo saída e veterinário");

    // Fase 2: mapa próprio, 2 veterinários no centro
    const m1 = G1.MAP.join("\n"), m2 = G2.MAP.join("\n");
    ok(m1 !== m2, "o mapa da Fase 2 é diferente do da Fase 1");
    const diff = G1.MAP.reduce((n, row, r) => n + [...row].filter((ch, c) => ch !== G2.MAP[r][c]).length, 0);
    ok(diff > 80, `os mapas são bem diferentes (${diff} tiles distintos)`);
    const v2 = G2.find("V"), p2 = G2.find("P")[0], e2 = G2.find("E");
    ok(v2.length === 2, "Fase 2 tem exatamente 2 veterinários");
    ok(v2.every(([c, r]) => Math.abs(c - 12) <= 2 && Math.abs(r - 8.5) <= 1.5), `os 2 veterinários começam no centro do mapa (${v2.join(" e ")})`);
    const d2 = G2.distances(p2);
    ok([...e2, ...v2].every((t) => d2.has(t + "")), "Fase 2: saída e veterinários são alcançáveis a partir do cachorro");
    let floor2 = 0; for (let r = 0; r < 18; r++) for (let c = 0; c < 25; c++) if (G2.free(c, r)) floor2++;
    ok(d2.size === floor2, `Fase 2: todo o chão é conectado (${d2.size}/${floor2} tiles), sem cantos presos`);
    ok(G2.find("I").length === 0 && G2.MAP.length === 18 && G2.MAP.every((row) => row.length === 25), "Fase 2: mapa 25x18 sem rações fixas");
    const edge = [...G2.MAP[0], ...G2.MAP[17], ...G2.MAP.map((r) => r[0]), ...G2.MAP.map((r) => r[24])];
    ok(edge.every((ch) => ch === "#"), "Fase 2: cercada por paredes");
    const gl = await (async () => { await fresh(page); return ev(page, () => __game.levels.map((l) => ({ id: l.id, maps: l.map.join("\n"), vets: l.vets.length }))); })();
    ok(gl.length === 10 && gl.slice(5).map((l) => l.vets).join() === "3,4,5,5,6" && gl[0].maps === m1 && gl[1].maps === m2 && gl[2].maps === G3.MAP.join("\n") && gl[3].maps === G4.MAP.join("\n") && gl[4].maps === G5.MAP.join("\n") && gl[0].vets === 1 && gl[1].vets === 2 && gl[2].vets === 2 && gl[3].vets === 3 && gl[4].vets === 3, "o jogo carrega as dez fases, as cinco primeiras com os mapas e veterinários esperados, e as Fases 6 a 10 com 3, 4, 5, 5 e 6 veterinários");
  });

  // =====================================================================
  await section("menu inicial", async () => {
    await fresh(page, { name: "" });
    ok(await ev(page, () => __game.state) === "menu", "começa no menu");
    const labels = await page.$$eval("#menu .menu-list button", (bs) => bs.filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
    ok(["Iniciar jogo", "Como jogar", "Pontuações", "Escolher nome de usuário"].every((l) => labels.includes(l)), `menu tem as 4 opções (${labels.join(" | ")})`);
    ok(await ev(page, () => document.activeElement.id) === "btn-start", "botão Iniciar jogo já vem focado");
    ok(await page.isHidden("#btn-continue"), "sem jogo salvo, não há botão Continuar");
    const credit = await page.evaluate(() => {
      const e = document.querySelector("#menu .credit"), r = e.getBoundingClientRect(), fs = parseFloat(getComputedStyle(e.querySelector("strong")).fontSize);
      return { text: e.textContent, right: innerWidth - r.right, bottom: innerHeight - r.bottom, fs, rect: r.toJSON() };
    });
    ok(credit.text.includes("GABRIEL BRAGA CAVALCANTE DE FRANÇA COSTA"), "nome do criador aparece no menu");
    ok(credit.right < 40 && credit.bottom < 40, `nome do criador no canto inferior direito (folga ${credit.right.toFixed(0)}px / ${credit.bottom.toFixed(0)}px)`);
    ok(credit.fs >= 14, `nome do criador em fonte legível (${credit.fs}px)`);

    // versão do jogo no menu (canto inferior esquerdo, do lado do crédito)
    const ver = await page.evaluate(() => {
      const e = document.getElementById("menu-version"), r = e.getBoundingClientRect(), c = document.querySelector("#menu .credit").getBoundingClientRect(), v = window.GAME_VERSION;
      return { text: e.textContent, left: r.left, bottom: innerHeight - r.bottom, creditLeft: c.left, visible: r.width > 0 && r.height > 0, v, fs: parseFloat(getComputedStyle(e).fontSize) };
    });
    const [yy, mm, dd] = ver.v.date.split("-");
    const stageTxt = ver.v.stage ? ` (${ver.v.stage})` : "";
    ok(ver.visible && ver.text === `Versão ${ver.v.number}${stageTxt} · ${dd}/${mm}/${yy}`, `o menu mostra a versão do jogo (${ver.text})`);
    ok(/^\d+\.\d+\.\d+$/.test(ver.v.number) && ver.v.build === "dev", "a versão vem de js/version.js (no código o build é 'dev' e não aparece)");
    ok(ver.left < 40 && ver.bottom < 40 && ver.left < ver.creditLeft && ver.fs >= 13, `versão no canto inferior esquerdo, legível (${ver.fs}px), sem tapar o crédito`);
    await page.evaluate(() => { window.GAME_VERSION = { number: "9.8.7", date: "2030-01-02", build: "abc1234" }; });
    await page.click("#btn-howto"); await page.click("#btn-howto-back");
    ok(await page.textContent("#menu-version") === "Versão 9.8.7 · 02/01/2030 · build abc1234", "publicado no GitHub Pages, a versão mostra também o código do commit (build)");
    await page.evaluate(() => { window.GAME_VERSION = { number: "9.8.7", stage: "em preparação", date: "2030-01-02", build: "abc1234" }; });
    await page.click("#btn-howto"); await page.click("#btn-howto-back");
    ok(await page.textContent("#menu-version") === "Versão 9.8.7 (em preparação) · 02/01/2030 · build abc1234", "enquanto a versão recebe itens, o menu diz que ela está em preparação");
    await page.evaluate(() => { window.GAME_VERSION = undefined; });
    await page.click("#btn-howto"); await page.click("#btn-howto-back");
    ok(await page.textContent("#menu-version") === "Versão desconhecida", "sem js/version.js o menu não quebra");
    await fresh(page, { name: "" });

    await page.click("#btn-howto");
    const how = await page.textContent("#howto");
    ok(/3 vidas/.test(how) && /celular|tablet/i.test(how) && /Salvar/.test(how) && /disquete/.test(how), "Como jogar explica vidas, toque e salvamento (inclusive o botão de salvar)");
    ok(/bônus de tempo/i.test(how) && /diminui a cada 10 segundos/.test(how) && /até chegar a 0/.test(how) && /maior/.test(how) && /não soma/.test(how) && /Fases diferentes se somam/.test(how), "Como jogar explica o bônus de tempo (diminui a cada 10 s), que vale a maior pontuação da fase e que fases diferentes somam");
    ok(/desconta pontos/.test(how) && /negativa/.test(how) && /mudam de lugar/.test(how) && /1 a 5/.test(how) && /passam para a fase seguinte/.test(how), "Como jogar explica o desconto por vida perdida, pontuação negativa, rações que mudam de lugar e vidas de 1 a 5 que passam de fase");
    ok(/3 novas tentativas/.test(how) && /Cada nova tentativa custa 100 pontos/.test(how) && /do zero/.test(how), "Como jogar explica as 3 novas tentativas (do zero, cada uma custa 100 pontos)");
    ok(!/Fase 2:|Fase 3:|Fase 1 e/.test(how) && !/20 pontos a cada 10 segundos|2 veterinários|blocos deslizam|10% mais/.test(how), "Como jogar não traz as instruções detalhadas de cada fase (só o básico)");
    ok(["Objetivo:", "Mover:", "Cuidado com o veterinário!", "Vidas:", "Sem vidas?", "Pontuação:", "Salvar:", "Pausar:", "Teclado:", "Controle (gamepad):", "Pontuações:", "Conta (opcional):"].every((h) => how.includes(h)), "Como jogar mantém o básico: objetivo, mover, veterinário, vidas, sem vidas, pontuação, salvar, pausar, teclado, controle, pontuações e conta");
    ok(/Suas pontuações/.test(how) && /só você vê/.test(how) && /ranking do jogo/i.test(how) && /para todos/.test(how), "Como jogar explica a pontuação individual (só você) e o ranking do jogo (todos)");
    ok(/Menu inicial/.test(await page.textContent("#menu-title")), "o menu inicial se chama Menu inicial");
    await page.click("#btn-howto-back");
    ok(await page.isVisible("#menu"), "Voltar retorna ao menu");

    await page.click("#btn-scores");
    ok(await page.isVisible("#scores") && /Fase 1/.test(await page.textContent("#scores")), "tela de Pontuações abre");
    await page.keyboard.press("Escape");
    ok(await page.isVisible("#menu"), "Esc volta ao menu");
  });

  // =====================================================================
  await section("nome de usuário", async () => {
    await fresh(page, { name: "" });
    await page.click("#btn-name");
    const txt = await page.textContent("#name");
    ok(/nome de um cachorrinho/i.test(txt) && txt.includes("Totó"), "instrução diz que o nome pode ser de um cachorrinho (ex.: Totó)");
    await page.fill("#name-input", "   ");
    await page.click("#name button[type=submit]");
    ok((await page.textContent("#name-error")).length > 0 && await page.isVisible("#name"), "nome vazio mostra erro e não salva");
    await page.fill("#name-input", "<b>Totó</b>");
    await page.press("#name-input", "Enter");
    ok(await page.isVisible("#menu") && await page.textContent("#menu-player") === "bTotób", "nome é limpo de símbolos e salvo (Enter envia)");
    await page.click("#btn-name");
    await page.fill("#name-input", "Totó");
    await page.click("#name button[type=submit]");
    ok(await page.textContent("#menu-player") === "Totó", "nome salvo aparece no menu");
    await page.reload();
    ok(await page.textContent("#menu-player") === "Totó", "nome continua salvo depois de recarregar a página");
    await page.click("#btn-name");
    ok(await page.isVisible("#name-chips button"), "nomes usados antes aparecem como atalhos");
    await page.keyboard.press("Escape");
    await ev(page, () => Records.createStore(localStorage).setPlayer("Rex"));
    await page.reload();
    await page.click("#btn-name");
    await page.click("#name-chips button:text-is('Totó')");
    ok(await page.textContent("#menu-player") === "Totó", "atalho de nome troca de jogador");

    await fresh(page, { name: "" });
    await page.click("#btn-start");
    ok(await page.isVisible("#name") && await page.isVisible("#name-why"), "Iniciar jogo sem nome pede o nome antes");
    await page.fill("#name-input", "Totó");
    await page.click("#name button[type=submit]");
    ok(await ev(page, () => __game.state) === "playing", "depois de salvar o nome o jogo começa");
  });

  // =====================================================================
  await section("rações em lugares aleatórios (Fase 1: 5 e 1 vida extra; Fase 2: 7 e 1 ou 2 vidas extras)", async () => {
    const info = [
      { id: 1, g: G1, count: 5, lifeMin: 1, lifeMax: 1 },
      { id: 2, g: G2, count: 9, lifeMin: 1, lifeMax: 2 }, // 7 rações + 2 ossos
    ];
    for (const { id, g, count, lifeMin, lifeMax } of info) {
      await playLevel(page, id);
      const layouts = await ev(page, () => { const out = []; for (let i = 0; i < 80; i++) { __game.start(); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32])); } return out; });
      const start = g.find("P")[0], d = g.distances(start), vs = g.find("V"), ex = new Set(g.find("E").map(String));
      let bad = "";
      for (const L of layouts) {
        if (L.length !== count) bad = "quantidade";
        if (new Set(L.map(String)).size !== count) bad = "tiles repetidos";
        for (const [c, r] of L) {
          if (!g.free(c, r)) bad = "em parede/caixa";
          if (ex.has([c, r] + "")) bad = "na saída";
          if (!d.has([c, r] + "")) bad = "inalcançável";
          else if (d.get([c, r] + "") < 4) bad = "perto demais do início";
          if (vs.some((v) => Math.hypot(c - v[0], r - v[1]) < 4)) bad = "perto demais de um veterinário";
        }
      }
      ok(!bad, `Fase ${id}: 80 sorteios: sempre ${count} itens (rações e ossos) em chão livre, alcançável e longe de início/veterinários/saída ${bad && "(" + bad + ")"}`);
      const distinct = new Set(layouts.map((L) => L.map(String).sort().join("|"))).size;
      ok(distinct >= 70, `Fase ${id}: os lugares mudam a cada jogo (${distinct} disposições diferentes em 80)`);
      const lifeCounts = await ev(page, () => { const out = []; for (let i = 0; i < 200; i++) { __game.start(); const f = __game.items.map((it) => it.life); out.push([f.filter(Boolean).length, f.indexOf(true)]); } return out; });
      const seen = new Set(lifeCounts.map((c) => c[0]));
      ok(lifeCounts.every((c) => c[0] >= lifeMin && c[0] <= lifeMax), `Fase ${id}: sempre entre ${lifeMin} e ${lifeMax} rações com vida extra`);
      ok(lifeMin === lifeMax ? seen.size === 1 : (seen.has(1) && seen.has(2)), lifeMin === lifeMax ? `Fase ${id}: exatamente ${lifeMin} vida extra em todo jogo` : `Fase ${id}: o sorteio dá 1 vida extra em alguns jogos e 2 em outros (não é sempre 1 nem sempre 2)`);
      ok(new Set(lifeCounts.map((c) => c[1])).size >= 3, `Fase ${id}: a ração com a vida extra muda de uma para outra a cada jogo`);
      const spread = layouts.filter((L) => { let m = 99; for (const a of L) for (const b of L) if (a !== b) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return m >= 2; }).length;
      ok(spread === 80, `Fase ${id}: rações sempre espalhadas (nunca coladas umas nas outras)`);
      const a = JSON.stringify(await itemTiles(page));
      await ev(page, () => __game.start());
      ok(JSON.stringify(await itemTiles(page)) !== a, `Fase ${id}: reiniciar a partida muda o lugar das rações`);
    }
    // controlando o sorteio: o valor baixo dá o mínimo e o alto dá o máximo de vidas extras da Fase 2
    await playLevel(page, 2);
    const forced = await ev(page, () => { const out = []; for (const v of [0, 0.99]) { __game.setRand(() => v); __game.start(2); out.push(__game.items.filter((i) => i.life).length); } __game.setRand(null); return out; });
    ok(forced.join() === "1,2", "Fase 2: o sorteio vai de 1 a 2 vidas extras (extremos 1 e 2)");
  });

  // =====================================================================
  await section("movimento e paredes", async () => {
    await play(page); await ev(page, () => { __game.freezeVets = true; });
    ok(await ev(page, () => __game.state) === "playing", "Iniciar jogo começa a partida");
    let x0 = await ev(page, () => __game.player.x);
    await ev(page, () => __t.hold("d", 20)); ok(await ev(page, () => __game.player.x) > x0 + 30, "D move para a direita");
    x0 = await ev(page, () => __game.player.x);
    await ev(page, () => __t.hold("ArrowLeft", 10)); ok(await ev(page, () => __game.player.x) < x0 - 15, "seta esquerda move");
    x0 = await ev(page, () => __game.player.x);
    await ev(page, () => __t.hold("q", 10, 1 / 60, "KeyA")); ok(await ev(page, () => __game.player.x) < x0 - 15, "tecla física A (letra Q no AZERTY) move para a esquerda: vale a posição da tecla");
    await ev(page, () => __t.hold("w", 120)); ok(await ev(page, () => __game.player.y) >= 32, "parede superior bloqueia");
    await ev(page, () => __t.hold("a", 200)); ok(await ev(page, () => __game.player.x) >= 32, "parede esquerda bloqueia");
  });

  // =====================================================================
  await section("coleta, saída, vitória e recorde por tempo", async () => {
    await play(page, { runs: [{ name: "Rex", timeMs: 999999 }] });
    await ev(page, () => { __game.freezeVets = true; });
    const cur = () => tileOfPlayer(page);
    await ev(page, (p) => __t.walk(p), bfs(await cur(), exit));
    ok(await ev(page, () => __game.state) === "playing", "saída sem as 5 rações não vence");
    for (let guard = 0; guard < 8; guard++) { // vai sempre à ração mais próxima; curvas em diagonal podem pegar uma vizinha no caminho
      const left = (await itemTiles(page)).filter((i) => !i[2]).map((i) => [i[0], i[1]]);
      if (!left.length) break;
      const here = await cur(), before = await ev(page, () => __game.collected);
      left.sort((a, b) => bfs(here, a).length - bfs(here, b).length);
      await ev(page, (p) => __t.walk(p), bfs(here, left[0]));
      const got = await ev(page, () => [__game.collected, __game.score]);
      ok(got[0] > before && got[1] === got[0] * 100, `ração coletada: contador ${got[0]}/5 e ${got[1]} pontos (100 por ração)`);
      ok(await hudIs(page, "#hud-items", `${got[0]}/5`), `placar mostra RAÇÕES ${got[0]}/5`);
    }
    ok(await ev(page, () => __game.collected) === 5, "as 5 rações foram coletadas");
    await ev(page, (p) => __t.walk(p), bfs(await cur(), exit));
    ok(await ev(page, () => __game.state) === "won" && await page.isVisible("#win"), "vitória ao chegar na saída com 5 rações");
    const winText = await page.textContent("#win-breakdown"), winPts = Number(await page.textContent("#win-points"));
    const m = winText.match(/Rações: (\d+) \+ bônus de tempo: (\d+) · tempo: ([\d,]+) s/);
    ok(!!m, `tela de vitória detalha rações, bônus de tempo e tempo (${winText})`);
    const shownMs = Math.round(parseFloat(m[3].replace(",", ".")) * 1000);
    const expectBonus = await ev(page, (ms) => Records.timeBonus(ms), shownMs);
    ok(Number(m[1]) === 500 && Number(m[2]) === expectBonus && winPts === 500 + expectBonus, `pontuação da fase = 500 + bônus de tempo (${winPts} = 500 + ${expectBonus} para ${m[3]} s)`);
    ok(/Primeira pontuação/.test(await page.textContent("#win-personal")), "primeira pontuação do jogador é registrada");
    const rec = await ev(page, () => { const s = Records.createStore(localStorage); return { pb: s.personalBest("Totó", 1), gb: s.generalBest(1), prog: s.progress("Totó"), total: s.totalScore("Totó") }; });
    ok(rec.pb && rec.pb.p === winPts && Math.abs(rec.pb.t - shownMs) < 1, "pontuação e tempo guardados conferem com os mostrados");
    ok(rec.gb.n === "Totó" && /Novo recorde deste aparelho/.test(await page.textContent("#win-general")), "superou o outro jogador: novo recorde do aparelho");
    ok(rec.total === winPts && (await page.textContent("#win-total")).includes(`Pontuação total: ${winPts}`), "pontuação total = pontuação da fase");
    ok(rec.prog.completed.includes(1) && rec.prog.unlocked === 2, "progresso: Fase 1 concluída e próxima fase liberada");
    ok(await ev(page, () => !Records.createStore(localStorage).hasGame("Totó")), "terminar a fase apaga o jogo em andamento");
    ok(await page.isVisible("#btn-next") && /Próxima fase \(Fase 2\)/.test(await page.textContent("#btn-next")) && await ev(page, () => document.activeElement.id) === "btn-next", "a vitória oferece Próxima fase (Fase 2) já focada");
    await page.click("#btn-win-scores");
    const sc = await page.textContent("#scores");
    ok(/Suas pontuações/.test(sc) && /Ranking do jogo/.test(sc) && /Ranking geral/.test(sc) && /Ranking da Fase 1/.test(sc) && /Fase 2/.test(sc) && !/histórico/i.test(sc) && /pontos/.test(sc), "Pontuações mostra as suas pontuações e o ranking do jogo, sem histórico de partidas");
    await page.keyboard.press("Escape");
    ok(await page.isVisible("#win") && await page.isVisible("#btn-next"), "Esc nas Pontuações abertas da vitória volta para a vitória (com o botão Próxima fase)");
    await page.click("#btn-win-menu");
    await page.click("#btn-start");
    ok(await page.isVisible("#levels") && await page.isEnabled("#levels-list button:nth-child(2)"), "com a Fase 2 liberada, Iniciar jogo deixa escolher a fase");
    await page.click("#levels-list button:nth-child(1)");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.level) === 1 && await ev(page, () => __game.collected) === 0 && await ev(page, () => __game.lives) === 3, "escolher a Fase 1 depois da vitória começa do zero com 3 vidas");
  });

  // =====================================================================
  await section("pontuação: maior vale na mesma fase, fases diferentes somam, bônus de tempo", async () => {
    // Rex: 600 pontos (20 s). Totó já tem 590 (25 s).
    await play(page, { runs: [{ name: "Rex", timeMs: 20000 }, { name: "Totó", timeMs: 25000 }] });
    await ev(page, () => { __game.freezeVets = true; });
    const finishAfter = async (seconds) => { // joga `seconds` s de relógio e termina a fase teletransportando para as rações e para a saída
      await ev(page, (n) => { for (let i = 0; i < n; i++) __game.tick(0.05); for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); }, Math.round(seconds / 0.05));
    };
    const store = () => ev(page, () => { const s = Records.createStore(localStorage); return { pb: s.personalBest("Totó", 1), gb: s.generalBest(1), total: s.totalScore("Totó"), rows: s.ranking(1, 50).filter((r) => r.n === "Totó").length, history: typeof s.history }; });

    // 1) partida mais lenta (~45 s => bônus 70 => 570): não derruba a melhor (590) e não soma
    await finishAfter(45);
    ok(await ev(page, () => __game.state) === "won", "fase concluída");
    ok(await page.textContent("#win-points") === "570" && /bônus de tempo: 70/.test(await page.textContent("#win-breakdown")), "45 s dão bônus 70: pontuação da fase 570");
    ok(/continua 590/.test(await page.textContent("#win-personal")) && /não soma/.test(await page.textContent("#win-personal")), "mensagem: a melhor pontuação continua 590 e partidas da mesma fase não somam");
    ok(/Recorde deste aparelho: 600 pontos \(Rex\)/.test(await page.textContent("#win-general")), "mostra o recorde do aparelho, de outro jogador");
    let st = await store();
    ok(st.pb.p === 590 && st.total === 590 && st.rows === 1 && st.history === "undefined", "guardado: melhor continua 590, total 590 (não 1160), uma só linha por jogador e nenhum histórico de partidas");
    ok((await page.textContent("#win-total")).trim() === "Pontuação total: 590", "tela mostra Pontuação total: 590 (sem acréscimo)");
    await page.click("#btn-win-menu");
    ok((await page.textContent("#menu-best")).includes("Suas melhores: Fase 1 590") && (await page.textContent("#menu-progress")).includes("Pontuação total: 590"), "menu mostra a melhor pontuação e a total");

    // 2) partida rápida (~6 s => bônus 100 => 600): empata com o recorde geral, mas é mais rápida
    await ev(page, () => __game.start(1)); await ev(page, () => { __game.freezeVets = true; });
    await finishAfter(6);
    ok(await page.textContent("#win-points") === "600" && /bônus de tempo: 100/.test(await page.textContent("#win-breakdown")), "6 s dão bônus 100: pontuação da fase 600");
    ok(/Nova melhor pontuação da fase! Antes: 590/.test(await page.textContent("#win-personal")), "nova melhor pontuação pessoal (antes: 590)");
    ok(/Novo recorde deste aparelho/.test(await page.textContent("#win-general")), "600 em menos tempo supera o recorde do aparelho de Rex");
    ok((await page.textContent("#win-total")).trim() === "Pontuação total: 600 (+10)", "total passa de 590 para 600 (+10), não para 1190");
    st = await store();
    ok(st.pb.p === 600 && st.total === 600 && st.rows === 1 && st.gb.n === "Totó", "guardado: melhor 600, total 600, recorde geral de Totó");

    // 3) repetir 600 não soma
    await page.click("#btn-again"); await ev(page, () => { __game.freezeVets = true; });
    await finishAfter(8);
    ok(await page.textContent("#win-points") === "600", "outra partida de 600");
    st = await store();
    ok(st.total === 600 && st.rows === 1, "repetir 600 NÃO soma: total continua 600 (não 1200)");
    ok((await page.textContent("#win-total")).trim() === "Pontuação total: 600", "tela continua mostrando total 600");

    // 3b) duas vidas perdidas: −100 pontos (600 → 500) e não derruba a melhor
    await page.click("#btn-again"); await ev(page, () => { __game.freezeVets = true; });
    await ev(page, () => { for (let k = 0; k < 2; k++) { const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); for (let i = 0; i < 45; i++) __game.tick(0.05); } });
    await finishAfter(2);
    ok(await page.textContent("#win-points") === "500" && /bônus de tempo: 100 − vidas perdidas: 100/.test(await page.textContent("#win-breakdown")), "2 vidas perdidas descontam 100: 500 + 100 − 100 = 500");
    ok(/continua 600/.test(await page.textContent("#win-personal")) && (await store()).total === 600, "partida com perdas não derruba a melhor (600)");

    // 4) bônus de 90 (~25 s)
    await page.click("#btn-again"); await ev(page, () => { __game.freezeVets = true; });
    await finishAfter(25);
    ok(await page.textContent("#win-points") === "590" && /bônus de tempo: 90/.test(await page.textContent("#win-breakdown")), "25 s dão bônus 90: pontuação da fase 590");
    ok((await store()).total === 600, "590 não derruba a melhor de 600");

    // 5) bônus proporcional: de 0 a 100, 10 pontos a cada 10 s (quanto menos tempo, mais pontos)
    const table = await ev(page, () => [5, 20, 20.1, 30, 30.1, 40, 60, 80, 100, 110, 110.1, 120, 300].map((s) => Records.timeBonus(s * 1000)));
    ok(table.join() === "100,100,90,90,80,80,60,40,20,10,0,0,0", `bônus por tempo (5, 20, 20,1, 30, 30,1, 40, 60, 80, 100, 110, 110,1, 120, 300 s): ${table.join(" ")}`);
    ok(table.every((v, i) => i === 0 || v <= table[i - 1]) && Math.min(...table) === 0 && Math.max(...table) === 100, "o bônus nunca sobe com o tempo e fica entre 0 e 100");

    // 6) fases diferentes somam (dados de outra fase no mesmo navegador)
    await ev(page, () => { const s = Records.createStore(localStorage); s.setPlayer("Totó"); s.addRun({ level: 2, timeMs: 45000, points: 570 }); });
    const sums = await ev(page, () => { const s = Records.createStore(localStorage); return [s.totalScore("Totó"), s.totalScore("Totó", [1])]; });
    ok(sums[0] === 1170 && sums[1] === 600, "fases diferentes somam (600 + 570 = 1170); a Fase 1 sozinha continua 600");
  });

  // =====================================================================
  await section("bônus de tempo no placar", async () => {
    await play(page); await ev(page, () => { __game.freezeVets = true; });
    ok(await hudIs(page, "#hud-bonus", "+100"), "começa valendo +100 de bônus");
    await ev(page, () => { for (let i = 0; i < 420; i++) __game.tick(0.05); });
    ok(await hudIs(page, "#hud-bonus", "+90"), "depois de 21 s o bônus cai para +90");
    await ev(page, () => { for (let i = 0; i < 200; i++) __game.tick(0.05); });
    ok(await hudIs(page, "#hud-bonus", "+80"), "depois de 31 s cai para +80");
    await ev(page, () => { for (let i = 0; i < 2000; i++) __game.tick(0.05); });
    ok(await hudIs(page, "#hud-bonus", "+0"), "bônus nunca fica negativo (+0)");
  });

  // =====================================================================
  await section("vidas e corações", async () => {
    await play(page);
    const hud = await page.evaluate(() => {
      const hs = [...document.querySelectorAll("#hud-lives .heart")].filter((h) => !h.classList.contains("hidden")), pts = document.getElementById("hud-points").closest(".hud-item").getBoundingClientRect(),
        cv = document.getElementById("game").getBoundingClientRect(), hr = hs[0].getBoundingClientRect();
      return { n: hs.length, lost: hs.filter((h) => h.classList.contains("lost")).length, fill: getComputedStyle(hs[0]).fill,
        afterPoints: hr.left >= pts.right - 1, sameRow: Math.abs((hr.top + hr.bottom) / 2 - (pts.top + pts.bottom) / 2) < 14,
        aboveGame: document.getElementById("hud").getBoundingClientRect().bottom <= cv.top + 1, top: hr.top };
    });
    ok(hud.n === 3 && hud.lost === 0 && await ev(page, () => __game.lives) === 3, "começa com 3 vidas e 3 corações");
    ok(hud.fill === "rgb(229, 48, 60)", `os corações são vermelhos (${hud.fill})`);
    ok(hud.afterPoints && hud.sameRow && hud.aboveGame && hud.top < 120, "corações no canto superior, logo depois de PONTOS");

    await ev(page, () => { __game.freezeVets = true; const it = __game.items.find((i) => !i.life); __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); __game.freezeVets = false; });
    ok(await hudIs(page, "#hud-points", "100"), "PONTOS mostra 100 depois de uma ração");
    const catchNow = () => ev(page, () => { const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); return __game.lives; });
    const pre = await ev(page, () => ({ time: __game.time, items: __game.items.map((i) => [(i.x - 8) / 32, (i.y - 8) / 32, i.taken, i.life]) }));
    ok(await catchNow() === 2, "veterinário captura: perde 1 vida (3 → 2)");
    const post = await ev(page, () => ({ time: __game.time, items: __game.items.map((i) => [(i.x - 8) / 32, (i.y - 8) / 32, i.taken, i.life]) }));
    ok(post.time >= pre.time && post.time - pre.time < 0.6, `o tempo não zera ao perder a vida: continua contando (${pre.time.toFixed(2)} → ${post.time.toFixed(2)})`);
    ok(post.items.every((it, i) => it[2] === pre.items[i][2] && it[3] === pre.items[i][3]), "ao perder a vida, quem já foi pega continua pega e as rações com vida extra continuam sendo as mesmas");
    const stayed = post.items.filter((it, i) => it[2] && it[0] === pre.items[i][0] && it[1] === pre.items[i][1]).length;
    const moved = post.items.filter((it, i) => !it[2] && (it[0] !== pre.items[i][0] || it[1] !== pre.items[i][1])).length;
    const rest = post.items.filter((it) => !it[2]);
    ok(stayed === 1 && moved >= rest.length - 1 && moved >= 3, `ao perder a vida, as rações que faltavam mudam de lugar (${moved} de ${rest.length} em lugar novo)`);
    ok(rest.every(([c, r]) => free(c, r) && distances(dogStart).has([c, r] + "")) && new Set(rest.map(String)).size === rest.length, "as rações que mudaram de lugar ficam em chão livre, alcançável e sem se sobrepor");
    const afterLoss = await ev(page, () => { const p = __game.player, v = __game.vets[0]; return { x: p.x, y: p.y, invuln: __game.invuln, vx: v.cx, vy: v.cy, sx: v.sx, sy: v.sy, got: __game.collected }; });
    ok(afterLoss.x === dogStart[0] * 32 + 4 && afterLoss.y === dogStart[1] * 32 + 4, "cachorro volta ao início depois de perder a vida");
    ok(afterLoss.vx === afterLoss.sx && afterLoss.vy === afterLoss.sy, "veterinário volta ao seu posto");
    ok(afterLoss.invuln > 1.5 && afterLoss.got === 1, "fica protegido por uns segundos e mantém as rações coletadas");
    ok(await lostHearts(page, 1) && await page.getAttribute("#hud-lives", "aria-label") === "2 vidas", "um coração apaga (restam 2)");
    ok(await hudIs(page, "#hud-points", "50") && await ev(page, () => __game.livesLost) === 1, "perder a vida custa 50 pontos (100 → 50)");
    ok(/−50 pontos/.test(await page.textContent("#toast")), "aviso mostra −50 pontos");
    ok(await catchNow() === 2, "durante a proteção o veterinário não captura de novo");
    await ev(page, () => { for (let i = 0; i < 45; i++) __game.tick(0.05); });
    await ev(page, () => { __game.vets[0].cool = 99; });
    ok(await catchNow() === 1, "depois da proteção, nova captura (2 → 1)");
    await ev(page, () => { for (let i = 0; i < 45; i++) __game.tick(0.05); __game.vets[0].cool = 99; });
    await catchNow();
    ok(await ev(page, () => __game.state) === "lost" && await page.isVisible("#lose"), "sem vidas: fim de jogo");
    ok(await lostHearts(page, 3), "os 3 corações ficam apagados");
    const xl = await ev(page, () => __game.player.x);
    await page.keyboard.down("d"); await page.waitForTimeout(200); await page.keyboard.up("d");
    ok(await ev(page, () => __game.player.x) === xl, "movimento interrompido no fim de jogo");
    ok(await ev(page, () => document.activeElement.id) === "btn-retry", "botão Tentar novamente vem focado");
    await page.keyboard.press("Space");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.lives) === 3 && await ev(page, () => __game.collected) === 0, "barra de espaço aciona Tentar novamente: 3 vidas e rações zeradas");
    ok(await ev(page, () => __game.retries) === 1 && await ev(page, () => __game.time) < 1 && await ev(page, () => __game.livesLost) === 0, "a nova tentativa recomeça a fase do zero (tempo zerado, nenhuma vida perdida) e conta como a 1ª");
    ok(await lostHearts(page, 0), "corações voltam a ficar todos vermelhos");
  });

  // =====================================================================
  await section("vida extra: de 1 a 5 vidas", async () => {
    await play(page); await ev(page, () => { __game.freezeVets = true; });
    const grab = () => ev(page, () => { const it = __game.items.find((i) => i.life && !i.taken); __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); return [__game.lives, __game.collected]; });
    const visible = () => page.$$eval("#hud-lives .heart", (h) => ({ shown: h.filter((x) => !x.classList.contains("hidden")).length, lost: h.filter((x) => x.classList.contains("lost")).length }));
    ok(await ev(page, () => __game.maxLives) === 5, "o máximo é de 5 vidas");
    let r = await grab();
    ok(r[0] === 4 && r[1] === 1, "pegar a ração com a vida extra: 3 → 4 vidas (e conta como ração)");
    ok(/Vida extra/.test(await page.textContent("#toast")), "avisa que ganhou uma vida extra");
    await page.waitForFunction(() => document.querySelectorAll("#hud-lives .heart:not(.hidden)").length === 4);
    ok((await visible()).shown === 4 && (await visible()).lost === 0 && await page.getAttribute("#hud-lives", "aria-label") === "4 vidas", "o placar passa a mostrar 4 corações vermelhos");
    ok(await ev(page, () => { const it = __game.items.find((i) => i.life); return it.taken; }), "a ração com a vida extra some depois de pega");
    ok(await ev(page, () => { __game.tick(0.5); return __game.lives; }) === 4, "não dá a vida de novo");

    // de 1 para 2
    await page.reload(); await page.evaluate(PAGE_HELPERS); await page.click("#btn-start"); await ev(page, () => { __game.freezeVets = true; __game.setLives(1); });
    ok(await ev(page, () => __game.lives) === 1, "dá para ficar com apenas 1 vida");
    r = await grab();
    ok(r[0] === 2, "de 1 vida para 2");
    ok(await hudIs(page, "#hud-points", "100"), "a ração com a vida extra também vale 100 pontos");

    // teto de 5
    await ev(page, () => { __game.start(); __game.freezeVets = true; __game.setLives(5); });
    ok(await ev(page, () => __game.lives) === 5, "dá para ter 5 vidas");
    await page.waitForFunction(() => document.querySelectorAll("#hud-lives .heart:not(.hidden)").length === 5);
    ok((await visible()).shown === 5 && (await visible()).lost === 0, "5 corações vermelhos no placar");
    r = await grab();
    ok(r[0] === 5 && r[1] === 1, "com 5 vidas a ração com a vida extra não passa do máximo (continua 5)");
    ok(/máximo/.test(await page.textContent("#toast")), "avisa que já está com o máximo de vidas");
    ok(await ev(page, () => { __game.setLives(99); return __game.lives; }) === 5, "nunca passa de 5");
    // perder a vida com 5: 5 → 4, e os corações apagados voltam ao padrão de 3
    await ev(page, () => { __game.setLives(5); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.invuln = 0; __game.freezeVets = false; __game.tick(0.01); });
    ok(await ev(page, () => __game.lives) === 4 && await hudIs(page, "#hud-points", "50"), "perder a vida com 5: 5 → 4, e custa 50 pontos (100 → 50)");
    await ev(page, () => { __game.setLives(2); });
    await page.waitForFunction(() => document.querySelectorAll("#hud-lives .heart:not(.hidden)").length === 3 && document.querySelectorAll("#hud-lives .heart.lost").length === 1);
    const hs = await visible();
    ok(hs.shown === 3 && hs.lost === 1, "com menos de 3 vidas o placar mostra 3 corações, com os perdidos apagados");

    // salvar e continuar guarda vidas, vidas perdidas e a ração com a vida extra que ainda não foi pega
    await play(page, { keepSave: true }); await ev(page, () => { __game.freezeVets = true; __game.setLives(4); });
    await ev(page, () => { const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); __game.save(); });
    ok(await ev(page, () => [__game.lives, __game.livesLost]).then((x) => x.join()) === "3,1", "perdeu 1 vida (4 → 3)");
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    await page.click("#btn-continue");
    const resumed = await ev(page, () => ({ lives: __game.lives, lost: __game.livesLost, life: __game.items.filter((i) => i.life && !i.taken).length }));
    ok(resumed.lives === 3 && resumed.lost === 1 && resumed.life === 1, "continuar mantém vidas, vidas perdidas e a vida extra ainda não pega");
    // com 5 vidas salvas, o save é válido
    await ev(page, () => { __game.freezeVets = true; __game.setLives(5); __game.save(); });
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    await page.click("#btn-continue");
    ok(await ev(page, () => __game.lives) === 5, "um jogo salvo com 5 vidas continua com 5");
  });

  // =====================================================================
  await section("veterinário: patrulha, paredes e perseguição forte", async () => {
    await play(page);
    const cfg = await ev(page, () => __game.vets[0].cfg);
    ok(cfg.speed === 55 && cfg.chaseSpeed === 110, `Fase 1: sem o "!" o veterinário anda a 55 px/s e com o "!" a 110 px/s (${cfg.speed} e ${cfg.chaseSpeed})`);
    ok(cfg.chaseSpeed < 252 * 0.5 && cfg.speed < cfg.chaseSpeed, "o veterinário é mais lento que o cachorro (252 px/s) nos dois modos, e com o \"!\" fica bem mais rápido");
    ok(cfg.chaseSpeed >= cfg.speed * 1.8, `com o "!" ele fica bem mais rápido (${cfg.speed} → ${cfg.chaseSpeed} px/s)`);
    ok(cfg.chaseTime >= 3 && cfg.chaseMax > cfg.chaseTime, "persegue com empenho: no mínimo 3 s e insiste enquanto vê o cachorro");
    ok(await ev(page, () => __game.alertTiles) === 2 && cfg.sight === 64 && cfg.chaseChance === 1 && cfg.thinkEvery <= 0.1, `Fase 1: o "!" liga a 2 quadrados (${cfg.sight} px), sem sorteio e olhando 10 vezes por segundo`);

    const patrol = await ev(page, () => {
      const v = __game.vets[0]; v.cfg = { ...v.cfg, chaseChance: 0 }; __game.noCatch = true;
      const seen = new Set(); let maxSpeed = 0, chased = 0, px = v.cx, py = v.cy;
      for (let i = 0; i < 4000; i++) {
        __game.tick(1 / 30);
        seen.add(Math.floor(v.cx / 32) + "," + Math.floor(v.cy / 32));
        maxSpeed = Math.max(maxSpeed, Math.hypot(v.cx - px, v.cy - py) * 30); px = v.cx; py = v.cy;
        if (v.mode === "chase") chased++;
      }
      return { tiles: seen.size, maxSpeed, chased };
    });
    ok(patrol.tiles >= 25, `veterinário percorre o mapa (${patrol.tiles} tiles distintos)`);
    ok(patrol.maxSpeed <= cfg.speed + 0.5 && patrol.maxSpeed >= cfg.speed - 1, `velocidade de patrulha respeitada: 50 px/s (${patrol.maxSpeed.toFixed(1)} px/s)`);
    ok(patrol.chased === 0, "sem chance de perseguir → nunca persegue");
    const wallHits = await ev(page, (M) => {
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

    // cenários de perseguição: cada um roda dentro de UM evaluate (o loop real não intercala frames)
    // o sorteio fica no valor MAIS desfavorável (0,99): o "!" não depende de sorte
    const scenario = (dog, vet, seconds, escapeAfterStart) => ev(page, ([dog, vet, seconds, escape]) => {
      __game.setRand(() => 0.99);
      __game.noCatch = true; __game.freezeVets = false;
      const v = __game.vets[0], p = __game.player;
      __game.vets.forEach((o, i) => { if (i) o.cool = 999; });
      p.x = dog[0] * 32 + 4; p.y = dog[1] * 32 + 4;
      v.cx = vet[0] * 32 + 16; v.cy = vet[1] * 32 + 16; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0;
      const dist0 = Math.hypot(v.cx - (p.x + 12), v.cy - (p.y + 12));
      let t = 0, startedAt = null, endedAt = null, restartAt = null, chaseSpeedMax = 0, px = v.cx, py = v.cy;
      for (let i = 0; i < seconds / 0.05; i++) {
        __game.tick(0.05); t += 0.05;
        if (v.mode === "chase" && startedAt === null) { startedAt = t; if (escape) { p.x = 4; p.y = 4; } }
        if (v.mode === "chase") chaseSpeedMax = Math.max(chaseSpeedMax, Math.hypot(v.cx - px, v.cy - py) / 0.05);
        px = v.cx; py = v.cy;
        if (v.mode === "patrol" && startedAt !== null && endedAt === null) endedAt = t;
        if (endedAt !== null && v.mode === "chase" && restartAt === null) restartAt = t;
      }
      return { dist0, startedAt, endedAt, restartAt, chaseSpeedMax, cfg: v.cfg };
    }, [dog, vet, seconds, escapeAfterStart]);

    await play(page);
    const far = await scenario([1, 1], [22, 15], 10);
    ok(far.startedAt === null, "fora do alcance de visão não persegue");
    await play(page);
    const stay = await scenario([20, 4], [22, 4], 30);
    ok(stay.dist0 <= stay.cfg.sight && stay.startedAt !== null && stay.startedAt <= 0.1, `com o cachorro a 2 quadrados e à vista, o "!" liga na hora (${stay.startedAt}s), mesmo com o sorteio no pior valor`);
    ok(stay.chaseSpeedMax > stay.cfg.speed * 1.8 && Math.abs(stay.chaseSpeedMax - 110) <= 1, `durante a perseguição o veterinário anda a 110 px/s, o dobro de quando patrulha (${stay.chaseSpeedMax.toFixed(1)} px/s)`);
    const dur = stay.endedAt - stay.startedAt;
    ok(Math.abs(dur - stay.cfg.chaseMax) <= 0.3, `enquanto vê o cachorro ele insiste até o limite (${dur.toFixed(1)}s de ${stay.cfg.chaseMax}s)`);
    ok(stay.restartAt === null || stay.restartAt - stay.endedAt >= stay.cfg.restTime - 0.1, `depois de perseguir descansa ${stay.cfg.restTime}s antes de tentar de novo`);
    await play(page);
    const escaped = await scenario([20, 4], [22, 4], 30, true);
    const dur2 = escaped.endedAt - escaped.startedAt;
    ok(Math.abs(dur2 - escaped.cfg.chaseTime) <= 0.3, `se o cachorro escapa da vista, a perseguição acaba em ~${escaped.cfg.chaseTime}s (${dur2.toFixed(1)}s)`);
  });

  // =====================================================================
  await section("alcance do !: 2, 4 e 6 quadrados", async () => {
    await play(page);
    const info = await ev(page, () => { const o = {}; for (const id of [1, 2, 3]) { __game.start(id); o[id] = { tiles: __game.alertTiles, sight: __game.vets.map((v) => v.cfg.sight), chance: __game.vets.map((v) => v.cfg.chaseChance), lv: __game.levels[id - 1].alertTiles }; } __game.start(1); return o; });
    ok(info[1].tiles === 2 && info[2].tiles === 4 && info[3].tiles === 6 && info[1].lv === 2 && info[2].lv === 4 && info[3].lv === 6, "o alcance do ! é 2 quadrados na Fase 1, 4 na Fase 2 e 6 na Fase 3 (2 × número da fase, como será nas fases 4 e 5: 8 e 10)");
    ok([1, 2, 3].every((id) => info[id].sight.every((s) => s === info[id].tiles * 32) && info[id].chance.every((c) => c === 1)), "em todas as fases o alcance em pixels é quadrados × 32 e o ! liga sempre (sem sorteio)");

    // Um veterinário parado numa linha livre; o cachorro a `dx` px dele (centro a centro). Retorna se o "!" ligou e quando.
    const probe = (level, vet, dx, dy, secs) => ev(page, ([level, vet, dx, dy, secs]) => {
      __game.start(level); __game.setRand(() => 0.99); __game.noCatch = true; __game.freezeVets = false;
      __game.items.forEach((i) => { i.x = -500; i.y = -500; }); // nenhum osso (poder) nem ração no caminho do teste
      const v = __game.vets[0], p = __game.player;
      __game.vets.forEach((o, i) => { if (i) o.cool = 999; });
      v.cx = vet[0] * 32 + 16; v.cy = vet[1] * 32 + 16; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 99; // parado
      p.x = v.cx + dx - 12; p.y = v.cy + dy - 12;
      let at = null;
      for (let i = 0; i < secs * 20; i++) { __game.tick(0.05); if (v.mode === "chase") { at = Math.round((i + 1) * 5) / 100; break; } }
      __game.setRand(null);
      return at;
    }, [level, vet, dx, dy, secs]);

    // linhas livres: Fase 1 linha 13 (colunas 9 a 23), Fase 2 linha 14 (1 a 23), Fase 3 linha 15 (1 a 20); o veterinário fica no meio delas
    const setups = [[1, [14, 13], 2], [2, [12, 14], 4], [3, [10, 15], 6]];
    for (const [level, vet, n] of setups) {
      const edge = n * 32;
      const inside = await probe(level, vet, edge - 6, 0, 1), outside = await probe(level, vet, edge + 6, 0, 2);
      ok(inside !== null && inside <= 0.1, `Fase ${level}: com o cachorro a ${n} quadrados (${edge - 6} px) o ! liga na hora (${inside}s)`);
      ok(outside === null, `Fase ${level}: com o cachorro um pouco além de ${n} quadrados (${edge + 6} px) o ! não liga`);
      const half = await probe(level, vet, 0.5 * 32, 0, 1), left = await probe(level, vet, -(edge - 6), 0, 1);
      ok(half !== null && half <= 0.1 && left !== null && left <= 0.1, `Fase ${level}: perto, ou para o outro lado, o ! liga igual`);
    }
    // o mesmo ponto liga ou não conforme a fase: a 3 quadrados (96 px) só a Fase 2 e a Fase 3 enxergam
    const three = [await probe(1, [14, 13], 96, 0, 1), await probe(2, [12, 14], 96, 0, 1), await probe(3, [10, 15], 96, 0, 1)];
    ok(three[0] === null && three[1] !== null && three[2] !== null, `a 3 quadrados: Fase 1 não vê, Fase 2 e Fase 3 veem (${three.join(", ")})`);
    const five = [await probe(2, [12, 14], 160, 0, 1), await probe(3, [10, 15], 160, 0, 1)];
    ok(five[0] === null && five[1] !== null, `a 5 quadrados: Fase 2 não vê, Fase 3 vê (${five.join(", ")})`);
    // distância é em linha reta (diagonal conta): 2 quadrados na diagonal = 45 px em cada eixo (63,6 px)
    const diag = [await probe(1, [10, 14], 44, 44, 1), await probe(1, [10, 14], 50, 50, 1)];
    ok(diag[0] !== null && diag[1] === null, `na diagonal vale a distância em linha reta (44+44 px liga, 50+50 px não) (${diag.join(", ")})`);
    // a parede impede de ver, mesmo dentro do alcance: Fase 1, veterinário em (7,5) e cachorro em (9,5), com a parede da coluna 8 no meio
    const wall = await probe(1, [7, 5], 60, 0, 2);
    ok(wall === null, "uma parede entre os dois impede o ! mesmo dentro do alcance");
    // e o veterinário volta a ficar "calmo": depois de perder o cachorro de vista a perseguição acaba (já coberto acima), e o descanso vale
    const rest = await ev(page, () => {
      __game.start(1); __game.setRand(() => 0.99); __game.noCatch = true;
      const v = __game.vets[0], p = __game.player; v.cx = 14 * 32 + 16; v.cy = 13 * 32 + 16; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 99;
      p.x = v.cx + 40 - 12; p.y = v.cy - 12;
      for (let i = 0; i < 4; i++) __game.tick(0.05);
      const on = v.mode === "chase"; v.mode = "patrol"; v.cool = v.cfg.restTime; v.think = 0; // fim de uma perseguição: descansa
      for (let i = 0; i < 60; i++) __game.tick(0.05); // 3 s ainda descansando
      const during = v.mode; __game.setRand(null);
      return { on, during };
    });
    ok(rest.on && rest.during === "patrol", "durante o descanso depois de uma perseguição o ! não liga de novo, mesmo com o cachorro à vista");
  });

  // =====================================================================
  await section("pausa e navegação", async () => {
    await play(page); await ev(page, () => { __game.freezeVets = true; });
    await page.keyboard.press("Escape");
    ok(await ev(page, () => __game.state) === "paused" && await page.isVisible("#pause"), "Esc pausa o jogo");
    const t0 = await ev(page, () => __game.time);
    await page.waitForTimeout(400);
    ok(await ev(page, () => __game.time) === t0, "o tempo não corre durante a pausa");
    ok(await ev(page, () => document.activeElement.id) === "btn-resume", "botão Continuar vem focado");
    await page.keyboard.press("Escape");
    ok(await ev(page, () => __game.state) === "playing", "Esc de novo retoma");
    await page.click("#btn-pause");
    ok(await ev(page, () => __game.state) === "paused", "botão de pausa do placar também pausa");
    await page.click("#btn-pause-menu");
    ok(await ev(page, () => __game.state) === "menu" && await page.isVisible("#menu"), "Voltar ao menu");
    await ev(page, () => document.getElementById("btn-start").focus());
    await page.keyboard.press("ArrowDown");
    ok(await ev(page, () => document.activeElement.id) === "btn-howto", "setas ↑↓ navegam entre os botões do menu");
  });

  // =====================================================================
  await section("jogo salvo: manual, automático e continuar", async () => {
    await play(page, { keepSave: true });
    await ev(page, () => { __game.freezeVets = true; });
    ok(await ev(page, () => !Records.createStore(localStorage).hasGame("Totó")), "antes de jogar não há jogo salvo");
    await ev(page, () => { const it = __game.items[0]; __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); });
    ok(await ev(page, () => Records.createStore(localStorage).hasGame("Totó")), "salva sozinho ao coletar uma ração (autosave)");
    await ev(page, () => { __game.tick(3.0); __game.save(); });
    const before = await ev(page, () => ({ items: __game.items.map((i) => [i.x, i.y, i.taken, i.life]), time: __game.time, lives: __game.lives, lost: __game.livesLost, p: [__game.player.x, __game.player.y] }));
    const t1 = await ev(page, () => Records.createStore(localStorage).loadGame("Totó").savedAt);
    await page.waitForTimeout(5600);
    const t2 = await ev(page, () => Records.createStore(localStorage).loadGame("Totó").savedAt);
    ok(t2 > t1, "continua salvando sozinho a cada poucos segundos");
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    ok(await page.isVisible("#btn-continue") && /Jogo salvo/.test(await page.textContent("#menu-save")), "depois de recarregar o menu oferece Continuar jogo e resume o save");
    ok(await ev(page, () => document.activeElement.id) === "btn-continue", "Continuar jogo vem focado");
    await page.click("#btn-continue");
    const after = await ev(page, () => ({ items: __game.items.map((i) => [i.x, i.y, i.taken, i.life]), time: __game.time, lives: __game.lives, lost: __game.livesLost, collected: __game.collected, invuln: __game.invuln, state: __game.state }));
    ok(after.state === "playing" && JSON.stringify(after.items) === JSON.stringify(before.items), "continua com as mesmas rações nos mesmos lugares (e a que tem a vida extra)");
    ok(after.collected === 1 && after.lives === before.lives && after.lost === before.lost && after.time >= before.time - 0.1, "mantém rações coletadas, vidas, vidas perdidas e tempo");
    ok(after.invuln > 0.5 && after.invuln <= 1.5, `ganha uma proteção curta ao retomar (${after.invuln.toFixed(2)} s)`);

    // novo jogo com save existente pede confirmação
    await ev(page, () => __game.save());
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    await page.click("#btn-start");
    ok(await page.isVisible("#confirm") && /Fase 1/.test(await page.textContent("#confirm-text")), "Iniciar jogo com save existente pede confirmação");
    await page.click("#btn-confirm-back");
    ok(await page.isVisible("#menu") && await ev(page, () => Records.createStore(localStorage).hasGame("Totó")), "Voltar não apaga o save");
    await page.click("#btn-start"); await page.click("#btn-confirm-new");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.collected) === 0, "Apagar e começar de novo inicia do zero");
    await ev(page, () => { __game.freezeVets = true; });

    // salvar pela pausa
    await page.keyboard.press("Escape");
    ok(await ev(page, () => localStorage.getItem("cachorrinho.save.v1") !== null), "pausar também salva o jogo");
    await ev(page, () => localStorage.removeItem("cachorrinho.save.v1"));
    await page.click("#btn-save");
    ok(/salvo/i.test(await page.textContent("#pause-msg")) && await ev(page, () => localStorage.getItem("cachorrinho.save.v1") !== null), "botão Salvar jogo grava e confirma na pausa");
    await page.click("#btn-resume");

    // botão de salvar no topo do jogo (modo salvar)
    await ev(page, () => localStorage.removeItem("cachorrinho.save.v1"));
    ok(await page.isVisible("#btn-save-hud") && (await page.getAttribute("#btn-save-hud", "aria-label")) === "Salvar jogo", "há um botão Salvar jogo no topo da tela de jogo");
    await page.click("#btn-save-hud");
    ok(/Jogo salvo/.test(await page.textContent("#toast")) && await ev(page, () => localStorage.getItem("cachorrinho.save.v1") !== null) && await ev(page, () => Records.createStore(localStorage).hasGame("Totó")), "o botão de salvar grava o jogo na hora e avisa");
    ok(await ev(page, () => __game.state) === "playing", "salvar não interrompe o jogo");

    // perder todas as vidas apaga o save
    await ev(page, () => { __game.freezeVets = false; });
    await ev(page, () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; v.cool = 99; __game.tick(0.01); } });
    ok(await ev(page, () => __game.state) === "lost" && await ev(page, () => !Records.createStore(localStorage).hasGame("Totó")), "fim de jogo apaga o jogo salvo");
  });

  await section("jogo salvo: página fechada, save inválido e sem armazenamento", async () => {
    await play(page, { keepSave: true });
    await ev(page, () => { __game.freezeVets = true; __t.hold("d", 30); });
    const px = await ev(page, () => __game.player.x);
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    ok(await page.isVisible("#btn-continue"), "fechar/recarregar a página durante o jogo também salva");
    await page.click("#btn-continue");
    ok(Math.abs(await ev(page, () => __game.player.x) - px) < 1, "volta exatamente à posição em que o cachorro estava");

    // saves adulterados (feitos a partir de um save real, trocando só uma coisa) são ignorados
    await playLevel(page, 1, { keepSave: true });
    await ev(page, () => { __game.freezeVets = true; __game.save(); });
    const realSave = await ev(page, () => JSON.parse(localStorage.getItem("cachorrinho.save.v1")));
    const tampers = {
      "ração dentro de uma parede": (s) => { s.items[0][0] = 0; s.items[0][1] = 0; },
      "cachorro dentro de uma parede": (s) => { s.p.x = 0; s.p.y = 0; },
      "veterinário dentro de uma parede": (s) => { s.vets[0] = [10, 10]; },
      "tempo negativo": (s) => { s.time = -5; },
      "vidas demais": (s) => { s.lives = 9; },
      "formato antigo sem a versão certa": (s) => { s.v = 1; },
    };
    const outcomes = [];
    for (const [what, fn] of Object.entries(tampers)) {
      const sv = JSON.parse(JSON.stringify(realSave)); fn(sv.saves.toto.snap);
      await page.reload(); await ev(page, (sv) => localStorage.setItem("cachorrinho.save.v1", JSON.stringify(sv)), sv); await page.reload();
      outcomes.push([what, await page.isHidden("#btn-continue")]);
    }
    await page.reload(); await ev(page, (sv) => localStorage.setItem("cachorrinho.save.v1", JSON.stringify(sv)), realSave); await page.reload();
    ok(outcomes.every(([, hidden]) => hidden) && await page.isVisible("#btn-continue") && await ev(page, () => document.activeElement.id) !== "", `save adulterado é ignorado sem quebrar (${outcomes.map(([w, h]) => w + ": " + (h ? "recusado" : "ACEITO")).join("; ")}) e o save real continua valendo`);
    await ev(page, () => localStorage.setItem("cachorrinho.save.v1", JSON.stringify({ v: 1, saves: { toto: { t: Date.now(), snap: { v: 1, l: 1, time: 5, lives: 3, invuln: 0, items: [[0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0]], p: { x: 36, y: 36, f: "right" }, vets: [[80, 432]] } } } })));
    await page.reload();
    ok(await page.isHidden("#btn-continue") && await ev(page, () => document.activeElement.id) === "btn-start", "save no formato antigo/inválido é ignorado sem quebrar");
    await ev(page, () => localStorage.setItem("cachorrinho.save.v1", "{lixo"));
    await page.reload();
    ok(await page.isHidden("#btn-continue") && await ev(page, () => __game.state) === "menu", "save corrompido é ignorado");

    // saves de outra fase / com contagens erradas (7 rações e 1–2 vidas extras na Fase 2; 5 e 1 na Fase 1)
    const snapOf = async (id) => { await playLevel(page, id, { keepSave: true }); return ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; }); };
    const s1 = await snapOf(1), s2 = await snapOf(2);
    ok(s1.items.length === 5 && s2.items.length === 9 && s1.l === 1 && s2.l === 2, "o save guarda a fase e todos os itens dela (5 rações na Fase 1; 7 rações + 2 ossos na Fase 2)");
    const accepts = async (snap) => { // grava `snap` como jogo salvo do Totó e vê se o menu oferece Continuar
      await fresh(page, { keepSave: true });
      await ev(page, (snap) => Records.createStore(localStorage).saveGame("Totó", snap), snap);
      await page.reload(); await page.evaluate(PAGE_HELPERS);
      return page.isVisible("#btn-continue");
    };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const withLife = (snap, n) => { const c = clone(snap); let k = 0; c.items.forEach((it) => { it[3] = !it[4] && k < n ? (k++, 1) : 0; }); return c; }; // as vidas vão para as primeiras rações (nunca para os 2 ossos: no máximo 1 osso pode ter vida)
    ok(await accepts(withLife(s2, 2)), "save válido da Fase 2 com 2 vidas extras é aceito");
    await page.click("#btn-continue");
    ok(await ev(page, () => __game.level) === 2 && await ev(page, () => __game.items.length) === 9 && await ev(page, () => __game.items.filter((i) => i.life).length) === 2 && await ev(page, () => __game.vets.length) === 2, "e continua na Fase 2, com 9 itens (2 com vida extra) e 2 veterinários");
    ok(await accepts(withLife(s2, 1)) && await accepts(withLife(s1, 1)), "saves válidos com 1 vida extra são aceitos nas duas fases");
    ok(!(await accepts(withLife(s2, 0))), "Fase 2 sem nenhuma vida extra é recusado");
    ok(!(await accepts(withLife(s2, 3))), "Fase 2 com 3 vidas extras é recusado");
    ok(!(await accepts(withLife(s1, 2))), "Fase 1 com 2 vidas extras é recusado");
    ok(!(await accepts({ ...clone(s2), items: clone(s2.items).slice(0, 5) })), "Fase 2 com só 5 rações é recusado");
    ok(!(await accepts({ ...clone(s1), l: 2 })), "save da Fase 1 trocado para a Fase 2 (rações/posições não conferem) é recusado");
    ok(!(await accepts({ ...clone(s1), l: 9 })), "fase inexistente é recusada");
    ok(!(await accepts({ ...clone(s1), rs: 4 })), "mais de 3 novas tentativas é recusado");
    ok(!(await accepts({ ...clone(s1), lives: 6 })) && !(await accepts({ ...clone(s1), lives: 0 })), "vidas fora de 1 a 5 são recusadas");
    ok(await accepts({ ...clone(s1), rs: 2, lives: 5, lost: 4 }), "tentativas extras (2), 5 vidas e vidas perdidas são aceitas");
    await page.click("#btn-continue");
    ok(await ev(page, () => [__game.retries, __game.lives, __game.livesLost].join()) === "2,5,4" && await hudIs(page, "#hud-retry", "2/3") && await hudIs(page, "#hud-points", "-400"), "continuar mantém as tentativas extras (2), as vidas perdidas (4) e a pontuação negativa: −100×2 −50×4 = −400");

    // navegador sem armazenamento (ex.: modo restrito): o jogo funciona e avisa
    const ns = await newPage();
    await ns.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("bloqueado", "SecurityError"); } }); });
    await ns.goto(URL);
    ok(await ev(ns, () => __game.state) === "menu", "sem armazenamento disponível o jogo abre");
    await ns.click("#btn-name"); await ns.fill("#name-input", "Totó"); await ns.press("#name-input", "Enter");
    ok(await ev(ns, () => __game.state) === "menu" && await ns.textContent("#menu-player") === "Totó", "nome vale na sessão mesmo sem armazenamento");
    await ns.click("#btn-name");
    ok(await ns.isVisible("#name-note"), "avisa que não consegue guardar os dados");
    await ns.keyboard.press("Escape");
    await ns.click("#btn-start");
    ok(await ev(ns, () => __game.state) === "playing", "dá para jogar sem armazenamento");
    await ns.click("#btn-save-hud");
    ok(/só nesta página/.test(await ns.textContent("#toast")) && !/^Jogo salvo!$/.test(await ns.textContent("#toast")), "sem armazenamento, o botão de salvar avisa que só vale nesta página (não diz 'Jogo salvo!')");
    await ns.context().close();
  });

  // =====================================================================
  await section("derrota e Esc", async () => {
    await play(page);
    await ev(page, () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; v.cool = 99; __game.tick(0.01); } });
    ok(await page.isVisible("#lose") && /Acabaram as suas vidas/.test(await page.textContent("#lose")), "tela de fim de jogo explica que as vidas acabaram");
    const lt = await page.textContent("#lose");
    ok(/3 vezes/.test(lt) && /do zero/.test(lt) && /100 pontos/.test(lt) && /Tentar novamente \(−100 pontos\)/.test(lt), "e explica que há 3 novas tentativas, do zero, a 100 pontos cada");
    await page.keyboard.press("Escape");
    ok(await ev(page, () => __game.state) === "menu", "Esc na tela final volta ao menu");
  });

  // =====================================================================
  await section("Fase 2: 7 rações, 2 veterinários 10% mais espertos, jogo e vitória", async () => {
    await fresh(page, { name: "Totó" });
    await page.click("#btn-start");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.level) === 1, "só com a Fase 1 liberada, Iniciar jogo vai direto para a Fase 1");

    await fresh(page, { name: "Totó", done: [1] });
    await page.click("#btn-start");
    ok(await page.isVisible("#levels") && /Fase 1/.test(await page.textContent("#levels-list button:nth-child(1)")) && /1 veterinário/.test(await page.textContent("#levels-list button:nth-child(1)")), "Fase 1 concluída: Iniciar jogo abre a escolha de fase");
    ok(/2 veterinários/.test(await page.textContent("#levels-list button:nth-child(2)")) && await page.isEnabled("#levels-list button:nth-child(2)"), "a Fase 2 está liberada e mostra os 2 veterinários");
    await page.click("#btn-levels-back");
    ok(await page.isVisible("#menu"), "Voltar na escolha de fase retorna ao menu");
    await page.click("#btn-start"); await page.click("#levels-list button:nth-child(2)");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.level) === 2, "escolher a Fase 2 começa a Fase 2");
    ok(/Fase 2: 2 veterinários/.test(await page.textContent("#toast")), "aviso de início mostra a Fase 2 e os 2 veterinários");
    ok(await hudIs(page, "#hud-level", "2") && await hudIs(page, "#hud-items", "0/7") && await hudIs(page, "#hud-points", "0"), "placar mostra FASE 2 e RAÇÕES 0/7");
    ok(await ev(page, () => __game.items.length) === 9 && await ev(page, () => __game.items.filter((i) => i.bone).length) === 2 && await ev(page, () => __game.lives) === 3, "a Fase 2 tem 7 rações + 2 ossos e começa com 3 vidas");

    // veterinários: no centro, 10% mais espertos
    const vs = await ev(page, () => __game.vets.map((v) => [Math.floor(v.cx / 32), Math.floor(v.cy / 32)]));
    ok(JSON.stringify(vs) === JSON.stringify(G2.find("V")) && vs.every(([c, r]) => Math.abs(c - 12) <= 2 && Math.abs(r - 8.5) <= 1.5), `os 2 veterinários começam no centro do mapa (${vs.join(" e ")})`);
    const cfgs = await ev(page, () => { const a = { ...__game.vets[0].cfg }, b = { ...__game.vets[1].cfg }; __game.start(1); return { f2a: a, f2b: b, f1: { ...__game.vets[0].cfg } }; });
    const close = (a, b) => Math.abs(a - b) < 1e-9;
    const up = ["speed", "chaseSpeed", "chaseTime", "chaseMax"], down = ["thinkEvery", "restTime", "idleMin", "idleMax"];
    ok(up.every((k) => close(cfgs.f2a[k], cfgs.f1[k] * 1.1)), `Fase 2: velocidade e insistência da perseguição 10% maiores (${up.map((k) => `${k} ${cfgs.f1[k].toFixed(2)}→${cfgs.f2a[k].toFixed(2)}`).join(", ")})`);
    ok(down.every((k) => close(cfgs.f2a[k], cfgs.f1[k] / 1.1)), "Fase 2: ele pensa, descansa e para 10% menos tempo");
    ok(JSON.stringify(cfgs.f2a) === JSON.stringify(cfgs.f2b) && cfgs.f2a.chaseSpeed < 252 / 1.4 && cfgs.f2a.speed < cfgs.f2a.chaseSpeed, "os 2 veterinários são iguais, e o cachorro (252 px/s) continua pelo menos 40% mais rápido que eles");
    ok(cfgs.f1.speed === 55 && cfgs.f1.chaseSpeed === 110 && cfgs.f2a.speed === 60.5 && cfgs.f2a.chaseSpeed === 121, `velocidades exatas (px/s): Fase 1 = ${cfgs.f1.speed} sem "!" e ${cfgs.f1.chaseSpeed} com "!"; Fase 2 = ${cfgs.f2a.speed} e ${cfgs.f2a.chaseSpeed} (os valores da Fase 1 + 10% nos dois modos)`);
    ok(close(cfgs.f1.chaseSpeed / cfgs.f1.speed, 2) && close(cfgs.f2a.chaseSpeed / cfgs.f2a.speed, 2), "em cada fase, perseguindo ele anda o dobro da velocidade de quando patrulha");

    // jogo real na Fase 2: patrulha sem atravessar paredes
    await ev(page, () => __game.start(2));
    const patrol = await ev(page, (M) => {
      __game.noCatch = true; for (const v of __game.vets) v.cfg = { ...v.cfg, chaseChance: 0 };
      const seen = [new Set(), new Set()]; let hits = 0;
      for (let i = 0; i < 3000; i++) {
        __game.tick(1 / 30);
        __game.vets.forEach((v, k) => {
          seen[k].add(Math.floor(v.cx / 32) + "," + Math.floor(v.cy / 32));
          for (const [ox, oy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) { const ch = M[Math.floor((v.cy + oy) / 32)][Math.floor((v.cx + ox) / 32)]; if (ch === "#" || ch === "X") hits++; }
        });
      }
      return { tiles: seen.map((x) => x.size), hits };
    }, G2.MAP);
    ok(patrol.hits === 0 && patrol.tiles.every((n) => n >= 25), `na Fase 2 os 2 veterinários patrulham (${patrol.tiles.join(" e ")} tiles) sem atravessar paredes nem caixas`);
    // os dois perseguem: cachorro à vista, sorteio favorável
    const chase = await ev(page, () => {
      __game.start(2); __game.setRand(() => 0); __game.noCatch = true;
      const p = __game.player, v0 = __game.vets[0], v1 = __game.vets[1];
      p.x = v0.cx - 40; p.y = v0.cy - 12; v1.cx = v0.cx + 32; v1.cy = v0.cy; // os dois com o cachorro à vista
      for (const v of __game.vets) { v.cool = 0; v.think = 0; v.leg = null; v.route = []; }
      let both = false;
      for (let i = 0; i < 60; i++) { __game.tick(0.05); if (__game.vets.every((v) => v.mode === "chase")) both = true; }
      __game.setRand(null);
      return both;
    });
    ok(chase, "na Fase 2 os dois veterinários conseguem perseguir ao mesmo tempo");

    // percorre a Fase 2 de verdade (colisões nos corredores): pega as 7 rações e chega à saída
    await playLevel(page, 2, { done: [1] });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; }); // o corredor central passa perto dos veterinários parados
    const cur = () => tileOfPlayer(page);
    for (let guard = 0; guard < 10; guard++) {
      const left = (await itemTiles(page)).filter((i) => !i[2]).map((i) => [i[0], i[1]]);
      if (!left.length) break;
      const here = await cur();
      left.sort((a, b) => G2.bfs(here, a).length - G2.bfs(here, b).length);
      await ev(page, (p) => __t.walk(p), G2.bfs(here, left[0]));
    }
    ok(await ev(page, () => __game.collected) === 7 && await ev(page, () => __game.bonesGot) === 2 && await hudIs(page, "#hud-points", String(1000 + 100 * await ev(page, () => __game.postmen))), "caminhando pela Fase 2 dá para pegar as 7 rações e os 2 ossos (700 + 300 = 1000 pontos, mais 100 por carteiro encostado no caminho)");
    ok(await ev(page, () => __game.state) === "playing", "com as 7 rações, a vitória só vem ao chegar na saída");
    await ev(page, (p) => __t.walk(p), G2.bfs(await cur(), G2.find("E")[0]));
    ok(await ev(page, () => __game.state) === "won" && await page.isVisible("#win"), `a Fase 2 termina ao chegar na saída com as 7 rações (cachorro em ${await tileOfPlayer(page)}, estado ${await ev(page, () => __game.state)})`);
    const wt = await page.textContent("#win-breakdown"), wp = Number(await page.textContent("#win-points"));
    const wm = wt.match(/Rações: (\d+) \+ ossos: (\d+)(?: \+ carteiros: (\d+))? \+ bônus de tempo: (\d+)/);
    ok(/Fase 2 concluída/.test(await page.textContent("#win-title")) && wm && Number(wm[1]) === 700 && Number(wm[2]) === 300 && wp === 1000 + Number(wm[3] || 0) + Number(wm[4]), `pontuação da Fase 2 = 700 (rações) + 300 (ossos) + bônus de tempo (${wp}; ${wt})`);
    ok(await page.isVisible("#btn-next") && /Próxima fase \(Fase 3\)/.test(await page.textContent("#btn-next")), "depois da Fase 2 há a Fase 3: aparece Próxima fase (Fase 3)");
    const rec = await ev(page, () => { const s = Records.createStore(localStorage); return { l2: s.personalBest("Totó", 2), l1: s.personalBest("Totó", 1), total: s.totalScore("Totó", [1, 2]) }; });
    ok(rec.l2 && rec.l2.p === wp && rec.l1 === null && rec.total === wp, "a pontuação da Fase 2 é guardada à parte da Fase 1");

    // vida extra na Fase 2: 1 ou 2 vidas
    for (const [rnd, want] of [[0, 4], [0.99, 5]]) {
      await ev(page, ([rnd]) => { __game.setRand(() => rnd); __game.start(2); __game.setRand(null); __game.freezeVets = true; }, [rnd]);
      const lives = await ev(page, () => { for (const it of __game.items.filter((i) => i.life)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } return [__game.lives, __game.collected]; });
      ok(lives[0] === want, `Fase 2 com ${want - 3} vida(s) extra(s) escondida(s): pegar todas leva de 3 para ${want} vidas`);
    }
  });

  // =====================================================================
  await section("Fase 3: ossos, blocos que se movem, 2 veterinários, bônus de 20", async () => {
    const L = await (async () => { await fresh(page); return ev(page, () => __game.levels[2]); })();
    const m3 = G3.MAP.join("\n");

    // ---- mapa ----
    ok(m3 !== G1.MAP.join("\n") && m3 !== G2.MAP.join("\n"), "o mapa da Fase 3 é diferente dos da Fase 1 e da Fase 2");
    ok(G3.MAP.length === 18 && G3.MAP.every((row) => row.length === 25) && [...G3.MAP[0], ...G3.MAP[17], ...G3.MAP.map((r) => r[0]), ...G3.MAP.map((r) => r[24])].every((ch) => ch === "#"), "Fase 3: mapa 25x18 cercado por paredes");
    const v3 = G3.find("V"), p3 = G3.find("P")[0], e3 = G3.find("E");
    ok(v3.length === 2 && v3.every(([c, r]) => Math.abs(c - 12) <= 2 && Math.abs(r - 8.5) <= 1.5), `Fase 3: 2 veterinários, no centro do mapa (${v3.join(" e ")})`);
    ok(L.blocks.length === 2, "Fase 3: no máximo 2 blocos se movem (são exatamente 2)");
    // cada bloco desliza em linha reta por chão livre; todos os tiles do trilho são livres
    const track = new Set(), ends = [];
    for (const b of L.blocks) {
      const [ac, ar] = b.from, [bc, br] = b.to;
      ok((ac === bc || ar === br) && (ac !== bc || ar !== br), `bloco ${b.from} → ${b.to}: trilho em linha reta`);
      for (let c = Math.min(ac, bc); c <= Math.max(ac, bc); c++) for (let r = Math.min(ar, br); r <= Math.max(ar, br); r++) { track.add(c + "," + r); ok(G3.MAP[r][c] === ".", `trilho (${c},${r}) é chão livre`); }
      ends.push([[ac, ar], [bc, br]]);
    }
    // com os blocos em qualquer combinação de pontas, todo o chão fora dos trilhos continua ligado (sempre sobra caminho)
    const comboOk = [];
    for (let mask = 0; mask < 1 << ends.length; mask++) {
      const blocked = new Set(ends.map((e, i) => e[(mask >> i) & 1] + ""));
      const floor = []; for (let r = 0; r < 18; r++) for (let c = 0; c < 25; c++) if (G3.free(c, r) && !blocked.has(c + "," + r) && !track.has(c + "," + r)) floor.push([c, r]);
      const seen = new Set([floor[0] + ""]), q = [floor[0]];
      for (const [c, r] of q) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c + dc, r + dr]; if (n[0] < 0 || n[1] < 0 || n[0] > 24 || n[1] > 17 || !G3.free(...n) || blocked.has(n + "") || seen.has(n + "")) continue; seen.add(n + ""); q.push(n); }
      comboOk.push(floor.every((t) => seen.has(t + "")));
    }
    ok(comboOk.every(Boolean), `blocos mudam o caminho, mas nunca o fecham: com os 2 blocos em qualquer ponta (${comboOk.length} combinações) todo o chão fora dos trilhos continua alcançável`);
    const d3 = G3.distances(p3);
    ok(e3.length === 6 && [...e3, ...v3].every((t) => d3.has(t + "")), "Fase 3: saída (3x2) e veterinários alcançáveis a partir do cachorro");

    // ---- dados da fase ----
    ok(L.rations === 7 && L.bones === 2 && L.extraLives.join() === "1,2" && L.bonusStep === 20, "Fase 3: 7 rações + 2 ossos, 1 a 2 vidas escondidas e bônus de 20 pontos por degrau");
    await playLevel(page, 3, { done: [1, 2] });
    ok(await ev(page, () => __game.level) === 3 && await ev(page, () => __game.items.length) === 9 && await ev(page, () => __game.items.filter((i) => i.bone).length) === 2 && await ev(page, () => __game.vets.length) === 2, "a Fase 3 começa com 9 itens (7 rações e 2 ossos) e 2 veterinários");
    ok(await hudIs(page, "#hud-level", "3") && await hudIs(page, "#hud-items", "0/7") && await hudIs(page, "#hud-bones", "0/2") && await page.isVisible("#hud-bones-item"), "placar mostra FASE 3, RAÇÕES 0/7 e OSSOS 0/2");
    const lay = await ev(page, () => { const out = []; for (let i = 0; i < 150; i++) { __game.start(3); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32, it.bone ? 1 : 0, it.life ? 1 : 0])); } return out; });
    let bad = "";
    for (const items of lay) {
      if (items.length !== 9 || new Set(items.map((i) => i[0] + "," + i[1])).size !== 9) bad = "quantidade/repetidos";
      if (items.filter((i) => i[2]).length !== 2) bad = "ossos";
      if (![1, 2].includes(items.filter((i) => i[3]).length)) bad = "vida escondida (deve ser 1 ou 2)";
      for (const [c, r] of items) {
        if (!G3.free(c, r)) bad = "em parede/caixa";
        if (e3.some((t) => t[0] === c && t[1] === r)) bad = "na saída";
        if (track.has(c + "," + r)) bad = "no trilho de um bloco";
        if (!d3.has([c, r] + "")) bad = "inalcançável"; else if (d3.get([c, r] + "") < 4) bad = "perto do início";
        if (v3.some((v) => Math.hypot(c - v[0], r - v[1]) < 4)) bad = "perto de um veterinário";
      }
    }
    ok(!bad, `150 sorteios: sempre 7 rações + 2 ossos, em chão livre e alcançável, fora dos trilhos, longe do início/veterinários/saída ${bad && "(" + bad + ")"}`);
    ok(lay.some((items) => items.some((i) => i[3] && i[2])) && lay.some((items) => items.some((i) => i[3] && !i[2])), "a vida escondida cai às vezes num osso e às vezes numa ração");
    ok(lay.every((items) => [1, 2].includes(items.filter((i) => i[3]).length)) && lay.every((items) => items.filter((i) => i[3] && i[4]).length <= 1), "e nunca nos dois ossos ao mesmo tempo (sempre 1 ou 2 vidas escondidas, no máximo 1 num osso)");
    ok(new Set(lay.map((items) => items.map((i) => i.slice(0, 2).join()).sort().join("|"))).size >= 140, "os lugares mudam a cada jogo");
    // a vida escondida num OSSO sobe de verdade a contagem de vidas (e a de uma ração também)
    const lifeBone = await ev(page, () => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true; __game.setLives(2);
      __game.items.forEach((i) => { i.life = false; });
      const bone = __game.items.find((i) => i.bone); bone.life = true; __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      const afterBone = __game.lives, toast1 = document.getElementById("toast").textContent;
      const ration = __game.items.find((i) => !i.bone); ration.life = true; __game.player.x = ration.x - 4; __game.player.y = ration.y - 4; __game.tick(0.01);
      return { afterBone, afterRation: __game.lives, toast1 };
    });
    ok(lifeBone.afterBone === 3 && lifeBone.afterRation === 4 && /Vida extra/.test(lifeBone.toast1), `pegar um osso com a vida escondida dá +1 vida (2 → ${lifeBone.afterBone}) e pegar uma ração com vida também (→ ${lifeBone.afterRation})`);
    // ao perder vidas, os itens que faltam mudam de lugar, mas nunca caem no trilho de um bloco nem em cima de um item já pego
    const reloc = await ev(page, () => {
      __game.start(3); __game.noCatch = false; __game.setRand(() => Math.random());
      const track = new Set(); for (const b of __game.levels[2].blocks) for (const [c, r] of [b.from, b.to]) track.add(c + "," + r);
      let bad = 0, n = 0;
      const first = __game.items[0]; __game.freezeVets = true; __game.player.x = first.x - 4; __game.player.y = first.y - 4; __game.tick(0.01); // um item já pego
      for (let k = 0; k < 150; k++) {
        __game.freezeVets = false; for (const v of __game.vets) v.cool = 99; __game.setLives(5);
        for (let i = 0; i < 45; i++) __game.tick(0.05); // passa a proteção
        const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); n++;
        const tiles = __game.items.map((it) => (it.x - 8) / 32 + "," + (it.y - 8) / 32);
        if (new Set(tiles).size !== tiles.length) bad++;
        if (__game.items.some((it) => !it.taken && track.has((it.x - 8) / 32 + "," + (it.y - 8) / 32))) bad++;
      }
      __game.setRand(null); return { bad, n };
    });
    ok(reloc.bad === 0, `em ${reloc.n} trocas de lugar na Fase 3 nenhum item caiu no trilho de um bloco nem em cima de outro item (${reloc.bad})`);

    // ---- veterinários: +10% de velocidade sobre a Fase 2 ----
    const cf = await ev(page, () => { __game.start(2); const f2 = { ...__game.vets[0].cfg }; __game.start(3); return { f2, f3a: { ...__game.vets[0].cfg }, f3b: { ...__game.vets[1].cfg } }; });
    ok(cf.f3a.speed === 66.55 && cf.f3a.chaseSpeed === 133.1 && cf.f2.speed === 60.5 && cf.f2.chaseSpeed === 121, `Fase 3: veterinários a ${cf.f3a.speed} px/s sem o "!" e ${cf.f3a.chaseSpeed} com o "!" (Fase 2: ${cf.f2.speed} e ${cf.f2.chaseSpeed}, +10%)`);
    ok(Math.abs(cf.f3a.speed / cf.f2.speed - 1.1) < 1e-9 && Math.abs(cf.f3a.chaseSpeed / cf.f2.chaseSpeed - 1.1) < 1e-9, "a velocidade de movimento da Fase 3 é exatamente 10% maior que a da Fase 2, nos dois modos");
    ok(["chaseChance", "chaseTime", "chaseMax", "thinkEvery", "restTime", "idleMin", "idleMax"].every((k) => cf.f3a[k] === cf.f2[k]) && JSON.stringify(cf.f3a) === JSON.stringify(cf.f3b) && cf.f3a.chaseSpeed < 226.8 / 1.4, "o resto do comportamento é o da Fase 2 (menos o alcance do !, que é de 6 quadrados), os 2 veterinários são iguais e o cachorro (324 px/s) segue mais rápido");

    // ---- cachorrinho: 252 px/s (0,7 × os 360 da 0.6.0), 10% mais lento na Fase 3 e +10% por osso ----
    const run1s = (id, x, y, bones = 0) => ev(page, ([id, x, y, bones]) => { __game.start(id); __game.freezeVets = true; __game.noCatch = true; __game.player.x = x; __game.player.y = y; const x0 = __game.player.x; const first = __game.dogSpeed; for (let k = 0; k < bones; k++) { const b = __game.items.find((i) => i.bone && !i.taken); const px = __game.player.x, py = __game.player.y; __game.player.x = b.x - 4; __game.player.y = b.y - 4; __game.tick(0.01); __game.player.x = px; __game.player.y = py; } __game.items.forEach((i) => { if (!i.taken) { i.x = -500; i.y = -500; } }); const x1 = __game.player.x; __t.hold("d", 60); return [first, __game.dogSpeed, __game.player.x - x1]; }, [id, x, y, bones]);
    const sp1 = await run1s(1, 36, 16 * 32 + 4), sp2 = await run1s(2, 36, 14 * 32 + 4), sp3 = await run1s(3, 36, 15 * 32 + 4);
    ok(sp1[0] === 252 && sp2[0] === 252 && Math.abs(sp3[0] - 226.8) < 1e-9, `velocidade do cachorrinho (0,7 × a da 0.6.0): ${sp1[0]} px/s nas Fases 1 e 2 e ${sp3[0]} px/s na Fase 3 (10% mais lento)`);
    ok(Math.abs(sp1[2] - 252) < 1.5 && Math.abs(sp2[2] - 252) < 1.5 && Math.abs(sp3[2] - 226.8) < 1.5, `andando 1 s de verdade: ${sp1[2].toFixed(0)} px, ${sp2[2].toFixed(0)} px e ${sp3[2].toFixed(0)} px`);
    const b1 = await run1s(2, 36, 14 * 32 + 4, 1), b2 = await run1s(2, 36, 14 * 32 + 4, 2), b3 = await run1s(3, 36, 15 * 32 + 4, 2);
    ok(Math.abs(b1[1] - 277.2) < 1e-6 && Math.abs(b2[1] - 302.4) < 1e-6 && Math.abs(b3[1] - 272.16) < 1e-6, `cada osso pego deixa o cachorrinho 10% mais rápido (Fase 2: 252 → ${b1[1]} com 1 osso → ${b2[1]} com 2; Fase 3 com 2 ossos: ${b3[1]})`);
    ok(Math.abs(b1[2] - 277.2) < 2 && Math.abs(b2[2] - 302.4) < 2, `e andando 1 s de verdade ele percorre ${b1[2].toFixed(0)} px com 1 osso e ${b2[2].toFixed(0)} px com 2`);

    // ---- blocos: ciclo fixo, mudam de lado a cada 3 s, sem esperar ninguém ----
    await ev(page, () => { __game.start(3); __game.freezeVets = true; __game.noCatch = true; });
    const at = (t) => ev(page, (t) => { __game.start(3); __game.freezeVets = true; __game.noCatch = true; const out = []; let now = 0; for (const target of t) { while (now < target - 1e-9) { const dt = Math.min(0.01, target - now); __game.tick(dt); now += dt; } out.push(__game.blocks.map((b) => [Math.round(b.x), Math.round(b.y)])); } return out; }, t);
    const pos = await at([0, 1.5, 2.9, 3.1, 3.5, 5.5, 6.1, 6.5, 9.5, 12.5]);
    ok(JSON.stringify(pos[0]) === "[[224,96],[544,128]]", "no início: a porta 1 está fechada (bloco no corredor, em 7,3) e a porta 2 aberta (bloco no nicho, em 17,4)");
    ok(JSON.stringify(pos[1]) === "[[224,96],[544,128]]" && JSON.stringify(pos[2]) === "[[224,96],[544,128]]", "os blocos ficam parados até os 3 s");
    ok(pos[3][0][1] < 96 && pos[3][0][1] > 64 && pos[3][1][1] < 128 && pos[3][1][1] > 96, "aos 3,1 s os dois blocos estão deslizando (um abre, o outro fecha)");
    ok(JSON.stringify(pos[4]) === "[[224,64],[544,96]]", "aos 3,5 s a porta 1 abriu (bloco no nicho, em 7,2) e a porta 2 fechou (bloco no corredor, em 17,3)");
    ok(JSON.stringify(pos[5]) === "[[224,64],[544,96]]", "e ficam assim até os 6 s");
    ok(pos[6][0][1] > 64 && pos[6][0][1] < 96 && pos[6][1][1] > 96 && pos[6][1][1] < 128, "aos 6,1 s mudam de lado de novo (a porta 1 fecha e a 2 abre)");
    ok(JSON.stringify(pos[7]) === "[[224,96],[544,128]]" && JSON.stringify(pos[8]) === "[[224,64],[544,96]]" && JSON.stringify(pos[9]) === "[[224,96],[544,128]]", "o ciclo se repete a cada 3 s: aos 6,5 s, 9,5 s e 12,5 s os lados são os esperados");
    ok(pos.every((p) => p.every(([x]) => x === 224 || x === 544)), "os blocos só andam no sentido do trilho (colunas 7 e 17)");
    // medindo: quando cada bloco começa a deslizar, quanto demora e a que velocidade
    const timing = await ev(page, () => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true;
      const starts = [], ends = []; let prev = __game.blocks[0].y, moving = false, t0 = 0, maxV = 0, t = 0;
      for (let i = 0; i < 2000; i++) {
        __game.tick(0.01); t += 0.01; const y = __game.blocks[0].y, v = Math.abs(y - prev) / 0.01; prev = y;
        maxV = Math.max(maxV, v);
        if (!moving && v > 0) { moving = true; t0 = t; starts.push(+t.toFixed(2)); }
        else if (moving && v === 0) { moving = false; ends.push(+(t - t0).toFixed(2)); }
      }
      return { starts, ends, maxV, every: __game.blocks[0].def.every, speed: 32 / __game.blocks[0].def.slide };
    });
    ok(timing.starts.length >= 6 && timing.starts.every((s, i) => Math.abs(s - 3 * (i + 1)) <= 0.03), `os blocos começam a mudar de lado a cada 3 s (${timing.starts.slice(0, 6).join(", ")}...) sem esperar ninguém`);
    ok(timing.every === 3 && Math.abs(timing.speed - 120) < 1e-6 && timing.maxV <= 121 && timing.maxV >= 119 && timing.ends.every((d) => d >= 0.25 && d <= 0.29), `cada mudança leva ~0,27 s (antes 0,53 s): a 120 px/s, o dobro da velocidade de antes (${timing.maxV.toFixed(0)} px/s; durações ${timing.ends.slice(0, 3).join(", ")} s)`);

    // ---- o trilho pisca em amarelo logo antes de cada mudança ----
    const railYellow = (secs) => ev(page, (secs) => new Promise((resolve) => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true; __t.run(Math.round(secs * 60));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const c = document.getElementById("game").getContext("2d"), k = __game.view.k;
        const d = c.getImageData(Math.round(236 * k), Math.round(82 * k), Math.round(8 * k), Math.round(12 * k)).data; let n = 0; // o trilho da porta 1, na parte que o bloco fechado não cobre
        for (let i = 0; i < d.length; i += 4) if (d[i] > 80 && d[i + 2] < 95) n++;
        resolve(n);
      }));
    }), secs);
    await page.waitForTimeout(100);
    const quiet = await railYellow(1.0), warnOn = await railYellow(2.5), calmAgain = await railYellow(3.4 + 0.05);
    ok(quiet === 0 && warnOn > 20 && calmAgain === 0, `o trilho avisa: sem aviso aos 1,0 s (${quiet}), amarelo aos 2,5 s (${warnOn} pixels), e já sem aviso depois da mudança (${calmAgain})`);

    // ---- blocos: o cachorro não passa por bloco fechado, passa pela porta aberta ----
    await ev(page, () => { __game.start(3); __game.freezeVets = true; __game.noCatch = true; __game.player.x = 6 * 32 + 4; __game.player.y = 3 * 32 + 4; });
    await ev(page, () => __t.hold("d", 60)); // 1 s: a porta 1 está fechada
    const stopped = await ev(page, () => __game.player.x);
    ok(stopped <= 7 * 32 - 24 + 0.5 && stopped > 6 * 32, `o bloco fechado barra o cachorro (parou em x=${stopped.toFixed(0)}, antes do bloco em x=224)`);
    await ev(page, () => { __t.run(200); }); // passa dos 3 s: a porta abre
    await ev(page, () => __t.hold("d", 60));
    ok(await ev(page, () => __game.player.x) > 8 * 32, "com a porta aberta o cachorro passa pelo corredor");
    ok(await ev(page, () => { __game.start(3); __game.freezeVets = true; __game.noCatch = true; __game.player.x = 16 * 32 + 4; __game.player.y = 3 * 32 + 4; __t.hold("d", 70); return __game.player.x; }) > 19 * 32, "a porta 2, aberta no início, deixa o cachorro passar");
    ok(await ev(page, () => { __game.start(3); __game.freezeVets = true; __game.noCatch = true; __t.run(260); __game.player.x = 16 * 32 + 4; __game.player.y = 3 * 32 + 4; __t.hold("d", 70); return __game.player.x; }) < 17 * 32 - 24 + 0.5, "e depois de fechar (aos 3 s) o bloco da porta 2 barra a passagem");

    // ---- blocos não esperam ninguém e nunca esmagam: quem está no caminho é empurrado para o lado ----
    const shove = await ev(page, () => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true;
      __t.run(260); // 4,3 s: porta 1 aberta (bloco no nicho em 7,2); ela fecha de novo aos 6 s
      __game.player.x = 7 * 32 + 2; __game.player.y = 3 * 32 + 4; // o cachorro parado no corredor, no lugar onde o bloco vai descer (mais perto do lado esquerdo)
      let overlapTicks = 0, arrivedAt = null, t = 4.33;
      for (let i = 0; i < 60 * 3; i++) {
        __game.tick(1 / 60); t += 1 / 60; const b = __game.blocks[0], p = __game.player;
        if (b.x < p.x + p.w && b.x + 32 > p.x && b.y < p.y + p.h && b.y + 32 > p.y) overlapTicks++;
        if (arrivedAt === null && b.y === 96) arrivedAt = t;
      }
      const p = __game.player;
      return { overlapTicks, arrivedAt, x: p.x, y: p.y, closed: __game.blocks[0].y === 96 };
    });
    ok(shove.overlapTicks === 0 && shove.closed && shove.arrivedAt !== null && shove.arrivedAt < 6.35, `o cachorro parado no caminho não faz o bloco esperar: ele fecha a porta no horário (aos ${shove.arrivedAt && shove.arrivedAt.toFixed(2)} s) e ninguém é esmagado`);
    ok(shove.x < 7 * 32 - 24 + 0.5 && shove.x > 6 * 32 && shove.y >= 3 * 32 && shove.y <= 4 * 32 - 24 + 0.01, `o cachorro foi empurrado para o lado livre mais perto (agora em x=${shove.x.toFixed(1)}, y=${shove.y}) e continua dentro do corredor`);
    const shoveVet = await ev(page, () => {
      __game.start(3); __game.noCatch = true; __game.freezeVets = false; __game.setRand(() => 0.99);
      __t.run(260); const v = __game.vets[0], o = __game.vets[1];
      for (const x of __game.vets) { x.cool = 999; x.idle = 99; x.leg = null; x.route = []; }
      o.cx = 12 * 32 + 16; o.cy = 9 * 32 + 16; __game.player.x = 3 * 32 + 4; __game.player.y = 1 * 32 + 4;
      v.cx = 7 * 32 + 16; v.cy = 3 * 32 + 16; // o veterinário parado onde o bloco da porta 1 vai descer
      let overlap = 0, arrivedAt = null, t = 4.33;
      for (let i = 0; i < 60 * 3; i++) {
        __game.tick(1 / 60); t += 1 / 60; const b = __game.blocks[0];
        if (b.x < v.cx + 12 && b.x + 32 > v.cx - 12 && b.y < v.cy + 12 && b.y + 32 > v.cy - 12) overlap++;
        if (arrivedAt === null && b.y === 96) arrivedAt = t;
      }
      __game.setRand(null);
      return { overlap, arrivedAt, cx: v.cx, cy: v.cy, leg: v.leg };
    });
    ok(shoveVet.overlap === 0 && shoveVet.arrivedAt !== null && shoveVet.arrivedAt < 6.35, `um veterinário no caminho também não faz o bloco esperar nem é esmagado (fechou aos ${shoveVet.arrivedAt && shoveVet.arrivedAt.toFixed(2)} s)`);
    ok((shoveVet.cx === 6 * 32 + 16 || shoveVet.cx === 8 * 32 + 16) && shoveVet.cy === 3 * 32 + 16, `o veterinário foi empurrado para o centro do tile livre mais perto (agora em ${shoveVet.cx},${shoveVet.cy})`);
    // sem nenhum lugar para empurrar (cachorro dentro do nicho, com o bloco logo abaixo): o bloco fica parado em vez de esmagar
    const stuck = await ev(page, () => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true;
      __game.player.x = 7 * 32 + 4; __game.player.y = 2 * 32 + 4; // dentro do nicho (7,2), onde o bloco da porta 1 entraria
      let overlapTicks = 0, minY = 99;
      for (let i = 0; i < 60 * 5; i++) {
        __game.tick(1 / 60); const b = __game.blocks[0], p = __game.player;
        if (b.x < p.x + p.w && b.x + 32 > p.x && b.y < p.y + p.h && b.y + 32 > p.y) overlapTicks++;
        minY = Math.min(minY, b.y);
      }
      return { overlapTicks, minY };
    });
    ok(stuck.overlapTicks === 0, `se não houver para onde empurrar, o bloco simplesmente não anda: nunca esmaga (${stuck.overlapTicks} sobreposições)`);
    const fuzz = await ev(page, () => {
      __game.start(3); __game.freezeVets = false; __game.noCatch = true; __game.setRand(() => Math.random());
      let bad = 0, ticks = 0, vetOnTrack = 0;
      const rects = () => __game.blocks.map((b) => ({ x: b.x, y: b.y, w: 32, h: 32 }));
      const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      const spots = [[6, 3], [7, 3], [8, 3], [7, 2], [16, 3], [17, 3], [18, 3], [17, 4], [9, 3], [15, 3]];
      for (let i = 0; i < 60 * 150; i++) {
        if (i % 7 === 0) { // o cachorro e os veterinários são colocados perto das portas, em lugares livres de bloco naquele instante
          const [c, r] = spots[Math.floor(Math.random() * spots.length)], body = { x: c * 32 + 4, y: r * 32 + 4, w: 24, h: 24 };
          if (!rects().some((b) => hit(b, body))) { __game.player.x = body.x; __game.player.y = body.y; }
          const v = __game.vets[i % 2], [c2, r2] = spots[Math.floor(Math.random() * spots.length)], vb = { x: c2 * 32 + 4, y: r2 * 32 + 4, w: 24, h: 24 };
          if (!rects().some((b) => hit(b, vb))) { v.cx = c2 * 32 + 16; v.cy = r2 * 32 + 16; v.leg = null; v.route = []; }
        }
        __game.tick(1 / 60); ticks++;
        const p = __game.player, pb = { x: p.x, y: p.y, w: 24, h: 24 };
        if (rects().some((b) => hit(b, pb))) bad++;
        for (const v of __game.vets) if (rects().some((b) => hit(b, { x: v.cx - 12, y: v.cy - 12, w: 24, h: 24 }))) bad++;
      }
      __game.setRand(null);
      return { bad, ticks };
    });
    ok(fuzz.bad === 0, `em ${fuzz.ticks} quadros (150 s) com o cachorro e os veterinários jogados nas portas, nenhum bloco sobrepôs ninguém (${fuzz.bad} sobreposições)`);

    // ---- veterinários e blocos ----
    const vetDoor = await ev(page, () => {
      __game.start(3); __game.noCatch = true; __game.freezeVets = false;
      const v = __game.vets[0], p = __game.player; for (const x of __game.vets) { x.cool = 99; }
      __game.setRand(() => 0);
      const place = () => { v.cx = 6 * 32 + 16; v.cy = 3 * 32 + 16; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 5; v.cfg = { ...v.cfg, chaseChance: 1 };
        __game.vets[1].cx = 12 * 32 + 16; __game.vets[1].cy = 9 * 32 + 16; p.x = 9 * 32 + 4; p.y = 3 * 32 + 4; }; // o veterinário de um lado da porta 1 e o cachorro do outro
      place();
      let chased = false; for (let i = 0; i < 90; i++) { __game.tick(1 / 60); if (v.mode === "chase") chased = true; } // 1,5 s com a porta fechada
      const closedWall = { chased, x: v.cx };
      __game.freezeVets = true; __t.run(150); __game.freezeVets = false; // a porta abre (aos ~3,5 s)
      place();
      let chasedAfter = false; for (let i = 0; i < 60; i++) { __game.tick(1 / 60); if (v.mode === "chase") chasedAfter = true; }
      __game.setRand(null);
      return { closedWall, chasedAfter };
    });
    ok(!vetDoor.closedWall.chased && vetDoor.closedWall.x < 7 * 32, "o bloco fechado tapa a visão: o veterinário não vê o cachorro do outro lado da porta nem passa");
    ok(vetDoor.chasedAfter, "com a porta aberta ele vê o cachorro e passa a perseguir");
    // um veterinário que vai passar pela porta fechada ESPERA diante dela (sem entrar no bloco)
    const vetWait = await ev(page, () => {
      __game.start(3); __game.noCatch = true; __game.freezeVets = false; __game.setRand(() => 0.99);
      for (const x of __game.vets) { x.cool = 999; x.idle = 99; x.leg = null; x.route = []; }
      const v = __game.vets[0]; __game.player.x = 3 * 32 + 4; __game.player.y = 3 * 32 + 4;
      v.cx = 6 * 32 + 16; v.cy = 3 * 32 + 16; v.idle = 0; v.leg = [7, 3]; v.route = []; // já indo para o tile da porta 1 (fechada no começo)
      let minGap = 99, overlap = 0; const b = () => __game.blocks[0];
      for (let i = 0; i < 100; i++) { __game.tick(0.01); if (v.cx + 12 > b().x + 0.01 && v.cx - 12 < b().x + 32) overlap++; minGap = Math.min(minGap, b().x - (v.cx + 12)); }
      __game.setRand(null);
      return { x: v.cx, overlap, minGap, closed: b().y === 96 };
    });
    ok(vetWait.closed && vetWait.overlap === 0 && vetWait.minGap >= -0.01 && vetWait.x > 6 * 32 + 16 && vetWait.x <= 7 * 32 - 12 + 0.01, `o veterinário que vai para a porta fechada anda até encostar e ESPERA diante dela (parou em x=${vetWait.x.toFixed(1)}, sem entrar no bloco que começa em x=224)`);
    const vetsWalk = await ev(page, () => {
      __game.start(3); __game.noCatch = true; __game.freezeVets = false;
      const crossed = new Set(); let overlaps = 0, waits = 0; const prev = __game.vets.map((v) => [v.cx, v.cy]);
      const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      for (let i = 0; i < 60 * 600; i++) {
        __game.tick(1 / 30);
        __game.vets.forEach((v, k) => {
          const [c, r] = [Math.floor(v.cx / 32), Math.floor(v.cy / 32)];
          if ((c === 7 && r === 3) || (c === 17 && r === 3)) crossed.add(c + "," + r);
          for (const b of __game.blocks) if (hit({ x: b.x, y: b.y, w: 32, h: 32 }, { x: v.cx - 12, y: v.cy - 12, w: 24, h: 24 })) overlaps++;
          if (v.leg && v.idle <= 0 && v.cx === prev[k][0] && v.cy === prev[k][1]) waits++; // com um destino e parado: esperando um bloco
          prev[k] = [v.cx, v.cy];
        });
      }
      return { crossed: [...crossed], overlaps, waits };
    });
    ok(vetsWalk.crossed.length >= 1 && vetsWalk.overlaps === 0 && vetsWalk.waits >= 1, `em 20 minutos simulados de patrulha os veterinários atravessam os corredores das portas (${vetsWalk.crossed.join(" e ") || "nenhum"}), esperaram diante de bloco fechado ${vetsWalk.waits} vezes e nunca sobrepuseram um bloco (${vetsWalk.overlaps})`);

    // ---- pontuação: osso vale 150 (50 + 100 de bônus); bônus de 20 por degrau; todos os itens para sair ----
    await playLevel(page, 3, { done: [1, 2] });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; });
    const grabKind = (bone) => ev(page, (bone) => { const it = __game.items.find((i) => !i.taken && !!i.bone === bone); __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); return [__game.collected, __game.bonesGot, __game.score]; }, bone);
    let g = await grabKind(true);
    ok(g[1] === 1 && g[2] === 150 && await hudIs(page, "#hud-points", "150") && await hudIs(page, "#hud-bones", "1/2"), "um osso dá 150 pontos: 50 do osso + 100 de bônus (placar: OSSOS 1/2, PONTOS 150)");
    g = await grabKind(false);
    ok(g[0] === 1 && g[2] === 250, "e uma ração, 100 pontos (250 no total)");
    ok(await hudIs(page, "#hud-bonus", "+200"), "o bônus de tempo da Fase 3 começa em +200");
    await ev(page, () => { for (let i = 0; i < 420; i++) __game.tick(0.05); });
    ok(await hudIs(page, "#hud-bonus", "+180"), "depois de 21 s cai 20 pontos: +180");
    await ev(page, () => { for (let i = 0; i < 200; i++) __game.tick(0.05); });
    ok(await hudIs(page, "#hud-bonus", "+160"), "depois de 31 s: +160 (20 a cada 10 s)");
    ok(/20 pontos|menos 20/.test(await page.getAttribute("#hud-bonus-item", "title")), "a dica do bônus no placar fala em 20 pontos por degrau");
    // sair sem todos os itens não vence
    await playLevel(page, 3, { done: [1, 2] });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; for (const it of __game.items.filter((i) => !i.bone)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } __t.run(200); /* o aviso de vida extra, se houver, já passou */ const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); });
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.collected) === 7 && /ossos/.test(await page.textContent("#toast")), "com as 7 rações mas sem os ossos a saída não abre (avisa que faltam os ossos)");
    await ev(page, () => { __game.player.x = 36; __game.player.y = 36; for (const it of __game.items.filter((i) => i.bone)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); });
    ok(await ev(page, () => __game.state) === "won", "com os 2 ossos também, ela abre e a fase termina");
    await playLevel(page, 3, { done: [1, 2] });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; for (const it of __game.items.filter((i) => i.bone)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); });
    ok(await ev(page, () => __game.state) === "playing", "só com os ossos (sem as rações) a fase também não termina");

    // ---- vitória na Fase 3 ----
    await playLevel(page, 3, { done: [1, 2] });
    await finishNow(page, 10);
    const wb = await page.textContent("#win-breakdown"), wp = Number(await page.textContent("#win-points"));
    ok(await ev(page, () => __game.state) === "won" && /Fase 3 concluída/.test(await page.textContent("#win-title")), "a Fase 3 termina com todos os itens");
    ok(/Rações: 700 \+ ossos: 300 \+ bônus de tempo: 200/.test(wb) && wp === 1200, `pontuação = 700 (rações) + 300 (ossos) + 200 (bônus até 20 s) = ${wp} (${wb})`);
    ok(await page.isVisible("#btn-next") && /Fase 4/.test(await page.textContent("#btn-next")), "depois da Fase 3 vem a Fase 4: o botão Próxima fase aparece");
    const rec3 = await ev(page, () => { const st = Records.createStore(localStorage); return { l3: st.personalBest("Totó", 3), total: st.totalScore("Totó", [1, 2, 3]), done: st.progress("Totó").completed }; });
    ok(rec3.l3 && rec3.l3.p === wp && rec3.total === wp && rec3.done.includes(3), "a pontuação da Fase 3 é guardada à parte e entra na soma das fases");
    // com vidas perdidas e tentativas
    await ev(page, () => __game.start(3, { retries: 2 }));
    await ev(page, () => { __game.freezeVets = true; for (const v of __game.vets) v.cool = 99; const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); });
    await finishNow(page, 10);
    ok(Number(await page.textContent("#win-points")) === 1200 - 50 - 200 && /vidas perdidas: 50/.test(await page.textContent("#win-breakdown")) && /tentativas extras: 200/.test(await page.textContent("#win-breakdown")), "−50 por vida perdida e −100 por nova tentativa também valem na Fase 3");

    // ---- fases bloqueadas / liberadas e próxima fase ----
    await fresh(page, { done: [1] }); await page.click("#btn-start");
    ok(await page.isDisabled("#levels-list button:nth-child(3)") && /bloqueada: termine a Fase 2/.test(await page.textContent("#levels-list button:nth-child(3)")), "só com a Fase 1 concluída, a Fase 3 está bloqueada (termine a Fase 2)");
    await fresh(page, { done: [1, 2] }); await page.click("#btn-start");
    ok(await page.isEnabled("#levels-list button:nth-child(3)") && /2 veterinários · ossos, poder e blocos móveis/.test(await page.textContent("#levels-list button:nth-child(3)")), "com a Fase 2 concluída, a Fase 3 está liberada e avisa dos ossos, do poder e dos blocos móveis");
    await page.click("#levels-list button:nth-child(3)");
    ok(await ev(page, () => __game.level) === 3 && /Fase 3: 2 veterinários/.test(await page.textContent("#toast")), "escolher a Fase 3 começa a Fase 3");
    await playLevel(page, 2, { done: [1] }); await ev(page, () => { __game.freezeVets = true; __game.setLives(2); });
    const f2extra = await ev(page, () => __game.items.filter((i) => i.life).length);
    await finishNow(page, 10);
    await page.click("#btn-next");
    ok(await ev(page, () => __game.level) === 3 && await ev(page, () => __game.lives) === 2 + f2extra && await ev(page, () => __game.items.length) === 9, `Próxima fase depois da Fase 2 leva à Fase 3 com as vidas acumuladas (2 + ${f2extra} da Fase 2 = ${2 + f2extra})`);
    ok(await page.isHidden("#hud-retry-item"), "(sem tentativas extras no início da fase)");

    // ---- tentativas na Fase 3 recomeçam a Fase 3 do zero (blocos incluídos) ----
    await ev(page, () => { __game.freezeVets = true; __t.run(120); });
    for (let k = 0; k < 5; k++) await catchOnce(page);
    ok(await ev(page, () => __game.state) === "lost" && /Fase 3/.test(await page.textContent("#lose-chances")) && /Ossos: 0\/2/.test(await page.textContent("#lose-text")), "sem vidas na Fase 3: a mensagem fala da Fase 3 e mostra os ossos");
    await page.click("#btn-retry");
    ok(await ev(page, () => [__game.level, __game.items.length, __game.retries, __game.lives, JSON.stringify(__game.blocks.map((b) => [b.x, b.y]))].join("|")) === "3|9|1|3|[[224,96],[544,128]]", "nova tentativa: Fase 3 do zero (9 itens, 3 vidas, blocos de volta ao início)");

    // ---- salvar e continuar com blocos e ossos ----
    await playLevel(page, 3, { done: [1, 2], keepSave: true });
    const before = await ev(page, () => {
      __game.freezeVets = true; __game.noCatch = true;
      const bone = __game.items.find((i) => i.bone), ration = __game.items.find((i) => !i.bone);
      for (const it of [bone, ration]) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
      __game.player.x = 36; __game.player.y = 36;
      __t.run(300); // 5 s: as portas no meio do ciclo
      __game.save();
      return { items: __game.items.map((i) => [i.x, i.y, i.taken, i.life, i.bone]), blocks: __game.blocks.map((b) => [Math.round(b.x), Math.round(b.y), +b.bt.toFixed(2)]), bones: __game.bonesGot, got: __game.collected, time: __game.time };
    });
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    ok(await page.isVisible("#btn-continue") && /1\/7 rações · 1\/2 ossos/.test(await page.textContent("#menu-save")) && /Fase 3/.test(await page.textContent("#menu-save")), "o menu descreve o jogo salvo da Fase 3 (rações e ossos pegos)");
    await page.click("#btn-continue");
    const after = await ev(page, () => ({ items: __game.items.map((i) => [i.x, i.y, i.taken, i.life, i.bone]), blocks: __game.blocks.map((b) => [Math.round(b.x), Math.round(b.y), +b.bt.toFixed(2)]), bones: __game.bonesGot, got: __game.collected, level: __game.level }));
    ok(after.level === 3 && JSON.stringify(after.items) === JSON.stringify(before.items) && after.bones === 1 && after.got === 1, "continuar: mesma fase, mesmos itens (rações, ossos e a vida escondida) e os já pegos continuam pegos");
    ok(after.blocks.every((b, i) => b[0] === before.blocks[i][0] && b[1] === before.blocks[i][1] && b[2] >= before.blocks[i][2] && b[2] < before.blocks[i][2] + 1), `continuar: os blocos voltam ao mesmo ponto do ciclo (antes ${JSON.stringify(before.blocks)}, depois ${JSON.stringify(after.blocks)})`);
    // jogos salvos adulterados da Fase 3
    const snap3 = await ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; });
    ok(snap3.v === 4 && snap3.items.every((i) => i.length === 5) && Array.isArray(snap3.bl) && snap3.bl.length === 2, "o jogo salvo da Fase 3 guarda o tipo de cada item e o ponto do ciclo dos 2 blocos");
    const parse = (sv) => ev(page, (sv) => __game.parseSave(sv), sv);
    const cl = (o) => JSON.parse(JSON.stringify(o));
    ok(await parse(snap3), "(controle) o save original é válido");
    const t1 = cl(snap3); t1.items.forEach((i) => { i[4] = 0; });
    const t2 = cl(snap3); t2.items.forEach((i, k) => { i[4] = k < 3 ? 1 : 0; });
    const t3 = cl(snap3); t3.items.forEach((i) => { i[3] = 0; });
    const t4 = cl(snap3); t4.items.forEach((i, k) => { i[3] = k < 3 ? 1 : 0; }); // 3 vidas escondidas (a Fase 3 tem 1 ou 2)
    const t5 = cl(snap3); delete t5.bl;
    const t6 = cl(snap3); t6.bl = [0];
    const t7 = cl(snap3); t7.items[0][0] = 7; t7.items[0][1] = 3;
    const t8 = cl(snap3); t8.p = { x: 0, y: 0, f: "right" }; // o cachorro dentro da parede
    const t9 = cl(snap3); t9.v = 3; t9.items = t9.items.map((i) => i.slice(0, 4)); delete t9.bl;
    const t10 = cl(snap3); t10.bl = [-1, 0];
    const t11 = cl(snap3); t11.items = t11.items.slice(0, 8);
    const t13 = cl(snap3); t13.items[0][0] = 0; t13.items[0][1] = 0;                 // item dentro de uma parede
    const t14 = cl(snap3); t14.vets[0] = [10, 10];                                  // veterinário dentro de uma parede
    const t15 = cl(snap3); t15.time = -5;                                           // tempo negativo
    const rs = [];
    for (const t of [t1, t2, t3, t4, t5, t6, t7, t8, t9, t10, t11, t13, t14, t15]) rs.push(await parse(t));
    ok(rs.every((r) => r === false), `saves adulterados da Fase 3 são recusados (0 ossos, 3 ossos, sem vida escondida, 3 vidas, sem blocos, bloco a menos, item no trilho, cachorro dentro da parede, formato antigo, relógio negativo, item a menos, item na parede, veterinário na parede, tempo negativo): ${rs.map((r) => (r ? "V" : "x")).join("")}`);
    // um jogo salvo com o cachorro no lugar de um bloco (os blocos agora andam num ciclo novo) é aceito: ao carregar, ele é empurrado para fora
    const t12 = cl(snap3); t12.p = { x: 7 * 32 + 2, y: 3 * 32 + 4, f: "right" }; t12.bl = [0, 0];
    ok(await parse(t12), "um jogo salvo com o cachorro no lugar de um bloco é aceito (ele é empurrado para o lado ao carregar)");
    await ev(page, (sv) => { const key = "cachorrinho.save.v1", d = JSON.parse(localStorage.getItem(key)); d.saves.toto.snap = sv; localStorage.setItem(key, JSON.stringify(d)); }, t12);
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    await page.click("#btn-continue");
    const shoved = await ev(page, () => { const p = __game.player, b = __game.blocks[0]; return { over: b.x < p.x + p.w && b.x + 32 > p.x && b.y < p.y + p.h && b.y + 32 > p.y, state: __game.state }; });
    ok(shoved.state === "playing" && !shoved.over, "ao continuar esse jogo o cachorro já não está dentro do bloco");
    // formato antigo (0.4.0) das fases 1 e 2 continua aceito
    await playLevel(page, 1, { keepSave: true });
    const old = await ev(page, () => { __game.save(); const sn = JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; sn.v = 3; sn.items = sn.items.map((i) => i.slice(0, 4)); delete sn.bl; return sn; });
    ok(await parse(old), "um jogo salvo da 0.4.0 (formato v3, Fase 1) continua sendo aceito");
    const old2 = cl(old); old2.l = 3;
    ok(!(await parse(old2)), "mas o formato v3 não vale para a Fase 3 (que tem ossos e blocos)");

    // ---- desenho: osso e blocos aparecem ----
    await playLevel(page, 3, { done: [1, 2] });
    await ev(page, () => { __game.freezeVets = true; });
    const draw = await ev(page, () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
      const cv = document.getElementById("game"), c = cv.getContext("2d"), k = __game.view.k;
      const count = (x, y, w, h, test) => { const d = c.getImageData(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (test(d[i], d[i + 1], d[i + 2])) n++; return n; };
      const bone = __game.items.find((i) => i.bone), blk = __game.blocks[0];
      resolve({ bone: count(bone.x - 4, bone.y - 8, 24, 24, (r, g, b) => r > 235 && g > 230 && b > 210), block: count(blk.x, blk.y, 32, 32, (r, g, b) => r > 230 && g > 180 && b < 90) });
    }))));
    for (const vp of [{ width: 320, height: 568 }, { width: 390, height: 780 }, { width: 740, height: 390 }]) {
      const t = await newPage({ viewport: vp, hasTouch: true, isMobile: true });
      await fresh(t, { done: [1, 2] }); await t.evaluate(() => __game.start(3, { retries: 1, lives: 5 })); await t.waitForTimeout(200);
      const h = await ev(t, () => { const it = document.querySelector("#hud .hud-item"); return { label: parseFloat(getComputedStyle(it).fontSize), scroll: document.documentElement.scrollHeight - innerHeight, hscroll: document.documentElement.scrollWidth - innerWidth, bones: document.getElementById("hud-bones").getBoundingClientRect().width > 0 }; });
      ok(h.bones && h.label >= 10.5 && h.scroll <= 2 && h.hscroll <= 0, `Fase 3 em ${vp.width}x${vp.height}: o placar com OSSOS e TENTATIVAS continua legível (${h.label.toFixed(1)} px) e a página não rola`);
      await t.context().close();
    }
    // o placar não entra em laço de redimensionamento (campo piscando) em celulares em pé, na Fase 3 com tentativa
    for (const vp of [{ width: 360, height: 560 }, { width: 375, height: 562 }, { width: 375, height: 566 }, { width: 360, height: 568 }, { width: 414, height: 565 }, { width: 360, height: 556 }]) {
      const t = await newPage({ viewport: vp, hasTouch: true, isMobile: true });
      await fresh(t, { done: [1, 2] }); await t.evaluate(() => __game.start(3, { retries: 1, lives: 3 })); await t.waitForTimeout(500);
      const r = await t.evaluate(() => new Promise((resolve) => {
        const cv = document.getElementById("game"), st = document.getElementById("stage"); let last = st.getBoundingClientRect().width, changes = 0, blank = 0, frames = 0; const t0 = performance.now();
        const step = () => {
          const w = st.getBoundingClientRect().width; if (Math.abs(w - last) > 0.5) { changes++; last = w; }
          const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let colors = new Set(); for (let i = 0; i < d.length && colors.size < 3; i += 4 * 97) colors.add(d[i] + "," + d[i + 1] + "," + d[i + 2]);
          if (colors.size < 2) blank++; frames++;
          if (performance.now() - t0 < 1500) requestAnimationFrame(step); else resolve({ changes, blank, frames, scroll: document.documentElement.scrollHeight - innerHeight });
        };
        requestAnimationFrame(step);
      }));
      ok(r.changes <= 3 && r.blank <= 2 && r.scroll <= 2, `Fase 3 com tentativa em ${vp.width}x${vp.height}: o jogo para de mudar de tamanho depressa (${r.changes} trocas em 1,5 s), o campo não pisca em branco (${r.blank} de ${r.frames} quadros) e a página não rola (${r.scroll} px)`);
      await t.context().close();
    }
    ok(draw.bone > 10, `o osso é desenhado (${draw.bone} pixels claros)`);
    ok(draw.block > 20, `o bloco que se move é desenhado com os cantos de aviso amarelos (${draw.block} pixels)`);
  });

  // =====================================================================
  await section("Fase 4: labirinto grande, 3 veterinários, poder do osso, blocos que esmagam, 800 pontos", async () => {
    const L = await (async () => { await fresh(page); return ev(page, () => __game.levels[3]); })();
    const v4 = G4.find("V"), p4 = G4.find("P")[0], e4 = G4.find("E");
    // ---- mapa ----
    ok(G4.MAP.length === 29 && G4.MAP.every((row) => row.length === 41) && [...G4.MAP[0], ...G4.MAP[28], ...G4.MAP.map((r) => r[0]), ...G4.MAP.map((r) => r[40])].every((ch) => ch === "#"), "Fase 4: mapa de 41 × 29 tiles (maior que a tela), cercado por paredes");
    ok(v4.length === 3 && v4.every(([c, r]) => Math.abs(c - 20) <= 2 && Math.abs(r - 14) <= 2), `Fase 4: 3 veterinários, no centro do mapa (${v4.join(" e ")})`);
    ok(e4.length === 6 && G4.find("P").length === 1, "Fase 4: saída de 3 × 2 tiles e um só início");
    let corridors = 0, floors = 0;
    for (let r = 1; r < 28; r++) for (let c = 1; c < 40; c++) if (G4.free(c, r)) { floors++; const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => G4.free(c + dc, r + dr)).length; if (n <= 2) corridors++; }
    ok(floors > 450 && corridors / floors > 0.55, `Fase 4: é um labirinto (${corridors} dos ${floors} tiles livres são corredores, curvas ou pontas)`);
    const d4 = G4.distances(p4);
    ok([...e4, ...v4].every((t) => d4.has(t + "")) && d4.get(e4[0] + "") >= 60, `Fase 4: saída e veterinários alcançáveis; o caminho do início à saída tem ${d4.get(e4[0] + "")} passos`);
    ok(L.blocks.length === 3, "Fase 4: 3 blocos se movem");
    const ends = L.blocks.map((b) => [b.from, b.to]), track = new Set(ends.flat().map((e) => e + ""));
    ok(ends.every(([a, b]) => (a[0] === b[0] || a[1] === b[1]) && Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1 && G4.free(...a) && G4.free(...b)), "Fase 4: cada bloco desliza 1 tile entre duas casas livres (a porta e o nicho)");
    const comboOk = [];
    for (let mask = 0; mask < 1 << ends.length; mask++) {
      const blocked = new Set(ends.map((e, i) => e[(mask >> i) & 1] + ""));
      const floor = []; for (let r = 0; r < 29; r++) for (let c = 0; c < 41; c++) if (G4.free(c, r) && !track.has(c + "," + r)) floor.push([c, r]);
      const start = floor[0], seen = new Set([start + ""]), q = [start];
      for (const [c, r] of q) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c + dc, r + dr]; if (n[0] < 0 || n[1] < 0 || n[0] > 40 || n[1] > 28 || !G4.free(...n) || blocked.has(n + "") || seen.has(n + "")) continue; seen.add(n + ""); q.push(n); }
      comboOk.push(floor.every((t) => seen.has(t + "")));
    }
    ok(comboOk.length === 8 && comboOk.every(Boolean), "Fase 4: com os 3 blocos em qualquer posição (8 combinações) todo o chão fora dos trilhos continua alcançável");
    // as passagens dos blocos têm alternativa: fechar uma porta não isola nada (já conferido acima) e cada nicho é um beco de 1 tile
    ok(ends.every(([a, b]) => [a, b].some((n) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dc, dr]) => G4.free(n[0] + dc, n[1] + dr)).length === 1)), "Fase 4: cada nicho é um beco de 1 tile (só se entra por ele a partir da porta)");

    // ---- dados da fase ----
    ok(L.rations === 15 && L.bones === 2 && L.extraLives.join() === "3,3" && L.bonusStep === 20 && L.alertTiles === 8 && L.lifePenalty === 200 && L.minPoints === 800 && L.bonePower === 30 && L.crush === true, "Fase 4: 15 rações + 2 ossos, 3 vidas escondidas, ! a 8 quadrados, −200 por vida, mínimo de 800 pontos, poder do osso de 30 s e blocos que esmagam");
    await playLevel(page, 4, { done: [1, 2, 3] });
    ok(await ev(page, () => [__game.level, __game.items.length, __game.items.filter((i) => i.bone).length, __game.vets.length, __game.lives, __game.blocks.length].join()) === "4,17,2,3,3,3", "a Fase 4 começa com 17 itens (15 rações e 2 ossos), 3 veterinários, 3 vidas e 3 blocos");
    ok(/Fase 4: 3 veterinários · mínimo de 800 pontos/.test(await page.textContent("#toast")), "o aviso do começo fala dos 3 veterinários e dos 800 pontos");
    ok(await hudIs(page, "#hud-level", "4") && await hudIs(page, "#hud-items", "0/15") && await hudIs(page, "#hud-bones", "0/2") && await hudIs(page, "#hud-points", "0 / 800") && await page.isVisible("#hud-power-item") && await hudIs(page, "#hud-power", "—"), "placar: FASE 4, RAÇÕES 0/15, OSSOS 0/2, PONTOS 0 / 800 e PODER —");
    const lay = await ev(page, () => { const out = []; for (let i = 0; i < 150; i++) { __game.start(4); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32, it.bone ? 1 : 0, it.life ? 1 : 0])); } return out; });
    let bad = "";
    for (const items of lay) {
      if (items.length !== 17 || new Set(items.map((i) => i[0] + "," + i[1])).size !== 17) bad = "quantidade/repetidos";
      if (items.filter((i) => i[2]).length !== 2) bad = "ossos";
      if (items.filter((i) => i[3]).length !== 3) bad = "vidas escondidas (devem ser exatamente 3)";
      if (items.filter((i) => i[3] && i[2]).length > 1) bad = "vida nos dois ossos";
      for (const [c, r] of items) {
        if (!G4.free(c, r)) bad = "em parede/caixa";
        if (e4.some((t) => t[0] === c && t[1] === r)) bad = "na saída";
        if (track.has(c + "," + r)) bad = "no trilho de um bloco";
        if (!d4.has([c, r] + "")) bad = "inalcançável"; else if (d4.get([c, r] + "") < 4) bad = "perto do início";
        if (v4.some((v) => Math.hypot(c - v[0], r - v[1]) < 4)) bad = "perto de um veterinário";
      }
    }
    ok(!bad, `150 sorteios: sempre 15 rações + 2 ossos e exatamente 3 vidas escondidas (no máximo 1 num osso), em chão livre e alcançável, fora dos trilhos, longe do início/veterinários/saída ${bad && "(" + bad + ")"}`);
    ok(lay.some((items) => items.some((i) => i[3] && i[2])) && lay.some((items) => items.every((i) => !(i[3] && i[2]))), "às vezes um osso traz vida, às vezes só rações");
    ok(new Set(lay.map((items) => items.map((i) => i.slice(0, 2).join()).sort().join("|"))).size >= 140, "os lugares mudam a cada jogo");

    // ---- velocidades ----
    const sp = await ev(page, () => {
      __game.start(3); const f3 = { ...__game.vets[0].cfg }, d3 = __game.dogSpeed; __game.start(4); const f4 = [0, 1, 2].map((i) => ({ ...__game.vets[i].cfg }));
      __game.freezeVets = true; __game.noCatch = true; __game.items.forEach((i) => { i.x = -500; i.y = -500; }); __game.player.x = 36; __game.player.y = 27 * 32 + 4; const x0 = __game.player.x; __t.hold("d", 60);
      return { f3, d3, f4, d4: __game.dogSpeed, moved: __game.player.x - x0 };
    });
    ok(sp.f4.every((c) => c.speed === 73.21 && c.chaseSpeed === 146.41) && Math.abs(sp.f4[0].speed / sp.f3.speed - 1.1) < 1e-3 && Math.abs(sp.f4[0].chaseSpeed / sp.f3.chaseSpeed - 1.1) < 1e-3,  `Fase 4: veterinários 10% mais rápidos que na Fase 3, nos dois modos (${sp.f3.speed} → ${sp.f4[0].speed} sem o ! e ${sp.f3.chaseSpeed} → ${sp.f4[0].chaseSpeed} com o !)`);
    ok(Math.abs(sp.d4 / sp.d3 - 1.05) < 1e-9 && Math.abs(sp.d4 - 238.14) < 1e-9 && Math.abs(sp.moved - 238.14) < 2, `Fase 4: o cachorrinho fica 5% mais rápido que na Fase 3 (${sp.d3} → ${sp.d4} px/s; andou ${sp.moved.toFixed(1)} px em 1 s)`);
    ok(JSON.stringify(sp.f4[0]) === JSON.stringify(sp.f4[1]) && JSON.stringify(sp.f4[1]) === JSON.stringify(sp.f4[2]) && sp.f4[0].sight === 8 * 32 && sp.f4[0].chaseChance === 1, "os 3 veterinários são iguais; o ! liga a 8 quadrados, sem sorteio");
    // alcance do !: corredor livre na linha 27 (colunas 1 a 15); veterinário na coluna 9
    const probe = (dx) => ev(page, (dx) => {
      __game.start(4); __game.setRand(() => 0.99); __game.noCatch = true; __game.freezeVets = false;
      __game.items.forEach((i) => { i.x = -500; i.y = -500; }); // nenhum osso (poder) no caminho da sonda
      const v = __game.vets[0], p = __game.player; __game.vets.forEach((o, i) => { if (i) o.cool = 999; });
      v.cx = 9 * 32 + 16; v.cy = 27 * 32 + 16; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 99;
      p.x = v.cx + dx - 12; p.y = v.cy - 12;
      let at = null; for (let i = 0; i < 40; i++) { __game.tick(0.05); if (v.mode === "chase") { at = (i + 1) * 0.05; break; } }
      __game.setRand(null); return at;
    }, dx);
    const in8 = await probe(-(8 * 32 - 6)), out8 = await probe(-(8 * 32 + 6));
    ok(in8 !== null && in8 <= 0.1 && out8 === null, `Fase 4: o ! liga na hora a 8 quadrados (${in8}s) e não liga um pouco além (${out8})`);

    // ---- poder do osso ----
    const pw1 = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0); __game.freezeVets = false;
      const near = () => { const p = __game.player; return __game.vets.map((v, i) => { v.cx = p.x + 12 + 40 + 24 * i; v.cy = p.y + 12; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 99; }); };
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      const after = { power: __game.power, toast: document.getElementById("toast").textContent, bones: __game.bonesGot, score: __game.score, speed: __game.dogSpeed };
      near();
      const modes = []; let lost = 0; for (let i = 0; i < 40; i++) { __game.tick(0.05); modes.push(__game.vets.map((v) => v.mode).join()); if (__game.livesLost) lost++; }
      return { after, chased: modes.some((m) => m.includes("chase")), lost, state: __game.state };
    });
    ok(Math.abs(pw1.after.power - 30) < 0.05 && pw1.after.bones === 1 && /Poder do osso por 30 s/.test(pw1.after.toast), `pegar um osso liga o poder por 30 s (${pw1.after.power.toFixed(2)} s) e avisa`);
    ok(pw1.after.score === 150 && Math.abs(pw1.after.speed - 238.14 * 1.1) < 1e-6, `o osso dá 150 pontos (50 + 100 de bônus) e deixa o cachorrinho 10% mais rápido (${pw1.after.speed.toFixed(1)} px/s)`);
    ok(!pw1.chased && pw1.lost === 0 && pw1.state === "playing", "com o poder, os veterinários (carteiros) não perseguem nem pegam o cachorro, mesmo com ele à vista");
    await page.waitForTimeout(200);
    const hudP = await ev(page, () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve([document.getElementById("hud-power").textContent, __game.power])))));
    ok(/^\d+ s$/.test(hudP[0]) && parseInt(hudP[0]) === Math.ceil(hudP[1]), `o placar mostra o poder que falta, em segundos (${hudP[0]})`);
    // atingir um carteiro: +100 pontos, volta ao centro do mapa, mais lento (50%) e tonto por 2 s
    const win1 = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0.99); __game.freezeVets = false;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      const p = __game.player, v0 = __game.vets[0], v1 = __game.vets[1];
      for (const v of __game.vets) { v.idle = 99; v.leg = null; v.route = []; }
      v0.cx = p.x + 12 + 200; v0.cy = p.y + 12; // longe, fora do caminho: o cachorro vai até ele
      const score0 = __game.score; v0.cx = p.x + 12; v0.cy = p.y + 12; __game.tick(0.01); // encosta no carteiro 0
      const r = { slow0: v0.slow, slow1: v1.slow, pos0: [v0.cx, v0.cy], post0: [v0.sx, v0.sy], gain: __game.score - score0, postmen: __game.postmen, lives: __game.lives, toast: document.getElementById("toast").textContent, hit: v0.hitCool };
      __game.tick(0.01); // o carteiro já não está embaixo do cachorro: nada de pontos de novo
      r.gain2 = __game.score - score0;
      // repetir o toque durante os 2 s de tontura não pontua de novo
      p.x = v0.cx - 12; p.y = v0.cy - 12; __game.tick(0.5); r.gain3 = __game.score - score0; r.hit3 = v0.hitCool;
      // parado em cima do posto dele (ou em cima dele) por mais 22 s: o mesmo carteiro não rende pontos de novo no mesmo poder
      for (let i = 0; i < 440; i++) { p.x = v0.cx - 12; p.y = v0.cy - 12; __game.tick(0.05); }
      r.gain4 = __game.score - score0; r.postmen4 = __game.postmen; r.powerLeft = __game.power; r.slowStill = v0.slow; r.livesEnd = __game.lives;
      // pegar o segundo osso renova o poder: o carteiro volta ao normal e pode ser pego de novo (+100)
      const bone2 = __game.items.find((i) => i.bone && !i.taken); p.x = bone2.x - 4; p.y = bone2.y - 4; __game.tick(0.01);
      r.rearm = !v0.slow; const s5 = __game.score; p.x = v0.cx - 12; p.y = v0.cy - 12; __game.tick(0.01);
      r.gain5 = __game.score - s5; r.postmen5 = __game.postmen;
      return r;
    });
    ok(win1.slow0 === true && win1.slow1 === false && win1.gain === 100 && win1.postmen === 1 && win1.lives === 3 && /Você ganhou do carteiro! \+100 pontos/.test(win1.toast), "quem encosta num carteiro ganha dele (+100 pontos) e não perde vida; só aquele carteiro fica lento");
    ok(win1.pos0.join() === win1.post0.join(), `o carteiro atingido volta ao centro do mapa (ao seu posto, em ${win1.pos0.join(",")})`);
    ok(win1.gain2 === 100 && win1.gain3 === 100 && win1.hit3 > 0 && win1.postmen4 === 1 && win1.slowStill && win1.powerLeft > 5 && win1.livesEnd === 3, `cada carteiro rende pontos uma vez por poder: parado em cima dele por 22 s não soma de novo (${win1.postmen4} carteiro, poder ainda com ${win1.powerLeft.toFixed(0)} s)`);
    ok(win1.rearm === true && win1.gain5 >= 100 && win1.postmen5 === 2, `um novo osso renova o poder e o carteiro pode ser pego de novo (+${win1.gain5}; ${win1.postmen5} carteiros)`);
    const slowSpeed = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0.99); __game.freezeVets = false; __game.noCatch = true;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      const p = __game.player, v0 = __game.vets[0]; for (const v of __game.vets) { v.idle = 99; v.leg = null; v.route = []; v.cool = 999; }
      const normal = []; v0.idle = 0; let px = v0.cx, py = v0.cy;
      for (let i = 0; i < 120; i++) { __game.tick(1 / 60); normal.push(Math.hypot(v0.cx - px, v0.cy - py) * 60); px = v0.cx; py = v0.cy; }
      v0.cx = p.x + 12; v0.cy = p.y + 12; __game.tick(0.01); // atingido
      p.x = 36; p.y = 36; v0.idle = 0; v0.hitCool = 0; px = v0.cx; py = v0.cy; const slow = [];
      for (let i = 0; i < 180; i++) { __game.tick(1 / 60); const s = Math.hypot(v0.cx - px, v0.cy - py) * 60; if (s > 0.01 && s < 200) slow.push(s); px = v0.cx; py = v0.cy; }
      return { normalMax: Math.max(...normal), slowMax: Math.max(...slow), cfg: v0.cfg.speed };
    });
    ok(Math.abs(slowSpeed.normalMax - slowSpeed.cfg) < 0.6 && Math.abs(slowSpeed.slowMax - slowSpeed.cfg / 2) < 0.4, `o carteiro atingido anda 50% mais devagar que a velocidade da fase (${slowSpeed.normalMax.toFixed(1)} → ${slowSpeed.slowMax.toFixed(1)} px/s; a fase dá ${slowSpeed.cfg})`);
    const end1 = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0.99); __game.freezeVets = false;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      for (const v of __game.vets) { v.idle = 99; v.leg = null; v.route = []; }
      const v0 = __game.vets[0], p = __game.player; v0.cx = p.x + 12; v0.cy = p.y + 12; __game.tick(0.01); // atinge o carteiro 0
      const o = { mid: [], slowBefore: v0.slow };
      for (let i = 0; i < 600 + 20 && __game.power > 0; i++) { __game.tick(0.05); if (i === 300) o.mid.push(__game.power); }
      o.power = __game.power; o.slowAfter = __game.vets.some((v) => v.slow); o.t = __game.time; o.invuln = __game.invuln; o.toast = document.getElementById("toast").textContent; o.lives = __game.lives; o.score = __game.score;
      return o;
    });
    ok(end1.slowBefore && Math.abs(end1.mid[0] - 15) < 0.4 && end1.power === 0 && !end1.slowAfter && Math.abs(end1.t - 30) < 0.2, `aos 30 s o poder acaba e os carteiros voltam a ser veterinários na velocidade normal (meio do poder: ${end1.mid[0].toFixed(1)} s)`);
    ok(/O poder acabou/.test(end1.toast) && end1.invuln > 0.5, "o fim do poder avisa e dá proteção ao cachorrinho");
    const grace = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0.99); __game.freezeVets = false;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      for (let i = 0; i < 595; i++) __game.tick(0.05); // faltam ~0,2 s
      for (const v of __game.vets) { v.idle = 99; v.leg = null; v.route = []; v.hitCool = 99; }
      const v1 = __game.vets[1], p = __game.player; v1.cx = p.x + 12; v1.cy = p.y + 12; // um veterinário (ainda carteiro) em cima do cachorro
      for (let i = 0; i < 12; i++) { __game.tick(0.05); }
      const r = { power: __game.power, lives: __game.lives, inv: __game.invuln };
      for (let i = 0; i < 40; i++) __game.tick(0.05);
      r.lives3 = __game.lives;
      return r;
    });
    ok(grace.lives === 3 && grace.power === 0 && grace.inv > 0, "quando o poder acaba com um veterinário em cima do cachorro, ele não é pego na hora (1 s de proteção)");
    const refresh = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.setRand(() => 0.99); __game.freezeVets = true;
      const bones = __game.items.filter((i) => i.bone), go = (b) => { __game.player.x = b.x - 4; __game.player.y = b.y - 4; __game.tick(0.01); };
      go(bones[0]); for (let i = 0; i < 200; i++) __game.tick(0.05); const mid = __game.power; go(bones[1]);
      return { mid, after: __game.power, bones: __game.bonesGot, speed: __game.dogSpeed };
    });
    ok(Math.abs(refresh.mid - 20) < 0.3 && Math.abs(refresh.after - 30) < 0.05 && refresh.bones === 2 && Math.abs(refresh.speed - 238.14 * 1.2) < 1e-6, `pegar outro osso com o poder ligado recomeça a contagem (${refresh.mid.toFixed(1)} s → ${refresh.after.toFixed(1)} s), não soma; a velocidade sobe mais 10% (${refresh.speed.toFixed(1)} px/s)`);
    const pause = await ev(page, () => { __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.freezeVets = true; const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01); const p0 = __game.power; document.getElementById("btn-pause").click(); return { p0 }; });
    await page.waitForTimeout(600);
    ok(Math.abs((await ev(page, () => __game.power)) - pause.p0) < 0.05, "com o jogo pausado o poder não diminui");
    await page.keyboard.press("Escape");
    const pwAll = await ev(page, () => { const out = {}; for (const id of [1, 2, 3, 4, 5]) { __game.start(id); __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; }); const bone = __game.items.find((i) => i.bone); if (!bone) { out[id] = null; continue; } __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01); out[id] = [__game.power, __game.bonesGot, __game.score, document.getElementById("hud-power-item").classList.contains("hidden")]; } return out; });
    ok(pwAll[1] === null && Math.abs(pwAll[2][0] - 30) < 0.05 && Math.abs(pwAll[3][0] - 30) < 0.05 && Math.abs(pwAll[4][0] - 30) < 0.05 && Math.abs(pwAll[5][0] - 35) < 0.05 && [2, 3, 4, 5].every((i) => pwAll[i][1] === 1 && pwAll[i][2] === 150), `os ossos dão poder e 150 pontos desde a Fase 2 (Fase 1 não tem ossos): poder ${[2, 3, 4, 5].map((i) => pwAll[i][0].toFixed(0) + " s").join(", ")} nas Fases 2 a 5`);
    const chase0 = await ev(page, () => {
      __game.start(4); __game.setRand(() => 0); __game.freezeVets = false;
      const v = __game.vets[0], p = __game.player; for (const o of __game.vets) o.cool = 999;
      v.cx = p.x + 12 + 60; v.cy = p.y + 12; v.leg = null; v.route = []; v.mode = "patrol"; v.cool = 0; v.think = 0; v.idle = 99; __game.noCatch = true;
      for (let i = 0; i < 4; i++) __game.tick(0.05);
      const before = v.mode; const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      return { before, after: v.mode, power: __game.power };
    });
    ok(chase0.before === "chase" && chase0.after === "patrol" && chase0.power > 29, "pegar o osso com um veterinário perseguindo faz ele largar a perseguição (vira carteiro)");

    // ---- blocos esmagam ----
    const squash = await ev(page, () => {
      __game.start(4); __game.freezeVets = true; __game.noCatch = false;
      __t.run(150); // 2,5 s: a porta 1 (32,3) ainda aberta (o bloco está no nicho em 32,4)
      __game.player.x = 32 * 32 + 4; __game.player.y = 3 * 32 + 4; // o cachorro no corredor, onde o bloco vai subir
      const r = { lives0: __game.lives }; let t = 2.5;
      for (let i = 0; i < 60 * 2; i++) { __game.tick(1 / 60); t += 1 / 60; if (__game.lives < r.lives0 && r.at === undefined) { r.at = t; r.toast = document.getElementById("toast").textContent; } }
      r.lives = __game.lives; r.lost = __game.livesLost; r.score = __game.score; r.pos = [__game.player.x, __game.player.y];
      return r;
    });
    ok(squash.lives === 2 && squash.lost === 1 && squash.score === -200 && squash.at >= 2.9 && squash.at <= 3.4 && /Esmagado por um bloco! −200 pontos/.test(squash.toast), `o bloco que fecha a porta esmaga o cachorro: perde 1 vida e 200 pontos (aos ${squash.at && squash.at.toFixed(2)} s)`);
    ok(Math.hypot(squash.pos[0] - 36, squash.pos[1] - 36) < 1, "depois de esmagado o cachorro volta ao início da fase");
    const spare = await ev(page, () => {
      __game.start(4); __game.items.forEach((i) => { i.life = false; }); __game.freezeVets = true; __game.noCatch = false;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01); // poder ligado
      __t.run(150); __game.player.x = 32 * 32 + 4; __game.player.y = 3 * 32 + 4;
      let overlapTicks = 0; for (let i = 0; i < 60 * 2; i++) { __game.tick(1 / 60); const b = __game.blocks[0], p = __game.player; if (b.x < p.x + p.w && b.x + 32 > p.x && b.y < p.y + p.h && b.y + 32 > p.y) overlapTicks++; }
      return { lives: __game.lives, overlapTicks, power: __game.power };
    });
    ok(spare.lives === 3 && spare.overlapTicks === 0 && spare.power > 0, "com o poder do osso o bloco não esmaga: o cachorro é empurrado para o lado e nada acontece");
    const vetSafe = await ev(page, () => {
      __game.start(4); __game.noCatch = false; __game.freezeVets = true; __t.run(150);
      const v = __game.vets[0]; v.cx = 32 * 32 + 16; v.cy = 3 * 32 + 16; v.leg = null; v.route = []; __game.player.x = 36; __game.player.y = 36;
      __t.run(120);
      return { lives: __game.lives, vx: v.cx, vy: v.cy, blockY: __game.blocks[0].y };
    });
    ok(vetSafe.lives === 3 && vetSafe.blockY === 96 && (vetSafe.vx === 31 * 32 + 16 || vetSafe.vx === 33 * 32 + 16) && vetSafe.vy === 3 * 32 + 16, "um veterinário no caminho do bloco é empurrado (não esmagado) e o bloco chega no horário");
    const fuzz = await ev(page, () => {
      __game.start(4); __game.freezeVets = false; __game.noCatch = true; __game.setRand(() => Math.random());
      let bad = 0; const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      for (let i = 0; i < 60 * 90; i++) {
        __game.tick(1 / 60);
        for (const b of __game.blocks) for (const v of __game.vets) if (hit({ x: b.x, y: b.y, w: 32, h: 32 }, { x: v.cx - 12, y: v.cy - 12, w: 24, h: 24 })) bad++;
      }
      __game.setRand(null); return bad;
    });
    ok(fuzz === 0, `em 90 s de jogo de verdade com 3 veterinários patrulhando, nenhum bloco sobrepôs um veterinário (${fuzz})`);

    // ---- pontos: −200 por vida; a saída abre ao chegar a 800 pontos na fase ----
    await playLevel(page, 4, { done: [1, 2, 3] });
    await catchOnce(page);
    ok(await hudIs(page, "#hud-points", "-200 / 800") && /−200 pontos/.test(await page.textContent("#toast")), "perder uma vida na Fase 4 custa 200 pontos (placar -200 / 800 e aviso)");
    const goalRun = (level, min, opts = {}) => ev(page, ([level, min, opts]) => {
      __game.start(level); __game.freezeVets = true; __game.noCatch = true; __game.items.forEach((i) => { i.life = false; });
      const take = (it) => { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); };
      const toExit = () => { const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); };
      const rations = __game.items.filter((i) => !i.bone), bones = __game.items.filter((i) => i.bone);
      for (let k = 0; k < (opts.bones || 0); k++) take(bones[k]);
      for (let k = 0; k < opts.rations - 1; k++) take(rations[k]);
      const out = { score1: __game.score };
      for (let i = 0; i < 80; i++) __game.tick(0.05); // passa os avisos
      toExit(); out.state1 = __game.state; out.toast1 = document.getElementById("toast").textContent;
      __game.player.x = 36; __game.player.y = 36; take(rations[opts.rations - 1]); out.score2 = __game.score; out.toast2 = document.getElementById("toast").textContent;
      toExit(); out.state2 = __game.state; out.collected = __game.collected; out.bones = __game.bonesGot;
      return out;
    }, [level, min, opts]);
    const g4 = await goalRun(4, 800, { rations: 8 });
    ok(g4.score1 === 700 && g4.state1 === "playing" && /Faltam 100 pontos para abrir a saída \(meta: 800\)/.test(g4.toast1), `com 700 pontos a saída da Fase 4 não abre e o aviso diz quanto falta (${g4.toast1})`);
    ok(g4.score2 === 800 && /Meta de 800 pontos atingida/.test(g4.toast2) && g4.state2 === "won" && g4.collected === 8, `com 800 pontos (8 das 15 rações) a saída abre e a fase termina, sem pegar todos os itens (${g4.toast2})`);
    const w4 = await page.textContent("#win-breakdown"), p4w = Number(await page.textContent("#win-points"));
    ok(/Fase 4 concluída/.test(await page.textContent("#win-title")) && p4w === 1000 && /Rações: 800 \+ ossos: 0 \+ bônus de tempo: 200/.test(w4), `a pontuação final é a da fase: 800 + bônus de tempo 200 = ${p4w} (${w4})`);
    const rec4 = await ev(page, () => { const st = Records.createStore(localStorage); return { b: st.personalBest("Totó", 4), done: st.progress("Totó").completed }; });
    ok(rec4.b && rec4.b.p === 1000 && rec4.done.includes(4), "a pontuação e a conclusão da Fase 4 são guardadas");
    const g4b = await goalRun(4, 800, { rations: 5, bones: 2 });
    ok(g4b.score2 === 800 && g4b.state2 === "won" && g4b.bones === 2 && g4b.collected === 5, "5 rações + 2 ossos (500 + 300 = 800) também abrem a saída");
    const g5 = await goalRun(5, 1000, { rations: 10 });
    ok(g5.score1 === 900 && g5.state1 === "playing" && /Faltam 100 pontos para abrir a saída \(meta: 1000\)/.test(g5.toast1) && g5.score2 === 1000 && g5.state2 === "won", `na Fase 5 a meta é 1000 pontos (com 900 a saída fica fechada; com 1000 abre)`);
    // uma vida perdida derruba a pontuação abaixo da meta: a saída fecha de novo
    const reclose = await ev(page, () => {
      __game.start(4); __game.freezeVets = true; __game.noCatch = true; __game.items.forEach((i) => { i.life = false; });
      const rations = __game.items.filter((i) => !i.bone); for (let k = 0; k < 8; k++) { __game.player.x = rations[k].x - 4; __game.player.y = rations[k].y - 4; __game.tick(0.01); }
      const open1 = __game.score; __game.noCatch = false; for (const v of __game.vets) v.cool = 99; for (let k = 0; k < 45; k++) __game.tick(0.05);
      const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01);
      const after = __game.score; const e = __game.exit; __game.noCatch = true; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01);
      return { open1, after, state: __game.state };
    });
    ok(reclose.open1 === 800 && reclose.after === 600 && reclose.state === "playing", "depois de perder uma vida (−200) com 800 pontos a pontuação cai para 600 e a saída não abre");
    // sem vidas: tela de fim de jogo e Tentar novamente (−100)
    await playLevel(page, 4, { done: [1, 2, 3] });
    for (let k = 0; k < 3; k++) await catchOnce(page);
    ok(await ev(page, () => __game.state) === "lost" && /O veterinário pegou o cachorrinho/.test(await page.textContent("#lose-title")) && /Acabaram as suas vidas/.test(await page.textContent("#lose-lead")) && /\(mínimo 800\)/.test(await page.textContent("#lose-text")), "sem vidas, a tela de fim de jogo diz o mínimo de pontos da fase");
    await page.click("#btn-retry");
    ok(await ev(page, () => [__game.level, __game.retries, __game.score, __game.items.length].join()) === "4,1,-100,17" && /Tentativa extra 1 de 3/.test(await page.textContent("#toast")), "Tentar novamente recomeça a Fase 4 do zero com −100 pontos");
    // esmagado na última vida
    const crushedLast = await ev(page, () => {
      __game.start(4); __game.freezeVets = true; __game.noCatch = false; __game.setLives(1); __t.run(150);
      __game.player.x = 32 * 32 + 4; __game.player.y = 3 * 32 + 4; for (let i = 0; i < 120; i++) __game.tick(1 / 60);
      return { state: __game.state, title: document.getElementById("lose-title").textContent };
    });
    ok(crushedLast.state === "lost" && /esmagou o cachorrinho/.test(crushedLast.title), `esmagado na última vida, a tela de fim de jogo diz que foi o bloco (${crushedLast.title})`);

    // ---- escolha de fase e botão Próxima fase ----
    await fresh(page, { done: [1, 2] }); await page.click("#btn-start");
    const b4 = await page.evaluate(() => { const b = document.querySelector("#levels-list button:nth-child(4)"); return { disabled: b.disabled, text: b.textContent }; });
    ok(b4.disabled && /bloqueada: termine a Fase 3/.test(b4.text), "a Fase 4 está bloqueada até terminar a Fase 3");
    await fresh(page, { done: [1, 2, 3] }); await page.click("#btn-start");
    const b4b = await page.evaluate(() => { const b = document.querySelector("#levels-list button:nth-child(4)"); return { disabled: b.disabled, text: b.textContent }; });
    ok(!b4b.disabled && /3 veterinários · labirinto grande, poder dos ossos e blocos que esmagam/.test(b4b.text), `com a Fase 3 concluída a Fase 4 abre (${b4b.text})`);
    await page.click("#levels-list button:nth-child(4)");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.level) === 4, "escolher a Fase 4 começa a Fase 4");
    await playLevel(page, 4, { done: [1, 2, 3] }); await finishNow(page, 10);
    ok(await page.isVisible("#btn-next") && /Fase 5/.test(await page.textContent("#btn-next")), "depois da Fase 4 vem a Fase 5: o botão Próxima fase aparece");

    // ---- jogo salvo com poder e carteiros derrotados ----
    await playLevel(page, 4, { done: [1, 2, 3], keepSave: true });
    const sv = await ev(page, () => {
      __game.freezeVets = true; const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      const v0 = __game.vets[0], p = __game.player; v0.cx = p.x + 12; v0.cy = p.y + 12; __game.freezeVets = false; __game.tick(0.01); __game.freezeVets = true; // atinge o carteiro 0
      for (let i = 0; i < 100; i++) __game.tick(0.05); __game.save();
      return { power: __game.power, slow: __game.vets.map((v) => v.slow), postmen: __game.postmen, score: __game.score, pos: __game.vets.map((v) => [v.cx, v.cy]) };
    });
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    ok(await page.isVisible("#btn-continue") && /Fase 4/.test(await page.textContent("#menu-save")), "o menu oferece continuar o jogo salvo da Fase 4");
    await page.click("#btn-continue");
    const ld = await ev(page, () => ({ power: __game.power, slow: __game.vets.map((v) => v.slow), postmen: __game.postmen, score: __game.score, level: __game.level, bones: __game.bonesGot }));
    ok(ld.level === 4 && Math.abs(ld.power - sv.power) < 1.5 && JSON.stringify(ld.slow) === JSON.stringify(sv.slow) && ld.bones === 1 && ld.postmen === 1 && ld.postmen === sv.postmen && ld.score === sv.score, `continuar: o poder (${ld.power.toFixed(1)} s), o carteiro lento, os carteiros atingidos (${ld.postmen}) e a pontuação (${ld.score}) continuam como estavam`);
    const snap4 = await ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; });
    const parse4 = (sv) => ev(page, (sv) => __game.parseSave(sv), sv);
    const cl4 = (o) => JSON.parse(JSON.stringify(o));
    ok(await parse4(snap4) && snap4.pw > 0 && snap4.vd.join() === "1,0,0" && snap4.pk === 1 && Array.isArray(snap4.ba) && snap4.ba.length === snap4.bl.length, "(controle) o save da Fase 4 é válido e guarda o poder, os carteiros lentos, os carteiros atingidos e as peças móveis do jogo");
    const bads = [];
    { const a = cl4(snap4); a.pw = 31; bads.push(a); }               // mais poder que a fase dá
    { const a = cl4(snap4); a.pw = 0; bads.push(a); }                // derrotados sem poder
    { const a = cl4(snap4); a.vd = [1, 0]; bads.push(a); }           // lista de derrotados com o tamanho errado
    { const a = cl4(snap4); a.vd = [2, 0, 0]; bads.push(a); }
    { const a = cl4(snap4); a.pw = "30"; bads.push(a); }
    { const a = cl4(snap4); a.items.forEach((i) => { if (i[4]) i[3] = 1; }); bads.push(a); } // vida nos dois ossos
    { const a = cl4(snap4); a.items.forEach((i) => { i[3] = 0; }); bads.push(a); }              // sem vidas escondidas
    { const a = cl4(snap4); a.pk = -1; bads.push(a); }               // carteiros atingidos negativos
    { const a = cl4(snap4); a.ba = [0, 0, 1]; a.bl = [0, 0, 0]; bads.push(a); } // peça móvel repetida
    { const a = cl4(snap4); a.ba = [7]; a.bl = [0]; bads.push(a); }  // peça que não existe
    { const a = cl4(snap4); a.ba = []; a.bl = []; bads.push(a); }    // nenhuma porta (a fase sorteia de 1 a 3)
    const rs4 = []; for (const b of bads) rs4.push(await parse4(b));
    ok(rs4.every((r) => r === false), `saves adulterados da Fase 4 são recusados (poder demais, derrotados sem poder, lista errada, valor inválido, vida nos dois ossos, sem vidas, carteiros negativos, peça repetida, peça inexistente, nenhuma porta): ${rs4.map((r) => (r ? "V" : "x")).join("")}`);
    const f3save = cl4(snap4); f3save.l = 3;
    ok(!(await parse4(f3save)), "um save da Fase 4 não vale como Fase 3");
    // saves antigos (sem pw/vd) continuam valendo
    const oldv = cl4(snap4); delete oldv.pw; delete oldv.vd; oldv.l = 3;
    await playLevel(page, 3, { done: [1, 2], keepSave: true });
    const snap3 = await ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; });
    const old3 = cl4(snap3); delete old3.pw; delete old3.vd;
    ok(await parse4(old3), "um save da 0.5.0 (sem poder nem derrotados) continua valendo");

    // ---- câmera: o mapa é maior que a tela e a câmera segue o cachorro ----
    await playLevel(page, 4, { done: [1, 2, 3] });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; });
    const cam = (x, y) => ev(page, ([x, y]) => new Promise((resolve) => { __game.player.x = x; __game.player.y = y; __game.tick(0.01); requestAnimationFrame(() => requestAnimationFrame(() => { const cv = document.getElementById("game"), c = cv.getContext("2d"), d = c.getImageData(0, 0, cv.width, cv.height).data; const cols = new Set(); for (let i = 0; i < d.length; i += 4 * 211) cols.add(d[i] + "," + d[i + 1] + "," + d[i + 2]); resolve({ camX: __game.view.camX, camY: __game.view.camY, zoom: __game.view.zoom, colors: cols.size }); })); }), [x, y]);
    const c0 = await cam(36, 36), c1 = await cam(20 * 32, 14 * 32), c2 = await cam(39 * 32, 27 * 32);
    ok(c0.camX === 0 && c0.camY === 0, "no início a câmera está no canto de cima à esquerda");
    ok(c1.camX > 100 && c1.camX < 600 && c1.camY > 50, `no centro do mapa a câmera acompanha o cachorro (${c1.camX.toFixed(0)}, ${c1.camY.toFixed(0)})`);
    const vw = 800 / c2.zoom, vh = 576 / c2.zoom;
    ok(Math.abs(c2.camX - (41 * 32 - vw)) < 1 && Math.abs(c2.camY - (29 * 32 - vh)) < 1 && c2.colors > 4, `no canto da saída a câmera para na borda do mapa (${c2.camX.toFixed(0)}, ${c2.camY.toFixed(0)}) e o campo é desenhado (${c2.colors} cores)`);

    // ---- placar legível em telas pequenas, com PODER e PONTOS / 800 ----
    for (const vp of [{ width: 320, height: 568 }, { width: 390, height: 780 }, { width: 740, height: 390 }]) {
      const t = await newPage({ viewport: vp, hasTouch: true, isMobile: true });
      await fresh(t, { done: [1, 2, 3] }); await t.evaluate(() => { __game.start(4, { retries: 1, lives: 5 }); const bone = __game.items.find((i) => i.bone); __game.freezeVets = true; __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01); }); await t.waitForTimeout(400);
      const h = await ev(t, () => { const it = document.querySelector("#hud .hud-item"); return { label: parseFloat(getComputedStyle(it).fontSize), scroll: document.documentElement.scrollHeight - innerHeight, hscroll: document.documentElement.scrollWidth - innerWidth, power: document.getElementById("hud-power").textContent, pts: document.getElementById("hud-points").textContent }; });
      ok(h.label >= 10.5 && h.scroll <= 2 && h.hscroll <= 0 && /\d+ s/.test(h.power), `Fase 4 em ${vp.width}x${vp.height}: placar com PODER (${h.power}) e PONTOS (${h.pts}) legível (${h.label.toFixed(1)} px) e a página não rola`);
      await t.context().close();
    }
  });

  // =====================================================================
  await section("Fase 5: paredes que se movem, poder de 35 s, 1000 pontos", async () => {
    const L = await (async () => { await fresh(page); return ev(page, () => __game.levels[4]); })();
    const v5 = G5.find("V"), p5 = G5.find("P")[0], e5 = G5.find("E");
    const NOLIFE = () => ev(page, () => __game.items.forEach((i) => { i.life = false; }));
    // ---- mapa ----
    ok(G5.MAP.length === 29 && G5.MAP.every((row) => row.length === 41) && [...G5.MAP[0], ...G5.MAP[28], ...G5.MAP.map((r) => r[0]), ...G5.MAP.map((r) => r[40])].every((ch) => ch === "#"), "Fase 5: mapa de 41 × 29 tiles, cercado por paredes");
    ok(G5.MAP.join("\n") !== G4.MAP.join("\n"), "o mapa da Fase 5 é outro");
    ok(v5.length === 3 && v5.every(([c, r]) => Math.abs(c - 20) <= 2 && Math.abs(r - 14) <= 2) && e5.length === 6 && G5.find("P").length === 1, `Fase 5: 3 veterinários no centro (${v5.join(" e ")}), saída 3 × 2 e um só início`);
    const d5 = G5.distances(p5);
    ok([...e5, ...v5].every((t) => d5.has(t + "")) && d5.get(e5[0] + "") >= 60, `Fase 5: saída e veterinários alcançáveis (caminho de ${d5.get(e5[0] + "")} passos)`);
    const walls = L.blocks.filter((b) => b.wall), doors = L.blocks.filter((b) => !b.wall);
    ok(L.blocks.length === 6 && walls.length === 3 && doors.length === 3, "Fase 5: 3 paredes que se movem e 3 portas de bloco");
    ok(walls.every((w) => w.size && w.size.join() === (w.from[0] === w.to[0] ? "1,3" : "3,1") && w.every === 10), "cada parede tem 3 tiles de comprimento e muda de lugar a cada 10 s");
    // cada parede vai de lado a lado da sala: as pontas do trilho (5 tiles) encostam em paredes fixas
    const stripEnds = walls.map((w) => w.from[0] === w.to[0] ? [[w.from[0], w.from[1] - 1], [w.from[0], w.from[1] + 5]] : [[w.from[0] - 1, w.from[1]], [w.from[0] + 5, w.from[1]]]);
    ok(stripEnds.every((ends) => ends.every(([c, r]) => !G5.free(c, r))), "as paredes que se movem vão de uma parede fixa à outra da sala (sempre sobra uma abertura de 2 tiles, que muda de lugar)");
    const rectsOf = (b, which) => { const [c, r] = b[which], [w, h] = b.size || [1, 1], out = []; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) out.push([c + i, r + j]); return out; };
    const track = new Set(L.blocks.flatMap((b) => [...rectsOf(b, "from"), ...rectsOf(b, "to")]).map((x) => x + ""));
    let conn = 0, connOk = 0;
    for (let mask = 0; mask < 1 << L.blocks.length; mask++) {
      const blocked = new Set(L.blocks.flatMap((b, i) => rectsOf(b, (mask >> i) & 1 ? "to" : "from")).map((x) => x + ""));
      const floor = []; for (let r = 0; r < 29; r++) for (let c = 0; c < 41; c++) if (G5.free(c, r) && !track.has(c + "," + r)) floor.push([c, r]);
      const seen = new Set([floor[0] + ""]), q = [floor[0]];
      for (const [c, r] of q) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c + dc, r + dr]; if (n[0] < 0 || n[1] < 0 || n[0] > 40 || n[1] > 28 || !G5.free(...n) || blocked.has(n + "") || seen.has(n + "")) continue; seen.add(n + ""); q.push(n); }
      conn++; if (floor.every((t) => seen.has(t + ""))) connOk++;
    }
    ok(conn === 64 && connOk === 64, `Fase 5: com as 6 peças em qualquer posição (${conn} combinações) todo o chão fora dos trilhos continua alcançável (${connOk})`);

    // ---- dados da fase ----
    ok(L.rations === 20 && L.bones === 2 && L.extraLives.join() === "4,4" && L.alertTiles === 10 && L.lifePenalty === 200 && L.minPoints === 1000 && L.bonePower === 35 && L.crush === true && L.bonusStep === 20, "Fase 5: 20 rações + 2 ossos, 4 vidas escondidas (3 + 1), ! a 10 quadrados, −200 por vida, 1000 pontos para passar, poder de 35 s e blocos que esmagam");
    const cf = await ev(page, () => { __game.start(4); const a = { ...__game.vets[0].cfg }, da = __game.dogSpeed; __game.start(5); return { a, da, b: [0, 1, 2].map((i) => ({ ...__game.vets[i].cfg })), db: __game.dogSpeed, n: __game.vets.length }; });
    ok(cf.n === 3 && cf.b.every((c) => c.speed === 73.21 && c.chaseSpeed === 146.41 && c.sight === 320 && c.chaseChance === 1) && cf.db === cf.da && cf.a.speed === cf.b[0].speed, "Fase 5: mantém as velocidades da Fase 4 (73,21 / 146,41 px/s e 238,14 do cachorro); o ! liga a 10 quadrados");
    await playLevel(page, 5, { done: [1, 2, 3, 4] });
    ok(await ev(page, () => [__game.level, __game.items.length, __game.items.filter((i) => i.bone).length, __game.vets.length, __game.blocks.length].join()) === "5,22,2,3,6" && await hudIs(page, "#hud-points", "0 / 1000") && await hudIs(page, "#hud-items", "0/20") && await hudIs(page, "#hud-bones", "0/2"), "a Fase 5 começa com 20 rações + 2 ossos, 3 veterinários, 6 peças móveis e placar PONTOS 0 / 1000");
    const lay = await ev(page, () => { const out = []; for (let i = 0; i < 150; i++) { __game.start(5); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32, it.bone ? 1 : 0, it.life ? 1 : 0])); } return out; });
    let bad = "";
    for (const items of lay) {
      if (items.length !== 22 || new Set(items.map((i) => i[0] + "," + i[1])).size !== 22) bad = "quantidade/repetidos";
      if (items.filter((i) => i[2]).length !== 2) bad = "ossos";
      if (items.filter((i) => i[3]).length !== 4) bad = "vidas escondidas (devem ser exatamente 4)";
      if (items.filter((i) => i[3] && i[2]).length > 1) bad = "vida nos dois ossos";
      for (const [c, r] of items) {
        if (!G5.free(c, r)) bad = "em parede/caixa";
        if (e5.some((t) => t[0] === c && t[1] === r)) bad = "na saída";
        if (track.has(c + "," + r)) bad = "no trilho de uma peça móvel";
        if (!d5.has([c, r] + "")) bad = "inalcançável"; else if (d5.get([c, r] + "") < 4) bad = "perto do início";
        if (v5.some((v) => Math.hypot(c - v[0], r - v[1]) < 4)) bad = "perto de um veterinário";
      }
    }
    ok(!bad, `150 sorteios: 20 rações + 2 ossos, exatamente 4 vidas escondidas (no máximo 1 num osso), em chão livre e alcançável, fora dos trilhos ${bad && "(" + bad + ")"}`);

    // ---- as paredes mudam de lugar a cada 10 s e as portas a cada 3 s ----
    const ts = await ev(page, () => {
      __game.start(5); __game.freezeVets = true; __game.noCatch = true;
      const snap = () => __game.blocks.map((b) => [Math.round(b.x), Math.round(b.y)]);
      const out = []; let now = 0; for (const target of [0, 3.9, 4.8, 6.9, 7.8, 9.9, 10.8, 13.9, 14.8, 20.8]) { while (now < target - 1e-9) { const dt = Math.min(0.01, target - now); __game.tick(dt); now += dt; } out.push(snap()); }
      return { out, defs: __game.blocks.map((b) => [b.def.every, b.def.warn, +b.def.slide.toFixed(3), b.def.phase]), from: __game.blocks.map((b) => [b.def.ax, b.def.ay]) };
    });
    ok(ts.defs.slice(0, 3).every((d) => d[0] === 10 && d[1] === 2 && Math.abs(d[2] - 2 * 32 / 120) < 0.002) && ts.defs.slice(3).every((d) => d[0] === 3 && Math.abs(d[1] - 0.6) < 1e-9), "paredes: ciclo de 10 s, aviso de 2 s, 0,53 s para deslizar 2 tiles; portas: ciclo de 3 s e aviso de 0,6 s");
    const tl = ts.out.map((s) => JSON.stringify(s.map(([x, y]) => [x / 32, y / 32])));
    const exp = {
      0: [[34, 7], [10, 7], [6, 17], [34, 18], [14, 24], [16, 4]],       // tudo no ponto de partida
      1: [[34, 7], [10, 7], [6, 17], [35, 18], [13, 24], [15, 4]],       // 3,9 s: as 3 portas já mudaram (aos 1, 2 e 3 s)
      2: [[34, 7], [10, 7], [6, 19], [35, 18], [13, 24], [16, 4]],       // 4,8 s: a parede 3 (aos 4 s) e a porta 3 (de novo, aos 4 s)
      3: [[34, 7], [10, 7], [6, 19], [34, 18], [14, 24], [16, 4]],       // 6,9 s
      4: [[34, 7], [10, 9], [6, 19], [34, 18], [14, 24], [15, 4]],       // 7,8 s: a parede 2 (aos 7 s)
      5: [[34, 7], [10, 9], [6, 19], [35, 18], [13, 24], [15, 4]],       // 9,9 s
      6: [[34, 9], [10, 9], [6, 19], [35, 18], [13, 24], [16, 4]],       // 10,8 s: a parede 1 (aos 10 s)
      7: [[34, 9], [10, 9], [6, 19], [34, 18], [14, 24], [15, 4]],       // 13,9 s
      8: [[34, 9], [10, 9], [6, 17], [34, 18], [13, 24], [15, 4]],       // 14,8 s: a parede 3 volta (aos 14 s)
      9: [[34, 7], [10, 7], [6, 17], [34, 18], [13, 24], [15, 4]],       // 20,8 s: as paredes 1 e 2 voltaram (aos 20 e 17 s)
    };
    ok(Object.entries(exp).every(([k, v]) => tl[k] === JSON.stringify(v)), `as paredes mudam de lugar a cada 10 s (a parede 1 aos 10 e 20 s, a 2 aos 7 e 17 s, a 3 aos 4 e 14 s) e as portas a cada 3 s: ${Object.entries(exp).filter(([k, v]) => tl[k] !== JSON.stringify(v)).map(([k]) => k + ":" + tl[k]).join(" | ") || "todas as posições conferem"}`);

    // ---- poder de 35 s ----
    const pw = await ev(page, () => { __game.start(5); __game.items.forEach((i) => { i.life = false; }); __game.freezeVets = true; const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01); return { p: __game.power, toast: document.getElementById("toast").textContent }; });
    ok(Math.abs(pw.p - 35) < 0.05 && /Poder do osso por 35 s/.test(pw.toast), `na Fase 5 o osso dá 35 s de poder (${pw.p.toFixed(2)} s)`);

    // ---- a parede esmaga (sem poder) ----
    const crushW = await ev(page, () => {
      __game.start(5); __game.items.forEach((i) => { i.life = false; }); __game.freezeVets = true; __game.noCatch = false;
      const w = __game.blocks[0]; // parede 1: vertical, de (34,7) a (34,9), tamanho 1 × 3
      for (let i = 0; i < 9 * 60 + 30; i++) __game.tick(1 / 60); // 9,5 s
      __game.player.x = 34 * 32 + 4; __game.player.y = 10 * 32 + 4; // na abertura de baixo, onde a parede vai chegar
      const r = { lives0: __game.lives }; let t = 9.5;
      for (let i = 0; i < 90; i++) { __game.tick(1 / 60); t += 1 / 60; if (__game.lives < r.lives0 && r.at === undefined) { r.at = t; r.toast = document.getElementById("toast").textContent; } }
      r.lives = __game.lives; r.score = __game.score; return r;
    });
    ok(crushW.lives === 2 && crushW.score === -200 && crushW.at > 10 && crushW.at < 10.8 && /Esmagado por um bloco/.test(crushW.toast), `a parede que se move esmaga o cachorro que ficou na abertura: −1 vida e −200 pontos (aos ${crushW.at && crushW.at.toFixed(2)} s)`);
    const spareW = await ev(page, () => {
      __game.start(5); __game.items.forEach((i) => { i.life = false; }); __game.freezeVets = true; __game.noCatch = false;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      for (let i = 0; i < 9 * 60 + 30; i++) __game.tick(1 / 60);
      __game.player.x = 34 * 32 + 4; __game.player.y = 10 * 32 + 4;
      let over = 0; for (let i = 0; i < 120; i++) { __game.tick(1 / 60); const b = __game.blocks[0], p = __game.player; if (b.x < p.x + p.w && b.x + 32 > p.x && b.y < p.y + p.h && b.y + 96 > p.y) over++; }
      return { lives: __game.lives, over, x: __game.player.x, power: __game.power };
    });
    ok(spareW.lives === 3 && spareW.over === 0 && spareW.power > 0 && Math.abs(spareW.x - 34 * 32 - 4) > 1, "com o poder do osso a parede não esmaga: empurra o cachorro para o lado");
    const fz = await ev(page, () => {
      __game.start(5); __game.freezeVets = false; __game.noCatch = true; __game.setRand(() => Math.random());
      let bad = 0; const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      for (let i = 0; i < 60 * 130; i++) {
        __game.tick(1 / 60);
        for (const b of __game.blocks) { const [w, h] = b.def.w ? [b.def.w, b.def.h] : [32, 32]; for (const v of __game.vets) if (hit({ x: b.x, y: b.y, w, h }, { x: v.cx - 12, y: v.cy - 12, w: 24, h: 24 })) bad++; }
      }
      __game.setRand(null); return bad;
    });
    ok(fz === 0, `em 130 s com 3 veterinários patrulhando, nenhuma peça móvel sobrepôs um veterinário (${fz})`);

    // ---- pontos: a saída abre com 1000 pontos na fase (a regra está testada na seção da Fase 4) ----
    await playLevel(page, 5, { done: [1, 2, 3, 4] });
    await finishNow(page, 10);
    ok(await ev(page, () => __game.state) === "won" && Number(await page.textContent("#win-points")) === 2500 && /Fase 5 concluída/.test(await page.textContent("#win-title")), "Fase 5 pegando tudo sem perder vida: 2000 (rações) + 300 (ossos) + 200 (bônus) = 2500 pontos");
    ok(await page.isVisible("#btn-next") && /Fase 6/.test(await page.textContent("#btn-next")), "depois da Fase 5 vem a Fase 6: o botão Próxima fase aparece");
    await playLevel(page, 5, { done: [1, 2, 3, 4] }); await catchOnce(page); await finishNow(page, 10);
    ok(Number(await page.textContent("#win-points")) === 2300 && /vidas perdidas: 200/.test(await page.textContent("#win-breakdown")), "com 1 vida perdida (−200 na Fase 5): 2300 pontos");

    // ---- escolha de fase ----
    await fresh(page, { done: [1, 2, 3] }); await page.click("#btn-start");
    ok(await page.evaluate(() => document.querySelector("#levels-list button:nth-child(5)").disabled && /bloqueada: termine a Fase 4/.test(document.querySelector("#levels-list button:nth-child(5)").textContent)), "a Fase 5 está bloqueada até terminar a Fase 4");
    await fresh(page, { done: [1, 2, 3, 4] }); await page.click("#btn-start");
    const b5 = await page.evaluate(() => { const b = document.querySelector("#levels-list button:nth-child(5)"); return { disabled: b.disabled, text: b.textContent }; });
    ok(!b5.disabled && /3 veterinários · paredes que se movem, poder do osso de 35 s e 1000 pontos/.test(b5.text), `com a Fase 4 concluída a Fase 5 abre (${b5.text})`);

    // ---- jogo salvo na Fase 5 ----
    await playLevel(page, 5, { done: [1, 2, 3, 4], keepSave: true });
    await ev(page, () => { __game.freezeVets = true; __game.noCatch = true; for (let i = 0; i < 700; i++) __game.tick(1 / 60); __game.save(); });
    const sn = await ev(page, () => JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap);
    const parse5 = (sv) => ev(page, (sv) => __game.parseSave(sv), sv);
    const cl5 = (o) => JSON.parse(JSON.stringify(o));
    ok(await parse5(sn) && sn.bl.length === 6 && sn.l === 5, "o save da Fase 5 guarda o ponto do ciclo das 6 peças");
    const t1 = cl5(sn); t1.bl = t1.bl.slice(0, 5);
    const t2 = cl5(sn); t2.pw = 36;
    const t3 = cl5(sn); t3.items.forEach((i) => { i[3] = 0; });
    const t4 = cl5(sn); t4.items.forEach((i, k) => { i[3] = k < 3 ? 1 : 0; });
    const rs5 = []; for (const x of [t1, t2, t3, t4]) rs5.push(await parse5(x));
    ok(rs5.every((r) => r === false), `saves adulterados da Fase 5 são recusados (peça a menos, poder demais, sem vidas, só 3 vidas): ${rs5.map((r) => (r ? "V" : "x")).join("")}`);
    await page.reload(); await page.evaluate(PAGE_HELPERS); await page.click("#btn-continue");
    const lb = await ev(page, () => ({ level: __game.level, bt: __game.blocks.map((b) => +b.bt.toFixed(1)) }));
    // o trilho das paredes mostra todo o percurso (as linhas das pontas também esmagam): nada de chão comum onde a parede passa
    await page.evaluate(() => { __game.start(5); __game.freezeVets = true; __game.noCatch = true; __game.player.x = 30 * 32 + 4; __game.player.y = 9 * 32 + 4; __game.tick(0.01); });
    const railAt = async () => { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); return ev(page, () => { const cv = document.querySelector("canvas"), c = cv.getContext("2d"), k = __game.view.k * __game.view.zoom; return [7, 8, 9, 10, 11].map((row) => { const d = c.getImageData(Math.round((34 * 32 + 16 - __game.view.camX) * k), Math.round((row * 32 + 16 - __game.view.camY) * k), 1, 1).data; return [d[0], d[1], d[2]].join(","); }); }); };
    const floor = ["35,42,58", "38,46,64"];
    const r0 = await railAt(); await ev(page, () => { __game.tick(10.3); }); const r1 = await railAt();
    ok([...r0, ...r1].every((c) => !floor.includes(c)), `a parede da Fase 5 (coluna 34, linhas 7 a 11) tem trilho ou parede em todas as 5 linhas, nos dois lados do percurso (${r0.join(" | ")} // ${r1.join(" | ")})`);
    // fase sem saída: tudo pego, poder acabado e pontos abaixo do mínimo: a tentativa termina
    const dead = await ev(page, () => {
      __game.start(4, { lives: 5, retries: 3 }); __game.noCatch = false; __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; });
      for (let k = 0; k < 4; k++) { for (const v of __game.vets) v.cool = 99; for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.freezeVets = false; __game.tick(0.01); __game.freezeVets = true; }
      const lost = __game.livesLost; for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
      const mid = { state: __game.state, power: __game.power, score: __game.score };
      for (let i = 0; i < 700; i++) __game.tick(0.05);
      return { lost, mid, state: __game.state, title: document.getElementById("lose-title").textContent, lead: document.getElementById("lose-lead").textContent, text: document.getElementById("lose-text").textContent };
    });
    ok(dead.lost === 4 && dead.mid.state === "playing" && dead.mid.score < 800 && dead.state === "lost" && /pontos não bastaram/i.test(dead.title) && /mínimo 800/.test(dead.text), `Fase 4 sem como chegar a 800: pegou tudo (${dead.mid.score} pontos), o poder acabou e a tentativa termina (${dead.title})`);
    ok(/Você pegou tudo/.test(dead.lead) && !/Acabaram as suas vidas/.test(dead.lead), `a tela "Os pontos não bastaram!" não diz que as vidas acabaram (${dead.lead})`);
    // esmagamento: nas Fases 1 a 3 o bloco nunca esmaga (o cachorro é empurrado); na Fase 4 esmaga, mas não quem está na proteção depois de perder uma vida
    const crush = await ev(page, () => {
      const out = {};
      // Fase 3 com o veterinário "ligado" (noCatch desligado): o cachorro parado onde o bloco 1 vai chegar é empurrado, não esmagado
      __game.start(3, { active: [0] }); __game.noCatch = false; __game.freezeVets = true; __game.items.forEach((i) => { i.x = -500; i.y = -500; });
      __game.player.x = 7 * 32 + 4; __game.player.y = 2 * 32 + 4; for (let i = 0; i < 160; i++) __game.tick(0.05);
      out.f3 = { lives: __game.lives, lost: __game.livesLost, state: __game.state, pushed: __game.player.x !== 7 * 32 + 4 || __game.player.y !== 2 * 32 + 4 };
      // Fase 4: espera a porta 1 começar a deslizar e põe o cachorro no tile para onde ela vai
      const run = (protectedDog) => {
        __game.start(4, { active: [0] }); __game.noCatch = false; __game.freezeVets = true; __game.items.forEach((i) => { i.x = -500; i.y = -500; });
        const def = __game.levels[3].blocks[0], blk = () => __game.blocks[0], ends = [def.from, def.to].map(([c, r]) => [c * 32, r * 32]);
        const r0 = [blk().x, blk().y]; for (let i = 0; i < 600 && blk().x === r0[0] && blk().y === r0[1]; i++) __game.tick(0.01);
        const dest = ends.sort((a, c) => Math.hypot(c[0] - blk().x, c[1] - blk().y) - Math.hypot(a[0] - blk().x, a[1] - blk().y))[0]; // o lado mais longe do bloco = para onde ele vai
        if (protectedDog) { const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.freezeVets = false; __game.tick(0.001); __game.freezeVets = true; }
        __game.items.forEach((i) => { i.x = -500; i.y = -500; }); // (a perda de vida sorteia os itens de novo: nenhum pode estar no tile do teste, nem trazer uma vida extra)
        const before = __game.lives; __game.player.x = dest[0] + 4; __game.player.y = dest[1] + 4;
        for (let i = 0; i < 20; i++) __game.tick(0.03);
        return { before, after: __game.lives, invuln: +__game.invuln.toFixed(2) };
      };
      out.f4 = run(false); out.f4prot = run(true);
      return out;
    });
    ok(crush.f3.lives === 3 && crush.f3.lost === 0 && crush.f3.state === "playing" && crush.f3.pushed, `Fase 3: o bloco nunca esmaga o cachorrinho (ele é empurrado para o lado; vidas ${crush.f3.lives}, perdidas ${crush.f3.lost})`);
    ok(crush.f4.after === crush.f4.before - 1, `Fase 4: o bloco que chega no cachorrinho o esmaga (vidas ${crush.f4.before} → ${crush.f4.after})`);
    ok(crush.f4prot.after === crush.f4prot.before && crush.f4prot.invuln > 0, `Fase 4: logo depois de perder uma vida o cachorrinho está protegido e o bloco só o empurra (vidas ${crush.f4prot.before} → ${crush.f4prot.after}, proteção ${crush.f4prot.invuln} s)`);
    // osso com vida extra: o aviso da vida e o do poder aparecem juntos
    const tw = await ev(page, () => {
      __game.start(4); __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; }); const b = __game.items.find((i) => i.bone); b.life = true; __game.setLives(2);
      __game.player.x = b.x - 4; __game.player.y = b.y - 4; __game.tick(0.01);
      return document.getElementById("toast").textContent;
    });
    ok(/Vida extra/.test(tw) && /Poder do osso por 30 s/.test(tw), `osso com vida extra: o aviso mostra a vida e o poder (${tw})`);
    // o osso que cruza a meta de pontos: primeiro o aviso da vida e do poder, depois (quando ele some) o da meta
    const goalT = await ev(page, () => {
      __game.start(4); __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; }); const b = __game.items.find((i) => i.bone); b.life = true; __game.setLives(2);
      for (const it of __game.items.filter((i) => !i.bone).slice(0, 7)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
      __game.player.x = b.x - 4; __game.player.y = b.y - 4; __game.tick(0.01);
      const first = document.getElementById("toast").textContent;
      for (let i = 0; i < 60; i++) __game.tick(0.05);
      return { first, later: document.getElementById("toast").textContent, score: __game.score };
    });
    ok(/Vida extra/.test(goalT.first) && /Poder do osso/.test(goalT.first) && !/Meta/.test(goalT.first) && /Meta de 800 pontos atingida/.test(goalT.later) && goalT.score >= 800, `ao cruzar a meta com um osso, o aviso da vida e do poder não é apagado pelo da meta (${goalT.first} → ${goalT.later})`);
    ok(lb.level === 5 && lb.bt.length === 6 && lb.bt[0] > 10 && lb.bt[0] < 14, `continuar: a Fase 5 volta com as peças no mesmo ponto do ciclo (${lb.bt.join(", ")})`);
  });

  // =====================================================================
  await section("leva 2 da 0.6.0: blocos sorteados, veterinários espalhados, menu de fases anteriores, tabela das fases", async () => {
    // ---- a quantidade de blocos/paredes é sorteada a cada jogo ----
    await playLevel(page, 3, { done: [1, 2], keepSave: true });
    const rnd = await ev(page, () => {
      __game.allBlocks = false; const out = {};
      for (const id of [3, 4, 5]) {
        const doors = new Set(), walls = new Set(), subsets = new Set(); let zero = 0;
        for (let i = 0; i < 400; i++) {
          __game.start(id); const bl = __game.blocks, d = bl.filter((b) => b.def.group === "door").length, w = bl.filter((b) => b.def.group === "wall").length;
          doors.add(d); walls.add(w); subsets.add(bl.map((b) => b.i).join("-")); if (!bl.length) zero++;
        }
        out[id] = { doors: [...doors].sort(), walls: [...walls].sort(), subsets: subsets.size, zero };
      }
      const forced = {};
      for (const v of [0, 0.99]) { __game.setRand(() => v); for (const id of [3, 4, 5]) { __game.start(id); forced[id + ":" + v] = __game.blocks.map((b) => b.i).join("-"); } }
      __game.setRand(null); __game.allBlocks = true;
      return { out, forced };
    });
    ok(rnd.out[3].doors.join() === "1,2" && rnd.out[3].walls.join() === "0", `Fase 3: o número de blocos que se movem é sorteado entre 1 e 2 (vistos: ${rnd.out[3].doors.join(" e ")})`);
    ok(rnd.out[4].doors.join() === "1,2,3" && rnd.out[4].walls.join() === "0", `Fase 4: de 1 a 3 portas de bloco (vistas: ${rnd.out[4].doors.join(", ")})`);
    ok(rnd.out[5].doors.join() === "1,2,3" && rnd.out[5].walls.join() === "1,2,3", `Fase 5: de 1 a 3 portas e de 1 a 3 paredes que se movem (portas ${rnd.out[5].doors.join(", ")}; paredes ${rnd.out[5].walls.join(", ")})`);
    ok(rnd.out[3].zero === 0 && rnd.out[4].zero === 0 && rnd.out[5].zero === 0 && rnd.out[3].subsets === 3 && rnd.out[4].subsets === 7 && rnd.out[5].subsets >= 40, `sempre há pelo menos uma peça móvel, e quais são também muda (${rnd.out[3].subsets} combinações na Fase 3, ${rnd.out[4].subsets} na 4 e ${rnd.out[5].subsets} na 5)`);
    const cnt = (k) => rnd.forced[k].split("-").filter(Boolean).length;
    ok(cnt("3:0") === 1 && cnt("3:0.99") === 2 && cnt("4:0") === 1 && cnt("4:0.99") === 3 && cnt("5:0") === 2 && cnt("5:0.99") === 6, `com o sorteio no mínimo ou no máximo, a quantidade é a mínima ou a máxima da fase (${JSON.stringify(rnd.forced)})`);
    // só a porta 2 da Fase 3 neste jogo: a porta 1 não existe (o corredor fica livre) e o save guarda quais peças são
    const only2 = await ev(page, () => {
      __game.start(3, { active: [1] }); __game.freezeVets = true; __game.noCatch = true;
      __game.player.x = 6 * 32 + 4; __game.player.y = 3 * 32 + 4; __t.hold("d", 60);
      const x = __game.player.x, n = __game.blocks.length, idx = __game.blocks.map((b) => b.i).join();
      __game.save(); const snap = JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto; return { x, n, idx, snap: snap && snap.snap };
    });
    ok(only2.n === 1 && only2.idx === "1" && only2.x > 8 * 32, `sem a porta 1 o cachorro passa livre pelo corredor (x=${only2.x.toFixed(0)}) e só a porta 2 existe`);
    ok(only2.snap && JSON.stringify(only2.snap.ba) === "[1]" && only2.snap.bl.length === 1, "o jogo salvo guarda quais peças móveis entraram no jogo (ba) e o ponto do ciclo de cada uma");
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    const contDbg = await page.evaluate(() => ({ vis: !document.getElementById("btn-continue").classList.contains("hidden"), raw: (localStorage.getItem("cachorrinho.save.v1") || "").slice(0, 120), state: __game.state, screen: document.body.dataset.screen }));
    ok(contDbg.vis, `depois de recarregar, o menu oferece Continuar jogo (${JSON.stringify(contDbg)})`);
    await page.click("#btn-continue");
    ok(await ev(page, () => __game.level) === 3 && await ev(page, () => __game.blocks.map((b) => b.i).join()) === "1", "continuar volta com a mesma peça (só a porta 2)");

    // ---- veterinários espalhados: não andam colados nem se sobrepõem ----
    // 6 minutos simulados por fase com sorteio fixo (2 sementes): mede o tempo sobrepostos (< 16 px), a menos de 3 tiles e a maior sequência seguida a menos de 3 tiles
    const sep = await ev(page, () => {
      const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const out = {};
      for (const lvl of [2, 3, 4, 5]) {
        out[lvl] = { overlap: 0, near: 0, pairs: 0, maxStreak: 0 };
        for (const seed of [1, 2]) {
          __game.start(lvl); __game.noCatch = true; __game.setRand(mulberry(seed)); __game.start(lvl);
          const n = __game.vets.length, streak = {};
          for (let i = 0; i < 60 * 60 * 6; i++) {
            __game.tick(1 / 60); const v = __game.vets;
            for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) {
              const d = Math.hypot(v[a].cx - v[c].cx, v[a].cy - v[c].cy), k = a + "-" + c; out[lvl].pairs++;
              if (d < 16) out[lvl].overlap++;
              if (d < 96) { out[lvl].near++; streak[k] = (streak[k] || 0) + 1; out[lvl].maxStreak = Math.max(out[lvl].maxStreak, streak[k]); } else streak[k] = 0;
            }
          }
        }
      }
      __game.setRand(null); return out;
    });
    ok([2, 3, 4, 5].every((l) => sep[l].overlap <= 60), `em 6 minutos simulados (2 sorteios) os veterinários quase nunca ficam um em cima do outro: no máximo 1 s sobrepostos em cada fase (quadros sobrepostos: ${[2, 3, 4, 5].map((l) => sep[l].overlap).join(", ")})`);
    ok([2, 3, 4, 5].every((l) => sep[l].near / sep[l].pairs < 0.1), `e raramente andam juntos: tempo a menos de 3 tiles de distância ${[2, 3, 4, 5].map((l) => (100 * sep[l].near / sep[l].pairs).toFixed(1) + "%").join(", ")} (Fases 2 a 5)`);
    ok([2, 3, 4, 5].every((l) => sep[l].maxStreak <= 15 * 60), `e nunca andam em fila por muito tempo: a maior sequência a menos de 3 tiles dura ${[2, 3, 4, 5].map((l) => (sep[l].maxStreak / 60).toFixed(1) + " s").join(", ")} (Fases 2 a 5)`);
    // o carteiro atingido volta ao posto; se outro veterinário estiver nele, vai para o tile livre mais perto (nunca fica em cima de outro)
    const post = await ev(page, () => {
      __game.start(4); __game.setRand(() => 0.99); __game.noCatch = true; __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; });
      const bone = __game.items.find((i) => i.bone), p = __game.player, [v0, v1] = __game.vets;
      p.x = bone.x - 4; p.y = bone.y - 4; __game.tick(0.01);
      v1.cx = v0.sx + 4; v1.cy = v0.sy; // outro veterinário parado em cima do posto do 0
      __game.freezeVets = false; for (const o of __game.vets) { o.idle = 99; o.leg = null; o.route = []; }
      v0.cx = v0.sx + 5 * 32; v0.cy = v0.sy; // o 0 está longe do posto; o cachorro o atinge ali
      p.x = v0.cx - 12; p.y = v0.cy - 12; __game.tick(0.01);
      return { d: Math.hypot(v0.cx - v1.cx, v0.cy - v1.cy), postmen: __game.postmen, atPost: Math.hypot(v0.cx - v0.sx, v0.cy - v0.sy) };
    });
    ok(post.postmen === 1 && post.d >= 32 && post.atPost <= 64, `com outro veterinário no posto, o carteiro atingido volta ao tile livre mais perto (${post.d.toFixed(0)} px do outro, ${post.atPost.toFixed(0)} px do posto)`);
    // "Continuar jogo" separa dois veterinários que foram salvos no mesmo tile
    await ev(page, () => { __game.start(4); __game.freezeVets = true; __game.save(); });
    await ev(page, () => { const st = Records.createStore(localStorage), g = st.loadGame("Totó"); g.snap.vets[1] = g.snap.vets[2].slice(); st.saveGame("Totó", g.snap); });
    await page.reload(); await page.evaluate(PAGE_HELPERS); await page.click("#btn-continue");
    const cont = await ev(page, () => { const [a, b, c] = __game.vets; return [Math.hypot(a.cx - b.cx, a.cy - b.cy), Math.hypot(b.cx - c.cx, b.cy - c.cy), Math.hypot(a.cx - c.cx, a.cy - c.cy)]; });
    ok(cont.every((d) => d >= 32), `ao continuar um jogo salvo com dois veterinários no mesmo tile, eles voltam separados (${cont.map((d) => d.toFixed(0)).join(", ")} px)`);
    // Fase 3 jogada no toque: veterinários 10% mais lentos (só nela); nas outras fases nada muda
    const ease = await ev(page, () => {
      const run = (id, touchMode, row, c0) => {
        __game.start(id); __game.noCatch = true; __game.freezeVets = false; __game.setRand(() => 0.99); __game.touchInput = touchMode;
        for (const v of __game.vets) { v.cool = 999; v.idle = 99; v.leg = null; v.route = []; }
        const v = __game.vets[0]; v.cx = c0 * 32 + 16; v.cy = row * 32 + 16; v.idle = 0; v.route = Array.from({ length: 10 }, (_, k) => [c0 + 1 + k, row]);
        let t = 0; while (v.cx < (c0 + 10) * 32 + 16 - 0.001 && t < 20) { __game.tick(1 / 60); t += 1 / 60; }
        const out = { speed: 320 / t, assist: __game.assist, cfg: v.cfg.speed }; __game.touchInput = false; return out;
      };
      const r = { f3k: run(3, false, 15, 1), f3t: run(3, true, 15, 1), f2t: run(2, true, 14, 1) }; __game.setRand(null); return r;
    });
    ok(Math.abs(ease.f3k.speed - 66.55) < 0.5 && !ease.f3k.assist && Math.abs(ease.f3t.speed - 59.9) < 0.5 && ease.f3t.assist && Math.abs(ease.f2t.speed - 60.5) < 0.5 && !ease.f2t.assist, `Fase 3 no toque: veterinários a ${ease.f3t.speed.toFixed(1)} px/s em vez de ${ease.f3k.speed.toFixed(1)} (10% mais lentos); a Fase 2 no toque segue em ${ease.f2t.speed.toFixed(1)}`);
    // a perseguição se espalha: dois veterinários atrás do cachorro, num mapa com dois caminhos, vêm por caminhos diferentes
    const flank = await ev(page, () => {
      __game.start(4); __game.noCatch = true; __game.setRand(() => 0.99); __game.freezeVets = false;
      const v0 = __game.vets[0], v1 = __game.vets[1], p = __game.player; for (const v of __game.vets) { v.cool = 0; v.think = 0; v.idle = 0; v.leg = null; v.route = []; }
      __game.vets[2].cool = 999; v0.cx = 20 * 32 + 16; v0.cy = 27 * 32 + 16; v1.cx = 19 * 32 + 16; v1.cy = 27 * 32 + 16;
      // dois veterinários lado a lado perseguindo o mesmo cachorro: não podem ficar sobrepostos durante a perseguição
      p.x = 4 * 32 + 4; p.y = 27 * 32 + 4; v0.mode = v1.mode = "chase"; v0.modeT = v1.modeT = 5; v0.chaseAge = v1.chaseAge = 0;
      let minD = 1e9; for (let i = 0; i < 60 * 3; i++) { __game.tick(1 / 60); minD = Math.min(minD, Math.hypot(v0.cx - v1.cx, v0.cy - v1.cy)); }
      return { minD, modes: [v0.mode, v1.mode] };
    });
    ok(flank.minD >= 20, `perseguindo o mesmo cachorro, dois veterinários não se sobrepõem (distância mínima ${flank.minD.toFixed(1)} px)`);
    // a velocidade real é a nominal, qualquer que seja a taxa de quadros (o que sobra de um passo continua no próximo)
    const spd = await ev(page, () => {
      const run = (dt) => {
        __game.start(4); __game.noCatch = true; __game.freezeVets = false; __game.setRand(() => 0.99);
        for (const v of __game.vets) { v.cool = 999; v.idle = 99; v.leg = null; v.route = []; }
        const v = __game.vets[0]; v.cx = 1 * 32 + 16; v.cy = 27 * 32 + 16; v.idle = 0; v.route = Array.from({ length: 14 }, (_, k) => [2 + k, 27]); // 14 tiles = 448 px
        let t = 0; while (v.cx < 15 * 32 + 16 - 0.001 && t < 20) { __game.tick(dt); t += dt; }
        return { t, px: 14 * 32 };
      };
      const a = run(1 / 144), b = run(1 / 60), c = run(1 / 20); __game.setRand(null);
      return { a: a.px / a.t, b: b.px / b.t, c: c.px / c.t, cfg: __game.vets[0].cfg.speed };
    });
    ok([spd.a, spd.b, spd.c].every((s) => Math.abs(s - spd.cfg) / spd.cfg < 0.012), `a velocidade média do veterinário é a da fase (${spd.cfg} px/s) com 144, 60 e 20 quadros por segundo (${spd.a.toFixed(2)}, ${spd.b.toFixed(2)}, ${spd.c.toFixed(2)})`);

    // ---- menu: Jogar fases anteriores (melhorar os recordes) ----
    await fresh(page, { done: [] });
    ok(await page.isHidden("#btn-replay"), "sem nenhuma fase concluída o menu não oferece Jogar fases anteriores");
    await fresh(page, { done: [1, 2, 3] });
    ok(await page.isVisible("#btn-replay") && /Jogar fases anteriores/.test(await page.textContent("#btn-replay")), "com fases concluídas o menu oferece Jogar fases anteriores");
    await ev(page, () => { const st = Records.createStore(localStorage); st.addRun({ level: 1, timeMs: 30000, points: 500, name: "Totó" }); st.addRun({ level: 2, timeMs: 30000, points: 800, name: "Totó" }); st.addRun({ level: 3, timeMs: 30000, points: 900, name: "Totó" }); });
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    await page.click("#btn-replay");
    const list = await page.evaluate(() => ({ title: document.getElementById("levels-title").textContent, help: document.getElementById("levels-help").textContent, btns: [...document.querySelectorAll("#levels-list button")].map((b) => b.textContent) }));
    ok(/Jogar fases anteriores/.test(list.title) && list.btns.length === 3 && /Fase 1/.test(list.btns[0]) && /sua melhor: 500 pts/.test(list.btns[0]) && /jogue de novo para melhorar/.test(list.btns[0]) && !list.btns.some((b) => /Fase 4/.test(b)) && /só a maior pontuação/i.test(list.help), `a lista mostra só as fases já concluídas (3), com a melhor pontuação de cada uma: ${list.btns.map((b) => b.slice(0, 40)).join(" | ")}`);
    await page.click("#levels-list button:nth-child(1)");
    ok(await ev(page, () => [__game.state, __game.level, __game.lives].join()) === "playing,1,3", "escolher uma fase anterior começa essa fase com 3 vidas");
    await finishNow(page, 10);
    const afterRep = await ev(page, () => { const st = Records.createStore(localStorage); return { l1: st.personalBest("Totó", 1).p, l2: st.personalBest("Totó", 2).p, l3: st.personalBest("Totó", 3).p, total: st.totalScore("Totó", [1, 2, 3, 4, 5]) }; });
    ok(afterRep.l1 === 600 && afterRep.l2 === 800 && afterRep.l3 === 900 && afterRep.total === 600 + 800 + 900, `jogar a Fase 1 de novo melhorou só o recorde dela (500 → ${afterRep.l1}); as outras ficam como estavam e o total é a soma dos melhores (${afterRep.total})`);
    await page.click("#btn-win-menu");
    await page.click("#btn-replay"); await page.click("#levels-list button:nth-child(1)");
    await ev(page, () => { __game.freezeVets = true; for (const v of __game.vets) v.cool = 99; }); await catchOnce(page); await finishNow(page, 100);
    const worse = await ev(page, () => { const st = Records.createStore(localStorage); return { l1: st.personalBest("Totó", 1).p, total: st.totalScore("Totó", [1, 2, 3, 4, 5]) }; });
    ok(worse.l1 === 600 && worse.total === 2300 && /Mesma|continua 600/.test(await page.textContent("#win-personal")), `jogar de novo e fazer menos pontos não diminui o recorde (continua ${worse.l1}) nem o total (${worse.total})`);
    await page.click("#btn-win-menu"); await page.click("#btn-start");
    const playList = await page.evaluate(() => [...document.querySelectorAll("#levels-list button")].map((b) => [b.textContent.slice(0, 8), b.disabled]));
    ok(playList.length === 10 && playList[3][1] === false && playList[4][1] === true && playList.slice(5).every((b) => b[1] === true) && /Escolher a fase/.test(await page.textContent("#levels-title")), "Iniciar jogo continua mostrando todas as fases (as liberadas abertas e as outras bloqueadas)");
    // pular de fase não soma partida: ir da Fase 1 direto à 3 deixa a Fase 3 como estava
    await page.click("#levels-list button:nth-child(3)"); await ev(page, () => { __game.freezeVets = true; }); await finishNow(page, 100);
    const skip = await ev(page, () => { const st = Records.createStore(localStorage); return { l3: st.personalBest("Totó", 3).p, total: st.totalScore("Totó", [1, 2, 3, 4, 5]) }; });
    const winPts = Number(await page.textContent("#win-points"));
    ok(skip.l3 === Math.max(900, winPts) && skip.total === 600 + 800 + skip.l3, `pular da Fase 1 para a 3 não soma a partida: o recorde da Fase 3 é só o dela (a partida deu ${winPts}; recorde ${skip.l3}) e o total é a soma dos melhores de cada fase (${skip.total})`);

    // ---- a tabela das fases do README bate com os dados do jogo ----
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    const tbl = readme.slice(readme.indexOf("## Tabela das fases"), readme.indexOf("## Fases"));
    const rows = tbl.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
    const num = (s) => Number(String(s).replace(",", "."));
    const lvData = await ev(page, () => __game.levels.map((l) => ({ id: l.id, vets: l.vets.length, rations: l.rations, bones: l.bones, speed: l.vets[0].speed, chase: l.vets[0].chaseSpeed, minPoints: l.minPoints, dog: l.dogSpeed })));
    ok(rows.length === lvData.length && lvData.length === 10, `a tabela do README tem uma linha para cada fase do jogo (${rows.length} de ${lvData.length})`);
    const diffs = [];
    lvData.forEach((l, i) => {
      const r = rows[i]; if (!r) return;
      const [id, cond, vets, rations, bones, vs, dog] = r, [sp, ch] = vs.replace(/ px\/s/, "").split("/").map((x) => num(x.trim()));
      if (num(id) !== l.id) diffs.push(`fase ${l.id}: id`);
      if (num(vets) !== l.vets) diffs.push(`fase ${l.id}: veterinários ${vets} ≠ ${l.vets}`);
      if (num(rations) !== l.rations) diffs.push(`fase ${l.id}: rações ${rations} ≠ ${l.rations}`);
      if (num(bones) !== l.bones) diffs.push(`fase ${l.id}: ossos ${bones} ≠ ${l.bones}`);
      if (Math.abs(sp - l.speed) > 1e-9 || Math.abs(ch - l.chase) > 1e-9) diffs.push(`fase ${l.id}: velocidades ${vs} ≠ ${l.speed} / ${l.chase}`);
      if (!(Math.abs(num(String(dog).replace(/ px\/s/, "")) - 252 * l.dog) < 1e-6)) diffs.push(`fase ${l.id}: cachorro ${dog} ≠ ${252 * l.dog}`);
      if (l.minPoints) { if (!new RegExp(`chegar a ${l.minPoints} pontos`).test(cond)) diffs.push(`fase ${l.id}: condição "${cond}" sem ${l.minPoints} pontos`); }
      else if (!new RegExp(`pegar as ${l.rations} rações${l.bones ? ` e os ${l.bones} ossos` : ""}`).test(cond)) diffs.push(`fase ${l.id}: condição "${cond}"`);
    });
    ok(!diffs.length, `os números da tabela das fases do README (condição, veterinários, rações, ossos, velocidades) são os do jogo ${diffs.join("; ")}`);
    // ---- a tabela "Fases 6 a 10" do README (mapa, alcance, peças móveis, pontos, renascer) também bate com o jogo ----
    const sec6 = readme.slice(readme.indexOf("### Fases 6 a 10"), readme.indexOf("Nas **Fases 9 e 10**"));
    const T6 = {};
    for (const l of sec6.split("\n")) { if (!l.startsWith("| ") || /^\|[-| ]+\|$/.test(l)) continue; const c = l.split("|").slice(1, -1).map((x) => x.trim().replace(/\*\*/g, "")); T6[c[0]] = c.slice(1); }
    const L6 = await ev(page, () => __game.levels.filter((l) => l.id >= 6).map((l) => {
      const doors = l.blocks.filter((b) => !b.wall), walls = l.blocks.filter((b) => b.wall);
      return { C: l.map[0].length, R: l.map.length, rations: l.rations, bones: l.bones, nv: l.vets.length, lives: l.extraLives, alert: l.alertTiles, nd: doors.length, nw: walls.length, rd: l.blockRange.door, rw: l.blockRange.wall,
        de: doors.map((b) => b.every ?? 3), ds: doors.map((b) => b.speed ?? 120), we: walls.map((b) => b.every), ws: walls.map((b) => b.speed ?? 120), pen: l.lifePenalty, min: l.minPoints, power: l.bonePower, respawn: l.respawnInPlace };
    }));
    const d6 = [], fmtS = (x) => String(x).replace(".", ",");
    const need = (name) => { if (!T6[name] || T6[name].length !== 5) d6.push(`linha "${name}" não encontrada`); return T6[name] || []; };
    L6.forEach((l, i) => {
      const id = l.id ?? i + 6, chk = (name, want, got) => { if (!new RegExp(`^${want}`).test(got || "")) d6.push(`Fase ${i + 6} ${name}: "${got}" ≠ "${want}"`); };
      chk("mapa", `${l.C} × ${l.R}`, need("Mapa")[i]);
      chk("rações/ossos", `${l.rations} / ${l.bones}`, need("Rações / ossos")[i]);
      chk("veterinários", String(l.nv), need("Veterinários (no centro do mapa)")[i]);
      chk("vidas escondidas", `${l.lives[0]} ou ${l.lives[1]}`, need("Vidas escondidas (sorteio por jogo)")[i]);
      chk("alcance", String(l.alert), need('Alcance do "!"')[i]);
      chk("peças", `${l.nd} / ${l.nw}`, need("Portas de bloco / paredes (definidas)")[i]);
      chk("sorteio", `${l.rd[0]}–${l.rd[1]}; ${l.rw[0]}–${l.rw[1]}`, need("Sorteio por jogo (portas; paredes)")[i]);
      chk("portas", `${fmtS(l.de[0])} s${l.ds[0] !== 120 ? ` \\(${l.ds[0]} px/s\\)` : ""}`, need("Portas mudam de lado a cada")[i]);
      chk("paredes", `${fmtS(l.we[0])} s${l.ws[0] !== 120 ? ` \\(${l.ws[0]} px/s\\)` : ""}`, need("Paredes mudam de lado a cada")[i]);
      if (new Set(l.de).size !== 1 || new Set(l.we).size !== 1 || new Set(l.ds).size !== 1 || new Set(l.ws).size !== 1) d6.push(`Fase ${i + 6}: peças do mesmo tipo com intervalos ou velocidades diferentes`);
      chk("perda/pontos", `−${l.pen} / ${l.min}`, need("Perda por vida / pontos para passar")[i]);
      chk("poder", `${l.power} s`, need("Poder do osso")[i]);
      chk("renascer", l.respawn ? "renasce onde morreu" : "volta ao início", need("Ao ser pego ou esmagado")[i]);
    });
    ok(L6.length === 5 && !d6.length, `a tabela das Fases 6 a 10 do README (mapa, rações, ossos, veterinários, vidas escondidas, alcance, peças móveis, pontos, poder, renascer) bate com o jogo ${d6.join("; ")}`);
  });

  // =====================================================================
  await section("vidas cumulativas (1 a 5) passam para a próxima fase", async () => {
    // a ração com a vida extra da Fase 1 dá +1 no caminho (até o teto de 5): 5 → 5, 3 → 4, 1 → 2
    for (const [start, carry] of [[5, 5], [3, 4], [1, 2]]) {
      await play(page); await ev(page, (n) => { __game.freezeVets = true; __game.setLives(n); }, start);
      await finishNow(page, 10);
      ok(await ev(page, () => __game.state) === "won" && /Próxima fase \(Fase 2\)/.test(await page.textContent("#btn-next")), `terminou a Fase 1 começando com ${start} vidas (e pegando a vida extra)`);
      ok(new RegExp(`Você leva ${carry} ${carry === 1 ? "vida" : "vidas"} para a Fase 2`).test(await page.textContent("#win-extra")), `a tela avisa quantas vidas passam para a Fase 2 (${carry})`);
      await page.click("#btn-next");
      ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.level) === 2 && await ev(page, () => __game.lives) === carry, `Próxima fase: a Fase 2 começa com as mesmas ${carry} vidas`);
      ok(await ev(page, () => __game.collected) === 0 && await ev(page, () => __game.retries) === 0 && await ev(page, () => __game.livesLost) === 0, "e com rações, perdas e tentativas zeradas");
      const shown = await page.$$eval("#hud-lives .heart:not(.hidden)", (h) => h.length);
      ok(shown === Math.max(3, carry) && await lostHearts(page, Math.max(3, carry) - carry), `o placar mostra ${carry} coração(ões) vermelho(s)`);
    }
    // vida extra continua valendo até o teto de 5 também na Fase 2
    await ev(page, () => { __game.setRand(() => 0.99); __game.start(2, { lives: 4 }); __game.setRand(null); __game.freezeVets = true; });
    const r = await ev(page, () => { for (const it of __game.items.filter((i) => i.life)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } return __game.lives; });
    ok(r === 5, "na Fase 2, com 4 vidas e 2 vidas extras, o limite é 5 (a segunda não passa do máximo)");
    // Jogar novamente / escolher a fase recomeça com 3 vidas
    await ev(page, () => { __game.start(1); __game.freezeVets = true; __game.setLives(5); });
    await finishNow(page, 10);
    await page.click("#btn-again");
    ok(await ev(page, () => __game.level) === 1 && await ev(page, () => __game.lives) === 3, "Jogar novamente recomeça a fase com 3 vidas");
  });

  // =====================================================================
  await section("pontuação negativa e tentativas (3 chances de reiniciar a fase)", async () => {
    await play(page);
    ok(await hudIs(page, "#hud-points", "0"), "começa em 0 pontos");
    ok((await catchOnce(page))[0] === 2 && await hudIs(page, "#hud-points", "-50") && await ev(page, () => __game.score) === -50, "perder a primeira vida sem nenhuma ração deixa a pontuação NEGATIVA (−50)");
    ok((await catchOnce(page))[0] === 1 && await hudIs(page, "#hud-points", "-100"), "e continua descendo: −100 na segunda vida");
    const [, st] = await catchOnce(page);
    ok(st === "lost" && /Pontos: -150/.test(await page.textContent("#lose-text")), "a tela final mostra a pontuação negativa (−150)");
    ok(/3 vezes/.test(await page.textContent("#lose-chances")) && await page.isVisible("#btn-retry") && /−100 pontos/.test(await page.textContent("#btn-retry")), "o jogador tem 3 chances (cada uma custa 100 pontos)");

    // 1ª, 2ª e 3ª novas tentativas
    for (let n = 1; n <= 3; n++) {
      const before = await ev(page, () => ({ level: __game.level, items: __game.items.map((i) => [i.x, i.y].join()).join("|") }));
      await page.click("#btn-retry");
      const now = await ev(page, () => ({ state: __game.state, level: __game.level, lives: __game.lives, retries: __game.retries, collected: __game.collected, lost: __game.livesLost, time: __game.time, p: [__game.player.x, __game.player.y], score: __game.score, items: __game.items.map((i) => [i.x, i.y].join()).join("|") }));
      ok(now.state === "playing" && now.level === 1 && now.lives === 3 && now.retries === n && now.collected === 0 && now.lost === 0 && now.time < 0.5, `tentativa ${n}: a fase recomeça do zero (3 vidas, rações e tempo zerados)`);
      ok(now.p[0] === dogStart[0] * 32 + 4 && now.p[1] === dogStart[1] * 32 + 4, `tentativa ${n}: o cachorro volta ao ponto de partida da fase`);
      ok(now.score === -100 * n && await hudIs(page, "#hud-points", String(-100 * n)), `tentativa ${n}: custa 100 pontos (placar ${-100 * n})`);
      ok(await page.isVisible("#hud-retry-item") && await hudIs(page, "#hud-retry", `${n}/3`), `o placar mostra TENTATIVAS ${n}/3`);
      ok(/Tentativa extra/.test(await page.textContent("#toast")), "aviso de tentativa extra");
      ok(now.items !== before.items, "as rações ficam em lugares novos");
      for (let k = 0; k < 3; k++) await catchOnce(page);
      ok(await ev(page, () => __game.state) === "lost", `tentativa ${n}: perdendo todas as vidas de novo`);
      const t = await page.textContent("#lose-chances");
      if (n < 3) ok(new RegExp(`${3 - n} ${3 - n === 1 ? "vez" : "vezes"}`).test(t) && await page.isVisible("#btn-retry"), `sobram ${3 - n} chance(s)`);
      else ok(/Acabaram as suas chances/.test(t) && await page.isHidden("#btn-retry") && await ev(page, () => document.activeElement.id) === "btn-lose-menu", "depois das 3 novas tentativas não há mais chance: só resta o Menu");
    }
    await page.click("#btn-lose-menu");
    await page.click("#btn-start");
    ok(await ev(page, () => __game.retries) === 0 && await ev(page, () => __game.lives) === 3, "um novo jogo pelo menu começa sem tentativas usadas");

    // vencer depois de tentativas: os 100 pontos de cada tentativa são descontados
    for (const [n, expect] of [[1, 600 - 100], [3, 600 - 300]]) {
      await ev(page, (n) => __game.start(1, { retries: n }), n);
      await finishNow(page, 10);
      ok(await ev(page, () => __game.state) === "won" && await page.textContent("#win-points") === String(expect), `vitória na tentativa extra ${n}: 500 + 100 de bônus − ${100 * n} = ${expect}`);
      ok(new RegExp(`− tentativas extras: ${100 * n}`).test(await page.textContent("#win-breakdown")), "a tela de vitória mostra o desconto das tentativas");
    }
    const st2 = await ev(page, () => Records.createStore(localStorage).personalBest("Totó", 1));
    ok(st2 && st2.p === 500, "a melhor pontuação guardada é a da tentativa 1 (500), não a da 3 (300)");

    // na Fase 2 a nova tentativa recomeça a Fase 2 (não a 1)
    await playLevel(page, 2, { done: [1] });
    for (let k = 0; k < 3; k++) await catchOnce(page);
    ok(await ev(page, () => __game.state) === "lost" && /Fase 2/.test(await page.textContent("#lose-chances")), "sem vidas na Fase 2: a mensagem fala da Fase 2");
    await page.click("#btn-retry");
    ok(await ev(page, () => [__game.level, __game.items.length, __game.vets.length, __game.retries, __game.lives].join()) === "2,9,2,1,3", "nova tentativa na Fase 2 recomeça a Fase 2 do zero (9 itens, 2 veterinários, 3 vidas)");
    ok(await hudIs(page, "#hud-points", "-100"), "e custa 100 pontos");
  });

  // =====================================================================
  await section("ranking compartilhado entre aparelhos e logins (servidor REST e banco do Claude)", async () => {
    const http = require("http");
    // servidor de ranking no estilo Firebase Realtime Database, só para o teste
    const db = { scores: null }, writes = [];
    const srv = http.createServer((req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
      if (req.method === "OPTIONS") { res.writeHead(204).end(); return; }
      const parts = decodeURIComponent(req.url.split("?")[0]).replace(/^\/rank\//, "").replace(/\.json$/, "").split("/").filter(Boolean);
      let body = ""; req.on("data", (c) => (body += c));
      req.on("end", () => {
        let node = db;
        if (req.method === "PUT") {
          for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]] || (node[parts[i]] = {});
          node[parts[parts.length - 1]] = JSON.parse(body); writes.push(parts.join("/"));
          res.writeHead(200, { "Content-Type": "application/json" }).end(body); return;
        }
        for (const k of parts) node = node && typeof node === "object" ? node[k] : undefined;
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(node === undefined ? null : node));
      });
    });
    await new Promise((r) => srv.listen(0, "127.0.0.1", r));
    const rankingUrl = `http://127.0.0.1:${srv.address().port}/rank`;
    let hits = 0; srv.on("request", () => { hits++; });
    const waitFor = async (cond, ms = 5000) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Error("tempo esgotado"); await new Promise((r) => setTimeout(r, 25)); } };
    const device = async (name, init) => { // um aparelho = um contexto com armazenamento próprio
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const pg = await ctx.newPage(); watch(pg);
      if (init) await init(pg, ctx);
      await fresh(pg, { name });
      return pg;
    };
    const withUrl = (pg) => pg.addInitScript((u) => { window.GAME_CONFIG = { sharedRanking: true, rankingUrl: u }; }, rankingUrl);
    const openScores = async (pg) => { await pg.click("#btn-scores"); await pg.waitForFunction(() => { const s = document.getElementById("scores-source").textContent; return /compartilhado|deste aparelho/.test(s) && !/Buscando/.test(s); }); }; // espera a resposta (não o aviso de "buscando")
    const shared = (pg) => pg.waitForFunction(() => /vários aparelhos/.test(document.getElementById("scores-source").textContent), null, { timeout: 5000 }).then(() => true, () => false);
    const levelRows = (pg, n) => pg.$$eval(`#scores-public section:nth-of-type(${n + 1}) li`, (ls) => ls.map((l) => l.textContent));
    try {
      // --- stand by (padrão): endereço configurado e banco do Claude disponível, mas SEM sharedRanking:true → nada é usado ---
      const S0 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const P0 = await S0.newPage(); watch(P0);
      let dbCalls = 0;
      await P0.exposeFunction("__dbCall", () => { dbCalls++; });
      await P0.addInitScript((u) => {
        window.GAME_CONFIG = { rankingUrl: u }; // sem sharedRanking: stand by
        window.claude = { use: async (n) => { window.__dbCall(); return null; } };
      }, rankingUrl);
      await fresh(P0, { name: "Zeca" });
      await P0.click("#btn-start"); await finishNow(P0, 8);
      await P0.click("#btn-win-scores");
      await P0.waitForFunction(() => /deste aparelho/.test(document.getElementById("scores-source").textContent));
      await P0.waitForTimeout(500);
      ok(hits === 0 && dbCalls === 0 && !db.scores, "stand by: com endereço configurado e banco do Claude disponível, mas sem ligar o ranking compartilhado, nada é enviado nem consultado");
      ok(/Zeca — \d+ pts/.test(await P0.textContent("#scores-public")) && !/compartilhado/.test(await P0.textContent("#scores-source")), "e o ranking por aparelho funciona normalmente (o Zeca aparece)");
      await S0.close();

      // --- aparelho A: a Ana termina a Fase 1 ---
      const A = await device("Ana", withUrl);
      await A.click("#btn-start"); await finishNow(A, 12);
      ok(await ev(A, () => __game.state) === "won", "aparelho A: Ana termina a Fase 1");
      await waitFor(() => db.scores && db.scores[1] && db.scores[1].ana);
      const anaP = Number(await A.textContent("#win-points"));
      ok(db.scores[1].ana.p === anaP && db.scores[1].ana.n === "Ana" && db.scores[1].ana.t > 0, `a pontuação (${anaP}) foi enviada ao servidor de ranking`);

      // --- aparelho B (outro navegador, outro login): a Bia vê o ranking da Ana ---
      const B = await device("Bia", withUrl);
      await openScores(B);
      ok(await shared(B) && /127\.0\.0\.1/.test(await B.textContent("#scores-source")), "aparelho B: o ranking é identificado como compartilhado");
      ok((await levelRows(B, 1)).join("|").startsWith(`Ana — ${anaP} pts`), "aparelho B vê a Ana no ranking da Fase 1, sem nunca ter jogado com ela");
      const privB = await B.textContent("#scores-private");
      ok(/0 pontos/.test(privB) && !/Ana/.test(privB), "mas a parte individual da Bia é só dela (nada da Ana)");
      ok(await ev(B, () => !localStorage.getItem("cachorrinho.v1").includes("Ana")), "e os dados da Ana não são copiados para o armazenamento do aparelho B");
      await B.keyboard.press("Escape");

      // --- a Bia joga mais rápido e passa a Ana; a Ana vê (só a melhor de cada uma, sem histórico) ---
      await B.click("#btn-start"); await finishNow(B, 5);
      const biaP = Number(await B.textContent("#win-points"));
      ok(biaP >= anaP, `aparelho B: Bia termina a Fase 1 com ${biaP} pontos`);
      await waitFor(() => db.scores[1].bia);
      await A.click("#btn-win-scores");
      await shared(A);
      await A.waitForFunction(() => /Bia/.test(document.getElementById("scores-public").textContent));
      const rowsA = await levelRows(A, 1);
      ok(rowsA.length === 2 && /^Bia —/.test(rowsA[0]) && /^Ana —/.test(rowsA[1]), `aparelho A vê os dois jogadores, com a mesma pontuação decidida pelo menor tempo (${rowsA.join(" | ")})`);
      const totals = await A.$$eval("#scores-public section:nth-of-type(1) li", (ls) => ls.map((l) => l.textContent));
      ok(totals.length === 2 && totals.some((t) => t.startsWith("Bia —")) && totals.some((t) => t.startsWith("Ana —")), "o ranking geral também mostra os dois");
      ok(/Ana/.test(await A.textContent("#scores-private")) && !/Bia/.test(await A.textContent("#scores-private")), "a parte individual da Ana continua só dela");
      await A.keyboard.press("Escape"); await A.click("#btn-win-menu");

      // --- melhor pontuação apenas: uma partida pior da Ana não muda o servidor; uma melhor atualiza ---
      const snapshotServer = JSON.stringify(db.scores);
      await A.click("#btn-start"); // nenhuma fase nova liberada? A Fase 2 está liberada: escolhe a Fase 1
      await A.click("#levels-list button:nth-child(1)"); await ev(A, () => { __game.freezeVets = true; });
      await ev(A, () => { const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); }); // perde uma vida: partida pior
      await finishNow(A, 60);
      ok(Number(await A.textContent("#win-points")) < anaP, "a Ana joga de novo, mais devagar e perdendo uma vida: pontuação pior");
      await A.waitForTimeout(400);
      ok(JSON.stringify(db.scores) === snapshotServer, "partida pior não altera o ranking do servidor");
      ok(Object.keys(db.scores[1]).sort().join() === "ana,bia" && Object.keys(db.scores).join() === "1", "o servidor guarda uma única entrada por jogador e fase (sem histórico)");

      // --- ao abrir Pontuações, o aparelho envia o que o servidor ainda não tem ---
      const C = await device("Cid"); // sem servidor configurado: joga offline
      await C.click("#btn-start"); await finishNow(C, 9);
      await C.waitForTimeout(200);
      ok(!db.scores[1].cid, "sem servidor configurado, o resultado do Cid fica só no aparelho dele");
      await C.click("#btn-win-scores");
      ok(/deste aparelho/.test(await C.textContent("#scores-source")) && (await levelRows(C, 1)).length === 1, "e o ranking dele mostra só os jogadores daquele aparelho");
      await C.context().close();
      // o mesmo jogador, num aparelho em que o servidor já está configurado e que já tinha uma pontuação guardada
      const C2 = await device("Cid", withUrl);
      await C2.evaluate(() => Records.createStore(localStorage).addRun({ level: 1, timeMs: 9000, points: 600 }));
      await C2.reload(); await C2.evaluate(PAGE_HELPERS);
      await openScores(C2); await shared(C2);
      await waitFor(() => db.scores[1].cid);
      ok(db.scores[1].cid.p === 600, "ao abrir Pontuações com o servidor ligado, a melhor pontuação que só existia no aparelho é enviada");
      ok((await levelRows(C2, 1)).length === 3, "e o ranking passa a ter os 3 jogadores");

      // --- dados ruins no servidor são ignorados ---
      db.scores[1].hack = { n: "<img src=x onerror=alert(1)>", p: 99999, t: 1000, w: 1 };
      db.scores[1].big = { n: "Gigante", p: 10 ** 9, t: 1000, w: 1 };
      db.scores[11] = { z: { n: "FaseFalsa", p: 1, t: 1000, w: 1 } };
      await C2.keyboard.press("Escape"); await openScores(C2); await shared(C2);
      const txt = await C2.textContent("#scores-public");
      ok(!/img|Gigante|FaseFalsa/.test(txt) && (await levelRows(C2, 1)).length === 3, "nomes com HTML, pontuações absurdas e fases inexistentes vindos do servidor não aparecem");
      ok(await C2.$("#scores-public img") === null, "nada do servidor é inserido como HTML");
      await C2.context().close();
      await B.context().close(); await A.context().close();

      // --- servidor fora do ar: volta ao ranking do aparelho, sem erro ---
      const url2 = rankingUrl; await new Promise((r) => srv.close(r)); // (fecha o servidor)
      const ctxD = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const D = await ctxD.newPage(); // (sem o observador de erros: o navegador registra a conexão recusada no console)
      await D.addInitScript((u) => { window.GAME_CONFIG = { sharedRanking: true, rankingUrl: u }; }, url2);
      await fresh(D, { name: "Dino", runs: [{ name: "Dino", timeMs: 20000 }] });
      await D.click("#btn-scores");
      await D.waitForFunction(() => /deste aparelho/.test(document.getElementById("scores-source").textContent));
      await D.waitForTimeout(600);
      ok(/deste aparelho/.test(await D.textContent("#scores-source")) && (await levelRows(D, 1)).join("|").startsWith("Dino — 600"), "servidor fora do ar: o ranking do aparelho continua aparecendo");
      ok(await ev(D, () => document.getElementById("scores").classList.contains("hidden")) === false, "e a tela não quebra");
      await ctxD.close();
    } finally { if (srv.listening) await new Promise((r) => srv.close(r)); }

    // --- banco compartilhado do Claude (página publicada no Claude): um documento por visitante ---
    const docs = new Map();
    const mkClaude = async (uid) => {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const pg = await ctx.newPage(); watch(pg);
      await pg.exposeFunction("__dbGet", (p) => docs.get(p) ?? null);
      await pg.exposeFunction("__dbSet", (p, d) => { docs.set(p, JSON.parse(JSON.stringify(d))); });
      await pg.exposeFunction("__dbList", (c) => [...docs].filter(([p]) => p.startsWith(c + "/")).map(([p, d]) => [p.split("/")[1], d]));
      await pg.addInitScript((uid) => {
        const snap = (id, d) => ({ id, exists: d !== null, data: () => (d === null ? undefined : d) });
        const db = {
          collection: (c) => ({ get: async () => ({ docs: (await window.__dbList(c)).map(([id, d]) => snap(id, d)) }) }),
          doc: (p) => ({ get: async () => snap(p.split("/")[1], await window.__dbGet(p)), set: (d) => window.__dbSet(p, d) }),
        };
        window.claude = { use: async (n) => (n === "db" ? db : n === "user" ? { id: async () => uid } : null) };
        window.GAME_CONFIG = { sharedRanking: true };
      }, uid);
      return pg;
    };
    const E = await mkClaude("uid-E"), F = await mkClaude("uid-F");
    await fresh(E, { name: "Eva" }); await fresh(F, { name: "Fred" });
    await E.click("#btn-start"); await finishNow(E, 11);
    await waitFor(() => docs.has("scores/uid-E"));
    const entry = docs.get("scores/uid-E");
    ok(Object.keys(entry).join() === "entries" && Object.keys(entry.entries).join() === "1|eva" && entry.entries["1|eva"].n === "Eva", "banco do Claude: um documento por visitante, só com a melhor pontuação de cada fase");
    await F.click("#btn-scores");
    await F.waitForFunction(() => /compartilhado/.test(document.getElementById("scores-source").textContent) && /Eva/.test(document.getElementById("scores-public").textContent), null, { timeout: 5000 });
    ok(/banco compartilhado do Claude/.test(await F.textContent("#scores-source")) && !/Eva/.test(await F.textContent("#scores-private")), "outro login vê a Eva no ranking do jogo, mas não na parte individual");
    await E.context().close(); await F.context().close();
  });

  // =====================================================================
  await section("correções da auditoria (0.5.0)", async () => {
    const SAVE_KEY = "cachorrinho.save.v1";

    // --- A: ração que muda de lugar nunca cai em cima de uma já pega; o jogo salvo continua válido ---
    await playLevel(page, 2, { done: [1], keepSave: true });
    const rel = await ev(page, () => {
      const key = (it) => (it.x - 8) / 32 + "," + (it.y - 8) / 32;
      let dup = 0, relocations = 0;
      for (let round = 0; round < 300; round++) {
        __game.start(2); __game.freezeVets = true;
        for (const it of __game.items.slice(0, 3)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
        for (let k = 0; k < 2; k++) {
          __game.setLives(5);
          for (const v of __game.vets) v.cool = 99;
          for (let i = 0; i < 45; i++) __game.tick(0.05); // passa a proteção
          const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); // perde uma vida
          relocations++;
          if (new Set(__game.items.map(key)).size !== __game.items.length) dup++;
        }
      }
      __game.save();
      return { dup, relocations };
    });
    ok(rel.dup === 0 && rel.relocations === 600, `A: em ${rel.relocations} trocas de lugar com 3 rações já pegas, nenhuma ração caiu em cima de outra (${rel.dup} sobreposições)`);
    await ev(page, () => { document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); });
    ok(await page.isVisible("#btn-continue"), "A: depois de várias vidas perdidas, o jogo salvo continua válido e o Continuar jogo aparece");

    // --- relógio nunca anda para trás (tempo de quadro negativo invalidava o jogo salvo) ---
    const neg = await ev(page, () => {
      __game.start(2); __game.freezeVets = true;
      const v = __game.vets[0], p = __game.player; for (const x of __game.vets) x.cool = 99;
      v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); // perde uma vida: proteção de 2 s
      const t0 = __game.time, i0 = __game.invuln;
      for (const bad of [-0.4, -1e-9, NaN, undefined]) __game.tick(bad);
      return { dt: __game.time - t0, di: __game.invuln - i0 };
    });
    ok(neg.dt === 0 && neg.di === 0, "tempo de quadro negativo ou inválido é ignorado: o tempo e a proteção não andam para trás nem aumentam");
    await ev(page, () => { __game.save(); document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); });
    ok(await page.isVisible("#btn-continue"), "depois de pausar logo após perder uma vida, o jogo salvo continua válido");

    // --- N/P: blur pausa; Espaço com botão focado; toast e fundo das telas ---
    await page.click("#btn-continue");
    await ev(page, () => { __game.freezeVets = true; });
    await ev(page, () => window.dispatchEvent(new Event("blur")));
    ok(await ev(page, () => __game.state) === "paused" && await page.isVisible("#pause"), "N: perder o foco da janela pausa o jogo");
    ok(!(await page.$eval("#toast", (e) => e.classList.contains("show"))), "P: o aviso do jogo some quando uma tela abre (não aparece por trás do texto)");
    await page.click("#btn-pause-menu");
    await ev(page, () => window.dispatchEvent(new Event("blur")));
    ok(await ev(page, () => __game.state) === "menu", "N: perder o foco no menu não faz nada");

    // --- B: vitória > Pontuações > Voltar preserva a Próxima fase e as vidas ---
    await play(page); await ev(page, () => { __game.freezeVets = true; __game.setLives(3); });
    await finishNow(page, 10);
    const carry = Number((await page.textContent("#win-extra")).match(/Você leva (\d+)/)[1]);
    ok(await ev(page, () => __game.state) === "won" && await ev(page, () => document.getElementById("win").style.opacity === "") && /rgba\(10, 12, 18, 0\.9[0-9]*\)/.test(await ev(page, () => getComputedStyle(document.getElementById("win")).backgroundColor)), "P: o fundo das telas de vitória/derrota é quase opaco (placar e aviso não aparecem por trás)");
    await page.click("#btn-win-scores"); await page.click("#btn-scores-back");
    ok(await page.isVisible("#win") && await page.isVisible("#btn-next"), "B: Voltar das Pontuações abertas na vitória leva de volta à vitória, com Próxima fase");
    await page.click("#btn-next");
    ok(await ev(page, () => __game.level) === 2 && await ev(page, () => __game.lives) === carry, `B: e as ${carry} vidas acumuladas passam para a Fase 2`);
    await ev(page, () => { document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); });
    await page.click("#btn-scores"); await page.click("#btn-scores-back");
    ok(await page.isVisible("#menu"), "B: Pontuações abertas do menu voltam ao menu");

    // --- G: "Apagar e começar de novo" só apaga o jogo salvo quando o novo jogo realmente começa ---
    await fresh(page, { keepSave: true, done: [1] });
    await page.evaluate(() => __game.start(1)); await ev(page, () => { __game.freezeVets = true; __game.tick(2); __game.save(); document.getElementById("btn-pause").click(); document.getElementById("btn-pause-menu").click(); });
    const has = () => ev(page, () => Records.createStore(localStorage).hasGame("Totó"));
    ok(await has(), "G: (antes) há um jogo salvo");
    await page.click("#btn-start"); await page.click("#btn-confirm-new");
    ok(await page.isVisible("#levels") && await has(), "G: Apagar e começar de novo abre a escolha da fase e o jogo salvo ainda existe");
    await page.click("#btn-levels-back");
    ok(await page.isVisible("#btn-continue") && await has(), "G: cancelar na escolha da fase não perde o jogo salvo");
    await page.click("#btn-start"); await page.click("#btn-confirm-new"); await page.click("#levels-list button:nth-child(1)");
    ok(await ev(page, () => __game.state) === "playing" && !(await has()), "G: escolher a fase de fato começa o jogo novo e só então o salvo antigo é descartado");

    // --- I: segurar o Esc não alterna a pausa ---
    const held = await ev(page, () => {
      const kd = (repeat) => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", repeat }));
      kd(false); const afterFirst = __game.state;
      for (let i = 0; i < 5; i++) kd(true); // (número ÍMPAR: sem a proteção, cada repetição alternaria a pausa e o estado final seria "playing")
      return [afterFirst, __game.state];
    });
    ok(held.join() === "paused,paused", "I: segurar o Esc pausa uma vez e não fica pausando e continuando");
    await page.keyboard.press("Escape");

    // --- salvar: aviso honesto e salvamento ao perder uma vida ---
    await ev(page, () => { __game.freezeVets = true; localStorage.removeItem("cachorrinho.save.v1"); });
    await catchOnce(page);
    const lifeSave = await ev(page, () => { const raw = JSON.parse(localStorage.getItem("cachorrinho.save.v1") || "null"); return raw && raw.saves && raw.saves.toto && raw.saves.toto.snap.lives; });
    ok(lifeSave === 2, "salvar: perder uma vida salva o jogo na hora (autosave)");

    // --- O: contraste do texto SAÍDA ---
    const exitPixels = (open) => ev(page, (open) => {
      __game.start(1); __game.freezeVets = true;
      if (open) for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } // pega todas: a saída abre
      __game.player.x = 36; __game.player.y = 36; // o início da Fase 1
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => {
        const cv = document.getElementById("game"), c = cv.getContext("2d"), k = __game.view.k, e = __game.exit;
        const d = c.getImageData(Math.round(e.x * k), Math.round(e.y * k), Math.round(e.w * k), Math.round(e.h * k)).data;
        let white = 0, dark = 0;
        for (let i = 0; i < d.length; i += 4) { if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) white++; if (d[i] < 40 && d[i + 1] < 90 && d[i + 2] < 60) dark++; }
        resolve({ white, dark });
      })));
    }, open);
    const closed = await exitPixels(false), open = await exitPixels(true);
    ok(closed.white > 20 && closed.dark < 5, `O: saída fechada (fundo avermelhado): texto claro (${closed.white} px claros)`);
    ok(open.dark > 20 && open.white < 5, `O: saída aberta (fundo verde claro): texto escuro com bom contraste (${open.dark} px escuros, ${open.white} claros)`);

    // --- M: telas longas rolam com as setas e a barra de espaço ---
    await page.setViewportSize({ width: 390, height: 480 });
    await fresh(page); await page.click("#btn-howto");
    ok(await ev(page, () => document.activeElement.id) === "howto", "M: ao abrir Como jogar o foco fica na própria tela (para rolar)");
    const top0 = await ev(page, () => document.getElementById("howto").scrollTop);
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(500); // o navegador rola com animação
    const top1 = await ev(page, () => document.getElementById("howto").scrollTop);
    await page.keyboard.press("Space"); await page.waitForTimeout(500);
    const top2 = await ev(page, () => document.getElementById("howto").scrollTop);
    ok(top1 > top0 && top2 > top1 && await page.isVisible("#howto"), `M: setas e Espaço rolam o Como jogar (${top0} → ${top1} → ${top2}) sem acionar o Voltar`);
    await page.keyboard.press("Escape");
    ok(await page.isVisible("#menu"), "M: Esc continua voltando ao menu");
    await page.click("#btn-scores");
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
    ok(await page.isVisible("#scores") && await ev(page, () => document.activeElement.id) === "scores", "M: as setas também rolam as Pontuações, sem sair da tela");
    await page.setViewportSize({ width: 1280, height: 720 });

    // --- nomes e contas (J) ---
    const idle = (id) => page.waitForFunction((id) => !document.getElementById(id).disabled, id, { timeout: 15000 });
    await fresh(page, { name: "" });
    await page.click("#btn-name"); await page.click("#btn-open-register");
    await page.fill("#reg-user", "Totó"); await page.fill("#reg-pass", "Senha1234"); await page.fill("#reg-pass2", "Senha1234");
    await page.click("#btn-register-submit"); await idle("btn-register-submit");
    await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
    ok(await page.textContent("#menu-player") === "Totó (conta com senha)", "(antes) conta criada e conectada");
    await page.click("#btn-name"); await page.click("#name button[type=submit]");
    ok(await page.isVisible("#menu") && await page.textContent("#menu-player") === "Totó (conta com senha)" && (await page.textContent("#name-error")) === "", "J: salvar o nome da própria conta em que já se entrou volta ao menu, sem erro");
    await page.click("#btn-logout");
    await page.click("#btn-name"); await page.fill("#name-input", "Totó "); await page.click("#name button[type=submit]");
    ok(/conta com senha/.test(await page.textContent("#name-error")) && await page.isVisible("#name"), "J: nome de conta digitado com espaço no fim recebe a mensagem certa (conta com senha)");
    await page.fill("#name-input", "Toto."); await page.click("#name button[type=submit]");
    ok(/conta com senha/.test(await page.textContent("#name-error")), "J: nome de conta com pontuação no fim também");
    await page.keyboard.press("Escape");

    // --- K: cadastro demorado concluído depois que a pessoa já saiu da tela não puxa de volta ---
    const slow = await newPage();
    await slow.addInitScript(() => { try { Object.defineProperty(window.crypto, "subtle", { value: undefined, configurable: true }); } catch { /* */ } });
    await slow.goto(URL); await slow.evaluate(() => localStorage.clear()); await slow.reload();
    await slow.click("#btn-name"); await slow.click("#btn-open-register");
    await slow.fill("#reg-user", "Bidu"); await slow.fill("#reg-pass", "Compat#JS-2024"); await slow.fill("#reg-pass2", "Compat#JS-2024");
    await slow.evaluate(() => { document.getElementById("btn-register-submit").click(); document.getElementById("btn-register-back").click(); }); // envia e já volta
    ok(await slow.isVisible("#name"), "K: depois de Voltar, a pessoa está na tela do nome");
    await slow.waitForFunction(() => !document.getElementById("btn-register-submit").disabled, null, { timeout: 15000 });
    await slow.waitForTimeout(300);
    ok(await slow.isVisible("#name") && await ev(slow, () => __game.state) === "menu", "K: o cadastro que terminou depois não tira a pessoa da tela em que ela está");
    await slow.keyboard.press("Escape");
    ok(await slow.textContent("#menu-player") === "Bidu (conta com senha)", "K: a conta foi criada e o menu mostra o jogador conectado");
    await slow.context().close();

    // --- E/F/L: telas e placar legíveis e sem esconder botões em celulares ---
    const fit = async (vp) => {
      const t = await newPage({ viewport: vp, hasTouch: true, isMobile: true });
      await fresh(t, { done: [1], keepSave: true });
      const out = {};
      const measure = (name) => ev(t, () => { const sc = document.querySelector(".screen:not(.hidden)"); const btns = [...sc.querySelectorAll("button")].filter((b) => b.offsetParent); return { overflow: sc.scrollHeight - sc.clientHeight, bottom: Math.max(...btns.map((b) => b.getBoundingClientRect().bottom)), firstBottom: btns[0].getBoundingClientRect().bottom, vh: innerHeight }; }).then((m) => { out[name] = m; });
      await ev(t, () => { __game.start(1); __game.freezeVets = true; __game.tick(5); __game.save(); document.getElementById("btn-pause").click(); });
      await measure("pausa");
      await ev(t, () => document.getElementById("btn-pause-menu").click());
      await measure("menu");
      const credit = await ev(t, () => { const r = document.querySelector("#menu .credit").getBoundingClientRect(); return { bottom: r.bottom, vh: innerHeight }; });
      await ev(t, () => { document.getElementById("btn-continue").click(); for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); });
      await measure("vitória");
      await ev(t, () => { __game.start(2); __game.freezeVets = true; for (let k = 0; k < 3; k++) { for (const v of __game.vets) v.cool = 99; for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); } });
      await measure("derrota");
      await t.context().close();
      return { out, credit };
    };
    for (const vp of [{ width: 740, height: 390 }, { width: 667, height: 375 }]) {
      const r = await fit(vp);
      const all = Object.entries(r.out);
      ok(all.every(([, m]) => m.overflow <= 1 && m.bottom <= m.vh), `E: em ${vp.width}x${vp.height} (celular deitado) menu com jogo salvo, pausa, vitória e derrota cabem sem rolar, com todos os botões à vista (${all.map(([n, m]) => `${n}: ${Math.round(m.bottom)}/${m.vh}`).join(", ")})`);
      ok(r.credit.bottom <= r.credit.vh, `L: ${vp.width}x${vp.height}: o crédito do criador aparece no menu`);
    }
    const small = await fit({ width: 320, height: 568 });
    ok(Object.values(small.out).every((m) => m.firstBottom <= m.vh && m.overflow <= 12), `E: em 320x568 (celular pequeno em pé) o botão principal de cada tela está à vista (rolagem de no máximo uns pixels): ${Object.entries(small.out).map(([n, m]) => `${n}: 1º botão ${Math.round(m.firstBottom)}/${m.vh}, rolagem ${Math.round(m.overflow)} px`).join("; ")}`);
    for (const vp of [{ width: 320, height: 568 }, { width: 390, height: 780 }]) {
      const t = await newPage({ viewport: vp, hasTouch: true, isMobile: true });
      await fresh(t); await t.click("#btn-start"); await t.waitForTimeout(150);
      const f = await ev(t, () => { const item = document.querySelector("#hud .hud-item"), b = item.querySelector("b"); return { label: parseFloat(getComputedStyle(item).fontSize), value: parseFloat(getComputedStyle(b).fontSize), scroll: document.documentElement.scrollHeight - innerHeight }; });
      ok(f.label >= 10.5 && f.value >= 13.5 && f.scroll <= 2, `F: placar legível em ${vp.width}x${vp.height}: rótulos de ${f.label.toFixed(1)} px e números de ${f.value.toFixed(1)} px, sem rolar a página`);
      await t.context().close();
    }

    // --- saves da 0.4.0 (rações já pegas no mesmo tile) ainda são aceitos; duas por pegar no mesmo tile não ---
    const snap = await (async () => { await playLevel(page, 1, { keepSave: true }); return ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; }); })();
    const accepts = async (sn) => {
      await fresh(page, { keepSave: true });
      await ev(page, (sn) => Records.createStore(localStorage).saveGame("Totó", sn), sn);
      await page.reload(); await page.evaluate(PAGE_HELPERS);
      return page.isVisible("#btn-continue");
    };
    const same = (sn, taken) => { const c = JSON.parse(JSON.stringify(sn)); c.items[0][2] = taken ? 1 : 0; c.items[1][0] = c.items[0][0]; c.items[1][1] = c.items[0][1]; return c; };
    ok(await accepts(same(snap, true)), "A: um save antigo com uma ração já pega no mesmo tile de outra é aceito (jogos salvos da 0.4.0 não se perdem)");
    ok(!(await accepts(same(snap, false))), "A: duas rações por pegar no mesmo tile continuam sendo recusadas");
  });

  // =====================================================================
  await section("correções da 2ª auditoria (0.5.0)", async () => {
    // --- G: eventos de teclado sem "key" (autopreenchimento do navegador) não geram erro ---
    await playLevel(page, 1);
    const keyless = await ev(page, () => { let err = null; const h = (e) => { err = e.message; }; window.addEventListener("error", h); window.dispatchEvent(new Event("keydown")); window.dispatchEvent(new Event("keyup")); window.removeEventListener("error", h); return err; });
    ok(keyless === null, "um keydown/keyup sem 'key' (autopreenchimento) não gera erro");

    // --- K: a vida escondida num osso fala de osso, e perder vida na Fase 3 fala de itens ---
    const msg = await ev(page, () => {
      __game.start(3); __game.freezeVets = true; __game.noCatch = true; __game.setLives(5);
      const it = __game.items[0]; it.bone = true; it.life = true; __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01);
      return document.getElementById("toast").textContent;
    });
    ok(/Este osso tinha uma vida extra/.test(msg), `no máximo de vidas, a vida que estava num osso diz "osso" (${msg})`);
    const msg2 = await ev(page, () => { __game.start(3); __game.noCatch = false; for (const v of __game.vets) v.cool = 99; for (let k = 0; k < 45; k++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); return document.getElementById("toast").textContent; });
    ok(/Os itens mudaram de lugar/.test(msg2), `na Fase 3, ao perder uma vida o aviso fala dos itens (${msg2})`);
    const msg3 = await ev(page, () => { __game.start(1); for (const v of __game.vets) v.cool = 99; for (let k = 0; k < 45; k++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); return document.getElementById("toast").textContent; });
    ok(/As rações mudaram de lugar/.test(msg3), "na Fase 1 o aviso continua falando das rações");
    const txt = await page.evaluate(() => [document.querySelector("#scores .muted").textContent, document.getElementById("game").getAttribute("aria-label")]);
    ok(/150 por osso/.test(txt[0]) && /100 por carteiro/.test(txt[0]) && /ossos/.test(txt[1]) && /blocos/.test(txt[1]), "a tela de pontuações cita os ossos e o rótulo do jogo (leitor de tela) fala de ossos e blocos");

    // --- E/H/I: duas abas no mesmo navegador ---
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const A = await ctx.newPage(); watch(A); const B = await ctx.newPage(); watch(B);
    const hasSave = (pg, name) => pg.evaluate((name) => { const raw = JSON.parse(localStorage.getItem("cachorrinho.save.v1") || "null"); return !!(raw && raw.saves && raw.saves[name.toLowerCase()]); }, name);
    // E: Próxima fase continua com quem jogou (Totó), mesmo que a outra aba tenha trocado o jogador atual para Bia
    await fresh(A, { name: "Totó" });
    await A.evaluate(() => __game.start(1));
    await finishNow(A, 10);
    ok(await A.isVisible("#win"), "E: Totó venceu a Fase 1 na aba A");
    await B.goto(URL);
    await B.evaluate(() => { const st = Records.createStore(localStorage); st.setPlayer("Bia"); });
    await B.reload(); await B.evaluate(PAGE_HELPERS);
    await B.evaluate(() => { __game.start(1); __game.save(); });
    ok(await hasSave(B, "Bia"), "E: na aba B, Bia tem um jogo salvo");
    await A.waitForTimeout(300); // (o navegador leva alguns milissegundos para repassar o que uma aba gravou às outras)
    await A.click("#btn-next");
    ok(await A.evaluate(() => __game.level) === 2 && await hasSave(A, "Bia"), "E: Próxima fase (aba A) segue com o Totó e NÃO apaga o jogo salvo da Bia");
    await finishNow(A, 10);
    const prog = await A.evaluate(() => { const st = Records.createStore(localStorage); return { toto: st.progress("Totó").completed, bia: st.progress("Bia").completed, bests: st.personalBest("Bia", 2) }; });
    ok(prog.toto.includes(2) && prog.bia.length === 0 && !prog.bests, `E: a Fase 2 vale para o Totó (${prog.toto}) e não para a Bia (${prog.bia})`);
    // I: lista de fases velha na aba A (jogador trocado para Bia, sem a Fase 1 concluída): a Fase 2 não abre
    await fresh(A, { name: "Totó", done: [1] });
    await A.click("#btn-start"); await A.waitForSelector("#levels:not(.hidden)");
    ok(await A.isEnabled("#levels-list button:nth-child(2)"), "I: a lista de fases do Totó libera a Fase 2");
    await B.goto(URL); await B.evaluate(() => { const st = Records.createStore(localStorage); st.setPlayer("Bia"); });
    await A.waitForTimeout(300);
    await A.click("#levels-list button:nth-child(2)", { force: true }).catch(() => {});
    const stale = await A.evaluate(() => ({ state: __game.state, lvl: __game.level, p2: document.querySelector("#levels-list button:nth-child(2)").disabled }));
    ok(stale.state !== "playing" && stale.p2, "I: clicar na Fase 2 com a lista velha não começa a fase (ela está bloqueada para a Bia) e a lista se atualiza");
    // H: conta apagada em outra aba não é recriada pela partida que continua
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const C = await ctx2.newPage(); watch(C); const D = await ctx2.newPage(); watch(D);
    await C.goto(URL);
    await C.evaluate(async () => { localStorage.clear(); const st = Records.createStore(localStorage, { authOptions: { iterations: 2000 } }); await st.register("Nando", "Senha123"); });
    await C.reload(); await C.evaluate(PAGE_HELPERS);
    await C.evaluate(() => __game.start(1));
    ok(await C.evaluate(() => __game.save()) === true, "H: com a conta existindo, o jogo salva");
    await D.goto(URL); await D.evaluate(() => { const st = Records.createStore(localStorage); st.deleteAccount("Nando"); });
    await C.waitForTimeout(300);
    const afterDelete = await C.evaluate(() => __game.save());
    await finishNow(C, 10);
    const left = await C.evaluate(() => JSON.stringify([localStorage.getItem("cachorrinho.v1"), localStorage.getItem("cachorrinho.save.v1")]));
    ok(afterDelete === false && !/nando/i.test(left), `H: depois de apagada em outra aba, a conta não volta (nem jogo salvo, nem pontuação, nem progresso) ${/nando/i.test(left) ? left.slice(0, 400) : ""}`);
    ok(/apagada em outra aba/.test(await C.textContent("#win-personal")), "H: a tela de vitória avisa que a pontuação não foi guardada");
    await ctx.close(); await ctx2.close();
  });

  // =====================================================================
  await section("toque (celular e tablet)", async () => {
    const t = await newPage({ viewport: { width: 390, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await fresh(t);
    ok(await ev(t, () => document.body.classList.contains("touch")), "aparelho com toque ativa os controles de toque");
    ok(await t.isHidden("#touch"), "controle de toque fica escondido no menu");
    ok(await ev(t, () => document.documentElement.scrollWidth <= innerWidth), "menu sem rolagem lateral no celular");
    await t.tap("#btn-start");
    ok(await ev(t, () => __game.state) === "playing", "toque em Iniciar jogo funciona");
    await ev(t, () => { __game.freezeVets = true; });
    ok(await t.isVisible("#pad"), "controle redondo aparece durante o jogo");
    const lay = await ev(t, () => {
      const cv = document.getElementById("game").getBoundingClientRect(), pad = document.getElementById("pad").getBoundingClientRect(), v = __game.view, p = __game.player;
      const sx = cv.width / 800 * v.zoom;
      return { cw: cv.width, ch: cv.height, padTop: pad.top, cvBottom: cv.bottom, padW: pad.width, zoom: v.zoom, dogX: (p.x + 12 - v.camX) * sx, dogY: (p.y + 12 - v.camY) * sx, scroll: document.documentElement.scrollWidth - innerWidth, vscroll: document.documentElement.scrollHeight - innerHeight, back: document.getElementById("game").width };
    });
    ok(lay.zoom > 1.4, `tela estreita: o jogo aproxima (zoom ${lay.zoom.toFixed(2)}) para o cachorro não ficar minúsculo`);
    ok(lay.dogX >= 0 && lay.dogX <= lay.cw && lay.dogY >= 0 && lay.dogY <= lay.ch, "o cachorro fica dentro da área visível");
    const ibPortrait = await ev(t, () => document.getElementById("btn-pause").getBoundingClientRect().width);
    ok(ibPortrait === 44, `celular em pé: o botão de pausa tem ${ibPortrait} px (alvo de toque confortável)`);
    ok(lay.padTop >= lay.cvBottom && lay.padW >= 100, `controle fica abaixo do jogo e é grande o bastante (${lay.padW.toFixed(0)}px)`);
    ok(lay.scroll <= 0 && lay.vscroll <= 2, "tudo cabe na tela do celular sem rolar");
    ok(lay.back >= lay.cw * 1.9, `imagem nítida em tela de alta densidade (${lay.back}px para ${lay.cw.toFixed(0)}px)`);

    const drag = (dx, dy) => ev(t, ([dx, dy]) => {
      const pad = document.getElementById("pad"), r = pad.getBoundingClientRect(), R = r.width / 2;
      const ptr = (type, x, y) => pad.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y }));
      window.__ptr = ptr; window.__c = [r.left + R, r.top + R, R];
      ptr("pointerdown", r.left + R + dx * R, r.top + R + dy * R);
    }, [dx, dy]);
    const release = () => ev(t, () => window.__ptr("pointerup", window.__c[0], window.__c[1]));
    const where = () => ev(t, () => [__game.player.x, __game.player.y]);
    let a = await where(); await drag(0.9, 0); await t.waitForTimeout(350);
    let b = await where(); ok(b[0] > a[0] + 20 && Math.abs(b[1] - a[1]) < 3, "arrastar para a direita move o cachorro para a direita");
    await release(); await t.waitForTimeout(80); a = await where(); await t.waitForTimeout(250); b = await where();
    ok(a[0] === b[0], "soltar o dedo para o cachorro");
    await drag(0, 0.9); await t.waitForTimeout(300); b = await where(); ok(b[1] > a[1] + 20, "arrastar para baixo move para baixo");
    await release();
    a = await where(); await drag(0.1, 0.1); await t.waitForTimeout(250); b = await where(); await release();
    ok(a[0] === b[0] && a[1] === b[1], "toque no centro do controle (zona morta) não move");
    a = await where(); await drag(-0.8, -0.8); await t.waitForTimeout(300); b = await where(); await release();
    ok(b[0] < a[0] - 5 || b[1] < a[1] - 5, "diagonal funciona");
    // Fase 3 no toque: a facilitação (veterinários mais lentos, cachorro um pouco mais rápido) liga com o controle de toque e desliga com o teclado
    await ev(t, () => { __game.start(3); __game.freezeVets = true; __game.touchInput = false; });
    const asKeys = await ev(t, () => ({ assist: __game.assist, dog: __game.dogSpeed }));
    await drag(0.9, 0); await t.waitForTimeout(150);
    const asTouch = await ev(t, () => ({ assist: __game.assist, dog: __game.dogSpeed }));
    await release();
    await ev(t, () => { __t.press("d", true); __game.tick(0.05); __t.press("d", false); });
    const asKeys2 = await ev(t, () => ({ assist: __game.assist, dog: __game.dogSpeed }));
    ok(!asKeys.assist && Math.abs(asKeys.dog - 226.8) < 1e-9 && asTouch.assist && Math.abs(asTouch.dog - 238.14) < 1e-9 && !asKeys2.assist && Math.abs(asKeys2.dog - 226.8) < 1e-9, `Fase 3 no toque: cachorro ${asKeys.dog} → ${asTouch.dog} px/s com o controle de toque, e volta a ${asKeys2.dog} com o teclado`);
    await t.tap("#btn-pause");
    ok(await ev(t, () => __game.state) === "paused" && await t.isHidden("#touch"), "botão de pausa funciona no toque (e o controle some)");
    await t.tap("#btn-resume");
    ok(await ev(t, () => __game.state) === "playing" && await t.isVisible("#pad"), "retomar traz o controle de volta");
    await t.context().close();

    // celular deitado
    const l = await newPage({ viewport: { width: 740, height: 390 }, hasTouch: true, isMobile: true });
    await fresh(l); await l.tap("#btn-start");
    const ll = await ev(l, () => { const cv = document.getElementById("game").getBoundingClientRect(), pad = document.getElementById("pad").getBoundingClientRect(); return { cvTop: cv.top, cvBottom: cv.bottom, cvLeft: cv.left, cvW: cv.width, padRight: pad.right, padVisible: pad.width > 0, vscroll: document.documentElement.scrollHeight - innerHeight, ratio: cv.width / cv.height }; });
    const ibLand = await ev(l, () => document.getElementById("btn-pause").getBoundingClientRect().width);
    ok(ibLand === 32, `celular deitado: o botão de pausa fica com ${ibLand} px, para o placar não crescer nem o jogo encolher`);
    ok(ll.cvBottom <= 390 && ll.vscroll <= 2, `celular deitado: o jogo inteiro cabe na altura (${ll.cvW.toFixed(0)}px de largura)`);
    ok(ll.padVisible && ll.padRight <= ll.cvLeft + 2, "celular deitado: o controle fica ao lado, sem cobrir o jogo");
    ok(Math.abs(ll.ratio - 25 / 18) < 0.02, "proporção do jogo preservada");
    await l.context().close();

    // tablet na vertical e na horizontal
    for (const [w, h, nome] of [[768, 1024, "tablet em pé"], [1024, 768, "tablet deitado"]]) {
      const tb = await newPage({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
      await fresh(tb); await tb.tap("#btn-start");
      const g = await ev(tb, () => { const cv = document.getElementById("game").getBoundingClientRect(), pad = document.getElementById("pad").getBoundingClientRect(); return { cw: cv.width, bottom: pad.bottom, vscroll: document.documentElement.scrollHeight - innerHeight, hscroll: document.documentElement.scrollWidth - innerWidth, zoom: __game.view.zoom }; });
      ok(g.cw >= 500 && g.vscroll <= 2 && g.hscroll <= 0 && g.bottom <= h, `${nome}: jogo grande (${g.cw.toFixed(0)}px) e controle cabem sem rolar`);
      await tb.context().close();
    }
    // sem toque: nada de controle
    await fresh(page); await page.click("#btn-start");
    ok(!(await ev(page, () => document.body.classList.contains("touch"))) && await page.isHidden("#touch"), "computador sem toque não mostra o controle");
    // forçar pelo endereço (útil para testar no computador)
    await fresh(page, { query: "?touch=1" }); await page.click("#btn-start");
    ok(await page.isVisible("#pad"), "?touch=1 mostra o controle de toque no computador");
  });

  // =====================================================================
  await section("teclado e controle (gamepad)", async () => {
    // controle simulado: o teste move os eixos/botões e liga/desliga a presença dele
    const MOCK_PAD = () => {
      const pad = { id: "Controle de teste", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      let present = false;
      window.__pad = pad;
      navigator.getGamepads = () => [present ? pad : null, null, null, null];
      window.__padOn = (on) => { present = on; window.dispatchEvent(new Event(on ? "gamepadconnected" : "gamepaddisconnected")); };
      window.__padSet = ({ axes, press = [], release = [], mapping }) => {
        if (axes) pad.axes = axes;
        if (mapping !== undefined) pad.mapping = mapping;
        for (const i of press) pad.buttons[i] = { pressed: true, touched: true, value: 1 };
        for (const i of release) pad.buttons[i] = { pressed: false, touched: false, value: 0 };
      };
    };
    const g = await newPage();
    await g.addInitScript(MOCK_PAD);
    const padHit = async (i) => { await ev(g, (i) => { __padSet({ press: [i] }); __game.padPoll(); __padSet({ release: [i] }); __game.padPoll(); }, i); }; // aperta e solta um botão
    const pos = () => ev(g, () => [__game.player.x, __game.player.y]);
    const state = () => ev(g, () => __game.state);
    const focusId = () => ev(g, () => document.activeElement.id);

    await fresh(g);
    ok(await ev(g, () => typeof navigator.getGamepads === "function"), "(teste) o controle simulado está instalado");
    await g.click("#btn-start");
    await ev(g, () => { __game.freezeVets = true; });

    // sem controle conectado, nada muda
    const a0 = await pos(); await ev(g, () => { __padSet({ axes: [1, 0, 0, 0] }); __game.tick(0.2); __padSet({ axes: [0, 0, 0, 0] }); });
    ok((await pos())[0] === a0[0], "sem controle conectado, o analógico simulado não faz nada");

    // conectar
    await ev(g, () => __padOn(true)); await ev(g, () => __game.padPoll());
    ok(/Controle conectado/.test(await g.textContent("#toast")), "avisa quando o controle é reconhecido");

    // analógico: direções, velocidade proporcional e zona morta (sempre em pontos livres do mapa, na área aberta de baixo)
    const move = async (axes, frames = 20) => { await ev(g, ([axes, n]) => { __padSet({ axes }); for (let i = 0; i < n; i++) __game.tick(1 / 60); __padSet({ axes: [0, 0, 0, 0] }); }, [axes, frames]); };
    const at = (x, y) => ev(g, ([x, y]) => { __game.player.x = x; __game.player.y = y; }, [x, y]);
    await at(500, 440);
    let a = await pos(); await move([1, 0, 0, 0]); let b = await pos();
    ok(b[0] > a[0] + 40 && Math.abs(b[1] - a[1]) < 1, "analógico para a direita move o cachorrinho para a direita");
    const fullDx = b[0] - a[0];
    await at(560, 440); a = await pos(); await move([-1, 0, 0, 0]); b = await pos();
    ok(b[0] < a[0] - 40, "analógico para a esquerda");
    await at(560, 420); a = await pos(); await move([0, 1, 0, 0]); b = await pos();
    ok(b[1] > a[1] + 40 && Math.abs(b[0] - a[0]) < 1, "analógico para baixo");
    await at(560, 476); a = await pos(); await move([0, -1, 0, 0]); b = await pos();
    ok(b[1] < a[1] - 40, "analógico para cima");
    ok(await ev(g, () => __game.player.facing) === "up", "o cachorrinho olha para onde o analógico aponta");
    await at(500, 440); a = await pos(); await move([0.6, 0, 0, 0]); b = await pos();
    ok(b[0] - a[0] > 8 && b[0] - a[0] < fullDx * 0.8, `inclinar pouco anda mais devagar (${(b[0] - a[0]).toFixed(0)} px contra ${fullDx.toFixed(0)} px com tudo inclinado)`);
    await at(500, 440); a = await pos(); await move([0.2, 0.2, 0, 0]); b = await pos();
    ok(b[0] === a[0] && b[1] === a[1], "dentro da zona morta (inclinação pequena) o cachorrinho fica parado");
    await at(560, 450); a = await pos(); await move([0.7, 0.7, 0, 0], 12); b = await pos();
    const diag = Math.hypot(b[0] - a[0], b[1] - a[1]);
    await at(500, 440); a = await pos(); await move([1, 0, 0, 0], 12); b = await pos();
    const straight = Math.hypot(b[0] - a[0], b[1] - a[1]);
    ok(diag > 20 && diag <= straight * 1.05, `na diagonal ele não anda mais rápido que em linha reta (${diag.toFixed(0)} px contra ${straight.toFixed(0)} px)`);
    await at(500, 440); a = await pos(); await move([1, 0.15, 0, 0]); b = await pos();
    ok(b[1] === a[1] && b[0] > a[0], "quase reto vale como reto (ajuda nos corredores de 1 tile)");
    // direcional (botões 12 a 15)
    await at(500, 440); a = await pos(); await ev(g, () => { __padSet({ press: [15] }); for (let i = 0; i < 15; i++) __game.tick(1 / 60); __padSet({ release: [15] }); }); b = await pos();
    ok(b[0] > a[0] + 30, "direcional (para a direita) move");
    await at(560, 470); a = await pos(); await ev(g, () => { __padSet({ press: [12, 14] }); for (let i = 0; i < 15; i++) __game.tick(1 / 60); __padSet({ release: [12, 14] }); }); b = await pos();
    ok(b[0] < a[0] - 10 && b[1] < a[1] - 10, "direcional na diagonal (cima + esquerda)");
    // teclado continua valendo e tem prioridade sobre o controle parado
    a = await pos(); await ev(g, () => __t.hold("d", 12)); b = await pos();
    ok(b[0] > a[0] + 20, "o teclado continua funcionando com o controle conectado");
    // coleta e vitória com o controle
    // (o cachorro começa ao lado de um item que tem chão livre à esquerda: junto de uma parede ele sairia do mundo)
    await ev(g, () => { __game.freezeVets = true; const M = __game.levels[0].map, it = __game.items.find((i) => M[Math.round((i.y - 8) / 32)][Math.round((i.x - 8) / 32) - 1] === ".") || __game.items[0]; __game.player.x = it.x - 20; __game.player.y = it.y - 4; __padSet({ axes: [1, 0, 0, 0] }); for (let i = 0; i < 12; i++) __game.tick(1 / 60); __padSet({ axes: [0, 0, 0, 0] }); });

    // Start pausa e continua; Y salva; B/A nos menus
    ok(await state() === "playing", "(antes) jogando");
    await padHit(9);
    ok(await state() === "paused" && await g.isVisible("#pause"), "Start pausa o jogo");
    ok(await focusId() === "btn-resume", "na pausa, o botão Continuar já vem escolhido");
    await padHit(13); ok(await focusId() === "btn-save", "direcional para baixo escolhe o botão seguinte (Salvar jogo)");
    await padHit(0);
    ok(/Jogo salvo/.test(await g.textContent("#pause-msg")) && await ev(g, () => Records.createStore(localStorage).hasGame("Totó")), "A no botão Salvar jogo salva");
    await padHit(12); ok(await focusId() === "btn-resume", "direcional para cima volta");
    await padHit(9); ok(await state() === "playing", "Start de novo continua o jogo");
    await ev(g, () => localStorage.removeItem("cachorrinho.save.v1"));
    await padHit(3);
    ok(/Jogo salvo/.test(await g.textContent("#toast")) && await ev(g, () => Records.createStore(localStorage).hasGame("Totó")), "Y salva o jogo durante a partida (e avisa)");
    await padHit(9); await padHit(1);
    ok(await state() === "playing", "na pausa, B continua o jogo");
    await padHit(9); await padHit(13); await padHit(13); await padHit(0);
    ok(await state() === "menu" && await g.isVisible("#menu"), "na pausa, escolher Voltar ao menu com A funciona");

    // menus só com o controle
    ok(await focusId() === "btn-continue" || await focusId() === "btn-start", "no menu, o botão principal vem escolhido");
    await ev(g, () => document.getElementById("btn-start").focus());
    await padHit(13); ok(await focusId() === "btn-howto", "menu: direcional para baixo vai para Como jogar");
    await padHit(0); ok(await g.isVisible("#howto"), "A abre Como jogar");
    ok(/Controle \(gamepad\)/.test(await g.textContent("#howto")) && /Ctrl/.test(await g.textContent("#howto")), "Como jogar explica o controle e o teclado");
    // telas longas (Como jogar): o direcional e o analógico ROLAM a tela (antes só pulavam para o botão Voltar)
    await g.setViewportSize({ width: 390, height: 480 });
    const hold = (btn, axes, frames) => ev(g, ([btn, axes, frames]) => { __padSet({ press: btn === null ? [] : [btn], axes: axes || [0, 0, 0, 0] }); for (let i = 0; i < frames; i++) __game.padPoll(1 / 60); __padSet({ release: btn === null ? [] : [btn], axes: [0, 0, 0, 0] }); __game.padPoll(1 / 60); }, [btn, axes, frames]);
    const sTop = () => ev(g, () => document.getElementById("howto").scrollTop);
    const s0 = await sTop();
    await hold(13, null, 20); const s1 = await sTop();
    await hold(null, [0, 1, 0, 0], 20); const s2 = await sTop();
    await hold(12, null, 25); const s3 = await sTop();
    ok(s1 > s0 + 100 && s2 > s1 + 100 && s3 < s2 - 100, `Como jogar rola com o controle: direcional ↓ (${s0} → ${s1}), analógico ↓ (→ ${s2}) e direcional ↑ volta (→ ${s3})`);
    ok(await focusId() !== "btn-howto-back" && await g.isVisible("#howto"), "rolar com o controle não salta para o botão Voltar");
    await padHit(1); ok(await g.isVisible("#menu"), "B volta ao menu");
    await g.setViewportSize({ width: 1280, height: 720 });
    await ev(g, () => document.getElementById("btn-start").focus());
    await ev(g, () => { __padSet({ axes: [0, 1, 0, 0] }); __game.padPoll(); __padSet({ axes: [0, 0, 0, 0] }); __game.padPoll(); });
    ok(await focusId() === "btn-howto", "menu: o analógico para baixo também escolhe o botão seguinte");
    ok(await g.isVisible("#btn-continue"), "há um jogo salvo: o menu oferece Continuar jogo");
    await ev(g, () => document.getElementById("btn-start").focus());
    await padHit(0);
    ok(await g.isVisible("#confirm") && await focusId() === "btn-confirm-keep", "A em Iniciar jogo, com jogo salvo, pede confirmação (Continuar o jogo salvo já vem escolhido)");
    await padHit(0);
    ok(await state() === "playing", "A em Continuar o jogo salvo retoma a partida");
    await ev(g, () => { __game.freezeVets = true; });

    // vitória e Próxima fase só com o controle
    await finishNow(g, 10);
    ok(await state() === "won" && await focusId() === "btn-next", "vitória: o botão Próxima fase já vem escolhido");
    await padHit(0);
    ok(await state() === "playing" && await ev(g, () => __game.level) === 2, "A em Próxima fase começa a Fase 2");

    // segurar o direcional repete a navegação nos menus
    await padHit(9); // pausa
    await ev(g, () => { document.getElementById("btn-resume").focus(); __padSet({ press: [13] }); __game.padPoll(0.016); });
    ok(await focusId() === "btn-save", "(repetição) primeiro passo");
    await ev(g, () => { for (let i = 0; i < 40; i++) __game.padPoll(0.016); __padSet({ release: [13] }); __game.padPoll(0.016); });
    ok(["btn-resume", "btn-save", "btn-pause-menu"].includes(await focusId()), "segurar o direcional continua passando pelos botões (sem travar nem sair da tela)");
    await padHit(9);

    // controle desconectado no meio do jogo: nada quebra e o teclado segue valendo
    await ev(g, () => { __game.freezeVets = true; __padOn(false); __game.padPoll(); });
    a = await pos(); await ev(g, () => __t.hold("d", 12)); b = await pos();
    ok(await state() === "playing" && b[0] > a[0], "desconectar o controle no meio do jogo não atrapalha (teclado segue)");
    a = await pos(); await ev(g, () => { __padSet({ axes: [1, 0, 0, 0] }); __game.tick(0.2); __padSet({ axes: [0, 0, 0, 0] }); }); b = await pos();
    ok(b[0] === a[0], "e o controle desconectado não move mais nada");

    // controle fora do padrão: só eixos 0/1 e botões A, B e Start
    await ev(g, () => { __padSet({ mapping: "" }); __padOn(true); __game.padPoll(); });
    await ev(g, () => { __game.player.x = 400; __game.player.y = 260; });
    a = await pos(); await move([1, 0, 0, 0], 15); b = await pos();
    ok(b[0] > a[0] + 20, "controle fora do padrão: o analógico esquerdo move");
    a = await pos(); await ev(g, () => { __padSet({ press: [15] }); for (let i = 0; i < 15; i++) __game.tick(1 / 60); __padSet({ release: [15] }); }); b = await pos();
    ok(b[0] === a[0], "controle fora do padrão: botões do direcional não são lidos (os números variam de controle para controle)");
    await padHit(9); ok(await state() === "paused", "controle fora do padrão: Start (botão 9) pausa");
    await padHit(9);
    await ev(g, () => __padSet({ mapping: "standard" }));

    // dados estranhos do navegador não derrubam o jogo
    await ev(g, () => { __pad.axes = [NaN, undefined, null, "x"]; __pad.buttons = []; __game.tick(0.1); __game.padPoll(); __pad.axes = [0, 0, 0, 0]; __pad.buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })); });
    ok(await state() === "playing", "eixos inválidos (NaN) e lista de botões vazia são ignorados sem erro");
    await g.context().close();

    // ---- só com o teclado: do menu à vitória e ao Continuar jogo ----
    const k = await newPage();
    await fresh(k, { name: "" });
    const kf = () => ev(k, () => document.activeElement.id);
    ok(await kf() === "btn-start", "teclado: Iniciar jogo já vem escolhido");
    await k.keyboard.press("Enter");
    ok(await k.isVisible("#name") && await ev(k, () => document.activeElement.id) === "name-input", "teclado: Enter em Iniciar jogo sem nome abre o nome, com o cursor no campo");
    await k.keyboard.type("Totó"); await k.keyboard.press("Enter");
    ok(await ev(k, () => __game.state) === "playing", "teclado: digitar o nome e Enter começa o jogo");
    await ev(k, () => { __game.freezeVets = true; });
    await k.keyboard.press("p");
    ok(await ev(k, () => __game.state) === "paused", "teclado: P pausa");
    await k.keyboard.press("p");
    ok(await ev(k, () => __game.state) === "playing", "teclado: P de novo continua");
    await k.keyboard.press("Escape"); ok(await ev(k, () => __game.state) === "paused", "teclado: Esc pausa");
    await k.keyboard.press("ArrowDown"); await k.keyboard.press("Enter");
    ok(/Jogo salvo/.test(await k.textContent("#pause-msg")), "teclado: ↓ e Enter em Salvar jogo salvam");
    await k.keyboard.press("Escape"); ok(await ev(k, () => __game.state) === "playing", "teclado: Esc continua");
    await ev(k, () => localStorage.removeItem("cachorrinho.save.v1"));
    await k.keyboard.press("Control+s");
    ok(/Jogo salvo/.test(await k.textContent("#toast")) && await ev(k, () => Records.createStore(localStorage).hasGame("Totó")), "teclado: Ctrl+S salva durante o jogo (sem abrir 'Salvar página')");
    await k.keyboard.press("Escape");
    await ev(k, () => localStorage.removeItem("cachorrinho.save.v1"));
    await k.keyboard.press("Control+s");
    ok(/Jogo salvo/.test(await k.textContent("#pause-msg")) && await ev(k, () => Records.createStore(localStorage).hasGame("Totó")), "teclado: Ctrl+S também salva na pausa");
    await k.keyboard.press("Escape");
    const kx = await ev(k, () => __game.player.x);
    await k.keyboard.down("d"); await k.waitForTimeout(250); await k.keyboard.up("d");
    ok(await ev(k, () => __game.player.x) > kx + 10, "teclado: D move o cachorrinho");
    await k.keyboard.down("ArrowDown"); await k.waitForTimeout(200); await k.keyboard.up("ArrowDown");
    ok(await ev(k, () => __game.player.y) > 40, "teclado: seta para baixo move");
    await finishNow(k, 10);
    ok(await ev(k, () => __game.state) === "won" && await kf() === "btn-next", "teclado: na vitória o botão Próxima fase já vem escolhido");
    await k.keyboard.press("Enter");
    ok(await ev(k, () => __game.state) === "playing" && await ev(k, () => __game.level) === 2, "teclado: Enter em Próxima fase começa a Fase 2");
    await k.keyboard.press("Escape"); await k.keyboard.press("ArrowDown"); await k.keyboard.press("ArrowDown"); await k.keyboard.press("Enter");
    ok(await ev(k, () => __game.state) === "menu", "teclado: pausa → ↓ ↓ → Enter volta ao menu");
    ok(await k.isVisible("#btn-continue") && await kf() === "btn-continue", "teclado: o menu oferece Continuar jogo, já escolhido");
    await k.keyboard.press("Enter");
    ok(await ev(k, () => __game.state) === "playing" && await ev(k, () => __game.level) === 2, "teclado: Enter em Continuar jogo retoma a Fase 2");
    await ev(k, () => { document.activeElement.blur(); });
    await k.keyboard.press("Space");
    ok(await ev(k, () => __game.state) === "playing" && await ev(k, () => window.scrollY) === 0, "teclado: a barra de espaço sem botão em foco não pausa nem rola a página");
    await ev(k, () => document.getElementById("btn-pause").focus());
    await k.keyboard.press("Space");
    ok(await ev(k, () => __game.state) === "paused", "teclado: com o botão de pausa do placar em foco, Espaço aciona o botão (como em qualquer botão)");
    await k.context().close();
  });

  // =====================================================================
  await section("tamanho proporcional em cada tela", async () => {
    const sizes = [[1920, 1080, 1], [1366, 768, 1], [2560, 1440, 1], [1280, 720, 2]];
    for (const [w, h, dpr] of sizes) {
      const d = await newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      await fresh(d); await d.click("#btn-start");
      const g = await ev(d, () => { const cv = document.getElementById("game"), r = cv.getBoundingClientRect(), hud = document.getElementById("hud").getBoundingClientRect(); return { w: r.width, h: r.height, bw: cv.width, bh: cv.height, bottom: r.bottom, hudTop: hud.top, vscroll: document.documentElement.scrollHeight - innerHeight, zoom: __game.view.zoom }; });
      ok(Math.abs(g.w / g.h - 25 / 18) < 0.01 && g.vscroll <= 2, `${w}x${h}: proporção 25:18 e cabe sem rolar (${g.w.toFixed(0)}x${g.h.toFixed(0)})`);
      ok(w < 1300 || g.w > 900, `${w}x${h}: tela grande aproveita o espaço (acima de 800px de largura)`);
      ok(g.zoom === 1, `${w}x${h}: mundo inteiro visível, sem zoom`);
      ok(Math.abs(g.bw - Math.min(Math.round(g.w * dpr), 2400)) <= 1 && g.bh === Math.round((g.bw * 576) / 800), `${w}x${h} @${dpr}x: resolução interna acompanha a densidade (${g.bw}x${g.bh})`);
      await d.context().close();
    }
    // redimensionar a janela com o jogo aberto
    await fresh(page); await page.click("#btn-start");
    const w1 = await ev(page, () => document.getElementById("game").getBoundingClientRect().width);
    await page.setViewportSize({ width: 700, height: 500 }); await page.waitForTimeout(150);
    const w2 = await ev(page, () => ({ w: document.getElementById("game").getBoundingClientRect().width, bw: document.getElementById("game").width, zoom: __game.view.zoom }));
    ok(w2.w < w1 && Math.abs(w2.bw - w2.w) <= 1, "ao redimensionar a janela o jogo se ajusta na hora");
    await page.setViewportSize({ width: 1280, height: 720 });
    // nada pixelado/costurado: desenha em escala fracionária e confere que não há frestas entre as paredes
    await page.setViewportSize({ width: 1013, height: 777 }); await page.waitForTimeout(150);
    const seams = await ev(page, () => {
      const cv = document.getElementById("game"), c = cv.getContext("2d"), v = __game.view; let dark = 0;
      const sx = v.k * v.zoom, row = Math.round(16 * sx); // linha horizontal no meio da parede superior
      const data = c.getImageData(0, row, cv.width, 1).data;
      for (let i = 0; i < data.length; i += 4) if (data[i] < 0x40 && data[i + 1] < 0x40 && data[i + 2] < 0x50) dark++;
      return dark;
    });
    ok(seams === 0, "paredes sem frestas em escala fracionária");
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  // =====================================================================
  await section("tela de pontuações: individual (só do usuário) e ranking do jogo (todos)", async () => {
    await fresh(page, { name: "Totó", runs: [{ name: "Rex", timeMs: 20000 }, { name: "Mel", timeMs: 18000 }, { name: "Totó", timeMs: 25000 }, { name: "Totó", timeMs: 22000 }] });
    await page.click("#btn-scores");
    const priv = await page.textContent("#scores-private"), pub = await page.textContent("#scores-public");
    ok(/Suas pontuações/.test(priv) && /590 pontos/.test(priv) && /Sua melhor na Fase 1\s*590 pts · 22,0 s/.test(priv) && /Sua melhor na Fase 2\s*ainda não jogada/.test(priv), "Suas pontuações: total 590 (a melhor da fase, não 1180) e a melhor de cada fase");
    ok(/Só você vê/.test(priv) && !/Rex|Mel/.test(priv), "a parte individual é só do usuário: não mostra nenhum outro jogador");
    const rank = await page.$$eval("#scores-public ol", (ols) => ols.map((ol) => [...ol.querySelectorAll("li")].map((x) => x.textContent)));
    ok(rank[0].join("|") === "Mel — 600 pontos|Rex — 600 pontos|Totó — 590 pontos", "ranking geral do jogo por pontuação total, com todos os jogadores");
    ok(rank[1].join("|") === "Mel — 600 pts (18,0 s)|Rex — 600 pts (20,0 s)|Totó — 590 pts (22,0 s)", "ranking da fase: só a melhor pontuação de cada jogador (Totó aparece uma vez, apesar de 2 partidas), tempo desempata");
    ok(rank.length === 2 && /Ninguém terminou esta fase/.test(await page.textContent("#scores-public")), "a Fase 2 sem ninguém mostra mensagem amigável");
    ok(/deste aparelho/.test(await page.textContent("#scores-source")) && !/servidor|compartilhado/.test(await page.textContent("#scores-source")), "o ranking ativo é o do aparelho e a tela avisa isso (sem falar de servidor, que está em stand by)");
    ok(await page.$("#scores-public li.me") !== null && /Totó/.test(await page.textContent("#scores-public li.me")), "o próprio jogador aparece destacado no ranking");
    ok(!/histórico/i.test(await page.textContent("#scores")) && await page.$("#scores ul") === null, "não existe histórico de partidas");
    ok(/Em cada fase vale a sua maior pontuação/.test(await page.textContent("#scores")), "explica que vale a maior pontuação e que fases diferentes somam");

    // outro usuário no mesmo aparelho: a parte individual dele é só dele
    await ev(page, () => Records.createStore(localStorage).setPlayer("Bidu")); await page.reload();
    await page.click("#btn-scores");
    const priv2 = await page.textContent("#scores-private");
    ok(/0 pontos/.test(priv2) && /ainda não jogada/.test(priv2) && !/590|600|Totó|Rex|Mel/.test(priv2), "outro usuário vê a parte individual dele (zerada), sem os dados do Totó");
    ok(/Totó — 590/.test(await page.textContent("#scores-public")) && /Mel — 600/.test(await page.textContent("#scores-public")), "mas o ranking do jogo mostra todos");
    // sem usuário escolhido, o ranking do jogo continua visível
    await fresh(page, { name: "", runs: [{ name: "Rex", timeMs: 20000 }] });
    await ev(page, () => { const raw = JSON.parse(localStorage.getItem("cachorrinho.v1")); raw.player = ""; localStorage.setItem("cachorrinho.v1", JSON.stringify(raw)); }); // ninguém escolhido neste aparelho
    await page.reload();
    await page.click("#btn-scores");
    ok(/Escolha um nome de usuário/.test(await page.textContent("#scores-private")) && /Rex — 600/.test(await page.textContent("#scores-public")), "sem nome escolhido não há parte individual, mas o ranking do jogo aparece");
  });

  // =====================================================================
  // =====================================================================
  await section("0.7.0: Fases 6 a 10 (mapas grandes, mais rações, ossos, veterinários mais rápidos e mais peças móveis)", async () => {
    await play(page, { keepSave: true });
    // o que cada fase deve ter (a Tabela das fases do README é conferida em outra seção)
    const SPEC = {
      6:  { nv: 3, lives: "3,4", cols: 45, rows: 31, rations: 24, bones: 3, pen: 250, min: 1250, alert: 11, doors: [2, 4, 4], walls: [2, 4, 4], dEvery: 3,   wEvery: 10, dSpeed: 120, wSpeed: 120, respawn: false },
      7:  { nv: 4, lives: "3,4", cols: 49, rows: 33, rations: 28, bones: 3, pen: 250, min: 1400, alert: 12, doors: [3, 5, 5], walls: [2, 4, 4], dEvery: 3,   wEvery: 10, dSpeed: 120, wSpeed: 120, respawn: false },
      8:  { nv: 5, lives: "3,4", cols: 53, rows: 35, rations: 32, bones: 4, pen: 250, min: 1650, alert: 13, doors: [3, 5, 5], walls: [3, 5, 5], dEvery: 3,   wEvery: 10, dSpeed: 120, wSpeed: 120, respawn: false },
      9:  { nv: 5, lives: "3,4", cols: 57, rows: 37, rations: 36, bones: 4, pen: 300, min: 1800, alert: 14, doors: [4, 6, 6], walls: [4, 6, 6], dEvery: 2.5, wEvery: 8,  dSpeed: 160, wSpeed: 140, respawn: true },
      10: { nv: 6, lives: "3,4", cols: 61, rows: 39, rations: 40, bones: 5, pen: 300, min: 2050, alert: 15, doors: [5, 6, 6], walls: [5, 6, 6], dEvery: 2,   wEvery: 6,  dSpeed: 200, wSpeed: 160, respawn: true },
    };
    const info = await ev(page, () => {
      const out = {};
      for (const L of __game.levels.filter((l) => l.id >= 5)) {
        const M = L.map, R = M.length, C = M[0].length, free = (c, r) => c >= 0 && r >= 0 && c < C && r < R && M[r][c] !== "#" && M[r][c] !== "X";
        const find = (ch) => { const o = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (M[r][c] === ch) o.push([c, r]); return o; };
        const P = find("P")[0], E = find("E"), V = find("V");
        const fp = (b, which) => { const [c, r] = b[which], [w, h] = b.size || [1, 1], o = []; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) o.push([c + i, r + j]); return o; };
        const track = new Set(L.blocks.flatMap((b) => [...fp(b, "from"), ...fp(b, "to")]).map((x) => x + ""));
        const dist = new Map([[P + "", 0]]), q = [P];
        for (const [c, r] of q) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c + dc, r + dr]; if (!free(...n) || dist.has(n + "")) continue; dist.set(n + "", dist.get([c, r] + "") + 1); q.push(n); }
        // conectividade em todas as combinações de posição das peças
        const floor = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (free(c, r) && !track.has(c + "," + r)) floor.push([c, r]);
        let okAll = 0; const N = L.blocks.length;
        for (let mask = 0; mask < 1 << N; mask++) {
          const blocked = new Set(L.blocks.flatMap((b, i) => fp(b, (mask >> i) & 1 ? "to" : "from")).map((x) => x + ""));
          const seen = new Set([floor[0] + ""]), qq = [floor[0]];
          for (const [c, r] of qq) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [c + dc, r + dr]; if (!free(...n) || blocked.has(n + "") || seen.has(n + "")) continue; seen.add(n + ""); qq.push(n); }
          if (floor.every((t) => seen.has(t + ""))) okAll++;
        }
        const border = [...M[0], ...M[R - 1], ...M.map((r) => r[0]), ...M.map((r) => r[C - 1])].every((ch) => ch === "#");
        out[L.id] = { C, R, border, nP: find("P").length, V, E: E.length, exitD: Math.min(...E.map((t) => dist.get(t + "") ?? 1e9)), vReach: V.every((t) => dist.has(t + "")), combos: 1 << N, okAll,
          walls: L.blocks.filter((b) => b.wall).length, doors: L.blocks.filter((b) => !b.wall).length,
          wallShape: L.blocks.filter((b) => b.wall).every((b) => b.size.join() === (b.from[0] === b.to[0] ? "1,3" : "3,1")),
          trackFree: [...track].every((t) => { const [c, r] = t.split(",").map(Number); return M[r][c] === "."; }), trackSize: track.size, blocksN: N,
          cfg: { rations: L.rations, bones: L.bones, lives: L.extraLives.join(), alert: L.alertTiles, pen: L.lifePenalty, min: L.minPoints, power: L.bonePower, crush: L.crush, respawn: L.respawnInPlace, dog: L.dogSpeed, sp: L.vets[0].speed, ch: L.vets[0].chaseSpeed, nv: L.vets.length, every: L.blocks.map((b) => b.every), speed: L.blocks.map((b) => b.speed), wallsFlag: L.blocks.map((b) => !!b.wall), range: L.blockRange },
          trackSet: [...track], free: null };
      }
      return out;
    });
    for (const id of [6, 7, 8, 9, 10]) {
      const I = info[id], S = SPEC[id];
      ok(I.C === S.cols && I.R === S.rows && I.border && I.nP === 1 && I.V.length === S.nv && I.E === 6, `Fase ${id}: mapa de ${I.C} × ${I.R} tiles cercado por paredes, 1 início, ${S.nv} veterinários e saída 3 × 2`);
      ok(I.vReach && I.exitD >= 60 && I.V.every(([c, r]) => Math.abs(c - (I.C >> 1)) <= 4 && Math.abs(r - (I.R >> 1)) <= 3), `Fase ${id}: saída (a ${I.exitD} passos) e veterinários alcançáveis, e eles começam no centro`);
      ok(I.doors === S.doors[2] && I.walls === S.walls[2] && I.wallShape && I.trackFree && I.blocksN === S.doors[2] + S.walls[2], `Fase ${id}: ${I.doors} portas de bloco e ${I.walls} paredes de 3 tiles, com os trilhos em chão livre`);
      ok(I.combos === 1 << I.blocksN && I.okAll === I.combos, `Fase ${id}: com as ${I.blocksN} peças em qualquer posição (${I.combos} combinações) todo o chão fora dos trilhos continua alcançável (${I.okAll})`);
      const c = I.cfg;
      ok(c.rations === S.rations && c.bones === S.bones && c.lives === S.lives && c.alert === S.alert && c.pen === S.pen && c.min === S.min && c.power === 35 && c.crush === true && c.respawn === S.respawn && c.nv === S.nv, `Fase ${id}: ${S.rations} rações + ${S.bones} ossos, ! a ${S.alert} quadrados, −${S.pen} por vida, ${S.min} pontos, poder de 35 s${S.respawn ? ", renasce onde morreu" : ""}`);
      const dEv = c.every.filter((_, i) => !c.wallsFlag[i]), wEv = c.every.filter((_, i) => c.wallsFlag[i]);
      ok(dEv.every((e) => e === S.dEvery || (e === undefined && S.dEvery === 3)) && wEv.every((e) => e === S.wEvery) && c.range.door.join() === S.doors.slice(0, 2).join() && c.range.wall.join() === S.walls.slice(0, 2).join(), `Fase ${id}: portas mudam a cada ${S.dEvery} s, paredes a cada ${S.wEvery} s; sorteio de ${S.doors[0]} a ${S.doors[1]} portas e ${S.walls[0]} a ${S.walls[1]} paredes`);
    }
    // a dificuldade só sobe: rações, ossos, velocidade dos veterinários, peças móveis; e o cachorro sempre é mais rápido que o veterinário perseguindo
    const ids = [5, 6, 7, 8, 9, 10], cf = ids.map((i) => info[i].cfg), dogPx = cf.map((c) => 252 * c.dog);
    const inc = (f) => cf.every((c, i) => i === 0 || f(c) > f(cf[i - 1])), nondec = (f) => cf.every((c, i) => i === 0 || f(c) >= f(cf[i - 1]));
    ok(inc((c) => c.rations) && nondec((c) => c.bones) && cf[5].bones > cf[0].bones && inc((c) => c.sp) && inc((c) => c.ch) && inc((c) => c.min) && nondec((c) => c.alert) && ids.every((i, k) => k === 0 || info[i].blocksN >= info[ids[k - 1]].blocksN), `de uma fase para a seguinte (5 a 10) sobem as rações (${cf.map((c) => c.rations).join(", ")}), os ossos (${cf.map((c) => c.bones).join(", ")}), a velocidade dos veterinários (${cf.map((c) => c.ch).join(", ")} px/s com o !), os pontos mínimos e as peças móveis (${ids.map((i) => info[i].blocksN).join(", ")})`);
    ok(dogPx.every((d, i) => d / cf[i].ch >= 1.4) && dogPx.every((d, i) => i === 0 || d >= dogPx[i - 1]), `o cachorrinho segue pelo menos 40% mais rápido que o veterinário perseguindo, em todas as fases (${dogPx.map((d, i) => (d / cf[i].ch).toFixed(2) + "×").join(", ")})`);
    // as Fases 9 e 10 têm peças bem mais rápidas que as da Fase 5
    const fast = await ev(page, () => { const o = {}; for (const id of [5, 9, 10]) { __game.start(id); o[id] = __game.blocks.map((b) => [b.def.kind === "W" ? "p" : "b", b.def.every, +b.def.slide.toFixed(2)]); } return o; });
    const avg = (arr, kind, k) => { const v = arr.filter((x) => x[0] === kind).map((x) => x[k]); return v.reduce((a, b) => a + b, 0) / v.length; };
    ok(avg(fast[9], "b", 1) < avg(fast[5], "b", 1) && avg(fast[10], "b", 1) < avg(fast[9], "b", 1) && avg(fast[9], "p", 1) < avg(fast[5], "p", 1) && avg(fast[10], "p", 1) < avg(fast[9], "p", 1) && avg(fast[10], "b", 2) < avg(fast[5], "b", 2), "Fases 9 e 10: blocos e paredes mudam de lado com mais frequência e deslizam mais rápido que na Fase 5");
    // sorteios de itens: contagens, chão livre, fora dos trilhos, alcançáveis, longe do início e dos veterinários
    for (const id of [6, 8, 10]) {
      const S = SPEC[id], lay = await ev(page, (id) => { const out = []; for (let i = 0; i < 40; i++) { __game.start(id); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32, it.bone ? 1 : 0, it.life ? 1 : 0])); } return out; }, id);
      const I = info[id], trackSet = new Set(I.trackSet);
      let bad = "";
      const seenLives = new Set();
      const L = await ev(page, (id) => __game.levels[id - 1].map, id);
      for (const items of lay) {
        if (items.length !== S.rations + S.bones || new Set(items.map((i) => i[0] + "," + i[1])).size !== items.length) bad = "quantidade/repetidos";
        if (items.filter((i) => i[2]).length !== S.bones) bad = "ossos";
        if (items.filter((i) => i[3]).length < 3 || items.filter((i) => i[3]).length > 4) bad = "vidas escondidas (devem ser 3 ou 4)";
        if (items.filter((i) => i[3] && i[2]).length > 1) bad = "vida em mais de um osso";
        seenLives.add(items.filter((i) => i[3]).length);
        for (const [c, r] of items) { if (L[r][c] === "#" || L[r][c] === "X") bad = "em parede/caixa"; if (L[r][c] === "E") bad = "na saída"; if (trackSet.has(c + "," + r)) bad = "no trilho"; if (I.V.some((v) => Math.hypot(c - v[0], r - v[1]) < 4)) bad = "perto de um veterinário"; }
      }
      ok(!bad && seenLives.has(3) && seenLives.has(4), `Fase ${id}: 40 sorteios de ${S.rations} rações + ${S.bones} ossos com 3 ou 4 vidas escondidas (vistas: ${[...seenLives].sort().join(" e ")}), em chão livre, fora dos trilhos e longe dos veterinários ${bad && "(" + bad + ")"}`);
    }
    // todas as fases rodam 60 s com os veterinários soltos sem erro e sem mudar o número de veterinários
    const run = await ev(page, () => {
      const out = [];
      for (const id of [6, 7, 8, 9, 10]) {
        __game.setRand(() => Math.random()); __game.start(id); __game.noCatch = true; __game.freezeVets = false;
        for (let i = 0; i < 60 * 60; i++) __game.tick(1 / 60);
        out.push([id, __game.vets.length, __game.state, __game.blocks.length > 0]);
      }
      __game.setRand(null); __game.noCatch = false; return out;
    });
    const NV = { 6: 3, 7: 4, 8: 5, 9: 5, 10: 6 };
    ok(run.every(([id, n, st, b]) => n === NV[id] && st === "playing" && b), `as Fases 6 a 10 rodam 60 s com veterinários e peças móveis soltos sem problema (${run.map((r) => r[0] + ":" + r[1] + " vets").join(", ")})`);
    // 3 minutos simulados por fase (Fases 6 a 10, com 3 a 6 veterinários): quase nunca sobrepostos, raramente juntos e nunca em fila por muito tempo
    const sep2 = await ev(page, () => {
      const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const out = {};
      for (const lvl of [6, 7, 8, 9, 10]) {
        out[lvl] = { overlap: 0, near: 0, pairs: 0, maxStreak: 0 };
        __game.start(lvl); __game.noCatch = true; __game.setRand(mulberry(lvl)); __game.start(lvl);
        const n = __game.vets.length, streak = {};
        for (let i = 0; i < 60 * 60 * 3; i++) {
          __game.tick(1 / 60); const v = __game.vets;
          for (let a = 0; a < n; a++) for (let c = a + 1; c < n; c++) {
            const d = Math.hypot(v[a].cx - v[c].cx, v[a].cy - v[c].cy), k = a + "-" + c; out[lvl].pairs++;
            if (d < 16) out[lvl].overlap++;
            if (d < 96) { out[lvl].near++; streak[k] = (streak[k] || 0) + 1; out[lvl].maxStreak = Math.max(out[lvl].maxStreak, streak[k]); } else streak[k] = 0;
          }
        }
      }
      __game.setRand(null); __game.noCatch = false; return out;
    });
    ok([6, 7, 8, 9, 10].every((l) => sep2[l].overlap <= 60), `Fases 6 a 10, 3 minutos simulados: os veterinários quase nunca ficam um em cima do outro (quadros sobrepostos: ${[6, 7, 8, 9, 10].map((l) => sep2[l].overlap).join(", ")})`);
    ok([6, 7, 8, 9, 10].every((l) => sep2[l].near / sep2[l].pairs < 0.15 && sep2[l].maxStreak <= 15 * 60), `e raramente andam juntos nem em fila (tempo a menos de 3 tiles: ${[6, 7, 8, 9, 10].map((l) => (100 * sep2[l].near / sep2[l].pairs).toFixed(1) + "%").join(", ")}; maior sequência ${[6, 7, 8, 9, 10].map((l) => (sep2[l].maxStreak / 60).toFixed(1) + " s").join(", ")})`);
    // ---- depois da Fase 10 (a última) não há Próxima fase ----
    await playLevel(page, 10, { done: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    await finishNow(page, 10);
    ok(await ev(page, () => __game.state) === "won" && /Fase 10 concluída/.test(await page.textContent("#win-title")) && await page.isHidden("#btn-next") && await ev(page, () => document.activeElement.id) === "btn-again", "Fase 10 concluída: depois dela (a última) não há Próxima fase");
    // ---- as Fases 9 e 10: o cachorrinho renasce onde morreu (as outras voltam ao início) ----
    const rp = await ev(page, () => {
      const out = {};
      for (const id of [8, 9, 10]) {
        __game.start(id); __game.freezeVets = true; __game.noCatch = false; __game.items.forEach((i) => { i.life = false; }); // (um item com vida extra no lugar do teste anularia a vida perdida)
        const p = __game.player, spawn = [p.x, p.y], M = __game.levels[id - 1].map;
        // vai até um lugar livre bem longe do início (fora dos trilhos das peças móveis) e é pego por um veterinário
        const trk = new Set(__game.levels[id - 1].blocks.flatMap((b) => { const o = []; for (const w of ["from", "to"]) for (let i = 0; i < (b.size ? b.size[0] : 1); i++) for (let j = 0; j < (b.size ? b.size[1] : 1); j++) o.push((b[w][0] + i) + "," + (b[w][1] + j)); return o; }));
        let tile = null; for (let r = M.length - 4; r > 3 && !tile; r--) for (let c = 8; c < M[0].length - 8 && !tile; c++) if (M[r][c] === "." && M[r][c + 1] === "." && !trk.has(c + "," + r) && Math.abs(c - (M[0].length >> 1)) > 6) tile = [c, r];
        p.x = tile[0] * 32 + 4; p.y = tile[1] * 32 + 4; const here = [p.x, p.y];
        const v = __game.vets[0]; for (const o of __game.vets) o.cool = 99;
        v.cx = p.x + 12; v.cy = p.y + 12; __game.freezeVets = false; const lives0 = __game.lives; __game.tick(0.01); __game.freezeVets = true;
        out[id] = { lives: lives0 - __game.lives, at: [p.x, p.y], here, spawn, invuln: __game.invuln, vetsHome: __game.vets.every((o) => Math.hypot(o.cx - o.sx, o.cy - o.sy) < 1) };
      }
      return out;
    });
    ok(rp[8].lives === 1 && rp[8].at.join() === rp[8].spawn.join() && rp[8].vetsHome, "Fase 8: perdeu uma vida e o cachorrinho volta ao início (como sempre)");
    if (![9, 10].every((id) => rp[id].lives === 1 && rp[id].at.join() === rp[id].here.join() && rp[id].invuln > 1.5 && rp[id].vetsHome)) console.log("   detalhe:", JSON.stringify(rp));
    ok([9, 10].every((id) => rp[id].lives === 1 && rp[id].at.join() === rp[id].here.join() && rp[id].invuln > 1.5 && rp[id].vetsHome), `Fases 9 e 10: ao ser pego o cachorrinho renasce onde morreu (${rp[9].at.map(Math.round).join(",")}), protegido por ${rp[9].invuln.toFixed(1)} s, e os veterinários voltam aos postos`);
    // esmagado por um bloco: renasce ao lado do bloco, nunca dentro dele
    const cr = await ev(page, () => {
      __game.start(9); __game.freezeVets = true; __game.noCatch = false; __game.items.forEach((i) => { i.x = -500; i.y = -500; });
      const def = __game.levels[8].blocks.findIndex((b) => !b.wall), b0 = __game.levels[8].blocks[def];
      const ids = __game.blocks.map((b) => b.i); const k = ids.indexOf(def);
      if (k < 0) return { skip: true };
      const blk = () => __game.blocks[k], r0 = [blk().x, blk().y]; for (let i = 0; i < 1000 && blk().x === r0[0] && blk().y === r0[1]; i++) __game.tick(0.01);
      const ends = [b0.from, b0.to].map(([c, r]) => [c * 32, r * 32]);
      const dest = ends.sort((a, c) => Math.hypot(c[0] - blk().x, c[1] - blk().y) - Math.hypot(a[0] - blk().x, a[1] - blk().y))[0];
      const p = __game.player; p.x = dest[0] + 4; p.y = dest[1] + 4; const lives0 = __game.lives;
      for (let i = 0; i < 40; i++) __game.tick(0.02);
      const rect = { x: blk().x, y: blk().y, w: 32, h: 32 }, pr = { x: p.x, y: p.y, w: 24, h: 24 };
      const inside = pr.x < rect.x + rect.w && pr.x + pr.w > rect.x && pr.y < rect.y + rect.h && pr.y + pr.h > rect.y;
      return { lost: lives0 - __game.lives, inside, state: __game.state, far: Math.hypot(p.x - dest[0], p.y - dest[1]) };
    });
    ok(cr.skip || (cr.lost === 1 && !cr.inside && cr.state === "playing" && cr.far < 100), `Fase 9: esmagado por um bloco, o cachorrinho renasce junto dele, nunca dentro do bloco (vidas perdidas ${cr.lost}, dentro do bloco: ${cr.inside}, a ${cr.far && cr.far.toFixed(0)} px de onde morreu)`);
  });

  // =====================================================================
  await section("0.7.0: o tempo só começa ao jogar, vidas escondidas sem coração e Fase 3 com 1 a 2 vidas", async () => {
    await play(page, { keepSave: true });
    // ---- a fase espera o primeiro passo: relógio, veterinários e blocos parados ----
    const w = await ev(page, () => {
      __game.autoStart = false; __game.start(3); __game.noCatch = false;
      const v0 = __game.vets[0], pos0 = [v0.cx, v0.cy], bt0 = __game.blocks.map((b) => b.bt), toast0 = document.getElementById("toast").textContent;
      for (let i = 0; i < 400; i++) __game.tick(0.05); // 20 s sem se mexer
      const waited = { started: __game.started, time: __game.time, moved: v0.cx !== pos0[0] || v0.cy !== pos0[1], blocks: __game.blocks.some((b, i) => b.bt !== bt0[i]), lives: __game.lives, hud: document.getElementById("hud-time").textContent, toast0 };
      __t.press("d", true); __game.tick(0.05); __t.press("d", false);
      const after = { started: __game.started, time: __game.time, toast: document.getElementById("toast").classList.contains("show") };
      for (let i = 0; i < 100; i++) __game.tick(0.05);
      const later = { time: __game.time, moved: v0.cx !== pos0[0] || v0.cy !== pos0[1], blocks: __game.blocks.some((b, i) => b.bt !== bt0[i]) };
      __game.autoStart = true; return { waited, after, later };
    });
    ok(!w.waited.started && w.waited.time === 0 && !w.waited.moved && !w.waited.blocks && w.waited.lives === 3 && /^0,0 s$/.test(w.waited.hud) && /só começa quando você se mexer/.test(w.waited.toast0), `Fase 3: depois de 20 s parado o relógio segue em 0, os veterinários e os blocos não saíram do lugar e o aviso explica (${w.waited.hud}; "${w.waited.toast0.slice(-45)}")`);
    ok(w.after.started && w.after.time > 0 && w.after.time <= 0.06 && !w.after.toast && w.later.time > 4.9 && (w.later.moved || w.later.blocks), `no primeiro passo o relógio começa a contar (${w.after.time.toFixed(2)} s), o aviso some e o resto do mundo anda (relógio ${w.later.time.toFixed(1)} s depois de 5 s)`);
    // o jogo salvo antes do primeiro passo continua esperando; o salvo depois, continua direto
    const sv = await ev(page, () => {
      __game.autoStart = false; __game.start(2); __game.save(); const raw0 = JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap.time;
      return raw0;
    });
    await page.reload(); await page.evaluate(PAGE_HELPERS); await ev(page, () => { __game.autoStart = false; }); await page.click("#btn-continue");
    const c0 = await ev(page, () => ({ started: __game.started, time: __game.time }));
    ok(sv === 0 && !c0.started && c0.time === 0, "continuar um jogo salvo antes do primeiro passo: a fase segue esperando o primeiro passo");
    await ev(page, () => { __t.press("d", true); __game.tick(0.05); __t.press("d", false); for (let i = 0; i < 40; i++) __game.tick(0.05); __game.save(); });
    await page.reload(); await page.evaluate(PAGE_HELPERS); await ev(page, () => { __game.autoStart = false; }); await page.click("#btn-continue");
    const c1 = await ev(page, () => ({ started: __game.started, time: __game.time }));
    ok(c1.started && c1.time > 1.5, `continuar um jogo salvo depois de começar: o relógio volta de onde parou, sem esperar de novo (${c1.time.toFixed(1)} s)`);
    // tentar de novo / nova fase também esperam
    const ret = await ev(page, () => { __game.autoStart = false; __game.start(2, { retries: 1 }); return { started: __game.started, time: __game.time, toast: document.getElementById("toast").textContent }; });
    ok(!ret.started && ret.time === 0 && /Tentativa extra 1 de 3/.test(ret.toast) && /só começa quando você se mexer/.test(ret.toast), "uma nova tentativa também espera o primeiro passo (e o aviso das tentativas continua)");
    await ev(page, () => { __game.autoStart = true; });
    // ---- vidas escondidas: nenhum coração em cima dos itens ----
    const heart = await ev(page, async () => {
      __game.start(1); __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; });
      const it = __game.items[0]; it.life = true;
      __game.player.x = 700; __game.player.y = 500; // longe do item, para a câmera mostrar o item
      const k = __game.view.k * __game.view.zoom;
      const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const grab = () => { const c = document.getElementById("game").getContext("2d"), x = Math.round((it.x + 8 - __game.view.camX) * k), y = Math.round((it.y - 4 - __game.view.camY) * k); return Array.from(c.getImageData(x - 8, y - 14, 16, 14).data).join(","); };
      await frame(); const withLife = grab(); it.life = false; await frame(); const without = grab();
      return { same: withLife === without };
    });
    ok(heart.same, "um item com vida extra é desenhado igual a um item sem: nenhum coração à mostra");
    // ---- Fase 3: 1 a 2 vidas, no máximo 1 num osso ----
    const f3 = await ev(page, () => {
      const counts = new Set(); let bonesBoth = 0, r = 0;
      for (const rv of [0, 0.99]) { __game.setRand(() => rv); __game.start(3); const it = __game.items; counts.add(it.filter((i) => i.life).length); if (it.filter((i) => i.life && i.bone).length > 1) bonesBoth++; }
      for (let k = 0; k < 60; k++) { __game.setRand(() => Math.random()); __game.start(3); const it = __game.items; counts.add(it.filter((i) => i.life).length); if (it.filter((i) => i.life && i.bone).length > 1) bonesBoth++; }
      __game.setRand(null); return { counts: [...counts].sort(), bonesBoth };
    });
    ok(f3.counts.join() === "1,2" && f3.bonesBoth === 0, `Fase 3: o sorteio dá 1 ou 2 vidas escondidas (vistas: ${f3.counts.join(" e ")}) e nunca vida nos dois ossos`);
  });

  await section("0.7.0 (auditoria): Continuar com tempo 0, aviso do primeiro passo, placar estável, Voltar à vista", async () => {
    await play(page, { keepSave: true });
    const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    // "Continuar jogo" com o tempo em 0: o cachorrinho continua desenhado (o pisca da proteção não depende do relógio parado) e o aviso do primeiro passo volta depois do "Jogo carregado"
    await ev(page, () => { __game.autoStart = false; __game.start(1); __game.save(); });
    await page.reload(); await page.evaluate(PAGE_HELPERS); await ev(page, () => { __game.autoStart = false; });
    await page.click("#btn-continue"); await frame();
    const dogShown = async () => {
      const grab = () => ev(page, () => { const c = document.getElementById("game").getContext("2d"), k = __game.view.k * __game.view.zoom, p = __game.player; return Array.from(c.getImageData(Math.round((p.x + 12 - __game.view.camX) * k) - 10, Math.round((p.y + 12 - __game.view.camY) * k) - 10, 20, 20).data).join(","); });
      const withDog = await grab();
      await ev(page, () => { __game.player.x += 300; }); await frame();
      const grabAway = await ev(page, () => { const c = document.getElementById("game").getContext("2d"), k = __game.view.k * __game.view.zoom, p = __game.player; return Array.from(c.getImageData(Math.round((p.x - 300 + 12 - __game.view.camX) * k) - 10, Math.round((p.y + 12 - __game.view.camY) * k) - 10, 20, 20).data).join(","); });
      await ev(page, () => { __game.player.x -= 300; });
      return withDog !== grabAway;
    };
    const c0 = await ev(page, () => ({ started: __game.started, time: __game.time, invuln: __game.invuln, toast: document.getElementById("toast").textContent }));
    ok(!c0.started && c0.time === 0 && c0.invuln > 1 && await dogShown(), `Continuar jogo com tempo 0: o cachorrinho aparece na tela, mesmo protegido e com o relógio parado (proteção ${c0.invuln.toFixed(1)} s)`);
    await ev(page, () => { for (let i = 0; i < 50; i++) __game.tick(0.05); }); // 2,5 s depois: o "Jogo carregado" já saiu
    const c1 = await ev(page, () => ({ show: document.getElementById("toast").classList.contains("show"), text: document.getElementById("toast").textContent, started: __game.started, time: __game.time }));
    ok(c1.show && /só começa quando você se mexer/.test(c1.text) && !c1.started && c1.time === 0, `Continuar jogo com tempo 0: depois do "Jogo carregado" o aviso do primeiro passo aparece e a fase segue parada ("${c1.text}")`);
    // pausar antes do primeiro passo apaga o aviso (as telas escondem os avisos); ao voltar, ele reaparece
    await page.keyboard.press("Escape"); await frame();
    ok(await ev(page, () => __game.state) === "paused" && !(await ev(page, () => document.getElementById("toast").classList.contains("show"))), "a tela de pausa não mostra o aviso por trás");
    await page.keyboard.press("Escape"); await ev(page, () => { __game.tick(0.05); __game.tick(0.05); });
    const c2 = await ev(page, () => ({ show: document.getElementById("toast").classList.contains("show"), text: document.getElementById("toast").textContent, started: __game.started }));
    ok(c2.show && /só começa quando você se mexer/.test(c2.text) && !c2.started, "depois de pausar e voltar, sem ter dado o primeiro passo, o aviso de que o tempo só começa ao se mexer reaparece");
    await ev(page, () => { __t.press("d", true); __game.tick(0.05); __t.press("d", false); });
    ok(await ev(page, () => __game.started && !document.getElementById("toast").classList.contains("show")), "no primeiro passo o aviso some de vez");
    await ev(page, () => { __game.autoStart = true; });

    // Fase 9 renasce no lugar: o aviso diz isso; nas outras fases não
    const rb = await ev(page, () => {
      const out = {};
      for (const id of [8, 9]) { __game.start(id, { lives: 5 }); __game.freezeVets = true; const p0 = [__game.player.x, __game.player.y]; __game.player.x += 64; const v = __game.vets[0]; v.cx = __game.player.x + 12; v.cy = __game.player.y + 12; __game.freezeVets = false; __game.noCatch = false; __game.tick(0.01); out[id] = { lives: __game.lives, toast: document.getElementById("toast").textContent }; }
      return out;
    });
    ok(/renasceu onde caiu/.test(rb[9].toast) && !/renasceu onde caiu/.test(rb[8].toast) && rb[9].lives === 4 && rb[8].lives === 4, `o aviso de perder a vida na Fase 9 diz que renasceu onde caiu e o da Fase 8 não ("${rb[9].toast}")`);

    // placar: a largura dos números é fixa na fase, então o jogo não encolhe no meio da partida (Fases 5 a 10)
    const hudSizes = {};
    for (const [w, h] of [[1280, 720], [1024, 768], [568, 320]]) {
      await page.setViewportSize({ width: w, height: h });
      for (const id of [5, 8, 10]) {
        const m = await ev(page, async (id) => {
          __game.start(id); __game.freezeVets = true; __game.noCatch = true;
          const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          await frame(); await frame();
          const size = () => { const r = document.getElementById("game").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.top)].join("x"); };
          const first = size();
          const seen = new Set([first]);
          for (const it of __game.items.filter((i) => !i.taken).slice(0, 14)) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); await frame(); seen.add(size()); }
          __game.tick(12); await frame(); seen.add(size());
          return { first, seen: [...seen] };
        }, id);
        hudSizes[`${id}@${w}x${h}`] = m.seen.length === 1;
        if (m.seen.length !== 1) console.log("   tamanho do jogo variou:", id, w, h, m.seen.join(" | "));
      }
    }
    ok(Object.values(hudSizes).every(Boolean), `o tamanho do jogo não muda durante a partida (Fases 5, 8 e 10 em 3 telas: ${Object.keys(hudSizes).length} casos)`);
    await page.setViewportSize({ width: 1280, height: 720 });

    // celular deitado e baixo (568 × 320): o placar das Fases 5 a 10 não quebra em 5 linhas, a página não rola e o jogo não encolhe para o mínimo
    const lowL = await newPage({ viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true });
    await fresh(lowL);
    const lows = [];
    for (const id of [1, 5, 10]) {
      lows.push(await ev(lowL, async (id) => { __game.start(id); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))); const de = document.documentElement; return { id, over: de.scrollHeight - innerHeight, hud: Math.round(document.getElementById("hud").getBoundingClientRect().height), w: Math.round(document.getElementById("game").getBoundingClientRect().width) }; }, id));
    }
    ok(lows.every((l) => l.over <= 1 && l.hud <= 80 && l.w >= 270), `celular deitado de 320 px de altura: sem rolagem, placar de até 80 px e jogo com 270 px ou mais (${lows.map((l) => `F${l.id}: sobra ${l.over}, placar ${l.hud}, jogo ${l.w}`).join(" | ")})`);

    // telas longas: o botão Voltar fica sempre à vista
    await ev(page, () => { sessionStorage.setItem("keepSave", ""); localStorage.removeItem("cachorrinho.save.v1"); const st = Records.createStore(localStorage); st.setPlayer("Totó"); for (let l = 1; l <= 9; l++) st.completeLevel("Totó", l); });
    await page.reload(); await page.evaluate(PAGE_HELPERS);
    for (const [w, h] of [[320, 568], [1280, 720]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.click("#btn-scores");
      const sc = await ev(page, () => { const b = document.getElementById("btn-scores-back").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: innerHeight, scroll: document.getElementById("scores").scrollHeight }; });
      ok(sc.bottom <= sc.h + 1 && sc.top >= 0, `Pontuações com 10 fases (${sc.scroll} px de altura): o botão Voltar está à vista sem rolar em ${w}x${h}`);
      await page.click("#btn-scores-back");
      await page.click("#btn-start");
      const lv = await ev(page, () => { const f = document.activeElement, r = f.getBoundingClientRect(), b = document.getElementById("btn-levels-back").getBoundingClientRect(); return { focus: f.textContent.slice(0, 7), fr: [r.top, r.bottom], h: innerHeight, backBottom: b.bottom, backTop: b.top }; });
      ok(/Fase 10/.test(lv.focus) && lv.fr[0] >= 0 && lv.fr[1] <= lv.h + 1 && lv.backBottom <= lv.h + 1 && lv.backTop >= 0, `a lista de fases abre com o foco na última fase liberada (${lv.focus}), visível, e com o Voltar à vista em ${w}x${h}`);
      await page.click("#btn-levels-back");
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  await section("0.7.0 (auditoria): primeiro passo por toque e controle, novas fases esperam, vida sem pista, renascer e peças", async () => {
    await play(page, { keepSave: true });
    // ---- toque: arrastar o controle redondo dá o primeiro passo ----
    const t = await newPage({ viewport: { width: 390, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await fresh(t); await ev(t, () => { __game.autoStart = false; });
    await t.tap("#btn-start");
    await t.waitForTimeout(600);
    const t0 = await ev(t, () => ({ started: __game.started, time: __game.time }));
    await ev(t, () => {
      const pad = document.getElementById("pad"), r = pad.getBoundingClientRect(), R = r.width / 2;
      window.__ptr = (type, x, y) => pad.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true, clientX: x, clientY: y }));
      window.__c = [r.left + R, r.top + R, R]; __ptr("pointerdown", r.left + R + 0.9 * R, r.top + R);
    });
    await t.waitForTimeout(400);
    const t1 = await ev(t, () => ({ started: __game.started, time: __game.time })); await ev(t, () => __ptr("pointerup", __c[0], __c[1]));
    ok(!t0.started && t0.time === 0 && t1.started && t1.time > 0.1, `no celular a fase espera parada e o primeiro arrasto do controle redondo liga o relógio (${t0.time} s → ${t1.time.toFixed(2)} s)`);
    // ---- controle de videogame: o analógico dá o primeiro passo ----
    const g = await newPage();
    await g.addInitScript(() => {
      const pad = { id: "Controle de teste", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      navigator.getGamepads = () => [pad, null, null, null]; window.__pad = pad;
    });
    await fresh(g); await ev(g, () => { window.dispatchEvent(new Event("gamepadconnected")); __game.autoStart = false; __game.start(2); });
    const g0 = await ev(g, () => { for (let i = 0; i < 60; i++) __game.tick(1 / 60); return { started: __game.started, time: __game.time }; });
    const g1 = await ev(g, () => { __pad.axes = [1, 0, 0, 0]; for (let i = 0; i < 12; i++) __game.tick(1 / 60); __pad.axes = [0, 0, 0, 0]; return { started: __game.started, time: __game.time }; });
    ok(!g0.started && g0.time === 0 && g1.started && g1.time > 0.1, `com o controle de videogame a fase espera e o analógico dá o primeiro passo (${g0.time} s → ${g1.time.toFixed(2)} s)`);
    // ---- todas as fases (1 a 10) esperam o primeiro passo ----
    const waits = await ev(page, () => {
      const out = []; __game.autoStart = false;
      for (let id = 1; id <= 10; id++) { __game.start(id); for (let i = 0; i < 40; i++) __game.tick(0.05); out.push([id, __game.started, __game.time, __game.vets.every((v) => Math.hypot(v.cx - v.sx, v.cy - v.sy) < 0.01)]); }
      __game.autoStart = true; return out;
    });
    ok(waits.every(([, st, tm, still]) => !st && tm === 0 && still), `as Fases 1 a 10 esperam o primeiro passo (2 s parado: relógio em 0 e veterinários nos postos)`);
    // ---- Próxima fase, Jogar novamente e Tentar novamente também esperam; a Próxima fase existe da Fase 1 à 9 ----
    for (const id of [1, 5, 9]) {
      await playLevel(page, id, { done: Array.from({ length: id - 1 }, (_, k) => k + 1) });
      await finishNow(page, 10);
      const nextShown = await page.isVisible("#btn-next");
      await ev(page, () => { __game.autoStart = false; });
      await page.click("#btn-next");
      const n1 = await ev(page, () => { for (let i = 0; i < 40; i++) __game.tick(0.05); return { level: __game.level, started: __game.started, time: __game.time }; });
      ok(nextShown && n1.level === id + 1 && !n1.started && n1.time === 0, `vitória da Fase ${id}: o botão Próxima fase aparece e a Fase ${id + 1} espera o primeiro passo`);
      await ev(page, () => { __game.autoStart = true; });
    }
    for (const id of [4, 8]) {
      await playLevel(page, id, { done: Array.from({ length: id - 1 }, (_, k) => k + 1) });
      await finishNow(page, 10);
      await ev(page, () => { __game.autoStart = false; });
      await page.click("#btn-again");
      const a1 = await ev(page, () => { for (let i = 0; i < 40; i++) __game.tick(0.05); return { level: __game.level, started: __game.started, time: __game.time }; });
      ok(a1.level === id && !a1.started && a1.time === 0, `Jogar novamente a Fase ${id} também espera o primeiro passo`);
      await ev(page, () => { __game.autoStart = true; });
    }
    {
      await playLevel(page, 3, { done: [1, 2] });
      const lost = await ev(page, () => { __game.setLives(1); __game.noCatch = false; for (const v of __game.vets) v.cool = 99; for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; __game.tick(0.01); return __game.state; });
      await ev(page, () => { __game.autoStart = false; });
      await page.click("#btn-retry");
      const r1 = await ev(page, () => { for (let i = 0; i < 40; i++) __game.tick(0.05); return { started: __game.started, time: __game.time }; });
      ok(lost === "lost" && !r1.started && r1.time === 0, "Tentar novamente também espera o primeiro passo");
      await ev(page, () => { __game.autoStart = true; });
    }

    // ---- vidas escondidas: nada à vista em rações e ossos, nas Fases 1, 3 e 6 (o sprite inteiro, não só em cima) ----
    const frame = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const bad = [];
    for (const id of [1, 3, 6]) for (const bone of id === 1 ? [false] : [false, true]) {
      await ev(page, ([id, bone]) => {
        __game.autoStart = false; __game.start(id); __game.freezeVets = true; __game.items.forEach((i) => { i.life = false; });
        const it = __game.items.find((i) => !!i.bone === bone); window.__it = it; __game.player.x = it.x + 70; __game.player.y = it.y - 4;
      }, [id, bone]);
      const grab = () => ev(page, () => { const it = __it, c = document.getElementById("game").getContext("2d"), k = __game.view.k * __game.view.zoom, cx = (it.x + 8 - __game.view.camX) * k, cy = (it.y + 8 - __game.view.camY) * k, R = Math.round(20 * k); return Array.from(c.getImageData(Math.round(cx) - R, Math.round(cy) - R, 2 * R, 2 * R).data).join(","); });
      await frame(); const plain = await grab();
      await ev(page, () => { __it.life = true; }); await frame(); const hidden = await grab();
      if (plain !== hidden) bad.push(`F${id} ${bone ? "osso" : "ração"}`);
    }
    await ev(page, () => { __game.autoStart = true; });
    ok(bad.length === 0, `um item com vida extra é desenhado pixel a pixel igual a um sem vida (ração e osso, Fases 1, 3 e 6)${bad.length ? ": diferem " + bad.join(", ") : ""}`);

    // ---- renascer onde morreu: nenhum item cai a menos de 3 tiles do cachorrinho ----
    const near = await ev(page, () => {
      let worst = 99, trials = 0;
      for (const id of [9, 10]) for (let k = 0; k < 12; k++) {
        __game.setRand(() => Math.random()); __game.start(id); __game.noCatch = false; __game.freezeVets = true;
        const M = __game.levels[id - 1].map, p = __game.player;
        const c0 = 10 + k * 3, r0 = M.length - 6; let c = c0; while (M[r0][c] !== "." || M[r0][c + 1] !== ".") c++;
        p.x = c * 32 + 4; p.y = r0 * 32 + 4;
        for (const v of __game.vets) v.cool = 99; for (let i = 0; i < 45; i++) __game.tick(0.01);
        const v = __game.vets[0]; v.cx = p.x + 12; v.cy = p.y + 12; __game.freezeVets = false; __game.tick(0.01); __game.freezeVets = true;
        const dc = Math.floor((p.x + 12) / 32), dr = Math.floor((p.y + 12) / 32);
        for (const it of __game.items) if (!it.taken) worst = Math.min(worst, Math.max(Math.abs(Math.round((it.x - 8) / 32) - dc), Math.abs(Math.round((it.y - 8) / 32) - dr)));
        trials++;
      }
      __game.setRand(null); return { worst, trials };
    });
    ok(near.worst >= 3, `ao renascer no lugar (Fases 9 e 10, ${near.trials} sorteios) nenhum item cai a menos de 3 tiles do cachorrinho (o mais perto: ${near.worst} tiles)`);

    // ---- pegar um osso com veterinários no meio de uma perseguição: eles terminam o trecho e não cortam a quina das paredes ----
    const clip = await ev(page, () => {
      const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      let worst = 0, runs = 0, chasing = 0;
      for (const id of [6, 7, 8, 9, 10]) for (let k = 0; k < 24; k++) {
        const rnd = mulberry(id * 1000 + k);
        __game.setRand(rnd); __game.start(id); __game.noCatch = true; __game.freezeVets = false;
        const M = __game.levels[id - 1].map, p = __game.player;
        // o cachorrinho fica longe do salão (num chão livre sorteado): os veterinários atravessam corredores e esquinas atrás dele
        let tile; for (let n = 0; n < 500; n++) { const c = 1 + Math.floor(rnd() * (M[0].length - 2)), r = 1 + Math.floor(rnd() * (M.length - 2)); if (M[r][c] === "." && Math.hypot(c * 32 - __game.vets[0].sx, r * 32 - __game.vets[0].sy) > 12 * 32) { tile = [c, r]; break; } }
        p.x = tile[0] * 32 + 4; p.y = tile[1] * 32 + 4;
        for (const v of __game.vets) { v.mode = "chase"; v.modeT = v.cfg.chaseTime; v.chaseAge = 0; v.cool = 0; }
        for (let i = 0, n = 20 + Math.floor(rnd() * 400); i < n; i++) __game.tick(1 / 60);
        chasing += __game.vets.filter((v) => v.mode === "chase").length;
        const bone = __game.items.find((i) => i.bone && !i.taken); p.x = bone.x - 4; p.y = bone.y - 4; __game.tick(1 / 60);
        for (let i = 0; i < 90; i++) {
          __game.tick(1 / 60);
          for (const v of __game.vets) {
            const x0 = v.cx - 12, y0 = v.cy - 12;
            for (let r = Math.floor(y0 / 32); r <= Math.floor((y0 + 23.99) / 32); r++) for (let c = Math.floor(x0 / 32); c <= Math.floor((x0 + 23.99) / 32); c++) {
              if (!M[r] || (M[r][c] !== "#" && M[r][c] !== "X")) continue;
              const px = Math.min(x0 + 24, (c + 1) * 32) - Math.max(x0, c * 32), py = Math.min(y0 + 24, (r + 1) * 32) - Math.max(y0, r * 32);
              worst = Math.max(worst, Math.min(px, py));
            }
          }
        }
        runs++;
      }
      __game.setRand(null); __game.noCatch = false; return { worst, runs, chasing };
    });
    ok(clip.chasing >= 100 && clip.worst <= 1, `pegar um osso com veterinários perseguindo (${clip.chasing} perseguidores em ${clip.runs} sorteios, Fases 6 a 10): nenhum veterinário entra mais de 1 px numa parede (pior: ${clip.worst.toFixed(1)} px)`);

    // ---- cada porta e cada parede das Fases 6 a 10 desliza na velocidade e no intervalo da tabela ----
    const spec = { 6: [120, 120, 3, 10], 7: [120, 120, 3, 10], 8: [120, 120, 3, 10], 9: [160, 140, 2.5, 8], 10: [200, 160, 2, 6] };
    const pieces = await ev(page, (spec) => {
      const out = [];
      for (const id of [6, 7, 8, 9, 10]) {
        __game.start(id);
        for (const b of __game.blocks) {
          const d = b.def, dist = Math.hypot(d.bx - d.ax, d.by - d.ay), wall = d.kind === "W", [ds, ws, de, we] = spec[id];
          const speed = dist / d.slide;
          if (Math.abs(speed - (wall ? ws : ds)) > 0.6 || Math.abs(d.every - (wall ? we : de)) > 0.001) out.push(`F${id} ${wall ? "parede" : "porta"} ${b.i}: ${speed.toFixed(0)} px/s a cada ${d.every} s`);
        }
      }
      return out;
    }, spec);
    ok(pieces.length === 0, `todas as portas e paredes das Fases 6 a 10 deslizam na velocidade e no intervalo da tabela${pieces.length ? " — fora: " + pieces.join("; ") : ""}`);
  });

  await section("cadastro e entrada (usuário e senha)", async () => {
    const stored = () => ev(page, () => localStorage.getItem("cachorrinho.v1") || "");
    const goRegister = async () => { await page.click("#btn-name"); await page.click("#btn-open-register"); };
    const idle = (p, id) => p.waitForFunction((id) => !document.getElementById(id).disabled, id, { timeout: 15000 }); // a senha é processada de forma assíncrona
    const submitReg = async (user, p1, p2 = p1) => { await page.fill("#reg-user", user); await page.fill("#reg-pass", p1); await page.fill("#reg-pass2", p2); await page.click("#btn-register-submit"); await idle(page, "btn-register-submit"); };
    const errText = (sel) => page.waitForFunction((s) => document.querySelector(s).textContent.length > 0, sel, { timeout: 4000 }).then(() => page.textContent(sel));

    await fresh(page, { name: "" });
    await page.click("#btn-name");
    ok(await page.isVisible("#btn-open-register") && await page.isVisible("#btn-open-login"), "tela de nome oferece Criar conta e Entrar");
    await page.click("#btn-open-register");
    const regTxt = await page.textContent("#register");
    ok(/4 a 20 caracteres/.test(regTxt) && /minúsculas e MAIÚSCULAS/.test(regTxt) && /números e símbolos são opcionais/i.test(regTxt) && /cachorrinho/.test(regTxt), "cadastro explica a regra da senha (4 a 20, minúsculas/MAIÚSCULAS, números e símbolos opcionais) e a dica do cachorrinho");
    ok(await ev(page, () => document.activeElement.id) === "reg-user", "o cursor já vem no campo do nome");
    const labels = await page.$$eval("#register input:not([type=checkbox])", (is) => is.map((i) => !!document.querySelector(`label[for=${i.id}]`)));
    ok(labels.every(Boolean), "todos os campos têm rótulo");
    const types = await ev(page, () => ["reg-pass", "reg-pass2"].map((id) => document.getElementById(id).type));
    ok(types.join() === "password,password", "senhas ficam escondidas");
    await page.check("#reg-show");
    ok((await ev(page, () => ["reg-pass", "reg-pass2"].map((id) => document.getElementById(id).type))).join() === "text,text", "Mostrar senha revela os campos");
    await page.uncheck("#reg-show");
    await page.fill("#reg-pass", ""); await page.type("#reg-pass", "abcd");
    ok(await page.textContent("#reg-count") === "4/20", "contador mostra quantos caracteres a senha tem (4/20)");
    await page.type("#reg-pass", "e".repeat(21));
    ok(await page.textContent("#reg-count") === "25/20" && await page.isVisible("#reg-count.over"), "passou de 20: o contador avisa (25/20) em vez de cortar a senha em silêncio");
    await page.fill("#reg-pass", "");

    // validações
    await submitReg("", "Senha123");
    ok(/letras ou números/.test(await errText("#reg-error")), "nome vazio: mostra como escolher o nome");
    await submitReg("Totó!", "Senha123");
    ok(/letras ou números/.test(await page.textContent("#reg-error")) && await ev(page, () => document.activeElement.id) === "reg-user", "nome com símbolo é recusado (sem 'consertar' em silêncio)");
    await submitReg("Totó", "abc");
    ok(/pelo menos 4/.test(await errText("#reg-error")), "senha curta é recusada");
    await submitReg("Totó", "x".repeat(21));
    ok(/no máximo 20/.test(await page.textContent("#reg-error")), "senha de 21 caracteres é recusada");
    await submitReg("Totó", "Senha123", "Senha124");
    ok(/iguais/.test(await page.textContent("#reg-error")), "senhas diferentes são recusadas");
    ok(!(await stored()).includes('"accounts":{"toto"'), "nada foi criado até aqui");

    // sucesso, com senha de 20 caracteres mista
    const pw20 = "Aa1!Bb2@Cc3#Dd4$Ee5%";
    ok(pw20.length === 20, "senha de teste tem 20 caracteres");
    await submitReg("Totó", pw20);
    await page.waitForFunction(() => document.getElementById("menu") && !document.getElementById("menu").classList.contains("hidden"));
    ok(await page.textContent("#menu-player") === "Totó (conta com senha)" && await page.isVisible("#btn-logout"), "conta criada: entra direto e o menu mostra o jogador e Sair da conta");
    let raw = await stored();
    ok(raw.includes('"accounts"') && raw.includes("pbkdf2-sha256") && !raw.includes(pw20) && !raw.includes("Bb2@"), "no armazenamento há só sal e impressão (a senha não aparece)");
    ok((await ev(page, () => Object.keys(localStorage).map((k) => localStorage.getItem(k)).join("|"))).includes(pw20) === false, "a senha não está em nenhuma chave do armazenamento");
    await page.reload();
    ok(await page.textContent("#menu-player") === "Totó (conta com senha)", "continua conectado depois de recarregar");
    await page.click("#btn-name"); await page.click("#btn-open-register");
    ok((await ev(page, () => ["reg-user", "reg-pass", "reg-pass2"].map((id) => document.getElementById(id).value))).join("") === "", "os campos de senha voltam vazios");
    await page.keyboard.press("Escape");

    // sair e voltar
    await page.click("#btn-logout");
    ok(await page.textContent("#menu-player") === "ainda não escolhido" && await page.isHidden("#btn-logout"), "Sair da conta desconecta");
    ok(JSON.parse(await stored()).accounts?.toto?.n === "Totó", "a conta Totó continua existindo no armazenamento depois de sair");

    // nome com senha não vale como nome simples
    await page.click("#btn-name"); await page.fill("#name-input", "Totó"); await page.click("#name button[type=submit]");
    ok(/conta com senha/.test(await page.textContent("#name-error")) && await page.textContent("#menu-player").catch(() => "") !== "Totó", "usar o nome 'Totó' sem senha é recusado e manda para Entrar");
    ok(await page.isVisible("#name-chips button:text-is('Totó (com senha)')"), "o atalho do nome mostra que tem senha");
    await page.click("#name-chips button:text-is('Totó (com senha)')");
    ok(await page.isVisible("#login") && await page.inputValue("#login-user") === "Totó" && await ev(page, () => document.activeElement.id) === "login-pass", "tocar no atalho abre Entrar com o nome já preenchido");

    // entrar
    const login = async (user, pass) => { await page.fill("#login-user", user); await page.fill("#login-pass", pass); await page.click("#btn-login-submit"); await idle(page, "btn-login-submit"); };
    await login("Totó", "errada123");
    ok(/incorretos/.test(await errText("#login-error")) && await page.isVisible("#login") && await page.inputValue("#login-pass") === "", "senha errada: mensagem e campo de senha limpo");
    await login("Fantasma", pw20);
    ok(/Usuário ou senha incorretos/.test(await page.textContent("#login-error")), "usuário inexistente dá a mesma mensagem (não revela quem existe)");
    await login("", pw20);
    ok(/nome de usuário/.test(await page.textContent("#login-error")), "nome vazio é avisado");
    await login("totó", pw20.toLowerCase());
    ok(/incorretos/.test(await page.textContent("#login-error")), "a senha diferencia maiúsculas e minúsculas");
    await login("TOTO", pw20);
    await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
    ok(await page.textContent("#menu-player") === "Totó (conta com senha)", "entrar com o nome em outra caixa/acento (TOTO) e a senha certa funciona");

    // bloqueio por tentativas
    await page.click("#btn-logout"); await page.click("#btn-name"); await page.click("#btn-open-login");
    for (let i = 0; i < 5; i++) await login("Totó", "errada" + i);
    ok(/Muitas tentativas/.test(await errText("#login-error")) && /\d+ segundos/.test(await page.textContent("#login-error")), "5 erros seguidos: avisa e pede para esperar");
    await login("Totó", pw20);
    ok(/Muitas tentativas/.test(await page.textContent("#login-error")) && await page.isVisible("#login"), "durante o bloqueio nem a senha certa entra");

    // esqueci a senha: apaga só essa conta
    await ev(page, () => { const s = Records.createStore(localStorage); s.setPlayer("Rex"); s.addRun({ level: 1, timeMs: 20000, points: 600 }); });
    await page.reload(); await page.click("#btn-name"); await page.click("#btn-open-login");
    await page.fill("#login-user", ""); await page.click("#btn-forgot");
    ok(/primeiro/.test(await page.textContent("#login-error")) && await page.isVisible("#login"), "Esqueci a senha sem nome: pede o nome primeiro");
    await page.fill("#login-user", "totó"); await page.click("#btn-forgot");
    ok(await page.isVisible("#forgot") && /Totó/.test(await page.textContent("#forgot-text")) && /não tem como recuperar/.test(await page.textContent("#forgot-text")), "explica que a senha não pode ser recuperada e que dá para apagar a conta");
    ok(await ev(page, () => document.activeElement.id) === "btn-forgot-back", "o foco começa no botão seguro (Voltar)");
    await page.click("#btn-forgot-back");
    ok(await page.isVisible("#login"), "Voltar não apaga nada");
    await page.fill("#login-user", "Totó"); await page.click("#btn-forgot"); await page.click("#btn-forgot-delete");
    ok(await page.isVisible("#register") && await page.inputValue("#reg-user") === "Totó", "depois de apagar, abre Criar conta com o nome já preenchido");
    raw = await stored();
    ok(!raw.includes('"toto":{"n"') && raw.includes("Rex"), "a conta foi apagada e os dados de outros jogadores ficaram");
    await page.fill("#reg-pass", "Nova1234"); await page.fill("#reg-pass2", "Nova1234"); await page.click("#btn-register-submit"); await idle(page, "btn-register-submit");
    await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
    ok(await page.textContent("#menu-player") === "Totó (conta com senha)", "o nome pode ser cadastrado de novo");

    // senhas variadas
    for (const [i, pw] of ["somenteminusculas", "SOMENTEMAIUSCULAS", "AbCdEfGh", "12345678", "!@#$%^&*", "Com Espaço 9", "çãõ-ÉÜ"].entries()) {
      await page.click("#btn-logout"); await page.click("#btn-name"); await page.click("#btn-open-register");
      await submitReg("Cao" + i, pw);
      await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
      const who = await page.textContent("#menu-player");
      await page.click("#btn-logout"); await page.click("#btn-name"); await page.click("#btn-open-login");
      await login("Cao" + i, pw);
      await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
      ok(who === `Cao${i} (conta com senha)` && await page.textContent("#menu-player") === `Cao${i} (conta com senha)`, `senha "${pw}" cadastra e entra`);
    }

    // começar o jogo sem nome: Criar conta e jogar
    await fresh(page, { name: "" });
    await page.click("#btn-start");
    ok(await page.isVisible("#name"), "Iniciar jogo sem jogador abre a escolha de nome");
    await page.click("#btn-open-register");
    await submitReg("Mel", "Doce#2024");
    await page.waitForFunction(() => __game.state === "playing");
    ok(await ev(page, () => __game.state) === "playing", "criar a conta a partir de Iniciar jogo já começa a partida");
    await ev(page, () => { __game.freezeVets = true; for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); });
    const melBest = await ev(page, () => Records.createStore(localStorage).personalBest("Mel", 1));
    ok(melBest && melBest.p >= 500, "as pontuações ficam guardadas na conta");
    await page.click("#btn-win-menu"); await page.click("#btn-logout");
    await page.click("#btn-scores");
    ok(/Escolha um nome de usuário/.test(await page.textContent("#scores-private")) && !/Mel —? ?\d/.test(await page.textContent("#scores-private")), "sem entrar, a parte individual da tela de pontuações não mostra nada de ninguém");
    await page.keyboard.press("Escape");
    await page.click("#btn-name"); await page.click("#btn-open-login"); await page.fill("#login-user", "Mel"); await page.fill("#login-pass", "Doce#2024"); await page.click("#btn-login-submit"); await idle(page, "btn-login-submit");
    await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
    ok((await page.textContent("#menu-best")).includes("Suas melhores"), "ao entrar de novo, as pontuações da conta voltam");
  });

  await section("cadastro sem criptografia nativa (versão em JavaScript)", async () => {
    const js = await newPage();
    await js.addInitScript(() => { try { Object.defineProperty(window.crypto, "subtle", { value: undefined, configurable: true }); } catch { /* */ } });
    await js.goto(URL);
    ok(await js.evaluate(() => !window.crypto.subtle), "teste sem crypto.subtle (como numa página em http)");
    await js.evaluate(() => localStorage.clear()); await js.reload();
    await js.click("#btn-name"); await js.click("#btn-open-register");
    await js.fill("#reg-user", "Bidu"); await js.fill("#reg-pass", "Compat#JS-2024"); await js.fill("#reg-pass2", "Compat#JS-2024");
    const t0 = Date.now(); await js.click("#btn-register-submit");
    await js.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"), null, { timeout: 15000 });
    const ms = Date.now() - t0;
    ok(await js.textContent("#menu-player") === "Bidu (conta com senha)", `cadastro funciona só com JavaScript (${ms} ms)`);
    await js.click("#btn-logout"); await js.click("#btn-name"); await js.click("#btn-open-login");
    await js.fill("#login-user", "Bidu"); await js.fill("#login-pass", "Compat#JS-2024"); await js.click("#btn-login-submit");
    await js.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"), null, { timeout: 15000 });
    ok(await js.textContent("#menu-player") === "Bidu (conta com senha)", "e entrar também");
    await js.context().close();
  });

  await section("cadastro no celular pequeno", async () => {
    const m = await newPage({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    await fresh(m, { name: "" });
    for (const [open, id] of [["#btn-open-register", "register"], ["#btn-open-login", "login"]]) {
      await m.tap("#btn-name"); await m.tap(open);
      const g = await ev(m, (id) => { const el = document.getElementById(id), btns = [...el.querySelectorAll("button")].filter((b) => b.offsetParent); return { hs: document.documentElement.scrollWidth - innerWidth, scrolls: el.scrollHeight > el.clientHeight, minBtn: Math.min(...btns.map((b) => b.getBoundingClientRect().height)), maxRight: Math.max(...btns.map((b) => b.getBoundingClientRect().right)) }; }, id);
      ok(g.hs <= 0 && g.maxRight <= 320, `${id}: sem rolagem lateral e botões dentro da tela de 320 px`);
      ok(g.minBtn >= 40, `${id}: botões com tamanho bom para o dedo (${g.minBtn.toFixed(0)} px)`);
      await m.keyboard.press("Escape");
    }
    await m.context().close();
  });

  console.log("erros JS:", errs);
  if (errs.length) failed++;
  if (only && sectionsRun === 0) { failed++; console.log(`FAIL nenhuma seção tem "${only}" no título (um filtro que não casa com nada não vale como "tudo passou")`); }
  await browser.close();
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram");
  process.exit(failed ? 1 : 0);
})();
