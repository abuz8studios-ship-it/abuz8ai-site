import json, urllib.request

with urllib.request.urlopen("http://127.0.0.1:8188/object_info", timeout=15) as r:
    info = json.load(r)

cn = info["ControlNetLoader"]["input"]["required"]["control_net_name"][0]
print("ControlNet models:", cn)
ck = info["CheckpointLoaderSimple"]["input"]["required"]["ckpt_name"][0]
print("Checkpoints:", ck)
