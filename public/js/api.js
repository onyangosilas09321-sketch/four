/**
 * API Wrapper - Uses Supabase + IndexedDB (no Parse Server)
 * All calls go to SupabaseDB which syncs with Supabase REST API
 */
window.API = {
  async getMetrics(){ return await window.SupabaseDB.getMetrics(); },
  async listTrades(params){ return await window.SupabaseDB.listTrades(params?.limit || 100); },
  async getSettings(){ return await window.SupabaseDB.getSettings(); },
  async saveSettings(p){ return await window.SupabaseDB.saveSettings(p||{}); },
  async saveTick(p){ const { epoch, symbol, quote } = p||{}; return await window.SupabaseDB.saveTick(epoch, symbol, quote); },
  async recordTrade(p){ return await window.SupabaseDB.recordTrade(p||{}); },
  async updateBalance(p){ return await window.SupabaseDB.saveSettings(p||{}); },
  async canTrade(){ return await window.SupabaseDB.canTrade(); },
  
  // ML functions still use cloud endpoints if available, fall back to local ML
  async trainTensorFlowModel(params = {}) {
    try {
      return await fetch('/api/ml/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      }).then(r => r.json());
    } catch (error) {
      console.warn('TensorFlow training not available:', error);
      return { success: false, error: 'ML service unavailable' };
    }
  },

  async predictTensorFlow(quotes = []) {
    try {
      return await fetch('/api/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes })
      }).then(r => r.json());
    } catch (error) {
      console.warn('TensorFlow prediction not available:', error);
      return { success: false, error: 'ML service unavailable' };
    }
  },

  async analyzeSentiment(texts = [], newsArticles = []) {
    try {
      return await fetch('/api/ml/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, newsArticles })
      }).then(r => r.json());
    } catch (error) {
      console.warn('Sentiment analysis not available:', error);
      return { success: false, error: 'Sentiment service unavailable' };
    }
  },

  async generateUnifiedSignal(quotes = [], newsTexts = [], accountBalance = 0, dailyLoss = 0) {
    try {
      return await fetch('/api/ml/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes, newsTexts, accountBalance, dailyLoss })
      }).then(r => r.json());
    } catch (error) {
      console.warn('Signal generation not available:', error);
      return { success: false, error: 'Signal service unavailable' };
    }
  }
};