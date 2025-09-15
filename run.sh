#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status

git checkout main
git pull origin main --force

npm run build
npm run start