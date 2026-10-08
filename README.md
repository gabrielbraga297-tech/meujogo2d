# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1 a Fase 10**.

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Versão
A versão do jogo aparece no **menu inicial** (canto inferior esquerdo), por exemplo "Versão 0.7.0 · 08/10/2026". No GitHub Pages ela também mostra o código do commit ("· build abc1234"), que diz exatamente qual atualização está no ar. O histórico de mudanças está no [`CHANGELOG.md`](CHANGELOG.md); para publicar uma atualização, mude `js/version.js` e o `CHANGELOG.md` (o teste `node tests/version.test.js` confere se combinam).

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), no computador, celular ou tablet.

## Objetivo
Você é um cachorrinho. Pegue as tigelas de ração (e, a partir da Fase 2, os **ossos**) e chegue à saída. Nas Fases 1 a 3 a saída só abre quando você pegar **tudo**; nas **Fases 4 a 10** ela abre assim que a sua pontuação na fase chega aos **pontos mínimos** (800 na Fase 4, 1000 na 5 e de 1250 a 2050 nas Fases 6 a 10), sem precisar pegar tudo. Os itens aparecem em **lugares diferentes a cada jogo**, e **alguns trazem uma vida extra** (escondida: você só descobre ao pegar o item).

**O tempo só começa a correr quando você dá o primeiro passo** (em todas as fases): até lá o relógio, os veterinários e os blocos ficam parados, e um aviso na tela lembra disso. O mesmo vale ao **continuar um jogo salvo** com o tempo em 0 e ao **tentar a fase de novo**.

Fuja do veterinário! Quando aparece um **!** vermelho em cima dele, ele fica mais rápido e persegue o cachorrinho com mais força (mas o cachorrinho é bem mais veloz). Os veterinários **não andam juntos**: cada um escolhe a patrulha longe dos outros, não ficam colados nem um em cima do outro, e, perseguindo, tentam caminhos diferentes até o cachorrinho.

## Tabela das fases
Esta tabela é conferida por um teste automático com os dados do jogo (`node tests/e2e.js "tabela das fases"`) e deve ser entregue de novo **sempre que uma fase nova for criada**.

| Fase | Condição para avançar | Veterinários | Rações | Ossos | Velocidade dos veterinários (sem ! / com !) | Velocidade do cachorrinho |
|---|---|---|---|---|---|---|
| 1 | pegar as 5 rações e chegar à saída | 1 | 5 | 0 | 55 / 110 px/s | 252 px/s |
| 2 | pegar as 7 rações e os 2 ossos e chegar à saída | 2 | 7 | 2 | 60,5 / 121 px/s | 252 px/s |
| 3 | pegar as 7 rações e os 2 ossos e chegar à saída | 2 | 7 | 2 | 66,55 / 133,1 px/s | 226,8 px/s |
| 4 | chegar a 800 pontos na fase (a saída abre) e sair | 3 | 15 | 2 | 73,21 / 146,41 px/s | 238,14 px/s |
| 5 | chegar a 1000 pontos na fase (a saída abre) e sair | 3 | 20 | 2 | 73,21 / 146,41 px/s | 238,14 px/s |
| 6 | chegar a 1250 pontos na fase (a saída abre) e sair | 3 | 24 | 3 | 76,14 / 152,27 px/s | 241,92 px/s |
| 7 | chegar a 1400 pontos na fase (a saída abre) e sair | 4 | 28 | 3 | 79,07 / 158,12 px/s | 244,44 px/s |
| 8 | chegar a 1650 pontos na fase (a saída abre) e sair | 5 | 32 | 4 | 82 / 163,98 px/s | 246,96 px/s |
| 9 | chegar a 1800 pontos na fase (a saída abre) e sair | 5 | 36 | 4 | 84,92 / 169,84 px/s | 249,48 px/s |
| 10 | chegar a 2050 pontos na fase (a saída abre) e sair | 6 | 40 | 5 | 87,85 / 175,69 px/s | 252 px/s |

- A velocidade do cachorrinho **sobe 10% a cada osso pego** (até o fim da fase). Os números acima são a velocidade base de cada fase (na 0.7.0 a do cachorrinho é 0,7 × a da 0.6.0: 360 → 252 px/s; a Fase 3 usa 90% e as Fases 4 e 5 usam 94,5%; os veterinários ganharam +10% em todas as fases).
- Um **carteiro** atingido pelo cachorrinho com poder volta ao centro do mapa e anda **50% mais devagar** que a velocidade da fase (até o poder acabar).
- **Fase 3 no celular:** quando se joga com o **controle de toque** (menos preciso que teclado), a Fase 3 fica um pouco mais fácil: os veterinários andam **10% mais devagar** (59,9 / 119,8 px/s) e o cachorrinho fica **5% mais rápido** (238,14 px/s). Com teclado ou controle de videogame valem os números da tabela (campo `touchEase` da fase, em `js/game.js`).
- As fases são liberadas em ordem: cada uma abre ao terminar a anterior.

## Fases
| | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 |
|---|---|---|---|---|---|
| Mapa | o original | **outro mapa** (quatro salas nos cantos ligadas a um salão central) | **armazém** com corredores, nichos e portas de bloco | **labirinto grande** (41 × 29 tiles; a câmera segue o cachorrinho) | **outro labirinto grande**, com salas de paredes que se movem |
| Rações | 5 | **7** | **7** | **15** | **20** |
| Ossos | — | **2** (poder de 30 s) | **2** (poder de 30 s) | **2** (poder de 30 s) | **2** (poder de **35 s**) |
| Vida extra escondida (sem aviso: só se descobre ao pegar o item) | 1 ração | **1 ou 2** itens (sorteado a cada jogo) | **1 ou 2** (no máximo 1 num osso) | **3** (no máximo 1 num osso) | **4** (no máximo 1 num osso) |
| Veterinários | 1 | **2**, no **centro** do mapa | **2**, no **centro** do mapa | **3**, no **centro** do mapa | **3**, no **centro** do mapa |
| Dificuldade dos veterinários | base | **10% mais espertos** | **mais 10% de velocidade** sobre a Fase 2 | **mais 10% de velocidade** sobre a Fase 3 | igual à Fase 4 |
| Blocos que se movem | — | — | de **1 a 2** portas (sorteado a cada jogo) | de **1 a 3** portas, e agora **esmagam** | de **1 a 3** portas que esmagam **+ de 1 a 3 paredes** que se movem a cada 10 s |
| Pontos | 100 por ração; −50 por vida | idem, **+150 por osso** e **+100 por carteiro** | idem | idem, **−200 por vida** e **800 pontos** para passar | −200 por vida e **1000 pontos** para passar |
| Bônus de tempo | 0 a 100 (10 a cada 10 s) | 0 a 100 (10 a cada 10 s) | **0 a 200 (20 a cada 10 s)** | 0 a 200 (20 a cada 10 s) | 0 a 200 (20 a cada 10 s) |

### Fases 6 a 10 (0.7.0)
Labirintos cada vez maiores, a partir da Fase 5: mais rações, mais ossos, **mais veterinários** (3, 4, 5, 5 e 6, proporcional ao tamanho do mapa), veterinários mais rápidos (+4% por fase sobre a Fase 5) e mais blocos e paredes que se movem (o número de peças de cada tipo é **sorteado a cada jogo** dentro de uma faixa). O cachorrinho sobe só um pouco de velocidade por fase para continuar mais rápido que o veterinário perseguindo (pelo menos 40% mais).

| | Fase 6 | Fase 7 | Fase 8 | Fase 9 | Fase 10 |
|---|---|---|---|---|---|
| Mapa | 45 × 31 | 49 × 33 | 53 × 35 | 57 × 37 | 61 × 39 |
| Rações / ossos | 24 / 3 | 28 / 3 | 32 / 4 | 36 / 4 | 40 / 5 |
| Veterinários (no centro do mapa) | 3 | 4 | 5 | 5 | 6 |
| Vidas escondidas (sorteio por jogo) | 3 ou 4 (no máximo 1 num osso) | 3 ou 4 | 3 ou 4 | 3 ou 4 | 3 ou 4 |
| Alcance do "!" | 11 quadrados | 12 | 13 | 14 | 15 |
| Portas de bloco / paredes (definidas) | 4 / 4 | 5 / 4 | 5 / 5 | 6 / 6 | 6 / 6 |
| Sorteio por jogo (portas; paredes) | 2–4; 2–4 | 3–5; 2–4 | 3–5; 3–5 | 4–6; 4–6 | 5–6; 5–6 |
| Portas mudam de lado a cada | 3 s | 3 s | 3 s | **2,5 s** (160 px/s) | **2 s** (200 px/s) |
| Paredes mudam de lado a cada | 10 s | 10 s | 10 s | **8 s** (140 px/s) | **6 s** (160 px/s) |
| Perda por vida / pontos para passar | −250 / 1250 | −250 / 1400 | −250 / 1650 | −300 / 1800 | −300 / 2050 |
| Poder do osso | 35 s | 35 s | 35 s | 35 s | 35 s |
| Ao ser pego ou esmagado | volta ao início | volta ao início | volta ao início | **renasce onde morreu** | **renasce onde morreu** |

Nas **Fases 9 e 10** o cachorrinho **renasce onde morreu** (se um bloco ou parede estiver em cima, é empurrado para o lado livre mais perto), com a proteção de 2 s de sempre; os veterinários voltam aos postos. Os mapas foram gerados por script e conferidos: em **qualquer** posição das peças móveis todo o chão continua ligado.

Cada fase é liberada ao terminar a anterior. Em **Iniciar jogo** (depois que a Fase 2 está liberada) aparece a escolha de fase, e ao vencer uma fase há o botão **Próxima fase**. No menu, **Jogar fases anteriores** (aparece depois de concluir alguma fase) leva às fases já concluídas para **melhorar o recorde** de cada uma: só a maior pontuação de cada fase vale, e a pontuação total é a soma do melhor de cada fase (jogar uma fase de novo ou pular para outra não soma partidas, só pode subir o recorde daquela fase).

**O osso (a partir da Fase 2):** cada osso vale **150 pontos** (50 do osso + 100 de bônus), deixa o cachorrinho **10% mais rápido** (soma, até o fim da fase) e liga o **poder** por **30 segundos** (**35 s nas Fases 5 a 10**; o placar mostra *PODER* contando): os veterinários viram **carteiros** (azuis), que **não perseguem nem pegam** o cachorrinho, e quem **encosta num carteiro ganha dele** e **+100 pontos**: o carteiro volta ao **centro do mapa**, tonto por 2 s, e fica **50% mais lento** até o poder acabar. **Cada carteiro rende pontos uma vez por poder** (pegar outro osso renova o poder e todos podem ser pegos de novo), então não adianta ficar parado no posto dele. Pegar o outro osso com o poder ligado **recomeça** a contagem (não soma). Quando o poder acaba, os carteiros voltam a ser veterinários e o cachorrinho ganha **1 s de proteção**. Com o poder o cachorrinho também **não é esmagado** pelos blocos. O tempo do poder é `bonePower` da fase.

**Os blocos (a partir da Fase 3):** deslizam por trilhos curtos e abrem e fecham as portas dos corredores. Eles **mudam de lado a cada 3 segundos** (`blockEvery` da fase, em `js/game.js`), sem esperar ninguém chegar perto, e deslizam a 120 px/s (cerca de 0,27 s por mudança). **A quantidade de blocos é sorteada a cada jogo** (`blockRange`: Fase 3 de 1 a 2 portas; Fase 4 de 1 a 3; Fase 5 de 1 a 3 portas e de 1 a 3 paredes; Fases 6 a 10, veja a tabela acima), e também quais. Nos 0,6 s antes de cada mudança o **trilho pisca em amarelo**. Nas Fases 1 a 3 eles **nunca esmagam**: quem estiver no lugar para onde o bloco vai é **empurrado para o lado**. Cada porta tem um caminho alternativo, então **sempre sobra um caminho** (o teste confere isso para todas as combinações de posição dos blocos).

**Fases 4 a 10, os blocos que esmagam:** se um bloco alcança o cachorrinho (sem o poder do osso e fora da proteção de 2 s depois de perder uma vida), ele é **esmagado**: perde 1 vida e os pontos da fase (200, 250 ou 300). Os veterinários continuam sendo empurrados, não esmagados. É `crush: true` da fase.

**Fases 4 a 10, pontos mínimos:** cada vida perdida custa **200 pontos** nas Fases 4 e 5, **250** nas Fases 6 a 8 e **300** nas Fases 9 e 10 (`lifePenalty`), e a saída **abre quando a pontuação corrente da fase** (rações + ossos + carteiros − vidas perdidas − tentativas, ainda sem o bônus de tempo) **chega a 800** (**1000 na Fase 5**, de **1250 a 2050** nas Fases 6 a 10): não é preciso pegar todos os itens (por isso há mais rações disponíveis). O placar mostra *PONTOS 450 / 800* e um aviso diz quando a meta foi atingida; se uma vida perdida derrubar a pontuação abaixo da meta, a saída fecha de novo. Se todos os itens já foram pegos, o poder acabou e a pontuação ainda não chega à meta, não há mais como passar: a tentativa termina (*Os pontos não bastaram!*, com a explicação de que o jogador pegou tudo mas a pontuação ficou abaixo do mínimo) e vale a regra das novas tentativas.

**Fase 4, o mapa:** um labirinto de 41 × 29 tiles (a tela mostra uma parte e a câmera segue o cachorrinho), com corredores de 1 tile, algumas salas e o salão central dos 3 veterinários. As portas de bloco ficam em passagens que têm caminho alternativo: o teste confere que, com os blocos em qualquer posição, todo o chão continua ligado.

**Fase 5, as paredes que se movem:** além das portas de bloco, há **3 salas com uma parede de 3 tiles que desliza a cada 10 segundos** (cada parede começa o ciclo num ponto diferente: aos 10 s, 7 s e 4 s): a parede vai de uma parede fixa à outra da sala e a abertura de 2 tiles que sobra **muda de lugar**, formando um caminho novo. O trilho pisca em amarelo nos **2 s** antes de cada mudança. As paredes que se movem **esmagam** como os blocos (sem o poder do osso, quem estiver no lugar para onde a parede vai perde uma vida), e os veterinários são empurrados.

**Velocidade do cachorrinho:** veja a tabela acima (252 px/s na base, 226,8 na Fase 3, 238,14 nas Fases 4 e 5, e +10% por osso).

**Velocidade dos veterinários:**

| | sem o "!" (patrulhando) | com o "!" (perseguindo) |
|---|---|---|
| Fase 1 | **55** px/s | **110** px/s |
| Fase 2 (+10% nos dois) | **60,5** px/s | **121** px/s |
| Fase 3 (mais +10% sobre a Fase 2) | **66,55** px/s | **133,1** px/s |
| Fase 4 (mais +10% sobre a Fase 3) | **73,21** px/s | **146,41** px/s |
| Fase 5 (igual à Fase 4) | **73,21** px/s | **146,41** px/s |

**Alcance do "!":** o veterinário liga o "!" **na hora** (ele olha 10 vezes por segundo, sem sorteio) em que o cachorrinho está dentro do alcance e **à vista** (sem parede ou bloco fechado no meio). O alcance é medido em linha reta, do centro de um ao centro do outro, e cresce 2 quadrados a cada fase até a Fase 5 (nas Fases 6 a 10 sobe de 11 a 15, veja a tabela das Fases 6 a 10):

| Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 |
|---|---|---|---|---|
| **2** quadrados | **4** quadrados | **6** quadrados | **8** quadrados | **10** quadrados |

Depois que o "!" liga, ele fica ligado enquanto o veterinário vê o cachorrinho (de 3 s até um limite de 6 s na Fase 1); depois ele descansa uns segundos antes de poder ligar de novo. A regra é `alertTiles` de cada fase em `js/game.js` (`2 × número da fase` até a Fase 5; de 11 a 15 nas Fases 6 a 10).

**Os veterinários da Fase 2 são 10% mais difíceis:** velocidade (patrulha e perseguição) e duração mínima e máxima da perseguição ×1,1; e o tempo entre "olhadas", o descanso depois de perseguir e as pausas ÷1,1.

**Na Fase 3** a **velocidade** de movimento ganha mais 10% (66,55 e 133,1 px/s); a duração das perseguições e o descanso são os da Fase 2.

**Pausa automática:** o jogo **pausa sozinho** quando a janela perde o foco (ou a aba fica escondida) e salva ao fechar a página.

## Vidas
Você começa com **3 vidas** (corações vermelhos no placar, logo depois dos pontos) e pode ter de **1 a 5**; as vidas são **cumulativas**:

- Pegar um item (ração ou osso) com vida extra dá **+1 vida**, até o máximo de 5.
- As vidas que sobram ao terminar uma fase **passam para a fase seguinte** (pelo botão *Próxima fase*). Escolher uma fase no menu ou usar *Jogar novamente* começa com 3 vidas.
- Se o veterinário encosta, você perde **1 vida** e **50 pontos** (**200** nas Fases 4 e 5, **250** nas Fases 6 a 8 e **300** nas Fases 9 e 10). O cachorrinho **volta ao início da fase** (no mesmo lugar de quando ela começou; **nas Fases 9 e 10 ele renasce onde caiu**), ganha uns segundos de proteção, o **tempo continua contando** (não zera) e **as rações que ainda não foram pegas mudam de lugar**, sorteadas de novo. As que já foram pegas continuam pegas.
- **Sem vidas:** você tem até **3 novas tentativas da fase em que está** (na Fase 2, recomeça a Fase 2). Cada nova tentativa recomeça a fase **do zero** (3 vidas, rações novas, tempo zerado) e custa **100 pontos**. Usadas as 3, só resta voltar ao menu.

## Pontuação
A pontuação da fase é: **100 por ração + 150 por osso + 100 por carteiro (poder do osso) + bônus de tempo − pontos por vida perdida (50; 200 nas Fases 4 e 5; 250 nas Fases 6 a 8; 300 nas Fases 9 e 10) − 100 por nova tentativa**. Ela **pode ficar negativa** (por exemplo, −50 ao perder a primeira vida sem ter pegado nenhuma ração).

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
- **Como jogar**
- **Pontuações:** suas pontuações (só você) e o ranking do jogo (todos)
- **Escolher nome de usuário:** o nome pode ser o de um cachorrinho (ex.: Totó). Ele fica salvo para as próximas vezes. Ali também dá para **Criar conta** (com senha) e **Entrar**.

## Conta com senha (opcional)
Além do nome simples, dá para criar uma **conta**: nome de usuário + senha.

- **Senha:** de **4 a 20 caracteres**, com letras **minúsculas e MAIÚSCULAS**, números e símbolos (`! @ # $ …`), acentos e espaços. Números e símbolos são opcionais. O campo mostra um contador (n/20) e há "Mostrar senha".
- **Nome de usuário:** até 16 letras ou números (pode ter espaço, hífen e apóstrofo). "Totó", "toto" e "TOTÓ" são o mesmo usuário.
- **Entrar / Sair da conta:** depois de entrar, o jogo lembra de você até tocar em *Sair da conta*. Um nome que tem conta só pode ser usado entrando com a senha.
- **Esqueci a senha:** não há como recuperar (não existe servidor de contas). A saída é **apagar a conta** (com as pontuações e o jogo salvo dela, neste aparelho) e criar outra.
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
js/records.js         nome, contas, pontuação, melhores pontuações, progresso e jogo salvo (testável sozinho)
js/config.js          configuração (ranking compartilhado em stand by: sharedRanking e endereço do servidor)
js/board.js           ranking compartilhado entre aparelhos (REST / banco do Claude), em stand by, com validação (testável sozinho)
js/game.js            fases e mapas, cachorro, rações, veterinários (IA), vidas, tentativas, telas, salvamento, toque e desenho
tests/auth.test.js    testes unitários das senhas (Node)
tests/records.test.js testes unitários das pontuações e melhores pontuações (Node)
tests/accounts.test.js testes unitários do cadastro e da entrada (Node)
tests/board.test.js   testes unitários do ranking compartilhado, com servidor de mentira (Node)
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
npm i playwright
npx playwright install chromium   # ou use CHROMIUM_PATH=/caminho/do/chromium
node tests/e2e.js              # opcional: node tests/e2e.js "toque" roda só as seções com esse texto
```
Os testes do ranking compartilhado usam um servidor de mentira com a mesma API do Firebase Realtime Database; o jogo **não foi testado contra um Firebase de verdade**.

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Notas
- Ainda não há som.
