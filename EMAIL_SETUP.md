# E-posta Bildirim Sistemi Kurulum Rehberi

Bu rehber, Team Management System'de e-posta bildirim sistemini nasıl kuracağınızı açıklar.

## 📧 SMTP Konfigürasyonu

### 1. Environment Variables (.env.local)

`.env.local` dosyanıza aşağıdaki SMTP ayarlarını ekleyin:

```env
# SMTP Configuration for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=Team Management System
SMTP_FROM_EMAIL=your-email@gmail.com
```

### 2. Gmail Kurulumu (Önerilen)

Gmail kullanıyorsanız:

1. **2FA'yı etkinleştirin**: Google hesabınızda 2 faktörlü doğrulamayı açın
2. **Uygulama şifresi oluşturun**:
   - Google hesap ayarlarına gidin
   - Güvenlik > 2 adımlı doğrulama > Uygulama şifreleri
   - "Mail" için yeni bir uygulama şifresi oluşturun
   - Bu şifreyi `SMTP_PASS` olarak kullanın

### 3. Diğer E-posta Sağlayıcıları

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Özel SMTP Sunucusu
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=465
SMTP_SECURE=true
```

## 🚀 Kurulum Adımları

### 1. Gerekli Paketlerin Kurulumu

```bash
npm install nodemailer @types/nodemailer
```

### 2. Environment Variables Ayarlama

`.env.local` dosyasını yukarıdaki örneklere göre düzenleyin.

### 3. Uygulamayı Yeniden Başlatma

```bash
npm run dev
```

## 🧪 Test Etme

### Admin Panelinden Test

1. Admin paneline gidin: `/admin/notifications`
2. Test e-posta adresinizi girin
3. "Test E-postası Gönder" butonuna tıklayın
4. E-posta kutunuzu kontrol edin

### API ile Test

```bash
curl -X POST http://localhost:3000/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "test@example.com"}'
```

## 📨 Otomatik Bildirimler

Sistem aşağıdaki durumlarda otomatik e-posta gönderir:

### 1. Yeni Kullanıcı Oluşturma
- **Tetikleyici**: Admin panelinden yeni kullanıcı oluşturulduğunda
- **Alıcı**: Yeni kullanıcı
- **İçerik**: Hoş geldin mesajı ve geçici şifre

### 2. Şifre Sıfırlama
- **Tetikleyici**: Admin tarafından kullanıcı şifresi sıfırlandığında
- **Alıcı**: Şifresi sıfırlanan kullanıcı
- **İçerik**: Yeni şifre bilgisi

### 3. Görev Ataması
- **Tetikleyici**: Kullanıcıya yeni görev atandığında
- **Alıcı**: Görevi atanan kullanıcı(lar)
- **İçerik**: Görev detayları ve teslim tarihi

### 4. Görev Durumu Değişikliği
- **Tetikleyici**: Görev durumu güncellendiğinde
- **Alıcı**: İlgili kullanıcılar
- **İçerik**: Eski ve yeni durum bilgisi

### 5. Etkinlik Hatırlatması
- **Tetikleyici**: Etkinlik tarihinden 24 saat önce
- **Alıcı**: Etkinlik katılımcıları
- **İçerik**: Etkinlik detayları ve konum

### 6. Proje Ataması
- **Tetikleyici**: Kullanıcı projeye atandığında
- **Alıcı**: Projeye atanan kullanıcı(lar)
- **İçerik**: Proje detayları ve rol bilgisi

## 🔧 Özelleştirme

### E-posta Şablonlarını Düzenleme

E-posta şablonları `src/lib/email.ts` dosyasında bulunur:

```typescript
export const emailTemplates = {
  taskAssigned: (taskTitle: string, assignedBy: string, dueDate?: string) => ({
    subject: `Yeni Görev Atandı: ${taskTitle}`,
    html: `...`, // HTML içerik
    text: `...`  // Düz metin içerik
  }),
  // Diğer şablonlar...
};
```

### Yeni Bildirim Türü Ekleme

1. `src/lib/email.ts` dosyasına yeni şablon ekleyin
2. `src/lib/notifications.ts` dosyasına yeni fonksiyon ekleyin
3. `src/app/api/notifications/send-email/route.ts` dosyasına yeni case ekleyin

## 🛠️ Sorun Giderme

### Yaygın Hatalar

#### "Authentication failed"
- SMTP kullanıcı adı ve şifresini kontrol edin
- Gmail için uygulama şifresi kullandığınızdan emin olun

#### "Connection timeout"
- SMTP host ve port ayarlarını kontrol edin
- Firewall ayarlarını kontrol edin

#### "Invalid recipients"
- E-posta adreslerinin geçerli olduğundan emin olun
- Kullanıcı profillerinde e-posta adreslerinin dolu olduğunu kontrol edin

### Debug Modu

Detaylı hata mesajları için konsol loglarını kontrol edin:

```bash
npm run dev
```

### Test Komutları

```bash
# E-posta konfigürasyonunu test et
curl -X POST http://localhost:3000/api/notifications/test-email \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your-email@example.com"}'

# Görev ataması bildirimi test et
curl -X POST http://localhost:3000/api/notifications/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task_assigned",
    "recipients": ["user@example.com"],
    "data": {
      "taskTitle": "Test Görevi",
      "assignedBy": "Admin",
      "dueDate": "2024-01-15"
    }
  }'
```

## 📊 İzleme ve Raporlama

E-posta gönderim istatistikleri `email_notifications` tablosunda saklanır:

```sql
SELECT 
  type,
  COUNT(*) as total_sent,
  SUM(successful_count) as successful,
  SUM(failed_count) as failed,
  DATE(sent_at) as date
FROM email_notifications 
GROUP BY type, DATE(sent_at)
ORDER BY sent_at DESC;
```

## 🔒 Güvenlik

- SMTP şifrelerini asla kod içinde saklamayın
- `.env.local` dosyasını git'e eklemeyin
- Üretim ortamında güçlü şifreler kullanın
- E-posta içeriklerinde hassas bilgileri paylaşmaktan kaçının

## 📞 Destek

Sorun yaşıyorsanız:

1. Bu rehberi tekrar gözden geçirin
2. Konsol loglarını kontrol edin
3. SMTP sağlayıcınızın dokümantasyonunu inceleyin
4. Test API'lerini kullanarak sorunu izole edin

---

**Not**: Bu sistem production ortamında kullanılmadan önce kapsamlı testlerden geçirilmelidir.
