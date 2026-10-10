"""G6: read live public GitHub Pages, verify same-release real FX and CPI."""
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
        fxjs = read(session, "fx.js", release)
        lifemath = read(session, "life_math.js", release)
        lifeui = read(session, "life.js", release)
        remote_manifest = read(session, "data/manifest.json", release).json()
        data = read(session, "data/cpi.json", release).json()
        fxdata = read(session, "data/fx.json", release).json()
    if not ("台灣生活費" in home.text and "site" not in BASE):
        # The content check is mandatory, but the URL may contain arbitrary subpaths.
        if "台灣生活費" not in home.text:
            raise RuntimeError("Site HTML not the expected senior-friendly dashboard")
    if 'id="living"' not in home.text or 'id="lifeChart"' not in home.text or 'data-life-mode="twd"' not in home.text:
        raise RuntimeError("The integrated senior purchasing-power home page is missing")
    if "LifeMath" not in lifemath.text or "purchasingChange" not in lifeui.text or 'fx.release_id' not in lifemath.text + lifeui.text and 'meta.fx?.release_id' not in lifeui.text:
        raise RuntimeError("Household FX + CPI model scripts are missing")
    if 'id="fxChart"' not in home.text or 'id="fxRanks"' not in home.text:
        raise RuntimeError("FX UI missing from public homepage")
    if "H.10" not in fxjs.text or "renderReal" not in fxjs.text:
        raise RuntimeError("Live eight-currency comparison script missing")
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
    meta=expected.get("fx", {})
    if meta.get("status")!="VERIFIED_H10":
        raise RuntimeError("Federal Reserve FX not verified in public manifest")
    if fxdata.get("release_id")!=meta.get("release_id"):
        raise RuntimeError("H.10 FX release mismatch")
    body=dict(fxdata)
    body.pop("release_id")
    check=hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True, separators=(",",":")).encode()).hexdigest()
    if check!=fxdata["release_id"]:
        raise RuntimeError("FX daily series checksum mismatch")
    if fxdata.get("columns") != ["date","USD","JPY","EUR","CNY","GBP","AUD","KRW","SGD"]:
        raise RuntimeError("Eight currency columns incorrect")
    if len(fxdata.get("daily", []))<2300 or len(fxdata.get("monthly", {}))<120:
        raise RuntimeError("10-year H10 daily and monthly coverage not present")
    if set(fxdata.get("anchors", {}))!={"6","12","36","60","120"}:
        raise RuntimeError("Missing actual five-period FX comparison")
    if fxdata.get("as_of")!=meta.get("last_observed_date"):
        raise RuntimeError("Observation date mismatch")
    if len(fxdata["daily"])!=meta.get("common_daily_rows"):
        raise RuntimeError("Daily rows in manifest differ")
    from datetime import date
    age=(date.today()-date.fromisoformat(fxdata["as_of"])).days
    if age<0 or age>18:
        raise RuntimeError("Stale FX trading date: "+str(age)+" days")
    for row in (fxdata["daily"][0],fxdata["daily"][-1]):
        if len(row)!=9 or any(not isinstance(x,(int,float)) or x<=0 for x in row[1:]):
            raise RuntimeError("Invalid daily FX numerical rates")
    print("G6 VERIFIED H10 FX",fxdata["as_of"],"shared days",len(fxdata["daily"]),
          "full months",len(fxdata["monthly"]))
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
