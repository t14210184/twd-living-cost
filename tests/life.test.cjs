const assert=require("node:assert/strict");
const test=require("node:test");
const {calculate,shiftMonth}=require("../site/life_math.js");

function fixture() {
  const monthly={};
  for(let y=2015;y<=2026;y++){
    for(let m=1;m<=12;m++){
      const mon=y+"M"+String(m).padStart(2,"0");
      if(mon>"2026M09")break;
      monthly[mon]=[(mon==="2026M09"?33:30),.2,36,4.4,39,22,.023,23];
    }
  }
  const months=Object.keys(monthly);
  function item(label,old,now){
    const observations=Object.fromEntries(months.map(m=>[m,m==="2026M09"?now:old]));
    return {label,observations};
  }
  const cpi={items:{
    rice:item("米",100,150),eggs:item("雞蛋",100,100),
    rent:item("房租",100,120),electricity:item("電費",100,110)
  }};
  return {fx:{columns:["date","USD","JPY","EUR","CNY","GBP","AUD","KRW","SGD"],monthly},cpi};
}
const base={months:12,currency:"USD",expenses:{rent:1200},mode:"foreign",twdIncome:30000,foreignIncome:1000};

test("one foreign-currency amount: +10% FX versus +20% costs = -8.3333% purchasing power",()=>{
  const f=fixture();const result=calculate({...f,...base});
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.start,"2025M09");
  assert.equal(result.end,"2026M09");
  assert.equal(result.currentExpense,1200);
  assert.equal(result.priorExpense,1000);
  assert.ok(Math.abs(result.fxChange-.1)<1e-12);
  assert.ok(Math.abs(result.priceChange-.2)<1e-12);
  assert.ok(Math.abs(result.purchasingChange-(-1/12))<1e-12);
  assert.equal(result.incomeStart,30000);
  assert.equal(result.incomeEnd,33000);
  assert.equal(result.purchasingStart,30);
  assert.equal(result.purchasingEnd,27.5);
  assert.equal(result.series[0].month,"2025M09");
  assert.equal(result.series.at(-1).month,"2026M09");
});
test("TWD salary must not be multiplied by foreign exchange growth",()=>{
  const f=fixture();const result=calculate({...f,...base,mode:"twd"});
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.incomeStart,30000);
  assert.equal(result.incomeEnd,30000);
  assert.ok(Math.abs(result.purchasingChange-(-1/6))<1e-12);
  assert.ok(Math.abs(result.fxChange-0.1)<1e-12);
});
test("personal living basket uses each official CPI component and user-defined current spend",()=>{
  const f=fixture();const result=calculate({...f,...base,expenses:{rent:1200,rice:600}});
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.currentExpense,1800);
  assert.equal(result.priorExpense,1400);
  assert.ok(Math.abs(result.priceChange-(1800/1400-1))<1e-12);
  assert.ok(Math.abs(result.purchasingChange-(1.1/(1800/1400)-1))<1e-12);
});
test("6/12/36/60/120 months are exact comparable months",()=>{
  const f=fixture();
  for(const months of [6,12,36,60,120]){
    const r=calculate({...f,...base,months});
    assert.equal(r.ok,true,r.reason);
    assert.equal(r.start,shiftMonth("2026M09",-months));
    assert.equal(r.end,"2026M09");
    assert.equal(r.series.length,months+1);
  }
});
test("never interpolate missing CPI at start even if adjacent months exist",()=>{
  const f=fixture();delete f.cpi.items.rent.observations["2025M09"];
  const r=calculate({...f,...base});
  assert.equal(r.ok,false);
  assert.match(r.reason,/缺少起點|缺少/);
});
test("selected item missing must block full basket rather than silently ignore it",()=>{
  const f=fixture();const r=calculate({...f,...base,expenses:{rent:100,gas:50}});
  assert.equal(r.ok,false);assert.match(r.reason,/沒有官方物價資料/);
});
test("reject negative, unbounded or zero household spending and invalid income",()=>{
  const f=fixture();
  for(const expenses of [{rent:-20},{rent:0},{rent:1e11}]){
    assert.equal(calculate({...f,...base,expenses}).ok,false);
  }
  assert.equal(calculate({...f,...base,foreignIncome:0}).ok,false);
});
test("foreign income purchasing power does not claim to prove imported-inflation causality",()=>{
  const f=fixture(),r=calculate({...f,...base});
  assert.equal(r.ok,true);assert.ok(!("causalEffect" in r));
});
