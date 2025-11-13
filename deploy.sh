#!/bin/bash
# Quick deployment helper script
# Usage: ./deploy.sh

set -e

echo "🚀 FOUR HANDS Deployment Script"
echo "================================"
echo ""

# Check git status
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Uncommitted changes detected. Committing..."
  git add -A
  git commit -m "chore: pre-deployment snapshot $(date +%s)"
else
  echo "✅ Working directory clean"
fi

# Push to main
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Code pushed to main branch!"
echo "📍 GitHub Actions workflow is now deploying..."
echo ""
echo "🔍 Watch deployment progress:"
echo "   https://github.com/onyangosilas09321-sketch/four/actions"
echo ""
echo "🌐 Once complete, your site will be live on Netlify!"
echo ""
echo "📝 Next steps:"
echo "   1. Deploy cloud code to Back4App (cloud/ folder)"
echo "   2. Configure Deriv API credentials in the app UI"
echo "   3. Train the ML model via /pages/ml.html"
echo ""
