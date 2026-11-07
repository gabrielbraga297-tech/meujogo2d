// Seção do aviso de versão nova (0.23.0): o menu mostra "Tem uma versão nova do jogo" só quando o servidor tem outra build; qualquer falha é silenciosa; o botão recarrega a página.
// Carregado por tests/e2e.js, que passa as ferramentas (T). Rodar só esta: node tests/e2e.js "0.23.0 · atualização"
// O jogo só pergunta ao servidor quando está num site http/https com build de commit; aqui a pergunta é provocada pelo gancho `__game.checkForUpdate({ force, current, fetchFn })` com um fetch de mentira.
module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section } = T;
  const VERSION = (b) => `window.GAME_VERSION = { number: "0.23.0", build: "${b}" };`;

  await section("0.23.0 · atualização sem cache velho: o menu avisa quando há versão nova, não avisa à toa, e o botão recarrega", async () => {
    const pg = await newPage();
    await fresh(pg, { name: "Totó" });
    const hidden = () => ev(pg, () => document.getElementById("btn-update").classList.contains("hidden"));
    ok(await hidden() && (await pg.textContent("#btn-update")).includes("versão nova"), "no começo o aviso de versão nova está escondido");
    // sem forçar, num arquivo local (file:) nem pergunta: nada de rede
    const calls = await ev(pg, async () => { let n = 0; const r = await __game.checkForUpdate({ current: "abc1234", fetchFn: async () => { n++; return { ok: true, text: async () => 'build: "def5678"' }; } }); return { n, r }; });
    ok(calls.n === 0 && calls.r === false && await hidden(), `fora de http/https o jogo não pergunta ao servidor (${JSON.stringify(calls)})`);
    // build "dev": nunca pergunta
    const dev = await ev(pg, async () => { let n = 0; const r = await __game.checkForUpdate({ force: true, current: "dev", fetchFn: async () => { n++; return { ok: true, text: async () => 'build: "def5678"' }; } }); return { n, r }; });
    ok(dev.n === 0 && dev.r === false && await hidden(), `com a build "dev" (pasta de desenvolvimento) não há pergunta nem aviso (${JSON.stringify(dev)})`);
    // mesma build, resposta com erro, resposta estranha e sem internet: tudo em silêncio
    const quiet = await ev(pg, async () => {
      const out = [];
      for (const f of [async () => ({ ok: true, text: async () => 'build: "abc1234"' }), async () => ({ ok: false, text: async () => "" }), async () => ({ ok: true, text: async () => "<html>erro</html>" }), async () => { throw new Error("sem internet"); }])
        out.push(await __game.checkForUpdate({ force: true, current: "abc1234", fetchFn: f }));
      return out;
    });
    ok(quiet.every((x) => x === false) && await hidden() && await ev(pg, () => __game.updateFound === false), `mesma build, erro do servidor, resposta estranha e falta de internet não avisam nada (${quiet.join(",")})`);
    // a pergunta usa o js/version.js do servidor, sem cache
    const asked = await ev(pg, async () => { let seen = null; await __game.checkForUpdate({ force: true, current: "abc1234", fetchFn: async (u, init) => { seen = { u, init }; return { ok: true, text: async () => 'build: "abc1234"' }; } }); return seen; });
    ok(/\/js\/version\.js\?t=\d+$/.test(asked.u) && asked.init.cache === "no-store", `a pergunta vai para js/version.js com um número no fim e sem usar o que o navegador guardou (${asked.u}, cache ${asked.init.cache})`);
    // build diferente: o aviso aparece
    const found = await ev(pg, () => __game.checkForUpdate({ force: true, current: "abc1234", fetchFn: async () => ({ ok: true, text: async () => 'build: "def5678"' }) }));
    ok(found === true && !(await hidden()) && await ev(pg, () => __game.updateFound === true), "com uma build diferente no servidor o aviso aparece no menu");
    // cabe nas telas pequenas, sem rolagem lateral, e o botão fica ao alcance do toque
    const fit = [];
    for (const [w, h] of [[320, 568], [568, 320], [390, 780], [1000, 700]]) {
      await pg.setViewportSize({ width: w, height: h });
      const r = await ev(pg, () => { const b = document.getElementById("btn-update").getBoundingClientRect(), m = document.getElementById("menu"); return { l: b.left, r: b.right, w: b.width, h: b.height, vw: innerWidth, sx: document.documentElement.scrollWidth > innerWidth + 1, shown: getComputedStyle(document.getElementById("btn-update")).display !== "none", ms: m.scrollWidth > m.clientWidth + 1 }; });
      if (!r.shown || r.l < -0.5 || r.r > r.vw + 0.5 || r.h < 30 || r.sx || r.ms) fit.push(`${w}×${h}: ${JSON.stringify(r)}`);
    }
    ok(fit.length === 0, `o botão de atualizar aparece inteiro, sem rolagem lateral, em 320×568, 568×320, 390×780 e 1000×700${fit.length ? " — " + fit.join("; ") : ""}`);
    // o botão recarrega a página
    const nav = pg.waitForEvent("load");
    await pg.click("#btn-update"); await nav;
    ok(await ev(pg, () => performance.getEntriesByType("navigation")[0].type) === "reload", "tocar no aviso recarrega a página");
    ok(await hidden(), "e depois de recarregar o aviso volta escondido (a versão que abriu é a que está no ar, ou o servidor ainda não mudou)");
    await pg.context().close();
  });
};
