import sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from scripts.update_cpi import parse, build
class Tests(unittest.TestCase):
  def sample(self):
    item='20雞蛋(指數基期：民國110年=100)'
    periods=['%04dM%02d'%(y,m) for y in range(2013,2027) for m in range(1,13) if (y,m)<=(2026,9)]
    obs=''.join(f'<Obs><Item>{item}</Item><TIME_PERIOD>{p}</TIME_PERIOD><FREQ>M</FREQ><TYPE>原始值</TYPE><Item_VALUE>100</Item_VALUE></Obs>' for p in periods)
    noise='<Obs><Item>'+item+'</Item><TIME_PERIOD>2026M09</TIME_PERIOD><FREQ>M</FREQ><TYPE>年增率(%)</TYPE><Item_VALUE>9</Item_VALUE></Obs>'
    return ('<DataSet>'+obs+noise+'</DataSet>').encode()
  def test_index_not_yoy(self): self.assertEqual(parse(self.sample())['eggs']['observations']['2026M09'],'100')
  def test_no_unsafe_dtd(self):
    with self.assertRaises(ValueError): parse(b'<!DOCTYPE foo><DataSet></DataSet>')
  def test_release_stable(self):
    x,_=build(self.sample()); y,_=build(self.sample()); self.assertEqual(x['release_id'],y['release_id'])
  def test_short_xml_rejected(self):
    with self.assertRaises(ValueError):parse(b'<DataSet/>')
if __name__=='__main__':unittest.main()
