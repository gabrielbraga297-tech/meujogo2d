# P4: Abrigo em galhos e poleiros, obstáculos baixos e vento (Atualização 5 · 0.20.0): TEMAS NÃO VERIFICADOS

**Status: NÃO VERIFICADO.** Nenhum artigo foi aberto; esta página não cita nenhum (veja `LEIAME.md`). São perguntas e palavras-chave para procurar quando houver acesso.

## O que o jogo faz (escolha de design)
- **Galho `G`** (copa de árvore, fio, mastro, telhado alto, vitória-régia): com o centro do passarinho em cima, nenhum gato e nenhum gavião o pega; quem persegue espera ao pé até 4 s e desiste. Em cima não há limite de tempo; ao descer a proteção acaba.
- **Obstáculo baixo `X`** (cerca baixa, pedra, arbusto, rede): o passarinho e o gavião passam, os gatos não. O `X` não protege quem está em cima dele.
- **Vento `>` `<` `^` `v`:** empurra o passarinho a 90 px/s na direção da seta, só no voo baixo (no voo alto ele está acima do vento); gatos e gaviões não sentem. A favor soma, contra subtrai. As paredes e os muros ainda o seguram.
- Os 4 s de espera, os 90 px/s e a regra "alto = acima do vento" são do jogo, sem fonte.

## Perguntas que a literatura teria de responder
1. Aves pequenas escolhem poleiros altos ou copas fechadas quando há um gato por perto? E quando o risco é uma ave de rapina?
2. Quanto tempo um predador terrestre espera embaixo de uma árvore antes de desistir? (O jogo usa 4 s sem base.)
3. Aves pequenas passam por cima de cercas e arbustos baixos para fugir de um predador terrestre?
4. Como o vento e as rajadas afetam o voo de aves pequenas (velocidade, trajetória, custo)? Voar mais alto muda o efeito do vento perto do chão?

## Palavras-chave de busca
- inglês: `perch height predation risk small birds`, `refuge use birds predator cats`, `canopy cover predation risk garden birds`, `cat waiting time prey refuge`, `wind effects on bird flight`, `gust flight small birds`, `wind speed near ground vs aloft birds`, `crosswind flight birds`.
- português: `uso de poleiros altos por aves`, `abrigo de aves contra predadores`, `efeito do vento no voo de aves pequenas`, `voo de aves em rajadas de vento`.

## Tipo de estudo esperado
Estudos de campo (observação de poleiros, câmeras em jardins), experimentos com modelos de predador, estudos de laboratório (túnel de vento com rajadas) e de telemetria (rotas de aves pequenas e vento).

## Lacunas (o que NÃO afirmar)
- Que o galho do jogo "é um abrigo seguro" ou que o gato "desiste em 4 s": é regra de jogo.
- Que o vento "empurra" por 90 px/s: o número é só de equilíbrio (soma ou subtrai de um passarinho de ~252 px/s).
- A regra de que o `X` protege o passarinho mas não o salva de um gato ao lado (alcance de 34 px) também é só de jogo.
