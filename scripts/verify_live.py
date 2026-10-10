"""G6: independently read the public Pages site; check exact release and real CPI."""
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("SITE_URL", "https://t14210184.github.io/twd-living-cost/").rstrip("/") + "/"

def read(session, name, release):
    url = urljoin(BASE, name)
    response = session.get(url, timeout=20, params={"release": release})
    response.raise_for_status()
    return response

def verify_once():
    expected = json.loads((ROOT/"site"/"data"/"manifest.json").read_text(encoding="utf-8"))
    release = expected["release_id"]
    with requests.Session() as session:
        home = read(session, "", release)
        app = read(session, "app.js", release)
        remote_manifest = read(session, "data/manifest.json", release).json()
        data = read(session, "data/cpi.json", release).json()
    if not ("台灣生活費" in home.text and "site" not in BASE):
        # The content check is mandatory, but the URL may contain arbitrary subpaths.
        if "台灣生活費" not in home.text:
            raise RuntimeError("Site HTML not the expected senior-friendly dashboard")
    if "function render" not in app.text:
        raise RuntimeError("Frontend JavaScript missing or not current")
    if remote_manifest != expected:
        raise RuntimeError("Pages manifest differs from this build")
    if data.get("release_id") != release:
        raise RuntimeError("Pages CPI is not same release as manifest")
    content = dict(data)
    content.pop("release_id")
    sha = hashlib.sha256(json.dumps(content, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode("utf-8")).hexdigest()
    if sha != release:
        raise RuntimeError("CPI content checksum mismatch")
    items = data.get("items", {})
    if not all(x in items for x in ("rice", "eggs", "rent", "water", "electricity", "gas")):
        raise RuntimeError("Critical living-necessity items missing")
    for name, record in items.items():
        history = record.get("observations", {})
        if len(history) < 120 or history.get(expected["cpi"]["last_observed_month"]) is None:
            raise RuntimeError("Incomplete history or stale item " + name)
    if expected.get("fx", {}).get("status") != "LICENSE_PENDING":
        raise RuntimeError("Source licensing status unexpectedly changed")
    print("G6 LIVE READBACK PASS", BASE)
    print("Official CPI month:", expected["cpi"]["last_observed_month"], "item count:", len(items))
    print("Release sha256:", release)

if __name__ == "__main__":
    last = None
    for attempt in range(1,9):
        try:
            verify_once()
            break
        except Exception as ex:
            last = ex
            print("Pages readback not ready", attempt, str(ex))
            if attempt == 8:
                raise SystemExit("G6 FAIL: " + str(last))
            time.sleep(8)
