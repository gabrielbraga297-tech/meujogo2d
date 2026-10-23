#!/usr/bin/env python3
"""Acrescenta as Fases 11 a 20 em <repo>/js/game.js a partir de <pasta>/mapN.json (N = 11..20): MAP_N, entradas de LEVELS, ajuda vetsOf e nota da Fase 10.
Uso: apply_levels11_20.py <repo> <pasta> [--hops] [--cats]   (--hops mantém as muretas de caixas X que só o gato pula; --cats põe os gatos nas fases)"""
import json, re, sys

repo, src_dir = sys.argv[1], sys.argv[2]
WITH_HOPS = '--hops' in sys.argv
WITH_CATS = '--cats' in sys.argv
p = repo + '/js/game.js'
s = open(p, encoding='utf-8').read()

# n: (agentes, rações, ossos, pontos mínimos, pontos por vida, alcance do "!", (every,speed) paredes, (every,speed) portas, nota)
SPEC = {
    11: (5, 44, 5, 2300, 300, 16, (10, None), (3, None), 'labirinto ainda maior e mais agentes da carrocinha'),
    12: (5, 46, 5, 2450, 300, 16, (10, None), (3, None), 'mais rações e mais pontos'),
    13: (6, 48, 6, 2650, 325, 17, (10, None), (3, None), 'labirinto enorme: 13 × 7 quarteirões e 6 agentes'),
    14: (6, 50, 6, 2800, 325, 17, (8, 140), (2.5, 160), 'blocos e paredes mais rápidos'),
    15: (6, 52, 6, 3000, 350, 18, (8, 140), (2.5, 160), 'mais um bom pedaço de labirinto para explorar'),
    16: (7, 54, 7, 3200, 350, 18, (8, 140), (2.5, 160), 'labirinto de 13 × 9 quarteirões e 7 agentes'),
    17: (7, 56, 7, 3400, 375, 19, (5.5, 180), (1.8, 220), 'peças móveis ainda mais rápidas'),
    18: (8, 58, 7, 3600, 375, 19, (5.5, 180), (1.8, 220), '8 agentes da carrocinha e muitos becos'),
    19: (8, 60, 8, 3800, 400, 20, (5, 200), (1.6, 240), 'quase no fim: o labirinto mais enrolado até aqui'),
    20: (8, 62, 8, 4000, 400, 20, (5, 200), (1.6, 240), 'a Fase 20: o maior labirinto de todos'),
}


def comment(n, d):
    m = d['metrics']
    W, H = len(d['rows'][0]), len(d['rows'])
    return f'  // Fase {n}: labirinto de {W} × {H} tiles (gerado e conferido por script, desenho de cidade: ruas de 3 tiles entre prédios, {m["cells"]} quarteirões-células ligados por {m["edges"]} ruas, {m["dead_cells"]} becos sem saída e {m["routes"]} caminhos sem célula em comum do início à saída; praça da carrocinha 7 × 5 no centro; {m["doors"]} portas de bloco e {m["walls"]} paredes que se movem, e o chão continua ligado em qualquer posição delas).\n'


def fmt(b, i, kind, n):
    every, speed = SPEC[n][6 if kind == 'wall' else 7]
    extra = ''
    if every is not None:
        extra += ', every: %s' % every
    if speed is not None:
        extra += ', speed: %d' % speed
    size = (', size: [%d, %d]' % tuple(b['size'])) if kind == 'wall' else ''
    ph = (3 * i) if kind == 'wall' else (i % 3)
    wall = ', wall: true' if kind == 'wall' else ''
    return '        { from: [%d, %d], to: [%d, %d]%s%s%s, phase: %d }, // %s %d\n' % (b['from'][0], b['from'][1], b['to'][0], b['to'][1], size, wall, extra, ph, 'parede' if kind == 'wall' else 'porta', i + 1)


maps, entries = '', ''
for n in range(11, 21):
    d = json.load(open('%s/map%d.json' % (src_dir, n), encoding='utf-8'))
    rows = d['rows']
    if not WITH_HOPS:                                     # sem gatos, as muretas de caixas não fazem sentido: viram parede
        grid = [list(r) for r in rows]
        for strip in d.get('hops', []):
            for (x, y) in strip:
                grid[y][x] = '#'
        rows = [''.join(r) for r in grid]
    maps += comment(n, d) + '  const MAP_%d = [\n' % n + ''.join('    "%s",\n' % r for r in rows) + '  ];\n'
    nv, rations, bones, minp, pen, alert, wallsp, doorsp, note = SPEC[n]
    assert sum(r.count('V') for r in rows) == nv, (n, 'V')
    lat = d['lattice']
    maze = '{ x: %s, y: %s, p: %s, e: %s }' % (json.dumps(lat['cx']), json.dumps(lat['cy']), json.dumps(lat['P']), json.dumps(lat['E']))
    walls = [b for b in d['blocks'] if b['kind'] == 'wall']
    doors = [b for b in d['blocks'] if b['kind'] == 'door']
    lines = ''.join(fmt(b, i, 'wall', n) for i, b in enumerate(walls)) + ''.join(fmt(b, i, 'door', n) for i, b in enumerate(doors))
    cats = ''
    if WITH_CATS and d.get('cats'):
        cats = '      cats: %s,\n' % json.dumps(d['cats'])
    entries += (f'    {{\n      id: {n}, title: "Fase {n}", map: MAP_{n}, vets: vetsOf({n}, {nv}), rations: {rations}, bones: {bones}, extraLives: [3, 4], bonusStep: 20, dogSpeed: 1.0,\n'
                f'      alertTiles: {alert}, lifePenalty: {pen}, minPoints: {minp}, bonePower: 35, crush: true, respawnInPlace: true, blockEvery: 3, blockRange: {{ door: [{len(doors) - 1}, {len(doors)}], wall: [{len(walls) - 1}, {len(walls)}] }},\n'
                f'      note: {json.dumps(note, ensure_ascii=False)},\n{cats}      maze: {maze},\n      blocks: [\n{lines}      ],\n    }},\n')

# 1. mapas depois do MAP_10
m = re.search(r'  const MAP_10 = \[\n.*?\n  \];\n', s, re.S)
assert m
s = s[:m.end()] + maps + s[m.end():]
# 2. ajuda vetsOf antes de LEVELS: agentes das Fases 11 a 20 = Fase 10 + 2% de velocidade por fase
a = '  const LEVELS = ['
assert s.count(a) == 1
s = s.replace(a, '  // Agentes das Fases 11 a 20: a velocidade da Fase 10 (1,2 × a da Fase 4) mais 2% por fase (nos dois modos); o resto é igual.\n  const vetsOf = (n, k) => Array.from({ length: k }, () => scaleVet(PHASE4_VET, Math.round((1.2 + 0.02 * (n - 10)) * 100) / 100));\n' + a)
# 3. entradas depois da Fase 10
m = re.search(r'(      id: 10, title: "Fase 10".*?\n      \],\n    \},\n)(  \];\n  const LEVEL_IDS)', s, re.S)
assert m
s = s[:m.end(1)] + entries + s[m.start(2):]
# 4. nota da Fase 10
s = s.replace('note: "a última fase: o maior labirinto, 6 agentes da carrocinha e blocos muito rápidos; renasce onde morreu",', 'note: "o maior labirinto até aqui, 6 agentes da carrocinha e blocos muito rápidos; renasce onde morreu",')
open(p, 'w', encoding='utf-8').write(s)
print('ok')
