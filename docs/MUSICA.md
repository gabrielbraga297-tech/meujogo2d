# Músicas tema: contrato do motor e como compor uma receita

O jogo tem uma música para o menu e uma para cada fase de cada bichinho. Todas são **sintetizadas na hora** com a Web Audio API (osciladores, filtros, envelopes e ruído):
nenhum arquivo de áudio, nenhuma biblioteca, nenhuma rede. Cada tema é uma **receita** (um objeto com tom, modo, andamento, progressão, motivo, instrumentos e camadas);
um gerador **determinístico** (sem números aleatórios do sistema, sem relógio) transforma a receita numa **partitura**, e o tocador agenda a partitura em laço.
O mesmo tema soa igual toda vez, e os testes conferem a estrutura da música sem precisar ouvi-la.

Arquivos: `js/music.js` (o motor, o tema `menu` e três temas de exemplo, `dog1`, `cat1` e `bird1`, que `js/music-dog.js`, `js/music-cat.js` e `js/music-bird.js` substituem pelos 60 temas das fases), `tests/music.test.js`, `tests/music-themes.test.js`,
`tests/music-render.test.js` e `tests/music-rig.js` (testes e ajudas), `tools/music-render/` (render real no Chromium, conferência de escala, calibração e verificação ao vivo), e os acréscimos `audio()` e `onUnlock()` em `js/sound.js` (nenhum efeito sonoro mudou).

> O que foi e o que não foi conferido: nenhuma pessoa ouviu estas músicas durante o desenvolvimento. As conferências são **estruturais** (notas dentro da escala, âmbito, duração, laço, vozes) e **medidas**
> (pico, RMS, silêncio e emenda do laço, num OfflineAudioContext real do Chromium). Elas não dizem se uma música "fica boa". Os WAVs que `tools/music-render` grava não fazem parte do repositório: para ouvir um tema, basta jogar a fase ou rodar o render.

## 1. Registrar temas

```js
// js/music-dog.js (quem cria um tema segue este molde; o mesmo id registrado depois substitui o anterior, inclusive os de exemplo de js/music.js)
(function (root) {
  const M = root.Music || (typeof require === "function" ? require("./music.js") : null);
  if (!M) return;
  const r = M.register([ { id: "dog1", animal: "dog", /* ... */ } ]);   // { ok: [ids], errors: [{ id, problems: [texto...] }] }
  // receita inválida é IGNORADA (o jogo segue sem aquele tema) e aparece em `errors`: os testes conferem que errors está vazio
})(typeof window !== "undefined" ? window : globalThis);
```

* `Music.register(receita | [receitas])` guarda **uma cópia** de cada receita válida. Nunca lança erro. Devolve `{ ok, errors }`.
* `Music.get(id)` devolve a receita guardada (não altere) ou `null`. `Music.ids()` lista os ids na ordem em que foram registrados (um id substituído mantém a posição).
* `Music.validate(receita)` devolve a lista de problemas em português (vazia = válida). `Music.score(receita | id)` gera a partitura e **lança** `RangeError` se a receita é inválida.
* `Music.scoreOf(id)` devolve a partitura de um id registrado (guarda as 4 últimas em memória) ou `null`; nunca lança.
* No navegador `js/music.js` vem **antes** dos arquivos dos temas (`js/music-dog.js` e os outros). Em Node todos usam `require("../js/music.js")` e enxergam o mesmo registro.

## 2. A receita

Todas as chaves menos `id` e `voices.lead` têm padrão. Valores fora da faixa e **chaves desconhecidas** (erro de digitação: o aviso diz onde está e sugere a chave parecida, como `chave desconhecida "intensty" em voices.bass; quis dizer "intensity"?`) tornam a receita inválida: nada é "corrigido" nem ignorado em silêncio. Uma letra de `prog` ou de `motif.rhythm` que a `form` não tem também é apontada.

```js
{ id: "dog7", animal: "dog", place: "Parque canino",
  key: "G", mode: "mixolydian", bpm: 116, beats: 4, swing: 0.1,
  bars: 32, form: "AABA",
  prog: { A: "I VII IV I", B: "IV I VII I" },
  motif: { seed: 7301, bars: 2, contour: "hop", leaps: 0.5, rests: 0.1, density: 0.7, rhythm: ["x-x-xx-x", "x--x-x--"] },
  voices: {
    lead:    { inst: "xylo", oct: 4, vel: 0.8, rotate: [ { inst: "xylo" }, { inst: "flute", oct: 5 } ] },
    counter: { inst: "flute", oct: 4, vel: 0.5, from: 0.6, above: false },
    bass:    { inst: "bass", pattern: "rootfifth", oct: 2, vel: 0.8, from: 0 },
    pad:     { inst: "strings", oct: 3, vel: 0.5, from: 0.35 },
    arp:     { inst: "pluck", rate: 2, shape: "broken", oct: 4, vel: 0.5, from: 0.5 },
    perc:    { kit: ["softkick", "woodblock"], pattern: "polka", vel: 0.55, from: 0.25 },
    ambience: "wind"                      // ou { kind: "wind", vel: 0.5 }
  },
  intensity: 0.6, gain: 1, maxSilence: 3 }
```

| Chave | Valores aceitos (padrão) |
|---|---|
| `id` | texto como `"dog7"` (letras, números, `_`, `-`; começa por letra; até 31 caracteres) |
| `animal` | `"dog"`, `"cat"`, `"bird"` ou `"menu"` (`"menu"`) |
| `place` | texto livre com o lugar da fase (`""`) |
| `key` | `C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B` (`"C"`) |
| `mode` | `major minor dorian mixolydian lydian phrygian pentMajor pentMinor harmMinor blues` (`"major"`) |
| `bpm` | 50 a 200 (100). É o **pulso** que se sente: semínima em 4/4 e 3/4, semínima pontuada em 6/8 |
| `beats` | `4` (4/4), `3` (3/4) ou `6` (6/8 "em 2": o compasso tem 2 pulsos de 3 colcheias) (4) |
| `swing` | 0 a 0,6 (0). Atrasa as colcheias de contratempo em `swing x 0,25` batida (0,6 = 0,15, quase tercina). Ignorado em 6/8; não balança pad nem ambiência |
| `bars` | inteiro de 8 a 64 (32). O laço dura `bars x batidas do compasso x 60 / bpm` segundos e precisa ficar entre **40 e 100 s** |
| `form` | 2 a 8 letras de `A` a `H` (`"ABAB"`), uma letra por seção; `bars` precisa dividir por esse número e cada seção ter 2 compassos ou mais (ex.: 32 compassos em `AABA` = 4 seções de 8) |
| `prog` | progressão por graus (ver abaixo). Texto, lista ou objeto por letra de seção (`{ A, B, default }`) |
| `motif` | ver seção 3 |
| `voices` | ver seção 4 |
| `intensity` | 0 a 1 (0,6): quantas camadas entram (seção 5) |
| `gain` | 0,3 a 2 (1): ajuste de volume do tema inteiro; é o que se muda para acertar o RMS na ferramenta de render (seção 8) |
| `maxSilence` | 0,5 a 20 (3): maior trecho mudo tolerado pelas conferências, em segundos. Só mude se a pausa for proposital |

**Progressão (`prog`).** Graus do modo em algarismos romanos ou números: `I II III IV V VI VII` ou `1`..`7`; maiúscula ou minúscula tanto faz (a qualidade do acorde vem do modo);
o sufixo `7` põe a sétima (`V7`, `ii7`). Não existem alterações (`bVII` não existe): se a nota não está no modo, não entra. Os acordes de uma seção se repartem pelos compassos
(8 compassos com `"I vi IV V"` = 2 compassos por acorde); uma seção não pode ter mais acordes que compassos. Um acorde é a pilha de terças **da escala** (graus 0, 2, 4 e, com `7`, 6),
então nas pentatônicas e no blues os numerais apontam as notas da escala (`I`..`V` nas pentatônicas, `I`..`VI` no blues; além disso volta a oitava). O **último compasso do laço vira
o acorde de dominante** (a quinta justa acima do tom) e a melodia termina com uma escala curta que desemboca na primeira nota: é isso que faz o laço emendar.
Padrões por modo, quando `prog` falta: major `I vi IV V`, lydian `I II vi V`, mixolydian `I VII IV I`, pentMajor `I V II IV`, minor `I VI VII V`, dorian `I IV I VII`, phrygian `I II I VII`,
pentMinor e harmMinor `I IV V I`, blues `I IV I V`.

## 3. O motivo (`motif`)

A melodia (voz `lead`) nasce de um **motivo** de `bars` compassos (1 a 4; 2) que é reaproveitado, com variações, em todas as frases de 2 compassos: a 1ª frase de cada seção apresenta o motivo,
a 2ª mantém o começo e muda o final (resposta, termina "aberta"), a 3ª sobe (desenvolvimento) e a última faz a cadência no grau de repouso. Seções com letras diferentes ganham motivos
contrastantes (contorno e ritmo mudam); a repetição de uma letra repete a melodia, com enfeites (notas de passagem) a partir da 2ª vez.

| Chave | Significado |
|---|---|
| `seed` | número ou texto; a semente do sorteio determinístico (o padrão é derivado do id). **Dois temas do mesmo bichinho não devem ter a mesma semente** (entre bichinhos diferentes algumas sementes se repetem, sem diferença medida entre as melodias) |
| `bars` | tamanho do motivo em compassos (1 a 4; 2) |
| `contour` | `arch` (sobe e desce), `rise`, `fall`, `wave`, `hop` (saltitante); as seções B, C... usam um contorno contrastante |
| `leaps` | 0 a 1 (0,3): 0 = só graus conjuntos; 1 = saltos de até 4 graus |
| `rests` | 0 a 1 (0,2): probabilidade de tirar notas fracas do motivo (e de respirar no fim das frases) |
| `density` | 0 a 1 (0,5): quando o ritmo é sorteado, de poucas notas (0) a muitas (1) |
| `rhythm` | opcional. Um padrão **por compasso**: texto com espaços (`"x-x-xx-x x--x-x--"`), lista (`["x-x-xx-x", "x--x-x--"]`) ou objeto por letra de seção (`{ A: [...], B: [...] }`). `x` = nota, `-` = segura a anterior, `.` = pausa. Cada padrão tem `passos` caracteres (4/4: 8; 3/4: 6; 6/8: 6) ou o dobro (semicolcheias); o primeiro padrão começa em `x`. Sem `rhythm` o ritmo é sorteado de uma lista de células por compasso |

Garantias da melodia: todas as notas estão na escala do modo; as notas dos tempos fortes são, em geral, notas do acorde do compasso; o âmbito (da mais grave à mais aguda) é de **no máximo 2 oitavas**
por instrumento; nunca há 3 notas iguais seguidas (conferido pela altura, o MIDI: também na troca de instrumento do `rotate`, na escala final e na emenda do laço); a primeira nota cai no 1º tempo.

## 4. Vozes

`voices.lead` é obrigatório; as outras são opcionais (`null` ou ausente = não existe; a exceção é `bass`: ausente = baixo padrão, `null` = sem baixo).
Todas têm `inst` (instrumento), `oct` (oitava da **tônica**; a nota C4 = 60 fica em `oct: 4`; de 1 a 7), `vel` (0,05 a 1: dinâmica) e, menos a `lead` (que toca em todas as seções), `from` (0 a 1: a partir de que nível de seção a camada entra). Cada voz é um objeto (`ambience` também pode ser só o nome do tipo).

| Voz | O que faz | Padrões |
|---|---|---|
| `lead` | a melodia (o motivo). `rotate: [{inst, oct, vel}, ...]` reveza instrumentos **a cada frase de 2 compassos** (campos que faltam herdam do `lead`); o âmbito de 2 oitavas vale por instrumento | `inst` marimba, `oct` 4, `vel` 0,8 |
| `counter` | contramelodia em notas longas (1 ou 2 por compasso) sobre as notas do acorde, em movimento contrário à melodia; fica **abaixo** da melodia, ou **acima** com `above: true` (descante) | `inst` flute, `oct` lead-1, `vel` 0,55, `from` 0,6 |
| `bass` | baixo com um `pattern` | `inst` bass, `pattern` rootfifth, `oct` 2, `vel` 0,8, `from` 0 |
| `pad` | acordes longos (no máximo 2 compassos cada), com condução de vozes suave | `inst` strings, `oct` 3, `vel` 0,5, `from` 0,35 |
| `arp` | arpejo das notas do acorde; `rate` = notas por batida (precisa dar um número inteiro de notas por compasso: 0,5 a 6), `shape` | `inst` harp, `oct` = a do lead, `vel` 0,55, `from` 0,5, `rate` 2 (3 em 6/8), `shape` up |
| `perc` | percussão: `kit` e `pattern` | `vel` 0,6, `from` 0,25, `kit` woodblock, `pattern` steady |
| `ambience` | efeito de ambiente leve e curto (nunca dois ao mesmo tempo) | texto ou `{ kind, vel }` (`vel` 0,5) |

**Instrumentos** (todos sintetizados: osciladores + filtro + envelope; os números são escolhas de design):

| Papel | Nomes |
|---|---|
| Melodia, contramelodia, pad, arpejo (qualquer um serve para qualquer voz de tom) | `pluck` (cordas beliscadas), `marimba`, `xylo` (xilofone), `flute` (senoide com vibrato e sopro), `bell` (sino, parciais inarmônicos), `celesta`, `harp`, `organ` (órgão suave), `strings` (duas serrilhas desafinadas com passa-baixa) |
| Baixo (também servem de solo em oitava baixa) | `bass` (triângulo), `bassSine`, `bassSaw` (serrilha filtrada + seno), `contrabass` (pizzicato: a nota morre sozinha, com batida grave). Todos levam também o 2º e o 3º harmônicos (50% e 25% da amplitude do fundamental), porque o alto-falante de um celular reproduz pouco abaixo de uns 150 Hz e muitas notas do baixo têm o fundamental entre 49 e 92 Hz |
| `perc.kit` | `woodblock` (grave e agudo), `brush` (escova de ruído), `shaker` (chocalho), `softkick` (bumbo macio, só marca o grave: o "tum" de 135 a 48 Hz mais uma varredura curta uma oitava acima e um estalo de ruído em torno de 1,1 kHz, que um alto-falante pequeno reproduz), `hat` (prato leve) |
| `ambience` | `wind` (rajadas de 3 a 5 s), `crickets` (grupos de pios curtos), `rain` (chuvisco de 3 a 5 s), `water` (gotas) |

`perc.kit` pode ser uma lista `[grave, agudo]` (ex.: `["softkick", "woodblock"]`); com um só nome serve aos dois papéis (o bumbo ignora as batidas agudas; um padrão só de batidas agudas com bumbo fica sem notas e a conferência avisa).

**Padrões do baixo** (`bass.pattern`, em 4/4; em 3/4 e 6/8 há versões do mesmo padrão): `rootfifth` raiz-quinta-raiz-quinta ("uum-pá"), `walk` raiz, nota de passagem, quinta e
aproximação da raiz seguinte, `pedal` a raiz sustentada o compasso inteiro, `offbeat` só nos contratempos, `sync` síncopa (tresillo: raiz, oitava, quinta), `pizz` meio a dois (raiz longa, quinta no 3º tempo,
fantasmas curtos e aproximação), `waltz` raiz grave e quintas leves (em 3/4: "uum-pá-pá"; nos outros compassos vira `rootfifth`).

**Padrões de percussão** (`perc.pattern`): `steady` (grave nos tempos 1 e 3, agudo nos 2 e 4), `offbeat` (agudos nos contratempos), `backbeat` (agudos fortes nos tempos 2 e 4), `polka` (grave em todos os tempos e
agudos fantasmas nos contratempos), `shuffle` (todas as colcheias, as de contratempo mais fracas), `driving` (colcheias com fantasmas), `sparse` (uma ou duas batidas por compasso), `heartbeat`
("lub-dub" grave), `brush2` (padrão de escova "ding, ding-a-ding"), `waltz` (como `steady`). Notas **fantasmas** só entram em seções de nível 0,5 ou mais. No fim de cada seção (menos no último compasso do laço),
se o nível é 0,45 ou mais, as batidas dos últimos passos viram uma **virada** de 3 ou 4 batidas rápidas subindo de força.

**Formas do arpejo** (`arp.shape`): `up`, `down`, `updown` (sobe e desce), `broken` (raiz, quinta, terça, quinta), `alberti` (como `broken` com a quinta uma oitava acima).

## 5. Camadas por seção (`intensity`)

Cada seção tem um **nível** de 0 a 1: `intensity` + um acréscimo pela letra (`A` -0,12; `B` +0,15; `C` +0,25; `D` +0,1; `E` a `H` +0,15) + 0,1 se a letra já apareceu antes.
Uma voz só toca nas seções cujo nível é **maior ou igual ao `from`** dela; a melodia (`lead`) e a ambiência tocam sempre. Padrões de `from`: baixo 0, percussão 0,25, pad 0,35, arpejo 0,5, contramelodia 0,6.
O nível também deixa o arpejo mais cheio e as notas um pouco mais fortes. Exemplo (`intensity` 0,55, `ABAB`, padrões de `from`): A = 0,43 na 1ª vez (baixo, percussão e pad), 0,53 na repetição (entra o arpejo), B = 0,70 (entra a contramelodia).
A conferência avisa quando uma voz está na receita mas nunca toca (nenhuma seção chega ao `from`).

## 6. A partitura (`Music.score`)

```js
{ id, animal, place, key, mode, bpm, beats, barBeats, swing, bars, form, sectionBars, lengthBeats, lengthSeconds, gain, maxSilence,
  harmony: [ { bar, section, letter, level, root (índice do grau), seventh, pcs: [classes de altura do acorde, a raiz primeiro] }, ... ],
  events: [ { t, d, midi, v, voice, inst, kind, deg?, bar?, f? }, ... ],       // ordenados por t
  stats: { count, dropped, byVoice, maxPolyphony } }
```

* `t` e `d` estão em **batidas** (o pulso do `bpm`), `lengthBeats = bars x barBeats` (`barBeats` = 4, 3 ou 2 em 6/8); em segundos, `t x 60 / bpm`. `t` está sempre em `[0, lengthBeats)`; as notas cuja cauda passa do fim do laço
  continuam soando sobre o laço seguinte (o tocador não corta nada).
* `midi`: nota MIDI inteira (C4 = 60) ou `null` na percussão e na ambiência. `v`: dinâmica 0..1. `voice`: `lead counter bass pad arp perc amb`. `inst`: o instrumento. `kind`: `motif answer dev cadence orn pickup`
  (melodia), `counter`, `root third fifth root8 fifth8 pass approach` (baixo), `chord`, `arp`, `low high ghost fill` (percussão), `gust chirp patter drop` (ambiência). `deg`: grau da escala (melodia, baixo, pad, arpejo).
  `f`: frequência em Hz de cada gota da água.
* **Vozes ao mesmo tempo ≤ 14**: o gerador conta cada nota pelo tempo que ela soa (duração escrita + cauda do instrumento) e, se passar de 14, corta a voz mais fraca (pela ordem lead, baixo,
  contramelodia, pad, percussão, arpejo; entre iguais, a de menor `v`, depois a mais antiga); a melodia nunca é cortada para dar vaga a outra voz, e a ambiência tem uma vaga reservada. `stats.dropped` diz quantas notas foram cortadas.
* `Music.render(partitura, ctx, destino, t0, opts)` agenda as notas num `BaseAudioContext` qualquer (`AudioContext`, `OfflineAudioContext` ou o falso dos testes), como `Sound.render`. `t0` é o instante (relógio do áudio, em s)
  da batida `opts.from` (padrão 0); `opts.to` (padrão `lengthBeats`) delimita uma **janela** `[from, to)` em batidas; `opts.minTime` pula notas que começariam antes; `opts.gain` multiplica o volume; `opts.voices`
  toca só as vozes listadas. Devolve `{ count, end, failed }`. Não guarda estado; nota recusada pelo navegador conta em `failed` e não derruba o resto.
  Cada instrumento começa e termina em 0 (sem clique), tem ataque de 3 ms ou mais, e todo oscilador tem `start` e `stop`.

## 7. O tocador (`Music.create`)

```js
const som = Sound.create({ storage: window.localStorage }); som.bindUnlock();
const musica = Music.create({ sound: som, storage: window.localStorage });
```

Opções: `sound` (o `Sound.create` do jogo: dá o contexto de áudio, a entrada mestre e o mudo; sem ele a música é muda), `storage` (opcional; `getItem`/`setItem`), `now` (relógio em ms, padrão o do sistema),
`setInterval`/`clearInterval` (injetáveis, para testes), `busGain` (ganho do barramento da música relativo ao mestre dos sons, padrão 0,45).

**Cadeia de áudio:** cada tema -> ganho do tema (crossfade) -> ganho do duck -> barramento da música (0,45) -> `som.audio().input` (o ganho mestre do Sound, na frente do compressor). Por isso o volume e o mudo do Sound valem também para a música.

| Método | O que faz |
|---|---|
| `play(id, opts)` | toca o tema; devolve `true` se o id existe (mesmo que ainda não possa soar), `false` se não existe (e nada muda). **O mesmo id não reinicia.** Troca de tema = crossfade (`opts.fade`, padrão 0,7 s; 0 a 8). `opts.from` (batida do laço onde começar), `opts.volume` (0 a 1,5; 1), `opts.restart: true` recomeça mesmo sendo o mesmo id. Antes do unlock do Sound, com a música desligada, mudo ou em pausa, o pedido **fica guardado** e o tema entra assim que puder |
| `stop(fade)` | some em `fade` s (padrão 0,5; 0 a 8) e esquece o tema pedido |
| `duck(nível, segundos)` | abaixa para `nível` (0 a 1) e **volta sozinho** depois de `segundos`; sem `segundos` fica abaixado até o próximo `duck`/`setDuck`. A descida leva ~0,1 s e a volta ~0,75 s. Um `duck` pedido antes do unlock também volta (o barramento agenda a volta ao nascer dentro da janela) e, se o relógio do sistema recuar durante um `duck` temporário (ajuste de hora), ele vale como vencido |
| `setDuck(nível)` | nível fixo (pausa do jogo: `0.25`; para voltar: `1`); um `duck` temporário volta a esse nível |
| `pause()` / `resume()` | aba escondida ou janela sem foco: some em 0,05 s e não agenda nada; `resume()` volta do **começo do compasso** em que parou. O que já tinha começado antes desse compasso e ainda soava não é tocado de novo: as notas do pad (acordes de até 2 compassos) só voltam na próxima troca de acorde, então o pad pode faltar até o fim do acorde em curso (no máximo 1 compasso; 2,3 s no tema do menu), e uma rajada de vento ou chuvisco em curso também só volta no próximo evento da ambiência |
| `setEnabled(bool)` / `isEnabled()` / `toggleEnabled()` | o botão Música; guarda `{"on":0|1}` em `cachorrinho.musica.v1` (ligada por padrão; leitura e gravação em `try/catch`; sem `storage` vale só a memória). Desligada, nada toca; ao ligar, o tema pedido volta do compasso em que estava |
| `tick()` | confere o agendador agora; o jogo pode chamar depois de mudar o mudo do Sound (`som.setMuted`) para a música reagir na hora; sem isso reage em até ~120 ms |
| `dispose()` | para tudo e solta os ganchos |
| `current` | id pedido (`string`) ou `null` |
| `state` | `"stopped"` (nada pedido), `"unsupported"` (sem Web Audio ou barramento recusado), `"off"` (música desligada), `"muted"` (Sound mudo), `"paused"`, `"waiting"` (o Sound ainda não destravou), `"suspended"` (contexto suspenso), `"playing"` |
| `position` | `{ id, beat, live }` com a batida do laço que se ouve agora, ou `null` |
| `events` | os últimos 200 pedidos `{ name, t (ms), ... }` (`play`, `stop`, `duck`, `setDuck`, `pause`, `resume`, `setEnabled`) |
| `supported`, `paused` | booleanos |

Comportamento garantido (conferido em `tests/music.test.js` com um AudioContext falso e em `tools/music-render/live.js` num AudioContext real):

* **Nunca lança erro.** Sem Web Audio, com contexto que lança, com `createGain` recusado ou sem `sound`, a música simplesmente não toca.
* Só começa depois do 1º gesto: usa `sound.audio()` (que só devolve o contexto depois do `unlock`) e `sound.onUnlock(fn)`; um `unlock` tardio inicia o tema pedido na hora.
* **Agendador:** a cada 120 ms agenda até 0,6 s à frente com `Music.render` (janelas de batidas), sem repetir nem pular notas; o laço dá a volta sem falha (as caudas do fim caem no começo do laço seguinte).
  Só há um `setInterval`, e só enquanto há tema pedido. Se o relógio do áudio fica para trás (aba em segundo plano), pula o tempo perdido em vez de despejar notas atrasadas.
* **Contexto suspenso** (celular, aba em segundo plano): pede `resume()` no máximo uma vez por segundo (também depois de o relógio do sistema recuar), não agenda nada e, quando volta a rodar, continua sem mandar notas para o passado. **Contexto fechado e recriado** pelo Sound: monta o barramento no novo e recomeça o tema pedido (ver os limites abaixo: alguém precisa chamar `sound.unlock()`).
* **Mudo** (`som.isMuted()`): não agenda nada, zera o barramento e some em 0,05 s; ao desmutar volta do começo do compasso em que parou. **Aba escondida / pausa de jogo:** o jogo chama `pause()`/`resume()` (e `setDuck(0.25)` na pausa do menu).
* Desempenho: um ciclo cria poucas dezenas de nós (nenhum ciclo passou de 300 nos testes), há no máximo 14 notas soando, o ruído é um só buffer de 1 s por contexto, e todo oscilador é parado no fim.

**Limites conhecidos do tocador:**

* **Contexto de áudio fechado:** o tocador só se recupera de um `AudioContext` fechado se o jogo chamar `sound.unlock()` de novo. O jogo chama `sound.bindUnlock()` uma vez, e esse gancho se desliga assim que o som está rodando; depois disso ninguém
  chama `unlock()`, e `Sound.audio()` devolve `null` com o contexto fechado: a música (e os efeitos) ficariam mudos até recarregar a página. Os navegadores não fecham o contexto sozinhos; o teste do contexto fechado chama `sound.unlock()` à mão.
* **Retomada no meio de um som longo:** o `resume()` (e desmutar, ou ligar o botão Música) volta ao começo do compasso, mas não repete o que já tinha começado antes: o pad pode faltar por até 1 compasso e uma rajada de vento ou chuvisco em curso só volta no próximo evento.
* **Relógio do sistema:** o tocador lê `Date.now` para o duck temporário, para o intervalo entre pedidos de `resume()`, para soltar do grafo os temas que saíram e para o registro de pedidos; a música em si anda pelo relógio do áudio. Se o relógio recuar, o duck temporário vale como vencido e o `resume()` não fica bloqueado; os temas que já saíram (em volume 0) só são soltos do grafo quando o relógio alcançar o valor antigo.

**Quando chamar:** menu e telas de menu `play("menu")`; começar a Fase N `play("dog"+N)` (ou `cat`/`bird`); pausa `setDuck(0.25)` e `setDuck(1)` ao voltar; perder uma vida `duck(0.3, 0.8)`;
vitória `stop(0.5)`; game over `stop(0.4)`; aba escondida `pause()` e `resume()`; botão Música `toggleEnabled()`; depois de `som.setMuted(...)` chame `musica.tick()`.

## 8. Conferências e ferramentas

**Testes em Node** (`tests/music-rig.js`, sem navegador):

```js
const rig = require("./music-rig.js");
require("../js/music-dog.js");
const receitas = Array.from({ length: 20 }, (_, i) => rig.Music.get("dog" + (i + 1)));
rig.checkRecipe(receita)        // lista de falhas; [] = tudo certo. Faz as conferências estruturais abaixo (opts.render:false pula a renderização no contexto falso)
rig.checkDistinct(receitas)     // ids únicos; ninguém repete (tom, modo, andamento, solo, padrão do baixo); melodias diferentes (similaridade de intervalos+durações < 0,35, também para cópias transpostas)
rig.checkTempoRamp(receitas, { min: 92, max: 148 })   // andamento dentro da faixa e crescente com a fase (correlação de Spearman >= 0,6; última >= 20 bpm acima da primeira)
```

`checkRecipe` confere: receita válida; **determinismo** (duas gerações idênticas); campos finitos e dentro do laço; instrumento certo para cada voz; **todas as notas na escala do modo**; **âmbito da melodia <= 2 oitavas** (por instrumento);
**duração do laço de 40 a 100 s**; **o laço fecha** (último compasso = dominante, baixo na raiz do dominante, última nota da melodia a até 3 graus da primeira, primeira nota no 1º tempo); melodia em toda seção;
toda voz declarada toca alguma nota; **<= 14 vozes ao mesmo tempo** (contagem independente da do gerador); nenhum trecho mudo maior que `maxSilence`; e, no AudioContext falso (`checkRender`), que toda fonte tem `start` e
`stop` com valores finitos, chega à saída, todo envelope começa e termina em 0 e não há nós demais por nota. Também há o AudioContext falso rigoroso (`makeFake`, que lança em rampa exponencial para valor <= 0, tempo negativo,
`start` duplo...), `clock`, `memStorage` e `makeTimers` (timers manuais) para testar o tocador.

**Render real** (`tools/music-render/render.js`, Chromium + `OfflineAudioContext` 44100 Hz mono; precisa do Playwright e de um Chromium):

```
NODE_PATH=/caminho/dos/node_modules CHROMIUM_PATH=/caminho/do/chromium \
  node tools/music-render/render.js [ids...] [--out pasta] [--files a.js,b.js] [--tail s] [--loops n] [--no-wav] [--json arquivo] [--resume] [--timeout s]
```

Para vários processos não abrirem o navegador ao mesmo tempo, aponte `MUSIC_LOCK` (ou `PREVIEW_LOCK`) para um arquivo de trava: o script se reexecuta sob `flock` nele.
Sem `ids` renderiza todos os temas registrados (`js/music.js` mais `js/music-dog.js`, `js/music-cat.js` e `js/music-bird.js`, se existirem). Cada tema é renderizado sozinho, com ganho 1 e sem o barramento do jogo, 1 laço + 4 s de cauda;
a medida é feita no laço "em regime" (a cauda é somada ao começo, como o tocador faz). Grava `<id>.wav` (16 bits) e `relatorio.json` em `--out` (padrão: `$MUSIC_OUT`, ou `musicas/wav` ao lado do arquivo de `MUSIC_LOCK`, ou a pasta temporária).
`--json arquivo` grava o relatório em outro lugar. O relatório é regravado **depois de cada tema**: um travamento ou uma interrupção não perde o que já foi medido, e `--resume` lê o relatório que já existe, pula os temas
que estão nele (os que deram tempo-limite são refeitos) e continua. Cada tema tem um **tempo-limite** (`--timeout s`, padrão 180): se estoura, o navegador é fechado e aberto de novo e o tema é tentado uma vez mais; se falha de novo,
vira falha no relatório (`timedOut`) e o script segue com os outros. (Um render real dos 61 temas já travou uma vez no meio, sem erro; é para isso que serve.) A lógica sem navegador (`tools/music-render/runner.js`) é testada em `tests/music-render.test.js`.
Imprime uma tabela e **sai com código 1** se algum limite falhar:

| Medida | Limite |
|---|---|
| pico | <= 0,9 |
| RMS (dBFS, banda cheia) | entre -26 e -18 (alvo -22 +- 4), para todos os temas; é o nível do **tema sozinho a ganho 1**: no jogo ainda há o barramento (0,45, cerca de -7 dB) e o volume mestre |
| DC | \|DC\| < 0,01 |
| maior silêncio (quadros de 20 ms abaixo de 0,001, contando a volta do laço) | < `maxSilence` (3 s) |
| emenda do laço | salto de nível (janelas de 250 ms antes e depois) no máximo 3 dB acima do maior salto dos outros compassos; degrau entre amostras na emenda <= 1,5 x o maior do resto |

**Conferência de escala** (`tools/music-render/scale.js`, mesmo ambiente do render): renderiza cada tema duas vezes, com ganho 1 e com ganho 0,25, e confere que o primeiro é igual a 4 vezes o segundo em **todas** as amostras
(resíduo até 0,01, ou -40 dBFS). Uma amostra que não escala é um clique: por exemplo, o ganho de uma nota que começa fora de 0 deixa passar a 1ª amostra da fonte inteira, e isso não muda com o volume.
`node tools/music-render/scale.js [ids...] [--files a.js,b.js] [--tail s] [--json arquivo] [--resume] [--timeout s]` (sem ids: todos os temas); grava `escala.json` (ou o de `--json`) depois de cada tema, usa o mesmo
tempo-limite, a mesma nova tentativa e o mesmo `--resume` do render, e sai com código 1 se algum tema tiver amostra fora de escala. Só acha o que não escala; não diz se o tema "soa bem". A conta (`scaleResidual`
em `tools/music-render/analyze.js`) é testada em Node (`tests/music-render.test.js`), inclusive o `scale.js` inteiro contra um navegador de mentira.

A coluna "ganho sug." é o `gain` da receita que levaria o RMS ao alvo sem passar de pico 0,9: para acertar um tema fora da faixa, ponha esse valor em `gain` e renderize de novo.
`tools/music-render/calibrate.js` mede cada instrumento sozinho (a tabela `INST_GAIN` de `js/music.js` saiu daí para os instrumentos de tom; percussão e ambiências têm correção menor, de design) e
`tools/music-render/live.js` roda o tocador num `AudioContext` real em tempo real (começa, troca de tema, duck, pausa, mudo, botão, parar), medindo o nível de saída por um analisador.

## 9. Como compor uma receita (roteiro)

1. Escolha o lugar e o clima e traduza em **modo, tom e andamento** (o estilo de cada bichinho e a rampa de andamento da Fase 1 à 20 estão na seção 10). Dois temas não podem repetir (tom, modo, andamento, solo, padrão do baixo).
2. Escreva `prog` (uma progressão por letra; 4 acordes por seção de 8 compassos é o comum), um `motif` com **semente própria** e, se quiser um ritmo seu, `rhythm`. Varie `contour`, `leaps` e `rests` entre os temas.
3. Escolha as vozes: um solo, um baixo (`pattern` combinando com o gênero: `rootfifth`/`walk` para o cachorrinho, `pizz`/`sync` para o gato, `waltz`/`pedal` para o passarinho), e só as camadas que a fase pede
   (use `intensity` e `from` para as seções A serem mais leves que as B/C). A ambiência é para quando o lugar pede (vento, grilos, chuva, água).
4. Rode `checkRecipe` em cada receita e `checkDistinct` / `checkTempoRamp` no conjunto (no teste do bichinho: `tests/music-<animal>.test.js`).
5. Rode `tools/music-render/render.js` nos seus temas; corrija `gain` pelo "ganho sug." e confira que nenhum limite falha. Os WAVs não vão para o repositório.

Limites a lembrar: nenhuma nota fora do modo (o gerador garante), laço de 40 a 100 s, até 14 vozes, a melodia em até 2 oitavas por instrumento, nada de melodia conhecida (as músicas devem ser ORIGINAIS: o gerador não conhece nenhuma melodia, mas a escolha do `rhythm` e da `seed` é de quem cria o tema, e não há comparação automática com melodias conhecidas).

## 10. Estilo e rampa de andamento por bichinho

É um guia de escolhas de quem cria os temas, não uma regra do motor: as receitas atuais o seguem e os testes de cada bichinho conferem a rampa de andamento (`checkTempoRamp`, seção 8). Nenhuma pessoa ouviu estes temas; o estilo musical é escolha de design.

| Tema | Estilo | Andamento (bpm) |
|---|---|---|
| Menu | acolhedor e curioso: modo maior, andamento médio; marimba, flauta e contrabaixo pizzicato se revezam no motivo, sem que nenhum domine | 104 (fá maior, 4/4) |
| Cachorrinho | alegre, saltitante e brincalhão: maiores, mixolídio e lídio; marcha, polca e balanço leve; xilofone, marimba e cordas beliscadas; baixo caminhante e bloco de madeira. Nas fases avançadas, mais urgência: o andamento sobe, entram modos menores e mais camadas; a noite e a fortaleza têm tom mais sério | 92 (Fase 1) a 148 (Fase 20) |
| Gatinho | furtivo, elegante e malandro: dórico, menor, menor harmônico, frígio, blues e pentatônicos (alguns modos claros para os lugares abertos); balanço (swing); contrabaixo pizzicato, escovas, celesta, flauta grave, acordes de sétima; mais silêncio e síncopas | 84 (Fase 1) a 132 (Fase 20) |
| Passarinho | leve e arejado: pentatônicas, lídio, maior e mixolídio no começo, modos menores a partir da Fase 11; arpejos de harpa, celesta e sino, flauta com vibrato, compassos soltos (13 das 20 fases em 6/8 ou 3/4); vento, água e grilos como ambiência; motivos curtos e ritmados como cantos de pássaro, sem imitar nenhuma espécie | 76 (Fase 1) a 128 (Fase 20) |

**Rampa.** O andamento e a densidade (`intensity`, camadas) sobem **em tendência** da Fase 1 à 20 (correlação de Spearman entre a fase e o andamento medida nas receitas: 0,97 no Cachorrinho, 0,99 no Gatinho e 0,66 no Passarinho; o teste do Passarinho
aceita 0,6 ou mais), com picos de clima nas fases-chave: a 11 (chegada dos inimigos mais fortes), as noites (18 e 19) e a 20 (final grande, alegre e "volta ao lar"). Há **recuos de propósito**, em que o tema da fase é mais lento que o da anterior:

* Cachorrinho: Fase 9 (Praia, 110 bpm depois de 118), Fase 12 (Pet shop, 120 depois de 130) e Fase 14 (Bosque, 122 depois de 126);
* Gatinho: Fase 12 (Horta e galinheiro, 112 depois de 116) e Fase 17 (Praia e dunas, 119 depois de 123);
* Passarinho: as Fases 18 (Entardecer nos telhados, 82 bpm) e 19 (Noite na floresta, 90 bpm), bem abaixo da 17 (124 bpm); a 20 volta a 128.

No 6/8 o `bpm` é o pulso pontuado (dois por compasso), por isso as fases em 6/8 mais rápidas têm mais compassos para o laço durar o mesmo.

