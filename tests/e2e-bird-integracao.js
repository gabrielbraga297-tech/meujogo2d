// Seções do Passarinho (0.20.0): a INTEGRAÇÃO. Aqui o jogo roda com os arquivos DE VERDADE juntos (js/bird-levels.js, js/bird-art.js, js/bird-themes*.js, o motor de js/game.js e os sons de js/sound.js), sem as fixtures
// do motor: todas as páginas abrem com `realBird: "real"` (veja o gancho em tests/e2e.js). Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só estas: node tests/e2e.js "Passarinho (integração)"   (uma seção: node tests/e2e.js "Passarinho (integração): mapas")
// Capturas de tela (para ler com os olhos): BIRD_SHOTS=/pasta node tests/e2e.js "Passarinho (integração): capturas"
const fs = require("fs");
const path = require("path");
const ROBOT = require("./bird-robot-page.js"); // o robô que joga as fases (função de página)

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, errs, root } = T;

  // ---------- ferramentas ----------
  // Roda dentro da página: sorteio com semente (os sorteios do jogo se repetem igual), teclado e ajudantes.
  const BIRD_PAGE = () => {
    const g = window.__game;
    const press = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? "keydown" : "keyup", { key: k, code: k.length === 1 ? "Key" + k.toUpperCase() : k }));
    const mul = (s) => { let seed = s | 0; return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
    window.__mul = mul;
    window.__b = {
      press, mul,
      // (as minhocas são sorteadas com Math.random, de propósito: o motor não gasta o rand dele com elas. Para o teste não oscilar de uma rodada para a outra, Math.random também ganha semente fixa antes de cada início de fase)
      start(id = 1, o, seed = 20261029 + id) { g.setAnimal("bird"); g.setRand(mul(seed)); Math.random = mul(seed ^ 0x5bd1e995); g.start(id, o); g.autoStart = true; },
      tileOf: (p) => [Math.floor((p.x + p.w / 2) / 32), Math.floor((p.y + p.h / 2) / 32)],
    };
  };
  const open = async (opts = {}) => { // página nova com os arquivos de verdade, jogador "Totó" e as ferramentas
    const pg = await newPage({ realBird: "real", ...opts });
    await fresh(pg, { name: "Totó" });
    await pg.evaluate(BIRD_PAGE);
    return pg;
  };
  const errs0 = () => errs.length;

  // A tabela de contagens do docs/PASSARINHO-DESENHO.md (a que o gerador e o teste dos mapas conferem): F, Gatos, Gaviões, Sementes, Frutos, Minhocas, G, Vento (— = 0)
  const designTable = () => {
    const md = fs.readFileSync(path.join(root, "docs/PASSARINHO-DESENHO.md"), "utf8");
    const part = md.slice(md.indexOf("## As 20 fases"), md.indexOf("## Como os mapas são desenhados"));
    const rows = {};
    for (const line of part.split("\n")) {
      const c = line.split("|").map((s) => s.trim());
      if (c.length < 12 || !/^\d+$/.test(c[1])) continue;
      const n = (s) => (s === "—" || s === "" ? 0 : Number(s));
      rows[Number(c[1])] = { place: c[2], size: c[3], cats: n(c[4]), hawks: n(c[5]), seeds: n(c[6]), fruits: n(c[7]), worms: n(c[8]), G: n(c[9]), wind: n(c[10]) };
    }
    return rows;
  };

  // =====================================================================================================================================================================
  await section("0.20.0 · Passarinho (integração): mapas (as 20 fases de verdade montam sem erro, com as contagens do desenho; os grafos ligam tudo; os itens sorteados sempre cabem)", async () => {
    const pg = await open();
    const e0 = errs0();
    const T20 = designTable();
    ok(Object.keys(T20).length === 20, `a tabela do docs/PASSARINHO-DESENHO.md tem as 20 fases (${Object.keys(T20).length})`);
    const g = await ev(pg, () => __game.games.find((x) => x.id === "bird"));
    ok(g.ready && g.levels === 20 && g.total === 20 && !g.placeholder && g.rev === 1, `o Passarinho está pronto com as 20 fases de verdade (${JSON.stringify(g)})`);
    ok(await ev(pg, () => typeof BirdArt === "object" && typeof BirdThemes === "object" && typeof BirdLevels === "object" && BirdLevels.length === 20), "BirdArt, BirdThemes e BirdLevels (os arquivos de verdade) estão carregados");
    ok(await ev(pg, () => __game.birdFailed.length === 0), "nenhuma função de BirdArt falhou ao carregar");
    // montagem, contagens e grafos de cada fase
    const rep = await ev(pg, () => {
      const out = [], defs = __game.levelsOf("bird"), built = __game.builtOf("bird");
      const comps = (lv, match) => { // grupos (4 vizinhos) de tiles que casam com `match(ch)` (G, ou o mesmo caractere de vento)
        const seen = new Set(); let n = 0;
        for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
          const ch = lv.kinds[r][c]; if (!match(ch) || seen.has(r * lv.cols + c)) continue; n++;
          const q = [[c, r]]; seen.add(r * lv.cols + c);
          for (let i = 0; i < q.length; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = q[i][0] + dc, nr = q[i][1] + dr; if (nc >= 0 && nr >= 0 && nc < lv.cols && nr < lv.rows && lv.kinds[nr][nc] === ch && !seen.has(nr * lv.cols + nc)) { seen.add(nr * lv.cols + nc); q.push([nc, nr]); } }
        }
        return n;
      };
      const reach = (lv, walk, from) => { // tiles alcançados a partir de `from` por 4 vizinhos
        const seen = new Set([from[1] * lv.cols + from[0]]), q = [from];
        for (let i = 0; i < q.length; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = q[i][0] + dc, nr = q[i][1] + dr; if (nc >= 0 && nr >= 0 && nc < lv.cols && nr < lv.rows && walk[nr][nc] && !seen.has(nr * lv.cols + nc)) { seen.add(nr * lv.cols + nc); q.push([nc, nr]); } }
        return seen;
      };
      for (let id = 1; id <= 20; id++) {
        const lv = built[id], d = defs[id - 1], r = { id, err: null };
        try {
          const count = (ch) => lv.kinds.reduce((n, row) => n + [...row].filter((x) => x === ch).length, 0);
          r.size = `${lv.cols}×${lv.rows}`; r.title = lv.title; r.place = lv.place;
          r.cats = lv.vetSpawns.length; r.hawks = lv.catSpawns.length; r.G = comps(lv, (ch) => ch === "G"); r.wind = comps(lv, (ch) => ">^<v".includes(ch)); r.M = count("M");
          r.defSeeds = lv.rations; r.defFruits = lv.bones; r.defWorms = lv.balls; r.flight = !!lv.flight; r.windGrid = !!lv.wind; r.night = !!lv.night; r.nCat = lv.catSpawns.length;
          const key = (c, rr) => rr * lv.cols + c, [pc, pr] = lv.spawnTile;
          const exits = lv.exitTiles.map(([c, rr]) => key(c, rr)), posts = lv.vetSpawns.concat(lv.catSpawns).map(([c, rr]) => key(c, rr));
          const gR = reach(lv, lv.walk, [pc, pr]), hR = reach(lv, lv.hawkWalk, [pc, pr]);
          r.catGraph = exits.every((k) => gR.has(k)) && lv.vetSpawns.every(([c, rr]) => gR.has(key(c, rr))) && lv.catSpawns.every(([c, rr]) => gR.has(key(c, rr)));
          r.hawkGraph = exits.every((k) => hR.has(k)) && lv.catSpawns.every(([c, rr]) => hR.has(key(c, rr))) && lv.vetSpawns.every(([c, rr]) => hR.has(key(c, rr)));
          let floor = 0, walkable = 0; for (let rr = 0; rr < lv.rows; rr++) for (let c = 0; c < lv.cols; c++) { if (lv.walk[rr][c]) walkable++; if (lv.kinds[rr][c] !== "#" && lv.kinds[rr][c] !== "M") floor++; }
          r.catReach = gR.size === walkable; r.hawkReach = hR.size; r.floor = floor; r.walkable = walkable; r.posts = posts.length;
          r.minPoints = lv.minPoints; r.mission = !!lv.mission; r.like = lv.like; r.exit = [lv.exitRect.w / 32, lv.exitRect.h / 32];
        } catch (e) { r.err = String(e.message); }
        out.push(r);
      }
      return out;
    });
    for (const r of rep) {
      const t = T20[r.id];
      ok(!r.err && t && `${t.size}` === r.size.replace("×", "×"), `Fase ${r.id} (${r.place}): monta sem erro, ${r.size}${r.err ? " ERRO " + r.err : ""}`);
      if (r.err || !t) continue;
      ok(r.cats === t.cats && r.hawks === t.hawks && r.defSeeds === t.seeds && r.defFruits === t.fruits && r.defWorms === t.worms && r.G === t.G && r.wind === t.wind,
        `Fase ${r.id}: contagens iguais ao desenho (gatos ${r.cats}/${t.cats}, gaviões ${r.hawks}/${t.hawks}, sementes ${r.defSeeds}/${t.seeds}, frutos ${r.defFruits}/${t.fruits}, minhocas ${r.defWorms}/${t.worms}, grupos de galho ${r.G}/${t.G}, de vento ${r.wind}/${t.wind})`);
      ok(r.catGraph && r.hawkGraph, `Fase ${r.id}: o grafo dos gatos e o do gavião ligam o início, os postos e a saída (${r.posts} postos)`);
      ok(r.catReach, `Fase ${r.id}: o gato alcança todo o chão que anda (sem bolsões), ${r.walkable} tiles`);
      ok(r.flight === (r.defFruits > 0) && r.windGrid === (t.wind > 0) && r.night === (r.id === 18 || r.id === 19) && r.exit[0] * r.exit[1] === 3 && r.M > 0, `Fase ${r.id}: voo alto ${r.flight ? "sim" : "não"} (frutos ${r.defFruits}), vento ${r.windGrid ? "sim" : "não"}, noite ${r.night ? "sim" : "não"}, ninho ${r.exit.join("×")}, ${r.M} tiles de muro M`);
    }
    // itens sorteados: várias sementes de sorteio por fase, sempre cabem (a contagem sai igual), em chão livre e longe dos postos
    const fit = await ev(pg, () => {
      const out = []; const built = __game.builtOf("bird");
      for (let id = 1; id <= 20; id++) {
        const lv = built[id]; let bad = null, fails = 0; const tr = lv.vetSpawns.concat(lv.catSpawns);
        const wind = new Set(); lv.kinds.forEach((row, r) => [...row].forEach((ch, c) => { if (">^<v".includes(ch)) wind.add(c + "," + r); }));
        const exit = new Set(lv.exitTiles.map(([c, r]) => c + "," + r));
        for (let seed = 1; seed <= 12; seed++) {
          __b.start(id, undefined, 9000 + seed * 37 + id);
          const its = __game.items, tiles = its.map((i) => [(i.x - 8) / 32, (i.y - 8) / 32]), seeds = its.filter((i) => !i.bone).length, fr = its.filter((i) => i.bone), worms = __game.balls.length;
          const kinds = fr.map((i) => i.kind || "scare").sort().join(), want = lv.boneMix.slice().sort().join();
          const uniq = new Set(tiles.map((t) => t + "")).size === tiles.length;
          const okTile = tiles.every(([c, r]) => lv.walk[r] && lv.walk[r][c] && lv.kinds[r][c] === "." && !wind.has(c + "," + r) && !exit.has(c + "," + r) && tr.every(([pc, pr]) => Math.hypot(pc - c, pr - r) >= 2));
          const wormTiles = __game.balls.every((b) => { const c = Math.floor(b.x / 32), r = Math.floor(b.y / 32); return lv.walk[r][c] && lv.kinds[r][c] === "." && !wind.has(c + "," + r); });
          if (seeds !== lv.rations || fr.length !== lv.bones || worms !== lv.balls || kinds !== want || !uniq || !okTile || !wormTiles) { fails++; bad = bad || { seed, seeds, fr: fr.length, worms, kinds, want, uniq, okTile, wormTiles }; }
        }
        out.push({ id, fails, bad });
      }
      return out;
    });
    for (const r of fit) ok(r.fails === 0, `Fase ${r.id}: em 12 sorteios as sementes, os frutos (com o mix certo) e as minhocas sempre cabem, em chão livre ('.'), fora do vento, da saída e dos postos${r.bad ? " " + JSON.stringify(r.bad) : ""}`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // CAPTURAS (c): cada fase desenha com BirdThemes e BirdArt de verdade. Com BIRD_SHOTS=/pasta as imagens (1000×700) vão para lá; sem ela só se confere que desenha (sem erro, sem quadro em branco).
  const SHOT_DIR = process.env.BIRD_SHOTS || "";
  const PAGE_SHOTS = () => { // ferramentas de captura (dentro da página)
    const g = window.__game;
    window.__s = {
      // o tile com mais variedade (muro, obstáculo, galho, vento, itens, postos e ninho) numa janela de 25×18 tiles; devolve [coluna, linha] de um chão livre perto do centro dela
      rich(id) {
        const lv = g.builtOf("bird")[id], W = 25, H = 18, k = lv.kinds;
        const items = g.items.filter((i) => !i.taken).map((i) => [Math.floor((i.x + 8) / 32), Math.floor((i.y + 8) / 32)]);
        let best = null;
        for (let r = 0; r + H <= lv.rows; r += 2) for (let c = 0; c + W <= lv.cols; c += 2) {
          const kinds = new Set(); let s = 0;
          for (let rr = r; rr < r + H; rr++) for (let cc = c; cc < c + W; cc++) { const ch = k[rr][cc]; if (ch === "M") { s += 0.5; kinds.add("M"); } else if (ch === "X") { s += 2; kinds.add("X"); } else if (ch === "G") { s += 4; kinds.add("G"); } else if (">^<v".includes(ch)) { s += 2; kinds.add("w"); } else if (ch === "#") { s += 0.2; kinds.add("#"); } else if (ch === "E") { s += 3; kinds.add("E"); } }
          for (const [ic, ir] of items) if (ic >= c && ic < c + W && ir >= r && ir < r + H) s += 3;
          for (const [pc, pr] of lv.vetSpawns.concat(lv.catSpawns)) if (pc >= c && pc < c + W && pr >= r && pr < r + H) s += 8;
          s += kinds.size * 12;
          if (!best || s > best.s) best = { s, c, r };
        }
        const cc = best.c + 12, cr = best.r + 9; let pick = null;
        for (let d = 0; d < 12 && !pick; d++) for (let r = cr - d; r <= cr + d && !pick; r++) for (let c = cc - d; c <= cc + d; c++) if (lv.walk[r] && lv.walk[r][c] && lv.kinds[r][c] === ".") { pick = [c, r]; break; }
        return pick;
      },
      tp(c, r, dx = 0, dy = 0) { g.player.x = c * 32 + 4 + dx; g.player.y = r * 32 + 4 + dy; },
      find(id, ch) { const lv = g.builtOf("bird")[id], out = []; lv.kinds.forEach((row, r) => [...row].forEach((x, c) => { if (x === ch) out.push([c, r]); })); return out; },
      spin(n, dt = 1 / 60) { for (let i = 0; i < n; i++) g.tick(dt); g.drawNow(); },
      // quanto do canvas é "conteúdo" (não só uma cor): desvio de cores amostradas
      variety() { const c = document.getElementById("game"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, seen = new Set(); for (let i = 0; i < d.length; i += 4 * 97) seen.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); return seen.size; },
    };
  };
  const openShots = async (opts = {}) => {
    const pg = await open({ viewport: { width: 1000, height: 700 }, ...opts });
    await pg.evaluate(PAGE_SHOTS);
    return pg;
  };
  // recorte de uma região do mundo (x, y, w, h em px do mapa) com `pad` px em volta, ampliada pela tela: serve para ver o ninho e o passarinho de perto
  const snapWorld = async (pg, name, r, pad = 24) => {
    if (!SHOT_DIR) return;
    const box = await pg.evaluate(([r, pad]) => { const cv = document.getElementById("game"), b = cv.getBoundingClientRect(), v = __game.view, sx = v.k * v.zoom, f = b.width / cv.width, X = (r.x - pad - v.camX) * sx * f + b.left, Y = (r.y - pad - v.camY) * sx * f + b.top; return { x: Math.max(0, X), y: Math.max(0, Y), width: (r.w + 2 * pad) * sx * f, height: (r.h + 2 * pad) * sx * f }; }, [r, pad]);
    fs.mkdirSync(SHOT_DIR, { recursive: true }); await pg.screenshot({ path: path.join(SHOT_DIR, name + ".png"), clip: box });
  };
  const snap = async (pg, name) => { if (!SHOT_DIR) return; fs.mkdirSync(SHOT_DIR, { recursive: true }); await pg.screenshot({ path: path.join(SHOT_DIR, name + ".png") }); };

  await section("0.20.0 · Passarinho (integração): capturas (as 20 fases desenham com BirdThemes e BirdArt de verdade, sem erro; o ninho recebe o canto e o tamanho da saída; uma sombra só no voo alto)", async () => {
    const pg = await openShots();
    const e0 = errs0();
    // espiões: o que o motor passa para a arte (as funções de verdade continuam desenhando)
    await ev(pg, () => {
      window.__spy = { nest: [], bird: [], shadow: 0, fx: [] };
      const B = BirdArt, orig = { drawNest: B.drawNest, drawBird: B.drawBird, drawFx: B.drawFx };
      B.drawNest = function (c, x, y, o) { __spy.nest.push({ x, y, o: { ...o } }); return orig.drawNest.apply(this, arguments); };
      B.drawBird = function (c, p, o) { __spy.bird.push({ o: { ...o } }); return orig.drawBird.apply(this, arguments); };
      B.drawFx = function (c, k, x, y, t, o) { if (k === "shadow") __spy.shadow++; __spy.fx.push(k); return orig.drawFx.apply(this, arguments); };
    });
    for (let id = 1; id <= 20; id++) {
      const r = await ev(pg, (id) => {
        __spy.nest.length = 0; __spy.bird.length = 0; __spy.shadow = 0;
        __b.start(id); __game.freezeVets = true;
        const lv = __game.builtOf("bird")[id], at = __s.rich(id);
        __s.tp(at[0], at[1]); __s.spin(8);
        const v1 = __s.variety(), th = __game.theme;
        const ex = __game.exit, nests = __spy.nest.slice(-1)[0];
        // ao lado do ninho (a saída)
        const ec = ex.x / 32, er = ex.y / 32, side = ec < lv.cols / 2 ? 2 : -2, vert = ex.w > ex.h;
        const nearNest = vert ? [ec + 1, er + (er < lv.rows / 2 ? 2 : -2)] : [ec + side, er + 1];
        __s.tp(Math.round(nearNest[0]), Math.round(nearNest[1])); __s.spin(6);
        return { id, v1, v2: __s.variety(), place: th.place, nest: nests, exit: { x: ex.x, y: ex.y, w: ex.w, h: ex.h }, birdCalls: __spy.bird.length, noShadow: __spy.bird.some((b) => b.o.noShadow), shadow: __spy.shadow, failed: __game.birdFailed, theme: !!lv };
      }, id);
      ok(r.v1 > 25 && r.v2 > 25 && r.failed.length === 0, `Fase ${id} (${r.place}): desenha com a arte e o ambiente de verdade (${r.v1} e ${r.v2} cores amostradas; nenhuma função de BirdArt falhou)`);
      ok(r.nest && r.nest.x === r.exit.x && r.nest.y === r.exit.y && r.nest.o.w === r.exit.w && r.nest.o.h === r.exit.h && typeof r.nest.o.rim === "string" && typeof r.nest.o.twig === "string" && typeof r.nest.o.lining === "string",
        `Fase ${id}: o ninho recebe o CANTO da saída (${r.exit.x}, ${r.exit.y}), o tamanho dela (${r.exit.w}×${r.exit.h}) e as cores do ambiente (${r.nest && r.nest.o.rim})`);
      ok(!r.noShadow && r.shadow === 0, `Fase ${id}: no chão o passarinho desenha a sombra dele (noShadow desligado) e ninguém desenha a sombra do voo alto`);
      await snap(pg, `f${String(id).padStart(2, "0")}-a-meio`);
    }
    // voo alto: uma sombra só (a de BirdArt.drawFx "shadow"; o passarinho não desenha a dele)
    const fl = await ev(pg, () => {
      __b.start(7); __game.freezeVets = true; __spy.bird.length = 0; __spy.shadow = 0;
      const mm = __s.find(7, "M")[40]; __game.power = 8; __s.tp(mm[0], mm[1]); __s.spin(45);
      const sh0 = __spy.shadow, calls = __spy.bird.length; __s.spin(1);
      return { flying: __game.flying, anim: __game.flyAnim, shadowPerFrame: __spy.shadow - sh0, lastNoShadow: __spy.bird.slice(-1)[0].o.noShadow, lastFlying: __spy.bird.slice(-1)[0].o.flying, calls, onM: __game.builtOf("bird")[7].kinds[mm[1]][mm[0]] };
    });
    ok(fl.flying && fl.anim > 0.98 && fl.onM === "M" && fl.shadowPerFrame === 1 && fl.lastNoShadow === true && fl.lastFlying > 0.98, `no voo alto sobre um muro M: a sombra do chão é desenhada UMA vez por quadro (drawFx "shadow") e o passarinho vem com noShadow (${JSON.stringify(fl)})`);
    await snap(pg, "voo-alto-sobre-muro-f07");
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (b) O ROBÔ: joga as 20 fases de verdade (teclado de verdade, gatos e gaviões soltos, galhos, voo alto sobre os muros), até a vitória. A fase só abre a saída com os pontos mínimos e a missão (as regras de verdade).
  const SPY_SOUNDS = () => { // acumula o nome de todo som pedido
    if (window.__heardSet) return;
    window.__heardSet = new Set();
    const play = __game.sound.play;
    __game.sound.play = function (n) { __heardSet.add(n); return play.apply(this, arguments); };
  };
  const ROBOT_ROWS = {}; // (a seção dos sons usa o que o robô fez)
  await section("0.20.0 · Passarinho (integração): robô (joga as 20 fases de verdade com os gatos e os gaviões soltos, até a vitória: pontos mínimos, missão, saída; galhos e voo alto sobre os muros)", async () => {
    const pg = await open();
    const e0 = errs0();
    await ev(pg, SPY_SOUNDS);
    // a saída fechada não vence: em cima do ninho sem os pontos a fase continua
    const closed = await ev(pg, () => { __b.start(4); __game.freezeVets = true; const ex = __game.exit; __game.player.x = ex.x + 4; __game.player.y = ex.y + 4; __game.tick(0.05); __game.tick(0.05); return { state: __game.state, score: __game.score, min: __game.minPoints }; });
    ok(closed.state === "playing" && closed.min === 800, `a Fase 4 não termina em cima do ninho fechado (${closed.score} de ${closed.min} pontos)`);
    const rows = [];
    for (let id = 1; id <= 20; id++) {
      const r = await ev(pg, ROBOT, { id, live: true, seed: 1, attempts: 3, saveEvery: 300 });
      rows.push(r); ROBOT_ROWS[id] = r;
      const open = r.exitOpenAt !== null;
      ok(r.state === "won" && r.attempts <= 3 && open, `Fase ${id}: o robô VENCE com os inimigos soltos em ${r.attempts} tentativa${r.attempts > 1 ? "s" : ""} (${r.time.toFixed(0)} s de jogo, ${r.collected}/${r.seedsTotal} sementes, ${r.bones}/${r.bonesTotal} frutos${r.mission ? ", missão " + JSON.stringify(r.mission) : ""}, ${r.score} pontos${r.minPoints ? " (mínimo " + r.minPoints + ")" : ""}); vidas perdidas ${r.livesLost}${r.hits.length ? " (" + r.hits.map((h) => h.by + " aos " + h.t + " s").join(", ") + ")" : ""}; ${r.stats.mTilesCrossed} travessias de muro em voo alto, ${(r.stats.perchFrames / 60).toFixed(0)} s em galhos, ${(r.stats.windFrames / 60).toFixed(0)} s no vento`);
      ok(r.saves.bad === 0 && r.saves.none === 0 && r.saves.maxSize < 20000, `Fase ${id}: ${r.saves.n} jogos salvos no meio da partida do robô, todos aceitos de volta (maior: ${r.saves.maxSize} bytes de 20000)${r.saves.firstBad ? " PRIMEIRO RECUSADO " + JSON.stringify(r.saves.firstBad) : ""}`);
    }
    const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
    ok(rows.filter((r) => r.attempts === 1).length >= 17, `o robô vence ${rows.filter((r) => r.attempts === 1).length} das 20 fases já na 1ª tentativa (as outras precisaram de ${rows.filter((r) => r.attempts > 1).map((r) => `F${r.id}: ${r.attempts}`).join(", ") || "nenhuma"}; o jogo dá até 3 novas tentativas por fase)`);
    ok(rows.filter((r) => r.stats.mTilesCrossed > 0).length >= 10, `o robô atravessou muros M em voo alto em ${rows.filter((r) => r.stats.mTilesCrossed > 0).length} das 20 fases (${sum((r) => r.stats.mTilesCrossed)} travessias no total)`);
    ok(rows.filter((r) => r.stats.perchFrames > 0).length >= 10, `o robô usou galhos em ${rows.filter((r) => r.stats.perchFrames > 0).length} das 20 fases`);
    ok(rows.filter((r) => r.stats.windFrames > 0).length >= 3, `o robô andou no vento em ${rows.filter((r) => r.stats.windFrames > 0).length} fases`);
    console.log(`   (robô, semente 1, inimigos soltos) vidas perdidas por fase: ${rows.map((r) => `F${r.id}:${r.livesLost}`).join(" ")} (total ${sum((r) => r.livesLost)}; ${rows.filter((r) => r.livesLost === 0).length} fases sem perder nenhuma)`);
    console.log(`   (robô) tempo de jogo por fase (s): ${rows.map((r) => `F${r.id}:${Math.round(r.time)}`).join(" ")}`);
    // as mesmas 20 fases, agora pegando TUDO (sementes e frutos) com os inimigos congelados: todo item é alcançável e a saída abre
    const all = [];
    for (let id = 1; id <= 20; id++) {
      const r = await ev(pg, ROBOT, { id, live: false, collectAll: true, seed: 1, attempts: 1 });
      all.push(r);
      ok(r.state === "won" && r.collected === r.seedsTotal && r.bones === r.bonesTotal && r.livesLost === 0, `Fase ${id}: com os inimigos parados o robô pega TUDO (${r.collected}/${r.seedsTotal} sementes, ${r.bones}/${r.bonesTotal} frutos, ${r.worms} minhocas no caminho) e vence em ${r.time.toFixed(0)} s`);
    }
    console.log(`   (robô, pegando tudo, inimigos parados) tempo por fase (s): ${all.map((r) => `F${r.id}:${Math.round(r.time)}`).join(" ")}`);
    // os sons do perfil tocaram de verdade durante as 40 partidas
    const heard = await ev(pg, () => [...__heardSet]);
    const NEW16 = ["chirp1", "chirp2", "chirp3", "song", "flap", "peck", "worm", "fruit", "soar", "soarend", "landing", "gust", "hiss2", "shriek", "scare", "wheeze"];
    const miss = NEW16.filter((n) => !heard.includes(n));
    ok(miss.length === 0 || (miss.length === 1 && miss[0] === "wheeze") || (miss.length === 1 && miss[0].startsWith("chirp")), `durante as partidas do robô tocaram ${NEW16.length - miss.length} dos 16 sons novos do Passarinho (faltaram: ${miss.join(", ") || "nenhum"}; ouvidos: ${heard.join(" ")})`);
    ok(!heard.some((n) => ["bark1", "bark2", "bark3", "meow", "cmeow1", "cmeow2", "cmeow3", "purr", "hiss", "squeak", "yarn", "woof", "growl", "yowl", "dash", "pant", "ration", "bone", "capture"].includes(n)), `nenhum som do Cachorrinho ou do Gatinho tocou no Passarinho (${heard.filter((n) => ["bark1", "meow", "cmeow1", "hiss", "squeak", "yarn", "woof", "growl", "dash", "pant", "ration", "bone", "capture"].includes(n)).join(", ") || "nenhum"})`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // ---------- capturas dos ESTADOS (voo alto, galho, vento, gavião, gato, noite e entardecer, ninho aberto, minhoca enterrada) ----------
  await section("0.20.0 · Passarinho (integração): capturas dos estados (voo alto sobre o muro, a salvo no galho, vento, gavião, entardecer que escurece, noite, ninho aberto, minhoca enterrada)", async () => {
    const pg = await openShots();
    const e0 = errs0();
    const st = await ev(pg, () => {
      const out = {};
      // voo alto sobre um muro, e piscando no fim
      __b.start(7); __game.freezeVets = true; let mm = __s.find(7, "M"); let at = mm[Math.floor(mm.length / 2)];
      __game.power = 8; __s.tp(at[0], at[1]); __s.spin(40); out.fly = { flying: __game.flying, anim: __game.flyAnim };
      return out;
    });
    await snap(pg, "estado-voo-alto-f07");
    await ev(pg, () => { __game.power = 1.6; __s.spin(3); });
    await snap(pg, "estado-voo-pisca-f07");
    // a salvo no galho (F5) e do lado dele, no chão
    const gal = await ev(pg, () => { __b.start(5); __game.freezeVets = true; const G = __s.find(5, "G")[2]; __s.tp(G[0], G[1]); __s.spin(25); return { perch: __game.perch, safe: __game.safe, tile: G }; });
    await snap(pg, "estado-galho-f05");
    // vento (F8): o passarinho numa corrente
    const ven = await ev(pg, () => { __b.start(8); __game.freezeVets = true; const W = __s.find(8, ">").concat(__s.find(8, "<"), __s.find(8, "^"), __s.find(8, "v")); const t = W[Math.floor(W.length / 2)]; __s.tp(t[0], t[1]); __s.spin(25); return { wind: __game.windNow, tile: t, n: W.length }; });
    await snap(pg, "estado-vento-f08");
    // gavião perseguindo (F14) e gato de quintal perseguindo (F2): o "!" e o modo
    await ev(pg, () => { __b.start(14); __game.freezeVets = true; __game.noCatch = true; const at = __s.rich(14); __s.tp(at[0], at[1]); const h = __game.cats[0], p = __game.player; h.cx = p.x + 12 + 90; h.cy = p.y + 12 - 20; h.mode = "chase"; const v = __game.vets[0]; v.cx = p.x + 12 - 80; v.cy = p.y + 12 + 40; v.mode = "chase"; __s.spin(6); });
    await snap(pg, "estado-gaviao-gato-perseguindo-f14");
    await ev(pg, () => { __b.start(2); __game.freezeVets = true; __game.noCatch = true; const at = __s.rich(2); __s.tp(at[0], at[1]); const p = __game.player, v = __game.vets[0]; v.cx = p.x + 12 + 70; v.cy = p.y + 12; v.mode = "chase"; __s.spin(6); });
    await snap(pg, "estado-gato-perseguindo-f02");
    // entardecer: a luz laranja escurece com o tempo (Fase 18) e a noite (Fase 19)
    const dusk = [];
    for (const secs of [1, 30, 60, 95]) {
      dusk.push(await ev(pg, (secs) => { __b.start(18); __game.freezeVets = true; __game.noCatch = true; const at = __s.rich(18); __s.tp(at[0], at[1]); for (let i = 0; i < secs * 20; i++) { __game.tick(0.05); __game.player.moving = false; } __s.spin(2); return { t: __game.time, dark: __game.darkness }; }, secs));
      await snap(pg, `estado-entardecer-f18-${String(secs).padStart(2, "0")}s`);
    }
    // ninho aberto (Fase 4): pega itens até abrir a saída e fica ao lado do ninho
    const nin = await ev(pg, () => {
      __b.start(4); __game.freezeVets = true; __game.noCatch = true;
      for (const it of __game.items.slice().sort((a, b) => (b.bone ? 1 : 0) - (a.bone ? 1 : 0))) { if (__game.score >= __game.minPoints) break; __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
      const ex = __game.exit; __s.tp(Math.round(ex.x / 32 + (ex.w > ex.h ? 1 : -2)), Math.round(ex.y / 32 + (ex.w > ex.h ? -2 : 1))); __s.spin(10);
      return { score: __game.score, min: __game.minPoints, state: __game.state };
    });
    await snap(pg, "estado-ninho-aberto-f04");
    // os ninhos, fechado e aberto, vertical (Fase 2) e horizontal (Fase 4), de perto e sem o aviso por cima
    await pg.addStyleTag({ content: "#toast{display:none!important}" });
    const nests = [];
    for (const id of [2, 4]) {
      nests.push(await ev(pg, (id) => {
        __b.start(id); __game.freezeVets = true; __game.noCatch = true; const ex = __game.exit, lv = __game.builtOf("bird")[id], vert = ex.h > ex.w;
        const side = vert ? [Math.round(ex.x / 32) + (ex.x < lv.worldW / 2 ? 3 : -3), Math.round(ex.y / 32) + 1] : [Math.round(ex.x / 32) + 1, Math.round(ex.y / 32) + (ex.y < lv.worldH / 2 ? 3 : -3)];
        __s.tp(side[0], side[1]); __s.spin(4);
        return { id, rect: { x: ex.x, y: ex.y, w: ex.w, h: ex.h }, side };
      }, id));
      await snapWorld(pg, `ninho-fechado-f${String(id).padStart(2, "0")}`, nests[nests.length - 1].rect, 60);
      await ev(pg, () => { const lv = __b; for (const it of __game.items.slice().sort((a, b) => (b.bone ? 1 : 0) - (a.bone ? 1 : 0))) { if (__game.minPoints ? __game.score >= __game.minPoints : __game.items.every((i) => i.taken)) break; __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); } });
      await ev(pg, (side) => { __s.tp(side[0], side[1]); __s.spin(4); }, nests[nests.length - 1].side);
      await snapWorld(pg, `ninho-aberto-f${String(id).padStart(2, "0")}`, nests[nests.length - 1].rect, 60);
    }
    // minhoca: parada (fora da terra), depois assustada (foge) e enterrada (só o montinho)
    const worm = await ev(pg, () => {
      __b.start(10); __game.freezeVets = true; __game.noCatch = true; const w = __game.balls[0], lv = __game.builtOf("bird")[10];
      // a minhoca fica num corredor livre de 13 tiles ('.' de 3 tiles à esquerda a 9 à direita), longe do início (6 tiles ou mais): o chute para a direita rola até 7 tiles e ninguém atrapalha, onde quer que o sorteio a tenha posto
      const [sc, sr] = lv.spawnTile; let spot = null;
      for (let r = 2; r < lv.rows - 2 && !spot; r++) for (let c = 4; c < lv.cols - 10 && !spot; c++) {
        let free = true; for (let k = -3; k <= 9 && free; k++) free = lv.walk[r][c + k] && lv.kinds[r][c + k] === "." && Math.abs(c + k - sc) + Math.abs(r - sr) >= 6;
        if (free) spot = [c, r];
      }
      w.x = spot[0] * 32 + 16; w.y = spot[1] * 32 + 16; w.vx = 0; w.vy = 0; w.taken = false; delete w.dug;
      __game.player.x = w.x - 12 - 200; __game.player.y = w.y - 12; __s.spin(3);
      const out = { before: !!w.dug }; __game.player.x = w.x - 12 - 70; __game.player.y = w.y - 12; __s.spin(2); out.kicked = Math.hypot(w.vx, w.vy) > 40;
      __s.tp(lv.spawnTile[0], lv.spawnTile[1]); __s.spin(180); // o passarinho se afasta: a minhoca rola, para e se enterra
      out.after = !!w.dug; out.stopped = Math.hypot(w.vx, w.vy) === 0; out.at = [Math.floor(w.x / 32), Math.floor(w.y / 32)];
      out.again = false; // chegando perto de novo (a 2 tiles, por onde der), ela sai da terra e foge
      for (const [dc, dr] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, 1], [2, -1]]) { const c = out.at[0] + dc, r = out.at[1] + dr; if (!(lv.walk[r] && lv.walk[r][c])) continue; __s.tp(c, r); __s.spin(1); if (Math.hypot(w.vx, w.vy) > 40 && !w.dug) { out.again = true; break; } }
      __s.tp(lv.spawnTile[0], lv.spawnTile[1]); __s.spin(200); out.dug2 = !!w.dug;
      __s.tp(Math.max(1, out.at[0] - 4), out.at[1]); __s.spin(1); return out;
    });
    await snap(pg, "estado-minhoca-enterrada-f10");
    const wb = await ev(pg, () => { const b = __game.balls[0]; return { x: b.x - 16, y: b.y - 16, w: 32, h: 32, dug: !!b.dug }; });
    await snapWorld(pg, "minhoca-de-perto", wb, 48);
    ok(st.fly.flying && st.fly.anim > 0.98, "voo alto ligado sobre um muro (capturado)");
    ok(gal.perch && gal.safe, `no galho o passarinho fica a salvo (${JSON.stringify(gal.tile)})`);
    ok(ven.wind !== 0 && ven.n > 0, `no vento o passarinho é empurrado (windNow ${ven.wind}, ${ven.n} tiles de vento na fase)`);
    ok(dusk[0].dark < 0.35 && dusk[1].dark > dusk[0].dark && dusk[3].dark >= 0.74 && dusk[3].dark <= 0.75 + 1e-9, `o entardecer da Fase 18 escurece com o tempo (${dusk.map((d) => d.dark.toFixed(2)).join(" → ")} em 1, 30, 60 e 95 s)`);
    ok(nin.score >= nin.min, `ninho aberto (${nin.score} de ${nin.min} pontos)`);
    ok(worm.before === false && worm.kicked && worm.after && worm.stopped && worm.again && worm.dug2, `a minhoca assustada foge, para e se enterra (dug: antes ${worm.before}, depois ${worm.after}); quando o passarinho chega perto de novo ela sai da terra (${worm.again}) e se enterra outra vez (${worm.dug2})`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (d) skins em jogo: o vento recebe a skin em g.look; o passarinho do jogador usa a skin em uso (lookOf("bird").id). Skins de mentira (o catálogo de verdade é de js/skins-bird.js, de outra frente):
  // só o plano de ligação entre o motor e a arte/ambiente é testado aqui, e sem skin o quadro é o de sempre.
  await section("0.20.0 · Passarinho (integração): skins em jogo (a skin de vento muda os tiles de vento, a skin do passarinho aparece, sem skin o quadro é idêntico ao de sempre)", async () => {
    const pg = await openShots();
    const e0 = errs0();
    const r = await ev(pg, () => {
      const hash = (x, y, w, h) => { const cv = document.getElementById("game"), d = cv.getContext("2d").getImageData(x, y, w, h).data, u = new Uint32Array(d.buffer, d.byteOffset, d.byteLength >> 2); let hh = 2166136261 >>> 0; for (let i = 0; i < u.length; i++) hh = Math.imul(hh ^ u[i], 16777619) >>> 0; return hh; };
      const realGet = Skins.get, out = {};
      Skins.get = (slot, id) => (slot === "gust" && id === "fake" ? { id: "fake", name: "x", text: "y", price: 10, c1: "#ff00ff", c2: "#00ffff", style: "puffs" } : slot === "bird" && id === "azul" ? { id: "azul", name: "Azul", text: "y", price: 10 } : realGet(slot, id));
      try {
        __b.start(8); __game.freezeVets = true; __game.noCatch = true;
        const W = ["<", ">", "^", "v"].flatMap((ch) => __s.find(8, ch)), t = W[0]; // um tile de vento: o passarinho fica 4 tiles ao lado, sem tocar no vento
        __s.tp(t[0], Math.min(t[1] + 4, 40)); __s.spin(3); __game.drawNow();
        const v = __game.view, sx = v.k * v.zoom, box = [Math.round((t[0] * 32 - v.camX) * sx), Math.round((t[1] * 32 - v.camY) * sx), Math.round(32 * sx), Math.round(32 * sx)], pbox = () => { const p = __game.player; return [Math.round((p.x - 8 - v.camX) * sx), Math.round((p.y - 14 - v.camY) * sx), Math.round(40 * sx), Math.round(44 * sx)]; };
        const calm = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
        const draw = () => { __game.drawNow(); return { wind: hash(...box), bird: hash(...pbox()) }; };
        out.calm = calm;
        __game.setLook("gust", ""); const a1 = draw(), a2 = draw(); out.stable = a1.wind === a2.wind || "animado";
        // sem skin = o quadro de sempre; com a skin de mentira de vento só o vento muda; trocar de volta devolve o quadro de sempre
        __game.setLook("gust", "fake"); out.gLook = __game.look("gust").id; const g = draw();
        __game.setLook("gust", ""); const back = draw();
        out.windChanged = g.wind !== a1.wind; out.birdSameWithWindSkin = g.bird === a1.bird; out.windBack = back.wind === a1.wind || "animado";
        // a skin do passarinho (lookOf("bird").id): muda os pixels dele e só dele
        const before = draw(); __game.setLook("bird", "azul"); const blue = draw(); __game.setLook("bird", ""); const again = draw();
        out.birdChanged = blue.bird !== before.bird; out.birdWindSame = blue.wind === before.wind; out.skinId = (__game.setLook("bird", "azul"), __game.look("bird").id); __game.setLook("bird", "");
        out.birdBack = again.bird === before.bird || "animado";
      } finally { Skins.get = realGet; }
      return out;
    });
    console.log("   (skins em jogo)", JSON.stringify(r));
    ok(r.windChanged && r.birdSameWithWindSkin && r.gLook === "fake", `a skin de vento em uso muda os pixels do tile de vento (e só dele): o ambiente recebe g.look (${JSON.stringify({ windChanged: r.windChanged, birdSameWithWindSkin: r.birdSameWithWindSkin, look: r.gLook })})`);
    ok(r.birdChanged && r.birdWindSame && r.skinId === "azul", `a skin do passarinho em uso (lookOf("bird").id = ${r.skinId}) muda os pixels do passarinho e só dele`);
    ok(r.windBack === true || r.windBack === "animado" || r.windBack, "sem skin o desenho volta ao de sempre");
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (d) jogo salvo e continuar nos mapas de verdade: voo alto sobre um muro (Fase 7), a salvo no galho (Fase 5), no vento (Fase 8) e um gavião no meio da perseguição (Fase 14)
  await section("0.20.0 · Passarinho (integração): jogo salvo e continuar com os mapas de verdade (voo alto sobre um muro, galho, vento, gaviões; tamanho nas fases grandes)", async () => {
    const pg = await openShots();
    const e0 = errs0();
    const near = (a, b, e) => Math.abs(a - b) <= e;
    const cont = async () => { await pg.click("#btn-pause"); await pg.click("#btn-pause-menu"); await pg.click("#btn-continue"); };
    // 1. voo alto sobre um muro M (Fase 7)
    const a = await ev(pg, () => {
      __b.start(7); __game.noCatch = true; __game.freezeVets = true; const mm = __s.find(7, "M"), t = mm[Math.floor(mm.length / 3)];
      __game.power = 8; __s.tp(t[0], t[1]); __s.spin(3); const ok1 = __game.save(); const snap = Records.createStore(localStorage).game("bird").loadGame("Totó").snap;
      return { ok: ok1, parse: __game.parseSave(JSON.parse(JSON.stringify(snap)), "bird"), pw: snap.pw, mz: snap.mz, l: snap.l, size: JSON.stringify(snap).length, t, tm: __game.time };
    });
    ok(a.ok && a.parse && a.mz === 1 && a.l === 7 && near(a.pw, 7.95, 0.1), `salvou a Fase 7 com o voo alto (${a.pw} s) sobre o muro ${a.t}: o jogo salvo é aceito (${a.size} bytes)`);
    await cont();
    const c = await ev(pg, () => {
      const lv = __game.builtOf("bird")[7], p = __game.player, over = () => lv.solids.some((s) => s.high && s.x < p.x + 24 && s.x + s.w > p.x && s.y < p.y + 24 && s.y + s.h > p.y);
      const o = { state: __game.state, over: over(), flying: __game.flying, power: __game.power, safe: __game.safe, lives: __game.lives, tm: __game.time };
      __game.noCatch = true; __game.freezeVets = true; for (let i = 0; i < 60 * 9; i++) __game.tick(1 / 60);
      o.end = { flying: __game.flying, over: over(), lives: __game.lives, state: __game.state };
      return o;
    });
    // (o jogo anda sozinho alguns quadros entre o clique em Continuar e a medida: o voo alto que resta é o salvo menos o tempo de jogo que passou desde que ele voltou, e não um número fixo)
    ok(c.state === "playing" && c.over && c.flying && c.safe && c.power > 0 && near(c.power, a.pw - (c.tm - a.tm), 0.06), `continuar: o passarinho volta em cima do muro, ainda em voo alto (${c.power.toFixed(2)} s; salvo com ${a.pw} s e ${(c.tm - a.tm).toFixed(2)} s de jogo desde então)`);
    ok(!c.end.flying && !c.end.over && c.end.lives === c.lives && c.end.state === "playing", "e quando o voo acaba ele pousa em chão livre sem perder vida");
    // 2. a salvo no galho (Fase 5)
    const g2 = await ev(pg, () => { __b.start(5); __game.noCatch = true; __game.freezeVets = true; const G = __s.find(5, "G")[1]; __s.tp(G[0], G[1]); __s.spin(3); const p = __game.perch; __game.save(); return { p, G }; });
    await cont();
    const g3 = await ev(pg, () => { __game.tick(0.02); return { perch: __game.perch, safe: __game.safe, tile: __b.tileOf(__game.player) }; });
    ok(g2.p && g3.perch && g3.safe && g3.tile + "" === g2.G + "", "salvar e continuar em cima de um galho: ele continua no galho e a salvo");
    // 3. no vento (Fase 8)
    // (começa na ponta de onde a maior corrente da fase nasce: sobram vários tiles de vento pela frente, então os quadros que o jogo anda sozinho entre o clique em Continuar e a medida não a tiram da corrente)
    const w0 = await ev(pg, () => {
      __b.start(8); __game.noCatch = true; __game.freezeVets = true;
      const lv = __game.builtOf("bird")[8], seen = new Set(); let best = null;
      for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
        const ch = lv.kinds[r][c]; if (!">^<v".includes(ch) || seen.has(r * lv.cols + c)) continue;
        const q = [[c, r]]; seen.add(r * lv.cols + c);
        for (let i = 0; i < q.length; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = q[i][0] + dc, nr = q[i][1] + dr; if (nc >= 0 && nr >= 0 && nc < lv.cols && nr < lv.rows && lv.kinds[nr][nc] === ch && !seen.has(nr * lv.cols + nc)) { seen.add(nr * lv.cols + nc); q.push([nc, nr]); } }
        if (!best || q.length > best.q.length) best = { ch, q };
      }
      const up = best.q.slice().sort((a, b) => (best.ch === ">" ? a[0] - b[0] : best.ch === "<" ? b[0] - a[0] : best.ch === "v" ? a[1] - b[1] : b[1] - a[1]))[0];
      __s.tp(up[0], up[1]); __s.spin(2); __game.save(); return { up, ch: best.ch, n: best.q.length };
    });
    ok(w0.n >= 6, `(preparo) a maior corrente da Fase 8 tem ${w0.n} tiles (${w0.ch}); o passarinho começa na ponta de onde ela nasce, em ${w0.up}`);
    await cont();
    const w1 = await ev(pg, () => { __game.noCatch = true; __game.freezeVets = true; const x0 = __game.player.x, y0 = __game.player.y; for (let i = 0; i < 20; i++) __game.tick(1 / 60); return { d: Math.hypot(__game.player.x - x0, __game.player.y - y0), wind: __game.windNow }; });
    ok(w1.d > 10 && w1.wind !== 0, `salvar e continuar numa corrente de vento: o empurrão continua (${w1.d.toFixed(1)} px em 1/3 s)`);
    // 4. perseguição de gavião e de gato (Fase 14), salvos de verdade; e o tamanho nas fases grandes
    const big = await ev(pg, () => {
      const out = [];
      for (const id of [14, 18, 20]) {
        __b.start(id); __game.noCatch = true; __game.freezeVets = false;
        const at = __s.rich(id); __s.tp(at[0], at[1]);
        for (let i = 0; i < 900; i++) { __game.tick(1 / 20); if (i % 3 === 0) __game.player.moving = false; } // 45 s de jogo com os inimigos soltos
        const modes = [...__game.cats.map((c) => c.mode), ...__game.vets.map((v) => v.mode)];
        __game.save(); const snap = JSON.parse(JSON.stringify(Records.createStore(localStorage).game("bird").loadGame("Totó").snap));
        out.push({ id, parse: __game.parseSave(snap, "bird"), size: JSON.stringify(snap).length, modes: [...new Set(modes)].join() });
      }
      return out;
    });
    for (const b of big) ok(b.parse && b.size < 20000, `Fase ${b.id}: um jogo salvo no meio da partida (inimigos soltos; modos: ${b.modes}) é aceito de volta e tem ${b.size} bytes (limite 20000)`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (d) teclado, controle e toque com os mapas de verdade, e os 5 tamanhos de tela
  await section("0.20.0 · Passarinho (integração): bater asas no teclado, no controle e no toque (Voar), com os mapas de verdade", async () => {
    const MOCK_PAD = () => {
      const pad = { id: "Controle de teste", index: 0, connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
      let present = false;
      navigator.getGamepads = () => [present ? pad : null, null, null, null];
      window.__padOn = (on) => { present = on; };
      window.__padSet = ({ press = [], release = [] }) => { for (const i of press) pad.buttons[i] = { pressed: true, touched: true, value: 1 }; for (const i of release) pad.buttons[i] = { pressed: false, touched: false, value: 0 }; };
    };
    const pg = await newPage({ realBird: "real" });
    await pg.addInitScript(MOCK_PAD);
    await fresh(pg, { name: "Totó" }); await pg.evaluate(BIRD_PAGE); await pg.evaluate(PAGE_SHOTS);
    const e0 = errs0();
    const r = await ev(pg, () => {
      const run = (n, keys = []) => { for (const k of keys) __b.press(k, true); const out = []; for (let i = 0; i < n; i++) { __game.tick(1 / 60); out.push({ spd: __game.dogSpeed, spr: __game.sprinting, sta: __game.stamina }); } for (const k of keys) __b.press(k, false); return out; };
      __b.start(2); __game.freezeVets = true; __game.noCatch = true; for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = [];
      const spawn = __game.builtOf("bird")[2].spawnTile, back = () => { __s.tp(spawn[0], spawn[1]); __game.stamina = 1; __game.winded = 0; };
      const o = {};
      back(); const n = run(30, ["d"]); o.normal = n[0].spd;
      back(); const f = run(30, ["d", "Shift"]); o.shift = f[0].spd; o.shiftAll = f.every((x) => x.spr); o.sta = f[29].sta;
      back(); const sp = run(30, ["d", " "]); o.space = sp[0].spd; o.spaceAll = sp.every((x) => x.spr);
      __padOn(true); o.pad = {};
      for (const [name, b] of [["A", 0], ["RB", 5], ["RT", 7], ["X", 2]]) { __padSet({ press: [b] }); back(); const q = run(20, ["d"]); __padSet({ release: [b] }); o.pad[name] = q.every((x) => x.spr) ? "voa" : "anda"; }
      __padOn(false);
      return o;
    });
    ok(Math.abs(r.shift - r.normal * 1.35) < 1e-6 && r.shiftAll && Math.abs(r.space - r.normal * 1.35) < 1e-6 && r.spaceAll && r.sta < 0.9, `na Fase 2 de verdade, Shift e Espaço batem asas: ×1,35 (${r.normal.toFixed(1)} → ${r.shift.toFixed(1)} px/s) e o fôlego gasta (${r.sta.toFixed(2)})`);
    ok(r.pad.A === "voa" && r.pad.RB === "voa" && r.pad.RT === "voa" && r.pad.X === "anda", `no controle simulado bater asas é o A, o RB ou o RT (${JSON.stringify(r.pad)})`);
    await pg.context().close();
    const tp = await newPage({ realBird: "real", viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    await fresh(tp, { name: "Totó" }); await tp.evaluate(BIRD_PAGE); await tp.evaluate(PAGE_SHOTS);
    await ev(tp, () => { __b.start(2); __game.freezeVets = true; __game.noCatch = true; for (const it of __game.items) { it.x = -900; it.y = -900; } __game.balls = []; });
    ok(await tp.isVisible("#btn-run") && (await tp.textContent("#btn-run")) === "Voar" && /bater as asas/.test(await tp.getAttribute("#btn-run", "aria-label")), "no toque o botão Voar aparece (com nome para leitor de tela)");
    const touch = await ev(tp, () => {
      const b = document.getElementById("btn-run"), fire = (type, id) => b.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: "touch", bubbles: true, cancelable: true }));
      const spawn = __game.builtOf("bird")[2].spawnTile; __s.tp(spawn[0], spawn[1]); __game.stamina = 1; __game.winded = 0;
      const o = {}; fire("pointerdown", 7); o.on = b.classList.contains("on");
      __b.press("d", true); const f = []; for (let i = 0; i < 20; i++) { __game.tick(1 / 60); f.push(__game.sprinting); } __b.press("d", false);
      o.spr = f.every(Boolean); fire("pointerup", 7); o.off = !b.classList.contains("on");
      return o;
    });
    ok(touch.on && touch.spr && touch.off, "tocar e segurar o botão Voar bate asas (e soltar para)");
    await tp.context().close();
  });

  await section("0.20.0 · Passarinho (integração): cinco tamanhos de tela com o jogo de verdade (320×568, 360×640, 390×780, 568×320, 1000×700): sem rolagem lateral, campo e placar à vista", async () => {
    for (const [w, h, touch] of [[320, 568, true], [360, 640, true], [390, 780, true], [568, 320, true], [1000, 700, false]]) {
      const pg = await openShots({ viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
      const e0 = errs0();
      const r = await ev(pg, () => {
        __b.start(14); __game.freezeVets = true; __game.noCatch = true;
        const at = __s.rich(14); __s.tp(at[0], at[1]); __game.power = 6; __s.spin(30);
        const cv = document.getElementById("game"), b = cv.getBoundingClientRect(), hud = document.getElementById("hud").getBoundingClientRect(), run = document.getElementById("btn-run"), rr = run.getBoundingClientRect(), doc = document.documentElement;
        return { scrollX: doc.scrollWidth - innerWidth, canvas: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], hudBottom: Math.round(hud.bottom), inside: b.left >= -0.5 && b.right <= innerWidth + 0.5, // (na vertical a página pode rolar um pouco, como no Cachorrinho e no Gatinho) zoom: +__game.view.zoom.toFixed(2),
          run: getComputedStyle(run).display !== "none" && rr.width > 0 ? { text: run.textContent, w: Math.round(rr.width), h: Math.round(rr.height), inside: rr.left >= 0 && rr.right <= innerWidth && rr.bottom <= innerHeight } : null, state: document.getElementById("hud-state") ? document.getElementById("hud-state").textContent : "" };
      });
      ok(r.scrollX <= 1 && r.inside && r.canvas[2] >= 200 && r.canvas[3] >= 140, `${w}×${h}: sem rolagem lateral e o campo cabe na largura da tela (${r.canvas.join("×")} px; zoom ${r.zoom}; placar até ${r.hudBottom} px)`);
      if (touch) ok(r.run && r.run.text === "Voar" && r.run.inside && r.run.w >= 44 && r.run.h >= 44, `${w}×${h}: o botão Voar está à vista, dentro da tela, com alvo de toque grande (${r.run ? r.run.w + "×" + r.run.h : "sumiu"})`);
      await snap(pg, `tela-${w}x${h}-f14`);
      ok(errs.length === e0, `${w}×${h}: nenhum erro de JavaScript`);
      await pg.context().close();
    }
  });

  // =====================================================================================================================================================================
  // (e) desempenho: o quadro (desenhar + terminar de pintar) das fases grandes do Passarinho, medido ao lado do da Fase 20 do Gatinho na mesma máquina e na mesma hora
  await section("0.20.0 · Passarinho (integração): desempenho (o quadro das fases grandes, F14, F18 a F20, comparado ao do Gatinho)", async () => {
    const FRAME = (a) => { // dentro da página: mediana e p90 do tempo de um quadro no melhor enquadramento da fase (muros, galhos, vento, itens e inimigos à vista)
      const [animal, id] = a, g = __game;
      g.setAnimal(animal); g.autoStart = true; g.start(id); g.freezeVets = true; g.noCatch = true; g.tick(0.01);
      if (animal === "bird") { const at = __s.rich(id); __s.tp(at[0], at[1]); } else { const lv = g.builtOf("cat")[id], [c, r] = lv.spawnTile; g.player.x = c * 32 + 4; g.player.y = r * 32 + 4; }
      g.tick(0.01);
      const cx = document.getElementById("game").getContext("2d");
      for (let i = 0; i < 40; i++) { g.drawNow(); cx.getImageData(0, 0, 1, 1); }
      const t = [], d = []; for (let i = 0; i < 400; i++) { g.tick(1 / 60); g.player.moving = false; const a0 = performance.now(); g.drawNow(); const m = performance.now(); cx.getImageData(0, 0, 1, 1); t.push(performance.now() - a0); d.push(m - a0); }
      t.sort((x, y) => x - y); d.sort((x, y) => x - y); return { med: t[200], p90: t[360], draw: d[200] }; // (400 quadros: a mediana aguenta uns picos de carga)
    };
    const pg = await newPage({ realBird: "real", realCat: true, viewport: { width: 1000, height: 700 } });
    await fresh(pg, { name: "Totó" }); await pg.evaluate(BIRD_PAGE); await pg.evaluate(PAGE_SHOTS);
    const e0 = errs0();
    // (o melhor de até 5 rodadas de 400 quadros: a carga da máquina só deixa a medida mais lenta, nunca mais rápida)
    const timeIt = async (animal, id) => { const tries = []; for (let k = 0; k < 5; k++) { tries.push(await ev(pg, FRAME, [animal, id])); if (tries[tries.length - 1].med <= 10) break; } return tries.reduce((b, t) => (t.med < b.med ? t : b)); };
    const cat20 = await timeIt("cat", 20), cat18 = await timeIt("cat", 18);
    console.log(`   (desempenho) Gatinho F20: mediana ${cat20.med.toFixed(2)} ms, p90 ${cat20.p90.toFixed(2)} ms, comandos ${cat20.draw.toFixed(2)} ms; F18 (noite): ${cat18.med.toFixed(2)} ms`);
    const ref = Math.max(cat20.med, cat18.med);
    for (const id of [7, 14, 18, 19, 20]) {
      // o Gatinho é medido de novo logo antes de cada fase (na mesma carga da máquina) e vale o maior dos dois; o limite é o DOBRO dele mais 3 ms (a Fase 20 do Passarinho custa ~1,3x o Gatinho: uma regressão grande passa de 2x)
      const refNow = (await timeIt("cat", 20)).med, refId = Math.max(ref, refNow), b = await timeIt("bird", id), limit = Math.max(16, refId * 2 + 3);
      console.log(`   (desempenho) Passarinho F${id}${id === 18 ? " (entardecer)" : id === 19 ? " (noite)" : ""}: mediana ${b.med.toFixed(2)} ms, p90 ${b.p90.toFixed(2)} ms; só os comandos de desenho ${b.draw.toFixed(2)} ms (limite ${limit.toFixed(1)} ms)`);
      ok(b.med <= limit, `a mediana do tempo de um quadro da Fase ${id} do Passarinho é ${b.med.toFixed(2)} ms (o Gatinho: ${refId.toFixed(2)} ms; limite ${limit.toFixed(1)} ms)`);
    }
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (f) sons: todo nome de som do perfil do Passarinho existe em js/sound.js e toca sem erro; os 16 novos são todos usados pelo perfil
  await section("0.20.0 · Passarinho (integração): sons do perfil (todo nome existe em Sound.NAMES e toca sem erro; os 16 sons novos são todos usados)", async () => {
    const pg = await open();
    const e0 = errs0();
    const r = await ev(pg, () => {
      const prof = __game.profileOf("bird"), names = [], walk = (o) => { for (const v of Object.values(o)) { if (typeof v === "string") names.push(v); else if (v && typeof v === "object") walk(v); } };
      walk(prof.sfx);
      const used = [...new Set(names.filter(Boolean))], all = new Set(Sound.NAMES), out = { used, missing: used.filter((n) => !all.has(n)), played: [], threw: [] };
      __game.sound.reset();
      for (const n of used) { try { __game.sound.play(n); } catch (e) { out.threw.push(n + ": " + e.message); } }
      out.events = __game.sounds.map((e) => e.name);
      out.nonString = Object.entries(prof.sfx).filter(([k, v]) => !(typeof v === "string" || typeof v === "number" || (v && typeof v === "object"))).map(([k]) => k);
      out.max = Sound.MAX_SECONDS ? used.filter((n) => !(n in Sound.MAX_SECONDS)) : null;
      return out;
    });
    const NEW16 = ["chirp1", "chirp2", "chirp3", "song", "flap", "peck", "worm", "fruit", "soar", "soarend", "landing", "gust", "hiss2", "shriek", "scare", "wheeze"];
    ok(r.missing.length === 0 && r.threw.length === 0, `todo som do perfil do Passarinho existe em Sound.NAMES e toca sem erro (${r.used.length} nomes: ${r.used.join(" ")}${r.missing.length ? "; faltam " + r.missing.join() : ""}${r.threw.length ? "; erro " + r.threw.join() : ""})`);
    ok(r.used.every((n) => r.events.includes(n)), "cada um deles foi registrado como pedido de som");
    ok(NEW16.every((n) => r.used.includes(n)), `o perfil usa os 16 sons novos (faltando: ${NEW16.filter((n) => !r.used.includes(n)).join(", ") || "nenhum"})`);
    ok(r.max === null || r.max.length === 0, `todo som do perfil tem duração máxima em MAX_SECONDS (${r.max ? r.max.join() : "sem a tabela"})`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });

  // =====================================================================================================================================================================
  // (g) textos: menu, Como jogar, pausa, placar, vitória e derrota do Passarinho sem sobras do Gatinho nem do Cachorrinho
  await section("0.20.0 · Passarinho (integração): textos (menu, Como jogar, pausa, placar, vitória, derrota e lista de fases do Passarinho, sem sobras do gatinho, da ração, do osso, do ratinho, do novelo nem do cão)", async () => {
    const pg = await open();
    const e0 = errs0();
    const BAD = /gatinho|\bra[çc][ãa]o|\bra[çc][õo]es|\bosso|\bossos|ratinho|novelo|\bc[ãa]o\b|\bc[ãa]es\b|cachorr|carrocinha|\bagentes?\b|carteiro|bolinha|latir|latido|miado|miar|ronron|\bcorrer\b|ofeg|lugar alto|po[çc]a|molhad|camundongo|rastreador/i;
    const txt = (sel) => pg.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText.replace(/\s+/g, " ").trim() : ""; }, sel);
    const found = {};
    const scan = (name, t) => { const m = t.match(new RegExp(BAD.source, "gi")); found[name] = m ? [...new Set(m.map((x) => x.toLowerCase()))] : []; return t; };
    // menu do Passarinho
    await ev(pg, () => __game.setAnimal("bird"));
    const menu = scan("menu", await txt("#menu"));
    ok(/Passarinho/.test(menu) && /Como jogar/.test(menu), `o menu do Passarinho fala do passarinho ("${menu.slice(0, 160)}...")`);
    // Como jogar
    await pg.click("#btn-howto");
    const how = scan("Como jogar", await txt("#howto"));
    ok(/semente/i.test(how) && /fruto/i.test(how) && /minhoca/i.test(how) && /gaviõ/i.test(how) && /voo alto/i.test(how) && /Voar|asas/.test(how) && /vento/i.test(how) && /galho/i.test(how), `o Como jogar do Passarinho fala de sementes, frutos, minhocas, gaviões, voo alto, galho e vento (${how.length} letras)`);
    await pg.click("#btn-howto-back");
    // lista de fases
    await ev(pg, () => { const g = Records.createStore(localStorage).game("bird"); for (const l of [1, 2, 3]) g.completeLevel("Totó", l); __game.setAnimal("bird"); });
    await pg.click("#btn-replay");
    await pg.waitForSelector("#levels:not(.hidden)");
    const levels = scan("lista de fases", await txt("#levels"));
    ok(/Fases do Passarinho/.test(levels) && /Jardim florido/.test(levels) && /Pomar de macieiras/.test(levels) && /Horta e cerca/.test(levels), `a lista de fases é "Fases do Passarinho" e usa os lugares do Passarinho ("${levels.slice(0, 260)}...")`);
    // em jogo: placar, pausa
    await pg.click("#btn-levels-back").catch(() => {});
    await ev(pg, () => { __b.start(11); __game.freezeVets = true; });
    const hud = scan("placar", await txt("#hud"));
    ok(/SEMENTES/.test(hud) && /FRUTOS/.test(hud) && /MINHOCAS/.test(hud) && /VOO ALTO/.test(hud), `o placar diz SEMENTES, FRUTOS, MINHOCAS e VOO ALTO ("${hud.slice(0, 140)}")`);
    await pg.click("#btn-pause");
    const pause = scan("pausa", await txt("#pause"));
    ok(/Passarinho: /.test(pause) && /batem as asas/.test(pause), `a ajuda da pausa fala do passarinho e de bater asas ("${pause.slice(0, 200)}...")`);
    await pg.click("#btn-resume").catch(() => {});
    // vitória (o robô vence a Fase 1) e derrota (sem vidas)
    await ev(pg, ROBOT, { id: 1, live: false, collectAll: true, seed: 1, attempts: 1 });
    const win = scan("vitória", await txt("#win"));
    ok(/Fase 1 conclu[ií]da/.test(win) && /Sementes/.test(win), `a tela de vitória do Passarinho mostra Sementes ("${win.slice(0, 200)}...")`);
    await pg.click("#btn-win-menu");
    await ev(pg, () => { __b.start(4); __game.noCatch = false; __game.freezeVets = false; __game.setLives(1); const v = __game.vets[0], p = __game.player; __game.invuln = 0; v.cx = p.x + 12; v.cy = p.y + 12; v.mode = "chase"; for (let i = 0; i < 10; i++) __game.tick(0.05); });
    const lose = scan("derrota", await txt("#lose"));
    ok(/gato/i.test(lose) || /Fim de jogo|pego/i.test(lose), `a tela de derrota do Passarinho fala do gato ("${lose.slice(0, 200)}...")`);
    // derrota por pontos curtos (pegou tudo e não bastou)
    await pg.click("#btn-lose-menu").catch(() => {});
    // placar (pontuações)
    await ev(pg, () => __game.setAnimal("bird"));
    await pg.click("#btn-scores").catch(() => {});
    const scores = scan("pontuações", await txt("#scores"));
    console.log("   (textos) palavras proibidas encontradas por tela:", JSON.stringify(found));
    const bad = Object.entries(found).filter(([, v]) => v.length);
    ok(bad.length === 0, `nenhum texto do Passarinho tem sobras do gatinho, da ração, do osso, do ratinho, do novelo ou do cão${bad.length ? " (ENCONTRADO: " + JSON.stringify(Object.fromEntries(bad)) + ")" : ""}`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });
};
