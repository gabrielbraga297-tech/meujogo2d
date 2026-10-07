# Histórico de versões

A versão aparece no **menu inicial** do jogo (canto inferior esquerdo), por exemplo "Versão 0.3.0 · 07/10/2026". No GitHub Pages ela também mostra o código curto do commit ("· build abc1234"), que diz exatamente qual atualização está no ar.

Para publicar uma atualização: troque `number` e `date` em `js/version.js` e acrescente a versão aqui, no topo (o teste `node tests/version.test.js` confere se os dois combinam). Correções pequenas aumentam o último número (0.3.0 → 0.3.1); novidades aumentam o do meio (0.3.0 → 0.4.0).

## 0.3.0 — 07/10/2026
- **Fase 2:** mapa novo, 7 rações, 2 veterinários no centro (10% mais espertos) e 1 ou 2 vidas extras sorteadas. Escolha de fase e botão *Próxima fase*.
- **Vidas** de 1 a 5, cumulativas entre as fases; ao perder uma vida o cachorrinho volta ao início (o tempo continua) e as rações que faltam mudam de lugar.
- **Pontuação** pode ficar negativa (−50 por vida perdida); bônus de tempo de 0 a 100 (10 pontos a cada 10 s); até 3 novas tentativas da fase, do zero, a 100 pontos cada.
- Só a **melhor pontuação** de cada jogador em cada fase (sem histórico). "Suas pontuações" só para o usuário; ranking do jogo para todos os jogadores do aparelho.
- **Controle (gamepad)** e atalhos de **teclado** (P pausa/continua, Ctrl+S salva); botão de salvar no placar.
- Ranking compartilhado entre aparelhos programado, mas **em stand by** (desligado).
- **Versão** no menu inicial.

## 0.2.0 — 07/10/2026
- Personagem cachorrinho que coleta rações e foge do veterinário (patrulha e perseguição, com "!").
- Menu inicial, nome de usuário, contas com senha, 3 vidas (corações), vida extra, pontuação com bônus de tempo, jogo salvo (automático e manual), controles de toque e tamanho proporcional a cada aparelho. Nome do criador no menu.

## 0.1.0 — 06/10/2026
- Primeira versão ("Fase 1"): jogo 2D top-down de coleta em HTML5 Canvas.
