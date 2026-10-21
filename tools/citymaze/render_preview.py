#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera previews/mapN.png e previews/mapN.txt a partir dos mapN.json (cores: parede, caixa, chão, início, saída, postos, trilhos das peças)."""
import json, sys, os
from PIL import Image, ImageDraw, ImageFont

COL = {'#': (52, 58, 82), 'X': (176, 112, 54), '.': (214, 220, 232), 'P': (60, 190, 90), 'E': (240, 200, 40), 'V': (220, 60, 60)}
WALL_RAIL = (200, 90, 200)      # trilho de parede móvel
DOOR_RAIL = (70, 170, 220)      # trilho de porta (tile do beco + nicho)


def tiles(b, which):
    x, y = b[which]; w, h = b['size']
    return [(x + i, y + j) for i in range(w) for j in range(h)]


def render(m, path, S=16):
    rows = m['rows']; H, W = len(rows), len(rows[0])
    im = Image.new('RGB', (W * S, H * S + 26), (20, 22, 30))
    d = ImageDraw.Draw(im)
    for y in range(H):
        for x in range(W):
            ch = rows[y][x]
            d.rectangle([x * S, y * S, x * S + S - 1, y * S + S - 1], fill=COL.get(ch, (255, 0, 255)))
    # trilhos
    for k, b in enumerate(m['blocks']):
        trk = set(tiles(b, 'from')) | set(tiles(b, 'to'))
        c = WALL_RAIL if b['kind'] == 'wall' else DOOR_RAIL
        for (x, y) in trk:
            d.rectangle([x * S, y * S, x * S + S - 1, y * S + S - 1], fill=c)
        # posição "from" (onde a peça começa) em tom mais escuro
        for (x, y) in tiles(b, 'from'):
            d.rectangle([x * S + 3, y * S + 3, x * S + S - 4, y * S + S - 4], fill=tuple(int(v * 0.55) for v in c))
    # letras P / E / V
    try:
        f = ImageFont.load_default()
    except Exception:
        f = None
    for y in range(H):
        for x in range(W):
            ch = rows[y][x]
            if ch in 'PV':
                d.text((x * S + 4, y * S + 2), ch, fill=(255, 255, 255), font=f)
            if ch == 'E':
                d.text((x * S + 4, y * S + 2), 'E', fill=(60, 40, 0), font=f)
    d.text((4, H * S + 6), f"Fase {m.get('level','?')}  {W}x{H}  semente {m.get('seed')}  caminho {m.get('path')}  | cinza-azul=parede  marrom=caixa  claro=rua  verde=inicio  ouro=saida  vermelho=posto  magenta=trilho parede  azul=trilho porta", fill=(230, 230, 230), font=f)
    im.save(path)


def text(m, path):
    rows = m['rows']
    lines = [f"Fase {m.get('level')}  {len(rows[0])}x{len(rows)}  semente {m.get('seed')}  caminho {m.get('path')}", ""]
    grid = [list(r) for r in rows]
    # marca os trilhos: parede = '=' (se for chão livre), porta/nicho = '~'
    for b in m['blocks']:
        for which in ('from', 'to'):
            for (x, y) in tiles(b, which):
                if grid[y][x] == '.':
                    grid[y][x] = '=' if b['kind'] == 'wall' else '~'
    lines += ["".join(r) for r in grid]
    lines += ["", "legenda: # parede  X caixa  . rua  P inicio  E saida  V posto  = trilho de parede movel  ~ trilho de porta (beco + nicho)", ""]
    for k, b in enumerate(m['blocks']):
        lines.append(f"peca {k + 1}: {b['kind']} de {b['from']} ate {b['to']} tamanho {b['size']}")
    open(path, 'w', encoding='utf-8').write("\n".join(lines) + "\n")


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    outdir = os.path.join(here, 'previews')
    os.makedirs(outdir, exist_ok=True)
    lvls = [int(a) for a in sys.argv[1:]] or range(4, 11)
    for n in lvls:
        p = os.path.join(here, f'map{n}.json')
        if not os.path.exists(p):
            continue
        m = json.load(open(p))
        m.setdefault('level', n)
        render(m, os.path.join(outdir, f'map{n}.png'))
        text(m, os.path.join(outdir, f'map{n}.txt'))
        print('ok', n)
