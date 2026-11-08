import base64, json, os, subprocess, sys
import urllib.request

REPO = "shrcyy/gswz-site"
BASE = r"C:\Users\HP\Doubao\chats\2026-11-05\new-chat-1\gswz-portal"
EXCLUDE_DIRS = {"_check", ".git", "_deploy"}
EXCLUDE_FILES = {"_check_js.py", "_check_js.py.bak"}

token = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, encoding="utf-8").stdout.strip()
if not token:
    print("NO_TOKEN")
    sys.exit(1)


def api(method, path, payload=None):
    url = "https://api.github.com" + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "gswz-portal-deploy")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode("utf-8"))


files = []
for root, dirs, fns in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for fn in fns:
        if fn in EXCLUDE_FILES:
            continue
        p = os.path.join(root, fn)
        rel = os.path.relpath(p, BASE).replace("\\", "/")
        files.append((rel, p))

files.sort()
print("FILES:", len(files))
for rel, _ in files:
    print("  ", rel)

tree = []
for rel, p in files:
    raw = open(p, "rb").read()
    b = api("POST", f"/repos/{REPO}/git/blobs",
            {"content": base64.b64encode(raw).decode("ascii"), "encoding": "base64"})
    tree.append({"path": rel, "mode": "100644", "type": "blob", "sha": b["sha"]})
    print("blob ok", rel, b["sha"][:8])

new_tree = api("POST", f"/repos/{REPO}/git/trees", {"tree": tree})
head = api("GET", f"/repos/{REPO}/git/ref/heads/main")
parent = head["object"]["sha"]
msg = "rebuild: 第二版站点（对外展示 + 成员登录上传归档 + 手册降级为资料）"
commit = api("POST", f"/repos/{REPO}/git/commits",
             {"message": msg, "tree": new_tree["sha"], "parents": [parent]})
api("PATCH", f"/repos/{REPO}/git/refs/heads/main", {"sha": commit["sha"], "force": True})
print("COMMIT", commit["sha"])
print("DONE")
