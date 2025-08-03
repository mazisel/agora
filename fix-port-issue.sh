#!/bin/bash

echo "🔍 Port 3001'i kullanan process'leri buluyorum..."
lsof -ti:3001

echo "🛑 PM2'yi durduruyor..."
pm2 stop all
pm2 delete all

echo "🧹 Port 3001'i kullanan tüm process'leri öldürüyorum..."
sudo fuser -k 3001/tcp 2>/dev/null || true
sudo kill -9 $(lsof -ti:3001) 2>/dev/null || true

echo "⏳ 3 saniye bekliyorum..."
sleep 3

echo "🔍 Port durumunu kontrol ediyorum..."
netstat -tulpn | grep :3001 || echo "Port 3001 temiz!"

echo "🚀 PM2 ile uygulamayı başlatıyorum..."
cd /opt/agora
pm2 start ecosystem.config.js

echo "✅ İşlem tamamlandı!"
pm2 status
