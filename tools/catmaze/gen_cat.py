#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador dos 20 MAPAS DO GATINHO (0.18.0). Um estilo de desenho por ambiente (tools/catmaze/cat_styles.py), determinístico por semente.

Legenda: # parede | . chão | P início | V posto de cão de guarda | R posto de cão rastreador (Fases 11 a 20) | E saída (3 tiles na borda)
         X obstáculo baixo (o gatinho pula, os cães não) | T lugar alto (o gatinho sobe, os cães não) | ~ poça (chão para todos; molha o gatinho)

Método:
  1. A saída E é escolhida primeiro (3 tiles encostados na borda + 2 tiles de frente livres, mais uma folga) e TRAVADA: o estilo desenha em volta dela.
  2. O estilo do ambiente (cat_styles.py) desenha paredes, móveis (X), lugares altos (T) e poças (~) com o gerador de números aleatórios da semente.
  3. O acabamento liga bolsões soltos, põe o início P longe da saída e os postos V/R longe do início e entre si.
  4. A orientação (saída à direita, à esquerda, embaixo ou em cima) vem de transformações da grade (espelho e transposição).
  5. validate() confere TODAS as regras de validade (as mesmas de tests/cat-levels.test.js, escritas de novo em JavaScript).

Uso:
  python3 tools/catmaze/gen_cat.py --level 7 --seed 3 --print        # mostra um mapa
  python3 tools/catmaze/gen_cat.py --level 7 --search 0 60           # lista as sementes válidas com métricas
  python3 tools/catmaze/gen_cat.py --all --write                     # regera js/cat-levels.js com as sementes de SEEDS
  python3 tools/catmaze/gen_cat.py --all --json                      # imprime os 20 mapas em JSON (teste de determinismo)
  python3 tools/catmaze/gen_cat.py --check                           # confere as 20 fases e a diferença entre elas
"""
import argparse, json, os, random, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cat_core import *   # noqa: F401,F403 (a grade, as ferramentas e a validação)
from cat_core import Invalid

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JS_OUT = os.path.join(ROOT, 'js', 'cat-levels.js')

# --------------------------------------------------------------------------------------------
# Tabela das fases (do plano docs/GATINHO-DESENHO.md). W x H = colunas x linhas.
# --------------------------------------------------------------------------------------------
def _s(**k):
    return k


#            tamanho         cães rastr. ratinhos novelos camund. T  ~  saída  alcance do "!" (do cachorrinho)
SPEC = {
    1:  _s(W=25, H=18, dogs=1, trk=0, rations=5,  bones=0, balls=0, T=0, water=0, eside='R', alert=2,
           place="Sala de estar", note="andar, pegar os ratinhos e fugir do cão da casa"),
    2:  _s(W=25, H=18, dogs=2, trk=0, rations=7,  bones=2, balls=1, T=0, water=0, eside='L', alert=4,
           place="Cozinha e despensa", note="novelos que dão poder e arrancada com fôlego"),
    3:  _s(W=25, H=18, dogs=2, trk=0, rations=7,  bones=2, balls=1, T=1, water=2, eside='R', alert=6,
           place="Quintal dos fundos", note="pular obstáculos, poças molham o pelo e a árvore é lugar a salvo"),
    4:  _s(W=41, H=29, dogs=3, trk=0, rations=15, bones=2, balls=2, T=2, water=3, eside='L', alert=8,
           place="Jardim e varal", note="primeira fase grande: é preciso fazer pontos mínimos"),
    5:  _s(W=41, H=29, dogs=3, trk=0, rations=20, bones=2, balls=2, T=4, water=0, eside='T', alert=10,
           place="Telhados e muros", note="caminhos de gato nos telhados que o cão não faz"),
    6:  _s(W=49, H=33, dogs=3, trk=0, rations=24, bones=3, balls=3, T=2, water=2, eside='R', alert=11,
           place="Beco da cidade", note="ruas estreitas, lixeiras para pular e poças de chuva"),
    7:  _s(W=49, H=37, dogs=4, trk=0, rations=28, bones=3, balls=3, T=2, water=3, eside='L', alert=12,
           place="Feira livre", note="barracas e caixotes na feira, com mais cães"),
    8:  _s(W=55, H=39, dogs=5, trk=0, rations=32, bones=4, balls=3, T=3, water=5, eside='B', alert=13,
           place="Peixaria e mercado", note="muita água no chão: cuidado com o pelo molhado"),
    9:  _s(W=55, H=39, dogs=5, trk=0, rations=36, bones=4, balls=3, T=5, water=6, eside='R', alert=14,
           place="Parque e lago", note="árvores para subir, lago e canteiros"),
    10: _s(W=55, H=41, dogs=6, trk=0, rations=40, bones=5, balls=3, T=4, water=2, eside='L', alert=15,
           place="Armazém de grãos", note="corredores de prateleiras onde os ratos vivem"),
    11: _s(W=57, H=41, dogs=5, trk=2, rations=44, bones=5, balls=4, T=4, water=4, eside='R', alert=16,
           place="Celeiro e curral", note="cães rastreadores e a missão de pegar todos os novelos"),
    12: _s(W=57, H=41, dogs=5, trk=3, rations=46, bones=5, balls=4, T=4, water=4, eside='B', alert=16,
           place="Horta e galinheiro", note="mais ratinhos, mais pontos e a missão dos 34 ratinhos"),
    13: _s(W=57, H=43, dogs=6, trk=3, rations=48, bones=6, balls=4, T=7, water=3, eside='L', alert=17,
           place="Borda da mata", note="muitas árvores para subir e cães rastreadores no mato"),
    14: _s(W=57, H=43, dogs=6, trk=4, rations=50, bones=6, balls=4, T=4, water=8, eside='R', alert=17,
           place="Riacho e pedras", note="travessia com água: vaus rasos e pedras para pular"),
    15: _s(W=59, H=43, dogs=6, trk=4, rations=52, bones=6, balls=4, T=4, water=5, eside='T', alert=18,
           place="Vila de pescadores", note="redes e barcos para pular nas ruas de areia"),
    16: _s(W=59, H=45, dogs=7, trk=5, rations=54, bones=7, balls=5, T=5, water=7, eside='L', alert=18,
           erange=(0.15, 0.5), place="Docas do porto", note="contêineres para subir e cais molhado"),
    17: _s(W=61, H=45, dogs=7, trk=5, rations=56, bones=7, balls=5, T=3, water=8, eside='R', alert=19,
           erange=(0.12, 0.6), place="Praia e dunas", note="areia aberta: poucos abrigos"),
    18: _s(W=61, H=45, dogs=7, trk=6, rations=58, bones=7, balls=5, T=8, water=0, eside='B', alert=19,
           place="Telhados à noite", note="noite nos telhados: visão reduzida e muitos lugares altos"),
    19: _s(W=61, H=45, dogs=8, trk=6, rations=60, bones=8, balls=5, T=5, water=6, eside='R', alert=20,
           place="Mercado à noite", note="noite e chuva no mercado"),
    20: _s(W=63, H=47, dogs=8, trk=7, rations=62, bones=8, balls=5, T=6, water=6, eside='L', alert=20,
           place="A casa grande", note="tudo junto: a volta ao lar"),
}
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
EXTRA = {1: [1, 1], 2: [1, 2], 3: [1, 2], 4: [3, 3], 5: [4, 4]}      # as outras: [3, 4]
CATSPEED = {1: 0.8, 3: 0.9}                                           # as outras: 1

# Sementes escolhidas (a primeira semente válida e bonita de cada fase; veja --search). Mude aqui e rode --all --write.
SEEDS = {1: 11, 2: 4, 3: 11, 4: 19, 5: 23, 6: 14, 7: 4, 8: 18, 9: 19, 10: 4, 11: 0, 12: 1, 13: 1, 14: 5, 15: 6, 16: 8, 17: 14, 18: 41, 19: 6, 20: 18}


def spec_of(n):
    sp = dict(SPEC[n])
    sp['n'] = n
    return sp


def spec_of(n):
    sp = dict(SPEC[n])
    sp['n'] = n
    return sp


# --------------------------------------------------------------------------------------------
# Geração
# --------------------------------------------------------------------------------------------
def generate(n, seed):
    """devolve (M final, problemas, extras)"""
    import cat_styles
    sp = spec_of(n)
    rng = random.Random(n * 100003 + seed * 7919 + 17)
    w, h = (sp['H'], sp['W']) if sp['eside'] in 'BT' else (sp['W'], sp['H'])
    m = M(w, h)
    pick_exit(m, rng, *sp.get('erange', (0.2, 0.8)))
    try:
        info = cat_styles.STYLES[n](m, rng, sp) or {}
        connect_pockets(m, rng)
        place_posts(m, rng, dict(sp), info.get('pband'))
    except Invalid as e:
        return None, ['estilo: %s' % e], {}
    rows = transform(m.rows(), sp['eside'])
    fm = to_m(rows)
    errs = validate(fm, sp)
    return fm, errs, info


def metrics(m, sp):
    a = analyze(m)
    free = sum(1 for r in m.rows() for c in r if c != '#')
    a['floor'] = free / (m.W * m.H)
    return a


def search(n, a, b, quiet=False):
    sp = spec_of(n)
    good = []
    for sd in range(a, b):
        m, errs, _ = generate(n, sd)
        if m is None or errs:
            if not quiet:
                print('  semente %3d  X  %s' % (sd, '; '.join(errs)[:150]))
            continue
        me = metrics(m, sp)
        print('  semente %3d  OK  P->E cão %d gato %d  disjuntos %d  chão %.0f%%  postos(cão) min %d' % (sd, me['pe_dog'], me['pe_cat'], me['disjoint'], 100 * me['floor'], min(me['post_dog'])))
        good.append(sd)
    return good


# --------------------------------------------------------------------------------------------
# Diferença entre mapas (mesma regra do teste): mesmo tamanho = no máximo 60% de tiles iguais na mesma posição;
# tamanhos diferentes já são mapas diferentes, e na janela comum (canto de cima à esquerda) valem no máximo 80%.
# --------------------------------------------------------------------------------------------
SAME_MAX, WINDOW_MAX = 0.60, 0.80
SHORTCUT_LEVELS = (5, 14, 18)      # telhados e riacho: cercas e pedras X dão atalhos que só o gatinho faz


def dog_maps():
    """os 20 mapas do cachorrinho (lidos de js/game.js; não são alterados)"""
    import re
    src = open(os.path.join(ROOT, 'js', 'game.js'), encoding='utf-8').read()
    out = {}
    for n in range(1, 21):
        body = re.search(r'const MAP_%d = (\[[\s\S]*?\]);' % n, src).group(1)
        out[n] = re.findall(r'"([^"]+)"', body)
    return out


def compare(a, b):
    """(fração igual, mesmo tamanho?)"""
    same = len(a) == len(b) and len(a[0]) == len(b[0])
    return same_fraction(a, b), same


def too_alike(a, b):
    f, same = compare(a, b)
    return f > (SAME_MAX if same else WINDOW_MAX)


def pick(per_level=8, max_seed=60, only=None):
    """acha as sementes: válidas, com o mínimo de caminhos separados, e o mais diferentes possível dos mapas já escolhidos e dos do cachorrinho"""
    dog = dog_maps()
    chosen = {}
    for n in range(1, 21):
        sp = spec_of(n)
        if only and n not in only:                       # (fica com a semente que já está em SEEDS)
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
            worst = 0.0
            for o in list(chosen.values()) + list(dog.values()):
                f, same = compare(rows, o)
                worst = max(worst, f if same else f - 0.2)         # (tamanhos diferentes: o limite é 80%, não 60%)
            shortcut = 0 if (n not in SHORTCUT_LEVELS or me['pe_dog'] - me['pe_cat'] >= 3) else 1     # fases com caminhos que só o gatinho faz (X): o gatinho tem de ganhar passos
            key = (0 if me['disjoint'] >= 2 else 1, shortcut, round(worst, 3), -me['disjoint'])
            if best is None or key < best[0]:
                best = (key, sd, rows)
        if best is None:
            raise SystemExit('Fase %d: nenhuma semente válida em %d' % (n, max_seed))
        chosen[n] = best[2]
        print('  Fase %2d: semente %2d  (pior semelhança %.1f%%, %d candidatas)' % (n, best[1], 100 * best[0][2], len(cands)))
        SEEDS[n] = best[1]
    print('SEEDS =', json.dumps({k: v for k, v in sorted(SEEDS.items())}))


# --------------------------------------------------------------------------------------------
# Saída: js/cat-levels.js
# --------------------------------------------------------------------------------------------
def level_def(n, rows):
    sp = spec_of(n)
    return {
        'id': n, 'title': 'Fase %d' % n, 'place': sp['place'], 'note': sp['note'], 'like': n,
        'size': [sp['W'], sp['H']], 'dogs': sp['dogs'], 'trackers': sp['trk'],
        'rations': sp['rations'], 'bones': sp['bones'], 'boneMix': MIX.get(n, ['scare'] * sp['bones']),
        'balls': sp['balls'], 'extraLives': EXTRA.get(n, [3, 4]), 'catSpeed': CATSPEED.get(n, 1),
        'special': {'T': sp['T'], 'water': sp['water']}, 'seed': SEEDS[n], 'map': rows,
    }


JS_HEAD = '''// Os 20 MAPAS E DADOS DAS FASES DO GATINHO (0.18.0). ARQUIVO GERADO por tools/catmaze/gen_cat.py (não edite à mão): `python3 tools/catmaze/gen_cat.py --all --write`.
// Uso: window.CatLevels (navegador) ou require("./js/cat-levels.js") (Node) = uma lista com as 20 definições, em ordem (CatLevels[0] = Fase 1).
// Cada definição: { id, title, place (lugar), note (novidade da fase), like (fase do CACHORRINHO cuja configuração de inimigos e regras o motor copia: velocidade e esperteza dos cães,
//   alcance do "!", perda por vida, pontos mínimos, bônus, vidas máximas, missão, intervalo de bônus), size [colunas, linhas], dogs (postos V), trackers (postos R, Fases 11 a 20),
//   rations (ratinhos), bones (novelos), boneMix (tipo de cada novelo: "scare" comum, "gold" escudo, "ice" cães congelados, "turbo" arrancada sem cansar, "magnet" ímã de ratinhos),
//   balls (camundongos ágeis), extraLives [mín, máx], catSpeed (fração de 252 px/s), special { T: grupos de lugar alto (1 a 3 tiles cada), water: grupos de poça (2 a 10 tiles cada) },
//   seed (semente do gerador), map (linhas ASCII) }.
// Legenda do mapa: # parede | . chão | P início (1) | V posto de cão de guarda | R posto de cão rastreador | E saída (3 tiles na borda)
//   X obstáculo baixo (o gatinho pula, os cães não) | T lugar alto (o gatinho entra e fica a salvo; os cães não entram) | ~ poça (chão para todos; molha o gatinho).
// Ratinhos, novelos e camundongos NÃO estão no mapa: o motor os sorteia em chão livre ('.'), como as rações do cachorrinho.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CatLevels = api;
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


def write_js(levels):
    body = json.dumps(levels, ensure_ascii=False, indent=1)
    with open(JS_OUT, 'w', encoding='utf-8') as f:
        f.write(JS_HEAD + body + JS_TAIL)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--level', type=int)
    ap.add_argument('--seed', type=int)
    ap.add_argument('--print', action='store_true')
    ap.add_argument('--search', nargs=2, type=int)
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--pick', action='store_true')
    ap.add_argument('--per', type=int, default=8)
    ap.add_argument('--max-seed', dest='max_seed', type=int, default=60)
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
        write_js(lv)
        print('escrito', JS_OUT)
    elif a.pick:
        pick(a.per, a.max_seed, [int(v) for v in a.only.split(',')] if a.only else None)
    elif a.check:
        lv = build_all()
        dog = dog_maps()
        bad = 0
        for i in range(20):
            for j in range(i + 1, 20):
                if too_alike(lv[i]['map'], lv[j]['map']):
                    bad += 1
                    print('Fases %d e %d: %.0f%% iguais' % (i + 1, j + 1, 100 * compare(lv[i]['map'], lv[j]['map'])[0]))
            for j in range(20):
                if too_alike(lv[i]['map'], dog[j + 1]):
                    bad += 1
                    print('Fase %d do Gatinho e Fase %d do Cachorrinho: %.0f%% iguais' % (i + 1, j + 1, 100 * compare(lv[i]['map'], dog[j + 1])[0]))
        print('pares parecidos demais:', bad)
        sys.exit(1 if bad else 0)
    else:
        ap.print_help()


if __name__ == '__main__':
    main()
