✅ SUPABASE SETUP CHECKLIST

═══════════════════════════════════════════════════════════════════

STEP 1: Environment Variables ✅ DONE
─────────────────────────────────────────────────────────────────
✅ VITE_SUPABASE_URL = https://qgwgpmbvysnuupnhopej.supabase.co
✅ VITE_SUPABASE_ANON_KEY = [configured]

Remaining:
⏳ SUPABASE_SERVICE_ROLE_KEY = [needs to be added]

═══════════════════════════════════════════════════════════════════

STEP 2: Get Service Role Key (2 minutes)
─────────────────────────────────────────────────────────────────

1. Go to Supabase Dashboard:
   https://app.supabase.com

2. Select your project: qgwgpmbvysnuupnhopej

3. In left sidebar, click: Settings → API

4. Look for "Service Role Key" section
   (scroll down, below "anon public" key)

5. Copy the SERVICE_ROLE_KEY

6. Edit .env file and add:
   SUPABASE_SERVICE_ROLE_KEY=<paste_here>

═══════════════════════════════════════════════════════════════════

STEP 3: Create Database Tables (5 minutes)
─────────────────────────────────────────────────────────────────

1. Go to: SQL Editor (in left sidebar)

2. Open file: SUPABASE_SETUP.md

3. Copy ALL the SQL code (from CREATE TABLE settings... to the end)

4. Paste into Supabase SQL Editor

5. Click "Run" button (top right)

6. Wait for success message: "✅ 9 queries completed successfully"

7. Go to Table Editor to verify tables exist:
   ✓ settings
   ✓ trades
   ✓ ticks
   ✓ ml_models
   ✓ signal_performance
   ✓ decision_logs

═══════════════════════════════════════════════════════════════════

STEP 4: Test Locally (3 minutes)
─────────────────────────────────────────────────────────────────

Run these commands:

  cd /workspaces/four
  npm install
  npm start

Then:
  • Open http://localhost:3000 in browser
  • Check browser console (F12 → Console) for errors
  • Try clicking "Settings" and saving a value
  • It should save to Supabase + IndexedDB cache

═══════════════════════════════════════════════════════════════════

STEP 5: (Optional) Add ML Keys
─────────────────────────────────────────────────────────────────

For TensorFlow + Hugging Face to work:

HUGGINGFACE_API_KEY:
  → Get from: https://huggingface.co/settings/tokens
  → Create "Access Token"
  → Copy and add to .env

DERIV_APP_ID:
  → Get from: https://deriv.com/account/api-token
  → Create new token
  → Add to .env

═══════════════════════════════════════════════════════════════════

STEP 6: Deploy to Render
─────────────────────────────────────────────────────────────────

When ready to deploy:

1. Commit changes:
   git add .
   git commit -m "Add Supabase credentials"

2. Push to GitHub:
   git push origin main

3. Go to Render.com:
   → Create Web Service
   → Connect your GitHub repo
   → Select main branch
   → Add environment variables from .env

4. Click "Deploy"

═══════════════════════════════════════════════════════════════════

YOUR SUPABASE PROJECT DETAILS
─────────────────────────────────────────────────────────────────

Project ID:     qgwgpmbvysnuupnhopej
Database URL:   https://qgwgpmbvysnuupnhopej.supabase.co
Region:         (auto-detected)
Database Type:  PostgreSQL
REST API:       Automatic (Supabase)

═══════════════════════════════════════════════════════════════════

TROUBLESHOOTING
─────────────────────────────────────────────────────────────────

❌ "Failed to load settings" in browser
  → Check: Did you run the SQL to create tables?
  → Check: Are VITE_* variables correct?
  → Try: Open DevTools → Console → look for errors

❌ "API returned 401/403"
  → Check: Is ANON KEY correct in .env?
  → Check: Are RLS policies set? (should see "Allow all for authenticated")
  → Fix: Go to Supabase → Table Editor → Click gear icon → RLS

❌ "Tables don't exist"
  → Go to: Supabase → SQL Editor
  → Run the SQL from SUPABASE_SETUP.md again
  → Wait for "9 queries completed"

❌ "No data saving"
  → Check browser IndexedDB: DevTools → Application → IndexedDB
  → Check Supabase table directly: Table Editor
  → Try: Refresh page, clear cache, try again

═══════════════════════════════════════════════════════════════════

IMMEDIATE NEXT ACTION
─────────────────────────────────────────────────────────────────

👉 Get Service Role Key:
   Go to: https://app.supabase.com
   Project: qgwgpmbvysnuupnhopej
   Settings → API → Service Role Key
   Copy and add to .env file

═══════════════════════════════════════════════════════════════════
