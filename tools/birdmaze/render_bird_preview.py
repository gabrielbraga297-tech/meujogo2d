#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera um PNG por mapa do Passarinho e uma folha com os 20 em docs/passarinho-mapas/ (a partir de js/bird-levels.js).
Cores: parede # azul-escura, muro M verde (voável), chão claro, X marrom, G círculo verde-escuro (galho), vento azul-claro com seta, V vermelho, H roxo, P verde, E amarelo.

Uso:
  python3 tools/birdmaze/render_bird_preview.py                 # os 20 mapas de js/bird-levels.js -> docs/passarinho-mapas/
  python3 tools/birdmaze/render_bird_preview.py --gen 5:2 6:0   # (para escolher sementes) gera fase:semente direto do gerador, em --out
"""
import argparse, json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JS = os.path.join(ROOT, 'js', 'bird-levels.js')
OUT = os.path.join(ROOT, 'docs', 'passarinho-mapas')

COL = {
    '#': (46, 54, 84), 'M': (96, 168, 92), '.': (222, 226, 236), 'X': (176, 112, 54), 'G': (222, 226, 236),
    'V': (214, 48, 48), 'H': (130, 60, 190), 'P': (40, 190, 80), 'E': (245, 205, 30),
    '>': (196, 224, 246), '<': (196, 224, 246), '^': (196, 224, 246), 'v': (196, 224, 246),
}
ARROW = (30, 100, 190)
LEG = [('#', 'parede'), ('M', 'muro voável'), ('.', 'chão'), ('X', 'obstáculo baixo'), ('G', 'galho'), ('>', 'vento'), ('V', 'gato de quintal'), ('H', 'gavião'), ('P', 'início'), ('E', 'saída (ninho)')]


def font(size):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def arrow(d, x0, y0, S, ch, col=ARROW):
    cx, cy, r = x0 + S / 2.0, y0 + S / 2.0, S * 0.34
    vx, vy = {'>': (1, 0), '<': (-1, 0), '^': (0, -1), 'v': (0, 1)}[ch]
    px, py = -vy, vx
    pts = [(cx + vx * r, cy + vy * r), (cx - vx * r * 0.7 + px * r * 0.9, cy - vy * r * 0.7 + py * r * 0.9), (cx - vx * r * 0.2, cy - vy * r * 0.2),
           (cx - vx * r * 0.7 - px * r * 0.9, cy - vy * r * 0.7 - py * r * 0.9)]
    d.polygon(pts, fill=col)


def draw_tile(d, ch, x0, y0, S):
    c = COL.get(ch, (255, 0, 255))
    d.rectangle([x0, y0, x0 + S - 1, y0 + S - 1], fill=c)
    if ch == 'M' and S >= 6:
        d.rectangle([x0, y0, x0 + S - 1, y0 + S - 1], outline=(62, 128, 62))
        if S >= 10:
            d.ellipse([x0 + S // 4, y0 + S // 4, x0 + 3 * S // 4, y0 + 3 * S // 4], fill=(120, 190, 112))
    elif ch == 'X' and S >= 8:
        d.rectangle([x0 + 1, y0 + 1, x0 + S - 2, y0 + S - 2], outline=(120, 70, 28))
    elif ch == 'G' and S >= 6:
        d.ellipse([x0 + 1, y0 + 1, x0 + S - 2, y0 + S - 2], fill=(22, 100, 52))
        if S >= 10:
            d.ellipse([x0 + S // 3, y0 + S // 3, x0 + 2 * S // 3, y0 + 2 * S // 3], fill=(60, 150, 80))
    elif ch in '><^v':
        arrow(d, x0, y0, S, ch)


def draw_map(d, rows, ox, oy, S):
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            draw_tile(d, ch, ox + x * S, oy + y * S, S)
    if S >= 10:
        f = font(max(8, S - 3))
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch in 'PVHE':
                    d.text((ox + x * S + S // 4, oy + y * S + 1), ch, fill=(255, 255, 255) if ch != 'E' else (70, 50, 0), font=f)


def render_one(lv, path, S=14):
    rows = lv['map']
    W, H = len(rows[0]), len(rows)
    head, foot = 34, 28
    im = Image.new('RGB', (max(W * S, 900), H * S + head + foot), (24, 26, 36))
    d = ImageDraw.Draw(im)
    d.text((6, 6), 'Fase %d · %s · %d×%d · semente %s · gatos %s · gaviões %s · G %s · vento %s · M %s' % (
        lv['id'], lv['place'], W, H, lv.get('seed', '?'), lv['cats'], lv['hawks'], lv['special']['G'], lv['special']['wind'], 'sim' if lv['special']['M'] else 'não'), fill=(235, 235, 235), font=font(14))
    draw_map(d, rows, 0, head, S)
    x = 6
    f = font(11)
    for ch, name in LEG:
        draw_tile(d, ch, x, H * S + head + 7, 12)
        d.text((x + 16, H * S + head + 6), name, fill=(220, 220, 220), font=f)
        x += 26 + 7 * len(name)
    im.save(path, optimize=True)


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
    im.save(path, optimize=True)


def read_levels():
    s = open(JS, encoding='utf-8').read()
    a, b = s.index('/*BEGIN-DATA*/') + len('/*BEGIN-DATA*/'), s.index('/*END-DATA*/')
    return json.loads(s[a:b])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gen', nargs='*', help='fase:semente (gera direto do gerador, sem usar js/bird-levels.js)')
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--scale', type=int, default=14)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    if a.gen:
        sys.path.insert(0, HERE)
        import gen_bird
        for item in a.gen:
            n, sd = [int(v) for v in item.split(':')]
            m, errs, _ = gen_bird.generate(n, sd)
            if m is None:
                print('fase', n, 'semente', sd, 'inválida:', errs)
                continue
            if errs:
                print('fase', n, 'semente', sd, 'com problemas:', errs)
            gen_bird.SEEDS[n] = sd
            lv = gen_bird.level_def(n, m.rows())
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
