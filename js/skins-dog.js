// As SKINS DOS OBJETOS DO JOGO DO CACHORRINHO (0.19.0), registradas no catálogo único da lojinha (js/skins.js).
// Categorias deste arquivo: agent, ration, exit, catexit (a saída do jogo do Gatinho, com os mesmos campos visuais da exit), postman, bone, ball, block, van, foecat. (A categoria "dog" é registrada em js/game.js, onde estão as skins do cachorrinho.)
// Cada skin: { id, name, text, price, from?, ...campos visuais } (ver o contrato no topo de js/skins.js). Os campos visuais são lidos pelas funções de desenho de js/game.js com `lookOf(categoria)`.
// Skins só mudam o VISUAL: nenhuma muda regra, velocidade, alcance, pontos, tempo, tamanho de contato ou som. Nomes e frases em português.
// A skin padrão de cada categoria (id "") não tem campo nenhum: o desenho cai nos valores de sempre (o visual da 0.18.0, pixel a pixel).
// Preços: 10 a 30 petscoin, em escada crescente dentro de cada categoria; "from" é o da categoria (js/skins.js).
//
// ---- CAMPOS VISUAIS (todos opcionais; cores em "#rrggbb" ou "rgba(...)") ----
// agent    (drawVet: o agente da carrocinha)   pants (calça), boots (botas), sleeves (mangas), vest (colete), stripes (faixas do colete; "rainbow" = colete de 5 faixas de arco-íris), cap (boné e aba),
//                                              badge (distintivo), pole (vara do puçá), ring (aro da rede), tie (gravata-borboleta no pescoço)
// postman  (drawPostman: os agentes viram carteiros com o poder do osso)   pants, shirt (camisa), sleeves, bag (bolsa e alça), cap, badge, deco ("stripes" | "stars": desenho na camisa) + mark (a cor dele)
// ration   (drawKibble: a tigela de ração)    bowl (tigela), band (faixa), kibble (ração), kibbleHi (ração do topo), deco ("dots": bolinhas na tigela | "sparkle": brilhinhos em volta) + mark (a cor dele)
// bone     (drawBone: o osso)                 fill (cor de dentro), stroke (contorno), pattern ("stripes" | "dots" | "bands" | "stars") + mark (a cor dele; "bands" tem as cores do arco-íris).
//                                             fill, stroke e mark valem só no osso COMUM; os ossos de tipo novo (ouro, gelo, turbo, ímã) guardam a cor e o brilho do efeito deles e só recebem o desenho da skin, em tom sobre tom.
// ball     (drawBall: a bolinha)              pattern ("stripes" | "dots" | "star" | "rainbow": no lugar da faixa branca; "rainbow" troca a cor da bolinha por 5 faixas) + mark (a cor do desenho). Fora o "rainbow", a cor de cada bolinha (4 tons) continua sendo a de sempre.
// block    (drawMovingBlock, drawMovingWall: blocos e paredes que se movem)   door e wall ([corpo, miolo ou topo, borda]; sem eles vale o do ambiente da fase), warn (os cantos de aviso, amarelos), round (cantos redondos, como pinos),
//                                             deco ("grain": veios de madeira | "glint": brilhos de gelo | "holes": buracos de queijo) + mark (a cor dele). Os trilhos (e o aviso piscando) são sempre os do ambiente.
// van      (drawVan: a van da carrocinha)      body (carroceria), eave (beiral), cab (cabine), bars (grade), light (giroflex), stripe (faixa; "rainbow" = arco-íris), deco ("dots" | "hearts": enfeites na faixa de cima do teto) + mark (a cor dele)
// foecat   (drawCat: o gato que persegue, nas Fases 11 a 20)   coats (as 4 pelagens, [{ fur, dark, light, eye }] × 4; sem isso valem as de sempre), acc ("bell": coleira com guizo | "bow": laço | "party": chapéu de festa),
//                                             collar (cor principal do acessório) e bell (cor do guizo, do miolo do laço ou da faixa do chapéu)
// exit e catexit (drawExit: a saída; MESMA função e MESMOS campos nos dois jogos, a "exit" vale só no Cachorrinho e a "catexit" só no Gatinho)   open e closed (cor aberta e fechada), inkOpen e inkClosed (cor da palavra SAÍDA),
//                                             deco ("stripes": listras de toldo | "rainbow": faixas de arco-íris nas bordas | "stars": estrelinhas | "frame": moldura com cantos redondos) + mark (a cor dele).
//                                             A saída continua verde aberta e vermelha fechada nas skins: o enfeite só acompanha (fica apagado quando ela está fechada).
//
// ---- CAMPOS RESERVADOS PARA SKINS FUTURAS ----
// O desenho já lê estes campos (e o teste os aceita), mas nenhuma skin do catálogo os usa hoje: agent.pole e agent.ring, postman.bag e postman.badge, ball.mark, van.bars e van.light,
// e exit.inkOpen e exit.inkClosed (catexit também). exit.open e exit.closed também ficam sem uso de propósito: nenhuma skin de saída pode trocar o verde aberto e o vermelho fechado (o teste confere).
(function () {
  "use strict";
  if (typeof Skins === "undefined") return;

  Skins.register("agent", [
    { id: "azul", name: "Agente azul", text: "uniforme azul e colete amarelo", price: 10, pants: "#26385e", sleeves: "#3b5ea8", vest: "#ffd23f", stripes: "#2a4a8a", cap: "#2a4a8a" },
    { id: "laranja", name: "Agente laranja", text: "uniforme laranja e colete azul-claro", price: 14, pants: "#a85412", boots: "#5a2c0c", sleeves: "#d9741a", vest: "#4fc3ff", cap: "#c4620f" },
    { id: "arco-iris", name: "Colete arco-íris", text: "colete listrado com todas as cores", price: 20, stripes: "rainbow", sleeves: "#7b4fd0", pants: "#5a3a9a", cap: "#7b4fd0", badge: "#ffe066" },
    { id: "festa", name: "Agente de festa", text: "colete dourado e gravata-borboleta", price: 28, pants: "#2b2b3a", boots: "#111111", sleeves: "#3a3550", vest: "#f6d56a", stripes: "#fff3c4", cap: "#2b2b3a", tie: "#c1272d" },
  ], { name: "Agente clássico", text: "o uniforme de sempre (grátis)" });

  Skins.register("ration", [
    { id: "rosa", name: "Tigela rosa", text: "tigela cor-de-rosa com borda branca", price: 10, bowl: "#ff8fb8" },
    { id: "azul", name: "Tigela azul", text: "tigela azul com faixa amarela", price: 14, bowl: "#4f9be8", band: "#ffe066" },
    { id: "bolinhas", name: "Tigela de bolinhas", text: "tigela roxa cheia de bolinhas", price: 20, bowl: "#9b6bd6", band: "#e9d7ff", deco: "dots", mark: "#ffffff" },
    { id: "dourada", name: "Tigela dourada", text: "tigela de ouro e ração brilhante", price: 28, bowl: "#e0b04a", band: "#fff3c4", kibble: "#b9791f", kibbleHi: "#d9a03f", deco: "sparkle", mark: "#fff6c8" },
  ], { name: "Tigela vermelha", text: "a tigela de sempre (grátis)" });

  // a saída: as duas categorias (exit no Cachorrinho, catexit no Gatinho) têm as mesmas skins, com os mesmos campos
  const EXITS = [
    { id: "listras", name: "Saída listrada", text: "listras claras, como um toldo", price: 10, deco: "stripes" },
    { id: "arco-iris", name: "Saída arco-íris", text: "faixas coloridas nas bordas", price: 16, deco: "rainbow" },
    { id: "estrelas", name: "Saída estrelada", text: "estrelinhas amarelas", price: 22, deco: "stars", mark: "#ffe066" },
    { id: "dourada", name: "Saída dourada", text: "moldura de ouro com cantos brilhantes", price: 30, deco: "frame", mark: "#d4a017" },
  ];
  Skins.register("exit", EXITS, { name: "Saída clássica", text: "a saída de sempre (grátis)" });
  Skins.register("catexit", EXITS, { name: "Saída clássica", text: "a saída de sempre (grátis)" });

  Skins.register("postman", [
    { id: "verde", name: "Carteiro verde", text: "uniforme e boné verdes", price: 10, shirt: "#4fae6a", sleeves: "#2f8a4d", pants: "#1f5a38", cap: "#1f5a38" },
    { id: "vermelho", name: "Carteiro vermelho", text: "uniforme e boné vermelhos", price: 14, shirt: "#e0584f", sleeves: "#bf3f37", pants: "#7a2420", cap: "#7a2420" },
    { id: "marinheiro", name: "Carteiro marinheiro", text: "camisa branca de listras azuis", price: 20, shirt: "#f4f6fa", sleeves: "#dfe4ee", cap: "#f4f6fa", deco: "stripes", mark: "#3f7fd6" },
    { id: "estrelado", name: "Carteiro estrelado", text: "camisa roxa com estrelinhas", price: 28, shirt: "#7b4fd0", sleeves: "#5f38b0", pants: "#3a2373", cap: "#3a2373", deco: "stars", mark: "#ffe066" },
  ], { name: "Carteiro clássico", text: "o carteiro azul de sempre (grátis)" });

  Skins.register("bone", [
    { id: "listras", name: "Osso de listras", text: "listras vermelhas no osso comum", price: 10, pattern: "stripes", mark: "#e5533d" },
    { id: "bolinhas", name: "Osso de bolinhas", text: "osso comum rosa, de bolinhas brancas", price: 15, fill: "#ffc4dc", stroke: "#c25a86", pattern: "dots", mark: "#ffffff" },
    { id: "arco-iris", name: "Osso arco-íris", text: "faixas de todas as cores no osso comum", price: 22, fill: "#fffdf5", stroke: "#8e8570", pattern: "bands" },
    { id: "estrelas", name: "Osso estrelado", text: "osso comum azul, com estrelinhas amarelas", price: 28, fill: "#5b7fd0", stroke: "#2c4486", pattern: "stars", mark: "#ffe066" },
  ], { name: "Osso clássico", text: "o osso de sempre (grátis)" });

  Skins.register("ball", [
    { id: "listras", name: "Bolinha de listras", text: "listras brancas", price: 10, pattern: "stripes" },
    { id: "bolinhas", name: "Bolinha pintadinha", text: "cheia de bolinhas brancas", price: 14, pattern: "dots" },
    { id: "estrela", name: "Bolinha estrela", text: "uma estrela branca no meio", price: 20, pattern: "star" },
    { id: "arco-iris", name: "Bolinha arco-íris", text: "faixas de todas as cores", price: 28, pattern: "rainbow" },
  ], { name: "Bolinha clássica", text: "a bolinha de sempre (grátis)" });

  Skins.register("block", [
    { id: "madeira", name: "Bloco de madeira", text: "madeira com veios", price: 10, wall: ["#a9743f", "#c8914f", "#5a3a1c"], door: ["#a9743f", "#c8914f", "#5a3a1c"], deco: "grain", mark: "rgba(70,40,15,.5)" },
    { id: "gelo", name: "Bloco de gelo", text: "gelinho azul com brilhos", price: 16, wall: ["#8fd0ec", "#d8f3ff", "#3f87ab"], door: ["#9fd8f0", "#e1f6ff", "#3f87ab"], warn: "#ffe066", deco: "glint", mark: "rgba(255,255,255,.9)" },
    { id: "queijo", name: "Bloco de queijo", text: "queijo amarelo cheio de buracos", price: 22, wall: ["#f2c230", "#ffd965", "#a87a0c"], door: ["#f4c542", "#ffd965", "#a87a0c"], warn: "#e5533d", deco: "holes", mark: "rgba(160,110,10,.55)" },
    { id: "montar", name: "Bloco de montar", text: "vermelho, com pinos redondos", price: 28, wall: ["#d9402f", "#ee6a57", "#7a1f14"], door: ["#e5533d", "#ff8a65", "#8c2a1b"], warn: "#ffd23f", round: true },
  ], { name: "Bloco clássico", text: "o bloco de sempre (grátis)" });

  Skins.register("van", [
    { id: "azul", name: "Van azul", text: "carroceria azul e faixa branca", price: 10, body: "#8fb8f0", eave: "#6a93cc", cab: "#243a66", stripe: "#ffffff" },
    { id: "verde", name: "Van verde", text: "carroceria verde e faixa amarela", price: 14, body: "#a7dcae", eave: "#74b27f", cab: "#25483a", stripe: "#fff3a0" },
    { id: "coracoes", name: "Van de corações", text: "rosa, com corações no teto", price: 20, body: "#ffc7de", eave: "#e99ab9", cab: "#4a3a6a", stripe: "#ff4f93", deco: "hearts", mark: "#ff4f93" },
    { id: "arco-iris", name: "Van arco-íris", text: "branca, com faixa de arco-íris", price: 28, body: "#ffffff", eave: "#c9d2e0", stripe: "rainbow" },
  ], { name: "Carrocinha clássica", text: "a van de sempre (grátis)" });

  Skins.register("foecat", [
    { id: "guizo", name: "Gato de guizo", text: "coleira vermelha com guizo dourado", price: 10, acc: "bell", collar: "#e5533d", bell: "#f2c230" },
    { id: "laco", name: "Gato de laço", text: "laço cor-de-rosa na cabeça", price: 14, acc: "bow", collar: "#ff6fa5", bell: "#d93b80" },
    {
      id: "pastel", name: "Gatos pastel", text: "pelos rosa, azul, verde e lilás", price: 20,
      coats: [
        { fur: "#ffc2d9", dark: "#e48fb0", light: "#fff0f6", eye: "#6bb7ff" },
        { fur: "#bfdcff", dark: "#82aee6", light: "#eef6ff", eye: "#ffd24a" },
        { fur: "#bfeed2", dark: "#7cc79a", light: "#f0fff5", eye: "#ff9ec4" },
        { fur: "#dccbff", dark: "#a98be6", light: "#f7f2ff", eye: "#6bd36b" },
      ],
    },
    { id: "festa", name: "Gato de festa", text: "chapéu de festa com pompom", price: 28, acc: "party", collar: "#7b4fd0", bell: "#ffd23f" },
  ], { name: "Gato clássico", text: "os gatos de sempre (grátis)" });
})();
