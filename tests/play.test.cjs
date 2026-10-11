const test=require("node:test"),assert=require("node:assert/strict");
const {preset,calculate,PRESETS,CATEGORIES}=require("../site/play_math.js");
test("four presets, all clearly identified as illustrative",()=>{
 assert.deepEqual(Object.keys(PRESETS),["worker","couple","elder","parent"]);
 for(const key of Object.keys(PRESETS)){
   const r=calculate(preset(key));assert.equal(r.ok,true,r.reason);
   assert.match(r.dataType,/假設情境/);
 }
});
test("default low-income worker: take-home 30000 - necessities 26900 = 3100",()=>{
 const r=calculate(preset("worker"));
 assert.equal(r.income,30000);assert.equal(r.baseExpense,26900);assert.equal(r.remaining,3100);
 assert.equal(r.level,"tight");assert.equal(r.medicalCost,0);
 assert.ok(Math.abs(r.bentoMinutes-35.2)<1e-8);
});
test("couple two salaries has household-wide hours, not single worker hours",()=>{
 const p=preset("couple"),r=calculate(p);
 assert.equal(r.income,58000);assert.equal(r.baseExpense,55400);assert.equal(r.remaining,2600);
 assert.ok(Math.abs(r.bentoMinutes-(60*110*352/58000))<1e-9);
});
test("retiree has 18000 fixed income and no fictional paid work hours",()=>{
 const r=calculate(preset("elder"));assert.equal(r.baseExpense,15500);
 assert.equal(r.remaining,2500);assert.equal(r.bentoMinutes,null);
});
test("single caregiver may already be short of necessary expenses, no shame messaging inferred",()=>{
 const r=calculate(preset("parent"));assert.equal(r.baseExpense,35500);
 assert.equal(r.remaining,-3500);assert.equal(r.level,"short");
});
test("10 TWD increase for 22 bento meals only adds 220 monthly, not full bento spend",()=>{
 const p=preset("worker");p.challenge.bento=true;const r=calculate(p);
 assert.equal(r.monthlyBento,220);assert.equal(r.monthlyCost,27120);
 assert.equal(r.remaining,2880);assert.equal(r.monthlyPower,0);
});
test("electricity rise adds 500 to monthly costs",()=>{
 const p=preset("worker");p.challenge.power=true;
 assert.equal(calculate(p).remaining,2600);
});
test("combined bento and utilities stress is additive",()=>{
 const p=preset("worker");p.challenge.bento=true;p.challenge.power=true;
 const r=calculate(p);assert.equal(r.monthlyExtra,720);assert.equal(r.remaining,2380);
});
test("one-time medical 30000 is deducted only from savings, NEVER monthly expenses",()=>{
 const p=preset("worker");p.challenge.medical=true;
 const r=calculate(p);assert.equal(r.monthlyCost,26900);assert.equal(r.remaining,3100);
 assert.equal(r.savingsAfter,0);assert.equal(r.medicalShortfall,0);
 assert.equal(r.medicalCost,30000);
});
test("health emergency with low savings reports gap, not bankruptcy risk",()=>{
 const p=preset("parent");p.challenge.medical=true;
 const r=calculate(p);assert.equal(r.savingsAfter,-20000);
 assert.equal(r.medicalShortfall,20000);assert.equal(r.recoveryMonths,null);
});
test("editable net pay and daily remainder update correctly",()=>{
 const p=preset("worker");p.income=29000;
 const r=calculate(p);assert.equal(r.remaining,2100);assert.equal(r.dailyRemaining,70);
});
test("expense input lower than zero or invalid is rejected rather than hiding the missing item",()=>{
 const p=preset("worker");p.expenses.food=-100;assert.equal(calculate(p).ok,false);
 p.expenses.food=9000;p.income="not a number";assert.equal(calculate(p).ok,false);
});
test("reset preset creates fresh independent copies",()=>{
 const a=preset("worker"),b=preset("worker");
 a.expenses.food=1;a.challenge.medical=true;
 assert.equal(b.expenses.food,9000);assert.equal(b.challenge.medical,false);
});
test("only nine explicitly labeled household essentials; no official Pingtung averages embedded",()=>{
 assert.equal(CATEGORIES.length,9);
 for(const p of Object.values(PRESETS)){assert.equal(Object.keys(p.expenses).length,9);}
 assert.ok(!JSON.stringify(PRESETS).includes("71165"));
 assert.ok(!JSON.stringify(PRESETS).includes("Pingtung average"));
});
