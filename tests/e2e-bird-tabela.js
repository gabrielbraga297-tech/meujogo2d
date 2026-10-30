// Seção do Passarinho (0.20.0): a TABELA DAS FASES do README (a cópia técnica da tabela entregue ao dono) contra as fases MONTADAS no navegador, com os arquivos de verdade (js/bird-levels.js, js/bird-themes*.js).
// Carregado por tests/e2e.js, que passa as ferramentas (T). Rodar só esta: node tests/e2e.js "tabela das fases do Passarinho"
// O mesmo formato da seção "tabela das fases do Gatinho" (tests/e2e.js): as colunas 0 a 16 são as do Gatinho (Fase, Ambiente, Mapa, Condição, inimigos de posto, inimigos que rastreiam, itens 1 a 3, as três velocidades,
// vidas máx., perda por vida, missão, bônus, luz) e as extras do Passarinho (galhos, ventos e tipos de fruto) vêm por último. Sem navegador a conferência é tests/bird-table.test.js (a tabela contra js/bird-levels.js).
// Aqui cada célula é comparada com o que o JOGO monta (`__game.builtOf("bird")`, que copia as regras da fase `like` do Cachorrinho), com o ambiente de verdade (Themes.of(fase, "bird")) e com o jogo rodando (`__game.start`).
const fs = require("fs");
const path = require("path");

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, root } = T;

  await section("0.20.0 · tabela das fases do Passarinho (a cópia técnica do README bate com os dados do jogo)", async () => {
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    const a = readme.indexOf("## Tabela das fases do Passarinho"), b = readme.indexOf("## Biologia por trás do Passarinho");
    ok(a >= 0 && b > a, "o README tem a seção Tabela das fases do Passarinho, logo antes da Biologia por trás do Passarinho");
    const tbl = readme.slice(a, b);
    const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
    const head = tbl.split("\n").filter((l) => /^\| Fase \|/.test(l)).map(cells)[0] || [];
    const rows = tbl.split("\n").filter((l) => /^\| \d+ \|/.test(l)).map(cells);
    // a tabela do Gatinho, só para conferir que as colunas 0 a 16 do Passarinho são as mesmas dela (as posições e o significado)
    const ca = readme.indexOf("## Tabela das fases do Gatinho"), cb = readme.indexOf("## Biologia por trás do Gatinho");
    const catHead = readme.slice(ca, cb).split("\n").filter((l) => /^\| Fase \|/.test(l)).map(cells)[0] || [];
    const num = (s) => Number(String(s).replace(",", ".").replace(/ px\/s/, ""));
    const pair = (s) => String(s).split("/").map((x) => num(x.trim()));
    const MIX = [["scare", "voo alto"], ["gold", "escudo"], ["ice", "ar frio"], ["turbo", "rajada"], ["magnet", "ímã"]];

    ok(head.length === 20 && catHead.length === 17, `o cabeçalho da tabela do Passarinho tem 20 colunas (17 do Gatinho + galhos, ventos e tipos de fruto): ${head.length} e ${catHead.length}`);
    ok([0, 1, 2, 3, 12, 13, 14, 15].every((i) => head[i] === catHead[i]) && /^Gatos de quintal/.test(head[4]) && /^Gaviões/.test(head[5]) && /^Sementes/.test(head[6]) && /^Frutos/.test(head[7]) && /^Minhocas/.test(head[8])
      && /^Velocidade dos gatos/.test(head[9]) && /^Velocidade dos gaviões/.test(head[10]) && /^Velocidade do passarinho/.test(head[11]) && head[16] === "Luz" && /^Galhos/.test(head[17]) && /^Ventos/.test(head[18]) && /^Tipos de fruto/.test(head[19]),
      `as colunas 0 a 16 são as da tabela do Gatinho (nas mesmas posições: fase, ambiente, mapa, condição, vidas, perda, missão, bônus) e as extras vêm por último (${head.join(" | ")})`);

    const bp = await newPage({ realBird: "real" });
    await fresh(bp, { name: "Totó" });
    const data = await ev(bp, () => {
      const built = __game.builtOf("bird"), dog = __game.builtOf("dog");
      // grupos (4 vizinhos) de tiles iguais: galhos G e cada corrente de vento (a mesma seta)
      const comps = (lv, match) => {
        const seen = new Set(); let n = 0;
        for (let r = 0; r < lv.rows; r++) for (let c = 0; c < lv.cols; c++) {
          const ch = lv.kinds[r][c]; if (!match(ch) || seen.has(r * lv.cols + c)) continue; n++;
          const q = [[c, r]]; seen.add(r * lv.cols + c);
          for (let i = 0; i < q.length; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = q[i][0] + dc, nr = q[i][1] + dr; if (nc >= 0 && nr >= 0 && nc < lv.cols && nr < lv.rows && lv.kinds[nr][nc] === ch && !seen.has(nr * lv.cols + nc)) { seen.add(nr * lv.cols + nc); q.push([nc, nr]); } }
        }
        return n;
      };
      const out = [];
      __game.setAnimal("bird");
      for (let id = 1; id <= 20; id++) {
        const l = built[id], d = dog[l.like], th = Themes.of(id, "bird");
        // o jogo rodando: quantos itens, minhocas e inimigos nascem de verdade e a velocidade do passarinho
        __game.start(id);
        const live = { seeds: __game.items.filter((i) => !i.bone).length, fruits: __game.items.filter((i) => i.bone).length, kinds: __game.items.filter((i) => i.bone).map((i) => i.kind).sort(), worms: __game.balls.length, cats: __game.vets.length, hawks: __game.cats.length, speed: __game.dogSpeed, hawk: __game.cats.every((h) => h.hawk) };
        out.push({
          id: l.id, place: l.place, themePlace: th.place, cols: l.cols, rows: l.rows, min: l.minPoints, like: l.like, cats: l.vetSpawns.length, hawks: l.catSpawns.length, seeds: l.rations, fruits: l.bones, worms: l.balls, mix: l.boneMix.slice(),
          sp: l.vetCfgs[0].speed, ch: l.vetCfgs[0].chaseSpeed, hsp: l.catSpawns.length ? l.catCfg.speed : 0, hch: l.catSpawns.length ? l.catCfg.chaseSpeed : 0, bird: 252 * l.dogSpeed, cap: l.lifeCap, pen: l.lifePenalty || 50,
          mission: l.mission, bonus: l.missionBonus || 0, night: !!l.night, dusk: !!th.dusk, themeNight: !!th.night, G: comps(l, (ch) => ch === "G"), wind: comps(l, (ch) => ">^<v".includes(ch)), defSpecial: window.BirdLevels[id - 1].special,
          dog: { sp: d.vetCfgs[0].speed, ch: d.vetCfgs[0].chaseSpeed, hsp: d.catSpawns.length ? d.catCfg.speed : 0, hch: d.catSpawns.length ? d.catCfg.chaseSpeed : 0, cap: d.lifeCap, pen: d.lifePenalty || 50, min: d.minPoints, mission: d.mission, bonus: d.missionBonus || 0, hawksLike: d.catSpawns.length },
          live,
        });
      }
      return out;
    });
    ok(rows.length === 20 && data.length === 20, `a tabela do Passarinho no README tem uma linha para cada fase (${rows.length} de ${data.length})`);
    const diffs = [], near = (x, y, e = 1e-6) => Math.abs(x - y) <= e;
    data.forEach((l, i) => {
      const r = rows[i]; if (!r) return;
      if (r.length !== 20) { diffs.push(`fase ${l.id}: ${r.length} células`); return; }
      const [id, place, size, cond, cats, hawks, seeds, fruits, worms, vs, hs, bird, cap, pen, mis, bonus, light, galhos, ventos, tipos] = r;
      const [sp, ch] = pair(vs);
      if (num(id) !== l.id) diffs.push(`fase ${l.id}: id`);
      if (place !== l.place || place !== l.themePlace) diffs.push(`fase ${l.id}: ambiente "${place}" ≠ "${l.place}" (fase) / "${l.themePlace}" (BirdThemes)`);
      if (size !== `${l.cols}×${l.rows}`) diffs.push(`fase ${l.id}: mapa ${size} ≠ ${l.cols}×${l.rows}`);
      if (l.like !== l.id) diffs.push(`fase ${l.id}: as regras vêm da fase ${l.like} do Cachorrinho, não da ${l.id}`);
      if (num(cats) !== l.cats || l.live.cats !== l.cats) diffs.push(`fase ${l.id}: gatos de quintal ${cats} ≠ ${l.cats} (montada) / ${l.live.cats} (jogando)`);
      if ((hawks === "—" ? 0 : num(hawks)) !== l.hawks || l.live.hawks !== l.hawks || l.hawks !== l.dog.hawksLike || !l.live.hawk) diffs.push(`fase ${l.id}: gaviões ${hawks} ≠ ${l.hawks} (montada) / ${l.live.hawks} (jogando) / ${l.dog.hawksLike} (gatos inimigos da fase do Cachorrinho)`);
      if (num(seeds) !== l.seeds || l.live.seeds !== l.seeds) diffs.push(`fase ${l.id}: sementes ${seeds} ≠ ${l.seeds} (montada) / ${l.live.seeds} (jogando)`);
      if ((fruits === "—" ? 0 : num(fruits)) !== l.fruits || l.live.fruits !== l.fruits) diffs.push(`fase ${l.id}: frutos ${fruits} ≠ ${l.fruits} (montada) / ${l.live.fruits} (jogando)`);
      if ((worms === "—" ? 0 : num(worms)) !== l.worms || l.live.worms !== l.worms) diffs.push(`fase ${l.id}: minhocas ${worms} ≠ ${l.worms} (montada) / ${l.live.worms} (jogando)`);
      if (!near(sp, l.sp, 1e-9) || !near(ch, l.ch, 1e-9) || !near(sp, l.dog.sp, 1e-9) || !near(ch, l.dog.ch, 1e-9)) diffs.push(`fase ${l.id}: velocidade dos gatos ${vs} ≠ ${l.sp} / ${l.ch} (montada) e ${l.dog.sp} / ${l.dog.ch} (agentes da fase ${l.like} do Cachorrinho)`);
      if (l.hawks) { const [x, y] = pair(hs); if (!near(x, l.hsp, 1e-9) || !near(y, l.hch, 1e-9) || !near(x, l.dog.hsp, 1e-9) || !near(y, l.dog.hch, 1e-9)) diffs.push(`fase ${l.id}: velocidade dos gaviões ${hs} ≠ ${l.hsp} / ${l.hch} (montada) e ${l.dog.hsp} / ${l.dog.hch} (gatos inimigos da fase ${l.like} do Cachorrinho)`); } else if (hs !== "—") diffs.push(`fase ${l.id}: velocidade dos gaviões sem gaviões`);
      if (!near(num(bird), l.bird, 0.05) || !near(l.live.speed, l.bird, 1e-6)) diffs.push(`fase ${l.id}: passarinho ${bird} ≠ ${l.bird} (montada) / ${l.live.speed} (jogando)`);
      if (num(cap) !== l.cap || l.cap !== l.dog.cap) diffs.push(`fase ${l.id}: vidas máx. ${cap} ≠ ${l.cap} (montada) / ${l.dog.cap} (Cachorrinho)`);
      if (num(pen) !== l.pen || l.pen !== l.dog.pen) diffs.push(`fase ${l.id}: perda por vida ${pen} ≠ ${l.pen} (montada) / ${l.dog.pen} (Cachorrinho)`);
      const want = l.min ? `${l.min} pontos${l.mission ? " + missão" : ""}` : "pegar tudo";
      if (cond !== want || l.min !== l.dog.min) diffs.push(`fase ${l.id}: condição "${cond}" ≠ "${want}"`);
      if (l.mission) {
        const parts = [l.mission.bones ? "todos os frutos" : "", l.mission.rations ? `${l.mission.rations} sementes` : ""].filter(Boolean).join(" + ");
        if (mis !== parts) diffs.push(`fase ${l.id}: missão "${mis}" ≠ "${parts}"`);
        if (num(bonus) !== l.bonus || l.bonus !== l.dog.bonus) diffs.push(`fase ${l.id}: bônus ${bonus} ≠ ${l.bonus} (montada) / ${l.dog.bonus} (Cachorrinho)`);
        if (JSON.stringify(l.mission) !== JSON.stringify(l.dog.mission)) diffs.push(`fase ${l.id}: a missão não é a da fase ${l.like} do Cachorrinho`);
      } else if (mis !== "—" || bonus !== "—" || /missão/.test(cond) || l.dog.mission) diffs.push(`fase ${l.id}: a fase não tem missão`);
      const luz = l.dusk ? "entardecer" : l.themeNight ? "noite" : "—";
      if (light !== luz || l.night !== (luz !== "—")) diffs.push(`fase ${l.id}: luz "${light}" ≠ "${luz}" (ambiente) / noite no jogo ${l.night}`);
      if ((galhos === "—" ? 0 : num(galhos)) !== l.G || l.G !== l.defSpecial.G) diffs.push(`fase ${l.id}: galhos ${galhos} ≠ ${l.G} grupos no mapa montado (${l.defSpecial.G} em js/bird-levels.js)`);
      if ((ventos === "—" ? 0 : num(ventos)) !== l.wind || l.wind !== l.defSpecial.wind) diffs.push(`fase ${l.id}: ventos ${ventos} ≠ ${l.wind} grupos no mapa montado (${l.defSpecial.wind} em js/bird-levels.js)`);
      const kinds = MIX.map(([k, name]) => [name, l.mix.filter((x) => x === k).length]).filter(([, n]) => n > 0);
      const wantMix = kinds.length ? kinds.map(([name, n]) => `${n}× ${name}`).join(", ") : "—";
      if (tipos !== wantMix) diffs.push(`fase ${l.id}: tipos de fruto "${tipos}" ≠ "${wantMix}"`);
      if (l.mix.length !== l.fruits || JSON.stringify(l.live.kinds) !== JSON.stringify(l.mix.slice().sort())) diffs.push(`fase ${l.id}: os frutos que nascem (${l.live.kinds.join(",")}) não são os tipos montados (${l.mix.slice().sort().join(",")})`);
    });
    ok(!diffs.length, `os números da tabela das fases do Passarinho (ambiente, mapa, gatos de quintal, gaviões, sementes, frutos, minhocas, velocidades, vidas, perda por vida, missão, bônus, luz, galhos, ventos e tipos de fruto) são os do jogo, montados e rodando${diffs.length ? " — " + diffs.join("; ") : ""}`);
    // a rampa que a tabela promete (conferida nos dados do jogo, não só no texto): a luz só nas Fases 18 e 19, as fases sem gaviões são as 1 a 10, as missões só da 11 em diante
    ok(JSON.stringify(data.filter((l) => l.night).map((l) => l.id)) === "[18,19]" && JSON.stringify(data.filter((l) => !l.hawks).map((l) => l.id)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) && JSON.stringify(data.filter((l) => l.mission).map((l) => l.id)) === JSON.stringify([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      "no jogo, só as Fases 18 e 19 têm luz de fim de dia, só as 11 a 20 têm gaviões e só elas têm missão");
    await bp.context().close();
  });
};
