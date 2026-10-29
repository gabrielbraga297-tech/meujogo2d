# P1: Voo, gasto de energia e bater asas (Atualização 5 · 0.20.0): TEMAS NÃO VERIFICADOS

**Status: NÃO VERIFICADO.** Nenhum artigo foi aberto; esta página não cita nenhum (veja `LEIAME.md`). São perguntas e palavras-chave para procurar quando houver acesso.

## O que o jogo faz (escolha de design)
- **Voo baixo (o normal):** o passarinho anda como os outros bichinhos; os muros `M` e as paredes `#` o seguram.
- **Voo alto (fruto comum):** 10 s (+2 s por nível do reforço *Fruto poderoso*): o passarinho passa por cima dos muros `M`, não das paredes `#`; sprite maior e mais alto, sombra afastada; pisca nos últimos 2 s e pousa sem perder vida se acabar sobre um muro.
- **Bater asas com fôlego:** ×1,35 de velocidade enquanto se move e tem fôlego; o fôlego gasta 0,4/s (2,5 s de tanque cheio), volta a 0,2/s (5 s) e, vazio, deixa 1,5 s sem poder bater asas (SEM FÔLEGO). É o mesmo código da arrancada do Gatinho com outros nomes.
- Nenhum desses números tem fonte; foram escolhidos para a brincadeira ficar justa e legível.

## Perguntas que a literatura teria de responder
1. O voo batido é muito mais caro, em energia, do que andar ou planar? Faz sentido uma "barra de fôlego" que esvazia em poucos segundos e recarrega em mais tempo?
2. Aves pequenas conseguem sustentar uma arrancada (voo de fuga) por quanto tempo antes de precisar parar?
3. Qual é a velocidade típica de voo de fuga de uma ave pequena em comparação com a de voo normal? (O jogo usa ×1,35 sem base.)
4. Aves pequenas voam por cima de cercas e sebes baixas para fugir de predadores terrestres, ou preferem contornar?

## Palavras-chave de busca
- inglês: `bird flight metabolic cost`, `flapping flight energetics`, `escape flight speed small birds`, `take-off escape flight predator`, `flight initiation distance birds`, `burst flight anaerobic birds`, `hedgerow crossing small birds`.
- português: `custo energético do voo de aves`, `voo batido gasto metabólico`, `fuga de aves pequenas voo de arrancada`.

## Tipo de estudo esperado
Revisões sobre fisiologia do voo; estudos de laboratório (túnel de vento, respirometria, vídeo de decolagem de fuga); estudos de campo (distância de fuga, tempo até a decolagem). Para "voo sobre cercas": estudos de telemetria ou observação em sebes e cercas de áreas agrícolas.

## Lacunas (o que NÃO afirmar)
- Nada garante que 10 s de voo alto, 2,5 s de fôlego ou ×1,35 imitem uma ave real; são números de jogo.
- O jogo não pretende mostrar que aves "passam por cima de muros" como estratégia: é a mecânica pedida (a habilidade de passar por cima dos muros dos labirintos, ganha ao pegar o fruto).
- Sem espécie: as aves reais variam muito de tamanho e de voo, e o Passarinho do jogo não é nenhuma.
