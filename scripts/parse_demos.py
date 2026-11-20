import sys, re, json
from html.parser import HTMLParser
class T(HTMLParser):
    def __init__(s):
        super().__init__(); s.tables=[]; s.cur=None; s.row=None; s.cell=None
    def handle_starttag(s, tag, a):
        if tag=='table': s.cur=[]; s.tables.append(s.cur)
        elif tag=='tr' and s.cur is not None: s.row=[]; s.cur.append(s.row)
        elif tag in ('td','th') and s.row is not None: s.cell=[]
    def handle_endtag(s, tag):
        if tag in ('td','th') and s.cell is not None: s.row.append(' '.join(''.join(s.cell).split())); s.cell=None
    def handle_data(s, d):
        if s.cell is not None: s.cell.append(d)
p=T(); p.feed(open(sys.argv[1], encoding='utf-8', errors='replace').read())
best=max(p.tables, key=len)
print('Tabellen:', len(p.tables), '| Zeilen größte Tabelle:', len(best))
print('Kopf:', best[0])
rows=[r for r in best[1:] if len(r)>=6]
dates=sorted({r[0] for r in rows}, key=lambda d: (d[6:10], d[3:5], d[0:2]))
print('Zeitraum:', dates[0], '–', dates[-1], '| Einträge:', len(rows))
json.dump([dict(zip(['datum','von','bis','thema','plz','ort','strecke'], r[:7])) for r in rows], open(sys.argv[2],'w'), ensure_ascii=False)
