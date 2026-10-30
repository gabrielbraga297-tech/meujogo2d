# Atualização 5 · 0.20.0 · Passarinho — DESENHO DOS MAPAS (29/10/2026)

Este documento descreve os 20 mapas do Passarinho (`js/bird-levels.js`, arquivo GERADO por `tools/birdmaze/gen_bird.py`) e as regras que o teste `node tests/bird-levels.test.js` confere.
O desenho das mecânicas (voo baixo e voo alto, vento, galho, gavião) está no README (seção *Passarinho (0.20.0)*); aqui está o que vale para os MAPAS.

## Princípios
- Mesmo padrão dos mapas do Gatinho (`docs/GATINHO-DESENHO.md`): um ambiente por fase, ruas abertas com vários caminhos (sem labirinto fechado nas fases iniciais), tamanhos e contagens da tabela, as Fases 9–10 e 17–20 as mais difíceis.
- A novidade é o **muro voável `M`**: a maior parte das paredes de labirinto do Passarinho é `M` (cerca alta, sebe, milho, caniço, muro de pedra baixo). No voo baixo ele pára o passarinho, os gatos e os gaviões; no **voo alto** (fruto comum) o passarinho passa por cima, e por isso o mapa tem atalhos de verdade (veja "Muros voáveis e atalhos").
- `#` fica para as bordas do mundo e para os blocos grandes (rochas, troncos, casas, lago): o voo alto não passa por eles.
- Todo traço do passarinho é escolha de design; nenhuma espécie é citada nos mapas (os ambientes são lugares, não aves).
- Cada mapa é diferente dos outros 19, dos 20 do Gatinho e dos 20 do Cachorrinho.

## Legenda dos mapas (ASCII)
`#` parede sólida sempre (bordas, rochas, troncos, construções, água funda) · `M` muro fino voável (no máximo 2 tiles de espessura; nunca dentro de um bloco 3x3 de parede) · `.` chão · `P` início · `V` posto de um gato de quintal · `H` posto de um gavião (Fases 11–20) · `E` saída = o ninho (3 tiles na borda, com 2 tiles de chão à frente de cada um) · `X` obstáculo baixo (cerca baixa, pedra, arbusto, rede: o passarinho passa sempre, os gatos não, o gavião sim) · `G` galho/poleiro (copa de árvore, mastro, antena, vitória-régia: o passarinho fica a salvo em cima; gatos e gaviões esperam ao pé e desistem; grupos de 1 a 3 tiles) · `>` `<` `^` `v` correntes de vento (grupos de 2 a 8 tiles em linha reta numa direção).
Sementes, frutos e minhocas NÃO estão no mapa: o motor os sorteia em chão livre (`placeItems`), longe do início, dos postos e do vento. O vento e o `G` nunca ficam sobre o início, a saída ou os postos (nem a menos de 2 tiles deles), o vento só fica em chão `.` e **nenhuma seta aponta direto para `#` ou `M`** (o tile à frente de cada seta é chão ou o próprio vento).

### Os grafos (por onde cada um anda)
| Quem | Anda por | Não anda por |
|---|---|---|
| gato de quintal | `.` `P` `V` `H` `E` e o vento | `#` `M` `X` `G` |
| gavião | o mesmo dos gatos, mais `X` | `#` `M` `G` |
| passarinho em voo baixo | o mesmo dos gatos, mais `X` e `G` | `#` `M` |
| passarinho em voo alto | o voo baixo, mais `M` | `#` |

## As 20 fases (tamanhos e contagens conferidos por `node tests/bird-levels.test.js`)
Velocidade do passarinho: 252 px/s × `birdSpeed` (0,8 na F1, 0,9 na F3, depois 1; a mesma do Gatinho). Gatos de quintal: os mesmos números dos agentes do Cachorrinho e dos cães do Gatinho por fase. Gaviões: os mesmos números dos gatos inimigos e rastreadores. Pontos: semente 100, fruto 150, minhoca 50; mínimos de pontos, vidas e missões iguais aos do Gatinho (`like` = número da fase; `extraLives` e os tipos de fruto, `fruitMix`, copiados do Gatinho).
| F | Ambiente (ecologia) | Mapa | Gatos | Gaviões | Sementes | Frutos | Minhocas | G | Vento | Condição | M | Novidade da fase |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Jardim florido | 25×18 | 1 | — | 5 | — | — | — | — | pegar tudo | sim | andar, pegar sementes, fugir do gato (filhote) |
| 2 | Pomar de macieiras | 25×18 | 2 | — | 7 | 2 | 1 | — | — | pegar tudo | sim | fruto (voo alto por cima dos muros) e bater asas |
| 3 | Horta e cerca | 25×18 | 2 | — | 7 | 2 | 1 | 1 | 2 | pegar tudo | sim | X (cerca baixa), galho (a salvo), vento |
| 4 | Telhados e chaminés | 41×29 | 3 | — | 15 | 2 | 2 | 2 | 3 | 800 | sim | primeira fase grande; mínimo de pontos |
| 5 | Praça da vila | 41×29 | 3 | — | 20 | 2 | 2 | 4 | — | 1000 | sim | muitos galhos (as árvores da praça) |
| 6 | Parque e coreto | 49×33 | 3 | — | 24 | 3 | 3 | 2 | 2 | 1250 | sim | alamedas, canteiros e sebes baixas |
| 7 | Milharal | 49×37 | 4 | — | 28 | 3 | 3 | 2 | 3 | 1400 | sim | corredores estreitos de milho (muros M) |
| 8 | Campo de trigo e espantalhos | 55×39 | 5 | — | 32 | 4 | 3 | 3 | 5 | 1650 | sim | ventos fortes no campo aberto |
| 9 | Lago e juncos | 55×39 | 5 | — | 36 | 4 | 3 | 5 | 6 | 1800 | sim | juncos (galhos) e margem ventosa |
| 10 | Mata de pinheiros | 55×41 | 6 | — | 40 | 5 | 3 | 4 | 2 | 2050 | sim | troncos e sub-bosque (muros M), muitos galhos |
| 11 | Fazenda e galinheiro | 57×41 | 5 | 2 | 44 | 5 | 4 | 4 | 4 | 2300 + missão | sim | gaviões; missão: todos os frutos |
| 12 | Margem do rio | 57×41 | 5 | 3 | 46 | 5 | 4 | 4 | 4 | 2450 + missão | sim | missão: 34 sementes |
| 13 | Pântano e vitórias-régias | 57×43 | 6 | 3 | 48 | 6 | 4 | 7 | 3 | 2650 + missão | sim | muitos galhos (vitórias-régias), gaviões |
| 14 | Dunas e restinga | 57×43 | 6 | 4 | 50 | 6 | 4 | 4 | 8 | 2800 + missão | sim | ventos de duna |
| 15 | Falésias e ninhos | 59×43 | 6 | 4 | 52 | 6 | 4 | 4 | 5 | 3000 + missão | sim | rochas (paredes), muros de pedra, correntes de ar |
| 16 | Vila de pescadores e redes | 59×45 | 7 | 5 | 54 | 7 | 5 | 5 | 7 | 3200 + missão | sim | redes (X), mastros (galhos), varais (M) |
| 17 | Campos de altitude | 61×45 | 7 | 5 | 56 | 7 | 5 | 3 | 8 | 3400 + missão | sim | campo aberto, muros de pedra, poucos abrigos |
| 18 | Entardecer nos telhados | 61×45 | 7 | 6 | 58 | 7 | 5 | 8 | — | 3600 + missão | sim | luz laranja que escurece (visão reduzida) |
| 19 | Noite na floresta | 61×45 | 8 | 6 | 60 | 8 | 5 | 5 | 6 | 3800 + missão | sim | noite: halo em volta do passarinho |
| 20 | O grande ninho | 63×47 | 8 | 7 | 62 | 8 | 5 | 6 | 6 | 4000 + missão | sim | tudo junto; volta ao lar |
Vidas máx., perda por vida e bônus de missão: iguais aos do Gatinho (5…10; 50/200/250/300/325…400; +200…+650). A coluna "G" e a coluna "Vento" são a QUANTIDADE DE GRUPOS (galho: 1 a 3 tiles cada; vento: 2 a 8 tiles cada).

## Como os mapas são desenhados
Um estilo por ambiente (`tools/birdmaze/bird_styles.py`), sorteado com a semente da fase (`seed` no arquivo; o gerador é determinístico):
1. **Jardim florido**: duas sebes compridas com brechas largas, uma fonte e canteiros de pedra. 2. **Pomar**: macieiras em quincôncio (troncos `#`) e duas cercas compridas com brechas. 3. **Horta e cerca**: canteiros compridos (`M`), galpão, uma cerca baixa `X` com passagens, um galho e dois ventos.
4. **Telhados e chaminés**: quarteirões por partição, cada telhado é um terraço de muro baixo com portas, chaminés (`#`) e caixas-d'água (`X`). 5. **Praça da vila**: quarteirões murados com casa e quintal em volta de uma praça com fonte e árvores (galhos). 6. **Parque e coreto**: alamedas entre gramados de sebes, canteiros em moldura e um coreto no centro.
7. **Milharal**: labirinto "trançado" de corredores de 2 tiles entre fileiras de milho (`M`), com uma clareira de sítio e espantalhos. 8. **Campo de trigo**: campo aberto com faixas de trigo alto, sebes, um sítio murado e espantalhos `X`. 9. **Lago e juncos**: lago `#` com trilha, juncais finos `M`, moitas e galhos nos juncos.
10. **Mata de pinheiros**: troncos soltos e sub-bosque em traços tortos de `M`. 11. **Fazenda e galinheiro**: celeiro e silo murados, cercados com portão, galinheiro, lavoura em fileiras e fardos `X`. 12. **Margem do rio**: rio `#` com 3 pontes e uma travessia de pedras `X`, pastos de cerca e juncos paralelos.
13. **Pântano**: lagoas pequenas `#`, canaviais compridos e tortos `M` e vitórias-régias `G` na beira da água. 14. **Dunas e restinga**: mar `#`, cristas de duna em traços longos de `M` e moitas `X`. 15. **Falésias e ninhos**: massas de rocha `#` com cânions, saliências finas `M` e ninhos `G` nas bordas.
16. **Vila de pescadores**: baía com molhes, casinhas `#`, varais compridos `M`, redes `X` e mastros `G`. 17. **Campos de altitude**: cercados largos de muro de pedra `M` com portões, afloramentos `#` e pedras `X`. 18. **Entardecer nos telhados**: galpões compridos com cumeeira `M`, chaminés e antenas `G`.
19. **Noite na floresta**: moitas redondas de árvores `#` com sub-bosque em arco `M`. 20. **O grande ninho**: três faixas (horta-labirinto de sebes, vila, bosque) separadas por cercas com portões e o grande ninho (saída) junto de uma árvore enorme.
Depois do estilo, o acabamento liga bolsões, põe galhos e ventos, o início `P` e os postos, e CLASSIFICA as paredes: bloco duro vira `#`; parede automática ou muro vira `M` se for fina e `#` se cair dentro de um bloco 3x3. A orientação (saída à direita, à esquerda, embaixo ou em cima) vem de espelho e transposição; as setas de vento giram junto.

## Muros voáveis e atalhos
O voo alto só vale a pena se os muros `M` forem atalhos de verdade. Para cada fase calculamos (no gerador e, de novo, no teste, em JavaScript):
- **economia média** = média, sobre todos os pares (uma de 48 origens espalhadas × cada tile de chão), de (distância em passos no voo baixo) − (distância no voo alto); as origens são um tile de chão a cada N, na ordem das linhas;
- **pares com economia ≥ 4**: fração desses pares em que o voo alto poupa pelo menos 4 passos;
- **economia P→E**: o mesmo, de P até a saída mais perto;
- **travessias úteis**: um muro de 1 ou 2 tiles de `M` entre dois tiles transitáveis em linha reta é uma travessia; é útil se o voo baixo precisa de pelo menos 4 passos a mais para ir de um lado ao outro. "tiles M em travessias úteis" conta os tiles `M` que fazem parte de alguma.
Mínimos que o teste exige nas Fases 4 a 20: economia média ≥ 1,5 tile (Fase 5, praça murada com ruas retas: ≥ 1,0; Fase 16, vila de pescadores: ≥ 1,2) e pelo menos 3 tiles `M` em travessias úteis; a parte de `M` entre as paredes de dentro ≥ 40% (mínimos menores onde a água, a rocha ou as árvores `#` dominam: Fase 9 e 13 ≥ 30%, 10 ≥ 35%, 15 ≥ 25%, 16 ≥ 30%, 19 ≥ 35%; maiores: Fase 7 ≥ 85%, 8 ≥ 45%, 17 ≥ 50%) e, nas Fases 4 a 20, em média ≥ 50%.
| F | M | # de dentro | % de M | P→E voo baixo | P→E voo alto | economia P→E | economia média (tiles) | pares com economia ≥ 4 | tiles M em travessias úteis | travessias |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 35 | 19 | 65% | 26 | 18 | 8 | 2.73 | 25.4% | 24 | 36 |
| 2 | 31 | 13 | 70% | 20 | 19 | 1 | 1.20 | 13.3% | 17 | 29 |
| 3 | 36 | 9 | 80% | 29 | 29 | 0 | 0.55 | 7.5% | 22 | 36 |
| 4 | 228 | 12 | 95% | 34 | 22 | 12 | 5.83 | 49.7% | 169 | 207 |
| 5 | 151 | 73 | 67% | 47 | 47 | 0 | 2.08 | 18.8% | 102 | 131 |
| 6 | 205 | 43 | 83% | 59 | 59 | 0 | 2.22 | 28.6% | 134 | 184 |
| 7 | 463 | 8 | 98% | 43 | 39 | 4 | 6.29 | 55.9% | 271 | 370 |
| 8 | 205 | 37 | 85% | 68 | 50 | 18 | 2.62 | 30.7% | 145 | 203 |
| 9 | 216 | 280 | 44% | 40 | 40 | 0 | 5.40 | 46.9% | 130 | 174 |
| 10 | 351 | 175 | 67% | 63 | 49 | 14 | 13.17 | 70.1% | 223 | 213 |
| 11 | 186 | 123 | 60% | 57 | 57 | 0 | 3.30 | 30.6% | 153 | 170 |
| 12 | 169 | 212 | 44% | 48 | 48 | 0 | 4.07 | 30.0% | 127 | 155 |
| 13 | 284 | 571 | 33% | 76 | 56 | 20 | 16.13 | 60.6% | 160 | 223 |
| 14 | 429 | 177 | 71% | 87 | 61 | 26 | 17.51 | 76.0% | 274 | 262 |
| 15 | 270 | 614 | 31% | 69 | 55 | 14 | 8.51 | 56.1% | 171 | 188 |
| 16 | 248 | 525 | 32% | 71 | 67 | 4 | 1.93 | 23.6% | 188 | 248 |
| 17 | 290 | 85 | 77% | 82 | 82 | 0 | 13.13 | 50.8% | 229 | 246 |
| 18 | 634 | 28 | 96% | 72 | 72 | 0 | 5.07 | 43.5% | 470 | 579 |
| 19 | 310 | 569 | 35% | 85 | 45 | 40 | 18.64 | 74.9% | 208 | 256 |
| 20 | 395 | 340 | 54% | 88 | 66 | 22 | 12.34 | 49.3% | 257 | 404 |
(Fases 1 a 3: poucos `M`, só para ensinar; a economia delas é só informativa.)

## Validações do gerador e do teste (`tests/bird-levels.test.js`, precisa de python3)
Os 20 mapas, em JavaScript independente do gerador (`tools/birdmaze/bird_analysis.js`): 20 fases com id 1..20 e as dimensões da tabela; anel de fora todo `#`; só os caracteres da legenda; `P` único; `V` = gatos e `H` = gaviões (zero antes da Fase 11); saída `E` com 3 tiles na borda, com 2 tiles de chão à frente de cada um; postos a 8 tiles ou mais do início e fora do alcance do "!" da fase; o grafo dos gatos liga `P`, os postos e `E`, sem bolsões; o grafo do passarinho em voo baixo alcança tudo (inclusive `X` e `G`) e o gato alcança TODO o chão que o passarinho alcança; a saída é alcançável em voo baixo; 2 ou mais caminhos de `P` a `E` sem tile em comum (Fases 4–20); sementes + frutos + minhocas ocupam no máximo 35% dos tiles onde o motor sorteia itens (regra de `placeItems`), com distância mínima de 3 tiles em 12 sorteios simulados; 20% dos tiles livres a 4 tiles ou mais de qualquer posto; grupos de `G` (1 a 3 tiles) e de vento (2 a 8 tiles, em linha reta, sem encostar, sem seta contra parede); `G` e vento longe de `P`, `V`, `H`, `E`; `M` nunca em bloco 3x3; parte de `M` e economia dos atalhos (acima) conferidas e registradas neste documento; mapas diferentes entre si, dos do Gatinho e dos do Cachorrinho; contagens iguais às da tabela e iguais às do Gatinho onde o desenho manda (`like`, `extraLives`, `birdSpeed`, `fruitMix`); gerador determinístico e arquivo idempotente (`--all --write --out` dá o mesmo arquivo).

### Diferença entre mapas (adaptação da regra do Gatinho)
O Gatinho exigia no máximo 60% de tiles iguais na mesma posição. Os mapas do Passarinho são mais abertos (75% a 90% de chão), e dois mapas abertos quaisquer já têm bem mais de 60% de chão em comum, então a regra foi adaptada: vale a **sobreposição (Jaccard) das paredes e peças** (`#` e `M` contam igual; `X`; `G`, e o `T` do Gatinho, contam igual), sem o anel de fora: no máximo 35% entre mapas do mesmo tamanho e 45% na janela comum de tamanhos diferentes; a regra antiga fica só como detector de cópia (85% e 90%). Além disso, o desenho das paredes de uma fase nunca é o de outra deslocado ou espelhado.

## Sementes e como regerar
Sementes escolhidas (`SEEDS` em `gen_bird.py`, registradas também no campo `seed` de cada fase): F1=6, F2=1, F3=2, F4=2, F5=7, F6=8, F7=5, F8=22, F9=0, F10=6, F11=0, F12=6, F13=6, F14=0, F15=50, F16=5, F17=3, F18=0, F19=2, F20=3.
```
python3 tools/birdmaze/gen_bird.py --all --write        # regera js/bird-levels.js
python3 tools/birdmaze/gen_bird.py --level 7 --search 0 60   # lista as sementes válidas de uma fase, com métricas
python3 tools/birdmaze/gen_bird.py --pick               # escolhe sementes (válidas, atalhos bons, diferentes dos outros mapas)
python3 tools/birdmaze/gen_bird.py --check              # confere a diferença entre os mapas
python3 tools/birdmaze/gen_bird.py --table              # imprime as duas tabelas deste documento
python3 tools/birdmaze/render_bird_preview.py           # regera as miniaturas de docs/passarinho-mapas/
node tools/birdmaze/bird_sim.js                         # distâncias nos grafos, por fase
```
Mudar um mapa depois da entrega exige subir a revisão dos mapas do Passarinho no motor (`BIRD_REV`), como no Gatinho.

## Miniaturas
`docs/passarinho-mapas/faseNN.png` (uma por fase, com legenda) e `folha-20-mapas.png` (as 20 juntas). Cores: parede azul-escura, muro `M` verde com bolinha, chão claro, `X` marrom, `G` círculo verde-escuro, vento azul-claro com seta, `V` vermelho, `H` roxo, `P` verde, `E` amarelo.

## Limitações
- As setas de vento são desenhadas e conferidas só nas direções do mapa; o empurrão (90 px/s) e o clamp contra paredes são do motor.
- Os mapas são conferidos por BFS (grade 4-vizinhos) e por simulação simples do sorteio de itens (testes de Node); a jogabilidade (dificuldade real, tempos) é conferida no navegador por um robô que joga as 20 fases até a vitória, com os gatos e os gaviões soltos (`node tests/e2e.js "Passarinho (integração)"`).
- A economia dos atalhos é medida em passos de grade entre tiles de chão, não em segundos de jogo (o voo alto, a velocidade e o fôlego mudam o tempo real).
