// Configuração do jogo.
//
// RANKING COMPARTILHADO ENTRE APARELHOS: EM STAND BY (desligado). Por enquanto o ranking é só por aparelho e o jogo
// não conversa com nenhum servidor. O código (js/board.js) continua aqui, pronto, e só é usado se `sharedRanking` for true.
//
// Para ligar no futuro: sharedRanking: true e, para usar um servidor REST no estilo Firebase Realtime Database,
// rankingUrl com o endereço do banco. Exemplo: "https://meu-projeto-default-rtdb.firebaseio.com/cachorrinho"
// (veja "Ranking compartilhado (em stand by)" no README).
window.GAME_CONFIG = Object.assign({ sharedRanking: false, rankingUrl: "" }, window.GAME_CONFIG);
