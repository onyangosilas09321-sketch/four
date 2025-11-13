// Advanced windowed features for R_10 Over 2
// No external libs; compute from arrays of quotes and epochs

function lastDigitFromQuote(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
function safeDiv(a,b){ return b? a/b : 0; }
function mean(arr){ if(!arr.length) return 0; return arr.reduce((s,v)=>s+v,0)/arr.length; }
function std(arr){ if(!arr.length) return 0; const m=mean(arr); return Math.sqrt(mean(arr.map(v=>(v-m)*(v-m)))); }
function ema(arr,alpha){ let out=0, w=0; for(let i=0;i<arr.length;i++){ out = alpha*arr[i] + (1-alpha)*out; w=out; } return w; }

// Build features over a window ending at index i (inclusive), using last W elements [i-W+1..i]
exports.featureVectorWindow = function(quotes, epochs, i, W){
  const a=Math.max(0, i-W+1), b=i, n=(b-a+1);
  const windowQ = []; const digits=[]; const changes=[]; const deltas=[]; const over2=[];
  for(let k=a;k<=b;k++){
    const q=quotes[k]; windowQ.push(q); const d=lastDigitFromQuote(q); digits.push(d);
    const prev = k>0? quotes[k-1] : q; const ch = safeDiv((q - prev), Math.abs(prev)||1); changes.push(ch);
    const e = epochs && epochs.length? epochs[k] : null; const ep = (epochs && k>0)? epochs[k-1] : e; const dt = (e!=null && ep!=null)? (e-ep) : 0; deltas.push(dt);
    over2.push(d>2?1:0);
  }
  // normalize
  const normDigits = digits.map(d=> d/9);
  const normChanges = changes.map(c=> Math.max(Math.min(c*50, 1), -1));
  const normDeltas = deltas.map(dt=> Math.min((dt||0)/2, 1));

  const f = [];
  // basic stats
  f.push(mean(normDigits)); f.push(std(normDigits));
  f.push(mean(normChanges)); f.push(std(normChanges));
  f.push(mean(normDeltas)); f.push(std(normDeltas));
  // over2 concentration
  const over2Mean = mean(over2); f.push(over2Mean);
  // decayed attention-like weights (recent emphasis)
  const alphas = [0.3, 0.5, 0.7];
  alphas.forEach(a=>{ f.push(ema(over2, a)); f.push(ema(normChanges, a)); });
  // sign change rate of changes (volatility proxy)
  let sc=0; for(let k=1;k<normChanges.length;k++){ if(Math.sign(normChanges[k])!==Math.sign(normChanges[k-1])) sc++; }
  f.push(safeDiv(sc, Math.max(normChanges.length-1,1)));
  // run-length of over2
  let run=0, maxRun=0; for(let k=0;k<over2.length;k++){ if(over2[k]){ run++; maxRun=Math.max(maxRun,run);} else run=0; }
  f.push(maxRun/Math.max(n,1));
  // last few digits one-hot over2 counts
  const tail = over2.slice(-5); f.push(mean(tail));

  return f; };

exports.lastDigitFromQuote = lastDigitFromQuote;