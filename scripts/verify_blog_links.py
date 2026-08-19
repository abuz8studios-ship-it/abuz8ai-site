import os, re
T = r"E:\ABU\abuz8ai-site\tools"; B = r"E:\ABU\abuz8ai-site\blog"
real = {f[:-5] for f in os.listdir(T) if f.endswith(".html")}
pat = re.compile(r'href="(?:\.\./|/)tools/([A-Za-z0-9_-]+)\.html')
bad = [(f, s) for f in os.listdir(B) if f.endswith(".html")
       for s in pat.findall(open(os.path.join(B, f), encoding="utf-8").read())
       if s not in real]
print("DEAD:", len(bad), bad)
