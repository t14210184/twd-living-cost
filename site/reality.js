/* v7 P0 Taiwan-dollar household reality. No localStorage, cookies, network, or telemetry. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const keys=window.RealityMath.GROUPS;
  const fmt=n=>'NT$ '+Math.round(n).toLocaleString('zh-TW');
  const info={worker:'上班收入',retired:'退休／津貼',other:'其他台幣收入'};
  function inputValue(id){return $(id)?.value ?? '';}
  function status(s){$('reality-status').textContent=s;}
  function render(){
    const p=document.querySelector('input[name="reality-profile"]:checked')?.value || 'worker';
    const expenses=Object.fromEntries(keys.map(k=>[k,inputValue('reality-'+k)]));
    const r=window.RealityMath.calculate({profile:p,income:inputValue('reality-income'),expenses,
      bentoPrice:inputValue('reality-bento'),monthlyHours:inputValue('reality-hours'),
      savings:inputValue('reality-savings'),medicalShock:inputValue('reality-shock'),
      confirmedComplete:$('reality-confirm')?.checked});
    $('reality-worker-only').hidden=p!=='worker';
    $('reality-income-label').textContent=p==='worker'?'每月實際入帳的工作收入（扣掉已代扣的部分）':
      p==='retired'?'每月實際收到的退休金、年金或津貼':'每月實際能使用的台幣收入';
    if(!r.ok){
      status(r.reason);for(const id of ['reality-left','reality-basket','reality-shock-result']) $(id).textContent='—';
      $('reality-bento-result').textContent=p==='worker'?'輸入實際便當售價及工作時數後顯示':'退休／無工作收入，不用勞動分鐘衡量';
      $('reality-takeaway').textContent='填寫自己的台幣收入與至少一項必要生活開支後，才會顯示個人試算。';
      $('reality-data-check').textContent='網站沒有預設「全台平均薪資」或冒充屏東的統計樣本。';
      return;
    }
    const sign=r.residual>=0?'剩餘':'不足';
    const coverage=r.completeness.complete?'已自行確認必要支出填寫完整':'目前只是已輸入項目的試算，未填必要支出可能使結餘被高估';
    status('已計算你剛輸入的金額。'+coverage+'。');
    $('reality-left').textContent=(r.residual>=0?'＋':'−')+fmt(Math.abs(r.residual));
    $('reality-left').className='big '+(r.residual>=0?'':'reality-negative');
    $('reality-basket').textContent=fmt(r.essentials);
    $('reality-data-check').textContent='目前填入 '+r.completeness.filled+'／'+r.completeness.total+' 類必要支出；'+
      '這些是使用者自行輸入的金額，並非政府抽樣得出的屏東生活成本。';
    if(r.bento) {
      $('reality-bento-result').textContent=r.bento.minutes.toFixed(1)+' 分鐘工作時間';
      $('reality-bento-detail').textContent='便當售價 '+fmt(r.bento.price)+'；以你輸入的「月實領工作收入／當月實際工作時數」計算。店家實售價由使用者提供。';
    }else{
      $('reality-bento-result').textContent=p==='worker'?'尚缺實際售價／工作時數':'不適用勞動分鐘';
      $('reality-bento-detail').textContent=p==='worker'?'不猜測當地便當價格；請輸入你最近買到的那份。':'退休與津貼的購買壓力將以支出占收入比例顯示。';
    }
    if(r.shock){
      $('reality-shock-result').textContent=r.shock.shortage>0?'原有儲蓄不足 '+fmt(r.shock.shortage):'扣除假設自費後儲蓄剩 '+fmt(r.shock.remainingCash);
      $('reality-shock-detail').textContent='這只是使用者假設的一次性自付金額。若之後完全沒有收入，以目前已填必要開支估算可支付 '+r.shock.noIncomeRunwayMonths.toFixed(1)+' 個月；未包含尚未輸入的開支與補助。';
    } else {
      $('reality-shock-result').textContent='可自行試算';
      $('reality-shock-detail').textContent='未輸入儲蓄與醫療自付金額，不推定任何疾病費用或破產機率。';
    }
    const share=r.share==null?'沒有收入可負擔必要支出':
      '目前已輸入的必要支出約占收入 '+(r.share*100).toFixed(1)+'%。';
    $('reality-takeaway').textContent=info[p]+'情境下，每月實際入帳 '+fmt(r.income)+
      '，已列的必要開支 '+fmt(r.essentials)+'，暫算'+sign+' '+fmt(Math.abs(r.residual))+'。'+share+
      (r.completeness.complete?'':' 未確認其他項目以前，不應把暫估餘額當成真正能存下的錢。');
  }
  const root=$('reality');if(!root)return;
  root.addEventListener('input',render);root.addEventListener('change',render);render();
})();
