#!/bin/bash
echo "=== Updating SysHub Bot ==="

git pull origin main
npm install

echo "=== Restarting bot... ==="
pm2 restart syshub-bot

echo "=== Game status will auto-update on bot startup ==="
echo "=== Update complete! ==="
