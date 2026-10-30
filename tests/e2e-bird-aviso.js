// Seção do Passarinho (0.20.0): o AVISO DE ABERTURA da fase ("... O tempo só começa quando você se mexer.") não cobre o passarinho antes do primeiro passo. Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só esta: node tests/e2e.js "Passarinho (aviso)"
// O aviso (#toast) fica embaixo do campo até o primeiro passo. Nas Fases 7, 12, 15 e 19, em telas de computador e de tablet, o início do passarinho fica na parte de baixo do campo visível e o aviso o cobria
// (de 50% a 100% dele); no celular e no Cachorrinho e no Gatinho nunca cobriu. A correção (js/game.js, positionStartToast) só vale para o Passarinho: se o aviso cobre o passarinho, sobe para o alto do campo,
// abaixo das faixas da missão e dos efeitos. Aqui se mede, nos tamanhos de tela do relatório e nos de celular, a área do passarinho que fica sob o aviso: tem de ser 0.
const path = require("path");

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, errs } = T;
  const SIZES = [
    ["800×600", { viewport: { width: 800, height: 600 } }], ["1000×700", { viewport: { width: 1000, height: 700 } }], ["1280×720", { viewport: { width: 1280, height: 720 } }],
    ["1366×768", { viewport: { width: 1366, height: 768 } }], ["768×1024", { viewport: { width: 768, height: 1024 } }], ["1024×768", { viewport: { width: 1024, height: 768 } }],
    ["320×568", { viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true }], ["360×640", { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true }],
    ["390×780", { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true }], ["568×320", { viewport: { width: 568, height: 320 }, hasTouch: true, isMobile: true }],
  ];
  const PHASES = [7, 12, 15, 19, 1, 3, 5, 9, 11, 14, 17, 20]; // as quatro do relatório e uma amostra das outras
  // espera `n` quadros do jogo (o tamanho do campo e a altura do placar ainda se acomodam nos primeiros quadros)
  const frames = (pg, n = 14) => pg.evaluate((n) => new Promise((r) => { const f = () => (--n <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // começa a fase SEM andar (autoStart desligado: o aviso de abertura fica na tela) e mede o que o aviso cobre do passarinho, em px² do aparelho
  const measure = (pg, animal, id) => ev(pg, ([animal, id]) => {
    __game.setAnimal(animal); __game.autoStart = false; __game.noCatch = true; __game.start(id);
    return new Promise((resolve) => { let n = 14; const f = () => { if (--n > 0) return requestAnimationFrame(f);
      const cv = document.getElementById("game"), c = cv.getBoundingClientRect(), v = __game.view, p = __game.player, k = c.width / cv.width, sx = v.k * v.zoom, t = document.getElementById("toast"), tr = t.getBoundingClientRect();
      const pl = c.left + (p.x - v.camX) * sx * k, pt = c.top + (p.y - v.camY) * sx * k, pr = pl + p.w * sx * k, pb = pt + p.h * sx * k;
      const area = Math.max(0, Math.min(tr.right, pr) - Math.max(tr.left, pl)) * Math.max(0, Math.min(tr.bottom, pb) - Math.max(tr.top, pt));
      const bars = document.getElementById("top-bars").getBoundingClientRect(), insideCanvas = tr.left >= c.left - 1 && tr.right <= c.right + 1 && tr.top >= c.top - 1 && tr.bottom <= c.bottom + 1;
      const mission = document.getElementById("mission-bar"), mr = mission.getBoundingClientRect(), overBars = mission.classList.contains("hidden") ? 0 : Math.max(0, Math.min(tr.right, mr.right) - Math.max(tr.left, mr.left)) * Math.max(0, Math.min(tr.bottom, mr.bottom) - Math.max(tr.top, mr.top));
      resolve({ started: __game.started, shown: t.classList.contains("show"), top: t.classList.contains("top"), text: t.textContent, role: t.getAttribute("role"), live: t.getAttribute("aria-live"), area: Math.round(area), overBars: Math.round(overBars), insideCanvas, w: Math.round(tr.width), h: Math.round(tr.height), barsBottom: Math.round(bars.bottom), toastTop: Math.round(tr.top) }); };
      requestAnimationFrame(f); });
  }, [animal, id]);

  await section("0.20.0 · Passarinho (aviso): o aviso de abertura da fase não cobre o passarinho antes do primeiro passo (6 telas de computador e tablet e 4 de celular; Fases 7, 12, 15, 19 e uma amostra das outras)", async () => {
    const bad = [], moved = {}, notes = [];
    let total = 0;
    for (const [name, opts] of SIZES) {
      const pg = await newPage({ realBird: "real", ...opts });
      await fresh(pg, { name: "Totó" });
      for (const id of PHASES) {
        const r = await measure(pg, "bird", id);
        total++;
        if (!r.started && r.shown && r.area === 0 && r.overBars === 0 && r.insideCanvas && /O tempo só começa quando você se mexer\./.test(r.text) && r.role === "status" && r.live === "polite") { if (r.top) (moved[name] = moved[name] || []).push(id); continue; }
        bad.push(`${name} F${id}: ${JSON.stringify({ started: r.started, shown: r.shown, areaCoberta: r.area, sobreAMissao: r.overBars, dentroDoCampo: r.insideCanvas, role: r.role, live: r.live, top: r.top })}`);
      }
      notes.push(`${name}: ${(moved[name] || []).length ? "subiu nas Fases " + moved[name].join(",") : "ficou embaixo"}`);
      await pg.context().close();
    }
    console.log("   (aviso)", notes.join(" · "));
    ok(total === SIZES.length * PHASES.length && bad.length === 0, `em ${SIZES.length} tamanhos de tela × ${PHASES.length} fases (${total} medidas) o aviso de abertura fica à vista, dentro do campo, com o mesmo texto e role="status", sem cobrir nada do passarinho nem a faixa da missão${bad.length ? " — problemas: " + bad.slice(0, 6).join("; ") : ""}`);
    // a correção é o que tira o aviso de cima do passarinho: nas telas e nas fases do relatório ele sobe (se nunca subisse, o teste passaria à toa)
    ok((moved["1280×720"] || []).includes(7) && (moved["1280×720"] || []).includes(19) && (moved["1000×700"] || []).includes(7) && (moved["768×1024"] || []).includes(19), `(sanidade) em 1280×720 nas Fases 7 e 19, em 1000×700 na 7 e em 768×1024 na 19 o aviso de verdade subiu (${JSON.stringify(moved)})`);
  });

  await section("0.20.0 · Passarinho (aviso): o aviso do Cachorrinho e do Gatinho não muda de lugar (fica embaixo, sem a classe do alto) e o do Passarinho volta para baixo no aviso seguinte", async () => {
    const e0 = errs.length;
    const pg = await newPage({ realBird: "real", realCat: true, viewport: { width: 1280, height: 720 } });
    await fresh(pg, { name: "Totó" });
    const rows = [];
    for (const animal of ["dog", "cat"]) for (const id of [1, 7, 12, 19]) { const r = await measure(pg, animal, id); rows.push([animal, id, r.top, r.shown, r.started]); }
    ok(rows.every(([, , top, shown, started]) => !top && shown && !started), `no Cachorrinho e no Gatinho (Fases 1, 7, 12, 19 a 1280×720) o aviso fica embaixo, como sempre (${JSON.stringify(rows.filter(([, , top]) => top))})`);
    const style = await ev(pg, () => { const t = document.getElementById("toast"), cs = getComputedStyle(t); return { top: t.style.top, bottom: cs.bottom, pos: cs.position }; });
    ok(style.top === "" && style.pos === "absolute", `e o estilo do aviso do Cachorrinho/Gatinho não tem o \`top\` do alto (${JSON.stringify(style)})`);
    // no Passarinho, depois do aviso de abertura (no alto) vir um aviso novo (aqui, o começo da mesma fase já andando), ele nasce embaixo de novo
    const r7 = await measure(pg, "bird", 7);
    const after = await ev(pg, () => { __game.autoStart = true; const t = document.getElementById("toast"), before = t.classList.contains("top"); __game.start(7); return { before, top: t.classList.contains("top"), inline: t.style.top, shown: t.classList.contains("show") }; });
    ok(r7.top && after.before && !after.top && after.inline === "" && after.shown, `no Passarinho (Fase 7, 1280×720) o aviso de abertura estava no alto (${r7.top}) e o aviso seguinte nasce embaixo de novo (${JSON.stringify(after)})`);
    ok(errs.length === e0, `nenhum erro de JavaScript (${errs.slice(e0).join(" | ")})`);
    await pg.context().close();
  });
};
