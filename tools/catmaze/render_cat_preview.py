#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera um PNG por mapa do Gatinho e uma folha com os 20 em docs/gatinho-mapas/ (a partir de js/cat-levels.js).
Cores: parede azul-escura, chão claro, T verde-escuro, ~ azul, X marrom, V vermelho, R laranja, P verde, E amarelo.

Uso:
  python3 tools/catmaze/render_cat_preview.py                 # os 20 mapas de js/cat-levels.js -> docs/gatinho-mapas/
  python3 tools/catmaze/render_cat_preview.py --gen 5:2 6:0   # (para escolher sementes) gera fase:semente direto do gerador, em --out
"""
import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JS = os.path.join(ROOT, 'js', 'cat-levels.js')
OUT = os.path.join(ROOT, 'docs', 'gatinho-mapas')

COL = {
    '#': (46, 54, 84), '.': (222, 226, 236), 'T': (22, 100, 52), '~': (70, 140, 230), 'X': (176, 112, 54),
    'V': (214, 48, 48), 'R': (245, 140, 25), 'P': (40, 190, 80), 'E': (245, 205, 30),
}
LEG = [('#', 'parede'), ('.', 'chão'), ('X', 'obstáculo baixo'), ('T', 'lugar alto'), ('~', 'poça'), ('V', 'cão de guarda'), ('R', 'rastreador'), ('P', 'início'), ('E', 'saída')]


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def draw_map(d, rows, ox, oy, S):
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            c = COL.get(ch, (255, 0, 255))
            d.rectangle([ox + x * S, oy + y * S, ox + x * S + S - 1, oy + y * S + S - 1], fill=c)
            if ch in 'XT~' and S >= 8:
                dark = tuple(max(0, v - 45) for v in c)
                d.rectangle([ox + x * S + 1, oy + y * S + 1, ox + x * S + S - 2, oy + y * S + S - 2], outline=dark)
    if S >= 10:
        f = font(max(8, S - 3))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch in 'PVRE':
                    d.text((ox + x * S + S // 4, oy + y * S + 1), ch, fill=(255, 255, 255) if ch != 'E' else (70, 50, 0), font=f)


def render_one(lv, path, S=14):
    rows = lv['map']
    W, H = len(rows[0]), len(rows)
    head = 34
    foot = 26
    im = Image.new('RGB', (max(W * S, 760), H * S + head + foot), (24, 26, 36))
    d = ImageDraw.Draw(im)
    d.text((6, 6), 'Fase %d · %s · %d×%d · semente %s · cães %s · rastreadores %s · T %s · poças %s' % (
        lv['id'], lv['place'], W, H, lv.get('seed', '?'), lv['dogs'], lv['trackers'], lv['special']['T'], lv['special']['water']), fill=(235, 235, 235), font=font(14))
    draw_map(d, rows, 0, head, S)
    x = 6
    f = font(11)
    for ch, name in LEG:
        d.rectangle([x, H * S + head + 7, x + 11, H * S + head + 18], fill=COL[ch])
        d.text((x + 15, H * S + head + 6), name, fill=(220, 220, 220), font=f)
        x += 22 + 7 * len(name)
    im.save(path)


def render_sheet(levels, path, S=5, cols=4):
    cw = max(len(l['map'][0]) for l in levels) * S + 12
    ch_ = max(len(l['map']) for l in levels) * S + 30
    n = len(levels)
    rows_n = (n + cols - 1) // cols
    im = Image.new('RGB', (cols * cw, rows_n * ch_), (24, 26, 36))
    d = ImageDraw.Draw(im)
    f = font(12)
    for i, lv in enumerate(levels):
        ox, oy = (i % cols) * cw + 6, (i // cols) * ch_ + 22
        d.text((ox, oy - 18), 'Fase %d · %s' % (lv['id'], lv['place']), fill=(235, 235, 235), font=f)
        draw_map(d, lv['map'], ox, oy, S)
    im.save(path)


def read_levels():
    s = open(JS, encoding='utf-8').read()
    a, b = s.index('/*BEGIN-DATA*/') + len('/*BEGIN-DATA*/'), s.index('/*END-DATA*/')
    return json.loads(s[a:b])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gen', nargs='*', help='fase:semente (gera direto do gerador, sem usar js/cat-levels.js)')
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--scale', type=int, default=14)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    if a.gen:
        sys.path.insert(0, HERE)
        import gen_cat
        for item in a.gen:
            n, sd = [int(v) for v in item.split(':')]
            m, errs, _ = gen_cat.generate(n, sd)
            if m is None or errs:
                print('fase', n, 'semente', sd, 'inválida:', errs)
                continue
            gen_cat.SEEDS[n] = sd
            lv = gen_cat.level_def(n, m.rows())
            render_one(lv, os.path.join(a.out, 'dev-fase%02d-s%d.png' % (n, sd)), a.scale)
            print('ok', n, sd)
        return
    levels = read_levels()
    for lv in levels:
        render_one(lv, os.path.join(a.out, 'fase%02d.png' % lv['id']), a.scale)
    render_sheet(levels, os.path.join(a.out, 'folha-20-mapas.png'))
    print('PNGs em', a.out)


if __name__ == '__main__':
    main()
