"""Browser-level user experience check against the *deployed* GitHub Pages site."""
from pathlib import Path
import os, time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select

URL=os.environ.get("SITE_URL","https://t14210184.github.io/twd-living-cost/")
OUT=Path("browser-artifacts")
OUT.mkdir(exist_ok=True)
opts=Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--window-size=1400,900")
opts.add_argument("--lang=zh-TW")
driver=webdriver.Chrome(options=opts)
try:
    driver.set_window_size(1400,900)
    driver.get(URL)
    wait=WebDriverWait(driver,45)
    wait.until(lambda d: "聯準會 H.10 已載入" in d.find_element(By.ID,"fxStatus").text)
    wait.until(lambda d: "官方 CPI" in d.find_element(By.ID,"status").text)
    # Verify primary, *integrated* living-impact dashboard, not just separate charts.
    wait.until(lambda d: "%" in d.find_element(By.ID,"lifeRealChange").text)
    assert "維持同樣" in driver.find_element(By.ID,"lifeAnswer").text
    assert "不代表你的台幣薪水" in driver.find_element(By.ID,"lifeAnswer").text
    assert driver.find_element(By.ID,"lifeChart").get_attribute("width")!='0'
    old_impact=driver.find_element(By.ID,"lifeRealChange").text
    driver.find_element(By.CSS_SELECTOR,'button[data-life-mode="foreign"]').click()
    assert driver.find_element(By.CSS_SELECTOR,'button[data-life-mode="foreign"]').get_attribute("aria-pressed")=="true"
    assert "固定" in driver.find_element(By.ID,"lifeAnswer").text or "假設每月" in driver.find_element(By.ID,"lifeAnswer").text
    assert driver.find_element(By.ID,"lifeRealChange").text != old_impact
    Select(driver.find_element(By.ID,"lifeCurrency")).select_by_value("JPY")
    assert "日圓" in driver.find_element(By.ID,"lifeAnswer").text
    driver.find_element(By.CSS_SELECTOR,'#living .life-inputs summary').click()
    before_cost=driver.find_element(By.ID,"lifeCostNow").text
    rent=driver.find_element(By.ID,"life-rent")
    rent.clear()
    rent.send_keys("20000")
    assert before_cost != driver.find_element(By.ID,"lifeCostNow").text
    assert "同樣一籃" in driver.find_element(By.ID,"lifeAnswer").text
    driver.find_element(By.CSS_SELECTOR,'button[data-life-mode="twd"]').click()
    assert "不代表你的台幣薪水" in driver.find_element(By.ID,"lifeAnswer").text
    assert "NT$" in driver.find_element(By.ID,"fxRate").text
    assert len(driver.find_elements(By.CSS_SELECTOR,"#fxRanks tr"))==8
    assert "扣除後" in driver.find_element(By.ID,"fxReal").text
    assert driver.find_element(By.ID,"fxChart").get_attribute("width")!='0'
    assert "十年" not in driver.find_element(By.ID,"fxStatus").text
    driver.save_screenshot(str(OUT/"desktop_live_fx.png"))
    driver.find_element(By.CSS_SELECTOR,'button[data-p="120"]').click()
    assert driver.find_element(By.CSS_SELECTOR,'button[data-p="120"]').get_attribute("aria-pressed")=="true"
    Select(driver.find_element(By.ID,"fxCurrency")).select_by_value("JPY")
    assert "100 日圓" in driver.find_element(By.ID,"fxRateUnit").text
    assert "%" in driver.find_element(By.ID,"fxMove").text
    Select(driver.find_element(By.ID,"item")).select_by_value("rent")
    assert "住宅租金" in driver.find_element(By.ID,"fxReal").text
    assert len(driver.find_elements(By.CSS_SELECTOR,"#fxRanks tr"))==8
    driver.set_window_size(390,844)
    time.sleep(.8)
    width=driver.execute_script("return document.documentElement.scrollWidth")
    client=driver.execute_script("return document.documentElement.clientWidth")
    assert width<=client+2, f"Mobile page horizontal overflow: {width}>{client}"
    assert driver.find_element(By.ID,"fxRate").is_displayed()
    assert driver.find_element(By.ID,"lifeRealChange").is_displayed()
    assert driver.find_element(By.ID,"lifeCostNow").is_displayed()
    driver.save_screenshot(str(OUT/"mobile_live_fx.png"))
    print("E2E INTEGRATED LIVING PASS",URL,"8 currency FX; TWD/FX scenarios; personal basket; official CPI; 10yr; phone width",client)
    print("E2E CPI",driver.find_element(By.ID,"status").text)
finally:
    driver.quit()
