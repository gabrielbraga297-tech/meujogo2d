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
const G1 = grid(mapOf(1)), G2 = grid(mapOf(2));
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
    ok(gl.length === 2 && gl[0].maps === m1 && gl[1].maps === m2 && gl[0].vets === 1 && gl[1].vets === 2, "o jogo carrega as duas fases com os mapas e veterinários esperados");
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
    ok(ver.visible && ver.text === `Versão ${ver.v.number} · ${dd}/${mm}/${yy}`, `o menu mostra a versão do jogo (${ver.text})`);
    ok(/^\d+\.\d+\.\d+$/.test(ver.v.number) && ver.v.build === "dev", "a versão vem de js/version.js (no código o build é 'dev' e não aparece)");
    ok(ver.left < 40 && ver.bottom < 40 && ver.left < ver.creditLeft && ver.fs >= 13, `versão no canto inferior esquerdo, legível (${ver.fs}px), sem tapar o crédito`);
    await page.evaluate(() => { window.GAME_VERSION = { number: "9.8.7", date: "2030-01-02", build: "abc1234" }; });
    await page.click("#btn-howto"); await page.click("#btn-howto-back");
    ok(await page.textContent("#menu-version") === "Versão 9.8.7 · 02/01/2030 · build abc1234", "publicado no GitHub Pages, a versão mostra também o código do commit (build)");
    await page.evaluate(() => { window.GAME_VERSION = undefined; });
    await page.click("#btn-howto"); await page.click("#btn-howto-back");
    ok(await page.textContent("#menu-version") === "Versão desconhecida", "sem js/version.js o menu não quebra");
    await fresh(page, { name: "" });

    await page.click("#btn-howto");
    const how = await page.textContent("#howto");
    ok(/3 vidas/.test(how) && /celular|tablet/i.test(how) && /Salvar/.test(how) && /disquete/.test(how), "Como jogar explica vidas, toque e salvamento (inclusive o botão de salvar)");
    ok(/bônus de tempo/i.test(how) && /20 segundos = 100/.test(how) && /até 30 s = 90/.test(how) && /10 pontos a menos a cada 10 s/.test(how) && /de 0 a 100/.test(how) && /maior/.test(how) && /não soma/.test(how) && /Fases diferentes se somam/.test(how), "Como jogar explica o bônus de tempo (0 a 100: 100 até 20 s, −10 a cada 10 s), que vale a maior pontuação da fase e que fases diferentes somam");
    ok(/50 pontos/.test(how) && /negativa/.test(how) && /mudam de lugar/.test(how) && /1 a 5/.test(how) && /passam para a fase seguinte/.test(how), "Como jogar explica −50 por vida, pontuação negativa, rações que mudam de lugar e vidas de 1 a 5 que passam de fase");
    ok(/3 novas tentativas/.test(how) && /Cada nova tentativa custa 100 pontos/.test(how) && /do zero/.test(how), "Como jogar explica as 3 novas tentativas (do zero, cada uma custa 100 pontos)");
    ok(/5 na Fase 1 e 7 na Fase 2/.test(how) && /2 veterinários/.test(how) && /10% mais espertos/.test(how) && /1 ou 2/.test(how), "Como jogar explica a Fase 2 (7 rações, 2 veterinários 10% mais espertos, 1 ou 2 vidas extras)");
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
      { id: 2, g: G2, count: 7, lifeMin: 1, lifeMax: 2 },
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
      ok(!bad, `Fase ${id}: 80 sorteios: sempre ${count} rações em chão livre, alcançável e longe de início/veterinários/saída ${bad && "(" + bad + ")"}`);
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
    ok(post.time >= pre.time && post.time - pre.time < 0.1, `o tempo não zera ao perder a vida: continua contando (${pre.time.toFixed(2)} → ${post.time.toFixed(2)})`);
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
    ok(cfg.speed === 50 && cfg.chaseSpeed === 100, `Fase 1: sem o "!" o veterinário anda a 50 px/s e com o "!" a 100 px/s (${cfg.speed} e ${cfg.chaseSpeed})`);
    ok(cfg.chaseSpeed < 180 * 0.6 && cfg.speed < cfg.chaseSpeed, "o veterinário é mais lento que o cachorro (180 px/s) nos dois modos, e com o \"!\" fica bem mais rápido");
    ok(cfg.chaseSpeed >= cfg.speed * 1.8, `com o "!" ele fica bem mais rápido (${cfg.speed} → ${cfg.chaseSpeed} px/s)`);
    ok(cfg.chaseTime >= 3 && cfg.chaseMax > cfg.chaseTime && cfg.sight <= 4 * 32 && cfg.chaseChance <= 0.3, "persegue com mais empenho, mas só enxerga perto e decide perseguir raramente");

    const patrol = await ev(page, () => {
      const v = __game.vets[0]; v.cfg.chaseChance = 0; __game.noCatch = true;
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
    const scenario = (rnd, dog, vet, seconds, escapeAfterStart) => ev(page, ([rnd, dog, vet, seconds, escape]) => {
      __game.setRand(rnd === "low" ? () => 0 : () => 0.99);
      __game.noCatch = true; __game.freezeVets = false;
      const v = __game.vets[0], p = __game.player;
      v.cfg.chaseChance = 0.25;
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
    }, [rnd, dog, vet, seconds, escapeAfterStart]);

    await play(page);
    const noChase = await scenario("high", [20, 4], [22, 4], 20);
    ok(noChase.dist0 < noChase.cfg.sight && noChase.startedAt === null, "vê o cachorro mas, com o sorteio alto, não persegue");
    await play(page);
    const far = await scenario("low", [1, 1], [22, 15], 10);
    ok(far.startedAt === null, "fora do alcance de visão não persegue, mesmo com sorteio favorável");
    await play(page);
    const stay = await scenario("low", [20, 4], [22, 4], 30);
    ok(stay.startedAt !== null && stay.startedAt <= 1.0, "com sorteio favorável e cachorro à vista, inicia a perseguição");
    ok(stay.chaseSpeedMax > stay.cfg.speed * 1.8 && Math.abs(stay.chaseSpeedMax - 100) <= 1, `durante a perseguição o veterinário anda a 100 px/s, o dobro de quando patrulha (${stay.chaseSpeedMax.toFixed(1)} px/s)`);
    const dur = stay.endedAt - stay.startedAt;
    ok(Math.abs(dur - stay.cfg.chaseMax) <= 0.3, `enquanto vê o cachorro ele insiste até o limite (${dur.toFixed(1)}s de ${stay.cfg.chaseMax}s)`);
    ok(stay.restartAt === null || stay.restartAt - stay.endedAt >= stay.cfg.restTime - 0.1, `depois de perseguir descansa ${stay.cfg.restTime}s antes de tentar de novo`);
    await play(page);
    const escaped = await scenario("low", [20, 4], [22, 4], 30, true);
    const dur2 = escaped.endedAt - escaped.startedAt;
    ok(Math.abs(dur2 - escaped.cfg.chaseTime) <= 0.3, `se o cachorro escapa da vista, a perseguição acaba em ~${escaped.cfg.chaseTime}s (${dur2.toFixed(1)}s)`);
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
    ok(after.invuln >= 1.4, "ganha uma proteção curta ao retomar");

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

    // save adulterado (ração dentro de uma parede) é ignorado
    await fresh(page, { keepSave: true });
    await ev(page, () => localStorage.setItem("cachorrinho.save.v1", JSON.stringify({ v: 1, saves: { toto: { t: Date.now(), snap: { v: 1, l: 1, time: 5, lives: 3, invuln: 0, items: [[0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0]], p: { x: 36, y: 36, f: "right" }, vets: [[80, 432]] } } } })));
    await page.reload();
    ok(await page.isHidden("#btn-continue") && await ev(page, () => document.activeElement.id) === "btn-start", "save adulterado/inválido é ignorado sem quebrar");
    await ev(page, () => localStorage.setItem("cachorrinho.save.v1", "{lixo"));
    await page.reload();
    ok(await page.isHidden("#btn-continue") && await ev(page, () => __game.state) === "menu", "save corrompido é ignorado");

    // saves de outra fase / com contagens erradas (7 rações e 1–2 vidas extras na Fase 2; 5 e 1 na Fase 1)
    const snapOf = async (id) => { await playLevel(page, id, { keepSave: true }); return ev(page, () => { __game.save(); return JSON.parse(localStorage.getItem("cachorrinho.save.v1")).saves.toto.snap; }); };
    const s1 = await snapOf(1), s2 = await snapOf(2);
    ok(s1.items.length === 5 && s2.items.length === 7 && s1.l === 1 && s2.l === 2, "o save guarda a fase e todas as rações dela (5 na Fase 1, 7 na Fase 2)");
    const accepts = async (snap) => { // grava `snap` como jogo salvo do Totó e vê se o menu oferece Continuar
      await fresh(page, { keepSave: true });
      await ev(page, (snap) => Records.createStore(localStorage).saveGame("Totó", snap), snap);
      await page.reload(); await page.evaluate(PAGE_HELPERS);
      return page.isVisible("#btn-continue");
    };
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const withLife = (snap, n) => { const c = clone(snap); c.items.forEach((it, i) => { it[3] = i < n ? 1 : 0; }); return c; };
    ok(await accepts(withLife(s2, 2)), "save válido da Fase 2 com 2 vidas extras é aceito");
    await page.click("#btn-continue");
    ok(await ev(page, () => __game.level) === 2 && await ev(page, () => __game.items.length) === 7 && await ev(page, () => __game.items.filter((i) => i.life).length) === 2 && await ev(page, () => __game.vets.length) === 2, "e continua na Fase 2, com 7 rações (2 com vida extra) e 2 veterinários");
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
    ok(await ev(page, () => __game.items.length) === 7 && await ev(page, () => __game.lives) === 3, "a Fase 2 tem 7 rações e começa com 3 vidas");

    // veterinários: no centro, 10% mais espertos
    const vs = await ev(page, () => __game.vets.map((v) => [Math.floor(v.cx / 32), Math.floor(v.cy / 32)]));
    ok(JSON.stringify(vs) === JSON.stringify(G2.find("V")) && vs.every(([c, r]) => Math.abs(c - 12) <= 2 && Math.abs(r - 8.5) <= 1.5), `os 2 veterinários começam no centro do mapa (${vs.join(" e ")})`);
    const cfgs = await ev(page, () => { const a = { ...__game.vets[0].cfg }, b = { ...__game.vets[1].cfg }; __game.start(1); return { f2a: a, f2b: b, f1: { ...__game.vets[0].cfg } }; });
    const close = (a, b) => Math.abs(a - b) < 1e-9;
    const up = ["speed", "chaseSpeed", "sight", "chaseChance", "chaseTime", "chaseMax"], down = ["thinkEvery", "restTime", "idleMin", "idleMax"];
    ok(up.every((k) => close(cfgs.f2a[k], cfgs.f1[k] * 1.1)), `Fase 2: velocidade, visão, chance e insistência da perseguição 10% maiores (${up.map((k) => `${k} ${cfgs.f1[k].toFixed(2)}→${cfgs.f2a[k].toFixed(2)}`).join(", ")})`);
    ok(down.every((k) => close(cfgs.f2a[k], cfgs.f1[k] / 1.1)), "Fase 2: ele pensa, descansa e para 10% menos tempo");
    ok(JSON.stringify(cfgs.f2a) === JSON.stringify(cfgs.f2b) && cfgs.f2a.chaseSpeed < 180 && cfgs.f2a.speed < cfgs.f2a.chaseSpeed, "os 2 veterinários são iguais, e o cachorro (180 px/s) continua mais rápido que eles");
    ok(cfgs.f1.speed === 50 && cfgs.f1.chaseSpeed === 100 && cfgs.f2a.speed === 55 && cfgs.f2a.chaseSpeed === 110, `velocidades exatas (px/s): Fase 1 = ${cfgs.f1.speed} sem "!" e ${cfgs.f1.chaseSpeed} com "!"; Fase 2 = ${cfgs.f2a.speed} e ${cfgs.f2a.chaseSpeed} (os valores da Fase 1 + 10% nos dois modos)`);
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
    ok(await ev(page, () => __game.collected) === 7 && await hudIs(page, "#hud-points", "700"), "caminhando pela Fase 2 dá para pegar as 7 rações (700 pontos)");
    ok(await ev(page, () => __game.state) === "playing", "com as 7 rações, a vitória só vem ao chegar na saída");
    await ev(page, (p) => __t.walk(p), G2.bfs(await cur(), G2.find("E")[0]));
    ok(await ev(page, () => __game.state) === "won" && await page.isVisible("#win"), `a Fase 2 termina ao chegar na saída com as 7 rações (cachorro em ${await tileOfPlayer(page)}, estado ${await ev(page, () => __game.state)})`);
    const wt = await page.textContent("#win-breakdown"), wp = Number(await page.textContent("#win-points"));
    const wm = wt.match(/Rações: (\d+) \+ bônus de tempo: (\d+)/);
    ok(/Fase 2 concluída/.test(await page.textContent("#win-title")) && wm && Number(wm[1]) === 700 && wp === 700 + Number(wm[2]), `pontuação da Fase 2 = 700 + bônus de tempo (${wp})`);
    ok(await page.isHidden("#btn-next") && await ev(page, () => document.activeElement.id) === "btn-again", "não há fase depois da Fase 2: sem Próxima fase");
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
    ok(await ev(page, () => [__game.level, __game.items.length, __game.vets.length, __game.retries, __game.lives].join()) === "2,7,2,1,3", "nova tentativa na Fase 2 recomeça a Fase 2 do zero (7 rações, 2 veterinários, 3 vidas)");
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
    const openScores = async (pg) => { await pg.click("#btn-scores"); await pg.waitForFunction(() => /compartilhado|deste aparelho/.test(document.getElementById("scores-source").textContent)); };
    const shared = (pg) => pg.waitForFunction(() => /compartilhado/.test(document.getElementById("scores-source").textContent), null, { timeout: 5000 }).then(() => true, () => false);
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
      db.scores[7] = { z: { n: "FaseFalsa", p: 1, t: 1000, w: 1 } };
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
      for (let i = 0; i < 6; i++) kd(true);
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
      __game.player.x = __game.spawn?.x ?? 36; __game.player.y = __game.spawn?.y ?? 36;
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
    ok(Object.values(small.out).every((m) => m.firstBottom <= m.vh && m.overflow <= 12), "E: em 320x568 (celular pequeno em pé) o botão principal de cada tela está à vista (rolagem de no máximo uns pixels)");
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
    await t.tap("#btn-pause");
    ok(await ev(t, () => __game.state) === "paused" && await t.isHidden("#touch"), "botão de pausa funciona no toque (e o controle some)");
    await t.tap("#btn-resume");
    ok(await ev(t, () => __game.state) === "playing" && await t.isVisible("#pad"), "retomar traz o controle de volta");
    await t.context().close();

    // celular deitado
    const l = await newPage({ viewport: { width: 740, height: 390 }, hasTouch: true, isMobile: true });
    await fresh(l); await l.tap("#btn-start");
    const ll = await ev(l, () => { const cv = document.getElementById("game").getBoundingClientRect(), pad = document.getElementById("pad").getBoundingClientRect(); return { cvTop: cv.top, cvBottom: cv.bottom, cvLeft: cv.left, cvW: cv.width, padRight: pad.right, padVisible: pad.width > 0, vscroll: document.documentElement.scrollHeight - innerHeight, ratio: cv.width / cv.height }; });
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
    await ev(g, () => { __game.freezeVets = true; const it = __game.items[0]; __game.player.x = it.x - 20; __game.player.y = it.y - 4; __padSet({ axes: [1, 0, 0, 0] }); for (let i = 0; i < 12; i++) __game.tick(1 / 60); __padSet({ axes: [0, 0, 0, 0] }); });

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
    await padHit(1); ok(await g.isVisible("#menu"), "B volta ao menu");
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
