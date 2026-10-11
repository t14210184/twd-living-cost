"""E2E: live GitHub Pages v7 Taiwan household livelihood, plus legacy FX preserved."""
import os
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

URL = os.environ.get("SITE_URL", "https://t14210184.github.io/twd-living-cost/")
OUT = Path("browser-artifacts")
OUT.mkdir(exist_ok=True)
options = Options()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--lang=zh-TW")
options.add_argument("--window-size=1280,900")
driver = webdriver.Chrome(options=options)
try:
    driver.get(URL)
    w = WebDriverWait(driver, 45)
    w.until(lambda d: len(d.find_elements(By.ID, "reality")) == 1)
    assert len(driver.find_elements(By.ID, "fxChart")) == 1, "FX chart deleted"
    assert len(driver.find_elements(By.ID, "lifeChart")) == 1, "integrated FX+CPI chart deleted"
    assert len(driver.find_elements(By.ID, "chart")) == 1, "CPI chart deleted"
    # No default salary or price should be claimed.
    assert driver.find_element(By.ID, "reality-income").get_attribute("value") == ""
    assert driver.find_element(By.ID, "reality-bento").get_attribute("value") == ""
    income=driver.find_element(By.ID,"reality-income")
    income.send_keys("30000")
    amounts={"food":"7000","housing":"10000","utilities":"2000",
             "transport":"2500","health":"1000","care":"0",
             "communication":"500","obligations":"2000","other":"0"}
    for key in ("care","communication","obligations","other"):
        parent=driver.find_element(By.ID, "reality-"+key).find_element(By.XPATH,"./ancestor::details[1]")
        driver.execute_script("arguments[0].open = true", parent)
    for name, value in amounts.items():
        driver.find_element(By.ID,"reality-"+name).send_keys(value)
    assert "5,000" in driver.find_element(By.ID, "reality-left").text, driver.find_element(By.ID, "reality-left").text
    assert "25,000" in driver.find_element(By.ID, "reality-basket").text
    driver.find_element(By.ID, "reality-confirm").click()
    assert "已自行確認" in driver.find_element(By.ID, "reality-status").text
    bento=driver.find_element(By.ID,"reality-bento")
    parent=bento.find_element(By.XPATH,"./ancestor::details[1]")
    driver.execute_script("arguments[0].open = true", parent)
    bento.send_keys("100")
    driver.find_element(By.ID,"reality-hours").send_keys("176")
    assert "35.2" in driver.find_element(By.ID,"reality-bento-result").text
    savings=driver.find_element(By.ID,"reality-savings")
    parent=savings.find_element(By.XPATH,"./ancestor::details[1]")
    driver.execute_script("arguments[0].open = true", parent)
    savings.send_keys("50000")
    driver.find_element(By.ID,"reality-shock").send_keys("30000")
    assert "20,000" in driver.find_element(By.ID,"reality-shock-result").text
    driver.save_screenshot(str(OUT/"v7_reality_live_desktop.png"))
    driver.find_element(By.CSS_SELECTOR,'input[name="reality-profile"][value="retired"]').click()
    assert "不適用" in driver.find_element(By.ID, "reality-bento-result").text
    assert not driver.find_element(By.ID, "reality-worker-only").is_displayed()
    driver.set_window_size(390,844)
    width=driver.execute_script("return document.documentElement.scrollWidth")
    viewport=driver.execute_script("return document.documentElement.clientWidth")
    assert width <= viewport+2, f"v7 mobile horizontal overflow: {width}>{viewport}"
    assert driver.find_element(By.ID,"reality-left").is_displayed()
    assert driver.execute_script("return localStorage.length") == 0, "personal data persisted"
    assert driver.execute_script("return document.cookie") == "", "cookies unexpectedly set"
    driver.save_screenshot(str(OUT/"v7_reality_live_mobile.png"))
    print("E2E V7 LIVE PASS",URL,"net 30000, essentials 25000, surplus 5000, 100 TWD bento = 35.2 min, medical demo 20000, retiree, FX+CPI preserved, mobile",viewport)
finally:
    driver.quit()
