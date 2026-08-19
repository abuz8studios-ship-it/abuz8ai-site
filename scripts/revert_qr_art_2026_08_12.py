import shutil, os

TOOLS = r"E:\ABU\abuz8ai-site\tools"
target = os.path.join(TOOLS, "ai-qr-art-pro.html")
bak = os.path.join(TOOLS, "ai-qr-art-pro.html.bak-2026-08-11-studio")

before = os.path.getsize(target)
shutil.copy2(bak, target)
after = os.path.getsize(target)
print(f"Reverted ai-qr-art-pro.html: {before} -> {after} bytes (bak was {os.path.getsize(bak)})")
