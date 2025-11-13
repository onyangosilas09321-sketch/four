if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
// ENHANCED Analysis Engine v2: Multi-timeframe, adaptive thresholds, regime-aware
(function(){
  const BUF={ ticks:[], epochs:[], candles1m:[], candles5m:[], candles15m:[] };
  const CFG={ emaShort:12, emaLong:50, rsiLen:14, bbLen:20, bbMult:2, smoothAlpha:0.25, thresholdBase:0.5, volThreshold:0.002 };
  let smoothConf=null, lastVolatility=0, regimeMemory=[];

  function lastDigit(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
  function sma(arr, n){ if(arr.length<n) return null; const s=arr.slice(-n); return s.reduce((a,b)=>a+b,0)/n; }
  function ema(arr, n){ if(arr.length<n) return null; const k=2/(n+1); let e=arr[arr.length-n]; for(let i=arr.length-n+1;i<arr.length;i++){ e = arr[i]*k + e*(1-k); } return e; }
  function rsi(closes, n){ if(closes.length<=n) return null; let g=0,l=0; for(let i=closes.length-n+1;i<closes.length;i++){ const d=closes[i]-closes[i-1]; if(d>0) g+=d; else l-=d; } if(l===0) return 100; const rs=g/n/(l/n); return 100-(100/(1+rs)); }
  function boll(closes,n,m){ if(closes.length<n) return null; const s=closes.slice(-n); const mid=s.reduce((a,b)=>a+b,0)/n; const varc=s.reduce((a,b)=>a+(b-mid)*(b-mid),0)/n; const sd=Math.sqrt(varc); return {mid,upper:mid+m*sd,lower:mid-m*sd,width:(m*sd)*2}; }
  function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }
  function ewSmooth(prev, val, alpha){ if(prev==null) return val; return alpha*val + (1-alpha)*prev; }
  function stdev(arr){ if(arr.length<2) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,v)=>a+(v-m)*(v-m),0)/arr.length); }
  function autocorr(arr, lag=1){ if(arr.length<=lag) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; let num=0, den=0; for(let i=lag;i<arr.length;i++){ num+=(arr[i]-m)*(arr[i-lag]-m); den+=(arr[i]-m)*(arr[i]-m); } return den? num/den : 0; }

  function pushTick(epoch, quote){ 
    BUF.ticks.push(quote); 
    BUF.epochs.push(epoch*1000); 
    if(BUF.ticks.length>6000){ BUF.ticks.shift(); BUF.epochs.shift(); }
    build1mCandle(epoch*1000, quote); 
    build5mCandle(epoch*1000, quote); 
    build15mCandle(epoch*1000, quote);
  }

  function buildNmCandle(ts, price, bucketMinutes, candleArray){ 
    const last = candleArray[candleArray.length-1]; 
    const d=new Date(ts); 
    const bucket = Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate(),d.getUTCHours(),Math.floor(d.getUTCMinutes()/bucketMinutes)*bucketMinutes,0,0);
    if(!last || last.bucket!==bucket){ 
      candleArray.push({bucket, open:price, high:price, low:price, close:price}); 
      const maxLen = bucketMinutes===1? 1000 : bucketMinutes===5? 288 : 96;
      if(candleArray.length>maxLen) candleArray.shift(); 
    }
    else { 
      last.high=Math.max(last.high,price); 
      last.low=Math.min(last.low,price); 
      last.close=price; 
    }
  }

  function build1mCandle(ts, price){ buildNmCandle(ts, price, 1, BUF.candles1m); }
  function build5mCandle(ts, price){ buildNmCandle(ts, price, 5, BUF.candles5m); }
  function build15mCandle(ts, price){ buildNmCandle(ts, price, 15, BUF.candles15m); }

  function computeMultiTimeframeSignal(){
    const closes = BUF.ticks.slice(); 
    if(closes.length<20) return null;
    
    // tick-level
    const eS = ema(closes, CFG.emaShort); 
    const eL = ema(closes, CFG.emaLong); 
    const trend_tick = (eS!=null && eL!=null)? (eS>eL?1:-1):0;
    
    // 1m level
    const c1m = BUF.candles1m.map(c=>c.close); 
    const eS1 = ema(c1m, CFG.emaShort); 
    const eL1 = ema(c1m, CFG.emaLong); 
    const trend_1m = (eS1!=null && eL1!=null)? (eS1>eL1?1:-1):0;
    
    // 5m level
    const c5m = BUF.candles5m.map(c=>c.close); 
    const eS5 = ema(c5m, CFG.emaShort); 
    const eL5 = ema(c5m, CFG.emaLong); 
    const trend_5m = (eS5!=null && eL5!=null)? (eS5>eL5?1:-1):0;

    // Multi-timeframe alignment: all agree = higher confidence
    const trendAlignment = (trend_tick + trend_1m + trend_5m) / 3;
    const alignmentScore = Math.abs(trendAlignment) * 0.5; // boost if all agree

    return { trend_tick, trend_1m, trend_5m, alignmentScore };
  }

  function computeAdaptiveThreshold(){
    const closes = BUF.ticks.slice();
    if(closes.length<30) return CFG.thresholdBase;
    
    // volatility-adjusted threshold: higher vol = higher threshold (wait for stronger signal)
    const returns = [];
    for(let i=1; i<Math.min(30, closes.length); i++){
      returns.push((closes[i]-closes[i-1])/Math.abs(closes[i-1]||1));
    }
    const vol = stdev(returns);
    lastVolatility = vol;
    
    // scale threshold with volatility: 0.45 (low vol) to 0.60 (high vol)
    const thresholdAdj = CFG.thresholdBase + clamp(vol - CFG.volThreshold, -0.1, 0.15);
    return clamp(thresholdAdj, 0.45, 0.62);
  }

  function detectRegimeShift(){
    const closes = BUF.ticks.slice();
    if(closes.length<50) return 'range';
    
    // check if we're in trend or range
    const eS = ema(closes, 12);
    const eL = ema(closes, 50);
    let regime = 'range';
    if(eS!=null && eL!=null){
      const slope = (eS-eL) / (Math.abs(eL)||1);
      if(Math.abs(slope) > 0.005) regime = 'trend';
    }
    
    // track regime memory: if regime changes, lower confidence temporarily
    regimeMemory.push(regime==='trend'?1:0);
    if(regimeMemory.length>5) regimeMemory.shift();
    const recentRegime = regimeMemory.reduce((a,b)=>a+b,0)/regimeMemory.length;
    const regimeShifting = Math.abs(recentRegime - 0.5) < 0.2; // unstable
    
    return { regime, regimeShifting, recentRegime };
  }

  function subSignals(){
    const closes = BUF.ticks.slice(); 
    if(closes.length<10) return {ready:false};

    const eS = ema(closes, CFG.emaShort); 
    const eL = ema(closes, CFG.emaLong); 
    const _rsi = rsi(closes, CFG.rsiLen); 
    const _bb = boll(closes, CFG.bbLen, CFG.bbMult);
    
    // trend
    const trend = (eS!=null && eL!=null)? (eS>eL?1:-1):0; 
    
    // momentum (RSI)
    const momScore = _rsi!=null? ((_rsi-50)/50)*0.35 : 0;
    
    // volatility filter
    const volScore = _bb!=null? (_bb.width>0? 0.2: -0.2) : 0;
    
    // digit domain
    const lastN=60; 
    const dig = BUF.ticks.slice(-lastN).map(lastDigit); 
    const over2 = dig.filter(d=>d>2).length; 
    const p = over2/Math.max(dig.length,1); 
    const digitScore = (p-0.7)*0.6; // slightly higher weight
    
    // multi-timeframe confirmation
    const mtf = computeMultiTimeframeSignal();
    const mtfScore = mtf? mtf.alignmentScore * 0.3 : 0;
    
    // autocorrelation: if positive, momentum is likely to continue
    const returns = [];
    for(let i=1; i<Math.min(30, closes.length); i++){
      returns.push((closes[i]-closes[i-1])/Math.abs(closes[i-1]||1));
    }
    const ac = autocorr(returns, 1);
    const acScore = ac * 0.2; // positive autocorr = bonus
    
    // combine heuristic signals
    const total = trend*0.35 + momScore + volScore + digitScore + mtfScore + acScore;
    const conf = 1/(1+Math.exp(-total));
    const confSmooth = (smoothConf = ewSmooth(smoothConf, conf, CFG.smoothAlpha));

    // augment with ML model prediction
    let modelProb = null;
    try{ 
      if(window.Features && window.ML){ 
        const idx = BUF.ticks.length-1; 
        const feats = window.Features.featureVectorWindow(BUF.ticks, BUF.epochs, idx, Math.min(120, BUF.ticks.length), { extended: true }); 
        modelProb = window.ML.predictSync(feats); 
      } 
    }catch(_e){ modelProb = null; }
    
    const finalConf = (modelProb==null)? confSmooth : (0.65*modelProb + 0.35*confSmooth);

    // adaptive threshold based on volatility
    const adaptiveThreshold = computeAdaptiveThreshold();
    
    // regime analysis
    const regimeAnalysis = detectRegimeShift();
    const regimePenalty = regimeAnalysis.regimeShifting? -0.08 : 0;
    const finalConfAdjusted = clamp(finalConf + regimePenalty, 0.1, 0.95);
    
    const suggest = finalConfAdjusted > adaptiveThreshold? 'OVER2' : 'WAIT';
    
    return {
      ready: true, 
      confidence: finalConfAdjusted, 
      adaptiveThreshold,
      suggest, 
      detail: {
        trendScore: trend*0.35,
        momScore,
        volScore,
        digitScore,
        mtfScore,
        acScore,
        modelProb,
        volatility: lastVolatility,
        regime: regimeAnalysis.regime,
        regimeShifting: regimeAnalysis.regimeShifting
      },
      regime: regimeAnalysis.regime
    };
  }

  window.Analysis = { pushTick, score: subSignals };
})();
