# Jogo 2D top-down (sem nome ainda)

Versão atual: **Fase 1**.

Jogo 2D feito com HTML5 Canvas e JavaScript puro, sem dependências nem etapa de build.

## Como jogar
- **Online:** https://gabrielbraga297-tech.github.io/meujogo2d/ (disponível depois de ativar o GitHub Pages; veja abaixo).
- **Local:** abra `index.html` em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).

## Controles
WASD ou setas movem o personagem.

## Objetivo
Colete os 5 itens espalhados pela arena e chegue à área de saída. A saída só libera com os 5 itens.

## Estrutura
```
index.html      canvas e telas (menu e vitória)
css/style.css   visual das telas
js/game.js      mapa, colisão, coleta, HUD, estados e loop
.github/workflows/pages.yml   publicação no GitHub Pages
```

## Publicar no GitHub Pages
Em *Settings → Pages → Build and deployment → Source*, escolha **GitHub Actions**. A cada push na `main`, o workflow publica o jogo.

## Notas
- Ainda não há som.
- Só há suporte a teclado (sem toque ou gamepad).
