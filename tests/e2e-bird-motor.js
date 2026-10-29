// Seções do Passarinho (0.20.0): o MOTOR (js/game.js). Carregado por tests/e2e.js, que passa as ferramentas (T). Todas as páginas abrem com `realBird: true` (as fixtures de tests/fixtures/ no lugar dos mapas de verdade).
module.exports = async function (T) {
  const { browser, newPage, fresh, ev, ok, section, errs, PAGE_HELPERS } = T;
  const bp = (opts = {}) => newPage({ realBird: true, ...opts });

  await section("0.20.0 · Passarinho (motor): esqueleto (as fixtures carregam, o Passarinho fica pronto e o cartão aparece)", async () => {
    const pg = await bp();
    await fresh(pg, { name: "Totó" });
    const g = await ev(pg, () => __game.games.find((x) => x.id === "bird"));
    ok(g.ready && g.levels === 5 && g.rev === 1 && !g.placeholder, `o Passarinho está pronto com as 5 fases das fixtures (${JSON.stringify(g)})`);
    await pg.close();
  });
};
