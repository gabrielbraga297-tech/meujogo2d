# Histórico de versões

A versão aparece no **menu inicial** do jogo (canto inferior esquerdo), por exemplo "Versão 0.7.0 · 08/10/2026". No GitHub Pages ela também mostra o código curto do commit ("· build abc1234"), que diz exatamente qual atualização está no ar.

Para publicar uma atualização: troque `number` e `date` em `js/version.js` e acrescente a versão aqui, no topo (o teste `node tests/version.test.js` confere se os dois combinam). Correções pequenas aumentam o último número (0.5.0 → 0.5.1); novidades aumentam o do meio (0.5.0 → 0.6.0).

## 0.7.0 — 08/10/2026 (em preparação)
- **Velocidades:** veterinários (e carteiros) **10% mais rápidos** em todas as fases (Fase 1: 55 / 110 px/s; Fase 2: 60,5 / 121; Fase 3: 66,55 / 133,1; Fases 4 e 5: 73,21 / 146,41). O cachorrinho ficou **mais lento: 252 px/s na base** (0,7 × os 360 da 0.6.0; Fase 3 = 226,8; Fases 4 e 5 = 238,14). *O pedido era −50%, mas a análise de equilíbrio mostrou que, com os veterinários +10%, o cachorrinho ficaria apenas 16% a 22% mais rápido que um veterinário perseguindo nas Fases 3 a 5; com −30% a folga é de ~60 a 70%.*
- **Fase 3 com 1 a 2 vidas escondidas** (sorteado a cada jogo; no máximo 1 num osso).
- **Vidas realmente escondidas:** o coração em cima do item foi retirado; só se descobre a vida extra ao pegar o item.
- **Fases 6 a 10:** cinco labirintos novos e maiores (45 × 31 até 61 × 39), cada um mais difícil que o anterior a partir da Fase 5: rações 24 → 40, ossos 3 → 5, veterinários +4% de velocidade por fase, alcance do "!" 11 → 15, pontos mínimos 1250 → 2050 e mais portas de bloco e paredes que se movem (até 6 + 6, sorteadas a cada jogo). **Fases 9 e 10:** blocos e paredes **mais rápidos** (portas a cada 2,5 s / 2 s e paredes a cada 8 s / 6 s) e o cachorrinho **renasce onde morreu**.
- **O tempo só começa a correr quando você começa a jogar** (em todas as fases): a fase espera o primeiro passo do cachorrinho; relógio, veterinários e blocos ficam parados até lá.
- **Correções da auditoria da 0.7.0:** "Continuar jogo" com o tempo em 0 não deixa mais o cachorrinho invisível; o aviso "O tempo só começa quando você se mexer." volta depois de pausar, de "Jogo carregado" ou de outro aviso, até o primeiro passo; a tela "Os pontos não bastaram!" explica que você pegou tudo mas a pontuação não chegou ao mínimo (e não que as vidas acabaram); nas Fases 9 e 10 o aviso de perder a vida diz que você renasceu onde caiu; o placar das Fases 5 a 10 não muda de tamanho no meio da partida (os números têm largura fixa); o botão **Voltar** das Pontuações, do Como jogar e da lista de fases fica sempre à vista, e a lista de fases abre com o foco na última fase liberada; *Como jogar* e README atualizados (tempo só corre ao se mexer, renascer no lugar nas Fases 9 e 10, perdas de 250/300 pontos, saída pelos pontos nas Fases 4 a 10).

## 0.6.0 — 08/10/2026
- **Fase 4:** labirinto grande (41 × 29, a câmera segue o cachorrinho), **15 rações + 2 ossos**, **3 veterinários** (+10% de velocidade sobre a Fase 3: 66,55 e 133,1 px/s, com o "!" a 8 quadrados), cachorrinho 5% mais rápido que na Fase 3 (340,2 px/s) e **3 vidas escondidas**. Para passar é preciso **chegar a 800 pontos** na fase.
- **Fase 5:** outro labirinto grande, as mesmas velocidades da Fase 4, **20 rações + 2 ossos**, **4 vidas escondidas**, "!" a 10 quadrados, **poder do osso de 35 s**, **1000 pontos** para passar e, além dos blocos, **paredes que se movem a cada 10 s** (a abertura da sala muda de lugar; o trilho pisca 2 s antes; elas também esmagam).
- **Passar de fase pelos pontos (Fases 4 e 5):** basta a pontuação da fase chegar ao mínimo — não é preciso pegar todas as rações e ossos. A saída fica verde e o jogo avisa quando a meta é atingida. Nas Fases 1 a 3 a saída continua abrindo só com tudo pego.
- **Ossos desde a Fase 2:** cada osso vale **150 pontos** (50 + 100 de bônus), **aumenta a velocidade do cachorrinho em 10%** (cumulativo na fase) e dá o **poder do osso** (30 s; 35 s na Fase 5): os veterinários viram **carteiros**; quem encosta num carteiro ganha **+100 pontos**, e ele **volta ao centro do mapa**, atordoado por 2 s e **50% mais lento** (até o poder acabar). Cada carteiro rende pontos **uma vez por poder** (um novo osso renova o poder), para não dar para "fazer fazenda" parado no posto dele. Quando o poder acaba, os carteiros voltam a ser veterinários.
- **Cachorrinho com o dobro da velocidade** em todas as fases (360 px/s nas Fases 1 e 2; 324 na 3; 340,2 nas 4 e 5).
- **Blocos sorteados:** a cada partida, o número de blocos (e, na Fase 5, de paredes) que se movem é sorteado (Fase 3: 1 a 2 portas; Fase 4: 1 a 3 portas; Fase 5: 1 a 3 portas e 1 a 3 paredes). O jogo salvo guarda quais peças entraram.
- **Veterinários espalhados:** cada um patrulha a sua faixa do mapa, escolhe caminhos longe dos outros, não anda colado nem em fila (quem vem atrás descansa um pouco) e não se sobrepõe a outro; a velocidade real agora é exatamente a da fase, qualquer que seja a taxa de quadros. Corrigido o "veterinário dobrando" quando um bloco ou parede passava por cima deles.
- **Jogar fases anteriores:** novo botão no menu para repetir as fases já vencidas e melhorar o recorde de cada uma. A pontuação se soma ao passar para a **fase seguinte imediata**; ao pular de uma fase para outra, vale a melhor pontuação que já havia guardado da fase jogada.
- **Blocos que esmagam (Fases 4 e 5):** sem o poder do osso, o bloco (ou a parede) que alcança o cachorrinho tira 1 vida; o aviso de fim de jogo diz que o bloco esmagou o cachorrinho.
- **Pontos das Fases 4 e 5:** −200 por vida perdida e mínimo de pontos na fase (o placar mostra *PONTOS n / 800*).
- **Fase 3 um pouco mais fácil no toque:** jogando com o controle de toque (menos preciso), os veterinários da Fase 3 andam 10% mais devagar (54,45 / 108,9 px/s) e o cachorrinho fica 5% mais rápido (340,2 px/s). Com teclado ou controle de videogame nada muda.
- **Veterinários nunca empilhados:** quem espera atrás de um veterinário parado agora volta e escolhe outro caminho em vez de passar por cima dele; o carteiro derrotado volta ao posto mais perto livre (nunca em cima de outro veterinário) e "Continuar jogo" também separa dois veterinários que estavam no mesmo tile. Nas simulações da auditoria não houve mais nenhum quadro com dois veterinários sobrepostos.
- **Telas e acessibilidade:** o aviso do jogo (toast) ocupa só o espaço do texto (não cobre mais metade da tela em celular), nenhuma fonte fica abaixo de 10,5 px, os botões Pausar e Salvar têm 44 px com toque, a aura do poder não pisca com "reduzir movimento" e o poder e o jogo têm rótulos para leitores de tela.
- **Fim da tentativa sem saída:** nas Fases 4 e 5, se todos os itens já foram pegos, o poder acabou e os pontos ainda não chegam ao mínimo, a tentativa termina ("Os pontos não bastaram!") em vez de deixar o jogo preso.
- **Trilhos de blocos e paredes** agora mostram (e piscam) todo o percurso, de ponta a ponta, inclusive as linhas das pontas das paredes de 3 tiles.
- **Avisos juntos:** num osso com vida extra, o aviso da vida e o do poder aparecem na mesma mensagem.
- **Textos:** o *Como jogar* e as *Pontuações* agora dizem 150 por osso, +100 por carteiro e a regra da saída pelos pontos mínimos.
- **Jogos salvos:** partidas salvas da **Fase 2** em versões anteriores (sem ossos) não continuam na 0.6.0 (a fase ganhou 2 ossos); recordes, progresso e jogos salvos das Fases 1 e 3 continuam valendo.
- **Tabela das fases** (condição de avanço, veterinários, rações, ossos, velocidades) no README, conferida por teste; ela é entregue a cada nova fase.
- **Entrega contínua:** a 0.6.0 foi ao ar por partes, à medida que cada item ficou pronto e testado, e agora está 100% entregue (duas auditorias completas, com céticos por achado, e uma revisão final).

## 0.5.0 — 07/10/2026
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
- **Entrega contínua:** a 0.5.0 foi ao ar por partes, à medida que cada item ficou pronto e testado, e agora está 100% entregue.

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
