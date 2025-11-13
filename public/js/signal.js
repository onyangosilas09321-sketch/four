if(!window.__parseInited){Parse.initialize('61rFcyb3ekS16wLu1CvZE1CRVRFRtFx4vXiDtSu7','Wtn21iCjq808ZOen9yO2P1IH7Rzf6kahhcspUWWS'); Parse.serverURL='https://parseapi.back4app.com'; window.__parseInited=true; }
// Indicator-based Signal Engine for R_10 Over 2 (no external libs)
(function(){
  function lastDigit(q){ const s=String(q).replace(/\D/g,''); return s.length? Number(s[s.length-1]):0; }
  function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
  function ema(arr, period){ if(arr.length<period) return null; const k=2/(period+1); let e=arr[0]; for(let i=1;i<arr.length;i++){ e = arr[i]*k + e*(1-k); } return e; }
  function sma(arr, period){ if(arr.length<period) return null; const s=arr.slice(-period); return s.reduce((a,b)=>a+b,0)/period; }
  function rsi(closes, period){ if(closes.length<=period) return null; let gains=0, losses=0; for(let i=closes.length-period;i<closes.length;i++){ const diff=closes[i]-closes[i-1]; if(diff>0) gains+=diff; else losses-=diff; } const ag=gains/period, al=losses/period; if(al===0) return 100; const rs=ag/al; return 100-(100/(1+rs)); }
  function boll(closes, period, mult){ if(closes.length<period) return null; const s=closes.slice(-period); const ma=s.reduce((a,b)=>a+b,0)/period; const variance=s.reduce((a,b)=>a+(b-ma)*(b-ma),0)/period; const sd=Math.sqrt(variance); return {mid:ma, upper:ma+mult*sd, lower:ma-mult*sd, width:(mult*sd)*2}; }

  const BUF = { quotes:[], epochs:[], digits:[] };
  const CFG = { emaShort:12, emaLong:50, rsiLen:14, bbLen:20, bbMult:2 };

  function pushTick(epoch, quote){ BUF.quotes.push(quote); BUF.epochs.push(epoch*1000); BUF.digits.push(lastDigit(quote)); if(BUF.quotes.length>5000){ BUF.quotes.shift(); BUF.epochs.shift(); BUF.digits.shift(); } }

  function score(){ const closes = BUF.quotes.slice(); if(closes.length<10) return {ready:false}; const eShort=ema(closes, CFG.emaShort); const eLong=ema(closes, CFG.emaLong); const _rsi=rsi(closes, CFG.rsiLen); const _bb=boll(closes, CFG.bbLen, CFG.bbMult);
    let s=0; let w=0; if(eShort!=null && eLong!=null){ s += (eShort>eLong?1:-1)*0.4; w+=0.4; } if(_rsi!=null){ s += ((_rsi-50)/50)*0.3; w+=0.3; } if(_bb!=null){ s += (_bb.width>0? 0.2: -0.2); w+=0.2; }
    const norm = w? s/w : 0; const conf = 1/(1+Math.exp(-norm)); return {ready:true, confidence: conf, suggest: conf>0.5? 'OVER2':'WAIT'}; }

  window.Signal = { pushTick, score };
})();