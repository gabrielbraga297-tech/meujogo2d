// Senhas do cadastro simples: validação e "impressão" (hash) PBKDF2-SHA256 com sal aleatório.
// A senha nunca é guardada: só o sal e a impressão. Funciona no navegador (window.Auth) e no Node (testes).
// Usa a criptografia nativa (WebCrypto) quando existe; senão (ex.: página em http) usa uma versão em JavaScript.
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Auth = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  const PASSWORD_MIN = 4;
  const PASSWORD_MAX = 20;      // até 20 caracteres
  const ITERATIONS = 150000;
  const ALGORITHM = "pbkdf2-sha256";

  // ---------- Regras da senha ----------
  // Qualquer caractere visível vale: minúsculas, MAIÚSCULAS, números, símbolos, acentos e espaços (números e símbolos são opcionais).
  const normalize = (pw) => pw.normalize("NFC");
  const passwordLength = (pw) => Array.from(normalize(pw)).length; // conta caracteres, não bytes (emoji = 1)

  // Devolve "" se a senha é válida, ou o motivo: "empty" | "short" | "long" | "invalid".
  function validatePassword(pw) {
    if (typeof pw !== "string" || pw.length === 0) return "empty";
    const n = passwordLength(pw);
    if (n < PASSWORD_MIN) return "short";
    if (n > PASSWORD_MAX) return "long";
    if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(pw)) return "invalid"; // sem caracteres de controle
    try { // sem pedaços soltos de emoji (não são codificáveis e fariam senhas diferentes colidirem)
      if (new TextDecoder("utf-8", { fatal: false }).decode(new TextEncoder().encode(pw)) !== pw) return "invalid";
    } catch { return "invalid"; }
    return "";
  }

  // ---------- Utilidades ----------
  const toHex = (u8) => Array.from(u8, (b) => b.toString(16).padStart(2, "0")).join("");
  function fromHex(h) {
    if (typeof h !== "string" || h.length % 2 || !/^[0-9a-f]*$/.test(h)) throw new Error("hex inválido");
    const out = new Uint8Array(h.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  function randomBytes(n) {
    const out = new Uint8Array(n);
    const c = root.crypto;
    if (c && typeof c.getRandomValues === "function") c.getRandomValues(out);
    else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256); // o sal só precisa ser único
    return out;
  }
  function timingSafeEqual(a, b) { // compara sem parar no primeiro byte diferente
    if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // ---------- SHA-256 e PBKDF2 em JavaScript (plano B quando não há WebCrypto) ----------
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  function compress(H, W) { // W[0..15] já preenchido; atualiza H
    for (let i = 16; i < 64; i++) {
      const a = W[i - 15], b = W[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }

  const wordsOf = (bytes, off, W) => { // 16 palavras big-endian
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      W[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
  };

  // Continua um SHA-256 a partir do estado `state` (depois de `prefixLen` bytes já processados) com `msg` e o preenchimento final.
  function finishFrom(state, msg, prefixLen) {
    const H = Uint32Array.from(state), W = new Uint32Array(64);
    const total = msg.length + 1 + 8, padded = new Uint8Array(Math.ceil(total / 64) * 64);
    padded.set(msg); padded[msg.length] = 0x80;
    const bits = (prefixLen + msg.length) * 8, dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
    dv.setUint32(padded.length - 4, bits >>> 0);
    for (let off = 0; off < padded.length; off += 64) { wordsOf(padded, off, W); compress(H, W); }
    return H;
  }
  const sha256 = (bytes) => finishFrom(IV, bytes, 0);
  const wordsToBytes = (H) => { const out = new Uint8Array(H.length * 4), dv = new DataView(out.buffer); H.forEach((w, i) => dv.setUint32(i * 4, w >>> 0)); return out; };

  function pbkdf2Js(password, salt, iterations) { // 32 bytes (1 bloco), HMAC-SHA256
    const key = password.length > 64 ? wordsToBytes(sha256(password)) : password;
    const ipad = new Uint8Array(64).fill(0x36), opad = new Uint8Array(64).fill(0x5c);
    for (let i = 0; i < key.length; i++) { ipad[i] ^= key[i]; opad[i] ^= key[i]; }
    const W = new Uint32Array(64), inner = Uint32Array.from(IV), outer = Uint32Array.from(IV);
    wordsOf(ipad, 0, W); compress(inner, W);
    wordsOf(opad, 0, W); compress(outer, W);

    const msg = new Uint8Array(salt.length + 4); msg.set(salt); msg[salt.length + 3] = 1; // salt || INT(1)
    const finishOuter = (digest) => { // HMAC externo sobre 32 bytes: 1 bloco
      const H = Uint32Array.from(outer);
      W.set(digest, 0); W[8] = 0x80000000; W.fill(0, 9, 15); W[15] = (64 + 32) * 8;
      compress(H, W);
      return H;
    };
    let u = finishOuter(finishFrom(inner, msg, 64));
    const t = Uint32Array.from(u);
    for (let it = 1; it < iterations; it++) {
      const Hin = Uint32Array.from(inner);
      W.set(u, 0); W[8] = 0x80000000; W.fill(0, 9, 15); W[15] = (64 + 32) * 8;
      compress(Hin, W);
      u = finishOuter(Hin);
      for (let j = 0; j < 8; j++) t[j] ^= u[j];
    }
    return wordsToBytes(t);
  }

  async function pbkdf2(passwordBytes, saltBytes, iterations, forceJs) {
    const subtle = !forceJs && root.crypto && root.crypto.subtle;
    if (subtle) {
      try {
        const key = await subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
        return new Uint8Array(await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations }, key, 256));
      } catch { /* cai para a versão em JavaScript */ }
    }
    await new Promise((r) => setTimeout(r, 20)); // deixa a tela atualizar antes do cálculo mais pesado
    return pbkdf2Js(passwordBytes, saltBytes, iterations);
  }

  // ---------- API ----------
  // opts (testes): { iterations, forceJs }
  async function hashPassword(password, opts = {}) {
    if (validatePassword(password)) throw new Error("senha inválida");
    const iterations = opts.iterations || ITERATIONS, salt = randomBytes(16);
    const hash = await pbkdf2(new TextEncoder().encode(normalize(password)), salt, iterations, opts.forceJs);
    return { a: ALGORITHM, i: iterations, s: toHex(salt), h: toHex(hash) };
  }

  async function verifyPassword(password, record, opts = {}) {
    try {
      if (!record || record.a !== ALGORITHM || typeof password !== "string" || validatePassword(password)) return false;
      const hash = await pbkdf2(new TextEncoder().encode(normalize(password)), fromHex(record.s), record.i, opts.forceJs);
      return timingSafeEqual(toHex(hash), record.h);
    } catch { return false; }
  }

  return { PASSWORD_MIN, PASSWORD_MAX, ITERATIONS, ALGORITHM, validatePassword, hashPassword, verifyPassword, pbkdf2Js, toHex, fromHex, timingSafeEqual };
});
