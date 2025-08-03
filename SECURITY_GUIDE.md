# 🔒 Ubuntu Sunucu Güvenlik Rehberi - Team Management System

Bu rehber, Team Management System'i Ubuntu sunucuda güvenli bir şekilde çalıştırmak için gerekli güvenlik önlemlerini açıklar.

## 🚨 Kritik Güvenlik Önlemleri

### 1. Environment Variables Güvenliği

#### ❌ YAPMAYIN
```bash
# .env.local dosyasını git'e eklemeyin
git add .env.local  # ASLA!
```

#### ✅ YAPIN
```bash
# .env.local dosyasını .gitignore'a ekleyin
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo ".env" >> .gitignore

# Sunucuda güvenli dosya izinleri
chmod 600 .env.local
chown www-data:www-data .env.local
```

### 2. SMTP Şifre Güvenliği

#### Güvenli Şifre Yönetimi
```bash
# Sunucuda environment variables için güvenli dizin
sudo mkdir -p /etc/team-management
sudo chmod 700 /etc/team-management

# Şifreli environment dosyası
sudo nano /etc/team-management/.env.production
```

#### Örnek Production .env
```env
# Production Environment Variables
NODE_ENV=production

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# SMTP (Production)
SMTP_HOST=smtp.turkticaret.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-production-email@domain.com
SMTP_PASS="your-secure-production-password"
SMTP_FROM_NAME=Your Company Name
SMTP_FROM_EMAIL=your-production-email@domain.com
```

### 3. Firewall Konfigürasyonu

```bash
# UFW Firewall kurulumu
sudo ufw enable

# Sadece gerekli portları açın
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # Next.js (geliştirme için)

# SMTP portlarını sadece gerekirse açın
sudo ufw allow out 587/tcp  # SMTP TLS
sudo ufw allow out 465/tcp  # SMTP SSL

# Durumu kontrol edin
sudo ufw status verbose
```

### 4. SSL/TLS Sertifikası

```bash
# Let's Encrypt ile ücretsiz SSL
sudo apt update
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası alın
sudo certbot --nginx -d yourdomain.com

# Otomatik yenileme
sudo crontab -e
# Şu satırı ekleyin:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 5. Nginx Güvenlik Konfigürasyonu

```nginx
# /etc/nginx/sites-available/team-management
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Konfigürasyonu
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Güvenlik Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

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

    # API Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        # ... diğer proxy ayarları
    }

    # Login Rate Limiting
    location /login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        # ... diğer proxy ayarları
    }
}

# HTTP'den HTTPS'e yönlendirme
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 6. PM2 Güvenlik Konfigürasyonu

```bash
# PM2 ile güvenli çalıştırma
npm install -g pm2

# Güvenli kullanıcı oluşturun
sudo adduser --system --group --home /var/www/team-management teamapp

# Uygulama dosyalarını güvenli kullanıcıya atayın
sudo chown -R teamapp:teamapp /var/www/team-management
sudo chmod -R 755 /var/www/team-management
sudo chmod 600 /var/www/team-management/.env.local
```

#### Güvenli ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'team-management',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/team-management',
    user: 'teamapp',
    group: 'teamapp',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '/var/www/team-management/.env.local',
    error_file: '/var/log/team-management/error.log',
    out_file: '/var/log/team-management/out.log',
    log_file: '/var/log/team-management/combined.log',
    time: true,
    max_memory_restart: '1G',
    instances: 1,
    exec_mode: 'fork'
  }]
};
```

### 7. Log Güvenliği

```bash
# Log dizini oluşturun
sudo mkdir -p /var/log/team-management
sudo chown teamapp:teamapp /var/log/team-management
sudo chmod 750 /var/log/team-management

# Logrotate konfigürasyonu
sudo nano /etc/logrotate.d/team-management
```

```
/var/log/team-management/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 teamapp teamapp
    postrotate
        pm2 reload team-management
    endscript
}
```

### 8. Database Güvenliği (Supabase)

#### Row Level Security (RLS) Kontrolleri
```sql
-- Tüm tablolarda RLS aktif olduğundan emin olun
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Örnek güvenli policy
CREATE POLICY "Users can only see their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can only update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
```

### 9. API Güvenliği

#### Rate Limiting Middleware
```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const limit = 10; // 10 requests per minute
  const windowMs = 60 * 1000; // 1 minute

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, {
      count: 0,
      lastReset: Date.now(),
    });
  }

  const ipData = rateLimitMap.get(ip);

  if (Date.now() - ipData.lastReset > windowMs) {
    ipData.count = 0;
    ipData.lastReset = Date.now();
  }

  if (ipData.count >= limit) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  ipData.count += 1;

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### 10. Monitoring ve Alerting

```bash
# Fail2ban kurulumu
sudo apt install fail2ban

# Nginx için fail2ban konfigürasyonu
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
```

### 11. Backup Güvenliği

```bash
# Otomatik backup scripti
sudo nano /usr/local/bin/backup-team-management.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/team-management"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup dizini oluştur
mkdir -p $BACKUP_DIR

# Uygulama dosyalarını yedekle (env dosyaları hariç)
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
    --exclude='.env*' \
    --exclude='node_modules' \
    --exclude='.git' \
    /var/www/team-management

# Eski backupları temizle (30 günden eski)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

# Backup dosyalarını şifrele
gpg --symmetric --cipher-algo AES256 $BACKUP_DIR/app_$DATE.tar.gz
rm $BACKUP_DIR/app_$DATE.tar.gz
```

### 12. Güvenlik Kontrol Listesi

#### ✅ Deployment Öncesi Kontroller
- [ ] .env.local dosyası git'e eklenmemiş
- [ ] Production environment variables ayarlanmış
- [ ] SSL sertifikası kurulmuş
- [ ] Firewall konfigüre edilmiş
- [ ] Rate limiting aktif
- [ ] Güvenlik headers eklenmiş
- [ ] Database RLS politikaları aktif
- [ ] Log monitoring kurulmuş
- [ ] Backup sistemi çalışıyor
- [ ] Fail2ban aktif

#### 🔄 Düzenli Kontroller
- [ ] SSL sertifikası yenileme (3 ayda bir)
- [ ] Dependency güncellemeleri (ayda bir)
- [ ] Log analizi (haftalık)
- [ ] Backup testi (ayda bir)
- [ ] Güvenlik taraması (3 ayda bir)

### 13. Acil Durum Planı

#### Güvenlik İhlali Durumunda
1. **Hemen yapılacaklar:**
   - Uygulamayı durdur: `pm2 stop team-management`
   - Şüpheli IP'leri engelle: `sudo ufw deny from <IP>`
   - Logları yedekle: `cp /var/log/team-management/* /backup/incident/`

2. **Araştırma:**
   - Log analizi yap
   - Etkilenen kullanıcıları belirle
   - Veri kaybı olup olmadığını kontrol et

3. **Kurtarma:**
   - Güvenlik açığını kapat
   - Şifreleri sıfırla
   - Kullanıcıları bilgilendir
   - Sistemi güvenli şekilde yeniden başlat

## 🛡️ Sonuç

Bu güvenlik önlemleri uygulandığında, Team Management System Ubuntu sunucuda güvenli bir şekilde çalışacaktır. Düzenli güncellemeler ve monitoring ile güvenlik seviyesi yüksek tutulabilir.

**Önemli:** Güvenlik sürekli bir süreçtir. Bu rehberi düzenli olarak gözden geçirin ve güncelleyin.
