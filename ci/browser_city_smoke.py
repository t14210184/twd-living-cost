"""Fast real Chrome WebGL smoke: display runtime diagnostics before any lengthy E2E."""
import json,os,time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

URL=os.environ.get("SITE_URL","https://t14210184.github.io/twd-living-cost/")
opts=Options()
for flag in ("--headless=new","--no-sandbox","--disable-dev-shm-usage","--enable-webgl",
             "--enable-unsafe-swiftshader","--use-angle=swiftshader",
             "--force-prefers-reduced-motion","--window-size=1320,900"):
    opts.add_argument(flag)
opts.set_capability("goog:loggingPrefs",{"browser":"ALL"})
driver=webdriver.Chrome(options=opts)
try:
  driver.get(URL)
  for attempt in range(16):
    time.sleep(1)
    data=driver.execute_script("""
     const el=document.getElementById('living-city-root');
     return {ready:el?.dataset.cityReady||false,markup:el?.innerText?.slice(0,300),
      canvas:el?.querySelectorAll('canvas').length,
      labels:el?.querySelectorAll('button.city-label').length,
      webgl2:!!document.createElement('canvas').getContext('webgl2'),
      mode:document.getElementById('living-city')?.dataset.citySimple,
      duration:performance.now().toFixed(0)};
    """)
    if data["ready"]=="true" and data["labels"]==6:break
  print("CITY_SMOKE_STATE",json.dumps(data,ensure_ascii=False),flush=True)
  console=driver.get_log("browser")
  for msg in console[-15:]:print("CITY_SMOKE_LOG",msg,flush=True)
  assert data["ready"]=="true", "Real WebGL Canvas not created"
  assert data["canvas"]==1, "Missing actual React Three Fiber canvas"
  assert data["labels"]==6, "Missing one or more real 3D landmarks"
  print("CITY_SMOKE_PASS",URL,flush=True)
finally:driver.quit()
