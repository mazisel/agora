# Ubuntu Sunucu Deployment Rehberi

Bu rehber, Ubuntu sunucunuzda çalışan mevcut sistemi yeni mesajlaşma özellikli sürüme güncellemek için hazırlanmıştır.

## 🚀 Güncelleme Adımları

### 1. Sunucuya Bağlanın
```bash
ssh kullanici@sunucu-ip
```

### 2. Proje Dizinine Gidin
```bash
cd /path/to/your/team-management-system
# Örnek: cd /var/www/team-management-system
```

### 3. Mevcut Sistemi Yedekleyin
```bash
# Proje yedeği
sudo cp -r . ../team-management-system-backup-$(date +%Y%m%d_%H%M%S)

# Veritabanı yedeği (Supabase kullanıyorsanız bu adım opsiyonel)
# pg_dump your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 4. Git Repository'den Güncellemeleri Çekin
```bash
# Mevcut değişiklikleri stash'leyin (varsa)
git stash

# Ana branch'e geçin
git checkout main

# En son değişiklikleri çekin
git pull origin main
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

# Gerekli değişkenler:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
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
