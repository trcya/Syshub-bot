#!/bin/bash
echo "=== Updating SysHub Bot ==="

git pull origin main
npm install
pm2 restart syshub-bot
echo "=== Update complete! ==="
