# Four Hands - AI-Powered Trading Bot

**Production Version 1.0.0** | Deployment Ready for Render

## Overview

Four Hands is an advanced algorithmic trading bot that combines:
- 🧠 **TensorFlow LSTM** deep learning for price prediction
- 💬 **Hugging Face** sentiment analysis of market news
- ⚡ **Unified ML signal generation** for automated trading
- 🛡️ **Risk management** with position sizing and loss limits
- 📊 **Real-time trade tracking** and performance monitoring

Connects to **Deriv broker** for automated DIGITOVER trading on R_10 symbol.

## Quick Deploy to Render

### Prerequisites
- Render account (https://render.com)
- GitHub account with this repo
- Hugging Face API key (https://huggingface.co/settings/tokens)
- Deriv API credentials (if enabling live trading)
- Parse Server (Back4App) credentials for cloud functions

### 1-Click Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production ready v1.0"
   git push origin main
   ```

2. **Connect Render**
   - Go to https://render.com
   - Click "New" → "Web Service"
   - Connect your GitHub account and select this repo
   - Select `main` branch
   - Render auto-detects Node.js

3. **Set Environment Variables** in Render dashboard:
   ```
   NODE_ENV=production
   HUGGINGFACE_API_KEY=hf_your_key_here
   PARSE_APP_ID=your_parse_app_id
   PARSE_REST_API_KEY=your_parse_key
   PARSE_SERVER_URL=https://parseapi.back4app.com
   ```

4. **Deploy** - Click "Create Web Service"

Your app will be live at: `https://your-app-name.onrender.com`

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│           Render (Node.js)                  │
│  ┌────────────────────────────────────────┐ │
│  │  Express Server (Port 3000)            │ │
│  │  - Serves public/ frontend             │ │
│  │  - Health checks                       │ │
│  │  - Static assets                       │ │
│  └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
           ↓              ↓              ↓
    ┌─────────────┐ ┌──────────┐ ┌───────────┐
    │ TensorFlow  │ │Hugging   │ │  Parse    │
    │    .js      │ │ Face API │ │ Back4App  │
    │ (Browser)   │ │(Sentiment)│ │(Cloud Fn) │
    └─────────────┘ └──────────┘ └───────────┘
           ↓
    ┌─────────────────────┐
    │  Deriv WebSocket    │
    │  (Live Trading)     │
    └─────────────────────┘
```

## File Structure

```
four/
├── server.js                 # Express server (Render entry point)
├── package.json              # Node dependencies
├── render.yaml               # Render deployment config
├── Dockerfile                # Container image
├── .env.example              # Configuration template
├── cloud/
│   ├── main.js               # Parse Cloud Functions (ML endpoints)
│   └── lib/
│       ├── tensorflowML.js   # TensorFlow LSTM model
│       ├── sentimentAnalysis.js # Hugging Face sentiment
│       ├── signalGeneration.js  # Unified signal gen
│       ├── ml.js             # Legacy ensemble
│       ├── features.js       # Feature engineering
│       └── validations.js    # Input validation
└── public/
    ├── index.html            # Main trading UI
    ├── pages/
    │   ├── trades.html       # Trade history
    │   ├── settings.html     # Settings
    │   └── ml.html           # ML model UI
    └── js/
        ├── api.js            # Parse API wrapper
        ├── deriv.js          # Deriv WebSocket client
        ├── autoAgent.js      # Automated trading logic
        ├── trader.js         # Manual trading UI
        ├── app.js            # Main app logic
        ├── chart.js          # Chart rendering
        ├── tradesLive.js     # Trade tracking
        └── [other modules]
```

## Configuration

Edit `.env` before deployment:

```bash
cp .env.example .env
```

**Required variables:**
```env
HUGGINGFACE_API_KEY=hf_xxx          # Sentiment analysis
PARSE_APP_ID=xxx                    # Cloud functions
PARSE_REST_API_KEY=xxx
PARSE_SERVER_URL=https://parseapi.back4app.com
```

**Optional (for live trading):**
```env
DERIV_APP_ID=xxx                    # Deriv broker
```

**Risk Management:**
```env
MIN_SIGNAL_CONFIDENCE=0.60
MAX_POSITION_SIZE=0.10
MAX_DAILY_LOSS=100
```

## Features

### ML Models
- **TensorFlow LSTM** - 60-step sequence learning for price prediction
- **Hugging Face Sentiment** - Real-time news sentiment analysis
- **Unified Signal** - Combines TensorFlow (40%) + Sentiment (30%) + Technical (20%) + Ensemble (10%)

### Trading
- **Automated execution** - AutoAgent places trades based on signals
- **Risk management** - Position sizing, daily loss limits, consecutive loss tracking
- **Manual override** - UI for manual trades when auto is disabled
- **Trade recording** - All trades logged to Parse database

### Monitoring
- **Live price chart** - Real-time price visualization
- **P&L tracking** - Session cumulative profit/loss
- **Trade history** - Detailed trade statistics and analysis
- **Signal quality** - Performance metrics and win rate

## Local Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Run development server
npm run dev
# Opens http://localhost:8080
```

## Production Build & Test

```bash
# Build (static frontend copy)
npm run build

# Start production server
npm start
# Server runs on http://localhost:3000
```

## Health Check

```bash
curl https://your-app-name.onrender.com/health
# Response: {"status":"healthy","timestamp":"...","environment":"production"}
```

## API Endpoints

### Cloud Functions (via Parse)
Accessible from browser with `API.*`:

| Function | Purpose |
|----------|---------|
| `API.trainTensorFlowModel()` | Train LSTM model |
| `API.predictTensorFlow(prices)` | Get price prediction |
| `API.analyzeSentiment(texts)` | Analyze market sentiment |
| `API.generateUnifiedSignal()` | Generate trading signal |
| `API.getSignalPerformance()` | Get signal stats |
| `API.recordTrade()` | Record completed trade |
| `API.listTrades()` | Get trade history |
| `API.getMetrics()` | Get account metrics |

### REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/` | GET | Serve index.html |

## Monitoring & Logging

Render provides built-in logs:
- **Render Dashboard** → Select Service → Logs
- View real-time console output and errors

To debug:
```bash
# Check Render logs
# Render Dashboard → Logs tab

# Or SSH into container
render ssh <service-id>
```

## Troubleshooting

### Issue: Hugging Face API errors
**Solution:** Ensure `HUGGINGFACE_API_KEY` is set in Render environment variables and is valid.

### Issue: Parse Cloud Functions not responding
**Solution:** Check that `PARSE_APP_ID`, `PARSE_REST_API_KEY`, and `PARSE_SERVER_URL` are correct in `.env`.

### Issue: Deriv connection fails
**Solution:** Ensure Deriv API credentials are correct in browser localStorage or `.env`.

### Issue: High memory usage
**Solution:** TensorFlow models use ~200MB. Render Starter plan has 512MB RAM (sufficient).

## Security Notes

⚠️ **Important:**
- Never commit `.env` file with real API keys
- Use Render environment variables for secrets
- Set `HUGGINGFACE_API_KEY` via Render dashboard only
- Use HTTPS (Render provides free SSL)
- Enable auto-deploy with main branch only

## Performance

| Component | Latency | Cache |
|-----------|---------|-------|
| TensorFlow prediction | ~500ms (first) / <50ms | Per model |
| Sentiment analysis | ~1-2s | 1 hour |
| Unified signal | ~2s | Per input |
| Memory usage | ~350MB | Model + data |

## Next Steps

1. **Test locally** - `npm run dev`
2. **Deploy to Render** - Follow "Quick Deploy" section
3. **Monitor logs** - Render Dashboard → Logs
4. **Verify trades** - Check trade history in UI
5. **Adjust settings** - Risk management params in `.env`

## Support

- 📖 See `ML_INTEGRATION_GUIDE.md` for detailed API docs
- 🐛 Check Render logs for errors
- 💡 Review Parse Server documentation for cloud functions

## Version

- **1.0.0** - Production release with TensorFlow + Hugging Face ML integration
- Tested and ready for live trading

---

**Status**: ✅ Production Ready for Render Deployment  
**Last Updated**: November 14, 2025  
**Deployment Target**: Render.com