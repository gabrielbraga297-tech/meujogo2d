#!/usr/bin/env python3
"""Aplica os labirintos de cidade (citymaze/out/mapN.json, N = 1..10) em <repo>/js/game.js: MAP_N, comentário, peças móveis (blocks), `maze` (grade das células, para os testes) e `note`.
Uso: apply_citymaze.py <repo> <pasta com os mapN.json>"""
import json, re, sys

repo, src_dir = sys.argv[1], sys.argv[2]
p = repo + '/js/game.js'
s = open(p, encoding='utf-8').read()

NOTES = {
    4: 'labirinto de cidade com ruas largas, poder dos ossos e portas que esmagam',
    5: 'mais avenidas: paredes que se movem, poder do osso de 35 s e 1000 pontos',
    6: 'labirinto maior, mais ossos e mais peças móveis',
    7: 'labirinto maior, mais rações e mais portas de bloco',
    8: 'labirinto enorme, 4 ossos e muitas paredes que se movem',
    9: 'blocos e paredes mais rápidos; o cachorrinho renasce onde morreu',
    10: 'a última fase: o maior labirinto, 6 agentes da carrocinha e blocos muito rápidos; renasce onde morreu',
}
# (every, speed) das paredes e das portas
WALL = {5: (10, None), 6: (10, None), 7: (10, None), 8: (10, None), 9: (8, 140), 10: (6, 160)}
DOOR = {3: (None, None), 4: (None, None), 5: (None, None), 6: (None, None), 7: (None, None), 8: (None, None), 9: (2.5, 160), 10: (2, 200)}
TITLE = {1: 'o quintal', 2: 'o campo', 3: 'a casa'}


def comment(n, d):
    W, H = len(d['rows'][0]), len(d['rows'][0:])
    m = d['metrics']
    doors, walls = m['doors'], m['walls']
    base = f'  // Fase {n}: labirinto de {W} × {H} tiles (gerado e conferido por script, com desenho de cidade: ruas de 3 tiles entre prédios, {m["cells"]} quarteirões-células ligados por {m["edges"]} ruas'
    base += f', {m["dead_cells"]} becos sem saída e {m["routes"]} caminhos sem célula em comum do início à saída'
    if n >= 4:
        base += '; praça da carrocinha 7 × 5 no centro'
    if doors or walls:
        base += f'; {doors} porta(s) de bloco e {walls} parede(s) que se movem, e o chão continua ligado em qualquer posição delas'
    return base + ').\n'


def fmt(b, i, kind, n):
    every, speed = (WALL if kind == 'wall' else DOOR)[n]
    extra = ''
    if every is not None:
        extra += ', every: %s' % every
    if speed is not None:
        extra += ', speed: %d' % speed
    size = (', size: [%d, %d]' % tuple(b['size'])) if kind == 'wall' else ''
    ph = (3 * i) if kind == 'wall' else (i % 3)
    wall = ', wall: true' if kind == 'wall' else ''
    return '        { from: [%d, %d], to: [%d, %d]%s%s%s, phase: %d }, // %s %d\n' % (b['from'][0], b['from'][1], b['to'][0], b['to'][1], size, wall, extra, ph, 'parede' if kind == 'wall' else 'porta', i + 1)


for n in range(1, 11):
    d = json.load(open('%s/map%d.json' % (src_dir, n), encoding='utf-8'))
    rows = d['rows']
    arr = '  const MAP_%d = [\n' % n + ''.join('    "%s",\n' % r for r in rows) + '  ];\n'
    if n == 1:
        m = re.search(r'  const MAP_1 = \[\n.*?\n  \];\n', s, re.S)
        assert m
        s = s[:m.start()] + comment(n, d) + arr + s[m.end():]
    else:
        m = re.search(r'((?:  //[^\n]*\n)+)  const MAP_%d = \[\n.*?\n  \];\n' % n, s, re.S)
        assert m, n
        s = s[:m.start()] + comment(n, d) + arr + s[m.end():]
    lat = d['lattice']
    maze = '{ x: %s, y: %s, p: %s, e: %s }' % (json.dumps(lat['cx']), json.dumps(lat['cy']), json.dumps(lat['P']), json.dumps(lat['E']))
    walls = [b for b in d['blocks'] if b['kind'] == 'wall']
    doors = [b for b in d['blocks'] if b['kind'] == 'door']
    lines = ''.join(fmt(b, i, 'wall', n) for i, b in enumerate(walls)) + ''.join(fmt(b, i, 'door', n) for i, b in enumerate(doors))
    if n <= 2:
        pat = re.compile(r'(      id: %d, title: "Fase %d"|    \{ id: %d, title: "Fase %d".*?)blocks: \[\] \}' % (n, n, n, n), re.S)
        mm = re.search(r'(\{ id: %d, title: "Fase %d".*?)(blocks: \[\] \})' % (n, n), s)
        assert mm, n
        s = s[:mm.start(2)] + 'maze: %s, ' % maze + s[mm.start(2):]
        continue
    mm = re.search(r'(      id: %d, title: "Fase %d".*?\n)(      blocks: \[\n)(.*?)(      \],\n    \},\n)' % (n, n), s, re.S)
    assert mm, ('cfg', n)
    head = mm.group(1)
    if n >= 4:
        head, k = re.subn(r'(      note: )"[^"]*"', lambda m2: m2.group(1) + json.dumps(NOTES[n], ensure_ascii=False), head, count=1)
        assert k == 1, n
    new = head + '      maze: %s,\n' % maze + mm.group(2) + lines + mm.group(4)
    s = s[:mm.start()] + new + s[mm.end():]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
