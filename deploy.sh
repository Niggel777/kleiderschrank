#!/usr/bin/env bash
# Testet, baut und veröffentlicht die App auf GitHub Pages (Branch gh-pages).
set -euo pipefail
cd "$(dirname "$0")"
npm test
npm run build
touch dist/.nojekyll
remote=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -qm "Veröffentlichung $(date '+%Y-%m-%d %H:%M')"
git push -qf "$remote" gh-pages
rm -rf .git
echo "Veröffentlicht."
