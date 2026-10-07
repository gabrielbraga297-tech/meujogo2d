# Histórico de versões

A versão aparece no **menu inicial** do jogo (canto inferior esquerdo), por exemplo "Versão 0.5.0 · 07/10/2026". No GitHub Pages ela também mostra o código curto do commit ("· build abc1234"), que diz exatamente qual atualização está no ar.

Para publicar uma atualização: troque `number` e `date` em `js/version.js` e acrescente a versão aqui, no topo (o teste `node tests/version.test.js` confere se os dois combinam). Correções pequenas aumentam o último número (0.5.0 → 0.5.1); novidades aumentam o do meio (0.5.0 → 0.6.0).

## 0.5.0 — 07/10/2026
- **Fase 3:** 7 rações + **2 ossos** (50 pontos cada; é preciso pegar todos para sair), 2 veterinários, **2 blocos que deslizam** abrindo e fechando portas nos corredores (nunca esmagam, sempre sobra caminho) e **bônus de tempo de 20 pontos a cada 10 s** (de 0 a 200). Uma só vida escondida, numa ração **ou** num osso.
- **Veterinários:** 50 px/s patrulhando e 100 px/s perseguindo na Fase 1; Fase 2 com +10% (55 e 110); Fase 3 com mais +10% (60,5 e 121).
- **Correções da auditoria:** a ração que muda de lugar não cai mais sobre uma já pega (o "Continuar jogo" sumia); o relógio nunca anda para trás; voltar das Pontuações na vitória mantém a Próxima fase; duas abas não se apagam; "Apagar e começar de novo" só descarta o jogo salvo quando o novo começa; avisos de salvar honestos; Esc segurado, nome da conta e cadastro lento; saída com contraste; telas e placar legíveis em celular deitado e pequeno; setas e Espaço rolam as telas longas.
- Jogos salvos da 0.4.0 continuam valendo.

## 0.4.0 — 07/10/2026
- **Fase 2:** mapa novo, 7 rações, 2 veterinários no centro (10% mais espertos) e 1 ou 2 vidas extras sorteadas. Escolha de fase e botão *Próxima fase*.
- **Vidas** de 1 a 5, cumulativas entre as fases; ao perder uma vida o cachorrinho volta ao início (o tempo continua) e as rações que faltam mudam de lugar.
- **Pontuação** pode ficar negativa (−50 por vida perdida); bônus de tempo de 0 a 100 (10 pontos a cada 10 s); até 3 novas tentativas da fase, do zero, a 100 pontos cada.
- Só a **melhor pontuação** de cada jogador em cada fase (sem histórico). "Suas pontuações" só para o usuário; ranking do jogo para todos os jogadores do aparelho.
- **Controle (gamepad)** e atalhos de **teclado** (P pausa/continua, Ctrl+S salva); botão de salvar no placar.
- Ranking compartilhado entre aparelhos programado, mas **em stand by** (desligado).
- **Versão** no menu inicial e este histórico.

## 0.3.0 — 07/10/2026
- Pontuação por fase: 100 por ração, **bônus de tempo** e −50 por vida perdida; vale a maior pontuação da fase e fases diferentes somam.
- **Vida extra** escondida em uma ração (de 1 a 5 vidas) e rações em lugares aleatórios a cada jogo; veterinário mais rápido e insistente com o "!".
- **Contas** com usuário e senha (4 a 20 caracteres), entrar, sair e esqueci a senha; salvar jogo (automático e manual) e Continuar jogo.

## 0.2.0 — 07/10/2026
- Personagem cachorrinho que coleta rações e foge do veterinário (patrulha e perseguição).
- Menu inicial (Como jogar, Pontuações, nome de usuário), 3 vidas em corações, recordes, controles de toque e tamanho proporcional a cada aparelho. Nome do criador no menu.

## 0.1.0 — 06/10/2026
- Primeira versão ("Fase 1"): jogo 2D top-down de coleta em HTML5 Canvas.
