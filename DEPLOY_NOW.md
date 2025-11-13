# 🚀 FOUR HANDS — DEPLOY WITH ONE BUTTON

## Your Deployment Secrets (Already Ready)

✅ **NETLIFY_SITE_ID**: `69161109743d7e0093ee545e`  
✅ **NETLIFY_AUTH_TOKEN**: `nfp_Bjo7UMSvnNPkYbYCE6ik9vN2kKxkidUNe0a3`

---

## STEP 1: Add GitHub Secrets (One-Time Setup — 2 minutes)

1. Open your GitHub repo: https://github.com/onyangosilas09321-sketch/four
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

**Secret #1:**
- Name: `NETLIFY_SITE_ID`
- Value: `69161109743d7e0093ee545e`
- Click **Add secret**

**Secret #2:**
- Name: `NETLIFY_AUTH_TOKEN`
- Value: `nfp_Bjo7UMSvnNPkYbYCE6ik9vN2kKxkidUNe0a3`
- Click **Add secret**

✅ **Done!** Your secrets are now stored securely in GitHub.

---

## STEP 2: Deploy With One Button Click

### Option A: Using the Deploy Script (Easiest)

```bash
cd /workspaces/four
./deploy.sh
```

This will:
- Commit your latest changes
- Push to `main`
- Trigger GitHub Actions automatically
- Deploy to Netlify in ~2 minutes

### Option B: Manual Git Push

```bash
cd /workspaces/four
git push origin main
```

Then watch the deployment:
- Open: https://github.com/onyangosilas09321-sketch/four/actions
- Your `Deploy to Netlify` workflow will run automatically
- Once ✅ green, your site is live!

---

## STEP 3: Verify Your Deployment

**Check GitHub Actions:**
- Go to: https://github.com/onyangosilas09321-sketch/four/actions
- Click the latest `Deploy to Netlify` workflow
- When status is ✅ green, deployment succeeded

**Find Your Live URL:**
- In the workflow logs, look for the Netlify deploy message with your URL
- Or go to Netlify: https://app.netlify.com → select your site

**Your app is now live!** 🎉

---

## STEP 4: Complete Setup (Post-Deployment)

After your frontend is live on Netlify, complete these final steps:

### A. Deploy Cloud Code to Back4App

Your Parse Cloud functions still live in `cloud/` folder. Deploy them:

**Option 1: Via Back4App Dashboard**
1. Log in to https://www.back4app.com
2. Select your app
3. Go to **Cloud Code** section
4. Upload the `cloud/` folder contents
5. Click **Deploy**

**Option 2: Via Parse CLI**
```bash
npm install -g parse-cli
cd /workspaces/four/cloud
parse deploy
```

### B. Configure Deriv API Credentials

In your live app (on Netlify):
1. Click the **Connect** button in the top nav
2. Enter your **Deriv App ID** and **API Token**
3. Click **Connect**

### C. Train Your ML Model

1. Go to `/pages/ml.html` in your app
2. Click **Train Model**
3. Wait for training to complete
4. View accuracy metrics

---

## What's Deployed

✅ **Frontend** (on Netlify)
- Live dashboard with real-time price & signals
- Deep ML analysis with extended features
- Manual & auto trading UI
- Settings & ML pages

✅ **Cloud Code** (on Back4App) — *Still needs manual deploy*
- ML training & prediction endpoints
- Trade recording & metrics
- Model persistence

---

## Troubleshooting

**Workflow not running?**
- Check if secrets are added correctly (Settings → Secrets)
- Ensure you pushed to `main` branch
- Check Actions tab for error logs

**Build fails on Netlify?**
- Check the Netlify build logs
- Verify `netlify.toml` is in repo root

**App loads but no API calls work?**
- Cloud code not deployed to Back4App yet (see Step 4A)
- Deriv credentials not configured

---

## Summary

1. ✅ Add 2 GitHub secrets (NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN)
2. ✅ Run `./deploy.sh` or `git push origin main`
3. ✅ Watch GitHub Actions deploy to Netlify (~2 min)
4. ✅ Deploy cloud code to Back4App
5. ✅ Configure Deriv API credentials
6. ✅ Train ML model

**You're all set!** Your FOUR HANDS app is now deployment-ready and live on Netlify. 🚀
