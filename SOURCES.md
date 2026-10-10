# 官方來源及授權

主計總處：[消費者物價基本分類暨項目群指數 9158](https://data.gov.tw/dataset/9158)。採用[政府資料開放授權條款第 1 版](https://data.gov.tw/license)，本網站將其重新分類並計算期間變動率；單位是指數點，不是售價。

中央銀行：[6563](https://data.gov.tw/dataset/6563)。完整歷史報價的第三方再利用權仍待確認，公開資料未發布。

國發會：[民生物價](https://price.ndc.gov.tw/p/zh_tw/necessities)，本階段僅提供來源連結；同規格零售歷史與授權尚未確認。

## 美國聯準會 H.10：八種幣別長期歷史匯率（正式採用）

- 資料提供：Board of Governors of the Federal Reserve System (US)，[H.10 Foreign Exchange Rates](https://www.federalreserve.gov/releases/h10/)。
- 原始歷史 SDMX 壓縮檔：[官方全量 H.10 XML](https://www.federalreserve.gov/datadownload/Output.aspx?filetype=zip&rel=H10)，由 GitHub Actions 透過 HTTPS 每日檢查，該發佈系列一般每週一更新至前一週五。
- 依法使用依據：[Board 網站 Disclaimer / Copyright](https://www.federalreserve.gov/disclaimer.htm)：未另註明者屬 public domain；須標註來源。僅重用統計資料，不重用商標與他人圖片。各類衍生匯率保留來源連結與原始 ZIP 的 SHA-256。
- 實作僅選擇 `RXI_N.B.TA` (TWD/USD)、`RXI_N.B.JA` (JPY/USD)、`RXI_N.B.CH` (CNY/USD)、`RXI_N.B.KO` (KRW/USD)、`RXI_N.B.SI` (SGD/USD)、`RXI$US_N.B.EU` (USD/EUR)、`RXI$US_N.B.UK` (USD/GBP)、`RXI$US_N.B.AL` (USD/AUD)，而且只接受相同 `TIME_PERIOD`、日資料 `FREQ=9`。
- 資料為紐約市場午間參考匯率，並非台灣銀行現鈔／即期買賣價或盤中價格。單位為「每一外幣單位換得的新台幣」，日圓與韓元前端可轉換成每 100、1,000 單位顯示。
- 購買力採與主計總處 CPI 完全相同月份的外幣月平均交叉匯率，未完成的月份不計入；各完整月份僅用聯準會同日八幣交集。價格／購買力的數學分解不是新聞因果推斷。

原本央行 6563 日資料包含 Thomson Reuters 第三方來源與研究用途附註，**仍保持不重刊原始 6563 歷史序列**；這與新增、來源獨立的美國聯準會 H.10 資料是兩條不同管線。
