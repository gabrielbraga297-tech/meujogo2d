# Pesquisa de biologia do Passarinho (0.20.0): TEMAS E PALAVRAS-CHAVE NÃO VERIFICADOS

> **Atualização 0.24.0 (07/11/2026): a rede passou a liberar o Europe PMC e o Crossref.** O texto abaixo é o registro dos temas de 29/10/2026 (quando nenhuma busca tinha sido feita) e **continua NÃO VERIFICADO**, exceto o que foi procurado em 07/11/2026 e conferido: isso está em [`docs/biologia/referencias.json`](../biologia/referencias.json) (com o que o resumo sustenta e o que não sustenta) e na tabela «Biologia por trás do Passarinho» do README. Onde o texto diz que nenhum artigo foi aberto, vale a data da frase.

**Regra do dono do projeto:** as características do Passarinho devem ter por base **artigos científicos revisados por pares, em periódicos reconhecidos, publicados entre out/2021 e out/2026**, e cada artigo só pode ser citado depois de **aberto e conferido** (autores, ano, periódico, número exato).

**O que aconteceu:** durante a construção do Passarinho (29/10/2026) a **rede do ambiente de desenvolvimento continuou bloqueando os sites de artigos** (os mesmos que bloquearam a pesquisa do Gatinho) e **nenhuma busca foi feita** para o Passarinho. Por isso **nenhum artigo foi aberto e nada aqui está verificado**. Ao contrário de `docs/pesquisa-gatinho/`, estes arquivos **não trazem nenhuma referência** (nenhum autor, ano, periódico, volume ou DOI): nada foi achado, então nada pode ser transcrito. O que há é o que se precisa para procurar bem **quando houver acesso**: o que o jogo faz (escolha de design), as **perguntas** que a literatura teria de responder, as **palavras-chave de busca** (em inglês e em português), o **tipo de estudo esperado** e as **lacunas** (o que não se deve afirmar).

**Consequência no jogo:** todo traço do Passarinho (voo baixo e voo alto, bater asas com fôlego, forrageio, gatos, gaviões, galhos, vento, entardecer e noite, sons, crescimento) é uma **escolha de design**. A coluna de pistas da tabela "Biologia por trás do Passarinho" do README só aponta **temas** destes arquivos (P1 a P5). O Passarinho é **genérico**: nenhuma espécie, nenhuma raça; o "gato de quintal" é um gato doméstico qualquer e o "gavião" uma ave de rapina qualquer.

| Arquivo | Tema |
|---|---|
| `P1-voo-energia.md` | voo, gasto de energia e bater asas |
| `P2-forrageio.md` | sementes, frutos e minhocas |
| `P3-predacao.md` | predação por gatos domésticos e por aves de rapina |
| `P4-abrigo-vento.md` | abrigo em galhos e poleiros, obstáculos baixos e vento |
| `P5-ambientes-luz.md` | ambientes das 20 fases, entardecer e noite, crescimento e sons |

## Para abrir primeiro quando houver acesso (ordem sugerida)
1. **P3, gatos domésticos e aves** (a maior pergunta do jogo: o que os gatos de quintal fazem com os passarinhos): uma revisão ou meta-análise recente sobre predação de aves por gatos domésticos de vida livre.
2. **P4, vento e voo**: um estudo recente de aves pequenas voando com vento e rajadas (túnel de vento ou telemetria), para saber se empurrar o passarinho "a favor/contra" tem algum paralelo.
3. **P1, custo de energia do voo**: uma revisão recente sobre o custo metabólico do voo batido e do voo de arrancada, para a barra de fôlego.
4. **P3, aves de rapina**: um estudo recente de caça de aves pequenas por aves de rapina perto de moradias e fazendas.
5. **P4, abrigo**: um estudo recente de uso de poleiros altos e de cobertura vegetal por aves pequenas sob risco de predador.
6. **P5, luz e atividade**: um estudo recente de atividade de aves ao entardecer e à noite e de visão com pouca luz.
7. **P2, forrageio**: um estudo recente de forrageio de aves de solo (minhocas) e de aves que comem sementes e frutos.

Depois de abrir cada um: conferir autores, ano, periódico, volume e páginas, DOI e o número; **promover ao README só o que for confirmado**; atualizar "Biologia por trás do Passarinho" e marcar o que continuar sem fonte como "escolha de design". Enquanto isso, **nenhum arquivo daqui pode dizer "verificado"** nem citar um artigo como se aberto (`node tests/honesty.test.js` confere).


## Buscas feitas em 07/11/2026 (Atualização 9 · 0.24.0)
Ferramenta: `tools/biology/lookup.py` (Europe PMC e Crossref). Em cada busca se olharam o título, o ano (2021 a 2026) e o resumo; o que serviu virou entrada de `docs/biologia/referencias.json` (montada por `tools/biology/build_refs.py`).
- **P3, gatos domésticos e aves:** serviram as sínteses sobre a dieta de gatos de vida livre e sobre as presas que gatos trazem para casa (as mesmas do Gatinho, com as aves incluídas).
- **P3, aves de rapina:** serviu um estudo do gavião-europeu e das aves que ele caça; outras buscas por «predação de aves pequenas por aves de rapina» devolveram só estudos sem relação com o jogo.
- **P1, custo de energia do voo:** serviu um estudo de aves voando em túnel de vento; sobre fôlego e arrancada nada foi achado.
- **P4, abrigo:** serviu um estudo de onde aves dormem à noite numa cidade; outro, sobre escolha de poleiro em picanços, foi conferido e não serve. **P4, vento e rajadas:** as buscas só devolveram trabalhos de engenharia (aeronaves) e nenhum estudo de aves pequenas.
- **P5, luz e atividade ao entardecer e à noite:** nada adequado foi achado além do estudo de dormitórios.
- **P2, forrageio:** as buscas por frugívoros e granívoros devolveram redes ecológicas e um estudo de uma ave canora doméstica que mostra só a habilidade com sementes mudando com a idade; sobre minhocas serviu só um estudo de vibrações no solo, que foi conferido e não serve.
