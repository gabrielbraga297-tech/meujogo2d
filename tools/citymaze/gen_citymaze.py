#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador de LABIRINTOS COM DESIGN DE CIDADE (0.10.1): ruas largas entre prédios que formam um labirinto de quarteirões.

Método:
  1. QUADRA: cada eixo é dividido em células (cruzamentos/praças de 3 a 5 tiles) separadas por faixas de prédio (1 a 4 tiles).
     A célula do meio é a PRAÇA DA CARROCINHA (7 x 5), então a linha e a coluna do meio formam a "avenida central".
  2. LABIRINTO: sobre a grade de células faz-se um labirinto (árvore crescente) e depois se "trançam" os becos sem saída
     (`braid`): quanto maior o `braid`, menos becos e mais caminhos alternativos (fases fáceis); quanto menor, mais labirinto.
     O início e a saída ficam em células da borda, cada uma com 3 ruas (3 saídas), e o gerador só aceita mapas com pelo menos
     `routes` caminhos que não passam pela mesma célula.
  3. DESENHO: as células viram praças; cada passagem aberta vira uma rua de largura cheia (a altura/largura da célula); alguns
     trechos viram VIELAS de 1 tile (onde ficam as portas de bloco, com nicho lateral); o resto é prédio ('#').
  4. PEÇAS MÓVEIS: paredes (barra que cruza a rua deixando 1 tile livre que muda de lado) e portas (1 x 1 numa viela, com nicho),
     só em ruas que não desconectam o mapa; todas as 2^N combinações de posição são conferidas.
  5. SEMENTES: cada semente dá um mapa; fica o melhor pelo critério da fase (becos sem saída perto do alvo da fase).

Uso:
  python3 gen_citymaze.py --level 7 --seed 12 --print
  python3 gen_citymaze.py --level 7 --search 0 400 --out map7.json
  python3 gen_citymaze.py --all --search 0 400 --outdir .
"""
import argparse, json, random, sys, itertools, time
from collections import deque

DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))
MIN_PIECE_GAP = 3        # distância mínima (Chebyshev) entre os trilhos de duas peças
V_POS = {                # postos 'V' dentro do pátio 7 x 5 (deslocamento em relação ao centro)
    2: [(-2, 0), (2, 0)],
    3: [(-2, 0), (2, 0), (0, -1)],
    4: [(-2, -1), (2, -1), (-2, 1), (2, 1)],
    5: [(-2, -1), (2, -1), (-2, 1), (2, 1), (0, 0)],
    6: [(-2, -1), (0, -1), (2, -1), (-2, 1), (0, 1), (2, 1)],
    7: [(-2, -1), (0, -1), (2, -1), (-2, 1), (0, 1), (2, 1), (0, 0)],
    8: [(-2, -1), (0, -1), (2, -1), (-2, 0), (2, 0), (-2, 1), (0, 1), (2, 1)],
}

# W x H = tamanho; nx, ny = células por eixo; cell/wall = faixas de tamanho das células e dos prédios entre elas;
# center = (largura, altura) da praça do meio (None: sem praça: Fases 1 a 3); newest = chance de a árvore crescer pela célula mais nova
# (alta = corredores compridos, baixa = ramos curtos); braid = chance de abrir cada beco sem saída; routes = caminhos sem célula em comum
# exigidos entre o início e a saída; doors/walls = peças móveis; nv = agentes; dead = fração de células em beco sem saída que a fase procura.
CFG = {
    1:  dict(W=25, H=18, nx=5, ny=4, cell=(3, 3), wall=(1, 2), center=None, newest=0.5, braid=1.0, winding=0.2, routes=3, doors=0, walls=0, nv=1, dead=0.0),
    2:  dict(W=25, H=18, nx=5, ny=4, cell=(3, 3), wall=(1, 3), center=None, newest=0.4, braid=0.3, winding=0.2, routes=2, doors=0, walls=0, nv=2, dead=0.1),
    3:  dict(W=25, H=18, nx=5, ny=4, cell=(3, 3), wall=(1, 3), center=None, newest=0.3, braid=0.0, winding=0.2, routes=2, doors=2, walls=0, nv=2, dead=0.15),
    4:  dict(W=41, H=29, nx=7, ny=5, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.5, braid=0.7, winding=0.3, routes=3, doors=3, walls=0, nv=3, dead=0.03),
    5:  dict(W=43, H=29, nx=7, ny=5, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.45, braid=0.5, winding=0.4, routes=3, doors=3, walls=3, nv=3, dead=0.06),
    6:  dict(W=51, H=31, nx=9, ny=5, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.4, braid=0.3, winding=0.5, routes=3, doors=4, walls=4, nv=3, dead=0.09),
    7:  dict(W=51, H=39, nx=9, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.35, braid=0.15, winding=0.6, routes=3, doors=5, walls=4, nv=4, dead=0.14),
    8:  dict(W=53, H=39, nx=9, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.3, braid=0.05, winding=0.7, routes=3, doors=5, walls=5, nv=5, dead=0.19),
    9:  dict(W=61, H=39, nx=11, ny=7, cell=(3, 3), wall=(2, 3), center=(7, 5), newest=0.25, braid=0.0, winding=0.8, routes=3, doors=6, walls=6, nv=5, dead=0.24),
    10: dict(W=63, H=41, nx=11, ny=7, cell=(3, 3), wall=(2, 3), center=(7, 5), newest=0.2, braid=0.0, winding=0.9, routes=3, doors=6, walls=6, nv=6, dead=0.3),
    # Fases 11 a 20 (0.15.4): labirintos maiores e mais enrolados; `cats` = gatos (a partir da 0.15.5), `hops` = muretas de caixas "X" que só o gato pula
    11: dict(W=65, H=41, nx=11, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.25, braid=0.0, winding=0.9, routes=3, doors=6, walls=6, nv=5, dead=0.25, cats=2, hops=3),
    12: dict(W=67, H=41, nx=11, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.25, braid=0.0, winding=0.9, routes=3, doors=6, walls=6, nv=5, dead=0.25, cats=3, hops=4),
    13: dict(W=71, H=43, nx=13, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.22, braid=0.0, winding=1.0, routes=3, doors=6, walls=6, nv=6, dead=0.26, cats=3, hops=5),
    14: dict(W=73, H=43, nx=13, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.22, braid=0.0, winding=1.0, routes=3, doors=6, walls=6, nv=6, dead=0.26, cats=4, hops=6),
    15: dict(W=75, H=45, nx=13, ny=7, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.2, braid=0.0, winding=1.0, routes=3, doors=6, walls=6, nv=6, dead=0.27, cats=4, hops=7),
    16: dict(W=75, H=49, nx=13, ny=9, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.2, braid=0.0, winding=1.0, routes=3, doors=6, walls=6, nv=7, dead=0.27, cats=5, hops=8),
    17: dict(W=77, H=49, nx=13, ny=9, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.2, braid=0.0, winding=1.0, routes=3, doors=6, walls=6, nv=7, dead=0.28, cats=5, hops=9),
    18: dict(W=79, H=51, nx=13, ny=9, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.18, braid=0.0, winding=1.1, routes=3, doors=6, walls=6, nv=8, dead=0.28, cats=6, hops=10),
    19: dict(W=81, H=51, nx=13, ny=9, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.18, braid=0.0, winding=1.1, routes=3, doors=6, walls=6, nv=8, dead=0.29, cats=6, hops=11),
    20: dict(W=83, H=53, nx=13, ny=9, cell=(3, 4), wall=(2, 3), center=(7, 5), newest=0.15, braid=0.0, winding=1.2, routes=3, doors=6, walls=6, nv=8, dead=0.3, cats=7, hops=12),
}
MAX_RATIO = 1.7


# --------------------------------------------------------------------------------------------
# 1. Quadra: partição de um eixo
# --------------------------------------------------------------------------------------------
def compose(total, k, lo, hi, rnd):
    if k == 0:
        return [] if total == 0 else None
    if k * lo > total or k * hi < total:
        return None
    parts = [lo] * k
    rem = total - k * lo
    while rem > 0:
        cand = [i for i in range(k) if parts[i] < hi]
        parts[rnd.choice(cand)] += 1
        rem -= 1
    return parts


def split_cells_walls(total, nc, nw, clo, chi, wlo, whi, rnd, thick=False):
    """nc células e nw prédios que somam `total`."""
    lo = max(nc * clo, total - nw * whi)
    hi = min(nc * chi, total - nw * wlo)
    if lo > hi:
        return None
    sc = lo if thick else rnd.randint(lo, hi)      # thick: células pequenas e prédios grossos (cabem nichos de porta)
    cells = compose(sc, nc, clo, chi, rnd)
    walls = compose(total - sc, nw, wlo, whi, rnd)
    return (cells, walls) if cells is not None and walls is not None else None


def plan_axis(n_int, ncell, clo, chi, wlo, whi, center, rnd, thick=False):
    """Devolve [(início, tamanho)] das células e [(início, tamanho)] dos prédios (coordenadas a partir de 1) ou None."""
    if center is None:
        r = split_cells_walls(n_int, ncell, ncell - 1, clo, chi, wlo, whi, rnd, thick)
        if not r:
            return None
        cells, walls = r
    else:
        if ncell % 2 == 0 or (n_int - center) % 2:
            return None
        k = ncell // 2
        r = split_cells_walls((n_int - center) // 2, k, k, clo, chi, wlo, whi, rnd, thick)
        if not r:
            return None
        lc, lw = r
        rc, rw = lc[:], lw[:]
        rnd.shuffle(rc)
        rnd.shuffle(rw)
        cells = lc + [center] + rc
        walls = lw + rw           # k paredes à esquerda do centro e k à direita
    # ordem: c0 w0 c1 w1 ... c(n-1)
    cs, ws, pos = [], [], 1
    for i in range(ncell):
        cs.append((pos, cells[i]))
        pos += cells[i]
        if i < ncell - 1:
            ws.append((pos, walls[i]))
            pos += walls[i]
    assert pos == n_int + 1, (pos, n_int)
    return cs, ws


# --------------------------------------------------------------------------------------------
# 2. Labirinto sobre a grade de células
# --------------------------------------------------------------------------------------------
def nbrs(c, nx, ny):
    i, j = c
    for di, dj in DIRS:
        a, b = i + di, j + dj
        if 0 <= a < nx and 0 <= b < ny:
            yield (a, b)


def edge(a, b):
    return (a, b) if a < b else (b, a)


def maze(nx, ny, newest, rnd):
    start = (rnd.randrange(nx), rnd.randrange(ny))
    seen, edges, active = {start}, set(), [start]
    while active:
        idx = len(active) - 1 if rnd.random() < newest else rnd.randrange(len(active))
        c = active[idx]
        cand = [n for n in nbrs(c, nx, ny) if n not in seen]
        if not cand:
            active.pop(idx)
            continue
        n = rnd.choice(cand)
        edges.add(edge(c, n))
        seen.add(n)
        active.append(n)
    return edges



def skeleton(nx, ny, s, t, k, winding, rnd):
    """k caminhos entre as células s e t sem célula em comum (sorteados, com custos aleatórios para serem tortuosos). Devolve o conjunto de arestas ou None."""
    import heapq
    for _ in range(80):
        used, edges, ok = set(), set(), True
        for _i in range(k):
            cost = {c: 1 + rnd.random() * winding for c in ((i, j) for i in range(nx) for j in range(ny))}
            dist, prev, pq = {s: 0}, {s: None}, [(0, s)]
            while pq:
                d, u = heapq.heappop(pq)
                if d > dist.get(u, 1e9):
                    continue
                if u == t:
                    break
                for v in nbrs(u, nx, ny):
                    if (v in used and v != t) or (u == s and False):
                        continue
                    nd = d + cost[v]
                    if nd < dist.get(v, 1e9):
                        dist[v] = nd
                        prev[v] = u
                        heapq.heappush(pq, (nd, v))
            if t not in prev:
                ok = False
                break
            path, u = [], t
            while u is not None:
                path.append(u)
                u = prev[u]
            path.reverse()
            if len(path) == 2 and edge(*path) in edges:
                ok = False
                break
            for a, b in zip(path, path[1:]):
                edges.add(edge(a, b))
            used |= set(path[1:-1])
        if ok:
            return edges
    return None


def grow_branches(edges, nx, ny, newest, rnd):
    """Liga todas as células que ainda não estão no labirinto por ramos (árvore crescente a partir do esqueleto)."""
    seen = {c for e in edges for c in e}
    active = list(seen)
    while True:
        rest = [(i, j) for i in range(nx) for j in range(ny) if (i, j) not in seen]
        if not rest:
            break
        cand = [c for c in active if any(n not in seen for n in nbrs(c, nx, ny))]
        if not cand:
            break
        c = cand[-1] if rnd.random() < newest else rnd.choice(cand)
        n = rnd.choice([n for n in nbrs(c, nx, ny) if n not in seen])
        edges.add(edge(c, n))
        seen.add(n)
        active.append(n)
    return edges


def degree_map(edges, nx, ny):
    deg = {(i, j): 0 for i in range(nx) for j in range(ny)}
    for a, b in edges:
        deg[a] += 1
        deg[b] += 1
    return deg


def braid(edges, nx, ny, p, forced, rnd):
    """Abre os becos sem saída com chance p (de preferência ligando dois becos entre si)."""
    for _ in range(3):
        deg = degree_map(edges, nx, ny)
        dead = [c for c, d in deg.items() if d == 1]
        rnd.shuffle(dead)
        for c in dead:
            if deg[c] != 1 or rnd.random() >= p:
                continue
            cand = [n for n in nbrs(c, nx, ny) if edge(c, n) not in edges]
            if not cand:
                continue
            cand.sort(key=lambda n: (deg[n] != 1, rnd.random()))
            n = cand[0]
            edges.add(edge(c, n))
            deg[c] += 1
            deg[n] += 1
    return edges


def node_disjoint_routes(edges, nx, ny, s, t, limit=8):
    """Caminhos entre as células s e t sem célula em comum (fluxo máximo com capacidade 1 por célula)."""
    adj = {}
    for a, b in edges:
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    # grafo dividido: v_in -> v_out (cap 1; s e t com cap grande)
    cap = {}
    def add(u, v, c):
        cap[(u, v)] = cap.get((u, v), 0) + c
        cap.setdefault((v, u), 0)
    nodes = list(adj)
    for v in nodes:
        add((v, 0), (v, 1), 99 if v in (s, t) else 1)
    for a in nodes:
        for b in adj[a]:
            add((a, 1), (b, 0), 1)
    g = {}
    for (u, v) in cap:
        g.setdefault(u, []).append(v)
    src, dst, flow = (s, 0), (t, 1), 0
    while flow < limit:
        prev = {src: None}
        q = deque([src])
        while q and dst not in prev:
            u = q.popleft()
            for v in g.get(u, []):
                if v not in prev and cap[(u, v)] > 0:
                    prev[v] = u
                    q.append(v)
        if dst not in prev:
            break
        v = dst
        while prev[v] is not None:
            u = prev[v]
            cap[(u, v)] -= 1
            cap[(v, u)] += 1
            v = u
        flow += 1
    return flow


def is_connected(edges, nodes, skip=()):
    adj = {}
    for a, b in edges:
        if (a, b) in skip:
            continue
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    start = nodes[0]
    seen = {start}
    q = deque([start])
    while q:
        u = q.popleft()
        for v in adj.get(u, []):
            if v not in seen:
                seen.add(v)
                q.append(v)
    return len(seen) == len(nodes)


# --------------------------------------------------------------------------------------------
# 3. Desenho
# --------------------------------------------------------------------------------------------
class Town:
    pass


def blk(kind, frm, to, size, a, b):
    return {'kind': kind, 'from': frm, 'to': to, 'size': size, 'edge': [list(a), list(b)]}


REASON = {}


def why(n):
    REASON[n] = REASON.get(n, 0) + 1
    return None


def cheb(t1, t2):
    return min(max(abs(a[0] - c[0]), abs(a[1] - c[1])) for a in t1 for c in t2)


def manh(t1, p):
    return min(abs(a[0] - p[0]) + abs(a[1] - p[1]) for a in t1)


def build(level, seed, cfg=None, tries=60):
    cfg = cfg or CFG[level]
    rnd = random.Random(seed * 1000003 + level)
    W, H, nx, ny = cfg['W'], cfg['H'], cfg['nx'], cfg['ny']
    center = cfg['center']
    thick = cfg['doors'] > 0
    cx_plan = cy_plan = None
    for _ in range(tries):
        cx_plan = plan_axis(W - 2, nx, cfg['cell'][0], cfg['cell'][1], cfg['wall'][0], cfg['wall'][1], center[0] if center else None, rnd, thick)
        if cx_plan:
            break
    for _ in range(tries):
        cy_plan = plan_axis(H - 2, ny, cfg['cell'][0], cfg['cell'][1], cfg['wall'][0], cfg['wall'][1], center[1] if center else None, rnd, thick)
        if cy_plan:
            break
    if not cx_plan or not cy_plan:
        return why(1)
    (ccols, wcols), (crows, wrows) = cx_plan, cy_plan
    cells = [(i, j) for i in range(nx) for j in range(ny)]
    mid = (nx // 2, ny // 2) if center else None
    pc, ec = (0, 1), (nx - 1, ny - 2)
    # ---- labirinto: esqueleto de rotas (tortuoso) + ramos (becos sem saída) + trança ----
    edges = skeleton(nx, ny, pc, ec, cfg['routes'], cfg.get('winding', 0.3), rnd)
    if edges is None:
        return why(2)
    forced = set()
    if mid:
        forced |= {edge(mid, n) for n in nbrs(mid, nx, ny)}
    forced |= {edge(pc, n) for n in nbrs(pc, nx, ny)} | {edge(ec, n) for n in nbrs(ec, nx, ny)}
    edges |= forced
    edges = grow_branches(edges, nx, ny, cfg['newest'], rnd)
    edges = braid(edges, nx, ny, cfg['braid'], forced, rnd)
    routes = node_disjoint_routes(edges, nx, ny, pc, ec)
    if routes < cfg['routes']:
        return why(3)
    deg = degree_map(edges, nx, ny)
    T = Town()
    T.level, T.seed, T.cfg = level, seed, cfg
    T.nx, T.ny, T.ccols, T.wcols, T.crows, T.wrows, T.pc, T.ec, T.mid = nx, ny, ccols, wcols, crows, wrows, pc, ec, mid
    T.base_edges = set(edges)
    T.routes, T.extra = routes, 0
    T.dead_frac = sum(1 for c in cells if deg[c] == 1) / len(cells)
    T.cycles = len(edges) - len(cells) + 1
    # ---- posições fixas: início, saída e postos ----
    px, pw = ccols[pc[0]]; py, ph = crows[pc[1]]
    P = (px, py + ph // 2)
    ex, ew = ccols[ec[0]]; ey, eh = crows[ec[1]]
    ytop = ey + (eh - 2) // 2
    Etiles = [(xx, yy) for yy in (ytop, ytop + 1) for xx in range(ex + ew - 3, ex + ew)]
    vtiles, vans = [], []
    if mid:
        mx, mw = ccols[mid[0]]; my, mh = crows[mid[1]]
        mcx, mcy = mx + mw // 2, my + mh // 2
        assert mcx == W // 2 and mcy == H // 2, (mcx, mcy, W, H)
        vans = [(mcx + dc, mcy + dr) for dc, dr in ((-3, -2), (3, -2), (-3, 2), (3, 2))]
        vtiles = [(mcx + dc, mcy + dr) for dc, dr in V_POS[cfg['nv']]]
    else:
        chosen = []
        d1 = lambda c1, c2: abs(c1[0] - c2[0]) + abs(c1[1] - c2[1])
        pool = [c for c in cells if c not in (pc, ec)]
        for _ in range(cfg['nv']):
            best = max((c for c in pool if c not in chosen), key=lambda c: (min([d1(c, pc), d1(c, ec)] + [d1(c, o) for o in chosen]), rnd.random()))
            chosen.append(best)
        vtiles = [(ccols[ci][0] + ccols[ci][1] // 2, crows[cj][0] + crows[cj][1] // 2) for ci, cj in chosen]
    # ---- peças móveis ----
    def wall_thickness(e):
        a, b = e
        return wcols[min(a[0], b[0])][1] if a[1] == b[1] else wrows[min(a[1], b[1])][1]
    def street_width(e):
        a, b = e
        return crows[a[1]][1] if a[1] == b[1] else ccols[a[0]][1]
    def geom(e, kind):
        """Blocos e tiles que a peça `kind` ('door' ou 'wall') ocupa na ligação `e`; None se não cabe."""
        a, b = e
        horiz = a[1] == b[1]
        if horiz:
            i, j = min(a[0], b[0]), a[1]
            gx, gw = wcols[i]; ry, rh = crows[j]
        else:
            j, i = min(a[1], b[1]), a[0]
            gy, gh = wrows[j]; rx, rw = ccols[i]
        if kind == 'door':
            if wall_thickness(e) < 3:
                return None
            if horiz:
                row = ry + rh // 2; mc = gx + gw // 2; nr = row + rnd.choice((-1, 1))
                return dict(blk=blk('door', [mc, row], [mc, nr], [1, 1], a, b), carve=[(gx, row, gw, 1), (mc, nr, 1, 1)])
            col = rx + rw // 2; mr = gy + gh // 2; nc_ = col + rnd.choice((-1, 1))
            return dict(blk=blk('door', [col, mr], [nc_, mr], [1, 1], a, b), carve=[(col, gy, 1, gh), (nc_, mr, 1, 1)])
        sw = street_width(e)
        if not 3 <= sw <= 5:
            return None
        if horiz:
            mc = gx + (gw - 1) // 2
            return dict(blk=blk('wall', [mc, ry], [mc, ry + 1], [1, rh - 1], a, b), carve=[(gx, ry, gw, rh)])
        mr = gy + (gh - 1) // 2
        return dict(blk=blk('wall', [rx, mr], [rx + 1, mr], [rw - 1, 1], a, b), carve=[(rx, gy, rw, gh)])
    def tr(g):
        b = g['blk']
        return set(tiles_of(b, 'from')) | set(tiles_of(b, 'to'))
    hub = lambda e: (mid in e if mid else False) or pc in e or ec in e
    all_pairs = [edge(a, b) for a in cells for b in nbrs(a, nx, ny) if a < b]
    chosen_geoms = []
    def take(cands, kind, n, keep_order=False):
        if not keep_order:
            rnd.shuffle(cands)
        got = 0
        for e in cands:
            if got >= n:
                break
            g = geom(e, kind)
            if not g:
                continue
            if kind == 'door' and e in edges:             # uma porta no lugar de uma rua já existente: com todas as portas fechadas as células têm de continuar ligadas
                gone = {o['edge'] for o in chosen_geoms if o['kind'] == 'door' and o['edge'] in edges} | {e}
                if not is_connected(edges, cells, skip=gone):
                    continue
            t = tr(g)
            if any(cheb(t, tr(o)) < MIN_PIECE_GAP for o in chosen_geoms):
                continue
            if manh(t, P) < 6 or any(manh(t, q) < 5 for q in Etiles) or any(manh(t, q) < 3 for q in vtiles):
                continue
            chosen_geoms.append(g)
            g['kind'] = kind; g['edge'] = e
            got += 1
        return got
    bar_c = [e for e in sorted(edges) if not hub(e)]
    bridges = {e for e in edges if not is_connected(edges, cells, skip={e})}
    door_c = [e for e in all_pairs if e not in edges and not hub(e)]                       # ruas novas (atalhos que só abrem com a porta)
    door_c = door_c + [e for e in sorted(edges) if not hub(e) and e not in bridges]       # e vielas no lugar de ruas que fazem parte de um ciclo
    # (as portas fora do sorteio acima só entram se as primeiras não bastarem: take() embaralha, então separamos em duas listas)
    if take(bar_c, 'wall', cfg['walls']) < cfg['walls']:
        return why(4)
    degb = degree_map(edges, nx, ny)
    new_c = [e for e in all_pairs if e not in edges and not hub(e)]
    keep_dead = [e for e in new_c if degb[e[0]] >= 2 and degb[e[1]] >= 2]      # (as portas de preferência não ligam becos sem saída: os becos são o labirinto)
    new_c = keep_dead + [e for e in new_c if e not in keep_dead]
    cyc_c = [e for e in sorted(edges) if not hub(e) and e not in bridges]
    rnd.shuffle(keep_dead); rnd.shuffle(cyc_c)
    new_c = keep_dead + [e for e in new_c if e not in keep_dead]
    if take(new_c + cyc_c, 'door', cfg['doors'], keep_order=True) < cfg['doors']:
        return why(5)
    T.door_edges = {g['edge'] for g in chosen_geoms if g['kind'] == 'door'}
    T.bar_edges = {g['edge'] for g in chosen_geoms if g['kind'] == 'wall'}
    T.edges = set(edges) | T.door_edges
    deg2 = degree_map(T.edges, nx, ny)              # (as portas também são ruas: contam como ligação ao contar os becos sem saída)
    T.dead_frac = sum(1 for c in cells if deg2[c] == 1) / len(cells)
    T.cycles = len(T.edges) - len(cells) + 1
    # ---- muretas de caixas "X" (só o gato pula): faixas de 1 tile atravessando um prédio entre duas células que não são ligadas por rua ----
    hop_strips = []
    if cfg.get('hops'):
        busy_tiles = set()
        for gg in chosen_geoms:
            busy_tiles |= tr(gg)
        cand_h = [e for e in all_pairs if e not in T.edges and not hub(e)]
        rnd.shuffle(cand_h)
        for e in cand_h:
            if len(hop_strips) >= cfg['hops']:
                break
            a, b = e
            if a[1] == b[1]:
                gx, gw = wcols[min(a[0], b[0])]; ry, rh = crows[a[1]]
                strip = [(gx + i, ry + rh // 2) for i in range(gw)]
            else:
                gy, gh = wrows[min(a[1], b[1])]; rx, rw = ccols[a[0]]
                strip = [(rx + rw // 2, gy + i) for i in range(gh)]
            if any(cheb([t], busy_tiles) < 3 for t in strip if busy_tiles) or any(cheb([t], [u for h in hop_strips for u in h]) < 2 for t in strip if hop_strips):
                continue
            hop_strips.append(strip)
    T.hops = hop_strips
    # ---- rasterização ----
    g = [['#'] * W for _ in range(H)]
    def carve(x, y, w, h, ch='.'):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                g[yy][xx] = ch
    for (cx, cw) in ccols:
        for (cy, chh) in crows:
            carve(cx, cy, cw, chh)
    placed = {gg['edge']: gg for gg in chosen_geoms}
    for e in sorted(T.edges):
        gg = placed.get(e)
        if gg and gg['kind'] == 'door':
            for c in gg['carve']:
                carve(*c)
            continue
        a, b = e
        if a[1] == b[1]:
            gx, gw = wcols[min(a[0], b[0])]; ry, rh = crows[a[1]]
            carve(gx, ry, gw, rh)
        else:
            gy, gh = wrows[min(a[1], b[1])]; rx, rw = ccols[a[0]]
            carve(rx, gy, rw, gh)
    g[P[1]][P[0]] = 'P'
    for (x, y) in Etiles:
        g[y][x] = 'E'
    for strip in hop_strips:
        for (x, y) in strip:
            g[y][x] = 'X'
    for (x, y) in vans:
        g[y][x] = 'X'
    for (x, y) in vtiles:
        g[y][x] = 'V'
    T.rows = [''.join(r) for r in g]
    T.blocks = [gg['blk'] for gg in chosen_geoms]
    T.cats = place_cats(T, cfg.get('cats', 0), cells, rnd) if cfg.get('cats') else []
    if cfg.get('cats') and len(T.cats) < cfg['cats']:
        return why(6)
    return T


def place_cats(T, n, cells, rnd):
    """Posições iniciais dos gatos: centros de células a 28+ passos do início, 10+ da saída e dos postos, a 14+ passos entre si, fora dos trilhos das peças."""
    rows = T.rows
    H, W = len(rows), len(rows[0])
    floor = {(c, r) for r in range(H) for c in range(W) if rows[r][c] not in '#X'}
    P = next((c, r) for r in range(H) for c in range(W) if rows[r][c] == 'P')
    E = [(c, r) for r in range(H) for c in range(W) if rows[r][c] == 'E']
    V = [(c, r) for r in range(H) for c in range(W) if rows[r][c] == 'V']
    track = set()
    for b in T.blocks:
        track |= set(tiles_of(b, 'from')) | set(tiles_of(b, 'to'))
    dP = bfs_dist(floor, P)
    dE = [bfs_dist(floor, e) for e in E[:1]]
    dV = bfs_dist(floor, V[0]) if V else {}
    cand = []
    for (i, j) in cells:
        c = (T.ccols[i][0] + T.ccols[i][1] // 2, T.crows[j][0] + T.crows[j][1] // 2)
        if c not in floor or c in track or (T.mid and (i, j) == T.mid):
            continue
        if dP.get(c, 0) >= 28 and dE[0].get(c, 0) >= 10 and dV.get(c, 0) >= 10:
            cand.append(c)
    rnd.shuffle(cand)
    chosen = []
    for c in cand:
        if len(chosen) >= n:
            break
        dc = bfs_dist(floor, c)
        if all(dc.get(o, 99) >= 14 for o in chosen):
            chosen.append(c)
    return chosen


def tiles_of(b, which):
    x, y = b[which]; w, h = b['size']
    return [(x + i, y + j) for i in range(w) for j in range(h)]


def bfs_dist(free, start):
    dist = {start: 0}
    q = deque([start])
    while q:
        c, r = q.popleft()
        for dc, dr in DIRS:
            n = (c + dc, r + dr)
            if n in free and n not in dist:
                dist[n] = dist[(c, r)] + 1
                q.append(n)
    return dist


def analyse(T):
    rows = T.rows
    H, W = len(rows), len(rows[0])
    floor = {(c, r) for r in range(H) for c in range(W) if rows[r][c] != '#' and rows[r][c] != 'X'}
    P = next((c, r) for r in range(H) for c in range(W) if rows[r][c] == 'P')
    E = [(c, r) for r in range(H) for c in range(W) if rows[r][c] == 'E']
    blocks = T.blocks
    track = set()
    for b in blocks:
        track |= set(tiles_of(b, 'from')) | set(tiles_of(b, 'to'))
    base = bfs_dist(floor, P)
    open_path = min(base.get(e, 10 ** 9) for e in E)
    fixed = floor - track
    ok = True
    worst = open_path
    n = len(blocks)
    for combo in itertools.product((0, 1), repeat=n):
        occ = set()
        for b, k in zip(blocks, combo):
            occ |= set(tiles_of(b, 'from' if k == 0 else 'to'))
        free = floor - occ
        d = bfs_dist(free, P)
        if any(t not in d for t in fixed):
            ok = False
            break
        worst = max(worst, min(d.get(e, 10 ** 9) for e in E))
    return dict(floor=len(floor), path=open_path, worst=worst, ratio=worst / open_path if open_path else 99, conn=ok, track=track, P=P, E=E)


def check_pieces(T):
    """Distância entre trilhos, trilhos longe do início, da saída e dos postos."""
    problems = []
    tracks = []
    for b in T.blocks:
        tracks.append(set(tiles_of(b, 'from')) | set(tiles_of(b, 'to')))
    for i in range(len(tracks)):
        for j in range(i + 1, len(tracks)):
            d = min(max(abs(a[0] - c[0]), abs(a[1] - c[1])) for a in tracks[i] for c in tracks[j])
            if d < MIN_PIECE_GAP:
                problems.append(f'peças {i} e {j} a {d} tiles')
    rows = T.rows
    H, W = len(rows), len(rows[0])
    pts = {k: [(c, r) for r in range(H) for c in range(W) if rows[r][c] == k] for k in 'PEV'}
    for i, tr in enumerate(tracks):
        for k, lim in (('P', 6), ('E', 5), ('V', 3)):
            for a in pts[k]:
                d = min(abs(a[0] - t[0]) + abs(a[1] - t[1]) for t in tr)
                if d < lim:
                    problems.append(f'peça {i} perto de {k} ({d})')
    return problems


def junctions_on_path(T):
    """Células de decisão (3+ ruas) pelas quais passa o caminho mais curto de células do início à saída."""
    adj = {}
    for a, b in T.edges:
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    prev = {T.pc: None}
    q = deque([T.pc])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in prev:
                prev[v] = u
                q.append(v)
    path, u = [], T.ec
    while u is not None:
        path.append(u)
        u = prev[u]
    return len(path), sum(1 for c in path if len(adj[c]) >= 3)


def metrics(T, an):
    cells = T.nx * T.ny
    deg = degree_map(T.edges, T.nx, T.ny)
    jl, jn = junctions_on_path(T)
    return dict(cells=cells, edges=len(T.edges), cycles=T.cycles, dead=round(T.dead_frac, 3), dead_cells=sum(1 for d in deg.values() if d == 1),
                routes=T.routes, path=an['path'], worst=an['worst'], ratio=round(an['ratio'], 2), cell_path=jl, cell_junctions=jn,
                floor=an['floor'], pieces=len(T.blocks), doors=sum(1 for b in T.blocks if b['kind'] == 'door'), walls=sum(1 for b in T.blocks if b['kind'] == 'wall'))


def make(level, seed, verbose=False):
    T = build(level, seed)
    if T is None:
        return None
    probs = check_pieces(T)
    if probs:
        if verbose:
            print('peças:', probs[:3], file=sys.stderr)
        return None
    an = analyse(T)
    if not an['conn'] or an['ratio'] > MAX_RATIO:
        if verbose:
            print('conn/ratio', an['conn'], an['ratio'], file=sys.stderr)
        return None
    T.an = an
    T.metrics = metrics(T, an)
    return T


def to_json(T):
    out = dict(level=T.level, seed=T.seed, rows=T.rows, metrics=T.metrics, path=T.metrics['path'],
               blocks=[dict(kind=b['kind'], **{'from': b['from'], 'to': b['to'], 'size': b['size']}) for b in T.blocks],
               cats=[list(c) for c in getattr(T, 'cats', [])], hops=[[list(t) for t in h] for h in getattr(T, 'hops', [])],
               lattice=dict(cx=[list(x) for x in T.ccols], wx=[list(x) for x in T.wcols], cy=[list(x) for x in T.crows], wy=[list(x) for x in T.wrows],
                            edges=[[list(a), list(b)] for a, b in sorted(T.edges)], P=list(T.pc), E=list(T.ec)))
    return out


def score(T):
    return abs(T.dead_frac - T.cfg['dead']) + 0.002 * (T.an['ratio'] - 1)


def search(level, a, b, verbose=True):
    best = None
    t0 = time.time()
    ok = 0
    for seed in range(a, b):
        T0 = build(level, seed)
        if T0 is None or abs(T0.dead_frac - CFG[level]['dead']) > (best[0] + 0.03 if best else 0.1):
            continue                                   # (pré-filtro barato: só analisa as 4096 combinações das peças nas sementes promissoras)
        T = make(level, seed)
        if not T:
            continue
        ok += 1
        s = score(T)
        if best is None or s < best[0]:
            best = (s, T)
            if verbose:
                print(f'  fase {level} semente {seed}: becos {T.dead_frac:.3f} (alvo {T.cfg["dead"]}) caminho {T.an["path"]} razão {T.an["ratio"]:.2f} rotas {T.routes}', file=sys.stderr)
    if verbose:
        print(f'fase {level}: {ok} sementes válidas de {b - a} em {time.time() - t0:.0f} s', file=sys.stderr)
    return best[1] if best else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', type=int)
    ap.add_argument('--seed', type=int)
    ap.add_argument('--search', nargs=2, type=int)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--out')
    ap.add_argument('--outdir')
    ap.add_argument('--print', action='store_true')
    a = ap.parse_args()
    levels = list(CFG) if a.all else [a.level]
    for lv in levels:
        if a.seed is not None:
            T = make(lv, a.seed, verbose=True)
        else:
            lo, hi = a.search or (0, 200)
            T = search(lv, lo, hi)
        if not T:
            print(f'fase {lv}: nenhum mapa válido', file=sys.stderr)
            continue
        if a.print:
            print('\n'.join(T.rows))
            print(json.dumps(T.metrics, ensure_ascii=False))
        path = a.out if a.out else (f'{a.outdir}/map{lv}.json' if a.outdir else None)
        if path:
            json.dump(to_json(T), open(path, 'w'), ensure_ascii=False)
            print('gravado', path, file=sys.stderr)


if __name__ == '__main__':
    main()
