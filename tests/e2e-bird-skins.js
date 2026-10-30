// Seções do Passarinho (0.20.0): AS SKINS E A LOJINHA (js/skins-bird.js, os mostruários PREVIEW de js/game.js, a categoria `bird`). Carregado por tests/e2e.js (o gancho passa as ferramentas T)
// ou, enquanto esse gancho não existe, por tests/_run-bird-skins.js. Rodar só estas: node tests/e2e.js "Skins do Passarinho"
// As páginas abrem com `realCat: true` (o Gatinho de verdade) e `realBird: "real"` (os arquivos de verdade do Passarinho, sem as fixtures do motor); se o jogo do Passarinho ainda não estiver pronto
// (sem o motor), `ensureBird` o liga com `enableTestAnimal` só para a lojinha poder mostrar a aba dele.
const path = require("path");

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, URL, root } = T;
  const BIRD = ["bird", "seed", "stray", "birdexit", "berry", "bug", "roost", "gust", "hawk"];
  const OBJECTS = BIRD.slice(1);
  const bpage = async (opts = {}) => newPage({ realCat: true, realBird: "real", ...opts });
  const ensureBird = (pg) => ev(pg, () => { const g = __game.games.find((x) => x.id === "bird"); if (!g.ready) __game.enableTestAnimal("bird"); return __game.games.find((x) => x.id === "bird").ready; });
  // abre a página limpa (jogador "Totó"), dá `treats` petscoin e as fases já concluídas de cada jogo e abre a lojinha na aba do Passarinho
  const openShop = async (pg, { treats = 0, bird = 0, dog = 0, cat = 0, tab = "bird" } = {}) => {
    await fresh(pg, { name: "Totó" });
    await ensureBird(pg);
    await ev(pg, ([treats, bird, dog, cat]) => {
      const st = Records.createStore(localStorage);
      for (let left = treats; left > 0; left -= 1000) st.addTreats("Totó", Math.min(1000, left));
      for (const [g, n] of [["bird", bird], ["dog", dog], ["cat", cat]]) for (let i = 1; i <= n; i++) st.game(g).completeLevel("Totó", i);
    }, [treats, bird, dog, cat]);
    await pg.click("#btn-shop");
    if (tab) await pg.click(`#shop-game-${tab}`);
  };
  const state = (pg) => ev(pg, () => {
    const tab = (b) => ({ id: b.id, text: b.textContent.trim(), selected: b.getAttribute("aria-selected"), disabled: b.disabled, label: b.getAttribute("aria-label"), locked: b.classList.contains("locked") });
    const lock = document.querySelector("#shop-list .shop-locked");
    return { games: [...document.querySelectorAll("#shop-games button")].map(tab), cats: [...document.querySelectorAll("#shop-cats button")].map(tab), cards: [...document.querySelectorAll("#shop-list .shop-card")].map((c) => ({ name: c.querySelector("strong").textContent, sub: c.querySelector(".sub") ? c.querySelector(".sub").textContent : "", btn: c.querySelector("button").textContent, disabled: c.querySelector("button").disabled, equipped: c.classList.contains("equipped") })),
      lockTitle: lock ? lock.querySelector("strong").textContent : "", note: document.getElementById("shop-note").textContent, msg: document.getElementById("shop-msg").textContent, bal: document.getElementById("shop-balance").textContent };
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: os mostruários da lojinha (PREVIEW) das 9 categorias desenham algo, centrado, legível e diferente em cada skin", async () => {
    const pg = await bpage();
    await fresh(pg, { name: "Totó" });
    const res = await ev(pg, (slots) => {
      const out = { themes: typeof BirdThemes !== "undefined" };
      for (const slot of slots) {
        out[slot] = Skins.list(slot).map((k) => {
          const cv = document.createElement("canvas"); cv.width = 216; cv.height = 156; const c2 = cv.getContext("2d");
          const drew = __game.skinPreview(slot, cv, k.id), d = c2.getImageData(0, 0, 216, 156).data, u = new Uint32Array(d.buffer);
          let h = 2166136261 >>> 0, n = 0, x0 = 999, y0 = 999, x1 = -1, y1 = -1;
          for (let i = 0; i < u.length; i++) { h = Math.imul(h ^ u[i], 16777619) >>> 0; if (u[i] !== 0) { n++; const x = i % 216, y = (i / 216) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
          return { id: k.id, drew, hash: h.toString(16), n, box: [x0, y0, x1, y1] };
        });
      }
      out.none = __game.skinPreview("nao-existe", document.createElement("canvas"), "");
      return out;
    }, BIRD);
    const probs = [], notes = [];
    for (const slot of BIRD) {
      const rows = res[slot], want = slot === "bird" ? 12 : 5;
      if (rows.length !== want) probs.push(`${slot}: ${rows.length} mostruários (esperados ${want}: a padrão e as outras)`);
      if (slot === "gust" && !res.themes) notes.push("os ambientes do Passarinho (BirdThemes) não estão carregados: o mostruário dos ventos usa só as fitas de sempre, igual em todas as skins");
      else if (new Set(rows.map((r) => r.hash)).size !== rows.length) probs.push(`${slot}: dois mostruários iguais`);
      for (const r of rows) {
        const [x0, y0, x1, y1] = r.box, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        if (!r.drew) probs.push(`${slot}/${r.id}: sem mostruário`);
        else if (r.n < 2500) probs.push(`${slot}/${r.id}: quase vazio (${r.n} px)`);
        else if (x1 - x0 < 70 || y1 - y0 < 45) probs.push(`${slot}/${r.id}: pequeno demais (${x1 - x0 + 1}×${y1 - y0 + 1} px)`);
        else if (slot === "roost" || slot === "gust") continue; // (o poleiro e o vento aparecem sobre o chão, que enche o cartão inteiro: só confere que há desenho e que é diferente)
        else if (x0 < 2 || y0 < 2 || x1 > 213 || y1 > 153) probs.push(`${slot}/${r.id}: encosta na borda do cartão (${r.box})`);
        else if (Math.abs(cx - 108) > 22 || Math.abs(cy - 78) > 22) probs.push(`${slot}/${r.id}: descentrado (${cx.toFixed(0)},${cy.toFixed(0)})`);
      }
    }
    ok(probs.length === 0 && res.none === false, `PREVIEW das 9 categorias: cada skin (a padrão e as outras: 12 do passarinho e 4 + padrão em cada objeto) desenha um mostruário não vazio, com tamanho legível, centrado no cartão de 216×156 e diferente das outras${notes.length ? " (" + notes.join("; ") + ")" : ""}${probs.length ? " — problemas: " + probs.join("; ") : ""}; uma categoria sem mostruário devolve false`);
    await pg.context().close();
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: a lojinha do Passarinho (aba, 9 categorias, bloqueio pela fase do Passarinho, comprar e usar com a chave de cada categoria)", async () => {
    const pg = await bpage();
    await openShop(pg, { treats: 100, bird: 2 }); // (alcançou a Fase 3 do Passarinho: abre tudo menos os gaviões, da Fase 11)
    let s = await state(pg);
    const bird = s.games.find((g) => g.id === "shop-game-bird");
    ok(bird && !bird.disabled && /Passarinho/.test(bird.text) && !/em breve/.test(bird.text), "a aba Passarinho está ligada (o jogo está pronto e tem categorias com skins)");
    ok(JSON.stringify(s.cats.map((c) => c.id.replace("shop-cat-", ""))) === JSON.stringify(BIRD), `as 9 categorias do Passarinho aparecem na ordem do catálogo (${s.cats.map((c) => c.id.replace("shop-cat-", "")).join(", ")})`);
    ok(JSON.stringify(s.cats.map((c) => c.text.replace(/\s*Fase \d+$/, "").replace(/^\u{1F512}/u, ""))) === JSON.stringify(["Passarinho", "Sementes", "Gatos de quintal", "Ninho (saída)", "Frutos", "Minhocas", "Poleiros", "Ventos", "Gaviões"]), `com os nomes em português (${s.cats.map((c) => c.text).join(" | ")})`);
    const locked = s.cats.filter((c) => c.locked).map((c) => c.id.replace("shop-cat-", ""));
    ok(JSON.stringify(locked) === '["hawk"]', `no começo (Fase 3 do Passarinho) só os gaviões estão bloqueados (${locked.join(", ") || "nenhuma"})`);
    ok(/Fase 11/.test(s.cats[8].text) && /Libera ao chegar à Fase 11 do Passarinho/.test(s.cats[8].label), `o aviso da aba bloqueada cita a fase e o Passarinho (${s.cats[8].label})`);
    await pg.click("#shop-cat-hawk");
    s = await state(pg);
    ok(s.cards.length === 0 && s.lockTitle === "Libera ao chegar à Fase 11 do Passarinho", `abrir a categoria bloqueada mostra só o texto (${s.lockTitle}) e nenhum cartão`);
    // a carteira recusa também sem a tela
    const refuse = await ev(pg, () => { const st = Records.createStore(localStorage); return st.buySkin("Totó", "prata", 10, "hawk"); });
    ok(refuse.ok === false && refuse.error === "locked", `a trava também está no armazenamento: comprar um gavião sem alcançar a Fase 11 do Passarinho é recusado (${JSON.stringify(refuse)})`);
    // as sementes: 5 cartões, comprar a primeira skin
    await pg.click("#shop-cat-seed");
    s = await state(pg);
    ok(s.cards.length === 5 && s.cards[0].name === "Creme, dourada e com broto" && s.cards[0].equipped && s.cards.slice(1).every((c) => /Comprar \((10|14|20|26) petscoin\)/.test(c.btn)), `Sementes: 5 cartões na ordem do catálogo, a padrão em uso e as outras 4 à venda de 10 a 26 (${s.cards.map((c) => c.name + " [" + c.btn + "]").join(" | ")})`);
    await pg.click("#shop-btn-1");
    s = await state(pg);
    const w = await ev(pg, () => { const st = Records.createStore(localStorage); return { seed: st.wallet("Totó", "seed"), dog: st.wallet("Totó"), bird: st.wallet("Totó", "bird"), all: st.equippedSkins("Totó"), look: __game.look("seed").id, agent: __game.look("agent").id, raw: JSON.parse(localStorage.getItem("cachorrinho.v1") || "{}") }; });
    ok(w.seed.owned.join() === "algodao" && w.seed.equipped === "algodao" && w.seed.treats === 90 && w.look === "algodao", `comprar Algodão-doce (10 petscoin): a skin é da categoria seed, já fica em uso e o jogo a lê (saldo ${w.seed.treats}, em uso ${w.look})`);
    ok(w.dog.owned.length === 0 && w.bird.owned.length === 0 && w.agent === "" && w.all.seed === "algodao" && JSON.stringify(w.raw).includes('"seed:algodao"'), "a skin do objeto não vai para o Cachorrinho nem para o passarinho; na carteira a chave é `seed:algodao`");
    ok(s.cards[1].equipped && /Em uso/.test(s.cards[1].btn) && /Usar/.test(s.cards[0].btn), "o cartão comprado vira Em uso e a padrão passa a mostrar Usar");
    // o passarinho (categoria do jogador): 12 cartões, comprar o Amarelo
    await pg.click("#shop-cat-bird");
    s = await state(pg);
    ok(s.cards.length === 12 && s.cards[0].name === "Marrom" && s.cards[1].name === "Amarelo" && /Comprar \(10 petscoin\)/.test(s.cards[1].btn) && /Comprar \(50 petscoin\)/.test(s.cards[11].btn), `Passarinho: 12 cartões (Marrom grátis, de 10 a 50 petscoin: ${s.cards.map((c) => c.name).join(", ")})`);
    await pg.click("#shop-btn-1");
    const w2 = await ev(pg, () => { const st = Records.createStore(localStorage); return { bird: st.wallet("Totó", "bird"), dog: st.wallet("Totó"), cat: st.wallet("Totó", "cat"), look: __game.look("bird").id, raw: JSON.parse(localStorage.getItem("cachorrinho.v1") || "{}") }; });
    ok(w2.bird.owned.join() === "amarelo" && w2.bird.equipped === "amarelo" && w2.bird.treats === 80 && w2.look === "amarelo" && w2.dog.owned.length === 0 && w2.cat.owned.length === 0 && JSON.stringify(w2.raw).includes('"bird:amarelo"'), `comprar o passarinho Amarelo: guardado como bird:amarelo, em uso, saldo ${w2.bird.treats}; o Cachorrinho e o Gatinho não ganham nada`);
    // as outras abas não mostram nada do Passarinho
    const others = {};
    for (const g of ["dog", "cat"]) { await pg.click(`#shop-game-${g}`); others[g] = (await state(pg)).cats.map((c) => c.id.replace("shop-cat-", "")); }
    ok(!others.dog.concat(others.cat).some((id) => BIRD.includes(id)) && others.dog.length === 10 && others.cat.length === 8, `as abas do Cachorrinho (${others.dog.length} categorias) e do Gatinho (${others.cat.length}) não têm nenhuma categoria do Passarinho`);
    await pg.context().close();
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: as categorias abrem na fase `from` do catálogo (Fases 1, 2, 3 e 11 do Passarinho) e o progresso do Cachorrinho e do Gatinho não libera nada", async () => {
    const pg = await bpage();
    await openShop(pg, { treats: 0, bird: 0, dog: 20, cat: 20 }); // (as 20 fases do Cachorrinho e do Gatinho concluídas, nenhuma do Passarinho)
    const lockedNow = async () => (await state(pg)).cats.filter((c) => c.locked).map((c) => c.id.replace("shop-cat-", ""));
    ok(JSON.stringify(await lockedNow()) === JSON.stringify(["berry", "bug", "roost", "gust", "hawk"]), `sem nada concluído no Passarinho abrem só as da Fase 1 (bloqueadas: ${(await lockedNow()).join(", ")}), mesmo com os outros dois jogos concluídos`);
    const steps = [[1, ["roost", "gust", "hawk"]], [2, ["hawk"]], [10, []]];
    for (const [done, want] of steps) {
      await ev(pg, (n) => { const st = Records.createStore(localStorage); for (let i = 1; i <= n; i++) st.game("bird").completeLevel("Totó", i); }, done);
      await pg.keyboard.press("Escape"); await pg.click("#btn-shop"); await pg.click("#shop-game-bird");
      const got = await lockedNow();
      ok(JSON.stringify(got) === JSON.stringify(want), `com ${done} fase(s) do Passarinho concluída(s) ficam bloqueadas: ${want.join(", ") || "nenhuma"} (${got.join(", ") || "nenhuma"})`);
    }
    await pg.context().close();
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: os tamanhos de tela (320×568, 390×780, 740×390 e 1000×700: a aba do Passarinho sem rolagem lateral, com as 9 categorias e os cartões de cada uma)", async () => {
    for (const [width, height] of [[320, 568], [390, 780], [740, 390], [1000, 700]]) {
      const pg = await bpage({ viewport: { width, height } });
      await openShop(pg, { treats: 50, bird: 12 });
      const bad = [];
      for (const slot of BIRD) {
        await pg.click(`#shop-cat-${slot}`);
        const m = await ev(pg, () => { const de = document.documentElement, cards = [...document.querySelectorAll("#shop-list .shop-card")], r = (e) => e.getBoundingClientRect(); return { over: de.scrollWidth - window.innerWidth, cards: cards.length, minBtn: Math.min(...cards.map((c) => r(c.querySelector("button")).height)), out: cards.some((c) => r(c).right > window.innerWidth + 1 || r(c).left < -1), blank: cards.some((c) => { const cv = c.querySelector("canvas"); return !cv || !cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data.some((v, i) => i % 4 === 3 && v > 0); }) }; });
        if (m.over > 1) bad.push(`${slot}: rolagem lateral de ${m.over} px`);
        if (m.cards !== (slot === "bird" ? 12 : 5)) bad.push(`${slot}: ${m.cards} cartões`);
        if (m.out) bad.push(`${slot}: cartão fora da tela`);
        if (m.minBtn < 36) bad.push(`${slot}: botão com ${m.minBtn.toFixed(0)} px de altura`);
        if (m.blank) bad.push(`${slot}: prévia em branco`);
      }
      const chips = await ev(pg, () => { const bar = document.getElementById("shop-cats"), r = bar.getBoundingClientRect(); return { right: r.right, w: window.innerWidth, over: document.documentElement.scrollWidth - window.innerWidth }; });
      ok(bad.length === 0 && chips.over <= 1, `${width}×${height}: as 9 categorias do Passarinho abrem com 12 e 5 cartões, as prévias estão desenhadas, os botões têm tamanho de toque e não há rolagem lateral${bad.length ? " — " + bad.join("; ") : ""}`);
      await pg.context().close();
    }
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: as skins do Passarinho não aparecem no Cachorrinho nem no Gatinho (o canvas dos dois é o MESMO com todas as skins do Passarinho em uso, e nenhuma função de BirdArt é chamada)", async () => {
    const { DOG_START, DOG_HASH } = require(path.join(root, "tests/ab-dog.js"));
    const { CAT_FRAME } = require(path.join(root, "tests/skins-cat-frame.js"));
    const HASHES_0170 = { 1: "a6329929", 4: "10cbf4dc", 11: "e5b1611", 20: "c113ca15" }; // os mesmos de sempre (código da 0.18.0, antes do desenho do Gatinho)
    // (a) Cachorrinho com TODAS as 9 categorias do Passarinho em uso
    const dp = await bpage({ viewport: { width: 1000, height: 700 } });
    await dp.goto(URL);
    const got = {}, calls = {};
    for (const id of [1, 4, 11, 20]) {
      await dp.evaluate(DOG_START, id);
      await dp.evaluate(() => { window.__spy = {}; for (const n of ["drawBird", "drawFoeCat", "drawHawk", "drawSeed", "drawWorm", "drawFruit", "drawRoost", "drawPost", "drawNest", "drawFx"]) { const f = BirdArt[n]; if (!f.__spied) { const w = function (...a) { window.__spy[n] = (window.__spy[n] || 0) + 1; return f.apply(this, a); }; w.__spied = true; BirdArt[n] = w; } } });
      await dp.evaluate((slots) => { for (const s of slots) __game.setLook(s, Skins.list(s)[1].id); }, BIRD);
      await dp.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120))))));
      got[id] = await dp.evaluate(DOG_HASH); calls[id] = await dp.evaluate(() => ({ ...window.__spy }));
    }
    ok([1, 4, 11, 20].every((id) => got[id].hash === HASHES_0170[id]), `com as 9 skins do Passarinho em uso, o canvas do Cachorrinho nas Fases 1, 4, 11 e 20 é IDÊNTICO ao de sempre (${[1, 4, 11, 20].map((id) => got[id].hash).join(", ")} contra ${Object.values(HASHES_0170).join(", ")})`);
    ok([1, 4, 11, 20].every((id) => Object.keys(calls[id]).length === 0), `e nenhuma função de BirdArt é chamada no jogo do Cachorrinho (${JSON.stringify(calls)})`);
    const owner = await dp.evaluate((slots) => ({ bird: slots.map((s) => Skins.slot(s).game), other: ["dog", "cat"].map((g) => Skins.slotsOf(g).map((s) => s.id).filter((s) => slots.includes(s)).length) }), BIRD);
    ok(owner.bird.every((g) => g === "bird") && owner.other.every((n) => n === 0), "no catálogo, as 9 categorias pertencem ao jogo do Passarinho e nenhuma está na lista do Cachorrinho nem do Gatinho");
    await dp.context().close();
    // (b) Gatinho com as 9 categorias do Passarinho em uso: o quadro não muda
    const cp = await bpage({ viewport: { width: 1000, height: 700 } });
    await cp.goto(URL); await cp.evaluate(() => { localStorage.clear(); }); await cp.reload();
    await cp.evaluate(`window.__frameFn = ${CAT_FRAME.toString()};`);
    const same = await cp.evaluate(({ frame, slots }) => {
      const a = window.__frameFn(frame);
      for (const s of slots) __game.setLook(s, Skins.list(s)[1].id);
      const seen = slots.map((s) => __game.look(s).id).join();
      const b = window.__frameFn({ ...frame, looks: {} });
      for (const s of slots) __game.setLook(s, "");
      return { a, b, seen };
    }, { frame: { id: 20, seed: 12345, looks: {}, scenes: ["spawn", "foes", "guard", "tracker", "mouse", "yarn-scare", "yarn-gold", "agile", "T"] }, slots: BIRD });
    ok(same.seen.split(",").every((x) => x) && same.seen.split(",").length === 9, `(sanidade) as 9 categorias do Passarinho aceitaram uma skin em __game.setLook (${same.seen})`);
    ok(JSON.stringify(same.a) === JSON.stringify(same.b), "com uma skin em TODAS as 9 categorias do Passarinho, o quadro do Gatinho (Fase 20: início, cães, ratinho, novelos, camundongo e lugar alto) não muda um pixel");
    await cp.context().close();
  });

  // =====================================================================
  await section("0.20.0 · Skins do Passarinho: sem js/bird-art.js a lojinha não quebra (as 8 categorias de objetos aparecem com o mostruário simples e a do passarinho some), e o Cachorrinho e o Gatinho seguem iguais", async () => {
    const pg = await bpage();
    await pg.addInitScript(() => { Object.defineProperty(window, "BirdArt", { configurable: true, get: () => undefined, set: () => {} }); });
    await fresh(pg, { name: "Totó" });
    const info = await ev(pg, () => ({ bird: Skins.count("bird"), objs: ["seed", "stray", "birdexit", "berry", "bug", "roost", "gust", "hawk"].map((s) => Skins.count(s)), preview: ["bird", "seed", "hawk"].map((s) => __game.skinPreview(s, document.createElement("canvas"), "")), dog: Skins.count("dog"), cat: Skins.count("cat") }));
    ok(info.bird === 0 && info.objs.every((n) => n === 4) && info.preview.every((p) => p === false) && info.dog === 8 && info.cat === 11, `sem BirdArt: a categoria do passarinho não tem skins (${info.bird}), as 8 de objetos têm 4 e não há mostruário próprio (${info.preview}); o Cachorrinho (${info.dog}) e o Gatinho (${info.cat}) ficam como estão`);
    await ensureBird(pg);
    await ev(pg, () => { const st = Records.createStore(localStorage); st.addTreats("Totó", 50); for (let i = 1; i <= 12; i++) st.game("bird").completeLevel("Totó", i); });
    await pg.click("#btn-shop"); await pg.click("#shop-game-bird");
    const s = await state(pg);
    ok(JSON.stringify(s.cats.map((c) => c.id.replace("shop-cat-", ""))) === JSON.stringify(OBJECTS) && s.games.find((g) => g.id === "shop-game-bird") && !s.games.find((g) => g.id === "shop-game-bird").disabled, `a aba do Passarinho mostra só as 8 categorias de objetos (${s.cats.map((c) => c.id.replace("shop-cat-", "")).join(", ")})`);
    await pg.click("#shop-cat-hawk");
    const g = await state(pg);
    ok(g.cards.length === 5 && g.cards[1].name === "Penas prateadas", `e os cartões aparecem normalmente (${g.cards.map((c) => c.name).join(" | ")})`);
    await pg.context().close();
  });
};
