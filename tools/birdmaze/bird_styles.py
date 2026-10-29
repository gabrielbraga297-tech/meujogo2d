# -*- coding: utf-8 -*-
"""Um estilo de desenho por ambiente do Passarinho (Fases 1 a 20). Cada estilo recebe a grade `m` no SENTIDO PADRÃO (início à esquerda, saída à direita;
as outras orientações vêm depois por espelho/transposição), o sorteador `rng` da semente e a tabela da fase `sp`. Desenha paredes (B = bloco duro que vira #,
M = muro fino que o voo alto atravessa, # = parede automática: M se for fina, # se for grossa), obstáculos baixos (X) e preenche `m.slots` (bons lugares
para postos). Devolve um dicionário com ajustes para o acabamento (galhos e ventos): g_where, wind_where, wind_prefer, pband. Veja gen_bird.py."""
from bird_core import *

STYLES = {}


def style(n):
    def deco(f):
        STYLES[n] = f
        return f
    return deco


# --------------------------------------------------------------------------------------------
# auxiliares comuns
# --------------------------------------------------------------------------------------------
def keep_door(m, x, y, orient, width=2, depth=2):
    for i in range(width):
        for k in range(-depth, depth + 1):
            m.keep.add((x + k, y + i) if orient == 'v' else (x + i, y + k))


def room_slots(m, rooms):
    for (x0, y0, x1, y1) in rooms:
        m.slots.append(((x0 + x1) // 2, (y0 + y1) // 2))


def sample_slots(m, rng, n, minfree=4):
    cands = [(x, y) for y in range(2, m.H - 2) for x in range(2, m.W - 2)
             if m.g[y][x] == '.' and sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) == '.') >= minfree]
    rng.shuffle(cands)
    m.slots.extend(cands[:n])


def fill_all(m, ch='B'):
    for y in range(1, m.H - 1):
        for x in range(1, m.W - 1):
            m.put(x, y, ch)


def near_wall(m):
    return lambda x, y: any(m.at(x + dx, y + dy) in WALLS for dx, dy in D4)


def interior(m):
    return lambda x, y: all(m.at(x + dx, y + dy) not in WALLS for dx, dy in D8)


def hedge(m, x, y, n, vertical, gaps=(), ch='M'):
    """linha de muro de n tiles com brechas: gaps = lista de (deslocamento, largura)"""
    gp = set()
    for off, w in gaps:
        for k in range(w):
            gp.add(off + k)
    for i in range(n):
        if i in gp:
            continue
        if vertical:
            m.put(x, y + i, ch)
        else:
            m.put(x + i, y, ch)


def gaps_of(rng, n, count, width, margin=2):
    """`count` brechas de `width` tiles espalhadas numa linha de n tiles (deslocamentos)"""
    out = []
    seg = max(1, (n - 2 * margin) // count)
    for k in range(count):
        lo = margin + k * seg
        hi = max(lo, margin + (k + 1) * seg - width)
        out.append((rng.randint(lo, hi), width))
    return out


def stroke(m, rng, a, b, ch='M', wobble=0.3, only_free=True):
    """risca um traço torto fino (1 tile) de a até b só sobre chão livre"""
    x, y = a
    steps = 0
    while (x, y) != tuple(b) and steps < 600:
        steps += 1
        if m.free(x, y) and (x, y) not in m.keep:
            m.g[y][x] = ch
        dx, dy = b[0] - x, b[1] - y
        if rng.random() < wobble:
            if rng.random() < 0.5:
                x += rng.choice((-1, 1))
            else:
                y += rng.choice((-1, 1))
        elif abs(dx) >= abs(dy) and dx != 0:
            x += 1 if dx > 0 else -1
        elif dy != 0:
            y += 1 if dy > 0 else -1
        x = max(1, min(m.W - 2, x))
        y = max(1, min(m.H - 2, y))


def strokes(m, rng, n, lmin, lmax, ch='M', wobble=0.3, region=None, clear=2, tries=60):
    """n traços finos de comprimento lmin..lmax em lugares afastados (clear) de outras paredes e peças"""
    x0, y0, x1, y1 = region or (2, 2, m.W - 3, m.H - 3)
    for _ in range(n):
        for _t in range(tries):
            a = (rng.randint(x0, x1), rng.randint(y0, y1))
            L = rng.randint(lmin, lmax)
            ang = rng.random() * 6.283
            b = (max(x0, min(x1, int(a[0] + L * math.cos(ang)))), max(y0, min(y1, int(a[1] + L * math.sin(ang)))))
            if not m.free(*a):
                continue
            if any(m.at(a[0] + dx, a[1] + dy) in BAD for dx in range(-clear, clear + 1) for dy in range(-clear, clear + 1)):
                continue
            stroke(m, rng, a, b, ch, wobble)
            break


def maze_cells(m, rng, x0, y0, x1, y1, cw, wt, ch='M', braid=0.3, gates=3):
    """labirinto de células de cw tiles de largura com paredes de wt tiles (em ch) dentro da região (x0, y0, x1, y1), com 'trança' (laços) e portões na parede de fora"""
    wid, hei = x1 - x0 + 1, y1 - y0 + 1
    nx, ny = (wid - wt) // (cw + wt), (hei - wt) // (cw + wt)
    if nx < 2 or ny < 2:
        raise Invalid('região pequena para o labirinto')
    ox = x0 + (wid - (nx * cw + (nx + 1) * wt)) // 2
    oy = y0 + (hei - (ny * cw + (ny + 1) * wt)) // 2
    bw, bh = nx * cw + (nx + 1) * wt, ny * cw + (ny + 1) * wt
    m.rect(ox, oy, bw, bh, ch)
    cell = lambda i, j: (ox + wt + i * (cw + wt), oy + wt + j * (cw + wt))

    def carve_cell(i, j):
        cx, cy = cell(i, j)
        m.rect(cx, cy, cw, cw, '.')

    def carve_between(i, j, k, l):
        cx, cy = cell(i, j)
        if k > i:
            m.rect(cx + cw, cy, wt, cw, '.')
        elif k < i:
            m.rect(cx - wt, cy, wt, cw, '.')
        elif l > j:
            m.rect(cx, cy + cw, cw, wt, '.')
        else:
            m.rect(cx, cy - wt, cw, wt, '.')
    seen = {(0, 0)}
    carve_cell(0, 0)
    stack = [(0, 0)]
    open_edges = set()
    while stack:
        i, j = stack[-1]
        nb = [(i + a, j + b) for a, b in D4 if 0 <= i + a < nx and 0 <= j + b < ny and (i + a, j + b) not in seen]
        if not nb:
            stack.pop()
            continue
        k, l = rng.choice(nb)
        seen.add((k, l))
        carve_cell(k, l)
        carve_between(i, j, k, l)
        open_edges.add((min((i, j), (k, l)), max((i, j), (k, l))))
        stack.append((k, l))
    for j in range(ny):
        for i in range(nx):
            for (k, l) in ((i + 1, j), (i, j + 1)):
                if k < nx and l < ny and ((i, j), (k, l)) not in open_edges and rng.random() < braid:
                    carve_between(i, j, k, l)
                    open_edges.add(((i, j), (k, l)))
    # portões na parede de fora
    for _ in range(gates):
        side = rng.choice('NSWE')
        if side in 'NS':
            i = rng.randrange(nx)
            cx, cy = cell(i, 0 if side == 'N' else ny - 1)
            m.rect(cx, (oy if side == 'N' else oy + bh - wt), cw, wt, '.')
        else:
            j = rng.randrange(ny)
            cx, cy = cell(0 if side == 'W' else nx - 1, j)
            m.rect((ox if side == 'W' else ox + bw - wt), cy, wt, cw, '.')
    return (ox, oy, bw, bh)


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


def disc(m, cx, cy, rx, ry, ch='B', force=False, wob=None):
    cells = []
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if wob:
                d *= 1 + wob(math.atan2(y - cy, x - cx))
            if d <= 1.0 and m.inside(x, y) and (force or m.g[y][x] == '.'):
                m.put(x, y, ch, force)
                cells.append((x, y))
    return cells


def wobble_fn(rng, amp=0.2):
    p1, p2, p3 = rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)
    return lambda a: amp * (0.6 * math.sin(3 * a + p1) + 0.3 * math.sin(5 * a + p2) + 0.2 * math.sin(2 * a + p3))


def frames(m, rng, n, wr, hr, region, gate=2, ch='M', clear=2, tries=300, gates=1):
    """n cercados (molduras de muro fino com `gates` portão/portões) em lugares livres; devolve os retângulos"""
    x0, y0, x1, y1 = region
    out = []
    for _ in range(n):
        for _t in range(tries):
            w, h = rng.randint(*wr), rng.randint(*hr)
            if x1 - w + 1 < x0 or y1 - h + 1 < y0:
                continue
            x, y = rng.randint(x0, x1 - w + 1), rng.randint(y0, y1 - h + 1)
            if not fits(m, x, y, w, h, 'free', clear):
                continue
            m.box(x, y, w, h, ch)
            for _g in range(gates):
                side = rng.choice('NSWE')
                if side in 'NS':
                    door(m, x + rng.randint(1, max(1, w - 1 - gate)), y if side == 'N' else y + h - 1, 'h', gate)
                else:
                    door(m, x if side == 'W' else x + w - 1, y + rng.randint(1, max(1, h - 1 - gate)), 'v', gate)
            out.append((x, y, w, h))
            break
    return out


# --------------------------------------------------------------------------------------------
# Fase 1: Jardim florido (sebes baixas compridas com brechas largas, fonte, canteiros de pedra)
# --------------------------------------------------------------------------------------------
@style(1)
def style1(m, rng, sp):
    W, H = m.W, m.H
    ya, yb = rng.randint(5, 6), rng.randint(11, 12)
    hedge(m, 1, ya, W - 2, False, [(rng.randint(2, 5), 4), (rng.randint(13, 16), 4)])
    hedge(m, 1, yb, W - 2, False, [(rng.randint(5, 9), 4), (rng.randint(17, 19), 3)])
    # a fonte (cruz de pedra) na faixa do meio e canteiros de pedra nos cantos
    fx, fy = rng.randint(9, 14), (ya + yb) // 2
    m.rect(fx, fy - 1, 3, 3, 'B', force=False)
    for (cx, cy) in ((2, 2), (W - 9, 2), (2, H - 4), (W - 10, H - 4)):
        if rng.random() < 0.8:
            m.rect(cx + rng.randint(0, 2), cy + rng.randint(-1, 1), rng.choice((2, 3)), 2, 'B')
    for _ in range(3):                                    # pontas de sebe saindo das linhas
        x = rng.randint(4, W - 10)
        y0 = rng.choice((ya, yb))
        for k in range(1, rng.randint(3, 4)):
            if m.free(x, y0 + k) and m.free(x, y0 - k):
                m.put(x, y0 + (k if rng.random() < 0.5 else -k), 'M')
    room_slots(m, [(2, 2, 7, ya - 1), (10, 2, W - 3, ya - 1), (3, ya + 1, W - 4, yb - 1), (2, yb + 1, 10, H - 3), (13, yb + 1, W - 3, H - 3)])
    return {'wind_len': (3, 4), 'mmin': 4}


# --------------------------------------------------------------------------------------------
# Fase 2: Pomar de macieiras (árvores em quincôncio e cercas compridas)
# --------------------------------------------------------------------------------------------
@style(2)
def style2(m, rng, sp):
    W, H = m.W, m.H
    xf = [rng.randint(9, 11), rng.randint(17, 19)]
    for k, x in enumerate(xf):
        hedge(m, x, 1, H - 2, True, gaps_of(rng, H - 2, 3, 3, 2))
    for r, y in enumerate(range(3, H - 2, 4)):
        for x in range(3 + (2 if r % 2 else 0), W - 6, 4):
            if m.free(x, y) and rng.random() > 0.1 and all(m.at(x + dx, y) != 'M' for dx in (-1, 0, 1)):
                m.put(x, y, 'B')
    strokes(m, rng, 3, 4, 7, 'M', 0.0, (2, 2, W - 8, H - 3), 1)
    sample_slots(m, rng, 8)
    return {'wind_len': (3, 4), 'mmin': 8}


# --------------------------------------------------------------------------------------------
# Fase 3: Horta e cerca (canteiros compridos, cerca baixa X, galpão, um galho e ventos)
# --------------------------------------------------------------------------------------------
@style(3)
def style3(m, rng, sp):
    W, H = m.W, m.H
    sx, sy = rng.randint(2, 6), rng.randint(2, 3)
    m.rect(sx, sy, 3, 3, 'B')                                   # galpão de ferramentas
    for y in range(3 + rng.randint(0, 1), H - 2, 3):
        x = 3 + rng.randint(0, 2)
        while x < W - 9:
            L = rng.randint(4, 7)
            if all(m.free(x + i, y) for i in range(L)) and not any(m.at(x + i, y + dy) == 'B' for i in range(L) for dy in (-1, 1)):
                m.hline(x, y, L, 'M')
            x += L + rng.randint(2, 3)
    fx = W - 9 + rng.randint(-1, 1)                             # cerca baixa X com 3 passagens
    for y in range(1, H - 1):
        if (y % 5) not in (1, 2, 3):
            if m.free(fx, y):
                m.put(fx, y, 'X')
    scatter(m, rng, 'X', 3, [(2, 1), (3, 1)], (2, 2, W - 12, H - 3), 'free', 1, tries=200, must=False)
    sample_slots(m, rng, 8)
    return {'wind_len': (3, 4), 'g_where': lambda x, y: x >= 3 and all(m.at(x + dx, y + dy) not in WALLS for dx, dy in D4), 'mmin': 8}


# --------------------------------------------------------------------------------------------
# Telhados com ruas por partição (Fase 4: terraços de muro baixo com chaminés)
# --------------------------------------------------------------------------------------------
def terrace(m, rng, x, y, w, h, doors=2, chimney=True, ridge=0.35):
    m.box(x, y, w, h, 'M')
    sides = list('NSWE')
    rng.shuffle(sides)
    done = 0
    for s_ in sides:
        if done >= doors:
            break
        if s_ in 'NS' and w >= 6:
            door(m, x + rng.randint(1, w - 3), y if s_ == 'N' else y + h - 1, 'h', 2)
            done += 1
        elif s_ in 'WE' and h >= 6:
            door(m, x if s_ == 'W' else x + w - 1, y + rng.randint(1, h - 3), 'v', 2)
            done += 1
    if chimney and w >= 7 and h >= 6:
        cx, cy = x + rng.randint(2, w - 4), y + rng.randint(2, h - 4)
        m.rect(cx, cy, rng.choice((1, 2)), rng.choice((1, 2)), 'B')
    if w >= 10 and h >= 6 and rng.random() < ridge:                # cumeeira: um muro fino dentro do terraço
        ry = y + h // 2
        m.hline(x + 2, ry, w - 4 - rng.randint(0, 3), 'M')


@style(4)
def style4(m, rng, sp):
    W, H = m.W, m.H
    leaves = []
    bsp(m, rng, 2, 2, W - 3, H - 3, 7, 6, 14, 10, lambda: 2 if rng.random() < 0.7 else 3, leaves)
    roofs = []
    for (x, y, w, h) in leaves:
        r = rng.random()
        if w < 6 or h < 5 or r < 0.05:
            continue                                            # largo
        if r < 0.15:
            m.rect(x, y, w, h, 'B')                             # prédio alto
            continue
        terrace(m, rng, x, y, w, h, 2 + (rng.random() < 0.4))
        roofs.append((x, y, w, h))
        m.slots.append((x + w // 2, y + h // 2))
    inroof = lambda x, y: any(rx < x < rx + rw - 1 and ry < y < ry + rh - 1 for (rx, ry, rw, rh) in roofs)
    scatter(m, rng, 'X', 12, [(1, 1), (2, 1), (2, 2)], None, 'free', 1, tries=300, must=False, where=inroof)      # caixas d'água e dutos
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 10)
    return {'wind_len': (3, 5), 'g_where': lambda x, y: inroof(x, y) and interior(m)(x, y)}


# --------------------------------------------------------------------------------------------
# Fase 5: Praça da vila (praça no meio com fonte, casas B com quintais de muro, alamedas)
# --------------------------------------------------------------------------------------------
@style(5)
def style5(m, rng, sp):
    W, H = m.W, m.H
    cx, cy = W // 2 + rng.randint(-4, 4), H // 2 + rng.randint(-2, 2)
    plaza = (cx - 6, cy - 4, cx + 6, cy + 4)
    inplaza = lambda x, y: plaza[0] <= x <= plaza[2] and plaza[1] <= y <= plaza[3]
    leaves = []
    bsp(m, rng, 2, 2, W - 3, H - 3, 5, 5, 9, 8, lambda: rng.choice((2, 2, 3)), leaves)
    for (x, y, w, h) in leaves:
        if (x <= plaza[2] + 1 and x + w - 1 >= plaza[0] - 1 and y <= plaza[3] + 1 and y + h - 1 >= plaza[1] - 1) or rng.random() < 0.05:
            continue
        m.box(x, y, w, h, 'M')                                   # o quarteirão murado, com portões para a rua
        for _g in range(1 + (w >= 8)):
            side = rng.choice('NSWE')
            if side in 'NS':
                door(m, x + rng.randint(1, max(1, w - 3)), y if side == 'N' else y + h - 1, 'h', 2)
            else:
                door(m, x if side == 'W' else x + w - 1, y + rng.randint(1, max(1, h - 3)), 'v', 2)
        hw, hh = max(2, w - 4 - rng.randint(0, 2)), 3 if h >= 7 else 2
        hx, hy = x + 2 + rng.randint(0, max(0, w - 4 - hw)), y + 1 + rng.randint(0, max(0, h - 3 - hh))
        m.rect(hx, hy, hw, hh, 'B')                              # a casa, no meio do quintal
        m.slots.append((x + w // 2, y + h - 2))
    # a praça: fonte, bancos (muro baixo) e canteiros
    m.rect(plaza[0] - 1, plaza[1] - 1, 15, 11, '.', force=True)
    m.rect(cx - 1, cy - 1, 3, 3, 'B', force=True)
    for (a, b) in ((cx - 5, cy - 3), (cx + 3, cy - 3), (cx - 5, cy + 3), (cx + 3, cy + 3)):
        m.hline(a, b, 3, 'M')
    m.slots.append((cx - 4, cy))
    m.slots.append((cx + 4, cy))
    connect_pockets(m, rng, 2)
    scatter(m, rng, 'X', 6, [(1, 1), (2, 1)], None, 'wall', 1, tries=200, must=False)
    sample_slots(m, rng, 12)
    return {'wind_len': (3, 5), 'g_where': lambda x, y: inplaza(x, y) and all(m.at(x + dx, y + dy) not in WALLS for dx, dy in D4), 'mshare': 0.4, 'msave': 1.0}


# --------------------------------------------------------------------------------------------
# Fase 6: Parque e coreto (alamedas, gramados com sebes, canteiros em moldura e o coreto no meio)
# --------------------------------------------------------------------------------------------
@style(6)
def style6(m, rng, sp):
    W, H = m.W, m.H
    xs = [rng.randint(11, 13), rng.randint(23, 25), rng.randint(35, 37)]
    ys = [rng.randint(10, 12), rng.randint(21, 23)]
    for x in xs:
        hedge(m, x, 1, H - 2, True, gaps_of(rng, H - 2, 3, 3, 2))
    for y in ys:
        hedge(m, 1, y, W - 2, False, gaps_of(rng, W - 2, 4, 3, 2))
    cx, cy = (xs[1] + xs[2]) // 2 if rng.random() < 0.5 else (xs[0] + xs[1]) // 2, (ys[0] + ys[1]) // 2
    m.rect(cx - 6, cy - 4, 13, 9, '.', force=True)                # clareira do coreto
    m.rect(cx - 2, cy - 2, 5, 5, 'B', force=True)                 # o coreto
    m.box(cx - 4, cy - 3, 9, 7, 'M')
    for k in range(4):
        side = 'NSWE'[k]
        if side in 'NS':
            door(m, cx - 1, cy - 3 if side == 'N' else cy + 3, 'h', 3)
        else:
            door(m, cx - 4 if side == 'W' else cx + 4, cy - 1, 'v', 3)
    frames(m, rng, 6, (4, 6), (3, 4), (2, 2, W - 3, H - 3), 2, 'M', 1)
    scatter(m, rng, 'B', 4, [(2, 2), (3, 2)], None, 'free', 1, tries=300, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 12)
    return {'wind_len': (3, 5), 'g_where': interior(m)}


# --------------------------------------------------------------------------------------------
# Fase 7: Milharal (corredores estreitos de milho: quase tudo é M)
# --------------------------------------------------------------------------------------------
@style(7)
def style7(m, rng, sp):
    W, H = m.W, m.H
    box = maze_cells(m, rng, 1, 1, W - 2, H - 2, 2, 1, 'M', 0.32, 4)
    cx, cy = W // 2 + rng.randint(-6, 6), H // 2 + rng.randint(-4, 4)
    m.rect(cx - 5, cy - 3, 11, 7, '.', force=True)                 # a clareira com o sítio e o espantalho
    m.rect(cx - 3, cy - 2, 4, 2, 'B')
    m.slots.append((cx + 3, cy + 2))
    scatter(m, rng, 'X', 3, [(1, 1)], (cx - 4, cy - 2, cx + 4, cy + 2), 'free', 1, tries=100, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 14, 4)
    return {'wind_len': (3, 5), 'g_where': lambda x, y: sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) in WALLS) <= 1, 'mshare': 0.85}


# --------------------------------------------------------------------------------------------
# Fase 8: Campo de trigo e espantalhos (campo aberto, faixas de trigo alto, sebes, sítio e espantalhos X)
# --------------------------------------------------------------------------------------------
@style(8)
def style8(m, rng, sp):
    W, H = m.W, m.H
    fx, fy = rng.randint(3, 8), rng.choice((3, H - 13))
    m.rect(fx + 2, fy + 2, 7, 4, 'B')                               # celeiro
    m.rect(fx + 11, fy + 3, 3, 3, 'B')                              # silo
    m.box(fx, fy, 16, 9, 'M')
    door(m, fx, fy + 3, 'v', 3)
    door(m, fx + 6, fy + 8, 'h', 3)
    door(m, fx + 15, fy + 2, 'v', 2)
    for _ in range(4):
        L = rng.randint(14, 22)
        if rng.random() < 0.5:
            x, y = rng.randint(18, W - 26), rng.randint(3, H - 4)
            if all(m.free(x + i, y) for i in range(L)):
                hedge(m, x, y, L, False, gaps_of(rng, L, 2, 3, 2))
        else:
            x, y = rng.randint(20, W - 8), rng.randint(2, H - 3 - L)
            if y + L < H - 2 and all(m.free(x, y + i) for i in range(L)):
                hedge(m, x, y, L, True, gaps_of(rng, L, 2, 3, 2))
    scatter(m, rng, 'M', 18, [(1, 6), (1, 9), (1, 12)], (17, 2, W - 8, H - 3), 'free', 2, tries=250, must=False)
    scatter(m, rng, 'X', 12, [(1, 1)], (3, 2, W - 8, H - 3), 'free', 2, tries=250, must=False)
    sample_slots(m, rng, 12, 4)
    return {'wind_len': (5, 8), 'g_where': interior(m), 'mshare': 0.45}


# --------------------------------------------------------------------------------------------
# Fase 9: Lago e juncos (lago B no meio, trilha em volta, juncais M, galhos nos juncos)
# --------------------------------------------------------------------------------------------
def lake_cells(m, rng, cx, cy, rx, ry, amp=0.2):
    w = wobble_fn(rng, amp)
    cells = set()
    for y in range(1, m.H - 1):
        for x in range(1, m.W - 1):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            d *= 1 + w(math.atan2((y - cy) / ry, (x - cx) / rx))
            if d < 1:
                cells.add((x, y))
    return cells


@style(9)
def style9(m, rng, sp):
    W, H = m.W, m.H
    cx, cy = int(W * 0.46) + rng.randint(-3, 3), H // 2 + rng.randint(-2, 2)
    lk = lake_cells(m, rng, cx, cy, rng.randint(9, 11), rng.randint(6, 7), 0.25)
    pond = lake_cells(m, rng, rng.choice((9, W - 14)), rng.choice((6, H - 7)), 4.5, 3.5, 0.2)
    lk |= {t for t in pond if not any(abs(t[0] - a) + abs(t[1] - b) < 4 for a, b in lk) and t not in m.lock}
    for (x, y) in lk:
        m.put(x, y, 'B')
    near = lambda x, y, r=3: any((x + dx, y + dy) in lk for dx in range(-r, r + 1) for dy in range(-r, r + 1) if abs(dx) + abs(dy) <= r)
    # moitas, juncais finos e bosques pequenos
    scatter(m, rng, 'B', 7, [(2, 2), (3, 2), (3, 3), (2, 3)], None, 'free', 2, tries=300, must=False, where=lambda x, y: not near(x, y, 2))
    scatter(m, rng, 'M', 26, [(1, 3), (1, 4), (1, 5), (2, 1), (3, 1), (4, 1)], None, 'free', 1, tries=500, must=False, where=lambda x, y: near(x, y, 4), bad='#BM')
    strokes(m, rng, 12, 8, 14, 'M', 0.25, (2, 2, W - 3, H - 3), 2)
    scatter(m, rng, 'X', 8, [(1, 1), (2, 1)], None, 'any', 1, tries=300, must=False, where=lambda x, y: near(x, y, 3))
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 16, 4)
    return {'wind_len': (4, 7), 'g_where': lambda x, y: near(x, y, 3) and not near(x, y, 1), 'wind_where': lambda x, y: near(x, y, 5), 'mshare': 0.3}


# --------------------------------------------------------------------------------------------
# Fase 10: Mata de pinheiros (troncos B soltos e sub-bosque M em traços tortos)
# --------------------------------------------------------------------------------------------
@style(10)
def style10(m, rng, sp):
    W, H = m.W, m.H
    trunks = []
    for _ in range(4000):
        if len(trunks) >= 95:
            break
        x, y = rng.randint(2, W - 3), rng.randint(2, H - 3)
        s_ = 2 if rng.random() < 0.22 else 1
        if all(max(abs(x - a), abs(y - b)) >= 4 for a, b in trunks) and m.free_rect(x, y, s_, s_):
            trunks.append((x, y))
            m.rect(x, y, s_, s_, 'B')
    strokes(m, rng, 30, 6, 14, 'M', 0.32, (2, 2, W - 3, H - 3), 1)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 14, 4)
    return {'wind_len': (3, 5), 'g_where': interior(m), 'mshare': 0.35}


# --------------------------------------------------------------------------------------------
# Fase 11: Fazenda e galinheiro (celeiro, cercados com portão, galinheiro, fardos X, lavoura em fileiras)
# --------------------------------------------------------------------------------------------
@style(11)
def style11(m, rng, sp):
    W, H = m.W, m.H
    bx, by = rng.randint(3, 8), rng.randint(3, 5)
    m.rect(bx, by, 12, 6, 'B')                                       # celeiro
    m.rect(bx + 14, by + 1, 3, 3, 'B')                               # silo
    m.box(bx - 1, by - 1, 22, 11, 'M')
    door(m, bx - 1, by + 3, 'v', 3)
    door(m, bx + 6, by + 9, 'h', 3)
    door(m, bx + 20, by + 4, 'v', 3)
    px = rng.randint(30, 34)
    paddocks = frames(m, rng, 3, (11, 14), (8, 10), (px, 2, W - 8, H - 3), 3, 'M', 1, gates=1)
    cx0, cy0 = rng.randint(4, 10), H - 12
    m.box(cx0, cy0, 11, 8, 'M')                                      # o galinheiro
    door(m, cx0 + 5, cy0, 'h', 2)
    door(m, cx0 + 10, cy0 + 4, 'v', 2)
    m.rect(cx0 + 2, cy0 + 4, 4, 3, 'B')
    for i in range(7):                                               # lavoura em fileiras (milho e feijão: muros finos)
        L = rng.randint(8, 13)
        x = cx0 + 14 + 3 * i
        y = rng.randint(H - 3 - L, H - 4)
        if x < px - 3 and all(m.free(x, y + k) for k in range(L)):
            hedge(m, x, y, L, True)
    scatter(m, rng, 'X', 8, [(2, 1), (2, 2), (1, 1)], (2, 2, W - 8, H - 3), 'wall', 1, tries=300, must=False)
    scatter(m, rng, 'B', 2, [(3, 2), (2, 2)], (px - 8, 2, W - 8, H - 3), 'free', 2, tries=200, must=False)
    connect_pockets(m, rng, 2)
    for (x, y, w, h) in paddocks:
        m.slots.append((x + w // 2, y + h // 2))
    sample_slots(m, rng, 12)
    return {'wind_len': (3, 6), 'g_where': interior(m)}


# --------------------------------------------------------------------------------------------
# Fase 12: Margem do rio (rio B que serpenteia, pontes, juncos M paralelos, pastos de cerca, pedras X)
# --------------------------------------------------------------------------------------------
@style(12)
def style12(m, rng, sp):
    W, H = m.W, m.H
    cx = int(W * 0.55) + rng.randint(-3, 3)
    ph = rng.uniform(0, 6)
    cols = {}
    for y in range(1, H - 1):
        c = cx + int(round(6 * math.sin(y / 5.5 + ph) + 2 * math.sin(y / 2.4 + ph * 2)))
        cols[y] = c
        for i in range(4):
            m.put(c + i, y, 'B', force=False)
    bridges = sorted(rng.sample(range(5, H - 8, 4), 3))
    for y in bridges:                                               # pontes de 3 tiles
        for yy in (y, y + 1, y + 2):
            for i in range(-1, 5):
                m.put(cols[yy] + i, yy, '.', force=True)
    for k in rng.sample(range(len(bridges)), 1):                    # pedras X: travessia só do passarinho
        y = bridges[k] + 6
        if y < H - 3:
            for i in range(4):
                m.put(cols[y] + i, y, 'X', force=True)
    inriver = lambda x, y: cols[y] - 1 <= x <= cols[y] + 4
    frames(m, rng, 4, (9, 13), (7, 9), (2, 2, W - 8, H - 3), 3, 'M', 1, tries=200)
    scatter(m, rng, 'M', 12, [(1, 4), (1, 5), (1, 6)], None, 'free', 1, tries=400, must=False, where=lambda x, y: abs(x - cols[y]) <= 6 and not inriver(x, y))
    scatter(m, rng, 'B', 6, [(2, 2), (3, 2), (2, 3)], None, 'free', 2, tries=300, must=False)
    scatter(m, rng, 'X', 10, [(1, 1), (2, 1)], None, 'any', 1, tries=300, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 14, 4)
    prefer = lambda x, y: ('^' if y % 2 else 'v') if abs(x - cols.get(y, cx)) <= 7 else None
    return {'wind_len': (3, 6), 'g_where': lambda x, y: abs(x - cols[y]) <= 8 and not inriver(x, y), 'wind_prefer': prefer}


# --------------------------------------------------------------------------------------------
# Fase 13: Pântano e vitórias-régias (poças B grandes, caminhos estreitos, juncos M, vitórias-régias G)
# --------------------------------------------------------------------------------------------
@style(13)
def style13(m, rng, sp):
    W, H = m.W, m.H
    ponds = []
    for _ in range(600):
        if len(ponds) >= 22:
            break
        c = (rng.randint(5, W - 8), rng.randint(4, H - 6), rng.uniform(2.0, 4.2), rng.uniform(1.8, 3.2))
        if all(abs(c[0] - o[0]) > (c[2] + o[2]) * 0.95 or abs(c[1] - o[1]) > (c[3] + o[3]) * 0.95 for o in ponds):
            ponds.append(c)
    wf = wobble_fn(rng, 0.3)
    water = set()
    for (x, y, rx, ry) in ponds:
        water |= set(disc(m, x, y, rx, ry, 'B', False, wf))
    near = lambda x, y, r=2: any((x + dx, y + dy) in water for dx in range(-r, r + 1) for dy in range(-r, r + 1))
    strokes(m, rng, 26, 9, 18, 'M', 0.4, (2, 2, W - 3, H - 3), 1)                       # canaviais compridos e tortos
    scatter(m, rng, 'M', 16, [(1, 3), (1, 4), (2, 1), (3, 1), (1, 5), (4, 1)], None, 'free', 1, tries=500, must=False, where=lambda x, y: near(x, y, 4), bad='#BM')
    scatter(m, rng, 'X', 8, [(1, 1), (2, 1)], None, 'any', 1, tries=300, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 14, 4)
    return {'wind_len': (3, 4), 'g_where': lambda x, y: near(x, y, 2) and not near(x, y, 0) and sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) == 'B') >= 1,
            'g_sizes': (1, 2), 'mshare': 0.3}


# --------------------------------------------------------------------------------------------
# Fase 14: Dunas e restinga (mar no alto, cristas de duna M, moitas de restinga X, pedras B)
# --------------------------------------------------------------------------------------------
@style(14)
def style14(m, rng, sp):
    W, H = m.W, m.H
    ph = rng.uniform(0, 6)
    shore = {}
    for x in range(1, W - 1):
        shore[x] = 3 + int(round(1.5 * math.sin(x / 4.5 + ph) + math.sin(x / 1.9 + 2 * ph)))
        for y in range(1, shore[x] + 1):
            m.put(x, y, 'B')
    strokes(m, rng, 22, 12, 26, 'M', 0.45, (2, 7, W - 3, H - 3), 3)
    scatter(m, rng, 'X', 16, [(1, 1), (2, 1), (2, 2), (3, 2)], (2, 7, W - 3, H - 3), 'any', 1, tries=400, must=False)
    scatter(m, rng, 'B', 4, [(2, 2), (3, 2), (3, 3)], (2, 8, W - 8, H - 3), 'free', 2, tries=300, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 18, 4)
    return {'wind_len': (4, 8), 'g_where': lambda x, y: y > 6, 'wind_where': lambda x, y: y > 5, 'mshare': 0.4}


# --------------------------------------------------------------------------------------------
# Fase 15: Falésias e ninhos (massas de rocha B, cânions, saliências M, ninhos G nas bordas, correntes de ar)
# --------------------------------------------------------------------------------------------
@style(15)
def style15(m, rng, sp):
    W, H = m.W, m.H
    noise_blobs(m, rng, (1, 1, W - 2, H - 2), 0.52, 4, 'B')
    pts = [(2, rng.randint(4, H - 6))] + [(rng.randint(8, W - 9), rng.randint(3, H - 5)) for _ in range(5)] + [(W - 8, m.exit[1] + 1)]
    pts.sort()
    for a, b in zip(pts, pts[1:]):
        carve_walk(m, rng, a, b, 3, 0.3)
    for _ in range(4):
        a, b = rng.sample(pts, 2)
        carve_walk(m, rng, a, b, 2, 0.4)
    clears = [(rng.randint(8, W - 9), rng.randint(5, H - 7)) for _ in range(6)]
    for (cx, cy) in clears:
        disc(m, cx, cy, 4, 3, '.', True)
        m.slots.append((cx, cy))
    connect_pockets(m, rng, 2)
    strokes(m, rng, 30, 7, 14, 'M', 0.3, (2, 2, W - 3, H - 3), 1)
    scatter(m, rng, 'X', 8, [(1, 1), (2, 1), (2, 2)], None, 'any', 1, tries=300, must=False)
    sample_slots(m, rng, 10, 4)
    return {'wind_len': (3, 6), 'g_where': lambda x, y: sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) in WALLS) >= 1, 'wind_prefer': lambda x, y: '^' if rng.random() < 0.7 else None, 'mshare': 0.25}


# --------------------------------------------------------------------------------------------
# Fase 16: Vila de pescadores e redes (baía no mar, molhes, casas B, redes X secando, varais M, mastros G)
# --------------------------------------------------------------------------------------------
@style(16)
def style16(m, rng, sp):
    W, H = m.W, m.H
    ph = rng.uniform(0, 6)
    bay = rng.randint(W // 3, 2 * W // 3)
    shore = {}
    for x in range(1, W - 1):
        d = 5 + int(round(1.2 * math.sin(x / 4.0 + ph)))
        d += int(round(9 * max(0.0, 1 - abs(x - bay) / 11.0)))
        shore[x] = d
        for y in range(1, d + 1):
            m.put(x, y, 'B')
    for px in (bay - 6, bay + 5, bay):                                # molhes
        if 2 <= px < W - 4:
            m.rect(px, 1, 2, shore[px] + 2, '.', force=True)
    beach = lambda x, y: shore.get(x, 5) < y <= shore.get(x, 5) + 4
    village = lambda x, y: y > shore.get(x, 5) + 5
    # casinhas pequenas em fileiras, com vielas, varais compridos de rede (M) e redes secando (X)
    scatter(m, rng, 'B', 17, [(3, 3), (4, 3), (3, 4), (4, 4)], None, 'free', 2, tries=500, must=False, where=village)
    scatter(m, rng, 'M', 30, [(1, 7), (1, 9), (1, 11), (7, 1), (9, 1), (11, 1)], None, 'free', 1, tries=600, must=False, where=lambda x, y: y > shore.get(x, 5) + 2, bad='#BM')
    scatter(m, rng, 'B', 4, [(4, 2), (5, 2)], None, 'free', 1, tries=300, must=False, where=beach)                    # barcos
    scatter(m, rng, 'X', 9, [(5, 1), (6, 1), (4, 1), (1, 4)], None, 'free', 1, tries=400, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 16)
    return {'wind_len': (4, 7), 'g_where': lambda x, y: y <= shore.get(x, 5) + 7 and all(m.at(x + dx, y + dy) != 'X' for dx, dy in D4),
            'wind_where': beach, 'mshare': 0.3, 'msave': 1.2}


# --------------------------------------------------------------------------------------------
# Fase 17: Campos de altitude (campo aberto, muros de pedra M em cercados largos, afloramentos B)
# --------------------------------------------------------------------------------------------
@style(17)
def style17(m, rng, sp):
    W, H = m.W, m.H
    fr = frames(m, rng, 6, (16, 26), (10, 15), (2, 2, W - 8, H - 3), 3, 'M', 1, tries=400, gates=3)
    for _ in range(6):
        cx, cy = rng.randint(6, W - 10), rng.randint(5, H - 7)
        cells = grow_blob(m, rng, (cx, cy), rng.randint(8, 16), lambda a, b: m.free(a, b), True) if m.free(cx, cy) else None
        if cells:
            for (a, b) in cells:
                m.g[b][a] = 'B'
    scatter(m, rng, 'X', 16, [(1, 1), (2, 1)], None, 'any', 1, tries=300, must=False)
    strokes(m, rng, 8, 8, 16, 'M', 0.2, (2, 2, W - 8, H - 3), 2)
    connect_pockets(m, rng, 2)
    for (x, y, w, h) in fr:
        m.slots.append((x + w // 2, y + h // 2))
    sample_slots(m, rng, 18, 4)
    return {'wind_len': (6, 8), 'g_where': interior(m), 'mshare': 0.5}


# --------------------------------------------------------------------------------------------
# Fase 18: Entardecer nos telhados (galpões compridos com cumeeira M, antenas G, chaminés B, vielas)
# --------------------------------------------------------------------------------------------
@style(18)
def style18(m, rng, sp):
    W, H = m.W, m.H
    y = 2
    roofs = []
    while y + 6 <= H - 2:
        h = rng.randint(5, 7)
        if y + h > H - 2:
            break
        x = 2 + rng.randint(0, 3)
        while x + 9 <= W - 3:
            w = rng.randint(10, 20)
            w = min(w, W - 3 - x)
            if w >= 8 and rng.random() > 0.08:
                m.box(x, y, w, h, 'M')
                door(m, x + rng.randint(1, w - 3), y, 'h', 2)
                door(m, x + rng.randint(1, w - 3), y + h - 1, 'h', 2)
                if w >= 12 and rng.random() < 0.6:
                    door(m, x + w - 1, y + 1 + rng.randint(0, h - 4), 'v', 2)
                ry = y + h // 2
                m.hline(x + 2 + rng.randint(0, 1), ry, w - 5 - rng.randint(0, 2), 'M')           # cumeeira
                m.rect(x + rng.randint(2, w - 3), y + 1, 1, 2, 'B')                              # chaminé
                roofs.append((x, y, w, h))
            x += w + rng.choice((2, 2, 3))
        y += h + rng.choice((2, 2, 3))
    connect_pockets(m, rng, 2)
    for (x, y, w, h) in roofs:
        m.slots.append((x + w // 2, y + 1))
    inroof = lambda x, y_: any(rx < x < rx + rw - 1 and ry < y_ < ry + rh - 1 for (rx, ry, rw, rh) in roofs)
    sample_slots(m, rng, 10)
    return {'wind_len': (3, 5), 'g_where': lambda x, y_: inroof(x, y_) and all(m.at(x + dx, y_ + dy) not in WALLS for dx, dy in D4)}


# --------------------------------------------------------------------------------------------
# Fase 19: Noite na floresta (clareiras e moitas redondas de árvores B com sub-bosque M em arco)
# --------------------------------------------------------------------------------------------
@style(19)
def style19(m, rng, sp):
    W, H = m.W, m.H
    clumps = []
    for _ in range(6000):
        if len(clumps) >= 40:
            break
        r = rng.uniform(1.4, 3.2)
        c = (rng.randint(3, W - 4), rng.randint(3, H - 4), r)
        if all(math.hypot(c[0] - o[0], c[1] - o[1]) > c[2] + o[2] + 2.2 for o in clumps):
            clumps.append(c)
    wf = wobble_fn(rng, 0.15)
    for (x, y, r) in clumps:
        disc(m, x, y, r, r * rng.uniform(0.8, 1.2), 'B', False, wf)
    for (x, y, r) in rng.sample(clumps, 22):                         # sub-bosque em arco
        a0 = rng.uniform(0, 6.28)
        for k in range(int(8 * r)):
            a = a0 + k * 0.15
            xx, yy = int(round(x + (r + 1.6) * math.cos(a))), int(round(y + (r + 1.6) * math.sin(a)))
            if m.free(xx, yy) and abs(math.cos(a - a0)) < 0.95:
                m.g[yy][xx] = 'M'
    strokes(m, rng, 18, 8, 16, 'M', 0.3, (2, 2, W - 3, H - 3), 1)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 16, 4)
    return {'wind_len': (3, 6), 'g_where': lambda x, y: any(m.at(x + dx, y + dy) == 'B' for dx, dy in D4), 'mshare': 0.35}


# --------------------------------------------------------------------------------------------
# Fase 20: O grande ninho (três faixas: horta-labirinto de sebes, vila, bosque com o grande ninho junto da saída)
# --------------------------------------------------------------------------------------------
@style(20)
def style20(m, rng, sp):
    W, H = m.W, m.H
    xa, xb = 21 + rng.randint(-1, 1), 42 + rng.randint(-1, 1)
    maze_cells(m, rng, 1, 1, xa - 3, H - 2, 2, 1, 'M', 0.28, 3)
    leaves = []
    bsp(m, rng, xa + 3, 2, xb - 3, H - 3, 5, 5, 11, 9, lambda: rng.choice((2, 3)), leaves)
    for (x, y, w, h) in leaves:
        if rng.random() < 0.05:
            continue
        hh = max(3, h - 3 - rng.randint(0, 1))
        m.rect(x + 1, y, w - 2, hh, 'B')
        hedge(m, x, y + h - 1, w, False, [(rng.randint(1, max(1, w - 4)), 2)])
        m.put(x, y + hh, 'M')
        m.put(x + w - 1, y + hh, 'M')
        m.slots.append((x + w // 2, y + h // 2))
    for xx in (xa, xb):                                               # cercas entre as faixas, com portões
        hedge(m, xx, 1, H - 2, True, gaps_of(rng, H - 2, 5, 3, 2))
    ey = m.exit[1] + 1
    nest = (W - 14, ey)
    m.rect(nest[0] - 3, nest[1] - 3, 7, 7, 'B')                      # a grande árvore do ninho
    m.rect(nest[0] - 2, nest[1] - 4, 5, 9, 'B')
    clumps = []
    for _ in range(3000):
        if len(clumps) >= 16:
            break
        r = rng.uniform(1.5, 3)
        c = (rng.randint(xb + 3, W - 8), rng.randint(3, H - 4), r)
        if math.hypot(c[0] - nest[0], c[1] - nest[1]) > c[2] + 6 and all(math.hypot(c[0] - o[0], c[1] - o[1]) > c[2] + o[2] + 2.5 for o in clumps):
            clumps.append(c)
    for (x, y, r) in clumps:
        disc(m, x, y, r, r, 'B', False)
    strokes(m, rng, 6, 6, 10, 'M', 0.3, (xb + 2, 2, W - 8, H - 3), 1)
    scatter(m, rng, 'X', 10, [(1, 1), (2, 1)], (xa + 2, 2, W - 8, H - 3), 'any', 1, tries=300, must=False)
    connect_pockets(m, rng, 2)
    sample_slots(m, rng, 16, 4)
    return {'wind_len': (3, 6), 'g_where': interior(m)}
