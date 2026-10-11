/* v7.1 - transparent lower-income lifestyle GAME scenarios.
 * Preset amounts are EDITORIAL HYPOTHESES, not Pingtung survey averages or live retail prices.
 * Personal data stays in memory only. No telemetry, storage, or hidden network requests. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object" && module.exports) module.exports=api;
  else root.PlayMath=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const CATEGORIES=[
 ["food","吃飯、買菜"],["housing","房租、住房"],["utilities","水電瓦斯"],
 ["transport","油費、交通"],["health","平常看病"],["care","照顧家人"],
 ["communication","手機網路"],["obligations","必要還款"],["other","其他必要支出"]
];
const PRESETS={
 worker:{name:"一個人上班",symbol:"👷",description:"一份薪水養自己",income:30000,hours:176,bento:100,meals:22,savings:30000,profile:"worker",
 expenses:{food:9000,housing:9500,utilities:2200,transport:2400,health:700,care:0,communication:700,obligations:1500,other:900}},
 couple:{name:"兩人一起養家",symbol:"🏠",description:"兩份薪水、共同開支",income:58000,hours:352,bento:110,meals:44,savings:40000,profile:"worker",
 expenses:{food:19000,housing:17000,utilities:4200,transport:5400,health:1800,care:3200,communication:1400,obligations:2000,other:1400}},
 elder:{name:"退休長輩",symbol:"🧓",description:"固定退休金與津貼",income:18000,hours:0,bento:100,meals:22,savings:35000,profile:"retired",
 expenses:{food:6300,housing:3500,utilities:1900,transport:900,health:1900,care:0,communication:400,obligations:0,other:600}},
 parent:{name:"一個人帶小孩",symbol:"👩‍👧",description:"一份薪水扛家用",income:32000,hours:176,bento:100,meals:30,savings:10000,profile:"worker",
 expenses:{food:11500,housing:11000,utilities:2800,transport:2000,health:900,care:4500,communication:700,obligations:1000,other:1100}}
};
const int=(value,max=1000000000)=>Number.isFinite(Number(value))&&value!==""&&Number(value)>=0&&Number(value)<=max?Number(value):NaN;
function preset(id){
 if(!Object.hasOwn(PRESETS,id))throw new Error("沒有這個示範人物");
 const x=PRESETS[id];
 return {id,profile:x.profile,income:x.income,hours:x.hours,bento:x.bento,
   meals:x.meals,savings:x.savings,expenses:{...x.expenses},challenge:{bento:false,power:false,medical:false}};
}
function calculate(model){
 if(!model || !["worker","retired"].includes(model.profile))return {ok:false,reason:"生活人物設定有誤"};
 const income=int(model.income),hours=int(model.hours,20000),bento=int(model.bento,10000),
       meals=int(model.meals,1000),savings=int(model.savings);
 if(![income,hours,bento,meals,savings].every(Number.isFinite))
  return {ok:false,reason:"金額或工作時間不正確，請檢查輸入數字。"};
 let expense=0;
 for(const [key] of CATEGORIES){
   const n=int(model.expenses?.[key]);
   if(!Number.isFinite(n))return {ok:false,reason:"生活開支數字不正確。"};
   expense+=n;
 }
 if(expense>1e9)return {ok:false,reason:"生活費數字超過可處理範圍"};
 const monthlyBento=model.challenge?.bento?meals*10:0;
 const monthlyPower=model.challenge?.power?500:0;
 const monthlyExtra=monthlyBento+monthlyPower;
 const monthlyCost=expense+monthlyExtra, remaining=income-monthlyCost;
 const medicalCost=model.challenge?.medical?30000:0;
 const savingsAfter=savings-medicalCost;
 const hoursPerMonth=(model.profile==="worker"&&hours>0)?hours:0;
 const hourly=hoursPerMonth>0?income/hoursPerMonth:null;
 const bentoMinutes=hourly>0?60*bento/hourly:null;
 const ratio=income>0?monthlyCost/income:null;
 const level=remaining<0?"short":ratio!==null&&ratio>=0.85?"tight":"balanced";
 const afterMonth=remaining>=0?"夠":"不夠";
 return {ok:true,profile:model.profile,income,baseExpense:expense,
  monthlyExtra,monthlyCost,monthlyBento,monthlyPower,remaining,
  originalRemaining:income-expense,dailyRemaining:remaining/30,
  share:ratio,level,afterMonth,
  bento,meals,bentoMinutes,
  savings,medicalCost,savingsAfter,medicalShortfall:Math.max(0,-savingsAfter),
  recoveryMonths:medicalCost>0&&remaining>0?Math.ceil(medicalCost/remaining):null,
  dataType:"假設情境，不是官方薪資、便當市價或醫院報價"};
}
return Object.freeze({PRESETS,CATEGORIES,preset,calculate});
});
