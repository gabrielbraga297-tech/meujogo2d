// Versão do jogo, mostrada no menu inicial.
// A cada atualização publicada: aumente `number` (0.5.0 → 0.5.1 para correções, 0.6.0 para novidades), troque `date` e
// acrescente a versão no topo do CHANGELOG.md (o teste tests/version.test.js confere se os dois combinam).
// `stage`: "em preparação" enquanto a versão ainda está recebendo itens (entrega contínua: cada item pronto e testado já vai ao ar);
// apague a linha (ou deixe "") quando a versão estiver 100% entregue. O CHANGELOG marca o mesmo na entrada do topo.
// `build` vale "dev" no código; ao publicar no GitHub Pages o workflow troca "dev" pelo código curto do commit,
// para saber exatamente qual versão está no ar.
window.GAME_VERSION = { number: "0.7.0", stage: "em preparação", date: "2026-10-08", build: "dev" };
