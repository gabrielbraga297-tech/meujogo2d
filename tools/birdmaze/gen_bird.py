#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador dos 20 MAPAS DO PASSARINHO (0.20.0). Um estilo de desenho por ambiente (tools/birdmaze/bird_styles.py), determinístico por semente.
Derivado do gerador do Gatinho (tools/catmaze/gen_cat.py).

Legenda: # parede sólida sempre | M muro fino voável | . chão | P início | V posto de gato de quintal | H posto de gavião (Fases 11 a 20) | E saída (3 tiles na borda)
         X obstáculo baixo (o passarinho passa, os gatos não) | G galho (a salvo) | > < ^ v correntes de vento (grupos de 2 a 8 tiles)

Método:
  1. A saída E é escolhida primeiro (3 tiles encostados na borda + 2 tiles de frente livres, mais uma folga) e TRAVADA: o estilo desenha em volta dela.
  2. O estilo do ambiente desenha paredes (B bloco duro, M muro, # automática) e obstáculos X com o gerador de números aleatórios da semente.
  3. O acabamento liga bolsões soltos, põe os galhos G e os ventos, põe o início P longe da saída e os postos V/H longe do início e entre si, e
     classifica as paredes: B -> #, fina -> M, grossa (bloco 3x3) -> #.
  4. A orientação (saída à direita, à esquerda, embaixo ou em cima) vem de transformações da grade (espelho e transposição; as setas de vento giram junto).
  5. validate() confere as regras de validade (as mesmas de tests/bird-levels.test.js, escritas de novo em JavaScript).

Uso:
  python3 tools/birdmaze/gen_bird.py --level 7 --seed 3 --print        # mostra um mapa
  python3 tools/birdmaze/gen_bird.py --level 7 --search 0 60           # lista as sementes válidas com métricas
  python3 tools/birdmaze/gen_bird.py --all --write                     # regera js/bird-levels.js com as sementes de SEEDS
  python3 tools/birdmaze/gen_bird.py --all --json                      # imprime os 20 mapas em JSON (teste de determinismo)
  python3 tools/birdmaze/gen_bird.py --check                           # confere a diferença entre as 20 fases, as do Gatinho e as do Cachorrinho
  python3 tools/birdmaze/gen_bird.py --table                           # números de cada fase (para docs/PASSARINHO-DESENHO.md)
"""
import argparse, json, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bird_core import *   # noqa: F401,F403 (a grade, as ferramentas e a validação)
from bird_core import Invalid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JS_OUT = os.path.join(ROOT, 'js', 'bird-levels.js')


def _s(**k):
    return k


# --------------------------------------------------------------------------------------------
# Tabela das fases (docs/PASSARINHO-DESENHO.md). W x H = colunas x linhas.
# --------------------------------------------------------------------------------------------
#            tamanho         gatos gaviões sementes frutos minhocas  G  vento  saída  alcance do "!" (do cachorrinho; igual ao do Gatinho)
SPEC = {
    1:  _s(W=25, H=18, cats=1, hawks=0, seeds=5,  fruits=0, worms=0, G=0, wind=0, eside='L', alert=2,
           place="Jardim florido", note="andar, pegar sementes e fugir do gato do quintal"),
    2:  _s(W=25, H=18, cats=2, hawks=0, seeds=7,  fruits=2, worms=1, G=0, wind=0, eside='R', alert=4,
           place="Pomar de macieiras", note="fruto dá voo alto: passe por cima dos muros e bata as asas"),
    3:  _s(W=25, H=18, cats=2, hawks=0, seeds=7,  fruits=2, worms=1, G=1, wind=2, eside='L', alert=6,
           place="Horta e cerca", note="cerca baixa, galho para ficar a salvo e vento que empurra"),
    4:  _s(W=41, H=29, cats=3, hawks=0, seeds=15, fruits=2, worms=2, G=2, wind=3, eside='B', alert=8,
           place="Telhados e chaminés", note="primeira fase grande: é preciso fazer pontos mínimos"),
    5:  _s(W=41, H=29, cats=3, hawks=0, seeds=20, fruits=2, worms=2, G=4, wind=0, eside='R', alert=10,
           place="Praça da vila", note="as árvores da praça são galhos para ficar a salvo"),
    6:  _s(W=49, H=33, cats=3, hawks=0, seeds=24, fruits=3, worms=3, G=2, wind=2, eside='L', alert=11,
           place="Parque e coreto", note="alamedas e canteiros com sebes baixas para voar por cima"),
    7:  _s(W=49, H=37, cats=4, hawks=0, seeds=28, fruits=3, worms=3, G=2, wind=3, eside='T', alert=12,
           place="Milharal", note="corredores estreitos de milho: o voo alto corta caminho"),
    8:  _s(W=55, H=39, cats=5, hawks=0, seeds=32, fruits=4, worms=3, G=3, wind=5, eside='R', alert=13,
           place="Campo de trigo e espantalhos", note="campo aberto com ventos fortes e espantalhos"),
    9:  _s(W=55, H=39, cats=5, hawks=0, seeds=36, fruits=4, worms=3, G=5, wind=6, eside='B', alert=14,
           place="Lago e juncos", note="juncos para pousar e uma margem ventosa"),
    10: _s(W=55, H=41, cats=6, hawks=0, seeds=40, fruits=5, worms=3, G=4, wind=2, eside='L', alert=15,
           place="Mata de pinheiros", note="troncos e sub-bosque, com muitos galhos"),
    11: _s(W=57, H=41, cats=5, hawks=2, seeds=44, fruits=5, worms=4, G=4, wind=4, eside='R', alert=16,
           place="Fazenda e galinheiro", note="os gaviões chegam e a missão é pegar todos os frutos"),
    12: _s(W=57, H=41, cats=5, hawks=3, seeds=46, fruits=5, worms=4, G=4, wind=4, eside='T', alert=16,
           place="Margem do rio", note="mais sementes, mais pontos e a missão das 34 sementes"),
    13: _s(W=57, H=43, cats=6, hawks=3, seeds=48, fruits=6, worms=4, G=7, wind=3, eside='L', alert=17,
           place="Pântano e vitórias-régias", note="muitas vitórias-régias para pousar, com gaviões à espreita"),
    14: _s(W=57, H=43, cats=6, hawks=4, seeds=50, fruits=6, worms=4, G=4, wind=8, eside='B', alert=17,
           place="Dunas e restinga", note="ventos de duna e moitas baixas de restinga"),
    15: _s(W=59, H=43, cats=6, hawks=4, seeds=52, fruits=6, worms=4, G=4, wind=5, eside='T', alert=18,
           place="Falésias e ninhos", note="rochas, ninhos nas bordas e correntes de ar para cima"),
    16: _s(W=59, H=45, cats=7, hawks=5, seeds=54, fruits=7, worms=5, G=5, wind=7, eside='R', alert=18, erange=(0.15, 0.5),
           place="Vila de pescadores e redes", note="redes secando para passar voando e mastros para pousar"),
    17: _s(W=61, H=45, cats=7, hawks=5, seeds=56, fruits=7, worms=5, G=3, wind=8, eside='B', alert=19, erange=(0.12, 0.6),
           place="Campos de altitude", note="campo aberto, muros de pedra e poucos abrigos"),
    18: _s(W=61, H=45, cats=7, hawks=6, seeds=58, fruits=7, worms=5, G=8, wind=0, eside='L', alert=19,
           place="Entardecer nos telhados", note="luz laranja que escurece, com antenas para pousar"),
    19: _s(W=61, H=45, cats=8, hawks=6, seeds=60, fruits=8, worms=5, G=5, wind=6, eside='T', alert=20,
           place="Noite na floresta", note="noite: só se vê em volta do passarinho"),
    20: _s(W=63, H=47, cats=8, hawks=7, seeds=62, fruits=8, worms=5, G=6, wind=6, eside='R', alert=20,
           place="O grande ninho", note="tudo junto: a volta ao ninho"),
}
# tipos de fruto: como o Gatinho (novelos): "scare" = VOO ALTO comum, "gold" escudo, "ice" ar frio, "turbo" rajada, "magnet" ímã de sementes
MIX = {
    11: ["scare", "scare", "scare", "gold", "ice"],
    12: ["scare", "scare", "scare", "ice", "turbo"],
    13: ["scare", "scare", "scare", "gold", "ice", "magnet"],
    14: ["scare", "scare", "scare", "gold", "turbo", "magnet"],
    15: ["scare", "scare", "scare", "ice", "turbo", "magnet"],
    16: ["scare", "scare", "scare", "gold", "ice", "turbo", "magnet"],
    17: ["scare", "scare", "scare", "gold", "ice", "turbo", "magnet"],
    18: ["scare", "scare", "scare", "gold", "ice", "turbo", "magnet"],
    19: ["scare", "scare", "scare", "gold", "gold", "ice", "turbo", "magnet"],
    20: ["scare", "scare", "scare", "gold", "ice", "ice", "turbo", "magnet"],
}
EXTRA = {1: [1, 1], 2: [1, 2], 3: [1, 2], 4: [3, 3], 5: [4, 4]}      # as outras: [3, 4] (iguais às do Gatinho)
BIRDSPEED = {1: 0.8, 3: 0.9}                                          # as outras: 1 (igual ao catSpeed do Gatinho)

# Sementes escolhidas (veja --search e --pick). Mude aqui e rode --all --write.
SEEDS = {1: 6, 2: 1, 3: 2, 4: 2, 5: 7, 6: 8, 7: 5, 8: 22, 9: 0, 10: 6, 11: 0, 12: 6, 13: 6, 14: 0, 15: 50, 16: 5, 17: 3, 18: 0, 19: 2, 20: 3}


def spec_of(n):
    sp = dict(SPEC[n])
    sp['n'] = n
    return sp


# --------------------------------------------------------------------------------------------
# Geração
# --------------------------------------------------------------------------------------------
def decorate(m, rng, sp, info):
    """galhos G e ventos (depois do estilo e antes dos postos)"""
    import bird_styles
    if sp['G']:
        gw = info.get('g_where') or bird_styles.interior(m)
        lo, hi = info.get('g_sizes', (1, 3))
        place_groups(m, rng, 'G', sp['G'], lo, hi, where=gw)
    if sp['wind']:
        lo, hi = info.get('wind_len', (3, 6))
        place_wind(m, rng, sp['wind'], max(2, lo), min(8, hi), info.get('wind_where'), prefer=info.get('wind_prefer'))


def generate(n, seed):
    """devolve (grade final, problemas, extras)"""
    import bird_styles
    sp = spec_of(n)
    rng = random.Random(n * 100019 + seed * 7907 + 31)
    w, h = (sp['H'], sp['W']) if sp['eside'] in 'BT' else (sp['W'], sp['H'])
    m = Grid(w, h)
    pick_exit(m, rng, *sp.get('erange', (0.2, 0.8)))
    try:
        info = bird_styles.STYLES[n](m, rng, sp) or {}
        for k in ('mmin', 'mshare', 'ushort', 'msave'):
            if k in info:
                sp[k] = info[k]
        connect_pockets(m, rng)
        decorate(m, rng, sp, info)
        place_posts(m, rng, dict(sp), info.get('pband'))
        classify_walls(m)
    except Invalid as e:
        return None, ['estilo: %s' % e], {}
    rows = transform(m.rows(), sp['eside'])
    fm = to_grid(rows)
    errs = validate(fm, sp)
    return fm, errs, info


def interior_hash(m):
    return sum(1 for y in range(1, m.H - 1) for x in range(1, m.W - 1) if m.g[y][x] == '#')


def metrics(m, sp):
    a = analyze(m)
    free = sum(1 for r in m.rows() for c in r if c not in '#M')
    a['floor'] = free / (m.W * m.H)
    sv, frac, pe = shortcut_saving(m)
    tot, useful = crossings(m)
    nM, nH = m.count('M'), interior_hash(m)
    a.update({'save': sv, 'frac4': frac, 'pe_save': pe, 'cross': tot, 'useful': len(useful), 'M': nM, 'H': nH, 'share': nM / (nM + nH) if nM + nH else 0.0,
              'cand': len(engine_candidates(m)), 'Mgroups': len(groups_of(m, 'M'))})
    return a


def search(n, a, b, quiet=False):
    sp = spec_of(n)
    good = []
    for sd in range(a, b):
        m, errs, _ = generate(n, sd)
        if m is None or errs:
            if not quiet:
                print('  semente %3d  X  %s' % (sd, '; '.join(errs)[:170]))
            continue
        me = metrics(m, sp)
        print('  semente %3d  OK  P->E gato %d voo baixo %d voo alto %d  caminhos %d  M %d (%.0f%% das paredes)  economia %.2f  úteis %d  itens/candidatos %.0f%%' % (
            sd, me['pe_cat'], me['pe_low'], me['pe_high'], me['disjoint'], me['M'], 100 * me['share'], me['save'], me['useful'],
            100 * (sp['seeds'] + sp['fruits'] + sp['worms']) / me['cand']))
        good.append(sd)
    return good


# --------------------------------------------------------------------------------------------
# Diferença entre mapas: o Gatinho exigia no máximo 60% de tiles iguais na mesma posição, mas os mapas do Passarinho são mais abertos (mais chão), e dois mapas abertos
# quaisquer já têm bem mais de 60% de chão em comum. Aqui vale a sobreposição (Jaccard) das PAREDES e PEÇAS (# e M iguais, X, G): no máximo 35% entre mapas do mesmo
# tamanho e 45% na janela comum de tamanhos diferentes; e a regra antiga, relaxada, dos tiles iguais: 85% / 90% (pega cópias).
# --------------------------------------------------------------------------------------------
SAME_MAX, WINDOW_MAX = 0.85, 0.90
FEAT_SAME_MAX, FEAT_WINDOW_MAX = 0.35, 0.45


def other_maps():
    """os 20 mapas do Gatinho (js/cat-levels.js) e os 20 do Cachorrinho (js/game.js); não são alterados"""
    import re
    out = {}
    src = open(os.path.join(ROOT, 'js', 'game.js'), encoding='utf-8').read()
    for n in range(1, 21):
        body = re.search(r'const MAP_%d = (\[[\s\S]*?\]);' % n, src).group(1)
        out['Cachorrinho %d' % n] = re.findall(r'"([^"]+)"', body)
    cs = open(os.path.join(ROOT, 'js', 'cat-levels.js'), encoding='utf-8').read()
    data = json.loads(cs[cs.index('/*BEGIN-DATA*/') + len('/*BEGIN-DATA*/'):cs.index('/*END-DATA*/')])
    for lv in data:
        out['Gatinho %d' % lv['id']] = lv['map']
    return out


def same_size(a, b):
    return len(a) == len(b) and len(a[0]) == len(b[0])


def too_alike(a, b):
    """a, b = mapas em linhas"""
    same = same_size(a, b)
    if same_fraction(a, b) > (SAME_MAX if same else WINDOW_MAX):
        return True
    return feature_overlap(a, b) > (FEAT_SAME_MAX if same else FEAT_WINDOW_MAX)


def worst_overlap(rows, others):
    """a pior sobreposição de paredes e peças com os mapas `others`, em fração do limite (1.0 = no limite)"""
    w = 0.0
    for o in others:
        lim = FEAT_SAME_MAX if same_size(rows, o) else FEAT_WINDOW_MAX
        w = max(w, feature_overlap(rows, o) / lim)
    return w


def pick(per_level=10, max_seed=80, only=None):
    """acha as sementes: válidas, com economia de atalhos boa e o mais diferentes possível dos mapas já escolhidos e dos outros bichinhos"""
    others = other_maps()
    chosen = {}
    for n in range(1, 21):
        sp = spec_of(n)
        if only and n not in only:
            m0, e0, _ = generate(n, SEEDS[n])
            chosen[n] = m0.rows()
            continue
        cands = []
        for sd in range(max_seed):
            m, errs, _ = generate(n, sd)
            if m is not None and not errs:
                cands.append((sd, m.rows(), metrics(m, sp)))
                if len(cands) >= per_level:
                    break
        best = None
        for sd, rows, me in cands:
            worst = worst_overlap(rows, list(chosen.values()) + list(others.values()))
            key = (0 if me['disjoint'] >= 2 else 1, 0.0 if worst <= 0.7 else round(worst, 2), -round(me['save'], 1))
            if best is None or key < best[0]:
                best = (key, sd, rows, me, worst)
        if best is None:
            raise SystemExit('Fase %d: nenhuma semente válida em %d' % (n, max_seed))
        chosen[n] = best[2]
        print('  Fase %2d: semente %2d  (pior sobreposição %.0f%% do limite, %d candidatas, economia %.2f)' % (n, best[1], 100 * best[4], len(cands), best[3]['save']))
        SEEDS[n] = best[1]
    print('SEEDS =', json.dumps({k: v for k, v in sorted(SEEDS.items())}))


# --------------------------------------------------------------------------------------------
# Saída: js/bird-levels.js
# --------------------------------------------------------------------------------------------
def level_def(n, rows):
    sp = spec_of(n)
    return {
        'id': n, 'title': 'Fase %d' % n, 'place': sp['place'], 'note': sp['note'], 'like': n,
        'size': [sp['W'], sp['H']], 'cats': sp['cats'], 'hawks': sp['hawks'],
        'seeds': sp['seeds'], 'fruits': sp['fruits'], 'fruitMix': MIX.get(n, ['scare'] * sp['fruits']),
        'worms': sp['worms'], 'extraLives': EXTRA.get(n, [3, 4]), 'birdSpeed': BIRDSPEED.get(n, 1),
        'special': {'G': sp['G'], 'wind': sp['wind'], 'M': any('M' in r for r in rows)}, 'seed': SEEDS[n], 'map': rows,
    }


JS_HEAD = '''// Os 20 MAPAS E DADOS DAS FASES DO PASSARINHO (0.20.0). ARQUIVO GERADO por tools/birdmaze/gen_bird.py (não edite à mão): `python3 tools/birdmaze/gen_bird.py --all --write`.
// Uso: window.BirdLevels (navegador) ou require("./js/bird-levels.js") (Node) = uma lista com as 20 definições, em ordem (BirdLevels[0] = Fase 1).
// Cada definição: { id, title, place (lugar), note (novidade da fase), like (fase do CACHORRINHO cuja configuração de inimigos e regras o motor copia: velocidade e esperteza dos gatos,
//   alcance do "!", perda por vida, pontos mínimos, bônus, vidas máximas, missão, intervalo de bônus), size [colunas, linhas], cats (postos V de gatos de quintal), hawks (postos H de gaviões, Fases 11 a 20),
//   seeds (sementes), fruits (frutos), fruitMix (tipo de cada fruto: "scare" = VOO ALTO comum, "gold" escudo, "ice" ar frio, "turbo" rajada, "magnet" ímã de sementes),
//   worms (minhocas), extraLives [mín, máx], birdSpeed (fração de 252 px/s), special { G: grupos de galho (1 a 3 tiles cada), wind: grupos de vento (2 a 8 tiles cada, numa direção),
//   M: true se a fase tem muros voáveis }, seed (semente do gerador), map (linhas ASCII) }.
// Legenda do mapa: # parede SÓLIDA sempre (bordas, rochas, troncos, construções) | M muro fino de labirinto (cerca, sebe, milho, caniço): sólido no voo baixo e para os gatos e os gaviões; o VOO ALTO passa por cima
//   . chão | P início (1) | V posto de gato de quintal | H posto de gavião | E saída = o ninho (3 tiles na borda) | X obstáculo baixo (o passarinho passa sempre; os gatos não; o gavião sim)
//   G galho (o passarinho fica a salvo em cima; gatos e gaviões esperam ao pé e desistem) | > < ^ v correntes de vento (chão normal para todos; empurram só o passarinho em voo baixo).
// Sementes, frutos e minhocas NÃO estão no mapa: o motor os sorteia em chão livre ('.'), como as rações do cachorrinho. Vento e G nunca ficam sobre o início, a saída ou os postos;
// o vento só fica em '.' e nenhuma seta aponta direto para uma parede.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.BirdLevels = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  return /*BEGIN-DATA*/'''
JS_TAIL = '''/*END-DATA*/;
});
'''


def build_all():
    out = []
    for n in range(1, 21):
        m, errs, _ = generate(n, SEEDS[n])
        if m is None or errs:
            raise SystemExit('Fase %d (semente %d) inválida: %s' % (n, SEEDS[n], errs))
        out.append(level_def(n, m.rows()))
    return out


def js_text(levels):
    return JS_HEAD + json.dumps(levels, ensure_ascii=False, indent=1) + JS_TAIL


def write_js(levels, path=JS_OUT):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(js_text(levels))


COND = {1: 'pegar tudo', 2: 'pegar tudo', 3: 'pegar tudo', 4: '800', 5: '1000', 6: '1250', 7: '1400', 8: '1650', 9: '1800', 10: '2050', 11: '2300 + missão',
        12: '2450 + missão', 13: '2650 + missão', 14: '2800 + missão', 15: '3000 + missão', 16: '3200 + missão', 17: '3400 + missão', 18: '3600 + missão', 19: '3800 + missão', 20: '4000 + missão'}
NEWS = {1: 'andar, pegar sementes, fugir do gato (filhote)', 2: 'fruto (voo alto por cima dos muros) e bater asas', 3: 'X (cerca baixa), galho (a salvo), vento',
        4: 'primeira fase grande; mínimo de pontos', 5: 'muitos galhos (as árvores da praça)', 6: 'alamedas, canteiros e sebes baixas', 7: 'corredores estreitos de milho (muros M)',
        8: 'ventos fortes no campo aberto', 9: 'juncos (galhos) e margem ventosa', 10: 'troncos e sub-bosque (muros M), muitos galhos', 11: 'gaviões; missão: todos os frutos',
        12: 'missão: 34 sementes', 13: 'muitos galhos (vitórias-régias), gaviões', 14: 'ventos de duna', 15: 'rochas (paredes), muros de pedra, correntes de ar',
        16: 'redes (X), mastros (galhos), varais (M)', 17: 'campo aberto, muros de pedra, poucos abrigos', 18: 'luz laranja que escurece (visão reduzida)',
        19: 'noite: halo em volta do passarinho', 20: 'tudo junto; volta ao lar'}


def table():
    """imprime em Markdown as duas tabelas de docs/PASSARINHO-DESENHO.md (a das fases e a dos muros voáveis e atalhos), com os números reais dos mapas de SEEDS"""
    print('| F | Ambiente (ecologia) | Mapa | Gatos | Gaviões | Sementes | Frutos | Minhocas | G | Vento | Condição | M | Novidade da fase |')
    print('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    rows2 = []
    for n in range(1, 21):
        sp = spec_of(n)
        m, errs, _ = generate(n, SEEDS[n])
        me = metrics(m, sp)
        dash = lambda v: str(v) if v else '—'
        print('| %d | %s | %d×%d | %d | %s | %d | %s | %s | %s | %s | %s | %s | %s |' % (
            n, sp['place'], sp['W'], sp['H'], sp['cats'], dash(sp['hawks']), sp['seeds'], dash(sp['fruits']), dash(sp['worms']), dash(sp['G']), dash(sp['wind']), COND[n],
            'sim' if me['M'] else 'não', NEWS[n]))
        rows2.append((n, me))
    print()
    print('| F | M | # de dentro | % de M | P→E voo baixo | P→E voo alto | economia P→E | economia média (tiles) | pares com economia ≥ 4 | tiles M em travessias úteis | travessias |')
    print('|---|---|---|---|---|---|---|---|---|---|---|')
    for n, me in rows2:
        print('| %d | %d | %d | %d%% | %d | %d | %d | %.2f | %.1f%% | %d | %d |' % (n, me['M'], me['H'], round(100 * me['share']), me['pe_low'], me['pe_high'], me['pe_save'], me['save'], 100 * me['frac4'], me['useful'], me['cross']))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', type=int)
    ap.add_argument('--seed', type=int)
    ap.add_argument('--print', action='store_true')
    ap.add_argument('--search', nargs=2, type=int)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--out', default=None, help='com --all --write: grava neste caminho em vez de js/bird-levels.js')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--table', action='store_true')
    ap.add_argument('--pick', action='store_true')
    ap.add_argument('--per', type=int, default=10)
    ap.add_argument('--max-seed', dest='max_seed', type=int, default=80)
    ap.add_argument('--only', default='')
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    if a.level and a.search:
        search(a.level, a.search[0], a.search[1], a.quiet)
    elif a.level and a.seed is not None:
        m, errs, _ = generate(a.level, a.seed)
        if m is None:
            print('FALHOU:', errs)
            return
        print('\n'.join(m.rows()))
        print('problemas:', errs or 'nenhum')
        if not errs:
            print(metrics(m, spec_of(a.level)))
    elif a.all and a.json:
        print(json.dumps([lv['map'] for lv in build_all()]))
    elif a.all and a.write:
        lv = build_all()
        write_js(lv, a.out or JS_OUT)
        print('escrito', a.out or JS_OUT)
    elif a.pick:
        pick(a.per, a.max_seed, [int(v) for v in a.only.split(',')] if a.only else None)
    elif a.table:
        table()
    elif a.check:
        lv = build_all()
        others = other_maps()
        bad = 0
        top = 0.0
        for i in range(20):
            for j in range(i + 1, 20):
                f = feature_overlap(lv[i]['map'], lv[j]['map'])
                top = max(top, f / (FEAT_SAME_MAX if same_size(lv[i]['map'], lv[j]['map']) else FEAT_WINDOW_MAX))
                if too_alike(lv[i]['map'], lv[j]['map']):
                    bad += 1
                    print('Fases %d e %d do Passarinho: %.0f%% de paredes e peças iguais' % (i + 1, j + 1, 100 * f))
            for name, o in others.items():
                f = feature_overlap(lv[i]['map'], o)
                top = max(top, f / (FEAT_SAME_MAX if same_size(lv[i]['map'], o) else FEAT_WINDOW_MAX))
                if too_alike(lv[i]['map'], o):
                    bad += 1
                    print('Fase %d do Passarinho e %s: %.0f%% de paredes e peças iguais' % (i + 1, name, 100 * f))
        print('pares parecidos demais:', bad, '(o pior par chega a %.0f%% do limite)' % (100 * top))
        sys.exit(1 if bad else 0)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
