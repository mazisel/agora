# Ubuntu Sunucu Deployment Rehberi

Bu rehber, Team Management System projesini Ubuntu sunucuda yayınlamak ve domaine bağlamak için gerekli tüm adımları içerir.

## Gereksinimler

- Ubuntu 20.04+ sunucu
- Root veya sudo yetkisi
- Domain adı
- SSL sertifikası (Let's Encrypt ile ücretsiz)

## 1. Sunucu Hazırlığı

### Sistem Güncellemesi
```bash
sudo apt update && sudo apt upgrade -y
```

### Gerekli Paketlerin Kurulumu
```bash
sudo apt install -y curl wget git nginx ufw
```

### Firewall Ayarları
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 2. Node.js ve npm Kurulumu

### Node.js 20.x Kurulumu (LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Kurulumu Doğrulama
```bash
node --version
npm --version
```

## 3. PM2 Process Manager Kurulumu

```bash
sudo npm install -g pm2
```

## 4. Proje Dosyalarının Sunucuya Yüklenmesi

### Git ile Klonlama (Önerilen)
```bash
cd /var/www
sudo git clone <your-repository-url> team-management-system
sudo chown -R $USER:$USER /var/www/team-management-system
cd team-management-system
```

### Manuel Yükleme (Alternatif)
```bash
# Yerel bilgisayarınızdan sunucuya dosya kopyalama
scp -r ./team-management-system user@your-server-ip:/var/www/
```

## 5. Proje Kurulumu

### Bağımlılıkların Kurulumu
```bash
cd /var/www/team-management-system
npm install
```

### Environment Dosyasının Oluşturulması
```bash
cp .env.local .env.production
nano .env.production
```

### .env.production İçeriği
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://riacmnpxjsbrppzfjeur.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWNtbnB4anNicnBwemZqZXVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MzUxODIsImV4cCI6MjA2OTQxMTE4Mn0.kYOmpbDvos5aghqzGNjK7ArtEnc8z4X0-fnGErEdJ1Y

# Supabase Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWNtbnB4anNicnBwemZqZXVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzgzNTE4MiwiZXhwIjoyMDY5NDExMTgyfQ.4q1qnoW_GLr9VwdRmDYbxwASaq6-OFcitSgnC9fsIus

# Production Settings
NODE_ENV=production
PORT=3000
```

### Projeyi Build Etme
```bash
npm run build
```

## 6. PM2 ile Uygulamayı Çalıştırma

### PM2 Ecosystem Dosyası Oluşturma
```bash
nano ecosystem.config.js
```

### ecosystem.config.js İçeriği
```javascript
module.exports = {
  apps: [{
    name: 'team-management-system',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/team-management-system',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/team-management-system-error.log',
    out_file: '/var/log/pm2/team-management-system-out.log',
    log_file: '/var/log/pm2/team-management-system.log',
    time: true
  }]
}
```

### PM2 Log Dizini Oluşturma
```bash
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2
```

### Uygulamayı Başlatma
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 7. Nginx Konfigürasyonu

### Nginx Konfigürasyon Dosyası Oluşturma
```bash
sudo nano /etc/nginx/sites-available/team-management-system
```

### Nginx Konfigürasyonu (SSL Öncesi)
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Site Aktifleştirme
```bash
sudo ln -s /etc/nginx/sites-available/team-management-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Domain Ayarları

### DNS Kayıtları
Domain sağlayıcınızın DNS panelinden aşağıdaki kayıtları ekleyin:

```
A Record: @ -> Sunucu IP Adresi
A Record: www -> Sunucu IP Adresi
```

### DNS Propagation Kontrolü
```bash
nslookup your-domain.com
dig your-domain.com
```

## 9. SSL Sertifikası (Let's Encrypt)

### Certbot Kurulumu
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### SSL Sertifikası Alma
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Otomatik Yenileme Testi
```bash
sudo certbot renew --dry-run
```

## 10. Güvenlik Ayarları

### Nginx Güvenlik Headers
```bash
sudo nano /etc/nginx/sites-available/team-management-system
```

### Güncellenmiş Nginx Konfigürasyonu (SSL Sonrası)
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

### Nginx Yeniden Başlatma
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 11. Monitoring ve Bakım

### PM2 Monitoring
```bash
pm2 status
pm2 logs team-management-system
pm2 monit
```

### Sistem Kaynaklarını İzleme
```bash
htop
df -h
free -h
```

### Log Dosyalarını İzleme
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/pm2/team-management-system.log
```

## 12. Güncelleme Süreci

### Kod Güncellemesi
```bash
cd /var/www/team-management-system
git pull origin main
npm install
npm run build
pm2 restart team-management-system
```

### Otomatik Deployment Script
```bash
nano deploy.sh
```

### deploy.sh İçeriği
```bash
#!/bin/bash
cd /var/www/team-management-system
echo "Pulling latest changes..."
git pull origin main
echo "Installing dependencies..."
npm install
echo "Building application..."
npm run build
echo "Restarting PM2..."
pm2 restart team-management-system
echo "Deployment completed!"
```

### Script'i Çalıştırılabilir Yapma
```bash
chmod +x deploy.sh
```

## 13. Backup Stratejisi

### Otomatik Backup Script
```bash
sudo nano /usr/local/bin/backup-team-management.sh
```

### Backup Script İçeriği
```bash
#!/bin/bash
BACKUP_DIR="/backup/team-management-system"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Code backup
tar -czf $BACKUP_DIR/code_$DATE.tar.gz -C /var/www team-management-system

# Keep only last 7 backups
find $BACKUP_DIR -name "code_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Crontab ile Otomatik Backup
```bash
sudo crontab -e
```

### Crontab Girişi (Günlük 2:00'da)
```
0 2 * * * /usr/local/bin/backup-team-management.sh
```

## 14. Sorun Giderme

### Yaygın Sorunlar ve Çözümleri

#### Uygulama Başlamıyor
```bash
pm2 logs team-management-system
npm run build
```

#### Nginx 502 Bad Gateway
```bash
sudo systemctl status nginx
pm2 status
sudo nginx -t
```

#### SSL Sertifikası Sorunları
```bash
sudo certbot certificates
sudo certbot renew
```

#### Port Kullanımda
```bash
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000
```

## 15. Performans Optimizasyonu

### Node.js Memory Limit
```bash
# ecosystem.config.js içinde
node_args: '--max-old-space-size=2048'
```

### Nginx Rate Limiting
```nginx
# /etc/nginx/nginx.conf içinde
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Site konfigürasyonunda
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
    }
}
```

## Özet

Bu rehberi takip ederek Team Management System projenizi Ubuntu sunucuda başarıyla yayınlayabilir ve domaine bağlayabilirsiniz. Önemli noktalar:

1. **Güvenlik**: SSL sertifikası ve güvenlik headers mutlaka kullanın
2. **Monitoring**: PM2 ve log dosyalarını düzenli kontrol edin
3. **Backup**: Düzenli backup alın
4. **Güncelleme**: Deployment script'i kullanarak kolay güncelleme yapın

Herhangi bir sorunla karşılaştığınızda log dosyalarını kontrol edin ve gerekirse PM2 ile uygulamayı yeniden başlatın.
