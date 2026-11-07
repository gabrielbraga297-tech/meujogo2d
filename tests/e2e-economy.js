// Seção da economia da lojinha (0.23.0): quanto cada vitória rende em petscoin, na tela de vitória e na carteira, e se o ganho acompanha os preços do catálogo (que NÃO mudaram).
// Carregado por tests/e2e.js, que passa as ferramentas (T). Rodar só esta: node tests/e2e.js "0.23.0 · economia"
// As páginas desta seção abrem com `realTreats: true`: nas outras seções do e2e o rendimento fica fixado em 1 por vitória (browser.newContext em tests/e2e.js), que é o que elas sempre contaram.
const fs = require("fs");
const path = require("path");

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, root } = T;
  // termina a fase sem perder vida, como o finishNow do e2e: passa `seconds` de jogo, pega tudo e entra na saída
  const finish = (pg, seconds) => ev(pg, (n) => {
    __game.freezeVets = true;
    for (let i = 0; i < n; i++) __game.tick(0.05);
    for (const it of __game.items) { __game.player.x = it.x - 4; __game.player.y = it.y - 4; __game.tick(0.01); }
    const e = __game.exit; __game.player.x = e.x + 4; __game.player.y = e.y + 4; __game.tick(0.01);
  }, Math.round(seconds / 0.05));
  const treat = (pg) => pg.textContent("#win-treat");
  const wallet = (pg) => pg.evaluate(() => Records.createStore(localStorage).wallet("Totó").treats);

  await section("0.23.0 · economia da lojinha: cada vitória rende petscoin conforme a regra (fase nova, recorde, repetida, sem perder vida) e o total acompanha o catálogo", async () => {
    const pg = await newPage({ realTreats: true, realCat: true, realBird: "real" });
    await fresh(pg, { name: "Totó" });
    // ---- Fase 1, primeira vez, sem perder vida: 4 + 1 = 5, mais 2
    await ev(pg, () => { __game.setAnimal("dog"); __game.start(1); __game.noCatch = true; });
    await finish(pg, 10);
    ok(await ev(pg, () => __game.state) === "won" && await treat(pg) === "Petiscos ganhos! +7 petscoin (fase nova +5 · sem perder vida +2). Você tem 7. Troque por skins na Lojinha, no menu." && await wallet(pg) === 7, `Fase 1, primeira vez, sem perder vida: +5 e +2 (${await treat(pg)})`);
    // ---- a mesma fase de novo, no mesmo tempo: sem recorde, 1 petisco
    await ev(pg, () => { __game.start(1); __game.noCatch = true; }); await finish(pg, 10);
    ok(/^Petisco ganho! \+1 petscoin \(jogar de novo sem recorde \+1\)\. Você tem 8\./.test(await treat(pg)) && await wallet(pg) === 8, `repetir a Fase 1 sem melhorar rende 1 (${await treat(pg)})`);
    // ---- de novo, em menos tempo (mais pontos de bônus de tempo ou o mesmo em menos tempo): recorde, metade de 5 = 3, mais 2
    await ev(pg, () => { __game.start(1); __game.noCatch = true; }); await finish(pg, 2);
    ok(/^Petiscos ganhos! \+5 petscoin \(recorde batido \+3 · sem perder vida \+2\)\. Você tem 13\./.test(await treat(pg)) && await wallet(pg) === 13, `bater o recorde da Fase 1 rende 3 + 2 (${await treat(pg)})`);
    // ---- Fase 20 do Cachorrinho, primeira vez: 4 + 20 = 24, mais 2
    await ev(pg, () => { __game.start(20); __game.noCatch = true; }); await finish(pg, 20);
    ok(/^Petiscos ganhos! \+26 petscoin \(fase nova \+24 · sem perder vida \+2\)\. Você tem 39\./.test(await treat(pg)) && await wallet(pg) === 39, `Fase 20, primeira vez: +24 e +2 (${await treat(pg)})`);
    // ---- a carteira é única: a Fase 1 do Gatinho e a do Passarinho também são "primeira vez" (o progresso é de cada jogo)
    for (const [animal, want] of [["cat", 46], ["bird", 53]]) {
      await ev(pg, (a) => { __game.setAnimal(a); __game.start(1); __game.noCatch = true; }, animal); await finish(pg, 10);
      ok(/^Petiscos ganhos! \+7 petscoin \(fase nova \+5/.test(await treat(pg)) && await wallet(pg) === want, `${animal === "cat" ? "Gatinho" : "Passarinho"}, Fase 1, primeira vez: +7 na mesma carteira (${await treat(pg)})`);
    }
    // ---- perder uma vida tira os +2 (aqui a vida é perdida por contato de verdade)
    await ev(pg, () => { __game.setAnimal("dog"); __game.start(2); __game.noCatch = false; __game.freezeVets = false; });
    const lost = await ev(pg, () => { const v = __game.vets[0]; for (let i = 0; i < 400 && __game.livesLost === 0; i++) { __game.player.x = v.cx - 12; __game.player.y = v.cy - 12; __game.tick(0.05); } return __game.livesLost; });
    ok(lost > 0, `na Fase 2 o cachorrinho perde uma vida de verdade (${lost})`);
    await finish(pg, 10);
    const t2 = await treat(pg);
    ok(/^Petiscos ganhos! \+6 petscoin \(fase nova \+6\)\. Você tem 59\./.test(t2) && !/sem perder vida/.test(t2) && await wallet(pg) === 59, `com uma vida perdida a primeira vez da Fase 2 rende só +6, sem os +2 (${t2})`);
    await pg.context().close();

    // ---- os preços NÃO mudaram e o ganho acompanha o catálogo
    const cp = await newPage({ realTreats: true, realCat: true, realBird: "real" });
    await fresh(cp, { name: "Totó" });
    const cat = await ev(cp, () => {
      const S = window.Skins, out = {};
      for (const g of S.GAMES) { const prices = []; for (const sl of S.slotsOf(g.id)) for (const k of S.list(sl.id)) if (k.price > 0) prices.push(k.price); out[g.id] = { n: prices.length, sum: prices.reduce((a, b) => a + b, 0), min: Math.min(...prices), max: Math.max(...prices) }; }
      let first = 0, firstPerfect = 0, recAvg = 0;
      for (let n = 1; n <= 20; n++) { first += Records.winTreats(n, { first: true, livesLost: 1 }).total; firstPerfect += Records.winTreats(n, { first: true, livesLost: 0 }).total; recAvg += Records.winTreats(n, { newPersonal: true, livesLost: 1 }).total / 20; }
      let c = 0, k = 0; for (let n = 1; n <= 20 && c < 10; n++) { c += Records.winTreats(n, { first: true, livesLost: 1 }).total; k++; }
      return { out, first, firstPerfect, recAvg, minPrice: Records.MIN_SKIN_PRICE, winsFor10: k };
    });
    const total = Object.values(cat.out).reduce((a, g) => a + g.sum, 0), count = Object.values(cat.out).reduce((a, g) => a + g.n, 0);
    ok(count === 126 && total === 2478 && cat.minPrice === 10 && Object.values(cat.out).every((g) => g.min === 10 && g.max === 50), `os preços não mudaram: ${count} skins pagas, ${total} petscoin no total, de 10 a 50 (${JSON.stringify(cat.out)})`);
    ok(cat.first === 290 && cat.firstPerfect === 330, `a primeira volta pelas 20 fases rende 290 (330 sem perder vida): ${cat.first} e ${cat.firstPerfect}`);
    const pct = (g) => Math.round((100 * cat.first) / cat.out[g].sum);
    ok(["dog", "cat", "bird"].every((g) => pct(g) >= 30 && pct(g) <= 45), `uma volta pelas 20 fases junta de 30% a 45% do catálogo de cada jogo (Cachorrinho ${pct("dog")}%, Gatinho ${pct("cat")}%, Passarinho ${pct("bird")}%)`);
    ok(cat.winsFor10 <= 2 && cat.recAvg >= 7 && cat.recAvg <= 8, `a skin mais barata (10) sai com ${cat.winsFor10} fases novas e cada recorde rende em média ${cat.recAvg.toFixed(1)}`);
    await cp.context().close();

    // ---- as ajudas explicam a regra e a documentação tem a seção de economia com as mesmas contas
    const docs = fs.readFileSync(path.join(root, "docs/LOJINHA.md"), "utf8"), idx = fs.readFileSync(path.join(root, "index.html"), "utf8"), prof = fs.readFileSync(path.join(root, "js/profiles.js"), "utf8");
    ok(/## Economia da lojinha \(0\.23\.0\)/.test(docs) && /126 skins pagas que somam 2478/.test(docs) && /290 petscoin/.test(docs) && /Records\.winTreats/.test(docs), "docs/LOJINHA.md tem a seção Economia da lojinha (0.23.0) com o catálogo (126 skins, 2478) e a primeira volta (290)");
    ok(/petiscos<\/strong> \(= <strong>petscoin<\/strong>\)[^<]*[\s\S]{0,400}sem perder nenhuma vida/.test(idx) && (prof.match(/sem perder nenhuma vida/g) || []).length >= 2, "o Como jogar e a ajuda da lojinha explicam o ganho (primeira vez, recorde, repetir, sem perder vida)");
  });
};
