# Back4App to Supabase Migration Guide

## ✅ Migration Complete!

Your app has been fully migrated from Back4App (Parse Server) to **Supabase PostgreSQL** with **IndexedDB offline caching**.

---

## What Changed

### Removed
- ❌ `parse` npm package
- ❌ `parse-server` npm package  
- ❌ Parse SDK from all HTML files
- ❌ Parse Cloud Functions from frontend
- ❌ Back4App database dependency

### Added
- ✅ `@supabase/supabase-js` npm package
- ✅ `public/js/supabase.js` - Supabase REST API client
- ✅ `public/js/localdb.js` - IndexedDB local cache
- ✅ ML API routes in `server.js` (/api/ml/*)
- ✅ Supabase PostgreSQL database

---

## Database Features

### Supabase (Cloud)
- **PostgreSQL database** - robust, scalable
- **FREE tier**: 500MB storage, 50K monthly active users
- **Tables**: trades, settings, ticks, ml_models, signal_performance, decision_logs
- **Automatic REST API** - no need for Parse Server
- **Real-time capabilities** - optional WebSockets

### IndexedDB (Browser Cache)
- **Offline-first architecture** - works without internet
- **Auto-sync every 5 minutes** to Supabase
- **Stores**: trades, settings, models, ticks, performance stats
- **Zero server cost** - 100% client-side caching

---

## Setup Instructions (5 minutes)

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub
4. Create new project:
   - Name: `four-hands-trading`
   - Database password: (generate strong)
   - Region: Choose closest to you
5. Wait 2 minutes for database to initialize

### 2. Get Your Credentials

After project creation:
1. Go to **Settings** → **Database**
2. Copy the **URL** (e.g., `https://xxxxx.supabase.co`)
3. Go to **Settings** → **API**
4. Copy the **anon key** (public, safe in frontend)
5. Copy the **service_role key** (secret, use in backend only)

### 3. Create Database Tables

1. In Supabase, go to **SQL Editor**
2. Copy the full SQL from `SUPABASE_SETUP.md`
3. Run the SQL script
4. Verify tables appear in **Table Editor**

### 4. Add Environment Variables

Create `.env` file in project root:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxx...
HUGGINGFACE_API_KEY=hf_xxx...
NODE_ENV=production
PORT=3000
```

### 5. Deploy to Render

```bash
git add .
git commit -m "Migrate to Supabase - remove Parse Server"
git push origin main
```

Then on Render dashboard:
1. Create Web Service from GitHub repo
2. Add environment variables (from step 4)
3. Click "Deploy"
4. Wait ~2 minutes for build to complete

---

## Database Schema

### Settings Table
```
- id (PRIMARY KEY)
- base_stake, min_stake, max_stake
- max_daily_loss, max_drawdown, kelly_fraction
- trading_enabled, account_balance, currency
- (+ 20 more config fields)
```

### Trades Table
```
- id (PRIMARY KEY)
- timestamp, trade_id, contract_id
- stake, duration, buy_price, sell_price
- pnl, prediction_confidence, model_version
- status, signal_type, signal_strength
```

### ML Models Table
```
- id (PRIMARY KEY)
- model_type, model_version
- model_data (JSONB - stores serialized weights)
- accuracy, trained_samples, training_date
```

### Ticks Table
```
- id (PRIMARY KEY)
- epoch, ts, symbol, quote
- Indexes: epoch, symbol (for fast lookups)
```

### Signal Performance Table
```
- id (PRIMARY KEY)
- signal_type, hits, samples, accuracy
```

---

## How It Works

### Frontend Flow
1. App loads → IndexedDB initializes
2. User action → Call `window.SupabaseDB` method
3. API hit Supabase → Save result + local cache
4. No internet? → Use IndexedDB cached data
5. Internet back? → Auto-sync in background

### Example: Save Settings

```javascript
// Frontend
const result = await API.saveSettings({ 
  baseStake: 10, 
  maxDailyLoss: 500 
});

// What happens:
// 1. SupabaseDB sends PATCH to Supabase REST API
// 2. Supabase updates PostgreSQL database
// 3. SupabaseDB saves to IndexedDB locally
// 4. App shows success (even if offline - will sync later)
```

### Example: Get Trades

```javascript
// Frontend
const trades = await API.listTrades({ limit: 100 });

// What happens:
// 1. Try to fetch from Supabase REST API
// 2. If online → Get fresh data + update cache
// 3. If offline → Return from IndexedDB
// 4. If error → Fall back to cached data
```

---

## API Methods (No Changes Needed!)

All these methods work exactly the same as before:

```javascript
API.getMetrics()          // Get trading stats
API.listTrades()          // Get trade history
API.getSettings()         // Get user config
API.saveSettings(data)    // Save user config
API.recordTrade(trade)    // Record new trade
API.saveTick(data)        // Save price data
API.canTrade()            // Check if trading allowed
API.getModel()            // Get trained ML model
API.trainTensorFlow()     // Train TensorFlow model
API.predictTensorFlow()   // Make prediction
API.analyzeSentiment()    // Sentiment analysis
API.generateUnifiedSignal() // Combined signal
```

---

## ML Models Still Work!

### TensorFlow.js (Local)
- LSTM for price prediction
- Runs in browser/Node.js
- Models stored in `ml_models` table
- No API calls needed

### Hugging Face (API)
- Sentiment analysis
- Requires `HUGGINGFACE_API_KEY` env var
- Called from `/api/ml/sentiment` endpoint

### Signal Generation
- Combines TensorFlow + Sentiment + Technical
- Called from `/api/ml/signal` endpoint
- Returns direction + confidence

---

## Offline Mode

When offline:
- ✅ View existing trades (from IndexedDB)
- ✅ View settings (from IndexedDB)
- ✅ View ML metrics (from IndexedDB)
- ⚠️ Manual trading blocked (can't sync orders)
- ⚠️ ML training blocked (needs real-time data)

When back online:
- Auto-syncs any pending changes
- Fetches latest data from Supabase
- Resumes trading

---

## Troubleshooting

### Supabase Not Working?
1. Check `.env` has correct credentials
2. Verify Supabase tables exist
3. Check browser console for API errors
4. Ensure row-level security (RLS) policies allow access

### Data Not Syncing?
1. Check browser IndexedDB (DevTools → Application → IndexedDB)
2. Check Supabase data directly (Table Editor)
3. Check browser console for errors
4. Try clearing IndexedDB and refresh

### ML Not Working?
1. Check `HUGGINGFACE_API_KEY` is set
2. Check `/api/ml/*` endpoints respond
3. Try calling from browser console: `await API.predictTensorFlow([1,2,3])`
4. Check server logs for errors

---

## Cost Analysis

### Supabase FREE Tier
- ✅ 500MB database storage
- ✅ 50,000 monthly active users
- ✅ Unlimited bandwidth (within fair use)
- ✅ Unlimited REST API calls
- ✅ Perfect for single-user trading bot

### Render FREE Tier
- ✅ Web Service (limited spins-down)
- ✅ Always-on for paid projects
- ✅ 100GB bandwidth/month
- ⚠️ Free tier: goes to sleep after 15 min inactivity

### Total Cost: **$0/month** (unless scaling)

---

## Next Steps

1. ✅ Set up Supabase account
2. ✅ Create database tables (SQL from SUPABASE_SETUP.md)
3. ✅ Add environment variables
4. ✅ Test locally: `npm start`
5. ✅ Deploy to Render
6. ✅ Verify health: `curl https://your-service.onrender.com/health`

---

## Important Notes

- **No Parse Server anymore** - cleaner architecture
- **All data in your own PostgreSQL** - not Back4App
- **Offline-first with IndexedDB** - works without internet
- **Free tier sufficient for trading bot** - no upgrade needed
- **Same API interface** - no code changes for API calls
- **ML models still local** - TensorFlow.js runs in browser/server

---

## Support

- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- IndexedDB Guide: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- TensorFlow.js: https://js.tensorflow.org/

---

**Status**: ✅ Ready to Deploy!
