# Ubuntu Sunucu Deployment Rehberi

Bu rehber, Ubuntu sunucunuzda çalışan mevcut sistemi yeni mesajlaşma özellikli sürüme güncellemek için hazırlanmıştır.

## 🚀 Güncelleme Adımları

### 1. Sunucuya Bağlanın
```bash
ssh kullanici@sunucu-ip
```

### 2. Proje Dizinine Gidin
```bash
cd /opt/agora
```

### 3. Domain ve Port Erişim Sorunları

#### A. PM2 Durumunu Kontrol Edin
```bash
pm2 status
pm2 logs team-management-system
```

#### B. Port 3001 Erişimini Test Edin
```bash
# Lokal erişim testi
curl -I http://localhost:3001

# Port dinleme kontrolü
sudo netstat -tlnp | grep 3001
# veya
sudo ss -tlnp | grep 3001
```

#### C. Firewall Kontrolü
```bash
# UFW durumu
sudo ufw status

# Port 3001'i açın
sudo ufw allow 3001

# Nginx için port 80 ve 443
sudo ufw allow 80
sudo ufw allow 443
```

#### D. Nginx Konfigürasyonu
```bash
# Nginx durumu
sudo systemctl status nginx

# Nginx konfigürasyon dosyası oluşturun
sudo nano /etc/nginx/sites-available/agora.e4labs.com.tr
```

**Nginx Konfigürasyon İçeriği:**
```nginx
server {
    listen 80;
    server_name agora.e4labs.com.tr;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket desteği için
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### E. Nginx Site'ı Aktifleştirin
```bash
# Site'ı etkinleştirin
sudo ln -s /etc/nginx/sites-available/agora.e4labs.com.tr /etc/nginx/sites-enabled/

# Nginx konfigürasyonunu test edin
sudo nginx -t

# Nginx'i yeniden başlatın
sudo systemctl restart nginx
```

#### F. DNS Kontrolü
```bash
# Domain'in IP'ye yönlendirildiğini kontrol edin
nslookup agora.e4labs.com.tr
dig agora.e4labs.com.tr

# Hosts dosyasında test (geçici)
echo "YOUR_SERVER_IP agora.e4labs.com.tr" | sudo tee -a /etc/hosts
```

### 3. Mevcut Sistemi Yedekleyin
```bash
# Proje yedeği
sudo cp -r . ../team-management-system-backup-$(date +%Y%m%d_%H%M%S)

# Veritabanı yedeği (Supabase kullanıyorsanız bu adım opsiyonel)
# pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4. Yeni Kodu İndirin

#### Seçenek A: Git Repository Varsa
```bash
# Mevcut değişiklikleri stash'leyin (varsa)
git stash

# Ana branch'e geçin
git checkout main

# En son değişiklikleri çekin
git pull origin main
```

#### Seçenek B: Git Repository Yoksa (Sizin Durumunuz)
```bash
# Mevcut dizini yedekleyin
sudo mv /opt/agora /opt/agora-backup-$(date +%Y%m%d_%H%M%S)

# Yeni kodu GitHub'dan indirin
cd /opt
sudo git clone https://github.com/mazisel/agora.git

# Proje dizinine gidin
cd /opt/agora

# Eğer farklı bir branch kullanıyorsanız:
# git checkout your-branch-name
```

#### Seçenek C: Manuel İndirme
```bash
# ZIP dosyasını indirin
cd /tmp
wget https://github.com/mazisel/agora/archive/refs/heads/main.zip

# Mevcut dizini yedekleyin
sudo mv /opt/agora /opt/agora-backup-$(date +%Y%m%d_%H%M%S)

# ZIP'i açın
unzip main.zip
sudo mv agora-main /opt/agora

# Proje dizinine gidin
cd /opt/agora
```

### 5. Bağımlılıkları Güncelleyin
```bash
# Node.js bağımlılıklarını güncelleyin
npm install

# Eğer yarn kullanıyorsanız:
# yarn install
```

### 6. Veritabanı Tablolarını Oluşturun
```bash
# Mesajlaşma sistemi için gerekli tabloları oluşturun
# Supabase dashboard'dan veya API endpoint'i ile:
curl -X POST http://localhost:3001/api/setup-db
```

### 7. Environment Variables Kontrolü
```bash
# .env.local dosyasını kontrol edin
nano .env.local

# GEREKLİ DEĞIŞKENLER (Hepsi zorunlu):
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SUPABASE_SERVICE_ROLE_KEY eksikse build hatası alırsınız!
# Bu key'i Supabase Dashboard > Settings > API'den alabilirsiniz
```

### 7.1. Supabase Keys Nasıl Bulunur
```bash
# 1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
# 2. Projenizi seçin
# 3. Settings > API'ye gidin
# 4. Şu değerleri kopyalayın:
#    - Project URL (NEXT_PUBLIC_SUPABASE_URL)
#    - anon public key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
#    - service_role secret key (SUPABASE_SERVICE_ROLE_KEY)
```

### 8. Projeyi Build Edin
```bash
# Production build
npm run build

# Eğer yarn kullanıyorsanız:
# yarn build
```

### 9. PM2 ile Servisi Yeniden Başlatın
```bash
# Mevcut servisi durdurun
pm2 stop team-management-system

# Servisi yeniden başlatın
pm2 start ecosystem.config.js

# Veya direkt restart:
pm2 restart team-management-system

# Servisleri kontrol edin
pm2 status
```

### 10. Nginx Konfigürasyonunu Kontrol Edin
```bash
# Nginx konfigürasyonunu test edin
sudo nginx -t

# Nginx'i yeniden yükleyin
sudo systemctl reload nginx
```

## 🔧 Alternatif Deployment Yöntemleri

### Docker ile Deployment
Eğer Docker kullanıyorsanız:

```bash
# Mevcut container'ı durdurun
docker stop team-management-system

# Yeni image build edin
docker build -t team-management-system:latest .

# Container'ı yeniden başlatın
docker run -d --name team-management-system \
  -p 3001:3001 \
  --env-file .env.local \
  team-management-system:latest
```

### Systemd Service ile Deployment
Eğer systemd service kullanıyorsanız:

```bash
# Servisi durdurun
sudo systemctl stop team-management-system

# Servisi yeniden başlatın
sudo systemctl start team-management-system

# Servis durumunu kontrol edin
sudo systemctl status team-management-system
```

## 📋 Deployment Sonrası Kontroller

### 1. Servis Durumu Kontrolü
```bash
# PM2 ile kontrol
pm2 status
pm2 logs team-management-system

# Systemd ile kontrol
sudo systemctl status team-management-system
sudo journalctl -u team-management-system -f
```

### 2. Web Sitesi Erişim Kontrolü
```bash
# Curl ile test
curl -I http://localhost:3001

# Veya tarayıcıdan:
# http://your-domain.com
```

### 3. Mesajlaşma Özelliklerini Test Edin
- `/messages` sayfasına gidin
- Kanal oluşturmayı test edin
- Mesaj göndermeyi test edin
- Badge sistemini kontrol edin

### 4. Veritabanı Tablolarını Kontrol Edin
Supabase dashboard'dan şu tabloların oluştuğunu kontrol edin:
- `channels`
- `channel_members`
- `messages`
- `message_attachments`
- `message_reactions`
- `user_presence`
- `typing_indicators`

## 🚨 Sorun Giderme

### Port Çakışması
```bash
# Port 3001'i kullanan process'i bulun
sudo lsof -i :3001

# Process'i sonlandırın
sudo kill -9 PID
```

### Node.js Sürüm Problemi
```bash
# Node.js sürümünü kontrol edin
node --version

# Node.js 18+ gerekli, güncelleyin:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Memory Problemi
```bash
# Memory kullanımını kontrol edin
free -h

# PM2 memory limit ayarlayın
pm2 start ecosystem.config.js --max-memory-restart 1G
```

### SSL Sertifika Problemi
```bash
# Let's Encrypt sertifikasını yenileyin
sudo certbot renew

# Nginx'i yeniden başlatın
sudo systemctl restart nginx
```

## 📝 Rollback Planı

Eğer bir sorun yaşarsanız, eski sürüme geri dönebilirsiniz:

```bash
# Servisi durdurun
pm2 stop team-management-system

# Eski backup'ı geri yükleyin
sudo rm -rf /path/to/current/project
sudo cp -r ../team-management-system-backup-YYYYMMDD_HHMMSS /path/to/current/project

# Bağımlılıkları yükleyin
npm install

# Servisi başlatın
pm2 start ecosystem.config.js
```

## 🎯 Deployment Checklist

- [ ] Sunucuya SSH bağlantısı yapıldı
- [ ] Mevcut sistem yedeklendi
- [ ] Git pull yapıldı
- [ ] npm install çalıştırıldı
- [ ] Veritabanı tabloları oluşturuldu
- [ ] Environment variables kontrol edildi
- [ ] npm run build çalıştırıldı
- [ ] PM2/Systemd servisi yeniden başlatıldı
- [ ] Nginx konfigürasyonu kontrol edildi
- [ ] Web sitesi erişimi test edildi
- [ ] Mesajlaşma özellikleri test edildi
- [ ] Log dosyaları kontrol edildi

## 📞 Destek

Deployment sırasında sorun yaşarsanız:

1. **Log dosyalarını kontrol edin**:
   ```bash
   pm2 logs team-management-system
   sudo journalctl -u nginx -f
   ```

2. **Sistem kaynaklarını kontrol edin**:
   ```bash
   htop
   df -h
   ```

3. **Network bağlantısını test edin**:
   ```bash
   curl -I http://localhost:3001
   ```

Bu rehberi takip ederek Ubuntu sunucunuzdaki sistemi güvenle güncelleyebilirsiniz. Herhangi bir sorun yaşarsanız rollback planını kullanarak eski sürüme geri dönebilirsiniz.
