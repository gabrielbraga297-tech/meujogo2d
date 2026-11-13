// Testes do MAPA LIVRE (0.25.0 em diante), sem navegador. Uso: node tests/free-map.test.js
// Pedido do dono (13/11/2026): (1) nada fica perto de paredes e muros (confunde e fica feio); (2) os bonecos andam o mapa todo em cada fase, sem ficar presos ou quase parados, e só NASCEM em lugares diferentes.
// Cada bichinho é uma atualização (20 fases corrigidas e conferidas): DELIVERED lista os que já foram entregues. O Passarinho (0.27.0) entra aqui quando for entregue.
// Roda o js/game.js de verdade no Node (tests/engine-rig.js). O que o teste NÃO prova: que uma pessoa acha o resultado bonito ou justo (isso é do dono).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const rig = require("./engine-rig.js");

const ROOT = path.join(__dirname, "..");
const DELIVERED = ["dog", "cat"]; // bichinhos com o mapa livre entregue: 0.25.0 Cachorrinho; 0.26.0 Gatinho; (0.27.0 Passarinho)
// Limites por bichinho. Cachorrinho: posições escolhidas por tools/spawns/spread.js. Gatinho: pelo gerador dos mapas (tools/catmaze/cat_core.py, place_posts), que desce a distância do início e da saída em degraus nos mapas pequenos e densos.
const LIM = { dog: { pair: 10, startPlus: 5, startMin: 11, exit: 9, roomyFrom: 1 }, cat: { pair: 6, startPlus: 2, startMin: 8, exit: 5, roomyFrom: 4 } }; // (roomyFrom: a partir de qual fase os postos precisam de folga em volta; a Fase 3 do Gatinho, de 25 × 18, tem tantas caixas e poças que não sobra lugar aberto)
const GAME = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");

let failed = 0, total = 0;
function test(name, fn) {
  total++;
  try { const note = fn(); console.log("OK   " + name + (note ? "\n     " + note : "")); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e && e.message ? e.message : e).split("\n").slice(0, 14).join("\n     ")); }
}

const B = rig.boot({ mathSeed: 20251113 });
const g = B.g;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const euclid = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const levelsOf = (animal) => { g.setAnimal(animal); const L = g.builtOf(animal); return Object.keys(L).map(Number).sort((a, b) => a - b).map((id) => L[id]); };

// o tile tem folga? nenhum dos 8 vizinhos é parede/caixa/van/muro/obstáculo baixo/lugar alto ou trilho de bloco (fora do mapa conta como parede)
function roomy(lv, c, r) {
  const track = lv.__track || (lv.__track = new Set(lv.trackTiles.map(([tc, tr]) => tr * lv.cols + tc)));
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const nc = c + dc, nr = r + dr;
    if (nc < 0 || nr < 0 || nc >= lv.cols || nr >= lv.rows || !lv.floorFree[nr][nc] || track.has(nr * lv.cols + nc)) return false;
    if (lv.catMode && !lv.walk[nr][nc]) return false;
  }
  return true;
}
function reachable(lv) { // tiles alcançáveis a pé do início do bichinho (sem contar os blocos)
  const W = lv.cols, seen = new Set([lv.spawnTile[1] * W + lv.spawnTile[0]]), q = [lv.spawnTile];
  for (let i = 0; i < q.length; i++) for (const [dc, dr] of DIRS) { const c = q[i][0] + dc, r = q[i][1] + dr; if (c < 0 || r < 0 || c >= W || r >= lv.rows || !lv.walk[r][c] || seen.has(r * W + c)) continue; seen.add(r * W + c); q.push([c, r]); }
  return q;
}
const stepsFromDog = (lv, f) => { // passos a pé do cachorrinho até o inimigo `f`, pelo chão do inimigo (os gatos e rastreadores usam catWalk)
  const grid = f.cat ? lv.catWalk : lv.walk, W = lv.cols, a = [Math.floor((g.player.x + 12) / 32), Math.floor((g.player.y + 12) / 32)], goal = [Math.floor(f.cx / 32), Math.floor(f.cy / 32)];
  const d = new Map([[a[1] * W + a[0], 0]]), q = [a];
  for (let i = 0; i < q.length; i++) { const [c, r] = q[i], k = d.get(r * W + c); if (c === goal[0] && r === goal[1]) return k; for (const [dc, dr] of DIRS) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= W || nr >= lv.rows || !grid[nr][nc] || d.has(nr * W + nc)) continue; d.set(nr * W + nc, k + 1); q.push([nc, nr]); } }
  return 99;
};
const roomyAvailable = (lv) => { // quantos tiles com folga o sorteio tem à disposição: alcançáveis do início (sem contar os blocos) a 4+ passos dele, fora da saída e dos tiles proibidos, e a 2+ tiles dos postos (a segunda faixa do sorteio; a primeira pede 4+)
  if (lv.__ra !== undefined) return lv.__ra;
  const W = lv.cols, dist = new Map([[lv.spawnTile[1] * W + lv.spawnTile[0], 0]]), q = [lv.spawnTile], no = new Set([...lv.exitTiles, ...lv.avoidTiles].map(([c, r]) => r * W + c));
  for (let i = 0; i < q.length; i++) { const [c, r] = q[i], d = dist.get(r * W + c); for (const [dc, dr] of DIRS) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= W || nr >= lv.rows || !lv.walk[nr][nc] || dist.has(nr * W + nc)) continue; dist.set(nr * W + nc, d + 1); q.push([nc, nr]); } }
  return (lv.__ra = q.filter(([c, r]) => !no.has(r * W + c) && dist.get(r * W + c) >= 4 && lv.postTiles.every((v) => Math.hypot(c - v[0], r - v[1]) >= 2) && roomy(lv, c, r)).length);
};
const each = (animal, fn) => { const bad = []; for (const lv of levelsOf(animal)) { try { fn(lv); } catch (e) { bad.push(`${animal} Fase ${lv.id}: ${e.message}`); } } if (bad.length) throw new Error(bad.slice(0, 8).join("\n")); };

test("a chave FREE_MAP de js/game.js liga o mapa livre só nos bichinhos já entregues", () => {
  const m = GAME.match(/const FREE_MAP = \{([^}]*)\}/);
  assert.ok(m, "FREE_MAP não encontrada em js/game.js");
  const on = [...m[1].matchAll(/(\w+):\s*(true|false)/g)].filter((x) => x[2] === "true").map((x) => x[1]).sort();
  assert.deepStrictEqual(on, DELIVERED.slice().sort());
});

for (const animal of DELIVERED.filter((a) => !process.env.ONLY_PET || a === process.env.ONLY_PET)) { // (ONLY_PET=cat roda só um bichinho, para iterar mais rápido)
  test(`${animal}: rações, ossos e bolinhas nunca ficam colados em parede, caixa, muro ou trilho de bloco (20 fases × 12 sorteios)`, () => {
    let n = 0;
    each(animal, (lv) => {
      for (let seed = 1; seed <= 12; seed++) {
        g.autoStart = true; g.setRand(rig.lcg(seed * 977 + lv.id)); g.start(lv.id, { animal });
        const all = [...g.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32]), ...g.balls.map((b) => [Math.floor(b.x / 32), Math.floor(b.y / 32)])];
        let ok = 0; for (const [c, r] of all) { n++; if (roomy(lv, c, r)) ok++; }
        // todos com folga; só num mapa apertado (poucos tiles com folga, como a Fase 6 do Gatinho) sobram itens fora dela: ficam com folga todos os que couberem
        assert.ok(ok === Math.min(all.length, roomyAvailable(lv)), `sorteio ${seed}: ${ok} de ${all.length} itens com folga (havia ${roomyAvailable(lv)} tiles com folga à disposição)`);
        assert.strictEqual(g.items.length, lv.rations + lv.bones, "a quantidade de itens da fase mudou");
      }
    });
    return `${n} itens conferidos`;
  });

  test(`${animal}: depois de perder uma vida as rações que faltam mudam de lugar e continuam com folga`, () => {
    let n = 0;
    each(animal, (lv) => {
      if (![1, 4, 8, 11, 15, 20].includes(lv.id)) return;
      for (let seed = 1; seed <= 4; seed++) {
        g.autoStart = true; g.noCatch = false; g.setRand(rig.lcg(seed * 31 + lv.id)); g.start(lv.id, { animal, lives: 3 });
        const before = g.items.map((it) => it.x + "," + it.y).join(";");
        g.vets[0].cx = g.player.x + 12; g.vets[0].cy = g.player.y + 12; // um agente em cima do jogador: perde uma vida
        g.tick(1 / 60); g.tick(1 / 60);
        assert.ok(g.livesLost >= 1, "a vida não foi perdida");
        const rest = g.items.filter((it) => !it.taken); let ok = 0;
        for (const it of rest) { n++; if (roomy(lv, (it.x - 8) / 32, (it.y - 8) / 32)) ok++; }
        assert.ok(ok >= Math.min(rest.length, roomyAvailable(lv) - 4), `sorteio ${seed}: só ${ok} de ${rest.length} itens sorteados de novo com folga (havia ${roomyAvailable(lv)} tiles com folga)`); // (as rações já pegas e o cachorrinho renascendo no lugar tiram alguns tiles: folga de 4)
        assert.notStrictEqual(g.items.map((it) => it.x + "," + it.y).join(";"), before, "os itens não mudaram de lugar");
      }
    });
    return `${n} itens conferidos`;
  });

  test(`${animal}: cada agente e cada gato nasce num tile diferente, com folga, longe do início do cachorrinho e da saída, e espaçado dos outros`, () => {
    each(animal, (lv) => {
      const sp = [...lv.vetSpawns, ...lv.catSpawns];
      assert.strictEqual(new Set(sp.map((t) => t.join(","))).size, sp.length, "dois inimigos no mesmo tile");
      if (lv.id >= LIM[animal].roomyFrom) for (const t of sp) assert.ok(roomy(lv, t[0], t[1]), `inimigo em ${t} encostado numa parede`);
      let min = Infinity; for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) min = Math.min(min, euclid(sp[i], sp[j]));
      const need = lv.id === 2 && animal === "cat" ? 6 : LIM[animal].pair; // (Cachorrinho: de 12,0 a 30,4 tiles entre dois inimigos; Gatinho: de 6,0 a 23,0, nos mapas com pouco chão aberto as Fases 2, 6 e 18 ficam em 6)
      assert.ok(sp.length < 2 || min >= need, `dois inimigos a ${min.toFixed(1)} tiles um do outro (mínimo ${need})`);
      const fromStart = Math.min(...sp.map((t) => euclid(t, lv.spawnTile)));
      assert.ok(fromStart >= lv.alertTiles + LIM[animal].startPlus && fromStart >= LIM[animal].startMin, `um inimigo nasce a ${fromStart.toFixed(1)} tiles do jogador (alerta ${lv.alertTiles})`);
      const fromExit = Math.min(...sp.flatMap((t) => lv.exitTiles.map((e) => euclid(t, e))));
      assert.ok(fromExit >= LIM[animal].exit, `um inimigo nasce a ${fromExit.toFixed(1)} tiles da saída`);
      assert.ok(sp.every(([c, r]) => lv.walk[r][c]), "inimigo fora do chão");
    });
  });

  if (animal === "dog") test("dog: a ferramenta tools/spawns/spread.js (que escolheu os pontos de nascimento) está em dia com o js/game.js", () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, "tools/spawns/spread.js"), "--check"], { encoding: "utf8" });
    assert.strictEqual(r.status, 0, (r.stdout || "") + (r.stderr || ""));
  });

  test(`${animal}: com os inimigos cegos (só patrulha), cada inimigo percorre o mapa todo (≥ 3 dos 4 cantos e boa parte dos quadros de 4 × 4 tiles) e o grupo cobre quase tudo`, () => {
    const dt = 1 / 30, rows = [];
    each(animal, (lv) => {
      const SECS = lv.id > 10 ? 600 : 300; // (os mapas grandes das Fases 11 a 20 pedem mais tempo: em 5 min o inimigo que menos andou na Fase 20 do Cachorrinho passou por 31% dos quadros e por 2 dos 4 cantos; em 10 min, mais de 55%)
      g.autoStart = true; g.setRand(rig.lcg(2000 + lv.id)); g.start(lv.id, { animal }); g.setRand(rig.lcg(11 + lv.id)); g.freezeVets = false; g.noCatch = true; g.blind = true; // inimigos cegos e surdos: ninguém persegue, o que se mede é só a patrulha
      const W = lv.cols, CW = Math.ceil(W / 4), cells = new Set(reachable(lv).map(([c, r]) => Math.floor(r / 4) * CW + Math.floor(c / 4)));
      const foes = [...g.vets, ...g.cats], mine = foes.map(() => new Set()), tiles = reachable(lv), rnd = rig.lcg(7 * lv.id + 3);
      for (let t = 0; t < SECS / dt; t++) {
        if (t % 600 === 0) { const [c, r] = tiles[Math.floor(rnd() * tiles.length)]; g.player.x = c * 32 + 4; g.player.y = r * 32 + 4; } // o jogador anda pelo mapa (a cada 20 s vai a outro lugar): os gatos caçadores patrulham por perto dele
        g.tick(dt);
        foes.forEach((f, i) => mine[i].add(Math.floor(f.cy / 32 / 4) * CW + Math.floor(f.cx / 32 / 4)));
      }
      const solo = mine.map((s) => s.size / cells.size), union = new Set(); mine.forEach((s) => s.forEach((k) => union.add(k)));
      const quad = (k) => { const c = (k % CW) * 4, r = Math.floor(k / CW) * 4; return (c < W / 2 ? 0 : 1) + (r < lv.rows / 2 ? 0 : 2); };
      const allQuads = new Set([...cells].map(quad));
      const minSolo = Math.min(...solo), u = union.size / cells.size;
      rows.push(`F${lv.id}: pior ${(minSolo * 100).toFixed(0)}% · grupo ${(u * 100).toFixed(0)}%`);
      assert.ok(u >= 0.9, `o grupo só cobriu ${(u * 100).toFixed(0)}% dos quadros em ${SECS} s`);
      const need = lv.id <= 3 ? 0.45 : 0.25; // em ${SECS} s um agente não dá a volta inteira em um mapa enorme; o que importa é que ele não fique numa faixa (e os cantos, abaixo)
      mine.forEach((s, i) => {
        assert.ok(solo[i] >= need, `o inimigo ${i} só passou por ${(solo[i] * 100).toFixed(0)}% dos quadros (mínimo ${(need * 100).toFixed(0)}%)`);
        const qs = new Set([...s].map(quad));
        assert.ok(qs.size >= Math.min(3, allQuads.size), `o inimigo ${i} ficou em ${qs.size} dos ${allQuads.size} cantos do mapa`);
      });
    });
    g.blind = false;
    return rows.join(" | ");
  });

  test(`${animal}: com o jogador passeando e pegando ossos, ninguém fica parado mais de 4,5 s (fora gelo, colado no cachorrinho e assustado encurralado com o cachorrinho a menos de 9 quadrados)`, () => {
    const SECS = 200, dt = 1 / 30, worst = [];
    each(animal, (lv) => {
      g.autoStart = true; g.setRand(rig.lcg(500 + lv.id)); g.start(lv.id, { animal }); g.setRand(rig.lcg(9 + lv.id)); g.freezeVets = false; g.noCatch = true;
      const tiles = reachable(lv), rnd = rig.lcg(31 * lv.id + 5), foes = [...g.vets, ...g.cats], pos = foes.map(() => null), run = foes.map(() => 0);
      let w = 0;
      for (let t = 0; t < SECS / dt; t++) {
        if (t % 600 === 300) { const b = g.items.find((it) => it.bone && !it.taken); if (b) { g.player.x = b.x - 4; g.player.y = b.y - 4; } }
        else if (t % 180 === 0) { const [c, r] = tiles[Math.floor(rnd() * tiles.length)]; g.player.x = c * 32 + 4; g.player.y = r * 32 + 4; }
        g.tick(dt);
        foes.forEach((f, i) => {
          const dog = Math.hypot(f.cx - (g.player.x + 12), f.cy - (g.player.y + 12)), p = [f.cx, f.cy];
          const legit = g.fx.ice > 0 || (f.mode === "chase" && dog < 80) || (f.mode === "flee" && dog < 9 * 32);
          if (pos[i] && !legit && Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1]) < 0.01) {
            run[i]++;
            // assustado num beco cuja única saída passa perto do cachorrinho: com o cachorrinho a 12 passos ou menos (pelo chão do inimigo) esperar ali é a única saída
            if (run[i] === 100 && f.mode === "flee" && stepsFromDog(lv, f) <= 12) run[i] = -1e9;
            w = Math.max(w, run[i]);
          } else run[i] = 0;
          pos[i] = p;
        });
      }
      worst.push(w / 30);
      assert.ok(w / 30 <= 4.5, `um inimigo ficou parado ${(w / 30).toFixed(1)} s`);
    });
    return `o pior de cada fase (s): ${worst.map((x) => x.toFixed(1)).join(" ")}`;
  });
}

test("o vigia destrava: um inimigo que 'fica preso' (descanso eterno) volta a andar em até 5 s", () => {
  const lv = levelsOf("dog").find((l) => l.id === 8);
  g.autoStart = true; g.setRand(rig.lcg(77)); g.start(lv.id, { animal: "dog" }); g.setRand(rig.lcg(78)); g.noCatch = true; g.freezeVets = false;
  const v = g.vets[0], at = [v.cx, v.cy];
  v.idle = 1e9; // preso num descanso que nunca acaba
  g.blind = true;
  for (let t = 0; t < 5 * 30; t++) g.tick(1 / 30);
  assert.ok((v.unstuck || 0) >= 1, "o vigia não agiu");
  for (let t = 0; t < 10 * 30; t++) g.tick(1 / 30);
  g.blind = false;
  assert.ok(Math.hypot(v.cx - at[0], v.cy - at[1]) > 32, "o inimigo continuou no mesmo lugar");
});

console.log(`\n${total - failed} de ${total} verificações ok`);
process.exit(failed ? 1 : 0);
