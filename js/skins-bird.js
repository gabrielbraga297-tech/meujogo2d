// As SKINS DOS OBJETOS DO JOGO DO PASSARINHO (0.20.0), registradas no catálogo único da lojinha (js/skins.js).
// Categorias deste arquivo: seed, stray, birdexit, berry, bug, roost, gust, hawk. (A categoria "bird", o passarinho que você joga, é registrada em js/game.js, com as 12 skins de BirdArt.SKINS.)
// Cada skin: { id, name, text, price, from?, ...campos visuais } (ver o contrato no topo de js/skins.js). Os campos visuais são lidos pelas funções de desenho de js/bird-art.js com `o.look` (e por js/game.js com `lookOf(categoria)`).
// Skins só mudam o VISUAL: nenhuma muda regra, velocidade, alcance, pontos, tempo, tamanho de contato nem som. Nomes e frases em português. Preço de 10 a 30 petscoin, em escada crescente. Sem nome de espécie nem de raça, sem marca.
// Um campo que falta = o visual de sempre (a skin padrão de cada categoria não tem campo nenhum, e o jogo desenha EXATAMENTE como sempre).
//
// CAMPOS VISUAIS (todas as cores são "#rrggbb"; o que está entre aspas é uma lista fechada):
//   seed (sementes: três tipos de semente, sorteados pelo jogo; ficam legíveis também à noite: cor sempre CLARA)
//     coats   lista de 1 a 3 cores { body (a semente), stripe (listras e detalhes), hi (o brilhinho) }: a semente do tipo i usa a de índice i % tamanho; sem `coats` valem as 3 de sempre
//     glow    cor de um brilhinho suave em volta da semente (sem ele o brilho é branco)
//   stray (gatos de jardim: os inimigos do chão, em todas as fases; legíveis na noite das Fases 18 e 19: pelo sempre CLARO, conferido por tests/skins-bird.test.js; o estado "congelado" tinge também estas cores)
//     coats   lista de 1 a 4 pelagens { fur, dark, light, eye }: o gato nº i usa a de índice i % tamanho (sem `coats` valem as 4 de sempre: laranja, cinza-claro, branca com manchas e creme)
//     collar  cor da coleira, ou "rainbow" (4 faixas)        tag  cor da plaquinha da coleira
//     acc     enfeite: "bandana" (lenço, estampa em `pat`: "dots" ou "check") | "bowtie" (gravata-borboleta) | "hat" (chapéu de festa) | "bow" (laço na cabeça)
//     c1, c2  as duas cores do enfeite (c1 = a principal; c2 = bolinhas, xadrez, pompom ou nó)
//   birdexit (o ninho da saída; MESMOS campos das saídas dos outros jogos: o brilho continua verde aberto e vermelho fechado em todas as skins, o enfeite só acompanha)
//     deco    "stripes" (listras nos gravetos) | "rainbow" (faixas de arco-íris por dentro do anel) | "stars" (estrelinhas) | "frame" (moldura com cantos redondos)  +  mark (a cor dele)
//     (reservados: open e closed, a cor do brilho aberto e fechado; nenhuma skin os usa de propósito, e o teste confere)
//   berry (frutos: os 5 tipos de poder continuam distintos por COR e por marquinha com qualquer skin)
//     pat     estampa por cima do fruto: "stripes" | "dots" | "hearts" | "stars" ("rainbow" também é aceito pelo desenho; nenhuma skin o usa hoje). É só enfeite branco ou pequeno: a cor-CHAVE do tipo
//             (fill, strand, hi, glow, em BirdArt.FRUIT_KEYS) e a marquinha (asinha, estrela, floco, raio, ímã) nunca mudam, e NENHUMA skin pode ter um campo fill/strand/hi/glow/kind (tests/skins-bird.test.js confere)
//   bug (minhocas: só valem com a minhoca fora da terra; o montinho de terra em que ela se esconde é sempre o mesmo; legíveis na noite: cor sempre CLARA)
//     coats   lista de 1 a 4 cores { body, belly, band }: a minhoca de `hue` h usa a de índice h % tamanho (sem `coats` valem as 4 de sempre: rosa, salmão, lilás e ocre)
//     acc     enfeite na cabeça: "cap" (gorrinho de tricô) | "bow" (laço) | "scarf" (cachecol), com as cores c1 e c2 (c2 = pompom, nó ou listras)
//   roost (poleiros "G": no lugar do galho do ambiente, em qualquer fase; o passarinho continua a salvo em cima)
//     style   "branch" (galho com folhas e flores) | "bamboo" (bambu) | "swing" (balanço de cordas) | "house" (casinha de passarinho)
//     top, face, edge, acc1, acc2   cores do topo, da frente, do contorno e dos detalhes (cada estilo tem as suas de sempre; branch: acc1 folhas, acc2 flores · bamboo: acc1 nós, acc2 folhas ·
//             swing: acc1 cordas, acc2 pontas do assento · house: acc1 a porta, acc2 o acabamento)
//   gust (ventos "> < ^ v": as fitas de ar e a setinha desenhadas por cima do chão do tile de vento; mudam SÓ o estilo e a cor delas, nunca a direção, a força nem o chão)
//     style   "ribbons" (fitas de ar compridas, as de sempre) | "dashes" (tracinhos curtos) | "puffs" (bolinhas que correm)
//     c1, c2  c1 = a cor das fitas (ou dos tracinhos e das bolinhas); c2 = a cor da setinha que mostra a direção. Quem lê é o ambiente (BirdThemes, `g.look` em `wind(g)`); sem os campos o vento é o de sempre do ambiente
//   hawk (gaviões: os inimigos que voam, nas Fases 11 a 20; legíveis na noite: pena sempre CLARA, conferido por tests/skins-bird.test.js; o estado "congelado" tinge também estas cores)
//     coats   lista de 1 a 3 pelagens { fur, dark, light, wing }: o gavião nº i usa a de índice i % tamanho (sem `coats` valem as 3 de sempre: pardo, cinzento e ruivo)
//     acc     enfeite: "scarf" (cachecol) | "hat" (chapéu de festa) | "bow" (laço) | "band" (faixa na cabeça), com as cores c1 e c2
(function () {
  "use strict";
  if (typeof Skins === "undefined") return;

  // ---- sementes (F1): a padrão tem 3 tipos (creme listrada, dourada e redonda com broto) ----
  Skins.register("seed", [
    { id: "algodao", name: "Algodão-doce", text: "sementes rosa, azuis e lilás", price: 10,
      coats: [
        { body: "#f6b3cf", stripe: "#b2487f", hi: "#fff1f7" },
        { body: "#a9d4f6", stripe: "#3f78b0", hi: "#eef8ff" },
        { body: "#d2bdf5", stripe: "#7a52b8", hi: "#f6f0ff" },
      ] },
    { id: "douradas", name: "Sementes douradas", text: "sementes de ouro com um brilho amarelo", price: 14, glow: "#ffe27a",
      coats: [
        { body: "#ffd75a", stripe: "#b9841c", hi: "#fff6c8" },
        { body: "#ffe27a", stripe: "#c79a2a", hi: "#fffbe0" },
        { body: "#f6c944", stripe: "#a87812", hi: "#fff0a8" },
      ] },
    { id: "coloridas", name: "Sementes coloridas", text: "vermelha, verde e azul, como balas", price: 20,
      coats: [
        { body: "#ff8a80", stripe: "#b3362e", hi: "#ffe0dc" },
        { body: "#8fe08a", stripe: "#2f8a3a", hi: "#e4ffe0" },
        { body: "#8fc4ff", stripe: "#2f66b8", hi: "#e3f1ff" },
      ] },
    { id: "gelo", name: "Sementes de gelo", text: "sementes branquinhas com um brilho azul", price: 26, glow: "#8fd8ff",
      coats: [
        { body: "#f4f8ff", stripe: "#5f78c8", hi: "#ffffff" },
        { body: "#e4f1ff", stripe: "#4f86c8", hi: "#ffffff" },
        { body: "#ecf4ff", stripe: "#6a74d0", hi: "#ffffff" },
      ] },
  ], { name: "Creme, dourada e com broto", text: "as sementes de sempre (grátis)" });

  // ---- gatos de jardim (F1): a padrão não usa coleira e tem 4 pelagens (laranja, cinza-claro, branca com manchas e creme) ----
  Skins.register("stray", [
    { id: "azul", name: "Coleira azul", text: "coleira azul-clara com plaquinha prateada", price: 10, collar: "#2f9ad8", tag: "#e3e9f0" },
    { id: "lenco", name: "Lenço verde", text: "lenço verde de bolinhas brancas", price: 15, acc: "bandana", pat: "dots", c1: "#3fae5a", c2: "#ffffff" },
    { id: "sorvete", name: "Gatos de sorvete", text: "pelos cor de morango, menta, baunilha e uva", price: 21,
      coats: [
        { fur: "#ffc2d9", dark: "#e48fb0", light: "#fff0f6", eye: "#6bb7ff" },
        { fur: "#bfeed2", dark: "#7cc79a", light: "#f0fff5", eye: "#ff9ec4" },
        { fur: "#fff1c9", dark: "#e0c27a", light: "#fffbea", eye: "#58b0ff" },
        { fur: "#dccbff", dark: "#a98be6", light: "#f7f2ff", eye: "#6bd36b" },
      ] },
    { id: "festa", name: "Gato de festa", text: "coleira roxa e chapéu de aniversário", price: 28, collar: "#7b4fd0", tag: "#ffe14a", acc: "hat", c1: "#ff6fb0", c2: "#ffe14a" },
  ], { name: "Gato sem coleira", text: "os gatos de jardim de sempre (grátis)" });

  // ---- o ninho da saída (F1): as mesmas ideias das saídas dos outros jogos ----
  Skins.register("birdexit", [
    { id: "listras", name: "Ninho listrado", text: "gravetos com listras brancas", price: 10, deco: "stripes", mark: "#ffffff" },
    { id: "arco-iris", name: "Ninho arco-íris", text: "faixas coloridas por dentro do ninho", price: 16, deco: "rainbow" },
    { id: "estrelas", name: "Ninho estrelado", text: "estrelinhas amarelas em volta dos ovinhos", price: 22, deco: "stars", mark: "#ffe066" },
    { id: "dourado", name: "Ninho dourado", text: "moldura de ouro com cantos brilhantes", price: 30, deco: "frame", mark: "#d4a017" },
  ], { name: "Ninho clássico", text: "o ninho de sempre (grátis)" });

  // ---- frutos (F2): a cor de cada poder é a mesma com qualquer skin; a skin só põe uma estampa por cima ----
  Skins.register("berry", [
    { id: "listrado", name: "Fruto listrado", text: "listras brancas; o poder continua na mesma cor", price: 10, pat: "stripes" },
    { id: "bolinhas", name: "Fruto de bolinhas", text: "bolinhas brancas; o poder continua na mesma cor", price: 14, pat: "dots" },
    { id: "coracoes", name: "Fruto de corações", text: "coraçõezinhos brancos; o poder continua na mesma cor", price: 20, pat: "hearts" },
    { id: "estrelas", name: "Fruto estrelado", text: "estrelinhas brancas; o poder continua na mesma cor", price: 26, pat: "stars" },
  ], { name: "Fruto liso", text: "os frutos de sempre (grátis)" });

  // ---- minhocas (F2): cor sempre clara, para aparecerem na noite ----
  Skins.register("bug", [
    { id: "algodao", name: "Algodão-doce", text: "minhocas rosa, azuis, lilás e verde-menta", price: 10,
      coats: [
        { body: "#f6b3cf", belly: "#ffe1ee", band: "#d97aa6" },
        { body: "#a9d4f6", belly: "#e0f1ff", band: "#6aa4d6" },
        { body: "#d2bdf5", belly: "#efe6ff", band: "#a68bdc" },
        { body: "#b4ecd0", belly: "#e2fbef", band: "#6cc79c" },
      ] },
    { id: "gorro", name: "Gorro de tricô", text: "gorrinho azul com pompom", price: 15, acc: "cap", c1: "#3f86e0", c2: "#ffffff" },
    { id: "laco", name: "Laço de fita", text: "laço rosa com nó amarelo", price: 21, acc: "bow", c1: "#ff5fa2", c2: "#ffe14a" },
    { id: "cachecol", name: "Cachecol listrado", text: "cachecol verde e branco no pescoço", price: 27, acc: "scarf", c1: "#2fa84f", c2: "#ffffff" },
  ], { name: "Rosa, salmão, lilás e ocre", text: "as minhocas de sempre (grátis)" });

  // ---- poleiros G (F3): no lugar do galho do ambiente de cada fase ----
  Skins.register("roost", [
    { id: "cerejeira", name: "Galho de cerejeira", text: "galho escuro com folhas e flores cor-de-rosa", price: 10, style: "branch", top: "#a8806a", face: "#6a4a3e", acc1: "#7fc468", acc2: "#ff9ec4" },
    { id: "bambu", name: "Poleiro de bambu", text: "dois gomos de bambu com folhinhas", price: 14, style: "bamboo" },
    { id: "balanco", name: "Balanço de passarinho", text: "assento de madeira pendurado por duas cordas", price: 20, style: "swing" },
    { id: "casinha", name: "Casinha de passarinho", text: "telhado vermelho e porta redonda", price: 28, style: "house" },
  ], { name: "Galho do ambiente", text: "o galho de cada fase, de sempre (grátis)" });

  // ---- ventos (F3): só o estilo e a cor das fitas e da setinha ----
  Skins.register("gust", [
    { id: "azul", name: "Fitas azuis", text: "fitas de ar azul-claro", price: 10, style: "ribbons", c1: "#7fc4ff", c2: "#ffffff" },
    { id: "tracos", name: "Vento de tracinhos", text: "tracinhos brancos e seta amarela", price: 15, style: "dashes", c1: "#ffffff", c2: "#ffe27a" },
    { id: "bolinhas", name: "Vento de bolinhas", text: "bolinhas cor-de-rosa que correm", price: 21, style: "puffs", c1: "#ffb7d1", c2: "#fff3b0" },
    { id: "folhas", name: "Fitas de folhas", text: "fitas verdes e seta amarelinha", price: 27, style: "ribbons", c1: "#9ae06a", c2: "#fff3b0" },
  ], { name: "Fitas de ar", text: "o vento de cada fase, de sempre (grátis)" });

  // ---- gaviões (F11): a padrão tem 3 pelagens (pardo, cinzento e ruivo) ----
  Skins.register("hawk", [
    { id: "prata", name: "Penas prateadas", text: "penas cinza-prateadas, claras e brilhantes", price: 10,
      coats: [
        { fur: "#c9d1de", dark: "#6b7690", light: "#f5f7fb", wing: "#9aa6ba" },
        { fur: "#b8c3d6", dark: "#5a6784", light: "#eef2f9", wing: "#8794ad" },
        { fur: "#d9dee8", dark: "#7b86a0", light: "#ffffff", wing: "#a9b3c8" },
      ] },
    { id: "cachecol", name: "Cachecol de lã", text: "cachecol vermelho e branco", price: 15, acc: "scarf", c1: "#e8403a", c2: "#ffffff" },
    { id: "festa", name: "Gavião de festa", text: "chapéu de aniversário roxo com pompom", price: 21, acc: "hat", c1: "#7b4fd0", c2: "#ffd24a" },
    { id: "faixa", name: "Faixa de campeão", text: "faixa azul na cabeça", price: 28, acc: "band", c1: "#3f86e0", c2: "#ffffff" },
  ], { name: "Pardo, cinzento e ruivo", text: "os gaviões de sempre (grátis)" });
})();
