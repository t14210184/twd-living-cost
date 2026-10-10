/* Unified citizen-first UI: FX and essential costs belong to ONE date-aligned model.
 * Official indices are observed; user-input expenditures/incomes are assumptions. */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const math=window.LifeMath;
  let fx=null,cpi=null,mode="twd";
  const labels={USD:"美元",JPY:"日圓",EUR:"歐元",CNY:"人民幣",GBP:"英鎊",AUD:"澳幣",KRW:"韓元",SGD:"新加坡幣"};
  const money=v=>"NT$"+Math.round(v).toLocaleString("zh-TW");
  const percent=v=>(v>0?"+":"")+(v*100).toFixed(2)+"%";
  const monthText=s=>s.slice(0,4)+" 年 "+Number(s.slice(5))+" 月";
  const count=v=>Number(v).toLocaleString("zh-TW",{minimumFractionDigits:2,maximumFractionDigits:2})+" 份";
  function readExpenses(){
    return Object.fromEntries([...document.querySelectorAll("[data-life-key]")].map(x=>[x.dataset.lifeKey,Number(x.value)]));
  }
  function setText(id,value){const element=$(id);if(element)element.textContent=value;}
  function error(message) {
    const status=$("lifeStatus");status.className="warning";status.textContent=message;
    for(const id of ["lifeFxChange","lifePriceChange","lifeRealChange","lifeCostBefore","lifeCostNow","lifeBasketsBefore","lifeBasketsNow"])setText(id,"—");
    setText("lifeAnswer","目前不足以計算可信的生活購買力；不以舊資料或模擬數字補足。");
    const ctx=$("lifeChart").getContext("2d");ctx.clearRect(0,0,$("lifeChart").width,$("lifeChart").height);
  }
  function chart(series){
    const canvas=$("lifeChart");
    const width=canvas.clientWidth||700,height=260,dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(width*dpr);canvas.height=height*dpr;
    const ctx=canvas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    const styles=[
      {key:"fx",color:"#2963a4",width:2.5},
      {key:"cost",color:"#b65b24",width:2.5},
      {key:"purchasing",color:"#0d8463",width:3.5}
    ];
    let values=series.flatMap(x=>styles.map(y=>x[y.key])).filter(Number.isFinite);
    if(values.length<6)return;
    let low=Math.min(...values),high=Math.max(...values);
    const padding=Math.max(2,(high-low)*.12);low-=padding;high+=padding;
    ctx.strokeStyle="#aec4d0";ctx.lineWidth=1;ctx.beginPath();
    ctx.moveTo(52,16);ctx.lineTo(52,height-35);ctx.lineTo(width-8,height-35);ctx.stroke();
    for(const mark of [low,(high+low)/2,high]){
      const y=18+(height-55)*(high-mark)/(high-low);
      ctx.beginPath();ctx.moveTo(52,y);ctx.lineTo(width-10,y);ctx.strokeStyle="#e0e8ef";ctx.stroke();
      ctx.fillStyle="#486071";ctx.font="14px system-ui";ctx.fillText(mark.toFixed(1),5,y+5);
    }
    styles.forEach(line=>{
      ctx.beginPath();ctx.strokeStyle=line.color;ctx.lineWidth=line.width;
      series.forEach((r,i)=>{
        const x=52+(width-68)*i/Math.max(series.length-1,1),
              y=18+(height-55)*(high-r[line.key])/(high-low);
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      });
      ctx.stroke();
    });
    ctx.fillStyle="#3c596b";ctx.font="14px system-ui";
    const start=series[0].month.replace("M","/"),end=series.at(-1).month.replace("M","/");
    ctx.fillText(start,52,height-9);
    ctx.fillText(end,Math.max(60,width-ctx.measureText(end).width-10),height-9);
  }
  function render(){
    if(!fx||!cpi){error("官方資料載入中，請稍候。");return;}
    const chosen=$("lifeCurrency").value;
    const result=math.calculate({
      fx,cpi,months:Number(document.querySelector('#periods button[aria-pressed="true"]')?.dataset.p||12),
      currency:chosen,expenses:readExpenses(),mode,
      twdIncome:Number($("lifeTwdIncome").value),
      foreignIncome:Number($("lifeForeignIncome").value)
    });
    if(!result.ok){error(result.reason);return;}
    $("lifeStatus").className="warning good";
    $("lifeStatus").textContent="已用聯準會 H.10 與主計總處真實月資料完成計算。生活費和收入金額是您自行設定的情境，不是官方家庭平均。";
    setText("lifeDates","比較："+monthText(result.start)+" → "+monthText(result.end)+"（共同完整月份；不是盤中匯率）。");
    setText("lifeFxChange",percent(result.fxChange));
    setText("lifePriceChange",percent(result.priceChange));
    setText("lifeRealChange",percent(result.purchasingChange));
    setText("lifeFxNote",mode==="twd"?
      "供比較的"+labels[chosen]+"匯率；不直接改變台幣收入":
      labels[chosen]+"的每月固定外幣金額會受此影響");
    setText("lifeCostBefore",money(result.priorExpense));
    setText("lifeCostNow",money(result.currentExpense));
    setText("lifeBasketsBefore",count(result.purchasingStart));
    setText("lifeBasketsNow",count(result.purchasingEnd));
    const direction=result.purchasingChange>=0?"增加":"減少";
    const moreCost=result.addedExpense>=0?"增加":"減少";
    let answer;
    if(mode==="twd"){
      answer="假設你每月都領同樣 "+money(result.incomeEnd)+" 台幣，"+
        "維持同樣的米、蛋、房租、水電等生活項目，這籃每月費用估計"+
        moreCost+" "+money(Math.abs(result.addedExpense))+"。"+
        "相同薪水能負擔的生活份數由 "+count(result.purchasingStart)+" 變成 "+
        count(result.purchasingEnd)+"，購買力"+direction+" "+Math.abs(result.purchasingChange*100).toFixed(2)+"%。"+
        "同期"+labels[chosen]+"兌台幣變動 "+percent(result.fxChange)+"，"+
        "但這不代表你的台幣薪水直接跟著變動；匯率對物價的間接影響無法單從這兩條曲線證明。";
    }else{
      answer="假設每月固定可用 "+Number($("lifeForeignIncome").value).toLocaleString("zh-TW")+
        " "+labels[chosen]+"，換成台幣的估計收入從 "+money(result.incomeStart)+
        " 變成 "+money(result.incomeEnd)+"；同樣一籃米、蛋、房租、水電費用從 "+
        money(result.priorExpense)+" 變成 "+money(result.currentExpense)+"。"+
        "扣除必要生活費變化後，能負擔的生活份數從 "+count(result.purchasingStart)+
        " 變成 "+count(result.purchasingEnd)+"，實質購買力"+direction+" "+
        Math.abs(result.purchasingChange*100).toFixed(2)+"%。這是依同月官方參考匯率估算，不含銀行換匯價差。";
    }
    setText("lifeAnswer",answer);
    setText("lifeExplanation",mode==="twd"?
      "三條線都從100開始：藍線是"+labels[chosen]+"兌台幣（只作對照），橘線是同樣必需品成本，綠線是固定台幣收入真正能負擔的生活份數。匯率不被當成台幣薪水的直接變化。":
      "三條線都從100開始：藍線是"+labels[chosen]+"兌台幣、橘線是必需品成本、綠線是固定外幣數量換成台幣後能負擔的生活份數。");
    if(result.months===6 && result.selected.some(x=>x.key==="electricity")){
      setText("lifeExplanation",$("lifeExplanation").textContent+" 注意：電費有夏月季節因素，半年差異不可全部視為一般通膨。");
    }
    chart(result.series);
  }
  async function load(){
    try{
      const replies=await Promise.all(["data/fx.json","data/cpi.json","data/manifest.json"].map(f=>fetch("./"+f,{cache:"no-store"})));
      if(replies.some(r=>!r.ok))throw Error("官方匯率或物價資料未成功發布。");
      const [rates,prices,meta]=await Promise.all(replies.map(r=>r.json()));
      if(!rates.daily?.length||rates.release_id!==meta.fx?.release_id||
         prices.release_id!==meta.release_id||meta.fx?.status!=="VERIFIED_H10")
        throw Error("兩組資料版本不一致，為避免錯算暫停顯示。");
      fx=rates;cpi=prices;render();
    }catch(ex){fx=null;cpi=null;error("暫時無法把兩種官方資料對齊："+ex.message+" 不會要求你手動上傳任何資料。");}
  }
  $("lifeModes").addEventListener("click",event=>{
    const button=event.target.closest("button[data-life-mode]");if(!button)return;
    mode=button.dataset.lifeMode;
    for(const item of document.querySelectorAll("#lifeModes button"))item.setAttribute("aria-pressed",String(item===button));
    $("lifeTwdBox").hidden=mode!=="twd";$("lifeForeignBox").hidden=mode!=="foreign";render();
  });
  for(const id of ["lifeTwdIncome","lifeForeignIncome"])$(id).addEventListener("input",render);
  $("lifeExpenses").addEventListener("input",render);
  $("lifeCurrency").addEventListener("change",()=>{
    const detailed=$("fxCurrency");if(detailed&&detailed.value!==$("lifeCurrency").value){
      detailed.value=$("lifeCurrency").value;detailed.dispatchEvent(new Event("change"));
    }
    render();
  });
  $("fxCurrency")?.addEventListener("change",()=>{
    $("lifeCurrency").value=$("fxCurrency").value;render();
  });
  $("periods").addEventListener("click",()=>queueMicrotask(render));
  window.addEventListener("resize",()=>{if(fx)render();});
  window.addEventListener("focus",load);
  load();setInterval(load,1800000);
})();
