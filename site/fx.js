(()=>{
"use strict";
const $=s=>document.getElementById(s);
const currencies={USD:"美元",JPY:"日圓",EUR:"歐元",CNY:"人民幣",GBP:"英鎊",AUD:"澳幣",KRW:"韓元",SGD:"新加坡幣"};
const colors={USD:"#254d81",JPY:"#b54439",EUR:"#23805a",CNY:"#b37c21",GBP:"#704ba6",AUD:"#278eac",KRW:"#a2597c",SGD:"#3c7770"};
let fx=null,manifest=null,cpi=null;
const nums=v=>Number(v).toLocaleString("zh-TW",{minimumFractionDigits:0,maximumFractionDigits:4});
const pct=v=>(v>0?"+":"")+(v*100).toFixed(2)+"%";
const period=()=>Number(document.querySelector('button[data-p][aria-pressed="true"]')?.dataset.p||12);
const idx=c=>fx.columns.indexOf(c);
const rate=(row,c)=>Number(row[idx(c)]);
function nameUnit(c){return c==="JPY"?"100 日圓":c==="KRW"?"1,000 韓元":"1 "+currencies[c]}
function displayRate(row,c){const multiplier=c==="JPY"?100:c==="KRW"?1000:1;return "NT$ "+(rate(row,c)*multiplier).toLocaleString("zh-TW",{minimumFractionDigits:2,maximumFractionDigits:4})}
function monthlyVal(month,c){const a=fx.monthly?.[month];return a?Number(a[idx(c)-1]):null}
function ymAdd(month,offset){const [y,m]=month.split("M").map(Number);const val=y*12+m-1+offset;return Math.floor(val/12)+"M"+String(((val%12)+12)%12+1).padStart(2,"0")}
function monthText(ym){return ym.slice(0,4)+" 年 "+Number(ym.slice(5))+" 月"}
function dayText(d){const a=d.split("-");return a[0]+" 年 "+Number(a[1])+" 月 "+Number(a[2])+" 日"}
function status(text,warn){const el=$("fxStatus");el.textContent=text;el.className=warn?"warning":"warning good"}
function context(canvas){const width=canvas.clientWidth||650,height=230,dpr=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);canvas.style.height=height+"px";
  const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);return {ctx,width,height}}
function drawLines(id,points,colorSeries){const el=$(id);if(!el)return;const {ctx,width:w,height:h}=context(el);
  const all=colorSeries.flatMap(x=>x.values).filter(Number.isFinite);if(all.length<2)return;
  let lo=Math.min(...all),hi=Math.max(...all);
  const margin=(hi-lo)*.07||1;lo-=margin;hi+=margin;
  ctx.fillStyle="#455e70";ctx.font="14px system-ui";ctx.fillText(hi.toFixed(1),8,20);ctx.fillText(lo.toFixed(1),8,h-10);
  ctx.strokeStyle="#a7becb";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(48,20);ctx.lineTo(48,h-26);ctx.lineTo(w-8,h-26);ctx.stroke();
  colorSeries.forEach(item=>{ctx.strokeStyle=item.color;ctx.lineWidth=item.width||2;ctx.beginPath();
    item.values.forEach((v,i)=>{if(!Number.isFinite(v))return;const x=48+(w-65)*i/Math.max(points.length-1,1),y=20+(h-46)*(hi-v)/(hi-lo);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke()});
  ctx.font="14px system-ui";ctx.fillStyle="#40576a";
  if(points.length){ctx.fillText(points[0].slice(0,10),48,h-6);const d=points.at(-1).slice(0,10);
    const tw=ctx.measureText(d).width;ctx.fillText(d,Math.max(48,w-tw-7),h-6)}
}
function renderReal(code){
  const out=$("fxReal");if(!fx||!cpi)return;
  const el=$("item"),selection=el?.value||"rice",item=cpi.items[selection]||cpi.items.rice;
  if(!item){out.textContent="目前尚無可比較的台灣基本生活物價指數。";return}
  const available=Object.keys(fx.monthly).filter(m=>Object.prototype.hasOwnProperty.call(item.observations,m)).sort();
  if(!available.length){out.textContent="匯率與物價沒有共同月份，不提供錯誤的購買力結果。";return}
  const end=available.at(-1),start=ymAdd(end,-period());
  const eFX=monthlyVal(end,code),sFX=monthlyVal(start,code);
  const eP=Number(item.observations[end]),sP=Number(item.observations[start]);
  if(!(eFX>0&&sFX>0&&eP>0&&sP>0)){
    out.textContent="「"+item.label+"」在這個期間沒有完整、同基期的匯率與物價月份；因此不做估算。";return}
  const nominal=eFX/sFX-1,inflation=eP/sP-1,real=(1+nominal)/(1+inflation)-1;
  out.textContent="以「"+item.label+"」為例："+monthText(start)+" 至 "+monthText(end)+
    "，"+currencies[code]+"換成台幣的月平均匯率"+(nominal>=0?"升":"貶")+Math.abs(nominal*100).toFixed(2)+"%；"+
    "這項必需品物價指數"+(inflation>=0?"上漲":"下降")+Math.abs(inflation*100).toFixed(2)+"%；"+
    "扣除後，同一單位外幣對這項必需品的相對購買力"+(real>=0?"增加":"減少")+Math.abs(real*100).toFixed(2)+"%。"+
    "（採相同月份的月平均匯率與官方月物價指數；不是實際銀行換匯收益。）";
}
function render(){
  if(!fx)return;
  const code=$("fxCurrency").value||"USD",months=period();
  const range=fx.anchors?.[String(months)];if(!range){status("這個期間的歷史資料不足，不能比較。",true);return}
  const [start,end]=[range.start,range.end],rows=fx.daily.filter(x=>x[0]>=start&&x[0]<=end);
  if(rows.length<50){status("共同交易日資料不足。",true);return}
  const first=rows[0],last=rows.at(-1),base=rate(first,code),now=rate(last,code),change=now/base-1;
  $("fxRate").textContent=displayRate(last,code);
  $("fxRateUnit").textContent=nameUnit(code)+"，資料日："+dayText(last[0]);
  $("fxMove").textContent=pct(change);
  $("fxMove").className="big "+(change>=0?"fx-up":"fx-down");
  $("fxMoveWords").textContent=currencies[code]+"對新台幣"+(change>=0?"變貴":"變便宜")+"，"+dayText(start)+" 到 "+dayText(end);
  const values=rows.map(x=>rate(x,code)),lo=Math.min(...values),hi=Math.max(...values);
  const returns=[];for(let i=1;i<values.length;i++)returns.push(Math.log(values[i]/values[i-1]));
  const mean=returns.reduce((a,b)=>a+b,0)/returns.length;
  const deviation=Math.sqrt(returns.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(returns.length-1,1))*Math.sqrt(252)*100;
  drawLines("fxChart",rows.map(x=>x[0]),[{color:colors[code],width:3,values:values.map(v=>100*v/base)}]);
  const multiplier=code==="JPY"?100:code==="KRW"?1000:1;
  $("fxRangeWords").textContent="相同官方交易日 "+rows.length+" 天。每 "+nameUnit(code)+"的最低價格 NT$"+nums(lo*multiplier)+"、最高 NT$"+nums(hi*multiplier)+"；歷史年化波動率約 "+deviation.toFixed(2)+"%。圖表把起點設為100，非銀行實際成交價。";
  const rank=Object.keys(currencies).map(c=>({code:c,percent:rate(last,c)/rate(first,c)-1,unit:displayRate(last,c)})).sort((a,b)=>b.percent-a.percent);
  $("fxRanks").replaceChildren(...rank.map(r=>{
    const tr=document.createElement("tr");
    const a=document.createElement("td");a.textContent=currencies[r.code]+"（"+nameUnit(r.code)+"）";
    const b=document.createElement("td");b.style.textAlign="right";b.textContent=r.unit;
    const c=document.createElement("td");c.style.textAlign="right";c.className=r.percent>=0?"fx-up":"fx-down";
    c.textContent=pct(r.percent)+(r.percent>=0?" ↑":" ↓");
    tr.append(a,b,c);return tr;
  }));
  drawLines("fxCompareChart",rows.map(x=>x[0]),Object.keys(currencies).map(c=>{
    const init=rate(first,c);return {color:colors[c],width:c===code?3:1.6,values:rows.map(r=>100*rate(r,c)/init)}}));
  $("fxCompareWords").textContent="各貨幣在 "+dayText(start)+" 均設為100；上升代表外幣相對台幣變貴。"+
    rank.map(x=>currencies[x.code]+pct(x.percent)).join("、")+"。";
  const usdRatio=rate(last,"USD")/rate(first,"USD");
  if(code==="USD"){
    $("fxDrivers").textContent="美元直接兌台幣由 NT$"+nums(rate(first,"USD"))+" 變為 NT$"+nums(rate(last,"USD"))+
    "，漲跌 "+pct(usdRatio-1)+"。這是可驗證的價格變動，不等於已判定升降息或新聞是原因。";
  }else{
    const other=(now/rate(last,"USD"))/(base/rate(first,"USD"));
    $("fxDrivers").textContent="可核對的數學分解：美元兌台幣變動 "+pct(usdRatio-1)+
    "；"+currencies[code]+"兌美元的相對價值變動 "+pct(other-1)+
    "；兩個變化相乘後，等於"+currencies[code]+"兌台幣 "+pct(change)+
    "。這是匯率恆等式，不是未經證明的經濟因果。";
  }
  renderReal(code);
}
async function start(){
  try{
    const [fxRes,metaRes,cpiRes]=await Promise.all(["data/fx.json","data/manifest.json","data/cpi.json"].map(x=>fetch("./"+x,{cache:"no-store"})));
    if(!fxRes.ok||!metaRes.ok||!cpiRes.ok)throw Error("公開網站尚未取得官方匯率與物價資料");
    const [incoming,meta,prices]=await Promise.all([fxRes.json(),metaRes.json(),cpiRes.json()]);
    if(!incoming.daily?.length||incoming.columns?.length!==9||meta.fx?.release_id!==incoming.release_id||
       meta.cpi?.last_observed_month===undefined||meta.release_id!==prices.release_id)
      throw Error("匯率或物價的公開版本驗證不一致");
    fx=incoming;manifest=meta;cpi=prices;
    const last=fx.as_of;
    const days=Math.floor((Date.now()-new Date(last+"T12:00:00Z").getTime())/86400000);
    status("聯準會 H.10 已載入：八種貨幣最新共同觀測日 "+dayText(last)+
      "。更新頻率依官方每週發布，不是盤中即時銀行牌告。"+(days>14?"提醒：資料較舊，請查核官方更新狀態。":""),days>14);
    render();
  }catch(ex){status("國際匯率暫時無法載入："+ex.message+"。不使用假數字，也不要求上傳檔案。",true);
    fx=null;$("fxRate").textContent="無資料";$("fxMove").textContent="無資料";}
}
$("fxCurrency").addEventListener("change",render);
$("periods").addEventListener("click",()=>queueMicrotask(render));
$("item").addEventListener("change",render);
window.addEventListener("resize",()=>{if(fx)render()});
window.addEventListener("focus",start);
start();setInterval(start,1800000);
})();