import io, unittest
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts.update_fx import SERIES, CODES, parse_h10, derive, subtract_months

class OfficialH10MathTests(unittest.TestCase):
    def test_direction_and_same_day(self):
        parsed = {k: {} for k in SERIES}
        d = date(2016, 1, 4)
        while d <= date(2026, 10, 2):
            if d.weekday() < 5:
                ds = d.isoformat()
                from decimal import Decimal
                for k, val in (("TWD","32"), ("JPY","160"), ("EUR","1.2"),
                               ("CNY","8"), ("GBP","1.4"), ("AUD","0.7"),
                               ("KRW","1280"), ("SGD","1.2")):
                    parsed[k][ds] = Decimal(val)
            d += timedelta(days=1)
        rows, monthly, anchors, lag = derive(parsed, today=date(2026, 10, 10))
        dct=dict(zip(["date"]+list(CODES),rows[-1]))
        self.assertEqual(dct["USD"],32.0)
        self.assertEqual(dct["JPY"],0.2)
        self.assertEqual(dct["EUR"],38.4)
        self.assertEqual(dct["CNY"],4.0)
        self.assertEqual(dct["GBP"],44.8)
        self.assertEqual(dct["AUD"],22.4)
        self.assertEqual(dct["KRW"],0.025)
        self.assertAlmostEqual(dct["SGD"], 32/1.2)
        self.assertEqual(lag,8)
        self.assertEqual(set(anchors), {"6","12","36","60","120"})
        self.assertIn("2026M09",monthly)
        self.assertNotIn("2026M10",monthly)
        del parsed["JPY"]["2026-10-02"]
        rows, months, anchors, lag = derive(parsed, today=date(2026,10,10))
        self.assertNotEqual(rows[-1][0],"2026-10-02")
    def test_month_clip(self):
        self.assertEqual(subtract_months("2026-03-31",1),"2026-02-28")
        self.assertEqual(subtract_months("2026-10-02",120),"2016-10-02")
    def test_reject_unverified_currencies(self):
        import decimal
        xml = "<root>"+''.join(
            '<Series CURRENCY="%s" FREQ="9" SERIES_NAME="%s"><Obs OBS_STATUS="A" OBS_VALUE="2" TIME_PERIOD="2026-10-01"/></Series>'
            %(v[1],v[0]) for v in SERIES.values())+"</root>"
        parsed,dt = parse_h10(io.BytesIO(xml.encode()))
        self.assertEqual(set(parsed),set(SERIES))
        broken=xml.replace('CURRENCY="TWD"','CURRENCY="EUR"',1)
        with self.assertRaises(ValueError):parse_h10(io.BytesIO(broken.encode()))

if __name__=="__main__":unittest.main()
