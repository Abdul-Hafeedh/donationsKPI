#!/bin/bash
set -e
npm run build
touch dist/.nojekyll
npx gh-pages -d dist --dotfiles --branch gh-pages
echo "Deploy complete!"
