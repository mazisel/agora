#!/bin/bash

# Team Management System Ubuntu Sunucu Kurulum Script'i
# Bu script Ubuntu sunucuda tüm gerekli kurulumları yapar

set -e

echo "🚀 Team Management System Ubuntu Kurulumu Başlıyor..."

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Domain adını kullanıcıdan al
read -p "🌐 Domain adınızı girin (örnek: example.com): " DOMAIN
read -p "📧 SSL sertifikası için email adresinizi girin: " EMAIL

echo -e "${GREEN}✅ Domain: $DOMAIN${NC}"
echo -e "${GREEN}✅ Email: $EMAIL${NC}"

# Sistem güncellemesi
echo -e "${YELLOW}📦 Sistem güncelleniyor...${NC}"
sudo apt update && sudo apt upgrade -y

# Gerekli paketlerin kurulumu
echo -e "${YELLOW}🔧 Gerekli paketler kuruluyor...${NC}"
sudo apt install -y curl wget git nginx ufw htop

# Firewall ayarları
echo -e "${YELLOW}🔥 Firewall ayarlanıyor...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Node.js kurulumu
echo -e "${YELLOW}📦 Node.js kuruluyor...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
echo -e "${YELLOW}⚡ PM2 kuruluyor...${NC}"
sudo npm install -g pm2

# Proje dizini oluşturma
echo -e "${YELLOW}📁 Proje dizini hazırlanıyor...${NC}"
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www

# PM2 log dizini oluşturma
echo -e "${YELLOW}📋 Log dizinleri oluşturuluyor...${NC}"
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Nginx konfigürasyonu (SSL öncesi)
echo -e "${YELLOW}🌐 Nginx konfigürasyonu oluşturuluyor...${NC}"
sudo tee /etc/nginx/sites-available/team-management-system > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Site aktifleştirme
sudo ln -sf /etc/nginx/sites-available/team-management-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Let's Encrypt kurulumu
echo -e "${YELLOW}🔒 Let's Encrypt kuruluyor...${NC}"
sudo apt install snapd -y
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -sf /snap/bin/certbot /usr/bin/certbot

# SSL sertifikası alma
echo -e "${YELLOW}🔐 SSL sertifikası alınıyor...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Rate limiting için nginx.conf güncelleme
echo -e "${YELLOW}⚡ Nginx rate limiting ayarlanıyor...${NC}"
sudo sed -i '/http {/a\\tlimit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;' /etc/nginx/nginx.conf

# Nginx yeniden başlatma
sudo systemctl reload nginx

# PM2 startup ayarı
echo -e "${YELLOW}🔄 PM2 startup ayarlanıyor...${NC}"
pm2 startup | tail -1 | sudo bash

echo -e "${GREEN}✅ Ubuntu sunucu kurulumu tamamlandı!${NC}"
echo ""
echo -e "${YELLOW}📋 Sonraki adımlar:${NC}"
echo "1. Projenizi /var/www/team-management-system dizinine yükleyin"
echo "2. cd /var/www/team-management-system"
echo "3. npm install"
echo "4. .env.production dosyasını oluşturun"
echo "5. npm run build"
echo "6. pm2 start ecosystem.config.js"
echo "7. pm2 save"
echo ""
echo -e "${GREEN}🌐 Siteniz hazır: https://$DOMAIN${NC}"
echo -e "${GREEN}📊 PM2 monitoring: pm2 monit${NC}"
echo -e "${GREEN}📋 Loglar: pm2 logs team-management-system${NC}"
