// Lightweight client-side ML helper. Attempts to load server model via `API.getModel()`
// Falls back to a small heuristic when model isn't available.
(function(){
  function sigmoid(z){ return 1/(1+Math.exp(-z)); }

  const ML = {
    model: null,
    async load(){ try{ const res = window.API && (await window.API.getModel()); if(res && res.success && res.data){ // prefer compact if present
          this.model = res.data.compact || res.data.payload || res.data;
        } else if(res && res.data){ this.model = res.data; } }catch(e){} },
    // synchronous predictor using cached model (or heuristic fallback)
    predictSync(features){
      if(!features || !features.length) return 0.5;
      // if trained compact model is present
      if(this.model && this.model.members){
        // logreg predict
        const logreg = this.model.members.logreg;
        const gbdt = this.model.members.gbdt;
        function dot(a,b){ let s=0; for(let i=0;i<a.length && i<b.length;i++) s+= a[i]*b[i]; return s; }
        let p1 = null, p2 = null;
        if(logreg && Array.isArray(logreg.w)){
          const w = logreg.w; const b = logreg.b||0; p1 = sigmoid(dot(w,features) + b);
        }
        if(gbdt && Array.isArray(gbdt.trees)){
          let F = 0; const lr = gbdt.lr || 0.4;
          for(const t of gbdt.trees){ try{ const featIdx = t.feat; const thr = t.thr; const leaf = (features[featIdx] <= thr ? t.wl : t.wr); F += lr * (leaf||0); }catch(e){} }
          p2 = sigmoid(F);
        }
        if(p1!=null && p2!=null){ const wts = this.model.weights || [0.5,0.5]; return (wts[0]*p1 + wts[1]*p2); }
        if(p1!=null) return p1; if(p2!=null) return p2;
      }
      // heuristic fallback: combine a few meaningful features
      const over2Mean = features[6]||0; const recentOver2 = features[features.length-1]||0; const changeMean = features[2]||0; const trendProxy = features[0]||0;
      const score = (over2Mean*1.2) + (recentOver2*0.9) + (trendProxy*0.6) - Math.abs(changeMean)*0.4;
      return sigmoid( (score - 0.5) * 2.2 );
    }
  };

  // kick off background load
  setTimeout(()=>{ ML.load().catch(()=>{}); }, 0);
  window.ML = ML;
})();
