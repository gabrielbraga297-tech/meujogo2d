#!/usr/bin/env python3
"""Monta o jogo num ÚNICO arquivo HTML (CSS e scripts embutidos), para publicar como página.
Uso: python3 tools/publish/build-artifact.py <saida.html> [codigo-curto-do-commit]
  - troca `build: "dev"` de js/version.js pelo código curto do commit (padrão: `git rev-parse --short HEAD`);
  - embute css/style.css e cada <script src="js/..."> na ordem do index.html (e protege qualquer "</script" dentro do código);
  - falha se sobrar algum link relativo para css/ ou js/ (a página tem que andar sozinha)."""
import re, subprocess, sys, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
out = pathlib.Path(sys.argv[1])
sha = sys.argv[2] if len(sys.argv) > 2 else subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=root, text=True).strip()
html = (root / 'index.html').read_text(encoding='utf-8')

def css(m):
    return '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', css, html)

def js(m):
    code = (root / m.group(1)).read_text(encoding='utf-8')
    if m.group(1) == 'js/version.js':
        assert 'build: "dev"' in code, 'js/version.js sem build: "dev"'
        code = code.replace('build: "dev"', f'build: "{sha}"', 1)
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)

left = re.findall(r'(?:src|href)="((?:css|js)/[^"]+)"', html)
if left: sys.exit('sobraram links relativos: ' + ', '.join(left))
out.write_text(html, encoding='utf-8')
print(f'{out} ({len(html) / 1024:.0f} KB, build {sha})')
