"""Official U.S. Federal Reserve Board H.10 daily FX -> TWD cross-rates.

Source: https://www.federalreserve.gov/datadownload/Output.aspx?filetype=zip&rel=H10
H.10: https://www.federalreserve.gov/releases/h10/
Federal Reserve copyright notice: https://www.federalreserve.gov/disclaimer.htm
No FRED API key, no commercial quote provider, no hidden browser-side fetch.

All 8 exchange series must be from the SAME observation date. Never forward-fill,
interpolate, or mix H.10 with commercial / Taiwan-bank buy/sell quotes.
"""
import bisect
import hashlib
import io
import json
import math
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
URL = "https://www.federalreserve.gov/datadownload/Output.aspx?filetype=zip&rel=H10"
H10 = "https://www.federalreserve.gov/releases/h10/"
SERIES = {
    "TWD": ("RXI_N.B.TA", "TWD", "quote-per-USD"),
    "JPY": ("RXI_N.B.JA", "JPY", "quote-per-USD"),
    "CNY": ("RXI_N.B.CH", "CNY", "quote-per-USD"),
    "KRW": ("RXI_N.B.KO", "KRW", "quote-per-USD"),
    "SGD": ("RXI_N.B.SI", "SGD", "quote-per-USD"),
    "EUR": ("RXI$US_N.B.EU", "EUR", "USD-per-quote"),
    "GBP": ("RXI$US_N.B.UK", "GBP", "USD-per-quote"),
    "AUD": ("RXI$US_N.B.AL", "AUD", "USD-per-quote"),
}
CODES = ("USD", "JPY", "EUR", "CNY", "GBP", "AUD", "KRW", "SGD")
DAYS = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_h10(source):
    """Stream the official SDMX XML, selecting the *eight exact daily* series."""
    found = {}
    release_prepared = None
    for event, elem in ET.iterparse(source, events=("end",)):
        tag = elem.tag.rsplit("}", 1)[-1]
        if tag == "Prepared" and release_prepared is None:
            release_prepared = (elem.text or "").strip()
        if tag != "Series":
            continue
        attrs = elem.attrib
        for code, (series_name, currency, quote) in SERIES.items():
            if attrs.get("SERIES_NAME") != series_name:
                continue
            if attrs.get("CURRENCY") != currency or attrs.get("FREQ") != "9":
                raise ValueError("Unexpected H.10 source series metadata: " + series_name)
            if code in found:
                raise ValueError("Duplicate H.10 FX series: " + code)
            observations = {}
            for child in elem:
                if child.tag.rsplit("}", 1)[-1] != "Obs":
                    continue
                d = child.attrib.get("TIME_PERIOD", "")
                raw = child.attrib.get("OBS_VALUE", "")
                if not DAYS.fullmatch(d) or child.attrib.get("OBS_STATUS") not in ("A", "P"):
                    continue
                try:
                    value = Decimal(raw)
                except (ValueError, InvalidOperation):
                    continue
                if not value.is_finite() or value <= 0:
                    continue
                if d in observations:
                    raise ValueError("Duplicate source observation: " + series_name + " " + d)
                observations[d] = value
            found[code] = observations
        elem.clear()
    if set(found) != set(SERIES):
        raise ValueError("Missing H.10 series: " + ", ".join(sorted(set(SERIES)-set(found))))
    return found, release_prepared


def subtract_months(iso_day, months):
    y, m, d = map(int, iso_day.split("-"))
    index = y * 12 + m - 1 - months
    ty, tm = divmod(index, 12)
    tm += 1
    import calendar
    return "%04d-%02d-%02d" % (ty, tm, min(d, calendar.monthrange(ty, tm)[1]))


def derive(parsed, today=None):
    """Compute only exact same-day H.10 cross-rates, with 10y period coverage."""
    if today is None:
        today = date.today()
    dates = sorted(set.intersection(*(set(parsed[code]) for code in SERIES)))
    if not dates:
        raise ValueError("No common observation dates")
    latest = date.fromisoformat(dates[-1])
    if latest > today:
        raise ValueError("H.10 observed future date")
    lag = (today-latest).days
    if lag > 18:
        raise ValueError("H.10 source is stale (%d days)" % lag)
    if lag < 0 or len(dates) < 2400:
        raise ValueError("Not enough H.10 daily coverage")
    first = subtract_months(dates[-1], 123)
    dates = [d for d in dates if d >= first]
    rows = []
    for d in dates:
        twd = parsed["TWD"][d]
        rates = {"USD": twd}
        for code in CODES[1:]:
            val = parsed[code][d]
            rates[code] = twd * val if SERIES[code][2] == "USD-per-quote" else twd / val
        if any(not v.is_finite() or v <= 0 for v in rates.values()):
            raise ValueError("Invalid cross conversion " + d)
        rows.append([d] + [round(float(rates[c]), 8) for c in CODES])
    day_keys = [row[0] for row in rows]
    coverage = {}
    for n in (6, 12, 36, 60, 120):
        target = subtract_months(dates[-1], n)
        idx = bisect.bisect_right(day_keys, target) - 1
        if idx < 0:
            raise ValueError("Period anchor unavailable " + str(n))
        if (date.fromisoformat(target)-date.fromisoformat(day_keys[idx])).days > 10:
            raise ValueError("Period anchor too far " + str(n))
        coverage[str(n)] = {"start": day_keys[idx], "end": dates[-1]}
    sums = defaultdict(lambda: [0.0]*len(CODES))
    counts = defaultdict(int)
    for row in rows:
        month = row[0][:7]
        for i, val in enumerate(row[1:]):
            sums[month][i] += val
        counts[month] += 1
    # H10 weekly source may stop early in an active month; do not call it a full monthly average.
    latest_month = dates[-1][:7]
    monthly = {}
    for month, total in sums.items():
        if month >= latest_month or counts[month] < 12:
            continue
        monthly[month.replace("-", "M")] = [round(v / counts[month], 8) for v in total]
    if len(monthly) < 120:
        raise ValueError("Fewer than 120 complete FX months")
    return rows, dict(sorted(monthly.items())), coverage, lag


def process_archive(archive, today=None):
    if len(archive) > 40000000:
        raise ValueError("Archive too large")
    with zipfile.ZipFile(io.BytesIO(archive)) as z:
        info = z.getinfo("H10_data.xml")
        if info.file_size > 90000000:
            raise ValueError("Uncompressed H10 too large")
        with z.open(info) as xml:
            parsed, prepared = parse_h10(xml)
    rows, monthly, anchors, lag = derive(parsed, today)
    obj = {
        "schema": "h10-fx-v1",
        "dataset": "U.S. Federal Reserve H.10 daily reference rates",
        "description": "TWD per one unit of currency; New York noon reference, not a Taiwanese bank buy/sell quote.",
        "columns": ["date", *CODES],
        "daily": rows,
        "monthly": monthly,
        "anchors": anchors,
        "source": H10,
        "as_of": rows[-1][0],
        "release_prepared": prepared,
    }
    canonical = json.dumps(obj, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    release = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    obj["release_id"] = release
    meta = {
        "status": "VERIFIED_H10",
        "release_id": release,
        "last_observed_date": rows[-1][0],
        "coverage_start": rows[0][0],
        "common_daily_rows": len(rows),
        "complete_months": len(monthly),
        "source": H10,
        "source_zip_sha256": hashlib.sha256(archive).hexdigest(),
        "source_prepared": prepared,
        "expected_frequency": "Federal Reserve H.10 generally released weekly",
        "reference_only": True,
    }
    return obj, meta


def run():
    response = requests.get(URL, timeout=95, headers={"User-Agent":"TWD-Living-Cost/1.0 (+https://github.com/t14210184/twd-living-cost)"})
    response.raise_for_status()
    if not response.content.startswith(b"PK"):
        raise ValueError("H.10 server returned non-ZIP content")
    fx, meta = process_archive(response.content)
    manifest_path = DATA/"manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["fx"] = meta
    manifest["status"] = "CPI_AND_OFFICIAL_FX_VERIFIED_RETAIL_PENDING"
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA/"fx.json").write_text(json.dumps(fx, ensure_ascii=False, separators=(",",":"))+"\n",encoding="utf-8")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True)+"\n",encoding="utf-8")
    print("H.10 FX VERIFIED",meta["last_observed_date"],meta["common_daily_rows"],"days,",meta["complete_months"],"complete months, lag",meta["last_observed_date"])


if __name__ == "__main__":
    run()
