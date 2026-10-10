"""DGBAS monthly CPI ETL; no fabricated values, no TLS bypass, no FX redistribution."""
import csv, hashlib, io, json, re, sys, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"site"/"data"
CAT=json.loads((ROOT/"config"/"cpi_catalog.json").read_text(encoding="utf-8"))
URL="https://ws.dgbas.gov.tw/001/Upload/461/relfile/11525/230543/pr0101a3m.xml"
BASE=re.compile(r"[（(]指數基期：([^()）]+)[）)]")
PERIOD=re.compile(r"^20\d\dM(0[1-9]|1[0-2])$")
def parse(payload):
    if len(payload)>55000000 or b"<!DOCTYPE" in payload.upper() or b"<!ENTITY" in payload.upper():
        raise ValueError("CPI XML size/DTD unsafe")
    if payload[:200].lstrip().lower().startswith((b"<html", b"<!doctype html")): raise ValueError("HTML is not XML")
    wanted={v["name"]:k for k,v in CAT["items"].items()}
    result={k:{"label":v["label"],"base":None,"observations":{},"seasonal":v.get("seasonal",False)} for k,v in CAT["items"].items()}
    count=0
    for ev,elem in ET.iterparse(io.BytesIO(payload),events=("end",)):
        if elem.tag.rsplit("}",1)[-1]!="Obs": continue
        f={child.tag.rsplit("}",1)[-1]:(child.text or "").strip() for child in elem}
        elem.clear();count+=1
        if f.get("TYPE")!="原始值" or f.get("FREQ")!="M" or not PERIOD.fullmatch(f.get("TIME_PERIOD","")): continue
        raw=f.get("Item",""); bases=BASE.findall(raw)
        item=BASE.sub("",raw).strip()
        if item not in wanted: continue
        if len(bases)!=1 or "110年" not in bases[0]: raise ValueError("Unknown CPI base "+raw)
        k=wanted[item];value=f.get("Item_VALUE","")
        try: v=float(value)
        except ValueError: continue
        if not (0<v<100000): continue
        r=result[k]
        if r["base"] and r["base"]!=bases[0]: raise ValueError("Mixed CPI bases")
        r["base"]=bases[0]
        month=f["TIME_PERIOD"]
        if month in r["observations"]: raise ValueError("Duplicate CPI item/month")
        r["observations"][month]=value
    if count<100: raise ValueError("Unexpected CPI observation count")
    filtered={}
    for k,v in result.items():
        if v["observations"]:
            months=sorted(v["observations"])
            if len(months)<120: raise ValueError("Not enough months for "+k)
            v["observations"]=dict(sorted(v["observations"].items()))
            filtered[k]=v
    if not filtered: raise ValueError("No allowed CPI items")
    return filtered

def build(payload):
    items=parse(payload)
    output={"schema":"v1","dataset":"DGBAS 9158","source":"https://data.gov.tw/dataset/9158","type":"CPI_ITEM_INDEX","items":items}
    canonical=json.dumps(output,ensure_ascii=False,sort_keys=True,separators=(",",":"))
    version=hashlib.sha256(canonical.encode()).hexdigest()
    output["release_id"]=version
    manifest={"schema":"v1","release_id":version,"status":"CPI_ONLY_FX_LICENSE_PENDING","cpi":{"last_observed_month":max(max(o["observations"]) for o in items.values()),"source":"https://data.gov.tw/dataset/9158","sha256":hashlib.sha256(payload).hexdigest()},"fx":{"status":"LICENSE_PENDING"},"retail":{"status":"NOT_VERIFIED"}}
    return output,manifest

def run():
    response=requests.get(URL,timeout=60,headers={"User-Agent":"TWD-Living-Cost/0.1"},allow_redirects=False)
    response.raise_for_status()
    if "text/html" in response.headers.get("Content-Type","").lower(): raise ValueError("CPI HTML error body")
    if not response.content.strip().startswith(b"<") and not response.content.strip().startswith(b"\xef\xbb\xbf<"): raise ValueError("Not XML")
    data,manifest=build(response.content)
    DATA.mkdir(parents=True,exist_ok=True)
    prior=DATA/"cpi.json"
    if prior.exists() and json.loads(prior.read_text(encoding="utf-8")).get("release_id")==data["release_id"]:
        print("No new observation. "+data["release_id"][:12]);return
    for name,obj in [("cpi.json",data),("manifest.json",manifest)]:
        (DATA/name).write_text(json.dumps(obj,ensure_ascii=False,sort_keys=True,indent=2)+"\n",encoding="utf-8")
    print("Official CPI update: "+manifest["cpi"]["last_observed_month"])

if __name__=="__main__":
    run()
