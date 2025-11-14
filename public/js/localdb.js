/**
 * IndexedDB Local Cache Module
 * Provides offline-first storage with automatic sync to Supabase
 */

const DB_NAME = 'FourHandsTrading';
const DB_VERSION = 1;
const STORES = {
  trades: 'trades',
  settings: 'settings',
  models: 'models',
  ticks: 'ticks',
  performance: 'performance'
};

class LocalDB {
  constructor() {
    this.db = null;
    this.syncInterval = 5 * 60 * 1000; // Sync every 5 minutes
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Trades store
        if (!db.objectStoreNames.contains(STORES.trades)) {
          const store = db.createObjectStore(STORES.trades, { keyPath: 'id', autoIncrement: true });
          store.createIndex('trade_id', 'trade_id', { unique: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
        
        // Settings store (single row)
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'id', autoIncrement: true });
        }
        
        // Models store
        if (!db.objectStoreNames.contains(STORES.models)) {
          const store = db.createObjectStore(STORES.models, { keyPath: 'id', autoIncrement: true });
          store.createIndex('model_version', 'model_version', { unique: false });
        }
        
        // Ticks store
        if (!db.objectStoreNames.contains(STORES.ticks)) {
          const store = db.createObjectStore(STORES.ticks, { keyPath: 'id', autoIncrement: true });
          store.createIndex('epoch', 'epoch', { unique: false });
          store.createIndex('symbol', 'symbol', { unique: false });
        }
        
        // Signal performance store
        if (!db.objectStoreNames.contains(STORES.performance)) {
          const store = db.createObjectStore(STORES.performance, { keyPath: 'id', autoIncrement: true });
          store.createIndex('signal_type', 'signal_type', { unique: false });
        }
      };
    });
  }

  /**
   * Save to local store
   */
  async save(storeName, data) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get from local store
   */
  async get(storeName, key) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all from store
   */
  async getAll(storeName, query = null) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = query ? tx.objectStore(storeName).index(query) : tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Delete from local store
   */
  async delete(storeName, key) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Clear entire store
   */
  async clear(storeName) {
    const tx = this.db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get settings (single record)
   */
  async getSettings() {
    const all = await this.getAll(STORES.settings);
    return all.length > 0 ? all[0] : null;
  }

  /**
   * Save settings
   */
  async saveSettings(data) {
    const existing = await this.getSettings();
    if (existing) {
      data.id = existing.id;
    }
    return this.save(STORES.settings, data);
  }

  /**
   * Get trades with optional filtering
   */
  async getTrades(limit = 100, offset = 0) {
    const all = await this.getAll(STORES.trades);
    return all
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
  }

  /**
   * Get daily P&L
   */
  async getDailyPnL() {
    const trades = await this.getAll(STORES.trades);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return trades
      .filter(t => new Date(t.timestamp) >= today)
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }

  /**
   * Get total P&L
   */
  async getTotalPnL() {
    const trades = await this.getAll(STORES.trades);
    return trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  }

  /**
   * Get metrics
   */
  async getMetrics() {
    const trades = await this.getAll(STORES.trades);
    const settings = await this.getSettings();
    
    const winning = trades.filter(t => (t.pnl || 0) > 0).length;
    const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const dailyPnL = await this.getDailyPnL();
    
    return {
      success: true,
      data: {
        state: {
          account_balance: settings?.account_balance || 0,
          available_margin: settings?.available_margin || 0,
          currency: settings?.currency || 'USD',
          daily_pnl: dailyPnL,
          total_pnl: totalPnL,
          winning_trades: winning,
          total_trades: trades.length
        },
        performance: {}
      }
    };
  }
}

// Export singleton
window.LocalDB = new LocalDB();
