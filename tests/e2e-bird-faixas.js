// Seções do Passarinho (0.20.0): as FAIXAS DO PLACAR em dois pontos que o relatório do navegador apontou. Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só estas: node tests/e2e.js "Passarinho (faixas)"
//  1. a faixa dos efeitos (no alto do jogo) dizia "Escudo · Gelo · Turbo · Ímã" nos três bichinhos, mas os frutos do Passarinho são "ar frio" e "rajada": os nomes agora vêm do perfil (fxNames em js/profiles.js);
//  2. o leitor de tela (#hud-state-live, aria-live polite) dizia cada mudança de estado do passarinho (16 avisos em 4 s numa corrente de vento): agora o Passarinho não diz "normal", junta os ventos num só "no vento"
//     e só diz o estado que dura pelo menos 1 s de jogo. O Gatinho continua dizendo A SALVO, MOLHADO e OFEGANTE como sempre.
module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, errs } = T;
  const frames = (pg, n = 10) => pg.evaluate((n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

  await section("0.20.0 · Passarinho (faixas): a faixa dos efeitos usa os nomes do perfil (Fase 20 pega os 5 frutos: Escudo, Ar frio, Rajada, Ímã; Cachorrinho e Gatinho seguem com Escudo, Gelo, Turbo, Ímã)", async () => {
    const e0 = errs.length;
    const pg = await newPage({ realBird: "real", realCat: true, viewport: { width: 1000, height: 700 } });
    await fresh(pg, { name: "Totó" });
    const bar = {};
    for (const animal of ["bird", "cat", "dog"]) {
      await ev(pg, (a) => { __game.setAnimal(a); __game.autoStart = true; __game.start(20); __game.freezeVets = true; __game.noCatch = true; }, animal);
      // pega todos os itens de poder (o fruto/novelo/osso de cada tipo) de verdade, um depois do outro, no mesmo instante
      const kinds = await ev(pg, () => { const out = []; for (const it of __game.items) { if (!it.bone) continue; out.push(it.kind || "scare"); __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.001); } return out; });
      await frames(pg, 8);
      bar[animal] = await ev(pg, () => { const e = document.getElementById("fx-bar"); return { text: e.textContent, hidden: e.classList.contains("hidden") }; });
      bar[animal].kinds = [...new Set(kinds)].sort().join();
    }
    ok(bar.bird.kinds === "gold,ice,magnet,scare,turbo", `(preparo) a Fase 20 do Passarinho tem os 5 tipos de fruto (${bar.bird.kinds})`);
    ok(!bar.bird.hidden && /^Escudo \d+ s · Ar frio \d+ s · Rajada \d+ s · Ímã \d+ s$/.test(bar.bird.text), `Passarinho: a faixa dos efeitos diz os nomes dos frutos ("${bar.bird.text}")`);
    ok(!/Gelo|Turbo/.test(bar.bird.text), "e não usa mais Gelo nem Turbo no Passarinho");
    ok(!bar.cat.hidden && /^Escudo \d+ s · Gelo \d+ s · Turbo \d+ s · Ímã \d+ s$/.test(bar.cat.text), `Gatinho: a faixa dos efeitos continua "Escudo · Gelo · Turbo · Ímã" ("${bar.cat.text}")`);
    ok(!bar.dog.hidden && /^Escudo \d+ s · Gelo \d+ s · Turbo \d+ s · Ímã \d+ s$/.test(bar.dog.text), `Cachorrinho: a faixa dos efeitos continua "Escudo · Gelo · Turbo · Ímã" ("${bar.dog.text}")`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  await section("0.20.0 · Passarinho (faixas): o leitor de tela não ouve cada mudança de estado no vento (no máximo 1 ou 2 avisos num corredor de vento; nunca \"normal\" nem a direção) e o Gatinho segue dizendo A SALVO e normal", async () => {
    const e0 = errs.length;
    const pg = await newPage({ realBird: "real", realCat: true, viewport: { width: 1000, height: 700 } });
    await fresh(pg, { name: "Totó" });
    // anotador de tudo o que a região #hud-state-live passa a dizer (só os textos não vazios contam como aviso)
    const watch = () => ev(pg, () => { window.__live = []; const el = document.getElementById("hud-state-live"); window.__liveObs && window.__liveObs.disconnect(); window.__liveObs = new MutationObserver(() => window.__live.push(el.textContent)); window.__liveObs.observe(el, { childList: true, characterData: true, subtree: true }); });
    const said = () => ev(pg, () => window.__live.filter(Boolean));
    // a maior corrente de vento da Fase 8 (7 tiles) e o tile de onde ela nasce
    const prep = () => ev(pg, () => {
      __game.setAnimal("bird"); __game.autoStart = true; __game.start(8); __game.noCatch = true; __game.freezeVets = true;
      for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = []; // (nenhum item no caminho: pegar um fruto mudaria o estado)
      const lv = __game.builtOf("bird")[8], seen = new Set(); let best = null;
      for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
        const ch = lv.kinds[r][c]; if (!">^<v".includes(ch) || seen.has(r * lv.cols + c)) continue;
        const q = [[c, r]]; seen.add(r * lv.cols + c);
        for (let i = 0; i < q.length; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = q[i][0] + dc, nr = q[i][1] + dr; if (nc >= 0 && nr >= 0 && nc < lv.cols && nr < lv.rows && lv.kinds[nr][nc] === ch && !seen.has(nr * lv.cols + nc)) { seen.add(nr * lv.cols + nc); q.push([nc, nr]); } }
        if (!best || q.length > best.q.length) best = { ch, q };
      }
      const up = best.q.slice().sort((a, b) => (best.ch === ">" ? a[0] - b[0] : best.ch === "<" ? b[0] - a[0] : best.ch === "v" ? a[1] - b[1] : b[1] - a[1]))[0];
      return { ch: best.ch, n: best.q.length, up, tiles: best.q };
    });
    // 1. ir e voltar dentro da corrente (como o relatório): antes eram 16 avisos em ~4 s
    const w = await prep();
    const mid = w.tiles.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])[Math.floor(w.tiles.length / 2)];
    await ev(pg, ([c, r]) => { __game.player.x = c * 32 + 4; __game.player.y = r * 32 + 4; }, mid);
    await watch();
    const horiz = w.ch === ">" || w.ch === "<", fwd = horiz ? "d" : "s", back = horiz ? "a" : "w";
    for (let i = 0; i < 6; i++) { await pg.keyboard.down(fwd); await pg.waitForTimeout(350); await pg.keyboard.up(fwd); await pg.keyboard.down(back); await pg.waitForTimeout(350); await pg.keyboard.up(back); }
    await frames(pg, 6);
    const list = await said();
    ok(w.n >= 6 && list.length <= 2 && list.every((t) => t === "Estado do passarinho: no vento"), `ir e voltar numa corrente de ${w.n} tiles (~4 s) dá no máximo 2 avisos, todos "no vento" (deu ${list.length}: ${JSON.stringify(list)})`);
    // 2. parado dentro da corrente por mais de 1 s: UM aviso só, "no vento", sem direção; ao sair a região é limpa em silêncio (nunca "normal")
    await prep();
    await ev(pg, ([c, r]) => { __game.player.x = c * 32 + 4; __game.player.y = r * 32 + 4; }, w.up);
    await watch();
    await pg.waitForFunction(() => window.__live.some(Boolean), null, { timeout: 8000 }).catch(() => {});
    const one = await said();
    await ev(pg, () => { __game.freezeVets = true; const lv = __game.builtOf("bird")[8]; let spot = null; for (let r = 2; r < lv.rows - 2 && !spot; r++) for (let c = 2; c < lv.cols - 2 && !spot; c++) if (lv.kinds[r][c] === ".") spot = [c, r]; __game.player.x = spot[0] * 32 + 4; __game.player.y = spot[1] * 32 + 4; });
    await frames(pg, 8);
    const all = await ev(pg, () => ({ list: window.__live.slice(), now: document.getElementById("hud-state-live").textContent }));
    ok(one.length === 1 && one[0] === "Estado do passarinho: no vento" && !all.list.some((t) => /normal|contra|favor/.test(t)) && all.now === "", `parado na corrente por mais de 1 s: um aviso "no vento" (${JSON.stringify(one)}); ao sair a região fica vazia, sem "normal" nem direção (agora "${all.now}")`);
    // 3. o galho (A SALVO) ainda é dito, depois de durar 1 s, e voltar ao normal limpa a região
    await ev(pg, () => { __game.start(5); __game.noCatch = true; __game.freezeVets = true; for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = []; });
    await watch();
    await ev(pg, () => { const lv = __game.builtOf("bird")[5]; let g = null; lv.kinds.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "G" && !g) g = [c, r]; })); __game.player.x = g[0] * 32 + 4; __game.player.y = g[1] * 32 + 4; });
    await pg.waitForFunction(() => window.__live.some(Boolean), null, { timeout: 8000 }).catch(() => {});
    const perch = await said();
    ok(perch.length === 1 && perch[0] === "Estado do passarinho: a salvo", `no galho o leitor de tela diz "a salvo" uma vez, depois de 1 s (${JSON.stringify(perch)})`);
    // 4. o Gatinho não mudou: A SALVO e depois normal são ditos como sempre (a região diz "normal" quando ele desce)
    const catLevel = await ev(pg, () => { const L = Object.values(__game.builtOf("cat")).find((l) => l.kinds.some((row) => row.includes("T"))); __game.setAnimal("cat"); __game.autoStart = true; __game.start(L.id); __game.noCatch = true; __game.freezeVets = true; for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = []; return L.id; });
    await watch();
    const tile = await ev(pg, () => { const lv = __game.builtOf("cat")[__game.level]; let t = null; lv.kinds.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === "T" && !t) t = [c, r]; })); __game.player.x = t[0] * 32 + 4; __game.player.y = t[1] * 32 + 4; return t; });
    await pg.waitForFunction(() => window.__live.some(Boolean), null, { timeout: 5000 }).catch(() => {});
    const up = await said();
    await ev(pg, () => { const lv = __game.builtOf("cat")[__game.level]; let spot = null; for (let r = 2; r < lv.rows - 2 && !spot; r++) for (let c = 2; c < lv.cols - 2 && !spot; c++) if (lv.kinds[r][c] === ".") spot = [c, r]; __game.player.x = spot[0] * 32 + 4; __game.player.y = spot[1] * 32 + 4; });
    await pg.waitForFunction(() => window.__live.filter(Boolean).length >= 2, null, { timeout: 5000 }).catch(() => {});
    const catAll = await said();
    ok(up.length >= 1 && up[0] === "Estado do gatinho: a salvo" && catAll[catAll.length - 1] === "Estado do gatinho: normal", `o Gatinho segue dizendo "a salvo" ao subir (${JSON.stringify(up)}) e "normal" ao descer (${JSON.stringify(catAll)}) na Fase ${catLevel}, tile ${tile}`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });
};
