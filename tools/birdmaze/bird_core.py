#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Núcleo do gerador dos mapas do Passarinho: a grade, as ferramentas de desenho dos estilos, o acabamento (início, saída, postos, galhos, ventos,
classificação das paredes em # e M) e a VALIDAÇÃO. (usado por gen_bird.py e bird_styles.py; derivado de tools/catmaze/cat_core.py)

Legenda do mapa FINAL: # parede sólida sempre | M muro fino voável (o voo alto passa) | . chão | P início | V posto de gato de quintal | H posto de gavião
  E saída (3 tiles na borda) | X obstáculo baixo (o passarinho passa, os gatos não) | G galho (o passarinho fica a salvo; gatos e gaviões não entram) | > < ^ v ventos.
Legenda INTERMEDIÁRIA (só dentro dos estilos): B = bloco duro (vira #), # = parede "automática" (vira M se for fina, # se for grossa), M = muro explícito (vira # se ficar grosso).
Grafos: gatos = . P V H E e ventos | gavião = o dos gatos + X | passarinho em voo baixo = o dos gatos + X + G | voo alto = voo baixo + M (nunca #).
"""
import heapq, math, random
from collections import Counter, deque

D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
D8 = D4 + ((1, 1), (1, -1), (-1, 1), (-1, -1))
WINDC = '><^v'
VEC = {'>': (1, 0), '<': (-1, 0), '^': (0, -1), 'v': (0, 1)}
CHAR_OF = {v: k for k, v in VEC.items()}
CATW = set('.PVHE' + WINDC)        # por onde os gatos de quintal e os gaviões andam (chão)
HAWKW = CATW | {'X'}              # o gavião também passa por cima de X
LOWW = CATW | set('XG')           # o passarinho em voo baixo (X e G ele pisa; M e # não)
HIGHW = LOWW | {'M'}              # voo alto: por cima dos muros finos M
LEGEND = set('#M.PVHEXG' + WINDC)
WALLS = set('#BM')                # as paredes durante o desenho
BAD = '#BMXG' + WINDC             # o que impede uma peça nova (peças, galhos e ventos não se encostam nem se sobrepõem)


class Invalid(Exception):
    pass


# --------------------------------------------------------------------------------------------
# A grade
# --------------------------------------------------------------------------------------------
class Grid:
    def __init__(s, W, H):
        s.W, s.H = W, H
        s.g = [['.'] * W for _ in range(H)]
        for x in range(W):
            s.g[0][x] = s.g[H - 1][x] = '#'
        for y in range(H):
            s.g[y][0] = s.g[y][W - 1] = '#'
        s.lock = set()       # tiles que o estilo não pode mudar (a saída e a folga em volta)
        s.keep = set()       # tiles onde não se põe peça (frente de portas)
        s.slots = []         # lugares bons para um posto (centros de cômodos, praças...)
        s.exit = None        # (x, y0) da saída (no sentido padrão: coluna W-2, linhas y0..y0+2)

    def inside(s, x, y):
        return 0 < x < s.W - 1 and 0 < y < s.H - 1

    def at(s, x, y):
        return s.g[y][x] if 0 <= x < s.W and 0 <= y < s.H else '#'

    def put(s, x, y, ch, force=False):
        if s.inside(x, y) and (force or (x, y) not in s.lock):
            s.g[y][x] = ch

    def rect(s, x, y, w, h, ch, force=False):
        for j in range(y, y + h):
            for i in range(x, x + w):
                s.put(i, j, ch, force)

    def box(s, x, y, w, h, ch):
        for i in range(x, x + w):
            s.put(i, y, ch)
            s.put(i, y + h - 1, ch)
        for j in range(y, y + h):
            s.put(x, j, ch)
            s.put(x + w - 1, j, ch)

    def hline(s, x, y, n, ch):
        for i in range(x, x + n):
            s.put(i, y, ch)

    def vline(s, x, y, n, ch):
        for j in range(y, y + n):
            s.put(x, j, ch)

    def free(s, x, y):
        return s.inside(x, y) and s.g[y][x] == '.' and (x, y) not in s.lock

    def free_rect(s, x, y, w, h):
        return all(s.free(i, j) for j in range(y, y + h) for i in range(x, x + w))

    def count(s, ch):
        return sum(r.count(ch) for r in s.g)

    def rows(s):
        return [''.join(r) for r in s.g]


def tiles_of(m, chars):
    return [(x, y) for y in range(m.H) for x in range(m.W) if m.g[y][x] in chars]


def bfs(m, starts, walk):
    W, H = m.W, m.H
    dist = [-1] * (W * H)
    q = deque()
    for (x, y) in starts:
        dist[y * W + x] = 0
        q.append((x, y))
    while q:
        x, y = q.popleft()
        d = dist[y * W + x]
        for dx, dy in D4:
            nx, ny = x + dx, y + dy
            if 0 <= nx < W and 0 <= ny < H and dist[ny * W + nx] < 0 and m.g[ny][nx] in walk:
                dist[ny * W + nx] = d + 1
                q.append((nx, ny))
    return dist


def components(m, walk):
    W, H = m.W, m.H
    seen = [False] * (W * H)
    out = []
    for y in range(H):
        for x in range(W):
            if seen[y * W + x] or m.g[y][x] not in walk:
                continue
            comp, q = [], deque([(x, y)])
            seen[y * W + x] = True
            while q:
                a, b = q.popleft()
                comp.append((a, b))
                for dx, dy in D4:
                    nx, ny = a + dx, b + dy
                    if 0 <= nx < W and 0 <= ny < H and not seen[ny * W + nx] and m.g[ny][nx] in walk:
                        seen[ny * W + nx] = True
                        q.append((nx, ny))
            out.append(comp)
    return out


def cat_connected(m):
    t = tiles_of(m, CATW)
    if not t:
        return False
    d = bfs(m, [t[0]], CATW)
    return all(d[y * m.W + x] >= 0 for x, y in t)


def groups_of(m, ch, diag=False):
    """componentes (4 ou 8 vizinhos) dos tiles `ch`"""
    W, H = m.W, m.H
    seen = set()
    out = []
    dirs = D8 if diag else D4
    for y in range(H):
        for x in range(W):
            if m.g[y][x] != ch or (x, y) in seen:
                continue
            comp, q = [], deque([(x, y)])
            seen.add((x, y))
            while q:
                a, b = q.popleft()
                comp.append((a, b))
                for dx, dy in dirs:
                    n = (a + dx, b + dy)
                    if n not in seen and 0 <= n[0] < W and 0 <= n[1] < H and m.g[n[1]][n[0]] == ch:
                        seen.add(n)
                        q.append(n)
            out.append(comp)
    return out


# --------------------------------------------------------------------------------------------
# Ferramentas de desenho para os estilos
# --------------------------------------------------------------------------------------------
def grow_blob(m, rng, start, size, ok, compact=True):
    cells = [start]
    cs = {start}
    while len(cells) < size:
        fr = {}
        for (x, y) in cells:
            for dx, dy in D4:
                n = (x + dx, y + dy)
                if n in cs or n in fr or not ok(*n):
                    continue
                fr[n] = sum(1 for ddx, ddy in D4 if (n[0] + ddx, n[1] + ddy) in cs)
        if not fr:
            return None
        keys = list(fr)
        if compact:
            w = [fr[k] ** 2 for k in keys]
            n = rng.choices(keys, weights=w)[0]
        else:
            n = rng.choice(keys)
        cells.append(n)
        cs.add(n)
    return cells


def place_groups(m, rng, ch, n, smin, smax, where=None, tries=800, compact=True, keep_cat=True, sizes=None):
    """Põe exatamente n grupos de `ch` (cada um com smin a smax tiles, 4-ligados), longe uns dos outros (nem na diagonal) e sem desligar o chão dos gatos."""
    placed = []
    if keep_cat and not cat_connected(m):
        connect_pockets(m, rng, 2)
    for gi in range(n):
        ok_group = False
        for _ in range(tries):
            x, y = rng.randint(1, m.W - 2), rng.randint(1, m.H - 2)
            if not m.free(x, y) or (x, y) in m.keep or (where and not where(x, y)):
                continue
            size = rng.choice(sizes) if sizes else rng.randint(smin, smax)

            def ok(a, b):
                if not m.free(a, b) or (a, b) in m.keep or (where and not where(a, b)):
                    return False
                for dx, dy in D8:
                    if m.at(a + dx, b + dy) == ch:
                        return False
                return True
            if not ok(x, y):
                continue
            cells = grow_blob(m, rng, (x, y), size, ok, compact)
            if not cells:
                continue
            for (a, b) in cells:
                m.g[b][a] = ch
            if keep_cat and not cat_connected(m):
                for (a, b) in cells:
                    m.g[b][a] = '.'
                continue
            placed.append(cells)
            ok_group = True
            break
        if not ok_group:
            raise Invalid('não coube o grupo %d de %s' % (gi + 1, ch))
    return placed


def _ring(x, y, w, h, r):
    """tiles a distância de Chebyshev exatamente r do retângulo"""
    out = []
    for j in range(y - r, y + h + r):
        for i in range(x - r, x + w + r):
            if x <= i < x + w and y <= j < y + h:
                continue
            d = max(x - i, i - (x + w - 1), y - j, j - (y + h - 1))
            if d == r:
                out.append((i, j))
    return out


def fits(m, x, y, w, h, mode='free', clear=1, where=None, bad=BAD):
    """Cabe uma peça w x h em (x, y)? mode: 'any' (só livre), 'free' (afastada de paredes e peças por `clear` tiles),
    'wall' (encostada numa parede por um lado inteiro e afastada nos outros três)."""
    for j in range(y, y + h):
        for i in range(x, x + w):
            if not m.free(i, j) or (i, j) in m.keep or (where and not where(i, j)):
                return False
    if mode == 'any':
        return True
    if mode == 'free':
        for r in range(1, clear + 1):
            for (i, j) in _ring(x, y, w, h, r):
                if m.at(i, j) in bad:
                    return False
        return True
    sides = {
        'N': all(m.at(i, y - 1) in WALLS for i in range(x, x + w)),
        'S': all(m.at(i, y + h) in WALLS for i in range(x, x + w)),
        'W': all(m.at(x - 1, j) in WALLS for j in range(y, y + h)),
        'E': all(m.at(x + w, j) in WALLS for j in range(y, y + h)),
    }
    for s_, flag in sides.items():
        if not flag:
            continue
        good = True
        for r in range(1, clear + 1):
            for (i, j) in _ring(x, y, w, h, r):
                if (s_ == 'N' and j < y) or (s_ == 'S' and j >= y + h) or (s_ == 'W' and i < x) or (s_ == 'E' and i >= x + w):
                    continue
                if m.at(i, j) in bad:
                    good = False
                    break
            if not good:
                break
        if good:
            return True
    return False


def scatter(m, rng, ch, n, shapes, region=None, mode='free', clear=1, where=None, tries=500, must=True, keep_cat=True, bad=BAD):
    """Põe n peças `ch` (formas w x h; as duas orientações) na região (x0, y0, x1, y1 inclusivo)."""
    x0, y0, x1, y1 = region or (1, 1, m.W - 2, m.H - 2)
    placed = []
    if keep_cat and not cat_connected(m):
        connect_pockets(m, rng, 2)
    for k in range(n):
        done = False
        for _ in range(tries):
            w, h = rng.choice(shapes)
            if rng.random() < 0.5:
                w, h = h, w
            if x1 - w + 1 < x0 or y1 - h + 1 < y0:
                continue
            x, y = rng.randint(x0, x1 - w + 1), rng.randint(y0, y1 - h + 1)
            if not fits(m, x, y, w, h, mode, clear, where, bad):
                continue
            if ch in 'G' and any(m.at(i, j) == ch for (i, j) in _ring(x, y, w, h, 1) + [(x - 1, y - 1), (x + w, y - 1), (x - 1, y + h), (x + w, y + h)]):
                continue
            m.rect(x, y, w, h, ch)
            if keep_cat and ch in 'XGB#M' and not cat_connected(m):
                m.rect(x, y, w, h, '.', force=True)
                continue
            placed.append((x, y, w, h))
            done = True
            break
        if not done and must:
            raise Invalid('não coube a peça %d de %s' % (k + 1, ch))
    return placed


def noise_blobs(m, rng, region, density, iters=3, ch='B', where=None):
    """Manchas orgânicas (autômato celular) dentro da região, respeitando as travas."""
    x0, y0, x1, y1 = region
    cells = {(x, y): rng.random() < density for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)}
    for _ in range(iters):
        new = {}
        for (x, y), v in cells.items():
            n = sum(1 for dx, dy in D8 if cells.get((x + dx, y + dy), False))
            new[(x, y)] = (n >= 4) if v else (n >= 5)
        cells = new
    for (x, y), v in cells.items():
        if v and m.g[y][x] == '.' and (not where or where(x, y)):
            m.put(x, y, ch)


def carve_walk(m, rng, a, b, width=2, wobble=0.25, ch='.', limit=4000):
    """Abre (ou desenha, com ch) um caminho torto de a até b (passeio aleatório guiado) com a largura dada."""
    x, y = a
    steps = 0
    while (x, y) != tuple(b) and steps < limit:
        steps += 1
        for i in range(width):
            for j in range(width):
                m.put(x + i, y + j, ch)
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
        x = max(1, min(m.W - 1 - width, x))
        y = max(1, min(m.H - 1 - width, y))


def connect_pockets(m, rng, width=2):
    """Liga todo o chão dos gatos a um só pedaço, abrindo (no caminho mais barato) passagens de `width` tiles em paredes e peças."""
    for _ in range(120):
        comps = components(m, CATW)
        if len(comps) <= 1:
            return
        comps.sort(key=len)
        small = comps[0]
        smallset = set(small)
        main = set()
        for c in comps[1:]:
            main.update(c)
        INF = 10 ** 9
        dist = {}
        pq = []
        prev = {}
        for t in small:
            dist[t] = 0
            heapq.heappush(pq, (0, t))
        goal = None
        while pq:
            d, t = heapq.heappop(pq)
            if d > dist.get(t, INF):
                continue
            if t in main:
                goal = t
                break
            for dx, dy in D4:
                n = (t[0] + dx, t[1] + dy)
                if not m.inside(*n):
                    continue
                ch = m.g[n[1]][n[0]]
                cost = 1 if ch in CATW else (2 if ch in 'XG' else 3)
                nd = d + cost
                if nd < dist.get(n, INF):
                    dist[n] = nd
                    prev[n] = t
                    heapq.heappush(pq, (nd, n))
        if goal is None:
            raise Invalid('não deu para ligar um bolsão')
        t = goal
        path = [t]
        while t in prev and t not in smallset:
            t = prev[t]
            path.append(t)
        for i, (x, y) in enumerate(path):
            if m.g[y][x] in WALLS or m.g[y][x] in 'XG':
                m.put(x, y, '.')
            if width >= 2:
                nx, ny = path[i - 1] if i > 0 else path[i + 1] if len(path) > 1 else (x, y)
                horiz = (ny == y)
                ex, ey = (x, y + 1) if horiz else (x + 1, y)
                if m.inside(ex, ey) and (m.g[ey][ex] in WALLS or m.g[ey][ex] in 'XG') and (ex, ey) not in m.lock:
                    m.g[ey][ex] = '.'
    raise Invalid('ligações demais')


def door(m, x, y, orient, width=2, ch='.'):
    """abre uma porta numa parede: orient 'v' = parede vertical (porta ocupa linhas y..y+width-1 em x), 'h' = horizontal"""
    for i in range(width):
        if orient == 'v':
            m.put(x, y + i, ch)
        else:
            m.put(x + i, y, ch)


# --------------------------------------------------------------------------------------------
# Ventos (grupos de 2 a 8 tiles, em linha reta, numa direção) e galhos
# --------------------------------------------------------------------------------------------
def place_wind(m, rng, n, lmin, lmax, where=None, tries=3000, prefer=None):
    """Põe exatamente n grupos de vento: cada um é uma linha reta de lmin a lmax tiles '.', todos com a mesma seta; o tile logo depois da última seta é
    chão '.', então nenhuma seta empurra direto contra parede. Os grupos não se encostam (nem na diagonal) e não encostam em galhos nem em X.
    `prefer(x, y)` -> direção preferida ('>', '<', '^', 'v') ou None."""
    placed = []
    if not cat_connected(m):
        connect_pockets(m, rng, 2)
    for gi in range(n):
        ok_group = False
        for _ in range(tries):
            x, y = rng.randint(1, m.W - 2), rng.randint(1, m.H - 2)
            d = prefer(x, y) if prefer else None
            if d is None:
                d = rng.choice(WINDC)
            dx, dy = VEC[d]
            L = rng.randint(lmin, lmax)
            run = [(x + i * dx, y + i * dy) for i in range(L)]
            after = (x + L * dx, y + L * dy)
            if not all(m.free(a, b) and (a, b) not in m.keep and (not where or where(a, b)) for a, b in run):
                continue
            if not m.free(*after) and not (m.inside(*after) and m.g[after[1]][after[0]] == '.'):
                continue
            runset = set(run)
            bad = False
            for (a, b) in run:
                for ddx, ddy in D8:
                    t = (a + ddx, b + ddy)
                    if t not in runset and m.at(*t) in 'G' + WINDC + 'X':
                        bad = True
                        break
                if bad:
                    break
            if bad:
                continue
            for (a, b) in run:
                m.g[b][a] = d
            if not cat_connected(m):
                for (a, b) in run:
                    m.g[b][a] = '.'
                continue
            placed.append(run)
            ok_group = True
            break
        if not ok_group:
            raise Invalid('não coube o grupo %d de vento' % (gi + 1))
    return placed


def wind_toward(m, tx, ty, along=None):
    """função `prefer`: seta que aponta para (tx, ty) (ou a perpendicular a ela se along='cross')"""
    def f(x, y):
        dx, dy = tx - x, ty - y
        if abs(dx) >= abs(dy):
            return '>' if dx > 0 else '<'
        return 'v' if dy > 0 else '^'
    return f


# --------------------------------------------------------------------------------------------
# Classificação das paredes: B -> #, e # / M -> M quando fino, # quando grosso (janela 3x3 cheia de parede, sem contar o anel de fora)
# --------------------------------------------------------------------------------------------
def classify_walls(m):
    W, H = m.W, m.H
    inner = lambda x, y: 0 < x < W - 1 and 0 < y < H - 1 and m.g[y][x] in WALLS
    thick = set()
    for y in range(1, H - 3):
        for x in range(1, W - 3):
            if all(inner(x + i, y + j) for j in range(3) for i in range(3)):
                for j in range(3):
                    for i in range(3):
                        thick.add((x + i, y + j))
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            c = m.g[y][x]
            if c == 'B':
                m.g[y][x] = '#'
            elif c in '#M':
                m.g[y][x] = '#' if (x, y) in thick else 'M'


# --------------------------------------------------------------------------------------------
# Validação (as regras de validade do briefing)
# --------------------------------------------------------------------------------------------
def max_disjoint(m, srcs, sinks, walk, cap=3):
    """caminhos que não dividem nenhum tile do meio entre a origem e os destinos (fluxo máximo com tiles de capacidade 1)"""
    W, H = m.W, m.H
    N = W * H
    SRC, SNK = 2 * N, 2 * N + 1
    to, capa, adj = [], [], [[] for _ in range(2 * N + 2)]

    def edge(u, v, c):
        adj[u].append(len(to)); to.append(v); capa.append(c)
        adj[v].append(len(to)); to.append(u); capa.append(0)
    srcset, snkset = set(srcs), set(sinks)
    for y in range(H):
        for x in range(W):
            if m.g[y][x] not in walk:
                continue
            i = y * W + x
            edge(2 * i, 2 * i + 1, cap if (x, y) in srcset or (x, y) in snkset else 1)
            for dx, dy in D4:
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and m.g[ny][nx] in walk:
                    edge(2 * i + 1, 2 * (ny * W + nx), 1)
    for (x, y) in srcs:
        edge(SRC, 2 * (y * W + x), cap)
    for (x, y) in sinks:
        edge(2 * (y * W + x) + 1, SNK, 1)
    flow = 0
    while flow < cap:
        prev = {SRC: -1}
        q = deque([SRC])
        while q and SNK not in prev:
            u = q.popleft()
            for e in adj[u]:
                if capa[e] > 0 and to[e] not in prev:
                    prev[to[e]] = e
                    q.append(to[e])
        if SNK not in prev:
            break
        v = SNK
        while v != SRC:
            e = prev[v]
            capa[e] -= 1
            capa[e ^ 1] += 1
            v = to[e ^ 1]
        flow += 1
    return flow


def exit_info(m):
    """(tiles E, lado, tiles da frente) ou None"""
    es = tiles_of(m, 'E')
    W, H = m.W, m.H
    if len(es) != 3:
        return None
    xs = sorted({x for x, _ in es})
    ys = sorted({y for _, y in es})
    if len(xs) == 1 and ys[-1] - ys[0] == 2 and len(ys) == 3:
        x = xs[0]
        if x == W - 2:
            side, d = 'R', (-1, 0)
        elif x == 1:
            side, d = 'L', (1, 0)
        else:
            return None
    elif len(ys) == 1 and xs[-1] - xs[0] == 2 and len(xs) == 3:
        y = ys[0]
        if y == H - 2:
            side, d = 'B', (0, -1)
        elif y == 1:
            side, d = 'T', (0, 1)
        else:
            return None
    else:
        return None
    front = [(x + d[0] * k, y + d[1] * k) for (x, y) in es for k in (1, 2)]
    return es, side, front


def sample_sources(m, k=48):
    """as origens da amostra determinística da economia dos atalhos: um tile de chão a cada N, na ordem das linhas (a mesma regra do teste em JavaScript)"""
    fl = tiles_of(m, CATW)
    step = max(1, math.ceil(len(fl) / k))
    return fl[::step]


def shortcut_saving(m):
    """(economia média, fração de pares com economia >= 4, economia P->E) do voo alto sobre o voo baixo, nas origens da amostra, contando todos os destinos de chão"""
    W = m.W
    fl = tiles_of(m, CATW)
    tot, cnt, big = 0, 0, 0
    for s in sample_sources(m):
        dl = bfs(m, [s], LOWW)
        dh = bfs(m, [s], HIGHW)
        for (x, y) in fl:
            a, b = dl[y * W + x], dh[y * W + x]
            if a < 0 or b < 0:
                continue
            tot += a - b
            cnt += 1
            if a - b >= 4:
                big += 1
    P = tiles_of(m, 'P')[0]
    es = tiles_of(m, 'E')
    dl, dh = bfs(m, [P], LOWW), bfs(m, [P], HIGHW)
    pe_l = min(dl[y * W + x] for x, y in es)
    pe_h = min(dh[y * W + x] for x, y in es)
    return (tot / cnt if cnt else 0.0), (big / cnt if cnt else 0.0), pe_l - pe_h


def crossings(m):
    """muros finos que o voo alto atravessa em linha reta (1 ou 2 tiles de M entre dois tiles de chão/X/G): devolve (total, úteis) onde 'útil' = o voo baixo
    precisa de pelo menos 4 passos a mais para ir de um lado ao outro; e os tiles M que fazem parte de uma travessia útil"""
    W = m.W
    seen = {}
    useful_tiles = set()
    total = 0
    for y in range(1, m.H - 1):
        for x in range(1, W - 1):
            if m.g[y][x] != 'M':
                continue
            for dx, dy in ((1, 0), (0, 1)):
                # começa no primeiro M da linha
                if m.at(x - dx, y - dy) == 'M':
                    continue
                k = 1
                while m.at(x + k * dx, y + k * dy) == 'M' and k < 3:
                    k += 1
                if k > 2:
                    continue
                a = (x - dx, y - dy)
                b = (x + k * dx, y + k * dy)
                if m.at(*a) not in LOWW or m.at(*b) not in LOWW:
                    continue
                total += 1
                if a not in seen:
                    seen[a] = bfs_cut(m, a, 6)
                d = seen[a].get(b)
                if d is None or d >= k + 1 + 4:
                    for t in range(k):
                        useful_tiles.add((x + t * dx, y + t * dy))
    return total, useful_tiles


def bfs_cut(m, a, limit):
    """distâncias (voo baixo) a partir de a, só até `limit` passos (dicionário)"""
    dist = {a: 0}
    q = deque([a])
    while q:
        x, y = q.popleft()
        d = dist[(x, y)]
        if d >= limit:
            continue
        for dx, dy in D4:
            n = (x + dx, y + dy)
            if n not in dist and m.at(*n) in LOWW:
                dist[n] = d + 1
                q.append(n)
    return dist


def engine_candidates(m):
    """os tiles onde o motor pode sortear itens (mesma regra de placeItems em js/game.js): alcançáveis pelos gatos, a 4 ou mais passos do início, não E,
    não vento, a 4 ou mais tiles (distância reta) de qualquer posto"""
    P = tiles_of(m, 'P')[0]
    posts = tiles_of(m, 'VH')
    d = bfs(m, [P], CATW)
    W = m.W
    out = []
    for (x, y) in tiles_of(m, CATW):
        if m.g[y][x] in 'E' + WINDC:
            continue
        if d[y * W + x] < 4:
            continue
        if any(math.hypot(x - a, y - b) < 4 for a, b in posts):
            continue
        out.append((x, y))
    return out


def analyze(m):
    """números do mapa (para a validação, a escolha de sementes e o relatório)"""
    P = tiles_of(m, 'P')[0]
    posts = tiles_of(m, 'VH')
    es = tiles_of(m, 'E')
    W = m.W
    dc = bfs(m, [P], CATW)
    dl = bfs(m, [P], LOWW)
    dh = bfs(m, [P], HIGHW)
    out = {
        'pe_cat': min((dc[y * W + x] for x, y in es), default=-1),
        'pe_low': min((dl[y * W + x] for x, y in es), default=-1),
        'pe_high': min((dh[y * W + x] for x, y in es), default=-1),
        'post_cat': [dc[y * W + x] for x, y in posts],
        'disjoint': max_disjoint(m, [P], es, CATW),
    }
    return out


def validate(m, sp):
    errs = []
    W, H = m.W, m.H
    if (W, H) != (sp['W'], sp['H']):
        errs.append('tamanho %dx%d, esperado %dx%d' % (W, H, sp['W'], sp['H']))
        return errs
    rows = m.rows()
    for y in range(H):
        for x in range(W):
            ch = rows[y][x]
            if ch not in LEGEND:
                errs.append('caractere fora da legenda %r' % ch)
            if (x in (0, W - 1) or y in (0, H - 1)) and ch != '#':
                errs.append('anel de fora furado em %d,%d' % (x, y))
    cnt = Counter(c for r in rows for c in r)
    if cnt['P'] != 1:
        errs.append('P=%d' % cnt['P'])
    if cnt['V'] != sp['cats']:
        errs.append('V=%d, esperado %d' % (cnt['V'], sp['cats']))
    if cnt['H'] != sp['hawks']:
        errs.append('H=%d, esperado %d' % (cnt['H'], sp['hawks']))
    if errs:
        return errs[:6]
    ei = exit_info(m)
    if not ei:
        errs.append('saída E inválida')
        return errs
    es, side, front = ei
    for (x, y) in front:
        if m.g[y][x] != '.':
            errs.append('frente da saída não é chão em %d,%d (%s)' % (x, y, m.g[y][x]))
    P = tiles_of(m, 'P')[0]
    posts = tiles_of(m, 'VH')
    for (x, y) in posts:
        d = max(abs(x - P[0]), abs(y - P[1]))
        if d < 8:
            errs.append('posto %d,%d a %d do início (mínimo 8)' % (x, y, d))
        if math.hypot(x - P[0], y - P[1]) <= sp['alert']:
            errs.append('posto %d,%d dentro do alcance do "!" (%d) desde o início' % (x, y, sp['alert']))
        for (ex, ey) in es:
            if max(abs(x - ex), abs(y - ey)) < 5:
                errs.append('posto %d,%d colado na saída' % (x, y))
    # galhos e ventos: grupos
    g4, g8 = groups_of(m, 'G'), groups_of(m, 'G', True)
    if len(g4) != sp['G'] or len(g8) != sp['G']:
        errs.append('grupos de G: %d (4 viz.) / %d (8 viz.), esperado %d' % (len(g4), len(g8), sp['G']))
    for g in g4:
        if not 1 <= len(g) <= 3:
            errs.append('grupo de G com %d tiles (deve ter 1 a 3)' % len(g))
    wgroups = []
    for c in WINDC:
        wg4, wg8 = groups_of(m, c), groups_of(m, c, True)
        if len(wg4) != len(wg8):
            errs.append('grupos de vento %s se encostam na diagonal' % c)
        wgroups.extend(wg4)
    allw = {t for g in wgroups for t in g}
    if len(wgroups) != sp['wind']:
        errs.append('grupos de vento: %d, esperado %d' % (len(wgroups), sp['wind']))
    for g in wgroups:
        if not 2 <= len(g) <= 8:
            errs.append('grupo de vento com %d tiles (deve ter 2 a 8)' % len(g))
        xs, ys = {a for a, _ in g}, {b for _, b in g}
        if len(xs) > 1 and len(ys) > 1:
            errs.append('grupo de vento que não é uma linha reta')
        d = VEC[m.g[g[0][1]][g[0][0]]]
        for (x, y) in g:
            nx, ny = x + d[0], y + d[1]
            if m.at(nx, ny) not in '.' + WINDC or (m.at(nx, ny) in WINDC and (nx, ny) not in set(g)):
                errs.append('a seta em %d,%d aponta para %r (deve ser chão ou o próprio vento)' % (x, y, m.at(nx, ny)))
    # vento e G nunca na frente da saída nem perto de P
    for (x, y) in list(allw) + [t for g in g4 for t in g]:
        if any((x, y) == f for f in front) or any(max(abs(x - a), abs(y - b)) < 2 for a, b in es + [P] + posts):
            errs.append('vento/galho perto demais do início, da saída ou de um posto em %d,%d' % (x, y))
    # conexões
    cat_t = tiles_of(m, CATW)
    dc = bfs(m, [P], CATW)
    if any(dc[y * W + x] < 0 for x, y in cat_t):
        errs.append('há chão que os gatos não alcançam (bolsão)')
        return errs
    low_t = tiles_of(m, LOWW)
    dl = bfs(m, [P], LOWW)
    if any(dl[y * W + x] < 0 for x, y in low_t):
        errs.append('há tile que o passarinho não alcança no voo baixo')
        return errs
    if sum(1 for dx, dy in D4 if m.at(P[0] + dx, P[1] + dy) in CATW) < 2:
        errs.append('o início P tem menos de 2 saídas')
    disj = max_disjoint(m, [P], es, CATW)
    if sp['n'] >= 4 and disj < 2:
        errs.append('só %d caminho(s) de P a E sem tile em comum' % disj)
    # itens
    cand = engine_candidates(m)
    items = sp['seeds'] + sp['fruits'] + sp['worms']
    if items > 0.35 * len(cand):
        errs.append('itens demais (%d para %d tiles possíveis)' % (items, len(cand)))
    far = 0
    dots = [(x, y) for (x, y) in cat_t if m.g[y][x] == '.']
    for (x, y) in dots:
        if all(max(abs(x - a), abs(y - b)) >= 4 for a, b in posts):
            far += 1
    if dots and far < 0.2 * len(dots):
        errs.append('só %d%% dos tiles livres a 4 tiles ou mais de um posto' % (100 * far // max(1, len(dots))))
    # muros M
    nM = m.count('M')
    if nM < sp.get('mmin', 6):
        errs.append('poucos muros M (%d)' % nM)
    inner_hash = sum(1 for y in range(1, H - 1) for x in range(1, W - 1) if m.g[y][x] == '#')
    share = nM / (nM + inner_hash) if (nM + inner_hash) else 0
    if share < sp.get('mshare', 0.4):
        errs.append('só %d%% das paredes de dentro são M (mínimo %d%%)' % (100 * share, 100 * sp.get('mshare', 0.4)))
    # tem M fino demais? (nenhum M em bloco 3x3: garantido pela classificação)
    if sp['n'] >= 4:
        sv, frac, pe = shortcut_saving(m)
        tot, useful = crossings(m)
        if len(useful) < sp.get('ushort', 3):
            errs.append('poucos atalhos de verdade pelos muros (%d tiles M úteis)' % len(useful))
        if sv < sp.get('msave', 1.5):
            errs.append('economia média dos atalhos só %.2f tiles' % sv)
    return errs


def same_fraction(a, b, ring=False):
    """fração de tiles iguais na mesma posição, na janela comum (canto de cima à esquerda). Por padrão NÃO conta o anel de fora."""
    h = min(len(a), len(b))
    w = min(len(a[0]), len(b[0]))
    y0, x0, y1, x1 = (0, 0, h, w) if ring else (1, 1, h - 1, w - 1)
    eq = sum(1 for y in range(y0, y1) for x in range(x0, x1) if a[y][x] == b[y][x])
    return eq / ((y1 - y0) * (x1 - x0))


FEATURE = {'#': '#', 'M': '#', 'X': 'X', 'G': 'G', 'T': 'G'}   # (T é o lugar alto do Gatinho)


def feature_overlap(a, b):
    """Jaccard dos tiles de PAREDE e de peça (# e M contam igual; X; G e o T do Gatinho contam igual), sem o anel de fora, na janela comum (canto de cima à esquerda):
    |tiles com a mesma classe na mesma posição| / |tiles de qualquer um dos dois|. Mapas abertos (muito chão) têm sempre muito chão em comum; o que mostra se dois mapas são
    o mesmo desenho são as paredes e as peças."""
    h = min(len(a), len(b))
    w = min(len(a[0]), len(b[0]))
    inter = union = 0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            ca, cb = FEATURE.get(a[y][x]), FEATURE.get(b[y][x])
            if ca is None and cb is None:
                continue
            union += 1
            if ca == cb:
                inter += 1
    return inter / union if union else 0.0


# --------------------------------------------------------------------------------------------
# Acabamento e transformações
# --------------------------------------------------------------------------------------------
def pick_exit(m, rng, lo=0.2, hi=0.8):
    """a saída é no sentido padrão (coluna W-2); trava a folga: colunas W-6..W-2, linhas y0-1..y0+3"""
    y0 = int(m.H * lo) + rng.randint(0, max(0, int(m.H * (hi - lo)) - 3))
    y0 = max(3, min(m.H - 6, y0))
    m.exit = (m.W - 2, y0)
    for y in range(y0 - 1, y0 + 4):
        for x in range(m.W - 6, m.W - 1):
            m.g[y][x] = '.'
            m.lock.add((x, y))
    return m.exit


def stamp_exit(m):
    x, y0 = m.exit
    for y in range(y0, y0 + 3):
        m.g[y][x] = 'E'


def free_neighbors(m, x, y):
    return sum(1 for dx, dy in D4 if m.at(x + dx, y + dy) in CATW)


def place_posts(m, rng, sp, band=None):
    """P no começo (esquerda), depois os postos V e H longe de P, da saída e uns dos outros"""
    W, H = m.W, m.H
    stamp_exit(m)
    ex = m.exit
    comps = components(m, CATW)
    if len(comps) != 1:
        raise Invalid('chão em %d pedaços antes dos postos' % len(comps))

    def calm(x, y):  # lugar sossegado: livre, com vizinhos livres e sem X/G/vento colados
        if m.g[y][x] != '.' or (x, y) in m.lock:
            return False
        if free_neighbors(m, x, y) < 3:
            return False
        return all(m.at(x + dx, y + dy) not in 'XG' + WINDC for dx, dy in D8)
    zone = band or (1, 1, 6, H - 2)
    cands = [(x, y) for y in range(zone[1], zone[3] + 1) for x in range(zone[0], zone[2] + 1) if calm(x, y)]
    if not cands:
        raise Invalid('sem lugar para o início')
    P = rng.choice(cands)
    m.g[P[1]][P[0]] = 'P'
    need = sp['cats'] + sp['hawks']
    mind = max(8, sp['alert'] + 1)
    spacing = 6 if W >= 41 else 5
    pool = [(x, y) for y in range(1, H - 1) for x in range(1, W - 1)
            if calm(x, y) and math.hypot(x - P[0], y - P[1]) > mind and max(abs(x - P[0]), abs(y - P[1])) >= 8
            and max(abs(x - ex[0]), abs(y - ex[1] - 1)) >= 7]
    poolset = set(pool)
    slots = [s for s in m.slots if s in poolset]
    chosen = []

    def far_enough(t, sp_):
        return all(max(abs(t[0] - c[0]), abs(t[1] - c[1])) >= sp_ for c in chosen)
    for sp_ in (spacing, spacing - 1, spacing - 2, 3):
        chosen = []
        order_slots = slots[:]
        rng.shuffle(order_slots)
        slotset = set(slots)
        rest = [p for p in pool if p not in slotset]
        rng.shuffle(rest)
        for t in order_slots + rest:
            if len(chosen) >= need:
                break
            if far_enough(t, sp_):
                chosen.append(t)
        if len(chosen) >= need:
            break
    if len(chosen) < need:
        raise Invalid('não achei %d postos (só %d)' % (need, len(chosen)))
    rng.shuffle(chosen)
    for i, (x, y) in enumerate(chosen[:need]):
        m.g[y][x] = 'V' if i < sp['cats'] else 'H'
    return P


FLIP_X = {'>': '<', '<': '>'}
FLIP_Y = {'^': 'v', 'v': '^'}
TRANSP = {'>': 'v', 'v': '>', '<': '^', '^': '<'}


def transform(rows, eside):
    """sentido padrão (início à esquerda, saída à direita) -> o da fase (as setas de vento giram junto)"""
    if eside == 'R':
        return rows
    if eside == 'L':
        return [''.join(FLIP_X.get(c, c) for c in r[::-1]) for r in rows]
    t = [''.join(TRANSP.get(rows[y][x], rows[y][x]) for y in range(len(rows))) for x in range(len(rows[0]))]   # transposta: saída embaixo
    if eside == 'B':
        return t
    if eside == 'T':
        return [''.join(FLIP_Y.get(c, c) for c in r) for r in t[::-1]]
    raise ValueError(eside)


def to_grid(rows):
    m = Grid(len(rows[0]), len(rows))
    m.g = [list(r) for r in rows]
    return m
