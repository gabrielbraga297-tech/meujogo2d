# -*- coding: utf-8 -*-
"""Um estilo de desenho por ambiente do Gatinho (Fases 1 a 20). Cada estilo recebe a grade `m` no SENTIDO PADRÃO (início à esquerda, saída à direita;
as outras orientações vêm depois por espelho/transposição), o sorteador `rng` da semente e a tabela da fase `sp`. Desenha paredes (#), móveis (X),
lugares altos (T) e poças (~) respeitando as travas da saída, e preenche `m.slots` (bons lugares para postos). Veja gen_cat.py."""
from cat_core import *

STYLES = {}


def style(n):
    def deco(f):
        STYLES[n] = f
        return f
    return deco


def keep_door(m, x, y, orient, width=2, depth=2):
    """reserva a frente de uma porta (nenhum móvel ali)"""
    for i in range(width):
        for k in range(-depth, depth + 1):
            if orient == 'v':
                m.keep.add((x + k, y + i))
            else:
                m.keep.add((x + i, y + k))


def room_slots(m, rooms):
    for (x0, y0, x1, y1) in rooms:
        m.slots.append(((x0 + x1) // 2, (y0 + y1) // 2))


def walls_with_doors(m, rng, xs, W, H):
    pass


# --------------------------------------------------------------------------------------------
# Fase 1: sala de estar (3 a 4 cômodos com portas e móveis)
# --------------------------------------------------------------------------------------------
@style(1)
def style1(m, rng, sp):
    W, H = m.W, m.H
    xa, xb = rng.randint(7, 8), rng.randint(15, 16)
    m.rect(xa, 1, 2, H - 2, '#')                  # paredes de 2 tiles
    m.rect(xb, 1, 2, H - 2, '#')
    cols = [(1, xa - 1), (xa + 2, xb - 1), (xb + 2, W - 2)]
    split = rng.choice([None, 0, 2])
    ys = rng.randint(7, 9)
    colrooms = []
    for ci, (x0, x1) in enumerate(cols):
        if ci == split:
            m.rect(x0, ys, x1 - x0 + 1, 2, '#')
            colrooms.append([(x0, 1, x1, ys - 1), (x0, ys + 2, x1, H - 2)])
            dx = rng.randint(x0 + 1, max(x0 + 1, x1 - 2))
            m.rect(dx, ys, 2, 2, '.')
            keep_door(m, dx, ys, 'h')
        else:
            colrooms.append([(x0, 1, x1, H - 2)])
    for wall_x, left, right in ((xa, colrooms[0], colrooms[1]), (xb, colrooms[1], colrooms[2])):
        for (_, ay0, _, ay1) in left:
            for (_, by0, _, by1) in right:
                lo, hi = max(ay0, by0), min(ay1, by1)
                if hi - lo + 1 >= 4:
                    y = rng.randint(lo + 1, hi - 2)
                    m.rect(wall_x, y, 2, 2, '.')
                    keep_door(m, wall_x, y, 'v')
    rooms = [r for c in colrooms for r in c]
    room_slots(m, rooms)
    # móveis: a sala grande (do meio) tem sofás, mesa, estantes e vasos; os outros cômodos têm cama ou sofá, armário, mesinha e vasos
    for ci, (x0, x1) in enumerate(cols):
        for (rx0, ry0, rx1, ry1) in colrooms[ci]:
            reg = (rx0, ry0, rx1, ry1)
            inner = (rx0 + 1, ry0 + 2, rx1 - 1, ry1 - 2)
            if ci == 1:
                scatter(m, rng, 'X', 2, [(4, 1), (3, 1), (1, 3)], reg, 'wall', 1, tries=400, must=False)
                scatter(m, rng, 'X', 1, [(3, 2), (4, 2)], inner, 'free', 1, tries=300, must=False)
                scatter(m, rng, '#', 3, [(1, 3), (1, 4), (3, 1)], reg, 'wall', 1, tries=400, must=False)
                scatter(m, rng, 'X', 3, [(1, 1)], reg, 'wall', 1, tries=200, must=False)
            else:
                scatter(m, rng, 'X', 1, [(3, 2), (2, 2)], reg, 'wall', 1, tries=300, must=False)
                scatter(m, rng, '#', 2, [(1, 3), (3, 1), (1, 2)], reg, 'wall', 1, tries=300, must=False)
                scatter(m, rng, 'X', 2, [(2, 1), (1, 1), (2, 2)], reg, rng.choice(['wall', 'free']), 1, tries=300, must=False)
                scatter(m, rng, 'X', 2, [(1, 1)], reg, 'wall', 1, tries=200, must=False)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 2: cozinha comprida com bancadas e despensa
# --------------------------------------------------------------------------------------------
@style(2)
def style2(m, rng, sp):
    W, H = m.W, m.H
    xp = rng.randint(7, 8)
    m.rect(xp, 1, 2, H - 2, '#')
    y1, y2 = 5, 13
    for yd in (y1, y2):
        m.rect(xp, yd, 2, 2, '.')
        keep_door(m, xp, yd, 'v', 2, 2)
    # despensa: prateleiras alternadas (uma encostada na parede de fora, outra na do meio)
    for k, ys in enumerate((3, 7, 11, 15)):
        ln = xp - 1 - 2
        if k % 2 == 0:
            m.hline(1, ys, ln, '#')
        else:
            m.hline(xp - ln, ys, ln, '#')
    for ys in (5, 13):
        m.slots.append((2, ys))
    # cozinha
    kx0 = xp + 2
    scatter(m, rng, 'X', 4, [(4, 2), (5, 2), (3, 2)], (kx0, 1, W - 2, 3), 'wall', 1, tries=400, must=False)
    scatter(m, rng, 'X', 4, [(4, 2), (5, 2), (3, 2)], (kx0, H - 4, W - 2, H - 2), 'wall', 1, tries=400, must=False)
    scatter(m, rng, '#', 3, [(2, 2), (1, 3), (2, 3)], (kx0, 1, W - 2, H - 2), 'wall', 1, tries=400, must=False)   # geladeira, fogão e armários
    scatter(m, rng, 'X', 4, [(1, 1), (1, 2)], (kx0, 1, W - 2, H - 2), 'wall', 1, tries=300, must=False)       # banquinhos e caixas
    scatter(m, rng, 'X', 1, [(5, 2), (4, 2)], (kx0 + 2, 5, W - 8, H - 6), 'free', 2, tries=400)           # ilha
    scatter(m, rng, 'X', 1, [(2, 2), (3, 2)], (kx0 + 1, 3, W - 7, H - 4), 'free', 2, tries=300, must=False)  # mesa
    for _ in range(4):
        m.slots.append((rng.randint(kx0 + 1, W - 8), rng.choice([4, 7, 10, 14])))
    return {'pband': (1, 1, 5, H - 2)}


# --------------------------------------------------------------------------------------------
# Fase 3: quintal dos fundos (pátio aberto, cerca, vasos, 1 árvore e poças do regador)
# --------------------------------------------------------------------------------------------
@style(3)
def style3(m, rng, sp):
    W, H = m.W, m.H
    hw, hh = rng.randint(10, 13), rng.randint(4, 5)
    m.rect(1, 1, hw, hh, '#')                         # fundos da casa
    fx = hw + rng.randint(2, 3)
    ya = rng.randint(5, 7)
    m.vline(fx, 1, ya, '#')
    m.vline(fx, ya + 4, H - 2 - (ya + 4) - 3, '#')  # cerca com portão no meio e uma brecha embaixo
    m.hline(1, H - 6, rng.randint(5, 7), '#')       # muro baixo do fundo
    scatter(m, rng, '#', 1, [(3, 3), (4, 3)], (fx + 2, 2, W - 8, H - 3), 'free', 2, tries=300, must=False)      # casinha de ferramentas
    scatter(m, rng, '#', 3, [(4, 1), (5, 1), (1, 4), (1, 5)], (1, hh + 2, W - 3, H - 2), 'wall', 1, tries=400, must=False)  # cercas vivas
    scatter(m, rng, '#', 3, [(4, 2), (3, 2), (5, 2)], (2, hh + 2, W - 3, H - 3), 'free', 1, tries=400, must=False)        # canteiros
    scatter(m, rng, 'X', 12, [(1, 1), (2, 1)], None, 'wall', 1, tries=500, must=False)                 # vasos
    scatter(m, rng, 'X', 3, [(1, 1), (2, 1), (1, 2), (2, 2)], (2, hh + 2, W - 8, H - 3), 'free', 1, tries=300, must=False)
    scatter(m, rng, 'X', 1, [(5, 1)], (2, hh + 2, W - 8, H - 3), 'free', 1, tries=300, must=False)       # varal baixo
    place_groups(m, rng, 'T', sp['T'], 2, 3, where=lambda x, y: 3 <= x <= fx - 3 and y >= hh + 3)
    place_groups(m, rng, '~', sp['water'], 3, 5, where=lambda x, y: fx - 5 <= x <= fx + 6 and y >= 3)
    for t in ((3, H - 4), (fx + 4, 4), (fx + 5, H - 4), (fx - 3, hh + 3)):
        m.slots.append(t)
    return {}


# --------------------------------------------------------------------------------------------
# auxiliares comuns
# --------------------------------------------------------------------------------------------
def near_wall(m):
    return lambda x, y: any(m.at(x + dx, y + dy) == '#' for dx, dy in D4)


def interior(m):
    return lambda x, y: all(m.at(x + dx, y + dy) != '#' for dx, dy in D8)


def sample_slots(m, rng, n, minfree=4):
    """alguns tiles bem abertos (cruzamentos, praças) como lugares de posto"""
    cands = [(x, y) for y in range(2, m.H - 2) for x in range(2, m.W - 2)
             if m.g[y][x] == '.' and sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) == '.') >= minfree]
    rng.shuffle(cands)
    m.slots.extend(cands[:n])


def fill_all(m, ch='#'):
    for y in range(1, m.H - 1):
        for x in range(1, m.W - 1):
            m.put(x, y, ch)


# --------------------------------------------------------------------------------------------
# Fase 4: jardim e varal (canteiros em tijolinho, caminhos de 2 tiles, gramados com varal e árvore)
# --------------------------------------------------------------------------------------------
@style(4)
def style4(m, rng, sp):
    W, H = m.W, m.H
    rows, y = [], 3
    while True:
        h = rng.randint(4, 5)
        if y + h > H - 4:
            break
        rows.append((y, h))
        y += h + 2
    lawns = []
    for (y, h) in rows:
        x = 3 + rng.randint(0, 4)
        while x < W - 8:
            w = rng.randint(6, 11)
            if x + w > W - 4:
                w = W - 4 - x
            if w < 4:
                break
            if rng.random() < 0.2 and w >= 6:
                lawns.append((x, y, w, h))
            else:
                m.rect(x, y, w, h, '#')
            x += w + 2
    if len(lawns) < 2:
        raise Invalid('poucos gramados')
    rng.shuffle(lawns)
    in_lawn = lambda x, y: any(lx <= x < lx + lw and ly <= y < ly + lh for (lx, ly, lw, lh) in lawns)
    place_groups(m, rng, 'T', sp['T'], 2, 3, where=in_lawn)
    for (lx, ly, lw, lh) in lawns[:3]:          # varal: uma linha de X no meio do gramado
        for x in range(lx + 1, lx + lw - 1):
            if m.free(x, ly + lh // 2):
                m.put(x, ly + lh // 2, 'X')
    if not dog_connected(m):
        raise Invalid('varal fechou o jardim')
    scatter(m, rng, '#', 1, [(7, 5)], None, 'free', 1, tries=300, must=False, where=lambda x, y: True)        # estufa
    scatter(m, rng, '#', 5, [(2, 2), (3, 2), (1, 3)], None, 'free', 1, tries=400, must=False)               # composteiras e arbustos
    scatter(m, rng, 'X', 16, [(1, 1), (2, 1), (1, 2)], None, 'wall', 1, tries=500, must=False)               # vasos, carrinhos de mão
    place_groups(m, rng, '~', sp['water'], 3, 6)
    for (lx, ly, lw, lh) in lawns:
        m.slots.append((lx + lw // 2, ly + lh // 2 - 1))
    sample_slots(m, rng, 12)
    return {}


# --------------------------------------------------------------------------------------------
# Telhados (Fases 5 e 18): ilhas de telhado no vazio (#), ligadas por muros estreitos; cercas X só o gatinho passa; chaminés T
# --------------------------------------------------------------------------------------------
def roofs(m, rng, sp, n_isl, wr, hr, ridge, fence_p, notch_p=0.5):
    W, H = m.W, m.H
    fill_all(m)
    ey = m.exit[1]
    exit_patch = (W - 6, ey - 1, 5, 5)
    left = (1 + rng.randint(0, 1), 0, rng.randint(*wr), rng.randint(*hr))
    left = (left[0], rng.randint(2, max(2, H - left[3] - 3)), left[2], left[3])
    isl = [exit_patch, left]
    tries = 0
    while len(isl) < n_isl + 2 and tries < 5000:
        tries += 1
        if ridge and rng.random() < 0.6:
            w, h = (rng.randint(10, 19), rng.randint(3, 4)) if rng.random() < 0.5 else (rng.randint(3, 4), rng.randint(9, 14))
        else:
            w, h = rng.randint(*wr), rng.randint(*hr)
        x, y = rng.randint(1, max(1, W - w - 1)), rng.randint(1, max(1, H - h - 1))
        if x + w > W - 1 or y + h > H - 1:
            continue
        if all(x + w + 2 <= ix or ix + iw + 2 <= x or y + h + 2 <= iy or iy + ih + 2 <= y for (ix, iy, iw, ih) in isl):
            isl.append((x, y, w, h))
    if len(isl) < n_isl:
        raise Invalid('poucas ilhas')
    for k, (x, y, w, h) in enumerate(isl):
        m.rect(x, y, w, h, '.', force=True)
        if k >= 2 and w >= 6 and h >= 5 and rng.random() < notch_p:     # telhado em L
            nw, nh = rng.randint(2, w // 2), rng.randint(2, h // 2)
            cx = x if rng.random() < 0.5 else x + w - nw
            cy = y if rng.random() < 0.5 else y + h - nh
            m.rect(cx, cy, nw, nh, '#')
    cen = [(x + w / 2, y + h / 2) for (x, y, w, h) in isl]
    n = len(isl)
    dist = lambda a, b: abs(cen[a][0] - cen[b][0]) + abs(cen[a][1] - cen[b][1])
    # MST (Prim)
    inn, edges = {0}, []
    while len(inn) < n:
        best = min(((dist(a, b), a, b) for a in inn for b in range(n) if b not in inn))
        edges.append((best[1], best[2], False))
        inn.add(best[2])
    have = {(min(a, b), max(a, b)) for a, b, _ in edges}
    for a in range(n):
        near = sorted((dist(a, b), b) for b in range(n) if b != a and (min(a, b), max(a, b)) not in have)[:2]
        for _, b in near[:rng.choice((1, 1, 2))]:
            if (min(a, b), max(a, b)) not in have:
                have.add((min(a, b), max(a, b)))
                edges.append((a, b, True))

    def nearest_in(r, p):
        x, y, w, h = r
        return (min(max(int(p[0]), x), x + w - 1), min(max(int(p[1]), y), y + h - 1))
    for a, b, extra in edges:
        pa, pb = nearest_in(isl[a], cen[b]), nearest_in(isl[b], cen[a])
        horiz_first = rng.random() < 0.5
        path = []
        x, y = pa
        steps = [(pb[0], pa[1]), pb] if horiz_first else [(pa[0], pb[1]), pb]
        for (tx, ty) in steps:
            while (x, y) != (tx, ty):
                x += (tx > x) - (tx < x)
                y += (ty > y) - (ty < y)
                path.append((x, y))
        width = 2 if rng.random() < 0.2 else 1
        new = []
        for (x, y) in path:
            for k in range(width):
                tx, ty = (x, y + k) if horiz_first and (x, y) in path[:len(path) // 2 + 1] else (x + k, y)
                if m.at(tx, ty) == '#' and m.inside(tx, ty):
                    m.put(tx, ty, '.', force=True)
                    if k == 0:
                        new.append((tx, ty))
        if extra and width == 1 and rng.random() < fence_p and len(new) >= 4:
            for i in sorted(range(1, len(new) - 1), key=lambda i: abs(i - len(new) // 2)):
                x, y = new[i]
                if (m.at(x - 1, y) == '#' and m.at(x + 1, y) == '#') or (m.at(x, y - 1) == '#' and m.at(x, y + 1) == '#'):
                    m.g[y][x] = 'X'
                    break
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=interior(m))
    scatter(m, rng, 'X', 3 if not ridge else 5, [(3, 1), (2, 1), (1, 2)], None, 'wall', 1, tries=300, must=False)
    for k, (x, y, w, h) in enumerate(isl[1:], 1):
        if w >= 5 and h >= 4:
            m.slots.append((x + w // 2, y + h // 2))


@style(5)
def style5(m, rng, sp):
    roofs(m, rng, sp, 10, (6, 11), (5, 8), False, 0.5)
    return {}


@style(18)
def style18(m, rng, sp):
    roofs(m, rng, sp, 14, (7, 11), (5, 7), True, 0.55)
    return {}


# --------------------------------------------------------------------------------------------
# Ruas por partição (BSP): becos (Fase 6) e vila (Fase 15)
# --------------------------------------------------------------------------------------------
def bsp(m, rng, x0, y0, x1, y1, minw, minh, maxw, maxh, sw_fn, leaves):
    w, h = x1 - x0 + 1, y1 - y0 + 1
    sw = sw_fn()
    can_v = w >= 2 * minw + sw
    can_h = h >= 2 * minh + sw
    want = w > maxw or h > maxh or (rng.random() < 0.25 and (can_v or can_h))
    if not want or not (can_v or can_h):
        leaves.append((x0, y0, w, h))
        return
    vertical = can_v and (not can_h or (w / maxw) * rng.uniform(0.7, 1.3) >= (h / maxh) * rng.uniform(0.7, 1.3))
    if vertical:
        c = rng.randint(x0 + minw, x1 - minw - sw + 1)
        bsp(m, rng, x0, y0, c - 1, y1, minw, minh, maxw, maxh, sw_fn, leaves)
        bsp(m, rng, c + sw, y0, x1, y1, minw, minh, maxw, maxh, sw_fn, leaves)
    else:
        c = rng.randint(y0 + minh, y1 - minh - sw + 1)
        bsp(m, rng, x0, y0, x1, c - 1, minw, minh, maxw, maxh, sw_fn, leaves)
        bsp(m, rng, x0, c + sw, x1, y1, minw, minh, maxw, maxh, sw_fn, leaves)


def courtyard(m, rng, x, y, w, h):
    """pátio interno de um quarteirão: miolo vazio e uma entrada de 2 tiles"""
    m.rect(x + 2, y + 2, w - 4, h - 4, '.')
    side = rng.choice('NSWE')
    if side in 'NS' and w >= 8:
        ex = x + rng.randint(2, w - 4)
        for k in range(2):
            m.rect(ex, (y if side == 'N' else y + h - 2), 2, 2, '.')
    elif h >= 7:
        ey = y + rng.randint(2, h - 4)
        m.rect((x if side == 'W' else x + w - 2), ey, 2, 2, '.')
    else:
        m.rect(x + 2, y, 2, 2, '.')


@style(6)
def style6(m, rng, sp):
    W, H = m.W, m.H
    leaves = []
    bsp(m, rng, 3, 3, W - 4, H - 4, 4, 4, 12, 9, lambda: 1 if rng.random() < 0.3 else 2, leaves)
    for (x, y, w, h) in leaves:
        if rng.random() < 0.03:
            continue                                  # pracinha
        m.rect(x, y, w, h, '#')
        if w >= 8 and h >= 7 and rng.random() < 0.3:
            courtyard(m, rng, x, y, w, h)
    connect_pockets(m, rng, 1)
    scatter(m, rng, 'X', 14, [(1, 1), (2, 1), (1, 2)], None, 'wall', 1, tries=400, must=False)   # lixeiras
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=near_wall(m))
    place_groups(m, rng, '~', sp['water'], 3, 8)
    sample_slots(m, rng, 25)
    return {}


# --------------------------------------------------------------------------------------------
# Fileiras de barracas (Fase 7: feira em fileiras; Fase 19: quadras em volta de uma praça)
# --------------------------------------------------------------------------------------------
def stall_rows(m, rng, x0, x1, y_start, y_end, stall_h, aisle_h, wr, gaps, skip_p=0.08, offset=3):
    y, rows = y_start, []
    while y + stall_h + 1 <= y_end:
        x = x0 + rng.randint(0, offset)
        while x + wr[0] <= x1 + 1:
            w = min(rng.randint(*wr), x1 + 1 - x)
            if w >= wr[0] - 1 and rng.random() > skip_p:
                m.rect(x, y, w, stall_h, '#')
            x += w + rng.choice(gaps)
        rows.append(y)
        y += stall_h + aisle_h
    return rows


@style(7)
def style7(m, rng, sp):
    W, H = m.W, m.H
    stall_rows(m, rng, 2, W - 3, 3, H - 4, 3, 3, (4, 7), [1, 1, 2, 2, 3])
    cx, cy = W // 2 + rng.randint(-5, 5), H // 2 + rng.randint(-3, 3)
    m.rect(cx - 6, cy - 3, 13, 7, '.')                                    # a praça da feira
    m.slots.append((cx, cy))
    scatter(m, rng, 'X', 3, [(2, 2), (3, 1), (2, 1)], (cx - 5, cy - 2, cx + 5, cy + 2), 'free', 1, tries=200, must=False)
    scatter(m, rng, 'X', 18, [(1, 1), (2, 1), (1, 2), (2, 2)], None, 'wall', 1, tries=400, must=False)        # caixotes
    connect_pockets(m, rng, 2)
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=near_wall(m))
    place_groups(m, rng, '~', sp['water'], 3, 6)
    sample_slots(m, rng, 20)
    return {}


@style(19)
def style19(m, rng, sp):
    W, H = m.W, m.H
    # quadras: o interior é dividido em colunas e linhas com ruas de 3 tiles
    def cuts(total, n, street):
        usable = total - street * (n + 1)
        base = [usable // n] * n
        for i in range(usable - sum(base)):
            base[i] += 1
        for _ in range(3):
            i, j = rng.sample(range(n), 2)
            if base[i] > 12 and base[j] < 17:
                base[i] -= 1
                base[j] += 1
        out, p = [], 1 + street
        for b in base:
            out.append((p, b))
            p += b + street
        return out
    cols, rws = cuts(W - 2, 3, 3), cuts(H - 2, 3, 3)
    clusters = [(x, y, w, h) for (y, h) in rws for (x, w) in cols]
    plaza = rng.choice(clusters[3:6])
    for (x, y, w, h) in clusters:
        if (x, y, w, h) == plaza:
            m.slots.append((x + w // 2, y + h // 2))
            scatter(m, rng, 'X', 3, [(2, 2), (3, 1), (2, 1)], (x + 2, y + 2, x + w - 3, y + h - 3), 'free', 1, tries=200, must=False)
            continue
        rows = stall_rows(m, rng, x, x + w - 1, y, y + h, 3, 2, (4, 6), [1, 1, 2], skip_p=0.08, offset=1)
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'X', 18, [(1, 1), (2, 1), (1, 2), (2, 2)], None, 'wall', 1, tries=400, must=False)
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=near_wall(m))
    place_groups(m, rng, '~', sp['water'], 3, 8)
    sample_slots(m, rng, 24)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 8: peixaria e mercado (câmaras frias, balcões compridos, piso molhado em faixas, caixas de gelo)
# --------------------------------------------------------------------------------------------
@style(8)
def style8(m, rng, sp):
    W, H = m.W, m.H
    wx = 13
    m.vline(wx, 1, H - 2, '#')
    nroom = 4
    bounds = [1]
    for i in range(1, nroom):
        bounds.append(1 + (H - 2) * i // nroom + rng.randint(-1, 1))
    bounds.append(H - 1)
    rooms = []
    for i in range(nroom):
        y0, y1 = bounds[i], bounds[i + 1] - 1
        if i > 0:
            m.hline(1, y0 - 1, wx - 1, '#') if False else None
        rooms.append((1, y0, wx - 1, y1))
    for i in range(1, nroom):
        m.hline(1, bounds[i] - 1 + 0, wx, '#')
    rr = []
    for i in range(nroom):
        y0, y1 = bounds[i] + (1 if i > 0 else 0), bounds[i + 1] - 2 + (1 if i == nroom - 1 else 0)
        rr.append((1, y0, wx - 1, y1))
        if y1 - y0 >= 5:
            door(m, wx, y0 + 1, 'v')
            door(m, wx, y1 - 2, 'v')
            keep_door(m, wx, y0 + 1, 'v')
            keep_door(m, wx, y1 - 2, 'v')
        else:
            door(m, wx, (y0 + y1) // 2, 'v')
    room_slots(m, rr)
    for (x0, y0, x1, y1) in rr:
        scatter(m, rng, '#', 2, [(1, 4), (1, 5), (5, 1), (4, 1)], (x0, y0, x1, y1), 'wall', 2, tries=300, must=False)    # prateleiras
        scatter(m, rng, 'X', 3, [(2, 1), (1, 2), (2, 2)], (x0, y0, x1, y1), 'free', 1, tries=300, must=False)
    # o salão
    hx0 = wx + 2
    k = 0
    y = 4
    while y + 4 < H - 3:
        x = hx0 + rng.randint(0, 3)
        while x + 8 < W - 7:
            w = rng.randint(8, 14)
            w = min(w, W - 7 - x)
            m.rect(x, y, w, 3, '#')
            x += w + rng.choice((2, 3, 4))
        y += 7
    scatter(m, rng, '#', 6, [(1, 1), (2, 2)], (hx0, 2, W - 7, H - 3), 'free', 2, tries=200, must=False)    # colunas e pias
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'X', 9, [(2, 1), (1, 2), (2, 2)], (hx0, 2, W - 2, H - 2), 'wall', 1, tries=300, must=False)  # caixas de gelo
    scatter(m, rng, '~', sp['water'], [(5, 2), (4, 2), (2, 5), (3, 3), (2, 4)], (hx0, 2, W - 2, H - 3), 'any', 1, tries=800, keep_dog=False)
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=near_wall(m))
    sample_slots(m, rng, 18)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 9: parque e lago (trilhas orgânicas em volta do lago; # = água funda e moitas, ~ = margem rasa, T = árvores, X = bancos)
# --------------------------------------------------------------------------------------------
def lake(m, rng, cx, cy, rx, ry):
    p1, p2, p3 = rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)
    cells = set()
    for y in range(1, m.H - 1):
        for x in range(1, m.W - 1):
            ang = math.atan2((y - cy) / ry, (x - cx) / rx)
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            d *= 1 + 0.16 * math.sin(3 * ang + p1) + 0.09 * math.sin(5 * ang + p2) + 0.05 * math.sin(7 * ang + p3)
            if d < 1:
                cells.add((x, y))
    return cells


@style(9)
def style9(m, rng, sp):
    W, H = m.W, m.H
    cx, cy = W // 2 + rng.randint(-5, 5), H // 2 + rng.randint(-2, 2)
    lk = lake(m, rng, cx, cy, rng.randint(11, 13), rng.randint(7, 8))
    near_lake = lambda x, y: any((x + dx, y + dy) in lk for dx in range(-9, 10, 3) for dy in range(-7, 8, 3)) and \
        min(abs(x - cx) / 14.0, 9) < 9
    noise_blobs(m, rng, (1, 1, W - 2, H - 2), 0.5, 4, '#', where=lambda x, y: (x, y) not in lk and ((x - cx) / 16.0) ** 2 + ((y - cy) / 10.5) ** 2 > 1)
    # clareiras e trilhas
    clears = [(rng.randint(5, W - 8), rng.randint(4, H - 6)) for _ in range(5)]
    for (x, y) in clears:
        for j in range(-3, 4):
            for i in range(-4, 5):
                if (i / 4.5) ** 2 + (j / 3.5) ** 2 < 1:
                    m.put(x + i, y + j, '.')
    pts = [(3, rng.randint(3, H - 5)), (cx - 15, cy), (cx + 15, cy), (cx, cy - 11), (cx, cy + 11)] + clears[:3]
    for (px, py) in pts:
        carve_walk(m, rng, (max(2, min(W - 4, px)), max(2, min(H - 4, py))), (cx - 14 if px < cx else cx + 14, cy), 2, 0.3)
    for (x, y) in lk:
        m.put(x, y, '#', force=True)
    # trilha em volta do lago
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if (x, y) in lk:
                continue
            if any((x + dx, y + dy) in lk for dx in (-1, 0, 1) for dy in (-1, 0, 1)) and m.g[y][x] == '#':
                m.put(x, y, '.')
    connect_pockets(m, rng, 2)
    place_groups(m, rng, '~', sp['water'], 3, 8, where=lambda x, y: any((x + dx, y + dy) in lk for dx, dy in D4 + ((2, 0), (-2, 0), (0, 2), (0, -2))))
    place_groups(m, rng, 'T', sp['T'], 1, 3, where=lambda x, y: all(m.at(x + dx, y + dy) != '#' for dx, dy in D4))
    scatter(m, rng, 'X', 6, [(3, 1), (2, 1)], None, 'wall', 1, tries=300, must=False)
    sample_slots(m, rng, 20, 4)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 10: armazém de grãos (corredores de prateleiras, pilhas T, paletes X)
# --------------------------------------------------------------------------------------------
@style(10)
def style10(m, rng, sp):
    W, H = m.W, m.H
    segs = []
    x = 11
    while x + 2 <= W - 8:
        y = 2
        while y < H - 5:
            ln = rng.randint(7, 14)
            ln = min(ln, H - 3 - y)
            if ln >= 5:
                m.rect(x, y, 2, ln, '#')
                segs.append((x, y, 2, ln))
            y += ln + rng.choice((2, 3, 3))
        x += 2 + rng.choice((2, 2, 3))
    # pilhas T no lado de um corredor (trocam uma ou duas prateleiras da fileira)
    chosen = rng.sample(segs, min(len(segs), sp['T']))
    for (sx, sy, sw, sl) in chosen:
        k = rng.randint(1, sl - 2)
        size = rng.choice((1, 2))
        if size == 2:
            m.rect(sx, sy + k, 2, 1, 'T', force=True)
        else:
            m.put(sx + rng.choice((0, 1)), sy + k, 'T', force=True)
    if len(groups_of(m, 'T')) != sp['T']:
        raise Invalid('pilhas T juntas')
    # doca de carga: palletes
    scatter(m, rng, 'X', 6, [(2, 2), (2, 1), (1, 1)], (2, 2, 10, H - 3), 'free', 1, tries=300, must=False)
    scatter(m, rng, 'X', 6, [(2, 1), (1, 2), (1, 1)], (12, 2, W - 8, H - 3), 'wall', 1, tries=300, must=False)
    scatter(m, rng, '#', 3, [(2, 2), (1, 1)], (2, 2, 10, H - 3), 'free', 2, tries=200, must=False)
    place_groups(m, rng, '~', sp['water'], 3, 8, where=lambda x, y: x <= 11 or x >= W - 9)
    sample_slots(m, rng, 20)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 11: celeiro e curral (baias dos dois lados dos corredores, corredor em volta, currais no pátio, fardos X, palheiros T)
# --------------------------------------------------------------------------------------------
@style(11)
def style11(m, rng, sp):
    W, H = m.W, m.H
    B = 34
    m.vline(B, 1, H - 2, '#')
    # fileiras de baias de 7 de altura: A (porta embaixo), corredor 1, B (porta em cima), C (porta embaixo), corredor 2, D (porta em cima)
    ys = [3, 13, 20, 30]
    doors_down = [True, False, True, False]
    stalls = []
    nst = (B - 8) // 6
    for (y0, dd) in zip(ys, doors_down):
        for k in range(nst):
            x0 = 4 + 6 * k
            m.box(x0, y0, 7, 7, '#')
            dx = x0 + rng.randint(1, 3)
            door(m, dx, y0 + 6 if dd else y0, 'h')
            stalls.append((x0 + 1, y0 + 1, x0 + 5, y0 + 5))
    for yd in (10, 27):
        door(m, B, yd, 'v', 3)
    room_slots(m, [(1, 10, B - 1, 12), (1, 27, B - 1, 29)])
    inbarn = lambda x, y: any(a <= x <= c and b <= y <= d for (a, b, c, d) in stalls)
    for (a, b, c, d) in stalls:
        scatter(m, rng, 'X', rng.randint(1, 2), [(1, 1), (2, 1), (2, 2)], (a, b, c, d), 'any', 1, tries=60, must=False)
    place_groups(m, rng, 'T', sp['T'], 1, 3, where=inbarn)
    # curral: cercados no pátio, com portão de 3 tiles
    px = B + 3
    for (py, ph) in ((3, 9), (H - 12, 9), (H // 2 - 5, 9)):
        pw = rng.randint(10, 13)
        m.box(px, py, pw, ph, '#')
        side = rng.choice('NSW')
        if side == 'W':
            door(m, px, py + 3, 'v', 3)
        elif side == 'N':
            door(m, px + 3, py, 'h', 3)
        else:
            door(m, px + 3, py + ph - 1, 'h', 3)
        m.slots.append((px + pw // 2, py + ph // 2))
        px += rng.choice((0, 2, 4))
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'X', 14, [(2, 2), (3, 1), (2, 1), (1, 1)], (B + 1, 2, W - 8, H - 3), 'free', 1, tries=400, must=False)   # fardos
    scatter(m, rng, '#', 2, [(4, 4), (5, 3)], (B + 1, 2, W - 8, H - 3), 'free', 2, tries=300, must=False)      # silo e galpão
    scatter(m, rng, 'X', 4, [(1, 1), (2, 1)], (1, 1, B - 1, H - 2), 'wall', 1, tries=200, must=False)
    place_groups(m, rng, '~', sp['water'], 3, 6, where=lambda x, y: not inbarn(x, y))
    sample_slots(m, rng, 10)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 12: horta e galinheiro (fileiras compridas de canteiros e um cercado com o galinheiro)
# --------------------------------------------------------------------------------------------
@style(12)
def style12(m, rng, sp):
    W, H = m.W, m.H
    ey = m.exit[1]
    top = ey > H // 2
    cw, ch_ = 15, 11
    cy0 = 2 if top else H - ch_ - 2
    cx0 = rng.randint(W // 2 - 4, W - cw - 8)
    comp = (cx0, cy0, cw, ch_)
    incomp = lambda x, y: cx0 <= x < cx0 + cw and cy0 <= y < cy0 + ch_
    x = 5
    while x + 2 <= W - 8:
        y = 2
        while y < H - 5:
            ln = min(rng.randint(8, 16), H - 3 - y)
            if ln >= 5:
                for j in range(y, y + ln):
                    for i in (x, x + 1):
                        if not (cx0 - 2 <= i < cx0 + cw + 2 and cy0 - 2 <= j < cy0 + ch_ + 2):
                            m.put(i, j, '#')
            y += ln + rng.choice((2, 3))
        x += 4
    m.rect(cx0 - 1, cy0 - 1, cw + 2, ch_ + 2, '.', force=True)
    m.box(cx0, cy0, cw, ch_, '#')                                        # a cerca do galinheiro
    gate_y = cy0 + ch_ - 4 if top else cy0 + 2
    door(m, cx0, gate_y, 'v', 3)
    door(m, cx0 + cw - 1, cy0 + ch_ // 2, 'v', 2)
    m.rect(cx0 + cw - 6, cy0 + (1 if not top else ch_ - 5), 5, 4, '#')    # a casinha das galinhas
    m.slots.append((cx0 + 4, cy0 + ch_ // 2))
    place_groups(m, rng, 'T', 2, 1, 2, where=lambda x, y: incomp(x, y) and 0 < x - cx0 < cw - 1 and 0 < y - cy0 < ch_ - 1)      # poleiros
    scatter(m, rng, 'X', 3, [(2, 1), (1, 1)], (cx0 + 1, cy0 + 1, cx0 + cw - 2, cy0 + ch_ - 2), 'any', 1, tries=100, must=False)  # ninhos
    place_groups(m, rng, 'T', sp['T'] - 2, 1, 2, where=lambda x, y: not incomp(x, y) and any(m.at(x + dx, y + dy) == '#' for dx, dy in D4))   # barris de água
    scatter(m, rng, 'X', 8, [(1, 1), (2, 1), (1, 2)], None, 'wall', 1, tries=300, must=False)
    connect_pockets(m, rng, 2)
    place_groups(m, rng, '~', sp['water'], 3, 8, where=lambda x, y: not incomp(x, y))
    sample_slots(m, rng, 12)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 13: borda da mata (moitas orgânicas, clareiras com árvores T, troncos X)
# --------------------------------------------------------------------------------------------
@style(13)
def style13(m, rng, sp):
    W, H = m.W, m.H
    noise_blobs(m, rng, (1, 1, W - 2, H - 2), 0.58, 4, '#')
    clears = []
    for _ in range(80):
        if len(clears) >= 7:
            break
        c = (rng.randint(6, W - 8), rng.randint(5, H - 7), rng.randint(3, 5))
        if all(math.hypot(c[0] - o[0], c[1] - o[1]) > c[2] + o[2] + 2 for o in clears):
            clears.append(c)
    for (cx, cy, r) in clears:
        for j in range(-r, r + 1):
            for i in range(-r - 1, r + 2):
                if (i / (r + 1.2)) ** 2 + (j / (r + 0.2)) ** 2 < 1:
                    m.put(cx + i, cy + j, '.')
    pts = [(3, H // 2)] + [(c[0], c[1]) for c in sorted(clears)] + [(W - 8, m.exit[1] + 1)]
    for a, b in zip(pts, pts[1:]):
        carve_walk(m, rng, a, b, 2, 0.35)
    for _ in range(3):
        a, b = rng.sample(pts, 2)
        carve_walk(m, rng, a, b, 2, 0.4)
    connect_pockets(m, rng, 2)
    inclear = lambda x, y: any(math.hypot(x - cx, y - cy) < r - 0.5 for (cx, cy, r) in clears)
    place_groups(m, rng, 'T', sp['T'], 1, 3, where=lambda x, y: inclear(x, y) and all(m.at(x + dx, y + dy) != '#' for dx, dy in D4))
    scatter(m, rng, 'X', 9, [(3, 1), (4, 1), (1, 3), (1, 1)], None, 'any', 1, tries=300, must=False)    # troncos e pedras
    place_groups(m, rng, '~', sp['water'], 3, 6)
    for (cx, cy, r) in clears:
        m.slots.append((cx, cy))
    sample_slots(m, rng, 10)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 14: riacho e pedras (riacho # com vaus ~ e pedras X; margens com moitas e árvores)
# --------------------------------------------------------------------------------------------
@style(14)
def style14(m, rng, sp):
    W, H = m.W, m.H
    cx = W // 2 + rng.randint(-3, 3)
    ph = rng.uniform(0, 6)
    cols = {}
    for y in range(1, H - 1):
        c = cx + int(round(5 * math.sin(y / 6.5 + ph) + 1.5 * math.sin(y / 2.9 + ph * 2)))
        cols[y] = c
        for i in range(3):
            m.put(c + i, y, '#', force=True)
    cand = [y for y in range(H // 3, 2 * H // 3 + 1) if cols[y] <= cx + 1]
    ty = rng.choice(cand or [min(range(H // 3, 2 * H // 3 + 1), key=lambda y: cols[y])])   # afluente (vem da direita)
    tc = {}
    for x in range(cols[ty] + 3, W - 1):
        r = ty + int(round(2 * math.sin(x / 5.0 + ph)))
        tc[x] = r
        for j in range(2):
            m.put(x, r + j, '#')
    # 5 vaus no riacho (2 linhas x a largura do riacho), 3 no afluente e 2 travessias de pedras X (só o gatinho passa)
    ford_ys = [int(round(4 + k * (H - 12) / 4.0)) + rng.randint(-1, 1) for k in range(5)]
    for y in ford_ys:
        for yy in (y, y + 1):
            for i in range(3):
                m.g[yy][cols[yy] + i] = '~'
    for k in rng.sample(range(4), 2):
        y = ford_ys[k] + 4
        for i in range(3):
            m.g[y][cols[y] + i] = 'X'
    a = cols[ty] + 5
    for x in (a, a + 6, a + 12):
        if x + 1 > W - 7:
            raise Invalid('afluente curto')
        for xx in (x, x + 1):
            for j in range(2):
                if (xx, tc[xx] + j) not in m.lock:
                    m.g[tc[xx] + j][xx] = '~'
    if len(groups_of(m, '~')) != sp['water']:
        raise Invalid('vaus: %d grupos' % len(groups_of(m, '~')))
    # limpa a beira dos vaus e das pedras para o caminho abrir
    for y in ford_ys + [f + 4 for f in ford_ys]:
        for yy in (y, y + 1):
            for k in (-2, -1, 3, 4):
                m.put(cols[yy] + k, yy, '.')
    connect_pockets(m, rng, 2)
    scatter(m, rng, '#', 14, [(2, 2), (3, 2), (2, 3), (3, 3)], None, 'free', 2, tries=300, must=False)    # pedregulhos grandes
    scatter(m, rng, '#', 6, [(6, 1), (8, 1), (1, 6), (1, 8)], None, 'free', 2, tries=300, must=False)     # cercas das pastagens
    scatter(m, rng, 'X', 16, [(1, 1), (2, 1), (2, 2)], None, 'any', 1, tries=400, must=False)       # pedras nas margens
    place_groups(m, rng, 'T', sp['T'], 1, 3, where=lambda x, y: all(m.at(x + dx, y + dy) == '.' for dx, dy in D8))
    sample_slots(m, rng, 24, 4)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 15: vila de pescadores (mar, praia com barcos e redes X, casinhas em ruas de areia)
# --------------------------------------------------------------------------------------------
@style(15)
def style15(m, rng, sp):
    W, H = m.W, m.H            # (o mapa é desenhado deitado: o mar fica no alto; depois a orientação o gira)
    shore = {}
    p = rng.uniform(0, 6)
    for x in range(1, W - 1):
        shore[x] = 5 + int(round(1.5 * math.sin(x / 4.0 + p) + math.sin(x / 1.7 + 2 * p)))
        for y in range(1, shore[x] + 1):
            m.put(x, y, '#')
    # molhe (pier) entrando no mar
    for px in (rng.randint(8, 14), rng.randint(W - 16, W - 9)):
        m.rect(px, 1, 2, shore[px] + 2, '.')
    leaves = []
    bsp(m, rng, 2, 19, W - 3, H - 3, 5, 4, 13, 9, lambda: rng.choice((2, 3, 3)), leaves)
    for (x, y, w, h) in leaves:
        if rng.random() < 0.05:
            continue
        ix, iy = rng.choice((0, 1)), rng.choice((0, 1))
        m.rect(x + ix, y + iy, max(3, w - 1 - rng.choice((0, 1))), max(3, h - 1 - rng.choice((0, 1))), '#')
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'X', 5, [(4, 1), (5, 1), (3, 1)], (2, 8, W - 3, 17), 'free', 1, tries=300)               # barcos
    scatter(m, rng, 'X', 4, [(1, 1), (2, 1)], (2, 8, W - 3, 17), 'any', 1, tries=200, must=False)
    scatter(m, rng, 'X', 6, [(5, 1), (4, 1), (1, 4)], (2, 18, W - 3, H - 3), 'wall', 1, tries=300, must=False)  # redes secando
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=near_wall(m))
    place_groups(m, rng, '~', sp['water'], 3, 8, where=lambda x, y: shore[min(W - 2, max(1, x))] < y <= shore[min(W - 2, max(1, x))] + 4)
    sample_slots(m, rng, 20)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 16: docas do porto (pátio de contêineres, cais molhado, píeres no mar, guindastes)
# --------------------------------------------------------------------------------------------
@style(16)
def style16(m, rng, sp):
    W, H = m.W, m.H
    q = H - 13                                       # linha do cais
    # pátio de contêineres: fileiras de blocos de 2 de altura, corredores de 3
    y = 3
    while y + 3 < q - 3:
        x = 3 + rng.randint(0, 3)
        while x + 5 < W - 7:
            w = min(rng.choice((5, 6, 7, 8)), W - 7 - x)
            if rng.random() > 0.12:
                m.rect(x, y, w, 2, '#')
            x += w + rng.choice((1, 1, 2, 3))
        y += 5
    # o mar com píeres
    for yy in range(q, H - 1):
        for xx in range(1, W - 1):
            m.put(xx, yy, '#')
    piers = [rng.randint(5, 9), rng.randint(18, 24), rng.randint(32, 38), rng.randint(46, W - 8)]
    for px in piers:
        m.rect(px, q - 1, 3, H - q - 2, '.', force=True)
    m.rect(piers[0], H - 4, piers[-1] - piers[0] + 3, 2, '.', force=True)      # píer de baixo liga os de cima
    # guindastes (bases 2x2 na beira do cais)
    for gx in (piers[0] + 6, piers[1] + 6, piers[2] + 7):
        m.rect(gx, q - 3, 2, 2, '#')
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'T', sp['T'], [(3, 1), (2, 1), (1, 1)], (2, 2, W - 3, q - 2), 'wall', 1, tries=600)     # contêineres baixos: lugares altos
    scatter(m, rng, 'X', 10, [(1, 1), (2, 1), (2, 2)], None, 'any', 1, tries=400, must=False, where=lambda x, y: y >= 2)
    scatter(m, rng, '~', sp['water'], [(5, 2), (4, 2), (3, 2), (5, 1)], (2, q - 4, W - 3, q), 'any', 1, tries=800, keep_dog=False)
    sample_slots(m, rng, 24)
    return {'erange': True}


# --------------------------------------------------------------------------------------------
# Fase 17: praia e dunas (areia aberta, mar embaixo com faixa molhada, dunas # em ilhas, poucos abrigos T)
# --------------------------------------------------------------------------------------------
@style(17)
def style17(m, rng, sp):
    W, H = m.W, m.H
    p = rng.uniform(0, 6)
    shore = {}
    for x in range(1, W - 1):
        shore[x] = H - 10 + int(round(2 * math.sin(x / 5.0 + p) + 1.5 * math.sin(x / 2.3 + 2 * p)))
        for y in range(shore[x], H - 1):
            m.put(x, y, '#')
    dunes = []
    for _ in range(400):
        if len(dunes) >= 15:
            break
        c = (rng.randint(4, W - 8), rng.randint(3, H - 14), rng.randint(2, 5), rng.randint(2, 3))
        if all(abs(c[0] - o[0]) > c[2] + o[2] + 3 or abs(c[1] - o[1]) > c[3] + o[3] + 3 for o in dunes):
            dunes.append(c)
    for (cx, cy, rx, ry) in dunes:
        for j in range(-ry, ry + 1):
            for i in range(-rx, rx + 1):
                if (i / (rx + 0.5)) ** 2 + (j / (ry + 0.5)) ** 2 <= 1:
                    m.put(cx + i, cy + j, '#')
    connect_pockets(m, rng, 2)
    place_groups(m, rng, '~', sp['water'], 4, 10, where=lambda x, y: shore.get(x, 99) - 3 <= y < shore.get(x, 99))
    place_groups(m, rng, 'T', sp['T'], 1, 2, where=lambda x, y: all(m.at(x + dx, y + dy) == '.' for dx, dy in D8))
    scatter(m, rng, 'X', 12, [(3, 1), (4, 1), (1, 1), (2, 1)], None, 'any', 1, tries=300, must=False)
    scatter(m, rng, '#', 4, [(2, 2), (3, 2)], (2, 2, W - 8, H - 15), 'free', 2, tries=200, must=False)
    sample_slots(m, rng, 26, 4)
    return {}


# --------------------------------------------------------------------------------------------
# Fase 20: a casa grande (a casa da Fase 1 em versão grande: faixas de cômodos e corredores em volta de uma sala central)
# --------------------------------------------------------------------------------------------
def split_band(m, rng, y0, y1, x0, x1, wmin, wmax, doors_side, wall_y):
    """divide uma faixa em cômodos por paredes verticais; cada cômodo ganha porta (2 tiles) para o corredor"""
    rooms, x = [], x0
    while x1 - x >= wmin:
        w = rng.randint(wmin, wmax)
        if x1 - (x + w) < wmin:
            w = x1 - x + 1
        rooms.append((x, y0, x + w - 1, y1))
        x += w + 1
        if x <= x1:
            m.vline(x - 1, y0, y1 - y0 + 1, '#')
    for (rx0, ry0, rx1, ry1) in rooms:
        dx = rng.randint(rx0 + 1, max(rx0 + 1, rx1 - 2))
        door(m, dx, wall_y, 'h')
        keep_door(m, dx, wall_y, 'h')
    # portas entre cômodos vizinhos
    for a, b in zip(rooms, rooms[1:]):
        if rng.random() < 0.45:
            dy = rng.randint(a[1] + 1, a[3] - 3)
            door(m, a[2] + 1, dy, 'v')
            keep_door(m, a[2] + 1, dy, 'v')
    return rooms


@style(20)
def style20(m, rng, sp):
    W, H = m.W, m.H
    wys = [13, 17, 29, 33]
    for wy in wys:
        m.hline(1, wy, W - 2, '#')
    roomsA = split_band(m, rng, 1, 12, 1, W - 2, 8, 12, 'S', 13)
    roomsC = split_band(m, rng, 34, H - 2, 1, W - 2, 8, 12, 'N', 33)
    # faixa do meio: cozinha, sala e jantar, com portas para os dois corredores
    mids, x = [], 1
    cuts = sorted(rng.sample(range(18, W - 20), 1))
    cuts = [cuts[0], cuts[0] + rng.randint(14, 18)]
    edges = [1] + [c for c in cuts] + [W - 2]
    for i in range(3):
        x0 = edges[i] if i == 0 else edges[i] + 1
        x1 = edges[i + 1] - (1 if i < 2 else 0)
        mids.append((x0, 18, x1, 28))
        if i < 2:
            m.vline(edges[i + 1], 18, 11, '#')
            door(m, edges[i + 1], rng.randint(20, 25), 'v', 3)
            keep_door(m, edges[i + 1], 22, 'v', 3)
    for (x0, y0, x1, y1) in mids:
        for wy, side in ((17, 'N'), (29, 'S')):
            dx = rng.randint(x0 + 2, max(x0 + 2, x1 - 3))
            door(m, dx, wy, 'h', 3)
            keep_door(m, dx, wy, 'h', 3)
    rooms = roomsA + roomsC + mids
    room_slots(m, rooms)
    for (x0, y0, x1, y1) in roomsA + roomsC:
        scatter(m, rng, 'X', 1, [(3, 2), (4, 2)], (x0, y0, x1, y1), 'wall', 2, tries=150, must=False)
        scatter(m, rng, 'X', 3, [(2, 1), (1, 1), (2, 2), (3, 1)], (x0, y0, x1, y1), rng.choice(['wall', 'free']), 2, tries=200, must=False)
        scatter(m, rng, '#', 3, [(1, 3), (3, 1), (1, 4), (4, 1)], (x0, y0, x1, y1), 'wall', 1, tries=200, must=False)
        scatter(m, rng, 'X', 2, [(1, 1)], (x0, y0, x1, y1), 'wall', 1, tries=100, must=False)
    for (x0, y0, x1, y1) in mids:
        scatter(m, rng, 'X', 3, [(4, 1), (3, 1), (5, 1), (6, 1)], (x0, y0, x1, y1), 'wall', 2, tries=300, must=False)
        scatter(m, rng, 'X', 2, [(3, 2), (2, 2), (4, 2)], (x0 + 2, y0 + 2, x1 - 2, y1 - 2), 'free', 2, tries=300, must=False)
        scatter(m, rng, '#', 3, [(1, 3), (1, 4), (1, 5)], (x0, y0, x1, y1), 'wall', 1, tries=200, must=False)
        scatter(m, rng, 'X', 3, [(1, 1)], (x0, y0, x1, y1), 'wall', 1, tries=100, must=False)
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'T', sp['T'], [(1, 3), (3, 1), (1, 2), (2, 1)], (2, 2, W - 3, H - 3), 'wall', 1, tries=600)
    place_groups(m, rng, '~', sp['water'], 3, 7, where=lambda x, y: sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) == '.') >= 3)
    return {}
