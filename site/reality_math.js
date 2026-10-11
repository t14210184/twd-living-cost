/* v7.0 Pingtung reality calculator: user observations are never government observations.
 * Pure, tested; no browsing, analytics collection, or user-data persistence. MIT licensed. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RealityMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const GROUPS = Object.freeze(['food','housing','utilities','transport','health','care','communication','obligations','other']);
  const PROFILES = Object.freeze(['worker','retired','other']);
  function parse(raw, opts={}) {
    if (raw === '' || raw == null) return opts.required ? null : 0;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= (opts.limit ?? 1000000000) ? n : NaN;
  }
  function calculate(request) {
    const profile=request?.profile || 'worker';
    if (!PROFILES.includes(profile)) return {ok:false, reason:'收入來源不正確。'};
    const income=parse(request.income, {required:true});
    if (income === null) return {ok:false, reason:'請先填寫每月實際入帳的台幣收入。'};
    if (!Number.isFinite(income)) return {ok:false, reason:'每月收入須為有效的非負金額。'};
    let essentials=0, filled=0, positive=0;
    const breakdown=[];
    for (const key of GROUPS) {
      const raw=request.expenses?.[key];
      if (raw != null && raw !== '') filled++;
      const value=parse(raw);
      if (!Number.isFinite(value)) return {ok:false, reason:'必要支出金額有錯誤，請確認沒有負數或文字。'};
      essentials+=value;
      if(value>0) positive++;
      breakdown.push({key,value,provided:raw != null && raw !== ''});
    }
    if (positive===0) return {ok:false, reason:'請至少填入一項實際必要支出。'};
    if (essentials>1000000000) return {ok:false, reason:'必要支出總額不在可處理範圍。'};
    const residual=income-essentials;
    const share=income>0 ? essentials/income : null;
    const complete=Boolean(request.confirmedComplete) && filled===GROUPS.length;
    const realHourly = profile==='worker' ? parse(request.monthlyHours) : null;
    const bento=parse(request.bentoPrice);
    let meal=null;
    if(profile==='worker' && request.bentoPrice != null && request.bentoPrice!=='' && bento>0 &&
       request.monthlyHours != null && request.monthlyHours!=='' && realHourly>0 && income>0) {
      meal={price:bento,hourlyTakeHome:income/realHourly,minutes:60*bento/(income/realHourly)};
    }
    if (request.bentoPrice != null && request.bentoPrice!=='' && !Number.isFinite(bento))
      return {ok:false, reason:'便當實際售價格式錯誤。'};
    if (request.monthlyHours != null && request.monthlyHours!=='' && !Number.isFinite(realHourly) && profile==='worker')
      return {ok:false, reason:'每月實際工作時數格式錯誤。'};
    const savings=parse(request.savings);
    const medicalShock=parse(request.medicalShock);
    if(!Number.isFinite(savings) || !Number.isFinite(medicalShock))
      return {ok:false, reason:'儲蓄或假設醫療自付金額格式錯誤。'};
    const medicalEntered = request.medicalShock !== '' && request.medicalShock != null;
    const savingsEntered = request.savings !== '' && request.savings != null;
    const availableAfterShock=savings-medicalShock;
    const shock=savingsEntered && medicalEntered ? {
      inputOnly:true, hypothetical:true, savings, medicalShock,
      remainingCash:availableAfterShock,
      shortage:Math.max(0,-availableAfterShock),
      noIncomeRunwayMonths:Math.max(0,availableAfterShock)/essentials
    } : null;
    return {ok:true,profile,income,essentials,residual,share,
      completeness:{filled,total:GROUPS.length,complete,positive},breakdown,
      bento:meal,shock,
      dataClass:'USER_INPUT_SCENARIO',
      caveat:!complete?'目前尚未逐項確認全部必要生活費；剩餘金額可能高估。':'以上金額由使用者自行填寫，非官方人口統計。'};
  }
  return Object.freeze({calculate,GROUPS});
});
