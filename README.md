# Jogo 2D top-down (sem nome ainda)

Versão atual: o **Cachorrinho**, o **Gatinho** e o **Passarinho** estão prontos, cada um com as suas **20 fases** (com gatos, cães rastreadores e gaviões, missões, ossos, novelos e frutos de tipos novos, bolinhas, camundongos e minhocas, petiscos e lojinha de skins).

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Versão
A versão do jogo aparece no **menu inicial** (canto inferior esquerdo), por exemplo "Versão 0.20.0 · 30/10/2026", e, na linha pequena do crédito (canto de baixo à direita), "Fundado em 06/10/2026" (o dia em que o jogo foi criado, `founded` em `js/version.js`). No GitHub Pages ela também mostra o código do commit ("· build abc1234"), que diz exatamente qual atualização está no ar. O histórico de mudanças está no [`CHANGELOG.md`](CHANGELOG.md); para publicar uma atualização, mude `js/version.js` e o `CHANGELOG.md` (o teste `node tests/version.test.js` confere se combinam).

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), no computador, celular ou tablet.

## Objetivo
Você é um cachorrinho (ou, escolhendo o **Gatinho** no menu, um gatinho que caça ratinhos: as palavras e as mecânicas dele estão em *Mecânicas do Gatinho (0.18.0)*; ou, escolhendo o **Passarinho**, um passarinho que pega sementes, frutos e minhocas e foge dos gatos de quintal e dos gaviões: veja *Passarinho (0.20.0)*; o texto desta seção é do Cachorrinho). Pegue as tigelas de ração (e, a partir da Fase 2, os **ossos**) e chegue à saída. Nas Fases 1 a 3 a saída só abre quando você pegar **tudo**; nas **Fases 4 a 20** ela abre assim que a sua pontuação na fase chega aos **pontos mínimos** (800 na Fase 4, 1000 na 5, de 1250 a 2050 nas Fases 6 a 10 e de 2300 a 4000 nas Fases 11 a 20), sem precisar pegar tudo; **a partir da Fase 11 também é preciso cumprir a missão da fase**. Os itens aparecem em **lugares diferentes a cada jogo**, e **alguns trazem uma vida extra** (escondida: você só descobre ao pegar o item).

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

**Fases 4 a 20, pontos mínimos:** cada vida perdida custa **200 pontos** nas Fases 4 e 5, **250** nas Fases 6 a 8, **300** nas Fases 9 a 12 e de **325 a 400** nas Fases 13 a 20 (`lifePenalty`), e a saída **abre quando a pontuação corrente da fase** (rações + ossos + carteiros ou gatos assustados + bolinhas − vidas perdidas − tentativas, ainda sem o bônus de tempo) **chega a 800** (**1000 na Fase 5**, de **1250 a 2050** nas Fases 6 a 10 e de **2300 a 4000** nas Fases 11 a 20): não é preciso pegar todos os itens (por isso há mais rações disponíveis). O placar mostra *PONTOS 450 / 800* e um aviso diz quando a meta foi atingida; se uma vida perdida derrubar a pontuação abaixo da meta, a saída fecha de novo. Se todos os itens já foram pegos, o poder acabou e a pontuação ainda não chega à meta, não há mais como passar: a tentativa termina (*Os pontos não bastaram!*, com a explicação de que o jogador pegou tudo mas a pontuação ficou abaixo do mínimo) e vale a regra das novas tentativas.

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
**A partir da Fase 11 há ossos de cores diferentes, cada um com um poder.** Todos valem **150 pontos** e dão **+10% de velocidade** até o fim da fase (como o osso comum), contam para a missão *pegar todos os ossos* e podem esconder uma vida extra; o que muda é o poder (o *Osso poderoso* soma **+4 s por nível** em todos os efeitos). Os tipos de osso de cada fase são fixos (`boneMix` em `js/game.js`), mas **quais ossos ficam em qual lugar é sorteado a cada jogo**; em toda fase há **pelo menos 3 ossos comuns**, para o poder de assustar (+100 extra) estar sempre à mão.

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
**Ao completar cada fase o cachorrinho ganha 1 petisco; 1 petisco = 1 petscoin.** O saldo fica guardado no nome de usuário do jogador (só neste aparelho, como as pontuações; quem não tem nome não guarda) e aparece no menu (*Petscoin: N*) e na tela de vitória (*Petisco ganho! +1 petscoin*). Em **Menu → Lojinha de skins** os petscoin viram **skins** para o cachorrinho, **a partir de 10 petscoin**: Cinza-prata (10), Dálmata (12), Chocolate (15), Dourado (20), Arco-íris (25), Pirata (30), Astronauta (40) e Super-cão (50), além do Caramelo grátis. A skin só muda o desenho (o tamanho de contato, a velocidade e as regras são os mesmos) e vale nos três tamanhos e nas quatro direções. O plano completo, as regras e as ideias para depois estão em [`docs/LOJINHA.md`](docs/LOJINHA.md); o preço mínimo (`MIN_SKIN_PRICE = 10`) é conferido pelo código e pelos testes. Desde a 0.19.0 a lojinha também vende skins dos objetos de cada jogo, liberadas conforme o jogador avança nas fases (veja *Lojinha única*, abaixo).

**Skins do Gatinho (0.18.0).** Com o **Gatinho** escolhido, a mesma lojinha vende as **12 skins do gato** (`CatArt.SKINS`: Rajado grátis, Preto 10, Branco 12, Cinza 14, Laranja 16, Siamês 20, Van Turco 22, Tricolor 25, Smoking 28, Pirata 30, Astronauta 40 e Super-gato 50), com prévia do gatinho desenhado e os botões **Comprar / Usar / Em uso** de sempre; os avisos de compra e de uso do gatinho citam o gatinho (vêm do perfil). A **carteira de petscoin é única** (um saldo por jogador, qualquer bichinho que complete a fase), mas **as skins compradas e em uso são por bichinho**: o Cachorrinho continua guardando no formato de sempre (`{ t, own, eq }`) e as do gato entram na mesma carteira com o prefixo do bichinho (`own: ["cinza", "cat:preto"]`) e a skin em uso do gato em `eqa` (`eqa: { cat: "preto" }`), campos que **só aparecem depois que o jogador compra ou usa algo do gato**. Assim os ids repetidos (Cinza, Pirata, Astronauta) são skins diferentes. A API é `buySkin(nome, id, preço, bichinho = "dog")`, `equipSkin(nome, id, bichinho = "dog")`, `equippedSkin(nome, bichinho = "dog")` e `wallet(nome, bichinho = "dog")` (o saldo é o mesmo; `owned` e `equipped` são do bichinho, com ids sem prefixo); `wallet(nome)` e o JSON do Cachorrinho são idênticos aos de antes. As skins são **só visuais** (velocidade, colisão, fôlego e pontos iguais com qualquer skin, provado por simulação A/B em `node tests/e2e.js "Gatinho: sons e skins"`). Dados adulterados (ids desconhecidos, `cat:` sem skin, tipos errados) são ignorados sem derrubar nada; apagar a conta apaga tudo; duas abas continuam consistentes. **A lojinha é uma só** (veja *Lojinha única*, logo abaixo): as 12 skins do gato formam a categoria *Gatinho* (`cat`) da aba do Gatinho, todas à venda desde a Fase 1.

### Lojinha única (0.19.0)
Desde a Atualização 4 a lojinha é **uma só**, para as skins de **todos os bichinhos e dos objetos que aparecem nas fases**. A tela (**Menu → Lojinha de skins**) tem o **saldo e o aviso fixos no alto**, o **Voltar sempre à vista no pé**, uma **aba por jogo** (**Cachorrinho | Gatinho | Passarinho**; um jogo que ainda não está pronto aparece desligado, *em breve*) e, dentro do jogo, uma **aba por categoria** (o bichinho, os agentes da carrocinha, as rações, as saídas...). Ela abre no bichinho escolhido, **na categoria do próprio bichinho**, com o **foco na aba do jogo** (sempre à vista no alto: o Enter logo ao abrir não compra nada), e lembra a categoria aberta em cada jogo enquanto a tela fica aberta. O conteúdo fica alinhado ao topo (a barra de abas não pula ao trocar de categoria) e, ao abrir uma categoria em celular pequeno ou deitado, a tela rola o bastante para mostrar o começo da lista, sem tirar o foco da aba. Para o leitor de tela, a categoria do próprio bichinho se chama *O cachorrinho* ou *O gatinho* (o texto na tela continua o mesmo), para não repetir o nome da aba do jogo; abaixo de 300 px de largura (zoom de 200% num celular) as abas dos jogos passam para mais de uma linha. As setas ← → (e Início e Fim) andam entre as abas (as desligadas são puladas), ↑ ↓ passam pela aba aberta e entram na lista de cartões, e Tab vai direto da aba aberta para os cartões (as abas seguem o padrão de abas do leitor de tela: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` e o painel `role="tabpanel"` rotulado pela aba aberta). A **carteira de petscoin é única**: o petisco de uma fase concluída em qualquer jogo vai para o mesmo saldo. Cada categoria de objeto tem 4 skins além da padrão, de 10 a 30 petscoin; as do bichinho são as de sempre (as 9 do Cachorrinho, as 12 do Gatinho e as 12 do Passarinho, de 10 a 50), e nenhuma custa menos que `MIN_SKIN_PRICE = 10`. **Comprar** gasta os petscoin e já deixa a skin em uso; **Usar** troca; **Em uso** marca a de agora; **há uma skin em uso por categoria**, e a skin só aparece no jogo do bichinho a que a categoria pertence. Sem nome de usuário a lojinha só mostra as skins (botões desligados), como antes.

**Liberação por fase.** Uma categoria só vende depois que o jogador **alcançou a fase em que o objeto aparece pela primeira vez, NAQUELE jogo**: alcançar a Fase N é ter concluído a N−1 (sem nada concluído vale a Fase 1; o máximo é a 20). Ou seja, quem ainda não chegou à Fase 11 do Cachorrinho não vê os gatos para comprar, e as skins dos gatos do Cachorrinho abrem ao **concluir a Fase 10**. O progresso é **de cada jogo**: concluir fases do Gatinho não libera categorias do Cachorrinho, nem o contrário. Uma categoria bloqueada **continua na lista de abas, apagada e com cadeado** (*Gatos 🔒 Fase 11*) e, ao abrir, mostra só **Libera ao chegar à Fase N do Cachorrinho** (com a fase em que o jogador está), sem cartões nem botões de comprar. Para o leitor de tela a aba diz, por exemplo, *Gatos, bloqueada. Libera ao chegar à Fase 11 do Cachorrinho* (o cadeado é só enfeite, escondido com `aria-hidden`). Uma skin também pode abrir mais tarde que a categoria (campo `from` da skin, nunca antes); o cartão dela mostra *Skin escondida* e o bloqueio, e a compra é recusada até o jogador alcançar essa fase. Nenhuma skin do catálogo usa isso hoje; um teste de navegador confere o comportamento com uma skin de teste (`node tests/e2e.js "Lojinha única: skin com fase própria"`).

| Jogo | Categoria | Chave | Libera ao chegar à fase | O que são |
|---|---|---|---|---|
| Cachorrinho | Cachorrinho | dog | 1 | o bichinho que você joga (as 9 skins de sempre) |
| Cachorrinho | Agentes da carrocinha | agent | 1 | os agentes que perseguem o cachorrinho |
| Cachorrinho | Rações | ration | 1 | as tigelas de ração |
| Cachorrinho | Saída | exit | 1 | a saída da fase |
| Cachorrinho | Carteiros | postman | 2 | os agentes assustados pelo poder do osso |
| Cachorrinho | Ossos | bone | 2 | os ossos (a skin muda o osso COMUM; os de ouro, gelo, turbo e ímã, das Fases 11 a 20, mantêm a cor e o brilho do efeito e só recebem o desenho da skin, em tom sobre tom, para ninguém confundir o que cada um faz) |
| Cachorrinho | Bolinhas | ball | 2 | as bolinhas que fogem |
| Cachorrinho | Blocos e paredes | block | 3 | os blocos e as paredes que se movem |
| Cachorrinho | Vans da carrocinha | van | 4 | as vans das cidades |
| Cachorrinho | Gatos | foecat | 11 | os gatos que atrapalham a partir da Fase 11 |
| Gatinho | Gatinho | cat | 1 | o bichinho que você joga (as 12 skins do gato) |
| Gatinho | Cães de guarda | guard | 1 | os cães que patrulham a rua |
| Gatinho | Ratinhos | mouse | 1 | os ratinhos |
| Gatinho | Saída | catexit | 1 | a saída da fase do gato |
| Gatinho | Novelos | yarn | 2 | os novelos |
| Gatinho | Camundongos ágeis | agile | 2 | os camundongos que disparam |
| Gatinho | Lugares altos | perch | 3 | árvores, prateleiras e muros em que o gatinho fica a salvo |
| Gatinho | Cães rastreadores | tracker | 11 | os rastreadores que seguem o rastro |
| Passarinho | Passarinho | bird | 1 | o bichinho que você joga (as 12 skins do passarinho) |
| Passarinho | Sementes | seed | 1 | as sementes que o passarinho bica |
| Passarinho | Gatos de quintal | stray | 1 | os gatos que andam pelo chão e perseguem o passarinho |
| Passarinho | Ninho (saída) | birdexit | 1 | o ninho que é a saída da fase |
| Passarinho | Frutos | berry | 2 | os frutos com poderes (o voo alto e os outros quatro; a skin só põe uma estampa por cima e a cor de cada poder é sempre a mesma) |
| Passarinho | Minhocas | bug | 2 | as minhocas que saem da terra e fogem |
| Passarinho | Poleiros | roost | 3 | os galhos em que o passarinho fica a salvo |
| Passarinho | Ventos | gust | 3 | as correntes de vento que empurram o passarinho (a skin muda só o estilo e a cor das fitas e da setinha) |
| Passarinho | Gaviões | hawk | 11 | os gaviões que voam atrás do passarinho a partir da Fase 11 |

A fase de cada categoria é a **primeira do jogo em que o objeto existe**, e um teste de navegador confere isso com os mapas de verdade: para cada categoria que já tem skins, procura nas 20 fases montadas (`__game.builtOf(jogo)`) a primeira em que o objeto aparece (agentes = `vetSpawns`, ossos = `bones`, carteiros = ossos com poder, bolinhas ou camundongos = `balls`, blocos = `blockDefs`, vans = as caixas marcadas `van`, gatos e rastreadores = `catSpawns`, lugares altos = `high`...; no Passarinho, os dados dos mapas de `js/bird-levels.js`: sementes = `seeds`, gatos de quintal = `cats`, o ninho = a saída `E`, frutos = `fruits`, minhocas = `worms`, poleiros = os galhos `G`, ventos = `special.wind`, gaviões = `hawks`) e exige que seja a fase `from` da categoria e que o objeto continue nas fases seguintes (`node tests/e2e.js "Lojinha única: a fase"`); a única exceção é o vento, que de propósito não existe nas Fases 5 e 18 do Passarinho. O catálogo (as categorias, o `from` de cada uma, o registro das skins e a regra «alcançou a fase», `Skins.unlocked`, que a tela da lojinha usa) está em `js/skins.js` e é testado em `tests/skins.test.js`; o armazenamento (`js/records.js`, `gateOf`) faz a mesma comparação por conta própria, com uma cópia local, porque a trava também vale sem a tela; as skins dos objetos do Cachorrinho ficam em `js/skins-dog.js`, as dos objetos do Gatinho em `js/skins-cat.js`, as dos objetos do Passarinho em `js/skins-bird.js`, e o bichinho (categorias `dog`, `cat` e `bird`) é registrado em `js/game.js` a partir de `SKINS`, de `CatArt.SKINS` e de `BirdArt.SKINS`.

**Skins do Passarinho (0.20.0).** O jogo do Passarinho entra na lojinha com **9 categorias**: o passarinho (**12 skins**, de 10 a 50 petscoin: Marrom grátis, Amarelo, Azul, Vermelho, Verde, Cinza, Branco, Preto, Laranja, Arco-íris, Pirata e Astronauta) e **8 categorias de objetos com 4 skins cada**, de 10 a 30 petscoin: *Sementes*, *Gatos de quintal*, *Ninho (saída)*, *Frutos*, *Minhocas*, *Poleiros*, *Ventos* e *Gaviões* (`js/skins-bird.js`, desenhadas por `js/bird-art.js`). As skins são **só visuais** e o passarinho continua genérico: as cores e os enfeites não dizem espécie nenhuma e não mudam nada do jogo. Os **frutos** guardam a cor-chave de cada poder (o voo alto, o escudo, o ar frio, a rajada e o ímã continuam distintos por cor e pela marquinha com qualquer skin: a skin só põe uma estampa por cima), o **ninho** continua verde aberto e vermelho fechado, e os **gatos de quintal**, os **gaviões**, as **sementes** e as **minhocas** têm sempre pelo, penas ou casca CLAROS para aparecerem na noite das Fases 18 e 19 (um teste confere). Os **ventos** mudam só o estilo e a cor das fitas e da setinha, nunca a direção nem a força. Com o Cachorrinho e o Gatinho o catálogo inteiro tem **126 skins pagas em 27 categorias**, dentro do limite da carteira (200 skins e 40 categorias por jogador).

**A carteira por categoria** (`js/records.js`). O saldo é um só para todos os jogos; as skins compradas e em uso são **por categoria**. O formato é o de sempre: o Cachorrinho (`dog`) guarda `{ t, own, eq }` com o id puro; as outras categorias entram em `own` com o prefixo da categoria (`own: ["cinza", "cat:preto", "agent:azul"]`) e a skin em uso de cada uma fica em `eqa` (`eqa: { cat: "preto", agent: "azul" }`), campos que **só aparecem depois que o jogador compra ou usa algo fora do Cachorrinho**. **O JSON de quem só tem dados do Cachorrinho é idêntico, byte a byte, ao da 0.18.0** (e as recusas, leituras e categorias bloqueadas não gravam nada). A API é compatível: `buySkin(nome, id, preço, categoria = "dog", opções)`, `equipSkin(nome, id, categoria = "dog")`, `equippedSkin(nome, categoria = "dog")` e `wallet(nome, categoria = "dog")` (`"dog"` e `"cat"` são os bichinhos); e há duas novas: `equippedSkins(nome)`, que devolve a skin em uso de **todas** as categorias de uma vez (`{ dog: "", cat: "preto", agent: "azul", ... }`; o jogo preenche com ela a skin em uso de cada categoria ao começar uma fase e ao comprar ou usar), e `reachedLevel(nome, jogo)`, a fase mais alta alcançada naquele jogo.

**A trava também está no armazenamento**, não só na tela: `buySkin` recusa com `{ ok: false, error: "locked" }` uma categoria cujo jogo ainda não alcançou a fase `from`, mesmo com saldo e mesmo quando uma tela velha ou outra aba pede a compra. Essa trava protege contra tela velha, outra aba e engano; **não é segurança de verdade**: tudo fica no `localStorage` do próprio aparelho, então quem edita os dados à mão ou chama as funções pelo console consegue burlá-la (uma conta local não impede isso). Quem diz o jogo e a fase é o catálogo (`Skins.slot(categoria).game` e `Skins.fromOf`); o chamador pode passar `{ game, from }` nas opções, mas só para **exigir mais**, nunca menos (um jogo que não bate com o do catálogo é pedido inválido). Os outros erros são os de antes (`invalid`, `owned`, `funds`; a trava vem antes do saldo). **Ao carregar**, os dados são validados com rigor: só ids válidos (`/^[a-z0-9-]{1,24}$/` e categorias de 2 a 12 letras minúsculas; `dog:` com prefixo e tipos errados são descartados), no máximo **200 skins** e **40 categorias** por jogador (eram 60 skins até a 0.18.0), e uma skin só vale como em uso se o jogador for dono dela; apagar a conta apaga tudo (skins, skins em uso e progresso, e as categorias bloqueadas voltam a travar); duas abas continuam consistentes (a trava lê o progresso de agora, mesmo se outra aba o mudou).

**Cuidado com abas antigas:** as versões **0.16.1, 0.17.0 e 0.18.0** não conhecem tudo o que a lojinha única guarda. Se uma aba ainda aberta numa delas regravar a carteira (por exemplo, ao comprar uma skin do Cachorrinho): **a 0.16.1 e a 0.17.0 apagam as skins das categorias novas**; **a 0.18.0 as mantém, mas corta a carteira em 60 skins** (as que passam disso se perdem). Recarregue a página para usar a versão nova.

**Testes:** `node tests/records.test.js` (a carteira por categoria, a liberação, o formato e a validação), `node tests/skins.test.js` (o catálogo), `node tests/skins-bird.test.js` (as skins do Passarinho: preços, textos, campos visuais, o desenho de `js/bird-art.js` com cada skin, as cores-chave dos frutos, o ninho verde e vermelho, o pelo claro na noite e o `from` de cada categoria conferido com `js/bird-levels.js`) e, no navegador, `node tests/e2e.js "Skins do Passarinho"` (os mostruários e a lojinha do Passarinho) e `node tests/e2e.js "Lojinha única"` (as abas, o teclado e os rótulos para leitor de tela, o bloqueio e a liberação por fase com o exemplo dos gatos, a carteira única, comprar/usar/guardar por categoria, os tamanhos de tela 320×568, 360×640, 390×780, 740×390, 568×320 e 1000×700, e a conferência da fase `from` com os mapas).

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
**Para abrir a saída das Fases 11 a 20 não bastam os pontos mínimos: é preciso também cumprir a MISSÃO da fase.** A missão aparece no aviso do começo da fase, na lista de fases, no *Como jogar* e numa **faixa no alto do jogo** que mostra só o que ainda falta (*Missão: ossos 3/7 · rações 20/40*; cumprida, a faixa diz *Missão cumprida!*). Cada missão combina 1 ou 2 destas exigências:

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
| **Coração maior** | +1 vida no máximo (de 5 até 8 nas Fases 1 a 10; a partir da Fase 11 o máximo da fase já é 6 a 10 e o reforço soma mais 1, sem passar de 10) e +1 vida agora | 3 níveis |
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

### Sons do Gatinho (0.18.0)
São **15 sons novos** em `js/sound.js` (Atualização 3 · 0.18.0 · Gatinho): três miados por fase da vida, o ronronar, o chiado, o guincho do ratinho, o novelo, o latido e o rosnado do cão inimigo, o miado de susto e cinco sons de ação. Continuam **100% sintetizados** na hora (nada de arquivo de áudio, biblioteca ou rede) e **genéricos da espécie**: nada muda por raça nem por skin, **só pela fase da vida** (miado do filhote → jovem → adulto, como os latidos `bark1/2/3` do cachorrinho). Os 14 sons antigos não mudaram (conferido por medição: mesmos números de antes).

**Honestidade científica.** Todos os números abaixo são **escolha de design, não verificada em fonte**: a rede do ambiente de desenvolvimento estava bloqueada para artigos, então **nenhum valor foi conferido em artigo aberto**; para os sons há só uma **pista de literatura, não verificada** (bioacústica, `docs/pesquisa-gatinho/R2-sons.md`). Nenhum artigo é citado aqui como fonte verificada; a seção "Biologia por trás" só poderá citá-los depois de lidos de verdade. O que foi **medido** é o áudio gerado (tabela de medições abaixo), não a fidelidade à espécie.

| Som | Quando toca | Parâmetros (escolha de design; pista de literatura não verificada em R2) |
|---|---|---|
| `cmeow1` | miado do **filhote** | F0 inicial 1400 Hz, sobe a 1500 e cai a 950 Hz em ~0,34 s; dente de serra com passa-baixa que abre (2,2 → 4,8 kHz) e fecha (4,8 → 1,8 kHz); vibrato leve; sopro de ruído agudo (5,2 kHz) |
| `cmeow2` | miado do **jovem** | F0 inicial 900 Hz, sobe a 1000 e cai a 700 Hz em ~0,41 s; mesmo desenho, passa-baixa 1,5 → 3,6 → 1,1 kHz; sopro bem leve |
| `cmeow3` | miado do **adulto** | F0 330 Hz sobe a 540 Hz (em 0,2 s) e cai a 300 Hz em ~0,74 s (sobe-e-desce); passa-baixa 0,7 → 2,4 → 0,6 kHz como no `meow`; vibrato no fim; sem ruído |
| `purr` | ronronar | ~1,5 s. **Trem de pulsos de 26 Hz** (ciclo 33%, cai a 30% entre os pulsos) multiplicando portadoras de dente de serra de 156 Hz (inspiração, mais fraca) e 130 → 122 Hz (expiração, mais forte), 2ª harmônica triangular e sopro grave de ruído. (Escolha de design / precaução; não verificado: os pulsos de 26 Hz imitam uma vibração grave que o alto-falante não reproduz, então o que se ouve é a portadora pulsando.) |
| `hiss` | chiado | ~0,5 s, **só ruído** (nenhum oscilador): estalo seco (passa-alta 3 kHz) e sopro que cai (passa-alta 2,2 kHz), os dois limitados a ~8-9 kHz; filtros de Q baixo (sem componente tonal) |
| `squeak` | guincho do ratinho | ~0,11 s; fundamental triangular 3800 → 3300 Hz com vibrato rápido (40 Hz) e harmônicos (2f e 3f) fracos; baixo, para tocar dezenas de vezes |
| `yarn` | novelo (poder) | ~0,42 s; "boing" de mola (senoide 300 → 900 Hz que assenta em 700 Hz, com vibrato) e farfalhar de papel (ruído agudo); sem arpejo nem quadrada (diferente do `bone`) |
| `woof` | cão inimigo nota o gatinho | ~0,34 s; "UÓF" de dente de serra 690 → 480 Hz com formante (passa-baixa 2,6 kHz → 750 Hz, Q 2,5), quadrada de peito (uma oitava abaixo) e sopros de ruído |
| `growl` | rosnado do cão inimigo | ~0,52 s; serras de 118 → 98 Hz e 141 → 112 Hz com modulação de amplitude de 30 e 27 Hz e ruído grave que pulsa a 30 Hz |
| `yowl` | miado de susto/dor | ~0,36 s; duas serras desafinadas (1250 e 1285 Hz) caindo a ~560 Hz, vibrato e ruído áspero |
| `splash` | pata na poça (ação) | ~0,29 s; "pá" de ruído, respingo passa-banda 2200 → 1100 Hz e bolha senoidal 420 → 1200 Hz |
| `shake` | sacudir o pelo molhado (ação) | ~0,41 s; 8 rajadas de ruído passa-banda (2200 e 2900 Hz alternando), cada uma mais fraca |
| `jump` | pulo (ação) | ~0,15 s; "tum" senoidal 170 → 85 Hz e sopro passa-banda 700 → 1900 Hz |
| `dash` | arrancada (ação) | ~0,2 s; sopro passa-banda 600 → 3600 Hz que sobe, com corpo triangular fraco |
| `pant` | fôlego acabando (ação) | ~0,35 s; respiração em duas ondas de ruído passa-banda (~1,5 kHz), a segunda mais fraca |

**Quando tocar (contrato para a integração no jogo).** O jogo só chama `sound.play(nome, { delay })`; o escolher-por-fase fica no `js/game.js`:
- **Completar a fase** (junto do `levelup`, como o latido do cachorrinho): o miado da fase da vida do gatinho, `cmeow1` (filhote), `cmeow2` (jovem) ou `cmeow3` (adulto), com `delay: 0.9`; e depois o `purr` (sugestão `delay: 1.7`, para o ronronar começar quando o miado do adulto acaba). Os miados também servem de **"chamar"**.
- **Vencer a fase** e **pegar um ratinho raro**: `purr`. No ratinho raro, o `squeak` primeiro e o `purr` logo depois (sugestão `delay: 0.15`).
- **Pegar um ratinho (presa)**: `squeak`, uma vez por ratinho (o motor já ignora o mesmo som repetido em menos de 60 ms; é curto e baixo porque pode tocar dezenas de vezes por fase).
- **Pegar o novelo (poder)**: `yarn` (no lugar do `bone`). **Quando o poder do novelo "eriça" o gatinho e afugenta os cães**: `hiss` (sugestão `delay: 0.3`, como o `transform` depois do `bone`).
- **Um cão inimigo nota o gatinho**: `woof` (com um intervalo mínimo no jogo por cão, como os 4 s do `meow` do gato, para não virar metralhadora). O `growl` é o rosnado do mesmo cão; o dono ainda não disse em que momento ele toca (sugestão, que o jogo já segue: quando o rastreador começa a perseguir e está a até 8 tiles do gatinho, no máximo uma vez a cada 3 s) — **dúvida para o dono**.
- **Um cão pega o gatinho**: `yowl` junto do `capture` (sugestão: `capture` sem atraso, `yowl` com `delay: 0.1` e o `lifelost` depois, como já é hoje).
- **Ações do gatinho (discretas, tocam muitas vezes)**: `splash` ao pisar na poça, `shake` ao sacudir o pelo molhado, `jump` no pulo, `dash` na arrancada, `pant` quando o fôlego está acabando.
- Nunca por raça nem por skin: as skins só mudam o visual.

```js
const MIAU = { filhote: "cmeow1", jovem: "cmeow2", adulto: "cmeow3" };   // fase da vida do gatinho (mesma regra do cachorrinho)
sound.play("levelup");
sound.play(MIAU[fase], { delay: 0.9 });
sound.play("purr", { delay: 1.7 });
```

**Integrado ao jogo (0.18.0).** O contrato acima está ligado ao `js/game.js`, e **quem escolhe o som de cada momento é o perfil do bichinho** (`P().sfx` em `js/profiles.js`), nunca um `if (gatinho)` no motor: o Cachorrinho tem os nomes de sempre (e `""` = nenhum som nos momentos que só o Gatinho tem), o Gatinho tem os dele. No jogo ficam só os atrasos e os intervalos mínimos (constantes `SFX_*` e o ajudante `sfx(nome, atraso)`). O botão de som (`M`), o volume, o teto de 8 vozes e os 60 ms entre sons iguais continuam sendo do `js/sound.js`, que **não mudou**.

| Momento (Gatinho) | Som | Atraso / limite |
|---|---|---|
| completar a fase | `levelup`; o miado da fase da vida (`cmeow1` filhote, `cmeow2` jovem, `cmeow3` adulto); o `purr` | miado 0,9 s depois, ronronar 1,7 s depois |
| pegar um ratinho | `squeak` (no lugar do som da ração) | — |
| pegar um camundongo ágil (o "ratinho raro") | `squeak` e o `purr` | ronronar 0,15 s depois |
| pegar um novelo | `yarn` (no lugar do `bone`) | — |
| novelo comum (o poder que eriça o pelo e afugenta os cães) | `yarn` e o `hiss` | chiado 0,3 s depois, só quando o poder liga (renovar o poder não chia de novo; como o `transform` do Cachorrinho) |
| o cão de guarda nota o gatinho (o "!" liga) | `woof` | no mínimo 2,5 s entre dois latidos do mesmo cão e 0,4 s entre quaisquer cães |
| o rastreador começa a perseguir | `growl` | no máximo 1 a cada 3 s, e só se ele está a até 8 tiles do gatinho (um rastreador longe, que não é ouvido, não gasta o intervalo) |
| um cão (ou rastreador) pega o gatinho | `capture`, o `yowl` e o `lifelost` de hoje | `yowl` 0,1 s depois, `lifelost` 0,5 s depois (ou o `gameover`) |
| afugentar um cão (+100) | `postman` (o som de hoje do carteiro) | — |
| pisar numa poça | `splash` | a cada entrada (estar dentro, ou passar para a poça do lado, não repete) |
| o pelo molhado seca | `shake` | uma vez |
| começar a atravessar um obstáculo baixo (X) | `jump` | no máximo 1 a cada 0,4 s (seguir sobre o muro não repete) |
| começar uma arrancada | `dash` | no máximo 1 a cada 0,6 s |
| o fôlego acaba (fica ofegante) | `pant` | uma vez a cada vez que o fôlego esvazia |
| vida extra, vida perdida, fim de jogo, escolher o reforço | `life`, `lifelost`, `gameover` e `pick` de sempre | — |

**Dúvidas que o dono ainda decide** (o jogo já faz a sugestão do contrato): (1) o **momento do rosnado** (`growl`): hoje é ao começar a perseguir, no máximo a cada 3 s e a até 8 tiles; (2) a **ordem da captura**: `capture` sem atraso e o miado de susto (`yowl`) 0,1 s depois, como o contrato sugeriu; (3) o **chiado** só toca quando o poder do novelo liga (como o `transform`), não ao renovar. **Ninguém ouviu** estes sons no jogo ainda; só foi provado QUANDO cada um é pedido.

**Cachorrinho sem som novo.** `tests/ab-sounds.js` (`node tests/ab-sounds.js <pasta-do-código>`) joga cenas fixas do Cachorrinho com a mesma semente (rações, ossos de todos os tipos, bolinhas, carteiros, gatos que miam, o "!" dos agentes, ser pego, fim de jogo e os três latidos) e devolve a lista de pedidos de som com os atrasos; `tests/ab-sounds-0170.json` é a referência tirada do código de antes dos sons do Gatinho (commit `ad58681`), e o `tests/e2e.js` confere que o Cachorrinho toca **exatamente os mesmos** (nomes e atrasos) e nenhum som do Gatinho. Os testes do Gatinho usam um espião em `sound.play` (o gancho `sound.events` guarda o nome, mas não o atraso): `node tests/e2e.js "Gatinho: sons e skins"`.

**Medições (áudio renderizado de verdade).** Cada som foi renderizado offline no Chromium (`OfflineAudioContext`, 44 100 Hz, volume padrão 0,35 + compressor, como o jogador ouve) e analisado com FFT. Os 14 sons antigos ficam entre **−16,9 e −23,7 dBFS de RMS**; os de evento novos ficaram entre **−20,1 e −23,1**; o `squeak` (que pode tocar dezenas de vezes por fase) em **−24,5**; e os de ação, mais baixos de propósito, entre **−29,5 e −33,0**. O pico com o **volume no máximo** fica abaixo de 0,99 em todos (os maiores dos novos são o `hiss`, 0,885, e o `purr`, 0,877; o maior dos antigos é o `capture`, 0,898), sem amostra cortada; o começo (primeiros 2 ms) fica abaixo de 25% do pico e o fim abaixo de 5%, sem clique.

| Som | Duração audível (s) | Máximo (s) | RMS (dBFS) | Pico (vol. padrão) | Pico (vol. 1,0) | `LEVEL` | Medido no áudio |
|---|---|---|---|---|---|---|---|
| `cmeow1` | 0,342 | 0,4 | −22,3 | 0,294 | 0,649 | 1,4 | F0 1425 → 1487 → 977 Hz |
| `cmeow2` | 0,412 | 0,5 | −22,1 | 0,280 | 0,619 | 1,25 | F0 925 → 998 → 728 Hz |
| `cmeow3` | 0,740 | 0,8 | −20,6 | 0,328 | 0,673 | 1,2 | F0 342 → 526 → 309 Hz |
| `purr` | 1,498 | 1,8 | −20,1 | 0,540 | 0,877 | 1,3 | modulação de amplitude em 26,2 Hz |
| `hiss` | 0,498 | 0,55 | −23,1 | 0,538 | 0,885 | 0,9 | centroide 6,7 kHz; platitude espectral 0,45 (ruído) |
| `squeak` | 0,115 | 0,16 | −24,5 | 0,184 | 0,493 | 0,7 | pico espectral em 3564 Hz |
| `yarn` | 0,421 | 0,45 | −20,4 | 0,257 | 0,609 | 0,7 | glissando 365 → 922 Hz |
| `woof` | 0,337 | 0,4 | −21,4 | 0,393 | 0,735 | 1,3 | dente de serra 690 → 480 Hz |
| `growl` | 0,523 | 0,6 | −20,2 | 0,448 | 0,811 | 1,3 | modulação de amplitude em 29,6 Hz |
| `yowl` | 0,364 | 0,4 | −21,7 | 0,396 | 0,768 | 1,2 | F0 1255 → 507 Hz |
| `splash` | 0,268 | 0,35 | −30,6 | 0,139 | 0,393 | 1,1 | — |
| `shake` | 0,410 | 0,45 | −33,0 | 0,168 | 0,458 | 1,0 | 8 rajadas |
| `jump` | 0,146 | 0,18 | −29,5 | 0,175 | 0,478 | 0,75 | — |
| `dash` | 0,203 | 0,22 | −30,8 | 0,138 | 0,389 | 1,2 | — |
| `pant` | 0,354 | 0,4 | −31,0 | 0,166 | 0,456 | 1,5 | 2 ondas |

**Testes.** `node tests/sound.test.js` confere, com o áudio de mentira: os 15 nomes, `MAX_SECONDS` e `LEVEL`; o mesmo conjunto de exigências dos sons antigos (envelope de 0 a 0, ataque de pelo menos 3 ms, duração, até 8 vozes, atraso); a ordem **filhote > jovem > adulto** na F0 inicial, na máxima e na duração; o `purr` com taxa de modulação entre 20 e 35 Hz e portadoras de 90 a 180 Hz; o `squeak` com fundamental entre 3 e 4,5 kHz; o `hiss` sem nenhum oscilador (só ruído, filtros de Q baixo); `splash`, `shake`, `jump`, `dash`, `pant` e `squeak` com ganho agregado menor que o de qualquer som de evento; e este README (a lista acima e a frase de honestidade). Os números de volume (RMS, pico, F0 medida) vêm da renderização no Chromium acima e **não** são um teste automático do repositório.

**Limites honestos.** (1) Nada aqui foi verificado em artigo, e **ninguém ouviu** os sons ainda: só foram medidos (ouvir é o teste que falta; o dono deve julgar se o ronronar e o rosnado soam bem, já que o grave quase não sai em alto-falante de celular). (2) `purr` e `growl` ficam mais fracos para o ouvido que os outros (ponderação A de −27,0 e −26,6 dB, contra cerca de −21 a −23 dos demais eventos novos): são sons graves; o `LEVEL` foi calibrado pelo RMS, como os latidos do adulto. (3) O ganho agregado dos testes é uma medida de projeto que ignora filtros; o volume de verdade é o da tabela acima.

### Sons do Passarinho (0.20.0)
São **16 sons novos** em `js/sound.js` (Atualização 5 · 0.20.0 · Passarinho), anexados no fim da lista `Sound.NAMES`: três pios por fase da vida, a cantiga de completar a fase, o bater de asas, o bicar, a minhoca, o fruto, o início e o fim do voo alto, o pouso no galho, o vento, o miado de ameaça do gato, o grito do gavião, o susto e o fôlego vazio. Continuam **100% sintetizados** na hora (nada de arquivo de áudio, biblioteca ou rede) e **genéricos**: nada muda por skin, **só pela fase da vida** (pio do filhote → jovem → adulto, como os latidos `bark1/2/3` e os miados `cmeow1/2/3`). Os **29 sons antigos** (Cachorrinho e Gatinho) **não mudaram**: o teste confere uma impressão digital do grafo de áudio de cada um, tirada do código de antes, e as medições deles são as mesmas.

**Honestidade científica.** Todos os números abaixo são **escolha de design, não verificada em fonte**: nenhum artigo foi aberto (a rede do ambiente de desenvolvimento estava bloqueada) e nenhuma pista de literatura foi usada para estes sons; o desenho busca só um som **agradável para criança**, genérico e sem espécie nenhuma. Nada aqui afirma como um passarinho de verdade soa. O que foi **medido** é o áudio gerado (tabela de medições abaixo), não a fidelidade a bicho nenhum.

| Som | Quando toca | Parâmetros (escolha de design, não verificada em fonte) |
|---|---|---|
| `chirp1` | pio do **filhote** (completar a fase; também serve de "chamar") | ~0,24 s; dois pios de senoide: um "pi" que sobe (3000 → 3800 Hz, 0,06 s) e um "piu" que sobe a 4100 Hz e cai a 3100 Hz numa só nota (vibrato leve de 28 Hz); 2º harmônico muito fraco; sem ruído |
| `chirp2` | pio do **jovem** | ~0,35 s; dois "piu" de senoide (2200 → 3000 → 2300 Hz e 2400 → 3200 → 2400 Hz), cada um numa só nota com vibrato de 24 Hz; 2º harmônico fraco; sem ruído |
| `chirp3` | pio do **adulto** | ~0,56 s; três sílabas de onda triangular, mais encorpadas (2º e 3º harmônicos): 1500 → 2100 → 1800 Hz, 1600 → 2200 → 1900 Hz e 1700 → 2300 → 1300 Hz (a última mais longa, com vibrato de 18 Hz); sem ruído |
| `song` | **cantiga** ao completar a fase | ~1,22 s; 12 notas de senoide em dó maior (sol5 dó6 mi6 sol6 dó7, um gorjeio lá6 sol6 lá6 sol6, mi6 sol6 e o dó7 final), cada uma começa 7% abaixo e "derrapa" até o tom; 2º harmônico fraco; sem ruído e sem onda quadrada |
| `flap` | **bater asas** (a arrancada começa) | ~0,26 s; **só ruído**: quatro "fup" passa-banda graves (1100 → 600 Hz, a cada 63 ms, cada um mais fraco) e um sopro de ar agudo (passa-alta 2,6 kHz) por cima |
| `peck` | **bicar a semente** (pegar uma semente) | ~0,12 s; dois "toc-tic" de madeira: senoide 1500 → 750 Hz e 1900 → 1000 Hz (a 2ª mais fraca), cada uma com um estalo de ruído (passa-banda 3,2 e 3,8 kHz); baixo, porque toca dezenas de vezes por fase |
| `worm` | **puxar a minhoca** (pegar uma minhoca) | ~0,22 s; esticada mole (triangular 520 → 260 Hz com vibrato largo, 20 Hz e ±80 Hz, e farfalhar de terra passa-banda 900 → 500 Hz) e um "pop" de senoide que sobe (300 → 1000 Hz) com um estalo |
| `fruit` | **pegar o fruto** (poder; no lugar do `bone`) | ~0,47 s; harpa brilhante de quatro sinos de senoide (sol6 si6 ré7 sol7, a cada 60 ms, cada um toca e se apaga em 0,3 s) com 2º harmônico, corpo triangular de sol5 e brilho de ruído (passa-alta 6 kHz); sem onda quadrada e sem as notas do `bone` |
| `soar` | **início do voo alto** (fruto comum) | ~0,62 s; vento que sobe (passa-banda 400 → 2600 Hz, ataque lento de 0,2 s) com glissando triangular de duas oitavas (330 → 1320 Hz, passa-baixa que abre, vibrato lento de 7 Hz) e um "piu" de remate (2500 → 3300 → 2900 Hz) |
| `soarend` | **fim do voo alto** | ~0,43 s; o contrário, mais macio: glissando triangular que desce (1000 → 350 Hz, passa-baixa que fecha), vento que desce (passa-banda 2400 → 500 Hz) e um "pof" de ar grave no fim |
| `landing` | **pouso no galho** (a salvo) | ~0,23 s; dois baques de asa que acabam (passa-banda 1400 → 800 Hz e 1100 → 700 Hz), um "tup" senoidal leve (420 → 240 Hz) e folhas que assentam (ruído agudo bem fraco) |
| `gust` | **vento** (entrar numa corrente de ar) | ~0,55 s; **só ruído**, sem assobio: passa-banda 500 → 1400 Hz (Q 0,7, limitado a 2,6 kHz) com um corpo grave (passa-baixa 700 Hz) e ataque lento de 0,2 s; nenhum filtro acima de 3 kHz, para não irritar |
| `hiss2` | **miado de ameaça** do gato de quintal | ~0,49 s; agudo e rouco: um "ssh" de ruído passa-alta e duas serras desafinadas em 3% (700 e 722 Hz → 1300 e 1344 Hz → 760 e 782 Hz, cada uma numa só nota) com passa-baixa de 3,2 kHz, tremolo áspero de 38 Hz e ruído por baixo; sobe e cai (o `yowl` do Gatinho só cai) |
| `shriek` | **grito do gavião** | ~0,30 s; agudo e curto, numa só nota triangular: sobe de 1800 a 3100 Hz em 0,07 s e cai a 1700 Hz, com vibrato rápido (24 Hz, ±90 Hz), uma serra fraca com tremolo de 45 Hz (aspereza) e um sopro de ruído |
| `scare` | **susto/captura** do passarinho (junto do `capture`) | ~0,34 s; três "pi" assustados que despencam (3500 → 3000, 3200 → 2500 e 2900 → 1800 Hz, vibrato de 34 Hz) sobre uma batida de penas (ruído passa-banda 1800 → 700 Hz) |
| `wheeze` | **fôlego vazio** (a barra de fôlego esvazia) | ~0,36 s; três sopros curtos de ruído passa-banda (1,9 → 2,5 kHz, 2,2 → 2,8 kHz e 1,7 → 1,3 kHz, o último mais fraco) e um chiado fino de senoide bem fraca (1500 → 1100 Hz) por baixo; o mais baixo de todos |

**Quando toca.** O jogo só chama `sound.play(nome, { delay })`; **quem escolhe o som de cada momento é o perfil do bichinho** (`P().sfx` em `js/profiles.js`, chaves `bird.sfx.*`), nunca um `if (passarinho)` no motor. No Passarinho:
- **Completar a fase:** a fanfarra de sempre (`levelup`); 0,9 s depois o pio da fase da vida, `chirp1` (filhote), `chirp2` (jovem) ou `chirp3` (adulto); e 1,7 s depois a cantiga `song`.
- **Pegar uma semente:** `peck` (no lugar do som da ração). **Pegar uma minhoca:** `worm` (sem segundo som).
- **Pegar um fruto:** `fruit` (no lugar do `bone`); no fruto comum, quando o voo alto estava desligado, o `soar` toca 0,3 s depois. **Quando o voo alto acaba:** `soarend`.
- **Bater asas (a arrancada começa):** `flap`, no máximo um a cada 0,6 s. **Pousar no galho (ficar a salvo):** `landing`, uma vez a cada pouso.
- **Entrar numa corrente de vento:** `gust`, no máximo um a cada 1,6 s.
- **Um gato de quintal nota o passarinho (o ! liga):** `hiss2`, no máximo um a cada 2,5 s por gato e um a cada 0,4 s entre quaisquer gatos. **Um gavião nota o passarinho (ou parte para cima dele):** `shriek`, no máximo um a cada 3 s, de qualquer distância.
- **Um gato ou um gavião pega o passarinho:** `scare` (no lugar do `capture`) e, 0,5 s depois, o `lifelost` de sempre; se foi a última vida, toca o `gameover`.
- **O fôlego acaba:** `wheeze`, uma vez a cada vez que a barra esvazia.
- Vida extra e escolher o reforço: `life` e `pick` de sempre. Nenhum som muda por skin.

```js
sfx(P().sfx.win[estágio], SFX_WIN);      // o pio da fase da vida, SFX_WIN = 0,9 s depois da fanfarra
sfx(P().sfx.winMore, SFX_WIN_MORE);      // a cantiga, SFX_WIN_MORE = 1,7 s depois
```

**Novidade no sintetizador.** `sc.tone` ganhou a opção `path` (`[[fração da duração, frequência], ...]`: uma rampa exponencial até cada ponto), que faz um piu **subir e cair numa só nota**. Antes disso a subida e a descida eram duas notas emendadas, e as duas ondas, com fases diferentes, podiam se anular por alguns milissegundos (um "tique" no meio do piu). Nenhum som antigo usa `path`: o teste confere.

**Medições (áudio renderizado de verdade).** Cada som foi renderizado offline no Chromium (`OfflineAudioContext`, 44 100 Hz, volume padrão 0,35 + compressor, como o jogador ouve) e analisado com FFT, com o mesmo método dos sons do Gatinho. Os de evento (pios, cantiga, minhoca, fruto, voo alto, ameaça, grito e susto) ficaram entre **−20,9 e −23,2 dBFS de RMS**, a faixa dos sons antigos de evento; o `peck`, que toca dezenas de vezes por fase, em **−25,7**; e os de ação, mais baixos de propósito, entre **−29,4 e −31,8**. O pico com o **volume no máximo** fica abaixo de 0,99 em todos (o maior é o do `hiss2`, 0,836), sem amostra cortada; o começo (primeiros 2 ms) fica abaixo de 25% do pico e o fim abaixo de 5%, sem clique.

| Som | Duração audível (s) | Máximo (s) | RMS (dBFS) | Pico (vol. padrão) | Pico (vol. 1,0) | `LEVEL` | Medido no áudio |
|---|---|---|---|---|---|---|---|
| `chirp1` | 0,245 | 0,25 | −22,1 | 0,201 | 0,517 | 0,73 | F0 3160 → máx 4048 → 3219 Hz |
| `chirp2` | 0,355 | 0,4 | −22,4 | 0,201 | 0,515 | 0,67 | F0 2374 → máx 3120 → 2494 Hz |
| `chirp3` | 0,564 | 0,6 | −22,2 | 0,268 | 0,604 | 0,78 | F0 1600 → máx 2255 → 1343 Hz |
| `song` | 1,224 | 1,3 | −22,0 | 0,185 | 0,489 | 0,62 | centroide 1,9 kHz |
| `flap` | 0,263 | 0,3 | −31,1 | 0,196 | 0,522 | 1,0 | só ruído, centroide 4,8 kHz |
| `peck` | 0,118 | 0,15 | −25,7 | 0,267 | 0,625 | 0,75 | centroide 2,8 kHz |
| `worm` | 0,225 | 0,3 | −21,8 | 0,221 | 0,556 | 0,8 | centroide 1,1 kHz (o som mais grave dos novos) |
| `fruit` | 0,470 | 0,5 | −20,9 | 0,377 | 0,717 | 0,95 | notas 1568 → 2349 → 3136 Hz |
| `soar` | 0,624 | 0,65 | −20,9 | 0,274 | 0,637 | 0,9 | F0 351 → 3311 Hz |
| `soarend` | 0,431 | 0,5 | −23,2 | 0,271 | 0,632 | 1,0 | F0 969 → 246 Hz |
| `landing` | 0,225 | 0,3 | −29,4 | 0,221 | 0,559 | 1,0 | centroide 4,0 kHz |
| `gust` | 0,551 | 0,6 | −30,0 | 0,167 | 0,459 | 1,0 | só ruído, centroide 1,8 kHz |
| `hiss2` | 0,493 | 0,55 | −22,1 | 0,473 | 0,836 | 1,65 | centroide 3,9 kHz (ruído e serras) |
| `shriek` | 0,305 | 0,35 | −22,5 | 0,268 | 0,626 | 1,25 | F0 2084 → máx 2991 → 1708 Hz |
| `scare` | 0,345 | 0,4 | −22,0 | 0,290 | 0,651 | 1,15 | F0 3483 → 1915 Hz |
| `wheeze` | 0,363 | 0,4 | −31,8 | 0,141 | 0,396 | 1,25 | só ruído, centroide 5,7 kHz |

**Testes.** `node tests/sound.test.js` confere, com o áudio de mentira: os 16 nomes (depois dos 29 antigos, sem repetição), `MAX_SECONDS` e `LEVEL`; o mesmo conjunto de exigências de todos os sons (envelope de 0 a 0, ataque de pelo menos 3 ms, duração, até 8 vozes, atraso, nenhum fio solto); o ruído de cada som novo cabendo no buffer de 1 s, sem laço; a faixa de ganho agregado (de 0,3 a 2,5, com o pior caso abaixo de 1 no volume padrão); o botão de som mudo silenciando **todos** os 45 sons; a impressão digital dos 29 sons antigos; a ordem **filhote > jovem > adulto** na F0 inicial, na máxima e na duração dos pios; a cantiga só com tons de dó maior; o `flap` e o `gust` sem nenhum oscilador (só ruído, o vento sem filtro acima de 3 kHz e com ataque lento); o `hiss2` com duas serras desafinadas e tremolo de 30 a 50 Hz; o `shriek` sempre acima de 1,5 kHz; o `scare` com os três pios em queda, sem emenda; e este README (a lista acima e a frase de honestidade). Os números de volume (RMS, pico, F0 medida) vêm da renderização no Chromium acima e **não** são um teste automático do repositório.

**Limites honestos.** (1) Nada aqui foi verificado em artigo, e **ninguém ouviu** os sons no jogo: só foram medidos e olhados em espectrograma (ouvir é o teste que falta; o dono deve julgar se os pios e o grito soam bem e não cansam). (2) Os pios, o grito e o susto ficam na faixa de **3 a 4 kHz**, onde o ouvido é mais sensível, e o alto-falante de celular reproduz bem: se cansarem, basta baixar o `LEVEL` deles. (3) O `peck`, o `flap` e o `gust` podem tocar muitas vezes por fase: ficam mais baixos que os de evento e dependem dos intervalos mínimos do jogo (0,6 s entre dois bater de asas, 1,6 s entre dois ventos); só ouvindo se saberá se incomodam. (4) O ganho agregado dos testes é uma medida de projeto que ignora filtros; o volume de verdade é o da tabela acima, e o `worm` (centroide baixo) fica 4,5 dB abaixo do RMS na ponderação A.

## Vidas
Você começa com **3 vidas** (corações vermelhos no placar, logo depois dos pontos) e pode ter de **1 a 5** (até 8 com o reforço *Coração maior*; **a partir da Fase 11 o máximo sobe até 10**, veja *Missões e mais vidas*); as vidas são **cumulativas**:

- Pegar um item (ração ou osso) com vida extra dá **+1 vida**, até o máximo da fase (5; de 6 a 10 nas Fases 11 a 20; mais os níveis de *Coração maior*, nunca acima de 10).
- As vidas que sobram ao terminar uma fase **passam para a fase seguinte** (pelo botão *Próxima fase*). Escolher uma fase no menu ou usar *Jogar novamente* começa com 3 vidas.
- Se o agente da carrocinha encosta, você perde **1 vida** e **50 pontos** (**200** nas Fases 4 e 5, **250** nas Fases 6 a 8, **300** nas Fases 9 a 12 e de **325 a 400** nas Fases 13 a 20). O cachorrinho **volta ao início da fase** (no mesmo lugar de quando ela começou; **da Fase 9 em diante ele renasce onde caiu**), ganha uns segundos de proteção, o **tempo continua contando** (não zera) e **as rações que ainda não foram pegas mudam de lugar**, sorteadas de novo. As que já foram pegas continuam pegas.
- **Sem vidas:** você tem até **3 novas tentativas da fase em que está** (na Fase 2, recomeça a Fase 2). Cada nova tentativa recomeça a fase **do zero** (3 vidas, rações novas, tempo zerado) e custa **100 pontos**. Usadas as 3, só resta voltar ao menu.

## Pontuação
A pontuação da fase é: **100 por ração + 150 por osso + 100 por carteiro ou gato assustado (poder do osso) + 50 por bolinha (0.15.8) + bônus de tempo − pontos por vida perdida (50; 200 nas Fases 4 e 5; 250 nas Fases 6 a 8; 300 nas Fases 9 a 12; 325 a 400 nas Fases 13 a 20) − 100 por nova tentativa + bônus da missão (Fases 11 a 20)**. Ela **pode ficar negativa** (por exemplo, −50 ao perder a primeira vida sem ter pegado nenhuma ração).

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
- **Suas pontuações** (só você vê): sua pontuação total e a melhor de cada fase, **do bichinho escolhido** (0.17.0: cada bichinho tem as suas; veja **Bichinhos (0.17.0)**).
- **Ranking do jogo** (todos os jogadores do aparelho veem): ranking geral (pontuação total) e ranking de cada fase, **do bichinho escolhido**, com **apenas a melhor pontuação de cada jogador**.
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
O jogo lê `…/scores.json` e grava a melhor pontuação de cada jogador em `…/scores/<fase>/<jogador>.json` (só se for melhor que a que já está lá). Ao abrir **Pontuações**, ele também envia as melhores pontuações deste aparelho que o servidor ainda não tem. *(0.17.0: o servidor só recebe os recordes do **Cachorrinho**; os outros bichinhos mostram só o ranking deste aparelho.)*

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
- **Bichinho: 🐶 Cachorrinho · Trocar** (no alto, ao lado do jogador; 0.17.0): abre a tela **Escolha seu bichinho**. Tudo o que está abaixo (fases concluídas, pontuação total, jogo salvo, fases, pontuações) é do bichinho escolhido: veja **Bichinhos (0.17.0)**
- **Iniciar jogo** (e **Continuar jogo**, quando há um jogo salvo)
- **Jogar fases anteriores** (depois de concluir alguma fase): repete as fases já vencidas para melhorar o recorde de cada uma
- **Lojinha de skins** (0.15.9): troque os petscoin (1 por fase completada) por skins. A lojinha é única (veja *Lojinha única*): uma aba por jogo e, em cada jogo, uma aba por categoria (27 no total: o bichinho e os objetos das fases), cada uma liberada só depois que o jogador alcança a fase em que o objeto aparece; o saldo fica no alto e o botão Voltar fica sempre à vista
- **Como jogar**
- **Pontuações:** suas pontuações (só você) e o ranking do jogo (todos), do bichinho escolhido (*Pontuações do Cachorrinho*)
- **Escolher nome de usuário:** o nome pode ser o de um cachorrinho (ex.: Totó). Ele fica salvo para as próximas vezes. Ali também dá para **Criar conta** (com senha) e **Entrar**.

## Bichinhos (0.17.0)
O jogo passa a ter **vários bichinhos**, cada um com o **seu próprio jogo de 20 fases**. O **Cachorrinho** 🐶, o **Gatinho** 🐱 (0.18.0) e o **Passarinho** 🐦 (0.20.0) estão prontos; um bichinho cujos arquivos de fases não carregam aparece na tela de escolha como *Em breve*.

**Regras (decisão do dono do projeto):**
1. **Tudo é independente por bichinho:** pontuação, recordes, ranking, progresso (fases concluídas) e jogo salvo. Jogar um bichinho nunca mexe nos dados de outro.
2. **Qualquer bichinho pode ser escolhido a qualquer momento**, sem exigir nada dos outros (não é preciso terminar o Cachorrinho para jogar o Gatinho). **Dentro do mesmo bichinho** a fase N só abre quando a N−1 foi concluída.
3. **São únicos e compartilhados** por todos os bichinhos: a carteira de **petscoin** (1 petisco por fase concluída, em qualquer bichinho), a **lojinha de skins**, as **contas** (nome e senha) e os **jogadores**.
4. As **20 fases do Cachorrinho** continuam exatamente como estavam (mapas, números, regras e textos). A única frase dos textos dele que mudou é a do *Como jogar* que diz quais bichinhos estão prontos (o Gatinho e o Passarinho já estão).
5. Tudo o que já existia (progresso, recordes, ranking, jogos salvos, skins compradas) continua valendo como **Cachorrinho**, sem perder nada.

**Na tela:** no alto do menu, o botão **Bichinho: 🐶 Cachorrinho · Trocar** (44 px de altura, com rótulo para leitor de tela) abre a tela **Escolha seu bichinho**: um cartão por bichinho, com emoji, nome, uma frase e a situação *dele* para o jogador atual (*Fases concluídas: x/20 · Pontuação total: N*); o que ainda não existe fica desligado, com *Em breve*. Escolher volta ao menu e atualiza tudo: o rótulo do botão, *Fases concluídas* e *Pontuação total*, **Continuar jogo** (o jogo salvo daquele bichinho), a lista de fases (*Iniciar jogo* e *Jogar fases anteriores*) e as **Pontuações** (recorde pessoal, ranking e total do bichinho escolhido; o título cita o bichinho: *Pontuações do Cachorrinho*). A escolha é guardada **por jogador** (sem jogador vale só na memória; o padrão é o Cachorrinho); trocar de jogador, entrar ou sair da conta relê a escolha de quem ficou. A tela funciona com teclado (setas ↑ ↓ ← →, Enter, Esc), controle e toque, e cabe em 320×568, 360×640, 390×780, 740×390 e 1000×700 sem rolagem lateral; para o botão novo caber no menu (que já era apertado, sobretudo com jogo salvo), em telas baixas o menu ficou um pouco mais compacto (no celular deitado o botão perde o rótulo "Bichinho:" e os botões do menu ficam em 3 colunas) e, no celular pequeno em pé, *Continuar jogo* e *Iniciar jogo* dividem uma linha. O ranking compartilhado entre aparelhos (em stand by) só recebe os recordes do Cachorrinho por enquanto: das Pontuações de outro bichinho aparece só este aparelho.

**Modelo de dados** (`js/records.js`, com testes em `tests/records.test.js`): os ids são letras minúsculas (`dog`, `cat`, `bird`). `store.game(animal)` devolve o jogo daquele bichinho, com `addRun`, `personalBest`, `generalBest`, `ranking`, `totalScore`, `totalRanking`, `progress`, `completeLevel`, `saveGame`, `loadGame`, `hasGame` e `clearGame`; os métodos soltos da loja (`store.addRun`, `store.progress`, `store.saveGame`...) são os do Cachorrinho. `store.animal(nome)` e `store.setAnimal(nome, bichinho)` guardam a escolha por jogador. Como fica guardado (chave `cachorrinho.v1`): o **Cachorrinho fica no formato de sempre** (`bests[jogador].L`, `progress[jogador].unlocked/completed` e o jogo salvo com a chave `jogador` em `cachorrinho.save.v1`); os outros bichinhos usam campos novos: `bests[jogador].G[bichinho]` (fase → melhor), `progress[jogador].G[bichinho]` (`unlocked` e `completed`) e jogos salvos com a chave `jogador@bichinho`; `animal[jogador]` guarda a escolha (só existe quando não é o Cachorrinho). Dados da 0.16.1, sem nenhum desses campos, carregam como Cachorrinho; apagar a conta apaga os dados de todos os bichinhos. Em `js/game.js` há o registro `GAMES` (id, nome, emoji, frase, pronto, fases) e o helper `gs()` (= `store.game(bichinho escolhido)`): toda pontuação, progresso e jogo salvo passa por ele, e a partida em andamento usa o bichinho com que começou. `js/board.js` ganhou `localAll(bichinho)` (o ranking deste aparelho de cada bichinho); o servidor continua só do Cachorrinho.

**Cuidado com abas antigas:** a versão 0.16.1 não conhece os dados de outros bichinhos, a 0.17.0 não conhece as skins do Gatinho e a 0.19.0 ainda mostra o Passarinho como *Em breve*. Se uma aba ainda aberta na 0.16.1 gravar depois que existir dado de Gatinho (ou de outro bichinho), esses dados somem; e se uma aba ainda na **0.16.1 ou na 0.17.0 regravar a carteira** (por exemplo, ao comprar uma skin do Cachorrinho), ela **apaga as skins do Gatinho** compradas e em uso. Depois de atualizar, **recarregue todas as abas abertas do jogo** e não volte para essas versões.

**Como testar o encanamento com um bichinho de teste:** o Gatinho e o Passarinho já estão prontos no jogo de verdade (`js/cat-levels.js` e `js/bird-levels.js`). `window.__game.enableTestAnimal("cat")` é só um gancho dos testes: troca as fases do Gatinho por uma **cópia** das 20 do Cachorrinho, marcadas `placeholder` (e dá ao Passarinho, nas páginas de teste em que `js/bird-levels.js` é ignorado, uma cópia delas), e usa o mesmo motor de jogo; o jogo de verdade nunca o chama. Com ele, `node tests/e2e.js "0.17.0"` prova no navegador que concluir fases, bater recordes e salvar como Gatinho não muda nada do Cachorrinho (e o contrário), que o Gatinho só abre a Fase 2 depois de concluir a Fase 1 *dele* mesmo com o Cachorrinho na Fase 10, que a carteira de petscoin é uma só e que dados antigos viram Cachorrinho. `__game.animal`, `__game.setAnimal(id)` e `__game.games` também existem para os testes.

## Perfis por bichinho (0.18.0)
O motor (`js/game.js`) é um só para todos os bichinhos. Na 0.18.0 ele foi preparado para o **Gatinho** (e, na 0.20.0, o **Passarinho**) serem outro jogo de 20 fases **no mesmo motor**, sem mudar nada do Cachorrinho (as 20 fases dele, os números, os desenhos e os textos continuam exatamente iguais; a única frase que mudou é a do *Como jogar* que diz quais bichinhos estão prontos). O Gatinho está **pronto** (`ready: true`) quando `js/cat-levels.js` é carregado; sem esse arquivo ele cai nas fases de reserva e aparece como *Em breve*. O Passarinho é igual: fica **pronto** quando `js/bird-levels.js` é carregado e, sem ele, segue *Em breve*, sem fases.

**1. Fases por bichinho.** O registro `GAMES` (em `js/game.js`) tem uma entrada por bichinho com `levels` (as definições das 20 fases), `rev` (revisão dos mapas: jogos salvos de outra revisão são descartados com aviso) e `built` (as fases já montadas por `buildLevel`, montadas na primeira vez que alguém pede e refeitas se `levels` mudar). `builtOf(bichinho)` devolve `{ idDaFase: fase montada }` e `levelsOf(bichinho)` as definições. **Tudo o que depende das fases de uma partida passa por eles** com o bichinho da partida (`gameAnimal`) ou o escolhido no menu (`syncAnimal()`): jogo salvo (`snapshot` grava `mz` = revisão do bichinho; `parseSnapshot(sv, bichinho)` e `describeSave(sv, bichinho)` conferem contra as fases e a revisão *dele*), vitória, "Próxima fase", reforços (`from` de cada reforço), lista de fases, resumo do menu, começar, continuar e repetir uma fase. O ambiente (lugar) de cada fase vem de `Themes.of(fase, bichinho)` (`js/themes.js`): sem o 2º argumento, ou com `"dog"`, é exatamente o de sempre; para o Gatinho devolve os 20 ambientes de `CatThemes` (`js/cat-themes*.js`), para o Passarinho os 20 de `BirdThemes` (`js/bird-themes*.js`), e um bichinho sem ambientes próprios (ou se os arquivos faltarem) usa os do Cachorrinho. `LEVELS`/`LEVEL_IDS` continuam sendo as fases do Cachorrinho (o ranking compartilhado em stand by é só dele). O Gatinho usa as 20 fases de `js/cat-levels.js` (convertidas por `catDefFrom`, revisão `rev` 1) e o Passarinho as de `js/bird-levels.js` (convertidas por `birdDefFrom`, revisão `rev` 1). `CAT_LEVELS` (uma **cópia** das 20 do Cachorrinho com `placeholder: true`) é só o reserva, usado se esse arquivo faltar, e por `enableTestAnimal` nos testes do encanamento.

**2. Perfil de textos.** `js/profiles.js` (carregado antes do `game.js`; também roda no Node) tem `PROFILES`: um perfil por bichinho, com os **substantivos** (`noun`: `self`, `prey` = ração/ratinho, `power` = osso/novelo, `ball`, `foe`, `scared`, `foe2`), os nomes dos tipos de osso (`boneLabel`), os **reforços** (`reinforce[id] = { name, text }`), os efeitos (`effect`, `fx`), as **missões** (`mission`), os **avisos e frases** (`say`), a **derrota** (`lose`), o **placar** (`hud`: RAÇÕES, OSSOS, BOLINHAS, PODER e a leitura do poder), os **sons** (`sfx`: nome do som de cada momento, mais `alert2Every`/`alert2Near`, os intervalos do aviso do 2º inimigo; `""` = nenhum som), as **skins** (`skins`: `null` = o catálogo do bichinho; o Gatinho usa o `CatArt.SKINS`), os **avisos da lojinha** do próprio bichinho (`shop`: prévia, skin em uso, compra; a lojinha é única, então `ui.shopTitle` e `ui.shopHelp` ficam `null` e valem o título e a ajuda do index.html) e os **textos fixos do index.html** (`ui`: Como jogar, ajuda da lojinha e das pontuações, dica do nome, descrição do jogo e do controle, e a ajuda de teclas da pausa, `ui.pauseHelp`). O motor lê tudo por um acesso único e barato, `P()` (na partida vale o perfil do bichinho **da partida**; no menu, o do **escolhido**): `P().noun.prey.many`, `P().say.ballGot(50, 1, 3)`, `P().reinforce.speed.name`... **Sem `if (bichinho === "gato")` espalhado pelo código: o texto vem do perfil.** O perfil `dog` tem exatamente os textos de sempre (`tests/profiles.test.js` confere uma tabela de frases-chave e o `tests/e2e.js` centenas delas); o `cat` tem os mesmos campos com as palavras do gato (gatinho; ratinho no lugar da ração; novelo no lugar do osso, 150 pontos; cão no lugar do agente da carrocinha; cão afugentado no lugar do carteiro; camundongos ágeis no lugar das bolinhas; os cães rastreadores no lugar dos gatos inimigos (`noun.foe2` é `null`, porque os rastreadores também são "cães"; `say.foes` e `lose.foe2` têm frases próprias); reforços *Patas ágeis, Novelo poderoso, Vida extra, Coração maior, Pelo grosso, Cães lentos, Passos de veludo, Bigodes atentos* e *Chamado de petisco*); o `bird` também (passarinho; semente no lugar da ração; fruto no lugar do osso, 150 pontos; gato de quintal no lugar do agente da carrocinha; minhocas no lugar das bolinhas; o gavião como `noun.foe2`; reforços *Asas fortes, Fruto poderoso, Vida extra, Coração maior, Penas grossas, Gatos lentos, Voo silencioso, Olhar atento* e *Chamado de semente*; o FÔLEGO e o ESTADO do placar em `hud`; `ui.runLabel` = *Voar*). Os textos fixos são aplicados ao trocar de bichinho (`applyMenuUi` no menu, `applyGameUi` ao começar uma fase) e, no Cachorrinho, `ui.*` é `null`: a página fica como veio no `index.html`.

**3. Campos de fase para recursos novos.** `buildLevel` aceita campos opcionais na definição da fase, **desligados** (`null`) em todas as fases do Cachorrinho: `sprint` (fôlego da arrancada), `water` (poças que molham o pelo e deixam o gato lento), `refuge` (lugares altos onde os cães não alcançam), `night` (fase noturna) e `catMode` (os símbolos `X`, `T`, `~` e `R` do mapa do gato). O Gatinho liga `sprint` nas 20 fases, `water` só nos mapas com `~`, `refuge` só nos mapas com `T` e `night` nas Fases 18 e 19. O Passarinho liga também `birdMode` (os símbolos `M`, `G`, `H` e o vento), `flight` (o voo alto do fruto comum) e `wind` (as correntes de vento), com `sprint` como o bater de asas e `refuge` como o galho (veja *Passarinho (0.20.0)*). As mecânicas estão descritas em *Mecânicas do Gatinho (0.18.0)*; os pontos de entrada são `updateSprint(dt)` e `updateWater(dt)` (chamadas em `update()` só quando a fase liga o campo); o desenho dos obstáculos, lugares altos e poças é feito pelo ambiente do Gatinho (veja *Desenhos do Gatinho*).

**Como o Passarinho entra:** (a) em `js/profiles.js` o perfil `bird` (uma cópia do bloco `cat` com os textos dele) está registrado em `PROFILES` (`node tests/profiles.test.js` exige as mesmas chaves e tipos do `dog`); (b) em `js/game.js` a entrada `bird` de `GAMES` recebe as `levels` convertidas por `birdDefFrom` (e o `rev`) e fica `ready: true` quando `js/bird-levels.js` é carregado, senão segue *Em breve*; (c) `BY_ANIMAL.bird` em `js/themes.js` aponta para `BirdThemes` e o perfil tem `sfx` próprios; (d) os campos de fase `sprint`, `refuge`, `birdMode`, `flight` e `wind` ligam as mecânicas dele. Um bichinho sem perfil usa o do Cachorrinho.

**Quem escolhe um bichinho sem nome (0.18.0):** se alguém escolhe o Gatinho *antes* de ter um nome de jogador, toca em Iniciar jogo e digita um nome (ou cria uma conta, ou entra), a partida é do **Gatinho escolhido**, e a escolha fica guardada no nome do jogador, se ele ainda não tinha uma guardada (quem já tem a sua mantém a dela). Antes isso começava o Cachorrinho. O bichinho padrão (`DEFAULT_ANIMAL`, `"dog"`) é definido em `js/records.js` e exportado (`Records.DEFAULT_ANIMAL`); o `js/board.js` e o `js/game.js` usam esse. O `js/profiles.js` tem a sua própria cópia do valor (`"dog"`), porque é carregado antes e não depende do `Records`.

### Desenhos do Gatinho (0.18.0)
`js/cat-art.js` (módulo `window.CatArt`, também `require` no Node) tem **só os desenhos** do Gatinho, no mesmo estilo do jogo (vista de cima em 3/4, formas simples no canvas, sombra suave, caixa de contato 24×24, desenho de ~30–36 px). Não depende do `js/game.js`: cada função recebe o `ctx` e parâmetros explícitos, é determinística (sem `Math.random` nem relógio; usa posição, `idx` e o `time` passado), não lança erro com parâmetros ausentes e, com `o.calm` (reduzir movimento), desenha **a mesma imagem em qualquer instante** (as pernas de quem anda seguem a posição). O que é desenho de gato ou de cão aqui é **escolha de design** (nada de raça, nada verificado em artigo).
- `drawCat(ctx, p, o)`: o gatinho. `p = { x, y, w, h, facing: "left"|"right"|"up"|"down", moving }` (mesma caixa do cachorrinho); `o = { gr: 0..1 (0 filhote, 1 adulto), skin, still, time, calm, wet: 0..1, sprint, safe, hiss }`. Filhote tem corpo menor, cabeça e olhos maiores, orelhas grandes e rabo curto; molhado escurece e cola o pelo, pinga e fica mais pesado; arrancada estica o corpo e põe as orelhas para trás; a salvo fica um pouco maior com a sombra mais longe; `hiss` eriça o pelo (rabo em escova, boca aberta).
- `SKINS` / `skinById(id)`: as 12 skins, **só visuais** (`{ id, name, text, price }`, preços de 10 a 50 e a padrão grátis): Rajado, Preto, Branco, Cinza, Laranja, Siamês, Van Turco, Tricolor, Smoking, Pirata, Astronauta e Super-gato. Nenhuma muda tamanho de contato nem atributo.
- `drawDog(ctx, d, o)`: o cão inimigo. `d = { x, y (centro), dir: -1|1, mode: "patrol"|"chase"|"flee"|"search"|"idle", kind: "guard"|"tracker", size: "small"|"medium"|"large", frozen, slow, idx }`, `o = { time, calm }`. `guard` é robusto, de orelhas caídas e coleira vermelha; `tracker` é esguio, de focinho e orelhas longas e coleira azul; `idx` escolhe uma de 4 pelagens. Afugentado: rabo entre as pernas, orelhas para trás, cor desbotada e estrelinhas; perseguindo: boca aberta; congelado: azulado.
- `drawMouse(ctx, it, o)` (ratinho, `it = { x, y, variant: 0..2 }` com o canto do item 16×16), `drawAgileMouse(ctx, b, o)` (camundongo ágil, `b = { x, y, vx, vy, hue }`, `o.r`; corre esticado na direção de `vx, vy` e congela com `|v| < 8`), `drawYarn(ctx, it, o)` (novelo, `kind`: `scare|gold|ice|turbo|magnet`; cada tipo tem cor e uma marquinha própria), `drawPost(ctx, x, y, {kind: "guard"|"tracker"})` (casinha ou almofada com tigela, ~40 px), `drawFx(ctx, kind, x, y, t, o)` (`splash|shake|dust|hiss|sparkle|wetdrop`, `t` de 0 a 1) e `growthStage(gr)` (`filhote` < 0,34, `jovem` < 0,67, `adulto`, o mesmo corte do cachorrinho).

**Integrado ao jogo (0.18.0).** Os desenhos e os ambientes do Gatinho aparecem no jogo de verdade; tudo isto só roda quando a partida é do Gatinho (`catDraw` em `js/game.js`) e o Cachorrinho desenha **exatamente como antes** (os 20 ambientes, o cachorrinho, os agentes, os gatos, as rações, os ossos, as bolinhas e as vans não mudaram nenhum pixel):
- **Ambientes.** `Themes.of(fase, "cat")` devolve `CatThemes.of(fase)` (se `js/cat-themes*.js` faltar, cai no ambiente do Cachorrinho). `drawCatTiles` desenha o **chão em todos os tiles** e, por cima, `#` (`wall`), `X` (`crate`), `T` (`high`) e `~` (`water`). O objeto `g` tem o contrato de `js/cat-themes.js`: `g.kind(c, r)` (o caractere do mapa; `"#"` fora do mapa), `g.time` (o relógio do jogo; 0 com "reduzir movimento"), `g.border`, `g.solid`, `g.h`, `g.free` e `g.mass(c, r)` (tamanho da mancha de paredes ligadas, sem o anel de fora: é o que faz a mancha enorme da **Fase 9 ser um lago inteiro** e as pequenas serem arbustos). `place`, `blurb`, `rail` e `night` do ambiente alimentam o nome do lugar nas telas, a cor dos trilhos e a noite.
- **Personagens.** O gatinho (`CatArt.drawCat`, com o mesmo crescimento filhote → adulto do cachorrinho, afinando na arrancada, escurecendo molhado, maior a salvo e de pelo eriçado com o poder do novelo; o piscar da proteção deixa o gatinho meio transparente), os cães de guarda e rastreadores (`drawDog`: `idle`/`patrol`/`chase`/`search`/`flee`, congelado, afugentado, tamanho por fase: pequenos nas Fases 1 a 3, médios de 4 a 12, grandes de 13 a 20), os ratinhos (`drawMouse`), os camundongos ágeis (`drawAgileMouse`), os novelos (`drawYarn`) e os postos dos cães no lugar das vans (`drawPost`: casinha para o cão de guarda, almofada para o rastreador). Os "!" e as setas de perseguição continuam como eram.
- **Efeitos curtos** (`drawFx`, no máximo 24 ao mesmo tempo): `splash` ao pisar numa poça, `wetdrop` pingando enquanto anda molhado, `shake` ao secar, `dust` na arrancada, `hiss` ao pegar o novelo comum e `sparkle` ao pegar um ratinho, um novelo ou um camundongo.
- **Noite (Fases 18 e 19).** Um gradiente radial (um por quadro) escurece o campo com um halo de 5 tiles em volta do gatinho, depois do mundo e antes dos "!" e das setas. O escuro é de 75% no máximo: cães e camundongos longe do halo continuam à vista. Com "reduzir movimento" o halo não pulsa; em pausa, vitória e derrota o escuro some.
- **Telas.** O título da aba é "Jogo do gatinho" (`ui.docTitle` do perfil), o cartão do Gatinho na escolha de bichinho mostra o gatinho desenhado (o emoji continua no elemento, escondido) e a prévia da lojinha desenha o gatinho com cada skin do gato (a lista de skins da lojinha são as 12 de `CatArt.SKINS`; o gatinho do jogo usa a skin em uso da carteira, e `__game.catSkin` continua existindo para os testes e as capturas trocarem a skin até a próxima leitura da carteira).
- **Ganchos de teste** em `window.__game`: `drawNow()` (desenha um quadro agora), `catDraw`, `catFx` e `catSkin`; e, para as skins dos objetos (0.19.0), `look(categoria)` (a skin em uso da categoria, ou a padrão), `setLook(categoria, id)` (troca a skin em uso sem mexer na carteira; id vazio volta à padrão) e `skinPreview(categoria, canvas, id)` (desenha no canvas o mostruário da lojinha daquela skin; `false` se a categoria não tem mostruário). `tests/ab-dog.js` (`node tests/ab-dog.js <pasta-do-código> [fases]`) imprime o hash do canvas do Cachorrinho (mesma semente, mesmos passos) para comparar duas versões do código.
- **Ver o jogo do Gatinho:** `node tools/cat-preview/shoot-game.js <pasta-de-saída>` (Playwright; `PREVIEW_LOCK=<arquivo>` para usar `flock`; opções `fases=1,9`, `tam=desktop,celular,deitado`) abre as 20 fases reais, enquadra o gatinho (perto de X, em cima de T, na poça, na arrancada, eriçado, com cães e com as skins preta e branca) e salva uma folha por fase (`folha-NN.png`), a tela inteira (`tela-NN-<tamanho>.png`) e duas folhas de contato (`geral-1.png`, `geral-2.png`). Testes: `node tests/e2e.js "Gatinho: desenho e ambientes"`.

**Prévia e teste:** `node tests/cat-art.test.js` (Node puro, com um `ctx` de mentira que confere métodos, números, cores, `save/restore`, o `calm`, o determinismo, as 12 skins e as caixas de tamanho). Para **ver** os desenhos, `tools/cat-preview/art.html` desenha folhas (`?sec=cat-adulto|cat-filhote|cat-jovem|skins1|skins2|dogs|dogs2|items|fx|real&bg=green|dark&z=3`) e `node tools/cat-preview/shoot-art.js <pasta> [seções] [fundos]` tira as capturas com o Playwright (`CHROMIUM_PATH` e `NODE_PATH` como nos outros testes; `PREVIEW_LOCK=<arquivo>` reexecuta sob `flock`, para não abrir dois navegadores juntos).

## Mecânicas do Gatinho (0.18.0)
As 20 fases do Gatinho (`js/cat-levels.js`, `window.CatLevels`) rodam no **mesmo motor** do Cachorrinho. Tudo o que é novo fica atrás de campos da fase que só o Gatinho liga (`sprint`, `water`, `refuge`, `night`, `catMode`): o Cachorrinho continua exatamente como era (a suíte inteira passa igual, e o jogo salvo dele não ganha nenhum campo). **Todos os números abaixo são escolha de design, sem fonte científica verificada** (a rede do ambiente bloqueia artigos; nada aqui é citado como biologia).

**Adaptador (`catDefFrom(c)` em `js/game.js`).** Converte uma fase de `CatLevels` numa definição para a `buildLevel`. Do mapa do gato vêm `id`, `title`, `map`, ratinhos (`rations`), novelos (`bones`, `boneMix`), camundongos (`balls`), `extraLives`, `note` e a velocidade do gatinho (`catSpeed` = `dogSpeed`: Fase 1 ×0,8, Fase 3 ×0,9, as outras ×1 de 252 px/s). Da fase do Cachorrinho que ela imita (`like`) vêm as **regras e a dificuldade**: a configuração do agente `vets[0]` repetida pelo número de `V` do mapa (a Fase 18 do gato tem 7 cães e a do Cachorrinho 8 agentes), `alertTiles`, `lifePenalty`, `minPoints`, `bonePower`, `lifeCap`, `mission`, `missionBonus`, `bonusStep`, `blockEvery`, `crush`, `touchEase`, `respawnInPlace` e `cat` (a configuração dos gatos, que serve aos **rastreadores**). Os `R` do mapa viram `cats: [[coluna, linha]]` (a célula vira chão); não há peças móveis. Com o arquivo carregado o Gatinho fica **pronto** (`ready: true`, `placeholder: false`, revisão dos mapas `rev` 1); sem ele (ou se alguma fase for inválida, com um aviso no console) segue com as fases de teste copiadas do Cachorrinho e desligado. O `index.html` carrega `js/cat-levels.js` antes do `js/game.js`.

**Símbolos do mapa (só com `catMode`).** `#` parede sólida para todos. `X` (obstáculo baixo) e `T` (lugar alto) são sólidos para os **cães e rastreadores** (fora do `walk` deles) mas o **gatinho os atravessa** (não entram nos sólidos dele; só param os camundongos); sobre um `X` o gatinho anda a **85%** (pulo suave; o som `jump` toca ao começar a atravessar, veja *Sons do Gatinho*) e **o `X` não protege**: o cão (ou rastreador) em perseguição vai ao tile andável cujo centro está mais perto de onde o gatinho está de verdade (em pixels) e o alcança dali (alcance de 34 px). Limite conhecido: no meio de um bloco de `X` com 2 tiles de largura ou mais, ou na quina entre dois `X`, pode não haver centro de tile andável a 34 px (nos 20 mapas, cerca de 1 em cada 6 posições possíveis sobre um `X`); ali um cão parado não alcança, mas um cão que passa andando por perto sim. Só o `T` protege. `~` (poça) é chão normal para todos. `R` é o posto de um rastreador. Ratinhos, novelos e camundongos só nascem em `.` do grafo dos cães (nunca em `X`, `T`, `~`, saída, início ou posto), com o mesmo sorteio por semente de sempre. A saída `E` pode ser vertical (nas bordas esquerda e direita) ou horizontal: o gatinho não sai do mundo e a palavra SAÍDA gira na vertical.

**Arrancada com fôlego (`sprint`).** Segurar **Shift** ou **Espaço** (teclado), **A**, **RB** ou **RT** (controle) ou o botão **Correr** (toque; só aparece nas fases do Gatinho) faz o gatinho andar ×**1,35** enquanto ele se move e tem fôlego. O fôlego (0 a 1) gasta **0,4/s** (**2,5 s** de tanque cheio) e, sem arrancada, volta a **0,2/s** (5 s), parado ou andando. Quando chega a 0 o gatinho fica **ofegante 1,5 s** (sem arrancada) e depois volta a poder. **Molhado = sem arrancada.** O **novelo turbo** deixa a arrancada sem gasto de fôlego pelos 8 s do efeito (+4 s por nível do reforço Novelo poderoso) e a velocidade **multiplica**: o ×1,4 do turbo vezes o ×1,35 de bater asas (cerca de ×1,9 batendo asas). No placar: a barra **FÔLEGO** (`#hud-stamina`, `role="progressbar"`) e o **ESTADO** (`A SALVO`, `MOLHADO n s`, `OFEGANTE`; molhado e ofegante impedem a arrancada do mesmo jeito, então com os dois o estado diz só `MOLHADO` e a barra continua vermelha; o lugar do estado é reservado para o pior caso, `A SALVO · MOLHADO 6 s`, e o placar e o campo não mudam de tamanho no meio da partida). Ao perder uma vida o gatinho renasce com fôlego cheio e pelo seco.

**Pelo molhado (`water`).** O centro do gatinho numa poça define **6 s** de pelo molhado (renova enquanto ele estiver nela): ×**0,65** de velocidade e sem arrancada; seca 6 s depois de sair. Os cães não se molham. (O gatinho sacode o pelo ao secar (desenho e som `shake`, veja *Desenhos do Gatinho* e *Sons do Gatinho*).)

**Lugar alto (`refuge`).** Com o centro do gatinho num `T` ele fica **a salvo**: cão nenhum nem rastreador o pega (o contato não tira vida e a fase não dá derrota por isso). Os que estão perseguindo vão até o tile alcançável mais perto do `T`, **esperam até 4 s** (nunca andam por cima do `T`) e **desistem** (voltam a patrulhar, descansando); depois de desistir só voltam a perseguir quando o gatinho descer. Em cima não há limite de tempo, mas o relógio e o bônus de tempo continuam. Ao descer **não há proteção nenhuma**.

**Camundongos ágeis, novelos e rastreadores.** Os camundongos são as "bolinhas" do motor (disparam quando o gatinho chega a 3 tiles, rolam, quicam nas paredes, `X` e `T`; +50), com os nomes do perfil. Os novelos são os ossos: o comum dá o poder (30 ou 35 s) em que cães e rastreadores ficam **afugentados** e fogem (+100 por cão, uma vez por poder); ouro = escudo, gelo = congela, turbo = fôlego livre + ×1,4, ímã = puxa os ratinhos. Os **rastreadores** (`R`) usam a IA dos gatos inimigos do Cachorrinho (ouvem, antecipam, procuram), mas andam no mesmo chão dos cães (**não pulam** `X` nem `T`) e **não miam**; contam como inimigos na colisão e nos poderes.

**Noite (`night`, Fases 18 e 19).** Só o estado: `lv.night = { darkness: 0,75, halo: 5 }` e `__game.darkness` (0 nas outras fases e no Cachorrinho). O desenho que escurece com um halo de 5 tiles em volta do gatinho está em *Desenhos do Gatinho*.

**Jogo salvo.** O do Gatinho guarda `sta` (fôlego), `wet` (s de molhado) e `wnd` (s de ofegante) além do de sempre, e a revisão `mz` 1; um salvo sem esses campos carrega com fôlego cheio e pelo seco, e valores fora dos limites são recusados. O do Cachorrinho continua com exatamente os campos de sempre.

**Telas pequenas e leitor de tela (auditoria 3).** (a) *Clique que atravessa* (vale para os dois bichinhos): se a pausa, a vitória ou a derrota abre com um dedo ainda apoiado no controle direcional ou no botão Correr, o navegador clicava, quando o dedo levantava, no botão da tela que ficou embaixo dele (por exemplo "Voltar ao menu", perdendo o reforço); agora os cliques de ponteiro ficam ignorados por 400 ms depois que esse dedo levanta (sem dedo apoiado nada muda, e o clique do teclado nunca é ignorado). (b) Em campo estreito (menos de 340 px, celular pequeno em pé) o aviso de começo de fase do Gatinho é curto (só os cães e o aviso do primeiro passo; a meta de pontos está no placar e a missão na faixa do alto): em 320×568 ele ocupa 36% do campo nas Fases 11 a 20, em vez de 66%. (c) O placar reserva o lugar do pior caso do estado (`A SALVO · MOLHADO 6 s`) e uma linha de altura: com A SALVO, MOLHADO e OFEGANTE o placar e o campo não mudam de tamanho. (d) Com o botão Correr na tela, a dica "gire o aparelho" ganha um recuo à direita para ele não cobrir o fim dela. (e) A tela de vitória do Gatinho usa " + cães: N" (e não "cães afugentados") na soma e um espaço menor entre as linhas em telas baixas, para caber sem rolar. (f) Uma região `#hud-state-live` (`role="status"`, `aria-live="polite"`, fora da vista) diz o estado do gatinho quando ele muda ("Estado do gatinho: a salvo e molhado"), sem repetir a contagem do `MOLHADO n s`, e inclui o OFEGANTE que o texto do placar omite enquanto ele está molhado.

**Testes.** `node tests/e2e.js "Gatinho: mecânicas"` (adaptador e regras copiadas das 20 fases, símbolos, arrancada por teclado, controle simulado e toque, fôlego, molhado, lugar alto, X sem proteção, camundongos, novelos, rastreadores, noite, jogo salvo, e um robô que **joga as 20 fases de verdade** até a vitória). `node tests/e2e.js "Gatinho: correções da auditoria"` confere que o `X` não é abrigo (guarda e rastreador chegam e tiram vida; sobre o `T` continua a salvo; um robô alterna `X` e `T` por 60 s nas Fases 3, 9, 13, 18 e 20), o botão Correr depois da pausa e os textos do Gatinho. As seções antigas do `tests/e2e.js` abrem as páginas sem o `js/cat-levels.js` (testam o encanamento com as fases de teste); as desta seção usam `newPage({ realCat: true })`. Ganchos de teste de `window.__game`: `defineCatLevels(lista)` / `catLevels()`, `catDefFrom(c)`, `buildLevel(def)` e os estados `stamina`, `winded`, `wet`, `sprinting`, `safe`, `darkness`. `enableTestAnimal("cat")` continua dando ao Gatinho as fases de teste copiadas do Cachorrinho.

## Tabela das fases do Gatinho (0.18.0)
Cópia técnica da tabela que é entregue ao dono a cada versão (conferida por um teste: `node tests/e2e.js "tabela das fases do Gatinho"`). O Gatinho tem as suas **20 fases próprias**; pontos mínimos, vidas, perda por vida, missões e bônus seguem a rampa do Cachorrinho, e as velocidades dos cães de guarda e dos rastreadores são as dos agentes e dos gatos do Cachorrinho da fase equivalente. O gatinho anda a 252 px/s × o fator da fase (filhote 0,8 na Fase 1, 0,9 na Fase 3) e a arrancada multiplica por 1,35. Ratinho = 100 pontos, novelo = 150, camundongo ágil = 50, cão afugentado = 100.

| Fase | Ambiente | Mapa | Condição para avançar | Cães de guarda | Rastreadores | Ratinhos | Novelos | Camundongos | Velocidade dos cães (sem ! / com !) | Velocidade dos rastreadores (anda / persegue) | Velocidade do gatinho | Vidas máx. | Perda por vida | Missão | Bônus da missão | Noite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sala de estar | 25×18 | pegar tudo | 1 | — | 5 | — | — | 55 / 110 | — | 201,6 | 5 | 50 | — | — | — |
| 2 | Cozinha e despensa | 25×18 | pegar tudo | 2 | — | 7 | 2 | 1 | 60,5 / 121 | — | 252 | 5 | 50 | — | — | — |
| 3 | Quintal dos fundos | 25×18 | pegar tudo | 2 | — | 7 | 2 | 1 | 66,55 / 133,1 | — | 226,8 | 5 | 50 | — | — | — |
| 4 | Jardim e varal | 41×29 | 800 pontos | 3 | — | 15 | 2 | 2 | 73,21 / 146,41 | — | 252 | 5 | 200 | — | — | — |
| 5 | Telhados e muros | 41×29 | 1000 pontos | 3 | — | 20 | 2 | 2 | 73,21 / 146,41 | — | 252 | 5 | 200 | — | — | — |
| 6 | Beco da cidade | 49×33 | 1250 pontos | 3 | — | 24 | 3 | 3 | 76,14 / 152,27 | — | 252 | 5 | 250 | — | — | — |
| 7 | Feira livre | 49×37 | 1400 pontos | 4 | — | 28 | 3 | 3 | 79,07 / 158,12 | — | 252 | 5 | 250 | — | — | — |
| 8 | Peixaria e mercado | 55×39 | 1650 pontos | 5 | — | 32 | 4 | 3 | 82 / 163,98 | — | 252 | 5 | 250 | — | — | — |
| 9 | Parque e lago | 55×39 | 1800 pontos | 5 | — | 36 | 4 | 3 | 84,92 / 169,84 | — | 252 | 5 | 300 | — | — | — |
| 10 | Armazém de grãos | 55×41 | 2050 pontos | 6 | — | 40 | 5 | 3 | 87,85 / 175,69 | — | 252 | 5 | 300 | — | — | — |
| 11 | Celeiro e curral | 57×41 | 2300 pontos + missão | 5 | 2 | 44 | 5 | 4 | 89,32 / 178,62 | 130 / 200 | 252 | 6 | 300 | todos os novelos | 200 | — |
| 12 | Horta e galinheiro | 57×41 | 2450 pontos + missão | 5 | 3 | 46 | 5 | 4 | 90,78 / 181,55 | 132 / 203 | 252 | 6 | 300 | 34 ratinhos | 250 | — |
| 13 | Borda da mata | 57×43 | 2650 pontos + missão | 6 | 3 | 48 | 6 | 4 | 92,24 / 184,48 | 134 / 205 | 252 | 7 | 325 | 36 ratinhos | 300 | — |
| 14 | Riacho e pedras | 57×43 | 2800 pontos + missão | 6 | 4 | 50 | 6 | 4 | 93,71 / 187,4 | 135 / 208 | 252 | 7 | 325 | todos os novelos | 350 | — |
| 15 | Vila de pescadores | 59×43 | 3000 pontos + missão | 6 | 4 | 52 | 6 | 4 | 95,17 / 190,33 | 137 / 211 | 252 | 8 | 350 | 40 ratinhos | 400 | — |
| 16 | Docas do porto | 59×45 | 3200 pontos + missão | 7 | 5 | 54 | 7 | 5 | 96,64 / 193,26 | 139 / 214 | 252 | 8 | 350 | 44 ratinhos | 450 | — |
| 17 | Praia e dunas | 61×45 | 3400 pontos + missão | 7 | 5 | 56 | 7 | 5 | 98,1 / 196,19 | 141 / 216 | 252 | 9 | 375 | todos os novelos + 40 ratinhos | 500 | — |
| 18 | Telhados à noite | 61×45 | 3600 pontos + missão | 7 | 6 | 58 | 7 | 5 | 99,57 / 199,12 | 143 / 219 | 252 | 9 | 375 | 46 ratinhos | 550 | sim |
| 19 | Mercado à noite | 61×45 | 3800 pontos + missão | 8 | 6 | 60 | 8 | 5 | 101,03 / 202,05 | 144 / 222 | 252 | 10 | 400 | todos os novelos + 48 ratinhos | 600 | sim |
| 20 | A casa grande | 63×47 | 4000 pontos + missão | 8 | 7 | 62 | 8 | 5 | 102,49 / 204,97 | 146 / 224 | 252 | 10 | 400 | todos os novelos + 52 ratinhos | 650 | — |

## Biologia por trás do Gatinho (0.18.0)

**Situação das fontes (leia primeiro).** A regra do projeto é que cada característica de um bichinho tenha por base **artigos científicos revisados por pares, de periódicos reconhecidos, publicados entre out/2021 e out/2026, abertos e conferidos** antes de serem citados aqui. Durante a construção do Gatinho (22 e 23/10/2026) a **rede do ambiente de desenvolvimento bloqueou todos os sites de artigos** (PubMed Central, Europe PMC, doi.org, Nature, MDPI, PLOS, Frontiers, ScienceDirect, Springer...), e só a busca na web funcionou, devolvendo resumos. Por isso **nenhum artigo foi aberto e nada abaixo está verificado**: **todo traço do Gatinho é uma "escolha de design"** e só onde a tabela abaixo indica há uma **pista de literatura, não verificada** (a arrancada e o pelo molhado não têm nem pista). As pistas que a busca achou (autores, ano, periódico, o que o resumo diz, lacunas e descartados) estão em [`docs/pesquisa-gatinho/`](docs/pesquisa-gatinho/LEIAME.md) com a lista de quais abrir primeiro; **quando houver acesso, elas serão abertas e conferidas, e só o que for confirmado será citado aqui**.

Regras que valem sempre: só traços **genéricos do gato doméstico** (nunca de raça: nenhuma raça nem skin tem vantagem; as skins são só visual e podem ter nome de raça); os **sons** são genéricos e só mudam com a **fase da vida** (filhote → jovem → adulto).

| Traço no jogo | O que o jogo faz | Pistas (não verificadas) | Situação |
|---|---|---|---|
| Presas: ratinhos e camundongos ágeis | o gatinho coleta ratinhos (parados) e camundongos que disparam e congelam; passarinhos e lagartixas não aparecem | dieta e presas de gatos de vida livre (R1) | escolha de design |
| Ambientes das 20 fases | casa, quintal, jardim, telhados, beco, feira, peixaria, parque, armazém, celeiro, horta, mata, riacho, vila de pescadores, docas, praia, telhados e mercado à noite, casa grande | uso do espaço por gatos (GPS) e ratos em galpões (R5) | escolha de design (vários sem pista) |
| Arrancada com fôlego | ×1,35 de velocidade por ~2,5 s; recupera em ~5 s; ofega 1,5 s | nada recente achado (lacuna, R3) | escolha de design |
| Pelo molhado | pisar numa poça deixa o gatinho ×0,65 de velocidade, sem arrancada, por ~6 s | só análogos de outros mamíferos; nada de gato (lacuna, R3) | escolha de design |
| Lugar alto (T) | o gatinho fica a salvo em cima; cães esperam até 4 s e desistem | gatos preferem lugares altos e esconderijos (R4) | escolha de design |
| Obstáculo baixo (X) | só o gatinho pula | agilidade e frestas (R3) | escolha de design |
| Cães como inimigos | cães de guarda patrulham; rastreadores ouvem e seguem o rastro | convivência cão-gato (R4); fuga do gato ao cão: lacuna | escolha de design |
| Novelo: brinquedo e poder | o novelo vale 150 pontos e o comum "eriça o pelo" e afugenta os cães | brincar com objetos (R4); fio e novelo soltos podem ser um risco para gatos (corpo estranho linear; precaução, não verificada) | o poder é pura escolha de design |
| Sons | miado de filhote/jovem/adulto, ronronar (pulsos de ~26 Hz), chiado, guincho de rato (~3,5 kHz), latido e rosnado do cão, miado de susto, pulo, poça, sacudir o pelo, arrancada, fôlego | bioacústica (R2) | escolha de design |
| Noite (Fases 18 e 19) | escurece com um halo em volta do gatinho | atividade crepuscular e noturna (R1, R5) | escolha de design |

**Cuidado na vida real (escolha de design / precaução; não verificado):** o novelo do jogo é só uma brincadeira de computador. Fio, linha e novelo soltos podem ser perigosos para gatos se forem engolidos: por precaução, não deixe o gato brincar com eles sem supervisão.

## Passarinho (0.20.0)
Na Atualização 5 o **Passarinho** 🐦 passa a ter o **seu próprio jogo de 20 fases** (`js/bird-levels.js`, `window.BirdLevels`), no **mesmo motor** do Cachorrinho e do Gatinho. Ele é um passarinho **genérico** (nenhuma espécie, nenhuma raça): pega **sementes**, **frutos** e **minhocas**, foge dos **gatos de quintal** e, a partir da Fase 11, dos **gaviões**. A novidade é o **voo**: normalmente o passarinho voa baixo e os **muros** dos labirintos o seguram, mas o **fruto comum dá o voo alto** por 10 segundos, e com ele o passarinho **passa por cima dos muros** (sem pular a fase: a saída continua pedindo os pontos e a missão). Tudo o que é novo fica atrás de campos de fase que só o Passarinho liga (`birdMode`, `flight`, `wind`; o bater de asas e o galho reaproveitam o `sprint` e o `refuge` do Gatinho): o Cachorrinho e o Gatinho continuam **exatamente** como eram (as 20 fases de cada um, as regras, os desenhos, os sons e os jogos salvos), o que os testes lado a lado de pixels (`tests/ab-dog.js`) e de sons (`tests/ab-sounds.js`) e os quadros fixos do Gatinho (`tests/skins-cat-frame.js`, usados pelo `tests/e2e.js`) conferem. **Todos os números abaixo são escolha de design, sem fonte científica verificada** (a rede do ambiente de desenvolvimento bloqueou os artigos; veja *Biologia por trás do Passarinho*).

### Quem faz o quê
| Papel | No Gatinho | No Passarinho |
|---|---|---|
| Item parado (100 pontos) | ratinho | **semente**: parada, sorteada em chão livre, em 3 desenhos |
| Item de poder (150 pontos) | novelo | **fruto**: o comum dá o **voo alto**; nas Fases 11 a 20 há também o **dourado** (escudo), o de **ar frio** (congela os inimigos), o de **rajada** (mais veloz e sem cansar) e o **ímã** (puxa as sementes) |
| Item ágil (50 pontos, a partir da Fase 2) | camundongo ágil | **minhoca**: dispara quando o passarinho chega perto |
| Inimigo do chão | cão de guarda | **gato de quintal**: patrulha; com o **!** persegue mais rápido |
| Inimigo a partir da Fase 11 | cão rastreador | **gavião**: voa, ouve de longe, antecipa e procura |
| Quem foge com o poder (+100 por inimigo) | os cães | **ninguém**: no voo alto os gatos esperam ao pé do passarinho e desistem, sem pontos |
| Obstáculo baixo `X` | só o gatinho passa (a 85% da velocidade) | só o passarinho e o gavião passam (o passarinho sem perder velocidade); os gatos não |
| Abrigo | `T` lugar alto | `G` **galho** |
| Terreno especial | `~` poça (molha o pelo) | `>` `<` `^` `v` **vento** (empurra o passarinho) |
| Fôlego | arrancada (**Correr**) | **bater asas** (**Voar**) |
| Parede de labirinto | `#` | `M` **muro voável** (o voo alto passa) e `#` parede sólida sempre |
| Posto dos inimigos | casinha ou almofada | moita (gato de quintal) e galho alto (gavião) |
| Saída | a porta | **o ninho** (3 tiles na borda) |
| Fase da vida | miado de filhote, jovem e adulto | **piu** de filhote, jovem e adulto |

### Voo baixo e voo alto
- **Voo baixo (o normal).** O passarinho anda como os outros bichinhos. Passa sobre os `X` (cerca baixa, pedra, arbusto, rede) **sem perder velocidade** e fica a salvo em cima dos `G`; os muros `M` e as paredes `#` o seguram, como seguram os gatos.
- **Voo alto (o fruto comum).** Pegar o fruto comum liga o **voo alto por 10 s** (**+2 s por nível** do reforço *Fruto poderoso*: 12, 14, 16 e 18 s). Com ele o passarinho passa **por cima dos muros `M`**; as paredes `#` (as bordas do mundo, as rochas, os troncos, as construções altas) continuam sólidas. Ele aparece **maior e mais alto**, com a **sombra afastada** no chão, e o placar mostra **VOO ALTO** (o PODER, com os segundos). Som `soar` ao começar e `soarend` ao acabar.
- **Os gatos de quintal não o alcançam.** Os que estão perseguindo vão ao pé do passarinho, esperam **até 4 s** e **desistem** (voltam a patrulhar, descansando). Ninguém foge e **não há pontos** por isso (o voo alto não "afugenta" como o osso e o novelo).
- **O gavião não é detido.** Ele voa na mesma altura: o voo alto protege dos gatos, **não do gavião**. Só o galho segura o gavião.
- **Aviso e pouso seguro.** Nos **últimos 2 s** o passarinho **pisca**, o placar diz **VOO ACABANDO** e uma frase avisa. Se o voo alto acaba com o passarinho **em cima de um muro**, ele **pousa** no chão livre mais perto, **sem perder vida** (e ganha 1 s de proteção, como no fim de qualquer poder). O mesmo pouso vale ao renascer ou continuar um jogo salvo em cima de um muro (o passarinho nunca fica preso dentro de um muro).
- **Não pula a fase.** A saída só abre com os pontos mínimos e a missão (nas Fases 1 a 3, com tudo pego): voar por cima dos muros só encurta o caminho. Os muros `M` são finos (no máximo 2 tiles) e os mapas têm atalhos de verdade; a economia de cada fase está em [`docs/PASSARINHO-DESENHO.md`](docs/PASSARINHO-DESENHO.md) (*Muros voáveis e atalhos*).

### Bater asas, galhos, obstáculos baixos e vento
- **Bater asas (fôlego).** Segurar **Shift** ou **Espaço** (teclado), **A**, **RB** ou **RT** (controle) ou o botão **Voar** (toque; só aparece nas fases do Gatinho e do Passarinho) deixa o passarinho **×1,35** mais rápido enquanto ele se move e tem fôlego. É o mesmo código da arrancada do Gatinho com outros nomes: o fôlego (0 a 1) gasta **0,4/s** (**2,5 s** de tanque cheio) e, sem bater asas, volta a **0,2/s** (5 s); quando chega a 0 o passarinho fica **sem fôlego 1,5 s** e depois volta a poder. O **fruto de rajada** deixa bater asas sem gastar fôlego pelos 8 s do efeito (+4 s por nível de *Fruto poderoso*) e a velocidade **multiplica**: o ×1,4 da rajada vezes o ×1,35 de bater asas (cerca de ×1,9 batendo asas). No placar: a barra **FÔLEGO** e o **ESTADO**. Sons `flap` (bater asas) e `wheeze` (fôlego acabando). Ao perder uma vida o passarinho renasce com o fôlego cheio.
- **Galho `G`** (copa de árvore, fio, mastro, telhado alto, vitória-régia). Com o centro do passarinho em cima de um galho ele fica **A SALVO**: nenhum gato e nenhum gavião o pega. Quem está perseguindo vai ao tile alcançável mais perto do galho, espera **até 4 s** e **desiste**. Em cima não há limite de tempo, mas o relógio e o bônus de tempo continuam; ao descer **não há proteção nenhuma**. Som `landing` ao pousar.
- **Obstáculo baixo `X`.** O passarinho passa sempre e na velocidade de sempre; os gatos de quintal não passam; o gavião passa. O `X` **não protege**: um gato que chega ao lado de um passarinho parado em cima do `X` o alcança (alcance de 34 px, como no Gatinho).
- **Vento `>` `<` `^` `v`.** Com o centro do passarinho numa corrente de vento e no **voo baixo**, ele é **empurrado a 90 px/s** na direção da seta, além do que o jogador anda: a favor soma 90 px/s, contra subtrai 90 px/s e de lado ele anda normal e é empurrado de lado. As paredes e os muros ainda o seguram (o empurrão passa pelo mesmo movimento com colisão, e um quadro longo empurra só o equivalente a 0,05 s). No **voo alto** o passarinho está acima do vento. Gatos e gaviões **não sentem** o vento. O placar diz **A FAVOR DO VENTO**, **CONTRA O VENTO** ou **NO VENTO**; som `gust` (no máximo a cada 1,6 s) e efeito de rajada. Com "reduzir movimento" o empurrão **continua valendo igual** e só o desenho das fitas fica parado. Vento e galho nunca ficam sobre o início, a saída ou os postos.
- **Estado no placar** (um só, o mais importante primeiro, para o placar nunca crescer): **VOO ALTO** ou **VOO ACABANDO**, **A SALVO**, **SEM FÔLEGO**, **CONTRA O VENTO**, **A FAVOR DO VENTO** ou **NO VENTO**. A região `#hud-state-live` (leitor de tela) diz o estado quando ele muda ("Estado do passarinho: a salvo").

### Gatos de quintal e gaviões
- **Gatos de quintal** (`V` no mapa). A IA dos agentes da carrocinha do Cachorrinho: cada um escolhe uma patrulha longe dos outros e, com o **!** vermelho em cima dele, fica mais rápido e persegue. Os números (velocidade sem e com o !, alcance do !, esperteza) são os do agente da fase `like` do Cachorrinho (veja a tabela das fases). Encostar tira **1 vida**; o `X`, o muro `M` e a parede `#` os barram; o galho e o voo alto os fazem esperar e desistir. O miado de ameaça (`hiss2`) toca quando um deles nota o passarinho (com intervalo mínimo por gato).
- **Gaviões** (`H` no mapa, só nas Fases 11 a 20). A IA dos gatos inimigos do Cachorrinho e dos rastreadores do Gatinho (**ouvem** o passarinho de longe, correm para onde ele **vai estar** e **procuram** onde o perderam), com as mesmas velocidades deles. Um gavião **voa**: passa por cima dos `X`, mas **não atravessa** muros `M` nem paredes `#`; o voo alto **não o detém** e só o **galho** o segura (espera ao pé e desiste). Tem uma **sombra** escura no chão. Encostar tira **1 vida** (*Um gavião pegou o passarinho!*). O grito (`shriek`) toca uma vez ao começar a perseguir e, depois, no máximo a cada 3 s. Nesta versão a sombra no chão é só visual (o gavião não mergulha do alto); um mergulho com sombra de aviso fica para uma atualização futura.
- **Fruto de ar frio** congela gatos e gaviões por 6 s; o **escudo** dourado protege por 10 s (nada pega o passarinho); o reforço *Gatos lentos* deixa os dois 8% mais lentos por nível e o *Voo silencioso* faz os dois notarem o passarinho 1 quadrado mais tarde.

### Frutos
| Fruto | Cor | Efeito | Duração |
|---|---|---|---|
| **Comum** (o fruto do voo alto) | vermelho | **voo alto**: passa por cima dos muros `M`, os gatos não alcançam | 10 s (+2 s por nível de *Fruto poderoso*) |
| **Dourado** | amarelo | **escudo**: nada pega o passarinho | 10 s |
| **Ar frio** | azul-claro | congela os gatos e os gaviões (parados, não pegam) | 6 s |
| **Rajada** | laranja | ×1,4 de velocidade e bater asas **sem gastar fôlego** | 8 s |
| **Ímã** | roxo | as sementes **à vista** a até 4 quadrados vêm sozinhas | 12 s |

Nas Fases 2 a 10 todos os frutos são do tipo comum; a partir da Fase 11 entram os outros quatro (a lista de cada fase está na tabela das fases). Cada fruto vale **150 pontos**, tem a sua **cor-chave** e uma **marquinha** própria (asa, estrela, floco, raio, ímã) que nenhuma skin muda. Os efeitos aparecem numa faixa no alto do jogo. Todo fruto toca o som `fruit`.

### Legenda dos mapas
`#` parede **sólida sempre** (bordas do mundo, rochas, troncos, construções altas, água funda; o voo alto **não** passa) · `M` **muro** baixo de labirinto (cerca alta, sebe, milho, caniço, varal): sólido no voo baixo e para os gatos e os gaviões, mas o **voo alto passa por cima** · `.` chão · `P` início · `V` posto de um gato de quintal · `H` posto de um gavião (Fases 11 a 20) · `E` saída (o ninho, 3 tiles na borda) · `X` obstáculo baixo (o passarinho e o gavião passam; os gatos não) · `G` galho (o passarinho fica a salvo em cima) · `>` `<` `^` `v` correntes de vento (chão normal para todos; empurram só o passarinho em voo baixo). Sementes, frutos e minhocas **não** estão no mapa: o motor os sorteia em chão livre (`.`), longe do início, dos postos e do vento, como as rações do Cachorrinho. O vento e o `G` não ficam sobre o início, a saída nem os postos, o vento só fica em chão `.` e nenhuma seta aponta direto para `#` ou `M`.

| Quem | Anda por | Não anda por |
|---|---|---|
| gato de quintal | `.` `P` `V` `H` `E` e o vento | `#` `M` `X` `G` |
| gavião | o mesmo dos gatos, mais `X` | `#` `M` `G` |
| passarinho em voo baixo | o mesmo dos gatos, mais `X` e `G` | `#` `M` |
| passarinho em voo alto | o voo baixo, mais `M` | `#` |

Os mapas, as contagens e as validações (anel de `#`, só os símbolos da legenda, saída com 3 tiles, vários caminhos de `P` a `E`, nenhum bolsão, atalhos de verdade pelos muros) estão em [`docs/PASSARINHO-DESENHO.md`](docs/PASSARINHO-DESENHO.md), com as miniaturas em `docs/passarinho-mapas/`; o teste é `node tests/bird-levels.test.js`.

### Os 20 ambientes
Cada fase é um lugar onde os passarinhos vivem e voam, com o seu próprio chão, muro, parede, galho, vento animado, obstáculo baixo e ninho (`js/bird-themes*.js`). **Fases 1 a 3** (25×18) ensinam o jogo: *Jardim florido* (andar, pegar sementes e fugir do gato, com o passarinho filhote), *Pomar de macieiras* (o fruto, o voo alto e o bater de asas) e *Horta e cerca* (a cerca baixa `X`, o galho e o vento). **Fases 4 a 10** têm pontos mínimos e mapas maiores: *Telhados e chaminés*, *Praça da vila* (as árvores da praça são galhos), *Parque e coreto*, *Milharal* (corredores estreitos de milho: o voo alto corta caminho), *Campo de trigo e espantalhos* (ventos fortes), *Lago e juncos* (juncos para pousar) e *Mata de pinheiros* (troncos, sub-bosque e muitos galhos). **Fases 11 a 20** trazem os gaviões, as missões e os frutos de outros tipos: *Fazenda e galinheiro*, *Margem do rio*, *Pântano e vitórias-régias*, *Dunas e restinga* (ventos de duna), *Falésias e ninhos*, *Vila de pescadores e redes*, *Campos de altitude*, *Entardecer nos telhados*, *Noite na floresta* e *O grande ninho* (tudo junto). As **Fases 18 e 19** escurecem: o escuro é de 75% no máximo, com um **halo de 5 tiles** em volta do passarinho (o mesmo do Gatinho; a Fase 18 é o entardecer, de luz laranja, e a 19 a noite). Os inimigos longe do halo continuam à vista; com "reduzir movimento" o halo não pulsa e em pausa, vitória e derrota o escuro some.

### Pontos, vidas, reforços e crescimento
- **Pontos.** **Semente 100, fruto 150, minhoca 50**, mais o bônus de tempo, o bônus da missão (Fases 11 a 20), menos os pontos por vida perdida e 100 por nova tentativa; como nos outros bichinhos, a pontuação pode ficar negativa e vale a maior de cada fase. Os pontos mínimos, a perda por vida, as vidas máximas, as missões e os bônus são **iguais aos do Gatinho** (veja a tabela das fases). Pegar tudo (Fases 1 a 3) ou os pontos mínimos (Fases 4 a 20) abre o ninho; a partir da Fase 11 a missão também precisa estar cumprida (*pegar todos os frutos*, *pegar N sementes*).
- **Vidas.** 3 no começo, de 1 a 5 (de 6 a 10 nas Fases 11 a 20); algumas sementes e frutos escondem uma **vida extra**; as que sobram passam para a fase seguinte. Se um gato ou um gavião encosta, o passarinho perde 1 vida e volta ao início (da Fase 9 em diante renasce onde caiu), com uns segundos de proteção; as sementes que ainda não foram pegas mudam de lugar. Sem vidas, 3 novas tentativas (100 pontos cada).
- **Reforços** (um entre 3 opções a cada vitória; 6 reforços, 9 a partir da Fase 11; os mesmos efeitos dos outros bichinhos com os nomes do passarinho):

| Reforço | Efeito por nível | Máximo |
|---|---|---|
| **Asas fortes** | +8% de velocidade do passarinho | 4 níveis |
| **Fruto poderoso** | +2 s no voo alto (e +4 s nos outros frutos) | 4 níveis |
| **Vida extra** | +1 vida agora | — |
| **Coração maior** | +1 vida no máximo e +1 vida agora | 3 níveis |
| **Penas grossas** | +2 s de proteção depois de perder uma vida | 3 níveis |
| **Gatos lentos** | gatos de quintal e gaviões 8% mais lentos | 4 níveis |
| **Voo silencioso** *(a partir da Fase 11)* | gatos e gaviões notam o passarinho 1 quadrado mais tarde | 3 níveis |
| **Olhar atento** *(a partir da Fase 11)* | uma seta mostra o fruto mais perto (no nível 2, também o ninho aberto) | 2 níveis |
| **Chamado de semente** *(a partir da Fase 11)* | as sementes à vista a até 2,5 / 3,5 / 4,5 quadrados vêm sozinhas | 3 níveis |

- **Crescimento: filhote → jovem → adulto.** O passarinho começa **filhote** (menor, cabeça e olhos grandes) e cresce com as fases vencidas e os reforços, pela mesma conta do cachorrinho (`clamp((fase − 1 + 0,35 × reforços) ÷ 9, 0, 1)`; os cortes são 0,34 e 0,67, o mesmo de `BirdArt.growthStage`). Mudam o desenho e o piu de completar a fase (`chirp1`, `chirp2`, `chirp3`, agudo no filhote e grave no adulto, e a cantiga `song` da vitória); o tamanho de contato (24 × 24), a velocidade e as regras **não mudam**. A pausa diz *Passarinho: filhote.* (ou jovem, ou adulto).

### Skins e lojinha
O passarinho tem **12 skins** (só visuais, `BirdArt.SKINS`: Marrom grátis, Amarelo, Azul, Vermelho, Verde, Cinza, Branco, Preto, Laranja, Arco-íris, Pirata e Astronauta, de 10 a 50 petscoin) e cada objeto do jogo tem **4 skins** de 10 a 30 petscoin (gatos de quintal, sementes, ninho, frutos, minhocas, poleiros, ventos e gaviões; `js/skins-bird.js`). É a mesma lojinha única, com a aba **Passarinho** e as 9 categorias dele, cada uma liberada na fase em que o objeto aparece: veja *Lojinha única (0.19.0)* e [`docs/LOJINHA.md`](docs/LOJINHA.md). Nenhuma skin muda tamanho de contato, regra, som ou pontos; nada de nome de espécie com atributo.

### Como o Passarinho roda no motor
**Adaptador (`birdDefFrom(c)` em `js/game.js`).** Converte uma fase de `BirdLevels` na definição que a `buildLevel` aceita, no mesmo molde do `catDefFrom`. Do mapa do passarinho vêm `id`, `title`, `map`, as sementes (`rations`), os frutos (`bones`, `boneMix`), as minhocas (`balls`), `extraLives`, `note` e a velocidade (`birdSpeed` = `dogSpeed`, ×252 px/s). Da fase do Cachorrinho que ela imita (`like`) vêm as **regras e a dificuldade**: a configuração do agente `vets[0]` repetida pelo número de `V` (os gatos de quintal), `alertTiles`, `lifePenalty`, `minPoints`, `lifeCap`, `mission`, `missionBonus`, `bonusStep`, `touchEase`, `respawnInPlace` e `cat` (a configuração dos gatos inimigos, que serve aos **gaviões**). Os `H` do mapa viram `cats: [[coluna, linha]]` (a célula vira chão). A definição liga `catMode`, `birdMode` (os símbolos `M`, `G`, `H` e o vento), `sprint` (o bater de asas, nas 20 fases), `refuge` (o galho e o voo alto dependem dele), `flight` (só nas fases que têm fruto comum: o voo alto de 10 s, `bonePower`, com `boneStep` de 2 s por nível do reforço), `wind` (só nos mapas com setas) e `night` (Fases 18 e 19). Com o arquivo carregado o Passarinho fica **pronto** (`ready: true`, revisão dos mapas `rev` 1, `BIRD_REV`); sem ele (ou se alguma fase for inválida, com um aviso no console) segue *Em breve*. O `index.html` carrega `js/bird-levels.js` antes do `js/game.js`.

**Movimento e colisão.** Os muros `M` entram nos sólidos do passarinho como sólidos "altos": o movimento os pula só com o voo alto ligado (as paredes `#` nunca); os gatos e os gaviões não têm essa exceção e o grafo de caminhos deles não muda. O vento é um empurrão a mais no movimento do passarinho (antes da colisão). O galho reaproveita o lugar alto do Gatinho (`safe`, espera de 4 s, desistência), e o voo alto reaproveita o poder do osso (`power`, o PODER do placar, o campo `pw` do jogo salvo e o reforço), com o voo alto ligado como "a salvo" só dos gatos.

**Jogo salvo.** Tem o **formato do Gatinho, sem nenhum campo novo** (o fôlego, os gaviões na lista dos inimigos, o poder `pw` que aqui é o voo alto) e a revisão `mz` 1 (`BIRD_REV`); um jogo de outra revisão é descartado com aviso. Ao continuar, o voo alto, o galho e o vento voltam como estavam. Um salvo adulterado é recusado: o passarinho sobre um muro só vale com o voo alto ligado, nunca dentro de uma parede, o voo alto não passa do máximo da fase (10 s, mais o reforço), o gavião sobre um muro e o gato de quintal sobre um `X` ou um muro são recusados. O salvo continua com menos de 20.000 bytes.

**Telas.** Ao escolher o Passarinho o menu e o jogo usam as palavras dele (`js/profiles.js`): *Como jogar* (com gaviões, muros, galhos, ventos e o botão Voar), a ajuda da pausa (*Shift ou Espaço (segurar) batem as asas*), o placar **SEMENTES / FRUTOS / MINHOCAS / PODER (VOO ALTO) / FÔLEGO / ESTADO**, o título da aba *Jogo do passarinho* e o cartão do Passarinho na escolha de bichinho, já com o passarinho desenhado. O botão de toque **Voar** é o botão `#btn-run` do Gatinho com outro rótulo, e as correções de telas pequenas e de leitor de tela do Gatinho (*clique que atravessa*, aviso de começo curto em campo estreito, lugar reservado do estado no placar) valem também para o Passarinho. Em 320×568, 360×640, 390×780, 568×320 e 1000×700 o jogo não rola para o lado e o placar não muda de tamanho. O ranking compartilhado entre aparelhos (em stand by) é só do Cachorrinho; as pontuações do Passarinho são deste aparelho.

**Ganchos de teste** em `window.__game`: `birdDefFrom(c)` (a conversão de uma fase de `js/bird-levels.js`), `defineBirdLevels(lista)` (troca as fases do Passarinho por uma lista nesse formato; `false` se não servir) e `birdLevels()` (volta às de `js/bird-levels.js`); os estados `perch` (a salvo no galho), `flying` (voo alto ligado), `flyAnim` (0 a 1, a altura do desenho), `windNow` (1 a favor, −1 contra, 2 de lado ou parado, 0 fora do vento), `birdDraw` (a partida desenha com `BirdArt`) e `birdFailed` (fases recusadas); e os do Gatinho que o Passarinho também usa (`stamina`, `winded`, `sprinting`, `safe`, `darkness`, `power`). Sem `window.BirdArt` o jogo desenha o Passarinho com formas simples de reserva; um `BirdArt` que falha não derruba o jogo.

### Desenhos e ambientes do Passarinho
`js/bird-art.js` (`window.BirdArt`, também `require` no Node) tem **só os desenhos**, no mesmo estilo e com o mesmo contrato de `js/cat-art.js`: cada função recebe o `ctx` e parâmetros explícitos, é determinística (sem `Math.random` nem relógio), não lança erro com parâmetros ausentes e, com `o.calm` (reduzir movimento), desenha a mesma imagem em qualquer instante. Não depende de `js/game.js`. O desenho de passarinho, de gato e de gavião é **escolha de design** (nada de espécie; penas e pelos claros, para se verem também à noite).
- `drawBird(ctx, p, o)`: o passarinho. `p = { x, y, w, h, facing, moving }` (a mesma caixa do gatinho); `o = { gr: 0..1 (0 filhote, 1 adulto), skin, still, time, calm, flap (bater asas), flying: 0..1 (voo alto: maior, mais alto, asas abertas), safe (no galho), blink (aviso do fim do voo), noShadow }`. `BirdArt.SKINS` e `skinById(id)`: as 12 skins.
- `drawFoeCat(ctx, d, o)` (gato de quintal: `mode` `patrol|chase|flee|search|idle`, `size` `small|medium|large`, congelado, lento) e `drawHawk(ctx, d, o)` (gavião, com a sombra elíptica no chão); `drawSeed`, `drawWorm` (`o.hidden`: só o montinho de terra), `drawFruit` (`kind`: `scare|gold|ice|turbo|magnet`; as cores-chave em `BirdArt.FRUIT_KEYS`), `drawRoost` (o galho de uma skin da lojinha), `drawPost` (a moita do gato e o galho alto do gavião), `drawNest` (o ninho da saída, aberto ou fechado), `drawFx(ctx, kind, x, y, t, o)` (`flap|dust|feather|sparkle|gust|land|peck|shadow`) e `growthStage(gr)`. Todas aceitam `o.look` (a skin em uso da categoria, 0.19.0) e, sem `look`, desenham exatamente o de sempre.
- **Ambientes** (`js/bird-themes.js` + `js/bird-themes-1.js` + `js/bird-themes-2.js`, `window.BirdThemes`): o contrato de `js/cat-themes.js` mais `muro(g)` (os muros `M`, mais baixos, com o chão aparecendo em volta), `high(g)` (o galho, com brilho quente e sombra comprida, para ser reconhecido de relance) e `wind(g)` (fitas de ar que correm na direção da seta; paradas com `g.time = 0`). `Themes.of(fase, "bird")` devolve `BirdThemes.of(fase)` (sem os arquivos, cai no ambiente do Cachorrinho). Orçamento: no máximo 40 operações de pintura por tile, o chão mais barato (vai em todos os tiles menos sob `#`).
- **Efeitos curtos** (no máximo 24 ao mesmo tempo): `peck` ao pegar uma semente, `feather` ao ser pego, `flap` ao bater asas, `land` no pouso, `gust` no vento e `sparkle` ao pegar fruto ou minhoca.
- **Ver o jogo:** `node tools/bird-preview/shoot-art.js <pasta>` (folhas dos desenhos sobre fundo verde, areia ou escuro) e `node tools/bird-preview/shoot-themes.js <pasta> [fases]` (os 20 ambientes em escala 1 e 0,75, com a luz da Fase 18 e da Fase 19); `tools/bird-preview/art.html` e `themes.html` abrem as folhas no navegador, e `bench.js` mede o custo do desenho por quadro. Todos precisam de `NODE_PATH` e `CHROMIUM_PATH` como os outros testes (`PREVIEW_LOCK=<arquivo>` reexecuta sob `flock`).

### Como testar o Passarinho e as ferramentas dele
- `node tests/bird-levels.test.js` (os 20 mapas e o gerador; precisa de python3), `node tests/bird-art.test.js` (os desenhos, com um `ctx` de mentira), `node tests/bird-themes-1.test.js` e `node tests/bird-themes-2.test.js` (os ambientes), `node tests/skins-bird.test.js` (as skins dos objetos), `node tests/bird-table.test.js` (a tabela das fases do Passarinho do README confere com os dados e com a tabela do Gatinho) e a seção "Sons do Passarinho" em `node tests/sound.test.js`. A honestidade científica é conferida por `node tests/honesty.test.js` (também para o Passarinho).
- No navegador, as seções do Passarinho ficam em `tests/e2e-bird-*.js` (carregadas pelo `tests/e2e.js`): `node tests/e2e.js "Passarinho (motor)"` roda as do motor (adaptador, símbolos do mapa, bater asas, voo alto, galho, gavião, vento, minhocas e frutos, jogo salvo, um robô que joga as fases, cinco tamanhos de tela, isolamento do Cachorrinho e do Gatinho, textos). As páginas de teste do Passarinho abrem com `newPage({ realBird: true })` (fases e desenhos de teste de `tests/fixtures/`), `realBird: "levels"` (só as fases) ou `realBird: "real"` (os arquivos de verdade); as seções antigas abrem sem `js/bird-levels.js`.
- `python3 tools/birdmaze/gen_bird.py --all --write` regera `js/bird-levels.js` (os mapas); `node tools/birdmaze/bird_sim.js` imprime as distâncias e os atalhos por fase; `python3 tools/birdmaze/render_bird_preview.py` regera as miniaturas de `docs/passarinho-mapas/`. Mudar um mapa depois da entrega exige subir `BIRD_REV` no `js/game.js`.
- `node tools/birdmaze/readme_table.js` imprime a **tabela das fases do Passarinho** a partir de `js/bird-levels.js`, de `js/bird-themes*.js` e da tabela do Gatinho; `--write` grava no README e `--check` confere (é o que `tests/bird-table.test.js` faz).

## Tabela das fases do Passarinho (0.20.0)
Cópia técnica da tabela que é entregue ao dono a cada versão (conferida por testes: `node tests/bird-table.test.js` contra os dados de `js/bird-levels.js` e a tabela do Gatinho, e `node tests/e2e.js "tabela das fases do Passarinho"` contra as fases montadas no navegador). O Passarinho tem as suas **20 fases próprias**; pontos mínimos, vidas, perda por vida, missões e bônus seguem a rampa do Cachorrinho (são os da tabela do Gatinho), e as velocidades dos gatos de quintal e dos gaviões são as dos agentes e dos gatos inimigos do Cachorrinho da fase equivalente (as mesmas dos cães de guarda e dos rastreadores do Gatinho). O passarinho voa a 252 px/s × o fator da fase (filhote 0,8 na Fase 1, 0,9 na Fase 3), bater asas multiplica por 1,35 e o voo alto dura 10 s. Semente = 100 pontos, fruto = 150, minhoca = 50. *Galhos* e *Ventos* contam **grupos** (galho: 1 a 3 tiles cada; vento: 2 a 8 tiles cada, numa direção). *Luz*: a Fase 18 é o entardecer e a 19 a noite. Gerada por `node tools/birdmaze/readme_table.js --write`.

| Fase | Ambiente | Mapa | Condição para avançar | Gatos de quintal | Gaviões | Sementes | Frutos | Minhocas | Velocidade dos gatos (sem ! / com !) | Velocidade dos gaviões (anda / persegue) | Velocidade do passarinho | Vidas máx. | Perda por vida | Missão | Bônus da missão | Luz | Galhos (grupos) | Ventos (grupos) | Tipos de fruto |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jardim florido | 25×18 | pegar tudo | 1 | — | 5 | — | — | 55 / 110 | — | 201,6 | 5 | 50 | — | — | — | — | — | — |
| 2 | Pomar de macieiras | 25×18 | pegar tudo | 2 | — | 7 | 2 | 1 | 60,5 / 121 | — | 252 | 5 | 50 | — | — | — | — | — | 2× voo alto |
| 3 | Horta e cerca | 25×18 | pegar tudo | 2 | — | 7 | 2 | 1 | 66,55 / 133,1 | — | 226,8 | 5 | 50 | — | — | — | 1 | 2 | 2× voo alto |
| 4 | Telhados e chaminés | 41×29 | 800 pontos | 3 | — | 15 | 2 | 2 | 73,21 / 146,41 | — | 252 | 5 | 200 | — | — | — | 2 | 3 | 2× voo alto |
| 5 | Praça da vila | 41×29 | 1000 pontos | 3 | — | 20 | 2 | 2 | 73,21 / 146,41 | — | 252 | 5 | 200 | — | — | — | 4 | — | 2× voo alto |
| 6 | Parque e coreto | 49×33 | 1250 pontos | 3 | — | 24 | 3 | 3 | 76,14 / 152,27 | — | 252 | 5 | 250 | — | — | — | 2 | 2 | 3× voo alto |
| 7 | Milharal | 49×37 | 1400 pontos | 4 | — | 28 | 3 | 3 | 79,07 / 158,12 | — | 252 | 5 | 250 | — | — | — | 2 | 3 | 3× voo alto |
| 8 | Campo de trigo e espantalhos | 55×39 | 1650 pontos | 5 | — | 32 | 4 | 3 | 82 / 163,98 | — | 252 | 5 | 250 | — | — | — | 3 | 5 | 4× voo alto |
| 9 | Lago e juncos | 55×39 | 1800 pontos | 5 | — | 36 | 4 | 3 | 84,92 / 169,84 | — | 252 | 5 | 300 | — | — | — | 5 | 6 | 4× voo alto |
| 10 | Mata de pinheiros | 55×41 | 2050 pontos | 6 | — | 40 | 5 | 3 | 87,85 / 175,69 | — | 252 | 5 | 300 | — | — | — | 4 | 2 | 5× voo alto |
| 11 | Fazenda e galinheiro | 57×41 | 2300 pontos + missão | 5 | 2 | 44 | 5 | 4 | 89,32 / 178,62 | 130 / 200 | 252 | 6 | 300 | todos os frutos | 200 | — | 4 | 4 | 3× voo alto, 1× escudo, 1× ar frio |
| 12 | Margem do rio | 57×41 | 2450 pontos + missão | 5 | 3 | 46 | 5 | 4 | 90,78 / 181,55 | 132 / 203 | 252 | 6 | 300 | 34 sementes | 250 | — | 4 | 4 | 3× voo alto, 1× ar frio, 1× rajada |
| 13 | Pântano e vitórias-régias | 57×43 | 2650 pontos + missão | 6 | 3 | 48 | 6 | 4 | 92,24 / 184,48 | 134 / 205 | 252 | 7 | 325 | 36 sementes | 300 | — | 7 | 3 | 3× voo alto, 1× escudo, 1× ar frio, 1× ímã |
| 14 | Dunas e restinga | 57×43 | 2800 pontos + missão | 6 | 4 | 50 | 6 | 4 | 93,71 / 187,4 | 135 / 208 | 252 | 7 | 325 | todos os frutos | 350 | — | 4 | 8 | 3× voo alto, 1× escudo, 1× rajada, 1× ímã |
| 15 | Falésias e ninhos | 59×43 | 3000 pontos + missão | 6 | 4 | 52 | 6 | 4 | 95,17 / 190,33 | 137 / 211 | 252 | 8 | 350 | 40 sementes | 400 | — | 4 | 5 | 3× voo alto, 1× ar frio, 1× rajada, 1× ímã |
| 16 | Vila de pescadores e redes | 59×45 | 3200 pontos + missão | 7 | 5 | 54 | 7 | 5 | 96,64 / 193,26 | 139 / 214 | 252 | 8 | 350 | 44 sementes | 450 | — | 5 | 7 | 3× voo alto, 1× escudo, 1× ar frio, 1× rajada, 1× ímã |
| 17 | Campos de altitude | 61×45 | 3400 pontos + missão | 7 | 5 | 56 | 7 | 5 | 98,1 / 196,19 | 141 / 216 | 252 | 9 | 375 | todos os frutos + 40 sementes | 500 | — | 3 | 8 | 3× voo alto, 1× escudo, 1× ar frio, 1× rajada, 1× ímã |
| 18 | Entardecer nos telhados | 61×45 | 3600 pontos + missão | 7 | 6 | 58 | 7 | 5 | 99,57 / 199,12 | 143 / 219 | 252 | 9 | 375 | 46 sementes | 550 | entardecer | 8 | — | 3× voo alto, 1× escudo, 1× ar frio, 1× rajada, 1× ímã |
| 19 | Noite na floresta | 61×45 | 3800 pontos + missão | 8 | 6 | 60 | 8 | 5 | 101,03 / 202,05 | 144 / 222 | 252 | 10 | 400 | todos os frutos + 48 sementes | 600 | noite | 5 | 6 | 3× voo alto, 2× escudo, 1× ar frio, 1× rajada, 1× ímã |
| 20 | O grande ninho | 63×47 | 4000 pontos + missão | 8 | 7 | 62 | 8 | 5 | 102,49 / 204,97 | 146 / 224 | 252 | 10 | 400 | todos os frutos + 52 sementes | 650 | — | 6 | 6 | 3× voo alto, 1× escudo, 2× ar frio, 1× rajada, 1× ímã |

## Biologia por trás do Passarinho (0.20.0)

**Situação das fontes (leia primeiro).** A regra do projeto é que cada característica de um bichinho tenha por base **artigos científicos revisados por pares, de periódicos reconhecidos, publicados entre out/2021 e out/2026, abertos e conferidos** antes de serem citados aqui. Durante a construção do Passarinho (29/10/2026) a **rede do ambiente de desenvolvimento continuou bloqueando os sites de artigos**, e **nenhuma busca foi feita para o Passarinho**. Por isso **nenhum artigo foi aberto e nada abaixo está verificado**: **todo traço do Passarinho é uma "escolha de design"**. A coluna de pistas da tabela abaixo traz só **temas e palavras-chave para procurar** quando houver acesso (nenhum autor, ano, periódico, volume ou DOI é citado, porque nada foi achado nem conferido). Os temas, as perguntas, os tipos de estudo esperados e a lista do que abrir primeiro estão em [`docs/pesquisa-passarinho/`](docs/pesquisa-passarinho/LEIAME.md); **quando houver acesso, os artigos serão abertos e conferidos, e só o que for confirmado será citado aqui**.

Regras que valem sempre: só traços **genéricos de um passarinho** (nunca de espécie: nenhuma espécie, raça ou skin tem vantagem; as skins são só visual e as cores não são de espécie); o **gato de quintal** é um gato doméstico genérico e o **gavião** uma ave de rapina genérica; os **sons** são genéricos e só mudam com a **fase da vida** (filhote → jovem → adulto), sem pretender imitar nenhuma ave de verdade (veja *Sons do Passarinho*).

| Traço no jogo | O que o jogo faz | Pistas (temas a procurar, não verificados) | Situação |
|---|---|---|---|
| Voo baixo e voo alto | o fruto comum dá 10 s de voo alto: passa por cima dos muros `M`, não das paredes `#`; os gatos não alcançam | custo de energia do voo e voo entre obstáculos (P1) | escolha de design |
| Bater asas com fôlego | ×1,35 de velocidade por ~2,5 s; recupera em ~5 s; sem fôlego 1,5 s | custo de energia do voo batido (P1); nada achado sobre fôlego em jogo (lacuna) | escolha de design |
| Sementes e frutos | o passarinho pega sementes (100) e frutos (150); o fruto dá poder | forrageio de aves que comem sementes e frutos (P2) | escolha de design |
| Minhocas | saem da terra e disparam a 3 tiles (50) | forrageio de aves no solo e fuga de presas pequenas (P2) | escolha de design |
| Gatos de quintal | patrulham, com o ! perseguem; o `X` e os muros os barram | predação de aves por gatos domésticos (P3) | escolha de design |
| Gaviões | ouvem, antecipam, procuram; voam; o voo alto não os detém | predação de aves por aves de rapina em ambientes humanos (P3) | escolha de design |
| Galhos | o passarinho fica a salvo em cima; os inimigos esperam 4 s e desistem | abrigo em copas e poleiros e vigilância (P4) | escolha de design |
| Vento | empurra 90 px/s no voo baixo; no voo alto não | voo de aves pequenas com vento e rajadas (P4) | escolha de design |
| Obstáculo baixo (`X`) | o passarinho e o gavião passam; os gatos não | nenhuma pista buscada (P4, só como tema) | escolha de design |
| Ambientes das 20 fases | jardim, pomar, horta, telhados, praça, parque, milharal, trigal, lago, mata, fazenda, rio, pântano, dunas, falésias, vila de pescadores, altitude, entardecer, noite e o grande ninho | habitats de aves em áreas urbanas, agrícolas, de água e de dunas (P5) | escolha de design (vários sem pista) |
| Entardecer e noite (Fases 18 e 19) | escurece com um halo em volta do passarinho | atividade de aves ao entardecer e à noite, visão com pouca luz (P5) | escolha de design |
| Crescimento (filhote → jovem → adulto) | só o desenho, o tamanho e o piu mudam | nenhuma pista buscada | escolha de design |
| Sons | pios de filhote, jovem e adulto, cantiga, bater de asas, bicar, minhoca, fruto, voo alto, pouso, vento, miado de ameaça, grito de gavião, susto e fôlego | nenhuma pista usada (veja *Sons do Passarinho*) | escolha de design |
| Skins | cores e acessórios, só visual | nenhuma | escolha de design |

**Cuidado na vida real (escolha de design / precaução; não verificado):** o Passarinho do jogo é só uma brincadeira de computador. Por precaução, não persiga nem pegue passarinhos de verdade e não os alimente sem orientação; se encontrar um filhote caído, procure um veterinário ou um serviço de resgate de animais silvestres.

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
| Arrancada ou bater asas (só nas fases do Gatinho e do Passarinho) | **Shift** ou **Espaço** (segurar) | **A**, **RB** ou **RT** (segurar) | botão **Correr** no Gatinho e **Voar** no Passarinho (segurar; aparece só nessas fases, ao lado do controle redondo) |
| Pausar / continuar | **Esc** ou **P** | **Start** | botão de pausa no placar |
| Salvar | **Ctrl+S** (ou **Cmd+S**) | **Y** | botão de disquete no placar ou **Salvar jogo** na pausa |
| Som | **M** liga e desliga | — | botão **Som** no menu e na pausa |
| Menus | **↑ ↓** (ou **Tab**) escolhem, **Enter**/**Espaço** confirmam, **Esc** volta | direcional ou analógico escolhem, **A** confirma, **B** volta | tocar nos botões |

**Controle:** funciona com a maioria dos controles (Xbox, PlayStation, Switch Pro, genéricos), por cabo ou Bluetooth, nos navegadores que têm a *Gamepad API* (Chrome e Edge; Firefox e Safari também a têm, mas **só testei com um controle simulado no Chromium**, não com um controle de verdade). Conecte o controle e **aperte um botão** (o navegador só o reconhece depois disso); o jogo avisa "Controle conectado". Controles fora do padrão usam só o analógico esquerdo e os botões A, B e Start (na arrancada do Gatinho e no bater de asas do Passarinho, só o A). Campos de texto (nome, senha) ainda precisam do teclado.

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
index.html            canvas, placar (HTML) e todas as telas (menu, bichinhos, fases, como jogar, pontuações, nome, pausa, vitória, derrota)
css/style.css         visual, tamanho proporcional e controle de toque
js/version.js         versão do jogo (mostrada no menu)
js/auth.js            regras da senha e impressão PBKDF2-SHA256 (testável sozinho)
js/themes.js          ambientes das 20 fases (chão, paredes e caixas de cada lugar; Themes.of(fase, bichinho))
js/cat-levels.js      as 20 fases do Gatinho (mapas e dados; gerado por tools/catmaze/gen_cat.py)
js/cat-themes.js      ambientes do Gatinho: núcleo (registro CatThemes e auxiliares); js/cat-themes-1.js (Fases 1 a 10) e js/cat-themes-2.js (11 a 20)
js/cat-art.js         desenhos do Gatinho (CatArt): gatinho, cães, ratinhos, camundongos, novelos, postos, efeitos e as 12 skins
js/bird-levels.js     as 20 fases do Passarinho (mapas e dados; gerado por tools/birdmaze/gen_bird.py)
js/bird-themes.js     ambientes do Passarinho: núcleo (registro BirdThemes, auxiliares e geradores de muro e vento); js/bird-themes-1.js (Fases 1 a 10) e js/bird-themes-2.js (11 a 20)
js/bird-art.js        desenhos do Passarinho (BirdArt): passarinho, gato de quintal, gavião, semente, minhoca, fruto, galho, postos, ninho, efeitos e as 12 skins
js/profiles.js        perfis de texto por bichinho (substantivos, avisos, placar, reforços, skins, textos fixos; testável sozinho)
js/skins.js           o catálogo único da lojinha: categorias (bichinho e objetos de cada jogo), fase de liberação, registro das skins e regra de liberação (testável sozinho)
js/skins-dog.js       as skins dos objetos do jogo do Cachorrinho (agentes, rações, saída, carteiros, ossos, bolinhas, blocos, vans e gatos), registradas no catálogo
js/skins-cat.js       as skins dos objetos do jogo do Gatinho (cães de guarda, ratinhos, novelos, camundongos, lugares altos e rastreadores), registradas no catálogo
js/skins-bird.js      as skins dos objetos do jogo do Passarinho (sementes, gatos de quintal, ninho, frutos, minhocas, poleiros, ventos e gaviões), registradas no catálogo; o passarinho (as 12 de BirdArt.SKINS) é registrado em js/game.js
docs/LOJINHA.md      a lojinha única: moeda, catálogos, categorias, liberação por fase, carteira e como ela fica guardada
docs/GATINHO-DESENHO.md  desenho do Gatinho: papéis, legenda dos mapas, as 20 fases e as mecânicas (a tabela das fases é lida por tests/cat-levels.test.js)
docs/gatinho-mapas/   uma imagem por fase (fase01.png ... fase20.png) e a folha com os 20 (folha-20-mapas.png) com os mapas do Gatinho, gerada por tools/catmaze/render_cat_preview.py
docs/PASSARINHO-DESENHO.md  desenho dos mapas do Passarinho: legenda, os grafos, as 20 fases, os muros voáveis e os atalhos (a tabela das fases é lida por tests/bird-levels.test.js)
docs/passarinho-mapas/ uma imagem por fase (fase01.png ... fase20.png) e a folha com os 20 (folha-20-mapas.png) com os mapas do Passarinho, gerada por tools/birdmaze/render_bird_preview.py
docs/pesquisa-gatinho/ pistas de pesquisa sobre biologia do gato (R1 a R5): NÃO VERIFICADAS, nenhum artigo foi aberto (veja "Biologia por trás do Gatinho")
docs/pesquisa-passarinho/ temas e palavras-chave de pesquisa sobre biologia do passarinho (P1 a P5): NÃO VERIFICADOS, nenhum artigo foi aberto (veja "Biologia por trás do Passarinho")
tools/catmaze/        gerador dos 20 mapas do Gatinho (Python: gen_cat.py, cat_core.py, cat_styles.py, render_cat_preview.py) e a análise deles em JavaScript (cat_analysis.js, cat_sim.js)
tools/birdmaze/       gerador dos 20 mapas do Passarinho (Python: gen_bird.py, bird_core.py, bird_styles.py, render_bird_preview.py), a análise deles em JavaScript (bird_analysis.js, bird_sim.js) e readme_table.js, que gera a tabela das fases do Passarinho do README
tools/citymaze/       gerador dos labirintos de cidade (Python): gen_citymaze.py (configuração das Fases 1 a 20), apply_citymaze.py (Fases 1 a 10), apply_levels11_20.py (Fases 11 a 20) e maps/map1.json … map20.json (os mapas que estão no jogo; o teste confere paredes iguais)
js/sound.js           efeitos sonoros sintetizados com a Web Audio API, sem arquivos de áudio (testável sozinho)
js/records.js         nome, contas, pontuação, melhores pontuações, progresso e jogo salvo, de cada bichinho (store.game(bichinho)), e a carteira de petscoin com as skins por categoria e a trava por fase (testável sozinho)
js/config.js          configuração (ranking compartilhado em stand by: sharedRanking e endereço do servidor)
js/board.js           ranking compartilhado entre aparelhos (REST / banco do Claude), em stand by, com validação (testável sozinho)
js/game.js            fases e mapas, cachorro, rações, agentes da carrocinha (IA), vidas, tentativas, telas, salvamento, toque e desenho
tests/auth.test.js    testes unitários das senhas (Node)
tests/records.test.js testes unitários das pontuações e melhores pontuações (Node)
tests/accounts.test.js testes unitários do cadastro e da entrada (Node)
tests/board.test.js   testes unitários do ranking compartilhado, com servidor de mentira (Node)
tests/sound.test.js   testes unitários dos efeitos sonoros (Node, com um áudio de mentira) 
tests/themes.test.js  testes unitários dos ambientes das fases (Node)
tests/profiles.test.js testes unitários dos perfis por bichinho (Node): o Cachorrinho com os textos de sempre, o Gatinho com as mesmas chaves
tests/skins.test.js   testes unitários do catálogo da lojinha: categorias, fase de liberação, registro das skins (Node)
tests/skins-dog.test.js testes unitários das skins dos objetos do Cachorrinho (Node): as 10 categorias de js/skins-dog.js, preços, textos, campos visuais e o desenho (js/game.js) lendo cada campo
tests/skins-cat.test.js testes unitários das skins dos objetos do Gatinho (Node, com um ctx de mentira): as 6 categorias de js/skins-cat.js, preços, textos, campos visuais, o desenho de js/cat-art.js com cada skin, as cores-chave dos novelos e os ratinhos claros na noite
tests/skins-cat-frame.js quadros fixos do jogo do Gatinho (não é um teste: roda dentro da página e devolve o hash de pixels de cada cena; usado pelo e2e e por tools/skin-preview/cat-skins.js)
tests/wiring.test.js  testes de fiação (Node): a ordem dos scripts do index.html e a lojinha de js/game.js passando o jogo da categoria ao progresso (reachedLevel) e usando Skins.unlocked
tests/cat-art.test.js testes unitários dos desenhos do Gatinho (Node, com um ctx de mentira)
tests/cat-levels.test.js testes dos 20 mapas do Gatinho e do gerador (Node; precisa de python3 para conferir o determinismo do gerador)
tests/cat-themes-1.test.js testes dos ambientes do Gatinho, Fases 1 a 10 (Node)
tests/cat-themes-2.test.js testes dos ambientes do Gatinho, Fases 11 a 20 (Node)
tests/bird-levels.test.js testes dos 20 mapas do Passarinho e do gerador (Node; precisa de python3 para conferir o determinismo do gerador)
tests/bird-art.test.js testes unitários dos desenhos do Passarinho (Node, com um ctx de mentira)
tests/bird-themes-1.test.js testes dos ambientes do Passarinho, Fases 1 a 10 (Node); tests/bird-themes-2.test.js, Fases 11 a 20; tests/bird-themes-harness.js não é um teste: é o ctx de mentira que os dois usam
tests/bird-table.test.js confere a tabela das fases do Passarinho do README com js/bird-levels.js e com a tabela do Gatinho (Node)
tests/skins-bird.test.js testes unitários das skins dos objetos do Passarinho (Node, com um ctx de mentira)
tests/e2e-bird-*.js   seções do e2e do Passarinho, uma por assunto (carregadas pelo tests/e2e.js); tests/fixtures/ tem as 5 fases e o BirdArt de teste que elas usam
tests/honesty.test.js confere a honestidade científica: nenhuma citação de artigo fora de docs/pesquisa-gatinho/ e docs/pesquisa-passarinho/, nada marcado como verificado e "escolha de design" nas tabelas de biologia do Gatinho e do Passarinho (Node)
tests/version.test.js confere a versão (js/version.js) com o CHANGELOG.md e o workflow
tests/e2e.js          testes no navegador (Playwright)
tests/ab-dog.js       A/B de pixels do Cachorrinho: hash do canvas com a mesma semente e os mesmos passos (usado pelo e2e)
tests/ab-sounds.js    A/B de sons do Cachorrinho: cenas fixas e a lista de pedidos de som; ab-sounds-0170.json é a referência de antes dos sons do Gatinho (usado pelo e2e)
tools/cat-preview/    prévias e capturas do Gatinho (art.html, themes1/2.html, shoot-art.js, shoot-themes*.js e shoot-game.js, que fotografa o jogo de verdade)
tools/bird-preview/   prévias e capturas do Passarinho (art.html, themes.html, shoot-art.js, shoot-themes.js e bench.js)
tools/skin-preview/   capturas das skins dos objetos com o jogo de verdade: shoot.js (objetos do Cachorrinho) e cat-skins.js (objetos do Gatinho)
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
node tests/profiles.test.js
node tests/skins.test.js        # o catálogo da lojinha única (categorias, fase de liberação, registro das skins)
node tests/skins-dog.test.js    # as skins dos objetos do Cachorrinho (catálogo, campos visuais e o desenho lendo cada campo)
node tests/skins-cat.test.js    # as skins dos objetos do Gatinho (catálogo e desenho com um ctx de mentira); tests/skins-cat-frame.js não é um teste: são os quadros fixos do Gatinho que o e2e e tools/skin-preview/cat-skins.js usam
node tests/wiring.test.js       # a fiação da lojinha: ordem dos scripts do index.html e o jogo da categoria passado ao progresso
node tests/cat-art.test.js
node tests/cat-levels.test.js   # precisa de python3 (confere que o gerador dos mapas é determinístico; sem python3 o teste FALHA)
node tests/cat-themes-1.test.js
node tests/cat-themes-2.test.js
node tests/bird-levels.test.js  # os 20 mapas do Passarinho e o gerador (precisa de python3, como o do Gatinho)
node tests/bird-art.test.js
node tests/bird-themes-1.test.js
node tests/bird-themes-2.test.js
node tests/bird-table.test.js   # a tabela das fases do Passarinho do README confere com os dados (para regerar: node tools/birdmaze/readme_table.js --write)
node tests/skins-bird.test.js   # as skins dos objetos do Passarinho (catálogo e desenho com um ctx de mentira)
node tests/honesty.test.js     # honestidade científica: sem citações fora de docs/pesquisa-gatinho/ e docs/pesquisa-passarinho/, no Gatinho e no Passarinho
npm i playwright
npx playwright install chromium   # ou use CHROMIUM_PATH=/caminho/do/chromium
node tests/e2e.js              # opcional: node tests/e2e.js "toque" roda só as seções com esse texto
node tests/e2e.js "Lojinha única"                      # a lojinha única: abas, liberação por fase, carteira, tamanhos de tela, fase `from` e documentação
node tests/e2e.js "skins dos objetos do Cachorrinho"   # as skins dos objetos do Cachorrinho no navegador (desenho idêntico com tudo no padrão, pixels de cada skin, mostruários, telas)
node tests/e2e.js "Skins do Gatinho"                   # as skins dos objetos do Gatinho no navegador (idem, com dia e noite)
node tests/e2e.js "Passarinho (motor)"                 # o motor do Passarinho no navegador (tests/e2e-bird-*.js): voo alto, galho, gavião, vento, minhocas, frutos, jogo salvo, telas e isolamento do Cachorrinho e do Gatinho
node tests/e2e.js "tabela das fases do Passarinho"     # a tabela das fases do Passarinho do README contra as fases montadas no navegador
```
**Capturas das skins** (Playwright; `NODE_PATH` e `CHROMIUM_PATH` como nos outros testes; `PREVIEW_LOCK=<arquivo>` reexecuta sob `flock`, para não abrir dois navegadores juntos):
- `node tools/skin-preview/shoot.js <pasta-de-saída> [categorias separadas por vírgula] [lojinha|jogo|tudo]`: para os objetos do Cachorrinho, `lojinha` (padrão) salva o mostruário de cada skin como a lojinha o desenha, `jogo` recorta o objeto dentro do jogo de verdade, ampliado (variáveis `ESC` e `ZOOM`), e `tudo` faz os dois; escreve `lojinha-<categoria>.png`, `lojinha-todas.png` e `jogo-<categoria>.png`.
- `node tools/skin-preview/cat-skins.js <pasta-de-saída> [fase=20] [noite=18] [cats=guard,mouse,yarn,agile,perch,tracker] [zoom=3] [vp=1000x700]`: para os objetos do Gatinho, escreve `lojinha.png` (os mostruários), `jogo-<categoria>.png` (o objeto no jogo, de dia e de noite) e `novelos.png` (os 5 poderes do novelo com cada skin); `vp=390x780` mostra como fica no celular e `CALM=1` liga "reduzir movimento".
- `node tools/skin-preview/bird-skins.js <pasta-de-saída> [cats=bird,seed,stray,birdexit,berry,bug,roost,gust,hawk] [esc=1] [fundo=escuro|claro]`: para os objetos do Passarinho, escreve `lojinha.png` (os mostruários de todas as skins, uma linha por categoria, com nome, preço e frase) e `lojinha-<categoria>.png` (cada categoria sozinha, maior).
**Prévias do Passarinho** (mesmas variáveis; `PREVIEW_LOCK=<arquivo>` reexecuta sob `flock`): `node tools/bird-preview/shoot-art.js <pasta> [seções] [fundos]` fotografa as folhas dos desenhos (`tools/bird-preview/art.html`), `node tools/bird-preview/shoot-themes.js <pasta> [fases]` os 20 ambientes (`themes.html`; nas Fases 18 e 19 também com a luz simulada) e `node tools/bird-preview/bench.js` mede o custo do desenho por quadro; `node tools/birdmaze/bird_sim.js` imprime as distâncias e os atalhos de cada mapa e `node tools/birdmaze/readme_table.js` a tabela das fases do Passarinho.
Os testes do ranking compartilhado usam um servidor de mentira com a mesma API do Firebase Realtime Database; o jogo **não foi testado contra um Firebase de verdade**.

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Notas
- Sem som no aparelho? Os navegadores só liberam o áudio depois do primeiro toque, clique ou tecla do jogador; use **Som: ligado** no menu ou a tecla **M**.
