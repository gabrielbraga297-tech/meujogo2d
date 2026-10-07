# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1, Fase 2, Fase 3 e Fase 4**.

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Versão
A versão do jogo aparece no **menu inicial** (canto inferior esquerdo), por exemplo "Versão 0.5.0 · 07/10/2026". No GitHub Pages ela também mostra o código do commit ("· build abc1234"), que diz exatamente qual atualização está no ar. O histórico de mudanças está no [`CHANGELOG.md`](CHANGELOG.md); para publicar uma atualização, mude `js/version.js` e o `CHANGELOG.md` (o teste `node tests/version.test.js` confere se combinam).

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), no computador, celular ou tablet.

## Objetivo
Você é um cachorrinho. Pegue **todas** as tigelas de ração (e, a partir da Fase 3, também os **ossos**) e chegue à saída, que só abre quando você pegar tudo. Os itens aparecem em **lugares diferentes a cada jogo**, e **alguns trazem uma vida extra** (têm um coração em cima).

Fuja do veterinário! Quando aparece um **!** vermelho em cima dele, ele fica mais rápido e persegue o cachorrinho com mais força (mas o cachorrinho ainda é mais veloz).

## Fases
| | Fase 1 | Fase 2 | Fase 3 | Fase 4 |
|---|---|---|---|---|
| Mapa | o original | **outro mapa** (quatro salas nos cantos ligadas a um salão central) | **armazém** com corredores, nichos e portas de bloco | **labirinto grande** (41 × 29 tiles; a câmera segue o cachorrinho) |
| Rações | 5 | **7** | **7** | **10** |
| Ossos (50 pontos cada) | — | — | **2** (é preciso pegar todos para sair) | **2**, e agora dão **poder** |
| Vida extra escondida | 1 ração | **1 ou 2** rações (sorteado a cada jogo) | **1**, numa ração **ou** num osso | **3** (no máximo 1 num osso) |
| Veterinários | 1 | **2**, no **centro** do mapa | **2**, no **centro** do mapa | **3**, no **centro** do mapa |
| Dificuldade dos veterinários | base | **10% mais espertos** | **mais 10% de velocidade** sobre a Fase 2 | **mais 10% de velocidade** sobre a Fase 3 |
| Cachorrinho | 180 px/s | 180 px/s | 162 px/s (−10%) | **170,1 px/s** (+5% sobre a Fase 3) |
| Blocos que se movem | — | — | **2** (portas que abrem e fecham) | **3**, e agora **esmagam** |
| Pontos | 100 por ração; −50 por vida | idem | idem (+50 por osso) | idem, **−200 por vida** e é preciso **fazer 800 pontos na fase** para passar |
| Bônus de tempo | 0 a 100 (10 a cada 10 s) | 0 a 100 (10 a cada 10 s) | **0 a 200 (20 a cada 10 s)** | 0 a 200 (20 a cada 10 s) |

Cada fase é liberada ao terminar a anterior. Em **Iniciar jogo** (depois que a Fase 2 está liberada) aparece a escolha de fase, e ao vencer uma fase há o botão **Próxima fase**.

**Fase 3, os blocos:** dois blocos deslizam por trilhos curtos e abrem e fecham as portas dos dois corredores de cima. Eles **mudam de lado a cada 3 segundos** (`blockEvery` da fase, em `js/game.js`), sem esperar ninguém chegar perto, e deslizam a 120 px/s (cerca de 0,27 s por mudança). Nos 0,6 s antes de cada mudança o **trilho pisca em amarelo**. Eles **nunca esmagam**: se o cachorrinho ou um veterinário estiver no lugar para onde o bloco vai, ele é **empurrado para o lado** livre mais perto (só se não houvesse mesmo onde pô-lo o bloco ficaria parado). Cada porta tem um caminho alternativo, então **sempre sobra um caminho** (o teste confere isso para todas as combinações de posição dos blocos). Um bloco fechado tapa a visão dos veterinários e eles esperam diante dele.

**Fase 4, o poder do osso:** pegar um osso liga o **poder** por **30 segundos** (o placar mostra *PODER* contando): os veterinários viram **carteiros** (azuis), que **não perseguem nem pegam** o cachorrinho, e quem **encosta num carteiro ganha dele**: o carteiro sai de cena até o poder acabar e volta ao seu posto como veterinário. Pegar o outro osso com o poder ligado **recomeça** os 30 s (não soma). Quando o poder acaba, o cachorrinho ganha **1 s de proteção** (um veterinário que volte em cima dele não o pega na hora). Com o poder o cachorrinho também **não é esmagado** pelos blocos. Na Fase 3 os ossos só valem 50 pontos (sem poder). O tempo do poder é `bonePower` da fase.

**Fase 4, os blocos que esmagam:** os 3 blocos mudam de lado a cada 3 s como na Fase 3, mas agora, se um bloco alcança o cachorrinho (sem o poder do osso e fora da proteção de 2 s depois de perder uma vida), ele é **esmagado**: perde 1 vida e 200 pontos. O trilho pisca antes de cada mudança. Os veterinários continuam sendo empurrados, não esmagados. É `crush: true` da fase.

**Fase 4, pontos mínimos:** cada vida perdida custa **200 pontos** (`lifePenalty`) e, para passar da fase, é preciso chegar à saída com **pelo menos 800 pontos nessa fase** (`minPoints`; vale a pontuação da fase, não o total). O placar mostra *PONTOS 450 / 800*. Se você pega tudo mas chega à saída com menos de 800, a fase **não é concluída** (nada é guardado) e aparece *Faltaram pontos para passar!*, com o botão *Tentar novamente* (do zero, −100 pontos, até 3 vezes).

**Fase 4, o mapa:** um labirinto de 41 × 29 tiles (a tela mostra uma parte e a câmera segue o cachorrinho), com corredores de 1 tile, algumas salas e o salão central dos 3 veterinários. As 3 portas de bloco ficam em passagens que têm caminho alternativo: o teste confere que, com os blocos em qualquer posição (8 combinações), todo o chão continua ligado.

**Velocidade do cachorrinho:** 180 px/s nas Fases 1 e 2, **162 px/s na Fase 3** (10% mais lento) e **170,1 px/s na Fase 4** (5% mais rápido que na Fase 3).

**Velocidade dos veterinários:**

| | sem o "!" (patrulhando) | com o "!" (perseguindo) |
|---|---|---|
| Fase 1 | **50** px/s | **100** px/s |
| Fase 2 (+10% nos dois) | **55** px/s | **110** px/s |
| Fase 3 (mais +10% sobre a Fase 2) | **60,5** px/s | **121** px/s |
| Fase 4 (mais +10% sobre a Fase 3) | **66,55** px/s | **133,1** px/s |

**Alcance do "!":** o veterinário liga o "!" **na hora** (ele olha 10 vezes por segundo, sem sorteio) em que o cachorrinho está dentro do alcance e **à vista** (sem parede ou bloco fechado no meio). O alcance é medido em linha reta, do centro de um ao centro do outro, e cresce 2 quadrados a cada fase:

| Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 (futura) |
|---|---|---|---|---|
| **2** quadrados | **4** quadrados | **6** quadrados | **8** quadrados | 10 quadrados |

Depois que o "!" liga, ele fica ligado enquanto o veterinário vê o cachorrinho (de 3 s até um limite de 6 s na Fase 1); depois ele descansa uns segundos antes de poder ligar de novo. A regra é `alertTiles` de cada fase em `js/game.js` (`2 × número da fase`).

**Os veterinários da Fase 2 são 10% mais difíceis:** velocidade (patrulha e perseguição) e duração mínima e máxima da perseguição ×1,1; e o tempo entre "olhadas", o descanso depois de perseguir e as pausas ÷1,1.

**Na Fase 3** a **velocidade** de movimento ganha mais 10% (60,5 e 121 px/s); a duração das perseguições e o descanso são os da Fase 2.

## Vidas
Você começa com **3 vidas** (corações vermelhos no placar, logo depois dos pontos) e pode ter de **1 a 5**; as vidas são **cumulativas**:

- Pegar uma ração com vida extra dá **+1 vida**, até o máximo de 5.
- As vidas que sobram ao terminar uma fase **passam para a fase seguinte** (pelo botão *Próxima fase*). Escolher uma fase no menu ou usar *Jogar novamente* começa com 3 vidas.
- Se o veterinário encosta, você perde **1 vida** e **50 pontos**. O cachorrinho **volta ao início da fase** (no mesmo lugar de quando ela começou), ganha uns segundos de proteção, o **tempo continua contando** (não zera) e **as rações que ainda não foram pegas mudam de lugar**, sorteadas de novo. As que já foram pegas continuam pegas.
- **Sem vidas:** você tem até **3 novas tentativas da fase em que está** (na Fase 2, recomeça a Fase 2). Cada nova tentativa recomeça a fase **do zero** (3 vidas, rações novas, tempo zerado) e custa **100 pontos**. Usadas as 3, só resta voltar ao menu.

## Pontuação
A pontuação da fase é: **100 por ração + 50 por osso + bônus de tempo − pontos por vida perdida (50; 200 na Fase 4) − 100 por nova tentativa**. Ela **pode ficar negativa** (por exemplo, −50 ao perder a primeira vida sem ter pegado nenhuma ração).

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
- **Continuar jogo:** no menu, retoma exatamente de onde parou (fase, rações e ossos, vidas, tentativas, tempo, posições e o ponto do ciclo dos blocos).
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
