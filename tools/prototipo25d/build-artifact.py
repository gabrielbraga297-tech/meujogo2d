#!/usr/bin/env python3
"""Monta o Teste 01 de adaptação (teste-01-adaptacao/) num ÚNICO arquivo HTML (CSS e scripts embutidos), para publicar como página à parte.
Uso: python3 tools/prototipo25d/build-artifact.py <saida.html>
  - embute ../css/style.css, teste.css e cada <script src> (../js/... e game25d.js) na ordem do index.html (protege qualquer "</script" dentro do código);
  - NÃO mexe em js/version.js: o teste não é uma versão do jogo (o `build` fica "dev", então nunca pergunta por atualização);
  - falha se sobrar algum link relativo (a página tem que andar sozinha)."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
base = root / 'teste-01-adaptacao'
out = pathlib.Path(sys.argv[1])
html = (base / 'index.html').read_text(encoding='utf-8')

def css(m):
    return '<style>\n' + (base / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+\.css)">', css, html)

def js(m):
    code = (base / m.group(1)).read_text(encoding='utf-8')
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"]+\.js)"></script>', js, html)

left = re.findall(r'(?:src|href)="((?:\.\./)?(?:css|js)/[^"]+|game25d\.js|teste\.css)"', html)
if left: sys.exit('sobraram links relativos: ' + ', '.join(left))
out.write_text(html, encoding='utf-8')
print(f'{out} ({len(html) / 1024:.0f} KB)')
