const validations = require('./lib/validations');
async function getSingleton(className, useMasterKey = true) { const q = new Parse.Query(className); q.ascending('createdAt'); const obj = await q.first({ useMasterKey }); if (obj) return obj; const C = Parse.Object.extend(className); const inst = new C(); return await inst.save({}, { useMasterKey }); }
const now = () => new Date();

Parse.Cloud.define('health', async () => ({ ok: true, ts: now().toISOString() }));

// SETTINGS & BALANCE
Parse.Cloud.define('updateBalance', async (req)=>{ const { balance, currency } = req.params||{}; const state = await getSingleton('SystemState'); if(typeof balance==='number') { state.set('accountBalance', balance); state.set('availableMargin', balance); } if(currency) state.set('currency', currency); await state.save(null,{useMasterKey:true}); return { success:true }; });
Parse.Cloud.define('getSettings', async ()=>{ const s = await getSingleton('Settings'); return { success:true, data: s.toJSON() }; });
Parse.Cloud.define('saveSettings', async (req)=>{ const s = await getSingleton('Settings'); const payload=req.params||{}; try{ validations.validateSettings(payload); }catch(_e){} Object.keys(payload).forEach(k=> s.set(k, payload[k])); await s.save(null,{useMasterKey:true}); return { success:true }; });

// GUARD
async function dailyPnL(){ const q = new Parse.Query('Trade'); const d0=new Date(); const from=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()); q.greaterThanOrEqualTo('timestamp', from); const trades = await q.find({useMasterKey:true}); return trades.reduce((s,t)=> s+(t.get('pnl')||0),0); }
Parse.Cloud.define('canTrade', async ()=>{ const s = await getSingleton('Settings'); const enabled = s.get('tradingEnabled')!==false; if(!enabled) return { allowed:false, reason:'Trading disabled' }; const maxLoss = s.get('maxDailyLoss'); if(typeof maxLoss==='number'){ const d = await dailyPnL(); if(d < -Math.abs(maxLoss)) return { allowed:false, reason:'Max daily loss reached' }; } return { allowed:true }; });

// TICKS
Parse.Cloud.define('saveTick', async (req)=>{ const { epoch, symbol, quote } = req.params||{}; if(!epoch || !symbol || quote==null) throw 'Missing tick fields'; const Tick = Parse.Object.extend('Tick'); const t = new Tick(); t.set('ts', new Date(epoch*1000)); t.set('epoch', epoch); t.set('symbol', symbol); t.set('quote', quote); await t.save(null, { useMasterKey: true }); return { success:true }; });

// ORDERS & TRADES
Parse.Cloud.define('saveOrder', async (req)=>{ const payload = req.params || {}; const resp = payload.response || {}; const o = new (Parse.Object.extend('Order'))(); if(resp.buy){ o.set('orderId', resp.buy.purchase_id || resp.buy.contract_id || null); o.set('buyPrice', resp.buy.buy_price||0); } o.set('contractType', payload.contractType||'DIGITOVER'); o.set('stake', payload.stake||0); o.set('duration', payload.duration||1); o.set('durationUnit', payload.durationUnit||'t'); o.set('status', payload.status||'open'); o.set('request', payload.request||{}); o.set('response', resp); o.set('ts', new Date()); await o.save(null, { useMasterKey: true }); return { success:true, id:o.id }; });
Parse.Cloud.define('recordTrade', async (req)=>{ const { stake, buyPrice, sellPrice, contractId, openedEpoch, predConf, modelVersion } = req.params||{}; const tObj = new (Parse.Object.extend('Trade'))(); tObj.set('timestamp', openedEpoch? new Date(openedEpoch*1000): new Date()); tObj.set('tradeId', contractId||''); tObj.set('contractId', contractId||''); tObj.set('contractType', 'DIGITOVER'); tObj.set('stake', stake||0); tObj.set('duration', 1); tObj.set('durationUnit', 't'); tObj.set('buyPrice', buyPrice||0); tObj.set('sellPrice', sellPrice||0); tObj.set('pnl', (sellPrice||0) - (buyPrice||0)); if(predConf!=null) tObj.set('predictionConfidence', predConf); if(modelVersion) tObj.set('modelVersion', modelVersion); tObj.set('status', 'closed'); await tObj.save(null, { useMasterKey: true }); return { success:true, id:tObj.id }; });

// TRADES LIST
Parse.Cloud.define('listTrades', async (req)=>{ const { limit=20 } = req.params||{}; const q=new Parse.Query('Trade'); q.descending('timestamp'); q.limit(Math.min(limit,1000)); const res=await q.find({useMasterKey:true}); return { success:true, data: res.map(t=>({ timestamp: Math.floor((t.get('timestamp')||t.createdAt).getTime()/1000), trade_id:t.get('tradeId')||t.id, contract_id:t.get('contractId')||'', contract_type: t.get('contractType')||'DIGITOVER', stake:t.get('stake')||0, duration: t.get('duration')||1, duration_unit: t.get('durationUnit')||'t', buy_price: t.get('buyPrice')||0, sell_price: t.get('sellPrice')||0, pnl:t.get('pnl')||0, prediction_confidence: t.get('predictionConfidence')||null, model_version: t.get('modelVersion')||null, status: t.get('status')||'closed' })) };
});

// METRICS (light)
Parse.Cloud.define('getMetrics', async () => { const state = await getSingleton('SystemState'); const totalTrades = await (new Parse.Query('Trade')).count({ useMasterKey: true }); const winningTrades = await (new Parse.Query('Trade')).greaterThan('pnl', 0).count({ useMasterKey: true }); const recent = await (new Parse.Query('Trade')).descending('timestamp').limit(1000).find({ useMasterKey: true }); const totalPnl = recent.reduce((s, t) => s + (t.get('pnl') || 0), 0); const dailyPnl = recent.reduce((s, t) => (t.get('timestamp') && (new Date(t.get('timestamp')).toDateString()===new Date().toDateString())? s+(t.get('pnl')||0): s), 0); const out = { state: { account_balance: state.get('accountBalance') || 0, available_margin: state.get('availableMargin') || 0, currency: state.get('currency')||'USD', daily_pnl: dailyPnl, total_pnl: totalPnl, winning_trades: winningTrades, total_trades: totalTrades }, performance: {} }; return { success: true, data: out }; });

// Decision logs and signal stats
Parse.Cloud.define('logDecision', async (req)=>{ const payload=req.params||{}; const D=Parse.Object.extend('DecisionLog'); const d=new D(); d.set('ts', now()); Object.keys(payload).forEach(k=>d.set(k,payload[k])); await d.save(null,{useMasterKey:true}); return {success:true}; });
Parse.Cloud.define('updateSignalStat', async (req)=>{ const { trendHit, momentumHit, volHit, digitHit } = req.params||{}; const q=new Parse.Query('SignalStat'); q.equalTo('name','default'); let s=await q.first({useMasterKey:true}); if(!s){ const S=Parse.Object.extend('SignalStat'); s=new S(); s.set('name','default'); s.set('trendHits',0); s.set('trendSamples',0); s.set('momentumHits',0); s.set('momentumSamples',0); s.set('volHits',0); s.set('volSamples',0); s.set('digitHits',0); s.set('digitSamples',0); }
  if(trendHit!=null){ s.increment('trendSamples'); if(trendHit) s.increment('trendHits'); }
  if(momentumHit!=null){ s.increment('momentumSamples'); if(momentumHit) s.increment('momentumHits'); }
  if(volHit!=null){ s.increment('volSamples'); if(volHit) s.increment('volHits'); }
  if(digitHit!=null){ s.increment('digitSamples'); if(digitHit) s.increment('digitHits'); }
  await s.save(null,{useMasterKey:true}); return {success:true}; });

// ML: train / get / predict / accuracy
const mlLib = require('./lib/ml');
const feat = require('./lib/features');

Parse.Cloud.define('trainModel', async (req)=>{
  const { lookback=2000, horizon=1, minSamples=100, valSplit=0.2, balanceStrategy='oversample' } = req.params||{};
  const q = new Parse.Query('Tick'); q.ascending('epoch'); q.limit(Math.min(lookback+5000,10000)); const ticks = await q.find({useMasterKey:true});
  if(!ticks || ticks.length<minSamples+10) throw 'Not enough tick data to train';
  const quotes = ticks.map(t=> Number(t.get('quote')||0)); const epochs = ticks.map(t=> Math.floor((t.get('ts')||t.createdAt).getTime()/1000));
  const rawX=[]; const rawY=[]; const W = 120;
  for(let i=W; i<quotes.length - horizon; i++){
    try{
      const fv = feat.featureVectorWindow(quotes, epochs, i, W, { extended:true });
      const nextQuote = quotes[i+horizon]||quotes[i]; const digit = feat.lastDigitFromQuote(nextQuote); const label = digit>2?1:0;
      rawX.push(fv); rawY.push(label);
    }catch(e){ }
  }
  if(rawX.length < minSamples) throw 'Insufficient training samples after windowing';

  // class balance (simple strategies)
  let X = rawX.slice(); let y = rawY.slice();
  const counts = y.reduce((acc,v)=>{ acc[v]=(acc[v]||0)+1; return acc; }, {});
  const n0 = counts[0]||0, n1 = counts[1]||0;
  if(balanceStrategy==='oversample' && n0 && n1){
    if(Math.max(n0,n1)/Math.min(n0,n1) > 1.2){
      const majority = n0>n1?0:1; const minority = majority===0?1:0;
      const idxs = y.map((v,i)=> v===minority? i : -1).filter(i=>i>=0);
      const target = Math.max(n0,n1);
      while((y.filter(v=>v===minority).length) < target){ const i = idxs[Math.floor(Math.random()*idxs.length)]; X.push(rawX[i]); y.push(rawY[i]); }
    }
  } else if(balanceStrategy==='undersample' && n0 && n1){
    if(Math.max(n0,n1)/Math.min(n0,n1) > 1.2){
      const minority = n0>n1?1:0; const majority = minority===0?1:0;
      const keep = Math.min(n0,n1); const newX=[]; const newY=[]; let keptMaj=0, keptMin=0;
      for(let i=0;i<rawY.length;i++){
        if(rawY[i]===minority && keptMin<keep){ newX.push(rawX[i]); newY.push(rawY[i]); keptMin++; }
        else if(rawY[i]===majority && keptMaj<keep){ newX.push(rawX[i]); newY.push(rawY[i]); keptMaj++; }
      }
      X=newX; y=newY;
    }
  }

  // shuffle and split into train/validation
  const indices = X.map((_,i)=>i);
  for(let i=indices.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=indices[i]; indices[i]=indices[j]; indices[j]=t; }
  const valCount = Math.max(1, Math.floor(indices.length * valSplit));
  const valIdx = new Set(indices.slice(0,valCount));
  const Xtrain=[], ytrain=[], Xval=[], yval=[];
  for(let i=0;i<indices.length;i++){ const idx=indices[i]; if(valIdx.has(idx)){ Xval.push(X[idx]); yval.push(y[idx]); } else { Xtrain.push(X[idx]); ytrain.push(y[idx]); } }

  // train on Xtrain
  const model = mlLib.trainEnsemble(Xtrain,ytrain, {});

  // evaluate on validation
  let correct=0, tp=0, fp=0, tn=0, fn=0;
  for(let i=0;i<Xval.length;i++){
    try{ const p = mlLib.predictEnsemble(model, Xval[i]); const pred = p>0.5?1:0; const actual = yval[i]; if(pred===actual) correct++; if(pred===1 && actual===1) tp++; if(pred===1 && actual===0) fp++; if(pred===0 && actual===0) tn++; if(pred===0 && actual===1) fn++; }catch(e){}
  }
  const tested = Xval.length; const accuracy = tested? (correct/tested) : 0; const precision = (tp+fp)? tp/(tp+fp) : 0; const recall = (tp+fn)? tp/(tp+fn) : 0; const f1 = (precision+recall)? (2*precision*recall)/(precision+recall) : 0;

  // build a compact model for client (strip any functions)
  const compact = { members: { }, weights: model.weights || [0.5,0.5] };
  if(model.members && model.members.logreg){ compact.members.logreg = { w: model.members.logreg.w || model.members.logreg.weights || [], b: model.members.logreg.b||0 }; }
  if(model.members && model.members.gbdt){ compact.members.gbdt = { trees: model.members.gbdt.trees || [], lr: model.members.gbdt.lr || 0.4 }; }

  const M = await getSingleton('Model'); M.set('payload', model); M.set('payload_compact', compact); M.set('version', Date.now()); M.set('meta', { lookback, horizon, trainedSamples: Xtrain.length, valSamples: tested, accuracy, precision, recall, f1, balance: { n0, n1 }, balanceStrategy }); await M.save(null,{useMasterKey:true});
  return { success:true, model: { version: M.id, meta: M.get('meta') } };
});

Parse.Cloud.define('getModel', async (req)=>{
  const M = await getSingleton('Model'); const payload = M.get('payload')||null; const compact = M.get('payload_compact')||null; const meta = M.get('meta')||{}; return { success:true, data: { payload, compact, meta, version: M.id } };
});

Parse.Cloud.define('predict', async (req)=>{
  const params = req.params||{}; const quotes = params.quotes || []; const epochs = params.epochs || []; if(!quotes.length) throw 'Missing quotes';
  const M = await getSingleton('Model'); const model = M.get('payload')||null; const idx = quotes.length-1; const fv = feat.featureVectorWindow(quotes, epochs, idx, Math.min(120, quotes.length), { extended:true });
  let prob = 0.5;
  if(model){ try{ prob = mlLib.predictEnsemble(model, fv); }catch(e){} }
  return { success:true, data: { probability: prob } };
});

Parse.Cloud.define('mlAccuracy', async (req)=>{
  const { samples=500 } = req.params||{}; const q = new Parse.Query('Tick'); q.descending('epoch'); q.limit(Math.min(samples+200,5000)); const ticks = await q.find({useMasterKey:true}); if(!ticks || ticks.length<50) return { success:true, data:{ accuracy:0, tested:0 } };
  const quotes = ticks.map(t=> Number(t.get('quote')||0)).reverse(); const epochs = ticks.map(t=> Math.floor((t.get('ts')||t.createdAt).getTime()/1000)).reverse(); // oldest first
  const M = await getSingleton('Model'); const model = M.get('payload')||null; let correct=0, tested=0; const W=120; for(let i=W;i<quotes.length-1;i++){ const fv = feat.featureVectorWindow(quotes, epochs, i, W, { extended:true }); let prob = 0.5; if(model){ prob = mlLib.predictEnsemble(model, fv); } const pred = prob>0.5?1:0; const actualDigit = feat.lastDigitFromQuote(quotes[i+1]); const actual = actualDigit>2?1:0; if(pred===actual) correct++; tested++; }
  const acc = tested? (correct/tested) : 0; return { success:true, data:{ accuracy: acc, tested } };
});

Parse.Cloud.define('mlPerformance', async (req)=>{
  const acc = await Parse.Cloud.run('mlAccuracy', { samples: 500 }, { useMasterKey: true }); return { success:true, data: acc.data };
});

Parse.Cloud.define('mlRetrain', async (req)=>{ const opts=req.params||{}; return await Parse.Cloud.run('trainModel', opts, { useMasterKey:true }); });