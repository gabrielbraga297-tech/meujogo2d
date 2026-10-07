// Teste de ponta a ponta no navegador (Chromium headless).
// Uso: npm i playwright && node tests/e2e.js   (CHROMIUM_PATH opcional)
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const URL = "file://" + path.join(root, "index.html");
const src = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const MAP = eval(src.match(/const MAP = (\[[\s\S]*?\]);/)[1]);
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

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "OK   " : "FAIL ") + msg); if (!cond) failed++; };
const only = process.argv[2]; // opcional: roda só as seções cujo título contém este texto
async function section(title, fn) {
  if (only && !title.includes(only)) return;
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
  async function fresh(page, { name = "Totó", keepSave = false, runs = [], query = "" } = {}) {
    await page.goto(URL + query);
    await page.evaluate(([name, keep, runs]) => {
      sessionStorage.setItem("keepSave", keep ? "1" : "");
      localStorage.clear();
      const st = Records.createStore(localStorage);
      for (const r of runs) { st.setPlayer(r.name); st.addRun({ level: r.level || 1, timeMs: r.timeMs, points: r.points ?? 500 + Records.timeBonus(r.timeMs) }); }
      if (name) st.setPlayer(name);
    }, [name, keepSave, runs]);
    await page.reload();
    await page.evaluate(PAGE_HELPERS);
  }
  const play = async (page, opts) => { await fresh(page, opts); await page.click("#btn-start"); };
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const tileOfPlayer = (page) => ev(page, () => [Math.floor((__game.player.x + 12) / 32), Math.floor((__game.player.y + 12) / 32)]);
  // o placar é atualizado no próximo quadro de animação: espera o valor esperado em vez de ler na hora
  const hudIs = (page, sel, text) => page.waitForFunction(([sel, text]) => document.querySelector(sel).textContent === text, [sel, text], { timeout: 2000 }).then(() => true, () => false);
  const lostHearts = (page, n) => page.waitForFunction((n) => document.querySelectorAll("#hud-lives .heart.lost").length === n, n, { timeout: 2000 }).then(() => true, () => false);
  const itemTiles = (page) => ev(page, () => __game.items.map((i) => [(i.x - 8) / 32, (i.y - 8) / 32, i.taken]));

  const page = await newPage();
  const dogStart = find("P")[0], exit = find("E")[0], vetStarts = find("V");

  // =====================================================================
  await section("mapa", async () => {
    ok(find("I").length === 0, "o mapa não tem rações fixas (elas são sorteadas)");
    ok(vetStarts.length === 1, "Fase 1 tem exatamente 1 veterinário");
    const d = distances(dogStart);
    ok(d.size > 250 && [...find("E"), ...vetStarts].every((t) => d.has(t + "")), "todo o chão é alcançável a partir do cachorro, incluindo saída e veterinário");
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

    await page.click("#btn-howto");
    const how = await page.textContent("#howto");
    ok(/3 vidas/.test(how) && /celular|tablet/i.test(how) && /Salvar/.test(how), "Como jogar explica vidas, toque e salvamento");
    ok(/bônus de tempo/i.test(how) && /20 segundos = 100/.test(how) && /até 30 s = 90/.test(how) && /10 a cada 10 s/.test(how) && /maior/.test(how) && /não soma/.test(how) && /Fases diferentes se somam/.test(how), "Como jogar explica o bônus de tempo (100 até 20 s, −10 a cada 10 s), que vale a maior pontuação da fase e que fases diferentes somam");
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
  await section("rações em lugares aleatórios", async () => {
    await play(page);
    const layouts = await ev(page, () => { const out = []; for (let i = 0; i < 80; i++) { __game.start(); out.push(__game.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32])); } return out; });
    const d = distances(dogStart), dv = vetStarts[0], ex = new Set(find("E").map(String));
    let bad = "";
    for (const L of layouts) {
      if (L.length !== 5) bad = "quantidade";
      if (new Set(L.map(String)).size !== 5) bad = "tiles repetidos";
      for (const [c, r] of L) {
        if (!free(c, r)) bad = "em parede/caixa";
        if (ex.has([c, r] + "")) bad = "na saída";
        if (!d.has([c, r] + "")) bad = "inalcançável";
        else if (d.get([c, r] + "") < 4) bad = "perto demais do início";
        if (Math.hypot(c - dv[0], r - dv[1]) < 4) bad = "perto demais do veterinário";
      }
    }
    ok(!bad, `80 sorteios: sempre 5 rações em chão livre, alcançável e longe de início/veterinário/saída ${bad && "(" + bad + ")"}`);
    const distinct = new Set(layouts.map((L) => L.map(String).sort().join("|"))).size;
    ok(distinct >= 70, `os lugares mudam a cada jogo (${distinct} disposições diferentes em 80)`);
    const lifeCounts = await ev(page, () => { const out = []; for (let i = 0; i < 60; i++) { __game.start(); const f = __game.items.map((it) => it.life); out.push([f.filter(Boolean).length, f.indexOf(true)]); } return out; });
    ok(lifeCounts.every((c) => c[0] === 1), "em todo jogo exatamente 1 das 5 rações traz a vida extra");
    ok(new Set(lifeCounts.map((c) => c[1])).size >= 3, "a ração com a vida extra muda de uma para outra a cada jogo");
    const spread = layouts.filter((L) => { let m = 99; for (const a of L) for (const b of L) if (a !== b) m = Math.min(m, Math.hypot(a[0] - b[0], a[1] - b[1])); return m >= 2; }).length;
    ok(spread === 80, "rações sempre espalhadas (nunca coladas umas nas outras)");
    // cada início novo pelos botões também sorteia de novo
    const a = JSON.stringify(await itemTiles(page));
    await ev(page, () => __game.start());
    ok(JSON.stringify(await itemTiles(page)) !== a, "reiniciar a partida muda o lugar das rações");
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
    ok(rec.gb.n === "Totó" && /Novo recorde geral/.test(await page.textContent("#win-general")), "superou o outro jogador: novo recorde geral");
    ok(rec.total === winPts && (await page.textContent("#win-total")).includes(`Pontuação total: ${winPts}`), "pontuação total = pontuação da fase");
    ok(rec.prog.completed.includes(1) && rec.prog.unlocked === 2, "progresso: Fase 1 concluída e próxima fase liberada");
    ok(await ev(page, () => !Records.createStore(localStorage).hasGame("Totó")), "terminar a fase apaga o jogo em andamento");
    await page.click("#btn-win-scores");
    const sc = await page.textContent("#scores");
    ok(/Sua melhor pontuação \(Totó\)/.test(sc) && /Recorde geral/.test(sc) && /Ranking/.test(sc) && /histórico/i.test(sc) && /★ melhor/.test(sc) && /Pontuação total/.test(sc), "Pontuações mostra melhor pontuação, recorde geral, rankings, histórico e total");
    await page.keyboard.press("Escape");
    await page.click("#btn-start");
    ok(await ev(page, () => __game.state) === "playing" && await ev(page, () => __game.collected) === 0 && await ev(page, () => __game.lives) === 3, "novo jogo depois da vitória começa do zero com 3 vidas");
  });

  // =====================================================================
  await section("pontuação: maior vale na mesma fase, fases diferentes somam, bônus de tempo", async () => {
    // Rex: 600 pontos (20 s). Totó já tem 590 (25 s).
    await play(page, { runs: [{ name: "Rex", timeMs: 20000 }, { name: "Totó", timeMs: 25000 }] });
    await ev(page, () => { __game.freezeVets = true; });
    const finishAfter = async (seconds) => { // joga `seconds` s de relógio e termina a fase teletransportando para as rações e para a saída
      await ev(page, (n) => { for (let i = 0; i < n; i++) __game.tick(0.05); for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01); }, Math.round(seconds / 0.05));
    };
    const store = () => ev(page, () => { const s = Records.createStore(localStorage); return { pb: s.personalBest("Totó", 1), gb: s.generalBest(1), total: s.totalScore("Totó"), runs: s.history("Totó", 1).length }; });

    // 1) partida mais lenta (~45 s => bônus 70 => 570): não derruba a melhor (590) e não soma
    await finishAfter(45);
    ok(await ev(page, () => __game.state) === "won", "fase concluída");
    ok(await page.textContent("#win-points") === "570" && /bônus de tempo: 70/.test(await page.textContent("#win-breakdown")), "45 s dão bônus 70: pontuação da fase 570");
    ok(/continua 590/.test(await page.textContent("#win-personal")) && /não soma/.test(await page.textContent("#win-personal")), "mensagem: a melhor pontuação continua 590 e partidas da mesma fase não somam");
    ok(/Recorde geral: 600 pontos \(Rex\)/.test(await page.textContent("#win-general")), "mostra o recorde geral de outro jogador");
    let st = await store();
    ok(st.pb.p === 590 && st.total === 590 && st.runs === 2, "guardado: melhor continua 590, total 590 (não 1160) e histórico com 2 partidas");
    ok((await page.textContent("#win-total")).trim() === "Pontuação total: 590", "tela mostra Pontuação total: 590 (sem acréscimo)");
    await page.click("#btn-win-menu");
    ok((await page.textContent("#menu-best")).includes("Sua melhor pontuação na Fase 1: 590") && (await page.textContent("#menu-progress")).includes("Pontuação total: 590"), "menu mostra a melhor pontuação e a total");

    // 2) partida rápida (~6 s => bônus 100 => 600): empata com o recorde geral, mas é mais rápida
    await page.click("#btn-start"); await ev(page, () => { __game.freezeVets = true; });
    await finishAfter(6);
    ok(await page.textContent("#win-points") === "600" && /bônus de tempo: 100/.test(await page.textContent("#win-breakdown")), "6 s dão bônus 100: pontuação da fase 600");
    ok(/Nova melhor pontuação da fase! Antes: 590/.test(await page.textContent("#win-personal")), "nova melhor pontuação pessoal (antes: 590)");
    ok(/Novo recorde geral/.test(await page.textContent("#win-general")), "600 em menos tempo supera o recorde geral de Rex");
    ok((await page.textContent("#win-total")).trim() === "Pontuação total: 600 (+10)", "total passa de 590 para 600 (+10), não para 1190");
    st = await store();
    ok(st.pb.p === 600 && st.total === 600 && st.runs === 3 && st.gb.n === "Totó", "guardado: melhor 600, total 600, recorde geral de Totó");

    // 3) repetir 600 não soma
    await page.click("#btn-again"); await ev(page, () => { __game.freezeVets = true; });
    await finishAfter(8);
    ok(await page.textContent("#win-points") === "600", "outra partida de 600");
    st = await store();
    ok(st.total === 600 && st.runs === 4, "repetir 600 NÃO soma: total continua 600 (não 1200)");
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

    // 5) fases diferentes somam (dados de outra fase no mesmo navegador)
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
    ok(await catchNow() === 2, "veterinário captura: perde 1 vida (3 → 2)");
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
    ok(cfg.chaseSpeed < 180 * 0.6 && cfg.speed <= 50, "veterinário é mais lento que o cachorro (nos dois modos)");
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
    ok(patrol.maxSpeed <= cfg.speed + 1, `velocidade de patrulha respeitada (${patrol.maxSpeed.toFixed(1)} px/s)`);
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
    ok(stay.chaseSpeedMax > stay.cfg.speed * 1.8 && stay.chaseSpeedMax <= stay.cfg.chaseSpeed + 1, `durante a perseguição o veterinário anda mais rápido (${stay.chaseSpeedMax.toFixed(0)} px/s)`);
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
    await ns.context().close();
  });

  // =====================================================================
  await section("derrota e Esc", async () => {
    await play(page);
    await ev(page, () => { for (let k = 0; k < 3; k++) { for (let i = 0; i < 45; i++) __game.tick(0.05); const v = __game.vets[0], p = __game.player; v.cx = p.x + 12; v.cy = p.y + 12; v.cool = 99; __game.tick(0.01); } });
    ok(await page.isVisible("#lose") && /Acabaram as suas vidas/.test(await page.textContent("#lose")), "tela de fim de jogo explica que as vidas acabaram");
    await page.keyboard.press("Escape");
    ok(await ev(page, () => __game.state) === "menu", "Esc na tela final volta ao menu");
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
  await section("tela de pontuações e jogadores", async () => {
    await fresh(page, { name: "Totó", runs: [{ name: "Rex", timeMs: 20000 }, { name: "Mel", timeMs: 18000 }, { name: "Totó", timeMs: 25000 }, { name: "Totó", timeMs: 22000 }] });
    await page.click("#btn-scores");
    const txt = await page.textContent("#scores-body");
    ok(/Pontuação total[\s\S]*590 pontos/.test(txt), "mostra a pontuação total do jogador (590: a melhor da fase, não 1180)");
    ok(/Sua melhor pontuação \(Totó\)\s*590 pts · 22,0 s/.test(txt) && /Recorde geral\s*600 pts — Mel \(18,0 s\)/.test(txt), "mostra a melhor pontuação pessoal e o recorde geral com quem fez e o tempo");
    const rank = await page.$$eval("#scores-body ol", (ols) => ols.map((ol) => [...ol.querySelectorAll("li")].map((x) => x.textContent)));
    ok(rank[0].join("|") === "Mel — 600 pontos|Rex — 600 pontos|Totó — 590 pontos", "ranking geral por pontuação total (empate decidido por quem é mais rápido)");
    ok(rank[1].join("|") === "Mel — 600 pts (18,0 s)|Rex — 600 pts (20,0 s)|Totó — 590 pts (22,0 s)", "ranking da fase por pontuação (tempo desempata)");
    ok((await page.$$eval("#scores-body ul li", (l) => l.map((x) => x.textContent))).length === 2, "histórico lista as partidas do jogador");
    ok(/★ melhor/.test(await page.textContent("#scores-body ul")), "histórico marca a melhor partida");
    ok(/Em cada fase vale a sua maior pontuação/.test(await page.textContent("#scores")), "explica que vale a maior pontuação e que fases diferentes somam");
    await ev(page, () => Records.createStore(localStorage).setPlayer("Bidu")); await page.reload();
    await page.click("#btn-scores");
    ok(/ainda não terminou/i.test(await page.textContent("#scores-body")), "jogador novo vê uma mensagem amigável no histórico");
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
    ok((await stored()).includes('"accounts"'), "a conta continua existindo");

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
    ok(/Escolha um nome de usuário/.test(await page.textContent("#scores-body")), "sem entrar, a tela de pontuações não mostra o histórico de ninguém");
    await page.keyboard.press("Escape");
    await page.click("#btn-name"); await page.click("#btn-open-login"); await page.fill("#login-user", "Mel"); await page.fill("#login-pass", "Doce#2024"); await page.click("#btn-login-submit"); await idle(page, "btn-login-submit");
    await page.waitForFunction(() => !document.getElementById("menu").classList.contains("hidden"));
    ok((await page.textContent("#menu-best")).includes("Sua melhor pontuação"), "ao entrar de novo, as pontuações da conta voltam");
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
  await browser.close();
  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes passaram");
  process.exit(failed ? 1 : 0);
})();
