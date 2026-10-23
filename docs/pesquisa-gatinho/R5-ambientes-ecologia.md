# R5 — Ecologia e ambientes onde gatos domésticos vivem e caçam (para 20 fases)

Pesquisador: R5 · Data: 22/10/2026 · Regras: BRIEF.md (Atualização 3 · 0.18.0 · Gatinho)

---

## 0. AVISO CRÍTICO — NENHUM ARTIGO PÔDE SER ABERTO (leia primeiro)

A regra 3 do BRIEF exige abrir cada artigo antes de citar. **Nesta sessão isso foi impossível**, por bloqueio de rede, não por falta de artigos:

| Tentativa | Resultado |
|---|---|
| WebFetch em link.springer.com, pmc.ncbi.nlm.nih.gov, www.ncbi.nlm.nih.gov, www.mdpi.com, doi.org, europepmc.org, peerj.com, academic.oup.com | Todos: `getaddrinfo ENOTFOUND` (o WebFetch não resolve DNS neste ambiente) |
| curl (via proxy da sessão) em www.ebi.ac.uk, pmc.ncbi.nlm.nih.gov, www.mdpi.com, link.springer.com, peerj.com, api.crossref.org | Todos: `CONNECT tunnel failed, response 403` (host não permitido pela política de saída da sessão) |
| Consulta ao endpoint de diagnóstico do proxy (para ver o motivo) | Negada duas vezes pelo classificador de permissões; **não insisti** |

Não contornei o bloqueio. Só funcionou o **WebSearch**, que devolve um **resumo gerado pelo buscador**, não o texto do artigo.

**Consequência:** todo item abaixo está marcado **"NÃO ABERTO — verificação pendente"**. Os números vêm do resumo do buscador (que pode errar) e **não devem entrar no jogo, no README nem na tabela de fases como "base científica" até alguém abrir o artigo e conferir autor, ano, volume, DOI e o dado exato.** Onde o buscador deu autor/ano/DOI, eu os registro, mas também como "informado pelo buscador".

Resultado: **0 artigos aprovados (nível "verificado")**. O coordenador confirmou que a política de rede bloqueia (403) todos os sites acadêmicos e orientou: usar só WebSearch, registrar PISTAS e LACUNAS, **não afirmar nada como verificado**. É o que este arquivo faz.

**Convenções deste arquivo:** "informado pelo buscador" = veio do resumo do WebSearch (pode estar errado). "inferido do URL" = eu deduzi volume/DOI/ano do endereço do link, não de uma página aberta. Nada aqui é "verificado".

---

## 1. PISTAS (a abrir quando houver rede) — todas: Verificado = NÃO ABERTO

Ordenadas por tema. Para cada uma: citação (como o buscador informou), o que o resumo da busca diz, limitações conhecidas, e uso possível.

### 1.1 Uso do espaço por gatos — casas, quintais, urbano x rural, cobertura/espaço aberto

**C1. Dunford et al. (2024)** — *Seasonal habitat selection and ranging of domestic cats (Felis catus) in rural and urban environments.* Animal Biotelemetry (**volume/artigo a conferir**). DOI inferido do URL: 10.1186/s40317-024-00367-0. URL (não aberta): https://link.springer.com/article/10.1186/s40317-024-00367-0
- Verificado: **NÃO ABERTO (só trecho do buscador)**. Data de publicação: 2024 (a conferir).
- O que o buscador disse: 56 gatos com dono (26 F, 30 M) no Reino Unido, GPS a cada 5 min, 5.237 h no total. Gatos urbanos e rurais tiveram áreas de vida e seleção de habitat parecidas: **selecionaram áreas construídas com boa cobertura e evitaram espaços abertos**; em outra frase do buscador, pastagem aberta e terra agrícola foram "consistentemente evitadas". No verão: áreas de vida menores e mais noturnos. Machos rurais quase 2x mais ativos que os demais; todos os machos crepusculares, fêmeas catemerais/diurnas. Gatos passaram em média ~75% do tempo fora da casa/jardim do dono. Zona-tampão de 750 m ao redor de áreas protegidas excluiria 95% dos gatos.
- Limitações prováveis: gatos COM DONO (não de rua), amostra de 56, poucos dias por gato (a conferir), um país.
- Uso possível: **ambiente de fase** (quintal/vila com muros e moitas: rota coberta é "segura"; descampado aberto é onde o gato evita ficar) e **mecânica** (zona aberta = sem cobertura). Genérico por espécie.

**C2. Pyott et al. (2024)** — *Home range size and habitat selection of owned outdoor domestic cats (Felis catus) in urban southwestern Ontario.* PeerJ (volume/artigo e DOI **inferidos do URL**: artigo 17159; DOI provável 10.7717/peerj.17159, a conferir). URL (não aberta): https://peerj.com/articles/17159/
- Verificado: **NÃO ABERTO**. Publicação: março/2024 (informado pelo DOAJ no buscador).
- O que o buscador disse: gatos com dono em Ontário usaram **áreas verdes, estradas e terra agrícola menos que o esperado** e **selecionaram fortemente superfícies impermeáveis** (áreas construídas). Autores sugerem que gatos andam à margem de estradas usando barrancos/vegetação, evitando abrir-se.
- Limitações: gatos com dono, ambiente urbano de uma região; números não vistos.
- Uso possível: **ambiente de fase** urbana (becos/calçadas/quintais como espaço principal; parque aberto pouco usado).

**C3. Johansson & DeGregorio (2023)** — *Effects of landscape cover and yard features on feral and free-roaming cat (Felis catus) distribution, abundance and activity patterns in a suburban area.* Journal of Urban Ecology 9(1): juad003. DOI informado: 10.1093/jue/juad003. URL (não aberta): https://academic.oup.com/jue/article/9/1/juad003/7161106
- Verificado: **NÃO ABERTO**.
- O que o buscador disse: câmeras de movimento em gradiente urbano-rural (Arkansas, EUA); abundância de gatos diminuiu com alta cobertura florestal em 400 m; gatos ativos o dia todo, **mais diurnos perto do centro e em áreas agrícolas**; menciona abrigo em quintais (galpões/anexos, sob varandas e decks).
- Limitações: câmeras mostram presença, não comportamento de caça; EUA.
- Uso possível: **ambiente de fase** (quintal com galpão/varanda como abrigo) e **texto README**.

**C4. Zhang et al. (2022)** — *Home Range and Activity Patterns of Free-Ranging Cats: A Case Study from a Chinese University Campus.* Animals 12(9): 1141 (**inferido do URL** mdpi.com/2076-2615/12/9/1141; DOI provável 10.3390/ani12091141, a conferir). URL (não aberta): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9103849/
- Verificado: **NÃO ABERTO**. Publicação: abril/2022 (DOAJ no buscador).
- O que o buscador disse: 29 gatos adultos (15 M, 14 F) com GPS, out/2018 a jun/2020; área de vida (KDE 95%) de ~0,56 a 19,83 ha; sexo e época de reprodução afetaram o tamanho; atividade mais intensa ao crepúsculo (picos 6–10 h e 17–21 h em outra frase do buscador), menor à tarde.
- Limitações: gatos de campus alimentados por humanos; um local.
- Uso possível: **mecânica/ambiente** (fase de campus/parque com comida humana; mais presas ao amanhecer/entardecer: ciclo dia-noite).

**C5. Palomares et al. (2025)** — *Domestic cat penetrability into rural and natural habitats of the Iberian Peninsula.* Ecological Solutions and Evidence (Wiley). DOI informado: 10.1002/2688-8319.70114. URL (não aberta): https://besjournals.onlinelibrary.wiley.com/doi/full/10.1002/2688-8319.70114
- Verificado: **NÃO ABERTO**. O que o buscador disse: alguns gatos andaram **mais de 2 km** de casa. Sem outros números vistos. Uso: apenas contexto (borda rural/mata).

**C6. Estudo de gatos de casa sem preferência por cobertura do solo** — *Owned House Cats Show No Preference for Specific Land Cover Types When Roaming Outdoors.* Autores/revista/ano **não confirmados** (o buscador indica 49 gatos; pode ser o mesmo trabalho que o buscador listou como Animals 16(6): 864, 2026, Israel). URL (não aberta): https://pmc.ncbi.nlm.nih.gov/articles/PMC13023274/
- Verificado: **NÃO ABERTO**. O que o buscador disse: em 49 gatos rastreados, **sem evidência de atração ou evitamento consistente de nenhuma classe de cobertura mapeada**. Outra frase do buscador (Israel, neutered, 49 gatos): gatos cujas áreas incluíam áreas naturais/abertas próximas tiveram áreas de vida maiores que gatos urbanos.
- **Importância:** é o CONTRAPONTO de C1/C2. Se o jogo disser "gatos evitam espaço aberto", precisa citar que há resultado misto. Abrir este antes de afirmar.

**C7. Gatos de Chipre** — título informado: *Living Wild in a Mediterranean Island: Spatial and Temporal Behaviour of Free-Roaming Cats in Cyprus.* Animals 16(7): 1101 (2026?) — **volume/ano não confirmados pelo buscador**. URL (não aberta): https://www.mdpi.com/2076-2615/16/7/1101
- Verificado: **NÃO ABERTO**. O que o buscador disse (registro da Univ. de Bari): 15 gatos com GPS, primavera a outono de 2022, monitorados ~5,6 dias em média; área de vida mediana (KDE 95%) **55.678 m² machos e 11.377 m² fêmeas**; distância diária mediana **~1.233 m machos e ~538 m fêmeas**; atividade com pico à tarde; sexo, disponibilidade de abrigo e tipo de cobertura mostraram diferença significativa; menciona recursos humanos (pontos de ração, abrigos, restos de comida). Gatos usam vegetação/relevo para se deslocar e evitam áreas abertas e descobertas (informado em outra consulta).
- Limitações: n = 15, poucos dias por gato (admitido pelos autores segundo o buscador).
- Uso possível: **ambiente de fase** (ilha mediterrânea com pontos de ração e abrigos).

**C8. Simmons et al. (2023)** — *Seasonal Movement Patterns of Urban Domestic Cats Living on the Edge in an African City.* Animals 13(6): 1013. DOI informado: 10.3390/ani13061013. URL (não aberta): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10044403/
- Verificado: **NÃO ABERTO**. Publicação: 10/mar/2023 (informado no buscador).
- O que o buscador disse: Cidade do Cabo, 23 gatos com dono (14 verão, 9 inverno; **rastreados em 2010–2011**, publicados em 2023); áreas de vida de verão cerca de 3x maiores que de inverno (**3,00 ha vs 0,87 ha**); gatos de borda urbana foram até ~850 m de casa; todos os gatos de borda entraram em áreas protegidas no verão (vs 1 de 7 urbanos); trouxeram presa para casa em 59% (de 78) no verão vs 30% (de 27) no inverno; autores sugerem tampão de ~600 m e citam risco de predação por caracal.
- Limitações: n = 23, dados de 2010–2011 (publicados em 2023: o critério é a data de publicação, mas conferir), um local.
- Uso possível: **ambiente de fase** (borda cidade-mata, estação quente = mais presas e mais deslocamento) e **mecânica sazonal** (design).

**C9. Bruny Island (2025?)** — *Cat among the birds and trees: feral cat movements respond to variation in spatiotemporal productivity in a large island ecosystem.* Wildlife Research (CSIRO), código WR24179; autores/ano/volume **não confirmados**. URL (não aberta): https://www.publish.csiro.au/wr/WR24179
- Verificado: **NÃO ABERTO**. O que o buscador disse: 17 gatos em 3 locais (2 com colônias de aves marinhas, 1 floresta úmida); áreas de vida e movimentos **menores** onde a presa é abundante e sazonal (colônias) e **maiores** na floresta de menor produtividade; três machos fizeram viagens longas depois que as aves saíram.
- Limitações: gatos ferais de ilha; n = 17.
- Uso possível: **ambiente de fase** (ilha/colônia: gato fica perto da presa concentrada).

**C10. Jensen et al. (2022)** — *Movement Patterns of Roaming Companion Cats in Denmark — A Study Based on GPS Tracking.* Animals 12(14): 1748. DOI informado: 10.3390/ani12141748. URL (não aberta): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9311815/ (e https://www.mdpi.com/2076-2615/12/14/1748)
- Verificado: **NÃO ABERTO**. Publicação: 7/jul/2022 (informado pelo buscador).
- O que o buscador disse: 97 gatos com acesso ao exterior, GPS por ~7 dias; tempo mediano fora de casa **5 h/dia** (IQR 2,5–8,8); distância diária mediana **2,4 km** (IQR 1,3–3,7); área de vida mediana (BBKDE 95%) ~5 ha. **Chuva:** em dias secos ~**3,6 km** em média (IC95% 2,8–4,5) vs ~**2,4 km** em dias de chuva forte (IC95% 1,6–3,5): "gatos se moveram menos quando chove, mas ainda circularam bastante". Gatos >7 anos se moveram menos; acesso a áreas naturais e machos inteiros ampliam a área.
- Limitações: gatos com dono na Dinamarca; ~7 dias por gato; não mede abrigo, só distância.
- Uso possível: **mecânica/ambiente** (fase chuvosa: gato se desloca menos; ratos também?—isso é design) e **texto README**.

### 1.2 Clima, chuva, estação

**C11. Estudo longitudinal de estação e clima** — *Longitudinal Study on the Effect of Season and Weather on the Behaviour of Domestic Cats (Felis catus).* Animals 15(5): 637 (2025). DOI: 10.3390/ani15050637. Autores **não confirmados**. URL (não aberta): https://doi.org/10.3390/ani15050637
- Verificado: **NÃO ABERTO**. O que o buscador disse: 7 gatos de pesquisa acompanhados por 13 semanas distribuídas em um ano, acelerômetro + clima; mais chuva ligada a menos tempo de higiene e coçar; **chuva não significativa para comportamento ativo (p = 0,418)** (segundo o buscador), enquanto o termo temperatura-umidade x duração do dia foi significativo (p < 0,001). **Limitação grave:** só 7 gatos de pesquisa (provavelmente alojados, não de vida livre); abrir para confirmar se havia acesso ao exterior.
- Uso possível: só como contrapeso a C10 (efeito da chuva não é uniforme). Não serve para "abrigo na chuva".

### 1.3 Ratos e camundongos: onde vivem e como se movem

**C12. Huels et al. (2026)** — título **reconstruído do endereço do repositório** (começa com "intra and interspecific effects on spatio temporal behavior of co…", sobre roof rat, brown rat e house mouse em fazenda de porcos, com loggers Bluetooth). Integrative Zoology (2026), DOI informado pelo buscador: 10.1111/1749-4877.70066; PMID 41725586. Título exato, volume e autores completos **a conferir**. URLs (não abertas): https://research.bangor.ac.uk/en/publications/intra-and-interspecific-effects-on-spatio-temporal-behavior-of-co/ · https://www.guidelinecentral.com/pubmed/41725586/
- Verificado: **NÃO ABERTO** (só resumo, via registro de repositório e PubMed espelhado). 
- O que o buscador disse: ratos mais noturnos e com áreas de vida maiores que camundongos, que percorreram mais distância por hora; **quase nunca se moveram entre o interior de prédios diferentes, mas movimentos dentro e ao redor dos prédios foram frequentes**; machos de ratazana (brown rat) se moveram mais entre prédios que fêmeas. Sem números de área vistos.
- Limitações: uma fazenda de suínos na Europa; Bluetooth em prédios.
- Uso possível: **ambiente de fase** (galpões/estábulos: ratos circulam dentro e em volta de cada galpão; cada galpão é "bolsão"; fase noturna).

**C13. Rastreamento de ratos por fibra óptica (2025)** — *Distributed acoustic sensing reveals urban rat dynamics through environmental intelligence of dark fiber.* Communications Earth & Environment (2025). DOI **inferido do URL**: 10.1038/s43247-025-02904-y; autores/volume **não confirmados**. URL (não aberta): https://www.nature.com/articles/s43247-025-02904-y
- Verificado: **NÃO ABERTO**. O que o buscador disse: ratos-noruegueses em túnel urbano na China (Jiangxi), 39 dias em 2021; episódios individuais de atividade de até **1.480 m**. É método de monitoramento, não telemetria de área de vida.
- Uso possível: ambiente de fase subterrâneo/túnel/bueiro (design com apoio fraco).

**C14. Ratos de porto (2026?)** — título informado: *Unraveling the spatial behavior and habitat selection of sympatric brown and roof rats in a major South American seaport.* Urban Ecosystems (2026), URL (não aberta): https://link.springer.com/article/10.1007/s11252-026-02095-0 — **o buscador NÃO confirmou o conteúdo em uma segunda consulta**; só o primeiro resultado o listou, com "spool-and-line" e Rodamina B. **Prioridade alta para abrir**: seria a melhor fonte para "porto/docas".
- Verificado: **NÃO ABERTO**.

**C13b. Gatos e fauna urbana em quintais (2023)** — título informado: *Influences of roaming domestic cats on wildlife activity in patchy urban environments.* Frontiers in Ecology and Evolution (2023), código do URL: fevo.2023.1123355 (DOI **inferido**: 10.3389/fevo.2023.1123355; autores **não confirmados**). URL (não aberta): https://www.frontiersin.org/journals/ecology-and-evolution/articles/10.3389/fevo.2023.1123355/full
- Verificado: **NÃO ABERTO**. O que o buscador disse: 4 câmeras infravermelhas com isca/cheiro em 21 quintais de voluntários, 3–4 períodos de 24 h; a sobreposição de horários dos gatos variou entre quintais e bordas de áreas verdes; nos quintais os gatos se sobrepuseram mais com gambás-de-rabo-de-escova (brushtail possum), e ratos introduzidos (brown e black rats) ficaram em 4º entre os grupos. Limitação: câmeras (presença), um local (provável Oceania).
- Uso possível: **ambiente de fase** (quintal à noite: ratos e gatos compartilham o quintal).

**C13c. Sydney (2023)** — *Spatial and Temporal Movements of Free-Roaming Cats and Wildlife in Two Local Government Areas in Greater Sydney, Australia.* Animals 13(10): 1711. DOI informado: 10.3390/ani13101711. URL (não aberta): https://doi.org/10.3390/ani13101711
- Verificado: **NÃO ABERTO**. O que o buscador disse: câmeras em duas áreas; gatos ativos o dia todo, com picos de manhã e à noite; sobreposição de atividade geral entre 18 h e 7 h; sobreposição estimada com a fauna de ~40–43%. Autores **não confirmados**.
- Uso possível: ciclo dia-noite das fases (design com apoio fraco).

**C13d. Outras pistas só com título (sem números do buscador):**
- Philippe-Lesaffre et al. (2024), fatores intrínsecos e extrínsecos do tamanho da área de vida de gatos com dono em subúrbio francês (revista **não confirmada**).
- Berrand et al. (2026), *Personality Matters: Owner-Ascribed Personality Predicts Range Size Tendencies and Predation Behavior in Domestic Cats.* Ecology and Evolution; URL https://onlinelibrary.wiley.com/doi/full/10.1002/ece3.73520 (personalidade, não ambiente; serve só como cuidado: variação individual grande).
- *Spatial behavior of domestic cats and the effects of outdoor access restrictions and interventions to reduce predation of wildlife* (ano **2021 ou 2022, não confirmado**; ResearchGate 356705474): pode estar fora da janela, checar a data.
- *Laying low: Rugged lowland rainforest preferred by feral cats in the Australian Wet Tropics* (PMC9277418; ano provável 2022, **não confirmado**): gatos ferais preferem floresta úmida acidentada (cobertura).
- *Invasive Urban Mammalian Predators: Distribution and Multi-Scale Habitat Selection* (PMC9598248; ano/periódico **não confirmados**): pode tratar de gatos em cidades.

### 1.4 Perigos reais: trânsito, cães, humanos

**C15. Taylor et al. (2025)** — *Mortality and life table analysis in a young cohort of pet cats in the UK.* Journal of Feline Medicine and Surgery (2025; volume/páginas não vistos). Autores informados pelo buscador: Taylor AR, McDonald J, Foreman-Worsley R, Hibbert A, Blackwell EJ. DOI **inferido do URL**: 10.1177/1098612X251314689. URL (não aberta): https://journals.sagepub.com/doi/full/10.1177/1098612X251314689
- Verificado: **NÃO ABERTO**. O que o buscador disse (coorte Bristol Cats): acidente de trânsito foi a causa de morte mais comum em gatos até 8 anos: **45,6%** dos óbitos. Amostra: gatos de estimação do Reino Unido (nem todos com acesso ao exterior).
- Uso possível: **ambiente de fase** com rua/trânsito como perigo real; **texto README**.

**C16. Estudo necroscópico de lesões traumáticas fatais em gatos de vida livre (2026)** — *Fatal traumatic injury patterns in free-roaming cats: an anatomopathological study of 40 cases.* BMC Veterinary Research (2026), artigo informado: 12917-026-05733-z; autores/volume **não confirmados**. URLs (não abertas): https://link.springer.com/article/10.1186/s12917-026-05733-z · https://pmc.ncbi.nlm.nih.gov/articles/PMC13390247/
- Verificado: **NÃO ABERTO**. O que o buscador disse: 40 casos; trauma contuso 32/40, corte 7/40, projétil 1/40; atropelamento o mecanismo mais frequente registrado ou presumido. Limitação: só gatos que chegaram à necropsia (viés de recuperação).
- Uso possível: contexto de risco (trânsito > outros), **texto README**.

**Cães x gatos:** o buscador NÃO encontrou estudo 2021–2026 que teste se gatos de vida livre evitam cães. Ver LACUNAS.

---

## 2. Linhas "AMBIENTE → o que a literatura (não aberta) sugere → ideia de fase"

(Cada linha depende da verificação do candidato indicado; as sem fonte estão marcadas "ESCOLHA DE DESIGN".)

1. **Casa e quintal** → C1, C2, C3, C10: gatos com dono usam áreas construídas com cobertura, evitam espaços abertos; ~5 h/dia fora e ~2,4 km/dia (mediana, Dinamarca) → *Quintal com muros, moitas e galpão de ferramentas; a rota "coberta" é a segura; o gramado aberto é o trecho arriscado.* (Cobertura vs aberto tem resultado misto: ver C6.)
2. **Galpão / fazenda / celeiro** → C12: roedores comensais circulam dentro e ao redor de prédios, quase nunca entre interiores; ratos mais noturnos → *Fazenda à noite, vários galpões separados; cada galpão tem ratos próprios; atravessar o pátio entre galpões é o risco.*
3. **Campus / vila com ração fornecida por humanos** → C4: picos de atividade ao amanhecer/entardecer → *Fase "amanhecer" e fase "entardecer" com mais presas nesses horários.*
4. **Borda de mata / área protegida** → C8, C1: gatos de borda chegam a ~850 m, no verão muito mais (3,00 vs 0,87 ha) e levam mais presas para casa → *Borda da mata no verão: áreas maiores, mais presas, predador natural maior como risco extra (ESCOLHA DE DESIGN para o predador).*
5. **Ilha / colônia de aves marinhas** → C7, C9: áreas menores onde a presa é abundante e sazonal; pontos de ração e abrigos moldam o movimento → *Ilha com colônia: presas concentradas perto do abrigo, pouco espaço para andar.*
6. **Porto / docas** → C14 (para os ratos, a abrir); gatos de porto: **SEM FONTE RECENTE** → *Doca com contêineres e paletes; ratos-pretos e ratazanas; mecânica de gato é ESCOLHA DE DESIGN.*
7. **Feira / peixaria / mercado** → **SEM FONTE RECENTE** de uso do espaço por gatos (só página não revisada sobre colônias associadas a comida e abrigo no Porto, Portugal) → *ESCOLHA DE DESIGN (resto de comida atrai ratos e gatos).*
8. **Beco urbano** → C2 (gatos selecionam superfícies impermeáveis/áreas construídas), C15/C16 (trânsito é o maior risco registrado) → *Beco estreito com ruas de trânsito nas pontas.*
9. **Parque** → C2 (áreas verdes usadas menos que o esperado por gatos com dono), C6 (sem preferência) → *Parque aberto com poucas moitas: "descampado" arriscado; evitar afirmar "gatos evitam parques" sem abrir C6.*
10. **Telhados e muros** → **SEM FONTE RECENTE** (nenhum estudo 2021–2026 de uso de telhado/muro por gatos; só material de extensão e uma menção a abrigo sob decks/galpões em C3) → *ESCOLHA DE DESIGN* (o jogo já usa lugares altos como refúgio).
11. **Praia / dunas** → **SEM FONTE RECENTE** → *ESCOLHA DE DESIGN.*
12. **Chuva** → C10 (menos distância em dia de chuva forte; mediana de ~3,6 km seco vs ~2,4 km chuva), C11 (efeito não uniforme; amostra pequena) → *Fase chuvosa: menos movimento do gato e do ambiente; o pelo molhado do jogo é ESCOLHA DE DESIGN (sem artigo sobre "pelo molhado deixa lento").*
13. **Estações** → C8 (verão x inverno), C1 (verão menor e mais noturno) → *Versões "verão" e "inverno" da mesma fase.* (Atenção: C1 e C8 apontam direções diferentes em tamanho de área; abrir os dois.)
14. **Cães** → SEM FONTE; tráfego → C15, C16.

---

## 3. LACUNAS (sem fonte recente, revisada e ABERTA)

Sem fonte aberta para NENHUM traço (ver aviso 0). Além disso, mesmo com acesso, o buscador não achou nada 2021–2026 para:

- **Gatos evitam cães / áreas com cães?** Nenhum estudo direto de gatos de vida livre achado (só cães x fauna nativa e cães x onça-parda). Cão como inimigo = ESCOLHA DE DESIGN (risco de cães existe: mordida de cão foi ~10% (3/31) dos óbitos traumáticos num estudo canadense antigo citado numa revisão de 2021 — fonte antiga, não aberta, não usar).
- **Tigmotaxia (andar rente à parede) em ratos selvagens/comensais, no campo, 2021–2026:** só literatura de laboratório (open field), em geral antiga; um estudo com ratos selvagens em recintos (anticoagulante) citado pelo buscador, sem ano/revista. Trilhas rente à parede em ratos = possivelmente ESCOLHA DE DESIGN, apoiada em laboratório clássico (não aceitável como base pelo critério 2021–2026).
- **Tocas de rato (localização, junto a paredes/lixo) e área de vida de ratos urbanos 2021–2026:** nada recente achado em telemetria; revisão sistemática de 2019 (Byers et al., Frontiers in Ecology and Evolution) e GPS em Vancouver de 2017 estão fora da janela.
- **Camundongos (Mus musculus) em celeiros/silos 2021–2026:** só pré-print de método de rádio-transmissor (2023, bioRxiv: não vale).
- **Abrigo de gatos em dia de chuva (uso de telhado/galpão) e escolha de toca por tempo (chuva/vento/frio) 2021–2026:** nenhum estudo achado; o único recente que toca em abrigo (C3) mede espaço sob galpões/decks, sem clima. O único achado de "gato mais ativo em tempo seco" que o buscador mostrou é de estudo antigo (Stewart Island, NZ).
- **Chuva x gatos de vida livre/ferais:** só C10 (gatos com dono, Dinamarca, 97 gatos) e C11 (7 gatos). Nada sobre feral em chuva.
- **Efeito de gatos sobre ratos de rua/beco com dado recente:** C13b dá só sobreposição de horário em quintais; "gato assusta rato" (paisagem do medo) é de 2017 (fora da janela).
- **Gatos de porto, feira, peixaria, praia/dunas:** nenhum estudo de uso do espaço 2021–2026.
- **Telhados, muros, uso vertical por gatos de vida livre:** nenhum estudo.
- **Predação por ambiente (urbano x rural x ilha) com foco no espaço:** só indícios em C3/C7/C8/C9; comparação direta não encontrada.

---

## 4. DESCARTADOS (parecem bons mas falham no critério)

| Item | Motivo |
|---|---|
| Kays et al. (2020), Animal Conservation, Cat Tracker (925 gatos, 3,6 ha de área média, 4,5 travessias de estrada em ~1 semana, ~3,5 presas/mês) | **Ano 2020** (fora da janela out/2021–out/2026); só vi divulgação (Smithsonian, NatGeo, ScienceBlog), nada aberto |
| Barratt (2006), gatos de fazenda em Canberra (áreas de vida 1,38–4,46 ha, segundo o buscador); Horn et al. (2011, J. Wildlife Management, Illinois) | Ano fora da janela |
| "Free-Ranging Farm Cats: Home Range Size and Predation on a Livestock Unit In Northwest Georgia" (PLoS ONE, 2015; 7 gatos com GPS, rato-do-algodão como roedor principal) | **2015**, fora da janela (autores não registrados) |
| "Domestic cats and dogs create a landscape of fear for pest rodents around rural homesteads" (PLoS ONE, 2017; 40 casas em Essuatíni, gato+cão juntos reduziram atividade de roedores) | **2017**, fora da janela; seria ótimo para "gato assusta rato" (o buscador atribui a Mahlaba et al.) |
| Estudos de hábitat de ratos urbanos em Salzburgo, Vancouver e Boston (galpões/jardins, água, vegetação e lixo no beco) | Todos anteriores a 2021 segundo o buscador (anos exatos não vistos); servem só como pista de onde procurar |
| Estudos antigos de gatos em fazendas/ilhas (Stewart Island NZ; gatos que fazem toca em celeiros na Austrália; Canárias; Galápagos) | Anos fora da janela |
| Byers et al. (2019), "Rats About Town", Frontiers in Ecology and Evolution; Byers et al. (2017), GPS em ratos de Vancouver, J. Urban Ecology | Fora da janela (2019, 2017) |
| Kerguelen GPS (Polar Biology, 2013; áreas 0,30–0,73 km², atividade máxima por volta das 14 h) | Fora da janela |
| Herrera et al. (2022), Biological Conservation 268:109503 | Apareceu só como link; **não sei o assunto exato**; avaliar (pode ser relevante a gatos x presas), não cito |
| Sydney: "Spatial and Temporal Movements of Free-Roaming Cats and Wildlife in Two Local Government Areas in Greater Sydney, Australia", Animals 13(10): 1711 (2023), https://doi.org/10.3390/ani13101711 | Candidato legítimo (2023), mas o buscador só deu "gatos circulam o dia todo"; não tenho dado exato — **abrir** |
| Mapa "catscape" (Scientific Reports 2022, https://www.nature.com/articles/s41598-022-09694-9): 79% do tempo ao ar livre a ≤50 m da casa do dono, segundo o buscador | Candidato legítimo (2022), mas o conteúdo veio de resumo secundário; **abrir** |
| Chile: "Free-roaming domestic cats near conservation areas in Chile…" (ScienceDirect S253006442100016X): MCP95% médio 51,62 ha | Provável 2021; **conferir se a data é após out/2021** |
| "Prey selection and predation behavior of free-roaming domestic cats… urban ecosystem" (2022) | Tema é dieta/predação (outro pesquisador); não aprofundei |
| Página do Porto (speco.pt) | Site de associação, não revisada por pares |
| Páginas de controle de pragas sobre tocas de rato junto a paredes | Não revisadas por pares |
| Manhattan ratos (bioRxiv 2025) | **Pré-print** |
| Teses (Wellington, UFBA Salvador) | Teses, não artigo revisado |
| "Landscape of Fear: How Cats and Dogs Suppress Rodent Pests in Selected Households in Ilorin, Nigeria" (The Bioscientist, 2026?) | Periódico de reconhecimento não confirmado; não usar sem checar |
| Frontiers Vet Sci 2021, fvets.2021.742245 (revisão que cita mordidas de cão) | Data a conferir (borda out/2021); citava dado antigo |

---

## 5. O que fazer a seguir (para quem tiver acesso à rede)

Abrir, nesta ordem de valor para o jogo: C14 (ratos de porto), C12 (ratos em fazenda), C1 + C2 + C6 (cobertura x aberto, incluindo o contraponto), C10 (chuva), C8 (sazonal/borda), C7 + C9 (ilhas), C15 + C16 (trânsito). Conferir autores, volume, DOI e os números antes de qualquer menção no jogo, no README ou na tabela de fases. Onde não houver artigo (telhado/muro, praia, feira, tigmotaxia de campo, cães x gatos), manter a marca **"escolha de design"**.
