p = r"E:\ABU\abuz8ai-site\tools\ai-background-remover-pro.html"
t = open(p, encoding="utf-8", errors="replace").read()
n = t.count("ABUZ8 LIVE STUDIO (injected")
print("injection markers:", n)
print("comfy-studio.js refs:", t.count("_comfy-studio.js"))
print("size:", len(t))
