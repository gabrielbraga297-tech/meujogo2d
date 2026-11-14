// Aviso de VERSÃO NOVA (0.23.0, "atualização sem cache velho"). Quem deixa o jogo aberto, ou volta a ele depois de um tempo, pode estar com uma versão velha; o GitHub Pages guarda cada arquivo no navegador por alguns minutos.
// Duas defesas: (1) quando o site é publicado, o workflow põe o código do commit no endereço de cada script e do CSS (index.html → js/game.js?v=abc1234; tools/publish/cache-bust.py), então uma versão nova nunca é
// montada com um pedaço velho guardado no navegador; (2) este arquivo pergunta ao servidor, sem usar o que está guardado, qual é a `build` de js/version.js e, se for outra, o menu mostra "Tem uma versão nova do jogo".
// Só compara quando as duas builds são códigos de commit (hexadecimais): na pasta de desenvolvimento a build é "dev" e nunca há aviso. Qualquer falha (sem internet, arquivo local, resposta estranha) é silenciosa.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UpdateCheck = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const HEX = /^[0-9a-f]{7,40}$/;
  const MIN_GAP_MS = 5 * 60 * 1000; // no máximo uma pergunta ao servidor a cada 5 minutos
  // lê a `build` de um js/version.js: build: "abc1234" (devolve null se não achar um código de commit)
  function parseBuild(text) {
    const m = /build:\s*"([0-9a-f]{7,40})"/.exec(String(text == null ? "" : text).slice(0, 4000));
    return m ? m[1] : null;
  }
  const isCommit = (b) => typeof b === "string" && HEX.test(b);
  // há versão nova? só se as duas são códigos de commit e são diferentes
  const isNewer = (current, remote) => isCommit(current) && isCommit(remote) && current !== remote;
  // check({ fetchFn, current, url }): pergunta e devolve true/false; nunca lança erro. `fetchFn(url, opções)` é o fetch do navegador (ou um de mentira nos testes).
  async function check(o) {
    try {
      if (!o || typeof o.fetchFn !== "function" || !isCommit(o.current)) return false;
      const res = await o.fetchFn(String(o.url), { cache: "no-store", credentials: "omit" });
      if (!res || res.ok === false) return false;
      return isNewer(o.current, parseBuild(await res.text()));
    } catch { return false; }
  }
  return { parseBuild, isNewer, isCommit, check, MIN_GAP_MS };
});
