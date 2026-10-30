// Perfis por bichinho (0.18.0): os SUBSTANTIVOS, os RÓTULOS e as FRASES do jogo de cada bichinho.
// O motor (js/game.js) é um só: o que muda de um bichinho para outro (como se chamam as coisas, o que o placar e os avisos dizem) vem daqui, nunca de `if (bichinho === "gato")` no código.
//
// Como usar (js/game.js): `const P = () => perfil em uso` (na partida, o do bichinho DA PARTIDA; no menu, o do ESCOLHIDO) e depois `P().noun.prey.many`, `P().say.ballGot(50, 1, 3)`...
// Como criar o perfil de um bichinho novo (ex.: o Passarinho): copie o bloco `cat` abaixo, troque os textos, registre em PROFILES e confira com `node tests/profiles.test.js`
// (o teste exige as MESMAS chaves e tipos do perfil do Cachorrinho, e que nenhum texto seja igual ao dele sem querer). Um bichinho sem perfil usa o do Cachorrinho.
//
// O perfil "dog" tem EXATAMENTE os textos que o jogo sempre teve (tests/profiles.test.js confere uma tabela de frases-chave e o e2e confere centenas delas): NÃO mude uma vírgula dele.
//
// Convenções:
//  - `noun.*`: { one, many } (e o que mais a frase precisar). `noun.foe2` é o segundo tipo de inimigo (os gatos do Cachorrinho): `null` = esse bichinho não tem; as frases que citam
//    esse inimigo ficam sem ele e o aviso de "assustou" cai no do inimigo principal (veja `say.beat2` e `lose.foe2`).
//  - `say.*`, `lose.*`, `fx.*`, `effect.*`, `mission.*`, `hud.*`: funções (ou textos) que o motor chama com os números; devolvem a frase pronta, já com a gramática (artigos, gênero, plural) do bichinho.
//  - `reinforce[id]`: { name, text } de cada reforço (os ids, máximos e a fase em que entram são do motor: REINFORCEMENTS em js/game.js).
//  - `skins`: null = usa o catálogo de skins do bichinho (o do Cachorrinho está no js/game.js, o do Gatinho em CatArt.SKINS); um objeto { idDaSkin: { name, text } } só troca o nome e a frase (preço e desenho continuam os do catálogo).
//  - `shop`: os avisos da lojinha de skins do PRÓPRIO bichinho (prévia, skin em uso, compra); as categorias dos objetos usam frases gerais (js/game.js). A lojinha é única (0.19.0): `ui.shopTitle` e `ui.shopHelp` ficam null em todos os bichinhos (valem o título e a ajuda do index.html).
//  - `ui.*`: textos fixos do index.html (Como jogar, ajuda da lojinha...). null = fica o que está no index.html (o texto do Cachorrinho); texto = troca o conteúdo daquele elemento.
//  - `sfx.*`: nomes dos sons (js/sound.js) que o jogo toca nos momentos de cada bichinho; o motor só chama `sound.play(P().sfx.x)`.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Profiles = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DEFAULT_ANIMAL = "dog";

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Cachorrinho: os textos de sempre (0.1.0 a 0.17.0)
  // ---------------------------------------------------------------------------------------------------------------------------------
  const dog = {
    id: "dog",
    noun: {
      self: { one: "cachorrinho", cap: "Cachorrinho" },                                                                 // quem o jogador controla
      prey: { one: "ração", many: "rações" },                                                                           // o que se coleta em toda fase
      power: { one: "osso", many: "ossos" },                                                                            // o item que dá poder (vale 150 pontos)
      ball: { one: "bolinha", many: "bolinhas" },
      foe: { one: "agente da carrocinha", many: "agentes da carrocinha", shortOne: "agente", shortMany: "agentes" },   // o inimigo principal
      scared: { one: "carteiro", many: "carteiros" },                                                                   // o inimigo principal com o poder ligado (foge e vale +100)
      foe2: { one: "gato", many: "gatos" },                                                                             // o segundo inimigo (a partir da Fase 11); null = não existe
    },
    boneLabel: { scare: "Osso do poder", gold: "Osso de ouro", ice: "Osso de gelo", turbo: "Osso turbo", magnet: "Osso ímã" },
    reinforce: {
      speed: { name: "Patas ligeiras", text: "+8% de velocidade do cachorrinho" },
      bone: { name: "Osso poderoso", text: "+8 s no poder do osso" },
      life: { name: "Vida extra", text: "+1 vida agora" },
      heart: { name: "Coração maior", text: "+1 vida no máximo (e +1 vida agora)" },
      shield: { name: "Pelo grosso", text: "+2 s de proteção depois de perder uma vida" },
      slow: { name: "Carrocinha lenta", text: "agentes da carrocinha 8% mais lentos" },
      stealth: { name: "Patas de veludo", text: "agentes e gatos notam você 1 quadrado mais tarde" },
      scent: { name: "Faro", text: "uma seta mostra o osso mais perto (e, no nível 2, a saída aberta)" },
      lure: { name: "Ímã de ração", text: "as rações perto de você vêm sozinhas" },
    },
    // o que cada reforço faz de verdade (upEffects): "+16% de velocidade · 4 vidas no máximo..."
    effect: {
      bone: (s) => `+${s} s de poder do osso`,
      slow: (pct) => `agentes ${pct}% mais lentos`,
      scent1: "seta para o osso mais perto",
      scent2: "setas para o osso e para a saída",
      lure: (r) => `rações a até ${r} quadrados vêm sozinhas`,
    },
    // os ossos de tipos novos (Fases 11 a 20): `t` = segundos do efeito
    fx: {
      gold: (t) => `escudo dourado por ${t} s: nada pega o cachorrinho!`,
      ice: (t) => `agentes e gatos congelados por ${t} s!`,
      turbo: (t, pct) => `+${pct}% de velocidade por ${t} s!`,
      magnet: (t) => `as rações vêm sozinhas por ${t} s!`,
    },
    // as missões das Fases 11 a 20 (texto completo, texto curto do aviso do começo da fase e o que ainda falta no placar)
    mission: {
      bones: (n) => `pegar todos os ${n} ossos`,
      rations: (r, n) => `pegar ${r} das ${n} rações`,
      shortBones: "todos os ossos",
      shortRations: (r) => `${r} rações`,
      leftBones: (a, b) => `ossos ${a}/${b}`,
      leftRations: (a, b) => `rações ${a}/${b}`,
    },
    // avisos (toast) e frases durante a partida
    say: {
      lifeMaxed: (isPower, max, extra) => `${isPower ? "Este osso" : "Esta ração"} tinha uma vida extra, mas você já está com o máximo (${max} vidas).${extra}`,
      relocated: (inPlace, hasPower) => (inPlace ? `${hasPower ? "Itens trocaram" : "Rações trocaram"} de lugar.` : `${hasPower ? "Os itens mudaram" : "As rações mudaram"} de lugar.`),
      powerOn: (s, hasFoe2) => `Poder do osso por ${s} s: os agentes viram carteiros${hasFoe2 ? " e os gatos" : ""} fogem! Encoste neles: +100 cada.`,
      powerShort: (s) => `Poder do osso por ${s} s!`,
      powerEnding: () => "", // (0.20.0, só o Passarinho: o aviso dos últimos segundos do voo alto)
      powerOff: (hasFoe2) => (hasFoe2 ? "O poder acabou: os carteiros voltaram a ser agentes da carrocinha e os gatos voltaram!" : "O poder acabou: os carteiros voltaram a ser agentes da carrocinha!"),
      beat: (pts) => `Você ganhou do carteiro! +${pts} pontos`,
      beat2: (pts) => `Você assustou o gato! +${pts} pontos`,
      needAll: (hasPower) => (hasPower ? "Colete todas as rações e todos os ossos antes de sair!" : "Colete todas as rações antes de sair!"),
      ballGot: (pts, got, total) => `Bolinha! +${pts} pontos (${got}/${total})`,
      // quantos inimigos tem a fase: `short` = a forma curta do aviso do começo da fase nas fases com missão
      foes: (n, n2, short) => `${n} ${short ? (n === 1 ? "agente" : "agentes") : (n === 1 ? "agente da carrocinha" : "agentes da carrocinha")}${n2 ? ` e ${n2} ${n2 === 1 ? "gato" : "gatos"}` : ""}`,
      saved: (title, time, gotR, rations, gotB, bones, lives) => `${title} · ${time} · ${gotR}/${rations} rações${bones ? ` · ${gotB}/${bones} ossos` : ""} · ${lives} ${lives === 1 ? "vida" : "vidas"}`,
      pauseGrowth: (stage) => `Cachorrinho: ${stage}.`,
      // a soma da tela de vitória: cada parcela com o nome do que a rendeu
      winPrey: (pts) => `Rações: ${pts}`,
      winPower: (pts) => ` + ossos: ${pts}`,
      winScared: (hasFoe2, pts) => ` + ${hasFoe2 ? "carteiros e gatos" : "carteiros"}: ${pts}`,
      winBalls: (pts) => ` + bolinhas: ${pts}`,
    },
    // a tela de derrota
    lose: {
      crush: "O bloco esmagou o cachorrinho!",
      foe: "A carrocinha pegou o cachorrinho!",
      foe2: "O gato pegou o cachorrinho!",
      short: "Os pontos não bastaram!",
      stats: (got, rations, gotB, bones, score, min) => `Rações coletadas: ${got}/${rations}${bones ? ` · Ossos: ${gotB}/${bones}` : ""} · Pontos: ${score}${min ? ` (mínimo ${min})` : ""}`,
    },
    // o placar (HTML): rótulos dos itens, dicas e a leitura em voz alta do poder
    hud: {
      prey: "RAÇÕES",
      power: "OSSOS",
      balls: "BOLINHAS",
      powerBadge: "PODER",
      ballsTitle: "Bolinhas: cada uma vale 50 pontos e foge de você",
      powerTitle: "Poder do osso: quanto falta para os carteiros voltarem a ser agentes da carrocinha",
      powerOn: (s) => `Poder do osso: ${s} segundos`,
      powerOff: "Poder do osso: desligado",
      // (0.20.0) o FÔLEGO e o ESTADO do placar: o Cachorrinho não tem nenhum dos dois (ficam escondidos); os textos são os que já estavam no index.html, só para o motor ter de onde ler
      stamina: "FÔLEGO",
      staminaTitle: "Fôlego: a arrancada (segure Shift, Espaço, o botão Correr ou, no controle, A, RB ou RT) gasta fôlego e ele volta quando você não corre",
      stateTitle: "Estado do gatinho: A SALVO num lugar alto, MOLHADO (mais lento, sem arrancada) ou OFEGANTE (sem fôlego)",
      state: () => "",
      stateSay: () => "normal",
      stateAria: (t) => `Estado do gatinho: ${t ? t.toLowerCase() : "normal"}`,
      stateLive: (said) => `Estado do gatinho: ${said}`,
    },
    // sons (js/sound.js): o que toca em cada momento (o latido de filhote, jovem ou adulto ao completar a fase; o miado do gato que nota o cachorrinho)
    // (0.18.0) os campos do segundo bloco são momentos que só o Gatinho tem som: aqui ficam vazios ("" = nenhum som) e o Cachorrinho toca EXATAMENTE os sons de sempre.
    //  ball/ballMore = pegar a bolinha (o 2º som vem 0,15 s depois); alert = o "!" do agente liga; alert2Every/alert2Near = s entre os avisos do 2º inimigo e a que distância (tiles; 0 = qualquer) ele é ouvido;
    //  hurt = som extra de ser pego (0,1 s depois da captura); winMore = som extra ao completar a fase (1,7 s depois da fanfarra); splash/shake/jump/dash/pant = ações do gatinho.
    sfx: { ration: "ration", bone: "bone", capture: "capture", transform: "transform", beat: "postman", win: { filhote: "bark1", jovem: "bark2", adulto: "bark3" }, alert2: "meow",
      ball: "pick", ballMore: "", alert: "", alert2Every: 4, alert2Near: 0, hurt: "", winMore: "", splash: "", shake: "", jump: "", dash: "", pant: "", soarEnd: "", landing: "", gust: "" }, // (0.20.0: soarEnd/landing/gust são do Passarinho: o fim do voo alto, o pouso no galho e o vento)
    skins: null,
    // textos da lojinha de skins do bichinho (0.18.0); a lojinha é única (0.19.0): ficam só os avisos da categoria do próprio bichinho
    shop: {
      preview: (name) => `Prévia da skin ${name}`,
      inUse: (name) => `Skin em uso: ${name}.`,
      bought: (name, left) => `Você comprou a skin ${name} e já está usando! ${left === 0 ? "Não sobrou nenhum petscoin." : left === 1 ? "Sobrou 1 petscoin." : `Sobraram ${left} petscoin.`}`,
    },
    // textos fixos do index.html (null = o que está lá, que é o do Cachorrinho)
    ui: { howto: null, shopTitle: null, shopHelp: null, scoresHelp: null, nameTip: null, nameStep: null, regHint: null, canvasLabel: null, padLabel: null, pauseHelp: null, docTitle: null, runLabel: null, runAria: null, runTitle: null }, // (docTitle: o título da aba do navegador; pauseHelp: a ajuda de teclas e controle da tela de pausa; 0.20.0: runLabel/runAria/runTitle = o botão de toque da arrancada, "Correr" no index.html)
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Gatinho (0.18.0): substantivos, frases, placar, sons, textos fixos e lojinha do gato (o perfil `dog` acima traz os textos de sempre)
  // ---------------------------------------------------------------------------------------------------------------------------------
  const cat = {
    id: "cat",
    noun: {
      self: { one: "gatinho", cap: "Gatinho" },
      prey: { one: "ratinho", many: "ratinhos" },
      power: { one: "novelo", many: "novelos" },
      ball: { one: "camundongo", many: "camundongos" },                                                                  // o "camundongo ágil": foge quando você chega perto (as bolinhas do Cachorrinho)
      foe: { one: "cão", many: "cães", shortOne: "cão", shortMany: "cães" },
      scared: { one: "cão afugentado", many: "cães afugentados" },
      foe2: null, // no jogo do Gatinho não há um segundo tipo de inimigo
    },
    boneLabel: { scare: "Novelo do poder", gold: "Novelo de ouro", ice: "Novelo de gelo", turbo: "Novelo turbo", magnet: "Novelo ímã" },
    reinforce: {
      speed: { name: "Patas ágeis", text: "+8% de velocidade do gatinho" },
      bone: { name: "Novelo poderoso", text: "+8 s no poder do novelo" },
      life: { name: "Vida extra", text: "+1 vida agora" },
      heart: { name: "Coração maior", text: "+1 vida no máximo (e +1 vida agora)" },
      shield: { name: "Pelo grosso", text: "+2 s de proteção depois de perder uma vida" },
      slow: { name: "Cães lentos", text: "cães 8% mais lentos" },
      stealth: { name: "Passos de veludo", text: "os cães notam você 1 quadrado mais tarde" },
      scent: { name: "Bigodes atentos", text: "uma seta mostra o novelo mais perto (e, no nível 2, a saída aberta)" },
      lure: { name: "Chamado de petisco", text: "os ratinhos perto de você vêm sozinhos" },
    },
    effect: {
      bone: (s) => `+${s} s de poder do novelo`,
      slow: (pct) => `cães ${pct}% mais lentos`,
      scent1: "seta para o novelo mais perto",
      scent2: "setas para o novelo e para a saída",
      lure: (r) => `ratinhos a até ${r} quadrados vêm sozinhos`,
    },
    fx: {
      gold: (t) => `escudo dourado por ${t} s: nada pega o gatinho!`,
      ice: (t) => `cães congelados por ${t} s!`,
      turbo: (t, pct) => `+${pct}% de velocidade e arrancada sem cansar por ${t} s!`,
      magnet: (t) => `os ratinhos vêm sozinhos por ${t} s!`,
    },
    mission: {
      bones: (n) => `pegar todos os ${n} novelos`,
      rations: (r, n) => `pegar ${r} dos ${n} ratinhos`,
      shortBones: "todos os novelos",
      shortRations: (r) => `${r} ratinhos`,
      leftBones: (a, b) => `novelos ${a}/${b}`,
      leftRations: (a, b) => `ratinhos ${a}/${b}`,
    },
    say: {
      lifeMaxed: (isPower, max, extra) => `Este ${isPower ? "novelo" : "ratinho"} tinha uma vida extra, mas você já está com o máximo (${max} vidas).${extra}`,
      relocated: (inPlace, hasPower) => (inPlace ? `${hasPower ? "Itens trocaram" : "Ratinhos trocaram"} de lugar.` : `${hasPower ? "Os itens mudaram" : "Os ratinhos mudaram"} de lugar.`),
      powerOn: (s) => `Poder do novelo por ${s} s: os cães ficam afugentados e fogem! Encoste neles: +100 cada.`,
      powerShort: (s) => `Poder do novelo por ${s} s!`,
      powerEnding: () => "",
      powerOff: () => "O poder acabou: os cães afugentados voltaram a perseguir você!",
      beat: (pts) => `Você afugentou o cão! +${pts} pontos`,
      beat2: (pts) => `Você afugentou o cão! +${pts} pontos`, // (sem segundo inimigo: cai no aviso do principal)
      needAll: (hasPower) => (hasPower ? "Pegue todos os ratinhos e todos os novelos antes de sair!" : "Pegue todos os ratinhos antes de sair!"),
      ballGot: (pts, got, total) => `Camundongo! +${pts} pontos (${got}/${total})`,
      foes: (n, n2, short) => `${n} ${n === 1 ? "cão" : "cães"}${n2 ? ` e ${n2} ${n2 === 1 ? "rastreador" : "rastreadores"}` : ""}`, // (o cão rastreador é o segundo inimigo do Gatinho: os `R` do mapa; `short` não muda nada) // (`n2` e `short` não mudam nada: o cão é um só, curto ou longo)
      saved: (title, time, gotR, rations, gotB, bones, lives) => `${title} · ${time} · ${gotR}/${rations} ratinhos${bones ? ` · ${gotB}/${bones} novelos` : ""} · ${lives} ${lives === 1 ? "vida" : "vidas"}`,
      pauseGrowth: (stage) => `Gatinho: ${stage}.`,
      winPrey: (pts) => `Ratinhos: ${pts}`,
      winPower: (pts) => ` + novelos: ${pts}`,
      winScared: (hasFoe2, pts) => ` + cães: ${pts}`, // (curto: a linha da soma da vitória passava de 3 linhas e a tela rolava no celular; a frase de cima, "cães afugentados", é a do poder do novelo)
      winBalls: (pts) => ` + camundongos: ${pts}`,
    },
    lose: {
      crush: "O bloco esmagou o gatinho!",
      foe: "Um cão pegou o gatinho!",
      foe2: "Um cão pegou o gatinho!",
      short: "Os pontos não bastaram!",
      stats: (got, rations, gotB, bones, score, min) => `Ratinhos pegos: ${got}/${rations}${bones ? ` · Novelos: ${gotB}/${bones}` : ""} · Pontos: ${score}${min ? ` (mínimo ${min})` : ""}`,
    },
    hud: {
      prey: "RATINHOS",
      power: "NOVELOS",
      balls: "CAMUNDONGOS",
      powerBadge: "PODER",
      ballsTitle: "Camundongos ágeis: cada um vale 50 pontos e dispara quando você chega perto",
      powerTitle: "Poder do novelo: quanto falta para os cães afugentados voltarem a perseguir você",
      powerOn: (s) => `Poder do novelo: ${s} segundos`,
      powerOff: "Poder do novelo: desligado",
      // (0.20.0) o FÔLEGO e o ESTADO do placar: os textos e a montagem que o js/game.js tinha até a 0.19.0, agora aqui (o resultado é exatamente o mesmo). `s` = { safe, wet, winded }
      stamina: "FÔLEGO",
      staminaTitle: "Fôlego: a arrancada (segure Shift, Espaço, o botão Correr ou, no controle, A, RB ou RT) gasta fôlego e ele volta quando você não corre",
      stateTitle: "Estado do gatinho: A SALVO num lugar alto, MOLHADO (mais lento, sem arrancada) ou OFEGANTE (sem fôlego)",
      state: (s) => [s.safe ? "A SALVO" : "", s.wet > 0 ? `MOLHADO ${Math.ceil(s.wet)} s` : "", s.winded > 0 && s.wet <= 0 ? "OFEGANTE" : ""].filter(Boolean).join(" · "), // (vazio = normal. Molhado e ofegante impedem a arrancada do mesmo jeito: com os dois o estado diz só MOLHADO)
      stateSay: (s) => { const parts = [s.safe ? "a salvo" : "", s.wet > 0 ? "molhado" : "", s.winded > 0 ? "ofegante" : ""].filter(Boolean); return parts.length ? parts.join(", ").replace(/, ([^,]*)$/, " e $1") : "normal"; }, // (o que o leitor de tela diz quando o estado MUDA)
      stateAria: (t) => `Estado do gatinho: ${t ? t.toLowerCase() : "normal"}`,
      stateLive: (said) => `Estado do gatinho: ${said}`,
    },
    // Sons do Gatinho (0.18.0): o contrato é o do README ("Sons do Gatinho"). O miado da fase da vida (`win`) vem 0,9 s depois da fanfarra e o ronronar (`winMore`) 1,7 s; o ratinho é o `squeak`;
    // o camundongo ágil é um ratinho raro (`squeak` + `purr` 0,15 s depois); o novelo é o `yarn` e o comum, que eriça o pelo, solta o `hiss` 0,3 s depois (`transform`); o cão de guarda que nota o gatinho late (`alert`: `woof`);
    // o rastreador rosna (`alert2`: `growl`, no máximo a cada 3 s e só a até 8 tiles); ser pego é `capture` e, 0,1 s depois, o miado de susto (`hurt`: `yowl`); afugentar um cão é o som de hoje do carteiro (`beat`).
    sfx: { ration: "squeak", bone: "yarn", capture: "capture", transform: "hiss", beat: "postman", win: { filhote: "cmeow1", jovem: "cmeow2", adulto: "cmeow3" }, alert2: "growl",
      ball: "squeak", ballMore: "purr", alert: "woof", alert2Every: 3, alert2Near: 8, hurt: "yowl", winMore: "purr", splash: "splash", shake: "shake", jump: "jump", dash: "dash", pant: "pant", soarEnd: "", landing: "", gust: "" },
    // as skins do Gatinho vêm de CatArt.SKINS (js/cat-art.js: nome, frase e preço de cada uma); `null` = usa o catálogo dele
    skins: null,
    shop: {
      preview: (name) => `Prévia da skin ${name} do gatinho`,
      inUse: (name) => `Skin do gatinho em uso: ${name}.`,
      bought: (name, left) => `Você comprou a skin ${name} para o gatinho e já está usando! ${left === 0 ? "Não sobrou nenhum petscoin." : left === 1 ? "Sobrou 1 petscoin." : `Sobraram ${left} petscoin.`}`,
    },
    ui: {
      shopTitle: null, // (0.19.0) a lojinha é única, de todos os bichinhos: o título e a ajuda dela são os do index.html
      howto: [
        `<li><strong>Objetivo:</strong> ajude o gatinho a pegar todos os ratinhos (e os <strong>novelos</strong>, nas fases em que eles aparecem) e depois chegar à <strong>SAÍDA</strong>. A saída abre quando você pegar tudo; nas fases com <strong>pontos mínimos</strong> (o placar mostra <strong>PONTOS n / meta</strong>), ela abre assim que a sua pontuação na fase chega a essa meta (e, a partir da Fase 11, também a <strong>missão</strong> da fase precisa estar cumprida).</li>`,
        `<li><strong>Mover:</strong> no computador, use as teclas <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> ou as setas. No celular ou tablet, arraste o dedo no controle redondo que aparece na tela. <strong>O tempo só começa a contar quando você dá o primeiro passo</strong>: até lá o relógio e os cães ficam parados.</li>`,
        `<li><strong>Cuidado com os cães!</strong> Os cães patrulham a rua atrás de gatinhos. Quando aparecer um <span class="red">!</span> vermelho em cima de um cão, ele fica bem mais rápido e vai atrás do gatinho. Se ele encostar no gatinho, você perde 1 vida e o gatinho volta ao início da fase (da Fase 9 em diante ele renasce onde caiu); o tempo continua contando. Os ratinhos que ainda não foram pegos <strong>mudam de lugar</strong>, e eles também ficam em lugares novos a cada jogo. A partir da Fase 11 aparecem também os <strong>cães rastreadores</strong>: eles ouvem o gatinho de longe e seguem o rastro, mas, como os outros cães, <strong>não pulam</strong> os obstáculos baixos nem sobem nos lugares altos.</li>`,
        `<li><strong>Correr (arrancada):</strong> segure <kbd>Shift</kbd> ou <kbd>Espaço</kbd> (no controle, <strong>A</strong>, <strong>RB</strong> ou <strong>RT</strong>; no celular, o botão <strong>Correr</strong>) para o gatinho dar uma <strong>arrancada</strong>: ele fica 35% mais rápido enquanto está andando e tem <strong>fôlego</strong>. O fôlego (a barra <strong>FÔLEGO</strong> no placar) dura cerca de 2,5 s de arrancada e volta em cerca de 5 s sem correr; quando acaba, o gatinho fica <strong>ofegante</strong> por um instante e só anda normal. O <strong>novelo turbo</strong> deixa o gatinho correr sem cansar por alguns segundos.</li>`,
        `<li><strong>Poças e pelo molhado:</strong> pisar numa <strong>poça</strong> (água azul no chão) molha o pelo: o gatinho fica <strong>mais lento</strong> (65% da velocidade) e <strong>não consegue dar arrancada</strong> até secar, uns 6 s depois de sair da poça. O placar mostra <strong>MOLHADO</strong> e quanto falta. Os cães não se molham.</li>`,
        `<li><strong>Pular e subir:</strong> os <strong>obstáculos baixos</strong> (vasos, caixotes, cercas baixas) o gatinho <strong>pula</strong> (um pouco mais devagar sobre eles), mas os cães não passam: é um atalho só dele. Nos <strong>lugares altos</strong> (árvores, prateleiras, muros) o gatinho fica <strong>A SALVO</strong> enquanto o centro dele estiver em cima: nenhum cão o pega. Os cães esperam embaixo por até 4 s e desistem. Lá em cima não há limite de tempo, mas o relógio e o bônus de tempo continuam correndo, e, quando o gatinho desce, a proteção acaba.</li>`,
        `<li><strong>Novelo e cães afugentados:</strong> ao pegar um <strong>novelo</strong> o gatinho ganha um <strong>poder</strong> por alguns segundos: os cães ficam <strong>afugentados</strong> (azuis), mais lentos, e <strong>fogem</strong> dele em vez de persegui-lo. Quem encosta num cão afugentado leva pontos extras. Quando o poder acaba, eles voltam a perseguir.</li>`,
        `<li><strong>Missão (a partir da Fase 11):</strong> além dos pontos mínimos, cada fase tem uma <strong>missão</strong> (pegar todos os novelos e/ou pegar um número de ratinhos). Ela aparece numa faixa no alto do jogo, e a saída só abre com a missão cumprida, que ainda dá <strong>pontos extras</strong>.</li>`,
        `<li><strong>Novelos de cores diferentes (a partir da Fase 11):</strong> o <strong>novelo de ouro</strong> dá um escudo (nada pega o gatinho), o <strong>novelo de gelo</strong> congela os cães, o <strong>novelo turbo</strong> deixa o gatinho mais rápido e sem cansar na arrancada, e o <strong>novelo ímã</strong> puxa os ratinhos que estão perto. Os efeitos aparecem numa faixa no alto do jogo.</li>`,
        `<li><strong>Camundongos ágeis (a partir da Fase 2):</strong> gato adora caçar! Os <strong>camundongos ágeis</strong> espalhados pela fase valem <strong>50 pontos</strong> cada, mas <strong>disparam</strong> quando você chega perto (e batem nas paredes e nos obstáculos): corra atrás e encoste neles. Eles não são obrigatórios para abrir a saída.</li>`,
        `<li><strong>Petiscos e skins:</strong> cada fase que você completa dá <strong>1 petisco</strong> (= 1 <strong>petscoin</strong>), guardado no seu nome de usuário. Na <strong>Lojinha de skins</strong>, no menu, troque petiscos por skins (a partir de 10 petscoin): para o gatinho (cores, bandana de pirata, capacete de astronauta, capa de super-gato...) e também para os objetos do jogo, como os cães de guarda, os ratinhos e os novelos. A lojinha é uma só, com uma aba para cada jogo, e <strong>cada categoria abre quando você chega à fase em que ela aparece</strong> (os lugares altos, por exemplo, só na Fase 3 do Gatinho). As skins só mudam o desenho.</li>`,
        `<li><strong>Bichinhos:</strong> no menu, toque em <strong>Bichinho</strong> para escolher com quem jogar. <strong>Cada bichinho tem as suas próprias 20 fases</strong>, com pontos, recordes, ranking, progresso e jogo salvo só dele: jogar um não mexe nos outros. <strong>Dentro de um bichinho a fase seguinte só abre quando você conclui a anterior</strong>. A <strong>lojinha de skins</strong>, os <strong>petscoin</strong>, o nome de usuário e a conta são de todos os bichinhos.</li>`,
        `<li><strong>Reforços:</strong> ao vencer uma fase você escolhe <strong>1 reforço</strong> entre <strong>3 opções sorteadas</strong> (de um conjunto de 6: patas ágeis, novelo poderoso, vida extra, coração maior, pelo grosso ou cães lentos; a partir da Fase 11 entram mais 3: passos de veludo, bigodes atentos e chamado de petisco). Ele fica com você nas fases seguintes; a próxima fase só começa depois da escolha. Começar uma fase pelo menu ou jogá-la de novo começa sem reforços.</li>`,
        `<li><strong>Crescer:</strong> na Fase 1 o gatinho é um <strong>filhote</strong> (menor, de cabeça grande e coleira rosa). A cada fase vencida e a cada reforço escolhido ele cresce: vira um gato <strong>jovem</strong> (coleira roxa) e, por fim, um gato <strong>adulto</strong> (coleira verde-água). Mudam o desenho e o miado ao completar a fase (agudo no filhote, grave no adulto). É só o desenho e o som: o tamanho de contato e as regras são os mesmos. Na pausa o jogo diz em que fase de crescimento ele está.</li>`,
        `<li><strong>Vidas:</strong> você começa com 3, mostradas por corações vermelhos <span class="red">♥ ♥ ♥</span>, e pode ter de 1 a 5 (até 8 com o reforço <em>Coração maior</em>); <strong>a partir da Fase 11 o máximo sobe até 10</strong>. Alguns itens escondem uma <strong>vida extra</strong> (você só descobre ao pegar o item): cada uma dá +1 vida, até o máximo. As vidas que sobram <strong>passam para a fase seguinte</strong>.</li>`,
        `<li><strong>Sem vidas?</strong> Você tem até <strong>3 novas tentativas</strong> da fase em que está: ela recomeça do zero, com 3 vidas. Cada nova tentativa custa <strong>100 pontos</strong>.</li>`,
        `<li><strong>Pontuação:</strong> cada ratinho vale 100 pontos, cada novelo vale 150, cada cão afugentado com o poder do novelo vale mais 100, cada camundongo vale 50 e, nas Fases 11 a 20, cumprir a missão da fase dá um bônus. Quanto mais rápido você termina, maior o <strong>bônus de tempo</strong>: ele diminui a cada 10 segundos a mais, até chegar a 0. Cada vida perdida <strong>desconta pontos</strong>, e a pontuação <strong>pode ficar negativa</strong>. Na mesma fase vale só a sua <strong>maior</strong> pontuação (jogar de novo não soma). Fases diferentes se somam. Para melhorar o recorde de uma fase, use <strong>Jogar fases anteriores</strong> no menu.</li>`,
        `<li><strong>Salvar:</strong> o jogo salva sozinho a cada poucos segundos e quando você pausa ou fecha a página. Você também pode tocar no botão de disquete no topo do jogo, ou em <strong>Salvar jogo</strong> na pausa. Para voltar de onde parou, escolha <strong>Continuar jogo</strong> no menu.</li>`,
        `<li><strong>Pausar:</strong> aperte a tecla <kbd>Esc</kbd> ou <kbd>P</kbd>, o botão <strong>Start</strong> do controle, ou toque no botão de pausa no topo do jogo.</li>`,
        `<li><strong>Som:</strong> o jogo tem efeitos sonoros (o gatinho <strong>mia</strong> e <strong>ronrona</strong> ao completar a fase; ratinho que guincha, novelo, cães que ladram e rosnam, cão afugentado, ser pego, pata na poça, pelo sacudido, pulo, arrancada, fôlego acabando, perder e ganhar vida, passar de fase e fim de jogo). O navegador só libera o som depois do seu primeiro toque ou tecla. Para desligar, use o botão <strong>Som</strong> do menu ou da pausa, ou a tecla <kbd>M</kbd>.</li>`,
        `<li><strong>Teclado:</strong> <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> ou as setas movem; <kbd>Shift</kbd> ou <kbd>Espaço</kbd> (segurar) dão a arrancada; <kbd>Esc</kbd> ou <kbd>P</kbd> pausam (e continuam); <kbd>Ctrl</kbd>+<kbd>S</kbd> salva; <kbd>M</kbd> liga e desliga o som. Nos menus, use as setas <kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>Tab</kbd>) para escolher, <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para confirmar e <kbd>Esc</kbd> para voltar.</li>`,
        `<li><strong>Controle (gamepad):</strong> conecte um controle (Bluetooth ou cabo) e aperte qualquer botão para ele ser reconhecido. O <strong>analógico esquerdo</strong> ou o <strong>direcional</strong> movem o gatinho; <strong>A</strong>, <strong>RB</strong> ou <strong>RT</strong> (segurar) dão a arrancada; <strong>Start</strong> pausa e continua; <strong>Y</strong> salva; nos menus, o direcional escolhe, <strong>A</strong> confirma e <strong>B</strong> volta.</li>`,
        `<li><strong>Pontuações:</strong> em <strong>Suas pontuações</strong>, só você vê o que fez. O <strong>ranking do jogo</strong> aparece para todos os jogadores deste aparelho e mostra apenas a melhor pontuação de cada um.</li>`,
        `<li><strong>Conta (opcional):</strong> em <strong>Escolher nome de usuário</strong> você pode criar uma conta com senha (de 4 a 20 caracteres) para proteger o seu nome neste aparelho.</li>`,
      ].join("\n        "),
      shopHelp: null,
      scoresHelp: `Em cada fase vale a sua <strong>maior</strong> pontuação (100 por ratinho + 150 por novelo + 100 por cão afugentado + 50 por camundongo + bônus da missão nas Fases 11 a 20 + bônus de tempo − pontos por vida perdida − 100 por nova tentativa). Fases diferentes se somam.`,
      nameTip: `<strong>Dica:</strong> o nome pode ser o nome de um gatinho! Por exemplo: <strong>Mimi</strong>.`,
      nameStep: `Pense em um nome. Pode ser o do seu gatinho.`,
      regHint: `Pode ser o nome de um gatinho! Até 16 letras ou números.`,
      canvasLabel: "Área do jogo: um gatinho coleta ratinhos e novelos e foge dos cães. Pegar um novelo dá poder por alguns segundos: os cães ficam afugentados e fogem do gatinho, e, ao encostar neles, você ganha pontos. Novelos de cores diferentes dão escudo, gelo, turbo ou ímã. Segurar Shift, Espaço ou o botão Correr dá uma arrancada enquanto houver fôlego; poças molham o pelo e deixam o gatinho lento; os lugares altos deixam o gatinho a salvo dos cães; os obstáculos baixos só o gatinho pula",
      padLabel: "Controle direcional: arraste o dedo para mover o gatinho",
      pauseHelp: `Teclado: setas ou WASD movem · Shift ou Espaço (segurar) dão a arrancada · Esc ou P pausa · Ctrl+S salva · M liga e desliga o som.<br>Controle: analógico ou direcional movem · A, RB ou RT (segurar) dão a arrancada · Start pausa · Y salva · A escolhe · B volta.<br>Toque: arraste o controle redondo para mover · segure o botão Correr para a arrancada.`,
      docTitle: "Jogo do gatinho",
      runLabel: null, runAria: null, runTitle: null, // (0.20.0: o botão de toque do Gatinho é o "Correr" do index.html)
    },
  };

  // ---------------------------------------------------------------------------------------------------------------------------------
  // Passarinho (0.20.0): sementes, frutos, minhocas, gatos de quintal e gaviões. O passarinho é GENÉRICO (sem espécie). Tudo o que o jogo diz dele é escolha de design do jogo.
  // ---------------------------------------------------------------------------------------------------------------------------------
  const bird = {
    id: "bird",
    noun: {
      self: { one: "passarinho", cap: "Passarinho" },
      prey: { one: "semente", many: "sementes" },
      power: { one: "fruto", many: "frutos" },                                                                           // o fruto comum dá o VOO ALTO (os outros tipos dão escudo, ar frio, rajada e ímã)
      ball: { one: "minhoca", many: "minhocas" },                                                                        // a "bolinha" do Passarinho: sai da terra e dispara quando você chega perto
      foe: { one: "gato de quintal", many: "gatos de quintal", shortOne: "gato", shortMany: "gatos" },
      scared: { one: "gato", many: "gatos" },                                                                            // (no voo alto os gatos esperam e desistem: ninguém é afugentado nem rende pontos)
      foe2: { one: "gavião", many: "gaviões" },                                                                          // a partir da Fase 11
    },
    boneLabel: { scare: "Fruto do voo alto", gold: "Fruto dourado", ice: "Fruto de ar frio", turbo: "Fruto de rajada", magnet: "Fruto ímã" },
    reinforce: {
      speed: { name: "Asas fortes", text: "+8% de velocidade do passarinho" },
      bone: { name: "Fruto poderoso", text: "+2 s no voo alto do fruto (e +4 s nos outros frutos)" },
      life: { name: "Vida extra", text: "+1 vida agora" },
      heart: { name: "Coração maior", text: "+1 vida no máximo (e +1 vida agora)" },
      shield: { name: "Penas grossas", text: "+2 s de proteção depois de perder uma vida" },
      slow: { name: "Gatos lentos", text: "gatos de quintal e gaviões 8% mais lentos" },
      stealth: { name: "Voo silencioso", text: "gatos e gaviões notam você 1 quadrado mais tarde" },
      scent: { name: "Olhar atento", text: "uma seta mostra o fruto mais perto (e, no nível 2, o ninho aberto)" },
      lure: { name: "Chamado de semente", text: "as sementes perto de você vêm sozinhas" },
    },
    effect: {
      bone: (s) => `+${s} s de voo alto`,
      slow: (pct) => `gatos e gaviões ${pct}% mais lentos`,
      scent1: "seta para o fruto mais perto",
      scent2: "setas para o fruto e para o ninho",
      lure: (r) => `sementes a até ${r} quadrados vêm sozinhas`,
    },
    fx: {
      gold: (t) => `escudo dourado por ${t} s: nada pega o passarinho!`,
      ice: (t) => `gatos e gaviões congelados por ${t} s!`,
      turbo: (t, pct) => `+${pct}% de velocidade e bater de asas sem cansar por ${t} s!`,
      magnet: (t) => `as sementes vêm sozinhas por ${t} s!`,
    },
    mission: {
      bones: (n) => `pegar todos os ${n} frutos`,
      rations: (r, n) => `pegar ${r} das ${n} sementes`,
      shortBones: "todos os frutos",
      shortRations: (r) => `${r} sementes`,
      leftBones: (a, b) => `frutos ${a}/${b}`,
      leftRations: (a, b) => `sementes ${a}/${b}`,
    },
    say: {
      lifeMaxed: (isPower, max, extra) => `${isPower ? "Este fruto" : "Esta semente"} tinha uma vida extra, mas você já está com o máximo (${max} vidas).${extra}`,
      relocated: (inPlace, hasPower) => (inPlace ? `${hasPower ? "Itens trocaram" : "Sementes trocaram"} de lugar.` : `${hasPower ? "Os itens mudaram" : "As sementes mudaram"} de lugar.`),
      powerOn: (s, hasFoe2) => `Voo alto por ${s} s: você passa por cima dos muros e os gatos não alcançam o passarinho!${hasFoe2 ? " Os gaviões voam na mesma altura: cuidado!" : ""}`,
      powerShort: (s) => `Voo alto por ${s} s!`,
      powerEnding: (onWall) => (onWall ? "O voo alto está acabando: o passarinho vai pousar no chão livre mais perto!" : "O voo alto está acabando!"),
      powerOff: (hasFoe2, landed) => (landed ? "O voo alto acabou: o passarinho pousou no chão livre mais perto!" : "O voo alto acabou: o passarinho voltou a voar baixo!"),
      beat: (pts) => `Você espantou o gato! +${pts} pontos`,   // (o Passarinho não usa estas duas frases: o voo alto não espanta nem rende pontos; elas só existem porque o motor sempre tem uma)
      beat2: (pts) => `Você espantou o gato! +${pts} pontos`,
      needAll: (hasPower) => (hasPower ? "Pegue todas as sementes e todos os frutos antes de entrar no ninho!" : "Pegue todas as sementes antes de entrar no ninho!"),
      ballGot: (pts, got, total) => `Minhoca! +${pts} pontos (${got}/${total})`,
      foes: (n, n2, short) => `${n} ${n === 1 ? "gato" : "gatos"}${n2 ? ` e ${n2} ${n2 === 1 ? "gavião" : "gaviões"}` : ""}`, // (`short` não muda nada: o nome já é curto)
      saved: (title, time, gotR, rations, gotB, bones, lives) => `${title} · ${time} · ${gotR}/${rations} sementes${bones ? ` · ${gotB}/${bones} frutos` : ""} · ${lives} ${lives === 1 ? "vida" : "vidas"}`,
      pauseGrowth: (stage) => `Passarinho: ${stage}.`,
      winPrey: (pts) => `Sementes: ${pts}`,
      winPower: (pts) => ` + frutos: ${pts}`,
      winScared: (hasFoe2, pts) => ` + gatos: ${pts}`,   // (o Passarinho não usa: ninguém é afugentado, então a soma da vitória nunca tem esta parcela)
      winBalls: (pts) => ` + minhocas: ${pts}`,
    },
    lose: {
      crush: "O bloco esmagou o passarinho!",   // (o Passarinho não usa: as fases dele não têm blocos que esmagam)
      foe: "Um gato pegou o passarinho!",
      foe2: "Um gavião pegou o passarinho!",
      short: "Os pontos não bastaram!",
      stats: (got, rations, gotB, bones, score, min) => `Sementes pegas: ${got}/${rations}${bones ? ` · Frutos: ${gotB}/${bones}` : ""} · Pontos: ${score}${min ? ` (mínimo ${min})` : ""}`,
    },
    hud: {
      prey: "SEMENTES",
      power: "FRUTOS",
      balls: "MINHOCAS",
      powerBadge: "VOO ALTO",
      ballsTitle: "Minhocas: cada uma vale 50 pontos e dispara quando você chega perto",
      powerTitle: "Voo alto: quanto falta para o passarinho voltar a voar baixo",
      powerOn: (s) => `Voo alto: ${s} segundos`,
      powerOff: "Voo alto: desligado",
      stamina: "FÔLEGO",
      staminaTitle: "Fôlego: bater asas (segure Shift, Espaço, o botão Voar ou, no controle, A, RB ou RT) gasta fôlego e ele volta quando você não bate asas",
      stateTitle: "Estado do passarinho: A SALVO num galho, VOO ALTO (acima dos muros), NO VENTO (empurrado pela corrente de ar) ou SEM FÔLEGO",
      // `s` = { safe (no galho), flying (voo alto), ending (últimos 2 s do voo alto), wind (0 = fora do vento, 1 = a favor, -1 = contra, 2 = de lado ou parado), winded (s sem fôlego) }; um estado só, o mais importante primeiro (o placar nunca cresce)
      state: (s) => (s.flying ? (s.ending ? "VOO ACABANDO" : "VOO ALTO") : s.safe ? "A SALVO" : s.winded > 0 ? "SEM FÔLEGO" : s.wind === -1 ? "CONTRA O VENTO" : s.wind === 1 ? "A FAVOR DO VENTO" : s.wind ? "NO VENTO" : ""),
      stateSay: (s) => (s.flying ? (s.ending ? "voo alto acabando" : "voo alto") : s.safe ? "a salvo" : s.winded > 0 ? "sem fôlego" : s.wind === -1 ? "contra o vento" : s.wind === 1 ? "a favor do vento" : s.wind ? "no vento" : "normal"),
      stateAria: (t) => `Estado do passarinho: ${t ? t.toLowerCase() : "normal"}`,
      stateLive: (said) => `Estado do passarinho: ${said}`,
    },
    // Sons (js/sound.js): o canto de filhote, jovem e adulto ao completar a fase (`win`) e o canto da vitória (`winMore`, 1,7 s depois da fanfarra); bicar a semente (`ration`: peck), fruto (`bone`: fruit), minhoca (`ball`: worm);
    // o fruto comum do voo alto toca o início do voo (`transform`: soar) e, ao acabar, soarEnd; pousar no galho é `landing`; bater asas é `dash` (flap) e o fôlego acabando `pant` (wheeze); o vento é `gust`;
    // o gato de quintal que nota o passarinho solta o hiss2 (`alert`), o gavião que nota solta o grito (`alert2`: shriek, no máximo a cada 3 s); ser pego é `capture` (scare).
    sfx: { ration: "peck", bone: "fruit", capture: "scare", transform: "soar", beat: "", win: { filhote: "chirp1", jovem: "chirp2", adulto: "chirp3" }, alert2: "shriek",
      ball: "worm", ballMore: "", alert: "hiss2", alert2Every: 3, alert2Near: 0, hurt: "", winMore: "song", splash: "", shake: "", jump: "", dash: "flap", pant: "wheeze", soarEnd: "soarend", landing: "landing", gust: "gust" },
    skins: null,
    shop: {
      preview: (name) => `Prévia da skin ${name} do passarinho`,
      inUse: (name) => `Skin do passarinho em uso: ${name}.`,
      bought: (name, left) => `Você comprou a skin ${name} para o passarinho e já está usando! ${left === 0 ? "Não sobrou nenhum petscoin." : left === 1 ? "Sobrou 1 petscoin." : `Sobraram ${left} petscoin.`}`,
    },
    ui: {
      shopTitle: null,
      howto: [
        `<li><strong>Objetivo:</strong> ajude o passarinho a pegar todas as sementes (e os <strong>frutos</strong>, nas fases em que eles aparecem) e depois chegar ao <strong>ninho</strong>, a <strong>SAÍDA</strong>. A saída abre quando você pegar tudo; nas fases com <strong>pontos mínimos</strong> (o placar mostra <strong>PONTOS n / meta</strong>), ela abre assim que a sua pontuação na fase chega a essa meta (e, a partir da Fase 11, também a <strong>missão</strong> da fase precisa estar cumprida).</li>`,
        `<li><strong>Mover:</strong> no computador, use as teclas <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> ou as setas. No celular ou tablet, arraste o dedo no controle redondo que aparece na tela. <strong>O tempo só começa a contar quando você dá o primeiro passo</strong>: até lá o relógio e os gatos ficam parados.</li>`,
        `<li><strong>Cuidado com os gatos!</strong> Os gatos de quintal patrulham a vizinhança atrás de passarinhos. Quando aparecer um <span class="red">!</span> vermelho em cima de um gato, ele fica bem mais rápido e vai atrás do passarinho. Se ele encostar no passarinho, você perde 1 vida e o passarinho volta ao início da fase (da Fase 9 em diante ele renasce onde caiu); o tempo continua contando. As sementes que ainda não foram pegas <strong>mudam de lugar</strong>, e elas também ficam em lugares novos a cada jogo.</li>`,
        `<li><strong>Gaviões (a partir da Fase 11):</strong> os <strong>gaviões</strong> são mais rápidos e mais espertos que os gatos: <strong>ouvem</strong> o passarinho de longe, correm para onde ele <strong>vai estar</strong> e dão um <strong>bote</strong> quando chegam perto. Eles voam por cima das cercas baixas, das pedras e dos arbustos, mas <strong>não atravessam muros nem paredes</strong>, e o <strong>voo alto não protege</strong> do gavião (ele voa na mesma altura). Encostar num gavião também custa 1 vida. Só um <strong>galho</strong> o segura: o gavião espera embaixo e desiste.</li>`,
        `<li><strong>Bater asas:</strong> segure <kbd>Shift</kbd> ou <kbd>Espaço</kbd> (no controle, <strong>A</strong>, <strong>RB</strong> ou <strong>RT</strong>; no celular, o botão <strong>Voar</strong>) para o passarinho <strong>bater as asas</strong>: ele fica 35% mais rápido enquanto está se movendo e tem <strong>fôlego</strong>. O fôlego (a barra <strong>FÔLEGO</strong> no placar) dura cerca de 2,5 s batendo asas e volta em cerca de 5 s sem bater; quando acaba, o placar mostra <strong>SEM FÔLEGO</strong> e o passarinho só voa normal por um instante. O <strong>fruto de rajada</strong> deixa o passarinho bater asas sem cansar por alguns segundos.</li>`,
        `<li><strong>Voo baixo e muros:</strong> o passarinho normalmente voa <strong>baixo</strong>: os <strong>muros</strong> dos labirintos (cercas altas, sebes, milharais, juncos) e as <strong>paredes</strong> (rochas, troncos e construções altas) o seguram, como seguram os gatos. As <strong>cercas baixas, pedras e arbustos</strong> o passarinho atravessa voando, sem perder velocidade, e os gatos não passam: é um atalho só dele. Mas se ele estiver bem em cima de um deles, um gato que chegue do lado ainda o alcança.</li>`,
        `<li><strong>Galhos:</strong> nos <strong>galhos</strong> (copas de árvores, fios, telhados altos) o passarinho fica <strong>A SALVO</strong> enquanto o centro dele estiver em cima: nenhum gato e nenhum gavião o pega. Eles esperam embaixo por até 4 s e desistem. Lá em cima não há limite de tempo, mas o relógio e o bônus de tempo continuam correndo, e, quando o passarinho desce, a proteção acaba.</li>`,
        `<li><strong>Ventos:</strong> as <strong>correntes de vento</strong> (setas animadas no chão) <strong>empurram</strong> o passarinho na direção da seta. A favor do vento você vai mais longe; contra o vento (o placar mostra <strong>CONTRA O VENTO</strong>) anda bem menos. As paredes e os muros ainda seguram o passarinho, e os gatos e gaviões não sentem o vento. No voo alto o passarinho está acima do vento.</li>`,
        `<li><strong>Fruto e voo alto:</strong> ao pegar um <strong>fruto</strong> (o comum) o passarinho ganha o <strong>VOO ALTO</strong> por 10 segundos: ele fica maior, com a sombra longe no chão, <strong>passa por cima dos muros</strong> (mas não das paredes) e os gatos <strong>não o alcançam</strong>: eles esperam embaixo e desistem. Ninguém é espantado e não há pontos por isso. Nos últimos 2 segundos o passarinho <strong>pisca</strong> e o placar avisa; se o voo alto acabar com o passarinho em cima de um muro, ele <strong>pousa</strong> no chão livre mais perto, sem perder vida. Voar por cima dos muros não pula a fase: a saída continua pedindo os pontos e a missão.</li>`,
        `<li><strong>Missão (a partir da Fase 11):</strong> além dos pontos mínimos, cada fase tem uma <strong>missão</strong> (pegar todos os frutos e/ou pegar um número de sementes). Ela aparece numa faixa no alto do jogo, e a saída só abre com a missão cumprida, que ainda dá <strong>pontos extras</strong>.</li>`,
        `<li><strong>Frutos de cores diferentes (a partir da Fase 11):</strong> o <strong>fruto dourado</strong> dá um escudo (nada pega o passarinho), o <strong>fruto de ar frio</strong> congela os gatos e os gaviões, o <strong>fruto de rajada</strong> deixa o passarinho mais rápido e sem cansar ao bater asas, e o <strong>fruto ímã</strong> puxa as sementes que estão perto. Os efeitos aparecem numa faixa no alto do jogo.</li>`,
        `<li><strong>Minhocas (a partir da Fase 2):</strong> minhocas são um petisco bom de pegar! As <strong>minhocas</strong> espalhadas pela fase valem <strong>50 pontos</strong> cada, mas <strong>disparam</strong> quando você chega perto (e batem nas paredes e nos obstáculos): voe atrás e encoste nelas. Elas não são obrigatórias para abrir a saída.</li>`,
        `<li><strong>Petiscos e skins:</strong> cada fase que você completa dá <strong>1 petisco</strong> (= 1 <strong>petscoin</strong>), guardado no seu nome de usuário. Na <strong>Lojinha de skins</strong>, no menu, troque petiscos por skins (a partir de 10 petscoin): para o passarinho (cores, tapa-olho de pirata, capacete de astronauta...) e também para os objetos do jogo, como os gatos de quintal, as sementes e os frutos. A lojinha é uma só, com uma aba para cada jogo, e <strong>cada categoria abre quando você chega à fase em que ela aparece</strong>. As skins só mudam o desenho.</li>`,
        `<li><strong>Bichinhos:</strong> no menu, toque em <strong>Bichinho</strong> para escolher com quem jogar. <strong>Cada bichinho tem as suas próprias 20 fases</strong>, com pontos, recordes, ranking, progresso e jogo salvo só dele: jogar um não mexe nos outros. <strong>Dentro de um bichinho a fase seguinte só abre quando você conclui a anterior</strong>. A <strong>lojinha de skins</strong>, os <strong>petscoin</strong>, o nome de usuário e a conta são de todos os bichinhos.</li>`,
        `<li><strong>Reforços:</strong> ao vencer uma fase você escolhe <strong>1 reforço</strong> entre <strong>3 opções sorteadas</strong> (de um conjunto de 6: asas fortes, fruto poderoso, vida extra, coração maior, penas grossas ou gatos lentos; a partir da Fase 11 entram mais 3: voo silencioso, olhar atento e chamado de semente). Ele fica com você nas fases seguintes; a próxima fase só começa depois da escolha. Começar uma fase pelo menu ou jogá-la de novo começa sem reforços.</li>`,
        `<li><strong>Crescer:</strong> na Fase 1 o passarinho é um <strong>filhote</strong> (menor, de cabeça grande). A cada fase vencida e a cada reforço escolhido ele cresce: vira um passarinho <strong>jovem</strong> e, por fim, um <strong>adulto</strong>. Mudam o desenho e o piu ao completar a fase (agudo no filhote, grave no adulto). É só o desenho e o som: o tamanho de contato e as regras são os mesmos. Na pausa o jogo diz em que fase de crescimento ele está.</li>`,
        `<li><strong>Vidas:</strong> você começa com 3, mostradas por corações vermelhos <span class="red">♥ ♥ ♥</span>, e pode ter de 1 a 5 (até 8 com o reforço <em>Coração maior</em>); <strong>a partir da Fase 11 o máximo sobe até 10</strong>. Alguns itens escondem uma <strong>vida extra</strong> (você só descobre ao pegar o item): cada uma dá +1 vida, até o máximo. As vidas que sobram <strong>passam para a fase seguinte</strong>.</li>`,
        `<li><strong>Sem vidas?</strong> Você tem até <strong>3 novas tentativas</strong> da fase em que está: ela recomeça do zero, com 3 vidas. Cada nova tentativa custa <strong>100 pontos</strong>.</li>`,
        `<li><strong>Pontuação:</strong> cada semente vale 100 pontos, cada fruto vale 150, cada minhoca vale 50 e, nas Fases 11 a 20, cumprir a missão da fase dá um bônus. Quanto mais rápido você termina, maior o <strong>bônus de tempo</strong>: ele diminui a cada 10 segundos a mais, até chegar a 0. Cada vida perdida <strong>desconta pontos</strong>, e a pontuação <strong>pode ficar negativa</strong>. Na mesma fase vale só a sua <strong>maior</strong> pontuação (jogar de novo não soma). Fases diferentes se somam. Para melhorar o recorde de uma fase, use <strong>Jogar fases anteriores</strong> no menu.</li>`,
        `<li><strong>Salvar:</strong> o jogo salva sozinho a cada poucos segundos e quando você pausa ou fecha a página. Você também pode tocar no botão de disquete no topo do jogo, ou em <strong>Salvar jogo</strong> na pausa. Para voltar de onde parou, escolha <strong>Continuar jogo</strong> no menu (o voo alto, o galho e o vento também voltam como estavam).</li>`,
        `<li><strong>Pausar:</strong> aperte a tecla <kbd>Esc</kbd> ou <kbd>P</kbd>, o botão <strong>Start</strong> do controle, ou toque no botão de pausa no topo do jogo.</li>`,
        `<li><strong>Som:</strong> o jogo tem efeitos sonoros (o passarinho <strong>pia</strong> e <strong>canta</strong> ao completar a fase; bicar a semente, fruto, minhoca, voo alto, pouso no galho, vento, bater asas, fôlego acabando, gatos que miam ameaçando, o grito do gavião, ser pego, perder e ganhar vida, passar de fase e fim de jogo). O navegador só libera o som depois do seu primeiro toque ou tecla. Para desligar, use o botão <strong>Som</strong> do menu ou da pausa, ou a tecla <kbd>M</kbd>.</li>`,
        `<li><strong>Teclado:</strong> <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> ou as setas movem; <kbd>Shift</kbd> ou <kbd>Espaço</kbd> (segurar) batem as asas; <kbd>Esc</kbd> ou <kbd>P</kbd> pausam (e continuam); <kbd>Ctrl</kbd>+<kbd>S</kbd> salva; <kbd>M</kbd> liga e desliga o som. Nos menus, use as setas <kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>Tab</kbd>) para escolher, <kbd>Enter</kbd> ou <kbd>Espaço</kbd> para confirmar e <kbd>Esc</kbd> para voltar.</li>`,
        `<li><strong>Controle (gamepad):</strong> conecte um controle (Bluetooth ou cabo) e aperte qualquer botão para ele ser reconhecido. O <strong>analógico esquerdo</strong> ou o <strong>direcional</strong> movem o passarinho; <strong>A</strong>, <strong>RB</strong> ou <strong>RT</strong> (segurar) batem as asas; <strong>Start</strong> pausa e continua; <strong>Y</strong> salva; nos menus, o direcional escolhe, <strong>A</strong> confirma e <strong>B</strong> volta.</li>`,
        `<li><strong>Pontuações:</strong> em <strong>Suas pontuações</strong>, só você vê o que fez. O <strong>ranking do jogo</strong> aparece para todos os jogadores deste aparelho e mostra apenas a melhor pontuação de cada um.</li>`,
        `<li><strong>Conta (opcional):</strong> em <strong>Escolher nome de usuário</strong> você pode criar uma conta com senha (de 4 a 20 caracteres) para proteger o seu nome neste aparelho.</li>`,
      ].join("\n        "),
      shopHelp: null,
      scoresHelp: `Em cada fase vale a sua <strong>maior</strong> pontuação (100 por semente + 150 por fruto + 50 por minhoca + bônus da missão nas Fases 11 a 20 + bônus de tempo − pontos por vida perdida − 100 por nova tentativa). Fases diferentes se somam.`,
      nameTip: `<strong>Dica:</strong> o nome pode ser o nome de um passarinho! Por exemplo: <strong>Piu</strong>.`,
      nameStep: `Pense em um nome. Pode ser o do seu passarinho.`,
      regHint: `Pode ser o nome de um passarinho! Até 16 letras ou números.`,
      canvasLabel: "Área do jogo: um passarinho coleta sementes, frutos e minhocas e foge dos gatos de quintal e dos gaviões. Pegar um fruto dá o voo alto por alguns segundos: o passarinho passa por cima dos muros e os gatos não o alcançam. Frutos de cores diferentes dão escudo, ar frio, rajada ou ímã. Segurar Shift, Espaço ou o botão Voar bate as asas enquanto houver fôlego; os galhos deixam o passarinho a salvo; as correntes de vento o empurram; as cercas baixas, pedras e arbustos só o passarinho atravessa",
      padLabel: "Controle direcional: arraste o dedo para mover o passarinho",
      pauseHelp: `Teclado: setas ou WASD movem · Shift ou Espaço (segurar) batem as asas · Esc ou P pausa · Ctrl+S salva · M liga e desliga o som.<br>Controle: analógico ou direcional movem · A, RB ou RT (segurar) batem as asas · Start pausa · Y salva · A escolhe · B volta.<br>Toque: arraste o controle redondo para mover · segure o botão Voar para bater as asas.`,
      docTitle: "Jogo do passarinho",
      runLabel: "Voar",
      runAria: "Voar: segure para bater as asas e ir mais rápido",
      runTitle: "Voar: segure para bater as asas e ir mais rápido",
    },
  };

  const PROFILES = { dog, cat, bird };

  // O perfil de um bichinho; um bichinho sem perfil (ainda) usa o do Cachorrinho.
  const of = (animal) => (Object.prototype.hasOwnProperty.call(PROFILES, animal) ? PROFILES[animal] : PROFILES[DEFAULT_ANIMAL]);

  // As chaves de um perfil, em caminhos ("noun.prey.many", "say.ballGot"...), para conferir que um perfil novo tem tudo o que o do Cachorrinho tem (e do mesmo tipo).
  function shape(profile, prefix = "", out = {}) {
    for (const [k, v] of Object.entries(profile)) {
      const path = prefix + k;
      if (v && typeof v === "object" && !Array.isArray(v)) { out[path] = "object"; shape(v, path + ".", out); } else out[path] = v === null ? "null" : typeof v;
    }
    return out;
  }

  return { PROFILES, of, shape, DEFAULT_ANIMAL };
});
