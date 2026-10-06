# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1**.

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).

## Controles
WASD ou setas movem o personagem.

## Objetivo
Você é um cachorrinho. Colete as 5 rações espalhadas pela arena (100 pontos cada) e chegue à saída, que só libera com as 5 rações. Fuja do veterinário: se ele encostar no cachorrinho, a partida acaba.

Na Fase 1 há um único veterinário: ele é lento, patrulha o mapa e quase não persegue. Ao ganhar, um bônus de tempo é somado à pontuação.

## Estrutura
```
index.html      canvas e telas (menu, vitória e derrota)
css/style.css   visual das telas
js/game.js      mapa, cachorro, rações, veterinário (IA), HUD, estados e loop
tests/e2e.js    teste automatizado no navegador (veja abaixo)
.github/workflows/pages.yml   publicação no GitHub Pages
```

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Testes
```
npm i playwright
npx playwright install chromium   # ou use CHROMIUM_PATH=/caminho/do/chromium
node tests/e2e.js
```

## Notas
- Ainda não há som.
- Só há suporte a teclado (sem toque ou gamepad).
