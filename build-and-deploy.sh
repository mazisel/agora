#!/bin/bash

echo "🚀 Team Management System - Build ve Deploy Script"
echo "=================================================="

# Renklendirme için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Hata durumunda script'i durdur
set -e

echo -e "${YELLOW}1. Docker image build ediliyor...${NC}"
docker build -t team-management-system:latest .

echo -e "${GREEN}✅ Build tamamlandı!${NC}"

echo -e "${YELLOW}2. Image boyutu kontrol ediliyor...${NC}"
docker images team-management-system:latest

echo -e "${YELLOW}3. Container test ediliyor...${NC}"
# Test container'ı çalıştır
docker run -d --name test-team-management -p 3002:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  team-management-system:latest

# 10 saniye bekle
echo "Container başlatılıyor... (10 saniye bekleniyor)"
sleep 10

# Health check test et
echo -e "${YELLOW}4. Health check test ediliyor...${NC}"
if curl -f http://localhost:3002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check başarılı!${NC}"
else
    echo -e "${RED}❌ Health check başarısız!${NC}"
    docker logs test-team-management
fi

# Test container'ı temizle
docker stop test-team-management
docker rm test-team-management

echo -e "${GREEN}✅ Image hazır! Artık Portainer'da kullanabilirsiniz.${NC}"
echo ""
echo "Portainer'da kullanmak için:"
echo "1. Portainer > Stacks > Add stack"
echo "2. 'portainer-prebuilt.yml' dosyasının içeriğini yapıştır"
echo "3. Environment variables'ları tanımla"
echo "4. Deploy et"
echo ""
echo -e "${YELLOW}Image adı: team-management-system:latest${NC}"