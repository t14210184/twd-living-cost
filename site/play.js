/* v7.1 responsive senior-friendly lifestyle simulator.
   Four editorial presets, one-tap cost shocks, simple optional stepper edits.
   All user data remains in volatile JavaScript state. Official data fetched only for
   the separate clearly attributed historical FX/CPI comparison. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const api=window.PlayMath;
const root=$("play");
if(!api||!root)return;
let current=api.preset("worker");
const money=n=>Math.abs(n).toLocaleString("zh-TW",{maximumFractionDigits:0});
const signed=n=>(n>=0?"+":"−")+"NT$ "+money(n);
const text=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
const changes={income:1000,bento:10,savings:10000,meals:1,hours:8};
const maxs={income:1000000000,bento:10000,savings:1000000000,meals:1000,hours:20000};
const safePercent=n=>(n>=0?"+":"")+(n*100).toFixed(2)+"%";
const labels={worker:"一個人上班",couple:"兩人一起養家",elder:"退休長輩",parent:"一個人帶小孩"};
function makeExpenses(){
  const grid=$("play-need-list");
  grid.replaceChildren();
  for(const [key,label] of api.CATEGORIES){
    const item=document.createElement("div");item.className="play-tuner";
    const caption=document.createElement("label");caption.htmlFor="play-expense-"+key;caption.textContent=label+"（每月元）";
    const row=document.createElement("div");row.className="play-stepper";
    const minus=document.createElement("button");minus.type="button";minus.dataset.playStep="expense:"+key;minus.dataset.direction="-1";minus.textContent="－";minus.setAttribute("aria-label",label+"減少500元");
    const input=document.createElement("input");input.type="number";input.id="play-expense-"+key;input.min="0";input.max="1000000000";input.step="500";input.inputMode="numeric";input.dataset.playInput="expense:"+key;
    const plus=document.createElement("button");plus.type="button";plus.dataset.playStep="expense:"+key;plus.dataset.direction="1";plus.textContent="＋";plus.setAttribute("aria-label",label+"增加500元");
    row.append(minus,input,plus);item.append(caption,row);grid.append(item);
  }
}
function syncInputs(){
  for(const key of Object.keys(changes)){
    const el=$("play-"+key);if(el)el.value=current[key];
  }
  for(const [key] of api.CATEGORIES){const el=$("play-expense-"+key);if(el)el.value=current.expenses[key];}
  for(const button of root.querySelectorAll("[data-play-profile]"))
    button.setAttribute("aria-pressed",String(button.dataset.playProfile===current.id));
  for(const button of root.querySelectorAll("[data-play-challenge]"))
    button.setAttribute("aria-pressed",String(Boolean(current.challenge[button.dataset.playChallenge])));
}
function setRole(id){
  current=api.preset(id);syncInputs();render();
}
function render(){
  const r=api.calculate(current);
  if(!r.ok){text("play-remaining","請檢查數字");text("play-story",r.reason);return;}
  $("play-scoreboard").dataset.level=r.level;
  $("play-impact").dataset.level=r.level;
  const badge=r.remaining<0?"錢不夠用":r.level==="tight"?"有點吃緊":"還有一點空間";
  text("play-level",badge);
  text("play-active-persona",labels[current.id]+" · 可以修改的示範生活");
  text("play-remaining",(r.remaining<0?"還差 NT$ ":"NT$ ")+money(r.remaining));
  text("play-income-show",money(r.income)+" 元");
  text("play-cost-show",money(r.monthlyCost)+" 元");
  const ratio=r.share===null?null:r.share*100;
  const percent=ratio===null?"沒有收入":Math.round(ratio)+"%";
  text("play-meter-title","生活費占收入 "+percent);
  const bar=Math.min(100,Math.max(0,ratio===null?100:ratio));
  $("play-meter-fill").style.width=bar+"%";
  $("play-meter").setAttribute("aria-valuenow",String(Math.round(bar)));
  const speech=r.income<=0?"示範收入為 0；所有必要開銷都還要找來源支付。":
    r.remaining<0?"這份情境每個月少 "+money(r.remaining)+" 元，光靠這筆收入，已經付不完列出的必要開銷。":
    "每賺 100 元，大約 "+Math.round(100*r.share)+" 元拿去過生活。暫剩 "+money(r.remaining)+
      " 元，還沒扣掉突然發生、或沒列進去的費用。";
  text("play-story",speech);
  if(r.bentoMinutes!==null){
    text("play-meal-number",r.bentoMinutes.toFixed(1)+" 分鐘");
    text("play-meal-text","示範便當 "+money(r.bento)+" 元，依到手收入與全家合計 "+money(current.hours)+" 小時工作時間推算。");
  }else{
    text("play-meal-number",current.profile==="retired"?"退休不用算工時":"缺工作時數");
    text("play-meal-text",current.profile==="retired"?"退休生活看的是每月有多少錢能買飯，不是工作分鐘。":"要算買便當的工作時間，得知道實際工作時數。");
  }
  text("play-bento-quest-desc","每月買 "+money(current.meals)+" 份，多花 "+money(current.meals*10)+" 元");
  const active=Object.keys(current.challenge).filter(k=>current.challenge[k]);
  if(!active.length){
    text("play-impact-title","先點一關，看看差別");
    text("play-impact-text","便當漲、水電漲、看病突然要用錢：都可以點一下試試。");
  }else if(r.remaining<0){
    text("play-impact-title","每個月還差 "+money(r.remaining)+" 元");
    text("play-impact-text",r.monthlyExtra>0?"漲價讓每月再多花 "+money(r.monthlyExtra)+" 元；原本已經不夠的預算更緊了。":"這份生活費本來就高過收入。");
  }else{
    text("play-impact-title","這個月暫時剩 "+money(r.remaining)+" 元");
    text("play-impact-text",r.monthlyExtra>0?
      "選中的漲價關卡，讓你每月多花 "+money(r.monthlyExtra)+" 元；跟沒漲價時比，少剩 "+money(r.monthlyExtra)+" 元。":
      "這一關只動到儲蓄，不會錯誤扣成每個月固定開支。");
  }
  if(r.medicalCost>0){
    text("play-impact-medical",r.medicalShortfall>0?
      "假設突然自費 30,000 元，可動用存款 "+money(r.savings)+" 元還差 "+money(r.medicalShortfall)+" 元。這是情境，不代表真實醫療費或破產機率。":
      "假設突然自費 30,000 元，存款從 "+money(r.savings)+" 元變成 "+money(r.savingsAfter)+" 元。"+
      (r.recoveryMonths!==null?" 如果之後每月都能剩下同樣金額，至少約 "+r.recoveryMonths+" 個月才補得回來。":"")+
      " 不是醫院報價。");
  }else text("play-impact-medical","沒選醫療關卡。醫療費是一次性情境，不和每月水電、伙食混算。");
}
function adjust(key,direction){
  const split=key.split(":");
  const step=split[0]==="expense"?500:changes[key];
  if(!step)return;
  const item=split[0]==="expense"?current.expenses:current;
  const prop=split[0]==="expense"?split[1]:key;
  if(!(prop in item))return;
  const max=split[0]==="expense"?1000000000:maxs[key];
  const next=Math.max(0,Math.min(max,Number(item[prop]||0)+step*direction));
  item[prop]=next;
  const target=split[0]==="expense"?$("play-expense-"+prop):$("play-"+prop);
  if(target)target.value=next;
  render();
}
function input(key,value){
  if(key.startsWith("expense:")){
    const name=key.slice(8);
    if(name in current.expenses)current.expenses[name]=value;
  }else if(key in changes) current[key]=value;
  render();
}
function showAdvanced(){
  const details=$("play-advanced");
  if(!details)return;
  details.open=true;
  window.dispatchEvent(new Event("resize"));
  details.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}
root.addEventListener("click",e=>{
  const choice=e.target.closest("button[data-play-profile]");
  if(choice){setRole(choice.dataset.playProfile);return;}
  const quest=e.target.closest("button[data-play-challenge]");
  if(quest){
    const key=quest.dataset.playChallenge;
    if(key in current.challenge){current.challenge[key]=!current.challenge[key];syncInputs();render();}
    return;
  }
  const step=e.target.closest("button[data-play-step]");
  if(step){adjust(step.dataset.playStep,Number(step.dataset.direction));return;}
  if(e.target.closest("#play-reset")){setRole(current.id);return;}
  if(e.target.closest("#play-open-advanced")){showAdvanced();}
});
root.addEventListener("input",e=>{
  const key=e.target.dataset.playInput;
  if(key){input(key,e.target.value);return;}
});
$("play-advanced")?.addEventListener("toggle",e=>{
  if(e.target.open)window.dispatchEvent(new Event("resize"));
});
async function loadOfficial(){
  try{
    const paths=["data/manifest.json","data/cpi.json","data/fx.json"];
    const res=await Promise.all(paths.map(p=>fetch("./"+p,{cache:"no-store"})));
    if(res.some(x=>!x.ok))throw Error("官方資料連線失敗");
    const [meta,cpi,fx]=await Promise.all(res.map(x=>x.json()));
    if(cpi.release_id!==meta.release_id||fx.release_id!==meta.fx?.release_id)
      throw Error("官方資料版本不同，不能混在一起比較");
    const rent=cpi.items?.rent?.observations;
    if(!rent||!fx.monthly||!Array.isArray(fx.columns))throw Error("官方月份不完整");
    const months=Object.keys(fx.monthly).filter(m=>rent[m]!=null).sort();
    const end=months.at(-1);
    if(!end)throw Error("沒有可以對照的共同月份");
    const [y,m]=end.split("M");
    const start=(Number(y)-1)+"M"+m;
    const a=Number(rent[start]),b=Number(rent[end]);
    const usd=fx.columns.indexOf("USD")-1;
    const before=Number(fx.monthly[start]?.[usd]),after=Number(fx.monthly[end]?.[usd]);
    if(!(a>0&&b>0&&before>0&&after>0))throw Error("一年期官方月份有缺值");
    text("play-official-rent",safePercent(b/a-1));
    text("play-official-fx",safePercent(after/before-1));
    text("play-official-month",start.replace("M","/")+" → "+end.replace("M","/")+"，官方同月份");
    text("play-official-status","已接上真正官方歷史。房租是主計總處價格指數；美元是聯準會月平均參考匯率。兩者不能直接證明誰造成誰漲價。");
  }catch(err){
    text("play-official-rent","暫缺資料");
    text("play-official-fx","暫缺資料");
    text("play-official-status","官方比較暫時無法顯示："+err.message+"。不會拿示範價充當真實統計。");
  }
}
makeExpenses();
syncInputs();
render();
loadOfficial();
})();
