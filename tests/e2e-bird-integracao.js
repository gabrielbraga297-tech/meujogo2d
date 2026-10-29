// Seções do Passarinho (0.20.0): a INTEGRAÇÃO. Aqui o jogo roda com os arquivos DE VERDADE juntos (js/bird-levels.js, js/bird-art.js, js/bird-themes*.js, o motor de js/game.js e os sons de js/sound.js), sem as fixtures
// do motor: todas as páginas abrem com `realBird: "real"` (veja o gancho em tests/e2e.js). Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só estas: node tests/e2e.js "Passarinho (integração)"   (uma seção: node tests/e2e.js "Passarinho (integração): mapas")
// Capturas de tela (para ler com os olhos): BIRD_SHOTS=/pasta node tests/e2e.js "Passarinho (integração): capturas"
const fs = require("fs");
const path = require("path");

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
};
