if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
// Live recent trades refresher (poll + event)
(function(){
  const elId='recent-trades';
  async function refresh(){ try{ const res=await API.listTrades({limit:20}); const c=document.getElementById(elId); if(!c) return; if(!res.success||!res.data.length){ c.innerHTML='<p class="text-neutral-500">No trades yet</p>'; return; }
    c.innerHTML = res.data.map(t=>{ const dt=new Date((t.timestamp||0)*1000).toLocaleString(); const pnl=t.pnl||0; const cls=pnl>=0?'text-emerald-600':'text-red-600'; const conf=t.prediction_confidence!=null? (t.prediction_confidence*100).toFixed(1)+'%':'—';
      return `<div class='flex justify-between border-b py-2'>
        <div class='text-neutral-600'>${dt} · ${t.contract_type} · ${t.contract_id?String(t.contract_id).slice(0,8):''}</div>
        <div class='text-neutral-600'>stake $${(t.stake||0).toFixed(2)} · buy $${(t.buy_price||0).toFixed(2)} · sell $${(t.sell_price||0).toFixed(2)}</div>
        <div class='${cls} font-semibold'>${pnl>=0?'+':''}$${pnl.toFixed(2)} · conf ${conf}</div>
      </div>`; }).join('');
  }catch(e){} }
  document.addEventListener('DOMContentLoaded', ()=>{ refresh(); setInterval(refresh, 2000); });
  document.addEventListener('trade-closed', refresh);
})();