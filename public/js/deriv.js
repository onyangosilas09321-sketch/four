if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
// Deriv trading engine (browser WebSocket) with proposal -> buy flow (Over 2) + MG/OG compatible
window.Deriv = (function(){
  let ws=null, appId=null, token=null; let tickCount=0; let backoff=1000; let authorized=false;
  const symbol='R_10';
  const tickHandlers=[]; const pocMeta={}; let inFlightTrade=false; let pendingMeta=null;
  let noTickTimer=null; let endpointIdx=0; const endpoints=['wss://ws.derivws.com/websockets/v3','wss://ws.binaryws.com/websockets/v3'];

  function send(obj){ if(ws && ws.readyState===1) ws.send(JSON.stringify(obj)); }
  function subscribeTicks(){ send({ticks: symbol, subscribe:1}); }
  function rotateEndpoint(){ endpointIdx = (endpointIdx+1)%endpoints.length; }
  function startNoTickWatch(){ clearTimeout(noTickTimer); noTickTimer = setTimeout(()=>{ UI.toast('No ticks – switching endpoint','warning'); rotateEndpoint(); try{ ws && ws.close(); }catch(e){} }, 8000); }

  function connect(aId,tok){ appId=aId; token=tok; tickCount=0; authorized=false; inFlightTrade=false; pendingMeta=null; document.dispatchEvent(new CustomEvent('tick-count',{detail:tickCount}));
    if(ws) try{ws.close();}catch(e){};
    const url=`${endpoints[endpointIdx]}?app_id=${appId}`; ws = new WebSocket(url);
    ws.onopen=()=>{ subscribeTicks(); if(token){ send({authorize: token}); } startNoTickWatch(); };
    ws.onclose=()=>{ authorized=false; rotateEndpoint(); setTimeout(()=>connect(appId,token), Math.min(backoff,15000)); backoff=Math.min(backoff*2,15000); };
    ws.onmessage=async (m)=>{ const d=JSON.parse(m.data);
      if(d.error){ UI.toast(`Deriv: ${d.error.message}`,'danger'); inFlightTrade=false; if(d.echo_req && d.echo_req.authorize){ subscribeTicks(); } }
      if(d.msg_type==='authorize'){ authorized=true; send({ balance:1, subscribe:1 }); }
      if(d.msg_type==='tick'){
        clearTimeout(noTickTimer); startNoTickWatch();
        tickCount++; document.dispatchEvent(new CustomEvent('tick-count',{detail:tickCount}));
        const q=d.tick.quote, epoch=d.tick.epoch;
        try{ await API.saveTick({epoch, symbol, quote:q}); }catch(e){}
        // Feed both Analysis and Signal engines
        if(window.Analysis && window.Analysis.pushTick) { window.Analysis.pushTick(epoch, q); }
        if(window.Signal && window.Signal.pushTick) { window.Signal.pushTick(epoch, q); }
        // Update live price
        tickHandlers.forEach(fn=>{ try{ fn(d.tick); }catch(_e){} });
        const priceEl=document.getElementById('live-price'); const epochEl=document.getElementById('live-epoch');
        if(priceEl) priceEl.textContent = Number(q).toFixed(2);
        if(epochEl) epochEl.textContent = epoch;
        // Update live signal immediately
        const s = (window.Analysis&&window.Analysis.score)? window.Analysis.score() : (window.Signal&&window.Signal.score? window.Signal.score():null);
        if(s && s.ready){ const probEl=document.getElementById('live-prob'); const sigEl=document.getElementById('live-signal'); if(probEl) probEl.textContent=(s.confidence*100).toFixed(1)+'%'; if(sigEl){ sigEl.textContent = s.suggest==='OVER2' ? 'OVER 2' : 'WAIT'; sigEl.className = s.suggest==='OVER2' ? 'text-emerald-600 text-2xl font-semibold' : 'text-amber-600 text-2xl font-semibold'; } }
      }
      if(d.msg_type==='balance'){ const bal=d.balance && d.balance.balance; const cur=d.balance && d.balance.currency; if(bal!=null){ try{ await API.updateBalance({balance:bal, currency:cur}); }catch(e){} document.dispatchEvent(new CustomEvent('balance-update',{detail:{balance:bal, currency:cur}})); } }
      if(d.msg_type==='proposal'){
        const p=d.proposal; const er=d.echo_req||{}; if(!p||!er) return;
        if(er.proposal===1 && er.contract_type==='DIGITOVER' && String(er.barrier)==='2' && er.symbol===symbol){ const price=Number(p.ask_price); if(!isFinite(price)){ UI.toast('Invalid proposal price','danger'); inFlightTrade=false; return; } send({ buy: p.id, price }); return; }
      }
      if(d.msg_type==='buy'){
        inFlightTrade=false; const cid=d.buy && d.buy.contract_id; const buyPrice=d.buy && d.buy.buy_price || (pendingMeta?pendingMeta.amount:0);
        API.saveOrder({ contractType:'DIGITOVER', stake: (pendingMeta?pendingMeta.amount:buyPrice)||0, duration:1, durationUnit:'t', status:'open', request:d.echo_req, response:d });
        if(cid){ send({proposal_open_contract:1, contract_id:cid, subscribe:1}); pocMeta[cid]={ buyPrice, params: pendingMeta||{} }; pendingMeta=null; }
      }
      if(d.msg_type==='proposal_open_contract'){
        const poc=d.proposal_open_contract; const meta=pocMeta[poc.contract_id]; if(meta && poc.is_sold){ const sell=poc.sell_price||0; const buy=meta.buyPrice||0; const pnl=sell-buy; const detail={ pnl };
          await API.recordTrade({ stake: meta.params.amount||buy, buyPrice: buy, sellPrice: sell, contractId: poc.contract_id, openedEpoch: poc.date_start, predConf: meta.params.predConf, modelVersion: meta.params.modelVersion });
          document.dispatchEvent(new CustomEvent('trade-closed',{ detail })); delete pocMeta[poc.contract_id]; }
      }
    };
  }

  function tradeOver2(amount, meta){ if(!authorized){ UI.toast('Authorize first to trade','warning'); return; } if(inFlightTrade){ UI.toast('Order in progress...','warning'); return; } inFlightTrade=true; pendingMeta={ amount, predConf: meta&&meta.predConf, modelVersion: meta&&meta.modelVersion };
    send({ proposal:1, amount, basis:'stake', contract_type:'DIGITOVER', barrier:'2', currency:'USD', duration:1, duration_unit:'t', symbol });
  }

  function onTick(cb){ if(typeof cb==='function') tickHandlers.push(cb); }
  return { connect, tradeOver2, onTick };
})();