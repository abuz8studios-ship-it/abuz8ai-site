import re
p = r"E:\ABU\abuz8ai-site\tools\ai-logo-generator-pro.html"
t = open(p, encoding="utf-8", errors="replace").read()

# show the head/link block, the studio container markup skeleton, and the workflow builder
print("=== SCRIPT/LINK TAGS ===")
for m in re.findall(r'<(?:script|link)[^>]*>', t):
    print(" ", m[:160])

print("\n=== ELEMENT IDs / CLASSES in studio ===")
ids = sorted(set(re.findall(r'\bid="([a-zA-Z0-9_-]+)"', t)))
print(" ids:", ids)

print("\n=== WORKFLOW GRAPH (buildWorkflow) ===")
i = t.find("function buildWorkflow")
if i == -1:
    i = t.find("workflow")
print(t[i:i+2600] if i>-1 else "NOT FOUND")

print("\n=== CSS VARS BLOCK ===")
m = re.search(r':root\s*\{(.{0,900}?)\}', t, re.S)
print(m.group(0) if m else "none")
