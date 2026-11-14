// Fixa a REGRA DE DIFICULDADE da 0.22.0 (pedido do dono de 06/11/2026), sem navegador. Uso: node tests/difficulty-ramp.test.js
//  - em cada bichinho nenhuma fase anterior é mais difícil que uma posterior, e as Fases 18 e 19 ficam entre a 17 e a 20 (régua: golpes por minuto do robô de tools/difficulty, vidas infinitas, com folga);
//  - os números gravados em tools/difficulty/ramp.json são de uma medição das MESMAS contagens de inimigos que o jogo tem hoje (se alguém mexer num inimigo sem medir de novo, este teste falha);
//  - a conta da régua (tools/difficulty/ramp.js) é conferida com tabelas inventadas, para o próprio teste não aprovar tudo.
// O que o teste NÃO prova: que uma pessoa sente a mesma ordem (o robô só desvia e pega; ver README, "Dificuldade das fases"). Para medir de novo:
//   node tools/difficulty/run.js --animals dog --levels 1-20 --seeds 24 --immortal --out dog.json   (idem cat e bird; sob `flock` se rodar mais de um) e
//   node tools/difficulty/ramp.js build dog.json cat.json bird.json > tools/difficulty/ramp.json
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const R = require(path.join(__dirname, "../tools/difficulty/ramp.js"));

let failed = 0, total = 0;
const test = (name, fn) => { total++; try { fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + String(e.message).split("\n").slice(0, 12).join("\n     ")); } };

const FILE = path.join(__dirname, "../tools/difficulty/ramp.json");
const table = JSON.parse(fs.readFileSync(FILE, "utf8"));
const fake = (rs) => ({ animals: Object.fromEntries(R.ANIMALS.map((a) => [a, Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, { R: rs[i], seeds: 24, enemies: {} }]))])) });
const flat = (v) => Array.from({ length: 20 }, () => v);

test("a folga da régua: 0,6 golpe/min nos valores baixos e 30% nos altos", () => {
  assert.strictEqual(R.tol(0), 0.6); assert.strictEqual(R.tol(1), 0.6); assert.strictEqual(R.tol(2), 0.6);
  assert.ok(Math.abs(R.tol(10) - 3) < 1e-9);
});
test("uma rampa que sobe (ou fica plana) é aceita; uma que cai além da folga é recusada", () => {
  assert.deepStrictEqual(R.violations(fake(flat(1))), []);
  assert.deepStrictEqual(R.violations(fake(Array.from({ length: 20 }, (_, i) => i * 0.3))), []);
  const caiu = flat(1); caiu[12] = 3; // a Fase 13 mais difícil que as seguintes
  const bad = R.violations(fake(caiu));
  assert.ok(bad.length >= 3 && bad.every((b) => /Fase 13/.test(b)), bad.join("\n"));
});
test("a 18 e a 19 abaixo da 17 (além da folga) são recusadas, e acima da 20 também", () => {
  const abaixo = Array.from({ length: 20 }, (_, i) => (i < 16 ? 0.5 : 3)); abaixo[17] = 1; // Fase 18 caiu abaixo da 17
  assert.ok(R.violations(fake(abaixo)).some((b) => /Fase 18/.test(b)));
  const acima = Array.from({ length: 20 }, (_, i) => (i < 17 ? 0.5 : 1)); acima[18] = 4; acima[19] = 1.5; // Fase 19 passa da 20
  assert.ok(R.violations(fake(acima)).some((b) => /Fase 20/.test(b)));
});
test("a regra vale para os 3 bichinhos nas 20 fases, com pelo menos 12 sementes por fase (24 nas Fases 11 a 20)", () => {
  for (const a of R.ANIMALS) for (let i = 1; i <= 20; i++) {
    const r = table.animals[a] && table.animals[a][i];
    assert.ok(r, `falta ${a} Fase ${i} em tools/difficulty/ramp.json`);
    assert.ok(r.seeds >= (i >= 11 ? 24 : 12), `${a} Fase ${i}: só ${r.seeds} sementes`);
  }
});
test("as medições gravadas obedecem à regra (Cachorrinho, Gatinho e Passarinho)", () => {
  const bad = R.violations(table);
  assert.deepStrictEqual(bad, [], bad.join("\n"));
});
test("as contagens de inimigos gravadas são as do jogo de hoje (mexeu num inimigo? meça de novo)", () => {
  const bad = R.stale(table);
  assert.deepStrictEqual(bad, [], bad.join("\n"));
});
test("a Fase 18 e a Fase 19 de cada bichinho ficam entre a 17 e a 20 (valores medidos)", () => {
  const lines = [];
  for (const a of R.ANIMALS) {
    const t = table.animals[a], r = (i) => t[i].R;
    lines.push(`${a}: 17=${r(17)} 18=${r(18)} 19=${r(19)} 20=${r(20)}`);
    assert.ok(r(18) >= r(17) - R.tol(r(17)) && r(19) >= r(18) - R.tol(r(18)) && r(20) >= r(19) - R.tol(r(19)), `${a}: ${lines[lines.length - 1]}`);
  }
  console.log("     " + lines.join(" | "));
});

console.log(`\n${total - failed} de ${total} verificações ok`);
process.exit(failed ? 1 : 0);
