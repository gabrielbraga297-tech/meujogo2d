// Seção do MAPA LIVRE do Cachorrinho (0.25.0) e do Gatinho (0.26.0), no navegador (Chromium, Firefox e WebKit). Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só esta: node tests/e2e.js "0.25.0 · mapa livre"
// Pedido do dono (13/11/2026): nada perto de paredes e muros; os bonecos andam o mapa todo, sem ficar presos, e só nascem em lugares diferentes.
// A prova completa (20 fases × muitos sorteios, 5 minutos de patrulha por fase) está em tests/free-map.test.js, no Node; aqui se confere, no motor de cada navegador, o essencial.
const DELIVERED = ["dog", "cat"]; // bichinhos com o mapa livre entregue (0.27.0 Passarinho entra aqui)
const LIM = { dog: { pair: 10, startPlus: 5, startMin: 11, exit: 9, roomyFrom: 1 }, cat: { pair: 6, startPlus: 2, startMin: 8, exit: 5, roomyFrom: 4 } }; // os mesmos de tests/free-map.test.js

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section } = T;

  await section("0.25.0 · mapa livre do Cachorrinho e do Gatinho: itens longe das paredes, inimigos que nascem espalhados e andam o mapa todo, quem foge também anda", async () => {
    const pg = await newPage({ realCat: true, realBird: "real" });
    await fresh(pg, { name: "Totó" });
    const r = await ev(pg, ([animals, LIM]) => {
      const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const g = window.__game, out = {};
      const roomy = (lv, c, r) => { // nenhum dos 8 vizinhos é parede, van, trilho de bloco ou fora do mapa
        const tr = lv.__tr || (lv.__tr = new Set(lv.trackTiles.map(([a, b]) => b * lv.cols + a)));
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const x = c + dc, y = r + dr; if (x < 0 || y < 0 || x >= lv.cols || y >= lv.rows || !lv.floorFree[y][x] || tr.has(y * lv.cols + x) || (lv.catMode && !lv.walk[y][x])) return false; }
        return true;
      };
      const roomyAvailable = (lv) => { // quantos tiles com folga o sorteio tem à disposição (a regra de placeItems)
        const W = lv.cols, dist = new Map([[lv.spawnTile[1] * W + lv.spawnTile[0], 0]]), q = [lv.spawnTile], no = new Set([...lv.exitTiles, ...lv.avoidTiles].map(([c, r]) => r * W + c));
        for (let i = 0; i < q.length; i++) { const [c, r] = q[i], d = dist.get(r * W + c); for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= W || nr >= lv.rows || !lv.walk[nr][nc] || dist.has(nr * W + nc)) continue; dist.set(nr * W + nc, d + 1); q.push([nc, nr]); } }
        return q.filter(([c, r]) => !no.has(r * W + c) && dist.get(r * W + c) >= 4 && lv.postTiles.every((v) => Math.hypot(c - v[0], r - v[1]) >= 4) && roomy(lv, c, r)).length;
      };
      for (const animal of animals) {
        g.setAnimal(animal); g.autoStart = true; g.noCatch = true;
        const o = { itemsN: 0, itemsBad: 0, spawnBad: [], roam: [], still: [], flee: [] };
        for (let id = 1; id <= 20; id++) {
          const lv = g.builtOf(animal)[id];
          for (let seed = 1; seed <= 3; seed++) {
            g.setRand(mul(seed * 977 + id)); g.start(id, { animal });
            const all = [...g.items.map((it) => [(it.x - 8) / 32, (it.y - 8) / 32]), ...g.balls.map((b) => [Math.floor(b.x / 32), Math.floor(b.y / 32)])];
            let ok = 0; for (const [c, rr] of all) { o.itemsN++; if (roomy(lv, c, rr)) ok++; }
            o.itemsBad += Math.max(0, Math.min(all.length, roomyAvailable(lv)) - ok); // (num mapa apertado, como a Fase 6 do Gatinho, sobram itens fora da folga; só conta falha se havia tile com folga à disposição)
          }
          // nascimentos: tiles diferentes, com folga, espaçados, longe do início do bichinho e da saída (os limites de cada bichinho estão em LIM)
          const sp = [...lv.vetSpawns, ...lv.catSpawns], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
          let min = 99; for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) min = Math.min(min, d(sp[i], sp[j]));
          const why = [];
          if (new Set(sp.map((t) => t.join())).size !== sp.length) why.push("repetidos");
          if (lv.id >= LIM[animal].roomyFrom && sp.some((t) => !roomy(lv, t[0], t[1]))) why.push("colado em parede");
          if (sp.length > 1 && min < (lv.id === 2 && animal === "cat" ? 6 : LIM[animal].pair)) why.push(`a ${min.toFixed(1)} tiles um do outro`);
          if (Math.min(...sp.map((t) => d(t, lv.spawnTile))) < Math.max(lv.alertTiles + LIM[animal].startPlus, LIM[animal].startMin)) why.push("perto do início");
          if (Math.min(...sp.flatMap((t) => lv.exitTiles.map((e) => d(t, e)))) < LIM[animal].exit) why.push("perto da saída");
          if (why.length) o.spawnBad.push(`F${id}: ${why.join(", ")}`);
        }
        // patrulha: em fases pequena, média e grande, com o cachorrinho fora do mapa, 90 s simulados: ninguém fica perto do posto nem parado mais de 4,5 s
        for (const id of [2, 8, 14, 20]) {
          g.setRand(mul(2000 + id)); g.start(id, { animal }); g.setRand(mul(11 + id)); g.freezeVets = false; g.noCatch = true; g.blind = true; // (inimigos cegos e surdos: só a patrulha)
          const foes = [...g.vets, ...g.cats], from = foes.map((f) => [f.cx, f.cy]), far = foes.map(() => 0), run = foes.map(() => 0), worst = foes.map(() => 0), last = foes.map((f) => [f.cx, f.cy]);
          for (let t = 0; t < 90 * 30; t++) {
            g.tick(1 / 30);
            foes.forEach((f, i) => { far[i] = Math.max(far[i], Math.hypot(f.cx - from[i][0], f.cy - from[i][1]) / 32); if (Math.hypot(f.cx - last[i][0], f.cy - last[i][1]) < 0.01) { run[i]++; worst[i] = Math.max(worst[i], run[i]); } else run[i] = 0; last[i] = [f.cx, f.cy]; });
          }
          g.blind = false; o.roam.push([id, Math.min(...far)]); o.still.push([id, Math.max(...worst) / 30]);
        }
        // quem foge também anda: o cachorrinho pega um osso e fica parado; o assustado que está longe (10+ passos) não fica parado
        for (const id of [8, 14]) {
          g.setRand(mul(4000 + id)); g.start(id, { animal }); g.setRand(mul(5 + id)); g.freezeVets = false; g.noCatch = true;
          const bone = g.items.find((it) => it.bone && (it.kind || "scare") === "scare"); g.player.x = bone.x - 4; g.player.y = bone.y - 4;
          for (let t = 0; t < 30; t++) g.tick(1 / 30);
          const foes = [...g.vets, ...g.cats], pos = foes.map((f) => [f.cx, f.cy]), walked = foes.map(() => 0), far = foes.map((f) => Math.hypot(f.cx - (g.player.x + 12), f.cy - (g.player.y + 12)) > 14 * 32);
          for (let t = 0; t < 12 * 30; t++) { g.tick(1 / 30); foes.forEach((f, i) => { walked[i] += Math.hypot(f.cx - pos[i][0], f.cy - pos[i][1]); pos[i] = [f.cx, f.cy]; }); }
          const movers = foes.filter((f, i) => far[i] && walked[i] >= 3 * 32).length, total = far.filter(Boolean).length;
          o.flee.push([id, g.power > 0, movers, total]);
        }
        out[animal] = o;
      }
      g.noCatch = false; g.freezeVets = false; g.setRand(null);
      return out;
    }, [DELIVERED, LIM]);
    for (const animal of DELIVERED) {
      const o = r[animal], name = { dog: "Cachorrinho", cat: "Gatinho", bird: "Passarinho" }[animal];
      ok(o.itemsN > 500 && o.itemsBad === 0, `${name}: rações, ossos e bolinhas das 20 fases (3 sorteios cada) nunca encostam numa parede, caixa ou trilho de bloco (${o.itemsN} itens, ${o.itemsBad} encostados)`);
      ok(o.spawnBad.length === 0, `${name}: nas 20 fases cada inimigo nasce num tile diferente, com folga (a partir da Fase ${LIM[animal].roomyFrom}), a ${LIM[animal].pair}+ tiles dos outros, longe do início do bichinho e da saída${o.spawnBad.length ? " — " + o.spawnBad.slice(0, 4).join("; ") : ""}`);
      ok(o.roam.every(([, far]) => far >= 12), `${name}: em 90 s de patrulha nas Fases 2, 8, 14 e 20 todo inimigo se afasta 12+ tiles do posto (o que menos se afastou, por fase: ${o.roam.map(([id, f]) => `F${id} ${f.toFixed(0)}`).join(", ")})`);
      ok(o.still.every(([, s]) => s <= 4.5), `${name}: e ninguém fica parado mais de 4,5 s seguidos (a maior parada, por fase: ${o.still.map(([id, s]) => `F${id} ${s.toFixed(1)} s`).join(", ")})`);
      ok(o.flee.every(([, powered, movers, total]) => powered && total >= 3 && movers === total), `${name}: com o poder do osso, os assustados que estão longe do cachorrinho continuam andando em vez de parar (${o.flee.map(([id, p, m, t]) => `F${id}: ${m} de ${t}${p ? "" : " (sem poder!)"}`).join(", ")})`);
    }
    await pg.context().close();
  });
};
