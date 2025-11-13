if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
(function(){
  const containerId='recent-trades';
  async function loadLogs(){
    try{
      const res = await API.listTrades({limit:20});
      const c = document.getElementById(containerId);
      if(!c) return;
      if(!res.success || !res.data.length){ c.innerHTML='<p class="text-neutral-500">No trades yet</p>'; return; }
      c.innerHTML = res.data.map(t=>{
        const dt = new Date((t.timestamp||0)*1000).toLocaleString();
        const pnl = t.pnl||0; const pnlCls = pnl>=0? 'text-emerald-600' : 'text-red-600';
        const conf = t.prediction_confidence!=null? (t.prediction_confidence*100).toFixed(1)+'%' : '—';
        return `<div class='flex justify-between border-b py-2'>
          <div class='text-neutral-600'>${dt} · ${t.contract_type} · id:${(t.contract_id||'').toString().slice(0,8)}</div>
          <div class='text-neutral-600'>stake $${(t.stake||0).toFixed(2)} · buy $${(t.buy_price||0).toFixed(2)} · sell $${(t.sell_price||0).toFixed(2)}</div>
          <div class='${pnlCls} font-semibold'>${pnl>=0?'+':''}$${pnl.toFixed(2)} · conf ${conf}</div>
        </div>`;
      }).join('');
    }catch(e){ /* ignore */ }
  }
  document.addEventListener('DOMContentLoaded', ()=>{ loadLogs(); setInterval(loadLogs, 5000); });
  document.addEventListener('trade-closed', loadLogs);
})();