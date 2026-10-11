"""Live Chrome acceptance: one-tap playable TWD livelihood with authentic CPI/H10 underneath."""
from pathlib import Path
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait

URL=os.environ.get("SITE_URL","https://t14210184.github.io/twd-living-cost/")
OUT=Path("browser-artifacts")
OUT.mkdir(exist_ok=True)
opts=Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--window-size=1320,950")
opts.add_argument("--lang=zh-TW")
driver=webdriver.Chrome(options=opts)
try:
    driver.get(URL)
    wait=WebDriverWait(driver,50)
    wait.until(lambda d:"3,100" in d.find_element(By.ID,"play-remaining").text)
    assert driver.find_element(By.CSS_SELECTOR,'[data-play-profile="worker"]').get_attribute("aria-pressed")=="true"
    assert "30,000" in driver.find_element(By.ID,"play-income-show").text
    assert "26,900" in driver.find_element(By.ID,"play-cost-show").text
    assert "35.2" in driver.find_element(By.ID,"play-meal-number").text
    assert driver.find_element(By.ID,"play-advanced").get_attribute("open") is None
    wait.until(lambda d:"已接上真正官方歷史" in d.find_element(By.ID,"play-official-status").text)
    assert "%" in driver.find_element(By.ID,"play-official-rent").text
    assert "%" in driver.find_element(By.ID,"play-official-fx").text
    driver.save_screenshot(str(OUT/"v7_1_one_tap_desktop.png"))

    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="parent"]').click()
    assert "3,500" in driver.find_element(By.ID,"play-remaining").text
    assert "還差" in driver.find_element(By.ID,"play-remaining").text
    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="elder"]').click()
    assert "2,500" in driver.find_element(By.ID,"play-remaining").text
    assert "退休不用算工時" in driver.find_element(By.ID,"play-meal-number").text
    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="worker"]').click()

    driver.find_element(By.CSS_SELECTOR,'[data-play-challenge="bento"]').click()
    assert "2,880" in driver.find_element(By.ID,"play-remaining").text
    driver.find_element(By.CSS_SELECTOR,'[data-play-challenge="power"]').click()
    assert "2,380" in driver.find_element(By.ID,"play-remaining").text
    driver.find_element(By.CSS_SELECTOR,'[data-play-challenge="medical"]').click()
    assert "2,380" in driver.find_element(By.ID,"play-remaining").text, "medical may NOT be monthly expense"
    assert "0 元" in driver.find_element(By.ID,"play-impact-medical").text, "one-time health shock should affect savings"
    assert driver.find_element(By.CSS_SELECTOR,'[data-play-challenge="medical"]').get_attribute("aria-pressed")=="true"

    driver.find_element(By.ID,"play-edit").find_element(By.TAG_NAME,"summary").click()
    driver.find_element(By.CSS_SELECTOR,'[data-play-step="income"][data-direction="1"]').click()
    assert "3,380" in driver.find_element(By.ID,"play-remaining").text
    driver.find_element(By.ID,"play-reset").click()
    assert "3,100" in driver.find_element(By.ID,"play-remaining").text

    # Advanced FX, CPI and original arithmetic are still there, but one tap away.
    advanced=driver.find_element(By.ID,"play-advanced")
    assert len(driver.find_elements(By.ID,"fxChart"))==1
    assert len(driver.find_elements(By.ID,"lifeChart"))==1
    assert len(driver.find_elements(By.ID,"chart"))==1
    assert advanced.get_attribute("open") is None
    driver.find_element(By.ID,"play-open-advanced").click()
    wait.until(lambda d:d.find_element(By.ID,"play-advanced").get_attribute("open") is not None)
    assert driver.find_element(By.ID,"fxChart").is_displayed()
    assert driver.find_element(By.ID,"lifeRealChange").is_displayed()

    # Mobile: no horizontal scroll; preset cards, summary and quests still operable.
    driver.set_window_size(390,844)
    width=driver.execute_script("return document.documentElement.scrollWidth")
    viewport=driver.execute_script("return document.documentElement.clientWidth")
    assert width<=viewport+2, "Mobile overflow: "+str(width)+">"+str(viewport)
    driver.find_element(By.CSS_SELECTOR,'[data-play-profile="couple"]').click()
    assert "2,600" in driver.find_element(By.ID,"play-remaining").text
    assert "58,000" in driver.find_element(By.ID,"play-income-show").text
    assert driver.find_element(By.ID,"play-remaining").is_displayed()
    # Zero persisted browser data; all profiles held in ephemeral memory.
    assert driver.execute_script("return localStorage.length")==0
    assert driver.execute_script("return document.cookie")==""
    driver.save_screenshot(str(OUT/"v7_1_one_tap_mobile_390.png"))
    print("E2E PLAY V7.1 PASS",URL,"one-tap four presets, bento/power/health shocks, editable stepper, verified government stats, old FX/CPI preserved, mobile",viewport)
finally:
    driver.quit()
