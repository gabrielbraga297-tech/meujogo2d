#!/usr/bin/env python3
"""Põe o código curto do commit no endereço de cada script e do CSS do index.html, para o navegador nunca montar uma versão nova com um arquivo velho guardado (0.23.0).
Uso: python3 tools/publish/cache-bust.py <pasta-do-site> <codigo-do-commit>
  js/game.js  ->  js/game.js?v=abc1234        css/style.css  ->  css/style.css?v=abc1234
Só mexe nas linhas <script src="js/..."> e <link rel="stylesheet" href="css/...">; rodar de novo com o mesmo código não muda nada; falha se o código não for hexadecimal de 7 a 40 letras,
se o index.html não existir ou se sobrar algum js/ ou css/ sem o selo."""
import re, sys, pathlib
if len(sys.argv) != 3: sys.exit(__doc__)
site, sha = pathlib.Path(sys.argv[1]), sys.argv[2]
if not re.fullmatch(r"[0-9a-f]{7,40}", sha): sys.exit(f"código de commit inválido: {sha!r}")
f = site / "index.html"
if not f.is_file(): sys.exit(f"não achei {f}")
html = f.read_text(encoding="utf-8")
def stamp(m):
    url = re.sub(r"\?v=[0-9a-f]+$", "", m.group(2))
    return f'{m.group(1)}"{url}?v={sha}"'
html = re.sub(r'(<script src=)"(js/[^"]+)"', stamp, html)
html = re.sub(r'(<link rel="stylesheet" href=)"(css/[^"]+)"', stamp, html)
left = [u for u in re.findall(r'(?:<script src|<link rel="stylesheet" href)="((?:js|css)/[^"]+)"', html) if not u.endswith("?v=" + sha)]
if left: sys.exit("sem selo: " + ", ".join(left))
f.write_text(html, encoding="utf-8")
print(f"{f}: {len(re.findall(r'[?]v=' + sha, html))} endereços com ?v={sha}")
