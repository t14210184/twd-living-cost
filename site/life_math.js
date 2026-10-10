/* Auditable calculations for the real-life purchasing-power dashboard.
   FX: Federal Reserve H.10 complete-month mean; CPI: DGBAS monthly index.
   All comparisons are for identical start/end MONTHS, without interpolation.
   Household expenses are USER-DEFINED current-month estimates, not market quotes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LifeMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MONTHS = new Set([6, 12, 36, 60, 120]);
  const CODES = new Set(["USD","JPY","EUR","CNY","GBP","AUD","KRW","SGD"]);
  const KEYS = ["rice","eggs","vegetables","dairy","rent","water","electricity","gas"];
  const isPositive = x => Number.isFinite(x) && x > 0;
  function shiftMonth(key, delta) {
    if (!/^\d{4}M(0[1-9]|1[0-2])$/.test(key)) throw new Error("月份格式錯誤");
    const n = Number(key.slice(0,4)) * 12 + Number(key.slice(5)) - 1 + delta;
    return Math.floor(n/12) + "M" + String((n%12 + 12)%12 + 1).padStart(2,"0");
  }
  function fail(reason) {return {ok:false,reason};}
  function calculate({fx,cpi,months,currency,expenses,mode,twdIncome,foreignIncome}) {
    if(!fx?.monthly || !cpi?.items || !Array.isArray(fx.columns)) return fail("缺少已驗證的官方資料。");
    if(!MONTHS.has(Number(months)) || !CODES.has(currency)) return fail("期間或幣別不符合資料規格。");
    if(mode !== "twd" && mode !== "foreign") return fail("收入類型有誤。");
    const fxColumn = fx.columns.indexOf(currency)-1;
    if (fxColumn<0) return fail("找不到此幣別的正式資料。");
    const selected=[];
    for(const key of KEYS){
      const amount=Number(expenses?.[key]??0);
      if(!Number.isFinite(amount)||amount<0||amount>10000000) return fail("支出金額必須是非負的合理數字。");
      if(amount>0){
        const obs=cpi.items[key]?.observations;
        if(!obs) return fail("已選的「"+key+"」沒有官方物價資料，不能自動忽略。");
        selected.push({key,label:cpi.items[key].label,amount,obs});
      }
    }
    if(!selected.length) return fail("請至少填寫一項每月必要支出。");
    const income=Number(mode==="twd"?twdIncome:foreignIncome);
    if(!Number.isFinite(income)||income<=0||income>1e9) return fail("請填入有效且大於零的每月收入或外幣金額。");
    const candidate=Object.keys(fx.monthly).filter(m=>/^\d{4}M(0[1-9]|1[0-2])$/.test(m)).sort();
    const end=candidate.filter(m=>selected.every(x=>isPositive(Number(x.obs[m])))).at(-1);
    if(!end)return fail("沒有官方匯率及必要物價皆齊全的共同月份。");
    const start=shiftMonth(end,-Number(months));
    if(!fx.monthly[start] || !selected.every(x=>isPositive(Number(x.obs[start]))))
      return fail("這個期間的官方匯率或民生物價缺少起點月份，不能補造比較。");
    function rateAt(month){
      const row=fx.monthly[month],val=row&&Number(row[fxColumn]);
      return isPositive(val)?val:null;
    }
    function basketAt(month){
      let cost=0;
      for(const x of selected){
        const now=Number(x.obs[end]),ref=Number(x.obs[month]);
        if(!isPositive(ref)||!isPositive(now))return null;
        cost+=x.amount * ref/now;
      }
      return isPositive(cost)?cost:null;
    }
    const fxStart=rateAt(start),fxEnd=rateAt(end),costStart=basketAt(start),costEnd=basketAt(end);
    if(!fxStart||!fxEnd||!costStart||!costEnd) return fail("起訖月份沒有完整的可比官方指數。");
    const fxRatio=fxEnd/fxStart,priceRatio=costEnd/costStart;
    const effectiveIncomeStart=mode==="foreign"?income*fxStart:income;
    const effectiveIncomeEnd=mode==="foreign"?income*fxEnd:income;
    const purchasingRatio=(effectiveIncomeEnd/costEnd)/(effectiveIncomeStart/costStart);
    const series=[];
    for(const month of candidate){
      if(month<start || month>end)continue;
      const refFX=rateAt(month),refCost=basketAt(month);
      if(!refFX||!refCost)continue;
      const incomeTwd=mode==="foreign"?income*refFX:income;
      series.push({
        month,
        fx:100*refFX/fxStart,
        cost:100*refCost/costStart,
        purchasing:100*(incomeTwd/refCost)/(effectiveIncomeStart/costStart)
      });
    }
    if(series.length<Math.max(4,Number(months)-3)||series[0].month!==start||series.at(-1).month!==end)
      return fail("期間內共同月份不足，無法繪製可信的完整走勢。");
    return {
      ok:true,start,end,months:Number(months),currency,mode,selected,
      currentExpense:costEnd,priorExpense:costStart,addedExpense:costEnd-costStart,
      fxStart,fxEnd,fxChange:fxRatio-1,priceChange:priceRatio-1,
      incomeStart:effectiveIncomeStart,incomeEnd:effectiveIncomeEnd,
      purchasingStart:effectiveIncomeStart/costStart,
      purchasingEnd:effectiveIncomeEnd/costEnd,
      purchasingChange:purchasingRatio-1,
      shareStart:costStart/effectiveIncomeStart,
      shareEnd:costEnd/effectiveIncomeEnd,
      remainingStart:effectiveIncomeStart-costStart,
      remainingEnd:effectiveIncomeEnd-costEnd,
      series
    };
  }
  return Object.freeze({calculate,shiftMonth,KEYS});
});
