// Advanced Analysis Engine (tick + synthetic 1m), ensemble of sub-signals with smoothing
(function(){
  const BUF={ ticks:[], epochs:[], candles1m:[] };
  const CFG={ emaShort:12, emaLong:50, rsiLen:14, bbLen:20, bbMult:2, smoothAlpha:0.3 };
  let smoothConf=null;

  function lastDigit(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
  function sma(arr, n){ if(arr.length<n) return null; const s=arr.slice(-n); return s.reduce((a,b)=>a+b,0)/n; }
  function ema(arr, n){ if(arr.length<n) return null; const k=2/(n+1); let e=arr[arr.length-n]; for(let i=arr.length-n+1;i<arr.length;i++){ e = arr[i]*k + e*(1-k); } return e; }
  function rsi(closes, n){ if(closes.length<=n) return null; let g=0,l=0; for(let i=closes.length-n+1;i<closes.length;i++){ const d=closes[i]-closes[i-1]; if(d>0) g+=d; else l-=d; } if(l===0) return 100; const rs=g/n/(l/n); return 100-(100/(1+rs)); }
  function boll(closes,n,m){ if(closes.length<n) return null; const s=closes.slice(-n); const mid=s.reduce((a,b)=>a+b,0)/n; const varc=s.reduce((a,b)=>a+(b-mid)*(b-mid),0)/n; const sd=Math.sqrt(varc); return {mid,upper:mid+m*sd,lower:mid-m*sd,width:(m*sd)*2}; }
  function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }
  function ewSmooth(prev, val, alpha){ if(prev==null) return val; return alpha*val + (1-alpha)*prev; }

  function pushTick(epoch, quote){ BUF.ticks.push(quote); BUF.epochs.push(epoch*1000); if(BUF.ticks.length>6000){ BUF.ticks.shift(); BUF.epochs.shift(); }
    build1mCandle(epoch*1000, quote); }

  function build1mCandle(ts, price){ const last = BUF.candles1m[BUF.candles1m.length-1]; const d=new Date(ts); const bucket = Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),0,0);
    if(!last || last.bucket!==bucket){ BUF.candles1m.push({bucket, open:price, high:price, low:price, close:price}); if(BUF.candles1m.length>1000) BUF.candles1m.shift(); }
    else { last.high=Math.max(last.high,price); last.low=Math.min(last.low,price); last.close=price; }
  }

  function subSignals(){
    const closes = BUF.ticks.slice(); if(closes.length<10) return {ready:false};
    const eS = ema(closes, CFG.emaShort); const eL=ema(closes, CFG.emaLong); const _rsi=rsi(closes, CFG.rsiLen); const _bb=boll(closes, CFG.bbLen, CFG.bbMult);
    // 1m TF
    const c1m = BUF.candles1m.map(c=>c.close); const eS1=ema(c1m, CFG.emaShort), eL1=ema(c1m, CFG.emaLong); const trend1m = (eS1!=null&&eL1!=null)? (eS1>eL1?1:-1):0;
    // trend
    const trend = (eS!=null&&eL!=null)? (eS>eL?1:-1):0; const trendScore = trend*0.4 + trend1m*0.2;
    // momentum
    const momScore = _rsi!=null? ((_rsi-50)/50)*0.3 : 0;
    // volatility filter
    const volScore = _bb!=null? (_bb.width>0? 0.2: -0.2) : 0;
    // digit domain
    const lastN=50; const dig = BUF.ticks.slice(-lastN).map(lastDigit); const over2=dig.filter(d=>d>2).length; const p=over2/Math.max(dig.length,1); const digitScore = (p-0.7)*0.5; // bias vs 0.7 baseline
    const total = trendScore + momScore + volScore + digitScore;
    const conf = 1/(1+Math.exp(-total));
    const confSmooth = (smoothConf = ewSmooth(smoothConf, conf, CFG.smoothAlpha));

    // augment with ML model prediction if available (synchronous, uses cached model)
    let modelProb = null;
    try{ if(window.Features && window.ML){ const idx = BUF.ticks.length-1; const feats = window.Features.featureVectorWindow(BUF.ticks, BUF.epochs, idx, Math.min(120, BUF.ticks.length), { extended: true }); modelProb = window.ML.predictSync(feats); } }catch(_e){ modelProb = null; }
    const finalConf = (modelProb==null)? confSmooth : (0.6*modelProb + 0.4*confSmooth);
    const suggest = finalConf>0.5? 'OVER2' : 'WAIT';
    // regime
    let regime='range'; if(eS!=null&&eL!=null){ const slope=eS-eL; if(Math.abs(slope)> (0.0005*Math.abs(closes[closes.length-1]||1))) regime='trend'; }
    return {ready:true, confidence: finalConf, suggest, detail:{trendScore,momScore,volScore,digitScore,modelProb}, regime};
  }

  window.Analysis = { pushTick, score: subSignals };
})();