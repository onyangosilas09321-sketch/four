// Client-side feature extractor (port of cloud/lib/features.js)
(function(){
  function lastDigitFromQuote(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
  function safeDiv(a,b){ return b? a/b : 0; }
  function mean(arr){ if(!arr || !arr.length) return 0; return arr.reduce((s,v)=>s+v,0)/arr.length; }
  function std(arr){ if(!arr || !arr.length) return 0; const m=mean(arr); return Math.sqrt(mean(arr.map(v=>(v-m)*(v-m)))); }
  function sum(arr){ return arr.reduce((s,v)=>s+v,0); }
  function percentile(arr,p){ if(!arr.length) return 0; const s=arr.slice().sort((a,b)=>a-b); const idx=Math.floor((s.length-1)*p); return s[idx]; }
  function skewness(arr){ if(arr.length<3) return 0; const m=mean(arr); const s=std(arr)||1; const n=arr.length; return (n/((n-1)*(n-2))) * arr.reduce((a,x)=> a + Math.pow((x-m)/s,3),0); }
  function kurtosis(arr){ if(arr.length<4) return 0; const m=mean(arr); const s=std(arr)||1; const n=arr.length; return (n*(n+1)/((n-1)*(n-2)*(n-3))) * arr.reduce((a,x)=> a + Math.pow((x-m)/s,4),0) - (3*(n-1)*(n-1)/((n-2)*(n-3))); }
  function emaSeries(arr, alpha){ if(!arr.length) return 0; let out=arr[0]; for(let i=1;i<arr.length;i++){ out = alpha*arr[i] + (1-alpha)*out; } return out; }

  function sma(arr, n){ if(!arr.length || n<=0) return 0; if(arr.length<n) return mean(arr); return mean(arr.slice(-n)); }
  function roc(arr, n){ if(arr.length<=n) return 0; const prev=arr[arr.length-n-1]||arr[0]; return safeDiv((arr[arr.length-1]-prev), Math.abs(prev)||1); }
  function macd(arr, short=12, long=26, signal=9){ if(arr.length<long) return {macd:0, signal:0, hist:0}; const eShort = emaSeries(arr.slice(-Math.max(short,1)), 2/(short+1)); const eLong = emaSeries(arr.slice(-Math.max(long,1)), 2/(long+1)); const macdV = eShort - eLong; // approximate signal by ema of macd over last 'signal' points using simple sliding
    const macdSeries = []; for(let i=Math.max(0, arr.length-long); i<arr.length; i++){ const window = arr.slice(0,i+1); const es = emaSeries(window.slice(-short), 2/(short+1)); const el = emaSeries(window.slice(-long), 2/(long+1)); macdSeries.push(es-el); }
    const sig = emaSeries(macdSeries.slice(-signal), 2/(signal+1)); return { macd: macdV, signal: sig, hist: macdV - sig };
  }

  function featureVectorWindow(quotes, epochs, i, W, opts){
    opts = opts || {};
    const a=Math.max(0, i-W+1), b=i, n=(b-a+1);
    const windowQ = []; const digits=[]; const returns=[]; const deltas=[]; const over2=[];
    for(let k=a;k<=b;k++){
      const q=Number(quotes[k])||0; windowQ.push(q); const d=lastDigitFromQuote(q); digits.push(d);
      const prev = k>0? Number(quotes[k-1]) : q; const ch = safeDiv((q - prev), Math.abs(prev)||1); returns.push(ch);
      const e = epochs && epochs.length? epochs[k] : null; const ep = (epochs && k>0)? epochs[k-1] : e; const dt = (e!=null && ep!=null)? (e-ep) : 0; deltas.push(dt);
      over2.push(d>2?1:0);
    }

    const f = [];
    // Basic digit-domain features
    const normDigits = digits.map(d=> d/9);
    f.push(mean(normDigits)); f.push(std(normDigits));
    // returns stats
    f.push(mean(returns)); f.push(std(returns)); f.push(skewness(returns)); f.push(kurtosis(returns));
    // time deltas
    f.push(mean(deltas)); f.push(std(deltas));
    // over2 concentration
    f.push(mean(over2));
    // EMA-based attention
    const alphas = [0.2, 0.4, 0.7];
    alphas.forEach(a0=>{ f.push(emaSeries(over2, a0)); f.push(emaSeries(returns, a0)); });
    // sign-change rate and run-length
    let sc=0; for(let k=1;k<returns.length;k++){ if(Math.sign(returns[k])!==Math.sign(returns[k-1])) sc++; }
    f.push(safeDiv(sc, Math.max(returns.length-1,1)));
    let run=0, maxRun=0; for(let k=0;k<over2.length;k++){ if(over2[k]){ run++; maxRun=Math.max(maxRun,run);} else run=0; }
    f.push(maxRun/Math.max(n,1));

    // price-level features
    const lastPrice = windowQ[windowQ.length-1]||0; f.push(lastPrice);
    f.push(safeDiv(lastPrice - (windowQ[windowQ.length-2]||lastPrice), Math.abs(windowQ[windowQ.length-2]||lastPrice)||1));
    // moving averages
    f.push(sma(windowQ, 5)); f.push(sma(windowQ, 20)); f.push(emaSeries(windowQ.slice(-12), 2/(12+1))); f.push(emaSeries(windowQ.slice(-50), 2/(50+1)));
    // MACD
    const mac = macd(windowQ, 12, 26, 9); f.push(mac.macd); f.push(mac.signal); f.push(mac.hist);
    // volatility and percentile
    f.push(std(returns)); f.push(percentile(windowQ, 0.75)); f.push(percentile(windowQ, 0.25)); f.push(safeDiv(lastPrice - percentile(windowQ, 0.25), Math.max(1e-9, percentile(windowQ,0.75)-percentile(windowQ,0.25))));

    // extended features: normalized and ratios
    if(opts.extended){
      // z-score of last price within window
      const mP = mean(windowQ), sP = std(windowQ)||1; f.push(safeDiv(lastPrice - mP, sP));
      // recent tail over2 density
      f.push(mean(over2.slice(-3))); f.push(mean(over2.slice(-10)));
      // run small set of derived interactions
      f.push(f[0]*f[3]); // digit mean * returns std
      f.push(f[10] - f[11]); // ema diff approx
    }

    return f;
  }

  window.Features = { featureVectorWindow, lastDigitFromQuote, sma };
})();
