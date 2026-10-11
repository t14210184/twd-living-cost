const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate,GROUPS}=require('../site/reality_math.js');
const expenses={food:'7000',housing:'10000',utilities:'2000',transport:'2500',health:'1000',care:'0',communication:'500',obligations:'2000',other:'0'};
const base={profile:'worker',income:'30000',expenses,monthlyHours:'176',bentoPrice:'100',savings:'50000',medicalShock:'30000',confirmedComplete:true};
test('exact net income and essential expense sum; no average wage default',()=>{
 const r=calculate(base);assert.equal(r.ok,true,r.reason);assert.equal(r.essentials,25000);assert.equal(r.residual,5000);assert.equal(r.completeness.complete,true);assert.equal(r.dataClass,'USER_INPUT_SCENARIO');
});
test('take-home labour minutes to buy the users actual meal',()=>{
 const r=calculate(base);assert.ok(Math.abs(r.bento.minutes-35.2)<1e-10);assert.ok(Math.abs(r.bento.hourlyTakeHome-30000/176)<1e-10);
});
test('pension income does not imply paid working minutes',()=>{
 const r=calculate({...base,profile:'retired'});assert.equal(r.ok,true);assert.equal(r.bento,null);
});
test('medical emergency cost is explicitly hypothetical, never a diagnosis',()=>{
 const r=calculate(base);assert.equal(r.shock.hypothetical,true);assert.equal(r.shock.remainingCash,20000);assert.equal(r.shock.noIncomeRunwayMonths,0.8);
});
test('cost exceeding savings shows shortage, not made-up bankruptcy probability',()=>{
 const r=calculate({...base,medicalShock:'80000'});assert.equal(r.shock.shortage,30000);assert.equal(r.shock.noIncomeRunwayMonths,0);
});
test('incomplete input is not falsely marked complete',()=>{
 const r=calculate({...base,expenses:{food:'10000',housing:'7000'}});assert.equal(r.ok,true);assert.equal(r.completeness.complete,false);assert.equal(r.completeness.filled,2);
});
test('missing income rejected, genuine zero income accepted',()=>{
 assert.equal(calculate({...base,income:''}).ok,false);
 const r=calculate({...base,profile:'other',income:'0'});assert.equal(r.ok,true);assert.equal(r.share,null);assert.equal(r.residual,-25000);
});
test('malformed or out-of-range income and negative expenses rejected',()=>{
 for(const income of ['-1','not-a-number','Infinity','1000000001'])assert.equal(calculate({...base,income}).ok,false);
 assert.equal(calculate({...base,expenses:{food:'-100'}}).ok,false);
});
test('no invented Pingtung bento price or Japan inflation ranking',()=>{
 const r=calculate(base);assert.equal(r.ok,true);assert.equal('historicalBentoInflation' in r,false);assert.equal('taiwanJapanRanking' in r,false);
});
test('work hours missing means no fictional 176-hour assumption',()=>{
 const r=calculate({...base,monthlyHours:''});assert.equal(r.ok,true);assert.equal(r.bento,null);
});
test('all nine essential expense categories included',()=>{
 assert.equal(GROUPS.length,9);assert.equal(calculate(base).breakdown.length,9);
});
