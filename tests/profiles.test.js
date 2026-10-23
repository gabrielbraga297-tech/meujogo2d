// Testes unitários dos perfis por bichinho (js/profiles.js), sem navegador. Uso: node tests/profiles.test.js
// O perfil "dog" tem de dizer EXATAMENTE o que o jogo sempre disse (uma tabela de frases-chave, copiadas do js/game.js e do index.html da 0.17.0);
// o perfil "cat" tem de ter as mesmas chaves e tipos e usar as palavras do gato (e nenhuma do cachorro).
const assert = require("assert");
const path = require("path");
const fs = require("fs");
const Profiles = require(path.join(__dirname, "../js/profiles.js"));
const Themes = require(path.join(__dirname, "../js/themes.js"));

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e)); }
}

const dog = Profiles.PROFILES.dog, cat = Profiles.PROFILES.cat;

test("o registro tem o Cachorrinho e o Gatinho; um bichinho sem perfil (o Passarinho, por enquanto) usa o do Cachorrinho", () => {
  assert.deepStrictEqual(Object.keys(Profiles.PROFILES), ["dog", "cat"]);
  assert.strictEqual(Profiles.of("dog"), dog);
  assert.strictEqual(Profiles.of("cat"), cat);
  assert.strictEqual(Profiles.of("bird"), dog);
  assert.strictEqual(Profiles.of("constructor"), dog);
  assert.strictEqual(Profiles.of("__proto__"), dog);
  assert.strictEqual(Profiles.of(undefined), dog);
  assert.strictEqual(dog.id, "dog");
  assert.strictEqual(cat.id, "cat");
});

// ---------- o Cachorrinho: a tabela de frases-chave (os textos de hoje, copiados do código da 0.17.0) ----------
test("Cachorrinho: substantivos, nomes dos ossos e dos reforços são os de sempre", () => {
  const n = dog.noun;
  assert.deepStrictEqual([n.self.one, n.self.cap, n.prey.one, n.prey.many, n.power.one, n.power.many, n.ball.one, n.ball.many], ["cachorrinho", "Cachorrinho", "ração", "rações", "osso", "ossos", "bolinha", "bolinhas"]);
  assert.deepStrictEqual([n.foe.one, n.foe.many, n.foe.shortOne, n.foe.shortMany, n.scared.one, n.scared.many, n.foe2.one, n.foe2.many], ["agente da carrocinha", "agentes da carrocinha", "agente", "agentes", "carteiro", "carteiros", "gato", "gatos"]);
  assert.deepStrictEqual(dog.boneLabel, { scare: "Osso do poder", gold: "Osso de ouro", ice: "Osso de gelo", turbo: "Osso turbo", magnet: "Osso ímã" });
  assert.deepStrictEqual(dog.reinforce, {
    speed: { name: "Patas ligeiras", text: "+8% de velocidade do cachorrinho" },
    bone: { name: "Osso poderoso", text: "+8 s no poder do osso" },
    life: { name: "Vida extra", text: "+1 vida agora" },
    heart: { name: "Coração maior", text: "+1 vida no máximo (e +1 vida agora)" },
    shield: { name: "Pelo grosso", text: "+2 s de proteção depois de perder uma vida" },
    slow: { name: "Carrocinha lenta", text: "agentes da carrocinha 8% mais lentos" },
    stealth: { name: "Patas de veludo", text: "agentes e gatos notam você 1 quadrado mais tarde" },
    scent: { name: "Faro", text: "uma seta mostra o osso mais perto (e, no nível 2, a saída aberta)" },
    lure: { name: "Ímã de ração", text: "as rações perto de você vêm sozinhas" },
  });
});

test("Cachorrinho: efeitos dos reforços, ossos de tipos novos e missões dizem o de sempre", () => {
  assert.strictEqual(dog.effect.bone(16), "+16 s de poder do osso");
  assert.strictEqual(dog.effect.slow(16), "agentes 16% mais lentos");
  assert.strictEqual(dog.effect.scent1, "seta para o osso mais perto");
  assert.strictEqual(dog.effect.scent2, "setas para o osso e para a saída");
  assert.strictEqual(dog.effect.lure("3,5"), "rações a até 3,5 quadrados vêm sozinhas");
  assert.strictEqual(dog.fx.gold(10), "escudo dourado por 10 s: nada pega o cachorrinho!");
  assert.strictEqual(dog.fx.ice(6), "agentes e gatos congelados por 6 s!");
  assert.strictEqual(dog.fx.turbo(8, 40), "+40% de velocidade por 8 s!");
  assert.strictEqual(dog.fx.magnet(12), "as rações vêm sozinhas por 12 s!");
  assert.strictEqual(dog.mission.bones(8), "pegar todos os 8 ossos");
  assert.strictEqual(dog.mission.rations(52, 62), "pegar 52 das 62 rações");
  assert.strictEqual(dog.mission.shortBones, "todos os ossos");
  assert.strictEqual(dog.mission.shortRations(52), "52 rações");
  assert.strictEqual(dog.mission.leftBones(3, 8), "ossos 3/8");
  assert.strictEqual(dog.mission.leftRations(10, 52), "rações 10/52");
});

test("Cachorrinho: avisos da partida, vitória e derrota dizem o de sempre", () => {
  const s = dog.say;
  assert.strictEqual(s.lifeMaxed(true, 5, " · Osso de ouro!"), "Este osso tinha uma vida extra, mas você já está com o máximo (5 vidas). · Osso de ouro!");
  assert.strictEqual(s.lifeMaxed(false, 4, ""), "Esta ração tinha uma vida extra, mas você já está com o máximo (4 vidas).");
  assert.strictEqual(s.relocated(true, true), "Itens trocaram de lugar.");
  assert.strictEqual(s.relocated(true, false), "Rações trocaram de lugar.");
  assert.strictEqual(s.relocated(false, true), "Os itens mudaram de lugar.");
  assert.strictEqual(s.relocated(false, false), "As rações mudaram de lugar.");
  assert.strictEqual(s.powerOn(30, false), "Poder do osso por 30 s: os agentes viram carteiros fogem! Encoste neles: +100 cada.");
  assert.strictEqual(s.powerOn(38, true), "Poder do osso por 38 s: os agentes viram carteiros e os gatos fogem! Encoste neles: +100 cada.");
  assert.strictEqual(s.powerShort(30), "Poder do osso por 30 s!");
  assert.strictEqual(s.powerOff(false), "O poder acabou: os carteiros voltaram a ser agentes da carrocinha!");
  assert.strictEqual(s.powerOff(true), "O poder acabou: os carteiros voltaram a ser agentes da carrocinha e os gatos voltaram!");
  assert.strictEqual(s.beat(100), "Você ganhou do carteiro! +100 pontos");
  assert.strictEqual(s.beat2(100), "Você assustou o gato! +100 pontos");
  assert.strictEqual(s.needAll(true), "Colete todas as rações e todos os ossos antes de sair!");
  assert.strictEqual(s.needAll(false), "Colete todas as rações antes de sair!");
  assert.strictEqual(s.ballGot(50, 1, 3), "Bolinha! +50 pontos (1/3)");
  assert.strictEqual(s.foes(1, 0, false), "1 agente da carrocinha");
  assert.strictEqual(s.foes(3, 0, false), "3 agentes da carrocinha");
  assert.strictEqual(s.foes(8, 1, false), "8 agentes da carrocinha e 1 gato");
  assert.strictEqual(s.foes(8, 7, false), "8 agentes da carrocinha e 7 gatos");
  assert.strictEqual(s.foes(1, 0, true), "1 agente");
  assert.strictEqual(s.foes(8, 7, true), "8 agentes e 7 gatos");
  assert.strictEqual(s.saved("Fase 2", "0:05,0", 3, 7, 1, 2, 3), "Fase 2 · 0:05,0 · 3/7 rações · 1/2 ossos · 3 vidas");
  assert.strictEqual(s.saved("Fase 1", "0:01,0", 0, 5, 0, 0, 1), "Fase 1 · 0:01,0 · 0/5 rações · 1 vida");
  assert.strictEqual(s.pauseGrowth("filhote"), "Cachorrinho: filhote.");
  assert.strictEqual(s.winPrey(500), "Rações: 500");
  assert.strictEqual(s.winPower(300), " + ossos: 300");
  assert.strictEqual(s.winScared(false, 200), " + carteiros: 200");
  assert.strictEqual(s.winScared(true, 200), " + carteiros e gatos: 200");
  assert.strictEqual(s.winBalls(50), " + bolinhas: 50");
  assert.strictEqual(dog.lose.crush, "O bloco esmagou o cachorrinho!");
  assert.strictEqual(dog.lose.foe, "A carrocinha pegou o cachorrinho!");
  assert.strictEqual(dog.lose.foe2, "O gato pegou o cachorrinho!");
  assert.strictEqual(dog.lose.short, "Os pontos não bastaram!");
  assert.strictEqual(dog.lose.stats(3, 7, 1, 2, 120, 0), "Rações coletadas: 3/7 · Ossos: 1/2 · Pontos: 120");
  assert.strictEqual(dog.lose.stats(3, 5, 0, 0, -20, 800), "Rações coletadas: 3/5 · Pontos: -20 (mínimo 800)");
});

test("Cachorrinho: placar (RAÇÕES, OSSOS, BOLINHAS, PODER), sons e textos fixos", () => {
  const h = dog.hud;
  assert.deepStrictEqual([h.prey, h.power, h.balls, h.powerBadge], ["RAÇÕES", "OSSOS", "BOLINHAS", "PODER"]);
  assert.strictEqual(h.ballsTitle, "Bolinhas: cada uma vale 50 pontos e foge de você");
  assert.strictEqual(h.powerTitle, "Poder do osso: quanto falta para os carteiros voltarem a ser agentes da carrocinha");
  assert.strictEqual(h.powerOn(25), "Poder do osso: 25 segundos");
  assert.strictEqual(h.powerOff, "Poder do osso: desligado");
  assert.deepStrictEqual(dog.sfx, { ration: "ration", bone: "bone", capture: "capture", transform: "transform", beat: "postman", win: { filhote: "bark1", jovem: "bark2", adulto: "bark3" }, alert2: "meow" });
  assert.strictEqual(dog.skins, null);
  assert.ok(Object.values(dog.ui).every((v) => v === null), "o Cachorrinho usa o texto que já está no index.html");
});

test("Cachorrinho: os textos fixos do perfil estão mesmo no index.html e no js/game.js da 0.18.0 (nada foi perdido na troca)", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  for (const t of [dog.hud.prey + " <b", dog.hud.power + " <b", dog.hud.balls + " <b", dog.hud.powerBadge + " <b", dog.hud.ballsTitle, dog.hud.powerTitle]) assert.ok(html.includes(t), "index.html sem: " + t);
});

// ---------- o Gatinho ----------
const NULLABLE = (path) => path === "noun.foe2" || path === "skins" || path.startsWith("ui.");
test("Gatinho: tem as MESMAS chaves e tipos do Cachorrinho (só noun.foe2, skins e ui.* podem ser nulos)", () => {
  const a = Profiles.shape(dog), b = Profiles.shape(cat);
  const missing = Object.keys(a).filter((k) => !(k in b) && !Object.keys(b).some((x) => NULLABLE(k) && (k.startsWith(x + ".") || x.startsWith(k + "."))) && ![...Object.keys(b)].some((x) => k.startsWith(x + ".") && b[x] === "null"));
  assert.deepStrictEqual(missing, [], "faltam no Gatinho: " + missing.join(", "));
  const extra = Object.keys(b).filter((k) => !(k in a) && !(a[k.split(".").slice(0, k.split(".").length - 1).join(".")] === "null"));
  assert.deepStrictEqual(extra.filter((k) => !k.startsWith("skins.") && !k.startsWith("ui.")), [], "sobram no Gatinho: " + extra.join(", "));
  for (const k of Object.keys(a)) if (k in b && !NULLABLE(k)) assert.strictEqual(b[k], a[k], `tipo diferente em ${k}: ${a[k]} × ${b[k]}`);
  // tudo o que o Cachorrinho tem como texto fixo (ui.*), o Gatinho também tem (e como texto, não null)
  for (const k of Object.keys(dog.ui)) assert.strictEqual(typeof cat.ui[k], "string", "ui." + k + " do Gatinho");
  // as skins do Gatinho cobrem as skins do motor (mesmos ids)
  assert.deepStrictEqual(Object.keys(cat.skins).sort(), ["", "arco-iris", "astronauta", "chocolate", "cinza", "dalmata", "dourado", "pirata", "super"]);
  for (const v of Object.values(cat.skins)) assert.ok(v.name && v.text);
  // os reforços têm os mesmos ids e todos têm nome e texto
  assert.deepStrictEqual(Object.keys(cat.reinforce), Object.keys(dog.reinforce));
  for (const v of Object.values(cat.reinforce)) assert.ok(v.name && v.text);
});

test("Gatinho: substantivos do gato (ratinho, novelo, cão, cão afugentado) e sem segundo inimigo", () => {
  const n = cat.noun;
  assert.deepStrictEqual([n.self.one, n.self.cap, n.prey.one, n.prey.many, n.power.one, n.power.many, n.ball.one, n.ball.many], ["gatinho", "Gatinho", "ratinho", "ratinhos", "novelo", "novelos", "bolinha", "bolinhas"]);
  assert.deepStrictEqual([n.foe.one, n.foe.many, n.scared.one, n.scared.many], ["cão", "cães", "cão afugentado", "cães afugentados"]);
  assert.strictEqual(n.foe2, null);
  assert.deepStrictEqual(Object.values(cat.reinforce).map((r) => r.name), ["Patas ágeis", "Novelo poderoso", "Vida extra", "Coração maior", "Pelo grosso", "Cães lentos", "Passos de veludo", "Bigodes atentos", "Chamado de petisco"]);
  assert.deepStrictEqual(cat.hud, { ...cat.hud, prey: "RATINHOS", power: "NOVELOS", balls: "BOLINHAS", powerBadge: "PODER" });
  assert.strictEqual(cat.say.ballGot(50, 1, 3), "Bolinha! +50 pontos (1/3)");
  assert.strictEqual(cat.say.beat(100), "Você afugentou o cão! +100 pontos");
  assert.strictEqual(cat.say.winPrey(300), "Ratinhos: 300");
  assert.strictEqual(cat.say.foes(2, 0, false), "2 cães");
  assert.strictEqual(cat.say.foes(1, 0, true), "1 cão");
  assert.strictEqual(cat.say.pauseGrowth("jovem"), "Gatinho: jovem.");
});

// Todas as frases do Gatinho, chamando cada função com números de exemplo (as duas formas, no singular e no plural onde há)
function allStrings(p) {
  const out = [];
  const walk = (v, where) => {
    if (typeof v === "string") out.push([where, v]);
    else if (typeof v === "function") {
      for (const args of [[1, 2, 3, 4, 5, 6, 7], [true, 8, "x", 1, 0, 3, 1], [false, 5, "", 0, 9, 2, 3], [0, 0, 0, 0, 0, 0, 0]]) { let r; try { r = v(...args); } catch { continue; } if (typeof r === "string") out.push([where + "()", r]); }
    } else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, where + "." + k);
  };
  walk(p, p.id);
  return out;
}
test("Gatinho: nenhuma frase fala de cachorro, ração, osso, carrocinha, carteiro ou agente (as palavras do outro bichinho)", () => {
  const bad = allStrings(cat).filter(([where, t]) => !where.includes(".sfx.") && /cachorr|\bra[çc](ão|ões|ao|oes)\b|\bossos?\b|carroc|carteir|agentes?\b|latir|\blate\b|bark/i.test(t));
  assert.deepStrictEqual(bad, []);
});

test("Gatinho: as frases do Gatinho são diferentes das do Cachorrinho (só as neutras podem ser iguais)", () => {
  const d = new Map(allStrings(dog).map(([w, t]) => [w.replace(/^dog\./, ""), t]));
  const same = allStrings(cat).map(([w, t]) => [w.replace(/^cat\./, ""), t]).filter(([w, t]) => d.get(w) === t).map(([w]) => w);
  // as únicas frases iguais são as neutras (sem substantivo de bichinho): as bolinhas, as vidas, a proteção, o turbo e os nomes dos sons que ainda são os mesmos
  const allowed = new Set(["noun.ball.one", "noun.ball.many", "reinforce.life.name", "reinforce.life.text", "reinforce.heart.name", "reinforce.heart.text", "reinforce.shield.name", "reinforce.shield.text", "fx.turbo()", "say.ballGot()", "say.winBalls()",
    "lose.short", "hud.balls", "hud.powerBadge", "hud.ballsTitle", "sfx.ration", "sfx.bone", "sfx.capture", "sfx.transform", "sfx.beat", "sfx.alert2"]);
  assert.deepStrictEqual([...new Set(same)].filter((w) => !allowed.has(w)), []);
  // e o que importa: os textos principais mudaram de verdade
  for (const [a, b] of [[cat.hud.prey, dog.hud.prey], [cat.hud.power, dog.hud.power], [cat.lose.foe, dog.lose.foe], [cat.say.beat(100), dog.say.beat(100)], [cat.say.powerOn(30), dog.say.powerOn(30)], [cat.say.needAll(true), dog.say.needAll(true)], [cat.boneLabel.scare, dog.boneLabel.scare], [cat.ui.howto, fs.readFileSync(path.join(__dirname, "../index.html"), "utf8")]]) assert.notStrictEqual(a, b);
});

test("Gatinho: os textos fixos (Como jogar etc.) têm o mesmo roteiro do Cachorrinho e falam do gato", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const steps = (cat.ui.howto.match(/<li><strong>([^<]+)<\/strong>/g) || []).map((x) => x.replace(/<[^>]+>/g, ""));
  for (const h of ["Objetivo:", "Mover:", "Vidas:", "Sem vidas?", "Pontuação:", "Salvar:", "Pausar:", "Teclado:", "Controle (gamepad):", "Pontuações:", "Conta (opcional):", "Missão (a partir da Fase 11):", "Bolinhas (a partir da Fase 2):", "Reforços:", "Bichinhos:", "Petiscos e skins:"]) assert.ok(steps.includes(h), "falta no Como jogar do Gatinho: " + h);
  assert.ok(/gatinho/.test(cat.ui.howto) && /ratinho/.test(cat.ui.howto) && /novelo/.test(cat.ui.howto) && !/cachorr|carroc|carteiro/i.test(cat.ui.howto));
  assert.ok(/gatinho/.test(cat.ui.shopHelp) && /gatinho/.test(cat.ui.nameTip) && /gatinho/.test(cat.ui.canvasLabel) && /gatinho/.test(cat.ui.padLabel));
  assert.ok(html.includes('id="howto-steps"') && html.includes('id="scores-help"') && html.includes('id="name-tip"') && html.includes('id="name-step1"') && html.includes('id="reg-hint"'), "o index.html tem os ids dos textos que o perfil troca");
  assert.ok(/ratinho/.test(cat.ui.scoresHelp) && /novelo/.test(cat.ui.scoresHelp));
});

// ---------- ambientes por bichinho ----------
test("Themes.of(id, bichinho): sem o 2º argumento ou com 'dog' é o de sempre; bichinho sem ambientes próprios usa os do Cachorrinho", () => {
  for (let id = 1; id <= 21; id++) {
    assert.strictEqual(Themes.of(id, "dog"), Themes.of(id));
    assert.strictEqual(Themes.of(id, "cat"), Themes.of(id));
    assert.strictEqual(Themes.of(id, "bird"), Themes.of(id));
    assert.strictEqual(Themes.of(id, "constructor"), Themes.of(id));
    assert.strictEqual(Themes.of(id, undefined), Themes.of(id));
  }
  assert.strictEqual(Themes.of(20).place, "Fortaleza da carrocinha");
  assert.strictEqual(Themes.of(99, "cat"), Themes.of(4));
});

if (failed) { console.log(`\n${failed} teste(s) falharam`); process.exit(1); }
console.log("\nTodos os testes dos perfis passaram");
