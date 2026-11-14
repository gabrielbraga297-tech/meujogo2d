#!/usr/bin/env python3
"""Monta docs/biologia/referencias.json: as referências da «Biologia por trás» que FORAM abertas e conferidas (0.24.0).
Para cada DOI da lista abaixo busca os dados no Crossref (autores, ano, periódico, volume, número, páginas) e no Europe PMC (PMID, PMCID, acesso aberto), confere que o título e o ano batem com o esperado
e grava, ao lado, o que a pessoa que leu o RESUMO concluiu que o artigo sustenta e o que NÃO sustenta. NADA aqui é lido do texto completo: o `nivel` de todas é "resumo" (o resumo foi aberto no Europe PMC e conferido).
Uso:  python3 tools/biology/build_refs.py            (busca na rede e regrava o JSON; falha se algum DOI não bate com o título esperado)
      python3 tools/biology/build_refs.py --offline   (só confere o JSON que já existe, sem rede)"""
import json, re, sys, urllib.parse, urllib.request, time, pathlib, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs/biologia/referencias.json"
CHECKED = "2026-11-07"

# id, doi, trecho esperado no título, jogos, características do jogo, o que o resumo sustenta, o que NÃO sustenta (limites)
SPEC = [
 ("herbst2023", "10.1016/j.cub.2023.09.014", "purring frequencies", ["cat"], ["Sons"],
  "Laringes excisadas de oito gatos domésticos produziram oscilações autossustentadas nas frequências fundamentais do ronronar, de 25 a 30 Hz, sem estímulo neural: o ronronar é um som de frequência muito baixa (o ronronar do jogo usa pulsos de cerca de 26 Hz).",
  "Não diz nada sobre o miado, sobre filhotes nem sobre o que o gato sente. O jogo só imita a frequência do ronronar; a duração, o volume e a mistura com outros sons são escolha de design. Acesso fechado: só o resumo foi lido."),
 ("russo2025", "10.1038/s41598-025-31536-7", "Meows encode less individual information", ["cat"], ["Sons"],
  "Em gatos domésticos o miado e o ronronar têm papéis de comunicação diferentes: o miado é variável e depende do contexto, e o ronronar é estereotipado e de baixa frequência (276 miados de 14 gatos e 557 ronronares de 21 gatos).",
  "Não mede filhote x adulto nem o som que o jogo sintetiza. Que o miado do jogo mude com a fase da vida é escolha de design."),
 ("lepczyk2023", "10.1038/s41467-023-42766-6", "free-ranging domestic cat diet", ["cat", "bird"], ["Presas (Gatinho)", "Gatos de quintal (Passarinho)"],
  "Síntese global da dieta de gatos de vida livre: 2.084 espécies comidas; aves, répteis e mamíferos somam cerca de 90% delas; cerca de 9% das aves conhecidas aparecem na dieta; 97% das espécies comidas pesam menos de 5 kg. Gatos são predadores generalistas de presas pequenas.",
  "É sobre gatos de vida livre (inclusive em ilhas), não sobre gatos de quintal em geral nem sobre ratinhos e novelos de jogo. As quantidades do jogo não vêm daqui."),
 ("castaneda2023", "10.3390/ani13223507", "Hunting Behaviour in France", ["cat", "bird"], ["Presas (Gatinho)", "Gatos de quintal (Passarinho)"],
  "Em 5.048 gatos acompanhados na França (projeto de ciência cidadã, 2015 a 2022), as presas trazidas para casa (36.568) foram 68% mamíferos, 21% aves e 8% répteis escamados; gatos mais jovens traziam mais musaranhos, aves e répteis.",
  "Conta só as presas trazidas para casa, num país; não diz como um gato caça nem a que velocidade. Os números do jogo são escolha de design."),
 ("hirsch2025", "10.3390/ani15223233", "Cats in a Cat Café", ["cat"], ["Lugar alto (T)"],
  "Num café de gatos sueco (27 gatos castrados, 227 h de observação) as estruturas elevadas foram importantes, principalmente quando havia muitos clientes: os gatos preferiam os níveis verticais ou salas só deles; os autores recomendam ambientes verticais complexos e esconderijos.",
  "É um café de gatos, não a rua nem um quintal; não mostra que um gato em cima de algo fique a salvo de um cão (o jogo faz os cães esperarem 4 s e desistirem: escolha de design)."),
 ("gollnick2023", "10.1177/1098612x231178140", "foreign bodies in cats", ["cat"], ["Novelo (precaução)"],
  "Corpos estranhos gastrointestinais (lineares e outros) são uma causa importante de cirurgia de emergência em gatos; no estudo de 56 gatos operados na Universidade da Geórgia, os com corpo estranho linear tiveram mais infecção do local da cirurgia que os com corpo estranho único.",
  "Não diz que novelo ou fio foi o objeto em cada caso. O aviso do README («fio e novelo soltos podem ser perigosos») é uma precaução coerente com o estudo, não uma conclusão dele."),
 ("pongracz2024", "10.1016/j.isci.2024.110799", "Cats are (almost) liquid", ["cat"], ["Obstáculo baixo (X)"],
  "Em 30 gatos de companhia, aberturas cada vez mais baixas ou estreitas foram atravessadas mesmo as mais estreitas, mas os gatos diminuíam a velocidade antes e durante a passagem pelas aberturas mais baixas; os autores falam em tentativa e erro e em noção do tamanho do corpo.",
  "O gato passa SOB e por aberturas; o jogo faz o gatinho PULAR as caixas «X». Só o tema (gatos e passagens baixas) tem ligação; a regra do jogo é escolha de design."),
 ("jensen2022", "10.3390/ani12141748", "Roaming Companion Cats in Denmark", ["cat"], ["Ambientes das 20 fases (uso do espaço)"],
  "97 gatos de companhia com acesso à rua foram seguidos por GPS por cerca de 7 dias na Dinamarca: ficavam fora de casa 5 h por dia (mediana), andavam 2,4 km por dia e tinham área de uso de 5 ha; gatos com acesso a áreas de natureza se afastavam mais e a chuva forte reduzia a distância andada (de 3,6 para 2,4 km por dia).",
  "É sobre gatos de companhia dinamarqueses. Não diz nada sobre pelo molhado nem sobre poças; a lentidão ao pisar numa poça é escolha de design."),
 ("kowalczyk2026", "10.3390/ani16030427", "Role of Olfaction in Dogs", ["cat"], ["Cães rastreadores"],
  "Revisão: cães têm sensibilidade olfativa excepcional e são usados em trabalhos de busca e rastreamento (médicos, resgate, militares, forenses); o desempenho depende da anatomia nasal e também de motivação e persistência.",
  "É uma revisão sobre olfato e trabalho de cães. O «ouvido» dos rastreadores do jogo e a velocidade deles são escolhas de design."),
 ("cymerman2026", "10.3390/ani16040627", "Eurasian Sparrowhawk", ["bird"], ["Gaviões"],
  "O gavião-europeu (Eurasian Sparrowhawk), predador generalista, tem como principais presas aves pequenas e médias de floresta (tordo-músico, melro, tentilhão, chapim-real, pisco-de-peito-ruivo); em 2024 as presas foram identificadas por restos de penas, e a migração do gavião acompanha a das presas.",
  "É sobre migração de primavera numa península da Polônia, não sobre caça em quintal; a IA dos gaviões do jogo (ouvir, antecipar, procurar) e as velocidades são escolhas de design."),
 ("macias2026", "10.1242/jeb.252390", "Flight energetics of barn swallows", ["bird"], ["Bater asas com fôlego"],
  "Andorinhas voando em túnel de vento entre 7,8 e 13,6 m/s gastaram energia metabólica numa curva em U em função da velocidade: voar tem custo de energia que depende de como se voa, e a eficiência de converter energia em trabalho de voo é baixa (pico de 7%).",
  "Não fala em «fôlego», em arrancada nem em tempo de recuperação. A barra de fôlego do passarinho (×1,35 por 2,5 s) é escolha de design; daqui só vem a ideia de que voar custa energia."),
 ("andries2025", "10.1098/rspb.2025.1839", "change with age in a granivorous songbird", ["bird"], ["Crescimento (filhote → jovem → adulto)"],
  "Canários domésticos jovens e adultos filmados por dois anos: a habilidade de manejar sementes melhora com a idade e o desempenho de alimentação muda com a maturação; ou seja, ao crescer a ave fica mais hábil.",
  "No jogo o crescimento só muda o desenho, o tamanho e o piu, e não a habilidade; o paralelo é só de tema. Acesso fechado: só o resumo foi lido."),
 ("he2026", "10.1002/ece3.72554", "Nocturnal Roosting", ["bird"], ["Galhos (abrigo)", "Entardecer e noite"],
  "Num campus universitário chinês, aves dormiam à noite em árvores de copa densa e muita ocultação, nas pontas dos galhos longe do tronco; no verão ficavam mais dispersas e no outono e inverno se concentravam na vertical.",
  "É sobre onde aves dormem numa cidade, não sobre ficar a salvo de gatos de dia. Que os inimigos esperem 4 s e desistam, e a escuridão com halo nas Fases 18 e 19, são escolhas de design."),
]
# conferidas (resumo lido) mas que NÃO sustentam nenhum traço do jogo: ficam registradas para ninguém repetir a busca
SEM_APOIO = [
 ("rutovskaya2024", "10.1016/j.beproc.2024.105009", "protesting cries of domestic kittens", ["cat"],
  "Gritos de protesto de gatinhos de 2 semanas variam com o peso do corpo (a frequência fundamental sobe com o peso) e não previram a sobrevivência. Não compara filhote com adulto, então não sustenta que o miado do filhote do jogo seja diferente do do adulto."),
 ("veenstra2026", "10.1098/rsos.260667", "vibrations induced by moving earthworms", ["bird"],
  "As vibrações de minhocas se movendo são detectadas melhor em solo mais úmido (medidas com geofone). Não diz nada sobre fuga de minhoca nem sobre aves caçando; não sustenta a regra das minhocas do jogo."),
 ("kasprzykowski2026", "10.7717/peerj.21506", "perch-site choice in shrikes", ["bird"],
  "Em picanços, a distância de fuga e a escolha do poleiro dependem da proximidade de estradas e construções (perturbação humana). Não é sobre abrigo contra gatos nem sobre galhos como refúgio."),
 ("massenet2025", "10.1098/rstb.2024.0022", "puppy whines", ["dog"],
  "Em 12.011 gritos de filhotes de Beagle separados da mãe, fenômenos acústicos não lineares aparecem mais com o tempo de separação, o que os autores ligam a excitação maior. Não compara filhote com adulto, então não sustenta o latido agudo de filhote e grave de adulto do jogo. Acesso fechado: só o resumo foi lido."),
 ("dunford2024", "10.1002/ece3.11380", "Identifying animal behaviours from accelerometers", ["cat"],
  "Sobre acurácia de aprendizado de máquina com acelerômetros. Não consegui confirmar a pista antiga «Dunford et al. 2024, Animal Biotelemetry 12» (GPS, chuva e cobertura); o artigo de 2024 de mesmo primeiro autor que achei é este, e nada dele sustenta o jogo."),
]
# pistas antigas (busca de 22 a 29/10/2026) que NÃO foram achadas no Europe PMC nem no Crossref com os dados que a pista trazia
NAO_ENCONTRADAS = [
 "Schötz, van de Weijer & Eklund (2023/24), Applied Animal Behaviour Science 270 (contexto e miados): não encontrado com esses dados",
 "Chijiiwa et al. (2025), Scientific Reports 15 (convivência cão-gato): não encontrado com esses dados",
 "Higurashi et al. (2026), Anatomical Record (corpo e frestas): não encontrado com esses dados",
 "Huels et al. (2026), Integrative Zoology (ratos em galpões): não encontrado com esses dados",
]
def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "meujogo2d-biology-check/1.0"}), timeout=40) as r: return json.loads(r.read().decode("utf-8", "replace"))
        except Exception as e:
            if k == tries - 1: raise
            time.sleep(2 * (k + 1))
def build():
    def meta(rid, doi, frag):
        c = get("https://api.crossref.org/works/" + urllib.parse.quote(doi))["message"]
        title = re.sub(r"<[^>]+>", "", (c.get("title") or [""])[0])
        if frag.lower() not in title.lower(): sys.exit(f"{rid}: o título do DOI {doi} é {title!r} e não contém {frag!r}")
        year = (c.get("issued", {}).get("date-parts") or [[0]])[0][0]
        if not (2021 <= year <= 2026): sys.exit(f"{rid}: ano {year} fora de 2021 a 2026")
        e = get("https://www.ebi.ac.uk/europepmc/webservices/rest/search?" + urllib.parse.urlencode({"query": f'DOI:"{doi}"', "format": "json", "resultType": "core"}))["resultList"]["result"]
        e = (sorted(e, key=lambda x: not x.get("pmcid"))[0]) if e else {}
        authors = [f"{a.get('family','')} {''.join(p[0] for p in re.split(r'[ .-]+', a.get('given','')) if p)}".strip() for a in c.get("author", [])]
        time.sleep(0.4)
        return {"id": rid, "authors": authors, "year": year, "title": title, "journal": (c.get("container-title") or [""])[0], "volume": c.get("volume", ""), "issue": c.get("issue", ""),
                "pages": c.get("page") or c.get("article-number") or "", "doi": doi, "pmid": e.get("pmid", ""), "pmcid": e.get("pmcid", ""), "open_access": e.get("isOpenAccess") == "Y",
                "peer_reviewed": True, "level": "resumo", "checked_on": CHECKED}
    refs = []
    for rid, doi, frag, games, traits, ok, limits in SPEC:
        r = meta(rid, doi, frag); r.update({"games": games, "traits": traits, "supports": ok, "limits": limits}); refs.append(r)
    semap = []
    for rid, doi, frag, games, why in SEM_APOIO:
        r = meta(rid, doi, frag); r.update({"games": games, "why": why}); semap.append(r)
    OUT.write_text(json.dumps({"about": "Referências abertas e conferidas (resumo) para a «Biologia por trás» dos bichinhos. Veja tools/biology/build_refs.py e o README.", "refs": refs, "sem_apoio": semap, "nao_encontradas": NAO_ENCONTRADAS}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{OUT}: {len(refs)} referências")
def check():
    d = json.loads(OUT.read_text(encoding="utf-8")); refs = d["refs"]; ids = [r["id"] for r in refs]
    assert ids == [s[0] for s in SPEC], "o JSON não corresponde à lista de tools/biology/build_refs.py"
    for r in refs:
        assert 2021 <= r["year"] <= 2026 and r["doi"].startswith("10.") and r["level"] in ("resumo", "texto completo") and r["peer_reviewed"] and r["checked_on"] and r["supports"] and r["limits"] and r["authors"], r["id"]
    for r in d["sem_apoio"]: assert r["id"] and r["doi"].startswith("10.") and r["why"] and 2021 <= r["year"] <= 2026, r["id"]
    assert [r["id"] for r in d["sem_apoio"]] == [x[0] for x in SEM_APOIO] and d["nao_encontradas"] == NAO_ENCONTRADAS
    print(f"ok: {len(refs)} referências com apoio, {len(d['sem_apoio'])} sem apoio, {len(d['nao_encontradas'])} não encontradas")
if __name__ == "__main__": check() if "--offline" in sys.argv else (build(), check())
