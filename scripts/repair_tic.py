import json, sys
raw = open(sys.argv[1], encoding="utf-8").read().replace("\f", "\n")
# Umlaute: UTF-8-Bytes wurden als Windows-1252 dargestellt
fixed = []
for line in raw.split("\n"):
    try:
        fixed.append(line.encode("cp1252").decode("utf-8"))
    except (UnicodeEncodeError, UnicodeDecodeError):
        fixed.append(line)
t = "\n".join(fixed)
# Zeilenumbrüche innerhalb von Zeichenketten entfernen (PDF hat lange Werte umbrochen)
out, in_str, esc = [], False, False
for ch in t:
    if in_str:
        if esc: esc = False
        elif ch == "\\": esc = True
        elif ch == '"': in_str = False
        elif ch == "\n":
            ch = " "
    elif ch == '"':
        in_str = True
    out.append(ch)
s = "".join(out)
s = s[s.find("{"):]
d, end = json.JSONDecoder().raw_decode(s)
json.dump(d, open(sys.argv[2], "w"), ensure_ascii=False)
print("Features:", len(d["features"]), "| Rest nach JSON:", len(s[end:].strip()), "Zeichen")
