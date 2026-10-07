# Histórico de versões

A versão aparece no **menu inicial** do jogo (canto inferior esquerdo), por exemplo "Versão 0.5.0 · 07/10/2026". No GitHub Pages ela também mostra o código curto do commit ("· build abc1234"), que diz exatamente qual atualização está no ar.

Para publicar uma atualização: troque `number` e `date` em `js/version.js` e acrescente a versão aqui, no topo (o teste `node tests/version.test.js` confere se os dois combinam). Correções pequenas aumentam o último número (0.5.0 → 0.5.1); novidades aumentam o do meio (0.5.0 → 0.6.0).

## 0.6.0 — 07/10/2026 (em preparação)
- **Fase 4:** labirinto grande (41 × 29, a câmera segue o cachorrinho), **10 rações + 2 ossos**, **3 veterinários** (+10% de velocidade sobre a Fase 3: 66,55 e 133,1 px/s, com o "!" a 8 quadrados), cachorrinho **5% mais rápido** que na Fase 3 (170,1 px/s) e **3 vidas escondidas**.
- **Fase 5:** outro labirinto grande, as mesmas velocidades da Fase 4, 10 rações + 2 ossos, **4 vidas escondidas**, "!" a 10 quadrados, **poder do osso de 35 s**, **1000 pontos** para passar e, além das 3 portas de bloco, **3 paredes que se movem a cada 10 s** (a abertura da sala muda de lugar; o trilho pisca 2 s antes; elas também esmagam).
- **Poder do osso (Fases 4 e 5):** o osso vira os veterinários em **carteiros** por 30 s (35 s na Fase 5); quem encosta num carteiro ganha dele; depois eles voltam ao normal.
- **Blocos que esmagam (Fases 4 e 5):** sem o poder do osso, o bloco (ou a parede) que alcança o cachorrinho tira 1 vida.
- **Pontos das Fases 4 e 5:** −200 por vida perdida e **mínimo de pontos na fase** para passar (800 na Fase 4, 1000 na Fase 5; o placar mostra *PONTOS n / 800*).

## 0.5.0 — 07/10/2026 (em preparação)
- **Fase 3:** 7 rações + **2 ossos** (50 pontos cada; é preciso pegar todos para sair), 2 veterinários, **2 blocos que deslizam** abrindo e fechando portas nos corredores (nunca esmagam, sempre sobra caminho) e **bônus de tempo de 20 pontos a cada 10 s** (de 0 a 200). Uma só vida escondida, numa ração **ou** num osso.
- **Cachorrinho 10% mais lento na Fase 3** (162 px/s; nas Fases 1 e 2 segue 180 px/s).
- **Veterinários:** 50 px/s patrulhando e 100 px/s perseguindo na Fase 1; Fase 2 com +10% (55 e 110); Fase 3 com mais +10% (60,5 e 121).
- **Correções da auditoria:** a ração que muda de lugar não cai mais sobre uma já pega (o "Continuar jogo" sumia); o relógio nunca anda para trás; voltar das Pontuações na vitória mantém a Próxima fase; duas abas não se apagam; "Apagar e começar de novo" só descarta o jogo salvo quando o novo começa; avisos de salvar honestos; Esc segurado, nome da conta e cadastro lento; saída com contraste; telas e placar legíveis em celular deitado e pequeno; setas e Espaço rolam as telas longas.
- **Blocos da Fase 3:** mudam de lado **a cada 3 s**, sem esperar o cachorrinho nem os veterinários, e deslizam duas vezes mais rápido; o trilho pisca antes de cada mudança. Quem estiver no caminho é empurrado para o lado (nunca esmagado).
- **Como jogar** ficou mais enxuto: só o básico (objetivo, mover, veterinário, vidas, sem vidas, pontuação, salvar, pausar, teclado, controle, pontuações e conta), sem as instruções detalhadas de cada fase.
- **Alcance do "!":** o veterinário agora liga o "!" na hora em que o cachorrinho está à vista dentro de **2 quadrados (Fase 1), 4 (Fase 2) e 6 (Fase 3)** — sem sorteio; a regra é 2 × o número da fase (Fase 4 = 8 e Fase 5 = 10, quando existirem).
- **Pausa automática** ao perder o foco da janela e jogo salvo/pontuação que seguem com **quem começou a partida** (mesmo que outra aba troque o jogador).
- **2ª auditoria (correções):** o placar não faz mais o campo piscar em celulares em pé (laço de redimensionamento); entrar aceita espaços sobrando e o apóstrofo ’ como o cadastro; o jogo salvo não some quando um bloco está encostado no cachorrinho; *Próxima fase / Jogar novamente / Tentar novamente* seguem com quem jogou (não mexem no jogo salvo de outro jogador nem liberam fase bloqueada); conta apagada em outra aba não é recriada pela partida em andamento; o controle rola o *Como jogar* e as *Pontuações*; avisos e textos falam de ossos e blocos.
- Jogos salvos da 0.4.0 continuam valendo.
- **Entrega contínua:** a 0.5.0 vai ao ar por partes, à medida que cada item fica pronto e testado; enquanto não estiver 100% entregue o menu mostra "(em preparação)".

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
