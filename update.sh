#!/bin/bash
echo "=== Updating SysHub Bot ==="

git stash
git pull origin $(git branch --show-current)
git stash pop || true
npm install

echo "=== Restarting bot... ==="
pm2 restart syshub-bot

echo "=== Game status will auto-update on bot startup ==="
echo "=== Update complete! ==="
