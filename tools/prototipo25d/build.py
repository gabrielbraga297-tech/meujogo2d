#!/usr/bin/env python3
"""Gera teste-01-adaptacao/ (index.html e game25d.js) a partir do jogo de verdade (index.html e js/game.js), SEM mexer neles.

O "Teste 01 de adaptação" é UMA fase do Cachorrinho (a Fase 2) em 2,5D, numa pasta separada. Este script copia o jogo e troca só o necessário:
cada troca abaixo tem o trecho de origem (que precisa existir UMA vez, senão o script para) e o trecho novo. A lista é o registro do que o 2,5D mudou.
Uso: python3 tools/prototipo25d/build.py            (grava os arquivos)
     python3 tools/prototipo25d/build.py --check    (só confere que os arquivos gravados são os que o script geraria; sai com 1 se não forem)"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "teste-01-adaptacao"
PART = (pathlib.Path(__file__).resolve().parent / "render25d.part.js").read_text(encoding="utf-8")

# ---- game.js: [(motivo, de, para)] ----
JS = [
    ("altura das paredes (px) e espaço a mais em cima da tela para o topo da parede de cima aparecer",
     "  const VIEW_W = VIEW_COLS * TILE, VIEW_H = VIEW_ROWS * TILE;",
     "  const H25 = 6;                                       // (teste 01 de adaptação, 2,5D) altura das paredes em px; o mapa ganha esse espaço a mais em cima. Com 6 px a parede nunca encosta no desenho de uma ração ou de um osso: eles descem até 26 px do quadrado (com o balanço de 2 px) e a parede do quadrado de baixo só cobre a partir de 32 − 6 = 26\n"
     "  const VIEW_W = VIEW_COLS * TILE, VIEW_H = VIEW_ROWS * TILE + H25;"),
    ("o teste não lê nem guarda nada: não mexe no progresso do jogo de verdade",
     "  function safeStorage() { try { return window.localStorage; } catch { return null; } }",
     "  function safeStorage() { return null; } // (teste 01 de adaptação) nada é lido nem guardado: o teste não mexe no progresso do jogo de verdade"),
    ("a tela inicial do teste entra na lista de telas",
     'const SCREENS = ["menu", "animals",',
     'const SCREENS = ["teste01", "menu", "animals",'),
    ("voltar ao menu leva à tela do teste (só esta fase)",
     '    hintTimer = 0; $("toast").classList.remove("show");\n    renderMenu();\n    showScreen("menu");\n',
     '    hintTimer = 0; $("toast").classList.remove("show");\n    showScreen("teste01"); // (teste 01 de adaptação) a tela inicial é a do teste: só esta fase\n'),
    ("o nome da fase de teste (a Fase 1 do Cachorrinho: a mais simples)",
     '{ id: 1, title: "Fase 1", map: MAP_1,',
     '{ id: 1, title: "Teste 01 de adaptação", map: MAP_1,'),
    ("o placar mostra TESTE 01 em vez do número da fase",
     'setHud("lv", hudEl.level, String(levelId));',
     'setHud("lv", hudEl.level, "01"); // (teste 01 de adaptação)'),
    ("não há próxima fase: a tela de vitória só oferece jogar de novo e voltar",
     "const next = levelsOf(gameAnimal).find((l) => l.id === levelId + 1), pw = P();",
     "const next = null, pw = P(); // (teste 01 de adaptação) não há próxima fase"),
    ("a câmera pode subir H25 px acima do mapa (o topo das paredes da borda de cima)",
     "const camY = Math.round(clamp(player.y + player.h / 2 - vh / 2, 0, Math.max(0, WORLD_H - vh)) * sx) / sx;",
     "const camY = Math.round(clamp(player.y + player.h / 2 - vh / 2, -H25, Math.max(-H25, WORLD_H - vh)) * sx) / sx; // (teste 01 de adaptação, 2,5D)"),
    ("as paredes \"#\" deixam de ser desenhadas planas aqui (paint25 desenha em relevo)",
     "if (s.kind === \"#\") theme.wall(g); else theme.crate(g);",
     "if (s.kind === \"#\") continue; theme.crate(g); // (teste 01 de adaptação, 2,5D) as paredes \"#\" são desenhadas em relevo por paint25"),
    ("sombras no chão, depois do chão e antes de tudo o que tem altura",
     "      drawExit(rect);\n    }\n    drawBlocks();",
     "      drawExit(rect);\n      shadows25(c0, c1, r0, r1); // (teste 01 de adaptação, 2,5D)\n    }\n    drawBlocks();"),
    ("itens, bolinhas, agentes, gatos e o cachorrinho entram numa fila e são desenhados com as paredes, do norte para o sul",
     "      for (const it of items) if (!it.taken) (it.bone ? drawBone : drawKibble)(it);\n"
     "      for (const b of balls) if (!b.taken) drawBall(b);\n"
     "      for (const v of vets) drawVet(v);\n"
     "      for (const c of cats) drawCat(c);\n",
     "      { // (teste 01 de adaptação, 2,5D) tudo o que tem altura é desenhado junto com as paredes, do norte para o sul (y = onde pisa)\n"
     "        const q25 = [];\n"
     "        for (const it of items) if (!it.taken) q25.push({ y: it.y + 13, f: () => item25(it) });\n"
     "        for (const b of balls) if (!b.taken) q25.push({ y: b.y + BALL_R, f: () => drawBall(b) });\n"
     "        for (const v of vets) q25.push({ y: v.cy + 12, f: () => drawVet(v) });\n"
     "        for (const c of cats) q25.push({ y: c.cy + 12, f: () => drawCat(c) });\n"
     "        if (!(started && invuln > 0 && !calm && Math.floor(time * 10) % 2 === 0)) q25.push({ y: player.y + player.h / 2 + 10, f: () => drawDog(player) });\n"
     "        paint25(q25, sx, c0, c1, r0, r1);\n"
     "      }\n"),
    ("o cachorrinho já foi desenhado na fila (paint25)",
     "    } else if (!blink) drawDog(player);",
     "    } else if (!blink) { /* (teste 01 de adaptação, 2,5D) o cachorrinho já foi desenhado por paint25, na ordem de profundidade */ }"),
    ("o botão da tela do teste começa a fase",
     "  reset();\n  fitCanvas();\n  if (typeof ResizeObserver",
     "  $(\"btn-t01-play\").addEventListener(\"click\", () => begin(1, { player: \"Teste\" })); // (teste 01 de adaptação) começa a única fase\n  reset();\n  fitCanvas();\n  if (typeof ResizeObserver"),
    ("o módulo do desenho em relevo entra antes do draw()",
     '  function draw() {\n    if (state === "menu" || !solids) return;',
     PART + '  function draw() {\n    if (state === "menu" || !solids) return;'),
]

# ---- index.html ----
SECTION = '''  <!-- Teste 01 de adaptação: a única tela inicial desta página -->
  <section id="teste01" class="screen page" aria-labelledby="t01-title">
    <div class="panel">
      <h1 id="t01-title">Teste 01 de adaptação</h1>
      <p class="muted">Uma fase do Cachorrinho em <strong>2,5D</strong>: o mapa, as regras e os controles são os do jogo; só as paredes ganharam altura, com sombras no chão.</p>
      <p class="muted">Isto é um teste, separado do jogo: nada aqui é salvo e não vale pontos no jogo de verdade.</p>
      <div class="menu-list"><button id="btn-t01-play" type="button" class="primary" data-autofocus>Jogar o teste</button></div>
    </div>
  </section>

'''
HTML = [
    ("título da aba", "<title>Jogo do cachorrinho</title>", "<title>Teste 01 de adaptação</title>"),
    ("estilos: os do jogo e os do teste", '<link rel="stylesheet" href="css/style.css">', '<link rel="stylesheet" href="../css/style.css">\n  <link rel="stylesheet" href="teste.css">'),
    ("placar", 'FASE <b id="hud-level">1</b>', 'TESTE <b id="hud-level">01</b>'),
    ("a tela do teste vem antes do menu", "  <!-- Menu inicial -->\n", SECTION + "  <!-- Menu inicial (não é usado no teste) -->\n"),
]


def swap(text, pairs, what):
    for why, old, new in pairs:
        n = text.count(old)
        if n != 1:
            sys.exit(f"{what}: o trecho de origem aparece {n} vez(es) em vez de 1 ({why}):\n{old[:200]}")
        text = text.replace(old, new, 1)
    return text


def build():
    js = swap((ROOT / "js" / "game.js").read_text(encoding="utf-8"), JS, "js/game.js")
    js = "// GERADO por tools/prototipo25d/build.py a partir de js/game.js: NÃO edite aqui (edite o script ou tools/prototipo25d/render25d.part.js).\n" + js
    html = swap((ROOT / "index.html").read_text(encoding="utf-8"), HTML, "index.html")
    html = re.sub(r'<script src="js/([^"]+)"></script>', lambda m: '<script src="game25d.js"></script>' if m.group(1) == "game.js" else f'<script src="../js/{m.group(1)}"></script>', html)
    left = re.findall(r'(?:src|href)="((?:css|js)/[^"]+)"', html)
    if left:
        sys.exit("sobraram links relativos para o jogo de verdade: " + ", ".join(left))
    return {"index.html": html, "game25d.js": js}


if __name__ == "__main__":
    files = build()
    if "--check" in sys.argv:
        bad = [n for n, t in files.items() if not (OUT / n).exists() or (OUT / n).read_text(encoding="utf-8") != t]
        print("teste-01-adaptacao em dia" if not bad else "desatualizado: " + ", ".join(bad) + " (rode: python3 tools/prototipo25d/build.py)")
        sys.exit(1 if bad else 0)
    OUT.mkdir(exist_ok=True)
    for n, t in files.items():
        (OUT / n).write_text(t, encoding="utf-8")
        print(f"{OUT.relative_to(ROOT)}/{n} ({len(t) / 1024:.0f} KB)")
