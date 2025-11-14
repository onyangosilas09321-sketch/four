# Supabase Setup Guide (5 minutes)

## 1. Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub or email
4. Create a new project:
   - Name: `four-hands-trading`
   - Database password: (generate strong password)
   - Region: Choose closest to you
5. Wait ~2 minutes for database to initialize

## 2. Get Your Connection Details

After project is created:
- Go to **Settings** → **Database** 
- Copy the **URL** (looks like `https://xxxxx.supabase.co`)
- Go to **Settings** → **API**
- Copy the **anon key** (public, safe to expose in frontend)
- Copy the **service_role key** (secret, use on backend only)

Store in `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxx...
```

## 3. Create Database Tables

Go to **SQL Editor** in Supabase dashboard. Run this SQL:

```sql
-- Settings table (user configuration)
CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  base_stake DECIMAL(12,2) DEFAULT 10,
  min_stake DECIMAL(12,2) DEFAULT 5,
  max_stake DECIMAL(12,2) DEFAULT 100,
  duration INTEGER DEFAULT 1,
  duration_unit TEXT DEFAULT 't',
  max_trades_day INTEGER DEFAULT 50,
  max_open_positions INTEGER DEFAULT 5,
  max_daily_loss DECIMAL(12,2) DEFAULT 500,
  max_drawdown DECIMAL(5,2) DEFAULT 20,
  kelly_fraction DECIMAL(5,2) DEFAULT 0.25,
  consecutive_loss_limit INTEGER DEFAULT 5,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.55,
  min_edge DECIMAL(3,2) DEFAULT 0.05,
  training_interval_hours INTEGER DEFAULT 24,
  min_training_samples INTEGER DEFAULT 500,
  reduce_stake_on_loss BOOLEAN DEFAULT TRUE,
  use_stop_loss BOOLEAN DEFAULT TRUE,
  use_take_profit BOOLEAN DEFAULT TRUE,
  online_learning BOOLEAN DEFAULT FALSE,
  deriv_app_id TEXT DEFAULT '',
  trading_enabled BOOLEAN DEFAULT TRUE,
  account_balance DECIMAL(12,2) DEFAULT 0,
  available_margin DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD'
);

-- Trades table (trade history)
CREATE TABLE trades (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  timestamp TIMESTAMP,
  trade_id TEXT UNIQUE,
  contract_id TEXT,
  contract_type TEXT DEFAULT 'DIGITOVER',
  stake DECIMAL(12,2),
  duration INTEGER,
  duration_unit TEXT,
  buy_price DECIMAL(12,4),
  sell_price DECIMAL(12,4),
  pnl DECIMAL(12,4),
  prediction_confidence DECIMAL(3,2),
  model_version TEXT,
  status TEXT DEFAULT 'closed',
  signal_type TEXT,
  signal_strength DECIMAL(3,2)
);

-- Ticks table (price data)
CREATE TABLE ticks (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  epoch BIGINT,
  ts TIMESTAMP,
  symbol TEXT,
  quote DECIMAL(12,6)
);

-- ML Models table (trained model storage)
CREATE TABLE ml_models (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  model_type TEXT,
  model_version TEXT,
  model_data JSONB,
  accuracy DECIMAL(5,4),
  trained_samples INTEGER,
  training_date TIMESTAMP
);

-- Signal Performance table
CREATE TABLE signal_performance (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  signal_type TEXT,
  hits INTEGER DEFAULT 0,
  samples INTEGER DEFAULT 0,
  accuracy DECIMAL(5,4)
);

-- Decision Logs (for debugging)
CREATE TABLE decision_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  ts TIMESTAMP,
  decision_data JSONB
);

-- Indexes for performance
CREATE INDEX trades_timestamp ON trades(timestamp DESC);
CREATE INDEX trades_status ON trades(status);
CREATE INDEX ticks_epoch ON ticks(epoch DESC);
CREATE INDEX ticks_symbol ON ticks(symbol);
CREATE INDEX ml_models_version ON ml_models(model_version);

-- Row Level Security (RLS) policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (for now)
CREATE POLICY "Allow all for authenticated users" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON ticks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON ml_models FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON signal_performance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON decision_logs FOR ALL USING (true) WITH CHECK (true);
```

## 4. Test Connection

After creating tables, you should see them in the Table Editor. That's it!

## Environment Variables

Add to `.env`:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyxx...
SUPABASE_SERVICE_ROLE_KEY=eyxx...
```

Your app will now use Supabase instead of Back4App!
