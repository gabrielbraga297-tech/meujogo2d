# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1**.

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari), no computador, celular ou tablet.

## Objetivo
Você é um cachorrinho. Pegue as 5 tigelas de ração e chegue à saída, que só abre com as 5. As rações aparecem em **lugares diferentes a cada jogo**, e **uma delas traz uma vida extra** (tem um coração em cima).

Fuja do veterinário! Quando aparece um **!** vermelho em cima dele, ele fica mais rápido e persegue o cachorrinho com mais força (mas o cachorrinho ainda é mais veloz).

## Vidas
Você começa com **3 vidas** (corações vermelhos no placar, logo depois dos pontos) e pode ter de **1 a 5**. Se o veterinário encosta, você perde 1 vida e **50 pontos**; o cachorrinho volta ao início com uns segundos de proteção. Pegar a ração com a vida extra dá +1 vida; com 5 vidas, ela não passa do máximo. Sem vidas, a fase recomeça.

## Pontuação
A pontuação da fase é: **100 por ração + bônus de tempo − 50 por vida perdida** (nunca abaixo de 0).

| Terminou em | Bônus de tempo |
|---|---|
| até 20 s | 100 |
| até 30 s | 90 |
| até 40 s | 80 |
| … (−10 a cada 10 s a mais) | … |
| até 110 s | 10 |
| mais de 110 s | 0 |

- **Na mesma fase vale só a MAIOR pontuação** (jogar de novo não soma). Em caso de empate, vale o menor tempo.
- **Fases diferentes se somam:** a pontuação total é a soma da melhor pontuação de cada fase.
- O tempo oficial é arredondado ao décimo de segundo.

## Menu
- **Iniciar jogo** (e **Continuar jogo**, quando há um jogo salvo)
- **Como jogar**
- **Pontuações:** pontuação total, melhor pontuação por fase, recorde geral, rankings e histórico
- **Escolher nome de usuário:** o nome pode ser o de um cachorrinho (ex.: Totó). Ele fica salvo para as próximas vezes.

## Controles
| | |
|---|---|
| Mover | **W A S D** ou **setas** (tecla física, vale em qualquer layout de teclado) · no celular/tablet, o controle redondo na tela |
| Pausar | **Esc**, **P** ou o botão de pausa no placar |
| Menus | setas ↑ ↓ para mudar de botão, **Enter**/**Espaço** para escolher, **Esc** para voltar |

## Salvar
- **Salvamento automático:** a cada 5 segundos, ao pegar uma ração, ao perder uma vida, ao pausar e ao fechar a página.
- **Salvar jogo:** botão na tela de pausa.
- **Continuar jogo:** no menu, retoma exatamente de onde parou (rações, vidas, tempo e posições).
- O **progresso por fase** (fases concluídas e a próxima liberada) também é guardado. Ainda só existe a Fase 1.
- Terminar a fase ou ficar sem vidas apaga o jogo em andamento; os recordes ficam.

Tudo é guardado no navegador do aparelho (`localStorage`). Por isso o "recorde geral" vale para **todos os jogadores deste navegador**; para um ranking online seria preciso um servidor. Se o navegador bloquear o armazenamento (ex.: modo restrito), o jogo funciona e avisa que os dados valem só até fechar a página.

## Tela e aparelhos
O jogo ocupa o máximo da tela mantendo a proporção 25:18 e fica nítido em telas de alta densidade. Em telas pequenas (celular em pé) a câmera aproxima e segue o cachorrinho; em celular deitado ou tablet o controle de toque fica ao lado ou abaixo do jogo. Para ver os controles de toque no computador, abra `index.html?touch=1`.

## Estrutura
```
index.html            canvas, placar (HTML) e todas as telas (menu, como jogar, pontuações, nome, pausa, vitória, derrota)
css/style.css         visual, tamanho proporcional e controle de toque
js/records.js         nome do jogador, recordes, progresso e jogo salvo (testável sozinho)
js/game.js            mapa, cachorro, rações, veterinário (IA), vidas, telas, salvamento, toque e desenho
tests/records.test.js testes unitários do módulo de recordes (Node)
tests/e2e.js          testes no navegador (Playwright)
.github/workflows/pages.yml   publicação no GitHub Pages
```

## Testes
```
node tests/records.test.js     # unitários, só precisa do Node
npm i playwright
npx playwright install chromium   # ou use CHROMIUM_PATH=/caminho/do/chromium
node tests/e2e.js              # opcional: node tests/e2e.js "toque" roda só as seções com esse texto
```

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Notas
- Ainda não há som.
- Não há suporte a gamepad.
