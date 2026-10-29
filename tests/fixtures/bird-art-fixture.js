// FIXTURE DE TESTE (0.20.0, motor do Passarinho): um BirdArt e um tema de ambiente MÍNIMOS e provisórios, só para os testes do motor (tests/e2e-bird-motor.js) conferirem COMO o js/game.js chama a arte e os ambientes do Passarinho:
// cada função desenha uma forma lisa e guarda a contagem de chamadas (`BirdArt.__calls`) e os últimos argumentos (`BirdArt.__last`). NÃO é a arte do jogo (js/bird-art.js é de outra frente) e não deve ir para o jogo.
// O teste injeta isto antes de js/game.js (newPage({ realBird: true })); `window.__birdThemeFixture` é o ambiente que `Themes.of(fase, "bird")` devolve nessas páginas (floor, wall, crate, high, muro, wind e os campos de lugar).
(function () {
  const calls = {}, last = {};
  const note = (name, args) => { calls[name] = (calls[name] || 0) + 1; last[name] = args; };
  const T = 32;
  const BirdArt = {
    __calls: calls, __last: last,
    SKINS: [{ id: "", name: "Marrom", text: "o passarinho de sempre (grátis)", price: 0 }, { id: "azul", name: "Azul", text: "penas azuis", price: 10 }],
    skinById: (id) => BirdArt.SKINS.find((k) => k.id === id) || BirdArt.SKINS[0],
    growthStage: (gr) => (gr < 0.34 ? "filhote" : gr < 0.67 ? "jovem" : "adulto"),
    drawBird(ctx, p, o) { note("drawBird", { p: { x: p.x, y: p.y, facing: p.facing }, o: { ...o } }); const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 14 * (o.flying || 0); ctx.fillStyle = o.blink ? "#ffffff" : "#2a7fff"; ctx.beginPath(); ctx.arc(cx, cy, 9 + 4 * (o.flying || 0), 0, Math.PI * 2); ctx.fill(); },
    drawFoeCat(ctx, d, o) { note("drawFoeCat", { d: { ...d }, o: { ...o } }); ctx.fillStyle = "#ff8a1f"; ctx.fillRect(d.x - 10, d.y - 8, 20, 16); },
    drawHawk(ctx, d, o) { note("drawHawk", { d: { ...d }, o: { ...o } }); calls["hawk:" + d.mode] = (calls["hawk:" + d.mode] || 0) + 1; ctx.fillStyle = "#5a2d0c"; ctx.beginPath(); ctx.moveTo(d.x - 15, d.y + 4); ctx.lineTo(d.x, d.y - 10); ctx.lineTo(d.x + 15, d.y + 4); ctx.closePath(); ctx.fill(); },
    drawSeed(ctx, it, o) { note("drawSeed", { it: { ...it }, o: { ...o } }); ctx.fillStyle = "#d9b45a"; ctx.fillRect(it.x + 3, it.y + 5, 10, 6); },
    drawWorm(ctx, b, o) { note("drawWorm", { b: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, hue: b.hue }, o: { ...o } }); ctx.fillStyle = "#ff6fa5"; ctx.fillRect(b.x - 8, b.y - 3, 16, 6); },
    drawFruit(ctx, it, o) { note("drawFruit", { it: { ...it }, o: { ...o } }); calls["fruit:" + it.kind] = (calls["fruit:" + it.kind] || 0) + 1; ctx.fillStyle = BirdArt.FRUIT_KEYS[it.kind] || "#e5533d"; ctx.beginPath(); ctx.arc(it.x + 8, it.y + 8, 7, 0, Math.PI * 2); ctx.fill(); },
    FRUIT_KEYS: { scare: "#e5533d", gold: "#ffd23f", ice: "#6ec6ff", turbo: "#ff9f43", magnet: "#b57cff" },
    drawRoost(ctx, x, y, o) { note("drawRoost", { x, y, o: { ...o } }); return false; }, // (sem look.style: devolve false e o ambiente desenha o galho)
    drawPost(ctx, x, y, o) { note("drawPost", { x, y, o: { ...o } }); calls["post:" + o.kind] = (calls["post:" + o.kind] || 0) + 1; ctx.fillStyle = o.kind === "hawk" ? "#6b4a2a" : "#3f8a45"; ctx.fillRect(x - 8, y - 8, 16, 16); },
    drawNest(ctx, x, y, o) { note("drawNest", { x, y, o: { ...o } }); ctx.fillStyle = o.open ? "#e0c060" : "#80603a"; ctx.fillRect(x - o.w / 2, y - o.h / 2, o.w, o.h); },
    drawFx(ctx, kind, x, y, t, o) { note("drawFx", { kind, x, y, t }); (calls["fx:" + kind] = (calls["fx:" + kind] || 0) + 1); ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 6 + t * 10, 0, Math.PI * 2); ctx.stroke(); },
  };
  const theme = {
    id: 0, place: "Lugar de teste", blurb: "ambiente provisório do teste do motor", night: false, mover: { wall: ["#777", "#999", "#444"], door: ["#888", "#aaa", "#555"] }, rail: ["#666", "#222"],
    floor(g) { note("theme.floor", 0); g.ctx.fillStyle = (g.r + g.c) % 2 ? "#9bc28a" : "#a7cf96"; g.rect(g.x, g.y, T, T); },
    wall(g) { note("theme.wall", 0); g.ctx.fillStyle = "#4a4f5b"; g.rect(g.x, g.y, T, T); },
    crate(g) { note("theme.crate", 0); g.ctx.fillStyle = "#b08a5a"; g.rect(g.x + 4, g.y + 4, T - 8, T - 8); },
    high(g) { note("theme.high", 0); g.ctx.fillStyle = "#2f7d3a"; g.rect(g.x + 2, g.y + 2, T - 4, T - 4); },
    muro(g) { note("theme.muro", 0); g.ctx.fillStyle = "#6a8a3a"; g.rect(g.x, g.y, T, T); },
    wind(g) { note("theme.wind", { kind: g.kind(g.c, g.r), time: g.time }); g.ctx.fillStyle = "rgba(255,255,255,.4)"; g.rect(g.x + 8, g.y + 12, T - 16, 8); },
  };
  const lockedDefine = (name, value) => Object.defineProperty(window, name, { configurable: true, get: () => value, set: () => {} });
  window.__birdThemeFixture = theme;
  window.__birdFixtureNote = note;
  // js/bird-art.js de verdade (se um dia estiver na página) não substitui estes: valem só os da fixture
  lockedDefine("BirdArt", BirdArt);
})();
