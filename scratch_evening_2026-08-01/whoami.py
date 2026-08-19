import io, sys, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
try:
    p = subprocess.run(["npx","wrangler","whoami"], cwd=r"E:\ABU\abuz8ai-site",
                       capture_output=True, timeout=90, shell=True)
    out = (p.stdout or b"").decode("utf-8","ignore") + (p.stderr or b"").decode("utf-8","ignore")
    for line in out.splitlines():
        low = line.lower()
        if any(k in low for k in ["account","email","oauth","token","scope","pages","logged","you are","wireconn","2bd9"]):
            print(line.strip()[:140])
    print("VERDICT:", "AUTHED" if ("pages" in out.lower() or "you are logged in" in out.lower()) else "UNCLEAR")
except Exception as e:
    print("ERR:", e)
