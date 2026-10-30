# Lojinha de skins — a lojinha única (0.19.0; skins por bichinho: 0.18.0; Passarinho: 0.20.0)

> Pedido do dono do projeto (0.15.9): *"Ao completar a fase, o cachorrinho ganha 1 petisco. Esse petisco poderá ser trocado por uma skin para o cachorrinho (portanto comece a planejar uma lojinha de skins com "valores" em petisco. Petscoin). 1 petisco = 1 petscoin. O valor mínimo da skin deve ser de 10 petscoin."*
>
> Pedido do dono do projeto (Atualização 4, 0.19.0): *"Acrescente novas skins na loja. Inclusive skins dos outros personagens e objetos que aparecem nas fases (as skins devem ficar liberadas para compra à medida que o jogador passa de fase). Então se não tem gatinhos na fase atual do jogador, ele ainda não pode comprar skins de gatinhos. As lojas não precisam ser separadas: pode ser uma loja só para compra de skins ou objetos ou outras coisas, para vários animaizinhos ou objetos e seres que aparecem durante os jogos e fases."*

## Moeda
- **Petisco = Petscoin** (1 para 1). Aparece no jogo como **petscoin** (saldo) e como **petisco** (o que se ganha).
- **Como ganhar:** **1 petisco a cada fase completada** (toda vez que a tela de vitória aparece, inclusive ao jogar de novo uma fase para melhorar o recorde), em qualquer jogo. Quem não tem nome de usuário não guarda o petisco (a tela de vitória avisa).
- **Onde fica:** na carteira do jogador (`wallet` em `js/records.js`, no `localStorage`): `{ t: petiscos, own: [skins compradas], eq: skin em uso }` (e `eqa`, a skin em uso das outras categorias; veja **Lojinha única**). Apagar a conta apaga a carteira. Máximo de 99999 petiscos e 200 skins por jogador.
- **Uma carteira para todos os jogos:** o petisco de uma fase concluída no Cachorrinho, no Gatinho ou no Passarinho vai para o mesmo saldo, e o saldo é o mesmo em todas as abas da lojinha.
- **Preço mínimo e máximo:** `MIN_SKIN_PRICE = 10`. A compra é recusada se o preço for menor (`buySkin`), e o teste confere todo o catálogo. O catálogo (`Skins.register`) também recusa uma skin mais cara que o maior saldo possível (99999 petscoin, `Skins.MAX_PRICE`), que nunca poderia ser comprada.

## Catálogo (0.15.9)
| Skin | Preço | Como é |
|---|---|---|
| Caramelo | grátis | o cachorrinho de sempre (padrão) |
| Cinza-prata | 10 | pelo cinza |
| Dálmata | 12 | branco com manchas pretas |
| Chocolate | 15 | pelo marrom |
| Dourado | 20 | pelo dourado e coleira de ouro |
| Arco-íris | 25 | pelo rosa-bebê e coleira de arco-íris |
| Pirata | 30 | bandana vermelha e tapa-olho |
| Astronauta | 40 | capacete de astronauta |
| Super-cão | 50 | capa vermelha de super-herói |

Todas funcionam nos 3 tamanhos (filhote, jovem e adulto) e nas 4 direções, e **só mudam o desenho**: o tamanho de contato (24 × 24), a velocidade e as regras são os mesmos. Estas são as skins da categoria **Cachorrinho** (`dog`).

## Skins por bichinho (0.18.0, Gatinho)
O Gatinho tem a categoria **Gatinho** (`cat`) na aba dele, com as **12 skins do gato** (`CatArt.SKINS` em `js/cat-art.js`: id, nome, frase e preço) e o gatinho desenhado na prévia (`drawCat` com `still: true` e a skin). A moeda, o saldo e o preço mínimo (`MIN_SKIN_PRICE = 10`) são os mesmos; o que muda é **de quem é cada skin**.

| Skin do gato | Preço | Como é |
|---|---|---|
| Rajado | grátis | o gatinho de sempre (padrão) |
| Preto | 10 | pelo preto |
| Branco | 12 | pelo branco |
| Cinza | 14 | pelo cinza |
| Laranja | 16 | pelo laranja |
| Siamês | 20 | pontas escuras e olhos azuis |
| Van Turco | 22 | cabeça e cauda coloridas |
| Tricolor | 25 | manchas brancas, laranjas e pretas |
| Smoking | 28 | preto com peito branco |
| Pirata | 30 | bandana vermelha e tapa-olho |
| Astronauta | 40 | capacete de astronauta |
| Super-gato | 50 | capa vermelha de super-herói |

(Os nomes podem lembrar raças; as skins são **só visuais**: nenhuma muda tamanho de contato, velocidade, fôlego, pontos nem sons, e a simulação A/B do `tests/e2e.js` prova isso com as 12.)

**Como fica guardado** (`js/records.js`, chave `cachorrinho.v1`, `wallet[jogador]`):
- **Cachorrinho, idêntico ao de antes:** `{ "t": petiscos, "own": ["cinza", ...], "eq": "cinza" }`. `wallet(nome)` continua devolvendo `{ treats, owned, equipped }` só com as skins do Cachorrinho.
- **Outros bichinhos e objetos, no mesmo registro:** o id da skin leva o prefixo da categoria em `own` (`"cat:preto"`, `"agent:azul"`), para não colidir com os do Cachorrinho (Cinza, Pirata e Astronauta existem nos dois catálogos), e a skin em uso fica em `eqa` (`"eqa": { "cat": "preto", "agent": "azul" }`, que perde a chave quando a categoria volta à padrão e some quando fica vazio). **Esses campos só aparecem quando o jogador compra ou usa uma skin fora do Cachorrinho**; quem só joga com o Cachorrinho guarda exatamente o JSON de antes.
- **No jogo:** `drawCatPlayer` desenha o gatinho com a skin em uso da carteira (lida ao começar a fase e ao comprar ou usar na lojinha).

## Lojinha única (0.19.0)
A lojinha é uma só: skins **dos bichinhos e dos objetos que aparecem nas fases**, de todos os jogos, com a mesma carteira. O catálogo está em `js/skins.js` (categorias, fase de liberação, registro e regra de liberação); as skins dos objetos do Cachorrinho em `js/skins-dog.js`, as dos objetos do Gatinho em `js/skins-cat.js`, as dos objetos do Passarinho em `js/skins-bird.js`; o bichinho (`dog`, `cat` e `bird`) é registrado em `js/game.js`.

### Na tela
- **Menu → Lojinha de skins.** O **saldo e o aviso** ficam fixos no alto e o **Voltar** fica sempre à vista no pé da tela. Sem nome de usuário a lojinha só mostra as skins (botões desligados) e pede um nome.
- **Abas por jogo:** *Cachorrinho | Gatinho | Passarinho* (um jogo que ainda não está pronto aparece desligado, "em breve"). A lojinha abre **no bichinho escolhido** e **na categoria do próprio bichinho**; trocar de aba e voltar reabre a categoria em que o jogo estava.
- **Categorias dentro do jogo:** uma aba (chip) para cada categoria. Cada uma tem os cartões de sempre: prévia desenhada, nome, frase, preço e o botão **Comprar (N petscoin)**, **Usar** ou **Em uso**. **Comprar já deixa a skin em uso**; há **uma skin em uso por categoria**, e ela só aparece no jogo do bichinho a que a categoria pertence.
- **Categoria bloqueada:** aparece na lista de abas **apagada, com cadeado e a fase** (*Gatos 🔒 Fase 11*) e, ao abrir, mostra só **Libera ao chegar à Fase N do Cachorrinho** (e em que fase o jogador está), sem cartões nem botões de comprar. Uma skin que abre mais tarde que a categoria (campo `from` da skin, nunca antes) mostra *Skin escondida* e o bloqueio no próprio cartão, e a compra é recusada até o jogador alcançar a fase dela. Nenhuma skin do catálogo usa isso hoje; um teste de navegador confere o comportamento com uma skin de teste (`node tests/e2e.js "Lojinha única: skin com fase própria"`).
- **Foco e rolagem:** ao abrir, o foco fica na aba do jogo aberto (sempre à vista no alto; um botão *Comprar* lá embaixo podia ficar fora da tela, e o Enter comprava sem o jogador ver). O conteúdo fica alinhado ao topo, para a barra de abas não pular ao trocar entre uma categoria longa e uma bloqueada, e, depois de abrir uma categoria ou outro jogo, a tela rola o mínimo para mostrar o começo da lista (pelo menos 60 px do primeiro cartão, entre o saldo e o Voltar fixos) sem tirar o foco da aba. Abaixo de 300 px de largura as abas dos jogos passam para mais de uma linha.
- **Teclado e leitor de tela:** as categorias do próprio bichinho se chamam *O cachorrinho* e *O gatinho* para o leitor de tela (o texto na tela é o mesmo da aba do jogo), e as abas são `tablist` / `tab` com `aria-selected`, e o painel (`tabpanel`) é rotulado pela aba aberta; ← → (e Início e Fim) andam entre as abas, ↑ ↓ passam pela aba aberta e entram na lista, Tab vai da aba aberta direto para os cartões; a aba bloqueada se chama, por exemplo, *Gatos, bloqueada. Libera ao chegar à Fase 11 do Cachorrinho*; o foco não se perde ao trocar de aba nem ao comprar. Cabe em 320×568, 360×640, 390×780, 740×390, 568×320 e 1000×700 sem rolagem lateral, com alvos de toque de 44 px (40 px nas telas baixas).
- O menu mostra *Petscoin: N* junto das fases concluídas, e a tela de vitória diz *Petisco ganho! +1 petscoin (você tem N)*.

### Categorias e fases de liberação
A categoria libera quando o jogador **alcançou a fase em que o objeto aparece pela primeira vez, no jogo dele**: alcançar a Fase N é ter concluído a N−1 (sem nada concluído vale a Fase 1; o máximo é a 20). O progresso é de cada jogo: o do Gatinho não libera categorias do Cachorrinho e o do Cachorrinho não libera as do Gatinho. Exemplo: quem não chegou à Fase 11 do Cachorrinho não compra skins de gatos; ao concluir a Fase 10 do Cachorrinho a categoria *Gatos* libera.

| Jogo | Categoria | Chave | Libera ao chegar à fase | O que são |
|---|---|---|---|---|
| Cachorrinho | Cachorrinho | dog | 1 | o bichinho que você joga |
| Cachorrinho | Agentes da carrocinha | agent | 1 | os agentes que perseguem o cachorrinho |
| Cachorrinho | Rações | ration | 1 | as tigelas de ração |
| Cachorrinho | Saída | exit | 1 | a saída da fase |
| Cachorrinho | Carteiros | postman | 2 | os agentes assustados pelo poder do osso |
| Cachorrinho | Ossos | bone | 2 | os ossos |
| Cachorrinho | Bolinhas | ball | 2 | as bolinhas que fogem |
| Cachorrinho | Blocos e paredes | block | 3 | os blocos e as paredes que se movem |
| Cachorrinho | Vans da carrocinha | van | 4 | as vans das cidades |
| Cachorrinho | Gatos | foecat | 11 | os gatos que atrapalham a partir da Fase 11 |
| Gatinho | Gatinho | cat | 1 | o bichinho que você joga |
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
| Passarinho | Frutos | berry | 2 | os frutos com poderes |
| Passarinho | Minhocas | bug | 2 | as minhocas que saem da terra e fogem |
| Passarinho | Poleiros | roost | 3 | os galhos em que o passarinho fica a salvo |
| Passarinho | Ventos | gust | 3 | as correntes de vento que empurram o passarinho |
| Passarinho | Gaviões | hawk | 11 | os gaviões que voam atrás do passarinho a partir da Fase 11 |

### Skins do Passarinho (0.20.0)
O jogo do Passarinho tem **9 categorias**: o passarinho (`bird`: as **12 skins** de `BirdArt.SKINS`, de 10 a 50 petscoin, com Marrom grátis; o passarinho desenhado na prévia) e **8 categorias de objetos com 4 skins cada** (`js/skins-bird.js`, de 10 a 30 petscoin, em escada). Como nos outros jogos, **só mudam o desenho**: nenhuma muda regra, velocidade, alcance, pontos nem tamanho de contato, e o passarinho continua genérico (as cores e os enfeites não dizem espécie).

| Categoria | Skins (preço em petscoin) | O que muda |
|---|---|---|
| Sementes `seed` | Algodão-doce (10), Sementes douradas (14), Sementes coloridas (20), Sementes de gelo (26) | a cor dos 3 tipos de semente e um brilhinho em volta; sempre claras, para aparecerem na noite |
| Gatos de quintal `stray` | Coleira azul (10), Lenço verde (15), Gatos de sorvete (21), Gato de festa (28) | coleira, lenço, chapéu de festa e 4 pelagens claras |
| Ninho (saída) `birdexit` | Ninho listrado (10), Ninho arco-íris (16), Ninho estrelado (22), Ninho dourado (30) | só o enfeite (listras, arco-íris, estrelas ou moldura); continua verde aberto e vermelho fechado |
| Frutos `berry` | Fruto listrado (10), Fruto de bolinhas (14), Fruto de corações (20), Fruto estrelado (26) | só uma estampa por cima; a cor-chave de cada poder e a marquinha (asinha, estrela, floco, raio, ímã) nunca mudam |
| Minhocas `bug` | Algodão-doce (10), Gorro de tricô (15), Laço de fita (21), Cachecol listrado (27) | cores claras e enfeites na cabeça; a minhoca enterrada (o montinho de terra) é sempre a mesma |
| Poleiros `roost` | Galho de cerejeira (10), Poleiro de bambu (14), Balanço de passarinho (20), Casinha de passarinho (28) | o estilo do galho, no lugar do galho do ambiente; o passarinho continua a salvo em cima |
| Ventos `gust` | Fitas azuis (10), Vento de tracinhos (15), Vento de bolinhas (21), Fitas de folhas (27) | só o estilo (fitas, tracinhos ou bolinhas) e a cor das fitas e da setinha; direção e força são as do jogo |
| Gaviões `hawk` | Penas prateadas (10), Cachecol de lã (15), Gavião de festa (21), Faixa de campeão (28) | pelagem clara, cachecol, chapéu de festa e faixa na cabeça |

Os campos visuais de cada categoria estão documentados no topo de `js/skins-bird.js` (a skin padrão de cada categoria não tem campo nenhum e o jogo desenha exatamente como sempre) e `tests/skins-bird.test.js` confere: preços, textos, que cada skin desenha diferente da padrão, que nada passa do tamanho do objeto (só o enfeite), as cores-chave dos frutos, o ninho verde e vermelho, o pelo claro de gatos, gaviões, sementes e minhocas e a fase `from` de cada categoria com os mapas (`js/bird-levels.js`). A soma dos catálogos (126 skins pagas em 27 categorias) cabe nos limites da carteira (200 skins e 40 categorias).

**Skins de osso.** A skin de osso muda o osso **comum**. Os ossos de ouro, gelo, turbo e ímã (Fases 11 a 20) mantêm a cor e o brilho do efeito e só recebem o desenho da skin em tom sobre tom, para ninguém confundir o que cada um faz.

Um teste de navegador confere cada `from` com os mapas de verdade (a primeira fase do jogo em que o objeto existe, e que ele continua nas seguintes); o critério de cada categoria está escrito no próprio teste (`node tests/e2e.js "Lojinha única: a fase"`). As skins de objeto só mudam o **desenho**: nenhuma muda regra, velocidade, alcance, pontos ou tempo.

### Carteira por categoria (`js/records.js`)
- **API:** `buySkin(nome, id, preço, categoria = "dog", opções)`, `equipSkin(nome, id, categoria = "dog")`, `equippedSkin(nome, categoria = "dog")` e `wallet(nome, categoria = "dog")` (o saldo é o mesmo; `owned` e `equipped` são da categoria, com ids sem prefixo; `"dog"` e `"cat"` são os bichinhos, então as chamadas de antes continuam valendo). Novas: `equippedSkins(nome)`, que devolve a skin em uso de **todas** as categorias de uma vez (`{ dog: "", cat: "preto", agent: "azul", ... }`; o jogo usa para preencher a skin em uso de cada categoria, `looks[categoria]`, ao começar uma fase e ao comprar ou usar), e `reachedLevel(nome, jogo)`, a fase mais alta alcançada naquele jogo (1 a 20).
- **A trava é do armazenamento, não só da tela:** `buySkin` recusa com `{ ok: false, error: "locked" }` uma categoria cujo jogo ainda não alcançou a fase `from`, mesmo com saldo e mesmo quando uma tela velha ou outra aba pede a compra. Essa trava protege contra tela velha, outra aba e engano; **não é segurança de verdade**: tudo fica no `localStorage` do próprio aparelho, então quem edita os dados à mão ou chama as funções pelo console consegue burlá-la (uma conta local não impede isso). Quem diz o jogo e a fase é o catálogo (`Skins.slot(categoria).game`, `Skins.fromOf`); `opções` (`{ game, from }`, do chamador) só pode **exigir mais**, nunca menos, e um jogo diferente do catálogo é pedido inválido. A ordem dos erros é `invalid`, `locked`, `owned`, `funds`.
- **Limites e validação ao carregar:** só ids válidos (`/^[a-z0-9-]{1,24}$/`; categorias de 2 a 12 letras minúsculas; `dog:` com prefixo e tipos errados são descartados), no máximo **200 skins** e **40 categorias** por jogador (eram 60 skins até a 0.18.0), uma skin só vale como em uso se o jogador for dono dela; uma skin que existe no armazenamento mas não no catálogo conta como a padrão. Apagar a conta apaga tudo (skins, skins em uso e progresso, e as categorias bloqueadas voltam a travar); duas abas continuam consistentes (a trava lê o progresso de agora, e a tela da lojinha se atualiza sozinha).
- **Formato idêntico ao da 0.18.0** enquanto só há dados do Cachorrinho: recusas, leituras e categorias bloqueadas não gravam nada.
- **Abas antigas:** as versões 0.16.1, 0.17.0 e 0.18.0 não conhecem tudo o que a lojinha única guarda. Se uma aba ainda aberta numa delas regravar a carteira (por exemplo, ao comprar uma skin do Cachorrinho): **a 0.16.1 e a 0.17.0 apagam as skins das categorias novas**; **a 0.18.0 as mantém, mas corta a carteira em 60 skins** (as que passam disso se perdem). Recarregue a página para usar a versão nova.

## Ideias para depois (não feitas)
- Mais skins (festa, esqueleto, neve), **acessórios** separados da cor (chapéus, óculos, laços) e **rastros** (pegadas coloridas).
- Preços maiores para skins de "coleção" (100 ou mais) e **pacotes** (3 skins por um preço menor).
- Petiscos extras por **missão cumprida** (Fases 11 a 20), por **recorde batido** e por **conquistas** (primeira fase sem perder vida, todas as bolinhas de uma fase).
- Mostrar a skin no ranking.
- Se um dia houver servidor: guardar a carteira na conta (hoje ela vale só neste aparelho, como as pontuações).

## Onde está no código
- `js/skins.js`: o catálogo único (`GAMES`, `SLOTS` com o `from` de cada categoria, `register`, `list`, `get`, `has`, `fromOf`, `unlocked`). `unlocked` é a regra «alcançou a fase» que a tela da lojinha usa; `js/records.js` (`gateOf`) faz a mesma comparação por conta própria, com uma cópia local, porque a trava do armazenamento também vale sem a tela. Testes em `tests/skins.test.js`.
- `js/skins-dog.js`, `js/skins-cat.js` e `js/skins-bird.js`: as skins dos objetos de cada jogo; `js/game.js`: `SKINS` (o catálogo do Cachorrinho), `skinsOf(bichinho)` (o do Gatinho é o `CatArt.SKINS`; o do Passarinho, o `BirdArt.SKINS`), o registro das categorias `dog`, `cat` e `bird`, `refreshSkin` (a skin em uso de cada categoria), `lookOf`, `withLook` e `PREVIEW` (o mostruário de cada categoria), `renderShop`/`openShop` (a tela: abas, categorias, bloqueio, cartões) e a linha *Petisco ganho!* em `win()`.
- `js/records.js`: `MIN_SKIN_PRICE`, `wallet`, `addTreats`, `buySkin`, `equipSkin`, `equippedSkin`, `equippedSkins`, `reachedLevel` (e `deleteAccount` apaga a carteira). Testes em `tests/records.test.js`.
- `js/profiles.js`: `shop` (prévia, skin em uso e compra do próprio bichinho); o título e a ajuda da lojinha são únicos (`index.html`).
- `index.html` / `css/style.css`: a tela `#shop` (`#shop-games`, `#shop-cats`, `#shop-list`), `#win-treat` e o botão `#btn-shop`.
- `tests/e2e.js`: a seção *0.15.9: petiscos, petscoin e lojinha de skins*, *0.18.0 · Gatinho: sons e skins* e as seções *0.19.0 · Lojinha única* (abas, liberação por fase, skin com fase própria, comprar e usar, tamanhos de tela, fase `from` conferida com os mapas e documentação), *skins dos objetos do Cachorrinho* e *Skins do Gatinho* (o desenho idêntico com tudo no padrão, os pixels de cada skin, os mostruários, as telas e o desempenho) e *Skins do Passarinho* (os mostruários das 9 categorias, a lojinha do Passarinho, o `from` com os mapas e as skins de um jogo que não aparecem nos outros; `tests/e2e-bird-skins.js`). Para rodar só uma delas: `node tests/e2e.js "Lojinha única"`, `node tests/e2e.js "skins dos objetos do Cachorrinho"`, `node tests/e2e.js "Skins do Gatinho"` ou `node tests/e2e.js "Skins do Passarinho"`.
- `tests/skins-dog.test.js` (Node): as skins dos objetos do Cachorrinho (as 10 categorias de `js/skins-dog.js`, preços, textos, campos visuais e o desenho de `js/game.js` lendo cada campo). `tests/skins-cat.test.js` (Node, com um ctx de mentira): as skins dos objetos do Gatinho (as 6 categorias de `js/skins-cat.js`, o desenho de `js/cat-art.js` com cada skin, as cores-chave dos 5 poderes do novelo e os ratinhos claros na noite). `tests/skins-bird.test.js` (Node, com um ctx de mentira): as skins dos objetos do Passarinho (as 8 categorias de `js/skins-bird.js`, o desenho de `js/bird-art.js` com cada skin, as cores-chave dos 5 frutos, o ninho verde e vermelho e o pelo claro na noite). `tests/skins-cat-frame.js` não é um teste: roda dentro da página e devolve o hash de pixels de cada cena do Gatinho (usado pelo e2e e por `tools/skin-preview/cat-skins.js`). Rodam com `node tests/skins-dog.test.js`, `node tests/skins-cat.test.js` e `node tests/skins-bird.test.js`. `tests/wiring.test.js` (Node, `node tests/wiring.test.js`) confere a fiação: a ordem dos scripts do `index.html` (`js/skins.js` antes de `js/skins-dog.js`, `js/skins-cat.js` e `js/skins-bird.js`, todos antes de `js/game.js`, com `js/bird-art.js` também antes) e que `renderShop` passa o jogo da categoria ao progresso (`reachedLevel`) e usa `Skins.unlocked`.
- Ganchos de teste de `window.__game` (`js/game.js`): `look(categoria)` (a skin em uso da categoria), `setLook(categoria, id)` (troca a skin em uso sem mexer na carteira; id vazio volta à padrão) e `skinPreview(categoria, canvas, id)` (desenha o mostruário da lojinha daquela skin).
- `tools/skin-preview/` (capturas com o jogo de verdade, no Playwright; `NODE_PATH` e `CHROMIUM_PATH` como nos testes e `PREVIEW_LOCK=<arquivo>` para reexecutar sob `flock`): `node tools/skin-preview/shoot.js <pasta-de-saída> [categorias] [lojinha|jogo|tudo]` fotografa as skins dos objetos do Cachorrinho (o mostruário da lojinha e o objeto dentro do jogo, ampliado); `node tools/skin-preview/cat-skins.js <pasta-de-saída> [fase=20] [noite=18] [cats=...] [zoom=3] [vp=1000x700]` faz o mesmo com os objetos do Gatinho, de dia e de noite, e uma folha com os 5 poderes do novelo; `node tools/skin-preview/bird-skins.js <pasta-de-saída> [cats=...] [esc=1] [fundo=escuro|claro]` fotografa os mostruários da lojinha das 9 categorias do Passarinho (uma folha com todas as skins de cada uma).
