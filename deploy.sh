#!/bin/bash

# Team Management System Deployment Script
# Bu script Ubuntu sunucuda projeyi güncellemek için kullanılır

set -e  # Hata durumunda script'i durdur

echo "🚀 Team Management System Deployment Başlıyor..."

# Proje dizinine git
cd /var/www/team-management-system

echo "📥 Git'ten son değişiklikleri çekiliyor..."
git pull origin main

echo "📦 Bağımlılıklar güncelleniyor..."
npm install

echo "🔨 Proje build ediliyor..."
npm run build

echo "🔄 PM2 ile uygulama yeniden başlatılıyor..."
pm2 restart team-management-system

echo "📊 PM2 durumu kontrol ediliyor..."
pm2 status team-management-system

echo "✅ Deployment tamamlandı!"
echo "🌐 Sitenizi kontrol edebilirsiniz: https://your-domain.com"

# Log dosyalarını göster
echo "📋 Son logları görmek için: pm2 logs team-management-system"
