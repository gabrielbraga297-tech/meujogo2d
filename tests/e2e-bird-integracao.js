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
      start(id = 1, o, seed = 20261029 + id) { g.setAnimal("bird"); g.setRand(mul(seed)); g.start(id, o); g.autoStart = true; },
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
      ok(r.state === "won" && r.attempts <= 2 && open, `Fase ${id}: o robô VENCE com os inimigos soltos em ${r.attempts} tentativa${r.attempts > 1 ? "s" : ""} (${r.time.toFixed(0)} s de jogo, ${r.collected}/${r.seedsTotal} sementes, ${r.bones}/${r.bonesTotal} frutos${r.mission ? ", missão " + JSON.stringify(r.mission) : ""}, ${r.score} pontos${r.minPoints ? " (mínimo " + r.minPoints + ")" : ""}); vidas perdidas ${r.livesLost}${r.hits.length ? " (" + r.hits.map((h) => h.by + " aos " + h.t + " s").join(", ") + ")" : ""}; ${r.stats.mTilesCrossed} travessias de muro em voo alto, ${(r.stats.perchFrames / 60).toFixed(0)} s em galhos, ${(r.stats.windFrames / 60).toFixed(0)} s no vento`);
      ok(r.saves.bad === 0 && r.saves.none === 0 && r.saves.maxSize < 20000, `Fase ${id}: ${r.saves.n} jogos salvos no meio da partida do robô, todos aceitos de volta (maior: ${r.saves.maxSize} bytes de 20000)${r.saves.firstBad ? " PRIMEIRO RECUSADO " + JSON.stringify(r.saves.firstBad) : ""}`);
    }
    const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
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
};
