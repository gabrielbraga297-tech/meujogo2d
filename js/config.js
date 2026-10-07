// Configuração do jogo. Para ligar o ranking compartilhado entre aparelhos, coloque aqui o endereço de um
// Firebase Realtime Database (ou de um servidor com a mesma API REST). Veja "Ranking compartilhado" no README.
// Exemplo: rankingUrl: "https://meu-projeto-default-rtdb.firebaseio.com/cachorrinho"
// Vazio = o ranking mostra só os jogadores deste aparelho.
window.GAME_CONFIG = Object.assign({ rankingUrl: "" }, window.GAME_CONFIG);
