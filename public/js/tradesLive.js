
(function(){
  const elId='recent-trades';
  async function refresh(){ 
    try{ 
      const res=await API.listTrades({limit:50}); 
      const c=document.getElementById(elId); 
      if(!c) return; 
      
      if(!res.success||!res.data || res.data.length === 0){ 
        c.innerHTML='<p class="text-neutral-500 text-center py-8">No trades yet</p>'; 
        return; 
      }
      
      const trades = res.data;
      const winningTrades = trades.filter(t => (t.pnl || 0) > 0);
      const losingTrades = trades.filter(t => (t.pnl || 0) < 0);
      const breakEvenTrades = trades.filter(t => (t.pnl || 0) === 0);
      
      const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalWins = winningTrades.length;
      const totalLosses = losingTrades.length;
      const winRate = trades.length > 0 ? ((totalWins / trades.length) * 100).toFixed(1) : 0;
      const avgWin = totalWins > 0 ? (winningTrades.reduce((sum, t) => sum + t.pnl, 0) / totalWins).toFixed(2) : 0;
      const avgLoss = totalLosses > 0 ? (losingTrades.reduce((sum, t) => sum + t.pnl, 0) / totalLosses).toFixed(2) : 0;
      
      const statsHtml = `
        <div class="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div class="rounded-xl bg-neutral-100 p-3">
            <p class="text-xs text-neutral-600">Total Trades</p>
            <p class="text-xl font-bold text-neutral-900">${trades.length}</p>
          </div>
          <div class="rounded-xl bg-emerald-50 p-3">
            <p class="text-xs text-emerald-700">Wins</p>
            <p class="text-xl font-bold text-emerald-600">${totalWins}</p>
          </div>
          <div class="rounded-xl bg-red-50 p-3">
            <p class="text-xs text-red-700">Losses</p>
            <p class="text-xl font-bold text-red-600">${totalLosses}</p>
          </div>
          <div class="rounded-xl bg-blue-50 p-3">
            <p class="text-xs text-blue-700">Win Rate</p>
            <p class="text-xl font-bold text-blue-600">${winRate}%</p>
          </div>
          <div class="rounded-xl ${totalPnL >= 0 ? 'bg-emerald-50' : 'bg-red-50'} p-3">
            <p class="text-xs ${totalPnL >= 0 ? 'text-emerald-700' : 'text-red-700'}">Total P&L</p>
            <p class="text-xl font-bold ${totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}">${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}</p>
          </div>
          <div class="rounded-xl bg-neutral-100 p-3">
            <p class="text-xs text-neutral-600">Avg Win / Loss</p>
            <p class="text-sm font-bold"><span class="text-emerald-600">+$${avgWin}</span> / <span class="text-red-600">$${avgLoss}</span></p>
          </div>
        </div>
      `;
      
      const renderTradeTable = (tradesList, title, emptyMsg, colorClass) => {
        if (tradesList.length === 0) {
          return `<div class="mb-6">
            <h4 class="text-md font-semibold mb-3 ${colorClass}">${title}</h4>
            <p class="text-neutral-400 text-sm text-center py-4">${emptyMsg}</p>
          </div>`;
        }
        
        return `<div class="mb-6">
          <h4 class="text-md font-semibold mb-3 ${colorClass}">${title} (${tradesList.length})</h4>
          <div class="overflow-x-auto border rounded-xl">
            <table class="w-full text-sm">
              <thead class="bg-neutral-50 border-b">
                <tr class="text-left text-neutral-600">
                  <th class="py-2 px-3">Date/Time</th>
                  <th class="px-3">Contract</th>
                  <th class="px-3">ID</th>
                  <th class="px-3">Stake</th>
                  <th class="px-3">Buy Price</th>
                  <th class="px-3">Sell Price</th>
                  <th class="px-3">P&L</th>
                  <th class="px-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                ${tradesList.map(t => {
                  const dt = new Date((t.timestamp || t.createdAt || Date.now())).toLocaleString();
                  const pnl = t.pnl || 0;
                  const pnlCls = pnl >= 0 ? 'text-emerald-600' : 'text-red-600';
                  const conf = t.prediction_confidence != null ? (t.prediction_confidence * 100).toFixed(1) + '%' : '—';
                  const contractId = t.contract_id ? String(t.contract_id).slice(0, 10) : 'pending';
                  const stake = t.stake || 0;
                  const buyPrice = t.buy_price || t.buyPrice || 0;
                  const sellPrice = t.sell_price || t.sellPrice || 0;
                  const contractType = t.contract_type || 'DIGITOVER';
                  
                  return `<tr class="border-b hover:bg-neutral-50">
                    <td class="py-3 px-3 text-neutral-700">${dt}</td>
                    <td class="px-3 text-neutral-600">${contractType}</td>
                    <td class="px-3 text-xs text-neutral-500 font-mono">${contractId}</td>
                    <td class="px-3 text-neutral-700 font-medium">$${stake.toFixed(2)}</td>
                    <td class="px-3 text-neutral-700">$${buyPrice.toFixed(2)}</td>
                    <td class="px-3 text-neutral-700">$${sellPrice.toFixed(2)}</td>
                    <td class="px-3 ${pnlCls} font-bold text-base">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</td>
                    <td class="px-3 text-neutral-600">${conf}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      };
      
      c.innerHTML = statsHtml + 
        renderTradeTable(winningTrades, '🟢 Winning Trades', 'No winning trades yet', 'text-emerald-600') +
        renderTradeTable(losingTrades, '🔴 Losing Trades', 'No losing trades yet', 'text-red-600') +
        (breakEvenTrades.length > 0 ? renderTradeTable(breakEvenTrades, '⚪ Break-Even Trades', 'No break-even trades', 'text-neutral-600') : '');
        
    }catch(e){
      console.error('Failed to load trades:', e);
      const c=document.getElementById(elId);
      if(c) c.innerHTML='<p class="text-red-500 text-center py-4">Error loading trades. Please refresh.</p>';
    } 
  }
  
  document.addEventListener('DOMContentLoaded', ()=>{ 
    refresh(); 
    setInterval(refresh, 3000); 
  });
  
  document.addEventListener('trade-closed', ()=> {
    setTimeout(refresh, 500);
  });
})();