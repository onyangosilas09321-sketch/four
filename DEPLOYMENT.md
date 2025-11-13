# DEPLOYMENT CHECKLIST & QUICK START

## Pre-Deployment: Add GitHub Secrets (Manual Step — 2 minutes)

Your Netlify credentials are ready. Add them to your GitHub repo:

1. Go to: `https://github.com/onyangosilas09321-sketch/four/settings/secrets/actions`
2. Click **New repository secret** and add these two:

| Secret Name | Value |
|---|---|
| `NETLIFY_SITE_ID` | `69161109743d7e0093ee545e` |
| `NETLIFY_AUTH_TOKEN` | `nfp_Bjo7UMSvnNPkYbYCE6ik9vN2kKxkidUNe0a3` |

3. Click **Add secret** for each one.

## What's Ready

✅ **Frontend** (`public/`)
- Dashboard with live price, signals, and manual/auto trading UI
- Deep analysis with extended features (MACD, percentiles, skewness, kurtosis, EMAs)
- Client-side ML helper with compact model sync prediction and heuristic fallback
- Parse.initialize keys already embedded for Back4App

✅ **Cloud Code** (`cloud/`)
- `trainModel`: trains ensemble with class balance, validation split, returns metrics
- `getModel`: returns both full and compact model payloads
- `predict`, `mlAccuracy`, `mlPerformance`, `mlRetrain`: full ML pipeline
- All trade/tick recording, settings, and metrics endpoints

✅ **Deployment** 
- `Dockerfile` for nginx static container deployment
- `package.json` with `npm run start` for local testing
- GitHub Actions workflow (`.github/workflows/deploy.yml`) ready to push to Netlify
- `README.md` with full setup and deployment instructions

## One-Click Deployment Path

After adding the GitHub secrets above:

1. **Commit and push** your code:
   ```bash
   cd /workspaces/four
   git add -A
   git commit -m "feat: add ML hardening, extended features, GitHub Actions deployment"
   git push origin main
   ```

2. **Watch the deployment**:
   - Go to `https://github.com/onyangosilas09321-sketch/four/actions`
   - The `Deploy to Netlify` workflow will run automatically
   - Once green ✅, your site is live on Netlify

3. **Access your app**:
   - Netlify will assign a URL (check the workflow logs)
   - Or set a custom domain in Netlify dashboard

## Next: Cloud Code Deployment

Your Parse Cloud code in `cloud/` still needs to be deployed to Back4App:

1. Log into Back4App: `https://www.back4app.com`
2. Select your app
3. Go to **Cloud Code** section
4. Upload the contents of `cloud/` folder (or use their CLI: `parse deploy`)
5. Restart the app

Or use Parse CLI locally:
```bash
npm install -g parse-cli
cd /workspaces/four/cloud
parse deploy
```

## Local Testing Before Push

To test locally before committing:
```bash
cd /workspaces/four
npm install
npm run start
# Open http://localhost:8080
```

## Verify Everything

- [ ] GitHub secrets added (NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN)
- [ ] Code committed and pushed to `main`
- [ ] GitHub Actions workflow runs and deploys
- [ ] Netlify build succeeds
- [ ] Static frontend loads
- [ ] Back4App cloud code deployed (for ML endpoints)
- [ ] Deriv API credentials configured in the UI (App ID + Token fields)
- [ ] Model training triggered and metrics visible in `/pages/ml.html`

---

**You're now ready to deploy!** Push to main and watch the GitHub Actions workflow deploy your app to Netlify.
