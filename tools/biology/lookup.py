#!/usr/bin/env python3
"""Procura e confere artigos para a «Biologia por trás» dos bichinhos (0.24.0). Usa só o Europe PMC (www.ebi.ac.uk) e o Crossref (api.crossref.org).
Uso:
  python3 tools/biology/lookup.py search "consulta" [n]     lista os n (padrão 5) artigos de 2021 a 2026 mais relevantes, com resumo
  python3 tools/biology/lookup.py doi 10.xxxx/yyyy          mostra o registro de um DOI (Europe PMC e Crossref) e se o texto completo é aberto
  python3 tools/biology/lookup.py fulltext PMCxxxx [trecho] baixa o texto completo aberto (PMC) e mostra os parágrafos que contêm o trecho
Nada daqui decide sozinho: quem lê o resumo (ou o texto) e confere que ele sustenta o que o jogo faz é a pessoa que usa o resultado."""
import json, re, sys, urllib.parse, urllib.request, html
UA = {"User-Agent": "meujogo2d-biology-check/1.0"}
def get(url, timeout=40, tries=4):
    import time, urllib.error
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout) as r: return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and k < tries - 1: time.sleep(2 * (k + 1)); continue
            raise
def epmc(query, n):
    q = f"({query}) AND (PUB_YEAR:[2021 TO 2026]) AND (SRC:MED OR SRC:PMC)"
    u = "https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode({"query": q, "format": "json", "pageSize": n, "resultType": "core"})
    return json.loads(get(u))["resultList"]["result"]
def show(r, abstract=700):
    ab = re.sub(r"<[^>]+>", "", html.unescape(r.get("abstractText", "") or ""))
    print(f"- {r.get('authorString','')[:110]} ({r.get('pubYear')}). {r.get('title','')[:160]}")
    print(f"  {r.get('journalTitle') or r.get('bookOrReportDetails',{}).get('publisher','?')} {r.get('journalVolume','')}({r.get('issue','')}) {r.get('pageInfo','')} | DOI {r.get('doi')} | PMID {r.get('pmid')} | {r.get('pmcid','')} | acesso aberto: {r.get('isOpenAccess')} | tipo: {', '.join(r.get('pubTypeList',{}).get('pubType',[]))[:80]}")
    if abstract: print("  RESUMO:", ab[:abstract])
def main():
    if len(sys.argv) < 3: sys.exit(__doc__)
    cmd, arg = sys.argv[1], sys.argv[2]
    if cmd == "search":
        for r in epmc(arg, int(sys.argv[3]) if len(sys.argv) > 3 else 5): show(r)
    elif cmd == "doi":
        res = json.loads(get("https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode({"query": f'DOI:"{arg}"', "format": "json", "resultType": "core"})))["resultList"]["result"]
        for r in res: show(r, 2500)
        try:
            c = json.loads(get("https://api.crossref.org/works/" + urllib.parse.quote(arg)))["message"]
            print("CROSSREF:", c.get("title"), c.get("container-title"), c.get("volume"), c.get("issue"), c.get("page") or c.get("article-number"), c.get("issued", {}).get("date-parts"), c.get("type"), [a.get("family") for a in c.get("author", [])][:8])
        except Exception as e: print("CROSSREF falhou:", e)
    elif cmd == "fulltext":
        x = get(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{arg}/fullTextXML", 60)
        t = re.sub(r"<[^>]+>", " ", html.unescape(x)); t = re.sub(r"\s+", " ", t)
        print(f"texto completo de {arg}: {len(t)} caracteres")
        if len(sys.argv) > 3:
            for m in re.finditer(sys.argv[3], t, re.I): print("...", t[max(0, m.start() - 300):m.end() + 400], "...\n")
        else: print(t[:3000])
main()
