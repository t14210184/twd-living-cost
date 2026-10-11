"""Chrome E2E contract: actual React Three Fiber canvas + interactive spending town.

Checks public HTTPS, actual WebGL canvas, 6 3D hotspot labels, bidirectional
live numbers, one-tap presets, accessible lightweight mode and mobile.
"""
from pathlib import Path
import os,time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

URL=os.environ.get("SITE_URL","https://t14210184.github.io/twd-living-cost/")
OUT=Path("browser-artifacts");OUT.mkdir(exist_ok=True)
opts=Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--enable-webgl")
opts.add_argument("--enable-unsafe-swiftshader")
opts.add_argument("--use-angle=swiftshader")
opts.add_argument("--window-size=1440,900")
opts.add_argument("--lang=zh-TW")
driver=webdriver.Chrome(options=opts)
try:
    driver.get(URL)
    wait=WebDriverWait(driver,60)
    wait.until(lambda d:d.find_element(By.ID,"living-city-root").get_attribute("data-city-ready")=="true")
    wait.until(lambda d:len(d.find_elements(By.CSS_SELECTOR,"#living-city-root canvas"))==1)
    wait.until(lambda d:len(d.find_elements(By.CSS_SELECTOR,"button.city-label"))==6)
    assert "3,100" in driver.find_element(By.ID,"city-live-remaining").text
    assert "9,500" in driver.find_element(By.ID,"city-inspector-amount").text
    assert driver.find_element(By.ID,"play-advanced").get_attribute("open") is None
    driver.save_screenshot(str(OUT/"city_3d_desktop.png"))

    # Click a floating label rendered through React Three Fiber Html.
    label=driver.find_elements(By.CSS_SELECTOR,"button.city-label")
    grocery=next(e for e in label if "市場" in e.text)
    driver.execute_script("arguments[0].click()",grocery)
    assert "市場" in driver.find_element(By.ID,"city-inspector-title").text
    assert "9,000" in driver.find_element(By.ID,"city-inspector-amount").text
    assert driver.find_element(By.CSS_SELECTOR,'[data-city-place="market"]').get_attribute("aria-pressed")=="true"

    # The model reacts to selected role and every amount is shared with the life game.
    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="elder"]').click()
    assert "退休" in driver.find_element(By.ID,"play-active-persona").text
    assert "6,300" in driver.find_element(By.ID,"city-inspector-amount").text
    driver.find_element(By.CSS_SELECTOR,'[data-city-place="hospital"]').click()
    assert "1,900" in driver.find_element(By.ID,"city-inspector-amount").text
    driver.find_element(By.CSS_SELECTOR,'[data-play-challenge="medical"]').click()
    assert "30,000" in driver.find_element(By.ID,"city-inspector-info").text

    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="worker"]').click()
    driver.find_element(By.CSS_SELECTOR,'[data-city-place="fx"]').click()
    wait.until(lambda d:"%" in d.find_element(By.ID,"city-inspector-amount").text)
    assert "H.10" in driver.find_element(By.ID,"city-inspector-proof").text

    driver.find_element(By.ID,"city-simple-toggle").click()
    assert driver.find_element(By.ID,"living-city").get_attribute("data-city-simple")=="true"
    assert driver.find_element(By.ID,"city-simple-town").is_displayed()
    driver.find_element(By.CSS_SELECTOR,'#city-simple-town [data-city-place="home"]').click()
    assert "住家" in driver.find_element(By.ID,"city-inspector-title").text

    driver.find_element(By.ID,"city-simple-toggle").click()
    assert driver.find_element(By.ID,"living-city").get_attribute("data-city-simple")=="false"
    assert driver.find_element(By.CSS_SELECTOR,"#living-city-root canvas").is_displayed()

    # The research-grade FX and CPI tools remain in the single website.
    assert driver.find_element(By.ID,"fxChart")
    assert driver.find_element(By.ID,"lifeChart")
    assert driver.find_element(By.ID,"chart")
    driver.set_window_size(390,844)
    time.sleep(.5)
    width=driver.execute_script("return document.documentElement.scrollWidth")
    viewport=driver.execute_script("return document.documentElement.clientWidth")
    assert width<=viewport+2, f"Mobile horizontal overflow: {width}>{viewport}"
    assert driver.find_element(By.ID,"city-inspector-number").is_displayed() if driver.find_elements(By.ID,"city-inspector-number") else driver.find_element(By.ID,"city-inspector-amount").is_displayed()
    assert driver.execute_script("return localStorage.length")==0
    driver.save_screenshot(str(OUT/"city_3d_mobile_390.png"))
    print("3D REACT CITY E2E PASS public=",URL,"6 R3F hotspots; live Pingtung budget; mobile; fallback; H10/CPI intact",viewport)
finally:
    driver.quit()
