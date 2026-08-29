#!/bin/bash
set -e

echo "=== SysHub Bot VPS Setup ==="

# Install Node.js 20.x
echo "[1/5] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
echo "[2/5] Installing PM2..."
npm install -g pm2

# Install dependencies
echo "[3/5] Installing dependencies..."
npm install

# Setup .env
echo "[4/5] Setting up .env..."
if [ ! -f .env ]; then
    cp .env .env.local 2>/dev/null || touch .env
    echo "File .env sudah dibuat. Isi token/ID lalu jalankan: ./start.sh"
    nano .env
fi

# Start bot
echo "[5/5] Starting bot..."
pm2 start index.js --name syshub-bot
pm2 save
pm2 startup

echo ""
echo "=== Setup selesai! ==="
echo "Bot berjalan dengan nama: syshub-bot"
echo "Lihat log: pm2 logs syshub-bot"
echo "Update: ./update.sh"
