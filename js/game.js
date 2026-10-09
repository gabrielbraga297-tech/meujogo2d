(() => {
  "use strict";

  const TILE = 32;
  const VIEW_COLS = 25, VIEW_ROWS = 18;                // o que a tela mostra de uma vez (em tiles) quando não há zoom; mapas maiores rolam, seguindo o cachorro
  const VIEW_W = VIEW_COLS * TILE, VIEW_H = VIEW_ROWS * TILE;
  // Tamanho do mapa da fase em jogo (cada fase tem o seu: veja `cols`/`rows` em buildLevel); mudam em reset().
  let COLS = VIEW_COLS, ROWS = VIEW_ROWS, WORLD_W = VIEW_W, WORLD_H = VIEW_H;
  const SPEED = 252;        // cachorro, pixels do mundo por segundo (0,7 × os 360 da 0.6.0; as Fases 3 a 5 usam uma fração disso: veja `dogSpeed` em LEVELS)
  const BONE_SPEED_BONUS = 0.1; // cada osso pego deixa o cachorro 10% mais rápido até o fim da fase (soma: 2 ossos = +20%)
  const START_LIVES = 3;    // vidas ao começar uma fase do zero
  const MAX_LIVES = 5;      // as vidas acumulam de 1 a 5 (e passam de uma fase para a seguinte)
  const MAX_RETRIES = Records.MAX_RETRIES; // sem vidas: até 3 novas tentativas da mesma fase (cada uma custa pontos)
  const INVULN = 2;         // segundos de proteção depois de perder uma vida
  const MIN_TILE_CSS = 24;  // abaixo disso (telas pequenas) a câmera dá zoom e segue o cachorro
  const MAX_BACKING_W = 2400; // limite de resolução interna do canvas (desempenho)
  const AUTOSAVE_EVERY = 5; // segundos entre salvamentos automáticos
  const RESUME_GRACE = 1.5; // proteção ao continuar um jogo salvo

  // ---------- Fases ----------
  // Veterinário da Fase 1: patrulha devagar e raramente decide perseguir, mas, quando aparece o "!",
  // ele acelera e persegue com mais empenho.
  // Velocidades do veterinário da Fase 1 (px/s): 55 e 110 (a 0.7.0 aumentou em 10% as da 0.6.0, em todas as fases). Na Fase 2 valem os mesmos valores + 10% nos dois modos: 60,5 e 121.
  const VET_SPEED = 55, VET_CHASE_SPEED = 110;
  const BASE_VET = {
    speed: VET_SPEED,           // velocidade sem o "!" (patrulhando): 55 px/s
    chaseSpeed: VET_CHASE_SPEED,// velocidade com o "!" (perseguindo): 110 px/s (o cachorro, a 252, ainda é mais rápido)
    // O alcance para notar o cachorro ("sight", px) vem da fase: veja `alertTiles` em LEVELS.
    chaseChance: 1,   // chance de decidir perseguir a cada "olhada": 1 = o "!" liga na hora que o cachorro entra no alcance
    thinkEvery: 0.1,  // intervalo entre "olhadas" (s)
    chaseTime: 3,     // duração mínima de uma perseguição (s)
    chaseMax: 6,      // duração máxima: enquanto vê o cachorro ele não desiste, até este limite (s)
    restTime: 5,      // descanso depois de perseguir (s)
    idleMin: 0.6, idleMax: 1.6, // pausa ao chegar no destino da patrulha (s)
  };
  // "Mais esperto" = 10% mais difícil: mais rápido, insiste mais e descansa menos (o alcance do "!" é regra da fase: alertTilesFor).
  const harder = (c, f) => ({
    speed: Math.round(c.speed * f * 100) / 100, chaseSpeed: Math.round(c.chaseSpeed * f * 100) / 100, chaseChance: Math.min(1, c.chaseChance * f),
    thinkEvery: c.thinkEvery / f, chaseTime: c.chaseTime * f, chaseMax: c.chaseMax * f, restTime: c.restTime / f,
    idleMin: c.idleMin / f, idleMax: c.idleMax / f,
  });
  const PHASE2_VET = harder(BASE_VET, 1.1);
  // Fase 3: mais 10% de velocidade de movimento (patrulhando e perseguindo) sobre a Fase 2: 66,55 e 133,1 px/s. O resto fica como na Fase 2.
  const PHASE3_VET = { ...PHASE2_VET, speed: Math.round(PHASE2_VET.speed * 1.1 * 100) / 100, chaseSpeed: Math.round(PHASE2_VET.chaseSpeed * 1.1 * 100) / 100 };
  // Fase 4 e Fase 5: mais 10% de velocidade dos veterinários sobre a Fase 3 (73,21 e 146,41 px/s), nos dois modos; o cachorro fica 5% mais rápido que na Fase 3 (238,14 px/s).
  const PHASE4_VET = { ...PHASE3_VET, speed: Math.round(PHASE3_VET.speed * 1.1 * 100) / 100, chaseSpeed: Math.round(PHASE3_VET.chaseSpeed * 1.1 * 100) / 100 };
  // Fases 6 a 10: a partir da Fase 5 (= Fase 4), +4% de velocidade a cada fase (nos dois modos); o resto do comportamento é o mesmo.
  const scaleVet = (c, f) => ({ ...c, speed: Math.round(c.speed * f * 100) / 100, chaseSpeed: Math.round(c.chaseSpeed * f * 100) / 100 });
  const PHASE6_VET = scaleVet(PHASE4_VET, 1.04);
  const PHASE7_VET = scaleVet(PHASE4_VET, 1.08);
  const PHASE8_VET = scaleVet(PHASE4_VET, 1.12);
  const PHASE9_VET = scaleVet(PHASE4_VET, 1.16);
  const PHASE10_VET = scaleVet(PHASE4_VET, 1.2);
  const POSTMAN_SLOW = 0.5;  // carteiro atingido pelo cachorro com poder: volta ao centro e anda só 50% da velocidade que a fase dá a ele (até o poder acabar)
  const POSTMAN_STUN = 2;    // s em que o carteiro atingido não pode ser atingido de novo (e não pontua de novo)
  const VET_NEAR = 3;        // tiles: ao escolher o caminho de patrulha, o veterinário evita passar a menos disso de outro veterinário
  const VET_TANDEM = 96, TANDEM_AFTER = 3, TANDEM_PAUSE = 1.5; // px, s, s: se um veterinário de número maior patrulha há 3 s a menos de 96 px de outro, ele para 1,5 s e fica para trás
  const VET_STACK = 24, STACK_AFTER = 0.4, STACK_PAUSE = 1.2; // px, s, s: dois veterinários em patrulha a menos de 24 px por 0,4 s: o de número maior descansa 1,2 s e eles se separam
  const VET_GAP = 40;        // px: um veterinário que vai atrás de outro não chega mais perto que isso (eles não andam colados nem se sobrepõem)
  const POWER_END_GRACE = 1; // s de proteção quando o poder do osso acaba (os carteiros voltam a ser veterinários, talvez bem do lado do cachorro)
  // Alcance do "!": o veterinário liga o "!" assim que o cachorro está a até 2 × (número da fase) quadrados dele, com linha de visão livre:
  // Fase 1 = 2 quadrados, Fase 2 = 4, Fase 3 = 6, Fase 4 = 8 e Fase 5 = 10. As Fases 6 a 10 definem o próprio alcance (11, 12, 13, 14 e 15).
  const alertTilesFor = (levelNumber) => 2 * levelNumber;
  // Blocos que se movem (a partir da Fase 3): ficam parados num tile, e a cada BLOCK_EVERY segundos mudam de lado (deslizam até o outro tile da dupla), sem
  // esperar ninguém chegar perto. Nas Fases 1 a 3 nunca esmagam (quem estiver no lugar para onde o bloco vai é empurrado para o lado); nas Fases 4 a 10 (`crush`) esmagam o cachorro sem o poder do osso.
  // `blockEvery` de cada fase pode mudar esse intervalo. Nos últimos BLOCK_WARN s antes de cada mudança, o trilho pisca em amarelo.
  const BLOCK_SPEED = 120, BLOCK_EVERY = 3, BLOCK_WARN = 0.6; // px/s ao deslizar (o dobro de antes), s entre as mudanças, s de aviso

  // # parede | X caixa | E saída | P início do cachorro | V início de um veterinário
  // (as rações são sorteadas em lugares livres a cada jogo novo e quando se perde uma vida: veja placeItems)
  const MAP_1 = [
    "#########################",
    "#P......#.........#.....#",
    "#.......#....X....#.....#",
    "#..XX...#....X....#.....#",
    "#..XX.........X.........#",
    "#.......#.....X....##.###",
    "#####.###..........#....#",
    "#.....#....#####...#....#",
    "#.....#....#...#........#",
    "#.....#....#...#...XX...#",
    "#.....X.........#..XX...#",
    "#.....#....#....#.......#",
    "###.###....######.#######",
    "#.V.....#...............#",
    "#..XXX..#...............#",
    "#.......#...XX.......EEE#",
    "#...............XX...EEE#",
    "#########################",
  ];
  // Fase 2: quatro salas nos cantos ligadas por corredores a um salão central, onde os dois veterinários começam.
  const MAP_2 = [
    "#########################",
    "#P......#########.......#",
    "#.....X.#########.X.....#",
    "#.XX.................XX.#",
    "#.......####.####.......#",
    "#.......####.####.......#",
    "####.###.........###.####",
    "####.###..X...X..###.####",
    "####.......V.........####",
    "####.###.....V...###.####",
    "####.###..X...X..###.####",
    "####.###.........###.####",
    "#.......####.####.......#",
    "#.....X.####.####.......#",
    "#.......................#",
    "#.XX..X.#########....EEE#",
    "#.......#########..X.EEE#",
    "#########################",
  ];
  // Fase 3: armazém com três faixas (salas dos cantos, corredor de cima e de baixo, salão central dos veterinários). Os dois corredores
  // de cima têm "portas": um bloco que se recolhe a um nicho (e fecha o corredor de novo). Cada porta tem um caminho alternativo.
  const MAP_3 = [
    "#########################",
    "#P....###.......###.....#",
    "#.....#.#.......###.....#",
    "#.XX.......X.........X..#",
    "#.....###.......#.#.....#",
    "#.....###.......###.....#",
    "###.########.########.###",
    "###.##.............##.###",
    "###.##...X.......X.##.###",
    "###.##.....V.V.....##.###",
    "###.##...X.......X.##.###",
    "###.##.............##.###",
    "###.########.########.###",
    "#.....###.......###.....#",
    "#.XX..###..X.X..###..X..#",
    "#....................EEE#",
    "#.....###.......###..EEE#",
    "#########################",
  ];

  // Fase 4: labirinto grande (41 × 29 tiles; a câmera segue o cachorro) com corredores de 1 tile, algumas salas, o salão central dos 3 veterinários e 3 portas de
  // bloco que ESMAGAM. As portas ficam em passagens com caminho alternativo, e o teste confere que todo o chão continua ligado com as portas em qualquer posição.
  const MAP_4 = [
    "#########################################",
    "#P..#.........#.................#.......#",
    "#...#.###.###.#.###.#####.#.###.#####.#.#",
    "#...#.....#...#...#.......#...#.....#.#.#",
    "#.###.#####.###.#######.#.###.##.##.#.#.#",
    "#...#.#.#...#.........#...#.#...#...#.#.#",
    "###.#.#.#.###.#..X..#.#.###.###.#.###.#.#",
    "#...#.#...#...#.......#.....#...#.#...#.#",
    "#.###.#.#.#.###.#####.#####.#.###.#.#.#.#",
    "#.....#.#.#.....#...#.....#.....#.#.#...#",
    "#######.#.###...#.#.#####.#####.#.#.#.#.#",
    "#.....#.#...#.....#...#.............#.#.#",
    "#.#####.#.#.#...#X.....X#####..X..###.#.#",
    "#.#.......#.#...#...V.......#.....#...#.#",
    "#.#.#..X..#.###.#..V.V..#.###.###.#.#.#.#",
    "#.#.......#.............#.......#...#...#",
    "#.###.#.#########X.....X#######.####.####",
    "#...#.#.#.......#...#.#.......#.........#",
    "#.###.#.#.#####.####..#.#####.#########.#",
    "#.....#.#.#...#.....#.#.#...#...#...#...#",
    "#.#####.#.#.#######.#.#.#.#.###.#.#.#.###",
    "#.......#.#.....#...#.........#...#.....#",
    "#####.#.#.#.#.#.#.#######..X..#.#.#.#.#.#",
    "#.....#.#.#.......#.....#.....#...#.#...#",
    "#.#####.#.#######.#.###.#.###.###.#.....#",
    "#.#.....#.......#...#...#.#...#...#.....#",
    "#.#.###########.#####.###.#.###.###..EEE#",
    "#...............#.........#.....#....EEE#",
    "#########################################",
  ];
  // Fase 5: outro labirinto de 41 × 29 tiles com 3 salas de "paredes que se movem" (uma parede de 3 tiles desliza a cada 10 s, abrindo a passagem em outro lugar
  // da sala) e 3 portas de bloco que esmagam. O teste confere que, com as 6 peças em qualquer posição (64 combinações), todo o chão fora dos trilhos continua ligado.
  const MAP_5 = [
    "#########################################",
    "#P......#.....#...#...#.................#",
    "#...###.#.#####.#.#.#.#.#####.#########.#",
    "#...#...#.....#.#...#.#.....#.#.....#...#",
    "#.###.###.#.#.#..####.#.###.#.#.###.#.###",
    "#.#...#...#.....#...#...#...#.#.#...#...#",
    "#.#.###.###.#######.#.###.###.#.#.#####.#",
    "#.#.#.............#.#.....#...........#.#",
    "#.#.#.#.......#.#.#.#####.#.###.......#.#",
    "#.#.#...........#.....#...#...........#.#",
    "#.#.###.......#.###.#.#.#.#####.......#.#",
    "#.#...#.......#...#.#...#.............#.#",
    "#.###.#####.#.#.#X.....X#.###########.#.#",
    "#...#.....#...#.#...V.............#...#.#",
    "#.#.#####.#####.#..V.V..###.#####.#.###.#",
    "#.#.#.....#...#.........#...#...#...#...#",
    "#.#.#.#####.#.#.#X.....X#.###.#.#.###.#.#",
    "#.#.........#.#.#.......#...#.#...#...#.#",
    "#.#.......###.###.#######.#.#.#.##..###.#",
    "#.#.......#.....#.#...#...#.#.....#...#.#",
    "#.#.......#####.#.#.#.###.#.#####.###.#.#",
    "#.#...........#.#...#...#.#...#...#...#.#",
    "#.###########.#.#######.#####.#####.###.#",
    "#.........#...#.........#.....#.....#...#",
    "#########.#.#..##########.#.###.#.#.....#",
    "#.........#...#...........#.#...#.......#",
    "#.###########.#.###.#########.###.#..EEE#",
    "#.............#...#...............#..EEE#",
    "#########################################",
  ];
  // Fase 6: labirinto 45 × 31 (gerado e conferido por script: todo o chão fica ligado em qualquer posição das peças móveis)
  const MAP_6 = [
    "#############################################",
    "#P..#...#...........#.........#.............#",
    "#...#.#.###.###.###.#.#.###.#.#####.#######.#",
    "#...#.....#.#.............#.#.....#.....#...#",
    "#.###.###.#.#.#.#.......#.#.#####.#####.#.###",
    "#.....#...#.#...#.........#.....#.#.....#.#.#",
    "#######.###.#.###.......###.###.#.#.####..#.#",
    "#.....#.#...#...............#...#.#.....#...#",
    "#.###.#.#.##.######.#######.#####.#.###.###.#",
    "#...#...#.#...#...#.#.#.....#.....#...#...#.#",
    "###.#.###.#.#.#.#.#.#.#.####..#######.###.#.#",
    "#...#.......#...#.....#.....#.....#.#...#...#",
    "#.###.......#.###.#.#######.#####.#.###.###.#",
    "#...........#......X.....X....#...#.#...#...#",
    "#.###.......#.#####...V...###.#.###.#.###.#.#",
    "#.#.........#.#......V.V....#.#.........#.#.#",
    "#.#.#####.#.#.#.###.......#.#.#.......#.#.###",
    "#.#...#.......#....X.....X#.#.#.........#...#",
    "#.#.#.#.###.##..###.#.#.#.#.#.#.......#####.#",
    "#.#.#.#.......#.#...#.#.#.#...#...........#.#",
    "#.###.#.#####.#.#.#####.#.#####.#.#.###.###.#",
    "#.............#.#.......#.......#.#.....#...#",
    "#####.......#.#.#################.#######.#.#",
    "#.............#.#...........#.....#.....#.#.#",
    "#.###.......###.#.#########.#####.#.#####.#.#",
    "#.#.........#...#...#.......#...#.#.#.....#.#",
    "###.###.#.#.#.#####.#.#######.#.#.#.#.#.....#",
    "#...#...#.#...#...#.#.#.......#.#...#.#.....#",
    "#.###.###.#####.#.#.#.#######.#.#####.#..EEE#",
    "#...............#...#.........#.......#..EEE#",
    "#############################################",
  ];
  // Fase 7: labirinto 49 × 33 (gerado e conferido por script: todo o chão fica ligado em qualquer posição das peças móveis)
  const MAP_7 = [
    "#################################################",
    "#P....#...............#...........#...#.....#...#",
    "#...#.#.#####.#.#####.###.#######.#.#.#.###.#.#.#",
    "#.....#.#...#.#.....#...........#.#.....#.#.#.#.#",
    "#.#######.#.###.###.#.......###.#.#.#####.#.#.#.#",
    "#.#.......#...#.....#.........#.#.#.#.....#...#.#",
    "#.#.##.######.###.###.......#.#.#.#.###.#######.#",
    "#.#...#...........#.#.........#...#.....#.....#.#",
    "#.###.#.......#####.#.###.####..#######.#.###.#.#",
    "#...#...............#...#.....#.......#.#.#.#...#",
    "###.#.#.......###.#..##.#.###.#####.#.###.#.###.#",
    "#...#.........#.....#...#...#.#...........#.#...#",
    "#.###.#######.#.###.#.#####.#.#.###########.#.###",
    "#.#.......#...#.#...#...#...#.#.#.....#.....#.#.#",
    "#.#.###.#.#.###.#######.#####.#.#.#.###.###.#.#.#",
    "#...#...#.#...#......X.....X....#.#.....#.#...#.#",
    "#.#.#.##..###.#####.#...V...###.#.#######.#####.#",
    "#.#.....#.........#.#..V.V......#.....#.......#.#",
    "#.#.###.###.....#.#.#.......###.#.#.#.#.....#.#.#",
    "#.#...#.#.......#...#XV....X..#.#.#.#.......#.#.#",
    "#.###.#.#.#.....#.#.#######.#.###.#.###.....#.#.#",
    "#...#.#.#.#.......#.#.......#.#...#.............#",
    "#.#.#.#.#.#.....#.#.#.#######.#.#######.....###.#",
    "#.#.#.#...#.....#.#.#...#.....#.#.............#.#",
    "#.#.#.###.#####.#.#####.#.#####.#########.###.###",
    "#.#.#...........#.#.....#...#...#.......#.#.#...#",
    "#.#.#####.#######.#.#######.#.###.#####.#.#.###.#",
    "#.#.....#...#.......#.#.....#.........#.#.....#.#",
    "#.#.###.###.#.#######.#.###########.#.#..##.....#",
    "#.#...#.....#.........#.#...........#...#.......#",
    "#.###.###############.#.#.###.#.#.#.#####.#..EEE#",
    "#...#.................#.........#.........#..EEE#",
    "#################################################"
  ];
  // Fase 8: labirinto 53 × 35 (gerado e conferido por script: todo o chão fica ligado em qualquer posição das peças móveis)
  const MAP_8 = [
    "#####################################################",
    "#P....#...#.........#...#.............#.......#.....#",
    "#...#.#.#.#.#######.#.###.###.###.###.#.###.#.###.#.#",
    "#.....#.#...#...#...#.#.....#.......#.#.#.......#.#.#",
    "#.###.#.#.###.#.#.###.#.....####.####.#.#.#####.#.#.#",
    "#.#...#.......#.#...#...........#.....#.#.#...#.#.#.#",
    "#.#.###########.###.###.....###.#.#####.#.###.#.#.###",
    "#.#.#...#.......#.#.........#...#.........#...#.#...#",
    "#.#.#.#.#.#######.#####.....#.###.#.......#.###..##.#",
    "#.#...#.#...#...............#...#.........#.....#...#",
    "#.#####.###.#####.#####.###.###.###.......###.###.#.#",
    "#.....#.....#...#.....#.....#.#.............#.#...#.#",
    "###.###.....#.#.#.###.#####.#.#####.#.#####.#.#.###.#",
    "#...#.........#.#.#.#.....#...#.....#.....#.#.#...#.#",
    "#.###.#.....###.#.#.#####.#.###.#.#.###.###.#.###.#.#",
    "#...#...........#.....#X.....X..#...#...#...#.#...#.#",
    "###.###.....###########...V...###########.###.#.#.#.#",
    "#.....#...........#...#..V.V..................#...#.#",
    "#.#######.#.#####.#.#.#.......#########.......#.#.#.#",
    "#.....#...#.....#...#.#XV...VX....#...#.......#.#...#",
    "#.###.#.#######.#####.#.#####.###.###.#.......#.###.#",
    "#...#...#...#...#...........#.........#.........#...#",
    "###.#####.#.###.#.#######.###.#.#######.#.###.##..###",
    "#...#.....#.....#.#.......#...#...#.....#.....#.#...#",
    "#.#.#.#.###.....#.###.#####.#.#####.#####.#####.###.#",
    "#...#.#...#.....#...#.......#.#...#.#...........#.#.#",
    "#.####.##.#.....###.#######.###.#.#.###########.#.#.#",
    "#.#...............#.#.......#.....#.........#.....#.#",
    "#.#.#.#.###.....#.#.#.#####.#.#.#.#########.#######.#",
    "#.#.#.#.........#.#.#...#.#.#.#.#.........#.......#.#",
    "#.###.###########.#.#.#.#.#.#.#.#####.#########.....#",
    "#...#.......#...#...#.#.#...#.....#...#.............#",
    "###.###.###.#.###.#.#.#.####.####.#.###.#######..EEE#",
    "#...........#.......#.#...........#...........#..EEE#",
    "#####################################################"
  ];
  // Fase 9: labirinto 57 × 37 (gerado e conferido por script: todo o chão fica ligado em qualquer posição das peças móveis)
  const MAP_9 = [
    "#########################################################",
    "#P..............#.......#.....#...............#.........#",
    "#...#####.#####.###.#####.###.#.#########.###.#####.###.#",
    "#...#...#.....#...#...#...#.....#.........#.......#.#...#",
    "#.#.###.#####.###..##.#.###.....#.#.#.#####.#####.###.###",
    "#.#.......#...#...#...#.#.......#.#.#.#.....#...#...#...#",
    "#.#######.#.###.###.###.#.#.....###.#.#######.#.###.#.#.#",
    "#.......#.#...#.#...#...#.......#...#.............#.#...#",
    "#######.#.###.#.###.#.##.##.....#.###.###.......#.#.###.#",
    "#.....#.#.#...#...#...................#...........#.#...#",
    "###.###.#.#.#####.###.###.#.#########.#.#.......###.#.###",
    "#...#...#.#.........#...#.#.........#.#.#...........#...#",
    "#.###.###.#.......#.###.#.#########.#.#.#.#######.#####.#",
    "#.#...#...#.......#...#.#.....#.......#.....#...#.......#",
    "#.#.#######.......###.#.###.#.#.#.#####.#.#.#.#.#######.#",
    "#.#.......#...........#.......#.#.#.....#.#.#.#...#.....#",
    "#.###.###.#.###.###############.#.#.###.#.#.###.#.#.#.#.#",
    "#...#...#...#.#.#........XV...VX..#.#.#.#.#.#...#.#.#...#",
    "#.#.###.#####.#.#.###.###...V...##..#.#.###.#.#.#.#.#####",
    "#.#.......#.....#...#......V.V....#...#.....#.#...#.#...#",
    "#.####.####.#######.#####.......#.#.#.#######.###.#.###.#",
    "#.#...#.....#............X.....X#...#.............#.#...#",
    "#.#.#.#.#########.#####.###.#.#.#####.#.#.......###.#.###",
    "#.#.#...#.......#.#.......#.#.#.#.....#.#.......#...#...#",
    "#.#.#####.#.###.#.#.#####.#.#.#.#.#####.#.......#.###.#.#",
    "#.#.#.............#.#...#.....#.#...#...#.......#.#...#.#",
    "#.#.#.#.#.###.....#.#.#.#######.###.#.#######.#.#.###.#.#",
    "#.#.#.#.#...#.....#...#...........#.#.#.........#...#.#.#",
    "#.#.#.#.###.#.....####.##.#.....#.#.#.#############.#.#.#",
    "#.#.#.....#.#.....#.....#.........#.#.....#.........#.#.#",
    "#.#.##.##.#.#.....#.#.#.#.#.....###.#####.#.#######.###.#",
    "#.#...#...#.#.........#.#...........#.....#...#.......#.#",
    "#.###.#####.###.#######.###.....#####.#.#####.#.###.....#",
    "#.#...#...#.....#.....#...#.......#...#.#...#...#.......#",
    "#.#.###.#.###.#.#.###.###.###.###.#.#####.#.#####.#..EEE#",
    "#.......#.................#.......#.......#..........EEE#",
    "#########################################################"
  ];
  // Fase 10: labirinto 61 × 39 (gerado e conferido por script: todo o chão fica ligado em qualquer posição das peças móveis)
  const MAP_10 = [
    "#############################################################",
    "#P....#...........#.....#.........#...................#.....#",
    "#...#.###.#######.#.###.#.#######.#.#########.#.#####.#.###.#",
    "#.......#...#.....#.#...#.#...#...#.#...............#...#...#",
    "#######.#.#.#.#####.#.#.#.###.#.###.#.#####.......#.#####.###",
    "#.......#.#.#.....#.#.#.#.....#...#.#.....#.......#.#...#...#",
    "#.###.#####.###.#.#.#.#.#####.###.#.#####.#.......#.#.#.#####",
    "#...........#...#.#.#.#.....#.#.#...#.....#.......#...#.....#",
    "#############.###.#.#.#.#####.#.#####.#.##.################.#",
    "#.........#.........#.#.#.......#...#...#.....#...........#.#",
    "#.#.#####.#.#.......#.###.#.#.#.#.#.#.#.#.#.#.#.###.#######.#",
    "#.#.........#.........#...#...#.#.#.#.....#.#...#...#.....#.#",
    "#.#####.#####.......#.#.#.#.###.#.#..####.#.#####.#.#.###.#.#",
    "#.....#.#.................#.....#.#.#...#...#.......#.#.#...#",
    "#.#.#.#.#.#.###.#.###.###.#######.#.#.#.#.###.#.....#.#.###.#",
    "#.#.#.#...#...#.#.......#...#.....#...#.#.#...#.....#.#...#.#",
    "#.#.###.#.#.###.#.#########.#.###.#####.###.###.....#.#.###.#",
    "#.#.....#.#...#.#..........XV...VX#...#.....#.........#.....#",
    "#.#######.###.#.###########...V...###.#####.#.#.....###.#####",
    "#...#.......#...#...#........V.V....#.....#...#.....#...#...#",
    "###.#######.#####.#.###.###.......#.#####.#.###.###.#.###.#.#",
    "#.........#.......#.#......X..V..X#...#...#.#...#...#...#.#.#",
    "#.###.###..########.#.#######.###.###.#.###.#.###.#####.#.#.#",
    "#.#...#...#.#.....#...#...#.....#.......#...#...#.....#...#.#",
    "#.#.#.###.#.#.#.#########.#.###.#######.#.#####.###.#.#####.#",
    "#...#...#.#...#...........#...#.......#...#.....#...#.......#",
    "#.#####.#.#############.#.###.#######.#.###.#.###.#.#####.###",
    "#.#.......#...........#.#...#.......#.#...#.#.#...#.#.....#.#",
    "#.#.#.....#.#.#.......#.#####.###.#.#.###.#.#.#.####..#####.#",
    "#...#.....#.#.#.......#...........#...#.......#.....#.#.....#",
    "#####.....#.#.#.......#.###########.###.......#####.#.#.###.#",
    "#.........#.#.........#.#...#.......#.............#...#...#.#",
    "#.#.#.....#.#######.###.#.#.#.###.#.#.#.......###.#.###.#.#.#",
    "#.#.......#...#...#.....#.#.#...#.#.#...........#.#.#...#.#.#",
    "#.###.#.##.##.#.#.###.##..#.###.#.#.#.#.###.#####.#.###.....#",
    "#...#.#.#.....#.#...#...#.......#.#...#.#.#.......#.........#",
    "###.#.#.#.#####.###.###.#.###.#.#.#####.#.#############..EEE#",
    "#...#.....#.......#.......#.....#.......#................EEE#",
    "#############################################################"
  ];

  const LEVELS = [
    // rations = quantas rações há na fase; bones = quantos ossos (150 pontos cada; nas Fases 1 a 3 é preciso pegar todos para sair);
    // extraLives = [mín, máx] de itens (rações ou ossos) que escondem uma vida extra, sorteado a cada jogo;
    // bonusStep = pontos por degrau de 10 s do bônus de tempo (de 0 a 10 × bonusStep);
    // blocks = blocos que deslizam de `from` a `to` (tiles na mesma linha ou coluna); `phase` = segundos já decorridos do ciclo ao começar.
    // dogSpeed = fração da velocidade do cachorrinho (1 = 252 px/s; a Fase 3 usa 0,9 = 226,8 px/s, as Fases 4 e 5 usam 0,945 = 238,14 px/s e as Fases 6 a 10 sobem de 0,96 a 1)
    // alertTiles = a que distância (em quadrados) o veterinário liga o "!"; blockEvery = segundos entre uma mudança de lado dos blocos e a próxima
    // lifePenalty = pontos perdidos por vida perdida (padrão 50); minPoints = pontos mínimos na fase para passar (padrão 0); bonePower = segundos do poder do osso (0 = sem poder);
    // crush = os blocos esmagam o cachorro (sem o poder do osso); note = frase curta na escolha de fase
    { id: 1, title: "Fase 1", map: MAP_1, vets: [BASE_VET], rations: 5, bones: 0, extraLives: [1, 1], bonusStep: 10, dogSpeed: 1, alertTiles: alertTilesFor(1), blocks: [] },
    { id: 2, title: "Fase 2", map: MAP_2, vets: [PHASE2_VET, PHASE2_VET], rations: 7, bones: 2, extraLives: [1, 2], bonusStep: 10, dogSpeed: 1, alertTiles: alertTilesFor(2), bonePower: 30, note: "ossos que dão poder", blocks: [] },
    {
      id: 3, title: "Fase 3", map: MAP_3, vets: [PHASE3_VET, PHASE3_VET], rations: 7, bones: 2, extraLives: [1, 2], bonusStep: 20, dogSpeed: 0.9, alertTiles: alertTilesFor(3), blockEvery: BLOCK_EVERY, bonePower: 30, blockRange: { door: [1, 2] }, note: "ossos, poder e blocos móveis",
      touchEase: { vet: 0.9, dog: 1.05 }, // jogando com o controle de toque (menos preciso), a Fase 3 fica um pouco mais fácil: veterinários 10% mais lentos e cachorrinho 5% mais rápido
      blocks: [
        { from: [7, 3], to: [7, 2], phase: 0 },   // porta 1: começa fechada (no corredor) e na primeira mudança se recolhe ao nicho de cima
        { from: [17, 4], to: [17, 3], phase: 0 }, // porta 2: começa aberta (no nicho de baixo) e na primeira mudança fecha o corredor
      ],
    },
    {
      id: 4, title: "Fase 4", map: MAP_4, vets: [PHASE4_VET, PHASE4_VET, PHASE4_VET], rations: 15, bones: 2, extraLives: [3, 3], bonusStep: 20, dogSpeed: 0.945,
      alertTiles: alertTilesFor(4), lifePenalty: 200, minPoints: 800, bonePower: 30, crush: true, blockEvery: BLOCK_EVERY, blockRange: { door: [1, 3] },
      note: "labirinto grande, poder dos ossos e blocos que esmagam",
      blocks: [
        { from: [32, 4], to: [32, 3], phase: 0 },   // porta 1: começa aberta (bloco no nicho de baixo) e depois fecha a passagem
        { from: [21, 18], to: [20, 18], phase: 1 }, // porta 2: começa fechada e depois se recolhe ao nicho da esquerda
        { from: [36, 16], to: [36, 17], phase: 2 }, // porta 3: começa aberta (nicho de cima) e depois fecha
      ],
    },
    {
      id: 5, title: "Fase 5", map: MAP_5, vets: [PHASE4_VET, PHASE4_VET, PHASE4_VET], rations: 20, bones: 2, extraLives: [4, 4], bonusStep: 20, dogSpeed: 0.945,
      alertTiles: alertTilesFor(5), lifePenalty: 200, minPoints: 1000, bonePower: 35, crush: true, blockEvery: BLOCK_EVERY, blockRange: { door: [1, 3], wall: [1, 3] },
      note: "paredes que se movem, poder do osso de 35 s e 1000 pontos",
      blocks: [
        { from: [34, 7], to: [34, 9], size: [1, 3], wall: true, every: 10, phase: 0 }, // parede 1: desliza a cada 10 s
        { from: [10, 7], to: [10, 9], size: [1, 3], wall: true, every: 10, phase: 3 }, // parede 2: desliza a cada 10 s
        { from: [6, 17], to: [6, 19], size: [1, 3], wall: true, every: 10, phase: 6 }, // parede 3: desliza a cada 10 s
        { from: [34, 18], to: [35, 18], phase: 0 },                        // porta 1 (bloco de 3 s)
        { from: [14, 24], to: [13, 24], phase: 1 },                        // porta 2 (bloco de 3 s)
        { from: [16, 4], to: [15, 4], phase: 2 },                        // porta 3 (bloco de 3 s)
      ],
    },
    {
      id: 6, title: "Fase 6", map: MAP_6, vets: [PHASE6_VET, PHASE6_VET, PHASE6_VET], rations: 24, bones: 3, extraLives: [3, 4], bonusStep: 20, dogSpeed: 0.96,
      alertTiles: 11, lifePenalty: 250, minPoints: 1250, bonePower: 35, crush: true, blockEvery: 3, blockRange: { door: [2, 4], wall: [2, 4] },
      note: "labirinto maior, mais ossos e mais peças móveis",
      blocks: [
        { from: [8, 11], to: [8, 13], size: [1, 3], wall: true, every: 10, phase: 0 }, // parede 1
        { from: [34, 15], to: [34, 17], size: [1, 3], wall: true, every: 10, phase: 3 }, // parede 2
        { from: [8, 21], to: [8, 23], size: [1, 3], wall: true, every: 10, phase: 6 }, // parede 3
        { from: [20, 3], to: [20, 5], size: [1, 3], wall: true, every: 10, phase: 9 }, // parede 4
        { from: [12, 8], to: [12, 9], phase: 0 }, // porta 1
        { from: [15, 18], to: [14, 18], phase: 1 }, // porta 2
        { from: [28, 10], to: [29, 10], phase: 2 }, // porta 3
        { from: [41, 6], to: [40, 6], phase: 0 }, // porta 4
      ],
    },
    {
      id: 7, title: "Fase 7", map: MAP_7, vets: [PHASE7_VET, PHASE7_VET, PHASE7_VET, PHASE7_VET], rations: 28, bones: 3, extraLives: [3, 4], bonusStep: 20, dogSpeed: 0.97,
      alertTiles: 12, lifePenalty: 250, minPoints: 1400, bonePower: 35, crush: true, blockEvery: 3, blockRange: { door: [3, 5], wall: [2, 4] },
      note: "labirinto maior, mais rações e mais portas de bloco",
      blocks: [
        { from: [24, 3], to: [24, 5], size: [1, 3], wall: true, every: 10, phase: 0 }, // parede 1
        { from: [39, 20], to: [41, 20], size: [3, 1], wall: true, every: 10, phase: 3 }, // parede 2
        { from: [11, 20], to: [13, 20], size: [3, 1], wall: true, every: 10, phase: 6 }, // parede 3
        { from: [10, 7], to: [10, 9], size: [1, 3], wall: true, every: 10, phase: 9 }, // parede 4
        { from: [30, 8], to: [31, 8], phase: 0 }, // porta 1
        { from: [6, 5], to: [6, 6], phase: 1 }, // porta 2
        { from: [40, 28], to: [39, 28], phase: 2 }, // porta 3
        { from: [19, 10], to: [20, 10], phase: 0 }, // porta 4
        { from: [8, 16], to: [9, 16], phase: 1 }, // porta 5
      ],
    },
    {
      id: 8, title: "Fase 8", map: MAP_8, vets: [PHASE8_VET, PHASE8_VET, PHASE8_VET, PHASE8_VET, PHASE8_VET], rations: 32, bones: 4, extraLives: [3, 4], bonusStep: 20, dogSpeed: 0.98,
      alertTiles: 13, lifePenalty: 250, minPoints: 1650, bonePower: 35, crush: true, blockEvery: 3, blockRange: { door: [3, 5], wall: [3, 5] },
      note: "labirinto enorme, 4 ossos e muitas paredes que se movem",
      blocks: [
        { from: [42, 17], to: [42, 19], size: [1, 3], wall: true, every: 10, phase: 0 }, // parede 1
        { from: [7, 14], to: [9, 14], size: [3, 1], wall: true, every: 10, phase: 3 }, // parede 2
        { from: [23, 6], to: [25, 6], size: [3, 1], wall: true, every: 10, phase: 6 }, // parede 3
        { from: [11, 26], to: [13, 26], size: [3, 1], wall: true, every: 10, phase: 9 }, // parede 4
        { from: [38, 7], to: [38, 9], size: [1, 3], wall: true, every: 10, phase: 12 }, // parede 5
        { from: [28, 32], to: [28, 33], phase: 0 }, // porta 1
        { from: [47, 8], to: [48, 8], phase: 1 }, // porta 2
        { from: [32, 4], to: [32, 3], phase: 2 }, // porta 3
        { from: [49, 22], to: [48, 22], phase: 0 }, // porta 4
        { from: [6, 26], to: [6, 27], phase: 1 }, // porta 5
      ],
    },
    {
      id: 9, title: "Fase 9", map: MAP_9, vets: [PHASE9_VET, PHASE9_VET, PHASE9_VET, PHASE9_VET, PHASE9_VET], rations: 36, bones: 4, extraLives: [3, 4], bonusStep: 20, dogSpeed: 0.99,
      alertTiles: 14, lifePenalty: 300, minPoints: 1800, bonePower: 35, crush: true, respawnInPlace: true, blockEvery: 2.5, blockRange: { door: [4, 6], wall: [4, 6] },
      note: "blocos e paredes mais rápidos; o cachorrinho renasce onde morreu",
      blocks: [
        { from: [44, 7], to: [44, 9], size: [1, 3], wall: true, every: 8, speed: 140, phase: 0 }, // parede 1
        { from: [14, 11], to: [14, 13], size: [1, 3], wall: true, every: 8, speed: 140, phase: 3 }, // parede 2
        { from: [44, 21], to: [44, 23], size: [1, 3], wall: true, every: 8, speed: 140, phase: 6 }, // parede 3
        { from: [13, 28], to: [15, 28], size: [3, 1], wall: true, every: 8, speed: 140, phase: 9 }, // parede 4
        { from: [27, 6], to: [29, 6], size: [3, 1], wall: true, every: 8, speed: 140, phase: 12 }, // parede 5
        { from: [27, 30], to: [29, 30], size: [3, 1], wall: true, every: 8, speed: 140, phase: 15 }, // parede 6
        { from: [6, 20], to: [6, 19], every: 2.5, speed: 160, phase: 0 }, // porta 1
        { from: [35, 18], to: [34, 18], every: 2.5, speed: 160, phase: 1 }, // porta 2
        { from: [22, 28], to: [22, 29], every: 2.5, speed: 160, phase: 2 }, // porta 3
        { from: [17, 4], to: [18, 4], every: 2.5, speed: 160, phase: 0 }, // porta 4
        { from: [6, 30], to: [6, 29], every: 2.5, speed: 160, phase: 1 }, // porta 5
        { from: [24, 9], to: [24, 8], every: 2.5, speed: 160, phase: 2 }, // porta 6
      ],
    },
    {
      id: 10, title: "Fase 10", map: MAP_10, vets: [PHASE10_VET, PHASE10_VET, PHASE10_VET, PHASE10_VET, PHASE10_VET, PHASE10_VET], rations: 40, bones: 5, extraLives: [3, 4], bonusStep: 20, dogSpeed: 1.0,
      alertTiles: 15, lifePenalty: 300, minPoints: 2050, bonePower: 35, crush: true, respawnInPlace: true, blockEvery: 2, blockRange: { door: [5, 6], wall: [5, 6] },
      note: "a última fase: o maior labirinto, 6 veterinários e blocos muito rápidos; renasce onde morreu",
      blocks: [
        { from: [47, 16], to: [49, 16], size: [3, 1], wall: true, every: 6, speed: 160, phase: 0 }, // parede 1
        { from: [18, 27], to: [18, 29], size: [1, 3], wall: true, every: 6, speed: 160, phase: 3 }, // parede 2
        { from: [16, 9], to: [16, 11], size: [1, 3], wall: true, every: 6, speed: 160, phase: 6 }, // parede 3
        { from: [42, 29], to: [42, 31], size: [1, 3], wall: true, every: 6, speed: 160, phase: 9 }, // parede 4
        { from: [46, 3], to: [46, 5], size: [1, 3], wall: true, every: 6, speed: 160, phase: 0 }, // parede 5
        { from: [5, 30], to: [7, 30], size: [3, 1], wall: true, every: 6, speed: 160, phase: 3 }, // parede 6
        { from: [52, 28], to: [53, 28], every: 2, speed: 200, phase: 0 }, // porta 1
        { from: [42, 9], to: [42, 8], every: 2, speed: 200, phase: 1 }, // porta 2
        { from: [24, 34], to: [25, 34], every: 2, speed: 200, phase: 2 }, // porta 3
        { from: [10, 35], to: [10, 34], every: 2, speed: 200, phase: 0 }, // porta 4
        { from: [10, 22], to: [9, 22], every: 2, speed: 200, phase: 1 }, // porta 5
        { from: [35, 12], to: [36, 12], every: 2, speed: 200, phase: 2 }, // porta 6
      ],
    },
  ];
  const LEVEL_IDS = LEVELS.map((l) => l.id);

  // Posição de um bloco que se move: 0 = em `from`, 1 = em `to`. `bt` = segundos de relógio do bloco. Ele fica parado em `from` até `every` s;
  // a partir daí muda de lado a cada `every` s (começa a deslizar em every, 2·every, 3·every...) e leva `slide` s para chegar.
  function blockFraction(d, bt) {
    if (bt < d.every) return 0;
    const u = (bt - d.every) % d.period;      // 0 = começa a ir para `to`; a cada `every` s ele muda de sentido
    if (u < d.slide) return u / d.slide;
    if (u < d.every) return 1;
    if (u < d.every + d.slide) return 1 - (u - d.every) / d.slide;
    return 0;
  }
  // Mantém o relógio pequeno: a partir de `every` o movimento se repete a cada `period` s.
  const normBt = (d, bt) => (bt < 3 * d.every ? bt : d.every + ((bt - d.every) % d.period));
  // Quanto falta (0 a 1) para a próxima mudança de lado, só nos últimos `warn` s (0,6 s; 2 s nas paredes de 10 s): 1 = vai começar agora. 0 = sem aviso.
  const blockWarn = (d, bt) => { const left = d.every - (bt % d.every); return left <= d.warn ? 1 - left / d.warn : 0; };
  const blockRectAt = (d, bt) => { const f = blockFraction(d, bt); return { x: d.ax + (d.bx - d.ax) * f, y: d.ay + (d.by - d.ay) * f, w: d.w, h: d.h, kind: d.kind }; };

  // Converte um mapa em dados prontos para jogar (e para conferir jogos salvos), sem mexer no estado atual.
  function buildLevel(def) {
    const { map } = def;
    const rows = map.length, cols = rows ? map[0].length : 0;
    if (rows < 8 || rows > 64 || cols < 8 || cols > 100 || map.some((r) => r.length !== cols)) throw new Error(`Mapa inválido: ${def.title}`);
    const solids = [], exitTiles = [], vetSpawns = [];
    let spawnTile = null;
    const walk = map.map((row) => [...row].map((ch) => ch !== "#" && ch !== "X"));
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = map[r][c];
      if (ch === "#" || ch === "X") solids.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE, kind: ch });
      else if (ch === "E") exitTiles.push([c, r]);
      else if (ch === "P") spawnTile = [c, r];
      else if (ch === "V") vetSpawns.push([c, r]);
    }
    if (!spawnTile || !exitTiles.length || vetSpawns.length !== def.vets.length) throw new Error(`Mapa incompleto: ${def.title}`);
    const [lifeMin, lifeMax] = def.extraLives, bones = def.bones || 0, bonusStep = def.bonusStep || 10, dogSpeed = def.dogSpeed ?? 1;
    if (!(dogSpeed >= 0.3 && dogSpeed <= 1.5)) throw new Error(`Velocidade do cachorro inválida: ${def.title}`);
    const lifePenalty = def.lifePenalty ?? Records.LIFE_PENALTY, minPoints = def.minPoints ?? 0, bonePower = def.bonePower ?? 0, crush = !!def.crush;
    if (!Number.isInteger(lifePenalty) || lifePenalty < 0 || lifePenalty > 1000 || !Number.isInteger(minPoints) || minPoints < 0 || minPoints > 100000 || !(bonePower >= 0 && bonePower <= 120)) {
      throw new Error(`Regras de pontos ou poder inválidas: ${def.title}`);
    }
    const alertTiles = def.alertTiles;
    if (!Number.isInteger(alertTiles) || alertTiles < 1 || alertTiles > 20) throw new Error(`Alcance do "!" inválido: ${def.title}`);
    if (!Number.isInteger(def.rations) || def.rations < 1 || !Number.isInteger(bones) || bones < 0 || !Number.isInteger(lifeMin) || !Number.isInteger(lifeMax) ||
        lifeMin < 0 || lifeMax < lifeMin || lifeMax > def.rations + bones || !Number.isInteger(bonusStep) || bonusStep < 1) {
      throw new Error(`Itens inválidos: ${def.title}`);
    }
    // blocos (e paredes) que se movem: um retângulo de `size` = [largura, altura] tiles (padrão 1 × 1) que desliza em linha reta de `from` a `to`
    // (canto de cima à esquerda, em tiles); todo o trilho (tudo o que ele cobre no caminho) é chão livre. `wall: true` desenha como parede.
    // `every` (padrão: `blockEvery` da fase) = segundos entre uma mudança de lado e a próxima; `speed` = px/s ao deslizar.
    const blockDefs = (def.blocks || []).map((b) => {
      const [ac, ar] = b.from, [bc, br] = b.to, [bw, bh] = b.size || [1, 1];
      if (![ac, ar, bc, br, bw, bh].every(Number.isInteger) || bw < 1 || bh < 1 || bw > 4 || bh > 4 || (ac !== bc && ar !== br) || (ac === bc && ar === br) || !(b.phase >= 0)) throw new Error(`Bloco inválido: ${def.title}`);
      const track = [];
      for (let c = Math.min(ac, bc); c <= Math.max(ac, bc) + bw - 1; c++) for (let r = Math.min(ar, br); r <= Math.max(ar, br) + bh - 1; r++) {
        if (c < 0 || r < 0 || c >= cols || r >= rows || map[r][c] !== ".") throw new Error(`Trilho de bloco inválido: ${def.title}`);
        track.push([c, r]);
      }
      const speed = b.speed ?? BLOCK_SPEED, slide = (Math.abs(ac - bc) + Math.abs(ar - br)) * TILE / speed, every = b.every ?? def.blockEvery ?? BLOCK_EVERY;
      if (!(speed >= 30 && speed <= 600) || !(every >= slide + 0.5 && every <= 60)) throw new Error(`Intervalo dos blocos inválido: ${def.title}`);
      return { group: b.wall ? "wall" : "door", ax: ac * TILE, ay: ar * TILE, bx: bc * TILE, by: br * TILE, w: bw * TILE, h: bh * TILE, kind: b.wall ? "W" : "M", slide, every, warn: Math.max(BLOCK_WARN, Math.min(2, every * 0.2)), period: 2 * every, phase: b.phase, track };
    });
    if (blockDefs.length > 12) throw new Error(`Blocos demais: ${def.title}`);
    // quantas peças móveis de cada tipo ("door" = blocos 1 × 1, "wall" = paredes) entram em cada jogo: sorteado entre mínimo e máximo (padrão: todas)
    const blockRange = {};
    for (const g of ["door", "wall"]) {
      const n = blockDefs.filter((d) => d.group === g).length, [mn, mx] = (def.blockRange && def.blockRange[g]) || [n, n];
      if (!Number.isInteger(mn) || !Number.isInteger(mx) || mn < Math.min(1, n) || mx < mn || mx > n) throw new Error(`Quantidade de blocos inválida: ${def.title}`);
      blockRange[g] = [mn, mx];
    }
    const te = def.touchEase; // facilitação opcional para quem joga com o controle de toque: fatores sobre a velocidade dos veterinários e do cachorro
    if (te && !(te.vet > 0.5 && te.vet <= 1 && te.dog >= 1 && te.dog <= 1.25)) throw new Error(`Facilitação do toque inválida: ${def.title}`);
    const touchEase = te ? { vet: te.vet, dog: te.dog } : null;
    const trackTiles = [...new Map(blockDefs.flatMap((d) => d.track).map((t) => [t + "", t])).values()];
    const cs = exitTiles.map((t) => t[0]), rs = exitTiles.map((t) => t[1]);
    const x1 = Math.min(...cs), x2 = Math.max(...cs), y1 = Math.min(...rs), y2 = Math.max(...rs);
    return {
      id: def.id, title: def.title, cols, rows, worldW: cols * TILE, worldH: rows * TILE, solids, walk, spawnTile, vetSpawns, exitTiles, vetCfgs: def.vets.map((c) => ({ ...c, alertTiles, sight: alertTiles * TILE })), alertTiles, rations: def.rations, bones, lifeMin, lifeMax, bonusStep, dogSpeed,
      lifePenalty, minPoints, bonePower, crush, touchEase, respawnInPlace: !!def.respawnInPlace, note: def.note || "",
      blockDefs, blockRange, trackTiles,
      spawn: { x: spawnTile[0] * TILE + 4, y: spawnTile[1] * TILE + 4 },
      exitRect: { x: x1 * TILE, y: y1 * TILE, w: (x2 - x1 + 1) * TILE, h: (y2 - y1 + 1) * TILE },
    };
  }
  const BUILT = Object.create(null);
  for (const def of LEVELS) BUILT[def.id] = buildLevel(def);

  const $ = (id) => document.getElementById(id);
  const canvas = $("game");
  const ctx = canvas.getContext("2d");
  const fmt = Records.formatTime;
  const calm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  function safeStorage() { try { return window.localStorage; } catch { return null; } }
  const store = Records.createStore(safeStorage());
  const board = Board.create({ store, levels: LEVEL_IDS, config: window.GAME_CONFIG || {} });

  const keys = {};
  const touch = { left: false, right: false, up: false, down: false };
  let touchInput = false; // a última direção veio do controle de toque (e não do teclado nem do controle)
  const assist = () => !!(lv.touchEase && touchInput); // a fase tem facilitação para o toque e a pessoa está jogando com ele
  let state = "menu"; // menu | playing | paused | won | lost
  let levelId = LEVELS[0].id, lv = BUILT[levelId];
  let solids, items, vets, exitRect, player, spawn, walk;
  let collected, bonesGot, score, time, lives, livesLost, retries, invuln, hintTimer; // collected = rações pegas; bonesGot = ossos pegos
  let power = 0;               // segundos que faltam do poder do osso (os veterinários viram carteiros e o cachorro ganha deles); 0 = sem poder
  const START_HINT = "O tempo só começa quando você se mexer.";
  let started = false;         // só vira true quando o jogador dá o primeiro passo na fase: antes disso o relógio, os veterinários e os blocos ficam parados
  let startHint = false;       // o aviso "mova-se para começar" está na tela
  let autoStart = false;       // gancho dos testes: a fase começa a contar na hora (como antes da 0.7.0)
  let pickupToastUntil = 0;    // até quando o aviso de um osso/vida (poder, vida extra) está na tela: o aviso da meta espera por ele
  let goalReached = false;     // (fases com pontos mínimos) já avisou que a meta foi atingida e a saída abriu
  let postmen = 0;             // carteiros que o cachorro já atingiu nesta fase (cada um vale 100 pontos)
  let crushed = false;         // um bloco acabou de alcançar o cachorro (nas fases em que ele esmaga): perde uma vida no fim do quadro
  let puffs = [];              // carteiros derrotados: nuvenzinhas que só enfeitam
  let blocks = [];             // blocos que se movem na fase atual: { d: definição, bt: relógio do ciclo, rect: posição (também em `solids`) }
  const dynBlocked = new Set(); // tiles ocupados agora pelos blocos que se movem (chave: linha * COLS + coluna): os veterinários os contornam
  let gameIsAccount = false; // a partida começou com uma conta: se ela for apagada em outra aba, nada mais é gravado em nome dela
  let gamePlayer = ""; // quem começou a partida em andamento (outra aba pode trocar o jogador atual: o jogo salvo e a pontuação seguem com quem jogou)
  let carriedLives = START_LIVES; // vidas com que a fase terminou (passam para a próxima)
  let rand = Math.random;
  let freezeVets = false; // usado apenas em testes
  let noCatch = false;    // usado apenas em testes
  const view = { k: 1, zoom: 1, camX: 0, camY: 0 };

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const tileOf = (cx, cy) => [Math.floor(cx / TILE), Math.floor(cy / TILE)];
  const centerOf = (c, r) => [c * TILE + TILE / 2, r * TILE + TILE / 2];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Sorteia onde ficam `count` rações: só em chão alcançável, longe do início do cachorro, dos veterinários e da saída,
  // e espalhadas pelo mapa (a distância mínima entre elas diminui só se for preciso).
  // `avoid`: tiles que já têm uma ração (as já pegas ficam no mapa até a fase acabar) e não podem receber outra.
  function placeItems(spawnTile, vetTiles, exitTiles, count, avoid = []) {
    const g = bfs(spawnTile, true), key = (c, r) => r * COLS + c; // alcance sem contar os blocos: eles se movem
    const exitKeys = new Set([...exitTiles, ...avoid].map(([c, r]) => key(c, r)));
    const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const cand = shuffle(g.q.filter((t) => !exitKeys.has(key(...t)) && g.dist.get(key(...t)) >= 4 && vetTiles.every((v) => apart(t, v) >= 4)));
    for (const gap of [6, 5, 4, 3, 2, 0]) {
      const picked = [];
      for (const t of cand) {
        if (picked.every((p) => apart(p, t) >= gap)) picked.push(t);
        if (picked.length === count) return picked;
      }
    }
    return cand.slice(0, count);
  }

  const tileItem = ([c, r], life, bone = false) => ({ x: c * TILE + 8, y: r * TILE + 8, w: 16, h: 16, taken: false, life, bone });

  // Quais das peças móveis da fase entram neste jogo: a QUANTIDADE de cada tipo é sorteada (`blockRange`) e quais são também. `given` = escolha já feita (jogo salvo).
  let allBlocks = false; // só para testes: liga todas as peças
  function pickActiveBlocks(given) {
    if (given) return given.slice();
    if (allBlocks) return lv.blockDefs.map((_, i) => i);
    const out = [];
    for (const g of ["door", "wall"]) {
      const idxs = lv.blockDefs.map((d, i) => (d.group === g ? i : -1)).filter((i) => i >= 0);
      if (!idxs.length) continue;
      const [mn, mx] = lv.blockRange[g], n = mn + Math.floor(rand() * (mx - mn + 1));
      out.push(...shuffle(idxs).slice(0, n));
    }
    return out.sort((a, b) => a - b);
  }

  // Começa uma fase do zero: rações novas, tempo zerado. `o.lives` = vidas iniciais; `o.retries` = novas tentativas já usadas.
  function reset(id = levelId, o = {}) {
    levelId = id; lv = BUILT[id]; COLS = lv.cols; ROWS = lv.rows; WORLD_W = lv.worldW; WORLD_H = lv.worldH; gamePlayer = typeof o.player === "string" ? o.player : store.player(); gameIsAccount = !!gamePlayer && store.hasAccount(gamePlayer);
    walk = lv.walk; exitRect = lv.exitRect; spawn = lv.spawn;
    blocks = pickActiveBlocks(o.active).map((i) => ({ i, d: lv.blockDefs[i], bt: lv.blockDefs[i].phase, rect: blockRectAt(lv.blockDefs[i], lv.blockDefs[i].phase) }));
    solids = blocks.length ? [...lv.solids, ...blocks.map((b) => b.rect)] : lv.solids; // os blocos que se movem também são sólidos
    refreshBlockTiles();
    collected = 0; bonesGot = 0; time = 0; invuln = 0; hintTimer = 0; livesLost = 0; power = 0; postmen = 0; goalReached = false; pickupToastUntil = 0; crushed = false; puffs = []; started = autoStart; startHint = false;
    lives = clamp(Math.round(o.lives ?? START_LIVES), 1, MAX_LIVES);
    retries = clamp(Math.round(o.retries ?? 0), 0, MAX_RETRIES);
    player = { x: spawn.x, y: spawn.y, w: 24, h: 24, facing: "right", moving: false };
    vets = lv.vetSpawns.map(([c, r], i) => {
      const cfg = lv.vetCfgs[i], [cx, cy] = centerOf(c, r);
      return { cfg, sx: cx, sy: cy, cx, cy, mode: "patrol", leg: null, route: [], idle: 1, think: cfg.thinkEvery, modeT: 0, chaseAge: 0, cool: 1, dir: 1, idx: i, goal: null, hold: 0, wait: 0, crowd: 0, tandem: 0, stack: 0, stuck: 0, bounce: 0, from: null, slow: false, hitCool: 0 };
    });
    // rações e ossos: em chão livre, fora dos trilhos dos blocos; os ossos são alguns dos itens sorteados
    items = placeItems(lv.spawnTile, lv.vetSpawns, lv.exitTiles, lv.rations + lv.bones, lv.trackTiles).map((t) => tileItem(t, false));
    shuffle(items.map((_, i) => i)).slice(0, lv.bones).forEach((i) => { items[i].bone = true; });
    // Alguns itens (ração ou osso) trazem uma vida extra: a quantidade é sorteada entre o mínimo e o máximo da fase (Fase 1: 1; Fases 2 e 3: 1 ou 2; Fases 4 e 5: 3 e 4; Fases 6 a 10: 3 ou 4).
    const extra = lv.lifeMin + Math.floor(rand() * (lv.lifeMax - lv.lifeMin + 1));
    // (no máximo 1 osso traz vida; nunca nos dois ossos da Fase 3)
    let given = 0, onBones = 0;
    for (const i of shuffle(items.map((_, k) => k))) {
      if (given >= extra) break;
      if (items[i].bone && onBones >= 1) continue;
      if (items[i].bone) onBones++;
      items[i].life = true; given++;
    }
    score = runningScore();
  }

  // Quando o cachorro perde uma vida, as rações que ainda não foram pegas mudam de lugar.
  function relocateItems() {
    const rest = items.filter((i) => !i.taken);
    if (!rest.length) return;
    const taken = items.filter((i) => i.taken).map((i) => [(i.x - 8) / TILE, (i.y - 8) / TILE]); // não cair em cima de um item já pego
    const near = []; // renascendo no lugar, nenhum item cai em cima do cachorro nem logo ao lado dele
    if (lv.respawnInPlace) { const [pc, pr] = tileOf(player.x + player.w / 2, player.y + player.h / 2); for (let r = pr - 2; r <= pr + 2; r++) for (let c = pc - 2; c <= pc + 2; c++) near.push([c, r]); }
    const tiles = placeItems(lv.spawnTile, lv.vetSpawns, lv.exitTiles, rest.length, [...taken, ...lv.trackTiles, ...near]);
    rest.forEach((it, i) => { if (tiles[i]) Object.assign(it, tileItem(tiles[i], it.life, it.bone)); });
  }

  // ---------- Blocos e paredes que se movem (Fases 3 a 10) ----------
  function refreshBlockTiles() {
    dynBlocked.clear();
    for (const b of blocks) {
      const c1 = Math.floor(b.rect.x / TILE), c2 = Math.floor((b.rect.x + b.rect.w - 0.01) / TILE), r1 = Math.floor(b.rect.y / TILE), r2 = Math.floor((b.rect.y + b.rect.h - 0.01) / TILE);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) dynBlocked.add(r * COLS + c);
    }
  }

  // Tira da frente do bloco quem estiver no lugar dele: o cachorro vai para o lado livre mais próximo (encostado no bloco); um veterinário vai
  // para o centro do tile livre mais próximo. Devolvem false se não houver para onde empurrar (aí o bloco não anda, e nunca esmaga).
  function shovePlayer(rect) {
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (!overlap(pr, rect)) return true;
    const E = 0.001, cands = [
      { x: rect.x - pr.w - E, y: pr.y }, { x: rect.x + rect.w + E, y: pr.y }, { x: pr.x, y: rect.y - pr.h - E }, { x: pr.x, y: rect.y + rect.h + E },
    ].sort((a, b) => Math.hypot(a.x - pr.x, a.y - pr.y) - Math.hypot(b.x - pr.x, b.y - pr.y));
    const to = cands.find((c) => c.x >= 0 && c.y >= 0 && c.x + pr.w <= WORLD_W && c.y + pr.h <= WORLD_H && !solids.some((o) => o !== rect && overlap({ x: c.x, y: c.y, w: pr.w, h: pr.h }, o)));
    if (!to) return false;
    player.x = to.x; player.y = to.y;
    return true;
  }
  function shoveVets(rect) {
    for (const v of vets) {
      if (!overlap({ x: v.cx - 12, y: v.cy - 12, w: 24, h: 24 }, rect)) continue;
      const [vc, vr] = tileOf(v.cx, v.cy);
      let best = null;
      for (let r = vr - 3; r <= vr + 3; r++) for (let c = vc - 3; c <= vc + 3; c++) {
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS || !walk[r][c]) continue;
        const [cx, cy] = centerOf(c, r), box = { x: cx - 12, y: cy - 12, w: 24, h: 24 };
        if (solids.some((o) => overlap(box, o)) || vets.some((o) => o !== v && Math.hypot(o.cx - cx, o.cy - cy) < 20)) continue;
        const d = Math.hypot(cx - v.cx, cy - v.cy);
        if (!best || d < best.d) best = { cx, cy, d };
      }
      if (!best) return false;
      Object.assign(v, { cx: best.cx, cy: best.cy, leg: null, route: [], goal: null, idle: Math.max(v.idle, 0.3) });
    }
    return true;
  }
  const shoveActors = (rect) => shovePlayer(rect) && shoveVets(rect);

  // Cada bloco anda o seu ciclo no relógio, sem esperar ninguém: se o cachorro ou um veterinário estiver no lugar para onde ele desliza,
  // é empurrado para o lado (só se não houver mesmo onde pô-lo é que o bloco fica parado, para nunca esmagar).
  function updateBlocks(dt) {
    if (!blocks.length) return;
    // Nas fases com `crush`, o bloco que alcança o cachorro (sem o poder do osso e fora da proteção) o ESMAGA: ele perde uma vida. Os veterinários continuam sendo empurrados.
    const deadly = lv.crush && !noCatch && power <= 0 && invuln <= 0;
    for (const b of blocks) {
      const bt = normBt(b.d, b.bt + dt), r = blockRectAt(b.d, bt);
      if (r.x === b.rect.x && r.y === b.rect.y) { b.bt = bt; continue; } // parado numa das pontas: só o relógio anda
      const ox = b.rect.x, oy = b.rect.y;
      b.rect.x = r.x; b.rect.y = r.y;
      const squash = deadly && overlap(player, b.rect);
      if (squash) crushed = true;
      if (squash ? shoveVets(b.rect) : shoveActors(b.rect)) b.bt = bt;
      else { b.rect.x = ox; b.rect.y = oy; }                            // sem como afastar quem está no caminho: o bloco não anda
    }
    refreshBlockTiles();
  }

  // ---------- Cachorro ----------
  const dogSpeedNow = () => SPEED * lv.dogSpeed * (1 + BONE_SPEED_BONUS * bonesGot) * (assist() ? lv.touchEase.dog : 1); // px/s: a da fase, mais 10% por osso pego
  function moveAxis(dx, dy) {
    player.x += dx; player.y += dy;
    for (const s of solids) {
      if (!overlap(player, s)) continue;
      if (dx > 0) player.x = s.x - player.w;
      else if (dx < 0) player.x = s.x + s.w;
      if (dy > 0) player.y = s.y - player.h;
      else if (dy < 0) player.y = s.y + s.h;
    }
  }

  // ---------- Veterinário (caminha pelo centro dos tiles, sem atravessar paredes) ----------
  function bfs(from, ignoreBlocks = false, avoid = null) { // `avoid`: tiles (chaves) que não podem ser usados (por ex. onde há outro veterinário)
    const prev = new Map(), dist = new Map();
    const key = (c, r) => r * COLS + c;
    const q = [from]; dist.set(key(...from), 0); prev.set(key(...from), null);
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i], d = dist.get(key(c, r));
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || !walk[nr][nc] || dist.has(key(nc, nr)) || (!ignoreBlocks && dynBlocked.has(key(nc, nr))) || (avoid && avoid.has(key(nc, nr)))) continue;
        dist.set(key(nc, nr), d + 1); prev.set(key(nc, nr), [c, r]); q.push([nc, nr]);
      }
    }
    return { q, dist, prev, key };
  }

  function pathTo(g, to) {
    const out = [];
    for (let cur = to; cur && g.prev.get(g.key(...cur)); cur = g.prev.get(g.key(...cur))) out.unshift(cur);
    return out;
  }

  function canSee(v) {
    const px = player.x + player.w / 2, py = player.y + player.h / 2;
    const dx = px - v.cx, dy = py - v.cy, dist = Math.hypot(dx, dy);
    if (dist > v.cfg.sight) return false;
    for (let d = 0; d < dist; d += 8) {
      const [c, r] = tileOf(v.cx + (dx * d) / dist, v.cy + (dy * d) / dist);
      if (!walk[r][c] || dynBlocked.has(r * COLS + c)) return false;
    }
    return true;
  }

  // Destino da próxima patrulha: entre os tiles bem longe de onde o veterinário está (de preferência na faixa do mapa dele), os 40% mais afastados dos outros veterinários (e dos destinos deles), sorteado.
  // Assim os veterinários ocupam lugares diferentes do mapa em vez de andar juntos.
  // tiles (chaves) por onde o caminho de patrulha de `v` não deve passar: os que ficam a menos de VET_NEAR tiles de outro veterinário E mais perto dele do que `from`
  // (assim ninguém é obrigado a atravessar o outro, mas dois veterinários lado a lado ainda podem se afastar um do outro)
  function tilesNearOthers(v, from) {
    const out = new Set();
    for (const o of vets) {
      if (o === v) continue;
      const [oc, or] = tileOf(o.cx, o.cy), d0 = Math.hypot(from[0] - oc, from[1] - or);
      for (let r = or - VET_NEAR; r <= or + VET_NEAR; r++) for (let c = oc - VET_NEAR; c <= oc + VET_NEAR; c++) {
        const d = Math.hypot(c - oc, r - or);
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS && d <= VET_NEAR && d < d0) out.add(r * COLS + c);
      }
    }
    return out;
  }
  function pickPatrolGoal(v, g) {
    let far = g.q.filter(([c, r]) => g.dist.get(g.key(c, r)) >= 5);
    if (!far.length) return null;
    const others = vets.filter((o) => o !== v);
    if (!others.length) return far[Math.floor(rand() * far.length)];
    // cada veterinário tem a sua "faixa" do mapa (por colunas: o 1º à esquerda, o último à direita) e patrulha nela na maior parte das vezes
    const mine = far.filter(([c]) => Math.min(vets.length - 1, Math.floor((c * vets.length) / COLS)) === v.idx);
    if (mine.length >= 8 && rand() < 0.75) far = mine;
    const away = ([c, r]) => {
      const [x, y] = centerOf(c, r);
      return Math.min(...others.map((o) => Math.min(Math.hypot(x - o.cx, y - o.cy), o.goal ? Math.hypot(x - o.goal[0], y - o.goal[1]) : Infinity)));
    };
    const ranked = far.map((t) => [t, away(t)]).sort((a, b) => b[1] - a[1]);
    const top = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * 0.4)));
    return top[Math.floor(rand() * top.length)][0];
  }

  // `v` vem atrás de `o`: o próximo passo de `v` o aproxima de `o`, e o de `o` o afasta de `v`
  function followsAhead(v, o) {
    const [vx, vy] = centerOf(...v.leg), [ox, oy] = centerOf(...o.leg);
    return Math.hypot(o.cx - vx, o.cy - vy) < Math.hypot(o.cx - v.cx, o.cy - v.cy) && Math.hypot(ox - v.cx, oy - v.cy) >= Math.hypot(o.cx - v.cx, o.cy - v.cy);
  }
  function updateVet(v, dt) {
    const cfg = v.cfg;
    if (v.hitCool > 0) v.hitCool -= dt;
    v.cool -= dt; v.think -= dt; v.modeT -= dt;
    if (v.bounce > 0) v.bounce = Math.max(0, v.bounce - dt / 8);
    if (v.mode === "patrol" && v.cool <= 0 && v.think <= 0) {
      v.think = cfg.thinkEvery;
      if (power <= 0 && canSee(v) && rand() < cfg.chaseChance) { v.mode = "chase"; v.modeT = cfg.chaseTime; v.chaseAge = 0; }
    }
    if (v.mode === "chase") {
      v.chaseAge += dt;
      if (canSee(v)) v.modeT = Math.max(v.modeT, cfg.chaseTime * 0.4); // enquanto vê o cachorro, não desiste
    }
    if (v.mode === "chase" && (v.modeT <= 0 || v.chaseAge >= cfg.chaseMax)) { v.mode = "patrol"; v.cool = cfg.restTime; v.route = []; v.idle = 0.5; }

    // andando colado em cima de outro veterinário (de número menor, também andando) em patrulha: depois de STACK_AFTER s, descansa STACK_PAUSE s e fica para trás
    // (se o outro está parado, quem anda é quem sai de cima dele: não precisa descansar)
    if (v.mode === "patrol" && v.leg && vets.some((o) => o.idx < v.idx && o.mode === "patrol" && o.leg && Math.hypot(o.cx - v.cx, o.cy - v.cy) < VET_STACK)) {
      if ((v.stack += dt) > STACK_AFTER) { v.stack = 0; v.idle = Math.max(v.idle, STACK_PAUSE); }
    } else v.stack = 0;
    // andando em fila atrás de outro veterinário (mesmo corredor, quase colados) por mais de TANDEM_AFTER s (um quarto disso se estiver a menos de VET_GAP): quem vem atrás descansa um pouco e fica para trás
    const ahead = v.mode === "patrol" && v.leg ? vets.find((o) => o !== v && o.mode === "patrol" && o.leg && Math.hypot(o.cx - v.cx, o.cy - v.cy) < VET_TANDEM && followsAhead(v, o)) : null;
    if (ahead) {
      v.tandem += Math.hypot(ahead.cx - v.cx, ahead.cy - v.cy) < VET_GAP ? dt * 4 : dt;
      if (v.tandem > TANDEM_AFTER) { v.tandem = 0; v.idle = Math.max(v.idle, TANDEM_PAUSE); }
    } else v.tandem = 0;

    // Anda `budget` pixels neste quadro; ao chegar ao centro de um tile, decide o próximo passo e continua com o que sobrou
    // (assim a velocidade real é a da fase, e não depende da taxa de quadros).
    let budget = (v.mode === "chase" ? cfg.chaseSpeed : cfg.speed) * (v.slow ? POSTMAN_SLOW : 1) * (assist() ? lv.touchEase.vet : 1) * dt, idled = false;
    for (let n = 0; n < 4 && budget > 1e-9; n++) {
      if (!v.leg) { // está exatamente no centro de um tile: decide o próximo passo
        if (v.mode === "chase") {
          // vai atrás do cachorro por um caminho que não passa pelo tile dos outros veterinários (se houver outro caminho): eles se espalham em vez de andar em fila
          const from = tileOf(v.cx, v.cy), dogTile = tileOf(player.x + player.w / 2, player.y + player.h / 2);
          const taken = new Set(vets.filter((o) => o !== v).map((o) => { const [c, r] = tileOf(o.cx, o.cy); return r * COLS + c; }));
          let p = pathTo(bfs(from, false, taken), dogTile);
          if (!p.length) p = pathTo(bfs(from), dogTile);
          v.leg = p[0] || null;
        } else if (v.idle > 0) {
          if (!idled) v.idle -= dt;
          return;
        } else {
          if (!v.route.length) {
            // escolhe um destino por um caminho que não passa perto dos outros veterinários (para não andarem em fila); se só houver esse corredor, espera até 2 s que o outro saia da frente
            const from = tileOf(v.cx, v.cy), near = tilesNearOthers(v, from);
            let g = bfs(from, false, near), goal = pickPatrolGoal(v, g);
            if (!goal && near.size && v.crowd < 2) { v.crowd += dt; return; }
            if (!goal) { g = bfs(from); goal = pickPatrolGoal(v, g); }
            v.crowd = 0;
            if (goal) { v.route = pathTo(g, goal); v.goal = centerOf(...goal); }
          }
          v.leg = v.route.shift() || null;
          if (!v.leg) v.idle = cfg.idleMin;
        }
        if (!v.leg) return;
        v.from = tileOf(v.cx, v.cy); // o tile de onde está saindo (para voltar, se ficar de frente com outro veterinário)
      }
      const [tx, ty] = centerOf(...v.leg);
      const dx = tx - v.cx, dy = ty - v.cy, dist = Math.hypot(dx, dy), move = Math.min(budget, dist);
      if (dist > 0) {
        const mx = v.cx + (dx / dist) * move, my = v.cy + (dy / dist) * move;
        // não anda colado em outro veterinário: se o próximo passo o deixaria a menos de VET_GAP de um veterinário de número menor (e mais perto do que está), espera;
        // se a espera passa de 0,5 s numa patrulha (cara a cara num corredor), o de número maior volta ao tile de onde veio e escolhe outro destino.
        // Um veterinário parado de número maior (descansando ou esperando) só o faz esperar 1 s: depois disso ele passa (assim ninguém fica travado para sempre).
        const closer = (o) => Math.hypot(o.cx - mx, o.cy - my) < VET_GAP && Math.hypot(o.cx - mx, o.cy - my) < Math.hypot(o.cx - v.cx, o.cy - v.cy);
        const lower = vets.find((o) => o !== v && (o.idx < v.idx || (o.slow && !v.slow)) && closer(o)); // espera atrás de quem tem número menor e também de um carteiro lento
        const still = lower ? null : vets.find((o) => o !== v && (o.hold > 0 || o.stuck > 0 || !o.leg) && closer(o));
        if (lower || (still && v.wait < 1)) {
          v.hold += dt; if (!lower) v.wait += dt;
          if (still && v.wait > 0.5 && still.idle > 0.2) still.idle = 0.2; // o que está parado na frente descansa menos se há outro esperando atrás dele
          if (lower && v.hold > 0.5 && v.mode === "patrol" && v.from) { v.leg = v.from; v.from = null; v.route = []; v.goal = null; v.hold = 0; }
          return;
        }
        if (still && v.mode === "patrol" && v.from && v.bounce < 2) { // esperou 1 s atrás de um parado: em vez de passar por cima dele, volta e escolhe outro caminho (no máximo 2 vezes seguidas)
          v.bounce++; v.leg = v.from; v.from = null; v.route = []; v.goal = null; v.wait = 0; v.hold = 0;
          return;
        }
        if (!still) v.wait = 0;
        v.hold = 0;
        if (blocks.length && blocks.some((b) => overlap({ x: mx - 12, y: my - 12, w: 24, h: 24 }, b.rect))) { // bloco no caminho: espera; se demorar, volta ao tile de onde veio e escolhe outro caminho
          if ((v.stuck += dt) > 0.6) { v.stuck = 0; if (v.from) { v.leg = v.from; v.from = null; } v.route = []; v.goal = null; }
          return;
        }
        v.stuck = 0;
        if (dx) v.dir = Math.sign(dx);
      }
      if (dist <= budget) {
        v.cx = tx; v.cy = ty; v.leg = null; budget -= dist;
        if (v.mode === "patrol" && !v.route.length) { v.idle = cfg.idleMin + rand() * (cfg.idleMax - cfg.idleMin); v.goal = null; idled = true; }
      } else { v.cx += (dx / dist) * budget; v.cy += (dy / dist) * budget; budget = 0; }
    }
  }

  // ---------- Pontuação e vidas ----------
  // Pontuação corrente: 100 por ração + 150 por osso + 100 por carteiro − pontos por vida perdida (50; 200 nas Fases 4 e 5; 250 nas Fases 6 a 8; 300 nas Fases 9 e 10) − 100 por nova tentativa (o bônus de tempo entra ao terminar).
  // PODE FICAR NEGATIVA.
  const runningScore = () => collected * Records.RATION_POINTS + bonesGot * Records.BONE_POINTS + postmen * Records.POSTMAN_POINTS - livesLost * lv.lifePenalty - retries * Records.RETRY_PENALTY;
  const allCollected = () => collected >= lv.rations && bonesGot >= lv.bones;
  // A saída abre quando pegou tudo; nas fases com pontos mínimos (4 a 10) basta a pontuação corrente (sem o bônus de tempo) chegar ao mínimo: não é preciso pegar todos os itens.
  const exitOpen = () => (lv.minPoints ? runningScore() >= lv.minPoints : allCollected());

  function giveLife(it, extra = "") { // `extra`: outro aviso do mesmo item (o poder do osso), para um não apagar o outro
    pickupToastUntil = time + 2.8;
    if (lives < MAX_LIVES) { lives++; toast(`Vida extra! +1 vida${extra}`, 2.6); }
    else toast(`${it && it.bone ? "Este osso" : "Esta ração"} tinha uma vida extra, mas você já está com o máximo (${MAX_LIVES} vidas).${extra}`, 2.8);
  }

  // O cachorro volta ao início da fase (o mesmo lugar de quando ela começou) e o veterinário volta ao seu posto.
  // O tempo NÃO zera: continua contando.
  // Fases com `respawnInPlace` (9 e 10): o cachorro renasce ONDE MORREU (se um bloco ou parede estiver em cima, é empurrado para o lado livre mais perto;
  // se não houver lugar, volta ao início). Os veterinários voltam aos postos e ele ganha a proteção de sempre.
  function respawn() {
    let inPlace = lv.respawnInPlace;
    if (inPlace) { for (const b of blocks) if (!shovePlayer(b.rect)) { inPlace = false; break; } }
    if (inPlace) Object.assign(player, { moving: false });
    else Object.assign(player, { x: spawn.x, y: spawn.y, facing: "right", moving: false });
    for (const v of vets) {
      Object.assign(v, { cx: v.sx, cy: v.sy, mode: "patrol", leg: null, route: [], goal: null, hold: 0, wait: 0, crowd: 0, tandem: 0, stack: 0, stuck: 0, bounce: 0, slow: false, hitCool: 0, idle: 2, cool: 1.5, modeT: 0, chaseAge: 0, think: v.cfg.thinkEvery });
    }
    invuln = INVULN;
    return inPlace;
  }

  function loseLife(why) {
    lives--; livesLost++;
    score = runningScore();
    if (lives <= 0) { gameOver(why); return; }
    const inPlace = respawn();
    relocateItems();
    const what = why === "crush" ? "Esmagado por um bloco!" : "Perdeu uma vida!";
    toast(inPlace ? `${what} −${lv.lifePenalty} pontos. Renasceu aqui, protegido por 2 s. ${lv.bones ? "Itens trocaram" : "Rações trocaram"} de lugar.`
      : `${what} −${lv.lifePenalty} pontos. ${lv.bones ? "Os itens mudaram" : "As rações mudaram"} de lugar.`, 2.6);
    saveNow();
  }

  // ---------- Poder do osso (a partir da Fase 2) ----------
  // Pegar um osso dura `bonePower` segundos: os veterinários viram carteiros (não perseguem nem pegam o cachorro) e quem encosta num deles ganha dele.
  // Pegar outro osso com o poder ligado recomeça a contagem (não soma). Quando acaba, os carteiros voltam a ser veterinários.
  function startPower() {
    power = lv.bonePower;
    for (const v of vets) { v.slow = false; v.hitCool = 0; } // poder novo (ou renovado): todos os carteiros podem ser pegos de novo
    for (const v of vets) if (v.mode === "chase") { v.mode = "patrol"; v.route = []; v.idle = 0.3; v.modeT = 0; v.chaseAge = 0; } // (o trecho em andamento termina: ele só decide o próximo passo no centro de um tile, senão cortaria a quina de uma parede)
    toast(`Poder do osso por ${lv.bonePower} s: os veterinários viram carteiros!`, 2.6); pickupToastUntil = time + 2.6;
  }
  // centro do tile livre mais perto de (x, y): chão, fora de blocos e a mais de VET_GAP de qualquer outro veterinário (dois não ficam um em cima do outro)
  function freeSpotNear(v, x, y) {
    const [vc, vr] = tileOf(x, y);
    let best = null;
    for (let r = vr - 4; r <= vr + 4; r++) for (let c = vc - 4; c <= vc + 4; c++) {
      if (c < 0 || r < 0 || c >= COLS || r >= ROWS || !walk[r][c]) continue;
      const [cx, cy] = centerOf(c, r), box = { x: cx - 12, y: cy - 12, w: 24, h: 24 };
      if (solids.some((o) => overlap(box, o)) || vets.some((o) => o !== v && Math.hypot(o.cx - cx, o.cy - cy) < VET_GAP)) continue;
      const d = Math.hypot(cx - x, cy - y);
      if (!best || d < best.d) best = { cx, cy, d };
    }
    return best || { cx: x, cy: y };
  }
  function defeatPostman(v) {
    puffs.push({ x: v.cx, y: v.cy, t: 0 });
    const post = freeSpotNear(v, v.sx, v.sy); // o posto dele; se outro veterinário estiver nele, o tile livre mais perto
    Object.assign(v, { cx: post.cx, cy: post.cy, leg: null, route: [], goal: null, hold: 0, mode: "patrol", idle: 1.5, modeT: 0, chaseAge: 0, slow: true, hitCool: POSTMAN_STUN });
    postmen++; score = runningScore();
    toast(`Você ganhou do carteiro! +${Records.POSTMAN_POINTS} pontos`, 1.6);
    saveNow();
  }
  function endPower() {
    power = 0;
    for (const v of vets) { v.slow = false; v.hitCool = 0; v.cool = Math.max(v.cool, 2); } // os carteiros lentos voltam à velocidade normal
    invuln = Math.max(invuln, POWER_END_GRACE);
    toast("O poder acabou: os carteiros voltaram a ser veterinários!", 2.4);
  }

  // ---------- Atualização ----------
  function update(dt) {
    if (!(dt > 0)) dt = 0; // o relógio nunca anda para trás (o tempo do quadro pode vir antes do instante em que a partida foi retomada)
    if (hintTimer > 0 && (hintTimer -= dt) <= 0) $("toast").classList.remove("show");

    let ix = 0, iy = 0;
    if (keys.ArrowLeft || keys.a || touch.left) ix -= 1;
    if (keys.ArrowRight || keys.d || touch.right) ix += 1;
    if (keys.ArrowUp || keys.w || touch.up) iy -= 1;
    if (keys.ArrowDown || keys.s || touch.down) iy += 1;
    if (ix && iy) { ix *= Math.SQRT1_2; iy *= Math.SQRT1_2; }
    const byTouch = !!(touch.left || touch.right || touch.up || touch.down);
    if (ix || iy) touchInput = byTouch && !(keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || keys.a || keys.d || keys.w || keys.s);
    if (!ix && !iy) { const g = gamepadMove(); ix = g.x; iy = g.y; if (ix || iy) touchInput = false; } // sem teclado/toque: usa o controle (analógico ou direcional)
    if (!started) { // a fase só começa (relógio, veterinários e blocos) no primeiro passo do jogador
      if (!(ix || iy)) {
        player.moving = false;
        if (hintTimer <= 0) { toast(START_HINT, 600); startHint = true; } // pausar, "Continuar jogo" com tempo 0 e outros avisos apagam o aviso: ele volta enquanto o jogador não se mexe
        return;
      }
      started = true;
      if (startHint) { startHint = false; if ($("toast").textContent.includes(START_HINT)) { hintTimer = 0; $("toast").classList.remove("show"); } } // (só some o aviso do primeiro passo; outro aviso na tela segue até o fim)
    }
    time += dt;
    player.moving = !!(ix || iy);
    if (ix && Math.abs(ix) >= Math.abs(iy)) player.facing = ix > 0 ? "right" : "left";
    else if (iy) player.facing = iy > 0 ? "down" : "up";
    const step = Math.min(dt, 0.05) * dogSpeedNow();
    moveAxis(ix * step, 0);
    moveAxis(0, iy * step);

    updateBlocks(dt);
    if (crushed) { crushed = false; loseLife("crush"); return; }
    for (const it of items) {
      if (!it.taken && overlap(player, it)) {
        it.taken = true;
        if (it.bone) { bonesGot++; if (lv.bonePower) startPower(); } else collected++;
        if (it.life) giveLife(it, it.bone && lv.bonePower ? ` · Poder do osso por ${lv.bonePower} s!` : "");
        score = runningScore(); saveNow();
      }
    }

    if (lv.minPoints) { // meta de pontos: avisa quando a saída abre (e de novo se a pontuação cair abaixo e voltar)
      const open = runningScore() >= lv.minPoints;
      if (open && !goalReached && time >= pickupToastUntil) { toast(`Meta de ${lv.minPoints} pontos atingida! A saída está aberta.`, 2.6); goalReached = true; } // espera outro aviso (vida, poder) terminar
      else if (!open) goalReached = false;
    }
    if (power > 0 && (power -= dt) <= 0) endPower();
    if (lv.minPoints && power <= 0 && allCollected() && !exitOpen()) { gameOver("short"); return; } // tudo pego e os pontos não chegam ao mínimo: não há mais como passar, a tentativa acaba
    if (puffs.length) puffs = puffs.filter((f) => (f.t += dt) < 0.8);
    if (!freezeVets) for (const v of vets) updateVet(v, Math.min(dt, 0.05));
    const px = player.x + player.w / 2, py = player.y + player.h / 2, touching = (v) => Math.hypot(v.cx - px, v.cy - py) < 22;
    const protectedNow = invuln > 0;
    if (invuln > 0) invuln -= dt;
    if (power > 0) { // com o poder do osso, quem encosta num carteiro ganha dele (+100 pontos): o carteiro volta ao centro do mapa, mais lento
      for (const v of vets) if (!v.slow && touching(v)) defeatPostman(v); // cada carteiro só rende pontos uma vez por poder (o atingido fica lento até o poder acabar ou um novo osso)
    } else if (!protectedNow && !noCatch && vets.some(touching)) { loseLife(); return; }

    if (overlap(player, exitRect)) {
      if (exitOpen()) win();
      else if (hintTimer <= 0) toast(lv.minPoints ? `Faltam ${lv.minPoints - runningScore()} pontos para abrir a saída (meta: ${lv.minPoints}).` : lv.bones ? "Colete todas as rações e todos os ossos antes de sair!" : "Colete todas as rações antes de sair!", 1.8);
    }
  }

  // ---------- Estados e telas ----------
  const SCREENS = ["menu", "levels", "howto", "scores", "name", "register", "login", "forgot", "confirm", "pause", "win", "lose"].map($);

  function setState(s) {
    state = s;
    document.body.dataset.state = s;
    if (s !== "playing") clearTouch();
  }

  let screenSeq = 0; // muda a cada troca de tela: serve para ignorar respostas atrasadas (cadastro/entrada) de uma tela que o jogador já deixou
  function showScreen(id) {
    screenSeq++;
    if (id) { $("toast").classList.remove("show"); hintTimer = 0; } // o aviso do jogo não aparece por trás das telas
    if (id !== "register") clearAuthFields(["reg-user", "reg-pass", "reg-pass2"], "reg-show");
    if (id !== "login") clearAuthFields(["login-user", "login-pass"], "login-show");
    for (const el of SCREENS) el.classList.toggle("hidden", el.id !== id);
    document.body.dataset.screen = id || "";
    $("stage").inert = !!id; $("touch").inert = !!id;
    const el = id && $(id);
    if (el) {
      el.scrollTop = 0;
      const visible = (n) => n.offsetParent !== null;
      // telas longas (Como jogar, Pontuações): o foco fica na própria tela, para as setas, Espaço e PageDown rolarem o texto
      const f = el.hasAttribute("data-scroll") ? el : [...el.querySelectorAll("[data-autofocus]")].find(visible) || [...el.querySelectorAll("button, input")].find(visible);
      if (f) { f.focus({ preventScroll: true }); if (f !== el && id === "levels" && f.scrollIntoView) f.scrollIntoView({ block: "nearest" }); } // a lista de fases mostra o botão focado, mesmo abaixo da dobra
    }
  }

  function toast(text, seconds) {
    $("toast").textContent = text; $("toast").classList.add("show"); hintTimer = seconds;
  }

  function goMenu() {
    setState("menu");
    hintTimer = 0; $("toast").classList.remove("show");
    renderMenu();
    showScreen("menu");
  }

  function beginPlay() {
    for (const k in keys) keys[k] = false;
    hintTimer = 0; $("toast").classList.remove("show");
    autosaveT = 0;
    setState("playing");
    showScreen(null);
    fitCanvas();
    updateHud();
    last = performance.now();
  }

  // Começa uma fase: do zero (vidas = 3), com as vidas que vieram da fase anterior, ou como nova tentativa.
  // `o.player`: quem segue na mesma partida (Próxima fase, Jogar novamente, Tentar novamente) continua sendo quem jogou, mesmo que outra aba tenha trocado o jogador atual
  function begin(id = levelId, o = {}) {
    const me = typeof o.player === "string" ? o.player : store.player();
    if (me) store.clearGame(me); // um jogo novo substitui o salvo (só aqui: cancelar a escolha da fase não apaga nada)
    reset(id, o);
    beginPlay();
    const n = vets.length;
    const msg = o.retries ? `Tentativa extra ${o.retries} de ${MAX_RETRIES}: −${Records.RETRY_PENALTY} pontos. Vamos de novo!`
      : `${lv.title}: ${n} ${n === 1 ? "veterinário" : "veterinários"}${lv.minPoints ? ` · mínimo de ${lv.minPoints} pontos` : ""}`;
    if (started) toast(msg, 2.8);
    else { toast(`${msg} · ${START_HINT}`, 600); startHint = true; }
  }

  // ---------- Jogo salvo ----------
  let autosaveT = 0, saveFlashTimer = null;

  function snapshot() {
    const r2 = (n) => Math.round(n * 100) / 100;
    return {
      v: 4, l: levelId, time: r2(time), lives, lost: livesLost, rs: retries, invuln: r2(clamp(invuln, 0, INVULN)),
      items: items.map((it) => [(it.x - 8) / TILE, (it.y - 8) / TILE, it.taken ? 1 : 0, it.life ? 1 : 0, it.bone ? 1 : 0]), // coluna, linha, pego, vida extra, osso
      p: { x: r2(player.x), y: r2(player.y), f: player.facing },
      vets: vets.map((v) => [r2(v.cx), r2(v.cy)]),
      bl: blocks.map((b) => r2(b.bt)), // ponto do ciclo de cada bloco que se move
      ba: blocks.map((b) => b.i),      // quais peças móveis da fase entraram neste jogo (a quantidade é sorteada)
      pw: power > 0 ? Math.max(0.01, r2(power)) : 0, vd: vets.map((v) => (v.slow ? 1 : 0)), pk: postmen, // poder do osso que falta, carteiros lentos (já atingidos) e quantos já foram atingidos
    };
  }

  // Confere um jogo salvo antes de usar (o armazenamento pode ter sido editado ou corrompido).
  // Aceita o formato v4 e o v3 da 0.4.0 (itens de 4 posições, sem ossos nem blocos); devolve sempre no formato v4.
  function parseSnapshot(sv) {
    try {
      const num = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
      if (!sv || (sv.v !== 3 && sv.v !== 4) || !Number.isInteger(sv.l)) return null;
      const L = BUILT[sv.l];
      if (!L) return null;
      if (sv.v === 3 && (L.bones || L.blockDefs.length)) return null; // o formato antigo não tem ossos nem blocos
      if (!num(sv.time, 0, 86400) || !Number.isInteger(sv.lives) || sv.lives < 1 || sv.lives > MAX_LIVES || !num(sv.invuln, 0, INVULN)) return null;
      if (!Number.isInteger(sv.lost) || sv.lost < 0 || sv.lost > 999) return null;
      if (!Number.isInteger(sv.rs) || sv.rs < 0 || sv.rs > MAX_RETRIES) return null;
      if (!Array.isArray(sv.items) || sv.items.length !== L.rations + L.bones) return null;
      const seen = new Set(), items4 = [];
      let lifeItems = 0, boneItems = 0;
      for (const it of sv.items) {
        if (!Array.isArray(it) || it.length !== (sv.v === 3 ? 4 : 5)) return null;
        const [c, r, t, l] = it, b = sv.v === 3 ? 0 : it[4];
        if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= L.cols || r >= L.rows || !L.walk[r][c] || (t !== 0 && t !== 1) || (l !== 0 && l !== 1) || (b !== 0 && b !== 1)) return null;
        // dois itens que faltam pegar não podem ocupar o mesmo tile (um já pego pode: jogos salvos da 0.4.0 tinham esse defeito)
        if (t === 0) { if (seen.has(r * L.cols + c)) return null; seen.add(r * L.cols + c); }
        if (L.trackTiles.some(([tc, tr]) => tc === c && tr === r)) return null; // nunca no trilho de um bloco
        lifeItems += l; boneItems += b;
        items4.push([c, r, t, l, b]);
      }
      if (lifeItems < L.lifeMin || lifeItems > L.lifeMax || boneItems !== L.bones) return null; // a fase tem de ter a quantidade prevista de vidas extras e de ossos
      if (items4.filter((it) => it[3] === 1 && it[4] === 1).length > 1) return null; // no máximo 1 osso traz vida
      const pw = sv.pw === undefined ? 0 : sv.pw, vd = sv.vd === undefined ? L.vetSpawns.map(() => 0) : sv.vd;
      if (!num(pw, 0, 120) || pw > L.bonePower || !Array.isArray(vd) || vd.length !== L.vetSpawns.length || !vd.every((x) => x === 0 || x === 1) || (pw === 0 && vd.some((x) => x === 1))) return null;
      let bl = [], ba = [];
      if (L.blockDefs.length) {
        ba = sv.ba === undefined ? L.blockDefs.map((_, i) => i) : sv.ba; // (saves antigos: todas as peças)
        if (!Array.isArray(ba) || new Set(ba).size !== ba.length || !ba.every((i, k) => Number.isInteger(i) && i >= 0 && i < L.blockDefs.length && (k === 0 || ba[k - 1] < i))) return null;
        for (const g of ["door", "wall"]) { const n = ba.filter((i) => L.blockDefs[i].group === g).length; if (n < L.blockRange[g][0] || n > L.blockRange[g][1]) return null; }
        if (!Array.isArray(sv.bl) || sv.bl.length !== ba.length || !sv.bl.every((x) => num(x, 0, 1e5))) return null;
        bl = sv.bl;
      } else if ((sv.bl !== undefined && !(Array.isArray(sv.bl) && sv.bl.length === 0)) || (sv.ba !== undefined && !(Array.isArray(sv.ba) && sv.ba.length === 0))) return null;
      const p = sv.p;
      if (!p || !num(p.x, 0, L.worldW - 24) || !num(p.y, 0, L.worldH - 24) || !["left", "right", "up", "down"].includes(p.f)) return null;
      if (L.solids.some((o) => overlap({ x: p.x, y: p.y, w: 24, h: 24 }, o))) return null; // (quem estiver no lugar de um bloco é empurrado para o lado ao carregar)
      if (!Array.isArray(sv.vets) || sv.vets.length !== L.vetSpawns.length) return null;
      for (const v of sv.vets) {
        if (!Array.isArray(v) || !num(v[0], 0, L.worldW - 1) || !num(v[1], 0, L.worldH - 1)) return null;
        const [c, r] = tileOf(v[0], v[1]);
        if (!L.walk[r][c]) return null;
      }
      const pk = sv.pk === undefined ? 0 : sv.pk;
      if (!Number.isInteger(pk) || pk < 0 || pk > 999 || (pk > 0 && !L.bonePower)) return null;
      return { ...sv, v: 4, items: items4, bl, ba, pw, vd, pk };
    } catch { return null; }
  }

  function savedGame() { // jogo salvo válido do jogador atual, ou null (e limpa um save inválido)
    const me = store.player();
    if (!me) return null;
    const g = store.loadGame(me);
    if (!g) return null;
    const sv = parseSnapshot(g.snap);
    if (!sv) { store.clearGame(me); return null; }
    return { savedAt: g.savedAt, snap: sv };
  }

  function applySnapshot(sv) {
    reset(sv.l, { lives: sv.lives, retries: sv.rs, active: sv.ba });
    items = sv.items.map(([c, r, t, l, b]) => Object.assign(tileItem([c, r], l === 1, b === 1), { taken: t === 1 }));
    blocks.forEach((b, i) => { b.bt = normBt(b.d, sv.bl[i]); const r = blockRectAt(b.d, b.bt); b.rect.x = r.x; b.rect.y = r.y; });
    refreshBlockTiles();
    time = sv.time; livesLost = sv.lost; started = autoStart || sv.time > 0;
    collected = items.filter((i) => i.taken && !i.bone).length; bonesGot = items.filter((i) => i.taken && i.bone).length; score = runningScore();
    Object.assign(player, { x: sv.p.x, y: sv.p.y, facing: sv.p.f, moving: false });
    vets.forEach((v, i) => {
      const [c, r] = tileOf(sv.vets[i][0], sv.vets[i][1]);
      [v.cx, v.cy] = centerOf(c, r); // o veterinário volta ao centro do tile mais próximo
      Object.assign(v, { mode: "patrol", leg: null, route: [], goal: null, hold: 0, idle: 1, cool: 2, modeT: 0, chaseAge: 0, slow: sv.vd[i] === 1, hitCool: 0 });
    });
    power = sv.pw; postmen = sv.pk; score = runningScore();
    for (const b of blocks) shoveActors(b.rect); // ninguém começa dentro de um bloco
    vets.forEach((v, i) => { // dois veterinários que estavam no mesmo tile não voltam um em cima do outro
      if (vets.some((o, j) => j < i && Math.hypot(o.cx - v.cx, o.cy - v.cy) < VET_GAP)) { const spot = freeSpotNear(v, v.cx, v.cy); v.cx = spot.cx; v.cy = spot.cy; }
    });
    invuln = Math.max(sv.invuln, RESUME_GRACE);
  }

  function continueGame() {
    const g = savedGame();
    if (!g) { renderMenu(); goMenu(); return; }
    applySnapshot(g.snap);
    beginPlay();
    toast("Jogo carregado. Boa sorte!", 2);
  }

  function flashSaved() {
    const e = $("save-status");
    e.textContent = store.persistent ? "✓ salvo" : "salvo só nesta página";
    e.classList.add("on");
    clearTimeout(saveFlashTimer);
    saveFlashTimer = setTimeout(() => e.classList.remove("on"), 1400);
  }

  const accountGone = () => gameIsAccount && !store.hasAccount(gamePlayer); // a conta desta partida foi apagada em outra aba
  function saveNow() {
    const me = gamePlayer;
    if (!me || (state !== "playing" && state !== "paused") || accountGone()) return false;
    const ok = store.saveGame(me, snapshot());
    flashSaved();
    return ok;
  }

  const levelTitle = (id) => BUILT[id]?.title || `Fase ${id}`;

  function describeSave(sv) {
    const L = BUILT[sv.l], gotR = sv.items.filter((i) => i[2] === 1 && i[4] !== 1).length, gotB = sv.items.filter((i) => i[2] === 1 && i[4] === 1).length;
    return `${levelTitle(sv.l)} · ${fmt(sv.time * 1000)} · ${gotR}/${L.rations} rações${L.bones ? ` · ${gotB}/${L.bones} ossos` : ""} · ${sv.lives} ${sv.lives === 1 ? "vida" : "vidas"}`;
  }

  // "Novo jogo": pede nome se ainda não há um, confirma antes de apagar um jogo salvo e deixa escolher a fase liberada.
  function requestNewGame() {
    if (!store.player()) { openName(true); return; }
    const g = savedGame();
    if (!g) { chooseLevel(); return; }
    $("confirm-text").textContent = `${store.player()} já tem um jogo salvo (${describeSave(g.snap)}). Se você começar um novo jogo, esse progresso será apagado.`;
    showScreen("confirm");
  }

  // "play" = Iniciar jogo (escolhe entre as fases liberadas); "replay" = Jogar fases anteriores (só as já concluídas, para melhorar o recorde de cada uma)
  let levelsMode = "play";
  function chooseLevel() {
    const unlocked = store.progress(store.player()).unlocked;
    if (levelsMode === "play" && LEVELS.filter((l) => l.id <= unlocked).length <= 1) { begin(LEVELS[0].id); return; }
    renderLevels();
    showScreen("levels");
  }

  function renderLevels() {
    const me = store.player(), prog = store.progress(me), unlocked = prog.unlocked, list = $("levels-list"), replay = levelsMode === "replay";
    $("levels-title").textContent = replay ? "Jogar fases anteriores" : "Escolher a fase";
    $("levels-help").textContent = replay
      ? "Escolha uma fase que você já concluiu para tentar melhorar o seu recorde. Só a maior pontuação de cada fase vale (a pontuação total é a soma do melhor de cada fase) e você começa a fase com 3 vidas."
      : "Termine uma fase para liberar a próxima. As vidas que sobrarem passam para a fase seguinte, mas aqui você começa a fase escolhida com 3 vidas.";
    list.replaceChildren();
    const shown = replay ? LEVELS.filter((l) => prog.completed.includes(l.id)) : LEVELS;
    if (replay && !shown.length) list.append(el("p", "muted", "Você ainda não concluiu nenhuma fase."));
    const focusId = replay ? shown.length && shown[0].id : Math.min(unlocked, LEVELS.length); // o foco abre na fase que o jogador provavelmente quer: a última liberada (em "Jogar fases anteriores", a primeira da lista)
    for (const l of shown) {
      const open = l.id <= unlocked, best = store.personalBest(me, l.id);
      const b = el("button", open ? "primary-ish" : "locked");
      b.type = "button"; b.disabled = !open;
      b.append(el("strong", null, l.title), el("span", "sub", open
        ? `${l.vets.length} ${l.vets.length === 1 ? "veterinário" : "veterinários"}${BUILT[l.id].note ? ` · ${BUILT[l.id].note}` : ""} · ${best ? `sua melhor: ${best.p} pts${replay ? " · jogue de novo para melhorar" : ""}` : "ainda não jogada"}`
        : `bloqueada: termine a ${levelTitle(l.id - 1)}`));
      if (open) {
        if (l.id === focusId) b.dataset.autofocus = "";
        b.addEventListener("click", () => { // a lista pode estar velha (outra aba trocou o jogador): confere antes de começar
          if (store.progress(store.player()).unlocked < l.id) { renderLevels(); toast(`A ${l.title} está bloqueada: termine a ${levelTitle(l.id - 1)}.`, 2.4); return; }
          begin(l.id);
        });
      }
      list.append(b);
    }
  }


  function pauseGame() {
    if (state !== "playing") return;
    saveNow(); // pausar também salva
    setState("paused");
    $("pause-msg").textContent = "";
    showScreen("pause");
  }
  function resumeGame() { if (state !== "paused") return; setState("playing"); showScreen(null); last = performance.now(); }

  // Tempo oficial: arredondado ao décimo de segundo (é o que aparece na tela e o que conta para o bônus).
  const officialTimeMs = () => Math.round(time * 10) * 100;

  function win() {
    const timeMs = officialTimeMs();
    const bonus = Records.timeBonus(timeMs, lv.bonusStep);
    const points = Records.levelPoints(collected, timeMs, livesLost, retries, { bones: bonesGot, postmen, bonusStep: lv.bonusStep, lifePenalty: lv.lifePenalty }); // rações + ossos + bônus − vidas perdidas − tentativas extras
    score = points;
    setState("won");
    carriedLives = lives;
    const next = LEVELS.find((l) => l.id === levelId + 1);
    $("win-title").textContent = `${lv.title} concluída!`;
    $("win-points").textContent = String(points);
    $("win-breakdown").textContent = `Rações: ${collected * Records.RATION_POINTS}` + (lv.bones ? ` + ossos: ${bonesGot * Records.BONE_POINTS}` : "") + (postmen ? ` + carteiros: ${postmen * Records.POSTMAN_POINTS}` : "") + ` + bônus de tempo: ${bonus}` +
      (livesLost ? ` − vidas perdidas: ${livesLost * lv.lifePenalty}` : "") +
      (retries ? ` − tentativas extras: ${retries * Records.RETRY_PENALTY}` : "") + ` · tempo: ${fmt(timeMs)}`;
    $("win-extra").textContent = `Vidas restantes: ${lives} · Vidas perdidas: ${livesLost}` +
      (next ? ` · Você leva ${lives} ${lives === 1 ? "vida" : "vidas"} para a ${next.title}` : "");
    $("btn-next").classList.toggle("hidden", !next);
    $("btn-next").textContent = next ? `Próxima fase (${next.title})` : "";
    $("btn-again").classList.toggle("primary", !next);
    let res = null;
    const gone = accountGone();
    try {
      if (!gone) res = store.addRun({ level: levelId, timeMs, points, name: gamePlayer });
      const me = gone ? "" : gamePlayer;
      if (me) { store.completeLevel(me, levelId); store.clearGame(me); } // fase concluída: o jogo em andamento termina
      if (res && res.newPersonal) board.submit({ name: res.personalBest.n, level: levelId, points: res.personalBest.p, timeMs: res.personalBest.t });
    } catch { /* seguem sem registrar */ }
    if (res) {
      const best = res.personalBest.p;
      $("win-personal").textContent = res.first ? "Primeira pontuação desta fase registrada!"
        : res.newPersonal ? (res.gained > 0 ? `Nova melhor pontuação da fase! Antes: ${res.previousPersonal.p}.`
          : `Mesma pontuação da sua melhor (${best}), em menos tempo: novo recorde pessoal!`)
        : `Sua melhor pontuação nesta fase continua ${best}. Na mesma fase não soma: vale a maior.`;
      // o ranking é por aparelho (o compartilhado está em stand by): o recorde é o deste aparelho
      $("win-general").textContent = res.newGeneral ? "Novo recorde deste aparelho!"
        : `Recorde deste aparelho: ${res.generalBest.p} pontos (${res.generalBest.n})`;
      $("win-total").textContent = `Pontuação total: ${store.totalScore(gamePlayer, LEVEL_IDS)}${res.gained > 0 ? ` (+${res.gained})` : ""}`;
    } else {
      $("win-personal").textContent = gone ? "Esta conta foi apagada em outra aba: a pontuação não foi guardada." : "Escolha um nome de usuário para guardar as suas pontuações.";
      $("win-general").textContent = "";
      $("win-total").textContent = "";
    }
    showScreen("win");
  }

  // Sem vidas: até 3 novas tentativas da mesma fase (do zero), cada uma custa 100 pontos.
  function gameOver(why) {
    setState("lost");
    if (gamePlayer) store.clearGame(gamePlayer); // acabaram as vidas (ou os pontos não bastaram): não há o que continuar
    const left = MAX_RETRIES - retries;
    $("lose-title").textContent = why === "crush" ? "O bloco esmagou o cachorrinho!" : why === "short" ? "Os pontos não bastaram!" : "O veterinário pegou o cachorrinho!";
    $("lose-lead").textContent = why === "short" ? "Você pegou tudo, mas a pontuação ficou abaixo do mínimo para abrir a saída." : "Acabaram as suas vidas.";
    $("lose-text").textContent = `Rações coletadas: ${collected}/${lv.rations}${lv.bones ? ` · Ossos: ${bonesGot}/${lv.bones}` : ""} · Pontos: ${score}${lv.minPoints ? ` (mínimo ${lv.minPoints})` : ""}`;
    $("lose-chances").textContent = left > 0
      ? `Você ainda pode tentar a ${lv.title} de novo ${left} ${left === 1 ? "vez" : "vezes"}. Cada nova tentativa começa a fase do zero e custa ${Records.RETRY_PENALTY} pontos.`
      : `Acabaram as suas chances nesta fase (as ${MAX_RETRIES} novas tentativas já foram usadas).`;
    $("btn-retry").classList.toggle("hidden", left <= 0);
    $("btn-retry").textContent = left > 0 ? `Tentar novamente (−${Records.RETRY_PENALTY} pontos)` : "";
    $("btn-lose-menu").classList.toggle("primary", left <= 0);
    showScreen("lose");
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // "Versão 0.3.0 · 07/10/2026" (e "· build abc1234" quando publicado no GitHub Pages): para saber qual versão está aberta.
  function versionText() {
    const v = window.GAME_VERSION;
    if (!v || typeof v.number !== "string") return "Versão desconhecida";
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.date || "");
    const stage = typeof v.stage === "string" && v.stage.trim() ? ` (${v.stage.trim().slice(0, 30)})` : ""; // ex.: "em preparação"
    return `Versão ${v.number}${stage}${m ? ` · ${m[3]}/${m[2]}/${m[1]}` : ""}${v.build && v.build !== "dev" ? ` · build ${v.build}` : ""}`;
  }

  function renderMenu() {
    $("menu-version").textContent = versionText();
    const me = store.player();
    $("menu-player").textContent = me ? me + (store.hasAccount(me) ? " (conta com senha)" : "") : "ainda não escolhido";
    $("btn-logout").classList.toggle("hidden", !(me && store.hasAccount(me)));
    $("menu-note").classList.toggle("hidden", store.persistent);
    const bests = me ? LEVELS.map((l) => [l, store.personalBest(me, l.id)]).filter(([, b]) => b) : [];
    $("menu-best").textContent = bests.length ? `Suas melhores: ${bests.map(([l, b]) => `${l.title} ${b.p}`).join(" · ")}` : "";
    const done = me ? store.progress(me).completed.filter((l) => LEVEL_IDS.includes(l)).length : 0;
    $("menu-progress").textContent = me ? `Fases concluídas: ${done}/${LEVELS.length} · Pontuação total: ${store.totalScore(me, LEVEL_IDS)}` : "";
    const g = savedGame();
    $("btn-continue").classList.toggle("hidden", !g);
    $("btn-start").classList.toggle("primary", !g);
    $("btn-replay").classList.toggle("hidden", !(me && done >= 1)); // só depois de concluir alguma fase
    $("menu-save").classList.toggle("hidden", !g);
    if (g) $("menu-save").textContent = `Jogo salvo: ${describeSave(g.snap)}`;
  }

  // ---------- Pontuações: as suas (só você vê) e o ranking do jogo (todos veem; só a melhor de cada jogador) ----------
  let scoresToken = 0;
  const isMe = (n) => { const me = store.player(); return !!me && Records.nameKey(n) === Records.nameKey(me); };

  function renderPublicRanking(data, loading = false) {
    const box = $("scores-public");
    box.replaceChildren();
    $("scores-source").textContent = data.shared
      ? `Ranking compartilhado: jogadores de vários aparelhos (${data.label}).`
      : board.hasServer
        ? (loading ? "Buscando o ranking compartilhado… (por enquanto, só os jogadores deste aparelho)" : "Não foi possível falar com o servidor de ranking agora: mostrando só os jogadores deste aparelho.")
        : "Ranking deste aparelho: aparecem todos os jogadores que jogaram aqui, só com a melhor pontuação de cada um.";

    const tot = el("section", "score-level");
    tot.append(el("h3", null, "Ranking geral (pontuação total)"));
    if (data.totals.length) {
      const ol = el("ol");
      for (const r of data.totals) ol.append(el("li", isMe(r.n) ? "me" : "", `${r.n} — ${r.total} pontos`));
      tot.append(ol);
    } else tot.append(el("p", null, "Ninguém terminou uma fase ainda."));
    box.append(tot);

    for (const l of LEVELS) {
      const sec = el("section", "score-level");
      sec.append(el("h3", null, `Ranking da ${l.title}`));
      const rows = data.levels[l.id] || [];
      if (rows.length) {
        const ol = el("ol");
        for (const r of rows) ol.append(el("li", isMe(r.n) ? "me" : "", `${r.n} — ${r.p} pts (${fmt(r.t)})`));
        sec.append(ol);
      } else sec.append(el("p", null, "Ninguém terminou esta fase ainda."));
      box.append(sec);
    }
  }

  function renderScores() {
    const me = store.player(), priv = $("scores-private");
    priv.replaceChildren();
    if (me) {
      priv.append(el("h2", null, "Suas pontuações"));
      priv.append(el("p", "big-total", `${store.totalScore(me, LEVEL_IDS)} pontos`));
      priv.append(el("p", "muted", `${me}: soma da melhor pontuação de cada fase. Só você vê esta parte.`));
      const dl = el("dl");
      for (const l of LEVELS) {
        const pb = store.personalBest(me, l.id);
        dl.append(el("dt", null, `Sua melhor na ${l.title}`), el("dd", null, pb ? `${pb.p} pts · ${fmt(pb.t)}` : "ainda não jogada"));
      }
      priv.append(dl);
    } else {
      priv.append(el("h2", null, "Suas pontuações"));
      priv.append(el("p", "muted", "Escolha um nome de usuário para guardar as suas pontuações. Elas só aparecem para você."));
    }
    $("scores-note").classList.toggle("hidden", store.persistent);

    const token = ++scoresToken;
    renderPublicRanking(board.localAll(), true); // mostra já o que há neste aparelho
    if (board.hasServer) board.fetchAll().then((data) => { if (token === scoresToken && document.body.dataset.screen === "scores") renderPublicRanking(data); }).catch(() => {});
  }

  let nameThenStart = false;
  function openName(thenStart) {
    nameThenStart = !!thenStart;
    $("name-input").value = store.player();
    $("name-error").textContent = "";
    $("name-why").classList.toggle("hidden", !thenStart);
    $("name-note").classList.toggle("hidden", store.persistent);
    const chips = $("name-chips"), list = store.players();
    chips.replaceChildren();
    for (const n of list) {
      const locked = store.hasAccount(n);
      const b = el("button", null, locked ? `${n} (com senha)` : n); b.type = "button";
      b.addEventListener("click", () => (locked ? openLogin(n) : saveName(n)));
      chips.append(b);
    }
    $("name-saved").classList.toggle("hidden", list.length === 0);
    showScreen("name");
    $("name-input").select();
  }

  function saveName(raw) {
    const clean = Records.sanitizeName(raw), me = store.player();
    if (clean && me && store.isLoggedIn() && Records.nameKey(clean) === Records.nameKey(me)) { // é a conta em que a pessoa já entrou
      renderMenu();
      if (nameThenStart) requestNewGame(); else goMenu();
      return;
    }
    if (clean && store.hasAccount(clean)) {
      $("name-error").textContent = "Esse nome tem uma conta com senha. Toque em Entrar para usá-lo.";
      $("name-input").focus();
      return;
    }
    const p = store.setPlayer(raw);
    if (!p) {
      $("name-error").textContent = "Escreva um nome com pelo menos uma letra ou número. Exemplo: Totó.";
      $("name-input").focus();
      return;
    }
    renderMenu();
    if (nameThenStart) requestNewGame(); else goMenu();
  }

  // ---------- Cadastro simples: usuário e senha (só neste aparelho) ----------
  const NAME_HELP = "Use de 1 a 16 letras ou números (pode ter espaço, hífen ou apóstrofo). Exemplo: Totó.";
  const PW_MESSAGES = {
    empty: "Escreva uma senha.",
    short: `A senha precisa ter pelo menos ${Auth.PASSWORD_MIN} caracteres.`,
    long: `A senha pode ter no máximo ${Auth.PASSWORD_MAX} caracteres.`,
    invalid: "A senha tem caracteres que não podem ser usados.",
  };
  let authBusy = false;

  function clearAuthFields(ids, showId) { // as senhas não ficam esperando nos campos
    for (const id of ids) { const f = $(id); f.value = ""; if (f.type === "text" && id.includes("pass")) f.type = "password"; }
    $(showId).checked = false;
    for (const id of ids) if (id.includes("pass")) $(id).type = "password";
    const err = $(showId === "reg-show" ? "reg-error" : "login-error");
    if (err) err.textContent = "";
    if (showId === "reg-show") { $("reg-count").textContent = `0/${Auth.PASSWORD_MAX}`; $("reg-count").classList.remove("over"); }
  }

  async function withBusy(button, busyText, fn) { // evita enviar duas vezes enquanto a senha é processada
    if (authBusy) return;
    authBusy = true;
    const label = button.textContent;
    button.disabled = true; button.textContent = busyText;
    try { await fn(); } finally { authBusy = false; button.disabled = false; button.textContent = label; }
  }

  function openRegister(prefill = "") {
    showScreen("register");
    $("reg-user").value = prefill;
    $((prefill ? "reg-pass" : "reg-user")).focus();
  }

  function openLogin(prefill = "") {
    showScreen("login");
    $("login-user").value = prefill;
    $((prefill ? "login-pass" : "login-user")).focus();
  }

  function afterAuth() {
    renderMenu();
    if (nameThenStart) requestNewGame(); else goMenu();
  }

  $("register-form").addEventListener("submit", (e) => {
    e.preventDefault();
    withBusy($("btn-register-submit"), "Criando…", async () => {
      const user = $("reg-user").value, p1 = $("reg-pass").value, p2 = $("reg-pass2").value, err = $("reg-error");
      const fail = (msg, id) => { err.textContent = msg; $(id).focus(); };
      err.textContent = "";
      if (!Records.isValidName(user)) return fail(NAME_HELP, "reg-user");
      const why = Auth.validatePassword(p1);
      if (why) return fail(PW_MESSAGES[why], "reg-pass");
      if (p1 !== p2) return fail("As duas senhas precisam ser iguais.", "reg-pass2");
      let r;
      const seq = screenSeq;
      try { r = await store.register(user, p1); } catch { r = { ok: false, error: "crypto" }; }
      if (seq !== screenSeq) { renderMenu(); return; } // a pessoa já saiu desta tela (Esc/Voltar): não puxa de volta
      if (!r.ok) {
        if (r.error === "taken") return fail("Esse nome de usuário já tem uma conta. Toque em Voltar e depois em Entrar.", "reg-user");
        if (r.error === "name") return fail(NAME_HELP, "reg-user");
        if (r.error === "password") return fail(PW_MESSAGES[r.reason] || PW_MESSAGES.invalid, "reg-pass");
        return fail("Não foi possível criar a conta neste navegador.", "reg-user");
      }
      afterAuth();
    });
  });

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    withBusy($("btn-login-submit"), "Entrando…", async () => {
      const user = $("login-user").value, pass = $("login-pass").value, err = $("login-error");
      const fail = (msg, id) => { err.textContent = msg; $(id).focus(); };
      err.textContent = "";
      if (!user.trim()) return fail("Escreva o seu nome de usuário.", "login-user");
      if (!pass) return fail("Escreva a sua senha.", "login-pass");
      let r;
      const seq = screenSeq;
      try { r = await store.login(user, pass); } catch { r = { ok: false, error: "wrong" }; }
      if (seq !== screenSeq) { renderMenu(); return; } // a pessoa já saiu desta tela (Esc/Voltar): não puxa de volta
      if (!r.ok) {
        $("login-pass").value = "";
        return fail(r.error === "locked" ? `Muitas tentativas erradas. Tente de novo em ${Math.ceil(r.waitMs / 1000)} segundos.` : "Usuário ou senha incorretos.", "login-pass");
      }
      afterAuth();
    });
  });

  $("reg-pass").addEventListener("input", () => { // contador de caracteres da senha (n/20)
    const n = Array.from($("reg-pass").value.normalize("NFC")).length;
    $("reg-count").textContent = `${n}/${Auth.PASSWORD_MAX}`;
    $("reg-count").classList.toggle("over", n > Auth.PASSWORD_MAX);
  });

  for (const [box, ids] of [["reg-show", ["reg-pass", "reg-pass2"]], ["login-show", ["login-pass"]]]) {
    $(box).addEventListener("change", (e) => { for (const id of ids) $(id).type = e.target.checked ? "text" : "password"; });
  }

  let forgotName = "";
  function openForgot() {
    const typed = $("login-user").value;
    forgotName = store.accountNames().find((n) => Records.nameKey(n) === Records.nameKey(typed.trim())) || "";
    if (!forgotName) { $("login-error").textContent = "Escreva o seu nome de usuário primeiro, depois toque em Esqueci a senha."; $("login-user").focus(); return; }
    $("forgot-text").textContent = `Este jogo guarda tudo só neste aparelho e não tem como recuperar uma senha. Você pode apagar a conta de ${forgotName} (com as pontuações e o jogo salvo dela) e criar uma nova.`;
    showScreen("forgot");
  }

  // ---------- Câmera e tamanho (proporcional a cada aparelho) ----------
  function fitCanvas() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = clamp(Math.round(r.width * dpr), 200, MAX_BACKING_W), bh = Math.round((bw * VIEW_H) / VIEW_W);
    const resized = canvas.width !== bw || canvas.height !== bh;
    if (resized) { canvas.width = bw; canvas.height = bh; } // (isto apaga o desenho: quem chama redesenha logo em seguida)
    view.k = bw / VIEW_W;
    view.zoom = clamp(MIN_TILE_CSS / (r.width / VIEW_COLS), 1, 2); // telas pequenas: aproxima e segue o cachorro
    return resized;
  }

  // O placar ocupa 1, 2 ou mais linhas conforme a largura: o tamanho do jogo reserva a altura REAL dele (variável --hud-h), senão a página rolaria.
  // Mas reservar mais deixa o jogo mais estreito, e isso pode mudar a quebra de linha do placar. Para a conta sempre terminar, enquanto nada muda
  // (janela, itens do placar, vidas) a reserva só CRESCE: ela fica na maior altura medida e para (sem ficar alternando entre dois valores).
  let hudReserve = 0, hudMax = 0, hudKey = "", hudRaf = 0;
  function syncHudHeight() {
    hudRaf = 0;
    const hud = $("hud"), r = hud.getBoundingClientRect();
    if (!r.height) return;
    const key = `${innerWidth}x${innerHeight}|${[...hud.querySelectorAll(".hud-item")].map((e) => (e.classList.contains("hidden") ? 0 : 1)).join("")}|${lives}`;
    if (key !== hudKey) { hudKey = key; hudMax = 0; } // outra situação: mede de novo, do zero
    hudMax = Math.max(hudMax, Math.ceil(r.height + (parseFloat(getComputedStyle(hud).marginBottom) || 0)));
    if (Math.abs(hudMax - hudReserve) <= 1) return;
    hudReserve = hudMax;
    document.body.style.setProperty("--hud-h", `${hudMax}px`);
  }
  function scheduleHudSync() { if (!hudRaf) hudRaf = requestAnimationFrame(syncHudHeight); }

  // ---------- Desenho do mundo ----------
  function ellipse(x, y, rx, ry, color, rot = 0) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  }

  function drawKibble(it) { // tigela de ração
    const cx = it.x + 8, cy = it.y + 8 + (calm ? 0 : Math.sin(time * 4 + it.x) * 2);
    ellipse(cx, cy + 5, 10, 4, "rgba(0,0,0,.25)");
    for (const [dx, dy] of [[-5, 0], [0, -2], [5, 0], [-2, 1], [3, 1], [0, 2]]) ellipse(cx + dx, cy + dy, 3.2, 2.6, "#8b5a2b");
    ellipse(cx - 1, cy - 3, 2.6, 2.2, "#a8703a");
    ctx.fillStyle = "#e5533d"; ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 1); ctx.lineTo(cx + 10, cy + 1); ctx.lineTo(cx + 7, cy + 8); ctx.lineTo(cx - 7, cy + 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(cx - 8, cy + 3, 16, 1.5);
  }

  function drawBone(it) { // osso: vale 150 pontos (50 + 100 de bônus)
    const cx = it.x + 8, cy = it.y + 8 + (calm ? 0 : Math.sin(time * 4 + it.x) * 2);
    ellipse(cx, cy + 7, 11, 3.5, "rgba(0,0,0,.25)");
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.45);
    ctx.fillStyle = "#f6f1e3"; ctx.strokeStyle = "#a99c7c"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.rect(-8, -2.4, 16, 4.8); ctx.fill(); ctx.stroke();
    for (const [x, y] of [[-8.5, -3], [-8.5, 3], [8.5, -3], [8.5, 3]]) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    ctx.fillRect(-8, -2, 16, 4); // esconde o contorno entre a haste e as pontas
    ctx.restore();
  }

  function drawBlocks() { // trilhos (todo o caminho que cada bloco ou parede percorre, de ponta a ponta) e os blocos que se movem
    ctx.lineCap = "butt";
    for (const b of blocks) {
      const d = b.d, vertical = d.ax === d.bx;
      const x1 = vertical ? d.ax + d.w / 2 : Math.min(d.ax, d.bx), x2 = vertical ? x1 : Math.max(d.ax, d.bx) + d.w;
      const y1 = vertical ? Math.min(d.ay, d.by) : d.ay + d.h / 2, y2 = vertical ? Math.max(d.ay, d.by) + d.h : y1;
      ctx.strokeStyle = "#3b4663"; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const warn = blockWarn(d, b.bt); // aviso: o trilho pisca em amarelo logo antes de o bloco mudar de lado (com "reduzir movimento": amarelo fixo, sem piscar)
      ctx.strokeStyle = warn ? `rgba(242,194,48,${(calm ? 0.8 : 0.35 + 0.5 * Math.abs(Math.sin(time * 18))).toFixed(2)})` : "#10131c";
      ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }

  // Parede que se move (Fase 5): pedra como as paredes, com faixas amarelas nas pontas para avisar que ela anda.
  function drawMovingWall(s) {
    ctx.fillStyle = "#4a5470"; ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = "#5d6a8c"; ctx.fillRect(s.x, s.y, s.w, 4);
    ctx.fillStyle = "#f2c230";
    const vertical = s.h >= s.w, n = Math.round((vertical ? s.h : s.w) / TILE);
    for (let i = 0; i < n; i++) {
      const x = s.x + (vertical ? 0 : i * TILE), y = s.y + (vertical ? i * TILE : 0);
      ctx.fillRect(x + 3, y + 3, 5, 5); ctx.fillRect(x + TILE - 8, y + TILE - 8, 5, 5);
    }
    ctx.strokeStyle = "#2c3347"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
  }
  function drawMovingBlock(s) {
    ctx.fillStyle = "#6b7794"; ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.fillStyle = "#aeb8d0"; ctx.fillRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
    ctx.fillStyle = "#f2c230"; // faixas amarelas de aviso nos cantos
    for (const [dx, dy] of [[4, 4], [s.w - 12, 4], [4, s.h - 12], [s.w - 12, s.h - 12]]) ctx.fillRect(s.x + dx, s.y + dy, 8, 8);
    ctx.strokeStyle = "#3b4663"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 5, s.y + 5, s.w - 10, s.h - 10);
  }

  function drawDog(p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    const wag = calm ? 0 : Math.sin(time * 16) * (p.moving ? 5 : 2);
    const leg = p.moving ? Math.sin(time * 18) * 3 : 0;
    const TAN = "#d9a066", DARK = "#7a4a22", LIGHT = "#f1d2a6";
    ellipse(cx, cy + 10, 12, 4, "rgba(0,0,0,.25)");
    ctx.lineCap = "round";
    if (p.facing === "left" || p.facing === "right") {
      const s = p.facing === "right" ? 1 : -1;
      ctx.strokeStyle = DARK; ctx.lineWidth = 3; // rabo
      ctx.beginPath(); ctx.moveTo(cx - s * 9, cy - 1); ctx.quadraticCurveTo(cx - s * 15, cy - 5 + wag, cx - s * 14, cy - 9 + wag); ctx.stroke();
      ctx.fillStyle = DARK; // patas
      ctx.fillRect(cx - s * 7 - 2 + leg, cy + 4, 4, 7); ctx.fillRect(cx + s * 4 - 2 - leg, cy + 4, 4, 7);
      ellipse(cx - s * 2, cy + 1, 10, 7, TAN);                 // corpo
      ellipse(cx - s * 4, cy - 1, 5, 4, DARK);                 // mancha
      ellipse(cx + s * 8, cy - 3, 7, 6.5, TAN);                // cabeça
      ellipse(cx + s * 13, cy - 1, 4, 3, LIGHT);               // focinho
      ellipse(cx + s * 15.5, cy - 1.5, 1.6, 1.4, "#222");      // nariz
      ellipse(cx + s * 4, cy - 4, 2.6, 5, DARK, s * 0.25);     // orelha
      ellipse(cx + s * 10, cy - 5, 1.4, 1.4, "#222");          // olho
    } else {
      const s = p.facing === "down" ? 1 : -1;
      ctx.strokeStyle = DARK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 6); ctx.lineTo(cx + wag, cy - s * 13); ctx.stroke(); // rabo
      ctx.fillStyle = DARK;
      ctx.fillRect(cx - 8, cy - 2 + leg, 4, 6); ctx.fillRect(cx + 4, cy - 2 - leg, 4, 6);
      ellipse(cx, cy - s * 1, 8, 9, TAN);                      // corpo
      ellipse(cx, cy + s * 8, 7, 6.5, TAN);                    // cabeça
      ellipse(cx - 7, cy + s * 7, 2.6, 5, DARK, -0.2);         // orelhas
      ellipse(cx + 7, cy + s * 7, 2.6, 5, DARK, 0.2);
      if (s === 1) {
        ellipse(cx, cy + 11, 3.6, 2.8, LIGHT);
        ellipse(cx, cy + 12, 1.6, 1.3, "#222");
        ellipse(cx - 3, cy + 7, 1.3, 1.3, "#222"); ellipse(cx + 3, cy + 7, 1.3, 1.3, "#222");
      }
    }
  }

  // Carteiro (os veterinários enquanto dura o poder do osso): uniforme azul, boné com distintivo amarelo, bolsa de correspondência e uma carta.
  function drawPostman(v) {
    if (v.slow) ctx.globalAlpha = 0.55; // carteiro já pego neste poder (não rende mais pontos): fica esmaecido
    const x = v.cx, y = v.cy + (calm ? 0 : Math.sin(time * 6 + v.cx) * (v.leg ? 1 : 0));
    ellipse(x, y + 12, 11, 4, "rgba(0,0,0,.25)");
    ctx.fillStyle = "#1e3a6e"; ctx.fillRect(x - 6, y + 4, 5, 9); ctx.fillRect(x + 1, y + 4, 5, 9);   // calça
    ctx.fillStyle = "#3f7fd6"; ctx.fillRect(x - 10, y - 7, 20, 15);                                  // camisa
    ctx.fillStyle = "#336bb8"; ctx.fillRect(x - 12, y - 6, 3, 10); ctx.fillRect(x + 9, y - 6, 3, 10); // braços
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x - 10, y - 7, 4, 15); ctx.fillRect(x - 10, y + 3, 17, 5); // alça e bolsa
    ctx.fillStyle = "#fff"; ctx.fillRect(x + 7, y - 1, 7, 5); ctx.strokeStyle = "#c33"; ctx.lineWidth = 1; ctx.strokeRect(x + 7.5, y - 0.5, 6, 4); // carta
    ellipse(x, y - 12, 6, 6, "#f0c8a0");                                                              // cabeça
    ctx.fillStyle = "#1e3a6e"; ctx.beginPath(); ctx.arc(x, y - 13, 6.6, Math.PI, 0); ctx.fill();       // boné
    ctx.fillRect(x - 8, y - 13.5, 16, 2.5);
    ctx.fillStyle = "#f2c230"; ctx.fillRect(x - 1.5, y - 18, 3, 3);                                     // distintivo
    ellipse(x - 2.2 + v.dir, y - 11, 1, 1, "#222"); ellipse(x + 2.2 + v.dir, y - 11, 1, 1, "#222");
    if (v.hitCool > 0) { // tonto: estrelinhas girando em volta da cabeça
      ctx.fillStyle = "#ffe066";
      for (let k = 0; k < 3; k++) { const a = time * 7 + k * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, y - 22 + Math.sin(a) * 3, 2.2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawVet(v) {
    if (power > 0) { drawPostman(v); return; }
    const x = v.cx, y = v.cy + (calm ? 0 : Math.sin(time * 6 + v.cx) * (v.leg ? 1 : 0));
    ellipse(x, y + 12, 11, 4, "rgba(0,0,0,.25)");
    ctx.fillStyle = "#2f4a6b"; ctx.fillRect(x - 6, y + 4, 5, 9); ctx.fillRect(x + 1, y + 4, 5, 9); // calça
    ctx.fillStyle = "#f4f7fa"; ctx.fillRect(x - 10, y - 7, 20, 15); // jaleco
    ctx.fillStyle = "#e1e8ef"; ctx.fillRect(x - 12, y - 6, 3, 10); ctx.fillRect(x + 9, y - 6, 3, 10);   // braços
    ctx.fillStyle = "#18a999"; ctx.fillRect(x - 1.5, y - 4, 3, 9); ctx.fillRect(x - 4.5, y - 1, 9, 3);  // cruz
    ellipse(x, y - 12, 6, 6, "#f0c8a0");                                                                // cabeça
    ctx.fillStyle = "#18a999"; ctx.beginPath(); ctx.arc(x, y - 13, 6.4, Math.PI, 0); ctx.fill();        // touca
    ctx.fillRect(x - 7, y - 13.5, 14, 2);
    ellipse(x - 2.2 + v.dir, y - 11, 1, 1, "#222"); ellipse(x + 2.2 + v.dir, y - 11, 1, 1, "#222");
    if (v.mode === "chase") {
      ctx.fillStyle = "#ff4d4d"; ctx.font = "bold 26px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", x, y - 22 - (calm ? 0 : Math.abs(Math.sin(time * 12)) * 4));
    }
  }

  function draw() {
    if (state === "menu" || !solids) return;
    const sx = view.k * view.zoom;
    const vw = VIEW_W / view.zoom, vh = VIEW_H / view.zoom; // o que cabe na tela, em pixels do mundo (a câmera segue o cachorro; nas bordas do mapa ela para)
    const camX = Math.round(clamp(player.x + player.w / 2 - vw / 2, 0, Math.max(0, WORLD_W - vw)) * sx) / sx;
    const camY = Math.round(clamp(player.y + player.h / 2 - vh / 2, 0, Math.max(0, WORLD_H - vh)) * sx) / sx;
    view.camX = camX; view.camY = camY;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#1d2330"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(sx, 0, 0, sx, -camX * sx, -camY * sx);

    // retângulos alinhados aos pixels do aparelho: sem frestas entre os blocos em nenhum tamanho
    const snap = (v) => Math.round(v * sx) / sx;
    const rect = (x, y, w, h) => { const x0 = snap(x), y0 = snap(y); ctx.fillRect(x0, y0, snap(x + w) - x0, snap(y + h) - y0); };

    const c0 = Math.max(0, Math.floor(camX / TILE)), c1 = Math.min(COLS - 1, Math.floor((camX + vw) / TILE)), r0 = Math.max(0, Math.floor(camY / TILE)), r1 = Math.min(ROWS - 1, Math.floor((camY + vh) / TILE));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { // só os tiles que aparecem na tela
      ctx.fillStyle = (r + c) % 2 ? "#232a3a" : "#262e40";
      rect(c * TILE, r * TILE, TILE, TILE);
    }
    ctx.fillStyle = exitOpen() ? "#3ddc84" : "#7a4b4b";
    rect(exitRect.x, exitRect.y, exitRect.w, exitRect.h);
    ctx.fillStyle = exitOpen() ? "#06210f" : "#fff"; ctx.font = "bold 14px system-ui, sans-serif"; ctx.textAlign = "center"; // contraste nos dois estados
    ctx.fillText("SAÍDA", exitRect.x + exitRect.w / 2, exitRect.y + exitRect.h / 2 + 5);
    drawBlocks();
    for (const s of solids) {
      if (s.kind === "M") drawMovingBlock(s);
      else if (s.kind === "W") drawMovingWall(s);
      else if (s.kind === "#") {
        ctx.fillStyle = "#4a5470"; rect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = "#5d6a8c"; rect(s.x, s.y, s.w, 4);
      } else {
        ctx.fillStyle = "#8a5a2b"; rect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
        ctx.strokeStyle = "#5e3b17"; ctx.lineWidth = 2; ctx.strokeRect(s.x + 4, s.y + 4, s.w - 8, s.h - 8);
      }
    }
    for (const it of items) if (!it.taken) (it.bone ? drawBone : drawKibble)(it);
    for (const v of vets) drawVet(v);
    for (const f of puffs) { // carteiro derrotado: nuvem que cresce e some
      ctx.fillStyle = `rgba(255,255,255,${(0.8 * (1 - f.t / 0.8)).toFixed(2)})`;
      for (const [dx, dy] of [[-8, -4], [8, -4], [0, 6], [0, -10]]) { ctx.beginPath(); ctx.arc(f.x + dx * (0.6 + f.t * 1.5), f.y + dy * (0.6 + f.t * 1.5), 5 + f.t * 8, 0, Math.PI * 2); ctx.fill(); }
    }
    if (power > 0) { // aura dourada do poder do osso (pisca nos últimos 5 s)
      const fade = calm || power > 5 || Math.floor(time * 6) % 2 === 0; // com "reduzir movimento" a aura não pisca
      if (fade) { ctx.fillStyle = "rgba(255,214,90,.28)"; ctx.beginPath(); ctx.arc(player.x + 12, player.y + 12, 22 + (calm ? 0 : Math.sin(time * 8) * 2), 0, Math.PI * 2); ctx.fill(); }
    }
    if (!(started && invuln > 0 && Math.floor(time * 10) % 2 === 0)) drawDog(player); // pisca enquanto está protegido (com o relógio parado, antes do primeiro passo, ele fica sempre visível)
  }

  // ---------- Placar (HTML) ----------
  const hudEl = {
    level: $("hud-level"), items: $("hud-items"), bonesItem: $("hud-bones-item"), bones: $("hud-bones"), points: $("hud-points"), time: $("hud-time"), bonus: $("hud-bonus"), bonusItem: $("hud-bonus-item"),
    pointsItem: $("hud-points-item"), powerItem: $("hud-power-item"), power: $("hud-power"),
    retryItem: $("hud-retry-item"), retry: $("hud-retry"), lives: $("hud-lives"), hearts: [...document.querySelectorAll("#hud-lives .heart")],
  };
  const hudCache = {};
  function setHud(key, node, value) { if (hudCache[key] !== value) { hudCache[key] = value; node.textContent = value; } }
  function updateHud() {
    if (!solids) return;
    setHud("lv", hudEl.level, String(levelId));
    if (hudCache.wl !== levelId) { // largura fixa dos números do placar (a do pior caso da fase): quando um valor ganha um dígito o placar não cresce no meio da partida
      hudCache.wl = levelId;
      const wide = (e, text) => { e.style.minWidth = `${text.length}ch`; };
      const top = lv.rations * Records.RATION_POINTS + lv.bones * Records.BONE_POINTS + vets.length * Records.POSTMAN_POINTS + lv.bonusStep * 10; // (pontuação negativa é rara: se acontecer, o placar pode crescer uma vez)
      wide(hudEl.items, `${lv.rations}/${lv.rations}`);
      wide(hudEl.bones, `${lv.bones}/${lv.bones}`);
      wide(hudEl.points, `${"0".repeat(String(top).length)}${lv.minPoints ? ` / ${lv.minPoints}` : ""}`);
      wide(hudEl.power, `${lv.bonePower} s`);
      wide(hudEl.time, "0:00,0");
      wide(hudEl.bonus, `+${lv.bonusStep * 10}`);
    }
    setHud("i", hudEl.items, `${collected}/${lv.rations}`);
    if (hudCache.bn !== lv.bones) { hudCache.bn = lv.bones; hudEl.bonesItem.classList.toggle("hidden", !lv.bones); }
    if (lv.bones) setHud("o", hudEl.bones, `${bonesGot}/${lv.bones}`);
    if (hudCache.bs !== lv.bonusStep) { hudCache.bs = lv.bonusStep; hudEl.bonusItem.title = `Bônus de tempo: ${lv.bonusStep * 10} pontos até 20 s, menos ${lv.bonusStep} a cada 10 s (0 depois de 110 s)`; }
    if (hudCache.mp !== lv.minPoints) { hudCache.mp = lv.minPoints; hudEl.pointsItem.title = lv.minPoints ? `Para passar da ${lv.title} são necessários pelo menos ${lv.minPoints} pontos nesta fase` : ""; }
    setHud("p", hudEl.points, lv.minPoints ? `${score} / ${lv.minPoints}` : String(score));
    if (hudCache.bp !== lv.bonePower) { hudCache.bp = lv.bonePower; hudEl.powerItem.classList.toggle("hidden", !lv.bonePower); }
    if (lv.bonePower) { setHud("pw", hudEl.power, power > 0 ? `${Math.ceil(power)} s` : "—"); const pl = power > 0 ? `Poder do osso: ${Math.ceil(power)} segundos` : "Poder do osso: desligado"; if (hudCache.pwl !== pl) { hudCache.pwl = pl; hudEl.powerItem.setAttribute("aria-label", pl); } }
    setHud("t", hudEl.time, fmt(time * 1000));
    setHud("b", hudEl.bonus, `+${Records.timeBonus(officialTimeMs(), lv.bonusStep)}`);
    if (hudCache.r !== retries) {
      hudCache.r = retries;
      hudEl.retryItem.classList.toggle("hidden", retries === 0);
      hudEl.retry.textContent = `${retries}/${MAX_RETRIES}`;
    }
    if (hudCache.l !== lives) {
      hudCache.l = lives;
      const slots = Math.max(START_LIVES, lives); // mostra 3 corações no começo; ganhar vidas mostra mais, até 5
      hudEl.hearts.forEach((h, i) => { h.classList.toggle("hidden", i >= slots); h.classList.toggle("lost", i < slots && i >= lives); });
      hudEl.lives.setAttribute("aria-label", `${lives} ${lives === 1 ? "vida" : "vidas"}`);
    }
  }

  // ---------- Loop ----------
  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop); // reagenda primeiro: um erro isolado não congela o jogo
    const dt = clamp((now - last) / 1000, 0, 0.05); last = now; // aba parada não gasta o tempo do recorde; nunca negativo
    pollGamepad(dt); // botões do controle (menus, pausa, salvar); o movimento é lido em update()
    if (state === "playing") {
      update(dt);
      if (state === "playing" && (autosaveT += dt) >= AUTOSAVE_EVERY) { autosaveT = 0; saveNow(); }
    }
    draw();
    updateHud();
  }

  // Salvar pelo botão, por Ctrl+S ou pelo controle: avisa na pausa (mensagem da tela) ou no jogo (aviso sobre o mapa).
  function manualSave() {
    const ok = saveNow();
    const msg = !ok ? "Não foi possível salvar o jogo agora." : store.persistent ? "Jogo salvo!" : "Salvo só nesta página: este navegador não guarda dados.";
    if (state === "paused") $("pause-msg").textContent = msg; else toast(msg, 1.8);
  }

  // ---------- Entrada: controle (gamepad) ----------
  // Controle "standard" (Xbox, PlayStation, Switch Pro e a maioria dos outros): analógico esquerdo ou direcional move o cachorrinho;
  // Start pausa/continua; A escolhe; B volta; Y salva; nos menus, direcional/analógico mudam de botão.
  // (Em controles fora do padrão só o analógico esquerdo, eixos 0 e 1, e os botões A, B e Start funcionam.)
  const GP_DEAD = 0.3, GP_FULL = 0.9; // zona morta e inclinação que vale velocidade máxima
  const gpPrev = Object.create(null); // botões apertados no quadro anterior (para pegar só o "apertar")
  let gpNavDir = 0, gpNavT = 0;
  let gpWasThere = false;

  function activePad() {
    if (typeof navigator.getGamepads !== "function") return null;
    let list;
    try { list = navigator.getGamepads(); } catch { return null; }
    for (const g of list || []) if (g && g.connected !== false) return g;
    return null;
  }
  // Controle padrão: todos os botões; fora do padrão só valem A (0), B (1) e Start (9), que quase sempre coincidem.
  const padBtn = (g, i) => !!((g.mapping === "standard" || i === 0 || i === 1 || i === 9) && g.buttons && g.buttons[i] && g.buttons[i].pressed);

  // Direção do controle para o movimento: { x, y } de -1 a 1 (o tamanho vale a velocidade).
  function gamepadMove() {
    const g = activePad();
    if (!g) return { x: 0, y: 0 };
    let x = (padBtn(g, 15) ? 1 : 0) - (padBtn(g, 14) ? 1 : 0), y = (padBtn(g, 13) ? 1 : 0) - (padBtn(g, 12) ? 1 : 0);
    if (x || y) { if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; } return { x, y }; }
    let ax = Number(g.axes && g.axes[0]) || 0, ay = Number(g.axes && g.axes[1]) || 0;
    const m = Math.hypot(ax, ay);
    if (m < GP_DEAD) return { x: 0, y: 0 };
    const k = Math.min(1, (m - GP_DEAD) / (GP_FULL - GP_DEAD)) / m; // zona morta radial; o resto vai de 0 a 1
    ax *= k; ay *= k;
    if (Math.abs(ay) < 0.3 * Math.abs(ax)) ay = 0; else if (Math.abs(ax) < 0.3 * Math.abs(ay)) ax = 0; // quase reto = reto (corredores de 1 tile)
    return { x: ax, y: ay };
  }

  // Botões e navegação (uma vez por quadro). Nos menus o direcional/analógico mudam o foco; A "clica" no botão focado.
  function pollGamepad(dt) {
    const g = activePad();
    if (!g) { gpWasThere = false; for (const k in gpPrev) gpPrev[k] = false; gpNavDir = 0; return; }
    if (!gpWasThere) {
      gpWasThere = true;
      if (state === "playing" || state === "paused") toast("Controle conectado", 1.8);
    }
    const hit = (name, i) => { const now = padBtn(g, i), was = gpPrev[name]; gpPrev[name] = now; return now && !was; };
    const A = hit("a", 0), B = hit("b", 1), Y = hit("y", 3), SELECT = hit("select", 8), START = hit("start", 9);
    const screen = document.body.dataset.screen;

    if (state === "playing" || state === "paused") {
      if (START) { if (state === "playing") pauseGame(); else resumeGame(); return; }
      if (Y) manualSave();
    }
    if (!screen) { gpNavDir = 0; return; } // jogando: o movimento é lido em update()

    if (B || SELECT) { onEscape(); return; }
    if (A || START) {
      const el = document.activeElement;
      if (el && el.closest && el.closest(".screen:not(.hidden)") && (el.tagName === "BUTTON" || (el.tagName === "INPUT" && el.type === "checkbox"))) el.click();
      else moveFocus(1); // em um campo de texto: segue para o próximo botão/campo
      return;
    }
    // navegação: direcional ou analógico (↑ ← = anterior; ↓ → = próximo), com repetição se ficar segurado
    const ax = Number(g.axes && g.axes[0]) || 0, ay = Number(g.axes && g.axes[1]) || 0;
    const prev = padBtn(g, 12) || padBtn(g, 14) || ay < -0.6 || ax < -0.6, next = padBtn(g, 13) || padBtn(g, 15) || ay > 0.6 || ax > 0.6;
    const dir = prev && !next ? -1 : next && !prev ? 1 : 0;
    const longScreen = document.querySelector(".screen:not(.hidden)");
    if (longScreen && longScreen.hasAttribute("data-scroll") && longScreen.scrollHeight > longScreen.clientHeight + 1) { // telas longas (Como jogar, Pontuações): o direcional rola
      gpNavDir = dir;
      if (dir) longScreen.scrollTop += dir * 520 * Math.min(dt, 0.05);
      return;
    }
    if (dir !== gpNavDir) { gpNavDir = dir; gpNavT = 0.4; if (dir) moveFocus(dir); }
    else if (dir && (gpNavT -= dt) <= 0) { gpNavT = 0.12; moveFocus(dir); }
  }
  window.addEventListener("gamepaddisconnected", () => { if (!activePad()) { gpWasThere = false; } });

  // ---------- Entrada: teclado ----------
  const CODE_KEYS = { KeyW: "w", KeyA: "a", KeyS: "s", KeyD: "d" }; // posição física: vale em qualquer layout
  const keyName = (e) => CODE_KEYS[e.code] || (typeof e.key !== "string" ? "" : e.key.length === 1 ? e.key.toLowerCase() : e.key); // (o autopreenchimento do navegador manda eventos sem "key")

  // As Pontuações abertas da tela de vitória voltam para ela (com "Próxima fase" e as vidas); abertas do menu, voltam ao menu.
  let scoresBack = "menu";
  function openScores(from) { scoresBack = from; renderScores(); showScreen("scores"); }
  function closeScores() { if (scoresBack === "win" && state === "won") showScreen("win"); else goMenu(); }

  function onEscape() {
    if (document.body.dataset.screen === "scores") closeScores();
    else if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
    else if (state === "won" || state === "lost") goMenu();
    else if (document.body.dataset.screen && document.body.dataset.screen !== "menu") goMenu();
  }

  function moveFocus(dir) {
    const scope = document.querySelector(".screen:not(.hidden)");
    if (!scope) return;
    const els = [...scope.querySelectorAll("button, input")].filter((e) => !e.disabled && e.offsetParent !== null);
    if (!els.length) return;
    const i = els.indexOf(document.activeElement);
    els[(i + dir + els.length) % els.length].focus();
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === "s" && (state === "playing" || state === "paused")) {
      e.preventDefault(); manualSave(); return; // Ctrl+S (ou Cmd+S) salva o jogo em vez de abrir "Salvar página"
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return; // não atrapalha atalhos do navegador
    const k = keyName(e);
    if (k === "Escape") { if (!e.repeat) onEscape(); return; } // segurar a tecla não fica pausando e continuando
    if (k === "p" && !e.repeat && state === "paused") { resumeGame(); return; }
    if (state === "playing") {
      keys[k] = true;
      if (k === "p") { if (!e.repeat) pauseGame(); return; }
      if (k.startsWith("Arrow") || (k === " " && !(e.target instanceof HTMLButtonElement))) e.preventDefault(); // não rola a página
    } else if ((k === "ArrowDown" || k === "ArrowUp") && document.body.dataset.screen && !document.querySelector(".screen:not(.hidden)")?.hasAttribute("data-scroll")) {
      e.preventDefault(); moveFocus(k === "ArrowDown" ? 1 : -1); // navega pelos botões das telas
    }
  });
  window.addEventListener("keyup", (e) => { keys[keyName(e)] = false; });
  window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; clearTouch(); pauseGame(); }); // trocar de janela pausa (pauseGame só age se estiver jogando)
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseGame(); });
  window.addEventListener("pagehide", () => saveNow()); // fechar/recarregar a página também salva

  // ---------- Entrada: toque (celular/tablet) ----------
  const pad = $("pad"), knob = $("pad-knob");
  let padPointer = null;
  function clearTouch() {
    padPointer = null;
    touch.left = touch.right = touch.up = touch.down = false;
    knob.style.transform = "";
  }
  function padMove(e) {
    const r = pad.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - (r.left + R)) / R, dy = (e.clientY - (r.top + R)) / R;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    const dead = 0.3;
    touch.left = dx < -dead; touch.right = dx > dead; touch.up = dy < -dead; touch.down = dy > dead;
    knob.style.transform = `translate(${dx * R * 0.5}px, ${dy * R * 0.5}px)`;
  }
  pad.addEventListener("pointerdown", (e) => {
    if (padPointer !== null) return;
    padPointer = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch { /* ponteiro sintético */ }
    padMove(e); e.preventDefault();
  });
  pad.addEventListener("pointermove", (e) => { if (e.pointerId === padPointer) padMove(e); });
  for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(ev, (e) => { if (e.pointerId === padPointer) clearTouch(); });
  pad.addEventListener("contextmenu", (e) => e.preventDefault());

  const touchCapable = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || navigator.maxTouchPoints > 0 || /[?&]touch=1\b/.test(location.search);
  if (touchCapable) document.body.classList.add("touch");
  window.addEventListener("pointerdown", (e) => { if (e.pointerType === "touch") document.body.classList.add("touch"); }, { passive: true });

  // ---------- Botões e formulário ----------
  const on = (id, fn) => $(id).addEventListener("click", fn);
  on("btn-start", () => { levelsMode = "play"; requestNewGame(); });
  on("btn-replay", () => { levelsMode = "replay"; requestNewGame(); });
  on("btn-continue", continueGame);
  on("btn-confirm-keep", continueGame);
  on("btn-confirm-new", chooseLevel);
  on("btn-confirm-back", goMenu);
  on("btn-levels-back", goMenu);
  on("btn-save", manualSave);
  on("btn-save-hud", manualSave);
  on("btn-howto", () => showScreen("howto"));
  on("btn-howto-back", goMenu);
  on("btn-scores", () => openScores("menu"));
  on("btn-scores-back", closeScores);
  on("btn-name", () => openName(false));
  on("btn-name-back", goMenu);
  on("btn-open-register", () => openRegister());
  on("btn-open-login", () => openLogin());
  on("btn-register-back", () => openName(nameThenStart));
  on("btn-login-back", () => openName(nameThenStart));
  on("btn-login-to-register", () => openRegister($("login-user").value.trim()));
  on("btn-forgot", openForgot);
  on("btn-forgot-back", () => openLogin(forgotName));
  on("btn-forgot-delete", () => { const n = forgotName; store.deleteAccount(n); renderMenu(); openRegister(n); });
  on("btn-logout", () => { store.logout(); renderMenu(); $("btn-start").focus(); });
  $("name-form").addEventListener("submit", (e) => { e.preventDefault(); saveName($("name-input").value); });
  on("btn-pause", pauseGame);
  on("btn-resume", resumeGame);
  on("btn-pause-menu", goMenu);
  on("btn-next", () => { if (LEVELS.some((l) => l.id === levelId + 1)) begin(levelId + 1, { lives: carriedLives, player: gamePlayer }); }); // as vidas passam para a próxima fase
  on("btn-again", () => begin(levelId, { player: gamePlayer }));
  on("btn-win-scores", () => openScores("win"));
  on("btn-win-menu", goMenu);
  on("btn-retry", () => { if (retries < MAX_RETRIES) begin(levelId, { retries: retries + 1, player: gamePlayer }); });
  on("btn-lose-menu", goMenu);

  // outra aba mudou os dados guardados (pontuações, contas, jogo salvo): a tela aberta se atualiza
  window.addEventListener("storage", (e) => {
    if (e.key !== null && !String(e.key).startsWith("cachorrinho.")) return;
    const screen = document.body.dataset.screen;
    if (screen === "menu") renderMenu(); else if (screen === "scores") renderScores(); else if (screen === "levels") renderLevels();
  });

  // gancho de depuração/testes
  window.__game = {
    get state() { return state; }, get player() { return player; }, get collected() { return collected; },
    get items() { return items; }, get vets() { return vets; }, get exit() { return exitRect; }, get score() { return score; },
    get alertTiles() { return lv.alertTiles; }, get power() { return power; }, get minPoints() { return lv.minPoints; }, get lifePenalty() { return lv.lifePenalty; }, get dogSpeed() { return dogSpeedNow(); }, get assist() { return assist(); }, get started() { return started; }, set autoStart(v) { autoStart = !!v; }, set touchInput(v) { touchInput = !!v; }, get postmen() { return postmen; }, set allBlocks(v) { allBlocks = !!v; }, get bonesGot() { return bonesGot; }, get blocks() { return blocks.map((b) => ({ i: b.i, x: b.rect.x, y: b.rect.y, bt: b.bt, def: { ...b.d } })); }, get blockTiles() { return [...dynBlocked]; },
    get lives() { return lives; }, get livesLost() { return livesLost; }, get retries() { return retries; }, get maxLives() { return MAX_LIVES; },
    get level() { return levelId; }, get time() { return time; }, get invuln() { return invuln; }, get view() { return view; },
    get levels() { return LEVELS.map((l) => ({ id: l.id, title: l.title, map: l.map.slice(), vets: l.vets.map((v) => ({ ...v })), rations: l.rations, bones: l.bones, extraLives: l.extraLives.slice(), bonusStep: l.bonusStep, dogSpeed: l.dogSpeed, alertTiles: l.alertTiles, lifePenalty: l.lifePenalty, minPoints: l.minPoints, bonePower: l.bonePower, crush: l.crush, touchEase: l.touchEase && { ...l.touchEase }, respawnInPlace: !!l.respawnInPlace, blockRange: l.blockRange && JSON.parse(JSON.stringify(l.blockRange)), note: l.note, blocks: l.blocks.map((b) => ({ ...b })) })); },
    set freezeVets(v) { freezeVets = !!v; }, set noCatch(v) { noCatch = !!v; }, setRand(fn) { rand = fn || Math.random; }, tick: update,
    padPoll(dt = 1 / 60) { pollGamepad(dt); }, parseSave(sv) { return !!parseSnapshot(sv); }, start(id, o) { begin(id ?? levelId, o); }, save: saveNow, setLives(n) { lives = clamp(Math.round(n), 1, MAX_LIVES); },
  };

  reset();
  fitCanvas();
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(() => { if (fitCanvas()) draw(); scheduleHudSync(); }).observe(canvas); // redesenha na hora: redimensionar o canvas o apaga
    new ResizeObserver(() => scheduleHudSync()).observe($("hud"));
  } else window.addEventListener("resize", () => { if (fitCanvas()) draw(); syncHudHeight(); });
  syncHudHeight();
  goMenu();
  requestAnimationFrame(loop);
})();
