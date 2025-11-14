/**
 * Unified Signal Generation
 * Combines TensorFlow predictions, sentiment analysis, and technical indicators
 * into a single, actionable trading signal
 */

class SignalGenerator {
  constructor(options = {}) {
    this.weights = options.weights || {
      tfPrediction: 0.40,      // TensorFlow LSTM prediction
      sentiment: 0.30,          // Market sentiment
      technical: 0.20,          // Traditional technical indicators
      ensemble: 0.10             // Legacy ensemble model
    };

    this.riskParameters = options.riskParameters || {
      minConfidence: 0.60,
      maxPositionSize: 0.10,
      maxDailyLoss: 100,
      stopLoss: 0.02,
      takeProfit: 0.05
    };

    this.history = [];
    this.maxHistoryLength = options.maxHistoryLength || 1000;
  }

  /**
   * Generate unified trading signal from multiple sources
   * @param {Object} inputs - Signal inputs
   * @returns {Object} Trading signal with confidence
   */
  generateSignal(inputs) {
    const {
      tfPrediction = null,
      sentiment = null,
      technicalIndicators = null,
      ensemblePredicton = null,
      accountBalance = 0,
      dailyLoss = 0
    } = inputs;

    // Check risk limits first
    const riskCheck = this._checkRiskLimits(accountBalance, dailyLoss);
    if (!riskCheck.allowed) {
      return {
        action: 'HOLD',
        signal: 0.5,
        confidence: 0,
        reason: riskCheck.reason,
        timestamp: new Date().toISOString()
      };
    }

    // Normalize individual scores
    const scores = {};
    let totalWeight = 0;

    if (tfPrediction !== null) {
      scores.tf = tfPrediction.confidence || 0;
      totalWeight += this.weights.tfPrediction;
    }

    if (sentiment !== null) {
      scores.sentiment = sentiment.score || 0.5;
      totalWeight += this.weights.sentiment;
    }

    if (technicalIndicators !== null) {
      scores.technical = this._scoreTechnicalIndicators(technicalIndicators);
      totalWeight += this.weights.technical;
    }

    if (ensemblePredicton !== null) {
      scores.ensemble = ensemblePredicton;
      totalWeight += this.weights.ensemble;
    }

    // If no inputs, return neutral
    if (totalWeight === 0) {
      return {
        action: 'HOLD',
        signal: 0.5,
        confidence: 0,
        reason: 'No valid inputs',
        timestamp: new Date().toISOString()
      };
    }

    // Weighted combination
    let combinedScore = 0;
    Object.keys(scores).forEach(key => {
      const weight = this.weights[`${key}Prediction`] || 
                     (key === 'tf' ? this.weights.tfPrediction : 
                      key === 'sentiment' ? this.weights.sentiment :
                      key === 'technical' ? this.weights.technical :
                      this.weights.ensemble);
      combinedScore += (scores[key] * weight) / totalWeight;
    });

    // Determine action and confidence
    const confidence = Math.abs(combinedScore - 0.5) * 2; // 0-1
    let action = 'HOLD';
    let positionSize = 0;

    if (confidence >= this.riskParameters.minConfidence) {
      if (combinedScore > 0.65) {
        action = 'BUY';
        positionSize = this._calculatePositionSize(confidence, accountBalance);
      } else if (combinedScore < 0.35) {
        action = 'SELL';
        positionSize = this._calculatePositionSize(confidence, accountBalance);
      }
    }

    const signal = {
      action,
      signal: combinedScore,
      confidence,
      positionSize,
      scores,
      timestamp: new Date().toISOString(),
      recommendation: this._getRecommendation(combinedScore, confidence)
    };

    // Record in history
    this._addToHistory(signal);

    return signal;
  }

  /**
   * Generate signal with trend analysis
   * @param {Array} recentSignals - Last N signals
   * @returns {Object} Trend signal
   */
  generateTrendSignal(recentSignals) {
    if (!Array.isArray(recentSignals) || recentSignals.length === 0) {
      return { error: 'No signals provided' };
    }

    const signals = recentSignals.map(s => s.signal || 0.5);
    const avgSignal = signals.reduce((a, b) => a + b) / signals.length;
    
    const variance = signals.reduce((sum, s) => sum + Math.pow(s - avgSignal, 2), 0) / signals.length;
    const volatility = Math.sqrt(variance);

    // Trend detection
    let trend = 'neutral';
    if (signals.length >= 2) {
      const direction = signals[signals.length - 1] - signals[0];
      if (direction > 0.05) trend = 'bullish';
      else if (direction < -0.05) trend = 'bearish';
    }

    return {
      averageSignal: avgSignal,
      trend,
      volatility,
      consistency: 1 - volatility,
      strength: Math.abs(avgSignal - 0.5) * 2,
      sampleSize: signals.length
    };
  }

  /**
   * Get win rate from signal history
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    if (this.history.length === 0) {
      return { trades: 0, winRate: 0, avgConfidence: 0 };
    }

    const trades = this.history.filter(s => s.action !== 'HOLD');
    const winningTrades = trades.filter(s => s.pnl && s.pnl > 0);

    return {
      totalSignals: this.history.length,
      trades: trades.length,
      winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
      avgConfidence: trades.reduce((sum, t) => sum + (t.confidence || 0), 0) / (trades.length || 1),
      totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    };
  }

  /**
   * Add signal outcome (used after trade closes)
   * @param {string} signalId - Signal timestamp
   * @param {number} pnl - Profit/loss
   */
  recordOutcome(signalId, pnl) {
    const signal = this.history.find(s => s.timestamp === signalId);
    if (signal) {
      signal.pnl = pnl;
      signal.outcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAK_EVEN';
    }
  }

  // ==================== PRIVATE HELPERS ====================

  _checkRiskLimits(accountBalance, dailyLoss) {
    if (dailyLoss < -Math.abs(this.riskParameters.maxDailyLoss)) {
      return {
        allowed: false,
        reason: 'Daily loss limit reached'
      };
    }

    if (accountBalance <= 0) {
      return {
        allowed: false,
        reason: 'Insufficient account balance'
      };
    }

    return { allowed: true };
  }

  _scoreTechnicalIndicators(indicators) {
    const {
      rsi = 50,
      macdSignal = 0,
      bbands = 0,
      vortex = 0
    } = indicators;

    // RSI: overbought > 70 (bearish), oversold < 30 (bullish)
    const rsiScore = Math.max(0, Math.min(1, 1 - (rsi / 100)));

    // MACD: positive = bullish
    const macdScore = Math.max(0, Math.min(1, 0.5 + (macdSignal * 0.5)));

    // Bollinger Bands: ranging vs trending
    const bbandsScore = 0.5 + (bbands * 0.5);

    // Vortex: trend strength
    const vortexScore = Math.max(0, Math.min(1, vortex));

    return (rsiScore + macdScore + bbandsScore + vortexScore) / 4;
  }

  _calculatePositionSize(confidence, balance) {
    const baseSize = balance * this.riskParameters.maxPositionSize;
    return baseSize * confidence; // Scale by confidence
  }

  _getRecommendation(signal, confidence) {
    if (confidence < 0.4) return 'WAIT - Unclear signal';
    if (confidence < this.riskParameters.minConfidence) return 'CAUTION - Low confidence';

    if (signal > 0.65) {
      return confidence > 0.8 ? 'STRONG BUY' : 'BUY';
    } else if (signal < 0.35) {
      return confidence > 0.8 ? 'STRONG SELL' : 'SELL';
    } else {
      return 'HOLD - Mixed signals';
    }
  }

  _addToHistory(signal) {
    this.history.push(signal);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }
}

/**
 * Real-time signal monitoring
 */
class SignalMonitor {
  constructor(options = {}) {
    this.generator = new SignalGenerator(options);
    this.signals = [];
    this.alerts = [];
    this.maxSignals = options.maxSignals || 100;
  }

  /**
   * Process new market data and generate signal
   * @param {Object} marketData - Current market data
   * @returns {Object} New signal
   */
  processMarketData(marketData) {
    const signal = this.generator.generateSignal(marketData);
    
    this.signals.push(signal);
    if (this.signals.length > this.maxSignals) {
      this.signals.shift();
    }

    // Check for alerts
    if (signal.action !== 'HOLD') {
      this.alerts.push({
        ...signal,
        alertId: `alert_${Date.now()}`
      });
    }

    return signal;
  }

  /**
   * Get recent alerts
   * @param {number} limit - Number of alerts to return
   * @returns {Array} Recent alerts
   */
  getAlerts(limit = 10) {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts = [];
  }

  /**
   * Get statistics
   * @returns {Object} Monitor statistics
   */
  getStats() {
    const buySignals = this.signals.filter(s => s.action === 'BUY').length;
    const sellSignals = this.signals.filter(s => s.action === 'SELL').length;
    const avgConfidence = this.signals.length > 0 
      ? this.signals.reduce((sum, s) => sum + s.confidence, 0) / this.signals.length 
      : 0;

    return {
      totalSignals: this.signals.length,
      buySignals,
      sellSignals,
      holdSignals: this.signals.length - buySignals - sellSignals,
      averageConfidence: avgConfidence,
      alerts: this.alerts.length,
      performance: this.generator.getPerformanceMetrics()
    };
  }
}

exports.SignalGenerator = SignalGenerator;
exports.SignalMonitor = SignalMonitor;

exports.createGenerator = function(options = {}) {
  return new SignalGenerator(options);
};

exports.createMonitor = function(options = {}) {
  return new SignalMonitor(options);
};
