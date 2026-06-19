#!/usr/bin/env python3
"""Orquestra pause/restore de projetos Supabase via Management API."""
import base64
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.supabase.com"


def token() -> str:
    raw = subprocess.run(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-a", "supabase", "-w"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    if raw.startswith("go-keyring-base64:"):
        return base64.b64decode(raw.split(":", 1)[1]).decode()
    return raw


def api(method: str, path: str, data=None):
    headers = {
        "Authorization": f"Bearer {token()}",
        "Content-Type": "application/json",
        "User-Agent": "SupabaseCLI/2.106.0",
    }
    body = json.dumps(data).encode() if data is not None else (b"{}" if method != "GET" else None)
    req = urllib.request.Request(f"{API}{path}", method=method, headers=headers, data=body)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def status(ref: str) -> str:
    code, data = api("GET", f"/v1/projects/{ref}")
    if code != 200:
        raise RuntimeError(f"status {ref}: HTTP {code} {data}")
    return data.get("status", "UNKNOWN")


def wait_status(ref: str, target: set[str], timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        s = status(ref)
        print(f"  {ref}: {s}")
        if s in target:
            return s
        time.sleep(15)
    raise TimeoutError(f"{ref} não atingiu {target} em {timeout}s (último: {s})")


def main():
    action = sys.argv[1]
    ref = sys.argv[2] if len(sys.argv) > 2 else None

    if action == "pause":
        code, data = api("POST", f"/v1/projects/{ref}/pause")
        print(json.dumps({"code": code, "data": data}, indent=2))
        sys.exit(0 if code == 200 else 1)
    if action == "restore":
        code, data = api("POST", f"/v1/projects/{ref}/restore")
        print(json.dumps({"code": code, "data": data}, indent=2))
        sys.exit(0 if code == 200 else 1)
    if action == "wait":
        targets = set(sys.argv[3].split(","))
        wait_status(ref, targets)
        return
    if action == "status":
        print(status(ref))
        return
    print("Uso: migrate.py pause|restore|wait|status <ref> [targets]")
    sys.exit(1)


if __name__ == "__main__":
    main()
