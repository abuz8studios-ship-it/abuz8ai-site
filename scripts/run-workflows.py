#!/usr/bin/env python
"""
run-workflows.py — execute candidate ComfyUI workflows and record what ACTUALLY produced a file.

WHY THIS EXISTS
The store sold 28 products whose fulfilment PDFs turned out to be children's
picture books, and a "ComfyUI 77 Workflows" SKU whose archived set was mostly
1-node template stubs. Nothing goes back on sale on the strength of a JSON file
existing. A workflow counts as real only if this script submits it to a live
ComfyUI and gets an output file back.

"Every model is present on disk" is NOT the bar - that is the same error class as
treating a route literal as a working handler. The bar is: it ran, it wrote a
file, the file is non-trivial.

Usage:
  python scripts/run-workflows.py --validate      # submit-only: catch missing models/inputs fast
  python scripts/run-workflows.py --run           # full execution, waits for outputs
  python scripts/run-workflows.py --run --only ABU_T2I_Flux_API
"""

import json, os, sys, time, urllib.request, urllib.error, uuid, argparse

HOST = "http://127.0.0.1:8188"
ROOT = r"E:\ABU"
OUT = os.path.join(ROOT, "abuz8ai-site", "scratchpad", "workflow-run")
os.makedirs(OUT, exist_ok=True)

# The 13 whose every referenced model resolved on disk. API-format ones can be
# POSTed straight to /prompt; UI-format ones are what a buyer drag-drops into the
# web UI and need conversion before they can be driven headlessly.
CANDIDATES = [
    ("ComfyUI/user/default/workflows/ABU_T2I_Flux_API.json",              "api"),
    ("ComfyUI/user/default/workflows/ABU_I2I_FluxKontext_API.json",       "api"),
    ("ComfyUI/user/default/workflows/ABU_PostProcess_RIFE_Upscale_API.json","api"),
    ("ComfyUI/workflows/manga_funny_video.json",                          "api"),
    ("ComfyUI/user/default/workflows/ABU_I2V_Wan22_Lightx2v_API.json",    "api"),
    ("ComfyUI/user/default/workflows/ABU_LTX23_T2V_API.json",             "api"),
    ("ComfyUI/user/default/workflows/ABU_LTX23_I2V_API.json",             "api"),
    ("ComfyUI/user/default/workflows/03_video_wan2_2_14B_i2v_subgraphed.json","ui"),
    ("ComfyUI/user/default/workflows/ABU_60sec_Wan22_I2V_Chunk.json",     "ui"),
    ("ComfyUI/user/default/workflows/ABU_PostProcess_RIFE_Upscale.json",  "ui"),
    ("ComfyUI/user/default/workflows/flux1_krea_dev.json",                "ui"),
    ("ComfyUI/workflows/KNOWN_GOOD_audio_acestep_t2music.json",           "ui"),
    ("ComfyUI/workflows/zai_building_garage.json",                        "ui"),
]


def post(path, payload):
    req = urllib.request.Request(
        HOST + path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"raw": body[:600]}
    except Exception as e:
        return 0, {"error": str(e)}


def get(path):
    try:
        with urllib.request.urlopen(HOST + path, timeout=60) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)}


def why(resp):
    """Turn ComfyUI's validation payload into one readable line."""
    bits = []
    ne = resp.get("node_errors") or {}
    for nid, err in list(ne.items())[:4]:
        for d in (err.get("errors") or [])[:2]:
            ex = d.get("extra_info", {}) or {}
            got = ex.get("received_value")
            bits.append(f"node{nid}:{d.get('message','?')}" + (f"={got}" if got else ""))
    if not bits and resp.get("error"):
        e = resp["error"]
        bits.append(e.get("message", str(e)) if isinstance(e, dict) else str(e))
    return "; ".join(bits)[:260] or json.dumps(resp)[:200]


def run(path, kind, execute):
    name = os.path.basename(path)
    abs_p = os.path.join(ROOT, path.replace("/", os.sep))
    if not os.path.exists(abs_p):
        return dict(name=name, kind=kind, verdict="MISSING_FILE", detail=abs_p)

    graph = json.load(open(abs_p, encoding="utf8"))
    if kind == "ui":
        # Not convertible here. This is a real finding, not a skip: it means the
        # file cannot be driven programmatically as shipped.
        return dict(name=name, kind=kind, verdict="UI_FORMAT",
                    detail="graph is UI-format; loadable in the web UI, not POSTable to /prompt")

    cid = str(uuid.uuid4())
    code, resp = post("/prompt", {"prompt": graph, "client_id": cid})
    if code != 200:
        return dict(name=name, kind=kind, verdict="REJECTED", http=code, detail=why(resp))

    pid = resp.get("prompt_id")
    if not execute:
        return dict(name=name, kind=kind, verdict="ACCEPTED", detail=f"queued {pid} (validate-only)")

    # Poll history until this prompt reports completion.
    t0 = time.time()
    LIMIT = 900  # 15 min per workflow
    while time.time() - t0 < LIMIT:
        h = get(f"/history/{pid}")
        if isinstance(h, dict) and pid in h:
            entry = h[pid]
            st = entry.get("status", {}) or {}
            outs, files = entry.get("outputs", {}) or {}, []
            for nid, o in outs.items():
                for key in ("images", "gifs", "videos", "audio", "files"):
                    for f in (o.get(key) or []):
                        fn = f.get("filename")
                        if not fn:
                            continue
                        sub = f.get("subfolder") or ""
                        typ = f.get("type") or "output"
                        disk = os.path.join(ROOT, "ComfyUI", typ, sub, fn)
                        files.append(dict(file=fn, kind=key,
                                          bytes=os.path.getsize(disk) if os.path.exists(disk) else None,
                                          path=disk if os.path.exists(disk) else None))
            secs = round(time.time() - t0, 1)
            if not st.get("completed", True) or st.get("status_str") == "error":
                msg = ""
                for m in (st.get("messages") or []):
                    if isinstance(m, list) and len(m) > 1 and m[0] == "execution_error":
                        msg = str(m[1].get("exception_message", ""))[:220]
                return dict(name=name, kind=kind, verdict="RUNTIME_ERROR", secs=secs, detail=msg)
            if files:
                return dict(name=name, kind=kind, verdict="PRODUCED_OUTPUT", secs=secs, outputs=files)
            return dict(name=name, kind=kind, verdict="NO_OUTPUT", secs=secs,
                        detail="completed but wrote no file")
        time.sleep(5)
    return dict(name=name, kind=kind, verdict="TIMEOUT", secs=LIMIT)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", action="store_true")
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--only")
    a = ap.parse_args()
    execute = a.run

    todo = [c for c in CANDIDATES if not a.only or a.only.lower() in c[0].lower()]
    print(f"ComfyUI {HOST} | {len(todo)} workflows | mode={'RUN' if execute else 'VALIDATE'}\n")

    results = []
    for p, k in todo:
        print(f"-> {os.path.basename(p)[:52]:54}", end="", flush=True)
        r = run(p, k, execute)
        results.append(r)
        line = r["verdict"]
        if r.get("secs"):
            line += f" ({r['secs']}s)"
        if r.get("outputs"):
            line += " " + ", ".join(f"{o['file']}({o['bytes']}B)" for o in r["outputs"][:2])
        print(line)
        if r.get("detail"):
            print(f"     {r['detail']}")

    stamp = time.strftime("%Y%m%d-%H%M%S")
    dest = os.path.join(OUT, f"run-{'exec' if execute else 'validate'}-{stamp}.json")
    json.dump(results, open(dest, "w", encoding="utf8"), indent=2)

    from collections import Counter
    print("\n" + "=" * 62)
    for v, n in Counter(r["verdict"] for r in results).most_common():
        print(f"  {v:18} {n}")
    print(f"\nwritten: {dest}")


if __name__ == "__main__":
    main()
