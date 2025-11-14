/**
 * Supabase Database Module
 * Replaces Parse Server with Supabase PostgreSQL
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('supabase_url') || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('supabase_key') || '';

class SupabaseDB {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_KEY;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.key}`,
      'Prefer': 'return=representation'
    };
  }

  /**
   * Initialize with Supabase credentials
   */
  static init(url, key) {
    const instance = new SupabaseDB();
    instance.url = url;
    instance.key = key;
    instance.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=representation'
    };
    window.SupabaseDB = instance;
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    return instance;
  }

  /**
   * REST API call helper
   */
  async request(method, path, data = null) {
    try {
      const url = `${this.url}/rest/v1${path}`;
      const options = {
        method,
        headers: this.headers
      };
      
      if (data && (method === 'POST' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const err = await response.json();
        throw err;
      }
      
      // GET returns array, POST/PATCH returns array of created/updated records
      return await response.json();
    } catch (error) {
      console.error('Supabase request failed:', error);
      throw error;
    }
  }

  // ==================== SETTINGS ====================

  async getSettings() {
    try {
      const result = await this.request('GET', '/settings?limit=1');
      return {
        success: true,
        data: result[0] || {}
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      // Fall back to local cache
      const local = await window.LocalDB.getSettings();
      return { success: true, data: local || {} };
    }
  }

  async saveSettings(data) {
    try {
      // First get existing
      const existing = await this.request('GET', '/settings?limit=1');
      
      if (existing.length > 0) {
        // Update
        await this.request('PATCH', `/settings?id=eq.${existing[0].id}`, data);
      } else {
        // Create
        await this.request('POST', '/settings', data);
      }
      
      // Also save to local cache
      await window.LocalDB.saveSettings(data);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Fall back to local
      await window.LocalDB.saveSettings(data);
      return { success: true };
    }
  }

  // ==================== TRADES ====================

  async listTrades(limit = 100) {
    try {
      const result = await this.request(
        'GET',
        `/trades?order=timestamp.desc&limit=${Math.min(limit, 1000)}`
      );
      
      return {
        success: true,
        data: result.map(t => ({
          timestamp: Math.floor(new Date(t.timestamp).getTime() / 1000),
          trade_id: t.trade_id,
          contract_id: t.contract_id || '',
          contract_type: t.contract_type || 'DIGITOVER',
          stake: t.stake || 0,
          duration: t.duration || 1,
          duration_unit: t.duration_unit || 't',
          buy_price: t.buy_price || 0,
          sell_price: t.sell_price || 0,
          pnl: t.pnl || 0,
          prediction_confidence: t.prediction_confidence || null,
          model_version: t.model_version || null,
          status: t.status || 'closed'
        }))
      };
    } catch (error) {
      console.error('Failed to list trades:', error);
      // Fall back to local cache
      const trades = await window.LocalDB.getTrades(limit);
      return { success: true, data: trades };
    }
  }

  async recordTrade(tradeData) {
    try {
      const payload = {
        timestamp: tradeData.openedEpoch ? new Date(tradeData.openedEpoch * 1000) : new Date(),
        trade_id: tradeData.contractId || '',
        contract_id: tradeData.contractId || '',
        contract_type: 'DIGITOVER',
        stake: tradeData.stake || 0,
        duration: 1,
        duration_unit: 't',
        buy_price: tradeData.buyPrice || 0,
        sell_price: tradeData.sellPrice || 0,
        pnl: (tradeData.sellPrice || 0) - (tradeData.buyPrice || 0),
        prediction_confidence: tradeData.predConf || null,
        model_version: tradeData.modelVersion || null,
        status: 'closed'
      };
      
      const result = await this.request('POST', '/trades', payload);
      
      // Also save to local cache
      await window.LocalDB.save(STORES.trades, payload);
      
      return { success: true, id: result[0]?.id };
    } catch (error) {
      console.error('Failed to record trade:', error);
      // Fall back to local
      await window.LocalDB.save(STORES.trades, tradeData);
      return { success: true };
    }
  }

  async saveTick(epoch, symbol, quote) {
    try {
      const payload = {
        epoch: epoch,
        ts: new Date(epoch * 1000),
        symbol: symbol,
        quote: quote
      };
      
      await this.request('POST', '/ticks', payload);
      
      // Also save to local cache
      await window.LocalDB.save(STORES.ticks, payload);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save tick:', error);
      // Fall back to local
      await window.LocalDB.save(STORES.ticks, { epoch, symbol, quote });
      return { success: true };
    }
  }

  // ==================== METRICS ====================

  async getMetrics() {
    try {
      // Try to fetch from Supabase
      const [settingsRes, tradesRes] = await Promise.all([
        this.request('GET', '/settings?limit=1'),
        this.request('GET', '/trades')
      ]);
      
      const settings = settingsRes[0] || {};
      const trades = tradesRes || [];
      
      const winning = trades.filter(t => (t.pnl || 0) > 0).length;
      const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dailyPnL = trades
        .filter(t => new Date(t.timestamp) >= today)
        .reduce((s, t) => s + (t.pnl || 0), 0);
      
      return {
        success: true,
        data: {
          state: {
            account_balance: settings.account_balance || 0,
            available_margin: settings.available_margin || 0,
            currency: settings.currency || 'USD',
            daily_pnl: dailyPnL,
            total_pnl: totalPnL,
            winning_trades: winning,
            total_trades: trades.length
          },
          performance: {}
        }
      };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      // Fall back to local cache
      return await window.LocalDB.getMetrics();
    }
  }

  async canTrade() {
    try {
      const settings = await this.getSettings();
      const sData = settings.data || {};
      
      const enabled = sData.trading_enabled !== false;
      if (!enabled) return { allowed: false, reason: 'Trading disabled' };
      
      const maxLoss = sData.max_daily_loss;
      if (typeof maxLoss === 'number') {
        const dailyPnL = await this.getDailyPnL();
        if (dailyPnL < -Math.abs(maxLoss)) {
          return { allowed: false, reason: 'Max daily loss reached' };
        }
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('canTrade error:', error);
      return { allowed: true };
    }
  }

  async getDailyPnL() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isoToday = today.toISOString();
      
      const trades = await this.request(
        'GET',
        `/trades?timestamp=gte.${isoToday}`
      );
      
      return trades.reduce((s, t) => s + (t.pnl || 0), 0);
    } catch (error) {
      console.error('Failed to get daily PnL:', error);
      return await window.LocalDB.getDailyPnL();
    }
  }

  // ==================== MODELS ====================

  async saveModel(modelData) {
    try {
      const payload = {
        model_type: modelData.modelType || 'tensorflow',
        model_version: modelData.modelVersion || `v${Date.now()}`,
        model_data: modelData.modelData || {},
        accuracy: modelData.accuracy || 0,
        trained_samples: modelData.trainedSamples || 0,
        training_date: new Date()
      };
      
      const result = await this.request('POST', '/ml_models', payload);
      
      // Also save to local cache
      await window.LocalDB.save(STORES.models, payload);
      
      return { success: true, id: result[0]?.id };
    } catch (error) {
      console.error('Failed to save model:', error);
      await window.LocalDB.save(STORES.models, modelData);
      return { success: true };
    }
  }

  async getModel(modelVersion = null) {
    try {
      let query = '/ml_models?order=training_date.desc&limit=1';
      if (modelVersion) {
        query = `/ml_models?model_version=eq.${modelVersion}&limit=1`;
      }
      
      const result = await this.request('GET', query);
      return {
        success: true,
        data: result[0] || null
      };
    } catch (error) {
      console.error('Failed to get model:', error);
      // Fall back to local cache
      const all = await window.LocalDB.getAll(STORES.models);
      return { success: true, data: all[all.length - 1] || null };
    }
  }

  // ==================== SIGNAL PERFORMANCE ====================

  async updateSignalStat(stats) {
    try {
      // Get or create default stat record
      let existing = await this.request(
        'GET',
        "/signal_performance?signal_type=eq.default&limit=1"
      );
      
      const payload = {
        signal_type: 'default',
        hits: (existing[0]?.hits || 0) + (stats.hits || 0),
        samples: (existing[0]?.samples || 0) + (stats.samples || 0),
        accuracy: stats.accuracy || (existing[0]?.accuracy || 0)
      };
      
      if (existing.length > 0) {
        await this.request(
          'PATCH',
          `/signal_performance?signal_type=eq.default`,
          payload
        );
      } else {
        await this.request('POST', '/signal_performance', payload);
      }
      
      // Also save to local cache
      await window.LocalDB.save(STORES.performance, payload);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update signal stat:', error);
      await window.LocalDB.save(STORES.performance, stats);
      return { success: true };
    }
  }

  // ==================== HEALTH CHECK ====================

  async health() {
    try {
      await this.request('GET', '/settings?limit=1');
      return { ok: true, ts: new Date().toISOString() };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
}

// Create singleton
window.SupabaseDB = new SupabaseDB();
