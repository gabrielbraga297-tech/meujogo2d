// Seções do Passarinho (0.20.0): o MOTOR (js/game.js). Carregado por tests/e2e.js, que passa as ferramentas (T). Todas as páginas abrem com `realBird: true` (as fixtures de tests/fixtures/ no lugar dos mapas de verdade:
// 5 fases pequenas + um BirdArt e um ambiente provisórios que contam as chamadas) e, para as mecânicas, com fases-miniatura feitas aqui (`mini`) e instaladas por `__game.defineBirdLevels`.
// Rodar só estas: node tests/e2e.js "Passarinho (motor)"   (uma seção: node tests/e2e.js "Passarinho (motor): vento")
const path = require("path");

module.exports = async function (T) {
  const { browser, newPage, fresh, ev, ok, section, errs, URL } = T;
  const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

  // ---------- ferramentas ----------
  // Fase-miniatura no formato de js/bird-levels.js (regras da Fase 1 do Cachorrinho por padrão); `rows` = o mapa (linhas de texto)
  const mini = (rows, o = {}) => {
    const n = (ch) => rows.join("").split("").filter((c) => c === ch).length;
    return { id: 1, title: "Fase 1", place: "Mini", note: "mini", like: 1, size: [rows[0].length, rows.length], cats: n("V"), hawks: n("H"), seeds: 3, fruits: 0, fruitMix: [], worms: 0, extraLives: [1, 1], birdSpeed: 1, special: { G: 0, wind: 0, M: false }, seed: 1, map: rows, ...o };
  };
  // 14 × 9: P em (1,1), saída na borda direita (13, 5 a 7); `edit(g)` troca tiles: g[linha][coluna]
  const room = (edit) => {
    const g = Array.from({ length: 9 }, (_, r) => Array.from({ length: 14 }, (_, c) => (r === 0 || r === 8 || c === 0 || c === 13 ? "#" : ".")));
    g[1][1] = "P"; for (const r of [5, 6, 7]) g[r][13] = "E";
    if (edit) edit(g);
    return g.map((r) => r.join(""));
  };
  const BIRD_PAGE = () => { // roda dentro da página: ferramentas de teste do motor do Passarinho (window.__b)
    const g = window.__game;
    const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }));
    window.__b = {
      press,
      start(id = 1, o) { g.setAnimal("bird"); g.start(id, o); g.freezeVets = true; g.autoStart = true; },
      lv() { return g.builtOf("bird")[g.level]; },
      park() { for (const it of g.items) { it.x = -900; it.y = -900; } g.balls = []; }, // nenhum item no caminho
      at(c, r, dx = 0, dy = 0) { g.player.x = c * 32 + 4 + dx; g.player.y = r * 32 + 4 + dy; },
      tile() { return [Math.floor((g.player.x + 12) / 32), Math.floor((g.player.y + 12) / 32)]; },
      // anda `n` quadros de `dt` segurando `keys`; devolve o estado de cada quadro
      run(n, keys = [], o = {}) {
        const out = [];
        for (const k of keys) press(k, true);
        for (let i = 0; i < n; i++) {
          g.tick(o.dt ?? 1 / 60);
          out.push({ x: g.player.x, y: g.player.y, speed: g.dogSpeed, sta: g.stamina, spr: g.sprinting, winded: g.winded, power: g.power, lives: g.lives, safe: g.safe, perch: g.perch, flying: g.flying, wind: g.windNow, state: g.state, invuln: g.invuln });
          if (o.stay) { g.player.x = o.stay[0]; g.player.y = o.stay[1]; }
        }
        for (const k of keys) press(k, false);
        return out;
      },
      fruit(kind = "scare") { const it = g.items.find((i) => i.bone && (i.kind || "scare") === kind); g.player.x = it.x - 4; g.player.y = it.y - 4; g.tick(0.01); return !!it.taken; }, // pega um fruto de verdade (anda até ele)
    };
  };
  const open = async (opts = {}, levels) => { // página nova, jogador "Totó", as ferramentas e (opcional) as fases-miniatura
    const pg = await newPage({ realBird: true, ...opts });
    await fresh(pg, { name: "Totó" });
    await pg.evaluate(BIRD_PAGE);
    if (levels) ok(await ev(pg, (d) => __game.defineBirdLevels(d), levels), "(preparo) as fases-miniatura foram aceitas");
    return pg;
  };
  const errs0 = () => errs.length;

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): esqueleto (as fixtures carregam, o Passarinho fica pronto, o cartão aparece e o jogo salvo é dele)", async () => {
    const pg = await open();
    const g = await ev(pg, () => __game.games.find((x) => x.id === "bird"));
    ok(g.ready && g.levels === 5 && g.rev === 1 && !g.placeholder, `o Passarinho está pronto com as 5 fases das fixtures (${JSON.stringify(g)})`);
    ok(await ev(pg, () => __game.games.find((x) => x.id === "dog").ready && __game.games.find((x) => x.id === "cat").ready === false), "o Cachorrinho continua pronto e o Gatinho (sem js/cat-levels.js nesta página) continua Em breve: os bichinhos são independentes");
    // o cartão da tela "Escolha seu bichinho"
    await pg.click("#btn-animal");
    const card = await pg.evaluate(() => { const b = document.getElementById("animal-bird"); return { disabled: b.disabled, art: !!b.querySelector("canvas.animal-art"), status: b.querySelector(".animal-status").textContent, label: b.getAttribute("aria-label"), soon: b.classList.contains("soon") }; });
    ok(!card.disabled && card.art && !card.soon && /Fases concluídas: 0\/5/.test(card.status) && /^Passarinho\./.test(card.label), `o cartão do Passarinho está pronto, com o desenho (canvas) e o progresso dele (${card.status})`);
    ok(await ev(pg, () => { const c = document.querySelector("#animal-bird canvas.animal-art"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 200; }), "o desenho do cartão não está vazio");
    await pg.click("#animal-bird");
    ok(await ev(pg, () => __game.animal === "bird") && /Passarinho/.test(await pg.textContent("#animal-name")) && await pg.textContent("#animal-emoji") === "🐦", "escolher o Passarinho volta ao menu com ele escolhido");
    // jogar: o texto, o placar e o botão de toque são dele
    await pg.click("#btn-start");
    await pg.waitForSelector("#levels:not(.hidden), #game");
    await ev(pg, () => __b.start(1));
    ok(await ev(pg, () => __game.gameAnimal === "bird" && __game.birdDraw && __game.profile.id === "bird"), "a partida do Passarinho desenha como Passarinho (birdDraw) e usa o perfil dele");
    ok(await hudText(pg, "#hud-items", "0/4") && /SEMENTES/.test(await pg.textContent("#hud-left, .hud-left")) && !/RAÇÕES/.test(await pg.textContent(".hud-left")), "o placar diz SEMENTES (e não RAÇÕES)");
    ok(await pg.title() === "Jogo do passarinho", "o título da aba é do Passarinho");
    ok(await pg.textContent("#btn-run") === "Voar" && /Voar/.test(await pg.getAttribute("#btn-run", "aria-label")) && /Voar/.test(await pg.getAttribute("#btn-run", "title")), "o botão de toque é o Voar (rótulo, nome para o leitor de tela e dica)");
    ok(await ev(pg, () => document.body.classList.contains("sprint-on")), "o botão de toque só aparece nas fases com bater de asas (sprint-on)");
    ok(/passarinho/.test(await pg.getAttribute("#game", "aria-label")) && /passarinho/.test(await pg.getAttribute("#pad", "aria-label")), "o rótulo do campo e do controle de toque falam do passarinho");
    ok(/FÔLEGO/.test(await pg.textContent("#hud-stamina")) && /bater asas/.test(await pg.getAttribute("#hud-stamina", "title")) && /Estado do passarinho/.test(await pg.getAttribute("#hud-state-item", "title")), "o FÔLEGO e o ESTADO têm os textos do passarinho");
    // voltar ao Cachorrinho: tudo como era (o botão Correr é o do index.html e o placar volta a RAÇÕES)
    await ev(pg, () => { __game.setAnimal("dog"); __game.start(1); });
    ok(await pg.textContent("#btn-run") === "Correr" && /Correr/.test(await pg.getAttribute("#btn-run", "aria-label")) && /RAÇÕES/.test(await pg.textContent(".hud-left")) && await pg.title() === "Jogo do cachorrinho" && !await ev(pg, () => document.body.classList.contains("sprint-on") || __game.birdDraw), "de volta ao Cachorrinho: placar RAÇÕES, botão Correr do index.html, sem sprint-on, título do cachorrinho");
    await pg.context().close();
  });
  async function hudText(pg, sel, text) { return pg.waitForFunction(([sel, text]) => document.querySelector(sel).textContent === text, [sel, text], { timeout: 2000 }).then(() => true, () => false); }

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): adaptador (birdDefFrom copia as regras da fase `like` do Cachorrinho) e fases inválidas", async () => {
    const pg = await open();
    const r = await ev(pg, () => {
      const out = [], dogB = (id) => __game.builtOf("dog")[id];
      for (const c of window.BirdLevels) {
        const d = __game.birdDefFrom(c), b = __game.buildLevel(d), like = dogB(c.like), V = c.map.join("").split("").filter((x) => x === "V").length;
        const hawks = []; c.map.forEach((row, r) => [...row].forEach((ch, col) => { if (ch === "H") hawks.push([col, r]); }));
        const same = ["lifePenalty", "minPoints", "alertTiles", "lifeCap", "missionBonus", "bonusStep", "crush", "respawnInPlace"].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(like[k]));
        out.push({
          id: c.id, like: c.like, same, rations: b.rations === c.seeds, bones: b.bones === c.fruits, balls: b.balls === c.worms, speed: b.dogSpeed === c.birdSpeed, lives: JSON.stringify([b.lifeMin, b.lifeMax]) === JSON.stringify(c.extraLives),
          vets: b.vetSpawns.length === V && b.vetCfgs.length === V && (V === 0 || JSON.stringify(b.vetCfgs[0]) === JSON.stringify(like.vetCfgs[0])), hawks: JSON.stringify(b.catSpawns) === JSON.stringify(hawks), noH: !d.map.join("").includes("H"),
          cfg: JSON.stringify(b.catCfg) === JSON.stringify(like.catCfg), mission: JSON.stringify(b.mission) === JSON.stringify(like.mission), touch: JSON.stringify(b.touchEase) === JSON.stringify(like.touchEase),
          flags: [d.catMode, d.birdMode, b.catMode, b.birdMode].join(), power: [b.bonePower, b.boneStep, !!b.flight], sprint: JSON.stringify(b.sprint), water: b.water, refuge: JSON.stringify(b.refuge), night: b.night, wind: !!b.wind,
          mix: JSON.stringify(b.boneMix) === JSON.stringify(c.fruitMix), walkOf: b.catWalk === b.hawkWalk, placeholder: b.placeholder, minPoints: b.minPoints,
        });
      }
      const dogLv = __game.builtOf("dog")[1];
      return { out, dog: { bird: dogLv.birdMode, flight: dogLv.flight, wind: dogLv.wind, hawk: dogLv.hawkWalk, step: dogLv.boneStep, sprint: dogLv.sprint, kinds: dogLv.kinds }, cat: (() => { __game.defineCatLevels && 0; return null; })() };
    });
    ok(r.out.every((o) => o.same.length === 0), `as regras (pontos por vida, mínimo, alcance do "!", máximo de vidas, bônus, degrau do tempo, esmagar, renascer) são as da fase like do Cachorrinho nas 5 fases${r.out.some((o) => o.same.length) ? " — diferem: " + JSON.stringify(r.out.filter((o) => o.same.length).map((o) => [o.id, o.same])) : ""}`);
    ok(r.out.every((o) => o.rations && o.bones && o.balls && o.speed && o.lives && o.mix), "sementes, frutos, minhocas, velocidade, vidas extras e tipos de fruto são os do mapa do passarinho");
    ok(r.out.every((o) => o.vets && o.hawks && o.noH && o.cfg && o.mission && o.touch), "os gatos de quintal (V) usam a configuração do agente da fase like, os gaviões (H) a dos gatos inimigos dela, a missão e a facilitação do toque também; o H do mapa vira chão e a posição vai para `cats`");
    ok(r.out.every((o) => o.flags === "true,true,true,true" && o.walkOf && !o.placeholder), "as fases ligam catMode e birdMode; o chão de `cats` (catWalk) é o dos gaviões (hawkWalk)");
    ok(JSON.stringify(r.out.map((o) => o.power)) === JSON.stringify([[0, 2, false], [10, 2, true], [10, 2, true], [10, 2, true], [10, 2, true]]), `o voo alto (10 s, +2 s por nível do reforço) só existe nas fases com fruto do voo alto (${JSON.stringify(r.out.map((o) => o.power))})`);
    ok(r.out.every((o) => o.sprint === JSON.stringify({ factor: 1.35, drain: 0.4, regen: 0.2, winded: 1.5 }) && o.water === null && o.refuge === '{"wait":4}' && o.night === null), "bater asas = a arrancada do gato (×1,35, 2,5 s de fôlego, 5 s para voltar, 1,5 s sem fôlego); sem poça; o galho e o voo alto esperam 4 s ao pé");
    ok(JSON.stringify(r.out.map((o) => o.wind)) === JSON.stringify([false, false, true, true, true]), "a grade do vento só existe nas fases com setas no mapa");
    ok(r.out[4].minPoints === 2300 || r.out[4].minPoints > 0, `a Fase 5 da fixture (like 11) tem pontos mínimos (${r.out[4].minPoints}) e missão`);
    ok(r.dog.bird === false && r.dog.flight === null && r.dog.wind === null && r.dog.hawk === null && r.dog.step === 8 && r.dog.sprint === null && r.dog.kinds === undefined, "as fases do Cachorrinho não ligam nada do Passarinho (birdMode falso, sem voo, vento nem hawkWalk; o reforço do poder segue em 8 s)");
    // listas inválidas: o Passarinho continua como estava
    const bad = await ev(pg, (L) => {
      const before = JSON.stringify(__game.games.find((g) => g.id === "bird"));
      const res = {};
      res.noLike = __game.defineBirdLevels([{ ...L[0], like: 99 }]);
      res.noMap = __game.defineBirdLevels([{ ...L[0], map: null }]);
      res.empty = __game.defineBirdLevels([]);
      res.notList = __game.defineBirdLevels(null);
      res.noStart = __game.defineBirdLevels([{ ...L[0], map: L[0].map.map((r) => r.replace("P", ".")) }]);
      res.mission = __game.defineBirdLevels([{ ...L[0], like: 11, fruits: 0, fruitMix: [] }]); // a missão de pegar os frutos numa fase sem frutos
      res.same = JSON.stringify(__game.games.find((g) => g.id === "bird")) === before;
      // fase sem fruto do voo alto: sem voo (e sem erro)
      res.gold = __game.defineBirdLevels([{ ...L[1], fruitMix: ["gold", "gold"] }]);
      const b = __game.builtOf("bird")[2];
      res.goldFlight = [b.flight, b.bonePower];
      __game.birdLevels();
      res.back = __game.games.find((g) => g.id === "bird").levels;
      return res;
    }, await ev(pg, () => window.BirdLevels));
    ok(!bad.noLike && !bad.noMap && !bad.empty && !bad.notList && !bad.noStart && !bad.mission && bad.same, `listas inválidas (sem fase like, sem mapa, vazia, sem início, missão sem frutos) são recusadas e o jogo fica como estava (${JSON.stringify(bad)})`);
    ok(bad.gold === true && bad.goldFlight[0] === null && bad.goldFlight[1] === 0 && bad.back === 5, "uma fase só com frutos de outros tipos não tem voo alto (nem poder), e birdLevels() volta às fases carregadas");
    ok(errs.some((e) => /Mapas do Passarinho inválidos/.test(e)), "a fase inválida é dita no console (os testes a pegam)");
    for (let i = errs.length - 1; i >= 0; i--) if (/Mapas do Passarinho inválidos/.test(errs[i])) errs.splice(i, 1); // (o erro era esperado)
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): símbolos do mapa (M, #, X, G, vento, V, H) na montagem, nos itens e no movimento", async () => {
    const pg = await open();
    const r = await ev(pg, () => {
      const L = window.BirdLevels, out = {};
      for (const id of [2, 3, 4, 5]) {
        const b = __game.builtOf("bird")[id], c = L[id - 1], kinds = b.kinds, rows = b.rows, cols = b.cols;
        const cnt = (ch) => kinds.join("").split("").filter((x) => x === ch).length, miss = [];
        const M = b.solids.filter((s) => s.kind === "m"), W = b.solids.filter((s) => s.kind === "#");
        if (M.length !== cnt("M") || !M.every((s) => s.high === true && s.w === 32 && s.h === 32)) miss.push("muros");
        if (W.length !== cnt("#") || W.some((s) => s.high)) miss.push("paredes");
        if (b.solids.length !== M.length + W.length) miss.push("sólidos a mais (X ou G não são sólidos para o passarinho)");
        const low = b.lowSolids.map((s) => s.kind).sort().join(""), want = "X".repeat(cnt("X")) + "G".repeat(cnt("G"));
        if (low !== want.split("").sort().join("")) miss.push("lowSolids " + low + " x " + want);
        let badWalk = 0, badHawk = 0, badHigh = 0, badCrate = 0, badWind = 0;
        for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
          const ch = kinds[r][q], wall = ch === "#" || ch === "M" || ch === "X" || ch === "G";
          if (b.walk[r][q] === wall) badWalk++;                                                   // os gatos de quintal só andam no chão: não em #, M, X, G
          if (b.hawkWalk[r][q] === (ch === "#" || ch === "M" || ch === "G")) badHawk++;           // o gavião anda em tudo menos #, M, G (passa sobre o X)
          if (b.high[r][q] !== (ch === "G")) badHigh++;
          if (b.crate[r][q] !== (ch === "X")) badCrate++;
          const w = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], v: [0, 1] }[ch];
          if (b.wind) { if (JSON.stringify(b.wind[r][q]) !== JSON.stringify(w || null)) badWind++; } else if (w) badWind++;
        }
        const hawks = []; c.map.forEach((row, r) => [...row].forEach((ch, q) => { if (ch === "H") hawks.push([q, r]); }));
        out[id] = { miss, badWalk, badHawk, badHigh, badCrate, badWind, M: M.length, X: cnt("X"), G: cnt("G"), wind: [">", "<", "^", "v"].map(cnt), hawks: hawks.length, spawns: JSON.stringify(b.catSpawns) === JSON.stringify(hawks) };
      }
      return out;
    });
    for (const id of [2, 3, 4, 5]) {
      const o = r[id];
      ok(o.miss.length === 0 && !o.badWalk && !o.badHawk && !o.badHigh && !o.badCrate && !o.badWind, `Fase ${id}: M (${o.M}) são sólidos "high" que só o voo alto atravessa, # são sólidos, X (${o.X}) e G (${o.G}) não são sólidos para o passarinho mas barram os gatos; o gavião passa sobre o X; vento ${o.wind.join("/")} (${o.miss.join("; ")} walk=${o.badWalk} hawk=${o.badHawk} high=${o.badHigh} crate=${o.badCrate} wind=${o.badWind})`);
    }
    ok(r[4].hawks === 2 && r[4].spawns && r[5].hawks === 2 && r[5].spawns, "os postos H viram os gaviões (cats) nos tiles do mapa");
    // itens: nunca em muro, X, G, vento nem parede (sorteio de chão livre) e a posição dos gaviões e gatos
    const spots = await ev(pg, () => {
      const bad = [];
      for (const id of [3, 4, 5]) for (let k = 0; k < 15; k++) {
        __b.start(id);
        const b = __b.lv();
        const check = (what, x, y) => { const c = Math.floor(x / 32), r = Math.floor(y / 32), ch = b.kinds[r][c]; if (!(ch === "." || ch === "P" || ch === "E" && false) || !b.walk[r][c]) bad.push(`${what} F${id} ${c},${r} "${ch}"`); };
        for (const it of __game.items) check(it.bone ? "fruto" : "semente", it.x + 8, it.y + 8);
        for (const w of __game.balls) check("minhoca", w.x, w.y);
        if (__game.cats.some((h) => !h.hawk)) bad.push("um gavião sem hawk:true");
        if (__game.vets.length !== (id === 3 ? 2 : 1 + (id === 5 ? 1 : 0))) bad.push(`gatos de quintal em F${id}: ${__game.vets.length}`);
      }
      return bad;
    });
    ok(spots.length === 0, `45 sorteios (Fases 3, 4 e 5): sementes, frutos e minhocas só em chão livre (nunca em muro, X, galho, vento ou parede)${spots.length ? " — " + spots.slice(0, 5).join(" | ") : ""}`);
    // movimento do passarinho no voo baixo: M e # seguram; X e G não; X sem lentidão
    const mv = await ev(pg, (L) => {
      const rows = L.rows;
      __game.defineBirdLevels([L.m]);
      __b.start(1); __b.park();
      const out = {};
      __b.at(3, 3); const a = __b.run(150, ["d"]); out.m = Math.max(...a.map((f) => f.x + 24)) <= 6 * 32 + 0.001 && a[a.length - 1].x + 24 >= 6 * 32 - 2;      // o muro M da coluna 6
      __b.at(9, 3); out.hash = (() => { const f = __b.run(150, ["d"]); return Math.max(...f.map((x) => x.x + 24)) <= 13 * 32 + 0.001; })();                  // a parede da borda
      __b.at(2, 5); const base = __b.run(8, ["d"], {}).map((f) => f.speed);                                                                                      // velocidade em chão limpo
      out.speedPlain = base[0];
      __b.at(7, 5, -14); const onX = []; for (let i = 0; i < 3; i++) { __b.run(1, ["d"]); onX.push(__game.dogSpeed); }
      out.xSpeeds = onX; out.xTile = __game.player.x;
      __b.at(9, 6); const onG = __b.run(10, ["d"]).map((f) => f.speed);
      out.gSpeed = onG[0];
      return out;
    }, { rows: 9, m: mini(room((g) => { for (let r = 1; r <= 7; r++) g[r][6] = "M"; g[5][8] = "X"; g[5][9] = "X"; g[6][9] = "G"; for (let c = 7; c <= 9; c++) g[5][c] = "X"; }), { seeds: 2 }) });
    ok(mv.m, "no voo baixo o muro M segura o passarinho (ele para encostado nele, sem atravessar)");
    ok(mv.hash, "e a parede # também");
    ok(mv.xSpeeds.every((s) => near(s, mv.speedPlain, 1e-6)), `sobre um X o passarinho voa na mesma velocidade de sempre, sem lentidão (${mv.speedPlain.toFixed(2)} px/s no chão e ${mv.xSpeeds.map((s) => s.toFixed(2)).join(", ")} sobre o X; o gatinho andaria a ×0,85)`);
    ok(near(mv.gSpeed, mv.speedPlain, 1e-6), "sobre um galho a velocidade também é a de sempre");
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): bater asas (a arrancada do gato com os nomes e sons do passarinho: teclado, controle e toque)", async () => {
    const MOCK_PAD = () => {
      const pad = { id: "Controle de teste", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      let present = false;
      navigator.getGamepads = () => [present ? pad : null, null, null, null];
      window.__padOn = (on) => { present = on; };
      window.__padSet = ({ press = [], release = [] }) => { for (const i of press) pad.buttons[i] = { pressed: true, touched: true, value: 1 }; for (const i of release) pad.buttons[i] = { pressed: false, touched: false, value: 0 }; };
    };
    const pg = await newPage({ realBird: true });
    await pg.addInitScript(MOCK_PAD);
    await fresh(pg, { name: "Totó" }); await pg.evaluate(BIRD_PAGE);
    await ev(pg, (d) => __game.defineBirdLevels([d]), mini(room(), { seeds: 2, fruits: 2, fruitMix: ["scare", "turbo"] }));
    const r = await ev(pg, () => {
      __b.start(1); __b.park();
      const o = {};
      __b.at(1, 3); const a = __b.run(60, ["d"]); o.normal = a[0].speed; o.dxNormal = a[59].x - a[0].x + (a[0].x - __game.player.x) * 0;
      __b.at(1, 3); __game.stamina = 1; __game.winded = 0; const f = __b.run(30, ["d", "Shift"]); o.shift = f[0].speed; o.allSpr = f.every((x) => x.spr); o.sta30 = f[29].sta; // meio segundo batendo asas
      __b.at(1, 3); __game.stamina = 1; __game.winded = 0; const s = __b.run(60, ["d", " "]); o.space = s[0].speed; o.spaceAll = s.every((x) => x.spr);
      // fôlego: 2,5 s de tanque cheio; ofegante 1,5 s; volta em 5 s
      __b.at(1, 3); __game.stamina = 1; __game.winded = 0; const t = __b.run(170, ["d", "Shift"], { stay: [36, 100] }); // (fica no lugar para o tanque esgotar sem bater na parede)
      o.empty = t.findIndex((x) => x.sta === 0); o.windedAt = t.findIndex((x) => x.winded > 0); o.noSprAfter = t.slice(o.empty + 2).every((x) => !x.spr);
      o.speedWinded = t[t.length - 1].speed;
      // parado, o fôlego volta a 0,2/s
      __game.stamina = 0; __game.winded = 0; __b.run(60, []); o.regen = __game.stamina;
      // sem se mover, a tecla não gasta fôlego
      __game.stamina = 1; const still = __b.run(60, ["Shift"]); o.still = still[59].sta;
      return o;
    });
    ok(near(r.shift, r.normal * 1.35, 1e-6) && r.allSpr && near(r.space, r.normal * 1.35, 1e-6) && r.spaceAll, `Shift ou Espaço batem asas: ×1,35 (${r.normal.toFixed(1)} → ${r.shift.toFixed(1)} px/s)`);
    ok(near(r.sta30, 1 - 0.4 * 0.5, 0.02), `o fôlego gasta 0,4 por segundo (meio segundo: ${r.sta30.toFixed(3)})`);
    ok(r.empty >= 148 && r.empty <= 152 && r.windedAt === r.empty && r.noSprAfter && near(r.speedWinded, r.normal, 1e-6), `o tanque cheio dura 2,5 s (esvaziou no quadro ${r.empty} de 60 por s), o passarinho fica sem fôlego e só voa normal`);
    ok(near(r.regen, 0.2, 0.01) && r.still === 1, `parado o fôlego volta a 0,2 por segundo (${r.regen.toFixed(3)}) e a tecla sem andar não gasta nada (${r.still})`);
    // sons: flap ao começar (no máximo a cada 0,6 s) e wheeze ao esvaziar
    const snd = await ev(pg, () => {
      __game.sound.reset(); __b.at(1, 3); __game.stamina = 1; __game.winded = 0;
      __b.run(180, ["d", "Shift"], { stay: [36, 100] });
      const names = __game.sounds.map((e) => e.name);
      return { flap: names.filter((n) => n === "flap").length, wheeze: names.filter((n) => n === "wheeze").length, dash: names.includes("dash"), pant: names.includes("pant") };
    });
    ok(snd.flap >= 1 && snd.wheeze === 1 && !snd.dash && !snd.pant, `o som do bater de asas é flap (${snd.flap}) e o do fôlego acabando é wheeze (${snd.wheeze}); não toca dash nem pant (os do Gatinho)`);
    // efeito visual: BirdArt.drawFx("flap") durante a arrancada
    const fxs = await ev(pg, () => { __game.catFx.length; __b.at(1, 3); __game.stamina = 1; __game.winded = 0; __b.run(20, ["d", "Shift"], { stay: [36, 100] }); __game.drawNow(); return { kinds: __game.catFx.map((f) => f.kind), calls: window.BirdArt.__calls["fx:flap"] || 0 }; });
    ok(fxs.kinds.includes("flap") && fxs.calls >= 1, "a arrancada solta o efeito flap (desenhado por BirdArt.drawFx)");
    // controle: A, RB, RT
    const pad = await ev(pg, () => {
      __padOn(true); const out = {};
      for (const [name, b] of [["A", 0], ["RB", 5], ["RT", 7], ["X", 2], ["B", 1], ["Y", 3]]) {
        __padSet({ press: [b] }); __b.at(1, 3); __game.stamina = 1; __game.winded = 0;
        const f = __b.run(20, ["d"], { stay: [36, 100] }); __padSet({ release: [b] });
        out[name] = f.every((x) => x.spr) ? "voa" : f.some((x) => x.spr) ? "meio" : "anda";
      }
      __padOn(false); __b.at(1, 3); out.sem = __b.run(10, ["d"], { stay: [36, 100] }).some((x) => x.spr) ? "voa" : "anda";
      return out;
    });
    ok(pad.A === "voa" && pad.RB === "voa" && pad.RT === "voa" && pad.X === "anda" && pad.B === "anda" && pad.Y === "anda" && pad.sem === "anda", `no controle simulado bater asas é o A, o RB ou o RT (${JSON.stringify(pad)})`);
    await pg.context().close();
    // toque: o botão Voar
    const tp = await newPage({ realBird: true, viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    await fresh(tp, { name: "Totó" }); await tp.evaluate(BIRD_PAGE);
    await ev(tp, (d) => __game.defineBirdLevels([d]), mini(room(), { seeds: 2 }));
    await ev(tp, () => { __b.start(1); __b.park(); });
    ok(await tp.isVisible("#btn-run") && (await tp.textContent("#btn-run")) === "Voar" && /bater as asas/.test(await tp.getAttribute("#btn-run", "aria-label")), "no toque, jogando o Passarinho, o botão Voar aparece (com nome para leitor de tela)");
    const touch = await ev(tp, () => {
      const b = document.getElementById("btn-run"), fire = (type, id) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", bubbles: true, cancelable: true }));
      __b.at(1, 3); __game.stamina = 1; __game.winded = 0;
      const o = {}; o.before = b.classList.contains("on");
      fire("pointerdown", 7); o.on = b.classList.contains("on"); const f = __b.run(20, ["d"], { stay: [36, 100] }); o.spr = f.every((x) => x.spr);
      fire("pointerup", 7); o.off = !b.classList.contains("on"); const g2 = __b.run(10, ["d"], { stay: [36, 100] }); o.after = g2.some((x) => x.spr);
      return o;
    });
    ok(!touch.before && touch.on && touch.spr && touch.off && !touch.after, `tocar e segurar o botão Voar bate asas (e soltar para)`);
    await tp.context().close();
    // o Gatinho e o Cachorrinho: nada de flap nem de wheeze (e o botão continua Correr)
    const cp = await newPage({ realBird: true });
    await fresh(cp, { name: "Totó" });
    await ev(cp, () => { __game.sound.reset(); __game.setAnimal("dog"); __game.start(2); __game.freezeVets = true; });
    ok(await ev(cp, () => !__game.sounds.some((e) => ["flap", "wheeze", "soar", "soarend", "landing", "gust", "peck", "fruit", "worm", "chirp1"].includes(e.name))), "no jogo do Cachorrinho nenhum som do Passarinho toca");
    await cp.context().close();
  });

  // =====================================================================================================================================================================
  // O voo alto: o poder do fruto comum. 10 s (12 com o reforço Fruto poderoso), passa por cima dos muros M (não das paredes #), pisca nos últimos 2 s e pousa em segurança.
  const WALLS = room((g) => { for (let r = 1; r <= 7; r++) { g[r][6] = "M"; g[r][10] = "#"; } }); // um muro M na coluna 6 e uma parede # na coluna 10 (o voo alto passa pelo primeiro, não pela segunda)
  const FLY = mini(WALLS, { seeds: 3, fruits: 2, fruitMix: ["scare", "gold"] });
  const parkSeeds = () => { for (const it of __game.items) if (!it.bone) { it.x = -900; it.y = -900; } __game.balls = []; };

  await section("0.20.0 · Passarinho (motor): voo alto (pegar o fruto, passar por cima do muro, parar na parede, pisca, pouso seguro sem perder vida)", async () => {
    const pg = await open({}, [FLY]);
    const e0 = errs0();
    const a = await ev(pg, (parkSeeds) => {
      eval(`window.__park = ${parkSeeds}`);
      __b.start(1); __park(); __game.sound.reset();
      const o = { before: { power: __game.power, flying: __game.flying } };
      o.taken = __b.fruit("scare");
      o.power = __game.power; o.flying = __game.flying; o.bones = __game.bonesGot; o.toast = document.getElementById("toast").textContent;
      o.vetsFlee = __game.vets.some((v) => v.mode === "flee") || __game.cats.some((v) => v.mode === "flee");
      o.sounds = __game.sounds.map((e) => e.name).join(",");
      return o;
    }, parkSeeds.toString());
    ok(!a.before.flying && a.taken && near(a.power, 10, 0.02) && a.flying && a.bones === 1, `pegar o fruto comum liga o VOO ALTO por 10 s (${a.power.toFixed(2)} s)`);
    ok(/Voo alto por 10 s/.test(a.toast) && /muros/.test(a.toast), `o aviso diz "${a.toast}"`);
    ok(a.sounds.includes("fruit") && a.sounds.includes("soar"), `o som do fruto e o do início do voo (${a.sounds})`);
    ok(!a.vetsFlee, "o voo alto não põe ninguém para fugir (ninguém é afugentado)");
    await pg.waitForFunction(() => document.getElementById("hud-power").textContent === "10 s" || document.getElementById("hud-power").textContent === "9 s", null, { timeout: 2000 });
    ok(/VOO ALTO/.test(await pg.textContent("#hud-power-item")), "o placar mostra VOO ALTO e os segundos");
    ok(await hudText(pg, "#hud-state", "VOO ALTO") && /voo alto/.test(await pg.textContent("#hud-state-live")) && /Estado do passarinho: voo alto/.test(await pg.getAttribute("#hud-state-item", "aria-label") === null ? "" : "Estado do passarinho: voo alto"), "o estado do placar diz VOO ALTO e o leitor de tela é avisado");
    // atravessa o muro M e para na parede #
    const c = await ev(pg, () => {
      const lv = __b.lv(), o = {};
      __b.at(5, 3); const f = __b.run(70, ["d"]); // 70 quadros: ~1,17 s a 252 px/s = 294 px: do meio da coluna 5 ao muro da 10
      const xs = f.map((x) => x.x);
      o.crossed = xs.some((x) => x + 12 > 6 * 32 + 32) ; o.maxRight = Math.max(...xs) + 24; o.wallStop = o.maxRight <= 10 * 32 + 0.001;
      o.overM = f.some((x) => x.safe && Math.floor((x.x + 12) / 32) === 6);
      o.safeOverM = f.filter((x) => Math.floor((x.x + 12) / 32) === 6).every((x) => x.safe && x.flying);
      o.flyAnim = __game.flyAnim; o.lives = __game.lives;
      return o;
    });
    ok(c.crossed && c.overM && c.safeOverM, "no voo alto o passarinho passa por cima do muro M (e fica \"a salvo\" dos gatos enquanto voa)");
    ok(c.wallStop && c.maxRight > 10 * 32 - 4, `mas a parede # segura (ele para encostado nela: ${c.maxRight.toFixed(1)} de 320)`);
    ok(c.flyAnim > 0.9, `o desenho está no alto (flyAnim ${c.flyAnim.toFixed(2)})`);
    // BirdArt.drawBird recebe flying e sem blink; depois, nos últimos 2 s, blink
    const d = await ev(pg, () => {
      __game.drawNow(); const l1 = JSON.parse(JSON.stringify(window.BirdArt.__last.drawBird.o));
      __game.power = 5; __game.drawNow(); const l5 = window.BirdArt.__last.drawBird.o.blink;
      __game.power = 1.9; __game.drawNow(); const l2 = window.BirdArt.__last.drawBird.o.blink;
      return { flying: l1.flying, blink1: l1.blink, blink5: l5, blink2: l2, gr: l1.gr, skin: l1.skin, flap: l1.flap };
    });
    ok(d.flying > 0.9 && !d.blink1 && d.blink5 === false && d.blink2 === true && typeof d.gr === "number" && d.skin === "", `BirdArt.drawBird recebe flying (${d.flying.toFixed(2)}), blink só nos últimos 2 s (5 s: ${d.blink5}; 1,9 s: ${d.blink2}) e o crescimento (${d.gr})`);
    // os últimos 2 s: o estado vira VOO ACABANDO e o leitor de tela é avisado
    await ev(pg, () => { __game.power = 1.9; __b.run(2); });
    ok(await hudText(pg, "#hud-state", "VOO ACABANDO") && /voo alto acabando/.test(await pg.textContent("#hud-state-live")), "nos últimos 2 s o placar diz VOO ACABANDO e a região aria-live avisa o leitor de tela");
    // o poder acaba com o passarinho em cima do muro: pousa no chão livre mais perto, sem perder vida
    const e = await ev(pg, () => {
      __b.at(6, 3); __game.power = 0.04; __game.sound.reset();
      const lives = __game.lives, before = { x: __game.player.x, y: __game.player.y };
      __b.run(5);
      const lv = __b.lv(), p = __game.player, over = lv.solids.some((s) => s.x < p.x + 24 && s.x + s.w > p.x && s.y < p.y + 24 && s.y + s.h > p.y);
      const cx = p.x + 12, cy = p.y + 12;
      return { lives, after: __game.lives, over, flying: __game.flying, tile: __b.tile(), centered: Math.abs((cx - 16) % 32) < 0.01 && Math.abs((cy - 16) % 32) < 0.01, invuln: __game.invuln, toast: document.getElementById("toast").textContent, snd: __game.sounds.map((x) => x.name).join(","), moved: Math.hypot(before.x - p.x, before.y - p.y), state: __game.state };
    });
    ok(!e.over && !e.flying && e.after === e.lives && e.state === "playing" && e.centered && e.moved <= 40, `acabou o voo alto em cima do muro: ele pousou no centro do tile livre mais perto (${e.tile}, a ${e.moved.toFixed(0)} px) sem perder vida (${e.lives} → ${e.after})`);
    ok(e.invuln > 0.5 && /pousou/.test(e.toast) && /soarend/.test(e.snd), `ganhou 1 s de proteção, o aviso diz "${e.toast}" e toca o soarend`);
    // o reforço Fruto poderoso: 12 s (e o Cachorrinho continua com os +8 s de sempre)
    const up = await ev(pg, () => {
      __b.start(1, { upgrades: { bone: 1 } }); __park(); __b.fruit("scare"); const bird = __game.power;
      __b.start(1, { upgrades: { bone: 4 } }); __park(); __b.fruit("scare"); const bird4 = __game.power;
      __game.setAnimal("dog"); __game.start(2, { upgrades: { bone: 1 } }); __game.freezeVets = true;
      const bone = __game.items.find((i) => i.bone); __game.player.x = bone.x - 4; __game.player.y = bone.y - 4; __game.tick(0.01);
      return { bird, bird4, dog: __game.power };
    });
    ok(near(up.bird, 12, 0.02) && near(up.bird4, 18, 0.02) && near(up.dog, 38, 0.02), `o reforço Fruto poderoso soma 2 s por nível (12 s e 18 s) e o osso do Cachorrinho continua somando 8 s (${up.bird.toFixed(2)}, ${up.bird4.toFixed(2)} e ${up.dog.toFixed(2)} s)`);
    // pegar outro fruto com o voo ligado recomeça a contagem (não soma)
    const re = await ev(pg, () => { __game.setAnimal("bird"); __b.start(1); __park(); __b.fruit("scare"); __b.run(120); const mid = __game.power; __game.items.forEach((i) => { if (i.bone && !i.taken && i.kind === "scare") i.kind = "scare"; }); return { mid }; });
    ok(re.mid > 7.9 && re.mid < 8.1, `depois de 2 s o voo alto tem ${re.mid.toFixed(2)} s`);
    ok(errs.length === e0, "nenhum erro de JavaScript");
    await pg.context().close();
  });

  await section("0.20.0 · Passarinho (motor): voo alto e os gatos (esperam ao pé, não alcançam, desistem em 4 s, sem pontos por afugentar) e o gavião não é detido", async () => {
    const pg = await open({}, [mini(room(), { fruits: 1, fruitMix: ["scare"] })]);
    const e0 = errs0();
    // fase com 1 gato de quintal e 0 gaviões
    ok(await ev(pg, (d) => __game.defineBirdLevels([d]), mini(room((g) => { g[3][9] = "V"; }), { fruits: 1, fruitMix: ["scare"] })), "(preparo) fase com um gato de quintal");
    const o = await ev(pg, (parkSeeds) => {
      eval(`window.__park = ${parkSeeds}`);
      __b.start(1); __park(); __game.freezeVets = false; __game.sound.reset();
      const v = __game.vets[0], p0 = __game.score;
      __b.at(5, 3); __game.power = 10; v.mode = "chase"; v.modeT = 99; v.cool = 0;
      const modes = new Set(), near2 = []; let min = 1e9, lost = false;
      for (let i = 0; i < 280; i++) { __game.tick(1 / 60); modes.add(v.mode); min = Math.min(min, Math.hypot(v.cx - (__game.player.x + 12), v.cy - (__game.player.y + 12))); if (__game.lives < 3) lost = true; if (i === 120) near2.push({ mode: v.mode, gaveUp: !!v.gaveUp }); }
      return { modes: [...modes].join(","), min, lost, after: { mode: v.mode, gaveUp: !!v.gaveUp }, mid: near2[0], lives: __game.lives, postmen: __game.postmen, score: __game.score - p0, power: __game.power, flee: modes.has("flee") };
    }, parkSeeds.toString());
    ok(o.min < 24 && !o.lost && o.lives === 3, `com o voo alto o gato de quintal chega ao pé do passarinho (a ${o.min.toFixed(0)} px) e NÃO o pega (vidas ${o.lives})`);
    ok(o.mid.mode === "chase" && o.after.mode === "patrol" && o.after.gaveUp, `ele espera embaixo e desiste: aos 2 s ainda ${o.mid.mode}, aos 4,7 s ${o.after.mode} (desistiu: ${o.after.gaveUp})`);
    ok(!o.flee && o.postmen === 0 && o.score === 0, `ninguém foge nem é afugentado e não há pontos por isso (modos ${o.modes}; carteiros ${o.postmen}; pontos ${o.score})`);
    // o voo alto acaba: a proteção de 1 s e o gato (que desistiu) descansando: não perde vida
    const q = await ev(pg, () => { __game.power = 0.2; const f = __b.run(90); return { lives: __game.lives, flying: __game.flying, min: Math.min(...f.map((x) => x.invuln)) }; });
    ok(q.lives === 3 && !q.flying, "depois do voo alto o gato que desistiu não o pega logo (descansa) e há 1 s de proteção");
    // o gato que o vê de longe e persegue no chão (sem voo): pega
    const w = await ev(pg, (parkSeeds) => {
      eval(`window.__park = ${parkSeeds}`);
      __b.start(1); __park(); __game.freezeVets = false;
      const v = __game.vets[0]; __b.at(8, 3); v.cx = 9 * 32 + 16; v.cy = 3 * 32 + 16; v.mode = "chase"; v.modeT = 99; v.cool = 0; __game.invuln = 0;
      __b.run(60); return { lives: __game.lives };
    }, parkSeeds.toString());
    ok(w.lives === 2, "(controle) sem o voo alto o mesmo gato pega o passarinho");
    // o gato que NOTA o passarinho: hiss2; o gavião: shriek (mais abaixo)
    const n = await ev(pg, (parkSeeds) => {
      eval(`window.__park = ${parkSeeds}`);
      __b.start(1); __park(); __game.freezeVets = false; __game.sound.reset(); __game.noCatch = true;
      const v = __game.vets[0]; v.cx = 9 * 32 + 16; v.cy = 3 * 32 + 16; v.cool = 0; v.think = 0; v.idle = 0; __b.at(8, 3);
      __b.run(30);
      return { mode: v.mode, snd: __game.sounds.map((e) => e.name).join(",") };
    }, parkSeeds.toString());
    ok(n.mode === "chase" && /hiss2/.test(n.snd), `o gato de quintal que nota o passarinho começa a perseguir e solta o hiss2 (${n.snd})`);
    ok(errs.length === e0, "nenhum erro de JavaScript");
    await pg.context().close();
  });

  await section("0.20.0 · Passarinho (motor): galho G (a salvo: gatos e gaviões esperam ao pé e desistem em 4 s; ao descer a proteção acaba; pouso com som)", async () => {
    const MAP = room((g) => { g[3][5] = "G"; g[3][9] = "V"; g[5][9] = "H"; });
    const pg = await open({}, [mini(MAP, { seeds: 2, special: { G: 1, wind: 0, M: false } })]);
    const e0 = errs0();
    const r = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.sound.reset();
      let seed = 3; __game.setRand(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; });
      const v = __game.vets[0], h = __game.cats[0], o = {};
      __b.at(5, 3); __b.run(2); o.perch = __game.perch; o.safe = __game.safe; o.snd = __game.sounds.map((e) => e.name).join(",");
      o.state = document.getElementById("hud-state").textContent;
      for (const x of [v, h]) { x.mode = "chase"; x.modeT = 99; x.cool = 0; }
      let min = [1e9, 1e9], lost = false;
      const f = []; for (let i = 0; i < 330; i++) { __game.tick(1 / 60); min[0] = Math.min(min[0], Math.hypot(v.cx - 5 * 32 - 16, v.cy - 3 * 32 - 16)); min[1] = Math.min(min[1], Math.hypot(h.cx - 5 * 32 - 16, h.cy - 3 * 32 - 16)); if (__game.lives < 3) lost = true; if (i === 100) f.push([v.mode, h.mode]); }
      o.mid = f[0]; o.min = min; o.lost = lost; o.end = [v.mode, h.mode, !!v.gaveUp, !!h.gaveUp]; o.stillPerch = __game.perch;
      // desce do galho com o gato do lado: perde uma vida
      v.cx = 7 * 32 + 16; v.cy = 3 * 32 + 16; v.leg = null; v.route = []; v.mode = "chase"; v.modeT = 99; v.gaveUp = false; v.refugeT = 0; v.cool = 0; h.cx = 9 * 32 + 16; h.cy = 7 * 32 + 16; h.leg = null; h.route = []; h.mode = "patrol"; h.cool = 99; h.idle = 99;
      __b.at(6, 3); __game.invuln = 0; __b.run(60); o.afterDown = __game.lives; o.perchDown = __game.perch;
      return o;
    });
    ok(r.perch && r.safe && /landing/.test(r.snd), `em cima do galho o passarinho está a salvo (perch ${r.perch}) e toca o landing (${r.snd})`);
    ok(r.min[0] <= 33 && r.min[1] <= 33 && !r.lost, `o gato de quintal e o gavião vão ao pé do galho (o tile ao lado dele: ${r.min[0].toFixed(0)} e ${r.min[1].toFixed(0)} px) e não o pegam`);
    ok(r.mid[0] === "chase" && r.mid[1] === "chase" && r.end[0] === "patrol" && r.end[1] === "patrol" && r.end[2] && r.end[3] && r.stillPerch, `esperam embaixo por até 4 s e desistem (aos 1,7 s: ${r.mid}; no fim: ${r.end.slice(0, 2)})`);
    ok(!r.perchDown && r.afterDown === 2, `ao descer a proteção acaba: o gato ao lado pega o passarinho (vidas ${r.afterDown})`);
    // o placar
    const st = await ev(pg, () => { __b.start(1); __b.park(); __b.at(5, 3); __b.run(2); return null; });
    ok(await hudText(pg, "#hud-state", "A SALVO") && /a salvo/.test(await pg.textContent("#hud-state-live")) && /Estado do passarinho: a salvo/.test(await pg.getAttribute("#hud-state-item", "aria-label")), "o placar diz A SALVO e o leitor de tela é avisado (aria-label e região aria-live)");
    ok(errs.length === e0, "nenhum erro de JavaScript");
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): gavião v1 (voa por cima do X, não atravessa M, ignora o voo alto, grito, derrota própria) e gato de quintal (X o barra)", async () => {
    const e0 = errs0();
    // ---- X: o gato de quintal NÃO passa, o gavião sim ----
    const XMAP = room((g) => { for (let r = 1; r <= 7; r++) g[r][7] = "X"; g[3][10] = "H"; g[5][10] = "V"; });
    const pg = await open({}, [mini(XMAP, { seeds: 2, special: { G: 0, wind: 0, M: false } })]);
    const a = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = true;
      const v = __game.vets[0], h = __game.cats[0];
      __b.at(3, 3); v.mode = "chase"; v.modeT = 99; v.cool = 0; h.mode = "chase"; h.modeT = 99; h.cool = 0;
      let minV = 99, minH = 99, hOnX = false, hawkMode = new Set();
      for (let i = 0; i < 560; i++) { __game.tick(1 / 60); minV = Math.min(minV, Math.floor(v.cx / 32)); minH = Math.min(minH, Math.floor(h.cx / 32)); if (Math.floor(h.cx / 32) === 7) hOnX = true; hawkMode.add(h.mode); }
      return { minV, minH, hOnX, hawk: h.hawk === true && v.hawk === undefined, hmodes: [...hawkMode].join(",") };
    });
    ok(a.minV >= 8, `o gato de quintal não atravessa a fileira de X (nunca passou da coluna ${a.minV}; X está na 7)`);
    ok(a.minH <= 5 && a.hOnX, `o gavião passa por cima dela (pisou na coluna 7 e chegou à coluna ${a.minH})`);
    ok(a.hawk, "o gavião é um inimigo de `cats` com hawk:true; o gato de quintal é um de `vets`");
    // ---- M: nenhum dos dois passa ----
    ok(await ev(pg, (d) => __game.defineBirdLevels([d]), mini(room((g) => { for (let r = 1; r <= 7; r++) g[r][7] = "M"; g[3][10] = "H"; }), { seeds: 2 })), "(preparo) fileira de muros M e um gavião do outro lado");
    const m = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = true;
      const h = __game.cats[0]; __b.at(3, 3); h.mode = "chase"; h.modeT = 99; h.cool = 0; let min = 99;
      for (let i = 0; i < 560; i++) { __game.tick(1 / 60); min = Math.min(min, Math.floor(h.cx / 32)); }
      return min;
    });
    ok(m >= 8, `o gavião não atravessa um muro M (nunca passou da coluna ${m}; o muro está na 7)`);
    // ---- o voo alto não o detém; ele pega o passarinho no alto, e o gato não ----
    ok(await ev(pg, (d) => __game.defineBirdLevels([d]), mini(room((g) => { g[3][8] = "H"; g[5][8] = "V"; }), { seeds: 2, fruits: 1, fruitMix: ["scare"] })), "(preparo) um gavião e um gato de quintal soltos");
    const f = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = false; __game.invuln = 0;
      const v = __game.vets[0], h = __game.cats[0];
      // só o gato de quintal chega: o voo alto o protege
      __b.at(7, 5, 6); __game.power = 10; v.cx = 8 * 32 + 16; v.cy = 5 * 32 + 16; v.mode = "chase"; v.modeT = 99; v.cool = 0; h.cx = 12 * 32 + 16; h.cy = 7 * 32 + 16; h.mode = "patrol"; h.cool = 99; h.idle = 99;
      __b.run(40); const catOnly = __game.lives;
      // agora o gavião chega ao passarinho em pleno voo alto
      h.cx = 8 * 32 + 16; h.cy = 5 * 32 + 16; h.leg = null; h.route = []; h.mode = "chase"; h.modeT = 99; h.cool = 0; v.cx = 12 * 32 + 16; v.cy = 7 * 32 + 16; v.mode = "patrol"; v.cool = 99; v.idle = 99; v.leg = null;
      __game.power = 10; __b.run(40);
      return { catOnly, withHawk: __game.lives, flying: __game.power > 0 };
    });
    ok(f.catOnly === 3 && f.withHawk === 2 && f.flying, `no voo alto o gato de quintal não pega (vidas ${f.catOnly}), mas o gavião voa na mesma altura e pega (vidas ${f.withHawk}): o voo alto não protege do gavião`);
    // a derrota diz quem pegou
    const lost = await ev(pg, () => {
      const out = {};
      for (const who of ["hawk", "cat"]) {
        __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = false; __game.setLives(1); __game.invuln = 0;
        const v = __game.vets[0], h = __game.cats[0]; __b.at(6, 3);
        const x = who === "hawk" ? h : v, y = who === "hawk" ? v : h;
        y.cx = 12 * 32 + 16; y.cy = 7 * 32 + 16; y.mode = "patrol"; y.cool = 99; y.idle = 99;
        x.cx = 6 * 32 + 16; x.cy = 3 * 32 + 16; x.mode = "chase"; x.modeT = 99; x.cool = 0;
        __b.run(10); out[who] = [__game.state, document.getElementById("lose-title").textContent];
      }
      return out;
    });
    ok(lost.hawk[0] === "lost" && lost.hawk[1] === "Um gavião pegou o passarinho!" && lost.cat[0] === "lost" && lost.cat[1] === "Um gato pegou o passarinho!", `a tela de derrota diz quem pegou (${lost.hawk[1]} / ${lost.cat[1]})`);
    // ---- o grito do gavião e o miado do gato ----
    const sn = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = true; __game.sound.reset();
      const h = __game.cats[0], v = __game.vets[0]; __b.at(5, 3);
      h.cool = 0; h.think = 0; h.cx = 9 * 32 + 16; h.cy = 3 * 32 + 16; v.cool = 99; v.idle = 99;
      __b.run(40); const first = __game.sounds.map((e) => e.name).filter((n) => n === "shriek").length;
      __b.run(400); const all = __game.sounds.map((e) => e.name).filter((n) => n === "shriek").length;
      return { first, all, mode: h.mode };
    });
    ok(sn.first === 1 && sn.all <= 4, `o gavião que nota o passarinho solta o grito (shriek): 1 ao começar a perseguir e no máximo um a cada 3 s depois (${sn.first}; ${sn.all} em 7 s)`);
    // ---- a arte: gaviões e gatos com os dados do contrato; postos ----
    const art = await ev(pg, () => {
      __b.start(1); __game.freezeVets = false; __game.noCatch = true; __game.cats[0].mode = "chase"; __game.vets[0].mode = "chase"; __game.drawNow();
      const L = window.BirdArt.__last, C = window.BirdArt.__calls;
      return { hawk: L.drawHawk.d, cat: L.drawFoeCat.d, hawkLook: !!L.drawHawk.o.look, posts: [C["post:cat"], C["post:hawk"]], idx: [L.drawHawk.d.idx, L.drawFoeCat.d.idx] };
    });
    ok(["x", "y", "dir", "mode", "frozen", "idx", "diving"].every((k) => k in art.hawk) && ["x", "y", "dir", "mode", "size", "frozen", "slow", "idx"].every((k) => k in art.cat) && art.hawk.mode === "chase" && art.cat.size === "small" && art.hawkLook && art.posts[0] > 0 && art.posts[1] > 0, `BirdArt.drawHawk/drawFoeCat recebem o contrato (x, y, dir, mode, size, frozen, slow, idx...) e os postos são desenhados por BirdArt.drawPost (${JSON.stringify(art.posts)})`);
    ok(errs.length === e0, "nenhum erro de JavaScript");
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): vento (a favor, contra, de lado, paredes, voo alto, pausa, dt limitado, calm, gatos e gaviões não sentem)", async () => {
    const WIND = room((g) => { for (let c = 2; c <= 9; c++) { g[3][c] = ">"; g[5][c] = "<"; } for (let r = 2; r <= 6; r++) g[r][11] = "^"; for (let c = 2; c <= 5; c++) g[7][c] = "v"; g[6][8] = "v"; g[7][8] = "M"; g[1][12] = "V"; });
    const LV = mini(WIND, { seeds: 2, fruits: 1, fruitMix: ["scare"], special: { G: 0, wind: 6, M: true } });
    const pg = await open({}, [LV]);
    const e0 = errs0();
    const r = await ev(pg, () => {
      __b.start(1); __b.park(); __game.sound.reset();
      const o = {};
      __b.at(3, 3); let x0 = __game.player.x, y0 = __game.player.y; let f = __b.run(30);
      o.idle = { dx: __game.player.x - x0, dy: __game.player.y - y0, wind: f[0].wind };
      __b.at(3, 3); x0 = __game.player.x; f = __b.run(30, ["d"]); o.favor = { dx: __game.player.x - x0, wind: f[0].wind, speed: f[0].speed };
      __b.at(9, 3); x0 = __game.player.x; f = __b.run(30, ["a"]); o.contra = { dx: __game.player.x - x0, wind: f[0].wind };
      __b.at(3, 3); x0 = __game.player.x; y0 = __game.player.y; f = __b.run(10, ["w"]); o.side = { dx: __game.player.x - x0, dy: __game.player.y - y0, wind: f[0].wind };
      __b.at(3, 5); x0 = __game.player.x; f = __b.run(30); o.left = { dx: __game.player.x - x0 };                                  // '<' empurra para a esquerda
      __b.at(11, 6); y0 = __game.player.y; f = __b.run(30); o.up = { dy: __game.player.y - y0 };                                     // '^' empurra para cima
      __b.at(3, 7); y0 = __game.player.y; f = __b.run(120); o.wallDown = { y: __game.player.y + 24, yEnd: 8 * 32 };                  // 'v' contra a parede da borda
      __b.at(8, 6); f = __b.run(120); o.muroDown = { y: __game.player.y + 24, yEnd: 7 * 32 };                                         // 'v' contra um muro M
      __b.at(3, 3); x0 = __game.player.x; __game.tick(1); o.bigDt = __game.player.x - x0;                                             // um quadro enorme: o empurrão tem o limite de 0,05 s
      __b.at(3, 3); __game.power = 5; x0 = __game.player.x; f = __b.run(30); o.high = { dx: __game.player.x - x0, wind: f[0].wind, flying: f[0].flying }; // voo alto: está acima do vento
      __game.power = 0;
      return o;
    });
    ok(near(r.idle.dx, 45, 1) && near(r.idle.dy, 0, 0.01) && r.idle.wind === 2, `parado numa corrente '>' o passarinho é empurrado a 90 px/s (${r.idle.dx.toFixed(1)} px em 0,5 s; estado "de lado ou parado")`);
    ok(near(r.favor.dx, (252 + 90) * 0.5, 1) && r.favor.wind === 1, `a favor do vento soma (${r.favor.dx.toFixed(1)} px em 0,5 s = (252+90) × 0,5)`);
    ok(near(r.contra.dx, -(252 - 90) * 0.5, 1) && r.contra.wind === -1, `contra o vento subtrai (${r.contra.dx.toFixed(1)} px = −(252−90) × 0,5)`);
    ok(r.side.dx > 3 && r.side.dx < 8 && near(r.side.dy, -42, 1), `de lado ele anda normal para cima (${r.side.dy.toFixed(1)} px) e é empurrado de lado só enquanto o centro está na corrente (${r.side.dx.toFixed(1)} px)`);
    ok(near(r.left.dx, -45, 1) && near(r.up.dy, -45, 1), `'<' empurra para a esquerda (${r.left.dx.toFixed(1)}) e '^' para cima (${r.up.dy.toFixed(1)})`);
    ok(near(r.wallDown.y, r.wallDown.yEnd, 0.01) && near(r.muroDown.y, r.muroDown.yEnd, 0.01), `as paredes e os muros ainda seguram o passarinho empurrado (${r.wallDown.y} de ${r.wallDown.yEnd}; ${r.muroDown.y} de ${r.muroDown.yEnd})`);
    ok(near(r.bigDt, 4.5, 0.01), `um quadro de 1 s empurra só o de 0,05 s (${r.bigDt.toFixed(2)} px)`);
    ok(near(r.high.dx, 0, 0.001) && r.high.wind === 0 && r.high.flying, `no voo alto o passarinho está acima do vento: nenhum empurrão (${JSON.stringify(r.high)})`);
    // sons e efeitos do vento
    const g = await ev(pg, () => { __game.setAnimal("bird"); __b.start(1); __b.park(); __game.sound.reset(); __b.at(3, 3); __b.run(100, [], { stay: null }); __game.drawNow(); return { gust: __game.sounds.filter((e) => e.name === "gust").length, fx: __game.catFx.map((f) => f.kind).includes("gust") || (window.BirdArt.__calls["fx:gust"] || 0) > 0, kind: window.BirdArt.__last["theme.wind"] && window.BirdArt.__last["theme.wind"].kind, themeCalls: window.BirdArt.__calls["theme.wind"] }; });
    ok(g.gust >= 1 && g.gust <= 2 && g.fx && [">", "<", "^", "v"].includes(g.kind) && g.themeCalls > 0, `o som do vento (gust: ${g.gust} em 1,7 s, no máximo um a cada 1,6 s), o efeito gust e o tile é desenhado pelo ambiente (muro/vento via g.kind: "${g.kind}")`);
    // placar
    await ev(pg, () => { __b.start(1); __b.park(); __b.at(9, 3); __b.run(1, ["a"]); __b.press("a", true); });
    ok(await hudText(pg, "#hud-state", "CONTRA O VENTO") && /contra o vento/.test(await pg.textContent("#hud-state-live")), "andando contra o vento o placar diz CONTRA O VENTO e o leitor de tela é avisado");
    await ev(pg, () => { __b.press("a", false); __b.press("d", true); __b.at(3, 3); __b.run(1); });
    ok(await hudText(pg, "#hud-state", "A FAVOR DO VENTO"), "a favor: A FAVOR DO VENTO");
    await ev(pg, () => { __b.press("d", false); __b.at(3, 3); __b.run(1); });
    ok(await hudText(pg, "#hud-state", "NO VENTO"), "parado na corrente: NO VENTO");
    // gatos de quintal não sentem o vento
    const c = await ev(pg, () => {
      __b.start(1); __b.park(); __game.freezeVets = false; __game.noCatch = true;
      const v = __game.vets[0]; v.cx = 4 * 32 + 16; v.cy = 3 * 32 + 16; v.idle = 99; v.cool = 99; v.leg = null; v.route = []; __b.at(1, 7);
      const x0 = v.cx; __b.run(60); return v.cx - x0;
    });
    ok(c === 0, "um gato de quintal parado numa corrente de vento não é empurrado");
    // pausa: nada de empurrão
    const pz = await ev(pg, () => { __b.start(1); __b.park(); __b.at(3, 3); __game.noCatch = true; return __game.player.x; });
    await pg.click("#btn-pause");
    const p1 = await ev(pg, () => __game.player.x); await pg.waitForTimeout(300); const p2 = await ev(pg, () => __game.player.x);
    ok(await ev(pg, () => __game.state) === "paused" && p1 === p2, `pausado, o vento não empurra (${p1} = ${p2})`);
    await pg.click("#btn-resume");
    await pg.context().close();
    // calm (reduzir movimento): o empurrão é o mesmo e o desenho do vento fica parado (g.time = 0)
    const cp = await newPage({ realBird: true });
    await cp.emulateMedia({ reducedMotion: "reduce" });
    await fresh(cp, { name: "Totó" }); await cp.evaluate(BIRD_PAGE);
    await ev(cp, (d) => __game.defineBirdLevels([d]), LV);
    const k = await ev(cp, () => { __b.start(1); __b.park(); __b.at(3, 3); const x0 = __game.player.x; __b.run(30); __game.drawNow(); return { dx: __game.player.x - x0, t: window.BirdArt.__last["theme.wind"].time, time: __game.time }; });
    ok(near(k.dx, 45, 1) && k.t === 0 && k.time > 0.4, `com "reduzir movimento" o vento empurra igual (${k.dx.toFixed(1)} px: é regra do jogo, não animação) e o desenho dele fica parado (g.time = ${k.t})`);
    await cp.context().close();
    ok(errs.length === e0, "nenhum erro de JavaScript");
  });

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (motor): minhocas (disparam a 3 tiles, +50, nome e som) e os 5 tipos de fruto (voo alto, escudo, ar frio, rajada, ímã)", async () => {
    const MAP = room((g) => { g[3][10] = "H"; g[5][10] = "V"; });
    const pg = await open({}, [mini(MAP, { seeds: 6, fruits: 5, fruitMix: ["scare", "gold", "ice", "turbo", "magnet"], worms: 2, extraLives: [1, 1] })]);
    const e0 = errs0();
    const w = await ev(pg, () => {
      __b.start(1); __game.freezeVets = true; __game.sound.reset();
      for (const it of __game.items) { it.x = -900; it.y = -900; }
      const o = {}, mk = (c, r) => ({ x: c * 32 + 16, y: r * 32 + 16, vx: 0, vy: 0, taken: false, hue: 0 });
      __game.balls = [mk(8, 3), mk(8, 6)];
      __b.at(4, 3); __b.run(2); o.far = Math.hypot(__game.balls[0].vx, __game.balls[0].vy);          // a 4 tiles: parada
      __b.at(6, 3, 8); __b.run(1); o.kick = Math.hypot(__game.balls[0].vx, __game.balls[0].vy); o.dir = Math.sign(__game.balls[0].vx); // a menos de 3 tiles: dispara para longe
      __b.run(300); const b0 = __game.balls[0]; o.stopped = Math.hypot(b0.vx, b0.vy) === 0; o.x = b0.x;
      __b.at(8, 6); __b.at(8, 6, 4); const s0 = __game.score; __game.sound.reset(); __b.run(1, []); o.score = __game.score - s0; o.toast = document.getElementById("toast").textContent; o.snd = __game.sounds.map((e) => e.name).join(",");
      o.hud = __game.balls.filter((b) => b.taken).length; __game.drawNow();
      o.art = window.BirdArt.__last.drawWorm ? { r: window.BirdArt.__last.drawWorm.o.r, hidden: window.BirdArt.__last.drawWorm.o.hidden, keys: Object.keys(window.BirdArt.__last.drawWorm.b).join() } : null;
      return o;
    });
    ok(w.far === 0 && near(w.kick, 185.5, 1.2) && w.dir === 1 && w.stopped, `a minhoca fica parada a 4 tiles e dispara quando o passarinho chega a menos de 3 (${w.kick.toFixed(0)} px/s, para longe), rola e para sozinha`);
    ok(w.score === 50 && /^Minhoca! \+50 pontos \(1\/2\)$/.test(w.toast) && /worm/.test(w.snd), `pegar uma minhoca vale 50 pontos, o aviso diz "${w.toast}" e toca o worm (${w.snd})`);
    ok(w.art && w.art.r === 8 && w.art.hidden === false && /x,y,vx,vy,hue/.test(w.art.keys), "BirdArt.drawWorm recebe { x, y, vx, vy, hue } e { time, calm, r, hidden }");
    ok(await hudText(pg, "#hud-balls", "1/2") && /MINHOCAS/.test(await pg.textContent("#hud-balls-item")) && /Minhocas/.test(await pg.getAttribute("#hud-balls-item", "title")), "o placar diz MINHOCAS 1/2");
    // frutos
    const fr = await ev(pg, () => {
      const out = {}, kinds = ["scare", "gold", "ice", "turbo", "magnet"];
      for (const k of kinds) {
        __b.start(1); __game.freezeVets = true; __game.sound.reset();
        for (const it of __game.items) if (!it.bone) { it.x = -900; it.y = -900; }
        __game.balls = [];
        __b.fruit(k);
        out[k] = { fx: __game.fx, power: __game.power, toast: document.getElementById("toast").textContent, snd: __game.sounds.map((e) => e.name).join(",") };
      }
      return out;
    });
    ok(near(fr.scare.power, 10, 0.02) && fr.scare.fx.shield === 0, "fruto comum: voo alto de 10 s");
    ok(near(fr.gold.fx.shield, 10, 0.02) && /^Fruto dourado: escudo dourado por 10 s: nada pega o passarinho!$/.test(fr.gold.toast), `fruto dourado: escudo de 10 s ("${fr.gold.toast}")`);
    ok(near(fr.ice.fx.ice, 6, 0.02) && /^Fruto de ar frio: gatos e gaviões congelados por 6 s!$/.test(fr.ice.toast), `fruto de ar frio: gatos e gaviões congelados por 6 s ("${fr.ice.toast}")`);
    ok(near(fr.turbo.fx.turbo, 8, 0.02) && /^Fruto de rajada: \+40% de velocidade e bater de asas sem cansar por 8 s!$/.test(fr.turbo.toast), `fruto de rajada: ×1,4 e bater asas sem cansar por 8 s ("${fr.turbo.toast}")`);
    ok(near(fr.magnet.fx.magnet, 12, 0.02) && /^Fruto ímã: as sementes vêm sozinhas por 12 s!$/.test(fr.magnet.toast), `fruto ímã: sementes vêm sozinhas por 12 s ("${fr.magnet.toast}")`);
    ok(Object.values(fr).every((x) => /fruit/.test(x.snd)), "todo fruto toca o som fruit");
    // efeitos em ação
    const ef = await ev(pg, () => {
      const out = {};
      const setup = () => { __b.start(1); __game.noCatch = false; __game.freezeVets = false; for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = []; return [__game.vets[0], __game.cats[0]]; };
      // escudo: o gato e o gavião em cima do passarinho não pegam
      let [v, h] = setup(); __game.fx = { shield: 5 }; __b.at(6, 3); for (const x of [v, h]) { x.cx = 6 * 32 + 16; x.cy = 3 * 32 + 16; x.mode = "chase"; x.modeT = 99; x.cool = 0; } __game.invuln = 0; __b.run(120); out.shield = __game.lives;
      // gelo: congelam (não se mexem), não pegam e, ao derreter, descansam
      [v, h] = setup(); __game.fx = { ice: 2 }; __b.at(6, 3); v.cx = 9 * 32 + 16; v.cy = 3 * 32 + 16; h.cx = 9 * 32 + 16; h.cy = 5 * 32 + 16; for (const x of [v, h]) { x.mode = "chase"; x.modeT = 99; x.cool = 0; }
      const p = [v.cx, v.cy, h.cx, h.cy]; __b.run(110); out.iceStill = JSON.stringify(p) === JSON.stringify([v.cx, v.cy, h.cx, h.cy]); out.iceLives = __game.lives; out.iceCool = [v.cool, h.cool].map((c) => c >= 0);
      __b.run(20); out.iceAfter = __game.fx.ice;
      // turbo: ×1,4 e a arrancada não gasta fôlego
      [v, h] = setup(); __game.freezeVets = true; __game.fx = { turbo: 6 }; __b.at(1, 3); __game.stamina = 1; const f = __b.run(120, ["d", "Shift"], { stay: [36, 100] }); out.turbo = { speed: f[0].speed, sta: f[119].sta, spr: f.every((x) => x.spr) };
      // ímã: as sementes até 4 tiles (com linha livre) vêm sozinhas
      [v, h] = setup(); __game.freezeVets = true; __b.at(3, 3); const seeds = __game.items.filter((i) => !i.bone);
      seeds[0].x = 6 * 32 + 8; seeds[0].y = 3 * 32 + 8; seeds[1].x = 10 * 32 + 8; seeds[1].y = 3 * 32 + 8; __game.fx = { magnet: 5 }; const c0 = __game.collected; __b.run(3); out.magnet = [seeds[0].taken, seeds[1].taken, __game.collected - c0];
      return out;
    });
    ok(ef.shield === 3, `escudo: o gato e o gavião em cima do passarinho por 2 s não tiram vida (${ef.shield})`);
    ok(ef.iceStill && ef.iceLives === 3 && ef.iceAfter === 0, "ar frio: o gato e o gavião ficam parados, não pegam e ele acaba depois de 2 s");
    ok(near(ef.turbo.speed, 252 * 1.4 * 1.35, 1e-6) && ef.turbo.sta === 1 && ef.turbo.spr, `rajada: ×1,4 e bater asas sem gastar fôlego (${ef.turbo.speed.toFixed(1)} px/s, fôlego ${ef.turbo.sta})`);
    ok(ef.magnet[0] && !ef.magnet[1] && ef.magnet[2] === 1, "ímã: a semente a 3 tiles vem sozinha e a de 7 tiles não");
    // arte: os 5 tipos de fruto e a semente são pedidos a BirdArt com o contrato
    const art = await ev(pg, () => { __b.start(1); __game.drawNow(); const C = window.BirdArt.__calls, L = window.BirdArt.__last; return { kinds: ["scare", "gold", "ice", "turbo", "magnet"].map((k) => C["fruit:" + k] || 0), seed: L.drawSeed && L.drawSeed.it, seedLook: L.drawSeed && !!L.drawSeed.o.look }; });
    ok(art.kinds.every((n) => n > 0) && art.seed && "variant" in art.seed && art.seedLook, `os 5 tipos de fruto (${art.kinds}) e as sementes são desenhados por BirdArt (drawFruit com kind, drawSeed com variant)`);
    ok(errs.length === e0, "nenhum erro de JavaScript");
    await pg.context().close();
  });
};
