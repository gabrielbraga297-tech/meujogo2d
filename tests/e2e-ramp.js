// Seção da dificuldade escalonada (0.22.0): o JOGO monta exatamente os inimigos que a medição de dificuldade (tools/difficulty/ramp.json) mediu. Carregado por tests/e2e.js, que passa as ferramentas (T).
// Rodar só esta: node tests/e2e.js "0.22.0 · dificuldade escalonada"
// O que a regra promete (nenhuma fase anterior mais difícil que uma posterior; 18 e 19 entre a 17 e a 20) está em tests/difficulty-ramp.test.js (sem navegador, sobre os números gravados).
// Aqui se prova a outra metade: que o que está gravado é o que o motor de fato põe na fase (se alguém mexer num mapa ou numa lista de gatos sem medir de novo, esta seção ou aquele teste falha).
const fs = require("fs");
const path = require("path");

module.exports = async function (T) {
  const { newPage, fresh, ev, ok, section, root } = T;

  await section("0.22.0 · dificuldade escalonada: os inimigos que o jogo põe em cada fase são os da medição (tools/difficulty/ramp.json) e o README explica a régua", async () => {
    const ramp = JSON.parse(fs.readFileSync(path.join(root, "tools/difficulty/ramp.json"), "utf8"));
    const KEYS = { dog: ["agents", "cats"], cat: ["dogs", "trackers"], bird: ["cats", "hawks"] };
    const pg = await newPage({ realCat: true, realBird: "real" });
    await fresh(pg, { name: "Totó" });
    const live = await ev(pg, () => {
      const out = {};
      for (const animal of ["dog", "cat", "bird"]) {
        __game.setAnimal(animal); out[animal] = {};
        for (let id = 1; id <= 20; id++) {
          __game.freezeVets = true; __game.start(id);
          out[animal][id] = [__game.vets.length, __game.cats.length]; // (agentes/cães/gatos de quintal, e gatos/rastreadores/gaviões)
        }
      }
      return out;
    });
    for (const animal of ["dog", "cat", "bird"]) {
      const bad = [];
      for (let id = 1; id <= 20; id++) {
        const rec = ramp.animals[animal] && ramp.animals[animal][id];
        if (!rec) { bad.push(`falta a Fase ${id} em ramp.json`); continue; }
        const want = KEYS[animal].map((k) => rec.enemies[k]), got = live[animal][id];
        if (want[0] !== got[0] || want[1] !== got[1]) bad.push(`Fase ${id}: medido ${want.join("/")}, o jogo põe ${got.join("/")}`);
      }
      ok(bad.length === 0, `${{ dog: "Cachorrinho", cat: "Gatinho", bird: "Passarinho" }[animal]}: nas 20 fases o jogo põe os mesmos inimigos (${KEYS[animal].join("/")}) da medição${bad.length ? " — " + bad.join("; ") : ""}`);
    }
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    const sec = readme.slice(readme.indexOf("## Dificuldade das fases (0.22.0)"));
    ok(readme.includes("## Dificuldade das fases (0.22.0)") && /tools\/difficulty\/ramp\.js/.test(sec) && /tools\/difficulty\/ramp\.json/.test(sec) && /R = /.test(sec) && /robô/.test(sec) && /nenhuma fase anterior/i.test(sec),
      "o README tem a seção Dificuldade das fases (0.22.0): a régua (R, o robô), a regra (nenhuma fase anterior mais difícil) e onde medir de novo");
    await pg.context().close();
  });
};
