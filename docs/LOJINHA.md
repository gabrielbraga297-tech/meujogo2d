# Lojinha de skins — plano e estado (0.15.9; skins por bichinho: 0.18.0)

> Pedido do dono do projeto: *"Ao completar a fase, o cachorrinho ganha 1 petisco. Esse petisco poderá ser trocado por uma skin para o cachorrinho (portanto comece a planejar uma lojinha de skins com "valores" em petisco. Petscoin). 1 petisco = 1 petscoin. O valor mínimo da skin deve ser de 10 petscoin."*

## Moeda
- **Petisco = Petscoin** (1 para 1). Aparece no jogo como **petscoin** (saldo) e como **petisco** (o que se ganha).
- **Como ganhar:** **1 petisco a cada fase completada** (toda vez que a tela de vitória aparece, inclusive ao jogar de novo uma fase para melhorar o recorde). Quem não tem nome de usuário não guarda o petisco (a tela de vitória avisa).
- **Onde fica:** na carteira do jogador (`wallet` em `js/records.js`, no `localStorage`): `{ t: petiscos, own: [skins compradas], eq: skin em uso }`. Apagar a conta apaga a carteira. Máximo de 99999 petiscos e 200 skins por jogador.
- **Bichinhos (0.17.0 e 0.18.0):** a carteira é **única**: o petisco de uma fase concluída em qualquer bichinho vai para o mesmo saldo. Desde a 0.18.0 (Gatinho) **as skins compradas e em uso são por bichinho** (veja **Skins por bichinho** abaixo). Veja **Bichinhos (0.17.0)** no README.
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

Todas funcionam nos 3 tamanhos (filhote, jovem e adulto) e nas 4 direções, e **só mudam o desenho**: o tamanho de contato (24 × 24), a velocidade e as regras são os mesmos.

## Skins por bichinho (0.18.0, Gatinho)
Com o **Gatinho** escolhido, a lojinha mostra as **12 skins do gato** (`CatArt.SKINS` em `js/cat-art.js`: id, nome, frase e preço) com o gatinho desenhado na prévia (`drawCat` com `still: true` e a skin). A moeda, o saldo e o preço mínimo (`MIN_SKIN_PRICE = 10`) são os mesmos; o que muda é **de quem é cada skin**.

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
- **Outros bichinhos, no mesmo registro:** o id da skin leva o prefixo do bichinho em `own` (`"cat:preto"`), para não colidir com os do Cachorrinho (Cinza, Pirata e Astronauta existem nos dois catálogos), e a skin em uso fica em `eqa` (`"eqa": { "cat": "preto" }`, que some quando o gatinho volta à padrão). **Esses campos só aparecem quando o jogador compra ou usa uma skin do gato**; quem só joga com o Cachorrinho guarda exatamente o JSON de antes.
- **API:** `buySkin(nome, id, preço, bichinho = "dog")`, `equipSkin(nome, id, bichinho = "dog")`, `equippedSkin(nome, bichinho = "dog")` e `wallet(nome, bichinho = "dog")` (o saldo é o mesmo; `owned` e `equipped` vêm com os ids sem prefixo). O limite de 60 skins vale para o total do jogador.
- **Dados adulterados** (ids desconhecidos, `cat:` sem skin, `cat:` como skin em uso do Cachorrinho, `eqa` com tipo errado) são ignorados sem derrubar nada; uma skin que existe no armazenamento mas não no catálogo conta como a padrão. Apagar a conta apaga tudo, e duas abas continuam consistentes (a tela da lojinha se atualiza sozinha).
- **No jogo:** `drawCatPlayer` desenha o gatinho com a skin em uso da carteira (lida ao começar a fase e ao comprar ou usar na lojinha).

**O que vem depois (Atualização 4):** a loja vai ser **ampliada** (liberação de skins por fase, pacotes, novos bichinhos). Por enquanto todas as skins de cada bichinho estão à venda desde a primeira fase.

## Como funciona na tela
- **Menu → Lojinha de skins:** mostra o saldo, um mostruário (o cachorrinho adulto, de lado) e um botão por skin: **Comprar (N petscoin)** (desligado, com *Faltam X petscoin*, se não dá), **Usar** ou **Em uso**. Comprar já põe a skin em uso. Sem nome de usuário a lojinha só mostra as skins e pede para escolher um nome.
- O menu mostra *Petscoin: N* junto das fases concluídas, e a tela de vitória diz *Petisco ganho! +1 petscoin (você tem N)*.
- A skin em uso vale no jogo todo (pausa, vitória, derrota) para o jogador atual; trocar de jogador ou sair da conta muda a skin.

## Ideias para depois (não feitas)
- Mais skins (festa, esqueleto, neve), **acessórios** separados da cor (chapéus, óculos, laços) e **rastros** (pegadas coloridas).
- Preços maiores para skins de "coleção" (100 ou mais) e **pacotes** (3 skins por um preço menor).
- Petiscos extras por **missão cumprida** (Fases 11 a 20), por **recorde batido** e por **conquistas** (primeira fase sem perder vida, todas as bolinhas de uma fase).
- Skins **bloqueadas por fase** (só aparecem na lojinha depois de concluir a Fase N).
- Mostrar a skin no ranking.
- Se um dia houver servidor: guardar a carteira na conta (hoje ela vale só neste aparelho, como as pontuações).

## Onde está no código
- `js/records.js`: `MIN_SKIN_PRICE`, `wallet`, `addTreats`, `buySkin`, `equipSkin`, `equippedSkin` (e `deleteAccount` apaga a carteira); as de skin recebem o bichinho (0.18.0). Testes em `tests/records.test.js`.
- `js/game.js`: `SKINS` (catálogo do Cachorrinho), `skinsOf(bichinho)` (o do Gatinho é o `CatArt.SKINS`), `drawDog` (o cachorrinho com skin), `renderShop`/`openShop` (a tela, do bichinho escolhido), a linha *Petisco ganho!* em `win()`.
- `js/profiles.js`: `shop` (prévia, skin em uso, compra) e `ui.shopTitle` de cada bichinho.
- `index.html` / `css/style.css`: a tela `#shop`, `#win-treat` e o botão `#btn-shop`.
- `tests/e2e.js`: a seção *0.15.9: petiscos, petscoin e lojinha de skins* e, para o Gatinho, *0.18.0 · Gatinho: sons e skins* (lojinha, skins por bichinho, A/B de skins só visuais).
