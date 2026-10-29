# Lojinha de skins — a lojinha única (0.19.0; skins por bichinho: 0.18.0)

> Pedido do dono do projeto (0.15.9): *"Ao completar a fase, o cachorrinho ganha 1 petisco. Esse petisco poderá ser trocado por uma skin para o cachorrinho (portanto comece a planejar uma lojinha de skins com "valores" em petisco. Petscoin). 1 petisco = 1 petscoin. O valor mínimo da skin deve ser de 10 petscoin."*
>
> Pedido do dono do projeto (Atualização 4, 0.19.0): *"Acrescente novas skins na loja. Inclusive skins dos outros personagens e objetos que aparecem nas fases (as skins devem ficar liberadas para compra à medida que o jogador passa de fase). Então se não tem gatinhos na fase atual do jogador, ele ainda não pode comprar skins de gatinhos. As lojas não precisam ser separadas: pode ser uma loja só para compra de skins ou objetos ou outras coisas, para vários animaizinhos ou objetos e seres que aparecem durante os jogos e fases."*

## Moeda
- **Petisco = Petscoin** (1 para 1). Aparece no jogo como **petscoin** (saldo) e como **petisco** (o que se ganha).
- **Como ganhar:** **1 petisco a cada fase completada** (toda vez que a tela de vitória aparece, inclusive ao jogar de novo uma fase para melhorar o recorde), em qualquer jogo. Quem não tem nome de usuário não guarda o petisco (a tela de vitória avisa).
- **Onde fica:** na carteira do jogador (`wallet` em `js/records.js`, no `localStorage`): `{ t: petiscos, own: [skins compradas], eq: skin em uso }` (e `eqa`, a skin em uso das outras categorias; veja **Lojinha única**). Apagar a conta apaga a carteira. Máximo de 99999 petiscos e 200 skins por jogador.
- **Uma carteira para todos os jogos:** o petisco de uma fase concluída no Cachorrinho ou no Gatinho vai para o mesmo saldo, e o saldo é o mesmo em todas as abas da lojinha.
- **Preço mínimo:** `MIN_SKIN_PRICE = 10`. A compra é recusada se o preço for menor (`buySkin`), e o teste confere todo o catálogo.

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
Com a Atualização 4, o Gatinho tem a categoria **Gatinho** (`cat`) na aba dele, com as **12 skins do gato** (`CatArt.SKINS` em `js/cat-art.js`: id, nome, frase e preço) e o gatinho desenhado na prévia (`drawCat` com `still: true` e a skin). A moeda, o saldo e o preço mínimo (`MIN_SKIN_PRICE = 10`) são os mesmos; o que muda é **de quem é cada skin**.

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
A Atualização 4 juntou tudo numa lojinha só: skins **dos bichinhos e dos objetos que aparecem nas fases**, de todos os jogos, com a mesma carteira. O catálogo está em `js/skins.js` (categorias, fase de liberação, registro e regra de liberação); as skins dos objetos do Cachorrinho em `js/skins-dog.js`, as dos objetos do Gatinho em `js/skins-cat.js`; o bichinho (`dog` e `cat`) é registrado em `js/game.js`.

### Na tela
- **Menu → Lojinha de skins.** O **saldo e o aviso** ficam fixos no alto e o **Voltar** fica sempre à vista no pé da tela. Sem nome de usuário a lojinha só mostra as skins (botões desligados) e pede um nome.
- **Abas por jogo:** *Cachorrinho | Gatinho | Passarinho* (o Passarinho aparece desligado, "em breve"; o Gatinho também fica "em breve" enquanto não estiver pronto). A lojinha abre **no bichinho escolhido** e **na categoria do próprio bichinho**; trocar de aba e voltar reabre a categoria em que o jogo estava.
- **Categorias dentro do jogo:** uma aba (chip) para cada categoria. Cada uma tem os cartões de sempre: prévia desenhada, nome, frase, preço e o botão **Comprar (N petscoin)**, **Usar** ou **Em uso**. **Comprar já deixa a skin em uso**; há **uma skin em uso por categoria**, e ela só aparece no jogo do bichinho a que a categoria pertence.
- **Categoria bloqueada:** aparece na lista de abas **apagada, com cadeado e a fase** (*Gatos 🔒 Fase 11*) e, ao abrir, mostra só **Libera ao chegar à Fase N do Cachorrinho** (e em que fase o jogador está), sem cartões nem botões de comprar. Uma skin que abre mais tarde que a categoria mostra o bloqueio no próprio cartão.
- **Teclado e leitor de tela:** as abas são `tablist` / `tab` com `aria-selected`, e o painel (`tabpanel`) é rotulado pela aba aberta; ← → (e Início e Fim) andam entre as abas, ↑ ↓ passam pela aba aberta e entram na lista, Tab vai da aba aberta direto para os cartões; a aba bloqueada se chama, por exemplo, *Gatos, bloqueada. Libera ao chegar à Fase 11 do Cachorrinho*; o foco não se perde ao trocar de aba nem ao comprar. Cabe em 320×568, 360×640, 390×780, 740×390, 568×320 e 1000×700 sem rolagem lateral, com alvos de toque de 44 px (40 px nas telas baixas).
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
| Gatinho | Gatos rastreadores | tracker | 11 | os rastreadores que seguem o rastro |

Um teste de navegador confere cada `from` com os mapas de verdade (a primeira fase do jogo em que o objeto existe, e que ele continua nas seguintes); o critério de cada categoria está escrito no próprio teste (`node tests/e2e.js "Lojinha única: a fase"`). As skins de objeto só mudam o **desenho**: nenhuma muda regra, velocidade, alcance, pontos ou tempo.

### Carteira por categoria (`js/records.js`)
- **API:** `buySkin(nome, id, preço, categoria = "dog", opções)`, `equipSkin(nome, id, categoria = "dog")`, `equippedSkin(nome, categoria = "dog")` e `wallet(nome, categoria = "dog")` (o saldo é o mesmo; `owned` e `equipped` são da categoria, com ids sem prefixo; `"dog"` e `"cat"` são os bichinhos, então as chamadas de antes continuam valendo). Novas: `equippedSkins(nome)`, que devolve a skin em uso de **todas** as categorias de uma vez (`{ dog: "", cat: "preto", agent: "azul", ... }`; o jogo usa para preencher a skin em uso de cada categoria, `looks[categoria]`, ao começar uma fase e ao comprar ou usar), e `reachedLevel(nome, jogo)`, a fase mais alta alcançada naquele jogo (1 a 20).
- **A trava é do armazenamento, não só da tela:** `buySkin` recusa com `{ ok: false, error: "locked" }` uma categoria cujo jogo ainda não alcançou a fase `from`, mesmo com saldo e mesmo se alguém chamar a função pelo console. Quem diz o jogo e a fase é o catálogo (`Skins.slot(categoria).game`, `Skins.fromOf`); `opções` (`{ game, from }`, do chamador) só pode **exigir mais**, nunca menos, e um jogo diferente do catálogo é pedido inválido. A ordem dos erros é `invalid`, `locked`, `owned`, `funds`.
- **Limites e validação ao carregar:** só ids válidos (`/^[a-z0-9-]{1,24}$/`; categorias de 2 a 12 letras minúsculas; `dog:` com prefixo e tipos errados são descartados), no máximo **200 skins** e **40 categorias** por jogador (eram 60 skins até a 0.18.0), uma skin só vale como em uso se o jogador for dono dela; uma skin que existe no armazenamento mas não no catálogo conta como a padrão. Apagar a conta apaga tudo (skins, skins em uso e progresso, e as categorias bloqueadas voltam a travar); duas abas continuam consistentes (a trava lê o progresso de agora, e a tela da lojinha se atualiza sozinha).
- **Formato idêntico ao da 0.18.0** enquanto só há dados do Cachorrinho: recusas, leituras e categorias bloqueadas não gravam nada.
- **Abas antigas:** as versões 0.16.1, 0.17.0 e 0.18.0 não conhecem o que a lojinha única guarda; se uma aba ainda aberta numa delas regravar a carteira (por exemplo, ao comprar uma skin do Cachorrinho), ela **apaga as skins das categorias novas** (e a 0.18.0 corta a lista em 60 skins). Recarregue a página para usar a versão nova.

## Ideias para depois (não feitas)
- Mais skins (festa, esqueleto, neve), **acessórios** separados da cor (chapéus, óculos, laços) e **rastros** (pegadas coloridas).
- Preços maiores para skins de "coleção" (100 ou mais) e **pacotes** (3 skins por um preço menor).
- Petiscos extras por **missão cumprida** (Fases 11 a 20), por **recorde batido** e por **conquistas** (primeira fase sem perder vida, todas as bolinhas de uma fase).
- O **Passarinho** entra como mais uma aba de jogo, com as categorias dele (`Skins.GAMES` já o lista, desligado).
- Mostrar a skin no ranking.
- Se um dia houver servidor: guardar a carteira na conta (hoje ela vale só neste aparelho, como as pontuações).

## Onde está no código
- `js/skins.js`: o catálogo único (`GAMES`, `SLOTS` com o `from` de cada categoria, `register`, `list`, `get`, `has`, `fromOf`, `unlocked`, `ownKey`). Testes em `tests/skins.test.js`.
- `js/skins-dog.js` e `js/skins-cat.js`: as skins dos objetos de cada jogo; `js/game.js`: `SKINS` (o catálogo do Cachorrinho), `skinsOf(bichinho)` (o do Gatinho é o `CatArt.SKINS`), o registro das categorias `dog` e `cat`, `refreshSkin` (a skin em uso de cada categoria), `lookOf`, `withLook` e `PREVIEW` (o mostruário de cada categoria), `renderShop`/`openShop` (a tela: abas, categorias, bloqueio, cartões) e a linha *Petisco ganho!* em `win()`.
- `js/records.js`: `MIN_SKIN_PRICE`, `wallet`, `addTreats`, `buySkin`, `equipSkin`, `equippedSkin`, `equippedSkins`, `reachedLevel` (e `deleteAccount` apaga a carteira). Testes em `tests/records.test.js`.
- `js/profiles.js`: `shop` (prévia, skin em uso e compra do próprio bichinho); o título e a ajuda da lojinha são únicos (`index.html`).
- `index.html` / `css/style.css`: a tela `#shop` (`#shop-games`, `#shop-cats`, `#shop-list`), `#win-treat` e o botão `#btn-shop`.
- `tests/e2e.js`: a seção *0.15.9: petiscos, petscoin e lojinha de skins*, *0.18.0 · Gatinho: sons e skins* e as seções *0.19.0 · Lojinha única* (abas, liberação por fase, comprar e usar, tamanhos de tela, fase `from` conferida com os mapas e documentação).
