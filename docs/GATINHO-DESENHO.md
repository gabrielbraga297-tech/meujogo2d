# Atualização 3 · 0.18.0 · Gatinho — DESENHO (versão do coordenador, 23/10/2026)

## Princípios
- Mesmo motor e mesmo "padrão" do jogo do cachorrinho (rampa de dificuldade, pontos mínimos, vidas, missões simples, poderes, brinquedos), com ECOLOGIA e CORPO de gato doméstico GENÉRICO (nada de raça; skins só visual).
- SEM fonte verificada (rede acadêmica bloqueada): todo traço abaixo é "escolha de design inspirada em literatura (pistas em cat-research/, não verificadas)". Só vira "Biologia por trás" citada depois que um artigo for ABERTO e conferido.
- Os números do cachorrinho NÃO mudam (as 20 fases dele são sagradas).

## Mapeamento de papéis (perfil "cat")
| Cachorrinho | Gatinho |
|---|---|
| ração (100) | ratinho (100) — presa parada (sorteada em chão livre) |
| osso (150) + poder | novelo (150) + poder; cores = tipos: comum (pelo eriçado: cães recuam, +100 por cão afugentado), dourado (escudo), azul (cães congelados), laranja (arrancada sem cansar), roxo (ímã de ratinhos) |
| bolinhas (+50, fogem rolando) | camundongos ágeis (+50, disparam quando o gatinho chega a 3 tiles e congelam) |
| agente da carrocinha (patrulha, "!" persegue) | cão de guarda/casa (mesma IA) |
| carteiro (agente com poder: foge) | cão afugentado |
| gato inimigo (ágil, ouve, antecipa; Fases 11–20) | cão rastreador (mesma IA do gato inimigo, NÃO pula obstáculos): ouve e segue o rastro |
| caixas X (só o gato inimigo pula) | obstáculos baixos X (vaso, caixote, cerca baixa): o GATINHO pula, os cães não |
| — | T = lugar alto (árvore, prateleira, muro, telhado de caixote): gatinho a salvo em cima; cães esperam embaixo e desistem |
| — | ~ = poça/água: pelo molhado (mais pesado e lento ~6 s; sacode o pelo ao secar) |
| — | arrancada com fôlego (Shift/Espaço/botão de toque): ×1,35 por ~2,5 s; recarrega devagar parado ou andando; fôlego vazio = "ofegante" |
| van da carrocinha (casinha dos agentes) | casinha de cachorro / tapete (posto dos cães) |
| filhote → jovem → adulto (tamanho, latidos) | filhote → jovem → adulto (tamanho; miado cmeow1/2/3) |
| reforços (9) | mesmos efeitos, nomes do gato (Patas ágeis, Novelo poderoso, Vida extra, Coração maior, Pelo grosso, Cães lentos, Passos de veludo, Bigodes atentos, Chamado de petisco) |

## Legenda dos mapas (ASCII, igual ao do cachorrinho + 3 símbolos)
`#` parede · `.` chão · `P` início do gatinho · `V` posto de um cão de guarda · `R` posto de um cão rastreador (F11+) · `E` saída (3 tiles) · `X` obstáculo baixo (gatinho pula) · `T` lugar alto · `~` poça. Ratinhos, novelos e camundongos são sorteados em chão livre (placeItems) como as rações; poças e `T` NUNCA ficam em cima do início, da saída ou de postos.

## As 20 fases (proposta; M ajusta tamanhos/contagens com o gerador e eu confiro)
Velocidade do gatinho: 252 px/s × `catSpeed` (filhote 0,8 na F1, 0,9 na F3, depois ~1); arrancada ×1,35. Cães de guarda: mesmos números dos agentes do cachorrinho por fase. Rastreadores: mesmos números dos gatos inimigos. Pontos: ratinho 100, novelo 150, camundongo 50, cão afugentado 100, mínimos e bônus de missão IGUAIS à tabela do cachorrinho.
| F | Ambiente (ecologia) | Mapa | Cães | Rastr. | Ratinhos | Novelos | Camund. | T | ~ | Condição | Novidade da fase |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Sala de estar (casa) | 25×18 | 1 | — | 5 | — | — | 0 | 0 | pegar tudo | andar, pegar ratinhos, fugir do cão da casa (filhote) |
| 2 | Cozinha e despensa | 25×18 | 2 | — | 7 | 2 | 1 | 0 | 0 | pegar tudo | novelo e arrancada com fôlego |
| 3 | Quintal dos fundos | 25×18 | 2 | — | 7 | 2 | 1 | 1 | 2 | pegar tudo | obstáculos baixos (X), poça (pelo molhado), árvore (lugar alto) |
| 4 | Jardim e varal | 41×29 | 3 | — | 15 | 2 | 2 | 2 | 3 | 800 | primeira fase grande; mínimo de pontos |
| 5 | Telhados e muros | 41×29 | 3 | — | 20 | 2 | 2 | 4 | 0 | 1000 | espaço vertical: muitos T e X (caminhos que o cão não faz) |
| 6 | Beco da cidade | 49×33 | 3 | — | 24 | 3 | 3 | 2 | 2 | 1250 | ruas estreitas, lixeiras (X), poças de chuva |
| 7 | Feira livre | 49×37 | 4 | — | 28 | 3 | 3 | 2 | 3 | 1400 | barracas (obstáculos), mais cães |
| 8 | Peixaria e mercado | 55×39 | 5 | — | 32 | 4 | 3 | 3 | 5 | 1650 | muita água no chão (pelo molhado) |
| 9 | Parque e lago | 55×39 | 5 | — | 36 | 4 | 3 | 5 | 6 | 1800 | árvores (T), lago e canteiros |
| 10 | Armazém de grãos | 55×41 | 6 | — | 40 | 5 | 3 | 4 | 2 | 2050 | corredores de prateleiras (T) onde os ratos vivem |
| 11 | Celeiro e curral | 57×41 | 5 | 2 | 44 | 5 | 4 | 4 | 4 | 2300 + missão | rastreadores; missão: todos os novelos |
| 12 | Horta e galinheiro | 57×41 | 5 | 3 | 46 | 5 | 4 | 4 | 4 | 2450 + missão | missão: 34 ratinhos |
| 13 | Borda da mata | 57×43 | 6 | 3 | 48 | 6 | 4 | 7 | 3 | 2650 + missão | muitas árvores; cães rastreadores |
| 14 | Riacho e pedras | 57×43 | 6 | 4 | 50 | 6 | 4 | 4 | 8 | 2800 + missão | travessia com água |
| 15 | Vila de pescadores | 59×43 | 6 | 4 | 52 | 6 | 4 | 4 | 5 | 3000 + missão | redes e barcos (X) |
| 16 | Docas do porto | 59×45 | 7 | 5 | 54 | 7 | 5 | 5 | 7 | 3200 + missão | contêineres (T), cais molhado |
| 17 | Praia e dunas | 61×45 | 7 | 5 | 56 | 7 | 5 | 3 | 8 | 3400 + missão | areia aberta: poucos abrigos |
| 18 | Telhados à noite | 61×45 | 7 | 6 | 58 | 7 | 5 | 8 | 0 | 3600 + missão | noite (visão reduzida), telhados |
| 19 | Mercado à noite | 61×45 | 8 | 6 | 60 | 8 | 5 | 5 | 6 | 3800 + missão | noite e chuva |
| 20 | A casa grande (final) | 63×47 | 8 | 7 | 62 | 8 | 5 | 6 | 6 | 4000 + missão | tudo junto; volta ao lar |
Vidas máx., perda por vida e bônus de missão: iguais aos do cachorrinho (5…10; 50/200/250/300/325…400; +200…+650).

## Mecânicas novas (E2) — parâmetros iniciais (a calibrar com bots)
- Arrancada: ×1,35 de velocidade; fôlego 2,5 s; recarrega em 5 s parado/andando devagar; vazio = só anda normal até 1,5 s de recuperação. Novelo laranja = fôlego infinito por 8 s.
- Pelo molhado: pisar em `~` = molhado por 6 s: ×0,65 de velocidade, sem arrancada; sacode (som `shake`) e seca. Cães NÃO se molham (cães não são o foco).
- Lugar alto (T): ao entrar o gatinho fica a salvo (não pode ser pego); cães em perseguição vão até o pé do T e esperam até 4 s; depois voltam à patrulha. Sem limite de tempo em cima, mas o relógio corre (bônus de tempo cai).
- Obstáculo baixo (X): só o gatinho atravessa (pulo suave, som `jump`).
- Camundongo ágil: foge/dispara a 3 tiles (como as bolinhas) e congela.
- Noite (F18, F19): escurece com halo em volta do gatinho (visual + visão reduzida do jogador, não dos cães).

## Skins do gato (só visual; nomes podem ser de raça; sem atributos nem sons próprios)
Rajado, Preto, Branco, Cinza, Laranja, Siamês (pontas escuras), Van Turco (cauda e orelhas coloridas), Tricolor (carey), Smoking (preto com peito branco), Pirata, Astronauta, Super-gato.
(Liberação/loja: ver Atualização 4 — nesta atualização a loja já mostra as do bichinho escolhido, ver E3.)
