# Lojinha de skins — plano e estado (0.15.9)

> Pedido do dono do projeto: *"Ao completar a fase, o cachorrinho ganha 1 petisco. Esse petisco poderá ser trocado por uma skin para o cachorrinho (portanto comece a planejar uma lojinha de skins com "valores" em petisco. Petscoin). 1 petisco = 1 petscoin. O valor mínimo da skin deve ser de 10 petscoin."*

## Moeda
- **Petisco = Petscoin** (1 para 1). Aparece no jogo como **petscoin** (saldo) e como **petisco** (o que se ganha).
- **Como ganhar:** **1 petisco a cada fase completada** (toda vez que a tela de vitória aparece, inclusive ao jogar de novo uma fase para melhorar o recorde). Quem não tem nome de usuário não guarda o petisco (a tela de vitória avisa).
- **Onde fica:** na carteira do jogador (`wallet` em `js/records.js`, no `localStorage`): `{ t: petiscos, own: [skins compradas], eq: skin em uso }`. Apagar a conta apaga a carteira. Máximo de 99999 petiscos e 60 skins por jogador.
- **Bichinhos (0.17.0):** a carteira é **única**: o petisco de uma fase concluída em qualquer bichinho vai para o mesmo saldo, e a lojinha e a skin em uso são as mesmas em todos os bichinhos (as skins de hoje são do Cachorrinho; skins dos outros bichinhos entram quando eles existirem). Veja **Bichinhos (0.17.0)** no README.
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
- `js/records.js`: `MIN_SKIN_PRICE`, `wallet`, `addTreats`, `buySkin`, `equipSkin` (e `deleteAccount` apaga a carteira). Testes em `tests/records.test.js`.
- `js/game.js`: `SKINS` (catálogo), `drawDog` (o cachorrinho com skin), `renderShop`/`openShop` (a tela), a linha *Petisco ganho!* em `win()`.
- `index.html` / `css/style.css`: a tela `#shop`, `#win-treat` e o botão `#btn-shop`.
- `tests/e2e.js`: a seção *0.15.9: petiscos, petscoin e lojinha de skins*.
