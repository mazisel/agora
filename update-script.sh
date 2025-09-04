#!/bin/bash

echo "🔄 Team Management System Güncelleme Başlatılıyor..."

# Renklendirme
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Hata durumunda dur
set -e

echo -e "${YELLOW}1. Git'ten son değişiklikleri çekiliyor...${NC}"
git pull origin main

echo -e "${YELLOW}2. Docker image yeniden build ediliyor...${NC}"
docker-compose -f docker-compose-simple.yml build --no-cache

echo -e "${YELLOW}3. Container durduruluyor...${NC}"
docker-compose -f docker-compose-simple.yml down

echo -e "${YELLOW}4. Yeni container başlatılıyor...${NC}"
docker-compose -f docker-compose-simple.yml up -d

echo -e "${YELLOW}5. Container durumu kontrol ediliyor...${NC}"
sleep 10

if docker ps | grep -q "team-management-system"; then
    echo -e "${GREEN}✅ Güncelleme başarılı! Container çalışıyor.${NC}"
    
    # Health check
    if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check başarılı!${NC}"
    else
        echo -e "${RED}⚠️  Health check başarısız, logları kontrol edin.${NC}"
    fi
else
    echo -e "${RED}❌ Container başlatılamadı!${NC}"
    docker-compose -f docker-compose-simple.yml logs
    exit 1
fi

echo -e "${GREEN}🎉 Güncelleme tamamlandı!${NC}"
echo "Uygulama: http://your-server:3002"