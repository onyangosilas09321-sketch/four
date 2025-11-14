// AutoAgent: staged threshold controller using Analysis.score() when available; fallbacks keep existing behavior
(function(){
  let inFlight=false; let lastTradeAt=0; let ticksSeen=0; const minTicks=10; const stageCooldownMs=5000; const T1=0.60, T2=0.65, T3=0.68; let stage=0;
  function progMode(){ return localStorage.getItem('prog_mode')||'none'; }
  function mgFactor(){ const f=parseFloat(localStorage.getItem('mg_factor')||'2'); return isFinite(f)&&f>1?f:2; }
  function mgMax(){ const m=parseInt(localStorage.getItem('mg_max_steps')||'3'); return isFinite(m)&&m>=0?m:3; }
  function mgStep(){ return parseInt(localStorage.getItem('mg_step')||'0'); }
  function setMgStep(s){ localStorage.setItem('mg_step', String(Math.max(0,s))); }
  function ogSeriesPnl(){ return parseFloat(localStorage.getItem('og_series_pnl')||'0'); }
  function setOgSeriesPnl(v){ localStorage.setItem('og_series_pnl', String(v)); }
  function ogStake(){ const v=parseFloat(localStorage.getItem('og_current_stake')||'0'); return isFinite(v)&&v>0? v : 0; }
  function setOgStake(v){ localStorage.setItem('og_current_stake', String(Math.max(0,v))); }
  function ogTarget(){ const v=parseFloat(localStorage.getItem('og_target')||'1'); return isFinite(v)&&v>0? v : 1; }
  function baseStake(){ const v=parseFloat(localStorage.getItem('auto_stake')||localStorage.getItem('auto_stake_base')||'1'); return (isFinite(v)&&v>0)? v : 1; }
  function nextStake(){ const mode=progMode(); if(mode==='mg'){ const s=Math.min(mgStep(), mgMax()); return baseStake()*Math.pow(mgFactor(), s);} if(mode==='og'){ let st=ogStake(); if(st<=0) st=baseStake(); return st;} return baseStake(); }
  function enabled(){ return localStorage.getItem('auto_on')==='1'; }
  async function tryTrade(conf){ const can=await API.canTrade(); if(!can||!can.allowed) return false; inFlight=true; const amt=nextStake(); window.Deriv.tradeOver2(amt, {predConf:conf, modelVersion:'adv-v1'}); lastTradeAt=Date.now(); return true; }
  function getScore(){ if(window.Analysis&&window.Analysis.score) return window.Analysis.score(); if(window.Signal&&window.Signal.score) return window.Signal.score(); return null; }
  async function tickHandler(){ try{ if(!enabled()) return; if(inFlight) return; if(ticksSeen<minTicks) return; if(Date.now()-lastTradeAt<stageCooldownMs) return; const s=getScore(); if(!s||!s.ready) return; const conf=s.confidence||0; const over2=s.suggest==='OVER2'; if(stage===0){ if(conf>=T1&&over2){ const ok=await tryTrade(conf); if(ok){ stage=1; } } }
      else if(stage===1){ if(conf>=T2&&over2){ const ok=await tryTrade(conf); if(ok){ stage=2; } } else if(conf<T1){ stage=0; } }
      else if(stage===2){ if(conf>=T3&&over2){ await tryTrade(conf); } else if(conf<T3){ stage=0; } } }catch(e){} }
  document.addEventListener('tick-count',(e)=>{ ticksSeen=e.detail||0; tickHandler();});
  document.addEventListener('trade-closed',(e)=>{ inFlight=false; const pnl=(e.detail&&e.detail.pnl)||0; const mode=progMode(); if(mode==='mg'){ if(pnl<=0) setMgStep(mgStep()+1); else setMgStep(0);} else if(mode==='og'){ let series=ogSeriesPnl()+pnl; setOgSeriesPnl(series); let st=ogStake(); if(st<=0) st=baseStake(); const target=ogTarget()*baseStake(); if(pnl>0){ if(series>=target){ setOgSeriesPnl(0); setOgStake(baseStake()); } else { setOgStake(st+baseStake()); } } else { setOgStake(st);} } });
  setInterval(()=>{ if(inFlight && Date.now()-lastTradeAt>15000) inFlight=false; },3000);
  window.AutoAgent={ reload:()=>{} };
})();