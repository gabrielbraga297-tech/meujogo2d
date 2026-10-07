// Versão do jogo, mostrada no menu inicial.
// A cada atualização publicada: aumente `number` (0.3.0 → 0.3.1 para correções, 0.4.0 para novidades), troque `date` e
// acrescente a versão no topo do CHANGELOG.md (o teste tests/version.test.js confere se os dois combinam).
// `build` vale "dev" no código; ao publicar no GitHub Pages o workflow troca "dev" pelo código curto do commit,
// para saber exatamente qual versão está no ar.
window.GAME_VERSION = { number: "0.3.0", date: "2026-10-07", build: "dev" };
