// Ajudantes do tests/engine.test.js (NÃO é um teste): roda o js/game.js DE VERDADE no Node, sem navegador, dentro de um `vm` com um DOM de mentira (Proxies que aceitam qualquer chamada).
// Dá acesso ao gancho de teste `__game` (tick, start, save, parseSave, builtOf, levelsOf...) e aos botões da página (clique em "Continuar", teclado) como o navegador faria, com o armazenamento em memória e o Records de verdade.
//   makeEnv(opts)      carrega os scripts de js/ na ordem do index.html e devolve { sandbox, G(), R, mem, handlers, listeners, ... }; `opts.root` (padrão: a raiz do repositório), `opts.patch(src)` troca o texto do js/game.js (usado nas mutações),
//                      `opts.mathSeed` dá semente ao Math.random da página (as minhocas são sorteadas com ele)
//   boot(opts)         makeEnv + um jogador "Ana" já escolhido; startBird(B, fase, { seed, start }) começa uma fase do Passarinho com sorteio de semente fixa (o jogo anda sozinho só nos `tick` do teste)
//   press/release      teclas pela mesma via do navegador; click(B, id) clica num botão; loadViaContinue grava um jogo salvo e o carrega pelo botão Continuar.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TILE = 32;

// um objeto que aceita qualquer leitura, chamada e atribuição (devolve outro igual): serve de elemento, de contexto 2D, de AudioContext...
function stub(label = "stub", over = {}) {
  const store = Object.assign(Object.create(null), over);
  const fn = function () {};
  return new Proxy(fn, {
    get(t, k) {
      if (k in store) return store[k];
      if (k === Symbol.toPrimitive) return (hint) => (hint === "number" ? 0 : "");
      if (k === "then") return undefined;
      if (k === Symbol.iterator) return function* () {};
      if (k === "length") return 0;
      if (k === "toString" || k === "valueOf") return () => "";
      const s = stub(label + "." + String(k)); store[k] = s; return s;
    },
    set(t, k, v) { store[k] = v; return true; },
    has(t, k) { return k in store; },
    apply() { return stub(label + "()"); },
    construct() { return stub(label + "new"); },
  });
}

function makeEnv(opts = {}) {
  const root = opts.root || ROOT, mem = opts.mem || {};
  const localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }, key: (i) => Object.keys(mem)[i] ?? null, get length() { return Object.keys(mem).length; }, clear() { for (const k of Object.keys(mem)) delete mem[k]; } };
  const ctx2d = stub("ctx2d", { measureText: () => ({ width: 10 }), createLinearGradient: () => stub("grad"), createRadialGradient: () => stub("grad"), getImageData: () => ({ data: new Uint8ClampedArray(4) }) });
  const els = {}, handlers = {}, listeners = {}, rafs = [];
  const getEl = (id) => els[id] || (els[id] = stub("el#" + id, { id, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: stub("style"), getContext: () => ctx2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }), clientWidth: 800, clientHeight: 600, offsetWidth: 800, offsetHeight: 600, width: 800, height: 600, value: "", textContent: "", innerHTML: "", hidden: false, disabled: false, checked: false, children: [], querySelector: () => stub("qs"), querySelectorAll: () => [], addEventListener(t, f) { (listeners[id + ":" + t] = listeners[id + ":" + t] || []).push(f); }, removeEventListener() {}, setAttribute() {}, getAttribute: () => null, hasAttribute: () => false, appendChild() {}, focus() {}, blur() {}, closest: () => null, contains: () => false, scrollTo() {}, scrollIntoView() {}, replaceChildren() {}, append() {}, remove() {}, inert: false, offsetParent: null }));
  let fakeId = 0;
  const doc = stub("document", { getElementById: getEl, body: getEl("__body"), documentElement: getEl("__html"), querySelector: () => stub("qs"), querySelectorAll: () => [], createElement: () => getEl("__c" + fakeId++), addEventListener() {}, removeEventListener() {}, hasFocus: () => true, hidden: false, visibilityState: "visible", activeElement: null, fonts: { ready: Promise.resolve() } });
  // Math.random da página com semente (o motor sorteia as minhocas com ele); o resto de Math é o de sempre
  const M = Object.create(Math); { let st = (opts.mathSeed || 99991) >>> 0; M.random = () => ((st = (st * 1664525 + 1013904223) >>> 0) / 4294967296); }
  const sandbox = {
    console, Math: M, JSON, Date, Number, String, Array, Object, Set, Map, WeakMap, WeakSet, Symbol, Promise, Error, TypeError, RangeError, RegExp, Int16Array, Uint8Array, Uint8ClampedArray, Float32Array, Float64Array, Int32Array, Uint16Array, Uint32Array, ArrayBuffer, DataView,
    isNaN, isFinite, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, Intl, BigInt, Reflect, Proxy,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: (f) => { rafs.push(f); return rafs.length; }, cancelAnimationFrame() {},
    document: doc, localStorage, matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), navigator: stub("navigator", { getGamepads: () => [], userAgent: "node", maxTouchPoints: 0, vibrate() {} }),
    addEventListener(t, f) { (handlers[t] = handlers[t] || []).push(f); }, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 600, performance: { now: () => 0 }, ResizeObserver: undefined, AudioContext: undefined, webkitAudioContext: undefined,
    Image: function () { return stub("img"); }, location: { href: "http://localhost/", search: "", hash: "" }, history: stub("history"), crypto: require("crypto").webcrypto, TextEncoder, TextDecoder, structuredClone, queueMicrotask,
    getComputedStyle: () => stub("cs"), scrollTo() {}, open() {}, URL, Blob: function () {}, fetch: undefined, screen: stub("screen"),
  };
  for (const n of ["HTMLInputElement", "HTMLTextAreaElement", "HTMLButtonElement", "HTMLElement", "Element", "Node"]) sandbox[n] = class {};
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  const context = vm.createContext(sandbox);
  // os scripts na ordem do index.html (tests/wiring.test.js confere a ordem de lá); os que faltarem são pulados
  const files = (opts.files || ["sound", "themes", "cat-themes", "cat-themes-1", "cat-themes-2", "bird-themes", "bird-themes-1", "bird-themes-2", "cat-art", "bird-art", "profiles", "auth", "records", "config", "board", "version", "cat-levels", "bird-levels", "skins", "skins-dog", "skins-cat", "skins-bird", "game"])
    .filter((f) => fs.existsSync(path.join(root, "js", f + ".js")));
  for (const f of files) {
    let src = fs.readFileSync(path.join(root, "js", f + ".js"), "utf8");
    if (f === "game" && opts.patch) src = opts.patch(src);
    vm.runInContext(src, context, { filename: f + ".js" });
  }
  return { sandbox, context, mem, rafs, handlers, listeners, doc, getEl, G: () => sandbox.__game, R: sandbox.Records };
}

const lcg = (s) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
function boot(o = {}) {
  const E = makeEnv(o), g = E.G(), store = E.R.createStore(E.sandbox.localStorage), name = o.name || "Ana";
  store.setPlayer(name);
  return { E, g, store, name };
}
function startBird(B, level, o = {}) {
  const g = B.g;
  g.setAnimal("bird"); g.autoStart = true;
  g.setRand(lcg(o.seed || 7)); g.start(level, { animal: "bird", ...(o.start || {}) }); g.setRand(null);
  return g;
}
const keyEvt = (k) => ({ key: k, code: "", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, preventDefault() {}, target: {} });
const press = (B, k) => { for (const f of B.E.handlers.keydown || []) f(keyEvt(k)); };
const release = (B, k) => { for (const f of B.E.handlers.keyup || []) f(keyEvt(k)); };
const releaseAll = (B) => { for (const k of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift", " "]) release(B, k); };
const click = (B, id) => { const fs = B.E.listeners[id + ":click"] || []; for (const f of fs) f({ detail: 0, pointerId: 0, preventDefault() {}, target: {} }); return fs.length; };
// grava um jogo salvo para o jogador e o carrega pelo botão "Continuar" (como o menu faz)
function loadViaContinue(B, sv, animal = "bird", name = B.name) {
  B.g.setAnimal(animal);
  const ok = B.store.game(animal).saveGame(name, sv);
  click(B, "btn-pause-menu"); click(B, "btn-continue");
  return ok;
}

module.exports = { ROOT, TILE, stub, makeEnv, boot, startBird, lcg, press, release, releaseAll, click, loadViaContinue };
