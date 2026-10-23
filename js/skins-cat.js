// As SKINS DOS OBJETOS DO JOGO DO GATINHO (0.19.0), registradas no catálogo único da lojinha (js/skins.js).
// Categorias deste arquivo: guard, mouse, yarn, agile, perch, tracker. (A catexit é registrada em js/skins-dog.js, junto com a exit, porque drawExit é uma função só.) (A categoria "cat" é registrada em js/game.js, com as 12 skins de CatArt.SKINS.)
// Cada skin: { id, name, text, price, from?, ...campos visuais } (ver o contrato no topo de js/skins.js). Os campos visuais são lidos pelas funções de desenho de js/cat-art.js (e js/game.js) com `lookOf(categoria)`.
// Skins só mudam o VISUAL: nenhuma muda regra, velocidade, alcance, pontos, tempo, tamanho de contato nem som. Nomes e frases em português. Preço de 10 a 30 petscoin, em escada crescente. Sem nome de raça nem marca.
// Um campo que falta = o visual de sempre (a skin padrão de cada categoria não tem campo nenhum, e o jogo desenha EXATAMENTE como na 0.18.0).
//
// CAMPOS VISUAIS (todas as cores são "#rrggbb" ou "rgba(r,g,b,a)"; o que está entre aspas é uma lista fechada):
//   guard e tracker (os cães; o estado "afugentado" e "congelado" tinge também estas cores, então continuam legíveis):
//     collar  cor da coleira, ou "rainbow" (4 faixas)        tag  cor da plaquinha da coleira
//     acc     enfeite: "bandana" (lenço, estampa em `pat`: "dots" ou "check") | "bowtie" (gravata-borboleta) | "hat" (chapéu de festa) | "bow" (laço na cabeça)
//     c1, c2  as duas cores do enfeite (c1 = a principal; c2 = bolinhas, xadrez, pompom ou nó)
//   mouse (ratinhos; ficam legíveis na noite das Fases 18 e 19: pelo sempre CLARO, conferido por tests/skins-cat.test.js)
//     coats   lista de 1 a 3 pelagens { fur, dark, belly, ear, eye } (o ratinho nº i usa a de índice i % tamanho; sem `coats` valem as 3 de sempre: cinza, marrom e branca)
//     acc     "scarf" (cachecol) | "cap" (gorrinho de tricô) com as cores c1 e c2
//   agile (camundongos ágeis; também legíveis na noite)
//     coats   lista de 1 a 4 cores de pelo (o camundongo de `hue` h usa a de índice h % tamanho; sem `coats` valem as 4 de sempre)
//     acc     "cap" (gorro) | "bow" (laço) | "band" (faixa de corredor) com as cores c1 e c2
//   yarn (novelos: os 5 tipos de poder comum/ouro/gelo/turbo/ímã continuam distintos por COR e por marquinha com qualquer skin)
//     pat     estampa por cima da bola: "stripes" | "dots" | "hearts" | "rainbow". É só enfeite branco ou pequeno: a cor-CHAVE do tipo (fill, strand, hi, glow, em CatArt.YARN_KEYS) e a marquinha
//             (estrela, floco, raio, ímã) nunca mudam, e NENHUMA skin pode ter um campo fill/strand/hi/glow/kind (tests/skins-cat.test.js confere)
//   perch (lugares altos "T": no lugar do lugar alto do ambiente, em qualquer fase; o gatinho continua a salvo em cima)
//     style   "wood" (prateleira de madeira) | "cushion" (almofadão) | "castle" (castelinho) | "tree" (torre de arranhar)
//     top, face, edge, acc1, acc2   cores do topo, da frente, do contorno e dos detalhes (cada estilo tem as suas de sempre)
(function () {
  "use strict";
  if (typeof Skins === "undefined") return;

  // ---- cães de guarda (F1): a padrão tem coleira vermelha ----
  Skins.register("guard", [
    { id: "azul", name: "Coleira azul", text: "coleira azul-clara com plaquinha prateada", price: 10, collar: "#2f9ad8", tag: "#e3e9f0" },
    { id: "lenco", name: "Lenço de bolinhas", text: "lenço vermelho de bolinhas no pescoço", price: 14, acc: "bandana", pat: "dots", c1: "#e8403a", c2: "#ffffff" },
    { id: "gala", name: "Gravata de gala", text: "coleira dourada e gravata-borboleta roxa", price: 20, collar: "#d4a017", tag: "#fff2b0", acc: "bowtie", c1: "#7b3fc4", c2: "#ffd24a" },
    { id: "festa", name: "Chapéu de festa", text: "coleira verde e chapéu de aniversário", price: 26, collar: "#2fa84f", tag: "#ffe14a", acc: "hat", c1: "#ff6fb0", c2: "#ffe14a" },
  ], { name: "Coleira vermelha", text: "o cão de guarda de sempre (grátis)" });

  // ---- ratinhos (F1): a padrão tem 3 pelagens (cinza, marrom e branca) ----
  Skins.register("mouse", [
    { id: "algodao", name: "Algodão-doce", text: "pelo rosa, azul e lilás de algodão-doce", price: 10,
      coats: [
        { fur: "#f6b3cf", dark: "#d98bb0", belly: "#ffe1ee", ear: "#ff8fb8", eye: "#3a2440" },
        { fur: "#a9d4f6", dark: "#7fb2de", belly: "#e0f1ff", ear: "#f3a6c8", eye: "#1f2a44" },
        { fur: "#d2bdf5", dark: "#ab92dc", belly: "#efe6ff", ear: "#f3a6c8", eye: "#2a2048" },
      ] },
    { id: "dourado", name: "Ratinho dourado", text: "pelo dourado que brilha", price: 14,
      coats: [
        { fur: "#f2c14e", dark: "#c99726", belly: "#fde9ac", ear: "#f1a0a8", eye: "#2a1a10" },
        { fur: "#f7d36b", dark: "#d4a636", belly: "#fff0c2", ear: "#f1a0a8", eye: "#2a1a10" },
        { fur: "#ebb23c", dark: "#c08a1c", belly: "#fbe2a0", ear: "#f1a0a8", eye: "#2a1a10" },
      ] },
    { id: "cachecol", name: "Cachecol listrado", text: "cachecol vermelho e branco no pescoço", price: 20, acc: "scarf", c1: "#e8403a", c2: "#ffffff" },
    { id: "gorrinho", name: "Gorrinho de tricô", text: "gorrinho azul com pompom", price: 26, acc: "cap", c1: "#3f86e0", c2: "#ffffff" },
  ], { name: "Cinza, marrom e branco", text: "os ratinhos de sempre (grátis)" });

  // ---- novelos (F2): a cor de cada poder é a mesma com qualquer skin; a skin só põe uma estampa por cima ----
  Skins.register("yarn", [
    { id: "listrado", name: "Novelo listrado", text: "listras brancas; o poder continua na mesma cor", price: 10, pat: "stripes" },
    { id: "bolinhas", name: "Novelo de bolinhas", text: "bolinhas brancas; o poder continua na mesma cor", price: 14, pat: "dots" },
    { id: "coracoes", name: "Novelo de corações", text: "coraçõezinhos brancos; o poder continua na mesma cor", price: 20, pat: "hearts" },
    { id: "arco-iris", name: "Novelo com arco-íris", text: "um arco-íris de adesivo; o poder continua na mesma cor", price: 26, pat: "rainbow" },
  ], { name: "Novelo liso", text: "os novelos de sempre (grátis)" });

  // ---- camundongos ágeis (F2): pelo sempre claro, para aparecerem na noite ----
  Skins.register("agile", [
    { id: "algodao", name: "Algodão-doce", text: "pelo rosa, azul, lilás e verde-menta", price: 10, coats: ["#f6b3cf", "#a9d4f6", "#d2bdf5", "#b4ecd0"] },
    { id: "gorro", name: "Gorro de tricô", text: "gorro verde com pompom", price: 16, acc: "cap", c1: "#2fa84f", c2: "#ffffff" },
    { id: "laco", name: "Laço de fita", text: "laço rosa com nó amarelo", price: 22, acc: "bow", c1: "#ff5fa2", c2: "#ffe14a" },
    { id: "faixa", name: "Faixa de corredor", text: "faixa vermelha com as pontas ao vento", price: 28, acc: "band", c1: "#e8403a", c2: "#ffffff" },
  ], { name: "Camundongo clarinho", text: "os camundongos ágeis de sempre (grátis)" });

  // ---- lugares altos T (F3): no lugar do lugar alto do ambiente de cada fase ----
  Skins.register("perch", [
    { id: "madeira", name: "Prateleira de madeira", text: "tampo de tábuas e pezinhos de madeira", price: 10, style: "wood" },
    { id: "almofada", name: "Almofadão fofo", text: "um pufe rosa bem macio", price: 14, style: "cushion" },
    { id: "castelinho", name: "Castelinho de brinquedo", text: "ameias, porta e bandeirinha", price: 20, style: "castle" },
    { id: "torre", name: "Torre de arranhar", text: "carpete macio, poste de corda e bolinha pendurada", price: 26, style: "tree" },
  ], { name: "Lugar alto do ambiente", text: "o lugar alto de cada fase, de sempre (grátis)" });

  // ---- cães rastreadores (F11): a padrão tem coleira azul ----
  Skins.register("tracker", [
    { id: "verde", name: "Coleira verde", text: "coleira verde com plaquinha dourada", price: 10, collar: "#2fa84f", tag: "#ffd24a" },
    { id: "arco-iris", name: "Coleira arco-íris", text: "coleira com todas as cores", price: 14, collar: "rainbow", tag: "#ffffff" },
    { id: "xadrez", name: "Lenço xadrez", text: "lenço laranja e branco de xadrez", price: 20, collar: "#f0872a", acc: "bandana", pat: "check", c1: "#f0872a", c2: "#fff4e0" },
    { id: "laco", name: "Laço de fita", text: "coleira rosa e laço na cabeça", price: 26, collar: "#ee6fa6", tag: "#ffe9f3", acc: "bow", c1: "#ff5fa2", c2: "#ffe14a" },
  ], { name: "Coleira azul", text: "o cão rastreador de sempre (grátis)" });
})();
