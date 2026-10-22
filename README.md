# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1 a Fase 20** (com gatos, missões, ossos de tipos novos, bolinhas, petiscos e lojinha de skins).

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Versão
A versão do jogo aparece no **menu inicial** (canto inferior esquerdo), por exemplo "Versão 0.16.0 · 22/10/2026". No GitHub Pages ela também mostra o código do commit ("· build abc1234"), que diz exatamente qual atualização está no ar. O histórico de mudanças está no [`CHANGELOG.md`](CHANGELOG.md); para publicar uma atualização, mude `js/version.js` e o `CHANGELOG.md` (o teste `node tests/version.test.js` confere se combinam).

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), no computador, celular ou tablet.

## Objetivo
Você é um cachorrinho. Pegue as tigelas de ração (e, a partir da Fase 2, os **ossos**) e chegue à saída. Nas Fases 1 a 3 a saída só abre quando você pegar **tudo**; nas **Fases 4 a 20** ela abre assim que a sua pontuação na fase chega aos **pontos mínimos** (800 na Fase 4, 1000 na 5, de 1250 a 2050 nas Fases 6 a 10 e de 2300 a 4000 nas Fases 11 a 20), sem precisar pegar tudo; **a partir da Fase 11 também é preciso cumprir a missão da fase**. Os itens aparecem em **lugares diferentes a cada jogo**, e **alguns trazem uma vida extra** (escondida: você só descobre ao pegar o item).

**O tempo só começa a correr quando você dá o primeiro passo** (em todas as fases): até lá o relógio, os agentes da carrocinha e os blocos ficam parados, e um aviso na tela lembra disso. O mesmo vale ao **continuar um jogo salvo** com o tempo em 0 e ao **tentar a fase de novo**.

Você é um cachorrinho de rua e os **agentes da carrocinha** querem pegá-lo. Fuja do agente da carrocinha! Quando aparece um **!** vermelho em cima dele, ele fica mais rápido e persegue o cachorrinho com mais força (mas o cachorrinho é bem mais veloz). Os agentes da carrocinha **não andam juntos**: cada um escolhe a patrulha longe dos outros, não ficam colados nem um em cima do outro, e, perseguindo, tentam caminhos diferentes até o cachorrinho.

## Tabela das fases
Esta tabela é conferida por um teste automático com os dados do jogo (`node tests/e2e.js "tabela das fases"`) e deve ser entregue de novo **sempre que uma fase nova for criada**.

| Fase | Condição para avançar | Agentes da carrocinha | Rações | Ossos | Velocidade dos agentes da carrocinha (sem ! / com !) | Velocidade do cachorrinho |
|---|---|---|---|---|---|---|
| 1 | pegar as 5 rações e chegar à saída | 1 | 5 | 0 | 55 / 110 px/s | 201,6 px/s |
| 2 | pegar as 7 rações e os 2 ossos e chegar à saída | 2 | 7 | 2 | 60,5 / 121 px/s | 252 px/s |
| 3 | pegar as 7 rações e os 2 ossos e chegar à saída | 2 | 7 | 2 | 66,55 / 133,1 px/s | 226,8 px/s |
| 4 | chegar a 800 pontos na fase (a saída abre) e sair | 3 | 15 | 2 | 73,21 / 146,41 px/s | 238,14 px/s |
| 5 | chegar a 1000 pontos na fase (a saída abre) e sair | 3 | 20 | 2 | 73,21 / 146,41 px/s | 238,14 px/s |
| 6 | chegar a 1250 pontos na fase (a saída abre) e sair | 3 | 24 | 3 | 76,14 / 152,27 px/s | 241,92 px/s |
| 7 | chegar a 1400 pontos na fase (a saída abre) e sair | 4 | 28 | 3 | 79,07 / 158,12 px/s | 244,44 px/s |
| 8 | chegar a 1650 pontos na fase (a saída abre) e sair | 5 | 32 | 4 | 82 / 163,98 px/s | 246,96 px/s |
| 9 | chegar a 1800 pontos na fase (a saída abre) e sair | 5 | 36 | 4 | 84,92 / 169,84 px/s | 249,48 px/s |
| 10 | chegar a 2050 pontos na fase (a saída abre) e sair | 6 | 40 | 5 | 87,85 / 175,69 px/s | 252 px/s |
| 11 | chegar a 2300 pontos na fase **e cumprir a missão** (pegar todos os 5 ossos); só então a saída abre — e sair | 5 | 44 | 5 | 89,32 / 178,62 px/s | 252 px/s |
| 12 | chegar a 2450 pontos na fase **e cumprir a missão** (pegar 34 das 46 rações); só então a saída abre — e sair | 5 | 46 | 5 | 90,78 / 181,55 px/s | 252 px/s |
| 13 | chegar a 2650 pontos na fase **e cumprir a missão** (pegar 36 das 48 rações); só então a saída abre — e sair | 6 | 48 | 6 | 92,24 / 184,48 px/s | 252 px/s |
| 14 | chegar a 2800 pontos na fase **e cumprir a missão** (pegar todos os 6 ossos); só então a saída abre — e sair | 6 | 50 | 6 | 93,71 / 187,4 px/s | 252 px/s |
| 15 | chegar a 3000 pontos na fase **e cumprir a missão** (pegar 40 das 52 rações); só então a saída abre — e sair | 6 | 52 | 6 | 95,17 / 190,33 px/s | 252 px/s |
| 16 | chegar a 3200 pontos na fase **e cumprir a missão** (pegar 44 das 54 rações); só então a saída abre — e sair | 7 | 54 | 7 | 96,64 / 193,26 px/s | 252 px/s |
| 17 | chegar a 3400 pontos na fase **e cumprir a missão** (pegar todos os 7 ossos e pegar 40 das 56 rações); só então a saída abre — e sair | 7 | 56 | 7 | 98,1 / 196,19 px/s | 252 px/s |
| 18 | chegar a 3600 pontos na fase **e cumprir a missão** (pegar 46 das 58 rações); só então a saída abre — e sair | 8 | 58 | 7 | 99,57 / 199,12 px/s | 252 px/s |
| 19 | chegar a 3800 pontos na fase **e cumprir a missão** (pegar todos os 8 ossos e pegar 48 das 60 rações); só então a saída abre — e sair | 8 | 60 | 8 | 101,03 / 202,05 px/s | 252 px/s |
| 20 | chegar a 4000 pontos na fase **e cumprir a missão** (pegar todos os 8 ossos e pegar 52 das 62 rações); só então a saída abre — e sair | 8 | 62 | 8 | 102,49 / 204,97 px/s | 252 px/s |

- A velocidade do cachorrinho **sobe 10% a cada osso pego** (até o fim da fase). Os números acima são a velocidade base de cada fase (na 0.7.0 a do cachorrinho é 0,7 × a da 0.6.0: 360 → 252 px/s; a Fase 3 usa 90% e as Fases 4 e 5 usam 94,5%; os agentes da carrocinha ganharam +10% em todas as fases).
- Um **carteiro** atingido pelo cachorrinho com poder volta ao centro do mapa, fica tonto por 2 s e depois foge a **50% da velocidade de fuga** (0,625 × a velocidade de patrulha da tabela, ou seja 37,8 px/s na Fase 2) até o poder acabar.
- **Fase 3 no celular:** quando se joga com o **controle de toque** (menos preciso que teclado), a Fase 3 fica um pouco mais fácil: os agentes da carrocinha andam **10% mais devagar** (59,9 / 119,8 px/s) e o cachorrinho fica **5% mais rápido** (238,14 px/s). Com teclado ou controle de videogame valem os números da tabela (campo `touchEase` da fase, em `js/game.js`).
- As fases são liberadas em ordem: cada uma abre ao terminar a anterior.

## Fases
| | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 |
|---|---|---|---|---|---|
| Mapa | **labirinto do quintal**: 25 × 18, 20 quarteirões, **nenhum beco sem saída** | **outro labirinto** (25 × 18) com 2 becos sem saída | **labirinto da casa** (25 × 18) com 3 becos e portas de bloco | **labirinto de cidade** (41 × 29 tiles; a câmera segue o cachorrinho): 35 quarteirões, **sem becos** | **outro labirinto de cidade** (43 × 29), 2 becos, com avenidas de paredes que se movem |
| Rações | 5 | **7** | **7** | **15** | **20** |
| Ossos | — | **2** (poder de 30 s) | **2** (poder de 30 s) | **2** (poder de 30 s) | **2** (poder de **35 s**) |
| Bolinhas (0.15.8, +50 cada) | — | 1 | 1 | 2 | 2 |
| Vida extra escondida (sem aviso: só se descobre ao pegar o item) | 1 ração | **1 ou 2** itens (sorteado a cada jogo) | **1 ou 2** (no máximo 1 num osso) | **3** (no máximo 1 num osso) | **4** (no máximo 1 num osso) |
| Agentes da carrocinha | 1 | **2**, em quarteirões longe do início e da saída | **2**, em quarteirões longe do início e da saída | **3**, na **praça** do centro | **3**, na **praça** do centro |
| Dificuldade dos agentes da carrocinha | base | **10% mais espertos** | **mais 10% de velocidade** sobre a Fase 2 | **mais 10% de velocidade** sobre a Fase 3 | igual à Fase 4 |
| Blocos que se movem | — | — | de **1 a 2** portas (sorteado a cada jogo) | de **1 a 3** portas, e agora **esmagam** | de **1 a 3** portas que esmagam **+ de 1 a 3 paredes** que se movem a cada 10 s |
| Pontos | 100 por ração; −50 por vida | idem, **+150 por osso** e **+100 por carteiro** | idem | idem, **−200 por vida** e **800 pontos** para passar | −200 por vida e **1000 pontos** para passar |
| Bônus de tempo | 0 a 100 (10 a cada 10 s) | 0 a 100 (10 a cada 10 s) | **0 a 200 (20 a cada 10 s)** | 0 a 200 (20 a cada 10 s) | 0 a 200 (20 a cada 10 s) |

### Fases 6 a 10 (0.7.0)
Cidades cada vez maiores, a partir da Fase 6: mais rações, mais ossos, **mais agentes da carrocinha** (3, 4, 5, 5 e 6, proporcional ao tamanho do mapa), agentes da carrocinha mais rápidos (+4% por fase sobre a Fase 5) e mais blocos e paredes que se movem (o número de peças de cada tipo é **sorteado a cada jogo** dentro de uma faixa). O cachorrinho sobe só um pouco de velocidade por fase para continuar mais rápido que o agente da carrocinha perseguindo (pelo menos 40% mais).

| | Fase 6 | Fase 7 | Fase 8 | Fase 9 | Fase 10 |
|---|---|---|---|---|---|
| Mapa | 51 × 31 | 51 × 39 | 53 × 39 | 61 × 39 | 63 × 41 |
| Rações / ossos | 24 / 3 | 28 / 3 | 32 / 4 | 36 / 4 | 40 / 5 |
| Bolinhas (+50 cada) | 3 | 3 | 3 | 3 | 3 |
| Agentes da carrocinha (no centro do mapa) | 3 | 4 | 5 | 5 | 6 |
| Vidas escondidas (sorteio por jogo) | 3 ou 4 (no máximo 1 num osso) | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 |
| Alcance do "!" | 11 quadrados | 12 | 13 | 14 | 15 |
| Portas de bloco / paredes (definidas) | 4 / 4 | 5 / 4 | 5 / 5 | 6 / 6 | 6 / 6 |
| Sorteio por jogo (portas; paredes) | 2–4; 2–4 | 3–5; 2–4 | 3–5; 3–5 | 4–6; 4–6 | 5–6; 5–6 |
| Portas mudam de lado a cada | 3 s | 3 s | 3 s | **2,5 s** (160 px/s) | **2 s** (200 px/s) |
| Paredes mudam de lado a cada | 10 s | 10 s | 10 s | **8 s** (140 px/s) | **6 s** (160 px/s) |
| Perda por vida / pontos para passar | −250 / 1250 | −250 / 1400 | −250 / 1650 | −300 / 1800 | −300 / 2050 |
| Poder do osso | 35 s | 35 s | 35 s | 35 s | 35 s |
| Ao ser pego ou esmagado | volta ao início | volta ao início | volta ao início | **renasce onde morreu** | **renasce onde morreu** |

Da **Fase 9 até a Fase 20** o cachorrinho **renasce onde morreu** (se um bloco ou parede estiver em cima, é empurrado para o lado livre mais perto), com a proteção de 2 s de sempre; os agentes da carrocinha voltam aos postos. Os mapas foram gerados por script e conferidos: em **qualquer** posição das peças móveis todo o chão continua ligado.

### Fases 11 a 20 (0.15.4)
Dez labirintos de cidade ainda maiores (de 65 × 41 até 83 × 53 tiles, de 77 a 117 quarteirões), com **mais becos sem saída** (19 até 35), mais rações, mais ossos, **de 5 a 8 agentes da carrocinha** (velocidade da Fase 10 mais 2% por fase), alcance do "!" de 16 a 20 quadrados, as peças móveis cada vez mais rápidas e **mais pontos para passar** (2300 até 4000, com perda de 300 a 400 por vida). Todas têm 6 portas e 6 paredes que se movem (sorteadas a cada jogo, de 5 a 6 de cada), 3 caminhos sem célula em comum do início à saída e o cachorrinho renasce onde morreu. Todas têm **gatos** (de 2 a 7, veja *Os gatos*). Cada fase é um **lugar novo** (veja *Ambientes*). A Fase 20 ainda não tem o chefão (fica para um próximo capítulo).

| | Fase 11 | Fase 12 | Fase 13 | Fase 14 | Fase 15 | Fase 16 | Fase 17 | Fase 18 | Fase 19 | Fase 20 |
|---|---|---|---|---|---|---|---|---|---|---|
| Mapa | 65 × 41 | 67 × 41 | 71 × 43 | 73 × 43 | 75 × 45 | 75 × 49 | 77 × 49 | 79 × 51 | 81 × 51 | 83 × 53 |
| Rações / ossos | 44 / 5 | 46 / 5 | 48 / 6 | 50 / 6 | 52 / 6 | 54 / 7 | 56 / 7 | 58 / 7 | 60 / 8 | 62 / 8 |
| Bolinhas (+50 cada) | 4 | 4 | 4 | 4 | 4 | 5 | 5 | 5 | 5 | 5 |
| Agentes da carrocinha (no centro do mapa) | 5 | 5 | 6 | 6 | 6 | 7 | 7 | 8 | 8 | 8 |
| Ossos de tipo novo (além de 3 comuns) | ouro, gelo | gelo, turbo | ouro, gelo, ímã | ouro, turbo, ímã | gelo, turbo, ímã | ouro, gelo, turbo, ímã | ouro, gelo, turbo, ímã | ouro, gelo, turbo, ímã | 2 ouros, gelo, turbo, ímã | ouro, 2 gelos, turbo, ímã |
| Gatos (a partir da Fase 11) | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 | 7 |
| Velocidade dos gatos (patrulha / perseguição px/s; ouvido em passos) | 130 / 200; 7 | 132 / 203; 7 | 134 / 205; 7 | 135 / 208; 7 | 137 / 211; 8 | 139 / 214; 8 | 141 / 216; 8 | 143 / 219; 8 | 144 / 222; 9 | 146 / 224; 9 |
| Vidas escondidas (sorteio por jogo) | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 |
| Alcance do "!" | 16 quadrados | 16 | 17 | 17 | 18 | 18 | 19 | 19 | 20 | 20 |
| Portas de bloco / paredes (definidas) | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 | 6 / 6 |
| Sorteio por jogo (portas; paredes) | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 | 5–6; 5–6 |
| Portas mudam de lado a cada | 3 s | 3 s | 3 s | **2,5 s** (160 px/s) | **2,5 s** (160 px/s) | **2,5 s** (160 px/s) | **1,8 s** (220 px/s) | **1,8 s** (220 px/s) | **1,6 s** (240 px/s) | **1,6 s** (240 px/s) |
| Paredes mudam de lado a cada | 10 s | 10 s | 10 s | **8 s** (140 px/s) | **8 s** (140 px/s) | **8 s** (140 px/s) | **5,5 s** (180 px/s) | **5,5 s** (180 px/s) | **5 s** (200 px/s) | **5 s** (200 px/s) |
| Máximo de vidas (sem reforço; até 10 com *Coração maior*) | 6 | 6 | 7 | 7 | 8 | 8 | 9 | 9 | 10 | 10 |
| **Missão** (além dos pontos) | todos os 5 ossos | 34 rações | 36 rações | todos os 6 ossos | 40 rações | 44 rações | todos os 7 ossos e 40 rações | 46 rações | todos os 8 ossos e 48 rações | todos os 8 ossos e 52 rações |
| Bônus por cumprir a missão | +200 | +250 | +300 | +350 | +400 | +450 | +500 | +550 | +600 | +650 |
| Perda por vida / pontos para passar | −300 / 2300 | −300 / 2450 | −325 / 2650 | −325 / 2800 | −350 / 3000 | −350 / 3200 | −375 / 3400 | −375 / 3600 | −400 / 3800 | −400 / 4000 |
| Poder do osso | 35 s | 35 s | 35 s | 35 s | 35 s | 35 s | 35 s | 35 s | 35 s | 35 s |
| Ao ser pego ou esmagado | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** | **renasce onde morreu** |

**Labirintos com desenho de cidade (0.10.0, refeitos na 0.15.1):** as Fases 1 a 10 são **labirintos**, desenhados como cidade: uma grade de **quarteirões-células** (cruzamentos e praças de 3 a 5 tiles) ligados por **ruas de 3 tiles de largura** entre **prédios de 2 a 3 tiles**; na Fase 4 em diante a célula do meio é a **praça da carrocinha** (7 × 5, com 4 vans nos cantos e os postos dos agentes), o início fica na borda esquerda e a saída (3 × 2) na direita, e algumas ruas viram **vielas de 1 tile** com porta de bloco. Os labirintos antigos eram confusos (corredores de 1 tile, uma ou duas saídas); estes têm sempre **3 caminhos que não passam pela mesma célula** do início à saída (2 nas Fases 2 e 3) e o início e a saída têm 3 ruas cada. **O quanto confunde** é medido em becos sem saída (células ligadas por uma só rua, contando as portas como ruas): **Fases 1 a 5: 0, 2, 3, 0 e 2; Fases 6 a 10: 4, 8, 11, 17 e 19**, com 20, 20, 20, 35, 35, 45, 63, 63, 77 e 77 quarteirões, e o caminho mais curto do início à saída cresce de 49 passos (Fase 4) a 81 (Fase 10). **As Fases 9 e 10 continuam as maiores, as com mais becos e as de peças mais rápidas.** Os mapas são gerados por `tools/citymaze/gen_citymaze.py` (a mesma semente dá o mesmo mapa) e o teste `0.10.0` confere tudo no jogo: tamanho, quarteirões abertos, nenhuma célula solta, caminhos sem célula em comum (fluxo máximo), becos por fase, peças móveis (trilhos em chão livre, afastados, nicho fechado, sempre 1 tile livre ao lado das paredes) e que **em todas as combinações de posição das peças o chão continua ligado**. A partir da Fase 4 o desenho mostra asfalto, calçadas e telhados. **Equilíbrio, com honestidade:** o robô de teste (`balance/`, joga como gente com atraso de reação e erros de pontaria, mas **conhece o mapa inteiro e onde estão os itens**) ganha 4 de 4 tentativas nas Fases 3, 4, 6, 8 e 10 sem perder nenhuma vida e é perseguido por 0 a 3 s por tentativa (estratégia "pontos mínimos": 17 a 30 s por fase; pegando tudo: 23 a 58 s). Ou seja, o robô **não mede a dificuldade de se orientar num labirinto** (uma pessoa não sabe onde está a saída nem os becos sem saída), e os agentes quase não encontram o robô porque as ruas de 3 tiles dão espaço para desviar e há poucos agentes para o tamanho do mapa. Se quiser as fases mais difíceis, os botões são os números de cada fase (agentes, velocidades, alcance do "!", pontos mínimos) e a tabela de becos acima.

Cada fase é liberada ao terminar a anterior. Em **Iniciar jogo** (depois que a Fase 2 está liberada) aparece a escolha de fase, e ao vencer uma fase há o botão **Próxima fase**. No menu, **Jogar fases anteriores** (aparece depois de concluir alguma fase) leva às fases já concluídas para **melhorar o recorde** de cada uma: só a maior pontuação de cada fase vale, e a pontuação total é a soma do melhor de cada fase (jogar uma fase de novo ou pular para outra não soma partidas, só pode subir o recorde daquela fase).

**O osso (a partir da Fase 2):** cada osso vale **150 pontos** (50 do osso + 100 de bônus), deixa o cachorrinho **10% mais rápido** (soma, até o fim da fase) e liga o **poder** por **30 segundos** (**35 s nas Fases 5 a 20**; o placar mostra *PODER* contando): os agentes da carrocinha viram **carteiros** (azuis), que **não perseguem nem pegam** o cachorrinho: ficam **mais lentos** (1,25 × a velocidade de patrulha, 62,5% da de perseguição) e **fogem** dele, escolhendo a cada passo o lugar mais longe do cachorrinho num raio de 12 passos (de preferência um que alcançam antes dele). Quem **encosta num carteiro ganha dele** e **+100 pontos**: o carteiro volta ao **centro do mapa**, fica tonto (parado) por 2 s e depois volta a fugir, **50% mais lento** ainda, até o poder acabar. **Cada carteiro rende pontos uma vez por poder** (pegar outro osso renova o poder e todos podem ser pegos de novo), então não adianta ficar parado no posto dele. Pegar o outro osso com o poder ligado **recomeça** a contagem (não soma). Quando o poder acaba, os carteiros voltam a ser agentes da carrocinha e o cachorrinho ganha **1 s de proteção**. Com o poder o cachorrinho também **não é esmagado** pelos blocos. O tempo do poder é `bonePower` da fase.

**Os blocos (a partir da Fase 3):** deslizam por trilhos curtos e abrem e fecham as portas dos corredores. Eles **mudam de lado a cada 3 segundos** (`blockEvery` da fase, em `js/game.js`), sem esperar ninguém chegar perto, e deslizam a 120 px/s (cerca de 0,27 s por mudança). **A quantidade de blocos é sorteada a cada jogo** (`blockRange`: Fase 3 de 1 a 2 portas; Fase 4 de 1 a 3; Fase 5 de 1 a 3 portas e de 1 a 3 paredes; Fases 6 a 10, veja a tabela acima), e também quais. Nos 0,6 s antes de cada mudança o **trilho pisca em amarelo**. Nas Fases 1 a 3 eles **nunca esmagam**: quem estiver no lugar para onde o bloco vai é **empurrado para o lado**. Cada porta tem um caminho alternativo, então **sempre sobra um caminho** (o teste confere isso para todas as combinações de posição dos blocos).

**Fases 4 a 10, os blocos que esmagam:** se um bloco alcança o cachorrinho (sem o poder do osso e fora da proteção de 2 s depois de perder uma vida), ele é **esmagado**: perde 1 vida e os pontos da fase (200, 250 ou 300). Os agentes da carrocinha continuam sendo empurrados, não esmagados. É `crush: true` da fase.

**Fases 4 a 10, pontos mínimos:** cada vida perdida custa **200 pontos** nas Fases 4 e 5, **250** nas Fases 6 a 8 e **300** nas Fases 9 a 20 (`lifePenalty`), e a saída **abre quando a pontuação corrente da fase** (rações + ossos + carteiros − vidas perdidas − tentativas, ainda sem o bônus de tempo) **chega a 800** (**1000 na Fase 5**, de **1250 a 2050** nas Fases 6 a 10 e de **2300 a 4000** nas Fases 11 a 20): não é preciso pegar todos os itens (por isso há mais rações disponíveis). O placar mostra *PONTOS 450 / 800* e um aviso diz quando a meta foi atingida; se uma vida perdida derrubar a pontuação abaixo da meta, a saída fecha de novo. Se todos os itens já foram pegos, o poder acabou e a pontuação ainda não chega à meta, não há mais como passar: a tentativa termina (*Os pontos não bastaram!*, com a explicação de que o jogador pegou tudo mas a pontuação ficou abaixo do mínimo) e vale a regra das novas tentativas.

**Fase 4, o mapa:** um labirinto de cidade de 41 × 29 tiles (a tela mostra uma parte e a câmera segue o cachorrinho): 7 × 5 quarteirões ligados por **ruas de 3 tiles**, a **praça da carrocinha** no centro (7 × 5, com 4 vans nos cantos e os 3 postos dos agentes), o início na borda esquerda e a saída na direita. Há **3 caminhos que não passam pela mesma célula** do início à saída e nenhum beco sem saída. As 3 portas de bloco ficam em vielas de 1 tile (com nicho) que são atalhos entre quarteirões: o teste confere que, com os blocos em qualquer posição, todo o chão continua ligado.

**Fase 5, as paredes que se movem:** além das portas de bloco, há **3 avenidas com uma parede de 3 tiles que desliza a cada 10 segundos** (cada parede começa o ciclo num ponto diferente: aos 10 s, 7 s e 4 s): a parede vai de uma calçada à outra da avenida e a abertura que sobra **muda de lugar**, formando um caminho novo. O trilho pisca em amarelo nos **2 s** antes de cada mudança. As paredes que se movem **esmagam** como os blocos (sem o poder do osso, quem estiver no lugar para onde a parede vai perde uma vida), e os agentes da carrocinha são empurrados.

**Velocidade do cachorrinho:** veja a tabela acima (252 px/s na base, 201,6 na Fase 1, 226,8 na Fase 3, 238,14 nas Fases 4 e 5, e +10% por osso).

**Velocidade dos agentes da carrocinha:**

| | sem o "!" (patrulhando) | com o "!" (perseguindo) |
|---|---|---|
| Fase 1 | **55** px/s | **110** px/s |
| Fase 2 (+10% nos dois) | **60,5** px/s | **121** px/s |
| Fase 3 (mais +10% sobre a Fase 2) | **66,55** px/s | **133,1** px/s |
| Fase 4 (mais +10% sobre a Fase 3) | **73,21** px/s | **146,41** px/s |
| Fase 5 (igual à Fase 4) | **73,21** px/s | **146,41** px/s |

**Alcance do "!":** o agente da carrocinha liga o "!" **na hora** (ele olha 10 vezes por segundo, sem sorteio) em que o cachorrinho está dentro do alcance e **à vista** (sem parede ou bloco fechado no meio). O alcance é medido em linha reta, do centro de um ao centro do outro, e cresce 2 quadrados a cada fase até a Fase 5 (nas Fases 6 a 10 sobe de 11 a 15, veja a tabela das Fases 6 a 10):

| Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 |
|---|---|---|---|---|
| **2** quadrados | **4** quadrados | **6** quadrados | **8** quadrados | **10** quadrados |

Depois que o "!" liga, ele fica ligado enquanto o agente da carrocinha vê o cachorrinho (de 3 s até um limite de 6 s na Fase 1); depois ele descansa uns segundos antes de poder ligar de novo. A regra é `alertTiles` de cada fase em `js/game.js` (`2 × número da fase` até a Fase 5; de 11 a 15 nas Fases 6 a 10).

**Os agentes da carrocinha da Fase 2 são 10% mais difíceis:** velocidade (patrulha e perseguição) e duração mínima e máxima da perseguição ×1,1; e o tempo entre "olhadas", o descanso depois de perseguir e as pausas ÷1,1.

**Na Fase 3** a **velocidade** de movimento ganha mais 10% (66,55 e 133,1 px/s); a duração das perseguições e o descanso são os da Fase 2.

**Pausa automática:** o jogo **pausa sozinho** quando a janela perde o foco (ou a aba fica escondida) e salva ao fechar a página.

## Ossos de tipos novos (0.15.7, Fases 11 a 20)
**A partir da Fase 11 há ossos de cores diferentes, cada um com um poder.** Todos valem **150 pontos** e dão **+10% de velocidade** até o fim da fase (como o osso comum), contam para a missão *pegar todos os ossos* e podem esconder uma vida extra; o que muda é o poder (o *Osso poderoso* soma **+4 s por nível** em todos os efeitos). Os tipos de osso de cada fase são fixos (`boneMix` em `js/game.js`), mas **quais ossos ficam em qual lugar é sorteado a cada jogo**; em toda fase há **pelo menos 3 ossos comuns**, para que a missão *assustar* seja sempre possível.

| Osso | Cor | Poder |
|---|---|---|
| **Osso do poder** (comum) | branco | o de sempre: 35 s em que os agentes viram carteiros e os gatos fogem, e quem encosta neles ganha pontos |
| **Osso de ouro** | dourado | **escudo dourado por 10 s**: nada pega o cachorrinho e os blocos não o esmagam (não assusta ninguém) |
| **Osso de gelo** | azul-claro | **congela agentes e gatos por 6 s** (viram blocos de gelo e ficam inofensivos; derretem piscando e o cachorrinho ganha 1 s de proteção) |
| **Osso turbo** | laranja | **+40% de velocidade por 8 s** (rastro de fogo atrás do cachorrinho) |
| **Osso ímã** | roxo | **as rações a até 4 quadrados, à vista, vêm sozinhas por 12 s** (círculo roxo tracejado) |

Os efeitos ativos aparecem numa **faixa no alto do jogo** (*Escudo 8 s · Gelo 3 s*) e podem se somar. O jogo salvo guarda o tipo de cada osso e os efeitos que ainda faltam. Composição por fase (`boneMix`): 11 = 3 comuns + ouro + gelo; 12 = 3 + gelo + turbo; 13 = 3 + ouro + gelo + ímã; 14 = 3 + ouro + turbo + ímã; 15 = 3 + gelo + turbo + ímã; 16 a 18 = 3 + ouro + gelo + turbo + ímã; 19 = 3 + 2 ouros + gelo + turbo + ímã; 20 = 3 + ouro + 2 gelos + turbo + ímã.

## Bolinhas (0.15.8, a partir da Fase 2)
**Cachorros adoram correr atrás de bolinhas.** Cada fase, a partir da Fase 2, tem **bolinhas coloridas** espalhadas pelo chão: **1 nas Fases 2 e 3, 2 nas Fases 4 e 5, 3 nas Fases 6 a 10, 4 nas Fases 11 a 15 e 5 nas Fases 16 a 20**. Cada bolinha vale **+50 pontos** (o placar mostra **BOLINHAS n/N**), mas ela **foge**: quando o cachorrinho chega a **3 tiles** dela (e a vê), ela é **chutada** para longe pelo eixo em que ele está, **rola, quica nas paredes e nos blocos e para sozinha (um bloco que desliza por cima dela a empurra para o lado)** depois de uns 4 tiles na Fase 2 até uns 12 na Fase 20 (a velocidade do chute cresce com a fase: 196 px/s na Fase 2, 340 na Fase 20, e ela perde 150 px/s a cada segundo; o cachorrinho anda de 200 a 252). É só correr atrás dela e encostar: ela some com um *plim*. As bolinhas **não são obrigatórias** (a saída abre sem elas, e elas contam para os pontos mínimos), os agentes e os gatos não ligam para elas, e se o cachorrinho perde uma vida as bolinhas ficam onde estão. Com tudo pego, a tentativa só termina em *"Os pontos não bastaram!"* se nem as bolinhas que sobraram completarem os pontos mínimos. O lugar de cada bolinha é sorteado no começo de cada jogo (fora do caminho dos itens, dos trilhos dos blocos e do início); o jogo salvo guarda a posição e quais já foram pegas.

## Petiscos, petscoin e lojinha de skins (0.15.9)
**Ao completar cada fase o cachorrinho ganha 1 petisco; 1 petisco = 1 petscoin.** O saldo fica guardado no nome de usuário do jogador (só neste aparelho, como as pontuações; quem não tem nome não guarda) e aparece no menu (*Petscoin: N*) e na tela de vitória (*Petisco ganho! +1 petscoin*). Em **Menu → Lojinha de skins** os petscoin viram **skins** para o cachorrinho, **a partir de 10 petscoin**: Cinza-prata (10), Dálmata (12), Chocolate (15), Dourado (20), Arco-íris (25), Pirata (30), Astronauta (40) e Super-cão (50), além do Caramelo grátis. A skin só muda o desenho (o tamanho de contato, a velocidade e as regras são os mesmos) e vale nos três tamanhos e nas quatro direções. O plano completo, as regras e as ideias para depois estão em [`docs/LOJINHA.md`](docs/LOJINHA.md); o preço mínimo (`MIN_SKIN_PRICE = 10`) é conferido pelo código e pelos testes.

## Os gatos (0.15.5, Fases 11 a 20)
Um inimigo novo, **mais ágil e mais esperto que o agente da carrocinha**. Há **2 gatos na Fase 11** e a quantidade sobe até **7 na Fase 20** (2, 3, 3, 4, 4, 5, 5, 6, 6 e 7). Cada gato tem uma pelagem (laranja, cinza, preta ou branca com manchas) e anda de tile em tile como o agente, mas:

- **É mais rápido:** 130 px/s patrulhando e 200 px/s perseguindo na Fase 11, até 146 e 224 na Fase 20 (o cachorrinho anda 252 px/s, mais 10% por osso). Ao ver o cachorrinho a menos de 4 tiles ele dá o **bote**: 1,3 × a velocidade por 0,7 s (e espera 3 s para o próximo).
- **Ouve:** além de ver (o alcance de visão é o do "!" da fase mais 4 tiles), ele **ouve** o cachorrinho a até 7 passos (8 e 9 nas Fases 15 e 19), **mesmo atrás de paredes**. O agente só persegue o que vê.
- **Antecipa:** não corre atrás de onde o cachorrinho *está*, e sim de onde ele *vai estar* (até 4 tiles à frente, na direção em que ele anda); o gato de número ímpar **fecha o caminho da saída**, e os gatos se espalham em vez de andar em fila.
- **Pula as caixas "X":** as muretas de caixas de 1 tile de espessura que atravessam as paredes são **chão para o gato** (para o cachorrinho e para os agentes são paredes). O cachorrinho sempre chega à saída sem usar nenhuma delas; elas só dão **atalhos aos gatos**.
- **Procura:** perdeu o cachorrinho de vista? Vai até onde o viu por último, continua na direção em que ele ia e **procura por perto por 6 s** antes de voltar a patrulhar (patrulha de preferência por onde o cachorrinho anda). Quase não descansa depois de perseguir.
- **Com o poder do osso o gato foge** (rápido e esperto: 72% da velocidade de perseguição, olhando 16 passos à frente, sem ficar lento como o carteiro). Quem **encosta** num gato ganha **+100 pontos** (uma vez por poder); ele volta ao posto, tonto por 2 s, e foge mais devagar (60%) até o poder acabar. Quando o poder acaba os gatos voltam a patrulhar.
- Encostar num gato custa **1 vida**, como o agente (com a mesma proteção depois). Quando um gato nota o cachorrinho ele dá um **miau** (um só a cada 4 s, mesmo com vários gatos), e um gato que persegue fora da tela aparece como um **"!" vermelho na borda** da tela, como os agentes.
- O jogo salvo guarda a posição dos gatos e quais já foram assustados.
## Missões e mais vidas (0.15.6, Fases 11 a 20)
**Para abrir a saída das Fases 11 a 20 não bastam os pontos mínimos: é preciso também cumprir a MISSÃO da fase.** A missão aparece no aviso do começo da fase, na lista de fases, no *Como jogar* e numa **faixa no alto do jogo** que mostra só o que ainda falta (*Missão: ossos 3/5 · rações 20/36*; cumprida, a faixa diz *Missão cumprida!*). Cada missão combina 1 ou 2 destas exigências:

- **Ossos:** pegar **todos** os ossos da fase (Fases 11, 14, 17, 19 e 20);
- **Rações:** pegar pelo menos N rações (34 na Fase 12, 36 na 13, 40 na 15 e na 17, 44 na 16, 46 na 18, 48 na 19 e 52 na 20).

**Assustar os gatos (e os carteiros) NÃO é exigência para passar de fase (0.16.1).** Antes algumas missões pediam *assustar N carteiros ou gatos*, e isso confundia (só dá para assustar com o poder do osso comum, e só enquanto ele dura). Agora ninguém precisa assustar nada para abrir a saída; mas **o cachorrinho continua podendo assustar**: com o poder do osso (o osso branco) os gatos **fogem** e quem encosta num gato que foge ganha **+100 pontos**, uma vez por poder (como com os carteiros). É um extra que ajuda nos pontos mínimos.

Quando os pontos já bastam mas falta a missão, o jogo avisa (*Pontos suficientes! Falta a missão: …*) e, se o cachorrinho chega à saída, a saída continua fechada (*Falta a missão: …*). Como a missão só pede ossos e rações, ela nunca fica impossível: se pegou **tudo** e os pontos não chegam ao mínimo (nem com as bolinhas que sobraram), a tentativa acaba em *Os pontos não bastaram!* e custa uma nova tentativa. **Cumprir a missão vale pontos extras** (+200 na Fase 11, +50 a cada fase, +650 na Fase 20), mostrados na tela de vitória.

**Mais vidas:** o máximo de vidas **sobe a partir da Fase 11**: 6, 6, 7, 7, 8, 8, 9, 9, 10 e 10 nas Fases 11 a 20 (5 nas Fases 1 a 10), e o reforço *Coração maior* soma mais 1 por nível, mas **nunca passa de 10** (quando o máximo da fase já é 10 ele deixa de ser oferecido). As vidas extras escondidas (3 ou 4 por fase) e o reforço *Vida extra* levam você até esse máximo, e o placar mostra até **10 corações**.

## Ambientes (0.14.0)
Cada fase é um **lugar que o cachorrinho conhece**, com chão, paredes e "caixas" desenhados no estilo do ambiente (`js/themes.js`; as regras, os mapas e os números de cada fase não mudam):

| Fase | Lugar | Chão | Paredes | "Caixas" | Peças que se movem |
|---|---|---|---|---|---|
| 1 | **Quintal** | grama com florzinhas | cerca de madeira | vasos de planta | — |
| 2 | **Campo** | pasto claro com flores | muros de pedra | fardos de feno | — |
| 3 | **Casa** | tábua corrida | papel de parede e rodapé | pufes | portas de madeira |
| 4 | **Rua do bairro** | asfalto e calçadas | telhados dos prédios | lixeiras | blocos de aço |
| 5 | **Condomínio** | concreto com jardins | blocos de apartamentos com janelas | jardineiras | blocos de aço |
| 6 | **Praça** | pedras claras | canteiros (cerca viva) | bancos | grades de ferro |
| 7 | **Parque canino** | grama com trilhas de terra | cerca viva e cerca branca | cones de agilidade | cancelas verdes |
| 8 | **Feira** | paralelepípedo | barracas de toldo listrado | caixas de frutas | cancelas de madeira |
| 9 | **Praia** | areia (o anel de fora é o mar) | quiosques de palha | guarda-sóis | tábuas |
| 10 | **Central da carrocinha** | concreto com faixas de alerta | paredes de aço com grades | jaulas | blocos de aço |

**Fases 11 a 20 (0.15.4):** os dez lugares novos (cada um com chão, paredes, "caixas" e peças móveis no estilo do ambiente, em `js/themes.js`):

| Fase | Lugar | Como é |
|---|---|---|
| 11 | **Beco dos gatos** | O beco dos gatos: paralelepípedo molhado, muros de tijolo e latões |
| 12 | **Pet shop** | O pet shop: prateleiras coloridas e caixas de ração |
| 13 | **Fazenda** | A fazenda: terra batida, celeiro vermelho, fardos e sacos |
| 14 | **Bosque** | O bosque: folhas secas, árvores densas e troncos caídos |
| 15 | **Lago e docas** | O lago e as docas: tábuas, água e barris |
| 16 | **Mercadão** | O mercadão: ladrilho quente, barracas de toldo e caixotes de legumes |
| 17 | **Estacionamento** | O estacionamento: asfalto, vagas, carros e cones |
| 18 | **Telhados** | Os telhados da cidade à noite: calhas, chaminés e antenas |
| 19 | **Estação de trem** | A estação de trem: plataforma, vagões e malas |
| 20 | **Fortaleza da carrocinha** | A fortaleza da carrocinha: muralhas de aço, luzes vermelhas e jaulas pesadas |

O aviso de começar cada fase diz o lugar (*Casa — Fase 3: 2 agentes da carrocinha*), a lista de fases mostra **Fase 3 · Casa** e a vitória começa por *Casa · Vidas restantes…*. Nas cidades (Fases 4 a 10) as 4 caixas dos cantos do pátio da praça central são **vans da carrocinha**. O teste `0.14.0` confere os 10 nomes, o aviso, a lista, a vitória, que a cor média do chão de cada lugar é diferente das outras e o mar da Praia.

## Crescimento do cachorrinho (0.15.0)
O cachorrinho **começa filhote** e vai ficando adulto à medida que passa de fase e ganha reforços. O crescimento é `clamp((fase − 1 + 0,35 × reforços) ÷ 9, 0, 1)` (reforços = soma dos níveis de todos os reforços com nível: Patas ligeiras, Osso poderoso, Coração maior, Pelo grosso, Carrocinha lenta e, a partir da Fase 11, Patas de veludo, Faro e Ímã de ração; a *Vida extra* não conta) e dá três tamanhos:

| Tamanho | Crescimento | Fases (sem reforços) | Desenho |
|---|---|---|---|
| **Filhote** | até 0,34 | 1 a 4 | corpo a 66%, cabeça, orelhas e olhos grandes, rabinho curto, pelo claro, coleira **vermelha** |
| **Jovem** | de 0,34 a 0,67 | 5 a 7 | tamanho intermediário, coleira **azul** |
| **Adulto** | a partir de 0,67 | 8 a 10 | corpo inteiro, pelo mais escuro, rabo comprido, coleira **verde** com plaquinha dourada |

O corpo muda de tamanho de forma contínua (`drawDog` em `js/game.js`), mas o tamanho de contato (24 × 24), a velocidade e as regras **não mudam**; os pés ficam no mesmo lugar. Os ganchos de teste `__game.growth` e `__game.stage` mostram o valor; a pausa diz *Cachorrinho: jovem.* O teste `0.15.0` confere as fases de crescimento, o efeito dos reforços, o desenho em pixels (de frente, de costas e de lado), as cores da coleira, o contato 24 × 24, a pausa e o jogo salvo.

## Reforços (0.8.0)
Ao **vencer uma fase** (menos a última) o jogador escolhe **1 reforço entre 3 opções**, sorteadas a cada vitória entre os que ainda valem (6; **9 a partir da Fase 11**, depois de vencer a Fase 10) (se sobram 3 ou menos, aparecem todos; sempre na mesma ordem da tabela abaixo), e ele **fica com ele nas fases seguintes** da mesma sequência (*Próxima fase*). Só se pode escolher **1 por fase**: o botão *Próxima fase* da vitória abre a tela **Escolha um reforço**, e a fase seguinte só começa depois da escolha (com *Voltar* ou Esc se volta ao resultado). Os reforços empilham em níveis até um máximo:

| Reforço | Efeito por nível | Máximo |
|---|---|---|
| **Patas ligeiras** | +8% de velocidade do cachorrinho | 4 níveis (+32%) |
| **Osso poderoso** | +8 s no poder do osso | 4 níveis (+32 s) |
| **Vida extra** | +1 vida agora (some se as vidas já estão no máximo) | — |
| **Coração maior** | +1 vida no máximo (de 5 até 8) e +1 vida agora | 3 níveis |
| **Pelo grosso** | +2 s de proteção depois de perder uma vida (2 s → até 8 s) | 3 níveis |
| **Carrocinha lenta** | agentes 8% mais lentos (patrulha, perseguição e fuga dos carteiros; **a partir da 0.15.5 vale também para os gatos**) | 4 níveis (−32%) |
| **Patas de veludo** *(0.15.7, a partir da Fase 11)* | agentes e gatos **notam você 1 quadrado mais tarde** (alcance do "!" e ouvido dos gatos menores) | 3 níveis (−3 quadrados) |
| **Faro** *(0.15.7, a partir da Fase 11)* | uma **seta** em volta do cachorrinho aponta o **osso mais perto**; no nível 2 também a **saída aberta** (seta verde) | 2 níveis |
| **Ímã de ração** *(0.15.7, a partir da Fase 11)* | as **rações à vista** a até 2,5 / 3,5 / 4,5 quadrados vêm sozinhas | 3 níveis |

- Começar uma fase pelo menu ou usar *Jogar novamente* começa **sem reforços** (como começa com 3 vidas). *Tentar novamente* e *Continuar jogo* mantêm os reforços da partida (eles ficam no jogo salvo, campo `up`).
- O placar mostra **REFORÇOS n** (a lista aparece ao passar o mouse) e a tela de pausa lista os reforços.
- Os valores estão em `REINFORCEMENTS`/`UP_MAX` de `js/game.js`; o teste `0.8.0: reforços` confere cada efeito.
- **Dá para ver o que o reforço acrescenta (0.15.2):** os efeitos eram pequenos demais para notar (+5%, +5 s, +1 s, 5%) e o *Coração maior* não mudava nada na tela; agora valem **+8% de velocidade, +8 s de poder, +2 s de proteção e agentes 8% mais lentos por nível**, a tela de escolha diz *"Com ele você terá: +16% de velocidade · …"*, o **aviso do começo de cada fase** lista os reforços valendo com os números (*Reforços valendo: +16% de velocidade · 6 vidas no máximo*), a **pausa** mostra *Efeitos: …* e o placar ganha **um coração vazio a mais** por nível de *Coração maior*. O teste `0.15.2` joga 8 vitórias seguidas com o sorteio de verdade e confere cada escolha.

## Sons (0.11.0)
Todos os efeitos são **sintetizados na hora** com a Web Audio API (osciladores e ruído filtrado): não há arquivo de áudio, biblioteca nem rede (`js/sound.js`). O navegador só libera o som depois do **primeiro gesto** do jogador (toque, clique ou tecla); antes disso o jogo roda mudo, sem erro.

| Quando | Som |
|---|---|
| pegar a ração | pingo curto (0,14 s) |
| pegar o osso | quatro notas subindo (dó mi sol dó) |
| o agente vira carteiro (osso com o poder desligado) | transformação, logo depois do som do osso |
| pegar um carteiro (ganhar dele) | duas notas rápidas (si mi) |
| um gato nota o cachorrinho (0.15.5) | **miau** curto (0,4 s): dente de serra que sobe de 520 para 880 Hz e desce a 480 Hz; só um a cada 4 s |
| ser pego pelo agente da carrocinha | captura, e logo depois o som de perder vida |
| perder uma vida (também esmagado por bloco, sem a captura) | três notas descendo |
| pegar uma vida nova (depois do som do item) | seis notas alegres |
| passar de fase | fanfarra (1,25 s) |
| completar a fase (0.15.3, 0,9 s depois do começo da fanfarra) | o **cachorrinho late**, conforme o tamanho dele: **filhote** dois "ai-ai" agudos (1250 e 1350 Hz, 0,26 s), **jovem** dois "uau" médios (540 e 500 Hz, 0,4 s), **adulto** dois "uó" graves e fortes (250 e 230 Hz, 0,65 s) |
| fim de jogo (sem vidas ou "os pontos não bastaram") | quatro notas descendo (1,2 s) |
| escolher um reforço e ligar o som | toque curto de confirmação |
| pegar uma bolinha (0.15.8) | o mesmo *plim* da escolha de reforço (sem som novo) |
| comprar uma skin na lojinha (0.15.9) | a fanfarra curta de passar de fase |
| usar uma skin que já é sua (0.15.9) | o mesmo *plim* da escolha de reforço |
| pegar osso de ouro, gelo, turbo ou ímã (0.15.7) | o som do osso (o ímã também o da ração que ele puxa); o fim dos efeitos é silencioso |

Os sons são **baixos por padrão** (volume 0,35) e foram medidos (pico, duração, cliques, equilíbrio de volume e diferença entre eles: 182 de 182 verificações); no máximo 8 sons ao mesmo tempo e o mesmo som não repete antes de 60 ms. **Menu, pausa, jogo carregado e reinício não tocam nada.** O botão **Som: ligado / desligado** (no menu e na pausa) e a tecla **M** ligam e desligam; a escolha fica em `localStorage` na chave `cachorrinho.som.v1` (separada do jogo salvo e das contas). O gancho de testes `window.__game.sounds` registra todo pedido de som (nome, instante e se tocou).

## Vidas
Você começa com **3 vidas** (corações vermelhos no placar, logo depois dos pontos) e pode ter de **1 a 5** (até 8 com o reforço *Coração maior*; **a partir da Fase 11 o máximo sobe até 10**, veja *Missões e mais vidas*); as vidas são **cumulativas**:

- Pegar um item (ração ou osso) com vida extra dá **+1 vida**, até o máximo da fase (5; de 6 a 10 nas Fases 11 a 20; mais os níveis de *Coração maior*, nunca acima de 10).
- As vidas que sobram ao terminar uma fase **passam para a fase seguinte** (pelo botão *Próxima fase*). Escolher uma fase no menu ou usar *Jogar novamente* começa com 3 vidas.
- Se o agente da carrocinha encosta, você perde **1 vida** e **50 pontos** (**200** nas Fases 4 e 5, **250** nas Fases 6 a 8 e **300** nas Fases 9 a 20). O cachorrinho **volta ao início da fase** (no mesmo lugar de quando ela começou; **da Fase 9 em diante ele renasce onde caiu**), ganha uns segundos de proteção, o **tempo continua contando** (não zera) e **as rações que ainda não foram pegas mudam de lugar**, sorteadas de novo. As que já foram pegas continuam pegas.
- **Sem vidas:** você tem até **3 novas tentativas da fase em que está** (na Fase 2, recomeça a Fase 2). Cada nova tentativa recomeça a fase **do zero** (3 vidas, rações novas, tempo zerado) e custa **100 pontos**. Usadas as 3, só resta voltar ao menu.

## Pontuação
A pontuação da fase é: **100 por ração + 150 por osso + 100 por carteiro ou gato assustado (poder do osso) + 50 por bolinha (0.15.8) + bônus de tempo − pontos por vida perdida (50; 200 nas Fases 4 e 5; 250 nas Fases 6 a 8; 300 nas Fases 9 a 20) − 100 por nova tentativa + bônus da missão (Fases 11 a 20)**. Ela **pode ficar negativa** (por exemplo, −50 ao perder a primeira vida sem ter pegado nenhuma ração).

O **bônus de tempo** vai de **0 a 100** e é proporcional: **10 pontos a cada 10 segundos**, e quanto menos tempo, mais pontos.

| Terminou em | Bônus de tempo |
|---|---|
| até 20 s | 100 |
| até 30 s | 90 |
| até 40 s | 80 |
| … (−10 a cada 10 s a mais) | … |
| até 110 s | 10 |
| mais de 110 s | 0 |

- Na **Fase 3** o bônus de tempo é maior: **20 pontos a cada 10 s**, de 0 a 200 (até 20 s = 200, até 30 s = 180 … até 110 s = 20, depois 0).
- **Na mesma fase vale só a MAIOR pontuação** (jogar de novo não soma). Em caso de empate, vale o menor tempo.
- **Fases diferentes se somam:** a pontuação total é a soma da melhor pontuação de cada fase.
- O tempo oficial é arredondado ao décimo de segundo.
- **Não há histórico de partidas:** só a melhor pontuação de cada jogador em cada fase fica guardada.

## Pontuações e rankings
- **Suas pontuações** (só você vê): sua pontuação total e a melhor de cada fase.
- **Ranking do jogo** (todos os jogadores do aparelho veem): ranking geral (pontuação total) e ranking de cada fase, com **apenas a melhor pontuação de cada jogador**.
- **Por enquanto o ranking é por aparelho** (é o que está ativo): aparecem os jogadores que jogaram **neste navegador/aparelho**, e a tela avisa. Não há banco de dados nem servidor, e nenhum dado sai do aparelho.
- Um **ranking compartilhado entre aparelhos** já está programado, mas **em stand by (desligado)**: veja a próxima seção.

## Ranking compartilhado (em stand by)
**Está desligado por padrão.** O código existe (`js/board.js`, testado), mas só é usado se você ligar de propósito em `js/config.js` com `sharedRanking: true`. Enquanto estiver `false`, o jogo **não faz nenhum pedido de rede** e usa só o ranking do aparelho.

O GitHub Pages só serve arquivos: ele **não guarda dados**. Por isso, para vários aparelhos verem o mesmo ranking, o jogo precisaria falar com um servidor de ranking. Existem dois jeitos:

### 1. Servidor REST no estilo Firebase Realtime Database (qualquer pessoa que abrir o jogo)
Em `js/config.js`, ligue e coloque o endereço do seu banco:
```js
window.GAME_CONFIG = Object.assign({ sharedRanking: true, rankingUrl: "https://SEU-PROJETO-default-rtdb.firebaseio.com/cachorrinho" }, window.GAME_CONFIG);
```
O jogo lê `…/scores.json` e grava a melhor pontuação de cada jogador em `…/scores/<fase>/<jogador>.json` (só se for melhor que a que já está lá). Ao abrir **Pontuações**, ele também envia as melhores pontuações deste aparelho que o servidor ainda não tem.

**Passo a passo (Firebase, plano gratuito):**
1. Em https://console.firebase.google.com crie um projeto e, em *Build → Realtime Database*, crie um banco.
2. Na aba *Rules*, cole as regras abaixo e publique. Elas deixam todos lerem, só aceitam notas bem formadas e só aceitam uma pontuação **melhor** que a anterior (e não deixam apagar):
```json
{
  "rules": {
    "cachorrinho": {
      "scores": {
        ".read": true,
        "$level": {
          ".validate": "$level.matches(/^[0-9]{1,3}$/)",
          "$player": {
            ".write": "newData.exists()",
            ".validate": "$player.length <= 60 && newData.hasChildren(['n','p','t','w']) && newData.child('n').isString() && newData.child('n').val().length <= 16 && newData.child('p').isNumber() && newData.child('p').val() >= -100000 && newData.child('p').val() <= 100000 && newData.child('t').isNumber() && newData.child('t').val() > 0 && newData.child('t').val() <= 86400000 && newData.child('w').isNumber() && (!data.exists() || newData.child('p').val() > data.child('p').val() || (newData.child('p').val() == data.child('p').val() && newData.child('t').val() < data.child('t').val()))",
            "n": { ".validate": true }, "p": { ".validate": true }, "t": { ".validate": true }, "w": { ".validate": true },
            "$other": { ".validate": false }
          }
        }
      }
    }
  }
}
```
3. Copie o endereço do banco (`https://….firebaseio.com`), acrescente `/cachorrinho` e coloque em `rankingUrl` no `js/config.js`. Faça commit; o GitHub Pages publica de novo.

### 2. Banco compartilhado do Claude
Se o jogo for publicado como página (artifact) no Claude **e** `sharedRanking` estiver `true`, ele também usa o banco compartilhado da página, com **um documento por visitante** (`scores/<id>`). Só quem tem permissão de escrita (entrou no Claude e tem acesso de Contribuidor ou mais) consegue gravar; quem não tem só vê o ranking que já existe.

### Limites honestos
- É um jogo no navegador: **não existe como impedir trapaça** de quem sabe mexer nas ferramentas do navegador. As regras acima só garantem formato e que uma nota nunca piora, mas qualquer pessoa pode enviar uma nota falsa boa. Para ranking à prova de trapaça seria preciso um servidor que valide as partidas.
- O ranking mostra o **nome de usuário** de cada jogador a todos: não use nomes reais de crianças sem querer.
- Nomes não são verificados no servidor: outra pessoa pode usar o mesmo nome (a conta com senha só protege o nome **no aparelho**).
- Se o servidor estiver fora do ar ou lento, o jogo mostra o ranking deste aparelho (a espera máxima é de 6 s) e nunca trava.
- Os dados vindos do servidor são conferidos antes de aparecer (nomes, pontuações, tempos e fases) e mostrados só como texto.

## Menu
- **Iniciar jogo** (e **Continuar jogo**, quando há um jogo salvo)
- **Jogar fases anteriores** (depois de concluir alguma fase): repete as fases já vencidas para melhorar o recorde de cada uma
- **Lojinha de skins** (0.15.9): troque os petscoin (1 por fase completada) por skins do cachorrinho; a loja mostra o saldo no alto e o botão Voltar fica sempre à vista
- **Como jogar**
- **Pontuações:** suas pontuações (só você) e o ranking do jogo (todos)
- **Escolher nome de usuário:** o nome pode ser o de um cachorrinho (ex.: Totó). Ele fica salvo para as próximas vezes. Ali também dá para **Criar conta** (com senha) e **Entrar**.

## Conta com senha (opcional)
Além do nome simples, dá para criar uma **conta**: nome de usuário + senha.

- **Senha:** de **4 a 20 caracteres**, com letras **minúsculas e MAIÚSCULAS**, números e símbolos (`! @ # $ …`), acentos e espaços. Números e símbolos são opcionais. O campo mostra um contador (n/20) e há "Mostrar senha".
- **Nome de usuário:** até 16 letras ou números (pode ter espaço, hífen e apóstrofo). "Totó", "toto" e "TOTÓ" são o mesmo usuário.
- **Entrar / Sair da conta:** depois de entrar, o jogo lembra de você até tocar em *Sair da conta*. Um nome que tem conta só pode ser usado entrando com a senha.
- **Esqueci a senha:** não há como recuperar (não existe servidor de contas). A saída é **apagar a conta** (com as pontuações, o progresso, o jogo salvo, os petscoin e as skins dela, neste aparelho) e criar outra.
- **Tentativas:** depois de 5 senhas erradas seguidas, o jogo pede para esperar 30 s (e dobra nas rodadas seguintes).

**Como a senha é guardada:** nunca como texto. O jogo guarda só um sal aleatório e uma "impressão" PBKDF2-SHA256 com 150.000 repetições (`js/auth.js`; usa a criptografia do navegador e, se ela não existir, uma versão em JavaScript equivalente, testada contra a do Node).

**Limites honestos:** é um cadastro **local**, só neste navegador e aparelho. Não dá para entrar em outro aparelho, e quem tem acesso ao navegador e sabe mexer nas ferramentas dele consegue editar os dados guardados. A conta serve para separar e proteger os jogadores de um mesmo aparelho (por exemplo, irmãos), não para segurança de verdade. Contas globais precisariam de um servidor.

## Controles
O jogo aceita **teclado**, **controle (gamepad)** e **toque**, e dá para misturar: vale o que estiver sendo usado.

| | Teclado | Controle (gamepad) | Toque |
|---|---|---|---|
| Mover | **W A S D** ou **setas** (tecla física, vale em qualquer layout de teclado) | **analógico esquerdo** (quanto mais inclinado, mais rápido) ou **direcional** | controle redondo na tela |
| Pausar / continuar | **Esc** ou **P** | **Start** | botão de pausa no placar |
| Salvar | **Ctrl+S** (ou **Cmd+S**) | **Y** | botão de disquete no placar ou **Salvar jogo** na pausa |
| Som | **M** liga e desliga | — | botão **Som** no menu e na pausa |
| Menus | **↑ ↓** (ou **Tab**) escolhem, **Enter**/**Espaço** confirmam, **Esc** volta | direcional ou analógico escolhem, **A** confirma, **B** volta | tocar nos botões |

**Controle:** funciona com a maioria dos controles (Xbox, PlayStation, Switch Pro, genéricos), por cabo ou Bluetooth, nos navegadores que têm a *Gamepad API* (Chrome e Edge; Firefox e Safari também a têm, mas **só testei com um controle simulado no Chromium**, não com um controle de verdade). Conecte o controle e **aperte um botão** (o navegador só o reconhece depois disso); o jogo avisa "Controle conectado". Controles fora do padrão usam só o analógico esquerdo e os botões A, B e Start. Campos de texto (nome, senha) ainda precisam do teclado.

## Salvar
- **Salvamento automático:** a cada 5 segundos, ao pegar uma ração ou um osso, ao perder uma vida, ao pausar e ao fechar a página.
- **Salvar jogo:** botão de disquete no placar (durante o jogo) e botão na tela de pausa.
- **Continuar jogo:** no menu, retoma exatamente de onde parou (fase, rações e ossos, vidas, tentativas, tempo, posições e o ponto do ciclo dos blocos). Um jogo salvo com o tempo em 0 (pausado ou fechado antes do primeiro passo) continua esperando o primeiro passo.
- O **progresso por fase** (fases concluídas e a próxima liberada) também é guardado.
- Terminar a fase ou ficar sem vidas apaga o jogo em andamento; as melhores pontuações ficam.

Tudo é guardado no navegador do aparelho (`localStorage`). Se o navegador bloquear o armazenamento (ex.: modo restrito), o jogo funciona e avisa que os dados valem só até fechar a página.

## Tela e aparelhos
O jogo ocupa o máximo da tela mantendo a proporção 25:18 e fica nítido em telas de alta densidade. Em telas pequenas (celular em pé) a câmera aproxima e segue o cachorrinho; em celular deitado ou tablet o controle de toque fica ao lado ou abaixo do jogo. A altura do placar é medida para o jogo caber sem rolar a página. Para ver os controles de toque no computador, abra `index.html?touch=1`.

## Estrutura
```
index.html            canvas, placar (HTML) e todas as telas (menu, fases, como jogar, pontuações, nome, pausa, vitória, derrota)
css/style.css         visual, tamanho proporcional e controle de toque
js/version.js         versão do jogo (mostrada no menu)
js/auth.js            regras da senha e impressão PBKDF2-SHA256 (testável sozinho)
js/themes.js          ambientes das 20 fases (chão, paredes e caixas de cada lugar)
docs/LOJINHA.md      plano e regras da lojinha de skins (petiscos e petscoin)
tools/citymaze/       gerador dos labirintos de cidade (Python): gen_citymaze.py (configuração das Fases 1 a 20), apply_citymaze.py (Fases 1 a 10), apply_levels11_20.py (Fases 11 a 20) e maps/map1.json … map20.json (os mapas que estão no jogo; o teste confere paredes iguais)
js/sound.js           efeitos sonoros sintetizados com a Web Audio API, sem arquivos de áudio (testável sozinho)
js/records.js         nome, contas, pontuação, melhores pontuações, progresso e jogo salvo (testável sozinho)
js/config.js          configuração (ranking compartilhado em stand by: sharedRanking e endereço do servidor)
js/board.js           ranking compartilhado entre aparelhos (REST / banco do Claude), em stand by, com validação (testável sozinho)
js/game.js            fases e mapas, cachorro, rações, agentes da carrocinha (IA), vidas, tentativas, telas, salvamento, toque e desenho
tests/auth.test.js    testes unitários das senhas (Node)
tests/records.test.js testes unitários das pontuações e melhores pontuações (Node)
tests/accounts.test.js testes unitários do cadastro e da entrada (Node)
tests/board.test.js   testes unitários do ranking compartilhado, com servidor de mentira (Node)
tests/sound.test.js   testes unitários dos efeitos sonoros (Node, com um áudio de mentira) 
tests/themes.test.js  testes unitários dos ambientes das fases (Node)
tests/version.test.js confere a versão (js/version.js) com o CHANGELOG.md e o workflow
tests/e2e.js          testes no navegador (Playwright)
.github/workflows/pages.yml   publicação no GitHub Pages
```

## Testes
```
node tests/auth.test.js        # unitários, só precisam do Node
node tests/records.test.js
node tests/accounts.test.js
node tests/board.test.js
node tests/version.test.js
node tests/sound.test.js
node tests/themes.test.js
npm i playwright
npx playwright install chromium   # ou use CHROMIUM_PATH=/caminho/do/chromium
node tests/e2e.js              # opcional: node tests/e2e.js "toque" roda só as seções com esse texto
```
Os testes do ranking compartilhado usam um servidor de mentira com a mesma API do Firebase Realtime Database; o jogo **não foi testado contra um Firebase de verdade**.

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Notas
- Sem som no aparelho? Os navegadores só liberam o áudio depois do primeiro toque, clique ou tecla do jogador; use **Som: ligado** no menu ou a tecla **M**.
