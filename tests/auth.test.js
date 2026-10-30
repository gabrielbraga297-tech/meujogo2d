// Testes unitários das senhas (sem navegador). Uso: node tests/auth.test.js
const assert = require("assert");
const nodeCrypto = require("crypto");
const A = require("../js/auth.js");

let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log("OK   " + name); } catch (e) { failed++; console.log("FAIL " + name + "\n     " + e.message); }
}
const ref = (pw, salt, iter) => nodeCrypto.pbkdf2Sync(pw, salt, iter, 32, "sha256").toString("hex");
const U = (s) => new TextEncoder().encode(s);

(async () => {
  // ---------- PBKDF2 em JavaScript confere com o do Node ----------
  await test("PBKDF2 em JS: vetores conhecidos (RFC 7914 / senha 'password', sal 'salt')", () => {
    assert.strictEqual(A.toHex(A.pbkdf2Js(U("password"), U("salt"), 1)), "120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b");
    assert.strictEqual(A.toHex(A.pbkdf2Js(U("password"), U("salt"), 2)), "ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43");
    assert.strictEqual(A.toHex(A.pbkdf2Js(U("password"), U("salt"), 4096)), "c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a");
  });
  await test("PBKDF2 em JS == Node para senhas curtas, longas (>64 bytes), acentuadas e sais de vários tamanhos", () => {
    const cases = [["a", "s", 1], ["Totó-2024!", "0123456789abcdef", 1000], ["x".repeat(63), "salt", 50], ["x".repeat(64), "salt", 50], ["x".repeat(65), "salt", 50],
      ["senha-" + "é".repeat(30), "sal-comprido-".repeat(10), 777], ["🐶🐶🐶🐶🐶🐶🐶🐶🐶🐶", "z", 123]];
    for (const [pw, salt, it] of cases) assert.strictEqual(A.toHex(A.pbkdf2Js(U(pw), U(salt), it)), ref(pw, salt, it), JSON.stringify([pw.length, salt.length, it]));
  });
  await test("PBKDF2 em JS: 150.000 iterações (as do jogo) conferem e terminam em tempo razoável", () => {
    const t0 = Date.now();
    const got = A.toHex(A.pbkdf2Js(U("Senha#Forte20"), U("0123456789abcdef"), A.ITERATIONS));
    const ms = Date.now() - t0;
    assert.strictEqual(got, ref("Senha#Forte20", "0123456789abcdef", A.ITERATIONS));
    assert.strictEqual(A.ITERATIONS, 150000, "o jogo usa 150.000 iterações");
    console.log(`     (${A.ITERATIONS} iterações em JS puro: ${ms} ms)`);
    assert.ok(ms < 5000, `lento demais: ${ms} ms`);
  });

  // ---------- Regras da senha ----------
  await test("senha: de 4 a 20 caracteres", () => {
    assert.strictEqual(A.validatePassword(""), "empty");
    assert.strictEqual(A.validatePassword("abc"), "short");
    assert.strictEqual(A.validatePassword("abcd"), "");
    assert.strictEqual(A.validatePassword("a".repeat(20)), "");
    assert.strictEqual(A.validatePassword("a".repeat(21)), "long");
    assert.strictEqual(A.validatePassword(null), "empty");
    assert.strictEqual(A.validatePassword(1234), "empty");
  });
  await test("senha: aceita minúsculas, MAIÚSCULAS, números e símbolos, com ou sem eles", () => {
    for (const ok of ["abcdef", "ABCDEF", "AbCdEf", "abc123", "123456", "ab!@#$%", "!@#$%^&*()", "Senha 123", "p@ss-w0rd_Ok", "a.b,c;d:e", "çãõéü-ÇÃÕ", "x".repeat(20)]) {
      assert.strictEqual(A.validatePassword(ok), "", ok);
    }
  });
  await test("senha: conta caracteres e não bytes (acentos e emojis valem 1)", () => {
    assert.strictEqual(A.validatePassword("é".repeat(20)), "");
    assert.strictEqual(A.validatePassword("é".repeat(21)), "long");
    assert.strictEqual(A.validatePassword("🐶".repeat(20)), "");
    assert.strictEqual(A.validatePassword("🐶".repeat(21)), "long");
    assert.strictEqual(A.validatePassword("é".repeat(20)), "", "e + acento combinante conta como 1 (NFC)");
  });
  await test("senha: rejeita caracteres de controle e pedaços soltos de emoji", () => {
    for (const bad of ["abc\ndef", "abc\tdef", "abc\u0000def", "abcd\u007f", "abc def", "ab\ud83dcd", "ab\ude00cd"]) assert.strictEqual(A.validatePassword(bad), "invalid", JSON.stringify(bad));
  });

  // ---------- hash e verificação ----------
  await test("hashPassword guarda só algoritmo, iterações, sal e impressão (nunca a senha)", async () => {
    const r = await A.hashPassword("Segredo#42");
    assert.deepStrictEqual(Object.keys(r).sort(), ["a", "h", "i", "s"]);
    assert.strictEqual(r.a, "pbkdf2-sha256");
    assert.strictEqual(r.i, A.ITERATIONS);
    assert.match(r.s, /^[0-9a-f]{32}$/);
    assert.match(r.h, /^[0-9a-f]{64}$/);
    assert.ok(!JSON.stringify(r).includes("Segredo"));
  });
  await test("o mesmo texto com sais diferentes gera impressões diferentes", async () => {
    const a = await A.hashPassword("mesma-senha"), b = await A.hashPassword("mesma-senha");
    assert.notStrictEqual(a.s, b.s);
    assert.notStrictEqual(a.h, b.h);
  });
  await test("verifyPassword: certa passa; errada, maiúscula/minúscula trocada, vazia e com espaço extra falham", async () => {
    const r = await A.hashPassword("Totó#2024");
    assert.strictEqual(await A.verifyPassword("Totó#2024", r), true);
    for (const wrong of ["Totó#2025", "toto#2024", "TOTÓ#2024", "Totó#2024 ", " Totó#2024", "", "x", null, undefined, 123]) assert.strictEqual(await A.verifyPassword(wrong, r), false, String(wrong));
  });
  await test("verifyPassword: é igual para 'é' composto e decomposto (NFC)", async () => {
    const r = await A.hashPassword("café-1234");
    assert.strictEqual(await A.verifyPassword("café-1234", r), true);
  });
  await test("WebCrypto e versão em JS produzem a mesma impressão (dá para criar numa e entrar na outra)", async () => {
    const native = await A.hashPassword("Compat#1", { iterations: 3000 });
    assert.strictEqual(await A.verifyPassword("Compat#1", native, { forceJs: true }), true);
    const js = await A.hashPassword("Compat#2", { iterations: 3000, forceJs: true });
    assert.strictEqual(await A.verifyPassword("Compat#2", js), true);
    assert.strictEqual(await A.verifyPassword("Compat#3", js, { forceJs: true }), false);
  });
  await test("verifyPassword não quebra com registro adulterado", async () => {
    const r = await A.hashPassword("Seguro#1", { iterations: 1000 });
    for (const bad of [null, {}, { ...r, a: "md5" }, { ...r, s: "zz" }, { ...r, s: "abc" }, { ...r, h: "00" }, { ...r, i: -5 }, { ...r, i: "x" }, { ...r, i: NaN }]) {
      assert.strictEqual(await A.verifyPassword("Seguro#1", bad), false, JSON.stringify(bad));
    }
  });
  await test("hashPassword recusa senha inválida", async () => {
    await assert.rejects(() => A.hashPassword("abc"));
    await assert.rejects(() => A.hashPassword("x".repeat(21)));
  });
  await test("timingSafeEqual", () => {
    assert.ok(A.timingSafeEqual("abc", "abc"));
    assert.ok(!A.timingSafeEqual("abc", "abd"));
    assert.ok(!A.timingSafeEqual("abc", "abcd"));
    assert.ok(!A.timingSafeEqual("abc", null));
  });

  console.log(failed ? `\n${failed} falha(s)` : "\nTodos os testes de senha passaram");
  process.exit(failed ? 1 : 0);
})();
