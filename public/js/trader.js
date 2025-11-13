if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
// Trader orchestrates safe manual trading for R_10 DIGITOVER barrier 2
(function(){
  const STATE = { inFlight:false, lastManual:0, manualCooldownMs:2000 };
  function canManual(){ return !STATE.inFlight && (Date.now()-STATE.lastManual>STATE.manualCooldownMs); }
  async function tradeOver2(amount){
    if(!canManual()){ UI.toast('Please wait before sending another order','warning'); return; }
    STATE.inFlight=true; STATE.lastManual=Date.now();
    try{
      if(!amount || !isFinite(amount) || amount<=0){ UI.toast('Invalid stake amount','danger'); STATE.inFlight=false; return; }
      Deriv.tradeOver2(Number(amount), { predConf:null, modelVersion:'manual' });
    }catch(e){ UI.toast('Trade error','danger'); STATE.inFlight=false; }
  }
  document.addEventListener('trade-closed', ()=>{ STATE.inFlight=false; });
  setInterval(()=>{ if(STATE.inFlight && (Date.now()-STATE.lastManual>10000)) STATE.inFlight=false; }, 2000);
  window.Trader = { tradeOver2 };
})();