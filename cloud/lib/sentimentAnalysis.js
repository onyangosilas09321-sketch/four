/**
 * Sentiment Analysis using Hugging Face Transformers.js
 * Analyzes market sentiment from news, tweets, and social signals
 */

const axios = require('axios');

class SentimentAnalyzer {
  constructor(options = {}) {
    this.huggingFaceApiKey = options.huggingFaceApiKey || process.env.HUGGINGFACE_API_KEY;
    this.model = options.model || 'distilbert-base-uncased-finetuned-sst-2-english';
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 3600000; // 1 hour
  }

  /**
   * Analyze sentiment of market-related text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment scores
   */
  async analyzeSentiment(text) {
    if (!text || typeof text !== 'string') {
      return { error: 'Invalid input text' };
    }

    // Check cache
    const cacheKey = this._hashText(text);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // Use Hugging Face Inference API
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.model}`,
        { inputs: text },
        {
          headers: {
            Authorization: `Bearer ${this.huggingFaceApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const result = this._parseHFResponse(response.data);
      
      // Cache result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Sentiment analysis error:', error.message);
      return this._fallbackSentimentAnalysis(text);
    }
  }

  /**
   * Analyze multiple texts and aggregate sentiment
   * @param {Array<string>} texts - Array of texts to analyze
   * @returns {Promise<Object>} Aggregated sentiment
   */
  async analyzeMultiple(texts) {
    const results = await Promise.all(
      texts.map(text => this.analyzeSentiment(text))
    );

    return this._aggregateSentiments(results);
  }

  /**
   * Analyze market news articles
   * @param {Array<Object>} articles - Articles with title and description
   * @returns {Promise<Object>} Market sentiment
   */
  async analyzeNews(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
      return { error: 'Invalid articles input' };
    }

    const texts = articles.map(a => `${a.title || ''} ${a.description || ''}`).filter(t => t.length > 0);
    
    if (texts.length === 0) {
      return { error: 'No text content in articles' };
    }

    return await this.analyzeMultiple(texts);
  }

  /**
   * Detect trading-specific keywords and sentiment
   * @param {string} text - Market text
   * @returns {Object} Keyword-based sentiment
   */
  detectTradingSignals(text) {
    const bullishKeywords = [
      'bullish', 'uptrend', 'rally', 'surge', 'gain', 'pump',
      'breakthrough', 'moon', 'boom', 'soar', 'outperform'
    ];
    
    const bearishKeywords = [
      'bearish', 'downtrend', 'crash', 'dump', 'loss', 'decline',
      'breakdown', 'plunge', 'fall', 'collapse', 'underperform'
    ];

    const lowerText = text.toLowerCase();
    
    let bullishCount = 0, bearishCount = 0;
    
    bullishKeywords.forEach(kw => {
      bullishCount += (lowerText.match(new RegExp(kw, 'gi')) || []).length;
    });
    
    bearishKeywords.forEach(kw => {
      bearishCount += (lowerText.match(new RegExp(kw, 'gi')) || []).length;
    });

    const total = bullishCount + bearishCount;
    const neutral = text.length - bullishCount - bearishCount;

    return {
      bullishKeywords: bullishCount,
      bearishKeywords: bearishCount,
      sentiment: bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral',
      score: total > 0 ? bullishCount / total : 0.5
    };
  }

  /**
   * Combine transformer and keyword-based analysis
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Hybrid sentiment
   */
  async hybridAnalysis(text) {
    const [transformerResult, keywordResult] = await Promise.all([
      this.analyzeSentiment(text),
      Promise.resolve(this.detectTradingSignals(text))
    ]);

    // Weighted average
    const positivity = (
      (transformerResult.positive || 0) * 0.6 +
      (keywordResult.score) * 0.4
    );

    return {
      transformerScore: transformerResult,
      keywordScore: keywordResult,
      hybrid: {
        score: positivity,
        sentiment: positivity > 0.6 ? 'bullish' : positivity < 0.4 ? 'bearish' : 'neutral',
        confidence: Math.abs(positivity - 0.5) * 2 // 0-1
      }
    };
  }

  /**
   * Trend sentiment from multiple data points
   * @param {Array<string>} recentTexts - Recent market texts
   * @returns {Promise<Object>} Trend sentiment
   */
  async getTrendSentiment(recentTexts) {
    if (!Array.isArray(recentTexts) || recentTexts.length === 0) {
      return { error: 'Invalid input' };
    }

    const sentiments = await Promise.all(
      recentTexts.map(text => this.hybridAnalysis(text))
    );

    const scores = sentiments.map(s => s.hybrid.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const volatility = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
    );

    return {
      averageSentiment: avgScore,
      trend: avgScore > 0.55 ? 'bullish' : avgScore < 0.45 ? 'bearish' : 'neutral',
      volatility: volatility,
      strength: 1 - volatility, // Higher confidence if consistent
      samples: sentiments.length
    };
  }

  // ==================== PRIVATE HELPERS ====================

  _parseHFResponse(data) {
    // Handle Hugging Face response format
    if (Array.isArray(data) && data[0]) {
      const scores = data[0];
      let positive = 0, negative = 0;

      scores.forEach(s => {
        if (s.label === 'POSITIVE') positive = s.score;
        else if (s.label === 'NEGATIVE') negative = s.score;
      });

      return {
        positive: positive,
        negative: negative,
        neutral: 1 - positive - negative,
        sentiment: positive > negative ? 'positive' : 'negative'
      };
    }

    return { error: 'Unexpected response format' };
  }

  _fallbackSentimentAnalysis(text) {
    // Basic fallback when API unavailable
    const positiveWords = ['good', 'great', 'excellent', 'up', 'gain', 'bull'];
    const negativeWords = ['bad', 'poor', 'terrible', 'down', 'loss', 'bear'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(w => lowerText.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lowerText.includes(w)).length;

    const total = positiveCount + negativeCount;
    const positive = total > 0 ? positiveCount / total : 0.5;

    return {
      positive: positive,
      negative: 1 - positive,
      neutral: 0,
      sentiment: positive > 0.5 ? 'positive' : 'negative',
      fallback: true
    };
  }

  _aggregateSentiments(results) {
    const validResults = results.filter(r => !r.error && !r.fallback);
    
    if (validResults.length === 0) {
      return { error: 'Could not analyze any texts' };
    }

    const avgPositive = validResults.reduce((s, r) => s + (r.positive || 0), 0) / validResults.length;
    const avgNegative = validResults.reduce((s, r) => s + (r.negative || 0), 0) / validResults.length;

    return {
      positive: avgPositive,
      negative: avgNegative,
      neutral: 1 - avgPositive - avgNegative,
      sentiment: avgPositive > avgNegative ? 'positive' : 'negative',
      samples: validResults.length
    };
  }

  _hashText(text) {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

exports.SentimentAnalyzer = SentimentAnalyzer;

exports.createAnalyzer = function(options = {}) {
  return new SentimentAnalyzer(options);
};

// Singleton pattern for cloud functions
let analyzerInstance = null;

exports.getInstance = function(options = {}) {
  if (!analyzerInstance) {
    analyzerInstance = new SentimentAnalyzer(options);
  }
  return analyzerInstance;
};
