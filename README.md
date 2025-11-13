# FOUR HANDS — Deployment Guide

Quick steps to run locally and deploy the static frontend and Parse Cloud code.

Local static preview
- Install node (optional) and run:

```bash
npm install
npm run start
# then open http://localhost:8080
```

Or use Python's simple server:

```bash
cd public
python3 -m http.server 8080
```

Deploy static frontend
- Netlify / Vercel / GitHub Pages: point the deployment to the `public/` folder.
- Docker: build the included image and run it locally or push to a registry:

```bash
docker build -t four-hands:latest .
docker run -p 8080:80 four-hands:latest
```

Parse Cloud Functions (Back4App)
- This project uses Parse Server cloud code in `cloud/`.
- Deploy steps (Back4App web UI):
  - Create a new app on Back4App or use an existing one.
  - In the Back4App dashboard, open the app's Cloud Code section and upload the `cloud/` folder contents.
  - Ensure `Parse.initialize(...)` keys in the client (`public/js/api.js` initialization in `index.html`) match your Back4App app keys.

Local Parse development
- Use a local Parse Server or Back4App. For local Parse Server refer to Parse Server docs. The cloud code is in `cloud/main.js` and `cloud/lib/*`.

Notes and next steps
- The client attempts to load an ML model via `API.getModel()` — the cloud functions now include a basic `trainModel` and `getModel` to train and persist a small ensemble to the `Model` singleton.
- Before deploying, review and secure your Deriv/Exchange API credentials; they should not be checked into source control.
- If you want, I can:
  - Add CI steps (GitHub Actions) to deploy the `public/` folder to Netlify on push.
  - Add a small health-check endpoint and a simple UI test script.
# four