#!/bin/bash
echo "=== Starting SysHub Bot ==="

if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing..."
    npm install -g pm2
fi

pm2 start index.js --name syshub-bot
pm2 save
pm2 startup
echo "=== Bot started! ==="
