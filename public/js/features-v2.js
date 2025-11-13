// Enhanced Feature Extractor v2: Better feature engineering for accuracy
(function(){
  function lastDigitFromQuote(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
  function safeDiv(a,b){ return b? a/b : 0; }
  function mean(arr){ if(!arr || !arr.length) return 0; return arr.reduce((s,v)=>s+v,0)/arr.length; }
  function std(arr){ if(!arr || !arr.length) return 0; const m=mean(arr); return Math.sqrt(mean(arr.map(v=>(v-m)*(v-m)))); }
  function median(arr){ const s=arr.slice().sort((a,b)=>a-b); const mid=Math.floor(s.length/2); return s.length%2? s[mid] : (s[mid-1]+s[mid])/2; }
  function percentile(arr,p){ if(!arr.length) return 0; const s=arr.slice().sort((a,b)=>a-b); const idx=Math.floor((s.length-1)*p); return s[idx]; }
  function skewness(arr){ if(arr.length<3) return 0; const m=mean(arr); const s=std(arr)||1; const n=arr.length; return (n/((n-1)*(n-2))) * arr.reduce((a,x)=> a + Math.pow((x-m)/s,3),0); }
  function kurtosis(arr){ if(arr.length<4) return 0; const m=mean(arr); const s=std(arr)||1; const n=arr.length; return (n*(n+1)/((n-1)*(n-2)*(n-3))) * arr.reduce((a,x)=> a + Math.pow((x-m)/s,4),0) - (3*(n-1)*(n-1)/((n-2)*(n-3))); }
  function emaSeries(arr, alpha){ if(!arr || !arr.length) return 0; let out=arr[0]; for(let i=1;i<arr.length;i++){ out = alpha*arr[i] + (1-alpha)*out; } return out; }
  function autocorr(arr, lag=1){ if(arr.length<=lag) return 0; const m=mean(arr); let num=0,den=0; for(let i=lag;i<arr.length;i++){ num+=(arr[i]-m)*(arr[i-lag]-m); den+=(arr[i]-m)*(arr[i]-m); } return den? num/den : 0; }
  function entropy(arr){ const counts={}; arr.forEach(v=>{const k=Math.floor(v*10); counts[k]=(counts[k]||0)+1;}); let ent=0; const n=arr.length; Object.values(counts).forEach(c=>{ const p=c/n; if(p>0) ent-=p*Math.log2(p); }); return ent; }

  function sma(arr, n){ if(!arr.length || n<=0) return 0; if(arr.length<n) return mean(arr); return mean(arr.slice(-n)); }
  function ema(arr, alpha){ if(!arr.length) return 0; let out=arr[0]; for(let i=1;i<arr.length;i++){ out = alpha*arr[i] + (1-alpha)*out; } return out; }
  function roc(arr, n){ if(arr.length<=n) return 0; const prev=arr[arr.length-n-1]||arr[0]; return safeDiv((arr[arr.length-1]-prev), Math.abs(prev)||1); }
  
  function macd(arr, short=12, long=26, signal=9){ 
    if(arr.length<long) return {macd:0, signal:0, hist:0}; 
    const eShort = ema(arr.slice(-Math.max(short,1)), 2/(short+1)); 
    const eLong = ema(arr.slice(-Math.max(long,1)), 2/(long+1)); 
    const macdV = eShort - eLong;
    const macdSeries = []; 
    for(let i=Math.max(0, arr.length-long); i<arr.length; i++){ 
      const window = arr.slice(0,i+1); 
      const es = ema(window.slice(-short), 2/(short+1)); 
      const el = ema(window.slice(-long), 2/(long+1)); 
      macdSeries.push(es-el); 
    }
    const sig = ema(macdSeries.slice(-signal), 2/(signal+1)); 
    return { macd: macdV, signal: sig, hist: macdV - sig };
  }
  
  function stochastic(arr, n=14, smoothK=3, smoothD=3){
    if(arr.length<n) return {k:50, d:50};
    const window = arr.slice(-n);
    const low = Math.min(...window);
    const high = Math.max(...window);
    const close = arr[arr.length-1];
    const k = high===low? 50 : ((close-low)/(high-low))*100;
    return {k, d:50};
  }
  
  function bollingerBands(arr, n=20, m=2){
    if(arr.length<n) return {mid:0, upper:0, lower:0, width:0, position:0.5};
    const window = arr.slice(-n);
    const mid = mean(window);
    const s = std(window);
    const upper = mid + m*s;
    const lower = mid - m*s;
    const width = upper - lower;
    const lastPrice = arr[arr.length-1];
    const position = width? (lastPrice-lower)/(width) : 0.5;
    return {mid, upper, lower, width, position};
  }

  function featureVectorWindow(quotes, epochs, i, W, opts){
    opts = opts || {};
    const a=Math.max(0, i-W+1), b=i, n=(b-a+1);
    const windowQ = []; const digits=[]; const returns=[]; const deltas=[]; const over2=[];
    
    for(let k=a;k<=b;k++){
      const q=Number(quotes[k])||0; 
      windowQ.push(q); 
      const d=lastDigitFromQuote(q); 
      digits.push(d);
      
      const prev = k>0? Number(quotes[k-1]) : q; 
      const ch = safeDiv((q - prev), Math.abs(prev)||1); 
      returns.push(ch);
      
      const e = epochs && epochs.length? epochs[k] : null; 
      const ep = (epochs && k>0)? epochs[k-1] : e; 
      const dt = (e!=null && ep!=null)? (e-ep) : 0; 
      deltas.push(dt);
      
      over2.push(d>2?1:0);
    }

    const f = [];
    
    // === DIGIT DOMAIN ===
    const normDigits = digits.map(d=> d/9);
    f.push(mean(normDigits)); 
    f.push(std(normDigits));
    f.push(skewness(digits));
    f.push(median(digits)/9);
    
    // === RETURN STATISTICS ===
    f.push(mean(returns)); 
    f.push(std(returns)); 
    f.push(skewness(returns)); 
    f.push(kurtosis(returns));
    f.push(autocorr(returns, 1));
    f.push(autocorr(returns, 2));
    
    // === TIME DELTAS ===
    f.push(mean(deltas)); 
    f.push(std(deltas));
    
    // === OVER2 CONCENTRATION ===
    f.push(mean(over2));
    
    // === EMA-BASED ATTENTION ===
    const alphas = [0.2, 0.4, 0.7];
    alphas.forEach(a0=>{ 
      f.push(emaSeries(over2, a0)); 
      f.push(emaSeries(returns, a0)); 
    });
    
    // === SIGN-CHANGE & RUN-LENGTH ===
    let sc=0; 
    for(let k=1;k<returns.length;k++){ 
      if(Math.sign(returns[k])!==Math.sign(returns[k-1])) sc++; 
    }
    f.push(safeDiv(sc, Math.max(returns.length-1,1)));
    
    let run=0, maxRun=0; 
    for(let k=0;k<over2.length;k++){ 
      if(over2[k]){ run++; maxRun=Math.max(maxRun,run);} else run=0; 
    }
    f.push(maxRun/Math.max(n,1));
    
    // === PRICE-LEVEL FEATURES ===
    const lastPrice = windowQ[windowQ.length-1]||0; 
    f.push(lastPrice);
    f.push(safeDiv(lastPrice - (windowQ[windowQ.length-2]||lastPrice), Math.abs(windowQ[windowQ.length-2]||lastPrice)||1));
    f.push(roc(windowQ, 5));
    f.push(roc(windowQ, 10));
    
    // === MOVING AVERAGES ===
    f.push(sma(windowQ, 5)); 
    f.push(sma(windowQ, 10));
    f.push(sma(windowQ, 20)); 
    f.push(ema(windowQ.slice(-12), 2/(12+1))); 
    f.push(ema(windowQ.slice(-50), 2/(50+1)));
    
    // === MACD ===
    const mac = macd(windowQ, 12, 26, 9); 
    f.push(mac.macd); 
    f.push(mac.signal); 
    f.push(mac.hist);
    
    // === BOLLINGER BANDS ===
    const bb = bollingerBands(windowQ, 20, 2);
    f.push(bb.width);
    f.push(bb.position);
    f.push(safeDiv(lastPrice - bb.mid, Math.max(bb.width/2, 1e-9)));
    
    // === STOCHASTIC ===
    const stoch = stochastic(windowQ, 14);
    f.push(stoch.k / 100);
    f.push(stoch.d / 100);
    
    // === VOLATILITY & PERCENTILES ===
    f.push(std(returns)); 
    f.push(percentile(windowQ, 0.75)); 
    f.push(percentile(windowQ, 0.25)); 
    f.push(safeDiv(lastPrice - percentile(windowQ, 0.25), Math.max(1e-9, percentile(windowQ,0.75)-percentile(windowQ,0.25))));
    f.push(entropy(returns));
    
    // === EXTENDED FEATURES ===
    if(opts.extended){
      // z-score of last price
      const mP = mean(windowQ), sP = std(windowQ)||1; 
      f.push(safeDiv(lastPrice - mP, sP));
      
      // recent tail densities
      f.push(mean(over2.slice(-3))); 
      f.push(mean(over2.slice(-10)));
      f.push(mean(over2.slice(-20)));
      
      // momentum interactions
      f.push((mean(returns) > 0 ? 1 : -1) * std(returns));
      f.push(autocorr(returns, 1) * mean(over2));
      f.push(safeDiv(mac.hist, Math.max(Math.abs(mac.signal), 1e-9)));
      
      // volatility regime
      const vol = std(returns);
      f.push(vol > percentile(returns.map(Math.abs), 0.75) ? 1 : 0); // high volatility
    }

    return f;
  }

  window.Features = { featureVectorWindow, lastDigitFromQuote, sma, ema };
})();
