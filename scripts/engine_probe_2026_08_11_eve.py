import os, subprocess, glob

print("=== ComfyUI install ===")
for c in [r"E:\ABU\ComfyUI", r"E:\ABU\QADIR_CORE\ComfyUI"]:
    print(c, "exists:", os.path.isdir(c), "| main.py:", os.path.exists(os.path.join(c,"main.py")))

up = r"E:\ABU\ComfyUI\models\upscale_models"
print("\n=== upscale_models ===", up, os.path.isdir(up))
if os.path.isdir(up):
    f = [x for x in os.listdir(up) if not x.startswith('.')]
    print("  files:", f if f else "EMPTY")

print("\n=== python processes ===")
out = subprocess.run(["tasklist","/FI","IMAGENAME eq python.exe","/FO","CSV"],
                     capture_output=True, text=True).stdout
print(out.strip()[:1500])

print("\n=== listening ports of interest ===")
n = subprocess.run(["netstat","-ano","-p","TCP"], capture_output=True, text=True).stdout
for ln in n.splitlines():
    if any(p in ln for p in [":8188",":11434",":4200"]) and "LISTEN" in ln:
        print("  ", ln.strip())
else:
    pass
print("  (none listed above == all down)")

print("\n=== launcher scripts ===")
for pat in [r"E:\ABU\ComfyUI\*.bat", r"E:\ABU\*.bat", r"E:\ABU\ComfyUI\run*.py"]:
    for g in glob.glob(pat)[:12]:
        print("  ", g)
